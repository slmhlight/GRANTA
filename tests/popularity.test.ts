/* R156 — popularity heuristic unit test.
 *
 * scripts/lib/popularity.mjs 의 popularityFor() input → output snapshot.
 * R164 (popularity 재검증) 진행 시 회귀 자동 감지.
 */
import { describe, expect, it } from 'vitest';
import { popularityFor } from '../scripts/pipeline/enrich/popularity.mjs';

describe('popularityFor — Metal Tier 5 (한국 산업 표준)', () => {
  it('SUS304 / 304L → high popularity', () => {
    const r = popularityFor({ name: 'AISI 304L stainless steel', category: 'Metal' });
    expect(r).toBeGreaterThanOrEqual(5.0);
  });

  it('S45C / 1045 → high popularity', () => {
    expect(popularityFor({ name: 'AISI 1045 carbon steel', category: 'Metal' })).toBeGreaterThanOrEqual(5.0);
  });

  it('AA 6061 → high popularity', () => {
    expect(popularityFor({ name: 'AA 6061-T6 aluminum', category: 'Metal' })).toBeGreaterThanOrEqual(5.0);
  });

  it('Ti-6Al-4V → high popularity', () => {
    expect(popularityFor({ name: 'Ti-6Al-4V Grade 5', category: 'Metal' })).toBeGreaterThanOrEqual(5.0);
  });

  it('Inconel 718 → high popularity', () => {
    expect(popularityFor({ name: 'Inconel 718', category: 'Metal' })).toBeGreaterThanOrEqual(5.0);
  });
});

describe('popularityFor — Metal Tier 4', () => {
  it('17-4 PH → tier 4 + modifiers', () => {
    const r = popularityFor({ name: '17-4 PH (UNS S17400) — H1025', category: 'Metal' });
    expect(r).toBeGreaterThanOrEqual(4.0);
    expect(r).toBeLessThanOrEqual(5.0);
  });

  it('AISI 4340 → tier 4', () => {
    expect(popularityFor({ name: 'AISI 4340 alloy steel', category: 'Metal' })).toBeGreaterThanOrEqual(4.0);
  });

  it('AA 7075 → tier 4', () => {
    expect(popularityFor({ name: 'AA 7075-T6', category: 'Metal' })).toBeGreaterThanOrEqual(4.0);
  });

  it('Maraging steel → tier 4', () => {
    expect(popularityFor({ name: 'Maraging 250', category: 'Metal' })).toBeGreaterThanOrEqual(4.0);
  });

  it('Tool steel H13 → tier 4', () => {
    expect(popularityFor({ name: 'Tool Steel H13', category: 'Metal' })).toBeGreaterThanOrEqual(4.0);
  });
});

describe('popularityFor — Metal Tier 3 (특수/고성능)', () => {
  it('Inconel 625 → tier 3', () => {
    const r = popularityFor({ name: 'Inconel 625', category: 'Metal' });
    expect(r).toBeGreaterThanOrEqual(3.0);
    expect(r).toBeLessThanOrEqual(4.5);
  });

  it('Duplex 2205 → tier 3', () => {
    const r = popularityFor({ name: 'Duplex 2205 stainless', category: 'Metal' });
    expect(r).toBeGreaterThanOrEqual(3.0);
  });
});

describe('popularityFor — Polymer', () => {
  it('ABS → tier 5', () => {
    expect(popularityFor({ name: 'ABS polymer', category: 'Polymer' })).toBeGreaterThanOrEqual(5.0);
  });

  it('PC (polycarbonate) → tier 5', () => {
    expect(popularityFor({ name: 'Polycarbonate (Lexan)', category: 'Polymer' })).toBeGreaterThanOrEqual(5.0);
  });

  it('PEEK → tier 4', () => {
    const r = popularityFor({ name: 'PEEK Victrex 450G', category: 'Polymer' });
    expect(r).toBeGreaterThanOrEqual(4.0);
    expect(r).toBeLessThanOrEqual(5.0);
  });

  it('NBR (R151 — Tier 5)', () => {
    expect(popularityFor({ name: 'NBR — Nitrile Butadiene Rubber', category: 'Polymer' })).toBeGreaterThanOrEqual(5.0);
  });

  it('HNBR (R151 — Tier 4)', () => {
    const r = popularityFor({ name: 'HNBR — Hydrogenated Nitrile Butadiene Rubber', category: 'Polymer' });
    expect(r).toBeGreaterThanOrEqual(4.0);
    expect(r).toBeLessThan(5.0);
  });
});

