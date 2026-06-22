/*
 * AM Materials Explorer — Filter State Hook
 * Scientific Precision Design System
 *
 * R157b — FilterState interface + DEFAULT_FILTERS → lib/filter-state.ts.
 *   Hook 본체 (filter / sort / narrowedRanges) 만 여기 유지.
 *   기존 import 호환을 위해 두 심볼 모두 re-export.
 */

import { useState, useMemo, useCallback } from 'react';
import type { Material } from '@/lib/materials';
import { parseCompositionRange, getRangeValue } from '@/lib/composition-parser';
import { applyQuery, parseQuery, type ParsedQuery } from '@/lib/query-dsl';
// R157b — fuzzyContains → lib/fuzzy-search.ts 로 이동.
import { fuzzyContains } from '@/lib/fuzzy-search';
// R157b — HT matcher (filter 카테고리 → material.heat_treatment 매칭) → lib/ht-matcher.ts.
import { matchAnyHeatTreatment } from '@/lib/ht-matcher';
// R157b — FilterState type + DEFAULT_FILTERS 도 lib 로 이동.
import { type FilterState, DEFAULT_FILTERS } from '@/lib/filter-state';

// Re-export for backward compat (Home / ScenarioDialog / 다른 consumer).
export { DEFAULT_FILTERS, type FilterState };

/**
 * R144b — Fuzzy text search (expanded for R144d full-text).
 * 외부 사용: parser-fuzzy match 도 동일 의미.
 */
