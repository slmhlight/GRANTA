/*
 * Family Filter (Granta-style 3-tier tree — Category > Family > Sub-family)
 * R35a-v2 — tier1 = Category (Metal/Polymer/Ceramic/Composite),
 *           tier2 = explicit family bucket (Stainless Steel / Nickel Alloy / High-Performance Polymer / Oxide ceramic …),
 *           tier3 = subcategory leaf 자체. Indeterminate (▣) / fully-checked (☑) cascade.
 *
 *           각 노드 별 확장 상태 + 체크 cascade — tier2 클릭 시 그 그룹의 모든 leaf 토글,
 *           tier1 클릭 시 그 카테고리의 모든 leaf 토글 (state 는 filters.subcategories[] 에만 저장).
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Material } from '@/lib/materials';
import { FilterSection } from './FilterSection';
import { tier2Of, leafLabel, CATEGORY_TIER_STYLE, FALLBACK_TIER_STYLE, tier2FamilyColor } from './family-tiers';

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

export function FamilyFilter({ materials, selectedCategories, selected, onChange }: FamilyFilterProps) {
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

  const groupCountNote = !isActive && tree.length > 0
    ? <span className="text-[9px] text-muted-foreground">({tree.reduce((s, t) => s + t.tier2Groups.length, 0)} 그룹)</span>
    : null;

  return (
    <FilterSection title="Family Tree" activeCount={selected.length} extra={groupCountNote}>
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
          const style = CATEGORY_TIER_STYLE[node.tier1] || FALLBACK_TIER_STYLE;
          return (
            <div key={node.tier1} className="mb-2 rounded-md overflow-hidden">
              {/* tier1 — category. Sprint 2 A4: mobile 탭 영역 확대 (py 1.5→1, text 13→12, checkbox 4→3.5). */}
              <div className={`flex items-center gap-2 sm:gap-1.5 py-2 sm:py-1 px-2 ${style.bg1} ${style.tier1Bd} hover:brightness-95 transition-all`}>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(expandedTier1);
                    if (next.has(node.tier1)) next.delete(node.tier1);
                    else next.add(node.tier1);
                    setExpandedTier1(next);
                  }}
                  className={`w-5 h-5 sm:w-4 sm:h-4 flex items-center justify-center ${style.text1}`}
                  aria-label={tier1Expanded ? 'collapse' : 'expand'}
                >
                  {tier1Expanded ? <ChevronDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
                </button>
                <input
                  type="checkbox"
                  ref={(el) => { if (el) el.indeterminate = tier1State === 'partial'; }}
                  checked={tier1State === 'all'}
                  onChange={() => toggleGroup(allSubs)}
                  className="accent-accent w-4 h-4 sm:w-3.5 sm:h-3.5 flex-shrink-0"
                />
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                <span
                  className={`text-[13px] sm:text-[12px] font-bold flex-1 truncate cursor-pointer ${style.text1}`}
                  onClick={() => toggleGroup(allSubs)}
                >
                  {node.tier1}
                </span>
                <span className={`text-[11px] sm:text-[10px] font-mono ${style.text2}`}>{node.count}</span>
              </div>
              {/* tier2/tier3 wrapper — 좌측 colored line이 tier1 dot 아래로 이어짐 (tier1 색 그대로) */}
              {tier1Expanded && (
                <div className={`relative ml-3 mt-0.5 ${style.tier2Bd}`}>
                  {node.tier2Groups.map((group) => {
                    const groupSubs = group.leaves.map(l => l.sub);
                    const groupCheckedN = groupSubs.filter(s => selected.includes(s)).length;
                    const tier2State: 'none' | 'partial' | 'all' =
                      groupCheckedN === 0 ? 'none' : groupCheckedN === groupSubs.length ? 'all' : 'partial';
                    const key2 = `${node.tier1}::${group.tier2}`;
                    const tier2Expanded = expandedTier2.has(key2);
                    // R96 — tier2 색을 실제 family color (CLASSES) 와 매칭. 폴백 = tier1 의 style.text2 (이전 그대로).
                    const famHex = tier2FamilyColor(group.tier2);
                    const useFamHex = !!famHex;
                    const tier2Style = useFamHex ? { color: famHex } : undefined;
                    const tier2BgStyle = useFamHex ? { background: `${famHex}14` } : undefined; // ~8% alpha
                    return (
                      <div key={key2} className="relative">
                        {/* tier2 — family bucket. R96: metal 은 family color (inline style), 그 외는 tier1 색 (Tailwind class). */}
                        <div
                          className={`flex items-center gap-1.5 sm:gap-1 py-1 sm:py-0.5 pl-1 pr-1 hover:brightness-95 rounded-r transition-all ${useFamHex ? '' : style.bg2}`}
                          style={tier2BgStyle}
                        >
                          <span className={`font-mono text-[11px] select-none leading-none w-3 text-center ${useFamHex ? '' : style.text2}`} style={tier2Style} aria-hidden>└</span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(expandedTier2);
                              if (next.has(key2)) next.delete(key2);
                              else next.add(key2);
                              setExpandedTier2(next);
                            }}
                            className={`w-4 h-4 sm:w-3.5 sm:h-3.5 flex items-center justify-center ${useFamHex ? '' : style.text2}`}
                            style={tier2Style}
                          >
                            {tier2Expanded ? <ChevronDown className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> : <ChevronRight className="w-3.5 h-3.5 sm:w-3 sm:h-3" />}
                          </button>
                          <input
                            type="checkbox"
                            ref={(el) => { if (el) el.indeterminate = tier2State === 'partial'; }}
                            checked={tier2State === 'all'}
                            onChange={() => toggleGroup(groupSubs)}
                            className="accent-accent w-3.5 h-3.5 sm:w-3 sm:h-3 flex-shrink-0"
                          />
                          <span
                            className={`text-[12px] sm:text-[11px] flex-1 truncate cursor-pointer font-medium ${useFamHex ? '' : style.text2}`}
                            style={tier2Style}
                            title={group.tier2}
                            onClick={() => toggleGroup(groupSubs)}
                          >
                            {group.tier2}
                          </span>
                          <span className="text-[10px] sm:text-[9px] text-muted-foreground font-mono">{group.count}</span>
                        </div>
                        {/* tier3 — leaf subcategories (들여쓰기 + 더 옅은 ㄴ) */}
                        {tier2Expanded && (
                          <div className={`ml-3 ${style.tier3Bd}`}>
                            {/* tier3 leaf — Sprint 2 A4: mobile padding 1, text 11, checkbox 3.5 */}
                            {group.leaves.map((leaf) => (
                              <label key={leaf.sub} className="flex items-center gap-1.5 sm:gap-1 py-1 sm:py-0.5 pl-1 pr-1 hover:bg-muted/30 rounded-r cursor-pointer text-[11px] sm:text-[10.5px]">
                                <span className={`font-mono text-muted-foreground/50 text-[10px] select-none leading-none w-3 text-center`} aria-hidden>└</span>
                                <input
                                  type="checkbox"
                                  checked={selected.includes(leaf.sub)}
                                  onChange={() => toggleLeaf(leaf.sub)}
                                  className="accent-accent w-3.5 h-3.5 sm:w-3 sm:h-3 flex-shrink-0"
                                />
                                <span className="flex-1 truncate text-foreground/70" title={leaf.sub}>
                                  {leafLabel(leaf.sub)}
                                </span>
                                <span className="text-[10px] sm:text-[9px] text-muted-foreground/70 font-mono">{leaf.count}</span>
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
    </FilterSection>
  );
}
