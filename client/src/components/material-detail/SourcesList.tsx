/*
 * R157b — MaterialDetail 의 Sources/Datasheets 리스트.
 * R226e/D2 — 출처 권위 등급(authority) 배지 추가. provenance 품질을 시각적으로 구분(규격 > 핸드북 > 제조사 > DB > 기타).
 */
import { ExternalLink, Check, BookText } from 'lucide-react';
import type { MaterialSource } from '@/lib/materials';

const AUTHORITY: Record<NonNullable<MaterialSource['authority']>, { s: string; cls: string; title: string }> = {
  standard: { s: '규격', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300', title: '공식 표준 (ASTM · ASME · SAE · JIS · EN · ISO · MIL 등)' },
  handbook: { s: '핸드북', cls: 'bg-sky-100 text-sky-700 border-sky-300', title: '권위 핸드북 (ASM Handbook · MMPDS · NASA · ECCC)' },
  manufacturer: { s: '제조사', cls: 'bg-slate-100 text-slate-600 border-slate-300', title: '제조사 datasheet' },
  aggregator: { s: 'DB', cls: 'bg-amber-100 text-amber-700 border-amber-300', title: '애그리게이터 2차 출처 (MatWeb · AZoM · MakeItFrom)' },
  other: { s: '기타', cls: 'bg-muted text-muted-foreground border-border/40', title: '인용 / 파생값 마커' },
};

function AuthorityBadge({ authority }: { authority?: MaterialSource['authority'] }) {
  if (!authority) return null;
  const a = AUTHORITY[authority];
  return <span className={`text-[9px] px-1 mt-0.5 rounded border font-medium whitespace-nowrap flex-shrink-0 ${a.cls}`} title={a.title}>{a.s}</span>;
}

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
            <AuthorityBadge authority={s.authority} />
            {s.verified && <span title="Verified datasheet" className="mt-0.5"><Check className="w-3 h-3 text-emerald-500 flex-shrink-0" /></span>}
          </a>
        ) : (
          <div key={i} className="flex items-start gap-1.5 p-2 rounded bg-muted/30 border border-border/20">
            <BookText className="w-3 h-3 mt-0.5 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground flex-1 leading-snug">{s.label}</span>
            <AuthorityBadge authority={s.authority} />
          </div>
        )
      )}
    </div>
  );
}
