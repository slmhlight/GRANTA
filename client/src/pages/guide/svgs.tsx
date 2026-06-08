/*
 * Guide 페이지의 모든 SVG 다이어그램 — 시나리오 도식·단면·보 케이스·큰 교육용 도식·아이콘.
 * Guide.tsx 가 너무 커서 분리. 시각 자료 위주이므로 한 파일에 묶음 (전부 export, named import 로 사용).
 */

const stroke = 'stroke-foreground/70';
const accent = 'stroke-accent';
const force = 'stroke-rose-500';

/* ─── 시나리오 도식 SVG 8종 (사례 카드용) ─────────────────────────────────── */

export const SvgBracket = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <g className={stroke} strokeWidth="1.2"><line x1="14" y1="8" x2="14" y2="82" /><line x1="10" y1="12" x2="14" y2="16" /><line x1="10" y1="22" x2="14" y2="26" /><line x1="10" y1="32" x2="14" y2="36" /><line x1="10" y1="42" x2="14" y2="46" /><line x1="10" y1="52" x2="14" y2="56" /><line x1="10" y1="62" x2="14" y2="66" /><line x1="10" y1="72" x2="14" y2="76" /></g>
    <path d="M 14 14 L 96 14 L 96 30 L 30 30 L 30 82 L 14 82 Z" className={`fill-accent/15 ${accent}`} strokeWidth="2" />
    <g className={force} strokeWidth="2" fill="none"><line x1="86" y1="34" x2="86" y2="64" /><polyline points="80,58 86,68 92,58" /></g>
    <text x="90" y="50" fontSize="10" className="fill-rose-500" fontFamily="monospace">F</text>
  </svg>
);
export const SvgManifold = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <path d="M 16 60 L 100 60 M 30 60 L 30 22 M 50 60 L 50 22 M 70 60 L 70 22 M 90 60 L 90 22" className={`fill-none ${accent}`} strokeWidth="3.5" strokeLinecap="round" />
    <g className={force} strokeWidth="1.5" fill="none"><path d="M 30 18 q 3 -4 6 0 t 6 0" /><path d="M 50 18 q 3 -4 6 0 t 6 0" /><path d="M 70 18 q 3 -4 6 0 t 6 0" /></g>
    <text x="10" y="80" fontSize="9" className="fill-rose-500" fontFamily="monospace">~700°C</text>
  </svg>
);
export const SvgShaft = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <rect x="14" y="38" width="92" height="18" rx="2" className={`fill-accent/15 ${accent}`} strokeWidth="2" />
    <g className={stroke} strokeWidth="1.5" fill="none"><rect x="22" y="32" width="10" height="30" /><rect x="88" y="32" width="10" height="30" /></g>
    <path d="M 60 30 a 14 14 0 1 1 -10 6" className={accent} strokeWidth="1.5" fill="none" />
    <polygon points="48,32 52,38 56,32" className="fill-accent" />
    <text x="14" y="80" fontSize="9" className="fill-rose-500" fontFamily="monospace">±σ 반복</text>
  </svg>
);
export const SvgPrecision = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <rect x="22" y="36" width="60" height="32" rx="2" className={`fill-accent/15 ${accent}`} strokeWidth="2" />
    <g className={force} strokeWidth="1.5" fill="none"><circle cx="98" cy="40" r="5" /><line x1="98" y1="45" x2="98" y2="64" /><circle cx="98" cy="64" r="3.5" className="fill-rose-500" /></g>
    <text x="89" y="80" fontSize="9" className="fill-rose-500" fontFamily="monospace">ΔT</text>
    <g className={stroke} strokeWidth="1" fill="none"><line x1="22" y1="76" x2="82" y2="76" /><line x1="22" y1="73" x2="22" y2="79" /><line x1="82" y1="73" x2="82" y2="79" /></g>
    <text x="38" y="86" fontSize="8" className="fill-foreground/70" fontFamily="monospace">ΔL ≈ 0</text>
  </svg>
);
export const SvgMarine = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <path d="M 6 28 q 6 -6 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0" className="stroke-sky-500" strokeWidth="1.5" fill="none" />
    <circle cx="60" cy="58" r="18" className={`fill-accent/15 ${accent}`} strokeWidth="2" />
    <g className={accent} strokeWidth="1.5"><line x1="60" y1="40" x2="60" y2="76" /><line x1="42" y1="58" x2="78" y2="58" /><line x1="47" y1="45" x2="73" y2="71" /><line x1="73" y1="45" x2="47" y2="71" /></g>
    <text x="20" y="86" fontSize="8" className="fill-sky-600" fontFamily="monospace">Cl⁻ · NaCl</text>
  </svg>
);
export const SvgLowcost = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <g className={`fill-accent/15 ${accent}`} strokeWidth="1.5">
      <rect x="10" y="20" width="32" height="18" rx="1.5" /><rect x="10" y="42" width="32" height="18" rx="1.5" /><rect x="10" y="64" width="32" height="18" rx="1.5" />
      <rect x="48" y="20" width="32" height="18" rx="1.5" /><rect x="48" y="42" width="32" height="18" rx="1.5" /><rect x="48" y="64" width="32" height="18" rx="1.5" />
    </g>
    <text x="92" y="46" fontSize="22" className="fill-emerald-600" fontFamily="serif" fontWeight="bold">$</text>
    <text x="86" y="64" fontSize="8" className="fill-foreground/60" fontFamily="monospace">×10⁵</text>
  </svg>
);
export const SvgSpring = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <path d="M 18 45 q 6 -18 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0" className={accent} strokeWidth="2.5" fill="none" />
    <line x1="14" y1="22" x2="14" y2="68" className={stroke} strokeWidth="2.5" />
    <line x1="106" y1="22" x2="106" y2="68" className={stroke} strokeWidth="2.5" />
    <g className={force} strokeWidth="1.5" fill="none"><line x1="6" y1="45" x2="14" y2="45" /><polyline points="8,42 4,45 8,48" /><line x1="106" y1="45" x2="114" y2="45" /><polyline points="112,42 116,45 112,48" /></g>
    <text x="44" y="82" fontSize="9" className="fill-foreground/70" fontFamily="monospace">σy² / E ↑</text>
  </svg>
);
export const SvgHeatsink = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <g className={`fill-accent/20 ${accent}`} strokeWidth="1.2">
      <rect x="20" y="14" width="6" height="40" /><rect x="32" y="14" width="6" height="40" /><rect x="44" y="14" width="6" height="40" /><rect x="56" y="14" width="6" height="40" /><rect x="68" y="14" width="6" height="40" /><rect x="80" y="14" width="6" height="40" /><rect x="92" y="14" width="6" height="40" />
    </g>
    <rect x="14" y="54" width="92" height="10" className={`fill-accent/30 ${accent}`} strokeWidth="1.5" />
    <rect x="50" y="68" width="20" height="6" className="fill-rose-500/70" stroke="none" />
    <g className={force} strokeWidth="1.5" fill="none"><path d="M 36 12 q 2 -4 4 0 t 4 0" /><path d="M 58 8 q 2 -4 4 0 t 4 0" /><path d="M 78 12 q 2 -4 4 0 t 4 0" /></g>
  </svg>
);
/* 새 사례 (라운드 6) — wear/medical/cryogenic/electrical */
export const SvgWear = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    {/* 기어 한 쌍 — 마모/접촉의 대표 도식 */}
    <g className={`fill-accent/15 ${accent}`} strokeWidth="1.5">
      <circle cx="40" cy="48" r="20" />
      {Array.from({ length: 12 }).map((_, i) => { const a = (i * 30) * Math.PI / 180; return <rect key={i} x={40 + Math.cos(a) * 20 - 2} y={48 + Math.sin(a) * 20 - 2} width="4" height="4" transform={`rotate(${i * 30} ${40 + Math.cos(a) * 20} ${48 + Math.sin(a) * 20})`} />; })}
      <circle cx="40" cy="48" r="3" className="fill-accent" />
      <circle cx="85" cy="48" r="13" />
      {Array.from({ length: 8 }).map((_, i) => { const a = (i * 45) * Math.PI / 180; return <rect key={i} x={85 + Math.cos(a) * 13 - 1.5} y={48 + Math.sin(a) * 13 - 1.5} width="3" height="3" />; })}
      <circle cx="85" cy="48" r="2" className="fill-accent" />
    </g>
    <text x="14" y="80" fontSize="9" className="fill-rose-500" fontFamily="monospace">Hertz · HV ↑</text>
  </svg>
);
export const SvgMedical = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    {/* 골절판 스크류 — 임플란트 대표 도식 */}
    <path d="M 18 24 Q 60 14 102 24 L 102 38 Q 60 30 18 38 Z" className={`fill-accent/15 ${accent}`} strokeWidth="1.5" />
    {[28, 50, 72, 94].map(x => <g key={x}><circle cx={x} cy={31} r={3} className="fill-background stroke-accent" strokeWidth="1.2" /><line x1={x} y1={34} x2={x} y2={64} className={accent} strokeWidth="2" /><polyline points={`${x - 3},60 ${x},66 ${x + 3},60`} className={accent} strokeWidth="1" fill="none" /></g>)}
    <text x="14" y="84" fontSize="8" className="fill-emerald-600" fontFamily="monospace">Ti / CoCr / 316L</text>
  </svg>
);
export const SvgCryogenic = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    {/* LNG 탱크 + 눈송이 (저온) */}
    <rect x="14" y="32" width="76" height="40" rx="6" className={`fill-accent/15 ${accent}`} strokeWidth="2" />
    <rect x="14" y="32" width="76" height="40" rx="6" className="fill-sky-200/40" stroke="none" />
    <text x="22" y="56" fontSize="9" className="fill-foreground/70" fontFamily="monospace">LNG</text>
    <text x="22" y="68" fontSize="8" className="fill-sky-700" fontFamily="monospace">−162°C</text>
    {/* 눈송이 */}
    <g className="stroke-sky-500" strokeWidth="1.3" fill="none">
      <line x1="102" y1="20" x2="102" y2="38" /><line x1="93" y1="29" x2="111" y2="29" />
      <line x1="95" y1="22" x2="109" y2="36" /><line x1="109" y1="22" x2="95" y2="36" />
    </g>
  </svg>
);
export const SvgElectrical = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    {/* 버스바 + 전류 + 번개 표시 */}
    <rect x="16" y="38" width="78" height="14" className={`fill-amber-300/40 ${accent}`} strokeWidth="1.5" />
    <line x1="10" y1="45" x2="98" y2="45" className="stroke-accent" strokeWidth="0.8" strokeDasharray="3 2" />
    <text x="20" y="48" fontSize="9" className="fill-foreground/80" fontFamily="monospace">Cu 100A</text>
    {/* 번개 */}
    <path d="M 100 18 L 92 38 L 100 38 L 96 58 L 110 32 L 102 32 L 108 18 Z" className="fill-amber-500" stroke="none" />
    <text x="14" y="80" fontSize="9" className="fill-rose-500" fontFamily="monospace">I²R · ΔT</text>
  </svg>
);
/* 라운드 7 추가: 압력용기·기어·체결구·금형 */
export const SvgPressureVesselSmall = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    {/* 원통형 압력용기 (양 끝 반구) + 내부압 화살표 */}
    <path d="M 30 30 a 12 12 0 0 1 0 30 L 90 60 a 12 12 0 0 0 0 -30 Z" className={`fill-accent/15 ${accent}`} strokeWidth="2" />
    <g className={force} strokeWidth="1.5" fill="none">
      <line x1="60" y1="48" x2="50" y2="38" /><polyline points="52,41 50,38 53,36" />
      <line x1="60" y1="48" x2="70" y2="38" /><polyline points="68,36 70,38 67,41" />
      <line x1="60" y1="48" x2="50" y2="58" /><polyline points="53,60 50,58 52,55" />
      <line x1="60" y1="48" x2="70" y2="58" /><polyline points="67,55 70,58 68,60" />
    </g>
    <text x="60" y="46" fontSize="10" textAnchor="middle" className="fill-rose-500 font-bold" fontFamily="monospace">P</text>
    <text x="12" y="80" fontSize="9" className="fill-foreground/70" fontFamily="monospace">σ_h = PD/2t</text>
  </svg>
);
export const SvgGear = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    {/* 큰 기어 (12 톱니) + 토크 화살 */}
    <g className={`fill-accent/15 ${accent}`} strokeWidth="1.5">
      <circle cx="60" cy="48" r="26" />
      {Array.from({ length: 14 }).map((_, i) => { const a = (i * 360 / 14) * Math.PI / 180; const cx = 60 + Math.cos(a) * 28; const cy = 48 + Math.sin(a) * 28; return <rect key={i} x={cx - 2} y={cy - 2} width="4" height="4" transform={`rotate(${i * 360 / 14} ${cx} ${cy})`} />; })}
      <circle cx="60" cy="48" r="4" className="fill-accent" />
    </g>
    {/* 회전 화살 */}
    <path d="M 78 38 a 22 22 0 1 1 -6 -22" className={force} strokeWidth="1.6" fill="none" />
    <polygon points="74,16 78,12 80,18" className="fill-rose-500" />
    <text x="14" y="80" fontSize="9" className="fill-rose-500" fontFamily="monospace">T · F_t</text>
  </svg>
);
export const SvgFastener = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    {/* 헥스 볼트 + 나사산 */}
    <polygon points="20,28 36,18 52,28 52,46 36,56 20,46" className={`fill-accent/20 ${accent}`} strokeWidth="1.6" />
    <line x1="36" y1="56" x2="36" y2="74" className={accent} strokeWidth="3" />
    {/* 나사산 */}
    <g className={accent} strokeWidth="1.2" fill="none">
      <line x1="28" y1="58" x2="44" y2="58" /><line x1="28" y1="62" x2="44" y2="62" /><line x1="28" y1="66" x2="44" y2="66" /><line x1="28" y1="70" x2="44" y2="70" />
    </g>
    {/* 너트 */}
    <polygon points="68,52 80,46 92,52 92,62 80,68 68,62" className={`fill-foreground/10 ${stroke}`} strokeWidth="1.5" />
    <circle cx="80" cy="57" r="5" className="fill-background" stroke="none" />
    <text x="14" y="84" fontSize="9" className="fill-foreground/70" fontFamily="monospace">UTS · σy · 등급</text>
  </svg>
);
export const SvgDieMold = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    {/* 상하 다이 + 캐비티 (사출 금형 도식) */}
    <rect x="14" y="18" width="92" height="22" className={`fill-foreground/15 ${stroke}`} strokeWidth="1.5" />
    <path d="M 36 40 L 36 52 L 50 60 L 70 60 L 84 52 L 84 40" className="fill-rose-100/60 stroke-rose-500" strokeWidth="1.5" />
    <rect x="14" y="60" width="92" height="22" className={`fill-foreground/15 ${stroke}`} strokeWidth="1.5" />
    {/* 분할선 */}
    <line x1="14" y1="50" x2="106" y2="50" strokeDasharray="3 2" className="stroke-accent/60" strokeWidth="1" />
    <text x="60" y="14" textAnchor="middle" fontSize="8" className="fill-foreground/70" fontFamily="monospace">HV ≥ 600 · 인성</text>
  </svg>
);

