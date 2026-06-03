# 현대제철 종합 카탈로그 — KS 강종 일반론 (PART 1 + 2)

> **출처**: 250116_현대제철종카pt1·pt2 (국영혼용) 웹게시용 PDF (Hyundai Steel Product Guide 2025, PART 1 + PART 2 = 486p + 691p, OCR 처리본)
> **목적**: KS·JIS 한국 산업 표준 구조용 강종을 영어권 (ASTM/SAE/EN) 등가와 매핑하고 mechanical spec 정리. 향후 DB 확장 시 우선순위 강종 선정 근거.
> 영어권 자료 (MMPDS/ASM) 에는 거의 없는 **한국 자체 표준 강종** 위주.

---

## 0. KS 강종 family 빠른 색인

| Prefix | Family | KS 표준 | 주 용도 | 등가 |
|---|---|---|---|---|
| **SS** | Rolled Steel for General Structure | KS D 3503 | 일반구조 (보·기둥·플레이트) | ASTM A36 / EN S235~S355 |
| **SM** | Rolled Steel for Welded Structure | KS D 3515 | 용접구조 (다리·선박·고압) | EN S275~S570 (Welded) |
| **SAPH** | Hot Rolled Plate/Sheet/Strip for Automobile Structural | JIS G 3113 (KS 동등) | 자동차 차체 구조 frame | EN S355MC |
| **SPFH** | Hot Rolled HSLA Sheets for Automobile Formability | JIS G 3134 | 자동차 고장력 성형 (door inner / chassis) | EN S420MC~S700MC |
| **SPFC** | Cold Rolled HSLA Sheet (고장력 냉연) | KS D 3567 | 자동차 외판 BH/DP/TRIP | EN HC380LA / DP590 / TRIP780 |
| **SPHC/D/E** | Hot Rolled Carbon Steel Plate | KS D 3501 | 일반 열연 (자동차·산업 기본 substrate) | EN DD11/12/13 |
| **SPCC/D/E** | Cold Rolled Carbon Steel Plate | KS D 3512 | 일반 냉연 | EN DC01/03/05/06 |
| **SGCC/SGC** | Hot-dip Galvanized Coil | KS D 3506 | 도금 (지붕·외장) | EN DX51D+Z, HX260LAD+Z |
| **SCM** | Cr-Mo Low-alloy Steel | JIS G 4053 | 기계구조 (축·기어·고강도 볼트) | SAE 4135/4137 (=4140) / 41XX series |
| **SNCM** | Ni-Cr-Mo Low-alloy Steel | JIS G 4103 | 고강도 기계요소 | SAE 86XX / 8617 / 8620 |
| **SK** | Carbon Tool Steel | JIS G 4401 | 공구 (knife·spring·shear blade) | EN C80W1 |
| **SPS** | Spring Steel | KS D 3701 | 스프링 (자동차 leaf spring) | SAE 6145/6150 / 50CrV4 |
| **S__C** | Carbon Steel for Machine Structure | JIS G 4051 | 일반 기계구조 (축·핀·환봉) | SAE 10XX (S45C ≒ 1045) |
| **STK** | Carbon Steel Tubes (General Structural) | KS D 3566 | 일반 구조 강관 | API 5L / EN 10210 S275 |
| **SGT** | Hot Rolled Coil for Carbon Steel Tubes (재료용) | KS D 3566/3568 | 구조 강관 source | (KS only) |
| **STKM** | Carbon Steel Tubes for Machine Structural | KS D 3517 | 정밀 기계 강관 (피스톤·실린더) | SAE 1018/1020/1022 |
| **STK N / SNT / SHT** | High Tensile Tubes for Tower Structure | KS D 3780/4108 | 통신·송전 tower 강관 | (KS only) |
| **SN** | Rolled Steel for Building Structure (내진) | KS D 3866 | 내진 건축 (Plate) | (KS only — JIS G 3136) |
| **SHN** | Hot Rolled H-Section for Building (내진) | KS D 3866 | 내진 H형강 (고층 구조용) | (KS only — JIS G 3136) |
| **SHP** | Steel H Pile | KS F 4603 | 토목 강널·파일 | (KS only) |
| **SD** | Steel Bar for Concrete Reinforcement | KS D 3504 | 철근 (RC 콘크리트 보강) | ASTM A615 G60/G75 / EN B500 |
| **SD-W** | Weldable Re-bar | KS D 3504 | 용접 가능 철근 (CE 제한) | ASTM A706 |
| **SD-S** | Seismic Re-bar (내진 철근) | KS D 3504 | 내진 (YR ≤ 1.25, El 강화) | ASTM A706 (Grade 60/80) |
| **SPA-H** | Atmospheric Corrosion Resistant Rolled Steel | JIS G 3125 | 내후성 (Cor-Ten 등가) | ASTM A242 / A588 |
| **SG** | Steel Sheet/Plate/Strip for Gas Cylinders | JIS G 3116 | LPG·CNG·산소 실린더 | ASTM A516 / A572 |
| **STB** | Boiler & Heat Exchanger Tubes | JIS G 3461 | 보일러·열교환기 | ASTM A178 |

