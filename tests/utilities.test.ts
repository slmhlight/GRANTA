/* R155b — Utility helpers unit test (scripts/lib/utilities.mjs).
 *
 * Coverage: num · baseName · norm · round · smartRound · rangeFrom · uniq · mostCommon ·
 *           mostCommonKnown · dedupeSources · dominantElement
 */
import { describe, expect, it } from 'vitest';
import {
  num,
  baseName,
  norm,
  round,
  smartRound,
  rangeFrom,
  uniq,
  mostCommon,
  mostCommonKnown,
  dedupeSources,
  dominantElement,
} from '../scripts/pipeline/utilities.mjs';

/* ───────── num ───────── */

describe('num', () => {
  it('parses valid numbers', () => {
    expect(num('123')).toBe(123);
    expect(num('-1.5')).toBe(-1.5);
    expect(num(42)).toBe(42);
    expect(num('1e3')).toBe(1000);
  });

  it('returns null for empty / null / non-numeric', () => {
    expect(num('')).toBeNull();
    expect(num(null)).toBeNull();
    expect(num(undefined)).toBeNull();
    expect(num('abc')).toBeNull();
    expect(num(NaN)).toBeNull();
    expect(num(Infinity)).toBeNull();
  });
});

/* ───────── baseName ───────── */

describe('baseName', () => {
  it('strips paren content', () => {
    expect(baseName('Inconel 718 (UNS N07718)')).toBe('Inconel 718');
    expect(baseName('17-4 PH (S17400, AISI 630)')).toBe('17-4 PH');
  });

  it('returns name unchanged if no paren', () => {
    expect(baseName('Plain name')).toBe('Plain name');
  });

  it('trims whitespace', () => {
    expect(baseName('  Padded (info)  ')).toBe('Padded');
  });
});

/* ───────── norm ───────── */

describe('norm', () => {
  it('lowercases + strips non-alphanumeric', () => {
    expect(norm('Inconel-718!')).toBe('inconel718');
    expect(norm('Ti-6Al-4V')).toBe('ti6al4v');
    expect(norm('AA 6061-T6')).toBe('aa6061t6');
  });

  it('handles empty / undefined gracefully', () => {
    expect(norm('')).toBe('');
    expect(norm(null)).toBe('');
    expect(norm(undefined)).toBe('');
  });
});

/* ───────── round / smartRound ───────── */

describe('round', () => {
  it('rounds to specified decimal places', () => {
    expect(round(3.14159, 2)).toBe(3.14);
    expect(round(3.14159, 4)).toBe(3.1416);
    expect(round(100, 0)).toBe(100);
  });

  it('default 2 decimals', () => {
    expect(round(3.14159)).toBe(3.14);
  });

  it('null in → null out', () => {
    expect(round(null)).toBeNull();
    expect(round(undefined)).toBeNull();
  });
});

describe('smartRound', () => {
  it('uses 4 decimals for very small values (<0.01)', () => {
    expect(smartRound(0.002)).toBe(0.002);
    expect(smartRound(0.0035)).toBe(0.0035);
  });

  it('uses 3 decimals for small values (<1)', () => {
    expect(smartRound(0.5)).toBe(0.5);
    expect(smartRound(0.123)).toBe(0.123);
  });

  it('uses 2 decimals for medium values (<100)', () => {
    expect(smartRound(7.85)).toBe(7.85);
    expect(smartRound(99.99)).toBe(99.99);
  });

  it('uses 1 decimal for large values (≥100)', () => {
    expect(smartRound(1234.5)).toBe(1234.5);
    expect(smartRound(1500)).toBe(1500);
  });

  it('handles negative numbers (abs precision)', () => {
    expect(smartRound(-0.002)).toBe(-0.002);
  });

  it('null in → null out', () => {
    expect(smartRound(null)).toBeNull();
    expect(smartRound(undefined)).toBeNull();
  });
});

/* ───────── rangeFrom ───────── */

