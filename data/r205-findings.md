# R205 — DB 신뢰성 전수 Audit Findings (진행중)

검토 방식: 단일 에이전트 순차 검토. 정성 (machinability/weldability/corrosion/HT) + 정량 (ρ/σy/UTS/El/E/HV/k/CTE/Tmax/Tm) 전부.
Reference 기준: ASM Handbook Vol.1/2/4/6/13 · MMPDS-08 · AWS D1.1 · Machining Data Handbook (AISI 1212=100%) · vendor datasheets (EOS/Carpenter/Special Metals/Haynes/Outokumpu).

---

## 유형 A — 분류 오류 (subcategory misclassification)

- **A1. AISI 4130/4140/4150/4340 (generic, ~20 entries)** — subcategory 가 "Stainless Steel - Austenitic/Ferritic-Martensitic" 으로 잘못 분류. 실제: Alloy Steel (Cr-Mo / Cr-Ni-Mo low-alloy). CSV 원본 오류. → subcategory override 필요. [ref: SAE J404]
- **A2. Invar 36 (Fe-36Ni, curated AM)** — subcategory "Stainless Steel - Austenitic". Invar 는 Cr 없음 — stainless 아님. → 'Nickel Alloy - Low CTE' 또는 'Specialty Fe-Ni'. [ref: ASTM F1684]

## 유형 B — 물리적 불가능 수치 (column-shift mock)

- **B1. KS/JIS 강재 ~44 entries — thermal_conductivity 에 피로강도 값** (122–594 W/mK; 강은 25–50 이어야).
  패턴 확인: SUP9 k=553 (스프링강 σf ≈550), SUP10 k=594, TWIP1180 k=531, SD700 k=383, SM490 k=248...
  대상: SHN275/355/420/460, SD400~700 (+W/S variants), SM275A~SM570, SS275/315, SAPH440, SPFH590, SHP275W/355W/450W, SGCC, SGC400, STK490, STKM13B, SG325, SPA-H, Zn-Mg-Al coated, API 5L X70/X80, TWIP1180, SUP9/SUP10, SK85.
  → supplementary-materials.json 의 points column 작성 오류. k 를 family typical (탄소강 ~45–52, HSLA ~40–50, 스프링강 ~40) 로 정정 + fatigue 별도 확인. [ref: ASM Vol.1 — carbon steel k ≈ 45–52 W/mK]
- **B2. AISI 304L/STS304L k=245 · 316L/STS316L k=236 · STS304ULC k=248** — austenitic 실제 k ≈ 16. 같은 column-shift. [ref: AK Steel 304/316 datasheet k=16.2]
- **B3. ASTM A553 9% Ni k=306** — 실제 ≈ 27 W/mK. [ref: ArcelorMittal 9Ni datasheet]
- **B4. CGO 방향성 전기강판 k=153** — 3.2% Si 강 실제 ≈ 18–20 W/mK. [ref: POSCO CGO datasheet]

## 유형 C — Condition 간 차별 소실 (R199/R201 override 부작용 포함)

- **C1. AISI 304/304L/310/316/321/347 (generic, 각 4 cond)** — Annealed = As-cast = Strain-hardened = As-supplied 전부 동일 (σy 205/UTS 515). R199 override regex '^AISI 304 ' 가 모든 condition flatten. Strain-hardened 는 1/4H 급 (σy ≥515) 이어야. → per-condition override 로 세분화. [ref: ASTM A666 — 301/304 1/4H σy 515 min]
- **C2. AISI 440C (generic, 6 cond)** — 전부 480/760/HV260 (annealed 값). Q+T 는 σy ~1900 / UTS ~1960 / HV 580–600 (HRC 60). R201 '^AISI 440C ' override 가 Q+T 까지 덮음. [ref: ASM Vol.1 — 440C Q+T HRC 58-60]
- **C3. AISI 405/410/430/434 (generic)** — 4 alloys 의 annealed 가 동일 mock (242/365.2/18.6/HV164.6). UTS 365 는 모든 해당 grade min spec (415–480) 미달 + alloy 구분 없음. → 405: σy 275/UTS 480, 410: 275/515, 430: 310/520, 434: 365/530. [ref: ASTM A240]

## 유형 D — 정성 등급 오류