---

## 1. 일반구조용 압연강재 (SS)  ·  KS D 3503

OCR 결과 spec table (Yield · Tensile · El) 정리. 두께 ≤16 mm 기준 typical:

| Grade | YS (N/mm²) min | UTS (N/mm²) | El 5호 (%) min | El 1A호 (%) min | 등가 |
|---|---|---|---|---|---|
| SS235 | 235 (t≤16) / 225 (t≤40) | 330~450 | 26 | 21 | ASTM A36, EN S235JR |
| SS275 | 275 / 265 | 400~510 (t≤16) / 410~550 (t≤40) | 21 | 19 | EN S275JR/J0/J2 |
| SS315 | 315 / 305 | (data not extracted) | 17 | 14 | EN S315MC |
| SS400 (구) | 245 | (data partial) | 17 | 13 | ASTM A283 C |
| SS410* | 245 | (data partial) | — | — | ASTM A1011/A1018 |
| SS450* | 285 / 275 | (data partial) | 16 | 14 | (한국 신규) |
| SS490 | 285 / 275 | (data partial) | 21 | 17 | EN S355JR/J0/J2 |
| SS540* | 400 / 390 | (data partial) | 13 | 11 | HA300/HA350 |
| SS550* | 400 / 390 | (data partial) | 13 | 11 | (한국 신규) |

> SS235 = ASTM A36 등가 (YS 235 MPa, UTS 330-450 MPa) — Hyundai Steel SS235/SS275/SS315 는 EN 표기 KS 신규 (구 SS400→SS275 매핑 이동 중).
> 일부 grade UTS 는 OCR table 폭 misalignment 로 정확값 누락 — 향후 DB 입력 시 KS D 3503 직접 참조 필요.

### 화학조성 (typ, max %)
- SS235: C ≤ 0.25, Mn ≤ 1.40, P ≤ 0.05, S ≤ 0.05
- SS275: C ≤ 0.25, Mn ≤ 1.40, P ≤ 0.05, S ≤ 0.050
- SS315: C ≤ 0.28, Mn ≤ 1.50
- SS410: C ≤ 0.30 (t<40 mm), Mn ≤ 1.60
- SS550: C ≤ 0.30, Mn ≤ 1.80

---

## 2. 용접구조용 강재 (SM) · KS D 3515

용접성능 보강. A·B·C·D suffix 는 Charpy 시험온도 차이 (A=시험 없음, B=0°C, C=-20°C, D=-40°C).

| Grade | YS (N/mm²) | UTS (N/mm²) | Charpy (J min) | 한국 적용처 |
|---|---|---|---|---|
| SM275 A/B/C/D | 275 | 410~550 | — / 27@0°C / 27@-20°C / 27@-40°C | (한국 신규) |
| SM355 A/B/C/D | 355 | 470~630 | — / 27@0°C / 27@-20°C / 27@-40°C | 다리·선박 |
| SM420 A/B/C/D | 420 | 520~660 | — / 27@0°C / 27@-20°C / 27@-40°C | 고압 보일러 |
| SM460 B/C* | 460 | 570~720 | 27@0°C / 27@-20°C | 고강도 구조 |
| SM490 A/B/C | 285 (t≤16) / 275 (16<t≤40) | 490~610 (t≤16) | — / 27@0°C / 27@-20°C | **한국 다리·선박 표준** |
| SM490 YA/YB | 365 (t≤16) / 355 | 490~610 | — / 27@0°C | (구버전, 신축 안 함) |
| SM520 B | 365 (t≤16) | 520~640 | 27@0°C | 고강도 다리 |
| SM570 | 460 | 570~720 | 47@0°C / 47@-20°C | 풍력·해양 구조 |

