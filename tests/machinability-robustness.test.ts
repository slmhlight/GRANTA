/*
 * R226i/A7 — 절삭성 판단 모듈 견고성 회귀 (실 데이터셋 전수).
 *
 * 목적: computeMachinability(금속 rating)·computePolymerMachinability(폴리머 정성)·machiningCostBand
 * 3 함수를 client/public/materials.json 전 재료에 실행해 (1) 카테고리 분리, (2) 오분류(가족 밖 rating),
 * (3) band 유효성, (4) 커버리지를 게이트. regex 우선순위·중간삽입으로 인한 silent 오분류를 CI 에서 차단.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { computeMachinability, computePolymerMachinability, machiningCostBand } from '../client/src/lib/welding-machinability';
import type { Material } from '../client/src/lib/materials';

const all: Material[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'client', 'public', 'materials.json'), 'utf8'));
const byCat = (c: string) => all.filter(m => m.category === c);
const metals = byCat('Metal');
const polymers = byCat('Polymer');

/* subcategory 키워드 → 절삭성 rating 의 가족-타당 범위 (1212=100 기준, Machining Data Handbook).
 * 넉넉하게 설정 — gross 오분류(예: stainless 가 free-machining 100, Ni superalloy 가 60)만 검출. */
const FAMILY_BAND: Array<[RegExp, [number, number]]> = [
  [/nickel superalloy/i, [5, 25]],
  [/cobalt/i, [5, 20]],
  [/titanium/i, [15, 35]],
  [/refractory/i, [5, 50]],       // W 8 · Mo 35 · Ta/Nb 45
  [/tool steel/i, [25, 50]],
  [/maraging/i, [40, 50]],
  [/stainless.*austenitic/i, [30, 50]],
  [/stainless.*duplex/i, [25, 40]],
  [/stainless.*ph/i, [30, 45]],
  [/stainless.*ferritic|martensitic/i, [30, 90]],  // 416 free-mach 85 · PH-라벨 혼입 grade ~35
  [/magnesium/i, [55, 95]],
  [/aluminum/i, [30, 95]],
  [/carbon steel|structural steel|spring steel|rail steel|pipeline steel|pressure vessel|hsla|high-strength low-alloy|microalloyed|shipbuilding|weathering|press-hardening|advanced high-strength/i, [30, 110]],
  [/alloy steel|case hardening|cr-mo|low-alloy|heat-resistant steel/i, [40, 75]],
  [/copper/i, [10, 110]],         // pure Cu 20 · brass free-mach 100+
];
const familyBand = (m: Material): [number, number] | null => {
  const key = m.subcategory || '';
  for (const [re, band] of FAMILY_BAND) if (re.test(key)) return band;
  return null;
};

describe('machinability robustness — 카테고리 분리 (하드 게이트)', () => {
  it('Polymer: metal-rating/costband=null, polymer 정성=non-null', () => {
    const bad = polymers.filter(m => computeMachinability(m) !== null
      || machiningCostBand((m as any).machining_cost_factor, m.category) !== null
      || computePolymerMachinability(m) === null);
    expect(bad.map(m => m.name)).toEqual([]);
  });
  it('Ceramic/Composite: 절삭성 카드 3함수 모두 null', () => {
    const bad = [...byCat('Ceramic'), ...byCat('Composite')].filter(m =>
      computeMachinability(m) !== null
      || machiningCostBand((m as any).machining_cost_factor, m.category) !== null
      || computePolymerMachinability(m) !== null);
    expect(bad.map(m => m.name)).toEqual([]);
  });
  it('Metal: polymer 정성 함수는 항상 null', () => {
    const bad = metals.filter(m => computePolymerMachinability(m) !== null);
    expect(bad.map(m => m.name)).toEqual([]);
  });
});

