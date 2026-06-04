/*
 * R67 Sprint B — Engineering Tools.
 * 6 계산기 — Stress concentration Kt / Galvanic / Buckling / CTE mismatch / Hardness / Pressure vessel.
 * 각 카드 = 입력 + 결과 + Guide 챕터 link.
 */
import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Calculator, Zap, BookOpen } from 'lucide-react';

const W = 'rounded-lg border border-border bg-card p-4';
const In = 'h-7 px-2 text-[12px] rounded border border-border bg-background focus:outline-none focus:border-accent';
const Lab = 'text-[11px] font-semibold text-muted-foreground block mb-1';

/* ───────── Tool illustrations (small SVG) ───────── */
function KtIllust({ shape }: { shape: string }) {
  return (
    <svg viewBox="0 0 200 70" className="w-full h-14 mb-2">
      {/* Plate */}
      <rect x="20" y="20" width="160" height="30" fill="oklch(0.97 0.005 250)" stroke="oklch(0.5 0.04 250)" />
      {/* Tension arrows */}
      <g stroke="oklch(0.55 0.12 30)" strokeWidth="1.5">
        <line x1="2" y1="35" x2="18" y2="35" markerEnd="url(#arrLeft)" />
        <line x1="198" y1="35" x2="182" y2="35" markerEnd="url(#arrRight)" />
      </g>
      <defs>
        <marker id="arrLeft" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto"><path d="M6,0 L0,3 L6,6 z" fill="oklch(0.55 0.12 30)" /></marker>
        <marker id="arrRight" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.12 30)" /></marker>
      </defs>
      {/* Feature based on shape */}
      {shape === 'hole' && <circle cx="100" cy="35" r="9" fill="oklch(0.92 0.012 250)" stroke="oklch(0.55 0.12 30)" strokeWidth="1.5" />}
      {shape === 'fillet' && (
        <g>
          <rect x="20" y="10" width="80" height="50" fill="oklch(0.97 0.005 250)" stroke="oklch(0.5 0.04 250)" />
          <path d="M 100 10 Q 105 10 105 15 L 105 55 Q 105 60 100 60" fill="none" stroke="oklch(0.55 0.12 30)" strokeWidth="1.5" />
        </g>
      )}
      {shape === 'sharpCorner' && (
        <g>
          <rect x="20" y="5" width="80" height="60" fill="oklch(0.97 0.005 250)" stroke="oklch(0.5 0.04 250)" />
          <line x1="100" y1="5" x2="100" y2="65" stroke="oklch(0.55 0.12 30)" strokeWidth="2" />
          <text x="105" y="40" fontSize="9" fill="oklch(0.55 0.12 30)" fontWeight="bold">∞ 위험</text>
        </g>
      )}
      {shape === 'shoulderCut' && (
        <g>
          <rect x="20" y="20" width="80" height="30" fill="oklch(0.97 0.005 250)" stroke="oklch(0.5 0.04 250)" />
          <rect x="100" y="10" width="80" height="50" fill="oklch(0.97 0.005 250)" stroke="oklch(0.5 0.04 250)" />
        </g>
      )}
      {/* Stress flow lines */}
      <g stroke="oklch(0.55 0.12 30)" strokeWidth="0.5" opacity="0.5" fill="none">
        {[26, 30, 40, 46].map((y, i) => <path key={i} d={`M 25 ${y} Q 100 ${shape === 'hole' ? y - (y > 35 ? 6 : -6) : y} 175 ${y}`} />)}
      </g>
    </svg>
  );
}

function GalvanicIllust() {
  return (
    <svg viewBox="0 0 200 70" className="w-full h-14 mb-2">
      {/* Two metals + electrolyte */}
      <rect x="20" y="30" width="60" height="32" fill="oklch(0.85 0.05 90)" stroke="oklch(0.4 0.05 90)" />
      <text x="50" y="50" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.05 90)" fontWeight="bold">금속 A</text>
      <text x="50" y="60" textAnchor="middle" fontSize="7" fill="oklch(0.5 0.04 250)">(anode)</text>
      <rect x="120" y="30" width="60" height="32" fill="oklch(0.85 0.04 250)" stroke="oklch(0.4 0.04 250)" />
      <text x="150" y="50" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.04 250)" fontWeight="bold">금속 B</text>
      <text x="150" y="60" textAnchor="middle" fontSize="7" fill="oklch(0.5 0.04 250)">(cathode)</text>
      {/* Electrolyte */}
      <path d="M 0 8 Q 100 -3 200 8 L 200 26 Q 100 18 0 26 z" fill="oklch(0.85 0.08 220 / 0.3)" />
      <text x="100" y="22" textAnchor="middle" fontSize="8" fill="oklch(0.4 0.12 220)" fontStyle="italic">전해질 (해수·산)</text>
      {/* Current flow */}
      <path d="M 80 46 Q 100 38 120 46" fill="none" stroke="oklch(0.55 0.18 30)" strokeWidth="1.5" markerEnd="url(#galvArrow)" />
      <text x="100" y="36" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.18 30)" fontWeight="bold">e⁻</text>
      <defs>
        <marker id="galvArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.18 30)" /></marker>
      </defs>
      {/* Corrosion arrows on A */}
      <g stroke="oklch(0.55 0.18 30)" strokeWidth="1" opacity="0.7">
        <line x1="30" y1="65" x2="30" y2="69" />
        <line x1="50" y1="65" x2="50" y2="69" />
        <line x1="70" y1="65" x2="70" y2="69" />
      </g>
    </svg>
  );
}

