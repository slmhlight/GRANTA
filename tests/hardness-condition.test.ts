/*
 * D10 — "경도가 조건을 따라가지 않는" 결함의 지문 게이트.
 *
 * 경도와 인장은 같은 소성저항을 재므로 조건이 바뀌면 함께 움직인다. 그런데 일부 합금은
 * **UTS 는 배로 변하는데 경도가 한 값으로 고정**돼 있었다 — 값이 조건별로 채워지지 않고 복사된 흔적이다.
 *
 * 합금 내 비(比) 산포로 재면 정상 케이스가 대거 걸린다(침탄강의 case vs core, 질화층, 고온 시험 조건 —
 * 실측 상위 12 중 8이 그런 것들). 그래서 **결함의 정확한 지문**만 본다:
 *   UTS 최대/최소 ≥ 1.5배  &&  경도가 문자 그대로 단일값.
 *
 * 이 조건에서 현재 남는 것은 D10 의 미해결 2건뿐이다. 새로 생기면 즉시 발화한다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Mat = { name: string; category: string; ranges?: Record<string, { typical?: number | null } | undefined> };
const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
const ALL: Mat[] = Array.isArray(raw) ? raw : raw.materials;
const v = (m: Mat, p: string) => {
  const x = m.ranges?.[p]?.typical;
  return typeof x === 'number' && isFinite(x) ? x : null;
};
const baseOf = (n: string) => String(n).split(/\s+—\s+/)[0].trim();

/* 인용을 확보하지 못해 남긴 것 — 백로그 D10. 고치면 여기서 지우면 된다.
   (환산계수가 합금계마다 달라 그 합금 자신의 앵커가 필요하다 — Al 2건은 공개 앵커가 있어 교정했다.) */
const KNOWN_OPEN = new Set(['CuNi2SiCr', 'C-103 (Nb-Hf-Ti)']);

describe('D10 — 경도가 조건을 따라가지 않는 합금', () => {
  const offenders = (() => {
    const by = new Map<string, Array<{ u: number; h: number }>>();
    for (const m of ALL) {
      if (m.category !== 'Metal') continue;
      const u = v(m, 'uts'), h = v(m, 'hardness');
      if (u == null || h == null) continue;
      const b = baseOf(m.name);
      if (!by.has(b)) by.set(b, []);
      by.get(b)!.push({ u, h });
    }
    const out: string[] = [];
    for (const [b, rows] of by) {
      if (rows.length < 2) continue;
      const us = rows.map((r) => r.u), hs = rows.map((r) => r.h);
      const uSpread = Math.max(...us) / Math.min(...us);
      const hFixed = Math.max(...hs) === Math.min(...hs);
      if (uSpread >= 1.5 && hFixed) out.push(b);
    }
    return out;
  })();

  it('새로운 발생이 없다 (알려진 미해결분만 남는다)', () => {
    const fresh = offenders.filter((b) => !KNOWN_OPEN.has(b));
    expect(fresh, `경도 고정 + UTS ≥1.5배 변동이 새로 생겼다 ${fresh.length}건: ${fresh.join(' | ')}`).toEqual([]);
  });

  it('알려진 미해결분이 줄면 목록도 줄인다 (죽은 예외 방지)', () => {
    const stale = [...KNOWN_OPEN].filter((b) => !offenders.includes(b));
    expect(stale, `고쳐졌는데 예외 목록에 남아 있다: ${stale.join(' | ')} — KNOWN_OPEN 에서 제거할 것`).toEqual([]);
  });

  it('교정한 Al 2종은 합금 내 비가 정합한다', () => {
    /* AA 6262·AA 2025 는 소둔재 경도만 어긋나 있었다. 그 합금 자신의 비로 맞췄다. */
    const bad: string[] = [];
    for (const base of ['AA 6262', 'AA 2025']) {
      const rows = ALL.filter((m) => baseOf(m.name) === base)
        .map((m) => ({ m, u: v(m, 'uts'), h: v(m, 'hardness') }))
        .filter((r) => r.u != null && r.h != null) as Array<{ m: Mat; u: number; h: number }>;
      expect(rows.length, `${base}: 비교할 조건이 없다`).toBeGreaterThan(1);
      const ratios = rows.map((r) => r.u / r.h);
      const spread = Math.max(...ratios) / Math.min(...ratios);
      if (spread > 1.1) bad.push(`${base}: 비 산포 ${spread.toFixed(2)}배 (${ratios.map((x) => x.toFixed(2)).join(' / ')})`);
    }
    expect(bad, `합금 내 비가 어긋난다 — ${bad.join(' | ')}`).toEqual([]);
  });
});
