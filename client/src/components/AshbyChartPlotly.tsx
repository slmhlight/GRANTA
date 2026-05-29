/*
 * AM Materials Explorer — Ashby Chart (Plotly)
 * Granta-style property chart: log-log scatter with material-class colour coding,
 * property-range ELLIPSES (min–max envelopes), an active-filter selection window,
 * auto-ranging axes that follow the current selection, and a class legend.
 */
import { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Material, ALL_NUMERIC_PROPERTIES } from '@/lib/materials';
import type { FilterState } from '@/hooks/useMaterialFilter';

interface AshbyChartPlotlyProps {
  materials: Material[];
  filteredMaterials?: Material[];
  filters?: FilterState;
  onMaterialClick?: (material: Material) => void;
  selectedId?: string | null;
}

const PROPERTY_OPTIONS = ALL_NUMERIC_PROPERTIES.map((p) => ({ value: p.key as string, label: `${p.label} (${p.unit})` }));

// numeric property → its range-filter key in FilterState (for the selection window)
const RANGE_FILTER_KEY: Record<string, keyof FilterState> = {
  density: 'densityRange', yield_strength: 'yieldStrengthRange', uts: 'utsRange',
  elongation: 'elongationRange', modulus: 'modulusRange', hardness: 'hardnessRange',
};

// Ashby material-index guide lines: constant performance-index directions on log-log axes
const INDEX_GUIDES: Record<string, { slope: number; label: string }[]> = {
  'density|modulus': [{ slope: 1, label: 'E/ρ' }, { slope: 2, label: 'E^½/ρ' }, { slope: 3, label: 'E^⅓/ρ' }],
  'density|yield_strength': [{ slope: 1, label: 'σ/ρ' }, { slope: 1.5, label: 'σ^⅔/ρ' }],
  'density|uts': [{ slope: 1, label: 'σ/ρ' }, { slope: 1.5, label: 'σ^⅔/ρ' }],
};

// coarse material class → colour (legend + ellipse colour)
const CLASSES: Array<{ key: string; color: string; test: (s: string, cat: string) => boolean }> = [
  { key: 'Polymer', color: '#16A34A', test: (_s, cat) => cat === 'Polymer' },
  { key: 'Aluminum', color: '#F59E0B', test: (s) => /alumin/.test(s) },
  { key: 'Titanium', color: '#06B6D4', test: (s) => /titan|ti6|ti-6|ti5|ti cp|ti6242|ta15/.test(s) },
  { key: 'Nickel', color: '#8B5CF6', test: (s) => /nickel|inconel|hastelloy|haynes|monel|invar|cm247|grcop|cp-nickel/.test(s) },
  { key: 'Cobalt', color: '#EC4899', test: (s) => /cobalt|cocr/.test(s) },
  { key: 'Copper', color: '#D97706', test: (s) => /copper|bronze|brass|cuni|cucr|\bcu\b/.test(s) },
  { key: 'Refractory', color: '#475569', test: (s) => /refract|tungsten|tantal|niobium|molybden|c-103/.test(s) },
  { key: 'Magnesium', color: '#0D9488', test: (s) => /magnes/.test(s) },
  { key: 'Steel', color: '#3B82F6', test: (s) => /steel|iron|maraging|stainless|aisi|aheadd|superduplex/.test(s) },
];
function classOf(m: Material): { key: string; color: string } {
  const s = `${m.subcategory || ''} ${m.name || ''}`.toLowerCase();
  for (const c of CLASSES) if (c.test(s, m.category)) return { key: c.key, color: c.color };
  return { key: 'Other', color: '#94A3B8' };
}

