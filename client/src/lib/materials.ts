/*
 * AM Materials Explorer — Data Types & Utilities
 * Scientific Precision Design System
 */

export interface Material {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  manufacturer: string;
  process: string;
  density: number | null;
  yield_strength: number | null;
  uts: number | null;
  elongation: number | null;
  modulus: number | null;
  hardness: number | null;
  thermal_conductivity: number | null;
  // Chemical composition - can be either numeric dict, string dict (ranges), or range list format
  composition: Array<[string, string]> | {
    C: number | string | null;
    O: number | string | null;
    Fe: number | string | null;
    Cr: number | string | null;
    Ni: number | string | null;
    Mo: number | string | null;
    Mn: number | string | null;
    Si: number | string | null;
    Cu: number | string | null;
    Al: number | string | null;
    Ti: number | string | null;
    V: number | string | null;
    Co: number | string | null;
    W: number | string | null;
    Nb: number | string | null;
    N: number | string | null;
    P: number | string | null;
    S: number | string | null;
    Mg: number | string | null;
    Zn: number | string | null;
    Sn: number | string | null;
    Be: number | string | null;
    Ta: number | string | null;
    La: number | string | null;
    Ce: number | string | null;
  }
  // Additional properties
  fatigue_strength?: number | null;
  impact_strength?: number | null;
  // R56-fix #1: Sprint 4 C2 KIC family fallback 데이터 노출.
  fracture_toughness?: number | null;
  corrosion_resistance?: string | null;
  machinability?: string | null;
  weldability?: string | null;
  electrical_conductivity?: number | null;
  max_service_temp?: number | null;
  thermal_expansion?: number | null;
  poisson_ratio?: number | null;
  specific_heat?: number | null;
  melting_point?: number | null;
  /** R110 — Polymer 한정 Tg (Glass Transition Temperature, °C). DSC (ISO 11357) 표준. */
  glass_transition_temp?: number | null;
  /** R110 — Polymer HDT @ 1.82 MPa (ISO 75-A) — Tg 보다 약간 낮은 처짐 한계. */
  hdt_182?: number | null;
  /** R116 — 다차원 가격 모델: condition / form / grade 별 multiplier. */
  price_condition_factor?: number | null;
  price_form_factor?: number | null;
  price_grade_premium?: number | null;
  /** R116 — delivered price = raw × condition × form × grade (HT/form 적용 후 단가, 사용자 비교 기준). */
  delivered_price_per_kg?: number | null;
  price_per_kg?: number | null;
  price_per_cm3?: number | null;
  /** F4: 가공 비용 가중치 — raw material × machining_cost_factor 가 가공 후 단가 추정. 1.0=기본,
   *  >1=가공성 낮음(공구강·티타늄·니켈 합금), <1=쉬움(저탄소강·알루미늄). */
  machining_cost_factor?: number | null;
  /** F4: 열처리/후공정 비용 가중치 — 열처리·HIP·코팅 적용 시 raw 대비 추가비용 (1.0=없음). */
  ht_cost_factor?: number | null;
  /** F4: 총 추정 가공 단가 = price_per_kg × machining × ht. 빌드 단계에서 사전 계산. */
  total_cost_estimate?: number | null;
  /** R15: 제조 attributes (Granta 격차 보완). 시제품 단계 설계자가 '내가 이 정밀도로 만들 수 있나' 즉시 판단. */
  /** 최소 벽 두께 (mm) — AM 출력 가능 / 주조 깰림 한계 / 사출 단형 가능. process 별 휴리스틱. */
  min_wall_thickness?: number | null;
  /** 표면 거칠기 typical Ra (μm) — 마감 전 출하 상태. AM as-built / 단조 표면 / 주조 표면 / 정밀 가공. */
  surface_finish_typical?: number | null;
  /** 일반 공차 등급 (ISO 286 IT grade) — 5 가공 정밀 ~ 16 거친 주조. */
  tolerance_class?: string | null;
  /** R16: RoHS 통과 여부. composition 에서 Pb < 0.1% / Cd < 0.01% / Hg < 0.1% / Cr⁶⁺ < 0.1% /
   *  PBB·PBDE < 0.1% 검출. 합금에서 Cr 은 통상 Cr³⁺/0가 — Cr⁶⁺는 도금/표면처리 단계 위험. */
  rohs_compliant?: boolean | null;
  /** R16: REACH SVHC / EU 규제 우려 항목 목록. 합금에 Pb/Cd/Be/Co/Ni-allergen 등 있으면 노출. */
  svhc_concerns?: string[];
  popularity?: number | null; // 0–5, 산업 사용 빈도 휴리스틱 (5 = 가장 흔히 쓰이는 표준 합금)
  /** R20: Tensile properties at elevated temperature. E (Young's modulus, GPa) 추가. */
  elevated_temp?: Array<{ temp: number; ys?: number | null; uts?: number | null; E?: number | null }>;
  /** R20: Creep rupture data — Larson-Miller / stress-time-temperature 표면용. 100h, 1000h, 10000h, 100000h 표준. */
  creep_rupture?: Array<{ temp: number; stress: number; hours: number }>;
  heat_treatment?: string | null;
  source?: string | null;
  // ── range-based schema (v2 data pipeline) ──
  ranges?: Record<string, PropertyRange | null>;
  sources?: MaterialSource[];
  tier?: 'curated' | 'am_vendor' | 'generic' | 'reference';
  manufacturers?: string[];
  machines?: string[];
  processes?: string[];
  aliases?: string[];
  families?: string[];
  fatigue_estimated?: boolean;
  /** R75 — 개발 역사·스토리·실제 사용례 (markdown 가능, 다단락). data/material-stories.json 에서 base name 으로 주입. */
  story?: string | null;
  /** R75 — story 의 출처 (저자/특허/표준/handbook). 각 entry 는 markdown link 가능. */
  story_refs?: string[];
  /** R72/R73/R74 — industry-standard application 한 줄. supplementary entry 의 industry_note 필드 그대로. */
  industry_note?: string | null;
  meta?: Record<string, unknown>;
}

