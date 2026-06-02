/*
 * AM Materials Explorer — Filter Sidebar
 * Scientific Precision Design System
 * Left panel: category checkboxes, composition filter, process filter, numeric range sliders
 */

import { useState, useMemo } from 'react';
import { useT } from '@/lib/i18n';
import { ChevronDown, ChevronRight, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RangeSliderCompact } from '@/components/RangeSliderCompact';
import { CompositionFamilyBrowser } from '@/components/CompositionFamilyBrowser';
import type { Material } from '@/lib/materials';
import { getPropertyRange, getUniqueValues, CATEGORY_COLORS, COMPOSITION_COLORS, COMPOSITION_OPTIONS } from '@/lib/materials';
import type { FilterState } from '@/hooks/useMaterialFilter';
import { parseCompositionRange, getRangeValue } from '@/lib/composition-parser';

interface FilterSidebarProps {
  materials: Material[];
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  resultCount: number;
  onSelectMaterial?: (material: Material) => void;
}

// ── Range Slider (for numeric properties) ───────────────────────────────────
interface RangeSliderProps {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: [number, number] | null;
  onChange: (v: [number, number] | null) => void;
}

function RangeSlider({ label, unit, min, max, value, onChange }: RangeSliderProps) {
  const [expanded, setExpanded] = useState(false);
  const current: [number, number] = value ?? [min, max];
  const isActive = value !== null;

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-1.5">
          {label}
          {isActive && (
            <span className="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
            <span>{current[0].toFixed(1)} {unit}</span>
            <span>{current[1].toFixed(1)} {unit}</span>
          </div>
          <div className="space-y-1.5">
            <input
              type="range"
              className="range-slider w-full"
              min={min}
              max={max}
              step={(max - min) / 100}
              value={current[0]}
              onChange={e => {
                const v = parseFloat(e.target.value);
                onChange([Math.min(v, current[1]), current[1]]);
              }}
            />
            <input
              type="range"
              className="range-slider w-full"
              min={min}
              max={max}
              step={(max - min) / 100}
              value={current[1]}
              onChange={e => {
                const v = parseFloat(e.target.value);
                onChange([current[0], Math.max(v, current[0])]);
              }}
            />
          </div>
          <div className="flex gap-1.5">
            <input
              type="number"
              placeholder="Min"
              value={current[0].toFixed(1)}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) onChange([Math.max(v, min), current[1]]);
              }}
              className="flex-1 px-2 py-1 text-xs bg-muted border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="number"
              placeholder="Max"
              value={current[1].toFixed(1)}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) onChange([current[0], Math.min(v, max)]);
              }}
              className="flex-1 px-2 py-1 text-xs bg-muted border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          {isActive && (
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => onChange(null)}
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Category Filter ─────────────────────────────────────────────────────────
interface CategoryFilterProps {
  selected: string[];
  onChange: (v: string[]) => void;
}

