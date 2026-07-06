# 위키형 상호참조 시스템 — 설계·백본 (R227 / E14)

**목적**: 재료↔재료 백링크(본문 포함)와 본문 내 기술용어 백링크를 얹어, DB를 "위키처럼 서로 이어지는" 지식망으로 만든다. 링크 밀도가 오르면 검색이 지저분해지므로 **검색 알고리즘도 함께 개편**한다.

**범위**: 이 문서는 *설계·백본·단계 계획*이다. 실제 구현은 후속 회차. 원칙은 [LONGTERM-PLAN.md](LONGTERM-PLAN.md) §1, 편집 맵은 §3, 스토리 시스템 선례는 [STORY-SYSTEM.md](STORY-SYSTEM.md).

> **R227 적대적 리뷰 반영판**. 초안의 치명적 결함 3건을 실제 데이터로 검증·교정: (1) auto-link 는 **blocklist 가 아니라 allowlist** 여야 한다(§4.1·근거 §A), (2) **Phase 의존 그래프가 깨져** 있었다(파생 backlink 는 매처 없이는 불가 — §6), (3) **검색 개편이 표 필터 술어(narrowedRanges R209)를 건드리면 안 된다**(§5.4). 그 외 대표-entry 해석 규칙·한국어 경계·성공지표·검증 하네스를 구체화.

---

## A. 핵심 근거: "왜 auto-link 는 allowlist 여야 하는가" (측정)

초안은 "STOP-list 로 범용어를 빼면 된다"고 했다. **실측 결과 이는 불가능하다.** 스토리 코퍼스(242종·163KB)에 재료 이름/별칭 surface-form 후보 1656개를 naive substring 매칭한 결과:

| surface-form | 길이 | 코퍼스 매칭 수 | 실태 |
|---|---|---|---|
| `30` | 2 | **210** | "1930·230·6%·H1300" 내부 — 거의 전부 오탐 |
| `PE` | 2 | **120** | "type·PEEK·operation" 내부 |
| `Cr` `Cu` `Ta` `Re` | 2 | 118·47·61·59 | 원소기호 — 조성 서술 전체에서 오탐 |
| `PC` `PS` `PP` `PI` | 2 | 21·38·36·19 | 폴리머 약어끼리·일반어와 충돌 |
| `6%` `12%` `4h` `500` | 2~3 | 19·10·6·30 | 이름 파서가 흘린 쓰레기 form |

- **결론**: 짧은 이름은 blocklist 로 못 막는다(수백 개·문맥 의존). 정답은 **surface-form 별 opt-in(allowlist)** — 각 form 에 `autolink` 플래그를 명시적으로 켠 것만 자동 링크.
- **동시에 링크 대상은 유한**: 1656 후보 중 실제 코퍼스 등장은 **409개**, 그중 len≤3 위험군 **67개**. 즉 큐레이션 규모가 감당 가능(수백 건 1회 검수)하다.
- **자동 규칙 부트스트랩**: allowlist 초기값은 "len≥4 AND 단어경계 매칭 AND ambiguity_group 단독"을 만족하는 form 만 `autolink:true` 로 빌드가 제안 → 사람이 검수/토글. len≤3·원소기호·약어·%·시간(h) 토큰은 기본 `false`(명시 `[[…]]` 만).

---

## B. 설계 대전제 (프로젝트 원칙과의 정합 — 위반 = 회귀)

1. **런타임 이름/regex 매칭 0** — 링크 대상은 빌드타임에 **stable_id / canonical slug** 로 해석(freeze), 런타임은 조회만. 임의 substring 링크 = "런타임 regex" 안티패턴 → 금지(§A 가 이유).
2. **SSOT + 게이트** — 링크·용어는 선언적 JSON(SSOT), 빌드가 인덱스 생성, 테스트가 무결성 강제(미해결 `[[…]]` = 빌드 에러).
3. **무손실·append-only** — 본문 원문 훼손 금지. 링크는 마커(`[[…]]`) 또는 별도 필드로만.
4. **모놀리스 동결** — `build-materials.mjs` 미편집. 신규 파이프 `scripts/build-wiki-index.mjs`.
5. **신뢰성** — auto-link 는 *allowlist 된 surface-form* 에서만. 용어 정의는 스토리처럼 출처 규율.
6. **UI 는 숨기지 않고 타입 구분 표기**(원칙 8).

