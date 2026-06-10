/*
 * AM Materials Explorer — Material Table View
 * Scientific Precision Design System
 * Sortable table with pagination, row selection, compare checkbox
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Plus, Check, Minus, BookText } from 'lucide-react';
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
  /** R58 — 일괄 add/remove (현재 page 의 모든 id). add=true → set union, false → set difference. */
  onToggleAll?: (ids: string[], add: boolean) => void;
  sortKey: keyof Material;
  sortDir: 'asc' | 'desc';
  onSort: (key: keyof Material) => void;
  /** R202 #6 — empty state 강화: filter reset / 활성 filter count / 검색어 표시 */
  onResetFilters?: () => void;
  activeFilterCount?: number;
  searchQuery?: string;
}

const PAGE_SIZE = 50;

/* R179 — column 별 default width (px) + minWidth. Mouse drag resize 지원, localStorage 저장. */
const COLUMNS: Array<{ key: keyof Material; label: string; unit?: string; defaultW: number; minW: number; mono?: boolean }> = [
  { key: 'name', label: 'Material Name', defaultW: 280, minW: 150 },
  { key: 'subcategory', label: 'Family', defaultW: 180, minW: 100 },
  { key: 'process', label: 'Process', defaultW: 100, minW: 70 },
  { key: 'manufacturer', label: 'Manufacturer', defaultW: 110, minW: 80 },
  { key: 'density', label: 'ρ', unit: 'g/cm³', defaultW: 80, minW: 60, mono: true },
  { key: 'yield_strength', label: 'σ_y', unit: 'MPa', defaultW: 80, minW: 60, mono: true },
  { key: 'uts', label: 'UTS', unit: 'MPa', defaultW: 80, minW: 60, mono: true },
  { key: 'elongation', label: 'El.', unit: '%', defaultW: 70, minW: 60, mono: true },
  { key: 'modulus', label: 'E', unit: 'GPa', defaultW: 70, minW: 60, mono: true },
  { key: 'hardness', label: 'HV', unit: '', defaultW: 70, minW: 60, mono: true },
];

const COL_WIDTH_STORAGE_KEY = 'mt-col-widths-v1';

