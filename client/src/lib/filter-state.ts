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
  /** R16: RoHS 통과 재료만 표시 (납·카드뮴·수은 한계 통과). null/undefined 데이터는 포함. */
  rohsOnly?: boolean;
  /** R38e: 열처리 다중 선택 (As-built/Annealed/Solution/Aged/Q&T/HIP/Normalized/Stress-relieved/...) */
  heatTreatments: string[];
  /** R133b: low confidence entry (verified=0 + handbook 적은) 숨기기. default ON — honest data 표시. */
  hideLowConfidence?: boolean;
  /** R144b: multi-constraint DSL (e.g., "σy>500 ρ<5 spec:AMS5662"). search 와 독립. */
  query?: string;
  /** R144c: 표준 spec 으로 필터 (e.g., ['AMS 5662', 'UNS S17400']). */
  specs?: string[];
}

export const DEFAULT_FILTERS: FilterState = {
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
  rohsOnly: false,
  heatTreatments: [],
  // R133b — default ON: confidence_tier='low' entry (~131건, 10%) 숨김. UI 토글로 노출 가능.
  hideLowConfidence: true,
  query: '',
  specs: [],
};
