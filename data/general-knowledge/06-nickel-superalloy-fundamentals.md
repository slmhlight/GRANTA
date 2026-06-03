# Nickel Superalloys — 일반론

> 1차 출처: ASM Metals Handbook Desk Edition 2nd (1998), Section "Superalloys" — revised by Matthew J. Donachie (editor of *Superalloys Source Book*, ASM 1984)
> 추가 출처: Reed R.C. (2006) *The Superalloys: Fundamentals and Applications*, Cambridge UP / Donachie & Donachie (2002) *Superalloys: A Technical Guide* 2nd ed., ASM

## 1. Superalloy 의 정의 (ASM)

> "Superalloys are high-performance alloys based on iron, nickel, or cobalt that exhibit a combination of mechanical strength and resistance to surface degradation at elevated temperatures generally above 540°C (1000°F)."

세 가지 base:
- **Ni-base** (가장 흔함, 60%+ market): Inconel, Hastelloy, Waspaloy, Nimonic, Rene, Udimet, CMSX, MAR-M
- **Co-base**: Stellite, L-605, Haynes 188, Ultimet
- **Fe-Ni-base**: Incoloy, A286, 19-9 DL

## 2. γ / γ' / γ" 의 3 구조 — 강화의 핵심

### 2.1 γ matrix (모상)
- FCC (face-centered cubic) Ni-rich solid solution
- 합금화 원소: Cr (15-25%, 산화 저항), Co (Ni 대체), Fe, Mo, W (solid solution 강화)
- 1450~1600°C melting

### 2.2 γ' (gamma prime, Ni₃(Al, Ti))
- **L1₂ ordered FCC** intermetallic
- Coherent with γ matrix (lattice mismatch < 1%)
- Volume fraction 0~70% (Waspaloy ~25%, MAR-M 247 ~62%, CMSX-4 ~70%)
- 시효 시 cuboidal precipitates 형성
- **anti-phase boundary (APB) energy 높음** → dislocation 이 쌍으로 cut 해야 → 강도 ↑
- Ni-base superalloy 의 1차 강화

