/*
 * R157b — Home page 의 mobile bottom navigation.
 * Home.tsx 의 inline 정의에서 추출. Behavior identical.
 *
 * 5 column grid: 필터 · 뷰 · Compare · 가이드 · Settings.
 */
import { Menu, Table2, BarChart3, LayoutGrid, Bookmark, GraduationCap, Settings, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SvgBracket, SvgManifold, SvgShaft, SvgPrecision, SvgMarine, SvgLowcost, SvgSpring, SvgHeatsink, SvgWear, SvgMedical, SvgCryogenic, SvgElectrical, SvgPressureVesselSmall, SvgGear, SvgFastener, SvgDieMold } from '@/pages/guide/svgs';
import type { ScenarioKey } from '@/lib/scenario-presets';
import type { Lang } from '@/lib/i18n';
import type { UnitSystem } from '@/lib/unit-convert';

type ViewMode = 'table' | 'cards' | 'ashby';

interface HomeMobileNavProps {
  setShowCompare: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
  activeFilterCount: number;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  compareList: string[];
  handleOpenCompare: () => void;
  guideMobileOpen: boolean;
  setGuideMobileOpen: (v: boolean) => void;
  openScenarioFromGuide: (key: ScenarioKey) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  unitSystem: UnitSystem;
  toggleUnitSystem: () => void;
  setTourOpen: (v: boolean) => void;
}

