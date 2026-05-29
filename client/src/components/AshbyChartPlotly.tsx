import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Material, ALL_NUMERIC_PROPERTIES } from '@/lib/materials';

interface AshbyChartPlotlyProps {
  materials: Material[];
  filteredMaterials?: Material[];
  onMaterialClick?: (material: Material) => void;
}

const PROPERTY_OPTIONS = ALL_NUMERIC_PROPERTIES.map(p => ({
  value: p.key as string,
  label: `${p.label} (${p.unit})`,
}));

export function AshbyChartPlotly({
  materials,
  filteredMaterials,
  onMaterialClick,
}: AshbyChartPlotlyProps) {
  const [xProperty, setXProperty] = useState('density');
  const [yProperty, setYProperty] = useState('yield_strength');
  
  const filtered = filteredMaterials || materials;

  const traces = useMemo(() => {
    // typical value + asymmetric error bars spanning the property's min~max range
    const tv = (m: any, p: string) => (m[p] ?? m.ranges?.[p]?.typical ?? 0);
    const hiErr = (m: any, p: string) => Math.max(0, (m.ranges?.[p]?.max ?? tv(m, p)) - tv(m, p));
    const loErr = (m: any, p: string) => Math.max(0, tv(m, p) - (m.ranges?.[p]?.min ?? tv(m, p)));

    // Filtered materials (highlighted): marker at typical, error bars = range
    const filteredTrace = {
      x: filtered.map((m) => tv(m, xProperty)),
      y: filtered.map((m) => tv(m, yProperty)),
      error_x: { type: 'data', symmetric: false, array: filtered.map((m) => hiErr(m, xProperty)), arrayminus: filtered.map((m) => loErr(m, xProperty)), thickness: 1, width: 0, color: 'rgba(37,99,235,0.30)' },
      error_y: { type: 'data', symmetric: false, array: filtered.map((m) => hiErr(m, yProperty)), arrayminus: filtered.map((m) => loErr(m, yProperty)), thickness: 1, width: 0, color: 'rgba(37,99,235,0.30)' },
      mode: 'markers',
      type: 'scatter',
      name: 'Filtered (point = typical · bars = range)',
      marker: {
        size: 8,
        color: '#3b82f6',
        opacity: 0.85,
        line: { color: '#1e40af', width: 1 },
      },
      text: filtered.map((m) => m.name),
      hovertemplate: '<b>%{text}</b><br>' + xProperty + ': %{x}<br>' + yProperty + ': %{y}<extra></extra>',
      customdata: filtered.map((m) => m.id),
    };

    // Non-filtered materials (faded)
    const nonFiltered = materials.filter(
      (m) => !filtered.some((f) => f.id === m.id)
    );
    const nonFilteredTrace = {
      x: nonFiltered.map((m) => (m as any)[xProperty] || 0),
      y: nonFiltered.map((m) => (m as any)[yProperty] || 0),
      mode: 'markers',
      type: 'scatter',
      name: 'Other',
      marker: {
        size: 6,
        color: '#9ca3af',
        opacity: 0.2,
      },
      text: nonFiltered.map((m) => m.name),
      hovertemplate: '<b>%{text}</b><br>' + xProperty + ': %{x}<br>' + yProperty + ': %{y}<extra></extra>',
      customdata: nonFiltered.map((m) => m.id),
    };

    return [filteredTrace, nonFilteredTrace];
  }, [materials, filtered, xProperty, yProperty]);

  const xMeta = ALL_NUMERIC_PROPERTIES.find(p => p.key === xProperty);
  const yMeta = ALL_NUMERIC_PROPERTIES.find(p => p.key === yProperty);

  const layout = {
    title: `${xMeta?.label || xProperty} vs ${yMeta?.label || yProperty} (${filtered.length} / ${materials.length} materials)`,
    xaxis: {
      title: `${xMeta?.label || xProperty} (${xMeta?.unit || ''})`,
      type: 'log',
    },
    yaxis: {
      title: `${yMeta?.label || yProperty} (${yMeta?.unit || ''})`,
      type: 'log',
    },
    hovermode: 'closest',
    margin: { l: 100, r: 80, t: 80, b: 100 },
    height: 600,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'ashby_chart.png',
      height: 600,
      width: 900,
      scale: 2,
    },
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow">
      {/* Axis Selection Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">X axis:</span>
          <Select value={xProperty} onValueChange={setXProperty}>
            <SelectTrigger className="h-7 text-xs w-[220px]">
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
          <Select value={yProperty} onValueChange={setYProperty}>
            <SelectTrigger className="h-7 text-xs w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 overflow-auto">
        <Plot
          data={traces as any}
          layout={layout as any}
          config={config as any}
          onClick={(data: any) => {
            if (data.points && data.points[0] && onMaterialClick) {
              const materialId = data.points[0].customdata;
              const material = materials.find((m) => m.id === materialId);
              if (material) onMaterialClick(material);
            }
          }}
        />
      </div>
    </div>
  );
}
