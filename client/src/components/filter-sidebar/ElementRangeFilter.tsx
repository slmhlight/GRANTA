/*
 * 원소 함량 범위 필터 (클라이언트 사이드). 각 원소의 슬라이더 범위는 전체 재료의 조성에서 산출한다.
 */
import { useMemo } from 'react';
import { RangeSliderCompact } from '@/components/RangeSliderCompact';
import type { Material } from '@/lib/materials';
import { parseCompositionRange, getRangeValue } from '@/lib/composition-parser';
import { FilterSection } from './FilterSection';

/* 조성 필터에 노출할 원소 — 상수라 컴포넌트 밖에 둔다.
   안에 두면 렌더마다 새 배열이라 elementRanges memo 의 의존성이 성립하지 않는다. */
const ELEMENTS = ['Fe', 'Al', 'Ni', 'Ti', 'Co', 'Cu', 'Cr', 'Mo', 'Mn', 'Si', 'C', 'O', 'N', 'V', 'W', 'Nb', 'Ta'] as const;

/* 원소별 프리셋 — 렌더마다 만들 이유가 없어 모듈 상수. */
const PRESETS: Record<string, { label: string; range: [number, number] }[]> = {
  Fe: [{ label: 'Low Fe', range: [0, 5] }, { label: 'High Fe', range: [50, 100] }],
  Cr: [{ label: 'Stainless', range: [15, 30] }, { label: 'High Cr', range: [25, 40] }],
  Ni: [{ label: 'Austenitic', range: [8, 15] }, { label: 'High Ni', range: [15, 35] }],
  Al: [{ label: 'Low Al', range: [0, 5] }, { label: 'Al-rich', range: [5, 15] }],
  Ti: [{ label: 'Ti alloy', range: [3, 10] }, { label: 'High Ti', range: [10, 100] }],
  C: [{ label: 'Low C', range: [0, 0.1] }, { label: 'Medium C', range: [0.1, 0.5] }, { label: 'High C', range: [0.5, 2] }],
  Mo: [{ label: 'Low Mo', range: [0, 2] }, { label: 'High Mo', range: [2, 10] }],
  Mn: [{ label: 'Low Mn', range: [0, 1] }, { label: 'High Mn', range: [1, 5] }],
};

interface ElementRangeFilterProps {
  materials: Material[];
  ranges: Record<string, [number, number] | null>;
  onChange: (ranges: Record<string, [number, number] | null>) => void;
}

export function ElementRangeFilter({ materials, ranges, onChange }: ElementRangeFilterProps) {
  const activeCount = Object.values(ranges).filter(r => r !== null).length;

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

  return (
    <FilterSection title="Element Range" activeCount={activeCount}>
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
              presets={PRESETS[el] || []}
            />
          );
        })}
        {activeCount > 0 && (
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground hover:underline w-full text-center mt-2 py-2 border-t border-border/50"
            onClick={() => onChange({})}
          >
            Clear All
          </button>
        )}
      </div>
    </FilterSection>
  );
}
