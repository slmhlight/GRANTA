/*
 * AM Materials Explorer — Material Card Grid View
 * Scientific Precision Design System
 * Card grid with key property sparklines
 */

import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Material } from '@/lib/materials';
import { formatValue, CATEGORY_COLORS, SUBCATEGORY_COLORS } from '@/lib/materials';

interface MaterialCardsProps {
  materials: Material[];
  selectedId: string | null;
  compareList: string[];
  onSelect: (m: Material) => void;
  onToggleCompare: (id: string) => void;
}

const PAGE_SIZE = 48;

interface MiniBarProps {
  value: number | null;
  max: number;
  color: string;
}

function MiniBar({ value, max, color }: MiniBarProps) {
  if (!value || max === 0) return <div className="h-1 bg-border/30 rounded-full w-full" />;
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1 bg-border/30 rounded-full w-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// Approximate max values for bar scaling
const PROP_MAX: Record<string, number> = {
  yield_strength: 2700,
  uts: 3000,
  elongation: 100,
  hardness: 750,
};

export function MaterialCards({
  materials,
  selectedId,
  compareList,
  onSelect,
  onToggleCompare,
}: MaterialCardsProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(materials.length / PAGE_SIZE);
  const pageData = materials.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (page > 0 && page >= totalPages) setPage(0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm font-medium">No materials match the current filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {pageData.map((m, i) => {
              const isSelected = m.id === selectedId;
              const isCompare = compareList.includes(m.id);
              const catColor = CATEGORY_COLORS[m.category] ?? '#6B7280';
              const subColor = SUBCATEGORY_COLORS[m.subcategory] ?? catColor;

              return (
                <div
                  key={m.id}
                  className={`
                    relative bg-card border rounded-md p-3 cursor-pointer
                    transition-all duration-150 row-animate
                    hover:shadow-md hover:-translate-y-0.5
                    ${isSelected ? 'border-accent shadow-sm ring-1 ring-accent/30' : 'border-border hover:border-accent/40'}
                  `}
                  style={{ animationDelay: `${Math.min(i, 30) * 15}ms` }}
                  onClick={() => onSelect(m)}
                >
                  {/* Category indicator */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5 rounded-t-md"
                    style={{ background: subColor }}
                  />

                  {/* Compare button */}
                  <button
                    className={`
                      absolute top-2 right-2 w-5 h-5 rounded border flex items-center justify-center
                      transition-all text-[10px]
                      ${isCompare
                        ? 'bg-accent border-accent text-accent-foreground'
                        : 'border-border/40 hover:border-accent/60 text-transparent hover:text-accent/40 bg-card'
                      }
                    `}
                    onClick={e => { e.stopPropagation(); onToggleCompare(m.id); }}
                  >
                    {isCompare ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                  </button>

                  {/* Name */}
                  <p className="text-[11px] font-semibold text-foreground leading-tight pr-5 mb-1 line-clamp-2" title={m.name}>
                    {m.name}
                  </p>

                  {/* Family */}
                  <p className="text-[10px] text-muted-foreground truncate mb-2">{m.subcategory}</p>

                  {/* Process badge */}
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 font-normal border-border/50 text-muted-foreground mb-2">
                    {m.process}
                  </Badge>

                  {/* Key properties */}
                  <div className="space-y-1.5 mt-2">
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[9px] text-muted-foreground">σ_y</span>
                        <span className="font-mono text-[9px] text-foreground/80">{formatValue(m.yield_strength, 0)} MPa</span>
                      </div>
                      <MiniBar value={m.yield_strength} max={PROP_MAX.yield_strength} color={catColor} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[9px] text-muted-foreground">El.</span>
                        <span className="font-mono text-[9px] text-foreground/80">{formatValue(m.elongation, 1)}%</span>
                      </div>
                      <MiniBar value={m.elongation} max={PROP_MAX.elongation} color={catColor} />
                    </div>
                  </div>

                  {/* Density */}
                  <div className="mt-2 pt-2 border-t border-border/40 flex justify-between">
                    <span className="text-[9px] text-muted-foreground">ρ</span>
                    <span className="font-mono text-[9px] text-foreground/80">{formatValue(m.density, 2)} g/cm³</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 flex-shrink-0">
          <p className="text-[11px] text-muted-foreground font-mono">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, materials.length)} of {materials.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-1 text-[11px] rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ‹ Prev
            </button>
            <span className="px-2 text-[11px] font-mono text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <button
              className="px-2 py-1 text-[11px] rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
