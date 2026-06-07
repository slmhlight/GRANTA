/*
 * R157b — CompositionDonut: SVG donut chart for chemical composition.
 * MaterialDetail.tsx 의 inline 정의에서 추출. Behavior identical.
 */
import type { CompSlice } from './composition';

/** SVG donut. center 에 dominant element 강조. hover title 로 wt% / share % 표시. */
export function CompositionDonut({ slices }: { slices: CompSlice[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total <= 0 || slices.length === 0) return null;
  const cx = 100, cy = 100, R = 78, r = 48;
  let acc = 0;
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" className="block" role="img" aria-label="composition donut">
      {slices.map((d) => {
        const frac = d.value / total;
        const a0 = (acc / total) * 2 * Math.PI - Math.PI / 2; acc += d.value;
        const a1 = (acc / total) * 2 * Math.PI - Math.PI / 2;
        const large = frac > 0.5 ? 1 : 0;
        // 100% 단일 원소 시 path 가 닫히지 않는 문제 → 두 개의 반-arc 로 분할 (a0 .. a0+π .. a1).
        if (frac > 0.999) {
          return (
            <g key={d.element}>
              <title>{`${d.element}: ${d.value.toFixed(2)} wt% (100%)`}</title>
              <circle cx={cx} cy={cy} r={R} fill={d.color} stroke="white" strokeWidth="1" />
              <circle cx={cx} cy={cy} r={r} fill="white" />
            </g>
          );
        }
        const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
        const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        const xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
        const xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
        const path = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi0} ${yi0} Z`;
        return (
          <g key={d.element}>
            <title>{`${d.element}: ${d.value.toFixed(2)} wt% (${(frac * 100).toFixed(1)}%${d.isBalance ? ', balance' : ''})`}</title>
            <path d={path} fill={d.color} stroke="white" strokeWidth="1" />
          </g>
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: 14, fontWeight: 700 }}>{slices[0].element}</text>
      <text x={cx} y={cy + 11} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>{((slices[0].value / total) * 100).toFixed(1)}%</text>
    </svg>
  );
}
