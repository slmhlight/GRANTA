# 장기 운영 원칙·계획 (R226g, 2026-07)

이 문서는 **유지보수 프로토콜**과 **신규 작업 요망 목록**의 SSOT. 전략 배경은 [DATA-STRATEGY.md](DATA-STRATEGY.md), 편집 파일 맵은 [DATA-WORKFLOW.md](DATA-WORKFLOW.md).

## 1. 불변 원칙 (위반 = 회귀)

**데이터**
1. **검증 없는 값 없음** — 모든 신규/교정 값은 datasheet·표준·핸드북 인용 필수 (`basis`/`src`). 미검증 근사는 미수록이 정답 (elev-curves 빈 시드가 전례).
2. **무손실 교정** — 원본은 `_corrections` 보존, round-trip 불일치 0. 교정은 선언적 JSON(corrections)으로만.
3. **append-only 상류** — 소스 배열 중간 삽입 금지 (positional legacy_id). fp 게이트가 강제하나, 원칙으로 먼저 지킬 것.
4. **모놀리스 동결** — `build-materials.mjs`(4550 LOC)는 편집하지 않는다. 확장은 외부 파이프(§3)로. 불가피한 후크는 ≤10줄 + lib 순수함수.
5. **게이트 우회 금지** — 커밋 전 `build:registry`(round-trip·fp) → `build:data`(anomaly high=0) → `check` → `test`. CI 와 동일 체인.

**코드**
6. 영구 정책: no dark:, 구조재료 전용, no Pareto 3D, useMemo 선언 직전(TDZ).
7. 순수 로직은 lib 로 추출해 유닛테스트 (인라인 무테스트 로직 신설 금지).
8. UI 는 데이터의 confidence/provenance/authority 를 **숨기지 않고 표기** (필터로 감추지 않음 — R221d 방향).

## 2. 백본 판정 — **대규모 리팩터링 불필요**

근거: 계획의 모든 데이터 작업이 **모놀리스 편집 없이** 선언적 파일 + lib 로 수행 가능해짐.

| 백본 요소 | 상태 |
|---|---|
| Registry SSOT + 안정 ID + **fp 게이트**(positional id 오염 차단, 실전 발화 검증) | ✅ |
| 무손실 교정 8종 (ranges·fields·composition·subcat·remove·sources·aliases·points-resync) | ✅ |
| CI 게이트 9종: round-trip·fp·registry-integrity(9)·corrections-schema(7)·golden(90)·min-spec(23)·audit-gate·points⊆ranges·anomaly-high=0 | ✅ |
| 확장 파이프: corrections / cast-alloys(append) / standard-min-specs / elevated-temp-curves / sourcesBySubcategory·aliasesByBase | ✅ |
| 계측: build-meta authorityDistribution·unsMaterials + report-coverage-gaps | ✅ |

잔여 리스크와 대응: build-materials 4550 LOC → **리팩터 대신 봉쇄**(동결+게이트)가 비용·리스크 우위. 재검토 트리거: (a) 모놀리스를 분기 2회 이상 편집하게 되면, (b) corrections >600줄이면 도메인 분할(`data/corrections/*.json` — 스키마 테스트가 게이트), (c) 신규 소스 파일 추가 시 `scripts/pipeline/` 단계로.

## 3. "무엇을 하려면 어디를" — 확장 파이프 맵

| 작업 | 편집 | 게이트 |
|---|---|---|
| 값 교정 | corrections `ranges` (stable_id, basis/src, basis_kind?) | round-trip·golden·min-spec |
| 합금 추가 | `cast-alloys.json`(주조) / `supplementary-materials.json` **끝에 append** | fp·audit |
| 별칭/대응합금 | corrections `aliasesByBase` | registry-integrity |
| 족보 출처 | corrections `sourcesBySubcategory` (URL 검증 후 verified) | corrections-schema |
| 표준 min 추가 | `standard-min-specs.json` | min-spec 테스트 |
| 고온 곡선 | `elevated-temp-curves.json` (검증값만) | build-lib |
| golden 확장 | `tests/golden-values.test.ts` | 자체 |
| anomaly 임계 | `scripts/lib/anomalies.mjs` | build-lib |
| URL 안티봇 | verify 스크립트 `BOT_BLOCKED_DOMAINS` (cron candidate 가 자동 제안) | — |

## 4. 유지보수 프로토콜 (주기)

