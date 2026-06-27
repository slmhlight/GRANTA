/*
 * R226 PoC — 안정 ID 레지스트리 생성기 (1198 현재 entry 기준).
 *
 * 목적: 빌드가 버리던 안정 식별자를 복원. 현재 HTML(빌드 산출 1198종)을 기준으로
 *   - frozen 안정 ID (<CAT>-NNNN) 부여
 *   - family tree (category > subcategory + element-family) + family ID
 *   - 참조 테이블(index) + per-entry 파일 샘플
 * 을 생성. 이후 override 시스템을 이름-정규식 → 안정 ID/family ID 로 재키잉하기 위한 토대.
 *
 * 산출: data/registry/index.json · families.json · entries/<cat>/<id>.json (샘플)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'client', 'public', 'materials');
const OUT = path.join(ROOT, 'data', 'registry');

const CATCODE = { Metal: 'MET', Polymer: 'POL', Ceramic: 'CER', Composite: 'CMP' };
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// P3 — element-family 를 subcategory 기반으로 재도출 (composition 의 Fe="balance" 오태깅 회피;
//   예: Inconel 718 은 Fe 가 balance 표기지만 base 는 Ni → "Nickel Superalloy" subcat 이 신뢰 신호).
function subcatElFam(sub) {
  const s = String(sub || '').toLowerCase();
  if (/cobalt|stellite|\bl-?605\b/.test(s)) return 'Cobalt-based';
  if (/nickel|inconel|incoloy|hastelloy|haynes|monel|nimonic|superalloy|waspaloy/.test(s)) return 'Nickel-based';
  if (/titanium|\bti[\s-]/.test(s)) return 'Titanium-based';
  if (/alumin/.test(s)) return 'Aluminum-based';
  if (/magnesium/.test(s)) return 'Magnesium-based';
  if (/copper|bronze|brass|cupro|cu[\s-]/.test(s)) return 'Copper-based';
  if (/refractory|tungsten|tantalum|niobium|molybden|rhenium|zirconium/.test(s)) return 'Refractory';
  if (/zinc/.test(s)) return 'Zinc-based';
  if (/berylli/.test(s)) return 'Beryllium-based';
  if (/shape memory|nitinol/.test(s)) return 'Nickel-based';   // Nitinol Ni-Ti
  if (/steel|iron|ferritic|martensitic|austenitic|duplex|stainless|maraging|invar|kovar|controlled expansion|expansion alloy/.test(s)) return 'Iron-based';
  return null;
}

// 1) 현재 1198 entry 로드 (= HTML 기준 entry list)
const all = [];
for (const f of ['metal', 'polymer', 'ceramic', 'composite']) {
  for (const m of JSON.parse(fs.readFileSync(path.join(PUB, `${f}.json`), 'utf8'))) all.push(m);
}

// 변형 전 깨끗한 원본 스냅샷 (라운드트립 검증 기준)
const cleanJson = new Map(all.map(m => [m.id, JSON.stringify(m)]));

// 2) frozen 안정 ID. data/registry-id-freeze.json (legacy_id→stable_id) 가 권위 소스 —
//    이름·subcategory·공정을 바꿔도 ID 불변. 없으면 결정적 정렬(cat→subcat→name)로 1회 생성·저장.
//    (정렬은 신규 entry ID 할당의 결정성을 위해서만 유지; 기존 ID 는 freeze 가 지배.)
all.sort((a, b) =>
  (a.category || '').localeCompare(b.category || '') ||
  (a.subcategory || '').localeCompare(b.subcategory || '') ||
  (a.name || '').localeCompare(b.name || ''));

const FREEZE = path.join(ROOT, 'data', 'registry-id-freeze.json');
let freeze = {};
try { freeze = JSON.parse(fs.readFileSync(FREEZE, 'utf8')).map || {}; } catch { /* 최초 생성 */ }
const seq = {};
for (const sid of Object.values(freeze)) { const [cc, n] = sid.split('-'); seq[cc] = Math.max(seq[cc] || 0, parseInt(n, 10)); }
let newIds = 0;
for (const m of all) {
  const cc = CATCODE[m.category] || 'OTH';
  if (freeze[m.id]) { m.stable_id = freeze[m.id]; }
  else { seq[cc] = (seq[cc] || 0) + 1; m.stable_id = `${cc}-${String(seq[cc]).padStart(4, '0')}`; freeze[m.id] = m.stable_id; newIds++; }
}
fs.writeFileSync(FREEZE, JSON.stringify({ _note: 'frozen legacy_id→stable_id (R226). 이름/subcat/공정 변경해도 ID 불변; 신규 entry 만 새 ID. 이 파일이 안정 ID 의 권위 소스.', count: Object.keys(freeze).length, map: freeze }, null, 2) + '\n');

