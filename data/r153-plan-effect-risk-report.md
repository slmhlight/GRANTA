# R153 — 코드 부채 4 항목 (R143 #11-14) Plan / Effect / Risk 보고서

**작성일**: 2026-06-06
**대상**: R143 honest critique 의 P2-구조적 부채 #11-14
**목적**: 사용자 검토 후 결정 — 어느 항목을 어느 순서로, 어느 깊이까지 실행할지

---

## 현재 상태 측정 (객관 지표)

### 파일 크기 (line count)

| 파일 | 줄수 | 비고 |
|---|---:|---|
| `scripts/build-materials.mjs` | **4,322** | JS, 단일 monolith |
| `client/src/pages/Guide.tsx` | 2,157 | 14-chapter 콘텐츠 + 검색 |
| `client/src/pages/Home.tsx` | **1,624** | 3-panel layout + header + state |
| `client/src/components/FilterSidebar.tsx` | 1,204 | 20+ slider + accordion |
| `client/src/lib/scenario-presets.ts` | 1,246 | 16 시나리오 데이터 |
| `client/src/components/MaterialDetail.tsx` | **1,036** | 3 tab + alloy-specific cards |
| `client/src/pages/Tools.tsx` | 919 | 9 calculator + SVG illust |
| `client/src/components/AshbyChartPlotly.tsx` | 876 | Plotly wrapper |
| `client/src/components/ComparePanel.tsx` | 756 | Table/Radar/Goodman view |
| `client/src/hooks/useMaterialFilter.ts` | **506** | FilterState + filter logic |
| `client/src/pages/Wizard.tsx` | 410 | 5-step questionnaire |

### 타입 안정성 marker

| 파일 | `: any` | `as any` | `Record<string, unknown>` | `as unknown as` |
|---|---:|---:|---:|---:|
| `lib/materials.ts` | 0 | 0 | 1 (meta) | 0 |
| `hooks/useMaterialFilter.ts` | 0 | **3** | 0 | 0 |
| `components/MaterialDetail.tsx` | 1 | 0 | 0 | 0 |
| `lib/similar-materials.ts` | 0 | 0 | 1 | **2** |
| `lib/query-dsl.ts` | 1 | 0 | 0 | **2** |
| **TOTAL** | **2** | **3** | **2** | **4** |

→ 총 11 군데 타입 우회. 적은 편이지만 hot path (filter, similar, query) 에 집중.

### 테스트 커버리지

- **Unit tests**: 84 (passing) across 7 files
- **Component tests**: 0
- **E2E tests**: 0
- **Visual regression / Snapshot**: 0
- **Coverage report**: vitest coverage 활성화 안 됨 — 측정 불가
- **build-materials.mjs unit test**: 0 (4,322 줄 로직이 untested)

### 데이터 fetch

- `materials.json` 크기: **8.15 MB** (uncompressed JSON)
- Build 후 gzip: ~1.4 MB (추정)
- 첫 로드: 1247 material 모두 prefetch — 카테고리별 분할 시 metal 84% / polymer 11% / 나머지 5%

---

## 항목 #11 — 거대 파일 4개 분리

### Plan

**Phase A — `scripts/build-materials.mjs` (4,322 → ~300 줄 entry + 12 모듈)**
- `scripts/pipeline/` 디렉터리 신설
  - `loaders/` (curated, csv, supplementary, ceramics, composites, polymers, stories)
  - `enrich/` (popularity, specs, ht-cost, machinability, price, alloy-ht, stories)
  - `validate/` (anomaly-detect, consistency-check, schema-validate)
  - `output/` (write-json, write-build-meta, write-report)
- Top-level `build-materials.mjs` = orchestration only (load → enrich → validate → output)

**Phase B — `client/src/pages/Home.tsx` (1,624 → ~400 줄 + 6-8 모듈)**
- 추출: `HomeHeader.tsx` (search/lang/units/buttons), `HomeMobileNav.tsx`, `CollectionDropdown.tsx`, `FavoritesDropdown.tsx`, `ImportDialog.tsx`
- `useScenarioUrl.ts` (URL ?p=&q= → preset apply)
- `useCollections.ts` (localStorage)

