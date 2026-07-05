# 합금 개발배경(스토리) 시스템 — 설계·신뢰성 원칙 (R226t/E13)

**목적**: 각 합금의 개발 배경을 **가독성 좋고, 유용하고, 흥미롭게** 제공한다 — 단 모든 서술은
검증 가능해야 하며(출처 규율), 할당은 **Material ID(stable_id)** 로만 한다(이름 매칭 금지).
이 문서가 스키마·원칙·작문 회차(Opus) 운영의 SSOT 다.

## 0. 현황 (R226t 이관 시점)
- SSOT: **`data/alloy-stories.json`** — 스토리 **183종**, 멤버 **403 entry** (1129 중 36%).
- base(합금) 단위: 190/637 커버. 무스토리 base 447 (우선순위 큐는 §5).
- 구조: `stories.<slug>: { display, stable_ids[], refs[], legacy_text | sections(+timeline) }`.
- v2 exemplar: `inconel-718` (섹션 4 + 타임라인 3 — 기존 문단 무손실 재배치로 파이프 증명).
- dead(멤버 0) 7종 문서화: `aisi-420 · aisi-4340 · astm-a36-structural · cp-ti · epdm · fkm · wc-6co-*`
  — 이름 드리프트/중복 텍스트로 할당을 잃은 검증 콘텐츠. 처리(재연결/병합/삭제)는 작문 회차 0단계.

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
  "sections": {
    "hook":        "한 줄 정체성 (≤120자, 선택·권장)",
    "origin":      "개발 배경 — 누가/언제/무슨 문제 (필수)",
    "breakthrough":"기술적 돌파 — 무엇을 바꿔 해결했나 (야금학적 포인트, 선택)",
    "adoption":    "최초 적용·확산 (선택)",
    "today":       "오늘날 위상 — 어디에 쓰이고 무엇이 대체 중인가 (필수)",
    "fun_fact":    "흥미 — 명명 유래·일화 (검증 가능한 것만, 선택)"
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
6. **어조** — 공학적 사실 위주 + 인간적 디테일 1-2개. 마케팅 어구("혁신적"·"최고의") 금지.
   한국어 서술, 고유명사·표준코드는 원문.
7. **길이 상한** — hook ≤120자, 각 섹션 ≤600자, 전체 ≤1,800자, timeline ≤6행. 초과 = 요약 부족.
8. **게이트 준수** — `tests/alloy-stories.test.ts` (스키마·sid 실재/중복·v2 구조·parity·dead 허용목록·
   name-매칭 부재·레지스트리 story-free). dead 추가/해소 시 테스트의 DOCUMENTED_DEAD 갱신 = 명시적 리뷰.

## 4. 작문 회차(Opus) 운영
**배치**: 회당 8~12 base. 각 배치 절차:
1. **0단계 — 재연결 우선**: 대상이 기존 스토리의 이름-변형이면 작문 없이 `stable_ids` 추가.
   (예: "AISI 304L / STS304L" → `aisi-304l`, "Stainless Steel 420"/"SS420" → `aisi-420` 재연결로 dead 해소.)
2. 초안 작성 (v2 sections 직접 — legacy_text 신규 생성 금지).
3. **사실 검증**: 연도·인명·특허·최초적용을 웹/문헌 확인 → refs 확정 (확인 실패 서술은 삭제).
4. 게이트 실행(`vitest alloy-stories`) → 커밋 (배치 단위, 커밋 메시지에 검증 출처 요약).
5. 기존 v1 스토리의 v2 승격은 별도 배치 (재배치 원칙 — join 검증).

**우선순위 큐** (2026-07 산출, popularity 기준):
- **T0 — dead 7 처리**: aisi-420(재연결: Stainless Steel 420·SS420 계열)·aisi-4340/astm-a36(기존 스토리와
  텍스트 비교 후 병합 또는 대체)·cp-ti(CP Ti 계열 재연결 검토)·epdm/fkm(대상 재료 확인)·wc-6co(WC-Co 12% 와 grade 상이 — 재작성 판단).
- **T1 — pop≥4.0 신규**: CF8/CF8M/CF3/CF3M(주조 스테인리스 4종 — 한 스토리로 묶기 가능)·
  Custom 465·AISI 1030·CMSX-10·Grade 91·SA516 Gr70. 이름-변형 재연결: AISI 304L/STS304L·316L/STS316L·304 ULC.
- **T2 — pop 3.5~4.0**: LDPE·TPE·PA12·PA11·Polycarbonate·POM-H/C·AlSi7Mg·CoCr·H13(변형 재연결)·
  AISI 301/321/347·Super 304H·SAE 21-4N·AA 6101/6262/6463/6151/1200 등 (~30 base).
- **T3 — 나머지 ~400 base**: 인사이트 그룹별 대표 우선 (세라믹·복합재 그룹 대표 포함).
- 목표: base 커버리지 190 → **~300** (인기 가중), 전 스토리 v2 승격.

## 5. 편집 위치 요약
| 작업 | 파일 |
|---|---|
| 스토리 본문·출처·할당 | `data/alloy-stories.json` (유일) |
| 렌더 | `MaterialDetail.tsx` History 카드 (v2 renderer) |
| 게이트 | `tests/alloy-stories.test.ts` |
| 부착 로직 | `scripts/build-from-registry.mjs` (STORY_BY_SID) |