---

## C. 엔티티 분류 & 대표-entry 해석 (초안의 hand-wave 제거)

| 타입 | 예 | target(빌드 해석) | 클릭 동작 |
|---|---|---|---|
| `material` | "300M", "AISI 304", "N07718" | **story_key(slug) + rep_stable_id** | 대표 entry 상세 열기 |
| `term` | "석출경화", "γ′", "PREN", "DBTT" | glossary slug | 용어 팝오버 |
| `guide` | "S-N 곡선"→ch7 | **Guide 챕터 id(`ch1`~`ch14`)** | Guide 이동+앵커 스크롤 |
| `element` | "Cu", "Ni" | — | **auto-link 대상 아님**(§D) |

**대표-entry 해석 규칙(결정적, 빌드타임)** — 한 이름이 여러 조건 row 로 확장되는 문제(예 "AISI 304"→수십 조건)를 접는 규칙:
1. 링크의 1차 단위는 **story_key**(그룹 슬러그). 클릭 시 열 entry 는 그 story_key 멤버 중 **rep_stable_id** 1개.
2. `rep_stable_id` 선정 순서: (a) heat_treatment 가 base/annealed/solution/as-supplied 인 것 → (b) 없으면 popularity 최고 → (c) 동률이면 stable_id 최소. **결정적·게이트 검증**.
3. story 가 없는 재료(향후 신규)는 이름→stable_id 직접, story_key 는 null.
> 링크가 story-group 단위인 이유: 상세 패널이 어차피 그룹 스토리를 노출하므로, 멤버 조건 중 아무거나 열어도 스토리는 같다. 조건 정밀 지정은 검색/필터의 몫.

---

## D. auto-link 안전 규칙 (지저분함 방지의 본체)

surface-form 이 `autolink:true` 여도, 렌더 시 아래를 **모두** 통과해야 링크:
1. **allowlist 게이팅** — form 이 wiki-index 에서 `autolink:true` (§A 부트스트랩+수동검수).
2. **단어경계 매칭** — raw substring 금지. 라틴 토큰은 `\b`(영숫자 경계), **한국어는 조사/접미 허용 경계**: form 뒤에 한글 조사(을/를/이/가/은/는/에/으로/로/의/와/과/도/만…)·공백·문장부호가 오면 매칭("마르텐사이트로"→"마르텐사이트" OK, "마르텐사이트계"는 별도 처리). 매처는 **한글 boundary 규칙표**를 갖는다.
3. **self-link 금지** — 현재 재료의 이름/별칭 form 은 링크 안 함.
4. **섹션당 첫 등장만** — 같은 섹션 반복 form 은 1회만 링크(시각 소음·과링크 차단).
5. **ambiguity_group 단독** — 같은 표면형이 2개 이상 엔티티로 해석되면 auto-link 제외 → 명시 `[[…]]` 만(예 "PC"=polycarbonate vs 문맥, "PH"=석출경화 vs pH).
6. **element/숫자/temper 제외** — 원소기호(Cu·Ni), 순수 숫자(304·500), 시간·온도 토큰(6h·480°C)은 auto-link 하지 않음. 원소는 조성 UI 에서 별도 처리(선택).

표시: 재료=실선 밑줄, 용어=점선 밑줄(타입 시각 구분, 원칙 8). authored `[[…]]` 는 위 2~6을 우회하되 self-link 만 회피.

---

## E. 데이터 / SSOT

### E.1 재료 lexicon — **자동 생성**(신규 authoring 불필요)
`scripts/build-wiki-index.mjs` 가 기존 SSOT 도출:
- 입력: `materials.json`(name·aliases·uns·families·story_key·popularity·stable_id·heat_treatment) + `alloy-stories.json`(display·stable_ids).
- surface-form 추출: **`scripts/audit-story-names.mjs` 토큰화 로직을 `scripts/lib/name-tokens.mjs` 로 승격·재사용**(지정자·접두사 탈락형·인접쌍·화합물식·한글 별칭·규격 STOP — 이미 검증). 단, 여기에 §A 의 쓰레기 form(`6%`·`4h`·순수숫자) 필터를 추가.
- 산출 엔티티: `{ id, type:'material', display, story_key, rep_stable_id, surface_forms:[{form, autolink:bool}], uns[], ambiguity_group }`.

