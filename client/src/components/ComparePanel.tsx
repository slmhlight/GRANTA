/*
 * AM Materials Explorer — Compare Panel
 * Rows = materials, columns = properties (chosen from a dropdown). Shows typical + min–max range,
 * an in-cell horizontal bar (value vs column max) for visual comparison, and click-to-sort headers.
 */

import { useState, useMemo, useRef } from 'react';
import { useT, useLang } from '@/lib/i18n';
import { X, SlidersHorizontal, ArrowUp, ArrowDown, Download, FileImage, Hexagon, Table as TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import type { Material, PropertyRange } from '@/lib/materials';
import { ALL_NUMERIC_PROPERTIES } from '@/lib/materials';
import { familyColor, propColor } from '@/lib/material-colors';
import { formatPrice, loadUnitSystem } from '@/lib/unit-convert';
import { RadarChart, RadarConfig, DEFAULT_RADAR_AXES, type RadarAxis } from '@/components/RadarChart';
import GoodmanChart from '@/components/GoodmanChart';
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
  const t = useT();
  const { lang } = useLang();
  const sysUnits = loadUnitSystem();
  // R50d — export 대상 (table) ref + busy state.
  const tableRef = useRef<HTMLDivElement>(null);
  // R69 G — 사용자 가중치 score (강도·강성·경량·저가). 합 = 100%. score = Σ(w_i · normalized).
  const [weights, setWeights] = useState({ strength: 40, stiffness: 20, light: 20, cheap: 20 });
  const wSum = weights.strength + weights.stiffness + weights.light + weights.cheap || 1;
  const computeScore = (m: Material): number => {
    const ys = typOf(m, 'yield_strength') || 0;
    const E = typOf(m, 'modulus') || 0;
    const rho = typOf(m, 'density') || 1;
    const price = typOf(m, 'price_per_kg') || 0;
    return (
      (weights.strength / wSum) * ys +
      (weights.stiffness / wSum) * E +
      (weights.light / wSum) * (100 / rho) +
      (weights.cheap / wSum) * (price > 0 ? 100 / price : 0)
    );
  };
  const [exporting, setExporting] = useState(false);
  // R53a — Radar view mode (table | radar) + radar axes + focus
  const [viewMode, setViewMode] = useState<'table' | 'radar' | 'goodman'>('table');
  const [radarAxes, setRadarAxes] = useState<RadarAxis[]>(() => {
    try { const s = localStorage.getItem('am_radar_axes'); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length >= 3) return p; } } catch { /* ignore */ }
    return DEFAULT_RADAR_AXES;
  });
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const RADAR_MAX = 20;
  const radarDisabled = materials.length > RADAR_MAX;
  const updateRadarAxes = (a: RadarAxis[]) => { setRadarAxes(a); try { localStorage.setItem('am_radar_axes', JSON.stringify(a)); } catch { /* ignore */ } };
  // PALETTE - 색상 풀
  const COLORS = ['#0066CC', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#ca8a04', '#db2777', '#4f46e5', '#65a30d', '#06b6d4', '#a855f7', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#f97316', '#8b5cf6', '#22c55e', '#eab308'];
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

  // R50d — CSV export. material × selected columns 표 + UTF-8 BOM (Excel KO 호환).
  const exportCSV = () => {
    if (sortedMaterials.length === 0) return;
    const headers = ['Material', 'Family', 'Process', ...selected.map((p) => `${p.label} (${p.unit})`)];
    const rows = sortedMaterials.map((m) => {
      const row: (string | number)[] = [m.name, m.subcategory || '', m.process || ''];
      for (const p of selected) {
        const k = p.key as string;
        const v = typOf(m, k);
        const r = (m.ranges || {})[k] as PropertyRange | null | undefined;
        if (v == null) row.push('');
        else if (r && r.max > r.min) row.push(`${fmt(v)} [${fmt(r.min)}-${fmt(r.max)}]`);
        else row.push(fmt(v));
      }
      return row;
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compare-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // R50d — PNG export (html2canvas). Compare 패널 table 영역만 캡쳐.
  const exportPNG = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(tableRef.current, { scale: 2, backgroundColor: '#ffffff', logging: false });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compare-${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  /** R69 C — PDF 출력 (window.print). 사용자가 브라우저 "PDF 로 저장" 선택. */
  const exportPDF = () => {
    // body 에 'compare-print' class 부여 → @media print CSS 가 Compare 만 표시
    document.body.classList.add('compare-print');
    window.print();
    setTimeout(() => document.body.classList.remove('compare-print'), 1000);
  };

  /* ───────── R69 B — Best-pick badges ───────── */
  const bestPicks = (() => {
    if (sortedMaterials.length < 2) return null;
    const pickMax = (key: string) => sortedMaterials.reduce((best, m) => {
      const v = typOf(m, key);
      const bv = best ? typOf(best, key) : null;
      if (v != null && (bv == null || v > bv)) return m;
      return best;
    }, null as Material | null);
    const pickMin = (key: string) => sortedMaterials.reduce((best, m) => {
      const v = typOf(m, key);
      const bv = best ? typOf(best, key) : null;
      if (v != null && v > 0 && (bv == null || v < bv)) return m;
      return best;
    }, null as Material | null);
    const pickRatio = (numKey: string, denKey: string) => sortedMaterials.reduce((best, m) => {
      const n = typOf(m, numKey), d = typOf(m, denKey);
      const bn = best ? typOf(best, numKey) : null, bd = best ? typOf(best, denKey) : null;
      if (n != null && d != null && d > 0 && (bn == null || bd == null || bd <= 0 || (n / d) > (bn / bd))) return m;
      return best;
    }, null as Material | null);
    return {
      strength: pickMax('yield_strength'),
      stiffness: pickMax('modulus'),
      specStrength: pickRatio('yield_strength', 'density'),
      specStiffness: pickRatio('modulus', 'density'),
      cheap: pickMin('price_per_kg'),
      hard: pickMax('hardness'),
    };
  })();

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-sm font-semibold">
          {t('compare.title')} <span className="text-xs text-muted-foreground font-normal">({materials.length})</span>
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
          {/* R53a — Radar 모드 토글 (material 2개+ , 20개 이하 일 때만 활성) */}
          {materials.length > 0 && (
            <Button
              variant={viewMode === 'radar' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setViewMode(v => v === 'radar' ? 'table' : 'radar')}
              disabled={radarDisabled}
              title={radarDisabled ? `Radar 비활성 — ${materials.length} > ${RADAR_MAX} 개 (overlay 너무 복잡)` : viewMode === 'radar' ? 'Table 로 전환' : 'Radar 오버레이로 전환'}
            >
              {viewMode === 'radar' ? <TableIcon className="w-3 h-3" /> : <Hexagon className="w-3 h-3" />}
              {viewMode === 'radar' ? 'Table' : 'Radar'}
            </Button>
          )}
          {/* R67 Sprint C — Goodman diagram 토글 */}
          {materials.length > 0 && (
            <Button
              variant={viewMode === 'goodman' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setViewMode(v => v === 'goodman' ? 'table' : 'goodman')}
              title={viewMode === 'goodman' ? 'Table 로 전환' : 'Goodman diagram (피로 평균응력)'}
            >
              σ<sub>a</sub>·σ<sub>m</sub>
            </Button>
          )}
          {/* R50d — CSV / PNG export 버튼 (material 1개 이상 일 때만) */}
          {materials.length > 0 && (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={exportCSV} title="CSV 로 내보내기">
                <Download className="w-3 h-3" /> CSV
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={exportPNG} disabled={exporting} title="PNG 이미지로 내보내기">
                <FileImage className="w-3 h-3" /> {exporting ? '...' : 'PNG'}
              </Button>
              {/* R69 C — PDF (window.print) */}
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={exportPDF} title="PDF 로 출력 (인쇄 → PDF로 저장)">
                📄 PDF
              </Button>
            </>
          )}
          {onClear && materials.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
              onClick={() => { if (confirm(`Compare 목록 ${materials.length}개 모두 비우시겠습니까?`)) onClear(); }}
              title="모든 재료를 Compare 에서 제거"
            >{t('compare.clearAll')}</Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground px-4 py-1.5 border-b border-border/50">{t('compare.hint')}</p>
      {/* R69 G — 가중치 score 슬라이더 + Top-3 ranking. */}
      {sortedMaterials.length >= 2 && (
        <div className="px-4 py-2 border-b border-border/50 bg-sky-50/30">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">⚖ 가중치 종합 score</span>
            <span className="text-[9px] text-muted-foreground">합 {wSum}%</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-1.5">
            {[
              { key: 'strength', label: '강도 σy', max: 100 },
              { key: 'stiffness', label: '강성 E', max: 100 },
              { key: 'light', label: '경량 1/ρ', max: 100 },
              { key: 'cheap', label: '저가 1/$', max: 100 },
            ].map(s => (
              <label key={s.key} className="text-[10px] text-foreground/70">
                <div className="flex justify-between">
                  <span>{s.label}</span>
                  <span className="font-mono">{(weights as any)[s.key]}%</span>
                </div>
                <input
                  type="range" min={0} max={s.max} step={5}
                  value={(weights as any)[s.key]}
                  onChange={(e) => setWeights(w => ({ ...w, [s.key]: +e.target.value }))}
                  className="w-full h-1"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {sortedMaterials.map(m => ({ m, score: computeScore(m) })).sort((a, b) => b.score - a.score).slice(0, 3).map((r, i) => (
              <span key={r.m.id} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 border ${
                i === 0 ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold'
                : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}>
                <b>{['🥇', '🥈', '🥉'][i]}</b>
                <span className="font-mono truncate max-w-[140px]">{r.m.name}</span>
                <span className="text-[9px] opacity-70">({r.score.toFixed(0)})</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {/* R69 B — Best-pick badges (sortedMaterials >= 2). */}
      {bestPicks && (
        <div className="px-4 py-2 border-b border-border/50 bg-amber-50/40 flex flex-wrap gap-2 text-[11px]">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">🏆 Best-pick:</span>
          {[
            { l: '최대 강도 σy', m: bestPicks.strength, c: 'rose' },
            { l: '최대 강성 E', m: bestPicks.stiffness, c: 'sky' },
            { l: '비강도 σy/ρ', m: bestPicks.specStrength, c: 'rose' },
            { l: '비강성 E/ρ', m: bestPicks.specStiffness, c: 'sky' },
            { l: '최저 가격', m: bestPicks.cheap, c: 'emerald' },
            { l: '최대 경도', m: bestPicks.hard, c: 'violet' },
          ].filter(b => b.m).map((b, i) => (
            <span key={i} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 border ${
              b.c === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-200'
              : b.c === 'sky' ? 'bg-sky-50 text-sky-700 border-sky-200'
              : b.c === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-violet-50 text-violet-700 border-violet-200'
            }`}>
              <b>{b.l}:</b> <span className="font-mono truncate max-w-[120px]">{b.m!.name}</span>
            </span>
          ))}
        </div>
      )}

      {/* R67 Sprint C — Goodman diagram view */}
      {viewMode === 'goodman' && materials.length > 0 && (
        <GoodmanChart
          materials={sortedMaterials}
          series={sortedMaterials.map((m, i) => ({
            id: m.id,
            name: m.name,
            color: familyColor(m) || PALETTE[i % PALETTE.length],
            material: m,
          }))}
        />
      )}

      {/* R53a — Radar overlay 모드 (viewMode === 'radar'). Compare 의 모든 alloy 가 같은 radar 위에 overlay.
           legend 클릭 시 focus mode (선택 1.0 / 나머지 0.15). 다시 클릭하면 해제. */}
      {viewMode === 'radar' && materials.length > 0 && !radarDisabled && (
        <div ref={tableRef} className="flex-1 overflow-auto p-4 flex flex-col items-center gap-3">
          <RadarConfig
            axes={radarAxes}
            onAxesChange={updateRadarAxes}
            normalizeBase={'set'}
            onNormalizeChange={() => {/* Compare 는 set 만 사용 */}}
            isCompareSet
          />
          <RadarChart
            series={sortedMaterials.map((m, i) => {
              // Sprint2 A5 — family color 사용 (같은 family 끼리 색 통일).
              //   같은 family 안 다중 alloy 구별 위해 인덱스 기반 lightness 변형 추가.
              const baseColor = familyColor(m);
              const familyIdx = sortedMaterials.filter((x, xi) => xi < i && familyColor(x) === baseColor).length;
              const variant = familyIdx === 0 ? baseColor : (familyIdx === 1 ? COLORS[(i + 7) % COLORS.length] : COLORS[(i + 13) % COLORS.length]);
              return { id: m.id, name: m.name, color: variant, material: m };
            })}
            axes={radarAxes}
            normalizeBase="set"
            size={Math.min(400, window.innerWidth - 64)}
            focusedId={focusedId}
            onLegendClick={(id) => setFocusedId(prev => prev === id ? null : id)}
          />
          {focusedId && (
            <button
              type="button"
              onClick={() => setFocusedId(null)}
              className="text-[11px] text-accent hover:underline"
            >
              focus 해제 (모두 표시)
            </button>
          )}
        </div>
      )}

      {/* Comparison table: rows = materials, columns = properties.
       *   R29: sticky thead 배경 문제 fix — 모든 th 에 bg-card (이전엔 첫 th 만 bg-muted, 나머지 투명 → 스크롤 시 row 데이터 비침). */}
      {viewMode === 'table' && (
      <div ref={tableRef} className="flex-1 overflow-auto">
        <table className="text-xs border-collapse min-w-full">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-card shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08)]">
              <th
                className="text-left px-3 py-2 bg-card sticky left-0 z-20 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none border-r border-border/40"
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
                  <span className="block text-[10px] font-normal text-muted-foreground mt-0.5 whitespace-normal leading-tight">{/USD\//.test(p.unit || '') ? (lang === 'ko' ? `₩${(p.unit || '').replace(/^USD/, '')}` : p.unit) : p.unit}</span>
                </th>
              ))}
              {selected.length === 0 && (
                <th className="px-3 py-2 bg-card">
                  {/* R63 F — empty state 강화: "어디서 추가하나요" 명시. 첫 사용자 미발견 회귀 방지. */}
                  <span className="flex items-center gap-1.5 text-xs text-amber-700 font-normal not-italic">
                    <SlidersHorizontal className="w-3.5 h-3.5 animate-pulse" /> 좌측 상단 <b>Columns</b> 에서 비교할 물성 선택 →
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedMaterials.map((m) => {
              const color = familyColor(m);
              return (
                <tr key={m.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-2 bg-card sticky left-0 z-10 align-top border-r border-border/40" style={{ borderLeft: `3px solid ${color}` }}>
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
                    const barColor = propColor(k);
                    const conf = r?.confidence;
                    const confDot: Record<string, string> = {
                      measured: '#94a3b8', handbook: '#0284c7', class: '#d97706', derived: '#f43f5e',
                    };
                    const dotColor = conf ? confDot[conf] : null;
                    // R40b — price 셀은 formatPrice 로 USD/KRW + kg/lb 자동 변환.
                    const isPrice = /USD\//.test(p.unit || '') || /price/.test(k);
                    const priceUnit: 'kg' | 'cm3' = (p.unit || '').includes('cm³') || (p.unit || '').includes('cm3') || k.includes('cm3') ? 'cm3' : 'kg';
                    const typStr = isPrice && typical != null ? formatPrice(typical, lang, sysUnits, priceUnit) : (typical != null ? fmt(typical) : null);
                    const minStr = isPrice && r ? formatPrice(r.min, lang, sysUnits, priceUnit) : (r ? fmt(r.min) : null);
                    const maxStr = isPrice && r ? formatPrice(r.max, lang, sysUnits, priceUnit) : (r ? fmt(r.max) : null);
                    return (
                      <td key={k} className="px-3 py-2 align-top">
                        {typical == null ? (
                          <span className="text-muted-foreground/60 block text-right font-mono">—</span>
                        ) : (
                          <>
                            <div className="flex items-center justify-end gap-1">
                              {dotColor && <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} title={`신뢰도: ${conf}`} />}
                              <span className="text-right font-mono font-medium text-foreground">{typStr}</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full bg-muted/40 rounded-sm overflow-hidden">
                              <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: barColor, opacity: 0.85 }} />
                            </div>
                            {hasRange && <div className="text-[10px] text-muted-foreground text-right font-mono mt-0.5">{minStr}–{maxStr}</div>}
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
      </div>
      )}
      {/* R53a — Radar 비활성 안내 (20+ alloy 일 때) */}
      {viewMode === 'radar' && radarDisabled && (
        <div className="flex-1 flex items-center justify-center text-center p-4">
          <div className="text-xs text-muted-foreground">
            <p className="mb-1">Radar 오버레이는 <b>최대 {RADAR_MAX}개</b> 까지 지원</p>
            <p>현재 Compare 에 {materials.length}개 alloy 가 있습니다.</p>
            <p>몇 개 제거 후 다시 시도해 주세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}
