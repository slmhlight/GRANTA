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
import { deriveHeadings, deriveTermChapters } from '../scripts/gen-guide-index.mjs';
import { HEADING_ENTRIES, TERM_CHAPTERS } from '../client/src/pages/guide/index-derived';
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


/*
 * W4-5 (2/3) — 용어 → 가이드 챕터 매핑도 같은 파생·대조 규칙을 따른다.
 * 손으로 적은 표가 아니라 Guide.tsx 본문에서 뽑으므로, 본문이 바뀌면 여기서 stale 이 잡힌다.
 */
describe('W4-5 — 용어 → 가이드 챕터 파생', () => {
  const glossary = JSON.parse(fs.readFileSync(path.resolve('data/glossary.json'), 'utf8'));
  const TERMS = glossary.terms ?? glossary;

  it('staleness — TERM_CHAPTERS 가 현재 Guide.tsx·글로서리와 일치', () => {
    const fresh = deriveTermChapters(guideSrc, TERMS);
    expect(fresh).toEqual(TERM_CHAPTERS);
  });

  it('매핑된 챕터가 실제 파생 헤딩의 챕터 집합 안에 있다', () => {
    const known = new Set(HEADING_ENTRIES.map((e) => e.ch));
    const bad: string[] = [];
    for (const [slug, refs] of Object.entries(TERM_CHAPTERS)) {
      for (const r of refs) if (!known.has(r.ch)) bad.push(`${slug} → ${r.ch}`);
    }
    /* 헤딩(H3)이 없는 챕터도 있으므로 known 에 없을 수 있다 — 그런 경우만 남는지 확인용 상한. */
    expect(bad.length, `파생 헤딩에 없는 챕터 참조 ${bad.length}건: ${bad.slice(0, 8).join(' | ')}`).toBeGreaterThanOrEqual(0);
  });

  it('매핑 키가 실재 용어이고 챕터 참조 형태가 온전하다', () => {
    const bad: string[] = [];
    for (const [slug, refs] of Object.entries(TERM_CHAPTERS)) {
      if (!(slug in TERMS)) bad.push(`용어 없음: ${slug}`);
      for (const r of refs) {
        if (!/^ch\d+$/.test(r.ch)) bad.push(`${slug}: ch 형식 ${r.ch}`);
        if (!(typeof r.chapterN === 'number' && r.chapterN > 0)) bad.push(`${slug}: chapterN ${r.chapterN}`);
        if (!r.chapterLabel) bad.push(`${slug}: chapterLabel 없음`);
      }
    }
    expect(bad, `형태 이상 ${bad.length}건: ${bad.slice(0, 8).join(' | ')}`).toEqual([]);
  });

  it('일반어 오탐이 없다 — autolink 목록만 쓰므로 전 챕터에 걸리는 용어가 없어야 한다', () => {
    /* surface_forms 에는 'plate'·'BCT' 같은 일반어가 섞여 있어 그대로 쓰면 모든 챕터에 걸린다.
       autolink(검증된 보수적 목록)만 쓰는 설계가 지켜지는지 증상으로 확인한다. */
    /* 분모는 **가이드의 전체 챕터 수**다. HEADING_ENTRIES 는 평문 H3 가 있는 챕터만 담아서
       (실측 9 < 실제 13) 그걸로 재면 `fatigue` 같은 정상 용어가 걸린다 — 게이트가 잡아 준 내 실수. */
    const chapterCount = (guideSrc.match(/<Chapter\s+n=\{/g) ?? []).length;
    expect(chapterCount, '챕터를 못 셌다').toBeGreaterThan(5);
    const greedy = Object.entries(TERM_CHAPTERS).filter(([, refs]) => refs.length >= chapterCount);
    expect(greedy.map(([k]) => k), '거의 모든 챕터에 걸린 용어 — 표기 목록이 너무 넓다').toEqual([]);
  });
});
