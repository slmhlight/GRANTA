# AM Materials Explorer — Data Validation Report

Generated from `material_db.json` (46 curated) + `AM_Materials_DB_enriched.csv` (2908 rows).

## Output
- **216 materials**: 46 curated · 6 am_vendor · 164 generic
- Dropped 67 CSV rows that duplicate curated AM alloys (curated db is the richer source).

## Property range coverage
| property | has range | non-degenerate (max>min) |
|---|---|---|
| density | 216/216 | 0 |
| yield_strength | 212/216 | 204 |
| uts | 206/216 | 200 |
| elongation | 212/216 | 203 |
| modulus | 216/216 | 2 |
| hardness | 199/216 | 186 |
| thermal_conductivity | 216/216 | 2 |
| fatigue_strength | 27/216 | 27 |
| impact_strength | 27/216 | 27 |

## Sources (Task 2)
- Materials with ≥1 **verified datasheet URL**: 46/216 (all curated + ref_urls).
- Raw CSV had `source=Unknown` for 2368/2908 rows; curated provenance restored from `ref_urls`.
- Generic & am_vendor tiers enriched with a family handbook reference + a MatWeb QuickText search link (verifiable URLs, not fabricated datasheets).

## Integrity fixes
- Removed **1** corrupt CSV row(s) (e.g. `material_name="0"`).
- AA aluminium series subcategory auto-corrected: **15** materials.
- Process labels canonicalised: {"Casting":"Cast","Die Casting":"Cast","Sand Casting":"Cast","Investment Casting":"Cast","Cast/Wrought":"Wrought"}.
- Placeholder `corrosion_resistance=0` in 2313 raw rows (treated as “unknown”, not 0).
- Empty fatigue/impact in 2364 raw rows (left null, not zero).

## Subcategory mismatch flags (35) — manual review
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
- Hastelloy X: Nickel - Hastelloy / Titanium - Pure/Other
- Inconel 600: Nickel - Inconel Superalloy / Titanium - Pure/Other
- Inconel 625: Nickel - Inconel Superalloy / Titanium - Pure/Other
- Inconel 718: Nickel - Inconel Superalloy / Titanium - Pure/Other
- Inconel X-750: Nickel - Inconel Superalloy / Titanium - Pure/Other
- Epoxy Resin: Polymer - Epoxy/Thermoset Resin / Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA)
- Polyester Resin: Polymer - Epoxy/Thermoset Resin / Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA)
- HDPE: Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA) / Polymer - Polyethylene
- LDPE: Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA) / Polymer - Polyethylene
- PC: Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA) / Polymer - Polycarbonate
- PE: Polymer - Nylon (FDM/SLS) / Polymer - Photopolymer Resin (SLA) / Polymer - Polyethylene
- PEEK: Polymer - Nylon (FDM/SLS) / Polymer - PEEK (FDM)
- PEI: Polymer - Nylon (FDM/SLS) / Polymer - PEI/ULTEM (FDM)
- PES: Polymer - Nylon (FDM/SLS) / Polymer - PES (FDM)

## TODO
- Hardness scale unification (HV/HRC/HB).
- Reconcile fatigue/impact gaps where datasheets provide values.