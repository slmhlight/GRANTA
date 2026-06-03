# Changelog

All notable changes since R45 (post-Manus recovery). Format: `R##` references the round of work.

## R99 — 모바일 긴급 fix (8건)
사용자 긴급 보고. 모바일 사용성 회복 위주.
- **모바일 Compare 탈출**: 모바일 nav (필터/뷰/Compare/가이드/Settings) 가 `z-30` → `fixed bottom-0 z-50` → Compare 패널 (`fixed top-12 bottom-[50px]`) 영역만 차지하여 nav 가 항상 보임. Compare 들어간 후 다른 view 로 즉시 이동 가능.
- **Ashby Index slider 모바일 노출**: `hidden md:block` → `flex-1` (모바일 가용 폭만큼 자동 펼침) — 사용자가 누르고 끌어 임계값 조정 가능.
- **가중치·Best-pick collapse**: Compare panel 의 두 섹션 모두 ChevronDown/Up 토글 헤더 — 기본 접힘, 모바일 세로 공간 절약. 데스크탑도 동일 UX.
- **Goodman 색상 + 5개 제한**: 기존 모든 선이 family color 같은 hue 였음 → Goodman 전용 5색 categorical palette (`#0066CC blue · #DC2626 red · #16A34A green · #D97706 orange · #7C3AED purple`). 6개 이상이면 처음 5개만 표시 + amber 안내 박스.
- **모바일 글자 망가짐**: Compare panel header `flex-wrap + min-w-0 + overflow-x-auto` → 닫기 X 항상 보임. 가중치/Best-pick 의 alloy 이름 `truncate max-w-[100-140px]` 적용. button group horizontal scroll 가능.
- **Ashby 필터/Pareto/Display 영역 세로 최소화**: `py-1 sm:py-2` → `py-0.5 sm:py-1.5`. Filter row 와 Index row 모두 적용. 스크린샷 빨간 박스 영역의 세로 25% 축소.
- **Toast 색상 정정**: "🔴 빨간 점선 = 필터 한계" → "🟣 보라 점선 = 축 한계 슬라이더 / 🔵 청록 점선 = 사이드바 범위 필터 / 🔴 빨간 실선 = Index 임계" — 실제 차트 shape 색상 (R50c 부터 보라/청록/빨강 3색) 과 정확히 일치.
- **모바일 main container padding**: `pb-[50px]` 추가 — 차트 영역이 fixed bottom nav 뒤로 밀리지 않음.

검증: tsc OK · vitest 47/47 · production build OK (1290.86 KB)

> 보류 (사용자 재검토 후 별도 push): 풍산 7 alloy + data/general-knowledge/ 9 markdown + AISI 4140 industry_note (R98 작업분).

## R97 — Reset axes 동작을 X/Y property 재선택과 동일화
사용자 요청: "reset axes 의 동작을 현재의 XY 축을 다시 설정했을 때와 동일하게 적용".
**관찰**: 사용자가 X-axis property 변경 (예: density → modulus) 시 axis 가 정상적으로 새 frame 으로 reset — uirevision 에 xProperty 가 포함되어 plotly 가 사용자 zoom 폐기 + layout.range 적용. 이게 의도된 동작.
**문제**: modeBar 의 🏠 Reset axes / doubleClick 은 plotly 자체 동작 (`xaxis.autorange:true`) 으로 marker bbox 에 fit — 우리 layout.range 무시.

**해결**: 동일 메커니즘으로 통일.
1. `useState<number>` 의 `resetCounter` 추가
2. xaxis.uirevision / yaxis.uirevision 의 끝에 `|${resetCounter}` 포함
3. `onRelayout` 핸들러에서 plotly 의 reset event 감지:
```js
if (e['xaxis.autorange'] === true || e['yaxis.autorange'] === true) {
  setResetCounter(c => c + 1);
  return;
}
```
4. resetCounter 증가 → useMemo 재실행 → uirevision 변경 → plotly 가 다음 render 에서 axis state 폐기 + 새 layout.range 적용

**결과**:
- 🏠 Reset axes 클릭 → property 재선택 시와 동일한 코드 path → 같은 layout.range (R94/R95 의 xRange/yRange) 로 정확 복원
- doubleClick reset 도 동일 동작
- indexLine drag (기존 onRelayout 처리) 은 그대로 동작 (autorange 조건이 false 이므로 indexLine 분기로 진입)

**구현 노트**: indexLine reference 가 frame anchor / layout 모두 그대로 — fset 기반의 인덱스 임계선이 새 frame 안에 다시 그려짐.

## R96 — Family tree tier2 색을 실제 family color 와 일치
사용자 요청: "family tree 색상을 1st 는 그대로 두고 2nd family 와 같게 수정. 실제 표시되는 것은 2nd family 색상".

기존 family tree 의 색 위계:
- tier1 (Metal/Polymer/Ceramic/Composite) — sky / emerald / amber / violet
- tier2 (Stainless Steel · Nickel Alloy · Aluminum · Cobalt Alloy …) — **tier1 의 lighter variant (모두 같은 hue)**
- alloy 의 family color (Card / Table / Detail / Ashby) — `lib/material-colors.ts CLASSES` 의 별개 색

문제 — 실제 표시 (Card 의 family-color dot, Detail 의 history border, Ashby 의 envelope) 는 family color (Steel blue · Nickel violet · Cobalt pink · Aluminum amber 등) 인데 family tree 는 그걸 안 따라가서 시각 inconsistency.

**수정**: 새 `TIER2_FAMILY_COLOR` 매핑.
```js
const TIER2_FAMILY_COLOR = {
  'Stainless Steel': '#3B82F6',        // Steel blue
  'Tool / Special Steel': '#3B82F6',
  'Carbon / Alloy Steel': '#3B82F6',
  'Aluminum': '#F59E0B',               // Aluminum amber
  'Nickel Alloy': '#8B5CF6',           // Nickel violet
  'Cobalt Alloy': '#EC4899',           // Cobalt pink
  'Titanium': '#06B6D4',               // Titanium cyan
  'Copper Alloy': '#D97706',           // Copper orange
  'Magnesium': '#0D9488',              // Magnesium teal
  'Refractory': '#475569',             // Refractory slate
  'Controlled Expansion': '#8B5CF6',   // Invar/Kovar (Fe-Ni → Nickel)
  'Other Specialty / Other Metal': '#94A3B8',
};
```

tier2 노드의 `text / └ / chevron / bg` 모두 inline style 로 family color 적용. `background: famHex + '14'` (8% alpha) 의 옅은 배경.
- tier1 (Metal 의 좌측 sky 라인) 은 그대로 — 카테고리 구분 유지
- tier2 의 메탈 family bucket 만 family color 로 매핑. Polymer / Ceramic / Composite tier2 는 category 색 유지 (CLASSES 에 family 세분이 없으므로)

**효과**: Family tree 에서 "Stainless Steel" 을 보면 푸른 톤, "Nickel Alloy" 는 보라, "Cobalt Alloy" 는 핑크 — Card 그리드 / Ashby envelope / Detail history 박스의 색과 동일 hue. 한눈에 시각 일관성.

