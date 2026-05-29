/**
 * Advanced Range Slider Component
 * Dual-thumb slider with visual feedback and smooth interaction
 */

import { useState, useRef, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

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
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const range = max - min;
  const minPercent = ((current[0] - min) / range) * 100;
  const maxPercent = ((current[1] - min) / range) * 100;

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

  const handleInputChange = (thumb: 'min' | 'max', val: number) => {
    if (thumb === 'min') {
      onChange([Math.min(val, current[1]), current[1]]);
    } else {
      onChange([current[0], Math.max(val, current[0])]);
    }
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

      {/* Display Values */}
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground bg-muted/30 rounded px-2 py-1">
        <span>{current[0].toFixed(decimals)} {unit}</span>
        <span>–</span>
        <span>{current[1].toFixed(decimals)} {unit}</span>
      </div>

      {/* Visual Slider */}
      <div className="space-y-2">
        <div
          ref={containerRef}
          className="relative h-6 bg-muted rounded-full cursor-pointer group"
          onMouseDown={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const percent = ((e.clientX - rect.left) / rect.width) * 100;
            const newValue = min + (percent / 100) * range;
            
            // Determine which thumb is closer
            const distToMin = Math.abs(newValue - current[0]);
            const distToMax = Math.abs(newValue - current[1]);
            
            if (distToMin < distToMax) {
              handleMouseDown('min');
            } else {
              handleMouseDown('max');
            }
          }}
        >
          {/* Track Fill */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-accent/60 to-accent rounded-full pointer-events-none"
            style={{
              left: `${minPercent}%`,
              right: `${100 - maxPercent}%`,
            }}
          />

          {/* Min Thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-accent rounded-full shadow-md transition-all cursor-grab active:cursor-grabbing ${
              isDragging === 'min' ? 'scale-125 shadow-lg' : 'hover:scale-110'
            }`}
            style={{ left: `${minPercent}%` }}
            onMouseDown={() => handleMouseDown('min')}
          />

          {/* Max Thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-accent rounded-full shadow-md transition-all cursor-grab active:cursor-grabbing ${
              isDragging === 'max' ? 'scale-125 shadow-lg' : 'hover:scale-110'
            }`}
            style={{ left: `${maxPercent}%` }}
            onMouseDown={() => handleMouseDown('max')}
          />
        </div>

        {/* Range Labels */}
        <div className="flex justify-between text-[9px] text-muted-foreground px-1">
          <span>{min.toFixed(decimals)}</span>
          <span>{max.toFixed(decimals)}</span>
        </div>
      </div>

      {/* Input Fields */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[9px] text-muted-foreground block mb-1">Min</label>
          <input
            type="number"
            min={min}
            max={current[1]}
            step={step}
            value={current[0].toFixed(decimals)}
            onChange={(e) => handleInputChange('min', parseFloat(e.target.value))}
            className="w-full px-2 py-1.5 text-[10px] bg-muted border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex-1">
          <label className="text-[9px] text-muted-foreground block mb-1">Max</label>
          <input
            type="number"
            min={current[0]}
            max={max}
            step={step}
            value={current[1].toFixed(decimals)}
            onChange={(e) => handleInputChange('max', parseFloat(e.target.value))}
            className="w-full px-2 py-1.5 text-[10px] bg-muted border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>
    </div>
  );
}