/** A property aggregated across a material's data points (conditions/vendors/build directions). */
export interface PropertyRange {
  min: number;
  max: number;
  typical: number;
  n: number;
  estimated?: boolean;
  /** 데이터 신뢰도 단계. 'measured' = 실측 다수, 'handbook' = 표준 데이터시트, 'subfamily/family/class' = fallback 단계, 'derived' = 다른 물성에서 유도(예: 피로 ~UTS×ratio). */
  confidence?: 'measured' | 'handbook' | 'subfamily' | 'family' | 'class' | 'derived';
  /** R129 — fallback 출처 trace. 예: "alloy:174ph × HT:H1025 (f×0.9, i×1.4)" / "class:PH stainless × HT:H1150 (i×3.0)" / "family:Fe-based σf≈0.45·UTS". UI tooltip 에 노출. */
  provenance?: string;
}

/** A provenance entry — verified datasheet URL or honest generic reference. */
export interface MaterialSource {
  label: string;
  url: string | null;
  verified: boolean;
}

export interface PropertyMeta {
  key: keyof Material;
  label: string;
  unit: string;
  description: string;
  group: 'mechanical' | 'thermal' | 'physical' | 'chemical' | 'qualitative' | 'cost';
  min?: number;
  max?: number;
}

export const MECHANICAL_PROPERTIES: PropertyMeta[] = [
  { key: 'yield_strength', label: 'Yield Strength', unit: 'MPa', description: '0.2% offset yield strength', group: 'mechanical' },
  { key: 'uts', label: 'UTS', unit: 'MPa', description: 'Ultimate Tensile Strength', group: 'mechanical' },
  { key: 'elongation', label: 'Elongation', unit: '%', description: 'Elongation at break', group: 'mechanical' },
  { key: 'modulus', label: "Young's Modulus", unit: 'GPa', description: 'Elastic modulus', group: 'mechanical' },
  { key: 'hardness', label: 'Hardness', unit: 'HV', description: 'Vickers hardness', group: 'mechanical' },
  { key: 'fatigue_strength', label: 'Fatigue Strength', unit: 'MPa', description: 'Fatigue limit (R=-1)', group: 'mechanical' },
  { key: 'impact_strength', label: 'Impact Strength', unit: 'J', description: 'Charpy impact energy', group: 'mechanical' },
  // R56-fix #1: Sprint 4 C2 KIC 데이터를 UI 에서 사용 가능하도록 entry 추가.
  // 814 alloys 가 family fallback (confidence='class') 으로 채워져 있음 — Ashby chart KIC 축 / Detail / Compare 노출.
  { key: 'fracture_toughness', label: 'Fracture Toughness', unit: 'MPa√m', description: 'Plane-strain fracture toughness K_IC', group: 'mechanical' },
];

