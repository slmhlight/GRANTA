/*
 * H6 W3-5 (H8) — 가이드 검색 인덱스의 **챕터 헤딩 자동 파생**.
 *
 * 배경: GUIDE_INDEX 는 수동 42 엔트리인데 Guide.tsx 의 H3 헤딩은 41개이고 그중 4개만 덮여 있었다.
 * 글로서리는 이미 GLOSSARY.terms 에서 자동 파생되므로, 남은 수동 영역이 챕터 본문이었다.
 *
 * 설계: 런타임에 JSX 를 파싱할 수 없으므로 **개발 시점에 생성해 커밋**하고,
 *       tests/guide-index.test.ts 가 Guide.tsx 로부터 재파생해 대조한다(stale 이면 실패).
 *       → 새 챕터·헤딩을 추가하면 게이트가 재생성을 강제한다.
 *
 * 실행: node scripts/gen-guide-index.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { guideChapters } from './lib/guide-sources.mjs';
const OUT = path.join(ROOT, 'client', 'src', 'pages', 'guide', 'index-derived.ts');

/** Guide.tsx → [{ ch, chapterN, chapterLabel, section, keywords, snippet }] */
export function deriveHeadings() {
  const out = [];
  /* F1 — 챕터 메타데이터는 Guide.tsx 의 <Chapter> 태그, 본문은 chapters/<id>.tsx.
     통짜 텍스트로 자르면 챕터 경계가 사라진다(헤딩이 전부 마지막 챕터로 귀속됐다). */
  for (const c of guideChapters()) {
    const body = c.body;
    /* 텍스트만 있는 H3 만 취한다 — JSX 가 섞인 헤딩은 신뢰할 수 없어 건너뛴다. */
    for (const h of body.matchAll(/<H3>([^<>{}]{2,90})<\/H3>/g)) {
      const raw = h[1].trim().replace(/\s+/g, ' ');
      if (!raw) continue;
      out.push({
        ch: c.id,
        chapterN: c.n,
        chapterLabel: c.title.split(' — ')[0].trim(),
        section: raw,
        keywords: keywordsOf(raw),
        snippet: `Ch.${c.n} ${c.title.split(' — ')[0].trim()} › ${raw}`,
      });
    }
  }
  return out;
}

/**
 * W4-5 (2/3) — 용어 → **그 용어를 실제로 다루는 가이드 챕터** 파생.
 *
 * 용어 페이지에서 "더 배우려면 어디로" 가 없었다. 매핑을 127개 손으로 적으면 본문이 바뀔 때
 * 조용히 낡는다 — 그래서 **본문에서 뽑는다**.
 *
 * 표기는 `autolink`(글로서리가 이미 검증한 보수적 목록)만 쓴다. `surface_forms` 에는
 * 'plate'·'BCT' 같은 일반어가 섞여 있어 아무 챕터에나 걸린다.
 * 한글은 경계가 없어 그대로 찾고, 영문은 단어 경계를 요구한다.
 */
export function deriveTermChapters(terms) {
  const bodies = guideChapters().map((c) => ({
    ch: c.id,
    chapterN: c.n,
    chapterLabel: c.title.split(' — ')[0].trim(),
    body: c.body,
  }));

  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const out = {};
  for (const [slug, t] of Object.entries(terms)) {
    if (slug.startsWith('_')) continue;
    const forms = (t && t.autolink) || [];
    if (!forms.length) continue;
    const hits = [];
    for (const b of bodies) {
      const found = forms.some((f) => {
        const s2 = String(f).trim();
        if (s2.length < 2) return false;
        const re = /^[A-Za-z]/.test(s2) ? new RegExp('\b' + esc(s2) + '\b', 'i') : new RegExp(esc(s2));
        return re.test(b.body);
      });
      if (found) hits.push({ ch: b.ch, chapterN: b.chapterN, chapterLabel: b.chapterLabel });
    }
    if (hits.length) out[slug] = hits;
  }
  return out;
}

/** 헤딩 → 검색 키워드. 번호·구분자를 떼고 토큰화하며, 영문 단어는 소문자도 함께 넣는다. */
function keywordsOf(heading) {
  const stripped = heading.replace(/^\d+(?:\.\d+)*\s*/, '');
  const tokens = stripped
    .split(/[\s·—–\-()[\]{}"'`,/|→+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  const set = new Set([stripped, ...tokens]);
  for (const t of tokens) if (/^[A-Za-z]/.test(t)) set.add(t.toLowerCase());
  return [...set].filter(Boolean);
}

/* 테스트는 deriveHeadings 만 import 한다 — 직접 실행일 때만 파일을 쓴다(import 부수효과 금지). */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!isMain) { /* 모듈로 불러온 경우 여기서 끝 */ } else {
const entries = deriveHeadings();
const glossary = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'glossary.json'), 'utf8'));
const termChapters = deriveTermChapters(glossary.terms || glossary);
const banner = `/* 자동 생성 — 수정하지 말 것. 재생성: node scripts/gen-guide-index.mjs
 * SSOT 는 client/src/pages/Guide.tsx 의 <Chapter> · <H3> 구조이며,
 * tests/guide-index.test.ts 가 재파생 대조로 stale 을 막는다. */
import type { GuideIndexEntry } from './index-entries';

export const HEADING_ENTRIES: GuideIndexEntry[] = ${JSON.stringify(entries, null, 2)};

/** W4-5 — 용어 slug → 그 용어를 다루는 가이드 챕터. Guide.tsx 본문에서 파생(손으로 적지 않는다). */
export interface TermChapterRef { ch: string; chapterN: number; chapterLabel: string }
export const TERM_CHAPTERS: Record<string, TermChapterRef[]> = ${JSON.stringify(termChapters, null, 2)};
`;
fs.writeFileSync(OUT, banner, 'utf8');
console.log(`가이드 헤딩 파생 ${entries.length}건 → ${path.relative(ROOT, OUT)}`);
const byCh = {};
for (const e of entries) byCh[e.ch] = (byCh[e.ch] || 0) + 1;
console.log('챕터별:', Object.entries(byCh).map(([k, v]) => `${k}:${v}`).join(' · '));
const tc = Object.keys(termChapters).length;
console.log(`용어→챕터 파생: ${tc} 용어 (평균 ${(Object.values(termChapters).reduce((a, b) => a + b.length, 0) / (tc || 1)).toFixed(1)} 챕터)`);
}