/* ─── 단면 형상 SVG (Chapter 3 카드) ─────────────────────────────────────── */
export const SvgRect = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <rect x="22" y="10" width="46" height="60" className="fill-accent/15 stroke-accent" strokeWidth="2"/>
    <line x1="14" y1="40" x2="76" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="40" y="78" fontSize="11" className="fill-foreground/70" fontFamily="monospace">b</text>
    <text x="73" y="44" fontSize="11" className="fill-foreground/70" fontFamily="monospace">h</text>
  </svg>
);
export const SvgSquare = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <rect x="24" y="14" width="42" height="52" className="fill-accent/15 stroke-accent" strokeWidth="2"/>
    <line x1="16" y1="40" x2="74" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="42" y="78" fontSize="11" className="fill-foreground/70" fontFamily="monospace">a</text>
  </svg>
);
export const SvgCircle = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <circle cx="45" cy="40" r="26" className="fill-accent/15 stroke-accent" strokeWidth="2"/>
    <line x1="14" y1="40" x2="76" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="42" y="78" fontSize="11" className="fill-foreground/70" fontFamily="monospace">d</text>
  </svg>
);
export const SvgBox = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <rect x="16" y="10" width="58" height="60" className="fill-accent/15 stroke-accent" strokeWidth="2"/>
    <rect x="30" y="22" width="30" height="36" className="fill-background stroke-accent" strokeWidth="1.5"/>
    <line x1="10" y1="40" x2="80" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="36" y="78" fontSize="10" className="fill-foreground/70" fontFamily="monospace">B,b</text>
  </svg>
);
export const SvgTube = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <circle cx="45" cy="40" r="28" className="fill-accent/15 stroke-accent" strokeWidth="2"/>
    <circle cx="45" cy="40" r="16" className="fill-background stroke-accent" strokeWidth="1.5"/>
    <line x1="12" y1="40" x2="78" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="40" y="78" fontSize="10" className="fill-foreground/70" fontFamily="monospace">D,d</text>
  </svg>
);
export const SvgIBeam = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <g className="fill-accent/15 stroke-accent" strokeWidth="1.6">
      <rect x="14" y="12" width="62" height="10"/>
      <rect x="40" y="22" width="10" height="36"/>
      <rect x="14" y="58" width="62" height="10"/>
    </g>
    <line x1="8" y1="40" x2="82" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="32" y="78" fontSize="10" className="fill-foreground/70" fontFamily="monospace">I-빔</text>
  </svg>
);

