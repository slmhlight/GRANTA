/*
 * AM Materials Explorer — Material Card Grid View
 * Scientific Precision Design System
 * Card grid with key property sparklines
 */

import { useState, useEffect } from 'react';
import { Plus, Check, BookText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Material } from '@/lib/materials';
import { formatValue, CATEGORY_COLORS, SUBCATEGORY_COLORS } from '@/lib/materials';
import { familyColor } from '@/lib/material-colors';

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

/* R86 — Card 에 표시할 수 있는 물성 옵션. 각 물성은 (symbol, unit, max, formatDigits, key) 로 정의.
   key 는 Material 의 number 필드. localStorage 'am_card_props' 에 선택 array 저장. */
interface CardPropOpt {
  key: 'yield_strength' | 'uts' | 'elongation' | 'modulus' | 'hardness'
       | 'thermal_conductivity' | 'density' | 'max_service_temp'
       | 'fracture_toughness' | 'fatigue_strength' | 'price_per_kg';
  symbol: string;
  unit: string;
  max: number;
  fmt: number;
}
const CARD_PROP_OPTIONS: CardPropOpt[] = [
  { key: 'yield_strength', symbol: 'σy', unit: 'MPa', max: 2700, fmt: 0 },
  { key: 'uts', symbol: 'UTS', unit: 'MPa', max: 3000, fmt: 0 },
  { key: 'elongation', symbol: 'El', unit: '%', max: 100, fmt: 1 },
  { key: 'modulus', symbol: 'E', unit: 'GPa', max: 500, fmt: 0 },
  { key: 'hardness', symbol: 'HV', unit: '', max: 750, fmt: 0 },
  { key: 'thermal_conductivity', symbol: 'k', unit: 'W/mK', max: 400, fmt: 0 },
  { key: 'density', symbol: 'ρ', unit: 'g/cm³', max: 22, fmt: 2 },
  { key: 'max_service_temp', symbol: 'Tmax', unit: '°C', max: 1500, fmt: 0 },
  { key: 'fracture_toughness', symbol: 'KIC', unit: '', max: 150, fmt: 0 },
  { key: 'fatigue_strength', symbol: 'σf', unit: 'MPa', max: 1500, fmt: 0 },
  { key: 'price_per_kg', symbol: '$/kg', unit: '', max: 500, fmt: 1 },
];
const DEFAULT_CARD_PROPS: CardPropOpt['key'][] = ['yield_strength', 'uts', 'elongation', 'density'];
function loadCardProps(): CardPropOpt['key'][] {
  try {
    const raw = localStorage.getItem('am_card_props');
    if (!raw) return DEFAULT_CARD_PROPS;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_CARD_PROPS;
    const valid = arr.filter((k): k is CardPropOpt['key'] => CARD_PROP_OPTIONS.some(o => o.key === k));
    return valid.length ? valid : DEFAULT_CARD_PROPS;
  } catch { return DEFAULT_CARD_PROPS; }
}

