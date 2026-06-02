/*
 * AM Materials Explorer — Main Page
 * Scientific Precision Design System
 * 3-panel layout: Filter Sidebar | Data View | Detail/Compare Panel
 * Design: Deep Navy (#1B2A4A) + ANSYS Blue (#00A3E0) + Light Gray Surface
 * Font: IBM Plex Sans (UI) + IBM Plex Mono (data)
 */

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
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
  Upload,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Share2,
  GraduationCap,
} from 'lucide-react';
import { Link, useSearch } from 'wouter';
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
import { SCENARIO_PRESETS, decodeFiltersFromParams, type ScenarioKey } from '@/lib/scenario-presets';
import { ScenarioDialog } from '@/components/ScenarioDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { FilterState } from '@/hooks/useMaterialFilter';
import { SvgBracket, SvgManifold, SvgShaft, SvgPrecision, SvgMarine, SvgLowcost, SvgSpring, SvgHeatsink, SvgWear, SvgMedical, SvgCryogenic, SvgElectrical } from './guide/svgs';

/** Saved collection — pinned material IDs + optional filter snapshot + scenario provenance.
 *  Older entries (pre-U10) lack `filters`; we render the bullet conditionally. */
type Collection = { name: string; ids: string[]; filters?: Partial<FilterState>; preset?: { key: string; label: string } };

const ChartLoader = () => <div className="flex items-center justify-center h-96">Loading chart...</div>;

type ViewMode = 'table' | 'cards' | 'ashby';

const MAX_COMPARE = 500; // generous backstop; the Compare table/chart handle large sets fine