function BucklingIllust({ K }: { K: number }) {
  return (
    <svg viewBox="0 0 200 70" className="w-full h-14 mb-2">
      {/* Straight column */}
      <rect x="48" y="10" width="3" height="50" fill="oklch(0.5 0.04 250)" />
      <text x="49" y="68" textAnchor="middle" fontSize="6" fill="oklch(0.5 0.04 250)">P &lt; P_cr</text>
      {/* Buckled column */}
      <path d={K === 0.5 ? 'M 100 10 Q 90 35 100 60' : K === 0.7 ? 'M 100 10 Q 88 25 100 40 Q 110 50 100 60' : K === 1 ? 'M 100 10 Q 130 35 100 60' : 'M 100 10 Q 80 35 100 60'} fill="none" stroke="oklch(0.55 0.12 30)" strokeWidth="3" />
      <text x="100" y="68" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.12 30)">좌굴 (K={K})</text>
      {/* End conditions */}
      <g fill="oklch(0.3 0.04 250)">
        {/* fixed-fixed */}
        {K === 0.5 && (
          <>
            <rect x="46" y="6" width="8" height="4" />
            <rect x="46" y="60" width="8" height="4" />
            <rect x="96" y="6" width="8" height="4" />
            <rect x="96" y="60" width="8" height="4" />
          </>
        )}
        {/* pinned-pinned */}
        {K === 1 && (
          <>
            <circle cx="49.5" cy="8" r="2" />
            <circle cx="49.5" cy="62" r="2" />
            <circle cx="100" cy="8" r="2" />
            <circle cx="100" cy="62" r="2" />
          </>
        )}
      </g>
      {/* Force arrow */}
      <line x1="100" y1="3" x2="100" y2="9" stroke="oklch(0.55 0.18 30)" strokeWidth="1.5" markerEnd="url(#forceArr)" />
      <defs><marker id="forceArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.18 30)" /></marker></defs>
      <text x="170" y="35" textAnchor="middle" fontSize="9" fill="oklch(0.4 0.04 250)">L_eff = K · L</text>
    </svg>
  );
}

function CTEIllust() {
  return (
    <svg viewBox="0 0 200 70" className="w-full h-14 mb-2">
      {/* Two bars at T1 */}
      <rect x="20" y="14" width="80" height="10" fill="oklch(0.7 0.12 30)" stroke="oklch(0.4 0.12 30)" />
      <text x="60" y="22" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">A (CTE 高)</text>
      <rect x="20" y="28" width="80" height="10" fill="oklch(0.7 0.12 220)" stroke="oklch(0.4 0.12 220)" />
      <text x="60" y="36" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">B (CTE 低)</text>
      <text x="60" y="50" textAnchor="middle" fontSize="8" fill="oklch(0.5 0.04 250)">T₁: 같은 길이</text>
      {/* Arrow */}
      <line x1="105" y1="26" x2="115" y2="26" stroke="oklch(0.5 0.04 250)" strokeWidth="1.5" markerEnd="url(#cteArr)" />
      <defs><marker id="cteArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.5 0.04 250)" /></marker></defs>
      {/* At T2 — A expanded more */}
      <rect x="120" y="14" width="78" height="10" fill="oklch(0.7 0.12 30)" stroke="oklch(0.4 0.12 30)" />
      <rect x="120" y="28" width="65" height="10" fill="oklch(0.7 0.12 220)" stroke="oklch(0.4 0.12 220)" />
      <line x1="185" y1="38" x2="198" y2="38" stroke="oklch(0.55 0.18 30)" strokeWidth="1" strokeDasharray="2 2" />
      <text x="160" y="50" textAnchor="middle" fontSize="8" fill="oklch(0.5 0.04 250)">T₂ = T₁ + ΔT</text>
      <text x="190" y="58" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.18 30)" fontWeight="bold">ΔL</text>
    </svg>
  );
}

function HardnessIllust() {
  return (
    <svg viewBox="0 0 200 70" className="w-full h-14 mb-2">
      {/* Material surface */}
      <rect x="10" y="40" width="180" height="25" fill="oklch(0.85 0.04 250)" stroke="oklch(0.4 0.04 250)" />
      <text x="100" y="58" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.04 250)" fontStyle="italic">금속 표면</text>
      {/* Vickers indenter (diamond pyramid) */}
      <polygon points="60,10 70,30 50,30" fill="oklch(0.95 0.005 250)" stroke="oklch(0.3 0.04 250)" strokeWidth="1.5" />
      <line x1="60" y1="0" x2="60" y2="10" stroke="oklch(0.55 0.18 30)" strokeWidth="1.5" markerEnd="url(#indentArr)" />
      <text x="60" y="46" textAnchor="middle" fontSize="7" fill="oklch(0.4 0.04 250)">압자</text>
      {/* Indentation */}
      <ellipse cx="60" cy="44" rx="8" ry="2" fill="oklch(0.6 0.04 250)" />
      <line x1="52" y1="46" x2="68" y2="46" stroke="oklch(0.4 0.04 250)" strokeWidth="0.5" strokeDasharray="1 1" />
      <text x="60" y="50" textAnchor="middle" fontSize="6" fill="oklch(0.5 0.04 250)">d (지름)</text>
      <defs><marker id="indentArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.18 30)" /></marker></defs>
      {/* Formula */}
      <text x="120" y="20" fontSize="8" fill="oklch(0.4 0.04 250)" fontStyle="italic">HV = F · 1.854 / d²</text>
      <text x="120" y="32" fontSize="8" fill="oklch(0.4 0.04 250)" fontStyle="italic">UTS ≈ 3.45 · HV</text>
    </svg>
  );
}

