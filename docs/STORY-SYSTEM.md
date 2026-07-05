# 합금 개발배경(스토리) 시스템 — 설계·신뢰성 원칙 (R226t/E13)

**목적**: 각 합금의 개발 배경을 **가독성 좋고, 유용하고, 흥미롭게** 제공한다 — 단 모든 서술은
검증 가능해야 하며(출처 규율), 할당은 **Material ID(stable_id)** 로만 한다(이름 매칭 금지).
이 문서가 스키마·원칙·작문 회차(Opus) 운영의 SSOT 다.

## 0. 현황 (R226t 작문 회차 — **완료**)
- SSOT: **`data/alloy-stories.json`** — 스토리 **294종**, 멤버 **1129 entry** = **1129/1129 (100%)**.
  - 배치 1~27(E13)로 전 재료 부착 완료. 미부착 0 (`build-from-registry` 스탬프 기준).
  - v2(구조화 sections+timeline) **621종 entry** 커버. 잔여 ~508 entry 는 legacy v1(본문+refs, 섹션 미구조) — v2 승격은 후속(§5).
- 구조: `stories.<slug>: { display, stable_ids[], refs[], legacy_text | sections(+timeline) }`.
- v2 exemplar: `inconel-718` (섹션 4 + 타임라인 3). 신규 작문은 hook/origin/breakthrough/[adoption]/today/fun_fact 풀 구조 + 검증된 경우 timeline.
- dead(멤버 0) 2종만 잔존: `epdm · fkm` (테스트 `DOCUMENTED_DEAD` 고정). 나머지 과거 dead(aisi-420/4340/a36/cp-ti/wc-6co)는 작문 회차에서 재연결·병합·검증 재작성으로 해소.
- 게이트: `tests/alloy-stories.test.ts` 10 통과 · tsc · 770 테스트 · build 전부 green.

## 1. 아키텍처 (전부 Material ID — regex/이름 매칭 0)
```
data/alloy-stories.json (SSOT: 콘텐츠+stable_ids 동결)
   └─ build:data (build-from-registry) — stable_id 부착: m.story(본문)·story_refs·story_key·story_v2
        └─ MaterialDetail 'History · 개발 스토리' 카드 — v2(sections+timeline) 렌더, 없으면 legacy 문단
```
- 구 시스템(R75~R177: material-stories*.json 3파일 + exact/base/prefix name 매칭)은 **은퇴** —
  rename 으로 dead 17 을 만들던 원인. 381 매칭을 실행시점 역매칭으로 stable_id 동결(무손실), 22 entry 재연결.
- 레지스트리는 story-free (콘텐츠는 값이 아님 — 값/콘텐츠 분리). 신규 재료 연결 = 해당 스토리
  `stable_ids` 에 ID 추가 (게이트가 실재·중복 검증).

## 2. 스키마
```jsonc
"<slug>": {
  "display": "Inconel 718",          // 사람용 표기 (구 매칭 키 유래)
  "stable_ids": ["MET-0565", ...],   // 할당 — 유일한 연결 수단 (스토리 간 중복 금지)
  "refs": ["...", ...],              // 출처 (v1 ≥1, v2 ≥2) — 저자/연도/표준/제조사 문헌
  // ── v1 (이관 상태): 문단 blob ──
  "legacy_text": "문단\n\n문단...",
  // ── v2 (작문 회차에서 승격): 구조화 ──
  "sections": {                       // R226u 구조 2.0: v2 는 6섹션 **전부 필수** + 이 순서 고정 (게이트 검증)
    "hook":        "한 줄 정체성 (≤120자)",
    "origin":      "개발 배경 — 누가/언제/무슨 문제",
    "breakthrough":"기술적 돌파 — 무엇을 바꿔 해결했나 (야금학적 포인트)",
    "adoption":    "최초 적용·확산 — 검증 가능한 확산 사실 (origin 과 중복 금지, '확산' 축)",
    "today":       "오늘날 위상 — 어디에 쓰이고 무엇이 대체 중인가",
    "fun_fact":    "여담 — 명명 유래·일화 (검증 가능한 것만; UI 라벨 '여담')"
  },
  "timeline": [{ "year": 1959, "event": "≤60자 사건", "ref": 1 }]   // ref = refs 1-base 인덱스
}
```
- 본문 = `legacy_text` 우선, 없으면 sections 를 표준 순서(hook→origin→breakthrough→adoption→today→fun_fact)로 join.
  v2 승격 시 legacy_text 는 **제거** (이중 소스 금지) — 승격 전 "join == legacy_text" 무손실 검증이 원칙(재배치 승격의 경우).

