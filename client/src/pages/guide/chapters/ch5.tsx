/*
 * Guide ch5 본문 — Guide.tsx 에서 분리 (F1).
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
import { F, Note, ExtLink, H3 } from '../components';
import { SvgColumn, SvgTorsion, SvgMohr, SvgPressureVessel } from '../svgs';

export default function ch5Body() {
  return (<>
          <H3>8.1 비틀림 (원형축)</H3>
          <p className="leading-relaxed">토크 <F>T</F> 가 원형 축에 작용할 때 전단응력은 표면(<F>c = D/2</F>)에서 최대입니다.</p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[220px]"><SvgTorsion /></div>
          <ul className="list-disc pl-6 mt-1 space-y-1 text-sm leading-relaxed">
            <li>최대 전단응력: <F>τ_max = T·c / J</F> &nbsp;(원형축은 <F>J = π·D⁴/32</F>)</li>
            <li>비틀림각: <F>φ = T·L / (G·J)</F> &nbsp;(<F>G = E / [2(1+ν)]</F>, 금속은 <F>G ≈ 0.38·E</F>)</li>
            <li>허용 전단응력: 보통 <F>τ_allow ≈ 0.5~0.6 · σy / SF</F></li>
          </ul>
          <Note tone="warn">
            비원형 단면의 <F>J</F> 는 간단한 닫힌식이 없습니다. 직사각형은 <F>J ≈ β · b · h³</F> (β는 h/b에 의존). 개단면(I·L·채널)은 비틀림에 매우 약하므로 비틀림 부품엔 권장하지 않습니다.
          </Note>

          <H3>8.2 좌굴 (Euler 식) — 가는 기둥의 함정</H3>
          <div className="flex items-start gap-4 mt-2">
            <div className="w-48 h-40 bg-muted/30 rounded border border-border/60 flex items-center justify-center p-2 flex-shrink-0"><SvgColumn /></div>
            <div className="text-sm leading-relaxed">
              <p>가늘고 긴 기둥은 σy 를 넘기 <b>전에</b> 옆으로 휘어 무너집니다 (좌굴). 임계하중:</p>
              <p className="font-mono text-[13px] mt-1 bg-muted/40 inline-block px-2 py-1 rounded">P_cr = π² · E · I / L_eff²</p>
              <p className="mt-2"><b>유효길이</b> <F>L_eff = K·L</F> — 단부 조건에 따라:</p>
              <ul className="list-disc pl-5 text-[13px] mt-1">
                <li>핀-핀 (양단 자유 회전): <F>K = 1.0</F></li>
                <li>고정-자유 (외팔): <F>K = 2.0</F></li>
                <li>고정-핀: <F>K ≈ 0.7</F></li>
                <li>고정-고정: <F>K = 0.5</F></li>
              </ul>
            </div>
          </div>
          <Note tone="tip">강도(σy) 와 좌굴 둘 다 점검: <b>가는 부재는 좌굴이 먼저</b>, 굵은 부재는 강도가 먼저.</Note>

          <H3>8.3 복합 응력 (von Mises)</H3>
          <p className="text-sm leading-relaxed">굽힘과 비틀림이 동시에 작용하는 회전축처럼, 축응력 <F>σ_x</F> 와 전단응력 <F>τ</F> 가 같이 있을 때는 등가응력을 σy 와 비교합니다.</p>
          <p className="font-mono text-sm mt-1 bg-muted/40 inline-block px-2 py-1 rounded">σ_eq = √(σ_x² + 3·τ²) ≤ σy / SF</p>
          <p className="text-[12px] mt-1 text-muted-foreground">일반 3축 응력: <F>σ_eq = √[½((σ₁−σ₂)² + (σ₂−σ₃)² + (σ₃−σ₁)²)]</F></p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[240px]"><SvgMohr /></div>
          <p className="text-[12px] text-muted-foreground">응력 요소(좌)의 σ_x·τ 가 작용할 때, 면의 회전에 따른 응력 변화를 <b>Mohr 원</b>(우)으로 시각화합니다. 원의 양 끝이 <b>주응력 σ₁, σ₂</b> 이고 정점이 <b>최대 전단 τ_max</b>.</p>

          <H3>8.4 얇은 압력 용기</H3>
          <p className="text-sm leading-relaxed">반경 <F>r</F>, 두께 <F>t</F>, 내압 <F>p</F> (<F>t ≪ r</F>):</p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[220px]"><SvgPressureVessel /></div>
          <ul className="list-disc pl-6 mt-1 text-sm font-mono">
            <li>원주(후프) σ_h = p·r / t &nbsp;<span className="font-sans text-muted-foreground">— 후프 응력이 축응력의 2배</span></li>
            <li>축방향 σ_a = p·r / (2t)</li>
            <li>구형 용기 σ = p·r / (2t)</li>
          </ul>
          <p className="text-sm mt-1 text-muted-foreground">필요 두께 <F>t ≥ p·r·SF / σy</F>. 코드(ASME 등)를 따르세요. <span className="text-foreground/80">압력 용기에 보통 세로로 갈라지는 이유는 후프 응력이 2배라서</span>.</p>

          {/* R66 B — 좌굴 Johnson formula + 외부 링크 */}
          <Note tone="why" title="Euler 좌굴 vs Johnson 공식 — 짧은 기둥">
            <p className="leading-relaxed">Euler 공식은 <b>가는 기둥 (slender ratio L/k &gt; 100)</b> 만 정확. 짧은 기둥은 σy 에 먼저 도달 → Johnson 공식 사용.</p>
            <p className="mt-1 font-mono text-[12.5px]">P_cr (Johnson) = σy · [1 − σy·(L/k)² / (4π²·E)] · A</p>
            <p className="mt-1 text-[12px]">k = √(I/A) = 회전 반경. (L/k) 가 임계값 = √(2π²·E/σy) 보다 작으면 Johnson, 크면 Euler. 강은 L/k ≈ 100, Al 은 ≈ 70.</p>
          </Note>
          <Note tone="why" title="Stress concentration factor Kt — 노치·구멍">
            <p className="leading-relaxed">실제 단면에 노치·구멍이 있으면 응력 σ_max = K_t · σ_nom.</p>
            <p className="mt-1 font-mono text-[12.5px]">K_t (구멍, 무한판) = 3 (실험·이론 일치) · K_t (fillet radius r/h=0.1) ≈ 2.5 · K_t (sharp corner) → ∞</p>
            <p className="mt-1 text-[12px]">피로 노치 인자 K_f = 1 + q·(K_t − 1) — q는 재료 민감도 (강 ≈ 0.9, Al ≈ 0.6, cast iron ≈ 0).</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — 비틀림·좌굴·파괴·압력">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/Torsion_(mechanics)">Wikipedia: Torsion</ExtLink> — TL/GJ 와 비틀림 응력</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Buckling">Wikipedia: Buckling</ExtLink> — Euler · Johnson formulas + K factor</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Von_Mises_yield_criterion">Wikipedia: von Mises yield criterion</ExtLink></li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Mohr%27s_circle">Wikipedia: Mohr's circle</ExtLink></li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Stress_concentration">Wikipedia: Stress concentration</ExtLink> — Kt · Kf 표</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Pressure_vessel">Wikipedia: Pressure vessel</ExtLink> — ASME B&PV 코드 개요</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Fracture_mechanics">Wikipedia: Fracture mechanics</ExtLink> — KIC, K = σ·√(π·a)</li>
              <li><ExtLink href="https://www.doitpoms.ac.uk/tlplib/index.php">DoITPoMS: Mechanical testing</ExtLink> — interactive 시험 시뮬레이션</li>
            </ul>
          </Note>
  </>);
}
