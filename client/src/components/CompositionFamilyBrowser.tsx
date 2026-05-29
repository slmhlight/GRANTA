/*
 * Composition Family Browser
 * Scientific Precision Design System
 * Displays materials grouped by composition-based family classification
 * Shows family hierarchy with material counts and composition descriptions
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Atom, BarChart3, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FamilyStatisticsCard } from '@/components/FamilyStatisticsCard';
import type { Material } from '@/lib/materials';
import { useCompositionFamilyGroups } from '@/hooks/useCompositionClassification';
import { calculateAllFamilyStatistics } from '@/lib/family-statistics';
import { familyToCompositionFilter, describeCompositionRanges } from '@/lib/family-composition-ranges';

interface CompositionFamilyBrowserProps {
  materials: Material[];
  onSelectMaterial?: (material: Material) => void;
  onApplyCompositionFilter?: (filter: Record<string, [number, number] | null>) => void;
}

export function CompositionFamilyBrowser({
  materials,
  onSelectMaterial,
  onApplyCompositionFilter,
}: CompositionFamilyBrowserProps) {
  const familyGroups = useCompositionFamilyGroups(materials);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [showStats, setShowStats] = useState<Set<string>>(new Set());

  const familyStats = useMemo(
    () => calculateAllFamilyStatistics(familyGroups),
    [familyGroups]
  );

  const toggleFamily = (family: string) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev);
      if (next.has(family)) {
        next.delete(family);
      } else {
        next.add(family);
      }
      return next;
    });
  };

  const toggleStats = (family: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStats(prev => {
      const next = new Set(prev);
      if (next.has(family)) {
        next.delete(family);
      } else {
        next.add(family);
      }
      return next;
    });
  };

  const handleApplyCompositionFilter = (family: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filter = familyToCompositionFilter(family);
    onApplyCompositionFilter?.(filter);
  };

  const families = Object.entries(familyGroups).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-2 p-3">
      <div className="text-xs font-semibold text-foreground/70 flex items-center gap-2 mb-3">
        <Atom className="w-4 h-4" />
        Composition-Based Families
      </div>

      <div className="space-y-1">
        {families.map(([family, items]) => {
          const isExpanded = expandedFamilies.has(family);
          const isStatsVisible = showStats.has(family);

          return (
            <div key={family} className="border border-border/30 rounded overflow-hidden">
              {/* Family header */}
              <div
                onClick={() => toggleFamily(family)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span className="text-xs font-medium text-foreground truncate">{family}</span>
                </div>
                <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                  {isExpanded && (
                    <>
                      <button
                        onClick={(e) => handleApplyCompositionFilter(family, e)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors px-1.5 py-0.5 rounded hover:bg-muted/50"
                        title="Auto-apply composition filter for this family"
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => toggleStats(family, e)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors px-1.5 py-0.5 rounded hover:bg-muted/50"
                        title="Show performance statistics"
                      >
                        <BarChart3 className="w-3 h-3" />
                        {isStatsVisible ? 'Hide' : 'Stats'}
                      </button>
                    </>
                  )}
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">
                    {items.length}
                  </Badge>
                </div>
              </div>

              {/* Statistics card */}
              {isExpanded && isStatsVisible && familyStats[family] && (
                <div className="border-t border-border/20 bg-muted/10 p-2">
                  <FamilyStatisticsCard stats={familyStats[family]} />
                </div>
              )}

              {/* Family contents (materials list) */}
              {isExpanded && !isStatsVisible && (
                <div className="border-t border-border/20 bg-muted/20 max-h-64 overflow-y-auto">
                  {items.slice(0, 20).map(material => (
                    <button
                      key={material.id}
                      onClick={() => onSelectMaterial?.(material)}
                      className="w-full text-left px-3 py-1.5 hover:bg-muted/50 border-b border-border/10 last:border-0 transition-colors"
                    >
                      <div className="text-[11px] font-medium text-foreground truncate">
                        {material.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {material.manufacturer}
                      </div>
                    </button>
                  ))}
                  {items.length > 20 && (
                    <div className="px-3 py-1.5 text-[10px] text-muted-foreground italic text-center border-t border-border/10">
                      +{items.length - 20} more materials
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-muted-foreground italic pt-2 border-t border-border/30 space-y-1">
        <p>Families are automatically classified based on chemical composition analysis</p>
        <p>Click 📊 to view stats, 🔍 to auto-apply composition filter</p>
      </div>
    </div>
  );
}
