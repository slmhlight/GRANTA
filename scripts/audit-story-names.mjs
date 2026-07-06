/* R226t/E13 — 스토리 이름-커버리지 감사.
 * 각 스토리 멤버(entry)의 합금 지정자가 스토리 텍스트(display+sections+legacy+timeline)에
 * 등장하는지 검사한다. "다른 합금 이야기만 보이는" 그룹 스토리를 검출하기 위한 도구.
 * 사용: node scripts/audit-story-names.mjs  (build:data 산출물 client/public/materials.json 필요)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// R227/E14 — 토큰화 로직은 lib 로 승격 (build-wiki-index 와 공유). 동작 동일.
import { KO, norm, tokensOf } from './lib/name-tokens.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'client/public/materials.json'), 'utf8'));
const fr = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry-id-freeze.json'), 'utf8'));
const map = fr.map || fr; const rev = {}; for (const [l, s] of Object.entries(map)) rev[s] = l;
const by = {}; for (const x of m) by[x.id] = x;
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/alloy-stories.json'), 'utf8'));

const report = [];
for (const [key, st] of Object.entries(doc.stories)) {
  const text = norm([st.display || '', ...(st.sections ? Object.values(st.sections) : []), st.legacy_text || '',
    ...(st.timeline || []).map((e) => e.event)].join(' '));
  const missing = new Map();
  for (const sid of st.stable_ids) {
    const e = by[rev[sid]]; if (!e) continue;
    const base = e.name.replace(/\s*[—(].*$/, '').trim();
    const toks = tokensOf(base);
    const hit = toks.some((tk) => text.includes(tk) || (KO[tk] && text.includes(norm(KO[tk]))))
      || (KO[base.toLowerCase()] && text.includes(norm(KO[base.toLowerCase()])));
    if (!hit) { if (!missing.has(base)) missing.set(base, []); missing.get(base).push(sid); }
  }
  if (missing.size) report.push({ key, v2: !!st.sections, display: st.display, missing: [...missing.entries()] });
}
report.sort((a, b) => b.missing.length - a.missing.length);
console.log('이름 미커버 스토리:', report.length, '/', Object.keys(doc.stories).length);
for (const r of report) {
  console.log(`\n[${r.v2 ? 'v2' : 'V1'}] ${r.key} :: ${r.display}`);
  for (const [base, sids] of r.missing) console.log('   -', base, '(' + sids.join(',') + ')');
}
