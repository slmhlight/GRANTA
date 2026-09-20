/*
 * 정성 등급 필터 (corrosion / machinability / weldability) — 옵션은 데이터에 실재하는 등급만, 등급 순으로.
 */
import { Checkbox } from '@/components/ui/checkbox';
import { FilterSection, toggleIn } from './FilterSection';

const QUAL_ORDER = ['Outstanding', 'Excellent', 'Good', 'Fair', 'Moderate', 'Poor', 'N/A'];
export const orderQual = (opts: string[]) => [...opts].sort((a, b) => { const ia = QUAL_ORDER.indexOf(a), ib = QUAL_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });

interface QualitativeFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}

export function QualitativeFilter({ label, options, selected, onChange }: QualitativeFilterProps) {
  if (!options.length) return null;
  return (
    <FilterSection title={label} activeCount={selected.length}>
      <div className="px-3 py-2 space-y-1.5">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={selected.includes(o)} onCheckedChange={() => onChange(toggleIn(selected, o))} className="w-3.5 h-3.5 rounded-sm flex-shrink-0" />
            <span className="text-xs">{o}</span>
          </label>
        ))}
        {selected.length > 0 && <button className="text-[10px] text-muted-foreground hover:text-foreground hover:underline pl-5" onClick={() => onChange([])}>Clear</button>}
      </div>
    </FilterSection>
  );
}
