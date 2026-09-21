/*
 * R227/E14/H7 — 가이드 멀티페이지 사이드바.
 * 데스크톱: sticky 좌측 레일(챕터 목록 + 글로서리). 모바일: 햄버거 → 슬라이드 드로어.
 * 링크는 wouter <Link> (base 자동) → /guide/:section. 활성 챕터 하이라이트.
 */
import { useState } from 'react';
import { Link } from 'wouter';
import { Menu, X, BookMarked, Home as HomeIcon, Search, type LucideIcon } from 'lucide-react';
import { searchGuide, searchTokens, type GuideIndexEntry } from './index-entries';
import { GuideSearchHit } from './GuideSearchHit';

export interface TocItem {
  id: string;
  n: number;
  label: string;
  icon: LucideIcon;
}

export function GuideSidebar({ toc, section, isRead, onSearchPick }: { toc: TocItem[]; section?: string; isRead: (id: string) => boolean; onSearchPick?: (e: GuideIndexEntry) => void }) {
  const [drawer, setDrawer] = useState(false);
  /* H8 확장(2026-09-22) — 사이드바 내 검색: 챕터 목록 위에서 바로 찾는다(모바일 드로어에서 특히 —
     헤더 검색창이 좁아 결과를 읽기 어려웠다). 같은 인덱스(searchGuide)·같은 결과 컴포넌트. 상위 8. */
  const [q, setQ] = useState('');
  const hits = q.trim().length >= 2 ? searchGuide(q, 8) : [];
  const toks = searchTokens(q);

  /* 인라인 컴포넌트(<Nav/>)였을 때는 렌더마다 새 타입이라 자식이 remount 됐다 — 검색 입력이 들어오자
     키 입력마다 포커스를 잃었다. 렌더 함수로 바꿔 요소 identity 를 유지한다. */
  const renderNav = (onNavigate?: () => void) => (
    <nav className="text-sm">
      {onSearchPick && (
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="챕터·용어 찾기"
              aria-label="사이드바 가이드 검색"
              className="w-full h-7 pl-7 pr-2 text-[12px] rounded border border-border bg-background focus:outline-none focus:border-accent"
            />
          </div>
          {q.trim().length >= 2 && (
            <div className="mt-1 rounded-md border border-border bg-popover overflow-hidden" role="listbox" aria-label="사이드바 검색 결과">
              {hits.length === 0 ? (
                <p className="text-[11px] text-muted-foreground px-2 py-1.5">"{q}" 매칭 없음</p>
              ) : hits.map((h, i) => (
                <GuideSearchHit key={i} entry={h} tokens={toks} compact onPick={() => { setQ(''); onNavigate?.(); onSearchPick(h); }} />
              ))}
            </div>
          )}
        </div>
      )}
      <Link
        href="/guide"
        onClick={onNavigate}
        className={`flex items-center gap-2 px-3 py-2 rounded-md mb-1 transition-colors ${!section ? 'bg-accent/15 text-accent font-semibold' : 'text-foreground/70 hover:bg-muted/60'}`}
      >
        <HomeIcon className="w-4 h-4 flex-shrink-0" /> 가이드 홈
      </Link>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-3 pt-2 pb-1 font-semibold">챕터</div>
      <ol className="space-y-0.5">
        {toc.map((t) => {
          const active = section === t.id;
          const read = isRead(t.id);
          const Icon = t.icon;
          return (
            <li key={t.id}>
              <Link
                href={`/guide/${t.id}`}
                onClick={onNavigate}
                className={`flex items-start gap-2 px-3 py-1.5 rounded-md transition-colors ${active ? 'bg-accent/15 text-accent font-semibold' : 'text-foreground/75 hover:bg-muted/60'}`}
              >
                <span className={`text-[10px] w-5 flex-shrink-0 text-center rounded font-bold py-0.5 mt-0.5 ${read ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                  {read ? '✓' : t.n}
                </span>
                {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-1 opacity-70" />}
                <span className="leading-snug text-[12.5px]">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-3 pt-3 pb-1 font-semibold">참고</div>
      <Link
        href="/guide/chGloss"
        onClick={onNavigate}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${section === 'chGloss' ? 'bg-violet-100 text-violet-800 font-semibold' : 'text-violet-700/80 hover:bg-violet-50'}`}
      >
        <BookMarked className="w-4 h-4 flex-shrink-0" /> 기술용어 사전
      </Link>
    </nav>
  );

  return (
    <>
      {/* 데스크톱 sticky 레일 */}
      <aside className="hidden md:block w-56 flex-shrink-0 border-r border-border">
        <div className="sticky top-12 max-h-[calc(100vh-3rem)] overflow-y-auto p-3">
          {renderNav()}
        </div>
      </aside>

      {/* 모바일 햄버거 */}
      <button
        type="button"
        onClick={() => setDrawer(true)}
        className="md:hidden fixed left-2 bottom-3 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full bg-accent text-white shadow-lg text-xs font-semibold"
        aria-label="챕터 목차 열기"
      >
        <Menu className="w-4 h-4" /> 목차
      </button>

      {/* 모바일 드로어 */}
      {drawer && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-background border-r border-border shadow-2xl overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-sm font-bold">가이드 목차</span>
              <button type="button" onClick={() => setDrawer(false)} className="p-1 rounded hover:bg-muted" aria-label="닫기">
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderNav(() => setDrawer(false))}
          </div>
        </div>
      )}
    </>
  );
}