| 주기 | 작업 | 산출 |
|---|---|---|
| 매 커밋 | §1-5 게이트 체인 (CI 동일) | green |
| 분기 | `pnpm verify:urls` → dead 0 유지, candidate 는 화이트리스트 반영 | dead-urls-report |
| 분기 | golden +20~30 (인기순; probe→표준 대조→bound) — 목표 150 | golden-values |
| 분기 | `node scripts/report-coverage-gaps.mjs` 재생성 → §1~3 갭 소진 추적 | COVERAGE-GAPS.md |
| 분기 | 족보 re-verify 로테이션: **Cu(CuCr1Zr aged 포함) → Al → Ti → Ni → 철강** | corrections |
| 반기 | KPI 점검: authorityDistribution standard+handbook 31.7% → 50% | build-meta |
| 연 1 | 튜플충돌·약한 provenance 전수 스윕 (A588 방법론 재실행) | 보고 |

## 5. 신규 작업 요망 목록 (우선순위·수용기준)

**P1 — 데이터 (다음 분기)**
1. **elev-temp 캠페인 1차**: COVERAGE-GAPS §3 상위 10종 — 곡선은 제조사 PDF(사용자 제공 or 확보)에서만. 수용: `elevated-temp-curves.json` 에 src 포함 수록 + TempCurveChart 렌더 확인.
2. **min-spec 테이블 확장**: A240(304/316 계열)·B265 잔여 grade·AMS 주요 — 23→50 spec. 수용: 신규 매칭 entry 전부 green(위반은 교정으로 해소).
3. **Cu 족보 re-verify**: CuCr1Zr(LPBF) Aged 200/295 등 vendor MDS 대조. 수용: corrections 교정 or REVIEWED 화이트리스트.
4. **파생값 대체 1차**: COVERAGE-GAPS §1 상위 10 (SUP9/10·Maraging C350·P91·52100) KIC/fatigue 실측 확보. 수용: confidence 'class/derived' → 'handbook'.

**P2 — 데이터 모델**
5. **per-property provenance 확대**: 교정 외 주요 실측값에도 `ranges[p].provenance` 채움 (족보 로테이션과 병행).
6. **A/B-basis 확대**: min-spec 매칭 entry 의 min 값에 `basis:'min_spec'` 일괄 도출 (build-from-registry presentation).
7. **조건 축 확장**: COVERAGE-GAPS §2 단일조건 74 중 상위 (7050-T73 계열 등) — cast-alloys 방식 append.

**P3 — UI/기능 (데이터 노출)**
8. **UNS 검색·표시**: useMaterialFilter 검색 haystack 에 `uns[]` 포함 + Designations 에 UNS 뱃지 구분. 수용: "N07718" 검색 direct-hit.
9. **provenance tooltip 확대**: R129 tooltip 이 교정 인용(`교정: …`)을 표시하는지 확인·보강.
10. **authority 필터/정렬**: 출처 등급별 보기 (숨기지 않고 구분 — 원칙 8).

**P4 — 위키형 상호참조 (E14, 다분기 프로그램 — 설계 완료)**
11. **위키 상호참조 시스템**: 재료↔재료·본문 기술용어 백링크 + 통합 랭크 검색. 전 링크는 빌드타임 stable_id/slug 해석(런타임 regex 0, 원칙 1) + SSOT(`glossary.json`·본문 `[[…]]`) + 게이트. **적대적 리뷰 반영**: auto-link 는 **allowlist(opt-in per surface-form)** — naive substring 은 실측상 오탐 폭발("30" 210회·원소기호 등, 설계문서 §A). 검색 개편은 **표 필터 술어 불변**(narrowedRanges R209 회귀 방지)·신규 전역검색(⌘K)에서만. 단계·백본·리스크 상세 → **[WIKI-CROSSREF-DESIGN.md](WIKI-CROSSREF-DESIGN.md)**. 진행: Phase 0(설계·리뷰) ✅ · **Phase 1(lexicon+build-wiki-index+게이트) ✅ R227** · **Phase 2(backlink 패널 + 본문 인라인 auto-link, allowlist AUTOLINK_STOP 정밀도) ✅ R227**. 다음: Phase 3(authored `[[…]]` 모호·고가치) → Phase 4(glossary 용어링크) → Phase 5(⌘K 전역검색).

## 6. 신규 세션 착수 절차
1. CLAUDE.md → DATA-WORKFLOW → 이 문서 §3 편집 맵 확인.
2. 작업 후 §1-5 게이트 체인. 3. 커밋 메시지에 검증 수치(round-trip·테스트) 명기. 4. 푸시는 사용자 지시 시.
