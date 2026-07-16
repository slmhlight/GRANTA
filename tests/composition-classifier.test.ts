/*
 * H6 A-2 — 조성 분류기 balance 처리 회귀.
 * 버그: parseCompositionRange('balance')→null → isElementHigh false → balance-Fe/Al/Ti 재료가
 * 원소 분기 전체를 건너뛰고 subcategory fallback 으로 추락 (강 대부분 658곳 무력화).
 * 수정: balance = 잔부(100 − 타 원소 합) 추정 + 마레이징을 Ni-Co 분기보다 먼저(Fe-balance 강이
 * "Nickel-based" 로 빠지는 모순 방지).
 * 조성은 client/public/materials.json 실제 값에서 채록.
 */
import { describe, it, expect } from 'vitest';
import { classifyMaterialByComposition } from '@/lib/composition-classifier';
import type { Material } from '@/lib/materials';

const mat = (composition: Record<string, string>, subcategory = 'X') =>
  ({ composition, subcategory } as unknown as Material);

describe('composition-classifier — balance 잔부 시맨틱 (H6 A-2)', () => {
  it('Fe balance 강이 철강 분기에 진입 (fallback 아님)', () => {
    // 42CrMo4/4140 실조성 — 타 원소 max 합 ~3.3 → Fe min ~96.7 ≥ 50
    const r = classifyMaterialByComposition(mat({
      Fe: 'balance', Cr: '0.9~1.2', Mo: '0.15~0.3', C: '0.38~0.45', Mn: '0.6~0.9', Si: '≤0.4',
    }, 'Carbon/Low-alloy Steel'));
    // 철강 분기 내부 판정(휴리스틱) — fallback('Carbon/Low-alloy Steel')이 아니면 게이트 통과
    expect(r).not.toBe('Carbon/Low-alloy Steel');
    expect(r).toBe('Carbon Steel');
  });

  it('2205 duplex (Fe balance·Cr 22~23·Mo 3+) → Duplex', () => {
    expect(classifyMaterialByComposition(mat({
      Fe: 'balance', Cr: '22~23', Ni: '4.5~6.5', Mo: '3~3.5', N: '0.14~0.2', Mn: '≤2', Si: '≤1',
    }))).toBe('Stainless Steel - Duplex');
  });

  it('Ti-6Al-4V (Ti balance) → Titanium - Ti6Al4V', () => {
    expect(classifyMaterialByComposition(mat({
      Ti: 'balance', Al: '5.5~6.75', V: '3.5~4.5', O: '≤0.20', Fe: '≤0.40', C: '≤0.08', N: '≤0.05', H: '≤0.015',
    }))).toBe('Titanium - Ti6Al4V');
  });

  it('AA 6061 (Al balance) → Al 분기 진입', () => {
    const r = classifyMaterialByComposition(mat({
      Al: 'balance', Mg: '0.8~1.2', Si: '0.4~0.8', Cu: '0.15~0.4', Cr: '0.04~0.35', Fe: '≤0.7', Mn: '≤0.15',
    }, 'ShouldNotFallback'));
    expect(r.startsWith('Aluminum')).toBe(true);
  });

  it('Maraging 250 (Fe 66~71·Ni 17~19·Co 7~8.5·Mo 4.6~5.2) → Maraging (Ni-Co 초합금 오분류 방지)', () => {
    expect(classifyMaterialByComposition(mat({
      Fe: '66~71', Ni: '17~19', Co: '7~8.5', Mo: '4.6~5.2', Ti: '0.3~0.6', Al: '0.05~0.15',
    }))).toBe('Maraging Steel');
  });

  it('명시 Fe 수치(304, Fe 70.5)는 기존대로 austenitic — 회귀 없음', () => {
    expect(classifyMaterialByComposition(mat({
      C: '0.08', Fe: '70.5', Cr: '18', Ni: '8', Mn: '2', Si: '1',
    }))).toBe('Stainless Steel - Austenitic');
  });
});
