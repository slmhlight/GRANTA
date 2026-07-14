/*
 * H5 — htAlloySpecificFor 조건 선택 회귀.
 * 버그: htStr.includes(code) + 삽입순서(t6<t651) 로 "T651" 재료가 "T6" 조건으로 잘못 잡힘.
 * (전 xx51 stretched temper 동일: T651⊃T6·T351⊃T3·T7351⊃T73·T7451⊃T74)
 * 수정: 조건 코드 길이 내림차순 정렬 → 최특이 코드 우선 매칭.
 */
import { describe, it, expect } from 'vitest';
import { htAlloySpecificFor } from '@/lib/ht-alloy-specific';

const F6 = 'AA 6xxx Al-Mg-Si (6061, 6063, 6082, 6151)';
const F7 = 'AA 7xxx Al-Zn-Mg (7075, 7050, 7068)';
const F2 = 'AA 2xxx Al-Cu (e.g., 2024, 2014, 2219)';
const code = (name: string, ht: string, fam: string) => htAlloySpecificFor(name, ht, fam)?.description.code;

describe('htAlloySpecificFor — stretched temper 는 최특이 조건 (T651 ≠ T6)', () => {
  it('T651 → T651 (T6 로 새지 않음)', () => {
    expect(code('AA 6061 — T651', 'T651', F6)).toBe('T651');
    expect(code('AA 7075 — T651', 'T651', F7)).toBe('T651');
  });
  it('T351 → T351 (T3 아님) · T7351 → T7351 · T7451 → T7451', () => {
    expect(code('AA 2024-T351 (aerospace) — T351', 'T351', F2)).toBe('T351');
    expect(code('AA 7075 — T7351', 'T7351', F7)).toBe('T7351');
    expect(code('AA 7050-T7451 — T7451', 'T7451', F7)).toBe('T7451');
  });
  it('짧은 코드 자체는 그대로 (T6·T3 회귀 없음)', () => {
    expect(code('AA 6061 — T6', 'T6', F6)).toBe('T6');
    expect(code('AA 2024 — T3', 'T3', F2)).toBe('T3');
  });
});
