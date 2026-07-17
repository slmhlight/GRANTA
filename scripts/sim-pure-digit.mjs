/*
 * H6 W17 — 순숫자(3~5자리) 합금 폼 자동링크 시뮬레이션 (dry-run — 실제 링크 정책 변경 없음).
 *
 * 현행 정책: 순숫자 폼은 영구 봉인 (wiki autolink 는 알파벳 포함 폼만 — name-tokens.mjs suggestAutolink).
 * 이 스크립트는 "가드 달린 매처(A안)" 를 가정하고 전 코퍼스를 스캔해:
 *   ① 가드에 걸러지는 히트(연도·단위·범위·소수·장절번호)
 *   ② 가드 생존 히트 — 문맥과 함께 전수 출력 (수동 판정: 합금 언급 vs 오탐)
 * 을 docs/audits/pure-digit-sim.md 로 리포트한다.
 * 판정 규칙(H6 W1-2): 생존 히트 중 오탐 ≥1 → 봉인 유지(기본값). 정링크 손실분은 B안(canonical
 * 표기 스윕)·C안(W16 명시링크)으로 소거.
 *
 * 사용: node scripts/sim-pure-digit.mjs   (build:data → build:wiki 산출물 필요)
 * 코퍼스 조립은 audit-link-coverage.mjs 와 동일 (글로서리 article+표 · Guide.tsx · 스토리).
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

// ── 순숫자 폼 도출: 엔티티 surface form 에서 숫자부 추출 (aisi4140→4140 · aa7075→7075 · 304 그대로) ──
const digitOwners = new Map(); // digits → Set(entity id)
for (const e of WI.entities) {
  for (const sf of e.surface_forms || []) {
    const m = String(sf.form).match(/^[a-z]{0,6}(\d{3,5})[a-z]?$/);
    if (!m) continue;
    const d = m[1];
    if (!digitOwners.has(d)) digitOwners.set(d, new Set());
    digitOwners.get(d).add(e.id);
  }
}

// ── 코퍼스 (audit-link-coverage 동일) ──
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
const corpus = [];
for (const art of Object.values(articles)) for (const s of art.sections) {
  corpus.push(['article', s.body || '']);
  if (s.table) for (const t of [...s.table.rows.flat(), ...s.table.headers]) corpus.push(['article', t]);
}
for (const t of guideTexts()) corpus.push(['guide', t]);
for (const st of Object.values(stories)) {
  const parts = [...(st.sections ? Object.values(st.sections) : []), ...(st.timeline || []).map((ev) => ev.event)];
  corpus.push(['story', parts.filter(Boolean).join(' ')]);
}

// ── 가드 (A안 가정 매처) ──
const guards = {
  year: (d) => { const v = +d; return d.length === 4 && v >= 1900 && v <= 2100; },
  unitAfter: (after) => /^\s?(°|℃|℉|k\b|K\b|°c|MPa|GPa|MPa급|HV|HB|HRC|HRB|ksi|시간|h\b|hr|%|배|년|월|일|원|톤|kg|g\/|mm|μm|nm|m\/s|회|번|개|ℓ|J\b|W\/)/.test(after),
  unitBefore: (before) => /(약|무려|최대|최소|~|–|—|±|≥|≤|>|<|×|온도|압력|강도|경도|가격|Ch\.?|§|no\.?|No\.?)\s?$/.test(before),
  rangeTie: (before, after) => /[~–—\-]\s?$/.test(before) || /^\s?[~–—]/.test(after),
  decimal: (before, after) => /[.,]\d*$/.test(before) || /^[.,]\d/.test(after),
};

const rows = [];
let totalHits = 0, guarded = 0;
for (const [src, text] of corpus) {
  for (const [d, owners] of digitOwners) {
    let idx = 0;
    while ((idx = text.indexOf(d, idx)) !== -1) {
      const before = text.slice(Math.max(0, idx - 24), idx);
      const after = text.slice(idx + d.length, idx + d.length + 24);
      idx += d.length;
      // 단어 경계: 숫자·영문 인접이면 순숫자 단독 폼이 아님 (예: 41400·S30400·T651)
      if (/[0-9A-Za-z]$/.test(before) || /^[0-9A-Za-z]/.test(after)) continue;
      totalHits++;
      const g = guards.year(d) ? '연도'
        : guards.unitAfter(after) ? '단위후행'
        : guards.unitBefore(before) ? '수식선행'
        : guards.rangeTie(before, after) ? '범위'
        : guards.decimal(before, after) ? '소수'
        : null;
      if (g) { guarded++; continue; }
      rows.push({ d, src, ambiguous: owners.size > 1, ctx: `${before}【${d}】${after}`.replace(/\s+/g, ' ') });
    }
  }
}

// ── 리포트 ──
const byForm = new Map();
for (const r of rows) { if (!byForm.has(r.d)) byForm.set(r.d, []); byForm.get(r.d).push(r); }
const md = [];
md.push('# W17 — 순숫자 자동링크 시뮬레이션 (dry-run)', '');
md.push(`> 생성: ${new Date().toISOString().slice(0, 10)} · 코퍼스: 글로서리 article+표 · Guide.tsx · 스토리`);
md.push(`> 순숫자 후보 폼 ${digitOwners.size}종 · 원시 히트 ${totalHits} · 가드 차단 ${guarded} · **생존 ${rows.length}**`, '');
md.push('## 판정 규칙', '- 생존 히트 중 **오탐(합금 아닌 언급) ≥1 → 봉인 유지** (H6 W1-2 기본값).', '- 정링크 손실분은 B안(canonical 표기 스윕)·C안(명시링크 [[...]])으로 소거.', '');
md.push('## 생존 히트 전수 (수동 판정 대상)', '');
for (const [d, list] of [...byForm.entries()].sort((a, b) => b[1].length - a[1].length)) {
  md.push(`### ${d} — ${list.length}건${list[0].ambiguous ? ' (다중 엔티티 — A안에서도 차단 대상)' : ''}`);
  for (const r of list.slice(0, 20)) md.push(`- [${r.src}] …${r.ctx}…`);
  if (list.length > 20) md.push(`- …외 ${list.length - 20}건`);
  md.push('');
}
fs.writeFileSync(path.join(ROOT, 'docs/audits/pure-digit-sim.md'), md.join('\n') + '\n', 'utf8');
console.log(`순숫자 폼 ${digitOwners.size}종 · 원시 ${totalHits} · 가드 차단 ${guarded} · 생존 ${rows.length}`);
console.log('생존 상위:', [...byForm.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10).map(([d, l]) => `${d}(${l.length})`).join(' '));
console.log('리포트: docs/audits/pure-digit-sim.md');
