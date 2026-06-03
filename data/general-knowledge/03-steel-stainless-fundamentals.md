# Steel & Stainless Steel — 일반론

> Cross-ref: ASM Metals Handbook Desk Edition 2nd (1998), Sections "Carbon and Alloy Steels", "Stainless Steels", "Heat Treating of Steel"
> 추가 출처: AISI Steel Products Manual, ASTM A29 / A240 / A276

## 1. Steel 분류 체계 (AISI/SAE 4-digit numbering)

1941년 AISI 와 SAE 가 통합 numbering 합의. **4 자리 코드 = XYZZ**:
- **X (1st)** = alloy family
- **Y (2nd)** = approximate alloy% (0 = 단일 원소, 1 = 1%, …)
- **ZZ (3rd-4th)** = carbon% × 100

| 1st digit | Family | 예 |
|---|---|---|
| 1xxx | Plain Carbon Steel | 1018 (0.18% C), 1045 (0.45% C), 1095 (knife) |
| 13xx | Mn 1.75% | 1330 (0.30% C) |
| 23xx | Ni 3.5% | (구버전) |
| 25xx | Ni 5% | (구버전) |
| 31xx | Ni 1.25 + Cr 0.65% | 3140 |
| 33xx | Ni 3.5 + Cr 1.5% | (구버전) |
| 40xx | Mo 0.25% | 4023 (case hardening) |
| 41xx | Cr 0.95 + Mo 0.20% | **4140** (Cr-Mo 표준) |
| 43xx | Ni 1.83 + Cr 0.50 + Mo 0.25% | **4340** (Ni-Cr-Mo) |
| 46xx | Ni 1.83 + Mo 0.25% | 4620 (case hardening) |
| 51xx | Cr 0.80% | **5160** (spring), 52100 (bearing) |
| 61xx | Cr + V | 6150 (spring + valve) |
| 86xx | Ni 0.55 + Cr 0.50 + Mo 0.20% | **8620** (자동차 기어) |
| 87xx | Ni 0.55 + Cr 0.50 + Mo 0.25% | 8740 |
| 92xx | Si 1.40-2.00% | **9260** (Si-Mn spring) |
| 93xx | Ni 3.25 + Cr 1.20 + Mo 0.12% | **9310** (항공 변속기) |

## 2. 탄소 함량과 기계적 거동

| Carbon % | 분류 | 거동 | 응용 |
|---|---|---|---|
| < 0.08% | Ultra-low | 매우 ductile (El > 35%), σ_y < 200 MPa, deep-drawable | Sheet (자동차 차체), 와이어, 캔 |
| 0.08~0.25% | Low (Mild) | Ductile (El ~25%), σ_y 220~380 MPa, 용접성 우수 | Structural (1018/1020), 건축 H-beam, A36 |
| 0.25~0.45% | Medium | 균형 (El ~15%), σ_y 300~520 MPa, induction-hardenable | Axle shaft (1045), 기계 부품 |
| 0.45~0.60% | High | Hardenable (HRC 60+ 가능), El ~10% | Cam, rail (R260) |
| 0.60~1.00% | Very High | Spring 강도, El ~5% | Music wire, leaf spring, knife |

> Carbon equivalent (CE) = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15
> CE > 0.45 시 용접 어려움 (preheating 필요)

## 3. Steel 열처리 4단계 (ASM 정의)

### 3.1 Annealing (풀림)
- 723°C (eutectoid) 이상 가열 → 노냉
- 100% pearlite 평형 미세조직 → 가장 부드러움
- σ_y 최소, El 최대 (가공 전 처리)

### 3.2 Normalizing (불림)
- 730~870°C 가열 → 공냉 (annealing 보다 빠름)
- Fine pearlite + 일부 ferrite
- Grain refinement → 기계적 특성 균일화 (annealing 보다 강도 ↑, El 약간 ↓)

### 3.3 Quenching (담금질)
- austenitizing (723°C 이상) → 빠른 냉각 (수냉 / 유냉)
- → Martensite (BCT 결정구조) 형성
- 매우 단단함 (HRC 55~65) 하지만 brittle
- 잔류응력 ↑ → 균열 위험

