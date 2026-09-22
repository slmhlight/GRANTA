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
import { sourceAuthority } from './lib/source-labels.mjs';
import { toHV } from './lib/hardness-convert.mjs';   // AUD F03 — 경도 스케일 환산(E140)   // R226f/축1a — weak-provenance(aggregator/other-only) 판정
import { loadCorrections } from './lib/corrections.mjs';   // H6 D5 — 도메인 분할 로더 (data/corrections/*.json)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// H6 D5 — try 밖 최상위 로드: 도메인 충돌·파싱 오류는 빌드 크래시 (silent skip 금지).
const CORRECTIONS = loadCorrections(ROOT);
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
let freeze = {}, fp = {};
try { const fz = JSON.parse(fs.readFileSync(FREEZE, 'utf8')); freeze = fz.map || {}; fp = fz.fp || {}; } catch { /* 최초 생성 */ }
const seq = {};
for (const sid of Object.values(freeze)) { const [cc, n] = sid.split('-'); seq[cc] = Math.max(seq[cc] || 0, parseInt(n, 10)); }
let newIds = 0;
// R226f — identity fingerprint 게이트: legacy_id 는 positional(C_/G_/R_/CER_… 소스 순서 기반)이라
//   상류 배열 "중간 삽입" 시 이후 id 가 전부 밀려 stable_id 가 다른 재료에 조용히 붙을 수 있음(append-only 만 안전).
//   freeze.fp 에 부여 시점의 name 을 기록 → 재생성 시 불일치면 하드 실패(수동 확인 강제).
//   의도된 이름 변경이면: freeze 의 fp 에서 해당 legacy_id 키만 삭제 후 재실행(재기록됨).
const fpBad = [];
for (const m of all) {
  const cc = CATCODE[m.category] || 'OTH';
  if (freeze[m.id]) {
    m.stable_id = freeze[m.id];
    if (fp[m.id] != null && fp[m.id] !== m.name) fpBad.push(`${m.id}→${m.stable_id}: "${fp[m.id]}" ≠ "${m.name}"`);
    if (fp[m.id] == null) fp[m.id] = m.name;   // 구 freeze(fp 없음) 마이그레이션 — 현재 이름 기록
  } else {
    seq[cc] = (seq[cc] || 0) + 1; m.stable_id = `${cc}-${String(seq[cc]).padStart(4, '0')}`;
    freeze[m.id] = m.stable_id; fp[m.id] = m.name; newIds++;
  }
}
if (fpBad.length) {
  console.error(`❌ ID FINGERPRINT 불일치 ${fpBad.length}건 — legacy_id 가 다른 재료를 가리킴 (상류 중간 삽입/개명?).`);
  fpBad.slice(0, 10).forEach(x => console.error('  ' + x));
  console.error('  의도된 개명이면 data/registry-id-freeze.json 의 fp 에서 해당 키 삭제 후 재실행. 중간 삽입이면 상류를 append-only 로 수정.');
  process.exit(1);
}
fs.writeFileSync(FREEZE, JSON.stringify({ _note: 'frozen legacy_id→stable_id (R226). 이름/subcat/공정 변경해도 ID 불변; 신규 entry 만 새 ID. 이 파일이 안정 ID 의 권위 소스. fp = 부여 시점 name fingerprint (R226f — positional legacy_id 오염 게이트).', count: Object.keys(freeze).length, map: freeze, fp }, null, 2) + '\n');

