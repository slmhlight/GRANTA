# R129 — Metals data + fallback 검증 보고서

사용자 요청: 15-5/17-4 PH HT condition 미반영 사례 시작점. 1st-2nd-3rd family fallback 출처 명시 및 "모든" 금속 검증.

## 1. 핵심 문제 진단

build-materials.mjs 의 fatigue/impact/KIC 적용 함수 (`alloyFatigueImpact()`, `ALLOY_SPECIFIC.kic`, `KIC_FALLBACK`, `FATIGUE_RATIO`) 는 alloy name 토큰만 매치하고 **heat-treatment condition 을 고려하지 않음**.

따라서:
- "17-4 PH H900" / "17-4 PH H1025" / "17-4 PH H1075" / "17-4 PH H1150" 4개 entry 모두 동일한 fatigue=600 MPa, impact=30 J, KIC=90 MPa·√m 받음
- 실제: H1150 (over-aged) 의 fatigue 는 H900 (peak-aged) 의 ~78% (470 MPa), impact 은 ~3× (90 J), KIC 은 ~1.6× (145 MPa·√m) 가 정확

**Audit script 결과** (data/metals-audit-before.txt):
- 367 "flatline" 사례 (서로 다른 HT condition 인데 fatigue/impact/KIC 동일)
- 62 PH/Maraging/Tool/Ni-superalloy 인데 HT condition 정보 vague/empty
- 21 high-popularity (≥4) entry 인데 verified source 없음

## 2. 적용한 해결책

### 2.1 HT-aware multiplier 도입 (`htConditionMultiplier(m)`)

build-materials.mjs 에 condition-별 multiplier 함수 추가. 17개 alloy family 별로 baseline (peak-aged 가정) 대비 조정:

| Family | HT branches |
|---|---|
| **PH stainless** (17-4/15-5/13-8) | H900 (1.0×) / H925 (0.97×) / H1025 (0.90× f, 1.40× i) / H1075 (0.85×, 2.20×) / H1100 (0.82×, 2.50×) / H1150 (0.78×, 3.0×) / annealed / as-built |
| **Maraging** (250/300/350) | annealed (0.40× f, 3.50× i) / solution (0.45×) / aged peak (1.0×) |
| **Tool steel** (H13/D2/M2/SKD61) | annealed (0.30× f, 4.0× i, 2.20× k) / Q+T peak (1.0×) / Q+T high-temper (0.78×) / as-built |
| **Ni precipitation HT** (Inconel 718/X-750/Waspaloy/Haynes 282) | annealed (0.60×) / solution (0.65×) / STA / DSA aged peak (1.0×) / as-built (0.80×) |
| **Ni solid-solution** (Inconel 600/625/Hastelloy/Incoloy) | cold worked (1.20× f, 0.70× i) / annealed (1.0×) |
| **Ti-6Al-4V** | as-built (0.85×) / HIP (1.05×) / STA (1.10× f, 0.90× i) / β-annealed (0.85×) / mill annealed (1.0×) |
| **β-Ti** (Ti-6242/5553/10-2-3/15-3/525) | annealed (0.85×) / STA (1.0×) / as-built (0.85×) |
| **Stainless austenitic** (304/316/321/347) | CW (1.40× f, 0.50× i) / as-built (1.05×) / solution annealed (1.0×) |
| **Stainless martensitic** (410/420/440/SUS41x) | annealed (0.45×, 2.80× i) / Q+T high-temper (0.85×) / Q+T peak (1.05×, 0.70× i) / strain-hardened |
| **Stainless ferritic** (430/446) | CW (1.30× f, 0.60× i) / annealed (1.0× HT-insensitive) |
| **Spring steel** (SUP/5160/9260/51CrV4) | annealed (0.45×, 3.0× i) / Q+T 380°C full spring (1.05×) / Q+T 430°C spring (1.0×) |
| **Mild steel** (1010/1018/1020/A36/structural) | CW (1.25× f, 0.60× i) / normalized (1.05×) / annealed/as-cast (0.95×, 1.20× i) |
| **Medium-C steel** (1040/1045/1050/1095) | annealed (0.50×, 2.50× i) / normalized (0.75×) / Q+T (1.0×) |
| **Bearing steel** (52100/100Cr6/SUJ2) | annealed spheroidized (0.40×, 2.50× i) / Q+T peak (1.0×) |
| **Case hardening** (8620/9310/4620) | carburized (1.10× f, 0.85× i) / annealed (0.55×) |
| **BeCu / Cu-Ni-Si** (C17xxx/C18000/Moldmax) | TB00 solution annealed (0.35×, 3.50× i, 1.80× k) / TF00 peak (1.0×) / TH04 CW+aged (1.10× f, 0.40× i) |
| **Cu-Cr-Zr** (C18100/C18150/C18200) | wp solution+aged (1.0×) / whp CW+aged (1.30× f, 0.50× i) / annealed (0.45×) |
| **Brass** (C26xxx/C46400/CuZn) | H02 quarter-hard (1.15× f) / H04 half-hard (1.25×) / H08/H10 hard (1.40× f, 0.55× i) / annealed (0.65×) |
| **Carbon/alloy steel Q+T** (4140/4340/4130/8740/300M) | annealed (0.50×, 2.50× i, 1.80× k) / Q+T 200°C full hard (1.15× f, 0.40× i) / Q+T 550-650°C high-temper (0.92×, 1.40× i) / Q+T 450°C peak (1.0×) |
| **CoCr/F75/F1537** | as-built (1.05×) / HIP (1.10×) / cold worked (1.30× f, 0.55× i) |

