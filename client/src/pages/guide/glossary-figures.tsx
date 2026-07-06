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
    '그림 · 항온변태(TTT) C-곡선 개략. 곡선의 코(nose)에서 변태가 가장 빠르다. 급랭(파랑)이 코를 왼쪽으로 피하면 확산변태를 건너뛰고 Ms 이하에서 마르텐사이트가, 서랭(주황)은 코를 통과해 펄라이트가 된다.',
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
    '그림 · 부동태 피막과 공식(개략). 금속 표면의 치밀한 Cr₂O₃ 피막이 부식을 막지만, 염화물(Cl⁻)이 피막을 국부 파괴하면 그 지점에서 작고 깊은 공식(pit)이 진행된다.',
  'scc-venn':
    '그림 · 응력부식균열(SCC)은 인장응력·부식환경·감수성 재료의 세 요소가 동시에 있을 때만 발생한다. 하나만 없어도 일어나지 않으므로, 셋 중 하나를 끊는 것이 대책이다.',
  'fracture-crack':
    '그림 · 파괴역학 개략. 균열 끝의 응력집중은 응력확대계수 K = Y·σ·√(πa)로 표현되고, K가 재료 고유의 임계값 K_IC에 이르면 불안정하게 전파해 파괴한다.',
  'galvanic-cell':
    '그림 · 갈바닉 부식(개략). 전위가 다른 두 금속이 전해질에서 연결되면 덜 귀한(활성) 금속이 양극이 되어 가속 부식되고, 귀한 금속은 음극이 되어 보호된다.',
  'sensitization':
    '그림 · 예민화(개략). 약 500–800 °C 에서 결정립계에 크로뮴 탄화물이 석출하면 인근이 크로뮴 결핍이 되어, 부동태를 유지하지 못하고 입계부식에 취약해진다.',
  'gp-zones':
    '그림 · 석출경화 진행(개략). 과포화 고용체 → 미세한 GP존(정합, 최고경도) → 중간 석출물(반정합) → 과시효(비정합·조대화)로 갈수록 석출물이 커지고 강화 효과가 줄어든다.',
  'martensite-morphology':
    '그림 · 마르텐사이트 형태(개략). 저·중탄소강은 조각(packet) 안에 평행한 라스가 다발을 이루는 라스 마르텐사이트, 고탄소강은 렌즈 모양 판이 서로 교차하는 판상(렌티큘러) 마르텐사이트가 된다.',
  'pearlite':
    '그림 · 펄라이트(개략). 오스테나이트가 공석변태로 분해되어 페라이트(밝음)와 시멘타이트(어둠)가 교대로 쌓인 층상 조직. 콜로니마다 층의 방향이 다르다.',
  'grain-structure':
    '그림 · 결정립 조직 변화(개략). 어닐링된 등축립 → 냉간가공으로 압연방향으로 늘어난 결정립 → 재결정으로 생겨난 새 미세립.',
  'steel-microstructures':
    '그림 · 탄소 함량별 강의 냉각 후 미세조직(개략). 아공석강(<0.76%C)은 페라이트+펄라이트, 공석강(0.76%C)은 전부 펄라이트, 과공석강(>0.76%C)은 펄라이트+입계 시멘타이트.',
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
