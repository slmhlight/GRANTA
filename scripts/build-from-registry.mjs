/*
 * R226 P5 — registry-driven build (cutover 후보).
 *
 * 레지스트리(data/registry/entries, 교정 반영 SSOT)를 읽어 앱 산출물을 생성:
 *   client/public/materials.json (full) · materials/index.json (slim) · materials/{cat}.json (shards) · build-meta.json
 *
 * 기존 build-materials.mjs (6 소스 + 890 name-regex override + derived) 를 대체.
 * 레지스트리 entry 는 derived 속성(KIC·fatigue·points 등)을 이미 baked-in 보유 →
 * 여기서는 anomaly 재검출 + slim/shard/meta 생성만 수행.
 *
 * 사용: node scripts/build-from-registry.mjs [outDir]
 *   outDir 미지정 시 client/public (live). 지정 시 검증용 임시 출력.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectAnomalies } from './lib/anomalies.mjs';   // R226e — 공유 모듈 (중복 제거)
import { fatigueRule, deriveFatigueRange, parseDerivedFatigue } from './lib/fatigue-fallback.mjs';   // A19 — 파생 피로 재유도(1i)
import { rederivePrices } from './lib/derived-prices.mjs';   // AUD N02 — 파생 가격 재계산(1j)
import { improveLabel, sourceAuthority } from './lib/source-labels.mjs';   // R226e — 출처 라벨 도출 + 권위 등급
import { extractUNS } from './lib/uns.mjs';   // R226f/축4c — UNS 정규 필드
import { confidenceTierOf, TIER_RANK } from './lib/confidence-tier.mjs';   // C3 — 신뢰 등급 규칙 SSOT

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REG = path.join(ROOT, 'data', 'registry', 'entries');
const OUT_PUB = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'client', 'public');
const OUT_MATS = path.join(OUT_PUB, 'materials');

// 1) 레지스트리 entry 로드 → R226 필드 제거 → 원본 entry(+교정) 복원
// R226j/C6 — 공정 프로파일 할당 (stable_id 키) 을 m.profiles 로 스탬프. 런타임 regex 추론 제거의 핵심.
const PROFILE_ASSIGN = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'process-profile-assignments.json'), 'utf8')).assignments;
// R226l/B1 — 고온 곡선 by_id (stable_id 키 — 이름 매칭 없음). 인라인 elevated_temp 보유 entry 는 불변(인라인 우선).
const ET_BY_ID = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'elevated-temp-curves.json'), 'utf8')).by_id || {}; } catch { return {}; } })();
let etAttached = 0, etReplaced = 0;
const PROFILES_CONTENT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'process-profiles.json'), 'utf8'));
const INSIGHTS_CONTENT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'selection-insights.json'), 'utf8'));
const CREC_GROUPS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'coating-recommendations.json'), 'utf8')).groups;   // R226s/E10
/* R226t/E13 — 합금 개발배경(스토리) SSOT: stable_id 로 부착 (구 build-materials name-매칭 은퇴).
 *   본문 = sections(v2 구조화, 표준 순서 join) 우선, 없으면 legacy_text. sid 중복은 빌드 실패. */
const STORY_ORDER = ['hook', 'origin', 'breakthrough', 'adoption', 'today', 'fun_fact'];
const STORY_BY_SID = (() => {
  const m = new Map();
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'alloy-stories.json'), 'utf8'));
  for (const [key, st] of Object.entries(doc.stories || {})) {
    const text = st.legacy_text || STORY_ORDER.map((k) => st.sections?.[k]).filter(Boolean).join('\n\n');
    if (!text) continue;   // dead(멤버 0)이면서 본문 없음 — 없음
    for (const sid of st.stable_ids || []) {
      if (m.has(sid)) { console.error(`❌ alloy-stories: sid 중복 ${sid} (${m.get(sid).key} & ${key})`); process.exit(1); }
      m.set(sid, { key, text, refs: st.refs || [], sections: st.sections || null, timeline: st.timeline || null });
    }
  }
  return m;
})();
let storyAttached = 0;
const R226_FIELDS = new Set(['stable_id', 'family', 'legacy_id', 'origin', '_corrections']);
const all = [];
const profileGateErrors = [];
const seenSids = new Set();
for (const cc of fs.readdirSync(REG)) {
  for (const fn of fs.readdirSync(path.join(REG, cc))) {
    const rec = JSON.parse(fs.readFileSync(path.join(REG, cc, fn), 'utf8'));
    const entry = {};
    for (const [k, v] of Object.entries(rec)) if (!R226_FIELDS.has(k)) entry[k] = v;   // points 는 build-registry 가 교정 시 이미 재생성 (레지스트리가 self-consistent)
    /* A3 철강 2027Q3 / AUD-3 Q03 — stable_id 는 산출물에도 싣는다. 레지스트리 내부 키가 아니라 **공개 식별자**다:
       이름·조건이 바뀌어도 불변이라 CSV·보고서·제거 원장이 같은 재료를 가리킬 수 있는 유일한 키.
       (family/legacy_id/origin/_corrections 는 계속 내부 전용.) */
    entry.stable_id = rec.stable_id;
    seenSids.add(rec.stable_id);
    const a = PROFILE_ASSIGN[rec.stable_id];
    if (!a) {
      profileGateErrors.push(`할당 누락: ${rec.stable_id} (${rec.name}) — pnpm build:profiles 재실행 필요`);
    } else {
      // 키 유효성 (콘텐츠 parity)
      if (a.mach && !PROFILES_CONTENT.machinability.metal[a.mach] && !PROFILES_CONTENT.machinability.polymer[a.mach])
        profileGateErrors.push(`mach 키 미정의: ${rec.stable_id} → ${a.mach}`);
      if (a.weld && !PROFILES_CONTENT.weld_models[a.weld])
        profileGateErrors.push(`weld 키 미정의: ${rec.stable_id} → ${a.weld}`);
      if (a.insight && !INSIGHTS_CONTENT.groups[a.insight])
        profileGateErrors.push(`insight 키 미정의: ${rec.stable_id} → ${a.insight}`);
      if (a.cg && !CREC_GROUPS[a.cg])
        profileGateErrors.push(`cg(후공정 그룹) 키 미정의: ${rec.stable_id} → ${a.cg}`);   // R226s/E10
      if (Object.keys(a).length) {
        const p = { ...a };
        if (p.colorf) { p.colorFamily = p.colorf; delete p.colorf; }   // R226p Phase 5b — colorf → colorFamily
        entry.profiles = p;
      }
    }
    // R226l/R226m — by_id 고온 곡선 부착. R226m: by_id 는 datasheet 검증(벡터+앵커) 이므로
    // 파생 백필 인라인보다 우선 → override (SS410 처럼 인라인이 조건-무관 generic 오류인 경우 교정).
    const et = ET_BY_ID[rec.stable_id];
    if (et) {
      const hadInline = !!(entry.elevated_temp && entry.elevated_temp.length);
      entry.elevated_temp = et.elevated_temp;
      if (et.src) entry.elevated_temp_src = et.src;
      etAttached++;
      if (hadInline) etReplaced++;
    }
    // R226t/E13 — 스토리 부착 (stable_id; 레지스트리 baked story 는 은퇴 — SSOT 가 항상 우선)
    const st = STORY_BY_SID.get(rec.stable_id);
    if (st) {
      entry.story = st.text;
      entry.story_refs = st.refs;
      entry.story_key = st.key;
      if (st.sections) entry.story_v2 = { sections: st.sections, ...(st.timeline ? { timeline: st.timeline } : {}) };
      storyAttached++;
    } else if (entry.story) {
      // 레지스트리에 잔존 baked story (재생성 전 과도기) — SSOT 미등재면 제거 (name-매칭 잔재 차단)
      delete entry.story; delete entry.story_refs;
    }
    all.push(entry);
  }
}
for (const sid of Object.keys(PROFILE_ASSIGN)) if (!seenSids.has(sid)) profileGateErrors.push(`stale 할당 (레지스트리에 없는 ID): ${sid}`);
for (const sid of Object.keys(ET_BY_ID)) if (!seenSids.has(sid)) profileGateErrors.push(`stale 곡선 by_id (레지스트리에 없는 ID): ${sid}`);
for (const sid of STORY_BY_SID.keys()) if (!seenSids.has(sid)) profileGateErrors.push(`stale 스토리 stable_id (레지스트리에 없는 ID): ${sid}`);   // R226t
if (etAttached) console.log(`  고온곡선 by_id 부착: ${etAttached} (인라인 override ${etReplaced})`);
if (storyAttached) console.log(`  스토리 by_id 부착: ${storyAttached} (SSOT data/alloy-stories.json)`);
if (profileGateErrors.length) {
  console.error(`❌ BUILD GATE (process profiles): ${profileGateErrors.length}건`);
  profileGateErrors.slice(0, 15).forEach(e => console.error('  ' + e));
  process.exit(1);
}