export function MaterialCards({
  materials,
  selectedId,
  compareList,
  onSelect,
  onToggleCompare,
}: MaterialCardsProps) {
  const [page, setPage] = useState(0);
  /* R86 — 표시할 물성 선택 (localStorage 영속). */
  const [selectedProps, setSelectedProps] = useState<CardPropOpt['key'][]>(() => loadCardProps());
  useEffect(() => {
    try { localStorage.setItem('am_card_props', JSON.stringify(selectedProps)); } catch { /* ignore */ }
  }, [selectedProps]);
  const toggleProp = (k: CardPropOpt['key']) => {
    setSelectedProps((prev) => {
      if (prev.includes(k)) return prev.length > 1 ? prev.filter(x => x !== k) : prev;  // 최소 1개 유지
      if (prev.length >= 6) return prev;  // 최대 6개
      return [...prev, k];
    });
  };
  const activeProps = CARD_PROP_OPTIONS.filter(o => selectedProps.includes(o.key))
    .sort((a, b) => selectedProps.indexOf(a.key) - selectedProps.indexOf(b.key));

  const totalPages = Math.ceil(materials.length / PAGE_SIZE);
  const pageData = materials.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (page > 0 && page >= totalPages) setPage(0);

  return (
    <div className="flex flex-col h-full">
      {/* R86 — 컨트롤: 표시 물성 chip toggle. 가로 스크롤로 모바일 대응. */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 border-b border-border/60 bg-muted/20 overflow-x-auto">
        <span className="text-[10px] text-muted-foreground flex-shrink-0">표시:</span>
        {CARD_PROP_OPTIONS.map((opt) => {
          const active = selectedProps.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggleProp(opt.key)}
              title={`${opt.symbol}${opt.unit ? ' (' + opt.unit + ')' : ''}${active ? ' — 해제' : ' — 추가'}`}
              className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                active
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:border-accent/50 hover:text-foreground'
              }`}
            >
              {opt.symbol}
            </button>
          );
        })}
        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 ml-1">{selectedProps.length}/6</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm font-medium">No materials match the current filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {pageData.map((m, i) => {
              const isSelected = m.id === selectedId;
              const isCompare = compareList.includes(m.id);
              const catColor = CATEGORY_COLORS[m.category] ?? '#6B7280';
              const subColor = SUBCATEGORY_COLORS[m.subcategory] ?? catColor;
              const famColor = familyColor(m);

              return (
                <div
                  key={m.id}
                  className={`
                    relative bg-card border rounded-md p-2 sm:p-3 cursor-pointer
                    transition-all duration-150 row-animate
                    hover:shadow-md hover:-translate-y-0.5
                    ${isSelected ? 'border-accent shadow-sm ring-1 ring-accent/30' : 'border-border hover:border-accent/40'}
                  `}
                  style={{ animationDelay: `${Math.min(i, 30) * 15}ms` }}
                  onClick={() => onSelect(m)}
                >
                  {/* Family color band (top) + side stripe */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-md"
                    style={{ background: famColor }}
                  />
                  <div
                    className="absolute top-1 left-0 bottom-0 w-0.5"
                    style={{ background: famColor, opacity: 0.4 }}
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

                  {/* Name + R77 story 뱃지 (R84: amber pill bg + ring 으로 시인성 ↑) */}
                  <p className="text-[11px] font-semibold text-foreground leading-tight pr-5 mb-1 line-clamp-2" title={m.story ? `${m.name} — 개발 스토리·industry-standard 응용 기록 있음 (Process 탭)` : m.name}>
                    {m.story && (
                      <span
                        className="inline-flex items-center justify-center w-4 h-4 mr-1 -mt-0.5 align-middle rounded-full"
                        style={{ background: `${famColor}1f`, boxShadow: `inset 0 0 0 1px ${famColor}55` }}
                        aria-label="개발 스토리 있음"
                      >
                        <BookText className="w-2.5 h-2.5" style={{ color: famColor }} />
                      </span>
                    )}
                    {m.name}
                  </p>

                  {/* Family + Process — 한 줄로 압축 (모바일 정보 밀도 ↑) */}
                  <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                    <span className="text-[10px] text-muted-foreground truncate flex-1 min-w-0">{m.subcategory}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 font-normal border-border/50 text-muted-foreground flex-shrink-0">
                      {m.process}
                    </Badge>
                  </div>

                  {/* R86 — 사용자 선택 물성 (1~6). bar 있는 것 (σy·UTS·El·HV·E·σf) + value only (ρ·k·Tmax·KIC·$). */}
                  <div className="space-y-1">
                    {activeProps.map((opt) => {
                      const v = (m as any)[opt.key] as number | null;
                      const showBar = ['yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'fatigue_strength'].includes(opt.key);
                      return (
                        <div key={opt.key}>
                          <div className="flex justify-between items-baseline gap-1">
                            <span className="text-[9px] text-muted-foreground font-mono">{opt.symbol}</span>
                            <span className="font-mono text-[9px] text-foreground/80 truncate">
                              {formatValue(v, opt.fmt)}{opt.unit ? ` ${opt.unit}` : ''}
                            </span>
                          </div>
                          {showBar && <MiniBar value={v} max={opt.max} color={catColor} />}
                        </div>
                      );
                    })}
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
