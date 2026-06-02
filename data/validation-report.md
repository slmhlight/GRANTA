# AM Materials Explorer — Data Validation Report

Generated from `material_db.json` (46 curated) + `AM_Materials_DB_enriched.csv` (2908 rows).

## Output
- **904 materials**: 99 curated · 7 am_vendor · 473 generic
- Dropped 379 CSV rows that duplicate curated AM alloys (curated db is the richer source).

## Property range coverage
| property | has range | non-degenerate (max>min) |
|---|---|---|
| density | 904/904 | 0 |
| yield_strength | 902/904 | 684 |
| uts | 895/904 | 682 |
| elongation | 857/904 | 681 |
| modulus | 904/904 | 47 |
| hardness | 777/904 | 589 |
| thermal_conductivity | 904/904 | 2 |
| fatigue_strength | 803/904 | 626 |
| impact_strength | 136/904 | 136 |

## Sources (Task 2)
- Materials with ≥1 **verified datasheet URL**: 141/904 (all curated + ref_urls).
- Raw CSV had `source=Unknown` for 2368/2908 rows; curated provenance restored from `ref_urls`.
- Generic & am_vendor tiers enriched with a family handbook reference + a MatWeb QuickText search link (verifiable URLs, not fabricated datasheets).

## Integrity fixes
- Removed **1** corrupt CSV row(s) (e.g. `material_name="0"`).
- AA aluminium series subcategory auto-corrected: **114** materials.
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
| Metal | 733 | (multiple) |
| Polymer | 96 | 44 |
| Ceramic | 45 | 13 |
| Composite | 30 | — |

### Polymer subcategory canonicalization (R34c)
- 51 polymer entries had their subcategory rewritten by the canonicalization pass (`POLY_SUB_RULES`).
- PEEK / PEEK CF, PEKK / PEKK CF, PA / PA GF / PA CF, ULTEM / ULTEM GF kept distinct (reinforcement variants have meaningfully different properties).
- "Polymer - Nylon (FDM/SLS)" residual count: 1 — unmatched entries fall back to category-specific subcategory.

### Temperature & creep coverage
- 260 materials carry σy/UTS vs temperature data (was 241 before R34a, gain +19 mostly polymer).
- 221 have Young's modulus vs T (E(T)).
- 80 have creep rupture curves (Ni superalloys, no change in R34).

## TODO
- Hardness scale unification (HV/HRC/HB).
- Reconcile fatigue/impact gaps where datasheets provide values.
- (R34d candidate) Polymer creep rupture curves (PEEK / ULTEM / PEKK 100–200°C, 1000–10⁴ h).