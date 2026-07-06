/*
 * R227/E14/H4c — 글로서리 A4 용어 페이지용 SVG 도표 레지스트리.
 * 실제 사진 대신 개념 도해·그래프를 벡터로(오프라인·저작권 안전). id 로 참조(glossary-articles.json).
 * 도표는 개략(schematic)이며 축·수치는 표준 교과서 관례를 따르되 정밀 측정값이 아님.
 */
import type { ReactElement } from 'react';

const AX = 'oklch(0.45 0.03 250)';       // 축·텍스트
const MUTE = 'oklch(0.6 0.02 250)';
const γ = 'oklch(0.62 0.13 45)';          // 오스테나이트 계열(주황)
const α = 'oklch(0.58 0.11 230)';         // 페라이트 계열(청)
const M = 'oklch(0.55 0.16 15)';          // 마르텐사이트(적)

function Frame({ children, cap, w = 420, h = 300 }: { children: React.ReactNode; cap: string; w?: number; h?: number }) {
  return (
    <figure className="my-4 rounded-lg border border-border bg-card/60 p-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img">
        {children}
      </svg>
      <figcaption className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{cap}</figcaption>
    </figure>
  );
}

/** 철-탄소 상태도 (개략) — 오스테나이트(γ)·페라이트(α)·시멘타이트·공석점. */
function IronCarbon(): ReactElement {
  return (
    <Frame cap="그림 · 철–탄소(Fe–C) 상태도 개략. 오스테나이트(γ, FCC)는 고온상이며 냉각 시 조성에 따라 페라이트(α)·펄라이트·시멘타이트(Fe₃C)로 분해된다. 공석점 = 0.76 %C · 727 °C.">
      {/* 축 */}
      <line x1="55" y1="245" x2="400" y2="245" stroke={AX} strokeWidth="1.2" />
      <line x1="55" y1="245" x2="55" y2="25" stroke={AX} strokeWidth="1.2" />
      <text x="228" y="278" textAnchor="middle" fontSize="11" fill={AX}>탄소 함량 (wt % C)</text>
      <text x="18" y="135" textAnchor="middle" fontSize="11" fill={AX} transform="rotate(-90 18 135)">온도 (°C)</text>
      {/* 눈금 */}
      {[['0', 55], ['0.76', 186], ['2.0', 400]].map(([l, x]) => (
        <g key={l}><line x1={x} y1="245" x2={x} y2="250" stroke={AX} /><text x={x} y="263" textAnchor="middle" fontSize="9" fill={MUTE}>{l}</text></g>
      ))}
      {[['1538', 30], ['912', 95], ['727', 175]].map(([l, y]) => (
        <g key={l}><line x1="50" y1={y} x2="55" y2={y} stroke={AX} /><text x="46" y={Number(y) + 3} textAnchor="end" fontSize="9" fill={MUTE}>{l}</text></g>
      ))}
      {/* γ 영역 경계: A3 (912→727 하강) + Acm (727 상승) */}
      <path d="M 95 95 Q 150 150 186 175" fill="none" stroke={γ} strokeWidth="1.8" />
      <path d="M 186 175 Q 300 150 400 120" fill="none" stroke={γ} strokeWidth="1.8" strokeDasharray="4 3" />
      {/* 공석 수평선 727 */}
      <line x1="80" y1="175" x2="400" y2="175" stroke={M} strokeWidth="1.4" strokeDasharray="2 2" />
      <circle cx="186" cy="175" r="3.5" fill={M} />
      {/* 영역 라벨 */}
      <text x="230" y="80" textAnchor="middle" fontSize="13" fill={γ} fontWeight="bold">γ 오스테나이트</text>
      <text x="230" y="96" textAnchor="middle" fontSize="9" fill={MUTE}>(FCC · 고온상)</text>
      <text x="105" y="215" textAnchor="middle" fontSize="11" fill={α} fontWeight="bold">α+Fe₃C</text>
      <text x="105" y="228" textAnchor="middle" fontSize="8.5" fill={MUTE}>(펄라이트)</text>
      <text x="88" y="140" textAnchor="middle" fontSize="10" fill={α}>α</text>
      <text x="300" y="215" textAnchor="middle" fontSize="10" fill={MUTE}>γ+Fe₃C</text>
      <text x="192" y="168" fontSize="8.5" fill={M}>공석 0.76%C·727°C</text>
    </Frame>
  );
}

