# Titanium Alloys — 일반론

> 1차 출처: ASM Metals Handbook Desk Edition 2nd (1998), Section "Titanium and Titanium Alloys" — revised by Rodney R. Boyer (Boeing Commercial Airplane Group), editor of *Materials Properties Handbook: Titanium Alloys* (ASM, 1994)
> 추가 출처: MMPDS-08 Chapter 5 Titanium

## 1. Ti 의 두 결정 구조 — β-transus 가 핵심

Pure Ti 는 882°C 에서 동형변태:
- **α phase**: HCP (조밀육방), 저온 안정
- **β phase**: BCC (체심입방), 882°C 이상 또는 β-stabilizer 첨가 시 상온 안정

**β-transus** = α → β 완전 전이 온도. 합금별로 다름:
- Pure Ti: 882°C
- Ti-6Al-4V: 995°C ± 15
- Ti-6Al-2Sn-4Zr-2Mo (Ti-6242): 1010°C
- Ti-13V-11Cr-3Al (β-Ti): 720°C (β-stabilizer 다량 → β-transus 낮음)

> β-transus 가 모든 열처리 설계의 기준점.

## 2. 합금 첨가 원소 효과

### α-stabilizer (HCP 안정화, β-transus ↑)
- **Al** (3~7%): 가장 흔한 α-stabilizer. 강도 + thermal stability ↑
- O, N, C (interstitial — embrittlement risk)
- ELI (Extra Low Interstitial) grade = O < 0.13% (Ti-6Al-4V ELI)
- Sn (substitutional, neutral 또는 weak α)

### β-stabilizer (BCC 안정화, β-transus ↓)
- **β-isomorphous** (β 와 무한고용): V, Mo, Nb, Ta, W
- **β-eutectoid** (eutectoid 형성, ω/intermetallic 위험): Cr, Cu, Fe, Si, Mn, Ni

### Neutral (β-transus 영향 미미)
- Zr (α-Ti, β-Ti 둘 다 substitutional 가능)
- Hf

## 3. 합금 분류 (β-stabilizer 양 기반)

### 3.1 α alloy
- α-stabilizer 만 (Al, Sn 등) 또는 commercial pure
- 100% α phase 상온
- 단순 열처리 (annealing 만), 용접 가능, creep 저항 우수
- 강도 가장 낮음 (σ_y 200~600 MPa)
- 대표: **CP Ti Gr.1/2/3/4** (pure), **Ti-3Al-2.5V** (= Ti Gr.9), **Ti-5Al-2.5Sn**

### 3.2 near-α
- Al ≥ 5% + 소량 β-stabilizer (Mo, V, Si)
- α 위주 + 미량 β (~5%)
- 고온 (500°C+) 강도 + creep 저항 → 항공 엔진 압축기
- 대표: **Ti-8Al-1Mo-1V (Ti-811)**, **Ti-6Al-2Sn-4Zr-2Mo (Ti-6242)**, IMI 685, IMI 829

### 3.3 α+β alloy
- 가장 흔한 분류. β-stabilizer 4~6%
- α + β 양상, β 약 10~25%
- 균형 잡힌 강도-인성-가공성
- 대표: **Ti-6Al-4V (Gr.5)** — 모든 Ti 의 56%, **Ti-6Al-6V-2Sn**, **Ti-6Al-7Nb** (의료)

### 3.4 near-β (metastable β)
- β-stabilizer 4~8 mass%
- 상온 β phase, quenching 후 ω/α' 석출 위험
- Solution + aging 으로 매우 높은 강도 (σ_y 1380 MPa)
- 대표: **Ti-10V-2Fe-3Al (Ti-1023)**, **Ti-5Al-5V-5Mo-3Cr (Ti-5553)**

### 3.5 β alloy
- β-stabilizer 매우 다량 (≥ 8 mass% Mo-equivalent)
- 100% β 상온 (또는 retained-β)
- Cold-formable, biocompatible, hardenable
- 대표: **Ti-15V-3Cr-3Al-3Sn (Ti-15-3)**, **Ti-13V-11Cr-3Al** (SR-71 historical), **Beta-C (Ti-3Al-8V-6Cr-4Mo-4Zr)**, **Beta-21S** (Boeing)

## 4. 열처리 modes

### 4.1 Mill Annealing (MA)
- β-transus 미만 (700~800°C) 풀림
- α+β alloy 의 standard delivery state
- 균형 잡힌 강도 + 균일한 미세조직
- Ti-6Al-4V MA: σ_y 830, σ_UTS 900, El 14%

### 4.2 Beta Annealing (BA)
- β-transus 위 (1050°C+) 가열 + 공냉
- Lamellar (Widmanstätten) α 형성 → KIC ↑ + creep 저항 ↑
- El 약간 ↓, σ_y 비슷
- Ti-6Al-4V BA: σ_y 830, KIC 80 MPa√m (MA 의 55 보다 ↑)

### 4.3 Solution Treated + Aged (STA)
- β-transus 아래 solution → 빠른 quench (water 또는 air) → 시효
- α+β 의 metastable α' 또는 β → 시효 시 secondary α 석출
- σ_y 1100, σ_UTS 1170, El 10% — peak strength
- 단점: KIC ↓ (60 정도)

### 4.4 Duplex Annealing
- Mill anneal + extra anneal at higher temp + slow cool
- α colony 크기 fine-tuning
- 항공 disc 의 표준 (압축기 disc)

## 5. Ti 의 가공 한계 — 갈링 (galling) + 산화

### 5.1 Cold workability
- HCP α 의 slip system 한계 → cold workability 낮음
- α + β 합금은 cold rolling 시 균열 위험 → hot rolling 으로 대체
- β alloy 는 100% BCC → cold-rollable
- 5xxx Mg 처럼 deep-draw 어려움