### 3.4 Tempering (뜨임)
- Q 후 150~650°C 재가열
- Martensite → tempered martensite (carbide 석출)
- 강도 약간 감소 + ductility 크게 회복
- T 온도 vs σ_UTS, El 의 trade-off curve = "tempering chart"

### 3.5 Heat treatment 조합 (Q&T = Quenched + Tempered)
가장 흔한 조합. 강도-인성 trade-off 의 sweet spot 을 만든다.
- 4140 Q+T (200°C): σ_y 1240 MPa, El 9% (high strength)
- 4140 Q+T (600°C): σ_y 660 MPa, El 18% (toughness 우선)
- 4340 Q+T 와 300M (Si-modified 4340) 가 항공 landing gear 표준

## 4. TTT / CCT diagram — 열처리 설계 핵심

### TTT (Time-Temperature-Transformation)
- isothermal cooling 시 austenite → ferrite + pearlite + bainite + martensite 변태 시간
- "Nose" 까지 cooling time 이 quench 의 critical
- High-alloy steel 의 nose 가 long-time → 자기-quenching (air-hardening) 가능

### CCT (Continuous Cooling Transformation)
- 실제 quenching (연속 냉각) 시의 변태 — TTT 보다 조금 오른쪽
- Industrial 설계 시 사용

### Hardenability — Jominy end-quench test
- 표준 시편 한 끝 quench → 거리별 hardness 측정
- 거리 6 mm 에서 HRC 50 유지 = "high hardenability"
- 4140 의 Jominy 곡선 = 6 mm 에서 HRC 50 → ø50 mm 봉 전체가 균일 quenched
- 8620 (case-hardening) 은 hardenability 낮음 → core 는 부드럽고 표면만 carburized

## 5. Stainless Steel 5 family

### 5.1 Austenitic (FCC γ — 200 / 300 series)
- 18Cr-8Ni base, Ni 가 γ 안정화
- Non-magnetic, work-hardenable (가공경화)
- 최고 부식 저항 (Cl⁻ 환경 외)
- **304, 304L, 316, 316L, 321, 347, 310** 가 대표
- 응용: 식품, 의료, 화학, 건축
- 약점: 450~850°C 의 sensitization (Cr₂₃C₆ 입계 석출 → IGC)

