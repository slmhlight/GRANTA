/*
 * E4 (H6 W4-1) — 규격 하한(basis='min_spec') 표기 게이트.
 *
 * 배경: min-spec 파이프(A2)가 116 range 에 "이 값은 규격 보증 최소값" 이라고 스탬프하는데,
 * UI 는 그 스탬프를 읽지 않고 **다른 필드**(min_spec_value, 47건)만 렌더하고 있었다.
 * 두 필드는 교집합이 0 이라, 116건은 표기 없이 평균값 행과 나란히 놓여 있었다 —
 * 같은 표에서 어떤 행은 평균이고 어떤 행은 하한이면 재료 간 비교가 성립하지 않는다.
 *
 * 이 게이트가 지키는 것: floor 로 표시된 값은 **반드시 근거를 댈 수 있어야 한다**.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Range = { typical?: number; basis?: string; basis_source?: string; provenance?: string };
type Mat = { id: string; stable_id?: string; name: string; ranges?: Record<string, Range | undefined> };

const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
const ALL: Mat[] = Array.isArray(raw) ? raw : raw.materials;

const floors = (() => {
  const out: Array<{ m: Mat; prop: string; r: Range }> = [];
  for (const m of ALL) for (const [prop, r] of Object.entries(m.ranges ?? {})) {
    if (r && r.basis === 'min_spec') out.push({ m, prop, r });
  }
  return out;
})();

describe('E4 — 규격 하한(basis=min_spec) 표기', () => {
  it('스탬프가 실제로 존재한다 (파이프가 죽으면 배지도 사라진다)', () => {
    /* A3 Ti(2026-09-21): 절대 하한 100 은 '최소값이 typical 자리에 실린 행' 의 수였다 — A3 Al·Ti 가 그 행들을 대표값으로
       교정하면서 스탬프가 116 → 91 로 **정당하게** 줄었다(값이 더는 규격 하한이 아니다). 그래서 수가 아니라 계약을 본다:
       min-spec 표의 패턴에 걸리고 typical 이 min ±2% 이면 반드시 스탬프가 있어야 한다(파이프가 죽으면 여기서 0 이 된다). */
    const specs: Array<{ pattern: string; min: Record<string, number> }> = JSON.parse(fs.readFileSync(path.resolve('data/standard-min-specs.json'), 'utf8')).specs;
    const missing: string[] = [];
    let due = 0;
    for (const m of ALL) {
      const sp = specs.find((x) => m.name.includes(x.pattern));
      if (!sp) continue;
      for (const [prop, min] of Object.entries(sp.min)) {
        const r = m.ranges?.[prop];
        if (!r || typeof r.typical !== 'number' || Math.abs(r.typical - min) > min * 0.02) continue;
        due++;
        if (r.basis !== 'min_spec') missing.push(`${m.name.slice(0, 40)} · ${prop}`);
      }
    }
    expect(due, 'min ±2% 에 든 range 가 0 — 표나 데이터가 통째로 어긋났다').toBeGreaterThan(40);
    expect(missing, `규격 하한인데 스탬프가 없다 ${missing.length}건:\n  ${missing.join('\n  ')}`).toEqual([]);
    expect(floors.length).toBe(due);
  });

  it('모든 floor 값이 근거를 갖는다 (basis_source 또는 provenance)', () => {
    const bad = floors
      .filter(({ r }) => !r.basis_source && !r.provenance)
      .map(({ m, prop }) => `${m.stable_id ?? m.id} ${m.name.slice(0, 40)} · ${prop}`);
    expect(bad, `근거 없는 규격 하한 ${bad.length}건 — 배지는 뜨는데 어느 규격인지 못 댄다:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('floor 는 평균값과 섞이지 않는다 — min_spec_value 축과 교집합 0', () => {
    /* 두 필드는 서로 다른 이야기를 한다(하나짜리 하한 vs 평균+별도 보증최소).
       한 range 가 둘 다 가지면 UI 가 모순된 두 배지를 동시에 그리게 된다. */
    const both = floors
      .filter(({ r }) => (r as { min_spec_value?: number }).min_spec_value != null)
      .map(({ m, prop }) => `${m.stable_id ?? m.id} · ${prop}`);
    expect(both, `basis 와 min_spec_value 를 동시에 가진 range ${both.length}건`).toEqual([]);
  });

  it('규격명 인용 형태가 실제 규격처럼 보인다', () => {
    /* basis_source 는 min-spec 표의 std — 발행기관 접두어가 있어야 한다. */
    const ORG = /\b(ASTM|ASME|SAE|AMS|EN|DIN|JIS|KS|ISO|MIL|API|UNS|AWS|AA)\b/i;
    const bad = floors
      .filter(({ r }) => r.basis_source && !ORG.test(r.basis_source))
      .map(({ m, prop, r }) => `${m.stable_id ?? m.id} · ${prop} → "${r.basis_source}"`);
    expect(bad, `발행기관을 못 읽는 규격 인용 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});