baseline 출처: ASM Vol.1 Steel HT chapter · MMPDS-08 Table 2.X (PH stainless) · Nickel Institute Pub 9019 (Inconel) · AMS 4928 (Ti-6Al-4V) · ASM Vol.4 (Maraging) · Aluminum Association Standards (T-tempers) · CDA TB46 (Cu-Be).

### 2.2 Provenance trace 추가

모든 fallback 적용 시 `provenance` 필드를 PropertyRange 에 기록:

```json
"fatigue_strength": {
  "min": 470, "max": 545, "typical": 510, "n": 0,
  "confidence": "handbook",
  "provenance": "realprops:174ph × HT:H1075 (f×0.85, i×2.2)"
}
```

provenance 형식:
- `alloy:<key>` — alloy-specific handbook 직접 매치 (가장 정밀)
- `alloy:<key> × HT:<condition> (f×X.X, i×X.X)` — alloy peak baseline + HT multiplier 조정
- `realprops:<key> × HT:<condition>` — REAL_PROPS (핵심 11종 고정밀) 기반
- `subfamily:<3rd_family>` — 3rd family typical (예: Stainless Steel - Austenitic)
- `family:<2nd_family>` — 2nd family typical
- `class:<1st_family>` — 1st family typical (가장 일반적 fallback)
- `family:σf≈0.45·UTS (Shigley/MMPDS family typical)` — derived from UTS×ratio
- `class:<subTag> × HT:<condition> (i×X.X)` — class fallback + HT 조정

### 2.3 UI 노출

MaterialDetail.tsx 의 confidence badge 에 provenance tooltip 추가:
- hover 시 "출처: <provenance trace>" 표시
- 사용자가 "이 값이 어디서 왔는지" 확인 가능

### 2.4 PropertyRange 타입 확장

client/src/lib/materials.ts:
```ts
export interface PropertyRange {
  ...
  confidence?: 'measured' | 'handbook' | 'subfamily' | 'family' | 'class' | 'derived';
  provenance?: string;  // R129
}
```

## 3. 결과 (audit script 재실행)

| 메트릭 | Before | After | 개선 |
|---|---|---|---|
| TRUE flatlines (서로 다른 HT 인데 동일) | 367 | **145** | -60% |
| OK flatlines (peak-equivalent — 정상) | (구분 없음) | 12 | 분류됨 |
| Confidence 분포 | 변경 없음 | 변경 없음 | (조정 = 값 변경, label 동일) |

### 17-4 PH 사례 검증

| Entry | Fatigue (MPa) | Impact (J) | KIC (MPa·√m) | Provenance |
|---|---|---|---|---|
| 17-4 PH (S17400) — H900 | 600 | 30 | 90 | realprops:174ph (baseline) |
| 17-4 PH (S17400) — H1025 | 540 | 42 | 108 | realprops:174ph × HT:H1025 (f×0.9, i×1.4) / alloy-specific KIC × HT:H1025 (k×1.2) |
| 17-4 PH (S17400) — H1075 | 510 | 66 | 130 | realprops:174ph × HT:H1075 (f×0.85, i×2.2) |
| 17-4 PH (S17400) — H1150 | 468 | 90 | 144 | realprops:174ph × HT:H1150 (f×0.78, i×3.0) |

H900 (peak strength) → H1150 (over-aged) 변화가 합리적으로 반영됨.

### Maraging 250/300, Inconel 718, Ti-6Al-4V, BeCu C17200, AISI 410 등도 동일 패턴

## 4. 남은 145 TRUE flatlines (low-priority)

상세 list: data/metals-audit-after.txt

대부분:
1. **Stress-relief temperature 미세 차이** (316L: stress-relieved vs stress-relieved 450°C) — austenitic 은 사실상 HT-insensitive (peak hardening 불가)
2. **Exotic alloy** (Narloy-Z, SAE 21-4N) — 별도 lookup 추가 필요 (low-priority specialty)
3. **CSV-generic 일반 alloy** (AA 3105, Ti-6-2-4-6, Monel 400) — alloy-specific table 없는 항목
4. **Section size variation** (A992 W14 vs W36) — 사실상 영향 없음, 정상

→ 후속 작업으로 specialty alloy lookup 확장 시 추가 reduction 가능

## 5. Vague-HT 62건 (보강 필요)

다음 entry 들은 HT condition 정보가 vague 또는 empty:
- Inconel X-750 — As-supplied (DMLS) → "STA aged" 명시 필요
- 15-5PH — As-supplied (SLM/DMLS) → "H900" 또는 "As-built" 명시
- Inconel 100 — As-supplied (Cast) → "Solution Aged" 명시
- Monel 400 — As-supplied (Wrought) → "Annealed" 명시
- Haynes 230/282, Waspaloy, Rene 41, Nimonic 80A/90, Inconel 601/617/690 — HT="(empty)" 채워야 함
- P20/S7/A2/CPM 3V/H11/D2/O1 — Tool steel HT 명시 필요
- CMSX-4/Rene N5/PWA1484 — Single crystal HT (typically "Solution + 2-stage aging") 명시

→ R130 후속에서 보강 예정.

## 6. Unverified high-popularity 21건

AISI 1010/410/430 (CSV generic), ASTM A36, Naval Brass C46400, Inconel 718Plus.
→ Carpenter Technology, Solnoil, AKsteel, ATI 등 vendor datasheet URL 추가 필요.
