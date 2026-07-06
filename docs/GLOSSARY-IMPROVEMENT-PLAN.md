# 글로서리·상세 문서 개선 계획 (R227/E14/H4d)

**목적**: 사용자 피드백 20건(2026-07)을 근거로, 글로서리 A4 문서·도표·용어 정책·절삭성/용접성 상세를 전면 개선하기 위한 실행 계획. **이 문서는 계획서이며, 실제 작업은 각 문서를 기반으로 차후 회차에 진행한다.**

관련: 작성 절차·현황은 [WIKI-CROSSREF-DESIGN.md](WIKI-CROSSREF-DESIGN.md) §N/§O/§P, 독자 눈높이는 memory `feedback_glossary_audience`(기계공학 1학년), 도표 워크플로우는 §O.3.

---

## 1. 지적사항 → 조치 추적표 (20건)

| # | 지적 | 유형 | 조치 위치(§) |
|---|---|---|---|
| 1 | 물성 글로서리 보충·확장(가이드 물성사전 참조, 더 자세·예시) | 문서 | §6.1 |
| 2 | A4 1장 기준 삭제 → **2~3장** 기준(기존 문서 포함) | 표준 | §2.1 |
| 3 | 담금질·뜨임 등 한국어 번역 축소, **영어 원문 우선**(글로서리·스토리·절삭성·열처리·용접성 전체). **Normalizing→"정규화" 오역**은 큰 실책 | 표준 | §3 |
| 4 | martensite-morphology 그림: Grain 을 **불규칙 다각형(Voronoi, 6각 이상)** 으로 | 도표 | §4.A |
| 5 | 마르텐사이트 문서: 공구강·AISI 4340·마레이징강 **예시 합금 링크 없음**(17-4 PH만 있음) | 보충 | §6.2 |
| 6 | 마르텐사이트 TTT: 시작/완료 곡선 **구별(화살표)**·글자-곡선 겹침 제거·급랭도 **약간 기울기** | 도표 | §4.B |
| 7 | 베이나이트: **upper/lower bainite 하위 설명** 추가 | 문서 | §6.3 |
| 8 | 베이나이트: **Austempering 글로서리 없음** | 용어 | §5 |
| 9 | 베이나이트: **ADI 합금 예시 없음** | 보충 | §6.3 |
| 10 | 시멘타이트 설명 매우 부족 → 대폭 확장 + 탄소함량별 미세조직 **다각형 grain** 으로(웹검색) | 문서·도표 | §6.4·§4.C |
| 11 | 시멘타이트: **준안정상(metastable)·안정상(stable) 글로서리 없음**(매우 중요) | 용어 | §5 |
| 12 | 시멘타이트: 둥근 입자·미세 석출·구상/미세분산 **미세조직 schematic 없음** | 도표 | §4.D |
| 13 | 시멘타이트: **백주철(white cast iron) 예시 없음** | 보충 | §6.4 |
| 14 | 시멘타이트: **석출(precipitation)·조대화(coarsening) 글로서리 없음** | 용어 | §5 |
| 15 | 시멘타이트: **크리프강 예시 없음** | 보충 | §6.4 |
| 16 | 주의점 등 **번호 항목 줄바꿈** 신경쓸 것 | 표준 | §2.3 |
| 17 | 오스테나이트: 조직 그림 나쁨 + **펄라이트 그림 오삽입** → schematic 규칙대로 재작성 | 도표 | §4.E |
| 18 | 탄화물: **조직 그림 없음** + **종류는 본문 앞 표**로 정리 | 문서·도표 | §6.6·§4.F |
| 19 | **그림 재활용 과다** → 최소화, 각 문서 표제를 가장 잘 설명하는 전용 그림 | 표준·도표 | §2.4·§4.G |
| 20 | 절삭성·용접성 권장방법·권고절차·주의사항 **너무 나열식** → 깔끔·합금 맞춤 산문 | 상세 | §7 |

---

## 2. 새 작성 표준 (전 문서 공통, 기존 42문서에도 소급)

### 2.1 분량 — A4 **2~3장** [#2]
- 기존 "짧은 A4 1장" 기준 폐기. 각 문서를 A4 2~3장 분량으로 확장.
- 섹션 흐름 확장안: **개요 → 원리/기구(도해) → 조직·상(도해) → 성질(정량·그래프) → 대표 재료·용도(예시 칩) → 열처리·공정 관계 → 주의·오해 → 더 알아보기(관련 용어)**. 6→8+ 섹션.
- 깊이: 정의에 그치지 말고 "왜 그런가"(기구), "얼마나"(대략 수치·범위), "어디에 쓰나"(재료·산업)까지. 1학년 눈높이 유지(용어 풀어쓰기·약어 전개).

