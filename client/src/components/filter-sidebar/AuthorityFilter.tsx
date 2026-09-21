/*
 * E3 (H6 W4-2) — 출처 권위 등급 필터.
 *
 * **은폐 장치가 아니다.** 선택이 비면 전량이 보이고, 선택은 "그 등급의 출처를 **가진**" 재료를
 * 남기는 OR 조건이다. 재료 하나가 규격·제조사·애그리게이터 출처를 함께 갖는 게 정상이라
 * '최고 등급' 으로 거르면 정보가 사라진다 — 실측상 전 재료의 최고 등급은 규격 아니면 핸드북뿐이라
 * 그 축은 필터로서 아무 일도 하지 않는다(원칙 8).
 */
import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import type { Material } from '@/lib/materials';
import { AUTHORITY_ORDER, AUTHORITY_META, authorityGrades, type Authority } from '@/lib/source-authority';
import { FilterSection, toggleIn } from './FilterSection';
import { useLang } from '@/lib/i18n';   // AUD F23

interface AuthorityFilterProps {
  materials: Material[];
  selected: string[];
  onChange: (v: string[]) => void;
  onSort?: () => void;
  sortActive?: boolean;
}

export function AuthorityFilter({ materials, selected, onChange, onSort, sortActive }: AuthorityFilterProps) {
  const { lang } = useLang();
  const counts = useMemo(() => {
    const c = {} as Record<Authority, number>;
    for (const a of AUTHORITY_ORDER) c[a] = 0;
    /* Set 순회는 tsconfig target 제약이 있어 배열로 받는다 (downlevelIteration 미사용). */
    for (const m of materials) authorityGrades(m).forEach((g) => { c[g] += 1; });
    return c;
  }, [materials]);

  return (
    <FilterSection title={lang === 'en' ? 'Source authority' : '출처 등급'} activeCount={selected.length}>
      <div className="px-3 py-2 space-y-1.5">
        <p className="text-[10px] text-muted-foreground leading-snug">
          선택한 등급의 <b>출처를 가진</b> 재료를 남깁니다. 선택하지 않으면 전량이 보입니다 —
          낮은 등급을 감추는 기능이 아닙니다.
        </p>
        {AUTHORITY_ORDER.map((a) => (
          <label key={a} className="flex items-center gap-2 cursor-pointer" title={AUTHORITY_META[a].title}>
            <Checkbox checked={selected.includes(a)} onCheckedChange={() => onChange(toggleIn(selected, a))} className="w-3.5 h-3.5 rounded-sm flex-shrink-0" />
            <span className={`text-[9px] px-1 rounded border font-medium ${AUTHORITY_META[a].cls}`} title={lang === 'en' ? AUTHORITY_META[a].titleEn : AUTHORITY_META[a].title}>{lang === 'en' ? AUTHORITY_META[a].sEn : AUTHORITY_META[a].s}</span>
            <span className="text-[10px] text-muted-foreground">{counts[a]}</span>
          </label>
        ))}
        {onSort && (
          <button
            className={`w-full text-[10px] mt-1 px-2 py-1 rounded border transition-colors ${sortActive ? 'bg-accent/15 text-accent border-accent/40 font-medium' : 'text-muted-foreground border-border/50 hover:bg-muted/50'}`}
            onClick={onSort}
            title="출처 권위가 높은 재료(규격 → 핸드북 → 제조사 → DB → 기타)부터 정렬합니다. 목록에서 아무것도 빼지 않습니다."
          >
            출처 권위순 정렬{sortActive ? ' ✓' : ''}
          </button>
        )}
        {selected.length > 0 && <button className="text-[10px] text-muted-foreground hover:text-foreground hover:underline pl-5" onClick={() => onChange([])}>Clear</button>}
      </div>
    </FilterSection>
  );
}
