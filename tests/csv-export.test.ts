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

/* AUD N03/F01 (2026-09-22) — CSV 는 화면과 같은 공용 리더(propValue)로 읽고, 단위계를 따른다. */
describe('buildMaterialsCSV — 공용 리더·단위계 (AUD N03/F01)', () => {
  it('평면값이 없고 ranges.typical 만 있어도(slim 인덱스) 값이 나온다 — B4C 밀도 2.66 · PMI 폼 항복 1.5', () => {
    const csv = buildMaterialsCSV([
      mk({ name: 'B4C-Al', density: undefined as any, ranges: { density: { min: 2.6, max: 2.7, typical: 2.66 } } as any }),
      mk({ name: 'PMI foam', yield_strength: undefined as any, ranges: { yield_strength: { min: 1, max: 2, typical: 1.5 } } as any }),
    ]);
    const header = csv.split('\n')[0].split(',');
    const r1 = csv.split('\n')[1].split(','), r2 = csv.split('\n')[2].split(',');
    expect(r1[header.indexOf('Density (g/cm³)')]).toBe('2.66');
    expect(r2[header.indexOf('Yield Strength (MPa)')]).toBe('1.5');
  });

  it('ranges.typical 이 평면값과 다르면 ranges 가 이긴다 (화면과 같은 값)', () => {
    const csv = buildMaterialsCSV([mk({ yield_strength: 999, ranges: { yield_strength: { min: 90, max: 110, typical: 100 } } as any })]);
    const header = csv.split('\n')[0].split(',');
    expect(csv.split('\n')[1].split(',')[header.indexOf('Yield Strength (MPa)')]).toBe('100');
  });

  it('imperial: 헤더 단위와 수치가 함께 바뀐다 — 100 MPa → 14.504 ksi · 200 GPa → 29.008 Msi · 7.8 g/cm³ → 0.2818 lb/in³', () => {
    const csv = buildMaterialsCSV([mk({ yield_strength: 100, modulus: 200, density: 7.8 })], { unitSystem: 'imperial' });
    const header = csv.split('\n')[0].split(',');
    const cells = csv.split('\n')[1].split(',');
    expect(header).toContain('Yield Strength (ksi)');
    expect(header).toContain('Modulus (Msi)');
    expect(header).toContain('Density (lb/in³)');
    expect(header).not.toContain('Yield Strength (MPa)');
    expect(Number(cells[header.indexOf('Yield Strength (ksi)')])).toBeCloseTo(14.504, 2);
    expect(Number(cells[header.indexOf('Modulus (Msi)')])).toBeCloseTo(29.008, 2);
    expect(Number(cells[header.indexOf('Density (lb/in³)')])).toBeCloseTo(0.2818, 3);
    // AUD-3 D03 — 경도는 값 열 + 척도 열 (환산표 밖 원 스케일 값이 HV 열에 섞이지 않도록)
    expect(header).toContain('Hardness');
    expect(header).toContain('Hardness Scale');
    expect(header).not.toContain('Hardness (HV)');
    expect(cells[header.indexOf('Hardness')]).toBe('180');
    expect(cells[header.indexOf('Hardness Scale')]).toBe('HV');
  });

  it('SI 기본값은 이전과 같은 헤더·수치 (왕복 보존)', () => {
    const csv = buildMaterialsCSV([mk({ yield_strength: 100 })]);
    const header = csv.split('\n')[0].split(',');
    expect(csv.split('\n')[1].split(',')[header.indexOf('Yield Strength (MPa)')]).toBe('100');
  });
});

/* AUD-3 D03/Q03 (2026-09-22) — 경도는 값과 척도를 함께, 행마다 ID 를 함께 내보낸다. */
describe('buildMaterialsCSV — 경도 척도·ID 열 (AUD-3 D03/Q03)', () => {
  const lines = (csv: string) => csv.split(String.fromCharCode(10));
  it('환산표 밖 원 스케일(HB) 값은 척도 열에 HB 로 나온다 — HV 열에 섞이지 않는다', () => {
    const csv = buildMaterialsCSV([
      mk({ name: 'AA 1050 — Annealed', hardness: 22, ranges: { hardness: { min: 22, max: 22, typical: 22, scale: 'HB' } } as any }),
      mk({ name: 'AISI 4140', hardness: 300, ranges: { hardness: { min: 280, max: 320, typical: 300 } } as any }),
    ]);
    const header = lines(csv)[0].split(',');
    const rows = lines(csv).slice(1).map((r) => r.split(','));
    expect(rows[0][header.indexOf('Hardness')]).toBe('22');
    expect(rows[0][header.indexOf('Hardness Scale')]).toBe('HB');
    expect(rows[1][header.indexOf('Hardness Scale')]).toBe('HV');
  });
  it('ID·Stable ID 열로 같은 이름의 다른 조건을 구분한다', () => {
    const csv = buildMaterialsCSV([mk({ id: 'R_0120', stable_id: 'MET-0942' } as any)]);
    const header = lines(csv)[0].split(',');
    const cells = lines(csv)[1].split(',');
    expect(cells[header.indexOf('ID')]).toBe('R_0120');
    expect(cells[header.indexOf('Stable ID')]).toBe('MET-0942');
  });
});
