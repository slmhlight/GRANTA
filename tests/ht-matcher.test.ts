/* R157b — Heat treatment matcher tests. */
import { describe, expect, it } from 'vitest';
import { matchHeatTreatment, matchAnyHeatTreatment } from '../client/src/lib/ht-matcher';

describe('matchHeatTreatment', () => {
  it('empty HT matches only "none / as-supplied"', () => {
    expect(matchHeatTreatment('', 'none / as-supplied')).toBe(true);
    expect(matchHeatTreatment('', 'annealed')).toBe(false);
  });

  it('Annealed matcher', () => {
    expect(matchHeatTreatment('mill annealed', 'annealed')).toBe(true);
    expect(matchHeatTreatment('full annealed', 'annealed')).toBe(true);
    expect(matchHeatTreatment('q+t', 'annealed')).toBe(false);
  });

  it('Solution treated', () => {
    expect(matchHeatTreatment('solution treated', 'solution treated')).toBe(true);
    expect(matchHeatTreatment('solution + aged', 'solution treated')).toBe(true);
  });

  it('Aged / precipitation', () => {
    expect(matchHeatTreatment('h900 aged', 'aged / precipitation')).toBe(true);
    expect(matchHeatTreatment('precipitation hardened', 'aged / precipitation')).toBe(true);
    expect(matchHeatTreatment('t6', 'aged / precipitation')).toBe(true);
    expect(matchHeatTreatment('t7', 'aged / precipitation')).toBe(true);
  });

  it('Quenched & tempered', () => {
    expect(matchHeatTreatment('q+t', 'quenched & tempered')).toBe(true);
    expect(matchHeatTreatment('tempered 540°c', 'quenched & tempered')).toBe(true);
    expect(matchHeatTreatment('quenched and tempered', 'quenched & tempered')).toBe(true);
  });

  it('HIP', () => {
    expect(matchHeatTreatment('hip 1200°c', 'hip (hot isostatic)')).toBe(true);
    expect(matchHeatTreatment('hot isostatic pressed', 'hip (hot isostatic)')).toBe(true);
  });

  it('Stress-relieved', () => {
    expect(matchHeatTreatment('stress relieved', 'stress-relieved')).toBe(true);
    expect(matchHeatTreatment('stress-relieved', 'stress-relieved')).toBe(true);
  });

  it('Normalized', () => {
    expect(matchHeatTreatment('normalized', 'normalized')).toBe(true);
    expect(matchHeatTreatment('normalised', 'normalized')).toBe(true);
  });

  it('Hardened (case hardening / nitride / carburize)', () => {
    expect(matchHeatTreatment('case hardened', 'hardened')).toBe(true);
    expect(matchHeatTreatment('nitrided', 'hardened')).toBe(true);
    expect(matchHeatTreatment('carburized', 'hardened')).toBe(true);
  });

  it('None / as-supplied with various as-* prefix', () => {
    expect(matchHeatTreatment('as-built', 'none / as-supplied')).toBe(true);
    expect(matchHeatTreatment('as-cast', 'none / as-supplied')).toBe(true);
    expect(matchHeatTreatment('as supplied', 'none / as-supplied')).toBe(true);
    expect(matchHeatTreatment('as received', 'none / as-supplied')).toBe(true);
    expect(matchHeatTreatment('as forged', 'none / as-supplied')).toBe(true);
    expect(matchHeatTreatment('as rolled', 'none / as-supplied')).toBe(true);
  });

  it('Unknown wanted falls back to substring match', () => {
    expect(matchHeatTreatment('custom-x100', 'custom-x100')).toBe(true);
    expect(matchHeatTreatment('something else', 'custom')).toBe(false);
  });
});

describe('matchAnyHeatTreatment', () => {
  it('any wanted matches', () => {
    expect(matchAnyHeatTreatment('q+t 540°c', ['annealed', 'quenched & tempered'])).toBe(true);
  });

  it('none matches → false', () => {
    expect(matchAnyHeatTreatment('q+t', ['annealed', 'hip (hot isostatic)'])).toBe(false);
  });

  it('empty HT + wanted includes none → true', () => {
    expect(matchAnyHeatTreatment('', ['none / as-supplied', 'annealed'])).toBe(true);
  });

  it('empty wanted → false', () => {
    expect(matchAnyHeatTreatment('aged', [])).toBe(false);
  });
});
