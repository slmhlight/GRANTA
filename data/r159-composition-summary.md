# R159 — Ceramic + Polymer Composition Reinforcement

Generated: 2026-06-06

## Problem
Before R159:
- **Ceramic: 0/39 (0%)** had composition data
- **Polymer: 33/133 (25%)** had composition — and **33 of those were buggy** (metal elements like Fe/Si/Al
  from CSV columns wrongly applied to polymers like ABS, PC-ABS, Epoxy)

Root causes:
1. Build pipeline's `compositionFromRows()` extracted metal-element columns regardless of category.
2. `loadCeramicsAsMaterials()` defaulted to empty composition.
3. `loadPolymersAsMaterials()` hardcoded `composition: {}` even when source data had it.

## Fixes applied

### 1. Build pipeline bug fix (`scripts/build-materials.mjs`)
- `compositionFromRows(g, category)` now returns `{}` for `Polymer`/`Ceramic`/`Composite` categories.
  Metal element columns from CSV are ignored for non-metal categories.
- `loadPolymersAsMaterials()` now passes through `p.composition` from source instead of hardcoding `{}`.

### 2. Ceramic composition derivation (`scripts/r159-add-ceramic-composition.mjs`)
Derives composition from chemical formula in each ceramic's name.

Algorithm:
1. Try name-keyword lookup first (e.g., "Zirconia" → ZrO₂ regardless of stabilizer phrasing).
2. Fall back to formula extraction from parens (e.g., "(Al₂O₃)" → parse).
3. Convert stoichiometry → element mass percentage using IUPAC atomic weights.

Result: **39/39 ceramics (100%) now have composition**.

Examples:
| Ceramic | Composition |
|---|---|
| Alumina (Al₂O₃) | Al 52.9%, O 47.1% |
| Zirconia (Y-TZP) | Zr 74.0%, O 26.0% |
| Silicon Nitride (Si₃N₄) | Si 60.1%, N 39.9% |
| Silicon Carbide (SiC) | Si 70.1%, C 29.9% |
| Diamond | C 100% |

### 3. Polymer composition derivation (`scripts/r159-add-polymer-composition.mjs`)
Derives composition from monomer repeat-unit formula.

Algorithm:
1. Lookup by subcategory keyword (e.g., "Polymer - PEEK" → C₁₉H₁₂O₃).
2. Fall back to name keyword (e.g., name contains "delrin" → POM CH₂O).
3. Convert stoichiometry → element mass percentage.

Coverage: **45 polymer entries in source data updated** (39 in polymers-data.json + 56 in supplementary-materials.json).

After rebuild, polymer composition coverage in client/public/materials/polymer.json:
- **106/133 (80%)** have composition

Examples:
| Polymer | Composition |
|---|---|
| PEEK | C 79.2%, H 4.2%, O 16.7% |
| ULTEM (PEI) | C 75.0%, H 4.1%, N 4.7%, O 16.2% |
| PA12 | C 73.0%, H 11.7%, N 7.1%, O 8.1% |
| POM (Delrin) | C 40.0%, H 6.7%, O 53.3% |
| PVDF (Kynar) | C 37.5%, H 3.1%, F 59.3% |
| PTFE (Teflon) | C 24.0%, F 76.0% |

## Final coverage
| Category | Before | After | Coverage |
|---|---|---|---|
| Ceramic | 0/39 (0%) | 39/39 | **100%** |
| Polymer | 33/133 (25%) — buggy | 106/133 | **80%** |
| Composite | 19/34 (56%) | 19/34 | 56% (unchanged) |

The remaining 27 polymers without composition are CSV-derived generic entries — the build pipeline
now correctly leaves them empty (instead of populating with wrong metal element values).
The 15 composites without composition are fiber+matrix combinations requiring per-entry derivation
(deferred — composites are typically characterized by V_fiber + matrix family rather than elements).

## Verification
- 273/273 tests pass
- TypeScript check clean
- materials.json rebuild successful

## Scripts added
- `scripts/r159-add-ceramic-composition.mjs` — formula → mass % derivation for ceramics
- `scripts/r159-add-polymer-composition.mjs` — monomer formula → mass % for polymers

## Files changed
- `data/ceramics-data.json` — 39 composition entries added
- `data/polymers-data.json` — 39 composition entries added
- `data/supplementary-materials.json` — 56 polymer composition entries added
- `scripts/build-materials.mjs` — bug fix (skip metal composition for non-metals + pass through polymer composition)
