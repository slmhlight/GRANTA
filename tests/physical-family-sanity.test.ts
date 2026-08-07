/*
 * A11 — 계열 오상속 영구 게이트.
 *
 * 배경: 물성 계열 typical 이 이름 문자열로 배정되는 구간(build-materials.mjs, 백로그 A9 미전환)에서
 *   엉뚱한 계열 값이 통째로 상속되는 사고가 반복됐다. 실제로 발견된 것:
 *     · CP Ti Grade 1/3/4/7 · Inconel 100 · C12000 · Zirconium → **알루미늄** 물성(CTE 23·비열 900·융점 650)
 *       원인: 조성의 주원소가 "balance" 문자열이라 숫자 비교에서 탈락 → 계열 태깅이 엉뚱한 원소를 집음
 *     · AISI H21(Cr-W 공구강) · Ta-2.5W → **순수 텅스텐** 물성(융점 3410·CTE 4.5·비열 135)
 *       원인: 이름의 설명어("Hot-Work Tungsten tool", "tantalum-tungsten alloy")가 tungsten 키에 부분문자열 매칭
 *     · 22MnB5 · SA508 → **오스테나이트계 스테인리스** 물성(Tmax 870·CTE 17)
 *       원인: 조건 문자열 "Austenitized" 가 /austenit/ 에 매칭
 *
 * 이 사고들의 공통점은 "이름을 보고 계열을 정한다"이고, 공통 증상은
 * **원소 계열의 물리 밴드를 벗어난 값**이다. 매처를 흉내내지 않고 증상을 직접 막는다.
 *
 * 밴드는 '물리적으로 가능한 범위'로 넉넉히 잡는다 — 정밀도 게이트가 아니라 오상속 게이트다.
 * 밴드를 좁혀 정확도를 강제하는 것은 golden-values 의 역할.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Range = { typical?: number | null };
type Mat = {
  id: string; name: string; category: string; subcategory?: string;
  ranges?: Record<string, Range | undefined>;
};

const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
const ALL: Mat[] = Array.isArray(raw) ? raw : raw.materials;
const METALS = ALL.filter((m) => m.category === 'Metal');

const val = (m: Mat, p: string): number | null => {
  const v = m.ranges?.[p]?.typical;
  return typeof v === 'number' && isFinite(v) ? v : null;
};

/* subcategory → 원소 계열. 먼저 매칭되는 것을 쓴다(순서 유의: Cobalt 가 Chrome 보다 앞). */
const FAMILY: Array<[RegExp, string]> = [
  [/Titanium/i, 'Ti'],
  [/Nickel|Superalloy/i, 'Ni'],
  [/Cobalt/i, 'Co'],
  [/Aluminum/i, 'Al'],
  [/Copper|Brass|Bronze/i, 'Cu'],
  [/Magnesium/i, 'Mg'],
  [/Zinc/i, 'Zn'],
  [/Refractory|Zirconium/i, 'Refractory'],
  [/Beryllium/i, 'Be'],
  [/Steel|Iron/i, 'Fe'],
];

/* 물리적으로 가능한 범위 (min, max). null = 검사 안 함. */
const BAND: Record<string, { melt: [number, number]; cte: [number, number]; cp: [number, number] }> = {
  Ti: { melt: [1500, 1750], cte: [6, 12], cp: [440, 700] },
  Ni: { melt: [1200, 1500], cte: [9, 18], cp: [350, 600] },
  Co: { melt: [1200, 1520], cte: [10, 18], cp: [350, 560] },
  Al: { melt: [450, 700], cte: [18, 27], cp: [800, 1050] },
  /* Cu 융점 상한이 순동(1085)이 아니라 1300 인 이유: 백동(Cu-Ni 70/30, C71500)은 Ni 이
     융점을 올려 1170~1240°C 다. 밴드를 좁히면 정상 합금이 걸린다 — 실제로 걸려서 넓혔다. */
  Cu: { melt: [800, 1300], cte: [14, 22], cp: [340, 450] },
  Mg: { melt: [400, 680], cte: [23, 30], cp: [900, 1150] },
  Zn: { melt: [350, 500], cte: [22, 36], cp: [370, 450] },
  Be: { melt: [1200, 1350], cte: [10, 15], cp: [1700, 2000] },
  Refractory: { melt: [1700, 3500], cte: [3, 9], cp: [120, 300] },
  Fe: { melt: [1150, 1600], cte: [8, 21], cp: [400, 560] },
};

const famOf = (m: Mat): string | null => {
  const s = m.subcategory || '';
  for (const [re, f] of FAMILY) if (re.test(s)) return f;
  return null;
};

describe('A11 — 원소 계열 물리 밴드 (계열 오상속 차단)', () => {
  const PROPS: Array<[string, 'melt' | 'cte' | 'cp', string]> = [
    ['melting_point', 'melt', '융점'],
    ['thermal_expansion', 'cte', '선팽창'],
    ['specific_heat', 'cp', '비열'],
  ];

  for (const [prop, key, label] of PROPS) {
    it(`${label}(${prop}) 이 소속 원소 계열 밴드 안에 있다`, () => {
      const bad: string[] = [];
      for (const m of METALS) {
        const fam = famOf(m);
        if (!fam) continue;
        const v = val(m, prop);
        if (v == null) continue;
        const [lo, hi] = BAND[fam][key];
        if (v < lo || v > hi) bad.push(`${m.id} ${m.name.slice(0, 46)} [${m.subcategory}] → ${fam} 계열 ${label} ${v} ∉ [${lo}, ${hi}]`);
      }
      expect(bad, `계열 밖 ${label} ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
    });
  }

  it('상용 최고온도가 융점을 넘지 않는다 (동족온도 0.95 상한)', () => {
    const bad: string[] = [];
    for (const m of METALS) {
      const t = val(m, 'max_service_temp');
      const mp = val(m, 'melting_point');
      if (t == null || mp == null) continue;
      const h = (t + 273) / (mp + 273);
      if (h > 0.95) bad.push(`${m.id} ${m.name.slice(0, 46)} Tmax ${t} / 융점 ${mp} = ${h.toFixed(2)}`);
    }
    expect(bad, `융점에 근접·초과한 상용온도 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('같은 합금(base)의 조건들이 같은 융점을 갖는다 — 조건이 계열을 바꾸면 안 된다', () => {
    /* 융점은 조건(열처리·가공)에 무관한 합금 고유값이다. 조건마다 다르면
       조건 문자열이 계열 판정에 샜다는 뜻 — 22MnB5·SA508 이 이 증상으로 발견됐다. */
    const byBase = new Map<string, Map<number, string[]>>();
    for (const m of METALS) {
      const mp = val(m, 'melting_point');
      if (mp == null) continue;
      const base = String(m.name).split(/\s+—\s+/)[0].trim();
      if (!byBase.has(base)) byBase.set(base, new Map());
      const g = byBase.get(base)!;
      if (!g.has(mp)) g.set(mp, []);
      g.get(mp)!.push(m.id);
    }
    const bad: string[] = [];
    for (const [base, g] of byBase) {
      if (g.size < 2) continue;
      const vals = [...g.keys()].sort((a, b) => a - b);
      /* 5% 이내 차이는 소스 정밀도 차이로 허용, 그 이상은 계열이 갈린 것 */
      if ((vals[vals.length - 1] - vals[0]) / vals[0] > 0.05)
        bad.push(`${base.slice(0, 52)} → 융점 ${vals.join(' / ')}`);
    }
    expect(bad, `조건별로 융점이 갈리는 합금 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});
