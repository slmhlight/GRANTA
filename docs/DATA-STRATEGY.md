# 데이터 발전 전략 (R226e 시점, 2026-07)

현재 자산: **1,112종** · registry SSOT(무손실+문서화교정, round-trip 0) · 출처 authority 등급 · golden-values 51 · CI 게이트 5종(registry-integrity·corrections-schema·golden-values·points⊆ranges·anomaly high=0) · URL cron(안티봇 자동 후보).

원칙: **넓히기보다 깊이(검증된 값) 우선** — 이 DB의 차별점은 종 수가 아니라 "값을 믿을 수 있음"이다.

## 축 1 — Provenance 완결 (신뢰의 사다리)
목표: 모든 값이 "어느 문서의 어느 표"까지 추적 가능.
- **aggregator-only 해소**: 유일 출처가 MatWeb/AZoM 인 entry 를 제조사 TDS·표준 병기로 승격. KPI: `standard+handbook` 비율 36% → **50%+** (현재 4,330 출처 중 standard 27%·handbook 9%).
- **per-property 출처**: 현재 per-entry sources → `ranges[p].source` 로 속성 단위 인용 (elev-temp/creep 은 이미 curve 단위).
- 파생값(KIC class-confidence 814·fatigue derived 759)은 배지 노출 완료 — 다음은 **실측 대체 우선순위 목록**(인기 × 파생의존도 순).

## 축 2 — 값 검증 파이프라인 상시화
- **golden-values 확대**: 51 → 분기 +20~30 (인기순) → 목표 **150**(전체 base 의 ~15%). 확장 자체가 검증 스윕을 겸함(이번 33종 확장에서 신규 오류 0 = 품질 방증).
- **표준 min-spec 파서 게이트**: ASTM/AMS 인용 entry 의 σy/UTS ≥ 표준 min 자동 검사 (A588 오염을 인용 표준만으로 잡는 일반해). 표준→min 테이블은 corrections 와 같은 선언적 JSON.
- **조건 라벨 ↔ 값 상태 교차검사**: HT 라벨(soft/hard)과 값 수준 정합을 `audit:registry` 에 상설화 (R226 공정상태 매핑 모델의 자동화).
- 연 1회 족보 로테이션 re-verify 캠페인 (Cu → Al → Ti → Ni → 철강, 분기당 1족보).

## 축 3 — 커버리지 (선별적 확장)
- **확인된 갭**: A383/ADC12(die-cast Al 실엔트리 — 현재 별칭 근사만) · 2205/2507 duplex 존재·명명 점검 · SKD61/H13 등 tool steel JIS 실조건 · 3세대 Al-Li (2050/2196/2198 은 있음 — 조건 축 확대).
- **조건 축 깊이**: 인기 상위 50 합금의 temper/HT 매트릭스 감사 (예: 7075 에 T73/T7351 부재 여부) — "종 추가"보다 "조건 완결".
- elevated-temp/creep: 30+ → **60종** (인기 Ni·Ti·내열강 우선).

## 축 4 — 데이터 모델 진화
- **A/B-basis 구분** (MMPDS 식): 현재 min 이 "spec 최소"와 "관측 최소"를 혼용 — `basis: 'spec-min' | 'observed'` 필드로 분리. golden-values 가 spec-min 앵커를 이미 실증.
- **confidence 공식화**: n(측정수) × 출처 authority → 산출 규칙 명문화 (현재 라벨은 부착돼 있으나 산출 근거가 암묵).
- **UNS 정규 필드**: 별칭에 산재한 UNS 코드를 1급 필드로 → 외부 시스템 연동 키.

## 축 5 — 자동화·거버넌스
- corrections 파일 비대 시 도메인 분할 (`data/corrections/{values,aliases,sources}.json`) — 스키마 테스트가 분할을 게이트.
- build-materials(4550 LOC)는 **동결 유지** (DATA-WORKFLOW.md 정책). 재생성 로직 추가 수요 발생 시 `scripts/pipeline/` 단계로만 증축.
- 신규 자료 기여 = DATA-WORKFLOW.md 절차 + (팀 확장 시) PR 템플릿에 게이트 체크리스트.

## 분기 로드맵 (제안)
| 분기 | 항목 |
|---|---|
| 2026 Q3 | 표준 min-spec 파서 게이트 · aggregator-only 상위 100 해소 · duplex/A383 커버리지 점검 |
| 2026 Q4 | per-property 출처 스키마 · golden 100 · HT↔값 교차검사 상설화 |
| 2027 H1 | A/B-basis 필드 · elevated-temp 60종 · UNS 정규화 |
