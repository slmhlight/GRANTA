# REGEX → Material ID 마이그레이션 계획 (R226o 감사·설계)

**목표**: 이름(name) 패턴 매칭으로 재료를 분류하거나 값을 변조하는 모든 regex 를 제거하고, **stable Material ID**(`MET/POL/CER/CMP-NNNN`) 기반 조회·교정으로 전환. 이름 변경·조건 추가·오타에 견고.

**정직한 현황(왜 아직 regex 가 남았나)**: R226j~k 에서 **클라이언트 런타임 분류**만 ID화했고(절삭성·용접성·HT·인사이트), **빌드 파이프라인의 name-regex 값 override(R199 등)는 그대로** 뒀다. 그래서 R226m 에서 304 temper 가 오염됐고 R226n 에서 lookahead 로 땜질했다. 이 문서가 나머지 전량 제거 계획이다.

---

## A. 전수 감사 (2026-07)

### A-1. 런타임(클라이언트) — 분류 regex 거의 소거됨
- ✅ **제거 완료**: 절삭성 rating·폴리머 절삭성·용접성 모델(ce/schaeffler/none)·HT family·선택 인사이트 → 전부 `m.profiles` ID 조회 (R226j/k).
- ✅ **제거 완료(Phase 5, R226p)**: `client/src/lib/coatings.ts` `recommendedCoatings` — 구 `substrateMatch` name-regex 를 빌드 스탬프 `m.profiles.coatings`(coatings-classify.mjs) 조회로 전환. 런타임 regex 0.
- ✅ **제거 완료(Phase 5b, R226p — R226o 감사 누락분)**: `client/src/lib/material-colors.ts` `classOf` — family-color 를 name-regex(CLASSES.test)로 판정하던 **런타임 분류**를 빌드 스탬프 `m.profiles.colorFamily`(color-classify.mjs) 조회로 전환. CLASSES 는 순수 데이터(key·color·category|pattern)로 축소, 런타임 정규식 0. (구 A-1 감사가 놓친 유일한 런타임 분류 regex — 전수 재점검에서 발견.)
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

**값 변조 — 인라인/substring (R226o 감사 후 추가 발견)**:
| 4b | R146 cost | `cost-verified-q2-2026.json` | name-substring(`match_substring`) | price_per_kg (measured) |
| 4c | 인라인 파생-보정 | build-materials 내 | `/\b304\b.../`(austenitic impact)·`foam|honeycomb|cellular/aerogel`(fatigue drop)·`x-?750`(fatigue cap) | impact/fatigue 값 |

**분류 (구조 — subcategory/family/derivation 결정; 값 변조 아님 → classifier, 동결+게이트로 봉쇄)**:
| 8 | 폴리머 subcat 정규화 | `POLY_SUB_RULES` (build-materials) | name-regex 테이블 40룰 | subcategory |
| 8b | 금속 subcat 정규화 | `normalizeMetalSubcategory` (build-materials) | name-regex(`NAME_BASED_OVERRIDE`+`METAL_SUB_RULES`) | subcategory |
| 8c | AM 이방성 note | `isHipped` (build-materials) | name+heat_treatment 조건 파싱 | meta.anisotropy_note (텍스트) |
| 9 | aliasesFor/qualFor | build-materials 내 | ~890 name-regex | 별칭 + 품질 tier |

> **classifier vs override 판정(핵심)**: #8·8b 는 process-classify.mjs(A-3)와 동형 — **분류를 부여**(신규 entry 포함)하지 값을 변조하지 않는다. 출력(subcategory)은 레지스트리에 동결·커밋되고 런타임은 재실행 안 함(K_comp_subcat_mismatch 감사 + round-trip 게이트). ID화(동결값 echo)하면 신규 폴리머/금속 분류 불능이 되므로 **classifier 로 유지**가 옳다(값-override 만 ID화). #8c 는 조건 문자열 파싱(ht-matcher 계열, 텍스트 note) — 유지.

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
| **1** ✅ R226p | R199-stainless·R199-urls·R205 name-regex → **stable_id 매칭**(원위치 유지, freeze[m.id] 조회) | — | 완료: 라이브 `new RegExp(namePattern)`=0 · **value-diff 0**(baseline byte-동일) · 게이트(override-stableids: 실재 ID·namePattern 없음) · phantom(제거 entry) ID 218 정리 | 해결: 원위치라 derivation 순서 보존 → 파생 stale 없음. rename-timing 은 R226P_CAPTURE 로 R199-time 정확매칭 확정 |
| **2** ✅ R226p | R173-range·R214 exact-name → stable_id 매칭 | — | 완료: 라이브 `m.name===ov.name`·`byName.get` 제거 · value-diff 0 · 게이트 확장 · helper 를 최초 사용 지점 앞으로 이동 | 저위험(exact) |
| **3** ✅ R226p | R173-handbook-sources·R191-proprietary regex('i') → stable_id 매칭 | — | 완료: 라이브 override-로더 name-regex 0 · value-diff 0(출처·manufacturer 포함) · 게이트 5파일 | R191 first-match 순서 보존(pattern별 stableId set) |
| **4** ✅ R226p | 인라인 **값-변조** name-regex/substring → stable_id: austenitic impact·foam/cellular fatigue·X-750 cap(`r226p-inline-overrides.json`) + R146 cost `match_substring`(`cost-verified-q2-2026.json` stableIds) | — | 완료: 라이브 인라인 regex 0 · **value-diff 0**(전 1129 deep-equal) · registry drift 0 · 게이트(override-stableids +Phase4) · austenitic/metal-foam 은 dead-branch(공집합) 확인. **classifier(subcat 정규화·isHipped)는 값-변조 아님 → 유지**(위 판정) | 해결: 원위치 유지·capture 로 정확집합·phantom 필터 |
| **5** ✅ R226p | coatings 런타임 regex → 빌드타임 coating-applicability classifier(`scripts/lib/coatings-classify.mjs`) + `m.profiles.coatings`(빌드 스탬프) | — | 완료: 런타임 `new RegExp(c.substrateMatch)` 제거 · **behavior identical**(profiles.coatings=regex 오라클·최종 추천 리스트 전 1129 재료 동일) · 게이트(`coatings-id.test.ts` 4 checks) | 해결: 구 호출부가 name+process 만 넘겼으므로 subcat 없는 concat 로 정확 재현. 'all' 코팅은 런타임 유지 |
| **5b** ✅ R226p | family-color 런타임 regex(`material-colors.ts classOf`) → 빌드타임 color classifier(`scripts/lib/color-classify.mjs`) + `m.profiles.colorFamily`(빌드 스탬프) | — | 완료: 런타임 `new RegExp`/`.test` 제거·CLASSES 순수데이터화 · **behavior identical**(stamp=verbatim 오라클 전 1129 색 동일·colorFamily 외 필드 deep-diff 0) · 게이트(`color-family.test.ts` 4 checks + golden anchor) | R226o 감사 누락분 — 전수 재점검에서 발견 |
| **6** ⏸ **유지 판정** | aliasesFor/qualFor + ALLOY_SPECIFIC — grade-token 파싱 + 키드 딕셔너리 | — | **전환 안 함**(아래 판정) | — |

