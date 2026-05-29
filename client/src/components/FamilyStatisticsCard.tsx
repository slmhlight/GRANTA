/*
 * Family Statistics Card
 * Scientific Precision Design System
 * Displays aggregate performance metrics for a material family
 * Shows min/max/avg for density, strength, ductility, stiffness, hardness
 */

import { TrendingUp, Zap, Droplet, Gauge, Layers } from 'lucide-react';
import type { FamilyStatistics } from '@/lib/family-statistics';
import {
  formatStatValue,
  getStrengthTier,
  getDensityTier,
  getDuctilityTier,
} from '@/lib/family-statistics';

interface FamilyStatisticsCardProps {
  stats: FamilyStatistics;
  isExpanded?: boolean;
}

export function FamilyStatisticsCard({ stats, isExpanded = false }: FamilyStatisticsCardProps) {
  const strengthTier = getStrengthTier(stats.yieldStrength.avg);
  const densityTier = getDensityTier(stats.density.avg);
  const ductilityTier = getDuctilityTier(stats.elongation.avg);

  // Color scheme based on performance tier
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Ultra-High':
      case 'High':
        return 'text-red-600 bg-red-50';
      case 'Medium':
        return 'text-amber-600 bg-amber-50';
      case 'Low':
      case 'Lightweight':
        return 'text-blue-600 bg-blue-50';
      case 'Brittle':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="border border-border/40 rounded-lg p-3 bg-card/50 hover:bg-card/80 transition-colors">
      {/* Header with family name and count */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">{stats.family}</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stats.count} materials</p>
        </div>
      </div>

      {/* Performance tiers */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <div className={`text-[10px] font-medium px-2 py-1 rounded ${getTierColor(strengthTier)}`}>
          {strengthTier} Strength
        </div>
        <div className={`text-[10px] font-medium px-2 py-1 rounded ${getTierColor(densityTier)}`}>
          {densityTier}
        </div>
        <div className={`text-[10px] font-medium px-2 py-1 rounded ${getTierColor(ductilityTier)}`}>
          {ductilityTier} Ductility
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {/* Density */}
        <div className="border border-border/20 rounded p-2 bg-muted/30">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Gauge className="w-3 h-3" />
            <span className="font-medium">Density</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatStatValue(stats.density.avg)} g/cm³
              </span>
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>{formatStatValue(stats.density.min)}–{formatStatValue(stats.density.max)}</span>
            </div>
          </div>
        </div>

        {/* Yield Strength */}
        <div className="border border-border/20 rounded p-2 bg-muted/30">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <TrendingUp className="w-3 h-3" />
            <span className="font-medium">σ_y</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatStatValue(stats.yieldStrength.avg, 0)} MPa
              </span>
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>{formatStatValue(stats.yieldStrength.min, 0)}–{formatStatValue(stats.yieldStrength.max, 0)}</span>
            </div>
          </div>
        </div>

        {/* UTS */}
        <div className="border border-border/20 rounded p-2 bg-muted/30">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Zap className="w-3 h-3" />
            <span className="font-medium">UTS</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatStatValue(stats.uts.avg, 0)} MPa
              </span>
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>{formatStatValue(stats.uts.min, 0)}–{formatStatValue(stats.uts.max, 0)}</span>
            </div>
          </div>
        </div>

        {/* Elongation */}
        <div className="border border-border/20 rounded p-2 bg-muted/30">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Droplet className="w-3 h-3" />
            <span className="font-medium">El.</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatStatValue(stats.elongation.avg)}%
              </span>
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>{formatStatValue(stats.elongation.min)}–{formatStatValue(stats.elongation.max)}</span>
            </div>
          </div>
        </div>

        {/* Modulus */}
        <div className="border border-border/20 rounded p-2 bg-muted/30">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Layers className="w-3 h-3" />
            <span className="font-medium">E</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatStatValue(stats.modulus.avg)} GPa
              </span>
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>{formatStatValue(stats.modulus.min)}–{formatStatValue(stats.modulus.max)}</span>
            </div>
          </div>
        </div>

        {/* Hardness */}
        <div className="border border-border/20 rounded p-2 bg-muted/30">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Gauge className="w-3 h-3" />
            <span className="font-medium">HV</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatStatValue(stats.hardness.avg, 0)}
              </span>
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>{formatStatValue(stats.hardness.min, 0)}–{formatStatValue(stats.hardness.max, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="text-[9px] text-muted-foreground italic pt-2 border-t border-border/20 mt-2">
        Statistics based on {stats.count} materials in this family
      </div>
    </div>
  );
}