- **D1. 416 stainless mach=Fair → Excellent** — 416 은 free-machining martensitic (rating ~85%, 전체 stainless 중 최고). [ref: Machining Data Handbook · Carpenter 416 datasheet]
- **D2. AISI 317/317L corrosion=Outstanding → Excellent** — Outstanding 은 6Mo super-austenitic (254SMO/AL-6XN)/C-276 급 전용. 317 (3–4% Mo) 은 Excellent. [ref: ASM Vol.13B]
- **D3. AISI 4340 weld=Fair → Poor** — CE(IIW) ≈ 0.8, preheat+PWHT 필수, HAZ crack 위험. [ref: AWS D1.1 CE 기준]
- **D4. AISI 4130 weld=Excellent → Good** — 4130 은 용접 가능 (chromoly tube) 하나 preheat 권장 (CE ~0.55). Excellent 과대. [ref: AWS / Lincoln Electric chromoly guide]
- **D5. AISI 4150 Annealed mach=Excellent + weld=Good (다른 condition 은 Fair/Fair)** — base 내 불일치 + 과대 (4150 rating ~40%). [ref: Machining Data Handbook]

## 유형 E — AM vendor 값 의심

- **E1. CX (PH Tool Stainless) As-built σy 1600/UTS 1700** — EOS CX datasheet: as-built ~1050/1150, **aged** 가 1590/1760. As-built entry 에 aged 값. [ref: EOS StainlessSteel CX Material Data Sheet]

### B1 원인 확정 (steel 검토 중)
k 이상값 = **0.45 × UTS** 와 정확히 일치 (SUP9 553=0.45×1230, SD700 383=0.45×850, TWIP 531=0.45×1180, A553 306=0.45×680, SM490 248=0.45×550...).
→ Fe-family fatigue 유도 (σf≈0.45·UTS) 가 **thermal_conductivity 칼럼에 잘못 기록되는 build bug**. KS/JIS 계열 supplementary entries (~47개) 전부 해당. build-materials.mjs 의 fatigue fallback 또는 supplementary loader 의 property mapping 버그 — 수정 시 코드에서 원인 제거 + k 를 family typical 로 재생성.

## 유형 C (계속) — Steel generic tier

- **C4. 10xx/41xx/51xx generic 'conditions' = 합성 multiplier (±10%)** — Annealed/As-cast/Strain-hardened/As-supplied/Q+T 가 한 base 값의 0.9–1.1× 파생. 경화능 있는 강 (1040+) 의 Q+T 값이 실제보다 크게 낮음:
  · 1040 Q+T 313/571 → 실제 ~590/860 [ASM Vol.1]
  · 1050 Q+T 369/631 → ~580/830
  · 1080 Q+T 571/778 → ~700/980
  · 1095 Q+T 626/859 → ~770/1100
  · 5130 Q+T 419/566 → ~790/940
  · "As-cast / forged (Wrought)" 조건명 자체가 모순 (wrought 인데 as-cast).
- **C5. AISI 5140 Annealed σy 625/UTS 880** — annealed 실제 ~290/570 (DB 값은 Q+T 급). 방향 반전. [ASM Vol.1]
- **C6. AISI 1020 As-cast σy 225 < Annealed 350** — R201 override 가 Annealed/Strain-hardened 만 정정, 나머지 condition 은 낮은 mock 잔존 → base 내 방향 모순.
- **C7. AISI 6150 — As-cast/As-supplied σy 480 인데 HV 341/344 잔존** (HV 341 ≈ σy 1100 상당). R201 override 가 σy/UTS 만 정정, HV 미정정.
- **C8. D2 — As-supplied (generic) σy 1325/UTS 1589/El 1.9/HV 451** — annealed (480/760/HV220) 도 hardened (1900/2100/HV650) 도 아닌 mid-mock.
- **C9. O1 — As-supplied (generic) 825/1056/HV336** — 동일 mid-mock 패턴 (annealed ~400/655/HV190).
- **C10. H11 — As-supplied (generic) 960/1248/HV365** — 동일 (annealed ~400/760/HV210).
- **C11. SK85 — Q+T (full hard) σy 580/UTS 800 인데 HV=800** — HV 는 full-hard (HRC64), σy/UTS 는 annealed 값. 같은 entry 안에서 condition 혼합. σy ~1700/UTS ~2000 이어야. [JIS G 4401]

## 유형 D (계속) — Steel 정성 등급

