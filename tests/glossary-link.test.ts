/*
 * R227/E14/H4b — 용어 자동링크 매처 정밀도 게이트 (KO 경계·동음이의).
 * 실제 glossary.json 폼으로 검증 — 한글 조사경계/동음이의가 핵심 리스크.
 */
import { describe, it, expect } from 'vitest';
import { findTermSpans, linkifyTerms } from '@/lib/glossary-link';

const linkedSlugs = (text: string) => findTermSpans(text).map((s) => s.slug);
const linkedForms = (text: string) => findTermSpans(text).map((s) => text.slice(s.start, s.end));

describe('glossary-link — 한글 조사 경계', () => {
  it('조사가 붙어도 용어를 링크 ("마르텐사이트로")', () => {
    expect(linkedSlugs('오스테나이트를 급랭하면 마르텐사이트로 변태한다')).toContain('martensite');
    expect(linkedForms('마르텐사이트로 변태')).toContain('마르텐사이트');
  });
  it('접미(계) 앞에서도 용어만 링크 ("오스테나이트계")', () => {
    const spans = findTermSpans('오스테나이트계 스테인리스강');
    expect(spans.some((s) => s.slug === 'austenite')).toBe(true);
    // "오스테나이트" 만 링크(계 제외)
    expect(spans.find((s) => s.slug === 'austenite')?.end).toBe('오스테나이트'.length);
  });
  it('합성어 중간(앞이 한글)은 링크 안 함 ("고강도마르텐사이트")', () => {
    expect(linkedSlugs('고강도마르텐사이트 조직')).not.toContain('martensite');
  });
});

describe('glossary-link — 동음이의 가드', () => {
  it('"단조로운"(monotonous) 은 단조(forging) 로 링크 안 함', () => {
    expect(linkedSlugs('단조로운 표면 처리')).not.toContain('forging');
  });
  it('"단조 공정" 은 단조 링크', () => {
    expect(linkedSlugs('단조 공정으로 성형')).toContain('forging');
  });
  it('동음이의(공식·공정) 는 autolink 제외 → 매칭 없음', () => {
    expect(linkedSlugs('공식 유도 · 제조 공정')).toEqual([]);
  });
});

describe('glossary-link — 라틴 경계', () => {
  it('영단어 경계로 매칭 ("creep")', () => {
    expect(linkedSlugs('creep resistance at high temp')).toContain('creep');
  });
  it('부분문자열 오탐 없음 ("creepy" 는 creep 아님)', () => {
    expect(linkedSlugs('a creepy result')).not.toContain('creep');
  });
});

describe('glossary-link — 중첩·첫등장', () => {
  it('블록당 첫 등장만 링크', () => {
    const spans = findTermSpans('피로 파괴는 피로 하중에서 온다');
    expect(spans.filter((s) => s.slug === 'fatigue').length).toBe(1);
  });
  it('최장 우선 (잔류 오스테나이트 > 오스테나이트)', () => {
    const spans = findTermSpans('잔류 오스테나이트가 남는다');
    // retained-austenite 로 링크(오스테나이트 별도 아님)
    expect(spans.some((s) => s.slug === 'retained-austenite')).toBe(true);
    expect(spans.filter((s) => s.slug === 'austenite').length).toBe(0);
  });
  it('seen 공유 시 블록 간 첫등장 유지', () => {
    const seen = new Set<string>();
    findTermSpans('크리프 변형', seen);
    expect(findTermSpans('크리프 파단', seen).some((s) => s.slug === 'creep')).toBe(false);
  });
});

describe('glossary-link — linkifyTerms 노드', () => {
  it('용어를 term 노드로, 나머지는 무손실 text', () => {
    const nodes = linkifyTerms('마르텐사이트는 단단하다');
    expect(nodes.map((n) => n.s).join('')).toBe('마르텐사이트는 단단하다'); // 무손실
    const term = nodes.find((n) => n.t === 'term');
    expect(term && term.t === 'term' && term.slug).toBe('martensite');
  });
});
