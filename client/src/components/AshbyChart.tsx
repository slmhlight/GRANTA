/*
 * AshbyChart.tsx — AM Materials Explorer
 * Scientific Precision Design System
 *
 * Ashby Chart: 2D log-log scatter plot for material selection
 * Features:
 *   - X/Y axis: user-selectable mechanical/physical properties
 *   - Bubble size: optional 3rd property (normalized)
 *   - Color: by category or material family
 *   - Log/linear scale toggle per axis
 *   - Zoom (wheel) + Pan (drag) via data domain manipulation (axes fixed)
 *   - Box zoom: drag to select region
 *   - Reset zoom button
 *   - Click to select material
 *   - Filter synchronization: dim non-matching materials
 *   - Duplicate tick key fix (custom tick arrays)
 */

import {
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Maximize } from 'lucide-react';
import type { Material, PropertyMeta } from '@/lib/materials';
import { MECHANICAL_PROPERTIES, PHYSICAL_PROPERTIES, CATEGORY_COLORS } from '@/lib/materials';

// ── Property options for axes ──────────────────────────────────────────────
const ALL_PROPS: PropertyMeta[] = [...MECHANICAL_PROPERTIES, ...PHYSICAL_PROPERTIES];

const PROPERTY_OPTIONS = ALL_PROPS.map(p => ({
  value: p.key as string,
  label: `${p.label} (${p.unit})`,
  unit: p.unit,
  meta: p,
}));

// ── Color palette ──────────────────────────────────────────────────────────
const SUBCATEGORY_PALETTE = [
  '#1d6fa4','#2196f3','#0d47a1','#4fc3f7',
  '#c45c2e','#ff7043','#bf360c','#ffab91',
  '#2e8b57','#4caf50','#1b5e20','#a5d6a7',
  '#7b3fa0','#9c27b0','#4a148c','#ce93d8',
  '#f9a825','#fbc02d','#e65100','#ffcc02',
  '#00838f','#00bcd4','#006064','#80deea',
];

// ── Tick generators (prevent Recharts duplicate key bug) ───────────────────
function getLogTicks(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min <= 0 || max <= 0) return [];
  if (min === max) return [min];  // Prevent duplicate ticks
  const minExp = Math.floor(Math.log10(min));
  const maxExp = Math.ceil(Math.log10(max));
  const ticks: number[] = [];
  for (let e = minExp; e <= maxExp; e++) {
    for (const m of [1, 2, 5]) {
      const t = m * Math.pow(10, e);
      if (t >= min * 0.9 && t <= max * 1.1) ticks.push(t);
    }
  }
  const seen = new Set<number>();
  return ticks.filter(t => {
    const rounded = Math.round(t * 1e10) / 1e10;  // Round to 10 decimals
    if (seen.has(rounded)) return false;
    seen.add(rounded);
    return true;
  });
}

