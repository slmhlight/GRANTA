/*
 * R140 — Alloy-specific Heat Treatment 설명.
 *
 * 사용자 명시 UX 개선: 재료명에 HT 이미 반영된 경우 (예: "17-4 PH H900", "AA 6061 T6")
 * → 일반 HT difficulty/factor card 대신 해당 alloy 의 정확한 HT 의미를 설명.
 *
 * 동일 HT 명도 alloy 마다 다름:
 *   - "H900" for 17-4 PH (S17400) ≠ "H900" for 15-5 PH (S15500) (similar but slightly different params)
 *   - "T6" for AA 6061 (Al-Mg-Si) ≠ "T6" for AA 7075 (Al-Zn) (different aging temp + precipitate phase)
 *   - "Aged" for Maraging 250 (martensite + intermetallics) ≠ "Aged" for Inconel 718 (γ' + γ" precipitation)
 *   - "STA" for Ti-6Al-4V (α+β refinement) ≠ "STA" for Inconel 718 (γ'' peak)
 *
 * 데이터 출처: ASM Handbook Vol.4 (Heat Treating) + Vol.1·2 + AMS specs (5662, 6512, 5708 등)
 *   + Carpenter Technology Custom 465 datasheet (R132)
 *   + Special Metals SMC-045 Inconel 718 (R136)
 *   + ATI VascoMax C-200~350 (R136) + Granta Mar250/300 (R128/R136)
 *   + Aluminum Association Standards · TIMET Timetal series
 *   + ArcelorMittal USIBOR 1500 hot-stamped (R133)
 *   + R128 17-4 PH H900-H1150 4 conditions
 */

export interface AlloyHtDescription {
  /** HT code (e.g., "H900", "T6", "STA", "Aged") */
  code: string;
  /** Brief title shown as card header */
  title: string;
  /** Process: temperature + quench + aging cycle */
  process: string;
  /** Resulting properties (handbook typical values) */
  resulting: string;
  /** Use case / why this condition */
  useCase: string;
  /** Optional caveat / warning */
  caveat?: string;
  /** Source — AMS spec / ASM ref */
  source: string;
}

export interface AlloyHtFamily {
  /** Pattern matching material name (alloy family) */
  alloyPattern: RegExp;
  /** Alloy family name (display) */
  familyName: string;
  /** HT code → description */
  conditions: { [htCode: string]: AlloyHtDescription };
}