- **D6. 12L14 weld=Excellent → Poor** — Pb+S 첨가 free-machining: 용접 hot-crack 최악. 방향 반전 CRITICAL. [AWS — leaded steel 용접 비권장]
- **D7. AISI 1095 mach=Excellent → Fair, weld=Excellent → Poor** — 0.95%C 고탄소: rating ~45%, 용접균열 위험 높음. 둘 다 2단계+ 오류. [Machining Data Handbook · AWS]
- **D8. S55C weld=Excellent → Fair(-Poor)** — 0.55%C, CE 높음, preheat 필요. S35C weld=Excellent → Good(-Fair). [AWS D1.1 CE 기준]
- **D9. S55C mach=Excellent → Good** — 중탄소 ~45-55%.
- **D10. Grade 91 (P91) weld=Excellent → Poor** — Type IV cracking, 엄격한 preheat/PWHT 필수 — 발전소 용접 난이도 대표 강종. mach=Excellent → Good. CRITICAL. [EPRI P91 welding guideline]
- **D11. TWIP1180 corr=Excellent → Poor** — 고 Mn TWIP 강은 일반 탄소강보다 부식 취약. 방향 반전 CRITICAL. [POSCO TWIP 기술자료]
- **D12. TWIP1180 weld=Good → Fair** — Zn 도금시 LME, 편석 문제. [minor]
- **D13. 22MnB5 hot-stamped corr=Excellent → Moderate** — AlSi 코팅은 스탬핑 산화 방지용이지 service 내식성 아님. [ArcelorMittal Usibor 자료]
- **D14. SA508 Gr.3 — condition 간 corr Excellent vs Poor 불일치** — RPV 강은 Poor (내면 stainless clad 사용). 한 condition 만 Excellent = 오류.
- **D15. SD600/SD700 고강도 철근 weld=Excellent → Fair** — CE 높아 용접 제한 (KS D 3504 도 용접용은 W-suffix 별도). [minor]
- **D16. 1015/1025/1030 — Annealed 만 corr=Excellent (타 condition Poor)** — 탄소강 corr 은 모두 Poor. condition 간 불일치 mock.
- **D17. AISI 1010~1030 mach=Excellent → Good** — 저탄소 연질 (gummy) ~55%. [minor, Machining Data Handbook]

## 유형 E (계속) — 의심 수치

- **E2. CPM 3V ρ=7.46** → Crucible datasheet 7.85 g/cm³ 부근. 확인 필요. [Crucible CPM 3V datasheet]
- **E3. Stainless Steel 420 (martensitic) — Hardened: σy/UTS/El 모두 null (HV 만 588)** — 데이터 누락.
- **E4. "Stainless Steel 415/420" 가 steel (non-stainless) subcategory 로 분류** — A1 과 유사 분류 오류.
- **E5. AISI 1144 중복 base**: "AISI 1144 Stressproof" (3 cond) + "AISI 1144 (Stressproof)" (1 cond, UTS 690 vs 760 불일치).

## 유형 C (계속) — Al/Ti/Ni flatten & synthetic

- **C12. AA 2011/2017/2025/7050/6101/6262 — 'Annealed' 가 T6급 값** (synthetic ±4% multiplier). 2011-O 실제 σy ~97/UTS 165 (DB 329/451). 7050-O σy ~105-150 (DB 421). 6101-O σy ~28 (DB 226). [Aluminum Association Teal Sheets]
- **C13. AA 3003/3004/3005/3105 — Strain-hardened ≈ Annealed (±3%)** — H14/H18 실제 σy 117-186 인데 DB 38-121 (O 급). [AA Teal Sheets]
- **C14. Inconel X-750 — 5 conditions 동일 (815/1230)** — Annealed 실제 σy ~370/UTS 850. [Special Metals SMC-067]
- **C15. Monel 400 / Hastelloy C-276 / Inconel 600 — 4 conditions 동일 (annealed 값)** — R201 override 부작용. Strain-hardened 차별값 필요 (Monel 400 CW σy ~585). [Special Metals SMC-053]
- **C16. Ti Grade 1/3/4 — Grade 2 값 (275/345) 으로 동일 flatten** — R201 '^Ti Grade [1-4]' 부작용. 실제: Gr1 170/240, Gr3 380/450, Gr4 480/550. [ASTM B265]
- **C17. Ti Grade 23 generic 5 conds — σy 261-300/UTS 361-414** — Grade 23 = Ti-6Al-4V ELI (σy 790+/UTS 860+)! CP-Ti 값이 들어감. CRITICAL. [ASTM F136]
- **C18. Ti-5-2-5/6-2-4-6/8-1-1 — σy/UTS flatten (950/1050) + HV mock (294-392) 잔존 + Ti-6-2-4-6 2 conds 만 mach=Exce/corr=Good 불일치**

