/*
 * AM Materials Explorer — Scatter Plot Chart
 * Scientific Precision Design System
 * Interactive property-vs-property scatter plot with Recharts
 */

import { useState, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Material } from '@/lib/materials';
import { ALL_NUMERIC_PROPERTIES, CATEGORY_COLORS, SUBCATEGORY_COLORS } from '@/lib/materials';

interface ScatterChartViewProps {
  materials: Material[];
  onSelect: (m: Material) => void;
}

const PROPERTY_OPTIONS = ALL_NUMERIC_PROPERTIES.map(p => ({
  value: p.key as string,
  label: `${p.label} (${p.unit})`,
}));

const CATEGORY_DOT_COLORS: Record<string, string> = {
  Metal: '#00A3E0',
  Polymer: '#22C55E',
};

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: Material;
  onSelect?: (m: Material) => void;
}

function CustomDot({ cx = 0, cy = 0, payload, onSelect }: CustomDotProps) {
  if (!payload) return null;
  const color = CATEGORY_DOT_COLORS[payload.category] ?? '#6B7280';
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={color}
      fillOpacity={0.7}
      stroke={color}
      strokeWidth={0.5}
      style={{ cursor: 'pointer', transition: 'r 150ms ease-out' }}
      onClick={() => onSelect?.(payload)}
      onMouseEnter={e => { (e.target as SVGCircleElement).setAttribute('r', '6'); }}
      onMouseLeave={e => { (e.target as SVGCircleElement).setAttribute('r', '4'); }}
    />
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: Material }>;
  xProp: string;
  yProp: string;
  xLabel: string;
  yLabel: string;
}

function CustomTooltip({ active, payload, xProp, yProp, xLabel, yLabel }: TooltipProps) {
  if (!active || !payload || !payload[0]) return null;
  const m = payload[0].payload;
  return (
    <div className="chart-tooltip max-w-[220px]">
      <p className="font-semibold text-[11px] mb-1 text-white/90 truncate">{m.name}</p>
      <p className="text-[10px] text-white/60 mb-1.5">{m.subcategory}</p>
      <div className="space-y-0.5">
        <p className="text-[11px]">
          <span className="text-white/60">{xLabel}: </span>
          <span className="font-mono">{(m as any)[xProp]?.toFixed(2) ?? '—'}</span>
        </p>
        <p className="text-[11px]">
          <span className="text-white/60">{yLabel}: </span>
          <span className="font-mono">{(m as any)[yProp]?.toFixed(2) ?? '—'}</span>
        </p>
      </div>
    </div>
  );
}

// ── Unique tick generator (prevents duplicate key bug in Recharts) ──────────
function getLinearTicks(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = range / 5;
  const ticks: number[] = [];
  for (let i = 0; i <= 5; i++) ticks.push(min + step * i);
  const seen = new Set<string>();
  return ticks.filter(t => {
    const key = t.toPrecision(6);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ScatterChartView({ materials, onSelect }: ScatterChartViewProps) {
  const [xProp, setXProp] = useState('density');
  const [yProp, setYProp] = useState('yield_strength');
  const [colorBy, setColorBy] = useState<'category' | 'subcategory'>('category');

  const xMeta = ALL_NUMERIC_PROPERTIES.find(p => p.key === xProp);
  const yMeta = ALL_NUMERIC_PROPERTIES.find(p => p.key === yProp);

  // Group data by category for separate Scatter series
  const grouped = useMemo(() => {
    const filtered = materials.filter(m => {
      const x = (m as any)[xProp];
      const y = (m as any)[yProp];
      return x !== null && x !== undefined && x > 0 && y !== null && y !== undefined && y > 0;
    });

    const groups: Record<string, Material[]> = {};
    filtered.forEach(m => {
      const key = colorBy === 'category' ? m.category : m.subcategory;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [materials, xProp, yProp, colorBy]);

  const groupEntries = Object.entries(grouped);

  // Compute unique ticks to avoid Recharts duplicate key bug
  const allX = groupEntries.flatMap(([, data]) => data.map(m => (m as any)[xProp] as number)).filter(v => typeof v === 'number' && isFinite(v));
  const allY = groupEntries.flatMap(([, data]) => data.map(m => (m as any)[yProp] as number)).filter(v => typeof v === 'number' && isFinite(v));
  const xTicks = getLinearTicks(allX);
  const yTicks = getLinearTicks(allY);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">X axis:</span>
          <Select value={xProp} onValueChange={setXProp}>
            <SelectTrigger className="h-7 text-xs w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Y axis:</span>
          <Select value={yProp} onValueChange={setYProp}>
            <SelectTrigger className="h-7 text-xs w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Color by:</span>
          <Select value={colorBy} onValueChange={v => setColorBy(v as any)}>
            <SelectTrigger className="h-7 text-xs w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category" className="text-xs">Category</SelectItem>
              <SelectItem value="subcategory" className="text-xs">Material Family</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono ml-auto">
          {materials.length.toLocaleString()} points
        </span>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.012 250)" strokeOpacity={0.5} />
            <XAxis
              dataKey={xProp}
              type="number"
              name={xMeta?.label}
              ticks={xTicks}
              label={{
                value: `${xMeta?.label ?? xProp} (${xMeta?.unit ?? ''})`,
                position: 'insideBottom',
                offset: -15,
                style: { fontSize: 11, fill: 'oklch(0.48 0.04 250)' },
              }}
              tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={{ stroke: 'oklch(0.88 0.012 250)' }}
            />
            <YAxis
              dataKey={yProp}
              type="number"
              name={yMeta?.label}
              ticks={yTicks}
              label={{
                value: `${yMeta?.label ?? yProp} (${yMeta?.unit ?? ''})`,
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                style: { fontSize: 11, fill: 'oklch(0.48 0.04 250)' },
              }}
              tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={{ stroke: 'oklch(0.88 0.012 250)' }}
            />
            <Tooltip
              content={
                <CustomTooltip
                  xProp={xProp}
                  yProp={yProp}
                  xLabel={xMeta?.label ?? xProp}
                  yLabel={yMeta?.label ?? yProp}
                />
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => <span style={{ color: 'oklch(0.48 0.04 250)', fontSize: 11 }}>{value}</span>}
            />
            {groupEntries.map(([groupName, data], idx) => {
              const color = colorBy === 'category'
                ? (CATEGORY_DOT_COLORS[groupName] ?? `hsl(${idx * 47}, 60%, 55%)`)
                : `hsl(${(idx * 37) % 360}, 60%, 55%)`;
              return (
                <Scatter
                  key={groupName}
                  name={groupName}
                  data={data}
                  fill={color}
                  fillOpacity={0.65}
                  shape={<CustomDot onSelect={onSelect} />}
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
