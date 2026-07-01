# 데이터 워크플로우 — 자료 추가·교정 가이드 (R226e/S2)

build-materials.mjs(4550 LOC)를 만지지 않고 대부분의 데이터 작업을 하는 방법. 어느 파일을 편집할지 명시.

## SSOT 계층
- **`data/registry/entries/<cat>/<id>.json`** — `build:data`(live 빌드)가 읽는 **committed SSOT**.
- 레지스트리는 **`pnpm build:registry`** 가 상류 소스 + 교정으로 **재생성**한다. build-materials.mjs(6 소스 + ~890 name-regex override + derived)는 이 재생성의 상류 processor로 **live path에서 은퇴** — 깊은 소스 스키마 변경 시에만 편집.
- **`pnpm build:data`**(build-from-registry) — 레지스트리 → 앱 산출물(`client/public/materials.json` 등; gitignore, CI가 매 빌드 재생성).

## 흔한 작업 → 편집 파일 (모놀리스 회피)
| 작업 | 편집 파일 | 재생성 |
|---|---|---|
| 값·조성·subcategory·별칭·출처 교정 | `data/r226-value-corrections.json` (stable_id / base / subcategory 키) | build:registry → build:data |
| 신규 주조/특수 합금 추가 | `data/cast-alloys.json` (또는 `supplementary-materials.json`) | build:registry → build:data |
| 엔트리 제거 | corrections `remove.{ids, bases, heatTreatments}` | build:registry → build:data |
| cross-standard 별칭(JIS/KS 등) | corrections `aliasesByBase` | build:registry → build:data |
| generic 출처 족보 | corrections `sourcesBySubcategory` | build:registry → build:data |
| 출처 라벨/authority 도출 규칙 | `scripts/lib/source-labels.mjs` | build:data |
| anomaly 검출 임계 | `scripts/lib/anomalies.mjs` | build:data |
| URL 안티봇 화이트리스트 | `scripts/verify-datasheet-urls.mjs` `BOT_BLOCKED_DOMAINS` | (verify:urls) |

> **build-materials.mjs 는 웬만하면 편집하지 말 것.** 신규 소스 파일 스키마·대량 파생(derived) 로직 변경 시에만. 대부분의 데이터 작업은 위 작은 파일들로 충분하다.

## 안정 ID (freeze)
`data/registry-id-freeze.json`(legacy_id→stable_id)이 안정 ID의 권위 소스. build:registry가 신규 entry에 새 ID 할당·기존 ID 불변·제거된 ID는 reserve(재사용 안 함). **수동 편집 금지.**

## 무손실 원칙
값 교정은 원본을 entry `_corrections`에 보존하고, build:registry의 라운드트립이 "교정 복원 시 원본과 일치(불일치 0)"를 증명한다 → **무손실 + 문서화된 교정만** 적용됨이 보장됨.

## 게이트 (커밋 전 필수)
```
pnpm build:registry   # 라운드트립 불일치 0 확인
pnpm build:data       # anomaly high 0 (아니면 exit 1)
pnpm check            # tsc
pnpm test             # registry-integrity·corrections-schema·golden-values 포함
```
- `registry-integrity` — freeze 정합·교정 전수 적용·중복 ID.
- `corrections-schema` — 교정 대상 stable_id 실재(stale 교정 차단)·형식.
- `golden-values` — 대표 합금 표준 σy/UTS/밀도 회귀(A588형 in-range 오염 방어).

## URL 헬스
`pnpm verify:urls`(분기별 수동 또는 CI cron). "dead" 대부분은 안티봇(브라우저 200, 자동 fetch 4xx) — 스크립트가 browser-UA로 재시도해 **bot-blocked-candidate**로 자동 분류(D4). 후보는 `BOT_BLOCKED_DOMAINS`에 추가.
