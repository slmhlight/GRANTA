# Changelog

All notable changes since R45 (post-Manus recovery). Format: `R##` references the round of work.

## R74 — Metal 산업군 추가 확장 (1,121 → 1,168)
이전 R72/R73이 다룬 metal 도메인(밸브·베어링·항공 disc·차체·보일러튜브·원자로) 외 미커버 metal 산업군 20종을 supplementary 에 추가. 모든 entry 에 `industry_note` 로 표준·OEM·기체 모델 명시.
- **철도 (Rail / Wheel)** — R260 (UIC 860 / EN 13674-1, 60E1 mainline), Class C wheel (AAR M-107, 39 t/axle heavy-haul)
- **방위 갑옷** — RHA MIL-A-46100 (M1 Abrams 핵체 / Bradley IFV / Stryker)
- **미사일 motor case / 항공 landing gear** — D6AC (Minuteman III / Trident D-5 / B-1B), HP 9-4-30 (F-14/15/16 main gear)
- **자동차 단조** — 38MnVS6 (BMW B57 · VW EA288 · MAN D2868 크랭크샤프트 microalloyed)
- **구조강 (Civil / Infrastructure)** — A992 (US W-shape, 모든 미국 빌딩·다리), S355J2+N (EU 다리·풍력 타워·선체), S275JR (EU general fabrication 95%), S690QL (Liebherr 크레인 boom, Cat 굴착기 stick), API 2H Gr.50 (Shell Mars / North Sea offshore jacket)
- **마모 / 광업** — Hardox 450 (Komatsu HD785 / Cat 793F dump body, 분쇄기 hopper)
- **스프링 (heavy-truck)** — AISI 9260 (Hino / Tata / Volvo FH leaf spring, John Deere disc plough)
- **공구강** — D2 Tool Steel (cold-work stamping die 글로벌 표준, Bohler K110 / Uddeholm Sverker 21), AISI H21 (W tool, 단조 die 적열경도 650°C)
- **로켓 엔진 (Cu 열교환 chamber)** — NARLOY-Z (SSME/RS-25 / Aerojet RL10), GRCop-84 (NASA RAMPT 2세대 AM, Raptor V2 candidate)
- **항공 / 우주 Al-Li** — AA 2195 (SLWT Shuttle / SLS LH2 tank / Falcon 9), AA 2050 Constellium AIRWARE (A380 lower wing / A350 fuselage frame / A220)
- **저온 LPG / 냉동 LNG 갑판 탱크** — ASTM A537 Class 2 (Statoil Mongstad NH₃ sphere, refrigerated propane bullet)

## R73 — Industry-standard 도메인 확장 (1,085 → 1,121)
보유 데이터가 풍부한 ceramic 영역(Macor, Mullite, Spinel, WC-Co, Sialon 등 이미 존재)은 건너뛰고, metal·composite·polymer 영역에 20종 추가. 각 metal entry 에 `industry_note`, composite/polymer entry 에 `applications` 상세 표기.
- **잠수함 / 수소 서비스 / 파이프라인** — HY-100 (Virginia·Seawolf hull), SA336 F22V (hydroprocessing reactor V-mod Cr-Mo), API 5L X65 PSL2 (sour offshore), API 5L X70 PSL2 (gas transmission), L80 Type 13Cr (CO₂ sweet OCTG)
- **마모 / 충격** — Hadfield Manganese Steel Mn13 (ASTM A128 Grade B, 분쇄기 jaw / 철도 frog)
- **항공·우주 Al** — AA 5083-H321 (LNG inner tank / ABS marine), AA 2024-T351 (737/747 fuselage skin), AA 7050-T7451 (F-22/777 thick forging)
- **β-Ti** — Ti-13V-11Cr-3Al (SR-71 Blackbird airframe, 1st-gen β)
- **헬리콥터 기어** — Pyrowear 53 (AMS 6308; Black Hawk/Apache main gearbox, 315°C loss-of-lube)
- **터빈 블레이드 / 디스크** — MAR-M 247 (GE F404/F414 blade, F1/Le Mans turbo wheel), Udimet 720Li (Trent 500/700/900 HP disc), AISI 8620 (자동차 변속기 ring & 풍력 1.5 MW 기어 reference)
- **CFRP 확장** — T700SC/Epoxy (F1·자전거·풍력 mid-range), IM7/BMI (F-22·F-35 supersonic 230°C 1차 구조), M40J/Cyanate Ester (위성 antenna boom 저 CTE)
- **고성능 폴리머** — PMMA Plexiglas G (F-16/Cessna 캐노피 MIL-PRF-25690), PET-GF30 Rynite 530 (산업 감속기·펌프·헤어드라이어), PPA-GF45 Amodel A-1145 HS (자동차 EV 인버터·트랜스미션 HT)