/* ─── 보 케이스 SVG 헬퍼 ─────────────────────────────────────────────────── */
const wallHatch = (x: number) => (
  <g className={stroke} strokeWidth="1">
    <line x1={x} y1={12} x2={x} y2={60}/>
    {[16,24,32,40,48,56].map(y => <line key={y} x1={x-4} y1={y-2} x2={x} y2={y+2}/>)}
  </g>
);
const wallHatchR = (x: number) => (
  <g className={stroke} strokeWidth="1">
    <line x1={x} y1={12} x2={x} y2={60}/>
    {[16,24,32,40,48,56].map(y => <line key={y} x1={x} y1={y-2} x2={x+4} y2={y+2}/>)}
  </g>
);
const udl = (x1: number, x2: number) => (
  <g className={force} strokeWidth="1.5" fill="none">
    {Array.from({length: Math.floor((x2-x1)/14)+1}, (_,i)=>x1+8+i*14).filter(x=>x<x2-4).map(x => (
      <g key={x}><line x1={x} y1={14} x2={x} y2={28}/><polyline points={`${x-2},26 ${x},30 ${x+2},26`}/></g>
    ))}
  </g>
);

/* 좌굴 다이어그램 (Chapter 5) */
export const SvgColumn = () => (
  <svg viewBox="0 0 120 100" className="w-full h-full">
    <g className={stroke} strokeWidth="1"><line x1="20" y1="88" x2="100" y2="88"/>{[24,34,44,54,64,74,84].map(x => <line key={x} x1={x} y1={88} x2={x-4} y2={96}/>)}</g>
    <rect x="55" y="18" width="10" height="70" className={`fill-accent/15 ${accent}`} strokeWidth="2"/>
    <g className={force} strokeWidth="2.4" fill="none"><line x1="60" y1="4" x2="60" y2="18"/><polyline points="55,14 60,20 65,14"/></g>
    <text x="48" y="8" fontSize="12" className="fill-rose-500" fontFamily="monospace">P</text>
  </svg>
);

