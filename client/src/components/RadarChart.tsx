/*
 * RadarChart — R53a
 *
 * 6+ 축 alloy 시각화 (SVG 직접, lib 의존 0).
 * 단일 alloy (MaterialDetail) 또는 multi-alloy overlay (Compare) 지원.
 * Normalize 4 옵션: A. Category / B. 2nd Family / C. 3rd Family / D. Compare set.
 * Focus mode: legend 에서 한 alloy 클릭 → 그것만 1.0 opacity, 나머지 0.15.
 */
import { useMemo, useState } from 'react';
import type { Material } from '@/lib/materials';

export interface RadarAxis {
  key: string;          // material property key (e.g. 'yield_strength')
  label: string;        // display label (e.g. 'σy (MPa)')
  invert?: boolean;     // true → 작을수록 점수 ↑ (density, price)
}

export type NormalizeBase = 'category' | 'family2' | 'family3' | 'set';

export interface RadarSeries {
  id: string;
  name: string;
  color: string;
  material: Material;
}

interface RadarChartProps {
  series: RadarSeries[];
  axes: RadarAxis[];
  /** Normalize base alloys — 전체 dataset (정규화 base 결정). */
  allMaterials?: Material[];
  normalizeBase: NormalizeBase;
  size?: number;
  focusedId?: string | null;
  onLegendClick?: (id: string) => void;
  /** Compare set 모드일 때 — series 자체가 base. */
  className?: string;
}

const getProp = (m: Material, key: string): number | null => {
  const r = (m.ranges as any)?.[key];
  if (r && typeof r.typical === 'number') return r.typical;
  const v = (m as any)[key];
  return typeof v === 'number' ? v : null;
};

