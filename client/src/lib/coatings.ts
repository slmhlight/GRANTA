/*
 * R17/R41 — 표준 후공정·코팅 DB.
 *  R41 (현실성 보강): HVOF 범위 좁힘 (landing gear / hydraulic / pump rod / mill roll 만),
 *  DLC 좁힘 (sliding parts/medical 만), Shot Peening 좁힘 (spring/gear/shaft/aerospace fatigue 만).
 *  한국 산업 현장에서 자주 쓰는 흔한 coating 추가 — Hard Chrome 도금, Zinc plating (방청), Phosphate
 *  (자동차 인산염), Stainless Passivation (ASTM A967), Electropolish, Anodizing Type II (장식·내식),
 *  Black Oxide (총포·도구), PEO (Ti·Mg), Aluminizing (니켈 슈퍼합금 고온), Tin plating (전기 접점), Galvanizing (조선).
 *  score 시스템 개선 — alloy-specific match (10점) ≫ generic match (1점) → 'all' 매칭이 alloy-specific 매칭을 가리지 않게.
 *
 * 데이터 출처:
 *   ASM Handbook Vol.5 (Surface Engineering), AMS 시리즈, ASTM B600·B633·B843·D7091·F1925,
 *   KS D 8302 (도금 표준), JIS H 8617, ISO 1456·9587·14713 (방청 도금), MIL-A-8625 (anodizing).
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
  /**
   * 어느 기재 (substrate) 에서 효과적 — material name regex.
   * R41: 'all' 은 거의 안 씀 — 명시적 alloy 패턴 매칭이 원칙.
   */
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
  // ── 도금 (Plating) — 한국 산업에서 가장 흔함 ─────────────────────────
  {
    id: 'zinc-plating',
    name: 'Zinc Electroplating (방청 도금)',
    nameKo: '아연 도금 (방청)',
    applicableTo: ['Metal'],
    // 4140·4340·8620·1018·1020·SCM·SS400·a36·sae carbon/alloy steel — 자동차·산업 표준
    substrateMatch: '\\b(?:1018|1020|1045|s45c|4140|4340|8620|9310|scm4|sncm|ss400|a36|carbon steel|alloy steel|low.?alloy|case[\\s-]?hard|sae 1\\d|sae 4\\d|sae 8\\d|1\\d{3}|4\\d{3})\\b',
    thicknessMicrons: [5, 25],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: -5,
    corrosionUpgrade: '+1',
    costFactor: 1.05,
    applications: '자동차 fastener·자동차 body 부속·일반 강 부품 (ASTM B633, KS D 8302). 가장 흔한 방청 표면.',
    limitations: 'Cr⁶⁺ passivation 사용 시 RoHS 비통과 — Cr³⁺ 또는 무크롬 시일링 필요. 200°C 이상 열화.',
  },
  {
    id: 'phosphate',
    name: 'Manganese Phosphate (Parkerizing)',
    nameKo: '인산염 처리 (Phosphate)',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:1018|1020|1045|s45c|4140|4340|8620|9310|scm4|sncm|carbon steel|alloy steel|fastener|gear|bearing|sae 1\\d|sae 4\\d|sae 8\\d|d2|m2|tool|cast iron|gjl|gjs)\\b',
    thicknessMicrons: [5, 30],
    surfaceHardnessHV: null,
    frictionCoef: 0.15,
    fatigueGainPct: 0,
    corrosionUpgrade: '+1',
    costFactor: 1.08,
    applications: '자동차 변속기 기어·베어링 raceway·총기·공구 (DIN 50942, MIL-DTL-16232). 오일 흡수성 → 길들이기 우수.',
    limitations: '얇은 막 (5-30μm) — 단독 내식은 약함. 통상 oil + phosphate 조합. 처리 후 깔끔한 검회색.',
  },
  {
    id: 'hard-chrome',
    name: 'Hard Chrome Electroplating',
    nameKo: '경질 크롬 도금',
    applicableTo: ['Metal'],
    // 유압 로드·실린더·인쇄 롤·금형 — 흔한 산업 표준
    substrateMatch: '\\b(?:4140|4340|8620|17[\\s-]?4 ?ph|15[\\s-]?5 ?ph|sus630|sus6\\d{2}|h13|d2|skd|tool steel|hydraulic|piston rod|cylinder|roll|mold|valve stem)\\b',
    thicknessMicrons: [20, 250],
    surfaceHardnessHV: 1000,
    frictionCoef: 0.16,
    fatigueGainPct: -15,
    corrosionUpgrade: '+1',
    costFactor: 1.6,
    applications: '유압 실린더 로드·인쇄 롤·사출 금형 인서트·밸브 스템 (MIL-STD-1501, AMS 2406). KS B 0823 표준.',
    limitations: 'Cr⁶⁺ 폐액 — EU REACH 규제. 시안화물 위험. 피로 -15% (수소취화). 대체로 HVOF·DLC 검토.',
  },
  {
    id: 'tin-plating',
    name: 'Tin Electroplating',
    nameKo: '주석 도금 (전기 접점)',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:copper|c1\\d{4}|c2\\d{4}|c3\\d{4}|c5\\d{4}|brass|bronze|cu-?|ofe|electrical|busbar|connector|terminal)\\b',
    thicknessMicrons: [2, 15],
    surfaceHardnessHV: null,
    frictionCoef: 0.4,
    fatigueGainPct: 0,
    corrosionUpgrade: '+1',
    costFactor: 1.15,
    applications: '전자 PCB 단자·busbar·USB-C 접점·납땜성 향상 (ASTM B545, IPC J-STD-001). 무연 (RoHS).',
    limitations: '얇음 (수 μm) → 마모 환경 부적합. Whisker (주석 수염) 신뢰성 이슈 — 0.5% Pb 또는 reflow 처리.',
  },
  {
    id: 'silver-plating',
    name: 'Silver Electroplating',
    nameKo: '은 도금 (고전류 접점)',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:copper|c1\\d{4}|c17200|cube|beryllium copper|brass|busbar|high.?current|electrical contact)\\b',
    thicknessMicrons: [2, 20],
    surfaceHardnessHV: null,
    frictionCoef: 0.3,
    fatigueGainPct: 0,
    corrosionUpgrade: 'none',
    costFactor: 2.5,
    applications: '고전류 차단기·릴레이 접점·항공 전기 커넥터 (ASTM B700, MIL-DTL-25038). 통전 손실 최소.',
    limitations: '대기 中 황화 (S 함유 가스) — 흑변. 무연 RoHS OK 단 비용↑. 윤활 없으면 접점 부착 (sticking).',
  },
  // ── Aluminum 표면 처리 ─────────────────────────────────────────────
  {
    id: 'anodizing-hard',
    name: 'Hard Anodizing (Type III)',
    nameKo: '경질 양극산화 (Type III)',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:aluminum|alsi|6061|6063|6082|7075|7050|2024|2014|5052|5083|aa\\s?\\d|al-?si)\\b',
    thicknessMicrons: [25, 100],
    surfaceHardnessHV: 500,
    frictionCoef: 0.5,
    fatigueGainPct: -10,
    corrosionUpgrade: '+1',
    costFactor: 1.25,
    applications: '항공·군용 Al 부품·산업 cylinder·hydraulic block (MIL-A-8625 Type III). 검정·자연 회색.',
    limitations: '내부 응력으로 인장 피로 ~10% 감소. 7075 fatigue critical 부품 주의. 처리 후 절연성.',
  },
  {
    id: 'anodizing-type2',
    name: 'Standard Anodizing (Type II)',
    nameKo: '표준 양극산화 (Type II, 장식·내식)',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:aluminum|alsi|6061|6063|6082|5052|5083|aa\\s?(?:1|3|5|6)\\d{3})\\b',
    thicknessMicrons: [5, 25],
    surfaceHardnessHV: 250,
    frictionCoef: null,
    fatigueGainPct: 0,
    corrosionUpgrade: '+1',
    costFactor: 1.10,
    applications: '건축 창호 압출재·가전 외장·자전거 frame·MacBook chassis (MIL-A-8625 Type II). 다양한 컬러 가능.',
    limitations: '경도 < Type III. 두께 10-20μm — 마모 부품엔 부족. 7075 등 고합금 표면 얼룩 가능.',
  },
  {
    id: 'chromate-conversion',
    name: 'Chromate Conversion (Alodine / Iridite)',
    nameKo: '크로메이트 전환 피막',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:aluminum|alsi|6061|6063|2024|5052|5083|7075|aa\\s?\\d)\\b',
    thicknessMicrons: [0.5, 3],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: 0,
    corrosionUpgrade: '+1',
    costFactor: 1.05,
    applications: '항공 Al 부품 도장 전 프라이머 (MIL-DTL-5541 Class 1A / 3). 전기 전도성 유지.',
    limitations: 'Cr⁶⁺ 사용 — RoHS 비통과 (Class 1A). Cr³⁺ 대체 (Class 3) 는 약간 약함. 매우 얇음.',
  },
  // ── Stainless / Ni 슈퍼합금 ──────────────────────────────────────────
  {
    id: 'passivation',
    name: 'Passivation (Citric / Nitric)',
    nameKo: '부동태화 (Passivation)',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:stainless|sus3\\d{2}|3\\d{2}l?|sus4\\d{2}|17[\\s-]?4 ?ph|15[\\s-]?5 ?ph|inconel|hastelloy|304|316|321|347|2205|duplex)\\b',
    thicknessMicrons: [0, 1],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: 0,
    corrosionUpgrade: '+1',
    costFactor: 1.05,
    applications: '의료기기·식품 가공·반도체 챔버 표준 후처리 (ASTM A967, ASTM A380). 표면 Fe 제거 → Cr 산화막 보강.',
    limitations: '코팅이 아닌 표면 제어 — 두께 ≈ 0. 가공 contaminant 잔류 시 효과 무. 표면 spec FREE-IRON test 확인.',
  },
  {
    id: 'electropolish',
    name: 'Electropolishing',
    nameKo: '전해 연마',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:stainless|sus3\\d{2}|3\\d{2}l?|sus4\\d{2}|316l|304l|17[\\s-]?4 ?ph|niti|nitinol|inconel|titanium|ti grade ?\\d)\\b',
    thicknessMicrons: [1, 25],
    surfaceHardnessHV: null,
    frictionCoef: 0.2,
    fatigueGainPct: 10,
    corrosionUpgrade: '+1',
    costFactor: 1.20,
    applications: '의료기기 (인공관절·임플란트)·반도체 부품·식품·제약 (ASTM B912, ASME BPE). Ra < 0.4μm 가능.',
    limitations: '치수 변경 (10-25μm 제거). 모서리·구멍 가장자리 과식. 가격 ↑. Nitinol 표면 Ti-rich 층 형성.',
  },
  {
    id: 'aluminizing',
    name: 'Pack Aluminizing (Diffusion)',
    nameKo: '확산 알루미늄 코팅',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:inconel|hastelloy|haynes|waspaloy|nimonic|in[\\s-]?7\\d{2}|in[\\s-]?9\\d{2}|nickel superalloy|tbc|turbine)\\b',
    thicknessMicrons: [25, 75],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: 0,
    corrosionUpgrade: '+2',
    costFactor: 1.5,
    applications: '제트엔진 터빈 블레이드 산화 보호 (AMS 4782). TBC 바닥층 — 1100°C 이상 사용.',
    limitations: '700°C 이하 사용 부품에 불필요. β-NiAl 층 brittle — 충격 부하 주의. 두꺼우면 fatigue 약화.',
  },
  // ── 표층 경화 (Surface Hardening) ────────────────────────────────────
  {
    id: 'nitriding',
    name: 'Gas / Plasma Nitriding',
    nameKo: '질화 (Nitriding)',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:h13|skd61|d2|d3|m2|nitralloy|4140|scm4|cr-?mo|tool steel|hot work|cold work|spring|gear|cam|crankshaft|extrusion die|injection mold)\\b',
    thicknessMicrons: [50, 500],
    surfaceHardnessHV: 1100,
    frictionCoef: 0.4,
    fatigueGainPct: 50,
    corrosionUpgrade: '+1',
    costFactor: 1.4,
    applications: '자동차 크랭크축·기어·H13 다이캐스팅 다이·압출 다이 (DIN 50190, AMS 2759/10). 변형 최소.',
    limitations: '500°C 사용 한계. Al/Cu 부적합. 표면 변형 ±5μm. 처리 후 grind 가능하면 정밀.',
  },
  {
    id: 'carburizing',
    name: 'Gas Carburizing + Quench',
    nameKo: '침탄 (Carburizing)',
    applicableTo: ['Metal'],
    // R41 fix: 저탄소강 (C ≤ 0.25%) 명시 — S45C/1045 같은 중탄소강 / SS400 구조용 강 제외.
    substrateMatch: '\\b(?:8620|9310|4118|4320|sae 41\\d{2}|sae 43\\d{2}|scm415|scm420|scm822|sncm220|sncm815|sncm439|low.?carbon|1018|1020|1015|s20c|s15c|case[\\s-]?hard|case[\\s-]?harden|20mncr5|carburiz|침탄)\\b',
    thicknessMicrons: [500, 2000],
    surfaceHardnessHV: 750,
    frictionCoef: null,
    fatigueGainPct: 30,
    corrosionUpgrade: 'none',
    costFactor: 1.5,
    applications: '자동차 변속 기어·차동기어·산업 감속기 (SAE J404). 표층 60+ HRC + 코어 인성.',
    limitations: '저탄소강 전용 (C ≤ 0.25%). 침탄 후 결정립 성장. 표면 산화 위험 → 진공 침탄 (vacuum) 권장.',
  },
  {
    id: 'induction-hardening',
    name: 'Induction Hardening',
    nameKo: '고주파 표면 경화',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:1045|s45c|sm45c|1050|s50c|1060|s55c|4140|4340|scm4|sae 1\\d{3}|sae 4\\d{3}|shaft|axle|crankshaft|cam shaft|gear|spline|leaf spring)\\b',
    thicknessMicrons: [500, 5000],
    surfaceHardnessHV: 650,
    frictionCoef: null,
    fatigueGainPct: 40,
    corrosionUpgrade: 'none',
    costFactor: 1.25,
    applications: '자동차 크랭크축·캠축·드라이브 샤프트·산업 기어 (DIN 17212, JIS B 0915). 한국 산업 흔함.',
    limitations: '중탄소강 (C 0.4~0.55%) 필요. 표층 50-58 HRC. 패턴 따라 균열 위험 — geometry 고려.',
  },
  // ── PVD 박막 (절삭공구·다이) ─────────────────────────────────────────
  {
    id: 'pvd-tin',
    name: 'PVD TiN (Titanium Nitride)',
    nameKo: 'PVD TiN 코팅',
    applicableTo: ['Metal'],
    // CVD 가 아닌 PVD — 기재 풀림 없이 ~500°C 처리. R41: CVD-TiN 은 1000°C 라 거의 안 씀 → 항목 자체 제거 (PVD 표준).
    substrateMatch: '\\b(?:hss|m2|m42|skd|skh|d2|d3|carbide|wc-?co|tool steel|cermet|insert|drill|endmill|tap|punch)\\b',
    thicknessMicrons: [1, 5],
    surfaceHardnessHV: 2400,
    frictionCoef: 0.4,
    fatigueGainPct: 10,
    corrosionUpgrade: '+1',
    costFactor: 1.4,
    applications: '범용 절삭공구·드릴·인서트·decoration (ISO 513). 금색 — 가장 흔한 PVD.',
    limitations: '내열 600°C — 고온 절삭은 TiAlN. 두께 < 5μm — 마모 한계.',
  },
  {
    id: 'pvd-ticn',
    name: 'PVD TiCN (Titanium Carbonitride)',
    nameKo: 'PVD TiCN 코팅',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:tool steel|skd|d2|d3|hss|m2|carbide|wc-?co|gear|cam|punch|stamping die)\\b',
    thicknessMicrons: [1, 4],
    surfaceHardnessHV: 3000,
    frictionCoef: 0.35,
    fatigueGainPct: 15,
    corrosionUpgrade: '+1',
    costFactor: 1.7,
    applications: '고속 절삭·고탄소강 가공·자동차 punch 다이 (PVD ~500°C).',
    limitations: '내열 < 400°C — 고온 사용 부품엔 TiAlN. 박리 위험 (높은 응력 모드).',
  },
  {
    id: 'pvd-tialn',
    name: 'PVD TiAlN (Titanium Aluminum Nitride)',
    nameKo: 'PVD TiAlN 코팅',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:h13|skd61|d2|skd|hss|m2|m42|carbide|wc-?co|hot work|die cast|forging die|extrusion|insert|endmill|tap)\\b',
    thicknessMicrons: [2, 6],
    surfaceHardnessHV: 3300,
    frictionCoef: 0.3,
    fatigueGainPct: 20,
    corrosionUpgrade: '+2',
    costFactor: 2.0,
    applications: 'H13 다이캐스팅 다이·고속 절삭 (800°C+ 가능, AMS 2444). 보라색·진청색.',
    limitations: '비용↑. 박막 박리 시 갑작스러운 마모 — 모니터링 필요.',
  },
  // ── 특수 (제한된 use case) ──────────────────────────────────────────
  {
    id: 'dlc',
    name: 'DLC (Diamond-Like Carbon)',
    nameKo: 'DLC 코팅',
    applicableTo: ['Metal'],
    // R41: 'all' → sliding parts / 의료 / 베어링 / 피스톤링 / 밸브 / 캠 으로 좁힘.
    substrateMatch: '\\b(?:bearing|piston ring|piston|valve|cam shaft|valve lifter|injector|pump rotor|gear|medical|implant|surgical|knife|niti|nitinol|titanium grade ?\\d|tool steel|h13|cocrmo|cocr)\\b',
    thicknessMicrons: [1, 5],
    surfaceHardnessHV: 2500,
    frictionCoef: 0.08,
    fatigueGainPct: 0,
    corrosionUpgrade: '+2',
    costFactor: 1.8,
    applications: '자동차 fuel injector·valve lifter·F1 cam·정밀 베어링·의료 임플란트 (ISO 20502, ASTM F2129).',
    limitations: '350°C 이상 흑연화 분해. 두께 < 5μm — 고하중 접촉 응력에 박리. 비전도성 (전기 접점 부적합).',
  },
  {
    id: 'hvof-wcco',
    name: 'HVOF WC-Co (Hard Chrome 대체)',
    nameKo: 'HVOF 텅스텐 카바이드 (특수)',
    applicableTo: ['Metal'],
    // R41: 'all' → 항공 랜딩기어 / 펌프 로드 / 인쇄 롤 / Cr 도금 대체 한정.
    substrateMatch: '\\b(?:landing gear|piston rod|hydraulic|pump shaft|valve seat|mill roll|paper roll|chrome.?replace|aerospace shaft|titanium grade ?5|17[\\s-]?4 ?ph|15[\\s-]?5 ?ph|4340)\\b',
    thicknessMicrons: [100, 500],
    surfaceHardnessHV: 1300,
    frictionCoef: 0.5,
    fatigueGainPct: 25,
    corrosionUpgrade: '+1',
    costFactor: 1.6,
    applications: '항공 랜딩기어·수력 펌프 로드·인쇄 롤 — 경질 크롬 대체 (AMS 2447). REACH Cr⁶⁺ 회피 시.',
    limitations: '두께 > 100μm — 후 grind 필수. 다공성 ~1-2%. 일반 강 부품엔 hard chrome 또는 nitriding 이 더 흔함.',
  },
  {
    id: 'cold-spray',
    name: 'Cold Spray (Kinetic Deposition)',
    nameKo: '콜드 스프레이 (보수)',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:repair|restoration|landing gear|titanium grade ?5|6061|7075|magnesium|az3|az9|copper|c1\\d{4})\\b',
    thicknessMicrons: [200, 5000],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: 0,
    corrosionUpgrade: '+1',
    costFactor: 1.7,
    applications: '항공기 부식·마모 부품 dimensional restoration (AMS 7045). Al/Cu/Ti 분말. 열영향 없음.',
    limitations: '본드 강도 ~60 MPa. 산화에 민감한 분말 (Mg) 까다로움. 신규 부품 보다 보수에 주로 사용.',
  },
  {
    id: 'shot-peening',
    name: 'Shot / Laser Peening',
    nameKo: '쇼트피닝 (피로 강화)',
    applicableTo: ['Metal'],
    // R41: 'all' → spring / gear / shaft / aerospace fatigue critical 로 좁힘
    substrateMatch: '\\b(?:spring|coil spring|leaf spring|valve spring|gear|pinion|shaft|crankshaft|connecting rod|landing gear|turbine blade|compressor disk|aerospace|fatigue critical|4340|aermet|maraging|17[\\s-]?4 ?ph|titanium grade ?5|ti-?6)\\b',
    thicknessMicrons: [50, 250],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: 50,
    corrosionUpgrade: 'none',
    costFactor: 1.15,
    applications: '자동차 valve spring·항공 터빈 블레이드·기어·랜딩기어 (SAE J442·J443, AMS 2430). Almen 정량.',
    limitations: '코팅 아님 — Ra ↑. 정밀 표면 부품엔 비추천. 강축 (compressive) 응력 도입.',
  },
  {
    id: 'black-oxide',
    name: 'Black Oxide (Fe₃O₄)',
    nameKo: '흑색 산화 처리',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:carbon steel|alloy steel|tool steel|skd|d2|m2|1045|s45c|4140|4340|fastener|hand tool|firearm|총포)\\b',
    thicknessMicrons: [0.5, 2],
    surfaceHardnessHV: null,
    frictionCoef: 0.2,
    fatigueGainPct: 0,
    corrosionUpgrade: '+1',
    costFactor: 1.05,
    applications: '핸드 공구·총기·계측기·자동차 패스너 (MIL-DTL-13924). 검은색 외관·약한 방청.',
    limitations: '얇음 — 단독 내식 약함. 통상 oil sealing 또는 wax. 다이 표면엔 부적합 (마찰계수↑).',
  },
  {
    id: 'galvanizing',
    name: 'Hot-dip Galvanizing',
    nameKo: '용융아연 도금 (조선·건설)',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:ss400|a36|1018|1020|low carbon|carbon steel|structural steel|ship|bridge|pipe|h.?beam|i-beam)\\b',
    thicknessMicrons: [50, 200],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: -10,
    corrosionUpgrade: '+2',
    costFactor: 1.20,
    applications: '조선·건설 H형강·파이프·교량·송전탑 (ASTM A123, KS D 9521). 30년+ 내식.',
    limitations: '도금조 ~450°C — 열변형 가능. 표면 거칠음. 피로 -10%. 두꺼운 부재 다공성 위험.',
  },
  {
    id: 'peo',
    name: 'PEO (Plasma Electrolytic Oxidation)',
    nameKo: 'PEO 플라즈마 전해 산화',
    applicableTo: ['Metal'],
    substrateMatch: '\\b(?:titanium|ti grade ?\\d|ti-?6al|magnesium|az3|az9|we43|aluminum|6061|7075|alsi|implant|medical|niti)\\b',
    thicknessMicrons: [20, 200],
    surfaceHardnessHV: 1500,
    frictionCoef: 0.5,
    fatigueGainPct: -10,
    corrosionUpgrade: '+2',
    costFactor: 1.5,
    applications: '의료 Ti 임플란트 골 친화성·Mg 자동차 부품 내식 (ASTM F2393). 거친 다공질 → 골 융합.',
    limitations: '두께 > 50μm 시 brittle. Mg 합금에 최적. 처리 표면 절연성. fatigue 영향 검증 필요.',
  },
];

