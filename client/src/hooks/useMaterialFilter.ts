/*
 * AM Materials Explorer — Filter State Hook
 * Scientific Precision Design System
 *
 * R157b — FilterState interface + DEFAULT_FILTERS → lib/filter-state.ts.
 *   Hook 본체 (filter / sort / narrowedRanges) 만 여기 유지.
 *   기존 import 호환을 위해 두 심볼 모두 re-export.
 *
 * F1 (2026-09-20) — 술어를 한 벌로 모았다. 본필터(filteredUnsorted)와 leave-one-out 모집단(narrowedRanges)이
 *   같은 술어 사슬을 **각자 복사**해 갖고 있었고(R209 가 한 번 맞춘 뒤 다시 갈라짐), 두 곳이 어긋나 있었다:
 *   ① 모집단 쪽이 출처 등급(E3)·원소 범위 필터를 적용하지 않아 슬라이더 범위가 결과보다 넓었다.
 *   ② 모집단 쪽이 평면값만 읽어(getProp) ranges 에만 값이 있는 재료가 빠졌다 — T_max 슬라이더 상한이 2000 인데
 *      HfC 3000·ZrB₂ 2200·HfB₂ 2300·Y₂O₃ 2200 이 ranges 에만 있어 슬라이더로는 도달할 수 없었다(A15 잔여).
 *   수치 범위 키 ↔ 물성 키 대응은 lib/range-filters.ts 한 곳(RANGE_FILTERS), 공정 그룹은 lib/process-groups.ts.
 */

import { useState, useMemo, useCallback } from 'react';
import { propValue, type Material } from '@/lib/materials';
import { parseCompositionRange, getRangeValue } from '@/lib/composition-parser';
import { applyQuery, parseQuery } from '@/lib/query-dsl';
// R157b — fuzzyContains → lib/fuzzy-search.ts 로 이동.
import { fuzzyContains, fuzzyRank } from '@/lib/fuzzy-search';
// R157b — HT matcher (filter 카테고리 → material.heat_treatment 매칭) → lib/ht-matcher.ts.
import { matchAnyHeatTreatment } from '@/lib/ht-matcher';
// R157b — FilterState type + DEFAULT_FILTERS 도 lib 로 이동.
import { type FilterState, DEFAULT_FILTERS } from '@/lib/filter-state';
import { matchesAuthority, authorityRank } from '@/lib/source-authority';
// E15l — 환경별 내식 필터 (합금 보정 적용 후 verdict 기준, WeakMap 캐시).
import { passesCorrosionEnv } from '@/lib/corrosion-guidance';
import { matchesAnyProcessGroup } from '@/lib/process-groups';
import { RANGE_FILTERS } from '@/lib/range-filters';

// Re-export for backward compat (Home / ScenarioDialog / 다른 consumer).
export { DEFAULT_FILTERS, type FilterState };

/**
 * R144b — Fuzzy text search (expanded for R144d full-text).
 * 외부 사용: parser-fuzzy match 도 동일 의미.
 */
export function fuzzyContainsExport(text: string, q: string): boolean {
  return fuzzyContains(text, q);
}

/** 물성 값이 [lo, hi] 안에 있는가 — 값은 공용 리더(propValue)로 읽는다. 값 없음은 탈락. */
export function passesRange(m: Material, prop: keyof Material, range: readonly [number, number]): boolean {
  const v = propValue(m, prop as string);
  return v !== null && v >= range[0] && v <= range[1];
}

/**
 * 수치 범위 필터(RANGE_FILTERS)를 **뺀** 모든 술어. 본필터와 슬라이더 모집단이 이 한 함수를 쓴다 —
 * 술어를 여기 말고 다른 곳에 더 적으면 두 화면이 다시 갈라진다.
 */
/** AUD R09 — 마지막 텍스트 검색의 매칭 등급·필드 (id → {rank, field}). applyBaseFilters 가 검색이 있을 때마다 다시 채운다.
 *  정렬(기본 정렬일 때 관련도 우선)과 표시("이름/별칭/UNS 중 어디가 맞았나")가 읽는다 — 데이터에 파생 필드를 심지 않는다. */
export const searchRank = new Map<string, { rank: number; field: 'name' | 'alias' | 'uns' }>();

