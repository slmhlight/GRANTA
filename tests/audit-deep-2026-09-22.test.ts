/*
 * AUD-3 (2026-09-22) — 외부 감사 3차(심층 보강본)의 D01~D08 계약 게이트.
 * 각 it 은 보고서가 실증한 상태를 다시 만들면 실패한다. 수가 아니라 규칙을 고정한다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '@/lib/materials';
import { comparableOnHV, hardnessScale } from '@/lib/materials';
import { buildMaterialsCSV } from '@/lib/csv-export';
import { queryNeedsFullData, filterNeedsFullData, DEFAULT_FILTERS } from '@/lib/filter-state';
import { normFormula, fuzzyRank } from '@/lib/fuzzy-search';

const ROOT = process.cwd();
const ALL: Material[] = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'client/public/materials.json'), 'utf8'));
const SLIM: Array<Material & { hardness_scale?: string }> = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'client/public/materials/index.json'), 'utf8'));
type R = { typical?: number; min?: number; max?: number; confidence?: string; estimated?: boolean; provenance?: string; base_value?: number; factor?: number; condition?: string; model?: string; basis?: string; basis_source?: string; basis_note?: string; basis_verified?: string; min_spec_value?: number; min_spec_source?: string; near_min_spec?: boolean; scale?: string };
const rg = (m: Material, k: string): R | undefined => (m.ranges as Record<string, R | undefined> | undefined)?.[k];
const ranges = (m: Material) => Object.entries((m.ranges ?? {}) as Record<string, R | null>).filter(([, r]) => !!r) as Array<[string, R]>;

describe('AUD-3 D01 — 값을 덮으면 계보도 함께 바뀐다', () => {
  it('HT 계수식·σf 유도식 provenance 가 남아 있으면 그 값은 반드시 모델 필드를 갖는다', () => {
    const bad: string[] = [];
    for (const m of ALL) for (const [k, r] of ranges(m)) {
      const prov = String(r.provenance ?? '');
      if (!/×\s*HT:/.test(prov)) continue;
      const hasModel = typeof r.base_value === 'number' && typeof r.factor === 'number';
      if (!hasModel) bad.push(`${m.id} ${k}: "${prov.slice(0, 60)}" (conf ${r.confidence})`);
    }
    expect(bad.slice(0, 10), `모델 설명 없이 HT 계수식만 남은 값 ${bad.length}건 — override 가 값만 바꾸고 계보를 남겼다`).toEqual([]);
  });

  it('보고서 잔여 9건은 새 근거로 교체됐다 (옛 HT 계수식 흔적 0)', () => {
    const ids = ['C_0016', 'G_0013', 'G_0090', 'G_0092', 'G_0241', 'G_0280', 'R_0373_0', 'R_0381_0', 'R_0381_1'];
    for (const id of ids) {
      const m = ALL.find((x) => x.id === id)!;
      const r = rg(m, 'fatigue_strength')!;
      expect(r, id).toBeTruthy();
      expect(String(r.provenance ?? ''), `${id} — 옛 계수식이 남아 있다`).not.toMatch(/×\s*HT:/);
      expect(String(r.provenance ?? '').length, `${id} — 근거 문장이 비었다`).toBeGreaterThan(8);
    }
  });

  it('사용자 대면 provenance 에 개발 서사(mock 정정 등)가 새지 않는다', () => {
    const leak = ALL.flatMap((m) => ranges(m).filter(([, r]) => /mock/i.test(String(r.provenance ?? ''))).map(([k]) => `${m.id} ${k}`));
    expect(leak.slice(0, 8)).toEqual([]);
  });
});

describe('AUD-3 D02 — 로딩 상태에 따라 검색 결과가 갈리지 않는다', () => {
  it('수치 검색식은 전량 데이터를 요구한다 (slim 에는 대표값만 있고 상·하한이 없다)', () => {
    for (const q of ['cp>500', 'poisson>0.3', 'tmelt>1000', 'yield>500', 'cost<20', '밀도<5', 'hv>100']) {
      expect(queryNeedsFullData(q), q).toBe(true);
      expect(filterNeedsFullData({ ...DEFAULT_FILTERS, query: q }), `filterNeedsFullData: ${q}`).toBe(true);
    }
  });
  it('이름·텍스트 검색만이면 slim 으로 답할 수 있다', () => {
    for (const q of ['7075', '"Ti-6Al-4V"', 'inconel']) expect(queryNeedsFullData(q), q).toBe(false);
    expect(queryNeedsFullData('')).toBe(false);
    expect(queryNeedsFullData(undefined)).toBe(false);
  });
  it('spec: 질의도 샤드가 필요하다 (meta.specs 는 샤드 전용)', () => {
    expect(queryNeedsFullData('spec:AMS5662')).toBe(true);
  });
});

describe('AUD-3 D03 — 경도는 값과 척도를 함께 읽는다', () => {
  const hb = ALL.filter((m) => hardnessScale(m) !== 'HV' && rg(m, 'hardness')?.typical != null);

  it('환산표 밖 원 스케일 값이 실제로 있다 (검사 대상이 사라지면 게이트가 공회전)', () => {
    expect(hb.length).toBeGreaterThan(10);
    for (const m of hb) expect(['HB', 'HRB', 'HRC', 'Shore D']).toContain(hardnessScale(m));
  });
  it('slim 인덱스도 척도를 싣는다 (샤드 전에 HV 로 오해하지 않도록)', () => {
    const slimById = new Map(SLIM.map((s) => [s.id, s]));
    for (const m of hb) expect(slimById.get(m.id)?.hardness_scale, m.id).toBe(hardnessScale(m));
  });
  it('HV 축 비교에서 제외된다 (Ashby·수치 검색이 같은 판정을 쓴다)', () => {
    for (const m of hb) expect(comparableOnHV(m, 'hardness'), m.id).toBe(false);
    const hv = ALL.find((m) => hardnessScale(m) === 'HV' && rg(m, 'hardness')?.typical != null)!;
    expect(comparableOnHV(hv, 'hardness')).toBe(true);
    expect(comparableOnHV(hb[0], 'yield_strength'), '경도 외 물성은 척도 제한 없음').toBe(true);
  });
  it('CSV 는 값 옆에 척도 열을 둔다 — HB 값이 HV 열에 들어가지 않는다', () => {
    const csv = buildMaterialsCSV(hb.slice(0, 3));
    const header = csv.split('\n')[0].split(',');
    expect(header).toContain('Hardness');
    expect(header).toContain('Hardness Scale');
    expect(header).not.toContain('Hardness (HV)');
    const scaleIdx = header.indexOf('Hardness Scale');
    for (const row of csv.split('\n').slice(1)) expect(row.split(',')[scaleIdx]).not.toBe('HV');
  });
});

describe('AUD-3 D04 — 수치 근접으로 근거의 종류를 바꾸지 않는다', () => {
  it("basis='min_spec' 은 사람이 선언한 것만 (자동 ±2% 스탬프 없음)", () => {
    const declared = ALL.flatMap((m) => ranges(m).filter(([, r]) => r.basis === 'min_spec').map(([k, r]) => ({ id: m.id, k, r })));
    for (const d of declared) {
      /* 근거는 원문 대조 기록(spec-floor-declarations 의 std·note·verified) 또는 교정 인용 중 하나. */
      const hasDecl = !!(d.r.basis_source && d.r.basis_note && d.r.basis_verified);
      expect(hasDecl || /교정:/.test(String(d.r.provenance ?? '')), `${d.id} ${d.k} — 선언 근거가 없다`).toBe(true);
    }
    // 자동 스탬프였다면 100건 안팎이었다 — 선언분만 남는다
    expect(declared.length).toBeLessThan(40);
  });
  it('규격 최소값은 별도 축(min_spec_value·source)에 실리고, 근접은 near_min_spec 로만 표시된다', () => {
    const withMin = ALL.flatMap((m) => ranges(m).filter(([, r]) => r.min_spec_value != null).map(([k, r]) => ({ id: m.id, k, r })));
    expect(withMin.length).toBeGreaterThan(100);
    const bad = withMin.filter((x) => !x.r.min_spec_source || x.r.basis === 'min_spec');
    expect(bad.slice(0, 5).map((x) => `${x.id} ${x.k}`), '규격 최소값에 출처가 없거나 basis 와 겹친다').toEqual([]);
    const near = withMin.filter((x) => x.r.near_min_spec);
    expect(near.length).toBeGreaterThan(0);
    for (const n of near) expect(Math.abs((n.r.typical ?? 0) - (n.r.min_spec_value ?? 0)) <= (n.r.min_spec_value ?? 0) * 0.02, `${n.id} ${n.k}`).toBe(true);
  });
  it('보고서가 지목한 규격 불일치 2건이 규격 숫자로 교정됐다 (Ti Gr23 ELI 795 · X70 UTS 570)', () => {
    expect(rg(ALL.find((m) => m.id === 'R_0166_0')!, 'yield_strength')?.typical).toBe(795);
    expect(rg(ALL.find((m) => m.id === 'R_0428_0')!, 'uts')?.typical).toBe(570);
  });
});

