/*
 * R71 Sprint E — fuzzyContains subsequence + separator-strip matcher.
 * R157b — function extracted to lib/fuzzy-search.ts → 직접 import 검증.
 */
import { describe, it, expect } from 'vitest';
import { fuzzyContains } from '../client/src/lib/fuzzy-search';

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
