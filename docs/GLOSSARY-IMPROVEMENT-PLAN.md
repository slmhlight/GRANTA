# 글로서리·상세 문서 개선 계획 v2 (R227/E14/H4d)

**목적**: 사용자 피드백 20건(2026-07)을 **문자 그대로 고치는 것이 아니라**, 각 지적이 드러내는 **근본 품질 원리를 추출해 코퍼스 전역(74 용어·42+ A4 문서·183 스토리/403 entry·25+ 도표·생성 콘텐츠 전체)에 체계적으로 적용**하는 계획. 지적은 *증상*이고, 이 문서는 *병인*을 다룬다.

> **v2 관점 전환(사용자 지시)**: "20건을 그대로 이행하지 말고 행간을 읽어 더 큰·다양한 분야에 적용. 통찰적 시각." → 20 증상을 **10개 품질 차원**으로 일반화하고, 각 차원마다 **감사(audit)→표준→전역 교정**으로 처리. spot-fix 42회가 아니라, 코퍼스를 스캔해 *모든* 위반을 찾는 엔진을 세운다.

관련: 작성 절차·현황 [WIKI-CROSSREF-DESIGN.md](WIKI-CROSSREF-DESIGN.md) §N/§O/§P · 독자 눈높이 memory `feedback_glossary_audience`(기계공학 1학년) · 데이터 추가 [DATA-WORKFLOW.md](DATA-WORKFLOW.md) · 원칙 [LONGTERM-PLAN.md](LONGTERM-PLAN.md).

---

## §1. 10 품질 차원 (증상 → 병인 → 전역 적용)

각 차원: **원리 · 일반화한 지적# · 더 넓은 적용(insight) · 감사 방법 · 표준**.

