/*
 * AM Materials Explorer — Compare Panel
 * Rows = materials, columns = properties (chosen from a dropdown). Shows typical + min–max range,
 * an in-cell horizontal bar (value vs column max) for visual comparison, and click-to-sort headers.
 */

import { useState, useMemo } from 'react';
import { X, SlidersHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import type { Material, PropertyRange } from '@/lib/materials';
import { ALL_NUMERIC_PROPERTIES } from '@/lib/materials';
import { familyColor, propColor } from '@/lib/material-colors';
// R21: Compare 패널에서 온도-강도 그래프 제거. MaterialDetail 의 단일 차트만 유지.

const PALETTE = ['#0066CC', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#ca8a04', '#db2777', '#4f46e5', '#65a30d'];

interface ComparePanelProps {
  materials: Material[];
  onRemove: (id: string) => void;
  onClose: () => void;
  onClear?: () => void; // 전체 비우기
  onSelect?: (m: Material) => void; // click a row → open its detail + locate it on the chart
}

const DEFAULT_COLS = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'price_per_kg', 'total_cost_estimate', 'popularity'];
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 2 : 1));
const typOf = (m: Material, key: string): number | null => {
  const r = (m.ranges || {})[key] as PropertyRange | null | undefined;
  return r?.typical ?? (typeof (m as any)[key] === 'number' ? ((m as any)[key] as number) : null);
};

type Sort = { key: string; dir: 'asc' | 'desc' } | null;