### E.2 용어집(glossary) — **신규 authoring**(스토리 플레이북 재사용)
`data/glossary.json`:
```jsonc
"precipitation-hardening": {
  "display_ko": "석출경화", "display_en": "Precipitation hardening",
  "aliases": ["시효경화", "age hardening"],   // "PH" 는 aliases 에 넣되 autolink:false (ambiguity)
  "surface_forms": [{ "form": "석출경화", "autolink": true }, { "form": "시효경화", "autolink": true }],
  "category": "강화기구",
  "definition": "고용체에서 미세한 2차상을 석출시켜 전위 이동을 막아 강화하는 기구. …(2~4문장, 출처 규율)",
  "related": ["gamma-prime", "solution-treatment"],       // 용어↔용어
  "see_also_materials": ["17-4-ph-uns-s17400", "inconel-718"],   // 용어→대표 story_key
  "refs": ["ASM Handbook Vol.4 …"]
}
```
- 씨앗: `ht-glossary.ts`(26 HT 조건)+스토리 빈출 용어(석출경화·가공경화·마르텐사이트·오스테나이트·페라이트·γ′/γ″·PREN·DBTT·탈아연·응력부식균열·크리프·변태강화·경화능·2차경화·적열경도·감쇠능·부동태·침탄·질화…) → 회차별 작문(초회 ~40, 확장 ~100).
- 신뢰성: 스토리와 동일(출처 필수·불확실 배제·길이 상한·KO+EN 표제).

### E.3 authored 링크 — 본문 `[[…]]` (신뢰 최상, **범위 = 모호/고가치만**)
- **모든 언급을 마커화하지 않는다**(그건 스토리 재작문급 노동). authored 링크는 (a) auto-link 가 못 잡는 **모호 표면형**(PC·PH·300M vs 300 등), (b) **문맥상 중요한 상호참조**(AerMet↔300M, PEEK↔PEKK)만. 대량은 allowlist auto-link 가 담당.
- 문법: `[[300m]]`(slug), 표시 커스터마이즈 `[[표시|slug]]`, 가이드 `[[guide:ch7]]`, 용어 `[[term:precipitation-hardening]]`.
- **미해결 slug = 빌드 에러**(스토리 이름-커버리지 게이트와 동형).

---

## F. 빌드 백본 — `scripts/build-wiki-index.mjs`

입력(E) → 산출 4종(커밋·게이트):
1. **`data/wiki-index.json`** — canonical 엔티티 레지스트리(id·type·display·target·surface_forms[autolink]·ambiguity_group·uns). 링크·검색의 단일 소스.
2. **authored 링크 해석** — 스토리별 `[[…]]` 파싱→검증→resolved(`build:data` 가 `story_v2.links[]` 스탬프, 또는 `story-links.json`).
3. **`data/wiki-backlinks.json`** — 역인덱스("여기를 가리키는 것"): 엔티티별 참조원. **오직 authored 링크 + allowlist auto-link 결과에서만 집계**(naive substring 금지 — §6 Phase 의존성).
4. **auto-link surface table** — `autolink:true` form 만 담은 최장일치 매처(트라이 직렬화, ~수백 패턴 = 성능 무부담) + 한글 boundary 규칙.

**게이트**(`tests/wiki-index.test.ts`): 전 `[[…]]` 해결·canonical slug 중복 0·rep_stable_id 결정성·surface-form 충돌→ambiguity_group 자동분류·backlink 대칭성·lexicon parity.
**staleness**: wiki-index 는 materials/stories/glossary 해시 스탬프 보유 → 상류 변경 후 미재빌드면 게이트 실패(points↔ranges R226e 선례).

빌드 순서: `build:data` → **`build:wiki`** → 클라이언트 정적 로드.

---

## G. 런타임 (presentation)