/** TTT/냉각변태 (개략) — 급랭이 C-곡선 코를 피하면 마르텐사이트. */
function TTT(): ReactElement {
  return (
    <Frame cap="그림 · 항온변태(TTT) C-곡선 개략. 급랭(파랑)이 코(nose)를 피하면 확산변태(펄라이트·베이나이트)를 건너뛰고 Ms 이하에서 마르텐사이트가 된다. 서랭(주황)은 펄라이트.">
      {/* 축 */}
      <line x1="55" y1="245" x2="400" y2="245" stroke={AX} strokeWidth="1.2" />
      <line x1="55" y1="245" x2="55" y2="25" stroke={AX} strokeWidth="1.2" />
      <text x="228" y="278" textAnchor="middle" fontSize="11" fill={AX}>시간 (log)</text>
      <text x="18" y="135" textAnchor="middle" fontSize="11" fill={AX} transform="rotate(-90 18 135)">온도 (°C)</text>
      {/* C-곡선 (start·finish) */}
      <path d="M 95 55 Q 175 130 150 190 Q 140 215 200 235" fill="none" stroke={AX} strokeWidth="1.6" />
      <path d="M 140 55 Q 235 135 205 195 Q 195 220 255 238" fill="none" stroke={MUTE} strokeWidth="1.2" strokeDasharray="4 3" />
      <text x="250" y="120" fontSize="9" fill={AX}>변태 시작</text>
      <text x="270" y="150" fontSize="9" fill={MUTE}>변태 완료</text>
      {/* Ms / Mf */}
      <line x1="55" y1="195" x2="400" y2="195" stroke={M} strokeWidth="1.3" strokeDasharray="2 2" />
      <line x1="55" y1="225" x2="400" y2="225" stroke={M} strokeWidth="1" strokeDasharray="1 3" />
      <text x="404" y="198" fontSize="9" fill={M}>Ms</text>
      <text x="404" y="228" fontSize="9" fill={M}>Mf</text>
      {/* 냉각경로: 급랭(마르텐사이트) */}
      <path d="M 80 45 L 92 215" fill="none" stroke={α} strokeWidth="2" markerEnd="url(#gfarrow)" />
      <text x="66" y="120" fontSize="9" fill={α} transform="rotate(-84 66 120)">급랭→마르텐사이트</text>
      {/* 냉각경로: 서랭(펄라이트) */}
      <path d="M 80 45 Q 160 100 300 165" fill="none" stroke={γ} strokeWidth="2" markerEnd="url(#gfarrow)" />
      <text x="215" y="120" fontSize="9" fill={γ}>서랭→펄라이트</text>
      <defs><marker id="gfarrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill={AX} /></marker></defs>
    </Frame>
  );
}

