/*
 * Guide ch4 본문 — Guide.tsx 에서 분리 (F1).
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
import { F, Note, ExtLink, Step, LoadCard } from '../components';
import { SvgCantileverV2, SvgCantileverUDLV2, SvgSimpleCenterV2, SvgSimpleUDLV2, SvgFixedCenterV2, SvgFixedUDLV2 } from '../svgs';

export default function ch4Body() {
  return (<>
          <p className="leading-relaxed">
            처짐 식은 모두 <F>δ = (계수) · F·L³ / (E·I)</F> 또는 <F>(계수) · w·L⁴ / (E·I)</F> 형태입니다. <b>계수만 외우면 됩니다</b>. 모멘트도 마찬가지 — <F>M_max</F> 에서 <F>σ_b = M/Z</F>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <LoadCard
              svg={<SvgCantileverV2 />}
              name="외팔보 · 끝단 집중하중"
              deflection="F·L³ / (3·E·I)"
              moment="F·L (근원에서 최대)"
              common="브래킷, 진단봉, 다이빙 보드, 사무용 책상 모서리."
              hint="처짐 계수가 1/3 — 모든 케이스 중 가장 크게 휨"
            />
            <LoadCard
              svg={<SvgCantileverUDLV2 />}
              name="외팔보 · 등분포하중 w"
              deflection="w·L⁴ / (8·E·I)"
              moment="w·L² / 2"
              common="천장에서 자중 받는 캔틸레버, 비행기 날개(근사)."
            />
            <LoadCard
              svg={<SvgSimpleCenterV2 />}
              name="단순지지 · 중앙 집중하중"
              deflection="F·L³ / (48·E·I)"
              moment="F·L / 4"
              common="가장 흔한 시험·교과서 케이스. 두 지점 올려놓은 막대 위 한 점."
            />
            <LoadCard
              svg={<SvgSimpleUDLV2 />}
              name="단순지지 · 등분포하중 w"
              deflection="5·w·L⁴ / (384·E·I)"
              moment="w·L² / 8"
              common="자기 무게로 휘는 보, 균등 하중 책장 선반."
            />
            <LoadCard
              svg={<SvgFixedCenterV2 />}
              name="양단 고정 · 중앙 집중하중"
              deflection="F·L³ / (192·E·I)"
              moment="F·L / 8 (단부 최대)"
              common="용접·볼팅으로 양 끝이 회전 못 하는 강판 보."
              hint="처짐이 단순지지의 1/4 — 고정조건이 매우 강력"
            />
            <LoadCard
              svg={<SvgFixedUDLV2 />}
              name="양단 고정 · 등분포하중 w"
              deflection="w·L⁴ / (384·E·I)"
              moment="w·L² / 12 (단부)"
              common="강구조 빔, 슬라브, 자동차 차체 보강재."
            />
          </div>

          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/40 p-4 my-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">📐 워크드 예제 — 외팔보 + 관 단면</p>
            <p className="text-sm mb-3 text-foreground/85">
              길이 <F>L = 200 mm</F> 외팔보, 끝 하중 <F>F = 500 N</F>, 처짐 한계 <F>δ ≤ 1 mm</F>. 단면은 <b>관</b>(외경 20·내경 16 mm)으로 시작합니다.
            </p>
            <Step n={1} title="단면의 I 계산 (Ch.3)" formula={<>I = π(20⁴ − 16⁴) / 64</>} result={<>≈ <b>4,633 mm⁴</b></>} />
            <Step n={2} title="필요 E·I 계산" formula={<>E·I = F·L³ / (3·δ) = 500 × 200³ / (3 × 1)</>} result={<>= <b>1.333 × 10⁹ N·mm²</b></>} />
            <Step n={3} title="필요 E" formula={<>E = 1.333×10⁹ / 4633</>} result={<>≈ <b>288 GPa</b> — 일반 금속(E ≤ 210)으론 안 됨!</>} />
            <Step n={4} title="단면 키워서 재시도" formula={<>외경 24·내경 20 → I ≈ 8,454 mm⁴</>} result={<>필요 E ≈ <b>158 GPa</b> — 강·티타늄·구리합금 후보</>} note="형상으로 푸는 게 첫 번째 선택" />
            <Step n={5} title="강도 점검 (σ_b = M/Z)" formula={<>M_max = F·L = 10⁵ N·mm, Z ≈ 704 mm³</>} result={<>σ_b ≈ 142 MPa · SF=2 → 필요 σy ≥ <b>284 MPa</b></>} />
            <Step n={6} title="앱에서 후보 보기" result={<><b>Modulus ≥ 158</b>, <b>Yield ≥ 284</b> 두 필터로 산점도 + Compare.</>} />
          </div>

          {/* R66 B — Euler-Bernoulli 유도 + 외부 링크 */}
          <Note tone="why" title="Euler-Bernoulli 보 방정식">
            <p className="leading-relaxed">보 처짐 식 (예: 외팔 F·L³/3EI) 의 유도는 4차 미분방정식에서 나옵니다.</p>
            <p className="mt-1 font-mono text-[13px]">EI · (d⁴y/dx⁴) = w(x)</p>
            <p className="mt-1 text-[12px] leading-relaxed">w(x) = 단위 길이당 분포하중. 경계 조건 (외팔: y(0)=0, y'(0)=0, M(L)=0, V(L)=F) 적분 → 처짐 y(L) 와 모멘트 M(x). 표의 공식들이 모두 이 적분 결과.</p>
            <p className="mt-2 text-[12px] text-muted-foreground">가정: (i) 단면 평면이 굽힘 후에도 평면 유지 · (ii) 굽힘 변형 작음 (y'(x)² ≪ 1) · (iii) 전단 변형 무시. 이 가정 깨지면 (단단보·두꺼운 보) Timoshenko 이론 필요.</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — 보·처짐">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/Euler%E2%80%93Bernoulli_beam_theory">Wikipedia: Euler-Bernoulli beam theory</ExtLink> — 4차 미분방정식 + 경계 조건</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Beam_(structure)">Wikipedia: Beam (structure)</ExtLink> — 모든 표준 하중·지지조건의 처짐·모멘트 표</li>
              <li><ExtLink href="https://www.engineeringtoolbox.com/cantilever-beams-d_1848.html">Engineering Toolbox: Cantilever Beams</ExtLink> — 빠른 참조</li>
              <li><ExtLink href="https://ocw.mit.edu/search/?d=Mechanical%20Engineering&t=Solid%20Mechanics">MIT OCW 2.001 Mechanics & Materials I</ExtLink> — 보·처짐 강의</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Stress_concentration">Wikipedia: Stress concentration</ExtLink> — Kt 정의 + 대표 형상 (hole · fillet · notch) 값표</li>
            </ul>
          </Note>
  </>);
}
