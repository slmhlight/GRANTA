/*
 * H8 확장(2026-09-22) — 가이드 검색 결과 한 줄.
 * 검색어 토큰을 제목·스니펫에서 <mark> 로 강조하고, 엔트리 종류(헤딩·노트·사례·단계·FAQ·용어)를 배지로 나눈다.
 * 헤더 드롭다운과 사이드바 검색이 같은 컴포넌트를 쓴다.
 */
import type { GuideIndexEntry } from './index-entries';

export const KIND_BADGE: Record<'heading' | 'note' | 'scenario' | 'step' | 'faq' | 'term', { label: string; cls: string }> = {
  heading: { label: '본문', cls: 'bg-accent/15 text-accent' },
  note: { label: '노트', cls: 'bg-amber-500/15 text-amber-800' },
  scenario: { label: '사례', cls: 'bg-emerald-500/15 text-emerald-800' },
  step: { label: '단계', cls: 'bg-sky-500/15 text-sky-800' },
  faq: { label: 'FAQ', cls: 'bg-rose-500/15 text-rose-800' },
  term: { label: '용어', cls: 'bg-violet-500/15 text-violet-700' },
};

/** 토큰이 등장하는 부분을 <mark> 로 감싼다(대소문자 무시, 가장 긴 토큰 우선). 토큰이 없으면 원문. */
export function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  const toks = Array.from(new Set(tokens.filter((t) => t.length >= 2))).sort((a, b) => b.length - a.length);
  if (!toks.length || !text) return <>{text}</>;
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${toks.map(esc).join('|')})`, 'ig');
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) => (toks.includes(part.toLowerCase())
        ? <mark key={i} className="bg-yellow-200/80 text-inherit rounded-sm px-0.5">{part}</mark>
        : <span key={i}>{part}</span>))}
    </>
  );
}

export function GuideSearchHit({ entry: r, tokens, active, onPick, onHover, compact }: {
  entry: GuideIndexEntry; tokens: string[]; active?: boolean; onPick: () => void; onHover?: () => void; compact?: boolean;
}) {
  const kind = r.termSlug ? 'term' : (r.kind || 'heading');
  const badge = KIND_BADGE[kind];
  return (
    <button
      type="button"
      role="option"
      aria-selected={!!active}
      onMouseDown={(e) => { e.preventDefault(); onPick(); }}
      onMouseEnter={onHover}
      className={`w-full text-left ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} border-b border-border/30 last:border-0 ${active ? 'bg-accent/10' : 'hover:bg-muted/40'}`}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`text-[10px] rounded px-1.5 py-0.5 font-bold flex-shrink-0 ${badge.cls}`}>{kind === 'term' ? '용어' : `Ch.${r.chapterN}`}{kind !== 'term' && kind !== 'heading' ? ` · ${badge.label}` : ''}</span>
        <span className={`${compact ? 'text-[11.5px]' : 'text-[12px]'} font-semibold text-foreground`}>
          <Highlight text={r.termSlug || r.kind ? (r.section || r.chapterLabel) : r.chapterLabel} tokens={tokens} />
        </span>
        {!r.termSlug && !r.kind && r.section && <span className="text-[10px] text-muted-foreground">› <Highlight text={r.section} tokens={tokens} /></span>}
      </div>
      {!compact && <p className="text-[11px] text-foreground/70 mt-0.5 line-clamp-2"><Highlight text={r.snippet} tokens={tokens} /></p>}
    </button>
  );
}
