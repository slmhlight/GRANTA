/*
 * Guide ch6 본문 — Guide.tsx 에서 분리 (F1).
 *
 * **컴포넌트가 아니라 순수 함수**다. 이유가 둘 다 있다:
 *   · <Chapter> 는 라우트가 다르면 return null 인데 JSX children 은 부모가 미리 다 만든다 —
 *     /guide/ch1 한 페이지에 15 챕터 본문이 전부 구성되고 14 개가 버려졌다. 함수로 넘기면
 *     그 챕터가 실제로 렌더될 때만 호출된다.
 *   · 그런데 자동링크(GlossaryText)는 **완성된 element 트리**를 걸어가며 문자열 잎을 링크로
 *     바꾼다. 컴포넌트(<Body/>)로 감싸면 walker 가 children 을 못 봐 링크가 전멸한다.
 *     호출하면 트리를 돌려주는 함수라야 둘 다 만족한다.
 * 훅을 쓰면 안 된다(컴포넌트가 아니라 호출되는 함수다). 내용은 원본 그대로 — 옮기기만 했다.
 */
import { X } from 'lucide-react';
import { F, Note, ExtLink, H3 } from '../components';
import { SvgAshbyChart, SvgFCOF } from '../svgs';

export default function ch6Body() {
  return (<>
          <p className="leading-relaxed">Ashby 방법은 문제를 네 가지로 분리합니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div className="rounded border border-border bg-card p-3 text-sm"><b>① 기능 (Function)</b><br/>부품이 무엇을 하는가 (인장재·보·패널·축…).</div>
            <div className="rounded border border-border bg-card p-3 text-sm"><b>② 제약 (Constraints)</b><br/>반드시 만족할 조건 (σy ≥ X · 온도 ≥ Y · 공정 = LPBF…).</div>
            <div className="rounded border border-border bg-card p-3 text-sm"><b>③ 목적 (Objective)</b><br/>최대/최소화할 것 (무게 ↓ · 원가 ↓ · 강성 ↑).</div>
            <div className="rounded border border-border bg-card p-3 text-sm"><b>④ 자유변수 (Free)</b><br/>설계가 바꿀 수 있는 것 (단면적, 두께…) + 재료.</div>
          </div>

          {/* 핵심 도식: F-C-O-Free → M */}
          <div className="rounded-lg border border-border bg-card p-3 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📊 핵심 그림 — 4요소를 모아 성능지수 M 도출</p>
            <div className="h-[260px]"><SvgFCOF /></div>
          </div>

          <H3>성능지수(material index) — 왜 거듭제곱이 분수가 될까?</H3>
          <Note tone="why" title="유도 (경량 인장 부재)">
            <p>강도 제약: <F>F/A ≤ σy</F> → 필요 단면 <F>A ≥ F/σy</F>.</p>
            <p>질량: <F>m = A · L · ρ = F · L · (ρ/σy)</F>.</p>
            <p><F>F, L</F> 은 고정 → 질량 최소화는 <F>ρ/σy</F> 최소화 = <F>σy/ρ</F> <b>최대화</b>. ⇒ 성능지수 <F>M = σy/ρ</F>.</p>
            <p className="mt-2">기능이 “굽힘 보/패널”이면 두께·폭이 자유변수로 들어가고 단면 2차모멘트(<F>I ∝ h³</F>)를 통해 식이 정리되면서 <b>거듭제곱이 분수</b>가 됩니다. 그래서 보는 <F>E^½/ρ</F>, 패널은 <F>E^⅓/ρ</F>.</p>
          </Note>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">기능 / 목적</th><th className="p-2 font-semibold">성능지수 M (클수록 우수)</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2">경량 강성 인장재</td><td className="p-2 font-mono"><F>E/ρ</F></td></tr>
                <tr><td className="p-2">경량 강성 보</td><td className="p-2 font-mono"><F>E^½/ρ</F></td></tr>
                <tr><td className="p-2">경량 강성 패널</td><td className="p-2 font-mono"><F>E^⅓/ρ</F></td></tr>
                <tr><td className="p-2">경량 강도 인장재</td><td className="p-2 font-mono"><F>σy/ρ</F></td></tr>
                <tr><td className="p-2">경량 강도 보 / 패널</td><td className="p-2 font-mono"><F>σy^⅔/ρ</F> / <F>σy^½/ρ</F></td></tr>
                <tr><td className="p-2">탄성 스프링·힌지 (에너지 저장)</td><td className="p-2 font-mono"><F>σy²/E</F></td></tr>
                <tr><td className="p-2">경량 방열</td><td className="p-2 font-mono"><F>k/ρ</F></td></tr>
                <tr><td className="p-2">저원가 강성 / 강도</td><td className="p-2 font-mono"><F>E/Cm</F> / <F>σy/Cm</F></td></tr>
              </tbody>
            </table>
          </div>

          <H3>차트 활용 (이 앱과 1:1 매핑)</H3>
          <p className="text-sm leading-relaxed">Ashby 차트는 보통 <b>로그-로그 축</b>에 두 물성을 그립니다. 한계선(필터)·외피(재료군 분포)·등지수선(성능지수 방향)을 함께 보면 좋은 후보가 어디에 모이는지 한눈에 잡힙니다.</p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[320px]"><SvgAshbyChart /></div>
          <p className="text-[12px] text-muted-foreground">위 그림은 ρ vs σy 샘플 — <span className="text-amber-600 font-semibold">한계선(노랑)</span> 위쪽이 σy 제약 통과, <span className="text-rose-500 font-semibold">등지수선(빨강)</span>을 위쪽으로 옮길수록 더 좋은 재료. 둘 다 만족하는 영역에 모인 재료가 최종 후보입니다.</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">Ashby 개념</th><th className="p-2 font-semibold">이 앱에서</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2">제약 (반드시 만족)</td><td className="p-2">좌측 <b>필터</b> 범위 · 차트 축 <b>한계 슬라이더</b></td></tr>
                <tr><td className="p-2">목적 (성능지수)</td><td className="p-2">상단 <b>Index</b> 프리셋 + <b>M 임계값</b> 슬라이더</td></tr>
                <tr><td className="p-2">다목적 (여러 지수)</td><td className="p-2"><b>+ constraint</b> 로 N개 AND</td></tr>
                <tr><td className="p-2">재료군 분포</td><td className="p-2"><b>Envelopes</b>(category/family/sub) 토글</td></tr>
                <tr><td className="p-2">후보 추리기</td><td className="p-2"><b>박스 선택</b> → Add all → Compare 또는 표 헤더 <b>＋ 체크박스</b>로 현재 페이지 전체 추가</td></tr>
                <tr><td className="p-2">비교·검증</td><td className="p-2"><b>Compare</b> 패널 · Radar 오버레이(≤20) · CSV · PNG export · 상세 팝업 · 출처 링크</td></tr>
                <tr><td className="p-2">차트 인터랙션</td><td className="p-2">마우스 휠로 zoom · 더블클릭으로 reset · modeBar 의 <b>Spike Lines</b> 로 점 좌표 가이드</td></tr>
                <tr><td className="p-2"><b>Pareto frontier</b> (다목적 외곽선)</td><td className="p-2">상단 <b>Pareto</b> 체크박스 → 골드 별표 + 라인</td></tr>
              </tbody>
            </table>
          </div>

          {/* R30 — Pareto frontier 섹션 신규 */}
          <H3>Pareto Frontier — 다목적 trade-off 외곽선</H3>
          <Note tone="why" title="언제 쓰나요?">
            "<b>무게는 가볍게 (ρ ↓) + 강도는 높게 (σy ↑)</b>" 같이 <b>두 목적이 충돌하는</b> 상황.
            성능지수 M 하나로 줄세우면 한 축만 보지만, Pareto frontier 는 두 목적 모두 더 좋게 만들 수 있는 점이 <b>존재하지 않는</b> 재료들만 골라 외곽선을 그립니다.
          </Note>

          <p className="text-sm leading-relaxed mt-3">
            <b>정의:</b> 어떤 후보 A 가 있을 때, "A 보다 ρ 가 작으면서 σy 가 같거나 크다" 거나 "ρ 가 같거나 작은데 σy 가 크다" 는 후보 B 가 <b>없으면</b> A 는 <b>Pareto 최적</b>. 모든 Pareto 최적 점을 연결한 곡선이 Pareto frontier 입니다.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="rounded border border-amber-400/40 bg-amber-50/60 p-3">
              <p className="font-semibold text-amber-800 mb-1">⭐ Frontier 위 재료의 의미</p>
              <p className="text-sm leading-relaxed">"<b>두 목적 모두 동시에</b> 이 합금보다 더 좋게 만족하는 다른 후보가 <b>현재 풀에</b> 없다." → 후보로 남길 만함.</p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="font-semibold text-foreground mb-1">🔍 자동 방향 매핑</p>
              <p className="text-sm leading-relaxed">앱이 X·Y 축 물성에 따라 <b>max/min 방향을 자동 결정</b>. 예: density·price·CTE 는 <b>min</b>, σy·E·HV·k·T_max 는 <b>max</b>. 토글 옆에 'X↑ Y↑' 형식으로 표시.</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3 my-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">사용 흐름</p>
            <ol className="list-decimal pl-5 text-sm space-y-1 leading-relaxed">
              <li>차트 X / Y 축 선택 (예: X=density, Y=yield_strength)</li>
              <li>좌측 필터로 후보 풀 좁히기 (예: Metal·LPBF·sy ≥ 200)</li>
              <li>상단 <b>"Pareto"</b> 체크박스 ON → 골드 별표 + 라인 등장 ("N pts · X↓ Y↑" 정보 표시)</li>
              <li>Frontier 위 별표 클릭 → 상세 popup → Compare 추가</li>
            </ol>
          </div>

          <Note tone="tip" title="Index 와의 차이">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Index (M = σy/ρ 등)</b>: 하나의 성능지수 임계값(M ≥ X) 으로 잘라 후보를 가른다. 두 목적의 trade-off 를 <b>일직선</b>으로 가정.</li>
              <li><b>Pareto</b>: trade-off 가 <b>곡선</b> 일 때도 작동. 두 목적의 가중치가 명확하지 않을 때 유용 — frontier 위 후보를 모두 추리고 가공성·비용 등 다른 기준으로 최종 선택.</li>
              <li>둘 다 켜면: Index 통과 + Pareto 위 = <b>가장 강한 후보</b>.</li>
            </ul>
          </Note>

          <Note tone="warn" title="주의 사항">
            <ul className="list-disc pl-5 space-y-1">
              <li>Pareto frontier 는 <b>현재 필터 통과 풀 안에서만</b> 계산. 풀을 좁히면 frontier 도 다시 그려짐.</li>
              <li>방향이 자동 매핑되지만 <b>특수 응용</b> (예: 의료 임플란트 modulus 는 너무 높지 않아야 함) 에서는 의미가 달라질 수 있음 — 사용자가 판단.</li>
              <li>Frontier 위 재료라도 가공성·내식·환경 규제 (RoHS) 까지 자동 반영 안 됨 — Compare 패널로 추가 검증.</li>
            </ul>
          </Note>

          {/* R64 — Ashby 인터랙션 상세 (modeBar, box select, slider). 차트 사용 흐름. */}
          <H3>차트 인터랙션 빠른 참조</H3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">동작</th><th className="p-2 font-semibold">방법</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2 font-medium">확대</td><td className="p-2">마우스 휠 (위/아래) — 차트 위 어디든 가능</td></tr>
                <tr><td className="p-2 font-medium">초기화</td><td className="p-2">차트 더블클릭 또는 modeBar 의 <b>Reset axes</b></td></tr>
                <tr><td className="p-2 font-medium">패닝(이동)</td><td className="p-2">modeBar 의 <b>Pan</b> 선택 후 드래그</td></tr>
                <tr><td className="p-2 font-medium">박스 선택</td><td className="p-2">modeBar <b>Box Select</b> → 영역 드래그 → 좌측 하단 "Add all" 또는 "→ Filter"</td></tr>
                <tr><td className="p-2 font-medium">점 정확 위치</td><td className="p-2">modeBar <b>Toggle Spike Lines</b> — 점 hover 시 X·Y 가이드 라인</td></tr>
                <tr><td className="p-2 font-medium">PNG 저장</td><td className="p-2">modeBar 좌측 <b>Download plot as PNG</b> (1000×700, scale 2)</td></tr>
                <tr><td className="p-2 font-medium">Index 임계 조정</td><td className="p-2">빨간 실선 (Index line) <b>드래그</b> → M 임계값 실시간 변경</td></tr>
                <tr><td className="p-2 font-medium">Envelope 토글</td><td className="p-2">상단 <b>Envelopes</b> 의 category / class / family 중 선택. Show 토글로 ON/OFF.</td></tr>
                <tr><td className="p-2 font-medium">축 변경</td><td className="p-2">상단 <b>X / Y</b> 드롭다운에서 물성 선택. Log / Linear 토글.</td></tr>
              </tbody>
            </table>
          </div>

          {/* R64 — Compare 패널 활용 흐름. */}
          <H3>Compare 패널 활용 흐름</H3>
          <p className="text-sm leading-relaxed">차트·표에서 좁힌 후보를 모아 <b>객관적으로 비교 → 1 ~ 3 후보로 선정 → 데이터시트 검증</b> 까지 한 패널 안에서.</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">단계</th><th className="p-2 font-semibold">동작</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2 font-medium">① 후보 추가</td><td className="p-2">표 row 의 <b>＋</b> 체크박스 · 헤더 ＋ 로 페이지 전체 (최대 500) · Ashby 박스선택 후 "Add all" · Cards 의 ＋ 도 동일.</td></tr>
                <tr><td className="p-2 font-medium">② Compare 패널 열기</td><td className="p-2">우상단 <b>Compare (N)</b> 클릭 · 배너의 "Compare (N)" 단축버튼</td></tr>
                <tr><td className="p-2 font-medium">③ 컬럼 선택</td><td className="p-2">좌상단 <b>Columns</b> → 비교할 물성 multi-select (default: ρ·σy·UTS·El·E·HV·price·total_cost·popularity)</td></tr>
                <tr><td className="p-2 font-medium">④ 정렬·필터</td><td className="p-2">컬럼 헤더 클릭으로 정렬 · 가로 막대 = 그 컬럼 최댓값 대비 비율 시각화</td></tr>
                <tr><td className="p-2 font-medium">⑤ Radar 오버레이</td><td className="p-2">상단 <b>Radar</b> 토글 (≤20 alloy). 축 6개 선택 + 정규화 base (Compare set / 패밀리 / 카테고리) 토글. legend 클릭 = focus mode.</td></tr>
                <tr><td className="p-2 font-medium">⑥ 신뢰도 확인</td><td className="p-2">각 셀의 <b>confidence dot</b> 색 — measured / handbook / class / derived. detail 팝업으로 출처 확인.</td></tr>
                <tr><td className="p-2 font-medium">⑦ Export</td><td className="p-2"><b>CSV</b> (열 헤더 + 행 typical), <b>PNG</b> (Radar 차트 캡처). 결과를 보고서 / 회의 자료로.</td></tr>
                <tr><td className="p-2 font-medium">⑧ 최종 검증</td><td className="p-2">상위 1~3 후보의 <b>출처 URL</b> 직접 방문 → 측정 조건 (heat treatment, build direction) 확인 후 시험 발주.</td></tr>
              </tbody>
            </table>
          </div>

          {/* R66 B — Ashby 깊은 학습 + 외부 링크 */}
          <H3>Ashby 방법 깊은 학습</H3>
          <Note tone="why" title="성능지수 M 의 일반 유도 (인장 부재 예)">
            <p className="leading-relaxed">기능 = 인장 (단면적 A·길이 L), 제약 = 강도 σy, 목적 = 무게 최소화, 자유변수 = A.</p>
            <p className="mt-1 font-mono text-[12px]">m = ρ·A·L 이고, F ≤ σy·A 이므로 A ≥ F/σy. 대입하면 m ≥ F·L·(ρ/σy) = (F·L) · (1/M) — <b>M = σy/ρ</b> 최대화.</p>
            <p className="mt-2 leading-relaxed">기능이 보·패널이면 단면 2차모멘트 <F>I ∝ b·h³</F> 의 자유변수가 더 많아 거듭제곱이 분수 (E^½/ρ · E^⅓/ρ) 가 됩니다.</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — 외부 자료">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/Material_selection">Wikipedia: Material selection</ExtLink> — Ashby methodology 개요</li>
              <li><ExtLink href="https://www.doitpoms.ac.uk/tlplib/index.php">DoITPoMS (Cambridge): Materials selection</ExtLink> — interactive Ashby 차트 학습</li>
              <li><ExtLink href="https://ocw.mit.edu/search/?d=Materials%20Science%20and%20Engineering&s=department_course_numbers.sort_coursenum">MIT OCW 3.094 Materials in Human Experience</ExtLink> — 재료의 사회·역사·기술 통합 강의</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Material_selection">Wikipedia: Ashby chart</ExtLink> — chart 구조와 envelope 이론</li>
              <li>M. F. Ashby, <i>Materials Selection in Mechanical Design</i> (4th/5th ed.) — 표준 교과서. <ExtLink href="https://www.elsevier.com/books/materials-selection-in-mechanical-design/ashby/978-0-08-100599-6">Elsevier 페이지</ExtLink></li>
            </ul>
          </Note>
  </>);
}
