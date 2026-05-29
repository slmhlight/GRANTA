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
}

const PROPERTY_OPTIONS = ALL_NUMERIC_PROPERTIES.map((p) => ({ value: p.key as string, label: `${p.label} (${p.unit})` }));

// numeric property → its range-filter key in FilterState (for the selection window)
const RANGE_FILTER_KEY: Record<string, keyof FilterState> = {
  density: 'densityRange', yield_strength: 'yieldStrengthRange', uts: 'utsRange',
  elongation: 'elongationRange', modulus: 'modulusRange', hardness: 'hardnessRange',
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

export function AshbyChartPlotly({ materials, filteredMaterials, filters, onMaterialClick }: AshbyChartPlotlyProps) {
  const [xProperty, setXProperty] = useState('density');
  const [yProperty, setYProperty] = useState('yield_strength');

  const filtered = filteredMaterials || materials;

  const { data, layout } = useMemo(() => {
    const filteredIds = new Set(filtered.map((m) => m.id));
    const valid = (m: any) => (tv(m, xProperty) ?? 0) > 0 && (tv(m, yProperty) ?? 0) > 0;
    const fset = filtered.filter(valid);
    const others = materials.filter((m) => !filteredIds.has(m.id) && valid(m));

    // markers grouped by class (colour + legend)
    const byClass = new Map<string, { color: string; ms: Material[] }>();
    for (const m of fset) {
      const c = classOf(m);
      if (!byClass.has(c.key)) byClass.set(c.key, { color: c.color, ms: [] });
      byClass.get(c.key)!.ms.push(m);
    }
    const markerTraces = Array.from(byClass.entries()).sort((a, b) => b[1].ms.length - a[1].ms.length).map(([key, { color, ms }]) => ({
      x: ms.map((m) => tv(m, xProperty)), y: ms.map((m) => tv(m, yProperty)),
      mode: 'markers', type: 'scattergl', name: `${key} (${ms.length})`,
      marker: { size: 7, color, line: { color: '#ffffff', width: 0.5 }, opacity: 0.95 },
      text: ms.map((m) => m.name), customdata: ms.map((m) => m.id),
      hovertemplate: `<b>%{text}</b><br>${xProperty}: %{x:.4g}<br>${yProperty}: %{y:.4g}<extra>${key}</extra>`,
    }));

    const contextTrace = others.length ? [{
      x: others.map((m) => tv(m, xProperty)), y: others.map((m) => tv(m, yProperty)),
      mode: 'markers', type: 'scattergl', name: 'filtered out',
      marker: { size: 5, color: '#cbd5e1', opacity: 0.3 },
      text: others.map((m) => m.name), customdata: others.map((m) => m.id),
      hovertemplate: `<b>%{text}</b><br>${xProperty}: %{x:.4g}<br>${yProperty}: %{y:.4g}<extra>out</extra>`,
      showlegend: false,
    }] : [];

    // property-range ellipses for the filtered set (skip when too many → clutter/perf)
    const shapes: any[] = [];
    if (fset.length <= 160) {
      for (const m of fset) {
        const xl = loOf(m, xProperty)!, xh = hiOf(m, xProperty)!, yl = loOf(m, yProperty)!, yh = hiOf(m, yProperty)!;
        if (!(xl > 0 && yl > 0)) continue;
        if (xh === xl && yh === yl) continue; // single point — marker is enough
        const c = classOf(m);
        // pad degenerate axis slightly so the envelope is visible
        const xpad = xh === xl ? 0.012 : 0, ypad = yh === yl ? 0.012 : 0;
        shapes.push({
          type: 'circle', xref: 'x', yref: 'y',
          x0: L(xl) - xpad, x1: L(xh) + xpad, y0: L(yl) - ypad, y1: L(yh) + ypad,
          line: { color: c.color, width: 1 }, fillcolor: c.color, opacity: 0.1, layer: 'below',
        });
      }
    }

    // auto-range to the filtered envelope (log10 units, with padding)
    const xs = fset.flatMap((m) => [loOf(m, xProperty), hiOf(m, xProperty)]).filter((v): v is number => !!v && v > 0);
    const ys = fset.flatMap((m) => [loOf(m, yProperty), hiOf(m, yProperty)]).filter((v): v is number => !!v && v > 0);
    const xRange = xs.length ? [L(Math.min(...xs)) - 0.15, L(Math.max(...xs)) + 0.15] : undefined;
    const yRange = ys.length ? [L(Math.min(...ys)) - 0.15, L(Math.max(...ys)) + 0.15] : undefined;

    // active-filter selection window (limits) for the current axes
    const fx = filters && RANGE_FILTER_KEY[xProperty] ? (filters[RANGE_FILTER_KEY[xProperty]] as [number, number] | null) : null;
    const fy = filters && RANGE_FILTER_KEY[yProperty] ? (filters[RANGE_FILTER_KEY[yProperty]] as [number, number] | null) : null;
    if (fx || fy) {
      const x0 = fx ? L(fx[0]) : xRange?.[0] ?? (xs.length ? L(Math.min(...xs)) : 0);
      const x1 = fx ? L(fx[1]) : xRange?.[1] ?? (xs.length ? L(Math.max(...xs)) : 1);
      const y0 = fy ? L(fy[0]) : yRange?.[0] ?? (ys.length ? L(Math.min(...ys)) : 0);
      const y1 = fy ? L(fy[1]) : yRange?.[1] ?? (ys.length ? L(Math.max(...ys)) : 1);
      shapes.push({
        type: 'rect', xref: 'x', yref: 'y', x0, x1, y0, y1,
        line: { color: '#0066CC', width: 1.5, dash: 'dot' }, fillcolor: '#0066CC', opacity: 0.06, layer: 'below',
      });
    }

    const xMeta = ALL_NUMERIC_PROPERTIES.find((p) => p.key === xProperty);
    const yMeta = ALL_NUMERIC_PROPERTIES.find((p) => p.key === yProperty);

    const layout: any = {
      autosize: true, height: 600,
      margin: { l: 72, r: 20, t: 28, b: 56 },
      xaxis: { title: { text: `${xMeta?.label ?? xProperty} (${xMeta?.unit ?? ''})`, font: { size: 12 } }, type: 'log', range: xRange, gridcolor: '#eef2f7', zeroline: false, ticks: 'outside', tickcolor: '#cbd5e1' },
      yaxis: { title: { text: `${yMeta?.label ?? yProperty} (${yMeta?.unit ?? ''})`, font: { size: 12 } }, type: 'log', range: yRange, gridcolor: '#eef2f7', zeroline: false, ticks: 'outside', tickcolor: '#cbd5e1' },
      hovermode: 'closest', shapes,
      legend: { orientation: 'h', y: 1.07, x: 0, font: { size: 11 }, bgcolor: 'rgba(255,255,255,0)' },
      paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff',
      font: { family: 'IBM Plex Sans, system-ui, sans-serif', size: 12, color: '#334155' },
    };

    return { data: [...contextTrace, ...markerTraces], layout };
  }, [materials, filtered, xProperty, yProperty, filters]);

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
        <span className="text-[11px] text-muted-foreground ml-auto">Ellipse = min–max range · dotted box = active filter limits</span>
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
