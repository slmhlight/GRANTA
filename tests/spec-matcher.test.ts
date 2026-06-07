/* R144c — Spec extractor tests. */
import { describe, expect, it } from 'vitest';
import { extractSpecs, specMatches } from '../client/src/lib/spec-matcher';

describe('extractSpecs', () => {
  it('extracts AMS', () => {
    const r = extractSpecs(['Inconel 718 per AMS 5662']);
    expect(r.map(s => s.id)).toContain('AMS 5662');
    expect(r[0].org).toBe('AMS');
  });

  it('extracts ASTM', () => {
    const r = extractSpecs(['9% Ni steel ASTM A553']);
    expect(r.map(s => s.id)).toContain('ASTM A553');
  });

  it('extracts UNS', () => {
    const r = extractSpecs(['17-4 PH (UNS S17400) — H900']);
    expect(r.map(s => s.id)).toContain('UNS S17400');
  });

  it('handles multiple specs from one string', () => {
    const r = extractSpecs(['Ti-6Al-4V Grade 5 (UNS R56400) per AMS 4928 / ASTM B265']);
    const ids = r.map(s => s.id);
    expect(ids).toContain('UNS R56400');
    expect(ids).toContain('AMS 4928');
    expect(ids).toContain('ASTM B265');
  });

  it('extracts NACE sour service', () => {
    const r = extractSpecs(['per NACE MR0175']);
    expect(r.map(s => s.id)).toContain('NACE MR0175');
  });

  it('returns empty for no spec', () => {
    const r = extractSpecs(['Just a name', null, undefined, '']);
    expect(r).toHaveLength(0);
  });

  it('deduplicates within haystack', () => {
    const r = extractSpecs(['AMS 5662', 'AMS 5662 again']);
    expect(r.filter(s => s.id === 'AMS 5662')).toHaveLength(1);
  });

  it('sorts by org priority (AMS first)', () => {
    const r = extractSpecs(['UNS S17400 per AMS 5643']);
    expect(r[0].org).toBe('AMS');
  });

  it('attaches known descriptions', () => {
    const r = extractSpecs(['AMS 5662']);
    expect(r[0].description).toContain('Inconel 718');
  });
});

describe('specMatches', () => {
  const specs = [{ id: 'AMS 5662', org: 'AMS' as const }, { id: 'UNS N07718', org: 'UNS' as const }];
  it('matches by full id', () => {
    expect(specMatches(specs, 'AMS 5662')).toBe(true);
  });
  it('matches by number only', () => {
    expect(specMatches(specs, 'N07718')).toBe(true);
  });
  it('case-insensitive', () => {
    expect(specMatches(specs, 'ams 5662')).toBe(true);
  });
  it('returns false for non-match', () => {
    expect(specMatches(specs, 'ASTM A36')).toBe(false);
  });
  it('handles empty', () => {
    expect(specMatches(undefined, 'AMS 5662')).toBe(false);
    expect(specMatches([], 'AMS 5662')).toBe(false);
  });
});