// 2b) 제거 (R226b, 사용자 승인): 중복 base + 합성 조건 entry 드롭. base 의 마지막 실조건은 안전상 보존.
//     freeze 는 위에서 이미 기록 → 제거된 ID 는 reserved(재사용 안 됨). cleanJson 에는 남아있으나 미출력이라 round-trip 무영향.
let removed = 0;
try {
  const rm = (JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'r226-value-corrections.json'), 'utf8')).remove) || {};
  const rmBases = new Set(rm.bases || []);
  const rmHT = new Set((rm.heatTreatments || []).map(s => String(s).toLowerCase().trim()));
  const bo = (n) => String(n || '').split(' — ')[0].trim();
  const keptPerBase = {};
  for (const m of all) { const b = bo(m.name); if (rmBases.has(b)) continue; if (!rmHT.has((m.heat_treatment || '').toLowerCase().trim())) keptPerBase[b] = (keptPerBase[b] || 0) + 1; }
  const keep = [];
  for (const m of all) {
    const b = bo(m.name); const ht = (m.heat_treatment || '').toLowerCase().trim();
    if (rmBases.has(b)) { removed++; continue; }                                   // dup base 전체 제거
    if (rmHT.has(ht) && (keptPerBase[b] || 0) >= 1) { removed++; continue; }        // 합성 조건 제거 (실조건 남는 경우만)
    keep.push(m);
  }
  all.length = 0; all.push(...keep);
} catch (e) { console.log('⚠ remove 설정 로드 실패:', e.message); }

// 3) family tree 구성
//    - 루트: category (F-MET ...)
//    - 2단계: subcategory (F-<cc>-<slug>)  parent=category
//    - 교차: element-family (families[] 의 '-based' 태그 → F-EL-<slug>)
const families = {}; // id -> {id, label, kind, parent, members:[stable_id]}
const ensure = (id, label, kind, parent) => { if (!families[id]) families[id] = { id, label, kind, parent: parent || null, members: [] }; return families[id]; };

// alloy-base = 이름의 " — " 앞부분 (condition/process 제거). slug 충돌 시 -2,-3 …
const baseOf = (n) => String(n || '').split(' — ')[0].trim();
const baseFamId = {}; const usedAb = new Set();
for (const m of all) {
  const b = baseOf(m.name);
  if (!(b in baseFamId)) { let s = slug(b) || 'x'; let id = `F-AB-${s}`, k = 2; while (usedAb.has(id)) id = `F-AB-${s}-${k++}`; usedAb.add(id); baseFamId[b] = id; }
}
for (const m of all) {
  const cc = CATCODE[m.category] || 'OTH';
  const catId = `F-${cc}`;
  ensure(catId, m.category, 'category', null).members.push(m.stable_id);
  const subId = `F-${cc}-${slug(m.subcategory)}`;
  ensure(subId, m.subcategory, 'subcategory', catId).members.push(m.stable_id);
  const abId = baseFamId[baseOf(m.name)];
  ensure(abId, baseOf(m.name), 'alloy-base', subId).members.push(m.stable_id);
  // element-family = dominant composition 원소 (metal 한정). familyTags 의 다중·오태깅 대체.
  let elIds = [];
  if (m.category === 'Metal') {
    const fam = subcatElFam(m.subcategory);
    if (fam) { const id = `F-EL-${slug(fam)}`; ensure(id, fam, 'element-family', null).members.push(m.stable_id); elIds = [id]; }
  }
  m._fam = { category: catId, subcategory: subId, alloy_base: abId, element_families: elIds };
}

