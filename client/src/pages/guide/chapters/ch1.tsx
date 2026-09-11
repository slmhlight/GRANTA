/*
 * Guide ch1 본문 — Guide.tsx 에서 분리 (F1).
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
import { F, Note, H3, PropCard } from '../components';
import { SvgStressStrain, IconYield, IconUTS, IconElongation, IconE, IconHardness, IconFatigue, IconDensity, IconCTE, IconK, IconMaxTemp } from '../svgs';

export default function ch1Body() {
  return (<>
          <p className="leading-relaxed text-foreground/90">
            재료 데이터베이스에는 <F>MPa</F>, <F>GPa</F>, <F>%</F> 같은 숫자가 잔뜩 있습니다. 각 물성이 무엇을 뜻하는지 <b>먼저 감을 잡고</b> 시작합시다.
          </p>

          {/* 핵심 도식: 응력-변형률 곡선 — 한 그림으로 σy/UTS/연신율/E 모두 보기 */}
          <div className="rounded-lg border border-border bg-card p-3 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📊 핵심 그림 — 응력-변형률 곡선 한 장</p>
            <div className="h-[240px]"><SvgStressStrain /></div>
            <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
              인장 시험으로 얻는 이 한 곡선에 <span className="text-emerald-600 font-bold">σy</span>·<span className="text-violet-600 font-bold">UTS</span>·<span className="text-sky-600 font-bold">연신율</span>·<span className="text-amber-600 font-bold">E(탄성 영역의 기울기)</span>가 모두 들어 있습니다. 아래 카드들은 각각의 의미와 일반 범위를 따로 풉니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <PropCard
              name="항복강도 σy"
              unit="MPa"
              icon={<IconYield />}
              intuition="이 응력을 넘으면 영구 변형(소성). 클립을 살짝 구부리면 다시 펴지지만(탄성), 세게 구부리면 안 돌아오죠(소성) — 그 경계점."
              useFor="‘하중을 받아도 변형되면 안 된다’는 가장 흔한 강도 기준."
              range="알루미늄 100~500 · 강 250~1500 · 티타늄 800~1100 · 폴리머 30~100"
            />
            <PropCard
              name="인장강도 UTS"
              unit="MPa"
              icon={<IconUTS />}
              intuition="끊어지기 직전 최대 응력. σy가 ‘변하기 시작’ 이라면 UTS는 ‘파단 직전’."
              useFor="파단 안전여유 확인, 취성 재료 평가, 안전계수 산정."
              range="보통 σy의 1.1~1.5배"
            />
            <PropCard
              name="연신율"
              unit="%"
              icon={<IconElongation />}
              intuition="끊어질 때까지 늘어난 비율 = 연성. 낮으면 취성(갑자기 깨짐). 알루미늄 캔이 잘 찌그러지는 건 연성 덕분."
              useFor="충격 흡수, 성형/굽힘, 취성 파괴 회피."
              range="취성 세라믹 < 1 · 일반 금속 8~30 · 폴리머 50~500"
            />
            <PropCard
              name="탄성계수 E"
              unit="GPa"
              icon={<IconE />}
              intuition="‘뻣뻣함(강성)’. 같은 하중에서 얼마나 적게 휘는가. 고무는 작고, 강철은 크다."
              useFor="처짐 제한, 진동·고유진동수, 정밀도."
              range="고무 0.01 · 폴리머 1~5 · 알루미늄 70 · 티타늄 115 · 강 200 · 텅스텐 410"
            />
            <PropCard
              name="경도 HV"
              unit="HV"
              icon={<IconHardness />}
              intuition="국부 압입 저항. ‘긁힘·찍힘에 강한 정도’. 대략 마모·표면 강도의 지표."
              useFor="베어링/기어 표면, 마모 부품."
              range="알루미늄 30~150 · 강 150~700 · 공구강 700~"
            />
            <PropCard
              name="피로강도"
              unit="MPa"
              icon={<IconFatigue />}
              intuition="반복 하중(매번 같은 방향·반대 방향)에 견디는 응력 한계. 정적 강도보다 훨씬 낮음."
              useFor="회전·진동·반복 하중 부품 (샤프트·스프링·임펠러)."
              range="대략 UTS의 0.3~0.55. 알루미늄은 명확한 한도 없음(주의)"
            />
            <PropCard
              name="밀도 ρ"
              unit="g/cm³"
              icon={<IconDensity />}
              intuition="단위 부피당 무게. 경량화의 분모."
              useFor="‘비강도(σy/ρ)’ · ‘비강성(E/ρ)’ 같은 조합으로 경량화."
              range="폴리머 1~1.4 · 알루미늄 2.7 · 티타늄 4.5 · 강 7.8 · 텅스텐 19"
            />
            <PropCard
              name="열팽창계수 CTE"
              unit="10⁻⁶/K"
              icon={<IconCTE />}
              intuition="온도 1 °C 오르면 늘어나는 비율. 끼워맞춤·기차레일 틈·정밀 측정 등에서 결정적."
              useFor="열응력, 끼워맞춤, 치수 안정성. ‘끼워맞춤 부품의 가공이 어렵다’ 보통 CTE 미스매치."
              range="Invar 1.3 (정밀) · 강 12 · 알루미늄 23 · 폴리머 50~150"
            />
            <PropCard
              name="열전도도 k"
              unit="W/m·K"
              icon={<IconK />}
              intuition="열이 얼마나 잘 흐르는가. 구리는 빠르고, 폴리머는 거의 안 흐름."
              useFor="히트싱크, 금형, 단열재."
              range="단열 폴리머 0.2 · 강 50 · 알루미늄 240 · 구리 400"
            />
            <PropCard
              name="최대사용온도"
              unit="°C"
              icon={<IconMaxTemp />}
              intuition="장시간 사용 가능한 온도 상한. 잠깐은 더 견딜 수 있어도 ‘연속’ 사용은 여기까지."
              useFor="고온 부품(배기·터빈·열교환기)."
              range="폴리머 60~250 · 알루미늄 150 · 강 450 · Ni 초합금 800~1100"
            />
            {/* H6 W3-6 — 표에는 나오는데 카드가 없던 물성 4종 (전기전도도 1038·충격강도 911·Tg 133·HDT 37 재료) */}
            <PropCard
              name="전기전도도 %IACS"
              unit="%IACS"
              icon={<IconK />}
              intuition="전류가 얼마나 잘 흐르는가. 순동을 100 %로 놓은 상대값. 금속은 전기가 잘 통하면 열도 잘 통한다."
              useFor="도체·부스바·용접 전극·금형 냉각. 알루미늄 합금은 와전류로 열처리 상태를 비파괴 확인."
              range="순동 101 · 알루미늄 61 · CuCrZr 82 · 황동 28 · 스테인리스 2.4"
            />
            <PropCard
              name="충격강도"
              unit="J (샤르피)"
              icon={<IconFatigue />}
              intuition="노치를 판 시편을 ‘빠르게’ 때려 부술 때 먹는 에너지. 천천히 당기면 늘어나던 재료도 순간 하중엔 깨질 수 있다."
              useFor="저온·충격 하중 부품. 규격은 보통 ‘-40 °C 27 J’처럼 온도와 함께 요구."
              range="온도·노치에 크게 좌우 — 값만 비교하면 안 되고 시험 조건을 함께 본다"
            />
            <PropCard
              name="유리전이온도 Tg"
              unit="°C"
              icon={<IconMaxTemp />}
              intuition="폴리머 사슬이 움직이기 시작하는 온도. 녹는 게 아니라 ‘물러지는’ 지점으로, 강성이 수백 배 급락한다."
              useFor="폴리머 사용 온도 1차 판단. 비정질은 Tg 아래에서만, 반결정은 Tg 위에서도 결정부가 버틴다."
              range="PE −120 · PP −10 · PC 147 · PEEK 143 · PEI 217"
            />
            <PropCard
              name="열변형온도 HDT"
              unit="°C"
              icon={<IconMaxTemp />}
              intuition="정해진 굽힘 하중에서 규정만큼 처지는 온도. 물리적 전이가 아니라 ‘이만큼 하중을 여기까지 버티더라’는 실무 기준."
              useFor="폴리머 1차 스크리닝, 도장 건조·리플로우 등 짧은 고온 공정 통과 여부."
              range="하중(1.82 vs 0.45 MPa)을 빼고 비교하면 무의미 — 이 DB 는 1.82 MPa 기준"
            />
          </div>
          <Note tone="tip">
            <b>한 줄 요약.</b> 변형 = <F>E</F> · 영구변형 시작 = <F>σy</F> · 파단 = <F>UTS</F> · 늘어나는 정도 = 연신율 · 반복하중 = 피로강도. 나머지 물리 물성은 “열·전기·치수” 카테고리.
          </Note>

          {/* R64 — Heat Treatment Glossary 표 (Sprint 4 C7 ht-glossary.ts 와 동기). */}
          <H3>열처리 · 후처리 글로서리</H3>
          <p className="text-sm leading-relaxed">합금 조건명 (H900 · T6 · STA · Q+T 등) 은 열처리·기계적 처리의 표준 약어입니다. 상세 패널의 <b>Process 탭</b>에서 조건 옆에 효과 한 줄 설명이 함께 표시됩니다. 핵심 26 항목:</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[28%]">조건</th><th className="p-2 font-semibold w-[24%]">적용 합금</th><th className="p-2 font-semibold">효과</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-mono">H900</td><td className="p-2">17-4 PH · 15-5 PH</td><td className="p-2">최대 σy (~1170 MPa), 인성·연성 ↓, 부식 ↓</td></tr>
                <tr><td className="p-2 font-mono">H1025</td><td className="p-2">17-4 PH</td><td className="p-2">σy ~1000 MPa, 연성 ↑, 일반적 균형 조건</td></tr>
                <tr><td className="p-2 font-mono">H1075</td><td className="p-2">17-4 PH</td><td className="p-2">σy ~860 MPa, 충격인성 우수</td></tr>
                <tr><td className="p-2 font-mono">H1100</td><td className="p-2">17-4 PH</td><td className="p-2">σy ~795 MPa, 내응력부식 ↑</td></tr>
                <tr><td className="p-2 font-mono">H1150</td><td className="p-2">17-4 PH</td><td className="p-2">최대 연성, σy ~720 MPa, 내응력부식 최대</td></tr>
                <tr><td className="p-2 font-mono">Solution Annealed (SA, Condition A)</td><td className="p-2">PH 강 일반</td><td className="p-2">PH 강 출발조건, Aging(시효) 전 가공·용접 적합 (σy 낮음, El ↑)</td></tr>
                <tr><td className="p-2 font-mono">Aged · PH (Precipitation Hardened)</td><td className="p-2">PH 강 · Al 7xxx · Ni 합금</td><td className="p-2">Aging 경화 — σy·강도 ↑, El ↓</td></tr>
                <tr><td className="p-2 font-mono">STA (Solution + Aged)</td><td className="p-2">Ti-6Al-4V 등</td><td className="p-2">Ti 합금 표준 강화 조건</td></tr>
                <tr><td className="p-2 font-mono">Q&T (Quenched & Tempered)</td><td className="p-2">탄소·합금강 (AISI 4140, AISI 4340)</td><td className="p-2">Quenching(담금질) + Tempering(뜨임) — 강도·인성 균형, 일반 구조강 기본</td></tr>
                <tr><td className="p-2 font-mono">Normalized</td><td className="p-2">탄소·합금강</td><td className="p-2">균질 미세조직, 응력 완화, σy·연성 중간</td></tr>
                <tr><td className="p-2 font-mono">Annealed (Full / Soft)</td><td className="p-2">모든 합금</td><td className="p-2">최대 연성·가공성, σy ↓ (시작점)</td></tr>
                <tr><td className="p-2 font-mono">Stress-relieved</td><td className="p-2">AM 부품 일반</td><td className="p-2">AM 잔류응력 완화, 미세조직 변화 미미</td></tr>
                <tr><td className="p-2 font-mono">HIP (Hot Isostatic Press)</td><td className="p-2">AM 부품 · 주조</td><td className="p-2">기공 제거 → 피로 강도·연신 ↑ (AM 표준)</td></tr>
                <tr><td className="p-2 font-mono">As-built / As-printed (ASB)</td><td className="p-2">AM 모든 합금</td><td className="p-2">AM 후처리 없음 — 잔류응력 + 일부 기공, 피로 ↓</td></tr>
                <tr><td className="p-2 font-mono">T6</td><td className="p-2">Al 합금 (AA 6061, AA 7075, AlSi10Mg)</td><td className="p-2">Al 표준 Aging (peak hardness)</td></tr>
                <tr><td className="p-2 font-mono">T651</td><td className="p-2">Al 7xxx · AA 2024</td><td className="p-2">T6 + stress-relieved (잔류응력 ↓)</td></tr>
                <tr><td className="p-2 font-mono">T7 (T73 · T74)</td><td className="p-2">Al 7xxx</td><td className="p-2">Over-aged — 응력부식 ↑, σy 약간 ↓</td></tr>
                <tr><td className="p-2 font-mono">T4</td><td className="p-2">Al 2xxx</td><td className="p-2">Solution + 자연시효 — El ↑, σy 중간</td></tr>
                <tr><td className="p-2 font-mono">O Temper</td><td className="p-2">Al 합금 일반</td><td className="p-2">Annealed Al — 최대 연성</td></tr>
                <tr><td className="p-2 font-mono">H-temper (H14·H18·H22·H32)</td><td className="p-2">Al 비열처리 합금</td><td className="p-2">Al cold-work strengthened (변형 경화)</td></tr>
                <tr><td className="p-2 font-mono">Mill Annealed (MA)</td><td className="p-2">Ti 합금</td><td className="p-2">Ti 합금 출발 조건 — α+β 미세조직 균질</td></tr>
                <tr><td className="p-2 font-mono">β-annealed</td><td className="p-2">Ti 합금</td><td className="p-2">β-transus 위 균질화, 인성 ↑, El ↓</td></tr>
                <tr><td className="p-2 font-mono">SA + Aged</td><td className="p-2">Inconel 718 · Waspaloy</td><td className="p-2">Ni superalloy 강화 — γ′ 석출</td></tr>
                <tr><td className="p-2 font-mono">Homogenized</td><td className="p-2">주조 · AM 일반</td><td className="p-2">주조·AM 미세편석 균질화</td></tr>
                <tr><td className="p-2 font-mono">PH (Cu)</td><td className="p-2">CuBe · CuCr</td><td className="p-2">Cu Aging — 강도·전도성 균형</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">출처: ASM Handbook Vol. 4 (Heat Treating), Vol. 1 (Properties); AMS spec; MMPDS-2018; Vendor datasheets (EOS · Renishaw · Sandvik · Special Metals).</p>
  </>);
}
