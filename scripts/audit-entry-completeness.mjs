/*
 * H6 — 엔트리 완전성 감사 (3원칙 정량화). 영구 도구.
 *   원칙 1: 모든 재료 엔트리에 대한 완벽한 설명 (서술·물성·조건·공정 가이드)
 *   원칙 2: 연관 지식 풍부한 연결 (스토리·타임라인·위키 엔티티·계열 페이지)
 *   원칙 3: 출처 명시 신뢰성 (verified·authority·per-property provenance·파생값 비율)
 *
 * 실행: node scripts/audit-entry-completeness.mjs  →  docs/audits/entry-completeness.md
 * 입력: client/public/materials.json (build:data 산출) + client/public/wiki-meta.json(있으면)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const mats = JSON.parse(fs.readFileSync(path.join(ROOT, 'client/public/materials.json'), 'utf8'));

// wiki 엔티티 (스토리 기반 242) — 백링크 가능 여부
let wikiIds = new Set();
try {
  const wi = JSON.parse(fs.readFileSync(path.join(ROOT, 'client/public/wiki-index.json'), 'utf8'));
  for (const e of wi.entities || []) if (e.rep_id) wikiIds.add(e.rep_id);
} catch { /* build:wiki 미실행 시 빈 셋 */ }

const CORE_PROPS = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];
const EXT_PROPS = ['fracture_toughness', 'fatigue_strength', 'max_service_temp', 'melting_point', 'thermal_expansion', 'impact_strength'];

// ── per-entry 채점 ──────────────────────────────────────────────
// 각 차원 0/1 (일부 부분점수). 카테고리별 기대치 차등(폴리머에 HT 라벨 요구 안 함 등).
function scoreEntry(m) {
  const isMetal = m.category === 'Metal';
  const pop = m.popularity ?? 0;
  const d = {}; // dimension → {ok, note}

  // ── P1 설명 ──
  d.composition = { ok: m.composition && Object.keys(m.composition).length >= (isMetal ? 2 : 1) };
  const coreN = CORE_PROPS.filter((p) => m.ranges?.[p]?.typical != null || typeof m[p] === 'number').length;
  d.core_props = { ok: coreN >= 6, note: `${coreN}/7` };
  const extN = EXT_PROPS.filter((p) => m.ranges?.[p]?.typical != null || typeof m[p] === 'number').length;
  d.ext_props = { ok: extN >= 3, note: `${extN}/6` };
  d.ht_label = { ok: !isMetal || !!(m.heat_treatment && m.heat_treatment.trim()) };
  d.industry_note = { ok: !!m.industry_note };
  d.applications = { ok: !!(m.meta && (m.meta.applications || m.meta.reference)) };
  d.condition_points = { ok: !!(m.points && m.points.length >= 1) };
  d.aliases = { ok: !isMetal || (m.aliases && m.aliases.length >= 1) };
  d.uns = { ok: !isMetal || !!(m.uns && m.uns.length) }; // 금속만 (비 UNS 체계 합금은 갭으로 잡히나 분포로 판단)

  // 공정 가이드 스탬프 — 카테고리별 기대
  const p = m.profiles || {};
  d.prof_mach = { ok: m.category === 'Ceramic' ? true : !!p.mach };
  d.prof_ht = { ok: !isMetal || !!(p.ht || p.htg || p.htc) };
  d.prof_weld = { ok: !isMetal || !!(p.wg || p.weld) };
  d.prof_insight = { ok: !!p.insight };
  d.prof_coating = { ok: m.category === 'Ceramic' ? true : !!p.cg };

  // 고온 곡선 — 고온 지향 재료(내열 계열 + max_service_temp≥500 금속)에만 기대
  const wantsElev = isMetal && (m.max_service_temp >= 500 || /superalloy|inconel|hastelloy|creep|9cr|refract/i.test(m.subcategory + ' ' + m.name));
  d.elevated_curve = { ok: !wantsElev || !!(m.elevated_temp && m.elevated_temp.length), expected: wantsElev };

  // ── P2 지식 연결 ──
  d.story = { ok: !!m.story };
  d.story_v2 = { ok: !!(m.story_v2 && m.story_v2.sections) };
  d.timeline = { ok: !!(m.story_v2 && m.story_v2.timeline && m.story_v2.timeline.length) };
  d.wiki_entity = { ok: wikiIds.size === 0 ? true : wikiIds.has(m.id), soft: true }; // 대표 entry 만 엔티티 — soft
  d.story_refs = { ok: !!(m.story_refs && m.story_refs.length >= 2) };

  // ── P3 출처 ──
  const srcs = m.sources || [];
  d.src_exists = { ok: srcs.length >= 1, note: `${srcs.length}` };
  const verifiedN = srcs.filter((s) => s.verified).length;
  d.src_verified = { ok: verifiedN >= 1, note: `${verifiedN}/${srcs.length}` };
  const best = srcs.reduce((acc, s) => {
    const rank = { standard: 4, handbook: 3, manufacturer: 2, aggregator: 1, other: 0 }[s.authority] ?? 0;
    return Math.max(acc, rank);
  }, -1);
  d.src_authority = { ok: best >= 2, note: ['none', 'other', 'aggregator', 'manufacturer', 'handbook', 'standard'][best + 1] };
  d.src_not_agg_only = { ok: !(srcs.length > 0 && srcs.every((s) => s.authority === 'aggregator' || s.authority === 'other')) };
  // per-property provenance (ranges[].provenance)
  const provN = Object.values(m.ranges || {}).filter((r) => r && r.provenance).length;
  d.prop_provenance = { ok: provN >= 1, note: `${provN}` , soft: true };
  // 파생값 의존 (fatigue_estimated / KIC class) — 인기재는 실측 기대
  d.no_derived_on_popular = { ok: !(pop >= 4 && m.fatigue_estimated), soft: true };
  // 고온곡선 출처
  d.elev_src = { ok: !(m.elevated_temp && m.elevated_temp.length) || !!m.elevated_temp_src, soft: true };

  return d;
}

