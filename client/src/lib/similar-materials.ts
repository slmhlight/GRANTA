/*
 * R148 — Similar / alternative material recommendation.
 *
 * 입력 material 의 "유사 5종" 추천 — 같은 family/subcategory + property log-distance + popularity 정렬.
 *
 * 알고리즘:
 *   1. 후보 풀: 같은 category (Metal/Polymer/Ceramic/Composite) 만
 *   2. Distance metric: 정규화된 log-space Euclidean distance across 8 핵심 property
 *      (yield, uts, modulus, density, hardness, max_service_temp, fatigue, price)
 *   3. Boost: 같은 family 멤버 (subcategory · families[]) → distance ×0.55
 *   4. Filter: distance < 1.5 + 자기 자신 제외 + **상대 인기도**(R226n: 후보 popularity ≥ 현재−1.0) — 절대 게이트 아님
 *   5. Sort: cross-ref pin → **distance ASC** (R226m: popularity 정렬 폐기 — 물성 가까운 순) → top 10
 *
 * Output: { material, distance, sharedFamily, propertyDiffs }
 * R226m — 인기도(popularity) 대신 순수 물성 거리로 순위. 다른 용도(인사이트) 그룹이라도
 * 물성이 가까우면 상위에 노출 → 대체 후보 탐색이 본질. 그룹 구분은 UI 배지로 명시.
 */
import type { Material } from './materials';

export interface SimilarMaterial {
  material: Material;
  /** Normalized log-distance (0 = identical, 1+ = very different). */
  distance: number;
  /** True if shares family / subcategory with input. */
  sharedFamily: boolean;
  /** R226c — explicit cross-reference (cast↔wrought equivalent). Pinned to top of the list. */
  crossRef?: boolean;
  /** Property-level percent differences for top-3 most-different. */
  diffs: Array<{ prop: string; label: string; delta: number; unit?: string }>;
}

/* R165 — Category-specific property weights for distance calculation.
 *  Metal:    σy/UTS/E/ρ/hardness/T_max/σf/$ — 8 동등 강조 (mechanical 우선).
 *  Polymer:  σy/UTS/E/ρ/max_temp/elongation/$ — hardness/σf 비중 ↓ (Tg/T_max 더 중요).
 *  Ceramic:  hardness/KIC/E/ρ/T_max/CTE — σy/UTS 등 ductile metric 제외.
 *  Composite: σy_0°/UTS_0°/E_0°/ρ/σf/$ — 강도/강성 fiber 방향 기준.
 */
interface PropSpec { key: string; label: string; weight: number; unit?: string; }
const PROPS_METAL: PropSpec[] = [
  { key: 'yield_strength', label: 'σy', weight: 1.5, unit: 'MPa' },
  { key: 'uts', label: 'UTS', weight: 1.2, unit: 'MPa' },
  { key: 'modulus', label: 'E', weight: 1.0, unit: 'GPa' },
  { key: 'density', label: 'ρ', weight: 1.3, unit: 'g/cm³' },
  { key: 'hardness', label: 'HV', weight: 0.6, unit: 'HV' },
  { key: 'max_service_temp', label: 'T_max', weight: 1.1, unit: '°C' },
  { key: 'fatigue_strength', label: 'σf', weight: 0.9, unit: 'MPa' },
  { key: 'price_per_kg', label: '$', weight: 0.7, unit: 'USD/kg' },
];
const PROPS_POLYMER: PropSpec[] = [
  /* Polymer 우선순위: 강성·온도 한계·밀도. σy/UTS 는 단단함만 보지 elongation/충격 도 critical. */
  { key: 'yield_strength', label: 'σy', weight: 1.2, unit: 'MPa' },
  { key: 'uts', label: 'UTS', weight: 1.0, unit: 'MPa' },
  { key: 'modulus', label: 'E', weight: 1.4, unit: 'GPa' },
  { key: 'density', label: 'ρ', weight: 1.0, unit: 'g/cm³' },
  { key: 'max_service_temp', label: 'T_max', weight: 1.6, unit: '°C' },
  { key: 'elongation', label: 'ε', weight: 0.8, unit: '%' },
  { key: 'price_per_kg', label: '$', weight: 0.8, unit: 'USD/kg' },
];
const PROPS_CERAMIC: PropSpec[] = [
  /* Ceramic 우선순위: 경도·인성·온도. σy/UTS 는 brittle 이라 의미 약함 (compressive strength 만 의미). */
  { key: 'hardness', label: 'HV', weight: 1.6, unit: 'HV' },
  { key: 'fracture_toughness', label: 'KIC', weight: 1.5, unit: 'MPa·√m' },
  { key: 'modulus', label: 'E', weight: 1.2, unit: 'GPa' },
  { key: 'density', label: 'ρ', weight: 1.0, unit: 'g/cm³' },
  { key: 'max_service_temp', label: 'T_max', weight: 1.5, unit: '°C' },
  { key: 'thermal_expansion', label: 'α', weight: 0.7, unit: '10⁻⁶/K' },
  { key: 'price_per_kg', label: '$', weight: 0.5, unit: 'USD/kg' },
];
const PROPS_COMPOSITE: PropSpec[] = [
  /* Composite 우선순위: 비강도·비강성·fiber 방향 piece. 0° UD value 기준. */
  { key: 'yield_strength', label: 'σy', weight: 1.3, unit: 'MPa' },
  { key: 'uts', label: 'UTS', weight: 1.4, unit: 'MPa' },
  { key: 'modulus', label: 'E', weight: 1.5, unit: 'GPa' },
  { key: 'density', label: 'ρ', weight: 1.5, unit: 'g/cm³' },
  { key: 'fatigue_strength', label: 'σf', weight: 0.8, unit: 'MPa' },
  { key: 'price_per_kg', label: '$', weight: 0.7, unit: 'USD/kg' },
];
function propsFor(category: string | undefined): PropSpec[] {
  switch (category) {
    case 'Polymer': return PROPS_POLYMER;
    case 'Ceramic': return PROPS_CERAMIC;
    case 'Composite': return PROPS_COMPOSITE;
    default: return PROPS_METAL;
  }
}
/* Union of all property keys for backward-compat in `computeNorms`. */
const ALL_PROP_KEYS = Array.from(new Set([
  ...PROPS_METAL, ...PROPS_POLYMER, ...PROPS_CERAMIC, ...PROPS_COMPOSITE,
].map(p => p.key)));

