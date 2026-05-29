/*
 * AM Materials Explorer — Filter State Hook
 * Scientific Precision Design System
 */

import { useState, useMemo, useCallback } from 'react';
import type { Material } from '@/lib/materials';
import { parseCompositionRange, getRangeValue } from '@/lib/composition-parser';

export interface FilterState {
  search: string;
  categories: string[];
  subcategories: string[];
  processes: string[];
  manufacturers: string[];
  compositions: string[];
  compositionRanges: Record<string, [number, number] | null>; // e.g., { Fe: [10, 50], Al: [5, 20] }
  densityRange: [number, number] | null;
  yieldStrengthRange: [number, number] | null;
  utsRange: [number, number] | null;
  elongationRange: [number, number] | null;
  modulusRange: [number, number] | null;
  hardnessRange: [number, number] | null;
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  categories: [],
  subcategories: [],
  processes: [],
  manufacturers: [],
  compositions: [],
  compositionRanges: {},
  densityRange: null,
  yieldStrengthRange: null,
  utsRange: null,
  elongationRange: null,
  modulusRange: null,
  hardnessRange: null,
};

export function useMaterialFilter(materials: Material[]) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<keyof Material>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const toggleSort = useCallback((key: keyof Material) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const filtered = useMemo(() => {
    let result = materials;

    // Text search
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.subcategory.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q) ||
        m.process.toLowerCase().includes(q) ||
        (m.aliases || []).some(a => a.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      result = result.filter(m => filters.categories.includes(m.category));
    }

    // Subcategory filter
    if (filters.subcategories.length > 0) {
      result = result.filter(m =>
        filters.subcategories.includes(m.subcategory) ||
        (m.families || []).some(f => filters.subcategories.includes(f))
      );
    }

    // Process filter
    if (filters.processes.length > 0) {
      result = result.filter(m => filters.processes.includes(m.process));
    }

    // Manufacturer filter
    if (filters.manufacturers.length > 0) {
      result = result.filter(m => filters.manufacturers.includes(m.manufacturer));
    }

    // Composition filter (by primary composition)
    if (filters.compositions.length > 0) {
      result = result.filter(m => {
        const comp = (m as any).primary_composition || 'Other';
        return filters.compositions.includes(comp);
      });
    }

    // Composition range filters (by element percentage) — 클라이언트 사이드 처리
    const ELEMENTS = ['C', 'O', 'Fe', 'Cr', 'Ni', 'Mo', 'Mn', 'Si', 'Cu', 'Al', 'Ti', 'V', 'Co', 'W', 'Nb', 'N', 'P', 'S', 'Mg', 'Zn', 'Sn', 'Be', 'Ta', 'La', 'Ce'];
    for (const el of ELEMENTS) {
      const range = filters.compositionRanges[el];
      if (range) {
        result = result.filter(m => {
          const comp = m.composition[el as keyof Material['composition']];
          if (comp === null || comp === undefined) return false;
          
          let numericValue: number | null = null;
          if (typeof comp === 'number') {
            numericValue = comp;
          } else if (typeof comp === 'string') {
            const parsed = parseCompositionRange(comp);
            numericValue = getRangeValue(parsed);
          }
          
          if (numericValue === null) return false;
          return numericValue >= range[0] && numericValue <= range[1];
        });
      }
    }

    // Numeric range filters
    const rangeFilters: Array<{
      range: [number, number] | null;
      key: keyof Material;
    }> = [
      { range: filters.densityRange, key: 'density' },
      { range: filters.yieldStrengthRange, key: 'yield_strength' },
      { range: filters.utsRange, key: 'uts' },
      { range: filters.elongationRange, key: 'elongation' },
      { range: filters.modulusRange, key: 'modulus' },
      { range: filters.hardnessRange, key: 'hardness' },
    ];

    for (const { range, key } of rangeFilters) {
      if (range) {
        result = result.filter(m => {
          const v = m[key] as number | null;
          if (v === null || v === undefined) return false;
          return v >= range[0] && v <= range[1];
        });
      }
    }

    // Sort
    result = [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [materials, filters, sortKey, sortDir]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.categories.length > 0) count++;
    if (filters.subcategories.length > 0) count++;
    if (filters.processes.length > 0) count++;
    if (filters.manufacturers.length > 0) count++;
    if (filters.compositions.length > 0) count++;
    if (Object.values(filters.compositionRanges).some(r => r !== null)) count++;
    if (filters.densityRange) count++;
    if (filters.yieldStrengthRange) count++;
    if (filters.utsRange) count++;
    if (filters.elongationRange) count++;
    if (filters.modulusRange) count++;
    if (filters.hardnessRange) count++;
    return count;
  }, [filters]);

  // 조성 범위 필터 업데이트 헬퍼
  const updateCompositionRange = useCallback(
    (element: string, range: [number, number] | null) => {
      const newRanges = { ...filters.compositionRanges };
      if (range === null) {
        delete newRanges[element];
      } else {
        newRanges[element] = range;
      }
      updateFilter('compositionRanges', newRanges);
    },
    [filters.compositionRanges, updateFilter]
  );

  return {
    filters,
    updateFilter,
    updateCompositionRange,
    resetFilters,
    filtered,
    sortKey,
    sortDir,
    toggleSort,
    activeFilterCount,
  };
}