## 유형 D (계속) — Al/Cu/Ni/폴리머 정성 등급

- **D18. AA 2011 weld=Good → Poor** — Pb-Bi free-machining, Al 중 용접성 최악. 방향 반전. [AWS / AA]
- **D19. AA 2017/2025 weld=Good → Poor** — Al-Cu hot-crack family. [AA]
- **D20. AA 1050/1100/1200/3004/3005/3105 mach=Excellent → Fair** — 연질 gummy Al (AA rating D-E). 1xxx 가 6061-T6 보다 절삭 어려움. [Machining Data Handbook — Al ratings]
- **D21. C44300 (Admiralty Brass) corr=Poor → Excellent** — 해수 콘덴서 전용 합금 (As 첨가 dezinc 억제). 방향 반전 CRITICAL. [CDA]
- **D22. C12000 mach=Excellent → Poor** — DLP 순동 gummy (~20%). C11000 은 Good 으로 또 불일치 (같은 순동인데). [CDA]
- **D23. C14500 (Te-Cu) mach=Good → Excellent** — Te 첨가 free-machining copper (85-90%). 방향 반전. [CDA C14500]
- **D24. C26000/C27000/C28000/Naval C46400 mach=Excellent → Fair** — 비연 황동 ~30%. [Machining Data Handbook]
- **D25. C36000 weld=Fair → Poor** — Pb 3%. [CDA]
- **D26. C65500 (Si Bronze) weld=Fair → Excellent** — Cu 합금 중 용접성 최고 (filler 로 쓰임). 2단계. [CDA welding guide]
- **D27. 순동 (C11000/OFHC/C10200/C12200 등 12+ entries) mach=Good → Poor-Fair** — gummy ~20%. [MDH]
- **D28. Waspaloy weld=Fair → Poor / Inconel 713C weld=Fair → Poor** — strain-age cracking / 비용접 cast γ'. [ASM Vol.6]
- **D29. CP-Nickel vs Nickel 200 — 같은 재료인데 mach Fair/Poor + weld Exce/Fair 불일치** (Ni 200 weld=Good 권장). [Special Metals]
- **D30. 폴리머 corr=Excellent 일괄 (133 entries)** — PC/PMMA/ABS/PS 는 용제 취약 → Moderate, Nylon 흡습 → Good, PTFE/PFA → Outstanding 차별화 필요. [Plastics Design Library — Chemical Resistance]
- **D31. 폴리머 weld=N/A 일괄** — thermoplastic 은 융착 Good (PE/PP/ABS/PC), thermoset/PTFE 만 N/A 가 맞음. 정책 결정 필요. [AWS G1.10]
- **D32. TPU/TPE/Silicone/EVA mach=Good → Poor** — elastomer 절삭 곤란. [minor]
- **D33. ZTA (세라믹) mach=Excellent + weld=Excellent → Very Poor / N/A** — 세라믹에 정반대 등급. 유일하게 rating 있는 세라믹이 잘못된 값. [CoorsTek]
- **D34. 세라믹 38 + 복합재 mach/weld = null** — 'Very Poor (연삭)' / 'N/A' 일괄 부여 권장 (Macor 만 mach=Good). [데이터 완결성]

## 유형 E (계속) — 수치 오류

