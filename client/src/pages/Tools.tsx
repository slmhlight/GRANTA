/*
 * R67 Sprint B — Engineering Tools.
 * 9 계산기 — Kt / Galvanic / Buckling / CTE mismatch / Hardness / Pressure vessel / Larson-Miller / Mohr / Schaeffler.
 * 각 카드 = 입력 + 결과 + Guide 챕터 link. 수식은 lib/engineering-calcs.ts (R210 B7).
 */
import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Calculator, Zap, BookOpen, GraduationCap } from 'lucide-react';
// R210 B7 — 계산기 수식은 lib/engineering-calcs.ts 순수 함수에서 (테스트 가능). UI 는 그대로.
import {
  ktFactor, galvanicDeltaV, galvanicBand, galvanicAnode, buckling, thermalMismatchStress,
  hardnessConvert, pressureVesselThickness, larsonMiller, larsonMillerInverseTime,
  mohrCircle, schaefflerEq, schaefflerRegion,
  validateKt, validateBuckling, validateHardness, validateVessel, validateLMP, validateSchaeffler,
  KT_SHAPES, HARDNESS_SCALES, HARDNESS_INPUT_RANGE, VESSEL_SHAPES, SCHAEFFLER_LINES, SCHAEFFLER_EXAMPLES,
  type KtShape, type HardnessScale, type VesselShape, type ValidationIssue,
} from '@/lib/engineering-calcs';

/* <select> 의 value 는 string 이다. 예전에는 `as any` 로 상태에 그대로 밀어 넣었는데,
   그러면 목록에 없는 값이 들어와도 컴파일도 런타임도 아무 말을 안 한다. 허용 목록에서
   찾아서 넣고, 못 찾으면 상태를 바꾸지 않는다. */
function onPick<T extends string>(allowed: readonly T[], set: (v: T) => void) {
  return (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = allowed.find((a) => a === e.target.value);
    if (v !== undefined) set(v);
  };
}

/* Record<유니온, string> 이라 선택지가 늘면 라벨을 빠뜨릴 수 없다. */
const KT_SHAPE_LABEL: Record<KtShape, string> = {
  hole: '중앙 구멍 (판)', fillet: '필렛 라운드 (계단축)', sharpCorner: 'Sharp corner (위험)', shoulderCut: 'Shoulder cut',
};
const HARDNESS_LABEL: Record<HardnessScale, string> = { HV: 'Vickers HV', HRC: 'Rockwell HRC', HRB: 'Rockwell HRB', HB: 'Brinell HB (3000 kgf)' };
const VESSEL_LABEL: Record<VesselShape, string> = { cyl: '원통 (후프 응력)', sph: '구형' };

const W = 'rounded-lg border border-border bg-card p-4';
const In = 'h-7 px-2 text-[12px] rounded border border-border bg-background focus:outline-none focus:border-accent';
const Lab = 'text-[11px] font-semibold text-muted-foreground block mb-1';

/* AUD F24 (2026-09-22) — 모든 입력은 <label htmlFor> 로 이름이 연결된다(스크린리더가 "spinbutton" 이 아니라
   "구멍 d (mm)" 를 읽는다). 검증 메시지는 aria-describedby 로 같은 칸에 묶인다(감사 F13). */
function NumField({ id, label, value, onChange, step, issue, className }: {
  id: string; label: ReactNode; value: number; onChange: (v: number) => void; step?: number | string; issue?: ValidationIssue; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={Lab}>{label}</label>
      <input
        id={id} type="number" step={step} className={In + ' w-full' + (issue ? ' border-rose-400' : '')} value={Number.isFinite(value) ? value : ''}
        aria-invalid={issue ? true : undefined} aria-describedby={issue ? `${id}-err` : undefined}
        onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
      />
      {issue && <p id={`${id}-err`} className="text-[10.5px] text-rose-700 mt-0.5 leading-tight">{issue.msg}</p>}
    </div>
  );
}
/** 입력 오류가 하나라도 있으면 결과 대신 이 블록을 보여준다 — NaN·Infinity·모델 밖 수치를 결과처럼 내지 않는다. */
function Issues({ issues }: { issues: ValidationIssue[] }) {
  if (!issues.length) return null;
  return (
    <div role="alert" className="rounded border border-rose-200 bg-rose-50 p-2 text-[12px] text-rose-800">
      <p className="font-semibold">입력을 확인하세요 — 결과를 계산하지 않았습니다.</p>
      <ul className="list-disc pl-4 mt-0.5 space-y-0.5">{issues.map((i) => <li key={i.field + i.msg}>{i.msg}</li>)}</ul>
    </div>
  );
}
const issueOf = (issues: ValidationIssue[], field: string) => issues.find((i) => i.field === field);

/* ───────── Tool illustrations (small SVG) ───────── */
/* R141a — 가시성·직관성 ↑: 응력 흐름선 opacity 0.5 → 0.8, σ_max·σ_nom label 추가,
   shape 별 feature 색상 강조. height 14 → 18 (px) 로 확대. */
function KtIllust({ shape }: { shape: string }) {
  return (
    <svg viewBox="0 0 200 80" className="w-full h-[72px] mb-2">
      {/* Plate */}
      <rect x="20" y="25" width="160" height="30" fill="oklch(0.96 0.008 250)" stroke="oklch(0.4 0.05 250)" strokeWidth="1.2" />
      {/* Tension arrows (σ_nom) */}
      <g stroke="oklch(0.5 0.15 30)" strokeWidth="2">
        <line x1="2" y1="40" x2="18" y2="40" markerEnd="url(#arrLeft)" />
        <line x1="198" y1="40" x2="182" y2="40" markerEnd="url(#arrRight)" />
      </g>
      <text x="9" y="34" textAnchor="middle" fontSize="8" fill="oklch(0.4 0.15 30)" fontWeight="bold">σ_nom</text>
      <text x="191" y="34" textAnchor="middle" fontSize="8" fill="oklch(0.4 0.15 30)" fontWeight="bold">σ_nom</text>
      <defs>
        <marker id="arrLeft" markerWidth="7" markerHeight="7" refX="0" refY="3.5" orient="auto"><path d="M7,0 L0,3.5 L7,7 z" fill="oklch(0.5 0.15 30)" /></marker>
        <marker id="arrRight" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="oklch(0.5 0.15 30)" /></marker>
      </defs>
      {/* Feature based on shape */}
      {shape === 'hole' && (
        <g>
          <circle cx="100" cy="40" r="10" fill="oklch(0.9 0.012 250)" stroke="oklch(0.4 0.15 30)" strokeWidth="1.5" />
          {/* σ_max hotspot */}
          <circle cx="110" cy="40" r="2.5" fill="oklch(0.5 0.25 30)" />
          <circle cx="90" cy="40" r="2.5" fill="oklch(0.5 0.25 30)" />
          <text x="100" y="20" textAnchor="middle" fontSize="9" fill="oklch(0.35 0.25 30)" fontWeight="bold">σ_max</text>
          <line x1="100" y1="22" x2="108" y2="38" stroke="oklch(0.5 0.25 30)" strokeWidth="0.8" />
        </g>
      )}
      {shape === 'fillet' && (
        <g>
          <rect x="20" y="15" width="80" height="50" fill="oklch(0.96 0.008 250)" stroke="oklch(0.4 0.05 250)" strokeWidth="1.2" />
          <path d="M 100 15 Q 110 15 110 25 L 110 55 Q 110 65 100 65" fill="oklch(0.96 0.008 250)" stroke="oklch(0.4 0.05 250)" strokeWidth="1.2" />
          {/* fillet radius arc */}
          <path d="M 100 15 Q 110 15 110 25" fill="none" stroke="oklch(0.4 0.15 30)" strokeWidth="1.6" />
          <text x="118" y="22" fontSize="8" fill="oklch(0.4 0.15 30)" fontWeight="bold">r</text>
          <circle cx="108" cy="22" r="2" fill="oklch(0.5 0.25 30)" />
          <text x="100" y="11" textAnchor="middle" fontSize="9" fill="oklch(0.35 0.25 30)" fontWeight="bold">σ_max</text>
        </g>
      )}
      {shape === 'sharpCorner' && (
        <g>
          <rect x="20" y="10" width="80" height="60" fill="oklch(0.96 0.008 250)" stroke="oklch(0.4 0.05 250)" strokeWidth="1.2" />
          <line x1="100" y1="10" x2="100" y2="70" stroke="oklch(0.4 0.05 250)" strokeWidth="1.2" />
          <rect x="100" y="25" width="80" height="30" fill="oklch(0.96 0.008 250)" stroke="oklch(0.4 0.05 250)" strokeWidth="1.2" />
          {/* hotspot at corner */}
          <circle cx="100" cy="25" r="3" fill="oklch(0.5 0.3 30)" />
          <circle cx="100" cy="55" r="3" fill="oklch(0.5 0.3 30)" />
          <text x="115" y="22" fontSize="9" fill="oklch(0.4 0.3 30)" fontWeight="bold">∞ Kt</text>
          <text x="100" y="9" textAnchor="middle" fontSize="8" fill="oklch(0.45 0.3 30)" fontWeight="bold">⚠ 위험</text>
        </g>
      )}
      {shape === 'shoulderCut' && (
        <g>
          <rect x="20" y="25" width="80" height="30" fill="oklch(0.96 0.008 250)" stroke="oklch(0.4 0.05 250)" strokeWidth="1.2" />
          <rect x="100" y="15" width="80" height="50" fill="oklch(0.96 0.008 250)" stroke="oklch(0.4 0.05 250)" strokeWidth="1.2" />
          {/* hotspot at shoulder */}
          <circle cx="100" cy="25" r="2.5" fill="oklch(0.5 0.25 30)" />
          <circle cx="100" cy="55" r="2.5" fill="oklch(0.5 0.25 30)" />
          <text x="105" y="22" fontSize="9" fill="oklch(0.35 0.25 30)" fontWeight="bold">σ_max</text>
        </g>
      )}
      {/* Stress flow lines (visibility ↑) */}
      <g stroke="oklch(0.5 0.15 30)" strokeWidth="0.6" opacity="0.65" fill="none">
        {[30, 34, 46, 50].map((y, i) => <path key={i} d={`M 25 ${y} Q 100 ${shape === 'hole' ? y - (y > 40 ? 6 : -6) : y} 175 ${y}`} />)}
      </g>
      {/* Kt formula */}
      <text x="100" y="78" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.04 250)" fontStyle="italic">Kt = σ_max / σ_nom</text>
    </svg>
  );
}

