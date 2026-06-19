/*
 * AM Materials Explorer — Ashby Chart (Plotly)
 * Granta-style property chart: log-log scatter with material-class colour coding,
 * property-range ELLIPSES (min–max envelopes), an active-filter selection window,
 * auto-ranging axes that follow the current selection, and a class legend.
 */
import { useMemo, useState, useEffect, useRef } from 'react';
import Plot from '@/lib/plotly-scatter'; // R210 B9 — scatter-only 번들 (전체판 4.6MB → ~scatter)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Material, ALL_NUMERIC_PROPERTIES, CATEGORY_COLORS } from '@/lib/materials';
import { classOf } from '@/lib/material-colors';
import { toast } from 'sonner';
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
  /** 사례 적용 후 권장 Index 자동 설정 — 차트 mount 시점이 사례 적용 후라면 url idx 가 비었을 수 있어
   *  prop 으로 받아 X/Y/index preset 전체 자동 셋업. null 이면 자동 변경 안 함. */
  forceIndexKey?: string | null;
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
  { key: 'Sy/E', label: 'Elastic strain — σy/E', x: 'modulus', y: 'yield_strength', p: 1, unit: 'MPa/GPa' },
  { key: 'k/rho', label: 'Light heat-sink — k/ρ', x: 'density', y: 'thermal_conductivity', p: 1, unit: 'W·cm³/m·K·g' },
  { key: 'E/cost', label: 'Cheap stiffness — E/Cm', x: 'price_per_kg', y: 'modulus', p: 1, unit: 'GPa·kg/$' },
  { key: 'Sy/cost', label: 'Cheap strength — σy/Cm', x: 'price_per_kg', y: 'yield_strength', p: 1, unit: 'MPa·kg/$' },
];

// numeric property → its range-filter key in FilterState (for the selection window)
const RANGE_FILTER_KEY: Record<string, keyof FilterState> = {
  density: 'densityRange', yield_strength: 'yieldStrengthRange', uts: 'utsRange',
  elongation: 'elongationRange', modulus: 'modulusRange', hardness: 'hardnessRange',
};

// R28 — 물성별 Pareto 최적화 방향 (max=높을수록 좋음 / min=낮을수록 좋음).
// 명시 안 된 항목은 'max' 기본 (대부분 강도·인성 류는 큰 게 좋음).
const PROP_DIR: Record<string, 'max' | 'min'> = {
  density: 'min',
  price_per_kg: 'min',
  price_per_cm3: 'min',
  thermal_expansion: 'min',  // 저 CTE 가 정밀 부품에 좋음
  total_cost_estimate: 'min',
  machining_cost_factor: 'min',
  ht_cost_factor: 'min',
  yield_strength: 'max',
  uts: 'max',
  modulus: 'max',
  hardness: 'max',
  fatigue_strength: 'max',
  impact_strength: 'max',
  elongation: 'max',
  thermal_conductivity: 'max',
  electrical_conductivity: 'max',
  max_service_temp: 'max',
  popularity: 'max',
  melting_point: 'max',
};
function paretoDir(prop: string): 'max' | 'min' { return PROP_DIR[prop] ?? 'max'; }
/** R28 — Pareto frontier 추출. xDir/yDir 따라 dominance test.
 *  알고리즘: x 기준 정렬 후 y best-so-far 추적 — O(n log n).
 *  R29 — edge case 강화: 0/1 point 처리, NaN/Infinity 필터, 동일 x 값 처리 (같은 x 면 better y 우선). */
function paretoFrontier(points: { x: number; y: number; id: string; name: string }[], xDir: 'max' | 'min', yDir: 'max' | 'min') {
  // 1) 유효 점만 (finite 양수). NaN/Infinity/0 이하 제외.
  const valid = points.filter(p => isFinite(p.x) && isFinite(p.y) && p.x > 0 && p.y > 0);
  if (valid.length === 0) return [];
  if (valid.length === 1) return valid;  // 한 점도 frontier 자기 자신.
  // 2) 정렬 — x 우선, 같은 x 면 better y (frontier 후보) 우선해서 sort 위로.
  const sorted = [...valid].sort((a, b) => {
    if (a.x !== b.x) return xDir === 'min' ? a.x - b.x : b.x - a.x;
    return yDir === 'max' ? b.y - a.y : a.y - b.y;
  });
  // 3) 누적 best y 보다 좋은 점만 frontier 에 추가. 같은 y 면 한 번만 (중복 제거).
  const frontier: typeof points = [];
  let bestY = yDir === 'max' ? -Infinity : Infinity;
  const seenIds = new Set<string>();
  for (const p of sorted) {
    if (seenIds.has(p.id)) continue;
    const better = yDir === 'max' ? p.y > bestY : p.y < bestY;
    if (better) {
      frontier.push(p);
      bestY = p.y;
      seenIds.add(p.id);
    }
  }
  return frontier;
}

// Ashby material-index guide lines: constant performance-index directions on log-log axes
const INDEX_GUIDES: Record<string, { slope: number; label: string }[]> = {
  'density|modulus': [{ slope: 1, label: 'E/ρ' }, { slope: 2, label: 'E^½/ρ' }, { slope: 3, label: 'E^⅓/ρ' }],
  'density|yield_strength': [{ slope: 1, label: 'σ/ρ' }, { slope: 1.5, label: 'σ^⅔/ρ' }],
  'density|uts': [{ slope: 1, label: 'σ/ρ' }, { slope: 1.5, label: 'σ^⅔/ρ' }],
};

