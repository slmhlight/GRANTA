/*
 * Advanced Range Slider — R44/R45 통일 패턴.
 * shadcn/Radix Slider dual-thumb + 큰 입력 (h-9) + onBlur/Enter commit + 일시 invalid 허용.
 * 모바일 touch 호환. RangeSliderCompact 와 차이: decimals prop 지원, "Min/Max" 라벨 명시.
 */

import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface RangeSliderAdvancedProps {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: [number, number] | null;
  onChange: (v: [number, number] | null) => void;
  step?: number;
  decimals?: number;
}

export function RangeSliderAdvanced({
  label,
  unit,
  min,
  max,
  value,
  onChange,
  step = 1,
  decimals = 1,
}: RangeSliderAdvancedProps) {
  const current: [number, number] = value ?? [min, max];
  const isActive = value !== null;
  const [minInput, setMinInput] = useState(current[0].toFixed(decimals));
  const [maxInput, setMaxInput] = useState(current[1].toFixed(decimals));

  useEffect(() => {
    setMinInput(current[0].toFixed(decimals));
    setMaxInput(current[1].toFixed(decimals));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals]);

  const commitMin = (val: string) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) { setMinInput(current[0].toFixed(decimals)); return; }
    const clamped = Math.max(min, Math.min(parsed, current[1]));
    onChange([clamped, current[1]]);
    setMinInput(clamped.toFixed(decimals));
  };
  const commitMax = (val: string) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) { setMaxInput(current[1].toFixed(decimals)); return; }
    const clamped = Math.min(max, Math.max(parsed, current[0]));
    onChange([current[0], clamped]);
    setMaxInput(clamped.toFixed(decimals));
  };

  return (
    <div className="space-y-3 py-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground/90">{label}</label>
        {isActive && (
          <button
            className="p-1 hover:bg-muted rounded transition-colors"
            onClick={() => onChange(null)}
            title="Reset to default range"
          >
            <RotateCcw className="w-3 h-3 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Display values */}
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground bg-muted/30 rounded px-2 py-1">
        <span>{current[0].toFixed(decimals)} {unit}</span>
        <span>–</span>
        <span>{current[1].toFixed(decimals)} {unit}</span>
      </div>

      {/* shadcn/Radix Slider — dual-thumb, mobile-safe */}
      <Slider
        min={min}
        max={max}
        step={step}
        value={current}
        onValueChange={(v) => onChange(v as [number, number])}
        className="py-1"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground px-1">
        <span>{min.toFixed(decimals)}</span>
        <span>{max.toFixed(decimals)}</span>
      </div>

      {/* Input fields — R44c: 큰 box (h-9) + onBlur/Enter commit */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[9px] text-muted-foreground block mb-1">Min</label>
          <input
            type="number"
            inputMode="decimal"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={(e) => commitMin(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            step={step}
            placeholder={String(min)}
            className="w-full h-9 px-2 text-sm font-mono bg-background border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
        <div className="flex-1">
          <label className="text-[9px] text-muted-foreground block mb-1">Max</label>
          <input
            type="number"
            inputMode="decimal"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={(e) => commitMax(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            step={step}
            placeholder={String(max)}
            className="w-full h-9 px-2 text-sm font-mono bg-background border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
      </div>
    </div>
  );
}