/* AUD F16 — anode/cathode 라벨·전자 이동 방향·부식 화살표가 실제 전위 비교 결과를 따른다 (재료 순서에 고정하지 않는다). */
function GalvanicIllust({ anode }: { anode: 'A' | 'B' | null }) {
  const roleA = anode === 'A' ? '(anode · 부식)' : anode === 'B' ? '(cathode)' : '(동전위)';
  const roleB = anode === 'B' ? '(anode · 부식)' : anode === 'A' ? '(cathode)' : '(동전위)';
  const anodeX = anode === 'B' ? 120 : 20;   // 부식 화살표를 그릴 금속의 x
  // 전자는 anode → cathode 로 흐른다.
  const ePath = anode === 'B' ? 'M 120 46 Q 100 38 80 46' : 'M 80 46 Q 100 38 120 46';
  return (
    <svg viewBox="0 0 200 70" className="w-full h-14 mb-2" role="img" aria-label={`갈바닉 쌍 도식 — ${anode === 'A' ? '금속 A 가 양극(부식)' : anode === 'B' ? '금속 B 가 양극(부식)' : '두 금속 동전위'}`}>
      {/* Two metals + electrolyte */}
      <rect x="20" y="30" width="60" height="32" fill={anode === 'A' ? 'oklch(0.85 0.05 90)' : 'oklch(0.85 0.04 250)'} stroke="oklch(0.4 0.05 90)" />
      <text x="50" y="50" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.05 90)" fontWeight="bold">금속 A</text>
      <text x="50" y="60" textAnchor="middle" fontSize="7" fill={anode === 'A' ? 'oklch(0.5 0.18 30)' : 'oklch(0.5 0.04 250)'}>{roleA}</text>
      <rect x="120" y="30" width="60" height="32" fill={anode === 'B' ? 'oklch(0.85 0.05 90)' : 'oklch(0.85 0.04 250)'} stroke="oklch(0.4 0.04 250)" />
      <text x="150" y="50" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.04 250)" fontWeight="bold">금속 B</text>
      <text x="150" y="60" textAnchor="middle" fontSize="7" fill={anode === 'B' ? 'oklch(0.5 0.18 30)' : 'oklch(0.5 0.04 250)'}>{roleB}</text>
      {/* Electrolyte */}
      <path d="M 0 8 Q 100 -3 200 8 L 200 26 Q 100 18 0 26 z" fill="oklch(0.85 0.08 220 / 0.3)" />
      <text x="100" y="22" textAnchor="middle" fontSize="8" fill="oklch(0.4 0.12 220)" fontStyle="italic">전해질 (해수·산)</text>
      {/* Current flow (anode → cathode) */}
      {anode && (
        <>
          <path d={ePath} fill="none" stroke="oklch(0.55 0.18 30)" strokeWidth="1.5" markerEnd="url(#galvArrow)" />
          <text x="100" y="36" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.18 30)" fontWeight="bold">e⁻</text>
        </>
      )}
      <defs>
        <marker id="galvArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.18 30)" /></marker>
      </defs>
      {/* Corrosion arrows on the anode */}
      {anode && (
        <g stroke="oklch(0.55 0.18 30)" strokeWidth="1" opacity="0.7">
          <line x1={anodeX + 10} y1="65" x2={anodeX + 10} y2="69" />
          <line x1={anodeX + 30} y1="65" x2={anodeX + 30} y2="69" />
          <line x1={anodeX + 50} y1="65" x2={anodeX + 50} y2="69" />
        </g>
      )}
    </svg>
  );
}

function BucklingIllust({ K }: { K: number }) {
  /* R141a — End condition 4 종 모두 표시 (Fixed-Free K=2, Pinned-Pinned K=1, Fixed-Pinned K=0.7, Fixed-Fixed K=0.5) */
  return (
    <svg viewBox="0 0 220 90" className="w-full h-[78px] mb-2">
      {/* Straight column (reference) */}
      <rect x="38" y="14" width="3.5" height="62" fill="oklch(0.45 0.04 250)" />
      <text x="40" y="86" textAnchor="middle" fontSize="7" fill="oklch(0.4 0.04 250)">P &lt; P_cr</text>
      <text x="40" y="10" textAnchor="middle" fontSize="7" fill="oklch(0.4 0.04 250)" fontWeight="bold">straight</text>
      {/* Buckled column */}
      <path
        d={
          K === 0.5 ? 'M 110 14 Q 95 45 110 76'
          : K === 0.7 ? 'M 110 14 Q 95 30 110 45 Q 125 60 110 76'
          : K === 1 ? 'M 110 14 Q 140 45 110 76'
          : 'M 110 14 Q 85 45 110 76'
        }
        fill="none" stroke="oklch(0.5 0.17 30)" strokeWidth="3.5"
      />
      <text x="110" y="86" textAnchor="middle" fontSize="7" fill="oklch(0.45 0.17 30)" fontWeight="bold">좌굴 (K={K})</text>
      {/* End condition supports — 가시성 강화 */}
      <g fill="oklch(0.25 0.04 250)" stroke="oklch(0.25 0.04 250)">
        {K === 0.5 && (
          <g>
            {/* fixed-fixed: 양끝 hatched 벽 */}
            <rect x="100" y="8" width="20" height="6" fill="oklch(0.7 0.02 250)" />
            <line x1="100" y1="14" x2="120" y2="14" strokeWidth="0.8" />
            {[102,106,110,114,118].map(x=><line key={'th'+x} x1={x} y1="8" x2={x-2} y2="6" strokeWidth="0.5" />)}
            <rect x="100" y="76" width="20" height="6" fill="oklch(0.7 0.02 250)" />
            <line x1="100" y1="76" x2="120" y2="76" strokeWidth="0.8" />
            {[102,106,110,114,118].map(x=><line key={'bh'+x} x1={x} y1="82" x2={x+2} y2="84" strokeWidth="0.5" />)}
            <rect x="100" y="76" width="20" height="6" fill="oklch(0.7 0.02 250)" />
            <text x="160" y="20" fontSize="8" fill="oklch(0.3 0.04 250)" fontWeight="bold">Fixed-Fixed</text>
          </g>
        )}
        {K === 0.7 && (
          <g>
            <rect x="100" y="8" width="20" height="6" fill="oklch(0.7 0.02 250)" />
            {[102,106,110,114,118].map(x=><line key={'th'+x} x1={x} y1="8" x2={x-2} y2="6" strokeWidth="0.5" />)}
            <circle cx="110" cy="79" r="3" fill="oklch(0.95 0.01 250)" stroke="oklch(0.25 0.04 250)" />
            <polygon points="104,84 116,84 110,79" fill="oklch(0.85 0.02 250)" />
            <text x="160" y="20" fontSize="8" fill="oklch(0.3 0.04 250)" fontWeight="bold">Fixed-Pinned</text>
          </g>
        )}
        {K === 1 && (
          <g>
            {/* pinned-pinned: 양끝 삼각받침 */}
            <circle cx="110" cy="11" r="3" fill="oklch(0.95 0.01 250)" stroke="oklch(0.25 0.04 250)" />
            <polygon points="104,8 116,8 110,11" fill="oklch(0.85 0.02 250)" />
            <circle cx="110" cy="79" r="3" fill="oklch(0.95 0.01 250)" stroke="oklch(0.25 0.04 250)" />
            <polygon points="104,84 116,84 110,79" fill="oklch(0.85 0.02 250)" />
            <text x="160" y="20" fontSize="8" fill="oklch(0.3 0.04 250)" fontWeight="bold">Pinned-Pinned</text>
          </g>
        )}
        {K === 2 && (
          <g>
            {/* fixed-free */}
            <rect x="100" y="76" width="20" height="6" fill="oklch(0.7 0.02 250)" />
            {[102,106,110,114,118].map(x=><line key={'bh'+x} x1={x} y1="82" x2={x+2} y2="84" strokeWidth="0.5" />)}
            <circle cx="110" cy="11" r="2" fill="oklch(0.5 0.17 30)" />
            <text x="160" y="20" fontSize="8" fill="oklch(0.3 0.04 250)" fontWeight="bold">Fixed-Free</text>
          </g>
        )}
      </g>
      {/* Force arrow P */}
      <line x1="110" y1="0" x2="110" y2="12" stroke="oklch(0.5 0.22 30)" strokeWidth="2" markerEnd="url(#forceArr)" />
      <text x="118" y="6" fontSize="9" fill="oklch(0.4 0.22 30)" fontWeight="bold">P</text>
      <defs><marker id="forceArr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="oklch(0.5 0.22 30)" /></marker></defs>
      <text x="180" y="48" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.04 250)" fontStyle="italic">L_eff = K·L</text>
      <text x="180" y="60" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.04 250)" fontStyle="italic">P_cr = π²EI/L_eff²</text>
    </svg>
  );
}