### 2.2 예시·수치 강화 [#1,#5,#9,#13,#15]
- 각 문서에 **대표 재료 칩(example_materials)** 최소 2~3(실 material ID). 없으면 §6 조사표로 확보(없으면 DB 추가 검토).
- 개략 수치(경도 HV/HRC, 온도역, 조성 %)는 표준 핸드북 근거로 범위 제시("개략" 명기).

### 2.3 번호 항목 줄바꿈 [#16]
- `주의점` 등 ①②③ 나열 항목은 **각 항목을 줄바꿈**해 렌더(현재 한 문단에 뭉쳐 가독성 저하). JSON `body` 에 `\n` 삽입 + 렌더러 `whitespace-pre-line` 활용(이미 지원). 또는 sections 를 항목별 분리.

### 2.4 도표 전용 원칙 [#19]
- **1 문서 = 그 표제를 가장 잘 설명하는 전용 그림 1+**. 범용 도표 재활용 최소화.
- 현재 재활용 실태(개선 대상): `grain-structure`×6, `steel-microstructures`×5, `stress-strain`×4, `passivation-pitting`×4, `strengthening-mechanisms`×4, `ttt-curve`×3, `fcc-bcc`×3, `gp-zones`×3, `iron-carbon`×3.
- 공통 개념도(예: 4대 강화기구, Fe-C 상태도)는 **개념 문서(대표 1곳)**에서 쓰고, 파생 문서는 그 문서 고유 관점의 전용 그림을 새로 그린다.
- 도표 없는 문서(tool-steel·maraging-steel·stress-relief)도 전용 그림 신규.

### 2.5 미세조직 schematic 규칙 [#4,#10,#17]
- **Grain = 불규칙 다각형(Voronoi, 대개 6각 이상)**. 원·사각 금지. `gen-glossary-figures.py` 의 `_voronoi_grains` 를 **공통 grain 렌더 헬퍼**로 승격, 모든 미세조직 도표가 사용.
- 상(相)은 색·해칭으로 구분(페라이트 밝음·시멘타이트 어둠·펄라이트 층상·마르텐사이트 침상 등), 각 도표에 범례.
- 겹침 0·mathtext(위첨자·화학식)·작성 후 Read 시각검수(§O.3 규칙 유지).

---

## 3. 용어 영어 원문 우선 정책 [#3] — 프로젝트 전역

**원칙**: 열처리·야금 전문용어는 **영어 원문을 기본 표기**로 쓴다. 첫 등장 1회만 "English(한글)"로 병기해 1학년 독자를 배려하고, 이후 English 사용. 적용 범위 = 글로서리·**alloy-stories**·**process-profiles(절삭성)**·**ht-alloy-specific/ht-glossary(열처리)**·**welding(용접성)** 상세 전부.

### 3.1 용어 대응표 (표기 표준)
| 한글(축소) | 영어 원문(표준 표기) | 비고 |
|---|---|---|
| 담금질·소입 | **Quenching** | |
| 뜨임·소려 | **Tempering** | |
| 불림·~~정규화~~ | **Normalizing** | **"정규화"는 오역(=normalization) — 전면 교체** |
| 풀림 | **Annealing** | |
| 용체화 | **Solution treatment** | |
| 시효 | **Aging** | |
| 오스템퍼링 | **Austempering** | 글로서리 신규(§5) |
| 마르퀜칭 | **Martempering** (Marquenching) | |
| 서브제로 처리 | **Sub-zero / Cryogenic treatment** | |
| 응력제거 | **Stress relief** | |
| 오스테나이트화 | **Austenitizing** | |
| 침탄 | **Carburizing** | |
| 질화 | **Nitriding** | |
| 경화능 | **Hardenability** | |
| 적열경도 | **Red hardness** (hot hardness) | |
| 예민화 | **Sensitization** | |
> 상(相) 명칭(오스테나이트·페라이트·마르텐사이트 등)은 이미 음역 정착 — 유지하되 문맥 따라 γ/α/Austenite 병기 허용.

### 3.2 Normalizing 오역 수정 (최우선) [#3]
- `data/alloy-stories.json` 에서 열처리 Normalizing 을 "정규화"로 옮긴 사례 전수 교체(현재 확인: 여러 story `breakthrough` 필드). **주의**: "정규화"의 정당한 용례(radar normalize base·source/keyword 정규화·검색 정규화)는 건드리지 않음 — 열처리 문맥만 선별.
- 스윕 후 게이트 `tests/alloy-stories.test.ts` + preview 확인.

### 3.3 autolink 영향
- 용어 영어화로 한글 surface_form 노출이 줄면 자동링크 매칭 폼도 조정 필요. glossary.json 의 `surface_forms`/`autolink` 에 English 폼이 이미 포함돼 있는지 점검, 영어 표기에도 링크가 걸리도록 보강. 한글 autolink 정책(KO 경계·동음이의)은 유지.