### 화학조성 (max %, SM490 typ)
- SM490A: C ≤ 0.20, Si ≤ 0.55, Mn ≤ 1.65, P ≤ 0.035, S ≤ 0.035
- SM490B: C ≤ 0.18 (B/C/D 는 C 함량 단계적 감축, 인성 ↑)
- SM490YA/YB: C ≤ 0.20 + V/Nb micro-alloy

> CE (Carbon Equivalent) = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15 ≤ 0.44~0.48 (SM 시리즈)
> Pcm = C + Si/30 + Mn/20 + Cu/20 + Ni/60 + Cr/20 + Mo/15 + V/10 + 5B ≤ 0.26~0.30 (저합금 용접균열성)

---

## 3. 자동차 구조용 압연강 (SAPH) · JIS G 3113 (KS 동등)

차체 frame·chassis 용 hot rolled steel. **한국·일본 자동차 산업의 표준 강종**.

| Grade | YS (N/mm²) min | UTS (N/mm²) min | El (%) min | 두께 (mm) | 등가 |
|---|---|---|---|---|---|
| SAPH310 | 185 (t≤14) / 175 (14<t≤2.5) | 310 | 32 (Lo=50mm), 35 (Lo=80mm) | 1.6~14 | EN HSS540AS |
| SAPH370 | 225 (t≤14) / 215 (14<t≤2.5) | 370 | 30 | 1.6~14 | HSS590AS |
| SAPH400 | 255 (t≤14) / 235 | 400 | 28 | 1.6~14 | HSS780AS |
| SAPH440 | 305 / 295 / 275 (depth-dependent) | 440 | 24 | 1.6~14 | EN S355MC |

### 화학조성 (max %)
- SAPH310/370/400/440: P ≤ 0.040, S ≤ 0.040 (KS·JIS Spec)
- 강도 ↑ 위해 Mn 0.5~1.5 + Nb·Ti·V micro-alloy

---

## 4. 고장력 자동차 hot rolled (SPFH) · JIS G 3134

성형성 강조 (drawing·bending). Door inner / chassis frame / suspension arm 등 복잡 부품.

| Grade | YS (N/mm²) min | UTS (N/mm²) min | El (%) min Lo=80mm | El (%) min Lo=5.65√So | 등가 |
|---|---|---|---|---|---|
| SPFH540 | 355 | 540 | 21 | 22~24 | EN S420MC |
| SPFH590 | 420 | 590 | 19 | 20~22 | S500MC |
| SPFH590Y (Yield Strength controlled) | 325 | 590 | — | 22~24 | (Y suffix = YS control 범위 narrow) |
| (extended) SPFH780 | 540 | 780 | — | 16~19 | S650MC* |
| (extended) SPFH980 | 700 | 980 | — | 14~17 | S700MC* |

### 화학조성 (max %, SPFH typ)
- C ≤ 0.12, Si ≤ 0.50, Mn ≤ 1.60~2.10, P ≤ 0.025, S ≤ 0.015
- micro-alloy: Nb ≤ 0.09, V ≤ 0.20, Ti ≤ 0.15~0.22

---

## 5. 자동차 냉연 고장력 (SPFC) · KS D 3567

자동차 외판 + door 외측 panel. 표면 미려 + 도장성.

OCR 추출된 grade 목록:
- SPFC340/370/440/490/590/780/980 (KS) — 등가 EN HC260~HC780 LA/DP grades
- **DP, TRIP, MART 강** 도 SPFC 시리즈 일부

> KS D 3567 spec table 은 PT1 OCR 에서 column 누락이 많음 → DB 추가 시 KS D 3567 + JFS·POSCO 자료 cross-check 필요.

---

## 6. 도금강 (SGC / SGCC) · KS D 3506

용융 아연도금 hot dip galvanized (Z-coating).

| Grade | UTS (N/mm²) min | El (%) min | YS controlled | 등가 |
|---|---|---|---|---|
| SGCC (commercial) | 270 | 28 | — | EN DX51D+Z |
| SGCD (drawing) | 270 | 32 | — | DX53D+Z |
| SGC340 (=SGC245Y) | 340 | 20 | 245 | HX260LAD+Z |
| SGC400 (=SGC295Y) | 400 | 18 | 295 | HX300LAD+Z |
| SGC440 (=SGC335Y) | 440 | 16 | 335 | (한국 신규) |
| SGC490 (=SGC365Y) | 490 | 14 | 365 | HX380LAD+Z |
| SGC570 (=SGC560Y) | 570 | 12 | 560 | HX420LAD+Z |

