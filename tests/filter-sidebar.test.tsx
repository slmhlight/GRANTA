// @vitest-environment jsdom
/*
 * F1 (2026-09-20) — FilterSidebar 분해가 지켜야 하는 계약.
 *
 * 크기가 아니라 **정의가 하나인가**를 본다. 분해 전에는 수치 범위 필터의 키↔물성↔단위 대응이 여섯 벌,
 * 공정 그룹 키워드 표가 세 벌이었고, 그 복사본들이 실제로 어긋나 있었다:
 *   · 사이드바 공정 count 가 필터 결과와 1건씩 달랐다(다른 필드를 읽음)
 *   · 슬라이더 모집단이 평면값만 읽어 ranges 에만 값이 있는 재료(UHTC T_max 2200~3000)에 도달할 수 없었다
 *   · 모집단 술어에 출처 등급·원소 범위 필터가 빠져 있었다
 *   · KIC 단위가 표·상세와 사이드바에서 달랐다('MPa√m' vs 'MPa·√m')
 * 아래는 그 부류가 되돌아오면 실데이터에서 발화하는 검사다.
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { render, cleanup, fireEvent, renderHook, act } from '@testing-library/react';
import FilterSidebar from '@/components/FilterSidebar';
import { useMaterialFilter, applyBaseFilters } from '@/hooks/useMaterialFilter';
import { RANGE_FILTERS, RANGE_SECTIONS, rangeUnit } from '@/lib/range-filters';
import { PROCESS_GROUPS, matchesProcessGroup } from '@/lib/process-groups';
import { DEFAULT_FILTERS, type FilterState, type FilterRangeKey } from '@/lib/filter-state';
import { ALL_NUMERIC_PROPERTIES, getPropertyRange, propValue, type Material } from '@/lib/materials';
import { TRANSLATIONS } from '@/lib/i18n';
import { CORROSION_ENV_AXES } from '@/lib/corrosion-guidance';
import { HEAT_TREATMENT_OPTIONS } from '@/components/filter-sidebar/HeatTreatmentFilter';
import { CORR_ENV_ROWS } from '@/components/filter-sidebar/CorrosionEnvFilter';
import { tier2FamilyColor } from '@/components/filter-sidebar/family-tiers';

const mats: Material[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'client/public/materials.json'), 'utf8'));
const ALL: Partial<FilterState> = { popularityRange: null };

/** 물성의 [min, max] — 공용 리더 기준. 비교 대상이 되는 "정답" 계산이라 필터 코드와 독립적으로 쓴다. */
function minmax(ms: Material[], prop: string): [number, number] | null {
  let lo = Infinity, hi = -Infinity;
  for (const m of ms) { const v = propValue(m, prop); if (v === null) continue; if (v < lo) lo = v; if (v > hi) hi = v; }
  return lo <= hi ? [lo, hi] : null;
}

afterEach(cleanup);

describe('RANGE_FILTERS — 수치 범위 필터의 단일 정의', () => {
  it('FilterState 의 모든 *Range 키가 정확히 한 번 등재된다', () => {
    const rangeKeys = Object.keys(DEFAULT_FILTERS).filter((k) => k.endsWith('Range')) as FilterRangeKey[];
    const listed = RANGE_FILTERS.map((d) => d.key as string);
    expect([...listed].sort()).toEqual([...rangeKeys].sort());
    expect(new Set(listed).size).toBe(listed.length);
  });
  it('물성 키는 전부 PropertyMeta 에 있고, 단위·i18n 라벨·칩 라벨이 빠짐없다', () => {
    const metaKeys = new Set(ALL_NUMERIC_PROPERTIES.map((p) => p.key as string));
    const chips = new Set<string>();
    for (const d of RANGE_FILTERS) {
      expect(metaKeys.has(d.prop as string), `${d.key}: prop '${String(d.prop)}' 가 ALL_NUMERIC_PROPERTIES 에 없다`).toBe(true);
      expect(TRANSLATIONS[d.tKey]?.ko && TRANSLATIONS[d.tKey]?.en, `${d.key}: i18n '${d.tKey}' 누락`).toBeTruthy();
      expect(typeof rangeUnit(d, '$/kg')).toBe('string');
      expect(chips.has(d.chip), `칩 라벨 중복: ${d.chip}`).toBe(false);
      chips.add(d.chip);
    }
    const sections = new Set(RANGE_SECTIONS.map((s) => s.id));
    for (const d of RANGE_FILTERS) expect(sections.has(d.section)).toBe(true);
  });
  it('단위는 PropertyMeta 와 같다 — 표·상세와 사이드바가 다른 문자열을 쓰지 않는다 (덮어쓴 두 항목만 예외)', () => {
    const meta = new Map(ALL_NUMERIC_PROPERTIES.map((p) => [p.key as string, p.unit]));
    const overridden = RANGE_FILTERS.filter((d) => d.unit !== undefined).map((d) => d.key);
    expect(overridden).toEqual(['popularityRange', 'poissonRatioRange']);
    for (const d of RANGE_FILTERS) {
      if (d.unit !== undefined || d.priced) continue;
      expect(rangeUnit(d, '$/kg')).toBe(meta.get(d.prop as string));
    }
  });
});

