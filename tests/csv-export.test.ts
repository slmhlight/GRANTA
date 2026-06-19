/*
 * R210 B3 — csv-export 순수 빌더 테스트 (escape + 두 조성 포맷).
 */
import { describe, it, expect } from 'vitest';
import { escapeCSVField, buildMaterialsCSV } from '@/lib/csv-export';
import type { Material } from '@/lib/materials';

describe('escapeCSVField', () => {
  it('콤마/따옴표/개행 포함 시 따옴표로 감싸고 내부 따옴표를 이중화', () => {
    expect(escapeCSVField('a,b')).toBe('"a,b"');
    expect(escapeCSVField('he said "hi"')).toBe('"he said ""hi"""');
    expect(escapeCSVField('line1\nline2')).toBe('"line1\nline2"');
  });
  it('특수문자 없으면 그대로, null/undefined 는 빈 문자열', () => {
    expect(escapeCSVField('plain')).toBe('plain');
    expect(escapeCSVField(null)).toBe('');
    expect(escapeCSVField(undefined)).toBe('');
    expect(escapeCSVField(42)).toBe('42');
  });
});

function mk(over: Partial<Material>): Material {
  return {
    id: 'x', name: 'X', subcategory: 'Sub', category: 'Metal', process: 'Wrought',
    manufacturer: 'M', density: 7.8, yield_strength: 400, uts: 600, elongation: 18,
    modulus: 200, hardness: 180, composition: {}, ranges: {},
    ...over,
  } as unknown as Material;
}

describe('buildMaterialsCSV', () => {
  it('헤더 + 행, 콤마 포함 이름 이스케이프', () => {
    const csv = buildMaterialsCSV([mk({ name: 'Steel, 4340' })]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Material Name');
    expect(lines[0]).toContain('Density (g/cm³)');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"Steel, 4340"');
  });

  it('numeric dict 조성에서 원소값 추출', () => {
    const csv = buildMaterialsCSV([mk({ composition: { Cr: 18, Ni: 8 } as any })]);
    const cells = csv.split('\n')[1].split(',');
    // 헤더 순서: ... Hardness(11번째,idx10), 그다음 C,O,Fe,Cr,Ni,...
    const header = csv.split('\n')[0].split(',');
    const crIdx = header.indexOf('Cr');
    const niIdx = header.indexOf('Ni');
    expect(cells[crIdx]).toBe('18');
    expect(cells[niIdx]).toBe('8');
  });

  it('range-list 조성 포맷도 동일 행 생성', () => {
    const csv = buildMaterialsCSV([mk({ composition: [['Cr', '16-18'], ['Ni', '10-14']] as any })]);
    const header = csv.split('\n')[0].split(',');
    const cells = csv.split('\n')[1].split(',');
    const crIdx = header.indexOf('Cr');
    // '16-18' 에 콤마 없으니 그대로
    expect(cells[crIdx]).toBe('16-18');
  });

  it('빈 셀 처리 (없는 원소·null 물성)', () => {
    const csv = buildMaterialsCSV([mk({ hardness: null as any, composition: {} as any })]);
    const header = csv.split('\n')[0].split(',');
    const cells = csv.split('\n')[1].split(',');
    expect(cells[header.indexOf('W')]).toBe(''); // 미존재 원소
  });
});