- **E6. Haynes 230 HV 88-105** — 실제 HV ~210-230 (HRB 95 를 HV 로 오기). 4 entries. [Haynes 230 datasheet]
- **E7. CP-Nickel Tmax=900/800** — Ni 200 한계 315°C (graphitization), Ni 201 이 600°C. [ASTM B162 / Special Metals]
- **E8. Incoloy 901 Tmax=1100 → ~600** — γ' 합금 (718 급). [Special Metals]
- **E9. Incoloy 925 Tmax=1100 → ~540** — γ' Ni-Fe-Cr. [Special Metals 925]
- **E10. Elgiloy Tmax=1000 → ~450** — spring 합금 (850°F). [Elgiloy Specialty Metals]
- **E11. MP159 Tmax=425 → ~595** — 595°C 설계 합금. [Carpenter MP159]
- **E12. Ti Grade 1/3/7 — condition 별 Tmax 170 vs 300 불일치** (CP Ti ~315-425 가 맞음).
- **E13. Ti-6242 wrought Tmax=315 → 480-540** — 고온 Ti 대표 (AM entry 는 540 ✓). [TIMET 6242]
- **E14. 'OF Copper C10200' σy 330/El 45 + 'DHP C12200' 320/45 + 'Commercial Bronze C22000' 300/45** — hard temper σy + annealed El 혼합 mock (KS 4-condition 세트는 정상 — 단일 entries 만 오류).
- **E15. Phosphor Bronze C51000 σy 350/UTS 450/El 30** — annealed (130-160) 도 H (552+) 도 아닌 mid-mock.
- **E16. Be-Cu As-supplied σy 1258/UTS 1392** — C17200 spec max (TH04 1050/1235) 초과. [Materion]
- **E17. Niobium-1Zr E=69 → 105** + 'Nb-1Zr As-supplied' σy 432/528 (annealed 실제 ~150/275) 중복·모순.
- **E18. Niobium As-supplied σy 365/432 → annealed ~105-195/275.** Vanadium 730/864 → ~340-380/450-480. (generic 합성 multiplier)
- **E19. UHMWPE Dyneema composite σy/UTS 3700** — 섬유 단독값. UD laminate ~1100-1500. [DSM Dyneema]
- **E20. PAI (Torlon) Tmax=90 → 260** / **Polyimide (Vespel) Tmax=90 → 288** (Vespel SP-1 entry 는 290 ✓) / **LCP ×2 Tmax=90 → 220-240** / **PSU/PPSU 일부 90 → 150-180** / **ETFE 90 → 150** / **PBT 90 → 120-140** / **PCL Tmax=90 > Tm 60 (불가능) → ~45**. [vendor datasheets]
- **E21. 'Ultem 1010 (PEI) — Injection-Molded' Tmax=540** — R173 잔존 (PEI 200). + 같은 base 의 'ULTEM 1010 (PEI)' / 'Industrial Grade' 2 entries 는 corr=Poor + weld=Exce (PEI 는 corr Good + 폴리머 weld 정책 위반). 3 entries 모두 정리 필요.
- **E22. PA46 'Stanyl — Dry as-molded' Tmax=110 vs 별도 PA46 entry 170 — 불일치 (170 이 맞음).**
- **E23. AA 6101 k=167 → ~218** (전기 bus bar 합금, 57% IACS). [AA]
- **E24. Ti CP Gr2 Heat-Treated HV=5** — 불가능 (~160-200). 1 entry.
- **E25. AZ91D/AZ80A/H11 corr='Fair'** — corrosion scale (Poor/Moderate/Good/Exce/Outstanding) 위반 3건 → Moderate.
- **E26. 'Stainless Steel 420 — Hardened' σy/UTS/El null (HV만 588)** — 누락.
- **E27. AISI 1015/1025/1030 'Annealed' 만 corr=Excellent (타 cond Poor)** — 탄소강 corr=Poor 일괄이어야.

## 유형 F — 계산식/코드 로직 (welding-machinability.ts)