function PVIllust({ shape }: { shape: string }) {
  return (
    <svg viewBox="0 0 200 70" className="w-full h-14 mb-2">
      {shape === 'cyl' ? (
        <>
          {/* Cylinder side view */}
          <rect x="40" y="20" width="120" height="30" fill="oklch(0.85 0.04 250)" stroke="oklch(0.3 0.04 250)" />
          <ellipse cx="40" cy="35" rx="6" ry="15" fill="oklch(0.85 0.04 250)" stroke="oklch(0.3 0.04 250)" />
          <ellipse cx="160" cy="35" rx="6" ry="15" fill="oklch(0.9 0.04 250 / 0.5)" stroke="oklch(0.3 0.04 250)" />
          {/* Hoop arrows */}
          <g stroke="oklch(0.55 0.18 30)" strokeWidth="1.5" fill="none">
            <path d="M 80 14 Q 80 8 100 8 Q 120 8 120 14" markerEnd="url(#hoopArr)" />
            <path d="M 80 56 Q 80 62 100 62 Q 120 62 120 56" markerEnd="url(#hoopArr)" />
          </g>
          <text x="100" y="3" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.18 30)" fontWeight="bold">σ_hoop = p·r/t</text>
          {/* Inner pressure */}
          <g stroke="oklch(0.55 0.12 220)" strokeWidth="0.8">
            {[28, 35, 42].map((y, i) => <line key={i} x1="50" y1={y} x2="150" y2={y} strokeDasharray="3 2" />)}
          </g>
          <text x="100" y="50" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.12 220)">내압 p</text>
        </>
      ) : (
        <>
          {/* Sphere */}
          <circle cx="100" cy="35" r="22" fill="oklch(0.85 0.04 250)" stroke="oklch(0.3 0.04 250)" />
          <ellipse cx="100" cy="35" rx="22" ry="5" fill="none" stroke="oklch(0.5 0.04 250)" strokeWidth="0.5" strokeDasharray="2 2" />
          <g stroke="oklch(0.55 0.18 30)" strokeWidth="1.2">
            {[0, 72, 144, 216, 288].map((a, i) => {
              const rad = a * Math.PI / 180;
              const x = 100 + Math.cos(rad) * 30;
              const y = 35 + Math.sin(rad) * 30;
              const xi = 100 + Math.cos(rad) * 22;
              const yi = 35 + Math.sin(rad) * 22;
              return <line key={i} x1={xi} y1={yi} x2={x} y2={y} markerEnd="url(#sphArr)" />;
            })}
          </g>
          <text x="100" y="68" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.18 30)" fontWeight="bold">σ = p·r/(2t) · 모든 방향 등방</text>
        </>
      )}
      <defs>
        <marker id="hoopArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.18 30)" /></marker>
        <marker id="sphArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.18 30)" /></marker>
      </defs>
    </svg>
  );
}

/* ───────── #3 Stress concentration Kt ───────── */
function KtCalc() {
  const [shape, setShape] = useState<'hole' | 'fillet' | 'sharpCorner' | 'shoulderCut'>('hole');
  const [d, setD] = useState(10);
  const [w, setW] = useState(40);
  const [r, setR] = useState(2);
  // 근사식 (Pilkey - Peterson's Stress Concentration Factors)
  let kt = 1;
  if (shape === 'hole') {
    // Round hole in infinite plate: 3.0. Finite width correction: Kt = 2 + (1 - d/w)^3
    const ratio = Math.min(0.95, d / w);
    kt = 2 + Math.pow(1 - ratio, 3);
  } else if (shape === 'fillet') {
    // Stepped shaft / plate with shoulder fillet: 일반 근사
    const rd = r / d;
    kt = 1 + 0.65 * Math.pow(rd, -0.4);  // rough
    kt = Math.max(1.05, Math.min(4.5, kt));
  } else if (shape === 'sharpCorner') {
    kt = 5.5; // 거의 무한, 권장값
  } else if (shape === 'shoulderCut') {
    kt = 1.8 + 0.3 * Math.max(0, 1 - r / d);
  }
  const band = kt < 2 ? 'safe' : kt < 3.5 ? 'caution' : 'danger';
  const color = band === 'safe' ? 'text-emerald-700' : band === 'caution' ? 'text-amber-700' : 'text-rose-700';
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #3 응력 집중 계수 Kt</p>
      <p className="text-[11px] text-muted-foreground mb-3">노치·구멍·필렛에 의한 국부 응력 증대. σ_max = K_t · σ_nom.</p>
      <KtIllust shape={shape} />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className={Lab}>형상</label>
          <select className={In + ' w-full'} value={shape} onChange={(e) => setShape(e.target.value as any)}>
            <option value="hole">중앙 구멍 (판)</option>
            <option value="fillet">필렛 라운드 (계단축)</option>
            <option value="sharpCorner">Sharp corner (위험)</option>
            <option value="shoulderCut">Shoulder cut</option>
          </select>
        </div>
        {shape === 'hole' ? (
          <>
            <div><label className={Lab}>구멍 d (mm)</label><input type="number" className={In + ' w-full'} value={d} onChange={(e) => setD(+e.target.value || 0)} /></div>
            <div><label className={Lab}>판 폭 w (mm)</label><input type="number" className={In + ' w-full'} value={w} onChange={(e) => setW(+e.target.value || 1)} /></div>
          </>
        ) : shape !== 'sharpCorner' && (
          <>
            <div><label className={Lab}>특성 치수 d (mm)</label><input type="number" className={In + ' w-full'} value={d} onChange={(e) => setD(+e.target.value || 0)} /></div>
            <div><label className={Lab}>라디우스 r (mm)</label><input type="number" className={In + ' w-full'} value={r} onChange={(e) => setR(+e.target.value || 0.01)} /></div>
          </>
        )}
      </div>
      <div className={`rounded p-2 text-sm font-mono ${color} bg-muted/30`}>
        K<sub>t</sub> ≈ <b className="text-base">{kt.toFixed(2)}</b>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">설계 응력 = σ × K<sub>t</sub>. 피로 고려 시 K<sub>f</sub> = 1 + q·(K<sub>t</sub>−1) (q: 강 0.9·Al 0.6·취성 0).</p>
      <a href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 노치·좌굴 →</a>
    </div>
  );
}