**Phase C — `client/src/components/MaterialDetail.tsx` (1,036 → ~250 + 4-5 sub-tab)**
- `PropertiesTab.tsx` (RangeRow + radar)
- `CompositionTab.tsx` (donut + table)
- `ProcessTab.tsx` (machinability + HT + weldability cards)
- `HistorySection.tsx` (story + refs + spec badges + similar materials)

**Phase D — `useMaterialFilter.ts` (506 → ~250 + 4 sub-hook)**
- `useTextSearch` (search + query DSL)
- `useNumericFilters` (slider state)
- `useCategoricalFilters` (category/process/manufacturer)
- `useSortLogic` (sortKey + dir + toggle)

### Effect

✅ **인지 부하** — 새 contributor 가 한 파일을 5분 안에 이해 가능. 현재 build-materials 는 1시간 +
✅ **Diff review** — PR 변경 범위가 명확. 현재 한 줄 추가도 4322 줄 파일에 묻힘
✅ **테스트 가능성** — 모듈 단위로 unit test 작성. 현재 build pipeline 은 통째로 implicit test (build 성공 여부) 만
✅ **Hot reload 속도** — Vite HMR 가 작은 모듈에서 30-50% 더 빠름
✅ **AI/검색 navigation** — Grep/IDE search 결과의 의미가 명확

### Risk

⚠️ **회귀 위험 (P=중, I=중)** — 4 phase 동안 각 phase 마다 build → diff → 수동 검증 필요. 실수 시 specific material 의 spec/price/popularity 가 silent 하게 누락될 수 있음.
- **완화책**: 각 phase 전후 `materials.json` snapshot 을 diff (e.g. `git diff --stat data/materials.preview.json`). 변경 = 0 byte 여야 정상.

⚠️ **Import cycle 발생 (P=낮, I=중)** — pipeline 모듈 간 circular dependency 가 생길 수 있음.
- **완화책**: dependency-cruiser CI step 추가

⚠️ **Merge conflict 폭증 (P=중, I=낮)** — 다른 작업과 병행 시 4 phase 분리는 다수의 변경 충돌
- **완화책**: 다른 R-round 와 시간 분리, 1 phase 씩 직렬 진행

⚠️ **Hidden behavior 발견 (P=낮, I=높)** — Home.tsx 1624 줄 안에 숨은 cross-state side-effect (e.g. preset apply 가 favorites 에 영향) 발견 시 분리 안 됨
- **완화책**: Phase B 시작 전 30분 read-through 로 state map 작성

### 실행 시간 추정

| Phase | 작업 | 예상 |
|---|---|---|
| A | build-materials 분리 + 회귀 검증 | 3-4h |
| B | Home.tsx 분리 + 회귀 검증 | 2-3h |
| C | MaterialDetail 분리 + 회귀 검증 | 1.5-2h |
| D | useMaterialFilter 분리 | 1h |
| **합계** | | **8-10h** (1.5 sessions) |

---

## 항목 #12 — 타입 안정성 보강

### Plan

**Phase A — build-materials.mjs → build-materials.ts 마이그레이션**
- TypeScript 로 변환 (CommonJS Node → ESM TS)
- `Material` interface 를 build pipeline 도 import → input/output 양쪽 타입 일치
- `tsx` 또는 `node --import @swc-node/register/esm-register` 로 직접 실행

**Phase B — Material.composition union 분리**
- 현재: `composition: Array<[string,string]> | { Cr: number|string|null, ... 30개 키 }`
- 신규:
  ```ts
  type CompositionEntry = readonly [element: string, percent: string | number];
  type Composition = readonly CompositionEntry[];
  // dict form 은 build pipeline 에서 normalize → 단일 array form
  ```
- 모든 consumer (CompositionDisplay, composition-parser, filter) 가 한 form 만 처리

**Phase C — `meta` intersection → discriminated union**
- 현재: `Record<string, unknown> & { specs?, applications?, price_verified_date? }`
- 신규: 명시적 `MaterialMeta` interface + runtime guard `hasSpecs(m): boolean`

**Phase D — 11 군데 우회 marker 제거**
- `useMaterialFilter.ts` 의 3 `as any` → 정확한 `keyof FilterState` 추론
- `similar-materials.ts` / `query-dsl.ts` 의 4 `as unknown as` → narrow type guard 함수로 교체
- `MaterialDetail.tsx` 의 1 `any` 식별 후 fix