// 1b) 출처 라벨 정리 (R226d/R226e) — placeholder 라벨("Datasheet N"·"MatWeb N") → URL 도메인 서술 라벨. lib/source-labels.mjs improveLabel 사용.
let relabeled = 0;
for (const m of all) if (m.sources) m.sources = m.sources.map(s => { const ns = improveLabel(s); if (ns !== s) relabeled++; return { ...ns, authority: sourceAuthority(ns) }; });   // D3 — 권위 등급 부착
// 1b') W2-3 — 폴리머 시험 표준 인용: 폴리머 물성(σy·E·El·HDT)은 ISO 527/178/75 로 측정된다.
//   값이 아니라 "측정 방법의 근거" 를 병기 — standard/handbook 인용이 없는 Polymer entry 에만(중복 방지).
//   이름 regex 없음(category·ranges 필드 기반). 값 SSOT 불변 — presentation.
const POLY_TEST_STD = [
  { label: 'ISO 527-1/-2 — 플라스틱 인장 물성 시험법 (σy·UTS·연신율 측정 근거)', url: 'https://www.iso.org/standard/75824.html', verified: false, authority: 'standard' },
  { label: 'ISO 178 — 플라스틱 굽힘 물성 시험법 (굽힘 탄성률 측정 근거)', url: 'https://www.iso.org/standard/70513.html', verified: false, authority: 'standard' },
];
const POLY_HDT_STD = { label: 'ISO 75-1/-2 — 하중 하 열변형 온도(HDT) 시험법', url: 'https://www.iso.org/standard/61784.html', verified: false, authority: 'standard' };
let polyStdAdded = 0;
for (const m of all) {
  if (m.category !== 'Polymer') continue;
  const srcs = m.sources || (m.sources = []);
  if (srcs.some(x => x.authority === 'standard' || x.authority === 'handbook')) continue;
  const add = [...POLY_TEST_STD];
  if (m.ranges && m.ranges.max_service_temp) add.push(POLY_HDT_STD);
  m.sources = [...add, ...srcs];
  polyStdAdded++;
}
if (polyStdAdded) console.log(`  폴리머 시험 표준 인용: ${polyStdAdded} entry (ISO 527/178/75 — 값 불변, 측정 근거 병기)`);

