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
- Sources (in `data/`): `material_db.json` (46 curated AM alloys) + `AM_Materials_DB_enriched.csv` + `supplementary-materials.json` (~390 reference alloys) + `ceramics-data.json` (39 structural ceramics) + `composites-data.json` (34 composites).
- Build: `pnpm build:data` → regenerates `client/public/materials.json`, `client/public/build-meta.json` (R69), and `data/validation-report.md`.
- **1,198 materials** total — live counts in `client/public/build-meta.json` (SSOT). By category: 992 Metal · 133 Polymer · 39 Ceramic · 34 Composite. By tier: 99 curated · 3 am_vendor · 275 generic (CSV) · remainder reference (supplementary).
- **Process canon** (R213): DMLS·SLM are vendor names for LPBF → canonicalised to `LPBF` (same alloy×condition AM variants merge). Manufacturer `SLM Solutions` → `Nikon SLM Solutions` (2022 Nikon 인수 사명 변경).
- **Family-aware data backfill** (Sprint 4):
  - KIC fallback (C2): 814 alloys get a `class`-confidence KIC value from ASM Vol.1·2 family typicals → 82% coverage.
  - Fatigue fallback (C1): 759 alloys get a `derived`-confidence σ_f ≈ k·σ_y (Shigley · k=0.38–0.52 by family) → 89% coverage.
  - Elevated-temp & creep curves (C3): 30+ alloys (Inconel 617/625/718/X-750/Waspaloy, Haynes 230, Hastelloy X, Ti-6Al-4V, 17-4 PH, P91, 800H, CoCrMo, etc).
- **Anomaly detection**: 159 anomalies (high 0 / med 0 / low 159) per `build-meta.json` (R71 B excluded 17 specialty Ni superalloys: Monel · single-crystal CMSX/Rene/PWA · ODS · low-CTE Inconel-783).
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
- `scripts/` — `build-materials.mjs` (data pipeline) · `verify-datasheet-urls.mjs` (`pnpm verify:urls`) · `verify-guide-links.mjs` (`pnpm verify:guide`).
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