> **Z-spec**: Z140 (140 g/m²) ~ Z275 (275 g/m²) 양면 합. 외판/지붕/외장.

---

## 7. 내진 H 형강 (SHN) · KS D 3866  ★ 한국 자체 표준

> **JIS G 3136 의 SN 시리즈에서 한국이 H 형강 전용으로 발전시킨 표준**. 고층·내진 건축의 핵심.
> YR (Yield Ratio = YS/UTS) 상한 ≤ 85% 강제 → 항복 후 가공경화 여유 확보 (내진 ductility 의 핵심).

| Grade | YS (N/mm²) | UTS (N/mm²) | YR (%) max | Charpy (J min) | 등가 |
|---|---|---|---|---|---|
| SHN275 | 275~395 | 410~520 | 85 | 27 @ 0°C | (KS only) |
| SHN355 | 355~475 | 490~610 | 85 | 27 @ 0°C | (KS only) |
| SHN420 | 420~540 | 490~610 | 85 | 47 @ -5°C | (KS only) |
| SHN460 | 460 | 520~640 | 85 | 47 @ -5°C | (KS only) |
| SHN490 / SHN520 / SHN570 (2009 ed.) | — | — | — | — | (구 표기, 2024 폐지) |

### 화학조성 (max %)
- SHN275: C ≤ 0.20, Si ≤ 0.40, Mn ≥ 2.5×C
- SHN355/420/460: Mn 0.5~1.50 (420까지) / 1.00~1.60 (460), V ≤ 0.110, Nb ≤ 0.050, Nb+V ≤ 0.15
- CE max: 0.36 (SHN275) / 0.44 (SHN355) / 0.45 (SHN420) / 0.45 (SHN460)
- Pcm max: 0.25 (SHN275~460)

---

## 8. 토목 강널 (SHP) · KS F 4603

| Grade | YS (N/mm²) min | UTS (N/mm²) | 비고 |
|---|---|---|---|
| SHP275 | 275 | 410~530 | 일반 토목 (구 SHP235) |
| SHP275W | 275 | 410~530 | 용접용 |
| SHP355W | 355 | 470~630 | 용접용 + 고강도 |
| SHP450W | 450 | 550~720 | 용접용 + 초고강도 |

> "W" = Weldable (CE 제한)

---

## 9. 콘크리트용 철근 (SD) · KS D 3504  ★ 한국 건설 핵심

| Grade | YS (N/mm²) | UTS (N/mm²) | YR (%) max (Re/Rm) | El (%) min | 등가 |
|---|---|---|---|---|---|
| SD300 | 300~420 | YP × 1.15 min (≥345) | — | 16 (No.2호) | ASTM A615 G40 |
| SD400 | 400~520 | YP × 1.15 min (≥460) | — | 16 (No.2호) | ASTM A615 G60 |
| SD500 | 500~650 | YP × 1.08 min (≥540) | — | 18 (No.2호) | ASTM A615 G75 |
| SD600 | 600~780 | YP × 1.08 min (≥648) | — | 12 (No.2호) | ASTM A615 G80 |
| SD700 | 700~910 | YP × 1.08 min (≥756) | — | 12 (No.2호) | (KS only) |
| **SD400W** | 400~520 | YP × 1.15 min | — | 14 | ASTM A706 G60 |
| **SD500W** | 500~650 | YP × 1.15 min | — | 14 | ASTM A706 G75 |
| **SD400S** (내진) | 400~520 | YP × 1.25 min (≥500) | YR ≤ 1.25 | 10 | ASTM A706 G60 Seismic |
| **SD500S** | 500~620 | YP × 1.25 min (≥625) | YR ≤ 1.25 | 10 | ASTM A706 G75 Seismic |
| **SD600S** | 600~720 | YP × 1.25 min (≥750) | YR ≤ 1.25 | 10 | (KS only) |
| **SD700S** | 700~820 | YP × 1.25 min (≥875) | YR ≤ 1.25 | — | (KS only) |

### 화학조성 (max %)
- SD300~700: C ≤ 0.32 (S 가 가장 엄격), Si ≤ 0.60, Mn ≤ 1.60 (W) / 2.00 (S)
- SD400W/500W: CE ≤ 0.50%
- SD600S/700S: CE ≤ 0.67%