/* ─── 큰 교육용 도식 (Chapter 인트로용) ─────────────────────────────────── */

/** R188 — viewBox height 200 → 215 (연신율 label y=200 잘림 fix). */
export const SvgStressStrain = () => (
  <svg viewBox="0 0 320 215" className="w-full h-full">
    <g className="stroke-foreground/10" strokeWidth="0.8">
      {[40, 80, 120, 160].map(y => <line key={y} x1="40" y1={y} x2="300" y2={y} />)}
      {[80, 130, 180, 230, 280].map(x => <line key={x} x1={x} y1="20" y2="180" x2={x} />)}
    </g>
    <g className="stroke-foreground/80" strokeWidth="1.5" fill="none">
      <line x1="40" y1="20" x2="40" y2="180" />
      <line x1="40" y1="180" x2="300" y2="180" />
      <polyline points="36,28 40,18 44,28" />
      <polyline points="292,176 302,180 292,184" />
    </g>
    <text x="20" y="22" fontSize="11" className="fill-foreground font-semibold">σ</text>
    <text x="306" y="178" fontSize="11" className="fill-foreground font-semibold">ε</text>
    <path d="M 40 180 L 100 70 Q 115 60 145 60 Q 195 65 220 40 Q 245 40 260 130" fill="none" className="stroke-accent" strokeWidth="2.6" />
    <g className="stroke-rose-500" strokeWidth="2"><line x1="255" y1="125" x2="265" y2="135" /><line x1="265" y1="125" x2="255" y2="135" /></g>
    <text x="248" y="148" fontSize="10" className="fill-rose-500" fontFamily="monospace">파단</text>
    <line x1="40" y1="70" x2="100" y2="70" className="stroke-emerald-600" strokeDasharray="3 2" strokeWidth="1.2" />
    <line x1="100" y1="70" x2="100" y2="180" className="stroke-emerald-600" strokeDasharray="3 2" strokeWidth="1.2" />
    <circle cx="100" cy="70" r="3.5" className="fill-emerald-600" />
    <text x="18" y="74" fontSize="11" className="fill-emerald-600 font-bold">σy</text>
    <line x1="40" y1="40" x2="220" y2="40" className="stroke-violet-600" strokeDasharray="3 2" strokeWidth="1.2" />
    <circle cx="220" cy="40" r="3.5" className="fill-violet-600" />
    <text x="14" y="44" fontSize="11" className="fill-violet-600 font-bold">UTS</text>
    <text x="58" y="120" fontSize="10" className="fill-amber-600 font-semibold">E = 기울기 (강성)</text>
    <line x1="55" y1="135" x2="95" y2="80" className="stroke-amber-600" strokeWidth="1.4" strokeDasharray="3 2" />
    <g className="stroke-sky-500" strokeWidth="1.2" fill="none">
      <line x1="40" y1="192" x2="260" y2="192" />
      <polyline points="44,189 40,192 44,195" />
      <polyline points="256,189 260,192 256,195" />
    </g>
    <text x="80" y="208" fontSize="10" className="fill-sky-600 font-semibold">연신율 (파단 변형률)</text>
    <text x="55" y="155" fontSize="9" className="fill-foreground/60">탄성</text>
    <text x="115" y="55" fontSize="9" className="fill-foreground/60">소성(가공경화)</text>
    <text x="226" y="55" fontSize="9" className="fill-foreground/60">네킹</text>
  </svg>
);

/** 굽힘 응력 분포 — 중립축과 σ_max 위치, 왜 I가 중요한가 */
export const SvgBendingStress = () => (
  <svg viewBox="0 0 320 180" className="w-full h-full">
    <text x="6" y="14" fontSize="10" className="fill-foreground/70 font-semibold">① 굽힘 받은 보</text>
    <path d="M 10 50 Q 80 90 150 50" fill="none" className="stroke-accent" strokeWidth="2.2" />
    <path d="M 10 70 Q 80 110 150 70" fill="none" className="stroke-accent/50" strokeWidth="2" strokeDasharray="3 2" />
    <path d="M 14 38 a 8 8 0 1 1 0 16" fill="none" className="stroke-foreground/70" strokeWidth="1.3" />
    <polygon points="13,38 18,38 16,33" className="fill-foreground/70" />
    <path d="M 146 38 a 8 8 0 1 0 0 16" fill="none" className="stroke-foreground/70" strokeWidth="1.3" />
    <polygon points="146,38 142,38 144,33" className="fill-foreground/70" />
    <text x="20" y="34" fontSize="9" className="fill-foreground/70" fontFamily="monospace">M</text>
    <text x="138" y="34" fontSize="9" className="fill-foreground/70" fontFamily="monospace">M</text>
    <text x="172" y="14" fontSize="10" className="fill-foreground/70 font-semibold">② 단면 + 응력 분포</text>
    <rect x="180" y="30" width="50" height="120" className="fill-accent/15 stroke-accent" strokeWidth="2" />
    <line x1="172" y1="90" x2="312" y2="90" className="stroke-foreground/60" strokeDasharray="3 2" strokeWidth="1.2" />
    <text x="168" y="94" fontSize="9" className="fill-foreground/70" textAnchor="end">중립축</text>
    <polygon points="230,30 280,30 230,90" className="fill-rose-500/20 stroke-rose-500" strokeWidth="1.5" />
    <polygon points="230,90 280,150 230,150" className="fill-sky-500/20 stroke-sky-500" strokeWidth="1.5" />
    <g className="stroke-rose-500" strokeWidth="1.4" fill="rose-500">
      <line x1="232" y1="32" x2="278" y2="32" /><polyline points="274,28 278,32 274,36" fill="none" />
      <line x1="232" y1="50" x2="266" y2="50" /><polyline points="262,46 266,50 262,54" fill="none" />
      <line x1="232" y1="70" x2="250" y2="70" /><polyline points="246,66 250,70 246,74" fill="none" />
    </g>
    <g className="stroke-sky-500" strokeWidth="1.4" fill="none">
      <line x1="232" y1="110" x2="252" y2="110" /><polyline points="248,106 252,110 248,114" />
      <line x1="232" y1="130" x2="268" y2="130" /><polyline points="264,126 268,130 264,134" />
      <line x1="232" y1="148" x2="278" y2="148" /><polyline points="274,144 278,148 274,152" />
    </g>
    {/* R188 — '압축'/'인장' label x position 282 → 232, textAnchor='middle' 로 변경 (viewBox 320 right edge 잘림 fix). */}
    <text x="255" y="22" fontSize="9" textAnchor="middle" className="fill-rose-500 font-semibold">σ_max (압축)</text>
    <text x="255" y="170" fontSize="9" textAnchor="middle" className="fill-sky-500 font-semibold">σ_max (인장)</text>
    <g className="stroke-foreground/60" strokeWidth="1" fill="none">
      <line x1="174" y1="30" x2="178" y2="30" /><line x1="174" y1="90" x2="178" y2="90" /><line x1="176" y1="30" x2="176" y2="90" />
    </g>
    <text x="160" y="62" fontSize="10" className="fill-foreground/70" fontFamily="monospace">c</text>
    <text x="2" y="172" fontSize="11" className="fill-foreground font-mono">σ_max = M · c / I &nbsp;→&nbsp; 같은 M·c여도 I가 크면 σ가 작아짐</text>
  </svg>
);

