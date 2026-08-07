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

describe('수치 정합 — 고온곡선·크리프', () => {
  /* 곡선은 특정 조건(소둔·T6·시효 등)을 대표한다. 그 entry 의 상온 σy 와 곡선의 23°C ys 가
     크게 어긋나면 **다른 조건의 곡선**이 붙어 있는 것이다.
     build-materials 의 앵커 게이트는 곡선을 붙이는 시점에만 돌아서, 이후 값 교정이 판정을
     무효화해도 다시 보지 않았다 — C17200 이 그렇게 σy 160(소둔) 표에 1100(시효) 곡선을 달고 있었다.
     이 검사는 **교정이 끝난 최종 데이터**를 본다. */
  it('고온곡선의 23°C 앵커가 표의 상온 σy 와 1.4배 안에 있다', () => {
    const bad: string[] = [];
    for (const m of ALL) {
      const et = (m as unknown as { elevated_temp?: Array<{ temp: number; ys?: number | null }> }).elevated_temp;
      if (!Array.isArray(et) || !et.length) continue;
      const rt = et.find((p) => p.temp <= 30)?.ys ?? et[0]?.ys;
      const sy = v(m, 'yield_strength');
      if (!rt || !sy) continue;
      const r = Math.max(rt, sy) / Math.min(rt, sy);
      if (r > 1.4) bad.push(`${m.id} ${m.name.slice(0, 44)} 곡선 ${rt} vs 표 ${sy} (${r.toFixed(1)}배)`);
    }
    expect(bad, `조건 불일치 곡선 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('고온곡선의 각 온도에서 σy ≤ UTS', () => {
    const bad: string[] = [];
    for (const m of ALL) {
      const et = (m as unknown as { elevated_temp?: Array<{ temp: number; ys?: number | null; uts?: number | null }> }).elevated_temp;
      if (!Array.isArray(et)) continue;
      for (const p of et) if (p.ys != null && p.uts != null && p.ys > p.uts * 1.02) bad.push(`${m.id} ${m.name.slice(0, 40)} ${p.temp}°C σy=${p.ys} > UTS=${p.uts}`);
    }
    expect(bad, `고온곡선 σy>UTS ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('크리프 파단: 같은 온도에서 시간이 길수록 응력이 낮다', () => {
    const bad: string[] = [];
    for (const m of ALL) {
      const cr = (m as unknown as { creep_rupture?: Array<{ temp: number; hours?: number; stress?: number }> }).creep_rupture;
      if (!Array.isArray(cr)) continue;
      const byT = new Map<number, Array<{ hours?: number; stress?: number }>>();
      for (const p of cr) { if (!byT.has(p.temp)) byT.set(p.temp, []); byT.get(p.temp)!.push(p); }
      for (const [t, pts] of byT) {
        const s = [...pts].sort((a, b) => (a.hours || 0) - (b.hours || 0));
        for (let i = 1; i < s.length; i++)
          if (s[i].stress != null && s[i - 1].stress != null && s[i].stress! > s[i - 1].stress! * 1.02)
            bad.push(`${m.id} ${m.name.slice(0, 36)} ${t}°C ${s[i - 1].hours}h:${s[i - 1].stress} → ${s[i].hours}h:${s[i].stress}`);
      }
    }
    expect(bad, `크리프 역전 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('수치 정합 — 조건 축 (A11)', () => {
  /* 뜨임 마르텐사이트를 뜨임온도 이상에서 쓰면 추가 뜨임이 진행돼 경도·강도를 잃는다.
     그 조건이 제공하는 강도를 근거로 설계한다면 상용 상한은 뜨임온도를 넘을 수 없다.
     Tmax 가 계열 typical(조건 축 없음)로 상속되면 이 관계가 깨진다 — A11 의 본체다.
     'tested at NNN°C' 는 시험온도지 뜨임온도가 아니다(H21 오탐 근절). */
  const temperTemp = (c: string): number | null => {
    if (/tested at/i.test(c)) return null;
    let m = c.match(/(\d{2,4})\s*°?\s*C\s*(?:T\b|temper)/i);
    if (m) return +m[1];
    m = c.match(/temper(?:ed|ing)?\s*(?:at\s*)?\(?\s*(\d{2,4})\s*°?\s*C/i);
    if (m) return +m[1];
    m = c.match(/Q\s*\+\s*T\s*\(?\s*([^)]*)/i);
    if (m) {
      const t = [...m[1].matchAll(/(\d{2,4})\s*°?\s*C/gi)].map((x) => +x[1]);
      if (t.length) return t[t.length - 1];
    }
    return null;
  };

  it('상용 최고온도가 조건에 명시된 뜨임온도를 넘지 않는다', () => {
    const bad: string[] = [];
    for (const m of ALL) {
      if (m.category !== 'Metal') continue;
      const c = condOf(m.name);
      if (!c) continue;
      const t = temperTemp(c);
      const tmax = v(m, 'max_service_temp');
      if (t == null || tmax == null) continue;
      if (tmax > t) bad.push(`${m.id} ${m.name.slice(0, 50)} 뜨임 ${t}°C < Tmax ${tmax}°C`);
    }
    expect(bad, `뜨임온도 초과 상용온도 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('수치 정합 — 파생 단위', () => {
  it('부피단가 = 질량단가 × 밀도', () => {
    const bad: string[] = [];
    for (const m of ALL) {
      const pk = v(m, 'price_per_kg'), pc = v(m, 'price_per_cm3'), d = v(m, 'density');
      if (pk == null || pc == null || d == null) continue;
      const exp = pk * d / 1000;
      if (Math.abs(pc - exp) > Math.max(exp * 0.1, 0.005)) bad.push(`${m.id} ${m.name.slice(0, 40)} $/cm³ ${pc} vs ${exp.toFixed(4)}`);
    }
    expect(bad, `단가 불일치 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('이름이 완전히 같은 entry 가 없다', () => {
    const seen = new Map<string, string[]>();
    for (const m of ALL) {
      const k = m.name.trim().toLowerCase();
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k)!.push(m.id);
    }
    const bad = [...seen.entries()].filter(([, ids]) => ids.length > 1).map(([k, ids]) => `${ids.join('/')} ${k.slice(0, 50)}`);
    expect(bad, `중복 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
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
