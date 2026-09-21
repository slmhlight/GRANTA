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

  it('R226n — 상대 인기도 필터 (현재보다 1.0↓ 재료 배제, 절대값 아님)', () => {
    // 인기도 5.0 재료 A, 이웃: B(4.5, 통과) · C(3.9, 배제 <4.0) · D(4.0, 경계 통과)
    const hi = M({ id: 'A', name: 'Alloy A', popularity: 5.0, subcategory: 'X', ranges: { yield_strength: { typical: 500, n: 1 }, density: { typical: 7.8, n: 1 } } });
    const near = M({ id: 'B', name: 'Alloy B', popularity: 4.5, subcategory: 'X', ranges: { yield_strength: { typical: 510, n: 1 }, density: { typical: 7.8, n: 1 } } });
    const drop = M({ id: 'C', name: 'Alloy C', popularity: 3.9, subcategory: 'X', ranges: { yield_strength: { typical: 505, n: 1 }, density: { typical: 7.8, n: 1 } } });
    const edge = M({ id: 'D', name: 'Alloy D', popularity: 4.0, subcategory: 'X', ranges: { yield_strength: { typical: 508, n: 1 }, density: { typical: 7.8, n: 1 } } });
    const r = findSimilar(hi, [hi, near, drop, edge]);
    const ids = r.map((s) => s.material.id);
    expect(ids).toContain('B');
    expect(ids).toContain('D');       // 4.0 == 5.0-1.0 경계 → 통과
    expect(ids).not.toContain('C');   // 3.9 < 4.0 → 배제
    // 니치 재료(현재 자체가 저인기)면 관대: 인기 1.5 재료의 이웃 1.2 는 통과
    const niche = M({ id: 'N', name: 'Niche', popularity: 1.5, subcategory: 'X', ranges: { yield_strength: { typical: 500, n: 1 }, density: { typical: 7.8, n: 1 } } });
    const nb = M({ id: 'NB', name: 'Niche B', popularity: 1.2, subcategory: 'X', ranges: { yield_strength: { typical: 505, n: 1 }, density: { typical: 7.8, n: 1 } } });
    expect(findSimilar(niche, [niche, nb]).map((s) => s.material.id)).toContain('NB');
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

/* E11 확장(2026-09-22) — 그룹 다양성 슬롯: 상세 카드가 한 용도 그룹뿐이면 타그룹 최근접 1 을 상세 마지막으로. */
describe('withDiversitySlot (E11)', () => {
  const mk = (id: string, insight: string | null, distance: number, crossRef = false) =>
    ({ material: M({ id, name: id, profiles: insight ? { insight } : undefined } as never), distance, sharedFamily: false, crossRef, diffs: [] });
  it('상세 3 이 전부 같은 그룹이고 compact 에 타그룹이 있으면 최근접 타그룹을 상세 마지막으로 끌어올리고, 밀린 후보는 compact 첫 자리', async () => {
    const { withDiversitySlot } = await import('../client/src/lib/similar-materials');
    const target = M({ id: 't', profiles: { insight: 'stainless' } } as never);
    const list = [mk('a', 'stainless', 0.1), mk('b', 'stainless', 0.2), mk('c', 'stainless', 0.3), mk('d', 'stainless', 0.4), mk('e', 'titanium', 0.5), mk('f', 'aluminum', 0.6)];
    const out = withDiversitySlot(list, target, 3);
    expect(out.map((s) => s.material.id)).toEqual(['a', 'b', 'e', 'c', 'd', 'f']);
    expect(out[2].diversitySlot).toBe(true);
    expect(out[3].diversitySlot).toBeUndefined();
  });
  it('상세에 이미 타그룹이 있으면 그대로 · 타그룹이 없어도 그대로 · 마지막 자리가 cross-ref pin 이면 그 앞을 쓴다', async () => {
    const { withDiversitySlot } = await import('../client/src/lib/similar-materials');
    const target = M({ id: 't', profiles: { insight: 'stainless' } } as never);
    const already = [mk('a', 'stainless', 0.1), mk('b', 'titanium', 0.2), mk('c', 'stainless', 0.3), mk('d', 'aluminum', 0.4)];
    expect(withDiversitySlot(already, target, 3).map((s) => s.material.id)).toEqual(['a', 'b', 'c', 'd']);
    const none = [mk('a', 'stainless', 0.1), mk('b', 'stainless', 0.2), mk('c', 'stainless', 0.3), mk('d', 'stainless', 0.4)];
    expect(withDiversitySlot(none, target, 3).map((s) => s.material.id)).toEqual(['a', 'b', 'c', 'd']);
    const pinned = [mk('a', 'stainless', 0.1), mk('b', 'stainless', 0.2), mk('x', 'stainless', -1, true), mk('d', 'titanium', 0.4)];
    // cross-ref 는 findSimilar 가 맨 앞에 두지만, 슬롯 계산은 위치 기준이라 마지막 자리 pin 을 존중해 그 앞(b)을 내준다
    expect(withDiversitySlot(pinned, target, 3).map((s) => s.material.id)).toEqual(['a', 'd', 'x', 'b']);
  });
});
