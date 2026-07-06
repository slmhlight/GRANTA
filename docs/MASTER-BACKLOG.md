# MASTER BACKLOG — 전 지평 작업 인벤토리 (2026-07 기준)

**목적**: 장기적으로 해야 할 일의 **전량 나열** (찔끔찔끔 생성 금지 — 새 아이디어는 이 문서에 먼저 등재). 각 항목에 **착수 기준(Entry)·수용 기준(Accept)·리스크(R)·완화(M)**. 원칙은 [LONGTERM-PLAN.md](LONGTERM-PLAN.md) §1, 편집 위치는 §3 파이프 맵.

상태: ✅완료 ▶진행중 ⏸착수기준 미충족 ○대기

---

## A. 데이터 무결성·검증 (최우선 지속 트랙)

| # | 항목 | 상태 | Entry / Accept / 리스크·완화 |
|---|---|---|---|
| A1 | golden-values 확장 89→150 | ▶ (분기 +20~30) | E: probe→표준대조 가능한 인기 base. A: bound green + 위반은 교정으로 해소. R: bound 과협→false alarm / M: min-spec 은 floor, golden 은 typical ±수% 이원화 |
| A2 | min-spec 테이블 43→80+ | ▶ | E: 표준 min 을 확신(원문/복수 2차) + DB 전조건 floor 안전성 probe. A: 게이트 green. R: 조건 미분화 grade(예: A356-F vs T6)에 floor 오적용 / M: floor 미충족 조건 존재 시 패턴에 조건 포함 or 제외 |
| A3 | 족보 re-verify 로테이션 (분기 1족보: Cu→Al→Ti→Ni→철강) | ○ 2026Q3=Cu | E: 족보당 대표 20~40 entry 목록. A: 교정 or REVIEWED 판정 100% + round-trip 0. R: vendor 산포를 오염으로 오판(CuCr1Zr 교훈) / M: AM 은 vendor MDS 우선, 산포는 REVIEWED |
| A4 | 연 1회 전수 오염 스윕 (4-튜플·물리정합·약한 provenance — A588 방법론) | ○ 2027Q1 | A: 의심 0 or 전건 판정. R: 스윕 노이즈 / M: 자동검출→수동판정 2단계 유지 |
| A5 | 파생값→실측 대체 (KIC class 814·fatigue derived 759) | ⏸ | E: COVERAGE-GAPS §1 상위 10 의 실측 datasheet 확보(SUP9/10·C350·P91·52100). A: confidence 'class/derived'→'handbook'+인용. R: 논문값 산포 / M: 표준·핸드북 우선, 논문은 복수 일치 시 |
| A6 | HT 라벨↔값 상태 심화 (audit I2 확장: 조건별 기대비율 검사) | ○ | A: audit 신규 룰 + 오탐 <5% 후 게이트化. R: 합금별 예외 다수 / M: REVIEWED 화이트리스트 선행 |
| A9 | **REGEX → Material ID 전면 전환** (name-regex override/런타임 분류 소거) | ✅ **핵심 완료** R226p (Phase 0·1·2·3·4·5·5b) | 상세 [REGEX-TO-ID-MIGRATION.md](REGEX-TO-ID-MIGRATION.md) §E 결론. **런타임 분류 regex 0**(절삭성·용접성·HT·인사이트·coatings·family-color 전부 m.profiles) + **빌드 값/메타 override name-매칭 0**(R199·R199url·R205·R173range·R214·R173src·R191·인라인 austenitic/foam/X-750·R146 cost 전부 stable_id). 전 Phase **value-diff 0**(behavior identical)·게이트(override-stableids·coatings-id·color-family). **Phase6(aliasesFor/qualFor)=유지 판정**: grade-token 파싱+키드딕셔너리(temper-무관 grade-레벨, 동결+게이트, override 아님) — ID화 시 신규 grade 도출 불능. 유지 classifier=subcat 정규화·process-classify(동결+게이트) |
| A8 | 생성자 name-regex 오염 근본 차단 (R199 조건접미사 over-match) | ✅ R226n | `^AISI 304 ` 등이 temper 변형 datasheet 를 annealed 로 덮던 것 → `(?!.*(Hard\|Cold-worked))` lookahead. redundant 교정 3(Monel/304 temper) 제거·golden 앵커 고정. 잔여: 타 base 의 유사 over-match 스윕 |
| A7 | 공정평가 카테고리 정합 (금속 모델 오적용 차단) | ✅ R226i (폴리머) | E: 카테고리별 물리 모델 분리 필요성 확인. A: 금속 전용 지표(machiningCostBand·ISO3685·AISI baseline·CE 계열)가 비금속에 노출 안 됨 + 카테고리 전용 모델 제공. R: 세라믹/복합 절삭성 미제공 잔존 / M: 세라믹=grinding, 복합=별도 — 별도 항목(B5)에서 검토. 폴리머는 computePolymerMachinability(선언적 lib 테이블)로 분리 |