// 1b+) G3-2 — 출처 정렬(presentation): 권위 高 우선·검색결과 URL(문서 아님)은 최하위 강등.
//   값 SSOT(레지스트리) 불변 — 산출물 표시 순서만. 동순위는 원 순서 유지(stable).
//   근거: 245 재료의 "첫 출처"가 MatWeb QuickText 검색페이지(문서 추적 불가)였던 감사 G3-2.
const AUTH_RANK = { standard: 0, handbook: 1, manufacturer: 2, aggregator: 3, other: 4 };
const isSearchUrl = (u) => /QuickText\.aspx|[?&]SearchText=|\/search\?|google\.[a-z.]+\/search|bing\.com\/search/i.test(u || '');
let srcReordered = 0;
for (const m of all) {
  if (!m.sources || m.sources.length < 2) continue;
  const first = m.sources[0];
  m.sources = m.sources
    .map((s, i) => ({ s, i, r: isSearchUrl(s.url) ? 9 : (AUTH_RANK[s.authority] ?? 4) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(x => x.s);
  if (m.sources[0] !== first) srcReordered++;
}
if (srcReordered) console.log(`  출처 정렬(G3-2): 첫 출처 교체 ${srcReordered} entry (검색링크 강등·권위 우선)`);
// G3-2a' — 잔존 검색 URL(큐레이션 라벨+검색페이지 URL 조합) 라벨 투명화: 문서로 오인 방지.
//   GUID 딥링크 자동 교체는 MatWeb 안티봇으로 불가 — 교체 전까지 정직 표기(강등과 세트).
for (const m of all) for (const s of m.sources || []) {
  if (isSearchUrl(s.url) && !/검색결과/.test(s.label || '')) s.label = `${s.label} — 검색결과(문서 아님)`;
}
// R226f/축4c — UNS 정규 필드 (별칭·이름·specs 에서 도출; 외부 연동 키)
for (const m of all) { const u = extractUNS(m); if (u.length) m.uns = u; }

// 1b++) 내부마커 새니타이즈 (presentation) — 사용자 대면 텍스트 필드에서 개발 라운드 ID·작업 서사
//   (사용자 제공/지시 · 배치 · 재검증 대상 · fake-variant · stale 등)를 제거. 값·레지스트리 SSOT 불변.
//   대상 필드 한정: industry_note · elevated_temp_src · creep_rupture_src · ranges[*].provenance ·
//   ranges[*].min_spec_source · sources[*].label. 실제 합금/규격명(R41·R250·R260·R134a 등)은
//   보존해야 하므로 범용 R\d+ 삭제 금지 — 내부 토큰 명시 패턴만. 게이트: tests/no-internal-leak.test.ts
const SAN_RULES = [
  [/ ?\(사용자 제공 datasheet R226[lm], 벡터 추출·23°C 앵커 검증\)/g, ' (Materials Data for Simulation datasheet)'],
  [/, 사용자 제공 R226[lm]\)/g, ')'],
  [/\(사용자 제공 R226[lm]: /g, '('],
  [/ ?\(사용자 제공 R226[lm]\)/g, ''],
  [/\(사용자 제공 PDF: /g, '('],
  [/ ?\(사용자 제공 PDF\)/g, ''],
  [/ ?\((?:R\d{1,3}[a-z]?|REAL_PROPS)(?: 배치)? · 재검증 대상\)/g, ''],
  [/ ?\(R\d{1,3}[a-z]? 배치\)/g, ''],
  [/ ?\(R150 measured backfill\)/g, ''],
  [/ ?[·—-] ?R132 검증/g, ''],
  [/, ?R173 fake-variant 제거/g, ''],
  [/R221 검증: /g, '대조: '],
  [/; commodity 집계 도메인이라 verified 강등/g, ''],
  [/ ?\(WebFetch 확인\)/g, ''],
  [/\bR205-R /g, ''],
  [/\bR214 (?=σf)/g, ''],
  [/ · R212b (?=cap)/g, ' · '],
  [/\(R216: /g, '('],
  [/; R216 /g, '; '],
  [/교정: 사용자 지시 \+ /g, '교정: '],
  [/ ?\(sibling MET-\d{4}\)/g, ''],
  /* AUD-3 D01 (2026-09-22) — override 의 근거 문장이 provenance 로 실리면서 개발 서사(CSV mock 정정·1700 mock 등)가 함께 노출된다.
     근거(값·규격·조건)는 남기고 내부 작업 메모만 걷어낸다. */
  [/ ?[.·]? ?CSV ?의? ?[\d/]* ?mock ?(?:peak ?값)? ?정정\.?/g, ''],
  [/ ?[.·]? ?\d+ mock 은 [^.]*\./g, ''],
  [/ ?[.·]? ?mock 정정\.?/g, ''],
  [/UTS 정정 후 stale 값 교체/g, 'UTS 정정 후 재산출'],
  [/ R226f: 별칭 근사\(A380≈ADC-12\)로 커버하던 것을 실엔트리로 승격\. \(주: append-only — 이 파일 중간 삽입은 legacy_id 를 밀어 fp 게이트가 차단함\.\)/g, ''],
];
const sanText = (s) => {
  let t = s, hit = false;
  for (const [re, rep] of SAN_RULES) { const u = t.replace(re, rep); if (u !== t) { hit = true; t = u; } }
  return hit ? t.replace(/ {2,}/g, ' ').replace(/ \)/g, ')').trim() : s;
};
let sanitized = 0;
for (const m of all) {
  for (const f of ['industry_note', 'elevated_temp_src', 'creep_rupture_src']) {
    if (typeof m[f] === 'string') { const t = sanText(m[f]); if (t !== m[f]) { m[f] = t; sanitized++; } }
  }
  if (m.ranges) for (const r of Object.values(m.ranges)) {
    if (!r || typeof r !== 'object') continue;
    for (const f of ['provenance', 'min_spec_source']) {
      if (typeof r[f] === 'string') { const t = sanText(r[f]); if (t !== r[f]) { r[f] = t; sanitized++; } }
    }
  }
  for (const s of m.sources || []) {
    if (s && typeof s.label === 'string') { const t = sanText(s.label); if (t !== s.label) { s.label = t; sanitized++; } }
  }
}
if (sanitized) console.log(`  내부마커 새니타이즈: ${sanitized} 필드 (라운드 ID·작업 서사 제거 — presentation, 레지스트리 불변)`);

/* 축4a → AUD-3 D04 (2026-09-22) — **수치 근접으로 근거의 종류를 바꾸지 않는다.**
 *
 * 이전: min-spec 표에 걸린 entry 의 typical 이 표의 minimum ±2% 이면 `basis='min_spec'` 을 찍어 화면이
 * "이 값은 평균이 아니라 규격 보증 최소값" 이라고 단언했다. 그러나 그 조건에는 원문이 그 값을 최소값으로 지정했는지,
 * 제품 형태·두께·열처리·시험 방향이 규격과 같은지에 대한 근거가 없다(감사 D04: 101 필드, 그중 8 은 표 최소값과도 다름).
 *
 * 지금: 규격 최소값은 **별도 축**(min_spec_value·min_spec_source — R139b 와 같은 필드)에 싣는다. 값 자체의 성격을 바꾸는
 * `basis='min_spec'` 은 교정이 `basis_kind` 로 **직접 선언**한 경우에만 남는다. 근접(±2%)은 "대표값인지 하한인지 확인 대상"
 * 이라는 표시(near_min_spec)로만 쓰고, UI 가 그렇게 읽어 준다. */
const MINSPECS = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'standard-min-specs.json'), 'utf8')).specs || []; } catch { return []; } })();
/* A3 철강 2027Q3 / AUD-3 D04 — 규격 하한 **선언**(data/spec-floor-declarations.json). 사람이 원문을 대조해
   "이 entry 의 이 물성은 인용 규격의 최소값" 이라고 적은 것만 basis 를 바꾼다. 수치 근접은 근거가 아니다. */
