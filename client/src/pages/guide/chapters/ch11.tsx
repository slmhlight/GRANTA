/*
 * Guide ch11 본문 — Guide.tsx 에서 분리 (F1).
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


export default function ch11Body() {
  return (<>
          <p className="leading-relaxed">교과서가 잘 가르치지 않는 실패 패턴들. 모두 실제 산업에서 보고된 사례 기반입니다.</p>
          <div className="space-y-3 mt-3">
            {[
              { n: 1, tag: '강도 vs 인성', t: 'σy 만 보고 인성 무시', d: 'tool steel (D2 · M2 · H13) 의 σy 는 1500 MPa+ 지만 KIC 가 15–25 MPa√m 로 매우 낮음. 결함·노치 있으면 변형 없이 파단. 정적 응력만 보고 선택 → 진동·낙하·열충격에서 깨짐.', fix: '취성 재료는 KIC + 사용 환경의 미세 균열 가능성 검토. Ti / Inconel 대체 검토.' },
              { n: 2, tag: 'AM 이방성', t: 'AM Ti6Al4V 의 Z 방향 피로 무시', d: 'LPBF 빌드 Z 방향 피로가 XY 의 30~70% 수준. 회전축·날개 부품을 Z 방향으로 빌드 후 시제품 시험에서 조기 파괴.', fix: '응력이 한 방향이면 그 방향을 XY 평면에 배치. HIP 처리로 기공·이방성 동시 감소. AM 챕터 참고.' },
              { n: 3, tag: '표면 거칠기', t: '표면 처리 무시 → 피로 50% ↓', d: 'AM as-built 표면 Ra ~25 μm 또는 절삭 직후 Ra ~3 μm 도 피로 강도 감소. 노치 효과 (Kf ≈ 1.5~3) 로 σf 가 1/2 까지.', fix: '회전·반복 하중 부품은 polishing (Ra ≤ 0.8 μm) 또는 shot peening (잔류 압축응력 부여) 필수.' },
              { n: 4, tag: '갈바닉 부식', t: 'Al + Steel 직접 접촉', d: 'Al 과 Steel 의 갈바닉 전위차로 Al 쪽 급속 부식. 해양·습한 환경에서 6 개월 내 파공 사례.', fix: '같은 family 통일 또는 절연 와셔 (PTFE · 나일론) 삽입. 캐소드 보호 (희생 양극).' },
              { n: 5, tag: '노치 효과', t: 'Sharp corner / 구멍 모서리 stress concentration 무시', d: 'σ_max = Kt · σ_nom (Kt 보통 2~4). SF 가 sufficient 라도 노치 부근만 응력 집중 → 균열 시작.', fix: '구멍·모서리에 fillet radius 적용 (r ≥ 1/4 board thickness). FEA 로 stress concentration 확인.' },
              { n: 6, tag: '용접성', t: 'AM AlSi10Mg 부품 용접', d: 'AlSi10Mg 는 SiAl 공정 사출 미세조직 — 용접 시 균열 (porosity, crack). Vendor datasheet 의 용접성 정보 누락.', fix: '용접 필요 시 wrought AA 6061 또는 AA 5052 로 대체. AM 부품은 mechanical fastening (bolt) 또는 friction stir welding 검토.' },
              { n: 7, tag: 'H 취화', t: '고강도 강 (AISI 4340 · maraging) + 수소 환경', d: 'σy > 1000 MPa 고강도 강은 H₂ 가스 / 산세 / 도금 (Cd · Zn) 에서 수소 흡수 → 지연 파괴. 우주·압력용기 인명 사고 보고.', fix: 'σy ≤ 900 MPa 강 또는 AISI 316L / Inconel 625. 도금 후 baking (200 °C / 24 h) 으로 수소 제거.' },
              { n: 8, tag: '저온 취성', t: '탄소강을 LNG (-162 °C) 환경에 사용', d: 'BCC 결정 (탄소강 · AISI 4140) 은 DBTT (Ductile-Brittle Transition Temperature) 이하에서 갑자기 취성화. -50 °C 이하에서 충격 인성 1/10 까지.', fix: 'FCC 결정 (AISI 316L · AISI 304L · 9% Ni 강 · Al · Cu) 사용. Charpy V-notch 시험으로 사용 온도 -10 °C 이하에서도 27 J 이상 확인.' },
              { n: 9, tag: '열팽창 mismatch', t: '이종 재료 조합 정밀 부품에서 CTE 무시', d: 'Al (CTE 23) + Steel (12) 가 같은 부품에 있으면 100 °C 온도 변화에서 mismatch 0.1% — 정밀 광학·전자에서 치명적.', fix: 'Invar (CTE 1.3) · Kovar (5.5) · CFRP (≈0) 같은 저 CTE 재료. 또는 Si 같은 substrate 와 매칭.' },
              { n: 10, tag: '데이터 confidence 무시', t: 'class · derived 라벨을 측정값처럼 설계에 사용', d: 'KIC 가 class 라벨 = family 평균 추정. 동일 alloy 의 다른 heat 에서 ±30% 변동. fatigue derived 도 동일.', fix: '인증·시제품 단계에서 측정값 또는 vendor datasheet 측정 항목 확보. detail 의 confidence 라벨 항상 확인. Ch.13 datasheet 섹션 참고.' },
            ].map((m) => (
              <div key={m.n} className="rounded border border-rose-200 bg-rose-50/50 p-3">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[11px] font-bold text-rose-700">#{m.n}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 font-mono">{m.tag}</span>
                  <span className="text-sm font-semibold text-foreground">{m.t}</span>
                </div>
                <p className="text-[12.5px] text-foreground/85 leading-relaxed"><b className="text-rose-700">상황:</b> {m.d}</p>
                <p className="text-[12.5px] text-foreground/85 leading-relaxed mt-1"><b className="text-emerald-700">처방:</b> {m.fix}</p>
              </div>
            ))}
          </div>
  </>);
}
