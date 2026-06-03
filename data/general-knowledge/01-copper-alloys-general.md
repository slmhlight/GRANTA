# Copper Alloys — 일반론

> 1차 출처: **풍산 Copper Alloy Products 카탈로그 2025** (Strip & Sheets)
> Cross-ref: ASM Metals Handbook Desk Edition 2nd, Section "Copper and Copper Alloys" (1998)

## 1. UNS · JIS · KS 매핑 (풍산 strip 제품군)

| 풍산 grade | 분류 | UNS | JIS | 주요 응용 |
|---|---|---|---|---|
| C1020 | Oxygen-Free Copper | C10200 | C1020 | Coaxial · bus bar · wire · automotive rectifier · sputtering target · heat sink |
| C1100 | Tough Pitch Copper | C11000 | C1100 | 일반 송배전 · 모터 권선 · 일반 가전 |
| C1030 | Phosphorus Deoxidized (Low P) | C10300 | — | 진공 brazing · 가스 배관 · 핵 부품 |
| C1220 | Phosphorus Deoxidized (High P) | C12200 | — | Gaskets · radiator · marine oil cooler · switch · casting mold |
| C2100 (RB1) | Red Brass | C21000 | C1220 | Coin · connector · bullet jacket · fuse cap · emblems · jewelry |
| C2200 (RB2) | Red Brass | C22000 | C2100 | Bolts · chain link · 장식 |
| C2300 (RB3) | Red Brass | C23000 | C2200 | Zipper · rotor bar (AC motor) |
| C2600 (B1) | Brass 70/30 (Cartridge) | C26000 | C2300 | Cartridge case · fastener (pin, rivet) · radiator · 트럼펫 bell |
| C2680 (BA) | Brass 65/35 | C26800 | C2600 | Switch · radiator |
| C2720 (B2) | Brass | C27200 | C2680 | Cold-drawn pipe · 정밀 가공 |
| C2800 (B3) | Brass 60/40 | C28000 | C2720 | Hot-rolled plate · marine fitting |
| C5111 (PB1A) | Phosphor Bronze 4% Sn | C51100 | C2801 | Spring · bearing · electrical contact |
| C5102 (PB1B) | Phosphor Bronze 5% Sn | C51000 | C5111 | Spring · diaphragm · bourdon tube |
| C5191 (PB2) | Phosphor Bronze 6% Sn | C51900 | C5102 | High-strength spring · welding rod |
| C5210 (PB3) | Phosphor Bronze 8% Sn | C52100 | C5191 | Heavy-duty spring · bushing |
| C5212 | Phosphor Bronze (Spring grade) | C52100 | C5212 | Precision spring |
| C5240 | Phosphor Bronze (Super Spring) | C52400 | — | High-cycle 정밀 spring |
| C7351 (NS1) | Nickel Silver 18% Ni | C73500 | C7351 | 식기 · 악기 · 전기 코어 |
| C7451 (NS2) | Nickel Silver 10% Ni | C74500 | C7451 | Optical instrument · zipper |
| C7521 (NS3) | Nickel Silver 18% Ni | C75200 | C7521 | Spring contact (electrical) |
| C7701 | Nickel Silver Spring | C77000 | C7701 | Switch · relay contact |

### 풍산 자체 P-series (catalog 표지에 list 만 있고 본 PDF 에 detail 미수록 — 별도 vendor 문의)

| P-series | base UNS | 특징 |
|---|---|---|
| P144C | C14410 | High-conductivity Sn-strengthened |
| P1806 | — | Modified high-strength |
| P102M | C18060 | Modified Cu-Cr-Zr |
| P90 / P90HYPER | C19015/C19210 | Mid-strength high conductivity |
| P194 / P194HSL | C19217/C19400 | Cu-Fe-P, lead-frame grade |
| P425 | C19400 | High-strength version of C19400 |
| P26 / P26HYPER | C42500/C64750 | Sn brass high-strength |
| P19005 / P1000HS / HS2 / HS3 | C64750/C19005/C64751/C64752 | Cu-Ni-Si family, **사용자 합금** (lead-frame, connector spring) |
| P70 | C70250 | Cu-Ni-Si (CuNiSi) cold-worked high-strength |

## 2. Temper code (cold rolling 정도)

| Temper | 가공도 | UTS / σ_y 변화 |
|---|---|---|
| **O** | Annealed (완전 풀림) | 가장 부드러움. σ_y 최소, El 최대 (~35%) |
| **1/4H** | Quarter-Hard (~10.9% cold work) | UTS 약 10% 증가, El ~25% |
| **1/2H** | Half-Hard (~20.7%) | UTS 약 20% 증가, El ~15% |
| **3/4H** | Three-Quarter-Hard (~29.4%) | UTS 약 30% 증가, El ~10% |
| **H** | Hard / Full-Hard (~37.1%) | UTS 약 40% 증가, El < 5% |
| **EH** | Extra-Hard (~50%) | UTS 약 50% 증가, El ~3% |
| **SP** | Spring (~60.5%) | 항복비 0.95 이상, El 거의 0 |
| **ES** | Extra-Spring (~68.6%) | 최대 강도 |

> Cold work % 는 ASTM B601 표준 기준.
> Cu (FCC) 는 work hardening 이 매우 효과적 — 70% cold rolling 후 σ_UTS 가 annealed 의 2배 가까이 증가.

## 3. Cu 합금의 부식 환경 — 풍산 카탈로그 일관 분류