## B. 데이터 커버리지 (선별 확장)

| # | 항목 | 상태 | Entry / Accept / 리스크·완화 |
|---|---|---|---|
| B1 | elev-temp/creep 캠페인 (후보 44 → 목표 60종) | ▶ R226l +14 | E 갱신: 수치 테이블 **또는 Granta PDF 벡터 그래프**(사용자 승인 R226l — 결정적 좌표 추출 + 23°C 앵커 검증 필수, 눈대중 digitize 는 여전히 금지). A: elevated-temp-curves.json **by_id**(stable_id 키) 수록+차트 렌더. R226l: E(T) 14 entry (σy 7·UTS 2 동시) 부착 |
| B2 | 조건 축 확장 (단일조건 고인기 74 base — 7050 T73 계열 등) | ○ | E: 조건별 검증값. A: append-only 추가 + fp/golden green. R: 중간삽입 / M: fp 게이트 |
| B3 | 주조·특수 공정 커버리지 2차 (AC4C 실엔트리·A356-T7·투자주조 SS) | ○ | E: B26/JIS H5202 검증값. A: cast-alloys append + cross-ref |
| B4 | 폴리머 grade 세분화 (PEEK 450G/GF30·PC grade 등 — 현 base 단일) | ○ | E: 제조사 TDS. R: grade 폭발 / M: 인기 상위 5 폴리머만, grade ≤3 |
| B5 | 세라믹/복합 출처 심화 (EMH Vol.4 → 개별 제조사 TDS) | ○ | E: CoorsTek/CeramTec 등 URL 검증 |

## C. 데이터 모델·provenance

| # | 항목 | 상태 | Entry / Accept / 리스크·완화 |
|---|---|---|---|
| C1 | per-property provenance 확대 (현: 교정분만 자동) | ▶ | A3 로테이션과 병행 — 검증한 값에 provenance 스탬프. A: 인기≥4 metal 의 σy/UTS provenance ≥50% |
| C2 | A/B-basis 확대 (basis='min_spec' 84 → spec 값 전반) | ✅ 1차 / ○ 확대 | 확대 E: min-spec 테이블 성장(A2)과 자동 연동(파이프 완성) |
| C3 | confidence 산출 공식 명문화 (n×authority→tier) | ○ | A: 문서화된 규칙 + build 재현. R: 기존 tier 와 충돌 / M: 신규 필드로 병행 후 교체 |
| C4 | UNS 정규화 심화 (432종 → 누락 도출·역인덱스) | ✅ 1차 / ○ | 확대: name 에만 있는 UNS 스캔 리포트 |
| C5 | 국제 별칭 2차 (EN 번호계 1.xxxx·GB·GOST) | ○ | E: 족보별 대응표 검증. R: 근사대응 오해 / M: '≈' 마커 정책 유지 |
| C6 | 공정 가이드 Material ID 기반 전면 개편 (런타임 regex 제거) | ✅ R226j | 절삭성·용접성 모델·HT family·인사이트를 build:profiles 분류기(1회) → assignments(stable_id 키, 커밋) → m.profiles 스탬프 → 클라이언트 순수 조회. 게이트: 전 entry 할당·키 parity·stale 검출·가족-band 감사·회귀 앵커. 교정 = overrides(src 필수). R: 분류기-콘텐츠 드리프트 / M: parity 테스트 + build 게이트 이중 봉쇄. 확장(커버리지 76%→↑)은 overrides 로 안전 |

## D. 검증 인프라·자동화

| # | 항목 | 상태 | Entry / Accept / 리스크·완화 |
|---|---|---|---|
| D1 | verify:urls cron 유지 (분기) + candidate 반영 | ▶ 상시 | A: dead 0 |
| D2 | KPI 추적 (standard+handbook 31.7%→50%) | ▶ 반기 | M: aggregator-only 는 0 달성 — 이제 분모 개선은 A3 로테이션의 부산물 |
| D3 | coverage-gaps 분기 재생성 → 갭 소진율 | ▶ | A: §1~3 수치 감소 추세 |
| D4 | CI 에 audit:registry 직접 단계 추가 검토 (현: 테스트 래퍼) | ○ 낮음 | R: CI 시간 증가 / M: 래퍼로 충분 — 필요 시만 |
| D5 | corrections 도메인 분할 (>600줄 트리거, 현 ~380) | ⏸ | E: 트리거 도달. A: 분할 후 스키마 테스트 green |

