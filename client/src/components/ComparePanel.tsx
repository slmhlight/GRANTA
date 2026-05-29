/*
 * AM Materials Explorer — Compare Panel
 * Rows = materials, columns = properties (chosen from a dropdown). Shows typical + min–max range.
 */

import { useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import type { Material, PropertyRange } from '@/lib/materials';
import { ALL_NUMERIC_PROPERTIES, CATEGORY_COLORS } from '@/lib/materials';

interface ComparePanelProps {
  materials: Material[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

const DEFAULT_COLS = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness'];
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 2 : 1));

export function ComparePanel({ materials, onRemove, onClose }: ComparePanelProps) {
  const [cols, setCols] = useState<string[]>(DEFAULT_COLS);
  const selected = ALL_NUMERIC_PROPERTIES.filter((p) => cols.includes(p.key as string));
  const toggle = (k: string) => setCols((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-sm font-semibold">
          Material Comparison <span className="text-xs text-muted-foreground font-normal">({materials.length}/4)</span>
        </span>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><SlidersHorizontal className="w-3 h-3" /> Columns</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
              <DropdownMenuLabel className="text-xs">Properties (columns)</DropdownMenuLabel>
              {ALL_NUMERIC_PROPERTIES.map((p) => (
                <DropdownMenuCheckboxItem
                  key={p.key as string}
                  checked={cols.includes(p.key as string)}
                  onCheckedChange={() => toggle(p.key as string)}
                  className="text-xs"
                >
                  {p.label} <span className="text-muted-foreground ml-1">({p.unit})</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* Comparison table: rows = materials, columns = properties */}
      <div className="flex-1 overflow-auto">
        <table className="text-xs border-collapse min-w-full">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 bg-muted/40 sticky left-0 z-20 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Material</th>
              {selected.map((p) => (
                <th key={p.key as string} className="text-right px-3 py-2 font-medium text-foreground whitespace-nowrap">
                  {p.label}
                  <div className="text-[10px] font-normal text-muted-foreground">{p.unit}</div>
                </th>
              ))}
              {selected.length === 0 && <th className="px-3 py-2 text-muted-foreground italic font-normal">Pick columns →</th>}
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => {
              const color = CATEGORY_COLORS[m.category] ?? '#6B7280';
              return (
                <tr key={m.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-2 bg-muted/10 sticky left-0 z-10 align-top">
                    <div className="flex items-start gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                      <div className="min-w-0 max-w-[150px]">
                        <p className="font-semibold text-foreground leading-tight">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{(m.processes || (m.process ? [m.process] : [])).join(' / ')}</p>
                      </div>
                      <button className="ml-1 text-muted-foreground/40 hover:text-destructive transition-colors flex-shrink-0" onClick={() => onRemove(m.id)} title="Remove">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  {selected.map((p) => {
                    const r = (m.ranges || {})[p.key as string] as PropertyRange | null | undefined;
                    const typical = r?.typical ?? (typeof m[p.key] === 'number' ? (m[p.key] as number) : null);
                    const hasRange = !!r && r.max > r.min;
                    return (
                      <td key={p.key as string} className="px-3 py-2 text-right font-mono whitespace-nowrap align-top">
                        {typical == null ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : (
                          <>
                            <span className="font-medium text-foreground">{fmt(typical)}</span>
                            {hasRange && <div className="text-[10px] text-muted-foreground">{fmt(r!.min)}–{fmt(r!.max)}</div>}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {materials.length === 0 && (
          <p className="text-xs text-muted-foreground italic p-4 text-center">Select materials to compare (up to 4).</p>
        )}
      </div>
    </div>
  );
}
