/*
 * H6 W3-5 (H8) — 가이드 검색 인덱스 게이트.
 *
 * index-derived.ts 는 Guide.tsx 에서 생성해 커밋한 산출물이다(런타임 JSX 파싱 불가).
 * 여기서 **Guide.tsx 로부터 재파생해 대조**하므로, 챕터·헤딩을 고치고 재생성하지 않으면 실패한다.
 *   재생성: node scripts/gen-guide-index.mjs
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { deriveHeadings } from '../scripts/gen-guide-index.mjs';
import { HEADING_ENTRIES } from '../client/src/pages/guide/index-derived';
import { GUIDE_INDEX, GLOSSARY_ENTRIES, searchGuide } from '../client/src/pages/guide/index-entries';

const ROOT = path.resolve(__dirname, '..');
const guideSrc = fs.readFileSync(path.join(ROOT, 'client', 'src', 'pages', 'Guide.tsx'), 'utf8');

describe('가이드 검색 인덱스 — 헤딩 자동 파생 (H8)', () => {
  it('staleness — index-derived.ts 가 현재 Guide.tsx 와 일치', () => {
    const fresh = deriveHeadings(guideSrc);
    expect(fresh.length).toBe(HEADING_ENTRIES.length);
    expect(fresh).toEqual(HEADING_ENTRIES);
  });

  it('Guide.tsx 의 평문 H3 헤딩은 전부 파생돼 있다', () => {
    const all = [...guideSrc.matchAll(/<H3>([^<>{}]{2,90})<\/H3>/g)].map((m) => m[1].trim().replace(/\s+/g, ' '));
    const covered = new Set(HEADING_ENTRIES.map((e) => e.section));
    expect(all.filter((h) => !covered.has(h))).toEqual([]);
  });

  it('파생 엔트리 스키마 — ch·chapterN·section·keywords·snippet 필수', () => {
    const bad = HEADING_ENTRIES.filter(
      (e) => !e.ch || !Number.isFinite(e.chapterN) || !e.section || !e.keywords?.length || !e.snippet,
    );
    expect(bad.map((e) => e.section)).toEqual([]);
  });

  it('검색이 실제로 본문 헤딩을 찾는다 (회귀)', () => {
    /* 파생 전에는 수동 인덱스에 없어 검색되지 않던 헤딩들 */
    for (const q of ['좌굴', 'von Mises', 'Larson', '빌드 방향', 'Basquin']) {
      const hits = searchGuide(q);
      expect(hits.length, `"${q}" 검색 결과 없음`).toBeGreaterThan(0);
    }
  });

  it('중복 표시 없음 — 수동 엔트리와 같은 (ch, section) 은 파생에서 제외', () => {
    const manual = new Set(GUIDE_INDEX.map((e) => `${e.ch}|${e.section || ''}`));
    const dup = HEADING_ENTRIES.filter((e) => manual.has(`${e.ch}|${e.section || ''}`))
      .filter((e) => searchGuide(e.section!).filter((r) => r.section === e.section && r.ch === e.ch).length > 1);
    expect(dup.map((e) => e.section)).toEqual([]);
  });

  it('글로서리 용어는 계속 자동 파생 (SSOT = GLOSSARY.terms)', () => {
    expect(GLOSSARY_ENTRIES.length).toBeGreaterThanOrEqual(120);
    expect(GLOSSARY_ENTRIES.every((e) => !!e.termSlug)).toBe(true);
  });
});
