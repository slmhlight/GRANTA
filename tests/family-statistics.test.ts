/*
 * R210 B3 — family-statistics tier 분류 경계값 테스트.
 */
import { describe, it, expect } from 'vitest';
import { getStrengthTier, getDensityTier, getDuctilityTier } from '@/lib/family-statistics';

describe('getStrengthTier (yield strength)', () => {
  it.each([
    [null, 'Unknown'], [0, 'Low'], [199, 'Low'], [200, 'Medium'], [499, 'Medium'],
    [500, 'High'], [999, 'High'], [1000, 'Ultra-High'], [2000, 'Ultra-High'],
  ])('%s → %s', (input, expected) => {
    expect(getStrengthTier(input as number | null)).toBe(expected);
  });
});

describe('getDensityTier', () => {
  it.each([
    [null, 'Unknown'], [2.7, 'Lightweight'], [2.99, 'Lightweight'],
    [3, 'Medium'], [7.99, 'Medium'], [8, 'Heavy'], [19.3, 'Heavy'],
  ])('%s → %s', (input, expected) => {
    expect(getDensityTier(input as number | null)).toBe(expected);
  });
});

describe('getDuctilityTier (elongation)', () => {
  it.each([
    [null, 'Unknown'], [1.9, 'Brittle'], [2, 'Low'], [9.9, 'Low'],
    [10, 'Medium'], [24.9, 'Medium'], [25, 'High'], [50, 'High'],
  ])('%s → %s', (input, expected) => {
    expect(getDuctilityTier(input as number | null)).toBe(expected);
  });
});
