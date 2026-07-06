/*
 * R227/E14/H7 — 기술용어 상세 페이지. /guide/term/:slug
 * 짧은 정의 + 분류 + 관련 용어(용어 페이지 상호링크) + 출처. (심화 A4 콘텐츠는 추후 — 사용자 결정.)
 * 가이드 사이드바 재사용으로 챕터 네비 일관 유지.
 */
import { useMemo } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, GraduationCap, BookMarked, ChevronRight } from 'lucide-react';
import { GLOSSARY, glossaryArticle } from '@/lib/glossary';
import { GuideSidebar } from './GuideSidebar';
import { TOC } from './toc';
import { useReadChapters, GlossaryText, GuideMaterialMapContext } from './components';
import { GlossaryFigure, GlossaryPhoto } from './glossary-figures';
import { useWikiRefs } from '@/hooks/useWikiRefs';
import { buildAutolinkMap } from '@/lib/wiki-link';

export default function GuideTermPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isRead } = useReadChapters();
  const term = slug ? GLOSSARY.terms[slug] : undefined;
  const catLabel = term ? GLOSSARY.categories[term.category] : '';
  const article = slug ? glossaryArticle(slug) : undefined;
  // 본문 내 용어·합금 상호링크용 재료 맵.
  const wikiLookups = useWikiRefs();
  const materialMap = useMemo(() => (wikiLookups ? buildAutolinkMap(wikiLookups) : null), [wikiLookups]);

  return (
    <GuideMaterialMapContext.Provider value={materialMap}>
    <div className="min-h-screen bg-background text-foreground">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 h-12 flex items-center gap-2 sm:gap-3 px-2 sm:px-4 border-b border-border bg-[oklch(0.22_0.055_250)] text-sidebar-foreground">
        <Link href="/" className="flex items-center gap-1 text-xs sm:text-sm hover:text-white text-sidebar-foreground/80 whitespace-nowrap">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">탐색기</span>
        </Link>
        <div className="w-px h-5 bg-sidebar-border hidden sm:block" />
        <Link href="/guide" className="flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white whitespace-nowrap">
          <GraduationCap className="w-4 h-4 text-accent" /> 재료 선택 가이드
        </Link>
        <Link href="/guide/chGloss" className="ml-auto flex items-center gap-1 text-[12px] text-sidebar-foreground/80 hover:text-white whitespace-nowrap">
          <BookMarked className="w-3.5 h-3.5" /> 용어 사전
        </Link>
      </header>

      <div className="flex">
        <GuideSidebar toc={TOC} section="chGloss" isRead={isRead} />
        <div className="mx-auto max-w-3xl px-5 py-10 flex-1 min-w-0">
          {/* breadcrumb */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-4">
            <Link href="/guide/chGloss" className="hover:text-accent">기술용어 사전</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground/70">{term ? term.display.replace(/\s*\(.*$/, '') : slug}</span>
          </div>

          {!term ? (
            <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">“{slug}” 용어를 찾을 수 없습니다.</p>
              <Link href="/guide/chGloss" className="inline-block mt-3 text-sm text-accent hover:underline">← 기술용어 사전으로</Link>
            </div>
          ) : (
            <article>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-semibold">{catLabel}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{term.display}</h1>

              {/* 정의(리드) */}
              <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-4">
                <p className="text-[14px] leading-relaxed text-foreground/90">{term.short}</p>
              </div>

              {/* A4 상세 본문 (있는 term 만) — 섹션별 프로즈(용어·합금 자동링크) + 도표 */}
              {article && (
                <div className="mt-6 space-y-6">
                  {article.sections.map((sec, i) => (
                    <section key={i}>
                      <h2 className="text-[15px] font-bold text-foreground border-b border-border/60 pb-1 mb-2">{sec.heading}</h2>
                      <p className="text-[13.5px] leading-relaxed text-foreground/90 whitespace-pre-line"><GlossaryText excludeTermSlug={slug}>{sec.body}</GlossaryText></p>
                      {sec.figure && <GlossaryFigure id={sec.figure} />}
                      {sec.photo && <GlossaryPhoto id={sec.photo.id} caption={sec.photo.caption} credit={sec.photo.credit} />}
                    </section>
                  ))}
                  {article.example_materials && article.example_materials.length > 0 && (
                    <div>
                      <h2 className="text-[15px] font-bold text-foreground border-b border-border/60 pb-1 mb-2">대표 합금</h2>
                      <div className="flex flex-wrap gap-2">
                        {article.example_materials.map((m) => (
                          <Link
                            key={m.id}
                            href={`/?d=${encodeURIComponent(m.id)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-violet-300 bg-violet-50/50 text-[12.5px] font-medium text-violet-800 hover:bg-violet-100 hover:border-violet-500 transition-colors"
                            title="탐색기에서 이 합금 보기"
                          >
                            {m.label} <span className="text-violet-400" aria-hidden>→</span>
                          </Link>
                        ))}
                      </div>
                      <p className="text-[10.5px] text-muted-foreground/70 mt-1.5 italic">칩을 누르면 탐색기에서 해당 합금 상세가 열립니다.</p>
                    </div>
                  )}
                  {article.refs && article.refs.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">참고 문헌</p>
                      <ul className="text-[12px] text-foreground/70 space-y-0.5 list-disc list-inside">
                        {article.refs.map((r) => <li key={r}>{r}</li>)}
                      </ul>
                      <p className="text-[10.5px] text-muted-foreground/70 mt-1.5 italic">표준 교과서·핸드북 기반 개념 설명이며 특정 재료의 측정값이 아닙니다. 도표는 개략(schematic)입니다.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 표기 (surface forms) */}
              {term.surface_forms && term.surface_forms.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">표기 · 별칭</p>
                  <div className="flex flex-wrap gap-1.5">
                    {term.surface_forms.map((f) => (
                      <span key={f} className="text-[11px] px-1.5 py-0.5 rounded bg-muted border border-border/50 font-mono">{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 관련 용어 */}
              {term.related && term.related.length > 0 && (
                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">관련 용어</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {term.related.filter((r) => GLOSSARY.terms[r]).map((r) => {
                      const rt = GLOSSARY.terms[r];
                      return (
                        <Link key={r} href={`/guide/term/${r}`} className="group rounded-lg border border-violet-200 bg-violet-50/40 p-2.5 hover:border-violet-400 hover:bg-violet-50 transition-colors">
                          <p className="text-[13px] font-semibold text-violet-900 group-hover:underline">{rt.display}</p>
                          <p className="text-[11px] text-foreground/70 line-clamp-2 mt-0.5">{rt.short}</p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 출처 (A4 본문 없을 때만 — 있으면 참고 문헌으로 대체) */}
              {!article && term.sources && term.sources.length > 0 && (
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">출처</p>
                  <ul className="text-[12px] text-foreground/70 space-y-0.5 list-disc list-inside">
                    {term.sources.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                  <p className="text-[10.5px] text-muted-foreground/70 mt-2 italic">표준 교과서·핸드북 기반 개념 정의이며 특정 재료의 측정값이 아닙니다.</p>
                </div>
              )}
            </article>
          )}
        </div>
      </div>
    </div>
    </GuideMaterialMapContext.Provider>
  );
}
