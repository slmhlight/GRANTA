/*
 * AM Materials Explorer — Compare Panel
 * Scientific Precision Design System
 * Side-by-side comparison of up to 4 materials
 */

import { X, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Material } from '@/lib/materials';
import { MECHANICAL_PROPERTIES, PHYSICAL_PROPERTIES, formatValue, CATEGORY_COLORS } from '@/lib/materials';

interface ComparePanelProps {
  materials: Material[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

const COMPARE_PROPS = [
  ...PHYSICAL_PROPERTIES,
  ...MECHANICAL_PROPERTIES,
];

function BarIndicator({ value, max, color }: { value: number | null; max: number; color: string }) {
  if (!value || max === 0) return <div className="h-1.5 bg-border/40 rounded-full w-full" />;
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 bg-border/40 rounded-full w-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function ComparePanel({ materials, onRemove, onClose }: ComparePanelProps) {
  const maxValues: Record<string, number> = {};
  COMPARE_PROPS.forEach(p => {
    const vals = materials.map(m => m[p.key] as number | null).filter(v => v !== null && v !== undefined && v > 0) as number[];
    maxValues[p.key as string] = vals.length > 0 ? Math.max(...vals) : 0;
  });

  return (
    <div className="flex flex-col h-full bg-card border-l border-border detail-panel-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold">Material Comparison</span>
          <span className="text-xs text-muted-foreground">({materials.length}/4)</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Material headers */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex">
            <div className="w-32 flex-shrink-0 px-3 py-2 bg-muted/40 border-r border-border">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Property</span>
            </div>
            {materials.map(m => {
              const color = CATEGORY_COLORS[m.category] ?? '#6B7280';
              return (
                <div key={m.id} className="compare-column flex-1 px-3 py-2 bg-muted/20">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        <span className="text-[9px] text-muted-foreground uppercase">{m.category}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-foreground leading-tight truncate" title={m.name}>
                        {m.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{m.process}</p>
                    </div>
                    <button
                      className="text-muted-foreground/40 hover:text-destructive transition-colors flex-shrink-0 mt-0.5"
                      onClick={() => onRemove(m.id)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Property rows */}
        {COMPARE_PROPS.map(prop => {
          const maxVal = maxValues[prop.key as string];
          return (
            <div key={prop.key as string} className="flex border-b border-border/40 hover:bg-muted/20 transition-colors">
              <div className="w-32 flex-shrink-0 px-3 py-2 bg-muted/10 border-r border-border/40">
                <p className="text-[11px] font-medium text-foreground">{prop.label}</p>
                <p className="text-[10px] text-muted-foreground">{prop.unit}</p>
              </div>
              {materials.map((m, idx) => {
                const val = m[prop.key] as number | null;
                const colors = ['#00A3E0', '#22C55E', '#F59E0B', '#EC4899'];
                const color = colors[idx % colors.length];
                return (
                  <div key={m.id} className="compare-column flex-1 px-3 py-2 space-y-1">
                    <p className="font-mono text-xs font-medium text-foreground">
                      {formatValue(val, 2)}
                      {val !== null && val !== undefined && val > 0 && (
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">{prop.unit}</span>
                      )}
                    </p>
                    <BarIndicator value={val} max={maxVal} color={color} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