### 5.2 산화 (oxygen pickup)
- 500°C 이상 공기 노출 시 표면 산화막 + α-case 형성 (α-case = O 풍부 brittle 층)
- Hot working 전 vacuum / inert gas 분위기 필수 (Argon, He)
- 단조 후 산세 (chemical milling) 으로 α-case 제거

### 5.3 갈링 / Cold welding
- Ti vs Ti 접촉 + 미끄러짐 → 표면 cold welding (galling)
- Bolt / nut 모두 Ti 면 lubricant 필수 (MoS₂, AgPlating)
- Anti-galling coating (TiN, CrN PVD) 적용

### 5.4 가공성 (Machinability)
- AISI 1212 = 100% machinability rating 기준
- Ti-6Al-4V ≈ 22% (매우 어려움)
- 절삭 시 발열 ↑ + chip 분리 안 됨 → 절삭유 + 저속

## 6. CP (Commercial Pure) Ti — Grade 별 차이

| Grade | O max | N max | Fe max | σ_y (min) | 응용 |
|---|---|---|---|---|---|
| Gr.1 | 0.18% | 0.03% | 0.20% | 170 MPa | Heat exchanger, chemical |
| Gr.2 | 0.25% | 0.03% | 0.30% | 275 MPa | **가장 흔함** — 화학, 의료, 안경, 음식 |
| Gr.3 | 0.35% | 0.05% | 0.30% | 380 MPa | Chemical (higher T) |
| Gr.4 | 0.40% | 0.05% | 0.50% | 480 MPa | Implant (dental), 산업 |
| Gr.7 | 0.25% + 0.12~0.25% Pd | — | 0.30% | 275 MPa | Pd-modified for HCl resistance |
| Gr.11 | 0.18% + Pd | — | 0.20% | 170 MPa | Gr.1 + Pd |
| Gr.12 | 0.25% + Mo 0.2-0.4% + Ni 0.6-0.9% | — | 0.30% | 345 MPa | Chemical |

> Grade 가 높을수록 (O, Fe ↑) 강도 ↑, ductility ↓.

## 7. 의료 등급 Ti — ASTM F-series

| ASTM | 합금 | 응용 |
|---|---|---|
| F67 | CP Gr.1-4 | Dental, plate, screw |
| F136 | Ti-6Al-4V ELI | Hip stem, knee, dental implant |
| F1295 | Ti-6Al-7Nb | V 대신 Nb (V 의 alleged cytotoxicity 우려 회피) |
| F1472 | Ti-6Al-4V (non-ELI) | Hip stem (standard) |
| F1813 | Ti-12Mo-6Zr-2Fe | Beta-Ti orthopaedic |
| F2066 | Ti-15Mo | Beta-Ti 의료 |

## 8. 항공 등급 — AMS / MIL

| AMS | 합금 | Product form | 응용 |
|---|---|---|---|
| AMS 4911 | Ti-6Al-4V | Sheet, plate | F-22, F-35, 787 |
| AMS 4928 | Ti-6Al-4V | Bar, forging | Landing gear |
| AMS 4954 | Ti-6Al-4V ELI | Bar, forging | Cryogenic (LH2 tank) |
| AMS 4915 | Ti-6Al-4V | Annealed sheet | Fuselage frame |
| AMS 4983 | Ti-6Al-4V STA | High-strength | Wing pivot, attachment |
| AMS 4945 | Ti-6Al-2Sn-4Zr-2Mo | Forging | Engine compressor disc |
| AMS 4914 | Ti-3Al-2.5V (Gr.9) | Seamless tube | Aircraft hydraulic |
| AMS 4979 | Ti-10V-2Fe-3Al STA | Forging | F-22 landing gear |
| AMS 4985 | Ti-5Al-5V-5Mo-3Cr STA | Forging | F-35 landing gear |

## 9. 표준

- **ASTM B265** — Ti and Ti Alloy Strip, Sheet, Plate
- **ASTM B348** — Ti Bars and Billets
- **ASTM B381** — Ti Forgings
- **ASTM F-series** — Medical implants
- **AMS-T-9046, AMS-T-9047** — Mil-spec sheet/plate (구버전, AMS 대체됨)
- **MMPDS-08 Chapter 5** — Ti alloy A/B-Basis
- **JIS H 4600** — Ti plate/sheet
- **KS D 5575** — Ti plate

## 10. 핵심 응용 매트릭스

| 응용 | 1순위 합금 | 비고 |
|---|---|---|
| 항공 fuselage frame | Ti-6Al-4V (annealed) | F-22, F-35 표준 |
| Landing gear (initial) | Ti-10V-2Fe-3Al STA | F-22 |
| Landing gear (next-gen) | Ti-5553 STA | F-35 |
| 엔진 compressor disc | Ti-6242 | 압축기 600°C 영역 |
| 엔진 fan blade | Ti-6Al-4V (Wide-chord) | 모든 high-bypass turbofan |
| 의료 hip stem | Ti-6Al-4V ELI (F136) | ASTM F1472 standard |
| 의료 dental implant | CP Gr.4 (F67) 또는 Ti-6Al-4V ELI | Straumann, Nobel Biocare |
| Heat exchanger (chemical) | CP Gr.2 | Acetic acid, brine |
| 극저온 (LH2, LOX) | Ti-6Al-4V ELI | -253°C 까지 toughness 유지 |
| Cryogenic (LNG) | CP Gr.2 또는 5%Ni Steel (A553) 으로 대체 |
| AM (LPBF) | Ti-6Al-4V (Gr.23 ELI) | EOS, SLM, GE Additive 표준 |