const FLOOR_DECL = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'spec-floor-declarations.json'), 'utf8')).declarations || []; } catch { return []; } })();
const floorBySid = new Map(FLOOR_DECL.map(d => [d.stable_id, d]));
let floorDeclared = 0;
for (const m of all) {
  const d = floorBySid.get(m.stable_id);
  if (!d) continue;
  for (const prop of d.props || []) {
    const r = m.ranges?.[prop];
    if (!r || typeof r.typical !== 'number') { console.warn(`  ⚠ 규격 하한 선언 대상 없음: ${d.stable_id} ${prop}`); continue; }
    r.basis = 'min_spec';
    r.basis_source = d.std;
    r.basis_note = d.note;
    r.basis_verified = d.verified;
    floorDeclared++;
  }
}
if (floorDeclared) console.log(`  규격 하한 선언(D04): ${floorDeclared} 필드 / ${FLOOR_DECL.length} entry — 원문 대조 기록 있음`);
let specMinStamped = 0, nearMin = 0;
for (const m of all) {
  const sp = MINSPECS.find(s => (m.name || '').includes(s.pattern));
  if (!sp) continue;
  for (const [prop, min] of Object.entries(sp.min)) {
    const r = m.ranges?.[prop];
    if (!r || typeof r.typical !== 'number') continue;
    if (r.basis === 'min_spec') continue;   // 선언된 행 — 같은 축을 두 번 말하지 않는다
    r.min_spec_value = min;
    if (sp.std) r.min_spec_source = sp.std;
    specMinStamped++;
    if (Math.abs(r.typical - min) <= min * 0.02) { r.near_min_spec = true; nearMin++; }
  }
}
console.log(`  규격 최소값 병기(D04): ${specMinStamped} 필드 (그중 표시값이 최소값 ±2% = 확인 대상 ${nearMin}) — basis 자동 부여는 중단, 선언 교정만`);

// 원본 build 순서 재구성 (curated→am_vendor→generic→supplementary→ceramics→composites→polymers).
//   legacy_id 의 prefix 그룹 → 전체 numeric tuple (R_NNNN_C 의 condition suffix 포함) 로 정렬.
const ORDER = ['C', 'V', 'G', 'R', 'CER', 'CMP', 'POL'];
const numKey = (id) => String(id || '').split('_').slice(1).map(x => parseInt(x, 10) || 0);
all.sort((a, b) => {
  const pa = String(a.id || '').split('_')[0], pb = String(b.id || '').split('_')[0];
  const d = ORDER.indexOf(pa) - ORDER.indexOf(pb);
  if (d) return d;
  const ka = numKey(a.id), kb = numKey(b.id);
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) { const x = (ka[i] || 0) - (kb[i] || 0); if (x) return x; }
  return 0;
});

/* 1c) 고온곡선 23°C 앵커 **재검사** — 교정 후 최종 값 기준.
 *
 * build-materials 의 `elevAnchorOk`(비율 ≤1.4)는 곡선을 붙이는 시점에 판정한다. 그런데 값 교정은
 * 그 뒤 build-registry 에서 적용되므로, **교정이 게이트 판정을 무효화해도 아무도 다시 보지 않는다.**
 *
 * 실제 사고(C17200/MET-0381): 원래 σy 1100(시효재)이라 곡선 앵커 1100 과 일치해 정상 통과했는데,
 * 이후 교정이 σy 를 160(소둔재, ASTM B194 TB00)으로 바꿨다. 표는 소둔재인데 곡선은 시효재가 남아
 * 23°C 앵커가 6.9배 어긋난 상태로 노출됐다.
 *
 * 설계 원칙은 이미 정해져 있다 — "off-peak 조건은 곡선 미표시(스케일링=합성 금지)".
 * 같은 규칙을 최종 데이터에 한 번 더 적용한다. 값은 건드리지 않고 조건이 안 맞는 곡선만 뗀다. */
let elevDropped = 0;
for (const m of all) {
  if (!Array.isArray(m.elevated_temp) || !m.elevated_temp.length) continue;
  const rtSy = m.ranges?.yield_strength?.typical ?? m.yield_strength;
  const c = m.elevated_temp.find(p => p.temp <= 30)?.ys ?? m.elevated_temp[0]?.ys;
  if (!rtSy || !c) continue;                       // 판정 불가 → 기존대로 유지
  if (Math.max(c, rtSy) / Math.min(c, rtSy) <= 1.4) continue;
  delete m.elevated_temp;
  delete m.elevated_temp_src;
  elevDropped++;
  console.log(`  고온곡선 분리: ${m.stable_id || m.id} ${String(m.name).slice(0, 44)} — 곡선 RT σy ${c} vs 표 ${rtSy}`);
}
if (elevDropped) console.log(`  교정 후 앵커 재검사: 조건 불일치 곡선 ${elevDropped} 분리`);

