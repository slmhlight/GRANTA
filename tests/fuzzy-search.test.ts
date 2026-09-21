/*
 * R71 Sprint E — fuzzyContains subsequence + separator-strip matcher.
 * R157b — function extracted to lib/fuzzy-search.ts → 직접 import 검증.
 */
import { describe, it, expect } from 'vitest';
import { fuzzyContains, fuzzyRank } from '../client/src/lib/fuzzy-search';

describe('fuzzyContains (Sprint 2 A3)', () => {
  it('exact substring matches', () => {
    expect(fuzzyContains('inconel 718', 'inconel')).toBe(true);
    expect(fuzzyContains('316l stainless', '316l')).toBe(true);
  });
  it('separator-stripped substring', () => {
    expect(fuzzyContains('ti-6al-4v', 'ti6al4v')).toBe(true);
    expect(fuzzyContains('17-4 ph', '174ph')).toBe(true);
  });
  it('subsequence (≥3 chars) — ss316 → stainless steel 316L', () => {
    expect(fuzzyContains('stainless steel 316l', 'ss316')).toBe(true);
  });
  it('1-char query falls back to substring only (no subsequence)', () => {
    // 'a' is in 'alloy' (exact), so true. But 'z' is not, and 1-char never triggers subsequence.
    expect(fuzzyContains('alloy', 'a')).toBe(true);
    expect(fuzzyContains('alloy', 'z')).toBe(false);
  });
  it('rejects garbage', () => {
    expect(fuzzyContains('inconel 718', 'zzzqqq')).toBe(false);
  });
  it('empty text → false', () => {
    expect(fuzzyContains('', 'inconel')).toBe(false);
  });
});

describe('fuzzyRank — 관련도 등급 (AUD R09)', () => {
  it('정확 부분문자열 0 · 구분자 제거 1 · 부분수열 2 · 불일치 −1', () => {
    expect(fuzzyRank('aa 7075 — t6', '7075')).toBe(0);
    expect(fuzzyRank('ti-6al-4v', 'ti6al4v')).toBe(1);
    expect(fuzzyRank('ti-6al-4v', 'tialv')).toBe(2);
    expect(fuzzyRank('inconel 718', 'monel')).toBe(-1);
  });
  it("순숫자 질의는 부분수열을 쓰지 않는다 — '7075' 가 '17-4 PH H1075'·'Cupronickel 70/30' 을 끌어오던 오탐", () => {
    expect(fuzzyRank('17-4 ph — h1075', '7075')).toBe(-1);
    expect(fuzzyRank('cupronickel 70/30 (c71500)', '7075')).toBe(-1);
    expect(fuzzyRank('aa 7075 — t73', '7075')).toBe(0);
  });
});
