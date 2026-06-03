# AM Materials Explorer — Data Validation Report

Generated from `material_db.json` (46 curated) + `AM_Materials_DB_enriched.csv` (2908 rows).

## Output
- **1038 materials**: 99 curated · 7 am_vendor · 454 generic
- Dropped 499 CSV rows that duplicate curated AM alloys (curated db is the richer source).

## Property range coverage
| property | has range | non-degenerate (max>min) |
|---|---|---|
| density | 1038/1038 | 0 |
| yield_strength | 1036/1038 | 670 |
| uts | 1029/1038 | 668 |
| elongation | 997/1038 | 667 |
| modulus | 1038/1038 | 48 |
| hardness | 895/1038 | 575 |
| thermal_conductivity | 1038/1038 | 2 |
| fatigue_strength | 926/1038 | 839 |
| impact_strength | 167/1038 | 167 |

## Sources (Task 2)
- Materials with ≥1 **verified datasheet URL**: 537/1038 (all curated + ref_urls).
- Raw CSV had `source=Unknown` for 2368/2908 rows; curated provenance restored from `ref_urls`.
- Generic & am_vendor tiers enriched with a family handbook reference + a MatWeb QuickText search link (verifiable URLs, not fabricated datasheets).

## Integrity fixes
- Removed **1** corrupt CSV row(s) (e.g. `material_name="0"`).
- AA aluminium series subcategory auto-corrected: **104** materials.
- Process labels canonicalised: {"Casting":"Cast","Die Casting":"Cast","Sand Casting":"Cast","Investment Casting":"Cast","Cast/Wrought":"Wrought"}.
- Placeholder `corrosion_resistance=0` in 2313 raw rows (treated as “unknown”, not 0).
- Empty fatigue/impact in 2364 raw rows (left null, not zero).

## Subcategory mismatch flags (33) — manual review
- Inconel 100: Aluminum - Pure/Other / Nickel Superalloy
- C26000: Copper - Brass (Cu-Zn) / Titanium - Pure/Other
- C27000: Copper - Brass (Cu-Zn) / Titanium - Pure/Other
- C28000: Copper - Brass (Cu-Zn) / Titanium - Pure/Other
- C44300: Copper - Brass (Cu-Zn) / Titanium - Pure/Other
- C11000: Copper - Pure/Other / Titanium - Pure/Other
- C12000: Copper - Pure/Other / Titanium - Pure/Other
- C14500: Copper - Pure/Other / Titanium - Pure/Other
- C17200: Copper - Pure/Other / Titanium - Pure/Other
- Monel 400: Copper - Pure/Other / Titanium - Pure/Other
- Hastelloy C-276: Nickel - Hastelloy / Titanium - Pure/Other
- Inconel 600: Nickel - Inconel Superalloy / Titanium - Pure/Other
- Inconel X-750: Nickel - Inconel Superalloy / Titanium - Pure/Other
- 15-5PH: Nickel - Other Superalloy / Stainless Steel - Austenitic
- Epoxy Resin: Polymer - Epoxy/Thermoset Resin / Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA)
- Polyester Resin: Polymer - Epoxy/Thermoset Resin / Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA)
- HDPE: Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA) / Polymer - Polyethylene
- LDPE: Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA) / Polymer - Polyethylene
- PC: Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA) / Polymer - Polycarbonate
- PE: Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA) / Polymer - Polyethylene
- PEEK: Polymer - Nylon (FDM/SLS) / Polymer - PEEK (FDM)
- PEI: Polymer - Nylon (FDM/SLS) / Polymer - PEI/ULTEM (FDM)
- PES: Polymer - Nylon (FDM/SLS) / Polymer - PES (FDM)
- PMMA: Polymer - Nylon (FDM/SLS) / Polymer - PMMA (Acrylic) / Polymer - Photopolymer Resin (SLA)
- PP: Polymer - Nylon (FDM/SLS) / Polymer - PP (FDM)

## R34 — Category Expansion & Normalization Summary

