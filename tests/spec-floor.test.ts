/*
 * E4 (H6 W4-1) → AUD-3 D04 (2026-09-22) 개정 — 규격 하한 표기 게이트.
 *
 * 감사 D04: "typical 이 표의 minimum ±2% 이면 basis='min_spec'" 은 **수치 근접으로 근거의 종류를 바꾸는** 규칙이었다.
 * 원문이 그 값을 최소값으로 지정했는지, 제품 형태·두께·열처리·시험 방향이 규격과 같은지는 보지 않는다.
 * 지금 계약: ① 규격 최소값은 별도 축(min_spec_value·min_spec_source)에 병기하고 ② 근접은 near_min_spec 표시로만 쓰며
 * ③ basis='min_spec'(= 이 값이 곧 하한) 은 교정이 직접 선언한 것만 남는다.
 *
 * 아래 원문 배경(E4)은 그대로 둔다 — floor 로 표시된 값은 여전히 근거를 댈 수 있어야 한다.
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

type Range = { typical?: number; basis?: string; basis_source?: string; basis_note?: string; basis_verified?: string; provenance?: string };
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
  it('규격 최소값이 별도 축으로 병기된다 — 근접은 표시만, 근거의 종류는 바꾸지 않는다 (D04)', () => {
    const specs: Array<{ pattern: string; std?: string; min: Record<string, number> }> = JSON.parse(fs.readFileSync(path.resolve('data/standard-min-specs.json'), 'utf8')).specs;
    const missing: string[] = [];
    const wrongNear: string[] = [];
    let due = 0, near = 0;
    for (const m of ALL) {
      const sp = specs.find((x) => m.name.includes(x.pattern));
      if (!sp) continue;
      for (const [prop, min] of Object.entries(sp.min)) {
        const r = m.ranges?.[prop] as (Range & { min_spec_value?: number; near_min_spec?: boolean }) | undefined;
        if (!r || typeof r.typical !== 'number') continue;
        if (r.basis === 'min_spec') continue;   // 교정이 선언한 행 — 같은 축을 두 번 말하지 않는다
        due++;
        if (r.min_spec_value !== min) missing.push(`${m.name.slice(0, 40)} · ${prop} (표 ${min} vs ${r.min_spec_value ?? '없음'})`);
        const isNear = Math.abs(r.typical - min) <= min * 0.02;
        if (isNear) near++;
        if (!!r.near_min_spec !== isNear) wrongNear.push(`${m.name.slice(0, 40)} · ${prop}`);
      }
    }
    expect(due, '규격 표에 걸린 range 가 0 — 표나 데이터가 통째로 어긋났다').toBeGreaterThan(100);
    expect(missing.slice(0, 10), `규격 최소값 병기 누락 ${missing.length}건`).toEqual([]);
    expect(wrongNear.slice(0, 10), `near_min_spec 표시가 실제 근접과 다르다 ${wrongNear.length}건`).toEqual([]);
    expect(near, '근접(±2%) 사례가 0 — 확인 대상 표시가 공회전').toBeGreaterThan(10);
  });

  it("basis='min_spec' 은 사람이 선언한 것만 남는다 (자동 부여 중단)", () => {
    /* 선언 경로는 두 가지다. ① data/spec-floor-declarations.json — 원문을 대조하고 std·note·verified 를 적은 것
       ② data/corrections/ 의 basis_kind 교정 — provenance 에 인용이 남는 것. 둘 중 하나가 없으면 그 배지는
       "왜 하한인지" 를 못 댄다. 자동 ±2% 스탬프였다면 100건 안팎이었을 자리다. */
    expect(floors.length).toBeLessThan(40);
    for (const { m, prop, r } of floors) {
      const declared = !!(r.basis_source && r.basis_note && r.basis_verified);
      const corrected = /교정:/.test(String(r.provenance ?? ''));
      expect(declared || corrected, `${m.id} ${prop} — 선언 근거(원문 대조 기록 또는 교정 인용)가 없다`).toBe(true);
    }
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