## E. UI/기능 (데이터 노출 — 신규기능 요망)

| # | 항목 | 상태 | Entry / Accept / 리스크·완화 |
|---|---|---|---|
| E1 | UNS 검색 (필터+direct-hit) | ✅ | preview 확증 (N07718→718 계열) |
| E2 | provenance tooltip (R129 파이프에 교정 인용) | ✅ 데이터/파이프 | 산출+코드 확증 (DOM 자동화 flaky — 수동 1회 확인 권장) |
| E3 | authority 필터/정렬 (출처 등급별 보기) | ○ | A: 배지 필터 chip + 정렬 옵션. R: 필터 남용으로 저신뢰 은폐 / M: 원칙 8 — 구분 표시만, 기본 노출 유지 |
| E4 | basis='min_spec' UI 표기 (별표/라벨 — R139b 렌더 확인·보강) | ○ 다음 | E: RangeRow 의 min_spec 렌더 경로 확인. A: 84 스탬프 값에 시각 구분 |
| E5 | Designations 에 UNS 뱃지 구분 (aliases 와 분리) | ○ | 소형 |
| E6 | 대응합금(related/≈별칭) 탐색 뷰 (cross-standard 브라우저) | ○ | R: 범위 확대 / M: 상세패널 카드 1개로 한정 |
| E7 | 조건(temper) 매트릭스 뷰 (base 별 조건 커버리지 시각화) | ○ 원거리 | B2 진행 후 가치 상승 |
| E8 | 고온 설계 보조 (elev-temp 곡선 보간·허용응력 표시) | ⏸ B1 종속 | R: 설계값 오용 / M: "typical, 설계용 아님" 명시 |
| E9 | 재료 선택 인사이트 (when-to-use) | ✅ 1차 R226j / ○ 확장 | 17 그룹·96 시나리오 (selection-insights.json, 출처 포함) — 상세패널 물성탭 카드 + 현재 재료 강조. 확장 E: 그룹별 시나리오 보강·엔지니어 검토. R: 관행 서술의 과일반화 / M: "일반 관행 요약, 설계 검증 대체 안 함" 명시 + 출처 필수 |
| E10 | 조건(variation)별 공정 노트 확장 (현 26 조합) | ▶ | condition_notes 'mach|htc' 조합 — 신규 조합은 근거와 함께 추가. R: 조건 오적용 / M: htc 분류는 구조 필드 기반 + parity 게이트 |
| E11 | 유사재료 × 인사이트 융합 (decisionContext) | ✅ R226l·R226m / ○ 확장 | R226m: **popularity 정렬·필터 폐기 → 물성 log-distance 순 top10**, 다른 인사이트(용도) 그룹 후보는 amber **↗ 배지**로 한눈에 + 주용도 안내, distance(≈) 표기. 전부 m.profiles ID 조회. 확장: 그룹 다양성 슬롯 예약·용접/비용 델타. R: 동일 그룹이 클러스터 지배 시 타그룹 미노출 / M: distance-sort 로 타그룹-근접 후보 억제 해제(배지로 강조) |
| E13 | **합금 개발배경(스토리) 시스템** — ID 이관·전량 작문·**v2 6섹션 전환** | ✅ R226t 부착(1129/1129) / ✅ R226u **v2 전환 완료**(콘텐츠 242종 전부 6섹션, legacy 0·dead 2만) / ○ timeline 보강 후속 | 구 name-매칭(R75~R177, dead 17 유발) → **stable_id 동결 이관** → **작문 회차 전량 부착**: 294 스토리·1129 entry 100%(미부착 0). v2 구조화 621 entry, 잔여 legacy v1 ~508(본문+refs). 신규 그룹 스토리 다수(공구강·초합금·구리·내화·Ti β/고온·특수강·스테인리스 5족·Al 3족·Co·Zr·misc 금속 7·폴리머 10+). 단일 SSOT `data/alloy-stories.json` — 레지스트리 story-free. **v2 스키마**(hook/origin/breakthrough/adoption/today/fun_fact + timeline[ref]). 게이트 `alloy-stories.test.ts`(10) + tsc + 770 테스트 + build 전부 green. **신뢰성**: 특정 연도·인명·최초적용은 웹검증(예 SR-71 Ti-13V-11Cr-3Al ~93%·소련산 조달), 불확실 서술 생략, v2 refs≥2, DB 모순 시 값 우선. 후속: legacy v1 → v2 승격(무손실 join), 신규 entry 부착. 원칙·가이드: [STORY-SYSTEM.md](STORY-SYSTEM.md) |
| E12 | **후공정(코팅) 추천 전면 개편** — 합금 그룹 기반 합리화 | ✅ R226s | 구 substrateMatch regex+일률 점수제 폐기 → `data/coating-recommendations.json`(**22그룹** SSOT: 목적(부식/마모/피로/고온/전기/위생/접착/치수)별 when·why·caution) + `m.profiles.cg`(빌드 스탬프, by_mach→by_insight→by_category 키 조회). 조건 보정: **수소취성**(UTS≥1000×전해도금→B850/F519 베이킹)·**AM as-built**(선행 공정)·프로파일별(2xxx 하드아노다이즈, 303/416 질산욕, BeCu 분진). 카탈로그 +5(ENP·QPQ·Ti양극산화 AMS2488·폴리머 어닐링·표면활성화), substrateMatch 필드 소멸. 게이트 `coating-recs.test.ts`(스키마 parity+합금 앵커 17+조건 보정). 커버리지 Metal 98%·Composite 전량·Ceramic 의도적 0. R: 관행 과일반화 / M: 표준 인용 필수+앵커 고정 |
| D6 | 상류 조건-라벨 비결정성 (supplementary 무라벨 다-point → fp flip) | ○ | Tantalum(Ta) 3-point 무-conditions 가 build-materials 에서 비결정 라벨링 → C_0071 fp 간헐 flip (R226l·R226m 재발, 값 오염 아님·benign). E: 재현 스크립트. A: supplementary 무라벨 다-point 에 conditions[] 부여 or ID-assign 결정화. R: 중간삽입 유발 / M: append-only |
| D8 | **AM 후처리 열처리 가이드** — AM 금속 entry HT 카드 공백 채움 | ✅ R226w 1차 (58/103) / ○ 확장 | `ht-guidance.json` +am_map(byHt 접두·byMach)+블록 12종 (am-ti64·ti-cp·alsi·ni718·ni625·ni-solidsol·282·316l·ph·cocr·maraging·cu). 웹 검증: Ti64 SR 480-650·HIP 920°C/100MPa(F2924)·AlSi10Mg SR 300°C 강도↓(Si 네트워크)·MS1 490°C/6h→1950MPa. 해석 `resolveHtGuidanceTexts` — AM 판정은 **구조 필드 process/processes**(name regex 없음), family 는 profiles.ht 접두→mach fallback. 게이트 4 앵커. 잔여 45(Scalmalloy·Invar/W AM·H13 AM·Zeron AM 등)는 근거 문헌 확보 후 확장 (거짓 채움 금지). R: 레시피 오적용 / M: 표준·데이터시트 인용 명시+게이트 |
| D7 | **절삭성 "1.0·정보없음" 해소** — 커버리지 확장 + 미산출값 표시 억제 | ✅ R226v | 문제: mcf/htf=1.0(파이프 기본값)이 "×1.00 보통/불요"로 표시 — rating(어려움)과 모순, "정보 없음 vs 실제 용이" 구분 불가 + Metal 228 entry mach 프로파일 미할당(Granta G_*·KS·구리 C번호 등 패턴 미커버). 조치: (1) classify 패턴 보강 → **신규 217 할당** (잔여 11 = AHSS 판재·전기강·Nitinol — 절삭 등급 자체가 통용 안 되는 재료), (2) 오분류 교정 9 (Aluminum Bronze 6종 al-*→bronze-wrought · Zircaloy 3종 refractory 18→zirconium 28 — Zr은 Ti 유사가 통설), (3) **신규 프로파일 8** (bronze-wrought 25·bronze-bearing 70(CDA 검증)·cast-iron-gray 75·cast-iron-ductile 60·zinc-diecast 90·ni-fe-lowexp 40(CarTech: Invar≈오스테나이트, FM급 60)·hadfield 8(사실상 절삭불가)·zirconium 28), (4) UI: costBand ==1.0 → null(표시 억제, 조건보정으로 1.0 벗어나면 표시)·HT 카드는 htGuidance 있으면 가중치 없이도 유지(Ti64 AM 등 34건 손실 방지)·**pop>2 & 데이터 전무 → "데이터 미확보(≠가공 용이)" 명시**, pop≤2 → 카드 생략. 게이트: robustness 앵커 +8(Invar/Hadfield/회주철/C93200/C95800/Zircaloy/5140/SM355B)·costBand 1.0 테스트. R: 1.0 이 진짜 표준인 케이스 은폐 / M: rating(프로파일)이 정보 전달 — 표준강은 전부 mach 프로파일 보유 |

