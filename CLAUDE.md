# AM Materials Explorer — Project Guide

ANSYS Granta-style additive-manufacturing materials database. Interactive Ashby
charts, advanced filtering, range-based material properties with cited datasheets.

## Stack
React 19 · Vite 7 · TypeScript · Tailwind CSS 4 · shadcn/ui · **Plotly.js** (Ashby chart) · wouter · pnpm 10.

## Run (Windows dev machine)
- **Node 24 LTS** is installed at `C:\Program Files\nodejs` but is **NOT on the default shell PATH** — prepend it when calling node/npm/pnpm from a shell:
  `$env:Path = "C:\Program Files\nodejs;$env:APPDATA\npm;$env:Path"`
- **pnpm 10.4.1** is installed globally via npm (lives in `%APPDATA%\npm`).
- Install deps: `pnpm install`
- Dev server: `pnpm dev` (Vite on http://localhost:3000), or via the Preview tool `preview_start` config **`am-materials`** in `.claude/launch.json` (runs `node node_modules/vite/bin/vite.js` directly, PATH-independent).
- Type-check: `pnpm check`  ·  Build: `pnpm build`

> Note: in the current agent environment the **preview screenshot tool times out** even when the app is healthy — verify via `preview_eval` / DOM probes / `preview_console_logs` instead.

## Data pipeline
- Sources (in `data/`): `material_db.json` (46 curated AM alloys — composition ranges, per-vendor/heat-treatment measured values, verified `ref_urls`) + `AM_Materials_DB_enriched.csv` (2909 flat rows of conventional + AM data).
- Build: `pnpm build:data` (= `node scripts/build-materials.mjs`) → regenerates `client/public/materials.json` and `data/validation-report.md`. Original 2902-row dataset backed up once at `data/materials.original.json`.
- **Range model**: rows are grouped into **216 materials** (46 `curated` + 6 `am_vendor` + 164 `generic`). Each numeric property is `{min, max, typical, n}` aggregated from real data points (conditions × build direction × vendors). No values or citations are fabricated; generic rows without a real source are labelled "Generic reference (ASM-derived)".
- Material schema (per entry): flat `typical` fields (back-compat) + `ranges`, `sources[]` (`{label,url,verified}`), `tier`, `composition` (`{element: "min~max"|"balance"|"≤x"}`), `manufacturers[]`, `machines[]`, `processes[]`, `meta`.

## Layout
- `client/src/` — React app. `pages/Home.tsx` (3-panel layout), `components/AshbyChartPlotly.tsx` (range error-bars), `components/MaterialDetail.tsx` (range + sources), `lib/materials.ts` (types + property metadata), `lib/composition-*.ts`, `hooks/`.
- `server/index.ts` — tiny Express static server for production builds.
- `scripts/build-materials.mjs` — data build pipeline.

## De-Manus status
Recovered from the Manus platform; Manus-specific code is being removed.
Done: `vite-plugin-manus-runtime`, debug-collector, storage-proxy, umami analytics.
Pending: `ManusDialog.tsx`, OAuth helper in `lib/const.ts`, manus `allowedHosts` in vite.config, `client/public/__manus__/`, dead `AshbyChart.tsx` (non-Plotly).
