# Aluminum Alloys — 일반론

> 1차 출처: ASM Metals Handbook Desk Edition 2nd (1998), Section "Aluminum and Aluminum Alloys" + MMPDS-08 Chapter 3 Aluminum
> 표준: The Aluminum Association — International Alloy Designations and Chemical Composition Limits for Wrought Aluminum (2018)

## 1. Wrought Aluminum 4-digit designation (IADS 표준, 1954 통합)

**XXXX-Txxx** 형태. 첫 자리 = 주 합금 원소:

| Designation | 주 원소 | 강화 메커니즘 | 대표 합금 |
|---|---|---|---|
| **1xxx** | ≥99% Pure Al | Solid solution (없음) | 1100 (commercial pure), 1050, 1200, 1350 (electrical) |
| **2xxx** | Al-Cu | Age hardening (CuAl₂ θ', Al₂CuMg S' precipitates) | **2024** (737/A320 fuselage), 2014, 2017, 2219, **2195** (Al-Li) |
| **3xxx** | Al-Mn | Solid solution + work hardening | 3003, 3004, 3104 (음료 캔 body), 3105 |
| **4xxx** | Al-Si | Eutectic, brazing alloy | 4032, 4043 (welding rod), 4047 (filler) |
| **5xxx** | Al-Mg | Solid solution + work hardening, **non-heat-treatable** | **5052** (marine), **5083** (LNG inner tank), 5086, 5182 (cap stock) |
| **6xxx** | Al-Mg-Si | Age hardening (Mg₂Si β' precipitates) | **6061** ("all-purpose"), **6063** (압출), 6082, 6005A |
| **7xxx** | Al-Zn-Mg(-Cu) | Age hardening (MgZn₂ η' precipitates) | **7075** (항공), 7050 (단조 disc), 7475 (high-toughness) |
| **8xxx** | Other (Li, Sn, Fe...) | Various | 8090 (Al-Li 1세대), 2099 (Al-Li 2세대) |

### Cast aluminum designation (3-digit + .X)
- **XXX.X** where X = 0 (casting), 1 (ingot), 2 (premium ingot)
- 1XX.X = pure (99+%)
- **3XX.X = Al-Si-Cu/Mg** (가장 흔함 — **A356/A357** for sand cast, **A380** for die cast, **A413** eutectic)
- 4XX.X = Al-Si binary eutectic
- 5XX.X = Al-Mg (marine cast)
- 7XX.X = Al-Zn

## 2. Temper Designation (가공/열처리 상태)

### Basic tempers
- **F** = As-fabricated (no spec)
- **O** = Annealed (가장 부드러움)
- **H** = Strain-hardened (cold work) — non-heat-treatable (1/3/5xxx)
- **T** = Heat treated — heat-treatable (2/6/7xxx)
- **W** = Solution heat-treated (unstable, transient)

### H-Temper (3-digit, work-hardenable)
- **H1xx** = Strain hardened only
- **H2xx** = Strain hardened + partial annealed
- **H3xx** = Strain hardened + stabilized (5xxx 의 SCC 회피)
- 2nd digit: 2 = 1/4 hard, 4 = 1/2 hard, 6 = 3/4 hard, 8 = full hard
- 3rd digit (option): 1 = special

예: **5052-H32** = strain-hardened, then stabilized, 1/4 hard

### T-Temper (heat-treatable)
- **T1** = Cooled from hot working + natural aging
- **T3** = Solution treated + cold worked + natural aging (e.g., **2024-T3**)
- **T4** = Solution treated + natural aging
- **T5** = Cooled from hot working + artificial aging
- **T6** = Solution treated + artificial aging (peak strength, **6061-T6**, **7075-T6**)
- **T7** = Solution treated + overaged (SCC resistance, **7075-T73, T76**)
- **T8** = Solution treated + cold worked + artificial aging (**AA 2195-T8**, **2219-T87**)
- **T9** = Solution treated + artificial aging + cold worked
- **T10** = Cooled from hot working + cold work + artificial aging

### Special temper variants
- **T351** = T3 + 1.5~3% stretching (stress relief)
- **T451** = T4 + stretching
- **T651** = T6 + stretching
- **T7451** = T74 + stretching (7050-T7451 — 항공 thick plate 표준)
- **T7351** = T73 + stretching
- **T8x** = T8 with cold work %
- **T87** = T8 with 7% cold work (**2219-T87**)

## 3. 강화 메커니즘별 합금 family

### 3.1 비열처리 (Non-Heat-Treatable) — 1, 3, 4, 5xxx
- Solid solution + work hardening 으로만 강화
- Annealing 후 부드러움, cold rolling 으로 강도 증가
- 5xxx (Mg) 가 강도 가장 높음 (σ_y 270 MPa @ H38)
- 응용: 식기, packaging, marine hull (5083), 차체 패널 (5754)

### 3.2 열처리 가능 (Heat-Treatable) — 2, 6, 7, 8xxx
- Solution treat (485~540°C) → quench → 시효 → 미세 석출 → 강화
- 자연시효 (natural aging) vs 인공시효 (artificial aging, ~150~200°C)
- T6 = peak hardness, T7 = overaged (덜 강하지만 SCC ↑)

### 3.3 시효 석출 종류 (Peak hardness 의 원인)
| 합금 | 석출상 | 결정 구조 |
|---|---|---|
| 2xxx (Al-Cu) | GP zone → θ"→ θ' (Al₂Cu) → θ | platelet on {001}, FCC |
| 2xxx (Al-Cu-Mg) | S' (Al₂CuMg) → S | needle on <100>, orthorhombic |
| 6xxx (Al-Mg-Si) | β" → β' (Mg₂Si) → β | needle on <100>, hexagonal |
| 7xxx (Al-Zn-Mg) | η' (MgZn₂) → η | hexagonal |
| Al-Li | T1 (Al₂CuLi), δ' (Al₃Li) | hexagonal / Ll₂ |
| Al-Cu-Li-Ag | T1 + Ω (Al₂Cu w/ Ag) | platelets, AA 2195 표준 |

## 4. 합금별 핵심 특성 비교

| 합금 | T6 σ_y (MPa) | E (GPa) | ρ (g/cm³) | 응용 영역 |
|---|---|---|---|---|
| 1100 | 105 (H18) | 69 | 2.71 | Packaging, foil, recycled |
| 2024-T3 | 345 | 73 | 2.78 | 항공 fuselage skin |
| 2195-T8 | 480 | 78 | 2.71 | SLS LH2 tank |
| 5052-H32 | 195 | 70 | 2.68 | Marine, kitchen |
| 5083-H321 | 215 | 70 | 2.66 | LNG inner tank |
| 6061-T6 | 276 | 69 | 2.70 | All-purpose |
| 6063-T5 | 145 | 69 | 2.70 | 압출, 새시 |
| 6082-T6 | 250 | 70 | 2.70 | EU all-purpose |
| 7075-T6 | 503 | 72 | 2.81 | 항공 frame, 단조 disc |
| 7050-T7451 | 470 | 72 | 2.83 | 항공 thick plate |
| A356-T6 (cast) | 200 | 72 | 2.68 | Wheel, engine block |

## 5. Al 합금의 약점 — SCC (Stress Corrosion Cracking)

### 7xxx 의 SCC 민감도
- 7075-T6 (peak strength) 가 가장 민감 — Cl⁻ 환경에서 short-trans 방향 균열
- **T6 → T7 (overaging)** 으로 SCC 저항 향상 + 강도 ~10% 손실
- T7351 (7075 의 stretched + T7) 가 항공 thick plate 표준
- T74 / T76 / T7651 등 세부 변형

### 2xxx 의 SCC + galvanic
- Cu 4% → galvanic corrosion (Cu 가 noble) + SCC 민감
- 해결: **Alclad** = pure Al 5% cladding (양면, sandwich)
- Alclad 2024 가 fuselage skin 의 표준 (skin 표면이 sacrificial)

### Al-Li (8090 등 1세대) 의 LOTC
- LOTC (Loss Of Through-thickness Crack growth resistance) — Al-Li 의 단점
- 3세대 (2050, 2196, 2198, 2099) 가 해결 — quench-insensitive + 동등 KIC

## 6. 부식 환경별 합금 선택

| 환경 | 추천 | 비추천 |
|---|---|---|
| 해수 | **5083, 5086, 6061** | 2xxx, 7xxx (Cu 있는) |
| 공업 대기 | 5052, 6061, 6063 | 2024 bare (Alclad 가능) |
| 산성 (pH < 4) | 1100 | 6xxx (Mg₂Si 가 산에 약함) |
| 알칼리 (pH > 9) | — (모든 Al 부적합) | 모든 Al |
| 고염 (Cl⁻ 50000 ppm+) | 5083 H321, 5086 H116 | 7xxx peak temper |

## 7. 한국 KS / 일본 JIS 매핑

| AA | KS D | JIS H |
|---|---|---|
| 1100 | A1100 | A1100 |
| 2024 | A2024 | A2024 |
| 5052 | A5052 | A5052 |
| 5083 | A5083 | A5083 |
| 6061 | A6061 | A6061 |
| 6063 | A6063 | A6063 |
| 7075 | A7075 | A7075 |
| A356 | AC4C | AC4C |
| A380 | ALDC10 | ADC10 |

대체로 KS = JIS = AA. 한국·일본·미국 표준 거의 호환.

## 8. AM (LPBF) Al 합금 — 새 분류

LPBF (Laser Powder Bed Fusion) 의 등장으로 추가:
- **AlSi10Mg** = LPBF 표준 (A360 변형, EOS·SLM·GE Additive 의 default Al powder)
- **AlSi7Mg (A357)** = aerospace AM
- **Scalmalloy** (Airbus 특허, Al-Mg-Sc-Zr) — LPBF + age 후 σ_y 500 MPa
- **A205** (Aeromet) = LPBF Al-Cu high-strength

## 9. 핵심 표준

- **The Aluminum Association** — International Alloy Designations and Chemical Composition Limits for Wrought Aluminum (annual update)
- **ASTM B209** (Al sheet, plate)
- **ASTM B221** (Al extrusion)
- **ASTM B247** (Al forging)
- **ASTM B928** (Marine 5xxx)
- **MMPDS-08 Chapter 3** — Al alloy A/B-Basis
- **KS D 6701** (Al plate, sheet, strip)
- **JIS H 4000** (Al plate, sheet, strip)
- **EN 573** (Al designations)
