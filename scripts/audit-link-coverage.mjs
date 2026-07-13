/*
 * R227/E14/H5-D1 (W1) — 재료 링크 커버리지 감사 (scratchpad linksim/guidescan 승격).
 *
 * 코퍼스(글로서리 article 본문·표 + Guide.tsx JSX 텍스트 + 스토리 본문)에서 합금-형 언급을
 * 추출하고, wiki-index autolink 맵으로 링크 성패를 시뮬레이션(client/src/lib/wiki-link.ts 의
 * sliding + len>=3 로직 복제)한다. 리포트만(docs/audits/link-coverage.md) — 게이트는
 * tests/wiki-link.test.ts(H5-D2 통합) 가 실제 TS linkify 로 별도 수행(로직 드리프트 원천 차단).
 *
 * 사용: node scripts/audit-link-coverage.mjs   (build:data → build:wiki 산출물 필요)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const rj = (p) => JSON.parse(rd(p));

const WI = rj('client/public/wiki-index.json');
const articles = rj('data/glossary-articles.json').articles;
const stories = rj('data/alloy-stories.json').stories;
const materials = rj('client/public/materials.json');

// ── wiki-link.ts 와 동일 norm ──
const norm = (s) => s.replace(/[\s‐‑–—―·×,()\/%]/g, '').replace(/-/g, '').toLowerCase();

// autolink 맵 (buildAutolinkMap 동일)
const map = new Map();
for (const e of WI.entities) {
  for (const sf of e.surface_forms || []) {
    if (sf.autolink && !sf.ambiguous && !map.has(sf.form)) map.set(sf.form, { id: e.id, rep: e.rep_id });
  }
}

const RUN = /[A-Za-z0-9][A-Za-z0-9]*(?:[ \-·][A-Za-z0-9]+)*/g;
const SEP = /[ \-·]/;
function prefixLen(run, toks, n) {
  if (n >= toks.length) return run.length;
  let idx = 0;
  for (let i = 0; i < n; i++) { const f = run.indexOf(toks[i], idx); idx = f + toks[i].length; }
  return idx;
}
function linkSpans(text) {
  const linked = new Set();
  const spans = [];
  RUN.lastIndex = 0;
  let mm;
  while ((mm = RUN.exec(text)) !== null) {
    const run = mm[0], start = mm.index;
    const toks = run.split(SEP).filter(Boolean);
    let hitLen = 0, hitTgt = null;
    for (let n = toks.length; n >= 1; n--) {
      const cand = norm(toks.slice(0, n).join(''));
      if (cand.length < 3) continue;
      const tgt = map.get(cand);
      if (tgt && tgt.rep && !linked.has(tgt.id)) { hitLen = prefixLen(run, toks, n); hitTgt = tgt; break; }
    }
    if (hitTgt) { spans.push([start, start + hitLen]); linked.add(hitTgt.id); if (hitLen < run.length) RUN.lastIndex = start + hitLen + 1; }
    else if (toks.length > 1) RUN.lastIndex = start + prefixLen(run, toks, 1) + 1;
  }
  return spans;
}