/** Ashby 차트 샘플 — 한계선·외피·등지수선·통과 영역 라벨 */
export const SvgAshbyChart = () => (
  <svg viewBox="0 0 320 220" className="w-full h-full">
    <text x="8" y="14" fontSize="10" className="fill-foreground/70 font-semibold">샘플: ρ vs σy (log–log)</text>
    <g className="stroke-foreground/70" strokeWidth="1.4" fill="none">
      <line x1="40" y1="30" x2="40" y2="190" />
      <line x1="40" y1="190" x2="300" y2="190" />
      <polyline points="36,38 40,28 44,38" />
      <polyline points="292,186 302,190 292,194" />
    </g>
    <text x="14" y="34" fontSize="10" className="fill-foreground/70 font-mono">σy</text>
    <text x="304" y="190" fontSize="10" className="fill-foreground/70 font-mono">ρ</text>
    <line x1="40" y1="110" x2="300" y2="110" className="stroke-amber-500" strokeWidth="1.5" strokeDasharray="5 3" />
    <text x="240" y="106" fontSize="9" className="fill-amber-600 font-semibold">σy ≥ 한계 (필터)</text>
    <ellipse cx="220" cy="160" rx="38" ry="14" className="fill-emerald-500/15 stroke-emerald-600" strokeWidth="1.5" />
    <text x="200" y="178" fontSize="9" className="fill-emerald-700">폴리머</text>
    <ellipse cx="160" cy="120" rx="28" ry="14" className="fill-amber-500/15 stroke-amber-600" strokeWidth="1.5" />
    <text x="142" y="138" fontSize="9" className="fill-amber-700">알루미늄</text>
    <ellipse cx="120" cy="78" rx="22" ry="16" className="fill-sky-500/15 stroke-sky-600" strokeWidth="1.5" />
    <text x="104" y="56" fontSize="9" className="fill-sky-700">티타늄</text>
    <ellipse cx="200" cy="70" rx="34" ry="20" className="fill-violet-500/15 stroke-violet-600" strokeWidth="1.5" />
    <text x="186" y="48" fontSize="9" className="fill-violet-700">강·고합금</text>
    <line x1="60" y1="180" x2="280" y2="55" className="stroke-rose-500" strokeWidth="2.2" />
    <polygon points="280,55 274,57 277,63" className="fill-rose-500" />
    <text x="200" y="80" fontSize="9" className="fill-rose-500 font-bold">M = σy/ρ ↑ 더 좋음</text>
    <text x="50" y="48" fontSize="9" className="fill-foreground/70 font-semibold">통과: 한계선 위 AND 등지수선 위쪽</text>
    <g fontSize="9" className="fill-foreground/70" fontFamily="monospace">
      <text x="58" y="210">─ 한계(제약)</text>
      <text x="160" y="210">→ 성능지수 방향</text>
    </g>
  </svg>
);

/** Function · Constraint · Objective · Free → M 흐름도 */
export const SvgFCOF = () => (
  <svg viewBox="0 0 320 160" className="w-full h-full">
    {[
      { x: 20, y: 28, color: 'sky', label: '기능 (Function)', sub: '인장재 / 보 / 패널 / 축' },
      { x: 20, y: 88, color: 'amber', label: '제약 (Constraints)', sub: 'σy ≥ X · 온도 ≥ Y · 공정' },
      { x: 180, y: 28, color: 'emerald', label: '목적 (Objective)', sub: '무게↓ · 원가↓ · 강성↑' },
      { x: 180, y: 88, color: 'violet', label: '자유변수 (Free)', sub: '단면적 · 두께 · 재료' },
    ].map((b, i) => (
      <g key={i}>
        <rect x={b.x} y={b.y} width="120" height="48" rx="6" className={`fill-${b.color}-500/10 stroke-${b.color}-500`} strokeWidth="1.5" />
        <text x={b.x + 8} y={b.y + 18} fontSize="11" className={`fill-${b.color}-700 font-bold`}>{b.label}</text>
        <text x={b.x + 8} y={b.y + 34} fontSize="9" className="fill-foreground/70">{b.sub}</text>
      </g>
    ))}
    <g className="stroke-rose-500" strokeWidth="1.8" fill="none">
      <path d="M 140 52 Q 160 56 158 76" />
      <path d="M 140 112 Q 160 108 158 84" />
      <path d="M 180 52 Q 160 56 162 76" />
      <path d="M 180 112 Q 160 108 162 84" />
    </g>
    <circle cx="160" cy="80" r="14" className="fill-rose-500/15 stroke-rose-500" strokeWidth="2" />
    <text x="151" y="84" fontSize="13" className="fill-rose-600 font-bold" fontFamily="monospace">M</text>
    <rect x="60" y="135" width="200" height="20" rx="4" className="fill-rose-500/10 stroke-rose-500" strokeWidth="1.5" />
    <text x="74" y="150" fontSize="10" className="fill-rose-700 font-semibold">자유변수 소거 → 성능지수 M (물성 조합)</text>
  </svg>
);