export function RadarChart({
  series, axes, allMaterials, normalizeBase, size = 220,
  focusedId, onLegendClick, className,
}: RadarChartProps) {
  // 1. normalize base set per axis (각 alloy 의 family 기준으로 다른 base 가능)
  //    - 'set': series 자체. 모든 alloy 가 같은 base.
  //    - 'category': series[0] 의 category 안 alloys (대표 1번째 사용 — single mode 와 호환)
  //    - 'family2' (subcategory bucket): series[0] 의 subcategory family bucket
  //    - 'family3' (leaf subcategory): series[0] 의 exact subcategory
  //    multi-alloy 모드에서는 series 마다 다른 family 일 수 있으므로 'set' 모드 권장 (Compare default).
  const baseSet: Material[] = useMemo(() => {
    if (normalizeBase === 'set' || !allMaterials || series.length === 0) {
      return series.map(s => s.material);
    }
    const seed = series[0].material;
    if (normalizeBase === 'category') return allMaterials.filter(m => m.category === seed.category);
    if (normalizeBase === 'family3') return allMaterials.filter(m => m.subcategory === seed.subcategory);
    // family2 — Stainless Steel - * 같은 prefix 또는 첫 단어 매칭
    const sub = String(seed.subcategory || '');
    const prefix = sub.split(/[\s-]/).slice(0, 2).join(' ').replace(/\s+$/, '');
    return allMaterials.filter(m => {
      const ms = String(m.subcategory || '');
      return ms.startsWith(prefix.split(' ')[0]) || ms.includes(prefix);
    });
  }, [series, allMaterials, normalizeBase]);

  // 2. axis 별 min/max 계산
  const axisStats = useMemo(() => {
    const out: Record<string, { min: number; max: number }> = {};
    for (const ax of axes) {
      const vals: number[] = [];
      for (const m of baseSet) {
        const v = getProp(m, ax.key);
        if (v != null && isFinite(v) && v > 0) vals.push(v);
      }
      if (vals.length === 0) out[ax.key] = { min: 0, max: 1 };
      else out[ax.key] = { min: Math.min(...vals), max: Math.max(...vals) };
    }
    return out;
  }, [baseSet, axes]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 32; // axis label 위해 32px margin

  // 3. axis vertex 좌표
  const N = axes.length || 6;
  const vertex = (i: number, radius: number) => {
    const angle = (2 * Math.PI * i) / N - Math.PI / 2;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as [number, number];
  };

  // 4. normalize value
  const normValue = (m: Material, ax: RadarAxis): number => {
    const v = getProp(m, ax.key);
    if (v == null || !isFinite(v) || v <= 0) return 0;
    const { min, max } = axisStats[ax.key];
    if (max === min) return 0.5;
    const t = (v - min) / (max - min);
    return ax.invert ? 1 - t : t;
  };

  return (
    <div className={className} style={{ width: size }}>
      {/* Sprint1 A6 — normalize base 인디케이터 ("Base: N alloys"). single mode 만 표시. */}
      {series.length === 1 && allMaterials && (
        <div className="text-[9px] text-muted-foreground/70 mb-1 leading-tight">
          Base: <b className="text-foreground/70">{baseSet.length}</b> alloys ·{' '}
          {normalizeBase === 'category' && `Category (${series[0].material.category})`}
          {normalizeBase === 'family3' && `3rd Family (${series[0].material.subcategory})`}
          {normalizeBase === 'family2' && `2nd Family`}
          {normalizeBase === 'set' && `Compare set`}
        </div>
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        {/* Grid rings */}
        {[0.25, 0.5, 0.75, 1.0].map((g, i) => {
          const pts = axes.map((_, ai) => vertex(ai, r * g).join(',')).join(' ');
          return (
            <polygon
              key={i}
              points={pts}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={i === 3 ? 1 : 0.5}
              strokeDasharray={i === 3 ? '0' : '2 2'}
            />
          );
        })}
        {/* Axis lines */}
        {axes.map((_, i) => {
          const [x, y] = vertex(i, r);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#cbd5e1" strokeWidth={0.5} />;
        })}
        {/* Series polygons */}
        {series.map((s) => {
          const pts = axes.map((ax, i) => {
            const v = normValue(s.material, ax);
            return vertex(i, r * v).join(',');
          }).join(' ');
          const dimmed = focusedId != null && focusedId !== s.id;
          const fillOpacity = dimmed ? 0.04 : 0.25;
          const strokeOpacity = dimmed ? 0.20 : 1.0;
          return (
            <g key={s.id}>
              <polygon
                points={pts}
                fill={s.color}
                fillOpacity={fillOpacity}
                stroke={s.color}
                strokeWidth={dimmed ? 1.0 : 1.8}
                strokeOpacity={strokeOpacity}
              />
              {!dimmed && axes.map((ax, i) => {
                const v = normValue(s.material, ax);
                const [x, y] = vertex(i, r * v);
                // Sprint2 B3 — vertex circle hover tooltip (SVG title — native, lib 의존 0).
                const rawV = getProp(s.material, ax.key);
                const tooltip = `${s.name}\n${ax.label}: ${rawV != null ? rawV.toFixed(rawV < 10 ? 2 : 1) : '—'}\n정규화: ${v.toFixed(2)} / 1.00`;
                return (
                  <circle key={`${s.id}-${i}`} cx={x} cy={y} r={2.5} fill={s.color}>
                    <title>{tooltip}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}
        {/* Axis labels */}
        {axes.map((ax, i) => {
          const [x, y] = vertex(i, r + 18);
          const align = Math.abs(Math.cos((2 * Math.PI * i) / N - Math.PI / 2)) < 0.2 ? 'middle' :
            Math.cos((2 * Math.PI * i) / N - Math.PI / 2) > 0 ? 'start' : 'end';
          return (
            <text
              key={ax.key}
              x={x}
              y={y}
              fontSize={10}
              fill="#475569"
              textAnchor={align}
              dominantBaseline="middle"
            >
              {ax.label}
            </text>
          );
        })}
      </svg>
      {/* Legend (multi-alloy only) */}
      {series.length > 1 && (
        <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
          {series.map((s) => {
            const focused = focusedId === s.id;
            const dimmed = focusedId != null && !focused;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onLegendClick?.(s.id)}
                className={`w-full flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded hover:bg-muted/40 text-left ${dimmed ? 'opacity-40' : ''} ${focused ? 'bg-accent/10' : ''}`}
                title={focused ? '클릭하여 focus 해제' : '클릭하여 focus (다른 alloy 반투명)'}
              >
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                <span className="flex-1 truncate font-medium text-foreground">{s.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 기본 axis preset 6 개 ──────────────────────────────────────────────
export const DEFAULT_RADAR_AXES: RadarAxis[] = [
  { key: 'yield_strength', label: 'σy' },
  { key: 'uts', label: 'UTS' },
  { key: 'modulus', label: 'E' },
  { key: 'elongation', label: 'El.' },
  { key: 'thermal_conductivity', label: 'k' },
  { key: 'density', label: 'Light', invert: true },  // 가벼울수록 점수 ↑
];

// ── Axis 선택 옵션 (사용자가 토글 가능) ────────────────────────────────
export const RADAR_AXIS_OPTIONS: RadarAxis[] = [
  { key: 'yield_strength', label: 'σy (Yield)' },
  { key: 'uts', label: 'UTS' },
  { key: 'modulus', label: 'E (Modulus)' },
  { key: 'elongation', label: 'Elongation' },
  { key: 'hardness', label: 'Hardness' },
  { key: 'fatigue_strength', label: 'Fatigue' },
  { key: 'fracture_toughness', label: 'KIC' },
  { key: 'thermal_conductivity', label: 'k (Thermal)' },
  { key: 'max_service_temp', label: 'T_max' },
  { key: 'density', label: 'Light (1/ρ)', invert: true },
  { key: 'price_per_kg', label: 'Cheap (1/$)', invert: true },
  { key: 'thermal_expansion', label: 'Low CTE', invert: true },
  { key: 'popularity', label: 'Popularity' },
];

// ── Axis picker UI (체크박스 6+ 선택) ──────────────────────────────────
interface RadarConfigProps {
  axes: RadarAxis[];
  onAxesChange: (axes: RadarAxis[]) => void;
  normalizeBase: NormalizeBase;
  onNormalizeChange: (b: NormalizeBase) => void;
  /** Compare 모드 일 때 'set' 만 사용 — 다른 옵션 hide. */
  isCompareSet?: boolean;
}
export function RadarConfig({
  axes, onAxesChange, normalizeBase, onNormalizeChange, isCompareSet,
}: RadarConfigProps) {
  const [open, setOpen] = useState(false);
  const selectedKeys = new Set(axes.map(a => a.key));
  const toggle = (ax: RadarAxis) => {
    if (selectedKeys.has(ax.key)) {
      const next = axes.filter(a => a.key !== ax.key);
      if (next.length >= 3) onAxesChange(next);
    } else {
      if (axes.length < 8) onAxesChange([...axes, ax]);
    }
  };
  return (
    <div className="text-[10px]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground hover:bg-muted/40"
      >
        ⚙ {axes.length} 축 · {normalizeBase === 'set' ? 'Compare 내' : normalizeBase === 'category' ? '카테고리' : normalizeBase === 'family2' ? '2차 family' : '3차 family'}
      </button>
      {open && (
        <div className="mt-1 p-2 bg-card border border-border rounded space-y-2 max-w-[260px]">
          {!isCompareSet && (
            <div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Normalize</div>
              <div className="grid grid-cols-2 gap-1">
                {([
                  { v: 'category', l: 'Category' },
                  { v: 'family2', l: '2nd Family' },
                  { v: 'family3', l: '3rd Family' },
                  { v: 'set', l: '비교 셋' },
                ] as { v: NormalizeBase; l: string }[]).map(o => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => onNormalizeChange(o.v)}
                    className={`text-[10px] px-1.5 py-1 rounded border ${normalizeBase === o.v ? 'border-accent bg-accent/10 text-accent' : 'border-border text-foreground/70 hover:bg-muted/40'}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Axes (3-8)</div>
            <div className="grid grid-cols-2 gap-y-0.5 gap-x-1.5">
              {RADAR_AXIS_OPTIONS.map(opt => (
                <label key={opt.key} className="flex items-center gap-1 text-[10px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(opt.key)}
                    onChange={() => toggle(opt)}
                    className="accent-accent flex-shrink-0"
                    disabled={!selectedKeys.has(opt.key) && axes.length >= 8}
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 italic">최소 3축, 최대 8축</p>
          </div>
        </div>
      )}
    </div>
  );
}