## R95 — Ashby chart reset 후 비합리적 frame 두 가지 원인 fix
사용자 보고: "density / Young's Modulus 선택하면 정상. reset axes 누르면 X 가 1~2000 같은 이상한 범위로 가버림".

**원인 1 — frame anchor 의 marker `opacity: 0` 이 plotly autorange 에 무시됨**: R93/R94 의 frame anchor 가 opacity 0 + size 1 이라 시각적으로는 invisible. Plotly 가 autorange 계산 시 invisible marker 는 무시 → reset axes 가 frame anchor 의 4 corner 를 cover 하지 못함 → 다른 visible trace (envelope · marker) 의 bbox 로 axis 가 fit.
- 수정: `opacity 0.001 + size 6` — 시각적으로 거의 invisible (육안 식별 거의 불가) 이면서 plotly autorange 가 marker 점으로 인식

**원인 2 — ranges 의 outlier hiOf 가 xs/ys 를 과대 확장**: 일부 alloy 의 `ranges.<prop>.max` 가 typical 의 수십 배인 경우 (anomaly·variant 합금). xs = flatMap [loOf, hiOf] 라 그 큰 hiOf 가 max 로 들어가 → xRange 가 비합리적으로 확장.
- 수정: xs/ys 에 `xDomain * [0.9, 1.1]` clamping. xDomain 자체는 전체 materials 의 typical min/max 라서 outlier 영향 안 받음 → xs 가 sane range 로 제한

```js
const xClampLo = xDomain[0] * 0.9, xClampHi = xDomain[1] * 1.1;
const xs = xRangeSet.flatMap((m) => [loOf(m, xProperty), hiOf(m, xProperty)])
  .filter((v) => !!v && v > 0 && v >= xClampLo && v <= xClampHi);
```

**효과**:
- frame anchor 가 plotly autorange 에 인식 → reset 시 정확히 xRange/yRange 의 4 corner 로 axis 복원
- 데이터 outlier (anomaly ranges) 영향 차단 → xRange 가 항상 typical range 안
- density vs Modulus 시나리오: reset 후 X 0.05~25, Y 0.005~2000 의 합리적 frame 유지

## R94 — Ashby chart X/Y 축 범위 독립 계산 (reset 시 합리적 frame)
사용자 보고: "reset axes 할때 특정 값 range로 무조건 전환되는데 그 값이 합리적이지 않은듯. XY축 각각 합리적인 range 미리 계산하고 조합해서 적용해야".
**원인**: `valid(m) = X property && Y property 둘 다 > 0` 조건. xs/ys 계산이 fsetForFrame (= valid + family/sub 통과) 으로 묶여있어, 예) Y=KIC 일 때 KIC 데이터가 일부 alloy 에만 있으면:
- X 범위가 "KIC 도 가진 alloy 의 X 값" 만으로 계산 → X 가 합리적인 7 g/cm³ alloy 라도 KIC 없으면 X 범위 결정에서 제외됨 → X axis 가 비합리적으로 좁아짐
- Y range 도 X 가진 alloy 만 고려하는 같은 문제

**수정**: X/Y range 를 각자 독립 set 으로 계산.
```js
const xRangeSet = filtered.filter((m) => tv(m, xProperty) > 0 && inGroup && inSub);
const yRangeSet = filtered.filter((m) => tv(m, yProperty) > 0 && inGroup && inSub);
const xs = xRangeSet.flatMap((m) => [loOf(m, xProperty), hiOf(m, xProperty)])...
const ys = yRangeSet.flatMap((m) => [loOf(m, yProperty), hiOf(m, yProperty)])...
```
- X range 는 **X property 가진 모든 alloy** (Y 데이터 무관)
- Y range 는 **Y property 가진 모든 alloy** (X 데이터 무관)
- 두 독립 range 를 조합 → 차트 frame 이 각 axis 별 합리적 한계 cover
- fsetForFrame 자체는 그대로 (envelope·marker 표시는 둘 다 가진 alloy 만)

**추가 fix**: R93 frame anchor marker `size: 0.01` → `1` (plotly 의 autorange 가 size 0.01 을 무시할 가능성 차단). opacity 0 이라 시각적으로는 동일 invisible.

## R93 — Ashby chart frame anchor trace 로 reset 시 axis 확실 복원
사용자 보고 (R92 후에도 잔존): "기본 상태 → index 선택 → reset axes 누르면 엉뚱한 곳으로".
**진짜 원인 발견**: Plotly 의 `doubleClick: 'reset'` 과 modeBar 의 `resetScale2d` (🏠 home icon) 는 **layout.range 가 아니라 trace 의 데이터 bbox 로 axis 를 reset 한다**. uirevision 도, layout.range 명시도 reset 동작에는 영향이 없음.
- R89 에서 `fset = fsetForFrame.filter(inLim)` 분리 후, marker trace 가 fset 만 그려짐. index 선택 시 colored marker (= index 통과만) 가 또 작아짐.
- → Reset axes → axis 가 colored marker 의 좁은 bbox 로 zoom-in → 사용자가 "엉뚱한 곳" 으로 인지.

**진짜 해결책**: data 배열에 **4-corner invisible frame-anchor trace** 추가.
```js
const frameAnchor = {
  x: [fAxX[0], fAxX[1], fAxX[0], fAxX[1]],
  y: [fAxY[0], fAxY[0], fAxY[1], fAxY[1]],
  mode: 'markers', type: 'scatter',
  marker: { size: 0.01, opacity: 0, color: 'rgba(0,0,0,0)' },
  hoverinfo: 'skip', showlegend: false, name: '_frame',
};
```
- `fAxX/Y` = xRange/yRange 의 raw 값 (xLog 면 10^range, linear 면 그대로)
- size 0.01 + opacity 0 + transparent color → 시각적으로 안 보임
- hoverinfo skip → 호버 무반응
- data 배열 첫 번째 위치 → plotly 가 axis range 결정 시 항상 cover

**효과**:
- 어떤 reset 동작이든 (doubleClick / 🏠 modeBar / 'autoScale2d' 가 있다면 그것까지) axis 가 frame-anchor 의 4 corner 를 cover → **fsetForFrame 의 frame 으로 정확 복원**
- index 통과 colored marker 가 3개라도, fset 이 inLim 으로 좁아도, frame 영역은 fsetForFrame 기준 유지
- 모든 reset 시 동일한 frame → 사용자 인지 일관