describe('rangeFrom', () => {
  it('returns null for empty / no-positive values', () => {
    expect(rangeFrom([])).toBeNull();
    expect(rangeFrom([null, undefined, ''])).toBeNull();
    expect(rangeFrom([0, -1, -100])).toBeNull(); // only positive
  });

  it('computes min/max/typical/n for measured data', () => {
    const r = rangeFrom([100, 200, 300, 400, 500]);
    expect(r).not.toBeNull();
    expect(r!.min).toBe(100);
    expect(r!.max).toBe(500);
    expect(r!.typical).toBe(300); // median
    expect(r!.n).toBe(5);
    expect(r!.confidence).toBe('measured'); // n >= 3
  });

  it('low n → handbook confidence default', () => {
    const r = rangeFrom([100, 200]);
    expect(r!.confidence).toBe('handbook'); // n < 3
  });

  it('respects explicit confidence override', () => {
    const r = rangeFrom([100, 200, 300], 'class');
    expect(r!.confidence).toBe('class');
  });

  it('sorts mixed unsorted input', () => {
    const r = rangeFrom([500, 100, 300, 200, 400]);
    expect(r!.min).toBe(100);
    expect(r!.max).toBe(500);
    expect(r!.typical).toBe(300);
  });

  it('filters out non-numeric / zero / negative', () => {
    const r = rangeFrom([100, 'abc', null, 0, -50, 200]);
    expect(r!.min).toBe(100);
    expect(r!.max).toBe(200);
    expect(r!.n).toBe(2);
  });
});

/* ───────── uniq / mostCommon ───────── */

describe('uniq', () => {
  it('returns unique values', () => {
    expect(uniq([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
  });

  it('filters falsy', () => {
    expect(uniq([1, null, 2, '', 3, undefined, 4])).toEqual([1, 2, 3, 4]);
  });
});

describe('mostCommon', () => {
  it('returns the most frequent element', () => {
    expect(mostCommon(['a', 'b', 'a', 'c', 'a', 'b'])).toBe('a');
  });

  it('returns first on tie', () => {
    const r = mostCommon(['a', 'b']);
    expect(['a', 'b']).toContain(r);
  });
});

describe('mostCommonKnown', () => {
  it('excludes Unknown and 0', () => {
    expect(mostCommonKnown(['Unknown', '0', 'A', 'B', 'A'])).toBe('A');
  });

  it('returns null if all are Unknown/0/empty', () => {
    expect(mostCommonKnown(['Unknown', '0', '', null])).toBeNull();
  });
});

/* ───────── dedupeSources ───────── */

describe('dedupeSources', () => {
  it('dedupes by label', () => {
    const a = { label: 'A', url: 'u1' };
    const b = { label: 'B', url: 'u2' };
    const a2 = { label: 'A', url: 'u3' };
    const r = dedupeSources([a, b, a2]);
    expect(r).toHaveLength(2);
    expect(r[0]).toBe(a);
    expect(r[1]).toBe(b);
  });

  it('filters out null / no-label', () => {
    expect(dedupeSources([null, { url: 'no label' }, undefined])).toHaveLength(0);
  });
});

/* ───────── dominantElement ───────── */

describe('dominantElement', () => {
  it('finds element with highest pct value', () => {
    expect(dominantElement({ Fe: 60, Cr: 20, Ni: 10 })).toBe('Fe');
  });

  it('treats "balance" as 100', () => {
    expect(dominantElement({ Cr: 18, Ni: 8, Fe: 'balance' })).toBe('Fe');
  });

  it('parses range strings (e.g., "10-12") via max', () => {
    expect(dominantElement({ Cr: '17-19', Ni: '8-10', Fe: 'balance' })).toBe('Fe');
    // Cr 19 > Ni 10
    expect(dominantElement({ Cr: '17-19', Ni: '8-10' })).toBe('Cr');
  });

  it('returns null for empty composition', () => {
    expect(dominantElement({})).toBeNull();
    expect(dominantElement(null)).toBeNull();
    expect(dominantElement(undefined)).toBeNull();
  });
});