### Resistant (안전 — 일반 환경에서 무한대 수명)
- 산업 대기 · 도시 대기
- 산업용수 · 음용수 (수도)
- 순수 수증기
- 비-산화성 산 (염산 묽음, 아세트산 등)
- 알칼리 (NaOH 묽음)
- 중성 염수 용액 (NaCl 농도 ≤ 3%)

### Not resistant (부적합 — 가속 부식 위험)
- 산화성 산 (질산, 농황산)
- 함수 암모니아 (NH₄OH) — Cu 와 강한 complex 형성
- 할로겐화 가스 (Cl₂, F₂, Br₂)
- 황화수소 (H₂S) — Sulfide film 형성, transient 강도 저하
- **해수 (high-flow rate 시)** — 정수 해수는 OK, 유속 ≥ 1.5 m/s 시 erosion-corrosion

> 해수 응용 (펌프 임펠러, 컨덴서) 에는 Cu 단체보다 NAB (C95800, Aluminum Bronze) 또는 Cupronickel 70/30 (C71500) 사용.

## 4. Fatigue strength rule of thumb (풍산 표기)

> "The standard fatigue strength for copper alloys is that reported for 100,000,000 cycles. It is about 1/3 of the tensile strength."

즉:
- **σ_fatigue (10⁸ cycle) ≈ σ_UTS / 3**
- Steel 의 σ_fatigue ≈ σ_UTS / 2 (10⁶ cycle 기준) 보다 보수적
- Cu alloy 는 endurance limit 가 명확하지 않으므로 (steel 과 달리 S-N 이 단조감소) cycle 수를 명시한 fatigue strength 가 표준

## 5. Fabrication property rating (풍산 4단계 평가)

각 합금 마다 풍산 카탈로그는 5가지 가공 특성을 **Excellent / Good / Fair / Not Recommended** 4단계로 평가:

| 가공 | Cu 평가 기준 |
|---|---|
| Capacity for Being Cold Worked | 35% cold rolling 시 균열 없이 가능 → Excellent |
| Capacity for Being Hot Formed | 800°C+ 에서 hot rolling 균열 없음 → Excellent |
| Soldering | Sn-Pb 솔더 wetting 양호 → Excellent |
| Brazing | BCuP 또는 BAg 봉 사용 가능 → Good 이상 |
| Oxyacetylene Welding | Cu 의 높은 thermal conductivity 로 입열 어려움 → Cu 대부분 Good 또는 Fair |
| Gas Shielded Arc Welding (TIG/MIG) | Ar 분위기 + 큰 입열 → Excellent (Cu 대부분) |
| Coated Metal Arc Welding (SMAW) | 봉 내 산화물 → porosity → Not Recommended (Cu 일반적) |

> 따라서 Cu alloy 의 표준 용접은 GTAW (TIG) 또는 GMAW (MIG) 가 1순위.

## 6. Stress relaxation — Cu 합금의 핵심 신뢰성 지표

> "Cantilever bending test equipment. Initial Stress: 80% of 0.2% Y.S. Parallel Rolling Direction."

- Spring contact (electrical connector, fuse cap) 는 100,000 시간 후에도 80% 이상의 초기 응력 유지가 필요
- 풍산 카탈로그의 모든 spring-grade alloy (C5212, C5240, C7521, P194HSL 등) 는 **150°C / 1000h 후 잔류응력 곡선** 을 제공
- 일반 cartridge brass (C26000) 는 stress relaxation 100h 만에 50% 손실 — spring 응용 부적합
- BeCu (C17200, 별도 catalog) 가 잔류응력 유지 1위 (1000h 후 95%+)

## 7. Bending property — 최소 굽힘 반경 r/t

| r/t 값 | 의미 |
|---|---|
| 0.0 | 두께의 0배 (sharp 90° bend OK) |
| 0.5 | 두께의 절반 |
| 1.0 | 두께의 1배 |
| 2.0 | 두께의 2배 (90° bend 시 균열 위험) |

**Good Way** = 압연 방향 횡(TD) 으로 bend  
**Bad Way** = 압연 방향(RD) 평행으로 bend (균열 위험 ↑)

> 풍산 모든 alloy 의 bending property 표는 두께 0.5 mm, 시편 폭 10 mm 기준 90° 와 180° bend 의 minimum r/t 를 4 temper (O, 1/4H, 1/2H, H) × 2 direction (Good way, Bad way) 으로 제공.

## 8. 핵심 표준

- **JIS H 3100** (Cu·Cu 합금 판·조)
- **KS D 5101** (한국 동·동합금 판조)
- **ASTM B36/B152/B370** (US copper sheet)
- **EN 1652** (Cu strip)

## 9. 응용 분야별 권장 grade (풍산 카탈로그 기반)

| 응용 | 1순위 | 2순위 | 비고 |
|---|---|---|---|
| 전기 권선 | C1020 (OFC) | C1100 (ETP) | 진공/수소 분위기는 OFC |
| Heat sink (반도체) | C1020 | C1100 | k > 380 W/m·K |
| 가스 배관 (LP/도시가스) | C1220 (P-high) | C1030 (P-low) | P 첨가로 H 취화 회피 |
| 동전 · 탄피 | C2600 (70/30) | C2680 (65/35) | Deep drawing |
| Spring contact | C5212 (PB) | C7521 (NS) | Stress relaxation 우수 |
| Connector lead-frame | P194HSL (C19400) | P1000HS | High-strength + 전도성 |
| Marine fitting | C61400 (Al-Bronze) | C71500 (CuNi 70/30) | 풍산 별도 catalog |
