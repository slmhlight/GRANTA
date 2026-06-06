# Changelog

All notable changes since R45 (post-Manus recovery). Format: `R##` references the round of work.

## R135 — 13 PDF anchor 완성 + 필요 자료 10 + 삭제 후보 10

R134b 의 후속 작업. 사용자 13 PDF 추가 제공 + 필요/삭제 list 요청.

### R135a — 13 PDF 처리

**신규 entries (anchor 추가)**:
- **DP980 (HCT980X, EN 1.0944)** — AHSS subcategory 재분류 + Granta + POSCO + ArcelorMittal verified
- **EH36 shipbuilding** (ABS/DNV/KR/LR class, ASTM A131) — Shipbuilding anchor (Charpy -40°C ≥27J)
- **ASTM A588 Gr A** weathering steel — HSLA anchor (Cor-Ten A equivalent)

**Upgrade entries (verified URL 강화)**:
- **Maraging 300** (UNS K93120, AMS 6514) — ANSYS Granta verified, KIC 75-85, fatigue 768-816
- **Y-TZP 3 mol%** — CoorsTek SDS + DURA-Z/TZ-3Y-E alias
- **CFRP — IM7/8552** — Hexcel HexPly verified (Boeing 787 / Airbus A350 primary structure)
- **CFRP — AS4/8552** — Hexcel HexPly verified 신규 entry

**신규 Polymer**:
- **PVDF Kynar 740** (Arkema fluorinated homopolymer) — NSF/ANSI 61 certified, Tensile 50 / Tm 168°C

**Anchor% 변화**:
| Subfamily | R134a | R135a |
|---|---|---|
| AHSS | 0% | **40%** |
| HSLA | 0% | **33%** |
| Shipbuilding | 0% | **25%** |

**최종 통계**:
- 1,235 → 1,240 materials
- verified-source: 853 → **857**
- confidence_tier: high 513 → **517**, low **80** (unchanged)

### R135b — 필요 자료 10 + 삭제 후보 10 (data/r135b-action-list.md)

**필요한 자료 10 (Tier 1-3)**:
1. A553 Type I+II Nippon Steel 9Ni — Low-Temp anchor 완성
2. API 5L X42N + X52M PSL2 vendor — Microalloyed anchor
3. Inconel 718 STA + DSA SMC-045 full brochure — HT multiplier 0.65→0.80 calibration
4. Maraging C350 datasheet (AMS 6520) — Maraging 350 anchor
5. Tool steel H13 HRC 44/50/53 실측 — HRC variant multiplier 검증
6. PEI Ultem 1010/9085 SABIC datasheet — Polymer 신뢰도
7. PSU Udel + Radel PPSU Solvay datasheet — Polymer 신뢰도
8. Al2O3 99.95% CoorsTek Vitox MSDS — Ceramic 신뢰도
9. Y-TZP Tosoh TZ-3Y-E mechanical full datasheet — LTD/fatigue 실측
10. Si3N4 CeramTec/Kyocera HIP grade datasheet — Ceramic 신뢰도

**삭제 후보 10 (Metal only)** — `verified=0` + `safety<1` + `popularity≥3` + 대체 anchor 존재:
1. AA 7005 (모든 HT 5 variants) → AA 7050/7075
2. AISI 1144 (Stressproof) → AISI 4140/1045
3. C68000 (high-Mn brass) → C26000/C46400
4. C95500 (Cu-Ni-Al bronze) → C95400/C95800
5. 309S / 310S (low-C 변종) → AISI 309/310 (이미 보유)
6. AISI 301 / 302 (HT variants) → AISI 304/304L
7. 654 SMO (Outokumpu specialty) → 254 SMO
8. Zeron 100 (Rolled Alloys super-duplex) → 2507
9. AA 5454 → AA 5052/5083
10. Bronze — As-supplied (Binder Jetting) → Specific bronze (C36000, C46400)

→ R136a 에서 EXCLUDED_ALLOY_PATTERNS 추가 권장 (총 ~30-40 CSV 행 추가 제외).

검증: pnpm check / pnpm test (47 pass) / pnpm build 21s

## R134 — 24 PDF anchor 보강 + 8 alloy 명시 삭제 + 품질 로드맵

R133b 의 후속 작업. 사용자 24 PDF 추가 제공 + "자료 없는 entry 삭제 고려" + "확장 < 정확성" 명시.

### R134a — 24 PDF 처리 + 8 alloy 삭제

**삭제 (사용자 명시)**:
- Build pipeline `EXCLUDED_ALLOY_PATTERNS` 추가 — 152 CSV 행 자동 제외
  - Ti-5-8-5 (β-Ti specialty, datasheet 0)
  - AA 7178 (구형 aerospace Al)
  - AA 5005 / 5050 / 5154 / 5251 / 5356 / 5383 (Al-Mg variants — AA 5052/5083 으로 대체 가능)
- 결과: 1,291 → 1,235 materials (-56 = -152 CSV + 96 신규/upgrade)

**신규/upgrade entries (verified URL + handbook 데이터)** — 16 entries:
- **AISI 303/305/308/309/317** austenitic anchor 확장 (Granta + Outokumpu verified)
- **AISI 436/440A/440B/446** ferritic/martensitic anchor (Granta + Crucible/ATI verified)
- **AA 1200** (UNS A91200) — CP Al anchor 3 conditions (O/H14/H19)
- **AA 6151 T6** (Anticorodal forging) + **AA 6463 T4/T6** (architectural extrusion)
- **Ti Grade 11** (Ti-0.2Pd, UNS R52250) — Pd corrosion-resistant α-Ti
- **AA 2099 (Arconic Airware) + AA 2198 + AA 2196** (FAA DOT/TC-18/21 verified) — Al-Li anchor
- **API 5L X65 / X70 PSL2** (Octalsteel + API spec verified) — Pipeline anchor
- **Rail Steel R260 + R350HT** (BS EN 13674-1 + Nippon Steel verified) — Rail anchor
- Build pipeline 개선:
  - `aaSubcategory()` 에 Al-Li (2050/2090/2099/2195-9) 별도 분리
  - `NAME_BASED_OVERRIDE` 에 Al-Li priority rule
  - **subcategory mismatch** 해결 — Al-Li 가 "Aluminum - Pure/Other" 로 잘못 normalize 되던 문제 fix

**Anchor% 변화 (3rd_family heuristic 효과)**:
| Subfamily | Before | After |
|---|---|---|
| Aluminum - Lithium | 0% | **83.3%** |
| Pipeline Steel | 0% | **33.3%** |
| Rail Steel | 0% | **28.6%** |
| Stainless Austenitic | 52% | (anchor 5종 추가) |
| Stainless F/M | 59% | (anchor 4종 추가) |

**Confidence tier 재분류**:
| Tier | R133 | R134a | Δ |
|---|---|---|---|
| high | 487 | **513** | +26 |
| medium | 436 | 435 | -1 |
| medium-low | 237 | **207** | -30 |
| **low** (default hide) | 131 | **80** | **-39%** |

verified-source: 827 → **853** (+26).

### R134b — 품질 향상 로드맵 (data/quality-improvement-roadmap.md)

사용자 명시 응답: "확장보다는 데이터베이스의 질과 정확성을 향상시키는 작업".

**Tier 1 — Anchor 부족 5 subfamily 해결 (남은 anchor 0%)**:
1. DP980 / POSCO TWIP1180 — AHSS 3 entries
2. ABS/DNV-GL EH36 + DH32 — Shipbuilding 3
3. A553 Type II (Nippon 9Ni) — Low-Temp 2
4. ASTM A588 Cor-Ten verified URL — HSLA 2
5. API 5L X42N + X52M — Microalloyed 2

**Tier 2 — HT multiplier 정확도 검증**:
6. Inconel 718 STA + DSA full SMC-045 — multiplier 0.65 → 0.80 calibration 필요 (Granta ST/STA 데이터로 확인됨)
7. Maraging 350 aged vs over-aged
8. Tool steel H13 HRC 44 vs 50 vs 53
9. Ti-6Al-4V STA vs HIP fatigue

**Tier 3-4 — Polymer/Ceramic/Composite 보강**:
10. Solvay PVDF Kynar 740 / Victrex PEEK 450G / Hexcel HexPly 8552 / CoorsTek Y-TZP

### ⚠️ "A553" 처리 보류
사용자 list 의 "A553" 은:
- a553.pdf (R133a) 데이터 보유 + 9% Ni LNG tank 한국 산업 중요 grade
- 현재 보수적 처리: 중복 통합 + a553.pdf 데이터 활용
- 사용자 의도 확인 요청 (literal 삭제 vs 중복 제거만 vs 그대로 유지)

검증: pnpm check / pnpm test (47 pass) / pnpm build 21s

## R133 — 10 PDF + 5 URL anchor 보강 + 자신감 낮은 10 material 식별 + confidence_tier 자동 분류 + UI hide toggle

R132b 의 후속 작업. 사용자 자료 추가 + "가장 자신없는 재료 10개" 질문 + "표시하지 않는것도 하나의 방법" 권한 위임.

### R133a — 10 PDF + 5 URL 처리
사용자 제공: A36 · TWIP 500/980 · A536 · A553 · SA516 · 22MnB5 (3 conditions) · Inconel 718 ST · Inconel 718 STA · API 5L grades · AZoM Zircaloy-4 (7644) · Armox 600T SSAB · A572 Leeco Steel.

**신규/upgrade entries (verified URL + handbook 데이터)**:
- **ASTM A36** (UNS K02600): Carbon Steel → **Structural Steel** subcategory 재분류, Granta + AISC verified
- **ASTM A572 Gr50** (UNS K02303): 신규 — HSLA structural anchor
- **SA516 Gr70 / P355N** (UNS K02700, EN 1.0562): 신규 — Pressure Vessel anchor (Granta + ASME verified)
- **Armox 600T** (SSAB armor): 신규 — Armor Steel anchor (HBW 570-640, σy 1500, KIC 35)
- **22MnB5 USIBOR 1500** (BS EN 10083-3): 3 conditions (high ductility blank / hot-stamped peak / Q+T) — ArcelorMittal verified
- **Zircaloy-4** (UNS R60804): AZoM 7644 + ASTM B353 verified URL
- **ASTM A536 Ductile Iron 80-55-06**: 신규 — general purpose anchor
- **ASTM A536 Ductile Iron 100-70-03**: 신규 — Q+T high-strength

**Anchor% 변화** (3rd_family heuristic 효과 확인):
| Subfamily | Before | After |
|---|---|---|
| Press-Hardening Steel | 0% | **100%** |
| Zirconium Alloy | 0% | **100%** |
| Armor Steel | 0% | **60%** |
| Cast Iron | 0% | **50%** |
| Pressure Vessel | 0% | **33%** |
| Structural Steel | 0% | **31%** |

### R133b — 자신감 가장 낮은 10 material + 표시 정책 (data/least-confident-materials.md)

사용자 질문 응답:

**Top 10 자신감 가장 낮음** (verified=0 + safetyScore<1 + popularity≥3 + 대체 anchor 존재):
1. Ti-5-8-5 (β-Ti specialty) — 7 HT variant 모두 fallback
2. AA 6151 (Al-Mg-Si forging — 사장된 grade)
3. AA 7178 (구형 aerospace Al-Zn)
4. AA 7005 (자전거 frame — datasheet 부재)
5. AA 5005 / 5050 / 5154 / 5251 / 5356 / 5383 (Al-Mg 변종 6종)
6. AISI 303 / 305 / 308 / 309 / 317 (austenitic 변종 5종)
7. AISI 436 / 440A / 440B / 446 (martensitic 변종 4종)
8. AA 6463 (architectural extrusion)
9. Ti Grade 11 (Pd-corrosion specialty)
10. AA 1200 (CP Al)

**Confidence tier 자동 분류** (`confidence_tier` 필드):
- **high**: 487 entries (37.7%) — verified ≥2 또는 measured ≥4 + verified ≥1
- **medium**: 436 entries (33.8%) — verified ≥1 또는 (handbook ≥6 + safety props 신뢰 OK)
- **medium-low**: 237 entries (18.4%) — verified=0 + handbook ≥4
- **low**: 131 entries (10.1%) — verified=0 + safety props 거의 fallback → **default hide**

**UI filter toggle 추가**:
- FilterSidebar 의 "규제·Regulatory" 섹션에 "Low-confidence 숨기기 (default ON)" 체크박스
- default ON → 1,291 → ~1,160 entries 만 일반 사용자에게 표시
- 토글 OFF 시 131 low-confidence entries 노출 (power user / 학술 비교 용)

**최종 통계**:
- 1,280 → **1,291** materials (+11)
- verified-source: **816 → 827** (+11)
- 검증: pnpm check / pnpm test (47 pass) / pnpm build 21s

## R132 — 4 추가 자료 (Aermet 100 / Haynes 282 / Custom 465 / Ti-6-4 ELI Gr23) + 3rd_family heuristic 평가

R131 의 후속 작업. 사용자 PDF 3개 + AZoM URL 1개 추가 제공.

### R132a — 4 자료 handbook 승격
- **AerMet 100** (UNS K92580 / AMS 6532, ANSYS Granta + Carpenter): 3 conditions (Aged 468/475/482°C) 정밀 데이터
  - σy 1620-1790 / UTS 1930-2130 MPa / KIC 105 / fatigue 737-772 / CTE 10.4 / Cp 495
- **Haynes 282** (Haynes Intl H-3173F 2023): 5 conditions (RT, 538°C, 649°C, 760°C, 871°C) + creep_rupture table
  - 표준 HT: Solution Anneal 1135°C + Age 1010°C/2h + 788°C/8h
- **Custom 465** (Carpenter datasheet AMS 5936 / MMPDS-01): 5 conditions H950/H975/H1000/H1025/H1050
  - H950 peak: σy 1669 / UTS 1765 / Charpy 30J / KIC 104 / HRC 49.5
  - subcategory: "Stainless Steel - Ferritic/Martensitic" → **"Stainless Steel - PH"** (corrected)
- **Ti-6Al-4V Grade 23 ELI** (AZoM 9365 + ASTM F136): UNS R56401 의료 implant 신규 entry
  - 2 conditions (annealed + STA), Extra Low Interstitial (O ≤0.13%, N ≤0.03%, Fe ≤0.25%)
- Build pipeline: ALLOY_SPECIFIC + ALLOY_FAT_IMPACT 의 aermet100/custom465 값을 Granta/Carpenter 실측으로 calibrate

### R132b — 3rd_family + HT heuristic 신뢰도 평가 (data/3rd-family-heuristic-assessment.md)
사용자 질문 응답: "3rd family + HT heuristic이면 꽤 신뢰도가 높겠지?"

**Confidence tier 별 expected error band**:
- measured: ±5-10%
- handbook (alloy-specific): ±10-15%
- **handbook (alloy × HT-adjusted): ±15-20%** ← R129 multiplier
- **subfamily (3rd family): ±15-25%** ← 사용자 질문의 답
- family (2nd family): ±25-40%
- class (1st family): ±40-60%
- derived: ±25-30%

**17-4 PH 사례 검증 결과**: handbook + HT 조합 평균 오차 **±5%** (ASM Vol.1 실측 대비).

**Anchor 가용성** (scripts/audit-3rd-family.mjs):
- 안정적 (anchor ≥50%): 13 subcategory — Stainless PH 95.5%, Maraging 100%, Refractory 86.5%, Alloy Steel 83.9% 등
- **부족 (anchor 0%, 총 14 subfamily)**: Structural Steel (11 entries) · Rail (5) · Pressure Vessel (4) · Pipeline (4) · Press-Hardening (3) · AHSS (3) · Zirconium (3) · Shipbuilding (3) · Cast Iron / Al-Li / Low-Temp / HSLA / Armor / Microalloyed (각 2)

**필요 자료 Top 5 (우선순위)**:
1. ASTM A36 + A572 Gr50 (Structural Steel)
2. API 5L X65/X70 (Pipeline + Microalloyed)
3. 22MnB5 Usibor 1500 (Press-Hardening + AHSS)
4. Zircaloy-4 / Zr-Nb cladding (Zirconium nuclear)
5. Inconel 718 STA vs DSA SMC-045 (HT multiplier 검증)

**결과**: 1,268 → **1,280** materials, verified-source **804 → 816**.

## R130 + R131 — Vague-HT 62건 + Unverified 21건 + Specialty alloy + DB 신뢰성 평가

R129 의 후속 작업. 사용자 요청: "솔직하게 데이터를 보여줘야해. 후속작업 다 하면 DB의 신뢰성에 대해 전체적으로 평가."

### R130a — Vague-HT 62건 → 0건
- **scripts/patch-vague-ht.mjs** 신규: 44 supplementary entries 에 `heat_treatment` 명시값 주입
  - Ni superalloy 표준 mill product condition: Haynes 230 ("Solution Annealed 1230°C WQ"), Inconel 718 ("Solution + Double Aged AMS 5662"), Waspaloy ("Solution + 2-stage Aged AMS 5708") 등
  - Single crystal (CMSX-4 / Rene N5 / PWA1484): "Solution + 2-stage Aged" 명시
  - Tool steels (P20 / S7 / A2 / D2 / D3 / O1 / CPM 3V / CPM S30V / H11 / M4 HSS / M42 HSS): standard Q+T condition
  - Maraging / Incoloy / Hastelloy 계열 26종 추가
- **build-materials.mjs 개선** — supplementary loader 가 name 에서 HT 자동 추출 ("— Wrought, Aged" / "— H900" 등 패턴)
- **build-materials.mjs 개선** — `resolveAsSupplied()`: "As-supplied" 를 process 별 의미로 변환 ("As-built (no post-processing)" for LPBF/DMLS, "Mill-annealed (ASTM default)" for Wrought)
- 결과: vague-HT **62 → 0**

### R130b — Unverified high-popularity 21건 → 0건
- `data/standard-datasheets.json`: 다음 alloy regex pattern + verified URL 추가
  - AISI 410 → AK Steel (`aksteel.com/our-products/stainless/410-stainless-steel`)
  - AISI 420 → AK Steel
  - AISI 430 → AK Steel
  - AISI 1010 → MakeItFrom (`makeitfrom.com/material-properties/AISI-1010-G10100-Carbon-Steel`)
  - ASTM A36 → MakeItFrom (`ASTM-A36-SS400-S275-Structural-Carbon-Steel`)
  - ASTM A572 → AISC steel construction manual
  - Naval Brass C46400 → Copper.org (`copper.org/resources/properties/db/datasheets/c46400.html`)
  - Inconel 718Plus → ATI Allvac (`atimetals.com/Products/Pages/Allvac-718Plus-Alloy.aspx`)
