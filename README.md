# AM Materials Explorer

ANSYS Granta-style **additive-manufacturing (AM) materials database** — an interactive
web app for exploring metal & polymer materials through dynamic Ashby charts, advanced
filtering, **range-based property data**, and **cited manufacturer datasheets**.

> 적층제조(AM) 소재 데이터베이스 탐색기. 대화형 Ashby 차트, 고급 필터링, **물성 range 데이터**,
> **데이터시트 출처 추적**을 제공합니다.

## Features
- **Range-based properties** — every property is a `min · typical · max` aggregated from real data points (heat treatments × build direction × vendors), shown as smooth property envelopes on the Ashby chart and min–max sub-lines in the detail panel.
- **Interactive Ashby chart** (Plotly.js) — selectable X/Y axes, per-axis log toggles + limit sliders, convex-hull envelopes, compare-selection colouring, and a Display panel of visibility toggles (grid, legend, labels, opacity, dark theme, colour-by).
- **3-panel layout** — filter sidebar · data view (table / cards / Ashby) · detail & compare panel (per-property bars + click-to-sort).
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
Production build: `pnpm build` · Type-check: `pnpm check` · Tests: `pnpm test`

## Deploy (GitHub Pages)
The app is a pure static SPA and ships with a GitHub Actions workflow that builds and
publishes it to Pages on every push to `main`. One-time setup: **Settings → Pages →
Source = "GitHub Actions"**. Live URL: `https://slmhlight.github.io/GRANTA/`.
Full instructions: [`docs/DEPLOY_GITHUB_PAGES.md`](./docs/DEPLOY_GITHUB_PAGES.md).

## Data
**690 materials** across metals & polymers — curated AM alloys (verified manufacturer
datasheets), AM vendor data, condition-split generics, and standard reference alloys with
cross-standard designations (UNS/EN/DIN/JIS/GB/AMS). Each property is a real `min · typical · max`
range; fatigue limits are measured where available and otherwise estimated from UTS (clearly
flagged `est.`). Source provenance and integrity checks: [`data/validation-report.md`](./data/validation-report.md).

## License
MIT
