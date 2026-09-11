/*
 * Guide ch3 본문 — Guide.tsx 에서 분리 (F1).
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
import { F, Note, ExtLink, Term, Chapter, ShapeCard } from '../components';
import { SvgRect, SvgSquare, SvgCircle, SvgBox, SvgTube, SvgIBeam, SvgBendingStress } from '../svgs';

export default function ch3Body() {
  return (<>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Term word="A">단면적 — 인장응력 <F>σ = F/A</F></Term>
            <Term word="I">단면 2차모멘트 — 굽힘 변형·응력의 단면 인자, 중립축 기준</Term>
            <Term word="Z = I/c">단면계수 — 굽힘응력 <F>σ_b = M / Z</F>, <F>c</F>는 중립축에서 가장 먼 거리</Term>
            <Term word="J">극관성모멘트 — 비틀림 <F>τ = T·r / J</F>, 원형 단면만 단순한 닫힌식</Term>
          </div>

          <Note tone="why" title="왜 I빔·박스·관이 효율적인가?">
            <F>I</F>는 “재료를 중립축에서 얼마나 멀리 두었는가”에 매우 민감합니다 (거리의 제곱·세제곱으로 들어감). 그래서 같은 단면적이면 <b>속을 비우고 멀리</b> 배치한 박스·관·I빔이 굽힘에 압도적으로 유리합니다. 건물 보·자전거 프레임·골프 채가 그렇죠.
          </Note>

          {/* 핵심 도식: 굽힘 응력 분포 + 중립축 */}
          <div className="rounded-lg border border-border bg-card p-3 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📊 핵심 그림 — 굽힘 응력 분포와 중립축</p>
            <div className="h-[240px]"><SvgBendingStress /></div>
            <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
              보가 굽혀지면 <span className="text-rose-500 font-bold">위는 압축</span>, <span className="text-sky-500 font-bold">아래는 인장</span>이 됩니다. 중간 어딘가는 응력이 0(<b>중립축</b>). 응력은 중립축에서 거리(<F>c</F>)에 비례해 선형 증가 → 같은 모멘트 <F>M</F>이어도 <F>I</F>가 크면 σ가 작아집니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <ShapeCard
              svg={<SvgRect />}
              name="직사각형"
              dims="b × h (h 가 굽힘 방향)"
              formulas={[
                { label: 'A', expr: 'b · h' },
                { label: 'I', expr: 'b · h³ / 12' },
                { label: 'Z', expr: 'b · h² / 6' },
              ]}
              usedFor="목재 보·간단한 막대·기계 가공 부품의 기본 단면."
            />
            <ShapeCard
              svg={<SvgSquare />}
              name="정사각형"
              dims="a × a"
              formulas={[
                { label: 'A', expr: 'a²' },
                { label: 'I', expr: 'a⁴ / 12' },
                { label: 'Z', expr: 'a³ / 6' },
                { label: 'J', expr: '≈ 0.141 · a⁴' },
              ]}
              usedFor="기계 부품의 일반 단면. 비틀림은 원형보다 약함."
            />
            <ShapeCard
              svg={<SvgCircle />}
              name="원형 (꽉찬)"
              dims="지름 d"
              formulas={[
                { label: 'A', expr: 'π · d² / 4' },
                { label: 'I', expr: 'π · d⁴ / 64' },
                { label: 'Z', expr: 'π · d³ / 32' },
                { label: 'J', expr: 'π · d⁴ / 32' },
              ]}
              usedFor="축·핀·볼트. 비틀림에 자연스럽고 가공 쉬움."
            />
            <ShapeCard
              svg={<SvgBox />}
              name="박스 (중공 직사각)"
              dims="B,H 외부 / b,h 내부"
              formulas={[
                { label: 'A', expr: 'B·H − b·h' },
                { label: 'I', expr: '(B·H³ − b·h³) / 12' },
                { label: 'Z', expr: '2 · I / H' },
              ]}
              usedFor="차체 프레임·로봇 팔. 굽힘/비틀림 둘 다 좋음."
            />
            <ShapeCard
              svg={<SvgTube />}
              name="원형 관 (튜브)"
              dims="외경 D / 내경 d"
              formulas={[
                { label: 'A', expr: 'π(D² − d²) / 4' },
                { label: 'I', expr: 'π(D⁴ − d⁴) / 64' },
                { label: 'Z', expr: 'π(D⁴ − d⁴) / (32·D)' },
                { label: 'J', expr: 'π(D⁴ − d⁴) / 32' },
              ]}
              usedFor="자전거 프레임·드론 암·송유관. 굽힘·비틀림에 압도적."
            />
            <ShapeCard
              svg={<SvgIBeam />}
              name="I-빔 (H-빔)"
              dims="플랜지 b_f·t_f / 웹 h_w·t_w"
              formulas={[
                { label: 'A', expr: '2·b_f·t_f + h_w·t_w' },
                { label: 'I', expr: '플랜지+웹 합산 (parallel-axis)' },
                { label: 'Z', expr: 'I / (h/2)' },
              ]}
              usedFor="건축·교량 보. 한 방향 굽힘에 최적, 비틀림은 약함."
            />
          </div>

          <Note tone="tip">
            <b>설계 흐름.</b> ① 부품의 '<b>주된 하중</b>'(인장? 굽힘? 비틀림?)을 정한다 → ② 그에 맞는 <b>단면 모양</b>을 고른다 → ③ Chapter 7의 처짐 식으로 필요 E·I 산출 → ④ 단면이 정해지면 <F>I</F> 가 나오므로 <b>필요 E</b> 가 결정 → ⑤ 강도는 <F>σ_b = M / Z ≤ σy / SF</F> 로 점검.
          </Note>

          {/* R66 B — 단면 모멘트 I 의 유도 + 외부 링크 */}
          <Note tone="why" title="2차 모멘트 I 의 적분 정의">
            <p className="font-mono text-[13px]">I = ∫_A y² dA</p>
            <p className="mt-1 text-[12px] leading-relaxed">중립축 (보통 도심) 에서 y 만큼 떨어진 미소 면적 dA 의 거리 제곱 곱셈 합. 거리 제곱 → <b>축에서 멀수록 휘는 데 저항 ↑</b>. 그래서 I-beam · 박스가 무게 대비 가장 효율적.</p>
            <p className="mt-1 text-[12px]">사각형 (b×h): I = b·h³/12 · 원: I = π·d⁴/64 · 박스 (B×H 외, b×h 내): I = (B·H³ − b·h³)/12.</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — 단면·굽힘">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/Second_moment_of_area">Wikipedia: Second moment of area</ExtLink> — 모든 표준 단면의 I 공식</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Section_modulus">Wikipedia: Section modulus</ExtLink> — Z = I/c</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Bending">Wikipedia: Bending</ExtLink> — Euler-Bernoulli beam theory</li>
              <li><ExtLink href="https://www.engineeringtoolbox.com/area-moment-inertia-d_1328.html">Engineering Toolbox: Area Moment of Inertia</ExtLink></li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Fatigue_(material)">Wikipedia: Fatigue (material)</ExtLink> — S-N curve · Goodman diagram · Miner's rule overview</li>
            </ul>
          </Note>
  </>);
}