- 기존 410/420/430 stainless pattern 강화 (AISI/SAE/SUS prefix 매칭)
- 결과: unverified high-pop **21 → 0**, verified-source materials **781 → 804** (+23)

### R130c — Specialty alloy lookup 추가
- `ALLOY_FAT_IMPACT` + `ALLOY_SPECIFIC` 에 16종 신규:
  - SAE 21-4N (21Cr-4Ni-9Mn-0.5N exhaust valve, NACE 7-7)
  - Narloy-Z (Cu-3Ag-0.5Zr SSME chamber, NASA TM-86932)
  - Monel 400 / Monel K-500 (Special Metals SMC-093/016)
  - Invar 36 (CTE-driven, Carpenter)
  - Kovar (FeNiCo, Edge/CRS)
  - CuNi2SiCr (C18000 family)
  - Ti-6246 (β-rich, TIMET)
  - Aermet 100 / Aermet 310 (UHS Carpenter)
  - Custom 465 / Custom 475 (Carpenter PH stainless)
- `htConditionMultiplier()` 에 분기 추가:
  - SAE 21-4N: Solution Treated(0.65 f, 1.40 i) / Solution + Aged peak(1.0) / hot strength 700°C(0.65·0.90)
  - Narloy-Z: Solution Annealed(0.65 f, 1.50 i) / Solution + Aged peak(1.0) / creep regime(0.55)
  - Carbon/alloy steel: as-built(0.85·0.90), Q+T heavy section(0.95·0.85) 추가
- audit script 개선: HT-insensitive alloy (austenitic SS / solid-solution Ni / Invar / pure refractory) 의 annealed/solution/stress-relieved 사이 flatline 은 OK 분류
- 결과: TRUE flatlines **367 → 65** (-82%), OK flatlines **0 → 88** (정상 분류됨)

### R131 — DB 전체 신뢰성 평가 보고서 (data/db-reliability-assessment.md)
사용자 명시 요청 "솔직하게" 응답:

**전체 통계**:
- 1,268 materials total (Metal 1067 / Polymer 110 / Ceramic 39 / Composite 34 / AM 7 / curated 99)
- Property slots (Metal 18,139 기준):
  - measured **15.9%** / handbook **58.4%** → **74.3% 신뢰 영역**
  - subfamily 10.5% / family 2.1% / class 8.0% / derived 2.9% → **23.5% fallback 영역**
- Source verified: **804 / 1268 = 63.4%**

**솔직한 한계 명시**:
- ✅ Curated AM materials (99종) HIGHEST CONFIDENCE — vendor datasheet round-robin 실측
- ✅ ANSYS Granta PDF 추출 entry HIGHEST CONFIDENCE
- ⚠️ HT multiplier 가 handbook 표 기반 추정 — vendor 실측과 ±15% 편차 가능
- ⚠️ σf ≈ k·UTS derived (2.9%): 알로이별 ±25% 편차
- ⚠️ Family-level KIC fallback (≈70% of metals): ±50% 가능
- ⚠️ Price ±30-50% 변동 (RFQ 필요)
- ⚠️ 65 TRUE flatlines 남음 (subtle HT variation 미반영)
- ⚠️ Polymer/Ceramic/Composite 신뢰도 Metal 대비 낮음

**Fallback algorithm 신뢰성 검증** (17-4 PH 사례):
- R128 이전: H900~H1150 모두 fatigue 600 / impact 30 / KIC 90 (완전히 잘못됨)
- R129 이후: ASM Vol.1 실측값 대비 평균 -2% ~ +20% 편차 (대부분 ±10% 이내)

**권장 사용 가이드**:
- 임계 설계: measured + handbook 만 사용
- subfamily 이하: sanity check 용도로만
- UI confidence badge + provenance tooltip 으로 출처 명확히 확인

## R129 — 모든 금속 데이터 + fallback 검증 / HT-aware multiplier / provenance trace

사용자 요청: 17-4 PH H900/H1025/H1075/H1150 동일 fatigue/impact/KIC 표시 → fallback 출처 불명. "모든" 금속 검증 및 fallback 출처 명시.

### 1) 근본 원인
build-materials.mjs 의 `alloyFatigueImpact()`, `ALLOY_SPECIFIC.kic`, `KIC_FALLBACK`, `FATIGUE_RATIO` 가 alloy name token 만 매치 → **heat-treatment condition 미반영**. 367 "flatline" (서로 다른 HT 가 동일 값).

### 2) Audit script (scripts/audit-metals.mjs)
- Subcategory-level confidence breakdown (measured/handbook/subfamily/family/class/derived)
- HT-variant 간 secondary prop flatline 검출 (TRUE vs OK distinction)
- Low-confidence high-popularity gap 추출
- Unverified high-popularity entry 추출
- Vague-HT precipitation-hardened entry 추출
- Report: data/metals-audit-before.txt · data/metals-audit-after.txt · **data/metals-fallback-audit.md**

### 3) HT-aware multiplier (`htConditionMultiplier(m)`)
17개 alloy family 분기 + peak-aged baseline 기준 condition multiplier `{f, i, k}`:
- **PH stainless**: H900(1.0) / H1025(0.90·1.40·1.20) / H1075(0.85·2.20·1.45) / H1150(0.78·3.0·1.60)
- **Maraging**: annealed(0.40·3.50·1.50) / aged peak(1.0)
- **Tool steel**: annealed(0.30·4.0·2.20) / Q+T peak(1.0) / Q+T high-temper(0.78·1.50)
- **Ni precipitation HT** (Inconel 718/X-750/Waspaloy/Haynes 282): annealed(0.60) / STA·DSA(1.0) / as-built(0.80)
- **Ni solid-solution** (Inconel 600/625/Hastelloy): annealed(1.0) / CW(1.20·0.70)
- **Ti-6Al-4V**: mill annealed(1.0) / STA(1.10·0.90) / HIP(1.05) / β-annealed(0.85) / as-built(0.85)
- **β-Ti** (Ti-6242/5553/15-3): annealed(0.85) / STA(1.0)
- **Stainless austenitic**: solution annealed(1.0) / CW(1.40·0.50)
- **Stainless martensitic** (410/420/440): annealed(0.45·2.80·1.60) / Q+T peak(1.05·0.70·0.85) / Q+T high-temper(0.85·1.40·1.25)
- **Stainless ferritic** (430/446): annealed(1.0 HT-insensitive)
- **Spring steel** (SUP/5160/9260): annealed(0.45·3.0·1.60) / Q+T 380°C(1.05) / Q+T 430°C spring(1.0)
- **Mild steel** (1010/1020/A36): annealed(0.95·1.20) / normalized(1.05) / CW(1.25·0.60)
- **Medium-C steel** (1040/1045/1095): annealed(0.50·2.50·1.80) / Q+T peak(1.0)
- **Bearing steel** (52100/100Cr6/SUJ2): annealed spheroidized(0.40·2.50·1.50) / Q+T peak(1.0)
- **Case hardening** (8620/9310): carburized(1.10·0.85) / annealed(0.55)
- **BeCu** (C17200/Moldmax): TB00 annealed(0.35·3.50·1.80) / TF00 peak(1.0) / TH04 CW+aged(1.10·0.40·0.75)
- **Cu-Cr-Zr** (C18100/C18150): wp(1.0) / whp CW+aged(1.30·0.50·0.80) / annealed(0.45)
- **Brass** (C26000/C46400): annealed(0.65·1.40) / H02(1.15) / H04(1.25) / H08-H10(1.40·0.55)
- **Alloy steel Q+T** (4140/4340/8740/300M): annealed(0.50·2.50·1.80) / Q+T 200°C full hard(1.15·0.40·0.65) / Q+T 550-650°C(0.92·1.40·1.25) / Q+T 450°C peak(1.0)
- **CoCr/F75/F1537**: solution annealed(1.0) / HIP(1.10) / CW(1.30·0.55)

baseline 출처: ASM Vol.1 Steel HT · MMPDS-08 (PH) · Nickel Institute Pub 9019 (Ni superalloy) · AMS 4928 (Ti-6Al-4V) · ASM Vol.4 (Maraging) · AA Standards (Al T-tempers) · CDA TB46 (Cu-Be).

### 4) Provenance trace (PropertyRange.provenance)
모든 fallback 적용 시 출처 기록:
- `alloy:174ph` — alloy-specific 직접 매치
- `alloy:174ph × HT:H1075 (f×0.85, i×2.2)` — alloy peak + HT 조정
- `realprops:haynes282 × HT:as-built (no age) (f×0.8, i×1.3)`
- `subfamily:Stainless Steel - Austenitic` — 3rd family typical
- `family:Iron-based steel` — 2nd family
- `family:Fe-based σf≈0.45·UTS (Shigley/MMPDS family typical)` — derived
- `class:PH stainless × HT:H1150 (i×3.0)` — class + HT
- `class:Stainless Austenitic` — 1st family default

UI: MaterialDetail.tsx 의 confidence badge tooltip 에 "출처: <provenance>" 표시.

### 5) 결과
| Metric | Before | After | Δ |
|---|---|---|---|
| TRUE flatlines | 367 | **145** | -60% |
| OK flatlines (peak-equivalent) | (없음) | 12 | 분류됨 |
| 17-4 PH 4-condition 분기 | ❌ 모두 600/30/90 | ✅ 600·540·510·468 / 30·42·66·90 / 90·108·130·144 | 정상 |

### 6) 추가 변경
- `client/src/lib/materials.ts` — PropertyRange 에 `provenance?: string` + 'subfamily' | 'family' confidence 추가
- `client/src/components/MaterialDetail.tsx` — confidence badge tooltip 에 provenance 노출

### 7) 후속 작업 (R130+)
- Vague-HT 62건 (Inconel X-750 / Haynes 230 / Waspaloy / single crystal 등) HT 명시 필요
- Unverified high-popularity 21건 (AISI 1010/410/430, A36, Naval Brass) verified URL 추가 필요
- Specialty alloy lookup 확장 (Narloy-Z, SAE 21-4N, Monel 400 condition tracking)

## R128 — 9개 ANSYS Granta PDF 분석: HX / Al₂O₃ / M250 / H13 / C18100 / Ti-6242 / C17200

R127 의 "이런식으로 요청할 다른 재료들" 응답에 사용자가 9개 PDF 제공 (E:\Downloads\):
HX.pdf, Al2o3.pdf, M250.pdf, H13.pdf, 181501.pdf (C18100 wp), 181502.pdf (C18100 whp), 6242.pdf (Ti-6242), moldmax1.pdf (C17200 TF00), moldmax2.pdf (C17200 TH04).

사용자 가이드라인: 폴리머 후순위 · 국내 강재 후순위 · 세라믹은 정말 필요한 것만 (DB 는 기본적으로 금속 위주).

### 1) PDF 추출 (Git mingw pdftotext)
- 9 PDF → text (data/polymer_pdfs/HX.txt 등) — R127 와 동일 파이프라인.

### 2) 기존 엔트리 handbook 승격 (supplementary-materials.json — 5건)
| 엔트리 | 변경 사항 |
|---|---|
| **Hastelloy X** (Ni superalloy) | Composition Ni→41~54 명시, points YS/UTS/El/E/HV → AnsysGranta (UNS N06002, AMS 5536) |
| **Tool Steel H13** | UNS T20813 / EN X40CrMoV5-1 / SKD61 alias 명시, points YS 1610-1690 / UTS 1940-2040 (HRC 50-53), Bohler URL 강화 |
| **Ti-6Al-2Sn-4Zr-2Mo** | Composition Si 0.06-0.1 추가, 3 conditions (α-β annealed / β annealed / STA), TIMET URL verified=true |
| **Beryllium Copper C17200 (CuBe2)** | 기존 placeholder → AnsysGranta TF00 + TH04 conditions, Materion URL verified=true |
| **Alumina 99.5%** (ceramics-data.json) | E 380→400 GPa, KIC 4.2→6.0, CTE 8.1→8.9, density 3.89→3.96, CoorsTek datasheet URL |

### 3) 신규 엔트리 추가 (2건)
- **Maraging 250 (UNS K92890/K92940)** — AMS 6512, 1.6359, 482°C maraged 2 conditions
- **Copper-Cr-Zr C18100 (CuCr1Zr)** — EN CW106C, 2 conditions (wp solution+aged / whp CW+aged), heat sink for ITER

### 4) build-materials.mjs ALLOY_SPECIFIC 조정
- `c18100` 추가: `{ec:87, tmax:350, price:10, cte:16.85, poisson:0.345, cp:390, melt:1080, kic:47}` + fatigue/impact
- `c18100` alias: UNS C18100 / EN CW106C / CuCr1Zr / Elbrodur
- `maraging250` KIC 110→85, cp 450→490 (Granta calibration)
- `ti6242` KIC 65→76, poisson 0.34→0.36, cp 460→490, price 50→28 (Granta)

### 5) 결과
- 1,261 → **1,268** materials (+7)
- verified-source: 776 → **781** (+5)
- KIC fallback 956→963, Fatigue fallback 919→924
- 검증: `pnpm check` clean · `pnpm test` 47 pass · `pnpm build` 21s

## R127 — 사용자 제공 PDF 분석 12 polymer + C18000 handbook 보강

R126 의 데이터 부족 Top 10 응답으로 사용자가 ANSYS Granta 형식 polymer datasheet PDF 20개 (E:\Downloads\) + C18000 AzoM URL 제공.

