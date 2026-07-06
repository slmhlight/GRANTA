/*
 * R227/E14/H4b — 기술용어 글로서리 클라이언트 접근.
 * SSOT = data/glossary.json (커밋). 작고 정적이라 번들 import (fetch 불필요).
 * 소비처: GlossaryBrowser(가이드 렌더) · 용어 auto-link 매처(H4b) · 팝오버.
 */
import glossaryJson from '../../../data/glossary.json';

export interface GlossaryTerm {
  display: string;
  category: string;
  surface_forms: string[];
  autolink?: string[];
  short: string;
  sources: string[];
  related?: string[];
}
export interface GlossaryData {
  version: number;
  categories: Record<string, string>;
  terms: Record<string, GlossaryTerm>;
}

export const GLOSSARY = glossaryJson as unknown as GlossaryData;

/** 카테고리 순서대로 그룹핑 (빈 그룹 제외). */
export function glossaryByCategory(): Array<{ cat: string; label: string; terms: Array<[string, GlossaryTerm]> }> {
  return Object.entries(GLOSSARY.categories)
    .map(([cat, label]) => ({
      cat,
      label,
      terms: Object.entries(GLOSSARY.terms)
        .filter(([, t]) => t.category === cat)
        .sort((a, b) => a[1].display.localeCompare(b[1].display, 'ko')),
    }))
    .filter((g) => g.terms.length > 0);
}

/** 간단 필터 (KO/EN surface_form·display·정의 substring). */
export function filterGlossary(q: string): Array<[string, GlossaryTerm]> {
  const query = q.trim().toLowerCase();
  const all = Object.entries(GLOSSARY.terms);
  if (!query) return all;
  return all.filter(([slug, t]) => {
    const hay = [slug, t.display, t.short, ...(t.surface_forms || [])].join(' ').toLowerCase();
    return hay.includes(query);
  });
}