export const PHYSICAL_PROPERTIES: PropertyMeta[] = [
  { key: 'density', label: 'Density', unit: 'g/cm³', description: 'Mass density', group: 'physical' },
  { key: 'thermal_conductivity', label: 'Thermal Conductivity', unit: 'W/m·K', description: 'Thermal conductivity at RT', group: 'thermal' },
  { key: 'electrical_conductivity', label: 'Electrical Conductivity', unit: '%IACS', description: 'Electrical conductivity (% IACS), typical', group: 'physical' },
  { key: 'max_service_temp', label: 'Max Service Temp', unit: '°C', description: 'Max continuous service temperature, typical', group: 'thermal' },
  { key: 'thermal_expansion', label: 'Thermal Expansion (CTE)', unit: '10⁻⁶/K', description: 'Linear coefficient of thermal expansion near RT — class-typical', group: 'thermal' },
  { key: 'specific_heat', label: 'Specific Heat', unit: 'J/kg·K', description: 'Specific heat capacity — class-typical', group: 'thermal' },
  { key: 'melting_point', label: 'Melting / Liquidus', unit: '°C', description: 'Melting or liquidus temperature — class-typical', group: 'thermal' },
  { key: 'poisson_ratio', label: "Poisson's Ratio", unit: '–', description: "Poisson's ratio — class-typical", group: 'physical' },
  /* R110 — Polymer 한정: Glass Transition Temperature (Tg). DSC (ISO 11357) 표준 측정. */
  { key: 'glass_transition_temp', label: 'Glass Transition (Tg)', unit: '°C', description: 'Polymer Tg — amorphous chain mobility onset. ISO 11357 (DSC) typical. Polymer 외 N/A.', group: 'thermal' },
  { key: 'hdt_182', label: 'HDT @ 1.82 MPa', unit: '°C', description: 'Polymer Heat Deflection Temp under 1.82 MPa load (ISO 75-A). 보통 Tg 보다 약간 낮음.', group: 'thermal' },
];

