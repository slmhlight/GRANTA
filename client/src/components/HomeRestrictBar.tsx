/*
 * R157b — Home 의 restrictIds (pinned material set) 상단 바.
 * Home.tsx 의 inline 정의에서 추출. Behavior identical.
 *
 * Pin 된 재료 목록 → 컬렉션으로 저장 / Share / Clear.
 */
import { BookmarkPlus, Share2 } from 'lucide-react';

interface HomeRestrictBarProps {
  restrictIds: string[] | null;
  viewFilteredCount: number;
  collName: string;
  setCollName: (n: string) => void;
  saveCollection: () => void;
  shareSet: (name: string, ids: string[]) => void;
  setRestrictIds: (ids: string[] | null) => void;
  linkCopied: boolean;
  t: (key: string) => string;
}

export function HomeRestrictBar({
  restrictIds,
  viewFilteredCount,
  collName,
  setCollName,
  saveCollection,
  shareSet,
  setRestrictIds,
  linkCopied,
  t,
}: HomeRestrictBarProps) {
  if (!restrictIds) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-accent/10 border-b border-accent/30 text-xs">
      <span className="text-accent font-medium">{viewFilteredCount} {t('banner.materialsPinned')}</span>
      <span className="text-muted-foreground">{t('banner.tableCards')}</span>
      <div className="ml-auto flex items-center gap-1.5">
        <input value={collName} onChange={e => setCollName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveCollection(); }} placeholder={t('banner.collectionName')} className="h-6 w-36 text-[11px] rounded border border-border px-2 bg-background" />
        <button onClick={saveCollection} disabled={!collName.trim()} className="text-[11px] px-2 py-0.5 rounded border border-accent/40 text-accent hover:bg-accent/10 disabled:opacity-40 flex items-center gap-1"><BookmarkPlus className="w-3 h-3" /> Save</button>
        <button onClick={() => shareSet(collName.trim(), restrictIds || [])} className="text-[11px] px-2 py-0.5 rounded border border-accent/40 text-accent hover:bg-accent/10 flex items-center gap-1"><Share2 className="w-3 h-3" /> {linkCopied ? 'Copied!' : 'Share'}</button>
        <button onClick={() => setRestrictIds(null)} className="text-[11px] px-2 py-0.5 rounded border border-accent/40 text-accent hover:bg-accent/10">Clear</button>
      </div>
    </div>
  );
}
