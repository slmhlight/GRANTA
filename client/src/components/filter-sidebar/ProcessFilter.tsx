/*
 * 공정 그룹 필터 (Wrought / Molding / Casting / Powder / AM).
 * R202 #3 — 그룹별 재료 수를 함께 표시한다. 수를 세는 술어는 필터가 쓰는 것과 **같은 함수**
 * (lib/process-groups.ts) — 예전엔 키워드 표를 복사해 두고 다른 필드(processes[])를 읽어 count 가
 * 필터 결과와 1건씩 어긋났다.
 */
import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import type { Material } from '@/lib/materials';
import { PROCESS_GROUPS, matchesProcessGroup } from '@/lib/process-groups';
import { FilterSection, toggleIn } from './FilterSection';

interface ProcessFilterProps {
  selected: string[];
  onChange: (v: string[]) => void;
  materials: Material[];
}

export function ProcessFilter({ selected, onChange, materials }: ProcessFilterProps) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of PROCESS_GROUPS) c[g.name] = materials.filter(m => matchesProcessGroup(m, g.name)).length;
    return c;
  }, [materials]);

  return (
    <FilterSection title="Process" activeCount={selected.length}>
      <div className="px-3 py-2 space-y-2">
        {PROCESS_GROUPS.map(g => (
          <label key={g.name} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={selected.includes(g.name)}
              onCheckedChange={() => onChange(toggleIn(selected, g.name))}
              className="w-3.5 h-3.5 rounded-sm flex-shrink-0 mt-0.5"
            />
            <div className="flex-1 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-medium">{g.name}</div>
                <div className="text-[9px] text-muted-foreground">{g.description}</div>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">{counts[g.name] || 0}</span>
            </div>
          </label>
        ))}
        {selected.length > 0 && (
          <button className="text-[10px] text-muted-foreground hover:text-foreground hover:underline pl-5" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
    </FilterSection>
  );
}
