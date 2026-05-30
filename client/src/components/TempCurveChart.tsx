/*
 * Temperature–property curve (σy / UTS vs temperature) — recharts line chart.
 * Two modes:
 *  - 'single'  : one material, two lines (Yield + UTS)
 *  - 'overlay' : many materials, one line each for a chosen field (ys|uts)
 * Data comes only from real `elevated_temp` points — nothing interpolated.
 *
 * Self-measures its container width (seeded synchronously, then ResizeObserver +
 * window resize) and renders a fixed-size LineChart — more robust than recharts'
 * ResponsiveContainer, whose ResizeObserver can stay stale in some environments.
 */
import { useEffect, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export interface TempPoint { temp: number; ys?: number | null; uts?: number | null; }
export interface TempSeries { name: string; color: string; points: TempPoint[]; }

export function TempCurveChart({
  series,
  mode = 'single',
  field = 'ys',
  height = 180,
}: {
  series: TempSeries[];
  mode?: 'single' | 'overlay';
  field?: 'ys' | 'uts';
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
  let lines: { key: string; name: string; color: string; dash?: string }[] = [];
  if (valid.length && mode === 'single') {
    const s = valid[0];
    data = s.points
      .slice()
      .sort((a, b) => a.temp - b.temp)
      .map((p) => ({ temp: p.temp, ys: p.ys ?? null, uts: p.uts ?? null }));
    lines = [
      { key: 'ys', name: 'Yield σy', color: '#0066CC' },
      { key: 'uts', name: 'UTS', color: '#dc2626', dash: '5 3' },
    ];
  } else if (valid.length) {
    const temps = Array.from(new Set(valid.flatMap((s) => s.points.map((p) => p.temp)))).sort((a, b) => a - b);
    data = temps.map((t) => {
      const row: Record<string, number | null> = { temp: t };
      valid.forEach((s, i) => {
        const pt = s.points.find((p) => p.temp === t);
        row['s' + i] = pt ? (pt[field] ?? null) : null;
      });
      return row;
    });
    lines = valid.map((s, i) => ({ key: 's' + i, name: s.name, color: s.color }));
  }

  return (
    <div ref={ref} style={{ width: '100%' }}>
      {valid.length > 0 && w > 0 && (
        <LineChart width={w} height={height} data={data} margin={{ top: 6, right: 12, bottom: 18, left: -4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="temp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 10 }}
            tickLine={false}
            label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -6, fontSize: 10, fill: '#64748b' }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            width={44}
            label={{ value: 'MPa', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: '4px 8px' }}
            formatter={((v: any, n: any) => [v == null ? '—' : `${v} MPa`, n]) as any}
            labelFormatter={((l: any) => `${l} °C`) as any}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} iconType="line" />
          {lines.map((ln) => (
            <Line
              key={ln.key}
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
