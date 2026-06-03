/*
 * AM Materials Explorer — Filter Sidebar
 * Scientific Precision Design System
 * Left panel: category checkboxes, composition filter, process filter, numeric range sliders
 */

import { useState, useMemo, useEffect } from 'react';
import { useT, useLang } from '@/lib/i18n';
import { priceUnitLabel, loadUnitSystem } from '@/lib/unit-convert';
import { ChevronDown, ChevronRight, SlidersHorizontal, RotateCcw, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
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
  /** R51b — Leave-one-out narrowed ranges. 각 numeric property 의 slider min/max 를
   *  "자기 자신 제외" 한 모든 필터 적용 결과 기준으로 좁혀 표시. */
  narrowedRanges?: Record<string, [number, number] | null>;
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

// R44b: shadcn/Radix Slider dual-thumb 사용 (touch-friendly).
// R44c: 큰 input box (h-9) + onBlur 또는 Enter commit. 일시 invalid 값 허용.
function RangeSlider({ label, unit, min, max, value, onChange }: RangeSliderProps) {
  const [expanded, setExpanded] = useState(false);
  const current: [number, number] = value ?? [min, max];
  const isActive = value !== null;
  const [minInput, setMinInput] = useState(current[0].toFixed(1));
  const [maxInput, setMaxInput] = useState(current[1].toFixed(1));

  useEffect(() => {
    setMinInput(current[0].toFixed(1));
    setMaxInput(current[1].toFixed(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commitMin = (val: string) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) { setMinInput(current[0].toFixed(1)); return; }
    const clamped = Math.max(min, Math.min(parsed, current[1]));
    onChange([clamped, current[1]]);
    setMinInput(clamped.toFixed(1));
  };
  const commitMax = (val: string) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) { setMaxInput(current[1].toFixed(1)); return; }
    const clamped = Math.min(max, Math.max(parsed, current[0]));
    onChange([current[0], clamped]);
    setMaxInput(clamped.toFixed(1));
  };
  const sliderStep = (max - min) / 100;

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
        <div className="px-4 pb-3 space-y-2 overflow-hidden">
          {/* R46: unit 빈 string 일 때 (popularity 등) 라벨 중복 방지. */}
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
            <span>{current[0].toFixed(1)}{unit ? ' ' + unit : ''}</span>
            <span>{current[1].toFixed(1)}{unit ? ' ' + unit : ''}</span>
          </div>
          {/* R46: thumb 16px translate(-50%) 가 좌우 외부로 8px 씩 튀어나오므로 mx-2 추가. */}
          <Slider
            min={min}
            max={max}
            step={sliderStep}
            value={current}
            onValueChange={(v) => onChange(v as [number, number])}
            className="py-1 mx-2"
          />
          {/* R47: min-w-0 + 작은 padding + spinner 숨김으로 좁은 panel 에서 input 잘림 fix.
                   text 는 가운데 정렬 (font-mono + tabular-nums) — 4.0/5.0 같은 수치가 가지런히. */}
          <div className="flex items-center gap-1.5 min-w-0">
            <input
              type="number"
              inputMode="decimal"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onBlur={(e) => commitMin(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              step={sliderStep}
              placeholder={String(min)}
              className="flex-1 min-w-0 h-9 px-1.5 text-center text-sm font-mono tabular-nums bg-background border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs text-muted-foreground font-mono flex-shrink-0">~</span>
            <input
              type="number"
              inputMode="decimal"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onBlur={(e) => commitMax(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              step={sliderStep}
              placeholder={String(max)}
              className="flex-1 min-w-0 h-9 px-1.5 text-center text-sm font-mono tabular-nums bg-background border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

// ── Family Filter (Granta-style 3-tier tree — Category > Family > Sub-family) ─
// R35a-v2 — tier1 = Category (Metal/Polymer/Ceramic/Composite),
//           tier2 = explicit family bucket (Stainless Steel / Nickel Alloy / High-Performance Polymer / Oxide ceramic …),
//           tier3 = subcategory leaf 자체. Indeterminate (▣) / fully-checked (☑) cascade.
//
//           각 노드 별 확장 상태 + 체크 cascade — tier2 클릭 시 그 그룹의 모든 leaf 토글,
//           tier1 클릭 시 그 카테고리의 모든 leaf 토글 (state 는 filters.subcategories[] 에만 저장).

function tier2OfMetal(sub: string): string {
  const s = sub.toLowerCase();
  if (/stainless|ph stainless/.test(s)) return 'Stainless Steel';
  if (/^aluminum/.test(s)) return 'Aluminum';
  if (/nickel|inconel|hastelloy|monel|incoloy|waspaloy|haynes|rene|nimonic|udimet|cmsx|cm247|in[\s-]?7\d{2}|in[\s-]?9\d{2}/.test(s)) return 'Nickel Alloy';
  if (/cobalt|stellite|cocr|l605|mp159|elgiloy/.test(s)) return 'Cobalt Alloy';
  if (/^titanium|ti cp|ti grade|ti-/.test(s)) return 'Titanium';
  if (/^copper|brass|bronze|cu-/.test(s)) return 'Copper Alloy';
  if (/magnesium|^az\d|^we\d|^ez\d|^am6/.test(s)) return 'Magnesium';
  if (/tool steel|maraging|aermet|300m/.test(s)) return 'Tool / Special Steel';
  if (/carbon steel|alloy steel|case-hardening|cast iron|^\d{4}$/.test(s)) return 'Carbon / Alloy Steel';
  if (/refractory|tungsten|tantalum|niobium|molybdenum|tzm|hafnium|c103|zirconium/.test(s)) return 'Refractory';
  if (/invar|controlled expansion|kovar/.test(s)) return 'Controlled Expansion';
  if (/beryllium|zinc|shape memory|nitinol/.test(s)) return 'Other Specialty';
  return 'Other Metal';
}
function tier2OfPolymer(sub: string): string {
  const s = sub.toLowerCase();
  if (/peek|pekk|pei|ultem|ppsu|psu|pps|pai|pbi|polyimide|\bpes\b/.test(s)) return 'High-Performance';
  if (/polyamide|polycarbonate|pom|pbt|pet|pmma/.test(s)) return 'Engineering';
  if (/abs|asa|\bpp\b|polystyrene|pvc|polyethylene|petg|pla/.test(s)) return 'Commodity';
  if (/ptfe|pvdf|etfe|fluoropolymer/.test(s)) return 'Fluoropolymer';
  if (/tpu|tpe|silicone|elastomer/.test(s)) return 'Elastomer / Rubber';
  if (/lcp|uhmwpe|pcl|eva|pvb/.test(s)) return 'Specialty';
  if (/epoxy|thermoset|polyester|photopolymer/.test(s)) return 'Thermoset';
  if (/nylon \(fdm/.test(s)) return 'Engineering';
  return 'Other Polymer';
}
function tier2OfCeramic(sub: string): string {
  const s = sub.toLowerCase();
  if (/oxide|alumina|zirconia|yttria|ceria|spinel|sapphire|quartz|mullite|magnesia|porcelain|steatite/.test(s)) return 'Oxide';
  if (/nitride|si3n4|aln|^bn$|cbn|tin/.test(s)) return 'Nitride';
  if (/carbide|sic|wc|b4c|tic|tac/.test(s)) return 'Carbide';
  if (/uhtc|hfc|zrb2|hfb2/.test(s)) return 'UHTC (Ultra-High-Temp)';
  if (/glass|aerogel|silica/.test(s)) return 'Glass / Aerogel';
  if (/piezoelectric|dielectric|pzt|batio3|alsic/.test(s)) return 'Electronic Ceramic';
  if (/bioceramic|hydroxyapatite/.test(s)) return 'Bioceramic';
  if (/silicate|cordierite|forsterite/.test(s)) return 'Silicate';
  if (/macor|lab6|boride/.test(s)) return 'Specialty Ceramic';
  return 'Other Ceramic';
}
function tier2OfComposite(sub: string): string {
  const s = sub.toLowerCase();
  if (/carbon/.test(s)) return 'Carbon Fiber (CFRP)';
  if (/glass/.test(s)) return 'Glass Fiber (GFRP)';
  if (/aramid/.test(s)) return 'Aramid (AFK)';
  if (/metal-matrix|mmc/.test(s)) return 'Metal-Matrix (MMC)';
  if (/ceramic-matrix|cmc/.test(s)) return 'Ceramic-Matrix (CMC)';
  if (/wood/.test(s)) return 'Natural (Wood)';
  if (/honeycomb/.test(s)) return 'Sandwich (Honeycomb)';
  if (/foam/.test(s)) return 'Foam';
  if (/polyethylene/.test(s)) return 'Polyethylene-Composite';
  if (/bulk-molding/.test(s)) return 'Bulk Molding (BMC/SMC)';
  return 'Other Composite';
}
function tier2Of(category: string, subcategory: string): string {
  if (category === 'Metal') return tier2OfMetal(subcategory);
  if (category === 'Polymer') return tier2OfPolymer(subcategory);
  if (category === 'Ceramic') return tier2OfCeramic(subcategory);
  if (category === 'Composite') return tier2OfComposite(subcategory);
  return 'Other';
}
/** display-friendly leaf label — 카테고리 prefix 제거. */
function leafLabel(sub: string): string {
  return sub.replace(/^Polymer - /, '').replace(/^Stainless Steel - /, 'SS - ').replace(/^Stainless - /, 'SS - ').replace(/^Aluminum - /, 'Al - ').replace(/^Titanium - /, 'Ti - ').replace(/^Copper - /, 'Cu - ').replace(/^Nickel - /, 'Ni - ').replace(/^Cobalt - /, 'Co - ');
}

/** R36b — 카테고리별 색상 토큰 (CATEGORY_COLORS 와 일관). tailwind 정적 클래스만 사용해야 JIT 가 인식. */
const CATEGORY_TIER_STYLE: Record<string, { bg1: string; bg2: string; tier1Bd: string; tier2Bd: string; tier3Bd: string; text1: string; text2: string; dot: string }> = {
  Metal: {
    bg1: 'bg-sky-500/10', bg2: 'bg-sky-500/5',
    tier1Bd: 'border-l-[4px] border-sky-500',
    tier2Bd: 'border-l-2 border-sky-500/60',
    tier3Bd: 'border-l border-sky-500/35',
    text1: 'text-sky-800', text2: 'text-sky-700/85',
    dot: 'bg-sky-500',
  },
  Polymer: {
    bg1: 'bg-emerald-500/10', bg2: 'bg-emerald-500/5',
    tier1Bd: 'border-l-[4px] border-emerald-500',
    tier2Bd: 'border-l-2 border-emerald-500/60',
    tier3Bd: 'border-l border-emerald-500/35',
    text1: 'text-emerald-800', text2: 'text-emerald-700/85',
    dot: 'bg-emerald-500',
  },
  Ceramic: {
    bg1: 'bg-amber-500/10', bg2: 'bg-amber-500/5',
    tier1Bd: 'border-l-[4px] border-amber-500',
    tier2Bd: 'border-l-2 border-amber-500/60',
    tier3Bd: 'border-l border-amber-500/35',
    text1: 'text-amber-800', text2: 'text-amber-700/85',
    dot: 'bg-amber-500',
  },
  Composite: {
    bg1: 'bg-violet-500/10', bg2: 'bg-violet-500/5',
    tier1Bd: 'border-l-[4px] border-violet-500',
    tier2Bd: 'border-l-2 border-violet-500/60',
    tier3Bd: 'border-l border-violet-500/35',
    text1: 'text-violet-800', text2: 'text-violet-700/85',
    dot: 'bg-violet-500',
  },
};
const FALLBACK_STYLE = CATEGORY_TIER_STYLE.Metal;

interface FamilyTreeNode {
  tier1: string;            // category
  tier2Groups: Array<{
    tier2: string;          // family bucket
    leaves: Array<{ sub: string; count: number }>;
    count: number;
  }>;
  count: number;
}

interface FamilyFilterProps {
  materials: Material[];
  selectedCategories: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}
function FamilyFilter({ materials, selectedCategories, selected, onChange }: FamilyFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedTier1, setExpandedTier1] = useState<Set<string>>(new Set());
  const [expandedTier2, setExpandedTier2] = useState<Set<string>>(new Set());
  const isActive = selected.length > 0;

  const tree = useMemo<FamilyTreeNode[]>(() => {
    // tier1 → tier2 → leafSet
    const accum = new Map<string, Map<string, Map<string, number>>>();
    for (const m of materials) {
      if (selectedCategories.length > 0 && !selectedCategories.includes(m.category)) continue;
      const cat = m.category || 'Other';
      const sub = m.subcategory || 'Other';
      const t2 = tier2Of(cat, sub);
      if (!accum.has(cat)) accum.set(cat, new Map());
      const m1 = accum.get(cat)!;
      if (!m1.has(t2)) m1.set(t2, new Map());
      const m2 = m1.get(t2)!;
      m2.set(sub, (m2.get(sub) || 0) + 1);
    }
    const out: FamilyTreeNode[] = [];
    accum.forEach((m1, tier1) => {
      const tier2Groups: FamilyTreeNode['tier2Groups'] = [];
      let cat_count = 0;
      m1.forEach((m2, tier2) => {
        const leaves: Array<{ sub: string; count: number }> = [];
        m2.forEach((count, sub) => leaves.push({ sub, count }));
        leaves.sort((a, b) => b.count - a.count);
        const groupCount = leaves.reduce((s, l) => s + l.count, 0);
        cat_count += groupCount;
        tier2Groups.push({ tier2, leaves, count: groupCount });
      });
      tier2Groups.sort((a, b) => b.count - a.count);
      out.push({ tier1, tier2Groups, count: cat_count });
    });
    return out.sort((a, b) => b.count - a.count);
  }, [materials, selectedCategories]);

  const toggleLeaf = (sub: string) => {
    if (selected.includes(sub)) onChange(selected.filter(s => s !== sub));
    else onChange([...selected, sub]);
  };
  const toggleGroup = (subs: string[]) => {
    const allChecked = subs.every(s => selected.includes(s));
    if (allChecked) onChange(selected.filter(s => !subs.includes(s)));
    else onChange(Array.from(new Set([...selected, ...subs])));
  };

  return (
    <div className="border-b border-border/50">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-1.5">
          Family Tree
          {isActive && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-accent/20 text-accent border-0">
              {selected.length}
            </Badge>
          )}
          {!isActive && tree.length > 0 && (
            <span className="text-[9px] text-muted-foreground">({tree.reduce((s, t) => s + t.tier2Groups.length, 0)} 그룹)</span>
          )}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-2 py-2 max-h-[28rem] overflow-y-auto">
          {tree.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic">선택된 Category 가 없습니다 — 모든 family 표시</p>
          )}
          {tree.map((node) => {
            const allSubs = node.tier2Groups.flatMap(g => g.leaves.map(l => l.sub));
            const allCount = allSubs.length;
            const checkedCount = allSubs.filter(s => selected.includes(s)).length;
            const tier1State: 'none' | 'partial' | 'all' =
              checkedCount === 0 ? 'none' : checkedCount === allCount ? 'all' : 'partial';
            const tier1Expanded = expandedTier1.has(node.tier1);
            const style = CATEGORY_TIER_STYLE[node.tier1] || FALLBACK_STYLE;
            return (
              <div key={node.tier1} className="mb-2 rounded-md overflow-hidden">
                {/* tier1 — category (강조: 색상 + 좌측 4px 띠 + 컬러 dot) */}
                <div className={`flex items-center gap-1.5 py-1 px-2 ${style.bg1} ${style.tier1Bd} hover:brightness-95 transition-all`}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(expandedTier1);
                      if (next.has(node.tier1)) next.delete(node.tier1);
                      else next.add(node.tier1);
                      setExpandedTier1(next);
                    }}
                    className={`w-4 h-4 flex items-center justify-center ${style.text1}`}
                    aria-label={tier1Expanded ? 'collapse' : 'expand'}
                  >
                    {tier1Expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="checkbox"
                    ref={(el) => { if (el) el.indeterminate = tier1State === 'partial'; }}
                    checked={tier1State === 'all'}
                    onChange={() => toggleGroup(allSubs)}
                    className="accent-accent w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                  <span
                    className={`text-[12px] font-bold flex-1 truncate cursor-pointer ${style.text1}`}
                    onClick={() => toggleGroup(allSubs)}
                  >
                    {node.tier1}
                  </span>
                  <span className={`text-[10px] font-mono ${style.text2}`}>{node.count}</span>
                </div>
                {/* tier2/tier3 wrapper — 좌측 colored line이 tier1 dot 아래로 이어짐 */}
                {tier1Expanded && (
                  <div className={`relative ml-3 mt-0.5 ${style.tier2Bd}`}>
                    {node.tier2Groups.map((group) => {
                      const groupSubs = group.leaves.map(l => l.sub);
                      const groupCheckedN = groupSubs.filter(s => selected.includes(s)).length;
                      const tier2State: 'none' | 'partial' | 'all' =
                        groupCheckedN === 0 ? 'none' : groupCheckedN === groupSubs.length ? 'all' : 'partial';
                      const key2 = `${node.tier1}::${group.tier2}`;
                      const tier2Expanded = expandedTier2.has(key2);
                      return (
                        <div key={key2} className="relative">
                          {/* tier2 — family bucket. ┗ connector + 옅은 color bg */}
                          <div className={`flex items-center gap-1 py-0.5 pl-1 pr-1 ${style.bg2} hover:brightness-95 rounded-r transition-all`}>
                            <span className={`font-mono ${style.text2} text-[11px] select-none leading-none w-3 text-center`} aria-hidden>└</span>
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Set(expandedTier2);
                                if (next.has(key2)) next.delete(key2);
                                else next.add(key2);
                                setExpandedTier2(next);
                              }}
                              className={`w-3.5 h-3.5 flex items-center justify-center ${style.text2}`}
                            >
                              {tier2Expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            <input
                              type="checkbox"
                              ref={(el) => { if (el) el.indeterminate = tier2State === 'partial'; }}
                              checked={tier2State === 'all'}
                              onChange={() => toggleGroup(groupSubs)}
                              className="accent-accent w-3 h-3 flex-shrink-0"
                            />
                            <span
                              className={`text-[11px] flex-1 truncate cursor-pointer font-medium ${style.text2}`}
                              title={group.tier2}
                              onClick={() => toggleGroup(groupSubs)}
                            >
                              {group.tier2}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">{group.count}</span>
                          </div>
                          {/* tier3 — leaf subcategories (들여쓰기 + 더 옅은 ㄴ) */}
                          {tier2Expanded && (
                            <div className={`ml-3 ${style.tier3Bd}`}>
                              {group.leaves.map((leaf) => (
                                <label key={leaf.sub} className="flex items-center gap-1 py-0.5 pl-1 pr-1 hover:bg-muted/30 rounded-r cursor-pointer text-[10.5px]">
                                  <span className={`font-mono text-muted-foreground/50 text-[10px] select-none leading-none w-3 text-center`} aria-hidden>└</span>
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(leaf.sub)}
                                    onChange={() => toggleLeaf(leaf.sub)}
                                    className="accent-accent w-3 h-3 flex-shrink-0"
                                  />
                                  <span className="flex-1 truncate text-foreground/70" title={leaf.sub}>
                                    {leafLabel(leaf.sub)}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground/70 font-mono">{leaf.count}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {isActive && (
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground hover:underline pl-5 mt-2 border-t border-border/30 pt-2 w-full text-left"
              onClick={() => onChange([])}
            >
              Clear all family selections
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

// ── R38a — Applied Filter chip 섹션 (상단 요약) ──────────────────────────────
// 활성 필터를 한 줄 chip 으로 표시 → 클릭 시 개별 제거. 전체 reset 은 header Reset 버튼.
interface ActiveFilterChipsProps {
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}
function ActiveFilterChips({ filters, updateFilter }: ActiveFilterChipsProps) {
  // R40b — Price chip 단위 lang 인식 ($/kg vs ₩/kg).
  const { lang } = useLang();
  const priceLabel = priceUnitLabel(lang, loadUnitSystem(), 'kg');
  const chips: { label: string; onRemove: () => void; key: string }[] = [];
  // R30 정의된 range 필드 — 함수형으로 추출.
  const rangeFields: Array<[keyof FilterState, string, string]> = [
    ['popularityRange', 'Popularity', ''],
    ['densityRange', 'Density', 'g/cm³'],
    ['yieldStrengthRange', 'Yield σy', 'MPa'],
    ['utsRange', 'UTS', 'MPa'],
    ['elongationRange', 'Elong.', '%'],
    ['modulusRange', 'E', 'GPa'],
    ['hardnessRange', 'Hardness', 'HV'],
    ['fatigueStrengthRange', 'Fatigue', 'MPa'],
    ['impactStrengthRange', 'Impact', 'J'],
    ['fractureToughnessRange', 'KIC', 'MPa·√m'],
    ['poissonRatioRange', 'ν', ''],
    ['thermalConductivityRange', 'k', 'W/m·K'],
    ['maxServiceTempRange', 'T_max', '°C'],
    ['thermalExpansionRange', 'CTE', '10⁻⁶/K'],
    ['meltingPointRange', 'T_m', '°C'],
    ['specificHeatRange', 'cp', 'J/kg·K'],
    ['electricalConductivityRange', 'EC', '%IACS'],
    ['pricePerKgRange', 'Price', priceLabel],
    ['totalCostEstimateRange', 'TotCost', priceLabel],
    ['machiningCostFactorRange', 'Mach.', '×'],
    ['htCostFactorRange', 'HT', '×'],
    ['minWallThicknessRange', 'MinWall', 'mm'],
    ['surfaceFinishTypicalRange', 'Ra', 'μm'],
  ];
  if (filters.search?.trim()) chips.push({ key: 'search', label: `🔍 "${filters.search}"`, onRemove: () => updateFilter('search', '') });
  if (filters.categories.length) chips.push({ key: 'categories', label: `Cat: ${filters.categories.join(' / ')}`, onRemove: () => updateFilter('categories', []) });
  if (filters.subcategories.length) chips.push({ key: 'subs', label: `Family: ${filters.subcategories.length}개`, onRemove: () => updateFilter('subcategories', []) });
  if (filters.processes.length) chips.push({ key: 'processes', label: `Proc: ${filters.processes.join(' / ')}`, onRemove: () => updateFilter('processes', []) });
  // R38e — heat_treatment (added later in this round)
  const ht = (filters as any).heatTreatments as string[] | undefined;
  if (ht && ht.length) chips.push({ key: 'ht', label: `HT: ${ht.length}개`, onRemove: () => (updateFilter as any)('heatTreatments', []) });
  for (const [key, label, unit] of rangeFields) {
    const v = filters[key] as [number, number] | null;
    if (v) {
      const fmtN = (n: number) => Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);
      chips.push({ key: String(key), label: `${label} ${fmtN(v[0])}–${fmtN(v[1])}${unit ? ' ' + unit : ''}`, onRemove: () => updateFilter(key, null as any) });
    }
  }
  if (Object.values(filters.compositionRanges || {}).some(r => r !== null)) {
    const n = Object.values(filters.compositionRanges).filter(r => r !== null).length;
    chips.push({ key: 'compRanges', label: `Comp: ${n}원소`, onRemove: () => updateFilter('compositionRanges', {}) });
  }
  if (filters.corrosion.length) chips.push({ key: 'corrosion', label: `Corr: ${filters.corrosion.join('/')}`, onRemove: () => updateFilter('corrosion', []) });
  if (filters.machinability.length) chips.push({ key: 'mach', label: `Mach: ${filters.machinability.join('/')}`, onRemove: () => updateFilter('machinability', []) });
  if (filters.weldability.length) chips.push({ key: 'weld', label: `Weld: ${filters.weldability.join('/')}`, onRemove: () => updateFilter('weldability', []) });
  if (filters.rohsOnly) chips.push({ key: 'rohs', label: `RoHS 통과만`, onRemove: () => updateFilter('rohsOnly', false) });

  if (chips.length === 0) return null;
  return (
    <div className="px-3 py-2 border-b-2 border-accent/30 bg-accent/5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">적용된 필터 · {chips.length}</span>
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

// ── R38e — Heat Treatment Filter (열처리 다중 선택) ─────────────────────────
// 현실적으로 가능한 9종만 노출. 일부 합금엔 일부 HT 가 불가능 — 데이터에 없는 조합은 자연 배제.
const HEAT_TREATMENT_OPTIONS: { value: string; label: string; help?: string }[] = [
  { value: 'None / As-supplied', label: 'None / As-supplied', help: 'As-built / As-cast / As-rolled / As-forged' },
  { value: 'Annealed', label: 'Annealed (소둔)', help: '연화 처리 — 가공성 향상, 내부 응력 해소' },
  { value: 'Solution Treated', label: 'Solution (고용화)', help: '석출경화 alloy 의 1차 처리 — 고온 가열 후 급랭' },
  { value: 'Aged / Precipitation', label: 'Aged / Precipitation', help: '시효 처리 — T6 / T7 / peak-aged 등 (Al / Ni 슈퍼합금)' },
  { value: 'Quenched & Tempered', label: 'Quenched & Tempered', help: 'QT — 강 표준 (고탄소·합금강)' },
  { value: 'HIP (Hot Isostatic)', label: 'HIP', help: 'Hot Isostatic Pressing — AM 부품 결함 제거 / 균질화' },
  { value: 'Stress-relieved', label: 'Stress-relieved', help: '저온 가열 — 잔류 응력만 제거 (강도 거의 유지)' },
  { value: 'Normalized', label: 'Normalized (불림)', help: '공냉 — 결정립 미세화 (탄소강)' },
  { value: 'Hardened', label: 'Hardened (담금)', help: '표면경화 (침탄/질화) 또는 마르텐사이트 변태' },
];
interface HeatTreatmentFilterProps {
  selected: string[];
  onChange: (v: string[]) => void;
}
function HeatTreatmentFilter({ selected, onChange }: HeatTreatmentFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const isActive = selected.length > 0;
  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter(s => s !== val));
    else onChange([...selected, val]);
  };
  return (
    <div className="border-b border-border/50">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-1.5">
          Heat Treatment
          {isActive && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-accent/20 text-accent border-0">
              {selected.length}
            </Badge>
          )}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1.5">
          <p className="text-[10px] text-muted-foreground italic mb-1">현실적이지 않은 조합은 자동 제외 — 데이터 매칭 기반.</p>
          {HEAT_TREATMENT_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={selected.includes(o.value)}
                onCheckedChange={() => toggle(o.value)}
                className="w-3.5 h-3.5 rounded-sm flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium leading-tight">{o.label}</div>
                {o.help && <div className="text-[9px] text-muted-foreground leading-tight">{o.help}</div>}
              </div>
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
  narrowedRanges,
}: FilterSidebarProps) {
  const t = useT();
  // R40b — Price slider unit lang/units 인식 ($/kg ↔ ₩/kg).
  const { lang } = useLang();
  const sidebarPriceLabel = priceUnitLabel(lang, loadUnitSystem(), 'kg');
  // R51b — leave-one-out narrow 우선, 없으면 (예: 데이터 없음) 기본 전체 범위 사용.
  const nr = (props: Record<string, [number, number] | null> | undefined, key: string, fallback: [number, number] | null) =>
    (props && props[key]) || fallback;
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

  // R51b — effective ranges: narrowedRanges (leave-one-out) 우선, 없으면 전체 dataset range.
  //   사용자가 다른 필터 적용 시 slider min/max 가 좁아짐. 자기 자신 only 일 땐 전체 범위 유지.
  const effRanges = useMemo(() => ({
    density: nr(narrowedRanges, 'density', densityRange),
    yield_strength: nr(narrowedRanges, 'yield_strength', yieldStrengthRange),
    uts: nr(narrowedRanges, 'uts', utsRange),
    elongation: nr(narrowedRanges, 'elongation', elongationRange),
    modulus: nr(narrowedRanges, 'modulus', modulusRange),
    hardness: nr(narrowedRanges, 'hardness', hardnessRange),
    thermal_conductivity: nr(narrowedRanges, 'thermal_conductivity', thermalConductivityRange),
    electrical_conductivity: nr(narrowedRanges, 'electrical_conductivity', electricalConductivityRange),
    max_service_temp: nr(narrowedRanges, 'max_service_temp', maxServiceTempRange),
    fatigue_strength: nr(narrowedRanges, 'fatigue_strength', fatigueStrengthRange),
    impact_strength: nr(narrowedRanges, 'impact_strength', impactStrengthRange),
    price_per_kg: nr(narrowedRanges, 'price_per_kg', pricePerKgRange),
    thermal_expansion: nr(narrowedRanges, 'thermal_expansion', thermalExpansionRange),
    poisson_ratio: nr(narrowedRanges, 'poisson_ratio', poissonRatioRange),
    specific_heat: nr(narrowedRanges, 'specific_heat', specificHeatRange),
    melting_point: nr(narrowedRanges, 'melting_point', meltingPointRange),
    popularity: nr(narrowedRanges, 'popularity', popularityRange),
    fracture_toughness: nr(narrowedRanges, 'fracture_toughness', fractureToughnessRange),
    total_cost_estimate: nr(narrowedRanges, 'total_cost_estimate', totalCostEstimateRange),
    min_wall_thickness: nr(narrowedRanges, 'min_wall_thickness', minWallThicknessRange),
    surface_finish_typical: nr(narrowedRanges, 'surface_finish_typical', surfaceFinishTypicalRange),
    machining_cost_factor: nr(narrowedRanges, 'machining_cost_factor', machiningCostFactorRange),
    ht_cost_factor: nr(narrowedRanges, 'ht_cost_factor', htCostFactorRange),
  }), [narrowedRanges, densityRange, yieldStrengthRange, utsRange, elongationRange, modulusRange, hardnessRange, thermalConductivityRange, electricalConductivityRange, maxServiceTempRange, fatigueStrengthRange, impactStrengthRange, pricePerKgRange, thermalExpansionRange, poissonRatioRange, specificHeatRange, meltingPointRange, popularityRange, fractureToughnessRange, totalCostEstimateRange, minWallThicknessRange, surfaceFinishTypicalRange, machiningCostFactorRange, htCostFactorRange]);

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

      {/* R38a — 적용된 필터 chip 섹션 */}
      <ActiveFilterChips filters={filters} updateFilter={updateFilter} />

      {/* Filters — R35a 그룹화 순서: 기본 검색 → 기계 → 열 → 전기 → 원가 → 품질 → 규제 */}
      <div className="flex-1 overflow-y-auto">
        {/* ── 1. 기본 검색 (Popularity 최상단 — 가장 중요한 property) ── */}
        <SectionGroup label="기본 검색 · Essentials" />
        {effRanges.popularity && (
          <RangeSlider label={t('filter.popularity')} unit="" min={effRanges.popularity[0]} max={effRanges.popularity[1]} value={filters.popularityRange} onChange={v => updateFilter('popularityRange', v)} />
        )}
        {/* R44a — Category 필터 제거. Family Tree 가 1차 family 4 카테고리 + 2-3차 subcategory 모두 노출. */}
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
        <SectionGroup label="기계적 성질 · Mechanical" />
        {effRanges.density && (
          <RangeSlider label={t('filter.density')} unit="g/cm³" min={effRanges.density[0]} max={effRanges.density[1]} value={filters.densityRange} onChange={v => updateFilter('densityRange', v)} />
        )}
        {effRanges.modulus && (
          <RangeSlider label="Modulus" unit="GPa" min={effRanges.modulus[0]} max={effRanges.modulus[1]} value={filters.modulusRange} onChange={v => updateFilter('modulusRange', v)} />
        )}
        {effRanges.yield_strength && (
          <RangeSlider label="Yield Strength" unit="MPa" min={effRanges.yield_strength[0]} max={effRanges.yield_strength[1]} value={filters.yieldStrengthRange} onChange={v => updateFilter('yieldStrengthRange', v)} />
        )}
        {effRanges.uts && (
          <RangeSlider label="UTS" unit="MPa" min={effRanges.uts[0]} max={effRanges.uts[1]} value={filters.utsRange} onChange={v => updateFilter('utsRange', v)} />
        )}
        {effRanges.elongation && (
          <RangeSlider label="Elongation" unit="%" min={effRanges.elongation[0]} max={effRanges.elongation[1]} value={filters.elongationRange} onChange={v => updateFilter('elongationRange', v)} />
        )}
        {effRanges.hardness && (
          <RangeSlider label={t('filter.hardness')} unit="HV" min={effRanges.hardness[0]} max={effRanges.hardness[1]} value={filters.hardnessRange} onChange={v => updateFilter('hardnessRange', v)} />
        )}
        {effRanges.fatigue_strength && (
          <RangeSlider label="Fatigue Strength" unit="MPa" min={effRanges.fatigue_strength[0]} max={effRanges.fatigue_strength[1]} value={filters.fatigueStrengthRange} onChange={v => updateFilter('fatigueStrengthRange', v)} />
        )}
        {effRanges.impact_strength && (
          <RangeSlider label="Impact (Charpy)" unit="J" min={effRanges.impact_strength[0]} max={effRanges.impact_strength[1]} value={filters.impactStrengthRange} onChange={v => updateFilter('impactStrengthRange', v)} />
        )}
        {effRanges.fracture_toughness && (
          <RangeSlider label="Fracture Toughness" unit="MPa·√m" min={effRanges.fracture_toughness[0]} max={effRanges.fracture_toughness[1]} value={filters.fractureToughnessRange} onChange={v => updateFilter('fractureToughnessRange', v)} />
        )}
        {effRanges.poisson_ratio && (
          <RangeSlider label="Poisson's Ratio" unit="–" min={effRanges.poisson_ratio[0]} max={effRanges.poisson_ratio[1]} value={filters.poissonRatioRange} onChange={v => updateFilter('poissonRatioRange', v)} />
        )}

        {/* ── 3. 열적 성질 ── */}
        <SectionGroup label="열적 성질 · Thermal" />
        {effRanges.thermal_conductivity && (
          <RangeSlider label="Thermal Conductivity" unit="W/m·K" min={effRanges.thermal_conductivity[0]} max={effRanges.thermal_conductivity[1]} value={filters.thermalConductivityRange} onChange={v => updateFilter('thermalConductivityRange', v)} />
        )}
        {effRanges.max_service_temp && (
          <RangeSlider label="Max Service Temp" unit="°C" min={effRanges.max_service_temp[0]} max={effRanges.max_service_temp[1]} value={filters.maxServiceTempRange} onChange={v => updateFilter('maxServiceTempRange', v)} />
        )}
        {effRanges.thermal_expansion && (
          <RangeSlider label="Thermal Expansion (CTE)" unit="10⁻⁶/K" min={effRanges.thermal_expansion[0]} max={effRanges.thermal_expansion[1]} value={filters.thermalExpansionRange} onChange={v => updateFilter('thermalExpansionRange', v)} />
        )}
        {effRanges.melting_point && (
          <RangeSlider label="Melting / Liquidus" unit="°C" min={effRanges.melting_point[0]} max={effRanges.melting_point[1]} value={filters.meltingPointRange} onChange={v => updateFilter('meltingPointRange', v)} />
        )}
        {effRanges.specific_heat && (
          <RangeSlider label="Specific Heat" unit="J/kg·K" min={effRanges.specific_heat[0]} max={effRanges.specific_heat[1]} value={filters.specificHeatRange} onChange={v => updateFilter('specificHeatRange', v)} />
        )}

        {/* ── 4. 전기적 성질 ── */}
        <SectionGroup label="전기적 성질 · Electrical" />
        {effRanges.electrical_conductivity && (
          <RangeSlider label="Electrical Conductivity" unit="%IACS" min={effRanges.electrical_conductivity[0]} max={effRanges.electrical_conductivity[1]} value={filters.electricalConductivityRange} onChange={v => updateFilter('electricalConductivityRange', v)} />
        )}

        {/* ── 5. 원가·가공 ── */}
        <SectionGroup label="원가·가공 · Cost & Process" />
        {effRanges.price_per_kg && (
          <RangeSlider label="Price" unit={sidebarPriceLabel} min={effRanges.price_per_kg[0]} max={effRanges.price_per_kg[1]} value={filters.pricePerKgRange} onChange={v => updateFilter('pricePerKgRange', v)} />
        )}
        {effRanges.total_cost_estimate && (
          <RangeSlider label="Total Cost (est.)" unit={sidebarPriceLabel} min={effRanges.total_cost_estimate[0]} max={effRanges.total_cost_estimate[1]} value={filters.totalCostEstimateRange} onChange={v => updateFilter('totalCostEstimateRange', v)} />
        )}
        {effRanges.machining_cost_factor && (
          <RangeSlider label="Machining factor" unit="×" min={effRanges.machining_cost_factor[0]} max={effRanges.machining_cost_factor[1]} value={filters.machiningCostFactorRange} onChange={v => updateFilter('machiningCostFactorRange', v)} />
        )}
        {effRanges.ht_cost_factor && (
          <RangeSlider label="HT factor" unit="×" min={effRanges.ht_cost_factor[0]} max={effRanges.ht_cost_factor[1]} value={filters.htCostFactorRange} onChange={v => updateFilter('htCostFactorRange', v)} />
        )}
        {effRanges.min_wall_thickness && (
          <RangeSlider label="Min wall" unit="mm" min={effRanges.min_wall_thickness[0]} max={effRanges.min_wall_thickness[1]} value={filters.minWallThicknessRange} onChange={v => updateFilter('minWallThicknessRange', v)} />
        )}
        {effRanges.surface_finish_typical && (
          <RangeSlider label="Surface Ra" unit="μm" min={effRanges.surface_finish_typical[0]} max={effRanges.surface_finish_typical[1]} value={filters.surfaceFinishTypicalRange} onChange={v => updateFilter('surfaceFinishTypicalRange', v)} />
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