- **F1. ✓ CE_IIW/CET/Pcm/Schaeffler 공식 모두 표준과 일치** (IIW Doc / EN 1011-2 / Ito-Bessyo / Schaeffler 1949). 문제 없음.
- **F2. CRITICAL: stainless 에 CE_IIW/CET/Pcm 적용** — subcategory 필터가 Al/Cu/Ti/Ni 만 제외, stainless 는 통과 → 304 의 CE_IIW ≈ 4.3 → "위험, preheat 200-300°C" 오표시. CE 식은 C-Mn/low-alloy 전용. stainless/maraging 은 Schaeffler 만 적용해야. [AWS D1.1 적용범위]
- **F3. 주석/기준 오류: 'AISI 1018 = 100% baseline'** — 표준 baseline 은 AISI 1212=100% (1018 은 ~70%). MACHINABILITY 테이블 '1018|1020 → 100' 도 동반 오류 (→ 70).
- **F4. MACHINABILITY 테이블**: 비연 brass 80 → ~30 (C26000) · 순동 70 → ~20 · Al 1xxx 90 > 6xxx 70 순위 역전 (1xxx 가 더 어려움) · refractory 일괄 18 (W ~5, Ta ~45, Mo ~35 차별 필요). [Machining Data Handbook]
- **F5. htGlossaryFor partial-match 의 'sta' 키** — 'STA (Solution...' 로 시작하는 718/Ti 외 합금 HT 문자열이 'Ti 합금 표준 강화 조건' 설명으로 오표시. appliesTo 미활용.
- **F6. ht-glossary 'T7' 설명 "응력부식 ↑"** — over-aging 은 SCC **저항** ↑ 인데 위험 증가로 오독되는 표현 → "내응력부식성 ↑".
- **F7. ht-glossary H-temper 키 h14/h18/h22/h32 만** — DB 의 H19/H321/H116/H34/H111 미커버 (tooltip 누락).
- **F8. ht-alloy-specific: Inconel 718 pattern 이 718Plus 도 매칭** — 718Plus 의 aging (788+704°C) 과 다른 718 cycle (720+620) 설명 표시. negative lookahead 필요.
- **F9. ht-alloy-specific: A553 pattern /9\s?%?\s?ni|9ni/ 가 'HP 9-4-30 (9Ni-4Co)' 매칭** — landing gear 강에 LNG 탱크 설명.
- **F10. ht-alloy-specific A553 'DN+T 770/645/580°C'** — 실제 DNT: 1차 normalize ~900°C, 2차 ~790°C, temper 565-605°C. 현 수치는 QLT (800/650/570) 에 가까운데 DN+T 로 명명 — 명칭·온도 mismatch. [ASTM A553 / ArcelorMittal 9Ni]
- **F11. H13 'Q+T 1010-1020°C / OQ'** — H13 은 air-hardening (AQ 표준). OQ 표기 부정확. [ASM Vol.4]
- **F12. ht-alloy-specific 718 'solution treated σy 770'** — annealed 718 실제 ~480-550. DB entry (450) 와도 모순. [AMS 5663]
- **F13. ht-alloy-specific 6061 T6 title '(160°C aged)' vs process '175°C/8h'** — 내부 불일치 (175 가 표준).
- **F14. Stellite 6 source 'ASTM A638'** — A638 은 A286 spec. Stellite 는 AMS 5387 등. 인용 오류.

## 유형 G — 중복 base entries (통합/정리 대상)

- G1. AISI 1144: "AISI 1144 Stressproof" + "AISI 1144 (Stressproof)" (UTS 760 vs 690 모순)
- G2. AA 5454: 3 sets ("AA 5454 (marine)" 4cond + "AA 5454" 단일 + "AA 5454 — Annealed/H32" 2cond)
- G3. AA 6463: "(architectural extrusion)" + 단일
- G4. 718Plus: "Inconel 718Plus" (Tmax 700 ✓) + "Allvac 718Plus" (Tmax 900 ✗ → 704)
- G5. Invar 36: 3 bases (AM + FeNi36 + Wrought) — 값 일관 ✓, 통합 여부만
- G6. C95400: "C95400 Aluminum Bronze" + "Bronze C95400 — Cast" (σy 205 vs 240)
- G7. C-103: 3 bases (AM/단일/wrought) — 값 적절 차별 ✓ 유지 가능
- G8. Nb-1Zr: "Nb-1Zr As-supplied" (mock) + "Niobium-1Zr" (E 오류) — 통합 + 정정
- G9. Be-Cu (Beryllium Alloy 분류) vs C17200/BeCu C17200 — 3 bases, 값 모순 (E16)
- G10. Haynes 230: AM 3cond + 단일 wrought — HV 만 공통 오류 (E6)
- G11. "Stainless Steel 415/420" — steel subcategory 로 분류된 stainless (A1 유사)

## 통계 요약

| 유형 | 건수 (entries 영향) | Critical |
|------|--------------------|----------|
| A. 분류 오류 | 4 base (~25 entries) | A1 |
| B. k column-shift (build bug) | ~47 entries | 전체 |
| C. condition flatten/synthetic | ~20 base (~80 entries) | C2, C17 |
| D. 정성 등급 오류 | ~35 base + 폴리머 일괄 133 | D1,6,7,10,11,21,22,33 |
| E. 수치 오류 | ~30 entries | E6,19,20,21,24 |
| F. 코드 로직 | 14건 | F2 |
| G. 중복 | 11 base | — |