## 3. 신뢰성 원칙 (불변)
1. **ID 할당만** — 이름/regex 매칭 금지. 연결·해제는 `stable_ids` 편집 = diff 리뷰 가능.
2. **출처 없는 서술 없음** — refs 최소 1(v2 는 2). 연도·인명·기관·특허번호는 권위 자료
   (ASM/ASTM/제조사 기술문헌/특허 원문)로 **웹 확인 후** 기재. timeline 항목은 ref 인덱스 필수.
3. **불확실 처리** — 확인 불가한 일화는 **쓰지 않는다** ("~로 전해진다" 식 회피 금지). 논쟁적 주장 배제.
4. **무손실·append-only** — 기존 텍스트 임의 수정 금지(오류 교정은 커밋 메시지에 사유+출처).
   삭제는 중복 텍스트만 (선례: c11000 — copper-c11000 와 byte-동일).
5. **DB 모순 금지** — 스토리 속 물성 수치가 DB 값과 다르면 스토리를 고칠 게 아니라 **DB 교정 절차**
   (r226-value-corrections) 먼저. 스토리는 값의 2차 소스가 아님.
6. **어조 (문체 2.0 — R226u)** — 공학적 사실 위주 + 인간적 디테일. 마케팅 어구("혁신적"·"최고의") 금지.
   한국어 서술, 고유명사·표준코드는 원문. **전보체 금지**: '·' 나열로 문장을 끊지 말고 이어지는
   서사형 문장으로 쓴다(열거가 필요하면 문장 안에 자연스럽게). 섹션당 3~5문장, 전체 700~1,500자 목표
   — 전문용어에는 짧은 풀이를 붙여 "읽히는" 글로. fun_fact(여담)는 가벼운 뒷이야기 톤.
7. **길이 상한** — hook ≤120자, 각 섹션 ≤600자, 전체 ≤1,800자, timeline ≤6행. 초과 = 요약 부족.
8. **게이트 준수** — `tests/alloy-stories.test.ts` (스키마·sid 실재/중복·v2 구조·parity·dead 허용목록·
   name-매칭 부재·레지스트리 story-free). dead 추가/해소 시 테스트의 DOCUMENTED_DEAD 갱신 = 명시적 리뷰.
9. **이름 커버리지 (R226u)** — 그룹 스토리의 **모든 멤버 지정자**(합금명)가 display 또는 본문에
   등장해야 한다. "다른 합금 이야기만 보이는" 상세 카드 방지. 감사: `node scripts/audit-story-names.mjs`
   (토큰화: 지정자·접두사 탈락형·인접쌍·Gr↔Grade·화합물식·한글 별칭·선두 약어) — **0건 유지**.
   야금학적으로 크게 다른 유명 합금이 그룹에 섞이면 언급이 아니라 **전용 스토리로 분리**
   (선례: aermet-100 을 ultra-high-strength-steel 에서 분리 — 300M 내용이 노출되던 문제).

## 4. 작문 회차(Opus) 운영
**배치**: 회당 8~12 base. 각 배치 절차:
1. **0단계 — 재연결 우선**: 대상이 기존 스토리의 이름-변형이면 작문 없이 `stable_ids` 추가.
   (예: "AISI 304L / STS304L" → `aisi-304l`, "Stainless Steel 420"/"SS420" → `aisi-420` 재연결로 dead 해소.)
2. 초안 작성 (v2 sections 직접 — legacy_text 신규 생성 금지).
3. **사실 검증**: 연도·인명·특허·최초적용을 웹/문헌 확인 → refs 확정 (확인 실패 서술은 삭제).
4. 게이트 실행(`vitest alloy-stories`) → 커밋 (배치 단위, 커밋 메시지에 검증 출처 요약).
5. 기존 v1 스토리의 v2 승격은 별도 배치 (재배치 원칙 — join 검증).

**우선순위 큐 — 전량 소진 완료 (배치 1~27, 1129/1129).**
T0(dead 재연결/재작성)·T1·T2·T3(전 base) 모두 처리. 커버리지는 base·popularity 가중이 아니라 **전 entry 100%** 로 마감.
남은 후속 작업(신규·저우선):
- **v2 승격**: legacy v1 스토리 ~508 entry 를 구조화 sections(+timeline)로 승격 (재배치 원칙 — 무손실 join 검증, 배치 단위).
- **신규 entry 부착**: 데이터에 재료가 추가되면 build 게이트가 무스토리를 잡아냄 → 해당 그룹 스토리에 stable_id 재연결 또는 신규 작성.
- **timeline 보강**: 연도·최초적용이 웹/문헌으로 확정되는 스토리에 timeline 추가 (현재 일부만 보유).

## 5. 편집 위치 요약
| 작업 | 파일 |
|---|---|
| 스토리 본문·출처·할당 | `data/alloy-stories.json` (유일) |
| 렌더 | `MaterialDetail.tsx` History 카드 (v2 renderer) |
| 게이트 | `tests/alloy-stories.test.ts` |
| 부착 로직 | `scripts/build-from-registry.mjs` (STORY_BY_SID) |