function getLinearTicks(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [min];  // Prevent duplicate ticks when min === max
  const range = max - min || 1;
  const step = Math.pow(10, Math.floor(Math.log10(range)));
  const ticks: number[] = [];
  for (let t = Math.floor(min / step) * step; t <= max + step * 0.01; t += step) {
    ticks.push(Math.round(t * 1e10) / 1e10);  // Round to avoid floating point errors
  }
  const seen = new Set<number>();
  return ticks.filter(t => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

// ── Custom Dot component ───────────────────────────────────────────────────
interface DotProps {
  cx?: number;
  cy?: number;
  payload?: Material & { _size?: number; _isFiltered?: boolean };
  fill?: string;
  onSelect?: (m: Material) => void;
  selectedId?: string | null;
}

function AshbyDot({ cx, cy, payload, fill, onSelect, selectedId }: DotProps) {
  if (cx === undefined || cy === undefined || !payload) return null;
  const isSelected = selectedId === payload.id;
  const isFiltered = (payload as any)._isFiltered !== false;  // Default to true if not specified
  const r = (payload._size ?? 5) + (isSelected ? 2 : 0);
  
  // Dimmed opacity for non-matching points
  let opacity = 0.75;
  if (!isFiltered) {
    opacity = 0.15;  // Very dim for non-matching
  } else if (isSelected) {
    opacity = 1;  // Full opacity for selected
  }
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      fillOpacity={opacity}
      stroke={isSelected ? '#fff' : 'none'}
      strokeWidth={isSelected ? 1.5 : 0}
      style={{ cursor: 'pointer', transition: 'opacity 150ms ease-out' }}
      onClick={() => onSelect?.(payload)}
    />
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────
interface AshbyTooltipProps {
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  active?: boolean;
  payload?: any[];
}

function AshbyTooltip({ active, payload, xLabel, yLabel, xUnit, yUnit }: AshbyTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const m = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-2.5 text-xs">
      <div className="font-semibold text-foreground mb-1.5">{m.name}</div>
      <div className="space-y-1 text-muted-foreground">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">{xLabel}</span>
          <span className="font-medium">{m._x?.toFixed(2)} {xUnit}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">{yLabel}</span>
          <span className="font-medium">{m._y?.toFixed(2)} {yUnit}</span>
        </div>
        <div className="pt-1 border-t border-border/50 text-muted-foreground">
          {m.category} · {m.manufacturer}
        </div>
      </div>
    </div>
  );
}

// ── Zoom/Pan state (data domain based) ─────────────────────────────────────
interface ZoomState {
  xMin: number | null;
  xMax: number | null;
  yMin: number | null;
  yMax: number | null;
}

const DEFAULT_ZOOM: ZoomState = { xMin: null, xMax: null, yMin: null, yMax: null };

// ── Main component ─────────────────────────────────────────────────────────
interface AshbyChartProps {
  materials: Material[];
  allMaterials?: Material[];  // All materials (for showing dimmed non-matching points)
  onSelect?: (m: Material) => void;
  selectedId?: string | null;
}

export function AshbyChart({ materials, allMaterials, onSelect, selectedId }: AshbyChartProps) {
  const [xProp, setXProp] = useState<string>('modulus');
  const [yProp, setYProp] = useState<string>('yield_strength');
  const [sizeProp, setSizeProp] = useState<string>('density');
  const [colorBy, setColorBy] = useState<'category' | 'subcategory'>('category');
  const [logX, setLogX] = useState(true);
  const [logY, setLogY] = useState(true);
  const [zoom, setZoom] = useState<ZoomState>(DEFAULT_ZOOM);
  const [isBoxZoom, setIsBoxZoom] = useState(false);
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [boxEnd, setBoxEnd] = useState<{ x: number; y: number } | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  const xMeta = PROPERTY_OPTIONS.find(p => p.value === xProp);
  const yMeta = PROPERTY_OPTIONS.find(p => p.value === yProp);
  const sizeMeta = PROPERTY_OPTIONS.find(p => p.value === sizeProp);

  // Set of filtered material IDs for highlighting
  const filteredIds = useMemo(() => {
    return new Set(materials.map(m => m.id));
  }, [materials]);

  // Use all materials if provided, otherwise just use filtered materials
  const displayMaterials = allMaterials || materials;

  // Filter materials with valid x/y values and add highlight flag
  const validMaterials = useMemo(() => {
    return displayMaterials.filter(m => {
      const x = m[xProp as keyof Material];
      const y = m[yProp as keyof Material];
      return (
        typeof x === 'number' && x > 0 &&
        typeof y === 'number' && y > 0
      );
    }).map(m => {
      const xVal = m[xProp as keyof Material] as number;
      const yVal = m[yProp as keyof Material] as number;
      const sizeVal = m[sizeProp as keyof Material];
      const _size = typeof sizeVal === 'number' && sizeVal > 0 ? sizeVal : undefined;
      const _isFiltered = filteredIds.has(m.id);  // Is this material in the filtered set?
      return { ...m, _x: xVal, _y: yVal, _size, _isFiltered };
    });
  }, [displayMaterials, xProp, yProp, sizeProp, filteredIds]);

  // Normalize bubble sizes to 4–14px range
  const sizeNormalized = useMemo(() => {
    const sizes = validMaterials.map(m => m._size).filter((s): s is number => s !== undefined);
    if (sizes.length === 0) return validMaterials;
    const minS = Math.min(...sizes);
    const maxS = Math.max(...sizes);
    const range = maxS - minS || 1;
    return validMaterials.map(m => ({
      ...m,
      _size: m._size !== undefined ? 4 + ((m._size - minS) / range) * 10 : 5,
    }));
  }, [validMaterials]);

  // Group by color key
  const groups = useMemo(() => {
    const map = new Map<string, typeof sizeNormalized>();
    sizeNormalized.forEach(m => {
      const key = colorBy === 'category' ? m.category : m.subcategory;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries());
  }, [sizeNormalized, colorBy]);

  const totalPoints = validMaterials.length;
  const matchingPoints = validMaterials.filter(m => m._isFiltered).length;

  // Compute data range
  const xValues = validMaterials.map(m => m._x);
  const yValues = validMaterials.map(m => m._y);
  const dataXMin = xValues.length > 0 ? Math.min(...xValues) : 0;
  const dataXMax = xValues.length > 0 ? Math.max(...xValues) : 1;
  const dataYMin = yValues.length > 0 ? Math.min(...yValues) : 0;
  const dataYMax = yValues.length > 0 ? Math.max(...yValues) : 1;

  // Apply zoom to domain
  let xMin = zoom.xMin ?? dataXMin;
  let xMax = zoom.xMax ?? dataXMax;
  let yMin = zoom.yMin ?? dataYMin;
  let yMax = zoom.yMax ?? dataYMax;

  // Sanitize domain: ensure min < max with minimum range to prevent collapsed axis
  const sanitizeDomain = (min: number, max: number, isLog: boolean): [number, number] => {
    if (min > max) [min, max] = [max, min];
    if (Math.abs(max - min) < 1e-10) {
      const padding = isLog ? Math.max(min * 0.1, 1e-5) : Math.max(Math.abs(min) * 0.1, 1e-5);
      return [min - padding, min + padding];
    }
    return [min, max];
  };

  [xMin, xMax] = sanitizeDomain(xMin, xMax, logX);
  [yMin, yMax] = sanitizeDomain(yMin, yMax, logY);

  // Compute unique ticks (use sanitized bounds)
  const xValuesInZoom = validMaterials.filter(m => m._x >= xMin && m._x <= xMax).map(m => m._x);
  const yValuesInZoom = validMaterials.filter(m => m._y >= yMin && m._y <= yMax).map(m => m._y);
  const xTicksRaw = logX ? getLogTicks(xValuesInZoom.length > 0 ? xValuesInZoom : [xMin, xMax]) : getLinearTicks(xValuesInZoom.length > 0 ? xValuesInZoom : [xMin, xMax]);
  const yTicksRaw = logY ? getLogTicks(yValuesInZoom.length > 0 ? yValuesInZoom : [yMin, yMax]) : getLinearTicks(yValuesInZoom.length > 0 ? yValuesInZoom : [yMin, yMax]);
  
  // Ensure ticks are unique and sorted (prevent Recharts duplicate key warning)
  const xTicks = Array.from(new Set(xTicksRaw.map(t => Math.round(t * 1e10) / 1e10))).sort((a, b) => a - b);
  const yTicks = Array.from(new Set(yTicksRaw.map(t => Math.round(t * 1e10) / 1e10))).sort((a, b) => a - b);

  // Calculate dynamic guidelines based on current Y range
  const guideline1 = yMin + (yMax - yMin) * 0.3;  // 30% from bottom
  const guideline2 = yMin + (yMax - yMin) * 0.6;  // 60% from bottom

  // ── Zoom/Pan handlers ────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.8 : 1.25; // Zoom in/out
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    
    // Calculate new range
    const newXRange = xRange / zoomFactor;
    const newYRange = yRange / zoomFactor;
    
    // Center the zoom
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;
    
    const newXMin = xCenter - newXRange / 2;
    const newXMax = xCenter + newXRange / 2;
    const newYMin = yCenter - newYRange / 2;
    const newYMax = yCenter + newYRange / 2;
    
    setZoom({ xMin: newXMin, xMax: newXMax, yMin: newYMin, yMax: newYMax });
  }, [xMin, xMax, yMin, yMax]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isBoxZoom || !chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    setBoxStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isBoxZoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isBoxZoom || !boxStart || !chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    setBoxEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isBoxZoom, boxStart]);

  const handleMouseUp = useCallback(() => {
    if (!isBoxZoom || !boxStart || !boxEnd || !chartContainerRef.current) return;
    
    const container = chartContainerRef.current;
    const surface = container.querySelector('.recharts-surface') as SVGElement;
    if (!surface) {
      setBoxStart(null);
      setBoxEnd(null);
      return;
    }
    
    // Get surface bounds relative to container
    const containerRect = container.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const marginLeft = surfaceRect.left - containerRect.left;
    const marginTop = surfaceRect.top - containerRect.top;
    const chartWidth = surfaceRect.width;
    const chartHeight = surfaceRect.height;
    
    // Clamp box coordinates to chart area
    const x1 = Math.max(marginLeft, Math.min(marginLeft + chartWidth, boxStart.x));
    const x2 = Math.max(marginLeft, Math.min(marginLeft + chartWidth, boxEnd.x));
    const y1 = Math.max(marginTop, Math.min(marginTop + chartHeight, boxStart.y));
    const y2 = Math.max(marginTop, Math.min(marginTop + chartHeight, boxEnd.y));
    
    // Convert to chart-relative coordinates
    const chartX1 = x1 - marginLeft;
    const chartX2 = x2 - marginLeft;
    const chartY1 = y1 - marginTop;
    const chartY2 = y2 - marginTop;
    
    // Convert to percentages (0-1)
    const x1Pct = chartX1 / chartWidth;
    const x2Pct = chartX2 / chartWidth;
    const y1Pct = chartY1 / chartHeight;
    const y2Pct = chartY2 / chartHeight;
    
    // Convert to data coordinates
    const minXPct = Math.min(x1Pct, x2Pct);
    const maxXPct = Math.max(x1Pct, x2Pct);
    const minYPct = Math.min(y1Pct, y2Pct);
    const maxYPct = Math.max(y1Pct, y2Pct);
    
    const newXMin = xMin + (xMax - xMin) * minXPct;
    const newXMax = xMin + (xMax - xMin) * maxXPct;
    // Y is inverted in SVG (top=0, bottom=height)
    const newYMax = yMax - (yMax - yMin) * minYPct;
    const newYMin = yMax - (yMax - yMin) * maxYPct;
    
    // Only zoom if selection is meaningful (at least 5% of chart)
    if ((maxXPct - minXPct) > 0.05 && (maxYPct - minYPct) > 0.05) {
      // Ensure zoom bounds are valid before setting
      const [safeXMin, safeXMax] = sanitizeDomain(newXMin, newXMax, logX);
      const [safeYMin, safeYMax] = sanitizeDomain(newYMin, newYMax, logY);
      setZoom({ xMin: safeXMin, xMax: safeXMax, yMin: safeYMin, yMax: safeYMax });
    }
    
    setBoxStart(null);
    setBoxEnd(null);
  }, [isBoxZoom, boxStart, boxEnd, xMin, xMax, yMin, yMax]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ─── Controls ─── */}
      <div className="flex-shrink-0 border-b border-border bg-card p-3 space-y-2">
        {/* Row 1: Axes selection */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium text-foreground/70 whitespace-nowrap">X Axis:</label>
          <Select value={xProp} onValueChange={setXProp}>
            <SelectTrigger className="w-40 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="checkbox"
              id="logX"
              checked={logX}
              onChange={e => setLogX(e.target.checked)}
              className="w-3 h-3 cursor-pointer"
            />
            <label htmlFor="logX" className="text-xs text-foreground/70 cursor-pointer">
              Log
            </label>
          </div>
        </div>

        {/* Row 2: Y axis and size */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium text-foreground/70 whitespace-nowrap">Y Axis:</label>
          <Select value={yProp} onValueChange={setYProp}>
            <SelectTrigger className="w-40 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="checkbox"
              id="logY"
              checked={logY}
              onChange={e => setLogY(e.target.checked)}
              className="w-3 h-3 cursor-pointer"
            />
            <label htmlFor="logY" className="text-xs text-foreground/70 cursor-pointer">
              Log
            </label>
          </div>
        </div>

        {/* Row 3: Size and color */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium text-foreground/70 whitespace-nowrap">Size:</label>
          <Select value={sizeProp} onValueChange={setSizeProp}>
            <SelectTrigger className="w-40 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="text-xs font-medium text-foreground/70 whitespace-nowrap ml-auto">Color:</label>
          <Select value={colorBy} onValueChange={(v: any) => setColorBy(v)}>
            <SelectTrigger className="w-32 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category" className="text-xs">Category</SelectItem>
              <SelectItem value="subcategory" className="text-xs">Family</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 4: Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsBoxZoom(!isBoxZoom)}
            className={`p-1.5 rounded text-xs transition-colors ${
              isBoxZoom
                ? 'bg-accent text-white'
                : 'bg-muted text-foreground/70 hover:bg-muted/80'
            }`}
            title="Box zoom (drag to select region)"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(DEFAULT_ZOOM)}
            className="p-1.5 rounded bg-muted text-foreground/70 hover:bg-muted/80 transition-colors text-xs"
            title="Reset zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowGuidelines(!showGuidelines)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              showGuidelines
                ? 'bg-accent/20 text-accent'
                : 'bg-muted text-foreground/70 hover:bg-muted/80'
            }`}
          >
            Guidelines
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {matchingPoints} / {totalPoints} materials
            </Badge>
          </div>
        </div>
      </div>

      {/* ─── Chart ─── */}
      <div
        ref={chartContainerRef}
        className="flex-1 relative overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {totalPoints > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                ref={chartRef}
                margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                <XAxis
                  type="number"
                  dataKey="_x"
                  name={xMeta?.label}
                  scale={logX ? 'log' : 'linear'}
                  domain={[xMin, xMax]}
                  ticks={xTicks}
                  tickFormatter={t => t.toExponential(0)}
                  label={{ value: xMeta?.label, position: 'insideBottomRight', offset: -10 }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="_y"
                  name={yMeta?.label}
                  scale={logY ? 'log' : 'linear'}
                  domain={[yMin, yMax]}
                  ticks={yTicks}
                  tickFormatter={t => t.toExponential(0)}
                  label={{ value: yMeta?.label, angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  content={props => (
                    <AshbyTooltip
                      {...props}
                      xLabel={xMeta?.label ?? 'X'}
                      yLabel={yMeta?.label ?? 'Y'}
                      xUnit={xMeta?.unit ?? ''}
                      yUnit={yMeta?.unit ?? ''}
                    />
                  )}
                />
                <Legend wrapperStyle={{ paddingTop: 20 }} />
                {showGuidelines && (
                  <>
                    <ReferenceLine
                      y={guideline1}
                      stroke="#f97316"
                      strokeDasharray="3 3"
                      label={{
                        value: `${guideline1.toFixed(1)}`,
                        position: 'right',
                        fill: '#f97316',
                        fontSize: 10,
                        fontWeight: 600,
                        offset: 8,
                      }}
                    />
                    <ReferenceLine
                      y={guideline2}
                      stroke="#ec4899"
                      strokeDasharray="3 3"
                      label={{
                        value: `${guideline2.toFixed(1)}`,
                        position: 'right',
                        fill: '#ec4899',
                        fontSize: 10,
                        fontWeight: 600,
                        offset: 8,
                      }}
                    />
                  </>
                )}
                {groups.map(([groupName, data], idx) => {
                  const color = colorBy === 'category'
                    ? (CATEGORY_COLORS[groupName] ?? SUBCATEGORY_PALETTE[idx % SUBCATEGORY_PALETTE.length])
                    : SUBCATEGORY_PALETTE[idx % SUBCATEGORY_PALETTE.length];
                  return (
                    <Scatter
                      key={groupName}
                      name={groupName}
                      data={data}
                      fill={color}
                      shape={(props: DotProps) => (
                        <AshbyDot
                          {...props}
                          fill={color}
                          onSelect={onSelect}
                          selectedId={selectedId}
                        />
                      )}
                    />
                  );
                })}
              </ScatterChart>
            </ResponsiveContainer>

            {/* Box zoom overlay */}
            {isBoxZoom && boxStart && boxEnd && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(boxStart.x, boxEnd.x),
                  top: Math.min(boxStart.y, boxEnd.y),
                  width: Math.abs(boxEnd.x - boxStart.x),
                  height: Math.abs(boxEnd.y - boxStart.y),
                  border: '2px dashed #0ea5e9',
                  backgroundColor: 'rgba(14, 165, 233, 0.1)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No materials with valid data for selected axes
          </div>
        )}
      </div>
    </div>
  );
}
