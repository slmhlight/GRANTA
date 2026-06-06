# R135b — 필요 자료 10 + 삭제 후보 10

사용자 요청: "필요한 자료 요청 10가지 / 데이터 정확성/실용성 부족하여 삭제할 재료 10가지 말해줘."

---

## 1. 필요한 자료 10 (정확성/실용성 향상)

### Tier 1 — 마지막 anchor 부족 2 subfamily (Pipeline + Low-Temp 만 남음)
| # | 자료 | 출처 | 영향 |
|---|---|---|---|
| **1** | **A553 Type I + Type II Nippon Steel 9Ni catalog** | https://www.nipponsteel.com/product/catalog_download/9ni | Low-Temperature Steel 0% → 100% (남은 2 entries) |
| **2** | **API 5L X42N + X52M PSL2 vendor datasheet** | POSCO / JFE Steel line pipe PDF | Microalloyed Steel 0% → anchor 확보 |

### Tier 2 — 정확도 ±5% 도달 (HT multiplier 재calibrate)
| # | 자료 | 출처 | 영향 |
|---|---|---|---|
| **3** | **Inconel 718 STA + DSA full SMC-045 brochure** | Special Metals SMC-045 (전체 brochure, 현재 ST/STA만 있음) | HT multiplier 0.65 → 0.80 보정 |
| **4** | **Maraging C350 datasheet** (AMS 6520) | VascoMax / Carpenter | Maraging 350 anchor (현재 350 fatigue/KIC family fallback) |
| **5** | **Tool steel H13 HRC 44/50/53 별 실측** | Bohler-Uddeholm W302 / Orvar Supreme | Tool steel HRC variant multiplier 검증 |

### Tier 3 — Polymer / Ceramic 신뢰도 ↑
| # | 자료 | 출처 | 영향 |
|---|---|---|---|
| **6** | **PEI Ultem 1010 / 9085 SABIC datasheet** | https://www.sabic.com/en/products/specialties/ultem-resins | Polymer 신뢰도 (현재 ULTEM 9085 verified=0) |
| **7** | **PSU Udel + Radel PPSU Solvay datasheet** | https://www.solvay.com/en/product/udel-psu | Polymer 신뢰도 |
| **8** | **Al2O3 99.95% CoorsTek Vitox MSDS + datasheet** | CoorsTek (R128 99.5% 보유, 99.95% 보강) | Ceramic 신뢰도 |
| **9** | **Y-TZP Tosoh TZ-3Y-E full datasheet** (mechanical data) | https://www.tosoh.com/zirconia | Y-TZP 의 LTD curve / fatigue 실측 |
| **10** | **Si3N4 CeramTec/Kyocera HIP grade datasheet** | bearing/cutting tool grade | Ceramic 신뢰도 |

### Bonus — 한국 산업 (선택)
- POSCO PosMAC 2.0/4.0 Zn-Mg-Al coated steel — 자동차 부식 코팅
- 현대 HSCM800 (Hyundai Steel Cold Mold 800) — automotive mold
- 한국 KS B 0801 (인장 시험) 표준 적용 한국 강재 catalog

---

## 2. 삭제 후보 10 (정확성/실용성 부족)

기준: `verified=0` + `safetyScore<1` + `popularity≥3` + **대체 anchor 존재** + **vendor datasheet 부재 (web search 불가)**

| # | 재료 | 진단 | 대체 anchor |
|---|---|---|---|
| **1** | **AA 7005** (모든 HT variant 5종) | 자전거 frame specialty, 시중 datasheet 부재 | AA 7050 / 7075 |
| **2** | **AISI 1144 (Stressproof)** | 자유 가공 변종, datasheet 부재 | AISI 4140 / 1045 |
| **3** | **C68000** (high-Mn brass) | rare brass variant, datasheet 부재 | C26000 / C46400 |
| **4** | **C95500** (Cu-Ni-Al bronze) | propeller specialty, datasheet 부재 | C95400 / C95800 |
| **5** | **309S / 310S** (low-C 변종 — anchor 인 309 / 310 entry 와 별도) | 304/316 변종에 비해 specialty | AISI 309 / 310 (이미 처리) |
| **6** | **AISI 301 / 302** (모든 HT variant) | 304 의 high-strength 변종, 시중 spec 단편 | AISI 304 / 304L |
| **7** | **654 SMO** (Outokumpu super-austenitic) | Outokumpu 독점, spec 비공개 | 254 SMO (이미 보유) |
| **8** | **Zeron 100** (Rolled Alloys super-duplex) | Rolled Alloys 독점, spec 단편 | 2507 super-duplex |
| **9** | **AA 5454** (CSV-generic, R134a 누락) | AA 5xxx 시리즈 중 추가 변종 | AA 5052 / 5083 |
| **10** | **Bronze — As-supplied (Binder Jetting)** | AM bronze generic — vendor 명시 없음 | Specific bronze (C36000, C46400) |