// 2b) 제거 (R226b, 사용자 승인): 중복 base + 합성 조건 entry 드롭. base 의 마지막 실조건은 안전상 보존.
//     freeze 는 위에서 이미 기록 → 제거된 ID 는 reserved(재사용 안 됨). cleanJson 에는 남아있으나 미출력이라 round-trip 무영향.
let removed = 0;
try {
  const rm = CORRECTIONS.remove || {};   // H6 D5 — data/corrections/remove.json
  const rmBases = new Set(rm.bases || []);
  const rmHT = new Set((rm.heatTreatments || []).map(s => String(s).toLowerCase().trim()));
  const rmIds = new Set(rm.ids || []);   // 특정 stable_id 제거 (중복 조건 등) — stable_id 는 위 freeze 에서 이미 할당됨
  const bo = (n) => String(n || '').split(' — ')[0].trim();
  const keptPerBase = {};
  for (const m of all) { const b = bo(m.name); if (rmBases.has(b)) continue; if (!rmHT.has((m.heat_treatment || '').toLowerCase().trim())) keptPerBase[b] = (keptPerBase[b] || 0) + 1; }
  const keep = [];
  const dropped = [];   // AUD Q03 — 제거 원장용 (사유 분류와 함께)
  for (const m of all) {
    const b = bo(m.name); const ht = (m.heat_treatment || '').toLowerCase().trim();
    if (rmIds.has(m.stable_id)) { removed++; dropped.push([m, 'id']); continue; }                           // 특정 ID 제거 (중복 조건)
    if (rmBases.has(b)) { removed++; dropped.push([m, 'base']); continue; }                                   // dup base 전체 제거
    if (rmHT.has(ht) && (keptPerBase[b] || 0) >= 1) { removed++; dropped.push([m, 'synthetic_condition']); continue; }        // 합성 조건 제거 (실조건 남는 경우만)
    keep.push(m);
  }
  all.length = 0; all.push(...keep);
  /* AUD Q03 (2026-09-22) — 제거 원장(구조화). 감사: "삭제된 31개 ID 와 함께 superseded_by·변경 이유·이전 조건·데이터 버전을 기록".
     자동 도출: superseded_by = 같은 base(— 앞)의 살아남은 entry 중 σy·UTS 가 같은 것(중복 제거) → 없으면 같은 base 의 대표(가장 가까운 σy).
     사유 서술은 data/corrections/remove.json 의 `reasons`(stable_id 키, 선택)에서, 없으면 분류 코드만. 산출: data/registry/removed.json (커밋). */
  {
    const reasons = rm.reasons || {};
    const byBase = {};
    for (const m of all) { const b = bo(m.name); (byBase[b] = byBase[b] || []).push(m); }
    const typ = (m, k) => { const r = m.ranges?.[k]; const v = r?.typical ?? m[k]; return (typeof v === 'number' && isFinite(v)) ? v : null; };
    const ledger = dropped.map(([m, kind]) => {
      const b = bo(m.name);
      const cands = byBase[b] || [];
      const R0 = reasons[m.stable_id] || {};
      let sup = R0.superseded_by ? (all.find(c => c.stable_id === R0.superseded_by) || null) : null;   // 원장에 명시된 대체 entry 우선
      let supHow = sup ? 'declared in remove.json reasons' : null;
      if (!sup) { sup = cands.find(c => typ(c, 'yield_strength') === typ(m, 'yield_strength') && typ(c, 'uts') === typ(m, 'uts')) || null; supHow = sup ? 'same-base same σy/UTS (duplicate)' : null; }
      if (!sup && cands.length) {
        const sy = typ(m, 'yield_strength');
        sup = sy == null ? cands[0] : cands.slice().sort((x, y) => Math.abs((typ(x, 'yield_strength') ?? 0) - sy) - Math.abs((typ(y, 'yield_strength') ?? 0) - sy))[0];
        supHow = 'same-base representative (nearest σy) — 값이 다르므로 대체가 아니라 참조';
      }
      const R = reasons[m.stable_id] || {};
      return {
        stable_id: m.stable_id, legacy_id: m.id, name: m.name, category: m.category, subcategory: m.subcategory,
        heat_treatment: m.heat_treatment ?? null, process: m.process ?? null,
        values: { yield_strength: typ(m, 'yield_strength'), uts: typ(m, 'uts'), elongation: typ(m, 'elongation') },
        removal_kind: kind,   // id | base | synthetic_condition
        reason: R.reason || ({ id: '개별 제거(remove.json ids — _ids_note 참조)', base: 'base 전체 제거(remove.json bases — 열등 복제)', synthetic_condition: '합성 조건 제거(remove.json heatTreatments — 실조건이 남는 base 만)' }[kind]),
        removed_on: R.date || null, ref: R.ref || null,
        superseded_by: sup ? sup.stable_id : null, superseded_by_legacy_id: sup ? sup.id : null, superseded_by_name: sup ? sup.name : null, superseded_how: supHow,
      };
    }).sort((a, b) => a.stable_id.localeCompare(b.stable_id));
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'removed.json'), JSON.stringify({ _note: 'AUD Q03 — 배포에서 제거된 entry 원장 (build-registry 자동 생성; 사유 서술은 data/corrections/remove.json reasons). stable_id 는 예약(재사용 없음). superseded_by 는 같은 base 의 살아남은 entry — superseded_how 가 "duplicate" 일 때만 동일 값 대체, 그 외는 참조.', count: ledger.length, generated: new Date().toISOString().slice(0, 10), removed: ledger }, null, 1) + '\n');
    console.log(`제거 원장(Q03): data/registry/removed.json — ${ledger.length} entries (superseded 확정 ${ledger.filter(x => x.superseded_how && x.superseded_how.startsWith('same-base same')).length})`);
  }
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