### Effect

✅ **회귀 방지** — Material schema 변경 시 build pipeline + UI 양쪽이 동시에 타입 에러 → 누락 막음
✅ **IDE 자동완성** — `m.composition.` 입력 시 정확한 method 만 제안
✅ **Runtime null check 명시화** — `m.meta?.specs` 같은 optional chain 의 의미가 type 으로 강제

### Risk

⚠️ **빌드 시간 ↑ (P=높, I=낮)** — build:data 가 현재 ~3초 → 5-7초 (tsx 컴파일)
- **완화책**: 허용 가능 — CI 영향 미미

⚠️ **3rd-party `any` 가 막힘 (P=중, I=중)** — 일부 dependency (e.g. recharts, plotly) 의 type 우회가 막힘
- **완화책**: 해당 위치만 명시적 `as Tipo` 허용 + ESLint rule

⚠️ **Composition migration breaking change (P=중, I=중)** — 현재 코드 다수가 union 양쪽 모두 처리 → array-only 로 좁히면 모든 consumer 수정 필요
- **완화책**: Phase B 는 build pipeline normalize 만 우선 (한 build 후 100% array form 보장) → consumer 코드 수정은 후속 round

⚠️ **CI 환경 호환성 (P=낮, I=낮)** — GitHub Actions Node 22 에서 tsx 호환 확인 필요
- **완화책**: 사전 test workflow 실행

### 실행 시간 추정

| Phase | 작업 | 예상 |
|---|---|---|
| A | build-materials.ts 마이그레이션 | 4-5h |
| B | Composition union 통일 | 2-3h |
| C | Meta discriminated union | 1.5h |
| D | 우회 marker 11 군데 fix | 1h |
| **합계** | | **8-10h** |

→ **#11 Phase A 와 충돌 가능성 높음** — 같이 진행 권장.

---

## 항목 #13 — 테스트 커버리지 깊이 확장

### Plan

**Phase A — Coverage 측정 인프라**
- `vitest --coverage` 활성화 (`@vitest/coverage-v8`)
- `pnpm test:coverage` 신규 script
- CI 에 coverage report artifact 업로드
- 목표 임계: `lib/` 90%, `hooks/` 80%, `components/` 60%

**Phase B — `build-materials.mjs` 의 핵심 함수 unit test (현재 0)**
- `htCostFactor`, `popularityFor`, `extractSpecs (이미 별도 lib)`, `priceConditionFactor`, `priceFormFactor`, `machinabilityFor` 의 input → output snapshot
- Anomaly detector (4322 줄 안의 anomaly rules) 의 fixture-based test
- 목표: build pipeline 핵심 30 함수 × 평균 5 test case = ~150 신규 test

**Phase C — React Testing Library 도입 + Component test (현재 0)**
- 핵심 컴포넌트 우선:
  1. `QueryBar` — DSL 입력 → chip 표시 → 제거 흐름
  2. `MaterialDetail` — 탭 전환 + Similar materials 클릭 흐름
  3. `FilterSidebar` — slider + checkbox 변경 → filter state
  4. `Wizard` — 5-step flow + 답변 → recommendation
  5. `ComparePanel` — 재료 추가/제거 + view mode 전환

**Phase D — Playwright E2E (선택)**
- 핵심 user flow 5 종:
  1. 메인 → 검색 → 상세 → Compare 추가 → Compare 패널 확인
  2. Wizard 5-step → recommendation 클릭 → Home 으로 이동 + filter 적용 확인
  3. Scenario preset 적용 → Ashby 표시 → 재료 클릭 → 상세 확인
  4. Collection 저장 → 새 세션에서 복원
  5. Mobile viewport 에서 3-panel → bottom-sheet 동작

**Phase E — Visual regression (선택)**
- Schaeffler / KtIllust / 9 calculator SVG 의 Playwright screenshot
- `pixelmatch` 로 diff 임계 100 픽셀

### Effect

