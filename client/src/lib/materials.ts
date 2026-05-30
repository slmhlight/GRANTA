/*
 * AM Materials Explorer — Data Types & Utilities
 * Scientific Precision Design System
 */

export interface Material {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  manufacturer: string;
  process: string;
  density: number | null;
  yield_strength: number | null;
  uts: number | null;
  elongation: number | null;
  modulus: number | null;
  hardness: number | null;
  thermal_conductivity: number | null;
  // Chemical composition - can be either numeric dict, string dict (ranges), or range list format
  composition: Array<[string, string]> | {
    C: number | string | null;
    O: number | string | null;
    Fe: number | string | null;
    Cr: number | string | null;
    Ni: number | string | null;
    Mo: number | string | null;
    Mn: number | string | null;
    Si: number | string | null;
    Cu: number | string | null;
    Al: number | string | null;
    Ti: number | string | null;
    V: number | string | null;
    Co: number | string | null;
    W: number | string | null;
    Nb: number | string | null;
    N: number | string | null;
    P: number | string | null;
    S: number | string | null;
    Mg: number | string | null;
    Zn: number | string | null;
    Sn: number | string | null;
    Be: number | string | null;
    Ta: number | string | null;
    La: number | string | null;
    Ce: number | string | null;
  }
  // Additional properties
  fatigue_strength?: number | null;
  impact_strength?: number | null;
  corrosion_resistance?: string | null;
  machinability?: string | null;
  weldability?: string | null;
  electrical_conductivity?: number | null;
  max_service_temp?: number | null;
  price_per_kg?: number | null;
  price_per_cm3?: number | null;
  elevated_temp?: Array<{ temp: number; ys?: number | null; uts?: number | null }>;
  heat_treatment?: string | null;
  source?: string | null;
  // ── range-based schema (v2 data pipeline) ──
  ranges?: Record<string, PropertyRange | null>;
  sources?: MaterialSource[];
  tier?: 'curated' | 'am_vendor' | 'generic' | 'reference';
  manufacturers?: string[];
  machines?: string[];
  processes?: string[];
  aliases?: string[];
  families?: string[];
  fatigue_estimated?: boolean;
  meta?: Record<string, unknown>;
}

/** A property aggregated across a material's data points (conditions/vendors/build directions). */
export interface PropertyRange {
  min: number;
  max: number;
  typical: number;
  n: number;
  estimated?: boolean;
}

/** A provenance entry — verified datasheet URL or honest generic reference. */
export interface MaterialSource {
  label: string;
  url: string | null;
  verified: boolean;
}

export interface PropertyMeta {
  key: keyof Material;
  label: string;
  unit: string;
  description: string;
  group: 'mechanical' | 'thermal' | 'physical' | 'chemical' | 'qualitative' | 'cost';
  min?: number;
  max?: number;
}

export const MECHANICAL_PROPERTIES: PropertyMeta[] = [
  { key: 'yield_strength', label: 'Yield Strength', unit: 'MPa', description: '0.2% offset yield strength', group: 'mechanical' },
  { key: 'uts', label: 'UTS', unit: 'MPa', description: 'Ultimate Tensile Strength', group: 'mechanical' },
  { key: 'elongation', label: 'Elongation', unit: '%', description: 'Elongation at break', group: 'mechanical' },
  { key: 'modulus', label: "Young's Modulus", unit: 'GPa', description: 'Elastic modulus', group: 'mechanical' },
  { key: 'hardness', label: 'Hardness', unit: 'HV', description: 'Vickers hardness', group: 'mechanical' },
  { key: 'fatigue_strength', label: 'Fatigue Strength', unit: 'MPa', description: 'Fatigue limit (R=-1)', group: 'mechanical' },
  { key: 'impact_strength', label: 'Impact Strength', unit: 'J', description: 'Charpy impact energy', group: 'mechanical' },
];

export const PHYSICAL_PROPERTIES: PropertyMeta[] = [
  { key: 'density', label: 'Density', unit: 'g/cm³', description: 'Mass density', group: 'physical' },
  { key: 'thermal_conductivity', label: 'Thermal Conductivity', unit: 'W/m·K', description: 'Thermal conductivity at RT', group: 'thermal' },
  { key: 'electrical_conductivity', label: 'Electrical Conductivity', unit: '%IACS', description: 'Electrical conductivity (% IACS), typical', group: 'physical' },
  { key: 'max_service_temp', label: 'Max Service Temp', unit: '°C', description: 'Max continuous service temperature, typical', group: 'thermal' },
];