function CTEIllust() {
  /* R141a — ΔL_A vs ΔL_B 명확화 + 응력 σ_thermal 표시 */
  return (
    <svg viewBox="0 0 220 80" className="w-full h-[72px] mb-2">
      {/* T1: equal length */}
      <text x="55" y="9" textAnchor="middle" fontSize="9" fill="oklch(0.35 0.04 250)" fontWeight="bold">T₁ (initial)</text>
      <rect x="20" y="14" width="78" height="11" fill="oklch(0.7 0.15 30)" stroke="oklch(0.35 0.15 30)" strokeWidth="1.2" />
      <text x="59" y="22" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">A (α 高)</text>
      <rect x="20" y="28" width="78" height="11" fill="oklch(0.7 0.15 220)" stroke="oklch(0.35 0.15 220)" strokeWidth="1.2" />
      <text x="59" y="36" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">B (α 低)</text>
      <line x1="20" y1="43" x2="98" y2="43" stroke="oklch(0.45 0.04 250)" strokeWidth="0.6" strokeDasharray="2 2" />
      <text x="59" y="52" textAnchor="middle" fontSize="8" fill="oklch(0.4 0.04 250)" fontStyle="italic">L₀</text>
      {/* Arrow → T2 */}
      <line x1="103" y1="26" x2="118" y2="26" stroke="oklch(0.4 0.04 250)" strokeWidth="1.5" markerEnd="url(#cteArr)" />
      <text x="110" y="22" textAnchor="middle" fontSize="7" fill="oklch(0.4 0.04 250)">+ΔT</text>
      <defs><marker id="cteArr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="oklch(0.4 0.04 250)" /></marker></defs>
      {/* T2: A expanded more, ΔL annotated */}
      <text x="170" y="9" textAnchor="middle" fontSize="9" fill="oklch(0.35 0.04 250)" fontWeight="bold">T₂ = T₁ + ΔT</text>
      <rect x="123" y="14" width="93" height="11" fill="oklch(0.7 0.15 30)" stroke="oklch(0.35 0.15 30)" strokeWidth="1.2" />
      <rect x="123" y="28" width="77" height="11" fill="oklch(0.7 0.15 220)" stroke="oklch(0.35 0.15 220)" strokeWidth="1.2" />
      <line x1="123" y1="43" x2="216" y2="43" stroke="oklch(0.45 0.04 250)" strokeWidth="0.6" strokeDasharray="2 2" />
      {/* ΔL_A bracket */}
      <line x1="200" y1="11" x2="216" y2="11" stroke="oklch(0.5 0.22 30)" strokeWidth="1.2" markerStart="url(#dlA)" markerEnd="url(#dlA)" />
      <text x="208" y="8" textAnchor="middle" fontSize="8" fill="oklch(0.4 0.22 30)" fontWeight="bold">ΔL_A</text>
      <defs><marker id="dlA" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto"><circle cx="2.5" cy="2.5" r="1.5" fill="oklch(0.5 0.22 30)" /></marker></defs>
      {/* ΔL_B */}
      <line x1="200" y1="49" x2="200" y2="55" stroke="oklch(0.5 0.15 220)" strokeWidth="0.8" />
      <text x="200" y="62" textAnchor="middle" fontSize="7" fill="oklch(0.4 0.15 220)" fontWeight="bold">ΔL_B &lt; ΔL_A</text>
      {/* Formula */}
      <text x="110" y="72" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.04 250)" fontStyle="italic">ΔL = α · L₀ · ΔT  →  미스매치 σ = E·(α_A−α_B)·ΔT</text>
    </svg>
  );
}

function HardnessIllust() {
  /* R141a — Vickers (다이아몬드 피라미드) + Rockwell (원뿔 + 강구) 비교 표시.
     각 indenter + indentation + 측정량 (d, h) 의 차이를 도식. */
  return (
    <svg viewBox="0 0 220 80" className="w-full h-[72px] mb-2">
      {/* Material surface (full width) */}
      <rect x="10" y="44" width="200" height="30" fill="oklch(0.82 0.03 250)" stroke="oklch(0.35 0.04 250)" strokeWidth="1.2" />
      {/* hatch pattern */}
      {[20,40,60,80,100,120,140,160,180,200].map(x=><line key={'h'+x} x1={x} y1="74" x2={x-4} y2="78" stroke="oklch(0.4 0.04 250)" strokeWidth="0.5" />)}
      <text x="110" y="64" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.04 250)" fontStyle="italic">금속 표면</text>
      {/* ===== Vickers (left half) ===== */}
      <text x="50" y="9" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.15 220)" fontWeight="bold">Vickers (HV)</text>
      <polygon points="40,16 60,16 50,38" fill="oklch(0.92 0.04 220)" stroke="oklch(0.3 0.15 220)" strokeWidth="1.4" />
      <line x1="50" y1="12" x2="50" y2="18" stroke="oklch(0.5 0.22 30)" strokeWidth="2" markerEnd="url(#indentArr)" />
      <text x="58" y="14" fontSize="8" fill="oklch(0.4 0.22 30)" fontWeight="bold">F</text>
      {/* Diamond impression on surface */}
      <polygon points="42,46 58,46 50,42" fill="oklch(0.55 0.04 250)" />
      <line x1="42" y1="48" x2="58" y2="48" stroke="oklch(0.4 0.22 30)" strokeWidth="0.8" />
      <text x="50" y="55" textAnchor="middle" fontSize="7" fill="oklch(0.4 0.22 30)" fontWeight="bold">d (대각선)</text>
      <text x="50" y="78" textAnchor="middle" fontSize="8" fill="oklch(0.3 0.15 220)" fontStyle="italic">HV = 1.854 F/d²</text>
      {/* ===== Rockwell C (right half) ===== */}
      <text x="160" y="9" textAnchor="middle" fontSize="9" fill="oklch(0.3 0.15 140)" fontWeight="bold">Rockwell C (HRC)</text>
      {/* 120° 다이아몬드 원뿔 */}
      <polygon points="148,16 172,16 160,40" fill="oklch(0.92 0.04 140)" stroke="oklch(0.3 0.15 140)" strokeWidth="1.4" />
      <line x1="160" y1="12" x2="160" y2="18" stroke="oklch(0.5 0.22 30)" strokeWidth="2" markerEnd="url(#indentArr)" />
      <text x="168" y="14" fontSize="8" fill="oklch(0.4 0.22 30)" fontWeight="bold">F</text>
      {/* small cone-shaped pit */}
      <polygon points="155,46 165,46 160,50" fill="oklch(0.55 0.04 250)" />
      <line x1="148" y1="46" x2="172" y2="46" stroke="oklch(0.4 0.22 30)" strokeWidth="0.4" strokeDasharray="2 1" />
      <line x1="178" y1="46" x2="178" y2="50" stroke="oklch(0.4 0.22 30)" strokeWidth="0.8" />
      <text x="184" y="50" fontSize="7" fill="oklch(0.4 0.22 30)" fontWeight="bold">h (깊이)</text>
      <text x="160" y="78" textAnchor="middle" fontSize="8" fill="oklch(0.3 0.15 140)" fontStyle="italic">HRC = 100 − h/0.002</text>
      <defs><marker id="indentArr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="oklch(0.5 0.22 30)" /></marker></defs>
      {/* central conversion arrow */}
      <line x1="80" y1="28" x2="138" y2="28" stroke="oklch(0.4 0.04 250)" strokeWidth="0.8" strokeDasharray="3 2" markerEnd="url(#cnvArr)" />
      <defs><marker id="cnvArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.4 0.04 250)" /></marker></defs>
      <text x="109" y="26" textAnchor="middle" fontSize="7" fill="oklch(0.4 0.04 250)">ASTM E140 conv.</text>
    </svg>
  );
}

function PVIllust({ shape }: { shape: string }) {
  /* R141a — Wall thickness t 명시 + 내압 화살표 + σ_hoop / σ_axial 구분 */
  return (
    <svg viewBox="0 0 220 88" className="w-full h-[78px] mb-2">
      {shape === 'cyl' ? (
        <>
          {/* Cylinder side view + wall thickness */}
          <rect x="40" y="24" width="140" height="40" fill="oklch(0.86 0.04 250)" stroke="oklch(0.3 0.04 250)" strokeWidth="1.4" />
          <rect x="44" y="28" width="132" height="32" fill="oklch(0.95 0.025 220)" stroke="oklch(0.45 0.12 220)" strokeWidth="0.6" strokeDasharray="3 2" />
          {/* End caps (3D hint) */}
          <ellipse cx="40" cy="44" rx="6" ry="20" fill="oklch(0.86 0.04 250)" stroke="oklch(0.3 0.04 250)" strokeWidth="1.2" />
          <ellipse cx="180" cy="44" rx="6" ry="20" fill="oklch(0.9 0.04 250 / 0.5)" stroke="oklch(0.3 0.04 250)" strokeWidth="1.2" />
          {/* Wall thickness t indicator */}
          <line x1="40" y1="68" x2="44" y2="68" stroke="oklch(0.5 0.22 30)" strokeWidth="1.2" />
          <line x1="42" y1="68" x2="42" y2="74" stroke="oklch(0.5 0.22 30)" strokeWidth="0.8" />
          <text x="42" y="82" textAnchor="middle" fontSize="8" fill="oklch(0.4 0.22 30)" fontWeight="bold">t</text>
          {/* Hoop arrows (around top circumference) */}
          <g stroke="oklch(0.5 0.22 30)" strokeWidth="1.8" fill="none">
            <path d="M 80 18 Q 90 10 110 10 Q 130 10 140 18" markerEnd="url(#hoopArr)" />
            <path d="M 140 70 Q 130 78 110 78 Q 90 78 80 70" markerEnd="url(#hoopArr)" />
          </g>
          <text x="110" y="8" textAnchor="middle" fontSize="9" fill="oklch(0.4 0.22 30)" fontWeight="bold">σ_hoop = p·D/(2t)</text>
          {/* Axial arrows */}
          <g stroke="oklch(0.4 0.18 140)" strokeWidth="1.4">
            <line x1="30" y1="44" x2="20" y2="44" markerEnd="url(#axArr)" />
            <line x1="190" y1="44" x2="200" y2="44" markerEnd="url(#axArr)" />
          </g>
          <text x="14" y="40" fontSize="8" fill="oklch(0.35 0.18 140)" fontWeight="bold">σ_axial</text>
          <text x="100" y="86" textAnchor="middle" fontSize="8" fill="oklch(0.3 0.04 250)" fontStyle="italic">σ_axial = p·D/(4t) = ½·σ_hoop</text>
          {/* Inner pressure radial arrows */}
          <g stroke="oklch(0.45 0.15 220)" strokeWidth="1">
            {[34, 44, 54].map((y, i) => <line key={'p'+i} x1="80" y1={y} x2="140" y2={y} strokeDasharray="3 2" markerEnd="url(#pArr)" markerStart="url(#pArr)" />)}
          </g>
          <text x="110" y="44" textAnchor="middle" fontSize="9" fill="oklch(0.35 0.15 220)" fontWeight="bold">p</text>
        </>
      ) : (
        <>
          {/* Sphere */}
          <circle cx="110" cy="44" r="28" fill="oklch(0.86 0.04 250)" stroke="oklch(0.3 0.04 250)" strokeWidth="1.4" />
          <circle cx="110" cy="44" r="24" fill="oklch(0.95 0.025 220)" stroke="oklch(0.45 0.12 220)" strokeWidth="0.6" strokeDasharray="3 2" />
          <ellipse cx="110" cy="44" rx="28" ry="6" fill="none" stroke="oklch(0.5 0.04 250)" strokeWidth="0.6" strokeDasharray="2 2" />
          {/* Radial pressure arrows (8 directions, equal magnitude) */}
          <g stroke="oklch(0.5 0.22 30)" strokeWidth="1.4">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
              const rad = a * Math.PI / 180;
              const x = 110 + Math.cos(rad) * 36;
              const y = 44 + Math.sin(rad) * 36;
              const xi = 110 + Math.cos(rad) * 28;
              const yi = 44 + Math.sin(rad) * 28;
              return <line key={i} x1={xi} y1={yi} x2={x} y2={y} markerEnd="url(#sphArr)" />;
            })}
          </g>
          {/* Wall thickness t indicator */}
          <line x1="82" y1="44" x2="86" y2="44" stroke="oklch(0.4 0.22 30)" strokeWidth="1.2" />
          <text x="76" y="40" fontSize="8" fill="oklch(0.4 0.22 30)" fontWeight="bold">t</text>
          {/* Inner pressure */}
          <text x="110" y="46" textAnchor="middle" fontSize="9" fill="oklch(0.35 0.15 220)" fontWeight="bold">p</text>
          <text x="110" y="80" textAnchor="middle" fontSize="9" fill="oklch(0.4 0.22 30)" fontWeight="bold">σ = p·D/(4t) — 모든 방향 동일</text>
          <text x="110" y="8" textAnchor="middle" fontSize="8" fill="oklch(0.3 0.04 250)" fontStyle="italic">최적 (같은 재료로 cylinder 대비 ½ 응력)</text>
        </>
      )}
      <defs>
        <marker id="hoopArr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="oklch(0.5 0.22 30)" /></marker>
        <marker id="sphArr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="oklch(0.5 0.22 30)" /></marker>
        <marker id="axArr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="oklch(0.4 0.18 140)" /></marker>
        <marker id="pArr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="oklch(0.45 0.15 220)" /></marker>
      </defs>
    </svg>
  );
}