### Bend Test
- SD300/400: 180°, 내곡반경 = 2d (d=명목지름)
- SD500/600: 180°, D29-35: 4d, D38: 5d
- SD-W (weldable): 135° / 4d
- SD-S (seismic): 90° / 4d  → 내진은 더 가혹

---

## 10. KS↔JIS↔ASTM/SAE 매핑 빠른 참조

| KS | JIS | ASTM/SAE/EN | Notes |
|---|---|---|---|
| SS400 (구) ≈ SS275 (신) | SS400 | ASTM A36 | 일반구조 표준 |
| SM490A/B/C | SM490A/B/C | EN S355J0/J2/K2 | 용접구조 (한국 다리 표준) |
| SCM420 / SCM435 / SCM440 | SCM420/435/440 | SAE 4118/4137/4140 | Cr-Mo 저합금 |
| SNCM220 / SNCM630 | SNCM220/630 | SAE 8617 / 4340 | Ni-Cr-Mo |
| SK85 (SK5) | SK85 | C80W1 (DIN) | 탄소공구강 |
| SPS6 (SUP6) | SUP6 | SAE 6145/6150 + 50CrV4 | 스프링 |
| S45C | S45C | SAE 1045 | 기계구조 (한국 환봉 표준) |
| S55C | S55C | SAE 1055 | 고탄소 기계구조 |
| SPFH540/590 | SPFH540/590 | EN S420MC/S500MC | 자동차 |
| SPFC590DP / TRIP780 | (similar) | DP590 / TRIP780 | 자동차 외판 |
| SGCC | SGCC | EN DX51D+Z | 도금 commercial |
| SD400 | SD345 | ASTM A615 G60 | 철근 |
| SD400W | (none) | ASTM A706 G60 | 용접 가능 철근 |

---

## 11. DB 확장 우선순위 제안

> R98 (풍산 Cu) + R100 (현대제철 KS) 통합 검토 후 push 예정. 사용자 검토 대기.

**Tier 1 (한국 산업 표준, 즉시 추가 후보)**
1. **SHN275/355/420/460** — 한국 고층 건축 내진 핵심 (대체 등가 없음)
2. **SD400/500/SD400W/500W/SD400S/500S** — 콘크리트 보강 표준 (ASTM A615/A706 와 별도)
3. **SM490A/B/C** — 한국 다리·선박 용접 표준 (EN S355 매핑 가능하나 KS spec 별도)
4. **SS275/SS315** — 신 KS 일반구조 (구 SS400 후속)
5. **SAPH440** — 자동차 frame 표준 (현대·기아 OEM)
6. **SPFH590** — 자동차 chassis 표준

**Tier 2 (산업별)**
- SHP275W/SHP355W/SHP450W — 토목 강널
- SGCC/SGC400 — 건축 외장 + 가전
- STK490/STKM13B — 구조용 / 기계용 강관
- SG325 — 가스 실린더
- SPA-H — 내후성 (브릿지 / cor-ten 등가)

**Tier 3 (보완)**
- SS235/SS450/SS550 (구간 채움)
- SM275/SM355/SM420/SM570
- SD600/SD700 (초고강도 철근)
- SPFC590DP/SPFC780TRIP

---

## 12. 출처

- Hyundai Steel Product Guide 2025 (PART 1 + PART 2)
  - Hot Rolled Coil / Cold Rolled Coil / Steel Plate (PART 1, 486p)
  - H Section / Re-Bar / Special Steel / Heavy Machinery (PART 2, 691p)
  - 국·영 혼용 + OCR 처리본 (사용자 제공)
- KS D 3503 (일반구조용 압연강재) · KS D 3504 (콘크리트용 철근) · KS D 3506 (도금) · KS D 3515 (용접구조용) · KS D 3517 (기계구조 강관) · KS D 3566 (구조 강관) · KS D 3567 (냉연 고장력) · KS D 3866 (건축구조용 H형강) · KS F 4603 (강널)
- JIS G 3101 / G 3106 / G 3113 / G 3134 / G 3136 등 KS 의 모태
- ASTM A36 / A572 / A992 / A615 / A706 / A1011 / A1018 등 등가
- EN 10025 (S235~S570) / EN 10149 (S315MC~S700MC)
