# MMPDS Statistical Basis — A-Basis · B-Basis · S-Basis · Typical 설명

> 1차 출처: **MMPDS-08** (Metallic Materials Properties Development and Standardization, April 2013) Section 1.4.1.1 "Basis" and Chapter 9 "Statistical Methods"
> Document: DOT/FAA/AR-MMPDS-08 (Federal Aviation Administration)

## 1. 개념 — 왜 통계적 basis 가 필요한가

> "Requirements for adequate test data have been established to ensure a high degree of reliability for allowables published in this Handbook. Statistical analysis methods, provided in Chapter 9, are standardized and approved by all government regulatory agencies as well as MMPDS members from industry." — *MMPDS-08, §1.4.1*

일반 handbook 의 σ_UTS, σ_y 같은 값은 typical (대표값). 그러나 항공·우주 응용에서는:
- 비행기 한 대의 안전 = 그 alloy 의 **하한값** (최악의 lot 의 minimum)
- typical 값으로 설계하면 50% lot 가 spec 미달 → 비행 안전 위협

따라서 항공 표준은 **통계적 하한 (lower tolerance bound)** 을 정의:
- "99% 이상의 모집단이 이 값 이상이며, 신뢰도 95% 로 보증" 같은 statistical 진술
- 이게 **A-Basis** / **B-Basis** / **S-Basis** 의 정의 근거

## 2. 네 가지 basis 정의 (MMPDS-08 §1.4.1.1 그대로)

### A-Basis (T99 lower tolerance bound)
> *"The lower of either a statistically calculated T99 value, or the specification minimum (S-Basis). The T99 value indicates that at least 99 percent of the population is expected to equal or exceed it, with a confidence of 95 percent."*

- **모집단의 99% 이상 통과** + 신뢰도 95%
- 단일 load path 응용 (lug, lifting fitting 등 — 파괴 시 catastrophic) 에 사용
- 가장 보수적 (= 작은 값)
- "single load path applications (like lugs)" — MMPDS-08

### B-Basis (T90 lower tolerance bound)
> *"Based on the calculated T90, at least 90 percent of the population of values are expected to equal or exceed the B-Basis mechanical property allowable with a confidence of 95 percent."*

- **모집단의 90% 이상 통과** + 신뢰도 95%
- 다중 load path 응용 (skin, stringer, frame — 한 부재 파괴 후 load redistribution 가능) 에 사용
- A-Basis 보다 약간 큰 값 (덜 보수적)
- "redundant load path applications (like skins, stringers and frames)" — MMPDS-08

### S-Basis (Specification minimum)
> *"The S-value represents or is based on the minimum property value specified by the governing industry specification (as issued by standardization groups such as SAE Aerospace Materials Division, ASTM, etc.) or federal or military standards for the material."*

- ASTM, AMS, MIL-STD, AISI 같은 표준이 명시한 최소값
- 통계적 처리 없이 표준이 보증
- AMS 5662 의 Inconel 718 sheet 에 σ_UTS ≥ 1276 MPa 같은 spec — 이게 S-Basis
- A-Basis 와 거의 같지만, lot 들의 statistical T99 가 spec 보다 낮으면 **A = T99 (더 보수적)**, 높으면 **A = S-Basis**

### Typical (정보용 — 설계 미사용)
> *"Elongation and reduction of area design properties listed in room temperature property tables represent procurement specification minimum requirements and are designated as S-values. ... moduli, physical properties, creep properties, fatigue properties, and fracture toughness properties, are all typical values unless another basis is specifically indicated."*

- mean (평균) — 대표값
- E (modulus), ρ (density), α (CTE), k (thermal cond.), σ_f (fatigue), KIC 같은 보조 properties 는 모두 typical
- handbook 의 일반 σ_UTS, σ_y 도 별다른 표시 없으면 typical
- **단일 lot 의 50% 가 이 값 이하** — 항공 설계 직접 사용 금지

## 3. 통계적 의미 — Lower Tolerance Bound (LTB)

> "T99 and T90 are the local tolerance bounds, calculated for each lot of data."

T99, T90 의 의미:
- 모집단이 정규분포 N(μ, σ²) 라고 가정
- 표본 N 개로 표본평균 X̄, 표본표준편차 s 추정
- "k99" 또는 "k90" 라는 tolerance factor 사용해 lower bound 계산