✅ **회귀 즉시 감지** — Schaeffler 라인 가시성 같은 시각적 회귀 + 데이터 silent 누락 양쪽 잡힘
✅ **Refactor 자신감** — #11/#12 진행 시 broken case 자동 노출
✅ **새 기능 contract 명시** — DSL spec, similar matching, wizard heuristic 의 의도가 코드로 기록

### Risk

⚠️ **테스트 자체 유지 비용 (P=높, I=중)** — Component test 1개 = 평균 80-200 줄. 200 개 test = 16-40k 줄. UI 변경 시 test 도 모두 수정.
- **완화책**: 가장 안정적인 contract (DSL parser, similar distance 계산, htCostFactor) 우선. Component 는 happy-path 만.

⚠️ **Flaky test 발생 (P=중, I=중)** — Playwright E2E 가 timing-sensitive (애니메이션 + lazy load)
- **완화책**: Phase D 는 선택. 핵심 5 flow 만 + retry 3 회

⚠️ **CI 시간 증가 (P=중, I=낮)** — 200 test + coverage = +1-2 분 CI
- **완화책**: 허용 가능

⚠️ **테스트 작성 → 실제 코드 부족 잡힘 (P=중, I=낮)** — test 작성 중 silent bug 다수 발견 가능 (긍정적이지만 round scope 커짐)
- **완화책**: 발견 시 별도 R-round 로 분리

### 실행 시간 추정

| Phase | 작업 | 예상 |
|---|---|---|
| A | Coverage 인프라 | 1h |
| B | build pipeline unit test (~150) | 4-5h |
| C | Component test 5종 (~50 test) | 6-8h |
| D | Playwright E2E 5 flow | 4-5h |
| E | Visual regression 9 SVG | 2-3h |
| **합계 (A-C)** | 권장 최소 | **11-14h** |
| **합계 (A-E)** | 전체 | **17-22h** |

---

## 항목 #14 — materials.json 카테고리별 분할

### Plan

**Phase A — Build pipeline 출력 분기**
- 현재: `client/public/materials.json` 단일 파일 (8.15 MB)
- 신규:
  - `client/public/materials/index.json` — id + name + category + popularity + subcategory + tier (slim, ~500 KB)
  - `client/public/materials/metal.json` (~6.5 MB)
  - `client/public/materials/polymer.json` (~600 KB)
  - `client/public/materials/composite.json` (~200 KB)
  - `client/public/materials/ceramic.json` (~250 KB)
  - 또는 alphabetical chunk (A-F, G-M, N-S, T-Z) — 카테고리 cross-filter 가 흔하므로 권장 X

**Phase B — Client lazy load 로직**
- 첫 로드: `index.json` 만 — 검색 + 카테고리 필터 + Ashby 의 dot density 표시 OK
- 사용자가 카테고리 토글 또는 상세 패널 열면: 해당 category 의 full JSON fetch
- Cache: in-memory + sessionStorage
- 신규 hook `useMaterialPool(categories: string[])` — 필요 카테고리만 merge

**Phase C — Build meta + verify script 조정**
- `pnpm verify:urls` 의 source 가 category 분할 file 로 변경
- `build-meta.json` 의 byCategory 그대로

### Effect

✅ **첫 페인트 ↓** — 첫 fetch 8.15 MB → 0.5 MB (16배). Mobile 4G 환경 6-8초 → 1초
✅ **메모리 ↓** — Polymer-only browsing 사용자가 metal 1041 entry 안 로드
✅ **CDN 캐시 효율 ↑** — metal 데이터만 변경 시 polymer file cache 유지

### Risk

⚠️ **Compare cross-category 시 latency (P=높, I=중)** — Metal 과 Polymer 동시 비교 시 양쪽 load 필요 → 0.5-1초 추가
- **완화책**: 카테고리 변경 prefetch hint + skeleton UI

⚠️ **Ashby chart 의 outliers (P=중, I=중)** — 전체 1247 entry density distribution 이 가시화의 의미. 첫 로드 시 index.json 만 사용하면 density 정확
- **완화책**: index.json 에 모든 entry 의 (id, name, category, density, σy, T_max) 5 핵심 property 포함 → Ashby preview 가능

⚠️ **Filter logic 다수 수정 (P=중, I=중)** — `useMaterialFilter` 가 단일 array 가정. lazy load 시 partial array 처리 로직 추가
- **완화책**: Phase B 의 hook 가 통합 array 반환 (구현 detail 숨김)

