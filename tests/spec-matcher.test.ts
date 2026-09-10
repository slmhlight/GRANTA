/* R144c — Spec extractor tests. */
import { describe, expect, it } from 'vitest';
import { extractSpecs, specMatches, splitDesignations, isUnsDesignation, unsNumber, isApproxDesignation } from '../client/src/lib/spec-matcher';
import fs from 'node:fs';
import path from 'node:path';

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


/*
 * E5 (H6 W4-3a) — Designations 분리.
 * UNS 는 조성으로 정의된 합금 통일 번호라 "같은 합금"을 보증하고, 나머지 별칭은
 * 지역 규격명·상품명·근사대응이라 신뢰도가 다르다. 형태로 가르는 순수함수를 고정한다.
 */
describe('splitDesignations (E5)', () => {
  it('UNS 형태를 접두어 유무와 무관하게 인식한다', () => {
    expect(isUnsDesignation('UNS S30403')).toBe(true);
    expect(isUnsDesignation('S30403')).toBe(true);
    expect(isUnsDesignation('uns n07718')).toBe(true);
    expect(unsNumber('UNS S30403')).toBe('S30403');
    expect(unsNumber('s30403')).toBe('S30403');
  });

  it('다른 규격 표기를 UNS 로 오인하지 않는다', () => {
    for (const x of ['SUS316L', 'X5CrNi18-10', '1.4301', 'S45C', 'SM490', 'A36', '≈ SS400', 'ADC12', 'AMS 5662'])
      expect(isUnsDesignation(x), x).toBe(false);
  });

  it('UNS · 동일규격명 · 근사대응 세 갈래로 가르고 순서를 유지한다', () => {
    const r = splitDesignations(['SUS316L', 'UNS S31603', 'X2CrNiMo17-12-2', 'S31603', 'SS400 (JIS/KS ≈)']);
    expect(r.uns).toEqual(['S31603']);                            // 접두어 유무 중복은 1회만
    expect(r.equivalent).toEqual(['SUS316L', 'X2CrNiMo17-12-2']);  // 원본 순서 유지
    expect(r.approx).toEqual(['SS400 (JIS/KS ≈)']);                // E6 — 같은 합금이 아니다
  });

  it('E6 — ≈ 마커를 동일 규격명과 섞지 않는다', () => {
    expect(isApproxDesignation('SS400 (JIS/KS ≈)')).toBe(true);
    expect(isApproxDesignation('S235 (≈)')).toBe(true);
    expect(isApproxDesignation('JIS SUS316L')).toBe(false);
    expect(isApproxDesignation('UNS S31603')).toBe(false);
    /* ≈ 가 붙은 것은 UNS 로 새지 않는다 */
    const r = splitDesignations(['S30400 (≈)']);
    expect(r.uns).toEqual([]);
    expect(r.approx).toEqual(['S30400 (≈)']);
  });

  it('빈 입력·null 을 견딘다', () => {
    expect(splitDesignations(undefined)).toEqual({ uns: [], equivalent: [], approx: [] });
    expect(splitDesignations([])).toEqual({ uns: [], equivalent: [], approx: [] });
  });

  it('코퍼스 전량: 어떤 별칭도 사라지지 않는다', () => {
    const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
    const all: Array<{ name: string; aliases?: string[] }> = Array.isArray(raw) ? raw : raw.materials;
    const bad: string[] = [];
    let withUns = 0;
    for (const m of all) {
      const a = m.aliases ?? [];
      if (!a.length) continue;
      const { uns, equivalent, approx } = splitDesignations(a);
      if (uns.length) withUns++;
      /* 분리 후 개수는 원본 이하 (UNS 중복 제거분만 줄어든다) */
      if (uns.length + equivalent.length + approx.length > a.length)
        bad.push(`${m.name}: ${a.length} → ${uns.length}+${equivalent.length}+${approx.length}`);
      /* equivalent·approx 는 원본에 실제로 있던 문자열이어야 한다 */
      for (const o of [...equivalent, ...approx]) if (!a.includes(o)) bad.push(`${m.name}: 원본에 없는 값 ${o}`);
      /* ≈ 가 동일규격명 쪽으로 새면 "같은 합금" 으로 읽힌다 — 절대 금지 */
      for (const o of equivalent) if (/≈/.test(o)) bad.push(`${m.name}: ≈ 가 equivalent 로 샘 — ${o}`);
    }
    expect(bad, `별칭 손실/변형 ${bad.length}건 — ${bad.slice(0, 10).join(' | ')}`).toEqual([]);
    expect(withUns, 'UNS 보유 재료가 300 미만 — 분리가 동작하지 않는다').toBeGreaterThan(300);
  });
});
