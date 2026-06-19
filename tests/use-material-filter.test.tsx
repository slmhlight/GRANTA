// @vitest-environment jsdom
/*
 * R210 B3 (Top#3) — useMaterialFilter 핵심 필터 엔진 회귀 테스트.
 * 앱 최대 로직 밀도 모듈(433줄)인데 테스트가 0건이었고, 주석에 R193/R209 회귀 이력이 박혀 있음.
 * 검증: process 그룹 매칭(Sintered≠AM, R193) · manufacturer comma-split any-match ·
 *       numeric range 경계 · search name+alias 한정(R180) · narrowedRanges leave-one-out ·
 *       activeFilterCount · restoreFilters 누락키 default 복구.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMaterialFilter } from '@/hooks/useMaterialFilter';
import type { Material } from '@/lib/materials';

// DEFAULT_FILTERS.popularityRange=[4,5] 가 기본 활성 → fixture 에 popularity 부여해야 통과.
function mk(over: Partial<Material>): Material {
  return {
    id: 'x', name: 'X', category: 'Metal', subcategory: 'Sub', process: 'Wrought',
    manufacturer: 'M', aliases: [], families: [], popularity: 4.5,
    ...over,
  } as unknown as Material;
}

const MATS: Material[] = [
  mk({ id: 'a', name: 'Alpha Steel', subcategory: 'Carbon Steel', process: 'Wrought', manufacturer: 'Acme', yield_strength: 300, density: 7.8, aliases: ['zeta-tag'] } as any),
  mk({ id: 'b', name: 'Beta Ti', subcategory: 'Titanium', process: 'LPBF', manufacturer: 'GE Additive, EOS', yield_strength: 800, density: 4.4 } as any),
  mk({ id: 'c', name: 'Gamma Part', subcategory: 'Carbon Steel', process: 'Sintered', manufacturer: 'PM Co', yield_strength: 200, density: 6.5 } as any),
  mk({ id: 'd', name: 'Delta Cast', subcategory: 'Aluminum', process: 'Cast', manufacturer: 'Foundry', yield_strength: 150, density: 2.7 } as any),
  mk({ id: 'e', name: 'Epsilon Poly', category: 'Polymer', subcategory: 'PEEK', process: 'Injection Molding', manufacturer: 'Victrex', yield_strength: 100, density: 1.3 } as any),
  mk({ id: 'f', name: 'NoYield Exotic', subcategory: 'Exotic', process: 'DMLS', manufacturer: 'X', yield_strength: null, density: 8.0 } as any),
];

const ids = (ms: Material[]) => new Set(ms.map((m) => m.id));

describe('useMaterialFilter — process 그룹 매칭 (R193)', () => {
  it("'Powder' 는 Sintered 를 잡고 AM 은 잡지 않는다", () => {
    const { result } = renderHook(() => useMaterialFilter(MATS));
    act(() => result.current.updateFilter('processes', ['Powder']));
    expect(ids(result.current.filtered)).toEqual(new Set(['c']));
  });
  it("'AM' 은 LPBF·AM 만 (Sintered 제외)", () => {
    const { result } = renderHook(() => useMaterialFilter(MATS));
    act(() => result.current.updateFilter('processes', ['AM']));
    expect(ids(result.current.filtered)).toEqual(new Set(['b', 'f']));
  });
});

describe('useMaterialFilter — manufacturer comma-split any-match', () => {
  it("comma-string 의 일부 매칭", () => {
    const { result } = renderHook(() => useMaterialFilter(MATS));
    act(() => result.current.updateFilter('manufacturers', ['EOS']));
    expect(ids(result.current.filtered)).toEqual(new Set(['b']));
  });
});

describe('useMaterialFilter — numeric range 경계 + null 제외', () => {
  it('yieldStrengthRange [200,500]: 경계 포함, null/범위밖 제외', () => {
    const { result } = renderHook(() => useMaterialFilter(MATS));
    act(() => result.current.updateFilter('yieldStrengthRange', [200, 500]));
    // a(300)·c(200, 하한 경계 포함). d(150)·b(800)·e(100)·f(null) 제외.
    expect(ids(result.current.filtered)).toEqual(new Set(['a', 'c']));
  });
});

describe('useMaterialFilter — search 는 name+alias 만 (R180)', () => {
  it('name 매칭', () => {
    const { result } = renderHook(() => useMaterialFilter(MATS));
    act(() => result.current.updateFilter('search', 'alpha'));
    expect(ids(result.current.filtered)).toEqual(new Set(['a']));
  });
  it('alias 매칭', () => {
    const { result } = renderHook(() => useMaterialFilter(MATS));
    act(() => result.current.updateFilter('search', 'zeta-tag'));
    expect(ids(result.current.filtered)).toEqual(new Set(['a']));
  });
  it('subcategory 는 검색 대상 아님 (Carbon → 0건)', () => {
    const { result } = renderHook(() => useMaterialFilter(MATS));
    act(() => result.current.updateFilter('search', 'Carbon'));
    expect(result.current.filtered.length).toBe(0);
  });
});

describe('useMaterialFilter — narrowedRanges leave-one-out', () => {
  it('density 필터가 yield_strength 슬라이더 모집단을 좁힌다', () => {
    const { result } = renderHook(() => useMaterialFilter(MATS));
    act(() => result.current.updateFilter('densityRange', [2, 5]));
    // density∈[2,5] → d(2.7,ys150)·b(4.4,ys800) (e 1.3 제외). yield_strength 범위=[150,800].
    expect(result.current.narrowedRanges.yield_strength).toEqual([150, 800]);
  });
  it('매칭 0건이면 해당 축은 null', () => {
    const { result } = renderHook(() => useMaterialFilter(MATS));
    act(() => result.current.updateFilter('densityRange', [100, 200])); // 아무도 해당 없음
    expect(result.current.narrowedRanges.yield_strength).toBeNull();
  });
});

describe('useMaterialFilter — lowConfidenceHiddenCount (R210 B4)', () => {
  const withTier: Material[] = [
    mk({ id: 'h1', name: 'High1', density: 5 } as any),
    mk({ id: 'lo1', name: 'Low1', density: 5, confidence_tier: 'low' } as any),
    mk({ id: 'lo2', name: 'Low2', density: 5, confidence_tier: 'low' } as any),
  ];
  it('hideLowConfidence ON(default): 숨겨진 low 개수를 보고, filtered 에서 제외', () => {
    const { result } = renderHook(() => useMaterialFilter(withTier));
    expect(result.current.lowConfidenceHiddenCount).toBe(2);
    expect(ids(result.current.filtered)).toEqual(new Set(['h1']));
  });
  it('hideLowConfidence OFF: 숨김 0, low 도 표시', () => {
    const { result } = renderHook(() => useMaterialFilter(withTier));
    act(() => result.current.updateFilter('hideLowConfidence', false));
    expect(result.current.lowConfidenceHiddenCount).toBe(0);
    expect(ids(result.current.filtered)).toEqual(new Set(['h1', 'lo1', 'lo2']));
  });
});

describe('useMaterialFilter — activeFilterCount & restoreFilters', () => {
  it('활성 필터 누적 카운트', () => {
    const { result } = renderHook(() => useMaterialFilter(MATS));
    act(() => {
      result.current.updateFilter('popularityRange', null); // 기본 [4,5] 제거 → baseline 0
      result.current.updateFilter('search', 'a');
      result.current.updateFilter('categories', ['Metal']);
      result.current.updateFilter('yieldStrengthRange', [0, 1000]);
    });
    expect(result.current.activeFilterCount).toBe(3);
  });
  it('restoreFilters 는 누락 키를 default 로 복구', () => {
    const { result } = renderHook(() => useMaterialFilter(MATS));
    act(() => result.current.restoreFilters({ categories: ['Polymer'] }));
    expect(result.current.filters.categories).toEqual(['Polymer']);
    expect(result.current.filters.search).toBe(''); // default 복구
    expect(result.current.filters.processes).toEqual([]);
  });
});
