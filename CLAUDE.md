# AM Materials Explorer — Project Guide

ANSYS Granta-style additive-manufacturing materials database. Interactive Ashby
charts, Compare panel with Radar / Goodman views, 9-calculator Engineering Tools,
14-chapter learning Guide, range-based material properties with cited datasheets.

## Stack
React 19 · Vite 7 · TypeScript · Tailwind CSS 4 · shadcn/ui · **Plotly.js** (Ashby chart) · wouter · pnpm 10 · Vitest.

## Run (Windows dev machine)
- **Node 24 LTS** is installed at `C:\Program Files\nodejs` but is **NOT on the default shell PATH** — prepend it when calling node/npm/pnpm from a shell:
  `$env:Path = "C:\Program Files\nodejs;$env:APPDATA\npm;$env:Path"`
- **pnpm 10.4.1** is installed globally via npm (lives in `%APPDATA%\npm`).
- Install deps: `pnpm install`
- Dev server: `pnpm dev` (Vite on http://localhost:3000), or via Preview tool `preview_start` config **`am-materials`** in `.claude/launch.json` (runs `node node_modules/vite/bin/vite.js` directly, PATH-independent).
- Type-check: `pnpm check`  ·  Build: `pnpm build`  ·  Tests: `pnpm test` (vitest)
- Data pipeline: `pnpm build:data`  ·  Link checks: `pnpm verify:urls`, `pnpm verify:guide`

> Note: in the current agent environment the **preview screenshot tool times out** even when the app is healthy — verify via `preview_eval` / DOM probes / `preview_console_logs` instead.

## Data pipeline
- **자료 추가·교정 워크플로우** → [`docs/DATA-WORKFLOW.md`](docs/DATA-WORKFLOW.md) (어느 파일을 편집할지 — 4550-LOC build-materials 회피). **데이터 발전 전략(분기 로드맵)** → [`docs/DATA-STRATEGY.md`](docs/DATA-STRATEGY.md). **장기 운영 원칙·유지보수 프로토콜** → [`docs/LONGTERM-PLAN.md`](docs/LONGTERM-PLAN.md) (백본 판정: 대규모 리팩터 불필요 — 동결+게이트 봉쇄; 확장은 §3 파이프 맵). **전량 작업 인벤토리(착수·수용 기준+리스크)** → [`docs/MASTER-BACKLOG.md`](docs/MASTER-BACKLOG.md) — 새 작업은 여기 등재 후 착수, 커밋에 백로그 ID 인용. R226e 보강: 순수함수 lib 추출(`scripts/lib/anomalies.mjs`·`source-labels.mjs`, 중복 제거) · CI 게이트 테스트(`registry-integrity`·`corrections-schema`·`golden-values`) · 출처 `authority` 등급(standard>handbook>manufacturer>aggregator>other) · verify:urls 안티봇 자동 후보 검출 · **points↔ranges 정합**(build-registry 4d — 상류 range override 후 stale 였던 99 entry points 재생성, 표=Ashby 일치; registry-integrity 가 게이트).
- **Registry SSOT** (R226 cutover): `data/registry/entries/<cat>/<id>.json` (1198 per-entry, committed) = source of truth. Stable IDs (`MET/POL/CER/CMP-NNNN`) frozen in `data/registry-id-freeze.json` (legacy_id→stable_id; 이름·subcat·공정 변경에도 불변). 값·조성·필드·출처·별칭·제거 교정은 `data/r226-value-corrections.json` (stable_id·base·subcategory 키, datasheet 인용)에 모으고 `build-registry.mjs`가 적용 — 원본은 entry `_corrections`에 보존 (round-trip이 "무손실+문서화교정" 증명).
- **Build**: `pnpm build:data` (`build-from-registry.mjs`) → 레지스트리 읽어 `client/public/materials.json` + shards(`materials/{cat}.json`·slim `index.json`) + `build-meta.json` 생성. 교정 entry는 points 재생성. generic placeholder 출처 라벨(`Datasheet N` 등)은 URL 도메인 기반 서술 라벨로 도출 (R226d presentation — 값 SSOT 불변).
- **Regenerate registry** (소스 대변경 시 수동): `pnpm build:registry` = `build-materials.mjs`(6 소스 + ~890 name-regex override + derived) → shards → `build-registry.mjs`(stable ID·family tree·교정 적용). 890 override는 **live path에서 은퇴** — 레지스트리 재생성 입력으로만 잔존. 데이터 검수: `pnpm audit:registry` (물리 불가능·공정상태 SOFT↔HARD 교차충돌).
- Upstream sources (`data/`, build:registry 입력): `material_db.json` + `AM_Materials_DB_enriched.csv` (generic 조건별 값은 합성 — memory/project_csv_generic_fabrication 참조) + `supplementary-materials.json` + `ceramics-data.json` + `composites-data.json`.
- **1,112 materials** total — live counts in `client/public/build-meta.json` (SSOT). By category: 906 Metal · 133 Polymer · 39 Ceramic · 34 Composite. (R226b: 1198→1107, 합성·중복 91건 제거; R226c: +7 cast 합금 → 1114; R226d: AA 2024-T351 중복 조건 2건 제거 → 1112.)
- **R226b 데이터 진실성**: Ti subcategory 미세조직 재분류(단일 "CP Grades" → CP·α/near-α·α+β·β 4분류; Ti-6Al-4V=α+β) · 중복/합성조건 제거(generic 4130/4140/4340 dup·as-cast/forged·mill-annealed placeholder) · placeholder 조성 교정(AISI 4340 Ni 누락·CP Ti O함량) · 레지스트리 points self-consistent. 모두 ID-키 교정(`r226-value-corrections.json`), round-trip 무손실.
- **R226c 주조 합금**: 합성 as-cast 제거 후 실제 주조 합금 7종 추가 (CF8/CF8M/CF3/CF3M cast SS·WCB/WCC cast 강·cast Ti-6-4) — `data/cast-alloys.json` (ASTM A351/A216/B367 검증값, build-materials 가 supRaw 합류). **cross-ref**: cast↔wrought 를 `related[]` 로 연결 → `findSimilar` 가 유사재료 **상단 pin** ("↔ 대응 합금" 배지). `related` 는 slim index 에 포함.
- **R226d 출처·대응합금·정리**: (1) generic 'reference' 해소 — 전체 generic entry 의 search-link(MatWeb QuickText·범용검색·위키·URL없음) 제거 + 권위 family 출처 보강(`sourcesBySubcategory`, 20 metal 족보: ASM Handbook Vol.1철계/Vol.2비철 + ASTM A29/A108/A240). MatWeb DataSheet GUID 등 특정 datasheet 보존. (2) **cross-standard 별칭**(`aliasesByBase`, primary-designation 매칭) — 근사동일(같은 조성 다른 규격명): Carbon Steel `S_C`/KS `SM_C`·Aluminum `JIS A`·Copper `JIS C`(4자리)·Tool Steel `SKD`/`STD`·`SKH`·Inconel `NCF`·die-cast Al `ADC`; 근사대응('≈' 명기, 다른 규격·유사 grade): structural steel A36≈SS400·A572Gr50≈SM490·A992≈SN490·A516Gr70≈SGV480·A588≈SMA490W. 검색(useMaterialFilter name+aliases)·상세 Designations 연동 — "ADC-10"→A380. (3) **A588 Grade A** σy 250(A36 항복값 오기)→345·UTS 475→485 교정(ASTM A588/A588M-19·SSAB mill 검증; 조성·HB 는 정합). 값오염 전수 스윕(4-튜플·물리정합·약한provenance) 결과 A588 은 고립 케이스. (4) 출처 라벨 정리(placeholder→URL 도메인 기반 서술 라벨, `build-from-registry` presentation 도출) + AA 2024-T351 중복 조건 제거(`remove.ids`).
- **Process canon** (R213): DMLS·SLM are vendor names for LPBF → canonicalised to `LPBF` (same alloy×condition AM variants merge). Manufacturer `SLM Solutions` → `Nikon SLM Solutions` (2022 Nikon 인수 사명 변경).
- **Family-aware data backfill** (Sprint 4):
  - KIC fallback (C2): 814 alloys get a `class`-confidence KIC value from ASM Vol.1·2 family typicals → 82% coverage.
  - Fatigue fallback (C1): 759 alloys get a `derived`-confidence σ_f ≈ k·σ_y (Shigley · k=0.38–0.52 by family) → 89% coverage.
  - Elevated-temp & creep curves (C3): 30+ alloys (Inconel 617/625/718/X-750/Waspaloy, Haynes 230, Hastelloy X, Ti-6Al-4V, 17-4 PH, P91, 800H, CoCrMo, etc).
- **Anomaly detection**: `build:data`(build-from-registry)가 **최종 데이터** 기준 검출 → 2 (high 0 / med 0 / low 2) per `build-meta.json`. (구 `build-materials.mjs`는 소스 부착 전 검출로 ~159 과다집계 — cutover가 정합. 테스트는 `anomaliesBySeverity.high===0`만 게이트.)
- Material schema: `{id, name, category, subcategory, process, manufacturer, composition, ranges, sources[{label,url,verified}], tier, points[], elevated_temp?[], creep_rupture?[], meta}`.

## Layout
- `client/src/` — React app:
  - `pages/Home.tsx` — 3-panel main page (filter sidebar · table/cards/Ashby view · detail panel) with header (search, language, units, guide, tools, ?, favorites, collections, compare).
  - `pages/Guide.tsx` — 14-chapter learning Guide with sticky search bar, mobile collapsible chapters, S-N / Goodman / AM-anisotropy / post-process SVG illustrations, external reference links (74 verified URLs).
  - `pages/Tools.tsx` — 9-calculator Engineering Tools page (Kt · Galvanic · Buckling · CTE · Hardness · Pressure vessel · LMP creep · Mohr · Schaeffler).
  - `pages/guide/` — Guide sub-modules: `components.tsx` (Chapter, F symbol-glossary, Note, Scenario, ExtLink), `svgs.tsx`, `index-entries.ts` (Guide search index).
  - `components/` — AshbyChartPlotly · ComparePanel (Table/Radar/Goodman views + best-pick + weighted score + PDF print) · MaterialDetail (Properties/Composition/Process tabs with elev-temp/creep curves, machinability/CET, HT glossary, confidence legend, favorite star) · GoodmanChart · RadarChart · OnboardingTour (6-step welcome) · ScenarioDialog (with apply-preview) · FilterSidebar · MaterialTable (bulk-select header) · ErrorBoundary (network/TDZ classification).
  - `lib/` — `materials.ts` (types + property metadata) · `composition-*.ts` · `ht-glossary.ts` (26 HT conditions) · `welding-machinability.ts` (CET + machinability) · `i18n.tsx` (KO/EN) · `unit-convert.ts` (SI/Imperial).
- `server/index.ts` — tiny Express static server for production builds + security headers (CSP, X-Content-Type-Options, etc).
- `scripts/` — `build-from-registry.mjs` (**`build:data`** — 레지스트리→산출물) · `build-materials.mjs`+`build-registry.mjs` (**`build:registry`** — 6소스→레지스트리 재생성) · `audit-registry.mjs` (`audit:registry`) · `verify-datasheet-urls.mjs` (`pnpm verify:urls`) · `verify-guide-links.mjs` (`pnpm verify:guide`).
- `tests/` — vitest: `cross-sections.test.ts` · `welding-machinability.test.ts` · `ht-glossary.test.ts` · `fuzzy-search.test.ts` (47 tests).
- `.github/workflows/ci.yml` — GitHub Actions: pnpm install → check → test → build on push/PR to main.

## Permanent user policies
- **No dark mode** — `dark:` classes / ThemeProvider permanently forbidden (see memory/feedback_no_dark_mode.md).
- **Structural materials only** — no piezoelectric / dielectric / cathode emitter / varistor functional materials (memory/feedback_structural_only.md).
- **No Pareto 3D** — visualization permanently retired (memory/feedback_no_pareto_3d.md).
- **No use-before-define in useMemo blocks** — single-declaration policy after R54a/R54b TDZ regression (memory/feedback_no_use_before_define.md).

## De-Manus status — complete
Recovered from the Manus platform; all Manus-specific code removed:
`vite-plugin-manus-runtime`, debug-collector, storage-proxy, umami analytics,
`ManusDialog.tsx`, OAuth helper (`const.ts` + `shared/const.ts`), manus `allowedHosts`,
`client/public/__manus__/`, plus dead code (`AshbyChart.tsx` non-Plotly, `Map.tsx`,
duplicate `client/src/data/materials.json`) and junk deps (`add`, `@types/google.maps`).
`recharts` is kept — used by `ScatterChart.tsx` and `ui/chart.tsx`.
