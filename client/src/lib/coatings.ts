/*
 * R17/R41 → R226s/E10 — 표준 후공정·코팅 카탈로그 + 합금별 추천 해석기.
 *
 * R226s 전면 개편: 구 substrateMatch name-regex + 점수제(합금 무관 일률 보너스)를 폐기하고,
 *  - 카탈로그(COATINGS)는 공정 백과(물성·표준·한계)만 담당,
 *  - "어떤 합금에 무엇을 왜"는 data/coating-recommendations.json(합금 그룹 22종 SSOT)이 담당,
 *  - 재료→그룹 매핑은 빌드 스탬프 m.profiles.cg (Material ID 기반 — 런타임 regex 0).
 * resolveCoatingPlan 이 둘을 조합해 목적(부식/마모/피로/고온/전기/위생/접착/치수)별 추천 +
 * 조건 보정(수소취성 UTS≥1000·AM as-built)을 반환한다.
 *
 * 데이터 출처:
 *   ASM Handbook Vol.5 (Surface Engineering), AMS 시리즈, ASTM B600·B633·B733·B843·D7091·F1925,
 *   KS D 8302 (도금 표준), JIS H 8617, ISO 1456·9587·14713 (방청 도금), MIL-A-8625 (anodizing).
 *
 * Δ 값은 핸드북 typical (실제 값은 코팅 두께·기재·공정 변수에 따라 ±20% 변동).
 */
import type { Material } from './materials';
import recsData from '../../../data/coating-recommendations.json';