export const COST_PROPERTIES: PropertyMeta[] = [
  { key: 'price_per_kg', label: 'Price (per kg)', unit: 'USD/kg', description: 'Approximate raw-material price', group: 'cost' },
  { key: 'price_per_cm3', label: 'Price (per cm³)', unit: 'USD/cm³', description: 'Approximate price per unit volume', group: 'cost' },
];

export const ALL_NUMERIC_PROPERTIES: PropertyMeta[] = [
  ...PHYSICAL_PROPERTIES,
  ...MECHANICAL_PROPERTIES,
  ...COST_PROPERTIES,
];

export const CHEMICAL_ELEMENTS: Array<{ key: string; label: string }> = [
  { key: 'C', label: 'C' }, { key: 'Fe', label: 'Fe' }, { key: 'Cr', label: 'Cr' },
  { key: 'Ni', label: 'Ni' }, { key: 'Mo', label: 'Mo' }, { key: 'Mn', label: 'Mn' },
  { key: 'Si', label: 'Si' }, { key: 'Cu', label: 'Cu' }, { key: 'Al', label: 'Al' },
  { key: 'Ti', label: 'Ti' }, { key: 'V', label: 'V' }, { key: 'Co', label: 'Co' },
  { key: 'W', label: 'W' }, { key: 'Nb', label: 'Nb' }, { key: 'N', label: 'N' },
  { key: 'P', label: 'P' }, { key: 'S', label: 'S' }, { key: 'Mg', label: 'Mg' },
  { key: 'Zn', label: 'Zn' }, { key: 'Sn', label: 'Sn' }, { key: 'Be', label: 'Be' },
  { key: 'Ta', label: 'Ta' }, { key: 'La', label: 'La' }, { key: 'Ce', label: 'Ce' },
  { key: 'O', label: 'O' },
];

export const COMPOSITION_OPTIONS: string[] = ['Fe', 'Al', 'Ni', 'Ti', 'Co', 'Cu', 'Mg', 'Mo', 'Nb', 'Ta', 'V', 'W', 'Be', 'Other'];

export const COMPOSITION_COLORS: Record<string, string> = {
  Fe: '#EF4444',
  Al: '#F59E0B',
  Ni: '#8B5CF6',
  Ti: '#06B6D4',
  Co: '#EC4899',
  Cu: '#D97706',
  Mg: '#14B8A6',
  Mo: '#6366F1',
  Nb: '#F43F5E',
  Ta: '#A855F7',
  V: '#0EA5E9',
  W: '#64748B',
  Be: '#10B981',
  Other: '#9CA3AF',
};

export const CATEGORY_COLORS: Record<string, string> = {
  Metal: '#00A3E0',
  Polymer: '#22C55E',
};

/**
 * Composition-based Material Family tree
 * Structure: { groupLabel, color, families: string[] }
 */
export interface FamilyGroup {
  label: string;
  color: string;
  families: string[];
}