### 5.2 Ferritic (BCC α — 400 series, Cr only)
- 11~30% Cr, Ni 거의 없음
- Magnetic, work-hardening 미미
- 저렴 (Ni 없음)
- **430** (kitchen sink, dishwasher liner), **409** (자동차 머플러), 446 (high-temp)
- 약점: 475°C embrittlement (Fe-Cr α' 석출), σ phase 형성

### 5.3 Martensitic (BCT — 400 series, high C)
- 11~17% Cr, C 0.10~1.20%
- Hardenable by Q+T (BCC → BCT martensite)
- Magnetic, **최고 강도 (1700+ MPa)** 가능
- **410** (밸브 trim), **416** (free-machining), **420** (cutlery), **440C** (bearing/knife)
- 약점: 부식 저항 austenitic 보다 낮음, hardened 상태 brittle

### 5.4 Duplex (α + γ mixed)
- 22~28% Cr, 5~7% Ni, N 0.15-0.30%
- α/γ 약 50/50 → austenitic 의 부식 저항 + ferritic 의 강도
- **2205 (S31803)**, **2507 (S32750)** = "Super Duplex"
- 응용: 해상 platform riser, oil & gas sour service, FPSO
- 약점: 475°C embrittlement (α'), σ phase

### 5.5 Precipitation Hardening (PH)
- Cr-Ni base + Cu (17-4 PH), Al (PH 13-8 Mo), Ti
- Solution Treated (austenite) → 시효 (martensite + ε-Cu 또는 NiAl 석출)
- σ_y 1100~1800 MPa + austenitic 의 부식 저항
- **17-4 PH** (가장 흔함), **15-5 PH**, **PH 13-8 Mo**, **17-7 PH**, **Custom 465**
- 응용: 항공 actuator, 페스너, AM LPBF 표준 stainless powder

## 6. Stainless 부식 메커니즘

### 6.1 Passivation
- Cr ≥ 10.5% → 표면에 Cr₂O₃ 부동태 (passive film, 2~5 nm)
- 흠집 시 자기-치유 (self-passivating)
- Cl⁻, F⁻ 가 부동태 침투 → 국부 부식 시작

### 6.2 Pitting (공식)
- Cl⁻ 가 부동태 약한 부위에서 침투 → 작은 점 부식이 깊이 진행
- PRE_N (Pitting Resistance Equivalent) = Cr + 3.3(Mo + 0.5W) + 16N
- 304: PRE_N ≈ 18 (낮음), 316: PRE_N ≈ 25 (보통), 2205: PRE_N ≈ 35 (높음), Super Duplex: PRE_N ≈ 43

### 6.3 Sensitization (입계 부식)
- 450~850°C 에 1시간 이상 머무를 시 Cr₂₃C₆ 가 입계에 석출
- 입계 주변 Cr depletion → 그 영역만 passive 안 됨 → 입계 부식 (IGC)
- 회피: low-carbon (304L, 316L) 또는 stabilized (321 Ti add, 347 Nb add)
- Welding sensitization = HAZ 의 sensitization

### 6.4 Stress Corrosion Cracking (SCC)
- 인장 응력 + 부식 환경 (Cl⁻ + 60°C+) → 균열
- Austenitic SS 가 가장 민감 (304/316)
- Duplex 와 ferritic 은 SCC 저항 양호
- 회피: shot peening (residual compressive stress), 응력 제거 anneal

### 6.5 Galvanic Corrosion
- 다른 metal 과 직접 접촉 + 전해질 → 더 anodic 한 metal 부식 가속
- Stainless vs Cu/brass → stainless 가 cathodic (보호받음)
- Stainless vs Zn/Mg → stainless 가 cathodic (Zn/Mg 빠르게 부식)
- 회피: insulating gasket, sacrificial anode

## 7. Hardness 변환표 (ASM Desk Edition Section "Mechanical Testing" 인용)

| HRC | HV | HB | UTS (MPa) approx |
|---|---|---|---|
| 20 | 240 | 226 | 770 |
| 30 | 302 | 283 | 970 |
| 40 | 392 | 370 | 1290 |
| 50 | 510 | 481 | 1740 |
| 55 | 600 | 560 | 2050 |
| 60 | 712 | — | 2400 |
| 65 | 832 | — | 2810 |

> ASTM E140 표준 변환표. Steel 에만 유효 — Al, Cu, brass 등은 별도 표.
> σ_UTS (MPa) ≈ 3.4 × HV (Steel, 경험식, ±10%)

## 8. 한국 KS / 일본 JIS / EU EN 대응

| AISI/SAE | KS D | JIS G | EN | 사용처 |
|---|---|---|---|---|
| 1018 | SM10C | S10C | C10E (EN 10083-2) | 일반 구조 |
| 1045 | SM45C | S45C | C45E | Axle |
| 4140 | SCM440 | SCM440 | 42CrMo4 (EN 10083-3) | Cr-Mo 표준 |
| 4340 | SNCM439 | SNCM439 | 36NiCrMo16 | Landing gear |
| 304 | STS304 | SUS304 | X5CrNi18-10 (EN 10088) | 식품/건축 |
| 316L | STS316L | SUS316L | X2CrNiMo17-12-2 | 의료/해양 |
| 17-4 PH | STS630 | SUS630 | X5CrNiCuNb16-4 | 항공 |
| H13 | STD61 | SKD61 | X40CrMoV5-1 | 다이캐스팅 |
| 5160 | SPS9 | SUP9 | 60SiCr8 | Leaf spring |
| 1095 | SK4 | SK4 | C100E | Knife, file |

## 9. 핵심 표준

- **AISI/SAE J403** (Carbon Steel composition)
- **AISI/SAE J404** (Alloy Steel composition)
- **ASTM A29** (Steel Bars, General Requirements)
- **ASTM A240** (Stainless Plate, Sheet, Strip)
- **ASTM A276** (Stainless Bars)
- **ASTM A564** (PH stainless)
- **ASTM A681** (Tool Steels)
- **KS D 3503/3752/3867** (한국 일반 구조강)
- **JIS G 4051/4053/4303** (일본 강재)
- **EN 10025 / 10083 / 10088** (EU 구조강·합금강·stainless)
