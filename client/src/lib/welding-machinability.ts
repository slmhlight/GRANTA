/*
 * R67 — Welding (CET) + Machinability rating helpers.
 *
 * CET (Carbon Equivalent Thyssen, IIW Doc IX-1086-87):
 *   CET = C + (Mn + Mo)/10 + (Cr + Cu)/20 + Ni/40
 *   < 0.40  → no preheat
 *   0.40 - 0.60 → 100-200 °C preheat
 *   > 0.60  → high crack risk, careful procedure
 *
 * Machinability rating — AISI 1018 = 100% baseline.
 * Source: AISI · ASM Vol. 16 (Machining) · Vendor machining data.
 */

import type { Material } from './materials';

/* ───────── CET 계산 ───────── */

function pctOf(comp: any, el: string): number {
  const v = comp?.[el];
  if (v == null) return 0;
  if (v === 'balance') return 0; // balance 는 base 가정, CET 에 반영 안 함
  // 'min~max' 또는 '0.5' 또는 '≤0.08' 형식
  const s = String(v).replace(/[≤<]/g, '').trim();
  const match = s.match(/[\d.]+/g);
  if (!match) return 0;
  const nums = match.map(Number).filter(n => !isNaN(n));
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export interface CETResult {
  cet: number;
  band: 'low' | 'med' | 'high';
  label: string;          // KO 라벨
  preheat: string;        // 권장 pre-heat
  note: string;           // 한 줄 설명
}

export function computeCET(material: Material): CETResult | null {
  // Carbon steel · alloy steel · stainless · tool steel 만 CET 의미 있음. Al/Cu/Ti 합금은 skip.
  const cat = material.category || '';
  const sub = (material.subcategory || '').toLowerCase();
  if (cat !== 'Metal') return null;
  if (/aluminum|copper|titanium|magnesium|nickel super|cobalt|refractory/i.test(sub)) return null;

  const comp = material.composition || {};
  const C = pctOf(comp, 'C');
  const Mn = pctOf(comp, 'Mn');
  const Mo = pctOf(comp, 'Mo');
  const Cr = pctOf(comp, 'Cr');
  const Cu = pctOf(comp, 'Cu');
  const Ni = pctOf(comp, 'Ni');
  if (C === 0 && Mn === 0 && Cr === 0) return null; // 조성 없음

  const cet = C + (Mn + Mo) / 10 + (Cr + Cu) / 20 + Ni / 40;

  if (cet < 0.4) return {
    cet, band: 'low', label: '우수',
    preheat: 'Pre-heat 불요',
    note: 'CET < 0.40 — 일반 용접 절차로 균열 위험 낮음.',
  };
  if (cet < 0.6) return {
    cet, band: 'med', label: '주의',
    preheat: 'Pre-heat 100-200°C 권장',
    note: 'CET 0.40-0.60 — 두께·구속 조건 따라 hydrogen-induced cracking (HIC) 위험.',
  };
  return {
    cet, band: 'high', label: '위험',
    preheat: 'Pre-heat 200-300°C + post-weld heat treatment',
    note: 'CET > 0.60 — 균열 위험 高. 저수소 용접봉 + post-weld stress relief 필수.',
  };
}

/* ───────── Machinability rating ───────── */

export interface MachinabilityResult {
  rating: number;        // 0-110 (1018 = 100, 황동 일부 > 100)
  band: 'easy' | 'normal' | 'hard' | 'very_hard';
  label: string;
  note: string;
}

// Family pattern → typical rating. 가장 보편적인 alloy 들 우선 매핑.
const MACHINABILITY: Array<[RegExp, number]> = [
  [/free.?machining|leaded|12L14|11SMnPb|c36000|brass.*free/i, 100],
  [/brass|c[34]\d{4}/i, 80],
  [/aluminum.*1\d{3}|1100|1050/i, 90],
  [/aluminum.*6\d{3}|6061|6063|6082/i, 70],
  [/aluminum.*7\d{3}|7075|7050/i, 65],
  [/aluminum.*2\d{3}|2024|2219/i, 60],
  [/aluminum.*5\d{3}|5052|5083/i, 75],
  [/alsi10mg|alsi7mg|aluminum/i, 60],
  [/copper.*pure|ofhc|c11000|c10100/i, 70],
  [/copper.*cr.?zr|cucrzr/i, 55],
  [/1018|1020|carbon steel.*low|sae 10[12]\d/i, 100],
  [/4140|42crmo|42crmo4|scm440/i, 60],
  [/4340|sncm/i, 50],
  [/8620|9310|carburizing/i, 65],
  [/52100|100cr6|bearing steel/i, 40],
  [/maraging/i, 45],
  [/tool steel|d2|d3|h13|h11|m2|m4|skd|cpm/i, 35],
  [/stainless.*ferritic|409|430|439/i, 55],
  [/stainless.*martensitic|410|420|440/i, 45],
  [/stainless.*austenitic|304|316l?|309|310|321/i, 40],
  [/stainless.*ph|17-?4|15-?5|13-?8|custom 465/i, 35],
  [/stainless.*duplex|2205|2507/i, 30],
  [/nickel.*super|inconel 718|inconel 625|inconel 600|hastelloy|nimonic|waspaloy|udimet|rene|incoloy 800/i, 15],
  [/inconel 617|haynes 230|hastelloy x|haynes 282/i, 12],
  [/cobalt|stellite|cocrmo|l605|f-?75/i, 10],
  [/titanium.*pure|cp.?ti|ti grade [12]/i, 30],
  [/titanium|ti6al4v|ti-6al-4v|ti5-8-5/i, 22],
  [/refractory|tungsten|tantalum|niobium|molybdenum/i, 18],
];

export function computeMachinability(material: Material): MachinabilityResult | null {
  if (material.category !== 'Metal') return null;
  const key = `${material.subcategory || ''} ${material.name}`;
  for (const [rx, r] of MACHINABILITY) {
    if (rx.test(key)) {
      const band: MachinabilityResult['band'] =
        r >= 70 ? 'easy' : r >= 40 ? 'normal' : r >= 20 ? 'hard' : 'very_hard';
      const label = { easy: '우수', normal: '보통', hard: '어려움', very_hard: '매우 어려움' }[band];
      const note = {
        easy: '표준 절삭 — Carbide / HSS 공구, 절삭유 일반.',
        normal: 'Carbide 공구, 충분한 절삭유, 가공시간 ~1.5x.',
        hard: 'Coated carbide (TiAlN), 낮은 속도, 절삭시간 ~2.5x.',
        very_hard: 'CBN / ceramic 공구, 강력 절삭유 또는 cryo. 가공시간 4-8x.',
      }[band];
      return { rating: r, band, label, note };
    }
  }
  return null;
}