/** 비틀림 축 + 단면 전단응력 분포 */
export const SvgTorsion = () => (
  <svg viewBox="0 0 320 160" className="w-full h-full">
    <text x="6" y="14" fontSize="10" className="fill-foreground/70 font-semibold">① 토크 T 작용</text>
    <g className="fill-accent/15 stroke-accent" strokeWidth="2">
      <ellipse cx="40" cy="80" rx="10" ry="28" />
      <rect x="40" y="52" width="120" height="56" />
      <ellipse cx="160" cy="80" rx="10" ry="28" />
    </g>
    <g className="stroke-rose-500" strokeWidth="2" fill="none">
      <path d="M 156 36 a 18 14 0 1 1 14 12" />
      <polygon points="166,52 174,46 172,56" className="fill-rose-500" />
    </g>
    <text x="142" y="32" fontSize="11" className="fill-rose-500 font-bold" fontFamily="monospace">T</text>
    <line x1="40" y1="60" x2="160" y2="68" className="stroke-foreground/50" strokeDasharray="3 2" strokeWidth="1" />
    <line x1="40" y1="100" x2="160" y2="92" className="stroke-foreground/50" strokeDasharray="3 2" strokeWidth="1" />
    <text x="186" y="14" fontSize="10" className="fill-foreground/70 font-semibold">② 단면 전단응력</text>
    <circle cx="250" cy="80" r="44" className="fill-accent/10 stroke-accent" strokeWidth="2" />
    {[12, 22, 32, 42].map((r, i) => (
      <g key={i} className="stroke-rose-500" strokeWidth="1.4" fill="none">
        <path d={`M ${250 + r - 3} 80 a ${r} ${r} 0 0 1 6 6`} />
        <polygon points={`${256 + r - 3},85 ${256 + r + 1},91 ${254 + r - 1},85`} className="fill-rose-500" />
      </g>
    ))}
    <line x1="250" y1="80" x2="294" y2="80" className="stroke-foreground/60" strokeWidth="1" />
    <text x="296" y="84" fontSize="9" className="fill-foreground/70" fontFamily="monospace">c=D/2</text>
    <text x="244" y="138" fontSize="10" className="fill-rose-600 font-bold" fontFamily="monospace">τ_max = T·c/J</text>
    <text x="248" y="152" fontSize="9" className="fill-foreground/70 italic">중심: τ=0</text>
  </svg>
);

/** Mohr 원 + 응력 요소 */
export const SvgMohr = () => (
  <svg viewBox="0 0 320 180" className="w-full h-full">
    <text x="6" y="14" fontSize="10" className="fill-foreground/70 font-semibold">① 응력 요소</text>
    <rect x="20" y="50" width="80" height="80" className="fill-accent/10 stroke-accent" strokeWidth="2" />
    <g className="stroke-sky-600" strokeWidth="1.8" fill="none">
      <line x1="8" y1="90" x2="20" y2="90" /><polyline points="14,86 20,90 14,94" />
      <line x1="100" y1="90" x2="112" y2="90" /><polyline points="106,86 112,90 106,94" />
    </g>
    <text x="0" y="86" fontSize="11" className="fill-sky-700 font-bold" fontFamily="monospace">σx</text>
    <text x="105" y="86" fontSize="11" className="fill-sky-700 font-bold" fontFamily="monospace">σx</text>
    <g className="stroke-rose-500" strokeWidth="1.6" fill="none">
      <line x1="32" y1="40" x2="88" y2="40" /><polyline points="84,36 88,40 84,44" />
      <line x1="32" y1="140" x2="88" y2="140" /><polyline points="36,136 32,140 36,144" />
    </g>
    <text x="56" y="32" fontSize="10" className="fill-rose-500 font-bold" fontFamily="monospace">τ</text>
    <text x="170" y="14" fontSize="10" className="fill-foreground/70 font-semibold">② Mohr 원</text>
    <g className="stroke-foreground/80" strokeWidth="1.4" fill="none">
      <line x1="170" y1="100" x2="310" y2="100" />
      <line x1="240" y1="40" x2="240" y2="160" />
      <polyline points="306,96 314,100 306,104" />
      <polyline points="236,46 240,38 244,46" />
    </g>
    <text x="312" y="98" fontSize="10" className="fill-foreground/70 font-mono">σ</text>
    <text x="244" y="40" fontSize="10" className="fill-foreground/70 font-mono">τ</text>
    <circle cx="258" cy="100" r="36" className="fill-violet-500/10 stroke-violet-600" strokeWidth="2" />
    <line x1="258" y1="100" x2="294" y2="100" className="stroke-violet-600" strokeWidth="1" strokeDasharray="2 2" />
    <circle cx="294" cy="100" r="3" className="fill-violet-600" />
    <text x="284" y="118" fontSize="9" className="fill-violet-700 font-mono">σ₁</text>
    <circle cx="222" cy="100" r="3" className="fill-violet-600" />
    <text x="208" y="118" fontSize="9" className="fill-violet-700 font-mono">σ₂</text>
    <circle cx="258" cy="64" r="3" className="fill-rose-500" />
    <text x="262" y="62" fontSize="9" className="fill-rose-500 font-mono">τ_max</text>
    <text x="170" y="172" fontSize="10" className="fill-foreground font-mono">σ_eq = √(σx² + 3τ²) ≤ σy/SF</text>
  </svg>
);

/** 얇은 압력 용기 — 후프·축 응력 */
export const SvgPressureVessel = () => (
  <svg viewBox="0 0 320 160" className="w-full h-full">
    <ellipse cx="60" cy="80" rx="14" ry="40" className="fill-accent/15 stroke-accent" strokeWidth="2" />
    <line x1="60" y1="40" x2="200" y2="40" className="stroke-accent" strokeWidth="2" />
    <line x1="60" y1="120" x2="200" y2="120" className="stroke-accent" strokeWidth="2" />
    <ellipse cx="200" cy="80" rx="14" ry="40" className="fill-accent/15 stroke-accent" strokeWidth="2" />
    <path d="M 200 40 a 14 40 0 0 0 0 80" fill="none" className="stroke-accent" strokeWidth="2" strokeDasharray="2 2" />
    <g className="stroke-rose-500" strokeWidth="1.4" fill="none">
      <line x1="130" y1="65" x2="130" y2="50" /><polyline points="126,54 130,48 134,54" />
      <line x1="130" y1="95" x2="130" y2="110" /><polyline points="126,106 130,112 134,106" />
      <line x1="130" y1="80" x2="120" y2="80" /><polyline points="124,76 118,80 124,84" />
      <line x1="130" y1="80" x2="140" y2="80" /><polyline points="136,76 142,80 136,84" />
    </g>
    <text x="125" y="84" fontSize="10" className="fill-rose-500 font-bold" fontFamily="monospace">p</text>
    <g className="stroke-violet-600" strokeWidth="1.6" fill="none">
      <path d="M 130 40 q -10 -10 -16 0" /><polygon points="114,40 110,36 118,36" className="fill-violet-600" />
      <path d="M 130 120 q -10 10 -16 0" /><polygon points="114,120 110,124 118,124" className="fill-violet-600" />
    </g>
    <text x="84" y="30" fontSize="10" className="fill-violet-700 font-semibold">σ_h (후프)</text>
    <g className="stroke-emerald-600" strokeWidth="1.6" fill="none">
      <line x1="44" y1="80" x2="30" y2="80" /><polyline points="34,76 28,80 34,84" />
      <line x1="216" y1="80" x2="230" y2="80" /><polyline points="226,76 232,80 226,84" />
    </g>
    <text x="14" y="98" fontSize="10" className="fill-emerald-700 font-semibold">σ_a (축)</text>
    <text x="222" y="98" fontSize="10" className="fill-emerald-700 font-semibold">σ_a</text>
    <g className="stroke-foreground/50" strokeWidth="1" fill="none"><line x1="200" y1="80" x2="200" y2="120" /></g>
    <text x="204" y="105" fontSize="9" className="fill-foreground/70" fontFamily="monospace">r</text>
    <text x="246" y="80" fontSize="9" className="fill-foreground/70" fontFamily="monospace">t (얇음)</text>
    <text x="22" y="148" fontSize="11" className="fill-foreground font-mono">σ_h = p·r/t · σ_a = p·r/(2t)</text>
  </svg>
);

