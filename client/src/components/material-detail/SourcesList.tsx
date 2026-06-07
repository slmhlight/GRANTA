/*
 * R157b — MaterialDetail 의 Sources/Datasheets 리스트.
 * MaterialDetail.tsx 의 inline 정의에서 추출. Behavior identical.
 */
import { ExternalLink, Check, BookText } from 'lucide-react';
import type { MaterialSource } from '@/lib/materials';

export function SourcesList({ sources }: { sources: MaterialSource[] }) {
  if (!sources.length) {
    return <p className="text-xs text-muted-foreground italic py-2">No source information</p>;
  }
  return (
    <div className="space-y-1.5">
      {sources.map((s, i) =>
        s.url ? (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-1.5 p-2 rounded bg-muted/40 hover:bg-muted border border-border/30 transition-colors group"
          >
            <ExternalLink className="w-3 h-3 mt-0.5 text-accent flex-shrink-0" />
            <span className="text-[11px] text-foreground group-hover:text-accent break-words flex-1 leading-snug">{s.label}</span>
            {s.verified && <span title="Verified datasheet"><Check className="w-3 h-3 text-emerald-500 flex-shrink-0" /></span>}
          </a>
        ) : (
          <div key={i} className="flex items-center gap-1.5 p-2 rounded bg-muted/30 border border-border/20">
            <BookText className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
          </div>
        )
      )}
    </div>
  );
}
