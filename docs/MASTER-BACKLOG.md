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

## B. 데이터 커버리지 (선별 확장)

| # | 항목 | 상태 | Entry / Accept / 리스크·완화 |
|---|---|---|---|
| B1 | elev-temp/creep 캠페인 (후보 44 → 목표 60종) | ⏸ **착수기준 확정** | E: **수치 테이블 제공 datasheet 확보** (그래프만은 불가 — Monel 400 판정 전례; 사용자 PDF 제공 시 즉시: X-750 전례). A: elevated-temp-curves.json 수록(src 필수)+차트 렌더. R: 그래프 digitize 유혹 / M: 원칙 1 명문화 완료 |
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