// 수동 custom-family 병합 (series 등 임의 그룹. members=[stable_id]). P4 에서 채움.
const cfPath = path.join(OUT, 'custom-families.json');
if (!fs.existsSync(cfPath)) fs.mkdirSync(OUT, { recursive: true }) || fs.writeFileSync(cfPath, JSON.stringify({ _note: '수동 정의 family (예: Inconel-7xx series, AISI-3xx). members=[stable_id...]. 빌드가 family tree 에 병합. P4 에서 series-level override 재키잉 시 채움.', families: [] }, null, 2) + '\n');
try { for (const cf of (JSON.parse(fs.readFileSync(cfPath, 'utf8')).families || [])) { const n = ensure(cf.id, cf.label, cf.kind || 'custom', cf.parent || null); n.members = [...new Set([...(cf.members || [])])]; } } catch { /* ignore */ }

// 4) per-entry 레코드 = 현재 entry + stable_id + family refs (+ 추적용 legacy_id/origin)
const ORIGIN = { C: 'curated(material_db)', V: 'am_vendor(csv)', G: 'generic(csv)', R: 'reference(supplementary)', POL: 'polymers-data', CER: 'ceramics-data', CMP: 'composites-data' };
const records = all.map(m => {
  const legacy = m.id;
  const origin = ORIGIN[(legacy || '').split('_')[0]] || 'unknown';
  const { _fam, ...rest } = m;
  return { stable_id: m.stable_id, family: _fam, legacy_id: legacy, origin, ...rest };
});

// 4b) 무손실 검증 — 교정 적용 전 faithful 복사본이 원본과 동일한지 (in-memory).
const ADDED0 = ['stable_id', 'family', 'legacy_id', 'origin'];
let faithMiss = 0; const faithEx = [];
for (const r of records) {
  const stripped = Object.fromEntries(Object.entries(r).filter(([k]) => !ADDED0.includes(k)));
  if (JSON.stringify(stripped) !== cleanJson.get(r.legacy_id)) { faithMiss++; if (faithEx.length < 3) faithEx.push(r.stable_id); }
}

