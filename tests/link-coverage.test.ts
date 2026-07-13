/*
 * R227/E14/H5-D1 (W1) — 재료 링크 커버리지 게이트.
 *
 * audit-link-coverage.mjs 는 진단 리포트(로직 복제)지만, 이 게이트는 **실제 클라이언트 매처**
 * (client/src/lib/wiki-link.ts 의 linkify + buildAutolinkMap)를 그대로 호출해 커버리지가
 * 기준선 아래로 떨어지면 fail 시킨다 — mjs 복제와 TS 매처의 드리프트를 원천 차단.
 *
 * 기준선(2026-07-12, 커밋 7a50582 기준 산출): article 147 · guide 251 · story 89.
 * 하한은 여유 마진을 둠(콘텐츠 편집으로 소폭 변동 허용, 구조적 회귀만 차단).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { linkify, buildAutolinkMap, type AutolinkMap } from '@/lib/wiki-link';
import { buildWikiLookups } from '@/lib/wiki-refs';

const ROOT = process.cwd();
const rd = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const rj = (p: string) => JSON.parse(rd(p));

const idxPath = path.join(ROOT, 'client/public/wiki-index.json');
const blPath = path.join(ROOT, 'client/public/wiki-backlinks.json');
const hasFiles = fs.existsSync(idxPath) && fs.existsSync(blPath);

// ── 합금-형 언급 패턴 (audit-link-coverage.mjs 와 동일) ──
const MENTION: RegExp[] = [
  /\bUNS ?[A-Z]\d{5}\b/g,
  /\b(?:Inconel|Incoloy|Hastelloy|Haynes|Monel|Nimonic|Waspaloy|Rene|Udimet|Stellite|MAR-M|CMSX|Zamak|Nitronic)[- ]?[\w.]{0,8}\b/g,
  /\bAA ?\d{4}\b/g, /\bAISI ?\d{3,4}[A-Z]?\b/g, /\bTi-6Al-4V\b/g,
  /\b\d{4}-T\d{1,2}\b/g, /\b1[0-9]{3}\b/g, /\b4[0-9]{3}\b/g, /\b7[0-9]{3}\b/g, /\b6[0-9]{3}\b/g, /\b2[0-9]{3}\b/g,
  /\b3\d{2}L?N?\b/g, /\b4\d{2}[A-Z]?\b/g, /\b17-[47] ?PH\b/g, /\bP9[12]\b/g, /\b52100\b/g, /\bM\d{2}\b/g,
];
const NUM_BAD_BEFORE = /(°C|°F|MPa|GPa|HV|HB|HRC|~|≥|≤|약 |서 |도 |년 |g\/)$/;
const NUM_BAD_AFTER = /^ ?(°C|°F|MPa|GPa|h\b|시간|년|%|배)/;

/** linkify 출력 노드 → 링크 구간 [start,end][] (문자 오프셋). */
function linkSpansOf(text: string, map: AutolinkMap): Array<[number, number]> {
  const nodes = linkify(text, map, null, null);
  const spans: Array<[number, number]> = [];
  let pos = 0;
  for (const n of nodes) {
    const len = n.s.length;
    if (n.t === 'link') spans.push([pos, pos + len]);
    pos += len;
  }
  return spans;
}

function coverage(texts: string[], map: AutolinkMap): { mentions: number; linked: number } {
  let mentions = 0, linked = 0;
  for (const text of texts) {
    const spans = linkSpansOf(text, map);
    for (const re of MENTION) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const s = m.index, e = s + m[0].length, raw = m[0];
        if (/^\d+$/.test(raw)) {
          const pre = text.slice(Math.max(0, s - 8), s), post = text.slice(e, e + 6);
          if (NUM_BAD_BEFORE.test(pre) || NUM_BAD_AFTER.test(post)) continue;
          if (/[\d.]/.test(text[s - 1] || '') || /[\d.]/.test(text[e] || '')) continue;
        }
        mentions++;
        if (spans.some(([a, b]) => (a <= s && e <= b) || (s <= a && a < e))) linked++;
      }
    }
  }
  return { mentions, linked };
}

function corpusTexts(): { article: string[]; guide: string[]; story: string[] } {
  const articles = rj('data/glossary-articles.json').articles as Record<string, { sections: Array<{ body?: string; table?: { headers: string[]; rows: string[][] } }> }>;
  const stories = rj('data/alloy-stories.json').stories as Record<string, { sections?: Record<string, string>; timeline?: Array<{ event: string }> }>;
  const article: string[] = [];
  for (const art of Object.values(articles)) for (const s of art.sections) {
    article.push(s.body || '');
    if (s.table) article.push(...s.table.rows.flat(), ...s.table.headers);
  }
  const tsx = rd('client/src/pages/Guide.tsx');
  const guide: string[] = [];
  for (const m of tsx.matchAll(/>([^<>{}]{6,})</g)) {
    const t = m[1].trim();
    if (!t || /^https?:|className|^\w+=/.test(t)) continue;
    if (!/[가-힣]/.test(t) && t.length < 12) continue;
    guide.push(t);
  }
  for (const m of tsx.matchAll(/\{\s*['"`]([^'"`]{8,})['"`]\s*\}/g)) if (/[가-힣]/.test(m[1])) guide.push(m[1]);
  const story: string[] = [];
  for (const st of Object.values(stories)) {
    const parts = [...(st.sections ? Object.values(st.sections) : []), ...(st.timeline || []).map((e) => e.event)];
    story.push(parts.filter(Boolean).join(' '));
  }
  return { article, guide, story };
}

describe('재료 링크 커버리지 게이트 (H5-D1 — 실 linkify)', () => {
  it.runIf(hasFiles)('커버리지가 기준선 하한 이상 (구조적 회귀 차단)', () => {
    const lk = buildWikiLookups(rj('client/public/wiki-index.json'), rj('client/public/wiki-backlinks.json'));
    const map = buildAutolinkMap(lk);
    const c = corpusTexts();
    const art = coverage(c.article, map);
    const guide = coverage(c.guide, map);
    const story = coverage(c.story, map);
    // 기준선 147/251/89 대비 여유 하한 (편집 변동 허용, 구조 붕괴만 fail)
    expect(art.linked, `article 링크 ${art.linked}/${art.mentions} (하한 138)`).toBeGreaterThanOrEqual(138);
    expect(guide.linked, `guide 링크 ${guide.linked}/${guide.mentions} (하한 238)`).toBeGreaterThanOrEqual(238);
    expect(story.linked, `story 링크 ${story.linked}/${story.mentions} (하한 82)`).toBeGreaterThanOrEqual(82);
  });
});
