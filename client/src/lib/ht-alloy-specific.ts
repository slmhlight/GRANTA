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

export const FAMILIES: AlloyHtFamily[] = [
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
        title: 'T6 — peak Mg₂Si precipitation (175°C aged)', // R205 F13 — title/process 온도 통일
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
  // AlSi cast / AM (AlSi10Mg, AlSi12, A357)
  // ========================================
  {
    alloyPattern: /alsi\s?10\s?mg|alsi\s?12|alsi\s?7\s?mg|a356|a357|^alsi/i,
    familyName: 'AlSi cast / AM (AlSi10Mg, AlSi12, A357)',
    conditions: {
      'as-built': {
        code: 'As-built',
        title: 'As-built (LPBF / DMLS) — α-Al + eutectic Si network',
        process: 'No post-heat. Microstructure: fine α-Al cell (~0.5 μm) surrounded by eutectic Si network.\n' +
                 '결정질화 (solidification rate ~10⁶ K/s) 로 normal cast 보다 σy 50% ↑.',
        resulting: 'AlSi10Mg LPBF as-built: σy 250-280 MPa · UTS 430-460 MPa · El 6-10% · 잔류응력 200 MPa+',
        useCase: '경량 brackets, heat exchangers, fluidic manifolds. 잔류응력 우려 시 stress-relief 권장.',
        caveat: '잔류응력 200 MPa 이상 — 박판 / overhang 부품 cracking 위험. Stress-relief 또는 T5 권장.',
        source: 'EOS AlSi10Mg datasheet / SLM Solutions / ASTM F3318',
      },
      'stress-relieved': {
        code: 'Stress-relieved',
        title: 'Stress-relieved 300°C / 2 h — 잔류응력 해소 + 강도 유지',
        process: 'Furnace 300°C / 2 h / FC (slow furnace cooling).\nMg 석출은 partially preserved → as-built 대비 강도 손실 작음.',
        resulting: 'σy 200-230 MPa · UTS 380-420 MPa · El 8-12% · 잔류응력 < 50 MPa',
        useCase: '정밀 machining 부품 — distortion 회피. As-built 대비 σy 15% ↓ but ductility ↑.',
        source: 'EOS AlSi10Mg datasheet / Renishaw AM process guide',
      },
      't6': {
        code: 'T6',
        title: 'T6 — solution + WQ + artificial aged (peak strength)',
        process: 'Solution 525-535°C / 1-6 h / WQ → Aged 160-170°C / 6-10 h / AC.\n' +
                 'Mg₂Si precipitate peak — 강도 ↑↑.\n' +
                 '단, LPBF 부품은 solution 시 eutectic Si network 분해 → ductility 변동.',
        resulting: 'AlSi10Mg T6 (LPBF): σy 230-290 MPa · UTS 330-380 MPa · El 3-6%\n' +
                   'Cast A357 T6: σy 250-280 MPa · UTS 310-340 MPa · El 5-7%',
        useCase: 'Critical 부품 — strength 우선, ductility 약간 손실 허용.',
        caveat: 'LPBF AlSi10Mg 는 T6 후 ductility 가 as-built 보다 낮을 수 있음 (Si 분해 + 입계 변화).\n' +
                 '고연성 필요 시 stress-relieved 또는 modified-T6 (lower solution temp) 권장.',
        source: 'EOS AlSi10Mg / Renishaw / AMS 4289 (A357)',
      },
      'aged': { // alias for T6
        code: 'Aged',
        title: 'Aged (T6 equivalent) — peak strength',
        process: 'Solution + WQ + artificial aging — see T6 above.',
        resulting: '~T6: σy 230-290 MPa · UTS 330-380 MPa',
        useCase: 'AlSi cast/AM heat-treatable 표준.',
        source: 'EOS / AMS 4289',
      },
      'heat-treated': { // alias for T6
        code: 'Heat-Treated',
        title: 'Heat-Treated (T6) — peak strength',
        process: 'Solution + WQ + artificial aging — see T6.',
        resulting: '~T6 results.',
        useCase: 'AlSi cast/AM peak strength condition.',
        source: 'EOS AlSi10Mg / AMS 4289',
      },
      'annealed': {
        code: 'Annealed',
        title: 'Annealed (Full-Anneal) — 최대 연성',
        process: 'Furnace 350-400°C / 2-4 h / FC. Si network coarsening + Mg₂Si dissolution.',
        resulting: 'AlSi10Mg annealed: σy 80-110 MPa · UTS 150-200 MPa · El 15-20%',
        useCase: '심한 forming 필요 시. Cold work 후 재 anneal cycle 도 가능.',
        source: 'AA Annealing standards',
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
    /* R205 F8 — 718Plus 제외 (negative lookahead): 718Plus 는 aging cycle 다름 (788+704°C). */
    alloyPattern: /inconel\s?718(?!\s?plus)|in[\s-]?718(?!\s?plus)|n07718|alloy\s?718(?!\s?plus)/i,
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
        resulting: 'σy 480 MPa · UTS 1000 MPa · El 30-50% (formable)', // R205 F12 — 770 은 과대 (annealed 718 σy ~450-550)
        useCase: 'Forming / welding 전 condition. 후 aging 필요.',
        source: 'AMS 5664',
      },
      'annealed': {
        code: 'Annealed',
        title: 'Annealed (mill product)',
        process: 'Hot-rolled or forged + annealed 980°C',
        resulting: 'σy 450-550 MPa · UTS 900-1000 MPa · El 30-50%', // R205 F12 정정
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
        process: '1010°C / AQ (air-hardening) → Tempered 540°C / 2 h × 2 (double temper for stability)',
        resulting: 'σy 1380 MPa · UTS 1700 MPa · El 10% · HRC 50 · KIC 24',
        useCase: 'Mold for Al casting (low service temp), forging die — 인성 우선.',
        source: 'AISI H13 / Bohler W302 datasheet',
      },
      'q+t (double 540°c × 2)': {
        code: 'Q+T 540°C (HRC 53)',
        title: 'Q+T — Tempered 540°C × 2 (HRC 53, peak)',
        process: '1020°C / AQ (air-hardening) → 540°C / 2 h × 2 (peak hardness)',
        resulting: 'σy 1450 MPa · UTS 1750 MPa · El 8% · HRC 53 · KIC 24',
        useCase: 'Hot forging die (high), die-casting mold (Al/Mg), extrusion die.',
        source: 'AISI H13 / Granta verified',
      },
      'q+t (610°c, softer)': {
        code: 'Q+T 610°C (HRC 44)',
        title: 'Q+T — Tempered 610°C (HRC 44, soft)',
        process: '1020°C / AQ (air-hardening) → Tempered 610°C / 2 h',
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
    /* R205 F9 — '9ni' 단독 패턴이 'HP 9-4-30 (9Ni-4Co)' 매칭하던 false positive 제거. */
    alloyPattern: /a553|9\s?%\s?ni|9ni\s?steel|9%\s?nickel/i,
    familyName: 'ASTM A553 9% Ni cryogenic steel',
    conditions: {
      'double-normalized + tempered (dn+t, 770°c/645°c/580°c)': {
        code: 'DN+T (Type I)',
        title: 'Double Normalized + Tempered — DN+T (ASTM A553 Type I)',
        /* R205 F10 — 온도 정정: 1차 normalize 885-925°C, 2차 760-815°C, temper 540-605°C (이전 770/645/580 은 QLT 와 혼동). */
        process: '1차 Normalized 900°C → 2차 Normalized 790°C → Tempered 570°C (3-step)',
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
  // R141b — Austenitic stainless steel 304 / 304L (UNS S30400 / S30403)
  // ========================================
  {
    alloyPattern: /\b304l?\b|s30400|s30403|aisi\s?304|1\.430[01]/i,
    familyName: 'Austenitic SS 304 / 304L (UNS S30400 / S30403)',
    conditions: {
      'annealed': {
        code: 'Annealed',
        title: 'Annealed — Solution treated (standard mill)',
        process: 'Solution 1040-1120°C / WQ 또는 rapid AC — C 고용 + carbide 분해',
        resulting: 'σy 205-240 MPa · UTS 515-620 MPa · El 40-60% · KIC > 100 · HV 160',
        useCase: '식품·화학 plant, 건축 외장, 주방기구 — 가장 보편적 SS. 0°C 이하도 toughness 유지.',
        caveat: '용접부 sensitization (475-815°C carbide 석출) → corrosion 위험 → L grade or stabilized (321) 권장.',
        source: 'ASTM A240 / ASM Vol.1 Austenitic SS',
      },
      'as-built': {
        code: 'As-built (LPBF)',
        title: 'As-built — LPBF cellular austenite',
        process: 'LPBF 후 처리 없음. 미세 cellular dislocation 구조 + retained austenite.',
        resulting: 'σy 480 MPa · UTS 660 MPa · El 35% · HV 220 (cold-worked 와 유사)',
        useCase: 'AM prototype. cellular 구조 효과로 wrought annealed 보다 강도 ↑.',
        caveat: '잔류응력 + 이방성 → solution anneal (1050°C/1h/WQ) 권장.',
        source: 'EOS StainlessSteel 316L / 304L AM (ASTM F3184)',
      },
    },
  },

  // ========================================
  // Austenitic stainless steel 316 / 316L (UNS S31600 / S31603)
  // ========================================
  {
    alloyPattern: /\b316l?\b|s31600|s31603|aisi\s?316|1\.440[14]/i,
    familyName: 'Austenitic SS 316 / 316L (UNS S31600 / S31603)',
    conditions: {
      'annealed': {
        code: 'Annealed',
        title: 'Annealed — Solution treated (Mo 추가 → pitting ↑)',
        process: 'Solution 1040-1120°C / WQ — austenite 단상 + Mo 고용',
        resulting: 'σy 205-240 MPa · UTS 515-620 MPa · El 40-60% · PREN 24 (vs 304: 18)',
        useCase: '해양·염화물 환경, 화학 plant pipe, 의료 implant (316LVM), 해상 fastener.',
        caveat: '용접 후 sensitization → 316L (C ≤ 0.03%) 권장. PREN < 35 → 해수 침지 시 crevice corrosion 가능.',
        source: 'ASTM A240 / AMS 5650 / ASM Vol.1',
      },
      'as-built': {
        code: 'As-built (LPBF)',
        title: 'As-built — LPBF cellular austenite (316L AM 표준)',
        process: 'LPBF 후 처리 없음. fine cellular dislocation + Mo segregation',
        resulting: 'σy 500-590 MPa · UTS 640-770 MPa · El 40-50% (이방성)',
        useCase: 'AM 의료 implant, 해양 부품, microfluidic. cellular 구조 → wrought 대비 강도 ↑.',
        caveat: 'Z-축 ductility ↓ → solution anneal (1050°C/1h/WQ) 시 strength ↓ but isotropic.',
        source: 'EOS StainlessSteel 316L / ASTM F3184',
      },
      'solution treated': {
        code: 'Solution Treated',
        title: 'Solution Treated (AM 후처리)',
        process: '1050°C / 1 h / WQ — cellular 구조 해소 → wrought-like 균일',
        resulting: 'σy 230 MPa · UTS 590 MPa · El 55%',
        useCase: 'AM 후 isotropy + ductility 회복. 의료·식품 application 표준.',
        source: 'ASTM F3184 / NASA STD-6030',
      },
    },
  },

  // ========================================
  // R141b — Duplex SS — ZERON 100 / 25Cr / Super-duplex
  // ========================================
  {
    alloyPattern: /zeron\s?100|s32760|sd\s?25cr|super.?duplex/i,
    familyName: 'Super-duplex SS ZERON 100 (UNS S32760, 25Cr-7Ni-3Mo-W-Cu)',
    conditions: {
      'solution annealed': {
        code: 'Solution Annealed',
        title: 'Solution Annealed — α+γ duplex (50:50)',
        process: 'Solution 1100-1150°C / 30 min / WQ (rapid) — α + γ 50/50 balance',
        resulting: 'σy 550-620 MPa · UTS 750-900 MPa · El 25% · PREN 42+ · KIC 100',
        useCase: '해양 platform, sour service (H₂S), 화학 plant — chloride SCC + pitting 최강.',
        caveat: 'WQ rate ↓ 시 σ-phase (475°C embrittlement) 석출 → KIC ↓↓. Welding heat input 제어 필수.',
        source: 'ASTM A789 / Rolled Alloys ZERON 100 datasheet',
      },
      'hot-rolled + qst': {
        code: 'Hot-rolled + Solution Treated',
        title: 'HR + Solution Treated (forging 표준)',
        process: 'Hot-rolled 1150°C → Solution treated 1100°C / WQ',
        resulting: 'σy 550 MPa · UTS 750 MPa · El 25% · -50°C Charpy 100J+',
        useCase: '해상 valve, sub-sea pipe, pump shaft — forging condition.',
        source: 'ASTM A276 / Rolled Alloys',
      },
    },
  },

  // ========================================
  // Duplex SS 2205 (UNS S32205, 22Cr-5Ni-3Mo)
  // ========================================
  {
    alloyPattern: /2205|s32205|s31803|duplex.?2205/i,
    familyName: 'Duplex SS 2205 (UNS S32205 / S31803, 22Cr-5Ni-3Mo)',
    conditions: {
      'solution annealed': {
        code: 'Solution Annealed',
        title: 'Solution Annealed — α+γ 50/50',
        process: 'Solution 1020-1100°C / WQ rapid',
        resulting: 'σy 450-520 MPa · UTS 655-860 MPa · El 25% · PREN 35 · -50°C Charpy 60J+',
        useCase: '화학 plant, 해상 pipe, 펄프·종이 산업 — 316L 대비 강도 2× + chloride 저항 우수.',
        caveat: '450-980°C 사용 금지 (σ-phase, χ-phase embrittlement). 용접 heat input 0.5-2.5 kJ/mm 권장.',
        source: 'ASTM A240 / Outokumpu 2205 datasheet',
      },
    },
  },

  // ========================================
  // Super-duplex 2507 (UNS S32750, 25Cr-7Ni-4Mo)
  // ========================================
  {
    alloyPattern: /2507|s32750|super.?duplex.?2507/i,
    familyName: 'Super-duplex SS 2507 (UNS S32750, 25Cr-7Ni-4Mo)',
    conditions: {
      'solution annealed': {
        code: 'Solution Annealed',
        title: 'Solution Annealed — α+γ + N stabilized',
        process: 'Solution 1025-1125°C / WQ — α+γ balanced + 0.27% N',
        resulting: 'σy 550 MPa · UTS 800-1000 MPa · El 25% · PREN 41 · -50°C Charpy 60J+',
        useCase: '해상 sub-sea, sour service, 펄프 표백 plant — chloride pitting 최고급.',
        caveat: 'σ-phase 위험 (700-900°C) — heat input strict. 480°C 이상 장시간 노출 금지.',
        source: 'ASTM A240 / Sandvik SAF 2507 datasheet',
      },
    },
  },

  // ========================================
  // R141b — AHSS DP980 (Dual-Phase 980 MPa class)
  // ========================================
  {
    alloyPattern: /dp\s?980|dp980|dual.?phase.?980/i,
    familyName: 'AHSS DP980 (Dual-Phase, ferrite + martensite)',
    conditions: {
      'as-rolled': {
        code: 'As-rolled (CR)',
        title: 'Cold-Rolled + intercritical annealed (DP 생성)',
        process: 'Cold-rolled → Intercritical annealed 760-830°C (α+γ) → rapid cool (water/gas) → α + 15-30% martensite',
        resulting: 'σy 550-700 MPa · UTS 980-1100 MPa · El 8-15% · BH200 50-60 MPa (bake-hardening)',
        useCase: '자동차 BIW (B-pillar reinforcement, door beam, rocker), bumper beam — 충돌 흡수 + formability.',
        caveat: 'Spot weld HAZ softening 위험 → laser welding 권장. Hydrogen embrittlement 주의.',
        source: 'WorldAutoSteel AHSS Guide / ArcelorMittal DP980',
      },
      'galvanealed': {
        code: 'Galvanealed (GA)',
        title: 'Galvanealed coated (자동차 외판)',
        process: 'DP980 base + hot-dip Zn-Fe (γ-phase) coating',
        resulting: 'σy 550 MPa · UTS 980 MPa · El 12% · 부식 저항 ↑',
        useCase: '자동차 외판 + 구조 동시 — 도장성 + 내식.',
        source: 'ArcelorMittal Usibor + Galv. portfolio',
      },
    },
  },

  // ========================================
  // AHSS TWIP1180 (TWinning Induced Plasticity, ~1180 MPa)
  // ========================================
  {
    alloyPattern: /twip\s?1180|twip1180|twip.*steel/i,
    familyName: 'AHSS TWIP1180 (TWinning Induced Plasticity, ~22 Mn)',
    conditions: {
      'cold-rolled': {
        code: 'CR Annealed',
        title: 'Cold-Rolled + Annealed (austenite + low SFE)',
        process: 'Cold-rolled → Annealed 800-900°C / rapid cool → austenite 단상 (low SFE = 18-25 mJ/m²)',
        resulting: 'σy 600-700 MPa · UTS 1050-1200 MPa · El 45-55% (deformation twinning)',
        useCase: '자동차 충돌 흡수 부재, 자전거 frame — 가공 경화 + 변형 흡수 극대화 (kJ/kg 최고).',
        caveat: 'Delayed fracture (H embrittlement) 위험. Welding 후 microcrack 가능. Cost 高 (22% Mn).',
        source: 'WorldAutoSteel / POSCO TWIP1180',
      },
    },
  },

  // ========================================
  // R141b — Shipbuilding steel AH36 / DH36 / EH36 (ABS / IACS grade)
  // ========================================
  {
    alloyPattern: /\bah\s?36|\bdh\s?36|\beh\s?36|ah36|dh36|eh36|shipbuilding.*36/i,
    familyName: 'Shipbuilding steel AH36 / DH36 / EH36 (IACS grade)',
    conditions: {
      'as-rolled': {
        code: 'As-Rolled (AH)',
        title: 'AH36 — As-rolled (mild, no notch req.)',
        process: 'Hot-rolled (no controlled cool)',
        resulting: 'σy 355 MPa min · UTS 490-630 MPa · El 21% · 0°C Charpy 34J+',
        useCase: '선체 외판 (low-grade), barge, 일반 marine 구조. -20°C 미만 사용 금지.',
        source: 'IACS UR W11 / ABS Rules Part 2 Chapter 1',
      },
      'normalized': {
        code: 'Normalized (DH)',
        title: 'DH36 — Normalized (−20°C Charpy 보장)',
        process: 'Hot-rolled → Normalized 880-920°C / AC',
        resulting: 'σy 355 MPa · UTS 490-630 MPa · El 21% · −20°C Charpy 34J+',
        useCase: '선체 구조 중간 grade — Atlantic / Pacific 항로 표준.',
        source: 'IACS UR W11 / DNV-OS-B101',
      },
      'tmcp': {
        code: 'TMCP (EH)',
        title: 'EH36 — TMCP (Thermo-Mechanical Controlled Process)',
        process: 'Controlled rolling + accelerated cooling (CR+ACC) — fine grain 5-10 μm',
        resulting: 'σy 355 MPa · UTS 490-630 MPa · El 22% · −40°C Charpy 41J+ · 용접성 ↑',
        useCase: '극지 항로 (Arctic), 대형 컨테이너선, LNG 운반선 — 가장 높은 grade. CTOD 0.25mm @ -10°C 보장.',
        caveat: '용접 heat input 제어 (≤ 5 kJ/mm) — HAZ softening 회피.',
        source: 'IACS UR W11 / KR / DNV-OS-B101 / POSCO TMCP',
      },
    },
  },

  // ========================================
  // R141b — Ni solid-solution: Inconel 625 (UNS N06625)
  // ========================================
  {
    alloyPattern: /inconel\s?625|in[\s-]?625|n06625|alloy\s?625/i,
    familyName: 'Inconel 625 (UNS N06625, Ni-Cr-Mo-Nb solid solution)',
    conditions: {
      'annealed': {
        code: 'Annealed (Grade 1)',
        title: 'Annealed — solid solution (low strength, max corrosion)',
        process: 'Annealed 925-1050°C / AC or WQ',
        resulting: 'σy 415 MPa · UTS 830 MPa · El 30% · 1000°C 까지 산화 저항',
        useCase: '해양 platform, 화학 reactor (산성·염화물 모두), 항공 ducting — 광범위 환경 내식.',
        caveat: 'Grade 2 (solution annealed 1090°C) 권장 — 600°C+ 사용 시 γ" 석출 → 인성 ↓.',
        source: 'AMS 5599 / Special Metals SMC-063',
      },
      'solution annealed': {
        code: 'Solution Annealed (Grade 2)',
        title: 'Solution Annealed — high-temperature service grade',
        process: 'Solution 1090-1120°C / 30 min / AC or WQ',
        resulting: 'σy 380 MPa · UTS 800 MPa · El 50% · 925°C 산화 저항',
        useCase: '650-925°C 고온 — gas turbine exhaust, jet 엔진 ring, 화학 plant heat exchanger.',
        source: 'AMS 5666 / Special Metals',
      },
      'as-built': {
        code: 'As-built (LPBF)',
        title: 'As-built — LPBF dendritic + Nb seg.',
        process: 'LPBF 후 처리 없음. dendritic 미세 + Laves phase + γ"',
        resulting: 'σy 700 MPa · UTS 950 MPa · El 30% (cold-worked 와 유사)',
        useCase: 'AM prototype. 후 HIP + solution anneal (1150°C/1-4h) 권장.',
        caveat: 'Laves + γ" → ductility ↓. HIP 1150°C 후 strength ↓ but isotropic.',
        source: 'EOS NickelAlloy IN625 / ASTM F3056',
      },
    },
  },

  // ========================================
  // Inconel 600 (UNS N06600)
  // ========================================
  {
    alloyPattern: /inconel\s?600|in[\s-]?600|n06600|alloy\s?600/i,
    familyName: 'Inconel 600 (UNS N06600, Ni-Cr-Fe solid solution)',
    conditions: {
      'annealed': {
        code: 'Annealed',
        title: 'Annealed — solid solution standard',
        process: 'Annealed 925-1040°C / AC',
        resulting: 'σy 240-345 MPa · UTS 550-690 MPa · El 35-55% · 1095°C 까지 산화 저항',
        useCase: '원자력 SG tube, 가열로 retort, 화학 plant — 광범위 high-T 내식.',
        caveat: 'IGSCC (intergranular SCC) 위험 in pure water + caustic — TT (thermally treated) 또는 Alloy 690 권장.',
        source: 'AMS 5540 / Special Metals SMC-027',
      },
      'thermally treated (tt)': {
        code: 'TT (700°C/15h)',
        title: 'TT — Thermally Treated (IGSCC 저항)',
        process: 'Solution annealed → 700°C / 15 h / AC (carbide GB precipitation)',
        resulting: 'σy 240 MPa · UTS 550 MPa · El 50% · IGSCC 저항 ↑↑',
        useCase: '원자력 SG tube (PWR steam generator) — IGSCC 저항 grade.',
        source: 'AMS 5540 / EPRI MRP-225',
      },
    },
  },

  // ========================================
  // Inconel 617 (UNS N06617)
  // ========================================
  {
    alloyPattern: /inconel\s?617|in[\s-]?617|n06617|alloy\s?617/i,
    familyName: 'Inconel 617 (UNS N06617, Ni-Cr-Co-Mo)',
    conditions: {
      'solution annealed': {
        code: 'Solution Annealed',
        title: 'Solution Annealed — high-T creep grade',
        process: 'Solution 1175°C / WQ — γ\' 미세 + carbide GB',
        resulting: 'σy 295 MPa · UTS 760 MPa · El 55% · 1100°C 까지 산화 저항',
        useCase: '가스터빈 combustor, 핵 He gas turbine (VHTR), 화학 reactor — 1000°C+ 산화·creep 최고급.',
        caveat: 'Code Case N-862 (ASME III Section) — 950°C 까지 sub-critical use.',
        source: 'AMS 5887 / Special Metals SMC-029 / Code Case N-862',
      },
      'as-built': {
        code: 'As-built (LPBF)',
        title: 'As-built (LPBF) — γ\' nanoprecip.',
        process: 'LPBF 후 처리 없음. 미세 γ\' + dendritic.',
        resulting: 'σy 600 MPa · UTS 900 MPa · El 25% (wrought 대비 ↑)',
        useCase: 'AM prototype combustor liner. HIP + solution anneal (1175°C) 권장.',
        source: 'ASTM F3056 / NASA STD-6030',
      },
    },
  },

  // ========================================
  // Hastelloy X (UNS N06002)
  // ========================================
  {
    alloyPattern: /hastelloy\s?x|n06002|alloy\s?x|hx\b/i,
    familyName: 'Hastelloy X (UNS N06002, Ni-Cr-Mo-Fe-Co)',
    conditions: {
      'solution annealed': {
        code: 'Solution Annealed',
        title: 'Solution Annealed — gas turbine combustor 표준',
        process: 'Solution 1175°C / 30 min / WQ — γ\' 비형성 (solid solution + carbide)',
        resulting: 'σy 360 MPa · UTS 770 MPa · El 50% · 1200°C 산화 저항',
        useCase: 'Jet 엔진 combustor liner, afterburner, gas turbine transition duct — 1100°C+ 산화/sulfidation 최고급.',
        caveat: '700-900°C 장시간 노출 시 σ-phase + μ-phase 석출 → 인성 ↓. Service > 1000°C 권장.',
        source: 'AMS 5754 / Haynes HX datasheet (R128)',
      },
      'as-built': {
        code: 'As-built (LPBF)',
        title: 'As-built (LPBF) — combustor AM 표준',
        process: 'LPBF 후 처리 없음. 미세 cellular + Mo segregation',
        resulting: 'σy 700-800 MPa · UTS 900-1050 MPa · El 35-45%',
        useCase: 'GE F414 combustor swirler, RR Trent NGV — AM gas turbine 부품.',
        caveat: 'HIP + solution anneal (1175°C) → strength ↓ but ductility + isotropy ↑.',
        source: 'EOS NickelAlloy HX / ASTM F3056',
      },
    },
  },

  // ========================================
  // Haynes 230 (UNS N06230)
  // ========================================
  {
    alloyPattern: /haynes\s?230|n06230|alloy\s?230/i,
    familyName: 'Haynes 230 (UNS N06230, Ni-Cr-W-Mo)',
    conditions: {
      'solution annealed': {
        code: 'Solution Annealed',
        title: 'Solution Annealed — high-T creep + thermal stability',
        process: 'Solution 1175-1230°C / WQ — fine carbide (M₆C, M₂₃C₆)',
        resulting: 'σy 380 MPa · UTS 860 MPa · El 48% · 1150°C 까지 산화 + creep 우수',
        useCase: 'Gas turbine combustor, 핵 He gas turbine, hot gas-path component — Hastelloy X 보다 thermal stability ↑.',
        caveat: 'Long-term σ-phase 위험 (650-870°C). Welding 표준 (Haynes 230-W filler).',
        source: 'AMS 5891 / Haynes 230 datasheet',
      },
    },
  },

  // ========================================
  // Haynes 282 (UNS N07208) — γ' strengthened
  // ========================================
  {
    alloyPattern: /haynes\s?282|n07208|alloy\s?282/i,
    familyName: 'Haynes 282 (UNS N07208, γ\' precipitation strengthened)',
    conditions: {
      'sta': {
        code: 'STA (1010 + 788)',
        title: 'STA — Solution + Two-step Age (γ\' peak)',
        process: 'Solution 1135°C / WQ → 1010°C / 2 h / AC → 788°C / 8 h / AC (2-step age)',
        resulting: 'σy 720 MPa · UTS 1140 MPa · El 26% · KIC 90 · 750°C 안정',
        useCase: '항공 디스크, 가스터빈 transition duct, hot gas-path — Waspaloy 대비 creep + 용접성 ↑.',
        caveat: '850°C 이상 over-aging → γ\' 조대화. 용접 후 STA 재처리 권장.',
        source: 'Haynes 282 datasheet / R132 verified',
      },
      'solution annealed': {
        code: 'Solution Annealed',
        title: 'Solution Annealed (forming/welding)',
        process: 'Solution 1135°C / WQ',
        resulting: 'σy 400 MPa · UTS 800 MPa · El 50% (formable)',
        useCase: 'Forming / welding 전. 후 STA 처리.',
        source: 'Haynes 282',
      },
    },
  },

  // ========================================
  // R141b — Cobalt alloy: Stellite 6 (UNS R30006)
  // ========================================
  {
    alloyPattern: /stellite\s?6|stellite\s?ka|r30006|co-?cr-?w/i,
    familyName: 'Stellite 6 (UNS R30006, Co-Cr-W-C wear-resistant)',
    conditions: {
      'as-cast': {
        code: 'As-cast',
        title: 'As-cast — M₇C₃ carbide + Co matrix (peak hardness)',
        process: 'Investment cast or PTAW deposit. M₇C₃ + M₂₃C₆ carbide + γ-Co (FCC)',
        resulting: 'HRC 38-45 · σy 540 MPa · UTS 880 MPa · El 1-3% (very low)',
        useCase: 'Valve seat, pump sleeve, hard-facing weld overlay (PTAW), drill bit insert — wear + corrosion 우수.',
        caveat: 'El 1-3% — 충격 부적합. Brittle. 용접 cracking 위험 (Co matrix). Pre-heat 350°C 권장.',
        source: 'Kennametal Stellite 6 datasheet / AMS 5387', // R205 F14 — A638 은 A286 spec (오인용 정정)
      },
      'ptaw deposit': {
        code: 'PTAW deposit',
        title: 'PTAW deposit — plasma transferred arc weld overlay',
        process: 'Plasma transferred arc welding deposit on substrate (typical 3-5mm)',
        resulting: 'HRC 40-45 · wear loss < 5 mg in ASTM G65',
        useCase: 'Valve seat hardfacing, pump impeller wear surface, sliding surface industrial.',
        source: 'Kennametal Stellite welding guide',
      },
    },
  },

  // ========================================
  // CoCrMo (ASTM F75 / F1537, biomedical)
  // ========================================
  {
    alloyPattern: /cocrmo|co-?cr-?mo|f75|f1537|astm\s?f75|astm\s?f1537/i,
    familyName: 'CoCrMo biomedical (ASTM F75 cast / F1537 wrought)',
    conditions: {
      'as-cast (f75)': {
        code: 'As-cast (F75)',
        title: 'As-cast — investment cast (hip/knee implant)',
        process: 'Investment cast at 1500°C → controlled cool. γ-Co FCC + M₂₃C₆ carbide',
        resulting: 'σy 450-520 MPa · UTS 665-800 MPa · El 8% · HV 280-380 · biocompatible',
        useCase: '인공 고관절·슬관절 stem + cup (ceramic head 짝), bone screw — biomedical 표준.',
        caveat: 'El 8% — brittle. 부적합한 충격 하중. HIP (1200°C/100MPa) 으로 porosity 제거 권장.',
        source: 'ASTM F75 / DePuy Synthes implant catalog',
      },
      'wrought (f1537)': {
        code: 'Wrought (F1537)',
        title: 'Wrought + Solution Treated (low-C grade)',
        process: 'Forged / hot-rolled → Solution 1230°C / 1 h / WQ (low-C 0.05%)',
        resulting: 'σy 700 MPa · UTS 1000 MPa · El 20% · HV 340 · biocompatible',
        useCase: '인공 고관절 stem (cementless / HA-coated), 척추 implant — strength + ductility 우선.',
        source: 'ASTM F1537 / Zimmer Biomet wrought catalog',
      },
      'hip + solution treated': {
        code: 'HIP + ST',
        title: 'HIP + Solution Treated (AM CoCrMo 표준)',
        process: 'LPBF / EBM 후 HIP 1200°C / 100 MPa / 4 h → Solution 1230°C / 1 h / WQ',
        resulting: 'σy 850 MPa · UTS 1100 MPa · El 25% · porosity < 0.1%',
        useCase: 'AM 의료 implant (custom hip/knee, dental crown framework) — EBM/SLM standard.',
        source: 'ASTM F3001 (Ti) parallel for Co / EOS CobaltChrome SP1',
      },
    },
  },

  // ========================================
  // R141b — Mg alloy WE43 (Mg-Y-RE, aerospace + biomedical)
  // ========================================
  {
    alloyPattern: /we\s?43|we43|mg-?y-?re|magnesium.*we/i,
    familyName: 'Magnesium WE43 (Mg-Y-Nd-Zr, aerospace + biodegradable)',
    conditions: {
      't6': {
        code: 'T6',
        title: 'T6 — Solution + Aged (Y/Nd precipitate)',
        process: 'Solution 525°C / 8 h / WQ → Aged 250°C / 16 h / AC',
        resulting: 'σy 195-215 MPa · UTS 280-320 MPa · El 5-10% · 200°C 까지 성능 유지',
        useCase: '항공기 helicopter gear box housing (AS9100), 자동차 transmission, F1 wheel — Mg 중 고온 grade.',
        caveat: 'WE43 의 가격 ↑ (Y, Nd 비싸다). 발화 위험 → machining 시 cooling 필수. RE 함량 산화 저항 ↑.',
        source: 'ASTM B107 / Magnesium Elektron WE43 datasheet',
      },
      't5': {
        code: 'T5',
        title: 'T5 — As-cast + aged (cost-effective)',
        process: 'Sand cast / investment cast → Aged 250°C / 16 h',
        resulting: 'σy 175 MPa · UTS 250 MPa · El 4%',
        useCase: 'Helicopter gear housing 표준 — T6 대비 cost ↓ + similar 강도.',
        source: 'Magnesium Elektron / ASM Vol.2',
      },
      'as-cast': {
        code: 'As-cast',
        title: 'As-cast — no HT',
        process: 'Sand / investment cast',
        resulting: 'σy 150 MPa · UTS 200 MPa · El 3-5%',
        useCase: 'Prototype, low-load housing. 후 T5/T6 권장.',
        source: 'Magnesium Elektron',
      },
    },
  },

  // ========================================
  // Mg alloy AZ31 (Mg-3Al-1Zn, sheet 표준)
  // ========================================
  {
    alloyPattern: /az\s?31|az31|mg-?al-?zn|magnesium.*az31/i,
    familyName: 'Magnesium AZ31 (Mg-3Al-1Zn, wrought sheet 표준)',
    conditions: {
      'h24': {
        code: 'H24',
        title: 'H24 — Strain hardened + partially annealed',
        process: 'Cold-rolled → Partial anneal 200°C (recovery without recrystallization)',
        resulting: 'σy 180-220 MPa · UTS 260-290 MPa · El 12-15%',
        useCase: 'Mg sheet 표준 — 자동차 inner panel, 노트북 외장, 카메라 body. Forming 후 사용.',
        caveat: 'Mg sheet basal texture → 가공 시 anisotropy. Warm forming (200-250°C) 권장.',
        source: 'ASTM B90 / Magnesium Elektron AZ31',
      },
      'o': {
        code: 'O (Annealed)',
        title: 'O — Fully annealed (max ductility)',
        process: 'Full anneal 345°C / 2 h / AC',
        resulting: 'σy 120 MPa · UTS 240 MPa · El 21%',
        useCase: 'Deep drawing, complex forming — ductility 우선.',
        source: 'ASTM B90',
      },
      'f': {
        code: 'F (As-fabricated)',
        title: 'F — As-fabricated (mill product, no HT)',
        process: 'Hot-rolled or extruded, no HT',
        resulting: 'σy 150-200 MPa · UTS 240-290 MPa · El 10-15%',
        useCase: '압출 profile, extruded tube — 일반 구조용.',
        source: 'ASTM B107',
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

/*
 * R176 — Generic-HT → family peak-aged fallback.
 * Generic entries (CSV-derived) have heat_treatment = "Aged / solution-treated"
 * — no T6/STA/Aged label match. Map family-by-family to its peak-aged code.
 *
 * Example: AA 6061 — Aged / solution-treated → maps to AA 6xxx family's "t6" condition,
 * so the UI shows the full T6 description (Solution 530°C / WQ / Aged 175°C / 8 h / σy 275 MPa…).
 */
const PEAK_AGED_CODE: { [familyName: string]: string } = {
  'AA 2xxx Al-Cu (e.g., 2024, 2014, 2219)': 't6',
  'AA 6xxx Al-Mg-Si (6061, 6063, 6082, 6151)': 't6',
  'AA 7xxx Al-Zn-Mg (7075, 7050, 7068)': 't6',
  'AlSi cast / AM (AlSi10Mg, AlSi12, A357)': 't6',
};
const GENERIC_AGED_HT_RE = /^aged($|\s|\s*\/|-)|^sta\b|peak\s*ag(ed|ing)|solution\s*\+\s*ag/i;

/**
 * Lookup alloy-specific HT description.
 *
 * R226j/C6 — family 식별은 빌드 스탬프 m.profiles.ht (stable_id 기반 familyName) 로만 한다.
 * 이전의 name-regex(alloyPattern) 런타임 스캔은 제거 — alloyPattern 은 빌드타임 분류기
 * (build-process-profiles.mjs 가 이 파일을 파싱) 의 부트스트랩 입력으로만 쓰인다.
 * 조건(code) 해석은 구조 필드 heat_treatment 우선 + 이름 내 코드 토큰 (family 확정 후) 유지.
 *
 * @param materialName 재료 이름 (조건 코드 fallback 탐색용, e.g., "17-4 PH — H900")
 * @param heatTreatment heat_treatment 필드 (optional, e.g., "H900")
 * @param familyName m.profiles.ht — 빌드가 할당한 familyName (없으면 undefined 반환)
 */
export function htAlloySpecificFor(
  materialName: string,
  heatTreatment?: string | null,
  familyName?: string | null,
): { family: AlloyHtFamily; description: AlloyHtDescription } | undefined {
  const nameStr = NORMALIZE(materialName);
  if (!nameStr || !familyName) return undefined;
  const htStr = NORMALIZE(heatTreatment || '');

  const fam = FAMILIES.find(f => f.familyName === familyName);
  if (!fam) return undefined;
  // H5 — 조건 코드는 **최장(최특이) 우선** 매칭. htStr.includes(code) 는 "t651".includes("t6")=true 라
  // 삽입순서상 t6 가 t651 보다 먼저면 T651 재료가 T6 조건으로 잘못 잡힌다(전 xx51 stretched temper 동일:
  // T651⊃T6·T7351⊃T73·T351⊃T3). 코드 길이 내림차순 정렬로 특이 코드를 먼저 시도해 근본 해소.
  const condEntries = Object.entries(fam.conditions).sort((a, b) => b[0].length - a[0].length);
  for (const family of [fam]) {
    // Try heat_treatment field first
    if (htStr) {
      for (const [code, desc] of condEntries) {
        if (htStr === code || htStr.startsWith(code + ' ') || htStr.includes(code)) {
          return { family, description: desc };
        }
      }
    }
    // Then try material name (for "17-4 PH — H900" pattern)
    for (const [code, desc] of condEntries) {
      const codeNorm = code.toLowerCase();
      // Match standalone code (e.g., "H900" as word, T6 as word)
      const re = new RegExp(`\\b${codeNorm.replace(/[+().°]/g, '\\$&')}\\b`, 'i');
      if (re.test(nameStr)) return { family, description: desc };
    }
    // R176 — fallback: generic "Aged / solution-treated" → family peak-aged.
    if (htStr && GENERIC_AGED_HT_RE.test(htStr)) {
      const peakCode = PEAK_AGED_CODE[family.familyName];
      if (peakCode && family.conditions[peakCode]) {
        return { family, description: family.conditions[peakCode] };
      }
    }
  }
  return undefined;
}
