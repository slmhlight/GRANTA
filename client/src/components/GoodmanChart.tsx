/*
 * R67 Sprint C — Goodman / Soderberg fatigue diagram for Compare panel.
 * X = σ_m (mean stress) · Y = σ_a (alternating stress amplitude).
 * 각 alloy 의 Goodman line: σ_a/σ_f + σ_m/σ_u = 1.
 * 사용자 입력 점 (σ_m, σ_a) → 각 alloy 별 SF = 1 / (σ_a/σ_f + σ_m/σ_u).
 */
import { useState } from 'react';
import type { Material } from '@/lib/materials';

interface Props {
  materials: Material[];
  series?: { id: string; name: string; color: string; material: Material }[];
}

function tv(m: Material, key: string): number | null {
  const r = (m.ranges as any)?.[key];
  if (r && r.typical != null) return r.typical;
  const flat = (m as any)[key];
  return typeof flat === 'number' ? flat : null;
}

export default function GoodmanChart({ materials, series }: Props) {
  const [sigmaM, setSigmaM] = useState(100); // MPa
  const [sigmaA, setSigmaA] = useState(100); // MPa
  const [criterion, setCriterion] = useState<'goodman' | 'soderberg'>('goodman');
  const W = 520, H = 360, mL = 50, mR = 16, mT = 20, mB = 40;
  const plotW = W - mL - mR;
  const plotH = H - mT - mB;

  const list = series ? series.map(s => ({ ...s, material: s.material })) : materials.map(m => ({ id: m.id, name: m.name, color: '#0066CC', material: m }));
  const rows = list.map(s => {
    const sigmaY = tv(s.material, 'yield_strength') || 0;
    const sigmaU = tv(s.material, 'uts') || sigmaY * 1.3;
    const sigmaF = tv(s.material, 'fatigue_strength') || sigmaY * 0.45;
    const denom = criterion === 'goodman' ? sigmaU : sigmaY;
    // SF = 1 / (σa/σf + σm/denom)
    const ratio = sigmaA / sigmaF + sigmaM / denom;
    const SF = ratio > 0 ? 1 / ratio : Infinity;
    return { ...s, sigmaY, sigmaU, sigmaF, denom, SF };
  }).filter(r => r.sigmaF > 0 && r.denom > 0);

  if (rows.length === 0) return <div className="text-xs text-muted-foreground italic p-4">σy·UTS·σf 데이터가 모두 있는 alloy 가 없습니다.</div>;

  const xMax = Math.max(...rows.map(r => r.denom), sigmaM * 1.2, 100);
  const yMax = Math.max(...rows.map(r => r.sigmaF), sigmaA * 1.2, 100);
  const sx = (v: number) => mL + (v / xMax) * plotW;
  const sy = (v: number) => mT + plotH - (v / yMax) * plotH;

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground block">σ_m (평균응력) MPa</label>
          <input type="number" value={sigmaM} onChange={(e) => setSigmaM(+e.target.value || 0)} className="h-7 w-24 px-2 text-xs rounded border border-border" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground block">σ_a (응력 진폭) MPa</label>
          <input type="number" value={sigmaA} onChange={(e) => setSigmaA(+e.target.value || 0)} className="h-7 w-24 px-2 text-xs rounded border border-border" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground block">기준</label>
          <select value={criterion} onChange={(e) => setCriterion(e.target.value as any)} className="h-7 px-2 text-xs rounded border border-border">
            <option value="goodman">Goodman (σ_u 기준)</option>
            <option value="soderberg">Soderberg (σ_y 기준, 보수적)</option>
          </select>
        </div>
        <p className="text-[10px] text-muted-foreground self-center max-w-[300px]">σ_a/σ_f + σ_m/σ_{criterion === 'goodman' ? 'u' : 'y'} = 1/SF. 직선 아래 = 안전, 위 = 파괴.</p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[640px] h-auto border border-border rounded bg-card">
        {/* axes */}
        <line x1={mL} y1={H - mB} x2={W - mR} y2={H - mB} stroke="oklch(0.5 0.04 250)" />
        <line x1={mL} y1={mT} x2={mL} y2={H - mB} stroke="oklch(0.5 0.04 250)" />
        {/* gridlines + labels */}
        {[0.25, 0.5, 0.75, 1].map((g, i) => (
          <g key={i}>
            <line x1={sx(xMax * g)} y1={mT} x2={sx(xMax * g)} y2={H - mB} stroke="oklch(0.9 0.012 250)" />
            <text x={sx(xMax * g)} y={H - mB + 12} textAnchor="middle" fontSize="9" fill="oklch(0.5 0.04 250)">{(xMax * g).toFixed(0)}</text>
            <line x1={mL} y1={sy(yMax * g)} x2={W - mR} y2={sy(yMax * g)} stroke="oklch(0.9 0.012 250)" />
            <text x={mL - 4} y={sy(yMax * g) + 3} textAnchor="end" fontSize="9" fill="oklch(0.5 0.04 250)">{(yMax * g).toFixed(0)}</text>
          </g>
        ))}
        {/* Goodman lines per alloy */}
        {rows.map(r => (
          <line key={r.id} x1={sx(0)} y1={sy(r.sigmaF)} x2={sx(r.denom)} y2={sy(0)} stroke={r.color} strokeWidth="1.5" opacity="0.6" />
        ))}
        {/* Endpoint dots (σf @ x=0 and σu/σy @ y=0) */}
        {rows.map(r => (
          <g key={`pt-${r.id}`}>
            <circle cx={sx(0)} cy={sy(r.sigmaF)} r="3" fill={r.color} />
            <circle cx={sx(r.denom)} cy={sy(0)} r="3" fill={r.color} />
          </g>
        ))}
        {/* User point */}
        <circle cx={sx(sigmaM)} cy={sy(sigmaA)} r="6" fill="oklch(0.5 0.18 30)" stroke="white" strokeWidth="2" />
        <text x={sx(sigmaM) + 9} y={sy(sigmaA) + 4} fontSize="10" fill="oklch(0.4 0.18 30)" fontWeight="bold">설계점</text>
        {/* Axis titles */}
        <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">σ_m  Mean stress (MPa)</text>
        <text x={12} y={H / 2} textAnchor="middle" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold" transform={`rotate(-90 12 ${H / 2})`}>σ_a  Stress amplitude (MPa)</text>
      </svg>

      <div className="mt-3 overflow-x-auto">
        <table className="text-xs border-collapse w-full">
          <thead className="bg-muted/50"><tr><th className="text-left p-1.5 font-semibold">Alloy</th><th className="text-right p-1.5 font-semibold">σ_y</th><th className="text-right p-1.5 font-semibold">σ_u</th><th className="text-right p-1.5 font-semibold">σ_f</th><th className="text-right p-1.5 font-semibold">SF</th><th className="p-1.5 font-semibold">상태</th></tr></thead>
          <tbody>
            {rows.sort((a, b) => b.SF - a.SF).map(r => {
              const band = !isFinite(r.SF) ? 'safe' : r.SF >= 2 ? 'safe' : r.SF >= 1 ? 'caution' : 'danger';
              const color = band === 'safe' ? 'text-emerald-700' : band === 'caution' ? 'text-amber-700' : 'text-rose-700';
              const label = band === 'safe' ? '✓ 안전' : band === 'caution' ? '⚠ 경계' : '✗ 파괴';
              return (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="p-1.5"><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: r.color }} />{r.name}</td>
                  <td className="text-right p-1.5 font-mono">{r.sigmaY.toFixed(0)}</td>
                  <td className="text-right p-1.5 font-mono">{r.sigmaU.toFixed(0)}</td>
                  <td className="text-right p-1.5 font-mono">{r.sigmaF.toFixed(0)}</td>
                  <td className={`text-right p-1.5 font-mono font-bold ${color}`}>{isFinite(r.SF) ? r.SF.toFixed(2) : '∞'}</td>
                  <td className={`p-1.5 ${color}`}>{label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">σ_f 없는 alloy 는 σ_f ≈ 0.45·σy 근사 사용 (Shigley). σ_u 없으면 1.3·σy. <a href="/guide#ch2" className="text-accent hover:underline">Guide Ch.5 Basquin·Goodman →</a></p>
    </div>
  );
}