/* ───────── #4 Galvanic compatibility ───────── */
function GalvanicCalc() {
  const SERIES: Array<{ name: string; v: number }> = [
    { name: '마그네슘 (Mg)', v: -1.65 },
    { name: '아연 (Zn) · 갈바나이즈', v: -1.05 },
    { name: '알루미늄 (Al · 1xxx-7xxx)', v: -0.85 },
    { name: '카드뮴 (Cd)', v: -0.70 },
    { name: '강 / 주철 (Carbon steel)', v: -0.60 },
    { name: '저합금강 (4140, 4340)', v: -0.55 },
    { name: '주석 (Sn) · 황동 일부', v: -0.40 },
    { name: '구리 · 청동 (Cu, Bronze)', v: -0.30 },
    { name: '구리합금 (황동 C36000, CuBe)', v: -0.25 },
    { name: '니켈 합금 (Inconel 600, Monel)', v: -0.15 },
    { name: '스테인리스 (304/316 active)', v: -0.50 },
    { name: '스테인리스 (304/316 passive)', v: -0.05 },
    { name: '티타늄 (CP-Ti, Ti6Al4V)', v: -0.05 },
    { name: 'Inconel 625 · Hastelloy', v: -0.04 },
    { name: '금 (Au), 백금 (Pt) · 흑연', v: +0.30 },
  ];
  const [a, setA] = useState(SERIES[6].name);
  const [b, setB] = useState(SERIES[10].name);
  const va = SERIES.find(x => x.name === a)?.v ?? 0;
  const vb = SERIES.find(x => x.name === b)?.v ?? 0;
  const diff = Math.abs(va - vb);
  const anode = va < vb ? a : b;
  const band = diff < 0.15 ? 'safe' : diff < 0.30 ? 'caution' : 'danger';
  const color = band === 'safe' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : band === 'caution' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200';
  const advice = band === 'safe'
    ? '안전 — 일반 환경에서 갈바닉 부식 무시 가능.'
    : band === 'caution'
      ? `주의 — 습한·해양 환경에서 ${anode} 가 점진 부식. 절연 와셔·실링 권장.`
      : `위험 — ${anode} 가 빠르게 부식. 직접 접촉 금지. 절연 / 캐소드 보호 / 같은 family 통일.`;
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> #4 갈바닉 부식 호환성</p>
      <p className="text-[11px] text-muted-foreground mb-3">접촉하는 두 금속의 전위차로 부식. 전위 가까울수록 안전, 0.30V 이상이면 위험.</p>
      <GalvanicIllust />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div><label className={Lab}>재료 A</label><select className={In + ' w-full'} value={a} onChange={(e) => setA(e.target.value)}>{SERIES.map(s => <option key={s.name}>{s.name}</option>)}</select></div>
        <div><label className={Lab}>재료 B</label><select className={In + ' w-full'} value={b} onChange={(e) => setB(e.target.value)}>{SERIES.map(s => <option key={s.name}>{s.name}</option>)}</select></div>
      </div>
      <div className={`rounded border p-2 text-sm ${color}`}>
        <p className="font-mono">전위차 ΔV ≈ <b>{diff.toFixed(2)} V</b></p>
        <p className="text-[12px] mt-1">{advice}</p>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">기준: 해수 (3.5% NaCl) at 25°C, vs Ag/AgCl. 산성·고온에서 더 위험.</p>
      <a href="/guide#ch10" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.3 환경별 합금 →</a>
    </div>
  );
}

/* ───────── #5 Buckling Euler vs Johnson ───────── */
function BucklingCalc() {
  const [L, setL] = useState(500);
  const [d, setD] = useState(20); // 원기둥 직경
  const [E, setE] = useState(200); // GPa
  const [sy, setSy] = useState(250); // MPa
  const [K, setK] = useState(1); // 단부조건
  const A = Math.PI * (d / 2) ** 2; // mm²
  const I = Math.PI * Math.pow(d, 4) / 64; // mm⁴
  const k_r = Math.sqrt(I / A); // 회전 반경 mm
  const Le = K * L;
  const slender = Le / k_r;
  // Critical slenderness ratio: √(2π²E/σy)
  const lambdaC = Math.sqrt(2 * Math.PI ** 2 * (E * 1e3) / sy);
  const isEuler = slender > lambdaC;
  // Euler: Pcr = π²·E·I/Le² (E in GPa·1000 → MPa, output kN)
  const Pcr_Euler = (Math.PI ** 2 * (E * 1e3) * I) / (Le ** 2) / 1000; // kN
  // Johnson: Pcr = σy·[1 − σy·(L/k)² / (4π²·E·1e3)]·A
  const Pcr_Johnson = (sy * (1 - sy * slender ** 2 / (4 * Math.PI ** 2 * E * 1e3)) * A) / 1000; // kN
  const Pcr = isEuler ? Pcr_Euler : Pcr_Johnson;
  const formula = isEuler ? 'Euler (가는 기둥)' : 'Johnson (짧은 기둥)';
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #5 좌굴 임계하중 (Euler / Johnson)</p>
      <p className="text-[11px] text-muted-foreground mb-3">기둥의 좌굴 한계 — 가늘면 Euler, 짧으면 Johnson 공식.</p>
      <BucklingIllust K={K} />
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <div><label className={Lab}>길이 L (mm)</label><input type="number" className={In + ' w-full'} value={L} onChange={(e) => setL(+e.target.value || 1)} /></div>
        <div><label className={Lab}>직경 d (mm)</label><input type="number" className={In + ' w-full'} value={d} onChange={(e) => setD(+e.target.value || 1)} /></div>
        <div><label className={Lab}>E (GPa)</label><input type="number" className={In + ' w-full'} value={E} onChange={(e) => setE(+e.target.value || 1)} /></div>
        <div><label className={Lab}>σy (MPa)</label><input type="number" className={In + ' w-full'} value={sy} onChange={(e) => setSy(+e.target.value || 1)} /></div>
        <div className="col-span-2"><label className={Lab}>단부 조건 K</label><select className={In + ' w-full'} value={K} onChange={(e) => setK(+e.target.value)}><option value={1}>핀-핀 (K=1.0)</option><option value={2}>고정-자유 외팔 (K=2.0)</option><option value={0.7}>고정-핀 (K≈0.7)</option><option value={0.5}>고정-고정 (K=0.5)</option></select></div>
      </div>
      <div className="rounded bg-muted/30 p-2 text-sm font-mono space-y-0.5">
        <div>(L/k) = {slender.toFixed(1)} · 임계 = {lambdaC.toFixed(1)}</div>
        <div className="text-emerald-700">{formula} 적용</div>
        <div className="text-base">P_cr ≈ <b>{Pcr.toFixed(1)} kN</b></div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">설계 안전계수 SF = P_cr / P_applied. 항공 SF ≥ 1.5, 일반 ≥ 2.</p>
      <a href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 좌굴 이론 →</a>
    </div>
  );
}

