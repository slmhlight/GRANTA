/*
 * R227/E14/H4b — 기술용어 인라인 링크(위키 peek→page).
 * click 시 Popover 로 정의 미리보기(분류·정의·전체 페이지 링크). A4 용어 페이지가 canonical 목적지이고
 * popover 는 문맥 이탈 없이 정의를 즉시 보여주는 peek 계층(특히 재료 상세 팝업에서 유용).
 */
import { Fragment } from 'react';
import { Link } from 'wouter';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { GLOSSARY } from '@/lib/glossary';
import { linkifyTerms } from '@/lib/glossary-link';

export function TermLink({ slug, short, children }: { slug: string; short: string; children: React.ReactNode }) {
  const t = GLOSSARY.terms[slug];
  const catLabel = t ? GLOSSARY.categories[t.category] : '';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="text-teal-700 no-underline border-b border-dotted border-teal-400/70 hover:bg-teal-50 hover:border-teal-600 cursor-help transition-colors"
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3" onClick={(e) => e.stopPropagation()}>
        {catLabel && <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 mb-0.5">{catLabel}</p>}
        <p className="font-bold text-[13.5px] text-foreground leading-tight">{t?.display ?? slug}</p>
        <p className="text-[12px] text-foreground/85 mt-1.5 leading-relaxed">{short}</p>
        <Link
          href={`/guide/term/${slug}`}
          className="inline-flex items-center gap-1 mt-2.5 text-[12px] text-accent hover:underline font-medium"
        >
          전체 페이지 →
        </Link>
      </PopoverContent>
    </Popover>
  );
}

/** 텍스트 조각에서 현재 재료 지정자(highlight regex, 캡처그룹1)를 <mark> 로 강조.
 *  W20 — 가족 공통 가이드에서 형제 grade 와 구분해 현재 재료 부분을 부각. */
function withHighlight(s: string, highlight: RegExp, keyBase: number): React.ReactNode {
  highlight.lastIndex = 0;
  const segs = s.split(highlight); // 캡처그룹 → 매칭 토큰이 홀수 인덱스
  if (segs.length === 1) return <Fragment key={keyBase}>{s}</Fragment>;
  return (
    <Fragment key={keyBase}>
      {segs.map((seg, j) =>
        j % 2 === 1 ? (
          <mark key={j} className="bg-amber-200/70 text-amber-950 rounded-[3px] px-0.5 font-semibold">{seg}</mark>
        ) : (
          <Fragment key={j}>{seg}</Fragment>
        ),
      )}
    </Fragment>
  );
}

/** 프로즈 문자열을 용어 링크로(재료 링크 없이). detail 프로즈·카드용. seen 공유 시 첫등장 유지.
 *  highlight — 있으면 텍스트 조각에서 매칭 토큰을 <mark> 강조(용어 링크와 독립). */
export function TermText({ text, seen, highlight }: { text: string; seen?: Set<string>; highlight?: RegExp | null }) {
  const parts = linkifyTerms(text, seen);
  if (parts.length === 1 && parts[0].t === 'text') {
    return <>{highlight ? withHighlight(text, highlight, 0) : text}</>;
  }
  return (
    <>
      {parts.map((p, i) =>
        p.t === 'term' ? (
          <TermLink key={i} slug={p.slug} short={p.short}>{p.s}</TermLink>
        ) : highlight ? (
          withHighlight(p.s, highlight, i)
        ) : (
          <Fragment key={i}>{p.s}</Fragment>
        ),
      )}
    </>
  );
}