// 4c) R226 P4 — ID-키 값 교정 (가짜 variant 실제값; data/corrections/ — H6 D5 분할).
//     원본값을 _corrections 에 보존 → 라운드트립이 "무손실 + 문서화된 교정"임을 증명.
// fields 교정 허용 키 — 적용(4c)과 라운드트립 복원이 같은 목록을 공유해야 무손실 유지.
const FIELD_CORR_KEYS = ['name', 'process', 'heat_treatment', 'corrosion_resistance', 'machinability', 'weldability'];
let corrApplied = 0;
try {
  const corr = CORRECTIONS;
  for (const r of records) {
    const ch = {};
    const compFix = corr.compositionByBase && corr.compositionByBase[baseOf(r.name)];
    if (compFix && r.category === 'Metal') { ch.composition = { from: r.composition ?? null }; r.composition = { ...compFix }; }
    /* H6 W3-9 — 산업 노트는 조건(variation)이 아니라 **합금 단위** 정보라 base 키로 붙인다.
       기존 노트가 있으면 덮지 않는다 — 상류 datasheet 서술이 더 구체적인 경우가 많다. */
    const noteFix = corr.industryNoteByBase && corr.industryNoteByBase[baseOf(r.name)];
    if (noteFix && !(r.industry_note && String(r.industry_note).trim())) {
      /* had: 키 자체가 없었는지 vs 있는데 null 이었는지를 구분해야 라운드트립이 무손실이다
         (둘 다 null 로 뭉개면 복원 시 27건이 undefined≠null 로 어긋난다 — 실측으로 확인). */
      ch.industry_note = { from: r.industry_note ?? null, had: Object.prototype.hasOwnProperty.call(r, 'industry_note') };
      r.industry_note = noteFix.t;
    }
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
    // R226f/축1a — 보강 대상 확장: generic 외에도 aggregator/other-only(권위 출처 전무) entry 는 족보 출처 append.
    const weakProv = (r.sources || []).length > 0 && (r.sources || []).every(s => ['aggregator', 'other'].includes(sourceAuthority(s)));
    /* H6 W2-3 — 보강 조건 확장: 제조사 datasheet 는 있으나 **표준·핸드북 인용이 없는** entry 도 족보 출처 append.
     *   근거: KPI 진단(2026-07-17) — 234 entry 가 vendor-only 라 "이 값이 어느 규격 체계의 것인가" 가 부재.
     *   족보 출처(sourcesBySubcategory)는 subcategory 단위 권위 인용(ASM Vol.1/2·ASTM A29 등)이라 안전. */
    const noStandard = (r.sources || []).length > 0 && !(r.sources || []).some(s => ['standard', 'handbook'].includes(sourceAuthority(s)));
    if (r.tier === 'generic' || weakProv || noStandard) {
      const isSearchLink = (s) => !s.url || /quicktext|searchtext=|google\.[a-z.]+\/search|bing\.com\/search|wikipedia/i.test(s.url || '');
      const kept = r.tier === 'generic' ? (r.sources || []).filter(s => !isSearchLink(s)) : (r.sources || []);   // search-link 제거는 generic 만 (기존 semantics 보존)
      const su = corr.sourcesBySubcategory && corr.sourcesBySubcategory[r.subcategory];
      let merged = kept;
      if (su) { const urls = new Set(kept.map(s => s.url)); merged = [...su.filter(s => !urls.has(s.url)), ...kept]; }
      if (merged.length === 0) merged = r.sources || [];   // 전부 제거되면 원본 유지 (안전)
      if (JSON.stringify(merged) !== JSON.stringify(r.sources || [])) { ch.sources = { from: r.sources }; r.sources = merged; }
    }
    // 별칭 보강 (R226d 대응합금) — cross-standard 지역명(JIS ADC 등) 추가 → 검색성. aliasesByBase.
    //   baseOf 는 " — " 만 분리하므로 "A380 (die-cast Al)" 같은 base 도 primary designation("A380")으로 매칭.
    //   A3(2026-09-20): name 교정(fields.name)이 뒤(4c)에 적용되므로 별칭 매칭은 **교정 후 이름**으로 본다 —
    //   'AA 7050-T7451 (aerospace thick plate)' → 'AA 7050' 통일 뒤 A7050 별칭이 붙지 않던 것(게이트 발화).
    const nameForAlias = (corr.fields && corr.fields[r.stable_id] && corr.fields[r.stable_id].name) || r.name;
    const al = corr.aliasesByBase && (corr.aliasesByBase[baseOf(nameForAlias)] || corr.aliasesByBase[baseOf(nameForAlias).split(' (')[0].trim()]);
    if (al) {
      const existing = r.aliases || [];
      const merged = [...existing, ...al.filter(a => !existing.includes(a))];
      if (merged.length !== existing.length) { ch.aliases = { from: r.aliases }; r.aliases = merged; }
    }
    let rg = corr.ranges && corr.ranges[r.stable_id];
    /* AUD F03 (2026-09-22) — 경도 원자료 스케일 보존 + 환산. 교정에 `hardness_src: {scale, value, family}` 를 쓰면
       ASTM E140-12b 표(scripts/lib/hardness-convert.mjs)로 HV 를 도출해 싣고, 원 스케일·값·표를 range 객체에 남긴다
       (HV 열이 HB 수치를 그대로 싣던 것을 교정: Al HB 95 → HV 111). 표 밖 값(`keep: true`)은 환산하지 않고 원 스케일로 표기. */
    let hardnessMeta = null;
    if (rg && rg.hardness_src) {
      const hs = rg.hardness_src;
      if (hs.keep) {
        rg = { ...rg, hardness: hs.value };
        hardnessMeta = { scale: hs.scale, source_scale: hs.scale, source_value: hs.value, conversion: null, scale_note: 'ASTM E140 표 밖(또는 해당 표 없음) — 환산하지 않고 원 스케일 그대로 표기' };
      } else {
        const conv = toHV(hs.family, hs.scale, hs.value);
        if (!conv) { console.error(`❌ hardness_src 환산 불가 (${r.stable_id}): ${JSON.stringify(hs)} — 표 밖이면 keep:true 로 원 스케일 표기`); process.exit(1); }
        rg = { ...rg, hardness: conv.hv };
        hardnessMeta = { scale: 'HV', source_scale: hs.scale, source_value: hs.value, conversion: conv.table };
      }
    }
    if (rg) {
      r.ranges = r.ranges ? { ...r.ranges } : {};
      for (const p of Object.keys(rg)) {
        if (p === 'basis' || p === 'src' || typeof rg[p] !== 'number') continue;   // 임의 수치 prop (yield/uts/elongation/fatigue_strength …)
        // had_* 로 "키 없음" vs "키 있고 값 null" 구분 (revert 정확성).
        ch[p] = { had_range: (p in r.ranges), val_range: r.ranges[p], had_scalar: (p in r), val_scalar: r[p] };
        // R226g/축1b — per-property 인용: 기존 스키마의 provenance(R129, UI tooltip 노출)에 교정 출처(src)를 스탬프.
        //   spec-min 교정(basis_kind)은 basis 필드(R139b 'min_spec')로 의미 명시 — A/B-basis(축4a) 실사용 시작.
        r.ranges[p] = { min: rg[p], typical: rg[p], max: rg[p], confidence: 'handbook', provenance: rg.src ? `교정: ${rg.src}` : 'r226-correction', ...(rg.basis_kind ? { basis: rg.basis_kind } : {}) };
        r[p] = rg[p];   // top-level scalar (MaterialDetail·audit 가 ranges.typical ?? scalar 로 읽음)
      }
      if (hardnessMeta && r.ranges.hardness) Object.assign(r.ranges.hardness, hardnessMeta);
      ch._basis = rg.basis; ch._src = rg.src;
      // points[] = CSV 합성 조건값 → 교정 ranges 로부터 재생성 (레지스트리 자체를 self-consistent 로). 원본은 _corrections.points 보존.
      if (r.points) {
        ch.points = { from: r.points };
        const PO = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];
        r.points = [PO.map(p => { const v = r.ranges && r.ranges[p] && r.ranges[p].typical; return (typeof v === 'number' && isFinite(v)) ? v : null; })];
      }
    }
    /* AUD F03 (2026-09-22) — 알루미늄 계열 경도 스케일 정규화. 압연·주조 Al 의 원자료(AA typical 표·Alro/EMJ·MakeItFrom·
       주조 datasheet)는 경도를 Brinell(500 kgf/10 mm)로 준다 — 6061-T6 95 · 7075-T6 150 · 2024-T3 120 이 그 숫자인데 HV 열에
       그대로 실려 있었다(감사 F03; Al HB 95 는 HV 111). ASTM E140-12b Table 9 로 HV 를 도출해 싣고 원 스케일·값·표를 남긴다.
       표 밖(HB<40 순알루미늄 소둔 · HB>160 7068/Al-Li)은 환산하지 않고 scale:'HB' 로 원 스케일 표기. AM(LPBF 등) entry 는
       벤더 표기가 HBW/HV 로 갈려 확정할 수 없어 제외(그대로). 교정(rg) 뒤에 적용하므로 교정값(HB)도 함께 환산된다. */
    const isAlHardnessTarget = r.category === 'Metal' && /^Aluminum/.test(String(r.subcategory || ''))
      && r.ranges && r.ranges.hardness && typeof r.ranges.hardness.typical === 'number' && !r.ranges.hardness.scale
      && !(r.processes || []).some(pr => /LPBF|DMLS|SLM|EBM|DED|Binder/i.test(String(pr)));
    if (isAlHardnessTarget) {
      const h = r.ranges.hardness;
      if (!ch.hardness) ch.hardness = { had_range: true, val_range: h, had_scalar: ('hardness' in r), val_scalar: r.hardness };
      const conv = toHV('aluminum', 'HB', h.typical);
      const cv = (x) => { const c = (typeof x === 'number') ? toHV('aluminum', 'HB', x) : null; return c ? c.hv : null; };
      if (conv) {
        const min = cv(h.min) ?? conv.hv, max = cv(h.max) ?? conv.hv;
        r.ranges.hardness = { ...h, min: Math.min(min, conv.hv), max: Math.max(max, conv.hv), typical: conv.hv,
          scale: 'HV', source_scale: 'HB', source_value: h.typical, conversion: conv.table,
          provenance: `${h.provenance ? h.provenance + ' · ' : ''}HB ${h.typical} → HV ${conv.hv} (${conv.table})` };
        r.hardness = conv.hv;
        ch._hardness_scale = `Al HB500 ${h.typical} → HV ${conv.hv} (E140 T9)`;
        /* points[] — 교정(rg) 블록이 이미 typical 단일행으로 재생성한 경우(ch.points 있음)는 환산값으로 다시 생성한다.
           교정이 없던 entry 는 손대지 않는다: 4d 가 stale(경도 열 HB ∉ HV 범위)을 검출해 typical 행으로 재생성하고 ch.points 를 남긴다. */
        if (ch.points && Array.isArray(r.points) && r.points.length) {
          const PO = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];
          r.points = [PO.map(p => { const v = r.ranges && r.ranges[p] && r.ranges[p].typical; return (typeof v === 'number' && isFinite(v)) ? v : null; })];
        }
      } else {
        r.ranges.hardness = { ...h, scale: 'HB', source_scale: 'HB', source_value: h.typical, conversion: null,
          scale_note: 'ASTM E140-12b Table 9 범위(HB 40~160) 밖 — 환산하지 않고 Brinell(500 kgf) 로 표기' };
        ch._hardness_scale = `Al HB500 ${h.typical} 표 밖 — HB 표기 유지`;
      }
    }
    // 비-수치 필드 교정 (name·process·heat_treatment·정성등급) — 잘못된 라벨/공정/등급 수정. ID 는 freeze 라 불변.
    const fx = corr.fields && corr.fields[r.stable_id];
    if (fx) {
      ch.fields = {};
      /* A3 잔여(2026-09-20): 원본 키가 '존재하되 null' 인 경우(heat_treatment: null)를 '없음' 과 구분해 기록 — 복원이 키를 지워 버려
         라운드트립이 1건 어긋났다(MET-0152 AA 5456 → H116). had 로 존재 여부를 남긴다. */
      for (const k of FIELD_CORR_KEYS) if (fx[k] != null) { ch.fields[k] = { from: (k in r) ? r[k] : null, had: (k in r) }; r[k] = fx[k]; }
      /* process 는 상류(build-materials 3099)에서 processes.join(' / ') 로 파생된 값이라 둘은 한 쌍이다. 교정이 process 만
         바꾸면 processes[] 가 낡은 채 남아, 상세 패널(processes 우선)·AM 판정·사이드바 count 와 필터(process)가 갈라진다
         (Ta MET-0662 'Wrought' vs ['LPBF'] · PA11 POL-0065 'SLS' vs ['Injection Molding'] — 2026-09-20 F1 에서 적발). */
      if (fx.process != null) { ch.fields.processes = { from: ('processes' in r) ? r.processes : null, had: ('processes' in r) }; r.processes = String(fx.process).split(' / '); }
      // 화이트리스트 밖 키는 silent skip 금지 — 오타·미지원 필드를 빌드에서 즉시 노출
      const unknown = Object.keys(fx).filter(k => !FIELD_CORR_KEYS.includes(k) && !['basis', 'src'].includes(k));
      if (unknown.length) { console.error(`❌ fields 교정 미지원 키 (${r.stable_id}): ${unknown.join(', ')} — FIELD_CORR_KEYS 확장 필요`); process.exit(1); }
      ch._fbasis = fx.basis; ch._fsrc = fx.src;
    }
    // 제거 후 잔존한 mill-annealed(astm default) = 단일조건 alloy → placeholder 라벨을 "Annealed" 로 정직화 (합금 보존).
    if (/mill-annealed \(astm default\)/i.test(r.heat_treatment || '')) {
      ch.fields = ch.fields || {};
      ch.fields.heat_treatment = { from: r.heat_treatment };
      r.heat_treatment = 'Annealed';
      ch._fbasis = ch._fbasis || 'mill-annealed(astm default) placeholder → Annealed (단일조건 alloy)';
    }
    // 4d) points ↔ ranges 정합 (R226e) — 상류 range override(R173/R199/R205/R221 등)가 ranges 를 교정했지만
    //     points 가 stale 원시(CSV 합성·오염)행으로 남은 entry 99건 (예: Be-Cu points=순수 Be 값 ρ1.86·E310,
    //     AISI 5140 Annealed points σy624.8=합성 vs ranges 260~340=실제). 표(ranges)와 Ashby(points)가 다른
    //     이야기를 하지 않도록 typical 단일행으로 재생성. ch.points 추적 → round-trip 무손실.
    if (!ch.points && Array.isArray(r.points) && r.points.length && r.ranges) {
      const PO = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];
      /* AUD-3 D06 (2026-09-22) — 허용오차가 너무 컸다: 절대 바닥 0.51 이 밀도(7.83±0.51)를 거의 무검사로 만들고,
         2% 상대는 4340 소둔 σy(점 540 vs 범위 415~530)를 1.9% 로 통과시켰다. 1% 상대 + 정수 반올림 바닥은 정수로 실리는
         물성에만(밀도는 소수 2자리라 0.02). */
      const EPS = { density: 0.02 };   // 그 외 PO 물성은 points 가 정수 → 0.5
      const tol = (v, prop) => Math.max(Math.abs(v) * 0.01, EPS[prop] ?? 0.5);
      let stale = false;
      for (let i = 0; i < PO.length && !stale; i++) {
        const rr = r.ranges[PO[i]];
        if (!rr || rr.min == null || rr.max == null) continue;
        for (const row of r.points) {
          const v = row && row[i];
          if (typeof v === 'number' && isFinite(v) && (v < rr.min - tol(rr.min, PO[i]) || v > rr.max + tol(rr.max, PO[i]))) { stale = true; break; }
        }
      }
      if (stale) {
        ch.points = { from: r.points };
        ch._points_resync = 'points ⊄ ranges (상류 range override 후 stale 행) → typical 단일행 재생성';
        r.points = [PO.map(p => { const v = r.ranges[p] && r.ranges[p].typical; return (typeof v === 'number' && isFinite(v)) ? v : null; })];
      }
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
        if (['composition', 'subcategory', 'points', 'sources', 'aliases', 'fields', 'industry_note', '_basis', '_src', 'points_stale'].includes(p) || !c[p] || c[p].had_range === undefined) continue;
        if (c[p].had_range) rec.ranges[p] = (c[p].val_range === undefined ? null : c[p].val_range); else delete rec.ranges[p];
        if (c[p].had_scalar) rec[p] = (c[p].val_scalar === undefined ? null : c[p].val_scalar); else delete rec[p];
      }
      if (c.fields) for (const k of [...FIELD_CORR_KEYS, 'processes']) if (c.fields[k]) { const cf = c.fields[k]; const had = ('had' in cf) ? cf.had : cf.from != null; if (!had) delete rec[k]; else rec[k] = cf.from; }
      if (c.subcategory) rec.subcategory = c.subcategory.from;   // Ti 재분류 등 — 원본 subcat 복원
      if (c.points) rec.points = c.points.from;   // 재생성된 points → 원본(CSV) 복원
      if (c.sources) rec.sources = c.sources.from;   // generic 출처 업그레이드 → 원본 복원
      if (c.aliases) { if (c.aliases.from == null) delete rec.aliases; else rec.aliases = c.aliases.from; }   // 별칭 보강 → 원본 복원
      // H6 W3-9 — industry_note 백필(industryNoteByBase) 복원. 이 줄이 없으면 백필한 entry 수만큼
      //   라운드트립 불일치가 난다(빌드가 82건으로 경고 → 이 누락으로 확인).
      if (c.industry_note) { if (!c.industry_note.had) delete rec.industry_note; else rec.industry_note = c.industry_note.from; }
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
console.log(`값 교정 적용: ${corrApplied} entry (data/corrections/, stable_id 키 — H6 D5 분할)`);
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
