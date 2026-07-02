/*
 * R226e — 빌드 순수함수 유닛테스트 (S4+C1).
 * 이전엔 build 스크립트 내부에 인라인 정의되어 vitest 커버리지 0 이던 로직을 lib 모듈로 추출 후 테스트.
 */
import { describe, it, expect } from 'vitest';
import { improveLabel, sourceAuthority } from '../scripts/lib/source-labels.mjs';
import { detectAnomalies } from '../scripts/lib/anomalies.mjs';
import { extractUNS } from '../scripts/lib/uns.mjs';
import { attachElevCurves } from '../scripts/lib/elev-curves.mjs';

describe('improveLabel — 출처 라벨 도출', () => {
  it('placeholder + 매핑된 도메인 → publisher 라벨, url 유지', () => {
    const r = improveLabel({ label: 'Datasheet 1', url: 'https://www.matweb.com/x', verified: true });
    expect(r.label).toBe('MatWeb datasheet');
    expect(r.url).toBe('https://www.matweb.com/x');
  });
  it('placeholder + 미매핑 도메인 → "<domain> datasheet"', () => {
    expect(improveLabel({ label: 'Datasheet 2', url: 'https://example.org/foo' }).label).toBe('example.org datasheet');
  });
  it('placeholder + 비-http url(인용) → label=인용, url 제거', () => {
    const r = improveLabel({ label: 'Datasheet 1', url: 'ASTM A588/A588M-19', verified: true });
    expect(r.label).toBe('ASTM A588/A588M-19');
    expect(r.url).toBeUndefined();
  });
  it('"MatWeb N" 라벨도 처리 (www 제거)', () => {
    expect(improveLabel({ label: 'MatWeb 3', url: 'https://www.ssab.com/x' }).label).toBe('SSAB datasheet');
  });
  it('placeholder 아닌 라벨은 원본 그대로(동일 참조)', () => {
    const s = { label: 'ASM Handbook Vol.1', url: 'https://asm.org', verified: true };
    expect(improveLabel(s)).toBe(s);
  });
  it('placeholder 인데 url 없으면 그대로', () => {
    const s = { label: 'Datasheet 1' };
    expect(improveLabel(s)).toBe(s);
  });
});

describe('detectAnomalies — 공유 anomaly 검출', () => {
  const mk = (over: any = {}) => ({ id: 'X', name: 'Test', category: 'Metal', subcategory: 'Carbon Steel', tier: 'reference', sources: [{ verified: true }], ...over });
  const R = (o: Record<string, number>) => ({ ranges: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { typical: v }])) });

  it('σy > UTS → high', () => {
    const a = detectAnomalies([mk(R({ yield_strength: 500, uts: 400 }))]);
    expect(a.some(x => x.severity === 'high' && x.kind === 'σy > UTS')).toBe(true);
  });
  it('정상 verified metal → anomaly 0', () => {
    const a = detectAnomalies([mk(R({ yield_strength: 345, uts: 485, density: 7.85, modulus: 200 }))]);
    expect(a.length).toBe(0);
  });
  it('density 범위 이탈 → high', () => {
    expect(detectAnomalies([mk(R({ density: 30 }))]).some(x => x.kind === 'density out of range')).toBe(true);
  });
  it('range min > max → high', () => {
    const a = detectAnomalies([mk({ ranges: { yield_strength: { typical: 300, min: 400, max: 200 } } })]);
    expect(a.some(x => x.kind.includes('min > max'))).toBe(true);
  });
  it('popularity 범위 이탈 → high', () => {
    expect(detectAnomalies([mk({ popularity: 9, ...R({ yield_strength: 345, uts: 485 }) })]).some(x => x.kind === 'popularity out of [1,5]')).toBe(true);
  });
  it('verified 출처는 family ratio 임계 skip (unverified 는 검출)', () => {
    const verified = detectAnomalies([mk({ sources: [{ verified: true }], ...R({ yield_strength: 495, uts: 500 }) })]);
    expect(verified.some(x => x.kind.includes('Carbon Steel σy/UTS'))).toBe(false);
    const unverified = detectAnomalies([mk({ tier: 'generic', sources: [{ verified: false }], ...R({ yield_strength: 495, uts: 500 }) })]);
    expect(unverified.some(x => x.kind.includes('Carbon Steel σy/UTS'))).toBe(true);
  });
});

describe('sourceAuthority — 출처 권위 등급 (D3)', () => {
  it('ASTM url → standard', () => {
    expect(sourceAuthority({ label: 'ASTM A588', url: 'https://store.astm.org/a0588.html' })).toBe('standard');
  });
  it('ASM Handbook 라벨 → handbook', () => {
    expect(sourceAuthority({ label: 'ASM Handbook Vol.1', url: 'https://www.asminternational.org/x' })).toBe('handbook');
  });
  it('MatWeb → aggregator', () => {
    expect(sourceAuthority({ label: 'MatWeb datasheet', url: 'https://www.matweb.com/x' })).toBe('aggregator');
  });
  it('벤더 URL → manufacturer', () => {
    expect(sourceAuthority({ label: 'SSAB datasheet', url: 'https://www.ssab.com/x' })).toBe('manufacturer');
  });
  it('url 없는 fallback → other', () => {
    expect(sourceAuthority({ label: 'Fatigue fallback: σf ≈ 0.5·σy (Shigley)' })).toBe('other');
  });
  it('fallback 라벨은 ASTM 언급해도 other (표준 아님)', () => {
    expect(sourceAuthority({ label: 'KIC fallback: ASTM A572/A588 HSLA' })).toBe('other');
  });
});

describe('extractUNS — UNS 정규 필드 (축4c)', () => {
  it('이름 "UNS N07718" → N07718', () => {
    expect(extractUNS({ name: 'Inconel 718 (UNS N07718, AMS 5662)' })).toEqual(['N07718']);
  });
  it('별칭 bare 코드 + 중복 제거·정렬', () => {
    expect(extractUNS({ name: 'X', aliases: ['S17400', 'UNS S17400', 'AISI 630'] })).toEqual(['S17400']);
  });
  it('meta.specs org=UNS', () => {
    expect(extractUNS({ name: 'X', meta: { specs: [{ id: 'UNS A03800', org: 'UNS' }] } })).toEqual(['A03800']);
  });
  it('UNS 없으면 빈 배열 (부품번호 오탐 없음)', () => {
    expect(extractUNS({ name: 'PA12 GF50', aliases: ['B12345-XL'] })).toEqual([]);
  });
});

describe('attachElevCurves — 외부 곡선 확장 파이프 (축3d)', () => {
  const T = { 'monel 400': { elevated_temp: [{ temp: 20, ys: 240, uts: 550 }, { temp: 427, ys: 190, uts: 500 }], src: 'test-src' } };
  it('substring 매칭 → 곡선 부착 + meta 인용', () => {
    const m: any = { name: 'Monel 400 — Annealed (Wrought)' };
    expect(attachElevCurves(m, T)).toBe(true);
    expect(m.elevated_temp.length).toBe(2);
    expect(m.meta.elev_curve_src).toBe('test-src');
  });
  it('기존 곡선 보유 entry 는 불변 (인라인 우선)', () => {
    const own = [{ temp: 20, ys: 111, uts: 222 }];
    const m: any = { name: 'Monel 400', elevated_temp: own };
    expect(attachElevCurves(m, T)).toBe(false);
    expect(m.elevated_temp).toBe(own);
  });
  it('비매칭 → no-op', () => {
    const m: any = { name: 'AISI 304' };
    expect(attachElevCurves(m, T)).toBe(false);
    expect(m.elevated_temp).toBeUndefined();
  });
});
