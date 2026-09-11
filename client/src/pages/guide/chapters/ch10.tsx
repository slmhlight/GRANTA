/*
 * Guide ch10 본문 — Guide.tsx 에서 분리 (F1).
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
import { Note, H3 } from '../components';

export default function ch10Body() {
  return (<>
          <p className="leading-relaxed">처음 마주하는 부품 — "어디서 시작해야 하나?" 가장 흔한 막힘 지점. 도메인과 환경 조건 두 차원으로 30초에 첫 후보 family 를 좁힙니다.</p>

          <H3>3.1 도메인 → Family 빠른 매핑</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[24%]">도메인 (요구)</th><th className="p-2 font-semibold">우선 검토 family</th><th className="p-2 font-semibold w-[16%]">참고 사례</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">구조 + 경량 (E·σy / ρ)</td><td className="p-2">고강도 알루미늄 (Scalmalloy · AlSi10Mg · AA 7075) · 티타늄 (Ti-6Al-4V · CP grade) · 마그네슘 (AZ31)</td><td className="p-2">브래킷·항공·자동차</td></tr>
                <tr><td className="p-2 font-medium">고온 (≥ 600 °C · creep)</td><td className="p-2">Ni 초합금 (Inconel 718/625/617 · Haynes 230) · Co 합금 (L605 · Stellite) · Ti 중온(≤540 °C)</td><td className="p-2">배기·터빈·재사용 로켓</td></tr>
                <tr><td className="p-2 font-medium">내식 (해수·산·Cl⁻)</td><td className="p-2">Ni 합금 (Hastelloy C-22 · Inconel 625) · AISI 316L · Duplex (2205, UNS S32205) · Ti grade 2</td><td className="p-2">해양·반도체·화학</td></tr>
                <tr><td className="p-2 font-medium">전기 전도 (σ_elec)</td><td className="p-2">Cu (OFHC · CuCrZr) · Al 1xxx · Ag-alloy · 청동</td><td className="p-2">버스바·접점·열교환</td></tr>
                <tr><td className="p-2 font-medium">내마모 (HV·접촉)</td><td className="p-2">공구강 (D2 · H13 · M2) · WC-Co · Stellite · CoCrMo · 케이스 hardening 강</td><td className="p-2">금형·다이·베어링</td></tr>
                <tr><td className="p-2 font-medium">생체적합</td><td className="p-2">Ti-6Al-4V ELI (Grade 23) · CoCrMo (F75) · AISI 316L · CP-Ti</td><td className="p-2">임플란트·스텐트</td></tr>
                <tr><td className="p-2 font-medium">치수 안정 (저 CTE)</td><td className="p-2">Invar (Fe-Ni36) · Kovar · Pure W · Pyrex glass · CFRP</td><td className="p-2">정밀 광학·측정기</td></tr>
                <tr><td className="p-2 font-medium">경량 방열 (k/ρ)</td><td className="p-2">Al (AA 6061 · AA 1100) · Cu · 흑연 복합재 · AlSiC</td><td className="p-2">히트싱크·열교환기</td></tr>
                <tr><td className="p-2 font-medium">탄성에너지 (σy²/E)</td><td className="p-2">스프링강 (AISI 52100 · 9254) · 마레이징강 · CuBe · 글래스 섬유</td><td className="p-2">스프링·다이어프램·힌지</td></tr>
                <tr><td className="p-2 font-medium">압력 / 폭발</td><td className="p-2">압력용기 강 (A516 · A335 · P91) · Inconel 625 (수소) · AISI 4130 (라이너) · AISI 316L (화학)</td><td className="p-2">탱크·실린더·보일러</td></tr>
              </tbody>
            </table>
          </div>
          <Note tone="tip">
            <b>실무 사용.</b> 표의 family 명 (예: "Inconel") 을 앱의 검색창에 입력 → fuzzy 매칭 → 후보 표시. 또는 좌측 필터 Family Tree 에서 카테고리·family 체크.
          </Note>

          <H3>3.2 환경 조건별 적합·회피 합금</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[18%]">환경</th><th className="p-2 font-semibold w-[18%]">조건</th><th className="p-2 font-semibold">적합 합금</th><th className="p-2 font-semibold">회피·주의</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12px]">
                <tr><td className="p-2 font-medium">해수 부식</td><td className="p-2">Cl⁻ · 산화 환경</td><td className="p-2">Hastelloy · AISI 316L · Cu-Ni 90/10 · Duplex 2205 · Ti</td><td className="p-2 text-rose-700">탄소강 · AISI 304 · Al (피팅·균열)</td></tr>
                <tr><td className="p-2 font-medium">산성 (H₂SO₄·HCl)</td><td className="p-2">강산 · 고온</td><td className="p-2">Hastelloy C-22/B-3 · 904L · Ti-Pd · 탄탈럼</td><td className="p-2 text-rose-700">탄소강 · SS 일반 · Al · 청동</td></tr>
                <tr><td className="p-2 font-medium">알칼리 (NaOH)</td><td className="p-2">강염기</td><td className="p-2">Ni 200 · Inconel 600 · Monel 400 · 탄소강 (저농도)</td><td className="p-2 text-rose-700">Al · Zn · AISI 304/316 (균열)</td></tr>
                <tr><td className="p-2 font-medium">고온 (≥ 700 °C)</td><td className="p-2">대기·연소가스</td><td className="p-2">Inconel 617/625/X · Haynes 230 · MA956 · CMSX-4</td><td className="p-2 text-rose-700">탄소강 · AISI 4140 · Al · 일반 SS</td></tr>
                <tr><td className="p-2 font-medium">저온 / 극저온</td><td className="p-2">LNG (-162 °C) · 우주 (-269 °C)</td><td className="p-2">Inconel 718 · AISI 316L · 9% Ni 강 · AA 5083 · Cu</td><td className="p-2 text-rose-700">탄소강 · AISI 4140 · BCC 구조 (DBTT)</td></tr>
                <tr><td className="p-2 font-medium">방사선 (원자력·우주)</td><td className="p-2">중성자·γ·X-ray</td><td className="p-2">SS AISI 304L · Inconel 718 · Zircaloy-4 · MA956</td><td className="p-2 text-rose-700">Al · 구리 (swelling) · 폴리머</td></tr>
                <tr><td className="p-2 font-medium">마모 / 부식 복합</td><td className="p-2">슬러리·미세입자</td><td className="p-2">Stellite · WC-Co · CoCrMo · Hardfaced steel · 알루미나 코팅</td><td className="p-2 text-rose-700">연강 · Al 일반 · 폴리머</td></tr>
                <tr><td className="p-2 font-medium">수소 환경</td><td className="p-2">고압 H₂ · 700 bar</td><td className="p-2">AISI 316L · AISI 304L · Inconel 625 · AISI 4130 (라이너) · CFRP wrap</td><td className="p-2 text-rose-700">고강도 강 (AISI 4340 · maraging) · Ni-base 일부 (H-취화)</td></tr>
                <tr><td className="p-2 font-medium">갈바닉 부식</td><td className="p-2">이종 금속 접촉</td><td className="p-2">같은 family 통일 · 절연 와셔 · 캐소드 가드</td><td className="p-2 text-rose-700">Al + steel 직접 접촉 · Cu + Zn 결합</td></tr>
                <tr><td className="p-2 font-medium">미생물 부식 (MIC)</td><td className="p-2">정체 수·황화수소</td><td className="p-2">Cu · 6Mo SS (254 SMO) · Ti</td><td className="p-2 text-rose-700">탄소강 · AISI 304 · Al</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">출처: ASM Handbook Vol. 13 (Corrosion); NACE MR0175 (Sulfide stress cracking); ASME B&PV Sec. VIII; NASA TM-2001-210803 (Cryogenic alloys).</p>

          <Note tone="warn" title="환경 조건이 복잡하면">
            여러 환경 (예: 해수 + 고온 + 마모) 이 동시에 발생하면 위 표의 교집합 + 표면 처리 (PVD · DLC · anodize) + 정기 검사 (NDT) 까지 함께 고려하세요. 단일 합금 만으로 모든 환경 대응 불가능.
          </Note>
  </>);
}