/* 1d) W4-6 — confidence ↔ provenance 정합 (표시 신뢰도 하향만).
 *
 * 실측: `confidence: 'handbook'|'measured'` 인데 `provenance` 는 계열 폴백(`2nd_family:…`)인 range 가 107건.
 * 예) CP-Nickel max_service_temp = 315 · n=0 · estimated=true · confidence='handbook' · provenance='2nd_family:Nickel Superalloy'.
 * 값은 계열 typical 인데 UI 는 "핸드북" 배지를 단다 — 둘 중 낙관적인 쪽이 표시되고 있었다.
 *
 * 근본 원인은 동결된 build-materials 안에 있어(레지스트리에 이미 그렇게 박혀 있고 교정 소산이 아니다)
 * 여기서는 **표시 신뢰도만** provenance 가 말하는 등급으로 맞춘다. 값은 건드리지 않고, **하향만** 한다 —
 * 어떤 경우에도 신뢰도를 올리지 않는다(원칙 8: 숨기지도 부풀리지도 않는다).
 *
 * A12 근본원인 해소(2026-09-20): override 병합이 계열 폴백의 provenance·estimated 를 살려 두던 것을
 * build-materials 의 mergeRangeOverride 가 상류에서 정합 → 이 단계는 **0 건이 정상**(registry-integrity 게이트가
 * 레지스트리에서 0 을 강제). 안전망으로만 남긴다 — 발화하면 상류가 다시 갈라진 것이니 로그를 봐야 한다.
 */
const FALLBACK_CONF = [
  [/^3rd_family:/, 'subfamily'],
  [/^2nd_family:/, 'family'],
  [/^1st_family:/, 'class'],
  [/^subfamily:/, 'subfamily'],
  [/^family:/, 'family'],
  [/^class:/, 'class'],
];
const OPTIMISTIC = new Set(['handbook', 'measured']);
let confDowngraded = 0;
for (const m of all) {
  for (const r of Object.values(m.ranges || {})) {
    if (!r || typeof r !== 'object' || !r.provenance || !OPTIMISTIC.has(r.confidence)) continue;
    const hit = FALLBACK_CONF.find(([re]) => re.test(r.provenance));
    if (!hit) continue;
    r.confidence = hit[1];
    confDowngraded++;
  }
}
if (confDowngraded) console.log(`  신뢰도 하향(provenance 정합): ${confDowngraded} range — 계열 폴백 값에 붙어 있던 handbook/measured 라벨`);

/* 1e) W4-2b (C-1) — 죽은 필드 `spec_type` 제거.
 *
 * R139b 는 값의 성격을 typical/min_spec/max_spec 로 나누려던 설계였는데, 실제로 찍힌 것은
 * **47 range 전부 'typical'** 한 값뿐이고 읽는 코드가 없다(쓰는 곳은 동결된 build-materials 1곳).
 * 정보량이 0 인 필드가 산출물에 실려 나가고 있었다.
 *
 * 값의 성격은 E4 에서 도입한 `basis`('min_spec' = 이 숫자가 곧 규격 하한)가 담당한다 —
 * 그쪽은 실제로 116 range 에 붙고 UI 가 배지로 읽는다. spec_type 은 그 역할을 넘기고 은퇴한다.
 * 레지스트리(SSOT)는 건드리지 않는다 — 산출물에서만 뺀다.
 */
let specTypeDropped = 0;
for (const m of all) {
  for (const r of Object.values(m.ranges || {})) {
    if (r && typeof r === 'object' && 'spec_type' in r) { delete r.spec_type; specTypeDropped++; }
  }
}
if (specTypeDropped) console.log(`  죽은 필드 제거: spec_type ${specTypeDropped} range (정보량 0 — 값 성격은 basis 가 담당)`);

/* 1f) C3 — confidence_tier 재계산 (규칙 SSOT: lib/confidence-tier.mjs).
 *
 * 이 등급은 동결된 build-materials 가 찍는데, **그 시점 이후로 근거가 계속 바뀐다**:
 *   · build-registry 가 `corrections/sources.json` 의 검증된 규격·핸드북 출처를 덧붙이고
 *   · 바로 위 1d 가 provenance 와 안 맞는 표시 신뢰도를 하향한다
 * 둘 다 규칙의 입력(verified 수 · range confidence)이라, 상류에서 찍은 등급은 **낡는다**.
 * 실제로 배포 데이터에서 205 entry 가 자기 규칙과 어긋나 있었다 — 전부 medium 인데
 * 규칙대로면 high(교정이 verified 출처를 2개 이상으로 늘린 경우)로, 증거가 좋아졌는데
 * 등급이 따라오지 않은 쪽이었다.
 *
 * 값을 만드는 게 아니라 **이미 있는 근거로 규칙을 다시 적용**하는 것이므로 여기서 고친다.
 * 상향/하향을 모두 로그로 남긴다 — 하향이 나오면 근거가 줄었다는 뜻이라 사람이 봐야 한다.
 */
const tierMoves = { 상향: 0, 하향: 0 };
const tierDown = [];
for (const m of all) {
  const want = confidenceTierOf(m);
  if (want === m.confidence_tier) continue;
  const dir = TIER_RANK[want] > TIER_RANK[m.confidence_tier] ? '상향' : '하향';
  tierMoves[dir]++;
  if (dir === '하향') tierDown.push(`${m.stable_id || m.id} ${String(m.name).slice(0, 40)}: ${m.confidence_tier}→${want}`);
  m.confidence_tier = want;
}
if (tierMoves.상향 || tierMoves.하향) {
  console.log(`  confidence_tier 재계산: 상향 ${tierMoves.상향} · 하향 ${tierMoves.하향} (교정·정합 반영 후 규칙 재적용)`);
  tierDown.slice(0, 10).forEach((x) => console.log(`    ↓ ${x}`));
}

/* 1g) A14 — 실증 근거를 얻은 물성의 **폴백 출처 라벨 제거**.
 *
 * KIC·피로강도는 값이 없을 때 계열 typical 로 채운다(C1/C2). 그때 "이 숫자가 어디서 왔나" 를
 * 밝히려고 `KIC fallback: <계열>` 같은 출처 줄을 함께 붙인다 — 거기까지는 정직하다.
 *
 * 문제는 그 뒤다. 나중에 datasheet 교정이 들어와 값이 실측/핸드북 근거로 바뀌어도 **폴백 줄은
 * 그대로 남는다.** 그러면 출처가 이미 쓰이지 않는 계열 폴백을 가리켜, 사용자에게 "이 값은
 * 계열 추정" 이라고 잘못 말한다(A12 와 같은 표현 계층 문제 — 값은 맞는데 근거 표시가 어긋남).
 * 실측 기준 321 건이 그 상태였다.
 *
 * 지우는 조건을 **"값이 더 이상 추정이 아닐 때"** 로 좁힌다 — confidence 가 measured/handbook
 * 이면 폴백이 그 값을 설명하지 못하므로 제거. class·derived·family·subfamily 로 남아 있으면
 * 여전히 추정이라 그 줄이 유일한 설명이므로 **건드리지 않는다**.
 * 출처는 material 단위라, 라벨이 가리키는 물성만 보고 판정한다(다른 물성의 폴백은 보존).
 */