/* ─── 물성 카드용 작은 아이콘 ───────────────────────────────────────────── */
const _box = "w-full h-full";

export const IconYield = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <g className="stroke-foreground/70" strokeWidth="1.2" fill="none"><line x1="10" y1="42" x2="10" y2="8" /><line x1="10" y1="42" x2="74" y2="42" /></g>
    <path d="M 10 42 L 32 20 Q 40 17 56 20 Q 62 25 60 38" fill="none" className="stroke-accent" strokeWidth="2" />
    <circle cx="32" cy="20" r="3" className="fill-emerald-600" />
    <text x="38" y="14" fontSize="10" className="fill-emerald-600 font-bold" fontFamily="monospace">σy</text>
  </svg>
);
export const IconUTS = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <g className="stroke-foreground/70" strokeWidth="1.2" fill="none"><line x1="10" y1="42" x2="10" y2="8" /><line x1="10" y1="42" x2="74" y2="42" /></g>
    <path d="M 10 42 L 28 18 Q 36 14 50 14 Q 60 16 64 36" fill="none" className="stroke-accent" strokeWidth="2" />
    <circle cx="48" cy="13" r="3" className="fill-violet-600" />
    <text x="52" y="14" fontSize="9" className="fill-violet-600 font-bold" fontFamily="monospace">UTS</text>
  </svg>
);
export const IconElongation = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <g className="stroke-foreground/70" strokeWidth="1.2" fill="none"><line x1="10" y1="42" x2="10" y2="8" /><line x1="10" y1="42" x2="74" y2="42" /></g>
    <path d="M 10 42 L 22 14" fill="none" className="stroke-rose-500" strokeWidth="2" />
    <line x1="22" y1="13" x2="24" y2="11" className="stroke-rose-500" strokeWidth="2" />
    <text x="14" y="10" fontSize="8" className="fill-rose-500">취성</text>
    <path d="M 10 42 L 30 24 Q 40 22 58 22 L 62 38" fill="none" className="stroke-emerald-600" strokeWidth="2" />
    <text x="46" y="18" fontSize="8" className="fill-emerald-600">연성</text>
  </svg>
);
export const IconE = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <g className="stroke-foreground/70" strokeWidth="1.2" fill="none"><line x1="10" y1="42" x2="10" y2="8" /><line x1="10" y1="42" x2="74" y2="42" /></g>
    <line x1="10" y1="42" x2="32" y2="10" className="stroke-amber-600" strokeWidth="2" />
    <text x="18" y="14" fontSize="8" className="fill-amber-600">E ↑</text>
    <line x1="10" y1="42" x2="70" y2="30" className="stroke-sky-600" strokeWidth="2" />
    <text x="50" y="38" fontSize="8" className="fill-sky-600">E ↓</text>
  </svg>
);
export const IconHardness = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <line x1="6" y1="36" x2="74" y2="36" className="stroke-foreground/70" strokeWidth="1.4" />
    <polygon points="40,8 30,30 50,30" className="fill-accent/30 stroke-accent" strokeWidth="1.6" />
    <polygon points="30,36 40,42 50,36" className="fill-rose-500/30 stroke-rose-500" strokeWidth="1.4" />
    <g className="stroke-rose-500" strokeWidth="1.6" fill="none">
      <line x1="40" y1="2" x2="40" y2="10" /><polyline points="37,8 40,11 43,8" />
    </g>
    <text x="56" y="26" fontSize="9" className="fill-foreground/70" fontFamily="monospace">HV</text>
  </svg>
);
export const IconFatigue = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <g className="stroke-foreground/70" strokeWidth="1.2" fill="none"><line x1="10" y1="42" x2="10" y2="6" /><line x1="10" y1="42" x2="74" y2="42" /></g>
    <text x="2" y="10" fontSize="7" className="fill-foreground/60">σ_a</text>
    <text x="68" y="50" fontSize="7" className="fill-foreground/60">log N</text>
    <path d="M 12 10 Q 28 14 40 24 Q 56 32 70 32" fill="none" className="stroke-accent" strokeWidth="2" />
    <line x1="40" y1="32" x2="70" y2="32" className="stroke-rose-500" strokeWidth="1.2" strokeDasharray="2 2" />
    <text x="46" y="30" fontSize="7" className="fill-rose-500">한도</text>
  </svg>
);
export const IconDensity = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <g className="fill-accent/20 stroke-accent" strokeWidth="1.4">
      <polygon points="14,20 36,8 60,20 60,40 38,52 14,40" />
      <line x1="14" y1="20" x2="38" y2="32" />
      <line x1="60" y1="20" x2="38" y2="32" />
      <line x1="38" y1="32" x2="38" y2="52" />
    </g>
    <g className="fill-foreground/70">
      <circle cx="24" cy="26" r="1.2" /><circle cx="32" cy="24" r="1.2" /><circle cx="40" cy="22" r="1.2" />
      <circle cx="48" cy="24" r="1.2" /><circle cx="28" cy="34" r="1.2" /><circle cx="36" cy="36" r="1.2" /><circle cx="44" cy="34" r="1.2" /><circle cx="52" cy="32" r="1.2" />
    </g>
    <text x="64" y="42" fontSize="9" className="fill-foreground/70" fontFamily="monospace">ρ</text>
  </svg>
);
export const IconCTE = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <rect x="6" y="14" width="36" height="14" className="fill-sky-500/20 stroke-sky-600" strokeWidth="1.4" />
    <rect x="6" y="30" width="56" height="14" className="fill-rose-500/20 stroke-rose-500" strokeWidth="1.4" />
    <g className="stroke-foreground/70" strokeWidth="1" fill="none">
      <line x1="42" y1="50" x2="62" y2="50" />
      <polyline points="44,48 42,50 44,52" /><polyline points="60,48 62,50 60,52" />
    </g>
    <text x="42" y="58" fontSize="7" className="fill-foreground/70">ΔL</text>
    <text x="62" y="10" fontSize="8" className="fill-rose-500 font-bold">+ΔT</text>
  </svg>
);
export const IconK = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <rect x="6" y="20" width="68" height="14" className="fill-accent/15 stroke-accent" strokeWidth="1.4" />
    <circle cx="10" cy="27" r="6" className="fill-rose-500/30 stroke-rose-500" strokeWidth="1.2" />
    <circle cx="70" cy="27" r="6" className="fill-sky-500/30 stroke-sky-600" strokeWidth="1.2" />
    <g className="stroke-rose-500" strokeWidth="1.4" fill="none">
      <line x1="22" y1="27" x2="34" y2="27" /><polyline points="30,24 34,27 30,30" />
      <line x1="38" y1="27" x2="50" y2="27" /><polyline points="46,24 50,27 46,30" />
      <line x1="54" y1="27" x2="62" y2="27" /><polyline points="58,24 62,27 58,30" />
    </g>
  </svg>
);
export const IconMaxTemp = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <rect x="36" y="4" width="8" height="32" rx="4" className="fill-rose-500/20 stroke-rose-500" strokeWidth="1.4" />
    <circle cx="40" cy="40" r="6" className="fill-rose-500 stroke-rose-500" strokeWidth="1.4" />
    <line x1="20" y1="18" x2="56" y2="18" className="stroke-rose-500" strokeDasharray="3 2" strokeWidth="1.2" />
    <text x="58" y="22" fontSize="9" className="fill-rose-500 font-bold" fontFamily="monospace">한계</text>
    <g className="stroke-foreground/50" strokeWidth="0.8"><line x1="32" y1="12" x2="36" y2="12" /><line x1="32" y1="22" x2="36" y2="22" /><line x1="32" y1="30" x2="36" y2="30" /></g>
  </svg>
);

