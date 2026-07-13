/*
 * 재료 선택 가이드 (한국어) — 기계공학 1학년부터 따라올 수 있도록
 * 교과서식으로 풀어 쓴 도움말 페이지. 챕터 단위 구성 + 카드형 시각 자료.
 *
 * 내용은 정립된 공학 지식 (Ashby, "Materials Selection in Mechanical Design";
 * Ansys Granta EduPack 교육자료; 일반 재료역학) 기반. 워크드 예제의 수치는
 * 방법을 보여주기 위한 예시이며 특정 재료의 측정값이 아님.
 */
import { Link, useParams, useLocation } from 'wouter';
import { useState, useMemo } from 'react';
import { ArrowLeft, GraduationCap, Ruler, Target, LineChart, ListChecks, AlertTriangle, BookText, Sigma, Lightbulb, BookOpen, Compass, Rocket, ChevronDown, Search, X, BookMarked } from 'lucide-react';
import { searchGuide, type GuideIndexEntry } from './guide/index-entries';
import type { ScenarioKey } from '@/lib/scenario-presets';
import { ScenarioDialog } from '@/components/ScenarioDialog';
import { GlossaryBrowser } from '@/components/GlossaryBrowser';
import { GLOSSARY } from '@/lib/glossary';
import { GuideSidebar } from './guide/GuideSidebar';
import { ChapterSubToc } from './guide/ChapterSubToc';
import { TOC } from './guide/toc';
// C1: Guide 페이지 구성요소를 ./guide/{components,svgs}.tsx 로 분리해 파일 사이즈 축소.
import { F, Note, ExtLink, Term, Chapter, H3, PropCard, Step, ShapeCard, LoadCard, Scenario, useReadChapters, GuideMaterialMapContext } from './guide/components';
import { useWikiRefs } from '@/hooks/useWikiRefs';
import { buildAutolinkMap } from '@/lib/wiki-link';
import {
  SvgBracket, SvgManifold, SvgShaft, SvgPrecision, SvgMarine, SvgLowcost, SvgSpring, SvgHeatsink,
  SvgWear, SvgMedical, SvgCryogenic, SvgElectrical,
  SvgPressureVesselSmall, SvgGear, SvgFastener, SvgDieMold,
  SvgRect, SvgSquare, SvgCircle, SvgBox, SvgTube, SvgIBeam,
  SvgColumn,
  SvgStressStrain, SvgBendingStress, SvgAshbyChart, SvgFCOF, SvgTorsion, SvgMohr, SvgPressureVessel,
  SvgAMAnisotropy, SvgHIPEffect, SvgSafetyFactor,
  IconYield, IconUTS, IconElongation, IconE, IconHardness, IconFatigue, IconDensity, IconCTE, IconK, IconMaxTemp,
  SvgCantileverV2, SvgCantileverUDLV2, SvgSimpleCenterV2, SvgSimpleUDLV2, SvgFixedCenterV2, SvgFixedUDLV2,
} from './guide/svgs';

/* ─────────────────────────────────────────────────────────────────────────────
 * 메인 페이지
 * ────────────────────────────────────────────────────────────────────────── */

// R227/E14/H7 — TOC 는 guide/toc.ts SSOT (Guide·사이드바·용어 페이지 공유).

/** 사례 타일 — R61 #3 자주 쓰는 6 + 점진 공개 10. 첫 시각 부담 ↓. */
type ScenarioTile = { key: ScenarioKey; title: string; sub: string; svg: () => React.ReactElement };
const POPULAR_TILES: ScenarioTile[] = [
  { key: 'bracket', title: '구조 브래킷', sub: '경량 + 고강성', svg: SvgBracket },
  { key: 'heatsink', title: '히트싱크', sub: '방열', svg: SvgHeatsink },
  { key: 'fatigue', title: '회전·진동축', sub: '피로 한도', svg: SvgShaft },
  { key: 'corrosion', title: '해양·화학', sub: '내식 환경', svg: SvgMarine },
  { key: 'wear', title: '내마모', sub: '경도 + 접촉', svg: SvgWear },
  { key: 'electrical', title: '전기 전도체', sub: '버스바·접점', svg: SvgElectrical },
];
const EXTRA_TILES: ScenarioTile[] = [
  { key: 'hightemp', title: '고온 부품', sub: '배기 · 터빈', svg: SvgManifold },
  { key: 'precision', title: '정밀 마운트', sub: '저 CTE', svg: SvgPrecision },
  { key: 'lowcost', title: '저원가 양산', sub: '가성비', svg: SvgLowcost },
  { key: 'spring', title: '스프링 · 힌지', sub: '탄성 에너지', svg: SvgSpring },
  { key: 'medical', title: '의료 임플란트', sub: '생체적합', svg: SvgMedical },
  { key: 'cryogenic', title: '극저온', sub: 'LNG · 우주', svg: SvgCryogenic },
  { key: 'pressure_vessel', title: '압력용기', sub: '탱크·실린더', svg: SvgPressureVesselSmall },
  { key: 'gear', title: '기어', sub: '동력 전달', svg: SvgGear },
  { key: 'fastener', title: '체결구', sub: '볼트·스터드', svg: SvgFastener },
  { key: 'die_mold', title: '다이·금형', sub: '사출·단조·절삭', svg: SvgDieMold },
];
const SCENARIO_TILES = [...POPULAR_TILES, ...EXTRA_TILES];

