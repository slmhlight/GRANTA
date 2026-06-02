/*
 * Temperature–property curve (σy / UTS / E vs temperature) — recharts line chart.
 * R20: E (Young's modulus, GPa) 추가 — single mode 에서 dual Y-axis (MPa·GPa).
 * Two modes:
 *  - 'single'  : one material — Yield + UTS + E (E on right Y-axis when present)
 *  - 'overlay' : many materials, one line each for a chosen field (ys|uts|E)
 * Data comes only from real `elevated_temp` points — nothing interpolated.
 *
 * Self-measures its container width (seeded synchronously, then ResizeObserver +
 * window resize) and renders a fixed-size LineChart — more robust than recharts'
 * ResponsiveContainer, whose ResizeObserver can stay stale in some environments.
 */
import { useEffect, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export interface TempPoint { temp: number; ys?: number | null; uts?: number | null; E?: number | null; }
export interface TempSeries { name: string; color: string; points: TempPoint[]; }

export function TempCurveChart({
  series,
  mode = 'single',
  field = 'ys',
  height = 180,
}: {
  series: TempSeries[];
  mode?: 'single' | 'overlay';
  field?: 'ys' | 'uts' | 'E';
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.getBoundingClientRect().width);
    measure(); // seed immediately — don't wait for the observer
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const valid = series.filter((s) => s.points && s.points.length > 0);

  let data: Record<string, number | null>[] = [];
  let lines: { key: string; name: string; color: string; dash?: string; yAxisId?: 'left' | 'right' }[] = [];
  let hasEData = false;
  if (valid.length && mode === 'single') {
    const s = valid[0];
    data = s.points
      .slice()
      .sort((a, b) => a.temp - b.temp)
      .map((p) => ({ temp: p.temp, ys: p.ys ?? null, uts: p.uts ?? null, E: p.E ?? null }));
    hasEData = data.some((d) => d.E != null);
    lines = [
      { key: 'ys', name: 'Yield σy (MPa)', color: '#0066CC', yAxisId: 'left' },
      { key: 'uts', name: 'UTS (MPa)', color: '#dc2626', dash: '5 3', yAxisId: 'left' },
    ];
    if (hasEData) lines.push({ key: 'E', name: 'E (GPa)', color: '#16a34a', dash: '2 4', yAxisId: 'right' });
  } else if (valid.length) {
    const temps = Array.from(new Set(valid.flatMap((s) => s.points.map((p) => p.temp)))).sort((a, b) => a - b);
    data = temps.map((t) => {
      const row: Record<string, number | null> = { temp: t };
      valid.forEach((s, i) => {
        const pt = s.points.find((p) => p.temp === t);
        row['s' + i] = pt ? ((pt as any)[field] ?? null) : null;
      });
      return row;
    });
    lines = valid.map((s, i) => ({ key: 's' + i, name: s.name, color: s.color, yAxisId: 'left' as const }));
  }

  return (
    <div ref={ref} style={{ width: '100%' }}>
      {/* R37 — margin 확보 (top: Legend 자리 / bottom: X 라벨 / left·right: Y 라벨).
                 Legend 를 chart 상단으로 올려 X 축과 겹침 제거. axis label 도 외부 (left/right) 로. */}
      {valid.length > 0 && w > 0 && (
        <LineChart width={w} height={height} data={data} margin={{ top: 28, right: hasEData ? 56 : 16, bottom: 30, left: 14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="temp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 10 }}
            tickLine={false}
            label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#64748b' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10 }}
            tickLine={false}
            width={52}
            label={{ value: 'MPa', angle: -90, position: 'left', offset: -2, fontSize: 10, fill: '#64748b' }}
          />
          {hasEData && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: '#16a34a' }}
              tickLine={false}
              width={48}
              label={{ value: 'GPa', angle: 90, position: 'right', offset: -2, fontSize: 10, fill: '#16a34a' }}
            />
          )}
          <Tooltip
            contentStyle={{ fontSize: 11, padding: '4px 8px' }}
            formatter={((v: any, n: any) => [v == null ? '—' : `${v}${String(n).includes('GPa') ? ' GPa' : ' MPa'}`, n]) as any}
            labelFormatter={((l: any) => `${l} °C`) as any}
          />
          <Legend verticalAlign="top" align="right" height={22} wrapperStyle={{ fontSize: 10, paddingBottom: 4, paddingTop: 0 }} iconType="line" />
          {lines.map((ln) => (
            <Line
              key={ln.key}
              yAxisId={ln.yAxisId ?? 'left'}
              type="monotone"
              dataKey={ln.key}
              name={ln.name}
              stroke={ln.color}
              strokeWidth={2}
              strokeDasharray={ln.dash}
              dot={{ r: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      )}
    </div>
  );
}