describe('AUD-3 D05 — 규제 자료 부족을 통과로 처리하지 않는다', () => {
  it('Pb·Cd·Hg 가 하나도 기재되지 않은 재료는 rohs_compliant=null (판정 보류)', () => {
    const bad: string[] = [];
    for (const m of ALL) {
      const comp = m.composition as Record<string, unknown> | Array<[string, unknown]> | undefined;
      const keys = Array.isArray(comp) ? comp.map((c) => String(c[0])) : Object.keys(comp ?? {});
      const declared = keys.some((k) => /^(Pb|Cd|Hg)$/i.test(k));
      if (!declared && m.rohs_compliant === true) bad.push(m.id);
    }
    expect(bad.slice(0, 10), `자료 없이 '적합' 으로 표시된 재료 ${bad.length}건`).toEqual([]);
  });
  it('조성이 비어 있으면 판정하지 않는다 (G_0172 PEEK 포함)', () => {
    const peek = ALL.find((m) => m.id === 'G_0172')!;
    expect(peek.rohs_compliant).toBeNull();
    expect(peek.rohs_basis).toBe('no_regulated_element_data');
  });
  it('판정에는 근거(rohs_basis)가 함께 실린다', () => {
    const bad = ALL.filter((m) => !m.rohs_basis).map((m) => m.id);
    expect(bad.slice(0, 5)).toEqual([]);
    const yes = ALL.filter((m) => m.rohs_compliant === true);
    for (const m of yes.slice(0, 50)) expect(m.rohs_basis, m.id).toBe('declared_within_limits');
  });
});