/* ───────── #6 CTE mismatch ───────── */
function CTEMismatch() {
  const [cteA, setCteA] = useState(23); // Al
  const [cteB, setCteB] = useState(12); // Steel
  const [dT, setDT] = useState(100);
  const [E, setE] = useState(200); // GPa, 작은 쪽
  // Free strain difference. 만약 둘 다 같은 길이로 자유 변형하면 Δε = (cteA − cteB) · ΔT
  const dStrain = (cteA - cteB) * dT * 1e-6;
  const sigma = dStrain * E * 1000; // GPa→MPa
  const band = Math.abs(sigma) < 50 ? 'safe' : Math.abs(sigma) < 200 ? 'caution' : 'danger';
  const color = band === 'safe' ? 'text-emerald-700' : band === 'caution' ? 'text-amber-700' : 'text-rose-700';
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #6 CTE mismatch 열응력</p>
      <p className="text-[11px] text-muted-foreground mb-3">두 재료의 열팽창 차이로 발생하는 응력. σ ≈ ΔCTE × ΔT × E.</p>
      <CTEIllust />
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <div><label className={Lab}>재료 A CTE (×10⁻⁶/K)</label><input type="number" className={In + ' w-full'} value={cteA} onChange={(e) => setCteA(+e.target.value || 0)} /></div>
        <div><label className={Lab}>재료 B CTE</label><input type="number" className={In + ' w-full'} value={cteB} onChange={(e) => setCteB(+e.target.value || 0)} /></div>
        <div><label className={Lab}>온도 변화 ΔT (°C)</label><input type="number" className={In + ' w-full'} value={dT} onChange={(e) => setDT(+e.target.value || 0)} /></div>
        <div><label className={Lab}>구속 재료 E (GPa)</label><input type="number" className={In + ' w-full'} value={E} onChange={(e) => setE(+e.target.value || 1)} /></div>
      </div>
      <div className={`rounded bg-muted/30 p-2 text-sm font-mono ${color}`}>
        <div>ΔCTE × ΔT = {((cteA - cteB) * dT * 1e-6 * 100).toFixed(3)} %</div>
        <div className="text-base">σ_th ≈ <b>{sigma.toFixed(0)} MPa</b></div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">참고: Al 23 · Steel 12 · Ti 9 · Invar 1.3 · CFRP ≈0 · 세라믹 5-8 (×10⁻⁶/K).</p>
      <a href="/guide#ch11" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.9 #9 CTE mismatch →</a>
    </div>
  );
}

/* ───────── #7 Hardness conversion (HV ↔ HRC ↔ HB ↔ UTS) ───────── */
function HardnessConv() {
  const [scale, setScale] = useState<'HV' | 'HRC' | 'HB'>('HV');
  const [val, setVal] = useState(300);
  // Approximate conversions (ASTM E140, valid for low/medium carbon steel)
  let HV = val;
  if (scale === 'HRC') HV = Math.pow(val / 23.5, 1.7) * 50 + 100; // rough back-calc
  if (scale === 'HB') HV = val * 1.05;
  const HRC = HV > 240 ? 23.5 * Math.pow((HV - 100) / 50, 1 / 1.7) : NaN;
  const HB = HV / 1.05;
  const UTS = HV * 3.45; // MPa, rough (ASTM A370)
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #7 경도 변환 (HV/HRC/HB)</p>
      <p className="text-[11px] text-muted-foreground mb-3">ASTM E140 근사 — 탄소·합금강에 가장 정확, 다른 합금은 ±10%.</p>
      <HardnessIllust />
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <div><label className={Lab}>입력 scale</label><select className={In + ' w-full'} value={scale} onChange={(e) => setScale(e.target.value as any)}><option value="HV">Vickers HV</option><option value="HRC">Rockwell HRC</option><option value="HB">Brinell HB</option></select></div>
        <div><label className={Lab}>값</label><input type="number" className={In + ' w-full'} value={val} onChange={(e) => setVal(+e.target.value || 0)} /></div>
      </div>
      <div className="rounded bg-muted/30 p-2 text-sm font-mono space-y-0.5">
        <div>HV ≈ <b>{HV.toFixed(0)}</b></div>
        <div>HRC ≈ <b>{isFinite(HRC) ? HRC.toFixed(1) : '— (HRC 범위 외)'}</b></div>
        <div>HB ≈ <b>{HB.toFixed(0)}</b></div>
        <div className="text-emerald-700 mt-1 pt-1 border-t border-border/30">UTS 추정 ≈ <b>{UTS.toFixed(0)} MPa</b></div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">UTS ≈ 3.45 × HV (탄소강). 다른 합금은 vendor datasheet 사용.</p>
      <a href="/guide#ch1" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.4 물성 사전 →</a>
    </div>
  );
}

/* ───────── #9 Pressure vessel thickness ───────── */
function PressureVessel() {
  const [p, setP] = useState(10); // MPa
  const [r, setR] = useState(150); // mm (inner radius)
  const [sy, setSy] = useState(250); // MPa
  const [SF, setSF] = useState(3);
  const [shape, setShape] = useState<'cyl' | 'sph'>('cyl');
  // 얇은 벽 가정
  const t = shape === 'cyl' ? (p * r * SF) / sy : (p * r * SF) / (2 * sy);
  // 두꺼운 벽 보정 (Lame): if t/r > 0.1, use Lame's equation
  const thick = t / r > 0.1;
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #9 압력 용기 두께</p>
      <p className="text-[11px] text-muted-foreground mb-3">얇은 벽 가정 — 원통 σ = p·r/t (후프), 구형 σ = p·r/(2t). 두꺼운 벽 (t/r &gt; 0.1) 은 Lame 식 필요.</p>
      <PVIllust shape={shape} />
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <div><label className={Lab}>형상</label><select className={In + ' w-full'} value={shape} onChange={(e) => setShape(e.target.value as any)}><option value="cyl">원통 (후프 응력)</option><option value="sph">구형</option></select></div>
        <div><label className={Lab}>내압 p (MPa)</label><input type="number" className={In + ' w-full'} value={p} onChange={(e) => setP(+e.target.value || 0)} /></div>
        <div><label className={Lab}>내반경 r (mm)</label><input type="number" className={In + ' w-full'} value={r} onChange={(e) => setR(+e.target.value || 1)} /></div>
        <div><label className={Lab}>σy (MPa)</label><input type="number" className={In + ' w-full'} value={sy} onChange={(e) => setSy(+e.target.value || 1)} /></div>
        <div><label className={Lab}>안전계수 SF</label><input type="number" className={In + ' w-full'} value={SF} onChange={(e) => setSF(+e.target.value || 1)} /></div>
      </div>
      <div className="rounded bg-muted/30 p-2 text-sm font-mono">
        <div>최소 두께 t ≈ <b className="text-base">{t.toFixed(2)} mm</b></div>
        <div className="text-[11px] mt-1">t/r = {(t / r).toFixed(3)} {thick && <span className="text-amber-700">· 두꺼운 벽 — Lame 식 권장</span>}</div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">ASME B&PV Sec. VIII SF ≥ 3 (UTS) · 1.5 (σy). 부식 여유 (corrosion allowance) 1-3 mm 추가.</p>
      <a href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 압력용기 →</a>
    </div>
  );
}