export const COST_PROPERTIES: PropertyMeta[] = [
  { key: 'price_per_kg', label: 'Raw price (per kg)', unit: 'USD/kg', description: 'Raw material spot price (LME / vendor list, family base). condition/form 차별화 X.', group: 'cost' },
  /* R116 — delivered price = raw × condition × form × grade. 사용자 비교 기준 (HT/process 적용 후 단가). */
  { key: 'delivered_price_per_kg', label: 'Delivered price (HT+form)', unit: 'USD/kg', description: 'R116: raw × condition × form × grade premium. As-supplied < Q+T < STA < HIP. Wrought < Cold-drawn < AM powder.', group: 'cost' },
  { key: 'price_per_cm3', label: 'Price (per cm³)', unit: 'USD/cm³', description: 'Approximate price per unit volume (raw 기준)', group: 'cost' },
  /* R111/R116 — factor 들은 의미 카드 (제조성 섹션) 로 옮김. 여기 cost 영역엔 숫자만 표시 (참고용). */
  { key: 'price_condition_factor', label: 'Condition × (HT/temper)', unit: '×', description: 'R116: heat treatment / temper 가격 증가. As-supplied 1.0 / Annealed 1.02 / Q+T 1.18 / STA 1.25 / HIP 1.60 / Coating 1.50', group: 'cost' },
  { key: 'price_form_factor', label: 'Form × (process)', unit: '×', description: 'R116: process 형태 가격. Cast 1.0 / Wrought 1.05 / Cold-drawn 1.20 / Forged 1.15 / AM powder 2.5 / EBM 3.0', group: 'cost' },
  { key: 'price_grade_premium', label: 'Grade × (premium)', unit: '×', description: 'R116: 같은 family 내 grade 차이. Single crystal 4.0 / DS cast 2.0 / Scalmalloy 2.0 / Al-Li 1.30 / aerospace 7xxx 1.10', group: 'cost' },
  { key: 'machining_cost_factor', label: 'Machining factor', unit: '×', description: 'F4: 가공 비용 가중치 (1.0 = 표준 강) — 자세한 의미는 아래 "제조성" 카드 참조', group: 'cost' },
  { key: 'ht_cost_factor', label: 'HT factor', unit: '×', description: 'F4: 열처리·후공정 비용 가중치 (1.0 = 없음) — 자세한 의미는 아래 "제조성" 카드 참조', group: 'cost' },
  { key: 'total_cost_estimate', label: 'Total cost (machined)', unit: 'USD/kg', description: 'R116: delivered_price × machining factor — 가공·열처리·form 모두 적용한 최종 추정 단가', group: 'cost' },
  /* R111 — Min wall / Surface Ra 는 process-aware (Wrought 에서는 의미 없음). build-materials 에서 Cast/AM/Injection 만 채움. */
  { key: 'min_wall_thickness', label: 'Min wall', unit: 'mm', description: 'R15: 최소 벽 두께 — Cast/AM/Injection 프로세스 한정 (Wrought 는 가공 결과에 의존하므로 N/A)', group: 'cost' },
  { key: 'surface_finish_typical', label: 'Surface Ra', unit: 'μm', description: 'R15: 제조 그대로의 표면 거칠기 — Cast/AM/Injection 한정 (Wrought 는 가공 후 결과로 결정, N/A)', group: 'cost' },
  { key: 'popularity', label: 'Popularity', unit: '0–5', description: 'Industry usage heuristic — higher = more commonly used standard alloy', group: 'qualitative' },
];

export const ALL_NUMERIC_PROPERTIES: PropertyMeta[] = [
  ...PHYSICAL_PROPERTIES,
  ...MECHANICAL_PROPERTIES,
  ...COST_PROPERTIES,
];

export const CHEMICAL_ELEMENTS: Array<{ key: string; label: string }> = [
  { key: 'C', label: 'C' }, { key: 'Fe', label: 'Fe' }, { key: 'Cr', label: 'Cr' },
  { key: 'Ni', label: 'Ni' }, { key: 'Mo', label: 'Mo' }, { key: 'Mn', label: 'Mn' },
  { key: 'Si', label: 'Si' }, { key: 'Cu', label: 'Cu' }, { key: 'Al', label: 'Al' },
  { key: 'Ti', label: 'Ti' }, { key: 'V', label: 'V' }, { key: 'Co', label: 'Co' },
  { key: 'W', label: 'W' }, { key: 'Nb', label: 'Nb' }, { key: 'N', label: 'N' },
  { key: 'P', label: 'P' }, { key: 'S', label: 'S' }, { key: 'Mg', label: 'Mg' },
  { key: 'Zn', label: 'Zn' }, { key: 'Sn', label: 'Sn' }, { key: 'Be', label: 'Be' },
  { key: 'Ta', label: 'Ta' }, { key: 'La', label: 'La' }, { key: 'Ce', label: 'Ce' },
  { key: 'O', label: 'O' },
];

