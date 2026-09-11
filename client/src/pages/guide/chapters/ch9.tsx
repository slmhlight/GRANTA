/*
 * Guide ch9 본문 — Guide.tsx 에서 분리 (F1).
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
import { Note, ExtLink, H3 } from '../components';
import { SvgAMAnisotropy, SvgHIPEffect } from '../svgs';

export default function ch9Body() {
  return (<>
          <p className="leading-relaxed">전통 단조·압연재는 microstructure 가 균질하고 데이터 신뢰도가 높지만, AM 합금은 <b>빌드 방향·분말·후처리</b> 3 변수로 인해 같은 alloy 라도 결과가 크게 다릅니다. 이 챕터는 AM 합금을 선택·검증할 때 반드시 체크할 사항을 정리합니다.</p>

          <H3>10.1 빌드 방향 이방성 (XY vs Z)</H3>
          <p className="text-sm leading-relaxed">LPBF·EBM 부품은 적층 방향 (보통 Z, "build direction") 과 적층면 (XY) 사이에 미세조직 차이가 큽니다. 일반적으로:</p>
          {/* R68 — AM 빌드 방향 이방성 도식 */}
          <div className="rounded-lg border border-border bg-card p-3 my-3">
            <svg viewBox="0 0 480 220" className="w-full h-auto">
              {/* Build plate */}
              <rect x="20" y="170" width="200" height="10" fill="oklch(0.6 0.04 250)" />
              <text className="svg-text-bg-sm" x="120" y="200" textAnchor="middle" fontSize="10" fill="oklch(0.4 0.04 250)">빌드 플레이트</text>
              {/* Layers stacked */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <rect key={i} x="80" y={150 - i * 16} width="80" height="14" fill={i % 2 === 0 ? 'oklch(0.85 0.05 90)' : 'oklch(0.82 0.05 90)'} stroke="oklch(0.5 0.05 90)" strokeWidth="0.5" />
              ))}
              {/* Z arrow */}
              <line x1="170" y1="155" x2="170" y2="25" stroke="oklch(0.55 0.18 30)" strokeWidth="2" markerEnd="url(#amArrZ)" />
              <text className="svg-text-bg-sm" x="178" y="100" fontSize="11" fill="oklch(0.4 0.18 30)" fontWeight="bold">Z (빌드 방향)</text>
              <text className="svg-text-bg-sm" x="178" y="115" fontSize="9" fill="oklch(0.4 0.18 30)" fontStyle="italic">σy ↓5-15% · σf ↓30-70%</text>
              {/* XY arrow */}
              <line x1="60" y1="80" x2="80" y2="80" stroke="oklch(0.55 0.12 220)" strokeWidth="2" markerEnd="url(#amArrXY)" />
              <text className="svg-text-bg-sm" x="30" y="78" fontSize="11" fill="oklch(0.4 0.12 220)" fontWeight="bold">XY</text>
              <text className="svg-text-bg-sm" x="20" y="92" fontSize="9" fill="oklch(0.4 0.12 220)">(적층면, 우수)</text>
              {/* Microstructure: column grains right side */}
              <g stroke="oklch(0.3 0.04 250)" strokeWidth="0.7" fill="none">
                <rect x="280" y="40" width="160" height="140" fill="oklch(0.95 0.005 250)" stroke="oklch(0.5 0.04 250)" />
                {[0, 1, 2, 3, 4].map((i) => (
                  <line key={i} x1={290 + i * 30} y1="45" x2={290 + i * 30} y2="175" />
                ))}
                {/* Horizontal layer interfaces */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line key={i} x1="285" y1={60 + i * 25} x2="435" y2={60 + i * 25} strokeDasharray="2 2" opacity="0.5" />
                ))}
              </g>
              <text className="svg-text-bg-sm" x="360" y="32" textAnchor="middle" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">미세조직 (단면)</text>
              <text className="svg-text-bg-sm" x="360" y="200" textAnchor="middle" fontSize="9" fill="oklch(0.5 0.04 250)">column grain ⇂ + 층 경계 ━</text>
              <defs>
                <marker id="amArrZ" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.18 30)" /></marker>
                <marker id="amArrXY" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.12 220)" /></marker>
              </defs>
              <text className="svg-text-bg-sm" x="240" y="15" textAnchor="middle" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">AM 빌드 방향 이방성</text>
            </svg>
          </div>
          <ul className="list-disc pl-6 mt-1 text-sm leading-relaxed">
            <li><b>인장강도 (σy·UTS)</b>: Z 방향이 XY 보다 5~15% 낮음 (column grain 경계가 응력과 수직)</li>
            <li><b>연신율 El.</b>: Z 방향이 XY 의 50~80% (취성 ↑)</li>
            <li><b>피로 강도 σf</b>: Z 방향이 XY 의 30~70%, surface roughness + Z-pore 영향</li>
            <li><b>탄성계수 E</b>: 거의 등방 (1~3% 차이)</li>
          </ul>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[280px]"><SvgAMAnisotropy /></div>
          <Note tone="tip">
            <b>실무 팁.</b> 응력이 한 방향이면 XY 평면을 그 방향으로 배치하도록 빌드 방향 설계. 회전 부품·복잡 형상은 <b>HIP 처리로 이방성·기공 동시 감소</b>가 표준.
          </Note>

          <H3>10.2 후처리 표준 워크플로우</H3>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[260px]"><SvgHIPEffect /></div>
          {/* R68 — 후처리 7단계 flow 도식 */}
          <div className="rounded-lg border border-border bg-card p-3 my-3 overflow-x-auto">
            <svg viewBox="0 0 980 180" className="min-w-[900px] h-auto">
              {[
                { label: 'AM 빌드', sub: 'as-built', color: 'oklch(0.88 0.06 90)' },
                { label: '응력 완화', sub: 'Stress relief', color: 'oklch(0.88 0.08 30)' },
                { label: '분리·서포트 제거', sub: 'wire cut', color: 'oklch(0.88 0.05 250)' },
                { label: 'HIP', sub: '기공 제거', color: 'oklch(0.88 0.10 220)' },
                { label: '시효·SA', sub: 'Solution+Aging', color: 'oklch(0.88 0.08 110)' },
                { label: '기계가공', sub: 'finishing', color: 'oklch(0.88 0.05 250)' },
                { label: 'CT·NDT', sub: '검사', color: 'oklch(0.88 0.14 145)' },
              ].map((s, i) => (
                <g key={i}>
                  <rect x={10 + i * 138} y="48" width="124" height="84" rx="8" fill={s.color} stroke="oklch(0.35 0.06 250)" strokeWidth="1.5" />
                  <text x={72 + i * 138} y="76" textAnchor="middle" fontSize="14" fontWeight="800" fill="oklch(0.20 0.04 250)">{i + 1}. {s.label}</text>
                  <text x={72 + i * 138} y="95" textAnchor="middle" fontSize="11" fontWeight="600" fill="oklch(0.30 0.04 250)">{s.sub}</text>
                  <text x={72 + i * 138} y="118" textAnchor="middle" fontSize="10" fill="oklch(0.40 0.04 250)" fontStyle="italic" fontFamily="monospace">
                    {['as-built', '650-815°C', '와이어컷', '1100°C/100MPa', 'alloy 별', 'Ra 0.5-3μm', 'porosity 0.5%'][i]}
                  </text>
                  {i < 6 && <line x1={134 + i * 138} y1="88" x2={148 + i * 138} y2="88" stroke="oklch(0.55 0.14 220)" strokeWidth="2.5" markerEnd="url(#wfArr)" />}
                </g>
              ))}
              <defs><marker id="wfArr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="oklch(0.55 0.14 220)" /></marker></defs>
              <text x="490" y="26" textAnchor="middle" fontSize="15" fill="oklch(0.20 0.04 250)" fontWeight="800">AM 부품 후처리 워크플로우 (7단계)</text>
              <text x="490" y="158" textAnchor="middle" fontSize="12" fill="oklch(0.40 0.04 250)" fontStyle="italic">vendor·alloy·용도에 따라 일부 단계 생략 가능 — 항공·의료는 모든 단계 표준</text>
            </svg>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">단계</th><th className="p-2 font-semibold">처리</th><th className="p-2 font-semibold">목적</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2">①</td><td className="p-2 font-medium">Stress relief (650–815 °C · 1–2 h · 노 냉각)</td><td className="p-2">건축 잔류응력 완화. 빌드플레이트 분리 전 필수.</td></tr>
                <tr><td className="p-2">②</td><td className="p-2 font-medium">서포트 제거 · 빌드플레이트 와이어컷</td><td className="p-2">기계적 분리. 표면 거칠기 ~30 µm Ra 잔류.</td></tr>
                <tr><td className="p-2">③</td><td className="p-2 font-medium">HIP (Hot Isostatic Press, 1100–1200 °C / 100–200 MPa / 2–4 h)</td><td className="p-2">미세 기공 압축 소거 → 피로 ↑ · 연신 ↑ · σy 약간 ↓. 항공·의료 표준.</td></tr>
                <tr><td className="p-2">④</td><td className="p-2 font-medium">Solution + Aging (alloy-specific)</td><td className="p-2">Ti-6Al-4V STA · Inconel 718 STA·DSA · 17-4 PH H900/H1025 · AlSi10Mg T6</td></tr>
                <tr><td className="p-2">⑤</td><td className="p-2 font-medium">기계가공 · 연마 (Ra 0.5–3 µm)</td><td className="p-2">치수 정밀 · 피로 강도 ↑ (표면 노치 효과 ↓)</td></tr>
                <tr><td className="p-2">⑥</td><td className="p-2 font-medium">표면 처리 (PVD·CVD·micro arc oxidation·anodize)</td><td className="p-2">내마모·내식·외관. 의료·항공 표준.</td></tr>
                <tr><td className="p-2">⑦</td><td className="p-2 font-medium">검사 (CT 스캔 · 침투탐상 PT · 형광탐상 FPI)</td><td className="p-2">내부 기공·균열 · 표면 결함. 항공·우주 표준.</td></tr>
              </tbody>
            </table>
          </div>

          <H3>10.3 AM 공정별 비교</H3>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">공정</th><th className="p-2 font-semibold">에너지 / 빌드 방식</th><th className="p-2 font-semibold">표준 합금</th><th className="p-2 font-semibold">강점</th><th className="p-2 font-semibold">한계</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12px]">
                <tr><td className="p-2 font-medium">LPBF (SLM, DMLS)</td><td className="p-2">고출력 레이저 · 분말 베드</td><td className="p-2">Ti-6Al-4V · Inconel 718/625 · AlSi10Mg · AISI 316L · 17-4 PH · CoCrMo</td><td className="p-2">정밀도 ±50 µm · 미세조직 미세 · 내부 채널 가능</td><td className="p-2">잔류응력 高 · Z 이방성 · 표면 거칠기 高 · 분말 회수 까다로움</td></tr>
                <tr><td className="p-2 font-medium">EBM (Electron Beam Melting)</td><td className="p-2">전자빔 · 진공 분말 베드</td><td className="p-2">Ti-6Al-4V · CoCr · 일부 Ni 초합금</td><td className="p-2">잔류응력 低 (700 °C 고온 빌드) · 내부 응력 없음</td><td className="p-2">정밀도 ±200 µm · 진공 환경 必 · 분말 입도 大 (45–100 µm)</td></tr>
                <tr><td className="p-2 font-medium">DED (LMD · DMD)</td><td className="p-2">레이저·분말 노즐 동시 · 자유 빌드</td><td className="p-2">대부분 금속</td><td className="p-2">대형 부품 · 다재료 · 수리·복원 가능</td><td className="p-2">정밀도 ±500 µm · 후가공 필수 · 표면 매우 거침</td></tr>
                <tr><td className="p-2 font-medium">Binder Jetting</td><td className="p-2">바인더 분사 + 후소결</td><td className="p-2">AISI 316L · AISI 304L · Bronze · Inconel 625</td><td className="p-2">생산성 高 · 잔류응력 0 · 형상 자유도 高</td><td className="p-2">소결 수축 ~3% · 밀도 95–98% (HIP 필수) · 합금 제한적</td></tr>
              </tbody>
            </table>
          </div>

          <H3>10.4 분말 spec · 추적성</H3>
          <ul className="list-disc pl-6 mt-1 text-sm leading-relaxed">
            <li><b>입도 (PSD)</b>: LPBF 15–45 µm · EBM 45–100 µm · Binder Jet 5–25 µm. 입도 변동 → 적층 밀도·표면 거칠기 차이.</li>
            <li><b>산소 함량 (O)</b>: Ti 합금 &lt;0.13 wt% (Grade 23 ELI), Inconel 718 &lt;0.005 wt%. 산소 ↑ → 취성 ↑.</li>
            <li><b>유동성·구형도</b>: 분말 재사용 시 위성 입자·oxidation 증가 → 빌드 결함 ↑. <b>vendor lot · re-use cycle 추적</b> 필수.</li>
            <li><b>표준</b>: ASTM F3049 (Ti) · F3056 (Ni) · F3055 (Stainless) · F3184 (Co alloys) — 데이터시트와 함께 lot certificate 확보.</li>
          </ul>

          <Note tone="warn" title="AM 데이터 한계">
            <p>이 앱의 AM 합금 데이터는 vendor datasheet (EOS · Renishaw · Sandvik · SLM Solutions · GE Additive 등) 기반이며, <b>특정 build orientation · 후처리 condition</b> 의 측정값입니다. 다른 vendor·다른 machine 으로 같은 합금을 빌드하면 결과가 ±20% 변동 가능합니다.</p>
            <p className="mt-2"><b>실무</b>: 항공·의료·압력용기 등 인증 부품은 자체 시편으로 σy·UTS·El·피로·CT scan 검증 후 사용. 이 앱은 후보 좁히기 도구입니다.</p>
          </Note>

          {/* R66 B — Larson-Miller (creep) + Arrhenius (oxidation) + 외부 링크 */}
          <H3>10.5 고온 부품 수명 예측 — Larson-Miller parameter</H3>
          <Note tone="why" title="Larson-Miller parameter (LMP) — creep rupture 예측">
            <p className="leading-relaxed">고온 부품 (Inconel 718 750°C, P91 600°C 보일러) 의 수명은 응력·온도·시간 3 변수. Larson-Miller 가 이를 하나의 parameter 로 통합.</p>
            <p className="mt-1 font-mono text-[13px]">LMP = T · (C + log₁₀(t_r))</p>
            <p className="mt-1 text-[12px]">T = 절대온도 (K) · t_r = rupture 시간 (h) · C = 상수 (강 보통 20, Ni 합금 25). 같은 응력의 LMP 가 일정 = master curve. 새 조건 (T', t') 에서 σ 예측 가능.</p>
            <p className="mt-2 text-[12px] text-muted-foreground">예: P91 의 σ=100 MPa creep rupture 데이터 from ECCC datasheet — LMP ≈ 22,500 (with C=20). 600°C(873K) → t_r = 10^(22500/873 − 20) ≈ 6×10⁵ h. 650°C(923K) → 10^(22500/923 − 20) ≈ 2.4×10⁴ h. 50°C 증가 = 약 20~25배 단축 (지수적 — 일정 배수 아님).</p>
          </Note>
          <Note tone="why" title="Arrhenius equation — 산화·확산 속도">
            <p className="font-mono text-[13px]">k(T) = A · exp(−Q/RT)</p>
            <p className="mt-1 text-[12px]">활성화 에너지 Q (oxidation, diffusion, creep). 온도 ↑ → exponential 가속. 100°C 증가 = 보통 2–10 배 속도.</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — AM·고온·creep">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/3D_printing">Wikipedia: 3D printing</ExtLink> — AM 공정 광범위</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Larson%E2%80%93Miller_relation">Wikipedia: Larson-Miller relation</ExtLink></li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Creep_(deformation)">Wikipedia: Creep (deformation)</ExtLink></li>
              <li><ExtLink href="https://www.eccc-creep.com/">ECCC (European Creep Collaborative Committee)</ExtLink> — creep datasheet 무료 다운로드</li>
              <li><ExtLink href="https://www.americanelements.com/3d-printing-materials.html">American Elements: 3D Printing Materials</ExtLink> — 분말 spec</li>
              <li><ExtLink href="https://www.astm.org/COMMITTEE/F42.htm">ASTM F42 Additive Manufacturing Technologies</ExtLink> — AM 표준 위원회</li>
              <li><ExtLink href="https://www.specialmetals.com/documents/technical-bulletins/">Special Metals Tech Bulletins</ExtLink> — Inconel · Incoloy datasheet</li>
            </ul>
          </Note>
  </>);
}
