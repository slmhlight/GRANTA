/*
 * R67 Sprint B — Engineering Tools.
 * 9 계산기 — Kt / Galvanic / Buckling / CTE mismatch / Hardness / Pressure vessel / Larson-Miller / Mohr / Schaeffler.
 * 각 카드 = 입력 + 결과 + Guide 챕터 link. 수식은 lib/engineering-calcs.ts (R210 B7).
 */
import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Calculator, Zap, BookOpen } from 'lucide-react';
// R210 B7 — 계산기 수식은 lib/engineering-calcs.ts 순수 함수에서 (테스트 가능). UI 는 그대로.
import {
  ktFactor, galvanicDeltaV, galvanicBand, buckling, thermalMismatchStress,
  hardnessConvert, pressureVesselThickness, larsonMiller, larsonMillerInverseTime,
  mohrCircle, schaefflerEq,
} from '@/lib/engineering-calcs';

const W = 'rounded-lg border border-border bg-card p-4';
const In = 'h-7 px-2 text-[12px] rounded border border-border bg-background focus:outline-none focus:border-accent';
const Lab = 'text-[11px] font-semibold text-muted-foreground block mb-1';

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
  const [shape, setShape] = useState<'hole' | 'fillet' | 'sharpCorner' | 'shoulderCut'>('hole');
  const [d, setD] = useState(10);
  const [w, setW] = useState(40);
  const [r, setR] = useState(2);
  // 근사식 (Pilkey - Peterson's Stress Concentration Factors) — lib/engineering-calcs.
  const kt = ktFactor(shape, { d, w, r });
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
      <Link href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 노치·좌굴 →</Link>
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
  const anode = va < vb ? a : b;
  const band = galvanicBand(diff);
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
      <Link href="/guide#ch10" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.3 환경별 합금 →</Link>
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
  const { slenderness: slender, lambdaC, isEuler, Pcr } = buckling({ L, d, E, sy, K });
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
      <Link href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 좌굴 이론 →</Link>
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
  const sigma = thermalMismatchStress(cteA, cteB, dT, E);
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
      <Link href="/guide#ch11" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.9 #9 CTE mismatch →</Link>
    </div>
  );
}

/* ───────── #7 Hardness conversion (HV ↔ HRC ↔ HB ↔ UTS) ───────── */
function HardnessConv() {
  const [scale, setScale] = useState<'HV' | 'HRC' | 'HB'>('HV');
  const [val, setVal] = useState(300);
  // ASTM E140/A370 근사 (탄소·합금강) — lib/engineering-calcs.
  const { HV, HRC, HB, UTS } = hardnessConvert(scale, val);
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
      <Link href="/guide#ch1" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.4 물성 사전 →</Link>
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
  // 얇은 벽 가정 — lib/engineering-calcs. t/r>0.1 이면 두꺼운 벽(Lame) 경고.
  const { t, thick } = pressureVesselThickness({ p, r, sy, SF, shape });
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
      <Link href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 압력용기 →</Link>
    </div>
  );
}

/* ───────── #H1 Larson-Miller parameter (creep lifetime) ───────── */
function LMPCalc() {
  const [T, setT] = useState(600);   // °C
  const [t, setT_h] = useState(1000); // h
  const [C, setC] = useState(20);
  // Larson-Miller — lib/engineering-calcs. LMP = T(K)·(C+log₁₀ t)/1000.
  const LMP = larsonMiller(T, t, C);
  const [T2, setT2] = useState(650);
  // 같은 LMP 에서 T₂ 의 파단 시간 역산.
  const t2 = larsonMillerInverseTime(LMP, T2, C);
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
      <Link href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.10 LMP →</Link>
    </div>
  );
}

