/*
 * AUD F02 (2026-09-22) — 경도 환산 (ASTM E140-12b 근사 환산표). SSOT 는 data/hardness-conversion-e140.json 이고
 * 빌드 쪽 scripts/lib/hardness-convert.mjs 와 같은 표·같은 규칙(표 안 선형 보간, 표 밖 null)을 쓴다 —
 * 두 구현은 tests/hardness-convert.test.ts 가 같은 앵커(HRC 30↔HV 302 등)로 함께 묶는다.
 *
 * 이전 계산기의 (HRC/23.5)^1.7×50+100 은 출처가 없었고 HRC 30 → HV 176 을 냈다(E140: 302). 표만 쓴다.
 */
import e140 from '../../../data/hardness-conversion-e140.json';

type Row = (number | null)[];
interface Table { columns: string[]; rows: Row[] }
const E140 = e140 as unknown as {
  steel: { hrc: Table; hrb: Table };
  aluminum: Table;
  brass: Table;
};

/** [x,y] 쌍에서 선형 보간 — x 가 표 밖이면 null(외삽 금지). */
export function interpPairs(pairs: (number | null)[][], x: number): number | null {
  const pts = pairs.filter((p): p is number[] => typeof p[0] === 'number' && typeof p[1] === 'number').sort((p, q) => p[0] - q[0]);
  if (!pts.length || !Number.isFinite(x)) return null;
  if (x < pts[0][0] || x > pts[pts.length - 1][0]) return null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (x >= x0 && x <= x1) return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

const col = (t: Table, name: string) => t.columns.indexOf(name);
const pairsOf = (t: Table, xName: string, yName: string): (number | null)[][] => {
  const xi = col(t, xName), yi = col(t, yName);
  return t.rows.map((r) => [r[xi], r[yi]]);
};
const flip = (pairs: (number | null)[][]) => pairs.map(([a, b]) => [b, a]);

/* 강(비오스테나이트): Table 1(HRC) + Table 2(HRB). 겹침 구간(HV 210~238)은 두 표를 잇는다 — mjs 와 동일 규칙. */
const T2_CUT = 210;
const hrbPart = (y: string) => pairsOf(E140.steel.hrb, 'HV', y).filter(([hv]) => typeof hv === 'number' && hv <= T2_CUT);
const STEEL_HV_HRC = pairsOf(E140.steel.hrc, 'HV', 'HRC');
const STEEL_HV_HB = [...pairsOf(E140.steel.hrc, 'HV', 'HB3000'), ...hrbPart('HB3000')];
const STEEL_HV_KSI = [...pairsOf(E140.steel.hrc, 'HV', 'ksi'), ...hrbPart('ksi')];
const STEEL_HV_HRB = pairsOf(E140.steel.hrb, 'HV', 'HRB');

export const STEEL_HV_RANGE = { min: 107, max: 940 } as const;   // Table 2 하한(HRB 60) ~ Table 1 상한(HRC 68)
export const STEEL_HRC_RANGE = { min: 20, max: 68 } as const;
export const STEEL_HRB_RANGE = { min: 60, max: 100 } as const;

export interface SteelHardness { HV: number | null; HRC: number | null; HRB: number | null; HB: number | null; UTS: number | null }

/** 강 경도 한 값 → 다른 스케일 + 인장강도 근사(E140 ksi 열 × 6.895). 표 밖은 null. */
export function steelHardness(scale: 'HV' | 'HRC' | 'HRB' | 'HB', value: number): SteelHardness {
  let HV: number | null = null;
  if (scale === 'HV') HV = value;
  else if (scale === 'HRC') HV = interpPairs(flip(STEEL_HV_HRC), value);
  else if (scale === 'HRB') HV = interpPairs(flip(STEEL_HV_HRB), value);
  else if (scale === 'HB') HV = interpPairs(flip(STEEL_HV_HB), value);
  const none = { HV: null, HRC: null, HRB: null, HB: null, UTS: null };
  if (HV == null || !(HV >= STEEL_HV_RANGE.min && HV <= STEEL_HV_RANGE.max)) return none;
  const ksi = interpPairs(STEEL_HV_KSI, HV);
  return {
    HV,
    HRC: interpPairs(STEEL_HV_HRC, HV),
    HRB: interpPairs(STEEL_HV_HRB, HV),
    HB: interpPairs(STEEL_HV_HB, HV),
    UTS: ksi == null ? null : ksi * 6.894757,
  };
}

/* 단조 알루미늄 (Table 9) · 70/30 황동 (Table 4) — 데이터 표시·교정 참조용. */
export const alHvFromHB500 = (hb: number) => interpPairs(pairsOf(E140.aluminum, 'HB500', 'HV'), hb);
export const brassHvFromHRB = (hrb: number) => interpPairs(pairsOf(E140.brass, 'HRB', 'HV'), hrb);
