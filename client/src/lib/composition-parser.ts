/**
 * Composition Range Parser
 * Parses various composition notations and converts to numeric ranges
 * 
 * Supported formats:
 * - "50~100" → [50, 100]
 * - "50-100" → [50, 100]
 * - "50 to 100" → [50, 100]
 * - "≤5" → [0, 5]
 * - "≥95" → [95, 100]
 * - "<5" → [0, 5)
 * - ">95" → (95, 100]
 * - "balance" → [balance marker]
 * - "50" → [50, 50]
 * - "max 5" → [0, 5]
 * - "min 50" → [50, 100]
 */

export interface CompositionRange {
  min: number | 'balance';
  max: number | 'balance';
  isExact: boolean; // true if single value
  isBalance: boolean; // true if contains "balance"
  original: string;
}

/**
 * Parse a composition notation string to numeric range
 */
export function parseCompositionRange(input: string): CompositionRange | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const original = input.trim();
  
  // Handle "balance" notation
  if (original.toLowerCase() === 'balance' || original === 'bal.') {
    return {
      min: 'balance',
      max: 'balance',
      isExact: false,
      isBalance: true,
      original,
    };
  }

  // Try to extract numeric values
  const patterns = [
    // Range patterns: "50~100", "50-100", "50 to 100"
    { regex: /^([\d.]+)\s*[~\-to]\s*([\d.]+)$/i, type: 'range' },
    // Comparison patterns: "≤5", "≥95", "<5", ">95"
    { regex: /^([≤<])\s*([\d.]+)$/, type: 'max' },
    { regex: /^([≥>])\s*([\d.]+)$/, type: 'min' },
    // Named patterns: "max 5", "min 50"
    { regex: /^max\s+([\d.]+)$/i, type: 'max' },
    { regex: /^min\s+([\d.]+)$/i, type: 'min' },
    // Single value: "50"
    { regex: /^([\d.]+)$/, type: 'exact' },
  ];

  for (const pattern of patterns) {
    const match = original.match(pattern.regex);
    if (match) {
      if (pattern.type === 'range') {
        const min = parseFloat(match[1]);
        const max = parseFloat(match[2]);
        return {
          min: Math.min(min, max),
          max: Math.max(min, max),
          isExact: false,
          isBalance: false,
          original,
        };
      } else if (pattern.type === 'max') {
        const max = parseFloat(match[2]);
        return {
          min: 0,
          max,
          isExact: false,
          isBalance: false,
          original,
        };
      } else if (pattern.type === 'min') {
        const min = parseFloat(match[2]);
        return {
          min,
          max: 100,
          isExact: false,
          isBalance: false,
          original,
        };
      } else if (pattern.type === 'exact') {
        const value = parseFloat(match[1]);
        return {
          min: value,
          max: value,
          isExact: true,
          isBalance: false,
          original,
        };
      }
    }
  }

  // If no pattern matched, try to extract any numbers
  const numbers = original.match(/[\d.]+/g);
  if (numbers && numbers.length > 0) {
    const values = numbers.map(n => parseFloat(n)).filter(n => !isNaN(n));
    if (values.length === 2) {
      return {
        min: Math.min(values[0], values[1]),
        max: Math.max(values[0], values[1]),
        isExact: false,
        isBalance: false,
        original,
      };
    } else if (values.length === 1) {
      return {
        min: values[0],
        max: values[0],
        isExact: true,
        isBalance: false,
        original,
      };
    }
  }

  return null;
}

/**
 * Check if a value falls within a composition range
 */
export function isInRange(value: number | null, range: CompositionRange): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (range.isBalance) {
    // Balance elements match any positive value
    return value > 0;
  }

  if (typeof range.min === 'number' && typeof range.max === 'number') {
    return value >= range.min && value <= range.max;
  }

  return false;
}

/**
 * Format a composition range for display
 */
export function formatCompositionRange(range: CompositionRange): string {
  if (range.isBalance) {
    return 'balance';
  }

  if (range.isExact && typeof range.min === 'number') {
    return range.min.toFixed(1);
  }

  if (typeof range.min === 'number' && typeof range.max === 'number') {
    return `${range.min.toFixed(1)}~${range.max.toFixed(1)}`;
  }

  return range.original;
}

/**
 * Parse all composition data from a material
 * Converts string ranges to numeric ranges
 */
export function parseCompositionData(
  composition: Record<string, string | number>
): Record<string, CompositionRange | null> {
  const result: Record<string, CompositionRange | null> = {};

  for (const [element, value] of Object.entries(composition)) {
    if (typeof value === 'string') {
      result[element] = parseCompositionRange(value);
    } else if (typeof value === 'number') {
      result[element] = {
        min: value,
        max: value,
        isExact: true,
        isBalance: false,
        original: value.toString(),
      };
    } else {
      result[element] = null;
    }
  }

  return result;
}

/**
 * Extract numeric value from composition range for filtering
 * Returns the midpoint of the range for filtering purposes
 */
export function getRangeValue(range: CompositionRange | null): number | null {
  if (!range) return null;

  if (range.isBalance) {
    return 50; // Use 50 as default for balance elements
  }

  if (typeof range.min === 'number' && typeof range.max === 'number') {
    return (range.min + range.max) / 2;
  }

  return null;
}
