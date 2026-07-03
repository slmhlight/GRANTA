# REGEX → Material ID 마이그레이션 계획 (R226o 감사·설계)

**목표**: 이름(name) 패턴 매칭으로 재료를 분류하거나 값을 변조하는 모든 regex 를 제거하고, **stable Material ID**(`MET/POL/CER/CMP-NNNN`) 기반 조회·교정으로 전환. 이름 변경·조건 추가·오타에 견고.

**정직한 현황(왜 아직 regex 가 남았나)**: R226j~k 에서 **클라이언트 런타임 분류**만 ID화했고(절삭성·용접성·HT·인사이트), **빌드 파이프라인의 name-regex 값 override(R199 등)는 그대로** 뒀다. 그래서 R226m 에서 304 temper 가 오염됐고 R226n 에서 lookahead 로 땜질했다. 이 문서가 나머지 전량 제거 계획이다.

---

## A. 전수 감사 (2026-07)

### A-1. 런타임(클라이언트) — 분류 regex 거의 소거됨
- ✅ **제거 완료**: 절삭성 rating·폴리머 절삭성·용접성 모델(ce/schaeffler/none)·HT family·선택 인사이트 → 전부 `m.profiles` ID 조회 (R226j/k).
- ⚠ **잔존 1건**: `client/src/lib/coatings.ts` `recommendedCoatings` — 후공정(코팅) 추천을 `substrateMatch` regex 로 이름 매칭. → Phase 5.
- 🟢 **정당(유지)**: 검색·파싱 — `direct-hit`·`query-dsl`·`query-autocomplete`·`spec-matcher`·`composition-parser`·`ht-matcher`. 사용자 입력/조성 문자열 파싱이지 재료 분류가 아님.
- 🟡 **경계(유지 검토)**: `ht-alloy-specific.ts` 조건코드(H900/T6) 토큰 매칭 — **family 는 이미 `m.profiles.ht` 로 ID 선택**됨, 남은 건 조건 코드 파싱뿐. 낮은 위험.

### A-2. 빌드 파이프라인(`scripts/build-materials.mjs`) — name-regex override (핵심 타깃)
**값 변조 (위험 — 오염원)**:
| # | 시스템 | 파일 | 방식 | 영향 |
|---|---|---|---|---|
| 1 | R199 stainless | `r199-stainless-overrides.json` | regex `namePattern` | **225 entry** σy/UTS/조성 — 304 temper 오염 원인 |
| 2 | R173 range | `r173-range-overrides.json` | exact-name | handbook 값 정정 |
| 3 | R205 reliability | `r205-reliability-overrides.json` | regex | tier/confidence |
| 4 | R214 fatigue | `r214-fatigue-overrides.json` | name | σf |

**메타데이터 변조 (낮은 위험)**:
| 5 | R191 proprietary | `r191-proprietary-alloys.json` | patterns | manufacturer |
| 6 | R173 sources / R199 urls | `r173-handbook-sources.json`·`r199-source-urls.json` | regex | 출처 |
| 7 | R173 names | `r173-name-overrides.json` | name | 이름 재작성 |

**분류 (구조 — subcategory/family/derivation 결정)**:
| 8 | 인라인 감지 | build-materials 내 | `/\b304\b.../`·`foam|honeycomb`·`x-?750`·폴리머 subcat 정규화 테이블 | impact/foam/파생 |
| 9 | aliasesFor/qualFor | build-materials 내 | ~890 name-regex | 별칭 + 품질 tier |

### A-3. 빌드타임 분류기 — `scripts/lib/process-classify.mjs` (R226j)
- name-regex 이지만 **1회 부트스트랩** → 커밋된 `process-profile-assignments.json`(stable_id 키) + parity 게이트. **런타임 미접촉**, 교정은 `process-profile-overrides.json`(ID+src).
- **판정**: 위험 아님(동결+게이트로 봉쇄). 완전 ID화 시 assignments 수동 확정 후 소스 regex 삭제 가능(Phase 6, 선택).

---

## B. 근본 과제 — derivation 순서
override 는 build-materials 에서 **파생값(KIC·fatigue·points) 계산 전에** 실행된다. 그냥 build-registry 로 옮기면 파생값이 stale.

**해법 (권장 = 가)**:
- **(가)** build-materials 가 **freeze(legacy_id→stable_id) 로 stable_id 를 조회**해, name-regex 대신 **ID-keyed 값 교정을 derivation 직전에 적용**. 순서 보존 + regex 제거. 기존 `r226-value-corrections.json` 스키마 재사용.
- (나) 파생 로직을 build-registry 로 이동 — 대규모, 리스크 큼.
- (다) 현행처럼 build-registry post-hoc 교정 + points-resync 확대 — 파생 σf/KIC stale 잔존(현 corrections 와 동일 tolerance).

---

## C. 단계별 실행 (phased)

| Phase | 내용 | 착수기준(Entry) | 수용기준(Accept) | 리스크 / 완화 |
|---|---|---|---|---|
| **0** ✅ | 런타임 분류 ID화(R226j/k)·R199 over-match 차단(R226n)·문구(R226o) | — | 완료 | — |
| **1** | R199 값 override → ID-keyed 교정 이관 | 해법(가) 파일럿 통과 | R199 name-regex 삭제 · round-trip 0 · golden green · **모든 값 build 전후 불변** | 파생 σf stale / 재파생 or tolerance 확인 |
| **2** | R173-range·R205·R214 동일 이관 | Phase1 완료 | 동일 게이트 | 소수 exact-name — 저위험 |
| **3** | 메타(R191·sources·names) ID화 | — | 출처/manufacturer 불변 | 저위험(값 아님) |
| **4** | 인라인 분류(austenitic impact·foam·subcat 정규화) → 명시 필드 or 빌드타임 assignments | — | subcategory/impact 불변 | family tree 영향 / audit K룰 |
| **5** | coatings 런타임 regex → 빌드타임 coating-applicability classifier + `m.profiles.coatings` (machinability 선례) | — | 추천 코팅 동등 · 런타임 regex 0 | 코팅 매칭 재현 / 스냅샷 테스트 |
| **6**(선택) | ~890 aliasesFor/qualFor → per-entry alias/quality 필드 · process-classify assignments 확정 후 소스 regex 은퇴 | Phase1-5 완료 | 별칭/tier 불변 · 빌드 regex 최소화 | 최대 규모 / 기회주의 |

**공통 게이트(매 Phase)**: `build:registry` round-trip 불일치 0 · `golden-values` green · `audit:registry` 0 · **값 diff 스크립트로 전후 동일 확인** · tsc/lint/test green.

**핵심 원칙**: 각 Phase 는 **값·구조 불변(behavior identical)** 이 수용 조건. regex→ID 는 *표현* 전환이지 값 변경이 아니다. 값 변경이 필요하면 별도 교정으로 분리(무손실).

---

## D. 산출물 매핑 (편집 위치)
- ID-keyed 값 교정: `data/r226-value-corrections.json` (기존) — Phase1-2 대상 이관처.
- freeze 조회 유틸: `scripts/lib/` 신규(legacy→stable) — 해법(가).
- coating assignments: `data/process-profile-assignments.json` 확장 or 신규 — Phase5.
- 회귀 고정: `tests/golden-values`(값)·`registry-integrity`(구조)·신규 값-diff 게이트.
