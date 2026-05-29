# AM Materials Explorer

ANSYS Granta-style **additive-manufacturing (AM) materials database** — an interactive
web app for exploring metal & polymer materials through dynamic Ashby charts, advanced
filtering, **range-based property data**, and **cited manufacturer datasheets**.

> 적층제조(AM) 소재 데이터베이스 탐색기. 대화형 Ashby 차트, 고급 필터링, **물성 range 데이터**,
> **데이터시트 출처 추적**을 제공합니다.

## Features
- **Range-based properties** — every property is a `min · typical · max` aggregated from real data points (heat treatments × build direction × vendors), shown as error bars on the Ashby chart and min–max sub-lines in the detail panel.
- **Interactive Ashby chart** (Plotly.js) — selectable X/Y axes, log-log scatter, box-zoom / pan / PNG export, filter highlighting, click-to-select.
- **3-panel layout** — filter sidebar · data view (table / cards / scatter / Ashby) · detail & compare panel.
- **Source traceability** — curated AM alloys link to verified manufacturer datasheets (EOS, Renishaw, GE Additive, 3D Systems, …); no fabricated citations.
- **CSV export** of filtered results.

## Tech stack
React 19 · Vite 7 · TypeScript · Tailwind CSS 4 · shadcn/ui · Plotly.js · wouter · pnpm 10

## Quick start
```bash
pnpm install
pnpm dev          # http://localhost:3000
```
Build the dataset from sources (optional — output is committed):
```bash
pnpm build:data   # data/material_db.json + enriched CSV → client/public/materials.json
```
Production build: `pnpm build` · Type-check: `pnpm check`

See [`CLAUDE.md`](./CLAUDE.md) for environment notes and [`docs/PROJECT_PLAN.md`](./docs/PROJECT_PLAN.md) for the full plan.

## Data
216 materials — 46 curated AM alloys, 6 AM vendor-data alloys, 164 generic reference alloys.
Source provenance and integrity fixes are summarized in [`data/validation-report.md`](./data/validation-report.md).

## License
MIT