---

## 4. 도표 작업 목록 (`scripts/gen-glossary-figures.py`)

### 4.A martensite-morphology 개선 [#4]
- 배경 grain 을 `_voronoi_grains` 불규칙 다각형으로. 그 위에 라스(packet 내 평행선)·판상(렌티큘러 교차) 표현.

### 4.B ttt-curve 개선 [#6]
- 변태 **시작 곡선 vs 완료 곡선**을 선 스타일+**곡선별 화살표/라벨 리더**로 명확 구분(현재 실선/점선만이라 혼동). 라벨-곡선 겹침 0.
- **급랭 경로도 완전 수직이 아니라 약간의 기울기**(현실 냉각속도) 부여.

### 4.C steel-microstructures 재작성 [#10]
- 원형 클리핑 → **다각형 grain(Voronoi)** 바탕. 아공석(페라이트 다각립+펄라이트 콜로니)·공석(전 펄라이트)·과공석(펄라이트+입계 시멘타이트 망)을 다각립 위에 표현. 웹검색으로 실제 조직 형태 확인 후 도해화.

### 4.D cementite 미세조직 schematic 신규 [#12]
- 시멘타이트 형태 4종: **층상(펄라이트)·초석 입계망·구상(spheroidized)·미세 분산 석출**을 한 도표(다패널)로. 다각형 grain 기반.

### 4.E austenite 전용 조직 그림 신규 [#17]
- 현재 austenite 에 **pearlite 그림 오삽입** → 제거. 오스테나이트 고유(등축 FCC 다각립·쌍정 annealing twin·비자성 강조) 전용 schematic 신규. 기존 `fcc-bcc`(결정구조)와 별개의 "조직" 그림.

### 4.F carbide 조직 그림 신규 [#18]
- 기지 다각립 + 분산 탄화물(입내 미세 MC·입계 M23C6 망)·초경(WC-Co) 도해.

### 4.G 재활용 해소 (전용화) [#19]
- 우선 분화 대상: `grain-structure`(6곳)·`steel-microstructures`(5곳)·`strengthening-mechanisms`(4곳)·`passivation-pitting`(4곳). 각 파생 문서 관점의 전용 변형 또는 신규.
- 원칙: 개념 도표는 대표 문서에만, 나머지는 그 문서 표제 전용 그림.

---

## 5. 신규 글로서리 용어 [#8,#11,#14]

