/*
 * Composition-Based Material Classifier
 * Automatically categorizes materials based on chemical composition ranges
 * Generates dynamic family classifications (e.g., "High-Cr Stainless", "Al-Si Casting Alloy")
 */

import type { Material } from './materials';

/**
 * Parse composition range string to numeric bounds
 * Handles formats: "70~80", "≤2.0", "≥16.0", "balance", "16.0~18.0"
 */
function parseCompositionRange(rangeStr: string): { min: number; max: number } | null {
  if (!rangeStr || rangeStr === 'balance') return null;

  // Handle "~" range format (e.g., "70~80")
  if (rangeStr.includes('~')) {
    const [minStr, maxStr] = rangeStr.split('~');
    const min = parseFloat(minStr.trim());
    const max = parseFloat(maxStr.trim());
    if (!isNaN(min) && !isNaN(max)) return { min, max };
  }

  // Handle "≤" format
  if (rangeStr.includes('≤')) {
    const val = parseFloat(rangeStr.replace('≤', '').trim());
    if (!isNaN(val)) return { min: 0, max: val };
  }

  // Handle "≥" format
  if (rangeStr.includes('≥')) {
    const val = parseFloat(rangeStr.replace('≥', '').trim());
    if (!isNaN(val)) return { min: val, max: 100 };
  }

  // Handle plain number
  const val = parseFloat(rangeStr);
  if (!isNaN(val)) return { min: val, max: val };

  return null;
}

/**
 * Extract element concentration from material composition
 */
function getElementConcentration(material: Material, element: string): { min: number; max: number } | null {
  const comp = material.composition;

  // Handle array format (range list)
  if (Array.isArray(comp)) {
    const found = comp.find(item => Array.isArray(item) && item[0] === element);
    if (found && found[1]) {
      return parseCompositionRange(found[1] as string);
    }
  }

  // Handle dict format (value may be a number or a range/notation string e.g. "16.0~18.0", "≤2.0", "balance")
  if (typeof comp === 'object' && !Array.isArray(comp)) {
    const value = (comp as any)[element];
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return { min: value, max: value };
    return parseCompositionRange(String(value)); // parse to numeric bounds (null for "balance")
  }

  return null;
}

/**
 * Check if element concentration is above threshold
 */
function isElementHigh(material: Material, element: string, threshold: number): boolean {
  const conc = getElementConcentration(material, element);
  return conc ? conc.min >= threshold : false;
}

/**
 * Check if element concentration is below threshold
 */
function isElementLow(material: Material, element: string, threshold: number): boolean {
  const conc = getElementConcentration(material, element);
  return conc ? conc.max <= threshold : false;
}

/**
 * Check if element concentration is in range
 */
function isElementInRange(material: Material, element: string, min: number, max: number): boolean {
  const conc = getElementConcentration(material, element);
  return conc ? conc.min >= min && conc.max <= max : false;
}

/**
 * Classify material based on composition
 * Returns dynamic family classification
 */