```
T99 = X̄ - k99 × s   (모집단 99% 이상이 이 값 이상, 신뢰도 95%)
T90 = X̄ - k90 × s   (모집단 90% 이상이 이 값 이상, 신뢰도 95%)
```

k 값은 표본 크기 N 에 따라 변함:
- N = 10:  k99 ≈ 4.06,  k90 ≈ 2.355
- N = 30:  k99 ≈ 3.06,  k90 ≈ 1.92
- N = 100: k99 ≈ 2.68,  k90 ≈ 1.76
- N → ∞:  k99 → 2.326,  k90 → 1.282 (정규분포의 1-percentile / 10-percentile)

즉 **표본이 적을수록 더 보수적 (k 큼)** — 데이터 부족시 estimation 의 uncertainty 를 반영.

## 4. Basis 별 수치 예시 — Inconel 718 sheet (AMS 5596)

| basis | σ_UTS (ksi) | σ_y (ksi) | El (%) |
|---|---|---|---|
| Typical | ~200 | ~170 | ~20 |
| B-Basis | 185 | 150 | 12 |
| A-Basis | 180 | 145 | 12 |
| S-Basis (AMS 5596) | 180 | 145 | 12 |

> A 와 S 가 같을 때가 많음 — spec 이 statistical T99 보다 보수적이거나 동일하기 때문.

## 5. 어떤 값을 써야 하나?

| 상황 | 사용 basis |
|---|---|
| **상용 항공기 단일 load path (Lug, Lift Fitting, etc.)** | A-Basis (FAA 요구) |
| **상용 항공기 다중 load path (Skin, Stringer, Frame)** | B-Basis (FAA 허용) |
| **군용 항공기 (USAF, USN, USMC, US Army)** | A 또는 B (case-by-case, MIL-HDBK-5 후속) |
| **NASA / 우주 발사체 (1회 사용)** | A-Basis 또는 자체 lot release test |
| **자동차 · 일반 기계** | typical 또는 S-Basis (덜 엄격) |
| **본 DB 의 σ_y, σ_UTS 표시값** | typical (handbook 평균) — 설계 시 반드시 A/B-Basis 직접 계산 |

## 6. 한계 — Basis 가 적용 안 되는 경우

> *"Elongation and reduction of area design properties listed in room temperature property tables represent procurement specification minimum requirements and are designated as S-values."*

다음은 통계적 basis 가 정의되지 않음 (typical 만 제공):
- **E (Young's modulus)** — 결정 구조의 함수, lot 변동 미미
- **G (Shear modulus)**, **ν (Poisson)**
- **ρ (Density)**
- **α (CTE)**, **k (Thermal conductivity)**, **Cp (Specific heat)**
- **fatigue strength (σ_f)** — 시험 cycle 수와 R-ratio 가 변수
- **Fracture toughness (KIC)** — lot 변동성이 크지만 statistical basis 미정립
- **Creep properties** — 시험 시간 비용으로 데이터 부족

따라서 **fatigue, KIC, creep 은 항상 typical 값** — 안전계수 (SF = 4 for fatigue, SF = 1.5 for KIC) 직접 적용.

## 7. 본 DB 의 confidence 등급과 MMPDS basis 의 매핑

| 본 DB | MMPDS 대응 | 정확도 |
|---|---|---|
| `measured` (n ≥ 2) | typical (다중 lot 평균) | 높음 |
| `handbook` | typical (vendor datasheet) | 보통 |
| `class` | family typical (ASM Vol.1 평균) | 낮음 — 정확한 alloy 미반영 |
| `derived` | typical 의 함수 (예: σ_f = 0.45 σ_UTS) | 최저 |

**모든 값은 typical 기반** — A/B-Basis 가 필요한 항공·우주 응용은 MMPDS 또는 vendor 의 lot release test 직접 참조.

## 8. 참고

- MMPDS-08 (DOT/FAA/AR-MMPDS-08, 1 April 2013) — 최신 가이드
- MMPDS-01 (DOT/FAA/AR-MMPDS-01, January 2003) — 첫 정식 release
- MIL-HDBK-5 (군용, 2003 폐지 후 MMPDS 로 통합)
- Battelle Memorial Institute 가 MMPDS curation
- 1년 1회 update (annual revision)