## R72 — Industry-standard niche alloy DB (1,040 → 1,085)
20 standard-grade alloys added to `data/supplementary-materials.json`, each tagged with `industry_note` describing its de-facto-standard application. Total reference materials 392 → 412; combined DB 1,040 → 1,085 alloys.
- **Valve / pump trim** — SS410 (UNS S41000, API 6A trim), SS420 (cutlery / surgical), SS440C (premium bearing & blade)
- **Aero bearing & gear** — M50 (AMS 6491, jet-engine mainshaft), AISI 9310 (VIM-VAR, helicopter transmission)
- **Automotive body** — 22MnB5 (USIBOR 1500 hot-stamping PHS), DP780 (dual-phase AHSS)
- **Boiler tube** — SA213 T22 (2.25Cr-1Mo subcritical/USC), Super 304H (S30432 Nb-Cu USC superheater)
- **Reactor / fuel** — SA508 Grade 3 Class 1 (PWR RPV forging), Zircaloy-4 (R60804 PWR fuel cladding)
- **Cryogenic structural** — 9% Ni Steel (ASTM A553 LNG tank inner shell)
- **Shipbuilding** — AH36 (ABS/DNV/LR harmonized high-tensile hull)
- **Engine valve** — SAE 21-4N (NCF3 automotive exhaust valve face)
- **Cryogenic propellant** — AA 2219-T87 (Saturn V / SLS / Falcon 9 LOX tank)
- **Aerospace fastener / medical** — MP35N (UNS R30035 Co-Ni-Cr-Mo)
- **Plastic injection mold** — NAK80 (Daido pre-hardened mirror-finish), STAVAX ESR (Uddeholm corrosion-resistant)
- **Spring** — Music Wire (ASTM A228 piano-wire), Chrome-Silicon (ASTM A401 oil-tempered engine valve spring)

## R71 — Quality push (security · a11y · backup · tests · CI)
- **R71 Sprint A** — security headers (CSP, X-Frame, Referrer-Policy, Permissions-Policy), Guide & Tools lazy-loaded, ErrorBoundary classifies network/TDZ errors with 3 recovery actions
- **R71 Sprint B** — anomaly detection excludes 17 specialty Ni superalloys (Monel, single-crystal CMSX/Rene/PWA, ODS, low-CTE) → 330 → 327
- **R71 Sprint C** — focus-visible ring (WCAG 2.4.7), pointer:coarse min-tap-target ::before (WCAG 2.5.5), prefers-reduced-motion override
- **R71 Sprint D** — localStorage backup/restore JSON (collections, favorites, recent searches, language, units, radar config)
- **R71 Sprint E** — 47 unit tests (vitest): cross-sections, welding CET + machinability, HT glossary, fuzzy search
- **R71 Sprint F** — `.github/workflows/ci.yml` (install → check → test → build), CLAUDE.md & CHANGELOG.md, CVE audit (3 dev-only vulns documented)