// 재료 분류별 색은 단일 진실 소스(lib/material-colors)에서 — UI 전반과 동일.

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
// per-axis min/max limit: log-scale slider when the axis is log + editable numeric inputs (acts as a limitation filter)
function AxisLimitSlider({ axis, color, domain, limit, log, onChange }: { axis: string; color: string; domain: [number, number]; limit: [number, number] | null; log?: boolean; onChange: (v: [number, number] | null) => void }) {
  const lo = domain[0];
  const hi = domain[1] > domain[0] ? domain[1] : domain[0] + (domain[0] || 1);
  const useLog = !!log && lo > 0;
  const val = limit ?? [lo, hi];
  const active = !!limit && (limit[0] > lo || limit[1] < hi);
  const toS = (v: number) => (useLog ? Math.log10(v) : v);
  const fromS = (s: number) => (useLog ? 10 ** s : s);
  const sMin = toS(lo), sMax = toS(hi);
  const step = (sMax - sMin) / 200 || 0.001;
  const clamp = (v: number) => Math.min(hi, Math.max(lo, v));
  const setRange = (a: number, b: number) => { const a2 = clamp(Math.min(a, b)), b2 = clamp(Math.max(a, b)); onChange(a2 <= lo && b2 >= hi ? null : [a2, b2]); };
  const inputCls = 'w-16 h-6 text-[10px] font-mono rounded border border-border px-1 bg-background tabular-nums';
  return (
    <div className="flex items-center gap-1.5 w-full">
      <span className="text-[10px] font-medium flex-shrink-0" style={{ color }} title={useLog ? `${axis} limit (log scale)` : `${axis} limit`}>{axis}{useLog ? ' log' : ''}↔</span>
      <input type="number" value={Number(val[0].toPrecision(4))} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setRange(v, val[1]); }} className={inputCls} />
      <Slider min={sMin} max={sMax} step={step} value={[toS(val[0]), toS(val[1])]} onValueChange={(v: number[]) => setRange(fromS(v[0]), fromS(v[1]))} className="flex-1 min-w-[50px]" />
      <input type="number" value={Number(val[1].toPrecision(4))} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setRange(val[0], v); }} className={inputCls} />
      <button type="button" onClick={() => onChange(null)} disabled={!active} className={`text-[12px] leading-none px-1.5 py-0.5 rounded border flex-shrink-0 ${active ? 'text-accent border-accent/40 hover:bg-accent/10' : 'text-muted-foreground/30 border-transparent cursor-default'}`} title="reset limit">×</button>
    </div>
  );
}

