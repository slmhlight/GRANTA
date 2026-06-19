/*
 * R157b — Home 의 top header bar.
 * Home.tsx 의 inline <header> (lines ~683-996) 에서 추출. Behavior identical.
 *
 * 구성:
 *  - Logo + Stats badge (단일 텍스트 + hover breakdown)
 *  - Search input (모바일 펼침 토글 + recent searches dropdown)
 *  - View mode toggle (Table / Cards / Ashby)
 *  - Export CSV / ? help / Wizard / Tools / Favorites / Guide / KO-EN / SI-IMP / Scenario compare / Compare
 *  - 백업/복원 hidden file input
 */
import type { Dispatch, RefObject, SetStateAction } from 'react';
import {
  Search,
  Table2,
  LayoutGrid,
  BarChart3,
  X,
  Database,
  Download,
  GitCompareArrows,
  GraduationCap,
  Wrench,
} from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { HomeFavoritesDropdown } from '@/components/HomeFavoritesDropdown';
import { exportMaterialsToCSV, generateCSVFilename } from '@/lib/csv-export';
import type { Material } from '@/lib/materials';
import type { FilterState } from '@/hooks/useMaterialFilter';
import type { ScenarioKey } from '@/lib/scenario-presets';
import type { Lang } from '@/lib/i18n';
import type { UnitSystem } from '@/lib/unit-convert';
import { SvgBracket, SvgManifold, SvgShaft, SvgPrecision, SvgMarine, SvgLowcost, SvgSpring, SvgHeatsink, SvgWear, SvgMedical, SvgCryogenic, SvgElectrical, SvgPressureVesselSmall, SvgGear, SvgFastener, SvgDieMold } from '@/pages/guide/svgs';

type ViewMode = 'table' | 'cards' | 'ashby';

interface HomeHeaderProps {
  /* i18n */
  t: (key: string) => string;
  lang: Lang;
  setLang: (l: Lang) => void;
  unitSystem: UnitSystem;
  toggleUnitSystem: () => void;
  /* 데이터 */
  materials: Material[];
  filtered: Material[];
  metalCount: number;
  polymerCount: number;
  ceramicCount: number;
  compositeCount: number;
  amCount: number;
  /* 검색 */
  searchOpen: boolean;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  recentSearches: string[];
  recentOpen: boolean;
  setRecentOpen: Dispatch<SetStateAction<boolean>>;
  pushRecent: (q: string) => void;
  /* View mode */
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  /* Compare */
  compareList: string[];
  handleOpenCompare: () => void;
  /* 즐겨찾기 dropdown */
  favorites: Set<string>;
  setSelectedMaterial: (m: Material) => void;
  toggleFavorite: (id: string) => void;
  /* Guide sheet */
  guideHeaderOpen: boolean;
  setGuideHeaderOpen: Dispatch<SetStateAction<boolean>>;
  openScenarioFromGuide: (k: ScenarioKey) => void;
  /* Scenario compare */
  setScenarioCompareOpen: Dispatch<SetStateAction<boolean>>;
  /* Onboarding */
  setTourOpen: Dispatch<SetStateAction<boolean>>;
  /* 백업/복원 */
  backupFileRef: RefObject<HTMLInputElement | null>;
  importAllState: (file: File) => void;
}