### 1) PDF 추출 파이프라인
- Git mingw 의 `pdftotext.exe` (C:\Program Files\Git\mingw64\bin\) 사용 → 20 PDF → text (data/polymer_pdfs/*.txt).
- ANSYS Granta layout (Young's modulus / Tensile strength / Elongation / HDT / Tg / Tm / CTE / Thermal-k / Price KRW÷1300) 파싱.

### 2) 12 polymer 추가 (data/polymers-data.json: 19 → 31 entries)
중복 PEEK Victrex 450G 1건 제외:
- **PMMA**: Injection grade · Cast acrylic sheet (Plexiglas/Perspex class)
- **PC**: Standard MW (Lexan/Makrolon class) · High Viscosity (Tough grade)
- **PVC**: Rigid (uPVC) Type I Pipe/Profile grade
- **POM**: Copolymer (Hostaform/Celcon, Acetal) · Homopolymer (Delrin, Acetal)
- **PP**: Homopolymer Clarified/Nucleated (Borealis/Total class)
- **PA-GF**: PA6-GF65 E-glass woven laminate (Tepex class) — `Polymer - Polyamide GF` 로 routing
- **PBT**: General-purpose Unfilled · 30%GF Glass-fiber reinforced (Crastin/Valox class)
- **PET**: Semi-Crystalline Engineering grade (Rynite/Arnite class)

### 3) C18000 (CuNiSiCr) handbook 데이터 보강
- AzoM (https://www.azom.com/article.aspx?ArticleID=6323) 에서 실측 값 추출.
- 기존 supplementary 의 placeholder ([8.8, 380, 550, 12, 130, 160, 200] 등) → handbook 값 [8.75, 483, 586, 10, 114, 190, 208] 단일 row.
- Composition fix: Cu 96.4 / Ni 2.4 / Si 0.6 / Cr 0.45 / Fe 0.15 (range → exact).
- Source verified=true 로 승격, AzoM URL 첨부.
- `ALLOY_SPECIFIC` 에 `c18000: {ec:50, tmax:480, price:25, cte:16.5, poisson:0.34, cp:380, melt:1070, kic:60}` + fatigue/impact table 추가.

### 4) 결과
- 1,040 → 1,041 materials (C18000 deduplicate) · 776 verified sources (+1)
- KIC fallback 956 entries · Fatigue fallback 919 entries
- 검증 통과: `pnpm check` clean / `pnpm test` 47 pass / `pnpm build` 21s

## R126 — 2nd_family 분기 + 추가 subcategory pattern + Fallback range 차별화

### 1) 추가 subcategory pattern (~70 신규 매칭)
build-materials.mjs 의 `assignPhysicals` 각 family 에 3rd/2nd 분기 대량 추가:

**Iron-based 확장** (5 → 19 패턴):
- 기존: invar/kovar/stainless/maraging/tool
- 신규: austenitic/martensitic/ferritic/duplex/PH, alloy steel (41xx-43xx/86xx/93xx), carbon steel (10xx low/high), spring steel (51xx/61xx/SUP), bearing (52100/100Cr6), cast iron, KS 강 (SM/SHN/SD/SAPH/SPFH/STK/SGCC/POSCO), 내후성 (Cor-Ten/A242), structural (A36/A572/S235-S690)
- 2nd: 일반 stainless / 일반 alloy steel

**Aluminum-based 확장** (3 → 9 패턴):
- 1xxx (pure) · 2xxx (Al-Cu/Al-Li) · 3xxx (Al-Mn) · 5xxx (Al-Mg) · 6xxx (Al-Mg-Si) · 7xxx (Al-Zn) · 8xxx · 3xx.x cast · Scalmalloy

**Nickel-based 확장** (7 → 11 패턴):
- Single crystal (CMSX/Rene N5) · DS cast (Rene 80/MAR-M-247/IN-738) · Inconel 718/X-750/706 · Inconel 625/617 · Inconel 600/601 · Waspaloy/Nimonic/Udimet · Hastelloy · Haynes · Monel · Incoloy · Nitinol
- 2nd: 일반 superalloy

**Copper-based 확장** (3 → 9 패턴):
- BeCu (C17xxx) · Cu-Ni (C70xxx-C715xx) · nickel silver (C75xxx) · brass (C2xxxx-C3xxxx) · bronze (C5xxxx-C9xxxx) · Cu-Cr-Zr · pure Cu (C10xxx-C12xxx)
- 2nd: Cu-Zn group / Cu-Sn group

**Titanium-based 확장** (3 → 7 패턴):
- CP Ti (Gr.1-4) · Gr.7 (Ti-Pd) · Ti-6Al-4V (Gr.5) · near-α (Ti-6242) · near-β (Ti-5553/Ti-10-2-3/Ti-15-3) · α+β (Ti-834)

**Cobalt-based 확장** (1 → 5):
- Stellite · CoCrMo · MP35N · L605 / Haynes 25

**Magnesium-based 확장** (1 → 5):
- WE43 · AZ31/61/91 · AM50/60 · ZK60/ZE41

### 2) Fallback range 차별화
이전: 모든 level 에서 min=max=typical (range 없음)
변경: level 별 spread 적용 → ranges 의 min/max 가 신뢰도 구간 표시
- `handbook`: ±0% (정밀)
- `subfamily`: ±15%
- `family`: ±30%
- `class`: ±50%
- `derived`: ±40%

사용자 detail panel 의 `range` 표시가 좁을수록 정밀, 넓을수록 추정 → 시각적 신뢰도 평가 가능.

### 3) 결과 — Confidence 분포 큰 개선

| Label | R125 | R126 | 변화 |
|---|---|---|---|
| handbook | 12,194 | 12,194 | (1차 자료) |
| measured | 3,247 | 3,247 | (실측) |
| **subfamily** | **888** | **2,216** | **+149%** |
| **family** (신규) | 0 | **448** | 신규 |
| **class** | 4,213 | **2,437** | **-42%** |
| derived | 1,818 | 1,818 | |

class 4,213 → 2,437 (42% 감소). 더 정밀한 subfamily / family 로 1,776 entry 재분류.

### 4) 데이터 부족 alloy Top 10 추출 (`scripts/find-data-gaps.mjs`)
popularity ≥ 4 + score (handbook + measured + verified) 낮은 순:

| Rank | Name | Category | 이유 |
|---|---|---|---|
| 1 | **PET** | Polymer | verified URL 0 |
| 2 | **PBT** | Polymer | verified URL 0 |
| 3 | **PA6-GF** (glass fiber) | Polymer | handbook 만, vendor datasheet 없음 |
| 4 | **Polypropylene** (homopolymer) | Polymer | handbook 만 |
| 5 | **Acetal (POM)** | Polymer | measured 만, family typical 없음 |
| 6 | **PVC** (rigid) | Polymer | measured 만 |
| 7 | **C18000 (CuNiSiCr)** | Metal | verified 0, vendor datasheet 없음 |
| 8 | **PC As-supplied** | Polymer | measured 만 |
| 9 | **PEEK As-supplied** (Injection) | Polymer | measured 7개 |
| 10 | **PMMA As-supplied** | Polymer | measured 만 |

Polymer 9 / Metal 1. PolyMix 위주 부족.

### 검증
- tsc OK · build:data OK · production build OK

## R125 — Ceramic/Composite 카드 hide + Fallback chain 3rd→2nd→1st + 검수 script

사용자 보고: Si₃N₄ (Ceramic) 에 절삭성/HT 카드가 부적절하게 표시. + fallback 체계화 + 랜덤 검수 프로세스 요청.

### A. Ceramic / Composite 가공·HT 카드 hide
- `lib/welding-machinability.ts`: `machiningCostBand()` / `htCostBand()` 에 `category` 파라미터 추가
  - `Ceramic` / `Composite` → null 반환 (절삭/HT 자체 부적용)
- `MaterialDetail.tsx`: 호출에 `material.category` 전달
- `ComparePanel.tsx` mini dot row 도 동일
- `build-materials.mjs`: source 단에서 `m.category === 'Ceramic'/'Composite'` 시 `machining_cost_factor` / `ht_cost_factor` 자체를 `null` 로 설정 — Cost 영역 표시도 X

### B. 랜덤 샘플 검수 script (`scripts/audit-random-sample.mjs`)
- 사용: `pnpm audit:sample [N] [category] [subcategory]`
- 동작:
  - 시드 기반 shuffle (재현 가능, 일자 + 인자 기반)
  - 각 entry 의 핵심 derived value (cost factors, fallback levels, family typical 출처, 카드 표시 여부) 출력
  - 자동 flag: Ceramic/Composite 에 가공/HT 카드 부적절, condition/form/grade 모두 1.0 (fallback 의심)
  - `data/audit-random-samples.md` 에 issue log 누적
- 첫 실행 (Ceramic 10 sample): 10/10 가공성 카드 flag 확인 → R125a 로 fix 완료

### C. Fallback chain 3rd → 2nd → 1st family
- `assignPhysicals()` 의 family 분기 결과에 `level` 메타 추가:
  - `3rd_family`: 특정 subgroup (예: stainless-austenitic, kovar, invar, tool steel, maraging)
  - `1st_family`: category 일반 (예: Iron-based 일반 강)
  - (`2nd_family` 는 향후 분기 추가 시 사용)
- `setTyp` 호출 시 `level` → confidence 라벨 매핑:
  - `3rd_family` → `'subfamily'` (sky-blue, "sub-fam")
  - `2nd_family` → `'family'` (cyan, "family")
  - `1st_family` → `'class'` (amber, 기존)
- `MaterialDetail.tsx` confBadge 에 `subfamily` / `family` 신규 색상 + tooltip:
  - "3rd family typical (예: 스테인리스 austenitic / Al 7xxx — 특정 subgroup)"
  - "2nd family typical (예: 스테인리스 일반 / Al 일반 — group)"
  - "1st family / category typical (예: Iron-based 일반 / Polymer 일반)"

### 효과 (confidence 라벨 분포)
| Label | Count |
|---|---|
| handbook | 12,194 |
| measured | 3,247 |
| class | 4,213 |
| derived | 1,818 |
| **subfamily** (신규) | **888** |
| (none) | 586 |

이전 `class` 4,213 → 일부 (888) 가 더 정밀한 `subfamily` 로 재분류 됨. 사용자 detail panel 에 "sub-fam" 배지 (blue) 가 표시되는 항목들은 단순 category 평균이 아닌 특정 subgroup typical.

### 검증
- tsc OK · vitest 47/47 · build:data OK · production build OK
- `pnpm audit:sample 10 Ceramic` 으로 flag 정상 동작 확인

### 향후 확장 (별도 회차)
- 2nd_family 분기 추가 (예: stainless 전체 group typical, Al 전체 group typical)
- 더 많은 subcategory pattern matching (현재 stainless / maraging / tool 만 3rd; invar/kovar)
- subfamily / family 라벨 별 별도 색상 UI 차별화

## R119 — 전반적 audit 6 fixes (high + medium 우선순위)
사용자 요청: "다른 버그나 동작 안하는 버튼 있는지 전반적으로 체크". 정적 분석 후 6 issue fix.

### HIGH (broken/incorrect) — 3건
1. **Tools.tsx LMP Guide link** `#ch9` (AM 특화 챕터) → `#ch5` (Chapter 8 비틀림·좌굴·복합·압력 — LMP 실제 위치)
2. **ComparePanel exportPNG width restore leak**: html2canvas 가 throw 시 element style.width 가 모바일에서 1024px 로 stuck. `restoreWidth()` helper + finally 블록으로 이동, idempotent guard
3. **ComparePanel exportPDF popup race**: 이전 `setTimeout(print, 500)` 가 stylesheet load 보다 빨리 호출 → unstyled print. `addEventListener('load', ...)` + readyState fallback 으로 변경

### MEDIUM (annoying/regression risk) — 2건
4. **Home.tsx localStorage Safari private mode crash**: 4 location 의 getItem/setItem 을 try/catch 로 wrap:
   - `am_cards_hint_shown` getItem (L86)
   - `am_cards_hint_shown` setItem (L94)
   - `am_panel_w` useState initializer (L205)
5. **MaterialDetail.tsx empty `style={{}}`** UL94 flame row 에 dead code → 제거

### LOW (cosmetic) — 1건
6. **CLAUDE.md "13-chapter learning Guide"** stale (Guide ch15 추가로 실제 14 chapter) → "14-chapter learning Guide"

### 검증
- tsc OK · vitest 47/47 · production build OK
- audit 에서 확인된 false positive: Guide cross-link 14건 검사 → 1건만 잘못 (LMP), 13건 OK
- `.map()` key prop 모두 valid, dynamic Tailwind class 없음, zero-rendering hazard 없음

### Audit 에서 발견했으나 fix 안 함 (사용자 결정 시 진행)
- ComparePanel `confirm()` (clearAll) → sonner toast 패턴으로 변경 가능 (low priority)
- Home.tsx hash regex 가 mount 1회만 — `hashchange` listener 누락 (in-page navigation 시 미동작)
- AshbyChartPlotly toast 가 forceIndexKey 변경마다 stack 가능
- MaterialDetail `useStateRD` alias (기존 collision 해결 후 stale rename 권장)
- ComparePanel radar size `window.innerWidth` mount-time 캡쳐 (resize 시 stale)

## R116 — 가격 다차원 모델 (condition + form + grade premium)
사용자 지적: "비슷한 재료에서 다 비슷한 값들을 가져서 제대로 비교가 안됨. 열처리 여부에 따라서도 가격이 달라져야 할거같은데 안되고 있는듯". 정확한 진단 — 이전 `price_per_kg` 은 family base 한 값만 사용 + condition/process 무시.

### 신규 다차원 가격 모델
build-materials.mjs 에 3 multiplier 함수 추가:

**1) `priceConditionFactor(m)`** — heat_treatment / temper 기반 가격 배수
| Condition | factor | 예시 |
|---|---|---|
| As-supplied / as-rolled | 1.00 | mill 상태 그대로 |
| Annealed (O temper) | 1.02 | mill anneal |
| Normalized | 1.05 | 공냉 결정립 균질 |
| Cold-worked 1/4H ~ H | 1.08 | 1 pass cold rolling |
| EH / Spring temper | 1.15 | 추가 hard pass |
| Q+T (martensitic) | 1.18 | 표준 quench + temper |
| Solution + Aged / T6 / H900 | 1.25 | PH/aging |
| Multi-step STA / Double age | 1.40 | 다단 사이클 |
| Carburizing / Nitriding | 1.30 | case hardening |
| Coating (TBC / DLC / PVD) | 1.50 | 표면 처리 |
| HIP | 1.60 | vacuum + high-T |

**2) `priceFormFactor(m)`** — process 형태 기반 가격 배수
| Process | factor |
|---|---|
| Cast (sand/die) | 1.00 base |
| Wrought / extrud | 1.05 |
| Hot rolled | 1.08 |
| Sheet / Stamping | 1.10 |
| Forged | 1.15 |
| Investment cast | 1.20 |
| Cold-drawn / Cold-rolled | 1.20 |
| Sintered (PM) | 1.50 |
| DED / Wire arc | 2.00 |
| Binder Jet | 2.20 |
| LPBF / SLM / DMLS | 2.50 |
| EBM (Ti powder premium) | 3.00 |

**3) `priceGradePremium(m)`** — 같은 family 내 grade 차이
- AISI/SAE steel: C 함량 기반 (4140 → 1.04, 4340 → 1.04, 1018 → 0.96)
- AA aerospace: 7075/7050 → 1.10, 2024 → 1.05, Al-Li 2090/2195 → 1.30, Scalmalloy → 2.0
- Ni superalloy: Single crystal CMSX-X / Rene N5 → 4.0, DS cast IN 738/939 → 2.0
- regex bug fix: "1065°C" 같은 temperature 숫자가 AISI 매칭되던 문제 → `aisi|sae|astm` prefix 강제

### delivered_price 신규 필드
```
delivered_price_per_kg = price_per_kg × condition × form × grade_premium
total_cost_estimate = delivered_price × machining_cost_factor (이전 = raw × mach × ht)
```

### 효과 측정 — 같은 grade 다른 condition
**AISI 4140** (이전 모두 $2.80):
- Annealed: **$3.12** delivered
- Normalized: **$3.21** (+3%)
- Q+T: **$3.76** (+20%)

**Inconel 718** (이전 모두 $50):
- Annealed (wrought): **$53.55**
- Solution treated: **$65.63** (+22%)
- STA / DSA (정식 718 cycle): **$76.13** (+42%)
- AM As-built (LPBF + as-supplied): **$125** (+133% — powder ×2.5 + AM premium)
- AM Heat-Treated (LPBF + HIP): **$200+** (powder + HIP +60%)

### UI 변경 (lib/materials.ts)
- `Raw price (per kg)` — base material spot price (LME / vendor list, family typical)
- `Delivered price (HT+form)` 신규 — raw × condition × form × grade
- `Condition × (HT/temper)` 신규 multiplier 표시
- `Form × (process)` 신규
- `Grade × (premium)` 신규
- `Total cost (machined)` = delivered × machining (가공 후 단가)

검증: tsc OK · vitest 47/47 · build:data OK · production build OK · verified 763.

## R113 — 공정 카드 collapsible + Compare 공정 dot + Polymer 카드 + 출처 + Best-pick 가중치 UI
사용자 5 작업 모두 적용 (6번 = 색상은 현재 OK 유지).

### 1) 공정 3 카드 collapsible (모바일 가독성)
- 카드 모두 `<details>` element 로 변경 + grid layout (`grid-cols-1 md:grid-cols-2`)
- **Machinability**: default open · summary 에 rating + factor + band 한 줄 요약
- **Heat Treatment**: default closed · summary 에 factor + label 요약
- **Weldability**: default closed (`high` band 만 자동 open) · summary 에 worst band + 종합 평가
- summary 클릭 시 펼침/접힘, 모바일에서 세로 길이 ↓

### 2) Compare panel 공정 평가 mini row
- Table view 의 비교 행 위에 신규 row: alloy 이름 + 3 dot (절삭 / HT / 용접)
- 색상: 🟢 emerald (easy/low) · 보통 회색 · 🟡 amber (hard/med) · 🔴 rose (very_hard/high) · ⚪ N/A
- `title` 속성으로 hover tooltip (band 명)
- Compare ≥2 + table view 일 때만 표시

### 3) Polymer-한정 카드 (Process 탭, violet border)
- **Flame UL94** (V-0/V-1/V-2/HB) — 색상 band
- **UV resistance** (Excellent/Good/Fair/Poor) — 색상 band
- **Moisture absorption 24h DAM** (% — 낮을수록 좋음)
- **Tg** (Glass Transition, °C)
- **HDT @ 1.82 MPa** (°C)
- 19 polymers-data 종은 vendor handbook · 94 CSV 종은 family typical
- 출처: UL94 / ISO 4892 (UV) / ISO 62 (Moisture) / ISO 11357 (Tg DSC) / ISO 75-A (HDT)

### 4) 공정 카드 데이터 출처 강화
- Machinability: "ASM Handbook Vol.16 Machining · AISI 1018 = rating 100% · vendor 견적과 ±20-30% 차이"
- HT: "ASM Handbook Vol.4 Heat Treating · KS D 0040 (열처리 일반) · KS D 3866 · 분위기/단계/시간 휴리스틱"
- Weldability: "IIW Doc IX-535-67 (CE_IIW) · IX-1086-87 (CET, Thyssen) · JIS (Pcm, Ito-Bessyo 1969) · AWS A3.0 / Schaeffler 1949 · ASM Vol.6"

### 5) Best-pick 가중치 슬라이더 UI (기본 비활성 + 체크박스 활성화)
사용자 정책 정확 반영:
- **기본: 비활성화** (OFF state) — 슬라이더·체크박스 모두 disabled 회색
- **기본 collapse**: weightOpen=false (Compare 헤더에서 펼침 버튼)
- **활성화 버튼**: `weightActive` toggle (OFF/ON 명확 표시)
- **체크박스로 항목 활성화**: 4개 (강도/강성/경량/저가) 각각 enable/disable
- 비활성 항목은 wSum 계산에서 0 처리 (effWeights)
- ON 상태일 때만 best-pick 표시 + score 계산

### 6) Polymer family typical meta (CSV 94종)
build-materials.mjs 에 polymer family flame_ul94 / uv_resistance / moisture_24h 자동 매핑:
- PEEK/PEKK/PEI/PPSU/PES → V-0 · Fair · 0.3%
- PA12/PA66 → HB · Good/Fair · 1.0/2.8%
- PC → V-2 · Fair · 0.15%
- ABS → HB · Poor · 0.3%
- PP/PE → HB · Poor · 0.02/0.01%
- 등 15+ family pattern

### 검증
- tsc OK · vitest 47/47 · build:data OK · production build OK (verified 763)

## R112 — 공정 평가 3 종합 카드 + Process 탭 이동 + Category 필터링 + Polymer URL 보강
사용자 요청 4건 통합:
1. 절삭성 + 가공비 → 1 카드 통합
2. HT 평가 다양화 → 1 카드 (factor + 분위기 + 단계 수 + 시간 + 한국 표준)
3. 용접성 4 지표 → 1 경고 카드 (worst-band 종합)
4. 3 카드 모두 Properties 탭 → **Process 탭**으로 이동

### 카드 1 — Machinability 종합 (Process 탭)
- 절삭성 rating + 가공비 가중치 동시 표시
- band 색상 (easy/normal/hard/very_hard) 통합
- 표시: "{rating}% · 보통" + "×1.5 · +50% · 어려움"

### 카드 2 — Heat Treatment 종합 (평가 다양화)
- HT 가중치 (×factor · +%)
- **분위기** 추정: Air / Inert gas / Vacuum
- **단계 수**: 1 step (anneal) / 2 step (Q+T) / 3-5 step (STA + HIP)
- **총 furnace 시간**: 0h / 1-3h / 4-8h / 8-24h
- 한국 KS 참고: KS D 0040 (열처리 일반) · KS D 3866 (구조용 강)

### 카드 3 — Weldability 종합 경고 ⚠
- CE_IIW + CET + Pcm + Schaeffler 4 지표 한 카드에 표시
- 종합 권고 절차 (worst band 기준):
  - low: ✓ 일반 절차 가능, 표준 용접봉
  - med: ⚠ Pre-heat 100-200°C, low-H 권장
  - high: ⚠ Pre-heat 200°C+, low-H 필수, PWHT 필수
- Schaeffler note 통합 표시

### Category-aware property 필터링 (Properties 탭)
- **Polymer 한정**: Tg, HDT@1.82MPa 표시
- **Polymer 에서 hide**: melting_point (Tg 가 더 의미), electrical_conductivity (비전도성), fracture_toughness (다른 단위)
- Metal/Ceramic/Composite 은 종전대로

### Polymer vendor URL 보강 (+CSV 94종)
build-materials.mjs 에 `polymerVendorURL(subcategory, name)` 신규 함수. CSV polymer 의 family 별 자동 매핑 (verified):
- PEEK → Victrex · PEI/ULTEM → SABIC · PEKK → Solvay KEPSTAN
- PSU → Udel · PPSU → Radel · PES → Veradel · PPS → Celanese Fortron
- PA12 → EOS/Arkema Rilsan · PA66 → BASF Ultramid · PA → EOS powder
- PC → SABIC LEXAN · ABS → SABIC CYCOLAC · PMMA → Plexiglas
- PETG → Eastman · PLA → NatureWorks · TPU → Lubrizol Estane
- POM → Hostaform/Delrin · Vespel → DuPont · Epoxy → Hexion
- HDPE/LDPE → Dow · PP → ExxonMobil

**결과**: Polymer verified URL 19/113 (17%) → **70/113 (62%)** · 전체 verified 748 → **763**.

### 검증
- tsc OK · vitest 47/47 · build:data OK · production build OK

### 다음 단계 후보 (사용자 결정 시)
1. **Polymer 한정 "Polymer Properties" 별도 카드** (flame UL94 / UV resistance / moisture 24h) — meta 에 이미 19종 데이터 보유, CSV 94종은 family typical 매핑
2. **Best-pick 가중치 사용자 선택 UI** (Compare 패널 슬라이더 5개: 강도 / 비용 / 내식 / 가공성 / HT)
3. **CSV polymer composition 대략 추정** (PEEK=C/H/O, PA=C/H/N/O 의 ratio family typical)

## R111 — Machining/HT factor 의미 라벨화 + 제조성 통합 + Surface Ra process-aware

### 사용자 지적 1: Machining factor / HT factor 의미 불명확
이전: detail panel 의 cost 영역에 `1.50×` 같은 숫자만. 의미 전달 X.

**해결**: `lib/welding-machinability.ts` 에 의미 카드 함수 신규:
- `machiningCostBand(factor)` → `{ band, label, detail, note }`:
  - < 0.85: "쉬움" (저렴 -15% 이상) — 저탄소강, free-machining, 연한 Al
  - 0.85~1.25: "보통" (기준) — 표준 carbide 공구
  - 1.25~1.80: "어려움" (+25-80%) — coated carbide, 낮은 속도
  - > 1.80: "매우 어려움" (+80%↑) — CBN/ceramic, cryo cooling, 3-8× 가공시간
- `htCostBand(factor)` → 4 band:
  - < 1.05: "불요" — as-supplied 그대로
  - 1.05~1.20: "단순 HT" — Stress relief / single furnace cycle
  - 1.20~1.50: "본격 HT" — Q+T or T6 aging + quench + dimensional control
  - > 1.50: "복잡 HT" — STA + double aging / HIP / coating, vacuum furnace

**Detail panel "제조성" 섹션에 2 카드 추가** (절삭성 옆에):
- 가공비 가중치 (Machining cost ×{factor}) — 의미 라벨 + 비용 영향 + 한 줄 설명
- 열처리·후공정 가중치 (HT cost ×{factor}) — 동일 형식
- 표시 예: "어려움 +50% (가공비 ↑↑)" / "본격 HT +20%"
- COST_PROPERTIES 의 숫자 항목은 참고용으로 유지하되 description 에 "자세한 의미는 제조성 카드 참조" 추가

### 사용자 지적 2: Surface Ra / Min wall 이 Wrought 재료에서 의미 없음
이전: 모든 process 에서 surface Ra 1.6 / min wall 0.5 등으로 표시. Wrought 는 후가공으로 결정되므로 의미 없음 (잘못된 값).

**해결**: `processAttributes(m)` 에서 process-aware 처리:
- **유지** (net-shape / as-supplied 의미 있음): AM (LPBF/SLM/EBM/Binder/DED) · Cast (investment/die/sand) · Injection · Sintered (powder metal) · Machined (CNC, 정밀가공 그대로)
- **null 반환** (후가공 의존): Wrought · Rolled · Extruded · Forged · Sheet metal / Stamping
- `tolerance_class` 는 모두 유지 (이론적 process tolerance 능력은 의미 있음)

**효과** (1,249 entries):
| Process | 이전 (R110) | R111 |
|---|---|---|
| AM (131종) | Surface 131, Min wall 131 | 131, 131 (그대로) |
| Cast (51종) | 51, 51 | 51, 51 (그대로) |
| Injection (65종) | 65, 65 | 65, 65 (그대로) |
| Machined (42종) | 42, 42 | 42, 42 (그대로) |
| **Wrought (895종)** | **895, 895** (잘못된 값) | **0, 0** (정확) |

### 검증
- tsc OK · vitest 47/47 · build:data OK · production build OK

### 추가 개선 제안 (다음 라운드 결정용)
1. **Polymer 한정 물성 (Tg/HDT)** 도 process-aware 처리 — Metal/Ceramic/Composite 에서는 N/A 명시 (현재는 ranges 가 없으면 자동으로 안 보임)
2. **min_wall_thickness/surface_finish_typical** description 에 N/A 사유 인라인 표시 (예: "Wrought — 후가공으로 결정, N/A")
3. **Family-aware fatigue 더 채우기** — 한국 KS 강종 27종, 풍산 Cu 9종 등 신규 entry 에 fatigue/impact 추가 (현재 derived/missing)
4. **CSV polymer ~94종 의 vendor URL** 보강 (현재 verified 비율 낮음)
5. **Compare panel** 에 가공비/HT 가중치 column 추가 (best-pick 평가용)

## R110 — Guide 내부 링크 점검 + Polymer Tg 노출 + Tools 보충 + 용접성 4 지표 통합

### Guide 내부 anchor 링크 점검
- 정의된 chapter ID **14개** (ch1-ch15, ch13 없음)
- 사용된 #ch* anchor: **4개** (ch1, ch6, ch7, ch9)
- **Broken anchor: 0** — 모두 valid
- 보강 가능 (link 안된 chapter 10개): ch10/ch2/ch3/ch4/ch5/ch11/ch12/ch14/ch8/ch15. Tools 페이지에서 ch4/ch5/ch10 cross-link 추가됨.

### Polymer Tg (Glass Transition Temperature) 정식 노출
이전: `meta.tg` 에만 보존 → UI 표시 안됨. R110: `ranges.glass_transition_temp` 로 정식 물성화.

**구현**:
- `loadPolymersAsMaterials()`: polymers-data.json 의 tg/tm/hdt_182 → ranges (handbook confidence)
- `assignPhysicals()` Polymer 분기에 family typical Tg 추가:
  - PPSU 220 · PES 225 · PEEK 143 · PEI/ULTEM 217 · PEKK 162
  - PSU 187 · PC 147 · PMMA 105 · ABS 105
  - PA/Nylon 55 · PETG 80 · PLA 60 · PPS 88
  - POM -73 · TPU -30 · PP -10 · PE -120
  - Epoxy 120 · Polyester 110 · Polyimide/Vespel 360
- 출처: ASM Handbook Vol.21 + IDES Prospector + ISO 11357 (DSC)

**결과**:
- Polymer 113/113 모두 Tg 값 표시 (handbook 21 + class 92)
- `lib/materials.ts` PHYSICAL_PROPERTIES 에 `glass_transition_temp` + `hdt_182` 추가
- `Material` interface 에 두 필드 추가

### 용접성 평가 4 지표 통합 (lib/welding-machinability.ts)
기존 CET 만 → CE_IIW + CET + Pcm + Schaeffler 모두 동시 표시.

**1) CE_IIW** (IIW Doc IX-535-67) — 가장 일반적
- CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15
- < 0.40 / 0.40-0.50 / > 0.50 의 3 band

**2) CET** (IIW Doc IX-1086-87) — modern HSLA 강 (이미 있음)

**3) Pcm (Ito-Bessyo, JIS)** — 저합금 강 권장
- Pcm = C + Si/30 + (Mn+Cu+Cr)/20 + Ni/60 + Mo/15 + V/10 + 5B
- < 0.20 / 0.20-0.30 / > 0.30 의 3 band

**4) Schaeffler diagram** — 스테인리스 용접 weld metal phase 예측
- Cr_eq = Cr + Mo + 1.5Si + 0.5Nb
- Ni_eq = Ni + 30C + 0.5Mn
- Output: Austenite / Ferrite / Martensite / A+F / A+M / F+M, ferrite_pct (FN) 추정

**MaterialDetail.tsx**: 4 지표 모두 detail panel "제조성" 섹션에 표시 (해당 합금에 적용 가능한 것만).

### Engineering Tools 페이지 보충
- Hero 영역: "6 개" → "9 개" 정정, 모든 계산기 설명 추가
- 신규 안내 박스: 각 계산기 9개의 적용 영역 + Guide 챕터 link (ch4/ch5/ch10 cross-link)
- 사용 시 주의 + 출처 섹션 추가 (Peterson, Roark, Timoshenko, ASTM E140, ASME VIII Div.1, AWS A3.0, Schaeffler 1949)

검증: tsc OK · vitest 47/47 · build:data OK · production build OK · verify:guide 0 dead / 0 error / 78 OK.

## R109 — ALLOY_SPECIFIC 확장 (110→195) + ALLOY_FAT_IMPACT 신규 + impact family typical
사용자 지시 3건 동시 진행:
1. ALLOY_SPECIFIC 확장 (110 → 195) — 잔여 class fallback ↓
2. fatigue_strength 968 derived → handbook 으로 대체
3. impact_strength 1083 missing → handbook + family typical 채움

### 작업 내용

**(1) ALLOY_SPECIFIC +85 신규 합금**
- Carbon steel +12: AISI 1010/1015/1025/1030/1035/1040/1060/1095/4135/4145/4150
- Alloy steel +9: 4615/4620/5130/6150/8615/8625/8630/9260/9310
- Tool steel +7: H13/D2/M2/M4/P20/A2/O1
- Stainless +7: 904L/254SMO/A286/405/409/13-8Mo/Custom 455
- Aluminum +16: 1050/1060/1100/4047/5454/5456/5754/6005/6101/6111/6262/7068/7150/7449/2050/2099
- Titanium +7: Ti Gr.3/4/9/12, Ti-6Al-7Nb, Ti-3-2.5V, Ti-8-1-1
- Nickel superalloy +11: Inconel 706, Nimonic 80A/90/105, René 80/95, Mar-M-247, IN-100, IN-738, Hastelloy G-30/S
- Cobalt +4: Stellite 1/12, MP35N, MP159
- Copper +11: C14500/C19400/C27000/C28000/C44300/C51000/C52400/C63200/C67500/C72500/C92200
- Mg +4: AM50A/AM60B/WE43/ZK60
- Refractory +3: Rhenium, W-Re 10%, W-Cu

**(2) ALLOY_FAT_IMPACT 신규 테이블 (~120 alloy)**
fatigue (MPa, R=-1, 10⁷ cycles) + Charpy V-notch impact (J) handbook 값. 1차 자료 (ASM Vol.1/2, MMPDS, Special Metals/Haynes datasheets) 기반.
- Steel: 4130/4140/4340/8740/8620/300M/D6AC/1018-1095/4135-4150/5140/5160/6150/8630/9260/9310
- Tool steel: H13/D2/M2/P20/A2
- Stainless: 304(L)/316(L)/321/347/410/420/430/440C/17-4PH/15-5PH/17-7PH/2205/2507/904L/254SMO/A286
- Aluminum: 6061/6063/6082/7075/7050/7175/2024/2014/2219/2090/2195/5052/5083/5086/3003/1100/1050/A356/A357/AlSi10Mg/Scalmalloy
- Titanium: Ti-6Al-4V/Gr.1/2/5/6242/5553/15-3
- Nickel: Inconel 600/601/617/625/706/718/X-750, René 41/80/95/N5, CMSX-4, Waspaloy, Haynes 230/188/25, Hastelloy C276/X/B-2, Monel 400/500, Incoloy 800/825, Nimonic 80A/90, Invar 36, Kovar, Nitinol
- Cobalt: CoCrMo, Stellite 6/21, L605, MP35N
- Copper: C11000/C10100/C10200/C12200/C17200/C17500/C18150/C18200/C26000/C26800/C36000/C46400/C51000/C63000/C70600/C71500/C92200/C95400/GRCop-42/84
- Magnesium: AZ31B/AZ61A/AZ91/ZE41/AM60B/WE43
- Refractory: W/Mo/TZM/Ta/Nb/C-103
- Maraging: 250/300/350

로직: realPropsFor 우선 (핵심 11종 정밀), 그 다음 alloyFatigueImpact (~120 handbook), 그 다음 derived (UTS×ratio).

**(3) impact_strength family typical fallback** (assignPhysicals 영역 확장)
alloy-specific 매치 없으면 subcategory + family 기반:
- Stainless austenitic / Ferritic / Martensitic / Tool / PH / Duplex / Maraging
- Iron-based 일반 강, Al, Ti, Ni superalloy, Cobalt, Cu, Mg, Refractory

### 결과 — 모든 핵심 물성 fallback 비율 큰 폭 감소
| 물성 | R107 (전) | R108 | **R109** | handbook % (R109) |
|---|---|---|---|---|
| **impact_strength missing** | 1083 | 1083 | **215** | (87% 채움) |
| **fatigue handbook** | 150 | 150 | **512** | (+241%) |
| fatigue derived | 968 | 968 | **609** | (-37%) |
| thermal_expansion handbook | 72 | 513 | **692** | (57%) |
| max_service_temp handbook | 72 | 513 | **692** | (57%) |
| price_per_kg handbook | 72 | 513 | **692** | (57%) |
| poisson_ratio handbook | 10 | 434 | **616** | (54%) |
| specific_heat handbook | 10 | 434 | **616** | (54%) |
| melting_point handbook | 13 | 437 | **619** | (61%) |
| electrical_conductivity handbook | 3 | 428 | **610** | (54%) |
| fracture_toughness handbook | 39 | 460 | **642** | (65%) |

총 누적 효과 (R107 → R109): handbook 값 ~70개 → ~6,200개 (약 90배 ↑). 사용자 detail panel 에서 "핸드북" 라벨이 표시되는 비율이 약 절반 이상.

검증: tsc OK · vitest 47/47 · build:data OK (verified 748) · production build OK (1292.72 KB / gzip 356.51 KB).

## R108 — Fallback 비율 감축 (class → handbook 변환)
사용자 정책: "기존 데이터에서 비어있는 물성 또는 fallback 된 물성 채울 수 있는 방안 수립" → fallback 비율 자체를 낮춰야 함. handbook 값으로 직접 대체.

### 신규 함수 — `alloySpecificPhysicals(name)`
`build-materials.mjs` 에 `ALLOY_SPECIFIC` 테이블 (~110 합금) 추가:
- **Carbon/Alloy steel** (~12): 4130/4140/4340/8740/8620, 300M, D6AC, 1018/1020/1045/1050, 5140/5160, S7
- **Stainless** (~14): 304/304L, 316/316L, 321/347, 410/420/430/440C, 17-4PH/15-5PH/17-7PH, 2205, 2507
- **Aluminum** (~20): 6061/6063/6082, 7075/7050/7175, 2024/2014/2219/2090/2195, 5052/5083/5086, 3003, A356/A357/A360/A380, AlSi10Mg, AlSi7Mg, Scalmalloy
- **Titanium** (~11): Ti-6Al-4V, Ti Gr.1/2/5/7, Ti-6242, Ti-5553, Ti-10-2-3, Ti-15-3, Ti-5-2.5, Ti-834
- **Ni superalloy** (~25): Inconel 600/601/617/625/718/718Plus/X-750, René 41/N5, CMSX-4/10, Waspaloy, Haynes 230/188/25, Hastelloy C-276/X/B-2, Monel 400/500, Incoloy 800/800H/825, Invar 36, Kovar, Nitinol
- **Cobalt** (4): CoCrMo, Stellite 6/21, L605
- **Copper** (~17): C11000/C10100/C10200/C12200, C17200/C17500, C18150/C18200, C26000/C26800/C36000/C46400, C63000, C70600/C71500, C95400, GRCop-42/84
- **Magnesium** (4): AZ31B, AZ61A, AZ91, ZE41
- **Refractory** (6): W, TZM, Mo, Ta, Nb, C-103
- **Maraging** (3): 250/300/350

각 entry 의 7 물성: ec(%IACS), tmax(°C), price($/kg), cte(10⁻⁶/K), poisson, cp(J/kg·K), melt(°C), kic(MPa·√m).

### 로직 변경
- 1단계: `alloySpecificPhysicals(name)` 매치 → `confidence='handbook'` (1차 자료 값)
- 2단계: 매치 없으면 기존 `assignPhysicals(m)` → `confidence='class'` (family typical)
- 기존 entry 의 ranges 가 이미 있으면 alloy-specific 가 우선 (class 덮어쓰기)

### 결과 — 7 물성 모두 class → handbook ~40% 전환
| 물성 | 변경 전 | 변경 후 | handbook 비율 |
|---|---|---|---|
| thermal_expansion | 1119 class | 691 class + **513 handbook** | 0% → **43%** |
| max_service_temp | 1119 class | 691 class + **513 handbook** | 0% → **43%** |
| poisson_ratio | 1119 class | 713 class + **434 handbook** | 0% → **38%** |
| specific_heat | 1119 class | 713 class + **434 handbook** | 0% → **38%** |
| melting_point | 1006 class | 600 class + **437 handbook** | 0% → **42%** |
| price_per_kg | 1119 class | 691 class + **513 handbook** | 0% → **43%** |
| electrical_conductivity | 1119 class | 713 class + **428 handbook** | 0% → **38%** |
| **fracture_toughness** | 956 class | 556 class + **460 handbook** | 0% → **46%** |

핵심 well-known 합금 (Inconel 718, Ti-6Al-4V, 6061, 4140 등) 은 이제 1차 자료 값 표시. 사용자가 detail 패널에서 confidence 라벨 (sky "핸드북" vs amber "class") 로 즉시 구분 가능.

검증: tsc OK · vitest 47/47 · build:data OK · production build OK (1292.72 KB / gzip 356.51 KB).

## R107 — Guide ch15 재료 family 기본론 + 링크 안정성 보장

### Guide ch15 새 chapter 추가
data/general-knowledge/ 의 9 markdown 핵심을 React 컴포넌트로 압축, Guide ch15 로 통합. TOC 13 → 14 항목으로 확장.

**14개 sub-section**:
- **14.1 Steel + Stainless** (ASM Vol.1·2): AISI/SAE 4-digit, 4단계 열처리, Stainless 5 family, 부식 메커니즘 5, 경도 변환 (HRC↔HV↔HB), 한국·일본·EU 매핑
- **14.2 Aluminum** (ASM Vol.2 + MMPDS Ch.3): Wrought 4-digit + Temper code (F/O/H/T/W), 시효 석출상 (θ'/β'/η'/T1), SCC 회피, Cl⁻ 환경 추천
- **14.3 Titanium** (ASM Boyer): β-transus, 5 family (α/near-α/α+β/near-β/β), 열처리 modes (MA/BA/STA/Duplex), CP Gr.1-12 + ASTM F-series + AMS
- **14.4 Nickel superalloy** (ASM Donachie): γ/γ'/γ" 3 결정구조, APB + coherency 강화, TCP phase 회피, 5 family + 표면 강화 (aluminide/MCrAlY/TBC) + AM powder
- **14.5 Copper alloys** (풍산 카탈로그 + ASM): UNS C-series 분류, temper code, 부식 환경, 피로 ≈ σ_UTS/3, fabrication property rating, 한·일·미·EN 매핑
- **14.6 한국 KS 강종** (Hyundai Steel + POSCO 2025): SS/SM (구조), SHN (내진 H형강), SD (철근), SAPH/SPFH/SPFC (자동차), SGCC/SGC (도금), STK/STKM (강관), SPA-H (내후성), POSCO 특수강 (PosMAC · TWIP · 9% Ni · CGO)
- **14.7 MMPDS 통계적 기준** (MMPDS-08 Ch.1.4 + 9): A-Basis (T99) · B-Basis (T90) · S-Basis · Typical 정확한 정의 + Lower Tolerance Bound 공식 + 사용 시기
- **14.8 Pure metals physical table** (ASM Appendix): 주요 commodity element + 귀금속 + 희토류 melting/boiling/density/E/crystal 표, allotropic transformation 정리
- **14.9 MMPDS-08 Steel allowables** (MMPDS-08 Ch.2): AISI 4130/4340/8740/300M/D6AC Ftu/Fty/Fcy/Fsu/Fbru/E 표
- 외부 학습 자료 9개 (ASM Library, MatWeb, DoITPoMS, Special Metals, Aluminum Association, Poongsan, Hyundai Steel, POSCO, FAA AR-03/57)

### 링크 안정성 보장 — Dead 5 → 0, Error 2 → 0
- efatigue.com (R70 이후 timeout 발생 → 3건 모두 대체):
  - `efatigue.com` → Wikipedia: Fatigue (material) + Engineering Toolbox + Wikipedia: Stress concentration
- 신규 ch15 링크 5개 dead 발견 → 안정 도메인 root 로 변경:
  - `poongsan.co.kr/eng/business/copper/` (404) → `poongsan.co.kr/`
  - `hyundai-steel.com/en/products/HRC/HRC.do` (404) → `hyundai-steel.com/`
  - `product.posco.com/.../s91l5000001.jsp` (error) → `posco.com/`
  - GitHub repo 가상 URL → `<code>data/general-knowledge/</code>` 텍스트로 변경
  - amesweb.info → Wikipedia: Stress concentration / Wikipedia: Fatigue

검증: tsc OK · vitest 47/47 · production build OK (1292.72 KB / gzip 356.51 KB) · **verify:guide OK 78 / Forbidden 3 (봇 차단, 브라우저 OK) / Dead 0 / Error 0**.

## R106 — 신규 49 entry name 영문 표준 규격화 + alias 정리
사용자 정책: "재료 엔트리에 한국어가 있으면 안됨. 최대한 표준 규격에 가깝게 이름 표시, 상표명 등은 alias 에 표시." → 신규 49 entry name 일괄 fix.

### name 변경 패턴 (영문 표준 우선)
- **풍산 Cu 9종**: "C1020 Oxygen-Free Copper ... — 풍산 strip grade" → "C10200 (Oxygen-Free Copper, KS C1020)" 등. UNS 코드 우선 + 영문 분류 명칭.
- **현대제철 KS 27종**: "SHN275 (KS D 3866 내진 H형강) — 현대제철" → "SHN275 (KS D 3866, seismic H-section)". KS 표준 번호 + 영문 분류.
- **한국 spring/tool 3종**: "SUP9 Cr-Mn Spring Steel (KS D 3701) — 한국 산업표준" → "SUP9 (KS D 3701 / JIS G 4801, Cr-Mn spring steel)". 모표준 (JIS G 4801) 도 명기.
- **POSCO 10종**: 상표명 → 표준 규격으로 대체:
  - "POSCO PosMAC 3.0 (Zn-Mg-Al, 고내식 도금강)" → "Hot-dip Zn-Mg-Al coated steel (3% Mg, 4% Al ternary coating)"
  - "POSCO X80 Line Pipe (API 5L X80)" → "API 5L X80 line pipe (TMCP, sour service capable)"
  - "POSCO GIGA STEEL TWIP1180" → "TWIP1180 steel (Twinning-Induced Plasticity, high-Mn austenitic AHSS)"
  - "POSCO GIGA STEEL DP980" → "DP980 dual-phase steel (VDA 239-100 CR980Y700T-DP)"
  - "POSCO 9% Ni Steel (LNG 저장 tank용)" → "ASTM A553 Type I (9% Ni cryogenic steel)"
  - "POSCO Electrical Steel CGO 0.27" → "CGO 0.27 mm grain-oriented electrical steel (3.2% Si, Goss texture)"
  - "POSCO Stainless 304L" → "STS304L (KS D 3705 / JIS G 4304, low-carbon austenitic stainless)"
  - "KIST 한국형 STS304 ULC" → "STS304 ULC (Ultra-Low-Carbon austenitic stainless, C ≤ 0.015)"

### alias 보강
상표명·제조사 + 동등 표준 모두 alias 로:
- PosMAC ↔ "PosMAC 3.0" / "POSCO PosMAC" / "POSMAC" / "Zn-Mg-Al coated steel" / "NIPPON SUPER DYMA equivalent" / "Magnelis equivalent"
- TWIP1180 ↔ "X-IP1000 (ThyssenKrupp equivalent)" / "VDA 239-100 HC1180T-AM"
- DP980 ↔ "ArcelorMittal DP980" / "ThyssenKrupp DP-K39/70+Z" / "Usibor 1500 close equivalent"
- 9% Ni ↔ "EN 1.5662 X8Ni9" / "JIS G 3127 SL9N520"
- CGO ↔ "JIS C 2553 27P100" / "IEC 60404-8-7 M097-27P"
- STS304L ↔ "AISI 304L" / "ASTM A240 304L" / "EN 1.4307" / "X2CrNi19-11 (EN)"
- 풍산 Cu 모든 entry → "Poongsan strip" alias 추가
- 현대제철 KS → "Hyundai Steel ___" alias

### 정합성 보장
- `name` 필드: 한국어 0건 (Grep 검증 통과)
- `aliases` 필드: 상표명 + 다국가 표준 매핑 보강 → 검색 hit 율 ↑
- `industry_note` 필드: 그대로 (description 영역, 한국 사용자 정보 가치 보존)

검증: tsc OK · JSON valid · build:data OK (verified 748) · production build OK.

## R105 — POSCO 10종 (PosMAC + API + GIGA STEEL + 9% Ni + Electrical + Stainless)

### POSCO 시리즈 (한국 철강 자체 개발 / 대표 등급)
- **PosMAC 3.0** — Zn-Mg-Al 3원계 도금 (Zn 93% · Mg 3% · Al 4%) — 부식 저항 SGCC 대비 5-10배 ↑. POSCO 특허. 건축 외장 / 태양광 frame / 자동차 underbody.
- **API 5L X80** (sour service) + **API 5L X70** — TMCP 송유관 표준. 한국 KOGAS / 일본 Tokyo Gas / Saudi Aramco 수출.
- **GIGA STEEL TWIP1180** — UTS 1180 + El 45% 동시 만족 (자동차 무게-안전 trade-off 돌파). 18-22% Mn austenitic + twin slip. 현대 IONIQ / 기아 EV6 B-pillar.
- **GIGA STEEL DP980** — Dual-Phase 980. ArcelorMittal Usibor 1500 등가. 현대·기아·Toyota·GM 표준 AHSS.
- **9% Ni Steel** — LNG -162°C / LH₂ -253°C 저장 tank. ASTM A553 Type I / EN 1.5662 등가. 한국 KOGAS LNG terminal + Daewoo Shipbuilding LNG carrier.
- **CGO 0.27** Grain Oriented Silicon Steel — 변압기 core. 효성 / LS전선 / Mitsubishi HVDC.
- **POSCO SUS304L / 316L** (KS D 3705) — 한국 스테인리스 표준. 부산 광양 stainless mill.
- **KIST ULC 304** — C ≤ 0.015 ultra-low-carbon. 반도체 wafer carrier / 의료 implant long-term.

### 누적
- supplementary: 377 → **387** (+10)
- DB total: 1,234 → **1,244**
- verified-source materials: 738 → **748**

검증: tsc OK · vitest 47/47 · build:data OK · production build OK.

## R104 — Tier 3 KS 강종 6 + 풍산 Cu 2 + 한국 산업 spring/tool 3

### 추가 강종 (supplementary +11)
- **SM 시리즈 +4** (KS D 3515 용접구조): SM275A · SM355B · SM420C · SM570 — 한국 다리·풍력 tower·LNG carrier 전 등급 (EN S275JR/S355J0/S420N/S460ML 등가).
- **SD700** (KS D 3504 최고강도 철근): YS 790 / UTS 850. 100층+ 초고층 · 원전 격납고 · 대형 LNG tank. ASTM 에 없음 (KS only).
- **풍산 Cu +2**:
  - **C5191** (인청동 Phosphor Bronze 6Sn): connector pin · spring contact · EV 모터 commutator. KS D 5506.
  - **C7521** (양백 Nickel Silver 65/18): 정밀 spring · 음향 instrument · 식기 도금 base. KS D 5102.
- **한국 산업 spring/tool +3**:
  - **SUP9** (KS D 3701 Cr-Mn spring): 자동차 leaf spring · 농기계 spring. SAE 5160 근사.
  - **SUP10** (Cr-V): 디젤 valve spring · 정밀 coil spring. SAE 6150 / 50CrV4 등가.
  - **SK85** (KS D 3751 탄소공구강): 칼날 · shear blade · spring 일부. EN C80W1 등가.

### 누적
- supplementary: 366 → **377** (+11)
- DB total: 1,223 → **1,234**
- verified-source materials: 722 → **738**

검증: tsc OK · vitest 47/47 · build:data OK · production build OK.

## R103 — Guide↔Preset 정합성 + Tier 2 KS 강종 10종

### Guide 정합성 검증
- Guide ch7 SCENARIO_TILES (16개: bracket·heatsink·fatigue·corrosion·wear·electrical + hightemp·precision·lowcost·spring·medical·cryogenic·**pressure_vessel**·gear·fastener·**die_mold**) ↔ SCENARIO_PRESETS 16개 모두 일치 확인 → **정합성 OK**.
- Guide ch10 family 매핑 + Guide ch6 차트 인터랙션 — Ashby chart UI 와 일치.
- indexHint regex (sqrtE/rho, Sy/rho 등) → MATERIAL_INDICES 키 모두 매핑 정상.

### Tier 2 KS 강종 +10
- **SHP×3** (KS F 4603 토목 강널): SHP275W / SHP355W / SHP450W — 토목 흙막이 · 항만 안벽 · 해상풍력 monopile. W (Weldable, CE 제한).
- **도금 ×2** (KS D 3506): SGCC (commercial, Z140-Z275) + SGC400 (HSLA, 자동차 outer body). EN DX51D+Z / HX300LAD+Z 등가.
- **강관 ×2**: STK490 (KS D 3566 일반구조, 건축 frame) + STKM13B (KS D 3517 기계, cold drawn 정밀).
- **SG325** (KS D 3533 가스용기): LPG · CNG 차량 연료탱크. KGS 인증.
- **SPA-H** (KS D 3542 내후성): Cor-Ten A 등가. Cu+Cr+Ni → 대기 부식 4-8배 ↓. 인천대교 · 세종 다리.
- **SD600** (KS D 3504 초고강도 철근): YS 685 / UTS 740. ASTM A615 G80 등가. 100층+ 초고층.

### 신뢰성 평가 — 제외
- SHN490 후보 → **제외**. 2024 KS D 3866 현재 표준에서 SHN460 까지만 명시, SHN490 은 2009 ed. legacy. 현대제철 2025 카탈로그 확인 모호 → 신뢰성 부족.

### 누적
- supplementary: 356 → **366** (+10 KS Tier 2)
- DB total: 1,213 → **1,223**
- verified-source materials: 712 → **722**

검증: tsc OK · vitest 47/47 · build:data OK · production build OK.

## R102 — 현대제철 KS 강종 17종 DB 입력
사용자 지시: "데이터 수집 관련하여 목표랑 좀 다른 방향으로 가버린거 같음. 자체적으로 할 수 있는 데까지 데이터 수집 지속". R100 markdown 정리한 spec 을 JSON 으로 입력.

### 입력 강종 (supplementary +17)
- **SHN 시리즈 4** (KS D 3866 내진 H형강): SHN275 / SHN355 / SHN420 / SHN460 — 항복비 ≤85% + Charpy 27J@0°C (SHN275/355) / 47J@-5°C (SHN420/460). 한국 고층·내진 건축 핵심 (Lotte World Tower / 인천대교 등).
- **SD 시리즈 6** (KS D 3504 철근): SD400 / SD500 / SD400W / SD500W / SD400S / SD500S — W = Weldable (CE ≤ 0.50%), S = Seismic (YR ≤ 1.25, El 10%). 한국 RC 콘크리트 보강 표준. ASTM A615 / A706 등가.
- **SM 시리즈 3** (KS D 3515 용접구조): SM490A (no Charpy) / SM490B (27J @ 0°C) / SM490C (27J @ -20°C) — 한국 다리·선박·LPG 탱크 표준. EN S355JR/J0/J2 등가.
- **SS 시리즈 2** (KS D 3503 일반구조): SS275 / SS315 — 신 KS (구 SS400 → SS275 매핑). EN S275JR / S315MC 등가.
- **자동차 2종** (JIS G 3113/3134): SAPH440 (자동차 frame · 현대·기아 OEM) / SPFH590 (chassis · cross-member). EN S355MC / S500MC 등가.

각 entry: composition (C/Si/Mn/P/S/CE) + points (1 row × 7 col [ρ, σy, UTS, El, E, HV, σf]) + conditions + ref_urls (현대제철 공식 product page) + aliases (영문·KS·JIS·EN 매핑) + industry_note (응용처 + 한국 산업 맥락).

### 신뢰성 평가
- σy/UTS ratio: SHN ≤85% (KS 표준 만족), SS/SM 50-65% (정상), SD 70-85% (정상)
- modulus: 200-210 GPa (KS 강 표준 범위)
- HV: UTS/3.45 derived (KS spec 직접 명시 없으면), Charpy 별도
- 출처: 현대제철 2025 카탈로그 (PART 1+2) + KS D 3503/3504/3515/3866 표준 + JIS G 3113/3134 + ASTM A615/A706 / EN 10025

### 누적
- supplementary: 339 → **356** (+17 KS 강종)
- DB total: 1,196 → **1,213**
- verified-source materials: 695 → **712**

검증: tsc OK · vitest 47/47 · build:data OK · production build OK.

## R101 — 사용자 보고 버그/UX 8건 + R98·R100 데이터 일부 확장

### 버그 fix
- **Alumina 가 Aluminum family 로 분류**: `material-colors.ts` 의 `/alumin/` regex 가 ceramic "Alumina" 까지 매치 → `alumin(?!a)` negative lookahead + Ceramic (sky #0EA5E9) · Composite (violet #A855F7) category 명시 추가. Polymer 와 동일하게 category 우선 분기.
- **Price/cm³ = ₩0**: KRW 변환 후 100원 단위 반올림으로 작은 값 (₩15/cm³) 이 0이 됨 → `formatPrice` perUnit='cm3' 분기 추가 (정수/소수점 1자리). USD 도 4자리 강제. + `build-materials.mjs` 모든 material 에서 `price_per_kg × density / 1000` fallback (ceramic/composite/polymer/CSV) — 이전 reference 만 채우던 것.
- **가이드 헤더 글자 잘림**: 모바일 라벨 축약 (`탐색기로 돌아가기` → `탐색`), 가이드 타이틀은 모바일에서 GraduationCap 아이콘만, `whitespace-nowrap` + `flex-shrink-0` + `min-w-0`.
- **모바일 Nav 화면 가림 (Detail popup)**: 모바일 `MaterialDetailPopup` 의 `fixed inset-0` → `fixed top-12 left-0 right-0 bottom-[50px] z-40` (Compare 와 동일 패턴) — 헤더 + 하단 nav 항상 노출.

### Ashby chart UX
- **상단 필터 단순화**: Class | Sub-family | Env on/off | Env mode | Pareto | Display 6개 → `Class | Pareto | Display ▾` 3개. Sub-filter + Envelope on/off + mode 는 Display popover 안의 새 section ("Family filter (chart-local)") + 기존 "Envelopes" section 으로 이동.
- **modeBar 정리**: `select2d` + `lasso2d` (plotly-dist-min 한계로 동작 불능) + `toggleSpikelines` (의미 불명) → 전부 제거. 남는 버튼: PNG / zoom+- / pan / reset.
- **모바일 한 손가락 pan**: `dragmode='pan'` 모바일 기본 적용. 두 손가락 pinch zoom 은 plotly 기본 동작.
- **모바일 클릭 = preview, 두 번째 = detail**: 첫 클릭 시 차트 위 floating preview card (이름 + family + ρ + E) 만 표시, "자세히 →" 버튼 또는 같은 점 재클릭 시 detail open. 모바일에서만. 데스크탑은 즉시 detail.

### 데이터 — 신뢰성 평가 완료분만 push (R98 풍산 7종 + R100 markdown 9종)
- **풍산 Cu 7 alloy** (supplementary +7): C1020 (OFC) / C1030 (Low-P) / C1220 (High-P) / C2100 RB1 / C2200 RB2 / C2300 RB3 / C2680 BA. 각 4 temper (O · 1/4H · 1/2H · H) σy/σ_UTS/El/HV. 신뢰성 평가: σy/UTS ratio (O 35-40%, H 95-100%) · modulus 117 GPa · density 8.94 (pure Cu) / 8.86 (RB95-5) — 풍산 카탈로그 + KS D 5101 + ASM Vol.2 일치 → OK 판정.
- **Aliases 보충 (Cu strip 7종)**: C1020↔OFC/OFHC, C1030↔DLP, C1220↔DHP, C2100↔Red Brass 95-5/Gilding Metal, C2200↔Commercial Bronze, C2680↔Cartridge Brass.
- **AISI 4140 + D6AC** ref_urls 에 MMPDS-08 FAA link + AISI 4140 industry_note (S-Basis 사용 시 주의사항).
- **data/general-knowledge/** 9 markdown: 01 Cu alloys / 02 MMPDS statistical basis / 03 Steel + Stainless / 04 Aluminum / 05 Titanium / 06 Ni superalloy / 07 Pure metals table / 08 MMPDS-08 steel allowables / **09 현대제철 KS grades** (Hot Rolled / Cold Rolled / Section / Re-Bar / Galvanized 약 50종 family + KS↔JIS↔ASTM 매핑 + DB 확장 Tier 1-3 우선순위).

### 보류 — 사용자 검토 필요
- **현대제철 KS 강종 DB 입력**: SHN275/355/420/460 (내진 H형강) · SD400/500/400W/500W/400S/500S (철근) · SAPH440 / SPFH590 (자동차) 약 17종. spec 은 09-hyundai-steel-ks-grades.md 에 정리. JSON 입력은 R102 별도 작업으로 분리. OCR txt 는 .gitignore 처리 (각 ~500 KB).

검증: tsc OK · vitest 47/47 · build:data OK (`Wrote materials.preview.json` · AA fix 98 · mismatch flag 33 · verified 695) · production build OK (1292.72 KB / gzip 356.51 KB).

## R99 — 모바일 긴급 fix (8건)
사용자 긴급 보고. 모바일 사용성 회복 위주.
- **모바일 Compare 탈출**: 모바일 nav (필터/뷰/Compare/가이드/Settings) 가 `z-30` → `fixed bottom-0 z-50` → Compare 패널 (`fixed top-12 bottom-[50px]`) 영역만 차지하여 nav 가 항상 보임. Compare 들어간 후 다른 view 로 즉시 이동 가능.
- **Ashby Index slider 모바일 노출**: `hidden md:block` → `flex-1` (모바일 가용 폭만큼 자동 펼침) — 사용자가 누르고 끌어 임계값 조정 가능.
- **가중치·Best-pick collapse**: Compare panel 의 두 섹션 모두 ChevronDown/Up 토글 헤더 — 기본 접힘, 모바일 세로 공간 절약. 데스크탑도 동일 UX.
- **Goodman 색상 + 5개 제한**: 기존 모든 선이 family color 같은 hue 였음 → Goodman 전용 5색 categorical palette (`#0066CC blue · #DC2626 red · #16A34A green · #D97706 orange · #7C3AED purple`). 6개 이상이면 처음 5개만 표시 + amber 안내 박스.
- **모바일 글자 망가짐**: Compare panel header `flex-wrap + min-w-0 + overflow-x-auto` → 닫기 X 항상 보임. 가중치/Best-pick 의 alloy 이름 `truncate max-w-[100-140px]` 적용. button group horizontal scroll 가능.
- **Ashby 필터/Pareto/Display 영역 세로 최소화**: `py-1 sm:py-2` → `py-0.5 sm:py-1.5`. Filter row 와 Index row 모두 적용. 스크린샷 빨간 박스 영역의 세로 25% 축소.
- **Toast 색상 정정**: "🔴 빨간 점선 = 필터 한계" → "🟣 보라 점선 = 축 한계 슬라이더 / 🔵 청록 점선 = 사이드바 범위 필터 / 🔴 빨간 실선 = Index 임계" — 실제 차트 shape 색상 (R50c 부터 보라/청록/빨강 3색) 과 정확히 일치.
- **모바일 main container padding**: `pb-[50px]` 추가 — 차트 영역이 fixed bottom nav 뒤로 밀리지 않음.

검증: tsc OK · vitest 47/47 · production build OK (1290.86 KB)

> 보류 (사용자 재검토 후 별도 push): 풍산 7 alloy + data/general-knowledge/ 9 markdown + AISI 4140 industry_note (R98 작업분).

## R97 — Reset axes 동작을 X/Y property 재선택과 동일화
사용자 요청: "reset axes 의 동작을 현재의 XY 축을 다시 설정했을 때와 동일하게 적용".
**관찰**: 사용자가 X-axis property 변경 (예: density → modulus) 시 axis 가 정상적으로 새 frame 으로 reset — uirevision 에 xProperty 가 포함되어 plotly 가 사용자 zoom 폐기 + layout.range 적용. 이게 의도된 동작.
**문제**: modeBar 의 🏠 Reset axes / doubleClick 은 plotly 자체 동작 (`xaxis.autorange:true`) 으로 marker bbox 에 fit — 우리 layout.range 무시.

**해결**: 동일 메커니즘으로 통일.
1. `useState<number>` 의 `resetCounter` 추가
2. xaxis.uirevision / yaxis.uirevision 의 끝에 `|${resetCounter}` 포함
3. `onRelayout` 핸들러에서 plotly 의 reset event 감지:
```js
if (e['xaxis.autorange'] === true || e['yaxis.autorange'] === true) {
  setResetCounter(c => c + 1);
  return;
}
```
4. resetCounter 증가 → useMemo 재실행 → uirevision 변경 → plotly 가 다음 render 에서 axis state 폐기 + 새 layout.range 적용

**결과**:
- 🏠 Reset axes 클릭 → property 재선택 시와 동일한 코드 path → 같은 layout.range (R94/R95 의 xRange/yRange) 로 정확 복원
- doubleClick reset 도 동일 동작
- indexLine drag (기존 onRelayout 처리) 은 그대로 동작 (autorange 조건이 false 이므로 indexLine 분기로 진입)

**구현 노트**: indexLine reference 가 frame anchor / layout 모두 그대로 — fset 기반의 인덱스 임계선이 새 frame 안에 다시 그려짐.

## R96 — Family tree tier2 색을 실제 family color 와 일치
사용자 요청: "family tree 색상을 1st 는 그대로 두고 2nd family 와 같게 수정. 실제 표시되는 것은 2nd family 색상".

기존 family tree 의 색 위계:
- tier1 (Metal/Polymer/Ceramic/Composite) — sky / emerald / amber / violet
- tier2 (Stainless Steel · Nickel Alloy · Aluminum · Cobalt Alloy …) — **tier1 의 lighter variant (모두 같은 hue)**
- alloy 의 family color (Card / Table / Detail / Ashby) — `lib/material-colors.ts CLASSES` 의 별개 색

문제 — 실제 표시 (Card 의 family-color dot, Detail 의 history border, Ashby 의 envelope) 는 family color (Steel blue · Nickel violet · Cobalt pink · Aluminum amber 등) 인데 family tree 는 그걸 안 따라가서 시각 inconsistency.

**수정**: 새 `TIER2_FAMILY_COLOR` 매핑.
```js
const TIER2_FAMILY_COLOR = {
  'Stainless Steel': '#3B82F6',        // Steel blue
  'Tool / Special Steel': '#3B82F6',
  'Carbon / Alloy Steel': '#3B82F6',
  'Aluminum': '#F59E0B',               // Aluminum amber
  'Nickel Alloy': '#8B5CF6',           // Nickel violet
  'Cobalt Alloy': '#EC4899',           // Cobalt pink
  'Titanium': '#06B6D4',               // Titanium cyan
  'Copper Alloy': '#D97706',           // Copper orange
  'Magnesium': '#0D9488',              // Magnesium teal
  'Refractory': '#475569',             // Refractory slate
  'Controlled Expansion': '#8B5CF6',   // Invar/Kovar (Fe-Ni → Nickel)
  'Other Specialty / Other Metal': '#94A3B8',
};
```

tier2 노드의 `text / └ / chevron / bg` 모두 inline style 로 family color 적용. `background: famHex + '14'` (8% alpha) 의 옅은 배경.
- tier1 (Metal 의 좌측 sky 라인) 은 그대로 — 카테고리 구분 유지
- tier2 의 메탈 family bucket 만 family color 로 매핑. Polymer / Ceramic / Composite tier2 는 category 색 유지 (CLASSES 에 family 세분이 없으므로)

**효과**: Family tree 에서 "Stainless Steel" 을 보면 푸른 톤, "Nickel Alloy" 는 보라, "Cobalt Alloy" 는 핑크 — Card 그리드 / Ashby envelope / Detail history 박스의 색과 동일 hue. 한눈에 시각 일관성.

## R95 — Ashby chart reset 후 비합리적 frame 두 가지 원인 fix
사용자 보고: "density / Young's Modulus 선택하면 정상. reset axes 누르면 X 가 1~2000 같은 이상한 범위로 가버림".

**원인 1 — frame anchor 의 marker `opacity: 0` 이 plotly autorange 에 무시됨**: R93/R94 의 frame anchor 가 opacity 0 + size 1 이라 시각적으로는 invisible. Plotly 가 autorange 계산 시 invisible marker 는 무시 → reset axes 가 frame anchor 의 4 corner 를 cover 하지 못함 → 다른 visible trace (envelope · marker) 의 bbox 로 axis 가 fit.
- 수정: `opacity 0.001 + size 6` — 시각적으로 거의 invisible (육안 식별 거의 불가) 이면서 plotly autorange 가 marker 점으로 인식

**원인 2 — ranges 의 outlier hiOf 가 xs/ys 를 과대 확장**: 일부 alloy 의 `ranges.<prop>.max` 가 typical 의 수십 배인 경우 (anomaly·variant 합금). xs = flatMap [loOf, hiOf] 라 그 큰 hiOf 가 max 로 들어가 → xRange 가 비합리적으로 확장.
- 수정: xs/ys 에 `xDomain * [0.9, 1.1]` clamping. xDomain 자체는 전체 materials 의 typical min/max 라서 outlier 영향 안 받음 → xs 가 sane range 로 제한

```js
const xClampLo = xDomain[0] * 0.9, xClampHi = xDomain[1] * 1.1;
const xs = xRangeSet.flatMap((m) => [loOf(m, xProperty), hiOf(m, xProperty)])
  .filter((v) => !!v && v > 0 && v >= xClampLo && v <= xClampHi);
```

**효과**:
- frame anchor 가 plotly autorange 에 인식 → reset 시 정확히 xRange/yRange 의 4 corner 로 axis 복원
- 데이터 outlier (anomaly ranges) 영향 차단 → xRange 가 항상 typical range 안
- density vs Modulus 시나리오: reset 후 X 0.05~25, Y 0.005~2000 의 합리적 frame 유지

## R94 — Ashby chart X/Y 축 범위 독립 계산 (reset 시 합리적 frame)
사용자 보고: "reset axes 할때 특정 값 range로 무조건 전환되는데 그 값이 합리적이지 않은듯. XY축 각각 합리적인 range 미리 계산하고 조합해서 적용해야".
**원인**: `valid(m) = X property && Y property 둘 다 > 0` 조건. xs/ys 계산이 fsetForFrame (= valid + family/sub 통과) 으로 묶여있어, 예) Y=KIC 일 때 KIC 데이터가 일부 alloy 에만 있으면:
- X 범위가 "KIC 도 가진 alloy 의 X 값" 만으로 계산 → X 가 합리적인 7 g/cm³ alloy 라도 KIC 없으면 X 범위 결정에서 제외됨 → X axis 가 비합리적으로 좁아짐
- Y range 도 X 가진 alloy 만 고려하는 같은 문제

**수정**: X/Y range 를 각자 독립 set 으로 계산.
```js
const xRangeSet = filtered.filter((m) => tv(m, xProperty) > 0 && inGroup && inSub);
const yRangeSet = filtered.filter((m) => tv(m, yProperty) > 0 && inGroup && inSub);
const xs = xRangeSet.flatMap((m) => [loOf(m, xProperty), hiOf(m, xProperty)])...
const ys = yRangeSet.flatMap((m) => [loOf(m, yProperty), hiOf(m, yProperty)])...
```
- X range 는 **X property 가진 모든 alloy** (Y 데이터 무관)
- Y range 는 **Y property 가진 모든 alloy** (X 데이터 무관)
- 두 독립 range 를 조합 → 차트 frame 이 각 axis 별 합리적 한계 cover
- fsetForFrame 자체는 그대로 (envelope·marker 표시는 둘 다 가진 alloy 만)

**추가 fix**: R93 frame anchor marker `size: 0.01` → `1` (plotly 의 autorange 가 size 0.01 을 무시할 가능성 차단). opacity 0 이라 시각적으로는 동일 invisible.

## R93 — Ashby chart frame anchor trace 로 reset 시 axis 확실 복원
사용자 보고 (R92 후에도 잔존): "기본 상태 → index 선택 → reset axes 누르면 엉뚱한 곳으로".
**진짜 원인 발견**: Plotly 의 `doubleClick: 'reset'` 과 modeBar 의 `resetScale2d` (🏠 home icon) 는 **layout.range 가 아니라 trace 의 데이터 bbox 로 axis 를 reset 한다**. uirevision 도, layout.range 명시도 reset 동작에는 영향이 없음.
- R89 에서 `fset = fsetForFrame.filter(inLim)` 분리 후, marker trace 가 fset 만 그려짐. index 선택 시 colored marker (= index 통과만) 가 또 작아짐.
- → Reset axes → axis 가 colored marker 의 좁은 bbox 로 zoom-in → 사용자가 "엉뚱한 곳" 으로 인지.

**진짜 해결책**: data 배열에 **4-corner invisible frame-anchor trace** 추가.
```js
const frameAnchor = {
  x: [fAxX[0], fAxX[1], fAxX[0], fAxX[1]],
  y: [fAxY[0], fAxY[0], fAxY[1], fAxY[1]],
  mode: 'markers', type: 'scatter',
  marker: { size: 0.01, opacity: 0, color: 'rgba(0,0,0,0)' },
  hoverinfo: 'skip', showlegend: false, name: '_frame',
};
```
- `fAxX/Y` = xRange/yRange 의 raw 값 (xLog 면 10^range, linear 면 그대로)
- size 0.01 + opacity 0 + transparent color → 시각적으로 안 보임
- hoverinfo skip → 호버 무반응
- data 배열 첫 번째 위치 → plotly 가 axis range 결정 시 항상 cover

**효과**:
- 어떤 reset 동작이든 (doubleClick / 🏠 modeBar / 'autoScale2d' 가 있다면 그것까지) axis 가 frame-anchor 의 4 corner 를 cover → **fsetForFrame 의 frame 으로 정확 복원**
- index 통과 colored marker 가 3개라도, fset 이 inLim 으로 좁아도, frame 영역은 fsetForFrame 기준 유지
- 모든 reset 시 동일한 frame → 사용자 인지 일관

## R92 — modeBar Reset axes (home icon) 동작 회복
사용자 보고: 물성 변경 후 Reset axes (modeBar 의 🏠 = `resetScale2d`) 버튼 누르면 이상한 곳으로 axis 가 reset 됨.
**원인**: R90 에서 추가한 `autorange: false`. Plotly 의 `resetScale2d` 동작은 axis 를 layout 의 range 로 복원하려 하지만, autorange:false 가 명시되어 있으면 axis state 가 frozen 상태로 인식되어 새 layout.range 적용이 제대로 안 됨.
**수정**: `xaxis.autorange / yaxis.autorange` 라인 제거. range 명시만으로 plotly 가 그 범위로 axis lock — autorange 의 default 처리가 더 정확.
**효과**:
- 물성 변경 (예: density → modulus) 시 uirevision 변화로 axis 가 새 layout.range 로 정상 reset
- 사용자가 zoom 후 🏠 버튼 누르면 fsetForFrame 기준의 layout.range 로 정확히 복원
- doubleClick 'reset' 동작도 동일하게 정상

## R91 — CI workflow fix + materials.json gitignore (repo 위생)
사용자 보고: "GitHub Actions 에서 실패가 많았다 · gitignore 도 좀 손봐야 할지도".

**원인 1 — CI ci.yml 의 pnpm version 충돌**: `pnpm/action-setup@v4` 에 `version: 10.4.1` 명시했는데, package.json 의 `packageManager: pnpm@10.4.1` 와 충돌해 액션이 errors out. deploy-pages.yml 코멘트에 *"Do NOT pin a version here — pnpm/action-setup reads it from the packageManager field. Specifying both errors out"* 이미 명시되어 있었음.
- 수정: ci.yml 의 `version: 10.4.1` 제거 → packageManager 필드에서 자동 읽기

**원인 2 — build:data 단계 부재**: ci.yml 이 `pnpm install → check → test → build` 순서인데, build 가 client/public/materials.json 를 dist 에 copy 함. 이 파일이 git tracking 되어 commit 으로 전달되고 있었음 (6.3MB).
- 수정: ci.yml 에 `pnpm build:data` 단계 추가 → CI 가 직접 materials.json 생성

**원인 3 — 거대 generated 파일이 repo 에 commit**: 매 R72-R90 commit 마다 client/public/materials.json (6.3MB) + build-meta.json (매 build 마다 timestamp 변경) + data/validation-report.md (anomaly report) 가 diff 에 포함. push 부담 + repo 비대화.
- 수정: .gitignore 에 3개 generated 파일 추가, `git rm --cached` 로 tracking 해제 (history 보존)

**효과**:
- CI 가 정상 동작 (frozen-lockfile + version 충돌 없음)
- repo 매 commit 의 diff 가 src 변경만 — clean
- CI runner 가 build:data 로 직접 데이터 생성하므로 stale 데이터 위험도 없음
- node-version CI 도 22 (deploy 와 통일)

**검증**: 로컬 tsc OK · vitest 47/47 · build:data OK · production build OK

## R90 — Ashby chart axis 안정성 (uirevision · reset · fallback)
사용자 보고: "(R89 후에도) index 활성화에 따라 chart frame 바뀜 · reset-axis 가 이상하게 반응 (빈 화면만 보임)". 세 가지 근본 원인을 동시에 수정.

**원인 1 — uirevision 부재**: useMemo dep 에 `indexPreset / indexThreshold / xLimit / yLimit / compareList` 등이 들어가 있어, 이들이 변할 때마다 Plotly props 가 새로 전달되고 Plotly 가 axis state 를 layout 의 range 로 강제 reset. 사용자가 zoom/pan 한 상태가 보존되지 않음 + frame 이 흔들리는 것처럼 보임.

**원인 2 — doubleClick: 'reset+autosize'**: reset 시 plotly 가 marker trace 의 bbox 에 맞춰 axis auto-fit 함. index preset 활성화 후 colored marker 가 3-4개만 통과하면 axis 가 그 3-4개에 맞춰 매우 좁아져 "빈 화면" 처럼 보임.

**원인 3 — xRange/yRange undefined**: fsetForFrame 이 비어있는 edge case (예: family/sub 조합이 빈 set) 에서 logRange/linRange 가 undefined 반환 → layout axis range 없음 → plotly fallback 동작 → 빈 axis.

**수정**:
- `xaxis.uirevision = "${xProperty}|${xLog}|${groupFilter}|${subFilter}"` — xProperty/yProperty/log/family/sub 변경 시에만 axis reset, 그 외는 사용자 zoom/pan 보존
- `yaxis.uirevision` 동일 패턴
- `xaxis.autorange: false / yaxis.autorange: false` 명시 — range 명시 시 plotly 의 자동 auto-range 동작 차단
- `doubleClick: 'reset+autosize' → 'reset'` — autosize 제거, layout 의 range 로 정확히 복귀
- `xRangeFallback / yRangeFallback` — fsetForFrame 이 비어도 xDomain (전체 materials 의 range) 으로 fallback

## R89 — Ashby chart frame을 inLim 미적용 fsetForFrame 기준으로 고정
**문제**: R88 에서 X/Y range slider 를 hard filter 로 만들었더니, range 좁히거나 index 임계값 조정 시 fset 이 변하면서 차트 axis auto-range 까지 같이 변해 zoom 이 흔들림. 사용자 보고: "index 적용시에도 frame은 유지해야함".
**수정**: fset 을 두 단계로 분리.
- `fsetForFrame = filtered.filter((m) => valid(m) && inGroup(m) && inSub(m))` — sidebar filter + family/sub 까지만. **차트 axis range 기준**.
- `fset = fsetForFrame.filter(inLim)` — range slider 까지 적용. **envelope · marker · index 표시 기준**.

auto-range 계산을 `fsetForFrame` 으로 변경:
```js
const xs = fsetForFrame.flatMap(...)
const ys = fsetForFrame.flatMap(...)
```

**효과**:
- range slider 좁혀도 axis range 유지 → envelope 가 차트 한 구석으로 작게 모이는 게 아니라 동일 위치에서 일부만 사라짐
- index threshold 조정 시 colored/coldFset 분리는 일어나도 frame 흔들림 없음
- 사용자가 range/index 인터랙티브 조정 시 차트 zoom 안정성 확보

## R88 — Ashby chart X/Y range → hard filter (AND) 변경 (Bug fix)
**Bug**: 좌측 사이드바에서 Metal 만 선택 + Y range 145.6~1050 GPa 으로 좁혔는데도 Aluminum (E≈70 GPa) envelope 가 차트에 계속 표시. 사용자가 "AND 조건이 적용 안 되는 것 같다" 고 보고.
**원인**: X/Y range slider (`xLimit`/`yLimit`) 가 fset 정의에 포함되지 않고 "selection window" 로만 동작. 코드에 `"limits act as a selection (below), not a frame change"` 주석으로 의도된 동작이었으나 사이드바 family checkbox 와 일관되지 않아 직관에 어긋남.
**수정**: `fset = filtered.filter((m) => valid(m) && inGroup(m) && inSub(m) && inLim(m))` 로 inLim 을 hard filter (AND) 에 포함. envelope · marker · index 임계 등 모든 후속 처리가 범위 밖 데이터 자동 제외. 이전 line 310-315 의 selection-window branch 도 무의미해져 제거.
- **효과 (스크린샷 사례)**: Y range 145.6~1050 GPa + Metal family → Steel (E 200) Cobalt (E 220) 만 표시, Aluminum (E 70) 과 Magnesium (E 45) 의 envelope 는 그래프에서 사라짐
- 회색 'others' background (사이드바 미통과 + valid) 는 그대로 — 비교 위치 anchor 유지

## R87 — Story 배지·History 박스 family color 통일
R84 의 amber 단일톤 (모든 카드/표/Detail 에서 같은 amber) 이 family-color dot 옆에서 튀어 보이는 문제를 해결. 모든 story 시각 요소를 재료의 family color 톤으로 통일.
- **Card view 배지** — `bg-amber-100 ring-amber-300/50 text-amber-700` → `bg: famColor + 1f` (12% alpha) + `boxShadow inset 1px famColor55` (33% alpha ring) + `icon: famColor` (full tone)
- **Table view 배지** — 동일 패턴
- **Detail panel History details** — `border-amber-500/30 bg-amber-50/40 text-amber-900` → `borderColor famColor55 / background famColor10 / 주요 텍스트 (summary, 📌 Industry standard, 출처 헤더) color famColor / 출처 구분선 famColor33`
- 결과: 강철 합금은 푸른 톤, 알루미늄은 황금색, 니켈은 보라, 코발트는 핑크, 폴리머는 녹색 — 한눈에 family 와 매칭되면서도 "연한 배경 + 진한 아이콘/텍스트" 의 기조 유지
- 모든 inline style 사용 (Tailwind dynamic class 불가) — famColor 가 이미 6-hex (`#3B82F6` 등) 라 alpha 2-hex suffix 안전

## R86 — Card view 물성 컨트롤 + 모바일 밀도 + Radar 약어
**Card 표시 물성 사용자 선택**: Card view 상단에 chip 토글 11종 추가. `am_card_props` localStorage 영속, 최소 1 / 최대 6개 강제. Default 4개 (σy / UTS / El / ρ).
- 옵션 11종 — σy, UTS, El, E, HV, k, ρ, Tmax, KIC, σf, $/kg
- Active chip = accent 배경 + shadow, inactive = 회색 border, hover 시 accent 강조
- 카운터 `{n}/6` 으로 한도 표시
- chip bar 가로 스크롤 (모바일 대응)

**Card 모바일 정보 밀도 ↑**: 텍스트 크기 유지, 카드 자체를 더 compact 하게.
- 카드 padding `p-3` → `p-2 sm:p-3`
- grid gap `gap-3` → `gap-2 sm:gap-3`
- Family + Process 한 줄 압축 (이전엔 2 줄)
- bar 가 있는 prop (σy/UTS/El/E/HV/σf) 와 value-only prop (ρ/k/Tmax/KIC/$) 자동 구분
- 기본 default 4개 + 사용자가 임의 추가 → 한 카드 안 정보량 2x

**Radar label 약어 + 잘림 방지**:
- `RadarAxis` 타입에 `longLabel` 추가 — chart 는 `label` (짧은 기호), picker UI 는 `longLabel` (풀어쓴 설명)
- DEFAULT 6개 + OPTIONS 13개 모두 단축 — σy / UTS / E / El / k / 1/ρ / HV / σf / KIC / Tmax / 1/$ / 1/α / Pop
- chart svg radius margin 32 → 22 (label 짧아져 안전 영역 ↑)
- font 10 → 11 + semibold + fill `#334155` (이전 #475569) — 시인성 ↑
- `<title>` 자식으로 hover 시 longLabel 노출 — 정보 손실 zero

## R82-R85 — UI 심미성 4-라운드 폴리시
**R82 (P0 헤더)** — 데스크탑 헤더 시각적 noise 줄임.
- Stats 5색 chip (`Metal blue · Polymer green · Ceramic amber · Composite violet · AM orange`) → 단일 `Database 1,168 materials` 버튼 + tooltip 안에 breakdown 정렬
- View toggle 배경 `oklch(0.28...)` → `oklch(0.16...)` + inset shadow + ring → segmented control 느낌 강화 (sidebar bg 와 명확히 분리)

**R83 (P1 모바일 nav + Settings)** — 현재 위치 시각 anchor + sheet layout.
- 하단 nav 의 뷰전환 버튼에 top accent dot 추가 + 텍스트도 accent 색으로 → 현재 활성 뷰 한눈에
- Settings sheet 의 3 카드 분리 → 단일 카드 + divide-y row 3개 (라벨 좌측 + segmented control 우측). 위계 일관

**R84 (P2 Detail · Donut · Story 배지)** — Detail 패널 시인성.
- Properties / Composition / Process 탭 active 시 `border-accent + bg-accent/5 + text-accent + font-semibold` (이전엔 border 만) — 어느 탭에 있는지 명확
- Composition donut 채도 ↑: ELEMENT_COLORS 38색 모두 채도/명도 재조정 (saturation 38% → 50%, lightness 62% → 55%). 인접한 보라 계열 (Mn / Mo / Co) 구분 ↑
- Story 배지 (`📖`) 시인성 ↑: amber-100 둥근 pill + amber-300 ring + amber-700 BookText (Table 셀 / Card 이름 양쪽)

**R85 (P3 마감)** — 마이크로 폴리시.
- Status bar (데스크탑 footer) **완전 제거** — 사용자 요청
- Tools 헤더 아이콘: 모바일만 Wrench → 데스크탑/모바일 모두 Wrench + (lg) 텍스트 동시 노출
- 검색창 expand transition 추가 — `transition-all duration-200 ease-out` + opacity fade

## R81 — 모바일 검색 버튼 왼쪽 정렬
모바일 헤더의 search icon 을 wrapper 안에서 분리해 헤더 왼쪽 (logo 자리) 으로 이동. 좌측 정렬 일관성 (logo·필터·검색이 모두 왼쪽).
- `Divider` 다음에 `md:hidden` search 아이콘 버튼 추가
- 기존 wrapper 안 search icon 제거, expanded 상태 input 만 wrapper 가 담당
- breakpoint `sm:` → `md:` 통일 (768px 이상에서만 데스크탑 input)

## R80 — 모바일 헤더 합리화 + Settings 시트 신설
모바일 상단 헤더에서 자주 안 쓰는 컨트롤을 빼서 하단 nav 의 새 Settings 시트로 옮김. 헤더는 핵심 동작 (검색 · 뷰 전환 · Export · Tools · 즐겨찾기 · 가이드) 만 노출.
- **Logo 모바일 hidden** — 좁은 헤더에서 가장 왼쪽 Database 아이콘이 공간을 차지했는데 정보값 없어 `hidden md:flex` 처리
- **모바일 햄버거 제거** — 필터는 하단 nav 의 첫 버튼 (Menu icon) 으로 통일 → 사용자가 직관적으로 '왼쪽 sidebar 가 슬라이드되는 것' 과 일관. 필터 버튼은 nav 왼쪽 첫 자리.
- **`?` 온보딩 · KO/EN · SI/IMP — 모바일 hidden** — 모두 새 Settings 시트 안으로 이동
- **Tools `⚙` → Wrench 아이콘** — 새 Settings ⚙ 와 시각적 혼동 방지
- **하단 nav `grid-cols-4 → 5`** — 마지막에 ⚙ Settings 추가: 필터 / 뷰전환 / Compare / 가이드 / Settings
- **Settings 시트 내용** — 우측 슬라이드 sheet 안에 3 카드:
  - 언어 — 한국어 / English 2-button toggle (active 는 accent 배경)
  - 단위 — SI (MPa·°C·g/cm³) / Imperial (ksi·°F·lb/in³) 2-button + sub-label
  - 도움말 — 온보딩 5단계 다시 보기 (` ? ` icon + 라벨)
- 데스크탑 (`md+`) 동작은 변경 없음 — 기존 상단 우측의 KO/EN, SI/IMP, ? 버튼 그대로

## R79 — popularity 4+ metal 스토리 확장 (65 → 89 base, 176 → 238 alloy 노출)
popularity 4.0+ metal 중 story 없는 25종 추가. existing key 3종 단축 (`Ti-6Al-4V (Grade 5)` → `Ti-6Al-4V`, `AISI 4140 (...)` → `AISI 4140`, `Copper (Pure, C11000)` → `Copper C11000`) 으로 prefix match 폭 확대. 신규 entry 들도 친근한 한국어 완성문 어투.
- **AM Al cast 표준** — AlSi10Mg (모든 metal AM vendor 의 default Al 분말, F1 BMW Sauber oil cooler housing 부터 Apple AirPods Max 까지)
- **carbon steel** — AISI 1045 (S45C 동등, flame-hardenable cam shaft), ASTM A36 (1960 → 미국 빌딩 frame 80%, 매년 8천만 ton)
- **항공 Al** — AA 5083 (1957 Alcoa Fink, LNG carrier inner tank + Tesla Roadster 1세대 frame), AA 6063 (1935 압출 default, LG Hausys 새시 + curtain wall + Apple Mac mini), AA 1100 (commercial pure, 재활용 Al 의 default destination)
- **stainless** — AISI 410 (1903 Brearley, 모든 밸브 trim + Wüsthof 칼날), AISI 430 (1929 ferritic, 모든 dishwasher inner liner + kitchen sink), 15-5 PH (1962 Armco, 17-4 의 forging-isotropy 보완)
- **alias** — Stainless Steel 316L (ELC, 의료 ASTM F138 + 반도체 EP-finished + AM 1순위), 304L Stainless (Cloud Gate 168장 용접), 42CrMo4 (4140 EU 동등), C11000 (ETP 짧은 alias)
- **공구·금형** — H13 Tool Steel (1929 Carpenter, BMW iX5 Hydrogen FC stack die LPBF), P20 mold steel (1936 Bethlehem, 사출금형 70%), Maraging C300 (EOS MS1 LPBF 표준)
- **고강도 합금강** — AISI 4340 (1923 SAE, 737/A320 nose gear + Sidewinder motor case), Inconel 718Plus (2000 Allvac Wei-Di Cao, F-35 + Trent XWB 차세대 disc)
- **copper alloy** — OFHC Copper C10100 (1937, CERN LHC + ITER + Furutech audio), Naval Brass C46400 (1881 영국 royal navy, Big Ben bell bracket + sailor superstition), C26000 Cartridge Brass (1882 Federal, M16/5.56 NATO + 트럼펫 bell + 풍산 글로벌 20%), CuCr1Zr (1940s GE/Krupp, 모든 자동차 spot welding tip)
- **Mg** — AZ91D (1933 Dow, VW Beetle transmission case 65년 + Audi A8 ZF housing)
- **고급 wear/medical** — Stellite 21 (1930 Haynes, Vitallium 의료 + Stryker Accolade)
- **JIS spring** — SUP9 (5160 일본 equivalent, Toyota Land Cruiser + 현대 마이티 leaf spring, 한국 SPS9)

build script 의 prefix-match + word-boundary 가 condition 변형 ("AA 5083 — Strain-hardened", "OFHC Copper C10100 — Annealed") 까지 자동 attach. 25/25 신규 base name 진입 검증.

## R78 — Metal 스토리 확장 (30 → 65) + 어투 친근화 (99 → 176 alloy 노출)
**스토리 수 확장** — 기존 30개에 metal 20종 추가, 비-metal 일부 보강해 65 base stories. build-materials.mjs 의 prefix-match + word-boundary lookup 으로 condition 변형까지 자동 attach → 노출되는 alloy **99 → 176**.
**어투 다듬기** — 핵심 7종 (Inconel 718, AISI 304/304L/316, Ti-6Al-4V, AA 6061/2024/7075) 을 친근한 한국어 완성문으로 재작성. 인물명은 한글 병기, 어미 다양화, "그가 풀려고 한 문제" / "그가 내놓은 답은" 같은 narrative tone.
**추가된 metal 20종** (산업 표준 영역):
- 잠수함·송유관 — **HY-100** (Virginia/Seawolf hull, Thresher 사고 후 hydrogen embrittlement spec), **API 5L X70** (Trans-Alaska Pipeline 1287km, Athabasca 1986 brittle fracture 이후 CTOD spec)
- 화학·고온 — **Hastelloy C-276** (1965 Haynes, DuPont HF reactor 절대 표준), **Hastelloy X** (1954 Floreen·Decker 같은 콤비, Apollo LM descent + SSME), **Tungsten W 99.95%** (Coolidge 1908 GE filament + KE penetrator)
- PH stainless — **17-7 PH** (Armco 1948 semi-austenitic, SR-71 사보 와이어), **PH 13-8 Mo** (Armco 1965, F-15/16/18 actuator + Stryker spinal rod)
- 의료·생체 — **CoCrMo F75** (1929 Vitallium, 1937 Bohlman 첫 hip arthroplasty), **Beryllium Copper C17200** (1932 Brush, Apollo 우주복 zipper, F1 spring contact)
- 해양 — **Cupronickel 70/30 C71500** (1929 USN 표준, 사우디 Ras Al Khair MSF 880km condenser tube)
- 우주 — **Niobium C-103** (Apollo LM ascent engine, Mariner 4 산화 사고), **NARLOY-Z** (SSME 60년 표준), **GRCop-84** (NASA RAMPT, Raptor V2 candidate), **AA 2195** (Reynolds 1989, SLWT Shuttle + SLS LH2), **AA 2050** (Constellium AIRWARE, A380 lower wing 800m²)
- 항공·헬기 — **Pyrowear 53** (Carpenter 1985, 헬기 변속기 loss-of-lube 30분 생존), **MAR-M 247** (Martin Marietta 1971, GE F404/F414 + F1 터보), **Udimet 720Li** (Special Metals 1965, Trent 500/700/800/900 HP disc)
- 인프라·차체 — **22MnB5** (ArcelorMittal 1995 USIBOR, EU 95 g/km CO₂ 규제 후 표준), **Hardox 450** (SSAB 1974, Komatsu HD785 + Cat 793F dump body), **A992** (2002 표준, Northridge 1994 지진 trigger), **S355J2+N** (1993 EN 10025 EU 통합, Øresund/Millau/풍력 타워)
- 철도 — **R260 Rail** (UIC 860 KTX/Shinkansen mainline), **Railway Wheel Class C** (AAR M-107 BHP Pilbara 35t/axle)
- 공구·베어링 — **D2 Tool Steel** (1920s Vasco Wear, Bohler K110/Uddeholm Sverker 21), **AISI 52100** (1898 SKF Wingquist, 모든 자동차 wheel bearing + hybrid Si₃N₄ ball)

**build script** — 기존 base-name exact match 에 prefix match + word-boundary (다음 글자가 space/em-dash/괄호/콤마 여야 함) 추가. "Inconel 718 — Annealed" 같은 condition 변형 + "HY-100 (MIL-S-16216) — submarine pressure hull — Q+T" 같은 3 단 이름 모두 매칭.

## R77 — Table·Card view 에 개발 스토리 배지
`m.story` 가 있는 합금의 이름 옆에 작은 amber `BookText` 아이콘 표시. 사용자가 list 에서 즉시 "이 재료엔 개발 역사 + industry-standard 응용 기록이 있다" 를 인지 가능.
- **MaterialTable**: 이름 셀의 family-color dot 옆에 W3 H3 amber BookText, hover title "개발 스토리·industry-standard 응용 기록 있음 (Process 탭)"
- **MaterialCards**: 이름 텍스트 inline 첫 글자 앞에 W3 H3 amber BookText, card title attribute 에 동일 hint
- 적용 대상 = R75 의 99 alloy (Inconel 718/625 의 condition 변형 모두, AISI 304/304L/316/1010/1018/1020/4140, Ti-6Al-4V, AA 6061/5052/2024/7075, 17-4 PH, Maraging 300, Stellite 6, Nylon 66, PMMA, PP, ABS, PC, PETG, PLA, PEEK, A356, Hadfield Mn13, AZ31B, Al-Bronze, Cu C11000, Nitinol, Invar 36, Alumina, Si₃N₄, WC-Co, CFRP T800, GFRP, POM Delrin, PVC)

## R76 — Story Process 탭 이동 + Composition 탭 SVG 도넛차트
**Story 위치 이동**: R75 에서 Properties 탭 최상단에 노출하던 History·개발 스토리 amber 박스를 **Process 탭** 최상단으로 옮김. Properties 는 다축 성능 (Radar) → 기계·물리·열·비용으로 즉시 접근, Process 는 alias·family·heat treatment 와 함께 dev history 가 자연스럽게 묶임.
**Composition 도넛차트**: `CompositionDisplay` 가 모든 재료의 chemical composition 을 SVG 도넛으로 시각화. 풍성한 polymer 부터 99% Fe 강철까지 동일 컴포넌트로 대응.
- `parseCompValue()` — "16~18" 중간값, "≤2" 상한, "≥58" 하한, "0.25" 그대로, "balance"/"trace" 별처리
- `buildCompSlices()` — known element wt% 합 → balance 원소를 (100 − sum) 으로 자동 backfill, value desc 정렬
- `ELEMENT_COLORS` — Fe slate, Cr 라이트블루, Ni 페일 그린, C 다크, Mn 보라, Si 옐로, Cu 코퍼 … 39 원소 표준 색; 누락 시 안정 해시 HSL 폴백
- `CompositionDonut` — 200×200 SVG, R=78 / r=48, 중앙에 dominant element + % 표기, hover `<title>` 로 `Fe: 70.50 wt% (70.5%, balance)` 표시; 100% 단일 원소 (Cu C11000 등) 의 path-closure edge case 처리
- 도넛 옆에 색상 dot + element + value% legend grid, 하단에 기존 raw range 그리드 유지 (예: `Cr 11.5~13.5`)
- legend balance 항목에 italic `bal` 뱃지

## R75 — Detail "History · 개발 스토리" 섹션 추가
Popularity 최상위 재료 30종에 대해 2~3 단락의 개발 역사, 스토리, 실제 사용례를 `data/material-stories.json`(name → text+refs) 로 분리 작성. `build-materials.mjs` 가 base name lookup 으로 모든 condition 변형 ("Inconel 718 — Annealed", "— STA" 등) 에 동일 story 를 attach (99 alloy 노출). 모든 story 는 1차 출처 (특허, 논문, handbook) 명시.
- **Material type 확장** — `story?: string`, `story_refs?: string[]`, `industry_note?: string` 신규 필드
- **build-materials.mjs** — supplementary 의 `industry_note` 통과 + stories.json 자동 주입
- **MaterialDetail.tsx** — Properties 탭 최상단에 amber 박스로 "History · 개발 스토리" 펼침 default open; 📌 Industry standard 한 줄 + 본문 다단락 + 출처 리스트
- **138 alloy** 에 industry_note 노출 (R72-R74 의 metal 54종 × condition variants)
- **30 base stories** = Inconel 718/625, AISI 304/304L/316/1010/1018/1020/4140, Ti-6Al-4V, AA 6061/5052/2024/7075, 17-4 PH, Maraging 300, Stellite 6, Nylon 66, PMMA, PP, ABS, PC, PETG, PLA, PEEK Victrex 450G, A356.0, Hadfield Mn13, AZ31B Mg, Aluminum Bronze C61400, Copper C11000, Nitinol, Invar 36, Alumina 99.5%, Si₃N₄ HIP'd, WC-6Co K10, CFRP T800, GFRP E-glass UD, POM Delrin 500, PVC

## R74 — Metal 산업군 추가 확장 (1,121 → 1,168)
이전 R72/R73이 다룬 metal 도메인(밸브·베어링·항공 disc·차체·보일러튜브·원자로) 외 미커버 metal 산업군 20종을 supplementary 에 추가. 모든 entry 에 `industry_note` 로 표준·OEM·기체 모델 명시.
- **철도 (Rail / Wheel)** — R260 (UIC 860 / EN 13674-1, 60E1 mainline), Class C wheel (AAR M-107, 39 t/axle heavy-haul)
- **방위 갑옷** — RHA MIL-A-46100 (M1 Abrams 핵체 / Bradley IFV / Stryker)
- **미사일 motor case / 항공 landing gear** — D6AC (Minuteman III / Trident D-5 / B-1B), HP 9-4-30 (F-14/15/16 main gear)
- **자동차 단조** — 38MnVS6 (BMW B57 · VW EA288 · MAN D2868 크랭크샤프트 microalloyed)
- **구조강 (Civil / Infrastructure)** — A992 (US W-shape, 모든 미국 빌딩·다리), S355J2+N (EU 다리·풍력 타워·선체), S275JR (EU general fabrication 95%), S690QL (Liebherr 크레인 boom, Cat 굴착기 stick), API 2H Gr.50 (Shell Mars / North Sea offshore jacket)
- **마모 / 광업** — Hardox 450 (Komatsu HD785 / Cat 793F dump body, 분쇄기 hopper)
- **스프링 (heavy-truck)** — AISI 9260 (Hino / Tata / Volvo FH leaf spring, John Deere disc plough)
- **공구강** — D2 Tool Steel (cold-work stamping die 글로벌 표준, Bohler K110 / Uddeholm Sverker 21), AISI H21 (W tool, 단조 die 적열경도 650°C)
- **로켓 엔진 (Cu 열교환 chamber)** — NARLOY-Z (SSME/RS-25 / Aerojet RL10), GRCop-84 (NASA RAMPT 2세대 AM, Raptor V2 candidate)
- **항공 / 우주 Al-Li** — AA 2195 (SLWT Shuttle / SLS LH2 tank / Falcon 9), AA 2050 Constellium AIRWARE (A380 lower wing / A350 fuselage frame / A220)
- **저온 LPG / 냉동 LNG 갑판 탱크** — ASTM A537 Class 2 (Statoil Mongstad NH₃ sphere, refrigerated propane bullet)

## R73 — Industry-standard 도메인 확장 (1,085 → 1,121)
보유 데이터가 풍부한 ceramic 영역(Macor, Mullite, Spinel, WC-Co, Sialon 등 이미 존재)은 건너뛰고, metal·composite·polymer 영역에 20종 추가. 각 metal entry 에 `industry_note`, composite/polymer entry 에 `applications` 상세 표기.
- **잠수함 / 수소 서비스 / 파이프라인** — HY-100 (Virginia·Seawolf hull), SA336 F22V (hydroprocessing reactor V-mod Cr-Mo), API 5L X65 PSL2 (sour offshore), API 5L X70 PSL2 (gas transmission), L80 Type 13Cr (CO₂ sweet OCTG)
- **마모 / 충격** — Hadfield Manganese Steel Mn13 (ASTM A128 Grade B, 분쇄기 jaw / 철도 frog)
- **항공·우주 Al** — AA 5083-H321 (LNG inner tank / ABS marine), AA 2024-T351 (737/747 fuselage skin), AA 7050-T7451 (F-22/777 thick forging)
- **β-Ti** — Ti-13V-11Cr-3Al (SR-71 Blackbird airframe, 1st-gen β)
- **헬리콥터 기어** — Pyrowear 53 (AMS 6308; Black Hawk/Apache main gearbox, 315°C loss-of-lube)
- **터빈 블레이드 / 디스크** — MAR-M 247 (GE F404/F414 blade, F1/Le Mans turbo wheel), Udimet 720Li (Trent 500/700/900 HP disc), AISI 8620 (자동차 변속기 ring & 풍력 1.5 MW 기어 reference)
- **CFRP 확장** — T700SC/Epoxy (F1·자전거·풍력 mid-range), IM7/BMI (F-22·F-35 supersonic 230°C 1차 구조), M40J/Cyanate Ester (위성 antenna boom 저 CTE)
- **고성능 폴리머** — PMMA Plexiglas G (F-16/Cessna 캐노피 MIL-PRF-25690), PET-GF30 Rynite 530 (산업 감속기·펌프·헤어드라이어), PPA-GF45 Amodel A-1145 HS (자동차 EV 인버터·트랜스미션 HT)

## R72 — Industry-standard niche alloy DB (1,040 → 1,085)
20 standard-grade alloys added to `data/supplementary-materials.json`, each tagged with `industry_note` describing its de-facto-standard application. Total reference materials 392 → 412; combined DB 1,040 → 1,085 alloys.
- **Valve / pump trim** — SS410 (UNS S41000, API 6A trim), SS420 (cutlery / surgical), SS440C (premium bearing & blade)
- **Aero bearing & gear** — M50 (AMS 6491, jet-engine mainshaft), AISI 9310 (VIM-VAR, helicopter transmission)
- **Automotive body** — 22MnB5 (USIBOR 1500 hot-stamping PHS), DP780 (dual-phase AHSS)
- **Boiler tube** — SA213 T22 (2.25Cr-1Mo subcritical/USC), Super 304H (S30432 Nb-Cu USC superheater)
- **Reactor / fuel** — SA508 Grade 3 Class 1 (PWR RPV forging), Zircaloy-4 (R60804 PWR fuel cladding)
- **Cryogenic structural** — 9% Ni Steel (ASTM A553 LNG tank inner shell)
- **Shipbuilding** — AH36 (ABS/DNV/LR harmonized high-tensile hull)
- **Engine valve** — SAE 21-4N (NCF3 automotive exhaust valve face)
- **Cryogenic propellant** — AA 2219-T87 (Saturn V / SLS / Falcon 9 LOX tank)
- **Aerospace fastener / medical** — MP35N (UNS R30035 Co-Ni-Cr-Mo)
- **Plastic injection mold** — NAK80 (Daido pre-hardened mirror-finish), STAVAX ESR (Uddeholm corrosion-resistant)
- **Spring** — Music Wire (ASTM A228 piano-wire), Chrome-Silicon (ASTM A401 oil-tempered engine valve spring)

## R71 — Quality push (security · a11y · backup · tests · CI)
- **R71 Sprint A** — security headers (CSP, X-Frame, Referrer-Policy, Permissions-Policy), Guide & Tools lazy-loaded, ErrorBoundary classifies network/TDZ errors with 3 recovery actions
- **R71 Sprint B** — anomaly detection excludes 17 specialty Ni superalloys (Monel, single-crystal CMSX/Rene/PWA, ODS, low-CTE) → 330 → 327
- **R71 Sprint C** — focus-visible ring (WCAG 2.4.7), pointer:coarse min-tap-target ::before (WCAG 2.5.5), prefers-reduced-motion override
- **R71 Sprint D** — localStorage backup/restore JSON (collections, favorites, recent searches, language, units, radar config)
- **R71 Sprint E** — 47 unit tests (vitest): cross-sections, welding CET + machinability, HT glossary, fuzzy search
- **R71 Sprint F** — `.github/workflows/ci.yml` (install → check → test → build), CLAUDE.md & CHANGELOG.md, CVE audit (3 dev-only vulns documented)

## R70 — Guide external link cleanup
- `pnpm verify:guide` script — extracts every https href, GETs with browser UA, classifies ok/forbidden/redirect/dead/error
- 14 dead URLs replaced (Wikipedia renames, DoITPoMS restructure, MIT OCW course-ID changes, vendor reorg) → 0 dead / 74 OK / 3 bot-block / 2 SSL-timeout (browser OK)

## R69 — Compare power-user features
- **A·D** — build-meta footer "Data updated YYYY-MM-DD", alloy ⭐ favorites with header dropdown
- **B·C** — 6 best-pick badges (max σy, max E, max σy/ρ, max E/ρ, min price, max HV), PDF export via window.print + @media print
- **G·H** — 4 weight sliders + Top-3 medal ranking, 3 new Tools calculators (LMP creep lifetime, Mohr's circle, Schaeffler stainless phase diagram)

## R68 — Visual polish
- **Sprint A** — 6 Tools calculators get inline SVG illustrations (Kt shape feature + stress flow, galvanic 2-metals + electrolyte, buckling Euler vs Johnson with end conditions, CTE mismatch bars, Vickers indenter, pressure vessel cyl/sph with hoop arrows)
- **Sprint B** — 4 Guide SVG: S-N curve (Basquin), Goodman/Soderberg/Gerber overlay, AM Z-vs-XY anisotropy schematic, 7-step AM post-processing flowchart
- **Sprint C** — analysis-only of remaining usability gaps

## R67 — Engineering Tools page + Detail extensions
- **Sprint A** — Detail panel adds Manufacturability section (Machinability rating per 30 alloy-family rules, CET per IIW Doc IX-1086-87 from composition), A/B basis link to Guide
- **Sprint B** — new `/tools` page + 6 calculators (Stress concentration Kt, Galvanic compatibility 15-metal series, Buckling Euler/Johnson auto-pick, CTE mismatch thermal stress, Hardness HV↔HRC↔HB conversion ASTM E140, Pressure vessel thickness)
- **Sprint C** — Compare panel gains a third view mode: Goodman diagram (σ_m vs σ_a SVG, per-alloy Goodman/Soderberg lines, user design point, SF table)

## R66 — Guide depth pass
- **Sprint A** — sticky search bar in Guide header with 28 indexed entries + anchor scroll + ring highlight
- **Sprint B** — Ashby M derivation + Basquin/Goodman/Soderberg/Gerber + Euler-Bernoulli + Larson-Miller LMP + Arrhenius + Kt definition + 4 external-link cards (MIT OCW, DoITPoMS, NPTEL, eFatigue, MatWeb, Materials Project, NIST, ECCC, ASTM/ISO/ASME, vendors)
- **Sprint C** — Guide ↔ app feature-gap analysis (12 missing features identified)

## R65 — Guide learning depth (TOC 9 → 13)
- Hero adds a 7-step decision flowchart (Requirements → Family match → Ashby narrow → Compare → Verify → Prototype → Certify) with chapter anchors
- New Ch.3 "Family mapping + environment" (10 domains → families, 10 environments → suitable/avoid alloys)
- Ch.5 appends Safety Factor handbook (9 industries 1.5–12, 7 condition multipliers)
- New Ch.9 "10 common design mistakes" (KIC ignored, AM Z-fatigue, surface roughness, galvanic, notch, weldability, H-embrittlement, DBTT, CTE mismatch, confidence misuse)
- New Ch.11 "Certification · manufacturing · testing" (9 industry certifications, 7 process tables, 10 prototype tests E8/E23/E466/E399/etc)
- New Ch.12 "5 industry case studies" (F1 engine block, JWST mirror, SpaceX Raptor, Tesla giga press, drone+implant)
- Ch.13 (renumbered) adds datasheet base table (typical / minimum / A-basis / B-basis / guaranteed minimum)

## R63 — Learning curve polish
- Onboarding gains Welcome step 0 with 3-stat illustration (1,040 alloys · Ashby · 16 scenarios)
- ScenarioDialog footer "default values" hint
- RadarChart Base label gets abbr tooltip
- Compare empty-columns animated hint
- MaterialDetail heat treatments switch to multi-line list

## R61 — Onboarding + Guide entry fork + contextual hints
- **Sprint A** — 5-step Onboarding with inline SVG illustrations + 5th-step quick-start (Bracket/Heatsink/Fatigue/Marine), header `?` button reopens
- **Sprint B** — Guide Hero 3-path CTA (5min Bracket / 30min Ashby / Reference), 6 popular tiles + "more 10" progressive disclosure, `F` symbol-glossary with dotted-underline abbr tooltip
- **Sprint C** — Ashby first-visit toast (filter/index/zoom), applied-preset banner "First candidate (N)" + "Compare (N)" next-action buttons, mobile Guide chapter collapsible

## R60 — Guide updates for Sprint 2-4 features
- Hero kbd hints, fuzzy examples, language/unit toggle mentions
- Bracket scenario steps mention bulk header checkbox + Radar/CSV/PNG
- Hightemp families add P91 Inconel 617 Incoloy 800H A286
- Fatigue notes σ_f ≈ k·σ_y, Pressure vessel notes KIC class fallback
- Ch.1 property dictionary adds HT glossary + confidence labels + fallback source labels

## Sprint 4 (R64-era) — Data + large features
- **C1** Fatigue endurance-limit family-typical fallback (Shigley 11 family k_typ rules) — 759 alloys filled (89.2% coverage)
- **C2** Fracture toughness KIC family-typical fallback (17 family patterns from ASM Vol.1·2 + MMPDS) — 3.8% → 82.2% coverage
- **C3** Elevated-temp + creep curves for P91, Inconel 617, Incoloy 800H added to supplementary
- **C6** Ashby Plotly scroll-zoom + double-click reset + Spike Lines
- **C7** Heat Treatment glossary (26 HT conditions: H900-H1150, SA, Aged, STA, Q&T, Normalized, Annealed, HIP, T6/T651/T7/T4, O, H-temper, Mill Annealed, β-annealed, SA+Aged, PH-Cu)

## Sprint 3 — Collections sort/search + keyboard + Scenario preview
- **B8** Collections recent/name/size cycle, search input at 5+, createdAt timestamp
- **B9** Global `/` Search focus and `?` Onboarding shortcuts, aria-label on Search input
- **B10** ScenarioDialog right panel shows "Filters to apply" list before Apply

## Sprint 2 — UI/UX critical
- **A2** Plotly mobile legend visibility (font 9 → 12, itemwidth 30)
- **A3** Fuzzy search (subsequence + separator strip)
- **A4** Family Tree 3-tier mobile tap-friendly
- **A5** Compare radar with family color + lightness variant
- **A7** Recent searches dropdown
- **B1** First-visit Onboarding tour (localStorage flag)
- **B3** RadarChart vertex SVG title tooltip

## Sprint 1 — Data integrity
- **A1** aliasesFor() sub-token regex (H13, M2, D2, 17-4 PH, AA xxxx, etc)
- **A6** RadarChart Base indicator
- **B2** Anomaly per-family σy/UTS ratio detection
- **B6** `verify:urls` script (51.4% verified-URL coverage)
- **B7** Cost data provenance section

## R54 — Production TDZ regression hunt
- **R54a** Ashby production `Cannot access 'U0' before initialization` — xMetaForHover/yMetaForHover moved before markerTraces use
- **R54b** xMeta alias removed entirely (single-declaration policy committed to memory)

## R45-R53 — Foundations
- R45 Range slider, R46 Header counts, R48a Anomaly detection, R49a Dark mode removed (permanent),
  R49b URL share auto-sync, R49c Mobile search, R49d Verified URL coverage,
  R50a Alloy data 940 → 1000+, R50c Ashby interactions, R50d Compare CSV/PNG,
  R51a Non-structural ceramics removed, R51b Filter range narrowing (leave-one-out),
  R52a Misclassification fix (Aluminum in Stainless Steel), R53a RadarChart component.
