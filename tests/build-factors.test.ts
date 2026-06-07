/* R155 — build pipeline factor 함수 unit test.
 *
 * R152a (Q+T 미반영 silent bug) 같은 회귀 자동 감지.
 * scripts/lib/factors.mjs 의 pure 함수 import → input/output assertion.
 *
 * Vitest 가 .mjs ESM import 직접 처리 가능 (별도 transform 불요).
 */
import { describe, expect, it } from 'vitest';
import { htCostFactor, priceConditionFactor, priceFormFactor } from '../scripts/pipeline/enrich/factors.mjs';

/* ───────── htCostFactor ───────── */

describe('htCostFactor', () => {
  it('returns 1.0 for as-built / as-supplied (no HT)', () => {
    expect(htCostFactor({ name: 'AISI 316L — As-built', heat_treatment: '' })).toBe(1.0);
    expect(htCostFactor({ name: 'Test — As-supplied' })).toBe(1.0);
    expect(htCostFactor({ name: 'A36 — As-rolled (minimum spec)' })).toBe(1.0);
  });

  it('returns 1.0 when no HT keyword in name OR heat_treatment', () => {
    expect(htCostFactor({ name: 'AISI 1018 carbon steel' })).toBe(1.0);
    expect(htCostFactor({ name: 'Pure aluminum 1100' })).toBe(1.0);
  });

  it('R152a — detects Q+T / Quenched-Tempered in NAME (not just heat_treatment)', () => {
    // 이전 버그: 단순 HT (1.15) 로 잘못 분류
    expect(htCostFactor({ name: '42CrMo4 (AISI 4140) — Wrought, Quenched-Tempered' })).toBeGreaterThanOrEqual(1.30);
    expect(htCostFactor({ name: 'AISI 4340 — Q+T (Wrought)' })).toBeGreaterThanOrEqual(1.30);
    expect(htCostFactor({ name: 'AISI 1095 — Quenched / tempered (Wrought)' })).toBeGreaterThanOrEqual(1.30);
  });

  it('promotes Aged / Solution / T6 / H1025 to 본격 HT (≥ 1.35)', () => {
    expect(htCostFactor({ name: '17-4 PH (UNS S17400) — H900' })).toBeGreaterThanOrEqual(1.35);
    expect(htCostFactor({ name: '17-4 PH — H1025' })).toBeGreaterThanOrEqual(1.35);
    expect(htCostFactor({ name: 'AA 6061-T6' })).toBeGreaterThanOrEqual(1.35);
    expect(htCostFactor({ name: 'Maraging 250 — Aged' })).toBeGreaterThanOrEqual(1.35);
    expect(htCostFactor({ name: 'Inconel 718 — Solution + Aged' })).toBeGreaterThanOrEqual(1.35);
  });

  it('detects HIP (vacuum + high pressure) → 1.65+', () => {
    expect(htCostFactor({ name: 'Ti6Al4V — HIP' })).toBeGreaterThanOrEqual(1.65);
    expect(htCostFactor({ name: 'Test', heat_treatment: 'HIP 1200°C/100MPa' })).toBeGreaterThanOrEqual(1.65);
    expect(htCostFactor({ name: 'CMC — Hot Isostatic Pressed' })).toBeGreaterThanOrEqual(1.65);
  });

  it('detects coating / nitride / carburize as case hardening', () => {
    expect(htCostFactor({ name: 'AISI 8620 — Carburized' })).toBeGreaterThanOrEqual(1.40);
    expect(htCostFactor({ name: 'Tool steel — Nitrided' })).toBeGreaterThanOrEqual(1.40);
    expect(htCostFactor({ name: 'Inconel 718 — TBC coating' })).toBeGreaterThanOrEqual(1.50);
  });

  it('cycle multiplier (2+ cycles via comma/+/→)', () => {
    const single = htCostFactor({ name: 'Aged' });
    const multi = htCostFactor({ name: 'Solution + Aged + Aged' });
    expect(multi).toBeGreaterThan(single);
  });

  it('Annealed / Normalized → 1.10 (단순 단일 사이클)', () => {
    expect(htCostFactor({ name: 'AISI 1018 — Annealed' })).toBeGreaterThanOrEqual(1.10);
    expect(htCostFactor({ name: 'A572 Gr.50 — Normalized' })).toBeGreaterThanOrEqual(1.10);
  });

  it('handles null / undefined gracefully', () => {
    expect(htCostFactor({ name: null, heat_treatment: null })).toBe(1.0);
    expect(htCostFactor({})).toBe(1.0);
  });

  it('result is properly rounded (max 2 decimals)', () => {
    const f = htCostFactor({ name: 'Aged' });
    const str = f.toFixed(2);
    expect(Number(str)).toBe(f);
  });
});

