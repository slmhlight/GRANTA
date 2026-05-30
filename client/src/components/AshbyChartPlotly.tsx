/*
 * AM Materials Explorer — Ashby Chart (Plotly)
 * Granta-style property chart: log-log scatter with material-class colour coding,
 * property-range ELLIPSES (min–max envelopes), an active-filter selection window,
 * auto-ranging axes that follow the current selection, and a class legend.
 */
import { useMemo, useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Material, ALL_NUMERIC_PROPERTIES, CATEGORY_COLORS } from '@/lib/materials';
import type { FilterState } from '@/hooks/useMaterialFilter';

interface AshbyChartPlotlyProps {
  materials: Material[];
  filteredMaterials?: Material[];
  filters?: FilterState;
  onMaterialClick?: (material: Material) => void;
  selectedId?: string | null;
  compareList?: string[];
  onCompareMany?: (ids: string[]) => void;
  onApplyToFilter?: (ids: string[]) => void;
}

const PROPERTY_OPTIONS = ALL_NUMERIC_PROPERTIES.map((p) => ({ value: p.key as string, label: `${p.label} (${p.unit})` }));

// Ashby material-selection indices: maximise M = Y^p / X to minimise mass for a given function.
// On a log–log Y-vs-X chart the iso-index line has slope 1/p; materials on/above it pass.
const MATERIAL_INDICES: { key: string; label: string; x: string; y: string; p: number; unit: string }[] = [
  { key: 'E/rho', label: 'Stiff tie — E/ρ', x: 'density', y: 'modulus', p: 1, unit: 'MJ/kg' },
  { key: 'sqrtE/rho', label: 'Light stiff beam — E½/ρ', x: 'density', y: 'modulus', p: 0.5, unit: 'GPa^½·cm³/g' },
  { key: 'cbrtE/rho', label: 'Light stiff panel — E⅓/ρ', x: 'density', y: 'modulus', p: 0.3333, unit: 'GPa^⅓·cm³/g' },
  { key: 'Sy/rho', label: 'Strong tie — σy/ρ', x: 'density', y: 'yield_strength', p: 1, unit: 'kJ/kg' },
  { key: 'Sy23/rho', label: 'Light strong beam — σy⅔/ρ', x: 'density', y: 'yield_strength', p: 0.6667, unit: 'MPa^⅔·cm³/g' },
  { key: 'sqrtSy/rho', label: 'Light strong panel — σy½/ρ', x: 'density', y: 'yield_strength', p: 0.5, unit: 'MPa^½·cm³/g' },
  { key: 'Sy2/E', label: 'Elastic spring/hinge — σy²/E', x: 'modulus', y: 'yield_strength', p: 2, unit: 'MPa²/GPa' },
];

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
  { key: 'Nickel', color: '#8B5CF6', test: (s) => /nickel|inconel|hastelloy|monel|invar|cm247|nimonic|waspaloy|rene|nitinol|incoloy|udimet|cp-nickel/.test(s) },
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
const cleanSub = (s: string) => s.replace(/^[A-Za-z]+(?:\s+[A-Za-z]+)?\s*-\s*/, '').trim() || s;
const fmtNum = (v: number) => (v >= 1000 ? Math.round(v).toLocaleString() : v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2));

