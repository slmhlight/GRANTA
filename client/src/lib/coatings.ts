/*
 * R17 — 표준 후공정/코팅 DB. material 의 category + process + name 패턴에 따라 추천 자동 매칭.
 *
 * 데이터 출처:
 *   ASM Handbook Vol.5 (Surface Engineering), Tribology Series (Bhushan),
 *   Industrial Hardchrome / Nitriding Handbook, AWS A5 시리즈, ASTM E140.
 *
 * Δ 값은 핸드북 typical (실제 값은 코팅 두께·기재·공정 변수에 따라 ±20% 변동).
 */

export interface Coating {
  id: string;
  name: string;
  /** 한국어 라벨 (UI). */
  nameKo: string;
  /** 어느 카테고리에 적용 가능 (Metal/Polymer/All). */
  applicableTo: ('Metal' | 'Polymer' | 'All')[];
  /** 어느 기재 (substrate) 에서 효과적 — material name regex. all 이면 모두. */
  substrateMatch: 'all' | string;
  /** 표층 두께 typical (μm). */
  thicknessMicrons: [number, number];
  /** 표층 경도 결과 (HV). 기재가 부드러우면 영향 큼. */
  surfaceHardnessHV: number | null;
  /** 마찰계수 (강 대 강) — 베이스 0.6 대비 변화. */
  frictionCoef: number | null;
  /** 피로한도 변화 (%). */
  fatigueGainPct: number | null;
  /** 내식 등급 향상 (단계). */
  corrosionUpgrade: 'none' | '+1' | '+2' | 'major';
  /** 비용 가중치 (raw cost 대비). */
  costFactor: number;
  /** 주요 응용 — 사용 사례 + 표준 코드. */
  applications: string;
  /** 한계·주의 사항. */
  limitations: string;
}