/* ───────── #H1 Larson-Miller parameter (creep lifetime) ───────── */
function LMPCalc() {
  const [T, setT] = useState(600);   // °C
  const [t, setT_h] = useState(1000); // h
  const [C, setC] = useState(20);
  const Tk = T + 273.15;
  const LMP = Tk * (C + Math.log10(t)) / 1000; // in 10^3 units
  // Inverse: same LMP at different T → predict t
  const [T2, setT2] = useState(650);
  const T2k = T2 + 273.15;
  const log_t2 = (LMP * 1000) / T2k - C;
  const t2 = Math.pow(10, log_t2);
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Larson-Miller parameter (creep 수명)</p>
      <p className="text-[11px] text-muted-foreground mb-3">LMP = T·(C+log₁₀ t)/1000 — 같은 응력의 다른 (T,t) 예측. C ≈ 20 (강) · 25 (Ni-base).</p>
      <svg viewBox="0 0 280 60" className="w-full h-14 mb-2">
        <line x1="20" y1="50" x2="260" y2="50" stroke="oklch(0.5 0.04 250)" />
        <line x1="20" y1="10" x2="20" y2="50" stroke="oklch(0.5 0.04 250)" />
        <path d="M 20 15 Q 90 30 260 45" fill="none" stroke="oklch(0.55 0.12 220)" strokeWidth="2" />
        <text x="20" y="8" fontSize="8" fill="oklch(0.4 0.04 250)">σ_rupture</text>
        <text x="260" y="58" textAnchor="end" fontSize="8" fill="oklch(0.4 0.04 250)">LMP →</text>
        <text x="140" y="40" fontSize="9" fill="oklch(0.45 0.12 220)" fontStyle="italic">master curve</text>
      </svg>
      <div className="grid grid-cols-2 gap-2 mb-2 text-[12px]">
        <div><label className={Lab}>온도 T (°C)</label><input type="number" className={In + ' w-full'} value={T} onChange={(e) => setT(+e.target.value || 0)} /></div>
        <div><label className={Lab}>시간 t (h)</label><input type="number" className={In + ' w-full'} value={t} onChange={(e) => setT_h(+e.target.value || 1)} /></div>
        <div><label className={Lab}>상수 C</label><input type="number" className={In + ' w-full'} value={C} onChange={(e) => setC(+e.target.value || 0)} /></div>
        <div><label className={Lab}>예측 T₂ (°C)</label><input type="number" className={In + ' w-full'} value={T2} onChange={(e) => setT2(+e.target.value || 0)} /></div>
      </div>
      <div className="rounded bg-muted/30 p-2 text-sm font-mono space-y-0.5">
        <div>LMP = <b className="text-base">{LMP.toFixed(2)}</b> × 10³</div>
        <div className="text-emerald-700">→ T₂={T2}°C 에서 같은 LMP 의 수명 ≈ <b className="text-base">{t2.toExponential(2)} h</b></div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">전형: P91 σ=100 MPa LMP ≈ 22.5. Inconel 718 σ=400 MPa LMP ≈ 24. ECCC datasheets 참고.</p>
      <a href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.10 LMP →</a>
    </div>
  );
}

/* ───────── #H2 Mohr's circle ───────── */
function MohrCalc() {
  const [sx, setSx] = useState(100);
  const [sy, setSy] = useState(40);
  const [txy, setTxy] = useState(30);
  const center = (sx + sy) / 2;
  const R = Math.sqrt(((sx - sy) / 2) ** 2 + txy ** 2);
  const s1 = center + R;
  const s2 = center - R;
  const tmax = R;
  // Principal angle
  const angle = (Math.atan2(2 * txy, sx - sy) * 180 / Math.PI) / 2;
  // SVG scale
  const sw = 280, sh = 180;
  const cx = sw / 2, cy = sh / 2 + 10;
  const scale = (sh - 50) / (R * 2 + 20);
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Mohr's circle (주응력·최대 전단)</p>
      <p className="text-[11px] text-muted-foreground mb-3">2D 응력 상태 → 주응력 σ₁·σ₂, 최대 전단 τ_max, 회전각.</p>
      <svg viewBox={`0 0 ${sw} ${sh}`} className="w-full h-32 mb-2 border border-border rounded">
        <line x1="0" y1={cy} x2={sw} y2={cy} stroke="oklch(0.5 0.04 250)" />
        <line x1={cx} y1="10" x2={cx} y2={sh - 10} stroke="oklch(0.5 0.04 250)" />
        <text x={sw - 4} y={cy - 4} textAnchor="end" fontSize="9" fill="oklch(0.45 0.04 250)">σ</text>
        <text x={cx + 4} y="14" fontSize="9" fill="oklch(0.45 0.04 250)">τ</text>
        <circle cx={cx + (center - center) * scale} cy={cy} r={R * scale} fill="none" stroke="oklch(0.55 0.12 220)" strokeWidth="2" />
        {/* current stress point */}
        <circle cx={cx + (sx - center) * scale} cy={cy - txy * scale} r="4" fill="oklch(0.5 0.18 30)" />
        <circle cx={cx + (sy - center) * scale} cy={cy + txy * scale} r="4" fill="oklch(0.5 0.18 30)" />
        {/* sigma1, sigma2 */}
        <text x={cx + R * scale} y={cy + 13} textAnchor="middle" fontSize="10" fill="oklch(0.45 0.12 220)" fontWeight="bold">σ₁</text>
        <text x={cx - R * scale} y={cy + 13} textAnchor="middle" fontSize="10" fill="oklch(0.45 0.12 220)" fontWeight="bold">σ₂</text>
      </svg>
      <div className="grid grid-cols-3 gap-2 mb-2 text-[12px]">
        <div><label className={Lab}>σ_x (MPa)</label><input type="number" className={In + ' w-full'} value={sx} onChange={(e) => setSx(+e.target.value || 0)} /></div>
        <div><label className={Lab}>σ_y (MPa)</label><input type="number" className={In + ' w-full'} value={sy} onChange={(e) => setSy(+e.target.value || 0)} /></div>
        <div><label className={Lab}>τ_xy (MPa)</label><input type="number" className={In + ' w-full'} value={txy} onChange={(e) => setTxy(+e.target.value || 0)} /></div>
      </div>
      <div className="rounded bg-muted/30 p-2 text-sm font-mono space-y-0.5">
        <div>σ₁ = <b>{s1.toFixed(1)}</b> · σ₂ = <b>{s2.toFixed(1)}</b> MPa</div>
        <div>τ_max = <b>{tmax.toFixed(1)}</b> MPa · 회전각 = <b>{angle.toFixed(1)}°</b></div>
        <div className="text-emerald-700 mt-1 pt-1 border-t border-border/30">von Mises σ_eq = √(σ₁² − σ₁σ₂ + σ₂²) ≈ <b>{Math.sqrt(s1*s1 - s1*s2 + s2*s2).toFixed(1)}</b> MPa</div>
      </div>
      <a href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 Mohr·복합응력 →</a>
    </div>
  );
}

