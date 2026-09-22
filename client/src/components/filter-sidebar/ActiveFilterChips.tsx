/*
 * R38a — 적용된 필터 chip 섹션 (상단 요약). 활성 필터를 한 줄 chip 으로 표시 → 클릭 시 개별 제거.
 * 전체 reset 은 header Reset 버튼. 수치 범위 칩의 라벨·단위·순서는 RANGE_FILTERS(사이드바 슬라이더와 같은 표).
 */
import { X as XIcon } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { priceUnitLabel, loadUnitSystem } from '@/lib/unit-convert';
import type { FilterState } from '@/hooks/useMaterialFilter';
import { AUTHORITY_META, type Authority } from '@/lib/source-authority';
import { RANGE_FILTERS, rangeUnit } from '@/lib/range-filters';

interface ActiveFilterChipsProps {
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}

export function ActiveFilterChips({ filters, updateFilter }: ActiveFilterChipsProps) {
  // R40b — Price chip 단위 lang 인식 ($/kg vs ₩/kg).
  const { lang } = useLang();
  const priceLabel = priceUnitLabel(lang, loadUnitSystem(), 'kg');
  const chips: { label: string; onRemove: () => void; key: string }[] = [];
  if (filters.search?.trim()) chips.push({ key: 'search', label: `🔍 "${filters.search}"`, onRemove: () => updateFilter('search', '') });
  if (filters.categories.length) chips.push({ key: 'categories', label: `Cat: ${filters.categories.join(' / ')}`, onRemove: () => updateFilter('categories', []) });
  if (filters.subcategories.length) chips.push({ key: 'subs', label: `Family: ${filters.subcategories.length}개`, onRemove: () => updateFilter('subcategories', []) });
  if (filters.processes.length) chips.push({ key: 'processes', label: `Proc: ${filters.processes.join(' / ')}`, onRemove: () => updateFilter('processes', []) });
  // R38e — heat_treatment (added later in this round)
  const ht = filters.heatTreatments;
  if (ht && ht.length) chips.push({ key: 'ht', label: `HT: ${ht.length}개`, onRemove: () => updateFilter('heatTreatments', []) });
  for (const def of RANGE_FILTERS) {
    const v = filters[def.key];
    if (v) {
      const unit = rangeUnit(def, priceLabel);
      const fmtN = (n: number) => Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);
      chips.push({ key: def.key, label: `${def.chip} ${fmtN(v[0])}–${fmtN(v[1])}${unit ? ' ' + unit : ''}`, onRemove: () => updateFilter(def.key, null) });
    }
  }
  if (Object.values(filters.compositionRanges || {}).some(r => r !== null)) {
    const n = Object.values(filters.compositionRanges).filter(r => r !== null).length;
    chips.push({ key: 'compRanges', label: `Comp: ${n}원소`, onRemove: () => updateFilter('compositionRanges', {}) });
  }
  if (filters.corrosion.length) chips.push({ key: 'corrosion', label: `Corr: ${filters.corrosion.join('/')}`, onRemove: () => updateFilter('corrosion', []) });
  if (filters.corrosionEnvMin && Object.keys(filters.corrosionEnvMin).length) {
    const lbl = Object.entries(filters.corrosionEnvMin).map(([e, v]) => `${e.split('(')[0]}${v === 'excellent' ? '=탁월' : '≥양호'}`).join(' · ');
    chips.push({ key: 'corrEnv', label: `${lang === 'en' ? 'Corrosion env' : '내식 환경'}: ${lbl}`, onRemove: () => updateFilter('corrosionEnvMin', {}) });
  }
  if (filters.hasElevatedData) chips.push({ key: 'elevData', label: '고온 데이터 보유', onRemove: () => updateFilter('hasElevatedData', false) });
  if (filters.machinability.length) chips.push({ key: 'mach', label: `Mach: ${filters.machinability.join('/')}`, onRemove: () => updateFilter('machinability', []) });
  if (filters.weldability.length) chips.push({ key: 'weld', label: `Weld: ${filters.weldability.join('/')}`, onRemove: () => updateFilter('weldability', []) });
  if (filters.authorities?.length) chips.push({ key: 'auth', label: `${lang === 'en' ? 'Source' : '출처'}: ${filters.authorities.map(a => (lang === 'en' ? AUTHORITY_META[a as Authority]?.sEn : AUTHORITY_META[a as Authority]?.s) ?? a).join('/')}`, onRemove: () => updateFilter('authorities', []) });
  if (filters.rohsOnly) chips.push({ key: 'rohs', label: lang === 'en' ? 'RoHS confirmed' : `RoHS 확인 적합만`, onRemove: () => updateFilter('rohsOnly', false) });

  if (chips.length === 0) return null;
  return (
    <div className="px-3 py-2 border-b-2 border-accent/30 bg-accent/5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">{lang === 'en' ? 'Active filters' : '적용된 필터'} · {chips.length}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={c.onRemove}
            title="클릭하여 제거"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full bg-accent/15 text-accent border border-accent/40 hover:bg-rose-500/15 hover:text-rose-700 hover:border-rose-400 transition-colors max-w-[170px]"
          >
            <span className="truncate">{c.label}</span>
            <XIcon className="w-2.5 h-2.5 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
