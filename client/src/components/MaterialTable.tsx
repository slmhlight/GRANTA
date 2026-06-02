/*
 * AM Materials Explorer — Material Table View
 * Scientific Precision Design System
 * Sortable table with pagination, row selection, compare checkbox
 */

import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Plus, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Material } from '@/lib/materials';
import { formatValue, CATEGORY_COLORS, SUBCATEGORY_COLORS } from '@/lib/materials';
import { familyColor } from '@/lib/material-colors';

interface MaterialTableProps {
  materials: Material[];
  selectedId: string | null;
  compareList: string[];
  onSelect: (m: Material) => void;
  onToggleCompare: (id: string) => void;
  sortKey: keyof Material;
  sortDir: 'asc' | 'desc';
  onSort: (key: keyof Material) => void;
}

const PAGE_SIZE = 50;

const COLUMNS: Array<{ key: keyof Material; label: string; unit?: string; width: string; mono?: boolean }> = [
  { key: 'name', label: 'Material Name', width: 'min-w-[220px]' },
  { key: 'subcategory', label: 'Family', width: 'min-w-[160px]' },
  { key: 'process', label: 'Process', width: 'min-w-[100px]' },
  { key: 'manufacturer', label: 'Manufacturer', width: 'min-w-[110px]' },
  { key: 'density', label: 'ρ', unit: 'g/cm³', width: 'w-[80px]', mono: true },
  { key: 'yield_strength', label: 'σ_y', unit: 'MPa', width: 'w-[80px]', mono: true },
  { key: 'uts', label: 'UTS', unit: 'MPa', width: 'w-[80px]', mono: true },
  { key: 'elongation', label: 'El.', unit: '%', width: 'w-[70px]', mono: true },
  { key: 'modulus', label: 'E', unit: 'GPa', width: 'w-[70px]', mono: true },
  { key: 'hardness', label: 'HV', unit: '', width: 'w-[70px]', mono: true },
];

function SortIcon({ col, sortKey, sortDir }: { col: keyof Material; sortKey: keyof Material; sortDir: 'asc' | 'desc' }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-accent" />
    : <ChevronDown className="w-3 h-3 text-accent" />;
}

export function MaterialTable({
  materials,
  selectedId,
  compareList,
  onSelect,
  onToggleCompare,
  sortKey,
  sortDir,
  onSort,
}: MaterialTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(materials.length / PAGE_SIZE);
  const pageData = materials.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset to page 0 when materials change
  if (page > 0 && page >= totalPages) {
    setPage(0);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/80 backdrop-blur-sm border-b-2 border-border">
              {/* Compare checkbox col */}
              <th className="w-8 px-2 py-2 text-left">
                <span className="sr-only">Compare</span>
              </th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-left font-semibold text-muted-foreground select-none ${col.width}`}
                >
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => onSort(col.key)}
                  >
                    <span>{col.label}</span>
                    {col.unit && <span className="text-[10px] font-normal text-muted-foreground/60">{col.unit}</span>}
                    <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((m, i) => {
              const isSelected = m.id === selectedId;
              const isCompare = compareList.includes(m.id);
              const catColor = CATEGORY_COLORS[m.category] ?? '#6B7280';
              const subColor = SUBCATEGORY_COLORS[m.subcategory];
              const famColor = familyColor(m);

              return (
                <tr
                  key={m.id}
                  className={`material-row border-b border-border/40 row-animate ${isSelected ? 'selected' : ''}`}
                  style={{ animationDelay: `${Math.min(i, 20) * 20}ms` }}
                  onClick={() => onSelect(m)}
                >
                  {/* Compare toggle */}
                  <td className="px-2 py-1.5" onClick={e => { e.stopPropagation(); onToggleCompare(m.id); }}>
                    <button
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        isCompare
                          ? 'bg-accent border-accent text-accent-foreground'
                          : 'border-border/60 hover:border-accent/60 text-transparent hover:text-accent/40'
                      }`}
                    >
                      {isCompare ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </button>
                  </td>

                  {/* Material name */}
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-background"
                        style={{ background: famColor }}
                        title={m.subcategory}
                      />
                      <span className="font-medium text-foreground truncate max-w-[200px]" title={m.name}>
                        {m.name}
                      </span>
                    </div>
                  </td>

                  {/* Family */}
                  <td className="px-3 py-1.5">
                    <span className="text-muted-foreground truncate block max-w-[150px]" title={m.subcategory}>
                      {m.subcategory}
                    </span>
                  </td>

                  {/* Process */}
                  <td className="px-3 py-1.5">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 font-normal border-border/60 text-muted-foreground"
                    >
                      {m.process}
                    </Badge>
                  </td>

                  {/* Manufacturer */}
                  <td className="px-3 py-1.5 text-muted-foreground">{m.manufacturer}</td>

                  {/* Numeric columns */}
                  <td className="px-3 py-1.5 data-cell text-right">{formatValue(m.density, 2)}</td>
                  <td className="px-3 py-1.5 data-cell text-right">{formatValue(m.yield_strength, 0)}</td>
                  <td className="px-3 py-1.5 data-cell text-right">{formatValue(m.uts, 0)}</td>
                  <td className="px-3 py-1.5 data-cell text-right">{formatValue(m.elongation, 1)}</td>
                  <td className="px-3 py-1.5 data-cell text-right">{formatValue(m.modulus, 0)}</td>
                  <td className="px-3 py-1.5 data-cell text-right">{formatValue(m.hardness, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {materials.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm font-medium">No materials match the current filters</p>
            <p className="text-xs mt-1">Try adjusting or resetting your filter criteria</p>
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
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              «
            </button>
            <button
              className="px-2 py-1 text-[11px] rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ‹
            </button>
            <span className="px-2 text-[11px] font-mono text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <button
              className="px-2 py-1 text-[11px] rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              ›
            </button>
            <button
              className="px-2 py-1 text-[11px] rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
