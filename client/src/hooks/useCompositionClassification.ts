/*
 * useCompositionClassification Hook
 * Applies composition-based classification to materials
 * Enriches materials with dynamic family classifications
 */

import { useMemo } from 'react';
import type { Material } from '@/lib/materials';
import { classifyMaterialByComposition, generateCompositionDescription } from '@/lib/composition-classifier';

/**
 * Enhanced material with composition-based classification
 */
export interface ClassifiedMaterial extends Material {
  compositionFamily: string;
  compositionDescription: string;
}

/**
 * Apply composition-based classification to materials
 */
export function useCompositionClassification(materials: Material[]): ClassifiedMaterial[] {
  return useMemo(() => {
    return materials.map(material => ({
      ...material,
      compositionFamily: classifyMaterialByComposition(material),
      compositionDescription: generateCompositionDescription(material),
    }));
  }, [materials]);
}

/**
 * Get materials grouped by composition-based family
 */
export function useCompositionFamilyGroups(materials: Material[]): Record<string, ClassifiedMaterial[]> {
  const classified = useCompositionClassification(materials);

  return useMemo(() => {
    const groups: Record<string, ClassifiedMaterial[]> = {};

    classified.forEach(material => {
      const family = material.compositionFamily;
      if (!groups[family]) {
        groups[family] = [];
      }
      groups[family].push(material);
    });

    // Sort groups by size (largest first)
    const sorted: Record<string, ClassifiedMaterial[]> = {};
    Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([family, items]) => {
        sorted[family] = items;
      });

    return sorted;
  }, [classified]);
}