### D1. 도표 진정성 (Physical fidelity)
- **원리**: 개략도라도 실제 물리·야금 형태를 따른다. Grain=불규칙 다각형(Voronoi, 6각↑), 상은 실제 형태(펄라이트=층상·마르텐사이트=침상·시멘타이트=망/구상).
- 지적: #4·#10·#17.
- **더 넓게**: 3개만이 아니라 **전 25 도표를 물리 충실성 체크리스트로 감사**. 원·사각으로 뭉갠 조직, 비현실적 곡선(급랭 수직선 #6), 오배치 도표(austenite에 pearlite #17)는 같은 병의 증상. 결정격자 충전·수지상·석출물 형태까지 규약화.
- **표준**: `_voronoi_grains`를 공통 grain 헬퍼로 승격 → 모든 미세조직 도표가 사용. 상별 색·해칭 범례 필수.

### D2. 도표 명료성 (Self-explanatory)
- **원리**: 도표는 그 자체로 오해 없이 읽혀야 한다. 곡선 구별·라벨 무겹침·물리적으로 옳은 기울기·범례.
- 지적: #6.
- **더 넓게**: TTT 시작/완료 곡선 혼동은 한 사례 — **전 곡선/모식도에 명료성 루브릭** 적용(곡선마다 리더+라벨, 겹침 0, 축 의미, 화살표로 흐름). 작성 후 Read 시각검수 의무.
- **표준**: 명료성 체크리스트(§3.4).

### D3. 도표 고유성 (Figure = 문서의 시각적 논지)
- **원리**: 각 문서에는 그 **표제를 가장 잘 설명하는 전용 그림**. 범용 도표 재활용 최소.
- 지적: #19.
- **더 넓게**: 단순 dedup이 아니라 철학 전환 — "슬롯 채우기"가 아니라 "이 문서의 1학년 독자에게 가장 필요한 단 한 장". 재활용 실태: `grain-structure`×6·`steel-microstructures`×5·`stress-strain`×4·`passivation-pitting`×4·`strengthening-mechanisms`×4·`ttt-curve`×3·`fcc-bcc`×3·`gp-zones`×3·`iron-carbon`×3. 개념도는 대표 1문서, 파생은 그 문서 관점 전용 신규.
- **표준**: 42+ 문서 각각 "핵심 아이디어 1장" 매핑. 도표 수 25→40+ 예상.

### D4. 위키 연결 완전성 (Coverage completeness) — **핵심 통찰**
- **원리**: 본문·스토리·노트에 **언급된 모든 재료·용어는 링크/정의**되어야 한다(1학년에게 미정의 전문어·죽은 언급 = 학습 실패).
- 지적: #5·#9·#13·#15(예시 합금 부재) + #8·#11·#14(용어 부재) — **7건이 사실 하나의 병**.
- **더 넓게**: 이 7건은 spot이 아니라 코퍼스 전체의 커버리지 구멍. **감사 스크립트로 전 42문서 + 183스토리 + 절삭성/용접성/열처리 노트를 스캔** → (a) materials.json 이름·별칭과 매칭되나 링크 안 된 재료 언급, (b) 표준 lexicon에 있으나 글로서리 없는 용어 → 전수 목록화·교정. 7 spot-fix → 완전성 엔진.
- **표준**: `audit-wiki-coverage.mjs`(§4.1). "미정의 언급 0" 게이트 지향.

### D5. 용어 정확·일관 (Terminology integrity)
- **원리**: 프로젝트 전역 단일 용어 표준. 열처리·야금 전문어는 **영어 원문 우선**, 첫 등장만 "English(한글)". 오역·표기 흔들림 없음.
- 지적: #3(Normalizing→"정규화" 오역).
- **더 넓게**: Normalizing은 *발견된* 오역 하나 — **다른 오역·불일치도 스캔**. 같은 개념이 스토리/노트/글로서리/UI에서 다르게 표기되는지(소입/담금질/Quench 혼재 등) 린트. §3.1 대응표를 SSOT로.
- **표준**: `audit-terminology.mjs`(§4.2) + §3.1 확정표.

### D6. 콘텐츠 깊이·지식 통합 (Depth & de-siloing)
- **원리**: 학습 자료급 깊이(A4 2~3장), 하위 분류까지, **흩어진 지식을 위키로 통합**.
- 지적: #1(가이드 물성사전)·#2(2~3장)·#7(upper/lower bainite).
- **더 넓게**: 통합 대상은 물성사전만이 아니라 **모든 지식 사일로** — `ht-glossary.ts`(26 HT조건)·기호 글로서리(F symbol)·`welding-machinability.ts`·`selection-insights.json`. 위키가 단일 학습 표면이 되도록. 하위분류 필요 개념 전수 식별(bainite upper/lower·ferrite 아종·carbide 종류#18…).
- **표준**: 깊이 표준(§3.2) + 사일로→위키 통합 목록.

### D7. 정보 구조·렌더 충실 (Structure & rendering fidelity)
- **원리**: 내용에 맞는 형식(열거=표, 서사=산문, 번호=줄바꿈) + 깨끗한 렌더.
- 지적: #16(번호 줄바꿈)·#18(탄화물 종류 표).
- **더 넓게**: 번호 뭉침·표로 나을 열거는 전 문서에 산재 — **조성·grade 비교·조건 매트릭스**는 표로. 렌더 이슈(줄바꿈·whitespace·JSON 내 마크다운) 전수 점검. 필요 시 article 스키마에 `table` 블록 추가.
- **표준**: 콘텐츠 구조 가이드 + 스키마 확장 검토.

### D8. 콘텐츠 재단 (Tailoring over templating)
- **원리**: 생성 콘텐츠는 나열 덤프가 아니라 **합금 맞춤 산문**.
- 지적: #20(절삭성·용접성 나열식).
- **더 넓게**: 나열 안티패턴은 절삭성·용접성만이 아니라 **모든 생성 표면** — 열처리 조건 노트·선택 인사이트·코팅 추천에도. 각 생성 surface(`process-guidance.ts` 렌더 + JSON SSOT)를 합금 인지형 산문으로. 큰 표면.
- **표준**: 산문 톤 가이드 + surface별 리라이트(런타임 regex 없이 SSOT 편집).

### D9. 분류 완결 (Taxonomy completeness)
- **원리**: DB에 존재하는 **재료 계열/카테고리는 글로서리 페이지 + 대표 DB 멤버**를 가진다(양방향).
- 지적: 백주철·ADI(카테고리인데 글로서리·DB 둘 다 없음).
- **더 넓게**: 백주철·ADI 두 건이 아니라 — **DB 전 subcategory ↔ 글로서리 alloy-family 상호 감사**. 데이터에 있으나 페이지 없는 계열, 페이지 있으나 DB 표현 빈약한 계열 전수. 각 계열: 페이지+예시칩+DB 대표 grade.
- **표준**: §5 (백주철·ADI 즉시 추가) + `audit-family-coverage`(§4.3).

### D10. 독자 정합 (Audience fit — 관통 렌즈)
- **원리**: 위 모든 것을 **기계공학 1학년**이 이해하는지로 판정(memory `feedback_glossary_audience`).
- 관통 적용: 깊이(D6)·구조(D7)·산문(D8)·용어(D5)·도표(D1-3) 모두 이 렌즈로 검수.

---

## §2. 20건 → 차원 매핑 (추적)

| # | 지적(요약) | 차원 |
|---|---|---|
| 1 | 물성 글로서리 보충·확장 | D6 |
| 2 | A4 2~3장 | D6 |
| 3 | 영어원문 우선·Normalizing 오역 | D5 |
| 4 | martensite-morphology 다각형 grain | D1 |
| 5 | 마르텐사이트 예시 합금(공구강·4340·마레이징) | D4 |
| 6 | TTT 시작/완료 구별·겹침·급랭 기울기 | D2 |
| 7 | 베이나이트 upper/lower 하위 | D6 |
| 8 | Austempering 글로서리 | D4 |
| 9 | ADI 예시 합금 | D4·D9 |
| 10 | 시멘타이트 확장 + 다각형 조직 | D6·D1 |
| 11 | 준안정/안정상 글로서리 | D4 |
| 12 | 시멘타이트 미세조직 schematic | D1·D3 |
| 13 | 백주철 예시 | D9 |
| 14 | 석출·조대화 글로서리 | D4 |
| 15 | 크리프강 예시 | D4 |
| 16 | 번호 항목 줄바꿈 | D7 |
| 17 | 오스테나이트 조직도 재작성(펄라이트 오삽입) | D1·D3 |
| 18 | 탄화물 종류 표 + 조직도 | D7·D1 |
| 19 | 도표 재활용 최소·전용화 | D3 |
| 20 | 절삭성·용접성 산문화 | D8 |

---

## §3. 확정 표준

### 3.1 용어 대응표 — **확정(사용자 승인)**
열처리·야금 전문어는 영어 원문을 기본 표기로. 첫 등장 1회만 "English(한글)" 병기, 이후 English.

| 한글(축소) | 영어 표준 | 비고 |
|---|---|---|
| 담금질·소입 | **Quenching** | |
| 뜨임·소려 | **Tempering** | |
| 불림·~~정규화~~ | **Normalizing** | "정규화"=오역, 전면 교체 |
| 풀림 | **Annealing** | |
| 용체화 | **Solution treatment** | |
| 시효 | **Aging** | |
| 오스템퍼링 | **Austempering** | |
| 마르퀜칭 | **Martempering** | |
| 서브제로 | **Sub-zero / Cryogenic treatment** | |
| 응력제거 | **Stress relief** | |
| 오스테나이트화 | **Austenitizing** | |
| 침탄 | **Carburizing** | |
| 질화 | **Nitriding** | |
| 경화능 | **Hardenability** | |
| 적열경도 | **Red hardness** (hot hardness) | |
| 예민화 | **Sensitization** | |
> 상(相) 음역(오스테나이트·페라이트·마르텐사이트·시멘타이트)은 정착 표기 유지(γ/α 병기 허용). "정규화"의 **정당한 용례**(radar normalize base·source/keyword 정규화)는 건드리지 않음 — 열처리 문맥만 선별 교체.

### 3.2 깊이 표준 [D6]
A4 2~3장. 섹션: 개요 → 원리/기구(도해) → 조직·상(도해) → 성질(정량) → 대표 재료·용도(칩) → 열처리·공정 관계 → 주의·오해 → 관련 용어. "왜·얼마나·어디에" 포함. 1학년 눈높이.

### 3.3 구조 표준 [D7]
번호 항목=줄바꿈(`\n`+`whitespace-pre-line`). 열거(조성·grade·조건)=표. 필요 시 article 스키마 `table` 블록.

### 3.4 도표 표준 [D1·D2·D3]
Voronoi 다각형 grain(공통 헬퍼) · 상별 범례 · 곡선 리더+라벨·겹침 0 · 물리적으로 옳은 형태(급랭도 기울기) · mathtext 위첨자 · **작성 후 Read 시각검수** · 1문서 전용 그림.

---

## §4. 감사 도구 (전역 적용의 엔진 — 신규 `scripts/`)

spot-fix가 아니라 코퍼스를 스캔해 *모든* 위반을 찾는다.

- **4.1 `audit-wiki-coverage.mjs`** [D4]: 전 article `body` + 스토리 `sections` + 절삭성/용접성/열처리 노트를 스캔 → materials.json 이름·별칭과 매칭되나 미링크된 재료 언급, 표준 lexicon에 있으나 글로서리 없는 용어를 리포트. → 예시합금·신규용어 작업의 완전 목록.
- **4.2 `audit-terminology.mjs`** [D5]: §3.1 대응표 기준, 한글 열처리어·오역(정규화 등)·동일개념 표기흔들림을 전 텍스트 소스에서 flag(열처리 문맥 한정).
- **4.3 `audit-family-coverage.mjs`** [D9]: DB subcategory ↔ 글로서리 alloy-family 상호 대조 → 페이지 없는 계열·DB 빈약 계열 리포트.
- **4.4 도표 감사**: 재활용 맵(이미 산출) + 물리충실성·명료성 체크리스트(수동, D1·D2).
- **4.5 구조 감사**: article/스토리 body에서 번호 뭉침·표로 나을 열거 탐지(D7).

게이트化: 커버리지·용어 감사는 CI 리포트(점진적으로 "0 위반" 목표).

---

## §5. 분류 완결 — 백주철·ADI 추가 [D9] (사용자 확정)

**결정(사용자)**: 백주철·ADI는 카테고리 → **글로서리 등재 + 예시 합금 entry 조사·추가**.

### 5.1 글로서리 신규 용어 (alloy-family)
- **white-cast-iron** (백주철): 탄소가 Fe₃C(시멘타이트)로 굳어 파단면이 흰 주철. 매우 단단·취성, 내마모. ASTM A532(Ni-Hard·고Cr). cementite·carbide·gray-cast-iron 연결.
- **austempered-ductile-iron / ADI**: 구상흑연주철을 Austempering → ausferrite(베이나이트형) 조직. 강급 강도+주철 성형성. ASTM A897. bainite·austempering·ductile-iron 연결.
- (검토) 상위 **cast-iron** 용어(회주철·구상흑연·백주철·가단주철 분기 허브).

### 5.2 DB entry 추가 (DATA-WORKFLOW 준수 — 소스→build:registry)
검증된 규격값으로 신규 entry(근거 datasheet 인용):
- **백주철 ASTM A532**: Class III(25%Cr, ~600 HB/HRC 55–60, Cr카바이드) 대표 1 + (선택) Class I Ni-Hard 1(~500 BHN). 조성·경도 = ASTM A532/A532M.
- **ADI ASTM A897**: Grade 1(900/650/9 MPa, ~269–321 HB), Grade 3(1200/850/4), Grade 5(1600/1300/0, ~444–555 HB) 중 2~3. 인장/항복/연신/경도 = ASTM A897/A897M.
- 기존 근사재(`R_0083` Ductile Iron 등)와 `related[]` cross-ref.
> 출처: ASTM A532(백주철)·ASTM A897(ADI). 웹 조사 완료(Penticton Foundry·Pacific Alloy·ASTM 규격). 실제 추가 시 datasheet URL 인용·`tier` 지정.

### 5.3 전역 계열 감사
§4.3으로 DB 전 계열 대조 → 백주철·ADI 외 페이지 없는 계열(가단주철·고Mn강·베어링강 등?) 추가 후보 도출.

---

## §6. 문서·용어·도표 구체 작업 (부록 — 차원별)

### 신규 글로서리 용어 [D4]
austempering · **metastable-phase/stable-phase**(Fe₃C 준안정 vs 흑연 안정 — 상태도 실선/점선, **매우 중요**) · precipitation(석출, precipitation-hardening과 구분) · coarsening(조대화/Ostwald) · white-cast-iron · ADI · (감사 4.1 결과 추가분).

### 예시 합금 칩(조사된 후보 ID) [D4]
- 마르텐사이트: 공구강 `G_0315`(D2)·`R_0008_0`(H13) · AISI 4340 `R_0278_1`(Q+T) · 마레이징 `C_0075`(Aged)/`R_0004_0`(M300).
- 시멘타이트: 크리프강 `R_0330_0`(P91) · 백주철(§5.2 신규) · 펄라이트강.
- 베이나이트: ADI(§5.2 신규) · (근사 `R_0083` Ductile Iron).

### 도표 [D1·D2·D3]
개선: martensite-morphology(다각형)·ttt-curve(시작/완료 구별·급랭 기울기)·steel-microstructures(다각형). 신규: austenite 조직(펄라이트 제거)·cementite 미세조직(층상/초석망/구상/미세분산)·carbide 조직(입내·입계·WC-Co)·white-iron/ADI 조직 + 감사(4.4)로 도출되는 재활용 해소 전용도.

### 물성 글로서리 article [D6]
가이드 물성사전·기호 글로서리 통합 → hardness·yield-strength·tensile-strength·elastic-modulus·elongation·dbtt·fatigue-limit(+poisson 등) A4 신규.

### 절삭성·용접성 [D8]
`process-profiles.json`·`machining-guidance.json`·용접 노트를 합금 맞춤 산문으로. `lib/process-guidance.ts` 렌더 산문친화.

### 탄화물 [D7]
종류 표(M3C·M7C3·M23C6·MC·M2C·M6C: 조성·경도·안정도·석출위치)를 본문 앞에.

---

## §7. 실행 단계 (차후, 저위험·점진 — 차원 순)

| Phase | 내용 | 차원 |
|---|---|---|
| **0** | 이 계획 v2 확정 · 용어표 확정(§3.1) | — |
| **1** | 감사 도구 3종(§4.1~4.3) 작성·1차 리포트 | D4·D5·D9 |
| **2** | 도표 표준(Voronoi 헬퍼) + 문제 도표 개선/신규(§6 도표) | D1·D2·D3 |
| **3** | 백주철·ADI 글로서리+DB entry(§5) + 계열 감사 후속 | D9 |
| **4** | 신규 용어(§6 용어) + 미세조직·상 클러스터 A4 2~3장 확장 | D4·D6 |
| **5** | 용어 전역 스윕(**Normalizing 오역 우선**) — 스토리·절삭성·열처리·용접성 | D5 |
| **6** | 절삭성·용접성·생성 콘텐츠 산문화 | D8 |
| **7** | 물성 글로서리 통합 + 나머지 문서 소급(2~3장·구조·전용도) | D6·D7·D3 |

각 Phase: 감사 리포트 기반 완전 목록 → 작업 → 게이트(`glossary*`·`process-profiles`·`alloy-stories`·`registry-integrity`) → tsc → preview·도표 Read 검수 → 로컬 커밋.

---

## §8. 리스크·주의
- **전역 스윕 오탐**: 다의어(정규화 등) 문맥 선별, 전수 치환 금지.
- **작업량**: 차원별 코퍼스 스윕은 큼 → 감사가 목록을 주고, 클러스터별 회차 분할.
- **DB entry 추가**: registry SSOT·corrections·round-trip 무손실([[project_longterm_principles]]) 준수. 값은 규격 datasheet 근거.
- **도표 40+**: 생성시간·크기 관리, 공통 헬퍼로 일관성.
- **깊이·산문 확대**로 스토리/노트 대량 편집 → 게이트로 회귀 방지.