## R92 — modeBar Reset axes (home icon) 동작 회복
사용자 보고: 물성 변경 후 Reset axes (modeBar 의 🏠 = `resetScale2d`) 버튼 누르면 이상한 곳으로 axis 가 reset 됨.
**원인**: R90 에서 추가한 `autorange: false`. Plotly 의 `resetScale2d` 동작은 axis 를 layout 의 range 로 복원하려 하지만, autorange:false 가 명시되어 있으면 axis state 가 frozen 상태로 인식되어 새 layout.range 적용이 제대로 안 됨.
**수정**: `xaxis.autorange / yaxis.autorange` 라인 제거. range 명시만으로 plotly 가 그 범위로 axis lock — autorange 의 default 처리가 더 정확.
**효과**:
- 물성 변경 (예: density → modulus) 시 uirevision 변화로 axis 가 새 layout.range 로 정상 reset
- 사용자가 zoom 후 🏠 버튼 누르면 fsetForFrame 기준의 layout.range 로 정확히 복원
- doubleClick 'reset' 동작도 동일하게 정상

## R91 — CI workflow fix + materials.json gitignore (repo 위생)
사용자 보고: "GitHub Actions 에서 실패가 많았다 · gitignore 도 좀 손봐야 할지도".

**원인 1 — CI ci.yml 의 pnpm version 충돌**: `pnpm/action-setup@v4` 에 `version: 10.4.1` 명시했는데, package.json 의 `packageManager: pnpm@10.4.1` 와 충돌해 액션이 errors out. deploy-pages.yml 코멘트에 *"Do NOT pin a version here — pnpm/action-setup reads it from the packageManager field. Specifying both errors out"* 이미 명시되어 있었음.
- 수정: ci.yml 의 `version: 10.4.1` 제거 → packageManager 필드에서 자동 읽기

**원인 2 — build:data 단계 부재**: ci.yml 이 `pnpm install → check → test → build` 순서인데, build 가 client/public/materials.json 를 dist 에 copy 함. 이 파일이 git tracking 되어 commit 으로 전달되고 있었음 (6.3MB).
- 수정: ci.yml 에 `pnpm build:data` 단계 추가 → CI 가 직접 materials.json 생성

**원인 3 — 거대 generated 파일이 repo 에 commit**: 매 R72-R90 commit 마다 client/public/materials.json (6.3MB) + build-meta.json (매 build 마다 timestamp 변경) + data/validation-report.md (anomaly report) 가 diff 에 포함. push 부담 + repo 비대화.
- 수정: .gitignore 에 3개 generated 파일 추가, `git rm --cached` 로 tracking 해제 (history 보존)

**효과**:
- CI 가 정상 동작 (frozen-lockfile + version 충돌 없음)
- repo 매 commit 의 diff 가 src 변경만 — clean
- CI runner 가 build:data 로 직접 데이터 생성하므로 stale 데이터 위험도 없음
- node-version CI 도 22 (deploy 와 통일)

**검증**: 로컬 tsc OK · vitest 47/47 · build:data OK · production build OK

## R90 — Ashby chart axis 안정성 (uirevision · reset · fallback)
사용자 보고: "(R89 후에도) index 활성화에 따라 chart frame 바뀜 · reset-axis 가 이상하게 반응 (빈 화면만 보임)". 세 가지 근본 원인을 동시에 수정.

**원인 1 — uirevision 부재**: useMemo dep 에 `indexPreset / indexThreshold / xLimit / yLimit / compareList` 등이 들어가 있어, 이들이 변할 때마다 Plotly props 가 새로 전달되고 Plotly 가 axis state 를 layout 의 range 로 강제 reset. 사용자가 zoom/pan 한 상태가 보존되지 않음 + frame 이 흔들리는 것처럼 보임.

**원인 2 — doubleClick: 'reset+autosize'**: reset 시 plotly 가 marker trace 의 bbox 에 맞춰 axis auto-fit 함. index preset 활성화 후 colored marker 가 3-4개만 통과하면 axis 가 그 3-4개에 맞춰 매우 좁아져 "빈 화면" 처럼 보임.

**원인 3 — xRange/yRange undefined**: fsetForFrame 이 비어있는 edge case (예: family/sub 조합이 빈 set) 에서 logRange/linRange 가 undefined 반환 → layout axis range 없음 → plotly fallback 동작 → 빈 axis.

**수정**:
- `xaxis.uirevision = "${xProperty}|${xLog}|${groupFilter}|${subFilter}"` — xProperty/yProperty/log/family/sub 변경 시에만 axis reset, 그 외는 사용자 zoom/pan 보존
- `yaxis.uirevision` 동일 패턴
- `xaxis.autorange: false / yaxis.autorange: false` 명시 — range 명시 시 plotly 의 자동 auto-range 동작 차단
- `doubleClick: 'reset+autosize' → 'reset'` — autosize 제거, layout 의 range 로 정확히 복귀
- `xRangeFallback / yRangeFallback` — fsetForFrame 이 비어도 xDomain (전체 materials 의 range) 으로 fallback

## R89 — Ashby chart frame을 inLim 미적용 fsetForFrame 기준으로 고정
**문제**: R88 에서 X/Y range slider 를 hard filter 로 만들었더니, range 좁히거나 index 임계값 조정 시 fset 이 변하면서 차트 axis auto-range 까지 같이 변해 zoom 이 흔들림. 사용자 보고: "index 적용시에도 frame은 유지해야함".
**수정**: fset 을 두 단계로 분리.
- `fsetForFrame = filtered.filter((m) => valid(m) && inGroup(m) && inSub(m))` — sidebar filter + family/sub 까지만. **차트 axis range 기준**.
- `fset = fsetForFrame.filter(inLim)` — range slider 까지 적용. **envelope · marker · index 표시 기준**.

auto-range 계산을 `fsetForFrame` 으로 변경:
```js
const xs = fsetForFrame.flatMap(...)
const ys = fsetForFrame.flatMap(...)
```

**효과**:
- range slider 좁혀도 axis range 유지 → envelope 가 차트 한 구석으로 작게 모이는 게 아니라 동일 위치에서 일부만 사라짐
- index threshold 조정 시 colored/coldFset 분리는 일어나도 frame 흔들림 없음
- 사용자가 range/index 인터랙티브 조정 시 차트 zoom 안정성 확보

## R88 — Ashby chart X/Y range → hard filter (AND) 변경 (Bug fix)
**Bug**: 좌측 사이드바에서 Metal 만 선택 + Y range 145.6~1050 GPa 으로 좁혔는데도 Aluminum (E≈70 GPa) envelope 가 차트에 계속 표시. 사용자가 "AND 조건이 적용 안 되는 것 같다" 고 보고.
**원인**: X/Y range slider (`xLimit`/`yLimit`) 가 fset 정의에 포함되지 않고 "selection window" 로만 동작. 코드에 `"limits act as a selection (below), not a frame change"` 주석으로 의도된 동작이었으나 사이드바 family checkbox 와 일관되지 않아 직관에 어긋남.
**수정**: `fset = filtered.filter((m) => valid(m) && inGroup(m) && inSub(m) && inLim(m))` 로 inLim 을 hard filter (AND) 에 포함. envelope · marker · index 임계 등 모든 후속 처리가 범위 밖 데이터 자동 제외. 이전 line 310-315 의 selection-window branch 도 무의미해져 제거.
- **효과 (스크린샷 사례)**: Y range 145.6~1050 GPa + Metal family → Steel (E 200) Cobalt (E 220) 만 표시, Aluminum (E 70) 과 Magnesium (E 45) 의 envelope 는 그래프에서 사라짐
- 회색 'others' background (사이드바 미통과 + valid) 는 그대로 — 비교 위치 anchor 유지