describe('popularityFor — Ceramic', () => {
  it('Tungsten carbide → tier 5', () => {
    expect(popularityFor({ name: 'Tungsten Carbide WC-Co', category: 'Ceramic' })).toBeGreaterThanOrEqual(5.0);
  });

  it('Alumina → tier 4', () => {
    const r = popularityFor({ name: 'Alumina 99.5%', category: 'Ceramic' });
    expect(r).toBeGreaterThanOrEqual(4.0);
  });

  it('Zirconia → tier 4', () => {
    expect(popularityFor({ name: 'Zirconia (ZrO2)', category: 'Ceramic' })).toBeGreaterThanOrEqual(4.0);
  });
});

describe('popularityFor — Composite', () => {
  it('CFRP epoxy → tier 4', () => {
    expect(popularityFor({ name: 'CFRP — IM7/8552 Carbon Epoxy', category: 'Composite' })).toBeGreaterThanOrEqual(4.0);
  });

  it('GFRP → tier 5', () => {
    expect(popularityFor({ name: 'GFRP — E-glass/Epoxy', category: 'Composite' })).toBeGreaterThanOrEqual(5.0);
  });
});

describe('popularityFor — AM process cap (R35a + R164)', () => {
  it('LPBF 합금은 점수 cap 3.5 (R164: 인기 base alloy 의 AM 변종 인정)', () => {
    const r = popularityFor({
      name: 'Inconel 718 — As-built',
      category: 'Metal',
      process: 'LPBF',
    });
    expect(r).toBeLessThanOrEqual(3.5);
  });

  it('Wrought 합금은 cap 영향 없음', () => {
    const r = popularityFor({
      name: 'Inconel 718 (wrought)',
      category: 'Metal',
      process: 'Wrought',
    });
    expect(r).toBeGreaterThanOrEqual(4.0);
  });
});

describe('popularityFor — bounds', () => {
  it('clamps to [1, 5]', () => {
    const r = popularityFor({ name: 'Unknown rare alloy', category: 'Metal' });
    expect(r).toBeGreaterThanOrEqual(1.0);
    expect(r).toBeLessThanOrEqual(5.0);
  });

  it('result 소수 둘째자리', () => {
    const r = popularityFor({ name: 'AISI 4140', category: 'Metal' });
    const rounded = Math.round(r * 100) / 100;
    expect(r).toBe(rounded);
  });

  it('handles null / undefined gracefully', () => {
    expect(popularityFor({})).toBeGreaterThanOrEqual(1.0);
    expect(popularityFor({ name: null, category: 'Metal' })).toBeGreaterThanOrEqual(1.0);
  });
});

describe('popularityFor — condition modifier', () => {
  it('Q+T condition gives slight popularity boost', () => {
    const base = popularityFor({ name: 'AISI 4140 alloy steel', category: 'Metal' });
    const qt = popularityFor({ name: 'AISI 4140 — Q+T', category: 'Metal' });
    expect(qt).toBeGreaterThanOrEqual(base);
  });

  it('As-built decreases popularity (test/prototype condition)', () => {
    const base = popularityFor({ name: 'Inconel 625', category: 'Metal' });
    const asBuilt = popularityFor({ name: 'Inconel 625 — As-built', category: 'Metal' });
    expect(asBuilt).toBeLessThanOrEqual(base);
  });
});
