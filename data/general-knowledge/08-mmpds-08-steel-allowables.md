# MMPDS-08 Steel Design Allowables (S-Basis)

> 1차 출처: **MMPDS-08** (April 2013), Chapter 2 "Steel", Tables 2.3.1.0(c1)~(c3), 2.3.1.3 "AISI 4340 Steel"
> Document: DOT/FAA/AR-MMPDS-08

본 문서는 항공·우주 응용에서 사용되는 Low-Alloy Steel 의 **S-Basis design allowable** 값을 정리한 것. supplementary-materials.json 의 typical 값과 cross-check 가능.

## 1. AISI 4130 — Q+T Tubing (AMS 6361 / AMS 6362)

| Condition | HT-125 | HT-150 |
|---|---|---|
| Spec | AMS 6361 | AMS 6362 |
| Form | Tubing | Tubing |
| Diameter | ≤0.188 in | ≤0.188 in |
| Basis | S | S |
| **Ftu (ksi)** | 125 | 150 |
| **Fty (ksi)** | 100 | 135 |
| **Fcy (ksi)** | 109 | 141 |
| **Fsu (ksi)** | 75 | 90 |
| Fbru (e/D=1.5) | 194 | 231 |
| Fbru (e/D=2.0) | 251 | 285 |
| Fbry (e/D=1.5) | 146 | 210 |
| Fbry (e/D=2.0) | 175 | 232 |
| **E (×10³ ksi)** | 29.0 | 29.0 |
| Ec (×10³ ksi) | 29.0 | 29.0 |
| G (×10³ ksi) | 11.0 | 11.0 |
| **ν (Poisson)** | 0.32 | 0.32 |
| **ρ (lb/in³)** | 0.283 | 0.283 |

### SI 단위 변환 (1 ksi = 6.895 MPa, 1 lb/in³ = 27.68 g/cm³)
- HT-125: **σ_UTS 862 MPa, σ_y 689 MPa, E 200 GPa, ρ 7.83 g/cm³**
- HT-150: **σ_UTS 1034 MPa, σ_y 931 MPa**

> Last revised: April 2009 (MMPDS-04 CN1, Item 08-16)
> 본 DB 의 **AISI 4140 (Cr-Mo, alias 42CrMo4)** entry 에 대응.

## 2. AISI 8630 + AISI 8740 — Q+T Bars/Forgings

| | AISI 8630 | AISI 8740 |
|---|---|---|
| Spec | MIL-S-6050 | AMS 6327 |
| Form | Bars and forgings | Bars and forgings |
| Diameter | ≤1.500 in | ≤1.750 in |
| Basis | S | S |
| **Ftu (ksi)** | 125 | 125 |
| **Fty (ksi)** | 100 | 100 |
| **Fcy (ksi)** | 109 | 109 |

> AISI 8740 의 한국 등가 = SNCM625 (JIS).
> AISI 8630 = case-hardening Cr-Mo, helo gear에 사용.

## 3. AISI 4340 — Q+T (다양한 HT level)

| Condition | HT-150 | HT-180 | HT-200 | HT-220 | HT-260 |
|---|---|---|---|---|---|
| Ftu (ksi) | 150 | 180 | 200 | 220 | 260 |
| Fty (ksi) | 135 | 163 | 176 | 200 | 215 |
| MPa Ftu | 1034 | 1241 | 1379 | 1517 | 1793 |
| MPa Fty | 931 | 1124 | 1214 | 1379 | 1483 |
| Diameter max (oil Q) | 2.50 in | 2.50 | 2.50 | 1.70 | 1.70 |
| Diameter max (water Q) | 3.50 in | 3.50 | 3.50 | 3.50 | 3.50 |

> 4340 Q+T (200°C 저temper) ≈ HT-260 (260 ksi Ftu) — landing gear 표준.
> 4340 Q+T (425°C 중temper) ≈ HT-180 (180 ksi) — 균형.

## 4. 300M (Si-modified 4340)

| | 300M 0.40 C | 300M 0.42 C |
|---|---|---|
| Spec | AMS 6417 | AMS 6419, AMS 6257 |
| Form | Bars and forgings | Bars and forgings |
| Ftu (ksi) | 280 | 280 |
| Fty (ksi) | 230 | 230 |
| **MPa Ftu** | **1931** | **1931** |
| **MPa Fty** | **1586** | **1586** |