describe('AUD-3 D06 — 분포점(points)과 표시 범위가 같은 이야기를 한다', () => {
  const PO = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];
  it('모든 point 가 선언된 범위 안에 있다 (1% 여유)', () => {
    const bad: string[] = [];
    for (const m of ALL) {
      const pts = (m as { points?: Array<Array<number | null>> }).points;
      if (!Array.isArray(pts) || !pts.length) continue;
      for (let i = 0; i < PO.length; i++) {
        const r = rg(m, PO[i]);
        if (!r || typeof r.min !== 'number' || typeof r.max !== 'number') continue;
        const eps = PO[i] === 'density' ? 0.02 : 0.5;
        const lo = r.min - Math.max(Math.abs(r.min) * 0.01, eps), hi = r.max + Math.max(Math.abs(r.max) * 0.01, eps);
        for (const row of pts) {
          const v = row?.[i];
          if (typeof v === 'number' && isFinite(v) && (v < lo || v > hi)) { bad.push(`${m.id} ${PO[i]}: point ${v} ∉ [${r.min}, ${r.max}]`); break; }
        }
      }
    }
    expect(bad.slice(0, 10), `분포점이 범위 밖 ${bad.length}건 — 표와 차트가 다른 값을 쓴다`).toEqual([]);
  });
  it('보고서 사례 — CPM 3V 밀도는 데이터시트 7.80, 4340 소둔 σy 점은 범위 안', () => {
    const cpm = ALL.find((m) => m.id === 'R_0120')!;
    expect(rg(cpm, 'density')?.typical).toBeCloseTo(7.8, 2);
    const a4340 = ALL.find((m) => m.id === 'R_0278_0')!;
    const ys = rg(a4340, 'yield_strength')!;
    const pt = (a4340 as { points?: number[][] }).points?.[0]?.[1];
    expect(typeof pt === 'number' && pt >= ys.min! && pt <= ys.max!).toBe(true);
  });
});

describe('AUD-3 D08 — 화학식 표기(아래첨자)가 검색을 가르지 않는다', () => {
  it('정규화: B₄C ↔ B4C · Al₂O₃ ↔ Al2O3 · Si₃N₄ ↔ Si3N4', () => {
    expect(normFormula('B₄C')).toBe('B4C');
    expect(normFormula('Al₂O₃')).toBe('Al2O3');
    expect(normFormula('Si₃N₄')).toBe('Si3N4');
    expect(normFormula('MgAl₂O₄')).toBe('MgAl2O4');
  });
  it('ASCII 질의가 아래첨자 이름을 찾는다 (반대 방향도)', () => {
    expect(fuzzyRank('boron carbide (b₄c)', 'b4c')).toBeGreaterThanOrEqual(0);
    expect(fuzzyRank('b4c-al mmc 20 wt%', 'b₄c')).toBeGreaterThanOrEqual(0);
    expect(fuzzyRank('alumina (al₂o₃, 99.5% pure)', 'al2o3')).toBeGreaterThanOrEqual(0);
  });
  it('배포 데이터의 아래첨자 재료가 ASCII 토큰으로 검색된다 (보고서 19 재료)', () => {
    const subs = ALL.filter((m) => /[₀-₉]/.test(m.name));
    expect(subs.length).toBeGreaterThan(10);
    const miss: string[] = [];
    for (const m of subs) {
      const ascii = normFormula(m.name);
      const tok = ascii.match(/\b[A-Z][a-z]?\d[A-Za-z\d]*\b/)?.[0];
      if (!tok) continue;
      if (fuzzyRank(m.name.toLowerCase(), tok.toLowerCase()) < 0) miss.push(`${m.id} ${m.name} ← ${tok}`);
    }
    expect(miss.slice(0, 10), `ASCII 표기로 자기 자신을 못 찾는 재료 ${miss.length}건`).toEqual([]);
  });
});
