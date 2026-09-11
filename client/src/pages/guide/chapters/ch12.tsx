/*
 * Guide ch12 본문 — Guide.tsx 에서 분리 (F1).
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
import { Note, H3 } from '../components';

export default function ch12Body() {
  return (<>
          <p className="leading-relaxed">앱이 후보를 좁힌 후, 실제 양산·인증까지 가는 세 단계 (인증 적합성 → 가공 가능성 → 시제품 검증) 의 핵심.</p>

          <H3>11.1 산업·인증 매핑 (Compliance)</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[20%]">산업·인증</th><th className="p-2 font-semibold w-[18%]">규격</th><th className="p-2 font-semibold">적합 합금 (예시)</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">항공기 구조</td><td className="p-2">AS9100 · NADCAP · FAA 14 CFR 25</td><td className="p-2">Ti-6Al-4V (AMS 4928) · Inconel 718 (AMS 5663) · AA 7075-T7 · AA 2024-T3 · AISI 4340 · 17-4 PH</td></tr>
                <tr><td className="p-2 font-medium">의료 임플란트</td><td className="p-2">ISO 13485 · ISO 10993 · FDA 510(k)</td><td className="p-2">Ti-6Al-4V ELI (Grade 23) · CoCrMo (ASTM F75) · AISI 316L (ASTM F138) · CP-Ti Grade 4</td></tr>
                <tr><td className="p-2 font-medium">압력 용기</td><td className="p-2">ASME B&PV Sec.VIII · ASME P-No. matching</td><td className="p-2">SA-516 Gr70 (보일러) · SA-240 Type 304/AISI 316L (화학) · SA-335 P91 (발전소) · Inconel 625 (H₂)</td></tr>
                <tr><td className="p-2 font-medium">석유·가스 (sour)</td><td className="p-2">NACE MR0175 / ISO 15156</td><td className="p-2">Inconel 625 · Hastelloy C-276 · AISI 316L (제한적) · Duplex 2205 (제한적)</td></tr>
                <tr><td className="p-2 font-medium">원자력 1st loop</td><td className="p-2">ASME Sec.III · ASME NQA-1</td><td className="p-2">SA-508 Cl.3 · Inconel 600/690 · Zircaloy-4 · AISI 316L</td></tr>
                <tr><td className="p-2 font-medium">건축 구조강</td><td className="p-2">AISC · EUROCODE 3 · KBC 2022</td><td className="p-2">A36 · A572 Gr50 · A992 · A500 Gr B</td></tr>
                <tr><td className="p-2 font-medium">자동차 (EU)</td><td className="p-2">RoHS · REACH · ELV</td><td className="p-2">대부분 합금 — Pb·Cd·Cr⁶⁺ 제한. 일반 stainless · Al · 강 OK.</td></tr>
                <tr><td className="p-2 font-medium">식품·음료</td><td className="p-2">FDA 21 CFR 177 · NSF/ANSI 51</td><td className="p-2">AISI 316L · AISI 304L · 2205 · Hastelloy C-22 (acid)</td></tr>
                <tr><td className="p-2 font-medium">군용</td><td className="p-2">MIL-DTL · MIL-STD</td><td className="p-2">MIL-S-46100 (장갑) · MIL-T-9046 (Ti) · MIL-A-46100 (Al)</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">앱의 detail 패널에 <b>RoHS / SVHC 자동 검출</b> + 사례 챕터의 families 절에 industry 적용 예시 표시. 정확한 인증은 vendor lot certificate 와 함께 확인 必.</p>

          <H3>11.2 가공·제조 가능성 (Manufacturability)</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[20%]">공정</th><th className="p-2 font-semibold w-[12%]">평가 지표</th><th className="p-2 font-semibold">고려사항</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">절삭 (machining)</td><td className="p-2 font-mono">Machinability rating (AA 1100 = 100%)</td><td className="p-2">AA 6061 = 70% · AISI 1018 강 = 70% · AISI 4140 = 60% · 304 SS = 40% · Ti-6Al-4V = 22% · Inconel 718 = 12% · CoCrMo = 10%. 가공시간 = (100/MR) × 기본. 절삭유·공구 마모도 비례.</td></tr>
                <tr><td className="p-2 font-medium">용접 (welding)</td><td className="p-2 font-mono">CET (Carbon Equivalent) · Schaeffler diagram</td><td className="p-2">CET &lt; 0.4 = pre-heat 불요. CET 0.4–0.6 = 150–200 °C pre-heat. CET &gt; 0.6 = 위험 (예: AISI 4340 · maraging). Stainless 는 Schaeffler diagram 으로 Cr/Ni eq 평가.</td></tr>
                <tr><td className="p-2 font-medium">성형 (forming)</td><td className="p-2 font-mono">N-value (변형 경화 지수) · r-value</td><td className="p-2">Deep drawing 은 n &gt; 0.2, r &gt; 1.4 권장. 304 SS / 6022-T4 Al 우수. AA 7075 / 마라징 어려움.</td></tr>
                <tr><td className="p-2 font-medium">단조 (forging)</td><td className="p-2 font-mono">Forgeability rating</td><td className="p-2">Al · AISI 1018 강 우수. Ti · Ni superalloy 는 좁은 온도창 (Ti-6Al-4V 950–1000 °C). 정밀 단조 (closed die) 는 부품마다 다이 비용 ↑.</td></tr>
                <tr><td className="p-2 font-medium">주조 (casting)</td><td className="p-2 font-mono">유동성 · 수축률 · 결함률</td><td className="p-2">Investment casting (Ti · CoCrMo · 304SS · Inconel 718) — 정밀 ±0.5%. Die casting (Al · Zn · Mg). Sand casting (탄소강 · Al · 청동).</td></tr>
                <tr><td className="p-2 font-medium">AM (LPBF · EBM · DED)</td><td className="p-2 font-mono">분말 spec · 빌드 방향 · 후처리</td><td className="p-2">표준화된 alloy 만 (Ti-6Al-4V · Inconel 718 · 17-4 PH · AISI 316L · AlSi10Mg · CoCrMo). HIP 후처리로 ±20% 성능 변동. <a href="#ch9" className="text-accent hover:underline">Ch.10 AM 특화</a> 참고.</td></tr>
                <tr><td className="p-2 font-medium">표면처리</td><td className="p-2 font-mono">밀착성 · 두께 · 환경 적합성</td><td className="p-2">Al 양극산화 (anodize) · 강 도금 (Zn · Cd · Cr) · Ti TiN/DLC · stainless passivation. 의료 임플란트는 micro arc oxidation 또는 plasma electrolytic oxidation.</td></tr>
              </tbody>
            </table>
          </div>

          <H3>11.3 시제품 시험 → 결과 해석</H3>
          <p className="text-sm leading-relaxed">앱에서 좁힌 후보 (보통 1–3개) 의 실제 시제품 시험은 데이터시트와 비교해 차이를 해석하는 단계.</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[18%]">시험</th><th className="p-2 font-semibold w-[20%]">표준</th><th className="p-2 font-semibold">목적·해석</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">인장 (Tensile)</td><td className="p-2">ASTM E8/E8M · ISO 6892</td><td className="p-2">σy · UTS · El 측정. 시편 5 개 이상으로 평균 ± 표준편차. 데이터시트 minimum 의 ±5% 이내면 정상.</td></tr>
                <tr><td className="p-2 font-medium">압축 (Compression)</td><td className="p-2">ASTM E9</td><td className="p-2">취성 재료 · cellular structure · AM lattice 평가.</td></tr>
                <tr><td className="p-2 font-medium">충격 (Charpy)</td><td className="p-2">ASTM E23 · ISO 148-1</td><td className="p-2">노치 인성 (J). 저온 (-40 °C) 시험으로 DBTT 평가. 27 J 이상 = ductile.</td></tr>
                <tr><td className="p-2 font-medium">경도 (Hardness)</td><td className="p-2">ASTM E384 (HV) · E18 (HRC) · E10 (HB)</td><td className="p-2">10 회 측정 후 표준편차. 경화층 깊이 (case depth) 도 마이크로 비커스로.</td></tr>
                <tr><td className="p-2 font-medium">피로 (Fatigue)</td><td className="p-2">ASTM E466 · ISO 12107</td><td className="p-2">S-N 곡선 (10⁴–10⁷ cycles). 시편 10–20 개. Weibull 분포로 B10 (90% survival) 값 추출.</td></tr>
                <tr><td className="p-2 font-medium">파괴인성 (KIC)</td><td className="p-2">ASTM E399 · E1820 (J-int)</td><td className="p-2">두께 충분해야 plane strain. AM 부품은 빌드 방향별 측정 必.</td></tr>
                <tr><td className="p-2 font-medium">CT 스캔 (NDT)</td><td className="p-2">ASTM E1441 · E1570</td><td className="p-2">내부 기공·균열·LOF. AM 부품 100% 또는 sampling.</td></tr>
                <tr><td className="p-2 font-medium">FPI · PT (표면 NDT)</td><td className="p-2">ASTM E1417 · E165</td><td className="p-2">표면 균열 검출. 모든 critical 부품.</td></tr>
                <tr><td className="p-2 font-medium">금속현미경</td><td className="p-2">ASTM E407 (etch)</td><td className="p-2">미세조직 (grain size · phase) 확인. AM 부품 빌드 방향 비교.</td></tr>
                <tr><td className="p-2 font-medium">파괴 분석 (Fractography)</td><td className="p-2">SEM 관찰</td><td className="p-2">파면 분석 — ductile (dimple), brittle (cleavage), fatigue (striations). 실패 원인 진단의 핵심.</td></tr>
              </tbody>
            </table>
          </div>
          <Note tone="tip" title="결과가 데이터시트와 다르면">
            <ol className="list-decimal pl-5 space-y-1 mt-1">
              <li><b>시험 조건 확인</b>: 시편 크기, 변형 속도, 온도, 표면 마감 — 표준 어겼는지.</li>
              <li><b>제조 조건 확인</b>: heat treatment, build direction (AM), batch, vendor lot.</li>
              <li><b>데이터시트 base 확인</b>: typical 또는 A-basis (99%) 또는 B-basis (90%). Confidence 라벨 도 확인.</li>
              <li><b>샘플 수 확인</b>: n=3 측정으로 ±10% 변동은 정상. n &gt; 10 이어야 통계적 신뢰.</li>
              <li><b>vendor 확인</b>: 같은 alloy 도 vendor 간 ±5–20% 차이 일반.</li>
            </ol>
          </Note>
  </>);
}
