/*
 * AM Materials Explorer — Filter Sidebar
 * Scientific Precision Design System
 * Left panel: family tree, process / HT / element filters, numeric range sliders, qualitative & regulatory toggles.
 *
 * F1 (2026-09-20) — 1369줄 단일 파일을 filter-sidebar/ 로 나눴다. 크기보다 중요한 것: 수치 범위 슬라이더가
 * 23 블록의 JSX·23 개의 useMemo·23 행의 칩 목록으로 세 번 적혀 있던 것을 RANGE_FILTERS(lib/range-filters.ts)
 * 한 표에서 그린다 — 필터 술어(useMaterialFilter)와 같은 표라 슬라이더·칩·술어가 어긋날 수 없다.
 */

import { useMemo } from 'react';
import { useT, useLang } from '@/lib/i18n';
import { priceUnitLabel, loadUnitSystem } from '@/lib/unit-convert';
import { useUnitSystem } from '@/lib/unit-context';   // AUD F01
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompositionFamilyBrowser } from '@/components/CompositionFamilyBrowser';
import type { Material } from '@/lib/materials';
import { getPropertyRange, getUniqueValues } from '@/lib/materials';
import { DEFAULT_FILTERS, type FilterState } from '@/hooks/useMaterialFilter';
import { RANGE_FILTERS, RANGE_SECTIONS, rangeUnit, type RangeSection } from '@/lib/range-filters';
import { RangeSlider } from './filter-sidebar/RangeSlider';
import { FamilyFilter } from './filter-sidebar/FamilyFilter';
import { ProcessFilter } from './filter-sidebar/ProcessFilter';
import { HeatTreatmentFilter } from './filter-sidebar/HeatTreatmentFilter';
import { ElementRangeFilter } from './filter-sidebar/ElementRangeFilter';
import { CorrosionEnvFilter } from './filter-sidebar/CorrosionEnvFilter';
import { QualitativeFilter, orderQual } from './filter-sidebar/QualitativeFilter';
import { AuthorityFilter } from './filter-sidebar/AuthorityFilter';
import { ActiveFilterChips } from './filter-sidebar/ActiveFilterChips';
import { SectionGroup } from './filter-sidebar/FilterSection';

interface FilterSidebarProps {
  materials: Material[];
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  resultCount: number;
  onSelectMaterial?: (material: Material) => void;
  /** R51b — Leave-one-out narrowed ranges. 각 numeric property 의 slider min/max 를
   *  "자기 자신 제외" 한 모든 필터 적용 결과 기준으로 좁혀 표시. 키는 물성 키(RANGE_FILTERS[].prop). */
  narrowedRanges?: Record<string, [number, number] | null>;
  /** E3 (H6 W4-2) — '출처 권위순' 정렬 토글. 표 컬럼이 아니라 sources[] 파생값이라 사이드바에 둔다. */
  onSortByAuthority?: () => void;
  /** 현재 정렬이 출처 권위순인가 (버튼 활성 표시). */
  sortedByAuthority?: boolean;
}

const SECTION_LABEL_KO: Record<RangeSection, string> = Object.fromEntries(RANGE_SECTIONS.map((s) => [s.id, s.label])) as Record<RangeSection, string>;
const SECTION_LABEL_EN: Record<RangeSection, string> = Object.fromEntries(RANGE_SECTIONS.map((s) => [s.id, s.labelEn])) as Record<RangeSection, string>;

