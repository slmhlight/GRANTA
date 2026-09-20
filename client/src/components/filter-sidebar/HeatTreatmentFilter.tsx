/*
 * R38e — 열처리 다중 선택. 현실적으로 가능한 조건만 노출 — 데이터에 없는 조합은 자연 배제.
 * 옵션 value 는 lib/ht-matcher.ts 의 카테고리(소문자 비교)와 짝이다 — 게이트(filter-sidebar.test)가
 * 각 옵션이 실데이터에서 0건이 아님을 본다(죽은 옵션·오타 검출).
 */
import { Checkbox } from '@/components/ui/checkbox';
import { FilterSection, toggleIn } from './FilterSection';

export const HEAT_TREATMENT_OPTIONS: { value: string; label: string; help?: string }[] = [
  { value: 'None / As-supplied', label: 'None / As-supplied', help: 'As-built / As-cast / As-rolled / As-forged' },
  { value: 'Annealed', label: 'Annealed (소둔)', help: '연화 처리 — 가공성 향상, 내부 응력 해소' },
  { value: 'Solution Treated', label: 'Solution (고용화)', help: '석출경화 alloy 의 1차 처리 — 고온 가열 후 급랭' },
  { value: 'Aged / Precipitation', label: 'Aged / Precipitation', help: '시효 처리 — T6 / T7 / peak-aged 등 (Al / Ni 슈퍼합금)' },
  { value: 'Quenched & Tempered', label: 'Quenched & Tempered', help: 'QT — 강 표준 (고탄소·합금강)' },
  { value: 'HIP (Hot Isostatic)', label: 'HIP', help: 'Hot Isostatic Pressing — AM 부품 결함 제거 / 균질화' },
  { value: 'Stress-relieved', label: 'Stress-relieved', help: '저온 가열 — 잔류 응력만 제거 (강도 거의 유지)' },
  { value: 'Normalized', label: 'Normalized (불림)', help: '공냉 — 결정립 미세화 (탄소강)' },
  { value: 'Hardened', label: 'Hardened (담금)', help: '표면경화 (침탄/질화) 또는 마르텐사이트 변태' },
  /* A10 — 냉간가공 상태의 정식 카테고리 (기존엔 Hardened 에 오흡수되거나 미노출) */
  { value: 'Cold-worked / Strain-hardened', label: 'Cold-worked (냉간가공)', help: '가공경화 — Strain-hardened / 압연·인발 / H1x·H3x temper' },
];

interface HeatTreatmentFilterProps {
  selected: string[];
  onChange: (v: string[]) => void;
}

export function HeatTreatmentFilter({ selected, onChange }: HeatTreatmentFilterProps) {
  return (
    <FilterSection title="Heat Treatment" activeCount={selected.length}>
      <div className="px-3 py-2 space-y-1.5">
        <p className="text-[10px] text-muted-foreground italic mb-1">현실적이지 않은 조합은 자동 제외 — 데이터 매칭 기반.</p>
        {HEAT_TREATMENT_OPTIONS.map((o) => (
          <label key={o.value} className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={selected.includes(o.value)}
              onCheckedChange={() => onChange(toggleIn(selected, o.value))}
              className="w-3.5 h-3.5 rounded-sm flex-shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium leading-tight">{o.label}</div>
              {o.help && <div className="text-[9px] text-muted-foreground leading-tight">{o.help}</div>}
            </div>
          </label>
        ))}
        {selected.length > 0 && (
          <button className="text-[10px] text-muted-foreground hover:text-foreground hover:underline pl-5 mt-1" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
    </FilterSection>
  );
}