export function HomeMobileNav({
  setShowCompare,
  setMobileSidebarOpen,
  activeFilterCount,
  viewMode,
  setViewMode,
  compareList,
  handleOpenCompare,
  guideMobileOpen,
  setGuideMobileOpen,
  openScenarioFromGuide,
  lang,
  setLang,
  unitSystem,
  toggleUnitSystem,
  setTourOpen,
}: HomeMobileNavProps) {
  return (
    <nav className="md:hidden fixed left-0 right-0 bottom-0 grid grid-cols-5 border-t border-border bg-background z-50">
      {/* R115 — nav 의 다른 버튼 클릭 시 Compare 자동 닫힘. */}
      <button onClick={() => { setShowCompare(false); setMobileSidebarOpen(true); }} className="flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] text-muted-foreground hover:text-accent hover:bg-accent/5 transition-colors">
        <Menu className="w-4 h-4" /> 필터{activeFilterCount > 0 && <span className="absolute mt-2 -mr-6 inline-block w-3 h-3 rounded-full bg-accent text-white text-[8px] leading-3 text-center font-bold">{activeFilterCount}</span>}
      </button>
      <button
        onClick={() => { setShowCompare(false); setViewMode(viewMode === 'table' ? 'ashby' : viewMode === 'ashby' ? 'cards' : 'table'); }}
        className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] text-accent hover:bg-accent/5 transition-colors"
        title="다음 뷰로 전환 · Compare 자동 닫힘"
      >
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" aria-hidden />
        {viewMode === 'table' ? <Table2 className="w-4 h-4" /> : viewMode === 'ashby' ? <BarChart3 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
        {viewMode === 'table' ? 'Table' : viewMode === 'ashby' ? 'Ashby' : 'Cards'}
      </button>
      <button
        onClick={handleOpenCompare}
        disabled={compareList.length === 0}
        className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] text-muted-foreground hover:text-accent hover:bg-accent/5 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
      >
        <Bookmark className="w-4 h-4" /> Compare
        {compareList.length > 0 && (
          <span className="absolute top-0.5 right-1/4 -translate-y-0 inline-block min-w-[16px] h-4 rounded-full bg-accent text-white text-[9px] leading-4 text-center font-bold px-1">{compareList.length}</span>
        )}
      </button>
      <Sheet open={guideMobileOpen} onOpenChange={(v) => { if (v) setShowCompare(false); setGuideMobileOpen(v); }}>
        <SheetTrigger className="flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] text-muted-foreground hover:text-accent hover:bg-accent/5 transition-colors w-full">
          <GraduationCap className="w-4 h-4" /> 가이드
        </SheetTrigger>
        <SheetContent side="right" className="w-[88vw] sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-accent" /> 가이드 · 사례 빠른 시작</SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-2">
            <p className="text-[11px] text-muted-foreground">사례를 골라 다이얼로그로 시작. 깊이 학습하려면 전체 가이드.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { key: 'bracket' as ScenarioKey, title: '구조 브래킷', Svg: SvgBracket },
                { key: 'hightemp' as ScenarioKey, title: '고온 부품', Svg: SvgManifold },
                { key: 'fatigue' as ScenarioKey, title: '회전·진동축', Svg: SvgShaft },
                { key: 'precision' as ScenarioKey, title: '정밀 마운트', Svg: SvgPrecision },
                { key: 'corrosion' as ScenarioKey, title: '해양·화학', Svg: SvgMarine },
                { key: 'lowcost' as ScenarioKey, title: '저원가 양산', Svg: SvgLowcost },
                { key: 'spring' as ScenarioKey, title: '스프링·힌지', Svg: SvgSpring },
                { key: 'heatsink' as ScenarioKey, title: '히트싱크', Svg: SvgHeatsink },
                { key: 'wear' as ScenarioKey, title: '내마모', Svg: SvgWear },
                { key: 'medical' as ScenarioKey, title: '의료 임플란트', Svg: SvgMedical },
                { key: 'cryogenic' as ScenarioKey, title: '극저온', Svg: SvgCryogenic },
                { key: 'electrical' as ScenarioKey, title: '전기 전도체', Svg: SvgElectrical },
                { key: 'pressure_vessel' as ScenarioKey, title: '압력용기', Svg: SvgPressureVesselSmall },
                { key: 'gear' as ScenarioKey, title: '기어', Svg: SvgGear },
                { key: 'fastener' as ScenarioKey, title: '체결구', Svg: SvgFastener },
                { key: 'die_mold' as ScenarioKey, title: '다이·금형', Svg: SvgDieMold },
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => openScenarioFromGuide(t.key)}
                  className="group rounded border border-border bg-card hover:border-accent hover:bg-accent/5 transition-all p-1.5 text-left flex items-center gap-1.5"
                >
                  <div className="w-9 h-7 flex-shrink-0 rounded bg-muted/40 p-0.5 flex items-center justify-center"><t.Svg /></div>
                  <p className="text-[11px] font-medium text-foreground truncate leading-tight">{t.title}</p>
                </button>
              ))}
            </div>
            <Link href="/guide" className="block text-center text-xs font-medium px-3 py-2 rounded border border-accent text-accent hover:bg-accent/10 transition-colors mt-2">
              전체 가이드 페이지 열기 →
            </Link>
          </div>
        </SheetContent>
      </Sheet>
      {/* R80 — Settings 시트: 모바일 헤더에서 빠진 KO/EN · SI/IMP · 온보딩 토글을 한 곳에 모음. R115: 열림 시 Compare 자동 닫힘. */}
      <Sheet onOpenChange={(v) => { if (v) setShowCompare(false); }}>
        <SheetTrigger className="flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] text-muted-foreground hover:text-accent hover:bg-accent/5 transition-colors w-full">
          <Settings className="w-4 h-4" /> Settings
        </SheetTrigger>
        <SheetContent side="right" className="w-[88vw] sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Settings className="w-4 h-4 text-accent" /> Settings</SheetTitle>
          </SheetHeader>
          {/* R83 — row layout: 라벨(좌) + toggle group(우) 한 줄. 카드 3개 분리보다 자연스러움. */}
          <div className="mt-4 rounded border border-border divide-y divide-border/60">
            {/* 언어 row */}
            <div className="flex items-center justify-between px-3 py-3 gap-3">
              <span className="text-xs font-medium text-foreground/80 flex-shrink-0">{lang === 'ko' ? '언어' : 'Language'}</span>
              <div className="flex gap-0.5 bg-muted/40 rounded p-0.5 ring-1 ring-inset ring-border/40">
                <button
                  onClick={() => setLang('ko')}
                  className={`h-7 px-3 rounded text-xs font-semibold transition-all ${lang === 'ko' ? 'bg-accent text-white shadow-sm' : 'text-foreground/60 hover:text-foreground'}`}
                >한국어</button>
                <button
                  onClick={() => setLang('en')}
                  className={`h-7 px-3 rounded text-xs font-semibold transition-all ${lang === 'en' ? 'bg-accent text-white shadow-sm' : 'text-foreground/60 hover:text-foreground'}`}
                >English</button>
              </div>
            </div>
            {/* 단위 row */}
            <div className="flex items-center justify-between px-3 py-3 gap-3">
              <span className="text-xs font-medium text-foreground/80 flex-shrink-0">{lang === 'ko' ? '단위' : 'Units'}</span>
              <div className="flex gap-0.5 bg-muted/40 rounded p-0.5 ring-1 ring-inset ring-border/40">
                <button
                  onClick={() => unitSystem !== 'si' && toggleUnitSystem()}
                  className={`h-7 px-3 rounded text-xs font-semibold transition-all ${unitSystem === 'si' ? 'bg-accent text-white shadow-sm' : 'text-foreground/60 hover:text-foreground'}`}
                >SI</button>
                <button
                  onClick={() => unitSystem !== 'imperial' && toggleUnitSystem()}
                  className={`h-7 px-3 rounded text-xs font-semibold transition-all ${unitSystem === 'imperial' ? 'bg-accent text-white shadow-sm' : 'text-foreground/60 hover:text-foreground'}`}
                >Imperial</button>
              </div>
            </div>
            {/* 온보딩 row */}
            <button
              onClick={() => setTourOpen(true)}
              className="w-full flex items-center justify-between px-3 py-3 gap-3 hover:bg-muted/30 transition-colors"
            >
              <span className="text-xs font-medium text-foreground/80 flex items-center gap-2">
                <span className="inline-flex w-4 h-4 rounded-full border border-accent text-[10px] leading-[14px] items-center justify-center font-bold text-accent">?</span>
                {lang === 'ko' ? '온보딩 다시 보기 (6단계)' : 'Onboarding tour (6 steps)'}
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