`data/glossary.json` 신규 등재 + A4 문서(§2 표준):
- **austempering** (Austempering) — category: heat-treatment. bainite·quenching·ADI 연결. [#8]
- **metastable-phase** (준안정상, metastable) + **stable-phase** (안정상, stable phase) — category: phase. Fe₃C(준안정) vs 흑연(안정), 상태도 실선/점선 의미. **매우 중요** — cementite·iron-carbon 연결. [#11]
- **precipitation** (석출) — category: strengthening 또는 phase. precipitation-hardening 과 구분(석출 = 일반 현상). [#14]
- **coarsening** (조대화, Ostwald ripening) — category: phase/strengthening. 과시효·크리프강 탄화물 조대화 연결. [#14]

각 신규 용어는 관련 문서(시멘타이트·베이나이트 등)에서 자동링크되도록 surface_forms/autolink 설정.

---

## 6. 문서별 확장·보충

### 6.1 물성 글로서리 보충·확장 [#1]
- 가이드 **물성 사전(Ch.1/Ch.5 등)** 의 정의·기호(F symbol glossary, `guide/components.tsx`)를 참조해, 기계성질 용어에 A4 2~3장 문서 신규:
  - 대상(현재 term 은 있으나 article 없음): **hardness·yield-strength·tensile-strength·elastic-modulus·elongation·dbtt·fatigue-limit** + (검토) poisson·strain-hardening-exponent.
  - 각 문서: 정의·측정법(시험)·전형 수치 범위·재료별 비교·설계 함의·전용 그래프. 대표 재료 칩.

### 6.2 마르텐사이트 예시 합금 보충 [#5]
- 현재 example_materials = 17-4 PH 만. 추가:
  - 공구강 → `G_0315`(D2)·`R_0008_0`(H13)
  - AISI 4340 → `R_0278_1`(Q+T 550°C) 또는 `R_0278_0`(Annealed)
  - 마레이징강 → `C_0075`(Aged) / `R_0004_0`(M300)
- 본문 "공구강·AISI 4340·마레이징강·17-4 PH" 문구와 칩 1:1 대응.

### 6.3 베이나이트 확장 [#7,#8,#9]
- **Upper/Lower bainite 하위 섹션 추가**: 변태 온도역·탄화물 배열(페라이트 판 사이 vs 판 내부)·인성 차이. 전용 도해(§4 규칙).
- **Austempering** 용어 링크(§5 신규).
- **ADI 예시**: DB 에 austempered ductile iron 미보유 — 대안 `R_0083`/`R_0337_0`(Ductile Iron) 링크 + "오스템퍼 처리 시 ADI" 설명, 또는 ADI entry 신규 추가 검토.

### 6.4 시멘타이트 대폭 확장 [#10~15]
- 설명 확장(결정구조 사방정·경도·형태별 역할·상 안정성)·번호항목 줄바꿈.
- **준안정/안정상** 링크(§5), **석출·조대화** 링크(§5).
- **미세조직 schematic**(§4.D)·**탄소함량별 다각형 조직**(§4.C).
- **백주철 예시**: DB 미보유 → white cast iron entry 추가 검토 또는 예시 생략+설명.
- **크리프강 예시** → `R_0330_0`(Grade 91/P91, Normalized+Tempered).

### 6.5 오스테나이트 [#17]
- 조직 그림 교체(§4.E). 본문에서 pearlite 참조는 "냉각 시 분해 산물"로 문맥 유지하되 오스테나이트 고유 조직 도해 사용.

### 6.6 탄화물 [#18]
- 본문 **앞부분에 탄화물 종류 표**(M3C·M7C3·M23C6·MC·M2C·M6C: 조성·경도·안정도·석출 위치). 조직 그림(§4.F) 추가.

---

## 7. 절삭성·용접성 상세 리라이트 [#20]

- 현재 `data/machining-guidance.json`·`data/process-profiles.json`(절삭성 note·주의)·용접성 노트가 **나열식(불릿 나열)** → 합금 특성에 맞춘 **간결한 산문**으로.
- 방향: "무엇을·왜·어떻게"를 2~4문장으로 묶고, 합금군별 특이점(예: 오스테나이트계 SS 가공경화·석출경화강 시효 후 절삭·듀플렉스 입열관리)을 반영. 영어 용어 원문(§3).
- SSOT 편집(런타임 regex 없음): 가이드 ID 시스템 유지, `lib/process-guidance.ts` 렌더만 산문 친화적으로.
- 게이트: `tests/process-profiles.test.ts`·`machinability-robustness` 유지.

---

## 8. 단계 계획 (차후 실행 — 저위험·점진)

| Phase | 산출 | 선행 | 비고 |
|---|---|---|---|
| **0** | 이 계획 확정 + 용어 대응표(§3.1) 합의 | — | 현재 |
| **1** | 도표 규칙(Voronoi grain 헬퍼 승격) + 개선 3(martensite-morphology·ttt·steel-microstructures) + 신규 3(austenite·cementite·carbide 조직) | 0 | §4 |
| **2** | 신규 용어 4(austempering·metastable/stable·precipitation·coarsening) + 문서 | 0 | §5 |
| **3** | 미세조직·상 클러스터 A4 2~3장 확장 + 예시 합금(마르텐사이트·시멘타이트·오스테나이트·베이나이트·탄화물) | 1·2 | §6.2~6.6 |
| **4** | 물성 글로서리 article 신규(기계성질 7종) | 0 | §6.1 |
| **5** | 용어 영어화 전역 스윕 + **Normalizing 오역 수정** | 0 | §3 (스토리·절삭성·열처리·용접성) |
| **6** | 절삭성·용접성 산문 리라이트 | 5 | §7 |
| **7** | 나머지 42문서 A4 2~3장 소급 확장 + 번호줄바꿈 + 도표 전용화 | 1~5 | §2 |

각 Phase: JSON 검증 → 게이트(`glossary*`·`process-profiles`·`alloy-stories`) → tsc → preview 렌더/겹침 검수 → 로컬 커밋. 도표는 Read 시각검수 필수.

---

## 9. 리스크·주의
- **용어 영어화 스윕**: "정규화" 등 다의어는 문맥 선별(오탐 시 정당한 용례 훼손). 전수 치환 금지, 열처리 문맥만.
- **분량 2~3배 확대**: 번들·초기 로드 영향 미미(정적 JSON) 하지만 작성 노동 큼 → 클러스터별 회차 분할.
- **도표 전용화**: 그림 수 증가(현재 25 → 40+ 예상) — 파일 크기·생성시간 관리. 공통 헬퍼로 일관성.
- **예시 합금 부재**(백주철·ADI): DB 확장 vs 설명 대체 — Phase 3 착수 시 결정.
- **무손실·게이트 준수**([[project_longterm_principles]]): 스토리/데이터 교정은 round-trip 안전하게.
