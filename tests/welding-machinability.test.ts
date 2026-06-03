/*
 * R71 Sprint E — Unit tests for welding-machinability lib (CET + Machinability rating).
 */
import { describe, it, expect } from 'vitest';
import { computeCET, computeMachinability } from '../client/src/lib/welding-machinability';
import type { Material } from '../client/src/lib/materials';

function mk(over: Partial<Material>): Material {
  return {
    id: 'test', name: 'test alloy', category: 'Metal', subcategory: 'Test',
    process: 'Wrought', manufacturer: '', composition: {}, sources: [],
    ranges: {} as any,
    ...over,
  } as Material;
}

describe('computeCET (IIW Doc IX-1086-87)', () => {
  it('returns null for non-metal categories', () => {
    expect(computeCET(mk({ category: 'Polymer' }))).toBeNull();
    expect(computeCET(mk({ category: 'Ceramic' }))).toBeNull();
    expect(computeCET(mk({ category: 'Composite' }))).toBeNull();
  });
  it('returns null for Al / Cu / Ti / Mg / Ni superalloy', () => {
    expect(computeCET(mk({ subcategory: 'Aluminum - 6xxx' }))).toBeNull();
    expect(computeCET(mk({ subcategory: 'Copper Alloy' }))).toBeNull();
    expect(computeCET(mk({ subcategory: 'Titanium' }))).toBeNull();
    expect(computeCET(mk({ subcategory: 'Nickel Superalloy' }))).toBeNull();
  });
  it('returns low CET for plain mild steel (1018-like)', () => {
    const r = computeCET(mk({
      subcategory: 'Carbon Steel',
      composition: { Fe: 'balance', C: '0.18', Mn: '0.7', Si: '0.2' } as any,
    }));
    expect(r).not.toBeNull();
    expect(r!.cet).toBeLessThan(0.4);
    expect(r!.band).toBe('low');
  });
  it('returns medium CET for 4140-like (Cr-Mo alloy steel)', () => {
    const r = computeCET(mk({
      subcategory: 'Alloy Steel',
      composition: { Fe: 'balance', C: '0.4', Mn: '0.85', Cr: '1.0', Mo: '0.2', Si: '0.25' } as any,
    }));
    expect(r).not.toBeNull();
    expect(r!.cet).toBeGreaterThan(0.4);
  });
});

describe('computeMachinability rating', () => {
  it('returns null for non-metal', () => {
    expect(computeMachinability(mk({ category: 'Polymer' }))).toBeNull();
  });
  it('AISI 1018 → 100 (baseline)', () => {
    const r = computeMachinability(mk({ name: 'AISI 1018', subcategory: 'Carbon Steel' }));
    expect(r?.rating).toBe(100);
    expect(r?.band).toBe('easy');
  });
  it('Inconel 718 → very hard (≤ 20)', () => {
    const r = computeMachinability(mk({ name: 'Inconel 718', subcategory: 'Nickel Superalloy' }));
    expect(r?.rating).toBeLessThanOrEqual(20);
    expect(r?.band).toBe('very_hard');
  });
  it('Al 6061 → easy (≥ 70)', () => {
    const r = computeMachinability(mk({ name: '6061 aluminum', subcategory: 'Aluminum' }));
    expect(r?.rating).toBeGreaterThanOrEqual(70);
    expect(r?.band).toBe('easy');
  });
  it('Ti-6Al-4V → hard (~22)', () => {
    const r = computeMachinability(mk({ name: 'Ti-6Al-4V', subcategory: 'Titanium' }));
    expect(r?.rating).toBeGreaterThanOrEqual(18);
    expect(r?.rating).toBeLessThanOrEqual(30);
  });
});