export default function Home() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** wouter's search string — re-firing the scenario-apply effect when ScenarioSheet navigates
   *  to /?p=... while Home is already mounted (the empty-dep effect missed in-route URL changes). */
  const search = useSearch();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [restrictIds, setRestrictIds] = useState<string[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
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
    restoreFilters,
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

  // apply a Guide scenario preset from ?p=<key> (filters + index hint banner; viewMode is now a suggestion not a force)
  const [appliedPreset, setAppliedPreset] = useState<{ key: string; label: string; indexHint?: string; suggestedView?: ViewMode } | null>(null);
  const [editingScenario, setEditingScenario] = useState<ScenarioKey | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    if (p && SCENARIO_PRESETS[p]) {
      const cfg = SCENARIO_PRESETS[p];
      // baseline 프리셋 필터 위에 다이얼로그가 산출한 f.* 오버라이드를 머지
      const override = decodeFiltersFromParams(params);
      const merged = { ...cfg.filters, ...override } as Record<string, any>;
      (Object.entries(merged) as [keyof typeof filters, any][]).forEach(([k, v]) => updateFilter(k, v));
      // 적용 시 항상 권장 뷰(거의 모든 사례에서 Ashby)로 자동 전환 — 사용자가 응용 산출 결과를
      // 곧장 차트 위에서 확인할 수 있도록. suggestedView 메타는 그대로 보관해서 사용자가 나중에
      // 다른 뷰로 전환했을 때 배너의 "Ashby로 보기" 버튼이 다시 안내해 줄 수 있게 함.
      if (cfg.viewMode) setViewMode(cfg.viewMode);
      setAppliedPreset({ key: p, label: cfg.label, indexHint: cfg.indexHint, suggestedView: cfg.viewMode });
      // clean URL so a refresh doesn't re-apply
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const saveCollection = useCallback(() => {
    const name = collName.trim();
    if (!name || !restrictIds || !restrictIds.length) return;
    // U10: snapshot the current filter context so loading the collection later restores both
    // the pinned IDs and the search conditions that produced them. Also stamp the applied scenario
    // (if any) so the user can tell at a glance what design case this collection came from.
    setCollections(prev => {
      const entry: Collection = {
        name,
        ids: restrictIds,
        filters: { ...filters },
        ...(appliedPreset ? { preset: { key: appliedPreset.key, label: appliedPreset.label } } : {}),
      };
      const next = [...prev.filter(c => c.name !== name), entry];
      try { localStorage.setItem('am_collections', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setCollName('');
  }, [collName, restrictIds, filters, appliedPreset]);
  /** Load a saved collection — pin the IDs AND restore the filter snapshot if one was saved. */
  const loadCollection = useCallback((c: Collection) => {
    if (c.filters) restoreFilters(c.filters);
    setRestrictIds(c.ids);
    if (c.preset) setAppliedPreset({ key: c.preset.key, label: c.preset.label });
  }, [restoreFilters]);
  const deleteCollection = useCallback((name: string) => {
    setCollections(prev => {
      const next = prev.filter(c => c.name !== name);
      try { localStorage.setItem('am_collections', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  /** Material list import — 가공집에서 취급하는 재료 목록 파일을 불러와 collection 으로 저장.
   *  CSV/TXT/JSON 모두 지원. 줄당 하나의 재료 이름 (또는 CSV 1열). 매칭은 정규화된 키워드 기반:
   *  완전일치 > startsWith > 부분일치 순. localStorage 에 저장(쿠키 대체)되어 재방문 시 유지. */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importResult, setImportResult] = useState<{ matched: { name: string; matchedTo: string }[]; unmatched: string[] } | null>(null);
  const [importName, setImportName] = useState('');
  const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_.()/]+/g, '');
  const matchMaterials = useCallback((queries: string[]) => {
    if (!materials.length) return { matched: [], unmatched: [...queries] };
    const matched: { id: string; name: string; matchedTo: string }[] = [];
    const unmatched: string[] = [];
    for (const raw of queries) {
      const q = raw.trim();
      if (!q) continue;
      const nq = normalize(q);
      // 우선순위: 정규화 정확일치 → startsWith → 부분일치 (이름·별칭 모두)
      let hit: Material | null = null;
      for (const m of materials) {
        const candidates = [m.name, ...(m.aliases || [])];
        if (candidates.some(c => normalize(c) === nq)) { hit = m; break; }
      }
      if (!hit) {
        for (const m of materials) {
          const candidates = [m.name, ...(m.aliases || [])];
          if (candidates.some(c => normalize(c).startsWith(nq))) { hit = m; break; }
        }
      }
      if (!hit) {
        for (const m of materials) {
          const candidates = [m.name, ...(m.aliases || [])];
          if (candidates.some(c => normalize(c).includes(nq))) { hit = m; break; }
        }
      }
      if (hit) matched.push({ id: hit.id, name: hit.name, matchedTo: q });
      else unmatched.push(q);
    }
    return { matched, unmatched };
  }, [materials]);
  const handleImportFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || '');
      // CSV/TXT: 줄 분리 + 첫 콤마 앞 토큰만 사용 (혹은 JSON 배열).
      let lines: string[] = [];
      const trimmed = text.trim();
      if (trimmed.startsWith('[')) {
        try { const arr = JSON.parse(trimmed); if (Array.isArray(arr)) lines = arr.map(String); }
        catch { lines = trimmed.split(/\r?\n/); }
      } else {
        lines = trimmed.split(/\r?\n/).map(l => l.split(/[\t,]/)[0]).filter(l => l && !l.startsWith('#'));
      }
      const r = matchMaterials(lines);
      setImportResult({
        matched: r.matched.map(m => ({ name: m.name, matchedTo: m.matchedTo })),
        unmatched: r.unmatched,
      });
      // 파일명에서 확장자 제거해 default 컬렉션 이름으로
      const baseName = file.name.replace(/\.(csv|txt|json|tsv)$/i, '').slice(0, 40);
      setImportName(baseName || '가공집 재료');
    };
    reader.readAsText(file);
  }, [matchMaterials]);
  const confirmImport = useCallback(() => {
    if (!importResult) return;
    const name = (importName || '가공집 재료').trim();
    const ids = importResult.matched.map(m => {
      const mat = materials.find(x => x.name === m.name);
      return mat?.id;
    }).filter((x): x is string => !!x);
    if (!ids.length) { setImportResult(null); return; }
    setCollections(prev => {
      const entry: Collection = { name, ids };
      const next = [...prev.filter(c => c.name !== name), entry];
      try { localStorage.setItem('am_collections', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setRestrictIds(ids);
    setImportResult(null);
    setImportName('');
  }, [importResult, importName, materials]);
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

        {/* 가이드 — 시트로 빠른 열람 + 사례 시작 */}
        <Sheet>
          <Tooltip>
            <TooltipTrigger asChild>
              <SheetTrigger
                className="h-7 px-2 flex items-center gap-1.5 rounded border border-sidebar-border text-sidebar-foreground/70 hover:text-white hover:border-accent transition-colors text-[11px] font-medium"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">가이드</span>
              </SheetTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">가이드·사례 빠른 시작 (사이드 시트)</TooltipContent>
          </Tooltip>
          <SheetContent side="right" className="w-[420px] sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-accent" /> 가이드 · 사례 빠른 시작</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">자기 상황에 맞는 사례를 골라 다이얼로그로 시작. 깊이 학습하려면 전체 가이드.</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'bracket' as ScenarioKey, title: '구조 브래킷', sub: '경량 + 고강성', Svg: SvgBracket },
                  { key: 'hightemp' as ScenarioKey, title: '고온 부품', sub: '배기·터빈', Svg: SvgManifold },
                  { key: 'fatigue' as ScenarioKey, title: '회전·진동축', sub: '피로 한도', Svg: SvgShaft },
                  { key: 'precision' as ScenarioKey, title: '정밀 마운트', sub: '저 CTE', Svg: SvgPrecision },
                  { key: 'corrosion' as ScenarioKey, title: '해양·화학', sub: '내식 환경', Svg: SvgMarine },
                  { key: 'lowcost' as ScenarioKey, title: '저원가 양산', sub: '가성비', Svg: SvgLowcost },
                  { key: 'spring' as ScenarioKey, title: '스프링·힌지', sub: '탄성 에너지', Svg: SvgSpring },
                  { key: 'heatsink' as ScenarioKey, title: '히트싱크', sub: '방열', Svg: SvgHeatsink },
                  { key: 'wear' as ScenarioKey, title: '내마모', sub: '경도 + 접촉', Svg: SvgWear },
                  { key: 'medical' as ScenarioKey, title: '의료 임플란트', sub: '생체적합', Svg: SvgMedical },
                  { key: 'cryogenic' as ScenarioKey, title: '극저온', sub: 'LNG · 우주', Svg: SvgCryogenic },
                  { key: 'electrical' as ScenarioKey, title: '전기 전도체', sub: '버스바·접점', Svg: SvgElectrical },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setEditingScenario(t.key)}
                    className="group rounded border border-border bg-card hover:border-accent hover:shadow-sm hover:bg-accent/5 transition-all p-2 text-left flex items-center gap-2.5"
                  >
                    <div className="w-12 h-10 flex-shrink-0 rounded bg-muted/40 border border-border/60 p-0.5 flex items-center justify-center group-hover:border-accent/40 transition-colors">
                      <t.Svg />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate leading-tight">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight">{t.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Link href="/guide" className="block text-center text-xs font-medium px-3 py-2 rounded border border-accent text-accent hover:bg-accent/10 transition-colors mt-3">
                전체 가이드 페이지 열기 →
              </Link>
            </div>
          </SheetContent>
        </Sheet>

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
            {/* 가공집 재료 목록 import — 텍스트 파일 → collection. localStorage(쿠키 대체)에 영속. */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.json,.tsv,text/plain,text/csv,application/json"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()} title="재료 이름 목록 파일을 collection 으로 import (CSV/TXT/JSON)">
                  <Upload className="w-3 h-3" /> Import
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                가공집에서 취급하는 재료 목록 파일 import — 각 줄에 재료 이름.
                <br/>파일은 매번 업로드, 매칭 결과는 collection 으로 자동 저장.
              </TooltipContent>
            </Tooltip>
            {collections.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Bookmark className="w-3 h-3" /> Collections <span className="text-muted-foreground">({collections.length})</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 overflow-auto w-72">
                  <DropdownMenuLabel className="text-xs">Saved collections</DropdownMenuLabel>
                  {collections.map(c => (
                    <div key={c.name} className="flex items-center gap-1 px-1.5 py-1 hover:bg-muted/50 rounded">
                      <button
                        className="flex-1 text-left text-xs truncate min-w-0"
                        onClick={() => loadCollection(c)}
                        title={c.filters ? 'Load — pins + restores filters' : 'Load (pin to table & cards)'}
                      >
                        <span className="block truncate font-medium text-foreground">{c.name} <span className="text-muted-foreground font-normal">({c.ids.length})</span></span>
                        {(c.filters || c.preset) && (
                          <span className="block truncate text-[10px] text-muted-foreground/80 mt-0.5">
                            {c.preset && <span className="text-amber-700">↳ {c.preset.label}</span>}
                            {c.preset && c.filters && <span> · </span>}
                            {c.filters && <span>필터 포함</span>}
                          </span>
                        )}
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

          {appliedPreset && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/30 text-xs">
              <GraduationCap className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span className="text-amber-700 font-medium">사례 적용: {appliedPreset.label}</span>
              {appliedPreset.indexHint && (
                <span className="text-muted-foreground">· 권장 Index: <span className="font-mono">{appliedPreset.indexHint}</span></span>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                {/* U12: suggest (don't force) the recommended view — only show when user isn't already there */}
                {appliedPreset.suggestedView && viewMode !== appliedPreset.suggestedView && (
                  <button
                    onClick={() => setViewMode(appliedPreset.suggestedView!)}
                    className="text-[11px] px-2 py-0.5 rounded border border-amber-500/60 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 flex items-center gap-1"
                    title={`${appliedPreset.suggestedView === 'ashby' ? 'Ashby 차트' : appliedPreset.suggestedView === 'cards' ? 'Cards' : 'Table'} 뷰로 전환 — 이 사례의 권장 시점`}
                  >
                    {appliedPreset.suggestedView === 'ashby' ? <BarChart3 className="w-3 h-3" /> : appliedPreset.suggestedView === 'cards' ? <LayoutGrid className="w-3 h-3" /> : <Table2 className="w-3 h-3" />}
                    {appliedPreset.suggestedView === 'ashby' ? 'Ashby로 보기' : appliedPreset.suggestedView === 'cards' ? 'Cards로 보기' : 'Table로 보기'}
                  </button>
                )}
                <button onClick={() => setEditingScenario(appliedPreset.key as ScenarioKey)} className="text-[11px] px-2 py-0.5 rounded border border-amber-500/40 text-amber-700 hover:bg-amber-500/10">다시 편집</button>
                <button onClick={() => { resetFilters(); setAppliedPreset(null); }} className="text-[11px] px-2 py-0.5 rounded border border-amber-500/40 text-amber-700 hover:bg-amber-500/10">필터 초기화</button>
                <button onClick={() => setAppliedPreset(null)} className="text-[11px] px-2 py-0.5 rounded border border-amber-500/40 text-amber-700 hover:bg-amber-500/10">배너 닫기</button>
              </div>
            </div>
          )}
          <ScenarioDialog scenarioKey={editingScenario} open={editingScenario !== null} onOpenChange={(v) => { if (!v) setEditingScenario(null); }} />
          {/* 재료 import 결과 sheet — 매칭/미매칭 목록 + 컬렉션 이름 입력 + 저장 확인. */}
          <Sheet open={importResult !== null} onOpenChange={(v) => { if (!v) setImportResult(null); }}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
              <SheetHeader className="border-b border-border/60">
                <SheetTitle className="flex items-center gap-2 pr-8"><Upload className="w-4 h-4 text-accent" /> 재료 목록 import 결과</SheetTitle>
              </SheetHeader>
              {importResult && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded border border-emerald-300 bg-emerald-50 px-2 py-2">
                      <p className="text-[10px] text-emerald-700 uppercase tracking-wide font-semibold">매칭 성공</p>
                      <p className="text-2xl font-bold text-emerald-700 tabular-nums">{importResult.matched.length}</p>
                    </div>
                    <div className="rounded border border-rose-300 bg-rose-50 px-2 py-2">
                      <p className="text-[10px] text-rose-700 uppercase tracking-wide font-semibold">매칭 실패</p>
                      <p className="text-2xl font-bold text-rose-700 tabular-nums">{importResult.unmatched.length}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">컬렉션 이름</label>
                    <input
                      value={importName}
                      onChange={(e) => setImportName(e.target.value)}
                      placeholder="가공집 재료"
                      className="w-full h-8 px-2 text-sm rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">localStorage(쿠키 대체) 에 저장돼 재방문 시 자동 복원.</p>
                  </div>
                  {importResult.matched.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">매칭된 재료 ({importResult.matched.length})</p>
                      <div className="max-h-44 overflow-y-auto rounded border border-border bg-muted/30 text-xs divide-y divide-border/60">
                        {importResult.matched.slice(0, 200).map((m, i) => (
                          <div key={i} className="px-2 py-1 flex items-baseline justify-between gap-2">
                            <span className="font-medium text-foreground truncate">{m.name}</span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">← {m.matchedTo}</span>
                          </div>
                        ))}
                        {importResult.matched.length > 200 && (
                          <div className="px-2 py-1 text-[10px] text-muted-foreground italic">… 외 {importResult.matched.length - 200}개</div>
                        )}
                      </div>
                    </div>
                  )}
                  {importResult.unmatched.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide mb-1">매칭 실패 ({importResult.unmatched.length})</p>
                      <div className="max-h-32 overflow-y-auto rounded border border-rose-200 bg-rose-50/50 text-xs">
                        {importResult.unmatched.slice(0, 60).map((u, i) => (
                          <div key={i} className="px-2 py-0.5 text-rose-800 truncate">{u}</div>
                        ))}
                        {importResult.unmatched.length > 60 && (
                          <div className="px-2 py-0.5 text-[10px] text-rose-600 italic">… 외 {importResult.unmatched.length - 60}개</div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">DB 에 없는 등급은 무시됩니다. 표기 차이가 원인이면 alias 추가를 검토하세요.</p>
                    </div>
                  )}
                </div>
              )}
              <div className="border-t border-border/60 p-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImportResult(null)}>취소</Button>
                <Button onClick={confirmImport} disabled={!importResult || importResult.matched.length === 0} className="gap-1.5">
                  <BookmarkPlus className="w-3.5 h-3.5" /> 컬렉션으로 저장 ({importResult?.matched.length ?? 0})
                </Button>
              </div>
            </SheetContent>
          </Sheet>
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
              className="hidden md:block absolute left-0 top-0 h-full w-2 -ml-1 z-20 cursor-col-resize bg-border/40 hover:bg-accent/70 hover:w-3 hover:-ml-1.5 active:bg-accent transition-all"
              title="드래그로 폭 조절 · 더블클릭으로 초기화"
            />
            <ComparePanel
              materials={compareMaterials}
              onRemove={id => {
                setCompareList(prev => prev.filter(i => i !== id));
                if (compareList.length <= 1) setShowCompare(false);
              }}
              onClear={() => { setCompareList([]); setShowCompare(false); }}
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
