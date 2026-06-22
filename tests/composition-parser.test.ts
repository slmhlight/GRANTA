/*
 * R222d — composition-parser 특성화 테스트 (감사 R222 quick-win).
 * 이 모듈은 per-element 조성 필터(useMaterialFilter)의 유일 게이트인데 테스트가 0이었음.
 * 문서화된 모든 표기법 + 경계/midpoint/balance 계약을 고정한다.
 * 포함: R222d regex 수정("50 to 100"이 fallback이 아닌 range 분기로 매칭되는지) 회귀.
 */
import { describe, it, expect } from 'vitest';
import {
  parseCompositionRange,
  isInRange,
  getRangeValue,
  formatCompositionRange,
  parseCompositionData,
} from '@/lib/composition-parser';

describe('parseCompositionRange — range 표기 (~, -, to)', () => {
  it('"50~100" → [50,100] (isExact=false)', () => {
    const r = parseCompositionRange('50~100')!;
    expect(r).toMatchObject({ min: 50, max: 100, isExact: false, isBalance: false });
  });
  it('"50-100" → [50,100]', () => {
    expect(parseCompositionRange('50-100')).toMatchObject({ min: 50, max: 100 });
  });
  it('"50 to 100" → [50,100] (R222d: range 분기로 매칭, fallback 아님)', () => {
    const r = parseCompositionRange('50 to 100')!;
    expect(r).toMatchObject({ min: 50, max: 100, isExact: false });
    // 공백 없는 "50to100"도 동일하게 range로
    expect(parseCompositionRange('50to100')).toMatchObject({ min: 50, max: 100 });
  });
  it('역순 "100~50" → 정규화 [50,100]', () => {
    expect(parseCompositionRange('100~50')).toMatchObject({ min: 50, max: 100 });
  });
  it('소수 "5.5~6.5" → [5.5,6.5]', () => {
    expect(parseCompositionRange('5.5~6.5')).toMatchObject({ min: 5.5, max: 6.5 });
  });
  it('공백 패딩 "  12 - 14  " → [12,14] (trim)', () => {
    expect(parseCompositionRange('  12 - 14  ')).toMatchObject({ min: 12, max: 14 });
  });
});

describe('parseCompositionRange — 비교/named/exact/balance', () => {
  it('"≤5" 와 "<5" → [0,5]', () => {
    expect(parseCompositionRange('≤5')).toMatchObject({ min: 0, max: 5 });
    expect(parseCompositionRange('<5')).toMatchObject({ min: 0, max: 5 });
  });
  it('"≥95" 와 ">95" → [95,100]', () => {
    expect(parseCompositionRange('≥95')).toMatchObject({ min: 95, max: 100 });
    expect(parseCompositionRange('>95')).toMatchObject({ min: 95, max: 100 });
  });
  it('"max 5" → [0,5], "min 50" → [50,100]', () => {
    expect(parseCompositionRange('max 5')).toMatchObject({ min: 0, max: 5 });
    expect(parseCompositionRange('MIN 50')).toMatchObject({ min: 50, max: 100 });
  });
  it('단일 값 "50" → [50,50] isExact=true', () => {
    expect(parseCompositionRange('50')).toMatchObject({ min: 50, max: 50, isExact: true });
  });
  it('"balance" / "bal." → isBalance', () => {
    expect(parseCompositionRange('balance')).toMatchObject({ isBalance: true, min: 'balance', max: 'balance' });
    expect(parseCompositionRange('Balance')).toMatchObject({ isBalance: true });
    expect(parseCompositionRange('bal.')).toMatchObject({ isBalance: true });
  });
});

describe('parseCompositionRange — fallback / 무효 입력', () => {
  it('2개 숫자 추출 fallback: "approx 16, 18 wt%" → [16,18]', () => {
    expect(parseCompositionRange('approx 16, 18 wt%')).toMatchObject({ min: 16, max: 18, isExact: false });
  });
  it('1개 숫자 추출 fallback: "5.5 (typ)" → [5.5,5.5] isExact=true', () => {
    expect(parseCompositionRange('5.5 (typ)')).toMatchObject({ min: 5.5, max: 5.5, isExact: true });
  });
  it('숫자 3개 이상은 매칭 불가 → null', () => {
    expect(parseCompositionRange('Fe-18-8-2')).toBeNull();
  });
  it('빈 문자열·비문자열·숫자없음 → null', () => {
    expect(parseCompositionRange('')).toBeNull();
    expect(parseCompositionRange('   ')).toBeNull();
    // @ts-expect-error 런타임 방어 확인
    expect(parseCompositionRange(null)).toBeNull();
    // @ts-expect-error
    expect(parseCompositionRange(42)).toBeNull();
    expect(parseCompositionRange('trace')).toBeNull();
  });
});

describe('getRangeValue — 필터용 midpoint 계약', () => {
  it('range [50,100] → midpoint 75', () => {
    expect(getRangeValue(parseCompositionRange('50~100'))).toBe(75);
  });
  it('exact 50 → 50', () => {
    expect(getRangeValue(parseCompositionRange('50'))).toBe(50);
  });
  it('"≤5" → 2.5, "≥95" → 97.5', () => {
    expect(getRangeValue(parseCompositionRange('≤5'))).toBe(2.5);
    expect(getRangeValue(parseCompositionRange('≥95'))).toBe(97.5);
  });
  it('balance → 50 (기본값)', () => {
    expect(getRangeValue(parseCompositionRange('balance'))).toBe(50);
  });
  it('null → null', () => {
    expect(getRangeValue(null)).toBeNull();
  });
});

describe('isInRange — 경계 포함 계약', () => {
  const r = parseCompositionRange('10~20')!;
  it('내부/경계 포함, 외부 제외', () => {
    expect(isInRange(15, r)).toBe(true);
    expect(isInRange(10, r)).toBe(true);   // min 포함
    expect(isInRange(20, r)).toBe(true);   // max 포함
    expect(isInRange(9.99, r)).toBe(false);
    expect(isInRange(20.01, r)).toBe(false);
  });
  it('balance range는 양수 전부 매칭, 0/음수 제외', () => {
    const bal = parseCompositionRange('balance')!;
    expect(isInRange(0.1, bal)).toBe(true);
    expect(isInRange(99, bal)).toBe(true);
    expect(isInRange(0, bal)).toBe(false);
  });
  it('value null → false', () => {
    expect(isInRange(null, r)).toBe(false);
  });
});

describe('formatCompositionRange', () => {
  it('balance → "balance"', () => {
    expect(formatCompositionRange(parseCompositionRange('balance')!)).toBe('balance');
  });
  it('exact → 소수1자리', () => {
    expect(formatCompositionRange(parseCompositionRange('6')!)).toBe('6.0');
  });
  it('range → "min~max" 소수1자리', () => {
    expect(formatCompositionRange(parseCompositionRange('5.5~6.5')!)).toBe('5.5~6.5');
  });
});

describe('parseCompositionData — 합금 조성 일괄 파싱', () => {
  it('string range / number / 무효값 혼합 처리', () => {
    const out = parseCompositionData({ Fe: 'balance', Cr: '16~18', Ni: 8, C: 'trace' } as Record<string, string | number>);
    expect(out.Fe).toMatchObject({ isBalance: true });
    expect(out.Cr).toMatchObject({ min: 16, max: 18 });
    expect(out.Ni).toMatchObject({ min: 8, max: 8, isExact: true });  // number → exact
    expect(out.C).toBeNull();  // "trace" 파싱 불가
  });
});