// 4c) R226 P4 — ID-키 값 교정 (가짜 variant 실제값; data/r226-value-corrections.json).
//     원본값을 _corrections 에 보존 → 라운드트립이 "무손실 + 문서화된 교정"임을 증명.
let corrApplied = 0;
try {
  const corr = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'r226-value-corrections.json'), 'utf8'));
  for (const r of records) {
    const ch = {};
    const compFix = corr.compositionByBase && corr.compositionByBase[baseOf(r.name)];
    if (compFix && r.category === 'Metal') { ch.composition = { from: r.composition ?? null }; r.composition = { ...compFix }; }
    // subcategory 교정 (Ti 미세조직 재분류 등) — family tree 노드도 이동해 일관성 유지.
    const subFix = corr.subcategoryByBase && corr.subcategoryByBase[baseOf(r.name)];
    if (subFix && r.subcategory !== subFix) {
      ch.subcategory = { from: r.subcategory };
      const cc = CATCODE[r.category] || 'OTH';
      const oldNode = r.family && r.family.subcategory;
      if (oldNode && families[oldNode]) families[oldNode].members = families[oldNode].members.filter(id => id !== r.stable_id);
      const newNode = `F-${cc}-${slug(subFix)}`;
      ensure(newNode, subFix, 'subcategory', `F-${cc}`).members.push(r.stable_id);
      r.family = { ...r.family, subcategory: newNode };
      r.subcategory = subFix;
    }
    // generic 출처 정리 (R226d) — search-link(MatWeb QuickText·범용검색·위키)·URL 없는 소스 제거(전체 generic;
    //   MatWeb DataSheet GUID 등 특정 datasheet 는 보존) + 권위 family 출처 보강(sourcesBySubcategory 정의 족보).
    if (r.tier === 'generic') {
      const isSearchLink = (s) => !s.url || /quicktext|searchtext=|google\.[a-z.]+\/search|bing\.com\/search|wikipedia/i.test(s.url || '');
      const kept = (r.sources || []).filter(s => !isSearchLink(s));
      const su = corr.sourcesBySubcategory && corr.sourcesBySubcategory[r.subcategory];
      let merged = kept;
      if (su) { const urls = new Set(kept.map(s => s.url)); merged = [...su.filter(s => !urls.has(s.url)), ...kept]; }
      if (merged.length === 0) merged = r.sources || [];   // 전부 제거되면 원본 유지 (안전)
      if (JSON.stringify(merged) !== JSON.stringify(r.sources || [])) { ch.sources = { from: r.sources }; r.sources = merged; }
    }
    // 별칭 보강 (R226d 대응합금) — cross-standard 지역명(JIS ADC 등) 추가 → 검색성. aliasesByBase.
    //   baseOf 는 " — " 만 분리하므로 "A380 (die-cast Al)" 같은 base 도 primary designation("A380")으로 매칭.
    const al = corr.aliasesByBase && (corr.aliasesByBase[baseOf(r.name)] || corr.aliasesByBase[baseOf(r.name).split(' (')[0].trim()]);
    if (al) {
      const existing = r.aliases || [];
      const merged = [...existing, ...al.filter(a => !existing.includes(a))];
      if (merged.length !== existing.length) { ch.aliases = { from: r.aliases }; r.aliases = merged; }
    }
    const rg = corr.ranges && corr.ranges[r.stable_id];
    if (rg) {
      r.ranges = r.ranges ? { ...r.ranges } : {};
      for (const p of Object.keys(rg)) {
        if (p === 'basis' || p === 'src' || typeof rg[p] !== 'number') continue;   // 임의 수치 prop (yield/uts/elongation/fatigue_strength …)
        // had_* 로 "키 없음" vs "키 있고 값 null" 구분 (revert 정확성).
        ch[p] = { had_range: (p in r.ranges), val_range: r.ranges[p], had_scalar: (p in r), val_scalar: r[p] };
        r.ranges[p] = { min: rg[p], typical: rg[p], max: rg[p], confidence: 'handbook', source: 'r226-correction' };
        r[p] = rg[p];   // top-level scalar (MaterialDetail·audit 가 ranges.typical ?? scalar 로 읽음)
      }
      ch._basis = rg.basis; ch._src = rg.src;
      // points[] = CSV 합성 조건값 → 교정 ranges 로부터 재생성 (레지스트리 자체를 self-consistent 로). 원본은 _corrections.points 보존.
      if (r.points) {
        ch.points = { from: r.points };
        const PO = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];
        r.points = [PO.map(p => { const v = r.ranges && r.ranges[p] && r.ranges[p].typical; return (typeof v === 'number' && isFinite(v)) ? v : null; })];
      }
    }
    // 비-수치 필드 교정 (name·process·heat_treatment) — 잘못된 라벨/공정 수정. ID 는 freeze 라 불변.
    const fx = corr.fields && corr.fields[r.stable_id];
    if (fx) {
      ch.fields = {};
      for (const k of ['name', 'process', 'heat_treatment']) if (fx[k] != null) { ch.fields[k] = { from: (k in r) ? r[k] : null }; r[k] = fx[k]; }
      ch._fbasis = fx.basis; ch._fsrc = fx.src;
    }
    // 제거 후 잔존한 mill-annealed(astm default) = 단일조건 alloy → placeholder 라벨을 "Annealed" 로 정직화 (합금 보존).
    if (/mill-annealed \(astm default\)/i.test(r.heat_treatment || '')) {
      ch.fields = ch.fields || {};
      ch.fields.heat_treatment = { from: r.heat_treatment };
      r.heat_treatment = 'Annealed';
      ch._fbasis = ch._fbasis || 'mill-annealed(astm default) placeholder → Annealed (단일조건 alloy)';
    }
    if (Object.keys(ch).length) { r._corrections = ch; corrApplied++; }
  }
} catch (e) { console.log('⚠ 교정 로드 실패:', e.message); }

