/*
 * Guide ch7 본문 — Guide.tsx 에서 분리 (F1).
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
import { F, Note, ExtLink, Scenario } from '../components';
import { SvgBracket, SvgManifold, SvgShaft, SvgPrecision, SvgMarine, SvgLowcost, SvgSpring, SvgHeatsink, SvgWear, SvgMedical, SvgCryogenic, SvgElectrical, SvgPressureVesselSmall, SvgGear, SvgFastener, SvgDieMold } from '../svgs';
import type { ScenarioKey } from '@/lib/scenario-presets';

export default function ch7Body(onConfigure: (k: ScenarioKey) => void) {
  return (<>
          <p className="leading-relaxed">
            자기 상황과 가장 가까운 사례를 찾아 그대로 따라 해 보세요.
            <span className="text-muted-foreground"> 수치는 방법을 보여주는 예시이고, “유력 재료군”은 일반적 경향입니다 — 최종 선택은 항상 데이터로 검증하세요.</span>
          </p>

          <Scenario
            n={1}
            presetKey="bracket"
            onConfigure={onConfigure}
            diagram={<SvgBracket />}
            examples={<>GE Aviation의 LPBF 제트엔진 연료 노즐·브래킷, Airbus A350 캐빈 브래킷(티타늄 LPBF). <ExtLink href="https://en.wikipedia.org/wiki/3D_printing#Aerospace">Aerospace AM 개요</ExtLink></>}
            title="경량 고강성 구조 브래킷 (드론·항공, LPBF 출력)"
            situation="진동·하중을 받는 마운트를 가능한 한 가볍게, 충분히 강하고 덜 휘게. 금속 적층제조로 출력."
            needs={<>하중·처짐 분석(Ch.5) 결과 예: <F>σy ≥ 300 MPa</F>, <F>E ≥ 90 GPa</F>, 무게 최소.</>}
            steps={[
              <>좌측 필터: <b>Yield ≥ 300</b>, <b>Modulus ≥ 90</b>, <b>Process = LPBF</b>.</>,
              <>상단 <b>Index = 경량 강성 보 <F>E^½/ρ</F></b> 선택. <b>+ constraint</b>로 <F>σy^⅔/ρ</F> 추가.</>,
              <><b>M 임계</b>를 올려 통과를 5~10개로 좁힘 → <b>표 헤더의 ＋ 체크박스</b>로 현재 페이지 전체 추가 → <b>Compare</b> 패널에서 Radar 오버레이·CSV·PNG 로 비교.</>,
            ]}
            families={<>고강도 알루미늄(Scalmalloy·AlSi10Mg), 티타늄(Ti-6Al-4V), 마그네슘 합금.</>}
          />

          <Scenario
            n={2}
            presetKey="hightemp"
            onConfigure={onConfigure}
            diagram={<SvgManifold />}
            examples={<>자동차/F1 배기 매니폴드, 제트엔진 터빈 디스크·블레이드, 로켓 노즐. <ExtLink href="https://en.wikipedia.org/wiki/Inconel">Inconel(Ni 초합금)</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Exhaust_manifold">Exhaust manifold</ExtLink></>}
            title="고온 부품 (배기 매니폴드 · 터빈 디스크)"
            situation="700 °C 부근에서 연속 사용, 반복 가열·산화."
            needs={<>최대사용온도 <F>≥ 700 °C</F>, 그리고 <b>그 온도에서의</b> <F>σy</F>가 충분(상온값이 아님). 내산화.</>}
            steps={[
              <>필터: <b>Max Service Temp ≥ 700</b>.</>,
              <>후보 상세 팝업의 <b>온도-강도 곡선</b>으로 700 °C 부근 σy/UTS 비교 · <b>Compare</b>에 여러 후보 곡선 오버레이.</>,
              <>내식성(정성) 등급도 확인.</>,
            ]}
            families={<>니켈 초합금(Inconel 718/625/617, Haynes 230, Hastelloy X), 발전소 보일러용 Grade 91(P91), petrochem heater tube Incoloy 800H, Fe-Ni 디스크 A286, 코발트 합금. 중온(≤540 °C)은 티타늄 Ti-6242.</>}
          />

          <Scenario
            n={3}
            presetKey="fatigue"
            onConfigure={onConfigure}
            diagram={<SvgShaft />}
            examples={<>자동차 크랭크샤프트, 발전기·증기터빈 로터, 항공기 랜딩기어 액슬. <ExtLink href="https://en.wikipedia.org/wiki/Crankshaft">Crankshaft</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Fatigue_(material)">Fatigue</ExtLink></>}
            title="회전·진동 부품 (샤프트 · 임펠러)"
            situation="반복 응력을 오래 견뎌야 하는 부품. 정적 강도만으로는 부족."
            needs={<>응력진폭 예 <F>150 MPa</F>, <F>SF = 1.5</F> → <b>피로강도</b> <F>≥ 225 MPa</F>. <span className="text-muted-foreground">측정값이 없는 합금은 <F>σ_f ≈ k · σ_y</F> 근사 (강·니켈 k≈0.45–0.50, 티타늄 0.52, 알루미늄 0.38) 로 채워져 있으며 상세 패널의 <F>derived</F> 라벨로 구분됩니다.</span></>}
            steps={[
              <>필터: <b>Fatigue Strength ≥ 225</b> (<F>est.</F>가 붙었는지 상세에서 확인).</>,
              <><b>Compare</b>로 피로강도·연신율·강도 함께 비교 — <b>≤20개</b>면 Radar 오버레이로 한눈에.</>,
            ]}
            families={<>티타늄(높은 피로/강도비), 고강도강(AISI 4340), 일부 니켈합금. <span className="text-muted-foreground">알루미늄은 뚜렷한 내구한도가 없어 주의.</span></>}
          />

          <Scenario
            n={4}
            presetKey="precision"
            onConfigure={onConfigure}
            diagram={<SvgPrecision />}
            examples={<>James Webb 우주망원경 백플레인(흑연·Invar 조합), 정밀 측정기 광학 마운트, 시계 밸런스. <ExtLink href="https://en.wikipedia.org/wiki/Invar">Invar</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/James_Webb_Space_Telescope">JWST</ExtLink></>}
            title="정밀 계측·광학 마운트 (치수 안정성)"
            situation="온도가 변해도 치수가 거의 변하면 안 되는 부품."
            needs={<>열변형 <F>ΔL = L·CTE·ΔT</F>에서 역산 → 매우 낮은 <b>CTE</b>(예 <F>≤ 3×10⁻⁶/K</F>), 충분한 <F>E</F>.</>}
            steps={[
              <>필터: <b>Thermal Expansion (CTE) 상한 ≤ 3</b>, 필요시 Modulus 하한.</>,
              <><b>Compare</b>로 CTE·E·밀도 비교.</>,
            ]}
            families={<>Invar(Fe-Ni36, CTE≈1.3), Kovar, 일부 세라믹·복합재.</>}
          />

          <Scenario
            n={5}
            presetKey="corrosion"
            onConfigure={onConfigure}
            diagram={<SvgMarine />}
            examples={<>해수 펌프·임펠러(Cu-Ni·듀플렉스 스테인리스), 잠수함 밸브, 해양 플랜트 파이프. <ExtLink href="https://en.wikipedia.org/wiki/Duplex_stainless_steel">Duplex stainless steel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Cupronickel">Cupronickel</ExtLink></>}
            title="해양·화학 환경 부품"
            situation="염수·약품에 노출되며 하중도 받는 부품."
            needs={<>환경에 맞는 <b>내식성</b> 등급 + 강도 <F>σy ≥</F> 요구값.</>}
            steps={[
              <>필터: <b>Corrosion resistance = Excellent/Good</b> + <b>Yield</b> 하한.</>,
              <>정량 부식(부식속도·PREN 등)은 앱에 없으므로 <b>데이터시트</b>로 최종 확인.</>,
            ]}
            families={<>스테인리스(AISI 316L, 듀플렉스 2205(UNS S32205)), 티타늄, 니켈합금(Inconel 625).</>}
          />

          <Scenario
            n={6}
            presetKey="lowcost"
            onConfigure={onConfigure}
            diagram={<SvgLowcost />}
            examples={<>자동차 차체·새시 패널, 가전 외장(스탬핑 강판), 일반 산업기계 프레임. <ExtLink href="https://en.wikipedia.org/wiki/Carbon_steel">Carbon steel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/6061_aluminium_alloy">AA 6061 Al</ExtLink></>}
            title="저원가 대량 생산 부품"
            situation="성능 요구는 평범하고 단가가 최우선."
            needs={<>필요 강도 <F>σy</F>를 만족하면서 <b>kg당 가격 최소</b>.</>}
            steps={[
              <>필터: <b>Yield</b> 하한으로 “쓸 수 있는” 재료만 남김.</>,
              <>상단 <b>Index = 저원가 강도 <F>σy/Cm</F></b>로 정렬 · <b>Compare</b>에 <b>Price</b> 열 추가.</>,
            ]}
            families={<>탄소강·저합금강, 일반 알루미늄(AA 6061), 일부 폴리머.</>}
          />

          <Scenario
            n={7}
            presetKey="spring"
            onConfigure={onConfigure}
            diagram={<SvgSpring />}
            examples={<>자동차 밸브스프링·서스펜션 스프링, 시계 헤어스프링, 베릴륨동 커넥터 콘택트. <ExtLink href="https://en.wikipedia.org/wiki/Spring_steel">Spring steel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Beryllium_copper">Beryllium copper</ExtLink></>}
            title="스프링 · 스냅핏 · 탄성 힌지"
            situation="큰 탄성 변형으로 에너지를 저장·복원하되 영구변형은 없어야."
            needs={<>단위부피당 탄성에너지 지표 <F>σy²/E</F> 최대 + 충분한 연신율.</>}
            steps={[
              <>상단 <b>Index = 탄성 스프링/힌지 <F>σy²/E</F></b> 선택.</>,
              <><b>Compare</b>로 σy·E·연신율 비교.</>,
            ]}
            families={<>스프링강, 베릴륨동(BeCu), 티타늄, 일부 니켈합금.</>}
          />

          <Scenario
            n={8}
            presetKey="heatsink"
            onConfigure={onConfigure}
            diagram={<SvgHeatsink />}
            examples={<>CPU·GPU 쿨러, LED 조명 방열 케이스, 전력반도체 콜드플레이트. <ExtLink href="https://en.wikipedia.org/wiki/Heat_sink">Heat sink</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/List_of_thermal_conductivities">Thermal conductivity of metals</ExtLink></>}
            title="방열 부품 (히트싱크 · 콜드플레이트)"
            situation="열을 빠르게 퍼뜨려야 하고, 가벼우면 더 좋음."
            needs={<>높은 <b>열전도도 k</b>; 경량 방열이면 <F>k/ρ</F> 최대.</>}
            steps={[
              <>필터: <b>Thermal Conductivity</b> 하한. 경량까지 필요하면 상단 <b>Index = 경량 방열 <F>k/ρ</F></b>.</>,
              <><b>Compare</b>로 k·밀도·가격 비교.</>,
            ]}
            families={<>구리(최고 k), 알루미늄(경량 방열 <F>k/ρ</F> 우수), AlSi 합금.</>}
          />

          <Scenario
            n={9}
            presetKey="wear"
            onConfigure={onConfigure}
            diagram={<SvgWear />}
            examples={<>지질 시추용 드릴 비트 인서트, 광산 컨베이어 라이너, 굴삭기 버킷 투스, 절삭공구 인서트, 광산 분쇄기 해머. <ExtLink href="https://en.wikipedia.org/wiki/Tungsten_carbide">Tungsten carbide</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Hardfacing">Hardfacing</ExtLink></>}
            title="내마모 부품 (드릴·라이너·절삭공구)"
            situation="고압·반복 접촉으로 표면이 깎이는 환경 — 광산·건설·제조 라인."
            needs={<>높은 <b>경도 (Hardness)</b>, 충분한 <b>충격 인성 (Impact)</b>. Archard 마모식: <F>V = K·F·s/H</F> — H 가 커야 마모율 ↓.</>}
            steps={[
              <>필터: <b>Hardness ≥ 600 HV</b>, <b>Impact ≥ 15 J</b> (인성).</>,
              <><b>Compare</b>로 HV·KIC·가격 비교 (HRC 가 더 익숙하면 HV ≈ 10×HRC).</>,
              <>상세 팝업에서 <b>권장 후공정</b> 확인 — DLC·TiN·CrN PVD 코팅으로 표면만 강화 가능.</>,
            ]}
            families={<>WC-Co (텅스텐 카바이드), 공구강 H13/D2/M2, Stellite 6/12 (Co 합금), 고경도 베어링강 52100. PVD/CVD 표면 코팅.</>}
          />

          <Scenario
            n={10}
            presetKey="medical"
            onConfigure={onConfigure}
            diagram={<SvgMedical />}
            examples={<>척추 케이지 (PEEK·Ti LPBF), 인공관절 (CoCrMo F75, Ti-6Al-4V ELI), 치과 임플란트 (Ti CP Gr4), 두개골 재건 plate. <ExtLink href="https://en.wikipedia.org/wiki/Titanium_biocompatibility">Ti biocompatibility</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/PEEK">PEEK</ExtLink></>}
            title="의료 임플란트 (척추 cage · 인공관절)"
            situation="체내 영구 매식 — 생체 적합성, 부식 저항, 골 친화성, MRI 호환성 필요."
            needs={<>ISO 10993 / ASTM F75/F136 인증 alloy, <b>비자성</b> (MRI), 골 모듈러스 매칭 <F>E ≈ 10–30 GPa</F> (Ti가 강철의 절반), Ni 비함유 (알레르기).</>}
            steps={[
              <>필터: <b>Category ⊃ Polymer(PEEK·UHMWPE) 또는 Metal(Ti·CoCr)</b>, <b>RoHS 통과 = ✓</b>, <b>Modulus ≤ 30 GPa</b> (골 매칭).</>,
              <>Compare 로 σy·연신율·CTE·MRI 호환성 비교.</>,
              <>상세 팝업에서 <b>SVHC 검출</b> 확인 — Ni, Be 함유 alloy 는 자동 경고.</>,
            ]}
            families={<>Ti-6Al-4V ELI (Grade 23), Ti CP Gr2/Gr4 (pure), CoCrMo F75 (인공관절), PEEK (Victrex 450G), UHMWPE (joint surface), 316LVM (저Ni vacuum melt).</>}
          />

          <Scenario
            n={11}
            presetKey="cryogenic"
            onConfigure={onConfigure}
            diagram={<SvgCryogenic />}
            examples={<>LNG 운반선 화물탱크 (9% Ni 강), 액체수소 저장기, 우주 발사체 추진제 탱크, MRI 자기 코일 보빈, 액체 헬륨 저장조. <ExtLink href="https://en.wikipedia.org/wiki/Ductility">DBTT</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Liquefied_natural_gas">LNG</ExtLink></>}
            title="극저온 부품 (LNG 탱크 · 우주 추진제)"
            situation="-162 °C (LNG) ~ -253 °C (LH₂) ~ -269 °C (LHe) 환경 — 취성 천이 위험."
            needs={<>저온에서도 <b>충격 인성 유지</b> (Charpy ≥ 27 J at -196 °C 요구가 흔함). 자성 변화 적음 (MRI 응용). 열전도 낮음 (열침입 감소).</>}
            steps={[
              <>필터: <b>Impact Strength ≥ 100 J</b>, <b>Category = Metal</b>, fcc 결정 구조 선호 (오스테나이트계 STS).</>,
              <>Compare 의 σy·UTS·연신율·열전도도 비교. <b>FCC 구조 (AISI 304L/AISI 316L) 는 DBTT 가 없어 안전</b>.</>,
              <>상세 팝업의 출처에서 저온 시험 데이터 확인 (ASTM E1820).</>,
            ]}
            families={<>AISI 304L/AISI 316L (austenitic SS, no DBTT), 9% Ni 강 (LNG 표준), Invar 36 (정밀 저열팽창), AA 5083 (LNG cargo containment), Cu OFE.</>}
          />

          <Scenario
            n={12}
            presetKey="electrical"
            onConfigure={onConfigure}
            diagram={<SvgElectrical />}
            examples={<>전력 분배 busbar (배전반·UPS), 전동차 카테너리 접촉선, EV 충전건 접점, 반도체 lead frame, 전자석 코일. <ExtLink href="https://en.wikipedia.org/wiki/Busbar">Busbar</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/International_Annealed_Copper_Standard">%IACS</ExtLink></>}
            title="전기 전도체 (버스바 · 접점)"
            situation="고전류 (kA 급) 전달 — 줄열 손실 ↓ 와 강도·내식성 동시 요구."
            needs={<>높은 <b>전기전도도 (≥ 80 %IACS)</b>, 충분한 <b>σy</b> (가공 후 sag 방지), 항복응력 유지하면서 끌어내고 가공 가능.</>}
            steps={[
              <>필터: <b>Electrical Conductivity ≥ 80 %IACS</b>, <b>σy ≥ 200 MPa</b> (가공 강도).</>,
              <><b>Index = Cu / σy</b> 또는 <b>k / ρ</b> (방열도 함께 본다면).</>,
              <>Compare 로 σ·전도도·가격 비교. 도금 (Ag/Sn) 은 상세 팝업의 권장 코팅에서 확인.</>,
            ]}
            families={<>구리 OFE (C10100, ~101 %IACS), CuCrZr (C18150, 응력 완화 저항), 황동 C26000, 알루미늄 1350 (경량 transmission), Cu-Be C17200 (정밀 접점·스프링).</>}
          />

          <Scenario
            n={13}
            presetKey="pressure_vessel"
            onConfigure={onConfigure}
            diagram={<SvgPressureVesselSmall />}
            examples={<>수소 저장 탱크 (350·700 bar), LPG 실린더, 스팀 보일러, 화학 reactor, 공기 압축기 receiver. <ExtLink href="https://en.wikipedia.org/wiki/Pressure_vessel">Pressure vessel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/ASME_Boiler_and_Pressure_Vessel_Code">ASME BPVC</ExtLink></>}
            title="압력 용기 (수소 탱크 · 보일러)"
            situation="내압 P 에서 hoop stress σ = PD/2t 발생. 누설·파열 절대 방지."
            needs={<>충분한 <b>σy</b> (SF ≥ 3 typical ASME), <b>인성</b> (균열 진전 둔화), 부식 (수소 취화 / 황화수소 SSC) 저항. ISO 11119 / ASME VIII. <span className="text-muted-foreground">KIC 측정값이 없는 합금은 family typical (ASM Vol. 1·2, MMPDS) 로 채워져 있으며 상세의 <F>class</F> 라벨로 식별 가능합니다.</span></>}
            steps={[
              <>필터: <b>UTS ≥ 600 MPa</b>, <b>Fracture Toughness ≥ 50 MPa·√m</b>, <b>Process ⊃ Wrought</b> (단조 두께 보장).</>,
              <>Ashby 차트의 Y축 옵션 → <b>파괴 인성</b> 선택, X축 σy 로 두면 toughness-strength trade-off 가 한 눈에. 마우스 휠로 확대·더블클릭으로 reset.</>,
              <>Compare 로 σy·KIC·내식 비교. 수소 환경이면 H₂ 취화 저항 (Ni·Cr 함량) 검증.</>,
              <>상세 팝업의 ASME 표준 합금 (P-No.) 확인.</>,
            ]}
            families={<>SA-516 Gr70 (보일러), AISI 4130 / AISI 4140 (수소 탱크 라이너), AISI 304L/AISI 316L (화학 reactor), Inconel 625 (H₂S 환경), Type II/III/IV 복합재 탱크 wrap.</>}
          />

          <Scenario
            n={14}
            presetKey="gear"
            onConfigure={onConfigure}
            diagram={<SvgGear />}
            examples={<>자동차 변속기 (8AT 의 sun gear), 산업 감속기, 헬리콥터 main gearbox, 로봇 harmonic drive, 항공 엔진 액세서리 기어. <ExtLink href="https://en.wikipedia.org/wiki/Gear">Gear</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Case-hardening">Case hardening</ExtLink></>}
            title="기어 (변속기 · 감속기)"
            situation="이빨 접촉 (Hertz contact) + 굽힘 응력 + 충격 부하 + 100M 사이클 이상의 피로 환경."
            needs={<>표면 <b>경도 ≥ 600 HV</b> (접촉 피로), 코어 <b>인성 ≥ 30 J</b> (충격 흡수), Carburizing(침탄) / Nitriding(질화) / 유도 경화 적용 가능 alloy. AGMA grade 2/3.</>}
            steps={[
              <>필터: <b>Hardness 300–400 HV</b> (코어), <b>Impact ≥ 30 J</b>, <b>Process ⊃ Wrought</b>.</>,
              <>상세 팝업의 권장 후공정 — Carburizing/Nitriding/유도경화 표면 처리 alloy 만 후보.</>,
              <>Compare 의 Machinability 가 Good 이상 (가공성).</>,
            ]}
            families={<>침탄강 AISI 8620 / AISI 9310 (항공), 질화강 31CrMoV9 (산업), AISI 4140 / AISI 4340 (자동차 변속), Maraging 300 (high-end racing), 분말야금 P/M gear (저가).</>}
          />

          <Scenario
            n={15}
            presetKey="fastener"
            onConfigure={onConfigure}
            diagram={<SvgFastener />}
            examples={<>볼트·너트·스터드, 항공기 fastener (HiLok / NAS), 시추 drill pipe joint, 풍력 타워 anchor bolt, 의료 척추 pedicle screw. <ExtLink href="https://en.wikipedia.org/wiki/ISO_metric_screw_thread">ISO metric thread</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Tensile_strength">Tensile strength</ExtLink></>}
            title="체결구 (볼트 · 스터드)"
            situation="인장·전단·반복 풀림 — 토크 설계는 σ_yield 의 60-90 %로 preload."
            needs={<>등급 (ISO 898-1 Class 8.8 / 10.9 / 12.9): <b>UTS ≥ 800·1000·1200 MPa</b>, <b>σy ≥ 0.8·UTS</b>, 인장·전단 연성 모두 충족.</>}
            steps={[
              <>필터: 등급별 — <b>Class 10.9 → UTS ≥ 1000</b>, <b>σy/UTS ≥ 0.8</b>, <b>Elongation ≥ 9 %</b>.</>,
              <>고온 ↔ 저온 환경이면 사용 온도 확인 (스테인리스 A4-80 / Inconel).</>,
              <>Compare 의 부식 등급 비교. 갈바닉 부식 회피.</>,
            ]}
            families={<>Class 8.8/10.9 = AISI 4140 / AISI 4340 quenched-tempered, Class 12.9 = SCM440 표면 경화, 항공 H-11 / MP35N / Inconel 718 (제트엔진), 스테인리스 A2-70 / A4-80 (해양).</>}
          />

          <Scenario
            n={16}
            presetKey="die_mold"
            onConfigure={onConfigure}
            diagram={<SvgDieMold />}
            examples={<>플라스틱 사출 mold (스마트폰 케이스, 의료기기 housing), 열간 단조 die (자동차 크랭크), 알루미늄 다이캐스팅 mold, 압출 die (창호 알루미늄 프로파일), 인서트 절삭공구. <ExtLink href="https://en.wikipedia.org/wiki/Tool_steel">Tool steel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Injection_moulding#Cooling">Conformal cooling</ExtLink></>}
            title="다이·금형 (사출 · 단조 · 다이캐스팅)"
            situation="반복 가열·냉각, 마모, 열 피로 (heat checking), 화학적 침식 (Zn/Al 용탕). 대당 $50K–$2M."
            needs={<>고온 강도 (≥ 500 °C 유지), <b>경도 ≥ 40 HRC</b>, 열피로 저항, 절삭·EDM·연마 가능, AM 시 conformal cooling 채널.</>}
            steps={[
              <>필터: <b>Hardness ≥ 400 HV</b> (담금 후), <b>Max Service Temp ≥ 500 °C</b>, <b>Process ⊃ Wrought</b> 또는 <b>LPBF</b> (3D 프린팅 mold).</>,
              <>Compare 의 열피로 저항 + 가공성. EDM 가공성 따로 보고.</>,
              <>인서트 표면만 PVD TiAlN/CrN 권장 코팅 — 수명 3–5× 연장.</>,
            ]}
            families={<>H13 (열간 die 표준), P20 (사출 pre-hardened), S7 (shock), D2 (cold work), Maraging M300 (LPBF mold, conformal cooling), Stavax (corrosion-resistant 사출), CPM 3V (high impact PM tool).</>}
          />

          <Note tone="tip">
            공통 마무리: 후보를 좁혔으면 <b>Compare</b>에서 이름을 클릭해 차트에 위치를 확인하고, <b>상세 팝업</b>에서 범위(min–max)·<F>est.</F> 여부·온도-강도·<b>출처 데이터시트</b>를 검증한 뒤 컬렉션으로 저장/공유하세요.
          </Note>
  </>);
}