export function ComparePanel({ materials, onRemove, onClose, onClear, onSelect }: ComparePanelProps) {
  const [cols, setCols] = useState<string[]>(DEFAULT_COLS);
  const [sort, setSort] = useState<Sort>(null);
  // R21: tempSeries 제거. 사용자 요청 — Compare 패널에 온도 그래프 불필요.
  const selected = ALL_NUMERIC_PROPERTIES.filter((p) => cols.includes(p.key as string));
  const toggle = (k: string) => setCols((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  // per-column max for the in-cell comparison bars (each property normalised independently)
  const colMax = useMemo(() => {
    const mx: Record<string, number> = {};
    for (const p of selected) {
      const k = p.key as string;
      const vals = materials.map((m) => typOf(m, k)).filter((v): v is number => v != null && v > 0);
      mx[k] = vals.length ? Math.max(...vals) : 0;
    }
    return mx;
  }, [materials, selected]);

  const sortedMaterials = useMemo(() => {
    if (!sort) return materials;
    const arr = [...materials];
    arr.sort((a, b) => {
      if (sort.key === 'name') {
        return sort.dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const av = typOf(a, sort.key), bv = typOf(b, sort.key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // nulls always last
      if (bv == null) return -1;
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [materials, sort]);

  // click cycle: none → desc → asc → none
  const onSort = (key: string) => setSort((s) => (s && s.key === key ? (s.dir === 'desc' ? { key, dir: 'asc' } : null) : { key, dir: 'desc' }));
  const SortIcon = ({ k }: { k: string }) =>
    sort?.key === k ? (sort.dir === 'desc' ? <ArrowDown className="w-3 h-3 inline ml-0.5" /> : <ArrowUp className="w-3 h-3 inline ml-0.5" />) : null;

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-sm font-semibold">
          Material Comparison <span className="text-xs text-muted-foreground font-normal">({materials.length})</span>
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
          {onClear && materials.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
              onClick={() => { if (confirm(`Compare 목록 ${materials.length}개 모두 비우시겠습니까?`)) onClear(); }}
              title="모든 재료를 Compare 에서 제거"
            >전체 비우기</Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground px-4 py-1.5 border-b border-border/50">Click a column header to sort · bar = value vs the highest in that column</p>

      {/* Comparison table: rows = materials, columns = properties.
       *   R29: sticky thead 배경 문제 fix — 모든 th 에 bg-card (이전엔 첫 th 만 bg-muted, 나머지 투명 → 스크롤 시 row 데이터 비침). */}
      <div className="flex-1 overflow-auto">
        <table className="text-xs border-collapse min-w-full">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-card shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08)]">
              <th
                className="text-left px-3 py-2 bg-muted/40 sticky left-0 z-20 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none"
                onClick={() => onSort('name')}
              >
                Material <SortIcon k="name" />
              </th>
              {selected.map((p) => (
                <th
                  key={p.key as string}
                  className="text-right px-3 py-2 font-medium text-foreground min-w-[110px] cursor-pointer hover:bg-muted/40 select-none align-bottom bg-card"
                  onClick={() => onSort(p.key as string)}
                  title={`Sort by ${p.label}`}
                >
                  <span className="block whitespace-normal leading-tight">{p.label}<SortIcon k={p.key as string} /></span>
                  <span className="block text-[10px] font-normal text-muted-foreground mt-0.5 whitespace-normal leading-tight">{p.unit}</span>
                </th>
              ))}
              {selected.length === 0 && <th className="px-3 py-2 text-muted-foreground italic font-normal bg-card">Pick columns →</th>}
            </tr>
          </thead>
          <tbody>
            {sortedMaterials.map((m) => {
              const color = familyColor(m);
              return (
                <tr key={m.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-2 bg-muted/10 sticky left-0 z-10 align-top" style={{ borderLeft: `3px solid ${color}` }}>
                    <div className="flex items-start gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ring-1 ring-background" style={{ background: color }} />
                      <div className="min-w-0 max-w-[150px]">
                        {onSelect ? (
                          <button type="button" onClick={() => onSelect(m)} className="font-semibold text-foreground leading-tight text-left hover:text-accent hover:underline underline-offset-2 cursor-pointer" title="Open detail & locate on chart">{m.name}</button>
                        ) : (
                          <p className="font-semibold text-foreground leading-tight">{m.name}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground truncate">{(m.processes || (m.process ? [m.process] : [])).join(' / ')}</p>
                      </div>
                      <button className="ml-1 text-muted-foreground/60 hover:text-destructive transition-colors flex-shrink-0" onClick={() => onRemove(m.id)} title="Remove">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  {selected.map((p) => {
                    const k = p.key as string;
                    const r = (m.ranges || {})[k] as PropertyRange | null | undefined;
                    const typical = typOf(m, k);
                    const hasRange = !!r && r.max > r.min;
                    const pct = typical != null && colMax[k] > 0 ? Math.max(3, Math.min(100, (typical / colMax[k]) * 100)) : 0;
                    const barColor = propColor(k); // 비슷한 물성(같은 group)은 같은 색으로
                    // 신뢰도 색 점 — Detail 의 뱃지 색과 동일 (NB12)
                    const conf = r?.confidence;
                    const confDot: Record<string, string> = {
                      measured: '#94a3b8',  // foreground/50 슬레이트
                      handbook: '#0284c7',  // sky-600
                      class: '#d97706',     // amber-600
                      derived: '#f43f5e',   // rose-500
                    };
                    const dotColor = conf ? confDot[conf] : null;
                    return (
                      <td key={k} className="px-3 py-2 align-top">
                        {typical == null ? (
                          <span className="text-muted-foreground/60 block text-right font-mono">—</span>
                        ) : (
                          <>
                            <div className="flex items-center justify-end gap-1">
                              {dotColor && <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} title={`신뢰도: ${conf}`} />}
                              <span className="text-right font-mono font-medium text-foreground">{fmt(typical)}</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full bg-muted/40 rounded-sm overflow-hidden">
                              <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: barColor, opacity: 0.85 }} />
                            </div>
                            {hasRange && <div className="text-[10px] text-muted-foreground text-right font-mono mt-0.5">{fmt(r!.min)}–{fmt(r!.max)}</div>}
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
          <p className="text-xs text-muted-foreground italic p-4 text-center">Select materials to compare (up to 30).</p>
        )}
        {/* R21: 온도-강도 그래프 제거 (MaterialDetail 의 단일 재료 차트만 유지). */}
      </div>
    </div>
  );
}
