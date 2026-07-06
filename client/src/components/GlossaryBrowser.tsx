/*
 * R227/E14/H4 — 기술용어 글로서리 브라우저 (가이드 통합용).
 * data/glossary.json(SSOT)을 카테고리별로 렌더 + 내부 검색. 읽기전용(매칭·링크 없음 = 무위험).
 * 향후 H7 멀티위키 개편 시 독립 페이지로 승격 가능하도록 self-contained.
 */
import { useMemo, useState } from 'react';
import { Search, X, BookMarked } from 'lucide-react';
import { glossaryByCategory, filterGlossary, GLOSSARY } from '@/lib/glossary';

export function GlossaryBrowser() {
  const [q, setQ] = useState('');
  const total = Object.keys(GLOSSARY.terms).length;
  const groups = useMemo(() => {
    const base = glossaryByCategory();
    if (!q.trim()) return base;
    const hit = new Set(filterGlossary(q).map(([slug]) => slug));
    return base.map((g) => ({ ...g, terms: g.terms.filter(([slug]) => hit.has(slug)) })).filter((g) => g.terms.length);
  }, [q]);
  const shown = groups.reduce((n, g) => n + g.terms.length, 0);

  const scrollTo = (slug: string) => {
    const el = document.getElementById(`term-${slug}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-violet-400', 'rounded-lg');
      setTimeout(() => el.classList.remove('ring-2', 'ring-violet-400', 'rounded-lg'), 1800);
    }
  };

  return (
    <div>
      {/* 검색 + 카운트 */}
      <div className="sticky top-12 z-10 -mx-1 px-1 py-2 bg-background/95 backdrop-blur border-b border-border mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="용어 검색 — 한글·영문·정의 (예: 마르텐사이트 / creep / 부동태)"
            className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-violet-400/50"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="검색 지우기">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {q ? `${shown} / ${total} 용어` : `${total} 용어 · ${groups.length} 분류`} — 표준 교과서·핸드북 정의 (측정값 아님, 각 항목 출처 표기)
        </p>
      </div>

      {shown === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">“{q}” 에 해당하는 용어가 없습니다.</p>
      )}

      <div className="space-y-7">
        {groups.map((g) => (
          <section key={g.cat}>
            <h3 className="flex items-center gap-2 text-sm font-bold text-violet-800 mb-2.5 pb-1 border-b border-violet-200">
              <BookMarked className="w-4 h-4" /> {g.label}
              <span className="text-[11px] font-normal text-violet-500/70">({g.terms.length})</span>
            </h3>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {g.terms.map(([slug, t]) => (
                <div key={slug} id={`term-${slug}`} className="rounded-lg border border-border bg-card p-3 scroll-mt-28">
                  <p className="font-bold text-[13.5px] text-foreground">{t.display}</p>
                  <p className="text-[12.5px] leading-relaxed text-foreground/85 mt-1">{t.short}</p>
                  {t.related && t.related.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[10px] text-muted-foreground self-center">관련:</span>
                      {t.related.map((r) => (
                        GLOSSARY.terms[r] ? (
                          <button
                            key={r}
                            type="button"
                            onClick={() => scrollTo(r)}
                            className="text-[10.5px] px-1.5 py-0.5 rounded border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                            title={GLOSSARY.terms[r].display}
                          >
                            {GLOSSARY.terms[r].display.replace(/\s*\(.*$/, '')}
                          </button>
                        ) : null
                      ))}
                    </div>
                  )}
                  {t.sources && t.sources.length > 0 && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1.5 italic">출처: {t.sources.join(' · ')}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