## R70 — Guide external link cleanup
- `pnpm verify:guide` script — extracts every https href, GETs with browser UA, classifies ok/forbidden/redirect/dead/error
- 14 dead URLs replaced (Wikipedia renames, DoITPoMS restructure, MIT OCW course-ID changes, vendor reorg) → 0 dead / 74 OK / 3 bot-block / 2 SSL-timeout (browser OK)

## R69 — Compare power-user features
- **A·D** — build-meta footer "Data updated YYYY-MM-DD", alloy ⭐ favorites with header dropdown
- **B·C** — 6 best-pick badges (max σy, max E, max σy/ρ, max E/ρ, min price, max HV), PDF export via window.print + @media print
- **G·H** — 4 weight sliders + Top-3 medal ranking, 3 new Tools calculators (LMP creep lifetime, Mohr's circle, Schaeffler stainless phase diagram)

## R68 — Visual polish
- **Sprint A** — 6 Tools calculators get inline SVG illustrations (Kt shape feature + stress flow, galvanic 2-metals + electrolyte, buckling Euler vs Johnson with end conditions, CTE mismatch bars, Vickers indenter, pressure vessel cyl/sph with hoop arrows)
- **Sprint B** — 4 Guide SVG: S-N curve (Basquin), Goodman/Soderberg/Gerber overlay, AM Z-vs-XY anisotropy schematic, 7-step AM post-processing flowchart
- **Sprint C** — analysis-only of remaining usability gaps

## R67 — Engineering Tools page + Detail extensions
- **Sprint A** — Detail panel adds Manufacturability section (Machinability rating per 30 alloy-family rules, CET per IIW Doc IX-1086-87 from composition), A/B basis link to Guide
- **Sprint B** — new `/tools` page + 6 calculators (Stress concentration Kt, Galvanic compatibility 15-metal series, Buckling Euler/Johnson auto-pick, CTE mismatch thermal stress, Hardness HV↔HRC↔HB conversion ASTM E140, Pressure vessel thickness)
- **Sprint C** — Compare panel gains a third view mode: Goodman diagram (σ_m vs σ_a SVG, per-alloy Goodman/Soderberg lines, user design point, SF table)

## R66 — Guide depth pass
- **Sprint A** — sticky search bar in Guide header with 28 indexed entries + anchor scroll + ring highlight
- **Sprint B** — Ashby M derivation + Basquin/Goodman/Soderberg/Gerber + Euler-Bernoulli + Larson-Miller LMP + Arrhenius + Kt definition + 4 external-link cards (MIT OCW, DoITPoMS, NPTEL, eFatigue, MatWeb, Materials Project, NIST, ECCC, ASTM/ISO/ASME, vendors)
- **Sprint C** — Guide ↔ app feature-gap analysis (12 missing features identified)

## R65 — Guide learning depth (TOC 9 → 13)
- Hero adds a 7-step decision flowchart (Requirements → Family match → Ashby narrow → Compare → Verify → Prototype → Certify) with chapter anchors
- New Ch.3 "Family mapping + environment" (10 domains → families, 10 environments → suitable/avoid alloys)
- Ch.5 appends Safety Factor handbook (9 industries 1.5–12, 7 condition multipliers)
- New Ch.9 "10 common design mistakes" (KIC ignored, AM Z-fatigue, surface roughness, galvanic, notch, weldability, H-embrittlement, DBTT, CTE mismatch, confidence misuse)
- New Ch.11 "Certification · manufacturing · testing" (9 industry certifications, 7 process tables, 10 prototype tests E8/E23/E466/E399/etc)
- New Ch.12 "5 industry case studies" (F1 engine block, JWST mirror, SpaceX Raptor, Tesla giga press, drone+implant)
- Ch.13 (renumbered) adds datasheet base table (typical / minimum / A-basis / B-basis / guaranteed minimum)

## R63 — Learning curve polish
- Onboarding gains Welcome step 0 with 3-stat illustration (1,040 alloys · Ashby · 16 scenarios)
- ScenarioDialog footer "default values" hint
- RadarChart Base label gets abbr tooltip
- Compare empty-columns animated hint
- MaterialDetail heat treatments switch to multi-line list

## R61 — Onboarding + Guide entry fork + contextual hints
- **Sprint A** — 5-step Onboarding with inline SVG illustrations + 5th-step quick-start (Bracket/Heatsink/Fatigue/Marine), header `?` button reopens
- **Sprint B** — Guide Hero 3-path CTA (5min Bracket / 30min Ashby / Reference), 6 popular tiles + "more 10" progressive disclosure, `F` symbol-glossary with dotted-underline abbr tooltip
- **Sprint C** — Ashby first-visit toast (filter/index/zoom), applied-preset banner "First candidate (N)" + "Compare (N)" next-action buttons, mobile Guide chapter collapsible

## R60 — Guide updates for Sprint 2-4 features
- Hero kbd hints, fuzzy examples, language/unit toggle mentions
- Bracket scenario steps mention bulk header checkbox + Radar/CSV/PNG
- Hightemp families add P91 Inconel 617 Incoloy 800H A286
- Fatigue notes σ_f ≈ k·σ_y, Pressure vessel notes KIC class fallback
- Ch.1 property dictionary adds HT glossary + confidence labels + fallback source labels

## Sprint 4 (R64-era) — Data + large features
- **C1** Fatigue endurance-limit family-typical fallback (Shigley 11 family k_typ rules) — 759 alloys filled (89.2% coverage)
- **C2** Fracture toughness KIC family-typical fallback (17 family patterns from ASM Vol.1·2 + MMPDS) — 3.8% → 82.2% coverage
- **C3** Elevated-temp + creep curves for P91, Inconel 617, Incoloy 800H added to supplementary
- **C6** Ashby Plotly scroll-zoom + double-click reset + Spike Lines
- **C7** Heat Treatment glossary (26 HT conditions: H900-H1150, SA, Aged, STA, Q&T, Normalized, Annealed, HIP, T6/T651/T7/T4, O, H-temper, Mill Annealed, β-annealed, SA+Aged, PH-Cu)

## Sprint 3 — Collections sort/search + keyboard + Scenario preview
- **B8** Collections recent/name/size cycle, search input at 5+, createdAt timestamp
- **B9** Global `/` Search focus and `?` Onboarding shortcuts, aria-label on Search input
- **B10** ScenarioDialog right panel shows "Filters to apply" list before Apply

## Sprint 2 — UI/UX critical
- **A2** Plotly mobile legend visibility (font 9 → 12, itemwidth 30)
- **A3** Fuzzy search (subsequence + separator strip)
- **A4** Family Tree 3-tier mobile tap-friendly
- **A5** Compare radar with family color + lightness variant
- **A7** Recent searches dropdown
- **B1** First-visit Onboarding tour (localStorage flag)
- **B3** RadarChart vertex SVG title tooltip

## Sprint 1 — Data integrity
- **A1** aliasesFor() sub-token regex (H13, M2, D2, 17-4 PH, AA xxxx, etc)
- **A6** RadarChart Base indicator
- **B2** Anomaly per-family σy/UTS ratio detection
- **B6** `verify:urls` script (51.4% verified-URL coverage)
- **B7** Cost data provenance section

## R54 — Production TDZ regression hunt
- **R54a** Ashby production `Cannot access 'U0' before initialization` — xMetaForHover/yMetaForHover moved before markerTraces use
- **R54b** xMeta alias removed entirely (single-declaration policy committed to memory)

## R45-R53 — Foundations
- R45 Range slider, R46 Header counts, R48a Anomaly detection, R49a Dark mode removed (permanent),
  R49b URL share auto-sync, R49c Mobile search, R49d Verified URL coverage,
  R50a Alloy data 940 → 1000+, R50c Ashby interactions, R50d Compare CSV/PNG,
  R51a Non-structural ceramics removed, R51b Filter range narrowing (leave-one-out),
  R52a Misclassification fix (Aluminum in Stainless Steel), R53a RadarChart component.
