/*
 * AM Materials Explorer — Main Page
 * Scientific Precision Design System
 * 3-panel layout: Filter Sidebar | Data View | Detail/Compare Panel
 * Design: Deep Navy (#1B2A4A) + ANSYS Blue (#00A3E0) + Light Gray Surface
 * Font: IBM Plex Sans (UI) + IBM Plex Mono (data)
 */

import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import FilterSidebar from '@/components/FilterSidebar';
import { QueryBar } from '@/components/QueryBar';
import { useMaterialPool } from '@/hooks/useMaterialPool';
// R157b — Header + nav + 즐겨찾기 + Collections + PresetBanner + ImportSheet + RestrictBar + AshbyPreview → 별도 컴포넌트.
import { HomeHeader } from '@/components/HomeHeader';
import { HomeMobileNav } from '@/components/HomeMobileNav';
import { HomeFavoritesDropdown } from '@/components/HomeFavoritesDropdown';
import { HomeCollectionsDropdown } from '@/components/HomeCollectionsDropdown';
import { HomePresetBanner } from '@/components/HomePresetBanner';
import { HomeImportSheet } from '@/components/HomeImportSheet';
import { HomeRestrictBar } from '@/components/HomeRestrictBar';
import { HomeAshbyPreviewCard } from '@/components/HomeAshbyPreviewCard';
import { MaterialTable } from '@/components/MaterialTable';
import { MaterialCards } from '@/components/MaterialCards';
import { toast } from 'sonner';  // R173 — static import (dual-import build warning + production minify-safe)
const AshbyChart = lazy(() => import('@/components/AshbyChartPlotly').then(m => ({ default: m.AshbyChartPlotly })));
import { MaterialDetailPopup } from '@/components/MaterialDetailPopup';
import { ComparePanel } from '@/components/ComparePanel';
import { useMaterialFilter } from '@/hooks/useMaterialFilter';
import type { Material } from '@/lib/materials';
import { SCENARIO_PRESETS, decodeFiltersFromParams, encodeFiltersToParams, indexKeyFromHint, type ScenarioKey } from '@/lib/scenario-presets';
import { ScenarioDialog } from '@/components/ScenarioDialog';
import { ScenarioCompareSheet } from '@/components/ScenarioCompareSheet';
import OnboardingTour from '@/components/OnboardingTour';
import type { FilterState } from '@/hooks/useMaterialFilter';
import { resolveDirectHit } from '@/lib/direct-hit';   // R226e/C4 — 추출된 direct-hit 검색 (normalize·extractTokens·shop-dict 포함)
import { loadUnitSystem, saveUnitSystem, type UnitSystem } from '@/lib/unit-convert';
import { useT, useLang } from '@/lib/i18n';

/** Saved collection — pinned material IDs + optional filter snapshot + scenario provenance + viewMode.
 *  Older entries (pre-U10) lack `filters` / `viewMode`; we render conditionally and restore safely. */
type Collection = { name: string; ids: string[]; filters?: Partial<FilterState>; preset?: { key: string; label: string }; viewMode?: 'table' | 'cards' | 'ashby'; createdAt?: number };
type CollectionSort = 'recent' | 'name' | 'size';

const ChartLoader = () => <div className="flex items-center justify-center h-96">Loading chart...</div>;

type ViewMode = 'table' | 'cards' | 'ashby';

const MAX_COMPARE = 500; // generous backstop; the Compare table/chart handle large sets fine

