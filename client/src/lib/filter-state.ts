/*
 * R157b — useMaterialFilter 의 FilterState interface + DEFAULT_FILTERS 분리.
 * 다른 모듈 (Home/ScenarioDialog/etc) 이 hook 자체를 import 하지 않고도 type/default 만 가져갈 수 있도록 분리.
 *
 * Hook 자체 (filter / sort / narrowedRanges 로직) 는 useMaterialFilter.ts 유지.
 */

/** Filter state 모양. 각 numeric property 는 `[min, max] | null` (null = unfiltered). */
export interface FilterState {
  search: string;
  categories: string[];
  subcategories: string[];
  processes: string[];
  manufacturers: string[];
  compositions: string[];
  compositionRanges: Record<string, [number, number] | null>; // e.g., { Fe: [10, 50], Al: [5, 20] }
  densityRange: [number, number] | null;
  yieldStrengthRange: [number, number] | null;
  utsRange: [number, number] | null;
  elongationRange: [number, number] | null;
  modulusRange: [number, number] | null;
  hardnessRange: [number, number] | null;
  thermalConductivityRange: [number, number] | null;
  electricalConductivityRange: [number, number] | null;
  maxServiceTempRange: [number, number] | null;
  fatigueStrengthRange: [number, number] | null;
  impactStrengthRange: [number, number] | null;
  pricePerKgRange: [number, number] | null;
  thermalExpansionRange: [number, number] | null;
  poissonRatioRange: [number, number] | null;
  specificHeatRange: [number, number] | null;
  meltingPointRange: [number, number] | null;
  /** R30 — 모든 numeric property 필터 일관성 차원 추가 항목. */
  popularityRange: [number, number] | null;
  fractureToughnessRange: [number, number] | null;
  totalCostEstimateRange: [number, number] | null;
  minWallThicknessRange: [number, number] | null;
  surfaceFinishTypicalRange: [number, number] | null;
  machiningCostFactorRange: [number, number] | null;
  htCostFactorRange: [number, number] | null;
  corrosion: string[];
  machinability: string[];
  weldability: string[];
  /** E15l: 환경별 내식 최소 등급 (합금 보정 적용 후 verdict 기준) — 예: { '해수': 'good', '강산': 'excellent' }. */
  corrosionEnvMin: Record<string, 'good' | 'excellent'>;
  /** E15l: 고온 데이터(elevated_temp 또는 creep_rupture 곡선) 보유 재료만. */
  hasElevatedData?: boolean;
  /** R16: RoHS 통과 재료만 표시 (납·카드뮴·수은 한계 통과). null/undefined 데이터는 포함. */
  rohsOnly?: boolean;
  /** R38e: 열처리 다중 선택 (As-built/Annealed/Solution/Aged/Q&T/HIP/Normalized/Stress-relieved/...) */
  heatTreatments: string[];
  /** R144b: multi-constraint DSL (e.g., "σy>500 ρ<5 spec:AMS5662"). search 와 독립. */
  query?: string;
  /** R144c: 표준 spec 으로 필터 (e.g., ['AMS 5662', 'UNS S17400']). */
  specs?: string[];
  /**
   * E3 (H6 W4-2): 출처 권위 등급 필터. **선택한 등급의 출처를 가진** 재료를 남긴다(OR).
   * 비어 있으면 전량 노출 — 원칙 8(구분 표시만, 저신뢰 은폐 금지)에 따라 기본값은 '전체'다.
   */
  authorities: string[];
}

/* 필드 **종류별 키 집합**. 필터를 키로 순회하는 코드(URL 인·디코딩, 두 사례의 교집합)가
   예전에는 `Record<string, …>` 와 `as any` 로 돌아서, 오타든 새 필드 누락이든 아무 말이
   없었다. 타입을 FilterState 에서 뽑아 두면 그 순회들이 컴파일 검사를 받는다. */
type KeysOfType<T> = { [K in keyof FilterState]-?: NonNullable<FilterState[K]> extends T ? K : never }[keyof FilterState];
export type FilterRangeKey = KeysOfType<[number, number]>;
export type FilterListKey = KeysOfType<string[]>;