export default function FilterSidebar({
  materials,
  filters,
  updateFilter,
  resetFilters,
  activeFilterCount,
  resultCount,
  onSelectMaterial,
  narrowedRanges,
  onSortByAuthority,
  sortedByAuthority,
}: FilterSidebarProps) {
  const t = useT();
  // R40b — Price slider unit lang/units 인식 ($/kg ↔ ₩/kg). (사용 직전 선언 — useMemo 밖이라도 TDZ 정책과 같은 순서)
  const { lang } = useLang();
  const SECTION_LABEL = lang === 'en' ? SECTION_LABEL_EN : SECTION_LABEL_KO;   // AUD F23
  const en = lang === 'en';
  /* AUD R11 — 기본 인기도 필터가 살아 있는지 (Reset 이 복원하는 상태). */
  const isDefaultPopularity = Array.isArray(filters.popularityRange) && filters.popularityRange[0] === DEFAULT_FILTERS.popularityRange![0] && filters.popularityRange[1] === DEFAULT_FILTERS.popularityRange![1];
  const sidebarPriceLabel = priceUnitLabel(lang, loadUnitSystem(), 'kg');
  /* AUD F01 — 슬라이더 값은 SI 로 저장·표시한다. 헤더가 Imperial 이면 섹션 제목에 'SI' 를 붙여 범위를 밝힌다. */
  const siTag = useUnitSystem() === 'imperial' ? ' (SI)' : '';

  // 전체 데이터 기준 범위 — materials 가 바뀔 때만 다시 센다.
  const baseRanges = useMemo(() => {
    const out: Record<string, [number, number]> = {};
    for (const def of RANGE_FILTERS) out[def.prop] = getPropertyRange(materials, def.prop);
    return out;
  }, [materials]);

  // R51b — effective ranges: narrowedRanges (leave-one-out) 우선, 없으면 전체 dataset range.
  //   사용자가 다른 필터 적용 시 slider min/max 가 좁아짐. 자기 자신 only 일 땐 전체 범위 유지.
  const effRanges = useMemo(() => {
    const out: Record<string, [number, number] | null> = {};
    for (const def of RANGE_FILTERS) out[def.prop] = (narrowedRanges && narrowedRanges[def.prop]) || baseRanges[def.prop];
    return out;
  }, [narrowedRanges, baseRanges]);

  const corrosionOpts = useMemo(() => orderQual(getUniqueValues(materials, 'corrosion_resistance')), [materials]);
  const machinabilityOpts = useMemo(() => orderQual(getUniqueValues(materials, 'machinability')), [materials]);
  const weldabilityOpts = useMemo(() => orderQual(getUniqueValues(materials, 'weldability')), [materials]);

  /** 한 섹션의 수치 범위 슬라이더 — 표 순서대로, 범위가 있는 물성만. */
  const sliders = (section: RangeSection) => RANGE_FILTERS.filter((d) => d.section === section).map((def) => {
    const r = effRanges[def.prop];
    if (!r) return null;
    return (
      <RangeSlider
        key={def.key}
        label={t(def.tKey)}
        unit={rangeUnit(def, sidebarPriceLabel)}
        min={r[0]}
        max={r[1]}
        value={filters[def.key]}
        onChange={(v) => updateFilter(def.key, v)}
      />
    );
  });

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-foreground/60" />
          <h2 className="text-xs font-semibold text-foreground">{t('filter.title')}</h2>
        </div>
        <div className="flex items-center gap-1">
          {/* AUD R11 — 전체 보기(기본 인기도 필터 해제)와 기본값 복원을 별도 동작으로. */}
          {isDefaultPopularity && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateFilter('popularityRange', null)}
              title={t('filter.showAll.tip')}
              className="h-6 px-2 text-[10px] text-accent hover:text-foreground"
            >
              {t('filter.showAll')}
            </Button>
          )}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              title={t('filter.reset.tip')}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              {t('filter.reset')}
            </Button>
          )}
        </div>
      </div>

      {/* Material Count */}
      <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
        <p className="text-[10px] font-mono text-muted-foreground">
          {resultCount.toLocaleString()} materials{isDefaultPopularity && <span className="ml-1 text-muted-foreground/70">· {t('filter.defaultNote')}</span>}
        </p>
      </div>

      {/* R38a — 적용된 필터 chip 섹션 */}
      <ActiveFilterChips filters={filters} updateFilter={updateFilter} />

      {/* Filters — R35a 그룹화 순서: 기본 검색 → 기계 → 열 → 전기 → 원가 → 품질 → 규제 */}
      <div className="flex-1 overflow-y-auto">
        {/* ── 1. 기본 검색 (Popularity 최상단 — 가장 중요한 property) ── */}
        <SectionGroup label={SECTION_LABEL.essentials} />
        {sliders('essentials')}
        {/* R44a — Category 필터 제거. Family Tree 가 1차 family 4 카테고리 + 2-3차 subcategory 모두 노출. */}
        <FamilyFilter
          materials={materials}
          selectedCategories={filters.categories}
          selected={filters.subcategories}
          onChange={v => updateFilter('subcategories', v)}
        />
        <ProcessFilter
          selected={filters.processes}
          onChange={v => updateFilter('processes', v)}
          materials={materials}
        />
        <HeatTreatmentFilter
          selected={filters.heatTreatments}
          onChange={v => updateFilter('heatTreatments', v)}
        />
        <ElementRangeFilter
          materials={materials}
          ranges={filters.compositionRanges}
          onChange={v => updateFilter('compositionRanges', v)}
        />

        {/* ── 2. 기계적 성질 ── */}
        <SectionGroup label={SECTION_LABEL.mechanical + siTag} />
        {sliders('mechanical')}

        {/* ── 3. 열적 성질 ── */}
        <SectionGroup label={SECTION_LABEL.thermal + siTag} />
        {sliders('thermal')}

        {/* ── 4. 전기적 성질 ── */}
        <SectionGroup label={SECTION_LABEL.electrical} />
        {sliders('electrical')}

        {/* ── 5. 원가·가공 ── */}
        <SectionGroup label={SECTION_LABEL.cost} />
        {sliders('cost')}

        {/* ── 6. 품질·내환경성 ── */}
        <SectionGroup label={en ? 'Quality' : '품질 · Quality'} />
        <QualitativeFilter label="Corrosion resistance" options={corrosionOpts} selected={filters.corrosion} onChange={v => updateFilter('corrosion', v)} />
        {/* E15l — 환경별 내식 (부식 카드 합금 보정 판정 기반) */}
        <CorrosionEnvFilter value={filters.corrosionEnvMin || {}} onChange={v => updateFilter('corrosionEnvMin', v)} />
        <QualitativeFilter label="Machinability" options={machinabilityOpts} selected={filters.machinability} onChange={v => updateFilter('machinability', v)} />
        <QualitativeFilter label="Weldability" options={weldabilityOpts} selected={filters.weldability} onChange={v => updateFilter('weldability', v)} />
        <AuthorityFilter materials={materials} selected={filters.authorities ?? []} onChange={v => updateFilter('authorities', v)} onSort={onSortByAuthority} sortActive={sortedByAuthority} />
        {/* E15l — 고온 데이터 보유 (승온/크리프 곡선) */}
        <label className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer select-none hover:bg-muted/40 rounded">
          <input type="checkbox" checked={!!filters.hasElevatedData} onChange={(e) => updateFilter('hasElevatedData', e.target.checked)} className="accent-accent" />
          <span className="flex-1">{en ? 'Elevated-temperature data only' : '고온 데이터 보유만'}</span>
          <span className="text-[10px] text-muted-foreground">{en ? 'elev-temp · creep curves' : '승온·크리프 곡선'}</span>
        </label>

        {/* ── 7. 규제 ── */}
        <SectionGroup label={en ? 'Regulatory' : '규제 · Regulatory'} />
        {/* AUD-3 D05 — "통과" 가 아니라 "확인된 적합". 무엇을 보고 판정했는지·왜 빠지는지 라벨과 도움말에 적는다. */}
        <label className="flex items-start gap-2 px-3 py-2 text-xs cursor-pointer select-none hover:bg-muted/40 rounded" title={t('filter.rohsOnly.help')}>
          <input type="checkbox" checked={!!filters.rohsOnly} onChange={(e) => updateFilter('rohsOnly', e.target.checked)} className="accent-accent mt-0.5" />
          <span className="flex-1">
            {t('filter.rohsOnly')}
            <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5">{en ? 'Not declared = “no data”, excluded (≠ non-compliant)' : '미기재는 “자료 부족”으로 제외 (부적합 아님)'}</span>
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">Pb·Cd·Hg</span>
        </label>
        {/* ── 8. Composition Browser (참고용) ── */}
        <SectionGroup label={en ? 'Composition Tree' : '구성 탐색 · Composition Tree'} />
        <CompositionFamilyBrowser
          materials={materials}
          onSelectMaterial={onSelectMaterial}
          onApplyCompositionFilter={v => updateFilter('compositionRanges', v)}
        />
      </div>
    </div>
  );
}