export function AshbyChartPlotly({ materials, filteredMaterials, filters, onMaterialClick, selectedId, compareList, onCompareMany, onApplyToFilter, forceIndexKey }: AshbyChartPlotlyProps) {
  /** 모바일 (width < 640) 감지 — Plotly 마진/폰트, 툴바 컴팩트 모드, 레전드 표시 여부를 동시 조절.
   *  resize listener 로 회전·창 변경에도 반응. */
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
  /** R28 — Pareto frontier overlay 토글. 활성화 시 현재 fset 의 frontier 점만 강조 + 라인 연결. */
  const [showPareto, setShowPareto] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const on = () => setIsMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
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
  const [constraints, setConstraints] = useState<{ key: string; thr: number | null }[]>([]); // additional index constraints (multi-index, ANDed)
  const indexLineRef = useRef<{ shapeIndex: number; p: number; x0: number; y0: number } | null>(null);
  /* R97 — Reset axes (modeBar 🏠 / doubleClick) 동작을 X/Y property 재선택 시와 동일하게 만들기 위한 카운터.
   *       reset 시 onRelayout 이 xaxis.autorange / yaxis.autorange === true 감지 → resetCounter++ →
   *       uirevision 변경 → plotly 가 사용자 zoom 폐기 + layout.range 적용 (= property 변경 효과). */
  const [resetCounter, setResetCounter] = useState(0);
  // 사례 다이얼로그가 URL `idx=` 로 권장 인덱스를 전달하면 mount 시점에 적용 + 사용자에게 toast 안내 (NB4)
  useEffect(() => {
    const idx = new URLSearchParams(window.location.search).get('idx');
    if (idx && MATERIAL_INDICES.some((i) => i.key === idx)) {
      const p = MATERIAL_INDICES.find((i) => i.key === idx)!;
      setIndexPreset(idx);
      setXProperty(p.x); setYProperty(p.y); setXLog(true); setYLog(true); setIndexThreshold(null);
      // 사용자에게 차트 축·인덱스가 변경됐음을 명시 (이전에는 조용히 변경됐음)
      toast.success(`Ashby Index 자동 적용: ${p.label}`, {
        description: `차트 축이 ${p.x} (X) · ${p.y} (Y) 로 설정됨. 상단 Index 드롭다운에서 언제든지 변경.`,
        duration: 6000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 라운드 14 — forceIndexKey prop 변경 시 (사례 적용 등) 자동 axis + index 전환.
   *  URL idx= 가 mount 후에 변경되거나 차트가 이미 mount 되어있는 경우 useEffect[] 에 잡히지 않으므로
   *  prop 으로 명시적 재설정 받음. 사용자가 차트에서 직접 다른 axis 로 바꾼 후 사례를 다시 적용하면
   *  의도가 명확해서 prop 우선 처리. */
  useEffect(() => {
    if (!forceIndexKey) return;
    const p = MATERIAL_INDICES.find((i) => i.key === forceIndexKey);
    if (!p) return;
    setIndexPreset(forceIndexKey);
    setXProperty(p.x); setYProperty(p.y); setXLog(true); setYLog(true); setIndexThreshold(null);
    toast.success(`Ashby 축 자동 전환: ${p.label}`, {
      description: `X = ${p.x} · Y = ${p.y}. 상단 Index 드롭다운에서 변경 가능.`,
      duration: 5000,
    });
  }, [forceIndexKey]);

  // R61 #6 — 첫 진입 mini-tour. localStorage 'am_ashby_hint_shown' 으로 1회 표시.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('am_ashby_hint_shown')) return;
    const id = setTimeout(() => {
      toast('Ashby 차트 시작 팁', {
        description: '🟣 보라 점선 = 축 한계 슬라이더 · 🔵 청록 점선 = 사이드바 범위 필터 · 🔴 빨간 실선 = Index 임계 · ⚙ 마우스 휠 zoom · 더블클릭 reset',
        duration: 8000,
      });
      try { localStorage.setItem('am_ashby_hint_shown', '1'); } catch { /* ignore */ }
    }, 700);
    return () => clearTimeout(id);
  }, []);

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

  const { data, layout, indexInfo, selectedIds, paretoInfo } = useMemo(() => {
    const inGroup = (m: any) => groupFilter === 'all' || classOf(m).key === groupFilter;
    const inSub = (m: any) => subFilter === 'all' || m.subcategory === subFilter;
    const valid = (m: any) => (tv(m, xProperty) ?? 0) > 0 && (tv(m, yProperty) ?? 0) > 0;
    const inLim = (m: any) => (!xLimit || (tv(m, xProperty)! >= xLimit[0] && tv(m, xProperty)! <= xLimit[1]))
      && (!yLimit || (tv(m, yProperty)! >= yLimit[0] && tv(m, yProperty)! <= yLimit[1]));
    // R88 — X/Y range slider 를 hard filter (AND) 로 적용. 이전엔 'selection window' 였으나 사이드바 family
    //       checkbox 와 직관적으로 일관되지 않아 envelope/marker 가 범위 밖에서 계속 보임.
    // R89 — frame (axis auto-range) 은 inLim 적용 전의 fsetForFrame 기준 → range slider 좁혀도, index
    //       임계값 조정해도 frame 흔들리지 않음. 데이터/envelope/index 만 inLim 통과 fset 사용.
    const fsetForFrame = filtered.filter((m) => valid(m) && inGroup(m) && inSub(m));
    const fset = fsetForFrame.filter(inLim);
    const fsetIds = new Set(fset.map((m) => m.id));
    const others = materials.filter((m) => !fsetIds.has(m.id) && valid(m));

    // ── selection precedence: chart box-select > material-index preset(s) > Compare list ──
    const idx = MATERIAL_INDICES.find((i) => i.key === indexPreset) || null;
    const Mof = (ix: { x: string; y: string; p: number } | null, m: any) => { if (!ix) return null; const xv = tv(m, ix.x), yv = tv(m, ix.y); return xv && yv && xv > 0 && yv > 0 ? Math.pow(yv, ix.p) / xv : null; };
    // resolve every additional index constraint to its preset + auto/median threshold + range (multi-index, ANDed)
    const consInfo = (idx ? constraints : []).map((c) => {
      const cidx = MATERIAL_INDICES.find((i) => i.key === c.key);
      if (!cidx) return null;
      const cMs = fset.map((m) => Mof(cidx, m)).filter((v): v is number => v != null && isFinite(v)).sort((a, b) => a - b);
      const cMin = cMs[0] ?? 0, cMax = cMs[cMs.length - 1] ?? 0;
      const cThr = c.thr ?? (cMs.length ? cMs[Math.floor(cMs.length / 2)] : 0);
      return { key: c.key, label: cidx.label, idx: cidx, thr: cThr, minM: cMin, maxM: cMax, unit: cidx.unit };
    }).filter(Boolean) as { key: string; label: string; idx: { x: string; y: string; p: number }; thr: number; minM: number; maxM: number; unit: string }[];
    let colored: Material[], coldFset: Material[], colorMode = false;
    let indexThr: number | null = null, minM = 0, maxM = 0;
    if (boxedIds.size > 0) {
      colored = fset.filter((m) => boxedIds.has(m.id));
      coldFset = fset.filter((m) => !boxedIds.has(m.id));
      colorMode = colored.length > 0;
      if (!colorMode) colored = fset;
    } else if (idx) {
      const Ms = fset.map((m) => Mof(idx, m)).filter((v): v is number => v != null && isFinite(v)).sort((a, b) => a - b);
      minM = Ms[0] ?? 0; maxM = Ms[Ms.length - 1] ?? 0;
      indexThr = indexThreshold ?? (Ms.length ? Ms[Math.floor(Ms.length / 2)] : 0); // default ≈ median → ~half pass
      const pass = (m: any) => {
        const M = Mof(idx, m); if (!(M != null && M >= indexThr!)) return false;
        for (const c of consInfo) { const Mc = Mof(c.idx, m); if (!(Mc != null && Mc >= c.thr)) return false; }
        return true;
      };
      colored = fset.filter(pass).sort((a, b) => (Mof(idx, b) ?? 0) - (Mof(idx, a) ?? 0));
      coldFset = fset.filter((m) => !pass(m));
      colorMode = colored.length > 0;
    } else {
      const compareSet = new Set(compareList || []);
      colored = fset.filter((m) => compareSet.has(m.id));
      colorMode = compareSet.size > 0 && colored.length > 0;
      if (!colorMode) colored = fset;
      coldFset = colorMode ? fset.filter((m) => !compareSet.has(m.id)) : [];
      // R18 — Index/limit/Compare 가 모두 없어도 좌측 사이드바 필터가 활성화되어 fset 이 좁혀졌으면
      // (filteredMaterials < materials), 통과 재료를 큰 마커·진한 색으로 강조.
      // colorMode=true 로 올려 markerTrace 가 +size·진한 line·진한 opacity 모드로 그려지게 함.
      if (!colorMode && fset.length > 0 && fset.length < materials.length) {
        colorMode = true;
        coldFset = []; // 미통과 (others) 는 별도 trace 로 회색 처리됨 (showContext)
      }
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
    // R50c — customdata 확장: [id, subcategory, process, popularity, verified]. hovertemplate 풍부화.
    // R54b STRONG TDZ PREVENTION — xMeta/yMeta 단일 위치 선언 (이전 R54a 의 alias 제거).
    //   원칙: useMemo block 의 모든 const 는 *최초 사용 직전*에 선언. alias 패턴은 production minify 후
    //   변수 분리·재정렬로 TDZ 재현됨. label/unit 가 필요한 코드 (markerTraces hovertemplate, layout.xaxis,
    //   shortLabel) 가 모두 xMeta/yMeta 를 직접 사용 → 단일 변수만 유지.
    const xMeta = ALL_NUMERIC_PROPERTIES.find((p) => p.key === xProperty);
    const yMeta = ALL_NUMERIC_PROPERTIES.find((p) => p.key === yProperty);
    const verifiedOf = (m: Material) => (m.sources && m.sources.some((s: any) => s.verified)) ? '✓' : '';
    const markerTraces = Array.from(byClass.entries()).sort((a, b) => b[1].ms.length - a[1].ms.length).map(([key, { color, ms }]) => ({
      x: ms.map((m) => tv(m, xProperty)), y: ms.map((m) => tv(m, yProperty)),
      mode: showLabels ? 'markers+text' : 'markers', type: 'scatter', name: `${key} (${ms.length})`,
      textposition: 'top center', textfont: { size: 8, color: '#64748b' },
      marker: { size: colorMode ? markerSize + 4 : markerSize, color, line: { color: darkChart ? '#0f172a' : '#ffffff', width: colorMode ? 1.2 : 0.5 }, opacity: markerOpacity },
      text: ms.map((m) => m.name),
      customdata: ms.map((m) => [m.id, m.subcategory || '', m.process || '', m.popularity ?? 0, verifiedOf(m)]),
      hovertemplate:
        `<b>%{text}</b>` +
        `<br><span style="color:#64748b">%{customdata[1]} · %{customdata[2]}</span>` +
        `<br>${xMeta?.label || xProperty}: <b>%{x:.4g}</b> ${xMeta?.unit || ''}` +
        `<br>${yMeta?.label || yProperty}: <b>%{y:.4g}</b> ${yMeta?.unit || ''}` +
        `<br>인기도: %{customdata[3]:.2f}/5 %{customdata[4]}` +
        `<extra>${key}</extra>`,
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
    // prominent ring + label so a selected (or Compare-clicked) material is always locatable on the chart
    const selX = selM ? tv(selM, xProperty) : null, selY = selM ? tv(selM, yProperty) : null;
    const selMarker = (showSelected && selM && selX != null && selY != null && selX > 0 && selY > 0) ? [{
      x: [selX], y: [selY], type: 'scatter' as const, mode: 'markers+text' as const,
      marker: { size: 20, symbol: 'circle-open', color: darkChart ? '#f8fafc' : '#0f172a', line: { color: darkChart ? '#f8fafc' : '#0f172a', width: 3 } },
      text: [selM.name], textposition: 'top center' as const, textfont: { size: 11, color: darkChart ? '#f8fafc' : '#0f172a' },
      hoverinfo: 'text' as const, hovertext: [selM.name], showlegend: false, cliponaxis: false,
    }] : [];
    // envelopes: hidden if toggled off; one class envelope when a class is selected; else per-material
    let envelopeTraces: any[] = [];
    if (showEnvelopes) envelopeTraces = groupFilter !== 'all' ? [envFromPoints(fset, '#0EA5E9', 0.1, 2.5)].filter(Boolean) : hullTraces;

    // auto-range — R89/R94/R95: X·Y 축을 각자 독립 set 으로 계산 + R95 ranges outlier 를 xDomain/yDomain 안에 clamping.
    // R94 valid(m) = X && Y 둘 다 > 0 조건은 X range 가 Y 도 가진 alloy 의 X 값에 한정되는 문제 야기 → 독립 계산.
    // R95 — ranges 의 hiOf (max) 가 비정상적으로 크거나 (anomaly) typical 의 수십 배인 경우 axis 가 그쪽으로 확장 →
    //        xDomain/yDomain (전체 materials 의 typical min/max) 안으로 강제 clamping. outlier 영향 제거.
    const xRangeSet = filtered.filter((m) => (tv(m, xProperty) ?? 0) > 0 && inGroup(m) && inSub(m));
    const yRangeSet = filtered.filter((m) => (tv(m, yProperty) ?? 0) > 0 && inGroup(m) && inSub(m));
    const xClampLo = xDomain[0] * 0.9, xClampHi = xDomain[1] * 1.1;
    const yClampLo = yDomain[0] * 0.9, yClampHi = yDomain[1] * 1.1;
    const xs = xRangeSet.flatMap((m) => [loOf(m, xProperty), hiOf(m, xProperty)])
      .filter((v): v is number => !!v && v > 0 && v >= xClampLo && v <= xClampHi);
    const ys = yRangeSet.flatMap((m) => [loOf(m, yProperty), hiOf(m, yProperty)])
      .filter((v): v is number => !!v && v > 0 && v >= yClampLo && v <= yClampHi);
    const logRange = (v: number[]) => v.length ? [L(Math.min(...v)) - 0.15, L(Math.max(...v)) + 0.15] : undefined;
    const linRange = (v: number[]) => { if (!v.length) return undefined; const mn = Math.min(...v), mx = Math.max(...v), pad = (mx - mn) * 0.06 || mx * 0.06; return [Math.max(0, mn - pad), mx + pad]; };
    // R90 — fallback: xs/ys 비어있어도 (filter 너무 좁아짐 edge case) 차트가 안 깨지도록 전체 domain 사용.
    const xRangeFallback = xLog ? [L(xDomain[0]) - 0.15, L(xDomain[1]) + 0.15] : [xDomain[0] * 0.9, xDomain[1] * 1.1];
    const yRangeFallback = yLog ? [L(yDomain[0]) - 0.15, L(yDomain[1]) + 0.15] : [yDomain[0] * 0.9, yDomain[1] * 1.1];
    const xRange = (xLog ? logRange(xs) : linRange(xs)) ?? xRangeFallback;
    const yRange = (yLog ? logRange(ys) : linRange(ys)) ?? yRangeFallback;

    // R93 — invisible frame-anchor trace. Plotly 의 doubleClick 'reset' / modeBar resetScale2d 는
    //       layout.range 가 아니라 trace 의 데이터 bbox 로 axis 를 reset 한다. fset 이 inLim 으로 좁아지거나
    //       index pass 가 colored 만 남으면 reset 시 그 좁은 영역으로 zoom-in (R88 사용자 보고 원인).
    //       frame-anchor 의 4 corner 가 항상 fsetForFrame 영역을 cover 하도록 invisible marker 로 plot
    //       → 어떤 reset 동작이든 axis 가 fsetForFrame 의 frame 으로 복원.
    const fAxX = xLog ? [10 ** xRange[0], 10 ** xRange[1]] : [xRange[0], xRange[1]];
    const fAxY = yLog ? [10 ** yRange[0], 10 ** yRange[1]] : [yRange[0], yRange[1]];
    const frameAnchor = {
      x: [fAxX[0], fAxX[1], fAxX[0], fAxX[1]],
      y: [fAxY[0], fAxY[0], fAxY[1], fAxY[1]],
      mode: 'markers' as const, type: 'scatter' as const,
      // R95 — opacity 0 (R94) 은 plotly autorange 가 marker 를 무시하게 만들어 reset 시 다른 trace bbox 로 가는 원인이었음.
      //       opacity 0.001 (시각적 invisible) + size 6 (autorange 가 인식할 충분한 크기) 으로 변경.
      marker: { size: 6, opacity: 0.001, color: 'rgba(0,0,0,0)' },
      hoverinfo: 'skip' as const, showlegend: false, name: '_frame',
    };

    const indexTraces: any[] = [];

    // active-filter selection window + axis limit sliders → reference lines (locked, not draggable)
    const fx = filters && RANGE_FILTER_KEY[xProperty] ? (filters[RANGE_FILTER_KEY[xProperty]] as [number, number] | null) : null;
    const fy = filters && RANGE_FILTER_KEY[yProperty] ? (filters[RANGE_FILTER_KEY[yProperty]] as [number, number] | null) : null;
    const scX = (v: number) => v, scY = (v: number) => v; // Plotly shapes use RAW data coords (it applies log10 internally on log axes)
    if (fx) for (const xv of fx) if (xv > 0) shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: scX(xv), x1: scX(xv), y0: 0, y1: 1, line: { color: '#0066CC', width: 1.5, dash: 'dot' }, editable: false });
    if (fy) for (const yv of fy) if (yv > 0) shapes.push({ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: scY(yv), y1: scY(yv), line: { color: '#0066CC', width: 1.5, dash: 'dot' }, editable: false });
    // 축 한계선: 옅은 보라 짧은 점선 (Index 선의 두꺼운 빨강 실선과 분명히 구분)
    if (xLimit) for (const xv of xLimit) if (xv > 0) shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: scX(xv), x1: scX(xv), y0: 0, y1: 1, line: { color: '#9333ea', width: 1.2, dash: 'dot' }, opacity: 0.7, editable: false });
    if (yLimit) for (const yv of yLimit) if (yv > 0) shapes.push({ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: scY(yv), y1: scY(yv), line: { color: '#9333ea', width: 1.2, dash: 'dot' }, opacity: 0.7, editable: false });
    // Ashby selection line as an EDITABLE shape — drag it up/down to change the index threshold M
    if (idx && indexThr != null && xLog && yLog && xRange) {
      const ilx0 = 10 ** xRange[0], ilx1 = 10 ** xRange[1];
      const iyAt = (xv: number) => Math.pow(indexThr! * xv, 1 / idx.p);
      // Index 선택선: 두꺼운 빨강 (한계선과 시각적으로 구분). 한계선은 보라/얇은 점선.
      shapes.push({ type: 'line', xref: 'x', yref: 'y', x0: scX(ilx0), y0: scY(iyAt(ilx0)), x1: scX(ilx1), y1: scY(iyAt(ilx1)), line: { color: '#dc2626', width: 3, dash: 'solid' } });
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

    // R54b — xMeta/yMeta 는 위 markerTraces 직전에서 이미 단일 선언. alias 제거.
    const gridC = darkChart ? '#1e293b' : '#eef2f7';
    const tickC = darkChart ? '#475569' : '#cbd5e1';
    const fontC = darkChart ? '#cbd5e1' : '#334155';
    const minorAxis = showMinorGrid ? { showgrid: true, gridcolor: darkChart ? '#16203a' : '#f5f8fc', gridwidth: 0.5 } : {};
    // 모바일에서는 마진·폰트·title 축약·범례를 줄여 차트 면적·시인성 확보.
    const mTitleFont = isMobile ? 10 : 12;
    const mTickFont = isMobile ? 9 : 11;
    const mBaseFont = isMobile ? 10 : 12;
    // R37 — 모바일 b 마진 확장 (44→78) — legend 가 X축 아래 horizontal 로 떨어질 때 X축 라벨과 겹침 방지.
    //        데스크탑 t 도 28→36 (legend y=1.07 + envelope group 다수일 때 2줄 여유).
    const mMargin = isMobile ? { l: 50, r: 8, t: 24, b: 78 } : { l: 72, r: 20, t: 36, b: 56 };
    // 모바일에서 단위 축약 — "yield_strength (MPa)" → "σ_y (MPa)" 식으로 짧게.
    const shortLabel = (label: string | undefined, key: string) => {
      if (!isMobile) return label ?? key;
      const map: Record<string, string> = {
        yield_strength: 'σ_y', uts: 'UTS', elongation: 'El.', modulus: 'E',
        hardness: 'HV', density: 'ρ', thermal_conductivity: 'k', thermal_expansion: 'CTE',
        max_service_temp: 'T_max', fatigue_strength: 'σ_f', price_per_kg: 'Price',
      };
      return map[key] ?? label ?? key;
    };
    const layout: any = {
      autosize: true,
      margin: mMargin,
      // R90/R92/R97 — uirevision: xProperty/yProperty/log/groupFilter/subFilter/resetCounter 가 바뀔 때만 axis state reset.
      //       indexPreset · indexThreshold · xLimit · yLimit · compareList 등은 axis state 보존.
      //       R97 — resetCounter 포함: reset axes 클릭 시 onRelayout 핸들러가 ++ 해서 uirevision 변경 →
      //              plotly 가 axis state 폐기 + layout.range 적용 (X/Y property 재선택과 같은 효과).
      xaxis: { title: { text: `${shortLabel(xMeta?.label, xProperty)} (${xMeta?.unit ?? ''})`, font: { size: mTitleFont } }, type: xLog ? 'log' : 'linear', range: xRange, uirevision: `${xProperty}|${xLog}|${groupFilter}|${subFilter}|${resetCounter}`, gridcolor: gridC, showgrid: showGrid, zeroline: false, ticks: 'outside', tickcolor: tickC, tickfont: { size: mTickFont }, minor: minorAxis, automargin: true },
      yaxis: { title: { text: `${shortLabel(yMeta?.label, yProperty)} (${yMeta?.unit ?? ''})`, font: { size: mTitleFont } }, type: yLog ? 'log' : 'linear', range: yRange, uirevision: `${yProperty}|${yLog}|${groupFilter}|${subFilter}|${resetCounter}`, gridcolor: gridC, showgrid: showGrid, zeroline: false, ticks: 'outside', tickcolor: tickC, tickfont: { size: mTickFont }, minor: minorAxis, automargin: true },
      hovermode: 'closest', shapes, annotations: guideAnnotations,
      /* R101 — 모바일: 단일 손가락 pan 기본 활성화 (touch zoom 은 두 손가락 pinch). 데스크탑: zoom 박스 기본. */
      dragmode: isMobile ? 'pan' : 'zoom',
      // 모바일에서는 레전드를 차트 위가 아닌 아래로 옮겨 차트 면적을 보호 (또는 항목 많을 때 토글).
      showlegend: showLegend && (!isMobile || (envelopeTraces.length + markerTraces.length <= 8)),
      // Sprint 2 A2 — 모바일 legend 가시성 향상.
      //   font.size 9→12 (가독성), itemwidth 30 (탭 영역), tracegroupgap 8 (밀집 완화), threshold 6→8.
      legend: isMobile
        ? { orientation: 'h', y: -0.42, x: 0, yanchor: 'top', font: { size: 12, color: fontC }, bgcolor: 'rgba(0,0,0,0)', itemwidth: 30, tracegroupgap: 8 }
        : { orientation: 'h', y: 1.09, x: 0, yanchor: 'bottom', font: { size: 11, color: fontC }, bgcolor: 'rgba(0,0,0,0)' },
      paper_bgcolor: darkChart ? '#0b1220' : '#ffffff', plot_bgcolor: darkChart ? '#0f172a' : '#ffffff',
      font: { family: 'IBM Plex Sans, system-ui, sans-serif', size: mBaseFont, color: fontC },
    };

    const indexInfo = (idx && boxedIds.size === 0) ? { count: colored.length, total: fset.length, thr: indexThr as number, minM, maxM, unit: idx.unit, constraints: consInfo.map((c) => ({ key: c.key, label: c.label, thr: c.thr, minM: c.minM, maxM: c.maxM, unit: c.unit })) } : null;
    const showPts = showMarkers || colorMode; // markers shown if toggled on, or when a selection is active
    // R28 — Pareto frontier trace. fset 에서 valid 점 추출 → frontier 계산 → 별도 trace.
    const paretoTraces: any[] = [];
    let paretoInfo: { count: number; xDir: 'max' | 'min'; yDir: 'max' | 'min' } | null = null;
    if (showPareto && fset.length > 0) {
      const xDir = paretoDir(xProperty);
      const yDir = paretoDir(yProperty);
      const pts = fset.map((m) => {
        const xv = tv(m, xProperty), yv = tv(m, yProperty);
        return (xv != null && yv != null && xv > 0 && yv > 0) ? { x: xv, y: yv, id: m.id, name: m.name } : null;
      }).filter((p): p is { x: number; y: number; id: string; name: string } => p !== null);
      const front = paretoFrontier(pts, xDir, yDir);
      if (front.length > 0) {
        paretoInfo = { count: front.length, xDir, yDir };
        paretoTraces.push({
          x: front.map(p => p.x), y: front.map(p => p.y),
          mode: 'lines+markers', type: 'scatter',
          name: `Pareto frontier (${front.length})`,
          line: { color: '#f59e0b', width: 2.5, dash: 'solid', shape: 'linear' },
          marker: { size: markerSize + 5, color: '#f59e0b', symbol: 'star', line: { color: '#92400e', width: 1.5 }, opacity: 1 },
          text: front.map(p => p.name),
          customdata: front.map(p => p.id),
          hovertemplate: `<b>%{text}</b><br>${xProperty}: %{x:.4g}<br>${yProperty}: %{y:.4g}<extra>Pareto optimum</extra>`,
          showlegend: showLegend,
        });
      }
    }
    const data = [
      // R93 — frame anchor 가 첫 trace (axis range 결정 보장). hoverinfo skip + opacity 0 으로 안 보임.
      frameAnchor,
      ...envelopeTraces,
      ...(showMarkers ? contextTrace : []),
      ...(showPts ? markerTraces : []),
      ...selTrace,
      ...indexTraces,
      ...paretoTraces,  // Pareto 는 가장 위 layer
      ...selMarker,
    ];
    return { data, layout, indexInfo, selectedIds, paretoInfo };
  }, [materials, filtered, xProperty, yProperty, filters, groupFilter, subFilter, selectedId, showEnvelopes, xLog, yLog, compareList, xLimit, yLimit, markerSize, showContext, showGrid, showLabels, showLegend, showGuides, markerOpacity, envOpacity, showMinorGrid, showSelected, darkChart, colorByCategory, indexPreset, indexThreshold, boxedIds, constraints, showMarkers, envelopeBy, envFill, envOutline, isMobile, showPareto, resetCounter]);

  const config = {
    responsive: true, displaylogo: false,
    displayModeBar: true as const,
    /* R101 — modeBar 정리: select2d/lasso2d 는 plotly-dist-min 한계로 동작 불능 + toggleSpikelines 는 의미 불명 → 모두 제거.
       남는 버튼: PNG 저장 · zoom in/out · pan · reset (autoScale2d 는 R90 이전부터 제거 — reset 과 중복). */
    scrollZoom: true,
    modeBarButtonsToRemove: ['autoScale2d', 'select2d', 'lasso2d', 'toggleSpikelines'] as Array<'autoScale2d' | 'select2d' | 'lasso2d' | 'toggleSpikelines'>,
    toImageButtonOptions: { format: 'png', filename: 'ashby_chart', height: 700, width: 1000, scale: 2 },
    // R90 — 'reset' 만 (이전 'reset+autosize' 는 autosize 가 colored marker bbox 에 맞춰 zoom-in 시켜
    //       index pass 가 3개 등 작을 때 빈 영역처럼 보이는 문제 유발). 'reset' 은 layout 의 range 로 복귀.
    doubleClick: 'reset' as const,
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
      {/* R202 #5 — Axis preset chips (자주 사용하는 axis combo 빠른 전환) */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-1 px-2 sm:px-3 py-1.5 border-b border-border bg-muted/30">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex-shrink-0 mr-1">Quick axes</span>
        {[
          { x: 'density',    y: 'yield_strength',         label: 'σy ↔ ρ' },
          { x: 'density',    y: 'modulus',                label: 'E ↔ ρ' },
          { x: 'yield_strength', y: 'fracture_toughness', label: 'K_IC ↔ σy' },
          { x: 'density',    y: 'max_service_temp',       label: 'Tmax ↔ ρ' },
          { x: 'density',    y: 'thermal_conductivity',   label: 'k ↔ ρ' },
          { x: 'price_per_kg', y: 'yield_strength',       label: 'σy ↔ price' },
        ].map(preset => {
          const active = xProperty === preset.x && yProperty === preset.y;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => { setXProperty(preset.x); setYProperty(preset.y); setIndexPreset('none'); setConstraints([]); }}
              className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded border transition-colors ${
                active
                  ? 'bg-accent text-accent-foreground border-accent font-semibold'
                  : 'bg-background text-muted-foreground border-border hover:bg-accent/10 hover:text-accent hover:border-accent/40'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {/* Axis selectors — 메인 노출 유지 (라운드 7에서 popover 로 옮겼다 복구). 각 행: 라벨 + dropdown + log + limit slider.
       *  flex-shrink-0 — 부모 flex-col 에서 toolbar 가 압축돼 overflow 되지 않도록. */}
      <div className="flex-shrink-0 block sm:flex sm:flex-row sm:gap-x-6 px-2 sm:px-3 py-1.5 sm:py-2 border-b border-border space-y-1.5 sm:space-y-0">
        <div className="w-full sm:flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground w-3 flex-shrink-0">X</span>
            <Select value={xProperty} onValueChange={(v) => { setXProperty(v); setIndexPreset('none'); setConstraints([]); }}>
              <SelectTrigger className="h-6 sm:h-7 text-[11px] sm:text-xs flex-1 min-w-0"><SelectValue /></SelectTrigger>
              {/* R209 C-12 — X 에서 현재 Y 항목 비활성화 */}
              <SelectContent>{PROPERTY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} disabled={o.value === yProperty} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none flex-shrink-0"><input type="checkbox" checked={xLog} onChange={(e) => setXLog(e.target.checked)} className="accent-accent" />log</label>
          </div>
          <div className="mt-1 pl-5"><AxisLimitSlider axis="X" color="#9333ea" domain={xDomain} limit={xLimit} log={xLog} onChange={setXLimit} /></div>
        </div>
        <div className="w-full sm:flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground w-3 flex-shrink-0">Y</span>
            <Select value={yProperty} onValueChange={(v) => { setYProperty(v); setIndexPreset('none'); setConstraints([]); }}>
              <SelectTrigger className="h-6 sm:h-7 text-[11px] sm:text-xs flex-1 min-w-0"><SelectValue /></SelectTrigger>
              {/* R209 C-12 — Y 에서 현재 X 항목 비활성화 (y=x 무의미 대각선 방지) */}
              <SelectContent>{PROPERTY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} disabled={o.value === xProperty} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none flex-shrink-0"><input type="checkbox" checked={yLog} onChange={(e) => setYLog(e.target.checked)} className="accent-accent" />log</label>
          </div>
          <div className="mt-1 pl-5"><AxisLimitSlider axis="Y" color="#9333ea" domain={yDomain} limit={yLimit} log={yLog} onChange={setYLimit} /></div>
        </div>
      </div>

      {/* ── Grouping & display ── R101: 한 줄로 단순화. Filter class + Pareto + Display 만 노출.
            Sub-filter / Envelope on-off / Envelope mode 는 Display popover 로 이동.
            (사이드바에 이미 family/subcategory filter 가 있어 차트 헤더에 중복) */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-1 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1.5 border-b border-border">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex-shrink-0 hidden sm:inline">Class</span>
        <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setSubFilter('all'); }}>
          <SelectTrigger className="h-6 sm:h-7 text-[11px] sm:text-xs w-[100px] sm:w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>{groupOptions.map((f) => <SelectItem key={f} value={f} className="text-xs">{f === 'all' ? 'All classes' : f}</SelectItem>)}</SelectContent>
        </Select>
        <span className="w-px h-5 bg-border/70 flex-shrink-0 hidden sm:block" />
        {/* R28 — Pareto frontier 토글 (메인 행에 노출 — 자주 사용). 활성화 시 옆에 N pts 정보 표시. */}
        <label className="flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer select-none" title="Pareto frontier — X·Y 두 물성의 trade-off 외곽선 (gold marker + line)">
          <input type="checkbox" checked={showPareto} onChange={(e) => setShowPareto(e.target.checked)} className="accent-amber-500" />
          <span className="text-amber-700 font-medium">Pareto</span>
          {showPareto && paretoInfo && (
            <span className="text-[10px] text-amber-700/80 hidden md:inline ml-0.5">
              {paretoInfo.count} pts · {paretoInfo.xDir === 'min' ? 'X↓' : 'X↑'} {paretoInfo.yDir === 'min' ? 'Y↓' : 'Y↑'}
            </span>
          )}
        </label>
        <span className="w-px h-5 bg-border/70 flex-shrink-0 hidden sm:block" />
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="text-[11px] sm:text-xs text-muted-foreground hover:text-foreground border border-border rounded px-1.5 sm:px-2 h-6 sm:h-7 flex items-center gap-1">Display ▾</button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 text-xs max-h-[75vh] overflow-auto space-y-3">
            {/* R101 — Class·Sub-family·Envelope on/off + mode 를 Display popover 로 이동 (메인 행 단순화). */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-accent/90 font-semibold">Family filter (chart-local)</div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-12">Class</span>
                <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setSubFilter('all'); }}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{groupOptions.map((f) => <SelectItem key={f} value={f} className="text-xs">{f === 'all' ? 'All classes' : f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-12">Sub</span>
                <Select value={subFilter} onValueChange={setSubFilter} disabled={groupFilter === 'all'}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Sub-family" /></SelectTrigger>
                  <SelectContent>{subOptions.map((f) => <SelectItem key={f} value={f} className="text-xs">{f === 'all' ? 'All families' : cleanSub(f)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t border-border/60" />
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-accent/90 font-semibold">Envelopes</div>
              <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={showEnvelopes} onChange={(e) => setShowEnvelopes(e.target.checked)} className="accent-accent" /> Show envelope</label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-12">Group</span>
                <Select value={envelopeBy} onValueChange={(v) => setEnvelopeBy(v as 'category' | 'class' | 'family')}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category" className="text-xs">All metals/polymers</SelectItem>
                    <SelectItem value="class" className="text-xs">1st-level family</SelectItem>
                    <SelectItem value="family" className="text-xs">Sub-family (2nd)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><div className="flex justify-between text-muted-foreground mb-1"><span>Opacity</span><span className="font-mono">{envOpacity.toFixed(2)}</span></div><Slider min={0.03} max={0.5} step={0.01} value={[envOpacity]} onValueChange={(v: number[]) => setEnvOpacity(v[0])} /></div>
              {([['Fill', envFill, setEnvFill], ['Outline', envOutline, setEnvOutline]] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="accent-accent" /> {label}</label>
              ))}
            </div>
            <div className="border-t border-border/60" />
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-accent/90 font-semibold">Markers</div>
              <div><div className="flex justify-between text-muted-foreground mb-1"><span>Size</span><span className="font-mono">{markerSize}</span></div><Slider min={4} max={16} step={1} value={[markerSize]} onValueChange={(v: number[]) => setMarkerSize(v[0])} /></div>
              <div><div className="flex justify-between text-muted-foreground mb-1"><span>Opacity</span><span className="font-mono">{markerOpacity.toFixed(2)}</span></div><Slider min={0.2} max={1} step={0.05} value={[markerOpacity]} onValueChange={(v: number[]) => setMarkerOpacity(v[0])} /></div>
              {([['Show markers (scatter)', showMarkers, setShowMarkers], ['Point labels', showLabels, setShowLabels], ['Colour by category', colorByCategory, setColorByCategory]] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="accent-accent" /> {label}</label>
              ))}
            </div>
            <div className="border-t border-border/60" />
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-accent/90 font-semibold">Grid &amp; legend</div>
              {([['Gridlines', showGrid, setShowGrid], ['Minor gridlines', showMinorGrid, setShowMinorGrid], ['Ashby guide lines', showGuides, setShowGuides], ['Legend', showLegend, setShowLegend]] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="accent-accent" /> {label}</label>
              ))}
            </div>
            <div className="border-t border-border/60" />
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-accent/90 font-semibold">Appearance</div>
              {([['Filtered-out points', showContext, setShowContext], ['Selected highlight', showSelected, setShowSelected], ['Dark chart', darkChart, setDarkChart]] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="accent-accent" /> {label}</label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {comparing
          ? <span className="text-[10px] sm:text-[11px] font-medium text-accent ml-auto">● {compareList!.length} Compare</span>
          : <span className="text-[11px] text-muted-foreground ml-auto hidden md:inline">Curved envelope = property range</span>}
      </div>

      {/* Ashby material-index selection — pick a performance index, move the selection line by value.
       *  모바일: 슬라이더 숨김, 단위/auto 버튼 축약, dropdown 폭 축소. */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-1 sm:gap-2 px-2 sm:px-4 py-0.5 sm:py-1.5 border-b border-border bg-rose-50/50">
        <span className="text-[10px] text-rose-700 uppercase tracking-wide font-semibold">Index</span>
        <Select value={indexPreset} onValueChange={(v) => { setIndexPreset(v); setConstraints([]); const p = MATERIAL_INDICES.find((i) => i.key === v); if (p) { setXProperty(p.x); setYProperty(p.y); setXLog(true); setYLog(true); setIndexThreshold(null); } }}>
          <SelectTrigger className="h-7 text-xs w-[170px] sm:w-[240px]"><SelectValue placeholder="Material index (off)" /></SelectTrigger>
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
              className="h-7 w-20 sm:w-24 text-xs font-mono rounded border border-border px-1.5 bg-background"
            />
            <span className="text-[10px] text-muted-foreground hidden sm:inline">{indexInfo.unit}</span>
            {/* R99: 모바일에서도 index slider 표시 (이전 hidden md:block) */}
            <div className="flex-1 min-w-[80px] sm:flex-initial sm:w-44"><Slider min={indexInfo.minM} max={indexInfo.maxM} step={(indexInfo.maxM - indexInfo.minM) / 200 || 0.01} value={[Math.min(indexInfo.maxM, Math.max(indexInfo.minM, indexThreshold ?? indexInfo.thr))]} onValueChange={(v: number[]) => setIndexThreshold(v[0])} /></div>
            <span className="text-[11px] font-semibold text-rose-700">{indexInfo.count}/{indexInfo.total} pass</span>
            <button type="button" onClick={() => setIndexThreshold(null)} className="text-[10px] px-1.5 py-0.5 rounded border text-accent border-accent/40 hover:bg-accent/10">auto</button>
            <span className="text-rose-300">·</span>
            {indexInfo.constraints.map((c, ci) => (
              <span key={ci} className="flex items-center gap-1 rounded bg-rose-100/60 border border-rose-200 px-1.5 py-0.5">
                <Select value={c.key} onValueChange={(v) => setConstraints((prev) => prev.map((x, i) => (i === ci ? { key: v, thr: null } : x)))}>
                  <SelectTrigger className="h-6 text-[11px] w-[168px] border-0 bg-transparent px-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MATERIAL_INDICES.filter((i) => i.key === c.key || (i.key !== indexPreset && !constraints.some((x) => x.key === i.key))).map((i) => <SelectItem key={i.key} value={i.key} className="text-xs">{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground">≥</span>
                <input type="number" value={Number((constraints[ci]?.thr ?? c.thr).toPrecision(4))} step={(c.maxM - c.minM) / 100 || 0.1} onChange={(e) => setConstraints((prev) => prev.map((x, i) => (i === ci ? { ...x, thr: e.target.value === '' ? null : Number(e.target.value) } : x)))} className="h-6 w-20 text-[11px] font-mono rounded border border-border px-1 bg-background" />
                <span className="text-[9px] text-muted-foreground">{c.unit}</span>
                <button type="button" onClick={() => setConstraints((prev) => prev.filter((_, i) => i !== ci))} className="text-rose-500 hover:text-rose-700 text-sm leading-none px-0.5" title="Remove constraint">×</button>
              </span>
            ))}
            {MATERIAL_INDICES.some((i) => i.key !== indexPreset && !constraints.some((x) => x.key === i.key)) && (
              <Select value="none" onValueChange={(v) => { if (v !== 'none') setConstraints((prev) => [...prev, { key: v, thr: null }]); }}>
                <SelectTrigger className="h-7 text-xs w-[150px] border-dashed"><SelectValue placeholder="+ constraint" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">+ add constraint…</SelectItem>
                  {MATERIAL_INDICES.filter((i) => i.key !== indexPreset && !constraints.some((x) => x.key === i.key)).map((i) => <SelectItem key={i.key} value={i.key} className="text-xs">{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
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

      {/* Chart — 모바일 min-h 50vh (이전 60vh 는 bottom bar 와 겹침). 데스크탑은 flex-1 자동. */}
      <div className="flex-1 min-h-[50vh] md:min-h-0 p-1 sm:p-2">
        <Plot
          data={data as any}
          layout={layout as any}
          config={config as any}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          onClick={(e: any) => {
            // R50c — customdata 가 array 일 수 있음 (markerTraces) 또는 string (paretoTraces / contextTrace 등).
            const cd = e?.points?.[0]?.customdata;
            const id = Array.isArray(cd) ? cd[0] : cd;
            const m = id && materials.find((x) => x.id === id);
            if (m && onMaterialClick) onMaterialClick(m);
          }}
          {...({
            onSelected: (e: any) => {
              const ids = (e?.points || []).map((p: any) => Array.isArray(p.customdata) ? p.customdata[0] : p.customdata).filter(Boolean);
              if (ids.length) setBoxedIds(new Set(ids));
            },
            onDeselect: () => setBoxedIds(new Set()),
            onRelayout: (e: any) => {
              // R97 — modeBar 🏠 Reset axes / doubleClick reset 감지. plotly 가 reset 시
              //        xaxis.autorange = true 또는 yaxis.autorange = true 를 send.
              //        resetCounter++ → uirevision 변경 → 다음 render 에서 layout.range 강제 적용 (= property 재선택과 같은 효과).
              if (e['xaxis.autorange'] === true || e['yaxis.autorange'] === true) {
                setResetCounter((c) => c + 1);
                return;
              }
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