export const DEFAULT_FILTERS: FilterState = {
  authorities: [],
  search: '',
  categories: [],
  subcategories: [],
  processes: [],
  manufacturers: [],
  compositions: [],
  compositionRanges: {},
  densityRange: null,
  yieldStrengthRange: null,
  utsRange: null,
  elongationRange: null,
  modulusRange: null,
  hardnessRange: null,
  thermalConductivityRange: null,
  electricalConductivityRange: null,
  maxServiceTempRange: null,
  fatigueStrengthRange: null,
  impactStrengthRange: null,
  pricePerKgRange: null,
  thermalExpansionRange: null,
  poissonRatioRange: null,
  specificHeatRange: null,
  meltingPointRange: null,
  // R35a — 인기도는 산업 사용 빈도 기준. 기본 4-5 로 좁혀서 검증된 알로이 위주로 보여줌.
  popularityRange: [4, 5],
  fractureToughnessRange: null,
  totalCostEstimateRange: null,
  minWallThicknessRange: null,
  surfaceFinishTypicalRange: null,
  machiningCostFactorRange: null,
  htCostFactorRange: null,
  corrosion: [],
  machinability: [],
  weldability: [],
  corrosionEnvMin: {},
  hasElevatedData: false,
  rohsOnly: false,
  heatTreatments: [],
  query: '',
  specs: [],
};

/*
 * R08(2026-09-22) — "이 필터/정렬은 slim 인덱스만으로 답할 수 있는가".
 * slim(index.json)에는 이름·계열·공정·인기도와 14 물성 대표값·profiles{corr,htc}만 있다. 조성·열처리 라벨·정성 등급·
 * 출처 권위·고온 곡선·비용 지수·전기/열 물성 등은 카테고리 샤드에만 있으므로, 그런 필터가 켜지면 샤드가 도착하기 전까지
 * 결과가 갈린다(빈 결과처럼 보인다). Home 은 이 판정이 true 가 되는 순간 ensureAll() 로 전 샤드를 즉시 요청한다 —
 * 선제 로딩을 단계별·회선 인지로 늦춘 대가를 여기서 갚는다.
 */
const SLIM_RANGE_KEYS: ReadonlySet<string> = new Set<FilterRangeKey>([
  'densityRange', 'yieldStrengthRange', 'utsRange', 'elongationRange', 'modulusRange', 'hardnessRange',
  'thermalConductivityRange', 'maxServiceTempRange', 'fatigueStrengthRange', 'pricePerKgRange',
  'thermalExpansionRange', 'fractureToughnessRange', 'impactStrengthRange', 'popularityRange',
]);
const SLIM_SORT_KEYS: ReadonlySet<string> = new Set([
  'name', 'category', 'subcategory', 'manufacturer', 'process', 'tier', 'popularity', 'confidence_tier',
  'density', 'yield_strength', 'uts', 'modulus', 'max_service_temp', 'price_per_kg', 'delivered_price_per_kg',
  'elongation', 'hardness', 'fatigue_strength', 'thermal_conductivity', 'thermal_expansion', 'fracture_toughness', 'impact_strength',
]);
export function filterNeedsFullData(f: FilterState, sortKey?: string): boolean {
  if (sortKey && !SLIM_SORT_KEYS.has(sortKey)) return true;
  if (f.compositions.length || Object.values(f.compositionRanges).some(Boolean)) return true;
  if (f.corrosion.length || f.machinability.length || f.weldability.length) return true;
  if (f.hasElevatedData || f.rohsOnly || f.heatTreatments.length || (f.specs && f.specs.length) || f.authorities.length) return true;
  if (f.query && /\b(spec|comp|ht|heat|weld|corr|mach)\s*[:=]/i.test(f.query)) return true;
  for (const [k, v] of Object.entries(f)) {
    if (k.endsWith('Range') && v && !SLIM_RANGE_KEYS.has(k)) return true;
  }
  return false;
}