export interface Coating {
  id: string;
  name: string;
  /** 한국어 라벨 (UI). */
  nameKo: string;
  /** 어느 카테고리에 적용 가능 (Metal/Polymer/All) — 추천 SSOT 정합성 게이트용. */
  applicableTo: ('Metal' | 'Polymer' | 'All')[];
  /** 표층 두께 typical (μm). 피닝·어닐링 등 비피막 공정은 [0, 0]. */
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
    id: 'electroless-nickel',
    name: 'Electroless Nickel (Ni-P)',
    nameKo: '무전해 니켈 도금 (ENP)',
    applicableTo: ['Metal'],
    thicknessMicrons: [12, 50],
    surfaceHardnessHV: 550,
    frictionCoef: 0.4,
    fatigueGainPct: -10,
    corrosionUpgrade: '+2',
    costFactor: 1.3,
    applications: '복잡 형상 균일 도금 (전류 분포 무관) — 밸브·금형·전자 하우징 (ASTM B733, AMS 2404, MIL-C-26074). 열처리(400°C) 시 850-950 HV.',
    limitations: 'P 함량따라 특성 변동 (mid-P 표준). 고강도강 수소취성 — 베이킹 필요. 인성 낮아 충격·굽힘부 크랙.',
  },
  {
    id: 'tin-plating',
    name: 'Tin Electroplating',
    nameKo: '주석 도금 (전기 접점)',
    applicableTo: ['Metal'],
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
    thicknessMicrons: [5, 25],
    surfaceHardnessHV: 250,
    frictionCoef: null,
    fatigueGainPct: 0,
    corrosionUpgrade: '+1',
    costFactor: 1.1,
    applications: '건축 창호 압출재·가전 외장·자전거 frame·MacBook chassis (MIL-A-8625 Type II). 다양한 컬러 가능.',
    limitations: '경도 < Type III. 두께 10-20μm — 마모 부품엔 부족. 7075 등 고합금 표면 얼룩 가능.',
  },
  {
    id: 'chromate-conversion',
    name: 'Chromate Conversion (Alodine / Iridite)',
    nameKo: '크로메이트 전환 피막',
    applicableTo: ['Metal'],
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
    thicknessMicrons: [1, 25],
    surfaceHardnessHV: null,
    frictionCoef: 0.2,
    fatigueGainPct: 10,
    corrosionUpgrade: '+1',
    costFactor: 1.2,
    applications: '의료기기 (인공관절·임플란트)·반도체 부품·식품·제약 (ASTM B912, ASME BPE). Ra < 0.4μm 가능.',
    limitations: '치수 변경 (10-25μm 제거). 모서리·구멍 가장자리 과식. 가격 ↑. Nitinol 표면 Ti-rich 층 형성.',
  },
  {
    id: 'aluminizing',
    name: 'Pack Aluminizing (Diffusion)',
    nameKo: '확산 알루미늄 코팅',
    applicableTo: ['Metal'],
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
    id: 'qpq',
    name: 'Salt Bath Nitrocarburizing + Oxidizing (QPQ)',
    nameKo: 'QPQ 염욕 질화탄화 (내마모+내식)',
    applicableTo: ['Metal'],
    thicknessMicrons: [10, 25],
    surfaceHardnessHV: 600,
    frictionCoef: 0.35,
    fatigueGainPct: 30,
    corrosionUpgrade: '+2',
    costFactor: 1.35,
    applications: '샤프트·유압 부품·총열·기어 (AMS 2753, Tufftride/Melonite 급). 화합물층+산화막 — 염수분무 내식이 아연도금 상회.',
    limitations: '처리 온도 ~580°C — 저온 템퍼강은 강도 손실 (Q&T 템퍼 온도 확인). 치수 미세 성장. 염욕 폐기물 관리.',
  },
  {
    id: 'carburizing',
    name: 'Gas Carburizing + Quench',
    nameKo: '침탄 (Carburizing)',
    applicableTo: ['Metal'],
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
    thicknessMicrons: [0, 0],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: 50,
    corrosionUpgrade: 'none',
    costFactor: 1.15,
    applications: '자동차 valve spring·항공 터빈 블레이드·기어·랜딩기어 (SAE J442·J443, AMS 2430). Almen 정량.',
    limitations: '코팅 아님 — Ra ↑. 정밀 표면 부품엔 비추천. 압축 잔류응력 층 깊이 50-250μm.',
  },
  {
    id: 'black-oxide',
    name: 'Black Oxide (Fe₃O₄)',
    nameKo: '흑색 산화 처리',
    applicableTo: ['Metal'],
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
    thicknessMicrons: [50, 200],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: -10,
    corrosionUpgrade: '+2',
    costFactor: 1.2,
    applications: '조선·건설 H형강·파이프·교량·송전탑 (ASTM A123, KS D 9521). 30년+ 내식.',
    limitations: '도금조 ~450°C — 열변형 가능. 표면 거칠음. 피로 -10%. 두꺼운 부재 다공성 위험.',
  },
  {
    id: 'peo',
    name: 'PEO (Plasma Electrolytic Oxidation)',
    nameKo: 'PEO 플라즈마 전해 산화',
    applicableTo: ['Metal'],
    thicknessMicrons: [20, 200],
    surfaceHardnessHV: 1500,
    frictionCoef: 0.5,
    fatigueGainPct: -10,
    corrosionUpgrade: '+2',
    costFactor: 1.5,
    applications: '의료 Ti 임플란트 골 친화성·Mg 자동차 부품 내식 (ASTM F2393). 거친 다공질 → 골 융합.',
    limitations: '두께 > 50μm 시 brittle. Mg 합금에 최적. 처리 표면 절연성. fatigue 영향 검증 필요.',
  },
  {
    id: 'ti-anodize',
    name: 'Titanium Anodizing (AMS 2488)',
    nameKo: 'Ti 양극산화 (anti-galling·색상)',
    applicableTo: ['Metal'],
    thicknessMicrons: [0.5, 3],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: 0,
    corrosionUpgrade: '+1',
    costFactor: 1.15,
    applications: 'Ti 패스너·피팅 골링 방지 (AMS 2488 Type 2, 회색), 의료·항공 부품 색 구분 (Type 3 간섭색).',
    limitations: '박막 — 고하중 마모엔 부족 (DLC/PEO 영역). Al 용 MIL-A-8625 와 다른 규격·전해액.',
  },
  // ── 폴리머 후공정 ────────────────────────────────────────────────────
  {
    id: 'pol-annealing',
    name: 'Stress-relief Annealing (Polymer)',
    nameKo: '응력완화 어닐링 (폴리머)',
    applicableTo: ['Polymer'],
    thicknessMicrons: [0, 0],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: null,
    corrosionUpgrade: 'none',
    costFactor: 1.05,
    applications: '정밀 가공 전후 잔류응력 완화 (Ensinger/MCAM 가이드) — PC/PEI/PSU 의 ESC 크랙·가공 휨 저감, POM/PA/PEEK 치수 안정.',
    limitations: '결정성 수지는 어닐 중 수축·치수 변화 — 어닐 후 정삭 순서. Tg/융점 대비 온도·시간 관리 필요.',
  },
  {
    id: 'pol-surface-activation',
    name: 'Plasma / Corona Surface Activation',
    nameKo: '표면 활성화 (플라즈마·코로나)',
    applicableTo: ['Polymer'],
    thicknessMicrons: [0, 0],
    surfaceHardnessHV: null,
    frictionCoef: null,
    fatigueGainPct: null,
    corrosionUpgrade: 'none',
    costFactor: 1.1,
    applications: '도장·접착·인쇄 전처리 (ISO 8296 젖음성) — PP/PE/POM 등 저표면에너지 수지의 접착 성립 조건.',
    limitations: '효과 지속시간 제한 (수 시간~수일 내 접착·도장). PTFE 는 나트륨 에칭 수준의 강처리 필요.',
  },
];