export const FAMILY_TREE: FamilyGroup[] = [
  {
    label: 'Iron-based (Fe)',
    color: '#60a5fa',
    families: [
      'Carbon Steel',
      'Alloy Steel',
      'Tool Steel',
      'Maraging Steel',
      'Cast Iron',
      'Stainless Steel - Austenitic',
      'Stainless Steel - Ferritic/Martensitic',
    ],
  },
  {
    label: 'Aluminum-based (Al)',
    color: '#fbbf24',
    families: [
      'Aluminum - Pure/Other',
      'Aluminum - Cu Alloys (2xxx)',
      'Aluminum - Mn Alloys (3xxx)',
      'Aluminum - Mg Alloys (5xxx)',
      'Aluminum - Si Alloys (6xxx/7xxx)',
    ],
  },
  {
    label: 'Nickel-based (Ni)',
    color: '#a78bfa',
    families: [
      'Nickel Superalloy',
      'Nickel - Inconel Superalloy',
      'Nickel - Hastelloy',
      'Nickel - Other Superalloy',
    ],
  },
  {
    label: 'Titanium-based (Ti)',
    color: '#34d399',
    families: [
      'Titanium - Pure/Other',
    ],
  },
  {
    label: 'Cobalt-based (Co)',
    color: '#f472b6',
    families: [
      'Cobalt-Chrome Alloy',
    ],
  },
  {
    label: 'Copper-based (Cu)',
    color: '#fb923c',
    families: [
      'Copper - Pure/Other',
      'Copper - Brass (Cu-Zn)',
    ],
  },
  {
    label: 'Refractory & Specialty',
    color: '#94a3b8',
    families: [
      'Refractory Metal',
      'Beryllium Alloy',
      'Magnesium Alloy',
      'Zinc Alloy',
      'Controlled Expansion Alloy',
      'Shape Memory Alloy',
      'Metal - Other',
    ],
  },
  {
    label: 'Polymers',
    color: '#4ade80',
    families: [
      'Polymer - ABS (FDM)',
      'Polymer - PLA (FDM)',
      'Polymer - PETG (FDM)',
      'Polymer - Nylon (FDM/SLS)',
      'Polymer - Nylon GF (FDM)',
      'Polymer - PEEK (FDM)',
      'Polymer - PEEK GF (FDM)',
      'Polymer - PP (FDM)',
      'Polymer - PP GF (FDM)',
      'Polymer - PEI/ULTEM (FDM)',
      'Polymer - PES (FDM)',
      'Polymer - TPU (FDM)',
      'Polymer - Polyethylene',
      'Polymer - Polycarbonate',
      'Polymer - Polystyrene',
      'Polymer - PMMA (Acrylic)',
      'Polymer - Silicone Rubber',
      'Polymer - Epoxy/Thermoset Resin',
      'Polymer - Photopolymer Resin (SLA)',
      'Polymer - Acetal (POM)',
      'Polymer - PVC',
      'Polymer - PVDF',
      'Polymer - Polysulfone (PSU)',
      'Polymer - PPSU',
      'Polymer - ASA (FDM)',
      'Polymer - PEKK (FDM)',
      'Polymer - PTFE',
      'Polymer - PAI',
      'Polymer - Polyimide',
      'Polymer - PBT',
      'Polymer - LCP',
      'Polymer - ETFE',
      'Polymer - Carbon-Fiber Reinforced',
      'Polymer - Glass-Fiber Reinforced',
      'Polymer - PET',
      'Polymer - PCL',
      'Polymer - EVA',
      'Polymer - PVB',
      'Polymer - PBI',
    ],
  },
];

export const SUBCATEGORY_COLORS: Record<string, string> = {
  'Alloy Steel': '#3B82F6',
  'Stainless Steel - Austenitic': '#60A5FA',
  'Stainless Steel - Ferritic/Martensitic': '#93C5FD',
  'Aluminum - Cu Alloys (2xxx)': '#F59E0B',
  'Aluminum - Mn Alloys (3xxx)': '#FCD34D',
  'Aluminum - Mg Alloys (5xxx)': '#FDE68A',
  'Aluminum - Pure/Other': '#FEF3C7',
  'Titanium - Pure/Other': '#8B5CF6',
  'Nickel Superalloy': '#A78BFA',
  'Nickel - Inconel Superalloy': '#C4B5FD',
  'Nickel - Hastelloy': '#DDD6FE',
  'Cobalt-Chrome Alloy': '#EC4899',
  'Maraging Steel': '#F9A8D4',
  'Tool Steel': '#6B7280',
  'Carbon Steel': '#9CA3AF',
  'Refractory Metal': '#374151',
  'Copper - Pure/Other': '#D97706',
  'Copper - Brass (Cu-Zn)': '#B45309',
  'Magnesium Alloy': '#10B981',
  'Beryllium Alloy': '#34D399',
  'Polymer - ABS (FDM)': '#22C55E',
  'Polymer - Nylon (FDM/SLS)': '#4ADE80',
  'Polymer - PEEK (FDM)': '#86EFAC',
  'Polymer - PLA (FDM)': '#BBF7D0',
  'Polymer - PETG (FDM)': '#D1FAE5',
  'Polymer - PP (FDM)': '#A7F3D0',
  'Polymer - Nylon GF (FDM)': '#6EE7B7',
  'Polymer - PP GF (FDM)': '#34D399',
  'Polymer - Polyethylene': '#10B981',
  'Polymer - Epoxy/Thermoset Resin': '#059669',
};

export function formatValue(val: number | string | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string') return val;
  if (val === 0) return '0';
  return val.toFixed(decimals);
}

export function getPropertyRange(materials: Material[], key: keyof Material): [number, number] {
  const values = materials
    .map(m => m[key] as number)
    .filter(v => v !== null && v !== undefined && !isNaN(v) && v > 0);
  if (values.length === 0) return [0, 100];
  return [Math.min(...values), Math.max(...values)];
}

export function getUniqueValues(materials: Material[], key: keyof Material): string[] {
  const set = new Set<string>();
  materials.forEach(m => {
    const v = m[key];
    if (v !== null && v !== undefined && v !== '') set.add(String(v));
  });
  return Array.from(set).sort();
}