### 2.3 γ" (gamma double prime, Ni₃Nb)
- **D0₂₂ BCT ordered** intermetallic
- Ni-Nb-base alloy 만 형성 (Inconel 718, 706, 925)
- Coherent + 더 큰 lattice mismatch (~2.9%) → APB + coherency strain 강화
- 700°C+ 에서 δ phase (Ni₃Nb orthorhombic) 로 변태 → 강도 손실
- **사용 온도 한계 ~ 650°C** (γ' alloy 의 800°C 보다 낮음)

### 2.4 carbide (MC, M₂₃C₆, M₆C)
- Grain boundary 강화 (creep 저항)
- MC (TiC, NbC, TaC) = primary, 1300°C+ 형성
- M₂₃C₆ (Cr-rich) = 760-980°C aging 시 grain boundary
- M₆C (Mo, W rich) = 815-980°C
- 너무 많거나 너무 적으면 둘 다 grain boundary 약화

### 2.5 보조 phases (피해야 할 것)
- **σ phase** (Cr-rich tetragonal): brittle, 700-1000°C 형성
- **μ phase** (Mo-W rich): brittle
- **Laves phase** (Fe₂Nb 류): Inconel 718 의 segregation
- TCP (Topologically Close-Packed) phases 통칭

## 3. 합금 family (조성 + 응용)

### 3.1 Solid-solution 강화 only (γ' 미미)
- Cr, Mo, W 다량
- Service 온도 가장 높음 (~1200°C) 이나 강도 가장 낮음
- 응용: combustor liner, exhaust nozzle, heat exchanger
- 대표:
  - **Hastelloy X** (Ni-22Cr-18Fe-9Mo): 가스터빈 combustor (Apollo LM, SSME, GE F404)
  - **Haynes 230** (Ni-22Cr-14W-2Mo-LaB): heat exchanger, ETC reactor
  - **Inconel 625** (Ni-22Cr-9Mo-3.5Nb): 화학, SCR system

### 3.2 γ' precipitation hardened — Wrought
- Mid γ' (20-45%)
- Solution + double age
- 응용: 압축기 disc, blade, 단조 부품
- 대표:
  - **Waspaloy** (Ni-19Cr-13Co-4.3Mo-3Ti-1.3Al, ~25% γ'): 가스터빈 disc (P&W)
  - **Udimet 720Li** (Ni-16Cr-15Co-3Mo-2.5Al-5Ti, ~45% γ'): Trent 500/700/800/900 HP disc
  - **René 65 / 88DT / 95 / 104**: 차세대 disc

### 3.3 γ' precipitation hardened — Cast
- High γ' (45-70%)
- Conventional cast (CC), DS (Directional Solidified), SX (Single-crystal)
- 응용: 가스터빈 blade (가장 hot)
- 대표:
  - **CC**: IN-100, MAR-M 247, IN-738 (Inconel 738), René 80
  - **DS**: MAR-M 247 DS, IN-792 DS (transverse 입계 없음 → LCF 5-10x)
  - **SX**: CMSX-4, CMSX-10, René N5, PWA 1484 (입계 자체 없음, creep 1450°C+)

### 3.4 γ" precipitation hardened
- Nb 4-5%
- 압축기 disc + 용접성 우수
- 응용: 항공 엔진 모든 stage, SpaceX SuperDraco, Raptor injector
- 대표:
  - **Inconel 718** (Ni-19Cr-18.5Fe-3Mo-5Nb-1Ti-0.5Al): **모든 항공 엔진의 표준 disc**
  - **Inconel 706** (Inconel 718 변형): 토목 가스터빈 (GE Frame 9F)
  - **Allvac 718Plus** (Inconel 718 의 evolution): F-35 disc

### 3.5 Maraging-type (이중 강화)
- Co-Ni martensite + γ' 시효
- Co + γ' 동시 효과
- 대표: Pyromet 720 (Ti-rich)

### 3.6 ODS (Oxide-Dispersion Strengthened)
- 미세 Y₂O₃ 입자 (50 nm) 가 grain boundary pinning
- Mechanical alloying (분쇄 합금화)
- 사용 온도 1300°C+
- 대표: **MA754, MA956, MA6000** (Inco), PM2000 (Plansee)

## 4. 열처리 sequence (Inconel 718 예)

### 표준 720-718 cycle
1. **Solution Treatment** — 980-1065°C × 1h, water quench  → γ matrix + 미용해 carbide
2. **First Age** — 720°C × 8h, slow cool → γ" 미세 분산
3. **Second Age** — 620°C × 8h, air cool → γ' + γ" 추가 정밀

### Direct age (vacuum cast)
- Solution skip, 720°C 만 → 빠르고 비용↓ 하지만 강도 ~10% 손실

### Coarsening problem
- 700°C+ 장시간 운전 → γ" coarsening → 강도 손실
- AD730 (ONERA, 2010) 등 차세대 alloy 는 γ" coarsening 저항 ↑

## 5. 환경 저항 — 표면 강화

### 5.1 산화 (high-T oxidation)
- Cr ≥ 18% → Cr₂O₃ 보호막 (1000°C까지)
- Cr 부족 (예: MAR-M 247 의 8.4% Cr) → Al₂O₃ 보호막 (1200°C까지 안정)
- Al/Cr 비율이 산화 mode 결정

### 5.2 Coating
- **Aluminide** (NiAl, simple pack-cement): 1100°C 까지
- **Pt-modified aluminide** (PtAl): 1150°C 까지
- **MCrAlY overlay** (NiCrAlY, CoCrAlY, 50-200 µm): 1150°C
- **TBC** (Thermal Barrier Coating): YSZ (8% Y₂O₃-ZrO₂) plasma-spray 또는 EB-PVD, 250-500 µm, 100~150°C 표면 온도 ↓

### 5.3 Hot Corrosion (sulfidation)
- 850-950°C + Na₂SO₄ + V₂O₅ 등 → catastrophic
- 가스터빈 marine 환경 (sodium 분진)
- Cr + Ti 균형 (Cr ≥ 20%, Ti ≤ 1.5%)

## 6. Cast → DS → SX 진화 — Blade 의 미세조직 혁명

### CC (Conventional Cast)
- Equiaxed grain (모든 방향 입계)
- 1955-1970 표준
- Transverse 입계가 LCF 약점

### DS (Directional Solidified) — 1970s
- Columnar grain (한 방향 정렬)
- Transverse 입계 제거 → LCF +5x
- Furnace 의 Bridgman / chill plate
- MAR-M 247 DS = GE T700 (Black Hawk) 1단 blade

### SX (Single Crystal) — 1980s+
- 100% 입계 없음 (단일 결정)
- Wax pattern + grain selector
- **CMSX-4** (Cannon-Muskegon), René N5 (GE), PWA 1484 (P&W)
- Creep 1100°C 까지 사용 (CC 의 950°C 대비)
- 1985 P&W F100-PW-220 (F-15/16) 가 첫 양산 SX

### CMSX 시리즈 진화
- CMSX-2 (1세대, 1982): 1.1% Re
- CMSX-4 (2세대, 1985): 3% Re — 모든 차세대 표준
- CMSX-10 (3세대, 1995): 6% Re — 1150°C 영역
- CMSX-15 (4세대, 2010): Ru 추가

## 7. 핵심 응용 + 표준

| 응용 | 합금 | AMS/사양 |
|---|---|---|
| 가스터빈 HP disc (Trent) | Udimet 720Li | AMS 5663 |
| 가스터빈 HP disc (F-22) | Rene 88DT 또는 Udimet 720Li | AMS 5662 |
| 가스터빈 HP blade (CC) | MAR-M 247 | DOA AMS 5388 |
| 가스터빈 HP blade (SX) | CMSX-4 / Rene N5 / PWA 1484 | 자체 spec |
| 가스터빈 combustor | Hastelloy X / Haynes 230 | AMS 5754 / 5759 |
| 압축기 disc | Inconel 718 | AMS 5662 / 5663 |
| 핵 (PWR) SG tube | Inconel 690 / 800 | ASME B&PV |
| 화학 reactor | Inconel 625 / Hastelloy C-276 | ASME B&PV |
| SpaceX engine | Inconel 718 (LPBF) | 자체 |

## 8. 표준

- **AMS 5662** — Inconel 718 bar/forging
- **AMS 5596** — Inconel 718 sheet/plate
- **AMS 5666** — Inconel 625 bar
- **AMS 5759** — Hastelloy X sheet/plate
- **AMS 5754** — Hastelloy X bar
- **ASTM B435** — Inconel 600/625/X-750 sheet
- **ASTM B637** — Inconel 718 bar
- **DIN 17744 / 17745** — EU Ni alloy
- **JIS NCF-718 / NCF-625** — 일본 Ni alloy 명칭
- **Reed R.C. (2006)** — *The Superalloys*, Cambridge UP

## 9. 새로운 영역 — AM (LPBF) Ni superalloy

LPBF 표준 powder:
- **Inconel 718** = 가장 인기 (모든 vendor 의 default Ni powder)
- **Inconel 625** = 산업 응용 (Aerojet RL10 nozzle, SpaceX Merlin manifold)
- **Hastelloy X** = combustor (GE Catalyst)
- **CM247LC** = 새 시도 (Rolls-Royce 의 Pearl 엔진 candidate)
- **Haynes 282** = γ' alloy LPBF 도전
- **MAR-M 247** = SX 어려움이라 LPBF 부적합 (DS 도)

LPBF 후 처리:
1. Stress relief (1066°C, 90 min, air cool)
2. HIP (1163°C, 100 MPa, 4h, argon) — 기공 제거 + 입계 결합
3. Solution + double age (표준 wrought 와 동일)
