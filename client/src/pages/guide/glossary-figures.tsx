/*
 * R227/E14/H4c — 글로서리 A4 도표 레지스트리 (matplotlib → PNG).
 * PNG 는 scripts/gen-glossary-figures.py 로 생성(client/src/assets/glossary/*.png), Vite 가 번들.
 * 3D 결정격자(mplot3d) + 겹침 없는 2D 개략 그래프. 개략(schematic)이며 정밀 측정값 아님.
 * 실제 현미경 사진 등은 추후 같은 폴더에 추가하고 CAPTIONS·article 에서 참조 가능.
 */
import type { ReactElement } from 'react';

// Vite: 폴더의 PNG 를 번들 (경로 → url). glob 패턴은 현재 파일 기준 상대경로 리터럴.
const pngs = import.meta.glob('../../assets/glossary/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const URLS: Record<string, string> = {};
for (const [p, url] of Object.entries(pngs)) {
  const id = p.split('/').pop()!.replace(/\.png$/, '');
  URLS[id] = url;
}

const CAPTIONS: Record<string, string> = {
  'iron-carbon':
    '그림 · 철–탄소(Fe–C) 상태도 개략. 오스테나이트(γ, FCC)는 고온상이며 냉각 시 조성에 따라 페라이트(α)·펄라이트·시멘타이트(Fe₃C)로 분해된다. 공석점 = 0.76 %C · 727 °C.',
  'ttt-curve':
    '그림 · 항온변태(TTT) 다이어그램 개략. 초록 실선이 변태 시작 곡선, 보라 파선이 변태 완료 곡선이며 그 사이 음영에서 변태가 진행된다. 코(nose)에서 변태가 가장 빠르다. 급랭(파랑)이 코를 왼쪽으로 피하면 확산변태를 건너뛰고 Ms 이하에서 마르텐사이트가, 서랭(주황)은 코를 통과해 펄라이트가 된다.',
  'martensite-lattice':
    '그림 · 무확산 전단변태(3D 단위격자). 급랭으로 탄소가 빠져나갈 시간이 없어, FCC 오스테나이트가 탄소 과포화된 체심정방(BCT) 마르텐사이트로 격자가 전단·왜곡된다(c>a). 침입형 탄소(◆)가 만드는 격자 변형이 높은 경도·취성의 근원.',
  'fcc-bcc':
    '그림 · FCC 오스테나이트(γ)와 BCC 페라이트(α)의 3D 단위격자. FCC 는 격자 사이 빈틈이 커 탄소 고용도가 크고(최대 ~2.1 %), BCC 는 작다(~0.02 %). 이 차이가 냉각 시 상변태의 구동력이 된다.',
  'tempering-curve':
    '그림 · 뜨임 온도에 따른 경도(적)·인성(청) 개략. 온도를 높일수록 경도는 내려가고 인성은 올라간다. 일부 강은 약 250–400 °C 구간에서 오히려 취성이 나타나 회피한다(뜨임취성).',
  'stress-strain':
    '그림 · 응력–변형 곡선 개략. 연성(청)은 항복 뒤 크게 늘어나며 곡선 아래 넓은 면적(=인성)을 갖고, 취성(적)은 항복 없이 낮은 변형에서 파단한다. 파단까지의 변형이 연신율.',
  'sn-curve':
    '그림 · 피로 S–N 곡선 개략. 강(BCC)은 어떤 응력진폭 아래에서 사실상 무한수명인 피로한도가 뚜렷하지만, 알루미늄 등은 한도가 없어 반복수가 늘수록 계속 낮은 응력에서 파괴된다.',
  'creep-curve':
    '그림 · 크리프 곡선 개략. 일정 고온·응력에서 변형이 1차(감속)·2차(정상·최소속도)·3차(가속) 단계를 거쳐 파단한다. 수명은 대개 2차 단계의 최소 크리프속도로 평가한다.',
  'aging-curve':
    '그림 · 시효경화 곡선 개략. 시효 시간에 따라 경도가 올라 최고경도(peak aging)에 이르렀다가, 석출물이 조대화하는 과시효(overaging)에서 다시 떨어진다. 고온 시효는 빨리 최고에 이르나 최고값은 낮다.',
  'dbtt-curve':
    '그림 · 연성–취성 천이(DBTT) 개략. 체심입방(BCC) 강은 천이온도 아래에서 충격에너지가 급감해 취성 파괴하고, 면심입방(FCC)은 저온에서도 인성을 유지한다.',
  'passivation-pitting':
    '그림 · 부동태와 공식(개략). 두께 2~5 nm 의 Cr₂O₃ 피막은 긁혀도 산소만 있으면 수 초 내 재생(self-healing)되지만, 염화물이 국부 파괴하면 pit 내부가 산성화(pH 2~3)되며 스스로 가속되는 자가촉매 부식이 좁고 깊게 진행된다 — 양극(pit 내부 용해)·음극(피막 표면 산소환원) 반응 포함.',
  'scc-venn':
    '그림 · 응력부식균열(SCC, 개략). (좌) 인장응력(작동·잔류·체결력)·부식환경(염화물·H₂S·가성)·감수성 재료(오스테나이트계 SS·고강도강·황동)의 세 요소가 겹칠 때만 발생 — 하나만 끊어도 멈춘다. (우) 표면 pit 에서 시작해 입계를 따라 가지치며(branching) 자라는 균열이 SCC 파면의 지문이다.',
  'fracture-crack':
    '그림 · 파괴역학 개략. 균열 끝의 응력집중은 응력확대계수 K = Y·σ·√(πa)로 표현되고, K가 재료 고유의 임계값 K_IC에 이르면 불안정하게 전파해 파괴한다.',
  'galvanic-cell':
    '그림 · 갈바닉 부식(개략). 전위가 다른 두 금속이 전해질에서 연결되면 활성 금속이 양극이 되어 용해(M→Mⁿ⁺+ne⁻)로 가속 부식되고, 귀한 금속은 음극(산소환원)이 되어 보호된다. 오른쪽 갈바닉 계열(해수)에서 멀리 떨어진 조합일수록 위험하며, 작은 양극+큰 음극 면적비가 최악이다.',
  'sensitization':
    '그림 · 예민화(개략). 500–800 °C 노출(용접 HAZ·서랭)로 입계에 Cr₂₃C₆ 가 석출하면 인접부 크로뮴이 아래 프로파일처럼 부동태 한계(~12%) 밑으로 떨어져, 그 띠만 선택적으로 부식된다 — 입계부식·IGSCC 의 통로.',
  'gp-zones':
    '그림 · 석출경화의 진행(개략). 위 4단계 조직(과포화 고용체 → 정합 GP존(변형장) → 반정합 중간상 → 비정합 조대화)이 아래 경도 곡선과 대응한다 — 최고경도는 전위가 석출물을 "자르는" 영역과 "우회(Orowan)하는" 영역의 전환점에서 나온다.',
  'martensite-morphology':
    '그림 · 마르텐사이트 형태(개략). 다각형의 구(舊) 오스테나이트 결정립 안에서, 저·중탄소강은 평행한 라스가 다발(packet)을 이루는 라스 마르텐사이트가, 고탄소강은 렌즈 모양 판이 립 내부에서 교차하는 판상(렌티큘러) 마르텐사이트가 된다. 판 사이 밝은 부분은 잔류 오스테나이트.',
  'pearlite':
    '그림 · 펄라이트(개략). 오스테나이트가 공석변태로 분해되어 페라이트(밝음)와 시멘타이트(어둠)가 교대로 쌓인 층상 조직. 콜로니마다 층의 방향이 다르다.',
  'grain-structure':
    '그림 · 결정립 조직 변화(개략). 어닐링된 등축립 → 냉간가공으로 압연방향으로 늘어난 결정립 → 재결정으로 생겨난 새 미세립.',
  'steel-microstructures':
    '그림 · 탄소 함량별 강의 서랭 후 미세조직(개략, 불규칙 다각형 결정립). 아공석강(<0.76%C)은 밝은 페라이트 립+펄라이트 콜로니, 공석강(0.76%C)은 전부 펄라이트(립마다 층 방향이 다름), 과공석강(>0.76%C)은 펄라이트+립 경계를 감싸는 시멘타이트 망.',
  'austenite-micro':
    '그림 · 오스테나이트 조직(개략) — 304 스테인리스강 유형. 등축의 불규칙 다각형 결정립과, 립 안을 가로지르는 곧은 띠 모양의 어닐링 쌍정(annealing twin)이 오스테나이트계의 대표적 특징이다.',
  'cementite-forms':
    '그림 · 시멘타이트(Fe₃C)의 네 가지 형태(개략). 같은 상이라도 분포가 다르면 성질이 판이하다 — ① 펄라이트 속 교대 층, ② 과공석강의 입계 망(취성↑), ③ 구상화(spheroidite, 연화·가공성↑), ④ Tempering 으로 석출한 미세 분산(강도·인성 균형).',
  'ferrite-micro':
    '그림 · 페라이트 조직(개략) — 저탄소강(연강) 유형. 등축의 불규칙 다각형 페라이트 결정립(연함 ~90 HV·연성·강자성)에, 탄소 0.1~0.2% 몫의 펄라이트가 소량 섞인다.',
  'hall-petch':
    '그림 · Hall–Petch 관계(개략). 항복강도 σy = σ0 + k·d^(−1/2) — 결정립이 작을수록(오른쪽) 입계가 전위를 자주 막아 강해진다. 강도와 인성을 동시에 올리는 유일한 강화법이라 "공짜 점심"이라 불린다.',
  'cold-work-effects':
    '그림 · 냉간가공의 효과(개략). 냉간가공률 %CW 가 커질수록 강도·경도는 오르고 연성은 급감한다 — 등축립이 연신립으로 바뀌고 전위가 쌓이는 대가. 연성이 고갈되기 전에 중간 Annealing 으로 회복해 재가공한다.',
  'hot-cold-scale':
    '그림 · 냉간·온간·열간의 경계(개략). 기준은 섭씨 온도가 아니라 상동온도 T/Tm(절대온도 비율) — 재결정온도(~0.4Tm) 아래면 가공경화가 쌓이는 냉간, 위면 동적 재결정으로 강해지지 않는 열간이다. 납은 상온이 이미 열간인 이유.',
  'annealing-cycle':
    '그림 · Annealing vs Normalizing 사이클(개략). 같은 오스테나이트화 후 노냉(Annealing)은 조대 펄라이트로 가장 연하게, 공랭(Normalizing)은 미세 펄라이트로 약간 강하고 균질하게 만든다 — 냉각 속도가 조직을 결정한다.',
  'forming-processes':
    '그림 · 소성가공 4대 공정(개략). 압연(Rolling)은 롤 사이로 눌러 판·형강을, 단조(Forging)는 다이로 눌러 강인한 단조품을, 압출(Extrusion)은 다이 구멍으로 밀어 봉·관·복잡 단면을, 인발(Drawing)은 다이로 당겨 정밀 선재를 만든다.',
  'casting-process':
    '그림 · 사형 주조 단면(개략). 쇳물은 탕구(sprue)를 지나 캐비티를 채우고, 라이저(압탕)가 마지막까지 액체로 남아 응고 수축을 보충한다 — 라이저 설계가 수축공 결함을 좌우한다.',
  'sintering-stages':
    '그림 · 소결 3단계(개략). 분말이 점 접촉 → 확산으로 목(neck)이 자라며 수축 → 결정립 조직으로 치밀화. 융점까지 녹이지 않고 고체 확산만으로 붙이는 것이 소결의 본질이며, 소량의 잔류 기공이 남는다.',
  'stress-concentration-kt':
    '그림 · 응력집중(개략). 힘의 흐름(유선)이 구멍을 비켜 가며 가장자리에 몰려, 원형 구멍에서는 국부 응력이 평균의 3배(Kt≈3)에 이른다. 노치·모서리·구멍이 피로 균열의 출발점이 되는 이유.',
  'hardness-tests':
    '그림 · 경도시험 3종(개략). Brinell(HB)은 구를 눌러 압흔 지름을(주물·모재 평균), Vickers(HV)는 다이아몬드 피라미드로 대각선을(미세조직·얇은 층·전 경도역), Rockwell(HRC 등)은 깊이를 직독(현장 검사 표준)한다.',
  'hip-densification':
    '그림 · HIP(hot isostatic pressing, 개략). 고온(융점의 ~0.7배)과 고압 아르곤(100~200 MPa)으로 모든 방향에서 눌러 내부 기공을 확산으로 닫는다 — 주조 수축공·AM 기공을 없애 피로수명을 회복시키는 표준 후처리.',
  'orowan':
    '그림 · Orowan 우회(개략). 전위가 뚫지 못하는 경질 입자를 만나면 활처럼 휘어 지나가며(bowing) 입자 둘레에 루프를 남긴다 — 필요한 응력은 입자 간격 λ에 반비례(Δτ∝1/λ)하므로, 미세한 입자를 촘촘히 분산시킬수록 강해지고, 남은 루프가 다음 전위를 더 막아 강화가 누적된다.',
  'al-families':
    '그림 · 알루미늄 합금 계열의 강도 스펙트럼(대표 temper 의 σy, 개략). 파랑 = 비열처리형(가공·고용강화: 1xxx·3xxx·5xxx), 빨강 = 열처리형(석출경화: 6xxx·2xxx·7xxx). 순알루미늄 35 MPa 에서 7075-T6 의 503 MPa 까지 — 합금화와 시효가 만드는 14배의 차이.',
  'ti-families':
    '그림 · 티타늄 합금의 α↔β 스펙트럼(개략). β 안정화 원소(V·Mo·Cr)가 늘수록 왼쪽의 내식·용접성·크리프(α)에서 오른쪽의 고강도·열처리 반응(β)으로 성격이 이동한다. 시장의 절반을 차지하는 Ti-6Al-4V 는 그 균형점(α+β)에 있다.',
  'cast-iron-family':
    '그림 · 주철 가족의 미세조직(개략). 탄소의 존재 형태가 성질을 결정한다 — 회주철은 편상 흑연(취약·감쇠 우수), 구상흑연주철은 Mg 처리로 둥근 흑연(연성 회복), 백주철은 흑연 없이 탄화물(내마모·취성), ADI 는 구상 흑연+ausferrite(강급 강도).',
  'carbide-micro':
    '그림 · 탄화물 분포 조직(개략). (좌) 합금강 — 립 내부의 미세 MC(V·Nb·Ti) 탄화물은 강화·결정립 미세화에 기여하고, 입계를 따라 이어진 M₂₃C₆ 사슬은 예민화·크리프와 관련된다. (우) 초경합금 — 각진 WC 입자(~1500 HV)를 Co 결합상이 붙잡아 경도와 인성을 겸비한다.',
  'stainless-families':
    '그림 · 스테인리스강 5계열의 Cr–Ni 조성 계통도(개략). Cr 이 많을수록 내식성이, Ni 가 많을수록 오스테나이트 안정성이 커진다. 오스테나이트계·페라이트계·마르텐사이트계·듀플렉스·석출경화(PH)가 조성에 따라 나뉘며, 대표 grade 를 점으로 표시했다.',
  'superalloy-strength':
    '그림 · 온도에 따른 상대 강도 유지(개략). 알루미늄은 약 200 °C 부터, 강은 약 500 °C 부터 강도가 급격히 떨어지지만, 니켈초합금은 γ′ 석출상 덕분에 700–1000 °C 고온까지 강도를 유지해 터빈 등 고온부에 쓰인다.',
  'red-hardness':
    '그림 · 적열경도(개략). 탄소공구강은 약 200 °C 에서 급격히 연화하지만, 고속도강(HSS)은 W·Mo·V·Co 합금과 2차경화로 약 600 °C 까지 경도를 유지해 고속 절삭에서 날이 무뎌지지 않는다.',
  'strengthening-mechanisms':
    '그림 · 금속 강화의 4대 기구(개략). 강도는 전위의 이동을 얼마나 막느냐로 결정된다. ① 고용강화(용질 원자의 격자 왜곡), ② 결정립 미세화(결정립계가 전위를 막음 · Hall–Petch), ③ 석출·분산강화(전위가 입자를 Orowan 우회), ④ 가공경화(전위끼리 얽힘). 실제 합금은 이들을 함께 쓴다.',
  'case-hardening':
    '그림 · 표면경화 깊이 프로파일(개략). 표면은 단단하게(내마모·내피로), 심부는 연하고 인성 있게 만든다. 질화는 500 °C대 저온에서 질화물로 얇고 매우 단단한 층을, 침탄은 900 °C대에서 탄소를 확산시켜 더 두꺼운 경화층을 만든 뒤 담금질한다.',
  'jominy':
    '그림 · Jominy 끝단 급랭 시험(개략). 오스테나이트화한 봉의 아래 끝에만 물을 분사하면 한 시편 안에 냉각속도의 스펙트럼이 생기고, 끝에서부터 거리별로 경도를 찍은 곡선이 그 강의 경화능 전체를 보여 준다 — 시작 경도는 탄소(~0.4%)가 정해 셋이 비슷하지만, 경도가 유지되는 깊이는 합금원소(Mo·Cr·Ni·B)가 정한다.',
  'bainite-upper-lower':
    '그림 · 상부 vs 하부 베이나이트(개략). 등온변태 온도가 높으면(550~400 °C) 탄소가 라스 밖으로 빠져나가 탄화물이 라스 사이에 필름형으로 굳는 상부 베이나이트(깃털 모양·인성 불리)가, 온도가 낮으면(400 °C~Ms) 탄소가 빠져나가지 못해 판 안에 미세 탄화물이 박힌 하부 베이나이트(침상·강도와 인성 우수)가 된다 — 오스템퍼링이 노리는 조직이 후자다.',
};

/** 도표 id 로 렌더 (없으면 null). PNG + 캡션. */
export function GlossaryFigure({ id }: { id: string }): ReactElement | null {
  const src = URLS[id];
  if (!src) return null;
  const cap = CAPTIONS[id];
  return (
    <figure className="my-4 rounded-lg border border-border bg-card/60 p-3">
      <img src={src} alt={cap || id} className="w-full h-auto rounded" loading="lazy" />
      {cap && <figcaption className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{cap}</figcaption>}
    </figure>
  );
}

export const GLOSSARY_FIGURE_IDS = Object.keys(URLS);

/* R227/E14/H4c — 실제 미세조직 사진 슬롯. 라이선스 확보된 파일을 client/src/assets/glossary/photos/
 * 에 넣으면(파일명 = id) 자동 번들·렌더. 파일이 없으면 null(비치명적). credit=출처 표기(라이선스 준수). */
const photoPngs = import.meta.glob('../../assets/glossary/photos/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' }) as Record<string, string>;
const PHOTO_URLS: Record<string, string> = {};
for (const [p, url] of Object.entries(photoPngs)) {
  const id = p.split('/').pop()!.replace(/\.(png|jpe?g|webp)$/i, '');
  PHOTO_URLS[id] = url;
}
export function GlossaryPhoto({ id, caption, credit }: { id: string; caption: string; credit?: string }): ReactElement | null {
  const src = PHOTO_URLS[id];
  if (!src) return null; // 파일 미제공 시 표시 안 함
  return (
    <figure className="my-4 rounded-lg border border-border bg-card/60 p-3">
      <img src={src} alt={caption} className="w-full h-auto rounded" loading="lazy" />
      <figcaption className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
        {caption}{credit && <span className="block text-[10px] text-muted-foreground/70 mt-0.5">출처: {credit}</span>}
      </figcaption>
    </figure>
  );
}
