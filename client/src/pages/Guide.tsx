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
// A-5 — 재료 수 동적화 (하드코딩 stale 방지: 총계·카테고리 수는 빌드 산출물 SSOT 에서)
import BM from '../../public/build-meta.json';
import type { ScenarioKey } from '@/lib/scenario-presets';
import { ScenarioDialog } from '@/components/ScenarioDialog';
import { GlossaryBrowser } from '@/components/GlossaryBrowser';
import { GLOSSARY } from '@/lib/glossary';
import { GuideSidebar } from './guide/GuideSidebar';
import { ChapterSubToc } from './guide/ChapterSubToc';
import { TOC } from './guide/toc';
// C1: Guide 페이지 구성요소를 ./guide/{components,svgs}.tsx 로 분리해 파일 사이즈 축소.
import { F, Note, ExtLink, Term, Chapter, H3, PropCard, Step, ShapeCard, LoadCard, Scenario, useReadChapters, GuideMaterialMapContext, GuideWikiByKeyContext } from './guide/components';
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
/* F1 — 챕터 본문은 ./guide/chapters/*. **함수로 넘긴다**: <Chapter> 가 라우트 불일치 시
   null 이라 호출 자체가 안 되고(이전엔 15개 본문이 전부 구성됐다), 호출하면 완성된 트리를
   돌려주므로 GlossaryText 의 자동링크 walker 도 그대로 동작한다. 컴포넌트로 감싸면 후자가 깨진다. */
import ch7Body from './guide/chapters/ch7';
import ch6Body from './guide/chapters/ch6';
import ch10Body from './guide/chapters/ch10';
import ch1Body from './guide/chapters/ch1';
import ch2Body from './guide/chapters/ch2';
import ch3Body from './guide/chapters/ch3';
import ch4Body from './guide/chapters/ch4';
import ch5Body from './guide/chapters/ch5';
import ch11Body from './guide/chapters/ch11';
import ch9Body from './guide/chapters/ch9';
import ch12Body from './guide/chapters/ch12';
import ch14Body from './guide/chapters/ch14';
import ch8Body from './guide/chapters/ch8';
import ch15Body from './guide/chapters/ch15';

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
    // H6 A-1 — 멀티페이지 라우팅에서 챕터는 별도 페이지: hash+getElementById 는 랜딩/타 챕터에
    // 대상 요소가 없어 무동작이었음 → 경로 네비게이션으로 교체.
    navigate(`/guide/${e.ch}`);
  };
  return (
    <GuideMaterialMapContext.Provider value={materialMap}>
    <GuideWikiByKeyContext.Provider value={wikiLookups?.byKey ?? null}>
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
          {() => ch7Body(openConfig)}
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
          {() => ch6Body()}
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
          {() => ch10Body()}
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
          {() => ch1Body()}
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
          {() => ch2Body()}
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
          {() => ch3Body()}
        </Chapter>

        {/* ── Chapter 7 (구 4): 보 하중 도감 ───────────────────────────── */}
        <Chapter
          n={7}
          id="ch4"
          title="보 하중·지지조건 도감"
          learn={[
            '6가지 표준 하중·지지조건의 최대 처짐 / 최대 모멘트 공식',
            '식의 형태: 외팔보는 L³·L⁴ 계수가 크고, 양단고정은 매우 작다',
            '단면(Chapter 6)과 결합하여 필요 E·I 와 필요 σy 를 산출하는 흐름',
          ]}
        >
          {() => ch4Body()}
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
          {() => ch5Body()}
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
          {() => ch11Body()}
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
          {() => ch9Body()}
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
          {() => ch12Body()}
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
          {() => ch14Body()}
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
          {() => ch8Body()}
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
          {() => ch15Body()}
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
    </GuideWikiByKeyContext.Provider>
    </GuideMaterialMapContext.Provider>
  );
}