## H. 위키형 상호참조 (E14 — 다분기 프로그램, 설계 완료·구현 대기)

**설계 SSOT**: [WIKI-CROSSREF-DESIGN.md](WIKI-CROSSREF-DESIGN.md). 재료↔재료·본문 기술용어 백링크 + 통합 랭크 검색. 전 링크 빌드타임 stable_id/slug 해석(런타임 regex 0)·SSOT+게이트. Phase 독립 배포.

| # | 항목 | 상태 | Entry / Accept / 리스크·완화 |
|---|---|---|---|
| H0 | 설계·백본·단계계획 문서화 + 플랜/백로그 반영 | ✅ R227 | WIKI-CROSSREF-DESIGN.md(엔티티 taxonomy·SSOT·빌드 인덱스 4종·런타임 linkify·검색 개편·5 Phase·리스크·파일맵). LONGTERM §5 P4·본 섹션 등재 |
| H1 | **Phase1 — 재료 lexicon 자동생성 + backlink 역인덱스** | ○ 다음(저위험) | E: `audit-story-names` 토큰화 → `scripts/lib/name-tokens.mjs` 승격. A: `build-wiki-index.mjs`→`wiki-index.json`·`wiki-backlinks.json` 생성 + "여기를 가리키는 것" 패널(파생, behavior-additive) + 게이트 green. R: surface 충돌 / M: ambiguity_group 리포트 |
| H2 | **Phase2 — 스토리 authored `[[…]]` 링크 + 렌더** | ○ | E: 고가치 상호참조 목록(300M↔AerMet·PEEK↔PEKK·4340계 등). A: 전 `[[…]]` 무해결 0(빌드 에러 게이트)·본문 링크 렌더·원문 무손실. R: 과링크 / M: 섹션당 첫 등장·self 제외 |
| H3 | **Phase3 — glossary SSOT + 용어 auto-link + 팝오버** | ○ | E: `ht-glossary`(26)+빈출 용어 씨앗. A: `glossary.json`(출처 규율·스토리 플레이북)+`glossary.test.ts`+가드된 auto-link(ambiguity 제외·min-length·STOP). R: 거짓/과링크 / M: 큐레이션 lexicon만·모호=명시링크 |
| H4 | **Phase4 — 검색 개편(랭크·타입그룹·⌘K 이원화)** | ○ | E: wiki-index 통합. A: boolean→랭크 스코어링+타입 그룹핑+전역 팔레트, **표 검색은 재료-only 유지**. 게이트 랭킹 앵커(N07718→718·석출경화→term·self 제외). R: 검색 소음/회귀 / M: 스코프 이원화·앵커 테스트 |
| H5 | Phase5 — hover 프리뷰·what-links-here 전체뷰·(선택)그래프뷰 | ○ 원거리 | 저위험 후속 |

