/*
 * R20 — Creep rupture chart (log–log stress vs hours, one line per temperature).
 * Material 의 creep_rupture: Array<{temp, stress, hours}> 를 받아 온도별로 그룹화 후 그림.
 * 동일 온도의 100h / 1kh / 10kh / 100kh 데이터를 연결해 Larson-Miller 유사 곡선.
 */
import { useEffect, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export interface CreepPoint { temp: number; stress: number; hours: number; }

const TEMP_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

export function CreepRuptureChart({ points, height = 200 }: { points: CreepPoint[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.getBoundingClientRect().width);
    measure();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measure); ro.observe(el); }
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  if (!points || points.length === 0) return null;
  // 온도별 그룹화
  const byTemp = new Map<number, CreepPoint[]>();
  for (const p of points) {
    const arr = byTemp.get(p.temp) ?? [];
    arr.push(p);
    byTemp.set(p.temp, arr);
  }
  const temps = Array.from(byTemp.keys()).sort((a, b) => a - b);
  // 모든 hours 시간 정렬 후 data row 구성 (각 row 는 hours, 각 temp 의 stress)
  const allHours = Array.from(new Set(points.map((p) => p.hours))).sort((a, b) => a - b);
  const data = allHours.map((h) => {
    const row: Record<string, number | null> = { hours: h };
    for (const t of temps) {
      const pt = byTemp.get(t)?.find((p) => p.hours === h);
      row[`t${t}`] = pt ? pt.stress : null;
    }
    return row;
  });
  return (
    <div ref={ref} style={{ width: '100%' }}>
      {/* R37 — Legend top + axis label 외부 (Y 'left', X 'insideBottom' offset -2). */}
      {w > 0 && (
        <LineChart width={w} height={height} data={data} margin={{ top: 28, right: 16, bottom: 34, left: 14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="hours"
            type="number"
            scale="log"
            domain={['dataMin', 'dataMax']}
            ticks={[100, 1000, 10000, 100000]}
            tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : String(v)}
            tick={{ fontSize: 10 }}
            tickLine={false}
            label={{ value: 'Time to rupture (h, log)', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#64748b' }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            width={60}
            label={{ value: 'Stress (MPa)', angle: -90, position: 'left', offset: -2, fontSize: 10, fill: '#64748b' }}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: '4px 8px' }}
            formatter={((v: any, n: any) => [v == null ? '—' : `${v} MPa`, String(n).replace('t', '')]) as any}
            labelFormatter={((l: any) => `${l} h`) as any}
          />
          <Legend verticalAlign="top" align="right" height={22} wrapperStyle={{ fontSize: 10, paddingBottom: 4 }} iconType="line" />
          {temps.map((t, i) => (
            <Line
              key={t}
              type="monotone"
              dataKey={`t${t}`}
              name={`${t} °C`}
              stroke={TEMP_COLORS[i % TEMP_COLORS.length]}
              strokeWidth={2}
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