export function applyBaseFilters(materials: Material[], filters: FilterState): Material[] {
  let result = materials;
  if (filters.search.trim()) searchRank.clear();

  /* E3 (H6 W4-2) — 출처 권위 등급. 선택한 등급의 출처를 **가진** 재료를 남긴다(OR).
     선택이 비면 전량 통과 — 원칙 8(구분 표시만, 저신뢰 은폐 금지). */
  if (filters.authorities?.length) {
    result = result.filter((m) => matchesAuthority(m, filters.authorities));
  }

  // R180 — Text search 범위를 alloy name + alias 만으로 제한 (사용자 지적: 검색 범위 너무 넓음).
  //   이전: name + subcategory + manufacturer + process + aliases + industry_note + heat_treatment
  //         + meta.applications + composition keys + spec id (10가지 field 검색)
  //   현재: name + aliases (+ R226h UNS 정규 코드). 다른 field 는 filter 또는 DSL query 사용.
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    /* AUD R09 — 등급 매칭: 이름 정확 일치 > 별칭/UNS 정확 > 구분자 제거 > 부분수열(문자 질의만). 등급은 searchRank 에 남겨
       정렬(기본 정렬일 때 관련도 우선)과 표시("어느 필드가 맞았는가")에 쓴다. */
    const ranked: Material[] = [];
    for (const m of result) {
      const rn = fuzzyRank(m.name.toLowerCase(), q);
      const ra = Math.min(...(m.aliases || []).map(a => { const r = fuzzyRank(a.toLowerCase(), q); return r < 0 ? 9 : r; }), 9);
      const ru = Math.min(...(m.uns || []).map(u => { const r = fuzzyRank(u.toLowerCase(), q); return r < 0 ? 9 : r; }), 9);   // R226h/P3-8 — UNS 정규 코드 검색 ("N07718")
      const best = Math.min(rn < 0 ? 9 : rn, ra, ru);
      if (best === 9) continue;
      const field = (rn >= 0 && rn <= Math.min(ra, ru)) ? 'name' : ra <= ru ? 'alias' : 'uns';
      searchRank.set(m.id, { rank: best, field });
      ranked.push(m);
    }
    result = ranked;
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

  if (filters.categories.length > 0) {
    result = result.filter(m => filters.categories.includes(m.category));
  }

  if (filters.subcategories.length > 0) {
    result = result.filter(m =>
      filters.subcategories.includes(m.subcategory) ||
      (m.families || []).some(f => filters.subcategories.includes(f))
    );
  }

  /* Process filter — R192/R193 group-based matching (UI 옵션 5개 vs DB 44 process 문자열).
     그룹 표·술어는 lib/process-groups.ts — 사이드바 count 도 같은 술어를 쓴다. */
  if (filters.processes.length > 0) {
    result = result.filter(m => matchesAnyProcessGroup(m, filters.processes));
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

  /* Composition range filters (원소 함량 %) — 클라이언트 사이드.
     예전엔 원소 25종 하드코딩 목록만 돌아, 목록 밖 원소에 범위를 걸면 조용히 무시됐다.
     걸린 원소를 그대로 순회한다(현재 UI 가 내는 원소는 전부 그 목록 안이라 결과 동일). */
  for (const [el, range] of Object.entries(filters.compositionRanges)) {
    if (!range) continue;
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

  // Qualitative filters (corrosion / machinability / weldability)
  if (filters.corrosion.length) result = result.filter(m => m.corrosion_resistance != null && filters.corrosion.includes(String(m.corrosion_resistance)));
  if (filters.machinability.length) result = result.filter(m => m.machinability != null && filters.machinability.includes(String(m.machinability)));
  if (filters.weldability.length) result = result.filter(m => m.weldability != null && filters.weldability.includes(String(m.weldability)));
  // E15l — 환경별 내식 최소 등급 (부식 카드와 동일한 합금 보정 판정 사용)
  if (filters.corrosionEnvMin && Object.keys(filters.corrosionEnvMin).length) result = result.filter(m => passesCorrosionEnv(m, filters.corrosionEnvMin));
  // E15l — 고온 데이터 보유 (승온 곡선 또는 크리프 파단 곡선)
  if (filters.hasElevatedData) result = result.filter(m => (m.elevated_temp && m.elevated_temp.length > 0) || (m.creep_rupture && m.creep_rupture.length > 0));
  // R16: RoHS toggle — false (default) 면 통과, true 면 rohs_compliant === false 만 제외 (null/true 유지).
  if (filters.rohsOnly) result = result.filter(m => m.rohs_compliant !== false);
  // R38e: 열처리 다중 선택 — m.heat_treatment 가 선택된 라벨 중 하나로 시작 or 포함 일 때 통과.
  //   현실적이지 않은 조합 (예: SLM 합금 + 단조 후 어닐링) 은 데이터에 없는 시점에서 자동 배제.
  if (filters.heatTreatments && filters.heatTreatments.length) {
    const wanted = filters.heatTreatments.map(s => s.toLowerCase());
    result = result.filter(m => matchAnyHeatTreatment(String(m.heat_treatment || '').toLowerCase(), wanted));
  }

  return result;
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

  /** 여러 키를 현재 상태 위에 한 번에 덮는다(한 렌더). 프리셋 적용이 키마다 updateFilter 를 부르며
   *  `Record<string, any>` 로 돌던 것의 대체 — Partial<FilterState> 라 값 타입이 검사된다. */
  const mergeFilters = useCallback((partial: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...partial }));
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
    let result = applyBaseFilters(materials, filters);

    /* 값 읽기는 공용 리더(propValue) — 평면값만 보면 **ranges 에만 값이 있는 503 (재료x물성)**
       이 "값 없음" 으로 탈락했다(Tmax 129 · 가격 105 · KIC 39 · 열팽창 105 ...). 인용된 값을
       가진 재료를 필터가 숨기고 있던 것이고, 표는 그 값을 표시하고 있었으므로 화면끼리도
       어긋났다. 판정과 표시는 같은 리더를 써야 한다. */
    for (const def of RANGE_FILTERS) {
      const range = filters[def.key];
      if (range) result = result.filter(m => passesRange(m, def.prop, range));
    }
    return result;
  }, [materials, filters]);

  /* R221d — low-confidence 숨김 토글 제거 (R221~c 데이터 정비로 low tier = 0). 정렬만 수행.
     신뢰도 전달은 값별 confidence dot + Generic-tier 배지가 담당. */
  const filtered = useMemo(() => {
    /* AUD R09 — 텍스트 검색 중이고 사용자가 정렬 열을 고르지 않았으면(기본 'name' asc) 관련도(매칭 등급) 우선. */
    const byRelevance = filters.search.trim() && sortKey === 'name' && sortDir === 'asc';
    return [...filteredUnsorted].sort((a, b) => {
      if (byRelevance) {
        const ra = searchRank.get(a.id)?.rank ?? 9, rb = searchRank.get(b.id)?.rank ?? 9;
        if (ra !== rb) return ra - rb;
      }
      /* E3 — '출처 권위' 정렬. Material 의 실제 필드가 아니라 sources[] 에서 도출하는 값이라
         키를 가로채 별도 비교를 쓴다(파생 필드를 데이터에 심지 않는다). */
      if ((sortKey as string) === '__authority') {
        const c = authorityRank(a) - authorityRank(b) || a.name.localeCompare(b.name);
        return sortDir === 'asc' ? c : -c;
      }
      /* 숫자 물성도 같은 리더로 읽는다 — 평면값만 보면 ranges 에만 값이 있는 재료가
         정렬 방향과 무관하게 바닥(값 없음)으로 밀렸다. 값 없음이 마지막인 규칙은 유지. */
      const an = propValue(a, sortKey as string);
      const bn = propValue(b, sortKey as string);
      if (an !== null || bn !== null) {
        if (an === null) return 1;
        if (bn === null) return -1;
        return sortDir === 'asc' ? an - bn : bn - an;
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredUnsorted, sortKey, sortDir, filters.search]);

  /* 결과를 거르고 있는 필터의 수 — 'Reset'/'필터 지우기' 버튼의 노출 조건. 예전엔 출처 등급·DSL·규격
     필터가 빠져 있어, 그 셋만 걸린 상태에선 결과가 줄어 있는데 지우기 버튼이 안 보였다. */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.query && filters.query.trim()) count++;
    if (filters.specs && filters.specs.length > 0) count++;
    if (filters.authorities && filters.authorities.length > 0) count++;
    if (filters.categories.length > 0) count++;
    if (filters.subcategories.length > 0) count++;
    if (filters.processes.length > 0) count++;
    if (filters.manufacturers.length > 0) count++;
    if (filters.compositions.length > 0) count++;
    if (Object.values(filters.compositionRanges).some(r => r !== null)) count++;
    for (const def of RANGE_FILTERS) if (filters[def.key]) count++;
    if (filters.corrosion.length > 0) count++;
    if (filters.machinability.length > 0) count++;
    if (filters.weldability.length > 0) count++;
    if (filters.corrosionEnvMin && Object.keys(filters.corrosionEnvMin).length > 0) count++;
    if (filters.hasElevatedData) count++;
    if (filters.rohsOnly) count++;
    if (filters.heatTreatments && filters.heatTreatments.length > 0) count++;
    return count;
  }, [filters]);

  // R51b — Leave-one-out narrowed ranges. 각 numeric property 의 가능 범위는
  //   "그 property filter 만 제외" 한 모든 필터 적용 후 결과의 min/max.
  //   Granta MI 스타일 — slider 가 다른 필터의 제약 반영. 키는 물성 키(RANGE_FILTERS[].prop).
  const narrowedRanges = useMemo(() => {
    // 1) baseSet — 수치 범위를 뺀 모든 필터. 본필터와 **같은 함수**(R209 모집단 일치 원칙을 코드로 고정).
    const baseSet = applyBaseFilters(materials, filters);

    // 2) 각 target property 에 대해 — 자기 자신 제외 모든 range filter 적용 후 min/max 계산 (리더는 propValue).
    const out: Record<string, [number, number] | null> = {};
    for (const def of RANGE_FILTERS) {
      let s = baseSet;
      for (const other of RANGE_FILTERS) {
        if (other.prop === def.prop) continue;
        const r = filters[other.key];
        if (!r) continue;
        s = s.filter(m => passesRange(m, other.prop, r));
      }
      let lo = Infinity, hi = -Infinity;
      for (const m of s) {
        const v = propValue(m, def.prop as string);
        if (v === null) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      out[def.prop] = lo <= hi ? [lo, hi] : null;
    }
    return out;
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
    mergeFilters,
    filtered,
    sortKey,
    sortDir,
    toggleSort,
    activeFilterCount,
    narrowedRanges,
  };
}
