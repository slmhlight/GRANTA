/*
 * R226e/D1 — golden-values 회귀. 인기·대표 합금의 표준 σy/UTS/밀도를 고정, 빌드 산출(materials.json)과 대조.
 *
 * A588 형 in-range 오염(σy 를 다른 합금 값으로 오기 — anomaly 검출은 통과) 방어. bound 는 표준값 중심 ±수%
 * (정상 조건 변동은 허용, 그러나 다른 합금 값으로 바뀌는 gross 오류는 검출). 조건별 편차는 ht 로 좁힘.
 * client/public/materials.json 은 CI 가 test 전 build:data 로 생성(ci.yml).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const all: any[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'client', 'public', 'materials.json'), 'utf8'));
const V = (m: any, k: string) => m.ranges?.[k]?.typical;

type G = { name: string; ht?: string; y?: [number, number]; u?: [number, number]; d?: [number, number]; yMax?: number };
const GOLDEN: G[] = [
  { name: 'A588 Grade A', y: [330, 360], u: [475, 510], d: [7.75, 7.95] },   // ← A588 오염 방어 (σy 250 오기 재발 차단)
  { name: 'ASTM A36', y: [235, 270], d: [7.75, 7.95] },
  { name: 'ASTM A572 Grade 50', y: [335, 360] },
  { name: 'A516 Grade 70', y: [250, 275], u: [478, 510] },
  { name: 'AA 6061', ht: 'T6', y: [260, 290], u: [298, 325], d: [2.65, 2.75] },
  { name: 'AA 7075', ht: 'T6', y: [470, 540], u: [545, 600] },
  { name: 'AA 2024 ', ht: 'T3', y: [325, 360], u: [465, 500], d: [2.72, 2.85] },
  { name: 'AA 5052', ht: 'Anneal', y: [75, 110], u: [180, 215] },
  { name: 'Ti-6Al-4V', ht: 'Anneal', y: [850, 1050], d: [4.35, 4.5] },
  { name: 'AISI 304 ', ht: 'Anneal', y: [185, 225], u: [490, 560], d: [7.9, 8.05] },
  { name: 'AISI 316 ', ht: 'Anneal', y: [185, 225], u: [490, 560] },
  { name: '17-4 PH', ht: 'H900', y: [1120, 1230], u: [1270, 1360], d: [7.7, 7.85] },
  { name: 'C11000', y: [55, 90], u: [200, 240], d: [8.85, 8.98] },
  { name: 'AISI 1045', y: [490, 570], d: [7.75, 7.95] },
  { name: 'Ti Grade 2', ht: 'Anneal', y: [255, 320], u: [340, 400], d: [4.4, 4.6] },
  { name: 'Inconel 718', d: [8.1, 8.3], yMax: 1000 },       // aged 조건 σy ≥ 1000 존재
  { name: 'Inconel 625', d: [8.35, 8.5] },
  { name: 'Maraging 300', d: [7.95, 8.2], yMax: 1700 },     // aged 조건 σy ≥ 1700 존재
];

describe('golden-values 회귀 (D1) — 표준값 대조', () => {
  for (const g of GOLDEN) {
    it(`${g.name.trim()}${g.ht ? ' [' + g.ht + ']' : ''}`, () => {
      const matches = all.filter((m) => (m.name || '').includes(g.name) && (!g.ht || (m.heat_treatment || '').toLowerCase().includes(g.ht.toLowerCase())));
      expect(matches.length, `${g.name} 매칭 entry`).toBeGreaterThan(0);
      const inR = (v: any, r?: [number, number]) => !r || (typeof v === 'number' && v >= r[0] && v <= r[1]);
      if (g.y || g.u || g.d) {
        const ok = matches.some((m) => inR(V(m, 'yield_strength'), g.y) && inR(V(m, 'uts'), g.u) && inR(V(m, 'density'), g.d));
        const seen = matches.slice(0, 3).map((m) => `σy${V(m, 'yield_strength')}/uts${V(m, 'uts')}/ρ${V(m, 'density')}`).join(' , ');
        expect(ok, `${g.name}: 표준 범위 만족 조건 없음 (실제 ${seen})`).toBe(true);
      }
      if (g.yMax != null) {
        const maxY = Math.max(...matches.map((m) => V(m, 'yield_strength') || 0));
        expect(maxY, `${g.name}: max σy`).toBeGreaterThanOrEqual(g.yMax);
      }
    });
  }
});
