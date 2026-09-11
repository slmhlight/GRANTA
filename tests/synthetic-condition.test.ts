/*
 * A17 — **냉간가공 조건인데 소둔재와 값이 같은 entry** 를 막는다.
 *
 * Strain-hardened(냉간가공)는 전위 축적으로 항복·인장·경도를 **올리는** 조건이다. 그런데 같은
 * base 의 Annealed entry 와 σy·UTS·경도가 **완전히 같은** entry 가 11 건 있었다 — 그중 10 건은
 * 연신율까지 같아, 라벨만 다른 복제였다(AISI 6150 만 연신율에 배율이 적용돼 있었다).
 *
 * 이 값들은 원래 "합성 조건"(base 값 × 범용 배율)으로 찍혀 있던 것을, 배율이 물리적으로 틀렸다는
 * 이유로 **annealed 기준으로 되돌린** 결과였다(corrections 의 "냉간가공 비표준 → annealed 기준").
 * 되돌린 것까지는 옳았지만, 그러면 그 entry 에는 더 이상 그 조건의 정보가 없다.
 *
 * 제거 전 규격을 다시 확인했고(2026-09-11), 11 건 모두 인용 가능한 냉간가공 대표값이 없었다:
 *   · CP Ti(Gr 1·2·3·4·7·23) — ASTM B348 은 봉재를 **소둔 상태**로 규정하고 'cold drawn' 은
 *     치수·표면 등급이지 강도 조건이 아니다
 *   · Ti-5-2-5(all-α) · Ti-8-1-1 · Ti-6-2-4-6(near-α/α-β) — 소둔·이중소둔·STA 만, 냉간가공 봉재 부재
 *   · AISI 440C — ASTM A276 에 냉간인발 조건은 실재하나 규정값은 경도 **상한**(285 HB)뿐
 *   · AISI 6150 — 냉간마무리 합금강 봉재 규격 ASTM A331 은 2004 폐지, 등급별 물성 미규정
 * → 값을 지어내지 않는 한 교정 불가라 제거했다(remove.json · 사용자 승인).
 *
 * 게이트는 **재발**을 막는다: 상류가 다시 합성 조건을 만들거나, 교정이 값을 annealed 로 되돌리면
 * 여기서 발화한다. aged 라벨은 대상이 아니다 — 비열처리 합금에서 aged ≈ annealed 는 라벨
 * 아티팩트로 이미 검토·기록된 케이스이고(audit-registry 의 REVIEWED), 값이 거짓은 아니다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Mat = {
  id?: string;
  name?: string;
  heat_treatment?: string;
  ranges?: Record<string, { typical?: number } | null>;
};

const all: Mat[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'client', 'public', 'materials.json'), 'utf8'));
const typ = (m: Mat, k: string) => m.ranges?.[k]?.typical ?? null;
const baseOf = (m: Mat) => String(m.name ?? '').split('—')[0].trim();

const COLD = /strain-hard|cold.?draw|cold.?work|hard drawn/i;
const ANNEALED = /^anneal/i;
const KEYS = ['yield_strength', 'uts', 'hardness'] as const;

describe('A17 — 냉간가공 조건은 소둔재와 값이 같을 수 없다', () => {
  const byBase = new Map<string, Mat[]>();
  for (const m of all) {
    const b = baseOf(m);
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b)!.push(m);
  }

  const cold = all.filter((m) => COLD.test(m.heat_treatment ?? ''));

  it('검사 대상이 실제로 모였다', () => {
    expect(cold.length, '냉간가공 조건 entry 가 0 이면 게이트가 무의미하다 — 라벨 표기나 경로 확인').toBeGreaterThan(10);
    const withSibling = cold.filter((m) => (byBase.get(baseOf(m)) ?? []).some((s) => ANNEALED.test(s.heat_treatment ?? '')));
    expect(withSibling.length, '소둔 형제를 가진 냉간가공 entry 가 0 이면 비교 자체가 성립하지 않는다').toBeGreaterThan(5);
  });

  it('같은 base 의 Annealed 와 σy·UTS·경도가 전부 같은 entry 가 없다', () => {
    const bad: string[] = [];
    for (const h of cold) {
      for (const s of byBase.get(baseOf(h)) ?? []) {
        if (s.id === h.id || !ANNEALED.test(s.heat_treatment ?? '')) continue;
        const same = KEYS.every((k) => {
          const a = typ(h, k);
          const b = typ(s, k);
          return a !== null && b !== null && Math.abs(a - b) < 1e-9;
        });
        if (same) bad.push(`${h.id} ${h.name} == ${s.id} ${s.name} (σy ${typ(h, 'yield_strength')} · UTS ${typ(h, 'uts')} · HV ${typ(h, 'hardness')})`);
      }
    }
    expect(
      bad,
      `냉간가공인데 소둔재와 값이 같은 entry ${bad.length}건 — 조건이 가진 정보가 없다. 인용 가능한 냉간가공 값으로 교정하거나 제거할 것:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });

  it('제거한 11 건이 되살아나지 않았다', () => {
    const gone = ['MET-0051', 'MET-0803', 'MET-0871', 'MET-0877', 'MET-0882', 'MET-0886', 'MET-0890', 'MET-0895', 'MET-0908', 'MET-0914', 'MET-0937'];
    const ids = new Set(all.map((m) => String(m.id)));
    /* 산출물의 id 는 legacy_id 라 직접 비교가 안 된다 — 이름+조건으로 확인한다. */
    const back = all.filter((m) => COLD.test(m.heat_treatment ?? '') && /^(AISI 6150|AISI 440C|Ti Grade [12347]|Ti Grade 23|Ti-5-2-5|Ti-6-2-4-6|Ti-8-1-1)\b/.test(baseOf(m)));
    expect(back.map((m) => `${m.id} ${m.name}`), '제거한 합성 조건이 상류에서 되살아났다 — remove.json 확인').toEqual([]);
    expect(gone.length).toBe(11);
    expect(ids.size).toBeGreaterThan(1000);
  });
});
