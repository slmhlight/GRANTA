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
const GUIDE = path.join(ROOT, 'client', 'src', 'pages', 'Guide.tsx');
const OUT = path.join(ROOT, 'client', 'src', 'pages', 'guide', 'index-derived.ts');

/** Guide.tsx → [{ ch, chapterN, chapterLabel, section, keywords, snippet }] */
export function deriveHeadings(src) {
  const out = [];
  /* <Chapter n={N} id="chX" title="..." 를 순서대로 찾고, 다음 Chapter 시작 전까지를 그 챕터 본문으로 본다. */
  const chapRe = /<Chapter\s+n=\{(\d+)\}\s+id="([^"]+)"\s+title="([^"]+)"/g;
  const chaps = [];
  let m;
  while ((m = chapRe.exec(src))) chaps.push({ n: Number(m[1]), id: m[2], title: m[3], at: m.index });
  for (const [i, c] of chaps.entries()) {
    const end = i + 1 < chaps.length ? chaps[i + 1].at : src.length;
    const body = src.slice(c.at, end);
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
const src = fs.readFileSync(GUIDE, 'utf8');
const entries = deriveHeadings(src);
const banner = `/* 자동 생성 — 수정하지 말 것. 재생성: node scripts/gen-guide-index.mjs
 * SSOT 는 client/src/pages/Guide.tsx 의 <Chapter> · <H3> 구조이며,
 * tests/guide-index.test.ts 가 재파생 대조로 stale 을 막는다. */
import type { GuideIndexEntry } from './index-entries';

export const HEADING_ENTRIES: GuideIndexEntry[] = ${JSON.stringify(entries, null, 2)};
`;
fs.writeFileSync(OUT, banner, 'utf8');
console.log(`가이드 헤딩 파생 ${entries.length}건 → ${path.relative(ROOT, OUT)}`);
const byCh = {};
for (const e of entries) byCh[e.ch] = (byCh[e.ch] || 0) + 1;
console.log('챕터별:', Object.entries(byCh).map(([k, v]) => `${k}:${v}`).join(' · '));
}