**Phase 6 유지 판정(중요)**: `aliasesFor`/`qualFor`/`ALLOY_SPECIFIC` 는 name 을 **grade 토큰으로 파싱**(`norm(alloyOf)`·digit tokens)한 뒤 **키드 딕셔너리**(ALIAS_MAP·QUAL_MAP)를 조회하는 **name-파싱**이다 — Phase1-4 의 `new RegExp(namePattern).test(name)` 식 override 와 구조가 다르다. 부여 데이터는 **grade-레벨**(별칭·정성등급·물리상수 ec/cte/melt/kic)로 **temper-무관** → R199 를 촉발한 *temper-의존 기계값 오염* 버그가 **원리상 불가능**. 출력(m.aliases 등)은 레지스트리에 동결·커밋되고 **런타임은 regex 0**(데이터 필드 조회). ID화(동결값 echo)하면 신규 grade 별칭 도출 불능 → **classifier 로 유지**(process-classify A-3 선례와 동일). *만약* 향후 grade-토큰 파싱까지 제거하려면 per-entry alias/quality 동결 필드로 전환 가능하나, 견고성 이득 0(이미 동결·게이트)·신규 entry 회귀 리스크만 큼.

**공통 게이트(매 Phase)**: `build:registry` round-trip 불일치 0 · `golden-values` green · `audit:registry` 0 · **값 diff 스크립트로 전후 동일 확인** · tsc/lint/test green.

**핵심 원칙**: 각 Phase 는 **값·구조 불변(behavior identical)** 이 수용 조건. regex→ID 는 *표현* 전환이지 값 변경이 아니다. 값 변경이 필요하면 별도 교정으로 분리(무손실).

---

## E. 결론 — 마이그레이션 핵심 목표 완료 (R226p)

**제거 완료(전량)**:
- **런타임 분류 regex = 0**: 절삭성·용접성·HT·인사이트(Phase 0) + coatings(5) + **family-color(5b)** 전부 `m.profiles` ID 조회. 클라이언트에 재료-분류 name-regex 없음.
- **빌드 값/메타 override name-매칭 = 0**: R199·R199-urls·R205·R173-range·R214·R173-sources·R191(Phase 1-3) + 인라인 값-보정(austenitic·foam·X-750) + R146 cost(Phase 4) 전부 stable_id.

**의도적 유지(정당·문서화)**:
- **빌드타임 classifier**(subcategory 정규화 POLY_SUB_RULES·normalizeMetalSubcategory, aliasesFor/qualFor grade-parsing, process-classify): name→분류 부여, 출력 **레지스트리 동결 + 게이트**(round-trip·audit·assignment parity), 런타임 미접촉. ID화 시 신규 entry 분류 불능 → 유지가 옳음.
- **문자열 파싱**(query-dsl·query-autocomplete·spec-matcher·composition-parser·ht-matcher·fuzzy-search): 사용자 입력·조성/조건 문자열 파싱이지 재료 분류 아님.
- **조건-코드 파싱**(ht-alloy-specific H900/T6, isHipped note): family 는 이미 `m.profiles.ht` ID 선택, 남은 건 조건 코드 파싱(텍스트 note).

**견고성 결과**: rename·중간삽입으로 인한 *값/메타 override silent 오염*(R226m 304 temper 버그류)은 원천 차단 — 모든 값-대상은 stable_id, 전환은 value-diff 0 로 무손실 증명.

---

## D. 산출물 매핑 (편집 위치)
- ID-keyed 값 교정: `data/r226-value-corrections.json` (기존) — Phase1-2 대상 이관처.
- freeze 조회 유틸: `scripts/lib/` 신규(legacy→stable) — 해법(가).
- coating assignments: `data/process-profile-assignments.json` 확장 or 신규 — Phase5.
- 회귀 고정: `tests/golden-values`(값)·`registry-integrity`(구조)·신규 값-diff 게이트.
