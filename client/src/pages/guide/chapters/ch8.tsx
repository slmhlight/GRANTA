/*
 * Guide ch8 본문 — Guide.tsx 에서 분리 (F1).
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
import { Link } from 'wouter';
import { ArrowLeft, X } from 'lucide-react';
import BM from '../../../../public/build-meta.json';
import { F, Note, ExtLink, Chapter, H3 } from '../components';

export default function ch8Body() {
  return (<>
          <ul className="list-disc pl-6 mt-1 space-y-1.5 leading-relaxed text-sm">
            <li>값은 <b>대표값(typical) + min–max 범위</b>입니다. 같은 합금도 공정·열처리·빌드 방향에 따라 크게 달라집니다. 상세 패널의 <b>Process 탭</b>에서 condition 옆에 한 줄 효과 설명을 함께 표시합니다 (H900 = "최대 σy", HIP = "기공 제거·피로 ↑", T6 = "Al peak hardness" 등).</li>
            <li><F>est.</F> 라벨은 confidence 가 <F>handbook</F>(표준 데이터시트), <F>class</F>(클래스 대표 추정), <F>derived</F>(다른 물성에서 유도) 인 경우. 설계 확정 전 출처를 직접 확인하세요. 출처 탭에 <b>"Fatigue fallback"</b> · <b>"KIC fallback"</b> 같은 라벨로 출처 종류를 명시했습니다.</li>
            <li><b>AM(적층제조)은 이방성</b>이 있습니다(XY vs Z). 방향·후처리(HIP/열처리)에 따른 차이를 반드시 고려하세요. 자세한 내용은 <a href="#ch9" className="text-accent hover:underline">AM 특화 챕터</a>.</li>
            <li>최종 판단은 항상 <b>출처(데이터시트·규격)</b>로 검증하고, 안전계수·인증 요구를 적용하세요. 이 앱은 <b>후보를 좁히는 도구</b>이지 설계 승인 근거가 아닙니다.</li>
          </ul>

          {/* R64 — Confidence 4 라벨 풀이 표 */}
          <H3>Confidence 라벨 — 4가지</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[16%]">라벨</th><th className="p-2 font-semibold">의미</th><th className="p-2 font-semibold w-[35%]">설계 적합성</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-mono text-foreground/70">n=N (measured)</td><td className="p-2">N 개 실측 데이터점의 평균 ± 범위. n 클수록 신뢰 ↑.</td><td className="p-2 text-emerald-700">✓ 인증·시제품 설계에 직접 사용 가능</td></tr>
                <tr><td className="p-2 font-mono text-sky-600">handbook</td><td className="p-2">ASM Handbook · MMPDS · vendor datasheet 의 표준 typical 값.</td><td className="p-2 text-emerald-700">✓ 예비 설계·후보 좁히기에 적합</td></tr>
                <tr><td className="p-2 font-mono text-amber-600">class</td><td className="p-2">같은 family/subcategory 의 평균값으로 추정 (family KIC fallback 등).</td><td className="p-2 text-amber-700">⚠ Ashby 차트·후보 선정 용. 설계값으로는 부적합 — 출처 확인 必</td></tr>
                <tr><td className="p-2 font-mono text-rose-500">≈UTS (derived)</td><td className="p-2">다른 물성에서 유도 (Fatigue σ_f ≈ 0.45·σy 등 Shigley 근사).</td><td className="p-2 text-rose-700">⚠ 정성적 비교만. 정량 설계는 측정값으로 대체 必</td></tr>
              </tbody>
            </table>
          </div>

          {/* R64 — 데이터 출처 (Provenance) */}
          <H3>데이터 출처 (Provenance)</H3>
          <p className="text-sm leading-relaxed">이 앱의 {BM.byCategory.Metal.toLocaleString()} 금속 + {BM.byCategory.Polymer} 폴리머 + {BM.byCategory.Ceramic} 세라믹 + {BM.byCategory.Composite} 복합재 (총 {BM.totalAlloys.toLocaleString()}) 데이터는 다음 출처에서 수집·종합되었습니다.</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[28%]">출처</th><th className="p-2 font-semibold w-[20%]">유형</th><th className="p-2 font-semibold">담당 범위</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">ASM Handbook Vol. 1·2·4</td><td className="p-2">학술 표준</td><td className="p-2">강·합금강·Tool Steel·SS·Ni·Co·Cu·Ti·Al·Mg 의 typical 물성 + 열처리</td></tr>
                <tr><td className="p-2 font-medium">MMPDS-2018 (구 MIL-HDBK-5J)</td><td className="p-2">항공 표준</td><td className="p-2">aerospace alloy 의 design allowable (A/B basis) · 온도별 σy/UTS</td></tr>
                <tr><td className="p-2 font-medium">Aluminum Association Handbook</td><td className="p-2">산업 표준</td><td className="p-2">AA designation 2xxx·5xxx·6xxx·7xxx 의 temper 별 mechanical / thermal</td></tr>
                <tr><td className="p-2 font-medium">Special Metals (SMC-018·029·045·046·093)</td><td className="p-2">vendor</td><td className="p-2">Inconel 600·617·625·690·718·X-750·Incoloy 800H·Monel 400 등 datasheet</td></tr>
                <tr><td className="p-2 font-medium">Haynes International (H-3000·3008·3068)</td><td className="p-2">vendor</td><td className="p-2">Haynes 230·X·282·25 (L605) 등 고온합금</td></tr>
                <tr><td className="p-2 font-medium">Carpenter Technology Custom</td><td className="p-2">vendor</td><td className="p-2">17-4 PH·15-5 PH·Custom 465·A286·Maraging 등 PH 합금</td></tr>
                <tr><td className="p-2 font-medium">EOS · Renishaw · SLM Solutions · GE Additive</td><td className="p-2">vendor (AM)</td><td className="p-2">LPBF·EBM 합금의 build orientation·후처리별 측정값</td></tr>
                <tr><td className="p-2 font-medium">Shigley's Mechanical Engineering Design</td><td className="p-2">교과서</td><td className="p-2">Fatigue endurance limit σ_f ≈ k · σy 근사 (derived 출처)</td></tr>
                <tr><td className="p-2 font-medium">ASME B&PV Section II·D · ASTM A335</td><td className="p-2">규격</td><td className="p-2">압력용기·발전소 강재 (Grade 91/P91) 의 elevated-temp design</td></tr>
                <tr><td className="p-2 font-medium">ECCC datasheets</td><td className="p-2">creep DB</td><td className="p-2">P91·9Cr 합금 등의 10⁵ h creep rupture</td></tr>
                <tr><td className="p-2 font-medium">LME spot prices (2026 Q1) + vendor 가격 책자</td><td className="p-2">시장 데이터</td><td className="p-2">원자재 단가 (price_per_kg). 분기별 갱신.</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">각 합금의 상세 패널 <b>Sources 탭</b>에 해당 alloy 가 어느 출처에서 왔는지, verified URL 이 등록되어 있으면 직접 방문 가능.</p>

          {/* R64 — 단위 변환 표 */}
          <H3>SI ↔ Imperial 빠른 변환</H3>
          <p className="text-sm leading-relaxed">우측 상단 <b>SI / Imperial</b> 토글로 표시 단위가 즉시 전환됩니다. 다른 자료와 교차 검증 시 참고:</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">SI</th><th className="p-2 font-semibold">변환</th><th className="p-2 font-semibold">Imperial</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px] font-mono">
                <tr><td className="p-2">1 MPa</td><td className="p-2 text-muted-foreground">×0.14504</td><td className="p-2">≈ 0.145 ksi</td></tr>
                <tr><td className="p-2">1 GPa</td><td className="p-2 text-muted-foreground">×145.04</td><td className="p-2">≈ 145 ksi · 0.145 Msi</td></tr>
                <tr><td className="p-2">σy 250 MPa</td><td className="p-2 text-muted-foreground">×0.145</td><td className="p-2">≈ 36.3 ksi</td></tr>
                <tr><td className="p-2">E 200 GPa</td><td className="p-2 text-muted-foreground">×0.145</td><td className="p-2">≈ 29 Msi</td></tr>
                <tr><td className="p-2">1 °C</td><td className="p-2 text-muted-foreground">×1.8 + 32</td><td className="p-2">°F</td></tr>
                <tr><td className="p-2">600 °C</td><td className="p-2 text-muted-foreground">×1.8 + 32</td><td className="p-2">≈ 1112 °F</td></tr>
                <tr><td className="p-2">1 g/cm³</td><td className="p-2 text-muted-foreground">×0.03613</td><td className="p-2">≈ 0.0361 lb/in³</td></tr>
                <tr><td className="p-2">ρ 7.85 g/cm³ (강)</td><td className="p-2 text-muted-foreground">×0.0361</td><td className="p-2">≈ 0.283 lb/in³</td></tr>
                <tr><td className="p-2">1 W/m·K</td><td className="p-2 text-muted-foreground">×0.578</td><td className="p-2">≈ 0.578 BTU/(h·ft·°F)</td></tr>
                <tr><td className="p-2">1 J/kg·K</td><td className="p-2 text-muted-foreground">×0.000239</td><td className="p-2">≈ 0.239×10⁻³ BTU/(lb·°F)</td></tr>
                <tr><td className="p-2">1 MPa·√m (KIC)</td><td className="p-2 text-muted-foreground">×0.91</td><td className="p-2">≈ 0.91 ksi·√in</td></tr>
              </tbody>
            </table>
          </div>

          {/* R64 — FAQ */}
          <H3>자주 묻는 질문 (FAQ)</H3>
          <div className="space-y-3 mt-2">
            {[
              { q: '같은 합금이 여러 row 로 나오는 이유?', a: '열처리 condition (Annealed / Solution / Aged / Q+T / H900 등) 별로 별도 row 입니다. 같은 alloy 라도 condition 마다 σy 가 2배 이상 차이날 수 있어 분리해 표시합니다.' },
              { q: 'class 라벨이 붙은 값을 설계에 그대로 쓸 수 있나요?', a: '아니오. class 는 family 평균에서 유도한 추정값입니다. 후보 좁히기·Ashby 차트 용도로 쓰고, 정량 설계는 출처 데이터시트의 측정값을 직접 사용하세요.' },
              { q: 'AM 합금 데이터는 어느 빌드 방향 기준?', a: 'vendor datasheet 기준입니다. 대부분 XY (적층면 수직) 표준이며, Z 방향은 ~10–30% 낮은 값이 일반적. 자세한 영향은 Chapter 10 (AM 특화) 참고.' },
              { q: 'Fatigue strength 가 derived 인 합금은 신뢰할만한가?', a: 'Shigley 근사 (σ_f ≈ k · σy, k = 0.38–0.52) 로 채워진 값입니다. 정성적 비교에는 OK 이나 실 설계는 S-N 곡선이나 endurance limit 측정값으로 대체하세요.' },
              { q: 'Compare 패널에서 Radar 차트는 왜 21개 이상일 때 비활성?', a: '오버레이가 너무 많으면 시각 비교가 어렵습니다. 20개 이하로 좁히거나, 표·CSV 로 비교하세요.' },
              { q: 'KIC 값이 없는 합금이 많은 이유?', a: `실측 데이터가 최초 39 alloys 뿐이었습니다. family fallback (ASM Vol. 1·2 + MMPDS) 과 이후 검증 보강으로 현재 금속 ${BM.kicCoverage.covered}/${BM.kicCoverage.total} (${BM.kicCoverage.pct}%) 커버. fallback 표시는 confidence "class".` },
              { q: '단위·언어를 어디서 바꾸나요?', a: '우측 상단 헤더의 <b>한 / EN</b> 토글 (언어), <b>SI / Imperial</b> 토글 (단위). 즉시 전환되며 localStorage 에 저장.' },
              { q: '필터를 적용했는데 결과가 0개 입니다.', a: '좌측 사이드바 상단의 <b>Reset</b> 또는 헤더의 <b>필터 초기화</b>. preset 으로 진입한 경우 banner 의 ↻ Reset 버튼.' },
              { q: '결과를 다시 보고 싶을 때 (북마크)?', a: 'URL 이 자동으로 필터·preset·index 를 인코딩합니다. 브라우저 즐겨찾기에 추가하거나 link 공유하면 같은 상태로 재현됩니다.' },
              { q: '내가 자주 쓰는 합금 set 을 저장?', a: '우측 상단 <b>Collections</b>. 이름을 부여하면 현재 선택 + 필터 snapshot 이 localStorage 에 저장됩니다. 6개 이상이면 검색·정렬 cycle 도 자동 노출.' },
            ].map((f, i) => (
              <details key={i} className="rounded border border-border bg-card p-2.5">
                <summary className="cursor-pointer text-sm font-semibold text-foreground/85">{f.q}</summary>
                <p className="text-[12.5px] text-foreground/80 mt-1 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">막힘이 있으면 우측 상단의 <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">?</kbd> 버튼 (또는 <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">?</kbd> 키) 으로 온보딩 투어 다시 보기.</p>

          {/* R65 C — datasheet literacy. typical / minimum / A-basis / B-basis 의 의미. */}
          <H3>Datasheet 읽기 — 같은 합금이 다르게 보이는 이유</H3>
          <p className="text-sm leading-relaxed">같은 Ti-6Al-4V 라도 datasheet 마다 σy 가 800·830·850 MPa 로 다르게 표시되는 이유 — <b>어떤 통계 base 를 사용했나</b>가 핵심.</p>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[16%]">통계 base</th><th className="p-2 font-semibold w-[14%]">신뢰 수준</th><th className="p-2 font-semibold">의미·사용</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-mono text-foreground/70">typical</td><td className="p-2">~50%</td><td className="p-2">측정값의 평균. vendor 마케팅·교과서·이 앱 default. 약 절반의 시편이 이 값 이상.</td></tr>
                <tr><td className="p-2 font-mono text-sky-600">minimum</td><td className="p-2">~99%</td><td className="p-2">spec 의 최소 보장값. 99% 시편이 이 값 이상. vendor 보증 가능. 일반 양산용.</td></tr>
                <tr><td className="p-2 font-mono text-amber-600">A-basis (S-basis)</td><td className="p-2">99% / 95% 신뢰</td><td className="p-2">MMPDS / MIL-HDBK-5J 표준. 99% 시편이 이 값 이상 — 95% 신뢰. <b>항공 design allowable</b>. typical 대비 80–90% 수준.</td></tr>
                <tr><td className="p-2 font-mono text-amber-600">B-basis</td><td className="p-2">90% / 95% 신뢰</td><td className="p-2">MMPDS 표준. 90% 시편이 이 값 이상 — 95% 신뢰. <b>항공 일반·redundant 부품</b>. typical 의 85–95%.</td></tr>
                <tr><td className="p-2 font-mono text-rose-500">guaranteed minimum</td><td className="p-2">100% (contractual)</td><td className="p-2">계약 기반 — vendor 가 lot certificate 로 보증. typical 의 70–85%. 가장 보수적.</td></tr>
              </tbody>
            </table>
          </div>
          <Note tone="tip" title="실무 의사결정">
            <p><b>학생·시제품:</b> typical 사용 (이 앱 default).<br/>
              <b>양산:</b> spec minimum 또는 vendor lot certificate 사용.<br/>
              <b>항공·인증:</b> MMPDS A-basis 또는 B-basis 의무.<br/>
              <b>중요</b>: 이 앱의 confidence 라벨 (measured / handbook / class / derived) 도 함께 확인. class·derived 라벨 = typical 도 아닌 추정값.</p>
          </Note>

          <H3>참고문헌</H3>
          <ul className="list-disc pl-6 mt-1 space-y-1 leading-relaxed text-sm">
            <li>M. F. Ashby, <i>Materials Selection in Mechanical Design</i>, Butterworth-Heinemann — 재료 선택 방법·성능지수의 표준 교과서.</li>
            <li>Ansys Granta EduPack, <i>Materials Selection</i> &amp; <i>Performance Indices</i> 교육 자료 — 성능지수 목록과 차트 활용.</li>
            <li>일반 재료역학(응력 <F>σ=F/A</F>, 보 처짐, 안전계수) — 표준 기계공학 교과서 (Hibbeler·Beer 등).</li>
            <li>MMPDS-2018 (구 MIL-HDBK-5J), Battelle Memorial Institute — A-basis / B-basis 통계 방법론의 표준.</li>
            <li>ASM Handbook Vol. 19, <i>Fatigue and Fracture</i> — 피로·파괴 시험·해석 표준.</li>
            <li>ISO 6892 / ASTM E8 — 인장 시험 표준 방법.</li>
            <li>Shigley's <i>Mechanical Engineering Design</i>, 10th ed. McGraw-Hill — Basquin · Goodman · SF 등 표준.</li>
            <li>Roark's <i>Formulas for Stress and Strain</i>, 9th ed. — 보·기둥·압력용기 등 표준 공식 모음.</li>
            <li>R. C. Reed, <i>The Superalloys: Fundamentals and Applications</i> — Ni·Co superalloy 의 표준 reference.</li>
            <li>I. Gibson, D. Rosen, B. Stucker, <i>Additive Manufacturing Technologies</i>, Springer — AM 공정 표준 교과서.</li>
          </ul>

          {/* R66 B — 외부 학습 자료 종합 카드 */}
          <H3>📚 외부 학습 자료 — 무료 / 인터랙티브</H3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="rounded border border-border bg-card p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">강의·교과서 (무료)</p>
              <ul className="list-disc pl-5 space-y-1 text-[13px]">
                <li><ExtLink href="https://ocw.mit.edu/search/?d=Materials%20Science%20and%20Engineering&s=department_course_numbers.sort_coursenum">MIT OCW 3.094</ExtLink> — 재료의 인간 경험·역사</li>
                <li><ExtLink href="https://ocw.mit.edu/courses/3-11-mechanics-of-materials-fall-1999/">MIT OCW 3.11</ExtLink> — Mechanics of Materials</li>
                <li><ExtLink href="https://ocw.mit.edu/search/?d=Mechanical%20Engineering&t=Solid%20Mechanics">MIT OCW 2.001</ExtLink> — Mechanics & Materials I</li>
                <li><ExtLink href="https://www.doitpoms.ac.uk/">DoITPoMS (Cambridge)</ExtLink> — 재료과학 인터랙티브 학습</li>
                <li><ExtLink href="https://nptel.ac.in/courses/112106227">NPTEL: Materials Selection</ExtLink> — India 무료 공학 강의</li>
              </ul>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">데이터·계산 도구</p>
              <ul className="list-disc pl-5 space-y-1 text-[13px]">
                <li><ExtLink href="https://www.engineeringtoolbox.com/">Engineering Toolbox</ExtLink> — 빠른 공식·표·계산기</li>
                <li><ExtLink href="https://en.wikipedia.org/wiki/Fatigue_(material)">Wikipedia: Fatigue (material)</ExtLink> — S-N curve · Goodman · Miner's rule 개요</li>
                <li><ExtLink href="https://www.matweb.com/">MatWeb</ExtLink> — 재료 데이터시트 검색 (한계 free)</li>
                <li><ExtLink href="https://materialsproject.org/">Materials Project</ExtLink> — 첫째원리 계산 결과 무료 DB (학술)</li>
                <li><ExtLink href="https://www.nist.gov/srd">NIST SRD</ExtLink> — Standard Reference Data</li>
                <li><ExtLink href="https://www.eccc-creep.com/">ECCC</ExtLink> — Creep rupture datasheet 무료</li>
              </ul>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">규격·표준 (open access)</p>
              <ul className="list-disc pl-5 space-y-1 text-[13px]">
                <li><ExtLink href="https://www.astm.org/">ASTM International</ExtLink> — 시험 표준 (E8 · E23 · E466 · E399)</li>
                <li><ExtLink href="https://www.iso.org/standards.html">ISO</ExtLink> — 6892 (인장) · 14801 (임플란트 피로)</li>
                <li><ExtLink href="https://www.asme.org/codes-standards">ASME B&PV Code</ExtLink> — 압력용기·발전소</li>
                <li><ExtLink href="https://www.aluminum.org/standards">Aluminum Association</ExtLink> — Al designation</li>
                <li><ExtLink href="https://www.iss.it/">IISI / ISO TC 17 Steel</ExtLink></li>
              </ul>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">Vendor datasheet</p>
              <ul className="list-disc pl-5 space-y-1 text-[13px]">
                <li><ExtLink href="https://www.specialmetals.com/documents/technical-bulletins/">Special Metals (Inconel/Incoloy)</ExtLink></li>
                <li><ExtLink href="https://haynesintl.com/alloys/">Haynes International (Haynes/Hastelloy)</ExtLink></li>
                <li><ExtLink href="https://www.carpentertechnology.com/">Carpenter Technology (PH/maraging)</ExtLink></li>
                <li><ExtLink href="https://www.eos.info/en/3d-printing-materials">EOS (LPBF 분말 spec)</ExtLink></li>
                <li><ExtLink href="https://www.renishaw.com/en/metal-3d-printing-materials--32084">Renishaw (AM 분말)</ExtLink></li>
                <li><ExtLink href="https://www.alcoa.com/global/en/products/aerospace/aerospace-resources">Alcoa Aerospace (Al alloys)</ExtLink></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-4 border-t border-border">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline underline-offset-2">
              <ArrowLeft className="w-4 h-4" /> 탐색기로 돌아가 바로 적용해 보기
            </Link>
          </div>
  </>);
}
