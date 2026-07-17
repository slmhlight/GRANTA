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
import { improveLabel, sourceAuthority } from './lib/source-labels.mjs';   // R226e — 출처 라벨 도출 + 권위 등급
import { extractUNS } from './lib/uns.mjs';   // R226f/축4c — UNS 정규 필드

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
// R226f/축4c — UNS 정규 필드 (별칭·이름·specs 에서 도출; 외부 연동 키)
for (const m of all) { const u = extractUNS(m); if (u.length) m.uns = u; }

// R226h/축4a — A/B-basis 일괄 도출: min-spec 테이블(standard-min-specs.json) 매칭 entry 의
//   typical 이 spec-min ±2% 이면 ranges[p].basis='min_spec' (R139b 필드; "표준 최소 보증값"임을 명시 — presentation).
const MINSPECS = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'standard-min-specs.json'), 'utf8')).specs || []; } catch { return []; } })();
let basisStamped = 0;
for (const m of all) {
  const sp = MINSPECS.find(s => (m.name || '').includes(s.pattern));
  if (!sp) continue;
  for (const [prop, min] of Object.entries(sp.min)) {
    const r = m.ranges?.[prop];
    if (r && typeof r.typical === 'number' && Math.abs(r.typical - min) <= min * 0.02 && !r.basis) { r.basis = 'min_spec'; basisStamped++; }
  }
}

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

// 2) anomaly 재검출 — lib/anomalies.mjs 공유 (build-materials 와 동일 로직; 최종 데이터 기준 검출이 canonical)
const anomalies = detectAnomalies(all);
const sevCount = { high: 0, med: 0, low: 0 };
for (const a of anomalies) sevCount[a.severity]++;
const withVerifiedSrc = all.filter(m => (m.sources || []).some(s => s.verified)).length;

// 3) 출력 (build-materials.mjs 4557-4654 와 동일 형식)
fs.mkdirSync(OUT_MATS, { recursive: true });
fs.writeFileSync(path.join(OUT_PUB, 'materials.json'), JSON.stringify(all, null, 2));

const SLIM_PROPS = ['density', 'yield_strength', 'uts', 'modulus', 'max_service_temp', 'price_per_kg', 'delivered_price_per_kg'];
const EXTRA_TOP = ['elongation', 'hardness', 'fatigue_strength', 'thermal_conductivity', 'thermal_expansion', 'fracture_toughness', 'impact_strength'];
const slimEntries = all.map(m => {
  const slim = { id: m.id, name: m.name, category: m.category, subcategory: m.subcategory, popularity: m.popularity, tier: m.tier, confidence_tier: m.confidence_tier };
  if (m.aliases?.length) slim.aliases = m.aliases;
  if (m.families?.length) slim.families = m.families;
  if (m.related?.length) slim.related = m.related;   // R226c — cross-ref (cast↔wrought, 유사재료 상단 pin)
  if (m.uns?.length) slim.uns = m.uns;               // R226f/축4c — UNS 정규 필드 (외부 연동·검색)
  if (m.manufacturer) slim.manufacturer = m.manufacturer;
  if (m.process) slim.process = m.process;
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
  return slim;
});
fs.writeFileSync(path.join(OUT_MATS, 'index.json'), JSON.stringify(slimEntries));
const categoryFiles = {};
for (const cat of ['Metal', 'Polymer', 'Ceramic', 'Composite']) {
  const subset = all.filter(m => m.category === cat);
  const filename = cat.toLowerCase() + '.json';
  fs.writeFileSync(path.join(OUT_MATS, filename), JSON.stringify(subset));
  categoryFiles[cat] = subset.length;
}

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