// per-axis min/max range slider that acts as a limitation filter on the plotted set
function AxisLimitSlider({ axis, color, domain, limit, onChange }: { axis: string; color: string; domain: [number, number]; limit: [number, number] | null; onChange: (v: [number, number] | null) => void }) {
  const lo = domain[0];
  const hi = domain[1] > domain[0] ? domain[1] : domain[0] + (domain[0] || 1);
  const val = limit ?? [lo, hi];
  const step = Math.max((hi - lo) / 120, hi > 1000 ? 1 : 0.001);
  const active = !!limit && (limit[0] > lo || limit[1] < hi);
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-[10px] font-medium flex-shrink-0" style={{ color }} title="limit">{axis}↔</span>
      <span className="font-mono text-[10px] text-muted-foreground w-14 text-right tabular-nums">{fmtNum(val[0])}</span>
      <Slider min={lo} max={hi} step={step} value={[val[0], val[1]]} onValueChange={(v: number[]) => onChange([v[0], v[1]])} className="flex-1" />
      <span className="font-mono text-[10px] text-muted-foreground w-14 tabular-nums">{fmtNum(val[1])}</span>
      <button type="button" onClick={() => onChange(null)} disabled={!active} className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${active ? 'text-accent border-accent/40 hover:bg-accent/10' : 'text-muted-foreground/30 border-transparent cursor-default'}`}>reset</button>
    </div>
  );
}

export function AshbyChartPlotly({ materials, filteredMaterials, filters, onMaterialClick, selectedId, compareList, onCompareMany, onApplyToFilter }: AshbyChartPlotlyProps) {
  const [xProperty, setXProperty] = useState('yield_strength');
  const [yProperty, setYProperty] = useState('elongation');
  const [groupFilter, setGroupFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('all');
  const [showEnvelopes, setShowEnvelopes] = useState(true);
  const [xLog, setXLog] = useState(true);
  const [yLog, setYLog] = useState(true);
  const [xLimit, setXLimit] = useState<[number, number] | null>(null);
  const [yLimit, setYLimit] = useState<[number, number] | null>(null);
  const [markerSize, setMarkerSize] = useState(7);
  const [showContext, setShowContext] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [markerOpacity, setMarkerOpacity] = useState(0.92);
  const [envOpacity, setEnvOpacity] = useState(0.18);
  const [showMinorGrid, setShowMinorGrid] = useState(false);
  const [showSelected, setShowSelected] = useState(true);
  const [darkChart, setDarkChart] = useState(false);
  const [colorByCategory, setColorByCategory] = useState(false);
  const [showMarkers, setShowMarkers] = useState(false);          // default: no scatter (envelopes only)
  const [envelopeBy, setEnvelopeBy] = useState<'category' | 'class' | 'family'>('class'); // default 1st-level family (class); category = all-metals/all-polymers, family = sub-level
  const [envFill, setEnvFill] = useState(true);
  const [envOutline, setEnvOutline] = useState(true);
  const [indexPreset, setIndexPreset] = useState('none');
  const [indexThreshold, setIndexThreshold] = useState<number | null>(null);
  const [boxedIds, setBoxedIds] = useState<Set<string>>(new Set());
  const [indexPreset2, setIndexPreset2] = useState('none');
  const [indexThreshold2, setIndexThreshold2] = useState<number | null>(null);
  const indexLineRef = useRef<{ shapeIndex: number; p: number; x0: number; y0: number } | null>(null);

  const filtered = filteredMaterials || materials;
  const dom = (prop: string): [number, number] => {
    const vs = materials.map((m) => tv(m, prop)).filter((v): v is number => v != null && v > 0);
    return vs.length ? [Math.min(...vs), Math.max(...vs)] : [0, 1];
  };
  const xDomain = useMemo(() => dom(xProperty), [materials, xProperty]);
  const yDomain = useMemo(() => dom(yProperty), [materials, yProperty]);
  useEffect(() => { setXLimit(null); }, [xProperty]);
  useEffect(() => { setYLimit(null); }, [yProperty]);
  const groupOptions = useMemo(() => {
    const s = new Set<string>();
    for (const m of materials) s.add(classOf(m).key);
    return ['all', ...Array.from(s).sort()];
  }, [materials]);
  const subOptions = useMemo(() => {
    if (groupFilter === 'all') return ['all']; // pick a class first (keeps level-2 short)
    const s = new Set<string>();
    for (const m of materials) if (classOf(m).key === groupFilter && m.subcategory) s.add(m.subcategory);
    return ['all', ...Array.from(s).sort()];
  }, [materials, groupFilter]);

  const { data, layout, indexInfo, selectedIds } = useMemo(() => {
    const inGroup = (m: any) => groupFilter === 'all' || classOf(m).key === groupFilter;
    const inSub = (m: any) => subFilter === 'all' || m.subcategory === subFilter;
    const valid = (m: any) => (tv(m, xProperty) ?? 0) > 0 && (tv(m, yProperty) ?? 0) > 0;
    const inLim = (m: any) => (!xLimit || (tv(m, xProperty)! >= xLimit[0] && tv(m, xProperty)! <= xLimit[1]))
      && (!yLimit || (tv(m, yProperty)! >= yLimit[0] && tv(m, yProperty)! <= yLimit[1]));
    const fset = filtered.filter((m) => valid(m) && inGroup(m) && inSub(m)); // limits act as a selection (below), not a frame change
    const fsetIds = new Set(fset.map((m) => m.id));
    const others = materials.filter((m) => !fsetIds.has(m.id) && valid(m));

    // ── selection precedence: chart box-select > material-index preset(s) > Compare list ──
    const idx = MATERIAL_INDICES.find((i) => i.key === indexPreset) || null;
    const idx2 = MATERIAL_INDICES.find((i) => i.key === indexPreset2) || null;
    const Mof = (ix: { x: string; y: string; p: number } | null, m: any) => { if (!ix) return null; const xv = tv(m, ix.x), yv = tv(m, ix.y); return xv && yv && xv > 0 && yv > 0 ? Math.pow(yv, ix.p) / xv : null; };
    let colored: Material[], coldFset: Material[], colorMode = false;
    let indexThr: number | null = null, minM = 0, maxM = 0;
    let indexThr2: number | null = null, minM2 = 0, maxM2 = 0;
    if (boxedIds.size > 0) {
      colored = fset.filter((m) => boxedIds.has(m.id));
      coldFset = fset.filter((m) => !boxedIds.has(m.id));
      colorMode = colored.length > 0;
      if (!colorMode) colored = fset;
    } else if (idx) {
      const Ms = fset.map((m) => Mof(idx, m)).filter((v): v is number => v != null && isFinite(v)).sort((a, b) => a - b);
      minM = Ms[0] ?? 0; maxM = Ms[Ms.length - 1] ?? 0;
      indexThr = indexThreshold ?? (Ms.length ? Ms[Math.floor(Ms.length / 2)] : 0); // default ≈ median → ~half pass
      if (idx2) {
        const Ms2 = fset.map((m) => Mof(idx2, m)).filter((v): v is number => v != null && isFinite(v)).sort((a, b) => a - b);
        minM2 = Ms2[0] ?? 0; maxM2 = Ms2[Ms2.length - 1] ?? 0;
        indexThr2 = indexThreshold2 ?? (Ms2.length ? Ms2[Math.floor(Ms2.length / 2)] : 0);
      }
      const pass = (m: any) => {
        const M = Mof(idx, m); if (!(M != null && M >= indexThr!)) return false;
        if (idx2) { const M2 = Mof(idx2, m); return M2 != null && M2 >= indexThr2!; }
        return true;
      };
      colored = fset.filter(pass).sort((a, b) => (Mof(idx, b) ?? 0) - (Mof(idx, a) ?? 0));
      coldFset = fset.filter((m) => !pass(m));
      colorMode = colored.length > 0;
    } else if (xLimit || yLimit) {
      // axis-limit sliders act as a selection window: highlight materials inside, divide the rest out
      colored = fset.filter(inLim);
      coldFset = fset.filter((m) => !inLim(m));
      colorMode = colored.length > 0;
      if (!colorMode) colored = fset;
    } else {
      const compareSet = new Set(compareList || []);
      colored = fset.filter((m) => compareSet.has(m.id));
      colorMode = compareSet.size > 0 && colored.length > 0;
      if (!colorMode) colored = fset;
      coldFset = colorMode ? fset.filter((m) => !compareSet.has(m.id)) : [];
    }
    const selectedIds = colorMode ? colored.map((m) => m.id) : [];

    // markers grouped by colour key (material class, or category when colour-by-category is on)
    const colKey = (m: any) => (colorByCategory ? m.category : classOf(m).key);
    const colColor = (m: any) => (colorByCategory ? (CATEGORY_COLORS[m.category] || '#64748b') : classOf(m).color);
    const byClass = new Map<string, { color: string; ms: Material[] }>();
    for (const m of colored) {
      const ck = colKey(m), cc = colColor(m);
      if (!byClass.has(ck)) byClass.set(ck, { color: cc, ms: [] });
      byClass.get(ck)!.ms.push(m);
    }
    const markerTraces = Array.from(byClass.entries()).sort((a, b) => b[1].ms.length - a[1].ms.length).map(([key, { color, ms }]) => ({
      x: ms.map((m) => tv(m, xProperty)), y: ms.map((m) => tv(m, yProperty)),
      mode: showLabels ? 'markers+text' : 'markers', type: 'scatter', name: `${key} (${ms.length})`,
      textposition: 'top center', textfont: { size: 8, color: '#64748b' },
      marker: { size: colorMode ? markerSize + 4 : markerSize, color, line: { color: darkChart ? '#0f172a' : '#ffffff', width: colorMode ? 1.2 : 0.5 }, opacity: markerOpacity },
      text: ms.map((m) => m.name), customdata: ms.map((m) => m.id),
      hovertemplate: `<b>%{text}</b><br>${xProperty}: %{x:.4g}<br>${yProperty}: %{y:.4g}<extra>${key}</extra>`,
    }));

    const ctx = showContext ? [...others, ...coldFset] : [];
    const contextTrace = ctx.length ? [{
      x: ctx.map((m) => tv(m, xProperty)), y: ctx.map((m) => tv(m, yProperty)),
      mode: 'markers', type: 'scatter', name: 'filtered out',
      marker: { size: 5, color: '#cbd5e1', opacity: colorMode ? 0.45 : 0.3 },
      text: ctx.map((m) => m.name), customdata: ctx.map((m) => m.id),
      hovertemplate: `<b>%{text}</b><br>${xProperty}: %{x:.4g}<br>${yProperty}: %{y:.4g}<extra>out</extra>`,
      showlegend: false,
    }] : [];

    // property envelopes as FILLED TRACES (raw values → correct on log axes, unlike shapes),
    // grouped by class. Convex hull of real data points → irregular blob; box fallback.
    const shapes: any[] = [];
    const xi = PROP_ORDER.indexOf(xProperty), yi = PROP_ORDER.indexOf(yProperty);
    // ONE merged convex hull per group (1st-level family by default) — pool every member's data points
    const hullByClass = new Map<string, { color: string; pts: number[][] }>();
    for (const m of fset) {   // envelopes follow the full group (stable map), not the current selection
      const ck = envelopeBy === 'category' ? m.category : envelopeBy === 'family' ? (m.subcategory || classOf(m).key) : classOf(m).key;
      const cc = envelopeBy === 'category' ? (CATEGORY_COLORS[m.category] || '#64748b') : classOf(m).color;
      if (!hullByClass.has(ck)) hullByClass.set(ck, { color: cc, pts: [] });
      const g = hullByClass.get(ck)!;
      const raw = (((m as any).points || []) as number[][]);
      if (xi >= 0 && yi >= 0 && raw.length) {
        for (const t of raw) { const x = t[xi], y = t[yi]; if (x > 0 && y > 0) g.pts.push([L(x), L(y)]); }
      } else {
        const xl = loOf(m, xProperty)!, xh = hiOf(m, xProperty)!, yl = loOf(m, yProperty)!, yh = hiOf(m, yProperty)!;
        if (xl > 0 && yl > 0) g.pts.push([L(xl), L(yl)], [L(xh), L(yl)], [L(xh), L(yh)], [L(xl), L(yh)]);
      }
    }
    const hullLegend = showLegend && !showMarkers && !colorMode; // label envelopes in the legend when markers are hidden
    const hullTraces = Array.from(hullByClass.entries()).map(([key, g]) => {
      const uniq = Array.from(new Map(g.pts.map((p) => [`${p[0].toFixed(3)},${p[1].toFixed(3)}`, p])).values());
      if (uniq.length < 3) return null;
      const h = convexHull(uniq);
      if (h.length < 3) return null;
      const poly = h.map((p) => [10 ** p[0], 10 ** p[1]]);
      return {
        x: [...poly.map((p) => p[0]), poly[0][0]], y: [...poly.map((p) => p[1]), poly[0][1]],
        mode: 'lines', type: 'scatter', fill: envFill ? 'toself' : 'none',
        fillcolor: rgba(g.color, envOpacity), line: { color: g.color, width: envOutline ? (envFill ? 1.5 : 2) : 0, shape: 'spline', smoothing: 1 },
        name: cleanSub(key), hoverinfo: 'skip', showlegend: hullLegend,
      };
    }).filter(Boolean);

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
    // highlight the selected material's own envelope on top
    const selM = selectedId ? materials.find((m) => m.id === selectedId) : null;
    const selTrace = (showEnvelopes && showSelected && selM) ? [envFromPoints([selM], classOf(selM).color, 0.32, 3)].filter(Boolean) : [];
    // envelopes: hidden if toggled off; one class envelope when a class is selected; else per-material
    let envelopeTraces: any[] = [];
    if (showEnvelopes) envelopeTraces = groupFilter !== 'all' ? [envFromPoints(fset, '#0EA5E9', 0.1, 2.5)].filter(Boolean) : hullTraces;

    // auto-range to the filtered envelope (log10 units, with padding)
    const xs = fset.flatMap((m) => [loOf(m, xProperty), hiOf(m, xProperty)]).filter((v): v is number => !!v && v > 0);
    const ys = fset.flatMap((m) => [loOf(m, yProperty), hiOf(m, yProperty)]).filter((v): v is number => !!v && v > 0);
    const logRange = (v: number[]) => v.length ? [L(Math.min(...v)) - 0.15, L(Math.max(...v)) + 0.15] : undefined;
    const linRange = (v: number[]) => { if (!v.length) return undefined; const mn = Math.min(...v), mx = Math.max(...v), pad = (mx - mn) * 0.06 || mx * 0.06; return [Math.max(0, mn - pad), mx + pad]; };
    const xRange = xLog ? logRange(xs) : linRange(xs);
    const yRange = yLog ? logRange(ys) : linRange(ys);

    const indexTraces: any[] = [];

    // active-filter selection window + axis limit sliders → reference lines (locked, not draggable)
    const fx = filters && RANGE_FILTER_KEY[xProperty] ? (filters[RANGE_FILTER_KEY[xProperty]] as [number, number] | null) : null;
    const fy = filters && RANGE_FILTER_KEY[yProperty] ? (filters[RANGE_FILTER_KEY[yProperty]] as [number, number] | null) : null;
    const scX = (v: number) => v, scY = (v: number) => v; // Plotly shapes use RAW data coords (it applies log10 internally on log axes)
    if (fx) for (const xv of fx) if (xv > 0) shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: scX(xv), x1: scX(xv), y0: 0, y1: 1, line: { color: '#0066CC', width: 1.5, dash: 'dot' }, editable: false });
    if (fy) for (const yv of fy) if (yv > 0) shapes.push({ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: scY(yv), y1: scY(yv), line: { color: '#0066CC', width: 1.5, dash: 'dot' }, editable: false });
    if (xLimit) for (const xv of xLimit) if (xv > 0) shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: scX(xv), x1: scX(xv), y0: 0, y1: 1, line: { color: '#9333ea', width: 1.5, dash: 'dash' }, editable: false });
    if (yLimit) for (const yv of yLimit) if (yv > 0) shapes.push({ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: scY(yv), y1: scY(yv), line: { color: '#9333ea', width: 1.5, dash: 'dash' }, editable: false });
    // Ashby selection line as an EDITABLE shape — drag it up/down to change the index threshold M
    if (idx && indexThr != null && xLog && yLog && xRange) {
      const ilx0 = 10 ** xRange[0], ilx1 = 10 ** xRange[1];
      const iyAt = (xv: number) => Math.pow(indexThr! * xv, 1 / idx.p);
      shapes.push({ type: 'line', xref: 'x', yref: 'y', x0: scX(ilx0), y0: scY(iyAt(ilx0)), x1: scX(ilx1), y1: scY(iyAt(ilx1)), line: { color: '#dc2626', width: 2.5 } });
      indexLineRef.current = { shapeIndex: shapes.length - 1, p: idx.p, x0: ilx0, y0: iyAt(ilx0) };
    } else {
      indexLineRef.current = null;
    }

    // material-index guide lines (Ashby): constant performance-index directions on log-log
    const guideAnnotations: any[] = [];
    const guides = INDEX_GUIDES[`${xProperty}|${yProperty}`];
    if (showGuides && xLog && yLog && guides && xRange && yRange) {
      const xm = (xRange[0] + xRange[1]) / 2, ym = (yRange[0] + yRange[1]) / 2;
      for (const g of guides) {
        const yAt = (xl: number) => g.slope * (xl - xm) + ym; // log-space; convert endpoints to raw for the shape
        shapes.push({ type: 'line', xref: 'x', yref: 'y', x0: 10 ** xRange[0], x1: 10 ** xRange[1], y0: 10 ** yAt(xRange[0]), y1: 10 ** yAt(xRange[1]), line: { color: '#cbd5e1', width: 1, dash: 'dash' }, layer: 'below', editable: false });
        guideAnnotations.push({ x: 10 ** xRange[1], y: 10 ** yAt(xRange[1]), xref: 'x', yref: 'y', text: g.label, showarrow: false, font: { size: 9, color: '#94a3b8' }, xanchor: 'right', yanchor: 'bottom' });
      }
    }

    const xMeta = ALL_NUMERIC_PROPERTIES.find((p) => p.key === xProperty);
    const yMeta = ALL_NUMERIC_PROPERTIES.find((p) => p.key === yProperty);

    const gridC = darkChart ? '#1e293b' : '#eef2f7';
    const tickC = darkChart ? '#475569' : '#cbd5e1';
    const fontC = darkChart ? '#cbd5e1' : '#334155';
    const minorAxis = showMinorGrid ? { showgrid: true, gridcolor: darkChart ? '#16203a' : '#f5f8fc', gridwidth: 0.5 } : {};
    const layout: any = {
      autosize: true,
      margin: { l: 72, r: 20, t: 28, b: 56 },
      xaxis: { title: { text: `${xMeta?.label ?? xProperty} (${xMeta?.unit ?? ''})`, font: { size: 12 } }, type: xLog ? 'log' : 'linear', range: xRange, gridcolor: gridC, showgrid: showGrid, zeroline: false, ticks: 'outside', tickcolor: tickC, minor: minorAxis },
      yaxis: { title: { text: `${yMeta?.label ?? yProperty} (${yMeta?.unit ?? ''})`, font: { size: 12 } }, type: yLog ? 'log' : 'linear', range: yRange, gridcolor: gridC, showgrid: showGrid, zeroline: false, ticks: 'outside', tickcolor: tickC, minor: minorAxis },
      hovermode: 'closest', shapes, annotations: guideAnnotations, showlegend: showLegend,
      legend: { orientation: 'h', y: 1.07, x: 0, font: { size: 11, color: fontC }, bgcolor: 'rgba(0,0,0,0)' },
      paper_bgcolor: darkChart ? '#0b1220' : '#ffffff', plot_bgcolor: darkChart ? '#0f172a' : '#ffffff',
      font: { family: 'IBM Plex Sans, system-ui, sans-serif', size: 12, color: fontC },
    };

    const indexInfo = (idx && boxedIds.size === 0) ? { count: colored.length, total: fset.length, thr: indexThr as number, minM, maxM, unit: idx.unit, second: idx2 ? { thr: indexThr2 as number, minM: minM2, maxM: maxM2, unit: idx2.unit } : null } : null;
    const showPts = showMarkers || colorMode; // markers shown if toggled on, or when a selection is active
    const data = [
      ...envelopeTraces,
      ...(showMarkers ? contextTrace : []),
      ...(showPts ? markerTraces : []),
      ...selTrace,
      ...indexTraces,
    ];
    return { data, layout, indexInfo, selectedIds };
  }, [materials, filtered, xProperty, yProperty, filters, groupFilter, subFilter, selectedId, showEnvelopes, xLog, yLog, compareList, xLimit, yLimit, markerSize, showContext, showGrid, showLabels, showLegend, showGuides, markerOpacity, envOpacity, showMinorGrid, showSelected, darkChart, colorByCategory, indexPreset, indexThreshold, boxedIds, indexPreset2, indexThreshold2, showMarkers, envelopeBy, envFill, envOutline]);

  const config = {
    responsive: true, displaylogo: false,
    modeBarButtonsToRemove: ['autoScale2d'], // keep box-select + lasso for material selection
    edits: { shapePosition: true }, // allow dragging the index selection line
    toImageButtonOptions: { format: 'png', filename: 'ashby_chart', height: 700, width: 1000, scale: 2 },
  };
  const comparing = (compareList?.length ?? 0) > 0;

  // export the current selection (box / index-passing / compare) to CSV
  const exportSelection = () => {
    const ids = new Set(selectedIds);
    const rows = materials.filter((m) => ids.has(m.id));
    if (!rows.length) return;
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['name', 'category', 'subcategory', 'process', ...ALL_NUMERIC_PROPERTIES.map((p) => `${p.label} (${p.unit})`), 'aliases'];
    const lines = [header.map(esc).join(',')];
    for (const m of rows) {
      const cells = [m.name, m.category, m.subcategory, (m.processes || (m.process ? [m.process] : [])).join(' / '),
        ...ALL_NUMERIC_PROPERTIES.map((p) => { const r = (m.ranges || {})[p.key as string]; return r?.typical ?? (m as any)[p.key] ?? ''; }),
        (m.aliases || []).join('; ')];
      lines.push(cells.map(esc).join(','));
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ashby_selection.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-y-auto md:overflow-hidden">
      {/* Axis selectors */}
      {/* ── Axes: each property dropdown + log toggle, with its limit slider directly below ── */}
      <div className="flex flex-col sm:flex-row gap-x-6 gap-y-2.5 px-3 py-2.5 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground w-3 flex-shrink-0">X</span>
            <Select value={xProperty} onValueChange={(v) => { setXProperty(v); setIndexPreset('none'); }}>
              <SelectTrigger className="h-7 text-xs flex-1 min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent>{PROPERTY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none flex-shrink-0"><input type="checkbox" checked={xLog} onChange={(e) => setXLog(e.target.checked)} className="accent-accent" />log</label>
          </div>
          <div className="mt-1.5 pl-5"><AxisLimitSlider axis="X" color="#9333ea" domain={xDomain} limit={xLimit} onChange={setXLimit} /></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground w-3 flex-shrink-0">Y</span>
            <Select value={yProperty} onValueChange={(v) => { setYProperty(v); setIndexPreset('none'); }}>
              <SelectTrigger className="h-7 text-xs flex-1 min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent>{PROPERTY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none flex-shrink-0"><input type="checkbox" checked={yLog} onChange={(e) => setYLog(e.target.checked)} className="accent-accent" />log</label>
          </div>
          <div className="mt-1.5 pl-5"><AxisLimitSlider axis="Y" color="#9333ea" domain={yDomain} limit={yLimit} onChange={setYLimit} /></div>
        </div>
      </div>

      {/* ── Grouping & display ── */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border">
        <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setSubFilter('all'); }}>
          <SelectTrigger className="h-7 text-xs w-[128px]"><SelectValue /></SelectTrigger>
          <SelectContent>{groupOptions.map((f) => <SelectItem key={f} value={f} className="text-xs">{f === 'all' ? 'All classes' : f}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={subFilter} onValueChange={setSubFilter} disabled={groupFilter === 'all'}>
          <SelectTrigger className="h-7 text-xs w-[150px]"><SelectValue placeholder="Sub-family" /></SelectTrigger>
          <SelectContent>{subOptions.map((f) => <SelectItem key={f} value={f} className="text-xs">{f === 'all' ? 'All families' : cleanSub(f)}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={showEnvelopes} onChange={(e) => setShowEnvelopes(e.target.checked)} className="accent-accent" /> Envelopes
        </label>
        <Select value={envelopeBy} onValueChange={(v) => setEnvelopeBy(v as 'category' | 'class' | 'family')}>
          <SelectTrigger className="h-7 text-xs w-[155px]" title="Envelope grouping"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="category" className="text-xs">All metals / polymers</SelectItem>
            <SelectItem value="class" className="text-xs">1st-level family</SelectItem>
            <SelectItem value="family" className="text-xs">Sub-family (2nd)</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 h-7 flex items-center gap-1">Display ▾</button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-60 text-xs space-y-3">
            <div>
              <div className="flex justify-between mb-1.5"><span className="text-muted-foreground">Marker size</span><span className="font-mono">{markerSize}</span></div>
              <Slider min={4} max={16} step={1} value={[markerSize]} onValueChange={(v: number[]) => setMarkerSize(v[0])} />
            </div>
            <div>
              <div className="flex justify-between mb-1.5"><span className="text-muted-foreground">Marker opacity</span><span className="font-mono">{markerOpacity.toFixed(2)}</span></div>
              <Slider min={0.2} max={1} step={0.05} value={[markerOpacity]} onValueChange={(v: number[]) => setMarkerOpacity(v[0])} />
            </div>
            <div>
              <div className="flex justify-between mb-1.5"><span className="text-muted-foreground">Envelope opacity</span><span className="font-mono">{envOpacity.toFixed(2)}</span></div>
              <Slider min={0.03} max={0.5} step={0.01} value={[envOpacity]} onValueChange={(v: number[]) => setEnvOpacity(v[0])} />
            </div>
            {([['Markers (scatter)', showMarkers, setShowMarkers], ['Envelope fill', envFill, setEnvFill], ['Envelope outline', envOutline, setEnvOutline], ['Gridlines', showGrid, setShowGrid], ['Minor gridlines', showMinorGrid, setShowMinorGrid], ['Legend', showLegend, setShowLegend], ['Filtered-out points', showContext, setShowContext], ['Point labels', showLabels, setShowLabels], ['Ashby guide lines', showGuides, setShowGuides], ['Selected highlight', showSelected, setShowSelected], ['Colour by category', colorByCategory, setColorByCategory], ['Dark chart', darkChart, setDarkChart]] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="accent-accent" /> {label}
              </label>
            ))}
          </PopoverContent>
        </Popover>
        {comparing
          ? <span className="text-[11px] font-medium text-accent ml-auto">● Colouring {compareList!.length} Compare selection{compareList!.length > 1 ? 's' : ''}</span>
          : <span className="text-[11px] text-muted-foreground ml-auto">Curved envelope = property range</span>}
      </div>

      {/* Ashby material-index selection — pick a performance index, move the selection line by value */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-border bg-rose-50/50">
        <span className="text-[10px] text-rose-700 uppercase tracking-wide font-semibold">Index</span>
        <Select value={indexPreset} onValueChange={(v) => { setIndexPreset(v); setIndexPreset2('none'); setIndexThreshold2(null); const p = MATERIAL_INDICES.find((i) => i.key === v); if (p) { setXProperty(p.x); setYProperty(p.y); setXLog(true); setYLog(true); setIndexThreshold(null); } }}>
          <SelectTrigger className="h-7 text-xs w-[240px]"><SelectValue placeholder="Material index (off)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">Off</SelectItem>
            {MATERIAL_INDICES.map((i) => <SelectItem key={i.key} value={i.key} className="text-xs">{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {indexInfo && (
          <>
            <span className="text-[11px] text-muted-foreground">M ≥</span>
            <input
              type="number"
              value={Number((indexThreshold ?? indexInfo.thr).toPrecision(4))}
              step={(indexInfo.maxM - indexInfo.minM) / 100 || 0.1}
              onChange={(e) => setIndexThreshold(e.target.value === '' ? null : Number(e.target.value))}
              className="h-7 w-24 text-xs font-mono rounded border border-border px-1.5 bg-background"
            />
            <span className="text-[10px] text-muted-foreground">{indexInfo.unit}</span>
            <div className="w-44"><Slider min={indexInfo.minM} max={indexInfo.maxM} step={(indexInfo.maxM - indexInfo.minM) / 200 || 0.01} value={[Math.min(indexInfo.maxM, Math.max(indexInfo.minM, indexThreshold ?? indexInfo.thr))]} onValueChange={(v: number[]) => setIndexThreshold(v[0])} /></div>
            <span className="text-[11px] font-semibold text-rose-700">{indexInfo.count}/{indexInfo.total} pass</span>
            <button type="button" onClick={() => setIndexThreshold(null)} className="text-[10px] px-1.5 py-0.5 rounded border text-accent border-accent/40 hover:bg-accent/10">auto</button>
            <span className="text-rose-300">·</span>
            <Select value={indexPreset2} onValueChange={(v) => { setIndexPreset2(v); setIndexThreshold2(null); }}>
              <SelectTrigger className="h-7 text-xs w-[190px]"><SelectValue placeholder="+ 2nd constraint" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">No 2nd constraint</SelectItem>
                {MATERIAL_INDICES.filter((i) => i.key !== indexPreset).map((i) => <SelectItem key={i.key} value={i.key} className="text-xs">{i.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {indexInfo.second && (
              <>
                <span className="text-[11px] text-muted-foreground">M₂ ≥</span>
                <input type="number" value={Number((indexThreshold2 ?? indexInfo.second.thr).toPrecision(4))} step={(indexInfo.second.maxM - indexInfo.second.minM) / 100 || 0.1} onChange={(e) => setIndexThreshold2(e.target.value === '' ? null : Number(e.target.value))} className="h-7 w-24 text-xs font-mono rounded border border-border px-1.5 bg-background" />
                <span className="text-[10px] text-muted-foreground">{indexInfo.second.unit}</span>
              </>
            )}
          </>
        )}
        {selectedIds.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] text-accent font-medium hover:underline underline-offset-2">{selectedIds.length} active ▾</button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-0 text-xs">
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
                  <span className="font-semibold">{selectedIds.length} active materials</span>
                  {onCompareMany && <button type="button" onClick={() => onCompareMany(selectedIds)} className="text-[11px] px-2 py-0.5 rounded border border-accent/50 text-accent hover:bg-accent/10 flex-shrink-0">Add all → Compare</button>}
                </div>
                <div className="max-h-60 overflow-auto py-1">
                  {selectedIds.map((id) => { const m = materials.find((x) => x.id === id); return m ? (
                    <div key={id} className="px-3 py-1 truncate hover:bg-muted/50" title={m.name}>{m.name}</div>
                  ) : null; })}
                </div>
              </PopoverContent>
            </Popover>
            {onCompareMany && <button type="button" onClick={() => onCompareMany(selectedIds)} className="text-[11px] px-2 py-0.5 rounded border border-accent/50 text-accent hover:bg-accent/10 font-medium">+ Compare</button>}
            <button type="button" onClick={exportSelection} className="text-[11px] px-2 py-0.5 rounded border border-border text-foreground hover:bg-muted">Export CSV</button>
            {onApplyToFilter && <button type="button" onClick={() => onApplyToFilter(selectedIds)} className="text-[11px] px-2 py-0.5 rounded border border-border text-foreground hover:bg-muted">→ Filter</button>}
            {boxedIds.size > 0 && <button type="button" onClick={() => setBoxedIds(new Set())} className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:bg-muted">Clear box</button>}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[60vh] md:min-h-0 p-2">
        <Plot
          data={data as any}
          layout={layout as any}
          config={config as any}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          onClick={(e: any) => {
            const id = e?.points?.[0]?.customdata;
            const m = id && materials.find((x) => x.id === id);
            if (m && onMaterialClick) onMaterialClick(m);
          }}
          {...({
            onSelected: (e: any) => {
              const ids = (e?.points || []).map((p: any) => p.customdata).filter(Boolean);
              if (ids.length) setBoxedIds(new Set(ids));
            },
            onDeselect: () => setBoxedIds(new Set()),
            onRelayout: (e: any) => {
              const ref = indexLineRef.current;
              if (!ref || !xLog || !yLog) return;
              const ny = e[`shapes[${ref.shapeIndex}].y0`];
              const nx = e[`shapes[${ref.shapeIndex}].x0`];
              if (ny == null && nx == null) return;
              const rawX = nx != null ? nx : ref.x0;   // shape coords are raw data values
              const rawY = ny != null ? ny : ref.y0;
              const M = Math.pow(rawY, ref.p) / rawX;
              if (isFinite(M) && M > 0) setIndexThreshold(M);
            },
          } as any)}
        />
      </div>
    </div>
  );
}