/* R157 — `as unknown as` 우회 marker 제거: Material.ranges + flat property 접근을 명시적으로. */
function propValue(m: Material, key: string): number | null {
  const r = m.ranges?.[key];
  if (r) {
    if (typeof r.typical === 'number') return r.typical;
    if (typeof r.min === 'number' && typeof r.max === 'number') return (r.min + r.max) / 2;
  }
  // Fallback to flat property (typed via index signature)
  const v = (m as Material & Record<string, unknown>)[key];
  return typeof v === 'number' ? v : null;
}

/** Pre-compute property ranges across the whole material set for normalization. */
function computeNorms(materials: Material[]): Record<string, { logMin: number; logMax: number }> {
  const norms: Record<string, { logMin: number; logMax: number }> = {};
  for (const key of ALL_PROP_KEYS) {
    let lmin = Infinity, lmax = -Infinity;
    for (const m of materials) {
      const v = propValue(m, key);
      if (v != null && v > 0) {
        const lv = Math.log10(v);
        if (lv < lmin) lmin = lv;
        if (lv > lmax) lmax = lv;
      }
    }
    if (lmin === Infinity) { lmin = 0; lmax = 1; }
    if (lmax - lmin < 0.1) lmax = lmin + 1; // avoid divide-by-zero
    norms[key] = { logMin: lmin, logMax: lmax };
  }
  return norms;
}

/** Check whether two materials share family / subcategory. */
function sharesFamily(a: Material, b: Material): boolean {
  if (a.subcategory && b.subcategory && a.subcategory === b.subcategory) return true;
  const af = (a.families || []) as string[];
  const bf = (b.families || []) as string[];
  if (af.length && bf.length) {
    for (const f of af) if (bf.includes(f)) return true;
  }
  return false;
}

/** Compute log-normalized weighted Euclidean distance between two materials. */
function distance(a: Material, b: Material, norms: Record<string, { logMin: number; logMax: number }>): number {
  /* R165 — Category-specific weights. Target 의 category 로 PROPS 선택. */
  const props = propsFor(a.category);
  let sumSq = 0, totalW = 0, missing = 0;
  for (const { key, weight } of props) {
    const va = propValue(a, key), vb = propValue(b, key);
    if (va == null || vb == null || va <= 0 || vb <= 0) {
      missing++;
      continue;
    }
    const norm = norms[key];
    const range = norm.logMax - norm.logMin;
    const da = (Math.log10(va) - norm.logMin) / range;
    const db = (Math.log10(vb) - norm.logMin) / range;
    const diff = da - db;
    sumSq += weight * diff * diff;
    totalW += weight;
  }
  if (totalW === 0) return Infinity;
  /* Penalize too much missing data. Threshold scales with property count (metal 8 → 4, polymer 7 → 4, ceramic 7 → 4). */
  const missingThreshold = Math.ceil(props.length / 2);
  const missingPenalty = missing > missingThreshold ? 0.5 : 0;
  return Math.sqrt(sumSq / totalW) + missingPenalty;
}