/* ───────── #H3 Schaeffler diagram (stainless) ───────── */
function SchaefflerCalc() {
  const [Cr, setCr] = useState(18);
  const [Ni, setNi] = useState(10);
  const [Mo, setMo] = useState(0);
  const [Si, setSi] = useState(0.5);
  const [Nb, setNb] = useState(0);
  const [C, setC] = useState(0.05);
  const [N, setN] = useState(0.04);
  const [Mn, setMn] = useState(1.5);
  const [Cu, setCu] = useState(0);
  const Cr_eq = Cr + Mo + 1.5 * Si + 0.5 * Nb;
  const Ni_eq = Ni + 30 * C + 30 * N + 0.5 * Mn + 0.3 * Cu;
  // Phase prediction (rough Schaeffler zones)
  let phase = '';
  if (Ni_eq > 25) phase = 'γ Austenite';
  else if (Cr_eq > 25 && Ni_eq < 5) phase = 'α Ferrite';
  else if (Ni_eq < 8 && Cr_eq > 12) phase = "α' Martensite";
  else phase = 'A+F (Duplex 영역)';
  // SVG positions: Cr_eq x-axis (0–40), Ni_eq y-axis (0–32)
  const sw = 280, sh = 200;
  const X = (v: number) => 30 + (v / 40) * (sw - 40);
  const Y = (v: number) => sh - 25 - (v / 32) * (sh - 40);
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Schaeffler diagram (stainless 미세조직)</p>
      <p className="text-[11px] text-muted-foreground mb-3">Cr-eq / Ni-eq 로 austenite·ferrite·martensite·duplex 영역 예측. 용접부 미세조직 추정에 사용.</p>
      <svg viewBox={`0 0 ${sw} ${sh}`} className="w-full h-44 mb-2 border border-border rounded bg-white">
        {/* axes */}
        <line x1="30" y1={sh - 25} x2={sw - 10} y2={sh - 25} stroke="oklch(0.4 0.04 250)" />
        <line x1="30" y1="15" x2="30" y2={sh - 25} stroke="oklch(0.4 0.04 250)" />
        {[0, 10, 20, 30, 40].map(v => <g key={v}><line x1={X(v)} y1="15" x2={X(v)} y2={sh - 22} stroke="oklch(0.92 0.012 250)" /><text x={X(v)} y={sh - 10} textAnchor="middle" fontSize="9" fill="oklch(0.5 0.04 250)">{v}</text></g>)}
        {[0, 8, 16, 24, 32].map(v => <g key={v}><line x1="30" y1={Y(v)} x2={sw - 10} y2={Y(v)} stroke="oklch(0.92 0.012 250)" /><text x="24" y={Y(v) + 3} textAnchor="end" fontSize="9" fill="oklch(0.5 0.04 250)">{v}</text></g>)}
        {/* Phase zones (rough boundaries) */}
        <text x={X(8)} y={Y(28)} fontSize="9" fill="oklch(0.5 0.12 220)" fontWeight="bold">γ Austenite</text>
        <text x={X(32)} y={Y(2)} fontSize="9" fill="oklch(0.5 0.12 30)" fontWeight="bold">α Ferrite</text>
        <text x={X(15)} y={Y(2)} fontSize="9" fill="oklch(0.5 0.12 80)" fontWeight="bold">α' Mart.</text>
        <text x={X(22)} y={Y(12)} fontSize="9" fill="oklch(0.4 0.04 250)" fontStyle="italic">A+F</text>
        {/* User point */}
        <circle cx={X(Cr_eq)} cy={Y(Ni_eq)} r="5" fill="oklch(0.5 0.18 30)" stroke="white" strokeWidth="2" />
        <text x={X(Cr_eq) + 7} y={Y(Ni_eq) + 3} fontSize="10" fill="oklch(0.4 0.18 30)" fontWeight="bold">현재</text>
        <text x={sw / 2} y={sh - 2} textAnchor="middle" fontSize="9" fill="oklch(0.3 0.04 250)" fontWeight="bold">Cr-eq</text>
        <text x="8" y="10" fontSize="9" fill="oklch(0.3 0.04 250)" fontWeight="bold">Ni-eq</text>
      </svg>
      <div className="grid grid-cols-3 gap-1 mb-2 text-[11px]">
        {[{l:'Cr', v:Cr, s:setCr}, {l:'Ni', v:Ni, s:setNi}, {l:'Mo', v:Mo, s:setMo}, {l:'Si', v:Si, s:setSi}, {l:'Nb', v:Nb, s:setNb}, {l:'C', v:C, s:setC}, {l:'N', v:N, s:setN}, {l:'Mn', v:Mn, s:setMn}, {l:'Cu', v:Cu, s:setCu}].map(f => (
          <label key={f.l}>
            <span className="text-muted-foreground text-[10px]">{f.l} %</span>
            <input type="number" step="0.1" className={In + ' w-full'} value={f.v} onChange={(e) => f.s(+e.target.value || 0)} />
          </label>
        ))}
      </div>
      <div className="rounded bg-muted/30 p-2 text-sm font-mono">
        <div>Cr-eq = <b>{Cr_eq.toFixed(1)}</b> · Ni-eq = <b>{Ni_eq.toFixed(1)}</b></div>
        <div className="text-emerald-700 mt-1">예측 미세조직: <b>{phase}</b></div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">전형: 304 SS Cr-eq≈18·Ni-eq≈10 (γ) · 17-4 PH Cr-eq≈16·Ni-eq≈5 (Mart.) · 2205 Duplex Cr-eq≈25·Ni-eq≈10 (A+F).</p>
      <a href="/guide#ch12" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.11 가공성·용접성 →</a>
    </div>
  );
}

