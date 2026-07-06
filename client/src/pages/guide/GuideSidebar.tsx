/*
 * R227/E14/H7 — 가이드 멀티페이지 사이드바.
 * 데스크톱: sticky 좌측 레일(챕터 목록 + 글로서리). 모바일: 햄버거 → 슬라이드 드로어.
 * 링크는 wouter <Link> (base 자동) → /guide/:section. 활성 챕터 하이라이트.
 */
import { useState } from 'react';
import { Link } from 'wouter';
import { Menu, X, BookMarked, Home as HomeIcon } from 'lucide-react';

export interface TocItem {
  id: string;
  n: number;
  label: string;
  icon: any;
}

export function GuideSidebar({ toc, section, isRead }: { toc: TocItem[]; section?: string; isRead: (id: string) => boolean }) {
  const [drawer, setDrawer] = useState(false);

  const Nav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="text-sm">
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
          <Nav />
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
            <Nav onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
    </>
  );
}