/* ───────── #H2 Mohr's circle ───────── */
function MohrCalc() {
  const [sx, setSx] = useState(100);
  const [sy, setSy] = useState(40);
  const [txy, setTxy] = useState(30);
  // Mohr's circle — lib/engineering-calcs.
  const { center, R, s1, s2, tauMax: tmax, angleDeg: angle } = mohrCircle(sx, sy, txy);
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
        <div><label className={Lab}>σ_x (MPa)</label><input type="number" className={In + ' w-full'} value={sx} onChange={(e) => setSx(+e.target.value || 0)} /></div>
        <div><label className={Lab}>σ_y (MPa)</label><input type="number" className={In + ' w-full'} value={sy} onChange={(e) => setSy(+e.target.value || 0)} /></div>
        <div><label className={Lab}>τ_xy (MPa)</label><input type="number" className={In + ' w-full'} value={txy} onChange={(e) => setTxy(+e.target.value || 0)} /></div>
      </div>
      <div className="rounded bg-muted/30 p-2 text-sm font-mono space-y-0.5">
        <div>σ₁ = <b>{s1.toFixed(1)}</b> · σ₂ = <b>{s2.toFixed(1)}</b> MPa</div>
        <div>τ_max = <b>{tmax.toFixed(1)}</b> MPa · 회전각 = <b>{angle.toFixed(1)}°</b></div>
        <div className="text-emerald-700 mt-1 pt-1 border-t border-border/30">von Mises σ_eq = √(σ₁² − σ₁σ₂ + σ₂²) ≈ <b>{Math.sqrt(s1*s1 - s1*s2 + s2*s2).toFixed(1)}</b> MPa</div>
      </div>
      <Link href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 Mohr·복합응력 →</Link>
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
  // Schaeffler/DeLong — lib/engineering-calcs (welding-machinability 와 동일 식).
  const { crEq: Cr_eq, niEq: Ni_eq, phase } = schaefflerEq({ Cr, Ni, Mo, Si, Nb, C, N, Mn });
  // SVG positions: Cr_eq x-axis (0–40), Ni_eq y-axis (0–32)
  // R141a (개정) — 가시성 대폭 ↑: hex 색상 + strokeWidth 3-4 + white halo around lines + 큰 라벨
  const sw = 320, sh = 240;
  const PAD_L = 38, PAD_R = 12, PAD_T = 30, PAD_B = 38;
  const X = (v: number) => PAD_L + (v / 40) * (sw - PAD_L - PAD_R);
  const Y = (v: number) => sh - PAD_B - (v / 32) * (sh - PAD_T - PAD_B);
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Schaeffler diagram (stainless 미세조직)</p>
      <p className="text-[11px] text-muted-foreground mb-3">Cr-eq / Ni-eq 로 austenite·ferrite·martensite·duplex 영역 예측. 용접부 미세조직 추정.</p>
      <svg viewBox={`0 0 ${sw} ${sh}`} className="w-full h-60 mb-2 border border-border rounded bg-white">
        {/* === R141a 개정 — 명확한 phase boundary + 매우 옅은 zone tint === */}
        {/* 1) Zone tint: 매우 옅게 (opacity 0.18) — 라인 가시성 우선 */}
        <polygon points={`${X(0)},${Y(32)} ${X(0)},${Y(15)} ${X(10)},${Y(15)} ${X(34)},${Y(32)}`} fill="#3b82f6" opacity="0.12" />
        <polygon points={`${X(0)},${Y(15)} ${X(10)},${Y(15)} ${X(18)},${Y(0)} ${X(0)},${Y(0)}`} fill="#f59e0b" opacity="0.14" />
        <polygon points={`${X(18)},${Y(0)} ${X(40)},${Y(0)} ${X(40)},${Y(8)} ${X(28)},${Y(8)}`} fill="#ef4444" opacity="0.12" />
        <polygon points={`${X(10)},${Y(15)} ${X(34)},${Y(32)} ${X(40)},${Y(32)} ${X(40)},${Y(8)} ${X(28)},${Y(8)} ${X(18)},${Y(0)}`} fill="#10b981" opacity="0.10" />

        {/* 2) Grid (옅게) */}
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

        {/* 3) Axes (진하게) */}
        <line x1={X(0)} y1={Y(0)} x2={X(40)} y2={Y(0)} stroke="#1e293b" strokeWidth="2" />
        <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(32)} stroke="#1e293b" strokeWidth="2" />

        {/* 4) === 핵심: PHASE BOUNDARY LINES — 매우 굵게 + 흰색 halo === */}
        {/* Halo (white shadow underneath) */}
        <line x1={X(10)} y1={Y(15)} x2={X(34)} y2={Y(32)} stroke="white" strokeWidth="7" />
        <line x1={X(18)} y1={Y(0)} x2={X(40)} y2={Y(8)} stroke="white" strokeWidth="7" />
        <path d={`M ${X(0)} ${Y(8)} Q ${X(9)} ${Y(5)} ${X(18)} ${Y(0)}`} fill="none" stroke="white" strokeWidth="7" />

        {/* Main boundary lines (진한 색상 + 굵게) */}
        {/* (a) 0% ferrite line: γ Austenite ↔ A+F Duplex */}
        <line x1={X(10)} y1={Y(15)} x2={X(34)} y2={Y(32)} stroke="#1d4ed8" strokeWidth="3.5" strokeLinecap="round" />
        {/* (b) 100% ferrite line: A+F ↔ α Ferrite */}
        <line x1={X(18)} y1={Y(0)} x2={X(40)} y2={Y(8)} stroke="#b91c1c" strokeWidth="3.5" strokeLinecap="round" />
        {/* (c) Ms = RT line: α' Martensite ↔ A+F Duplex */}
        <path d={`M ${X(0)} ${Y(8)} Q ${X(9)} ${Y(5)} ${X(18)} ${Y(0)}`} fill="none" stroke="#c2410c" strokeWidth="3.5" strokeLinecap="round" />

        {/* 5) Iso-ferrite 보조선 (5%·20%·80%) */}
        <line x1={X(13)} y1={Y(15)} x2={X(36)} y2={Y(30)} stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.65" />
        <line x1={X(15)} y1={Y(11)} x2={X(38)} y2={Y(25)} stroke="#60a5fa" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.5" />

        {/* 6) Boundary labels (흰색 배경 + 진한 글자) */}
        <g>
          <rect x={X(22)-30} y={Y(25)-7} width="60" height="13" fill="white" fillOpacity="0.92" rx="2" stroke="#1d4ed8" strokeWidth="0.5" />
          <text x={X(22)} y={Y(25)+3} textAnchor="middle" fontSize="10" fill="#1d4ed8" fontWeight="bold">0 % ferrite</text>
        </g>
        <g>
          <rect x={X(30)-35} y={Y(4)-7} width="70" height="13" fill="white" fillOpacity="0.92" rx="2" stroke="#b91c1c" strokeWidth="0.5" />
          <text x={X(30)} y={Y(4)+3} textAnchor="middle" fontSize="10" fill="#b91c1c" fontWeight="bold">100 % ferrite</text>
        </g>
        <g>
          <rect x={X(9)-25} y={Y(3.5)-7} width="50" height="13" fill="white" fillOpacity="0.92" rx="2" stroke="#c2410c" strokeWidth="0.5" />
          <text x={X(9)} y={Y(3.5)+3} textAnchor="middle" fontSize="10" fill="#c2410c" fontWeight="bold">Ms = RT</text>
        </g>

        {/* 7) Phase zone labels (큰 글씨 + 흰 outline) */}
        <text x={X(5)} y={Y(28)} fontSize="13" fontWeight="bold" fill="#1e3a8a" stroke="white" strokeWidth="3" paintOrder="stroke">γ Austenite</text>
        <text x={X(34)} y={Y(2.5)} fontSize="13" fontWeight="bold" fill="#7f1d1d" stroke="white" strokeWidth="3" paintOrder="stroke" textAnchor="middle">α Ferrite</text>
        <text x={X(5)} y={Y(2.5)} fontSize="13" fontWeight="bold" fill="#7c2d12" stroke="white" strokeWidth="3" paintOrder="stroke">α′ Martensite</text>
        <text x={X(25)} y={Y(18)} fontSize="13" fontWeight="bold" fill="#064e3b" stroke="white" strokeWidth="3" paintOrder="stroke" textAnchor="middle">A + F</text>
        <text x={X(25)} y={Y(15.5)} fontSize="10" fontStyle="italic" fill="#065f46" stroke="white" strokeWidth="3" paintOrder="stroke" textAnchor="middle">(Duplex)</text>

        {/* 8) User point — 매우 눈에 띄게 */}
        <circle cx={X(Cr_eq)} cy={Y(Ni_eq)} r="9" fill="white" stroke="#dc2626" strokeWidth="3" />
        <circle cx={X(Cr_eq)} cy={Y(Ni_eq)} r="5" fill="#dc2626" />
        <text x={X(Cr_eq) + 12} y={Y(Ni_eq) - 5} fontSize="11" fontWeight="bold" fill="#7f1d1d" stroke="white" strokeWidth="3" paintOrder="stroke">현재 조성</text>

        {/* 9) Axis labels */}
        <text x={(X(0) + X(40)) / 2} y={sh - 6} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e293b">Cr-eq = Cr + Mo + 1.5 Si + 0.5 Nb  (%)</text>
        <text x={4} y={16} fontSize="11" fontWeight="bold" fill="#1e293b">Ni-eq (%)</text>
        <text x={4} y={28} fontSize="9" fill="#64748b">= Ni + 30C + 30N + 0.5Mn</text>
      </svg>
      <p className="text-[10px] text-muted-foreground -mt-1 mb-1 leading-tight">
        <span className="inline-block w-3 h-0.5 bg-[#1d4ed8] align-middle mr-1"/> 0% ferrite (γ↔A+F)  ·
        <span className="inline-block w-3 h-0.5 bg-[#b91c1c] align-middle mx-1"/> 100% ferrite (A+F↔α)  ·
        <span className="inline-block w-3 h-0.5 bg-[#c2410c] align-middle mx-1"/> Ms=RT (γ↔α′)
      </p>
      <div className="grid grid-cols-3 gap-1 mb-2 text-[11px]">
        {/* R209 A-12 — Cu 입력 제거 (Schaeffler/DeLong Ni_eq 에 미포함 → 입력해도 무시되던 혼란 제거) */}
        {[{l:'Cr', v:Cr, s:setCr}, {l:'Ni', v:Ni, s:setNi}, {l:'Mo', v:Mo, s:setMo}, {l:'Si', v:Si, s:setSi}, {l:'Nb', v:Nb, s:setNb}, {l:'C', v:C, s:setC}, {l:'N', v:N, s:setN}, {l:'Mn', v:Mn, s:setMn}].map(f => (
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
      <Link href="/guide#ch12" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.11 가공성·용접성 →</Link>
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
            상세 이론은 <Link href="/guide" className="text-accent hover:underline">Guide</Link> 참조.
          </p>
        </div>

        {/* R110 — 각 계산기 소개 + Guide 챕터 매핑 */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 mb-6 text-[12px] text-foreground/80 leading-relaxed">
          <p className="font-semibold mb-1.5">📚 계산기 9 개의 적용 영역</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li><b>Kt (응력 집중)</b> — hole/fillet/notch/groove 형상의 stress amplification. 피로 설계 핵심. <span className="text-muted-foreground">→ Guide <Link href="/guide#ch4" className="text-accent">Ch.7 보 하중</Link></span></li>
            <li><b>Galvanic</b> — 이종금속 부식. anode-cathode 전위차 + 면적비. 해양·외기 환경. <span className="text-muted-foreground">→ Guide <Link href="/guide#ch10" className="text-accent">Ch.3 family + 환경</Link></span></li>
            <li><b>Buckling (Euler)</b> — 압축 부재 임계하중 P_cr = π²EI/(KL)². 가늘고 긴 column. <span className="text-muted-foreground">→ Guide <Link href="/guide#ch5" className="text-accent">Ch.8 비틀림·좌굴</Link></span></li>
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
              <li><b>Schaeffler</b>: AWS A3.0 · ASM Vol.6 (Welding) · Schaeffler 1949 + DeLong (N 30× austenite 보정). Ni_eq = Ni + 30C + 30N + 0.5Mn</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
