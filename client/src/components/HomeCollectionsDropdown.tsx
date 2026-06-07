/*
 * R157b — Home 의 Collections dropdown.
 * Home.tsx 의 inline 정의에서 추출. Behavior identical.
 *
 * 기능:
 *  - Saved collections 리스트 (이름, 크기, 필터 snapshot 표시)
 *  - 정렬 cycle (최신·이름·크기)
 *  - 5+ 시 검색 입력
 *  - Load / Share / Delete 액션
 *  - 전체 백업 / 복원 footer
 */
import type { RefObject } from 'react';
import { Bookmark, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import type { FilterState } from '@/hooks/useMaterialFilter';

/* R157b — Home.tsx 의 Collection type 과 매칭. filters / preset / viewMode 는 optional. */
export interface CollectionEntry {
  name: string;
  ids: string[];
  filters?: Partial<FilterState>;
  preset?: { key: string; label: string };
  viewMode?: 'table' | 'cards' | 'ashby';
  createdAt?: number;
}

export type CollectionSort = 'recent' | 'name' | 'size';

interface HomeCollectionsDropdownProps {
  collections: CollectionEntry[];
  sortedFilteredCollections: CollectionEntry[];
  collSort: CollectionSort;
  setCollSort: (next: (cur: CollectionSort) => CollectionSort) => void;
  collQuery: string;
  setCollQuery: (q: string) => void;
  loadCollection: (c: CollectionEntry) => void;
  shareSet: (name: string, ids: string[]) => void;
  deleteCollection: (name: string) => void;
  exportAllState: () => void;
  /* React 19 — RefObject<T | null>. useRef<HTMLInputElement>(null) returns this shape. */
  backupFileRef: RefObject<HTMLInputElement | null>;
}

export function HomeCollectionsDropdown({
  collections,
  sortedFilteredCollections,
  collSort,
  setCollSort,
  collQuery,
  setCollQuery,
  loadCollection,
  shareSet,
  deleteCollection,
  exportAllState,
  backupFileRef,
}: HomeCollectionsDropdownProps) {
  if (collections.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Bookmark className="w-3 h-3" /> Collections <span className="text-muted-foreground">({collections.length})</span></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-auto w-72">
        <DropdownMenuLabel className="text-xs flex items-center justify-between gap-2">
          <span>Saved collections</span>
          {/* Sprint 3 B8 — sort cycle (recent ↔ name ↔ size). icon-only 로 공간 절약. */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCollSort(s => s === 'recent' ? 'name' : s === 'name' ? 'size' : 'recent'); }}
            className="text-[10px] font-normal text-muted-foreground hover:text-foreground border border-border/60 rounded px-1.5 py-0.5"
            title="정렬 전환"
          >
            {collSort === 'recent' ? '↻ 최신' : collSort === 'name' ? '↻ 이름' : '↻ 크기'}
          </button>
        </DropdownMenuLabel>
        {/* Sprint 3 B8 — 5+ 일 때만 검색 표시. */}
        {collections.length >= 5 && (
          <div className="px-1.5 pb-1">
            <input
              type="text"
              value={collQuery}
              onChange={(e) => setCollQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="이름 검색…"
              className="w-full text-xs px-2 py-1 border border-border/60 rounded bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        )}
        {sortedFilteredCollections.length === 0 && collQuery && (
          <p className="text-[11px] text-muted-foreground italic px-2 py-2">"{collQuery}" 일치 없음</p>
        )}
        {sortedFilteredCollections.map(c => (
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
        {/* R71 D — 백업/복원 footer */}
        <div className="border-t border-border/40 mt-1 pt-1 px-1.5">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); exportAllState(); }}
            className="w-full text-left text-[11px] py-1 px-1 rounded hover:bg-muted/50 text-foreground/80"
          >
            📥 전체 백업 (JSON 다운로드)
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); backupFileRef.current?.click(); }}
            className="w-full text-left text-[11px] py-1 px-1 rounded hover:bg-muted/50 text-foreground/80"
          >
            📤 백업 복원 (JSON 업로드)
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
