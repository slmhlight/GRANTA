/*
 * Family Statistics Calculator
 * Computes aggregate properties for material families
 * Provides min/max/avg/median statistics for performance metrics
 */

import type { Material } from './materials';

export interface FamilyStatistics {
  family: string;
  count: number;
  
  // Density statistics (g/cm³)
  density: {
    min: number | null;
    max: number | null;
    avg: number | null;
  };
  
  // Strength statistics (MPa)
  yieldStrength: {
    min: number | null;
    max: number | null;
    avg: number | null;
  };
  
  uts: {
    min: number | null;
    max: number | null;
    avg: number | null;
  };
  
  // Ductility (%)
  elongation: {
    min: number | null;
    max: number | null;
    avg: number | null;
  };
  
  // Stiffness (GPa)
  modulus: {
    min: number | null;
    max: number | null;
    avg: number | null;
  };
  
  // Hardness (HV)
  hardness: {
    min: number | null;
    max: number | null;
    avg: number | null;
  };
  
  // Thermal conductivity (W/m·K)
  thermalConductivity: {
    min: number | null;
    max: number | null;
    avg: number | null;
  };
}

/**
 * Calculate min/max/avg for a numeric property
 */
function calculateStats(values: (number | null)[]): { min: number | null; max: number | null; avg: number | null } {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  
  if (valid.length === 0) {
    return { min: null, max: null, avg: null };
  }
  
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  
  return { min, max, avg };
}

/**
 * Calculate statistics for a material family
 */
export function calculateFamilyStatistics(
  family: string,
  materials: Material[]
): FamilyStatistics {
  return {
    family,
    count: materials.length,
    
    density: calculateStats(materials.map(m => m.density)),
    yieldStrength: calculateStats(materials.map(m => m.yield_strength)),
    uts: calculateStats(materials.map(m => m.uts)),
    elongation: calculateStats(materials.map(m => m.elongation)),
    modulus: calculateStats(materials.map(m => m.modulus)),
    hardness: calculateStats(materials.map(m => m.hardness)),
    thermalConductivity: calculateStats(materials.map(m => m.thermal_conductivity)),
  };
}

/**
 * Calculate statistics for all families
 */
export function calculateAllFamilyStatistics(
  familyGroups: Record<string, Material[]>
): Record<string, FamilyStatistics> {
  const stats: Record<string, FamilyStatistics> = {};
  
  for (const [family, materials] of Object.entries(familyGroups)) {
    stats[family] = calculateFamilyStatistics(family, materials);
  }
  
  return stats;
}

/**
 * Format numeric value for display
 */
export function formatStatValue(value: number | null, decimals: number = 1): string {
  if (value === null || isNaN(value)) return '—';
  return value.toFixed(decimals);
}

/**
 * Get performance tier based on yield strength
 */
export function getStrengthTier(yieldStrength: number | null): 'Low' | 'Medium' | 'High' | 'Ultra-High' | 'Unknown' {
  if (yieldStrength === null) return 'Unknown';
  if (yieldStrength < 200) return 'Low';
  if (yieldStrength < 500) return 'Medium';
  if (yieldStrength < 1000) return 'High';
  return 'Ultra-High';
}

/**
 * Get density tier
 */
export function getDensityTier(density: number | null): 'Lightweight' | 'Medium' | 'Heavy' | 'Unknown' {
  if (density === null) return 'Unknown';
  if (density < 3) return 'Lightweight';
  if (density < 8) return 'Medium';
  return 'Heavy';
}

/**
 * Get ductility tier based on elongation
 */
export function getDuctilityTier(elongation: number | null): 'Brittle' | 'Low' | 'Medium' | 'High' | 'Unknown' {
  if (elongation === null) return 'Unknown';
  if (elongation < 2) return 'Brittle';
  if (elongation < 10) return 'Low';
  if (elongation < 25) return 'Medium';
  return 'High';
}
