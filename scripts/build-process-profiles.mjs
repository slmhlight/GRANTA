/*
 * R226j/C6 — 공정 프로파일 할당 생성기: pnpm build:profiles
 *
 * 레지스트리(data/registry/entries) 전 entry 를 process-classify 로 분류해
 * data/process-profile-assignments.json (stable_id 키, 커밋 SSOT) 을 생성한다.
 * data/process-profile-overrides.json (stable_id 키 + src 인용) 이 있으면 마지막에 merge.
 *
 * HT family 패턴의 SSOT 는 client/src/lib/ht-alloy-specific.ts — 이 스크립트가 소스를 파싱해
 * (alloyPattern, familyName) 쌍을 추출한다 (중복 정의 없음; 파싱 실패 시 명시적 종료).
 *
 * --check: 재생성 결과가 커밋본과 다르면 exit 1 (드리프트 게이트).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyMachinability, classifyWeldModel, classifyHtClass, classifyHtFamily, classifyInsightGroup } from './lib/process-classify.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REG = path.join(ROOT, 'data', 'registry', 'entries');
const OUT = path.join(ROOT, 'data', 'process-profile-assignments.json');
const OVR = path.join(ROOT, 'data', 'process-profile-overrides.json');
const CHECK = process.argv.includes('--check');

// 1) HT family 패턴 추출 (ht-alloy-specific.ts 파싱 — 패턴 SSOT 는 그 파일)
const htSrc = fs.readFileSync(path.join(ROOT, 'client', 'src', 'lib', 'ht-alloy-specific.ts'), 'utf8');
const htFamilies = [];
const famRe = /alloyPattern:\s*\/((?:[^\/\\]|\\.)+)\/([a-z]*)\s*,\s*\n\s*familyName:\s*'((?:[^'\\]|\\.)*)'/g;
let fm;
while ((fm = famRe.exec(htSrc))) {
  htFamilies.push({ pattern: new RegExp(fm[1], fm[2]), familyName: fm[3].replace(/\\'/g, "'") });
}
if (htFamilies.length < 25) {
  console.error(`❌ ht-alloy-specific.ts 파싱 실패 — family ${htFamilies.length}개만 추출 (형식 드리프트?)`);
  process.exit(1);
}

// 1b) HT·용접 가이드 블록 매처 (R226k — 패턴 SSOT = 콘텐츠 JSON 자체; field=name 만 할당 대상)
const loadBlocks = (file) => Object.entries(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8')).blocks)
  .filter(([, b]) => b.field === 'name')
  .map(([key, b]) => ({ key, re: new RegExp(b.pattern, 'i') }));
const HTG = loadBlocks('ht-guidance.json');
const WG = loadBlocks('welding-guidance.json');
const stripMeas = (s) => String(s || '').replace(/\d+(?:[.,]\d+)?\s*(?:°\s*[cf]?|h(?:v|rc|rb|ra|b)|[mg]pa|ksi)\b/gi, ' ');
const firstKey = (list, name) => { for (const b of list) if (b.re.test(name)) return b.key; return null; };

// 2) 레지스트리 전 entry 분류
const assignments = {};
let count = 0;
for (const cc of fs.readdirSync(REG)) {
  for (const fn of fs.readdirSync(path.join(REG, cc))) {
    const rec = JSON.parse(fs.readFileSync(path.join(REG, cc, fn), 'utf8'));
    const sid = rec.stable_id;
    if (!sid) { console.error(`❌ stable_id 없음: ${cc}/${fn}`); process.exit(1); }
    const a = {};
    const mach = classifyMachinability(rec.category, rec.name, rec.subcategory);
    if (mach) a.mach = mach;
    const weld = classifyWeldModel(rec.category, rec.subcategory);
    if (weld) a.weld = weld;
    const htc = classifyHtClass(rec.heat_treatment);
    if (htc) a.htc = htc;
    if (rec.category === 'Metal') {
      const htf = classifyHtFamily(rec.name, htFamilies);
      if (htf) a.ht = htf;
      // R226k — HT 주의사항·용접 권고 가이드 키 (구 인라인 name-regex 83블록의 빌드타임 대체)
      const nm = stripMeas(rec.name);
      const htg = firstKey(HTG, nm);
      if (htg) a.htg = htg;
      const wg = firstKey(WG, nm);
      if (wg) a.wg = wg;
    }
    const ins = classifyInsightGroup(rec.category, rec.subcategory);
    if (ins) a.insight = ins;
    assignments[sid] = a;   // 빈 {} 라도 레코드 존재 = "분류 완료·해당 없음" 명시
    count++;
  }
}

// 3) overrides merge (stable_id 키; 각 항목 src 필수 — 스키마 게이트는 테스트에서)
let overridden = 0;
if (fs.existsSync(OVR)) {
  const ovr = JSON.parse(fs.readFileSync(OVR, 'utf8'));
  for (const [sid, patch] of Object.entries(ovr.overrides || {})) {
    if (!assignments[sid]) { console.error(`❌ override 의 stable_id 가 레지스트리에 없음: ${sid}`); process.exit(1); }
    const { src, ...fields } = patch;
    Object.assign(assignments[sid], fields);
    for (const [k, v] of Object.entries(fields)) if (v === null) delete assignments[sid][k];
    overridden++;
  }
}

// 4) 결정적 출력 (stable_id 정렬)
const sorted = {};
for (const k of Object.keys(assignments).sort()) sorted[k] = assignments[k];
const out = {
  _note: '생성물: pnpm build:profiles (scripts/build-process-profiles.mjs). 직접 수정 금지 — 교정은 data/process-profile-overrides.json (stable_id + src). 키 의미: mach=절삭성 프로파일(process-profiles.json), weld=용접성 모델(ce|schaeffler|none), ht=HT family(ht-alloy-specific.ts familyName), htc=조건 클래스, insight=선택 인사이트 그룹(selection-insights.json).',
  entries: count,
  ht_families_parsed: htFamilies.length,
  assignments: sorted,
};
const json = JSON.stringify(out, null, 1);

if (CHECK) {
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (prev.trim() !== json.trim()) { console.error('❌ assignments 드리프트 — pnpm build:profiles 재실행 후 커밋 필요'); process.exit(1); }
  console.log(`✅ assignments 정합 (${count} entries, overrides ${overridden})`);
} else {
  fs.writeFileSync(OUT, json + '\n');
  const stats = {};
  for (const a of Object.values(sorted)) for (const [k, v] of Object.entries(a)) { stats[k] = stats[k] || {}; stats[k][v] = (stats[k][v] || 0) + 1; }
  console.log(`✅ ${OUT.replace(ROOT, '.')} — ${count} entries (overrides ${overridden}, HT families ${htFamilies.length})`);
  for (const [k, dist] of Object.entries(stats)) {
    const top = Object.entries(dist).sort((x, y) => y[1] - x[1]);
    console.log(`   ${k}: ${top.length}종 — ${top.slice(0, 8).map(([kk, vv]) => `${kk}:${vv}`).join(' ')}${top.length > 8 ? ' …' : ''}`);
  }
}
