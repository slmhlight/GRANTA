/*
 * 수치 범위 슬라이더 (사이드바 물성 필터 1행).
 * R44b: shadcn/Radix Slider dual-thumb 사용 (touch-friendly).
 * R44c: 큰 input box (h-9) + onBlur 또는 Enter commit. 일시 invalid 값 허용.
 */
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface RangeSliderProps {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: [number, number] | null;
  onChange: (v: [number, number] | null) => void;
}

const INPUT_CLS = 'flex-1 min-w-0 h-9 px-1.5 text-center text-sm font-mono tabular-nums bg-background border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

export function RangeSlider({ label, unit, min, max, value, onChange }: RangeSliderProps) {
  const [expanded, setExpanded] = useState(false);
  const current: [number, number] = value ?? [min, max];
  const isActive = value !== null;
  const [minInput, setMinInput] = useState(current[0].toFixed(1));
  const [maxInput, setMaxInput] = useState(current[1].toFixed(1));

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
  const sliderStep = (max - min) / 100;

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-1.5">
          {label}
          {isActive && (
            <span className="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-2 overflow-hidden">
          {/* R46: unit 빈 string 일 때 (popularity 등) 라벨 중복 방지. */}
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
            <span>{current[0].toFixed(1)}{unit ? ' ' + unit : ''}</span>
            <span>{current[1].toFixed(1)}{unit ? ' ' + unit : ''}</span>
          </div>
          {/* R46: thumb 16px translate(-50%) 가 좌우 외부로 8px 씩 튀어나오므로 mx-2 추가. */}
          <Slider
            min={min}
            max={max}
            step={sliderStep}
            value={current}
            onValueChange={(v) => onChange(v as [number, number])}
            className="py-1 mx-2"
          />
          {/* R47: min-w-0 + 작은 padding + spinner 숨김으로 좁은 panel 에서 input 잘림 fix.
                   text 는 가운데 정렬 (font-mono + tabular-nums) — 4.0/5.0 같은 수치가 가지런히. */}
          <div className="flex items-center gap-1.5 min-w-0">
            <input
              type="number"
              inputMode="decimal"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onBlur={(e) => commitMin(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              step={sliderStep}
              placeholder={String(min)}
              className={INPUT_CLS}
            />
            <span className="text-xs text-muted-foreground font-mono flex-shrink-0">~</span>
            <input
              type="number"
              inputMode="decimal"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onBlur={(e) => commitMax(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              step={sliderStep}
              placeholder={String(max)}
              className={INPUT_CLS}
            />
          </div>
          {isActive && (
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => onChange(null)}
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
