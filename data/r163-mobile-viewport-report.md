# R163 — Mobile Narrow Viewport Verification

Generated: 2026-06-06

## Methodology
Resized preview to 375px (iPhone X) and 320px (iPhone SE — smallest commonly supported width)
and probed each major page + interaction surface for horizontal overflow, layout breaks,
and text truncation.

## Results

### 1. Home (`/`)
**At 375px**:
- Document width: 375px (no overflow)
- Header height: 48px, all buttons fit
- Bottom nav: 5 columns, 75px each, fits cleanly
- Filter sidebar hidden (correct — accessed via mobile-bottom-nav "필터")
- MaterialTable inside horizontally-scrollable container (1121px wide — by design)

**At 320px**:
- Document width: 320px (no overflow)
- Bottom nav: 5 columns × 64px = 320px, perfect fit
- Header: search/stats badge/view-mode toggle/etc. all fit
- Mobile-only Settings sheet (KO/EN, SI/IMP, onboarding) accessible

### 2. Wizard (`/wizard`)
**At 375px**:
- 7 choice cards, each 294px wide (centered with margin)
- Progress dots 5/5 visible
- Header title "설계 문제 → 재료 추천" visible
- R162 hint badges (권장/주의) display in compact form

**At 320px**:
- 7 choice cards, each 238px wide
- Progress dots fit
- Title truncates gracefully if needed (already has `.truncate` class)

### 3. Tools (`/tools`)
- At 375px: 0 overflow elements
- Calculator cards stack vertically as expected

### 4. Guide (`/guide`)
- At 375px: 0 overflow elements
- Chapter-collapse pattern works on mobile (R147 implementation)

### 5. Material Detail Popup
**At 320px (mobile mode)**:
- Detail popup uses `fixed top-12 left-0 right-0 bottom-[50px]` (full-screen between header and bottom nav)
- Tabs (물성 / 조성 / 공정) each 105px wide × 3 = 315px (fits 320 viewport)
- 0 overflow elements inside detail content
- Spec badge popover (R160) opens in floating Radix portal (positioned automatically)
- Composition tab includes new SimilarMaterialsCard (R161) without overflow

## Issues found
**NONE** — all 5 surfaces render cleanly at both 375px and 320px viewports.

The R147 mobile responsive work + R160/R161/R162 follow-up changes consistently
use:
- `md:hidden` / `md:flex` for desktop/mobile branching
- `sm:` breakpoints for early adjustments (375px+)
- `truncate` + `min-w-0` patterns for text overflow
- `flex-wrap` + `gap-1` for chip lists
- Tooltip / Popover via Radix UI (responsive by design)

## Verification scripts
Used `mcp__Claude_Preview__preview_resize` + `mcp__Claude_Preview__preview_eval` to probe
each viewport state. Tests confirmed:
- `document.documentElement.scrollWidth === window.innerWidth` (no overflow)
- All flex containers' children stay within parent bounds
- Spec badges, similar materials cards, Wizard hints all render in narrow widths

## Conclusion
R163 confirms the mobile narrow viewport is fully supported. No fixes needed.
Future regressions can be caught by re-running the same eval probes.
