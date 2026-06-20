# R211 — 핸드북 출처 수집 결과 (신뢰성 보강용)

웹에서 권위 있는 핸드북/데이터시트 출처를 멀티에이전트(WebSearch+WebFetch 검증)로 수집.
대상: 현재 DB 신뢰성 공백 — low-tier 75건 + 카테고리별 verified 비율 낮은 영역.
산출물: [`r211-handbook-sources-collected.json`](r211-handbook-sources-collected.json) — **합계 202 재료 · ~490 출처 · ~387 verified · HT-multiplier 쌍 4**.
(폴리머/세라믹/저신뢰금속 46 + `alloys_deep` 156 합금[전부 ≥1 verified].)

## R211 — DB 통합 결과 ⭐⭐ (수집 → r173 병합 + 재빌드)
수집한 verified 출처를 `r173-handbook-sources.json` 에 **125 patch** 로 통합. build-materials.mjs 에
confidence_tier·verified 카운트를 **최종 source 상태(r173 + 2차 normalize) 이후 재계산**하도록 수정
(기존엔 r173 이전 계산 → 신규 출처 미반영하던 잠재 버그도 동시 수정).

| 지표 | Before | After |
|---|---|---|
| **금속 미검증** | 191 | **17** (−174, 91%↓) |
| 금속 low-tier | 46 | **3** |
| 금속 medium-low | 256 | **8** |
| 전체 confidence high | 328 | **679** |
| 전체 medium-low | 298 | **18** |
| 전체 low | 75 | **15** |
| verified-src | ~910 | **1156/1206 (96%)** |

남은 금속 미검증 17건: 단결정 proprietary 2(Rene N5·PWA1484, 의도적 제외)·MakeItFrom-only cast Al/Mg 6
(무료 1차 datasheet 부재)·미수집 Ti Gr11·untrusted 도메인 강등 몇 건(aircraftmaterials 등).
오부착 0 — 패턴 `^<base>(?!\w)` 로 anchor, WE43·Railway·Niobium-1Zr·MAR-M247 등 전부 정확.

## R211d — Alloy inconfidence 제거 캠페인 ⭐
목표: DB 금속의 모든 inconfidence(미검증 191 + low-tier 46) 제거. `alloys_deep` 에 **156 합금 전부 ≥1 verified** 수집.

| 라운드 | 합금 | 범위 |
|---|---|---|
| R211c | 45 | Ni/Co 초합금·PH 스테인리스·공구강·마레이징·Ti/Al 항공·R134b 강 anchor·Cu/Invar |
| R211d b1 | 75 | Cu(CDA 전부)·스테인리스 A+F/M·Mg·내화금속·강 패밀리(합금/탄소/스프링/주철)·특수 Ni(주조) |
| R211d b2 | 36 | Al 잔여·Ti 베타/CP·공구강 잔여·Co 잔여·Al-Li·기타(Nitinol·Zamak·SA508·Railway) |

**커버리지**: 미검증 18개 subfamily의 ~100 base alloy 를 모두 타깃 — 단결정 proprietary(Rene N5·PWA1484, 프로젝트가 이미 specialty 로 제외)만 미수집.
**출처 등급**: 가능한 제조사 공식(Special Metals·Haynes·Carpenter·Materion·TIMET·Kaiser·CDA…); 공구강/일부는 제조사 PDF 가 압축/봇차단이라 검증된 distributor(Hudson·SteelJIS·astmsteel)로 확보(여전히 WebFetch 실증).
**주의**: 수집 ≠ DB 반영. 미검증 카운트는 **통합(r173 병합 + 재빌드)** 시 감소 — 이건 *수집* 단계.

## 검증 원칙
- `verified=true` = WebFetch 로 URL 이 실제 해당 데이터시트를 serve 함을 확인한 경우만.
- bot-block(403)·압축 PDF 미파싱·cert 오류 → `verified=false` 로 정직 표기 (URL 자체는 실재).
- 1차 자료 정책: 제조사 공식 > ASM/MMPDS/표준 > 평판 distributor. Wikipedia/블로그 제외.

## 커버리지

| 카테고리 | 수집 재료 | 대표 1차 출처 |
|---|---|---|
| **Polymer (21)** | PEEK·PEKK·PEI·PVDF·PSU·PPSU·POM(2)·PC(2)·TPU·ASA·PLA·PETG·HDPE·LDPE·PS·LSR·HCR·TPV·TPE | Victrex·Arkema·SABIC·Solvay·Covestro·Lubrizol·Celanese·Eastman·Wacker·Kraiburg 공식 |
| **Ceramic (11)** | **Alumina 99.5/99.7/99.9/99.99% ×4**·Y-TZP·Mg-PSZ·Si3N4·SiC·AlN·B4C·ZTA | CoorsTek·CeramTec(ASTM 명기)·Kyocera(JIS 전등급)·Saint-Gobain·Precision Ceramics 공식 |
| **Metal (14)** | AA 2011/2017/2025·3004/3005/3105·AISI 1080/310/434·Ti Gr7/23·Inconel 100/713C·C12000 | Aalco·United Aluminum·Rolled Alloys·Carpenter·Elgiloy·CDA·Aurubis·Sandvik |

