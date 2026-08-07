/*
 * 수치 정합 영구 게이트 — 물리 법칙·구조 불변량으로만 검사한다(이름 매칭 없음).
 *
 * 이번 전수 스윕에서 실제로 걸린 것:
 *   · AISI 440C "Aged" 가 **소둔 경도**(260 HV)를 달고 있었다 — 강도는 경화재(σy 1900)인데 경도만 연질.
 *   · 마레이징 Aged 경도 321 < As-built 347 — 시효재가 미시효재보다 무른 역전.
 *   · AISI 6150 Q+T 가 UTS 1700 에 경도 313 (비 5.4).
 *   · AISI 1015 냉간가공 σy 205 < 소둔 σy 285 — 냉간가공이 소둔보다 약한 역전.
 *
 * 강재는 인장강도와 경도가 같은 소성저항을 재므로 UTS ≈ 3.3 × HV 로 묶인다(ISO 18265).
 * 이 관계가 깨지면 둘 중 하나가 조건을 안 따라간 것이다.
 * 예외는 물리적 근거가 있는 것만 명시적으로 뺀다(취성 주철·침탄/질화 표면 경도).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Mat = { id: string; name: string; category: string; subcategory?: string; ranges?: Record<string, { typical?: number | null } | undefined> };
const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
const ALL: Mat[] = Array.isArray(raw) ? raw : raw.materials;

const v = (m: Mat, p: string): number | null => {
  const x = m.ranges?.[p]?.typical;
  return typeof x === 'number' && isFinite(x) ? x : null;
};
const baseOf = (n: string) => String(n).split(/\s+—\s+/)[0].trim();
const condOf = (n: string) => String(n).split(/\s+—\s+/).slice(1).join(' — ');

describe('수치 정합 — 물리 법칙', () => {
  it('항복강도 ≤ 인장강도', () => {
    const bad = ALL.filter((m) => {
      const y = v(m, 'yield_strength'), u = v(m, 'uts');
      return y != null && u != null && y > u * 1.02;
    }).map((m) => `${m.id} ${m.name.slice(0, 44)}`);
    expect(bad, `σy > UTS ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('피로한도 ≤ 인장강도', () => {
    const bad = ALL.filter((m) => {
      const f = v(m, 'fatigue_strength'), u = v(m, 'uts');
      return f != null && u != null && f > u;
    }).map((m) => `${m.id} ${m.name.slice(0, 44)}`);
    expect(bad, `σf > UTS ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('ranges 의 min ≤ typical ≤ max', () => {
    const bad: string[] = [];
    for (const m of ALL) for (const [p, r] of Object.entries(m.ranges || {})) {
      const rr = r as { min?: number; typical?: number; max?: number } | undefined;
      if (!rr || [rr.min, rr.typical, rr.max].some((x) => typeof x !== 'number')) continue;
      if (rr.min! > rr.typical! + 1e-9 || rr.typical! > rr.max! + 1e-9) bad.push(`${m.id} ${p} ${rr.min}/${rr.typical}/${rr.max}`);
    }
    expect(bad, `범위 역전 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('수치 정합 — 강재 인장-경도 상관 (ISO 18265)', () => {
  /* 제외 근거:
     - 취성 주철(회주철·백주철·Ni-Hard): 흑연/탄화물 때문에 경도는 높고 인장은 낮다 — 3.3 관계가 성립하지 않는다.
     - 침탄·질화: 경도는 표면(case), 인장은 심부(core) 값이라 애초에 다른 부위를 재는 값이다. */
  const EXCLUDE = /Cast Iron|White|Ni-Hard/i;
  const EXCLUDE_NAME = /white iron|cast iron|carburiz|nitrid/i;
  /* 준오스테나이트계 PH 의 Condition A(불안정 오스테나이트): 인장 시험 중 마르텐사이트로
     변태(TRIP)해 UTS 는 높은데, 압입 경도는 변태 전 오스테나이트 상태를 잰다.
     실측 자체가 비 5 를 넘는다(17-7 PH Cond.A: UTS 896~1030 / 85~90 HRB) — 값 오류가 아니다. */
  const EXCLUDE_METASTABLE = /condition a\b/i;

  it('UTS / 경도 비가 2.0 ~ 5.0 안에 있다', () => {
    const bad: string[] = [];
    for (const m of ALL) {
      if (!/Steel|Iron/i.test(m.subcategory || '')) continue;
      if (EXCLUDE.test(m.subcategory || '') || EXCLUDE_NAME.test(m.name)) continue;
      if (EXCLUDE_METASTABLE.test(m.name)) continue;
      const u = v(m, 'uts'), h = v(m, 'hardness');
      if (u == null || h == null || h <= 0) continue;
      /* ISO 18265 환산표의 유효 상한은 약 650 HV(2200 MPa) — 그 위 경화강은 일반 항복 전에
         파단해 인장-경도 관계가 성립하지 않는다(SK85 62 HRC 등). 검사 범위 밖. */
      if (h > 650) continue;
      const r = u / h;
      if (r < 2.0 || r > 5.0) bad.push(`${m.id} ${m.name.slice(0, 46)} UTS=${u} 경도=${h} 비=${r.toFixed(1)}`);
    }
    expect(bad, `인장-경도 상관 이탈 ${bad.length}건 (조건 미반영 의심):\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('수치 정합 — 조건 순서', () => {
  const byBase = new Map<string, Mat[]>();
  for (const m of ALL) {
    if (m.category !== 'Metal') continue;
    const b = baseOf(m.name);
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b)!.push(m);
  }

  it('냉간가공재가 소둔재보다 약하지 않다', () => {
    const bad: string[] = [];
    for (const [b, arr] of byBase) {
      const ann = arr.filter((m) => /^anneal|^soft/i.test(condOf(m.name)));
      const cw = arr.filter((m) => /strain.?harden|cold.?work|cold.?drawn|full hard|[13]\/[24] hard/i.test(condOf(m.name)));
      for (const a of ann) for (const c of cw) {
        const ya = v(a, 'yield_strength'), yc = v(c, 'yield_strength');
        if (ya == null || yc == null) continue;
        if (ya > yc) bad.push(`${b.slice(0, 40)} 소둔 σy=${ya} > 냉간가공 σy=${yc} (${a.id}/${c.id})`);
      }
    }
    expect(bad, `물리 역전 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('시효/경화재가 미처리재보다 무르지 않다', () => {
    const bad: string[] = [];
    for (const [b, arr] of byBase) {
      const soft = arr.filter((m) => /^anneal|as-built|as-supplied|solution.?anneal/i.test(condOf(m.name)));
      const hard = arr.filter((m) => /(^|\s)aged|hardened|Q\+T|quench/i.test(condOf(m.name)) && !/solution.?anneal/i.test(condOf(m.name)));
      for (const s of soft) for (const h of hard) {
        const hs = v(s, 'hardness'), hh = v(h, 'hardness');
        const us = v(s, 'uts'), uh = v(h, 'uts');
        /* 강도가 실제로 올라간 쌍에서만 경도 순서를 따진다 (조건 라벨만 보고 단정하지 않는다) */
        if (hs == null || hh == null || us == null || uh == null) continue;
        if (uh > us * 1.15 && hh < hs) bad.push(`${b.slice(0, 38)} ${s.id}(${condOf(s.name).slice(0, 14)}) 경도 ${hs} > ${h.id}(${condOf(h.name).slice(0, 14)}) 경도 ${hh} — 강도는 ${us}→${uh}`);
      }
    }
    expect(bad, `경화재 경도 역전 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});
