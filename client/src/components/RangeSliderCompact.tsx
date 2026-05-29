/*
 * Enhanced Range Slider Component
 * Features: visual range display, min/max input fields, quick presets
 * Design: Scientific Precision with real-time feedback
 */

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

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
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [minInput, setMinInput] = useState(current[0].toFixed(1));
  const [maxInput, setMaxInput] = useState(current[1].toFixed(1));
  const containerRef = useRef<HTMLDivElement>(null);

  const range = max - min;
  const minPercent = ((current[0] - min) / range) * 100;
  const maxPercent = ((current[1] - min) / range) * 100;

  // Update input fields when value changes
  useEffect(() => {
    setMinInput(current[0].toFixed(1));
    setMaxInput(current[1].toFixed(1));
  }, [current]);

  const handleMouseDown = (thumb: 'min' | 'max') => {
    setIsDragging(thumb);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const newValue = min + (percent / 100) * range;

      if (isDragging === 'min') {
        onChange([Math.min(newValue, current[1]), current[1]]);
      } else {
        onChange([current[0], Math.max(newValue, current[0])]);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, current, min, max, range, onChange]);

  const handleMinInput = (val: string) => {
    setMinInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(parsed, current[1]));
      onChange([clamped, current[1]]);
    }
  };

  const handleMaxInput = (val: string) => {
    setMaxInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(parsed, current[0]));
      onChange([current[0], clamped]);
    }
  };

  const handlePresetClick = (presetRange: [number, number]) => {
    onChange(presetRange);
    setShowPresets(false);
  };

  const handleReset = () => {
    onChange(null);
    setShowPresets(false);
  };

  return (
    <div className="space-y-2">
      {/* Header: Label + Status */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground/90">{label}</label>
        {isActive && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
            Reset
          </button>
        )}
      </div>

      {/* Slider */}
      <div
        ref={containerRef}
        className="relative h-5 bg-muted rounded-full cursor-pointer group"
        onMouseDown={(e) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const percent = ((e.clientX - rect.left) / rect.width) * 100;
          const newValue = min + (percent / 100) * range;

          const distToMin = Math.abs(newValue - current[0]);
          const distToMax = Math.abs(newValue - current[1]);

          if (distToMin < distToMax) {
            handleMouseDown('min');
          } else {
            handleMouseDown('max');
          }
        }}
      >
        {/* Track Background */}
        <div className="absolute inset-0 h-5 bg-muted rounded-full" />

        {/* Track Fill */}
        <div
          className="absolute top-0 h-5 bg-gradient-to-r from-accent/50 to-accent rounded-full pointer-events-none transition-all"
          style={{
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        />

        {/* Min Thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-accent rounded-full shadow-md transition-all cursor-grab active:cursor-grabbing ${
            isDragging === 'min' ? 'scale-125 shadow-lg z-10' : 'hover:scale-110'
          }`}
          style={{ left: `${minPercent}%` }}
          onMouseDown={() => handleMouseDown('min')}
          title={`Min: ${current[0].toFixed(1)}`}
        />

        {/* Max Thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-accent rounded-full shadow-md transition-all cursor-grab active:cursor-grabbing ${
            isDragging === 'max' ? 'scale-125 shadow-lg z-10' : 'hover:scale-110'
          }`}
          style={{ left: `${maxPercent}%` }}
          onMouseDown={() => handleMouseDown('max')}
          title={`Max: ${current[1].toFixed(1)}`}
        />
      </div>

      {/* Range Display + Input Fields */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5">
          {/* Min Input */}
          <input
            type="number"
            value={minInput}
            onChange={(e) => handleMinInput(e.target.value)}
            className="w-14 px-2 py-1 text-[10px] bg-muted border border-border/50 rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            step={step}
            min={min}
            max={current[1]}
          />
          <span className="text-[9px] text-muted-foreground font-mono">–</span>
          {/* Max Input */}
          <input
            type="number"
            value={maxInput}
            onChange={(e) => handleMaxInput(e.target.value)}
            className="w-14 px-2 py-1 text-[10px] bg-muted border border-border/50 rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            step={step}
            min={current[0]}
            max={max}
          />
        </div>

        {/* Presets Button */}
        {presets.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="px-2 py-1 text-[9px] font-medium rounded border border-border/50 text-muted-foreground hover:text-foreground hover:border-accent/50 hover:bg-muted/50 transition-colors"
              title="Quick presets"
            >
              ⚡
            </button>

            {/* Presets Dropdown */}
            {showPresets && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded shadow-lg z-20 min-w-max">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetClick(preset.range)}
                    className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-muted/50 transition-colors first:rounded-t last:rounded-b"
                  >
                    <span className="font-medium">{preset.label}</span>
                    <span className="text-muted-foreground ml-2">
                      {preset.range[0].toFixed(1)}-{preset.range[1].toFixed(1)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Range Info */}
      <div className="flex justify-between text-[8px] text-muted-foreground/60 font-mono">
        <span>Min: {min.toFixed(1)}</span>
        <span>Max: {max.toFixed(1)}</span>
      </div>
    </div>
  );
}
