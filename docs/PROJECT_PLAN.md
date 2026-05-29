# AM Materials Explorer — 프로젝트 기획서 (v2)

> 개정: 2026-05-29 · Manus 플랫폼에서 Claude Code로 이관하며 **데이터 모델을 range 기반으로 재설계**하고 실제 구현에 맞게 전면 갱신.

---

## 1. 개요
**목표:** ANSYS Granta MI 스타일의 적층제조(AM) 소재 데이터베이스 웹앱.

**핵심 가치**
1. **Range 기반 물성** — 단일 대표값이 아니라, 실제 데이터 점들(열처리 · 빌드방향 · 벤더)에서 집계한 `min · typical · max`.
2. **출처 추적성** — 큐레이션 합금은 실제 제조사 데이터시트 URL과 연결. 근거 없는 출처는 만들지 않음.
3. **대화형 Ashby 차트** — 두 물성 간 관계를 로그-로그 산점도 + range 에러바로 시각화.

---

## 2. 데이터 아키텍처 (v2 핵심)

### 2.1 원본 (2계층 + 벤더)
- **`data/material_db.json`** — 큐레이션 **46종** AM 합금. 조성 range, 열처리별 물성, **빌드방향(z) 이방성**, **벤더별 실측값**, 검증된 `ref_urls`(데이터시트 URL).
- **`data/AM_Materials_DB_enriched.csv`** — 2,909행의 평탄화 데이터(일반 단조/주조/사출 + AM). 물성은 단일값.

### 2.2 빌드 파이프라인
`material_db.json` + enriched CSV → **`scripts/build-materials.mjs`** → `client/public/materials.json`
- 행을 **재료 단위로 그룹화** → **216종** (큐레이션 46 + AM 벤더 6 + 일반 164).
- 각 수치 물성 = `{min, max, typical, n}` (실제 데이터 점들의 집계).
- 조성·출처·메타(적용분야·자성·융점·열처리·머신) 결합.
- 산출물: `client/public/materials.json` + `data/validation-report.md`. 원본 2,902행은 `data/materials.original.json`에 백업.

### 2.3 Range 도출 방식 (날조 없음)
- **큐레이션 46종:** 열처리 × 빌드방향(xy/z) × 벤더 실측 spread → 실제 range. (예: 316L 항복강도 350–645 MPa, 22개 벤더 기준)
- **일반 합금:** 같은 합금의 템퍼(H12~H19 등) across → range.
- **단일값 물성**(밀도·탄성계수 등)은 range가 degenerate(min=max) → 점으로 표시.

### 2.4 출처 정책
- 큐레이션: `ref_urls` + 벤더 `tds_link` 전파 (검증 플래그).
- 기존 `ASM Handbook` 유지.
- 근거 없는 일반 합금: **"Generic reference (ASM-derived)"** 로 정직하게 표기.
- **(예정)** 일반 합금 ~164종에 검증된 일반 출처(ASM/MatWeb/MMPDS) 보강 — 모두 검증 기반.

### 2.5 정합성 교정 (Task 2)
손상행 제거, AA 알루미늄 시리즈 subcategory 자동 교정(15건), 공정 라벨 정규화(Cast/Casting/Die Casting), `corrosion=0`·공란 fatigue/impact를 0이 아닌 결측으로 처리, subcategory 불일치 35건 플래그. 상세는 `data/validation-report.md`.

---

## 3. 기능
- **3-패널 레이아웃:** 필터 사이드바 · 데이터 뷰 · 상세/비교 패널.
- **4개 뷰모드:** 테이블 · 카드 · 산점도 · **Ashby**.
- **Ashby 차트(Plotly):** X/Y축 선택, 로그-로그, **range 에러바**, 박스줌/팬/PNG, 필터 강조, 클릭 선택.
- **상세 패널:** 물성 range(typical + min–max + n), 조성, **클릭 가능한 데이터시트 출처**, 공정·벤더·티어.
- **필터:** 카테고리 · 원소 범위 · 공정 · 물성 범위 · 조성 기반 패밀리 · 검색.
- **비교(최대 4종)**, **CSV export**.

---

## 4. 기술 스택 (실제)
| 계층 | 기술 |
|---|---|
| 프레임워크 | React 19 |
| 빌드 | Vite 7 |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS 4 |
| UI | shadcn/ui (Radix) |
| 차트 | **Plotly.js** (+ react-plotly.js) |
| 라우팅 | wouter |
| 패키지 | pnpm 10 |

*(이전 기획서의 "Recharts" 및 "pnpm 22.13.0"은 부정확했음 — 실제는 Plotly + Node 22/24.)*

---

## 5. 구현 현황
**완료**
- 데이터 range화 + 파이프라인 (216종) ✅
- Ashby 차트 range 에러바 반영 ✅
- 상세 패널 range + 출처 링크 ✅
- 정합성 교정 + 실재 출처 전파 + 검증 리포트 ✅
- de-Manus 일부 (runtime 플러그인 · debug-collector · 애널리틱스 제거) ✅

**진행/예정**
- ② 일반 합금 검증 출처 보강
- ① UI 정리·리팩터링 + 잔여 de-Manus(ManusDialog·OAuth·allowedHosts·`__manus__`·죽은 `AshbyChart.tsx`)
- 헤더/푸터 텍스트 갱신(216종 등), 테이블·호버 range 표시

---

## 6. 변경 이력
| 버전 | 날짜 | 변경 |
|---|---|---|
| v1 | 2026-05-29 | 초기 기획서 (Manus, 일부 부정확) |
| v2 | 2026-05-29 | Claude Code 이관, range 기반 데이터 재설계, 실제 구현 반영 |