const FALLBACK_SRC = [
  { prefix: 'KIC fallback', prop: 'fracture_toughness' },
  { prefix: 'Fatigue fallback', prop: 'fatigue_strength' },
];
const EVIDENCED_CONF = new Set(['measured', 'handbook']);
let fallbackSrcDropped = 0;
for (const m of all) {
  if (!Array.isArray(m.sources) || !m.sources.length) continue;
  const keep = m.sources.filter((s) => {
    const hit = FALLBACK_SRC.find((f) => String(s?.label || '').startsWith(f.prefix));
    if (!hit) return true;
    const r = m.ranges?.[hit.prop];
    return !(r && EVIDENCED_CONF.has(r.confidence));
  });
  if (keep.length && keep.length !== m.sources.length) {
    fallbackSrcDropped += m.sources.length - keep.length;
    m.sources = keep;
  }
}
if (fallbackSrcDropped) console.log(`  폴백 출처 정리: ${fallbackSrcDropped} 줄 (교정으로 실측·핸드북 근거를 얻은 물성 — 계열 폴백이 더는 그 값을 설명하지 않는다)`);

/* 1h) A15 — top-level 평면값을 ranges.typical 에 맞춘다 (같은 재료가 화면마다 다른 숫자로 보이던 원인).
 *
 * 물성은 두 자리에 실려 나간다: 평면값 `m.uts` 와 범위 객체 `m.ranges.uts`. 교정·인용·신뢰도는
 * **ranges 쪽에만** 붙는다(corrections 로더가 거기에 쓴다). 그래서 datasheet 교정이 들어오면
 * ranges 는 새 값이 되고 평면값은 **교정 전 숫자 그대로** 남는다.
 *
 * slim 인덱스는 이미 ranges 를 기준으로 평면값을 찍는다(아래 SLIM_PROPS 루프의 `slim[p] = v`).
 * 파이프라인은 이미 ranges 를 정본으로 선언해 둔 것이다 — 전체 파일과 카테고리 샤드만 그 규칙
 * 밖에 있었다. 앱은 slim 을 먼저 읽고 샤드로 hydrate 하므로 **hydrate 된 뒤에야** 값이 갈라졌다.
 *
 * 측정: 248 (재료×물성) · ranges 쪽 230 이 measured|handbook · 165 는 provenance 문자열 보유.
 *   예) WC-Co 6% Tmax 1700 → 800 · ZTA Tmax 540 → 1500 · AlSi10Mg Cast $8 → $1/kg
 * 산출 단계 보정이라 레지스트리 SSOT 는 불변(1f·1g 와 같은 계층). anomaly 재검출(2) **앞**에
 * 두어, 보정된 값으로 이상치를 찾게 한다.
 */
