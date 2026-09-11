/*
 * CSV Export Utilities
 * Exports materials to CSV format with support for both numeric and range-based composition
 */

import type { Material } from './materials';

/**
 * Escape CSV field values
 */
export function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV header row
 */
function generateCSVHeader(): string {
  const headers = [
    'Material Name',
    'Subcategory',
    'Category',
    'Process',
    'Manufacturer',
    'Density (g/cm³)',
    'Yield Strength (MPa)',
    'UTS (MPa)',
    'Elongation (%)',
    'Modulus (GPa)',
    'Hardness (HV)',
    'C', 'O', 'Fe', 'Cr', 'Ni', 'Mo', 'Mn', 'Si', 'Cu', 'Al', 'Ti', 'V', 'Co', 'W', 'Nb', 'N', 'P', 'S', 'Mg', 'Zn', 'Sn', 'Be', 'Ta', 'La', 'Ce',
  ];
  return headers.map(escapeCSVField).join(',');
}

/**
 * Convert material to CSV row
 * Handles both numeric dict and range list composition formats
 */
function materialToCSVRow(m: Material): string {
  // Helper to get composition value (handles both numeric dict and range list formats)
  const getCompositionValue = (element: string): string => {
    const comp = m.composition;
    
    // If composition is a range list format
    if (Array.isArray(comp)) {
      const found = comp.find(item => Array.isArray(item) && item[0] === element);
      return found ? (found[1] as string) : '';
    }
    
    // If composition is a numeric dict format
    if (typeof comp === 'object' && comp !== null) {
      /* 값은 숫자(%) 또는 범위 문자열("16.0~18.0", "≤2.0", "balance")로 온다 — CSV 는 문자열이다.
         예전에는 any 라 `value ?? ''` 가 숫자를 그대로 내보내도 타입이 통과했다. */
      const value = (comp as Record<string, unknown>)[element];
      return value == null ? '' : String(value);
    }
    
    return '';
  };
  
  const row = [
    m.name,
    m.subcategory,
    m.category,
    m.process,
    m.manufacturer,
    m.density ?? '',
    m.yield_strength ?? '',
    m.uts ?? '',
    m.elongation ?? '',
    m.modulus ?? '',
    m.hardness ?? '',
    getCompositionValue('C'),
    getCompositionValue('O'),
    getCompositionValue('Fe'),
    getCompositionValue('Cr'),
    getCompositionValue('Ni'),
    getCompositionValue('Mo'),
    getCompositionValue('Mn'),
    getCompositionValue('Si'),
    getCompositionValue('Cu'),
    getCompositionValue('Al'),
    getCompositionValue('Ti'),
    getCompositionValue('V'),
    getCompositionValue('Co'),
    getCompositionValue('W'),
    getCompositionValue('Nb'),
    getCompositionValue('N'),
    getCompositionValue('P'),
    getCompositionValue('S'),
    getCompositionValue('Mg'),
    getCompositionValue('Zn'),
    getCompositionValue('Sn'),
    getCompositionValue('Be'),
    getCompositionValue('Ta'),
    getCompositionValue('La'),
    getCompositionValue('Ce'),
  ];
  return row.map(escapeCSVField).join(',');
}

/**
 * Build the full CSV string (header + rows). Pure — no DOM/Blob, testable.
 */
export function buildMaterialsCSV(materials: Material[]): string {
  return [generateCSVHeader(), ...materials.map(materialToCSVRow)].join('\n');
}

/**
 * Export materials to CSV file
 */
export function exportMaterialsToCSV(
  materials: Material[],
  filename: string = 'am-materials.csv'
): void {
  if (materials.length === 0) {
    alert('No materials to export');
    return;
  }

  const csv = buildMaterialsCSV(materials);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate filename for CSV export with timestamp
 */
export function generateCSVFilename(): string {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0];
  return `am-materials-${timestamp}.csv`;
}