/* ───────── #3 Stress concentration Kt ───────── */
function KtCalc() {
  const [shape, setShape] = useState<KtShape>('hole');
  const [d, setD] = useState(10);
  const [w, setW] = useState(40);
  const [r, setR] = useState(2);
  // 근사식 (Pilkey - Peterson's Stress Concentration Factors) — lib/engineering-calcs.
  const issues = validateKt(shape, { d, w, r });
  const kt = issues.length ? Number.NaN : ktFactor(shape, { d, w, r });
  const singular = shape === 'sharpCorner';
  const band = singular || kt >= 3.5 ? 'danger' : kt < 2 ? 'safe' : 'caution';
  const color = band === 'safe' ? 'text-emerald-700' : band === 'caution' ? 'text-amber-700' : 'text-rose-700';
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #3 응력 집중 계수 Kt</p>
      <p className="text-[11px] text-muted-foreground mb-3">노치·구멍·필렛에 의한 국부 응력 증대. σ_max = K_t · σ_nom.</p>
      <KtIllust shape={shape} />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label htmlFor="kt-shape" className={Lab}>형상</label>
          <select id="kt-shape" className={In + ' w-full'} value={shape} onChange={onPick(KT_SHAPES, setShape)}>
            {KT_SHAPES.map((s) => <option key={s} value={s}>{KT_SHAPE_LABEL[s]}</option>)}
          </select>
        </div>
        {shape === 'hole' ? (
          <>
            <NumField id="kt-d" label="구멍 d (mm)" value={d} onChange={setD} issue={issueOf(issues, 'd')} />
            <NumField id="kt-w" label="판 폭 w (mm)" value={w} onChange={setW} issue={issueOf(issues, 'w')} />
          </>
        ) : !singular && (
          <>
            <NumField id="kt-d2" label="특성 치수 d (mm)" value={d} onChange={setD} issue={issueOf(issues, 'd')} />
            <NumField id="kt-r" label="라디우스 r (mm)" value={r} onChange={setR} step="0.1" issue={issueOf(issues, 'r')} />
          </>
        )}
      </div>
      <Issues issues={issues} />
      {!issues.length && (
        <div className={`rounded p-2 text-sm font-mono ${color} bg-muted/30`}>
          {singular ? (
            <>
              K<sub>t</sub> → <b className="text-base">∞</b>
              <p className="text-[11px] font-sans mt-1 leading-snug">r = 0 인 완전한 날카로운 모서리는 탄성해가 <b>특이점</b>이라 유한한 K<sub>t</sub> 가 없습니다 (어떤 상수도 근거가 없음). 실제 설계에는 반드시 유한 반경을 주고 "필렛 라운드" 로 계산하세요 — r 이 작을수록 K<sub>t</sub> 가 급증합니다.</p>
            </>
          ) : (
            <>K<sub>t</sub> ≈ <b className="text-base">{kt.toFixed(2)}</b></>
          )}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-2">설계 응력 = σ × K<sub>t</sub>. 피로 고려 시 K<sub>f</sub> = 1 + q·(K<sub>t</sub>−1) (q: 강 0.9·Al 0.6·취성 0).</p>
      <Link href="/guide/ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 노치·좌굴 →</Link>
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
  const diff = galvanicDeltaV(va, vb);
  // AUD F16 — 양극(부식되는 쪽) 판정을 한 곳(galvanicAnode)에서 하고 도식·본문이 같이 쓴다.
  const anodeSide = galvanicAnode(va, vb);
  const anode = anodeSide === 'A' ? a : anodeSide === 'B' ? b : null;
  const band = galvanicBand(diff);
  const color = band === 'safe' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : band === 'caution' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200';
  const advice = band === 'safe'
    ? (anode ? `안전 — 일반 환경에서 갈바닉 부식 무시 가능 (전위가 낮은 ${anode} 쪽이 양극).` : '안전 — 같은 전위 (갈바닉 전지가 형성되지 않음).')
    : band === 'caution'
      ? `주의 — 습한·해양 환경에서 ${anode} 가 점진 부식. 절연 와셔·실링 권장.`
      : `위험 — ${anode} 가 빠르게 부식. 직접 접촉 금지. 절연 / 캐소드 보호 / 같은 family 통일.`;
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> #4 갈바닉 부식 호환성</p>
      <p className="text-[11px] text-muted-foreground mb-3">접촉하는 두 금속의 전위차로 부식. 전위 가까울수록 안전, 0.30V 이상이면 위험.</p>
      <GalvanicIllust anode={anodeSide} />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div><label htmlFor="galv-a" className={Lab}>재료 A</label><select id="galv-a" className={In + ' w-full'} value={a} onChange={(e) => setA(e.target.value)}>{SERIES.map(s => <option key={s.name}>{s.name}</option>)}</select></div>
        <div><label htmlFor="galv-b" className={Lab}>재료 B</label><select id="galv-b" className={In + ' w-full'} value={b} onChange={(e) => setB(e.target.value)}>{SERIES.map(s => <option key={s.name}>{s.name}</option>)}</select></div>
      </div>
      <div className={`rounded border p-2 text-sm ${color}`}>
        <p className="font-mono">전위차 ΔV ≈ <b>{diff.toFixed(2)} V</b>{anode && <span className="text-[11px] font-sans"> · 양극(부식): <b>{anode}</b></span>}</p>
        <p className="text-[12px] mt-1">{advice}</p>
      </div>
      {/* AUD F31 — 모델의 범위를 그대로 적는다: 면적비는 이 판정에 들어가지 않는다. */}
      <p className="text-[11px] text-muted-foreground mt-2">기준: 해수 (3.5% NaCl) at 25°C, vs Ag/AgCl. 산성·고온에서 더 위험. <b>이 판정은 전위차만 봅니다</b> — 면적비(작은 양극 + 큰 음극 = 가속)는 계산에 포함되지 않으니 접합부 설계에서 따로 확인하세요.</p>
      <Link href="/guide/ch10" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.3 환경별 합금 →</Link>
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
  // 좌굴 — lib/engineering-calcs (Euler/Johnson 자동 선택).
  const issues = validateBuckling({ L, d, E, sy, K });
  const res = issues.length ? null : buckling({ L, d, E, sy, K });
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #5 좌굴 임계하중 (Euler / Johnson)</p>
      <p className="text-[11px] text-muted-foreground mb-3">기둥의 좌굴 한계 — 가늘면 Euler, 짧으면 Johnson 공식.</p>
      <BucklingIllust K={K} />
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <NumField id="bk-L" label="길이 L (mm)" value={L} onChange={setL} issue={issueOf(issues, 'L')} />
        <NumField id="bk-d" label="직경 d (mm)" value={d} onChange={setD} issue={issueOf(issues, 'd')} />
        <NumField id="bk-E" label="E (GPa)" value={E} onChange={setE} issue={issueOf(issues, 'E')} />
        <NumField id="bk-sy" label="σy (MPa)" value={sy} onChange={setSy} issue={issueOf(issues, 'sy')} />
        <div className="col-span-2"><label htmlFor="bk-K" className={Lab}>단부 조건 K</label><select id="bk-K" className={In + ' w-full'} value={K} onChange={(e) => setK(+e.target.value)}><option value={1}>핀-핀 (K=1.0)</option><option value={2}>고정-자유 외팔 (K=2.0)</option><option value={0.7}>고정-핀 (K≈0.7)</option><option value={0.5}>고정-고정 (K=0.5)</option></select></div>
      </div>
      <Issues issues={issues} />
      {res && (
        <div className="rounded bg-muted/30 p-2 text-sm font-mono space-y-0.5">
          <div>(L/k) = {res.slenderness.toFixed(1)} · 임계 = {res.lambdaC.toFixed(1)}</div>
          <div className="text-emerald-700">{res.isEuler ? 'Euler (가는 기둥)' : 'Johnson (짧은 기둥)'} 적용</div>
          <div className="text-base">P_cr ≈ <b>{res.Pcr.toFixed(1)} kN</b></div>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-2">설계 안전계수 SF = P_cr / P_applied. 항공 SF ≥ 1.5, 일반 ≥ 2.</p>
      <Link href="/guide/ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 좌굴 이론 →</Link>
    </div>
  );
}

/* ───────── #6 CTE mismatch ───────── */
function CTEMismatch() {
  const [cteA, setCteA] = useState(23); // Al
  const [cteB, setCteB] = useState(12); // Steel
  const [dT, setDT] = useState(100);
  const [E, setE] = useState(200); // GPa, 작은 쪽
  // 열응력 σ ≈ ΔCTE·ΔT·E — lib/engineering-calcs.
  const ok = [cteA, cteB, dT, E].every(Number.isFinite) && E > 0;
  const sigma = ok ? thermalMismatchStress(cteA, cteB, dT, E) : Number.NaN;
  const band = Math.abs(sigma) < 50 ? 'safe' : Math.abs(sigma) < 200 ? 'caution' : 'danger';
  const color = band === 'safe' ? 'text-emerald-700' : band === 'caution' ? 'text-amber-700' : 'text-rose-700';
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #6 CTE mismatch 열응력</p>
      <p className="text-[11px] text-muted-foreground mb-3">두 재료의 열팽창 차이로 발생하는 응력. σ ≈ ΔCTE × ΔT × E.</p>
      <CTEIllust />
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <NumField id="cte-a" label="재료 A CTE (×10⁻⁶/K)" value={cteA} onChange={setCteA} />
        <NumField id="cte-b" label="재료 B CTE" value={cteB} onChange={setCteB} />
        <NumField id="cte-dt" label="온도 변화 ΔT (°C)" value={dT} onChange={setDT} />
        <NumField id="cte-E" label="구속 재료 E (GPa)" value={E} onChange={setE} />
      </div>
      {ok ? (
        <div className={`rounded bg-muted/30 p-2 text-sm font-mono ${color}`}>
          <div>ΔCTE × ΔT = {((cteA - cteB) * dT * 1e-6 * 100).toFixed(3)} %</div>
          <div className="text-base">σ_th ≈ <b>{sigma.toFixed(0)} MPa</b></div>
        </div>
      ) : <Issues issues={[{ field: 'E', msg: '모든 값을 입력하고 E 는 0 보다 커야 합니다.' }]} />}
      <p className="text-[11px] text-muted-foreground mt-2">참고: Al 23 · Steel 12 · Ti 9 · Invar 1.3 · CFRP ≈0 · 세라믹 5-8 (×10⁻⁶/K).</p>
      <Link href="/guide/ch11" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.9 #9 CTE mismatch →</Link>
    </div>
  );
}

/* ───────── #7 Hardness conversion (HV ↔ HRC ↔ HRB ↔ HB ↔ UTS) ───────── */
function HardnessConv() {
  const [scale, setScale] = useState<HardnessScale>('HV');
  const [val, setVal] = useState(300);
  // AUD F02 — ASTM E140-12b Table 1·2 (비오스테나이트 강) 표 보간. 표 밖은 환산하지 않는다 (lib/hardness-convert).
  const issues = validateHardness(scale, val);
  const res = issues.length ? null : hardnessConvert(scale, val);
  const rng = HARDNESS_INPUT_RANGE[scale];
  const fmt = (v: number | null, digits = 0) => (v == null ? '— (표 범위 외)' : v.toFixed(digits));
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #7 경도 변환 (HV/HRC/HRB/HB)</p>
      <p className="text-[11px] text-muted-foreground mb-3">ASTM E140-12b 표 1·2 (비오스테나이트 <b>강</b>) 의 선형 보간. 알루미늄·구리·오스테나이트강은 다른 표(E140 Table 4·9 등)를 써야 하며 이 환산을 적용하지 마세요.</p>
      <HardnessIllust />
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <div><label htmlFor="hd-scale" className={Lab}>입력 scale</label><select id="hd-scale" className={In + ' w-full'} value={scale} onChange={onPick(HARDNESS_SCALES, setScale)}>{HARDNESS_SCALES.map((s) => <option key={s} value={s}>{HARDNESS_LABEL[s]}</option>)}</select></div>
        <NumField id="hd-val" label={<>값 <span className="font-normal text-muted-foreground">(표 범위 {rng.min}~{rng.max})</span></>} value={val} onChange={setVal} issue={issueOf(issues, 'val')} />
      </div>
      <Issues issues={issues} />
      {res && (
        <div className="rounded bg-muted/30 p-2 text-sm font-mono space-y-0.5">
          <div>HV ≈ <b>{fmt(res.HV)}</b></div>
          <div>HRC ≈ <b>{fmt(res.HRC, 1)}</b></div>
          <div>HRB ≈ <b>{fmt(res.HRB, 1)}</b></div>
          <div>HB (3000 kgf) ≈ <b>{fmt(res.HB)}</b></div>
          <div className="text-emerald-700 mt-1 pt-1 border-t border-border/30">인장강도 근사 (E140 표의 강 전용 열) ≈ <b>{fmt(res.UTS)} MPa</b></div>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-2">환산표는 근사입니다 (같은 표 안에서도 합금·가공 이력에 따라 오차). 인장강도 열은 E140 이 강에 한해 제시한 참고값 — 설계값은 datasheet 로.</p>
      <Link href="/guide/ch1" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.4 물성 사전 →</Link>
    </div>
  );
}

/* ───────── #9 Pressure vessel thickness ───────── */
function PressureVessel() {
  const [p, setP] = useState(10); // MPa
  const [r, setR] = useState(150); // mm (inner radius)
  const [sy, setSy] = useState(250); // MPa
  const [SF, setSF] = useState(3);
  const [shape, setShape] = useState<VesselShape>('cyl');
  // 얇은 벽 가정 — lib/engineering-calcs. t/r>0.1 이면 얇은 벽 가정 밖 → Lamé 두께를 함께 제시 (AUD R07).
  const issues = validateVessel({ p, r, sy, SF });
  const res = issues.length ? null : pressureVesselThickness({ p, r, sy, SF, shape });
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #9 압력 용기 두께</p>
      <p className="text-[11px] text-muted-foreground mb-3">얇은 벽 가정 — 원통 σ = p·r/t (후프), 구형 σ = p·r/(2t). 두꺼운 벽 (t/r &gt; 0.1) 은 Lamé 식으로 다시 계산해 보여줍니다.</p>
      <PVIllust shape={shape} />
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <div><label htmlFor="pv-shape" className={Lab}>형상</label><select id="pv-shape" className={In + ' w-full'} value={shape} onChange={onPick(VESSEL_SHAPES, setShape)}>{VESSEL_SHAPES.map((s) => <option key={s} value={s}>{VESSEL_LABEL[s]}</option>)}</select></div>
        <NumField id="pv-p" label="내압 p (MPa)" value={p} onChange={setP} issue={issueOf(issues, 'p')} />
        <NumField id="pv-r" label="내반경 r (mm)" value={r} onChange={setR} issue={issueOf(issues, 'r')} />
        <NumField id="pv-sy" label="σy (MPa)" value={sy} onChange={setSy} issue={issueOf(issues, 'sy')} />
        <NumField id="pv-sf" label="안전계수 SF (σy 기준)" value={SF} onChange={setSF} step="0.1" issue={issueOf(issues, 'SF')} />
      </div>
      <Issues issues={issues} />
      {res && (
        <div className="rounded bg-muted/30 p-2 text-sm font-mono">
          {res.thick ? (
            <>
              <div className="text-[11px] text-amber-700">얇은 벽 식 t ≈ {res.t.toFixed(2)} mm (t/r = {(res.t / r).toFixed(3)} &gt; 0.1 — 가정 밖이라 확정값으로 쓰지 않음)</div>
              <div className="mt-1">Lamé (두꺼운 벽) 최소 두께 t ≈ <b className="text-base">{res.tLame == null ? '해 없음' : res.tLame.toFixed(2) + ' mm'}</b></div>
              {res.tLame == null && <div className="text-[11px] text-rose-700 mt-0.5">허용응력 σy/SF 가 내압 이하 — 어떤 두께로도 내면 응력을 허용치 아래로 내릴 수 없습니다 (재료·SF·압력을 다시 정하세요).</div>}
            </>
          ) : (
            <>
              <div>최소 두께 t ≈ <b className="text-base">{res.t.toFixed(2)} mm</b></div>
              <div className="text-[11px] mt-1">t/r = {(res.t / r).toFixed(3)} (얇은 벽 가정 유효)</div>
            </>
          )}
        </div>
      )}
      {/* AUD F30 — 코드 계수와 이 계산기의 SF 를 섞어 쓰지 않도록 기준을 한 문장으로 못박는다. */}
      <p className="text-[11px] text-muted-foreground mt-2">SF 는 <b>σy 기준</b>으로 입력합니다 (탄성식 교육용). ASME B&amp;PV Sec. VIII Div.1 은 이런 SF 가 아니라 허용응력 S (≈ min(UTS/3.5, σy/1.5), 판본·재료표 기준)로 두께를 정하므로 UTS 기준 3.5 를 여기 σy 칸에 넣지 마세요. 부식 여유 (corrosion allowance) 1-3 mm 는 별도 가산.</p>
      <Link href="/guide/ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 압력용기 →</Link>
    </div>
  );
}

/* ───────── #H1 Larson-Miller parameter (creep lifetime) ───────── */
function LMPCalc() {
  const [T, setT] = useState(600);   // °C
  const [t, setT_h] = useState(1000); // h
  const [C, setC] = useState(20);
  const [T2, setT2] = useState(650);
  // Larson-Miller — lib/engineering-calcs. LMP = T(K)·(C+log₁₀ t)/1000. 절대온도>0·t>0 검증 (AUD F13).
  const issues = validateLMP({ T, t, C, T2 });
  const LMP = issues.length ? Number.NaN : larsonMiller(T, t, C);
  // 같은 LMP 에서 T₂ 의 파단 시간 역산.
  const t2 = issues.length ? Number.NaN : larsonMillerInverseTime(LMP, T2, C);
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Larson-Miller parameter (creep 수명)</p>
      <p className="text-[11px] text-muted-foreground mb-3">LMP = T·(C+log₁₀ t)/1000 — 같은 응력의 다른 (T,t) 예측. C ≈ 20 (강) · 25 (Ni-base).</p>
      {/* R141a — Master curve + 다중 (T,t) data point + (T1,t1) → (T2,t2) 화살표 */}
      <svg viewBox="0 0 280 80" className="w-full h-[68px] mb-2">
        {/* axes */}
        <line x1="30" y1="62" x2="270" y2="62" stroke="oklch(0.4 0.04 250)" strokeWidth="1.2" />
        <line x1="30" y1="10" x2="30" y2="62" stroke="oklch(0.4 0.04 250)" strokeWidth="1.2" />
        {/* grid */}
        {[20, 35, 50].map(y=><line key={'gy'+y} x1="30" y1={y} x2="270" y2={y} stroke="oklch(0.92 0.012 250)" strokeDasharray="2 3" />)}
        {[80, 130, 180, 230].map(x=><line key={'gx'+x} x1={x} y1="10" x2={x} y2="62" stroke="oklch(0.92 0.012 250)" strokeDasharray="2 3" />)}
        {/* master curve (log σ vs LMP) */}
        <path d="M 30 18 Q 100 28 200 50 L 270 60" fill="none" stroke="oklch(0.45 0.15 220)" strokeWidth="2.2" />
        {/* multiple (T,t) data points along curve */}
        <g fill="oklch(0.45 0.15 220)">
          <circle cx="60" cy="22" r="2.5" />
          <circle cx="110" cy="32" r="2.5" />
          <circle cx="170" cy="44" r="2.5" />
          <circle cx="230" cy="55" r="2.5" />
        </g>
        {/* T1,t1 → T2,t2 (same LMP horizontal projection) */}
        <line x1="60" y1="22" x2="60" y2="62" stroke="oklch(0.5 0.22 30)" strokeWidth="0.7" strokeDasharray="2 2" />
        <text x="60" y="72" textAnchor="middle" fontSize="8" fill="oklch(0.4 0.22 30)" fontWeight="bold">(T₁,t₁)</text>
        <line x1="170" y1="44" x2="170" y2="62" stroke="oklch(0.4 0.18 140)" strokeWidth="0.7" strokeDasharray="2 2" />
        <text x="170" y="72" textAnchor="middle" fontSize="8" fill="oklch(0.35 0.18 140)" fontWeight="bold">(T₂,t₂) — 같은 σ</text>
        {/* labels */}
        <text x="22" y="14" fontSize="8" fill="oklch(0.3 0.04 250)" fontWeight="bold">log σ</text>
        <text x="22" y="22" fontSize="7" fill="oklch(0.5 0.04 250)">高</text>
        <text x="22" y="60" fontSize="7" fill="oklch(0.5 0.04 250)">低</text>
        <text x="270" y="76" textAnchor="end" fontSize="9" fill="oklch(0.3 0.04 250)" fontWeight="bold">LMP = T(C+log t)/1000 →</text>
        <text x="150" y="22" fontSize="9" fill="oklch(0.35 0.15 220)" fontStyle="italic">master curve (σ_rupture)</text>
      </svg>
      <div className="grid grid-cols-2 gap-2 mb-2 text-[12px]">
        <NumField id="lmp-T" label="온도 T (°C)" value={T} onChange={setT} issue={issueOf(issues, 'T')} />
        <NumField id="lmp-t" label="시간 t (h)" value={t} onChange={setT_h} issue={issueOf(issues, 't')} />
        <NumField id="lmp-C" label="상수 C" value={C} onChange={setC} issue={issueOf(issues, 'C')} />
        <NumField id="lmp-T2" label="예측 T₂ (°C)" value={T2} onChange={setT2} issue={issueOf(issues, 'T2')} />
      </div>
      <Issues issues={issues} />
      {!issues.length && (
        <div className="rounded bg-muted/30 p-2 text-sm font-mono space-y-0.5">
          <div>LMP = <b className="text-base">{LMP.toFixed(2)}</b> × 10³</div>
          <div className="text-emerald-700">→ T₂={T2}°C 에서 같은 LMP 의 수명 ≈ <b className="text-base">{t2.toExponential(2)} h</b></div>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-1">전형: P91 σ=100 MPa LMP ≈ 22.5. Inconel 718 σ=400 MPa LMP ≈ 24. ECCC datasheets 참고.</p>
      <Link href="/guide/ch9" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.10 LMP →</Link>
    </div>
  );
}

/* ───────── #H2 Mohr's circle ───────── */
function MohrCalc() {
  const [sx, setSx] = useState(100);
  const [sy, setSy] = useState(40);
  const [txy, setTxy] = useState(30);
  // Mohr's circle — lib/engineering-calcs.
  const { center, R, s1, s2, tauMax: tmax, tauMaxAbs, angleDeg: angle } = mohrCircle(sx, sy, txy);
  // SVG scale
  const sw = 280, sh = 180;
  const cx = sw / 2, cy = sh / 2 + 10;
  const scale = (sh - 50) / (R * 2 + 20);
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Mohr's circle (주응력·최대 전단)</p>
      <p className="text-[11px] text-muted-foreground mb-3">2D 응력 상태 → 주응력 σ₁·σ₂, 최대 전단 τ_max, 회전각.</p>
      {/* R141a — Mohr 원 가시성 ↑: τ_max line + 회전각 2θ + (σ_x, τ_xy) ↔ (σ_y, -τ_xy) connection */}
      <svg viewBox={`0 0 ${sw} ${sh}`} className="w-full h-36 mb-2 border border-border rounded bg-white">
        {/* axes */}
        <line x1="0" y1={cy} x2={sw} y2={cy} stroke="oklch(0.3 0.04 250)" strokeWidth="1.2" />
        <line x1={cx} y1="10" x2={cx} y2={sh - 10} stroke="oklch(0.3 0.04 250)" strokeWidth="1.2" />
        <text x={sw - 4} y={cy - 4} textAnchor="end" fontSize="10" fill="oklch(0.3 0.04 250)" fontWeight="bold">σ</text>
        <text x={cx + 4} y="14" fontSize="10" fill="oklch(0.3 0.04 250)" fontWeight="bold">τ</text>
        {/* circle */}
        <circle cx={cx} cy={cy} r={R * scale} fill="oklch(0.97 0.025 220 / 0.5)" stroke="oklch(0.45 0.15 220)" strokeWidth="2" />
        {/* τ_max horizontal line */}
        <line x1={cx - R * scale} y1={cy - R * scale} x2={cx + R * scale} y2={cy - R * scale} stroke="oklch(0.5 0.18 140)" strokeWidth="0.8" strokeDasharray="3 2" />
        <text x={cx} y={cy - R * scale - 3} textAnchor="middle" fontSize="9" fill="oklch(0.35 0.18 140)" fontWeight="bold">τ_max = R</text>
        {/* (σ_x, τ_xy) and (σ_y, -τ_xy) connection line through center */}
        <line x1={cx + (sx - center) * scale} y1={cy - txy * scale} x2={cx + (sy - center) * scale} y2={cy + txy * scale} stroke="oklch(0.5 0.22 30)" strokeWidth="0.8" strokeDasharray="2 2" />
        {/* current stress point markers */}
        <circle cx={cx + (sx - center) * scale} cy={cy - txy * scale} r="4.5" fill="oklch(0.5 0.22 30)" stroke="white" strokeWidth="1.2" />
        <text x={cx + (sx - center) * scale + 6} y={cy - txy * scale - 3} fontSize="8" fill="oklch(0.4 0.22 30)" fontWeight="bold">(σ_x, τ_xy)</text>
        <circle cx={cx + (sy - center) * scale} cy={cy + txy * scale} r="4.5" fill="oklch(0.5 0.22 30)" stroke="white" strokeWidth="1.2" />
        <text x={cx + (sy - center) * scale + 6} y={cy + txy * scale + 12} fontSize="8" fill="oklch(0.4 0.22 30)" fontWeight="bold">(σ_y, −τ_xy)</text>
        {/* sigma1 / sigma2 ticks */}
        <line x1={cx + R * scale} y1={cy - 4} x2={cx + R * scale} y2={cy + 4} stroke="oklch(0.35 0.15 220)" strokeWidth="2" />
        <text x={cx + R * scale} y={cy + 15} textAnchor="middle" fontSize="11" fill="oklch(0.3 0.15 220)" fontWeight="bold">σ₁</text>
        <line x1={cx - R * scale} y1={cy - 4} x2={cx - R * scale} y2={cy + 4} stroke="oklch(0.35 0.15 220)" strokeWidth="2" />
        <text x={cx - R * scale} y={cy + 15} textAnchor="middle" fontSize="11" fill="oklch(0.3 0.15 220)" fontWeight="bold">σ₂</text>
        {/* center marker */}
        <circle cx={cx} cy={cy} r="2" fill="oklch(0.3 0.04 250)" />
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="8" fill="oklch(0.4 0.04 250)">C=(σ_x+σ_y)/2</text>
      </svg>
      <div className="grid grid-cols-3 gap-2 mb-2 text-[12px]">
        <NumField id="mohr-sx" label="σ_x (MPa)" value={sx} onChange={(v) => setSx(Number.isFinite(v) ? v : 0)} />
        <NumField id="mohr-sy" label="σ_y (MPa)" value={sy} onChange={(v) => setSy(Number.isFinite(v) ? v : 0)} />
        <NumField id="mohr-txy" label="τ_xy (MPa)" value={txy} onChange={(v) => setTxy(Number.isFinite(v) ? v : 0)} />
      </div>
      <div className="rounded bg-muted/30 p-2 text-sm font-mono space-y-0.5">
        <div>σ₁ = <b>{s1.toFixed(1)}</b> · σ₂ = <b>{s2.toFixed(1)}</b> MPa · 회전각 = <b>{angle.toFixed(1)}°</b></div>
        {/* AUD R06 — 면내 최대 전단(원의 반지름)과 σ₃=0 을 포함한 절대 최대 전단을 구분한다. Tresca 는 후자. */}
        <div>면내 τ_max = R = <b>{tmax.toFixed(1)}</b> MPa · 절대 τ_max (σ₃=0 포함) = <b>{tauMaxAbs.toFixed(1)}</b> MPa</div>
        <div className="text-emerald-700 mt-1 pt-1 border-t border-border/30">von Mises σ_eq = √(σ₁² − σ₁σ₂ + σ₂²) ≈ <b>{Math.sqrt(s1*s1 - s1*s2 + s2*s2).toFixed(1)}</b> MPa · Tresca σ_eq = 2·절대 τ_max ≈ <b>{(2 * tauMaxAbs).toFixed(1)}</b> MPa</div>
      </div>
      <Link href="/guide/ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 Mohr·복합응력 →</Link>
    </div>
  );
}

/* ───────── #H3 Schaeffler diagram (stainless) ───────── */
/* AUD F14 — 그림의 경계선·영역 채색은 lib/engineering-calcs 의 SCHAEFFLER_LINES 에서 계산한다. 판정(schaefflerRegion)과
   예시(SCHAEFFLER_EXAMPLES)도 같은 식이라 같은 좌표에서 셋이 다른 답을 낼 수 없다. */
function SchaefflerCalc() {
  const [Cr, setCr] = useState(18);
  const [Ni, setNi] = useState(10);
  const [Mo, setMo] = useState(0);
  const [Si, setSi] = useState(0.5);
  const [Nb, setNb] = useState(0);
  const [C, setC] = useState(0.05);
  const [N, setN] = useState(0.04);
  const [Mn, setMn] = useState(1.5);
  const inp = { Cr, Ni, Mo, Si, Nb, C, N, Mn };
  const issues = validateSchaeffler(inp);
  const res = issues.length ? null : schaefflerEq(inp);
  // SVG positions: Cr_eq x-axis (0–40), Ni_eq y-axis (0–32)
  const sw = 320, sh = 240;
  const PAD_L = 38, PAD_R = 12, PAD_T = 30, PAD_B = 38;
  const X = (v: number) => PAD_L + (v / 40) * (sw - PAD_L - PAD_R);
  const Y = (v: number) => sh - PAD_B - (v / 32) * (sh - PAD_T - PAD_B);
  const clampY = (v: number) => Math.max(0, Math.min(32, v));
  const { A, M, F, crMF, apex } = SCHAEFFLER_LINES;
  // 경계선 끝점 (도표 범위 0~40 × 0~32 안에서 자른다)
  const xAtA32 = 8 + 32 / 1.125;               // L_A 가 Ni_eq=32 에 닿는 Cr_eq
  const xAtM0 = 31.5;                          // L_M 이 Ni_eq=0 에 닿는 Cr_eq
  const xAtF0 = 9.5 / 0.6;                     // L_F 가 Ni_eq=0 에 닿는 Cr_eq
  const pt = (x: number, y: number) => `${X(x)},${Y(clampY(y))}`;
  // 영역 폴리곤 (선 세 개 + 도표 경계로 닫음)
  const polyA = [pt(0, 32), pt(0, M(0)), pt(apex.crEq, apex.niEq), pt(xAtA32, 32)].join(' ');
  const polyAF = [pt(apex.crEq, apex.niEq), pt(xAtA32, 32), pt(40, 32), pt(40, F(40)), pt(xAtM0, 0), pt(xAtF0, 0)].join(' ');
  const polyF = [pt(xAtF0, 0), pt(40, F(40)), pt(40, 0)].join(' ');
  const polyM = [pt(0, 0), pt(0, M(0)), pt(apex.crEq, apex.niEq), pt(13, 0)].join(' ');
  const polyMF = [pt(13, 0), pt(apex.crEq, apex.niEq), pt(xAtF0, 0)].join(' ');
  // 예시 점의 판정 (같은 모델)
  const examples = SCHAEFFLER_EXAMPLES.map((e) => ({ ...e, r: schaefflerEq(e.comp) }));
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Schaeffler diagram (stainless 미세조직)</p>
      <p className="text-[11px] text-muted-foreground mb-3">Cr-eq / Ni-eq 로 austenite·ferrite·martensite·duplex 영역 예측 (용접 금속 기준). <b>이 앱의 직선 근사 경계</b>(Schaeffler 1949 도표를 직선 3개로 근사) — 정밀 ferrite number 는 WRC-1992 를 쓰세요.</p>
      <svg viewBox={`0 0 ${sw} ${sh}`} className="w-full h-60 mb-2 border border-border rounded bg-white" role="img" aria-label="Schaeffler 다이어그램 — 현재 조성 점과 상 영역">
        {/* 1) Zone tint — 경계식에서 계산한 폴리곤 */}
        <polygon points={polyA} fill="#3b82f6" opacity="0.12" />
        <polygon points={polyM} fill="#f59e0b" opacity="0.14" />
        <polygon points={polyMF} fill="#f97316" opacity="0.10" />
        <polygon points={polyF} fill="#ef4444" opacity="0.12" />
        <polygon points={polyAF} fill="#10b981" opacity="0.10" />

        {/* 2) Grid */}
        {[0, 10, 20, 30, 40].map(v => (
          <g key={'cr' + v}>
            <line x1={X(v)} y1={Y(0)} x2={X(v)} y2={Y(32)} stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="2 3" />
            <text x={X(v)} y={sh - PAD_B + 12} textAnchor="middle" fontSize="10" fill="#475569">{v}</text>
          </g>
        ))}
        {[0, 8, 16, 24, 32].map(v => (
          <g key={'ni' + v}>
            <line x1={X(0)} y1={Y(v)} x2={X(40)} y2={Y(v)} stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="2 3" />
            <text x={X(0) - 6} y={Y(v) + 4} textAnchor="end" fontSize="10" fill="#475569">{v}</text>
          </g>
        ))}

        {/* 3) Axes */}
        <line x1={X(0)} y1={Y(0)} x2={X(40)} y2={Y(0)} stroke="#1e293b" strokeWidth="2" />
        <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(32)} stroke="#1e293b" strokeWidth="2" />

        {/* 4) Boundary lines — halo + main. 모두 SCHAEFFLER_LINES 에서. */}
        {[
          { d: `M ${pt(apex.crEq, apex.niEq)} L ${pt(xAtA32, 32)}`, c: '#1d4ed8' },
          { d: `M ${pt(0, M(0))} L ${pt(xAtM0, 0)}`, c: '#c2410c' },
          { d: `M ${pt(xAtF0, 0)} L ${pt(40, F(40))}`, c: '#b91c1c' },
          { d: `M ${pt(13, 0)} L ${pt(apex.crEq, apex.niEq)}`, c: '#9a3412' },
        ].map((l, i) => (
          <g key={i}>
            <path d={l.d} fill="none" stroke="white" strokeWidth="7" />
            <path d={l.d} fill="none" stroke={l.c} strokeWidth="3.5" strokeLinecap="round" />
          </g>
        ))}

        {/* 5) Boundary labels */}
        <g>
          <rect x={X(26)-30} y={Y(A(26))-7} width="60" height="13" fill="white" fillOpacity="0.92" rx="2" stroke="#1d4ed8" strokeWidth="0.5" />
          <text x={X(26)} y={Y(A(26))+3} textAnchor="middle" fontSize="10" fill="#1d4ed8" fontWeight="bold">0 % ferrite</text>
        </g>
        <g>
          <rect x={X(34)-35} y={Y(F(34))-7} width="70" height="13" fill="white" fillOpacity="0.92" rx="2" stroke="#b91c1c" strokeWidth="0.5" />
          <text x={X(34)} y={Y(F(34))+3} textAnchor="middle" fontSize="10" fill="#b91c1c" fontWeight="bold">100 % ferrite</text>
        </g>
        <g>
          <rect x={X(7)-25} y={Y(M(7))-7} width="50" height="13" fill="white" fillOpacity="0.92" rx="2" stroke="#c2410c" strokeWidth="0.5" />
          <text x={X(7)} y={Y(M(7))+3} textAnchor="middle" fontSize="10" fill="#c2410c" fontWeight="bold">Ms = RT</text>
        </g>

        {/* 6) Phase zone labels */}
        <text x={X(3)} y={Y(29)} fontSize="13" fontWeight="bold" fill="#1e3a8a" stroke="white" strokeWidth="3" paintOrder="stroke">γ Austenite</text>
        <text x={X(34)} y={Y(2)} fontSize="13" fontWeight="bold" fill="#7f1d1d" stroke="white" strokeWidth="3" paintOrder="stroke" textAnchor="middle">α Ferrite</text>
        <text x={X(3)} y={Y(4)} fontSize="13" fontWeight="bold" fill="#7c2d12" stroke="white" strokeWidth="3" paintOrder="stroke">α′ Martensite</text>
        <text x={X(17)} y={Y(2.5)} fontSize="10" fontWeight="bold" fill="#9a3412" stroke="white" strokeWidth="3" paintOrder="stroke" textAnchor="middle">M+F</text>
        <text x={X(28)} y={Y(20)} fontSize="13" fontWeight="bold" fill="#064e3b" stroke="white" strokeWidth="3" paintOrder="stroke" textAnchor="middle">A + F</text>
        <text x={X(28)} y={Y(17.5)} fontSize="10" fontStyle="italic" fill="#065f46" stroke="white" strokeWidth="3" paintOrder="stroke" textAnchor="middle">(Duplex)</text>

        {/* 7) User point */}
        {res && (
          <>
            <circle cx={X(Math.min(40, res.crEq))} cy={Y(clampY(res.niEq))} r="9" fill="white" stroke="#dc2626" strokeWidth="3" />
            <circle cx={X(Math.min(40, res.crEq))} cy={Y(clampY(res.niEq))} r="5" fill="#dc2626" />
            <text x={X(Math.min(40, res.crEq)) + 12} y={Y(clampY(res.niEq)) - 5} fontSize="11" fontWeight="bold" fill="#7f1d1d" stroke="white" strokeWidth="3" paintOrder="stroke">현재 조성</text>
          </>
        )}

        {/* 8) Axis labels */}
        <text x={(X(0) + X(40)) / 2} y={sh - 6} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e293b">Cr-eq = Cr + Mo + 1.5 Si + 0.5 Nb  (%)</text>
        <text x={4} y={16} fontSize="11" fontWeight="bold" fill="#1e293b">Ni-eq (%)</text>
        <text x={4} y={28} fontSize="9" fill="#64748b">= Ni + 30C + 30N + 0.5Mn</text>
      </svg>
      <p className="text-[10px] text-muted-foreground -mt-1 mb-1 leading-tight">
        <span className="inline-block w-3 h-0.5 bg-[#1d4ed8] align-middle mr-1"/> 0% ferrite (γ↔A+F)  ·
        <span className="inline-block w-3 h-0.5 bg-[#b91c1c] align-middle mx-1"/> 100% ferrite (A+F↔α)  ·
        <span className="inline-block w-3 h-0.5 bg-[#c2410c] align-middle mx-1"/> Ms=RT (martensite 형성 한계)  ·
        <span className="inline-block w-3 h-0.5 bg-[#9a3412] align-middle mx-1"/> α′↔M+F
      </p>
      <div className="grid grid-cols-3 gap-1 mb-2 text-[11px]">
        {/* R209 A-12 — Cu 입력 제거 (Schaeffler/DeLong Ni_eq 에 미포함 → 입력해도 무시되던 혼란 제거) */}
        {[{l:'Cr', v:Cr, s:setCr}, {l:'Ni', v:Ni, s:setNi}, {l:'Mo', v:Mo, s:setMo}, {l:'Si', v:Si, s:setSi}, {l:'Nb', v:Nb, s:setNb}, {l:'C', v:C, s:setC}, {l:'N', v:N, s:setN}, {l:'Mn', v:Mn, s:setMn}].map(f => (
          <NumField key={f.l} id={`sch-${f.l}`} label={`${f.l} %`} value={f.v} onChange={f.s} step="0.1" issue={issueOf(issues, f.l)} />
        ))}
      </div>
      <Issues issues={issues} />
      {res && (
        <div className="rounded bg-muted/30 p-2 text-sm font-mono">
          <div>Cr-eq = <b>{res.crEq.toFixed(1)}</b> · Ni-eq = <b>{res.niEq.toFixed(1)}</b></div>
          <div className="text-emerald-700 mt-1">예측 미세조직: <b>{res.phase}</b>{res.phase === 'A+F' && res.ferritePct != null && <span> · δ-ferrite ≈ {res.ferritePct}% (근사)</span>}</div>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-1">전형 조성의 이 모델 판정: {examples.map((e, i) => <span key={e.label}>{i > 0 && ' · '}{e.label} → <b>{e.r.phase}</b>{e.r.phase === 'A+F' && e.r.ferritePct != null ? ` ${e.r.ferritePct}%` : ''} ({e.r.crEq.toFixed(1)}/{e.r.niEq.toFixed(1)})</span>)}</p>
      <Link href="/guide/ch12" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.11 가공성·용접성 →</Link>
    </div>
  );
}

/* H5 W13 — 계산기 ↔ 글로서리 용어 양방향 매핑. key = ?calc= 딥링크 id. */
const CALC_TERMS: Record<string, { slug: string; label: string }> = {
  kt: { slug: 'stress-concentration', label: '응력집중 (Kt)' },
  galvanic: { slug: 'galvanic', label: '갈바닉 부식' },
  buckling: { slug: 'elastic-modulus', label: '탄성계수' },
  cte: { slug: 'controlled-expansion-alloy', label: '저팽창 합금 (CTE)' },
  hardness: { slug: 'hardness', label: '경도' },
  pressure: { slug: 'tensile-stress', label: '인장응력 (후프)' },
  lmp: { slug: 'creep', label: '크리프' },
  mohr: { slug: 'tensile-stress', label: '인장·전단 응력' },
  schaeffler: { slug: 'schaeffler-diagram', label: '쉐플러 다이어그램' },
};
const CALC_IDS = Object.keys(CALC_TERMS);

/* 계산기 래퍼 — ?calc= 딥링크 앵커(scroll-mt)·하이라이트 링 + 용어 페이지 역링크. */
function CalcCard({ id, highlight, children }: { id: string; highlight: boolean; children: ReactNode }) {
  const t = CALC_TERMS[id];
  return (
    <div id={`calc-${id}`} className={`scroll-mt-24 rounded-lg transition-shadow ${highlight ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''}`}>
      {children}
      {t && (
        <Link
          href={`/guide/term/${t.slug}`}
          className="mt-1 ml-1 inline-flex items-center gap-1 text-[10.5px] text-accent/80 hover:text-accent hover:underline"
        >
          <GraduationCap className="w-3 h-3" /> 용어 설명: {t.label}
        </Link>
      )}
    </div>
  );
}

export default function Tools() {
  // H5 W13 — ?calc=<id> 딥링크: 해당 계산기로 스크롤 + 잠깐 하이라이트.
  const [highlight, setHighlight] = useState<string | null>(null);
  useEffect(() => {
    const calc = new URLSearchParams(window.location.search).get('calc');
    if (!calc || !CALC_IDS.includes(calc)) return;
    setHighlight(calc);
    // 계산기 9종(SVG 포함) 레이아웃이 안정된 뒤 스크롤 — rAF 는 이르게 발화해 위치가 어긋남.
    // behavior:'smooth' 는 prefers-reduced-motion·일부 환경에서 무시되므로 기본(auto)로 확실히 이동.
    const scroll = setTimeout(
      () => document.getElementById(`calc-${calc}`)?.scrollIntoView({ block: 'center' }),
      180,
    );
    const timer = setTimeout(() => setHighlight(null), 3000);
    return () => { clearTimeout(scroll); clearTimeout(timer); };
  }, []);
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
            상세 이론은 <Link href="/guide" className="text-accent hover:underline">Guide</Link> 참조.
          </p>
        </div>

        {/* R110 — 각 계산기 소개 + Guide 챕터 매핑 */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 mb-6 text-[12px] text-foreground/80 leading-relaxed">
          <p className="font-semibold mb-1.5">📚 계산기 9 개의 적용 영역</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li><b>Kt (응력 집중)</b> — hole/fillet/notch/groove 형상의 stress amplification. 피로 설계 핵심. <span className="text-muted-foreground">→ Guide <Link href="/guide/ch4" className="text-accent">Ch.7 보 하중</Link></span></li>
            <li><b>Galvanic</b> — 이종금속 부식. anode-cathode 전위차 (해수 계열 기준). 면적비 효과는 이 계산기에 없음. <span className="text-muted-foreground">→ Guide <Link href="/guide/ch10" className="text-accent">Ch.3 family + 환경</Link></span></li>
            <li><b>Buckling (Euler)</b> — 압축 부재 임계하중 P_cr = π²EI/(KL)². 가늘고 긴 column. <span className="text-muted-foreground">→ Guide <Link href="/guide/ch5" className="text-accent">Ch.8 비틀림·좌굴</Link></span></li>
            <li><b>CTE mismatch</b> — 이종재료 접합부 열응력. 반도체 패키지·복합재. ΔL = α × L × ΔT.</li>
            <li><b>Hardness convert</b> — HV ↔ HRC ↔ HRB ↔ HB. ASTM E140-12b 표 1·2 (비오스테나이트 강) 보간, 표 밖은 환산 안 함. 인장강도는 같은 표의 강 전용 근사열.</li>
            <li><b>Pressure vessel</b> — Thin-wall σ_hoop = pD/(2t), σ_axial = pD/(4t); t/r &gt; 0.1 이면 Lamé 두꺼운 벽 해. 코드(ASME VIII Div.1) 허용응력 방식과는 별개의 교육용 탄성식.</li>
            <li><b>Larson-Miller (LMP)</b> — Creep rupture time-temp 등가. LMP = T(C + log t). C = 20 일반.</li>
            <li><b>Mohr 원</b> — 2D 응력 상태 회전. principal stress + 면내/절대 max shear. von Mises · Tresca(=2·절대 τ_max) 평가.</li>
            <li><b>Schaeffler</b> — 스테인리스 용접 weld metal phase 예측 (Cr_eq vs Ni_eq). 직선 근사 경계 — 304(18Cr-8Ni) 는 0 % ferrite 선 바로 아래(δ-ferrite 수 %), 310 은 γ, 2205 는 A+F. <span className="text-muted-foreground">→ Detail panel 의 용접성 표시도 동일 경계식</span></li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CalcCard id="kt" highlight={highlight === 'kt'}><KtCalc /></CalcCard>
          <CalcCard id="galvanic" highlight={highlight === 'galvanic'}><GalvanicCalc /></CalcCard>
          <CalcCard id="buckling" highlight={highlight === 'buckling'}><BucklingCalc /></CalcCard>
          <CalcCard id="cte" highlight={highlight === 'cte'}><CTEMismatch /></CalcCard>
          <CalcCard id="hardness" highlight={highlight === 'hardness'}><HardnessConv /></CalcCard>
          <CalcCard id="pressure" highlight={highlight === 'pressure'}><PressureVessel /></CalcCard>
          <CalcCard id="lmp" highlight={highlight === 'lmp'}><LMPCalc /></CalcCard>
          <CalcCard id="mohr" highlight={highlight === 'mohr'}><MohrCalc /></CalcCard>
          <CalcCard id="schaeffler" highlight={highlight === 'schaeffler'}><SchaefflerCalc /></CalcCard>
        </div>

        <div className="mt-8 pt-4 border-t border-border space-y-3 text-[12px] text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground/80 mb-1">⚠ 사용 시 주의</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>모든 계산은 <b>설계 초기 단계 후보 좁히기용</b>. 실제 설계는 vendor datasheet + FEA + 시제품 시험으로 검증 필수.</li>
              <li>피로 (S-N curve, Goodman), 좌굴 (slenderness ratio λ), 압력용기 (ASME VIII Div.1 허용응력 S ≈ min(UTS/3.5, σy/1.5) · PED 등 코드별 상이) 는 표준 코드 우선 — 계산기의 SF 입력은 σy 기준 교육용 값.</li>
              <li>모델 밖 입력 (음수 조성, 판보다 큰 구멍, 절대영도 이하 온도 등) 은 결과를 계산하지 않고 입력 칸에 이유를 표시합니다. 결과 의심 시 손계산 또는 별도 코드 검증.</li>
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
              <li><b>Schaeffler</b>: AWS A3.0 · ASM Vol.6 (Welding) · Schaeffler 1949 + DeLong (N 30× austenite 보정). Ni_eq = Ni + 30C + 30N + 0.5Mn. 경계 직선식: 0 % ferrite Ni_eq = 1.125(Cr_eq − 8) · martensite 한계 Ni_eq = −0.749(Cr_eq − 31.5) (Schaeffler 도표 판독 직선식, US 7,459,034) · 100 % ferrite·α′/M+F 선은 이 앱의 근사</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