/* ── R226s — 합금별 추천 해석 (Material ID 기반: m.profiles.cg → coating-recommendations.json) ── */

export type CoatingPurpose = 'corrosion' | 'wear' | 'fatigue' | 'thermal' | 'electrical' | 'hygiene' | 'adhesion' | 'stability';
export const PURPOSE_LABEL: Record<CoatingPurpose, string> = {
  corrosion: '부식방지', wear: '내마모', fatigue: '피로', thermal: '고온',
  electrical: '전기·납땜', hygiene: '위생·정밀', adhesion: '접착·도장', stability: '치수·응력',
};

export interface CoatingRec {
  coating: Coating;
  purpose: CoatingPurpose;
  when: string;
  why: string;
  caution?: string;
}
export interface CoatingPlan {
  group: string;
  title: string;
  intro?: string;
  recs: CoatingRec[];
  notes: string[];
  sources: string[];
}

interface RecRaw { coating: string; purpose: CoatingPurpose; when: string; why: string; caution?: string; caution_mach?: Record<string, string> }
interface GroupRaw { title: string; intro?: string; recs: RecRaw[]; notes?: string[]; notes_mach?: Record<string, string> }
const RECS = recsData as unknown as {
  sources: string[];
  condition_mods: {
    he_risk: { uts_min_mpa: number; coatings: string[]; text: string };
    as_built: { htc: string; text: string };
  };
  groups: Record<string, GroupRaw>;
};
const COATING_BY_ID = new Map(COATINGS.map((c) => [c.id, c]));

/** 재료의 후공정 추천 플랜 — 빌드 스탬프 m.profiles.cg 조회 (regex 0). 그룹 없으면 null(카드 미표시).
 *  조건 보정: ① 수소취성(UTS≥1000 MPa × 전해도금 계열 → 베이킹 주의), ② AM as-built(htc) → 선행 공정 노트,
 *  ③ 세부 프로파일별 주의(caution_mach/notes_mach — 예: 2xxx 하드아노다이즈, 303/416 질산욕). */
export function resolveCoatingPlan(m: Material): CoatingPlan | null {
  const cg = m.profiles?.cg;
  if (!cg) return null;
  const g = RECS.groups[cg];
  if (!g) return null;
  const mach = m.profiles?.mach || '';
  const uts = m.ranges?.uts?.typical;
  const he = RECS.condition_mods?.he_risk;
  const heActive = !!(he && m.category === 'Metal' && typeof uts === 'number' && uts >= he.uts_min_mpa);

  const recs: CoatingRec[] = [];
  for (const r of g.recs || []) {
    const c = COATING_BY_ID.get(r.coating);
    if (!c) continue;
    const cautions: string[] = [];
    if (r.caution) cautions.push(r.caution);
    if (r.caution_mach?.[mach]) cautions.push(r.caution_mach[mach]);
    if (heActive && he.coatings.includes(r.coating)) cautions.push(he.text);
    recs.push({ coating: c, purpose: r.purpose, when: r.when, why: r.why, caution: cautions.length ? cautions.join(' ') : undefined });
  }
  const notes = [...(g.notes || [])];
  if (g.notes_mach?.[mach]) notes.push(g.notes_mach[mach]);
  const ab = RECS.condition_mods?.as_built;
  if (ab && m.category === 'Metal' && m.profiles?.htc === ab.htc) notes.push(ab.text);
  return { group: cg, title: g.title, intro: g.intro, recs, notes, sources: RECS.sources || [] };
}