// 5) 참조 테이블(index) — slim
const index = records.map(r => ({
  stable_id: r.stable_id, name: r.name, category: r.category, subcategory: r.subcategory,
  family: r.family, tier: r.tier, popularity: r.popularity ?? null, legacy_id: r.legacy_id, origin: r.origin,
}));

// 6) 출력
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ count: index.length, generated_from: 'client/public/materials (1198)', entries: index }, null, 2) + '\n');
// families 출력: 모든 노드 member_count. override 재키잉 레벨(alloy-base/element/custom)만 members 목록 포함.
const famOut = Object.values(families).sort((a, b) => a.id.localeCompare(b.id)).map(f => {
  const o = { id: f.id, label: f.label, kind: f.kind, parent: f.parent, member_count: f.members.length };
  if (['alloy-base', 'element-family', 'custom'].includes(f.kind)) o.members = f.members;
  return o;
});
const kindCount = {}; for (const f of famOut) kindCount[f.kind] = (kindCount[f.kind] || 0) + 1;
fs.writeFileSync(path.join(OUT, 'families.json'), JSON.stringify({ count: famOut.length, kinds: kindCount, families: famOut }, null, 2) + '\n');

// per-entry 파일 전체 생성: data/registry/<catcode>/<stable_id>.json
const entriesRoot = path.join(OUT, 'entries');
fs.rmSync(entriesRoot, { recursive: true, force: true });
for (const r of records) {
  const cc = r.stable_id.split('-')[0].toLowerCase();
  const dir = path.join(entriesRoot, cc);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${r.stable_id}.json`), JSON.stringify(r, null, 2) + '\n');
}

// 무손실 라운드트립 검증: 파일을 다시 읽어 _corrections 를 되돌린 뒤 원본(현재 entry)과 deep-equal.
//   → "무손실 + 문서화된 교정만 적용"임을 증명 (교정 외 어떤 변형도 없음).
const ADDED = new Set(['stable_id', 'family', 'legacy_id', 'origin', '_corrections']);
let readBack = 0, mismatch = 0; const badEx = [];
for (const cc of fs.readdirSync(entriesRoot)) {
  for (const fn of fs.readdirSync(path.join(entriesRoot, cc))) {
    const rec = JSON.parse(fs.readFileSync(path.join(entriesRoot, cc, fn), 'utf8'));
    readBack++;
    // 교정 되돌려 원본 재구성
    if (rec._corrections) {
      const c = rec._corrections;
      if (c.composition) { if (c.composition.from == null) delete rec.composition; else rec.composition = c.composition.from; }
      for (const p of Object.keys(c)) {
        if (['composition', 'subcategory', 'points', 'sources', 'aliases', 'fields', '_basis', '_src', 'points_stale'].includes(p) || !c[p] || c[p].had_range === undefined) continue;
        if (c[p].had_range) rec.ranges[p] = (c[p].val_range === undefined ? null : c[p].val_range); else delete rec.ranges[p];
        if (c[p].had_scalar) rec[p] = (c[p].val_scalar === undefined ? null : c[p].val_scalar); else delete rec[p];
      }
      if (c.fields) for (const k of ['name', 'process', 'heat_treatment']) if (c.fields[k]) { if (c.fields[k].from == null) delete rec[k]; else rec[k] = c.fields[k].from; }
      if (c.subcategory) rec.subcategory = c.subcategory.from;   // Ti 재분류 등 — 원본 subcat 복원
      if (c.points) rec.points = c.points.from;   // 재생성된 points → 원본(CSV) 복원
      if (c.sources) rec.sources = c.sources.from;   // generic 출처 업그레이드 → 원본 복원
      if (c.aliases) { if (c.aliases.from == null) delete rec.aliases; else rec.aliases = c.aliases.from; }   // 별칭 보강 → 원본 복원
    }
    const stripped = Object.fromEntries(Object.entries(rec).filter(([k]) => !ADDED.has(k)));
    const clean = cleanJson.get(rec.legacy_id);
    if (!clean || JSON.stringify(stripped) !== clean) { mismatch++; if (badEx.length < 3) badEx.push(rec.stable_id + '/' + (rec.legacy_id || '?')); }
  }
}

// P3b — 가짜 variant 탐지: 같은 alloy-base 인데 다른 heat_treatment 라벨이 동일 (yld,uts,el) 값
const recById = new Map(records.map(r => [r.stable_id, r]));
let fakeBases = 0, fakeEntries = 0; const fakeEx = [];
for (const f of Object.values(families)) {
  if (f.kind !== 'alloy-base' || f.members.length < 2) continue;
  const ms = f.members.map(id => recById.get(id));
  const byVal = {}; for (const r of ms) { const k = `${r.yield_strength}|${r.uts}|${r.elongation}`; (byVal[k] = byVal[k] || []).push(r); }
  for (const grp of Object.values(byVal)) {
    const hts = new Set(grp.map(r => (r.heat_treatment || '').toLowerCase().trim()));
    if (grp.length >= 2 && hts.size >= 2 && grp[0].yield_strength != null) {
      fakeBases++; fakeEntries += grp.length;
      if (fakeEx.length < 8) fakeEx.push(`${f.label.slice(0, 24)} ${grp.length}× (σy${grp[0].yield_strength}/UTS${grp[0].uts}, HT:${[...hts].slice(0, 3).join('|')})`);
      break;
    }
  }
}

// 7) 통계 출력
console.log('레지스트리 생성:', records.length, 'entries', removed ? `(제거 ${removed}건 — 중복·합성조건)` : '');
console.log('category별 ID:', Object.entries(seq).map(([k, v]) => `${k}=${v}`).join(' · '));
console.log('family:', Object.keys(families).length, '— ' + Object.entries(kindCount).map(([k, v]) => `${k}:${v}`).join(' · '));
console.log('index.json:', Math.round(fs.statSync(path.join(OUT, 'index.json')).size / 1024), 'KB · families.json:', Math.round(fs.statSync(path.join(OUT, 'families.json')).size / 1024), 'KB');
console.log('per-entry 파일:', records.length, '생성 (data/registry/entries/<cat>/<id>.json)');
console.log(`무손실(교정 전) faithful 검증: 불일치 ${faithMiss}`, faithMiss ? `❌ ${faithEx.join(',')}` : '✓');
console.log(`값 교정 적용: ${corrApplied} entry (data/r226-value-corrections.json, stable_id 키)`);
console.log(`라운드트립(교정 복원 후) 검증: ${readBack} 읽음 · 불일치 ${mismatch}`, mismatch ? `❌ 예: ${badEx.join(', ')}` : '✓ 무손실+문서화교정');
console.log(`\n=== P3 검수: 가짜 variant (같은 alloy-base, 다른 HT 라벨에 동일 σy/UTS/El) ===`);
console.log(`해당 alloy-base ${fakeBases}개 · entry ${fakeEntries}개:`);
fakeEx.forEach(e => console.log('  ' + e));
console.log('\n=== 참조 테이블 index 샘플 1건 ===');
console.log(JSON.stringify(index.find(e => /316L/.test(e.name)) || index[0], null, 2));
console.log('\n=== alloy-base family 예시 (multi-condition top 6 = override 단위) ===');
Object.values(families).filter(f => f.kind === 'alloy-base').sort((a, b) => b.members.length - a.members.length).slice(0, 6)
  .forEach(f => console.log(`  ${f.id}  (${f.members.length})  members: ${f.members.slice(0, 4).join(',')}${f.members.length > 4 ? '…' : ''}`));
console.log('element-family:', Object.values(families).filter(f => f.kind === 'element-family').map(f => `${f.id}(${f.members.length})`).join(' · '));
