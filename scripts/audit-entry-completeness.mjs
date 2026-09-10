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
const wikiKeys = new Set();   // W4-8 — 합금(story_key) 단위 엔티티 보유 집합
try {
  const wi = JSON.parse(fs.readFileSync(path.join(ROOT, 'client/public/wiki-index.json'), 'utf8'));
  for (const e of wi.entities || []) { if (e.rep_id) wikiIds.add(e.rep_id); if (e.story_key) wikiKeys.add(e.story_key); }
} catch { /* build:wiki 미실행 시 빈 셋 */ }

/*
 * W4-8 — 기대 물성을 **카테고리별로** 정의한다.
 *
 * 이전에는 7개 core / 6개 ext 를 전 카테고리에 똑같이 요구했다. 그러면 **부적용을 공백으로 센다**:
 *   · 세라믹 연신율 — 취성 재료라 파단 연신율이 애초에 인용 대상이 아니다 (실측 보유 0%)
 *   · 폴리머·복합재 경도 — HV 가 아니라 Shore 척도를 쓴다. 다른 축이다 (24% · 6%)
 *   · 복합재 융점 — 적층재는 녹지 않고 기지가 분해된다 (0%)
 *   · 복합재·폴리머 KIC — 라미네이트·플라스틱 datasheet 가 인용하지 않는다 (0% · 2%)
 *
 * 기준을 "현재 커버리지" 에 맞추면 순환논리가 되므로, **그 카테고리 datasheet 가 실제로 인용하는
 * 물성 집합**으로 정의한다. 임계는 카테고리 무관하게 같은 규칙을 쓴다 —
 * core 는 "하나 빼고 전부", ext 는 "절반 이상".
 */
const CORE_BY_CAT = {
  Metal: ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'],
  Polymer: ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'thermal_conductivity'],           // 경도 제외(Shore)
  Ceramic: ['density', 'yield_strength', 'uts', 'modulus', 'hardness', 'thermal_conductivity'],             // 연신율 제외(취성)
  Composite: ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'thermal_conductivity'],         // 경도 제외
};
const EXT_BY_CAT = {
  Metal: ['fracture_toughness', 'fatigue_strength', 'max_service_temp', 'melting_point', 'thermal_expansion', 'impact_strength'],
  Polymer: ['max_service_temp', 'thermal_expansion'],                                                        // KIC·피로·충격 미인용
  Ceramic: ['fracture_toughness', 'fatigue_strength', 'max_service_temp', 'thermal_expansion'],              // 융점 제외(승화·분해)
  Composite: ['fatigue_strength', 'max_service_temp', 'thermal_expansion'],                                  // 융점·KIC 제외
};
const CORE_PROPS = CORE_BY_CAT.Metal;   // 하위호환 (리포트 헤더 등)
const EXT_PROPS = EXT_BY_CAT.Metal;

// ── per-entry 채점 ──────────────────────────────────────────────
// 각 차원 0/1 (일부 부분점수). 카테고리별 기대치 차등(폴리머에 HT 라벨 요구 안 함 등).
function scoreEntry(m) {
  const isMetal = m.category === 'Metal';
  const pop = m.popularity ?? 0;
  const d = {}; // dimension → {ok, note}

  // ── P1 설명 ──
  d.composition = { ok: m.composition && Object.keys(m.composition).length >= (isMetal ? 2 : 1) };
  const has = (p) => m.ranges?.[p]?.typical != null || typeof m[p] === 'number';
  const coreSet = CORE_BY_CAT[m.category] || CORE_BY_CAT.Metal;
  const coreN = coreSet.filter(has).length;
  d.core_props = { ok: coreN >= coreSet.length - 1, note: `${coreN}/${coreSet.length}` };   // 하나 빼고 전부
  const extSet = EXT_BY_CAT[m.category] || EXT_BY_CAT.Metal;
  const extN = extSet.filter(has).length;
  d.ext_props = { ok: extN >= Math.ceil(extSet.length / 2), note: `${extN}/${extSet.length}` };   // 절반 이상
  d.ht_label = { ok: !isMetal || !!(m.heat_treatment && m.heat_treatment.trim()) };
  d.industry_note = { ok: !!m.industry_note };
  d.applications = { ok: !!(m.meta && (m.meta.applications || m.meta.reference)) };
  /* points[] 는 **조건별 값** 행이다. 세라믹·복합재는 템퍼/열처리 조건 자체가 없어(실측 0/39 · 2/34)
     요구하면 부적용을 공백으로 세게 된다 — 금속·폴리머에만 기대한다. */
  const wantsPoints = isMetal || m.category === 'Polymer';
  d.condition_points = { ok: !wantsPoints || !!(m.points && m.points.length >= 1), expected: wantsPoints };
  d.aliases = { ok: !isMetal || (m.aliases && m.aliases.length >= 1) };
  /* UNS 는 **정보성**이다(W4-8). 금속 446/930 만 보유하는데, 나머지는 우리 데이터가 빠진 게 아니라
     JIS/KS/DIN 지정 합금·AM 벤더 합금처럼 **UNS 번호가 존재하지 않는** 경우가 대부분이다.
     하드 실패로 세면 미국 번호체계의 커버리지를 우리 완성도로 오독하게 된다 → soft. */
  d.uns = { ok: !isMetal || !!(m.uns && m.uns.length), soft: true };

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
  /* W4-8 — 질문을 바로잡았다.
     이전: "이 entry 가 위키 엔티티의 **대표**인가" → 245/1138(22%) 만 통과하고 893 이 '실패' 로 잡혔다.
     엔티티는 **합금 단위**(story_key)로 하나씩 만들어지므로 조건 entry 각각이 대표일 수는 없다 —
     설계상 구조를 완성도 공백으로 센 것이다.
     지금: "이 재료의 합금에 위키 엔티티가 있는가"(상호참조로 도달 가능한가). 실측 1136/1138.
     남은 2(EPDM·FKM)는 진짜 공백이고, 새 재료가 엔티티 없이 들어오면 여기서 잡힌다. */
  d.wiki_entity = { ok: wikiKeys.size === 0 ? true : !!(m.story_key && wikiKeys.has(m.story_key)) };
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