export const COATINGS: Coating[] = [
  {
    id: 'nitriding',
    name: 'Gas / Plasma Nitriding',
    nameKo: '질화 (Nitriding)',
    applicableTo: ['Metal'],
    substrateMatch: 'steel|nitralloy|h13|d2|m2|scm|cr-?mo|tool|spring|stainless',
    thicknessMicrons: [50, 500],
    surfaceHardnessHV: 1100,
    frictionCoef: 0.4,
    fatigueGainPct: 50,
    corrosionUpgrade: '+1',
    costFactor: 1.4,
    applications: '기어·축·금형 표층 강화 (DIN 50190, AMS 2759/10). H13 다이캐스팅 다이의 표준 후공정.',
    limitations: '500°C 사용 한계. 알루미늄/구리 합금에 부적합. 처리 후 변형 최소이지만 ±5μm 정도.',
  },
  {
    id: 'carburizing',
    name: 'Gas Carburizing + Quench',
    nameKo: '침탄 (Carburizing)',
    applicableTo: ['Metal'],
    substrateMatch: '8620|9310|sae 4|scm4|sncm|low carbon|carbon steel|case hard',
    thicknessMicrons: [500, 2000],
    surfaceHardnessHV: 750,
    frictionCoef: null,
    fatigueGainPct: 30,
    corrosionUpgrade: 'none',
    costFactor: 1.5,
    applications: '자동차 변속기 기어, 베어링 (SAE J404). 표층 60+ HRC + 코어 인성.',
    limitations: '저탄소강 전용 (C ≤ 0.25%). 침탄 후 ~10μm 결정립 성장. 표면 산화 위험.',
  },
  {
    id: 'anodizing-hard',
    name: 'Hard Anodizing (Type III)',
    nameKo: '경질 양극산화 (Type III)',
    applicableTo: ['Metal'],
    substrateMatch: 'aluminum|alsi|6061|7075|2024|5052|aa\\s?\\d',
    thicknessMicrons: [25, 100],
    surfaceHardnessHV: 500,
    frictionCoef: 0.5,
    fatigueGainPct: -10,
    corrosionUpgrade: '+1',
    costFactor: 1.25,
    applications: '항공·군용 알루미늄 부품 (MIL-A-8625 Type III). 우주항공 알 BR2·BR3 표면.',
    limitations: '내부 응력으로 인장 피로 ~10% 감소. 7075 시리즈 fatigue critical 부품 비추천.',
  },
  {
    id: 'dlc',
    name: 'DLC (Diamond-Like Carbon)',
    nameKo: 'DLC 코팅',
    applicableTo: ['Metal'],
    substrateMatch: 'all',
    thicknessMicrons: [1, 5],
    surfaceHardnessHV: 2500,
    frictionCoef: 0.08,
    fatigueGainPct: 0,
    corrosionUpgrade: '+2',
    costFactor: 1.8,
    applications: '정밀 베어링·기어·피스톤링·의료 (ISO 20502). 마찰 ↓ + 내마모 + 비점착.',
    limitations: '350°C 이상 흑연화로 분해. 두께 < 5μm — 고하중 접촉 응력에 박리 가능. 비전도성.',
  },
  {
    id: 'cvd-tin',
    name: 'CVD TiN (Titanium Nitride)',
    nameKo: 'CVD TiN 코팅',
    applicableTo: ['Metal'],
    substrateMatch: 'tool|skd|d2|d3|d6|hss|m2|m42|carbide|wc',
    thicknessMicrons: [2, 8],
    surfaceHardnessHV: 2400,
    frictionCoef: 0.4,
    fatigueGainPct: 10,
    corrosionUpgrade: '+1',
    costFactor: 1.5,
    applications: '절삭 공구·인서트·드릴·엔드밀 (ISO 513). 600°C 사용 가능. CVD 공정 (~1000°C).',
    limitations: 'CVD 가공 온도로 인해 공구강 본체 풀림 가능 → 후 열처리 권장. PVD-TiN 이 ~500°C 로 안전.',
  },
  {
    id: 'pvd-ticn',
    name: 'PVD TiCN (Titanium Carbonitride)',
    nameKo: 'PVD TiCN 코팅',
    applicableTo: ['Metal'],
    substrateMatch: 'tool|skd|d2|d3|hss|m2|carbide|gear|cam',
    thicknessMicrons: [1, 4],
    surfaceHardnessHV: 3000,
    frictionCoef: 0.35,
    fatigueGainPct: 15,
    corrosionUpgrade: '+1',
    costFactor: 1.7,
    applications: '고속 절삭·기어 표면·캠. PVD (~500°C) 가공으로 기재 풀림 우려 적음.',
    limitations: '내열 < 400°C — 고온 사용 부품엔 TiAlN 권장. 박리 위험 (높은 응력 모드).',
  },
  {
    id: 'pvd-tialn',
    name: 'PVD TiAlN (Titanium Aluminum Nitride)',
    nameKo: 'PVD TiAlN 코팅',
    applicableTo: ['Metal'],
    substrateMatch: 'tool|skd|h13|d2|hss|m2|carbide|wc|hot work',
    thicknessMicrons: [2, 6],
    surfaceHardnessHV: 3300,
    frictionCoef: 0.3,
    fatigueGainPct: 20,
    corrosionUpgrade: '+2',
    costFactor: 2.0,
    applications: '고온 절삭·다이캐스팅 다이 (800°C+ 사용). H13 + TiAlN 표준.',
    limitations: '비용↑. 박막 박리 시 기재 갑작스러운 마모 — 모니터링 필요.',
  },
  {
    id: 'hvof-wcco',
    name: 'HVOF WC-Co (Tungsten Carbide-Cobalt)',
    nameKo: 'HVOF 텅스텐 카바이드',
    applicableTo: ['Metal'],
    substrateMatch: 'all',
    thicknessMicrons: [100, 500],
    surfaceHardnessHV: 1300,
    frictionCoef: 0.5,
    fatigueGainPct: 25,
    corrosionUpgrade: '+1',
    costFactor: 1.6,
    applications: '항공 랜딩기어, 수력 펌프, 인쇄 롤 (AMS 2447). Chrome Plating 대체 (Cr⁶⁺ 회피).',
    limitations: '코팅 두께 > 100μm 라 정밀 가공 후 grind 필수. 다공성 ~1-2% (저밀도면 부식 침투).',
  },
  {
    id: 'cold-spray',
    name: 'Cold Spray (Kinetic Deposition)',
    nameKo: '콜드 스프레이',
    applicableTo: ['Metal'],
    substrateMatch: 'aluminum|copper|titanium|magnesium|steel',
    thicknessMicrons: [200, 5000],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: 0,
    corrosionUpgrade: '+1',
    costFactor: 1.7,
    applications: '항공기 부식·마모 보수 (AMS 7045). 열영향 없이 두꺼운 코팅. 알루미늄·구리 분말 흔함.',
    limitations: '본드 강도 ~60 MPa (열처리·진공보다 약). 산화에 민감한 분말 (Mg) 까다로움.',
  },
  {
    id: 'shot-peening',
    name: 'Shot Peening / Laser Peening',
    nameKo: '쇼트피닝 (Shot Peening)',
    applicableTo: ['Metal'],
    substrateMatch: 'all',
    thicknessMicrons: [50, 250],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: 50,
    corrosionUpgrade: 'none',
    costFactor: 1.15,
    applications: '항공 부품·기어·스프링·자동차 부속. 표층 압축응력 도입으로 피로 +50%.',
    limitations: '코팅 아님 — 표면 거칠기 ↑. 정밀 표면 부품엔 비추천. Almen strip 으로 정량 관리.',
  },
];

/** Material 에서 추천 후공정 N개 반환 — 카테고리/공정/이름 패턴 매칭. */
export function recommendedCoatings(m: { category?: string; name?: string; process?: string }, max = 3): Coating[] {
  const cat = m.category;
  const nameLower = String(m.name || '').toLowerCase();
  const procLower = String(m.process || '').toLowerCase();
  const concat = nameLower + ' ' + procLower;
  const scored: { coating: Coating; score: number }[] = [];
  for (const c of COATINGS) {
    if (cat && !c.applicableTo.includes(cat as any) && !c.applicableTo.includes('All')) continue;
    let score = 0;
    if (c.substrateMatch === 'all') {
      score += 1;
    } else if (new RegExp(c.substrateMatch, 'i').test(concat)) {
      score += 3;
    } else {
      continue; // no match
    }
    // higher fatigue/corrosion gain → higher score
    if (c.fatigueGainPct && c.fatigueGainPct > 20) score += 1;
    if (c.corrosionUpgrade === '+2' || c.corrosionUpgrade === 'major') score += 1;
    if ((c.surfaceHardnessHV ?? 0) > 1500) score += 1;
    scored.push({ coating: c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((x) => x.coating);
}