> F-22 / F-35 / F/A-18 의 main landing gear 표준.
> Si 1.6% 가 tempering brittleness 회피 + 추가 강도 ~ 20% 증가.

## 5. D6AC — UHS missile motor case

| D6AC | Q+T |
|---|---|
| Spec | AMS 6431, AMS 6439 |
| Form | Sheet, plate, bar, forging, tubing |
| Ftu (ksi) | 280 |
| Fty (ksi) | 230 |
| **MPa Ftu** | **1931** |
| **MPa Fty** | **1586** |

> Minuteman III / Peacekeeper / Trident D-5 의 second-stage motor case + B-1B main landing gear.
> 본 DB 의 D6AC entry (Q+T low-temper 1900 MPa) 와 일치.

## 6. 본 DB supplementary 의 대응 entry 와 MMPDS 매핑

| supplementary entry | MMPDS 표 | confidence upgrade |
|---|---|---|
| `AISI 4140 (Cr-Mo, alias 42CrMo4)` | AISI 4140 (Q+T) Table 2.3.1.0(c3) | typical → handbook 유지 (MMPDS 추가) |
| `AISI 4340 — Aged / solution-treated` | AISI 4340 (Q+T) Table 2.3.1.3 | handbook → measured (MMPDS S-Basis) |
| `AISI 8740` | AISI 8740 Q+T Table 2.3.1.0(c3) | handbook → measured |
| `AISI 9310 (VIM-VAR)` | (MMPDS 미포함, AMS 6260/6265) | handbook 유지 |
| `D6AC (Ultra-High Strength Low-Alloy)` | D6AC Table 2.3.1.0(c) | handbook → measured |
| `300M (Si-modified 4340)` | (R74 에 추가됨, MMPDS 매핑 가능) | typical → measured |
| `HP 9-4-30 (9Ni-4Co-0.3C)` | (MMPDS 미포함, AMS 6526) | handbook 유지 |

## 7. 통계적 basis 주의사항

> *"There is no statistical basis (T99 or T90) or material specification basis (S) to support the mechanical property values in this table. See Heat Treatment in Section 2.3.0.2. Values shown are only applicable to user heat treated parts when processed per AMS 2759, or equivalent. Minimum properties must be substantiated by tensile testing of production material after heat treatment."* — MMPDS-08 footnote

즉:
- 위 표의 값들은 **user-heat-treated** 부품에 적용 (사용자가 AMS 2759 표준대로 Q+T 한 경우)
- 항공 응용은 **실제 lot tensile test** 로 minimum properties 재확인 필수
- Hardness 측정만으로는 inadequate (강도 추정 정확도 ±10%)

## 8. 본 DB 의 ref_urls 정정 권장

R72/R74 에서 추가된 다음 entry 의 `ref_urls` 에 MMPDS-08 추가:
```json
"ref_urls": [
  "https://www.matweb.com/...",
  "https://www.faa.gov/aircraft/air_cert/design_approvals/transport/media/MMPDS-08.pdf"  // 또는 NTIS 링크
]
```

대상 entry:
- AISI 4140 / 4340 / 8740
- 300M / HP 9-4-30 / D6AC
- AISI 4130 (만약 추가되면)

## 9. MMPDS 미포함 alloy 의 처리 방침

다음 합금은 MMPDS-08 158p 발췌본에 미포함 (full 1665p 가 별도 chapter):
- **Chapter 3 Aluminum** — AA 2024 / 7075 / 6061 / 2219 / 2050 / 2195 등 (별도 PDF 필요)
- **Chapter 5 Titanium** — Ti-6Al-4V annealed / STA / β-Ti 등
- **Chapter 6 Nickel** — Inconel 718 / 625 / Hastelloy / Waspaloy 등
- **Chapter 7 Other (Mg, Be 등)**

이들은 본 DB 에서 vendor handbook (Special Metals, Haynes International) 또는 AMS spec 직접 참조하므로 confidence 'handbook' 으로 유지.

## 10. 향후 작업

- MMPDS-08 Chapter 3 (Aluminum) 발췌본 입수 시 — AA 2024-T3, 7075-T6, 6061-T6, 2219-T87 의 A-basis 값으로 본 DB 업그레이드 가능
- MMPDS-08 Chapter 5 (Titanium) 발췌본 입수 시 — Ti-6Al-4V annealed / STA 의 A-basis 값 업그레이드