export function HomeHeader({
  t,
  lang,
  setLang,
  unitSystem,
  toggleUnitSystem,
  materials,
  filtered,
  metalCount,
  polymerCount,
  ceramicCount,
  compositeCount,
  amCount,
  searchOpen,
  setSearchOpen,
  filters,
  updateFilter,
  recentSearches,
  recentOpen,
  setRecentOpen,
  pushRecent,
  viewMode,
  setViewMode,
  compareList,
  handleOpenCompare,
  favorites,
  setSelectedMaterial,
  toggleFavorite,
  guideHeaderOpen,
  setGuideHeaderOpen,
  openScenarioFromGuide,
  setScenarioCompareOpen,
  setTourOpen,
  backupFileRef,
  importAllState,
}: HomeHeaderProps) {
  return (
    <header className="flex-shrink-0 h-12 flex items-center gap-3 px-4 border-b border-border bg-[oklch(0.22_0.055_250)] text-sidebar-foreground z-20">
      {/* Logo — R80: 모바일 hidden (좁은 헤더 공간 절약, 사용자가 가장 왼쪽 아이콘 제거 요청). */}
      <div className="hidden md:flex items-center gap-2.5 mr-2">
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

      {/* R81 — 모바일 search icon 을 헤더 왼쪽으로 이동 (왼쪽 정렬 일관). 검색 펼침 시는 헤더 전체 차지. */}
      {!searchOpen && (
        <button
          onClick={() => setSearchOpen(true)}
          className="md:hidden p-1.5 rounded hover:bg-white/10 text-sidebar-foreground"
          aria-label={t('header.search.placeholder')}
          title={t('header.search.placeholder')}
        >
          <Search className="w-4 h-4" />
        </button>
      )}

      {/* Stats — R82: 5색 chip 산만함 → 단일 텍스트 + hover tooltip breakdown 으로 통일. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="hidden md:flex h-7 px-2.5 items-center gap-1.5 text-[11px] rounded border border-sidebar-border/60 text-sidebar-foreground/70 hover:text-white hover:border-sidebar-border transition-colors cursor-default">
            <Database className="w-3 h-3 text-sidebar-foreground/50" />
            <span className="font-mono font-semibold text-white">{materials.length.toLocaleString()}</span>
            <span className="text-sidebar-foreground/50">{t('header.materials')}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="space-y-0.5 font-mono">
            <div className="flex justify-between gap-3"><span className="text-foreground/70">Metal</span><span>{metalCount.toLocaleString()}</span></div>
            <div className="flex justify-between gap-3"><span className="text-foreground/70">Polymer</span><span>{polymerCount.toLocaleString()}</span></div>
            <div className="flex justify-between gap-3"><span className="text-foreground/70">Ceramic</span><span>{ceramicCount}</span></div>
            <div className="flex justify-between gap-3"><span className="text-foreground/70">Composite</span><span>{compositeCount}</span></div>
            <div className="flex justify-between gap-3 pt-0.5 border-t border-border/30 mt-0.5"><span className="text-foreground/70">AM process</span><span>{amCount}</span></div>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Search — R49c: 모바일 기본 icon-only, 클릭 시 헤더 전체로 확장. 데스크탑은 항상 input. R81: 모바일 icon 은 헤더 왼쪽으로 분리됐고, 여기는 펼침 상태 input + 데스크탑 input 만 담당. */}
      <div className="flex-1 ml-auto mr-2 flex items-center justify-end min-w-0">
        <div className={`relative w-full max-w-md transition-all duration-200 ease-out ${searchOpen ? 'block opacity-100' : 'hidden md:block md:opacity-100'}`}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-foreground/40 pointer-events-none" />
          <Input
            data-search-input="1"
            aria-label={t('header.search.placeholder')}
            /* R170 — 모바일 iOS Safari auto-zoom 방지: 16px 강제. sm+ 부터 desktop 디자인 12px. */
            className="h-9 sm:h-7 pl-8 pr-8 text-base sm:text-xs bg-[oklch(0.28_0.06_250)] border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-accent"
            placeholder={t('header.search.placeholder')}
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            autoFocus={searchOpen}
            onFocus={() => setRecentOpen(recentSearches.length > 0)}
            onBlur={() => {
              if (filters.search.trim().length >= 2) pushRecent(filters.search);
              if (!filters.search) setSearchOpen(false);
              setTimeout(() => setRecentOpen(false), 200);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { pushRecent(filters.search); setRecentOpen(false); (e.target as HTMLInputElement).blur(); } }}
          />
          {/* Sprint2 A7 — 최근 검색 dropdown (input focus + 검색 비었을 때만) */}
          {recentOpen && !filters.search && recentSearches.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded shadow-lg z-50 max-h-64 overflow-auto">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground px-3 py-1 border-b border-border/50">최근 검색</div>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); updateFilter('search', s); setRecentOpen(false); }}
                  className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs hover:bg-muted/40 text-foreground"
                >
                  <Search className="w-3 h-3 text-muted-foreground" /> {s}
                </button>
              ))}
            </div>
          )}
          {(filters.search || searchOpen) && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground"
              onClick={() => { updateFilter('search', ''); setSearchOpen(false); }}
              aria-label="Close search"
            >
              <X className="w-4 h-4 sm:w-3 sm:h-3" />
            </button>
          )}
        </div>
      </div>

      {/* View mode toggle — R171: 모바일 hide (하단 nav 의 "뷰" cycle 가 대체). md+ 만 표시. */}
      <div className="hidden md:flex items-center gap-0.5 bg-[oklch(0.16_0.045_250)] rounded-md p-0.5 ring-1 ring-inset ring-sidebar-border/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]">
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

      {/* R61 #5 — 헤더 ? 도움말 버튼: 모바일·데스크탑 공통 Onboarding 재시작 trigger.
                   ?(Shift+/) 키 단축키와 동일 동작이지만, 모바일은 키보드 없으므로 필수. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded border border-sidebar-border text-sidebar-foreground/70 hover:text-white hover:border-accent transition-colors text-xs font-bold"
            aria-label={lang === 'en' ? 'Show onboarding tour' : '온보딩 다시 보기'}
          >
            ?
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{lang === 'en' ? 'Onboarding tour (6 steps)' : '온보딩 다시 보기 (6단계)'}</TooltipContent>
      </Tooltip>
      {/* R186 — Wizard 영구 제거. Guide 학습 권장. */}
      {/* R67 Sprint B — Engineering Tools link. 6 계산기 페이지. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/tools"
            className="h-7 px-2 flex items-center gap-1 rounded border border-sidebar-border text-sidebar-foreground/70 hover:text-white hover:border-accent transition-colors text-[11px] font-medium"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Tools</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Engineering Tools — Kt · Galvanic · Buckling · CTE · Hardness · Pressure</TooltipContent>
      </Tooltip>
      {/* R71 D — 백업/복원 hidden file input */}
      <input
        ref={backupFileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="백업 파일 선택"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importAllState(f); e.target.value = ''; }}
      />
      {/* R157b — Favorites dropdown → HomeFavoritesDropdown 컴포넌트로 추출. */}
      <HomeFavoritesDropdown
        favorites={favorites}
        materials={materials}
        setSelectedMaterial={setSelectedMaterial}
        toggleFavorite={toggleFavorite}
      />

      {/* 가이드 — 시트로 빠른 열람 + 사례 시작. R171: 모바일 hide (하단 nav 의 "가이드" 가 동일 sheet 제공). */}
      <Sheet open={guideHeaderOpen} onOpenChange={setGuideHeaderOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger
              className="hidden md:flex h-7 px-2 items-center gap-1.5 rounded border border-sidebar-border text-sidebar-foreground/70 hover:text-white hover:border-accent transition-colors text-[11px] font-medium"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{t('header.guide')}</span>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('header.guide.tooltip')}</TooltipContent>
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
                { key: 'pressure_vessel' as ScenarioKey, title: '압력용기', sub: '탱크·실린더', Svg: SvgPressureVesselSmall },
                { key: 'gear' as ScenarioKey, title: '기어', sub: '동력 전달', Svg: SvgGear },
                { key: 'fastener' as ScenarioKey, title: '체결구', sub: '볼트·스터드', Svg: SvgFastener },
                { key: 'die_mold' as ScenarioKey, title: '다이·금형', sub: '사출·단조·절삭', Svg: SvgDieMold },
              ].map((tile) => (
                <button
                  key={tile.key}
                  type="button"
                  onClick={() => openScenarioFromGuide(tile.key)}
                  className="group rounded border border-border bg-card hover:border-accent hover:shadow-sm hover:bg-accent/5 transition-all p-2 text-left flex items-center gap-2.5"
                >
                  <div className="w-12 h-10 flex-shrink-0 rounded bg-muted/40 border border-border/60 p-0.5 flex items-center justify-center group-hover:border-accent/40 transition-colors">
                    <tile.Svg />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate leading-tight">{tile.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">{tile.sub}</p>
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

      {/* R31 — KO / EN 언어 토글. R80: 모바일 hidden (하단 Settings 시트에서 처리). */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            className="hidden md:block h-7 px-2 rounded border border-sidebar-border text-sidebar-foreground/70 hover:text-white hover:border-accent transition-colors text-[11px] font-mono font-semibold"
          >
            {lang === 'ko' ? '한' : 'EN'}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{lang === 'ko' ? '언어 전환 — 한국어' : 'Switch language — English'}</TooltipContent>
      </Tooltip>

      {/* R27 — SI / Imperial 단위 토글. R80: 모바일 hidden. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleUnitSystem}
            className="hidden md:block h-7 px-2 rounded border border-sidebar-border text-sidebar-foreground/70 hover:text-white hover:border-accent transition-colors text-[11px] font-mono font-semibold"
          >
            {unitSystem === 'si' ? 'SI' : 'IMP'}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{lang === 'ko' ? '단위 전환' : 'Switch units'} — {unitSystem === 'si' ? 'SI (MPa·GPa·°C·g/cm³)' : 'Imperial (ksi·Msi·°F·lb/in³)'}</TooltipContent>
      </Tooltip>

      {/* B5: 사례 비교 — 두 사례 동시 입력 + 산출 비교 + 교집합 적용 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setScenarioCompareOpen(true)}
            className="hidden lg:flex h-7 px-2 items-center gap-1.5 rounded border border-sidebar-border text-sidebar-foreground/70 hover:text-white hover:border-accent transition-colors text-[11px] font-medium"
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
            {t('header.scenarioCompare')}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{t('header.scenarioCompare.tooltip')}</TooltipContent>
      </Tooltip>

      {/* Compare button — R171: 모바일 hide (하단 nav 의 "Compare" 가 동일 기능 + count badge). */}
      {compareList.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex h-7 px-2.5 text-[11px] bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-[oklch(0.28_0.06_250)] gap-1.5"
          onClick={handleOpenCompare}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Compare
          <Badge className="h-4 w-4 p-0 text-[9px] flex items-center justify-center bg-accent text-white border-0 rounded-full">
            {compareList.length}
          </Badge>
        </Button>
      )}

      {/* R80 — 모바일 sidebar toggle 제거. 필터는 하단 nav 의 첫 버튼으로 통일 (왼쪽에서 sidebar 가 슬라이드되는 동작과 일관). */}
    </header>
  );
}
