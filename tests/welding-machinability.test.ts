/*
 * R71 Sprint E — Unit tests for welding-machinability lib (CET + Machinability rating).
 */
import { describe, it, expect } from 'vitest';
import { computeCET, computeMachinability, computePolymerMachinability, machiningCostBand } from '../client/src/lib/welding-machinability';
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
  /* R205 F3 — 표준 baseline 은 AISI 1212=100%. 1018 은 ~70% (Machining Data Handbook). */
  it('AISI 1018 → 70 (MDH, 1212=100 기준)', () => {
    const r = computeMachinability(mk({ name: 'AISI 1018', subcategory: 'Carbon Steel' }));
    expect(r?.rating).toBe(70);
    expect(r?.band).toBe('easy');
  });
  it('12L14 free-machining → 100', () => {
    const r = computeMachinability(mk({ name: '12L14 (free-machining)', subcategory: 'Carbon Steel' }));
    expect(r?.rating).toBe(100);
  });
  it('Inconel 718 → very hard (≤ 20)', () => {
    const r = computeMachinability(mk({ name: 'Inconel 718', subcategory: 'Nickel Superalloy' }));
    expect(r?.rating).toBeLessThanOrEqual(20);
    expect(r?.band).toBe('very_hard');
  });
  /* R205 F4 — 6061-T6 는 MDH ~50-60% (normal). 이전 'easy ≥70' 은 과대. */
  it('Al 6061 → normal (~60)', () => {
    const r = computeMachinability(mk({ name: '6061 aluminum', subcategory: 'Aluminum' }));
    expect(r?.rating).toBe(60);
    expect(r?.band).toBe('normal');
  });
  it('Ti-6Al-4V → hard (~22)', () => {
    const r = computeMachinability(mk({ name: 'Ti-6Al-4V', subcategory: 'Titanium' }));
    expect(r?.rating).toBeGreaterThanOrEqual(18);
    expect(r?.rating).toBeLessThanOrEqual(30);
  });
});

/* R226i — 폴리머는 금속 tool-life 모델(ISO 3685·AISI baseline) 미적용.
 * machiningCostBand 는 Polymer 에서 null, 대신 computePolymerMachinability 정성 평가. */
describe('polymer machinability separation (R226i / A7)', () => {
  const pm = (name: string, sub = '') =>
    computePolymerMachinability(mk({ category: 'Polymer', name, subcategory: sub }));

  it('machiningCostBand → null for Polymer (금속 가공비 인자 미노출)', () => {
    expect(machiningCostBand(0.7, 'Polymer')).toBeNull();
    expect(machiningCostBand(0.7, 'Metal')).not.toBeNull(); // 금속은 유지
  });
  it('computePolymerMachinability → null for non-Polymer', () => {
    expect(computePolymerMachinability(mk({ category: 'Metal', name: 'AISI 1018' }))).toBeNull();
  });

  it('강성 엔지니어링 열가소성 (PBT/POM/PC/PEEK/PPS) → easy 우수', () => {
    for (const [n, s] of [['PBT (general purpose) — Unfilled', 'Polymer - PBT'],
                          ['POM Delrin 500', 'Polymer - POM'],
                          ['Polycarbonate (PC)', 'Polymer - Polycarbonate'],
                          ['PEEK Victrex 450G', 'Polymer - PEEK'],
                          ['PPS — As-supplied', 'Polymer - PPS']] as const) {
      const r = pm(n, s);
      expect(r?.band, n).toBe('easy');
    }
  });
  it('유리/탄소 섬유 강화 → hard 마모성 필러 (연질/기본보다 우선)', () => {
    expect(pm('PBT 30%GF', 'Polymer - PBT')?.band).toBe('hard');
    expect(pm('PA12-GF30', 'Polymer - Polyamide GF')?.label).toContain('필러');
    expect(pm('PEEK-CF (carbon fiber)', 'Polymer - PEEK CF')?.band).toBe('hard');
    expect(pm('PP-GF30 — As-supplied', 'Polymer - PP GF (FDM)')?.band).toBe('hard'); // 연질 아님
    expect(pm('PPS Fortron 1140L4 (40% GF)', 'Polymer - PPS')?.band).toBe('hard');
  });
  it('연질·저Tg (PTFE/HDPE/PP/PETG) → normal 거미상', () => {
    expect(pm('PTFE (Teflon)', 'Polymer - PTFE')?.label).toContain('거미상');
    expect(pm('HDPE — As-supplied', 'Polymer - Polyethylene')?.band).toBe('normal');
    expect(pm('PP — As-supplied', 'Polymer - PP')?.band).toBe('normal');
    expect(pm('PETG', 'Polymer - PETG')?.band).toBe('normal');
  });
  it('취성 비정질 (PMMA/PS) → normal 취성', () => {
    expect(pm('PMMA Cast acrylic sheet', 'Polymer - PMMA')?.label).toContain('취성');
    expect(pm('PS — As-supplied', 'Polymer - Polystyrene')?.label).toContain('취성');
  });
  it('탄성체 (TPU/Silicone/NBR) → hard 절삭 부적합', () => {
    expect(pm('TPU (95A)', 'Polymer - TPU')?.label).toContain('탄성체');
    expect(pm('Silicone Rubber', 'Polymer - Silicone Rubber')?.band).toBe('hard');
  });
  it('열경화 캐스트 수지 (Epoxy) → hard 분진·취성', () => {
    expect(pm('Epoxy Resin — As-supplied (Cast)', 'Polymer - Epoxy/Thermoset')?.label).toContain('열경화');
  });
  it('PMI 구조 발포체 (Rohacell) → normal 발포체', () => {
    expect(pm('Rohacell A PMI structural foam — Rohacell 51A', 'Polymer - Foam (PMI)')?.label).toContain('발포체');
  });
  it('금속 tool-life 문구를 반환하지 않음 (저탄소강/free-machining/ISO 3685/AISI 미포함)', () => {
    for (const n of ['PBT', 'PTFE (Teflon)', 'PA12-GF30', 'TPU (95A)']) {
      const note = pm(n)?.note || '';
      expect(note).not.toMatch(/저탄소강|free-?machining|1018|1212|ISO 3685/i);
    }
  });
});