## 주의(데이터 입력 시)
- **Chalco AA 2017** 페이지 Cu 5.5~6.5% = 오류 (2017 은 ~3.5~4.5%). 조성은 Aluminum Association Teal Sheet 사용.
- **Combined Metals AISI 434** 'UTS 80ksi=655MPa' 환산 오류 (80ksi=552MPa).
- **ULTEM 9085 / Kepstan / Udel** 등은 등급·지역(Americas vs EU) 별 값 차이 — DB 입력 시 등급/지역 명기.
- **3D 프린팅(FDM)** 데이터시트는 이방성 인쇄물 값 — resin/molded 값과 혼용 금지.

## R211c — 합금 심화 수집 (45 합금 · 65 verified) ⭐

`alloys_deep` 섹션 (7 클러스터). 제조사 공식 brochure 다수를 로컬 PDF 추출로 전 표(온도의존 인장·creep·CTE) 검증.

| 클러스터 | 합금 | 검증 1차 출처 |
|---|---|---|
| **Ni 초합금** | Inconel 625·X-750·Waspaloy·Hastelloy X·Haynes 230 | Special Metals(SMC)·Haynes 공식 brochure (전 표 검증) |
| **Co + 내화금속** | CoCrMo(F75/F1537)·Stellite 6/21(AM 포함)·Haynes 188/25·MP35N·W·TZM·Ta | Kennametal·Haynes·Carpenter·Wieland·AMETEK |
| **PH 스테인리스** | 15-5PH·13-8Mo·17-7PH·Custom 465·Nitronic 60 | Carpenter·AK Steel/Cleveland-Cliffs 공식 |
| **공구강/마레이징** | D2·A2·M2·S7·O1·Maraging C250/C300 | Böhler/voestalpine·distributor |
| **Ti·Al 항공** | Ti-6242·Ti-5553·Gr9·Al 7050/7475/2024/2618 | TIMET·Kaiser Aluminum 공식 |
| **R134b 강 anchor (Tier1)** ⭐ | DP980·TWIP1180·EH36·A588·API 5L X65·A553 9Ni | ArcelorMittal·POSCO·SSAB·Chapel·Energy-Steel |
| **Cu/controlled-expansion** | BeCu C17200·Al청동·Cu-Ni·Invar 36·Kovar·Alloy 42 | Materion·CDA·Ed Fagan·Special Metals NILO |

R134b 로드맵의 **anchor 부족 5 subfamily(Tier1)** — AHSS·조선·HSLA·파이프라인·저온강 — 이 검증된 mill/class-society 출처로 해소됐습니다.

## HT-multiplier 검증 (R134b Tier2 — 자정 리셋 후 재수집 완료) ⭐
같은 등급의 열처리 조건별 물성 쌍을 공식 brochure 로 확보 — DB 의 HT multiplier 가정을 실측 보정:

| Alloy | 조건 쌍 | 인장 비율 | 피로/기타 | 출처 |
|---|---|---|---|---|
| **Inconel 718** | annealed↔STA | **YS ×2.10**, UTS ×1.49 | **피로 ×1.05 뿐** | Special Metals SMC-045 |
| H13 tool steel | 45↔52 HRC | UTS ×1.28, YS ×1.19 | — | Uddeholm Orvar |
| Maraging C-350 | annealed↔aged | 32→57 Rc, UTS→2358 MPa | — | ATI + SSA |
| Ti-6Al-4V Gr5 | annealed↔STA | UTS ×1.10, YS ×1.07 | — | ATI + Rolled Alloys |

**핵심 발견**: Inconel 718 은 시효로 **인장은 ×2.1 오르지만 피로는 ×1.05 뿐** — R134b 의 0.65× multiplier 가설대로 **인장/피로 multiplier 를 반드시 분리**해야 함. (Special Metals 본문도 "aging raises fatigue strength only slightly" 명시.)

## 다음 단계 (사용자 확인 후)
1. `verified=true` 출처를 `data/r173-handbook-sources.json` patches 에 `{label,url,verified}` 로 병합 (alloy pattern 키).
2. keyProps 의 실측값으로 해당 재료의 confidence 승격 (low → medium-low/medium) + 출처 검증 카운트 ↑.
3. **HT-multiplier 보정** — Inconel 718 등 시효 alloy 의 fatigue multiplier 를 인장과 분리해 ~1.05 로 재calibrate (build-materials.mjs).
4. `pnpm verify:urls` 로 신규 URL 헬스 체크 (bot-blocked 도메인 화이트리스트 갱신).
