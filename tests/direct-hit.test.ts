/*
 * R226e/C4 — Home.tsx 에서 추출한 direct-hit 검색 유닛테스트.
 * 이전엔 Home(995 LOC) 내부 인라인이라 커버리지 0.
 */
import { describe, it, expect } from 'vitest';
import { resolveDirectHit, normalize, extractTokens } from '@/lib/direct-hit';
import type { Material } from '@/lib/materials';

const mk = (id: string, name: string, aliases: string[] = []): Material => ({ id, name, aliases } as Material);
const MATS = [
  mk('304', 'AISI 304', ['SUS304', '1.4301']),
  mk('6061', 'AA 6061', ['A6061']),
  mk('a588', 'ASTM A588 Grade A', ['SS400 (JIS/KS ≈)']),
];

describe('resolveDirectHit (C4)', () => {
  it('exact — 정규화 후 완전일치', () => {
    expect(resolveDirectHit('SUS304', MATS)?.id).toBe('304');
    expect(resolveDirectHit('1.4301', MATS)?.id).toBe('304');
  });
  it('startsWith 티어', () => {
    expect(resolveDirectHit('AISI 3', MATS)?.id).toBe('304');
  });
  it('includes 티어', () => {
    expect(resolveDirectHit('588 Grade', MATS)?.id).toBe('a588');
  });
  it('shop-alias 확장 (sus304 → 304)', () => {
    expect(resolveDirectHit('sus304', MATS)?.id).toBe('304');
  });
  it('매칭 없음 → null', () => {
    expect(resolveDirectHit('zzzznotexist', MATS)).toBeNull();
  });
  it('빈 쿼리 → null', () => {
    expect(resolveDirectHit('   ', MATS)).toBeNull();
  });
  it('normalize — 소문자 + 구분자 제거', () => {
    expect(normalize('304-SS (annealed)')).toBe('304ssannealed');
  });
  it('extractTokens — 3자+ 또는 2+자리 숫자만', () => {
    expect(extractTokens('304L SS')).toContain('304l');
    expect(extractTokens('A 6061')).toEqual(['6061']); // 'a' len1 제외
  });
});