describe('machinability robustness — 금속 rating 유효성·오분류', () => {
  it('매칭된 금속 rating 은 1..110 범위', () => {
    const bad = metals.map(m => ({ m, r: computeMachinability(m) })).filter(x => x.r && (x.r.rating < 1 || x.r.rating > 110));
    expect(bad.map(x => `${x.m.name}=${x.r!.rating}`)).toEqual([]);
  });
  it('가족-타당 범위 밖 rating 없음 (gross 오분류 검출)', () => {
    const violations: string[] = [];
    for (const m of metals) {
      const r = computeMachinability(m);
      if (!r) continue;
      // 자유절삭 grade(303/416 등)는 가족 대비 의도적으로 쉬움 → 가족-band 예외
      if (/free.?machin|\b303\b|\b416\b/i.test(m.name)) continue;
      const band = familyBand(m);
      if (!band) continue;
      if (r.rating < band[0] || r.rating > band[1]) {
        violations.push(`${m.name} [${m.subcategory}] rating ${r.rating} ∉ [${band[0]},${band[1]}]`);
      }
    }
    if (violations.length) console.log('오분류 후보:\n' + violations.join('\n'));
    expect(violations).toEqual([]);
  });
});

describe('machinability robustness — 폴리머 정성 band 유효', () => {
  it('모든 폴리머 band ∈ {easy,normal,hard} + label 존재', () => {
    const bad = polymers.map(m => ({ m, p: computePolymerMachinability(m) }))
      .filter(x => !x.p || !['easy', 'normal', 'hard'].includes(x.p.band) || !x.p.label);
    expect(bad.map(x => x.m.name)).toEqual([]);
  });
});

/* R226i 회귀 앵커 — 감사가 잡은 실제 오분류가 재발하지 않도록 대표값 고정.
 * 측정치-토큰 충돌(1100°C→Al·1020°C→carbon)·m4(SCM4xx)·EN번호(430)·h13(PH13-8) 방어. */
describe('machinability 오분류 회귀 앵커 (R226i)', () => {
  const find = (rx: RegExp) => metals.find(m => rx.test(m.name));
  const rate = (m: Material | undefined) => (m ? computeMachinability(m)?.rating : undefined);
  const cases: Array<[string, RegExp, number]> = [
    ['Inconel 625 (Solution treated 1100°C → Ni superalloy 15, not Al 35)', /Inconel 625.*1100/, 15],
    ['AISI 305 (EN 1.4303 must not match ferritic 430 → austenitic 40)', /AISI 305\b/, 40],
    ['AISI 308 (→ austenitic 40)', /AISI 308\b/, 40],
    ['SCM430/4130 (m4 must not match tool steel → Cr-Mo 60)', /4130 \/ SCM430.*Anneal/, 60],
    ['SCM415 (→ Cr-Mo 60)', /SCM415.*Normalized/, 60],
    ['PH13-8 Mo (h13 must not match tool steel; PH → 35)', /PH13-8 Mo/, 35],
    ['D2 tool steel (1020°C must not match carbon steel → tool 35)', /D2 Tool Steel.*1020/, 35],
    ['Mo-La (→ molybdenum 35, not generic refractory 18)', /Mo-La.*1100/, 35],
  ];
  for (const [label, rx, expected] of cases) {
    it(label, () => {
      const m = find(rx);
      expect(m, `데이터에 매칭 재료 없음: ${rx}`).toBeTruthy();
      expect(rate(m)).toBe(expected);
    });
  }
});

/* 커버리지 리포트 (정보용 — 게이트 아님, null=안전한 갭). */
describe('machinability coverage (report)', () => {
  it('금속 매칭률·갭 subcategory 출력', () => {
    const matched = metals.filter(m => computeMachinability(m));
    const gaps: Record<string, number> = {};
    for (const m of metals) if (!computeMachinability(m)) gaps[m.subcategory || '?'] = (gaps[m.subcategory || '?'] || 0) + 1;
    console.log(`금속 매칭 ${matched.length}/${metals.length} (${(matched.length / metals.length * 100).toFixed(0)}%)`);
    console.log('갭 subcategory:', JSON.stringify(gaps, null, 0));
    expect(matched.length).toBeGreaterThan(0);
  });
});