function loadColWidths(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(COL_WIDTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveColWidths(widths: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(COL_WIDTH_STORAGE_KEY, JSON.stringify(widths)); } catch {}
}

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
  onToggleAll,
  sortKey,
  sortDir,
  onSort,
  onResetFilters,
  activeFilterCount,
  searchQuery,
}: MaterialTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(materials.length / PAGE_SIZE);
  const pageData = materials.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* R179 — column width state + mouse-drag resize handle.
   * - localStorage 영구 저장 (사용자 별 width 보존).
   * - Min width 통제 (column collapse 회피). */
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => loadColWidths());
  const resizeStartXRef = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const startColResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const col = COLUMNS.find(c => c.key === key);
    if (!col) return;
    const startW = colWidths[key] ?? col.defaultW;
    resizeStartXRef.current = { key, startX: e.clientX, startW };

    const onMove = (ev: MouseEvent) => {
      const ctx = resizeStartXRef.current;
      if (!ctx) return;
      const dw = ev.clientX - ctx.startX;
      const newW = Math.max(col.minW, ctx.startW + dw);
      setColWidths(prev => ({ ...prev, [ctx.key]: newW }));
    };
    const onUp = () => {
      resizeStartXRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      // Save to localStorage at the end of drag
      setColWidths(prev => {
        saveColWidths(prev);
        return prev;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const getColWidth = (key: string): number => {
    const col = COLUMNS.find(c => c.key === key);
    if (!col) return 100;
    return colWidths[key] ?? col.defaultW;
  };

  /* R179 — entry name + family column 의 max-width CSS variable 을 colWidths state 와 연동.
   * MaterialTable 안에서만 적용 (root style 분리). */
  const tableStyle: React.CSSProperties = {
    ['--col-name-w' as string]: `${getColWidth('name') - 40}px`,        // pad + dot + story badge ~ 40px
    ['--col-family-w' as string]: `${getColWidth('subcategory') - 20}px`, // pad ~ 20px
  };

  // Reset to page 0 when materials change
  if (page > 0 && page >= totalPages) {
    setPage(0);
  }

  // R58 — header checkbox 3-state (none / some / all-on-this-page).
  const pageIds = pageData.map(m => m.id);
  const compareSet = new Set(compareList);
  const onPageCount = pageIds.filter(id => compareSet.has(id)).length;
  const headerState: 'none' | 'some' | 'all' =
    onPageCount === 0 ? 'none' : onPageCount === pageIds.length ? 'all' : 'some';
  const headerRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (headerRef.current) headerRef.current.indeterminate = headerState === 'some'; }, [headerState]);
  const toggleAllOnPage = () => {
    if (!onToggleAll) return;
    onToggleAll(pageIds, headerState !== 'all');  // none/some → add, all → remove
  };

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse" style={tableStyle}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/80 backdrop-blur-sm border-b-2 border-border">
              {/* Compare checkbox col — R58 header checkbox */}
              <th className="w-8 px-2 py-2 text-left">
                {onToggleAll ? (
                  <button
                    type="button"
                    onClick={toggleAllOnPage}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      headerState === 'all'
                        ? 'bg-accent border-accent text-accent-foreground'
                        : headerState === 'some'
                          ? 'bg-accent/40 border-accent text-accent-foreground'
                          // R58a — 항상 visible (이전엔 transparent → 사용자 눈에 안 보임 회귀).
                          //        border 진하게 + Plus icon muted-foreground 로 살짝 노출.
                          : 'border-border hover:border-accent text-muted-foreground hover:text-accent bg-background'
                    }`}
                    title={headerState === 'all' ? `현재 페이지 ${pageIds.length}개 모두 해제` : `현재 페이지 ${pageIds.length}개 모두 Compare 에 추가`}
                    aria-label={headerState === 'all' ? '현재 페이지 전체 해제' : '현재 페이지 전체 Compare 추가'}
                  >
                    {headerState === 'all' ? <Check className="w-3 h-3" /> : headerState === 'some' ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  </button>
                ) : (
                  <span className="sr-only">Compare</span>
                )}
              </th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left font-semibold text-muted-foreground select-none relative"
                  style={{ width: getColWidth(col.key), minWidth: col.minW }}
                >
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => onSort(col.key)}
                  >
                    <span>{col.label}</span>
                    {col.unit && <span className="text-[10px] font-normal text-muted-foreground/60">{col.unit}</span>}
                    <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  {/* R179 — column resize handle (draggable right edge) */}
                  <div
                    onMouseDown={(e) => startColResize(col.key as string, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/50 active:bg-accent select-none"
                    title="드래그하여 너비 조절"
                  />
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
                          // R58a — row 체크박스도 항상 visible (이전엔 hover-only Plus icon → 발견 어려움).
                          : 'border-border hover:border-accent text-muted-foreground/60 hover:text-accent bg-background'
                      }`}
                      aria-label={isCompare ? `${m.name} Compare 에서 제거` : `${m.name} Compare 에 추가`}
                    >
                      {isCompare ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </button>
                  </td>

                  {/* Material name + R77 story 뱃지 */}
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-background"
                        style={{ background: famColor }}
                        title={m.subcategory}
                      />
                      {m.story && (
                        <span
                          className="flex-shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full"
                          style={{ background: `${famColor}1f`, boxShadow: `inset 0 0 0 1px ${famColor}55` }}
                          title="개발 스토리·industry-standard 응용 기록 있음 (Process 탭)"
                          aria-label="개발 스토리 있음"
                        >
                          <BookText className="w-2.5 h-2.5" style={{ color: famColor }} />
                        </span>
                      )}
                      <span className="font-medium text-foreground truncate max-w-[var(--col-name-w,320px)]" title={m.name}>
                        {m.name}
                      </span>
                    </div>
                  </td>

                  {/* Family */}
                  <td className="px-3 py-1.5">
                    <span className="text-muted-foreground truncate block max-w-[var(--col-family-w,200px)]" title={m.subcategory}>
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
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <div className="text-4xl opacity-30">🔍</div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">조건에 맞는 재료가 없습니다</p>
              {searchQuery && (
                <p className="text-xs mt-1">검색어: <span className="font-mono text-foreground">"{searchQuery}"</span></p>
              )}
              {activeFilterCount != null && activeFilterCount > 0 && (
                <p className="text-xs mt-1">활성 filter <span className="font-semibold text-foreground">{activeFilterCount}</span>개 적용중</p>
              )}
              <p className="text-xs mt-2 text-muted-foreground/80">아래 추천 시도:</p>
              <ul className="text-xs mt-1.5 space-y-0.5 text-muted-foreground/80">
                <li>• Range slider 범위를 넓혀보세요</li>
                <li>• Process / Composition filter 일부 해제</li>
                <li>• 검색어 단순화 (예: "AISI 304" → "304")</li>
              </ul>
            </div>
            {onResetFilters && activeFilterCount != null && activeFilterCount > 0 && (
              <button
                onClick={onResetFilters}
                className="mt-2 px-4 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
              >
                모든 filter 초기화
              </button>
            )}
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
