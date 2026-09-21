/*
 * 수치 범위 필터 — FilterState 의 `*Range` 키 ↔ Material 물성 키 ↔ 라벨·단위·사이드바 섹션의 **단일 정의**.
 *
 * 2026-09-20 F1 이전에는 이 대응이 여섯 벌로 적혀 있었다: useMaterialFilter 의 술어 목록·활성 카운트·
 * RANGE_FILTER_MAP(역방향), FilterSidebar 의 useMemo 23개·슬라이더 JSX 23블록·칩 목록. 여섯 벌은 손으로
 * 맞춰야 했고 단위도 사이드바가 PropertyMeta 와 따로 적어 어긋나 있었다(KIC 'MPa·√m' vs 'MPa√m').
 * 이제 FilterState 에 range 키를 하나 추가하면 여기 등재 전엔 **컴파일이 실패**하고(아래 타입 게이트),
 * 등재하면 술어·카운트·슬라이더·칩이 한꺼번에 따라온다.
 *
 * 단위는 PropertyMeta(ALL_NUMERIC_PROPERTIES) 의 것을 쓴다 — 표·상세·비교판과 같은 문자열. 예외 두 가지만
 * `unit` 으로 덮는다: popularity(슬라이더 라벨 중복 방지, R46) · poisson_ratio(무차원 — '–' 자리표시 대신 빈 값).
 * 가격 두 항목은 언어·단위계에 따라 라벨이 달라지므로 호출부가 `priced` 를 보고 채운다(R40b).
 */
import type { Material } from '@/lib/materials';
import { ALL_NUMERIC_PROPERTIES } from '@/lib/materials';
import type { FilterRangeKey } from '@/lib/filter-state';

export type RangeSection = 'essentials' | 'mechanical' | 'thermal' | 'electrical' | 'cost';

export interface RangeFilterDef {
  /** FilterState 의 키 (`densityRange` …). */
  key: FilterRangeKey;
  /** Material 물성 키 — propValue 로 읽는다. narrowedRanges 도 이 키로 인덱싱. */
  prop: keyof Material;
  /** 슬라이더 제목의 i18n 키. */
  tKey: string;
  /** 적용된 필터 칩의 짧은 라벨. */
  chip: string;
  section: RangeSection;
  /** PropertyMeta 단위를 덮는 표시 단위 (빈 문자열 = 단위 없음). */
  unit?: string;
  /** 가격 계열 — 단위는 언어·단위계에 따라 호출부가 결정. */
  priced?: boolean;
}