describe('공정 그룹 — 사이드바 count 와 필터 결과가 같은 술어를 쓴다', () => {
  it('그룹별 count === 그 그룹만 선택한 필터 결과 수 (실데이터 5 그룹)', () => {
    for (const g of PROCESS_GROUPS) {
      const { result } = renderHook(() => useMaterialFilter(mats));
      act(() => result.current.restoreFilters({ ...ALL, processes: [g.name] }));
      const count = mats.filter((m) => matchesProcessGroup(m, g.name)).length;
      expect(result.current.filtered.length, g.name).toBe(count);
      expect(count, `${g.name} 이 0건이면 그룹 키워드가 죽었다`).toBeGreaterThan(0);
    }
  });
  it('렌더된 count 숫자도 같은 술어에서 나온다', () => {
    const { result } = renderHook(() => useMaterialFilter(mats));
    act(() => result.current.restoreFilters(ALL));
    const { container, getByText } = render(
      <FilterSidebar materials={mats} filters={result.current.filters} updateFilter={() => {}} resetFilters={() => {}}
        activeFilterCount={0} resultCount={mats.length} narrowedRanges={result.current.narrowedRanges} />,
    );
    fireEvent.click(getByText('Process'));
    for (const g of PROCESS_GROUPS) {
      const label = Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.startsWith(g.name));
      const shown = Number(label?.querySelector('span.tabular-nums')?.textContent);
      expect(shown, g.name).toBe(mats.filter((m) => matchesProcessGroup(m, g.name)).length);
    }
  });
  it('process ↔ processes[] 가 어긋난 재료는 산출물에 없다 (레지스트리 게이트의 산출물 측)', () => {
    const bad = mats.filter((m) => (m.processes || []).join(' / ') !== String(m.process || '')).map((m) => m.name);
    expect(bad).toEqual([]);
  });
});

describe('슬라이더 모집단(narrowedRanges) — 필터 결과와 같은 재료를 본다', () => {
  it('범위 필터가 없으면 모집단 = 결과 집합: 23 물성 전부 [min,max] 일치 (출처 등급·원소 범위·검색 포함)', () => {
    const states: Partial<FilterState>[] = [
      ALL,
      { ...ALL, authorities: ['standard'] },
      { ...ALL, compositionRanges: { Cr: [15, 30] }, categories: ['Metal'] },
      { ...ALL, search: 'inconel', heatTreatments: ['Aged / Precipitation'] },
      { ...ALL, corrosionEnvMin: { '해수': 'good' }, rohsOnly: true },
    ];
    for (const st of states) {
      const { result } = renderHook(() => useMaterialFilter(mats));
      act(() => result.current.restoreFilters(st));
      expect(result.current.filtered.length, JSON.stringify(st)).toBeGreaterThan(0);
      for (const d of RANGE_FILTERS) {
        expect(result.current.narrowedRanges[d.prop as string], `${JSON.stringify(st)} · ${String(d.prop)}`).toEqual(minmax(result.current.filtered, d.prop as string));
      }
    }
  });
  it('ranges 에만 값이 있는 재료도 경계에 든다 — T_max 상한 ≥ 3000 (HfC), 기본 범위도 같은 리더', () => {
    const { result } = renderHook(() => useMaterialFilter(mats));
    act(() => result.current.restoreFilters(ALL));
    const tmax = result.current.narrowedRanges.max_service_temp;
    expect(tmax && tmax[1]).toBeGreaterThanOrEqual(3000);
    expect(getPropertyRange(mats, 'max_service_temp')[1]).toBe(tmax![1]);
    // 되돌아오면 정확히 이 수로 발화한다: 평면값이 없고 ranges 에만 있는 값의 수
    const rangesOnly = mats.filter((m) => typeof m.max_service_temp !== 'number' && propValue(m, 'max_service_temp') !== null).length;
    expect(rangesOnly).toBeGreaterThan(50);
  });
  it('leave-one-out: 자기 범위는 빼고 다른 범위는 적용한다', () => {
    const { result } = renderHook(() => useMaterialFilter(mats));
    act(() => result.current.restoreFilters({ ...ALL, densityRange: [0, 3], yieldStrengthRange: [0, 50] }));
    const base = applyBaseFilters(mats, result.current.filters);
    const dens = base.filter((m) => { const v = propValue(m, 'yield_strength'); return v !== null && v >= 0 && v <= 50; });
    expect(result.current.narrowedRanges.density).toEqual(minmax(dens, 'density'));
    const ys = base.filter((m) => { const v = propValue(m, 'density'); return v !== null && v >= 0 && v <= 3; });
    expect(result.current.narrowedRanges.yield_strength).toEqual(minmax(ys, 'yield_strength'));
  });
  it('activeFilterCount — 결과를 거르는 필터는 전부 센다 (출처 등급 포함)', () => {
    const { result } = renderHook(() => useMaterialFilter(mats));
    act(() => result.current.restoreFilters({ ...ALL, authorities: ['standard'] }));
    expect(result.current.filtered.length).toBeLessThan(mats.length);
    expect(result.current.activeFilterCount).toBe(1);
  });
});