const FAMILIES: AlloyHtFamily[] = [
  // ========================================
  // 17-4 PH (UNS S17400)
  // ========================================
  {
    alloyPattern: /17-?4\s?ph|s17400|aisi\s?630|custom\s?630/i,
    familyName: '17-4 PH stainless (UNS S17400)',
    conditions: {
      'h900': {
        code: 'H900',
        title: 'H900 — peak strength (482°C aged)',
        process: 'Solution treated 1040°C (1900°F) / 30 min / WQ → Aged 482°C (900°F) / 1 h / AC',
        resulting: 'σy 1170 MPa (170 ksi) · UTS 1310 MPa · El 10% · KIC 90 MPa·√m · HRC 44',
        useCase: '최대 강도 — landing gear, drive shaft, pump shaft, valve stem',
        caveat: '응력부식균열 (SCC) 위험 ↑ — chloride 환경 시 H1025 이상 권장. 충격 인성 낮음 (Charpy ~30 J).',
        source: 'AMS 5643 / ASM Vol.1 Stainless Steels',
      },
      'h925': {
        code: 'H925',
        title: 'H925 — high strength (496°C aged)',
        process: 'Solution treated 1040°C / WQ → Aged 496°C (925°F) / 4 h / AC',
        resulting: 'σy 1140 MPa · UTS 1240 MPa · El 10% · KIC 95 MPa·√m · HRC 43',
        useCase: 'H900 보다 인성 + 가공 후 dimensional stability ↑',
        source: 'AMS 5643',
      },
      'h1025': {
        code: 'H1025',
        title: 'H1025 — balanced strength + toughness (552°C aged)',
        process: 'Solution treated 1040°C / WQ → Aged 552°C (1025°F) / 4 h / AC',
        resulting: 'σy 1000 MPa (145 ksi) · UTS 1070 MPa · El 12% · KIC 108 MPa·√m · HRC 38',
        useCase: '일반적 균형 조건 — 항공기 fitting, 정밀 부품, 의료 instrument. 강도·인성·SCC 저항 균형.',
        source: 'AMS 5643 / ASM',
      },
      'h1075': {
        code: 'H1075',
        title: 'H1075 — high toughness (580°C aged)',
        process: 'Solution treated 1040°C / WQ → Aged 580°C (1075°F) / 4 h / AC',
        resulting: 'σy 860 MPa (125 ksi) · UTS 1000 MPa · El 13% · KIC 130 MPa·√m · HRC 35',
        useCase: '충격 하중 부품 — gear, pump impeller, valve body. 강도 ↓ but Charpy 70 J+',
        source: 'AMS 5643',
      },
      'h1100': {
        code: 'H1100',
        title: 'H1100 — SCC-resistant (593°C aged)',
        process: 'Solution treated 1040°C / WQ → Aged 593°C (1100°F) / 4 h / AC',
        resulting: 'σy 795 MPa · UTS 965 MPa · El 14% · KIC 140 MPa·√m · HRC 31',
        useCase: '해양·화학 환경 — H900 의 SCC 우려 해소. 압력용기 fastener.',
        source: 'AMS 5643',
      },
      'h1150': {
        code: 'H1150',
        title: 'H1150 — over-aged, max ductility (621°C aged)',
        process: 'Solution treated 1040°C / WQ → Aged 621°C (1150°F) / 4 h / AC',
        resulting: 'σy 720 MPa (105 ksi) · UTS 930 MPa · El 16% · KIC 145 MPa·√m · HRC 28',
        useCase: '최대 연성 + 인성 — chloride 환경 valve, 의료 임플란트, 식품 plant. SCC 저항 최대.',
        source: 'AMS 5643 / ASM Vol.1',
      },
      'as-built': {
        code: 'As-built (LPBF)',
        title: 'As-built — LPBF martensitic (post-print, no HT)',
        process: 'LPBF 후 후처리 없음. 잔류응력 + martensitic 미세조직 (직접 fusion).',
        resulting: 'σy 830 MPa · UTS 1100 MPa · El 16% · KIC 100 MPa·√m (typical AM)',
        useCase: 'Prototype, dimensional check. 실용 부품 시 stress relief 또는 H900-H1150 권장.',
        caveat: '잔류응력 → dimensional 변화 + 피로 ↓. Solution + H900 (또는 H1025) 권장.',
        source: 'EOS / SLM Solutions / Nikon SLM round-robin (R128)',
      },
    },
  },

  // ========================================
  // 15-5 PH (UNS S15500)
  // ========================================
  {
    alloyPattern: /15-?5\s?ph|s15500|xm-?12/i,
    familyName: '15-5 PH stainless (UNS S15500, XM-12)',
    conditions: {
      'h900': {
        code: 'H900',
        title: 'H900 — peak strength (482°C aged)',
        process: 'Solution treated 1040°C / 30 min / WQ → Aged 482°C / 1 h / AC',
        resulting: 'σy 1170 MPa · UTS 1310 MPa · El 10% · KIC 95 MPa·√m · HRC 44',
        useCase: '17-4 PH H900 과 동등 강도 + delta-ferrite 제거 → 횡방향 인성 ↑ (17-4PH 대비)',
        source: 'AMS 5659',
      },
      'h1025': {
        code: 'H1025',
        title: 'H1025 — balanced (552°C aged)',
        process: 'Solution + Aged 552°C / 4 h / AC',
        resulting: 'σy 1000 MPa · UTS 1070 MPa · El 12% · KIC 110 MPa·√m',
        useCase: '17-4PH 와 거의 동일. delta-ferrite 미세화 → forging 부품 권장.',
        source: 'AMS 5659',
      },
      'h1150': {
        code: 'H1150',
        title: 'H1150 — max ductility (621°C aged)',
        process: 'Solution + Aged 621°C / 4 h / AC',
        resulting: 'σy 720 MPa · UTS 930 MPa · El 16% · KIC 145 MPa·√m',
        useCase: 'SCC 환경. 17-4PH 와 거의 동일.',
        source: 'AMS 5659',
      },
    },
  },

  // ========================================
  // Custom 465 (UNS S46500) — Carpenter premium PH
  // ========================================
  {
    alloyPattern: /custom\s?465|s46500/i,
    familyName: 'Custom 465 PH stainless (UNS S46500, Carpenter)',
    conditions: {
      'h900': {
        code: 'H 900',
        title: 'H 900 — extreme strength (482°C aged)',
        process: 'Solution treated 980°C / WQ → Aged 482°C / 4 h / AC',
        resulting: 'σy 1830 MPa (266 ksi) · UTS 1900 MPa · El 10% · HRC 52',
        useCase: '17-4PH H900 대비 +56% 강도. Aerospace landing gear, drive shaft 최고급.',
        caveat: 'KIC 65 MPa·√m — 충격 부적합. 인성 우선 시 H 1000 권장.',
        source: 'Carpenter Custom 465 datasheet / AMS 5936',
      },
      'h 950': {
        code: 'H 950',
        title: 'H 950 — peak balance (510°C aged)',
        process: 'Solution treated 980°C / WQ → Aged 510°C / 4 h / AC',
        resulting: 'σy 1669 MPa (242 ksi) · UTS 1765 MPa · El 13% · KIC 104 MPa·√m · HRC 49',
        useCase: '17-4PH H900 보다 strength + toughness 동시 ↑. Carpenter 추천 표준 condition.',
        source: 'Carpenter Custom 465 datasheet (R132 verified)',
      },
      'h 1000': {
        code: 'H 1000',
        title: 'H 1000 — superior toughness (538°C aged)',
        process: 'Solution treated 980°C / WQ → Aged 538°C / 4 h / AC',
        resulting: 'σy 1510 MPa · UTS 1593 MPa · El 17% · KIC 130 MPa·√m · HRC 47',
        useCase: '강도·인성·SCC 저항 모두 최고급 — 충격 하중 항공 부품, 사출 mold core pin.',
        source: 'Carpenter Custom 465',
      },
      'h 1050': {
        code: 'H 1050',
        title: 'H 1050 — moderate strength (566°C aged)',
        process: 'Solution + Aged 566°C / 4 h / AC',
        resulting: 'σy 1413 MPa · UTS 1517 MPa · El 15% · KIC 145 MPa·√m · HRC 45',
        useCase: 'H 1000 보다 ductility ↑. SCC 환경에서도 사용 가능.',
        source: 'Carpenter',
      },
    },
  },

  // ========================================
  // Aluminum 2xxx (Al-Cu, 2024 typical)
  // ========================================
  {
    alloyPattern: /aa\s?2024|^2024|aa\s?2014|^2014|aa\s?2219|aluminum.*2xxx/i,
    familyName: 'AA 2xxx Al-Cu (e.g., 2024, 2014, 2219)',
    conditions: {
      't3': {
        code: 'T3',
        title: 'T3 — solution treated + cold worked + naturally aged',
        process: 'Solution 495°C (2024) / WQ → cold-rolled / stretched 1-3% → naturally aged 4+ days (RT)',
        resulting: 'AA 2024-T3: σy 345 MPa · UTS 485 MPa · El 18% · KIC 26 MPa·√m',
        useCase: '항공기 fuselage skin, wing rib — fatigue 우수 (T6 대비). Boeing 737 동체 표준.',
        caveat: 'SCC 우려 (특히 short-transverse) → critical 부품 시 T351 (stretched) 권장.',
        source: 'Aluminum Association T-temper / MMPDS-2018',
      },
      't351': {
        code: 'T351',
        title: 'T351 — T3 + controlled stretching (1.5-3%)',
        process: 'T3 처리 후 1.5-3% controlled stretching → 잔류응력 최소화',
        resulting: 'σy 345 MPa · UTS 485 MPa · El 18% · 잔류응력 < 50 MPa',
        useCase: '정밀 machining 부품 — 잔류응력 distortion 회피.',
        source: 'AA T-temper system',
      },
      't4': {
        code: 'T4',
        title: 'T4 — solution treated + naturally aged',
        process: 'Solution 495°C / WQ → naturally aged 4+ days (RT, no CW)',
        resulting: 'σy 290 MPa · UTS 425 MPa · El 19%',
        useCase: 'Pre-forming 부품 (cold working 가능). 후 artificial aging (T6) 으로 강화 가능.',
        source: 'AA / MMPDS',
      },
      't6': {
        code: 'T6',
        title: 'T6 — solution treated + artificially aged (peak)',
        process: 'Solution 495°C / WQ → Artificial aging 190°C / 9-12 h',
        resulting: 'AA 2024-T6: σy 395 MPa · UTS 470 MPa · El 10% (peak strength)',
        useCase: '강도 우선 부품 — wing spar, 항공 frame.',
        caveat: '2024-T6 은 T3 보다 fatigue 낮음 → fuselage 는 T3 권장.',
        source: 'AA T-temper',
      },
      't8': {
        code: 'T8',
        title: 'T8 — solution + CW + artificially aged',
        process: 'Solution → CW 5-10% → artificial aging 190°C',
        resulting: 'σy 450 MPa · UTS 480 MPa · El 6% (T6 대비 +14% σy)',
        useCase: '항공 panel / sheet — T3 보다 강도 ↑ + T6 보다 fatigue ↑',
        source: 'AA / Constellium',
      },
    },
  },

  // ========================================
  // Aluminum 6xxx (Al-Mg-Si, 6061 typical)
  // ========================================
  {
    alloyPattern: /aa\s?6061|^6061|aa\s?6063|^6063|aa\s?6082|^6082|aa\s?6151|aluminum.*6xxx/i,
    familyName: 'AA 6xxx Al-Mg-Si (6061, 6063, 6082, 6151)',
    conditions: {
      't4': {
        code: 'T4',
        title: 'T4 — solution + naturally aged',
        process: 'Solution 530°C / WQ → naturally aged 4+ days (RT)',
        resulting: 'AA 6061-T4: σy 145 MPa · UTS 240 MPa · El 22% (formable)',
        useCase: 'Cold-forming / bending 후 T6 aging — 자동차 panel, 자전거 frame welding 후.',
        source: 'AA T-temper',
      },
      't6': {
        code: 'T6',
        title: 'T6 — peak Mg₂Si precipitation (160°C aged)',
        process: 'Solution 530°C / WQ → Artificial aging 175°C / 8 h (6061) — Mg₂Si precipitate peak',
        resulting: 'AA 6061-T6: σy 275 MPa · UTS 310 MPa · El 12% · KIC 35 MPa·√m',
        useCase: '구조 frame, 자동차 bumper, 자전거 frame, 의료 walker. 가공·용접·내식 모두 양호.',
        caveat: 'AA 7075-T6 와 동일 명칭이지만 peak σy 1/2 수준 (Al-Zn 이 Al-Mg-Si 보다 강함).',
        source: 'AA T-temper / Kaiser Aluminum AA 6061 datasheet',
      },
      't651': {
        code: 'T651',
        title: 'T651 — T6 + controlled stretching',
        process: 'T6 처리 후 1.5-3% stretching → 잔류응력 ↓',
        resulting: 'σy 275 MPa · UTS 310 MPa · El 12% · 잔류응력 < 30 MPa',
        useCase: '정밀 가공 후 distortion 회피 — 항공기 fitting, 의료 implant.',
        source: 'AA T-temper',
      },
      't5': {
        code: 'T5',
        title: 'T5 — cooled from extrusion + aged',
        process: '압출 후 즉시 cooled (air cool) → artificial aging 175°C',
        resulting: 'AA 6063-T5: σy 145 MPa · UTS 185 MPa (압출 표준)',
        useCase: '건축 extrusion (창호 frame, decorative trim). 압출 → 즉시 aging cost 효율.',
        source: 'AA T-temper',
      },
    },
  },

  // ========================================
  // Aluminum 7xxx (Al-Zn-Mg, 7075 typical)
  // ========================================
  {
    alloyPattern: /aa\s?7075|^7075|aa\s?7050|^7050|aa\s?7068|^7068|aluminum.*7xxx/i,
    familyName: 'AA 7xxx Al-Zn-Mg (7075, 7050, 7068)',
    conditions: {
      't6': {
        code: 'T6',
        title: 'T6 — peak η phase precipitation (120°C aged)',
        process: 'Solution 460-490°C / WQ → Artificial aging 120°C / 24 h — η (MgZn₂) peak precipitate',
        resulting: 'AA 7075-T6: σy 505 MPa · UTS 570 MPa · El 11% · KIC 26 MPa·√m',
        useCase: '항공 wing skin, fuselage frame, F1 monocoque — Al alloy 중 최고급 강도.',
        caveat: 'SCC 우려 ↑↑ (해양·습기 환경 위험). T7351 / T7451 over-aging 으로 SCC 저항 ↑.',
        source: 'AA T-temper / MMPDS-2018',
      },
      't651': {
        code: 'T651',
        title: 'T651 — T6 + controlled stretching',
        process: 'T6 처리 + 1.5-3% stretching → 잔류응력 minimize',
        resulting: 'σy 505 MPa · UTS 570 MPa · El 11% · 잔류응력 < 30 MPa',
        useCase: '정밀 항공 부품 — 잔류응력 distortion 없이 machining.',
        source: 'AA T-temper',
      },
      't73': {
        code: 'T73',
        title: 'T73 — over-aged for SCC resistance',
        process: 'Solution → 1차 aging 120°C / 5 h → 2차 over-aging 165°C / 24 h',
        resulting: 'σy 430 MPa · UTS 505 MPa · El 13% · SCC 저항 ↑↑',
        useCase: '해양 환경 항공 부품 — wing spar, landing gear. T6 대비 σy 15% ↓ but SCC 무시.',
        source: 'AA T-temper / Boeing BPS 4350',
      },
      't7351': {
        code: 'T7351',
        title: 'T7351 — T73 + stretched + SCC resistant',
        process: 'T73 over-aging + 1.5-3% stretching',
        resulting: 'σy 470 MPa · UTS 540 MPa · SCC ↑↑',
        useCase: '항공기 frame, bulkhead — fatigue + SCC 모두 보장.',
        source: 'AA T-temper',
      },
      't7451': {
        code: 'T7451',
        title: 'T7451 — T74 over-aged + stretched',
        process: 'Solution → over-aging 163°C → 1-3% stretching',
        resulting: 'σy 460 MPa · UTS 525 MPa · El 12% · SCC ↑',
        useCase: 'T7351 과 유사. 두꺼운 plate (>50mm) 권장.',
        source: 'AA T-temper / AMS 4117',
      },
    },
  },

  // ========================================
  // Maraging 18Ni-Co 250 / 300 / 350
  // ========================================
  {
    alloyPattern: /maraging\s?250|m-?250|vascomax\s?c-?250|k92890/i,
    familyName: 'Maraging 250 / VascoMax C-250 (18Ni-7Co-5Mo)',
    conditions: {
      'aged': {
        code: 'Aged',
        title: 'Aged — 482°C maraging precipitation',
        process: 'Solution 815°C / 1 h / AC (martensite) → Aged 482°C / 3-6 h / AC (Ni₃Mo/Ni₃Ti precipitate)',
        resulting: 'σy 1670 MPa (typical) · UTS 1750 MPa · El 6% · KIC 85 MPa·√m · HRC 50',
        useCase: '미사일 case, 항공 forging, jet 엔진 shaft, 정밀 punch/die — UHS + tough martensite.',
        caveat: 'Aging 시간 변화: 482°C/3h (min spec UTS 1730) → 482°C/6h (peak UTS 1750-1860).',
        source: 'AMS 6512 / ASM Vol.4',
      },
      'maraged 482°c/3h (typical)': {
        code: 'Maraged 482°C/3h',
        title: 'Maraged 482°C/3h — typical condition',
        process: 'Solution 820°C / 1h / AC → Aged 482°C (900°F) / 3 h / AC',
        resulting: 'σy 1670 MPa · UTS 1750 MPa · El 6% · KIC 85',
        useCase: 'AMS 6512 standard. 표준 production grade.',
        source: 'AMS 6512',
      },
      'maraged 482°c/6h (peak strength)': {
        code: 'Maraged 482°C/6h',
        title: 'Maraged 482°C/6h — peak strength',
        process: 'Solution 820°C / 1h / AC → Aged 482°C / 6 h / AC (peak precipitate)',
        resulting: 'σy 1810 MPa · UTS 1870 MPa · El 5% · KIC 80',
        useCase: 'Aerospace structural component, missile case — 최고 강도.',
        source: 'AMS 6512 / Vascomax 250 datasheet',
      },
      'annealed': {
        code: 'Annealed',
        title: 'Annealed — solution treated (forming/machining)',
        process: 'Heated 815°C / 1 h / AC → soft austenite + martensite',
        resulting: 'σy 760 MPa · UTS 970 MPa · El 18% · HRC 32',
        useCase: '가공 / 용접 / 성형 후 aging 으로 강화. Machinability 30+% (4140 대비 ↑).',
        source: 'AMS 6512 / ATI C-250 datasheet',
      },
    },
  },
  {
    alloyPattern: /maraging\s?300|m-?300|vascomax\s?c-?300|k93120|18ni-?300/i,
    familyName: 'Maraging 300 / VascoMax C-300 (18Ni-9Co-5Mo)',
    conditions: {
      'aged': {
        code: 'Aged',
        title: 'Aged — 482°C maraging precipitation',
        process: 'Solution 820°C / 1 h / AC → Aged 482°C / 6 h / AC',
        resulting: 'σy 1960 MPa · UTS 2030 MPa · El 6% · KIC 80 MPa·√m · HRC 53',
        useCase: '미사일 motor case, jet 엔진 shaft, recoil spring, high-performance fastener.',
        source: 'AMS 6514 / ATI C-300',
      },
      'solution treated': {
        code: 'Solution Treated',
        title: 'Solution Annealed (forming)',
        process: 'Heated 820°C / 1 h / AC',
        resulting: 'σy 760 MPa · UTS 1000 MPa · El 17% · HRC 32',
        useCase: 'Pre-aging — 가공 / 용접 후 aging.',
        source: 'AMS 6514',
      },
    },
  },
  {
    alloyPattern: /maraging\s?350|c-?350|vascomax\s?c-?350|18ni-?350/i,
    familyName: 'Maraging 350 / ATI C-350 (18Ni-12Co)',
    conditions: {
      'aged': {
        code: 'Aged',
        title: 'Aged — 482-510°C peak (350 ksi UTS)',
        process: 'Solution 815°C / 1 h / AC → Aged 482-510°C / 3-6 h / AC',
        resulting: 'σy 2310 MPa (335 ksi) · UTS 2413 MPa (350 ksi) · El 6% · KIC 55 MPa·√m · HRC 53-55',
        useCase: 'Aerospace의 ultra-high strength — Trident missile case, wind tunnel model, recoil spring.',
        caveat: 'KIC 55 — 충격 부적합. 정적 부하 only. Co 12% → 가격 ↑ (vs C-300).',
        source: 'AMS 6520 / ATI C-350 datasheet',
      },
      'solution annealed': {
        code: 'Solution Annealed',
        title: 'Solution Annealed (soft, pre-aging)',
        process: 'Heated 815°C / 1 h / AC',
        resulting: 'σy 800 MPa · UTS 1100 MPa · El 16% · HRC 32',
        useCase: 'Cold/hot forming, machining, welding 후 aging.',
        source: 'AMS 6520 / ATI',
      },
    },
  },

  // ========================================
  // Inconel 718 (UNS N07718) — γ" precipitation
  // ========================================
  {
    alloyPattern: /inconel\s?718|in[\s-]?718|n07718|alloy\s?718/i,
    familyName: 'Inconel 718 (UNS N07718)',
    conditions: {
      'sta': {
        code: 'STA',
        title: 'STA — Solution + Single Aged (γ\'\' peak)',
        process: 'Solution 980°C / 1 h / WQ → Aged 720°C / 8 h / FC → 620°C / 8 h / AC',
        resulting: 'σy 1100 MPa · UTS 1280 MPa · El 12% · KIC 100 MPa·√m · 650°C 까지 고강도 유지',
        useCase: 'Jet 엔진 disk, blade, bolt, combustor — 최대 -100°C ~ +650°C 사용 가능.',
        caveat: 'γ" 가 650°C 이상에서 over-aged → 강도 손실. 700°C+ 는 IN625/Waspaloy 권장.',
        source: 'AMS 5662 / Special Metals SMC-045',
      },
      'dsa': {
        code: 'DSA',
        title: 'DSA — Solution + Double Aged (full strength)',
        process: 'Solution 980°C / 1 h / WQ → 720°C / 8 h / FC → 620°C / 8 h / AC (standard 2-step)',
        resulting: 'σy 1100 MPa · UTS 1280 MPa · El 12% · 650°C 안정',
        useCase: 'STA 와 동일. \"Double aged\" = standard 2-step aging (AMS 5662).',
        source: 'AMS 5662',
      },
      'aged': {
        code: 'Aged',
        title: 'Aged — Standard precipitation hardening',
        process: 'Solution 980°C → 720°C / 8 h + 620°C / 8 h',
        resulting: 'σy 1100 MPa · UTS 1280 MPa · El 12%',
        useCase: 'Jet 엔진 component 표준 condition.',
        source: 'AMS 5662',
      },
      'solution treated': {
        code: 'Solution Treated',
        title: 'Solution Treated only (no aging)',
        process: 'Solution 980°C / 1 h / WQ — γ\" 미형성',
        resulting: 'σy 770 MPa · UTS 920 MPa · El 50% (formable)',
        useCase: 'Forming / welding 전 condition. 후 aging 필요.',
        source: 'AMS 5664',
      },
      'annealed': {
        code: 'Annealed',
        title: 'Annealed (mill product)',
        process: 'Hot-rolled or forged + annealed 980°C',
        resulting: 'σy 770 MPa · UTS 920 MPa · El 30-50%',
        useCase: 'Forming / welding before aging.',
        source: 'AMS 5663',
      },
    },
  },

  // ========================================
  // Ti-6Al-4V (Grade 5 / Grade 23 ELI)
  // ========================================
  {
    alloyPattern: /ti-?6al-?4v|ti6al4v|r56400|r56407|grade\s?5\b|grade\s?23|tigr5/i,
    familyName: 'Ti-6Al-4V (UNS R56400 Grade 5 / R56407 Grade 23 ELI)',
    conditions: {
      'mill annealed': {
        code: 'Mill Annealed',
        title: 'Mill Annealed — α+β duplex (standard)',
        process: 'Hot-worked + annealed 700-790°C / 1-4 h / AC',
        resulting: 'σy 880 MPa · UTS 950 MPa · El 14% · KIC 75 MPa·√m',
        useCase: '의료 implant (Grade 23 ELI), 항공 spar, motorcycle frame — Ti 표준 grade.',
        source: 'AMS 4928 / ASTM F136 (ELI)',
      },
      'annealed': {
        code: 'Annealed',
        title: 'Annealed (mill product, α+β refined)',
        process: 'Annealed 700-790°C',
        resulting: 'σy 850 MPa · UTS 950 MPa · El 15% · KIC 75',
        useCase: 'Aerospace structural + 의료 implant.',
        source: 'AMS 4928',
      },
      'sta': {
        code: 'STA',
        title: 'STA — Solution Treated + Aged (high-strength)',
        process: 'Solution 900-950°C / WQ → Aged 480-540°C / 4-8 h / AC',
        resulting: 'σy 1100 MPa · UTS 1170 MPa · El 10% · KIC 50 MPa·√m',
        useCase: '항공 landing gear, fastener — peak strength. 의료 implant 부적합 (KIC ↓).',
        caveat: 'KIC ↓ + biocompatibility ↓ → 의료용은 mill annealed Grade 23 ELI 권장.',
        source: 'AMS 4965',
      },
      'beta annealed': {
        code: 'β-annealed',
        title: 'β-annealed (high-toughness, coarse grain)',
        process: 'Annealed > 995°C (β-transus 위) → AC or slow cool',
        resulting: 'σy 800 MPa · UTS 900 MPa · El 12% · KIC 90 MPa·√m',
        useCase: 'Heavy section 부품, dam-tolerant 구조 — coarse β grain + fine α plate.',
        source: 'AMS 4928 / Allegheny Technologies',
      },
      'hip': {
        code: 'HIP',
        title: 'HIP — Hot Isostatic Press (AM 표준)',
        process: '900-955°C / 100-150 MPa Ar / 2-4 h — 기공 closure',
        resulting: 'σy 900 MPa · UTS 1000 MPa · El 14% · KIC 80 (vs as-built 60)',
        useCase: 'AM Ti-6Al-4V 표준 후처리. 피로 강도 +30%, 기공 < 1%.',
        source: 'ASTM F3001 / NASA STD-6030',
      },
      'as-built': {
        code: 'As-built (LPBF)',
        title: 'As-built — LPBF acicular α+β\'',
        process: 'LPBF 후 처리 없음. acicular α+β\' martensitic 미세조직.',
        resulting: 'σy 750-1000 MPa · UTS 850-1100 MPa · El 6-12% · KIC 50 (피로 ↓)',
        useCase: 'Prototype only — 잔류응력 + 기공 위험. HIP + annealing 권장.',
        source: 'EOS / Renishaw / ASTM F3001',
      },
    },
  },

  // ========================================
  // Beryllium Copper C17200 (CuBe2)
  // ========================================
  {
    alloyPattern: /c17200|cube2?\b|beryllium\s?copper|moldmax/i,
    familyName: 'BeCu C17200 (CuBe2, UNS C17200)',
    conditions: {
      'tf00': {
        code: 'TF00',
        title: 'TF00 — Solution + Peak Aged (Moldmax HH)',
        process: 'Solution 800°C / WQ → Aged 315°C / 2-3 h / AC — γ phase peak',
        resulting: 'σy 870-965 MPa · UTS 1090-1200 MPa · El 15-30% · HRC 35-40 · σf 770 MPa',
        useCase: 'Spring, switch contact, 사출 mold (Moldmax HH) — 강도 + 전도성 (22% IACS).',
        source: 'Materion C17200 datasheet / ASTM B196',
      },
      'th04': {
        code: 'TH04',
        title: 'TH04 — Cold Worked + Peak Aged (high-strength)',
        process: 'Solution → Cold-rolled 37% → Aged 315°C / 2 h / AC',
        resulting: 'σy 965-1140 MPa · UTS 1170-1300 MPa · El 2-5% · HRC 42 · σf 820 MPa',
        useCase: '극한 강도 spring, electrical 미세 contact — TF00 보다 +10% strength.',
        caveat: 'El 2-5% — bending 부적합. forming 후 TH04 처리 권장.',
        source: 'Materion C17200',
      },
      'tb00': {
        code: 'TB00',
        title: 'TB00 — Solution Treated (soft, formable)',
        process: 'Solution 800°C / WQ',
        resulting: 'σy 200-380 MPa · UTS 410-540 MPa · El 35-50% (formable)',
        useCase: 'Cold forming / drawing / bending 후 aging (TF00 / TH04).',
        source: 'Materion / ASTM B196',
      },
    },
  },

  // ========================================
  // Tool Steel H13 (AISI H13 / SKD61)
  // ========================================
  {
    alloyPattern: /\bh13\b|skd61|x40crmov5|tool.*hot|hot.*tool/i,
    familyName: 'Tool steel H13 (AISI H13 / DIN 1.2344 / JIS SKD61)',
    conditions: {
      'q+t (single 550°c × 2)': {
        code: 'Q+T 540°C (HRC 50)',
        title: 'Q+T — Tempered 540°C × 2 (HRC 50)',
        process: '1010°C / OQ → Tempered 540°C / 2 h × 2 (double temper for stability)',
        resulting: 'σy 1380 MPa · UTS 1700 MPa · El 10% · HRC 50 · KIC 24',
        useCase: 'Mold for Al casting (low service temp), forging die — 인성 우선.',
        source: 'AISI H13 / Bohler W302 datasheet',
      },
      'q+t (double 540°c × 2)': {
        code: 'Q+T 540°C (HRC 53)',
        title: 'Q+T — Tempered 540°C × 2 (HRC 53, peak)',
        process: '1020°C / OQ → 540°C / 2 h × 2 (peak hardness)',
        resulting: 'σy 1450 MPa · UTS 1750 MPa · El 8% · HRC 53 · KIC 24',
        useCase: 'Hot forging die (high), die-casting mold (Al/Mg), extrusion die.',
        source: 'AISI H13 / Granta verified',
      },
      'q+t (610°c, softer)': {
        code: 'Q+T 610°C (HRC 44)',
        title: 'Q+T — Tempered 610°C (HRC 44, soft)',
        process: '1020°C / OQ → Tempered 610°C / 2 h',
        resulting: 'σy 1100 MPa · UTS 1380 MPa · El 13% · HRC 44 · KIC 30',
        useCase: 'Toughness 우선 — shock-resisting tool, punch.',
        source: 'AISI H13',
      },
      'annealed (soft)': {
        code: 'Annealed',
        title: 'Annealed — Mill product (soft, machinable)',
        process: 'Spheroidize annealed 860°C / 2 h / FC',
        resulting: 'σy 600 MPa · UTS 800 MPa · El 25% · HRC 22',
        useCase: '구매 후 machining 단계. 가공 후 Q+T 처리.',
        source: 'AISI H13',
      },
    },
  },

  // ========================================
  // 9% Ni A553 LNG (cryogenic)
  // ========================================
  {
    alloyPattern: /a553|9\s?%?\s?ni|9ni/i,
    familyName: 'ASTM A553 9% Ni cryogenic steel',
    conditions: {
      'double-normalized + tempered (dn+t, 770°c/645°c/580°c)': {
        code: 'DN+T (Type I)',
        title: 'Double Normalized + Tempered — DN+T (ASTM A553 Type I)',
        process: 'Normalized 770°C → Normalized 645°C → Tempered 580°C (3-step)',
        resulting: 'σy 585 MPa · UTS 690-825 MPa · El 22% · -196°C Charpy 100J+ · KIC 130',
        useCase: 'LNG storage tank inner shell (Moss / membrane), pressure vessel — IGC code.',
        source: 'ASTM A553 / ASME B&PV Sec.VIII Para UHA-23',
      },
      'q+t (800°c wq + 580°c t)': {
        code: 'Q+T (Type II)',
        title: 'Quenched + Tempered (ASTM A553 Type II)',
        process: 'Quenched 800°C / WQ → Tempered 580°C',
        resulting: 'σy 620 MPa · UTS 720 MPa · El 20% · -196°C Charpy 100J+',
        useCase: 'Type I 대비 강도 약간 ↑ + 동등 cryogenic toughness. 비용 효율 alternative.',
        source: 'ASTM A553',
      },
    },
  },

  // ========================================
  // 22MnB5 USIBOR 1500 (Press-Hardening Steel)
  // ========================================
  {
    alloyPattern: /22mnb5|usibor|press.?hardening/i,
    familyName: '22MnB5 / USIBOR 1500 PHS (ArcelorMittal)',
    conditions: {
      'high-ductility blank': {
        code: 'High-ductility blank',
        title: 'High-ductility blank — pre-stamping (ferrite-pearlite)',
        process: 'Hot-rolled / cold-rolled blank (no HT)',
        resulting: 'σy 400 MPa · UTS 580 MPa · El 25%',
        useCase: 'Hot-stamping 전 형상 가공 단계. Press 직전 form.',
        source: 'BS EN 10083-3 / ArcelorMittal Ductibor',
      },
      'austenitized + h2o quenched + alsi coated': {
        code: 'Hot-stamped (PHS peak)',
        title: 'Austenitized + H₂O Quenched — Hot-stamped peak (AlSi coated)',
        process: 'Heated 900-950°C / 5 min (austenitize) → Press-Hardened in die + H₂O quench (1-3 sec)',
        resulting: 'σy 1100 MPa · UTS 1500 MPa · El 6% · HV 470 (full martensite)',
        useCase: '자동차 B-pillar, door beam, bumper, rocker reinforcement — 충돌 흡수.',
        source: 'BS EN 10083-3 / ArcelorMittal USIBOR 1500',
      },
      'hot-stamped + 200°c tempered': {
        code: 'Hot-stamped + 200°C tempered',
        title: 'Hot-stamped + 200°C tempered (slightly tougher)',
        process: 'Hot-stamped → Tempered 200°C / 1 h',
        resulting: 'σy 950 MPa · UTS 1300 MPa · El 8% · HV 410',
        useCase: 'Hot-stamped 대비 인성 ↑ + 강도 ↓ — 일부 BIW 부품.',
        source: 'ArcelorMittal USIBOR',
      },
    },
  },
];

