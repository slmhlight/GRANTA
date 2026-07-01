/*
 * R226f/축2a — 표준 min-spec 게이트.
 * 이름에 규격·grade 를 인용한 entry(적합성 주장)는 data/standard-min-specs.json 의 최소값을 충족해야 함.
 * A588 형 오염(σy 에 타 합금 값 오기 — in-range 라 anomaly 통과)을 "인용 표준만으로" 잡는 일반해.
 * golden-values 는 entry 별 bound, 이 게이트는 패턴 단위 — 표준 하나 추가로 매칭 entry 전부 커버.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const all: any[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'public', 'materials.json'), 'utf8'));
const table = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'standard-min-specs.json'), 'utf8'));
const V = (m: any, k: string) => m.ranges?.[k]?.typical;
const TOL = 0.98; // -2% (단위 반올림 허용)

describe('표준 min-spec 게이트 (축2a)', () => {
  for (const spec of table.specs as Array<{ pattern: string; std: string; min: Record<string, number> }>) {
    it(`${spec.std} — "${spec.pattern}" 인용 entry 는 min 충족`, () => {
      const matches = all.filter((m) => (m.name || '').includes(spec.pattern));
      expect(matches.length, `"${spec.pattern}" 매칭 entry (테이블 부패 방지)`).toBeGreaterThan(0);
      const bad: string[] = [];
      for (const m of matches) {
        for (const [prop, min] of Object.entries(spec.min)) {
          const v = V(m, prop);
          if (typeof v === 'number' && v < min * TOL) bad.push(`${m.name.slice(0, 45)}: ${prop}=${v} < min ${min}`);
        }
      }
      expect(bad).toEqual([]);
    });
  }
});