/* 개선된 LoadCard 처짐 곡선 오버레이 (Chapter 4) — 변형 모양·δ_max 표시 */
/* R189 — Cantilever F + δ_max label 겹침 fix.
 *   기존: F arrow at x=180 (y=40-76), δ_max indicator at x=170 (y=38-64), δ_max label at x=150 y=76.
 *         "δ_max" text width ~30px → 150+30=180 = F arrow x=180 → 정확히 겹침.
 *   변경: δ_max indicator + label 을 보 곡선 아래 위쪽 (x=120, y=55) 으로 이동, F arrow 단독 keep. */
export const SvgCantileverV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    {wallHatch(20)}
    <line x1="20" y1="38" x2="180" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    <path d="M 20 38 Q 110 38 180 64" fill="none" className="stroke-accent" strokeWidth="3" />
    <g className={force} strokeWidth="2.4" fill="none"><line x1="180" y1="40" x2="180" y2="76"/><polyline points="176,70 180,78 184,70"/></g>
    <text x="184" y="58" fontSize="11" className="fill-rose-500" fontFamily="monospace">F</text>
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="140" y1="38" x2="140" y2="56" /><polyline points="137,42 140,38 143,42" /><polyline points="137,52 140,56 143,52" /></g>
    <text x="98" y="52" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
    <text x="92" y="86" fontSize="11" className="fill-foreground/70" fontFamily="monospace">L</text>
  </svg>
);
export const SvgCantileverUDLV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    {wallHatch(20)}
    <line x1="20" y1="38" x2="180" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    <path d="M 20 38 Q 110 40 180 56" fill="none" className="stroke-accent" strokeWidth="3" />
    {udl(28, 180)}
    <text x="94" y="14" fontSize="12" className="fill-rose-500" fontFamily="monospace">w</text>
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="170" y1="38" x2="170" y2="56" /><polyline points="167,42 170,38 173,42" /><polyline points="167,52 170,56 173,52" /></g>
    <text x="150" y="72" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
  </svg>
);
export const SvgSimpleCenterV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    <line x1="14" y1="38" x2="186" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    <path d="M 14 38 Q 100 60 186 38" fill="none" className="stroke-accent" strokeWidth="3" />
    <polygon points="14,38 6,52 22,52" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    <polygon points="186,38 178,52 194,52" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    <g className={force} strokeWidth="2.4" fill="none"><line x1="100" y1="14" x2="100" y2="34"/><polyline points="95,28 100,36 105,28"/></g>
    <text x="92" y="11" fontSize="12" className="fill-rose-500" fontFamily="monospace">F</text>
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="106" y1="38" x2="106" y2="52" /><polyline points="103,42 106,38 109,42" /><polyline points="103,48 106,52 109,48" /></g>
    <text x="110" y="48" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
  </svg>
);
export const SvgSimpleUDLV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    <line x1="14" y1="38" x2="186" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    <path d="M 14 38 Q 100 56 186 38" fill="none" className="stroke-accent" strokeWidth="3" />
    <polygon points="14,38 6,52 22,52" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    <polygon points="186,38 178,52 194,52" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    {udl(22, 180)}
    <text x="94" y="11" fontSize="12" className="fill-rose-500" fontFamily="monospace">w</text>
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="106" y1="38" x2="106" y2="48" /></g>
    <text x="110" y="48" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
  </svg>
);
export const SvgFixedCenterV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    {wallHatch(20)}{wallHatchR(180)}
    <line x1="20" y1="38" x2="180" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    <path d="M 20 38 C 60 38 80 50 100 50 C 120 50 140 38 180 38" fill="none" className="stroke-accent" strokeWidth="3" />
    <g className={force} strokeWidth="2.4" fill="none"><line x1="100" y1="14" x2="100" y2="34"/><polyline points="95,28 100,36 105,28"/></g>
    <text x="92" y="11" fontSize="12" className="fill-rose-500" fontFamily="monospace">F</text>
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="108" y1="38" x2="108" y2="50" /></g>
    <text x="112" y="48" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
  </svg>
);
export const SvgFixedUDLV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    {wallHatch(20)}{wallHatchR(180)}
    <line x1="20" y1="38" x2="180" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    <path d="M 20 38 C 60 38 80 46 100 46 C 120 46 140 38 180 38" fill="none" className="stroke-accent" strokeWidth="3" />
    {udl(28, 180)}
    <text x="94" y="11" fontSize="12" className="fill-rose-500" fontFamily="monospace">w</text>
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="106" y1="38" x2="106" y2="46" /></g>
    <text x="110" y="46" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
  </svg>
);