export const COMPOSITION_OPTIONS: string[] = ['Fe', 'Al', 'Ni', 'Ti', 'Co', 'Cu', 'Mg', 'Mo', 'Nb', 'Ta', 'V', 'W', 'Be', 'Other'];

export const COMPOSITION_COLORS: Record<string, string> = {
  Fe: '#EF4444',
  Al: '#F59E0B',
  Ni: '#8B5CF6',
  Ti: '#06B6D4',
  Co: '#EC4899',
  Cu: '#D97706',
  Mg: '#14B8A6',
  Mo: '#6366F1',
  Nb: '#F43F5E',
  Ta: '#A855F7',
  V: '#0EA5E9',
  W: '#64748B',
  Be: '#10B981',
  Other: '#9CA3AF',
};

export const CATEGORY_COLORS: Record<string, string> = {
  Metal: '#00A3E0',
  Polymer: '#22C55E',
  // R35a — 1차 family 4종 모두 노출 (이전: Metal/Polymer 만)
  Ceramic: '#F59E0B',
  Composite: '#A855F7',
};

/**
 * Composition-based Material Family tree
 * Structure: { groupLabel, color, families: string[] }
 */
export interface FamilyGroup {
  label: string;
  color: string;
  families: string[];
}

export const FAMILY_TREE: FamilyGroup[] = [
  {
    label: 'Iron-based (Fe)',
    color: '#60a5fa',
    families: [
      'Carbon Steel',
      'Alloy Steel',
      'Tool Steel',
      'Maraging Steel',
      'Cast Iron',
      'Stainless Steel - Austenitic',
      'Stainless Steel - Ferritic/Martensitic',
    ],
  },
  {
    label: 'Aluminum-based (Al)',
    color: '#fbbf24',
    families: [
      'Aluminum - Pure/Other',
      'Aluminum - Cu Alloys (2xxx)',
      'Aluminum - Mn Alloys (3xxx)',
      'Aluminum - Mg Alloys (5xxx)',
      'Aluminum - Si Alloys (6xxx/7xxx)',
    ],
  },
  {
    label: 'Nickel-based (Ni)',
    color: '#a78bfa',
    families: [
      'Nickel Superalloy',
      'Nickel - Inconel Superalloy',
      'Nickel - Hastelloy',
      'Nickel - Other Superalloy',
    ],
  },
  {
    label: 'Titanium-based (Ti)',
    color: '#34d399',
    families: [
      'Titanium - Pure/Other',
    ],
  },
  {
    label: 'Cobalt-based (Co)',
    color: '#f472b6',
    families: [
      'Cobalt-Chrome Alloy',
    ],
  },
  {
    label: 'Copper-based (Cu)',
    color: '#fb923c',
    families: [
      'Copper - Pure/Other',
      'Copper - Brass (Cu-Zn)',
    ],
  },
  {
    label: 'Refractory & Specialty',
    color: '#94a3b8',
    families: [
      'Refractory Metal',
      'Beryllium Alloy',
      'Magnesium Alloy',
      'Zinc Alloy',
      'Controlled Expansion Alloy',
      'Shape Memory Alloy',
      'Metal - Other',
    ],
  },
  {
    label: 'Polymers',
    color: '#4ade80',
    families: [
      'Polymer - ABS (FDM)',
      'Polymer - PLA (FDM)',
      'Polymer - PETG (FDM)',
      'Polymer - Nylon (FDM/SLS)',
      'Polymer - Nylon GF (FDM)',
      'Polymer - PEEK (FDM)',
      'Polymer - PEEK GF (FDM)',
      'Polymer - PP (FDM)',
      'Polymer - PP GF (FDM)',
      'Polymer - PEI/ULTEM (FDM)',
      'Polymer - PES (FDM)',
      'Polymer - TPU (FDM)',
      'Polymer - Polyethylene',
      'Polymer - Polycarbonate',
      'Polymer - Polystyrene',
      'Polymer - PMMA (Acrylic)',
      'Polymer - Silicone Rubber',
      'Polymer - Epoxy/Thermoset Resin',
      'Polymer - Photopolymer Resin (SLA)',
      'Polymer - Acetal (POM)',
      'Polymer - PVC',
      'Polymer - PVDF',
      'Polymer - Polysulfone (PSU)',
      'Polymer - PPSU',
      'Polymer - ASA (FDM)',
      'Polymer - PEKK (FDM)',
      'Polymer - PTFE',
      'Polymer - PAI',
      'Polymer - Polyimide',
      'Polymer - PBT',
      'Polymer - LCP',
      'Polymer - ETFE',
      'Polymer - Carbon-Fiber Reinforced',
      'Polymer - Glass-Fiber Reinforced',
      'Polymer - PET',
      'Polymer - PCL',
      'Polymer - EVA',
      'Polymer - PVB',
      'Polymer - PBI',
      'Polymer - Polyurethane',
      'Polymer - PHA',
    ],
  },
];