## R87 — Story 배지·History 박스 family color 통일
R84 의 amber 단일톤 (모든 카드/표/Detail 에서 같은 amber) 이 family-color dot 옆에서 튀어 보이는 문제를 해결. 모든 story 시각 요소를 재료의 family color 톤으로 통일.
- **Card view 배지** — `bg-amber-100 ring-amber-300/50 text-amber-700` → `bg: famColor + 1f` (12% alpha) + `boxShadow inset 1px famColor55` (33% alpha ring) + `icon: famColor` (full tone)
- **Table view 배지** — 동일 패턴
- **Detail panel History details** — `border-amber-500/30 bg-amber-50/40 text-amber-900` → `borderColor famColor55 / background famColor10 / 주요 텍스트 (summary, 📌 Industry standard, 출처 헤더) color famColor / 출처 구분선 famColor33`
- 결과: 강철 합금은 푸른 톤, 알루미늄은 황금색, 니켈은 보라, 코발트는 핑크, 폴리머는 녹색 — 한눈에 family 와 매칭되면서도 "연한 배경 + 진한 아이콘/텍스트" 의 기조 유지
- 모든 inline style 사용 (Tailwind dynamic class 불가) — famColor 가 이미 6-hex (`#3B82F6` 등) 라 alpha 2-hex suffix 안전

## R86 — Card view 물성 컨트롤 + 모바일 밀도 + Radar 약어
**Card 표시 물성 사용자 선택**: Card view 상단에 chip 토글 11종 추가. `am_card_props` localStorage 영속, 최소 1 / 최대 6개 강제. Default 4개 (σy / UTS / El / ρ).
- 옵션 11종 — σy, UTS, El, E, HV, k, ρ, Tmax, KIC, σf, $/kg
- Active chip = accent 배경 + shadow, inactive = 회색 border, hover 시 accent 강조
- 카운터 `{n}/6` 으로 한도 표시
- chip bar 가로 스크롤 (모바일 대응)

**Card 모바일 정보 밀도 ↑**: 텍스트 크기 유지, 카드 자체를 더 compact 하게.
- 카드 padding `p-3` → `p-2 sm:p-3`
- grid gap `gap-3` → `gap-2 sm:gap-3`
- Family + Process 한 줄 압축 (이전엔 2 줄)
- bar 가 있는 prop (σy/UTS/El/E/HV/σf) 와 value-only prop (ρ/k/Tmax/KIC/$) 자동 구분
- 기본 default 4개 + 사용자가 임의 추가 → 한 카드 안 정보량 2x