⚠️ **검색 결과 incomplete (P=중, I=높)** — 사용자가 "PEEK" 검색했는데 Polymer 카테고리 아직 로드 안 됐으면 결과 0
- **완화책**: index.json 에 name + aliases 포함 (~500 KB) → 검색은 index 만으로 충분
- **잔여 risk**: full-text 검색 (industry_note, applications) 은 lazy load 후만 가능

⚠️ **GitHub Pages 정적 호스팅 호환성 (P=낮, I=낮)** — 다중 파일 + relative path 의 base URL 처리 (이미 R141a 에서 fix 됨)
- **완화책**: 기존 fetch URL 로직 재사용 (`import.meta.env.BASE_URL`)

### 실행 시간 추정

| Phase | 작업 | 예상 |
|---|---|---|
| A | Build 분기 + index.json | 1.5h |
| B | Lazy load hook + filter 통합 | 2-3h |
| C | verify scripts 조정 + 테스트 | 1h |
| **합계** | | **4.5-5.5h** |

---

## 종합 우선순위 권장 (정직)

### 정렬 기준 (가시 효과 ÷ 시간 × (1 - 위험도))

| 항목 | 시간 | 가시 효과 | 위험 | 권장 순위 |
|---|---:|---|---|:---:|
| **#14 JSON 분할** | 4.5-5.5h | 첫 페인트 8배 ↑ (사용자가 즉시 체감) | 중 | **1** |
| **#13-B build unit test** | 4-5h | 회귀 즉시 감지 (Q+T factor 같은 silent bug 잡힘) | 낮 | **2** |
| **#12 타입 강화** | 8-10h | IDE 자동완성 + #11 의 안전한 회귀 검증 | 중 | **3** |
| **#11 파일 분리** | 8-10h | 기여 인지 부하 ↓ — 사용자 가시 효과는 없음 | 중 | **4** |
| **#13-C component test** | 6-8h | UI 변경 시 회귀 잡힘 — 유지 비용 큼 | 중-높 | **5** |
| **#13-D E2E + #13-E visual** | 6-8h | 시각 회귀 자동 잡힘 — flaky 우려 | 높 | **6** |

### 결합 시너지

- **#14 → 단독 가능, 가장 빠른 win**. 사용자가 첫 page load 차이를 즉시 체감.
- **#12 + #11 → 함께 진행 권장**. build-materials.ts 변환 (#12-A) 가 #11-A 와 같은 파일 손대므로 동시 진행이 효율.
- **#13-B 단독 → 저비용, 향후 R-round 마다 회귀 방지**. Q+T factor 같은 R152a 류 silent bug 미리 잡힘.
- **#13-C/D/E → 새 기능 안정화 후로 미루기 권장**. 현재 빠르게 변하는 단계.

### 가장 솔직한 추천

**이번 다음 라운드 R154 — #14 단독** (4.5-5.5h, 위험 중, 가시 효과 즉시).
**R155 (선택) — #13-B** (4-5h, 위험 낮음, R-round 마다 silent bug 예방).
**R156-R157 (선택) — #11+#12 묶음** (16-20h, 1.5-2 session, 위험 중, 가시 효과 무).

### 권장 안 함

- #13-D E2E + #13-E visual: UI 가 안정화된 후 검토. 현재 R141 (Schaeffler), R152b (layout) 같은 빈번한 시각 변경 → flaky 회귀 폭증 위험.

---

## 결정 사항 입력 양식

다음 항목 중 진행 의향이 있는 것을 선택해 알려주세요:

- [ ] **R154 #14 JSON 분할** (4.5-5.5h, 가시 효과 즉시) — *추천*
- [ ] **R155 #13-B build pipeline unit test** (4-5h, 회귀 방지) — *추천*
- [ ] **R156+R157 #11+#12 묶음** (16-20h) — 인지 부하 감소
- [ ] **R158 #13-C component test** (6-8h) — UI 회귀
- [ ] **R159 #13-D/E E2E + visual** (6-8h) — *비추*
- [ ] **모두 폐기** — 잔여 부채 수용

또는 사용자가 다른 조합/순서/scope 를 지정.
