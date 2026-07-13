/*
 * H5-D2 (W6+) — Guide 검색의 글로서리 용어 자동 파생 게이트.
 * GLOSSARY.terms 가 SSOT: 신규 용어 추가 시 무손질로 검색 편입되는지 + termSlug(/guide/term/:slug) 무결성.
 */
import { describe, it, expect } from 'vitest';
import { searchGuide, GLOSSARY_ENTRIES } from '../client/src/pages/guide/index-entries';
import { GLOSSARY } from '../client/src/lib/glossary';

describe('Guide 검색 — 글로서리 자동 파생 (W6+)', () => {
  it('모든 글로서리 용어가 검색 엔트리로 파생 (수동 목록 이중관리 제거)', () => {
    expect(GLOSSARY_ENTRIES.length).toBe(Object.keys(GLOSSARY.terms).length);
  });

  it('모든 term 엔트리의 termSlug 는 실재 글로서리 용어', () => {
    const bad = GLOSSARY_ENTRIES.filter((e) => !e.termSlug || !GLOSSARY.terms[e.termSlug]);
    expect(bad.map((e) => e.section), 'termSlug 무결성').toEqual([]);
  });

  it('신규·특수 용어가 display·surface·약어 어느 표기로도 검색됨', () => {
    const cases: Array<[string, string]> = [
      ['쉐플러', 'schaeffler-diagram'],
      ['schaeffler', 'schaeffler-diagram'],
      ['ahss', 'ahss'],
      ['초고장력강', 'ahss'],
      ['베이나이트', 'bainite'],
      ['bainite', 'bainite'],
      ['엘라스토머', 'elastomer'],
      ['tpu', 'elastomer'],
      ['백주철', 'white-cast-iron'],
      ['마르텐사이트', 'martensite'],
    ];
    for (const [q, slug] of cases) {
      const hit = searchGuide(q).some((e) => e.termSlug === slug);
      expect(hit, `"${q}" → ${slug} 미검색`).toBe(true);
    }
  });

  it('term 검색 결과는 /guide/term/:slug 이동용 termSlug 보유', () => {
    const term = searchGuide('마르텐사이트').find((e) => e.termSlug === 'martensite');
    expect(term?.termSlug).toBe('martensite');
  });

  it('챕터 검색은 여전히 동작 (Ashby → ch6, term 아님)', () => {
    expect(searchGuide('ashby').some((e) => !e.termSlug && e.ch === 'ch6')).toBe(true);
  });

  it('결과는 최대 12개', () => {
    expect(searchGuide('강').length).toBeLessThanOrEqual(12);
  });
});