export const SUBCATEGORY_COLORS: Record<string, string> = {
  'Alloy Steel': '#3B82F6',
  'Stainless Steel - Austenitic': '#60A5FA',
  'Stainless Steel - Ferritic/Martensitic': '#93C5FD',
  'Aluminum - Cu Alloys (2xxx)': '#F59E0B',
  'Aluminum - Mn Alloys (3xxx)': '#FCD34D',
  'Aluminum - Mg Alloys (5xxx)': '#FDE68A',
  'Aluminum - Pure/Other': '#FEF3C7',
  'Titanium - Pure/Other': '#8B5CF6',
  'Nickel Superalloy': '#A78BFA',
  'Nickel - Inconel Superalloy': '#C4B5FD',
  'Nickel - Hastelloy': '#DDD6FE',
  'Cobalt-Chrome Alloy': '#EC4899',
  'Maraging Steel': '#F9A8D4',
  'Tool Steel': '#6B7280',
  'Carbon Steel': '#9CA3AF',
  'Refractory Metal': '#374151',
  'Copper - Pure/Other': '#D97706',
  'Copper - Brass (Cu-Zn)': '#B45309',
  'Magnesium Alloy': '#10B981',
  'Beryllium Alloy': '#34D399',
  'Polymer - ABS (FDM)': '#22C55E',
  'Polymer - Nylon (FDM/SLS)': '#4ADE80',
  'Polymer - PEEK (FDM)': '#86EFAC',
  'Polymer - PLA (FDM)': '#BBF7D0',
  'Polymer - PETG (FDM)': '#D1FAE5',
  'Polymer - PP (FDM)': '#A7F3D0',
  'Polymer - Nylon GF (FDM)': '#6EE7B7',
  'Polymer - PP GF (FDM)': '#34D399',
  'Polymer - Polyethylene': '#10B981',
  'Polymer - Epoxy/Thermoset Resin': '#059669',
};

export function formatValue(val: number | string | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string') return val;
  if (val === 0) return '0';
  return val.toFixed(decimals);
}

export function getPropertyRange(materials: Material[], key: keyof Material): [number, number] {
  const values = materials
    .map(m => m[key] as number)
    .filter(v => v !== null && v !== undefined && !isNaN(v) && v > 0);
  if (values.length === 0) return [0, 100];
  return [Math.min(...values), Math.max(...values)];
}

export function getUniqueValues(materials: Material[], key: keyof Material): string[] {
  const set = new Set<string>();
  materials.forEach(m => {
    const v = m[key];
    if (v !== null && v !== undefined && v !== '') set.add(String(v));
  });
  return Array.from(set).sort();
}
