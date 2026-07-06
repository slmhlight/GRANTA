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