// ── 코퍼스 조립 ──
function guideTexts() {
  const out = [];
  const tsx = rd('client/src/pages/Guide.tsx');
  for (const m of tsx.matchAll(/>([^<>{}]{6,})</g)) {
    const t = m[1].trim();
    if (!t || /^https?:|className|^\w+=/.test(t)) continue;
    if (!/[가-힣]/.test(t) && t.length < 12) continue;
    out.push(t);
  }
  for (const m of tsx.matchAll(/\{\s*['"`]([^'"`]{8,})['"`]\s*\}/g)) if (/[가-힣]/.test(m[1])) out.push(m[1]);
  return out;
}
const corpus = { article: [], guide: [], story: [] };
for (const art of Object.values(articles)) for (const s of art.sections) {
  corpus.article.push(s.body || '');
  if (s.table) corpus.article.push(...s.table.rows.flat(), ...s.table.headers);
}
corpus.guide = guideTexts();
for (const st of Object.values(stories)) {
  const parts = [...(st.sections ? Object.values(st.sections) : []), ...(st.timeline || []).map((e) => e.event)];
  corpus.story.push(parts.filter(Boolean).join(' '));
}

// ── 합금-형 언급 패턴 (guidescan 계열) ──
const MENTION = [
  /\bUNS ?[A-Z]\d{5}\b/g,
  /\b(?:Inconel|Incoloy|Hastelloy|Haynes|Monel|Nimonic|Waspaloy|Rene|Udimet|Stellite|MAR-M|CMSX|Zamak|Nitronic)[- ]?[\w.]{0,8}\b/g,
  /\bAA ?\d{4}\b/g, /\bAISI ?\d{3,4}[A-Z]?\b/g, /\bTi-6Al-4V\b/g,
  /\b\d{4}-T\d{1,2}\b/g, /\b1[0-9]{3}\b/g, /\b4[0-9]{3}\b/g, /\b7[0-9]{3}\b/g, /\b6[0-9]{3}\b/g, /\b2[0-9]{3}\b/g,
  /\b3\d{2}L?N?\b/g, /\b4\d{2}[A-Z]?\b/g, /\b17-[47] ?PH\b/g, /\bP9[12]\b/g, /\b52100\b/g, /\bM\d{2}\b/g,
];
const NUM_BAD_BEFORE = /(°C|°F|MPa|GPa|HV|HB|HRC|~|≥|≤|약 |서 |도 |년 |g\/)$/;
const NUM_BAD_AFTER = /^ ?(°C|°F|MPa|GPa|h\b|시간|년|%|배)/;

function scan(texts) {
  const fails = new Map();
  let mentions = 0, linked = 0;
  for (const text of texts) {
    const spans = linkSpans(text);
    for (const re of MENTION) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const s = m.index, e = s + m[0].length, raw = m[0];
        if (/^\d+$/.test(raw)) {
          const pre = text.slice(Math.max(0, s - 8), s), post = text.slice(e, e + 6);
          if (NUM_BAD_BEFORE.test(pre) || NUM_BAD_AFTER.test(post)) continue;
          if (/[\d.]/.test(text[s - 1] || '') || /[\d.]/.test(text[e] || '')) continue;
        }
        mentions++;
        const hit = spans.some(([a, b]) => (a <= s && e <= b) || (s <= a && a < e));
        if (hit) { linked++; continue; }
        const f = fails.get(raw) || { n: 0, ex: [] };
        f.n++;
        if (f.ex.length < 2) f.ex.push('…' + text.slice(Math.max(0, s - 22), e + 16).replace(/\s+/g, ' ') + '…');
        fails.set(raw, f);
      }
    }
  }
  return { mentions, linked, fails };
}

const rArt = scan(corpus.article), rGuide = scan(corpus.guide), rStory = scan(corpus.story);
const md = ['# 재료 링크 커버리지 감사 (자동 — audit-link-coverage.mjs)', ''];
md.push('> 코퍼스: 글로서리 article + Guide.tsx + 스토리. wiki-index autolink 맵으로 시뮬(sliding+len≥3).');
md.push('> **게이트는 tests/wiki-link.test.ts (실 TS linkify)** — 본 리포트는 실패 유형 진단용.');
md.push('');
md.push('| 코퍼스 | 언급 | 링크 | 실패 | 커버리지 |');
md.push('|---|---|---|---|---|');
for (const [lab, r] of [['글로서리 article', rArt], ['가이드 Guide.tsx', rGuide], ['스토리', rStory]]) {
  const pct = r.mentions ? ((r.linked / r.mentions) * 100).toFixed(0) : '—';
  md.push(`| ${lab} | ${r.mentions} | ${r.linked} | ${r.mentions - r.linked} | ${pct}% |`);
}
md.push('');
for (const [lab, r] of [['글로서리 article', rArt], ['가이드 Guide.tsx', rGuide], ['스토리', rStory]]) {
  md.push(`## ${lab} — 미링크 유형 (상위)`);
  md.push('');
  md.push('| 언급 | 횟수 | 예시 |');
  md.push('|---|---|---|');
  for (const [k, v] of [...r.fails.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 30)) {
    md.push(`| ${k} | ${v.n} | ${v.ex[0] || ''} |`);
  }
  md.push('');
}
fs.mkdirSync(path.join(ROOT, 'docs/audits'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audits/link-coverage.md'), md.join('\n') + '\n');
console.log(`audit-link-coverage: article ${rArt.linked}/${rArt.mentions} · guide ${rGuide.linked}/${rGuide.mentions} · story ${rStory.linked}/${rStory.mentions}`);
console.log('→ docs/audits/link-coverage.md');