### G.1 `linkify(text, ctx)` — 순수 함수(lib, 유닛테스트)
입력: 텍스트 + 문맥(현재 material·section). 출력: React 노드(인식 span→`<WikiLink>`). authored `[[…]]` 우선 파싱 → 그 외 구간에 §D 규칙으로 allowlist auto-link 적용.

### G.2 `<WikiLink>` UX
- hover: 프리뷰 카드(재료=대표 물성 3~4개, 용어=정의 1줄, 가이드=챕터명). 모바일=탭 팝오버.
- click: 재료→`onSelectMaterial(rep)`(기존 재사용), 용어→`GlossaryPopover`, 가이드→Guide 라우트+해시.
- a11y: `<button>` semantics·키보드 이동·타입 aria-label.

### G.3 "여기를 가리키는 것"(backlinks) — **유사재료 카드와 명확히 분리**
현행 `SimilarMaterialsCard`(물성 log-distance)와 **다른 축**임을 UI 카피로 명시:
- 유사재료 = "성질이 비슷한 대체 후보"(정량).
- 상호참조 = "이 재료를 **이야기 속에서 언급**하는 재료·용어"(서술적 관계). 라벨 예: "함께 언급되는 재료 / 등장 용어". 두 카드는 상세 패널에서 시각적으로 구분(아이콘·색).

---

## H. 검색 알고리즘 개편 (사용자 핵심 우려)

### H.1 원칙: **표 필터는 건드리지 않는다**(회귀 방지)
`useMaterialFilter` 의 검색 술어는 `narrowedRanges` leave-one-out 슬라이더 모집단과 **정확히 일치해야 한다**(R209 — 어긋나면 슬라이더 붕괴). 따라서:
- **표 검색(재료 테이블)**: 현행 유지(name+alias+uns, boolean, R180 축소). 술어·DSL·narrowedRanges 불변.
- **검색 개편은 신규 "전역 위키검색"(⌘K 팔레트)에서만** 이뤄진다 → 표는 깨끗이, 탐색은 강력하게 **완전 분리**. 두 검색은 코드도 분리(`wiki-search.ts` 신설, `useMaterialFilter` 미변경).

### H.2 전역 위키검색 = 랭크 + 타입 그룹핑
- 인덱스: `wiki-index.json`(재료·용어·가이드·UNS·별칭)을 타입·가중치 가진 search-doc 로. 정적 → 클라이언트 순수 lib.
- 랭킹: exact > prefix > 별칭/UNS exact > separator-strip > subsequence(현 `fuzzyContains` 최하위). 필드가중 name>별칭/UNS>용어표제>정의. popularity/authority tiebreak. **점수 컷오프**로 저관련 절단(소음 차단).
- **타입 그룹핑 렌더**: "재료 / 용어 / 가이드" 섹션 분리 → 용어 소음이 재료를 안 덮음.
- 정규화·동의어: separator·KO/EN·UNS 정규화 + lexicon synonym 확장.

### H.3 게이트 `tests/wiki-search.test.ts`
랭킹 앵커: "N07718"→718 direct #1, "석출경화"→term 상위, "ti64"→Ti-6Al-4V, self 제외, "PC"→모호 처리(재료·용어 그룹 분리 노출), 저관련 컷오프.

---

## I. 성공 지표 & 검증 하네스 (초안 결핍 — 유용성 판정 기준)

빌드 리포트 `wiki-meta.json`:
| 지표 | 목표 | 의미 |
|---|---|---|
| linkable 엔티티 | 재료 ~244 story-group + 용어 ~100 | 사전 크기 |
| autolink surface-form | 검수 완료 %(≥95) | allowlist 큐레이션 진척 |
| ambiguity_group>1 form | 리포트(수동 검수 대상) | 모호형 관리 |
| authored `[[…]]` 미해결 | **0**(게이트) | 링크 무결성 |
| 스토리당 평균 out-link | 2~6(과링크 방지 상한 모니터) | 밀도 |
| orphan 엔티티(backlink 0) | 리포트 | 고립 노드 |
| auto-link 정밀도 표본 | ≥98%(수동 표본 100건) | 오탐률 |

`preview` DOM 스팟체크(스토리 카드에 링크 span 렌더·클릭 네비·용어 팝오버) — 스토리 검증과 동일 방식.

---