## F. 코드 품질 (지속)

| # | 항목 | 상태 | 비고 |
|---|---|---|---|
| F1 | 대형 컴포넌트 추가 분해 (Guide 2121·FilterSidebar 1181) | ○ 기회주의 | 순수 조각만, behavior 불변 + 테스트 |
| F2 | any 잔여 축소 (scenario-presets 8·ComparePanel 4 등) | ○ 기회주의 | 신규코드 no-explicit-any 우선 |
| F3 | lint 경고 9 소진 | ○ 소형 | |
| F4 | E2E 스모크 (검색→상세→비교 1 flow, Playwright) | ○ 검토 | R: CI 취약성 / M: 도입 전 flake 예산 정의 (preview 자동화 flaky 경험 반영) |

## G. 명시적 비추진 (재론 방지)
- 다크모드 / 비구조 기능성 재료 / Pareto 3D — 영구 정책.
- build-materials 전면 리팩터 — 동결+게이트 봉쇄 (트리거 3건 도달 시에만 재론).
- 그래프 digitize 값 수록 — 원칙 1 위반.
- measured-only 숨김 필터 — 원칙 8 위반 (표기로 해결).

## 운영 규칙
1. 새 작업 아이디어 = 본 문서에 Entry/Accept/R·M 채워 등재 후 착수.
2. 분기 리뷰: 상태 갱신 + coverage-gaps 수치 반영 (LONGTERM-PLAN §4 주기표와 동기).
3. 상태 변경은 커밋 메시지에 백로그 ID(A1·E4…) 인용.