export function fuzzyContainsExport(text: string, q: string): boolean {
  return fuzzyContains(text, q);
}

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

  const filteredUnsorted = useMemo(() => {
    let result = materials;

    // R180 — Text search 범위를 alloy name + alias 만으로 제한 (사용자 지적: 검색 범위 너무 넓음).
    //   이전: name + subcategory + manufacturer + process + aliases + industry_note + heat_treatment
    //         + meta.applications + composition keys + spec id (10가지 field 검색)
    //   현재: name + aliases (2가지). 다른 field 는 filter 또는 DSL query 사용.
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(m => {
        if (fuzzyContains(m.name.toLowerCase(), q)) return true;
        if ((m.aliases || []).some(a => fuzzyContains(a.toLowerCase(), q))) return true;
        return false;
      });
    }

    // R144b — Multi-constraint DSL query (AND with other filters)
    if (filters.query && filters.query.trim()) {
      const parsed = parseQuery(filters.query);
      if (parsed.constraints.length) result = applyQuery(result, parsed);
    }

    // R144c — Spec filter (multiple specs = OR within group)
    if (filters.specs && filters.specs.length) {
      const wanted = filters.specs.map(s => s.toUpperCase().replace(/\s+/g, ' '));
      result = result.filter(m => {
        const specs = (m.meta as { specs?: Array<{ id: string }> })?.specs;
        if (!specs?.length) return false;
        return specs.some(s => wanted.includes(s.id.toUpperCase().replace(/\s+/g, ' ')));
      });
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

    /* Process filter — R192/R193 group-based matching.
     * UI options 5개 (Wrought / Molding / Casting / Powder / AM) vs DB 44 distinct process strings.
     * R193 — 'Sintered' / 'Powder-Metallurgy' 는 AM 이 아님 (전통 press-and-sinter / MIM).
     *        AM 에서 분리 + 신규 'Powder' group 신설. */
    if (filters.processes.length > 0) {
      const procGroups: Record<string, string[]> = {
        Wrought: ['wrought', 'cold rolled', 'hot rolled', 'cold drawn', 'hot dip galvani', 'tmcp', 'forged', 'extrusion', 'vacuum refined', 'q+t (heat'],
        Molding: ['injection mold', 'compression mold', 'layup'],
        Casting: ['cast'],
        Powder: ['sintered', 'powder-metallurgy', 'powder metallurgy', 'press-and-sinter', 'mim ', 'metal injection mold'],
        AM: ['lpbf', 'dmls', 'slm', 'sls', 'fdm', 'closed-cell foam', 'am ', 'am('],
      };
      result = result.filter(m => {
        const p = String(m.process || '').toLowerCase();
        if (!p) return false;
        return filters.processes.some(grp => {
          const keys = procGroups[grp];
          if (!keys) return p === grp.toLowerCase(); // fallback
          return keys.some(k => p.includes(k));
        });
      });
    }

    /* Manufacturer filter — R192 array + comma-split support.
     * AM curated entries 의 manufacturer 가 "GE Additive, EOS, Nikon SLM Solutions, 3D Systems"
     * 형식 comma-separated string. m.manufacturers 도 array form 으로 같은 content.
     * 이전: exact match 만 — 'EOS' 선택 시 comma-string 매칭 X.
     * 변경: array + comma-split flatten 후 any-match. */
    if (filters.manufacturers.length > 0) {
      result = result.filter(m => {
        const raw = Array.isArray(m.manufacturers) && m.manufacturers.length
          ? m.manufacturers
          : (m.manufacturer ? [m.manufacturer] : []);
        const mfs = raw.flatMap(s => String(s || '').split(',').map(x => x.trim())).filter(Boolean);
        return filters.manufacturers.some(f => mfs.includes(f));
      });
    }

    // Composition filter (by primary composition)
    // R157 — `as any` 제거: Material interface 에 primary_composition?: string 추가.
    if (filters.compositions.length > 0) {
      result = result.filter(m => {
        const comp = m.primary_composition || 'Other';
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
      result = result.filter(m => matchAnyHeatTreatment(String(m.heat_treatment || '').toLowerCase(), wanted));
    }

    return result;
  }, [materials, filters]);

  /* R221d — low-confidence 숨김 토글 제거 (R221~c 데이터 정비로 low tier = 0). 정렬만 수행.
     신뢰도 전달은 값별 confidence dot + Generic-tier 배지가 담당. */
  const filtered = useMemo(() => {
    return [...filteredUnsorted].sort((a, b) => {
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
  }, [filteredUnsorted, sortKey, sortDir]);

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
  /** R157 — RANGE_FILTER_MAP 키는 Material 의 number-valued property name. 우회 marker 제거를 위해
      keyof Material 로 좁힘 (이전 Record<string, ...> → 안전 type). */
  const RANGE_FILTER_MAP: { [P in keyof Material]?: keyof FilterState } = {
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
    // 1) baseSet — non-range filter 적용.
    //    R209 C-2/C-4/C-5 — 실제 filtered 로직과 정확히 동일하게 맞춤 (이전엔 search/process/manufacturer 가 어긋나
    //    슬라이더 모집단이 틀림: AM 선택 시 exact-match 로 baseSet=0 붕괴, 검색은 5필드 vs 실제 2필드 등).
    let baseSet = materials;
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      baseSet = baseSet.filter(m =>
        fuzzyContains(m.name.toLowerCase(), q) ||
        (m.aliases || []).some(a => fuzzyContains(a.toLowerCase(), q))
      );
    }
    if (filters.query && filters.query.trim()) {
      const parsed = parseQuery(filters.query);
      if (parsed.constraints.length) baseSet = applyQuery(baseSet, parsed);
    }
    if (filters.specs && filters.specs.length) {
      const wanted = filters.specs.map(s => s.toUpperCase().replace(/\s+/g, ' '));
      baseSet = baseSet.filter(m => {
        const specs = (m.meta as { specs?: Array<{ id: string }> })?.specs;
        return !!specs?.length && specs.some(s => wanted.includes(s.id.toUpperCase().replace(/\s+/g, ' ')));
      });
    }
    if (filters.categories.length) baseSet = baseSet.filter(m => filters.categories.includes(m.category));
    if (filters.subcategories.length) baseSet = baseSet.filter(m =>
      filters.subcategories.includes(m.subcategory) || (m.families || []).some(f => filters.subcategories.includes(f))
    );
    if (filters.processes.length) {
      const procGroups: Record<string, string[]> = {
        Wrought: ['wrought', 'cold rolled', 'hot rolled', 'cold drawn', 'hot dip galvani', 'tmcp', 'forged', 'extrusion', 'vacuum refined', 'q+t (heat'],
        Molding: ['injection mold', 'compression mold', 'layup'],
        Casting: ['cast'],
        Powder: ['sintered', 'powder-metallurgy', 'powder metallurgy', 'press-and-sinter', 'mim ', 'metal injection mold'],
        AM: ['lpbf', 'dmls', 'slm', 'sls', 'fdm', 'closed-cell foam', 'am ', 'am('],
      };
      baseSet = baseSet.filter(m => {
        const p = String(m.process || '').toLowerCase();
        if (!p) return false;
        return filters.processes.some(grp => {
          const keys = procGroups[grp];
          if (!keys) return p === grp.toLowerCase();
          return keys.some(k => p.includes(k));
        });
      });
    }
    if (filters.manufacturers.length) baseSet = baseSet.filter(m => {
      const raw = Array.isArray(m.manufacturers) && m.manufacturers.length ? m.manufacturers : (m.manufacturer ? [m.manufacturer] : []);
      const mfs = raw.flatMap(s => String(s || '').split(',').map(x => x.trim())).filter(Boolean);
      return filters.manufacturers.some(f => mfs.includes(f));
    });
    if (filters.compositions.length) baseSet = baseSet.filter(m => filters.compositions.includes(m.primary_composition || 'Other'));
    if (filters.corrosion.length) baseSet = baseSet.filter(m => m.corrosion_resistance != null && filters.corrosion.includes(String(m.corrosion_resistance)));
    if (filters.machinability.length) baseSet = baseSet.filter(m => m.machinability != null && filters.machinability.includes(String(m.machinability)));
    if (filters.weldability.length) baseSet = baseSet.filter(m => m.weldability != null && filters.weldability.includes(String(m.weldability)));
    if (filters.rohsOnly) baseSet = baseSet.filter(m => m.rohs_compliant !== false);
    if (filters.heatTreatments && filters.heatTreatments.length) {
      const wanted = filters.heatTreatments.map(s => s.toLowerCase());
      baseSet = baseSet.filter(m => matchAnyHeatTreatment(String(m.heat_treatment || '').toLowerCase(), wanted));
    }

    // 2) 각 target property 에 대해 — 자기 자신 제외 모든 range filter 적용 후 min/max 계산
    // R157 — `as any` 제거: keyof Material 로 type-safe access.
    const getProp = (m: Material, key: keyof Material): number | null => {
      const v = m[key];
      return typeof v === 'number' && isFinite(v) ? v : null;
    };
    const out: Record<string, [number, number] | null> = {};
    for (const [propKey, filterKey] of Object.entries(RANGE_FILTER_MAP) as Array<[keyof Material, keyof FilterState]>) {
      let s = baseSet;
      for (const [otherProp, otherFilter] of Object.entries(RANGE_FILTER_MAP) as Array<[keyof Material, keyof FilterState]>) {
        if (otherProp === propKey) continue;
        const r = filters[otherFilter] as [number, number] | null | undefined;
        if (!r) continue;
        s = s.filter(m => {
          const v = getProp(m, otherProp);
          return v != null && v >= r[0] && v <= r[1];
        });
      }
      const vals: number[] = [];
      for (const m of s) {
        const v = getProp(m, propKey);
        if (v != null) vals.push(v);
      }
      out[propKey] = vals.length ? [Math.min(...vals), Math.max(...vals)] : null;
      // Reference filterKey for narrowedRanges (consumer pairs propKey↔filterKey)
      void filterKey;
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
