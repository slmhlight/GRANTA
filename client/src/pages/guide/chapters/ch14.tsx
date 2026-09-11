/*
 * Guide ch14 본문 — Guide.tsx 에서 분리 (F1).
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
import { Note } from '../components';

export default function ch14Body() {
  return (<>
          <p className="leading-relaxed">교과서·앱의 추상적 이론을 구체화하는 데 가장 좋은 방법은 실제 산업 사례 분석. 5 개의 대표 사례.</p>

          <div className="space-y-4 mt-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">① 자동차 — F1 엔진 블록 재료 변천사</p>
              <p className="text-sm leading-relaxed"><b className="text-foreground">변천:</b> Cast iron (1950s) → AISI 4340 alloy steel (1970s) → A356-T6 cast aluminum (1990s) → Honeycomb composite + AA 7075 (2010s).</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인:</b> 출력/무게 (engine specific power) = 200 → 1500 hp/L. 시린더 압력 = 100 → 240 bar. 회전수 = 6,000 → 18,000 rpm. 매번 더 가벼우면서도 더 강하고 더 thermally stable 한 재료가 필요.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">앱에서 재현:</b> 사례 "구조 브래킷" + Index = E^½/ρ + Yield ≥ 400 + Process = LPBF → Al 7075 · Ti-6Al-4V · Scalmalloy 후보.</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">② 우주 — JWST 망원경 mirror</p>
              <p className="text-sm leading-relaxed"><b className="text-foreground">선택:</b> Beryllium (구조) + Au coating (반사) + Si 광학 sensor support.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인:</b> 극저온 (-220 °C) 치수 안정 — Be 의 핵심은 <b>높은 비강성(E/ρ ≈ 강의 6배)</b> + 극저온에서 안정적·균일한 CTE + 높은 열전도(빠른 열평형). (CTE 절대값 자체는 ~11 µm/m·K 로 강과 비슷 — 작은 게 강점은 아님). mirror 1.32 m 가 6.5 m 까지 가능. 단점: 발암성 분말, 가공 어려움, 비용 $$$ (kg 당 $100k+). 다른 선택지 (Zerodur glass, ULE) 는 우주 환경 thermal cycling 에서 취성.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">앱에서 재현:</b> 사례 "정밀 마운트" + Modulus ≥ 280 GPa + 낮은 밀도(비강성 E/ρ) → Be 후보 (단, 안전성·비용으로 Invar / CFRP 가 일반적).</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">③ 로켓 — SpaceX Raptor engine 연소실</p>
              <p className="text-sm leading-relaxed"><b className="text-foreground">선택:</b> Inconel 718 (외벽) + <b>GRCop-42 (NASA Cu-Cr-Nb AM 합금)</b> (regenerative cooling 채널) + Cu coating.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인:</b> 챔버 압력 = 300 bar, 온도 3500 °C (가스), 벽면 600 °C (cooling 으로). 열전도도 (Cu) + 강도 (Inconel) 의 trade-off → 2 재료 동시 사용. GRCop-42 는 Cu 기지의 높은 열전도 (k ≈ 280 W/m·K) 에 Cr₂Nb 분산강화를 더해, 순동이 물러지는 500~800 °C 에서도 강도·크리프를 유지한다 — AM(LPBF) 으로 cooling 채널을 직접 빌드. (NASA 가 로켓 연소실용으로 개발한 Cu-Cr-Nb 계열이며, SpaceX Raptor 급 엔진의 자체 Cu 합금도 같은 원리다.)</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">앱에서 재현:</b> Inconel 617/625 (사례 "고온 부품") + Cu (사례 "전기 전도체") 비교. AM 후처리는 <a href="#ch9" className="text-accent hover:underline">Ch.10</a> 참고.</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">④ 자동차 — Tesla Model Y giga press</p>
              <p className="text-sm leading-relaxed"><b className="text-foreground">선택:</b> 자체 개발 Al 합금 (Si 7% + Mg 0.4%, A356 변형). 6,000 ton casting press 로 후방 body 단일 부품 (70 → 1 부품).</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인:</b> 70 개 부품 용접 → 1 개 die cast 로 무게 -10%, 비용 -40%, 조립시간 -90%. 단점: cast Al 의 σy ~150 MPa (낮음) → 두께로 보상. 단일 부품 → 수리 불가 (보험·정비 비용 ↑).</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">앱에서 재현:</b> 사례 "저원가 양산" + Al 합금 + Process = Cast → A356 · AlSi10Mg 후보.</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">⑤ 의료 — DJI 드론 arm + 인공 관절</p>
              <p className="text-sm leading-relaxed"><b className="text-foreground">드론 arm 선택:</b> Carbon fiber + 7075-T6 Al hub. <b>인공 고관절 선택:</b> Ti-6Al-4V ELI (stem) + CoCrMo (ball) + UHMWPE (cup).</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인 (드론):</b> 무게 / 강성 / 가격 — CFRP 가 best E/ρ 지만 가공·연결 어려움 → Al hub 로 보강. 무게 200g 차이가 비행시간 5분 결정.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인 (관절):</b> 생체적합 + 피로 (10⁹ cycles) + 마모 (10⁻⁸ mm³/N·m). Ti 는 σy/ρ best 지만 적층 표면 마모 ↑ → CoCr ball + UHMWPE cup 의 마찰 대응. 평생 (20–30 년) 무파손이 목표.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">앱에서 재현:</b> 사례 "의료 임플란트" + Index = σf/ρ + Compare 의 Radar 로 ρ·σy·피로·내식 비교.</p>
            </div>
          </div>

          <Note tone="tip" title="사례 학습의 정리">
            <p>실제 선택은 <b>한 합금이 모든 요구를 만족</b>하기보다 <b>여러 합금을 조합</b> (Raptor · 인공관절) 하거나 <b>가공·후처리로 보강</b> (giga press) 하는 경우가 많습니다. 앱의 Compare 패널이 trade-off 시각화에 가장 유용 — 1순위 후보 1개가 아니라 1–3 위 후보 + 보완 재료까지 함께 검토.</p>
          </Note>
  </>);
}