function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const [expanded, setExpanded] = useState(true);
  const isActive = selected.length > 0;
  const categories = Object.keys(CATEGORY_COLORS);

  const toggle = (cat: string) => {
    if (selected.includes(cat)) onChange(selected.filter(s => s !== cat));
    else onChange([...selected, cat]);
  };

  return (
    <div className="border-b border-border/50">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-1.5">
          Category
          {isActive && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-accent/20 text-accent border-0">
              {selected.length}
            </Badge>
          )}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-2">
          {categories.map(cat => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selected.includes(cat)}
                onCheckedChange={() => toggle(cat)}
                className="w-3.5 h-3.5 rounded-sm flex-shrink-0 mt-0.5"
              />
              <div className="flex items-center gap-2 flex-1">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] }}
                />
                <span className="text-xs font-medium">{cat}</span>
              </div>
            </label>
          ))}
          {isActive && (
            <button className="text-[10px] text-muted-foreground hover:text-foreground hover:underline pl-5" onClick={() => onChange([])}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// ── Element Range Filter (클라이언트 사이드) ──────────────────────────────────
interface ElementRangeFilterProps {
  materials: Material[];
  ranges: Record<string, [number, number] | null>;
  onChange: (ranges: Record<string, [number, number] | null>) => void;
}

function ElementRangeFilter({ materials, ranges, onChange }: ElementRangeFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const ELEMENTS = ['Fe', 'Al', 'Ni', 'Ti', 'Co', 'Cu', 'Cr', 'Mo', 'Mn', 'Si', 'C', 'O', 'N', 'V', 'W', 'Nb', 'Ta'] as const;
  
  const isActive = Object.values(ranges).some(r => r !== null);

  // 각 원소의 범위 계산
  const elementRanges = useMemo(() => {
    const result: Record<string, [number, number]> = {};
    for (const el of ELEMENTS) {
      const values: number[] = [];
      for (const m of materials) {
        const comp = m.composition;
        if (typeof comp === 'object' && comp !== null && el in comp) {
          const val = comp[el as keyof Material['composition']];
          let numericValue: number | null = null;
          
          if (typeof val === 'number' && val > 0) {
            numericValue = val;
          } else if (typeof val === 'string') {
            const parsed = parseCompositionRange(val);
            numericValue = getRangeValue(parsed);
          }
          
          if (numericValue !== null && numericValue > 0) {
            values.push(numericValue);
          }
        }
      }
      if (values.length > 0) {
        result[el] = [Math.min(...values), Math.max(...values)];
      }
    }
    return result;
  }, [materials]);

  const handleRangeChange = (el: string, newRange: [number, number] | null) => {
    onChange({ ...ranges, [el]: newRange });
  };

  // Element-specific presets
  const getPresetsForElement = (el: string) => {
    const presets: Record<string, { label: string; range: [number, number] }[]> = {
      'Fe': [
        { label: 'Low Fe', range: [0, 5] },
        { label: 'High Fe', range: [50, 100] },
      ],
      'Cr': [
        { label: 'Stainless', range: [15, 30] },
        { label: 'High Cr', range: [25, 40] },
      ],
      'Ni': [
        { label: 'Austenitic', range: [8, 15] },
        { label: 'High Ni', range: [15, 35] },
      ],
      'Al': [
        { label: 'Low Al', range: [0, 5] },
        { label: 'Al-rich', range: [5, 15] },
      ],
      'Ti': [
        { label: 'Ti alloy', range: [3, 10] },
        { label: 'High Ti', range: [10, 100] },
      ],
      'C': [
        { label: 'Low C', range: [0, 0.1] },
        { label: 'Medium C', range: [0.1, 0.5] },
        { label: 'High C', range: [0.5, 2] },
      ],
      'Mo': [
        { label: 'Low Mo', range: [0, 2] },
        { label: 'High Mo', range: [2, 10] },
      ],
      'Mn': [
        { label: 'Low Mn', range: [0, 1] },
        { label: 'High Mn', range: [1, 5] },
      ],
    };
    return presets[el] || [];
  };

  return (
    <div className="border-b border-border/50">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-1.5">
          Element Range
          {isActive && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-accent/20 text-accent border-0">
              {Object.values(ranges).filter(r => r !== null).length}
            </Badge>
          )}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-3 max-h-96 overflow-y-auto">
          {ELEMENTS.map(el => {
            const range = elementRanges[el];
            if (!range) return null;

            return (
              <RangeSliderCompact
                key={el}
                label={el}
                min={range[0]}
                max={range[1]}
                value={ranges[el]}
                onChange={(v) => handleRangeChange(el, v)}
                presets={getPresetsForElement(el)}
              />
            );
          })}
          {isActive && (
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground hover:underline w-full text-center mt-2 py-2 border-t border-border/50"
              onClick={() => onChange({})}
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Process Filter ──────────────────────────────────────────────────────────
interface ProcessFilterProps {
  allProcesses: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}

function ProcessFilter({ allProcesses, selected, onChange }: ProcessFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const isActive = selected.length > 0;

  const toggle = (proc: string) => {
    if (selected.includes(proc)) onChange(selected.filter(s => s !== proc));
    else onChange([...selected, proc]);
  };

  return (
    <div className="border-b border-border/50">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-1.5">
          Process
          {isActive && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-accent/20 text-accent border-0">
              {selected.length}
            </Badge>
          )}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-2">
          {allProcesses.map(proc => {
            const descriptions: Record<string, string> = {
              'Wrought': '(Forging, rolling)',
              'Molding': '(Injection, sintering)',
              'Casting': '(Casting, die casting)',
              'AM': '(LPBF, DMLS, SLM, EBM)',
            };
            return (
              <label key={proc} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selected.includes(proc)}
                  onCheckedChange={() => toggle(proc)}
                  className="w-3.5 h-3.5 rounded-sm flex-shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-xs font-medium">{proc}</div>
                  <div className="text-[9px] text-muted-foreground">{descriptions[proc]}</div>
                </div>
              </label>
            );
          })}
          {isActive && (
            <button className="text-[10px] text-muted-foreground hover:text-foreground hover:underline pl-5" onClick={() => onChange([])}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Family Filter (subcategory 다중 선택 — Granta-style 2-3 차 family) ─────
// R35a — Category 가 1차 family (Metal/Polymer/Ceramic/Composite) 인 반면,
//        Family 는 그 안의 subcategory (예: Stainless Steel - Austenitic / Polymer - PEEK / UHTC).
//        선택된 카테고리가 있으면 그 안의 subcategory 만 노출 (없으면 전체).
//        빈도순 정렬 (개수 많은 게 위) — 흔한 family 부터 노출.
interface FamilyFilterProps {
  materials: Material[];
  selectedCategories: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}
function FamilyFilter({ materials, selectedCategories, selected, onChange }: FamilyFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const isActive = selected.length > 0;
  const families = useMemo(() => {
    const count = new Map<string, number>();
    for (const m of materials) {
      if (selectedCategories.length > 0 && !selectedCategories.includes(m.category)) continue;
      const sub = m.subcategory || 'Other';
      count.set(sub, (count.get(sub) || 0) + 1);
    }
    return Array.from(count.entries()).sort((a, b) => b[1] - a[1]);
  }, [materials, selectedCategories]);
  const toggle = (sub: string) => {
    if (selected.includes(sub)) onChange(selected.filter(s => s !== sub));
    else onChange([...selected, sub]);
  };
  return (
    <div className="border-b border-border/50">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-1.5">
          Family
          {isActive && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-accent/20 text-accent border-0">
              {selected.length}
            </Badge>
          )}
          {!isActive && selectedCategories.length > 0 && (
            <span className="text-[9px] text-muted-foreground">({families.length})</span>
          )}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1.5 max-h-72 overflow-y-auto">
          {families.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic">선택된 Category 가 없습니다 — 모든 family 표시</p>
          )}
          {families.map(([sub, n]) => (
            <label key={sub} className="flex items-center gap-2 cursor-pointer text-[11px]">
              <Checkbox
                checked={selected.includes(sub)}
                onCheckedChange={() => toggle(sub)}
                className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
              />
              <span className="flex-1 truncate" title={sub}>{sub}</span>
              <span className="text-[9px] text-muted-foreground font-mono flex-shrink-0">{n}</span>
            </label>
          ))}
          {isActive && (
            <button className="text-[10px] text-muted-foreground hover:text-foreground hover:underline pl-5 mt-1" onClick={() => onChange([])}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section Group Header (필터 그룹 구분자) ──────────────────────────────────
// R35a — 필터를 의미별 그룹으로 묶고 시각적 구분자 추가 (sticky uppercase divider).
function SectionGroup({ label }: { label: string }) {
  return (
    <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider font-bold text-muted-foreground/70 bg-muted/40 border-b border-border/30 select-none">
      {label}
    </div>
  );
}

// ── Qualitative Filter (corrosion / machinability / weldability) ─────────────
const QUAL_ORDER = ['Outstanding', 'Excellent', 'Good', 'Fair', 'Moderate', 'Poor', 'N/A'];
const orderQual = (opts: string[]) => [...opts].sort((a, b) => { const ia = QUAL_ORDER.indexOf(a), ib = QUAL_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });

function QualitativeFilter({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = selected.length > 0;
  if (!options.length) return null;
  const toggle = (o: string) => (selected.includes(o) ? onChange(selected.filter((s) => s !== o)) : onChange([...selected, o]));
  return (
    <div className="border-b border-border/50">
      <button className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors" onClick={() => setExpanded((e) => !e)}>
        <span className="flex items-center gap-1.5">{label}{isActive && <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-accent/20 text-accent border-0">{selected.length}</Badge>}</span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1.5">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={selected.includes(o)} onCheckedChange={() => toggle(o)} className="w-3.5 h-3.5 rounded-sm flex-shrink-0" />
              <span className="text-xs">{o}</span>
            </label>
          ))}
          {isActive && <button className="text-[10px] text-muted-foreground hover:text-foreground hover:underline pl-5" onClick={() => onChange([])}>Clear</button>}
        </div>
      )}
    </div>
  );
}

// ── Main Sidebar ────────────────────────────────────────────────────────────
export default function FilterSidebar({
  materials,
  filters,
  updateFilter,
  resetFilters,
  activeFilterCount,
  resultCount,
  onSelectMaterial,
}: FilterSidebarProps) {
  const t = useT();
  // Process 필터를 4개로 단순화
  const allProcesses = ['Wrought', 'Molding', 'Casting', 'AM'];

  const densityRange = useMemo(() => getPropertyRange(materials, 'density'), [materials]);
  const yieldStrengthRange = useMemo(() => getPropertyRange(materials, 'yield_strength'), [materials]);
  const utsRange = useMemo(() => getPropertyRange(materials, 'uts'), [materials]);
  const elongationRange = useMemo(() => getPropertyRange(materials, 'elongation'), [materials]);
  const modulusRange = useMemo(() => getPropertyRange(materials, 'modulus'), [materials]);
  const hardnessRange = useMemo(() => getPropertyRange(materials, 'hardness'), [materials]);
  const thermalConductivityRange = useMemo(() => getPropertyRange(materials, 'thermal_conductivity'), [materials]);
  const electricalConductivityRange = useMemo(() => getPropertyRange(materials, 'electrical_conductivity'), [materials]);
  const maxServiceTempRange = useMemo(() => getPropertyRange(materials, 'max_service_temp'), [materials]);
  const fatigueStrengthRange = useMemo(() => getPropertyRange(materials, 'fatigue_strength'), [materials]);
  const impactStrengthRange = useMemo(() => getPropertyRange(materials, 'impact_strength'), [materials]);
  const pricePerKgRange = useMemo(() => getPropertyRange(materials, 'price_per_kg'), [materials]);
  const thermalExpansionRange = useMemo(() => getPropertyRange(materials, 'thermal_expansion'), [materials]);
  const poissonRatioRange = useMemo(() => getPropertyRange(materials, 'poisson_ratio'), [materials]);
  const specificHeatRange = useMemo(() => getPropertyRange(materials, 'specific_heat'), [materials]);
  const meltingPointRange = useMemo(() => getPropertyRange(materials, 'melting_point'), [materials]);
  // R30 — 신규 numeric 필드 range (popularity / fracture / cost / process attrs).
  const popularityRange = useMemo(() => getPropertyRange(materials, 'popularity'), [materials]);
  const fractureToughnessRange = useMemo(() => getPropertyRange(materials, 'fracture_toughness' as keyof Material), [materials]);
  const totalCostEstimateRange = useMemo(() => getPropertyRange(materials, 'total_cost_estimate' as keyof Material), [materials]);
  const minWallThicknessRange = useMemo(() => getPropertyRange(materials, 'min_wall_thickness' as keyof Material), [materials]);
  const surfaceFinishTypicalRange = useMemo(() => getPropertyRange(materials, 'surface_finish_typical' as keyof Material), [materials]);
  const machiningCostFactorRange = useMemo(() => getPropertyRange(materials, 'machining_cost_factor' as keyof Material), [materials]);
  const htCostFactorRange = useMemo(() => getPropertyRange(materials, 'ht_cost_factor' as keyof Material), [materials]);
  const corrosionOpts = useMemo(() => orderQual(getUniqueValues(materials, 'corrosion_resistance')), [materials]);
  const machinabilityOpts = useMemo(() => orderQual(getUniqueValues(materials, 'machinability')), [materials]);
  const weldabilityOpts = useMemo(() => orderQual(getUniqueValues(materials, 'weldability')), [materials]);

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-foreground/60" />
          <h2 className="text-xs font-semibold text-foreground">{t('filter.title')}</h2>
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Material Count */}
      <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
        <p className="text-[10px] font-mono text-muted-foreground">
          {resultCount.toLocaleString()} materials
        </p>
      </div>

      {/* Filters — R35a 그룹화 순서: 기본 검색 → 기계 → 열 → 전기 → 원가 → 품질 → 규제 */}
      <div className="flex-1 overflow-y-auto">
        {/* ── 1. 기본 검색 (Popularity 최상단 — 가장 중요한 property) ── */}
        <SectionGroup label="기본 검색 · Essentials" />
        {popularityRange && (
          <RangeSlider label={t('filter.popularity')} unit="0–5" min={popularityRange[0]} max={popularityRange[1]} value={filters.popularityRange} onChange={v => updateFilter('popularityRange', v)} />
        )}
        <CategoryFilter
          selected={filters.categories}
          onChange={v => updateFilter('categories', v)}
        />
        <FamilyFilter
          materials={materials}
          selectedCategories={filters.categories}
          selected={filters.subcategories}
          onChange={v => updateFilter('subcategories', v)}
        />
        <ProcessFilter
          allProcesses={allProcesses}
          selected={filters.processes}
          onChange={v => updateFilter('processes', v)}
        />
        <ElementRangeFilter
          materials={materials}
          ranges={filters.compositionRanges}
          onChange={v => updateFilter('compositionRanges', v)}
        />

        {/* ── 2. 기계적 성질 ── */}
        <SectionGroup label="기계적 성질 · Mechanical" />
        {densityRange && (
          <RangeSlider label={t('filter.density')} unit="g/cm³" min={densityRange[0]} max={densityRange[1]} value={filters.densityRange} onChange={v => updateFilter('densityRange', v)} />
        )}
        {modulusRange && (
          <RangeSlider label="Modulus" unit="GPa" min={modulusRange[0]} max={modulusRange[1]} value={filters.modulusRange} onChange={v => updateFilter('modulusRange', v)} />
        )}
        {yieldStrengthRange && (
          <RangeSlider label="Yield Strength" unit="MPa" min={yieldStrengthRange[0]} max={yieldStrengthRange[1]} value={filters.yieldStrengthRange} onChange={v => updateFilter('yieldStrengthRange', v)} />
        )}
        {utsRange && (
          <RangeSlider label="UTS" unit="MPa" min={utsRange[0]} max={utsRange[1]} value={filters.utsRange} onChange={v => updateFilter('utsRange', v)} />
        )}
        {elongationRange && (
          <RangeSlider label="Elongation" unit="%" min={elongationRange[0]} max={elongationRange[1]} value={filters.elongationRange} onChange={v => updateFilter('elongationRange', v)} />
        )}
        {hardnessRange && (
          <RangeSlider label={t('filter.hardness')} unit="HV" min={hardnessRange[0]} max={hardnessRange[1]} value={filters.hardnessRange} onChange={v => updateFilter('hardnessRange', v)} />
        )}
        {fatigueStrengthRange && (
          <RangeSlider label="Fatigue Strength" unit="MPa" min={fatigueStrengthRange[0]} max={fatigueStrengthRange[1]} value={filters.fatigueStrengthRange} onChange={v => updateFilter('fatigueStrengthRange', v)} />
        )}
        {impactStrengthRange && (
          <RangeSlider label="Impact (Charpy)" unit="J" min={impactStrengthRange[0]} max={impactStrengthRange[1]} value={filters.impactStrengthRange} onChange={v => updateFilter('impactStrengthRange', v)} />
        )}
        {fractureToughnessRange && (
          <RangeSlider label="Fracture Toughness" unit="MPa·√m" min={fractureToughnessRange[0]} max={fractureToughnessRange[1]} value={filters.fractureToughnessRange} onChange={v => updateFilter('fractureToughnessRange', v)} />
        )}
        {poissonRatioRange && (
          <RangeSlider label="Poisson's Ratio" unit="–" min={poissonRatioRange[0]} max={poissonRatioRange[1]} value={filters.poissonRatioRange} onChange={v => updateFilter('poissonRatioRange', v)} />
        )}

        {/* ── 3. 열적 성질 ── */}
        <SectionGroup label="열적 성질 · Thermal" />
        {thermalConductivityRange && (
          <RangeSlider label="Thermal Conductivity" unit="W/m·K" min={thermalConductivityRange[0]} max={thermalConductivityRange[1]} value={filters.thermalConductivityRange} onChange={v => updateFilter('thermalConductivityRange', v)} />
        )}
        {maxServiceTempRange && (
          <RangeSlider label="Max Service Temp" unit="°C" min={maxServiceTempRange[0]} max={maxServiceTempRange[1]} value={filters.maxServiceTempRange} onChange={v => updateFilter('maxServiceTempRange', v)} />
        )}
        {thermalExpansionRange && (
          <RangeSlider label="Thermal Expansion (CTE)" unit="10⁻⁶/K" min={thermalExpansionRange[0]} max={thermalExpansionRange[1]} value={filters.thermalExpansionRange} onChange={v => updateFilter('thermalExpansionRange', v)} />
        )}
        {meltingPointRange && (
          <RangeSlider label="Melting / Liquidus" unit="°C" min={meltingPointRange[0]} max={meltingPointRange[1]} value={filters.meltingPointRange} onChange={v => updateFilter('meltingPointRange', v)} />
        )}
        {specificHeatRange && (
          <RangeSlider label="Specific Heat" unit="J/kg·K" min={specificHeatRange[0]} max={specificHeatRange[1]} value={filters.specificHeatRange} onChange={v => updateFilter('specificHeatRange', v)} />
        )}

        {/* ── 4. 전기적 성질 ── */}
        <SectionGroup label="전기적 성질 · Electrical" />
        {electricalConductivityRange && (
          <RangeSlider label="Electrical Conductivity" unit="%IACS" min={electricalConductivityRange[0]} max={electricalConductivityRange[1]} value={filters.electricalConductivityRange} onChange={v => updateFilter('electricalConductivityRange', v)} />
        )}

        {/* ── 5. 원가·가공 ── */}
        <SectionGroup label="원가·가공 · Cost & Process" />
        {pricePerKgRange && (
          <RangeSlider label="Price" unit="$/kg" min={pricePerKgRange[0]} max={pricePerKgRange[1]} value={filters.pricePerKgRange} onChange={v => updateFilter('pricePerKgRange', v)} />
        )}
        {totalCostEstimateRange && (
          <RangeSlider label="Total Cost (est.)" unit="USD/kg" min={totalCostEstimateRange[0]} max={totalCostEstimateRange[1]} value={filters.totalCostEstimateRange} onChange={v => updateFilter('totalCostEstimateRange', v)} />
        )}
        {machiningCostFactorRange && (
          <RangeSlider label="Machining factor" unit="×" min={machiningCostFactorRange[0]} max={machiningCostFactorRange[1]} value={filters.machiningCostFactorRange} onChange={v => updateFilter('machiningCostFactorRange', v)} />
        )}
        {htCostFactorRange && (
          <RangeSlider label="HT factor" unit="×" min={htCostFactorRange[0]} max={htCostFactorRange[1]} value={filters.htCostFactorRange} onChange={v => updateFilter('htCostFactorRange', v)} />
        )}
        {minWallThicknessRange && (
          <RangeSlider label="Min wall" unit="mm" min={minWallThicknessRange[0]} max={minWallThicknessRange[1]} value={filters.minWallThicknessRange} onChange={v => updateFilter('minWallThicknessRange', v)} />
        )}
        {surfaceFinishTypicalRange && (
          <RangeSlider label="Surface Ra" unit="μm" min={surfaceFinishTypicalRange[0]} max={surfaceFinishTypicalRange[1]} value={filters.surfaceFinishTypicalRange} onChange={v => updateFilter('surfaceFinishTypicalRange', v)} />
        )}

        {/* ── 6. 품질·내환경성 ── */}
        <SectionGroup label="품질 · Quality" />
        <QualitativeFilter label="Corrosion resistance" options={corrosionOpts} selected={filters.corrosion} onChange={v => updateFilter('corrosion', v)} />
        <QualitativeFilter label="Machinability" options={machinabilityOpts} selected={filters.machinability} onChange={v => updateFilter('machinability', v)} />
        <QualitativeFilter label="Weldability" options={weldabilityOpts} selected={filters.weldability} onChange={v => updateFilter('weldability', v)} />

        {/* ── 7. 규제 ── */}
        <SectionGroup label="규제 · Regulatory" />
        <label className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer select-none hover:bg-muted/40 rounded">
          <input type="checkbox" checked={!!filters.rohsOnly} onChange={(e) => updateFilter('rohsOnly', e.target.checked)} className="accent-accent" />
          <span className="flex-1">RoHS 통과만 (EU 규제)</span>
          <span className="text-[10px] text-muted-foreground">Pb·Cd·Hg</span>
        </label>

        {/* ── 8. Composition Browser (참고용) ── */}
        <SectionGroup label="구성 탐색 · Composition Tree" />
        <CompositionFamilyBrowser
          materials={materials}
          onSelectMaterial={onSelectMaterial}
          onApplyCompositionFilter={v => updateFilter('compositionRanges', v)}
        />
      </div>
    </div>
  );
}
