/* R148 — Similar/alternative material recommendation tests. */
import { describe, expect, it } from 'vitest';
import { findSimilar } from '../client/src/lib/similar-materials';
import type { Material } from '../client/src/lib/materials';

const M = (overrides: Partial<Material>): Material => ({
  id: 'test-id',
  name: 'Test',
  category: 'Metal',
  subcategory: 'Stainless Steel',
  manufacturer: '',
  process: '',
  density: 7.8,
  yield_strength: 500,
  uts: 600,
  elongation: 20,
  modulus: 200,
  hardness: 250,
  thermal_conductivity: 15,
  composition: {} as Material['composition'],
  popularity: 4.5,
  ...overrides,
});

describe('findSimilar', () => {
  const pool: Material[] = [
    M({ id: 'in718-a', name: 'Inconel 718 — Aged', subcategory: 'Nickel Superalloy', popularity: 5, ranges: { yield_strength: { typical: 1100, n: 1 }, uts: { typical: 1280, n: 1 }, density: { typical: 8.2, n: 1 }, modulus: { typical: 200, n: 1 }, max_service_temp: { typical: 650, n: 1 } } }),
    M({ id: 'in718-b', name: 'Inconel 718 — Annealed', subcategory: 'Nickel Superalloy', popularity: 4, ranges: { yield_strength: { typical: 770, n: 1 }, density: { typical: 8.2, n: 1 } } }),
    M({ id: 'in625', name: 'Inconel 625', subcategory: 'Nickel Superalloy', popularity: 4.5, ranges: { yield_strength: { typical: 415, n: 1 }, uts: { typical: 830, n: 1 }, density: { typical: 8.4, n: 1 }, modulus: { typical: 207, n: 1 }, max_service_temp: { typical: 925, n: 1 } } }),
    M({ id: 'hx', name: 'Hastelloy X', subcategory: 'Nickel Superalloy', popularity: 3.8, ranges: { yield_strength: { typical: 360, n: 1 }, uts: { typical: 770, n: 1 }, density: { typical: 8.22, n: 1 }, max_service_temp: { typical: 1200, n: 1 } } }),
    M({ id: 'al6061', name: 'AA 6061-T6', subcategory: 'Aluminum 6xxx', popularity: 5, ranges: { yield_strength: { typical: 275, n: 1 }, density: { typical: 2.7, n: 1 } } }),
    M({ id: 'low-pop', name: 'Obscure Alloy', popularity: 1.0, subcategory: 'Nickel Superalloy' }),
  ];

  it('returns up to topN suggestions', () => {
    const target = pool[0];
    const r = findSimilar(target, pool, { topN: 3 });
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it('excludes self', () => {
    const target = pool[0];
    const r = findSimilar(target, pool);
    expect(r.every((s) => s.material.id !== target.id)).toBe(true);
  });

  it('excludes same-base-name variants (e.g., other HT variants of same alloy)', () => {
    const target = pool[0]; // Inconel 718 — Aged
    const r = findSimilar(target, pool);
    // Should NOT recommend Inconel 718 — Annealed (same base name)
    expect(r.every((s) => !s.material.name.startsWith('Inconel 718'))).toBe(true);
  });

  it('boosts same-family in distance (sharedFamily=true present)', () => {
    const target = pool[0];
    const r = findSimilar(target, pool);
    // 적어도 하나의 추천은 sharedFamily=true 여야 함 (Ni 계열이 풍부)
    expect(r.some((s) => s.sharedFamily)).toBe(true);
  });

  it('filters out low-popularity', () => {
    const target = pool[0];
    const r = findSimilar(target, pool, { minPopularity: 3.0 });
    expect(r.every((s) => (s.material.popularity || 0) >= 3.0)).toBe(true);
    expect(r.every((s) => s.material.id !== 'low-pop')).toBe(true);
  });

  it('R226m — sorts by property distance ASC (popularity 정렬 폐기)', () => {
    const target = pool[0];
    const r = findSimilar(target, pool);
    const real = r.filter((s) => !s.crossRef); // cross-ref(distance=-1)은 상단 pin
    for (let i = 1; i < real.length; i++) {
      expect(real[i].distance).toBeGreaterThanOrEqual(real[i - 1].distance - 1e-6);
    }
  });

  it('respects sameCategoryOnly default', () => {
    const polymer = M({ id: 'peek', name: 'PEEK', category: 'Polymer', popularity: 5 });
    const metalTarget = pool[0];
    const r = findSimilar(metalTarget, [...pool, polymer]);
    expect(r.every((s) => s.material.category === 'Metal')).toBe(true);
  });

  it('returns property diffs', () => {
    const target = pool[0];
    const r = findSimilar(target, pool);
    if (r.length > 0) {
      expect(Array.isArray(r[0].diffs)).toBe(true);
      // Should be at most 3
      expect(r[0].diffs.length).toBeLessThanOrEqual(3);
    }
  });

  it('marks shared family', () => {
    const target = pool[0];
    const r = findSimilar(target, pool);
    if (r.length > 0) {
      const sameSubcat = r.filter((s) => s.material.subcategory === target.subcategory);
      expect(sameSubcat.every((s) => s.sharedFamily)).toBe(true);
    }
  });

  it('handles empty pool gracefully', () => {
    const r = findSimilar(pool[0], []);
    expect(r).toHaveLength(0);
  });
});