/** Compute property-level percent diff for display ("σy: -25%"). */
function diffsFor(a: Material, b: Material): Array<{ prop: string; label: string; delta: number; unit?: string }> {
  const props = propsFor(a.category);
  const out: Array<{ prop: string; label: string; delta: number; abs: number; unit?: string }> = [];
  for (const { key, label, unit } of props) {
    const va = propValue(a, key), vb = propValue(b, key);
    if (va == null || vb == null || va <= 0) continue;
    const pct = ((vb - va) / va) * 100;
    out.push({ prop: key, label, delta: Math.round(pct), abs: Math.abs(pct), unit });
  }
  return out.sort((x, y) => y.abs - x.abs).slice(0, 3).map(({ prop, label, delta, unit }) => ({ prop, label, delta, unit }));
}

/**
 * Find top-N similar materials.
 * @param target - 입력 material
 * @param all - 전체 material pool
 * @param opts - { topN: 10, maxDistance: 1.5, minPopularity: 0, maxPopularityDrop: 1.0, sameCategoryOnly: true }
 * R226n — maxPopularityDrop: 순위는 물성 거리로만(popularity 무관), 단 후보 자격은 **상대 인기도 필터** —
 *   후보 popularity 가 (현재 재료 popularity − maxPopularityDrop) 미만이면 배제. 절대 임계 아님.
 *   즉 인기 재료를 볼 때 훨씬 덜 쓰이는 재료가 추천되는 것을 막되(±1.0 창), 자체가 니치인 재료는 관대.
 */
export function findSimilar(
  target: Material,
  all: Material[],
  opts: { topN?: number; maxDistance?: number; minPopularity?: number; maxPopularityDrop?: number | null; sameCategoryOnly?: boolean } = {},
): SimilarMaterial[] {
  const { topN = 10, maxDistance = 1.5, minPopularity = 0, maxPopularityDrop = 1.0, sameCategoryOnly = true } = opts;
  const pool = sameCategoryOnly ? all.filter(m => m.category === target.category) : all;
  const norms = computeNorms(pool);
  const targetPop = typeof target.popularity === 'number' ? target.popularity : null;

  /* R226c — 명시적 cross-ref (cast↔wrought 등). related[] 양방향(target→m, m→target), base-name 정규화 매칭.
     cross-ref 는 popularity·distance 필터를 우회하고 목록 최상단에 pin. */
  const relOf = (m: Material): string[] => ((m as Material & { related?: string[] }).related) || [];
  const normKey = (s: string): string => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetKeys = new Set<string>([normKey(baseName(target.name)), ...relOf(target).map(normKey)]);
  const isCrossRef = (m: Material): boolean => {
    const mb = normKey(baseName(m.name));
    if (relOf(target).some(r => normKey(r) === mb)) return true;        // target → m
    if (relOf(m).some(r => targetKeys.has(normKey(r)))) return true;    // m → target
    return false;
  };

  const candidates: SimilarMaterial[] = [];
  for (const m of pool) {
    if (m.id === target.id) continue;
    // Strip variant suffix to avoid suggesting "Inconel 718 — Annealed" for "Inconel 718 — Aged"
    const baseTarget = baseName(target.name);
    const baseM = baseName(m.name);
    if (baseTarget && baseM && baseTarget === baseM) continue;
    const crossRef = isCrossRef(m);
    if (!crossRef) {
      if (typeof m.popularity === 'number' && m.popularity < minPopularity) continue; // 절대 하한 (기본 0 = off, 명시 전달 시만)
      // R226n — 상대 인기도 필터: 현재 재료보다 maxPopularityDrop 이상 덜 쓰이는 재료는 배제.
      if (targetPop != null && maxPopularityDrop != null && typeof m.popularity === 'number' && m.popularity < targetPop - maxPopularityDrop) continue;
    }
    const shares = sharesFamily(target, m);
    let d = distance(target, m, norms);
    if (shares) d *= 0.55; // boost same family
    if (!crossRef && d > maxDistance) continue;
    candidates.push({ material: m, distance: crossRef ? -1 : d, sharedFamily: shares, crossRef, diffs: diffsFor(target, m) });
  }

  // Sort: cross-ref pinned first → distance ASC (R226m — 물성 가까운 순; popularity 정렬 폐기)
  candidates.sort((a, b) => {
    if (!!a.crossRef !== !!b.crossRef) return a.crossRef ? -1 : 1;
    if (Math.abs(a.distance - b.distance) > 1e-6) return a.distance - b.distance;
    // 동거리 tiebreak 만 popularity (표시 안정성)
    const pa = typeof a.material.popularity === 'number' ? a.material.popularity : 0;
    const pb = typeof b.material.popularity === 'number' ? b.material.popularity : 0;
    return pb - pa;
  });

  // De-duplicate by base-name (avoid 5× variant of same alloy)
  const seenBase = new Set<string>();
  const out: SimilarMaterial[] = [];
  for (const c of candidates) {
    const b = baseName(c.material.name);
    if (b && seenBase.has(b)) continue;
    if (b) seenBase.add(b);
    out.push(c);
    if (out.length >= topN) break;
  }
  return out;
}

function baseName(name: string): string {
  if (!name) return '';
  return name.split(' — ')[0].split(' (')[0].trim();
}
