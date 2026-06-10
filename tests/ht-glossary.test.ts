/*
 * R71 Sprint E — Unit tests for HT glossary lookup.
 */
import { describe, it, expect } from 'vitest';
import { htGlossaryFor } from '../client/src/lib/ht-glossary';

describe('htGlossaryFor', () => {
  it('returns undefined for empty / unknown', () => {
    expect(htGlossaryFor('')).toBeUndefined();
    expect(htGlossaryFor('   ')).toBeUndefined();
    expect(htGlossaryFor('XYZ123 unknown')).toBeUndefined();
  });

  it('H900 → 최대 σy', () => {
    expect(htGlossaryFor('H900')?.effect).toMatch(/최대 σy/);
  });
  it('H1150 → 최대 연성', () => {
    expect(htGlossaryFor('H1150')?.effect).toMatch(/최대 연성/);
  });
  it('Solution Treated → 시효 전', () => {
    expect(htGlossaryFor('Solution Treated')?.effect).toMatch(/시효 전/);
  });
  it('Aged → 시효', () => {
    expect(htGlossaryFor('Aged')?.effect).toMatch(/시효/);
  });
  /* R205 F5 — STA 는 Ti·PH강·Ni superalloy 모두 사용 → 합금 중립 설명으로 변경 (이전 'Ti 표준' 은 718 등에 오표시). */
  it('STA → 용체화+시효 (합금 중립)', () => {
    expect(htGlossaryFor('STA')?.effect).toMatch(/시효/);
    expect(htGlossaryFor('STA')?.effect).not.toMatch(/Ti 합금/);
  });
  it('Q&T → 강도·인성 균형', () => {
    expect(htGlossaryFor('Q&T')?.effect).toMatch(/강도·인성/);
  });
  it('Annealed → 최대 연성', () => {
    expect(htGlossaryFor('Annealed')?.effect).toMatch(/최대 연성/);
  });
  it('HIP → 기공 제거', () => {
    expect(htGlossaryFor('HIP')?.effect).toMatch(/기공 제거/);
  });
  it('As-built → 잔류응력', () => {
    expect(htGlossaryFor('As-built')?.effect).toMatch(/잔류응력/);
  });
  it('T6 → peak hardness', () => {
    expect(htGlossaryFor('T6')?.effect).toMatch(/peak/i);
  });

  it('case-insensitive: h900 lowercase', () => {
    expect(htGlossaryFor('h900')).toBeDefined();
  });
  it('handles suffix: "Annealed (980°C/1h AC)"', () => {
    expect(htGlossaryFor('Annealed (980°C/1h AC)')).toBeDefined();
  });
});