### 추가 deletion 후보 (Polymer / Composite)
- **PET / PBT** (verified=0, vendor datasheet 부재) — R127 의 generic Granta entry 만 보유
- **GFRP variants** (E-glass/Epoxy, S-2 glass) — Hexcel 보유 없으면 family typical 만
- **Natural Composite — Hardwood (Oak)** — 가공/디자인 specialty, 의사결정 노이즈

→ 위 10개 metal entries 만 우선 제거 권장 (Polymer/Composite 는 정책 분리)

---

## 3. R135a 처리 결과 (사용자 13 PDF)

### 신규 entries (anchor 추가)
| Material | 효과 |
|---|---|
| **DP980 (HCT980X, EN 1.0944)** | **AHSS 0% → 40% anchor** (Granta + POSCO + ArcelorMittal verified) |
| **EH36 shipbuilding** (ABS/DNV/KR/LR) | **Shipbuilding 0% → 25% anchor** |
| **ASTM A588 Gr A** weathering | **HSLA 0% → 33% anchor** (Cor-Ten A equivalent) |

### Upgrade entries (verified URL 강화)
- **Maraging 300 (UNS K93120, AMS 6514)** — ANSYS Granta 482°C aged verified, KIC 75-85 / fatigue 768-816
- **Y-TZP 3 mol%** — CoorsTek datasheet URL + DURA-Z / TZ-3Y-E alias
- **CFRP — IM7/8552 Epoxy** — Hexcel HexPly verified (Boeing 787 / A350 primary structure)
- **CFRP — AS4/8552 Epoxy** — Hexcel HexPly verified (신규 entry)

### 신규 Polymer
- **PVDF Kynar 740** (Arkema) — Tensile 50 MPa / HDT 110°C / Tm 168°C / Shore D 78 / NSF 61 certified

### 결과
- 1,235 → **1,240** materials (+5)
- verified-source: 853 → **857** (+4)
- confidence_tier: high=513 → **517**, low=80 (unchanged)
- Anchor% 변화:
  - AHSS: 0% → **40%**
  - HSLA: 0% → **33%**
  - Shipbuilding: 0% → **25%**

### 남은 anchor 0% subfamily (2개만)
- Low-Temperature Steel (2 entries) — A553 9% Ni anchor 보강 필요
- Microalloyed Steel (2 entries) — API 5L X42M datasheet 필요

---

## 4. 우선순위 추천

**가장 큰 효과 (anchor 100% 달성)**:
- Tier 1 의 2 자료 (#1 A553 II 9Ni + #2 X42M) 추가하면 **27개 active subfamily 모두 anchor 보유**

**그 다음 (정확도 ↑)**:
- Tier 2 의 3 자료 (#3 IN718 SMC-045 + #4 Maraging C350 + #5 H13 HRC variants) → HT multiplier ±10% 정확도 보장

**Polymer/Ceramic 보강 (선택)**:
- Tier 3 의 5 자료 (#6-#10) → 1,200 entries 중 polymer 110 + ceramic 39 의 신뢰도 ↑

**삭제 적용 권장**:
- 위 10개 metal entries → R136a 에서 EXCLUDED_ALLOY_PATTERNS 에 추가 + 138 → ~138 entries 표시 제외

총 작업량 추정: 5 PDF 추가 + 10 entries 삭제 = **±2 시간 작업** (자동화 파이프라인 활용).
