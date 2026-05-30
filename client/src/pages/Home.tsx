/*
 * AM Materials Explorer — Main Page
 * Scientific Precision Design System
 * 3-panel layout: Filter Sidebar | Data View | Detail/Compare Panel
 * Design: Deep Navy (#1B2A4A) + ANSYS Blue (#00A3E0) + Light Gray Surface
 * Font: IBM Plex Sans (UI) + IBM Plex Mono (data)
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Search,
  Table2,
  LayoutGrid,
  BarChart3,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  Info,
  Download,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import FilterSidebar from '@/components/FilterSidebar';
import { MaterialTable } from '@/components/MaterialTable';
import { MaterialCards } from '@/components/MaterialCards';
const AshbyChart = lazy(() => import('@/components/AshbyChartPlotly').then(m => ({ default: m.AshbyChartPlotly })));
import { MaterialDetailPopup } from '@/components/MaterialDetailPopup';
import { ComparePanel } from '@/components/ComparePanel';
import { useMaterialFilter } from '@/hooks/useMaterialFilter';
import { exportMaterialsToCSV, generateCSVFilename } from '@/lib/csv-export';
import type { Material } from '@/lib/materials';

const ChartLoader = () => <div className="flex items-center justify-center h-96">Loading chart...</div>;

type ViewMode = 'table' | 'cards' | 'ashby';

const MAX_COMPARE = 500; // generous backstop; the Compare table/chart handle large sets fine

export default function Home() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [restrictIds, setRestrictIds] = useState<string[] | null>(null);
  const [collections, setCollections] = useState<{ name: string; ids: string[] }[]>([]);
  const [collName, setCollName] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const s = typeof window !== 'undefined' ? window.localStorage.getItem('am_panel_w') : null;
    const n = s ? Number(s) : 460;
    return isFinite(n) && n >= 300 ? n : 460;
  });
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);

  const {
    filters,
    updateFilter,
    resetFilters,
    filtered,
    sortKey,
    sortDir,
    toggleSort,
    activeFilterCount,
  } = useMaterialFilter(materials);

  // Load data
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}materials.json`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load materials database');
        return r.json();
      })
      .then((data: { materials: Material[] } | Material[]) => {
        // Support both wrapped { materials: [...] } and raw array formats
        const list = Array.isArray(data) ? data : (data as { materials: Material[] }).materials;
        setMaterials(list);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  // saved collections persist in localStorage
  useEffect(() => {
    try { const s = localStorage.getItem('am_collections'); if (s) setCollections(JSON.parse(s)); } catch { /* ignore */ }
  }, []);
  // restore a shared selection from the URL hash (#g=name~id.id.id)
  useEffect(() => {
    const m = location.hash.match(/^#g=([^~]*)~(.+)$/);
    if (m) { const ids = m[2].split('.').filter(Boolean); if (ids.length) setRestrictIds(ids); }
  }, []);
  const saveCollection = useCallback(() => {
    const name = collName.trim();
    if (!name || !restrictIds || !restrictIds.length) return;
    setCollections(prev => {
      const next = [...prev.filter(c => c.name !== name), { name, ids: restrictIds }];
      try { localStorage.setItem('am_collections', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setCollName('');
  }, [collName, restrictIds]);
  const deleteCollection = useCallback((name: string) => {
    setCollections(prev => {
      const next = prev.filter(c => c.name !== name);
      try { localStorage.setItem('am_collections', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  // shareable URL: encode the material-id set in the hash, copy to clipboard + put in the address bar
  const shareSet = useCallback((name: string, ids: string[]) => {
    if (!ids || !ids.length) return;
    const url = `${location.origin}${location.pathname}#g=${encodeURIComponent(name || 'shared')}~${ids.join('.')}`;
    try { navigator.clipboard?.writeText(url); } catch { /* ignore */ }
    try { history.replaceState(null, '', url); } catch { /* ignore */ }
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 2500);
  }, []);

  // detail now opens as a floating popup, so it no longer needs to close the Compare panel
  const handleSelectMaterial = useCallback((m: Material) => {
    setSelectedMaterial(m);
  }, []);

  // click a material inside Compare → open its detail popup AND locate it on the Ashby chart
  const handleSelectFromCompare = useCallback((m: Material) => {
    setSelectedMaterial(m);
    setViewMode('ashby');
  }, []);

  const handleToggleCompare = useCallback((id: string) => {
    setCompareList(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }, []);

  const handleAddManyToCompare = useCallback((ids: string[]) => {
    setCompareList(prev => {
      const next = [...prev];
      for (const id of ids) { if (next.length >= MAX_COMPARE) break; if (!next.includes(id)) next.push(id); }
      return next;
    });
    setShowCompare(true);
    setSelectedMaterial(null);
  }, []);

  const handleApplyToFilter = useCallback((ids: string[]) => { setRestrictIds(ids.length ? ids : null); }, []);

  const handleOpenCompare = useCallback(() => {
    if (compareList.length > 0) {
      setShowCompare(true);
      setSelectedMaterial(null);
    }
  }, [compareList]);

  const compareMaterials = materials.filter(m => compareList.includes(m.id));
  const restrictSet = restrictIds ? new Set(restrictIds) : null;
  const viewFiltered = restrictSet ? filtered.filter(m => restrictSet.has(m.id)) : filtered;

  // Right Compare panel: persisted, drag-to-resize on desktop (full-screen overlay on mobile)
  useEffect(() => { try { window.localStorage.setItem('am_panel_w', String(Math.round(panelWidth))); } catch { /* ignore */ } }, [panelWidth]);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const startPanelResize = (e: { clientX: number; preventDefault: () => void }) => {
    e.preventDefault();
    const startX = e.clientX, startW = panelWidth;
    const onMove = (ev: PointerEvent) => {
      const max = Math.min(window.innerWidth - 360, 1100); // leave room for the data view
      setPanelWidth(Math.max(320, Math.min(max, startW + (startX - ev.clientX)))); // panel is right-anchored: drag left → wider
    };
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      document.body.style.userSelect = ''; document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    document.body.style.userSelect = 'none'; document.body.style.cursor = 'col-resize';
  };

  // Stats
  const metalCount = materials.filter(m => m.category === 'Metal').length;
  const polymerCount = materials.filter(m => m.category === 'Polymer').length;
  const amCount = materials.filter(m => ['LPBF', 'DMLS', 'SLM', 'EBM', 'Binder Jetting'].includes(m.process)).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Loading materials database…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-destructive">Failed to load database</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* ─── Top Header ─── */}
      <header className="flex-shrink-0 h-12 flex items-center gap-3 px-4 border-b border-border bg-[oklch(0.22_0.055_250)] text-sidebar-foreground z-20">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-bold tracking-tight text-white leading-none">AM Materials</p>
            <p className="text-[9px] text-sidebar-foreground/50 uppercase tracking-widest leading-none mt-0.5">Explorer</p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-sidebar-border hidden sm:block" />

        {/* Stats chips */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[11px] text-sidebar-foreground/60">
            <span className="font-mono font-semibold text-white">{materials.length.toLocaleString()}</span> materials
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[oklch(0.62_0.17_220_/_0.3)] text-[oklch(0.72_0.14_220)] font-medium">
            {metalCount.toLocaleString()} Metal
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[oklch(0.55_0.15_145_/_0.3)] text-[oklch(0.65_0.15_145)] font-medium">
            {polymerCount.toLocaleString()} Polymer
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[oklch(0.65_0.18_60_/_0.3)] text-[oklch(0.75_0.18_60)] font-medium">
            {amCount} AM
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md ml-auto mr-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-foreground/40" />
            <Input
              className="h-7 pl-8 pr-3 text-xs bg-[oklch(0.28_0.06_250)] border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-accent"
              placeholder="Search materials, alloys, processes…"
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
            />
            {filters.search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground"
                onClick={() => updateFilter('search', '')}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 bg-[oklch(0.28_0.06_250)] rounded-md p-0.5">
          {([
            { mode: 'table' as ViewMode, icon: Table2, label: 'Table' },
            { mode: 'cards' as ViewMode, icon: LayoutGrid, label: 'Cards' },
            { mode: 'ashby' as ViewMode, icon: BarChart3, label: 'Ashby' },
          ] as const).map(({ mode, icon: Icon, label }) => (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <button
                  className={`w-7 h-6 flex items-center justify-center rounded transition-all ${
                    viewMode === mode
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-sidebar-foreground/50 hover:text-sidebar-foreground'
                  }`}
                  onClick={() => setViewMode(mode)}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{label} view</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Export CSV button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="h-7 w-7 flex items-center justify-center rounded border border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground hover:border-accent transition-colors"
              onClick={() => {
                const filename = generateCSVFilename();
                exportMaterialsToCSV(filtered, filename);
              }}
              title="Export filtered results to CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Export to CSV ({filtered.length} items)</TooltipContent>
        </Tooltip>

        {/* Compare button */}
        {compareList.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[11px] bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-[oklch(0.28_0.06_250)] gap-1.5"
            onClick={handleOpenCompare}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Compare
            <Badge className="h-4 w-4 p-0 text-[9px] flex items-center justify-center bg-accent text-white border-0 rounded-full">
              {compareList.length}
            </Badge>
          </Button>
        )}

        {/* Mobile sidebar toggle */}
        <button
          className="md:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
          onClick={() => setMobileSidebarOpen(o => !o)}
        >
          <Menu className="w-4 h-4" />
        </button>
      </header>

      {/* ─── Main Content ─── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── Left Filter Sidebar ─── */}
        {/* Desktop */}
        <div
          className={`
            hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-out overflow-hidden
            ${sidebarOpen ? 'w-64' : 'w-0'}
          `}
        >
          {sidebarOpen && (
            <FilterSidebar
              materials={materials}
              filters={filters}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              activeFilterCount={activeFilterCount}
              resultCount={filtered.length}
              onSelectMaterial={handleSelectMaterial}
            />
          )}
        </div>

        {/* Sidebar toggle button */}
        <div className="hidden md:flex flex-col justify-center flex-shrink-0">
          <button
            className="w-4 h-12 flex items-center justify-center bg-muted/50 hover:bg-muted border-y border-r border-border rounded-r-md text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(o => !o)}
          >
            {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-30 flex">
            <div className="w-72 flex-shrink-0">
            <FilterSidebar
              materials={materials}
              filters={filters}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              activeFilterCount={activeFilterCount}
              resultCount={filtered.length}
              onSelectMaterial={handleSelectMaterial}
            />
            </div>
            <div
              className="flex-1 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
          </div>
        )}

        {/* ─── Center Data View ─── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/20">
            <span className="text-[11px] font-mono text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length.toLocaleString()}</span>
              {' '}results
              {activeFilterCount > 0 && (
                <button
                  className="ml-2 text-accent hover:underline"
                  onClick={resetFilters}
                >
                  clear filters
                </button>
              )}
            </span>

            {/* Active filter chips */}
            <div className="flex flex-wrap gap-1 flex-1">
              {filters.categories.map(c => (
                <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-accent/15 text-accent border border-accent/30">
                  {c}
                  <button onClick={() => updateFilter('categories', filters.categories.filter(x => x !== c))}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              {filters.processes.map(p => (
                <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground border border-border">
                  {p}
                  <button onClick={() => updateFilter('processes', filters.processes.filter(x => x !== p))}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>

            {compareList.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {compareList.length}/{MAX_COMPARE} selected for comparison
              </span>
            )}
            {collections.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Bookmark className="w-3 h-3" /> Collections <span className="text-muted-foreground">({collections.length})</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 overflow-auto w-64">
                  <DropdownMenuLabel className="text-xs">Saved collections</DropdownMenuLabel>
                  {collections.map(c => (
                    <div key={c.name} className="flex items-center gap-1 px-1.5 py-1 hover:bg-muted/50 rounded">
                      <button className="flex-1 text-left text-xs truncate" onClick={() => setRestrictIds(c.ids)} title="Load (pin to table & cards)">
                        {c.name} <span className="text-muted-foreground">({c.ids.length})</span>
                      </button>
                      <button className="text-muted-foreground/50 hover:text-accent flex-shrink-0" onClick={() => shareSet(c.name, c.ids)} title="Copy share link">
                        <Share2 className="w-3 h-3" />
                      </button>
                      <button className="text-muted-foreground/50 hover:text-destructive flex-shrink-0" onClick={() => deleteCollection(c.name)} title="Delete">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {restrictIds && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-accent/10 border-b border-accent/30 text-xs">
              <span className="text-accent font-medium">{viewFiltered.length} materials pinned from chart selection</span>
              <span className="text-muted-foreground">(table &amp; cards)</span>
              <div className="ml-auto flex items-center gap-1.5">
                <input value={collName} onChange={e => setCollName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveCollection(); }} placeholder="collection name" className="h-6 w-36 text-[11px] rounded border border-border px-2 bg-background" />
                <button onClick={saveCollection} disabled={!collName.trim()} className="text-[11px] px-2 py-0.5 rounded border border-accent/40 text-accent hover:bg-accent/10 disabled:opacity-40 flex items-center gap-1"><BookmarkPlus className="w-3 h-3" /> Save</button>
                <button onClick={() => shareSet(collName.trim(), restrictIds || [])} className="text-[11px] px-2 py-0.5 rounded border border-accent/40 text-accent hover:bg-accent/10 flex items-center gap-1"><Share2 className="w-3 h-3" /> {linkCopied ? 'Copied!' : 'Share'}</button>
                <button onClick={() => setRestrictIds(null)} className="text-[11px] px-2 py-0.5 rounded border border-accent/40 text-accent hover:bg-accent/10">Clear</button>
              </div>
            </div>
          )}
          {/* Data view */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'table' && (
              <MaterialTable
                materials={viewFiltered}
                selectedId={selectedMaterial?.id ?? null}
                compareList={compareList}
                onSelect={handleSelectMaterial}
                onToggleCompare={handleToggleCompare}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
            )}
            {viewMode === 'cards' && (
              <MaterialCards
                materials={viewFiltered}
                selectedId={selectedMaterial?.id ?? null}
                compareList={compareList}
                onSelect={handleSelectMaterial}
                onToggleCompare={handleToggleCompare}
              />
            )}
            {viewMode === 'ashby' && (
              <Suspense fallback={<ChartLoader />}>
                <AshbyChart
                  materials={materials}
                  filteredMaterials={filtered}
                  filters={filters}
                  selectedId={selectedMaterial?.id ?? null}
                  compareList={compareList}
                  onMaterialClick={handleSelectMaterial}
                  onCompareMany={handleAddManyToCompare}
                  onApplyToFilter={handleApplyToFilter}
                />
              </Suspense>
            )}
          </div>
        </div>

        {/* ─── Right Compare Panel (resizable) ─── */}
        {showCompare && (
          <div className="fixed inset-0 z-40 md:relative md:z-auto md:inset-auto flex-shrink-0 w-full overflow-hidden md:border-l border-border bg-background" style={{ width: isDesktop ? panelWidth : undefined }}>
            {/* drag handle (desktop): drag to resize, double-click to reset */}
            <div
              onPointerDown={startPanelResize}
              onDoubleClick={() => setPanelWidth(460)}
              className="hidden md:block absolute left-0 top-0 h-full w-1.5 -ml-0.5 z-20 cursor-col-resize hover:bg-accent/40 active:bg-accent/60 transition-colors"
              title="Drag to resize · double-click to reset"
            />
            <ComparePanel
              materials={compareMaterials}
              onRemove={id => {
                setCompareList(prev => prev.filter(i => i !== id));
                if (compareList.length <= 1) setShowCompare(false);
              }}
              onClose={() => setShowCompare(false)}
              onSelect={handleSelectFromCompare}
            />
          </div>
        )}

        {/* ─── Floating Material Detail popup (over chart + compare; draggable) ─── */}
        <MaterialDetailPopup
          material={selectedMaterial}
          compareList={compareList}
          onToggleCompare={handleToggleCompare}
          onClose={() => setSelectedMaterial(null)}
        />
      </div>

      {/* ─── Status Bar ─── */}
      <footer className="flex-shrink-0 h-6 flex items-center justify-between px-4 border-t border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground">
            AM Materials Explorer · Granta-Style Database
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            {materials.length.toLocaleString()} materials · min–max ranges · cited sources
          </span>
        </div>
        <div className="flex items-center gap-2">
          {compareList.length > 0 && (
            <button
              className="text-[10px] text-accent hover:underline"
              onClick={handleOpenCompare}
            >
              {compareList.length} selected for comparison
            </button>
          )}
          <span className="text-[10px] text-muted-foreground/40 font-mono">v1.0</span>
        </div>
      </footer>
    </div>
  );
}