const NORMALIZE = (s: string) => String(s || '').toLowerCase().trim();

/**
 * Lookup alloy-specific HT description.
 * @param materialName 재료 이름 (e.g., "17-4 PH (UNS S17400) — H900")
 * @param heatTreatment heat_treatment 필드 (optional, e.g., "H900")
 * @returns Alloy-specific HT description or undefined if no match
 */
export function htAlloySpecificFor(
  materialName: string,
  heatTreatment?: string | null,
): { family: AlloyHtFamily; description: AlloyHtDescription } | undefined {
  const nameStr = NORMALIZE(materialName);
  if (!nameStr) return undefined;
  const htStr = NORMALIZE(heatTreatment || '');

  for (const family of FAMILIES) {
    if (!family.alloyPattern.test(materialName)) continue;
    // Try heat_treatment field first
    if (htStr) {
      for (const [code, desc] of Object.entries(family.conditions)) {
        if (htStr === code || htStr.startsWith(code + ' ') || htStr.includes(code)) {
          return { family, description: desc };
        }
      }
    }
    // Then try material name (for "17-4 PH — H900" pattern)
    for (const [code, desc] of Object.entries(family.conditions)) {
      const codeNorm = code.toLowerCase();
      // Match standalone code (e.g., "H900" as word, T6 as word)
      const re = new RegExp(`\\b${codeNorm.replace(/[+().°]/g, '\\$&')}\\b`, 'i');
      if (re.test(nameStr)) return { family, description: desc };
    }
  }
  return undefined;
}