/** Material 에서 추천 후공정 N개 반환 — 카테고리/공정/이름 패턴 매칭.
 *  R41: alloy-specific match (3+점) ≫ 'all' match (1점) — 'all' 매칭이 alloy-specific 매칭을 가리지 않게.
 */
export function recommendedCoatings(m: { category?: string; name?: string; process?: string; subcategory?: string }, max = 3): Coating[] {
  const cat = m.category;
  const nameLower = String(m.name || '').toLowerCase();
  const procLower = String(m.process || '').toLowerCase();
  const subLower = String(m.subcategory || '').toLowerCase();
  const concat = nameLower + ' ' + procLower + ' ' + subLower;
  const scored: { coating: Coating; score: number }[] = [];
  for (const c of COATINGS) {
    if (cat && !c.applicableTo.includes(cat as any) && !c.applicableTo.includes('All')) continue;
    let score = 0;
    if (c.substrateMatch === 'all') {
      score = 0.5; // R41: 'all' 매칭은 fallback 으로만 — alloy-specific 매칭과 경쟁 안 함.
    } else if (new RegExp(c.substrateMatch, 'i').test(concat)) {
      score = 10; // 명시적 alloy 매칭 — 최우선
    } else {
      continue; // 비매칭 — skip
    }
    // 보너스 점수 — fatigue·corrosion·경도 향상이 큰 coating 우대
    if (c.fatigueGainPct && c.fatigueGainPct >= 30) score += 1;
    if (c.corrosionUpgrade === '+2' || c.corrosionUpgrade === 'major') score += 1;
    if ((c.surfaceHardnessHV ?? 0) >= 1500) score += 0.5;
    // 비용 페널티 — 너무 비싼 coating (×2 이상) 은 일반 alloy 에서 우선순위 ↓
    if (c.costFactor >= 2.0) score -= 0.5;
    scored.push({ coating: c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((x) => x.coating);
}
