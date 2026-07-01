# 커버리지 갭 리포트 (자동 생성 — scripts/report-coverage-gaps.mjs)

빌드: 2026-07-01 · 1113종 · authority {"manufacturer":1388,"handbook":351,"aggregator":534,"standard":1024,"other":1045}

## §1 파생값 → 실측 대체 우선순위 (축1c)

KIC(class-confidence)·fatigue(derived) 를 파생값에 의존하는 인기 합금 — 실측 datasheet 확보 시 신뢰도 상승 폭이 가장 큰 대상.

| 우선순위 | 재료 | 인기 | 파생 의존 |
|---|---|---|---|
| 1 | SUP9 (JIS Cr-Mn spring steel) | 4.4 | KIC+fatigue |
| 2 | SUP10 (JIS Cr-V spring steel) | 4.4 | KIC+fatigue |
| 3 | SUP9 (KS D 3701 / JIS G 4801, Cr-Mn spring steel) | 4.4 | KIC+fatigue |
| 4 | SUP10 (KS D 3701 / JIS G 4801, Cr-V spring steel) | 4.4 | KIC+fatigue |
| 5 | Maraging C350 (VascoMax, 18Ni-9Co) | 4.3 | KIC+fatigue |
| 6 | Grade 91 (P91, 9Cr-1MoVNb) | 4.1 | KIC+fatigue |
| 7 | Hadfield Manganese Steel (Mn13, ASTM A128 Grade B) | 3.9 | KIC+fatigue |
| 8 | AISI 52100 (bearing) | 4.3 | KIC+fatigue |
| 9 | AA 2011 | 3.3 | KIC+fatigue |
| 10 | AA 2017 | 3.3 | KIC+fatigue |
| 11 | AA 2025 | 3.3 | KIC+fatigue |
| 12 | Gray Cast Iron (Class 30) | 3.3 | KIC+fatigue |
| 13 | Ductile Iron 65-45-12 | 3.3 | KIC+fatigue |
| 14 | AISI 1080 | 4.1 | KIC+fatigue |
| 15 | A516 Grade 70 | 4.0 | KIC+fatigue |
| 16 | Udimet 720Li (low-interstitial, P/M disc) | 4.0 | KIC+fatigue |
| 17 | AISI 304L / STS304 ULC | 4.0 | KIC+fatigue |
| 18 | Superduplex Stainless | 3.1 | KIC+fatigue |
| 19 | Incoloy 901 | 3.1 | KIC+fatigue |
| 20 | Ti Grade 1 | 3.0 | KIC+fatigue |
| 21 | AISI 1045 | 5.0 | fatigue |
| 22 | AISI 1018 | 5.0 | fatigue |
| 23 | Ti-6Al-4V Grade 23 ELI (UNS R56401) | 5.0 | fatigue |
| 24 | AA 5052 | 5.0 | fatigue |
| 25 | H11 | 2.9 | KIC+fatigue |
| 26 | CuCr1Zr (CuCr2) | 3.5 | KIC+fatigue |
| 27 | AISI 301 (cold-rolled HS austenitic) | 3.5 | KIC+fatigue |
| 28 | Stainless 316Ti | 3.5 | KIC+fatigue |
| 29 | 317L | 3.5 | KIC+fatigue |
| 30 | Nitronic 50 | 3.5 | KIC+fatigue |

파생 의존 metal (base 단위): 30+ 표기 (전체 322)

## §2 조건(temper/HT) 커버리지 — 단일조건 고인기 base (축3c)

인기 높은데 조건이 1개뿐인 base — temper/HT 축 확장(예: T73/T7351·aged 변형) 1차 후보.

