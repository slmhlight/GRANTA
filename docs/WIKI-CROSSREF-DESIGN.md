# 위키형 상호참조 시스템 — 설계·백본 (R227 / E14, 초안)

**목적**: 재료↔재료 백링크(본문 포함)와 본문 내 기술용어 백링크를 얹어, DB를 "위키처럼 서로 이어지는" 지식망으로 만든다. 링크 밀도가 오르면 검색이 지저분해지므로 **검색 알고리즘도 함께 개편**한다.

**범위**: 이 문서는 *설계·백본·단계 계획*이다. 실제 구현은 후속 회차. 원칙은 [LONGTERM-PLAN.md](LONGTERM-PLAN.md) §1, 편집 맵은 §3, 스토리 시스템 선례는 [STORY-SYSTEM.md](STORY-SYSTEM.md).

---

## 0. 설계 대전제 (프로젝트 원칙과의 정합)

이 시스템은 기존 백본 철학을 **그대로** 따른다 — 이걸 어기면 회귀다.

1. **런타임 이름/regex 매칭 0** — 링크 대상은 빌드타임에 **stable_id / canonical slug** 로 해석(freeze)하고, 런타임은 조회만. (공정가이드 R226j·스토리 R226t 와 동일 패턴. 임의 substring 링크 = "런타임 regex" 안티패턴 → 금지.)
2. **SSOT + 게이트** — 링크·용어는 선언적 JSON(SSOT)에 모으고, 빌드가 인덱스를 생성하며, 테스트가 무결성을 강제(미해결 `[[link]]` = 빌드 에러).
3. **무손실·append-only** — 본문 원문 훼손 금지. 링크는 **마커(`[[…]]`) 또는 별도 필드**로만 부착.
4. **모놀리스 동결** — `build-materials.mjs` 미편집. 신규 파이프(`scripts/build-wiki-index.mjs`)로.
5. **신뢰성** — 자동 링크는 *큐레이션된 lexicon* 에서만(임의 텍스트 매칭 금지). 용어 정의는 스토리처럼 출처 규율.
6. **UI는 숨기지 않고 표기** — 링크 대상의 confidence/타입을 구분 표시(원칙 8).

---

## 1. 엔티티 분류 (링크 대상 taxonomy)

| 타입 | 예 | 대상 해석(target) | 클릭 동작 |
|---|---|---|---|
| `material` | "300M", "AISI 304", "N07718" | 대표 entry(stable_id) | 상세 패널 열기 (setSelectedMaterial) |
| `story-group` | "베타 티타늄", "듀플렉스" | story_key(slug) | 대표 entry 열기 (그룹 스토리 노출) |
| `term` | "석출경화", "가공경화", "γ′", "PREN", "탈아연 부식", "DBTT" | glossary slug | 용어 팝오버/사이드 정의 |
| `guide` | "S-N 곡선", "Goodman 선도" | Guide 챕터·앵커 | Guide 페이지 이동(앵커) |
| `element` | "Cu", "Ni" (선택) | 원소 정보(간이) | 팝오버 (Phase 후반, 선택) |

- **material vs story-group**: 링크 네비게이션은 `setSelectedMaterial(entry)` 재사용이 가장 싸다 → material 을 1차 타깃으로. 한 이름이 여러 조건 entry면 **대표 entry**(base/annealed 또는 popularity 최고)로 해석. 그 상세가 그룹 스토리를 이미 노출.
- **다대다 주의**: "AISI 304"는 수십 조건 row → 대표 1개로 접음. 해석 규칙은 빌드타임 결정적.

---

## 2. 데이터 / SSOT

### 2.1 재료 lexicon — **자동 생성** (신규 authoring 불필요)
`scripts/build-wiki-index.mjs` 가 기존 SSOT 에서 도출:
- 입력: `materials.json`(name·aliases·uns·families·story_key·popularity·stable_id) + `alloy-stories.json`(display·stable_ids).
- surface-form 추출: **`scripts/audit-story-names.mjs` 의 토큰화 로직을 lib(`scripts/lib/name-tokens.mjs`)로 승격·재사용** (지정자·접두사 탈락형·인접쌍·화합물식·한글 별칭·규격 접두어 STOP). 이미 검증된 자산.
- 산출 canonical entity: `{ id, type:'material', display, story_key, rep_stable_id, surface_forms[], uns[], ambiguity_group }`.

