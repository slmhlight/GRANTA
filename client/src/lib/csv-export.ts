/*
 * CSV Export Utilities
 * Exports materials to CSV format with support for both numeric and range-based composition
 *
 * AUD N03/F01 (2026-09-22) — 값은 화면과 같은 공용 리더(propValue: ranges.typical → 평면값)로 읽고,
 * 단위계(SI/Imperial)를 받아 헤더 단위와 수치를 함께 바꾼다. 이전에는 `m.density ?? ''` 처럼 평면값을 직접
 * 읽어 slim 인덱스만 있는 재료(B4C 밀도 2.66/2.67 · PMI 폼 항복 1.5)가 빈칸이 됐고, IMP 를 골라도 CSV 만 SI 였다.
 */

import type { Material } from './materials';
import { propValue, hardnessScale } from './materials';
import { convertToImperial, unitLabel, type UnitSystem } from './unit-convert';

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

/** 내보내는 수치 물성 — 순서가 곧 열 순서. 라벨은 단위 없이, 단위는 단위계에서 붙인다. */
export const CSV_NUMERIC_COLUMNS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'density', label: 'Density' },
  { key: 'yield_strength', label: 'Yield Strength' },
  { key: 'uts', label: 'UTS' },
  { key: 'elongation', label: 'Elongation' },
  { key: 'modulus', label: 'Modulus' },
  /* AUD-3 D03 (2026-09-22) — 경도는 헤더가 'Hardness (HV)' 로 고정돼 있어, 환산표 밖이라 원 스케일로 남긴 HB 값 20 건이
     HV 열에 그대로 들어갔다(AA 1050 소둔 22 HB → 22 HV). 값 열의 단위 표기를 빼고 바로 옆에 척도 열을 둔다. */
  { key: 'hardness', label: 'Hardness' },
];
/** 경도 값 열 바로 뒤에 붙는 척도 열 — 값과 척도를 함께 읽게 한다. */
const HARDNESS_SCALE_COLUMN = 'Hardness Scale';

const COMPOSITION_ELEMENTS = ['C', 'O', 'Fe', 'Cr', 'Ni', 'Mo', 'Mn', 'Si', 'Cu', 'Al', 'Ti', 'V', 'Co', 'W', 'Nb', 'N', 'P', 'S', 'Mg', 'Zn', 'Sn', 'Be', 'Ta', 'La', 'Ce'];

export interface CSVOptions {
  /** 단위계 — 'imperial' 이면 수치·헤더 단위를 영미식으로 (값 SSOT 는 SI, 변환은 unit-convert 와 동일 계수). */
  unitSystem?: UnitSystem;
}

/**
 * Generate CSV header row — 단위는 현재 단위계의 라벨 (Density (g/cm³) / Density (lb/in³)).
 */
export function generateCSVHeader(sys: UnitSystem = 'si'): string {
  const headers = [
    'Material Name',
    /* AUD-3 Q03 — 같은 이름의 다른 조건·다른 배포를 구분할 수 있도록 ID 를 함께 내보낸다. */
    'ID',
    'Stable ID',
    'Subcategory',
    'Category',
    'Process',
    'Manufacturer',
    ...CSV_NUMERIC_COLUMNS.flatMap(({ key, label }) => (key === 'hardness'
      ? ['Hardness', HARDNESS_SCALE_COLUMN]                 // 단위는 행마다 다르다 → 별도 열
      : [`${label} (${unitLabel(key, sys)})`])),
    ...COMPOSITION_ELEMENTS,
  ];
  return headers.map(escapeCSVField).join(',');
}

/** 수치 한 칸 — 공용 리더로 읽고 단위계로 변환. 영미식은 유효숫자 5자리로 (0.28105 lb/in³). */
export function csvNumber(m: Material, key: string, sys: UnitSystem): number | '' {
  const v = propValue(m, key);
  if (v == null) return '';
  if (sys !== 'imperial') return v;
  const c = convertToImperial(key, v);
  return c == null ? '' : +c.toPrecision(5);
}

/**
 * Convert material to CSV row
 * Handles both numeric dict and range list composition formats
 */
function materialToCSVRow(m: Material, sys: UnitSystem): string {
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

  const row: unknown[] = [
    m.name,
    m.id,
    (m as { stable_id?: string }).stable_id ?? '',
    m.subcategory,
    m.category,
    m.process,
    m.manufacturer,
    ...CSV_NUMERIC_COLUMNS.flatMap(({ key }) => (key === 'hardness'
      ? [csvNumber(m, key, sys), hardnessScale(m)]
      : [csvNumber(m, key, sys)])),
    ...COMPOSITION_ELEMENTS.map(getCompositionValue),
  ];
  return row.map(escapeCSVField).join(',');
}

/**
 * Build the full CSV string (header + rows). Pure — no DOM/Blob, testable.
 */
export function buildMaterialsCSV(materials: Material[], opts: CSVOptions = {}): string {
  const sys = opts.unitSystem ?? 'si';
  return [generateCSVHeader(sys), ...materials.map((m) => materialToCSVRow(m, sys))].join('\n');
}

/**
 * Export materials to CSV file
 */
export function exportMaterialsToCSV(
  materials: Material[],
  filename: string = 'am-materials.csv',
  opts: CSVOptions = {},
): void {
  if (materials.length === 0) {
    alert('No materials to export');
    return;
  }

  const csv = buildMaterialsCSV(materials, opts);

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
export function generateCSVFilename(sys: UnitSystem = 'si'): string {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0];
  return `am-materials-${timestamp}${sys === 'imperial' ? '-imperial' : ''}.csv`;
}