| base | 인기 | 조건 수 |
|---|---|---|
| Inconel 718 (UNS N07718, AMS 5662 STA spec) | 5.0 | 1 |
| AISI 302 (general-purpose austenitic stainless, higher-C 304) | 5.0 | 1 |
| AISI 1045 | 5.0 | 1 |
| AISI 1018 | 5.0 | 1 |
| Inconel 718Plus | 5.0 | 1 |
| Ti-6Al-4V (Gr5) | 5.0 | 1 |
| AISI 304L (Wrought) | 5.0 | 1 |
| 42CrMo4 (AISI 4140) | 5.0 | 1 |
| CF8 (cast 304, ASTM A351) | 5.0 | 1 |
| CF8M (cast 316, ASTM A351) | 5.0 | 1 |
| CF3 (cast 304L, ASTM A351) | 5.0 | 1 |
| CF3M (cast 316L, ASTM A351) | 5.0 | 1 |
| Ti-6Al-4V Cast (Grade C-5, ASTM B367) | 5.0 | 1 |
| H13 Tool Steel | 4.4 | 1 |
| SUP9 (KS D 3701 / JIS G 4801, Cr-Mn spring steel) | 4.4 | 1 |
| SUP10 (KS D 3701 / JIS G 4801, Cr-V spring steel) | 4.4 | 1 |
| AISI 52100 (bearing) | 4.3 | 1 |
| Maraging C300 (18Ni-300) | 4.3 | 1 |
| AA 6063 (Al-Mg-Si) | 4.3 | 1 |
| Stellite 21 (CoCrMo) | 4.3 | 1 |
| P20 mold steel | 4.2 | 1 |
| C26000 | 4.2 | 1 |
| C11000 | 4.2 | 1 |
| A356.0 (Al-Si-Mg cast) | 4.2 | 1 |
| Invar 36 (FeNi36) | 4.2 | 1 |

단일조건 & 인기≥3.4: 74 base

## §3 elevated-temp/creep 곡선 부재 — 인기 상위 (축3d)

곡선 보유 base: 126 / 499. 인기≥4.0 인데 부재 (확장 목표 60종의 후보):

| base | 인기 |
|---|---|
| AISI 1010 | 5.0 |
| AISI 1020 | 5.0 |
| AISI 1018 | 5.0 |
| ASTM A36 (structural carbon steel) | 5.0 |
| D2 Tool Steel (AISI D2, cold-work die) | 5.0 |
| SUP9 (JIS Cr-Mn spring steel) | 4.4 |
| SUP10 (JIS Cr-V spring steel) | 4.4 |
| SUP9 (KS D 3701 / JIS G 4801, Cr-Mn spring steel) | 4.4 |
| SUP10 (KS D 3701 / JIS G 4801, Cr-V spring steel) | 4.4 |
| AISI 430 | 4.4 |
| Maraging 300 (UNS K93120, AMS 6514) | 4.3 |
| Maraging 250 (UNS K92890) | 4.3 |
| Maraging C350 (VascoMax, 18Ni-9Co) | 4.3 |
| ASTM A572 Grade 50 (HSLA structural) | 4.3 |
| C75200 (Nickel Silver 65Cu-18Ni-17Zn, German Silver) | 4.3 |
| P20 mold steel | 4.2 |
| Invar 36 (Fe-36Ni) | 4.2 |
| C26000 | 4.2 |
| C11000 | 4.2 |
| A356.0 (Al-Si-Mg cast) | 4.2 |
| Invar 36 (FeNi36) | 4.2 |
| OFHC Copper C10100 | 4.2 |
| Naval Brass C46400 | 4.2 |
| Copper (Pure, C11000) | 4.2 |
| C21000 (Red Brass 95Cu-5Zn, Gilding Metal) | 4.2 |
| C22000 (Red Brass 90Cu-10Zn, Commercial Bronze) | 4.2 |
| C23000 (Red Brass 85Cu-15Zn) | 4.2 |
| C26800 (Yellow Brass 66Cu-34Zn) | 4.2 |
| OFE Copper C10100 (oxygen-free electronic) | 4.2 |
| AISI 1030 | 4.1 |
| AISI 1040 | 4.1 |
| AISI 1050 | 4.1 |
| AISI 1080 | 4.1 |
| Custom 465 | 4.1 |
| CuCr1Zr (C18150) | 4.1 |

인기≥4.0 & 곡선 부재: 44 base

