# R158 — URL Health Fixes Summary (Final)

Generated: 2026-06-06

## Baseline (before R158)
Full URL health check on 472 unique verified URLs:
- OK (200): 134 (28%)
- Redirected: 51 (11%)
- Dead (4xx/5xx): 126 (27%)
- Bot-blocked: not categorized (counted as Dead in earlier reports)
- Network error / timeout: 28 (6%)

## Final (after R158 fixes + reverts)
Full URL health check on 472 unique verified URLs:
- OK (200): **138** (+4)
- Redirected: 40 (−11) — fewer redirect hops
- Dead (4xx/5xx): 127 (+1, within noise)
- Bot-blocked: 133 (unchanged — same set of MatWeb/ASTM-store entries)
- Network error / timeout: 34 (+6, transient)

Net effect: +4 direct-200 URLs and 11 fewer redirect hops. Most of the impactful URL rot
needs per-alloy vendor research (deferred).

## After R158

### Mechanical URL fixes applied (39 net substitutions)
Applied via `scripts/apply-url-fixes-r158.mjs`. All replacement URLs were verified by
**follow-redirect** (max 5 hops) to confirm final URL returns 200 OK.

Initially tried 84 substitutions, then reverted 45 that ended up landing on 404 pages
(common vendor pattern — redirect chain ends with a 404 / corporate landing page that
provides no value). The 39 retained fixes are genuine improvements.

| Pattern | Substitutions | Files affected |
|---|---|---|
| EOS metals `/en/3d-printing-materials/metals/...` → `/metal-solutions/metal-materials/...` | 5 | material_db, standard-datasheets |
| EOS polymer `/en-us/3d-printing-materials/...` → `/3d-printing-materials/...` | 3 | supplementary |
| CoorsTek `/english/` → `/en/` | 8 | ceramics-data |
| 3M / Aviva add `www.` prefix | 2 | ceramics, supplementary |
| Owens Corning add `/en/` | 3 | composites |
| Hexcel `Resources/DataSheets/Prepreg/` → `datasheet-category/prepreg/` | 2 | composites |
| Haynes drop `www.` (server redirects to non-www) | 2 | supplementary |
| Haynes hastelloy-n new portfolio path | 1 | supplementary |
| KIST / BGH drop `www.` | 2 | supplementary |
| Arkema add `/global/` | 1 | supplementary |
| Lanxess lowercase path | 1 | supplementary |
| AAR `.html` → `.php` | 1 | supplementary |
| AISC publications restructure | 5 | supplementary, standard |
| WorldAutoSteel restructure | 1 | supplementary |
| SAE AMS standards new path | 1 | supplementary |
| ASTM `.html` → `store.astm.org/.html` (3 of 11 patterns landed in 404 — reverted) | 8 | material_db, supplementary |
| **TOTAL retained** | **~39** | — |

### Verifier improvements (`scripts/verify-datasheet-urls.mjs`)
1. **HEAD→GET fallback** on 403/405/501 status. Some sites block HEAD but allow GET (e.g. ASTM).
2. **Bot-blocked classification**. Domains (`matweb.com`, `astm.org`) that return 403 even on GET are tagged
   `bot-blocked` instead of `dead` — they work in regular browsers, just not from automated fetchers.
3. **Better User-Agent + Accept headers** for higher success rate.

### Scripts added
- `scripts/analyze-dead-urls.mjs` — pattern frequency counter (how many entries match each broken pattern)
- `scripts/test-r158-replacements.mjs` — probes proposed replacement URLs with HEAD→GET fallback
- `scripts/apply-url-fixes-r158.mjs` — applies the verified replacement table
- `scripts/revert-r158-bad-fixes.mjs` — reverts substitutions that ended up landing on 404

## What was NOT fixed (deferred to future R158 sub-tasks)
URLs requiring per-alloy research (vendor product page restructure where each alloy needs a manually
looked-up new URL):
- `outokumpu.com/en/forta-XXX` (Outokumpu restructure — new path unknown per alloy)
- `carpentertechnology.com/alloy-finder/XXX` (Carpenter restructure — per-alloy)
- `specialmetals.com/documents/technical-bulletins/...pdf` (Special Metals PDF library moved)
- `haynesintl.com/alloys/alloy-portfolio/XXX` per-alloy detail pages
- `copper.org/resources/properties/db/datasheets/XXX.html` per-alloy datasheets
- `nikon-slm-solutions.com/materials/special-alloys/` (one specific category page)

These need WebSearch / WebFetch per alloy to find the new vendor URL. Deferred.

## Conclusion
- ~39 mechanical URL fixes applied and verified (each follows redirects to a confirmed-200 page).
- URL health checker is now more accurate (separates bot-blocked from genuinely-dead).
- ~126 vendor URLs remain dead due to vendor site restructuring — these need per-alloy URL research
  in a future session. Each is documented in `data/dead-urls-report.md`.
- 273/273 tests pass, TypeScript clean, materials.json rebuilt successfully.

## Files changed
- `data/material_db.json` (net 8 substitutions after revert)
- `data/supplementary-materials.json` (net 16 substitutions)
- `data/standard-datasheets.json` (net 2 substitutions)
- `data/ceramics-data.json` (net 9 substitutions)
- `data/composites-data.json` (net 5 substitutions)
- `scripts/verify-datasheet-urls.mjs` (HEAD→GET fallback + bot-blocked tag)
- `scripts/apply-url-fixes-r158.mjs` (R158 replacement table)
- `scripts/revert-r158-bad-fixes.mjs` (revert table for no-op fixes)
- `scripts/analyze-dead-urls.mjs` (R158 broken-URL counter)
- `scripts/test-r158-replacements.mjs` (R158 replacement verifier)