/* ───────── priceConditionFactor ───────── */

describe('priceConditionFactor', () => {
  it('returns 1.00 for as-supplied / mill-finish', () => {
    expect(priceConditionFactor({ name: 'Test — As-supplied' })).toBe(1.00);
    expect(priceConditionFactor({ name: 'Test — As-rolled' })).toBe(1.00);
    expect(priceConditionFactor({ name: 'Test', heat_treatment: 'Mill-finish' })).toBe(1.00);
  });

  it('Annealed → 1.02', () => {
    expect(priceConditionFactor({ name: 'Test — Annealed' })).toBe(1.02);
  });

  it('Normalized → 1.05', () => {
    expect(priceConditionFactor({ name: 'A572 — Normalized' })).toBe(1.05);
  });

  it('Q+T → ≥ 1.18', () => {
    expect(priceConditionFactor({ name: 'AISI 4140 — Q+T (Wrought)' })).toBeGreaterThanOrEqual(1.18);
    expect(priceConditionFactor({ name: 'AISI 4340 — Quenched and Tempered' })).toBeGreaterThanOrEqual(1.18);
  });

  it('STA / Aged / T6 / H900 → ≥ 1.25', () => {
    expect(priceConditionFactor({ name: '17-4 PH — H900' })).toBeGreaterThanOrEqual(1.25);
    expect(priceConditionFactor({ name: 'AA 7075-T6' })).toBeGreaterThanOrEqual(1.25);
    expect(priceConditionFactor({ name: 'Inconel 718 — Aged' })).toBeGreaterThanOrEqual(1.25);
  });

  it('HIP → ≥ 1.60', () => {
    expect(priceConditionFactor({ name: 'Ti6Al4V — HIP' })).toBeGreaterThanOrEqual(1.60);
  });

  it('Coating → ≥ 1.50', () => {
    expect(priceConditionFactor({ name: 'Test', heat_treatment: 'TBC coating' })).toBeGreaterThanOrEqual(1.50);
    expect(priceConditionFactor({ name: 'Test', heat_treatment: 'DLC coated' })).toBeGreaterThanOrEqual(1.50);
  });

  it('handles null inputs', () => {
    expect(priceConditionFactor({})).toBe(1.0);
  });
});

/* ───────── priceFormFactor ───────── */

describe('priceFormFactor', () => {
  it('AM (LPBF / SLM / DMLS) → 2.5', () => {
    expect(priceFormFactor({ process: 'LPBF' })).toBe(2.5);
    expect(priceFormFactor({ process: 'SLM' })).toBe(2.5);
    expect(priceFormFactor({ process: 'DMLS Direct Metal Laser Sintering' })).toBe(2.5);
  });

  it('EBM (Ti powder premium) → 3.0', () => {
    expect(priceFormFactor({ process: 'EBM' })).toBe(3.0);
    expect(priceFormFactor({ process: 'Electron Beam Melting' })).toBe(3.0);
  });

  it('Binder Jet → 2.2', () => {
    expect(priceFormFactor({ process: 'Binder Jet' })).toBe(2.2);
  });

  it('Cast → 1.0 (base)', () => {
    expect(priceFormFactor({ process: 'Sand cast' })).toBe(1.0);
    expect(priceFormFactor({ process: 'Cast' })).toBe(1.0);
  });

  it('Investment cast → 1.20 (정밀 주조)', () => {
    expect(priceFormFactor({ process: 'Investment cast' })).toBe(1.20);
  });

  it('Wrought / Extruded → 1.05', () => {
    expect(priceFormFactor({ process: 'Wrought' })).toBe(1.05);
    expect(priceFormFactor({ process: 'Hot Extruded' })).toBe(1.05);
  });

  it('Forged → 1.15', () => {
    expect(priceFormFactor({ process: 'Forged' })).toBe(1.15);
  });

  it('Cold-drawn → 1.20', () => {
    expect(priceFormFactor({ process: 'Cold drawn' })).toBe(1.20);
  });

  it('Sintered (PM) → 1.5', () => {
    expect(priceFormFactor({ process: 'Sintered' })).toBe(1.5);
    expect(priceFormFactor({ process: 'Powder Metal' })).toBe(1.5);
  });

  it('Injection molded → 1.0 (polymer)', () => {
    expect(priceFormFactor({ process: 'Injection Molded' })).toBe(1.0);
  });

  it('null / unknown → 1.0', () => {
    expect(priceFormFactor({})).toBe(1.0);
    expect(priceFormFactor({ process: 'unknown' })).toBe(1.0);
  });
});