### Category counts
| Category | Count | Distinct subcategories |
|---|---|---|
| Metal | 855 | (multiple) |
| Polymer | 110 | 44 |
| Ceramic | 39 | 9 |
| Composite | 34 | — |

### Metal subcategory canonicalization (R36c)
- 349 metal entries had their subcategory rewritten by `METAL_SUB_RULES`.
- Stainless: Stainless / Stainless Steel / PH Stainless → "Stainless Steel - Austenitic / Ferritic·Martensitic / Duplex / PH".
- Nickel: Nickel-based / Nickel Alloy / Nickel Superalloy / Hastelloy / Inconel / Monel / Haynes 등 → "Nickel Superalloy - <subfamily>".
- Cobalt: Cobalt Chrome / Cobalt-based → "Cobalt Alloy - Chrome / Wear".
- Copper: Copper / Copper Alloy / Copper-based / Brass / Bronze / Cu-Be / Cu-Ni → "Copper Alloy - <subfamily>".
- Steel: Carbon Steel / Steel / Carbon-Low-alloy → "Carbon Steel"; Maraging / Tool / Cast Iron 분리.

### Polymer subcategory canonicalization (R34c)
- 63 polymer entries had their subcategory rewritten by the canonicalization pass (`POLY_SUB_RULES`).
- PEEK / PEEK CF, PEKK / PEKK CF, PA / PA GF / PA CF, ULTEM / ULTEM GF kept distinct (reinforcement variants have meaningfully different properties).
- "Polymer - Nylon (FDM/SLS)" residual count: 1 — unmatched entries fall back to category-specific subcategory.

### Temperature & creep coverage
- 301 materials carry σy/UTS vs temperature data (was 241 before R34a, gain +60 mostly polymer).
- 260 have Young's modulus vs T (E(T)).
- 109 have creep rupture curves (Ni superalloys, no change in R34).

## R48a — Anomaly Detection

Total: **330** — high 0 / medium 0 / low 330

### By kind
| Kind | Count |
|---|---|
| no verified source URL | 326 |
| Ni Superalloy E out of [185, 235] GPa | 3 |
| Steel family E out of [175, 225] GPa | 1 |

### LOW severity (showing 10 / 330)
| Material | Kind | Detail |
|---|---|---|
| Ti5-8-5 — As-supplied (LPBF) | no verified source URL |  |
| Bronze — As-supplied (Binder Jetting) | no verified source URL |  |
| AISI 5130 — Aged / solution-treated (Wrought) | no verified source URL |  |
| AISI 5130 — Annealed (Wrought) | no verified source URL |  |
| AISI 5130 — As-cast / forged (Wrought) | no verified source URL |  |
| AISI 5130 — Strain-hardened (Wrought) | no verified source URL |  |
| AISI 5130 — As-supplied (Wrought) | no verified source URL |  |
| AISI 5130 — Quenched / tempered (Wrought) | no verified source URL |  |
| AISI 5140 — Aged / solution-treated (Wrought) | no verified source URL |  |
| AISI 5140 — Annealed (Wrought) | no verified source URL |  |

## Cost Data Provenance

- Bulk pricing typical from **2026 Q1** snapshots (LME 2026-01 / Special Metals 2026 price book / MatWeb 2026).
- Actual quotes from vendors vary ±30% (volume, lead time, region).
- Tier 1 alloys (Inconel/Hastelloy/Ti): Special Metals / Haynes published list price.
- Tier 2 (Wrought 강·Al·Cu): LME spot + vendor markup ~15-30%.
- Polymer: resin grade pellet price (Victrex / SABIC / EOS published).
- AM powder: typical 2-4× wrought equivalent (atomization premium).
- **Refresh frequency**: quarterly. Last sync: 2026-Q1.

## TODO
- Hardness scale unification (HV/HRC/HB).
- Reconcile fatigue/impact gaps where datasheets provide values.
- (R34d candidate) Polymer creep rupture curves (PEEK / ULTEM / PEKK 100–200°C, 1000–10⁴ h).