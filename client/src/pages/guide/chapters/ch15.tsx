/*
 * Guide ch15 본문 — Guide.tsx 에서 분리 (F1).
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
import { F, Note, ExtLink, Chapter, H3 } from '../components';

export default function ch15Body() {
  return (<>
          <Note tone="tip" title="이 챕터의 출처">
            <p>본 chapter 는 <b>1차 자료</b> 기반: ASM Metals Handbook Desk Edition 2nd (1998) · MMPDS-08 (April 2013) · 풍산 Copper Alloy Products 2025 · 현대제철 종합 카탈로그 2025 · POSCO product handbook. 자세한 원본은 본 저장소의 <code className="bg-muted px-1 rounded text-[12px]">data/general-knowledge/</code> 디렉토리 (9 markdown 파일). 여기서는 핵심만 요약.</p>
          </Note>

          {/* 14.1 — Steel + Stainless */}
          <H3>14.1 Steel + Stainless (탄소강·합금강·스테인리스) — ASM Vol.1·2</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>AISI/SAE 4-digit 명명법</b> — 첫 2자리 = 합금 계열 (10xx=carbon, 41xx=Cr-Mo, 43xx=Ni-Cr-Mo, 86xx=Ni-Cr-Mo), 뒤 2자리 = 탄소량 × 100 (예: AISI 1045 = 0.45%C, AISI 4140 = Cr-Mo + 0.40%C).</li>
            <li><b>4단계 열처리</b> = Annealing (전체 풀림) → Normalizing (공냉 결정립 균질) → Quenching (급랭 Martensite) → Tempering (변태 응력 완화). <F>TTT/CCT/Jominy</F> 곡선으로 경화능 (hardenability) 예측.</li>
            <li><b>Stainless 5 family</b>: ① Austenitic (AISI 304/316, FCC, 비자성, 인성 ↑) ② Ferritic (AISI 430, BCC, Mg/Cr 자성, 비싼 Ni 회피) ③ Martensitic (AISI 410/420, Q+T, 칼날) ④ Duplex (2205, α+γ 혼합, 강도+부식) ⑤ PH (17-4PH H900, 석출 경화).</li>
            <li><b>부식 메커니즘</b> 5: passivation (Cr₂O₃ 막) · pitting (Cl⁻ 침공) · sensitization (450-850°C, Cr 결정립계 carbide) · SCC (응력+환경) · galvanic (이종금속).</li>
            <li><b>경도 변환</b>: HRC ≈ HV/10 (대략, 글로서리와 통일 — HV 300≈HRC 30, HV 500≈HRC 49, HV 600≈HRC 55), HB ≈ HV × 0.95 (단, 700 HV 초과 시 HRC 표만 사용). 정확값은 ASTM E140 표 (비선형).</li>
            <li><b>한국·일본·EU 매핑</b>: SUS304 (JIS) = STS304 (KS) = AISI 304 = EN 1.4301. SCM440 (JIS/KS) = AISI 4140.</li>
            <li className="text-muted-foreground">출처: ASM Desk Edition Section "Carbon and Alloy Steels" + "Stainless Steels" + ASTM E140 + KS D 3705/3753.</li>
          </ul>

          {/* 14.2 — Aluminum */}
          <H3>14.2 Aluminum (Wrought + Cast) — ASM Vol.2 · MMPDS Ch.3</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>Wrought 4-digit designation</b>: 1xxx (≥99.0% Al) · 2xxx (Al-Cu, AA 2024 항공) · 3xxx (Al-Mn, AA 3003 캔) · 4xxx (Al-Si, 용접 wire) · 5xxx (Al-Mg, AA 5083 해양) · 6xxx (Al-Mg-Si, AA 6061 범용·압출) · 7xxx (Al-Zn-Mg, AA 7075 항공) · 8xxx (Al-Li, 2090/2195 우주).</li>
            <li><b>Temper code</b>: F (제조 그대로) · O (annealed) · H (cold-worked, H12 = 1/4 hard) · T (heat-treated, T6 = solution + artificial aging peak, T7 = overaged for SCC) · W (solution unstable).</li>
            <li><b>Aging 석출상</b>: 2xxx → θ' (Al₂Cu); 6xxx → β' (Mg₂Si); 7xxx → η' (MgZn₂); 8xxx Al-Li → T1 (Al₂CuLi) + δ' (Al₃Li).</li>
            <li><b>SCC 회피</b>: 7xxx → T7 (overaged); 2xxx → Alclad (pure Al 표면 layer); 5xxx → ≤200°C (β phase 회피).</li>
            <li><b>Cl⁻ 환경 추천</b>: AA 5083/5086 (해양 hull) · AA 5052 (자동차 외부) · AA 6063 (건축 외장). 회피: AA 2024 (T3 시 SCC 위험), AA 7075 (T6).</li>
            <li className="text-muted-foreground">출처: ASM Desk Edition Section "Aluminum and Aluminum Alloys" + MMPDS-08 Chapter 3 intro + Aluminum Association datasheets.</li>
          </ul>

          {/* 14.3 — Titanium */}
          <H3>14.3 Titanium (CP · α · β · α+β) — ASM Vol.2 (Rodney R. Boyer)</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>β-transus</b> = α(HCP) → β(BCC) 변태 온도. Ti-6Al-4V β-transus ≈ 995°C. 이 위 = β anneal, 아래 = α+β mill anneal.</li>
            <li><b>5 family</b>: ① α (CP-Ti Grades 1-4, 무열처리 가능) ② near-α (Ti-6242, 고온 ≤500°C) ③ α+β (Ti-6Al-4V 표준, ≤315°C) ④ near-β (Ti-10-2-3) ⑤ β (Ti-15-3, 냉간 성형 가능).</li>
            <li><b>열처리 modes</b>: MA (Mill Annealed, default) · BA (β-Annealed, 우수한 인성) · STA (Solution + Aged, 최대 강도, β-transus 아래에서 solution) · Duplex annealed (모두 안정성).</li>
            <li><b>한계</b>: 산화 (≥600°C 빠른 산화, 600°C 초과 시 Al/Sn 보호 코팅) · 갈링 (Ti vs Ti 또는 Ti vs 스테인리스 — DLC 또는 nitride 코팅).</li>
            <li><b>표준</b>: CP Grades 1-12 (ASTM B265 sheet) · ASTM F-series 의료 (F67 CP, F136 Ti-6Al-4V ELI) · AMS 항공.</li>
            <li className="text-muted-foreground">출처: ASM Desk Edition "Titanium and Titanium Alloys" (Boyer 1998) + ASTM F67/F136 + AMS 4928/4965.</li>
          </ul>

          {/* 14.4 — Ni superalloy */}
          <H3>14.4 Nickel superalloy (γ + γ' + γ") — ASM Vol.6 (Matt Donachie)</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>3 결정구조</b>: γ (FCC matrix, disordered Ni-Cr) · γ' (Ni₃(Al,Ti) L1₂, ordered, 강화 핵심) · γ" (Ni₃Nb DO₂₂ tetragonal, Inconel 718 특화).</li>
            <li><b>강화 메커니즘</b> = APB energy (γ' 통과 dislocation cost) + coherency strain (격자 mismatch). γ' 부피분율 50-65% 가 peak strength (e.g. CMSX-4).</li>
            <li><b>TCP phase 회피</b>: σ · μ · Laves phase (Ni-Nb-Ti) — 장시간 사용 시 carbide → TCP. 화학 조성 균형 (Md 또는 PHACOMP 계산).</li>
            <li><b>Family</b>: ① Solution-strengthened (Hastelloy X, 625) ② γ' wrought (Waspaloy, U720) ③ γ' cast CC/DS/SX (René N5, CMSX-4) ④ γ" (718, 706) ⑤ ODS (MA754, Y₂O₃ 분산).</li>
            <li><b>표면 강화</b>: aluminide (Al diffusion, 1100°C) + MCrAlY (Co-Cr-Al-Y bond coat) + TBC (YSZ top coat, 1500°C 보호).</li>
            <li><b>AM 표준 powder</b>: Inconel 718 (LPBF 가장 흔함), 625 (절삭), Hastelloy X (LPBF + HIP). EOS · Renishaw · SLM Solutions 표준.</li>
            <li className="text-muted-foreground">출처: ASM Desk Edition "Superalloys" (Donachie 1998) + Special Metals tech bulletins + Renishaw/EOS AM datasheets.</li>
          </ul>

          {/* 14.5 — Copper */}
          <H3>14.5 Copper alloys — 풍산 Copper Alloy Products 2025 · ASM Vol.2</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>UNS C-series</b>: C1xxxx (high-Cu OFC/DLP/DHP) · C2xxxx (brass Cu-Zn) · C3xxxx (leaded brass) · C5xxxx (phosphor bronze Cu-Sn) · C6xxxx (Al/Si/Mn bronze) · C7xxxx (nickel silver Cu-Ni-Zn) · C9xxxx (cast).</li>
            <li><b>Temper code</b>: O (annealed soft) · 1/4H · 1/2H · 3/4H · H (full hard) · EH (extra hard) · Spring temper. Cold rolling 이 주된 강화 메커니즘.</li>
            <li><b>부식 환경</b>: 우수 → atmosphere (Cu, brass), 담수 (90/10 brass), 해수 (Al-bronze C6300, Cu-Ni 70/30 C71500). 회피 → ammonia (Cu, brass SCC), H₂S (Cu sulfide), 강산.</li>
            <li><b>피로 ≈ σ_UTS/3</b> rule (annealed) ~ σ_UTS/2 (cold-worked H).</li>
            <li><b>8 fabrication property rating</b>: cold formability · hot formability · forgeability · machinability · soldering · brazing · oxyacetylene · GMAW (vendor catalog 표).</li>
            <li><b>한국·일본·미국·EN 매핑</b>: C10200 = OFC = JIS C1020 = KS C1020 = Cu-OFE. C26800 = JIS C2680 = KS C2680 = CuZn35.</li>
            <li className="text-muted-foreground">출처: 풍산 카탈로그 2025 + ASM Vol.2 "Copper Alloys" + KS D 5101/5102/5506.</li>
          </ul>

          {/* 14.6 — Korean KS grades */}
          <H3>14.6 한국 KS 강종 (Hyundai Steel + POSCO catalog 2025)</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>SS/SM (일반·용접 구조)</b>: KS D 3503 SS (구 SS400 → 신 SS275) · KS D 3515 SM490A/B/C (Charpy 27J @ 없음/0°C/-20°C). 한국 다리·선박·LPG 탱크 표준. EN S275JR/S355J0/J2 등가.</li>
            <li><b>SHN (내진 H형강)</b> KS D 3866: SHN275 / 355 / 420 / 460 — <F>항복비 (YR=YS/UTS) ≤ 85%</F> 강제 → 항복 후 가공경화 여유, 내진 ductility 핵심. 한국 고층·내진 건축.</li>
            <li><b>SD (철근)</b> KS D 3504: SD400/500/600/700 (기본), SD-W (weldable, CE ≤ 0.50%), SD-S (seismic, YR ≤ 1.25). ASTM A615 G60/G75 / A706 등가.</li>
            <li><b>SAPH (자동차 hot rolled)</b> JIS G 3113: 차체 frame · chassis. SAPH440 = 현대·기아 OEM 표준.</li>
            <li><b>SPFH/SPFC (자동차 고장력)</b>: SPFH590 (hot rolled) / SPFC780 (cold rolled). DP980 · TRIP780 · TWIP1180 — AHSS 영역. 한국 차체 무게 감량 + 충돌 안전.</li>
            <li><b>SGCC/SGC (도금)</b> KS D 3506: Z140-Z275 (140-275 g/m² 양면 합). 건축 외장 · 가전 · 자동차 underbody. EN DX51D+Z / HX300LAD+Z 등가.</li>
            <li><b>STK/STKM (강관)</b>: KS D 3566 (일반구조 STK490) · KS D 3517 (기계구조 STKM13B, cold drawn). EN 10210 / SAE 1018-1022 등가.</li>
            <li><b>SPA-H (내후성)</b> KS D 3542: ASTM A242 / Cor-Ten A 등가. Cu+Cr+Ni → 대기 부식 4-8× ↓. 인천대교 · 세종 다리.</li>
            <li><b>POSCO 특수강</b>: PosMAC (Zn-Mg-Al, ZM coated steel) · TWIP1180 / DP980 (AHSS) · 9% Ni (LNG -162°C, ASTM A553 Type I) · CGO 0.27 (Goss texture electrical steel).</li>
            <li className="text-muted-foreground">출처: Hyundai Steel Product Guide 2025 (PART 1+2) + POSCO product handbook + KS D 3503/3504/3506/3515/3517/3542/3566/3866 + JIS G 3106/3113/3134.</li>
          </ul>

          {/* 14.7 — MMPDS statistical basis */}
          <H3>14.7 MMPDS 통계적 기준 (A-Basis / B-Basis / S-Basis / Typical)</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>A-Basis</b> (T99) = 99% of the population exceeds, with 95% confidence (Lower Tolerance Bound). 항공기 critical 부품 (single load path).</li>
            <li><b>B-Basis</b> (T90) = 90% of the population exceeds, with 95% confidence. 항공기 redundant load path 부품.</li>
            <li><b>S-Basis</b> = Specification minimum — material spec sheet 최소값 (통계적 아님, contractor 표준).</li>
            <li><b>Typical</b> = 평균 (mean), 설계용으로 사용 금지 (표준 아님).</li>
            <li><b>Lower Tolerance Bound 공식</b>: T_p = mean - k(p, c, n) · stdev. k 값은 sample 크기 n, confidence c, 비율 p 에 의존 (statistical tables).</li>
            <li><b>사용 시기</b>: aerospace primary structure → A-Basis. Secondary structure / redundant → B-Basis. 일반 industrial → Typical 가능 (안전계수로 보정).</li>
            <li className="text-muted-foreground">출처: MMPDS-08 (April 2013) Chapter 1.4 + 9 (Statistical Methods) + FAA AR-03/57.</li>
          </ul>

          {/* 14.8 — Pure metals */}
          <H3>14.8 Pure metals physical table — ASM Desk Edition Appendix</H3>
          <p className="text-sm leading-relaxed mt-1">합금 베이스 metal 의 melting/boiling/density/E/crystal 표 — 주요 원소 (Al, Be, Co, Cr, Cu, Fe, Mg, Mn, Mo, Nb, Ni, Pb, Si, Sn, Ta, Ti, U, V, W, Zn, Zr) + 귀금속 (Au, Ag, Pt, Pd) + 희토류. <F>Allotropic transformation</F> 정리: Fe (α→γ 912°C, γ→δ 1394°C) · Ti (α→β 882°C) · Mn (4 형태) · Sn (gray→white 13.2°C).</p>
          <p className="text-sm text-muted-foreground mt-1">출처: ASM Desk Edition Appendix "Property Data for Elements" + NIST WebElements.</p>

          {/* 14.9 — MMPDS-08 steel allowables */}
          <H3>14.9 MMPDS-08 Steel allowables (AISI 4130, AISI 4340, 8740, 300M, D6AC)</H3>
          <p className="text-sm leading-relaxed mt-1">MMPDS-08 Chapter 2 의 high-strength low-alloy 강 design values: <b>AISI 4130</b> (HT-125 / HT-150, Cr-Mo 항공 frame) · <b>AISI 4340</b> (HT-150~260, Ni-Cr-Mo 고강도) · <b>8740</b> (Ni-Cr-Mo 변형) · <b>300M</b> (Si-modified AISI 4340, landing gear) · <b>D6AC</b> (ultra-high-strength 항공). Ftu/Fty/Fcy/Fsu/Fbru/E 표 (SI 변환 포함).</p>
          <p className="text-sm text-muted-foreground mt-1">출처: MMPDS-08 Chapter 2 + FAA AR-03/57 (low-alloy steels).</p>

          {/* 외부 학습 자료 */}
          <Note tone="info" title="더 자세히 — 외부 학습 자료">
            <ul className="list-disc pl-5 space-y-1 text-[13px]">
              <li><ExtLink href="https://www.asminternational.org/digital-library">ASM Digital Library</ExtLink> — Vol.1 (Properties and Selection: Irons, Steels) · Vol.2 (Nonferrous) · Vol.4 (Heat Treating) · Vol.6 (Welding) (subscription)</li>
              <li><ExtLink href="https://www.matweb.com/">MatWeb</ExtLink> — UNS/KS/JIS/EN spec 검색 (한정 무료)</li>
              <li><ExtLink href="https://www.doitpoms.ac.uk/">DoITPoMS (Cambridge)</ExtLink> — phase diagram · 결정학 · 강화 메커니즘 무료 강좌</li>
              <li><ExtLink href="https://www.specialmetals.com/documents/technical-bulletins/">Special Metals Technical Bulletins</ExtLink> — Inconel 시리즈 1차 datasheet (PDF)</li>
              <li><ExtLink href="https://www.aluminum.org/standards">The Aluminum Association</ExtLink> — Wrought + Cast designation 공식 등록</li>
              <li><ExtLink href="https://www.poongsan.co.kr/">Poongsan Corporation</ExtLink> — UNS C-series + KS D 5101/5102/5506 strip grade</li>
              <li><ExtLink href="https://www.hyundai-steel.com/">Hyundai Steel Corporation</ExtLink> — KS D 3503/3504/3506/3515/3866 카탈로그</li>
              <li><ExtLink href="https://www.posco.com/">POSCO</ExtLink> — PosMAC · GIGA STEEL · 9% Ni · CGO electrical steel</li>
              <li><ExtLink href="https://ntrl.ntis.gov/NTRL/dashboard/searchResults/titleDetail/AR0357.xhtml">FAA AR-03/57 (MMPDS Statistical Methodology)</ExtLink> — A-Basis · B-Basis 공식 derivation</li>
            </ul>
          </Note>
  </>);
}