### 2.2 용어집(glossary) — **신규 authoring** (스토리 플레이북 재사용)
`data/glossary.json` (SSOT):
```jsonc
"precipitation-hardening": {
  "display_ko": "석출경화", "display_en": "Precipitation hardening",
  "aliases": ["시효경화", "age hardening", "PH"],   // PH 는 ambiguity 주의(→ §4)
  "category": "강화기구",
  "definition": "고용체에서 미세한 2차상을 석출시켜 전위 이동을 막아 강화하는 기구. …",
  "related": ["gamma-prime", "solution-treatment"],   // 용어↔용어
  "see_also_materials": ["17-4-ph-uns-s17400", "inconel-718"],  // 용어→대표 재료(slug)
  "refs": ["ASM Handbook Vol.4 …"]
}
```
- 씨앗: `ht-glossary.ts`(26 HT 조건)·스토리 본문 빈출 용어(석출경화·가공경화·마르텐사이트·오스테나이트·페라이트·γ′/γ″·PREN·DBTT·탈아연·응력부식·크리프·변태강화·경화능·2차경화·적열경도·감쇠능…) → 회차별 작문.
- 신뢰성: 스토리와 동일(출처 필수, 불확실 배제, 길이 상한, KO+EN 표제).
- 게이트: `tests/glossary.test.ts`(slug 유니크·related/see_also 대상 실재·refs≥1·정의 길이).

### 2.3 authored 링크 — 본문 `[[…]]` 마커 (신뢰 최상)
스토리 본문에 손으로 삽입하는 명시 링크. 문법:
- `[[300m]]` → slug 직접 지정(표시는 원문 유지: 파이프 문법 `[[표시|slug]]`).
- 재료: story_key 또는 대표 이름 슬러그. 용어: glossary slug. 가이드: `guide:sn-curve`.
- **미해결 슬러그 = 빌드 에러** (스토리 이름-커버리지 게이트와 동형).

---

## 3. 빌드 백본 — `scripts/build-wiki-index.mjs`

입력(위) → 산출 4종(커밋·게이트):

1. **`data/wiki-index.json`** — canonical 엔티티 레지스트리(id·type·display·target·surface_forms·ambiguity_group). 검색·링크의 단일 소스.
2. **authored 링크 해석** — 스토리별 `[[…]]` 파싱→검증→resolved 링크 목록(build:data 가 `story_v2.links[]` 로 스탬프, 또는 별도 `story-links.json`).
3. **`data/wiki-backlinks.json`** — 역인덱스("여기를 가리키는 것"): 엔티티별 참조원(스토리/재료). authored 우선, 자동감지 옵션.
4. **auto-link surface table** — 런타임 linkify 용 최장일치 매처(트라이/Aho-Corasick 직렬화) + per-term 가드(min-length·ambiguity·stop-list).

**게이트**(`tests/wiki-index.test.ts`): 전 `[[…]]` 해결·canonical slug 중복 0·surface-form 충돌 리포트·lexicon parity·backlink 대칭성.

빌드 순서: `build:data`(materials+stories) → `build:wiki`(인덱스) → 클라이언트 정적 로드.

---

## 4. 런타임 (presentation)

### 4.1 `linkify(text, ctx)` — 순수 함수 (lib, 유닛테스트)
입력: 렌더 텍스트 + 문맥(현재 material·section). 출력: React 노드(인식 span → `<WikiLink>`).
- **authored `[[…]]`**: 항상 링크(신뢰 최상).
- **auto-link**: surface table 최장일치. **가드(지저분함 방지 핵심)**:
  - 현재 재료 자기 이름 링크 금지(self-link).
  - **섹션당 첫 등장만** 링크(과링크·시각 소음 방지).
  - **ambiguity_group** 충돌 surface(예 "PH"=석출경화 vs pH, "PC"=폴리카보네이트, "steel", 2자 원소기호) → auto-link 제외, 명시 `[[…]]` 만.
  - min-length·STOP-list(규격 접두어·범용어).
  - 표시 스타일: 재료=실선 밑줄, 용어=점선 밑줄(타입 시각 구분 — 원칙 8).

### 4.2 `<WikiLink>` UX
- hover: 프리뷰 카드(재료=미니 요약/대표 물성, 용어=정의 1줄, 가이드=챕터명).
- click: 재료→상세 열기, 용어→글로서리 팝오버/패널, 가이드→Guide 앵커.
- 접근성: `<button>`/`<a>` semantics, 키보드 이동.

### 4.3 "여기를 가리키는 것" 패널 (backlinks)
상세 패널에 **관련 재료·용어(역참조)** 카드 — `wiki-backlinks.json` 순수 조회. 유사재료(물성 거리) 카드와 **구분**: 이건 "서술상 언급"이라는 다른 축.

---

## 5. 검색 알고리즘 개편 (사용자 핵심 우려)

링크·용어가 늘면 현행 boolean 필터로는 소음이 는다. **엔티티 인지 + 랭킹 + 타입 그룹핑**으로 전환.

### 5.1 통합 검색 인덱스 (빌드타임)
`wiki-index.json` 확장: 재료·합금군·용어·가이드·UNS/별칭을 **타입 필드·가중치**를 가진 search-doc 로. 정적 JSON → 클라이언트 로드(순수 lib).