/** 사이드바 표시 순서 그대로. 섹션 경계는 `section` 으로 구분. */
export const RANGE_FILTERS = [
  { key: 'popularityRange', prop: 'popularity', tKey: 'filter.popularity', chip: 'Popularity', section: 'essentials', unit: '' },
  { key: 'densityRange', prop: 'density', tKey: 'filter.density', chip: 'Density', section: 'mechanical' },
  { key: 'modulusRange', prop: 'modulus', tKey: 'filter.modulus', chip: 'E', section: 'mechanical' },
  { key: 'yieldStrengthRange', prop: 'yield_strength', tKey: 'filter.yieldStrength', chip: 'Yield σy', section: 'mechanical' },
  { key: 'utsRange', prop: 'uts', tKey: 'filter.uts', chip: 'UTS', section: 'mechanical' },
  { key: 'elongationRange', prop: 'elongation', tKey: 'filter.elongation', chip: 'Elong.', section: 'mechanical' },
  { key: 'hardnessRange', prop: 'hardness', tKey: 'filter.hardness', chip: 'Hardness', section: 'mechanical' },
  { key: 'fatigueStrengthRange', prop: 'fatigue_strength', tKey: 'filter.fatigueStrength', chip: 'Fatigue', section: 'mechanical' },
  { key: 'impactStrengthRange', prop: 'impact_strength', tKey: 'filter.impactStrength', chip: 'Impact', section: 'mechanical' },
  { key: 'fractureToughnessRange', prop: 'fracture_toughness', tKey: 'filter.fractureToughness', chip: 'KIC', section: 'mechanical' },
  { key: 'poissonRatioRange', prop: 'poisson_ratio', tKey: 'filter.poissonRatio', chip: 'ν', section: 'mechanical', unit: '' },
  { key: 'thermalConductivityRange', prop: 'thermal_conductivity', tKey: 'filter.thermalConductivity', chip: 'k', section: 'thermal' },
  { key: 'maxServiceTempRange', prop: 'max_service_temp', tKey: 'filter.maxServiceTemp', chip: 'T_max', section: 'thermal' },
  { key: 'thermalExpansionRange', prop: 'thermal_expansion', tKey: 'filter.thermalExpansion', chip: 'CTE', section: 'thermal' },
  { key: 'meltingPointRange', prop: 'melting_point', tKey: 'filter.meltingPoint', chip: 'T_m', section: 'thermal' },
  { key: 'specificHeatRange', prop: 'specific_heat', tKey: 'filter.specificHeat', chip: 'cp', section: 'thermal' },
  { key: 'electricalConductivityRange', prop: 'electrical_conductivity', tKey: 'filter.electricalConductivity', chip: 'EC', section: 'electrical' },
  { key: 'pricePerKgRange', prop: 'price_per_kg', tKey: 'filter.price', chip: 'Price', section: 'cost', priced: true },
  { key: 'totalCostEstimateRange', prop: 'total_cost_estimate', tKey: 'filter.totalCost', chip: 'TotCost', section: 'cost', priced: true },
  { key: 'machiningCostFactorRange', prop: 'machining_cost_factor', tKey: 'filter.machiningFactor', chip: 'Mach.', section: 'cost' },
  { key: 'htCostFactorRange', prop: 'ht_cost_factor', tKey: 'filter.htFactor', chip: 'HT', section: 'cost' },
  { key: 'minWallThicknessRange', prop: 'min_wall_thickness', tKey: 'filter.minWall', chip: 'MinWall', section: 'cost' },
  { key: 'surfaceFinishTypicalRange', prop: 'surface_finish_typical', tKey: 'filter.surfaceRa', chip: 'Ra', section: 'cost' },
] as const satisfies readonly RangeFilterDef[];

/* 컴파일 게이트 — FilterState 의 range 키 중 위 표에 없는 것이 있으면 이 대입이 실패한다.
   (Missing 이 never 이면 true 타입, 아니면 빠진 키의 리터럴 타입이 되어 `true` 를 받지 못한다.) */
type Covered = (typeof RANGE_FILTERS)[number]['key'];
type Missing = Exclude<FilterRangeKey, Covered>;
const _everyRangeKeyIsListed: Missing extends never ? true : Missing = true;
void _everyRangeKeyIsListed;

/* AUD F23 (2026-09-22) — 섹션 라벨을 언어별로 (EN 모드에 한글 병기 라벨이 남던 것). label 은 ko, labelEn 은 en. */
export const RANGE_SECTIONS: readonly { id: RangeSection; label: string; labelEn: string }[] = [
  { id: 'essentials', label: '기본 검색 · Essentials', labelEn: 'Essentials' },
  { id: 'mechanical', label: '기계적 성질 · Mechanical', labelEn: 'Mechanical' },
  { id: 'thermal', label: '열적 성질 · Thermal', labelEn: 'Thermal' },
  { id: 'electrical', label: '전기적 성질 · Electrical', labelEn: 'Electrical' },
  { id: 'cost', label: '원가·가공 · Cost & Process', labelEn: 'Cost & Process' },
];

const META_UNIT = new Map(ALL_NUMERIC_PROPERTIES.map((p) => [p.key, p.unit]));

/** 표시 단위 — 표 덮어쓰기 > 가격 라벨 > PropertyMeta. PropertyMeta 에 없는 키는 빌드 게이트가 막는다. */
export function rangeUnit(def: RangeFilterDef, priceLabel: string): string {
  if (def.unit !== undefined) return def.unit;
  if (def.priced) return priceLabel;
  return META_UNIT.get(def.prop) ?? '';
}