const tv = (m: any, p: string): number | null => (m[p] ?? m.ranges?.[p]?.typical ?? null);
const loOf = (m: any, p: string): number | null => (m.ranges?.[p]?.min ?? tv(m, p));
const hiOf = (m: any, p: string): number | null => (m.ranges?.[p]?.max ?? tv(m, p));
const L = Math.log10;
const PROP_ORDER = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];
// convex hull (Andrew's monotone chain) → real, slightly-irregular data envelope
function convexHull(pts: number[][]): number[][] {
  if (pts.length < 3) return pts;
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: number[][] = [];
  for (const pt of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop(); lower.push(pt); }
  const upper: number[][] = [];
  for (let i = p.length - 1; i >= 0; i--) { const pt = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop(); upper.push(pt); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };

export function AshbyChartPlotly({ materials, filteredMaterials, filters, onMaterialClick, selectedId }: AshbyChartPlotlyProps) {
  const [xProperty, setXProperty] = useState('yield_strength');
  const [yProperty, setYProperty] = useState('elongation');
  const [familyFilter, setFamilyFilter] = useState('all');

  const filtered = filteredMaterials || materials;
  const familyOptions = useMemo(() => {
    const s = new Set<string>();
    for (const m of materials) for (const f of ((m as any).families || [])) s.add(f);
    return ['all', ...Array.from(s).sort()];
  }, [materials]);

  const { data, layout } = useMemo(() => {
    const inFamily = (m: any) => familyFilter === 'all' || ((m.families || []) as string[]).includes(familyFilter);
    const valid = (m: any) => (tv(m, xProperty) ?? 0) > 0 && (tv(m, yProperty) ?? 0) > 0;
    const fset = filtered.filter((m) => valid(m) && inFamily(m));
    const fsetIds = new Set(fset.map((m) => m.id));
    const others = materials.filter((m) => !fsetIds.has(m.id) && valid(m));

    // markers grouped by class (colour + legend)
    const byClass = new Map<string, { color: string; ms: Material[] }>();
    for (const m of fset) {
      const c = classOf(m);
      if (!byClass.has(c.key)) byClass.set(c.key, { color: c.color, ms: [] });
      byClass.get(c.key)!.ms.push(m);
    }
    const markerTraces = Array.from(byClass.entries()).sort((a, b) => b[1].ms.length - a[1].ms.length).map(([key, { color, ms }]) => ({
      x: ms.map((m) => tv(m, xProperty)), y: ms.map((m) => tv(m, yProperty)),
      mode: 'markers', type: 'scatter', name: `${key} (${ms.length})`,
      marker: { size: 7, color, line: { color: '#ffffff', width: 0.5 }, opacity: 0.95 },
      text: ms.map((m) => m.name), customdata: ms.map((m) => m.id),
      hovertemplate: `<b>%{text}</b><br>${xProperty}: %{x:.4g}<br>${yProperty}: %{y:.4g}<extra>${key}</extra>`,
    }));

    const contextTrace = others.length ? [{
      x: others.map((m) => tv(m, xProperty)), y: others.map((m) => tv(m, yProperty)),
      mode: 'markers', type: 'scatter', name: 'filtered out',
      marker: { size: 5, color: '#cbd5e1', opacity: 0.3 },
      text: others.map((m) => m.name), customdata: others.map((m) => m.id),
      hovertemplate: `<b>%{text}</b><br>${xProperty}: %{x:.4g}<br>${yProperty}: %{y:.4g}<extra>out</extra>`,
      showlegend: false,
    }] : [];

    // property envelopes as FILLED TRACES (raw values → correct on log axes, unlike shapes),
    // grouped by class. Convex hull of real data points → irregular blob; box fallback.
    const shapes: any[] = [];
    const xi = PROP_ORDER.indexOf(xProperty), yi = PROP_ORDER.indexOf(yProperty);
    const hullByClass = new Map<string, { color: string; xs: (number | null)[]; ys: (number | null)[] }>();
    for (const m of fset) {
      const c = classOf(m);
      const raw = (((m as any).points || []) as number[][]);
      const logPairs = (xi >= 0 && yi >= 0)
        ? raw.map((t) => [t[xi], t[yi]]).filter(([x, y]) => x > 0 && y > 0).map(([x, y]) => [L(x), L(y)])
        : [];
      const uniqPts = Array.from(new Map(logPairs.map((p) => [`${p[0].toFixed(4)},${p[1].toFixed(4)}`, p])).values());
      let poly: number[][] | null = null;
      if (uniqPts.length >= 3) { const h = convexHull(uniqPts); if (h.length >= 3) poly = h.map((p) => [10 ** p[0], 10 ** p[1]]); }
      if (!poly) {
        const xl = loOf(m, xProperty)!, xh = hiOf(m, xProperty)!, yl = loOf(m, yProperty)!, yh = hiOf(m, yProperty)!;
        if (xl > 0 && yl > 0 && !(xl === xh && yl === yh)) {
          const xb = xh === xl ? xl * 1.03 : xh, yb = yh === yl ? yl * 1.03 : yh;
          poly = [[xl, yl], [xb, yl], [xb, yb], [xl, yb]];
        }
      }
      if (!poly) continue;
      if (!hullByClass.has(c.key)) hullByClass.set(c.key, { color: c.color, xs: [], ys: [] });
      const e = hullByClass.get(c.key)!;
      for (const [x, y] of poly) { e.xs.push(x); e.ys.push(y); }
      e.xs.push(poly[0][0]); e.ys.push(poly[0][1]); // close polygon
      e.xs.push(null); e.ys.push(null);             // separate from next polygon
    }
    const hullTraces = Array.from(hullByClass.values()).map((e) => ({
      x: e.xs, y: e.ys, mode: 'lines', type: 'scatter', fill: 'toself',
      fillcolor: rgba(e.color, 0.18), line: { color: e.color, width: 1, shape: 'spline', smoothing: 1 },
      hoverinfo: 'skip', showlegend: false,
    }));

    // smooth filled envelope from a set of materials' data points (spline-curved hull)
    const envFromPoints = (ms: any[], color: string, alpha: number, width: number) => {
      const pts: number[][] = [];
      for (const m of ms) for (const t of ((m.points || []) as number[][])) { const x = t[xi], y = t[yi]; if (xi >= 0 && yi >= 0 && x > 0 && y > 0) pts.push([L(x), L(y)]); }
      const uq = Array.from(new Map(pts.map((p) => [`${p[0].toFixed(4)},${p[1].toFixed(4)}`, p])).values());
      if (uq.length < 3) return null;
      const h = convexHull(uq); if (h.length < 3) return null;
      const poly = h.map((p) => [10 ** p[0], 10 ** p[1]]);
      return { x: [...poly.map((p) => p[0]), poly[0][0]], y: [...poly.map((p) => p[1]), poly[0][1]], mode: 'lines', type: 'scatter', fill: 'toself', fillcolor: rgba(color, alpha), line: { color, width, shape: 'spline', smoothing: 1.1 }, hoverinfo: 'skip', showlegend: false };
    };
    // a single smooth envelope around the whole family when one is selected
    const familyTrace = familyFilter !== 'all' ? [envFromPoints(fset, '#0EA5E9', 0.1, 2.5)].filter(Boolean) : [];
    // highlight the selected material's own envelope on top
    const selM = selectedId ? materials.find((m) => m.id === selectedId) : null;
    const selTrace = selM ? [envFromPoints([selM], classOf(selM).color, 0.32, 3)].filter(Boolean) : [];
    const envelopeTraces = familyFilter !== 'all' ? familyTrace : hullTraces;

    // auto-range to the filtered envelope (log10 units, with padding)
    const xs = fset.flatMap((m) => [loOf(m, xProperty), hiOf(m, xProperty)]).filter((v): v is number => !!v && v > 0);
    const ys = fset.flatMap((m) => [loOf(m, yProperty), hiOf(m, yProperty)]).filter((v): v is number => !!v && v > 0);
    const xRange = xs.length ? [L(Math.min(...xs)) - 0.15, L(Math.max(...xs)) + 0.15] : undefined;
    const yRange = ys.length ? [L(Math.min(...ys)) - 0.15, L(Math.max(...ys)) + 0.15] : undefined;

    // active-filter selection window (limits) for the current axes
    const fx = filters && RANGE_FILTER_KEY[xProperty] ? (filters[RANGE_FILTER_KEY[xProperty]] as [number, number] | null) : null;
    const fy = filters && RANGE_FILTER_KEY[yProperty] ? (filters[RANGE_FILTER_KEY[yProperty]] as [number, number] | null) : null;
    if (fx) for (const xv of fx) if (xv > 0) shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: L(xv), x1: L(xv), y0: 0, y1: 1, line: { color: '#0066CC', width: 1.5, dash: 'dot' } });
    if (fy) for (const yv of fy) if (yv > 0) shapes.push({ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: L(yv), y1: L(yv), line: { color: '#0066CC', width: 1.5, dash: 'dot' } });

    // material-index guide lines (Ashby): constant performance-index directions on log-log
    const guideAnnotations: any[] = [];
    const guides = INDEX_GUIDES[`${xProperty}|${yProperty}`];
    if (guides && xRange && yRange) {
      const xm = (xRange[0] + xRange[1]) / 2, ym = (yRange[0] + yRange[1]) / 2;
      for (const g of guides) {
        const yAt = (xl: number) => g.slope * (xl - xm) + ym;
        shapes.push({ type: 'line', xref: 'x', yref: 'y', x0: xRange[0], x1: xRange[1], y0: yAt(xRange[0]), y1: yAt(xRange[1]), line: { color: '#cbd5e1', width: 1, dash: 'dash' }, layer: 'below' });
        guideAnnotations.push({ x: xRange[1], y: yAt(xRange[1]), xref: 'x', yref: 'y', text: g.label, showarrow: false, font: { size: 9, color: '#94a3b8' }, xanchor: 'right', yanchor: 'bottom' });
      }
    }

    const xMeta = ALL_NUMERIC_PROPERTIES.find((p) => p.key === xProperty);
    const yMeta = ALL_NUMERIC_PROPERTIES.find((p) => p.key === yProperty);

    const layout: any = {
      autosize: true, height: 600,
      margin: { l: 72, r: 20, t: 28, b: 56 },
      xaxis: { title: { text: `${xMeta?.label ?? xProperty} (${xMeta?.unit ?? ''})`, font: { size: 12 } }, type: 'log', range: xRange, gridcolor: '#eef2f7', zeroline: false, ticks: 'outside', tickcolor: '#cbd5e1' },
      yaxis: { title: { text: `${yMeta?.label ?? yProperty} (${yMeta?.unit ?? ''})`, font: { size: 12 } }, type: 'log', range: yRange, gridcolor: '#eef2f7', zeroline: false, ticks: 'outside', tickcolor: '#cbd5e1' },
      hovermode: 'closest', shapes, annotations: guideAnnotations,
      legend: { orientation: 'h', y: 1.07, x: 0, font: { size: 11 }, bgcolor: 'rgba(255,255,255,0)' },
      paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff',
      font: { family: 'IBM Plex Sans, system-ui, sans-serif', size: 12, color: '#334155' },
    };

    return { data: [...envelopeTraces, ...contextTrace, ...markerTraces, ...selTrace], layout };
  }, [materials, filtered, xProperty, yProperty, filters, familyFilter, selectedId]);

  const config = {
    responsive: true, displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    toImageButtonOptions: { format: 'png', filename: 'ashby_chart', height: 700, width: 1000, scale: 2 },
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Axis selectors */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">X</span>
          <Select value={xProperty} onValueChange={setXProperty}>
            <SelectTrigger className="h-7 text-xs w-[210px]"><SelectValue /></SelectTrigger>
            <SelectContent>{PROPERTY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Y</span>
          <Select value={yProperty} onValueChange={setYProperty}>
            <SelectTrigger className="h-7 text-xs w-[210px]"><SelectValue /></SelectTrigger>
            <SelectContent>{PROPERTY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Family</span>
          <Select value={familyFilter} onValueChange={setFamilyFilter}>
            <SelectTrigger className="h-7 text-xs w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>{familyOptions.map((f) => <SelectItem key={f} value={f} className="text-xs">{f === 'all' ? 'All families' : f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <span className="text-[11px] text-muted-foreground ml-auto">Ellipse = min–max range · dotted box = filter limits</span>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 p-2">
        <Plot
          data={data as any}
          layout={layout as any}
          config={config as any}
          style={{ width: '100%', height: '100%' }}
          onClick={(e: any) => {
            const id = e?.points?.[0]?.customdata;
            const m = id && materials.find((x) => x.id === id);
            if (m && onMaterialClick) onMaterialClick(m);
          }}
        />
      </div>
    </div>
  );
}
