/*
 * R210 B3 — unit-convert 순수 변환 회귀 테스트.
 * SI↔영미식 왕복, 온도 add 분기, formatPrice 의 KRW per-cm³ 소액 반올림(R101)·USD 자릿수 경계.
 */
import { describe, it, expect } from 'vitest';
import {
  convertToImperial, unitLabel, formatValue, formatPrice, convertPrice, priceUnitLabel, USD_TO_KRW,
} from '@/lib/unit-convert';

describe('convertToImperial', () => {
  it('응력 MPa→ksi (÷6.895)', () => {
    expect(convertToImperial('yield_strength', 689.5)).toBeCloseTo(100, 3);
  });
  it('온도는 add 분기로 °C→°F (×9/5+32)', () => {
    expect(convertToImperial('max_service_temp', 100)).toBeCloseTo(212, 6);
    expect(convertToImperial('melting_point', 0)).toBeCloseTo(32, 6);
  });
  it('밀도 g/cm³→lb/in³ (÷27.68)', () => {
    expect(convertToImperial('density', 27.68)).toBeCloseTo(1, 4);
  });
  it('null 은 null, 미정의 키는 원값 통과', () => {
    expect(convertToImperial('yield_strength', null)).toBeNull();
    expect(convertToImperial('nonexistent', 42)).toBe(42);
  });
});

describe('unitLabel / formatValue', () => {
  it('시스템별 라벨', () => {
    expect(unitLabel('uts', 'si')).toBe('MPa');
    expect(unitLabel('uts', 'imperial')).toBe('ksi');
  });
  it('formatValue 가 변환+라벨+자릿수 적용, null=—', () => {
    expect(formatValue('uts', 689.5, 'imperial', 1)).toBe('100.0 ksi');
    expect(formatValue('uts', null, 'si')).toBe('—');
  });
});

describe('formatPrice (R101 분기)', () => {
  it('USD per-kg 자릿수 경계 (<10:2, <100:1, ≥100:0)', () => {
    expect(formatPrice(5, 'en', 'si', 'kg')).toBe('$5.00/kg');
    expect(formatPrice(50, 'en', 'si', 'kg')).toBe('$50.0/kg');
    expect(formatPrice(500, 'en', 'si', 'kg')).toBe('$500/kg');
  });
  it('USD per-cm³ 작은 값은 3자리, ≥1 은 2자리', () => {
    expect(formatPrice(0.5, 'en', 'si', 'cm3')).toBe('$0.500/cm³');
    expect(formatPrice(3, 'en', 'si', 'cm3')).toBe('$3.00/cm³');
  });
  it('KRW per-kg 는 100/1000원 단위 반올림', () => {
    // 5 USD → 7,000원, <10000 이므로 100원 단위 반올림 → 7000
    expect(formatPrice(5, 'ko', 'si', 'kg')).toBe(`₩${(5 * USD_TO_KRW).toLocaleString()}/kg`);
    // 50 USD → 70,000원, ≥10000 이므로 1000원 단위
    expect(formatPrice(50, 'ko', 'si', 'kg')).toBe('₩70,000/kg');
  });
  it('KRW per-cm³ 소액은 0 으로 뭉개지지 않고 소수1자리 유지 (R101)', () => {
    // 0.05 USD/cm³ → ₩70/cm³ (v<100 → toFixed(1) 분기, 0 아님)
    const out = formatPrice(0.05, 'ko', 'si', 'cm3');
    expect(out).toBe('₩70/cm³');
    expect(out).not.toContain('₩0');
  });
  it('null/비유한값은 —', () => {
    expect(formatPrice(null, 'en', 'si')).toBe('—');
    expect(formatPrice(Infinity, 'en', 'si')).toBe('—');
  });
});

describe('convertPrice / priceUnitLabel', () => {
  it('convertPrice KRW 변환', () => {
    expect(convertPrice(10, 'ko', 'si', 'kg')).toBeCloseTo(10 * USD_TO_KRW, 6);
    expect(convertPrice(null, 'ko', 'si')).toBeNull();
  });
  it('priceUnitLabel 통화/단위 조합', () => {
    expect(priceUnitLabel('en', 'si', 'kg')).toBe('$/kg');
    expect(priceUnitLabel('ko', 'imperial', 'cm3')).toBe('₩/in³');
  });
});