describe('사이드바 렌더 — 표에서 그린다', () => {
  it('슬라이더는 RANGE_FILTERS 행마다 하나, 섹션 순서대로', () => {
    const { result } = renderHook(() => useMaterialFilter(mats));
    act(() => result.current.restoreFilters(ALL));
    const { container } = render(
      <FilterSidebar materials={mats} filters={result.current.filters} updateFilter={() => {}} resetFilters={() => {}}
        activeFilterCount={0} resultCount={mats.length} narrowedRanges={result.current.narrowedRanges} />,
    );
    const texts = Array.from(container.querySelectorAll('button')).map((b) => b.textContent?.trim());
    for (const d of RANGE_FILTERS) expect(texts, d.key).toContain(TRANSLATIONS[d.tKey].ko);
    const headers = Array.from(container.querySelectorAll('div.uppercase')).map((d) => d.textContent?.trim());
    const sectionIdx = RANGE_SECTIONS.map((s) => headers.indexOf(s.label));
    expect(sectionIdx.every((i) => i >= 0)).toBe(true);
    expect([...sectionIdx].sort((a, b) => a - b)).toEqual(sectionIdx);
  });
  it('활성 범위 칩은 슬라이더와 같은 단위·같은 순서', () => {
    const active: Partial<FilterState> = { ...ALL, modulusRange: [100, 300], yieldStrengthRange: [100, 2000], fractureToughnessRange: [20, 300], poissonRatioRange: [0.25, 0.35] };
    const { result } = renderHook(() => useMaterialFilter(mats));
    act(() => result.current.restoreFilters(active));
    const { container } = render(
      <FilterSidebar materials={mats} filters={result.current.filters} updateFilter={() => {}} resetFilters={() => {}}
        activeFilterCount={4} resultCount={result.current.filtered.length} narrowedRanges={result.current.narrowedRanges} />,
    );
    const chips = Array.from(container.querySelectorAll('button[title="클릭하여 제거"]')).map((b) => b.textContent?.trim() ?? '');
    const activeDefs = RANGE_FILTERS.filter((d) => (active as Record<string, unknown>)[d.key]);
    expect(chips).toEqual(activeDefs.map((d) => {
      const [lo, hi] = (active as Record<string, [number, number]>)[d.key];
      const f = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1));
      const unit = rangeUnit(d, '$/kg');
      return `${d.chip} ${f(lo)}–${f(hi)}${unit ? ' ' + unit : ''}`;
    }));
    expect(chips.find((c) => c.startsWith('KIC'))).toContain('MPa√m');
  });
});

describe('사이드바 상수 — 다른 SSOT 와 짝이 맞는다', () => {
  it('열처리 옵션은 실데이터에서 전부 1건 이상 매칭 (죽은 옵션·오타 검출)', () => {
    for (const o of HEAT_TREATMENT_OPTIONS) {
      const { result } = renderHook(() => useMaterialFilter(mats));
      act(() => result.current.restoreFilters({ ...ALL, heatTreatments: [o.value] }));
      expect(result.current.filtered.length, o.value).toBeGreaterThan(0);
    }
  });
  it('내식 환경 행은 CORROSION_ENV_AXES 와 집합이 같다', () => {
    expect([...CORR_ENV_ROWS.map((r) => r.env)].sort()).toEqual([...CORROSION_ENV_AXES].sort());
  });
  it('tier2 family 색은 material-colors CLASSES 에서 온다 (R96 앵커 — 카드·표·Ashby 와 같은 hue)', () => {
    const anchors: Record<string, string> = {
      'Stainless Steel': '#3B82F6', 'Tool / Special Steel': '#3B82F6', 'Carbon / Alloy Steel': '#3B82F6',
      'Aluminum': '#F59E0B', 'Nickel Alloy': '#8B5CF6', 'Cobalt Alloy': '#EC4899', 'Titanium': '#06B6D4',
      'Copper Alloy': '#D97706', 'Magnesium': '#0D9488', 'Refractory': '#475569', 'Controlled Expansion': '#8B5CF6',
      'Other Specialty': '#94A3B8', 'Other Metal': '#94A3B8',
    };
    for (const [bucket, hex] of Object.entries(anchors)) expect(tier2FamilyColor(bucket), bucket).toBe(hex);
    expect(tier2FamilyColor('Oxide')).toBeNull();   // 비금속은 tier1 색 폴백
  });
});
