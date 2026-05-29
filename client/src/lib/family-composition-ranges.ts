/*
 * Family Composition Ranges Extractor
 * Extracts typical composition ranges for each material family
 * Used for auto-applying composition filters when selecting a family
 */

export interface CompositionRange {
  [element: string]: [number, number] | null;
}

/**
 * Get typical composition ranges for a material family
 * Returns suggested filter ranges based on family characteristics
 */
export function getCompositionRangesForFamily(family: string): CompositionRange {
  const ranges: Record<string, CompositionRange> = {
    // Stainless Steel families
    'Stainless Steel - Austenitic': {
      Fe: [50, 100],
      Cr: [16, 30],
      Ni: [8, 14],
      Mo: null,
      Mn: [0, 3],
    },
    'Stainless Steel - Ferritic/Martensitic': {
      Fe: [50, 100],
      Cr: [12, 18],
      Ni: [0, 2],
      Mo: [0, 1],
    },
    'Stainless Steel - Duplex': {
      Fe: [50, 100],
      Cr: [20, 30],
      Ni: [4, 8],
      Mo: [2, 4],
    },

    // Aluminum alloy families
    'Aluminum - Cu Alloys (2xxx)': {
      Al: [92, 99],
      Cu: [3, 6],
      Mg: [0, 1.5],
      Mn: [0.3, 0.9],
    },
    'Aluminum - Mn Alloys (3xxx)': {
      Al: [97, 99],
      Mn: [1, 1.5],
      Cu: [0, 0.2],
    },
    'Aluminum - Mg Alloys (5xxx)': {
      Al: [95, 99],
      Mg: [3, 6],
      Mn: [0, 0.5],
    },
    'Aluminum - Si Alloys (6xxx/7xxx)': {
      Al: [88, 98],
      Si: [0.4, 1.5],
      Mg: [0.4, 1],
      Cu: [0, 0.3],
    },
    'Aluminum - Zn Alloys (7xxx)': {
      Al: [90, 96],
      Zn: [4, 8],
      Mg: [1, 3],
      Cu: [1, 2],
    },
    'Aluminum - Pure/Other': {
      Al: [99, 100],
    },

    // Carbon and alloy steels
    'Carbon Steel': {
      Fe: [98, 100],
      C: [0.05, 0.5],
      Mn: [0.3, 1],
      Si: [0, 0.3],
    },
    'Alloy Steel': {
      Fe: [95, 100],
      C: [0.1, 0.5],
      Ni: [1, 5],
      Mo: [0.2, 1],
      Cr: [0.5, 2],
    },
    'Tool Steel': {
      Fe: [97, 100],
      C: [0.7, 1.5],
      W: [0, 12],
      Mo: [0, 5],
      V: [0, 5],
    },
    'Maraging Steel': {
      Fe: [75, 85],
      Ni: [18, 25],
      Mo: [3, 5],
      Ti: [0.1, 0.3],
      Co: [8, 12],
    },

    // Titanium alloys
    'Titanium - Ti6Al4V': {
      Ti: [88, 92],
      Al: [5.5, 6.5],
      V: [3.5, 4.5],
    },
    'Titanium - Alpha Alloys': {
      Ti: [95, 99],
      Al: [5, 8],
    },
    'Titanium - Beta Alloys': {
      Ti: [90, 98],
      V: [3, 15],
      Mo: [0, 8],
    },
    'Titanium - Pure/Other': {
      Ti: [99, 100],
    },

    // Nickel-based superalloys
    'Nickel-based Superalloy': {
      Ni: [50, 100],
      Co: [0, 20],
      Cr: [10, 25],
      Mo: [0, 10],
      Al: [0, 6],
      Ti: [0, 5],
    },
    'Nickel - Inconel Superalloy': {
      Ni: [58, 62],
      Cr: [19, 21],
      Fe: [5, 9],
      Mo: [2.8, 3.3],
    },
    'Nickel - Hastelloy': {
      Ni: [50, 60],
      Mo: [15, 17],
      Cr: [21, 23],
      W: [3, 5],
    },
    'Nickel-Copper (Monel)': {
      Ni: [60, 75],
      Cu: [20, 30],
      Fe: [0, 2],
    },

    // Cobalt alloys
    'Cobalt-based Superalloy': {
      Co: [50, 100],
      Cr: [20, 30],
      Mo: [0, 10],
      Ni: [0, 20],
    },
    'Cobalt - Stellite': {
      Co: [50, 70],
      Cr: [25, 35],
      Mo: [8, 12],
      W: [0, 5],
    },

    // Copper alloys
    'Copper - Brass': {
      Cu: [55, 75],
      Zn: [20, 40],
    },
    'Copper - Bronze': {
      Cu: [85, 95],
      Sn: [5, 12],
    },
    'Copper - Pure/Other': {
      Cu: [99, 100],
    },

    // Magnesium alloys
    'Magnesium - Al Alloys': {
      Mg: [90, 96],
      Al: [3, 10],
      Zn: [0, 3],
    },
    'Magnesium - Pure/Other': {
      Mg: [99, 100],
    },
  };

  return ranges[family] || {};
}

/**
 * Convert family composition ranges to filter format
 * Returns object suitable for useMaterialFilter compositionRanges
 */
export function familyToCompositionFilter(family: string): Record<string, [number, number] | null> {
  const familyRanges = getCompositionRangesForFamily(family);
  const filter: Record<string, [number, number] | null> = {};

  for (const [element, range] of Object.entries(familyRanges)) {
    filter[element] = range;
  }

  return filter;
}

/**
 * Get description of composition ranges for a family
 */
export function describeCompositionRanges(family: string): string {
  const ranges = getCompositionRangesForFamily(family);
  const descriptions: string[] = [];

  for (const [element, range] of Object.entries(ranges)) {
    if (range) {
      descriptions.push(`${element}: ${range[0].toFixed(1)}–${range[1].toFixed(1)}%`);
    }
  }

  return descriptions.join(', ') || 'No typical composition ranges defined';
}
