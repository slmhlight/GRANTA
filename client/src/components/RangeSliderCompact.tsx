/*
 * Range Slider (compact) — Element Range Filter 안 사용.
 * R44b: 2-input HTML range 슬라이더 → shadcn/Radix Slider dual-thumb. 모바일 터치 충돌 해소.
 * R44c: 입력칸 크게 (h-9), onChange 즉시 clamp 안 함 — onBlur 또는 Enter 시 commit.
 *       잘못된 값 입력 시 일시 허용 + reset 버튼.
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface RangeSliderCompactProps {
  label: string;
  min: number;
  max: number;
  value: [number, number] | null;
  onChange: (v: [number, number] | null) => void;
  step?: number;
  presets?: { label: string; range: [number, number] }[];
}

export function RangeSliderCompact({
  label,
  min,
  max,
  value,
  onChange,
  step = 1,
  presets = [],
}: RangeSliderCompactProps) {
  const current: [number, number] = value ?? [min, max];
  const isActive = value !== null;
  const [showPresets, setShowPresets] = useState(false);
  const [minInput, setMinInput] = useState(current[0].toFixed(1));
  const [maxInput, setMaxInput] = useState(current[1].toFixed(1));

  // Update input fields ONLY when external value changes (not on every keystroke).
  useEffect(() => {
    setMinInput(current[0].toFixed(1));
    setMaxInput(current[1].toFixed(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commitMin = (val: string) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) { setMinInput(current[0].toFixed(1)); return; }
    const clamped = Math.max(min, Math.min(parsed, current[1]));
    onChange([clamped, current[1]]);
    setMinInput(clamped.toFixed(1));
  };
  const commitMax = (val: string) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) { setMaxInput(current[1].toFixed(1)); return; }
    const clamped = Math.min(max, Math.max(parsed, current[0]));
    onChange([current[0], clamped]);
    setMaxInput(clamped.toFixed(1));
  };

  return (
    <div className="space-y-2">
      {/* Header: Label + Reset */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground/90">{label}</label>
        {isActive && (
          <button
            onClick={() => { onChange(null); setShowPresets(false); }}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
            Reset
          </button>
        )}
      </div>

      {/* shadcn Slider — single track + 2 thumbs (touch-friendly Radix UI). */}
      <Slider
        min={min}
        max={max}
        step={step}
        value={current}
        onValueChange={(v) => onChange(v as [number, number])}
        className="py-1"
      />

      {/* Input fields — R44c bigger (h-9), onBlur/Enter commit. */}
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          onBlur={(e) => commitMin(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          step={step}
          className="flex-1 h-9 px-2 text-sm font-mono bg-background border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          placeholder={String(min)}
        />
        <span className="text-[11px] text-muted-foreground font-mono">~</span>
        <input
          type="number"
          inputMode="decimal"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          onBlur={(e) => commitMax(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          step={step}
          className="flex-1 h-9 px-2 text-sm font-mono bg-background border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          placeholder={String(max)}
        />
        {presets.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="h-9 px-2 text-xs font-medium rounded border border-border/50 text-muted-foreground hover:text-foreground hover:border-accent/50 hover:bg-muted/50 transition-colors flex-shrink-0"
              title="Quick presets"
            >
              ⚡
            </button>
            {showPresets && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded shadow-lg z-20 min-w-max">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => { onChange(preset.range); setShowPresets(false); }}
                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted/50 transition-colors first:rounded-t last:rounded-b"
                  >
                    <span className="font-medium">{preset.label}</span>
                    <span className="text-muted-foreground ml-2">
                      {preset.range[0].toFixed(1)}–{preset.range[1].toFixed(1)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between text-[9px] text-muted-foreground/60 font-mono">
        <span>Min: {min.toFixed(1)}</span>
        <span>Max: {max.toFixed(1)}</span>
      </div>
    </div>
  );
}
