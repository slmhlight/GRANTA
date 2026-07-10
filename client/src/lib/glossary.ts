/*
 * R227/E14/H4b — 기술용어 글로서리 클라이언트 접근.
 * SSOT = data/glossary.json (커밋). 작고 정적이라 번들 import (fetch 불필요).
 * 소비처: GlossaryBrowser(가이드 렌더) · 용어 auto-link 매처(H4b) · 팝오버.
 */
import glossaryJson from '../../../data/glossary.json';
import articlesJson from '../../../data/glossary-articles.json';

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

/* R227/E14/H4c — A4 상세 본문(확장 term 만). */
export interface GlossaryPhoto { id: string; caption: string; credit?: string }
/** H4d D7 — 열거형 정보(탄화물 종류·grade 비교 등)는 표로. body 다음에 렌더. */
export interface GlossaryTable { headers: string[]; rows: string[][] }
export interface GlossarySection { heading: string; body: string; figure?: string; photo?: GlossaryPhoto; table?: GlossaryTable }
export interface GlossaryExampleMaterial { label: string; id: string }
export interface GlossaryArticle { sections: GlossarySection[]; example_materials?: GlossaryExampleMaterial[]; refs?: string[] }
const ARTICLES = (articlesJson as unknown as { articles: Record<string, GlossaryArticle> }).articles;
export function glossaryArticle(slug: string): GlossaryArticle | undefined { return ARTICLES[slug]; }
export function hasGlossaryArticle(slug: string): boolean { return !!ARTICLES[slug]; }

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
