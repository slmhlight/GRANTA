/*
 * Guide ch2 본문 — Guide.tsx 에서 분리 (F1).
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
import { Lightbulb } from 'lucide-react';
import { F, Note, ExtLink, Chapter, H3, Step } from '../components';
import { SvgSafetyFactor } from '../svgs';

export default function ch2Body() {
  return (<>

          <H3><Lightbulb className="w-4 h-4 text-amber-500"/> 5.1 응력 = 힘 ÷ 면적 — 가장 먼저 만나는 식</H3>
          <p className="leading-relaxed">
            막대를 잡아당기는 힘 <F>F</F> 가 단면적 <F>A</F> 에 골고루 퍼진다면, 단면 안 어디서나 같은 응력이 작용합니다. 이게 <F>σ = F / A</F>.
            영구 변형을 막으려면 <b>작용 응력이 항복강도 σy 보다 충분히 작아야</b> 합니다.
          </p>
          <Note tone="why">
            <p>σy 를 그대로 쓰지 않고 “안전계수 SF” 로 나눠 “허용응력” 을 만듭니다. 측정 오차, 결함, 충격, 환경, 데이터 불확실성 같은 미지의 요소에 대비하는 여유분이죠.</p>
            <p className="mt-1 font-mono text-[13px]">허용응력 = σy / SF &nbsp;→&nbsp; 필요 σy ≥ SF · σ = SF · F / A</p>
            <p className="mt-1 text-muted-foreground">정적·연성 부품은 보통 <F>SF = 1.5~2</F>, 인명·취성·불확실 영역은 더 높게.</p>
          </Note>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[260px]"><SvgSafetyFactor /></div>
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/40 p-4 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">📐 워크드 예제 — 인장 부재</p>
            <p className="text-sm text-foreground/85 mb-3">
              지름 약 5 mm, 단면적 <F>A = 20 mm²</F>인 봉이 <F>F = 4000 N</F>의 인장하중을 받습니다. <F>SF = 2</F>로 설계합니다.
            </p>
            <Step n={1} title="작용 응력 계산" formula={<>σ = F / A</>} result={<>σ = 4000 / 20 = <b>200 MPa</b></>} />
            <Step n={2} title="안전계수 적용 → 필요 σy" formula={<>필요 σy ≥ SF · σ</>} result={<>≥ 2 × 200 = <b>400 MPa</b></>} />
            <Step n={3} title="앱에서 후보 좁히기" result={<>좌측 <b>Yield Strength</b> 필터 하한을 <b>400</b>으로 설정.</>} note="알루미늄 일반품은 탈락, 고강도 알루미늄 일부·강·티타늄·니켈 통과." />
          </div>

          <H3><Lightbulb className="w-4 h-4 text-amber-500"/> 5.2 처짐과 강성 — “덜 휘려면 E가 얼마여야 하나?”</H3>
          <p className="leading-relaxed">
            “덜 휜다”는 <b>강성</b>의 문제이고, 강성은 <b>형상(I)</b> + <b>재료 E</b>로 결정됩니다. 가장 단순한 예는 외팔보:
          </p>
          <p className="font-mono text-[13px] mt-1 bg-muted/40 inline-block px-2 py-1 rounded">δ_max = F · L³ / (3 · E · I)</p>
          <p className="text-sm mt-2 text-muted-foreground">
            <F>I</F> = 단면 2차모멘트(단면 모양으로 결정, Chapter 6). 처짐 한계 <F>δ_max</F> 를 정하면 식을 뒤집어서 <F>필요 E·I</F> 를 알 수 있고, <F>I</F> 가 단면으로 정해지면 <F>필요 E</F> 가 나옵니다.
          </p>

          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/40 p-4 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">📐 워크드 예제 — 외팔보 처짐 한계</p>
            <p className="text-sm text-foreground/85 mb-3">
              길이 <F>L = 100 mm</F>, 단면 2차모멘트 <F>I = 1,000 mm⁴</F> 인 외팔보가 <F>F = 200 N</F> 끝하중에서 <F>δ ≤ 0.5 mm</F> 로 유지되어야 합니다.
            </p>
            <Step n={1} title="처짐 식 뒤집기" formula={<>필요 E = F·L³ / (3·I·δ_max)</>} />
            <Step n={2} title="값 대입" formula={<>= 200 × 100³ / (3 × 1000 × 0.5)</>} result={<>= 133,000 MPa = <b>133 GPa</b></>} />
            <Step n={3} title="앱에서 후보 좁히기" result={<><b>Modulus</b> 필터 하한 133 GPa.</>} note="알루미늄(~70) 탈락 · 티타늄(~115) 부족 · 강(~200)·텅스텐 통과." />
          </div>

          <Note tone="tip">
            <b>강성 직관.</b> 강성이 부족하면 보통 <b>단면을 키우는 게 재료를 바꾸는 것보다 효과적</b>입니다 (<F>I</F> 는 두께의 <b>세제곱</b>에 비례 — Chapter 6 참고). 무게·공간 제약이 빡빡할 때만 “더 단단한 재료”로 갑니다.
          </Note>

          <H3><Lightbulb className="w-4 h-4 text-amber-500"/> 5.3 그 밖의 흔한 변환 (치트시트)</H3>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">요구</th><th className="p-2 font-semibold">보는 물성 / 식</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2">반복·진동 하중</td><td className="p-2"><b>피로강도</b> ≥ 응력진폭 × SF — 정적 σy 만으로 부족</td></tr>
                <tr><td className="p-2">충격·갑작스런 하중</td><td className="p-2"><b>연신율·충격값</b> 충분 (취성 회피), 동시에 강도</td></tr>
                <tr><td className="p-2">고온 사용</td><td className="p-2"><b>최대사용온도</b> ≥ 사용온도, 그리고 <b>그 온도에서의</b> σy/UTS (상세의 “온도-강도” 곡선)</td></tr>
                <tr><td className="p-2">열변형/끼워맞춤</td><td className="p-2">열응력 <F>σ ≈ E·CTE·ΔT</F>, 치수변화 <F>ΔL = L·CTE·ΔT</F> → 작은 <b>CTE</b></td></tr>
                <tr><td className="p-2">방열</td><td className="p-2">높은 <b>열전도도 k</b> (경량 방열은 <F>k/ρ</F>)</td></tr>
                <tr><td className="p-2">부식·내후</td><td className="p-2">환경에 맞는 <b>내식성</b> 등급(정성) — 정량은 데이터시트 확인</td></tr>
              </tbody>
            </table>
          </div>

          {/* R65 B — 안전계수 사전 (산업·조건·규격별). 학생들이 가장 자주 막히는 부분. */}
          <H3>5.5 안전계수 (SF) 사전 — "얼마로 잡아야 하나"</H3>
          <p className="text-sm leading-relaxed">SF = 작용응력 대비 허용응력의 여유. 너무 낮으면 위험·인명, 너무 높으면 무겁고 비쌈. 산업·조건·규격이 SF 의 기준을 정합니다.</p>

          <H3>5.5.1 산업·용도별 일반 SF</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[24%]">산업·용도</th><th className="p-2 font-semibold w-[14%]">SF 범위</th><th className="p-2 font-semibold">근거·규격</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">항공 (구조)</td><td className="p-2 text-emerald-700 font-mono">1.5 (Ultimate) · 1.0 (Limit)</td><td className="p-2">FAR 25.303 / EASA CS-25 — 무게 critical 한 만큼 SF 낮춤. 시험 검증 필수.</td></tr>
                <tr><td className="p-2 font-medium">자동차 (구조)</td><td className="p-2 text-emerald-700 font-mono">2 ~ 3</td><td className="p-2">SAE J1100 / 일반 OEM. 충돌·피로 별도 마진.</td></tr>
                <tr><td className="p-2 font-medium">일반 기계 (정적)</td><td className="p-2 text-emerald-700 font-mono">1.5 ~ 2</td><td className="p-2">교과서 기본값. ASME B&PV Sec.II Pt.D 의 σ_allow = σy/1.5.</td></tr>
                <tr><td className="p-2 font-medium">압력 용기</td><td className="p-2 text-amber-700 font-mono">3 ~ 4 (UTS), 1.5 (σy)</td><td className="p-2">ASME B&PV Sec.VIII Div.1 — 누설·파열 인명 안전.</td></tr>
                <tr><td className="p-2 font-medium">크레인·리프팅</td><td className="p-2 text-amber-700 font-mono">5 ~ 10</td><td className="p-2">OSHA · ASME B30 — 충격 + 인명. wire rope 는 10.</td></tr>
                <tr><td className="p-2 font-medium">엘리베이터·승강기</td><td className="p-2 text-amber-700 font-mono">8 ~ 12</td><td className="p-2">EN 81 / ASME A17.1 — 인명 + 사이클 큼.</td></tr>
                <tr><td className="p-2 font-medium">의료 임플란트</td><td className="p-2 text-amber-700 font-mono">5 ~ 10 (피로)</td><td className="p-2">ISO 14801 (치아) · ISO 7206 (고관절). 10⁶ 사이클 무파손.</td></tr>
                <tr><td className="p-2 font-medium">건축 구조 강재</td><td className="p-2 text-emerald-700 font-mono">1.5 ~ 2.5</td><td className="p-2">AISC / EUROCODE 3 · KBC. LRFD load·resistance factor.</td></tr>
                <tr><td className="p-2 font-medium">시제품·실험</td><td className="p-2 text-emerald-700 font-mono">1.5</td><td className="p-2">설계 검증용. 양산 전 SF 재조정.</td></tr>
              </tbody>
            </table>
          </div>

          <H3>5.5.2 조건·하중 종류별 SF 가산 (multiplicative)</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[28%]">조건</th><th className="p-2 font-semibold">가산</th><th className="p-2 font-semibold">이유</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">반복 하중 (피로)</td><td className="p-2 font-mono">× 2 ~ 4</td><td className="p-2">σf ≈ 0.4~0.5·UTS (Shigley, 강). 노치·표면 거칠기 영향 포함.</td></tr>
                <tr><td className="p-2 font-medium">충격 하중</td><td className="p-2 font-mono">× 2 ~ 3</td><td className="p-2">동적 응력 = 정적 응력 × √(낙하높이/처짐) 의 2~3 배 가산.</td></tr>
                <tr><td className="p-2 font-medium">취성 재료 (tool steel · 세라믹)</td><td className="p-2 font-mono">× 2 ~ 5</td><td className="p-2">변형 경고 없이 파단. Weibull 분포 큰 편차.</td></tr>
                <tr><td className="p-2 font-medium">고온 (creep 영역)</td><td className="p-2 font-mono">× 1.5 ~ 3</td><td className="p-2">10⁵ h creep rupture stress 별도 적용 + 추가 SF.</td></tr>
                <tr><td className="p-2 font-medium">부식·환경 (해수·산성)</td><td className="p-2 font-mono">× 1.3 ~ 2</td><td className="p-2">두께 손실 보정 (보통 1 mm/10년).</td></tr>
                <tr><td className="p-2 font-medium">데이터 불확실성 (class·derived)</td><td className="p-2 font-mono">× 1.5 ~ 2</td><td className="p-2">측정값 아닌 추정. detail 패널의 confidence 라벨 확인.</td></tr>
                <tr><td className="p-2 font-medium">제조 변동 (cast · AM)</td><td className="p-2 font-mono">× 1.2 ~ 2</td><td className="p-2">batch 간 변동, 빌드 방향 영향.</td></tr>
              </tbody>
            </table>
          </div>

          <Note tone="tip" title="실무 SF 계산 — 예제">
            <p>자동차 부품 (일반 기계 SF=2) + 반복 하중 (×3) + 부식 (×1.3) + AM 제조 (×1.5)</p>
            <p className="mt-1 font-mono text-[13px]">→ 최종 SF = 2 × 3 × 1.3 × 1.5 ≈ <b>11.7</b></p>
            <p className="mt-1 text-muted-foreground">실제로는 각 항목 root 평균이나 max 사용 (보수성 vs 비용 trade-off). 위 값은 상한선 — 시험 결과로 점진적 조정.</p>
          </Note>

          <Note tone="warn" title="SF 가 너무 높으면">
            과한 SF = 무겁고 비싸고 가공 어려움. <b>SF 낮추는 방법</b>: ① 측정 데이터 (n=N · handbook) 사용 → 추정 SF 제거 / ② 시제품 시험으로 실제 분포 확인 / ③ 동적 / 환경 SF 는 시험으로 직접 확인. 학생 프로젝트는 SF=2 로 시작 후 점진 조정.
          </Note>

          {/* R66 B — 피로 (Basquin + Goodman) + 외부 링크 */}
          <H3>5.6 반복하중 — Basquin 식 + Goodman diagram</H3>
          <p className="text-sm leading-relaxed">정적 σy 만으로는 회전축·임펠러·스프링 같이 반복 하중 받는 부품 설계 불가. <b>S-N 곡선</b>이 사이클 수 N 에 따른 허용 응력진폭 σ_a 를 줍니다.</p>
          {/* R68 — S-N 곡선 도식 */}
          <div className="rounded-lg border border-border bg-card p-3 my-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📈 S-N 곡선 — Basquin 식 (log-log)</p>
            <svg viewBox="0 0 480 220" className="w-full h-auto">
              {/* axes */}
              <line x1="50" y1="180" x2="460" y2="180" stroke="oklch(0.4 0.04 250)" />
              <line x1="50" y1="20" x2="50" y2="180" stroke="oklch(0.4 0.04 250)" />
              {/* gridlines — R209 B-2: knee 가 10⁶ 에 오도록 축을 10²~10⁷ 로. (이전 10¹~10⁶ 에서 knee 가 10⁴ 로 그려져 본문/라벨 10⁶ 과 2 decade 어긋남) */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <g key={i}>
                  <line x1={50 + i * 80} y1="20" x2={50 + i * 80} y2="180" stroke="oklch(0.92 0.012 250)" />
                  <text className="svg-text-bg-sm" x={50 + i * 80} y="195" textAnchor="middle" fontSize="10" fill="oklch(0.5 0.04 250)">10{['²', '³', '⁴', '⁵', '⁶', '⁷'][i]}</text>
                </g>
              ))}
              {/* Steel curve (with endurance limit) — knee at x=370 (10⁶) */}
              <path d="M 50 30 L 370 110 L 460 110" fill="none" stroke="oklch(0.55 0.12 220)" strokeWidth="2.5" />
              <text className="svg-text-bg-sm" x="460" y="105" textAnchor="end" fontSize="11" fill="oklch(0.45 0.12 220)" fontWeight="bold">강·Ti (σf 한계)</text>
              {/* Al curve (no endurance limit, continues down) */}
              <path d="M 50 50 L 460 150" fill="none" stroke="oklch(0.55 0.12 30)" strokeWidth="2.5" />
              <text className="svg-text-bg-sm" x="460" y="160" textAnchor="end" fontSize="11" fill="oklch(0.45 0.12 30)" fontWeight="bold">Al (한계 없음)</text>
              {/* Endurance limit dashed line at 10⁶ */}
              <line x1="370" y1="110" x2="370" y2="180" stroke="oklch(0.55 0.12 220)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <text className="svg-text-bg-sm" x="370" y="208" textAnchor="middle" fontSize="9" fill="oklch(0.45 0.12 220)">N = 10⁶ (σf)</text>
              {/* Labels */}
              <text className="svg-text-bg-sm" x="255" y="14" textAnchor="middle" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">σ_a (응력 진폭)</text>
              <text className="svg-text-bg-sm" x="255" y="215" textAnchor="middle" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">사이클 수 N</text>
              <text className="svg-text-bg-sm" x="42" y="28" textAnchor="end" fontSize="9" fill="oklch(0.5 0.04 250)">UTS</text>
              <text className="svg-text-bg-sm" x="42" y="115" textAnchor="end" fontSize="9" fill="oklch(0.5 0.04 250)">σf</text>
              <text className="svg-text-bg-sm" x="42" y="180" textAnchor="end" fontSize="9" fill="oklch(0.5 0.04 250)">0</text>
            </svg>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">강·Ti 는 10⁶ 사이클 이후 σf 한계 — 그 아래는 무한수명. Al·Mg 는 한계 없이 계속 감소 → 사이클 수 명시 必.</p>
          </div>
          <Note tone="why" title="Basquin 식 (High-Cycle Fatigue)">
            <p className="font-mono text-[12.5px]">σ_a = σ'_f · (2N)^b</p>
            <p className="mt-1 text-[12px] leading-relaxed">σ'_f = 피로 강도계수 (≈ σf at 1 cycle) · b = Basquin 지수 (보통 -0.05 ~ -0.12). 강·Ti 는 N=10⁶ 부근 무한수명 한계 (σf), Al 은 한계 없음 — Basquin 식이 끝까지 적용.</p>
          </Note>
          {/* R68 — Goodman diagram */}
          <div className="rounded-lg border border-border bg-card p-3 my-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📐 Goodman diagram — 평균응력 영향</p>
            {/* R189 — Goodman diagram label 겹침 fix:
             *   - Soderberg label y=138 (설계점 y=139 겹침) → y=80 (line 상부 위쪽 안전 영역)
             *   - Goodman label x=290 y=108 그대로 (line 위쪽, OK)
             *   - Gerber label x=300 y=170 → x=320 y=160 (오른쪽 약간, Goodman 과 거리 확보)
             *   - 설계점 (170, 135) + label y=139 그대로 (Soderberg 이동 후 충분 공간)
             *   - "✓ 안전 영역" x=120 → x=80 y=170 → y=160 (좌하단 더 명확)
             *   - "✗ 파단" x=250 → x=320 y=50 (Goodman label 의 위쪽) */}
            <svg viewBox="0 0 420 220" className="w-full h-auto">
              {/* axes */}
              <line x1="50" y1="180" x2="380" y2="180" stroke="oklch(0.4 0.04 250)" />
              <line x1="50" y1="20" x2="50" y2="180" stroke="oklch(0.4 0.04 250)" />
              {/* Goodman (linear) */}
              <line x1="50" y1="40" x2="370" y2="180" stroke="oklch(0.55 0.12 220)" strokeWidth="2" />
              <text className="svg-text-bg-sm" x="270" y="100" fontSize="11" fill="oklch(0.45 0.12 220)" fontWeight="bold">Goodman (σ_u)</text>
              {/* Soderberg */}
              <line x1="50" y1="40" x2="290" y2="180" stroke="oklch(0.55 0.12 110)" strokeWidth="2" />
              <text className="svg-text-bg-sm" x="120" y="78" fontSize="10" fill="oklch(0.45 0.12 110)" fontWeight="bold">Soderberg (σ_y)</text>
              {/* Gerber parabolic */}
              <path d="M 50 40 Q 220 90 370 180" fill="none" stroke="oklch(0.55 0.12 30)" strokeWidth="2" strokeDasharray="4 3" />
              <text className="svg-text-bg-sm" x="320" y="155" fontSize="10" fill="oklch(0.45 0.12 30)" fontWeight="bold">Gerber (실험)</text>
              {/* Design point examples */}
              <circle cx="170" cy="135" r="5" fill="oklch(0.5 0.18 30)" />
              <text className="svg-text-bg-sm" x="178" y="139" fontSize="10" fill="oklch(0.4 0.18 30)" fontWeight="bold">설계점 (안전)</text>
              {/* Safe / unsafe zones */}
              <text className="svg-text-bg-sm" x="75" y="160" fontSize="10" fill="oklch(0.45 0.15 145)" fontWeight="bold">✓ 안전 영역</text>
              <text className="svg-text-bg-sm" x="330" y="48" fontSize="10" fill="oklch(0.45 0.18 30)" fontWeight="bold">✗ 파단</text>
              {/* Labels */}
              <text className="svg-text-bg-sm" x="42" y="44" textAnchor="end" fontSize="11" fill="oklch(0.4 0.04 250)">σ_f</text>
              <text className="svg-text-bg-sm" x="42" y="184" textAnchor="end" fontSize="11" fill="oklch(0.4 0.04 250)">0</text>
              <text className="svg-text-bg-sm" x="290" y="195" textAnchor="middle" fontSize="11" fill="oklch(0.4 0.04 250)">σ_y</text>
              <text className="svg-text-bg-sm" x="370" y="195" textAnchor="middle" fontSize="11" fill="oklch(0.4 0.04 250)">σ_u</text>
              <text className="svg-text-bg-sm" x="42" y="14" textAnchor="end" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">σ_a</text>
              <text className="svg-text-bg-sm" x="380" y="215" textAnchor="end" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">σ_m  (평균응력)</text>
            </svg>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">설계점 (σ_m, σ_a) 이 직선 아래면 안전. Goodman 가장 일반적, Soderberg 보수적, Gerber 실험 데이터 적합. Compare 패널의 <a href="/" className="text-accent hover:underline">Goodman view</a> 에서 alloy 별 SF 계산 가능.</p>
          </div>
          <Note tone="why" title="Goodman / Soderberg / Gerber — 평균응력 보정">
            <p className="leading-relaxed">실제 부품은 평균응력 σ_m ≠ 0 인 경우가 많음 (예: 베어링 안 회전축). 평균응력은 피로 한계를 낮춤.</p>
            <p className="mt-1 font-mono text-[12.5px]">Goodman: σ_a/σ_f + σ_m/σ_u = 1/SF</p>
            <p className="mt-1 font-mono text-[12.5px]">Soderberg: σ_a/σ_f + σ_m/σ_y = 1/SF (보수적, σy 기준)</p>
            <p className="mt-1 font-mono text-[12.5px]">Gerber: σ_a/σ_f + (σ_m/σ_u)² = 1/SF (실험 데이터 적합)</p>
            <p className="mt-2 text-[12px] text-muted-foreground">설계에서는 Goodman (most common) 또는 Soderberg (보수적). 인장 평균응력 위험, 압축 평균응력은 비교적 안전.</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — 응력·피로·SF">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/Stress%E2%80%93strain_curve">Wikipedia: Stress-strain curve</ExtLink> — σy · UTS · 연신율 그래프 설명</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Factor_of_safety">Wikipedia: Factor of safety</ExtLink> — 산업·규격별 SF 정리</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Fatigue_(material)">Wikipedia: Fatigue (material)</ExtLink> — Basquin · S-N · Goodman 등</li>
              <li><ExtLink href="https://www.engineeringtoolbox.com/factors-safety-fos-d_1624.html">Engineering Toolbox: Factors of Safety</ExtLink> — 빠른 참조</li>
              <li><ExtLink href="https://www.doitpoms.ac.uk/tlplib/index.php">DoITPoMS: Fatigue</ExtLink> — interactive 학습</li>
              <li><ExtLink href="https://ocw.mit.edu/courses/3-11-mechanics-of-materials-fall-1999/">MIT OCW 3.11 Mechanics of Materials</ExtLink> — 응력·변형률·피로 강의</li>
            </ul>
          </Note>
  </>);
}