// ── 집계 ──────────────────────────────────────────────
const dims = {};
const perEntry = [];
for (const m of mats) {
  const d = scoreEntry(m);
  let score = 0, maxScore = 0;
  for (const [k, v] of Object.entries(d)) {
    dims[k] = dims[k] || { pass: 0, fail: 0, failList: [] };
    const w = v.soft ? 0.5 : 1;
    maxScore += w;
    if (v.ok) { dims[k].pass++; score += w; }
    else { dims[k].fail++; if (dims[k].failList.length < 12) dims[k].failList.push(m.name); }
  }
  perEntry.push({ id: m.id, name: m.name, cat: m.category, pop: m.popularity ?? 0, pct: Math.round((score / maxScore) * 100) });
}

perEntry.sort((a, b) => a.pct - b.pct || b.pop - a.pop);
const avg = Math.round(perEntry.reduce((s, e) => s + e.pct, 0) / perEntry.length);
const byCat = {};
for (const e of perEntry) { (byCat[e.cat] = byCat[e.cat] || []).push(e.pct); }

// 인기-가중 최악 (pop≥3 인데 낮은 점수 = 사용자 체감 최대)
const popularWorst = perEntry.filter((e) => e.pop >= 3).slice(0, 40);

// ── 리포트 ──────────────────────────────────────────────
const L = [];
L.push('# 엔트리 완전성 감사 (3원칙 정량) — 자동 생성: scripts/audit-entry-completeness.mjs');
L.push('');
L.push(`빌드: ${new Date().toISOString().slice(0, 10)} · ${mats.length} entries · 평균 완전성 **${avg}%**`);
L.push('');
L.push('| 카테고리 | 평균 | 최저 |');
L.push('|---|---|---|');
for (const [c, arr] of Object.entries(byCat)) L.push(`| ${c} | ${Math.round(arr.reduce((s, x) => s + x, 0) / arr.length)}% | ${Math.min(...arr)}% |`);
L.push('');
L.push('## 차원별 커버리지 (soft=0.5 가중)');
L.push('');
L.push('| 차원 | 통과 | 실패 | 실패율 | 실패 예시 |');
L.push('|---|---|---|---|---|');
for (const [k, v] of Object.entries(dims).sort((a, b) => b[1].fail - a[1].fail)) {
  const rate = Math.round((v.fail / mats.length) * 100);
  L.push(`| ${k} | ${v.pass} | **${v.fail}** | ${rate}% | ${v.failList.slice(0, 4).join(' · ').slice(0, 110)} |`);
}
L.push('');
L.push('## 인기재(pop≥3) 최악 40 — 사용자 체감 우선 보수 대상');
L.push('');
L.push('| 점수 | pop | 이름 |');
L.push('|---|---|---|');
for (const e of popularWorst) L.push(`| ${e.pct}% | ${e.pop} | ${e.name} (${e.id}) |`);
L.push('');
L.push('## 전체 최저 30');
L.push('');
L.push('| 점수 | cat | 이름 |');
L.push('|---|---|---|');
for (const e of perEntry.slice(0, 30)) L.push(`| ${e.pct}% | ${e.cat} | ${e.name} (${e.id}) |`);
L.push('');

const out = path.join(ROOT, 'docs/audits/entry-completeness.md');
fs.writeFileSync(out, L.join('\n') + '\n', 'utf8');
console.log(`완료 → ${out}`);
console.log(`평균 ${avg}% · 차원 ${Object.keys(dims).length}종`);
// 콘솔 요약 (상위 실패 차원)
for (const [k, v] of Object.entries(dims).sort((a, b) => b[1].fail - a[1].fail).slice(0, 12)) {
  console.log(`  ${k}: fail ${v.fail} (${Math.round((v.fail / mats.length) * 100)}%)`);
}