export function classifyMaterialByComposition(material: Material): string {
  // Skip if no composition data
  const comp = material.composition;
  if (!comp || (Array.isArray(comp) && comp.length === 0)) {
    return material.subcategory || 'Other';
  }

  // Iron-based alloys
  if (isElementHigh(material, 'Fe', 50)) {
    if (isElementInRange(material, 'Cr', 16, 30) && isElementInRange(material, 'Ni', 8, 14)) {
      return 'Stainless Steel - Austenitic';
    }
    if (isElementInRange(material, 'Cr', 12, 18) && isElementLow(material, 'Ni', 2)) {
      return 'Stainless Steel - Ferritic/Martensitic';
    }
    if (isElementHigh(material, 'Cr', 12) && isElementHigh(material, 'Mo', 2)) {
      return 'Stainless Steel - Duplex';
    }
    if (isElementHigh(material, 'Ni', 8) && isElementHigh(material, 'Co', 5)) {
      return 'Nickel-based Superalloy';
    }
    if (isElementHigh(material, 'Ni', 45)) {
      return 'Nickel-based Superalloy';
    }
    if (isElementHigh(material, 'Mo', 4) && isElementHigh(material, 'Ni', 18)) {
      return 'Maraging Steel';
    }
    if (isElementHigh(material, 'C', 0.8)) {
      return 'Tool Steel';
    }
    if (isElementHigh(material, 'Ni', 3) || isElementHigh(material, 'Mo', 0.5)) {
      return 'Alloy Steel';
    }
    return 'Carbon Steel';
  }

  // Aluminum-based alloys
  if (isElementHigh(material, 'Al', 85)) {
    if (isElementInRange(material, 'Si', 4, 13)) {
      return 'Aluminum - Si Alloys (6xxx/7xxx)';
    }
    if (isElementInRange(material, 'Mg', 3, 6)) {
      return 'Aluminum - Mg Alloys (5xxx)';
    }
    if (isElementInRange(material, 'Cu', 3, 5)) {
      return 'Aluminum - Cu Alloys (2xxx)';
    }
    if (isElementInRange(material, 'Zn', 4, 8)) {
      return 'Aluminum - Zn Alloys (7xxx)';
    }
    return 'Aluminum - Pure/Other';
  }

  // Titanium-based alloys
  if (isElementHigh(material, 'Ti', 85)) {
    if (isElementInRange(material, 'Al', 5, 7) && isElementInRange(material, 'V', 3, 5)) {
      return 'Titanium - Ti6Al4V';
    }
    if (isElementHigh(material, 'Al', 5)) {
      return 'Titanium - Alpha Alloys';
    }
    if (isElementHigh(material, 'V', 3)) {
      return 'Titanium - Beta Alloys';
    }
    return 'Titanium - Pure/Other';
  }

  // Cobalt-based alloys
  if (isElementHigh(material, 'Co', 50)) {
    if (isElementHigh(material, 'Cr', 20) && isElementHigh(material, 'Mo', 8)) {
      return 'Cobalt - Stellite';
    }
    return 'Cobalt-based Superalloy';
  }

  // Nickel-based alloys
  if (isElementHigh(material, 'Ni', 50)) {
    if (isElementInRange(material, 'Cu', 60, 75)) {
      return 'Nickel-Copper (Monel)';
    }
    return 'Nickel-based Superalloy';
  }

  // Copper-based alloys
  if (isElementHigh(material, 'Cu', 50)) {
    if (isElementHigh(material, 'Zn', 20)) {
      return 'Copper - Brass';
    }
    if (isElementHigh(material, 'Sn', 5)) {
      return 'Copper - Bronze';
    }
    return 'Copper - Pure/Other';
  }

  // Magnesium-based alloys
  if (isElementHigh(material, 'Mg', 85)) {
    if (isElementHigh(material, 'Al', 8)) {
      return 'Magnesium - Al Alloys';
    }
    return 'Magnesium - Pure/Other';
  }

  // Fallback to subcategory
  return material.subcategory || 'Other';
}

/**
 * Generate dynamic family descriptions based on composition
 */
export function generateCompositionDescription(material: Material): string {
  const comp = material.composition;
  if (!comp || (Array.isArray(comp) && comp.length === 0)) {
    return 'Composition data not available';
  }

  const elements: string[] = [];

  if (isElementHigh(material, 'Fe', 50)) {
    const cr = getElementConcentration(material, 'Cr');
    const ni = getElementConcentration(material, 'Ni');
    const mo = getElementConcentration(material, 'Mo');

    if (cr && ni && cr.min >= 16 && ni.min >= 8) {
      elements.push(`High-Cr (${cr.min.toFixed(0)}%)`);
      elements.push(`High-Ni (${ni.min.toFixed(0)}%)`);
    }
    if (mo && mo.min >= 2) {
      elements.push(`Mo-enhanced (${mo.min.toFixed(1)}%)`);
    }
  }

  if (isElementHigh(material, 'Al', 85)) {
    const si = getElementConcentration(material, 'Si');
    const mg = getElementConcentration(material, 'Mg');

    if (si && si.min >= 4) {
      elements.push(`Si-rich (${si.min.toFixed(1)}%)`);
    }
    if (mg && mg.min >= 3) {
      elements.push(`Mg-alloyed (${mg.min.toFixed(1)}%)`);
    }
  }

  if (elements.length === 0) {
    elements.push('Multi-element alloy');
  }

  return elements.join(', ');
}

/**
 * Get all materials grouped by composition-based family
 */
export function groupMaterialsByCompositionFamily(materials: Material[]): Record<string, Material[]> {
  const groups: Record<string, Material[]> = {};

  materials.forEach(material => {
    const family = classifyMaterialByComposition(material);
    if (!groups[family]) {
      groups[family] = [];
    }
    groups[family].push(material);
  });

  return groups;
}