export default function Guide() {
  // R227/E14/H7 — 멀티페이지: /guide = 랜딩, /guide/:section = 단일 챕터(+사이드바).
  const routeParams = useParams<{ section?: string }>();
  const section = routeParams?.section;
  const [, navigate] = useLocation();
  // R227/E14 — 가이드 본문 합금명 자동링크용 재료 맵(wiki-index). 로드 실패 시 null → 재료 링크 생략(용어는 유지).
  const wikiLookups = useWikiRefs();
  const materialMap = useMemo(() => (wikiLookups ? buildAutolinkMap(wikiLookups) : null), [wikiLookups]);
  /* 랜딩의 기존 #chX 앵커(학습경로·CTA·흐름도 SVG 포함)를 위임 처리 → /guide/chX SPA 이동.
     앵커 개별 수정 없이 한 곳에서 라우팅(멀티페이지에서 챕터는 별도 페이지이므로). */
  const onLandingAnchorClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement)?.closest?.('a[href^="#ch"]') as HTMLElement | null;
    if (a) { e.preventDefault(); navigate(`/guide/${(a.getAttribute('href') || '').slice(1)}`); }
  };
  const [dialogKey, setDialogKey] = useState<ScenarioKey | null>(null);
  const openConfig = (k: ScenarioKey) => setDialogKey(k);
  // R61 #3 — 자주 쓰는 6개만 처음 노출. "더 보기" 로 나머지 10 펼침.
  const [showAllTiles, setShowAllTiles] = useState(false);
  const visibleTiles = showAllTiles ? [...POPULAR_TILES, ...EXTRA_TILES] : POPULAR_TILES;
  /* R187 — 학습 진행률 (TOC 의 chapter 별 ✓ + 전체 progress bar). */
  const { isRead: isChapterRead } = useReadChapters();
  const readCount = TOC.filter(t => isChapterRead(t.id)).length;
  const readPct = Math.round((readCount / TOC.length) * 100);
  // R66 — Guide 안 검색. sticky bar + dropdown. 결과 click → anchor scroll + chapter open.
  const [searchQ, setSearchQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchResults: GuideIndexEntry[] = searchQ ? searchGuide(searchQ) : [];
  const gotoEntry = (e: GuideIndexEntry) => {
    setSearchQ(''); setSearchOpen(false);
    // W6+ — 글로서리 용어는 전용 term 페이지로 SPA 이동.
    if (e.termSlug) { navigate(`/guide/term/${e.termSlug}`); return; }
    // hashchange listener (Chapter) 가 자동으로 chapter open. 직접 anchor 클릭.
    window.location.hash = `#${e.ch}`;
    // smooth scroll + 강조 효과
    setTimeout(() => {
      const el = document.getElementById(e.ch);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-accent', 'rounded-lg');
        setTimeout(() => el.classList.remove('ring-2', 'ring-accent', 'rounded-lg'), 2400);
      }
    }, 200);
  };
  return (
    <GuideMaterialMapContext.Provider value={materialMap}>
    <div className="min-h-screen bg-background text-foreground">
      <ScenarioDialog scenarioKey={dialogKey} open={dialogKey !== null} onOpenChange={(v) => { if (!v) setDialogKey(null); }} />
      {/* 상단 바 — R66 검색 + R101 모바일 layout fix (whitespace-nowrap + 모바일 라벨 축약 + min-w-0). */}
      <header className="sticky top-0 z-20 h-12 flex items-center gap-2 sm:gap-3 px-2 sm:px-4 border-b border-border bg-[oklch(0.22_0.055_250)] text-sidebar-foreground">
        <Link href="/" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm hover:text-white text-sidebar-foreground/80 whitespace-nowrap flex-shrink-0">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">탐색기로 돌아가기</span><span className="sm:hidden">탐색</span>
        </Link>
        <div className="w-px h-5 bg-sidebar-border hidden sm:block flex-shrink-0" />
        <span className="hidden md:flex items-center gap-2 text-sm font-semibold text-white whitespace-nowrap flex-shrink-0">
          <GraduationCap className="w-4 h-4 text-accent" /> 재료 선택 가이드
        </span>
        <span className="flex md:hidden items-center text-white flex-shrink-0">
          <GraduationCap className="w-4 h-4 text-accent" />
        </span>
        {/* R186 — Wizard 영구 제거. Guide 학습 권장. */}
        <div className="ml-auto relative flex-1 max-w-[280px] sm:max-w-[360px] min-w-0">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 pointer-events-none" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(searchQ.length >= 2)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            placeholder="가이드 검색 — Ashby · 안전계수 · HIP · ASTM · galvanic …"
            className="w-full h-7 pl-7 pr-7 text-[12px] rounded border border-sidebar-border bg-[oklch(0.28_0.06_250)] text-white placeholder:text-sidebar-foreground/40 focus:outline-none focus:border-accent"
            aria-label="가이드 검색"
          />
          {searchQ && (
            <button
              type="button"
              onClick={() => { setSearchQ(''); setSearchOpen(false); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-sidebar-foreground/50 hover:text-white"
              aria-label="검색 지우기"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {/* 검색 결과 dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-[400px] overflow-auto z-30">
              <div className="text-[10px] text-muted-foreground px-3 py-1.5 border-b border-border/50">결과 <b className="text-foreground">{searchResults.length}</b></div>
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); gotoEntry(r); }}
                  className="w-full text-left px-3 py-2 hover:bg-muted/40 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-baseline gap-2">
                    {r.termSlug ? (
                      <span className="text-[10px] bg-violet-500/15 text-violet-700 rounded px-1.5 py-0.5 font-bold flex-shrink-0">용어</span>
                    ) : (
                      <span className="text-[10px] bg-accent/15 text-accent rounded px-1.5 py-0.5 font-bold flex-shrink-0">Ch.{r.chapterN}</span>
                    )}
                    <span className="text-[12px] font-semibold text-foreground">{r.termSlug ? r.section : r.chapterLabel}</span>
                    {!r.termSlug && r.section && <span className="text-[10px] text-muted-foreground">› {r.section}</span>}
                  </div>
                  <p className="text-[11px] text-foreground/70 mt-0.5 line-clamp-2">{r.snippet}</p>
                </button>
              ))}
            </div>
          )}
          {searchOpen && searchQ.length >= 2 && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-30 p-3 text-xs text-muted-foreground">
              "{searchQ}" 매칭 없음 — 다른 키워드 시도 (예: Ashby · HIP · 갈바닉 · MMPDS · ASTM E8)
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        <GuideSidebar toc={TOC} section={section} isRead={isChapterRead} />
        <div className="mx-auto max-w-3xl px-5 py-10 flex-1 min-w-0">
        {!section && (<div onClick={onLandingAnchorClick}>
        {/* Hero */}
        <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-emerald-500/5 p-6">
          <p className="text-[11px] tracking-[0.25em] uppercase text-accent font-bold">기계공학 1학년부터 따라올 수 있는</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">재료 선택 가이드</h1>
          <p className="text-foreground/80 mt-3 leading-relaxed">
            “이 부품이 안 부러지고, 안 휘고, 가벼웠으면 좋겠다”는 요구를 <b className="text-accent">σy ≥ 250 MPa</b>, <b className="text-accent">E ≥ 70 GPa</b> 같은 <b>숫자</b>로 바꾸고,
            그 숫자로 수백 개 재료에서 최적을 고르는 <b>방법</b>을 단계별로 익힙니다. 교과서처럼 천천히 읽고, 마지막엔 이 앱에서 바로 적용해 보세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              '응력 = F/A 부터 시작',
              '보 처짐과 단면의 관계',
              'Ashby 차트로 후보 좁히기',
              '실전 사례 16선 → 한 클릭 적용',
            ].map((t) => (
              <span key={t} className="text-[11px] px-2 py-1 rounded-full bg-background border border-border text-foreground/80">{t}</span>
            ))}
          </div>
          {/* 시작 팁 — 단축키·검색 패턴·언어/단위. 한 줄로 자연스럽게. */}
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            <b className="text-foreground/80">단축키</b>: <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">/</kbd> 검색 · <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">?</kbd> 온보딩 다시 보기 ·
            <span className="ml-1"><b className="text-foreground/80">검색</b>은 약어·구분자 무시(<span className="font-mono">ti6al4v</span>·<span className="font-mono">316l</span>·<span className="font-mono">ss316</span>).</span>
            <span className="ml-1">우측 상단에서 <b>한/EN</b>·<b>SI/Imperial</b> 전환.</span>
          </p>
        </div>

        {/* R187 — 학습 path overview (Level 별). 초보 사용자의 첫 진입점.
         *   초급 → 중급 → 고급 학습 경로 명시. 기존 사용자는 skip 가능. */}
        <div className="mt-6 rounded-lg border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-violet-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent mb-2 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> 학습 경로 — 처음이라면 여기서부터
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-3">
            {/* 초급 */}
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">초급</span>
                <b className="text-sm text-emerald-900">실전 사례로 시작</b>
              </div>
              <p className="text-[11px] text-emerald-800/80 leading-relaxed mb-2">
                "이 부품에 어떤 재료를 써야 하나" 부터 명확히. 16 사례 중 가까운 것 선택 → 자동 필터 적용.
              </p>
              <div className="text-[10px] space-y-0.5">
                <a href="#ch7" className="block text-emerald-700 hover:underline">→ Ch.1 실전 사례 16선</a>
                <a href="#ch10" className="block text-emerald-700 hover:underline">→ Ch.3 합금 family 매핑</a>
              </div>
            </div>
            {/* 중급 */}
            <div className="rounded-md border border-violet-300 bg-violet-50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-600 text-white font-bold">중급</span>
                <b className="text-sm text-violet-900">이론 + 계산</b>
              </div>
              <p className="text-[11px] text-violet-800/80 leading-relaxed mb-2">
                Ashby 선택법, 물성·열처리 사전, 응력·처짐 계산. "왜 그 재료" 의 근거 명확화.
              </p>
              <div className="text-[10px] space-y-0.5">
                <a href="#ch6" className="block text-violet-700 hover:underline">→ Ch.2 Ashby 선택법</a>
                <a href="#ch1" className="block text-violet-700 hover:underline">→ Ch.4 물성·열처리 사전</a>
                <a href="#ch2" className="block text-violet-700 hover:underline">→ Ch.5 요구→숫자 변환</a>
              </div>
            </div>
            {/* 고급 */}
            <div className="rounded-md border border-rose-300 bg-rose-50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold">고급</span>
                <b className="text-sm text-rose-900">산업 적용</b>
              </div>
              <p className="text-[11px] text-rose-800/80 leading-relaxed mb-2">
                흔한 설계 실수, AM 특화, 인증·시제품 시험, family 기본론. 실무 적용 차원의 깊이.
              </p>
              <div className="text-[10px] space-y-0.5">
                <a href="#ch11" className="block text-rose-700 hover:underline">→ Ch.9 흔한 실수 10선</a>
                <a href="#ch12" className="block text-rose-700 hover:underline">→ Ch.11 인증·시제품</a>
                <a href="#ch15" className="block text-rose-700 hover:underline">→ Ch.14 재료 family 기본론</a>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 italic">
            💡 chapter 별 학습 목표 + 진행률은 본문 상단에 표시. 단축키 <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">/</kbd> 으로 chapter 내부 검색 가능.
          </p>
        </div>

        {/* R61 #2 — 3-path CTA: 5분 시작 / Ashby 방법 / 전체 목차. 첫 사용자 의도 분기. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <button
            type="button"
            onClick={() => openConfig('bracket')}
            className="group rounded-lg border border-accent/40 bg-accent/5 p-4 text-left hover:border-accent hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center"><Rocket className="w-4 h-4" /></span>
              <b className="text-sm">5분 빠른 시작</b>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">대표 사례 <b className="text-foreground/80">구조 브래킷</b>으로 한 클릭 적용 → 필터·차트·Index 가 자동으로 셋업됩니다.</p>
          </button>
          <a
            href="#ch6"
            className="rounded-lg border border-border bg-card p-4 hover:border-accent hover:shadow-md transition-all block"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center"><ListChecks className="w-4 h-4" /></span>
              <b className="text-sm">30분 Ashby 방법 학습</b>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">기능·제약·목적·자유변수 4요소로 문제를 정리, 성능지수 M 도출, 차트 활용까지.</p>
          </a>
          <a
            href="#ch1"
            className="rounded-lg border border-border bg-card p-4 hover:border-accent hover:shadow-md transition-all block"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><BookOpen className="w-4 h-4" /></span>
              <b className="text-sm">참고서로 보기</b>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">16 사례 + Ashby 이론 + 물성 사전 + 단면·보·비틀림·압력. 챕터 별 별도 학습용.</p>
          </a>
        </div>

        {/* 빠른 접근 — 사례 타일 그리드 (다이얼로그로 곧장) */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><Sigma className="w-3.5 h-3.5" /> 바로 시작 — 설계 사례 선택</p>
            <a href="#ch7" className="text-[11px] text-accent hover:underline">사례 설명 자세히 →</a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {visibleTiles.map((t) => (
              <button
                type="button"
                key={t.key}
                onClick={() => openConfig(t.key)}
                className="group flex flex-col gap-1 rounded-lg border border-border bg-card p-2 text-left hover:border-accent hover:shadow-md transition-all"
                title="세부 조건 입력 다이얼로그를 엽니다"
              >
                <div className="w-full h-14 bg-muted/30 rounded border border-border/60 flex items-center justify-center p-1 group-hover:bg-accent/5 transition-colors">
                  <t.svg />
                </div>
                <span className="text-sm font-semibold text-foreground leading-tight px-1">{t.title}</span>
                <span className="text-[11px] text-muted-foreground px-1">{t.sub}</span>
              </button>
            ))}
          </div>
          {/* R61 #3 — 6 자주 쓰는 + 더보기 10. 점진 공개로 첫 시각 부담 ↓ */}
          {!showAllTiles && (
            <button
              type="button"
              onClick={() => setShowAllTiles(true)}
              className="mt-2 w-full text-[11px] py-1.5 rounded border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-accent flex items-center justify-center gap-1"
            >
              <ChevronDown className="w-3 h-3" />
              산업 특화 + 기계요소 {EXTRA_TILES.length}개 더 보기
            </button>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">타일을 누르면 치수·하중·재료 조건 다이얼로그가 열리고, <b className="text-foreground/80">적용 전 어떤 필터가 켜질지 미리보기</b>도 함께 표시됩니다. 기초가 필요하면 아래 목차에서 챕터로.</p>
        </div>

        {/* R65 A — 설계 의사결정 흐름도. "지금 어느 단계에 있나" 큰 그림 + 챕터 anchor 링크. */}
        <div className="mt-6 rounded-lg border border-accent/30 bg-accent/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-3 flex items-center gap-1.5"><Compass className="w-3.5 h-3.5" /> 설계 → 재료 선택 의사결정 흐름</p>
          <svg viewBox="0 0 760 200" className="w-full h-auto">
            {/* R188 — sub label 단축 (box 92px width 가독성 확보, AS9100·ISO 13485 → AS9100 / ISO 등). */}
            {[
              { x: 8,   label: '① 요구 정의', sub: '기능·하중·환경', href: '#ch2', n: 5 },
              { x: 118, label: '② Family 매핑', sub: '경량→Al/Ti', href: '#ch10', n: 3 },
              { x: 228, label: '③ Ashby 좁히기', sub: '필터+Index M', href: '#ch6', n: 2 },
              { x: 338, label: '④ Compare', sub: 'CSV·Radar', href: '#ch6', n: 2 },
              { x: 448, label: '⑤ 검증', sub: '데이터시트', href: '#ch8', n: 13 },
              { x: 558, label: '⑥ 시제품 시험', sub: '인장·피로', href: '#ch12', n: 11 },
              { x: 668, label: '⑦ 인증·양산', sub: 'AS9100·ISO', href: '#ch12', n: 11 },
            ].map((s, i) => (
              <g key={i}>
                <a href={s.href}>
                  <rect x={s.x} y="58" width="92" height="60" rx="6" fill="oklch(0.99 0.005 250)" stroke="oklch(0.55 0.12 220)" className="hover:fill-accent/10" />
                  <text className="svg-text-bg-sm" x={s.x + 46} y="78" textAnchor="middle" fontSize="11" fontWeight="bold" fill="oklch(0.3 0.04 250)">{s.label}</text>
                  <text className="svg-text-bg-sm" x={s.x + 46} y="94" textAnchor="middle" fontSize="9" fill="oklch(0.5 0.04 250)">{s.sub}</text>
                  <text className="svg-text-bg-sm" x={s.x + 46} y="110" textAnchor="middle" fontSize="8" fontWeight="bold" fill="oklch(0.55 0.12 220)">Ch.{s.n} →</text>
                </a>
                {i < 6 && (
                  <line x1={s.x + 92} y1="88" x2={s.x + 110} y2="88" stroke="oklch(0.55 0.12 220)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                )}
              </g>
            ))}
            {/* Feedback loop */}
            <path d="M 700 130 Q 700 170 380 170 Q 60 170 60 130" fill="none" stroke="oklch(0.55 0.12 30 / 0.6)" strokeWidth="1.2" strokeDasharray="4 3" markerEnd="url(#arrowRed)" />
            <text className="svg-text-bg-sm" x="380" y="186" textAnchor="middle" fontSize="9" fill="oklch(0.5 0.12 30)" fontStyle="italic">반복 — 시험 결과로 후보 재조정</text>
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.12 220)" /></marker>
              <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.12 30)" /></marker>
            </defs>
            <text className="svg-text-bg-sm" x="380" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.3 0.04 250)">전체 7단계 — 박스 클릭으로 해당 챕터로</text>
            <text className="svg-text-bg-sm" x="380" y="38" textAnchor="middle" fontSize="9" fill="oklch(0.5 0.04 250)">앱은 ②~④ 단계 자동화. ①·⑤·⑥·⑦ 은 가이드 + 외부 검증.</text>
          </svg>
        </div>

        {/* 학습 흐름 — R187: 진행률 indicator 추가 */}
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><Compass className="w-3.5 h-3.5" /> 추천 목차 (실전 → 이론 순)</p>
            {/* R187 — 전체 진행률 progress bar */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-foreground">{readCount} / {TOC.length}</span>
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${readPct}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{readPct}%</span>
            </div>
          </div>
          <ol className="space-y-1.5">
            {TOC.map((t) => {
              const read = isChapterRead(t.id);
              return (
                <li key={t.id} className="flex items-center gap-2">
                  <span className={`text-[10px] w-6 text-center rounded font-bold py-0.5 ${read ? 'bg-emerald-100 text-emerald-700' : 'bg-accent/15 text-accent'}`}>
                    {read ? '✓' : t.n}
                  </span>
                  <a href={`#${t.id}`} className={`text-sm hover:text-accent hover:underline underline-offset-2 ${read ? 'text-foreground/60' : 'text-foreground'}`}>
                    {t.label}
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
        </div>)}
        {section && (<>
        {section !== 'chGloss' && <ChapterSubToc section={section} />}
        {/* ── Chapter 7: 실전 사례 ─────────────────────────────────────── */}
        <Chapter
          n={1}
          id="ch7"
          title="실전 사례 16선 — 클릭 한 번으로 앱 시작"
          learn={[
            '구조·열·피로·내환경·원가·내마모·전기·생체·압력·동력전달 등 산업 전반 16 사례의 “요구→숫자→앱 단계→유력 재료군”',
            '각 사례의 “이 사례로 앱 시작” 버튼이 필터·뷰·Index 힌트를 자동 적용',
            '각 사례에 산업 적용 예시 + 외부 참고 링크 + 추천 alloy 가족 포함',
          ]}
        >
          <p className="leading-relaxed">
            자기 상황과 가장 가까운 사례를 찾아 그대로 따라 해 보세요.
            <span className="text-muted-foreground"> 수치는 방법을 보여주는 예시이고, “유력 재료군”은 일반적 경향입니다 — 최종 선택은 항상 데이터로 검증하세요.</span>
          </p>

          <Scenario
            n={1}
            presetKey="bracket"
            onConfigure={openConfig}
            diagram={<SvgBracket />}
            examples={<>GE Aviation의 LPBF 제트엔진 연료 노즐·브래킷, Airbus A350 캐빈 브래킷(티타늄 LPBF). <ExtLink href="https://en.wikipedia.org/wiki/3D_printing#Aerospace">Aerospace AM 개요</ExtLink></>}
            title="경량 고강성 구조 브래킷 (드론·항공, LPBF 출력)"
            situation="진동·하중을 받는 마운트를 가능한 한 가볍게, 충분히 강하고 덜 휘게. 금속 적층제조로 출력."
            needs={<>하중·처짐 분석(Ch.2) 결과 예: <F>σy ≥ 300 MPa</F>, <F>E ≥ 90 GPa</F>, 무게 최소.</>}
            steps={[
              <>좌측 필터: <b>Yield ≥ 300</b>, <b>Modulus ≥ 90</b>, <b>Process = LPBF</b>.</>,
              <>상단 <b>Index = 경량 강성 보 <F>E^½/ρ</F></b> 선택. <b>+ constraint</b>로 <F>σy^⅔/ρ</F> 추가.</>,
              <><b>M 임계</b>를 올려 통과를 5~10개로 좁힘 → <b>표 헤더의 ＋ 체크박스</b>로 현재 페이지 전체 추가 → <b>Compare</b> 패널에서 Radar 오버레이·CSV·PNG 로 비교.</>,
            ]}
            families={<>고강도 알루미늄(Scalmalloy·AlSi10Mg), 티타늄(Ti-6Al-4V), 마그네슘 합금.</>}
          />

          <Scenario
            n={2}
            presetKey="hightemp"
            onConfigure={openConfig}
            diagram={<SvgManifold />}
            examples={<>자동차/F1 배기 매니폴드, 제트엔진 터빈 디스크·블레이드, 로켓 노즐. <ExtLink href="https://en.wikipedia.org/wiki/Inconel">Inconel(Ni 초합금)</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Exhaust_manifold">Exhaust manifold</ExtLink></>}
            title="고온 부품 (배기 매니폴드 · 터빈 디스크)"
            situation="700 °C 부근에서 연속 사용, 반복 가열·산화."
            needs={<>최대사용온도 <F>≥ 700 °C</F>, 그리고 <b>그 온도에서의</b> <F>σy</F>가 충분(상온값이 아님). 내산화.</>}
            steps={[
              <>필터: <b>Max Service Temp ≥ 700</b>.</>,
              <>후보 상세 팝업의 <b>온도-강도 곡선</b>으로 700 °C 부근 σy/UTS 비교 · <b>Compare</b>에 여러 후보 곡선 오버레이.</>,
              <>내식성(정성) 등급도 확인.</>,
            ]}
            families={<>니켈 초합금(Inconel 718/625/617, Haynes 230, Hastelloy X), 발전소 보일러용 Grade 91(P91), petrochem heater tube Incoloy 800H, Fe-Ni 디스크 A286, 코발트 합금. 중온(≤540 °C)은 티타늄 Ti-6242.</>}
          />

          <Scenario
            n={3}
            presetKey="fatigue"
            onConfigure={openConfig}
            diagram={<SvgShaft />}
            examples={<>자동차 크랭크샤프트, 발전기·증기터빈 로터, 항공기 랜딩기어 액슬. <ExtLink href="https://en.wikipedia.org/wiki/Crankshaft">Crankshaft</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Fatigue_(material)">Fatigue</ExtLink></>}
            title="회전·진동 부품 (샤프트 · 임펠러)"
            situation="반복 응력을 오래 견뎌야 하는 부품. 정적 강도만으로는 부족."
            needs={<>응력진폭 예 <F>150 MPa</F>, <F>SF = 1.5</F> → <b>피로강도</b> <F>≥ 225 MPa</F>. <span className="text-muted-foreground">측정값이 없는 합금은 <F>σ_f ≈ k · σ_y</F> 근사 (강·니켈 k≈0.45–0.50, 티타늄 0.52, 알루미늄 0.38) 로 채워져 있으며 상세 패널의 <F>derived</F> 라벨로 구분됩니다.</span></>}
            steps={[
              <>필터: <b>Fatigue Strength ≥ 225</b> (<F>est.</F>가 붙었는지 상세에서 확인).</>,
              <><b>Compare</b>로 피로강도·연신율·강도 함께 비교 — <b>≤20개</b>면 Radar 오버레이로 한눈에.</>,
            ]}
            families={<>티타늄(높은 피로/강도비), 고강도강(AISI 4340), 일부 니켈합금. <span className="text-muted-foreground">알루미늄은 뚜렷한 내구한도가 없어 주의.</span></>}
          />

          <Scenario
            n={4}
            presetKey="precision"
            onConfigure={openConfig}
            diagram={<SvgPrecision />}
            examples={<>James Webb 우주망원경 백플레인(흑연·Invar 조합), 정밀 측정기 광학 마운트, 시계 밸런스. <ExtLink href="https://en.wikipedia.org/wiki/Invar">Invar</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/James_Webb_Space_Telescope">JWST</ExtLink></>}
            title="정밀 계측·광학 마운트 (치수 안정성)"
            situation="온도가 변해도 치수가 거의 변하면 안 되는 부품."
            needs={<>열변형 <F>ΔL = L·CTE·ΔT</F>에서 역산 → 매우 낮은 <b>CTE</b>(예 <F>≤ 3×10⁻⁶/K</F>), 충분한 <F>E</F>.</>}
            steps={[
              <>필터: <b>Thermal Expansion (CTE) 상한 ≤ 3</b>, 필요시 Modulus 하한.</>,
              <><b>Compare</b>로 CTE·E·밀도 비교.</>,
            ]}
            families={<>Invar(Fe-Ni36, CTE≈1.3), Kovar, 일부 세라믹·복합재.</>}
          />

          <Scenario
            n={5}
            presetKey="corrosion"
            onConfigure={openConfig}
            diagram={<SvgMarine />}
            examples={<>해수 펌프·임펠러(Cu-Ni·듀플렉스 스테인리스), 잠수함 밸브, 해양 플랜트 파이프. <ExtLink href="https://en.wikipedia.org/wiki/Duplex_stainless_steel">Duplex stainless steel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Cupronickel">Cupronickel</ExtLink></>}
            title="해양·화학 환경 부품"
            situation="염수·약품에 노출되며 하중도 받는 부품."
            needs={<>환경에 맞는 <b>내식성</b> 등급 + 강도 <F>σy ≥</F> 요구값.</>}
            steps={[
              <>필터: <b>Corrosion resistance = Excellent/Good</b> + <b>Yield</b> 하한.</>,
              <>정량 부식(부식속도·PREN 등)은 앱에 없으므로 <b>데이터시트</b>로 최종 확인.</>,
            ]}
            families={<>스테인리스(AISI 316L, 듀플렉스 2205(UNS S32205)), 티타늄, 니켈합금(Inconel 625).</>}
          />

          <Scenario
            n={6}
            presetKey="lowcost"
            onConfigure={openConfig}
            diagram={<SvgLowcost />}
            examples={<>자동차 차체·새시 패널, 가전 외장(스탬핑 강판), 일반 산업기계 프레임. <ExtLink href="https://en.wikipedia.org/wiki/Carbon_steel">Carbon steel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/6061_aluminium_alloy">AA 6061 Al</ExtLink></>}
            title="저원가 대량 생산 부품"
            situation="성능 요구는 평범하고 단가가 최우선."
            needs={<>필요 강도 <F>σy</F>를 만족하면서 <b>kg당 가격 최소</b>.</>}
            steps={[
              <>필터: <b>Yield</b> 하한으로 “쓸 수 있는” 재료만 남김.</>,
              <>상단 <b>Index = 저원가 강도 <F>σy/Cm</F></b>로 정렬 · <b>Compare</b>에 <b>Price</b> 열 추가.</>,
            ]}
            families={<>탄소강·저합금강, 일반 알루미늄(AA 6061), 일부 폴리머.</>}
          />

          <Scenario
            n={7}
            presetKey="spring"
            onConfigure={openConfig}
            diagram={<SvgSpring />}
            examples={<>자동차 밸브스프링·서스펜션 스프링, 시계 헤어스프링, 베릴륨동 커넥터 콘택트. <ExtLink href="https://en.wikipedia.org/wiki/Spring_steel">Spring steel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Beryllium_copper">Beryllium copper</ExtLink></>}
            title="스프링 · 스냅핏 · 탄성 힌지"
            situation="큰 탄성 변형으로 에너지를 저장·복원하되 영구변형은 없어야."
            needs={<>단위부피당 탄성에너지 지표 <F>σy²/E</F> 최대 + 충분한 연신율.</>}
            steps={[
              <>상단 <b>Index = 탄성 스프링/힌지 <F>σy²/E</F></b> 선택.</>,
              <><b>Compare</b>로 σy·E·연신율 비교.</>,
            ]}
            families={<>스프링강, 베릴륨동(BeCu), 티타늄, 일부 니켈합금.</>}
          />

          <Scenario
            n={8}
            presetKey="heatsink"
            onConfigure={openConfig}
            diagram={<SvgHeatsink />}
            examples={<>CPU·GPU 쿨러, LED 조명 방열 케이스, 전력반도체 콜드플레이트. <ExtLink href="https://en.wikipedia.org/wiki/Heat_sink">Heat sink</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/List_of_thermal_conductivities">Thermal conductivity of metals</ExtLink></>}
            title="방열 부품 (히트싱크 · 콜드플레이트)"
            situation="열을 빠르게 퍼뜨려야 하고, 가벼우면 더 좋음."
            needs={<>높은 <b>열전도도 k</b>; 경량 방열이면 <F>k/ρ</F> 최대.</>}
            steps={[
              <>필터: <b>Thermal Conductivity</b> 하한. 경량까지 필요하면 상단 <b>Index = 경량 방열 <F>k/ρ</F></b>.</>,
              <><b>Compare</b>로 k·밀도·가격 비교.</>,
            ]}
            families={<>구리(최고 k), 알루미늄(경량 방열 <F>k/ρ</F> 우수), AlSi 합금.</>}
          />

          <Scenario
            n={9}
            presetKey="wear"
            onConfigure={openConfig}
            diagram={<SvgWear />}
            examples={<>지질 시추용 드릴 비트 인서트, 광산 컨베이어 라이너, 굴삭기 버킷 투스, 절삭공구 인서트, 광산 분쇄기 해머. <ExtLink href="https://en.wikipedia.org/wiki/Tungsten_carbide">Tungsten carbide</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Hardfacing">Hardfacing</ExtLink></>}
            title="내마모 부품 (드릴·라이너·절삭공구)"
            situation="고압·반복 접촉으로 표면이 깎이는 환경 — 광산·건설·제조 라인."
            needs={<>높은 <b>경도 (Hardness)</b>, 충분한 <b>충격 인성 (Impact)</b>. Archard 마모식: <F>V = K·F·s/H</F> — H 가 커야 마모율 ↓.</>}
            steps={[
              <>필터: <b>Hardness ≥ 600 HV</b>, <b>Impact ≥ 15 J</b> (인성).</>,
              <><b>Compare</b>로 HV·KIC·가격 비교 (HRC 가 더 익숙하면 HV ≈ 10×HRC).</>,
              <>상세 팝업에서 <b>권장 후공정</b> 확인 — DLC·TiN·CrN PVD 코팅으로 표면만 강화 가능.</>,
            ]}
            families={<>WC-Co (텅스텐 카바이드), 공구강 H13/D2/M2, Stellite 6/12 (Co 합금), 고경도 베어링강 52100. PVD/CVD 표면 코팅.</>}
          />

          <Scenario
            n={10}
            presetKey="medical"
            onConfigure={openConfig}
            diagram={<SvgMedical />}
            examples={<>척추 케이지 (PEEK·Ti LPBF), 인공관절 (CoCrMo F75, Ti-6Al-4V ELI), 치과 임플란트 (Ti CP Gr4), 두개골 재건 plate. <ExtLink href="https://en.wikipedia.org/wiki/Titanium_biocompatibility">Ti biocompatibility</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/PEEK">PEEK</ExtLink></>}
            title="의료 임플란트 (척추 cage · 인공관절)"
            situation="체내 영구 매식 — 생체 적합성, 부식 저항, 골 친화성, MRI 호환성 필요."
            needs={<>ISO 10993 / ASTM F75/F136 인증 alloy, <b>비자성</b> (MRI), 골 모듈러스 매칭 <F>E ≈ 10–30 GPa</F> (Ti가 강철의 절반), Ni 비함유 (알레르기).</>}
            steps={[
              <>필터: <b>Category ⊃ Polymer(PEEK·UHMWPE) 또는 Metal(Ti·CoCr)</b>, <b>RoHS 통과 = ✓</b>, <b>Modulus ≤ 30 GPa</b> (골 매칭).</>,
              <>Compare 로 σy·연신율·CTE·MRI 호환성 비교.</>,
              <>상세 팝업에서 <b>SVHC 검출</b> 확인 — Ni, Be 함유 alloy 는 자동 경고.</>,
            ]}
            families={<>Ti-6Al-4V ELI (Grade 23), Ti CP Gr2/Gr4 (pure), CoCrMo F75 (인공관절), PEEK (Victrex 450G), UHMWPE (joint surface), 316LVM (저Ni vacuum melt).</>}
          />

          <Scenario
            n={11}
            presetKey="cryogenic"
            onConfigure={openConfig}
            diagram={<SvgCryogenic />}
            examples={<>LNG 운반선 화물탱크 (9% Ni 강), 액체수소 저장기, 우주 발사체 추진제 탱크, MRI 자기 코일 보빈, 액체 헬륨 저장조. <ExtLink href="https://en.wikipedia.org/wiki/Ductility">DBTT</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Liquefied_natural_gas">LNG</ExtLink></>}
            title="극저온 부품 (LNG 탱크 · 우주 추진제)"
            situation="-162 °C (LNG) ~ -253 °C (LH₂) ~ -269 °C (LHe) 환경 — 취성 천이 위험."
            needs={<>저온에서도 <b>충격 인성 유지</b> (Charpy ≥ 27 J at -196 °C 요구가 흔함). 자성 변화 적음 (MRI 응용). 열전도 낮음 (열침입 감소).</>}
            steps={[
              <>필터: <b>Impact Strength ≥ 100 J</b>, <b>Category = Metal</b>, fcc 결정 구조 선호 (오스테나이트계 STS).</>,
              <>Compare 의 σy·UTS·연신율·열전도도 비교. <b>FCC 구조 (AISI 304L/AISI 316L) 는 DBTT 가 없어 안전</b>.</>,
              <>상세 팝업의 출처에서 저온 시험 데이터 확인 (ASTM E1820).</>,
            ]}
            families={<>AISI 304L/AISI 316L (austenitic SS, no DBTT), 9% Ni 강 (LNG 표준), Invar 36 (정밀 저열팽창), AA 5083 (LNG cargo containment), Cu OFE.</>}
          />

          <Scenario
            n={12}
            presetKey="electrical"
            onConfigure={openConfig}
            diagram={<SvgElectrical />}
            examples={<>전력 분배 busbar (배전반·UPS), 전동차 카테너리 접촉선, EV 충전건 접점, 반도체 lead frame, 전자석 코일. <ExtLink href="https://en.wikipedia.org/wiki/Busbar">Busbar</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/International_Annealed_Copper_Standard">%IACS</ExtLink></>}
            title="전기 전도체 (버스바 · 접점)"
            situation="고전류 (kA 급) 전달 — 줄열 손실 ↓ 와 강도·내식성 동시 요구."
            needs={<>높은 <b>전기전도도 (≥ 80 %IACS)</b>, 충분한 <b>σy</b> (가공 후 sag 방지), 항복응력 유지하면서 끌어내고 가공 가능.</>}
            steps={[
              <>필터: <b>Electrical Conductivity ≥ 80 %IACS</b>, <b>σy ≥ 200 MPa</b> (가공 강도).</>,
              <><b>Index = Cu / σy</b> 또는 <b>k / ρ</b> (방열도 함께 본다면).</>,
              <>Compare 로 σ·전도도·가격 비교. 도금 (Ag/Sn) 은 상세 팝업의 권장 코팅에서 확인.</>,
            ]}
            families={<>구리 OFE (C10100, ~101 %IACS), CuCrZr (C18150, 응력 완화 저항), 황동 C26000, 알루미늄 1350 (경량 transmission), Cu-Be C17200 (정밀 접점·스프링).</>}
          />

          <Scenario
            n={13}
            presetKey="pressure_vessel"
            onConfigure={openConfig}
            diagram={<SvgPressureVesselSmall />}
            examples={<>수소 저장 탱크 (350·700 bar), LPG 실린더, 스팀 보일러, 화학 reactor, 공기 압축기 receiver. <ExtLink href="https://en.wikipedia.org/wiki/Pressure_vessel">Pressure vessel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/ASME_Boiler_and_Pressure_Vessel_Code">ASME BPVC</ExtLink></>}
            title="압력 용기 (수소 탱크 · 보일러)"
            situation="내압 P 에서 hoop stress σ = PD/2t 발생. 누설·파열 절대 방지."
            needs={<>충분한 <b>σy</b> (SF ≥ 3 typical ASME), <b>인성</b> (균열 진전 둔화), 부식 (수소 취화 / 황화수소 SSC) 저항. ISO 11119 / ASME VIII. <span className="text-muted-foreground">KIC 측정값이 없는 합금은 family typical (ASM Vol. 1·2, MMPDS) 로 채워져 있으며 상세의 <F>class</F> 라벨로 식별 가능합니다.</span></>}
            steps={[
              <>필터: <b>UTS ≥ 600 MPa</b>, <b>Fracture Toughness ≥ 50 MPa·√m</b>, <b>Process ⊃ Wrought</b> (단조 두께 보장).</>,
              <>Ashby 차트의 Y축 옵션 → <b>파괴 인성</b> 선택, X축 σy 로 두면 toughness-strength trade-off 가 한 눈에. 마우스 휠로 확대·더블클릭으로 reset.</>,
              <>Compare 로 σy·KIC·내식 비교. 수소 환경이면 H₂ 취화 저항 (Ni·Cr 함량) 검증.</>,
              <>상세 팝업의 ASME 표준 합금 (P-No.) 확인.</>,
            ]}
            families={<>SA-516 Gr70 (보일러), AISI 4130 / AISI 4140 (수소 탱크 라이너), AISI 304L/AISI 316L (화학 reactor), Inconel 625 (H₂S 환경), Type II/III/IV 복합재 탱크 wrap.</>}
          />

          <Scenario
            n={14}
            presetKey="gear"
            onConfigure={openConfig}
            diagram={<SvgGear />}
            examples={<>자동차 변속기 (8AT 의 sun gear), 산업 감속기, 헬리콥터 main gearbox, 로봇 harmonic drive, 항공 엔진 액세서리 기어. <ExtLink href="https://en.wikipedia.org/wiki/Gear">Gear</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Case-hardening">Case hardening</ExtLink></>}
            title="기어 (변속기 · 감속기)"
            situation="이빨 접촉 (Hertz contact) + 굽힘 응력 + 충격 부하 + 100M 사이클 이상의 피로 환경."
            needs={<>표면 <b>경도 ≥ 600 HV</b> (접촉 피로), 코어 <b>인성 ≥ 30 J</b> (충격 흡수), Carburizing(침탄) / Nitriding(질화) / 유도 경화 적용 가능 alloy. AGMA grade 2/3.</>}
            steps={[
              <>필터: <b>Hardness 300–400 HV</b> (코어), <b>Impact ≥ 30 J</b>, <b>Process ⊃ Wrought</b>.</>,
              <>상세 팝업의 권장 후공정 — Carburizing/Nitriding/유도경화 표면 처리 alloy 만 후보.</>,
              <>Compare 의 Machinability 가 Good 이상 (가공성).</>,
            ]}
            families={<>침탄강 AISI 8620 / AISI 9310 (항공), 질화강 31CrMoV9 (산업), AISI 4140 / AISI 4340 (자동차 변속), Maraging 300 (high-end racing), 분말야금 P/M gear (저가).</>}
          />

          <Scenario
            n={15}
            presetKey="fastener"
            onConfigure={openConfig}
            diagram={<SvgFastener />}
            examples={<>볼트·너트·스터드, 항공기 fastener (HiLok / NAS), 시추 drill pipe joint, 풍력 타워 anchor bolt, 의료 척추 pedicle screw. <ExtLink href="https://en.wikipedia.org/wiki/ISO_metric_screw_thread">ISO metric thread</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Tensile_strength">Tensile strength</ExtLink></>}
            title="체결구 (볼트 · 스터드)"
            situation="인장·전단·반복 풀림 — 토크 설계는 σ_yield 의 60-90 %로 preload."
            needs={<>등급 (ISO 898-1 Class 8.8 / 10.9 / 12.9): <b>UTS ≥ 800·1000·1200 MPa</b>, <b>σy ≥ 0.8·UTS</b>, 인장·전단 연성 모두 충족.</>}
            steps={[
              <>필터: 등급별 — <b>Class 10.9 → UTS ≥ 1000</b>, <b>σy/UTS ≥ 0.8</b>, <b>Elongation ≥ 9 %</b>.</>,
              <>고온 ↔ 저온 환경이면 사용 온도 확인 (스테인리스 A4-80 / Inconel).</>,
              <>Compare 의 부식 등급 비교. 갈바닉 부식 회피.</>,
            ]}
            families={<>Class 8.8/10.9 = AISI 4140 / AISI 4340 quenched-tempered, Class 12.9 = SCM440 표면 경화, 항공 H-11 / MP35N / Inconel 718 (제트엔진), 스테인리스 A2-70 / A4-80 (해양).</>}
          />

          <Scenario
            n={16}
            presetKey="die_mold"
            onConfigure={openConfig}
            diagram={<SvgDieMold />}
            examples={<>플라스틱 사출 mold (스마트폰 케이스, 의료기기 housing), 열간 단조 die (자동차 크랭크), 알루미늄 다이캐스팅 mold, 압출 die (창호 알루미늄 프로파일), 인서트 절삭공구. <ExtLink href="https://en.wikipedia.org/wiki/Tool_steel">Tool steel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Injection_moulding#Cooling">Conformal cooling</ExtLink></>}
            title="다이·금형 (사출 · 단조 · 다이캐스팅)"
            situation="반복 가열·냉각, 마모, 열 피로 (heat checking), 화학적 침식 (Zn/Al 용탕). 대당 $50K–$2M."
            needs={<>고온 강도 (≥ 500 °C 유지), <b>경도 ≥ 40 HRC</b>, 열피로 저항, 절삭·EDM·연마 가능, AM 시 conformal cooling 채널.</>}
            steps={[
              <>필터: <b>Hardness ≥ 400 HV</b> (담금 후), <b>Max Service Temp ≥ 500 °C</b>, <b>Process ⊃ Wrought</b> 또는 <b>LPBF</b> (3D 프린팅 mold).</>,
              <>Compare 의 열피로 저항 + 가공성. EDM 가공성 따로 보고.</>,
              <>인서트 표면만 PVD TiAlN/CrN 권장 코팅 — 수명 3–5× 연장.</>,
            ]}
            families={<>H13 (열간 die 표준), P20 (사출 pre-hardened), S7 (shock), D2 (cold work), Maraging M300 (LPBF mold, conformal cooling), Stavax (corrosion-resistant 사출), CPM 3V (high impact PM tool).</>}
          />

          <Note tone="tip">
            공통 마무리: 후보를 좁혔으면 <b>Compare</b>에서 이름을 클릭해 차트에 위치를 확인하고, <b>상세 팝업</b>에서 범위(min–max)·<F>est.</F> 여부·온도-강도·<b>출처 데이터시트</b>를 검증한 뒤 컬렉션으로 저장/공유하세요.
          </Note>
        </Chapter>

        {/* ── Chapter 2 (구 6): Ashby 방법 ─────────────────────────────── */}
        <Chapter
          n={2}
          id="ch6"
          title="Ashby 재료 선택법"
          learn={[
            '문제를 “기능 · 제약 · 목적 · 자유변수” 4가지로 정리',
            '성능지수(material index)가 무엇이고 왜 거듭제곱이 분수가 되는지',
            'Ashby 차트의 한계선과 등지수선을 이 앱에서 그대로 다루기',
          ]}
        >
          <p className="leading-relaxed">Ashby 방법은 문제를 네 가지로 분리합니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div className="rounded border border-border bg-card p-3 text-sm"><b>① 기능 (Function)</b><br/>부품이 무엇을 하는가 (인장재·보·패널·축…).</div>
            <div className="rounded border border-border bg-card p-3 text-sm"><b>② 제약 (Constraints)</b><br/>반드시 만족할 조건 (σy ≥ X · 온도 ≥ Y · 공정 = LPBF…).</div>
            <div className="rounded border border-border bg-card p-3 text-sm"><b>③ 목적 (Objective)</b><br/>최대/최소화할 것 (무게 ↓ · 원가 ↓ · 강성 ↑).</div>
            <div className="rounded border border-border bg-card p-3 text-sm"><b>④ 자유변수 (Free)</b><br/>설계가 바꿀 수 있는 것 (단면적, 두께…) + 재료.</div>
          </div>

          {/* 핵심 도식: F-C-O-Free → M */}
          <div className="rounded-lg border border-border bg-card p-3 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📊 핵심 그림 — 4요소를 모아 성능지수 M 도출</p>
            <div className="h-[260px]"><SvgFCOF /></div>
          </div>

          <H3>성능지수(material index) — 왜 거듭제곱이 분수가 될까?</H3>
          <Note tone="why" title="유도 (경량 인장 부재)">
            <p>강도 제약: <F>F/A ≤ σy</F> → 필요 단면 <F>A ≥ F/σy</F>.</p>
            <p>질량: <F>m = A · L · ρ = F · L · (ρ/σy)</F>.</p>
            <p><F>F, L</F> 은 고정 → 질량 최소화는 <F>ρ/σy</F> 최소화 = <F>σy/ρ</F> <b>최대화</b>. ⇒ 성능지수 <F>M = σy/ρ</F>.</p>
            <p className="mt-2">기능이 “굽힘 보/패널”이면 두께·폭이 자유변수로 들어가고 단면 2차모멘트(<F>I ∝ h³</F>)를 통해 식이 정리되면서 <b>거듭제곱이 분수</b>가 됩니다. 그래서 보는 <F>E^½/ρ</F>, 패널은 <F>E^⅓/ρ</F>.</p>
          </Note>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">기능 / 목적</th><th className="p-2 font-semibold">성능지수 M (클수록 우수)</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2">경량 강성 인장재</td><td className="p-2 font-mono"><F>E/ρ</F></td></tr>
                <tr><td className="p-2">경량 강성 보</td><td className="p-2 font-mono"><F>E^½/ρ</F></td></tr>
                <tr><td className="p-2">경량 강성 패널</td><td className="p-2 font-mono"><F>E^⅓/ρ</F></td></tr>
                <tr><td className="p-2">경량 강도 인장재</td><td className="p-2 font-mono"><F>σy/ρ</F></td></tr>
                <tr><td className="p-2">경량 강도 보 / 패널</td><td className="p-2 font-mono"><F>σy^⅔/ρ</F> / <F>σy^½/ρ</F></td></tr>
                <tr><td className="p-2">탄성 스프링·힌지 (에너지 저장)</td><td className="p-2 font-mono"><F>σy²/E</F></td></tr>
                <tr><td className="p-2">경량 방열</td><td className="p-2 font-mono"><F>k/ρ</F></td></tr>
                <tr><td className="p-2">저원가 강성 / 강도</td><td className="p-2 font-mono"><F>E/Cm</F> / <F>σy/Cm</F></td></tr>
              </tbody>
            </table>
          </div>

          <H3>차트 활용 (이 앱과 1:1 매핑)</H3>
          <p className="text-sm leading-relaxed">Ashby 차트는 보통 <b>로그-로그 축</b>에 두 물성을 그립니다. 한계선(필터)·외피(재료군 분포)·등지수선(성능지수 방향)을 함께 보면 좋은 후보가 어디에 모이는지 한눈에 잡힙니다.</p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[320px]"><SvgAshbyChart /></div>
          <p className="text-[12px] text-muted-foreground">위 그림은 ρ vs σy 샘플 — <span className="text-amber-600 font-semibold">한계선(노랑)</span> 위쪽이 σy 제약 통과, <span className="text-rose-500 font-semibold">등지수선(빨강)</span>을 위쪽으로 옮길수록 더 좋은 재료. 둘 다 만족하는 영역에 모인 재료가 최종 후보입니다.</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">Ashby 개념</th><th className="p-2 font-semibold">이 앱에서</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2">제약 (반드시 만족)</td><td className="p-2">좌측 <b>필터</b> 범위 · 차트 축 <b>한계 슬라이더</b></td></tr>
                <tr><td className="p-2">목적 (성능지수)</td><td className="p-2">상단 <b>Index</b> 프리셋 + <b>M 임계값</b> 슬라이더</td></tr>
                <tr><td className="p-2">다목적 (여러 지수)</td><td className="p-2"><b>+ constraint</b> 로 N개 AND</td></tr>
                <tr><td className="p-2">재료군 분포</td><td className="p-2"><b>Envelopes</b>(category/family/sub) 토글</td></tr>
                <tr><td className="p-2">후보 추리기</td><td className="p-2"><b>박스 선택</b> → Add all → Compare 또는 표 헤더 <b>＋ 체크박스</b>로 현재 페이지 전체 추가</td></tr>
                <tr><td className="p-2">비교·검증</td><td className="p-2"><b>Compare</b> 패널 · Radar 오버레이(≤20) · CSV · PNG export · 상세 팝업 · 출처 링크</td></tr>
                <tr><td className="p-2">차트 인터랙션</td><td className="p-2">마우스 휠로 zoom · 더블클릭으로 reset · modeBar 의 <b>Spike Lines</b> 로 점 좌표 가이드</td></tr>
                <tr><td className="p-2"><b>Pareto frontier</b> (다목적 외곽선)</td><td className="p-2">상단 <b>Pareto</b> 체크박스 → 골드 별표 + 라인</td></tr>
              </tbody>
            </table>
          </div>

          {/* R30 — Pareto frontier 섹션 신규 */}
          <H3>Pareto Frontier — 다목적 trade-off 외곽선</H3>
          <Note tone="why" title="언제 쓰나요?">
            "<b>무게는 가볍게 (ρ ↓) + 강도는 높게 (σy ↑)</b>" 같이 <b>두 목적이 충돌하는</b> 상황.
            성능지수 M 하나로 줄세우면 한 축만 보지만, Pareto frontier 는 두 목적 모두 더 좋게 만들 수 있는 점이 <b>존재하지 않는</b> 재료들만 골라 외곽선을 그립니다.
          </Note>

          <p className="text-sm leading-relaxed mt-3">
            <b>정의:</b> 어떤 후보 A 가 있을 때, "A 보다 ρ 가 작으면서 σy 가 같거나 크다" 거나 "ρ 가 같거나 작은데 σy 가 크다" 는 후보 B 가 <b>없으면</b> A 는 <b>Pareto 최적</b>. 모든 Pareto 최적 점을 연결한 곡선이 Pareto frontier 입니다.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="rounded border border-amber-400/40 bg-amber-50/60 p-3">
              <p className="font-semibold text-amber-800 mb-1">⭐ Frontier 위 재료의 의미</p>
              <p className="text-sm leading-relaxed">"<b>두 목적 모두 동시에</b> 이 합금보다 더 좋게 만족하는 다른 후보가 <b>현재 풀에</b> 없다." → 후보로 남길 만함.</p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="font-semibold text-foreground mb-1">🔍 자동 방향 매핑</p>
              <p className="text-sm leading-relaxed">앱이 X·Y 축 물성에 따라 <b>max/min 방향을 자동 결정</b>. 예: density·price·CTE 는 <b>min</b>, σy·E·HV·k·T_max 는 <b>max</b>. 토글 옆에 'X↑ Y↑' 형식으로 표시.</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3 my-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">사용 흐름</p>
            <ol className="list-decimal pl-5 text-sm space-y-1 leading-relaxed">
              <li>차트 X / Y 축 선택 (예: X=density, Y=yield_strength)</li>
              <li>좌측 필터로 후보 풀 좁히기 (예: Metal·LPBF·sy ≥ 200)</li>
              <li>상단 <b>"Pareto"</b> 체크박스 ON → 골드 별표 + 라인 등장 ("N pts · X↓ Y↑" 정보 표시)</li>
              <li>Frontier 위 별표 클릭 → 상세 popup → Compare 추가</li>
            </ol>
          </div>

          <Note tone="tip" title="Index 와의 차이">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Index (M = σy/ρ 등)</b>: 하나의 성능지수 임계값(M ≥ X) 으로 잘라 후보를 가른다. 두 목적의 trade-off 를 <b>일직선</b>으로 가정.</li>
              <li><b>Pareto</b>: trade-off 가 <b>곡선</b> 일 때도 작동. 두 목적의 가중치가 명확하지 않을 때 유용 — frontier 위 후보를 모두 추리고 가공성·비용 등 다른 기준으로 최종 선택.</li>
              <li>둘 다 켜면: Index 통과 + Pareto 위 = <b>가장 강한 후보</b>.</li>
            </ul>
          </Note>

          <Note tone="warn" title="주의 사항">
            <ul className="list-disc pl-5 space-y-1">
              <li>Pareto frontier 는 <b>현재 필터 통과 풀 안에서만</b> 계산. 풀을 좁히면 frontier 도 다시 그려짐.</li>
              <li>방향이 자동 매핑되지만 <b>특수 응용</b> (예: 의료 임플란트 modulus 는 너무 높지 않아야 함) 에서는 의미가 달라질 수 있음 — 사용자가 판단.</li>
              <li>Frontier 위 재료라도 가공성·내식·환경 규제 (RoHS) 까지 자동 반영 안 됨 — Compare 패널로 추가 검증.</li>
            </ul>
          </Note>

          {/* R64 — Ashby 인터랙션 상세 (modeBar, box select, slider). 차트 사용 흐름. */}
          <H3>차트 인터랙션 빠른 참조</H3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">동작</th><th className="p-2 font-semibold">방법</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2 font-medium">확대</td><td className="p-2">마우스 휠 (위/아래) — 차트 위 어디든 가능</td></tr>
                <tr><td className="p-2 font-medium">초기화</td><td className="p-2">차트 더블클릭 또는 modeBar 의 <b>Reset axes</b></td></tr>
                <tr><td className="p-2 font-medium">패닝(이동)</td><td className="p-2">modeBar 의 <b>Pan</b> 선택 후 드래그</td></tr>
                <tr><td className="p-2 font-medium">박스 선택</td><td className="p-2">modeBar <b>Box Select</b> → 영역 드래그 → 좌측 하단 "Add all" 또는 "→ Filter"</td></tr>
                <tr><td className="p-2 font-medium">점 정확 위치</td><td className="p-2">modeBar <b>Toggle Spike Lines</b> — 점 hover 시 X·Y 가이드 라인</td></tr>
                <tr><td className="p-2 font-medium">PNG 저장</td><td className="p-2">modeBar 좌측 <b>Download plot as PNG</b> (1000×700, scale 2)</td></tr>
                <tr><td className="p-2 font-medium">Index 임계 조정</td><td className="p-2">빨간 실선 (Index line) <b>드래그</b> → M 임계값 실시간 변경</td></tr>
                <tr><td className="p-2 font-medium">Envelope 토글</td><td className="p-2">상단 <b>Envelopes</b> 의 category / class / family 중 선택. Show 토글로 ON/OFF.</td></tr>
                <tr><td className="p-2 font-medium">축 변경</td><td className="p-2">상단 <b>X / Y</b> 드롭다운에서 물성 선택. Log / Linear 토글.</td></tr>
              </tbody>
            </table>
          </div>

          {/* R64 — Compare 패널 활용 흐름. */}
          <H3>Compare 패널 활용 흐름</H3>
          <p className="text-sm leading-relaxed">차트·표에서 좁힌 후보를 모아 <b>객관적으로 비교 → 1 ~ 3 후보로 선정 → 데이터시트 검증</b> 까지 한 패널 안에서.</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">단계</th><th className="p-2 font-semibold">동작</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2 font-medium">① 후보 추가</td><td className="p-2">표 row 의 <b>＋</b> 체크박스 · 헤더 ＋ 로 페이지 전체 (최대 500) · Ashby 박스선택 후 "Add all" · Cards 의 ＋ 도 동일.</td></tr>
                <tr><td className="p-2 font-medium">② Compare 패널 열기</td><td className="p-2">우상단 <b>Compare (N)</b> 클릭 · 배너의 "Compare (N)" 단축버튼</td></tr>
                <tr><td className="p-2 font-medium">③ 컬럼 선택</td><td className="p-2">좌상단 <b>Columns</b> → 비교할 물성 multi-select (default: ρ·σy·UTS·El·E·HV·price·total_cost·popularity)</td></tr>
                <tr><td className="p-2 font-medium">④ 정렬·필터</td><td className="p-2">컬럼 헤더 클릭으로 정렬 · 가로 막대 = 그 컬럼 최댓값 대비 비율 시각화</td></tr>
                <tr><td className="p-2 font-medium">⑤ Radar 오버레이</td><td className="p-2">상단 <b>Radar</b> 토글 (≤20 alloy). 축 6개 선택 + 정규화 base (Compare set / 패밀리 / 카테고리) 토글. legend 클릭 = focus mode.</td></tr>
                <tr><td className="p-2 font-medium">⑥ 신뢰도 확인</td><td className="p-2">각 셀의 <b>confidence dot</b> 색 — measured / handbook / class / derived. detail 팝업으로 출처 확인.</td></tr>
                <tr><td className="p-2 font-medium">⑦ Export</td><td className="p-2"><b>CSV</b> (열 헤더 + 행 typical), <b>PNG</b> (Radar 차트 캡처). 결과를 보고서 / 회의 자료로.</td></tr>
                <tr><td className="p-2 font-medium">⑧ 최종 검증</td><td className="p-2">상위 1~3 후보의 <b>출처 URL</b> 직접 방문 → 측정 조건 (heat treatment, build direction) 확인 후 시험 발주.</td></tr>
              </tbody>
            </table>
          </div>

          {/* R66 B — Ashby 깊은 학습 + 외부 링크 */}
          <H3>Ashby 방법 깊은 학습</H3>
          <Note tone="why" title="성능지수 M 의 일반 유도 (인장 부재 예)">
            <p className="leading-relaxed">기능 = 인장 (단면적 A·길이 L), 제약 = 강도 σy, 목적 = 무게 최소화, 자유변수 = A.</p>
            <p className="mt-1 font-mono text-[12px]">m = ρ·A·L 이고, F ≤ σy·A 이므로 A ≥ F/σy. 대입하면 m ≥ F·L·(ρ/σy) = (F·L) · (1/M) — <b>M = σy/ρ</b> 최대화.</p>
            <p className="mt-2 leading-relaxed">기능이 보·패널이면 단면 2차모멘트 <F>I ∝ b·h³</F> 의 자유변수가 더 많아 거듭제곱이 분수 (E^½/ρ · E^⅓/ρ) 가 됩니다.</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — 외부 자료">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/Material_selection">Wikipedia: Material selection</ExtLink> — Ashby methodology 개요</li>
              <li><ExtLink href="https://www.doitpoms.ac.uk/tlplib/index.php">DoITPoMS (Cambridge): Materials selection</ExtLink> — interactive Ashby 차트 학습</li>
              <li><ExtLink href="https://ocw.mit.edu/search/?d=Materials%20Science%20and%20Engineering&s=department_course_numbers.sort_coursenum">MIT OCW 3.094 Materials in Human Experience</ExtLink> — 재료의 사회·역사·기술 통합 강의</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Material_selection">Wikipedia: Ashby chart</ExtLink> — chart 구조와 envelope 이론</li>
              <li>M. F. Ashby, <i>Materials Selection in Mechanical Design</i> (4th/5th ed.) — 표준 교과서. <ExtLink href="https://www.elsevier.com/books/materials-selection-in-mechanical-design/ashby/978-0-08-100599-6">Elsevier 페이지</ExtLink></li>
            </ul>
          </Note>
        </Chapter>

        {/* ── R65 신규 Chapter 3: 합금 family 매핑 + 환경 조건별 선택 (H + G) ── */}
        <Chapter
          n={3}
          id="ch10"
          title="합금 family 빠른 매핑 + 환경 조건별 선택"
          learn={[
            '도메인 (구조·고온·내식·전기·내마모·생체) → 우선 검토 family 30초 매핑',
            '환경 조건 (부식·고온·저온·방사선·마모) 별 적합 합금 + 회피 합금',
            '"어디서 시작할지" 모를 때 첫 후보군 4-5개로 좁히는 도구',
          ]}
        >
          <p className="leading-relaxed">처음 마주하는 부품 — "어디서 시작해야 하나?" 가장 흔한 막힘 지점. 도메인과 환경 조건 두 차원으로 30초에 첫 후보 family 를 좁힙니다.</p>

          <H3>3.1 도메인 → Family 빠른 매핑</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[24%]">도메인 (요구)</th><th className="p-2 font-semibold">우선 검토 family</th><th className="p-2 font-semibold w-[16%]">참고 사례</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">구조 + 경량 (E·σy / ρ)</td><td className="p-2">고강도 알루미늄 (Scalmalloy · AlSi10Mg · AA 7075) · 티타늄 (Ti-6Al-4V · CP grade) · 마그네슘 (AZ31)</td><td className="p-2">브래킷·항공·자동차</td></tr>
                <tr><td className="p-2 font-medium">고온 (≥ 600 °C · creep)</td><td className="p-2">Ni 초합금 (Inconel 718/625/617 · Haynes 230) · Co 합금 (L605 · Stellite) · Ti 중온(≤540 °C)</td><td className="p-2">배기·터빈·재사용 로켓</td></tr>
                <tr><td className="p-2 font-medium">내식 (해수·산·Cl⁻)</td><td className="p-2">Ni 합금 (Hastelloy C-22 · Inconel 625) · AISI 316L · Duplex (2205, UNS S32205) · Ti grade 2</td><td className="p-2">해양·반도체·화학</td></tr>
                <tr><td className="p-2 font-medium">전기 전도 (σ_elec)</td><td className="p-2">Cu (OFHC · CuCrZr) · Al 1xxx · Ag-alloy · 청동</td><td className="p-2">버스바·접점·열교환</td></tr>
                <tr><td className="p-2 font-medium">내마모 (HV·접촉)</td><td className="p-2">공구강 (D2 · H13 · M2) · WC-Co · Stellite · CoCrMo · 케이스 hardening 강</td><td className="p-2">금형·다이·베어링</td></tr>
                <tr><td className="p-2 font-medium">생체적합</td><td className="p-2">Ti-6Al-4V ELI (Grade 23) · CoCrMo (F75) · AISI 316L · CP-Ti</td><td className="p-2">임플란트·스텐트</td></tr>
                <tr><td className="p-2 font-medium">치수 안정 (저 CTE)</td><td className="p-2">Invar (Fe-Ni36) · Kovar · Pure W · Pyrex glass · CFRP</td><td className="p-2">정밀 광학·측정기</td></tr>
                <tr><td className="p-2 font-medium">경량 방열 (k/ρ)</td><td className="p-2">Al (AA 6061 · AA 1100) · Cu · 흑연 복합재 · AlSiC</td><td className="p-2">히트싱크·열교환기</td></tr>
                <tr><td className="p-2 font-medium">탄성에너지 (σy²/E)</td><td className="p-2">스프링강 (AISI 52100 · 9254) · 마레이징강 · CuBe · 글래스 섬유</td><td className="p-2">스프링·다이어프램·힌지</td></tr>
                <tr><td className="p-2 font-medium">압력 / 폭발</td><td className="p-2">압력용기 강 (A516 · A335 · P91) · Inconel 625 (수소) · AISI 4130 (라이너) · AISI 316L (화학)</td><td className="p-2">탱크·실린더·보일러</td></tr>
              </tbody>
            </table>
          </div>
          <Note tone="tip">
            <b>실무 사용.</b> 표의 family 명 (예: "Inconel") 을 앱의 검색창에 입력 → fuzzy 매칭 → 후보 표시. 또는 좌측 필터 Family Tree 에서 카테고리·family 체크.
          </Note>

          <H3>3.2 환경 조건별 적합·회피 합금</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[18%]">환경</th><th className="p-2 font-semibold w-[18%]">조건</th><th className="p-2 font-semibold">적합 합금</th><th className="p-2 font-semibold">회피·주의</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12px]">
                <tr><td className="p-2 font-medium">해수 부식</td><td className="p-2">Cl⁻ · 산화 환경</td><td className="p-2">Hastelloy · AISI 316L · Cu-Ni 90/10 · Duplex 2205 · Ti</td><td className="p-2 text-rose-700">탄소강 · AISI 304 · Al (피팅·균열)</td></tr>
                <tr><td className="p-2 font-medium">산성 (H₂SO₄·HCl)</td><td className="p-2">강산 · 고온</td><td className="p-2">Hastelloy C-22/B-3 · 904L · Ti-Pd · 탄탈럼</td><td className="p-2 text-rose-700">탄소강 · SS 일반 · Al · 청동</td></tr>
                <tr><td className="p-2 font-medium">알칼리 (NaOH)</td><td className="p-2">강염기</td><td className="p-2">Ni 200 · Inconel 600 · Monel 400 · 탄소강 (저농도)</td><td className="p-2 text-rose-700">Al · Zn · AISI 304/316 (균열)</td></tr>
                <tr><td className="p-2 font-medium">고온 (≥ 700 °C)</td><td className="p-2">대기·연소가스</td><td className="p-2">Inconel 617/625/X · Haynes 230 · MA956 · CMSX-4</td><td className="p-2 text-rose-700">탄소강 · AISI 4140 · Al · 일반 SS</td></tr>
                <tr><td className="p-2 font-medium">저온 / 극저온</td><td className="p-2">LNG (-162 °C) · 우주 (-269 °C)</td><td className="p-2">Inconel 718 · AISI 316L · 9% Ni 강 · AA 5083 · Cu</td><td className="p-2 text-rose-700">탄소강 · AISI 4140 · BCC 구조 (DBTT)</td></tr>
                <tr><td className="p-2 font-medium">방사선 (원자력·우주)</td><td className="p-2">중성자·γ·X-ray</td><td className="p-2">SS AISI 304L · Inconel 718 · Zircaloy-4 · MA956</td><td className="p-2 text-rose-700">Al · 구리 (swelling) · 폴리머</td></tr>
                <tr><td className="p-2 font-medium">마모 / 부식 복합</td><td className="p-2">슬러리·미세입자</td><td className="p-2">Stellite · WC-Co · CoCrMo · Hardfaced steel · 알루미나 코팅</td><td className="p-2 text-rose-700">연강 · Al 일반 · 폴리머</td></tr>
                <tr><td className="p-2 font-medium">수소 환경</td><td className="p-2">고압 H₂ · 700 bar</td><td className="p-2">AISI 316L · AISI 304L · Inconel 625 · AISI 4130 (라이너) · CFRP wrap</td><td className="p-2 text-rose-700">고강도 강 (AISI 4340 · maraging) · Ni-base 일부 (H-취화)</td></tr>
                <tr><td className="p-2 font-medium">갈바닉 부식</td><td className="p-2">이종 금속 접촉</td><td className="p-2">같은 family 통일 · 절연 와셔 · 캐소드 가드</td><td className="p-2 text-rose-700">Al + steel 직접 접촉 · Cu + Zn 결합</td></tr>
                <tr><td className="p-2 font-medium">미생물 부식 (MIC)</td><td className="p-2">정체 수·황화수소</td><td className="p-2">Cu · 6Mo SS (254 SMO) · Ti</td><td className="p-2 text-rose-700">탄소강 · AISI 304 · Al</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">출처: ASM Handbook Vol. 13 (Corrosion); NACE MR0175 (Sulfide stress cracking); ASME B&PV Sec. VIII; NASA TM-2001-210803 (Cryogenic alloys).</p>

          <Note tone="warn" title="환경 조건이 복잡하면">
            여러 환경 (예: 해수 + 고온 + 마모) 이 동시에 발생하면 위 표의 교집합 + 표면 처리 (PVD · DLC · anodize) + 정기 검사 (NDT) 까지 함께 고려하세요. 단일 합금 만으로 모든 환경 대응 불가능.
          </Note>
        </Chapter>

        {/* ── Chapter 4 (구 3): 물성 사전 ─────────────────────────────── */}
        <Chapter
          n={4}
          id="ch1"
          title="물성 사전 — 재료가 말하는 언어"
          learn={[
            '각 물성이 “어떤 설계 요구”와 짝지어지는지 한 카드에서 본다',
            '단위(MPa, GPa, %)의 의미와 일반 범위(강철 vs 알루미늄 vs 폴리머)',
            '나중에 차트의 X·Y 축이나 좌측 필터에서 바로 알아본다',
          ]}
          prereq={<>고등학교 물리의 힘·면적·압력 개념(P = F/A)을 알면 충분합니다.</>}
        >
          <p className="leading-relaxed text-foreground/90">
            재료 데이터베이스에는 <F>MPa</F>, <F>GPa</F>, <F>%</F> 같은 숫자가 잔뜩 있습니다. 각 물성이 무엇을 뜻하는지 <b>먼저 감을 잡고</b> 시작합시다.
          </p>

          {/* 핵심 도식: 응력-변형률 곡선 — 한 그림으로 σy/UTS/연신율/E 모두 보기 */}
          <div className="rounded-lg border border-border bg-card p-3 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📊 핵심 그림 — 응력-변형률 곡선 한 장</p>
            <div className="h-[240px]"><SvgStressStrain /></div>
            <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
              인장 시험으로 얻는 이 한 곡선에 <span className="text-emerald-600 font-bold">σy</span>·<span className="text-violet-600 font-bold">UTS</span>·<span className="text-sky-600 font-bold">연신율</span>·<span className="text-amber-600 font-bold">E(탄성 영역의 기울기)</span>가 모두 들어 있습니다. 아래 카드들은 각각의 의미와 일반 범위를 따로 풉니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <PropCard
              name="항복강도 σy"
              unit="MPa"
              icon={<IconYield />}
              intuition="이 응력을 넘으면 영구 변형(소성). 클립을 살짝 구부리면 다시 펴지지만(탄성), 세게 구부리면 안 돌아오죠(소성) — 그 경계점."
              useFor="‘하중을 받아도 변형되면 안 된다’는 가장 흔한 강도 기준."
              range="알루미늄 100~500 · 강 250~1500 · 티타늄 800~1100 · 폴리머 30~100"
            />
            <PropCard
              name="인장강도 UTS"
              unit="MPa"
              icon={<IconUTS />}
              intuition="끊어지기 직전 최대 응력. σy가 ‘변하기 시작’ 이라면 UTS는 ‘파단 직전’."
              useFor="파단 안전여유 확인, 취성 재료 평가, 안전계수 산정."
              range="보통 σy의 1.1~1.5배"
            />
            <PropCard
              name="연신율"
              unit="%"
              icon={<IconElongation />}
              intuition="끊어질 때까지 늘어난 비율 = 연성. 낮으면 취성(갑자기 깨짐). 알루미늄 캔이 잘 찌그러지는 건 연성 덕분."
              useFor="충격 흡수, 성형/굽힘, 취성 파괴 회피."
              range="취성 세라믹 < 1 · 일반 금속 8~30 · 폴리머 50~500"
            />
            <PropCard
              name="탄성계수 E"
              unit="GPa"
              icon={<IconE />}
              intuition="‘뻣뻣함(강성)’. 같은 하중에서 얼마나 적게 휘는가. 고무는 작고, 강철은 크다."
              useFor="처짐 제한, 진동·고유진동수, 정밀도."
              range="고무 0.01 · 폴리머 1~5 · 알루미늄 70 · 티타늄 115 · 강 200 · 텅스텐 410"
            />
            <PropCard
              name="경도 HV"
              unit="HV"
              icon={<IconHardness />}
              intuition="국부 압입 저항. ‘긁힘·찍힘에 강한 정도’. 대략 마모·표면 강도의 지표."
              useFor="베어링/기어 표면, 마모 부품."
              range="알루미늄 30~150 · 강 150~700 · 공구강 700~"
            />
            <PropCard
              name="피로강도"
              unit="MPa"
              icon={<IconFatigue />}
              intuition="반복 하중(매번 같은 방향·반대 방향)에 견디는 응력 한계. 정적 강도보다 훨씬 낮음."
              useFor="회전·진동·반복 하중 부품 (샤프트·스프링·임펠러)."
              range="대략 UTS의 0.3~0.55. 알루미늄은 명확한 한도 없음(주의)"
            />
            <PropCard
              name="밀도 ρ"
              unit="g/cm³"
              icon={<IconDensity />}
              intuition="단위 부피당 무게. 경량화의 분모."
              useFor="‘비강도(σy/ρ)’ · ‘비강성(E/ρ)’ 같은 조합으로 경량화."
              range="폴리머 1~1.4 · 알루미늄 2.7 · 티타늄 4.5 · 강 7.8 · 텅스텐 19"
            />
            <PropCard
              name="열팽창계수 CTE"
              unit="10⁻⁶/K"
              icon={<IconCTE />}
              intuition="온도 1 °C 오르면 늘어나는 비율. 끼워맞춤·기차레일 틈·정밀 측정 등에서 결정적."
              useFor="열응력, 끼워맞춤, 치수 안정성. ‘끼워맞춤 부품의 가공이 어렵다’ 보통 CTE 미스매치."
              range="Invar 1.3 (정밀) · 강 12 · 알루미늄 23 · 폴리머 50~150"
            />
            <PropCard
              name="열전도도 k"
              unit="W/m·K"
              icon={<IconK />}
              intuition="열이 얼마나 잘 흐르는가. 구리는 빠르고, 폴리머는 거의 안 흐름."
              useFor="히트싱크, 금형, 단열재."
              range="단열 폴리머 0.2 · 강 50 · 알루미늄 240 · 구리 400"
            />
            <PropCard
              name="최대사용온도"
              unit="°C"
              icon={<IconMaxTemp />}
              intuition="장시간 사용 가능한 온도 상한. 잠깐은 더 견딜 수 있어도 ‘연속’ 사용은 여기까지."
              useFor="고온 부품(배기·터빈·열교환기)."
              range="폴리머 60~250 · 알루미늄 150 · 강 450 · Ni 초합금 800~1100"
            />
          </div>
          <Note tone="tip">
            <b>한 줄 요약.</b> 변형 = <F>E</F> · 영구변형 시작 = <F>σy</F> · 파단 = <F>UTS</F> · 늘어나는 정도 = 연신율 · 반복하중 = 피로강도. 나머지 물리 물성은 “열·전기·치수” 카테고리.
          </Note>

          {/* R64 — Heat Treatment Glossary 표 (Sprint 4 C7 ht-glossary.ts 와 동기). */}
          <H3>열처리 · 후처리 글로서리</H3>
          <p className="text-sm leading-relaxed">합금 조건명 (H900 · T6 · STA · Q+T 등) 은 열처리·기계적 처리의 표준 약어입니다. 상세 패널의 <b>Process 탭</b>에서 조건 옆에 효과 한 줄 설명이 함께 표시됩니다. 핵심 26 항목:</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[28%]">조건</th><th className="p-2 font-semibold w-[24%]">적용 합금</th><th className="p-2 font-semibold">효과</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-mono">H900</td><td className="p-2">17-4 PH · 15-5 PH</td><td className="p-2">최대 σy (~1170 MPa), 인성·연성 ↓, 부식 ↓</td></tr>
                <tr><td className="p-2 font-mono">H1025</td><td className="p-2">17-4 PH</td><td className="p-2">σy ~1000 MPa, 연성 ↑, 일반적 균형 조건</td></tr>
                <tr><td className="p-2 font-mono">H1075</td><td className="p-2">17-4 PH</td><td className="p-2">σy ~860 MPa, 충격인성 우수</td></tr>
                <tr><td className="p-2 font-mono">H1100</td><td className="p-2">17-4 PH</td><td className="p-2">σy ~795 MPa, 내응력부식 ↑</td></tr>
                <tr><td className="p-2 font-mono">H1150</td><td className="p-2">17-4 PH</td><td className="p-2">최대 연성, σy ~720 MPa, 내응력부식 최대</td></tr>
                <tr><td className="p-2 font-mono">Solution Annealed (SA, Condition A)</td><td className="p-2">PH 강 일반</td><td className="p-2">PH 강 출발조건, Aging(시효) 전 가공·용접 적합 (σy 낮음, El ↑)</td></tr>
                <tr><td className="p-2 font-mono">Aged · PH (Precipitation Hardened)</td><td className="p-2">PH 강 · Al 7xxx · Ni 합금</td><td className="p-2">Aging 경화 — σy·강도 ↑, El ↓</td></tr>
                <tr><td className="p-2 font-mono">STA (Solution + Aged)</td><td className="p-2">Ti-6Al-4V 등</td><td className="p-2">Ti 합금 표준 강화 조건</td></tr>
                <tr><td className="p-2 font-mono">Q&T (Quenched & Tempered)</td><td className="p-2">탄소·합금강 (AISI 4140, AISI 4340)</td><td className="p-2">Quenching(담금질) + Tempering(뜨임) — 강도·인성 균형, 일반 구조강 기본</td></tr>
                <tr><td className="p-2 font-mono">Normalized</td><td className="p-2">탄소·합금강</td><td className="p-2">균질 미세조직, 응력 완화, σy·연성 중간</td></tr>
                <tr><td className="p-2 font-mono">Annealed (Full / Soft)</td><td className="p-2">모든 합금</td><td className="p-2">최대 연성·가공성, σy ↓ (시작점)</td></tr>
                <tr><td className="p-2 font-mono">Stress-relieved</td><td className="p-2">AM 부품 일반</td><td className="p-2">AM 잔류응력 완화, 미세조직 변화 미미</td></tr>
                <tr><td className="p-2 font-mono">HIP (Hot Isostatic Press)</td><td className="p-2">AM 부품 · 주조</td><td className="p-2">기공 제거 → 피로 강도·연신 ↑ (AM 표준)</td></tr>
                <tr><td className="p-2 font-mono">As-built / As-printed (ASB)</td><td className="p-2">AM 모든 합금</td><td className="p-2">AM 후처리 없음 — 잔류응력 + 일부 기공, 피로 ↓</td></tr>
                <tr><td className="p-2 font-mono">T6</td><td className="p-2">Al 합금 (AA 6061, AA 7075, AlSi10Mg)</td><td className="p-2">Al 표준 Aging (peak hardness)</td></tr>
                <tr><td className="p-2 font-mono">T651</td><td className="p-2">Al 7xxx · AA 2024</td><td className="p-2">T6 + stress-relieved (잔류응력 ↓)</td></tr>
                <tr><td className="p-2 font-mono">T7 (T73 · T74)</td><td className="p-2">Al 7xxx</td><td className="p-2">Over-aged — 응력부식 ↑, σy 약간 ↓</td></tr>
                <tr><td className="p-2 font-mono">T4</td><td className="p-2">Al 2xxx</td><td className="p-2">Solution + 자연시효 — El ↑, σy 중간</td></tr>
                <tr><td className="p-2 font-mono">O Temper</td><td className="p-2">Al 합금 일반</td><td className="p-2">Annealed Al — 최대 연성</td></tr>
                <tr><td className="p-2 font-mono">H-temper (H14·H18·H22·H32)</td><td className="p-2">Al 비열처리 합금</td><td className="p-2">Al cold-work strengthened (변형 경화)</td></tr>
                <tr><td className="p-2 font-mono">Mill Annealed (MA)</td><td className="p-2">Ti 합금</td><td className="p-2">Ti 합금 출발 조건 — α+β 미세조직 균질</td></tr>
                <tr><td className="p-2 font-mono">β-annealed</td><td className="p-2">Ti 합금</td><td className="p-2">β-transus 위 균질화, 인성 ↑, El ↓</td></tr>
                <tr><td className="p-2 font-mono">SA + Aged</td><td className="p-2">Inconel 718 · Waspaloy</td><td className="p-2">Ni superalloy 강화 — γ′ 석출</td></tr>
                <tr><td className="p-2 font-mono">Homogenized</td><td className="p-2">주조 · AM 일반</td><td className="p-2">주조·AM 미세편석 균질화</td></tr>
                <tr><td className="p-2 font-mono">PH (Cu)</td><td className="p-2">CuBe · CuCr</td><td className="p-2">Cu Aging — 강도·전도성 균형</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">출처: ASM Handbook Vol. 4 (Heat Treating), Vol. 1 (Properties); AMS spec; MMPDS-2018; Vendor datasheets (EOS · Renishaw · Sandvik · Special Metals).</p>
        </Chapter>

        {/* ── Chapter 5 (구 2): 요구를 숫자로 + R65 B 안전계수 사전 ───────── */}
        <Chapter
          n={5}
          id="ch2"
          title="설계 요구를 숫자로 바꾸기 + 안전계수 사전"
          learn={[
            '응력 σ = F/A 한 줄에서 "필요 항복강도"를 산출한다',
            '처짐 식으로 "필요 탄성계수 E"를 산출한다',
            '산업·조건·규격별 안전계수 SF 선택 — 가장 자주 막히는 단계',
          ]}
          prereq={<>벡터·힘·기본 적분(약간) — 모르면 결과 식만 외우고 넘어가도 됩니다.</>}
        >

          <H3><Lightbulb className="w-4 h-4 text-amber-500"/> 2.1 응력 = 힘 ÷ 면적 — 가장 먼저 만나는 식</H3>
          <p className="leading-relaxed">
            막대를 잡아당기는 힘 <F>F</F> 가 단면적 <F>A</F> 에 골고루 퍼진다면, 단면 안 어디서나 같은 응력이 작용합니다. 이게 <F>σ = F / A</F>.
            영구 변형을 막으려면 <b>작용 응력이 항복강도 σy 보다 충분히 작아야</b> 합니다.
          </p>
          <Note tone="why">
            <p>σy 를 그대로 쓰지 않고 “안전계수 SF” 로 나눠 “허용응력” 을 만듭니다. 측정 오차, 결함, 충격, 환경, 데이터 불확실성 같은 미지의 요소에 대비하는 여유분이죠.</p>
            <p className="mt-1 font-mono text-[13px]">허용응력 = σy / SF &nbsp;→&nbsp; 필요 σy ≥ SF · σ = SF · F / A</p>
            <p className="mt-1 text-muted-foreground">정적·연성 부품은 보통 <F>SF = 1.5~2</F>, 인명·취성·불확실 영역은 더 높게.</p>
          </Note>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[260px]"><SvgSafetyFactor /></div>
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/40 p-4 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">📐 워크드 예제 — 인장 부재</p>
            <p className="text-sm text-foreground/85 mb-3">
              지름 약 5 mm, 단면적 <F>A = 20 mm²</F>인 봉이 <F>F = 4000 N</F>의 인장하중을 받습니다. <F>SF = 2</F>로 설계합니다.
            </p>
            <Step n={1} title="작용 응력 계산" formula={<>σ = F / A</>} result={<>σ = 4000 / 20 = <b>200 MPa</b></>} />
            <Step n={2} title="안전계수 적용 → 필요 σy" formula={<>필요 σy ≥ SF · σ</>} result={<>≥ 2 × 200 = <b>400 MPa</b></>} />
            <Step n={3} title="앱에서 후보 좁히기" result={<>좌측 <b>Yield Strength</b> 필터 하한을 <b>400</b>으로 설정.</>} note="알루미늄 일반품은 탈락, 고강도 알루미늄 일부·강·티타늄·니켈 통과." />
          </div>

          <H3><Lightbulb className="w-4 h-4 text-amber-500"/> 2.2 처짐과 강성 — “덜 휘려면 E가 얼마여야 하나?”</H3>
          <p className="leading-relaxed">
            “덜 휜다”는 <b>강성</b>의 문제이고, 강성은 <b>형상(I)</b> + <b>재료 E</b>로 결정됩니다. 가장 단순한 예는 외팔보:
          </p>
          <p className="font-mono text-[13px] mt-1 bg-muted/40 inline-block px-2 py-1 rounded">δ_max = F · L³ / (3 · E · I)</p>
          <p className="text-sm mt-2 text-muted-foreground">
            <F>I</F> = 단면 2차모멘트(단면 모양으로 결정, Chapter 3). 처짐 한계 <F>δ_max</F> 를 정하면 식을 뒤집어서 <F>필요 E·I</F> 를 알 수 있고, <F>I</F> 가 단면으로 정해지면 <F>필요 E</F> 가 나옵니다.
          </p>

          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/40 p-4 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">📐 워크드 예제 — 외팔보 처짐 한계</p>
            <p className="text-sm text-foreground/85 mb-3">
              길이 <F>L = 100 mm</F>, 단면 2차모멘트 <F>I = 1,000 mm⁴</F> 인 외팔보가 <F>F = 200 N</F> 끝하중에서 <F>δ ≤ 0.5 mm</F> 로 유지되어야 합니다.
            </p>
            <Step n={1} title="처짐 식 뒤집기" formula={<>필요 E = F·L³ / (3·I·δ_max)</>} />
            <Step n={2} title="값 대입" formula={<>= 200 × 100³ / (3 × 1000 × 0.5)</>} result={<>= 133,000 MPa = <b>133 GPa</b></>} />
            <Step n={3} title="앱에서 후보 좁히기" result={<><b>Modulus</b> 필터 하한 133 GPa.</>} note="알루미늄(~70) 탈락 · 티타늄(~115) 부족 · 강(~200)·텅스텐 통과." />
          </div>

          <Note tone="tip">
            <b>강성 직관.</b> 강성이 부족하면 보통 <b>단면을 키우는 게 재료를 바꾸는 것보다 효과적</b>입니다 (<F>I</F> 는 두께의 <b>세제곱</b>에 비례 — Chapter 3 참고). 무게·공간 제약이 빡빡할 때만 “더 단단한 재료”로 갑니다.
          </Note>

          <H3><Lightbulb className="w-4 h-4 text-amber-500"/> 2.3 그 밖의 흔한 변환 (치트시트)</H3>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">요구</th><th className="p-2 font-semibold">보는 물성 / 식</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2">반복·진동 하중</td><td className="p-2"><b>피로강도</b> ≥ 응력진폭 × SF — 정적 σy 만으로 부족</td></tr>
                <tr><td className="p-2">충격·갑작스런 하중</td><td className="p-2"><b>연신율·충격값</b> 충분 (취성 회피), 동시에 강도</td></tr>
                <tr><td className="p-2">고온 사용</td><td className="p-2"><b>최대사용온도</b> ≥ 사용온도, 그리고 <b>그 온도에서의</b> σy/UTS (상세의 “온도-강도” 곡선)</td></tr>
                <tr><td className="p-2">열변형/끼워맞춤</td><td className="p-2">열응력 <F>σ ≈ E·CTE·ΔT</F>, 치수변화 <F>ΔL = L·CTE·ΔT</F> → 작은 <b>CTE</b></td></tr>
                <tr><td className="p-2">방열</td><td className="p-2">높은 <b>열전도도 k</b> (경량 방열은 <F>k/ρ</F>)</td></tr>
                <tr><td className="p-2">부식·내후</td><td className="p-2">환경에 맞는 <b>내식성</b> 등급(정성) — 정량은 데이터시트 확인</td></tr>
              </tbody>
            </table>
          </div>

          {/* R65 B — 안전계수 사전 (산업·조건·규격별). 학생들이 가장 자주 막히는 부분. */}
          <H3>5.5 안전계수 (SF) 사전 — "얼마로 잡아야 하나"</H3>
          <p className="text-sm leading-relaxed">SF = 작용응력 대비 허용응력의 여유. 너무 낮으면 위험·인명, 너무 높으면 무겁고 비쌈. 산업·조건·규격이 SF 의 기준을 정합니다.</p>

          <H3>5.5.1 산업·용도별 일반 SF</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[24%]">산업·용도</th><th className="p-2 font-semibold w-[14%]">SF 범위</th><th className="p-2 font-semibold">근거·규격</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">항공 (구조)</td><td className="p-2 text-emerald-700 font-mono">1.5 (Ultimate) · 1.0 (Limit)</td><td className="p-2">FAR 25.303 / EASA CS-25 — 무게 critical 한 만큼 SF 낮춤. 시험 검증 필수.</td></tr>
                <tr><td className="p-2 font-medium">자동차 (구조)</td><td className="p-2 text-emerald-700 font-mono">2 ~ 3</td><td className="p-2">SAE J1100 / 일반 OEM. 충돌·피로 별도 마진.</td></tr>
                <tr><td className="p-2 font-medium">일반 기계 (정적)</td><td className="p-2 text-emerald-700 font-mono">1.5 ~ 2</td><td className="p-2">교과서 기본값. ASME B&PV Sec.II Pt.D 의 σ_allow = σy/1.5.</td></tr>
                <tr><td className="p-2 font-medium">압력 용기</td><td className="p-2 text-amber-700 font-mono">3 ~ 4 (UTS), 1.5 (σy)</td><td className="p-2">ASME B&PV Sec.VIII Div.1 — 누설·파열 인명 안전.</td></tr>
                <tr><td className="p-2 font-medium">크레인·리프팅</td><td className="p-2 text-amber-700 font-mono">5 ~ 10</td><td className="p-2">OSHA · ASME B30 — 충격 + 인명. wire rope 는 10.</td></tr>
                <tr><td className="p-2 font-medium">엘리베이터·승강기</td><td className="p-2 text-amber-700 font-mono">8 ~ 12</td><td className="p-2">EN 81 / ASME A17.1 — 인명 + 사이클 큼.</td></tr>
                <tr><td className="p-2 font-medium">의료 임플란트</td><td className="p-2 text-amber-700 font-mono">5 ~ 10 (피로)</td><td className="p-2">ISO 14801 (치아) · ISO 7206 (고관절). 10⁶ 사이클 무파손.</td></tr>
                <tr><td className="p-2 font-medium">건축 구조 강재</td><td className="p-2 text-emerald-700 font-mono">1.5 ~ 2.5</td><td className="p-2">AISC / EUROCODE 3 · KBC. LRFD load·resistance factor.</td></tr>
                <tr><td className="p-2 font-medium">시제품·실험</td><td className="p-2 text-emerald-700 font-mono">1.5</td><td className="p-2">설계 검증용. 양산 전 SF 재조정.</td></tr>
              </tbody>
            </table>
          </div>

          <H3>5.5.2 조건·하중 종류별 SF 가산 (multiplicative)</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[28%]">조건</th><th className="p-2 font-semibold">가산</th><th className="p-2 font-semibold">이유</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">반복 하중 (피로)</td><td className="p-2 font-mono">× 2 ~ 4</td><td className="p-2">σf ≈ 0.4~0.5·UTS (Shigley, 강). 노치·표면 거칠기 영향 포함.</td></tr>
                <tr><td className="p-2 font-medium">충격 하중</td><td className="p-2 font-mono">× 2 ~ 3</td><td className="p-2">동적 응력 = 정적 응력 × √(낙하높이/처짐) 의 2~3 배 가산.</td></tr>
                <tr><td className="p-2 font-medium">취성 재료 (tool steel · 세라믹)</td><td className="p-2 font-mono">× 2 ~ 5</td><td className="p-2">변형 경고 없이 파단. Weibull 분포 큰 편차.</td></tr>
                <tr><td className="p-2 font-medium">고온 (creep 영역)</td><td className="p-2 font-mono">× 1.5 ~ 3</td><td className="p-2">10⁵ h creep rupture stress 별도 적용 + 추가 SF.</td></tr>
                <tr><td className="p-2 font-medium">부식·환경 (해수·산성)</td><td className="p-2 font-mono">× 1.3 ~ 2</td><td className="p-2">두께 손실 보정 (보통 1 mm/10년).</td></tr>
                <tr><td className="p-2 font-medium">데이터 불확실성 (class·derived)</td><td className="p-2 font-mono">× 1.5 ~ 2</td><td className="p-2">측정값 아닌 추정. detail 패널의 confidence 라벨 확인.</td></tr>
                <tr><td className="p-2 font-medium">제조 변동 (cast · AM)</td><td className="p-2 font-mono">× 1.2 ~ 2</td><td className="p-2">batch 간 변동, 빌드 방향 영향.</td></tr>
              </tbody>
            </table>
          </div>

          <Note tone="tip" title="실무 SF 계산 — 예제">
            <p>자동차 부품 (일반 기계 SF=2) + 반복 하중 (×3) + 부식 (×1.3) + AM 제조 (×1.5)</p>
            <p className="mt-1 font-mono text-[13px]">→ 최종 SF = 2 × 3 × 1.3 × 1.5 ≈ <b>11.7</b></p>
            <p className="mt-1 text-muted-foreground">실제로는 각 항목 root 평균이나 max 사용 (보수성 vs 비용 trade-off). 위 값은 상한선 — 시험 결과로 점진적 조정.</p>
          </Note>

          <Note tone="warn" title="SF 가 너무 높으면">
            과한 SF = 무겁고 비싸고 가공 어려움. <b>SF 낮추는 방법</b>: ① 측정 데이터 (n=N · handbook) 사용 → 추정 SF 제거 / ② 시제품 시험으로 실제 분포 확인 / ③ 동적 / 환경 SF 는 시험으로 직접 확인. 학생 프로젝트는 SF=2 로 시작 후 점진 조정.
          </Note>

          {/* R66 B — 피로 (Basquin + Goodman) + 외부 링크 */}
          <H3>5.6 반복하중 — Basquin 식 + Goodman diagram</H3>
          <p className="text-sm leading-relaxed">정적 σy 만으로는 회전축·임펠러·스프링 같이 반복 하중 받는 부품 설계 불가. <b>S-N 곡선</b>이 사이클 수 N 에 따른 허용 응력진폭 σ_a 를 줍니다.</p>
          {/* R68 — S-N 곡선 도식 */}
          <div className="rounded-lg border border-border bg-card p-3 my-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📈 S-N 곡선 — Basquin 식 (log-log)</p>
            <svg viewBox="0 0 480 220" className="w-full h-auto">
              {/* axes */}
              <line x1="50" y1="180" x2="460" y2="180" stroke="oklch(0.4 0.04 250)" />
              <line x1="50" y1="20" x2="50" y2="180" stroke="oklch(0.4 0.04 250)" />
              {/* gridlines — R209 B-2: knee 가 10⁶ 에 오도록 축을 10²~10⁷ 로. (이전 10¹~10⁶ 에서 knee 가 10⁴ 로 그려져 본문/라벨 10⁶ 과 2 decade 어긋남) */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <g key={i}>
                  <line x1={50 + i * 80} y1="20" x2={50 + i * 80} y2="180" stroke="oklch(0.92 0.012 250)" />
                  <text className="svg-text-bg-sm" x={50 + i * 80} y="195" textAnchor="middle" fontSize="10" fill="oklch(0.5 0.04 250)">10{['²', '³', '⁴', '⁵', '⁶', '⁷'][i]}</text>
                </g>
              ))}
              {/* Steel curve (with endurance limit) — knee at x=370 (10⁶) */}
              <path d="M 50 30 L 370 110 L 460 110" fill="none" stroke="oklch(0.55 0.12 220)" strokeWidth="2.5" />
              <text className="svg-text-bg-sm" x="460" y="105" textAnchor="end" fontSize="11" fill="oklch(0.45 0.12 220)" fontWeight="bold">강·Ti (σf 한계)</text>
              {/* Al curve (no endurance limit, continues down) */}
              <path d="M 50 50 L 460 150" fill="none" stroke="oklch(0.55 0.12 30)" strokeWidth="2.5" />
              <text className="svg-text-bg-sm" x="460" y="160" textAnchor="end" fontSize="11" fill="oklch(0.45 0.12 30)" fontWeight="bold">Al (한계 없음)</text>
              {/* Endurance limit dashed line at 10⁶ */}
              <line x1="370" y1="110" x2="370" y2="180" stroke="oklch(0.55 0.12 220)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <text className="svg-text-bg-sm" x="370" y="208" textAnchor="middle" fontSize="9" fill="oklch(0.45 0.12 220)">N = 10⁶ (σf)</text>
              {/* Labels */}
              <text className="svg-text-bg-sm" x="255" y="14" textAnchor="middle" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">σ_a (응력 진폭)</text>
              <text className="svg-text-bg-sm" x="255" y="215" textAnchor="middle" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">사이클 수 N</text>
              <text className="svg-text-bg-sm" x="42" y="28" textAnchor="end" fontSize="9" fill="oklch(0.5 0.04 250)">UTS</text>
              <text className="svg-text-bg-sm" x="42" y="115" textAnchor="end" fontSize="9" fill="oklch(0.5 0.04 250)">σf</text>
              <text className="svg-text-bg-sm" x="42" y="180" textAnchor="end" fontSize="9" fill="oklch(0.5 0.04 250)">0</text>
            </svg>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">강·Ti 는 10⁶ 사이클 이후 σf 한계 — 그 아래는 무한수명. Al·Mg 는 한계 없이 계속 감소 → 사이클 수 명시 必.</p>
          </div>
          <Note tone="why" title="Basquin 식 (High-Cycle Fatigue)">
            <p className="font-mono text-[12.5px]">σ_a = σ'_f · (2N)^b</p>
            <p className="mt-1 text-[12px] leading-relaxed">σ'_f = 피로 강도계수 (≈ σf at 1 cycle) · b = Basquin 지수 (보통 -0.05 ~ -0.12). 강·Ti 는 N=10⁶ 부근 무한수명 한계 (σf), Al 은 한계 없음 — Basquin 식이 끝까지 적용.</p>
          </Note>
          {/* R68 — Goodman diagram */}
          <div className="rounded-lg border border-border bg-card p-3 my-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📐 Goodman diagram — 평균응력 영향</p>
            {/* R189 — Goodman diagram label 겹침 fix:
             *   - Soderberg label y=138 (설계점 y=139 겹침) → y=80 (line 상부 위쪽 안전 영역)
             *   - Goodman label x=290 y=108 그대로 (line 위쪽, OK)
             *   - Gerber label x=300 y=170 → x=320 y=160 (오른쪽 약간, Goodman 과 거리 확보)
             *   - 설계점 (170, 135) + label y=139 그대로 (Soderberg 이동 후 충분 공간)
             *   - "✓ 안전 영역" x=120 → x=80 y=170 → y=160 (좌하단 더 명확)
             *   - "✗ 파단" x=250 → x=320 y=50 (Goodman label 의 위쪽) */}
            <svg viewBox="0 0 420 220" className="w-full h-auto">
              {/* axes */}
              <line x1="50" y1="180" x2="380" y2="180" stroke="oklch(0.4 0.04 250)" />
              <line x1="50" y1="20" x2="50" y2="180" stroke="oklch(0.4 0.04 250)" />
              {/* Goodman (linear) */}
              <line x1="50" y1="40" x2="370" y2="180" stroke="oklch(0.55 0.12 220)" strokeWidth="2" />
              <text className="svg-text-bg-sm" x="270" y="100" fontSize="11" fill="oklch(0.45 0.12 220)" fontWeight="bold">Goodman (σ_u)</text>
              {/* Soderberg */}
              <line x1="50" y1="40" x2="290" y2="180" stroke="oklch(0.55 0.12 110)" strokeWidth="2" />
              <text className="svg-text-bg-sm" x="120" y="78" fontSize="10" fill="oklch(0.45 0.12 110)" fontWeight="bold">Soderberg (σ_y)</text>
              {/* Gerber parabolic */}
              <path d="M 50 40 Q 220 90 370 180" fill="none" stroke="oklch(0.55 0.12 30)" strokeWidth="2" strokeDasharray="4 3" />
              <text className="svg-text-bg-sm" x="320" y="155" fontSize="10" fill="oklch(0.45 0.12 30)" fontWeight="bold">Gerber (실험)</text>
              {/* Design point examples */}
              <circle cx="170" cy="135" r="5" fill="oklch(0.5 0.18 30)" />
              <text className="svg-text-bg-sm" x="178" y="139" fontSize="10" fill="oklch(0.4 0.18 30)" fontWeight="bold">설계점 (안전)</text>
              {/* Safe / unsafe zones */}
              <text className="svg-text-bg-sm" x="75" y="160" fontSize="10" fill="oklch(0.45 0.15 145)" fontWeight="bold">✓ 안전 영역</text>
              <text className="svg-text-bg-sm" x="330" y="48" fontSize="10" fill="oklch(0.45 0.18 30)" fontWeight="bold">✗ 파단</text>
              {/* Labels */}
              <text className="svg-text-bg-sm" x="42" y="44" textAnchor="end" fontSize="11" fill="oklch(0.4 0.04 250)">σ_f</text>
              <text className="svg-text-bg-sm" x="42" y="184" textAnchor="end" fontSize="11" fill="oklch(0.4 0.04 250)">0</text>
              <text className="svg-text-bg-sm" x="290" y="195" textAnchor="middle" fontSize="11" fill="oklch(0.4 0.04 250)">σ_y</text>
              <text className="svg-text-bg-sm" x="370" y="195" textAnchor="middle" fontSize="11" fill="oklch(0.4 0.04 250)">σ_u</text>
              <text className="svg-text-bg-sm" x="42" y="14" textAnchor="end" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">σ_a</text>
              <text className="svg-text-bg-sm" x="380" y="215" textAnchor="end" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">σ_m  (평균응력)</text>
            </svg>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">설계점 (σ_m, σ_a) 이 직선 아래면 안전. Goodman 가장 일반적, Soderberg 보수적, Gerber 실험 데이터 적합. Compare 패널의 <a href="/" className="text-accent hover:underline">Goodman view</a> 에서 alloy 별 SF 계산 가능.</p>
          </div>
          <Note tone="why" title="Goodman / Soderberg / Gerber — 평균응력 보정">
            <p className="leading-relaxed">실제 부품은 평균응력 σ_m ≠ 0 인 경우가 많음 (예: 베어링 안 회전축). 평균응력은 피로 한계를 낮춤.</p>
            <p className="mt-1 font-mono text-[12.5px]">Goodman: σ_a/σ_f + σ_m/σ_u = 1/SF</p>
            <p className="mt-1 font-mono text-[12.5px]">Soderberg: σ_a/σ_f + σ_m/σ_y = 1/SF (보수적, σy 기준)</p>
            <p className="mt-1 font-mono text-[12.5px]">Gerber: σ_a/σ_f + (σ_m/σ_u)² = 1/SF (실험 데이터 적합)</p>
            <p className="mt-2 text-[12px] text-muted-foreground">설계에서는 Goodman (most common) 또는 Soderberg (보수적). 인장 평균응력 위험, 압축 평균응력은 비교적 안전.</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — 응력·피로·SF">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/Stress%E2%80%93strain_curve">Wikipedia: Stress-strain curve</ExtLink> — σy · UTS · 연신율 그래프 설명</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Factor_of_safety">Wikipedia: Factor of safety</ExtLink> — 산업·규격별 SF 정리</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Fatigue_(material)">Wikipedia: Fatigue (material)</ExtLink> — Basquin · S-N · Goodman 등</li>
              <li><ExtLink href="https://www.engineeringtoolbox.com/factors-safety-fos-d_1624.html">Engineering Toolbox: Factors of Safety</ExtLink> — 빠른 참조</li>
              <li><ExtLink href="https://www.doitpoms.ac.uk/tlplib/index.php">DoITPoMS: Fatigue</ExtLink> — interactive 학습</li>
              <li><ExtLink href="https://ocw.mit.edu/courses/3-11-mechanics-of-materials-fall-1999/">MIT OCW 3.11 Mechanics of Materials</ExtLink> — 응력·변형률·피로 강의</li>
            </ul>
          </Note>
        </Chapter>

        {/* ── Chapter 6 (구 3): 단면 모양 도감 ─────────────────────────── */}
        <Chapter
          n={6}
          id="ch3"
          title="단면 모양 도감 — A · I · Z · J"
          learn={[
            '6가지 단면(직사각·정사각·원·박스·관·I빔)의 단면적·2차모멘트·단면계수',
            '왜 I빔·박스·관이 무게당 가장 강하고 뻣뻣한지',
            '굽힘응력 식 σ_b = M / Z 의 의미',
          ]}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Term word="A">단면적 — 인장응력 <F>σ = F/A</F></Term>
            <Term word="I">단면 2차모멘트 — 굽힘 변형·응력의 단면 인자, 중립축 기준</Term>
            <Term word="Z = I/c">단면계수 — 굽힘응력 <F>σ_b = M / Z</F>, <F>c</F>는 중립축에서 가장 먼 거리</Term>
            <Term word="J">극관성모멘트 — 비틀림 <F>τ = T·r / J</F>, 원형 단면만 단순한 닫힌식</Term>
          </div>

          <Note tone="why" title="왜 I빔·박스·관이 효율적인가?">
            <F>I</F>는 “재료를 중립축에서 얼마나 멀리 두었는가”에 매우 민감합니다 (거리의 제곱·세제곱으로 들어감). 그래서 같은 단면적이면 <b>속을 비우고 멀리</b> 배치한 박스·관·I빔이 굽힘에 압도적으로 유리합니다. 건물 보·자전거 프레임·골프 채가 그렇죠.
          </Note>

          {/* 핵심 도식: 굽힘 응력 분포 + 중립축 */}
          <div className="rounded-lg border border-border bg-card p-3 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📊 핵심 그림 — 굽힘 응력 분포와 중립축</p>
            <div className="h-[240px]"><SvgBendingStress /></div>
            <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
              보가 굽혀지면 <span className="text-rose-500 font-bold">위는 압축</span>, <span className="text-sky-500 font-bold">아래는 인장</span>이 됩니다. 중간 어딘가는 응력이 0(<b>중립축</b>). 응력은 중립축에서 거리(<F>c</F>)에 비례해 선형 증가 → 같은 모멘트 <F>M</F>이어도 <F>I</F>가 크면 σ가 작아집니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <ShapeCard
              svg={<SvgRect />}
              name="직사각형"
              dims="b × h (h 가 굽힘 방향)"
              formulas={[
                { label: 'A', expr: 'b · h' },
                { label: 'I', expr: 'b · h³ / 12' },
                { label: 'Z', expr: 'b · h² / 6' },
              ]}
              usedFor="목재 보·간단한 막대·기계 가공 부품의 기본 단면."
            />
            <ShapeCard
              svg={<SvgSquare />}
              name="정사각형"
              dims="a × a"
              formulas={[
                { label: 'A', expr: 'a²' },
                { label: 'I', expr: 'a⁴ / 12' },
                { label: 'Z', expr: 'a³ / 6' },
                { label: 'J', expr: '≈ 0.141 · a⁴' },
              ]}
              usedFor="기계 부품의 일반 단면. 비틀림은 원형보다 약함."
            />
            <ShapeCard
              svg={<SvgCircle />}
              name="원형 (꽉찬)"
              dims="지름 d"
              formulas={[
                { label: 'A', expr: 'π · d² / 4' },
                { label: 'I', expr: 'π · d⁴ / 64' },
                { label: 'Z', expr: 'π · d³ / 32' },
                { label: 'J', expr: 'π · d⁴ / 32' },
              ]}
              usedFor="축·핀·볼트. 비틀림에 자연스럽고 가공 쉬움."
            />
            <ShapeCard
              svg={<SvgBox />}
              name="박스 (중공 직사각)"
              dims="B,H 외부 / b,h 내부"
              formulas={[
                { label: 'A', expr: 'B·H − b·h' },
                { label: 'I', expr: '(B·H³ − b·h³) / 12' },
                { label: 'Z', expr: '2 · I / H' },
              ]}
              usedFor="차체 프레임·로봇 팔. 굽힘/비틀림 둘 다 좋음."
            />
            <ShapeCard
              svg={<SvgTube />}
              name="원형 관 (튜브)"
              dims="외경 D / 내경 d"
              formulas={[
                { label: 'A', expr: 'π(D² − d²) / 4' },
                { label: 'I', expr: 'π(D⁴ − d⁴) / 64' },
                { label: 'Z', expr: 'π(D⁴ − d⁴) / (32·D)' },
                { label: 'J', expr: 'π(D⁴ − d⁴) / 32' },
              ]}
              usedFor="자전거 프레임·드론 암·송유관. 굽힘·비틀림에 압도적."
            />
            <ShapeCard
              svg={<SvgIBeam />}
              name="I-빔 (H-빔)"
              dims="플랜지 b_f·t_f / 웹 h_w·t_w"
              formulas={[
                { label: 'A', expr: '2·b_f·t_f + h_w·t_w' },
                { label: 'I', expr: '플랜지+웹 합산 (parallel-axis)' },
                { label: 'Z', expr: 'I / (h/2)' },
              ]}
              usedFor="건축·교량 보. 한 방향 굽힘에 최적, 비틀림은 약함."
            />
          </div>

          <Note tone="tip">
            <b>설계 흐름.</b> ① 부품의 '<b>주된 하중</b>'(인장? 굽힘? 비틀림?)을 정한다 → ② 그에 맞는 <b>단면 모양</b>을 고른다 → ③ Chapter 7의 처짐 식으로 필요 E·I 산출 → ④ 단면이 정해지면 <F>I</F> 가 나오므로 <b>필요 E</b> 가 결정 → ⑤ 강도는 <F>σ_b = M / Z ≤ σy / SF</F> 로 점검.
          </Note>

          {/* R66 B — 단면 모멘트 I 의 유도 + 외부 링크 */}
          <Note tone="why" title="2차 모멘트 I 의 적분 정의">
            <p className="font-mono text-[13px]">I = ∫_A y² dA</p>
            <p className="mt-1 text-[12px] leading-relaxed">중립축 (보통 도심) 에서 y 만큼 떨어진 미소 면적 dA 의 거리 제곱 곱셈 합. 거리 제곱 → <b>축에서 멀수록 휘는 데 저항 ↑</b>. 그래서 I-beam · 박스가 무게 대비 가장 효율적.</p>
            <p className="mt-1 text-[12px]">사각형 (b×h): I = b·h³/12 · 원: I = π·d⁴/64 · 박스 (B×H 외, b×h 내): I = (B·H³ − b·h³)/12.</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — 단면·굽힘">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/Second_moment_of_area">Wikipedia: Second moment of area</ExtLink> — 모든 표준 단면의 I 공식</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Section_modulus">Wikipedia: Section modulus</ExtLink> — Z = I/c</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Bending">Wikipedia: Bending</ExtLink> — Euler-Bernoulli beam theory</li>
              <li><ExtLink href="https://www.engineeringtoolbox.com/area-moment-inertia-d_1328.html">Engineering Toolbox: Area Moment of Inertia</ExtLink></li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Fatigue_(material)">Wikipedia: Fatigue (material)</ExtLink> — S-N curve · Goodman diagram · Miner's rule overview</li>
            </ul>
          </Note>
        </Chapter>

        {/* ── Chapter 7 (구 4): 보 하중 도감 ───────────────────────────── */}
        <Chapter
          n={7}
          id="ch4"
          title="보 하중·지지조건 도감"
          learn={[
            '6가지 표준 하중·지지조건의 최대 처짐 / 최대 모멘트 공식',
            '식의 형태: 외팔보는 L³·L⁴ 계수가 크고, 양단고정은 매우 작다',
            '단면(Chapter 3)과 결합하여 필요 E·I 와 필요 σy 를 산출하는 흐름',
          ]}
        >
          <p className="leading-relaxed">
            처짐 식은 모두 <F>δ = (계수) · F·L³ / (E·I)</F> 또는 <F>(계수) · w·L⁴ / (E·I)</F> 형태입니다. <b>계수만 외우면 됩니다</b>. 모멘트도 마찬가지 — <F>M_max</F> 에서 <F>σ_b = M/Z</F>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <LoadCard
              svg={<SvgCantileverV2 />}
              name="외팔보 · 끝단 집중하중"
              deflection="F·L³ / (3·E·I)"
              moment="F·L (근원에서 최대)"
              common="브래킷, 진단봉, 다이빙 보드, 사무용 책상 모서리."
              hint="처짐 계수가 1/3 — 모든 케이스 중 가장 크게 휨"
            />
            <LoadCard
              svg={<SvgCantileverUDLV2 />}
              name="외팔보 · 등분포하중 w"
              deflection="w·L⁴ / (8·E·I)"
              moment="w·L² / 2"
              common="천장에서 자중 받는 캔틸레버, 비행기 날개(근사)."
            />
            <LoadCard
              svg={<SvgSimpleCenterV2 />}
              name="단순지지 · 중앙 집중하중"
              deflection="F·L³ / (48·E·I)"
              moment="F·L / 4"
              common="가장 흔한 시험·교과서 케이스. 두 지점 올려놓은 막대 위 한 점."
            />
            <LoadCard
              svg={<SvgSimpleUDLV2 />}
              name="단순지지 · 등분포하중 w"
              deflection="5·w·L⁴ / (384·E·I)"
              moment="w·L² / 8"
              common="자기 무게로 휘는 보, 균등 하중 책장 선반."
            />
            <LoadCard
              svg={<SvgFixedCenterV2 />}
              name="양단 고정 · 중앙 집중하중"
              deflection="F·L³ / (192·E·I)"
              moment="F·L / 8 (단부 최대)"
              common="용접·볼팅으로 양 끝이 회전 못 하는 강판 보."
              hint="처짐이 단순지지의 1/4 — 고정조건이 매우 강력"
            />
            <LoadCard
              svg={<SvgFixedUDLV2 />}
              name="양단 고정 · 등분포하중 w"
              deflection="w·L⁴ / (384·E·I)"
              moment="w·L² / 12 (단부)"
              common="강구조 빔, 슬라브, 자동차 차체 보강재."
            />
          </div>

          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/40 p-4 my-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">📐 워크드 예제 — 외팔보 + 관 단면</p>
            <p className="text-sm mb-3 text-foreground/85">
              길이 <F>L = 200 mm</F> 외팔보, 끝 하중 <F>F = 500 N</F>, 처짐 한계 <F>δ ≤ 1 mm</F>. 단면은 <b>관</b>(외경 20·내경 16 mm)으로 시작합니다.
            </p>
            <Step n={1} title="단면의 I 계산 (Ch.3)" formula={<>I = π(20⁴ − 16⁴) / 64</>} result={<>≈ <b>4,633 mm⁴</b></>} />
            <Step n={2} title="필요 E·I 계산" formula={<>E·I = F·L³ / (3·δ) = 500 × 200³ / (3 × 1)</>} result={<>= <b>1.333 × 10⁹ N·mm²</b></>} />
            <Step n={3} title="필요 E" formula={<>E = 1.333×10⁹ / 4633</>} result={<>≈ <b>288 GPa</b> — 일반 금속(E ≤ 210)으론 안 됨!</>} />
            <Step n={4} title="단면 키워서 재시도" formula={<>외경 24·내경 20 → I ≈ 8,454 mm⁴</>} result={<>필요 E ≈ <b>158 GPa</b> — 강·티타늄·구리합금 후보</>} note="형상으로 푸는 게 첫 번째 선택" />
            <Step n={5} title="강도 점검 (σ_b = M/Z)" formula={<>M_max = F·L = 10⁵ N·mm, Z ≈ 704 mm³</>} result={<>σ_b ≈ 142 MPa · SF=2 → 필요 σy ≥ <b>284 MPa</b></>} />
            <Step n={6} title="앱에서 후보 보기" result={<><b>Modulus ≥ 158</b>, <b>Yield ≥ 284</b> 두 필터로 산점도 + Compare.</>} />
          </div>

          {/* R66 B — Euler-Bernoulli 유도 + 외부 링크 */}
          <Note tone="why" title="Euler-Bernoulli 보 방정식">
            <p className="leading-relaxed">보 처짐 식 (예: 외팔 F·L³/3EI) 의 유도는 4차 미분방정식에서 나옵니다.</p>
            <p className="mt-1 font-mono text-[13px]">EI · (d⁴y/dx⁴) = w(x)</p>
            <p className="mt-1 text-[12px] leading-relaxed">w(x) = 단위 길이당 분포하중. 경계 조건 (외팔: y(0)=0, y'(0)=0, M(L)=0, V(L)=F) 적분 → 처짐 y(L) 와 모멘트 M(x). 표의 공식들이 모두 이 적분 결과.</p>
            <p className="mt-2 text-[12px] text-muted-foreground">가정: (i) 단면 평면이 굽힘 후에도 평면 유지 · (ii) 굽힘 변형 작음 (y'(x)² ≪ 1) · (iii) 전단 변형 무시. 이 가정 깨지면 (단단보·두꺼운 보) Timoshenko 이론 필요.</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — 보·처짐">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/Euler%E2%80%93Bernoulli_beam_theory">Wikipedia: Euler-Bernoulli beam theory</ExtLink> — 4차 미분방정식 + 경계 조건</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Beam_(structure)">Wikipedia: Beam (structure)</ExtLink> — 모든 표준 하중·지지조건의 처짐·모멘트 표</li>
              <li><ExtLink href="https://www.engineeringtoolbox.com/cantilever-beams-d_1848.html">Engineering Toolbox: Cantilever Beams</ExtLink> — 빠른 참조</li>
              <li><ExtLink href="https://ocw.mit.edu/search/?d=Mechanical%20Engineering&t=Solid%20Mechanics">MIT OCW 2.001 Mechanics & Materials I</ExtLink> — 보·처짐 강의</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Stress_concentration">Wikipedia: Stress concentration</ExtLink> — Kt 정의 + 대표 형상 (hole · fillet · notch) 값표</li>
            </ul>
          </Note>
        </Chapter>

        {/* ── Chapter 8 (구 5): 응용 ───────────────────────────────────── */}
        <Chapter
          n={8}
          id="ch5"
          title="응용 — 비틀림 · 좌굴 · 복합 · 압력"
          learn={[
            '비틀림 응력 τ = T·c/J 와 비틀림각',
            'Euler 좌굴 — 가는 기둥이 σy 넘기 전에 휘어버리는 현상',
            '복합 하중에서 von Mises 등가응력',
            '얇은 압력 용기의 후프·축방향 응력',
          ]}
        >
          <H3>5.1 비틀림 (원형축)</H3>
          <p className="leading-relaxed">토크 <F>T</F> 가 원형 축에 작용할 때 전단응력은 표면(<F>c = D/2</F>)에서 최대입니다.</p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[220px]"><SvgTorsion /></div>
          <ul className="list-disc pl-6 mt-1 space-y-1 text-sm leading-relaxed">
            <li>최대 전단응력: <F>τ_max = T·c / J</F> &nbsp;(원형축은 <F>J = π·D⁴/32</F>)</li>
            <li>비틀림각: <F>φ = T·L / (G·J)</F> &nbsp;(<F>G = E / [2(1+ν)]</F>, 금속은 <F>G ≈ 0.38·E</F>)</li>
            <li>허용 전단응력: 보통 <F>τ_allow ≈ 0.5~0.6 · σy / SF</F></li>
          </ul>
          <Note tone="warn">
            비원형 단면의 <F>J</F> 는 간단한 닫힌식이 없습니다. 직사각형은 <F>J ≈ β · b · h³</F> (β는 h/b에 의존). 개단면(I·L·채널)은 비틀림에 매우 약하므로 비틀림 부품엔 권장하지 않습니다.
          </Note>

          <H3>5.2 좌굴 (Euler 식) — 가는 기둥의 함정</H3>
          <div className="flex items-start gap-4 mt-2">
            <div className="w-48 h-40 bg-muted/30 rounded border border-border/60 flex items-center justify-center p-2 flex-shrink-0"><SvgColumn /></div>
            <div className="text-sm leading-relaxed">
              <p>가늘고 긴 기둥은 σy 를 넘기 <b>전에</b> 옆으로 휘어 무너집니다 (좌굴). 임계하중:</p>
              <p className="font-mono text-[13px] mt-1 bg-muted/40 inline-block px-2 py-1 rounded">P_cr = π² · E · I / L_eff²</p>
              <p className="mt-2"><b>유효길이</b> <F>L_eff = K·L</F> — 단부 조건에 따라:</p>
              <ul className="list-disc pl-5 text-[13px] mt-1">
                <li>핀-핀 (양단 자유 회전): <F>K = 1.0</F></li>
                <li>고정-자유 (외팔): <F>K = 2.0</F></li>
                <li>고정-핀: <F>K ≈ 0.7</F></li>
                <li>고정-고정: <F>K = 0.5</F></li>
              </ul>
            </div>
          </div>
          <Note tone="tip">강도(σy) 와 좌굴 둘 다 점검: <b>가는 부재는 좌굴이 먼저</b>, 굵은 부재는 강도가 먼저.</Note>

          <H3>5.3 복합 응력 (von Mises)</H3>
          <p className="text-sm leading-relaxed">굽힘과 비틀림이 동시에 작용하는 회전축처럼, 축응력 <F>σ_x</F> 와 전단응력 <F>τ</F> 가 같이 있을 때는 등가응력을 σy 와 비교합니다.</p>
          <p className="font-mono text-sm mt-1 bg-muted/40 inline-block px-2 py-1 rounded">σ_eq = √(σ_x² + 3·τ²) ≤ σy / SF</p>
          <p className="text-[12px] mt-1 text-muted-foreground">일반 3축 응력: <F>σ_eq = √[½((σ₁−σ₂)² + (σ₂−σ₃)² + (σ₃−σ₁)²)]</F></p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[240px]"><SvgMohr /></div>
          <p className="text-[12px] text-muted-foreground">응력 요소(좌)의 σ_x·τ 가 작용할 때, 면의 회전에 따른 응력 변화를 <b>Mohr 원</b>(우)으로 시각화합니다. 원의 양 끝이 <b>주응력 σ₁, σ₂</b> 이고 정점이 <b>최대 전단 τ_max</b>.</p>

          <H3>5.4 얇은 압력 용기</H3>
          <p className="text-sm leading-relaxed">반경 <F>r</F>, 두께 <F>t</F>, 내압 <F>p</F> (<F>t ≪ r</F>):</p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[220px]"><SvgPressureVessel /></div>
          <ul className="list-disc pl-6 mt-1 text-sm font-mono">
            <li>원주(후프) σ_h = p·r / t &nbsp;<span className="font-sans text-muted-foreground">— 후프 응력이 축응력의 2배</span></li>
            <li>축방향 σ_a = p·r / (2t)</li>
            <li>구형 용기 σ = p·r / (2t)</li>
          </ul>
          <p className="text-sm mt-1 text-muted-foreground">필요 두께 <F>t ≥ p·r·SF / σy</F>. 코드(ASME 등)를 따르세요. <span className="text-foreground/80">압력 용기에 보통 세로로 갈라지는 이유는 후프 응력이 2배라서</span>.</p>

          {/* R66 B — 좌굴 Johnson formula + 외부 링크 */}
          <Note tone="why" title="Euler 좌굴 vs Johnson 공식 — 짧은 기둥">
            <p className="leading-relaxed">Euler 공식은 <b>가는 기둥 (slender ratio L/k &gt; 100)</b> 만 정확. 짧은 기둥은 σy 에 먼저 도달 → Johnson 공식 사용.</p>
            <p className="mt-1 font-mono text-[12.5px]">P_cr (Johnson) = σy · [1 − σy·(L/k)² / (4π²·E)] · A</p>
            <p className="mt-1 text-[12px]">k = √(I/A) = 회전 반경. (L/k) 가 임계값 = √(2π²·E/σy) 보다 작으면 Johnson, 크면 Euler. 강은 L/k ≈ 100, Al 은 ≈ 70.</p>
          </Note>
          <Note tone="why" title="Stress concentration factor Kt — 노치·구멍">
            <p className="leading-relaxed">실제 단면에 노치·구멍이 있으면 응력 σ_max = K_t · σ_nom.</p>
            <p className="mt-1 font-mono text-[12.5px]">K_t (구멍, 무한판) = 3 (실험·이론 일치) · K_t (fillet radius r/h=0.1) ≈ 2.5 · K_t (sharp corner) → ∞</p>
            <p className="mt-1 text-[12px]">피로 노치 인자 K_f = 1 + q·(K_t − 1) — q는 재료 민감도 (강 ≈ 0.9, Al ≈ 0.6, cast iron ≈ 0).</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — 비틀림·좌굴·파괴·압력">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/Torsion_(mechanics)">Wikipedia: Torsion</ExtLink> — TL/GJ 와 비틀림 응력</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Buckling">Wikipedia: Buckling</ExtLink> — Euler · Johnson formulas + K factor</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Von_Mises_yield_criterion">Wikipedia: von Mises yield criterion</ExtLink></li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Mohr%27s_circle">Wikipedia: Mohr's circle</ExtLink></li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Stress_concentration">Wikipedia: Stress concentration</ExtLink> — Kt · Kf 표</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Pressure_vessel">Wikipedia: Pressure vessel</ExtLink> — ASME B&PV 코드 개요</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Fracture_mechanics">Wikipedia: Fracture mechanics</ExtLink> — KIC, K = σ·√(π·a)</li>
              <li><ExtLink href="https://www.doitpoms.ac.uk/tlplib/index.php">DoITPoMS: Mechanical testing</ExtLink> — interactive 시험 시뮬레이션</li>
            </ul>
          </Note>
        </Chapter>

        {/* ── R65 J — Chapter 9 (신규): 흔한 설계 실수 10선 ─────────────── */}
        <Chapter
          n={9}
          id="ch11"
          title="흔한 설계 실수 10선 — 실패에서 배우기"
          learn={[
            '강도·인성 trade-off 무시, 표면 거칠기 영향, 노치 효과 같은 빈번한 실수',
            '갈바닉 부식·H 취화 등 환경 간섭 무시 사례',
            'AM 빌드 방향·용접성·표준 적합성 누락',
          ]}
        >
          <p className="leading-relaxed">교과서가 잘 가르치지 않는 실패 패턴들. 모두 실제 산업에서 보고된 사례 기반입니다.</p>
          <div className="space-y-3 mt-3">
            {[
              { n: 1, tag: '강도 vs 인성', t: 'σy 만 보고 인성 무시', d: 'tool steel (D2 · M2 · H13) 의 σy 는 1500 MPa+ 지만 KIC 가 15–25 MPa√m 로 매우 낮음. 결함·노치 있으면 변형 없이 파단. 정적 응력만 보고 선택 → 진동·낙하·열충격에서 깨짐.', fix: '취성 재료는 KIC + 사용 환경의 미세 균열 가능성 검토. Ti / Inconel 대체 검토.' },
              { n: 2, tag: 'AM 이방성', t: 'AM Ti6Al4V 의 Z 방향 피로 무시', d: 'LPBF 빌드 Z 방향 피로가 XY 의 30~70% 수준. 회전축·날개 부품을 Z 방향으로 빌드 후 시제품 시험에서 조기 파괴.', fix: '응력이 한 방향이면 그 방향을 XY 평면에 배치. HIP 처리로 기공·이방성 동시 감소. AM 챕터 참고.' },
              { n: 3, tag: '표면 거칠기', t: '표면 처리 무시 → 피로 50% ↓', d: 'AM as-built 표면 Ra ~25 μm 또는 절삭 직후 Ra ~3 μm 도 피로 강도 감소. 노치 효과 (Kf ≈ 1.5~3) 로 σf 가 1/2 까지.', fix: '회전·반복 하중 부품은 polishing (Ra ≤ 0.8 μm) 또는 shot peening (잔류 압축응력 부여) 필수.' },
              { n: 4, tag: '갈바닉 부식', t: 'Al + Steel 직접 접촉', d: 'Al 과 Steel 의 갈바닉 전위차로 Al 쪽 급속 부식. 해양·습한 환경에서 6 개월 내 파공 사례.', fix: '같은 family 통일 또는 절연 와셔 (PTFE · 나일론) 삽입. 캐소드 보호 (희생 양극).' },
              { n: 5, tag: '노치 효과', t: 'Sharp corner / 구멍 모서리 stress concentration 무시', d: 'σ_max = Kt · σ_nom (Kt 보통 2~4). SF 가 sufficient 라도 노치 부근만 응력 집중 → 균열 시작.', fix: '구멍·모서리에 fillet radius 적용 (r ≥ 1/4 board thickness). FEA 로 stress concentration 확인.' },
              { n: 6, tag: '용접성', t: 'AM AlSi10Mg 부품 용접', d: 'AlSi10Mg 는 SiAl 공정 사출 미세조직 — 용접 시 균열 (porosity, crack). Vendor datasheet 의 용접성 정보 누락.', fix: '용접 필요 시 wrought AA 6061 또는 AA 5052 로 대체. AM 부품은 mechanical fastening (bolt) 또는 friction stir welding 검토.' },
              { n: 7, tag: 'H 취화', t: '고강도 강 (AISI 4340 · maraging) + 수소 환경', d: 'σy > 1000 MPa 고강도 강은 H₂ 가스 / 산세 / 도금 (Cd · Zn) 에서 수소 흡수 → 지연 파괴. 우주·압력용기 인명 사고 보고.', fix: 'σy ≤ 900 MPa 강 또는 AISI 316L / Inconel 625. 도금 후 baking (200 °C / 24 h) 으로 수소 제거.' },
              { n: 8, tag: '저온 취성', t: '탄소강을 LNG (-162 °C) 환경에 사용', d: 'BCC 결정 (탄소강 · AISI 4140) 은 DBTT (Ductile-Brittle Transition Temperature) 이하에서 갑자기 취성화. -50 °C 이하에서 충격 인성 1/10 까지.', fix: 'FCC 결정 (AISI 316L · AISI 304L · 9% Ni 강 · Al · Cu) 사용. Charpy V-notch 시험으로 사용 온도 -10 °C 이하에서도 27 J 이상 확인.' },
              { n: 9, tag: '열팽창 mismatch', t: '이종 재료 조합 정밀 부품에서 CTE 무시', d: 'Al (CTE 23) + Steel (12) 가 같은 부품에 있으면 100 °C 온도 변화에서 mismatch 0.1% — 정밀 광학·전자에서 치명적.', fix: 'Invar (CTE 1.3) · Kovar (5.5) · CFRP (≈0) 같은 저 CTE 재료. 또는 Si 같은 substrate 와 매칭.' },
              { n: 10, tag: '데이터 confidence 무시', t: 'class · derived 라벨을 측정값처럼 설계에 사용', d: 'KIC 가 class 라벨 = family 평균 추정. 동일 alloy 의 다른 heat 에서 ±30% 변동. fatigue derived 도 동일.', fix: '인증·시제품 단계에서 측정값 또는 vendor datasheet 측정 항목 확보. detail 의 confidence 라벨 항상 확인. Ch.13 datasheet 섹션 참고.' },
            ].map((m) => (
              <div key={m.n} className="rounded border border-rose-200 bg-rose-50/50 p-3">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[11px] font-bold text-rose-700">#{m.n}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 font-mono">{m.tag}</span>
                  <span className="text-sm font-semibold text-foreground">{m.t}</span>
                </div>
                <p className="text-[12.5px] text-foreground/85 leading-relaxed"><b className="text-rose-700">상황:</b> {m.d}</p>
                <p className="text-[12.5px] text-foreground/85 leading-relaxed mt-1"><b className="text-emerald-700">처방:</b> {m.fix}</p>
              </div>
            ))}
          </div>
        </Chapter>

        {/* ── Chapter 10 (구 8): AM 특화 주의사항 ─────────────────────────── */}
        <Chapter
          n={10}
          id="ch9"
          title="AM (적층제조) 특화 주의사항"
          learn={[
            '같은 합금이라도 빌드 방향 (XY vs Z) 으로 σy·연신·피로가 ~10–30% 차이',
            'HIP·Stress relief·Solution-aging 후처리 표준 워크플로우',
            '분말 spec (입도·O 함량), 표면거칠기, 잔류응력 — 제품 신뢰성에 직결',
            'AM 공정별 (LPBF · EBM · DED · Binder Jet) 강점·약점·표준 용도',
          ]}
        >
          <p className="leading-relaxed">전통 단조·압연재는 microstructure 가 균질하고 데이터 신뢰도가 높지만, AM 합금은 <b>빌드 방향·분말·후처리</b> 3 변수로 인해 같은 alloy 라도 결과가 크게 다릅니다. 이 챕터는 AM 합금을 선택·검증할 때 반드시 체크할 사항을 정리합니다.</p>

          <H3>8.1 빌드 방향 이방성 (XY vs Z)</H3>
          <p className="text-sm leading-relaxed">LPBF·EBM 부품은 적층 방향 (보통 Z, "build direction") 과 적층면 (XY) 사이에 미세조직 차이가 큽니다. 일반적으로:</p>
          {/* R68 — AM 빌드 방향 이방성 도식 */}
          <div className="rounded-lg border border-border bg-card p-3 my-3">
            <svg viewBox="0 0 480 220" className="w-full h-auto">
              {/* Build plate */}
              <rect x="20" y="170" width="200" height="10" fill="oklch(0.6 0.04 250)" />
              <text className="svg-text-bg-sm" x="120" y="200" textAnchor="middle" fontSize="10" fill="oklch(0.4 0.04 250)">빌드 플레이트</text>
              {/* Layers stacked */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <rect key={i} x="80" y={150 - i * 16} width="80" height="14" fill={i % 2 === 0 ? 'oklch(0.85 0.05 90)' : 'oklch(0.82 0.05 90)'} stroke="oklch(0.5 0.05 90)" strokeWidth="0.5" />
              ))}
              {/* Z arrow */}
              <line x1="170" y1="155" x2="170" y2="25" stroke="oklch(0.55 0.18 30)" strokeWidth="2" markerEnd="url(#amArrZ)" />
              <text className="svg-text-bg-sm" x="178" y="100" fontSize="11" fill="oklch(0.4 0.18 30)" fontWeight="bold">Z (빌드 방향)</text>
              <text className="svg-text-bg-sm" x="178" y="115" fontSize="9" fill="oklch(0.4 0.18 30)" fontStyle="italic">σy ↓5-15% · σf ↓30-70%</text>
              {/* XY arrow */}
              <line x1="60" y1="80" x2="80" y2="80" stroke="oklch(0.55 0.12 220)" strokeWidth="2" markerEnd="url(#amArrXY)" />
              <text className="svg-text-bg-sm" x="30" y="78" fontSize="11" fill="oklch(0.4 0.12 220)" fontWeight="bold">XY</text>
              <text className="svg-text-bg-sm" x="20" y="92" fontSize="9" fill="oklch(0.4 0.12 220)">(적층면, 우수)</text>
              {/* Microstructure: column grains right side */}
              <g stroke="oklch(0.3 0.04 250)" strokeWidth="0.7" fill="none">
                <rect x="280" y="40" width="160" height="140" fill="oklch(0.95 0.005 250)" stroke="oklch(0.5 0.04 250)" />
                {[0, 1, 2, 3, 4].map((i) => (
                  <line key={i} x1={290 + i * 30} y1="45" x2={290 + i * 30} y2="175" />
                ))}
                {/* Horizontal layer interfaces */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line key={i} x1="285" y1={60 + i * 25} x2="435" y2={60 + i * 25} strokeDasharray="2 2" opacity="0.5" />
                ))}
              </g>
              <text className="svg-text-bg-sm" x="360" y="32" textAnchor="middle" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">미세조직 (단면)</text>
              <text className="svg-text-bg-sm" x="360" y="200" textAnchor="middle" fontSize="9" fill="oklch(0.5 0.04 250)">column grain ⇂ + 층 경계 ━</text>
              <defs>
                <marker id="amArrZ" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.18 30)" /></marker>
                <marker id="amArrXY" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="oklch(0.55 0.12 220)" /></marker>
              </defs>
              <text className="svg-text-bg-sm" x="240" y="15" textAnchor="middle" fontSize="11" fill="oklch(0.3 0.04 250)" fontWeight="bold">AM 빌드 방향 이방성</text>
            </svg>
          </div>
          <ul className="list-disc pl-6 mt-1 text-sm leading-relaxed">
            <li><b>인장강도 (σy·UTS)</b>: Z 방향이 XY 보다 5~15% 낮음 (column grain 경계가 응력과 수직)</li>
            <li><b>연신율 El.</b>: Z 방향이 XY 의 50~80% (취성 ↑)</li>
            <li><b>피로 강도 σf</b>: Z 방향이 XY 의 30~70%, surface roughness + Z-pore 영향</li>
            <li><b>탄성계수 E</b>: 거의 등방 (1~3% 차이)</li>
          </ul>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[280px]"><SvgAMAnisotropy /></div>
          <Note tone="tip">
            <b>실무 팁.</b> 응력이 한 방향이면 XY 평면을 그 방향으로 배치하도록 빌드 방향 설계. 회전 부품·복잡 형상은 <b>HIP 처리로 이방성·기공 동시 감소</b>가 표준.
          </Note>

          <H3>8.2 후처리 표준 워크플로우</H3>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[260px]"><SvgHIPEffect /></div>
          {/* R68 — 후처리 7단계 flow 도식 */}
          <div className="rounded-lg border border-border bg-card p-3 my-3 overflow-x-auto">
            <svg viewBox="0 0 980 180" className="min-w-[900px] h-auto">
              {[
                { label: 'AM 빌드', sub: 'as-built', color: 'oklch(0.88 0.06 90)' },
                { label: '응력 완화', sub: 'Stress relief', color: 'oklch(0.88 0.08 30)' },
                { label: '분리·서포트 제거', sub: 'wire cut', color: 'oklch(0.88 0.05 250)' },
                { label: 'HIP', sub: '기공 제거', color: 'oklch(0.88 0.10 220)' },
                { label: '시효·SA', sub: 'Solution+Aging', color: 'oklch(0.88 0.08 110)' },
                { label: '기계가공', sub: 'finishing', color: 'oklch(0.88 0.05 250)' },
                { label: 'CT·NDT', sub: '검사', color: 'oklch(0.88 0.14 145)' },
              ].map((s, i) => (
                <g key={i}>
                  <rect x={10 + i * 138} y="48" width="124" height="84" rx="8" fill={s.color} stroke="oklch(0.35 0.06 250)" strokeWidth="1.5" />
                  <text x={72 + i * 138} y="76" textAnchor="middle" fontSize="14" fontWeight="800" fill="oklch(0.20 0.04 250)">{i + 1}. {s.label}</text>
                  <text x={72 + i * 138} y="95" textAnchor="middle" fontSize="11" fontWeight="600" fill="oklch(0.30 0.04 250)">{s.sub}</text>
                  <text x={72 + i * 138} y="118" textAnchor="middle" fontSize="10" fill="oklch(0.40 0.04 250)" fontStyle="italic" fontFamily="monospace">
                    {['as-built', '650-815°C', '와이어컷', '1100°C/100MPa', 'alloy 별', 'Ra 0.5-3μm', 'porosity 0.5%'][i]}
                  </text>
                  {i < 6 && <line x1={134 + i * 138} y1="88" x2={148 + i * 138} y2="88" stroke="oklch(0.55 0.14 220)" strokeWidth="2.5" markerEnd="url(#wfArr)" />}
                </g>
              ))}
              <defs><marker id="wfArr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="oklch(0.55 0.14 220)" /></marker></defs>
              <text x="490" y="26" textAnchor="middle" fontSize="15" fill="oklch(0.20 0.04 250)" fontWeight="800">AM 부품 후처리 워크플로우 (7단계)</text>
              <text x="490" y="158" textAnchor="middle" fontSize="12" fill="oklch(0.40 0.04 250)" fontStyle="italic">vendor·alloy·용도에 따라 일부 단계 생략 가능 — 항공·의료는 모든 단계 표준</text>
            </svg>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">단계</th><th className="p-2 font-semibold">처리</th><th className="p-2 font-semibold">목적</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2">①</td><td className="p-2 font-medium">Stress relief (650–815 °C · 1–2 h · 노 냉각)</td><td className="p-2">건축 잔류응력 완화. 빌드플레이트 분리 전 필수.</td></tr>
                <tr><td className="p-2">②</td><td className="p-2 font-medium">서포트 제거 · 빌드플레이트 와이어컷</td><td className="p-2">기계적 분리. 표면 거칠기 ~30 µm Ra 잔류.</td></tr>
                <tr><td className="p-2">③</td><td className="p-2 font-medium">HIP (Hot Isostatic Press, 1100–1200 °C / 100–200 MPa / 2–4 h)</td><td className="p-2">미세 기공 압축 소거 → 피로 ↑ · 연신 ↑ · σy 약간 ↓. 항공·의료 표준.</td></tr>
                <tr><td className="p-2">④</td><td className="p-2 font-medium">Solution + Aging (alloy-specific)</td><td className="p-2">Ti-6Al-4V STA · Inconel 718 STA·DSA · 17-4 PH H900/H1025 · AlSi10Mg T6</td></tr>
                <tr><td className="p-2">⑤</td><td className="p-2 font-medium">기계가공 · 연마 (Ra 0.5–3 µm)</td><td className="p-2">치수 정밀 · 피로 강도 ↑ (표면 노치 효과 ↓)</td></tr>
                <tr><td className="p-2">⑥</td><td className="p-2 font-medium">표면 처리 (PVD·CVD·micro arc oxidation·anodize)</td><td className="p-2">내마모·내식·외관. 의료·항공 표준.</td></tr>
                <tr><td className="p-2">⑦</td><td className="p-2 font-medium">검사 (CT 스캔 · 침투탐상 PT · 형광탐상 FPI)</td><td className="p-2">내부 기공·균열 · 표면 결함. 항공·우주 표준.</td></tr>
              </tbody>
            </table>
          </div>

          <H3>8.3 AM 공정별 비교</H3>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">공정</th><th className="p-2 font-semibold">에너지 / 빌드 방식</th><th className="p-2 font-semibold">표준 합금</th><th className="p-2 font-semibold">강점</th><th className="p-2 font-semibold">한계</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12px]">
                <tr><td className="p-2 font-medium">LPBF (SLM, DMLS)</td><td className="p-2">고출력 레이저 · 분말 베드</td><td className="p-2">Ti-6Al-4V · Inconel 718/625 · AlSi10Mg · AISI 316L · 17-4 PH · CoCrMo</td><td className="p-2">정밀도 ±50 µm · 미세조직 미세 · 내부 채널 가능</td><td className="p-2">잔류응력 高 · Z 이방성 · 표면 거칠기 高 · 분말 회수 까다로움</td></tr>
                <tr><td className="p-2 font-medium">EBM (Electron Beam Melting)</td><td className="p-2">전자빔 · 진공 분말 베드</td><td className="p-2">Ti-6Al-4V · CoCr · 일부 Ni 초합금</td><td className="p-2">잔류응력 低 (700 °C 고온 빌드) · 내부 응력 없음</td><td className="p-2">정밀도 ±200 µm · 진공 환경 必 · 분말 입도 大 (45–100 µm)</td></tr>
                <tr><td className="p-2 font-medium">DED (LMD · DMD)</td><td className="p-2">레이저·분말 노즐 동시 · 자유 빌드</td><td className="p-2">대부분 금속</td><td className="p-2">대형 부품 · 다재료 · 수리·복원 가능</td><td className="p-2">정밀도 ±500 µm · 후가공 필수 · 표면 매우 거침</td></tr>
                <tr><td className="p-2 font-medium">Binder Jetting</td><td className="p-2">바인더 분사 + 후소결</td><td className="p-2">AISI 316L · AISI 304L · Bronze · Inconel 625</td><td className="p-2">생산성 高 · 잔류응력 0 · 형상 자유도 高</td><td className="p-2">소결 수축 ~3% · 밀도 95–98% (HIP 필수) · 합금 제한적</td></tr>
              </tbody>
            </table>
          </div>

          <H3>8.4 분말 spec · 추적성</H3>
          <ul className="list-disc pl-6 mt-1 text-sm leading-relaxed">
            <li><b>입도 (PSD)</b>: LPBF 15–45 µm · EBM 45–100 µm · Binder Jet 5–25 µm. 입도 변동 → 적층 밀도·표면 거칠기 차이.</li>
            <li><b>산소 함량 (O)</b>: Ti 합금 &lt;0.13 wt% (Grade 23 ELI), Inconel 718 &lt;0.005 wt%. 산소 ↑ → 취성 ↑.</li>
            <li><b>유동성·구형도</b>: 분말 재사용 시 위성 입자·oxidation 증가 → 빌드 결함 ↑. <b>vendor lot · re-use cycle 추적</b> 필수.</li>
            <li><b>표준</b>: ASTM F3049 (Ti) · F3056 (Ni) · F3055 (Stainless) · F3184 (Co alloys) — 데이터시트와 함께 lot certificate 확보.</li>
          </ul>

          <Note tone="warn" title="AM 데이터 한계">
            <p>이 앱의 AM 합금 데이터는 vendor datasheet (EOS · Renishaw · Sandvik · SLM Solutions · GE Additive 등) 기반이며, <b>특정 build orientation · 후처리 condition</b> 의 측정값입니다. 다른 vendor·다른 machine 으로 같은 합금을 빌드하면 결과가 ±20% 변동 가능합니다.</p>
            <p className="mt-2"><b>실무</b>: 항공·의료·압력용기 등 인증 부품은 자체 시편으로 σy·UTS·El·피로·CT scan 검증 후 사용. 이 앱은 후보 좁히기 도구입니다.</p>
          </Note>

          {/* R66 B — Larson-Miller (creep) + Arrhenius (oxidation) + 외부 링크 */}
          <H3>8.5 고온 부품 수명 예측 — Larson-Miller parameter</H3>
          <Note tone="why" title="Larson-Miller parameter (LMP) — creep rupture 예측">
            <p className="leading-relaxed">고온 부품 (Inconel 718 750°C, P91 600°C 보일러) 의 수명은 응력·온도·시간 3 변수. Larson-Miller 가 이를 하나의 parameter 로 통합.</p>
            <p className="mt-1 font-mono text-[13px]">LMP = T · (C + log₁₀(t_r))</p>
            <p className="mt-1 text-[12px]">T = 절대온도 (K) · t_r = rupture 시간 (h) · C = 상수 (강 보통 20, Ni 합금 25). 같은 응력의 LMP 가 일정 = master curve. 새 조건 (T', t') 에서 σ 예측 가능.</p>
            <p className="mt-2 text-[12px] text-muted-foreground">예: P91 의 σ=100 MPa creep rupture 데이터 from ECCC datasheet — LMP ≈ 22,500 (with C=20). 600°C(873K) → t_r = 10^(22500/873 − 20) ≈ 6×10⁵ h. 650°C(923K) → 10^(22500/923 − 20) ≈ 2.4×10⁴ h. 50°C 증가 = 약 20~25배 단축 (지수적 — 일정 배수 아님).</p>
          </Note>
          <Note tone="why" title="Arrhenius equation — 산화·확산 속도">
            <p className="font-mono text-[13px]">k(T) = A · exp(−Q/RT)</p>
            <p className="mt-1 text-[12px]">활성화 에너지 Q (oxidation, diffusion, creep). 온도 ↑ → exponential 가속. 100°C 증가 = 보통 2–10 배 속도.</p>
          </Note>
          <Note tone="info" title="📚 더 학습 — AM·고온·creep">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><ExtLink href="https://en.wikipedia.org/wiki/3D_printing">Wikipedia: 3D printing</ExtLink> — AM 공정 광범위</li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Larson%E2%80%93Miller_relation">Wikipedia: Larson-Miller relation</ExtLink></li>
              <li><ExtLink href="https://en.wikipedia.org/wiki/Creep_(deformation)">Wikipedia: Creep (deformation)</ExtLink></li>
              <li><ExtLink href="https://www.eccc-creep.com/">ECCC (European Creep Collaborative Committee)</ExtLink> — creep datasheet 무료 다운로드</li>
              <li><ExtLink href="https://www.americanelements.com/3d-printing-materials.html">American Elements: 3D Printing Materials</ExtLink> — 분말 spec</li>
              <li><ExtLink href="https://www.astm.org/COMMITTEE/F42.htm">ASTM F42 Additive Manufacturing Technologies</ExtLink> — AM 표준 위원회</li>
              <li><ExtLink href="https://www.specialmetals.com/documents/technical-bulletins/">Special Metals Tech Bulletins</ExtLink> — Inconel · Incoloy datasheet</li>
            </ul>
          </Note>
        </Chapter>

        {/* ── R65 F+K+E — Chapter 11 (신규): 인증·가공·시제품 시험 ───────── */}
        <Chapter
          n={11}
          id="ch12"
          title="인증·가공·시제품 시험 — 데이터에서 실물까지"
          learn={[
            '산업·인증 (AS9100·ISO 13485·ASME P-No.·NACE 등) 적용 가능 합금 매핑',
            '같은 합금의 wrought·cast·forged·AM 가공 가능성 비교',
            '후보 선정 후 시제품 시험·결함 분석·인증까지의 표준 흐름',
          ]}
        >
          <p className="leading-relaxed">앱이 후보를 좁힌 후, 실제 양산·인증까지 가는 세 단계 (인증 적합성 → 가공 가능성 → 시제품 검증) 의 핵심.</p>

          <H3>11.1 산업·인증 매핑 (Compliance)</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[20%]">산업·인증</th><th className="p-2 font-semibold w-[18%]">규격</th><th className="p-2 font-semibold">적합 합금 (예시)</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">항공기 구조</td><td className="p-2">AS9100 · NADCAP · FAA 14 CFR 25</td><td className="p-2">Ti-6Al-4V (AMS 4928) · Inconel 718 (AMS 5663) · AA 7075-T7 · AA 2024-T3 · AISI 4340 · 17-4 PH</td></tr>
                <tr><td className="p-2 font-medium">의료 임플란트</td><td className="p-2">ISO 13485 · ISO 10993 · FDA 510(k)</td><td className="p-2">Ti-6Al-4V ELI (Grade 23) · CoCrMo (ASTM F75) · AISI 316L (ASTM F138) · CP-Ti Grade 4</td></tr>
                <tr><td className="p-2 font-medium">압력 용기</td><td className="p-2">ASME B&PV Sec.VIII · ASME P-No. matching</td><td className="p-2">SA-516 Gr70 (보일러) · SA-240 Type 304/AISI 316L (화학) · SA-335 P91 (발전소) · Inconel 625 (H₂)</td></tr>
                <tr><td className="p-2 font-medium">석유·가스 (sour)</td><td className="p-2">NACE MR0175 / ISO 15156</td><td className="p-2">Inconel 625 · Hastelloy C-276 · AISI 316L (제한적) · Duplex 2205 (제한적)</td></tr>
                <tr><td className="p-2 font-medium">원자력 1st loop</td><td className="p-2">ASME Sec.III · ASME NQA-1</td><td className="p-2">SA-508 Cl.3 · Inconel 600/690 · Zircaloy-4 · AISI 316L</td></tr>
                <tr><td className="p-2 font-medium">건축 구조강</td><td className="p-2">AISC · EUROCODE 3 · KBC 2022</td><td className="p-2">A36 · A572 Gr50 · A992 · A500 Gr B</td></tr>
                <tr><td className="p-2 font-medium">자동차 (EU)</td><td className="p-2">RoHS · REACH · ELV</td><td className="p-2">대부분 합금 — Pb·Cd·Cr⁶⁺ 제한. 일반 stainless · Al · 강 OK.</td></tr>
                <tr><td className="p-2 font-medium">식품·음료</td><td className="p-2">FDA 21 CFR 177 · NSF/ANSI 51</td><td className="p-2">AISI 316L · AISI 304L · 2205 · Hastelloy C-22 (acid)</td></tr>
                <tr><td className="p-2 font-medium">군용</td><td className="p-2">MIL-DTL · MIL-STD</td><td className="p-2">MIL-S-46100 (장갑) · MIL-T-9046 (Ti) · MIL-A-46100 (Al)</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">앱의 detail 패널에 <b>RoHS / SVHC 자동 검출</b> + 사례 챕터의 families 절에 industry 적용 예시 표시. 정확한 인증은 vendor lot certificate 와 함께 확인 必.</p>

          <H3>11.2 가공·제조 가능성 (Manufacturability)</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[20%]">공정</th><th className="p-2 font-semibold w-[12%]">평가 지표</th><th className="p-2 font-semibold">고려사항</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">절삭 (machining)</td><td className="p-2 font-mono">Machinability rating (AA 1100 = 100%)</td><td className="p-2">AA 6061 = 70% · AISI 1018 강 = 70% · AISI 4140 = 60% · 304 SS = 40% · Ti-6Al-4V = 22% · Inconel 718 = 12% · CoCrMo = 10%. 가공시간 = (100/MR) × 기본. 절삭유·공구 마모도 비례.</td></tr>
                <tr><td className="p-2 font-medium">용접 (welding)</td><td className="p-2 font-mono">CET (Carbon Equivalent) · Schaeffler diagram</td><td className="p-2">CET &lt; 0.4 = pre-heat 불요. CET 0.4–0.6 = 150–200 °C pre-heat. CET &gt; 0.6 = 위험 (예: AISI 4340 · maraging). Stainless 는 Schaeffler diagram 으로 Cr/Ni eq 평가.</td></tr>
                <tr><td className="p-2 font-medium">성형 (forming)</td><td className="p-2 font-mono">N-value (변형 경화 지수) · r-value</td><td className="p-2">Deep drawing 은 n &gt; 0.2, r &gt; 1.4 권장. 304 SS / 6022-T4 Al 우수. AA 7075 / 마라징 어려움.</td></tr>
                <tr><td className="p-2 font-medium">단조 (forging)</td><td className="p-2 font-mono">Forgeability rating</td><td className="p-2">Al · AISI 1018 강 우수. Ti · Ni superalloy 는 좁은 온도창 (Ti-6Al-4V 950–1000 °C). 정밀 단조 (closed die) 는 부품마다 다이 비용 ↑.</td></tr>
                <tr><td className="p-2 font-medium">주조 (casting)</td><td className="p-2 font-mono">유동성 · 수축률 · 결함률</td><td className="p-2">Investment casting (Ti · CoCrMo · 304SS · Inconel 718) — 정밀 ±0.5%. Die casting (Al · Zn · Mg). Sand casting (탄소강 · Al · 청동).</td></tr>
                <tr><td className="p-2 font-medium">AM (LPBF · EBM · DED)</td><td className="p-2 font-mono">분말 spec · 빌드 방향 · 후처리</td><td className="p-2">표준화된 alloy 만 (Ti-6Al-4V · Inconel 718 · 17-4 PH · AISI 316L · AlSi10Mg · CoCrMo). HIP 후처리로 ±20% 성능 변동. <a href="#ch9" className="text-accent hover:underline">Ch.10 AM 특화</a> 참고.</td></tr>
                <tr><td className="p-2 font-medium">표면처리</td><td className="p-2 font-mono">밀착성 · 두께 · 환경 적합성</td><td className="p-2">Al 양극산화 (anodize) · 강 도금 (Zn · Cd · Cr) · Ti TiN/DLC · stainless passivation. 의료 임플란트는 micro arc oxidation 또는 plasma electrolytic oxidation.</td></tr>
              </tbody>
            </table>
          </div>

          <H3>11.3 시제품 시험 → 결과 해석</H3>
          <p className="text-sm leading-relaxed">앱에서 좁힌 후보 (보통 1–3개) 의 실제 시제품 시험은 데이터시트와 비교해 차이를 해석하는 단계.</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[18%]">시험</th><th className="p-2 font-semibold w-[20%]">표준</th><th className="p-2 font-semibold">목적·해석</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">인장 (Tensile)</td><td className="p-2">ASTM E8/E8M · ISO 6892</td><td className="p-2">σy · UTS · El 측정. 시편 5 개 이상으로 평균 ± 표준편차. 데이터시트 minimum 의 ±5% 이내면 정상.</td></tr>
                <tr><td className="p-2 font-medium">압축 (Compression)</td><td className="p-2">ASTM E9</td><td className="p-2">취성 재료 · cellular structure · AM lattice 평가.</td></tr>
                <tr><td className="p-2 font-medium">충격 (Charpy)</td><td className="p-2">ASTM E23 · ISO 148-1</td><td className="p-2">노치 인성 (J). 저온 (-40 °C) 시험으로 DBTT 평가. 27 J 이상 = ductile.</td></tr>
                <tr><td className="p-2 font-medium">경도 (Hardness)</td><td className="p-2">ASTM E384 (HV) · E18 (HRC) · E10 (HB)</td><td className="p-2">10 회 측정 후 표준편차. 경화층 깊이 (case depth) 도 마이크로 비커스로.</td></tr>
                <tr><td className="p-2 font-medium">피로 (Fatigue)</td><td className="p-2">ASTM E466 · ISO 12107</td><td className="p-2">S-N 곡선 (10⁴–10⁷ cycles). 시편 10–20 개. Weibull 분포로 B10 (90% survival) 값 추출.</td></tr>
                <tr><td className="p-2 font-medium">파괴인성 (KIC)</td><td className="p-2">ASTM E399 · E1820 (J-int)</td><td className="p-2">두께 충분해야 plane strain. AM 부품은 빌드 방향별 측정 必.</td></tr>
                <tr><td className="p-2 font-medium">CT 스캔 (NDT)</td><td className="p-2">ASTM E1441 · E1570</td><td className="p-2">내부 기공·균열·LOF. AM 부품 100% 또는 sampling.</td></tr>
                <tr><td className="p-2 font-medium">FPI · PT (표면 NDT)</td><td className="p-2">ASTM E1417 · E165</td><td className="p-2">표면 균열 검출. 모든 critical 부품.</td></tr>
                <tr><td className="p-2 font-medium">금속현미경</td><td className="p-2">ASTM E407 (etch)</td><td className="p-2">미세조직 (grain size · phase) 확인. AM 부품 빌드 방향 비교.</td></tr>
                <tr><td className="p-2 font-medium">파괴 분석 (Fractography)</td><td className="p-2">SEM 관찰</td><td className="p-2">파면 분석 — ductile (dimple), brittle (cleavage), fatigue (striations). 실패 원인 진단의 핵심.</td></tr>
              </tbody>
            </table>
          </div>
          <Note tone="tip" title="결과가 데이터시트와 다르면">
            <ol className="list-decimal pl-5 space-y-1 mt-1">
              <li><b>시험 조건 확인</b>: 시편 크기, 변형 속도, 온도, 표면 마감 — 표준 어겼는지.</li>
              <li><b>제조 조건 확인</b>: heat treatment, build direction (AM), batch, vendor lot.</li>
              <li><b>데이터시트 base 확인</b>: typical 또는 A-basis (99%) 또는 B-basis (90%). Confidence 라벨 도 확인.</li>
              <li><b>샘플 수 확인</b>: n=3 측정으로 ±10% 변동은 정상. n &gt; 10 이어야 통계적 신뢰.</li>
              <li><b>vendor 확인</b>: 같은 alloy 도 vendor 간 ±5–20% 차이 일반.</li>
            </ol>
          </Note>
        </Chapter>

        {/* ── R65 I — Chapter 12 (신규): 산업 case study 5선 ──────────── */}
        <Chapter
          n={12}
          id="ch14"
          title="산업 case study 5선 — 추상에서 구체로"
          learn={[
            '실제 산업의 재료 선택 사례 — 어떤 요구가 어떤 합금으로 매핑됐는지',
            '재료 변천사 — 같은 부품이 시대·기술 변화로 어떻게 진화했는지',
            '엔지니어링 의사결정의 trade-off 실제 예',
          ]}
        >
          <p className="leading-relaxed">교과서·앱의 추상적 이론을 구체화하는 데 가장 좋은 방법은 실제 산업 사례 분석. 5 개의 대표 사례.</p>

          <div className="space-y-4 mt-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">① 자동차 — F1 엔진 블록 재료 변천사</p>
              <p className="text-sm leading-relaxed"><b className="text-foreground">변천:</b> Cast iron (1950s) → AISI 4340 alloy steel (1970s) → A356-T6 cast aluminum (1990s) → Honeycomb composite + AA 7075 (2010s).</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인:</b> 출력/무게 (engine specific power) = 200 → 1500 hp/L. 시린더 압력 = 100 → 240 bar. 회전수 = 6,000 → 18,000 rpm. 매번 더 가벼우면서도 더 강하고 더 thermally stable 한 재료가 필요.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">앱에서 재현:</b> 사례 "구조 브래킷" + Index = E^½/ρ + Yield ≥ 400 + Process = LPBF → Al 7075 · Ti-6Al-4V · Scalmalloy 후보.</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">② 우주 — JWST 망원경 mirror</p>
              <p className="text-sm leading-relaxed"><b className="text-foreground">선택:</b> Beryllium (구조) + Au coating (반사) + Si 광학 sensor support.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인:</b> 극저온 (-220 °C) 치수 안정 — Be 의 핵심은 <b>높은 비강성(E/ρ ≈ 강의 6배)</b> + 극저온에서 안정적·균일한 CTE + 높은 열전도(빠른 열평형). (CTE 절대값 자체는 ~11 µm/m·K 로 강과 비슷 — 작은 게 강점은 아님). mirror 1.32 m 가 6.5 m 까지 가능. 단점: 발암성 분말, 가공 어려움, 비용 $$$ (kg 당 $100k+). 다른 선택지 (Zerodur glass, ULE) 는 우주 환경 thermal cycling 에서 취성.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">앱에서 재현:</b> 사례 "정밀 마운트" + Modulus ≥ 280 GPa + 낮은 밀도(비강성 E/ρ) → Be 후보 (단, 안전성·비용으로 Invar / CFRP 가 일반적).</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">③ 로켓 — SpaceX Raptor engine 연소실</p>
              <p className="text-sm leading-relaxed"><b className="text-foreground">선택:</b> Inconel 718 (외벽) + 자체 개발 <b>SX-300 (Cu-based AM 합금)</b> (regenerative cooling 채널) + Cu coating.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인:</b> 챔버 압력 = 300 bar, 온도 3500 °C (가스), 벽면 600 °C (cooling 으로). 열전도도 (Cu) + 강도 (Inconel) 의 trade-off → 2 재료 동시 사용. SX-300 은 Cu (k=400 W/m·K) + Cr/Nb 강화 (σy ~600 MPa) — AM 으로 cooling 채널 직접 빌드.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">앱에서 재현:</b> Inconel 617/625 (사례 "고온 부품") + Cu (사례 "전기 전도체") 비교. AM 후처리는 <a href="#ch9" className="text-accent hover:underline">Ch.10</a> 참고.</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">④ 자동차 — Tesla Model Y giga press</p>
              <p className="text-sm leading-relaxed"><b className="text-foreground">선택:</b> 자체 개발 Al 합금 (Si 7% + Mg 0.4%, A356 변형). 6,000 ton casting press 로 후방 body 단일 부품 (70 → 1 부품).</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인:</b> 70 개 부품 용접 → 1 개 die cast 로 무게 -10%, 비용 -40%, 조립시간 -90%. 단점: cast Al 의 σy ~150 MPa (낮음) → 두께로 보상. 단일 부품 → 수리 불가 (보험·정비 비용 ↑).</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">앱에서 재현:</b> 사례 "저원가 양산" + Al 합금 + Process = Cast → A356 · AlSi10Mg 후보.</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">⑤ 의료 — DJI 드론 arm + 인공 관절</p>
              <p className="text-sm leading-relaxed"><b className="text-foreground">드론 arm 선택:</b> Carbon fiber + 7075-T6 Al hub. <b>인공 고관절 선택:</b> Ti-6Al-4V ELI (stem) + CoCrMo (ball) + UHMWPE (cup).</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인 (드론):</b> 무게 / 강성 / 가격 — CFRP 가 best E/ρ 지만 가공·연결 어려움 → Al hub 로 보강. 무게 200g 차이가 비행시간 5분 결정.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">의사결정 요인 (관절):</b> 생체적합 + 피로 (10⁹ cycles) + 마모 (10⁻⁸ mm³/N·m). Ti 는 σy/ρ best 지만 적층 표면 마모 ↑ → CoCr ball + UHMWPE cup 의 마찰 대응. 평생 (20–30 년) 무파손이 목표.</p>
              <p className="text-sm leading-relaxed mt-1"><b className="text-foreground">앱에서 재현:</b> 사례 "의료 임플란트" + Index = σf/ρ + Compare 의 Radar 로 ρ·σy·피로·내식 비교.</p>
            </div>
          </div>

          <Note tone="tip" title="사례 학습의 정리">
            <p>실제 선택은 <b>한 합금이 모든 요구를 만족</b>하기보다 <b>여러 합금을 조합</b> (Raptor · 인공관절) 하거나 <b>가공·후처리로 보강</b> (giga press) 하는 경우가 많습니다. 앱의 Compare 패널이 trade-off 시각화에 가장 유용 — 1순위 후보 1개가 아니라 1–3 위 후보 + 보완 재료까지 함께 검토.</p>
          </Note>
        </Chapter>

        {/* ── Chapter 13 (구 9): 데이터 해석 + 참고 ─────────────────────────────── */}
        <Chapter
          n={13}
          id="ch8"
          title="데이터 해석·datasheet 읽기·출처·단위·FAQ"
          learn={[
            '값은 "대표값 + 범위"이며 조건에 따라 달라진다',
            'confidence 4 라벨 (measured / handbook / class / derived) 의미',
            'datasheet typical · minimum · A-basis · B-basis 의 차이',
            '데이터 출처 (ASM · MMPDS · vendor) 어디서 어디까지',
            'SI ↔ Imperial 빠른 변환 + 첫 사용자 FAQ',
          ]}
        >
          <ul className="list-disc pl-6 mt-1 space-y-1.5 leading-relaxed text-sm">
            <li>값은 <b>대표값(typical) + min–max 범위</b>입니다. 같은 합금도 공정·열처리·빌드 방향에 따라 크게 달라집니다. 상세 패널의 <b>Process 탭</b>에서 condition 옆에 한 줄 효과 설명을 함께 표시합니다 (H900 = "최대 σy", HIP = "기공 제거·피로 ↑", T6 = "Al peak hardness" 등).</li>
            <li><F>est.</F> 라벨은 confidence 가 <F>handbook</F>(표준 데이터시트), <F>class</F>(클래스 대표 추정), <F>derived</F>(다른 물성에서 유도) 인 경우. 설계 확정 전 출처를 직접 확인하세요. 출처 탭에 <b>"Fatigue fallback"</b> · <b>"KIC fallback"</b> 같은 라벨로 출처 종류를 명시했습니다.</li>
            <li><b>AM(적층제조)은 이방성</b>이 있습니다(XY vs Z). 방향·후처리(HIP/열처리)에 따른 차이를 반드시 고려하세요. 자세한 내용은 <a href="#ch9" className="text-accent hover:underline">AM 특화 챕터</a>.</li>
            <li>최종 판단은 항상 <b>출처(데이터시트·규격)</b>로 검증하고, 안전계수·인증 요구를 적용하세요. 이 앱은 <b>후보를 좁히는 도구</b>이지 설계 승인 근거가 아닙니다.</li>
          </ul>

          {/* R64 — Confidence 4 라벨 풀이 표 */}
          <H3>Confidence 라벨 — 4가지</H3>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[16%]">라벨</th><th className="p-2 font-semibold">의미</th><th className="p-2 font-semibold w-[35%]">설계 적합성</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-mono text-foreground/70">n=N (measured)</td><td className="p-2">N 개 실측 데이터점의 평균 ± 범위. n 클수록 신뢰 ↑.</td><td className="p-2 text-emerald-700">✓ 인증·시제품 설계에 직접 사용 가능</td></tr>
                <tr><td className="p-2 font-mono text-sky-600">handbook</td><td className="p-2">ASM Handbook · MMPDS · vendor datasheet 의 표준 typical 값.</td><td className="p-2 text-emerald-700">✓ 예비 설계·후보 좁히기에 적합</td></tr>
                <tr><td className="p-2 font-mono text-amber-600">class</td><td className="p-2">같은 family/subcategory 의 평균값으로 추정 (family KIC fallback 등).</td><td className="p-2 text-amber-700">⚠ Ashby 차트·후보 선정 용. 설계값으로는 부적합 — 출처 확인 必</td></tr>
                <tr><td className="p-2 font-mono text-rose-500">≈UTS (derived)</td><td className="p-2">다른 물성에서 유도 (Fatigue σ_f ≈ 0.45·σy 등 Shigley 근사).</td><td className="p-2 text-rose-700">⚠ 정성적 비교만. 정량 설계는 측정값으로 대체 必</td></tr>
              </tbody>
            </table>
          </div>

          {/* R64 — 데이터 출처 (Provenance) */}
          <H3>데이터 출처 (Provenance)</H3>
          <p className="text-sm leading-relaxed">이 앱의 1,000 금속 + 133 폴리머 + 39 세라믹 + 34 복합재 (총 1,206) 데이터는 다음 출처에서 수집·종합되었습니다.</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[28%]">출처</th><th className="p-2 font-semibold w-[20%]">유형</th><th className="p-2 font-semibold">담당 범위</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-medium">ASM Handbook Vol. 1·2·4</td><td className="p-2">학술 표준</td><td className="p-2">강·합금강·Tool Steel·SS·Ni·Co·Cu·Ti·Al·Mg 의 typical 물성 + 열처리</td></tr>
                <tr><td className="p-2 font-medium">MMPDS-2018 (구 MIL-HDBK-5J)</td><td className="p-2">항공 표준</td><td className="p-2">aerospace alloy 의 design allowable (A/B basis) · 온도별 σy/UTS</td></tr>
                <tr><td className="p-2 font-medium">Aluminum Association Handbook</td><td className="p-2">산업 표준</td><td className="p-2">AA designation 2xxx·5xxx·6xxx·7xxx 의 temper 별 mechanical / thermal</td></tr>
                <tr><td className="p-2 font-medium">Special Metals (SMC-018·029·045·046·093)</td><td className="p-2">vendor</td><td className="p-2">Inconel 600·617·625·690·718·X-750·Incoloy 800H·Monel 400 등 datasheet</td></tr>
                <tr><td className="p-2 font-medium">Haynes International (H-3000·3008·3068)</td><td className="p-2">vendor</td><td className="p-2">Haynes 230·X·282·25 (L605) 등 고온합금</td></tr>
                <tr><td className="p-2 font-medium">Carpenter Technology Custom</td><td className="p-2">vendor</td><td className="p-2">17-4 PH·15-5 PH·Custom 465·A286·Maraging 등 PH 합금</td></tr>
                <tr><td className="p-2 font-medium">EOS · Renishaw · SLM Solutions · GE Additive</td><td className="p-2">vendor (AM)</td><td className="p-2">LPBF·EBM 합금의 build orientation·후처리별 측정값</td></tr>
                <tr><td className="p-2 font-medium">Shigley's Mechanical Engineering Design</td><td className="p-2">교과서</td><td className="p-2">Fatigue endurance limit σ_f ≈ k · σy 근사 (derived 출처)</td></tr>
                <tr><td className="p-2 font-medium">ASME B&PV Section II·D · ASTM A335</td><td className="p-2">규격</td><td className="p-2">압력용기·발전소 강재 (Grade 91/P91) 의 elevated-temp design</td></tr>
                <tr><td className="p-2 font-medium">ECCC datasheets</td><td className="p-2">creep DB</td><td className="p-2">P91·9Cr 합금 등의 10⁵ h creep rupture</td></tr>
                <tr><td className="p-2 font-medium">LME spot prices (2026 Q1) + vendor 가격 책자</td><td className="p-2">시장 데이터</td><td className="p-2">원자재 단가 (price_per_kg). 분기별 갱신.</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">각 합금의 상세 패널 <b>Sources 탭</b>에 해당 alloy 가 어느 출처에서 왔는지, verified URL 이 등록되어 있으면 직접 방문 가능.</p>

          {/* R64 — 단위 변환 표 */}
          <H3>SI ↔ Imperial 빠른 변환</H3>
          <p className="text-sm leading-relaxed">우측 상단 <b>SI / Imperial</b> 토글로 표시 단위가 즉시 전환됩니다. 다른 자료와 교차 검증 시 참고:</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">SI</th><th className="p-2 font-semibold">변환</th><th className="p-2 font-semibold">Imperial</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px] font-mono">
                <tr><td className="p-2">1 MPa</td><td className="p-2 text-muted-foreground">×0.14504</td><td className="p-2">≈ 0.145 ksi</td></tr>
                <tr><td className="p-2">1 GPa</td><td className="p-2 text-muted-foreground">×145.04</td><td className="p-2">≈ 145 ksi · 0.145 Msi</td></tr>
                <tr><td className="p-2">σy 250 MPa</td><td className="p-2 text-muted-foreground">×0.145</td><td className="p-2">≈ 36.3 ksi</td></tr>
                <tr><td className="p-2">E 200 GPa</td><td className="p-2 text-muted-foreground">×0.145</td><td className="p-2">≈ 29 Msi</td></tr>
                <tr><td className="p-2">1 °C</td><td className="p-2 text-muted-foreground">×1.8 + 32</td><td className="p-2">°F</td></tr>
                <tr><td className="p-2">600 °C</td><td className="p-2 text-muted-foreground">×1.8 + 32</td><td className="p-2">≈ 1112 °F</td></tr>
                <tr><td className="p-2">1 g/cm³</td><td className="p-2 text-muted-foreground">×0.03613</td><td className="p-2">≈ 0.0361 lb/in³</td></tr>
                <tr><td className="p-2">ρ 7.85 g/cm³ (강)</td><td className="p-2 text-muted-foreground">×0.0361</td><td className="p-2">≈ 0.283 lb/in³</td></tr>
                <tr><td className="p-2">1 W/m·K</td><td className="p-2 text-muted-foreground">×0.578</td><td className="p-2">≈ 0.578 BTU/(h·ft·°F)</td></tr>
                <tr><td className="p-2">1 J/kg·K</td><td className="p-2 text-muted-foreground">×0.000239</td><td className="p-2">≈ 0.239×10⁻³ BTU/(lb·°F)</td></tr>
                <tr><td className="p-2">1 MPa·√m (KIC)</td><td className="p-2 text-muted-foreground">×0.91</td><td className="p-2">≈ 0.91 ksi·√in</td></tr>
              </tbody>
            </table>
          </div>

          {/* R64 — FAQ */}
          <H3>자주 묻는 질문 (FAQ)</H3>
          <div className="space-y-3 mt-2">
            {[
              { q: '같은 합금이 여러 row 로 나오는 이유?', a: '열처리 condition (Annealed / Solution / Aged / Q+T / H900 등) 별로 별도 row 입니다. 같은 alloy 라도 condition 마다 σy 가 2배 이상 차이날 수 있어 분리해 표시합니다.' },
              { q: 'class 라벨이 붙은 값을 설계에 그대로 쓸 수 있나요?', a: '아니오. class 는 family 평균에서 유도한 추정값입니다. 후보 좁히기·Ashby 차트 용도로 쓰고, 정량 설계는 출처 데이터시트의 측정값을 직접 사용하세요.' },
              { q: 'AM 합금 데이터는 어느 빌드 방향 기준?', a: 'vendor datasheet 기준입니다. 대부분 XY (적층면 수직) 표준이며, Z 방향은 ~10–30% 낮은 값이 일반적. 자세한 영향은 Chapter 8 (AM 특화) 참고.' },
              { q: 'Fatigue strength 가 derived 인 합금은 신뢰할만한가?', a: 'Shigley 근사 (σ_f ≈ k · σy, k = 0.38–0.52) 로 채워진 값입니다. 정성적 비교에는 OK 이나 실 설계는 S-N 곡선이나 endurance limit 측정값으로 대체하세요.' },
              { q: 'Compare 패널에서 Radar 차트는 왜 21개 이상일 때 비활성?', a: '오버레이가 너무 많으면 시각 비교가 어렵습니다. 20개 이하로 좁히거나, 표·CSV 로 비교하세요.' },
              { q: 'KIC 값이 없는 합금이 많은 이유?', a: '실측 데이터가 39 alloys (3.8%) 뿐이었습니다. Sprint 4 C2 에서 family fallback (ASM Vol. 1·2 + MMPDS) 로 814 alloys 까지 채워 82.2% 커버. fallback 표시는 confidence "class".' },
              { q: '단위·언어를 어디서 바꾸나요?', a: '우측 상단 헤더의 <b>한 / EN</b> 토글 (언어), <b>SI / Imperial</b> 토글 (단위). 즉시 전환되며 localStorage 에 저장.' },
              { q: '필터를 적용했는데 결과가 0개 입니다.', a: '좌측 사이드바 상단의 <b>Reset</b> 또는 헤더의 <b>필터 초기화</b>. preset 으로 진입한 경우 banner 의 ↻ Reset 버튼.' },
              { q: '결과를 다시 보고 싶을 때 (북마크)?', a: 'URL 이 자동으로 필터·preset·index 를 인코딩합니다. 브라우저 즐겨찾기에 추가하거나 link 공유하면 같은 상태로 재현됩니다.' },
              { q: '내가 자주 쓰는 합금 set 을 저장?', a: '우측 상단 <b>Collections</b>. 이름을 부여하면 현재 선택 + 필터 snapshot 이 localStorage 에 저장됩니다. 6개 이상이면 검색·정렬 cycle 도 자동 노출.' },
            ].map((f, i) => (
              <details key={i} className="rounded border border-border bg-card p-2.5">
                <summary className="cursor-pointer text-sm font-semibold text-foreground/85">{f.q}</summary>
                <p className="text-[12.5px] text-foreground/80 mt-1 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">막힘이 있으면 우측 상단의 <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">?</kbd> 버튼 (또는 <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">?</kbd> 키) 으로 온보딩 투어 다시 보기.</p>

          {/* R65 C — datasheet literacy. typical / minimum / A-basis / B-basis 의 의미. */}
          <H3>Datasheet 읽기 — 같은 합금이 다르게 보이는 이유</H3>
          <p className="text-sm leading-relaxed">같은 Ti-6Al-4V 라도 datasheet 마다 σy 가 800·830·850 MPa 로 다르게 표시되는 이유 — <b>어떤 통계 base 를 사용했나</b>가 핵심.</p>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold w-[16%]">통계 base</th><th className="p-2 font-semibold w-[14%]">신뢰 수준</th><th className="p-2 font-semibold">의미·사용</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top text-[12.5px]">
                <tr><td className="p-2 font-mono text-foreground/70">typical</td><td className="p-2">~50%</td><td className="p-2">측정값의 평균. vendor 마케팅·교과서·이 앱 default. 약 절반의 시편이 이 값 이상.</td></tr>
                <tr><td className="p-2 font-mono text-sky-600">minimum</td><td className="p-2">~99%</td><td className="p-2">spec 의 최소 보장값. 99% 시편이 이 값 이상. vendor 보증 가능. 일반 양산용.</td></tr>
                <tr><td className="p-2 font-mono text-amber-600">A-basis (S-basis)</td><td className="p-2">99% / 95% 신뢰</td><td className="p-2">MMPDS / MIL-HDBK-5J 표준. 99% 시편이 이 값 이상 — 95% 신뢰. <b>항공 design allowable</b>. typical 대비 80–90% 수준.</td></tr>
                <tr><td className="p-2 font-mono text-amber-600">B-basis</td><td className="p-2">90% / 95% 신뢰</td><td className="p-2">MMPDS 표준. 90% 시편이 이 값 이상 — 95% 신뢰. <b>항공 일반·redundant 부품</b>. typical 의 85–95%.</td></tr>
                <tr><td className="p-2 font-mono text-rose-500">guaranteed minimum</td><td className="p-2">100% (contractual)</td><td className="p-2">계약 기반 — vendor 가 lot certificate 로 보증. typical 의 70–85%. 가장 보수적.</td></tr>
              </tbody>
            </table>
          </div>
          <Note tone="tip" title="실무 의사결정">
            <p><b>학생·시제품:</b> typical 사용 (이 앱 default).<br/>
              <b>양산:</b> spec minimum 또는 vendor lot certificate 사용.<br/>
              <b>항공·인증:</b> MMPDS A-basis 또는 B-basis 의무.<br/>
              <b>중요</b>: 이 앱의 confidence 라벨 (measured / handbook / class / derived) 도 함께 확인. class·derived 라벨 = typical 도 아닌 추정값.</p>
          </Note>

          <H3>참고문헌</H3>
          <ul className="list-disc pl-6 mt-1 space-y-1 leading-relaxed text-sm">
            <li>M. F. Ashby, <i>Materials Selection in Mechanical Design</i>, Butterworth-Heinemann — 재료 선택 방법·성능지수의 표준 교과서.</li>
            <li>Ansys Granta EduPack, <i>Materials Selection</i> &amp; <i>Performance Indices</i> 교육 자료 — 성능지수 목록과 차트 활용.</li>
            <li>일반 재료역학(응력 <F>σ=F/A</F>, 보 처짐, 안전계수) — 표준 기계공학 교과서 (Hibbeler·Beer 등).</li>
            <li>MMPDS-2018 (구 MIL-HDBK-5J), Battelle Memorial Institute — A-basis / B-basis 통계 방법론의 표준.</li>
            <li>ASM Handbook Vol. 19, <i>Fatigue and Fracture</i> — 피로·파괴 시험·해석 표준.</li>
            <li>ISO 6892 / ASTM E8 — 인장 시험 표준 방법.</li>
            <li>Shigley's <i>Mechanical Engineering Design</i>, 10th ed. McGraw-Hill — Basquin · Goodman · SF 등 표준.</li>
            <li>Roark's <i>Formulas for Stress and Strain</i>, 9th ed. — 보·기둥·압력용기 등 표준 공식 모음.</li>
            <li>R. C. Reed, <i>The Superalloys: Fundamentals and Applications</i> — Ni·Co superalloy 의 표준 reference.</li>
            <li>I. Gibson, D. Rosen, B. Stucker, <i>Additive Manufacturing Technologies</i>, Springer — AM 공정 표준 교과서.</li>
          </ul>

          {/* R66 B — 외부 학습 자료 종합 카드 */}
          <H3>📚 외부 학습 자료 — 무료 / 인터랙티브</H3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="rounded border border-border bg-card p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">강의·교과서 (무료)</p>
              <ul className="list-disc pl-5 space-y-1 text-[13px]">
                <li><ExtLink href="https://ocw.mit.edu/search/?d=Materials%20Science%20and%20Engineering&s=department_course_numbers.sort_coursenum">MIT OCW 3.094</ExtLink> — 재료의 인간 경험·역사</li>
                <li><ExtLink href="https://ocw.mit.edu/courses/3-11-mechanics-of-materials-fall-1999/">MIT OCW 3.11</ExtLink> — Mechanics of Materials</li>
                <li><ExtLink href="https://ocw.mit.edu/search/?d=Mechanical%20Engineering&t=Solid%20Mechanics">MIT OCW 2.001</ExtLink> — Mechanics & Materials I</li>
                <li><ExtLink href="https://www.doitpoms.ac.uk/">DoITPoMS (Cambridge)</ExtLink> — 재료과학 인터랙티브 학습</li>
                <li><ExtLink href="https://nptel.ac.in/courses/112106227">NPTEL: Materials Selection</ExtLink> — India 무료 공학 강의</li>
              </ul>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">데이터·계산 도구</p>
              <ul className="list-disc pl-5 space-y-1 text-[13px]">
                <li><ExtLink href="https://www.engineeringtoolbox.com/">Engineering Toolbox</ExtLink> — 빠른 공식·표·계산기</li>
                <li><ExtLink href="https://en.wikipedia.org/wiki/Fatigue_(material)">Wikipedia: Fatigue (material)</ExtLink> — S-N curve · Goodman · Miner's rule 개요</li>
                <li><ExtLink href="https://www.matweb.com/">MatWeb</ExtLink> — 재료 데이터시트 검색 (한계 free)</li>
                <li><ExtLink href="https://materialsproject.org/">Materials Project</ExtLink> — 첫째원리 계산 결과 무료 DB (학술)</li>
                <li><ExtLink href="https://www.nist.gov/srd">NIST SRD</ExtLink> — Standard Reference Data</li>
                <li><ExtLink href="https://www.eccc-creep.com/">ECCC</ExtLink> — Creep rupture datasheet 무료</li>
              </ul>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">규격·표준 (open access)</p>
              <ul className="list-disc pl-5 space-y-1 text-[13px]">
                <li><ExtLink href="https://www.astm.org/">ASTM International</ExtLink> — 시험 표준 (E8 · E23 · E466 · E399)</li>
                <li><ExtLink href="https://www.iso.org/standards.html">ISO</ExtLink> — 6892 (인장) · 14801 (임플란트 피로)</li>
                <li><ExtLink href="https://www.asme.org/codes-standards">ASME B&PV Code</ExtLink> — 압력용기·발전소</li>
                <li><ExtLink href="https://www.aluminum.org/standards">Aluminum Association</ExtLink> — Al designation</li>
                <li><ExtLink href="https://www.iss.it/">IISI / ISO TC 17 Steel</ExtLink></li>
              </ul>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5">Vendor datasheet</p>
              <ul className="list-disc pl-5 space-y-1 text-[13px]">
                <li><ExtLink href="https://www.specialmetals.com/documents/technical-bulletins/">Special Metals (Inconel/Incoloy)</ExtLink></li>
                <li><ExtLink href="https://haynesintl.com/alloys/">Haynes International (Haynes/Hastelloy)</ExtLink></li>
                <li><ExtLink href="https://www.carpentertechnology.com/">Carpenter Technology (PH/maraging)</ExtLink></li>
                <li><ExtLink href="https://www.eos.info/en/3d-printing-materials">EOS (LPBF 분말 spec)</ExtLink></li>
                <li><ExtLink href="https://www.renishaw.com/en/metal-3d-printing-materials--32084">Renishaw (AM 분말)</ExtLink></li>
                <li><ExtLink href="https://www.alcoa.com/global/en/products/aerospace/aerospace-resources">Alcoa Aerospace (Al alloys)</ExtLink></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-4 border-t border-border">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline underline-offset-2">
              <ArrowLeft className="w-4 h-4" /> 탐색기로 돌아가 바로 적용해 보기
            </Link>
          </div>
        </Chapter>

        {/* ── Chapter 14 (신규 R107): 재료 family 기본론 — data/general-knowledge/ 9 markdown 요약 ─ */}
        <Chapter
          n={14}
          id="ch15"
          title="재료 family 기본론 (Steel · Al · Ti · Ni · Cu + MMPDS basis + KS grades)"
          learn={[
            '강(Steel) — AISI/SAE 4-digit numbering, 4단계 열처리, Stainless 5 family',
            '알루미늄 — Wrought 4-digit + Temper code (F/O/H/T/W), Aging(시효) 석출상',
            '타이타늄 — β-transus, α/β/α+β 5 family, MA/BA/STA 모드',
            '니켈 슈퍼합금 — γ/γ\'/γ" 강화, TCP phase 회피, coating',
            '구리 — UNS·JIS·KS 매핑, temper code, 부식 환경 분류',
            'MMPDS 통계적 기준 — A-Basis (T99) · B-Basis (T90) · S-Basis · Typical',
            '한국 KS 강종 — Hyundai Steel + POSCO 카탈로그 정리',
          ]}
        >
          <Note tone="tip" title="이 챕터의 출처">
            <p>본 chapter 는 <b>1차 자료</b> 기반: ASM Metals Handbook Desk Edition 2nd (1998) · MMPDS-08 (April 2013) · 풍산 Copper Alloy Products 2025 · 현대제철 종합 카탈로그 2025 · POSCO product handbook. 자세한 원본은 본 저장소의 <code className="bg-muted px-1 rounded text-[12px]">data/general-knowledge/</code> 디렉토리 (9 markdown 파일). 여기서는 핵심만 요약.</p>
          </Note>

          {/* 14.1 — Steel + Stainless */}
          <H3>14.1 Steel + Stainless (탄소강·합금강·스테인리스) — ASM Vol.1·2</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>AISI/SAE 4-digit 명명법</b> — 첫 2자리 = 합금 계열 (10xx=carbon, 41xx=Cr-Mo, 43xx=Ni-Cr-Mo, 86xx=Ni-Cr-Mo), 뒤 2자리 = 탄소량 × 100 (예: AISI 1045 = 0.45%C, AISI 4140 = Cr-Mo + 0.40%C).</li>
            <li><b>4단계 열처리</b> = Annealing (전체 풀림) → Normalizing (공냉 결정립 균질) → Quenching (급랭 Martensite) → Tempering (변태 응력 완화). <F>TTT/CCT/Jominy</F> 곡선으로 경화능 (hardenability) 예측.</li>
            <li><b>Stainless 5 family</b>: ① Austenitic (AISI 304/316, FCC, 비자성, 인성 ↑) ② Ferritic (AISI 430, BCC, Mg/Cr 자성, 비싼 Ni 회피) ③ Martensitic (AISI 410/420, Q+T, 칼날) ④ Duplex (2205, α+γ 혼합, 강도+부식) ⑤ PH (17-4PH H900, 석출 경화).</li>
            <li><b>부식 메커니즘</b> 5: passivation (Cr₂O₃ 막) · pitting (Cl⁻ 침공) · sensitization (450-850°C, Cr 결정립계 carbide) · SCC (응력+환경) · galvanic (이종금속).</li>
            <li><b>경도 변환</b>: HRC ≈ HV/10 (대략, 글로서리와 통일 — HV 300≈HRC 30, HV 500≈HRC 49, HV 600≈HRC 55), HB ≈ HV × 0.95 (단, 700 HV 초과 시 HRC 표만 사용). 정확값은 ASTM E140 표 (비선형).</li>
            <li><b>한국·일본·EU 매핑</b>: SUS304 (JIS) = STS304 (KS) = AISI 304 = EN 1.4301. SCM440 (JIS/KS) = AISI 4140.</li>
            <li className="text-muted-foreground">출처: ASM Desk Edition Section "Carbon and Alloy Steels" + "Stainless Steels" + ASTM E140 + KS D 3705/3753.</li>
          </ul>

          {/* 14.2 — Aluminum */}
          <H3>14.2 Aluminum (Wrought + Cast) — ASM Vol.2 · MMPDS Ch.3</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>Wrought 4-digit designation</b>: 1xxx (≥99.0% Al) · 2xxx (Al-Cu, AA 2024 항공) · 3xxx (Al-Mn, AA 3003 캔) · 4xxx (Al-Si, 용접 wire) · 5xxx (Al-Mg, AA 5083 해양) · 6xxx (Al-Mg-Si, AA 6061 범용·압출) · 7xxx (Al-Zn-Mg, AA 7075 항공) · 8xxx (Al-Li, 2090/2195 우주).</li>
            <li><b>Temper code</b>: F (제조 그대로) · O (annealed) · H (cold-worked, H12 = 1/4 hard) · T (heat-treated, T6 = solution + artificial aging peak, T7 = overaged for SCC) · W (solution unstable).</li>
            <li><b>Aging 석출상</b>: 2xxx → θ' (Al₂Cu); 6xxx → β' (Mg₂Si); 7xxx → η' (MgZn₂); 8xxx Al-Li → T1 (Al₂CuLi) + δ' (Al₃Li).</li>
            <li><b>SCC 회피</b>: 7xxx → T7 (overaged); 2xxx → Alclad (pure Al 표면 layer); 5xxx → ≤200°C (β phase 회피).</li>
            <li><b>Cl⁻ 환경 추천</b>: AA 5083/5086 (해양 hull) · AA 5052 (자동차 외부) · AA 6063 (건축 외장). 회피: AA 2024 (T3 시 SCC 위험), AA 7075 (T6).</li>
            <li className="text-muted-foreground">출처: ASM Desk Edition Section "Aluminum and Aluminum Alloys" + MMPDS-08 Chapter 3 intro + Aluminum Association datasheets.</li>
          </ul>

          {/* 14.3 — Titanium */}
          <H3>14.3 Titanium (CP · α · β · α+β) — ASM Vol.2 (Rodney R. Boyer)</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>β-transus</b> = α(HCP) → β(BCC) 변태 온도. Ti-6Al-4V β-transus ≈ 995°C. 이 위 = β anneal, 아래 = α+β mill anneal.</li>
            <li><b>5 family</b>: ① α (CP-Ti Grades 1-4, 무열처리 가능) ② near-α (Ti-6242, 고온 ≤500°C) ③ α+β (Ti-6Al-4V 표준, ≤315°C) ④ near-β (Ti-10-2-3) ⑤ β (Ti-15-3, 냉간 성형 가능).</li>
            <li><b>열처리 modes</b>: MA (Mill Annealed, default) · BA (β-Annealed, 우수한 인성) · STA (Solution + Aged, 최대 강도, β-transus 아래에서 solution) · Duplex annealed (모두 안정성).</li>
            <li><b>한계</b>: 산화 (≥600°C 빠른 산화, 600°C 초과 시 Al/Sn 보호 코팅) · 갈링 (Ti vs Ti 또는 Ti vs 스테인리스 — DLC 또는 nitride 코팅).</li>
            <li><b>표준</b>: CP Grades 1-12 (ASTM B265 sheet) · ASTM F-series 의료 (F67 CP, F136 Ti-6Al-4V ELI) · AMS 항공.</li>
            <li className="text-muted-foreground">출처: ASM Desk Edition "Titanium and Titanium Alloys" (Boyer 1998) + ASTM F67/F136 + AMS 4928/4965.</li>
          </ul>

          {/* 14.4 — Ni superalloy */}
          <H3>14.4 Nickel superalloy (γ + γ' + γ") — ASM Vol.6 (Matt Donachie)</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>3 결정구조</b>: γ (FCC matrix, disordered Ni-Cr) · γ' (Ni₃(Al,Ti) L1₂, ordered, 강화 핵심) · γ" (Ni₃Nb DO₂₂ tetragonal, Inconel 718 특화).</li>
            <li><b>강화 메커니즘</b> = APB energy (γ' 통과 dislocation cost) + coherency strain (격자 mismatch). γ' 부피분율 50-65% 가 peak strength (e.g. CMSX-4).</li>
            <li><b>TCP phase 회피</b>: σ · μ · Laves phase (Ni-Nb-Ti) — 장시간 사용 시 carbide → TCP. 화학 조성 균형 (Md 또는 PHACOMP 계산).</li>
            <li><b>Family</b>: ① Solution-strengthened (Hastelloy X, 625) ② γ' wrought (Waspaloy, U720) ③ γ' cast CC/DS/SX (René N5, CMSX-4) ④ γ" (718, 706) ⑤ ODS (MA754, Y₂O₃ 분산).</li>
            <li><b>표면 강화</b>: aluminide (Al diffusion, 1100°C) + MCrAlY (Co-Cr-Al-Y bond coat) + TBC (YSZ top coat, 1500°C 보호).</li>
            <li><b>AM 표준 powder</b>: Inconel 718 (LPBF 가장 흔함), 625 (절삭), Hastelloy X (LPBF + HIP). EOS · Renishaw · SLM Solutions 표준.</li>
            <li className="text-muted-foreground">출처: ASM Desk Edition "Superalloys" (Donachie 1998) + Special Metals tech bulletins + Renishaw/EOS AM datasheets.</li>
          </ul>

          {/* 14.5 — Copper */}
          <H3>14.5 Copper alloys — 풍산 Copper Alloy Products 2025 · ASM Vol.2</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>UNS C-series</b>: C1xxxx (high-Cu OFC/DLP/DHP) · C2xxxx (brass Cu-Zn) · C3xxxx (leaded brass) · C5xxxx (phosphor bronze Cu-Sn) · C6xxxx (Al/Si/Mn bronze) · C7xxxx (nickel silver Cu-Ni-Zn) · C9xxxx (cast).</li>
            <li><b>Temper code</b>: O (annealed soft) · 1/4H · 1/2H · 3/4H · H (full hard) · EH (extra hard) · Spring temper. Cold rolling 이 주된 강화 메커니즘.</li>
            <li><b>부식 환경</b>: 우수 → atmosphere (Cu, brass), 담수 (90/10 brass), 해수 (Al-bronze C6300, Cu-Ni 70/30 C71500). 회피 → ammonia (Cu, brass SCC), H₂S (Cu sulfide), 강산.</li>
            <li><b>피로 ≈ σ_UTS/3</b> rule (annealed) ~ σ_UTS/2 (cold-worked H).</li>
            <li><b>8 fabrication property rating</b>: cold formability · hot formability · forgeability · machinability · soldering · brazing · oxyacetylene · GMAW (vendor catalog 표).</li>
            <li><b>한국·일본·미국·EN 매핑</b>: C10200 = OFC = JIS C1020 = KS C1020 = Cu-OFE. C26800 = JIS C2680 = KS C2680 = CuZn35.</li>
            <li className="text-muted-foreground">출처: 풍산 카탈로그 2025 + ASM Vol.2 "Copper Alloys" + KS D 5101/5102/5506.</li>
          </ul>

          {/* 14.6 — Korean KS grades */}
          <H3>14.6 한국 KS 강종 (Hyundai Steel + POSCO catalog 2025)</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>SS/SM (일반·용접 구조)</b>: KS D 3503 SS (구 SS400 → 신 SS275) · KS D 3515 SM490A/B/C (Charpy 27J @ 없음/0°C/-20°C). 한국 다리·선박·LPG 탱크 표준. EN S275JR/S355J0/J2 등가.</li>
            <li><b>SHN (내진 H형강)</b> KS D 3866: SHN275 / 355 / 420 / 460 — <F>항복비 (YR=YS/UTS) ≤ 85%</F> 강제 → 항복 후 가공경화 여유, 내진 ductility 핵심. 한국 고층·내진 건축.</li>
            <li><b>SD (철근)</b> KS D 3504: SD400/500/600/700 (기본), SD-W (weldable, CE ≤ 0.50%), SD-S (seismic, YR ≤ 1.25). ASTM A615 G60/G75 / A706 등가.</li>
            <li><b>SAPH (자동차 hot rolled)</b> JIS G 3113: 차체 frame · chassis. SAPH440 = 현대·기아 OEM 표준.</li>
            <li><b>SPFH/SPFC (자동차 고장력)</b>: SPFH590 (hot rolled) / SPFC780 (cold rolled). DP980 · TRIP780 · TWIP1180 — AHSS 영역. 한국 차체 무게 감량 + 충돌 안전.</li>
            <li><b>SGCC/SGC (도금)</b> KS D 3506: Z140-Z275 (140-275 g/m² 양면 합). 건축 외장 · 가전 · 자동차 underbody. EN DX51D+Z / HX300LAD+Z 등가.</li>
            <li><b>STK/STKM (강관)</b>: KS D 3566 (일반구조 STK490) · KS D 3517 (기계구조 STKM13B, cold drawn). EN 10210 / SAE 1018-1022 등가.</li>
            <li><b>SPA-H (내후성)</b> KS D 3542: ASTM A242 / Cor-Ten A 등가. Cu+Cr+Ni → 대기 부식 4-8× ↓. 인천대교 · 세종 다리.</li>
            <li><b>POSCO 특수강</b>: PosMAC (Zn-Mg-Al, ZM coated steel) · TWIP1180 / DP980 (AHSS) · 9% Ni (LNG -162°C, ASTM A553 Type I) · CGO 0.27 (Goss texture electrical steel).</li>
            <li className="text-muted-foreground">출처: Hyundai Steel Product Guide 2025 (PART 1+2) + POSCO product handbook + KS D 3503/3504/3506/3515/3517/3542/3566/3866 + JIS G 3106/3113/3134.</li>
          </ul>

          {/* 14.7 — MMPDS statistical basis */}
          <H3>14.7 MMPDS 통계적 기준 (A-Basis / B-Basis / S-Basis / Typical)</H3>
          <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
            <li><b>A-Basis</b> (T99) = 99% of the population exceeds, with 95% confidence (Lower Tolerance Bound). 항공기 critical 부품 (single load path).</li>
            <li><b>B-Basis</b> (T90) = 90% of the population exceeds, with 95% confidence. 항공기 redundant load path 부품.</li>
            <li><b>S-Basis</b> = Specification minimum — material spec sheet 최소값 (통계적 아님, contractor 표준).</li>
            <li><b>Typical</b> = 평균 (mean), 설계용으로 사용 금지 (표준 아님).</li>
            <li><b>Lower Tolerance Bound 공식</b>: T_p = mean - k(p, c, n) · stdev. k 값은 sample 크기 n, confidence c, 비율 p 에 의존 (statistical tables).</li>
            <li><b>사용 시기</b>: aerospace primary structure → A-Basis. Secondary structure / redundant → B-Basis. 일반 industrial → Typical 가능 (안전계수로 보정).</li>
            <li className="text-muted-foreground">출처: MMPDS-08 (April 2013) Chapter 1.4 + 9 (Statistical Methods) + FAA AR-03/57.</li>
          </ul>

          {/* 14.8 — Pure metals */}
          <H3>14.8 Pure metals physical table — ASM Desk Edition Appendix</H3>
          <p className="text-sm leading-relaxed mt-1">합금 베이스 metal 의 melting/boiling/density/E/crystal 표 — 주요 원소 (Al, Be, Co, Cr, Cu, Fe, Mg, Mn, Mo, Nb, Ni, Pb, Si, Sn, Ta, Ti, U, V, W, Zn, Zr) + 귀금속 (Au, Ag, Pt, Pd) + 희토류. <F>Allotropic transformation</F> 정리: Fe (α→γ 912°C, γ→δ 1394°C) · Ti (α→β 882°C) · Mn (4 형태) · Sn (gray→white 13.2°C).</p>
          <p className="text-sm text-muted-foreground mt-1">출처: ASM Desk Edition Appendix "Property Data for Elements" + NIST WebElements.</p>

          {/* 14.9 — MMPDS-08 steel allowables */}
          <H3>14.9 MMPDS-08 Steel allowables (AISI 4130, AISI 4340, 8740, 300M, D6AC)</H3>
          <p className="text-sm leading-relaxed mt-1">MMPDS-08 Chapter 2 의 high-strength low-alloy 강 design values: <b>AISI 4130</b> (HT-125 / HT-150, Cr-Mo 항공 frame) · <b>AISI 4340</b> (HT-150~260, Ni-Cr-Mo 고강도) · <b>8740</b> (Ni-Cr-Mo 변형) · <b>300M</b> (Si-modified AISI 4340, landing gear) · <b>D6AC</b> (ultra-high-strength 항공). Ftu/Fty/Fcy/Fsu/Fbru/E 표 (SI 변환 포함).</p>
          <p className="text-sm text-muted-foreground mt-1">출처: MMPDS-08 Chapter 2 + FAA AR-03/57 (low-alloy steels).</p>

          {/* 외부 학습 자료 */}
          <Note tone="info" title="더 자세히 — 외부 학습 자료">
            <ul className="list-disc pl-5 space-y-1 text-[13px]">
              <li><ExtLink href="https://www.asminternational.org/digital-library">ASM Digital Library</ExtLink> — Vol.1 (Properties and Selection: Irons, Steels) · Vol.2 (Nonferrous) · Vol.4 (Heat Treating) · Vol.6 (Welding) (subscription)</li>
              <li><ExtLink href="https://www.matweb.com/">MatWeb</ExtLink> — UNS/KS/JIS/EN spec 검색 (한정 무료)</li>
              <li><ExtLink href="https://www.doitpoms.ac.uk/">DoITPoMS (Cambridge)</ExtLink> — phase diagram · 결정학 · 강화 메커니즘 무료 강좌</li>
              <li><ExtLink href="https://www.specialmetals.com/documents/technical-bulletins/">Special Metals Technical Bulletins</ExtLink> — Inconel 시리즈 1차 datasheet (PDF)</li>
              <li><ExtLink href="https://www.aluminum.org/standards">The Aluminum Association</ExtLink> — Wrought + Cast designation 공식 등록</li>
              <li><ExtLink href="https://www.poongsan.co.kr/">Poongsan Corporation</ExtLink> — UNS C-series + KS D 5101/5102/5506 strip grade</li>
              <li><ExtLink href="https://www.hyundai-steel.com/">Hyundai Steel Corporation</ExtLink> — KS D 3503/3504/3506/3515/3866 카탈로그</li>
              <li><ExtLink href="https://www.posco.com/">POSCO</ExtLink> — PosMAC · GIGA STEEL · 9% Ni · CGO electrical steel</li>
              <li><ExtLink href="https://ntrl.ntis.gov/NTRL/dashboard/searchResults/titleDetail/AR0357.xhtml">FAA AR-03/57 (MMPDS Statistical Methodology)</ExtLink> — A-Basis · B-Basis 공식 derivation</li>
            </ul>
          </Note>
        </Chapter>

        <Chapter
          n={15}
          id="chGloss"
          title="기술용어 사전 (글로서리)"
          learn={[
            `금속·재료 전문용어 ${Object.keys(GLOSSARY.terms).length}종의 표준 정의 (미세조직·강화·열처리·부식·파괴·성형·AM·상)`,
            '용어 검색 + 관련 용어 상호참조 — 스토리·상세 본문에 등장하는 용어의 뜻을 한 곳에서',
            '각 정의는 표준 교과서·핸드북(ASM·Callister·Ashby 등) 기반이며 출처를 표기',
          ]}
        >
          <GlossaryBrowser />
        </Chapter>
        </>)}
        </div>
      </div>
    </div>
    </GuideMaterialMapContext.Provider>
  );
}