export default function Home() {
  /* R154 — useMaterialPool: index.json (slim) 즉시 + 4 카테고리 백그라운드 prefetch.
     첫 페인트 8.15 MB → 670 KB (12배 감소). */
  const { materials, loading, error, ensureCategory } = useMaterialPool();
  /** wouter's search string — re-firing the scenario-apply effect when ScenarioSheet navigates
   *  to /?p=... while Home is already mounted (the empty-dep effect missed in-route URL changes). */
  const search = useSearch();

  /** R31 — 언어 (한/영) 번역 헬퍼. R209 C-14: cards-hint toast 가 useEffect 에서 t() 를 쓰므로 선언을 위로 올림. */
  const t = useT();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  /** 모바일에서 Table 뷰는 8 컬럼 × 75px = 600px 라 가로 스크롤 필수 — 첫 진입 1 회 Cards 뷰 권장 알림.
   *  localStorage 플래그로 중복 방지. */
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (!isMobile || viewMode !== 'table') return;
    try { if (localStorage.getItem('am_cards_hint_shown')) return; } catch { /* ignore */ }
    toast(t('home.cardsHint.title'), {
      description: t('home.cardsHint.desc'),
      duration: 6000,
      action: { label: t('home.cardsHint.action'), onClick: () => setViewMode('cards') },
    });
    try { localStorage.setItem('am_cards_hint_shown', '1'); } catch { /* ignore */ }
  }, [viewMode, t]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  /* R227/E14 — 메인 상세 popup 의 링크 네비게이션 back-stack. 위키 링크/유사재료로 다른 재료를
     열면 현재 재료를 stack 에 push → 헤더 ← 로 복귀. 닫으면 stack 초기화. (버그: 링크로 연 재료를
     닫으면 원래 재료도 닫히던 문제 — 교체만 하고 이력이 없었음.) */
  const [detailHistory, setDetailHistory] = useState<Material[]>([]);
  /* R204 #1 — PC desktop multi-popup. Pin 버튼 클릭 시 selectedMaterial → pinnedDetails 로 이동.
     각 pinned popup 은 독립 위치 + 독립 close. 사용자가 여러 alloy 를 동시 비교 가능. */
  const [pinnedDetails, setPinnedDetails] = useState<Material[]>([]);
  const handlePin = useCallback((m: Material) => {
    setPinnedDetails((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
    setSelectedMaterial(null);
    setDetailHistory([]);
  }, []);
  /* 링크로 다른 재료 열기 — 현재 재료를 back-stack 에 push. */
  const navigateDetail = useCallback((id: string) => {
    setSelectedMaterial((cur) => {
      const next = materials.find((m) => m.id === id);
      if (!next) return cur;
      if (cur && cur.id !== next.id) setDetailHistory((h) => [...h, cur]);
      return next;
    });
  }, [materials]);
  /* ← 뒤로: stack 의 마지막 재료로 복귀. */
  const backDetail = useCallback(() => {
    setDetailHistory((h) => {
      if (!h.length) return h;
      setSelectedMaterial(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);
  /* 상세 닫기 — 선택·이력 모두 초기화. */
  const closeDetail = useCallback(() => {
    setSelectedMaterial(null);
    setDetailHistory([]);
  }, []);
  /* X(닫기) 직관화 — 뒤로갈 이력이 있으면 한 단계 back, 루트(이력 없음)에서만 완전히 닫기. */
  const handleDetailClose = useCallback(() => {
    if (detailHistory.length > 0) backDetail();
    else closeDetail();
  }, [detailHistory, backDetail, closeDetail]);
  /* R101 — 모바일 ashby preview: 첫 클릭 시 작은 floating card 만 표시, 같은 점 두 번째 클릭 시 detail open.
     desktop 은 종전대로 즉시 detail open. previewMaterial 이 차트 위 작은 card 로 렌더링됨. */
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [restrictIds, setRestrictIds] = useState<string[] | null>(null);
  // R49f — URL filter restore 직후에만 URL encode 활성화 (encode/decode race 방지).
  const urlRestoredRef = useRef(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collName, setCollName] = useState('');
  // Sprint 3 B8 — Collection 검색 + 정렬 (5+ 일 때 가시성↑).
  const [collQuery, setCollQuery] = useState('');
  const [collSort, setCollSort] = useState<CollectionSort>(() => {
    try { const s = localStorage.getItem('am_coll_sort'); if (s === 'name' || s === 'size' || s === 'recent') return s; } catch { /* ignore */ }
    return 'recent';
  });
  useEffect(() => { try { localStorage.setItem('am_coll_sort', collSort); } catch { /* ignore */ } }, [collSort]);
  const sortedFilteredCollections = useMemo(() => {
    const q = collQuery.trim().toLowerCase();
    const filtered = q ? collections.filter(c => c.name.toLowerCase().includes(q)) : collections;
    const sorted = [...filtered];
    if (collSort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (collSort === 'size') sorted.sort((a, b) => b.ids.length - a.ids.length);
    else sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return sorted;
  }, [collections, collQuery, collSort]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // R49c — 모바일 검색창 펼침 토글 (default: 모바일 닫힘, 데스크탑 항상 표시).
  const [searchOpen, setSearchOpen] = useState(false);
  // Sprint2 A7 — 최근 검색어 (최대 5개, localStorage 저장).
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { const s = localStorage.getItem('am_recent_searches'); if (s) { const p = JSON.parse(s); if (Array.isArray(p)) return p.slice(0, 5); } } catch { /* ignore */ }
    return [];
  });
  const [recentOpen, setRecentOpen] = useState(false);
  // Sprint2 B1 — first-visit 온보딩 (4-step: Search/Filter/Detail/Compare).
  const [tourOpen, setTourOpen] = useState(() => {
    try { return !localStorage.getItem('am_onboarding_done'); } catch { return false; }
  });
  // R69 A — 즐겨찾기. localStorage 'am_favorites' = string[].
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('am_favorites'); if (s) return new Set(JSON.parse(s) as string[]); } catch { /* ignore */ }
    return new Set();
  });
  // R69 A — build metadata. last-updated 표시.
  const [buildMeta, setBuildMeta] = useState<{ buildDate?: string; totalAlloys?: number } | null>(null);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}build-meta.json`)
      .then(r => r.ok ? r.json() : null)
      .then(m => { if (m) setBuildMeta(m); })
      .catch(() => { /* ignore */ });
  }, []);
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('am_favorites', JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  }, []);
  // R71 D — 전체 localStorage state 백업/복원. 데이터 손실 방지 + 기기 이동.
  const exportAllState = useCallback(() => {
    const keys = ['am_collections', 'am_favorites', 'am_recent_searches', 'am_coll_sort', 'am_lang', 'am_units', 'am_radar_axes', 'am_radar_base', 'am_panel_w'];
    const out: Record<string, any> = { _meta: { version: 1, exported: new Date().toISOString() } };
    for (const k of keys) {
      try { const v = localStorage.getItem(k); if (v != null) out[k] = JSON.parse(v); } catch { try { out[k] = localStorage.getItem(k); } catch { /* ignore */ } }
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `am-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);
  const importAllState = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(String(e.target?.result || '{}'));
        let restored = 0;
        for (const [k, v] of Object.entries(json)) {
          if (k.startsWith('_')) continue;
          if (k.startsWith('am_')) { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); restored++; }
        }
        alert(`✓ ${restored} 항목 복원. 페이지를 새로고침합니다.`);
        window.location.reload();
      } catch (err) {
        alert(`✗ 백업 파일을 읽을 수 없습니다: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  }, []);
  const backupFileRef = useRef<HTMLInputElement>(null);
  const closeTour = useCallback(() => {
    setTourOpen(false);
    try { localStorage.setItem('am_onboarding_done', '1'); } catch { /* ignore */ }
  }, []);
  const pushRecent = (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setRecentSearches(prev => {
      const next = [trimmed, ...prev.filter(x => x !== trimmed)].slice(0, 5);
      try { localStorage.setItem('am_recent_searches', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    let s: string | null = null;
    try { s = typeof window !== 'undefined' ? window.localStorage.getItem('am_panel_w') : null; } catch { s = null; }
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
    narrowedRanges,
  } = useMaterialFilter(materials);

  // R154 — Data load 는 useMaterialPool 이 담당. 별도 effect 불필요.

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
  // R22: secondaryLabel/secondaryKey 추가 — 사례 교집합 (ScenarioCompareSheet) 적용 시 두 사례 모두 banner 에 표시.
  const [appliedPreset, setAppliedPreset] = useState<{ key: string; label: string; indexHint?: string; suggestedView?: ViewMode; secondaryKey?: string; secondaryLabel?: string } | null>(null);
  const [editingScenario, setEditingScenario] = useState<ScenarioKey | null>(null);
  const [scenarioCompareOpen, setScenarioCompareOpen] = useState(false);
  /** R31 — 언어 (한/영). t 는 위에서 선언 (R209 C-14). */
  const { lang, setLang } = useLang();
  /** R27 — 단위 시스템 (SI / Imperial). MaterialDetail·Compare 사용. */
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() => loadUnitSystem());
  const toggleUnitSystem = useCallback(() => {
    setUnitSystemState(prev => {
      const next: UnitSystem = prev === 'si' ? 'imperial' : 'si';
      saveUnitSystem(next);
      return next;
    });
  }, []);
  /** R18 — Guide Sheet open state (controlled). 사례 tile 클릭 시 자동 닫힘. */
  const [guideHeaderOpen, setGuideHeaderOpen] = useState(false);
  const [guideMobileOpen, setGuideMobileOpen] = useState(false);
  /** 사례 tile 클릭 헬퍼 — Sheet 닫고 ScenarioDialog 열기. */
  const openScenarioFromGuide = useCallback((k: ScenarioKey) => {
    setGuideHeaderOpen(false);
    setGuideMobileOpen(false);
    setEditingScenario(k);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    // R49f — URL filter restore (cold-start): preset 없어도 ?popm/popx/rohs/sub/ht 등 적용.
    //   atomic restoreFilters 호출 — 개별 updateFilter 는 encode useEffect 와 race (default 로 덮어씀).
    if (!p) {
      const override = decodeFiltersFromParams(params);
      if (Object.keys(override).length > 0) restoreFilters(override);
    }
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
      // R22 — p2= 도 함께 있으면 사례 교집합 적용임. secondary label/key 도 보관해서 banner 가 'A ∩ B' 표시.
      const p2 = params.get('p2');
      const cfg2 = p2 ? SCENARIO_PRESETS[p2] : null;
      setAppliedPreset({
        key: p,
        label: cfg.label,
        indexHint: cfg.indexHint,
        suggestedView: cfg.viewMode,
        ...(cfg2 ? { secondaryKey: p2!, secondaryLabel: cfg2.label } : {}),
      });
      // 사례 적용 시 좌측 사이드바 자동 닫기 — 데스크탑(sidebarOpen)·모바일 오버레이(mobileSidebarOpen)
      // 둘 다 닫음. 라운드 14 에서 모바일 state 누락으로 보고됨 → 라운드 15 에서 보강.
      setSidebarOpen(false);
      setMobileSidebarOpen(false);
      // R18 — 가이드 Sheet 도 안전망으로 명시적 close (어떤 경로로 apply 되든).
      setGuideHeaderOpen(false);
      setGuideMobileOpen(false);
      // Round 9: URL clear 제거 — share URL 보존이 더 큰 가치. 사용자가 새로고침해도 같은 사례 +
      // 같은 필터가 재적용될 뿐, 데이터/사용자에게 부작용 없음. URL 이 길어 보이는 게 흠이라
      // 별도 'URL 정리' 버튼 (배너 닫기 시점) 으로 처리.
    }
    // R49f — URL restore 완료 후에야 encode effect 활성화 (default 덮어쓰기 race 방지).
    urlRestoredRef.current = true;
    // R49f — deps `[search]` 가 wouter useSearch 의 첫 값 변경 race 로 trigger 불안정 → `[]` (mount-only).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // R55 — In-route preset 재적용. ScenarioDialog Apply → wouter navigate('/?p=...') 는
  //   컴포넌트 unmount 없이 URL 만 바꾸므로 위 mount-only effect 가 trigger 안 됨.
  //   wouter useSearch 의 search 값 변화에 반응해 preset/viewMode/indexHint 재적용.
  //   idempotent guard: 같은 preset 이미 적용된 상태면 skip → race·loop 회피.
  useEffect(() => {
    if (!urlRestoredRef.current) return; // cold-start effect 가 처리 중
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    if (!p || !SCENARIO_PRESETS[p]) return;
    if (appliedPreset?.key === p) return; // 이미 같은 preset 적용됨
    const cfg = SCENARIO_PRESETS[p];
    const override = decodeFiltersFromParams(params);
    const merged = { ...cfg.filters, ...override } as Record<string, any>;
    (Object.entries(merged) as [keyof typeof filters, any][]).forEach(([k, v]) => updateFilter(k, v));
    // R144e — wizard 가 추가한 q (multi-constraint query) 도 적용
    const q = params.get('q');
    if (q) updateFilter('query' as keyof typeof filters, q as never);
    if (cfg.viewMode) setViewMode(cfg.viewMode);
    const p2 = params.get('p2');
    const cfg2 = p2 ? SCENARIO_PRESETS[p2] : null;
    setAppliedPreset({
      key: p, label: cfg.label, indexHint: cfg.indexHint, suggestedView: cfg.viewMode,
      ...(cfg2 ? { secondaryKey: p2!, secondaryLabel: cfg2.label } : {}),
    });
    setSidebarOpen(false);
    setMobileSidebarOpen(false);
    setGuideHeaderOpen(false);
    setGuideMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const saveCollection = useCallback(() => {
    const name = collName.trim();
    if (!name || !restrictIds || !restrictIds.length) return;
    // U10: snapshot the current filter context so loading the collection later restores both
    // the pinned IDs and the search conditions that produced them. Also stamp the applied scenario
    // (if any) so the user can tell at a glance what design case this collection came from.
    setCollections(prev => {
      // Sprint 3 B8 — createdAt 스탬프 (recent 정렬용)
      const entry: Collection = {
        name,
        ids: restrictIds,
        filters: { ...filters },
        viewMode,
        createdAt: Date.now(),
        ...(appliedPreset ? { preset: { key: appliedPreset.key, label: appliedPreset.label } } : {}),
      };
      const next = [...prev.filter(c => c.name !== name), entry];
      try { localStorage.setItem('am_collections', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setCollName('');
  }, [collName, restrictIds, filters, appliedPreset, viewMode]);
  /** Load a saved collection — pin the IDs AND restore the filter snapshot + viewMode if saved. */
  const loadCollection = useCallback((c: Collection) => {
    if (c.filters) restoreFilters(c.filters);
    setRestrictIds(c.ids);
    if (c.preset) setAppliedPreset({ key: c.preset.key, label: c.preset.label });
    if (c.viewMode) setViewMode(c.viewMode);
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
  const matchMaterials = useCallback((queries: string[]) => {
    if (!materials.length) return { matched: [], unmatched: [...queries] };
    const matched: { id: string; name: string; matchedTo: string }[] = [];
    const unmatched: string[] = [];
    for (const raw of queries) {
      const q = raw.trim();
      if (!q) continue;
      const hit = resolveDirectHit(q, materials);
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
  /** Shareable URL — 기본은 IDs 만 hash 에 인코딩 (`#g=name~id1.id2...`),
   *  Round 9: 옵션으로 적용된 필터 + 사례 도 함께 — `&p=preset&f.X=Y` 쿼리 추가.
   *  수신측은 기존 effect 로 그대로 디코드 (decodeFiltersFromParams + p=). */
  const shareSet = useCallback((name: string, ids: string[]) => {
    if (!ids || !ids.length) return;
    const qs = encodeFiltersToParams(filters);
    const presetQ = appliedPreset ? `p=${encodeURIComponent(appliedPreset.key)}` : '';
    const query = [presetQ, qs].filter(Boolean).join('&');
    const queryPart = query ? `?${query}` : '';
    const url = `${location.origin}${location.pathname}${queryPart}#g=${encodeURIComponent(name || 'shared')}~${ids.join('.')}`;
    try { navigator.clipboard?.writeText(url); } catch { /* ignore */ }
    try { history.replaceState(null, '', url); } catch { /* ignore */ }
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 2500);
  }, [filters, appliedPreset]);

  // R49b — filters / appliedPreset / restrictIds 변경 시 URL params 자동 동기화.
  //   history.replaceState 만 — clipboard 복사는 explicit Share 액션 (shareSet) 시에만.
  //   사용자가 새로고침 / 뒤로가기 / URL 복사 후 즉시 같은 상태 복원 가능.
  //   R49f gate — URL → state 복원 완료 후에만 encode (race 방지).
  useEffect(() => {
    if (!urlRestoredRef.current) return;
    try {
      const qs = encodeFiltersToParams(filters);
      const presetQ = appliedPreset ? `p=${encodeURIComponent(appliedPreset.key)}` : '';
      const secondQ = appliedPreset?.secondaryKey ? `p2=${encodeURIComponent(appliedPreset.secondaryKey)}` : '';
      const query = [presetQ, secondQ, qs].filter(Boolean).join('&');
      const queryPart = query ? `?${query}` : '';
      const hashPart = (restrictIds && restrictIds.length)
        ? `#g=shared~${restrictIds.join('.')}`
        : '';
      const target = `${location.pathname}${queryPart}${hashPart}`;
      const current = `${location.pathname}${location.search}${location.hash}`;
      if (target !== current) history.replaceState(null, '', target);
    } catch { /* ignore */ }
  }, [filters, appliedPreset, restrictIds]);

  // detail now opens as a floating popup, so it no longer needs to close the Compare panel
  // R101 — 모바일: 첫 클릭은 preview card 표시, 같은 점 두 번째 클릭은 detail open. 데스크탑은 즉시 detail.
  // R154 — 클릭 시 해당 material 의 category 가 아직 lazy-load 중이면 ensureCategory 후 detail open.
  const handleSelectMaterial = useCallback((m: Material) => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    // Trigger ensureCategory (non-blocking — slim 데이터만으로도 일부 정보 표시 가능)
    ensureCategory(m.category).catch(() => { /* swallow — non-fatal */ });
    if (isMobile) {
      if (previewMaterial?.id === m.id) {
        // 두 번째 클릭 → detail open + preview close
        setPreviewMaterial(null);
        setSelectedMaterial(m);
        setDetailHistory([]); // 새 선택 = 이력 초기화
      } else {
        setPreviewMaterial(m);
      }
    } else {
      setSelectedMaterial(m);
      setDetailHistory([]); // 새 선택 = 이력 초기화
    }
  }, [previewMaterial, ensureCategory]);

  // click a material inside Compare → open its detail popup AND locate it on the Ashby chart
  const handleSelectFromCompare = useCallback((m: Material) => {
    setSelectedMaterial(m);
    setDetailHistory([]);
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
  // R58 — header checkbox 전체 토글 (add=true union, add=false difference). MAX_COMPARE 자동 제한.
  const handleToggleAllCompare = useCallback((ids: string[], add: boolean) => {
    setCompareList(prev => {
      if (add) {
        const next = [...prev];
        for (const id of ids) { if (next.length >= MAX_COMPARE) break; if (!next.includes(id)) next.push(id); }
        return next;
      }
      const removeSet = new Set(ids);
      return prev.filter(id => !removeSet.has(id));
    });
  }, []);

  const handleApplyToFilter = useCallback((ids: string[]) => { setRestrictIds(ids.length ? ids : null); }, []);

  /* R115 — Compare 버튼이 토글로 동작. 열려있으면 닫고, 닫혀있으면 열기. 모바일 우측상단 + 하단 nav 동일. */
  const handleOpenCompare = useCallback(() => {
    if (compareList.length === 0) return;
    setShowCompare(s => !s);
    if (!showCompare) setSelectedMaterial(null);
  }, [compareList, showCompare]);

  const compareMaterials = materials.filter(m => compareList.includes(m.id));
  const restrictSet = restrictIds ? new Set(restrictIds) : null;
  const viewFiltered = restrictSet ? filtered.filter(m => restrictSet.has(m.id)) : filtered;

  // Sprint 3 B9 — 글로벌 키보드 단축키 (A11y / power user 가속).
  //   `/` → 검색 포커스 (input·textarea 안일 때는 무시 — 일반 타이핑 보호)
  //   Esc → 선택된 자료·Compare 패널 닫기 (이미 시트 자체는 Esc 처리)
  //   ?  → onboarding tour 재시작
  useEffect(() => {
    const isTypingEl = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !isTypingEl(e.target)) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => {
          const inp = document.querySelector<HTMLInputElement>('input[data-search-input="1"]');
          inp?.focus();
        }, 80);
      } else if (e.key === '?' && !isTypingEl(e.target)) {
        e.preventDefault();
        setTourOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // Stats — R46: Ceramic/Composite 추가 + AM 패턴 확장 (FDM/SLS/MJF/DED 포함, 폴리머 AM 포함).
  const metalCount = materials.filter(m => m.category === 'Metal').length;
  const polymerCount = materials.filter(m => m.category === 'Polymer').length;
  const ceramicCount = materials.filter(m => m.category === 'Ceramic').length;
  const compositeCount = materials.filter(m => m.category === 'Composite').length;
  const amCount = materials.filter(m => /LPBF|DMLS|SLM|EBM|Binder Jetting|DED|MJF|FDM|SLS/i.test(m.process || '')).length;

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
    <div className="flex flex-col h-screen overflow-hidden bg-background pb-[50px] md:pb-0">
      {/* ─── Top Header ─── */}
      {/* R157b — header → HomeHeader 컴포넌트로 추출. */}
      <HomeHeader
        t={t}
        lang={lang}
        setLang={setLang}
        unitSystem={unitSystem}
        toggleUnitSystem={toggleUnitSystem}
        materials={materials}
        filtered={filtered}
        metalCount={metalCount}
        polymerCount={polymerCount}
        ceramicCount={ceramicCount}
        compositeCount={compositeCount}
        amCount={amCount}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        filters={filters}
        updateFilter={updateFilter}
        recentSearches={recentSearches}
        recentOpen={recentOpen}
        setRecentOpen={setRecentOpen}
        pushRecent={pushRecent}
        viewMode={viewMode}
        setViewMode={setViewMode}
        compareList={compareList}
        handleOpenCompare={handleOpenCompare}
        favorites={favorites}
        setSelectedMaterial={setSelectedMaterial}
        toggleFavorite={toggleFavorite}
        guideHeaderOpen={guideHeaderOpen}
        setGuideHeaderOpen={setGuideHeaderOpen}
        openScenarioFromGuide={openScenarioFromGuide}
        setScenarioCompareOpen={setScenarioCompareOpen}
        setTourOpen={setTourOpen}
        backupFileRef={backupFileRef}
        importAllState={importAllState}
      />

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
              narrowedRanges={narrowedRanges}
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

        {/* Mobile sidebar overlay — w-72 → w-64 로 좁혀 우측 dismiss 영역 확보 (375 vw 에서 256/119 px). */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="w-64 flex-shrink-0 shadow-2xl">
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
            <button
              type="button"
              aria-label="필터 닫기"
              className="flex-1 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
          </div>
        )}

        {/* ─── Center Data View ─── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* R144b — Multi-constraint DSL bar */}
          <QueryBar
            value={filters.query || ''}
            onChange={(v) => updateFilter('query', v)}
            matchedCount={filtered.length}
            totalCount={materials.length}
          />
          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/20">
            <span className="text-[11px] font-mono text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length.toLocaleString()}</span>
              {' '}{t('results.count')}
              {activeFilterCount > 0 && (
                <button
                  className="ml-2 text-accent hover:underline"
                  onClick={resetFilters}
                >
                  {t('results.clearFilters')}
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
              aria-label="재료 목록 파일 업로드"
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
            {/* R157b — Collections dropdown → HomeCollectionsDropdown 컴포넌트로 추출. */}
            <HomeCollectionsDropdown
              collections={collections}
              sortedFilteredCollections={sortedFilteredCollections}
              collSort={collSort}
              setCollSort={setCollSort}
              collQuery={collQuery}
              setCollQuery={setCollQuery}
              loadCollection={loadCollection}
              shareSet={shareSet}
              deleteCollection={deleteCollection}
              exportAllState={exportAllState}
              backupFileRef={backupFileRef}
            />
          </div>

          {/* R157b — preset banner → HomePresetBanner 컴포넌트로 추출. */}
          <HomePresetBanner
            appliedPreset={appliedPreset}
            viewFiltered={viewFiltered}
            selectedMaterial={selectedMaterial}
            setSelectedMaterial={setSelectedMaterial}
            compareList={compareList}
            showCompare={showCompare}
            setShowCompare={setShowCompare}
            viewMode={viewMode}
            setViewMode={setViewMode}
            setEditingScenario={setEditingScenario}
            resetFilters={resetFilters}
            setAppliedPreset={setAppliedPreset}
            t={t}
          />
          <ScenarioDialog scenarioKey={editingScenario} open={editingScenario !== null} onOpenChange={(v) => { if (!v) setEditingScenario(null); }} />
          {/* B5: 두 사례 동시 비교 시트 */}
          <ScenarioCompareSheet open={scenarioCompareOpen} onOpenChange={setScenarioCompareOpen} />
          {/* Sprint 2 B1: first-visit 온보딩 (4-step). localStorage 'am_onboarding_done' flag */}
          <OnboardingTour
            open={tourOpen}
            onClose={closeTour}
            onQuickStart={(k) => { closeTour(); setEditingScenario(k); }}
          />
          {/* R157b — Import sheet → HomeImportSheet 컴포넌트로 추출. */}
          <HomeImportSheet
            importResult={importResult}
            setImportResult={setImportResult}
            importName={importName}
            setImportName={setImportName}
            confirmImport={confirmImport}
          />
          {/* R157b — Restrict bar → HomeRestrictBar 컴포넌트로 추출. */}
          <HomeRestrictBar
            restrictIds={restrictIds}
            viewFilteredCount={viewFiltered.length}
            collName={collName}
            setCollName={setCollName}
            saveCollection={saveCollection}
            shareSet={shareSet}
            setRestrictIds={setRestrictIds}
            linkCopied={linkCopied}
            t={t}
          />
          {/* Data view */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'table' && (
              <MaterialTable
                materials={viewFiltered}
                selectedId={selectedMaterial?.id ?? null}
                compareList={compareList}
                onSelect={handleSelectMaterial}
                onToggleCompare={handleToggleCompare}
                onToggleAll={handleToggleAllCompare}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                onResetFilters={resetFilters}
                activeFilterCount={activeFilterCount}
                searchQuery={filters.search}
              />
            )}
            {viewMode === 'cards' && (
              <MaterialCards
                materials={viewFiltered}
                selectedId={selectedMaterial?.id ?? null}
                compareList={compareList}
                onSelect={handleSelectMaterial}
                onToggleCompare={handleToggleCompare}
                onResetFilters={resetFilters}
                activeFilterCount={activeFilterCount}
                searchQuery={filters.search}
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
                  forceIndexKey={appliedPreset ? indexKeyFromHint(appliedPreset.indexHint) : null}
                />
              </Suspense>
            )}
            {/* R101 — 모바일 Ashby preview card. 차트 위 floating card. 한 번 더 누르거나 "자세히 보기" 클릭 → detail open. */}
            {/* R157b — HomeAshbyPreviewCard 컴포넌트로 추출. */}
            {viewMode === 'ashby' && (
              <HomeAshbyPreviewCard
                previewMaterial={previewMaterial}
                setPreviewMaterial={setPreviewMaterial}
                setSelectedMaterial={setSelectedMaterial}
              />
            )}
          </div>
        </div>

        {/* ─── Right Compare Panel (resizable) ─── R99: 모바일에서 bottom nav (z-50) 위 영역만 차지 → 사용자가 nav 누르고 탈출 가능. */}
        {showCompare && (
          <div className="fixed top-12 left-0 right-0 bottom-[50px] z-40 md:relative md:top-auto md:left-auto md:right-auto md:bottom-auto md:z-auto md:inset-auto flex-shrink-0 w-full overflow-hidden md:border-l border-border bg-background" style={{ width: isDesktop ? panelWidth : undefined }}>
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
        {/* R154 — selectedMaterial 을 materials 배열에서 항상 re-resolve. lazy load 직후 slim → full 자동 반영. */}
        <MaterialDetailPopup
          material={selectedMaterial ? (materials.find((m) => m.id === selectedMaterial.id) || selectedMaterial) : null}
          compareList={compareList}
          onToggleCompare={handleToggleCompare}
          onClose={handleDetailClose}
          onBack={detailHistory.length > 0 ? backDetail : undefined}
          allMaterials={materials}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          /* R148 — 유사 재료 클릭 시 그 재료로 전환. R227 — 현재 재료를 back-stack 에 push. */
          onSelectMaterial={navigateDetail}
          /* R204 #1 — pin: 이 popup 을 별도 stack 으로 분리 (multi-popup) */
          onPin={handlePin}
          isPinned={false}
        />
        {/* R204 #1 — Multi-pinned detail stack (PC desktop). 각 popup 독립 위치 + close. */}
        {pinnedDetails.map((m, i) => (
          <MaterialDetailPopup
            key={m.id}
            material={materials.find((x) => x.id === m.id) || m}
            compareList={compareList}
            onToggleCompare={handleToggleCompare}
            onClose={() => setPinnedDetails((prev) => prev.filter((x) => x.id !== m.id))}
            allMaterials={materials}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onSelectMaterial={(id) => {
              const next = materials.find((mm) => mm.id === id);
              if (next) setPinnedDetails((prev) => prev.map((p) => (p.id === m.id ? next : p)));
            }}
            isPinned
            /* stagger 위치: top 100 + i × 40, left 8 + i × 60 (꺾어쌓이는 fan effect) */
            initialPos={{ x: Math.max(8, Math.min(window.innerWidth - 450, 8 + i * 60)), y: 100 + i * 40 }}
          />
        ))}
      </div>

      {/* ─── Mobile bottom action bar (sm:hidden) ─── 화면 폭이 좁을 때 상단 헤더가 빠듯하므로
       *  핵심 작업(Filter·View·Compare·Guide)을 하단 고정 바로 분리. 데스크탑은 hidden. */}
      <HomeMobileNav
        setShowCompare={setShowCompare}
        setMobileSidebarOpen={setMobileSidebarOpen}
        activeFilterCount={activeFilterCount}
        viewMode={viewMode}
        setViewMode={setViewMode}
        compareList={compareList}
        handleOpenCompare={handleOpenCompare}
        guideMobileOpen={guideMobileOpen}
        setGuideMobileOpen={setGuideMobileOpen}
        openScenarioFromGuide={openScenarioFromGuide}
        lang={lang}
        setLang={setLang}
        unitSystem={unitSystem}
        toggleUnitSystem={toggleUnitSystem}
        setTourOpen={setTourOpen}
      />

      {/* R85 — Status bar 제거 (사용자 요청). 가독성 낮은 10px gray 줄이 1 줄 공간 차지하던 footer. build date 정보는 Detail 패널 footer / Tools 페이지에서 노출. */}
    </div>
  );
}