/** 오스테나이트(FCC)→마르텐사이트(BCT) 무확산 전단 격자변태 (개략). */
function MartensiteLattice(): ReactElement {
  return (
    <Frame w={420} h={230} cap="그림 · 무확산 전단변태. 급랭으로 탄소가 빠져나갈 시간이 없어, FCC 오스테나이트가 탄소 과포화된 체심정방(BCT) 마르텐사이트로 격자가 전단·왜곡된다. 이 격자 변형이 높은 경도·취성의 근원.">
      {/* FCC */}
      <g transform="translate(70 55)">
        <rect x="0" y="0" width="90" height="90" fill="none" stroke={γ} strokeWidth="1.6" />
        {[[0,0],[90,0],[0,90],[90,90],[45,45]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="5" fill={γ} />)}
        {[[45,0],[0,45],[90,45],[45,90]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4" fill={γ} opacity="0.55" />)}
        <text x="45" y="118" textAnchor="middle" fontSize="11" fill={γ} fontWeight="bold">FCC 오스테나이트</text>
        <text x="45" y="132" textAnchor="middle" fontSize="8.5" fill={MUTE}>탄소 고용(면심)</text>
      </g>
      {/* arrow */}
      <path d="M 185 100 L 235 100" fill="none" stroke={M} strokeWidth="2" markerEnd="url(#gfarrow2)" />
      <text x="210" y="90" textAnchor="middle" fontSize="9" fill={M}>급랭·전단</text>
      <text x="210" y="116" textAnchor="middle" fontSize="8" fill={MUTE}>무확산</text>
      {/* BCT (정방으로 늘림) */}
      <g transform="translate(258 45)">
        <rect x="0" y="0" width="80" height="110" fill="none" stroke={M} strokeWidth="1.6" />
        {[[0,0],[80,0],[0,110],[80,110]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="5" fill={M} />)}
        <circle cx="40" cy="55" r="5" fill={M} />
        <rect x="37" y="30" width="6" height="6" fill="#111" transform="rotate(45 40 33)" />
        <text x="40" y="130" textAnchor="middle" fontSize="11" fill={M} fontWeight="bold">BCT 마르텐사이트</text>
        <text x="40" y="144" textAnchor="middle" fontSize="8.5" fill={MUTE}>탄소 과포화(◆)·정방 왜곡</text>
      </g>
      <defs><marker id="gfarrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill={M} /></marker></defs>
    </Frame>
  );
}

/** 뜨임 온도 vs 경도·인성 (개략). */
function TemperingCurve(): ReactElement {
  return (
    <Frame w={420} h={250} cap="그림 · 뜨임 온도에 따른 경도(적)·인성(청) 개략. 온도를 높일수록 경도는 내려가고 인성은 올라간다. 일부 강은 특정 구간(≈250–400 °C)에서 취성이 나타나 회피(뜨임취성).">
      <line x1="55" y1="200" x2="400" y2="200" stroke={AX} strokeWidth="1.2" />
      <line x1="55" y1="200" x2="55" y2="25" stroke={AX} strokeWidth="1.2" />
      <text x="228" y="230" textAnchor="middle" fontSize="11" fill={AX}>뜨임 온도 (°C) →</text>
      <text x="18" y="115" textAnchor="middle" fontSize="10" fill={AX} transform="rotate(-90 18 115)">경도 · 인성</text>
      {/* 경도 하강 */}
      <path d="M 65 50 Q 200 60 260 120 Q 320 165 395 185" fill="none" stroke={M} strokeWidth="2" />
      <text x="85" y="45" fontSize="10" fill={M} fontWeight="bold">경도 ↓</text>
      {/* 인성 상승 */}
      <path d="M 65 185 Q 180 178 250 130 Q 320 90 395 60" fill="none" stroke={α} strokeWidth="2" />
      <text x="330" y="52" fontSize="10" fill={α} fontWeight="bold">인성 ↑</text>
      {/* 취성 구간 */}
      <rect x="150" y="30" width="60" height="170" fill={MUTE} opacity="0.09" />
      <text x="180" y="215" textAnchor="middle" fontSize="8.5" fill={MUTE}>뜨임취성역</text>
    </Frame>
  );
}

const FIGURES: Record<string, () => ReactElement> = {
  'iron-carbon': IronCarbon,
  'ttt-curve': TTT,
  'martensite-lattice': MartensiteLattice,
  'tempering-curve': TemperingCurve,
};

/** 도표 id 로 렌더 (없으면 null). */
export function GlossaryFigure({ id }: { id: string }) {
  const F = FIGURES[id];
  return F ? <F /> : null;
}

export const GLOSSARY_FIGURE_IDS = Object.keys(FIGURES);
