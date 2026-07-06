/*
 * R227/E14/H4b — 기술용어 자동링크 매처 (KO-aware, 순수 함수 · 유닛테스트).
 *
 * glossary.json 의 autolink 폼(동음이의 공식/공정 등은 이미 제외)을 allowlist 로,
 * 텍스트에서 용어 등장 위치를 찾아 용어 페이지(/guide/term/:slug) 링크 span 을 만든다.
 *   - 라틴 폼(creep·martensite): 영단어 경계 \b (대소문자 무시).
 *   - 한글 폼(마르텐사이트·석출경화): 단어 시작 경계(앞 글자가 한글 아님) + 동음이의 가드.
 *   - 최장 우선·중첩 제거·블록당 첫 등장 1회.
 * 한글은 형태소 분석 없이 조사가 자유롭게 붙으므로 보수적(앞 경계 + 소수 가드)으로 정밀도 우선.
 */
import { GLOSSARY } from './glossary';

const HANGUL = /[가-힣]/;

export interface TermSpan {
  start: number;
  end: number;
  slug: string;
  display: string;
  short: string;
}

/** 한글 동음이의 회피: 폼 뒤에 이 패턴이 오면 링크하지 않음(다른 단어의 일부). */
const KO_AVOID: Record<string, RegExp> = {
  단조: /^(로운|로움|롭|로우)/, // 단조롭다(monotonous) ≠ 단조(forging)
};

interface FormMeta { slug: string; display: string; short: string }
let LATIN_RE: RegExp | null = null;
let KO_FORMS: Array<{ form: string; slug: string }> = [];
const FORM2META = new Map<string, FormMeta>();

function build() {
  if (LATIN_RE) return;
  const latin: string[] = [];
  const ko: Array<{ form: string; slug: string }> = [];
  for (const [slug, t] of Object.entries(GLOSSARY.terms)) {
    const meta: FormMeta = { slug, display: t.display, short: t.short };
    for (const form of t.autolink || []) {
      FORM2META.set(form.toLowerCase(), meta);
      if (HANGUL.test(form)) ko.push({ form, slug });
      else latin.push(form);
    }
  }
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  latin.sort((a, b) => b.length - a.length);
  LATIN_RE = latin.length ? new RegExp(`\\b(${latin.map(esc).join('|')})\\b`, 'gi') : /$^/g;
  ko.sort((a, b) => b.form.length - a.form.length); // 최장 우선(잔류 오스테나이트 > 오스테나이트)
  KO_FORMS = ko;
}

function latinMatches(text: string): TermSpan[] {
  const out: TermSpan[] = [];
  LATIN_RE!.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LATIN_RE!.exec(text)) !== null) {
    const meta = FORM2META.get(m[0].toLowerCase());
    if (meta) out.push({ start: m.index, end: m.index + m[0].length, ...meta });
  }
  return out;
}

function koMatches(text: string): TermSpan[] {
  const out: TermSpan[] = [];
  for (const { form } of KO_FORMS) {
    let idx = 0;
    while ((idx = text.indexOf(form, idx)) !== -1) {
      const before = idx > 0 ? text[idx - 1] : '';
      const after = text.slice(idx + form.length);
      const okBefore = !HANGUL.test(before); // 단어 시작(앞이 한글이면 합성어 중간 → 제외)
      const avoid = KO_AVOID[form]?.test(after);
      if (okBefore && !avoid) {
        const meta = FORM2META.get(form.toLowerCase())!;
        out.push({ start: idx, end: idx + form.length, ...meta });
      }
      idx += form.length;
    }
  }
  return out;
}

/** 텍스트의 용어 등장 span(최장·비중첩·slug당 첫등장). seen 공유 시 블록 간 첫등장 유지. */
export function findTermSpans(text: string, seen?: Set<string>): TermSpan[] {
  if (!text) return [];
  build();
  const all = [...latinMatches(text), ...koMatches(text)].sort(
    (a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start),
  );
  const used = seen ?? new Set<string>();
  const picked: TermSpan[] = [];
  let lastEnd = -1;
  for (const s of all) {
    if (s.start < lastEnd) continue; // 중첩 → 앞/긴 것이 이미 선택됨
    if (used.has(s.slug)) continue; // 첫 등장만
    picked.push(s);
    used.add(s.slug);
    lastEnd = s.end;
  }
  return picked;
}

export type TermNode =
  | { t: 'text'; s: string }
  | { t: 'term'; s: string; slug: string; display: string; short: string };

/** 텍스트 → 노드[](용어 span 을 term 노드로). React 렌더용. */
export function linkifyTerms(text: string, seen?: Set<string>): TermNode[] {
  const spans = findTermSpans(text, seen);
  if (!spans.length) return [{ t: 'text', s: text }];
  const nodes: TermNode[] = [];
  let pos = 0;
  for (const s of spans) {
    if (s.start > pos) nodes.push({ t: 'text', s: text.slice(pos, s.start) });
    nodes.push({ t: 'term', s: text.slice(s.start, s.end), slug: s.slug, display: s.display, short: s.short });
    pos = s.end;
  }
  if (pos < text.length) nodes.push({ t: 'text', s: text.slice(pos) });
  return nodes;
}
