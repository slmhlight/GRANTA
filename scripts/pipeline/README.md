# scripts/pipeline/ — Build pipeline 모듈 구조 (R156b)

`build-materials.mjs` 의 모놀리식 4322 lines 를 4-stage pipeline 구조로 분리.

## 구조

```
scripts/pipeline/
├── utilities.mjs              ← stateless helpers (num, round, smartRound, rangeFrom, etc.)
├── loaders/                   ← CSV/JSON 입력 단계 (future R156c)
├── enrich/                    ← 데이터 보강 (현재 모든 pure 함수 위치)
│   ├── factors.mjs            ← htCostFactor, priceConditionFactor, priceFormFactor, priceGradePremium
│   ├── popularity.mjs         ← popularityFor (산업 인기도 휴리스틱)
│   ├── classification.mjs     ← alloyOf, aaSubcategory, nameBasedSubcategory, conditionClass
│   └── ht-condition.mjs       ← htConditionMultiplier (R129 alloy×condition→multiplier)
├── validate/                  ← 검증 (anomaly detect, schema, consistency) (future R156c)
└── output/                    ← 출력 (writeJSON, writeBuildMeta, writeReport) (future R156c)
```

## 파이프라인 흐름 (이상적)

```
1. loaders/      —  Read material_db.json + AM_Materials_DB_enriched.csv + supplementary
2. enrich/       —  Apply factors / popularity / classification / specs / stories
3. validate/     —  Detect anomalies + schema check + consistency
4. output/       —  Write materials.json + index.json + per-category JSON + build-meta + report
```

## 현 단계 (R156b 시점)

- ✅ `pipeline/utilities.mjs` 신규
- ✅ `pipeline/enrich/` 4 모듈 신규 (factors, popularity, classification, ht-condition)
- ⏳ `pipeline/loaders/` — 비어있음 (R156c 또는 후속에서 채움)
- ⏳ `pipeline/validate/` — 비어있음 (anomaly detector 추출 예정)
- ⏳ `pipeline/output/` — 비어있음 (writeJSON 등 추출 예정)

## Test coverage

`tests/` 디렉터리에 대응 테스트:

- `tests/utilities.test.ts` (34 tests)
- `tests/build-factors.test.ts` (29 tests, R155)
- `tests/popularity.test.ts` (29 tests, R156)
- `tests/classification.test.ts` (42 tests, R155b)
- `tests/ht-condition.test.ts` (35 tests, R155b)

총 **169 pipeline tests** (전체 258 중).