let flatSynced = 0;
const flatSyncBy = {};
const flatSyncTop = [];
for (const m of all) {
  if (!m.ranges) continue;
  for (const [k, pr] of Object.entries(m.ranges)) {
    const t = pr?.typical;
    if (typeof t !== 'number' || !isFinite(t)) continue;
    const v = m[k];
    if (typeof v !== 'number' || !isFinite(v) || Math.abs(v - t) < 1e-9) continue;
    flatSyncTop.push({ dev: v === 0 ? Infinity : Math.abs(t - v) / Math.abs(v), s: `${m.name} · ${k}: ${v} -> ${t} [${pr.confidence || '-'}]` });
    m[k] = t;
    flatSynced++;
    flatSyncBy[k] = (flatSyncBy[k] || 0) + 1;
  }
}
if (flatSynced) {
  console.log(`  평면값<->ranges 정합: ${flatSynced} (재료x물성) — ${Object.entries(flatSyncBy).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
  for (const e of flatSyncTop.sort((a, b) => b.dev - a.dev).slice(0, 5)) console.log(`    편차 상위: ${e.s}`);
}

/* 1i) A19 — 파생 피로강도 재유도 (규칙 SSOT: lib/fatigue-fallback.mjs).
 *
 * C1 폴백(σf ≈ k·σy)과 R205-R 재유도(σf ≈ r·UTS)는 **모놀리스가 값을 찍는 시점의 σy·UTS** 로 계산된다.
 * 그 뒤 build-registry 4c 의 datasheet 교정이 σy 를 바꾸면 파생값은 옛 입력으로 계산된 채 남는다 — C3 의
 * confidence_tier 와 같은 '재계산 시점' 문제. 실측(2026-09-20): 파생 피로 487 중 금속 43 이 현재 σy 와
 * 불일치. 예) AISI 1040 Q+T 157 (규칙대로면 295) · AA 6101-H111 88 = UTS 95 의 0.93 (물리 상한 0.63 초과).
 * 규칙의 계수는 provenance 문자열에 박혀 있으므로(σf≈0.5·σy) 그것을 읽어 현재 값으로 다시 계산한다 —
 * 새 규칙을 만드는 것이 아니라 같은 규칙을 **바뀐 입력에** 다시 적용하는 것. 값이 datasheet(measured/handbook)
 * 인 entry 는 손대지 않는다. 산출 단계 보정이라 레지스트리 SSOT 불변(1f·1h 와 같은 계층).
 */
let fatRederived = 0;
const fatRederivedTop = [];
for (const m of all) {
  if (m.category !== 'Metal' || !m.ranges) continue;
  const fr = m.ranges.fatigue_strength;
  if (!fr || fr.confidence !== 'derived') continue;
  const parsed = parseDerivedFatigue(fr.provenance);
  if (!parsed) continue;
  const base = parsed.base === 'σy' ? m.ranges.yield_strength?.typical : m.ranges.uts?.typical;
  if (typeof base !== 'number' || !(base > 0)) continue;
  let next;
  if (parsed.base === 'σy') {
    const rule = fatigueRule(m);
    if (!rule || Math.abs(rule.kTyp - parsed.k) > 1e-9) continue;   // 규칙 표와 어긋난 provenance 는 건드리지 않는다(게이트가 보고)
    next = deriveFatigueRange(rule, base);
  } else {
    const nv = Math.round(base * parsed.k);
    next = { ...fr, min: Math.round(nv * 0.85), max: Math.round(nv * 1.15), typical: nv };
  }
  if (Math.abs(next.typical - fr.typical) <= 1) continue;
  fatRederivedTop.push(`${m.name} · σf ${fr.typical} -> ${next.typical} (${parsed.base} ${base})`);
  m.ranges.fatigue_strength = { ...fr, ...next, provenance: `${fr.provenance} · 교정된 ${parsed.base} 로 재유도` };
  m.fatigue_strength = next.typical;
  fatRederived++;
}
if (fatRederived) {
  console.log(`  파생 피로강도 재유도(1i): ${fatRederived} — ${fatRederivedTop.slice(0, 4).join(' · ')}`);
}

/* 1j) AUD N02 (2026-09-22) — 파생 가격 재계산 (규칙 SSOT: lib/derived-prices.mjs).
 *
 * delivered = raw × condition × form × grade · 총원가 = delivered × (1 + machining index) · cm³ = raw × ρ/1000 은 전부 raw 의
 * 파생값인데, datasheet 교정(values.json 의 price_per_kg — 예: 마레이징 AM $8 → $65)이 레지스트리 단계에서 raw 를 바꾸면
 * 납품가·총원가는 옛 raw 로 계산된 채 남는다(1i 의 피로와 같은 '재계산 시점' 문제). 같은 식을 최종 입력에 다시 적용한다.
 * 명시적 견적(meta.delivered_price_override)이 있는 entry 는 곱셈식을 쓰지 않는다. 산출 단계 보정 — 레지스트리 SSOT 불변.
 */
let priceRederived = 0;
const priceRederivedBy = {};
const priceRederivedTop = [];
for (const m of all) {
  const before = m.delivered_price_per_kg;
  const ch = rederivePrices(m);
  if (!ch.length) continue;
  priceRederived++;
  for (const k of ch) priceRederivedBy[k] = (priceRederivedBy[k] || 0) + 1;
  if (ch.includes('delivered_price_per_kg') && priceRederivedTop.length < 4) priceRederivedTop.push(`${m.name} · delivered ${before} -> ${m.delivered_price_per_kg}`);
}
if (priceRederived) {
  console.log(`  파생 가격 재계산(1j): ${priceRederived} entry — ${Object.entries(priceRederivedBy).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
  for (const s of priceRederivedTop) console.log(`    ${s}`);
}

/* 1k) AUD F11 잔여 (2026-09-22) — 출처 링크 접근 상태 스탬프. data/url-health.json(verify:urls 원장)의 status 를 각 출처에
 *   link_status·link_checked 로 붙인다. `verified` 는 내용 검증 축, link_status 는 접근 축 — 둘을 섞지 않는다(감사 F11 완료 조건).
 *   원장에 없는 URL 은 'unchecked'. 산출 단계 스탬프 — 레지스트리 SSOT 불변. */
let linkStamped = 0, linkDead = 0;
try {
  const health = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'url-health.json'), 'utf8'));
  const res = health.results || {};
  for (const m of all) for (const s of m.sources || []) {
    if (!s || !s.url) continue;
    const h = res[s.url];
    s.link_status = h ? h.status : 'unchecked';
    if (h) { s.link_checked = h.checked_at; linkStamped++; if (h.status === 'dead') linkDead++; }
  }
  console.log(`  출처 링크 상태(1k): ${linkStamped} 스탬프 · dead ${linkDead} (원장 ${health.checked_at})`);
} catch { console.log('  출처 링크 상태(1k): data/url-health.json 없음 — unchecked'); }

// 2) anomaly 재검출 — lib/anomalies.mjs 공유 (build-materials 와 동일 로직; 최종 데이터 기준 검출이 canonical)
const anomalies = detectAnomalies(all);
const sevCount = { high: 0, med: 0, low: 0 };
for (const a of anomalies) sevCount[a.severity]++;
const withVerifiedSrc = all.filter(m => (m.sources || []).some(s => s.verified)).length;

// 3) 출력 (build-materials.mjs 4557-4654 와 동일 형식)
fs.mkdirSync(OUT_MATS, { recursive: true });
fs.writeFileSync(path.join(OUT_PUB, 'materials.json'), JSON.stringify(all, null, 2));
/* AUD Q03 (2026-09-22) — 제거 원장 slim 배포: 옛 북마크(?d=<legacy_id>)가 가리키는 entry 가 사라졌을 때 앱이 사유·대체를 안내한다. */
try {
  const led = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'registry', 'removed.json'), 'utf8'));
  const liveIds = new Set(all.map((m) => m.id));
  const slimRemoved = (led.removed || []).filter((r) => !liveIds.has(r.legacy_id)).map((r) => ({
    id: r.legacy_id, sid: r.stable_id, name: r.name, kind: r.removal_kind, reason: r.reason, on: r.removed_on, ref: r.ref,
    to: r.superseded_by_legacy_id && liveIds.has(r.superseded_by_legacy_id) ? r.superseded_by_legacy_id : null, to_name: r.superseded_by_name, how: r.superseded_how,
  }));
  fs.writeFileSync(path.join(OUT_PUB, 'removed-ids.json'), JSON.stringify({ generated: led.generated, count: slimRemoved.length, removed: slimRemoved }));
  console.log(`  제거 원장(Q03): removed-ids.json ${slimRemoved.length} entries`);
} catch (e) { console.log('  제거 원장(Q03): 없음 —', e.message); }