**Radar label 약어 + 잘림 방지**:
- `RadarAxis` 타입에 `longLabel` 추가 — chart 는 `label` (짧은 기호), picker UI 는 `longLabel` (풀어쓴 설명)
- DEFAULT 6개 + OPTIONS 13개 모두 단축 — σy / UTS / E / El / k / 1/ρ / HV / σf / KIC / Tmax / 1/$ / 1/α / Pop
- chart svg radius margin 32 → 22 (label 짧아져 안전 영역 ↑)
- font 10 → 11 + semibold + fill `#334155` (이전 #475569) — 시인성 ↑
- `<title>` 자식으로 hover 시 longLabel 노출 — 정보 손실 zero

## R82-R85 — UI 심미성 4-라운드 폴리시
**R82 (P0 헤더)** — 데스크탑 헤더 시각적 noise 줄임.
- Stats 5색 chip (`Metal blue · Polymer green · Ceramic amber · Composite violet · AM orange`) → 단일 `Database 1,168 materials` 버튼 + tooltip 안에 breakdown 정렬
- View toggle 배경 `oklch(0.28...)` → `oklch(0.16...)` + inset shadow + ring → segmented control 느낌 강화 (sidebar bg 와 명확히 분리)

**R83 (P1 모바일 nav + Settings)** — 현재 위치 시각 anchor + sheet layout.
- 하단 nav 의 뷰전환 버튼에 top accent dot 추가 + 텍스트도 accent 색으로 → 현재 활성 뷰 한눈에
- Settings sheet 의 3 카드 분리 → 단일 카드 + divide-y row 3개 (라벨 좌측 + segmented control 우측). 위계 일관

**R84 (P2 Detail · Donut · Story 배지)** — Detail 패널 시인성.
- Properties / Composition / Process 탭 active 시 `border-accent + bg-accent/5 + text-accent + font-semibold` (이전엔 border 만) — 어느 탭에 있는지 명확
- Composition donut 채도 ↑: ELEMENT_COLORS 38색 모두 채도/명도 재조정 (saturation 38% → 50%, lightness 62% → 55%). 인접한 보라 계열 (Mn / Mo / Co) 구분 ↑
- Story 배지 (`📖`) 시인성 ↑: amber-100 둥근 pill + amber-300 ring + amber-700 BookText (Table 셀 / Card 이름 양쪽)

**R85 (P3 마감)** — 마이크로 폴리시.
- Status bar (데스크탑 footer) **완전 제거** — 사용자 요청
- Tools 헤더 아이콘: 모바일만 Wrench → 데스크탑/모바일 모두 Wrench + (lg) 텍스트 동시 노출
- 검색창 expand transition 추가 — `transition-all duration-200 ease-out` + opacity fade

## R81 — 모바일 검색 버튼 왼쪽 정렬
모바일 헤더의 search icon 을 wrapper 안에서 분리해 헤더 왼쪽 (logo 자리) 으로 이동. 좌측 정렬 일관성 (logo·필터·검색이 모두 왼쪽).
- `Divider` 다음에 `md:hidden` search 아이콘 버튼 추가
- 기존 wrapper 안 search icon 제거, expanded 상태 input 만 wrapper 가 담당
- breakpoint `sm:` → `md:` 통일 (768px 이상에서만 데스크탑 input)

## R80 — 모바일 헤더 합리화 + Settings 시트 신설
모바일 상단 헤더에서 자주 안 쓰는 컨트롤을 빼서 하단 nav 의 새 Settings 시트로 옮김. 헤더는 핵심 동작 (검색 · 뷰 전환 · Export · Tools · 즐겨찾기 · 가이드) 만 노출.
- **Logo 모바일 hidden** — 좁은 헤더에서 가장 왼쪽 Database 아이콘이 공간을 차지했는데 정보값 없어 `hidden md:flex` 처리
- **모바일 햄버거 제거** — 필터는 하단 nav 의 첫 버튼 (Menu icon) 으로 통일 → 사용자가 직관적으로 '왼쪽 sidebar 가 슬라이드되는 것' 과 일관. 필터 버튼은 nav 왼쪽 첫 자리.
- **`?` 온보딩 · KO/EN · SI/IMP — 모바일 hidden** — 모두 새 Settings 시트 안으로 이동
- **Tools `⚙` → Wrench 아이콘** — 새 Settings ⚙ 와 시각적 혼동 방지
- **하단 nav `grid-cols-4 → 5`** — 마지막에 ⚙ Settings 추가: 필터 / 뷰전환 / Compare / 가이드 / Settings
- **Settings 시트 내용** — 우측 슬라이드 sheet 안에 3 카드:
  - 언어 — 한국어 / English 2-button toggle (active 는 accent 배경)
  - 단위 — SI (MPa·°C·g/cm³) / Imperial (ksi·°F·lb/in³) 2-button + sub-label
  - 도움말 — 온보딩 5단계 다시 보기 (` ? ` icon + 라벨)
- 데스크탑 (`md+`) 동작은 변경 없음 — 기존 상단 우측의 KO/EN, SI/IMP, ? 버튼 그대로

## R79 — popularity 4+ metal 스토리 확장 (65 → 89 base, 176 → 238 alloy 노출)
popularity 4.0+ metal 중 story 없는 25종 추가. existing key 3종 단축 (`Ti-6Al-4V (Grade 5)` → `Ti-6Al-4V`, `AISI 4140 (...)` → `AISI 4140`, `Copper (Pure, C11000)` → `Copper C11000`) 으로 prefix match 폭 확대. 신규 entry 들도 친근한 한국어 완성문 어투.
- **AM Al cast 표준** — AlSi10Mg (모든 metal AM vendor 의 default Al 분말, F1 BMW Sauber oil cooler housing 부터 Apple AirPods Max 까지)
- **carbon steel** — AISI 1045 (S45C 동등, flame-hardenable cam shaft), ASTM A36 (1960 → 미국 빌딩 frame 80%, 매년 8천만 ton)
- **항공 Al** — AA 5083 (1957 Alcoa Fink, LNG carrier inner tank + Tesla Roadster 1세대 frame), AA 6063 (1935 압출 default, LG Hausys 새시 + curtain wall + Apple Mac mini), AA 1100 (commercial pure, 재활용 Al 의 default destination)
- **stainless** — AISI 410 (1903 Brearley, 모든 밸브 trim + Wüsthof 칼날), AISI 430 (1929 ferritic, 모든 dishwasher inner liner + kitchen sink), 15-5 PH (1962 Armco, 17-4 의 forging-isotropy 보완)
- **alias** — Stainless Steel 316L (ELC, 의료 ASTM F138 + 반도체 EP-finished + AM 1순위), 304L Stainless (Cloud Gate 168장 용접), 42CrMo4 (4140 EU 동등), C11000 (ETP 짧은 alias)
- **공구·금형** — H13 Tool Steel (1929 Carpenter, BMW iX5 Hydrogen FC stack die LPBF), P20 mold steel (1936 Bethlehem, 사출금형 70%), Maraging C300 (EOS MS1 LPBF 표준)
- **고강도 합금강** — AISI 4340 (1923 SAE, 737/A320 nose gear + Sidewinder motor case), Inconel 718Plus (2000 Allvac Wei-Di Cao, F-35 + Trent XWB 차세대 disc)
- **copper alloy** — OFHC Copper C10100 (1937, CERN LHC + ITER + Furutech audio), Naval Brass C46400 (1881 영국 royal navy, Big Ben bell bracket + sailor superstition), C26000 Cartridge Brass (1882 Federal, M16/5.56 NATO + 트럼펫 bell + 풍산 글로벌 20%), CuCr1Zr (1940s GE/Krupp, 모든 자동차 spot welding tip)
- **Mg** — AZ91D (1933 Dow, VW Beetle transmission case 65년 + Audi A8 ZF housing)
- **고급 wear/medical** — Stellite 21 (1930 Haynes, Vitallium 의료 + Stryker Accolade)
- **JIS spring** — SUP9 (5160 일본 equivalent, Toyota Land Cruiser + 현대 마이티 leaf spring, 한국 SPS9)

build script 의 prefix-match + word-boundary 가 condition 변형 ("AA 5083 — Strain-hardened", "OFHC Copper C10100 — Annealed") 까지 자동 attach. 25/25 신규 base name 진입 검증.

## R78 — Metal 스토리 확장 (30 → 65) + 어투 친근화 (99 → 176 alloy 노출)
**스토리 수 확장** — 기존 30개에 metal 20종 추가, 비-metal 일부 보강해 65 base stories. build-materials.mjs 의 prefix-match + word-boundary lookup 으로 condition 변형까지 자동 attach → 노출되는 alloy **99 → 176**.
**어투 다듬기** — 핵심 7종 (Inconel 718, AISI 304/304L/316, Ti-6Al-4V, AA 6061/2024/7075) 을 친근한 한국어 완성문으로 재작성. 인물명은 한글 병기, 어미 다양화, "그가 풀려고 한 문제" / "그가 내놓은 답은" 같은 narrative tone.
**추가된 metal 20종** (산업 표준 영역):
- 잠수함·송유관 — **HY-100** (Virginia/Seawolf hull, Thresher 사고 후 hydrogen embrittlement spec), **API 5L X70** (Trans-Alaska Pipeline 1287km, Athabasca 1986 brittle fracture 이후 CTOD spec)
- 화학·고온 — **Hastelloy C-276** (1965 Haynes, DuPont HF reactor 절대 표준), **Hastelloy X** (1954 Floreen·Decker 같은 콤비, Apollo LM descent + SSME), **Tungsten W 99.95%** (Coolidge 1908 GE filament + KE penetrator)
- PH stainless — **17-7 PH** (Armco 1948 semi-austenitic, SR-71 사보 와이어), **PH 13-8 Mo** (Armco 1965, F-15/16/18 actuator + Stryker spinal rod)
- 의료·생체 — **CoCrMo F75** (1929 Vitallium, 1937 Bohlman 첫 hip arthroplasty), **Beryllium Copper C17200** (1932 Brush, Apollo 우주복 zipper, F1 spring contact)
- 해양 — **Cupronickel 70/30 C71500** (1929 USN 표준, 사우디 Ras Al Khair MSF 880km condenser tube)
- 우주 — **Niobium C-103** (Apollo LM ascent engine, Mariner 4 산화 사고), **NARLOY-Z** (SSME 60년 표준), **GRCop-84** (NASA RAMPT, Raptor V2 candidate), **AA 2195** (Reynolds 1989, SLWT Shuttle + SLS LH2), **AA 2050** (Constellium AIRWARE, A380 lower wing 800m²)
- 항공·헬기 — **Pyrowear 53** (Carpenter 1985, 헬기 변속기 loss-of-lube 30분 생존), **MAR-M 247** (Martin Marietta 1971, GE F404/F414 + F1 터보), **Udimet 720Li** (Special Metals 1965, Trent 500/700/800/900 HP disc)
- 인프라·차체 — **22MnB5** (ArcelorMittal 1995 USIBOR, EU 95 g/km CO₂ 규제 후 표준), **Hardox 450** (SSAB 1974, Komatsu HD785 + Cat 793F dump body), **A992** (2002 표준, Northridge 1994 지진 trigger), **S355J2+N** (1993 EN 10025 EU 통합, Øresund/Millau/풍력 타워)
- 철도 — **R260 Rail** (UIC 860 KTX/Shinkansen mainline), **Railway Wheel Class C** (AAR M-107 BHP Pilbara 35t/axle)
- 공구·베어링 — **D2 Tool Steel** (1920s Vasco Wear, Bohler K110/Uddeholm Sverker 21), **AISI 52100** (1898 SKF Wingquist, 모든 자동차 wheel bearing + hybrid Si₃N₄ ball)

**build script** — 기존 base-name exact match 에 prefix match + word-boundary (다음 글자가 space/em-dash/괄호/콤마 여야 함) 추가. "Inconel 718 — Annealed" 같은 condition 변형 + "HY-100 (MIL-S-16216) — submarine pressure hull — Q+T" 같은 3 단 이름 모두 매칭.

## R77 — Table·Card view 에 개발 스토리 배지
`m.story` 가 있는 합금의 이름 옆에 작은 amber `BookText` 아이콘 표시. 사용자가 list 에서 즉시 "이 재료엔 개발 역사 + industry-standard 응용 기록이 있다" 를 인지 가능.
- **MaterialTable**: 이름 셀의 family-color dot 옆에 W3 H3 amber BookText, hover title "개발 스토리·industry-standard 응용 기록 있음 (Process 탭)"
- **MaterialCards**: 이름 텍스트 inline 첫 글자 앞에 W3 H3 amber BookText, card title attribute 에 동일 hint
- 적용 대상 = R75 의 99 alloy (Inconel 718/625 의 condition 변형 모두, AISI 304/304L/316/1010/1018/1020/4140, Ti-6Al-4V, AA 6061/5052/2024/7075, 17-4 PH, Maraging 300, Stellite 6, Nylon 66, PMMA, PP, ABS, PC, PETG, PLA, PEEK, A356, Hadfield Mn13, AZ31B, Al-Bronze, Cu C11000, Nitinol, Invar 36, Alumina, Si₃N₄, WC-Co, CFRP T800, GFRP, POM Delrin, PVC)

## R76 — Story Process 탭 이동 + Composition 탭 SVG 도넛차트
**Story 위치 이동**: R75 에서 Properties 탭 최상단에 노출하던 History·개발 스토리 amber 박스를 **Process 탭** 최상단으로 옮김. Properties 는 다축 성능 (Radar) → 기계·물리·열·비용으로 즉시 접근, Process 는 alias·family·heat treatment 와 함께 dev history 가 자연스럽게 묶임.
**Composition 도넛차트**: `CompositionDisplay` 가 모든 재료의 chemical composition 을 SVG 도넛으로 시각화. 풍성한 polymer 부터 99% Fe 강철까지 동일 컴포넌트로 대응.
- `parseCompValue()` — "16~18" 중간값, "≤2" 상한, "≥58" 하한, "0.25" 그대로, "balance"/"trace" 별처리
- `buildCompSlices()` — known element wt% 합 → balance 원소를 (100 − sum) 으로 자동 backfill, value desc 정렬
- `ELEMENT_COLORS` — Fe slate, Cr 라이트블루, Ni 페일 그린, C 다크, Mn 보라, Si 옐로, Cu 코퍼 … 39 원소 표준 색; 누락 시 안정 해시 HSL 폴백
- `CompositionDonut` — 200×200 SVG, R=78 / r=48, 중앙에 dominant element + % 표기, hover `<title>` 로 `Fe: 70.50 wt% (70.5%, balance)` 표시; 100% 단일 원소 (Cu C11000 등) 의 path-closure edge case 처리
- 도넛 옆에 색상 dot + element + value% legend grid, 하단에 기존 raw range 그리드 유지 (예: `Cr 11.5~13.5`)
- legend balance 항목에 italic `bal` 뱃지

## R75 — Detail "History · 개발 스토리" 섹션 추가
Popularity 최상위 재료 30종에 대해 2~3 단락의 개발 역사, 스토리, 실제 사용례를 `data/material-stories.json`(name → text+refs) 로 분리 작성. `build-materials.mjs` 가 base name lookup 으로 모든 condition 변형 ("Inconel 718 — Annealed", "— STA" 등) 에 동일 story 를 attach (99 alloy 노출). 모든 story 는 1차 출처 (특허, 논문, handbook) 명시.
- **Material type 확장** — `story?: string`, `story_refs?: string[]`, `industry_note?: string` 신규 필드
- **build-materials.mjs** — supplementary 의 `industry_note` 통과 + stories.json 자동 주입
- **MaterialDetail.tsx** — Properties 탭 최상단에 amber 박스로 "History · 개발 스토리" 펼침 default open; 📌 Industry standard 한 줄 + 본문 다단락 + 출처 리스트
- **138 alloy** 에 industry_note 노출 (R72-R74 의 metal 54종 × condition variants)
- **30 base stories** = Inconel 718/625, AISI 304/304L/316/1010/1018/1020/4140, Ti-6Al-4V, AA 6061/5052/2024/7075, 17-4 PH, Maraging 300, Stellite 6, Nylon 66, PMMA, PP, ABS, PC, PETG, PLA, PEEK Victrex 450G, A356.0, Hadfield Mn13, AZ31B Mg, Aluminum Bronze C61400, Copper C11000, Nitinol, Invar 36, Alumina 99.5%, Si₃N₄ HIP'd, WC-6Co K10, CFRP T800, GFRP E-glass UD, POM Delrin 500, PVC

## R74 — Metal 산업군 추가 확장 (1,121 → 1,168)
이전 R72/R73이 다룬 metal 도메인(밸브·베어링·항공 disc·차체·보일러튜브·원자로) 외 미커버 metal 산업군 20종을 supplementary 에 추가. 모든 entry 에 `industry_note` 로 표준·OEM·기체 모델 명시.
- **철도 (Rail / Wheel)** — R260 (UIC 860 / EN 13674-1, 60E1 mainline), Class C wheel (AAR M-107, 39 t/axle heavy-haul)
- **방위 갑옷** — RHA MIL-A-46100 (M1 Abrams 핵체 / Bradley IFV / Stryker)
- **미사일 motor case / 항공 landing gear** — D6AC (Minuteman III / Trident D-5 / B-1B), HP 9-4-30 (F-14/15/16 main gear)
- **자동차 단조** — 38MnVS6 (BMW B57 · VW EA288 · MAN D2868 크랭크샤프트 microalloyed)
- **구조강 (Civil / Infrastructure)** — A992 (US W-shape, 모든 미국 빌딩·다리), S355J2+N (EU 다리·풍력 타워·선체), S275JR (EU general fabrication 95%), S690QL (Liebherr 크레인 boom, Cat 굴착기 stick), API 2H Gr.50 (Shell Mars / North Sea offshore jacket)
- **마모 / 광업** — Hardox 450 (Komatsu HD785 / Cat 793F dump body, 분쇄기 hopper)
- **스프링 (heavy-truck)** — AISI 9260 (Hino / Tata / Volvo FH leaf spring, John Deere disc plough)
- **공구강** — D2 Tool Steel (cold-work stamping die 글로벌 표준, Bohler K110 / Uddeholm Sverker 21), AISI H21 (W tool, 단조 die 적열경도 650°C)
- **로켓 엔진 (Cu 열교환 chamber)** — NARLOY-Z (SSME/RS-25 / Aerojet RL10), GRCop-84 (NASA RAMPT 2세대 AM, Raptor V2 candidate)
- **항공 / 우주 Al-Li** — AA 2195 (SLWT Shuttle / SLS LH2 tank / Falcon 9), AA 2050 Constellium AIRWARE (A380 lower wing / A350 fuselage frame / A220)
- **저온 LPG / 냉동 LNG 갑판 탱크** — ASTM A537 Class 2 (Statoil Mongstad NH₃ sphere, refrigerated propane bullet)

## R73 — Industry-standard 도메인 확장 (1,085 → 1,121)
보유 데이터가 풍부한 ceramic 영역(Macor, Mullite, Spinel, WC-Co, Sialon 등 이미 존재)은 건너뛰고, metal·composite·polymer 영역에 20종 추가. 각 metal entry 에 `industry_note`, composite/polymer entry 에 `applications` 상세 표기.
- **잠수함 / 수소 서비스 / 파이프라인** — HY-100 (Virginia·Seawolf hull), SA336 F22V (hydroprocessing reactor V-mod Cr-Mo), API 5L X65 PSL2 (sour offshore), API 5L X70 PSL2 (gas transmission), L80 Type 13Cr (CO₂ sweet OCTG)
- **마모 / 충격** — Hadfield Manganese Steel Mn13 (ASTM A128 Grade B, 분쇄기 jaw / 철도 frog)
- **항공·우주 Al** — AA 5083-H321 (LNG inner tank / ABS marine), AA 2024-T351 (737/747 fuselage skin), AA 7050-T7451 (F-22/777 thick forging)
- **β-Ti** — Ti-13V-11Cr-3Al (SR-71 Blackbird airframe, 1st-gen β)
- **헬리콥터 기어** — Pyrowear 53 (AMS 6308; Black Hawk/Apache main gearbox, 315°C loss-of-lube)
- **터빈 블레이드 / 디스크** — MAR-M 247 (GE F404/F414 blade, F1/Le Mans turbo wheel), Udimet 720Li (Trent 500/700/900 HP disc), AISI 8620 (자동차 변속기 ring & 풍력 1.5 MW 기어 reference)
- **CFRP 확장** — T700SC/Epoxy (F1·자전거·풍력 mid-range), IM7/BMI (F-22·F-35 supersonic 230°C 1차 구조), M40J/Cyanate Ester (위성 antenna boom 저 CTE)
- **고성능 폴리머** — PMMA Plexiglas G (F-16/Cessna 캐노피 MIL-PRF-25690), PET-GF30 Rynite 530 (산업 감속기·펌프·헤어드라이어), PPA-GF45 Amodel A-1145 HS (자동차 EV 인버터·트랜스미션 HT)

## R72 — Industry-standard niche alloy DB (1,040 → 1,085)
20 standard-grade alloys added to `data/supplementary-materials.json`, each tagged with `industry_note` describing its de-facto-standard application. Total reference materials 392 → 412; combined DB 1,040 → 1,085 alloys.
- **Valve / pump trim** — SS410 (UNS S41000, API 6A trim), SS420 (cutlery / surgical), SS440C (premium bearing & blade)
- **Aero bearing & gear** — M50 (AMS 6491, jet-engine mainshaft), AISI 9310 (VIM-VAR, helicopter transmission)
- **Automotive body** — 22MnB5 (USIBOR 1500 hot-stamping PHS), DP780 (dual-phase AHSS)
- **Boiler tube** — SA213 T22 (2.25Cr-1Mo subcritical/USC), Super 304H (S30432 Nb-Cu USC superheater)
- **Reactor / fuel** — SA508 Grade 3 Class 1 (PWR RPV forging), Zircaloy-4 (R60804 PWR fuel cladding)
- **Cryogenic structural** — 9% Ni Steel (ASTM A553 LNG tank inner shell)
- **Shipbuilding** — AH36 (ABS/DNV/LR harmonized high-tensile hull)
- **Engine valve** — SAE 21-4N (NCF3 automotive exhaust valve face)
- **Cryogenic propellant** — AA 2219-T87 (Saturn V / SLS / Falcon 9 LOX tank)
- **Aerospace fastener / medical** — MP35N (UNS R30035 Co-Ni-Cr-Mo)
- **Plastic injection mold** — NAK80 (Daido pre-hardened mirror-finish), STAVAX ESR (Uddeholm corrosion-resistant)
- **Spring** — Music Wire (ASTM A228 piano-wire), Chrome-Silicon (ASTM A401 oil-tempered engine valve spring)

## R71 — Quality push (security · a11y · backup · tests · CI)
- **R71 Sprint A** — security headers (CSP, X-Frame, Referrer-Policy, Permissions-Policy), Guide & Tools lazy-loaded, ErrorBoundary classifies network/TDZ errors with 3 recovery actions
- **R71 Sprint B** — anomaly detection excludes 17 specialty Ni superalloys (Monel, single-crystal CMSX/Rene/PWA, ODS, low-CTE) → 330 → 327
- **R71 Sprint C** — focus-visible ring (WCAG 2.4.7), pointer:coarse min-tap-target ::before (WCAG 2.5.5), prefers-reduced-motion override
- **R71 Sprint D** — localStorage backup/restore JSON (collections, favorites, recent searches, language, units, radar config)
- **R71 Sprint E** — 47 unit tests (vitest): cross-sections, welding CET + machinability, HT glossary, fuzzy search
- **R71 Sprint F** — `.github/workflows/ci.yml` (install → check → test → build), CLAUDE.md & CHANGELOG.md, CVE audit (3 dev-only vulns documented)

## R70 — Guide external link cleanup
- `pnpm verify:guide` script — extracts every https href, GETs with browser UA, classifies ok/forbidden/redirect/dead/error
- 14 dead URLs replaced (Wikipedia renames, DoITPoMS restructure, MIT OCW course-ID changes, vendor reorg) → 0 dead / 74 OK / 3 bot-block / 2 SSL-timeout (browser OK)

## R69 — Compare power-user features
- **A·D** — build-meta footer "Data updated YYYY-MM-DD", alloy ⭐ favorites with header dropdown
- **B·C** — 6 best-pick badges (max σy, max E, max σy/ρ, max E/ρ, min price, max HV), PDF export via window.print + @media print
- **G·H** — 4 weight sliders + Top-3 medal ranking, 3 new Tools calculators (LMP creep lifetime, Mohr's circle, Schaeffler stainless phase diagram)

## R68 — Visual polish
- **Sprint A** — 6 Tools calculators get inline SVG illustrations (Kt shape feature + stress flow, galvanic 2-metals + electrolyte, buckling Euler vs Johnson with end conditions, CTE mismatch bars, Vickers indenter, pressure vessel cyl/sph with hoop arrows)
- **Sprint B** — 4 Guide SVG: S-N curve (Basquin), Goodman/Soderberg/Gerber overlay, AM Z-vs-XY anisotropy schematic, 7-step AM post-processing flowchart
- **Sprint C** — analysis-only of remaining usability gaps

## R67 — Engineering Tools page + Detail extensions
- **Sprint A** — Detail panel adds Manufacturability section (Machinability rating per 30 alloy-family rules, CET per IIW Doc IX-1086-87 from composition), A/B basis link to Guide
- **Sprint B** — new `/tools` page + 6 calculators (Stress concentration Kt, Galvanic compatibility 15-metal series, Buckling Euler/Johnson auto-pick, CTE mismatch thermal stress, Hardness HV↔HRC↔HB conversion ASTM E140, Pressure vessel thickness)
- **Sprint C** — Compare panel gains a third view mode: Goodman diagram (σ_m vs σ_a SVG, per-alloy Goodman/Soderberg lines, user design point, SF table)

## R66 — Guide depth pass
- **Sprint A** — sticky search bar in Guide header with 28 indexed entries + anchor scroll + ring highlight
- **Sprint B** — Ashby M derivation + Basquin/Goodman/Soderberg/Gerber + Euler-Bernoulli + Larson-Miller LMP + Arrhenius + Kt definition + 4 external-link cards (MIT OCW, DoITPoMS, NPTEL, eFatigue, MatWeb, Materials Project, NIST, ECCC, ASTM/ISO/ASME, vendors)
- **Sprint C** — Guide ↔ app feature-gap analysis (12 missing features identified)

## R65 — Guide learning depth (TOC 9 → 13)
- Hero adds a 7-step decision flowchart (Requirements → Family match → Ashby narrow → Compare → Verify → Prototype → Certify) with chapter anchors
- New Ch.3 "Family mapping + environment" (10 domains → families, 10 environments → suitable/avoid alloys)
- Ch.5 appends Safety Factor handbook (9 industries 1.5–12, 7 condition multipliers)
- New Ch.9 "10 common design mistakes" (KIC ignored, AM Z-fatigue, surface roughness, galvanic, notch, weldability, H-embrittlement, DBTT, CTE mismatch, confidence misuse)
- New Ch.11 "Certification · manufacturing · testing" (9 industry certifications, 7 process tables, 10 prototype tests E8/E23/E466/E399/etc)
- New Ch.12 "5 industry case studies" (F1 engine block, JWST mirror, SpaceX Raptor, Tesla giga press, drone+implant)
- Ch.13 (renumbered) adds datasheet base table (typical / minimum / A-basis / B-basis / guaranteed minimum)

## R63 — Learning curve polish
- Onboarding gains Welcome step 0 with 3-stat illustration (1,040 alloys · Ashby · 16 scenarios)
- ScenarioDialog footer "default values" hint
- RadarChart Base label gets abbr tooltip
- Compare empty-columns animated hint
- MaterialDetail heat treatments switch to multi-line list

## R61 — Onboarding + Guide entry fork + contextual hints
- **Sprint A** — 5-step Onboarding with inline SVG illustrations + 5th-step quick-start (Bracket/Heatsink/Fatigue/Marine), header `?` button reopens
- **Sprint B** — Guide Hero 3-path CTA (5min Bracket / 30min Ashby / Reference), 6 popular tiles + "more 10" progressive disclosure, `F` symbol-glossary with dotted-underline abbr tooltip
- **Sprint C** — Ashby first-visit toast (filter/index/zoom), applied-preset banner "First candidate (N)" + "Compare (N)" next-action buttons, mobile Guide chapter collapsible

## R60 — Guide updates for Sprint 2-4 features
- Hero kbd hints, fuzzy examples, language/unit toggle mentions
- Bracket scenario steps mention bulk header checkbox + Radar/CSV/PNG
- Hightemp families add P91 Inconel 617 Incoloy 800H A286
- Fatigue notes σ_f ≈ k·σ_y, Pressure vessel notes KIC class fallback
- Ch.1 property dictionary adds HT glossary + confidence labels + fallback source labels

## Sprint 4 (R64-era) — Data + large features
- **C1** Fatigue endurance-limit family-typical fallback (Shigley 11 family k_typ rules) — 759 alloys filled (89.2% coverage)
- **C2** Fracture toughness KIC family-typical fallback (17 family patterns from ASM Vol.1·2 + MMPDS) — 3.8% → 82.2% coverage
- **C3** Elevated-temp + creep curves for P91, Inconel 617, Incoloy 800H added to supplementary
- **C6** Ashby Plotly scroll-zoom + double-click reset + Spike Lines
- **C7** Heat Treatment glossary (26 HT conditions: H900-H1150, SA, Aged, STA, Q&T, Normalized, Annealed, HIP, T6/T651/T7/T4, O, H-temper, Mill Annealed, β-annealed, SA+Aged, PH-Cu)

## Sprint 3 — Collections sort/search + keyboard + Scenario preview
- **B8** Collections recent/name/size cycle, search input at 5+, createdAt timestamp
- **B9** Global `/` Search focus and `?` Onboarding shortcuts, aria-label on Search input
- **B10** ScenarioDialog right panel shows "Filters to apply" list before Apply

## Sprint 2 — UI/UX critical
- **A2** Plotly mobile legend visibility (font 9 → 12, itemwidth 30)
- **A3** Fuzzy search (subsequence + separator strip)
- **A4** Family Tree 3-tier mobile tap-friendly
- **A5** Compare radar with family color + lightness variant
- **A7** Recent searches dropdown
- **B1** First-visit Onboarding tour (localStorage flag)
- **B3** RadarChart vertex SVG title tooltip

## Sprint 1 — Data integrity
- **A1** aliasesFor() sub-token regex (H13, M2, D2, 17-4 PH, AA xxxx, etc)
- **A6** RadarChart Base indicator
- **B2** Anomaly per-family σy/UTS ratio detection
- **B6** `verify:urls` script (51.4% verified-URL coverage)
- **B7** Cost data provenance section

## R54 — Production TDZ regression hunt
- **R54a** Ashby production `Cannot access 'U0' before initialization` — xMetaForHover/yMetaForHover moved before markerTraces use
- **R54b** xMeta alias removed entirely (single-declaration policy committed to memory)

## R45-R53 — Foundations
- R45 Range slider, R46 Header counts, R48a Anomaly detection, R49a Dark mode removed (permanent),
  R49b URL share auto-sync, R49c Mobile search, R49d Verified URL coverage,
  R50a Alloy data 940 → 1000+, R50c Ashby interactions, R50d Compare CSV/PNG,
  R51a Non-structural ceramics removed, R51b Filter range narrowing (leave-one-out),
  R52a Misclassification fix (Aluminum in Stainless Steel), R53a RadarChart component.