### 5.2 boolean → **랭크 스코어링**
- 층위: exact > prefix > 별칭/UNS exact > separator-strip > subsequence(현 fuzzy 유지, 최하위).
- 필드 가중: name > 별칭/UNS > 용어 표제 > 본문. popularity/authority 는 tiebreak.
- 산출: 점수순 그룹 결과.

### 5.3 **타입별 그룹핑** (지저분함 해소)
결과를 "재료 / 합금군 / 용어 / 가이드" 섹션으로 분리 렌더 → 용어 소음이 재료 결과를 덮지 않음.

### 5.4 **스코프 분리** (현 검색 청결 유지)
- **재료 테이블 검색**: 현 상태 유지(name+alias+uns, R180 축소) — 표는 재료만.
- **전역 위키 검색**(신규, ⌘K 팔레트): 전 엔티티 타입, 타입 그룹핑·랭킹. 위키 네비게이션 전용.
→ 표 검색은 깨끗이, 위키 탐색은 강력하게 **이원화**.

### 5.5 정규화·동의어
쿼리 정규화(separator·KO/EN·UNS) + lexicon synonym 확장. 오타/약어는 subsequence 최하위로만.

게이트: `tests/wiki-search.test.ts`(랭킹 앵커 — "N07718"→718 direct, "석출경화"→term 상위, self 제외, ambiguity 처리).

---

## 6. 단계 계획 (R226p 이관처럼 점진·저위험)

| Phase | 산출 | 위험 | authoring |
|---|---|---|---|
| **0** | 이 설계문서 + 백로그/플랜 반영 | 0 | — |
| **1** | 재료 lexicon 자동생성 + `build-wiki-index` + backlink 역인덱스 + "여기를 가리키는 것" 패널 | 낮음(전부 파생) | 없음 |
| **2** | 스토리 authored `[[…]]`(고가치부터: 300M↔AerMet·PEEK↔PEKK·4340↔300M 등) + 게이트 + 본문 링크 렌더 | 낮음 | 소(기존 언급에 마커) |
| **3** | `glossary.json` SSOT + 용어 auto-link(가드) + 글로서리 팝오버 | 중 | 대(용어 정의 회차) |
| **4** | 검색 개편: 통합 랭크 인덱스 + ⌘K 팔레트 + 타입 그룹핑 | 중 | 없음 |
| **5** | hover 프리뷰 카드·"what links here" 전체뷰·(선택) 그래프뷰 | 낮음 | 없음 |

각 Phase 독립 배포 가능. Phase 1·2는 데이터 파생/마커라 거의 무위험(behavior-additive).

---

## 7. 리스크·완화

| 리스크 | 완화 |
|---|---|
| 과링크로 본문 지저분 | 섹션당 첫 등장만·self 제외·ambiguity 제외·큐레이션 lexicon |
| 거짓 링크(regex 안티패턴) | 빌드타임 해결+게이트, auto-link 는 surface-table+min-length+STOP, 모호=명시 링크만 |
| 검색 소음 | 타입 그룹핑 + 스코프 이원화(표=재료만) + 랭킹 |
| 런타임 성능(본문 linkify) | freeze 된 매처 1회 컴파일 + material 별 memo |
| KO/EN 이중 표기 | surface_forms 양방 수록 + 정규화 |
| 유지보수 드리프트 | 게이트(링크 해결·lexicon parity·glossary 스키마) — 스토리 시스템과 동형 |
| 원문 훼손 | `[[…]]` 마커/별도 필드만, round-trip 무손실 |

---

## 8. 파일 맵 (신규/변경 예정)

| 항목 | 파일 |
|---|---|
| 용어 SSOT | `data/glossary.json` (신규) |
| authored 링크 | `data/alloy-stories.json` 본문 `[[…]]` (기존 SSOT 확장) |
| 이름 토큰 lib | `scripts/lib/name-tokens.mjs` (audit-story-names 로직 승격) |
| 빌드 | `scripts/build-wiki-index.mjs` (신규) → `data/wiki-index.json`·`wiki-backlinks.json` |
| 런타임 링크 | `client/src/lib/wiki-link.ts`(linkify)·`components/WikiLink.tsx`·`GlossaryPopover.tsx` |
| 검색 | `client/src/lib/wiki-search.ts`(랭크)·`components/CommandPalette.tsx` |
| 게이트 | `tests/wiki-index.test.ts`·`glossary.test.ts`·`wiki-search.test.ts` |

## 9. 비목표 (범위 밖 — 재론 방지)
- 임의 substring 자동링크(원칙 1 위반) · 외부 위키(위키피디아) 딥링크 자동생성(신뢰성) · 링크 편집 UI(SSOT 는 JSON) · 그래프뷰는 Phase 5 선택.