const SLIM_PROPS = ['density', 'yield_strength', 'uts', 'modulus', 'max_service_temp', 'price_per_kg', 'delivered_price_per_kg'];
const EXTRA_TOP = ['elongation', 'hardness', 'fatigue_strength', 'thermal_conductivity', 'thermal_expansion', 'fracture_toughness', 'impact_strength'];
const slimEntries = all.map(m => {
  const slim = { id: m.id, stable_id: m.stable_id, name: m.name, category: m.category, subcategory: m.subcategory, popularity: m.popularity, tier: m.tier, confidence_tier: m.confidence_tier };
  if (m.aliases?.length) slim.aliases = m.aliases;
  if (m.families?.length) slim.families = m.families;
  if (m.related?.length) slim.related = m.related;   // R226c — cross-ref (cast↔wrought, 유사재료 상단 pin)
  if (m.uns?.length) slim.uns = m.uns;               // R226f/축4c — UNS 정규 필드 (외부 연동·검색)
  if (m.manufacturer) slim.manufacturer = m.manufacturer;
  if (m.process) slim.process = m.process;
  /* R08(2026-09-22) — 환경별 내식 필터(passesCorrosionEnv)가 읽는 두 스탬프만 slim 에 싣는다(entry 당 ~20 B).
     샤드가 도착하기 전에도 필터 결과가 갈라지지 않게 — 나머지 profiles 는 상세 전용이라 샤드에 남긴다. */
  if (m.profiles && (m.profiles.corr || m.profiles.htc)) slim.profiles = { ...(m.profiles.corr ? { corr: m.profiles.corr } : {}), ...(m.profiles.htc ? { htc: m.profiles.htc } : {}) };
  if (m.ranges) {
    const slimRanges = {};
    for (const p of SLIM_PROPS) {
      const r = m.ranges[p];
      if (r) { const v = r.typical ?? r.min ?? r.max ?? null; if (typeof v === 'number' && isFinite(v)) { slimRanges[p] = { typical: v, n: r.n || 1 }; slim[p] = v; } }
    }
    if (Object.keys(slimRanges).length) slim.ranges = slimRanges;
  }
  for (const p of EXTRA_TOP) {
    if (m.ranges && m.ranges[p]) { const v = m.ranges[p].typical ?? m.ranges[p].min ?? m.ranges[p].max ?? null; if (typeof v === 'number' && isFinite(v)) slim[p] = v; }
    else if (typeof m[p] === 'number' && isFinite(m[p])) slim[p] = m[p];
  }
  /* AUD-3 D03 (2026-09-22) — 경도는 숫자만으로 비교할 수 없다. 환산표 밖이라 원 스케일(HB)로 남긴 값이 20 개 있고,
     상세만 그 사실을 알고 CSV·검색·차트는 HV 로 취급했다. 스케일을 slim 에 실어 모든 소비자가 같이 읽게 한다. */
  const hsc = m.ranges?.hardness?.scale;
  if (hsc && hsc !== 'HV') slim.hardness_scale = hsc;
  return slim;
});
fs.writeFileSync(path.join(OUT_MATS, 'index.json'), JSON.stringify(slimEntries));
const categoryFiles = {};
/* R08(2026-09-22) — 감사 R08: 샤드 4개(9.2 MB)를 idle 에 전부 선제 로딩. 샤드에서 `story`(레거시 평문)는 `story_v2`
   (sections+timeline, 상세 패널이 우선 렌더)와 같은 내용의 중복이라 v2 가 있는 entry 에선 뺀다 — metal.json 의 12.6%.
   materials.json(전체)은 그대로라 스토리 SSOT 대조 게이트(alloy-stories.test)는 영향 없다. */
let shardStoryDropped = 0;
for (const cat of ['Metal', 'Polymer', 'Ceramic', 'Composite']) {
  const subset = all.filter(m => m.category === cat).map(m => {
    if (m.story && m.story_v2 && m.story_v2.sections) { shardStoryDropped++; const { story: _s, ...rest } = m; return rest; }
    return m;
  });
  const filename = cat.toLowerCase() + '.json';
  fs.writeFileSync(path.join(OUT_MATS, filename), JSON.stringify(subset));
  categoryFiles[cat] = subset.length;
}
if (shardStoryDropped) console.log(`  샤드 story 중복 제거(R08): ${shardStoryDropped} entry (story_v2 보유 — materials.json 은 유지)`);

const buildMeta = {
  buildDate: new Date().toISOString().slice(0, 10),
  buildTime: new Date().toISOString(),
  totalAlloys: all.length,
  byCategory: {
    Metal: all.filter(m => m.category === 'Metal').length,
    Polymer: all.filter(m => m.category === 'Polymer').length,
    Ceramic: all.filter(m => m.category === 'Ceramic').length,
    Composite: all.filter(m => m.category === 'Composite').length,
  },
  anomalies: anomalies.length,
  anomaliesBySeverity: { high: sevCount.high, med: sevCount.med, low: sevCount.low },
  verifiedSrcMaterials: withVerifiedSrc,
  // R226f/축4b — provenance KPI (DATA-STRATEGY 축1: standard+handbook ≥ 50% 목표 추적)
  kicCoverage: (() => { const met = all.filter(m => m.category === 'Metal'); const cov = met.filter(m => m.ranges && m.ranges.fracture_toughness).length; return { covered: cov, total: met.length, pct: Math.round(cov / met.length * 1000) / 10 }; })(),   // A-5 — Guide FAQ 동적화용
  authorityDistribution: (() => { const d = {}; for (const m of all) for (const s of m.sources || []) d[s.authority] = (d[s.authority] || 0) + 1; return d; })(),
  unsMaterials: all.filter(m => m.uns?.length).length,
  source: 'registry (R226 P5)',
};
fs.writeFileSync(path.join(OUT_PUB, 'build-meta.json'), JSON.stringify(buildMeta, null, 2));

console.log(`registry-driven build → ${OUT_PUB}`);
console.log(`  total ${all.length} =`, JSON.stringify(buildMeta.byCategory));
console.log(`  anomalies ${anomalies.length} (high ${sevCount.high} / med ${sevCount.med} / low ${sevCount.low}) · verified-src ${withVerifiedSrc}`);
if (sevCount.high > 0) { console.error(`❌ BUILD GATE: ${sevCount.high} high-severity anomaly`); anomalies.filter(a => a.severity === 'high').slice(0, 10).forEach(a => console.error(`  ${a.name}: ${a.kind} — ${a.detail}`)); process.exit(1); }
