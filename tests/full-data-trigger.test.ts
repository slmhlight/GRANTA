import { describe, it, expect } from 'vitest';
/*
 * R08(2026-09-22) — slim 인덱스만으로 답할 수 없는 필터/정렬 판정. 선제 로딩을 늦춘 대가로 Home 이 이 판정으로
 * 전 샤드를 즉시 요청한다 — 판정이 빠지면 그 필터는 샤드 도착 전까지 빈 결과처럼 보인다.
 */
describe('R08 — filterNeedsFullData', () => {
  it('slim 물성 범위·검색·카테고리·인기도만 켜진 상태는 false', async () => {
    const { filterNeedsFullData, DEFAULT_FILTERS } = await import('../client/src/lib/filter-state');
    expect(filterNeedsFullData(DEFAULT_FILTERS, 'name')).toBe(false);
    expect(filterNeedsFullData({ ...DEFAULT_FILTERS, search: '718', categories: ['Metal'], yieldStrengthRange: [500, 1500], popularityRange: [4, 5] }, 'yield_strength')).toBe(false);
  });
  it('조성·열처리·정성 등급·출처 권위·고온 데이터·샤드 전용 물성 범위·권위 정렬은 true', async () => {
    const { filterNeedsFullData, DEFAULT_FILTERS } = await import('../client/src/lib/filter-state');
    expect(filterNeedsFullData({ ...DEFAULT_FILTERS, compositionRanges: { Ni: [50, 60] } })).toBe(true);
    expect(filterNeedsFullData({ ...DEFAULT_FILTERS, heatTreatments: ['Aged'] })).toBe(true);
    expect(filterNeedsFullData({ ...DEFAULT_FILTERS, weldability: ['Good'] })).toBe(true);
    expect(filterNeedsFullData({ ...DEFAULT_FILTERS, authorities: ['standard'] })).toBe(true);
    expect(filterNeedsFullData({ ...DEFAULT_FILTERS, hasElevatedData: true })).toBe(true);
    expect(filterNeedsFullData({ ...DEFAULT_FILTERS, electricalConductivityRange: [10, 100] })).toBe(true);
    expect(filterNeedsFullData(DEFAULT_FILTERS, '__authority')).toBe(true);
  });
});