export default function Tools() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 h-12 flex items-center gap-3 px-4 border-b border-border bg-[oklch(0.22_0.055_250)] text-sidebar-foreground">
        <Link href="/" className="flex items-center gap-1.5 text-sm hover:text-white text-sidebar-foreground/80">
          <ArrowLeft className="w-4 h-4" /> 탐색기로 돌아가기
        </Link>
        <div className="w-px h-5 bg-sidebar-border" />
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Calculator className="w-4 h-4 text-accent" /> Engineering Tools
        </span>
        <Link href="/guide" className="ml-auto text-[11px] text-sidebar-foreground/70 hover:text-white flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" /> Guide
        </Link>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 mb-6">
          <p className="text-[11px] tracking-[0.25em] uppercase text-accent font-bold">기계공학 빠른 계산</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Engineering Tools</h1>
          <p className="text-[13px] text-foreground/80 mt-1">9 개 계산기 — 응력집중 · 갈바닉 부식 · 좌굴 · CTE mismatch · 경도 변환 · 압력용기 · Larson-Miller (creep) · Mohr 원 · Schaeffler diagram (스테인리스 용접).</p>
          <p className="text-[11px] text-foreground/60 mt-2">
            사용법: 각 카드의 입력값 변경 → 결과 자동 갱신. 결과 색상: <span className="text-emerald-700">초록=안전</span> · <span className="text-amber-700">노랑=주의</span> · <span className="text-rose-700">빨강=위험</span>.
            상세 이론은 <a href="/guide" className="text-accent hover:underline">Guide</a> 참조.
          </p>
        </div>

        {/* R110 — 각 계산기 소개 + Guide 챕터 매핑 */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 mb-6 text-[12px] text-foreground/80 leading-relaxed">
          <p className="font-semibold mb-1.5">📚 계산기 9 개의 적용 영역</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li><b>Kt (응력 집중)</b> — hole/fillet/notch/groove 형상의 stress amplification. 피로 설계 핵심. <span className="text-muted-foreground">→ Guide <a href="/guide#ch4" className="text-accent">Ch.7 보 하중</a></span></li>
            <li><b>Galvanic</b> — 이종금속 부식. anode-cathode 전위차 + 면적비. 해양·외기 환경. <span className="text-muted-foreground">→ Guide <a href="/guide#ch10" className="text-accent">Ch.3 family + 환경</a></span></li>
            <li><b>Buckling (Euler)</b> — 압축 부재 임계하중 P_cr = π²EI/(KL)². 가늘고 긴 column. <span className="text-muted-foreground">→ Guide <a href="/guide#ch5" className="text-accent">Ch.8 비틀림·좌굴</a></span></li>
            <li><b>CTE mismatch</b> — 이종재료 접합부 열응력. 반도체 패키지·복합재. ΔL = α × L × ΔT.</li>
            <li><b>Hardness convert</b> — HV ↔ HRC ↔ HB. ASTM E140. UTS ≈ 3.45 × HV (강 한정).</li>
            <li><b>Pressure vessel</b> — Thin-wall σ_hoop = pD/(2t), σ_axial = pD/(4t). ASME VIII Div 1.</li>
            <li><b>Larson-Miller (LMP)</b> — Creep rupture time-temp 등가. LMP = T(C + log t). C = 20 일반.</li>
            <li><b>Mohr 원</b> — 2D 응력 상태 회전. principal stress + max shear. von Mises / Tresca 평가.</li>
            <li><b>Schaeffler</b> — 스테인리스 용접 weld metal phase 예측 (Cr_eq vs Ni_eq). 304/316 → A+F. <span className="text-muted-foreground">→ Detail panel 의 용접성 표시도 동일 계산</span></li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KtCalc />
          <GalvanicCalc />
          <BucklingCalc />
          <CTEMismatch />
          <HardnessConv />
          <PressureVessel />
          <LMPCalc />
          <MohrCalc />
          <SchaefflerCalc />
        </div>

        <div className="mt-8 pt-4 border-t border-border space-y-3 text-[12px] text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground/80 mb-1">⚠ 사용 시 주의</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>모든 계산은 <b>설계 초기 단계 후보 좁히기용</b>. 실제 설계는 vendor datasheet + FEA + 시제품 시험으로 검증 필수.</li>
              <li>피로 (S-N curve, Goodman), 좌굴 (slenderness ratio λ), 압력용기 (안전계수 SF 3.5 = ASME / 4 = PED) 등 표준 코드 우선.</li>
              <li>비표준 입력 (음수, 0, 극단값) 은 결과 신뢰성 ↓. 결과 의심 시 손계산 또는 별도 코드 검증.</li>
              <li>이 도구는 <b>educational</b> — 단일 결과를 설계 승인 근거로 사용 금지.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground/80 mb-1">📖 출처</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li><b>응력 집중·피로</b>: Peterson "Stress Concentration Factors" (4th ed., 2008) · Shigley "Mechanical Engineering Design"</li>
              <li><b>좌굴·보 처짐</b>: Roark "Formulas for Stress and Strain" (8th ed., 2011) · Timoshenko "Theory of Elastic Stability"</li>
              <li><b>경도 변환</b>: ASTM E140-12b (Standard Hardness Conversion Tables for Metals)</li>
              <li><b>압력 용기</b>: ASME Boiler &amp; Pressure Vessel Code Sec.VIII Div.1 · KS B 6750 · PED 2014/68/EU</li>
              <li><b>Creep / Larson-Miller</b>: ASME Sec.II Part D + ASM Vol.19 (Fatigue and Fracture)</li>
              <li><b>Schaeffler</b>: AWS A3.0 · ASM Vol.6 (Welding) · Schaeffler 1949 original chart</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
