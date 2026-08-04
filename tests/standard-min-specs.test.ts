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

/*
 * W2 재점검 — **거짓 인용** 게이트. floor 게이트만으로는 못 잡는 유형이 있다:
 * 패턴이 다른 합금까지 잡아도 그 합금이 더 강하면 min 은 통과한다. 그러나 인용은 틀린다
 * (실사고: "AISI 434"→AISI 4340 · "Ti Grade 1"→Gr11/Gr12 · "Ti Grade 2"→Gr23 ·
 *  "AISI 304L"→304LN · 템퍼명 "H900"→Custom 455 등 타 PH 합금).
 * 규칙: 한 패턴이 잡는 base 는 하나여야 한다. 같은 합금의 표기 변형만 예외로 등재한다.
 */
describe('min-spec 패턴 정밀도 — 한 패턴 = 한 합금 (거짓 인용 차단)', () => {
  /** 같은 합금인데 이름 표기가 갈린 경우만. 키=패턴, 값=사유. */
  const SAME_ALLOY: Record<string, string> = {
    'API 5L X65': 'X65 표기 변형(/ L450 PSL2 · PSL2) — 동일 grade',
    'API 5L X70': 'X70 표기 변형(/ L485 PSL2 · PSL2 · line pipe) — 동일 grade',
    'AMS 5662': 'IN718 STA 표기 변형(UNS 병기 vs 미병기) — 동일 규격·조건',
    'AISI 316L': '316L 표기 변형(AM · Wrought · / STS316L) — 동일 합금',
    'AISI 304L ': '304L 표기 변형(— · (Wrought) · / STS304L · / STS304 ULC) — 동일 합금',
    '254 SMO': 'S31254 표기 변형(AISI 접두 유무) — 동일 합금',
  };

  const baseOf = (m: any) => (m.name || '').split('—')[0].trim();

  it('패턴이 둘 이상의 base 를 잡으면 SAME_ALLOY 에 사유가 있어야 한다', () => {
    const bad: string[] = [];
    for (const spec of table.specs as Array<{ pattern: string; std: string }>) {
      const bases = [...new Set(all.filter((m) => (m.name || '').includes(spec.pattern)).map(baseOf))];
      if (bases.length > 1 && !SAME_ALLOY[spec.pattern]) {
        bad.push(`"${spec.pattern}" (${spec.std}) → ${bases.length} base: ${bases.join(' | ')}`);
      }
    }
    expect(bad, `패턴이 여러 합금을 잡는다 — 구분자를 넣어 좁히거나(예 "AISI 434 —"), 같은 합금의 표기 변형이면 SAME_ALLOY 에 사유 등재:\n${bad.join('\n')}`).toEqual([]);
  });

  it('SAME_ALLOY 예외는 stale 하지 않다 (실제로 다중 매칭 중)', () => {
    const stale: string[] = [];
    for (const [pattern, why] of Object.entries(SAME_ALLOY)) {
      const spec = (table.specs as Array<{ pattern: string }>).find((s) => s.pattern === pattern);
      if (!spec) { stale.push(`${pattern}: 패턴이 테이블에 없음`); continue; }
      const bases = new Set(all.filter((m) => (m.name || '').includes(pattern)).map(baseOf));
      if (bases.size <= 1) stale.push(`${pattern}: 더는 다중 매칭 아님 — 예외 삭제 가능`);
      expect(why.length, `${pattern}: 사유가 너무 짧다`).toBeGreaterThan(10);
    }
    expect(stale, stale.join('\n')).toEqual([]);
  });
});