## J. 단계 계획 (R226p 이관처럼 점진·저위험 — **의존성 교정판**)

초안의 "Phase1 파생 backlink" 는 매처 없이 불가(=naive substring=원칙1 위반)였다. 매처(allowlist)를 **먼저** 세우고 backlink 는 그 위에서 파생한다.

| Phase | 산출 | 선행 | authoring | 위험 |
|---|---|---|---|---|
| **0** | 이 설계+백로그/플랜 | — | — | 0 |
| **1** | 재료 lexicon + `build-wiki-index` + **allowlist surface table(자동제안+검수)** + wiki-index.json | 0 | 소(allowlist 검수) | 낮음 |
| **2** | **allowlist auto-link 렌더**(재료만) + `wiki-backlinks.json` 파생 + "함께 언급" 패널 | 1 | 없음 | 낮음(additive) |
| **3** | 스토리 authored `[[…]]`(모호·고가치) + 게이트 + 렌더 | 1 | 소 | 낮음 |
| **4** | `glossary.json` SSOT + 용어 auto-link(§D) + `GlossaryPopover` | 1 | 대(용어 회차) | 중 |
| **5** | **전역 위키검색**(⌘K·랭크·타입그룹) — 표 필터 불변 | 1 | 없음 | 중 |
| **6** | hover 프리뷰·what-links-here 전체뷰·(선택)그래프뷰 | 2·4 | 없음 | 낮음 |

각 Phase 독립 배포. **Phase1이 진입점**: 사전·매처·게이트를 세우되 아직 렌더 안 함(전부 파생·behavior-additive, 무위험). Phase2에서 처음 화면에 링크 노출.

---

## K. 리스크·완화

| 리스크 | 완화 |
|---|---|
| 과링크로 본문 지저분(§A 증명) | **allowlist auto-link**(opt-in)·단어경계·섹션당 첫등장·self 제외·ambiguity 제외 |
| 거짓 링크(regex 안티패턴) | 빌드타임 해결+게이트, auto-link=allowlist only, 모호=명시 링크 |
| 한국어 조사/경계 오매칭 | 매처에 한글 boundary 규칙표(조사 허용, "…계/…강" 접미 구분) |
| 검색 회귀(슬라이더 붕괴) | **표 필터 술어 불변**·개편은 신규 전역검색만(H.1) |
| 검색 소음 | 타입 그룹핑+점수 컷오프+스코프 이원화 |
| authoring 노동 폭발 | authored 링크=모호/고가치만, 대량은 allowlist auto-link |
| backlink vs 유사재료 혼동 | 카드 라벨·축 분리 명시(G.3) |
| 유지보수 드리프트 | 게이트(링크해결·lexicon parity·glossary 스키마·staleness 해시) |
| 성능 | ~수백 패턴 트라이 1회 컴파일 + material 별 memo(무부담) |

---

## L. 파일 맵

| 항목 | 파일 | 상태 |
|---|---|---|
| 이름 토큰 lib | `scripts/lib/name-tokens.mjs`(audit-story-names 승격) | 신규 |
| 용어 SSOT | `data/glossary.json` | 신규 |
| authored 링크 | `data/alloy-stories.json` 본문 `[[…]]` | 기존 확장 |
| 빌드 | `scripts/build-wiki-index.mjs` → `data/wiki-index.json`·`wiki-backlinks.json`·`wiki-meta.json` | 신규 |
| 런타임 링크 | `client/src/lib/wiki-link.ts`·`components/WikiLink.tsx`·`components/GlossaryPopover.tsx` | 신규 |
| 검색 | `client/src/lib/wiki-search.ts`·`components/CommandPalette.tsx` (`useMaterialFilter` **미변경**) | 신규 |
| 게이트 | `tests/wiki-index.test.ts`·`glossary.test.ts`·`wiki-search.test.ts` | 신규 |

## M. 비목표 (재론 방지)
- 임의 substring 자동링크(§A — 원칙1 위반) · **표 필터 검색 술어 변경**(narrowedRanges 회귀) · 외부 위키 자동 딥링크 · 링크 편집 UI(SSOT=JSON) · 원소 기호 본문 auto-link · 그래프뷰(Phase6 선택).
