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
  thermalConductivityRange: [number, number] | null;
  electricalConductivityRange: [number, number] | null;
  maxServiceTempRange: [number, number] | null;
  fatigueStrengthRange: [number, number] | null;
  impactStrengthRange: [number, number] | null;
  pricePerKgRange: [number, number] | null;
  thermalExpansionRange: [number, number] | null;
  poissonRatioRange: [number, number] | null;
  specificHeatRange: [number, number] | null;
  meltingPointRange: [number, number] | null;
  /** R30 — 모든 numeric property 필터 일관성 차원 추가 항목. */
  popularityRange: [number, number] | null;
  fractureToughnessRange: [number, number] | null;
  totalCostEstimateRange: [number, number] | null;
  minWallThicknessRange: [number, number] | null;
  surfaceFinishTypicalRange: [number, number] | null;
  machiningCostFactorRange: [number, number] | null;
  htCostFactorRange: [number, number] | null;
  corrosion: string[];
  machinability: string[];
  weldability: string[];
  /** R16: RoHS 통과 재료만 표시 (납·카드뮴·수은 한계 통과). null/undefined 데이터는 포함. */
  rohsOnly?: boolean;
  /** R38e: 열처리 다중 선택 (As-built/Annealed/Solution/Aged/Q&T/HIP/Normalized/Stress-relieved/...) */
  heatTreatments: string[];
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
  thermalConductivityRange: null,
  electricalConductivityRange: null,
  maxServiceTempRange: null,
  fatigueStrengthRange: null,
  impactStrengthRange: null,
  pricePerKgRange: null,
  thermalExpansionRange: null,
  poissonRatioRange: null,
  specificHeatRange: null,
  meltingPointRange: null,
  // R35a — 인기도는 산업 사용 빈도 기준. 기본 4-5 로 좁혀서 검증된 알로이 위주로 보여줌.
  popularityRange: [4, 5],
  fractureToughnessRange: null,
  totalCostEstimateRange: null,
  minWallThicknessRange: null,
  surfaceFinishTypicalRange: null,
  machiningCostFactorRange: null,
  htCostFactorRange: null,
  corrosion: [],
  machinability: [],
  weldability: [],
  rohsOnly: false,
  heatTreatments: [],
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

  /** Restore a previously saved filter snapshot atomically. Missing keys fall back to defaults
   *  so an old localStorage entry without a new property still loads cleanly. */
  const restoreFilters = useCallback((snapshot: Partial<FilterState>) => {
    setFilters({ ...DEFAULT_FILTERS, ...snapshot });
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
      { range: filters.thermalConductivityRange, key: 'thermal_conductivity' },
      { range: filters.electricalConductivityRange, key: 'electrical_conductivity' },
      { range: filters.maxServiceTempRange, key: 'max_service_temp' },
      { range: filters.fatigueStrengthRange, key: 'fatigue_strength' },
      { range: filters.impactStrengthRange, key: 'impact_strength' },
      { range: filters.pricePerKgRange, key: 'price_per_kg' },
      { range: filters.thermalExpansionRange, key: 'thermal_expansion' },
      { range: filters.poissonRatioRange, key: 'poisson_ratio' },
      { range: filters.specificHeatRange, key: 'specific_heat' },
      { range: filters.meltingPointRange, key: 'melting_point' },
      // R30 — 신규 numeric properties 필터 추가
      { range: filters.popularityRange, key: 'popularity' },
      { range: filters.fractureToughnessRange, key: 'fracture_toughness' as keyof Material },
      { range: filters.totalCostEstimateRange, key: 'total_cost_estimate' as keyof Material },
      { range: filters.minWallThicknessRange, key: 'min_wall_thickness' as keyof Material },
      { range: filters.surfaceFinishTypicalRange, key: 'surface_finish_typical' as keyof Material },
      { range: filters.machiningCostFactorRange, key: 'machining_cost_factor' as keyof Material },
      { range: filters.htCostFactorRange, key: 'ht_cost_factor' as keyof Material },
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

    // Qualitative filters (corrosion / machinability / weldability)
    if (filters.corrosion.length) result = result.filter(m => m.corrosion_resistance != null && filters.corrosion.includes(String(m.corrosion_resistance)));
    if (filters.machinability.length) result = result.filter(m => m.machinability != null && filters.machinability.includes(String(m.machinability)));
    if (filters.weldability.length) result = result.filter(m => m.weldability != null && filters.weldability.includes(String(m.weldability)));
    // R16: RoHS toggle — false (default) 면 통과, true 면 rohs_compliant === false 만 제외 (null/true 유지).
    if (filters.rohsOnly) result = result.filter(m => m.rohs_compliant !== false);
    // R38e: 열처리 다중 선택 — m.heat_treatment 가 선택된 라벨 중 하나로 시작 or 포함 일 때 통과.
    //   현실적이지 않은 조합 (예: SLM 합금 + 단조 후 어닐링) 은 데이터에 없는 시점에서 자동 배제.
    if (filters.heatTreatments && filters.heatTreatments.length) {
      const wanted = filters.heatTreatments.map(s => s.toLowerCase());
      result = result.filter(m => {
        const ht = String(m.heat_treatment || '').toLowerCase();
        if (!ht) return wanted.includes('none / as-supplied');
        return wanted.some(w => {
          if (w === 'none / as-supplied') return /as[\s-]?(built|cast|supplied|received|forged|rolled|extruded|deposited)/.test(ht);
          if (w === 'annealed') return /anneal/.test(ht);
          if (w === 'solution treated') return /solution/.test(ht);
          if (w === 'aged / precipitation') return /aged|aging|precipitation|peak\s*ag|t6|t7/.test(ht);
          if (w === 'quenched & tempered') return /quench|tempered|qt\b|q\s*&\s*t/.test(ht);
          if (w === 'hip (hot isostatic)') return /hip|isostatic/.test(ht);
          if (w === 'stress-relieved') return /stress[\s-]?reliev/.test(ht);
          if (w === 'normalized') return /normaliz/.test(ht);
          if (w === 'hardened') return /harden|case[\s-]?harden|nitrid|carburiz/.test(ht);
          return ht.includes(w);
        });
      });
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
    if (filters.thermalConductivityRange) count++;
    if (filters.electricalConductivityRange) count++;
    if (filters.maxServiceTempRange) count++;
    if (filters.fatigueStrengthRange) count++;
    if (filters.impactStrengthRange) count++;
    if (filters.pricePerKgRange) count++;
    if (filters.thermalExpansionRange) count++;
    if (filters.poissonRatioRange) count++;
    if (filters.specificHeatRange) count++;
    if (filters.meltingPointRange) count++;
    if (filters.popularityRange) count++;
    if (filters.fractureToughnessRange) count++;
    if (filters.totalCostEstimateRange) count++;
    if (filters.minWallThicknessRange) count++;
    if (filters.surfaceFinishTypicalRange) count++;
    if (filters.machiningCostFactorRange) count++;
    if (filters.htCostFactorRange) count++;
    if (filters.corrosion.length > 0) count++;
    if (filters.machinability.length > 0) count++;
    if (filters.weldability.length > 0) count++;
    if (filters.rohsOnly) count++;
    if (filters.heatTreatments && filters.heatTreatments.length > 0) count++;
    return count;
  }, [filters]);

  // R51b — Leave-one-out narrowed ranges. 각 numeric property 의 가능 범위는
  //   "그 property filter 만 제외" 한 모든 필터 적용 후 결과의 min/max.
  //   Granta MI 스타일 — slider 가 다른 필터의 제약 반영.
  const RANGE_FILTER_MAP: Record<string, keyof FilterState> = {
    density: 'densityRange', yield_strength: 'yieldStrengthRange', uts: 'utsRange',
    elongation: 'elongationRange', modulus: 'modulusRange', hardness: 'hardnessRange',
    thermal_conductivity: 'thermalConductivityRange', electrical_conductivity: 'electricalConductivityRange',
    max_service_temp: 'maxServiceTempRange', fatigue_strength: 'fatigueStrengthRange',
    impact_strength: 'impactStrengthRange', price_per_kg: 'pricePerKgRange',
    thermal_expansion: 'thermalExpansionRange', poisson_ratio: 'poissonRatioRange',
    specific_heat: 'specificHeatRange', melting_point: 'meltingPointRange',
    popularity: 'popularityRange', fracture_toughness: 'fractureToughnessRange',
    total_cost_estimate: 'totalCostEstimateRange', min_wall_thickness: 'minWallThicknessRange',
    surface_finish_typical: 'surfaceFinishTypicalRange', machining_cost_factor: 'machiningCostFactorRange',
    ht_cost_factor: 'htCostFactorRange',
  };

  const narrowedRanges = useMemo(() => {
    // 1) baseSet — non-range filter (category/sub/process/HT/qual/composition/text) 적용
    let baseSet = materials;
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      baseSet = baseSet.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.subcategory.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q) ||
        m.process.toLowerCase().includes(q) ||
        (m.aliases || []).some(a => a.toLowerCase().includes(q))
      );
    }
    if (filters.categories.length) baseSet = baseSet.filter(m => filters.categories.includes(m.category));
    if (filters.subcategories.length) baseSet = baseSet.filter(m =>
      filters.subcategories.includes(m.subcategory) || (m.families || []).some(f => filters.subcategories.includes(f))
    );
    if (filters.processes.length) baseSet = baseSet.filter(m => filters.processes.includes(m.process));
    if (filters.corrosion.length) baseSet = baseSet.filter(m => m.corrosion_resistance != null && filters.corrosion.includes(String(m.corrosion_resistance)));
    if (filters.machinability.length) baseSet = baseSet.filter(m => m.machinability != null && filters.machinability.includes(String(m.machinability)));
    if (filters.weldability.length) baseSet = baseSet.filter(m => m.weldability != null && filters.weldability.includes(String(m.weldability)));
    if (filters.rohsOnly) baseSet = baseSet.filter(m => m.rohs_compliant !== false);
    if (filters.heatTreatments && filters.heatTreatments.length) {
      const wanted = filters.heatTreatments.map(s => s.toLowerCase());
      baseSet = baseSet.filter(m => {
        const ht = String(m.heat_treatment || '').toLowerCase();
        if (!ht) return wanted.includes('none / as-supplied');
        return wanted.some(w => {
          if (w === 'none / as-supplied') return /as[\s-]?(built|cast|supplied|received|forged|rolled|extruded|deposited)/.test(ht);
          if (w === 'annealed') return /anneal/.test(ht);
          if (w === 'solution treated') return /solution/.test(ht);
          if (w === 'aged / precipitation') return /aged|aging|precipitation|peak\s*ag|t6|t7/.test(ht);
          if (w === 'quenched & tempered') return /quench|tempered|qt\b|q\s*&\s*t/.test(ht);
          if (w === 'hip (hot isostatic)') return /hip|isostatic/.test(ht);
          if (w === 'stress-relieved') return /stress[\s-]?reliev/.test(ht);
          if (w === 'normalized') return /normaliz/.test(ht);
          if (w === 'hardened') return /harden|case[\s-]?harden|nitrid|carburiz/.test(ht);
          return ht.includes(w);
        });
      });
    }

    // 2) 각 target property 에 대해 — 자기 자신 제외 모든 range filter 적용 후 min/max 계산
    const out: Record<string, [number, number] | null> = {};
    for (const [propKey, filterKey] of Object.entries(RANGE_FILTER_MAP)) {
      let s = baseSet;
      for (const [otherProp, otherFilter] of Object.entries(RANGE_FILTER_MAP)) {
        if (otherProp === propKey) continue;
        const r = filters[otherFilter] as [number, number] | null | undefined;
        if (!r) continue;
        s = s.filter(m => {
          const v = (m as any)[otherProp] as number | null;
          return v != null && v >= r[0] && v <= r[1];
        });
      }
      const vals: number[] = [];
      for (const m of s) {
        const v = (m as any)[propKey] as number | null;
        if (v != null && isFinite(v)) vals.push(v);
      }
      out[propKey] = vals.length ? [Math.min(...vals), Math.max(...vals)] : null;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials, filters]);

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
    restoreFilters,
    filtered,
    sortKey,
    sortDir,
    toggleSort,
    activeFilterCount,
    narrowedRanges,
  };
}
