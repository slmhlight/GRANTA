/* R155b — htConditionMultiplier unit test (scripts/lib/ht-condition.mjs).
 *
 * R129 의 HT condition multiplier 로직 — alloy family x HT condition → fatigue/impact/KIC multiplier.
 * 회귀 방지: 새 HT case 추가 시 기존 alloy 의 multiplier 가 안 깨지는지 즉시 감지.
 */
import { describe, expect, it } from 'vitest';
import { htConditionMultiplier } from '../scripts/pipeline/enrich/ht-condition.mjs';

describe('htConditionMultiplier — PH stainless', () => {
  it('17-4 PH H900 peak-aged (baseline 1.0)', () => {
    const r = htConditionMultiplier({ name: '17-4 PH (UNS S17400) — H900' });
    expect(r.f).toBe(1.00);
    expect(r.i).toBe(1.00);
    expect(r.k).toBe(1.00);
    expect(r.condTag).toContain('H900');
  });

  it('17-4 PH H1025 → slightly reduced fatigue, higher impact/KIC', () => {
    const r = htConditionMultiplier({ name: '17-4 PH (UNS S17400) — H1025' });
    expect(r.f).toBe(0.90);
    expect(r.i).toBe(1.40);
    expect(r.k).toBe(1.20);
  });

  it('17-4 PH H1150 over-aged (more ductile)', () => {
    const r = htConditionMultiplier({ name: '17-4 PH (UNS S17400) — H1150' });
    expect(r.f).toBe(0.78);
    expect(r.i).toBe(3.00);
    expect(r.k).toBe(1.60);
  });

  it('17-4 PH As-built martensitic', () => {
    const r = htConditionMultiplier({ name: '17-4 PH — As-built' });
    expect(r.condTag).toContain('as-built');
  });

  it('15-5 PH inherits PH logic', () => {
    const r = htConditionMultiplier({ name: '15-5 PH (UNS S15500) — H900' });
    expect(r.f).toBe(1.00);
  });
});

describe('htConditionMultiplier — Maraging', () => {
  it('Maraging Aged peak strength (baseline)', () => {
    const r = htConditionMultiplier({ name: 'Maraging 250 — Aged' });
    expect(r.f).toBe(1.00);
    expect(r.condTag).toContain('aged');
  });

  it('Maraging annealed (austenitic soft)', () => {
    const r = htConditionMultiplier({ name: 'Maraging 300 — Annealed' });
    expect(r.f).toBe(0.40);
    expect(r.i).toBe(3.50);
    expect(r.condTag).toContain('annealed');
  });
});

describe('htConditionMultiplier — Tool steel', () => {
  it('H13 Q+T peak HRC 50-55 (baseline)', () => {
    const r = htConditionMultiplier({ name: 'Tool Steel H13 — Q+T 540°C' });
    expect(r.f).toBe(1.00);
    expect(r.condTag).toContain('Q+T peak');
  });

  it('H13 annealed (spheroidized soft)', () => {
    const r = htConditionMultiplier({ name: 'Tool Steel H13 — Annealed' });
    expect(r.f).toBe(0.30);
    expect(r.i).toBe(4.00);
  });

  it('H13 Q+T high-temper (softer)', () => {
    const r = htConditionMultiplier({ name: 'Tool Steel H13 — Q+T 610°C' });
    expect(r.f).toBe(0.78);
  });
});

describe('htConditionMultiplier — Ni superalloy', () => {
  it('Inconel 718 STA peak (baseline)', () => {
    const r = htConditionMultiplier({ name: 'Inconel 718 — STA' });
    expect(r.f).toBe(1.00);
  });

  it('Inconel 718 DSA double aged', () => {
    const r = htConditionMultiplier({ name: 'Inconel 718 — DSA' });
    expect(r.f).toBe(1.00);
    expect(r.condTag).toContain('DSA');
  });

  it('Inconel 718 As-built no age', () => {
    const r = htConditionMultiplier({ name: 'Inconel 718 — As-built' });
    // AM as-built: 기공/미세결함 지배 → soft 조건이지만 annealed(0.95)로 올리지 않고 보수적 0.80 유지.
    expect(r.f).toBe(0.80);
    expect(r.condTag).toContain('as-built');
  });

  /* R212 — 석출경화 Ni초합금 fatigue 실측 보정 (Special Metals SMC-045, Inconel 718).
     시효는 인장(YS ×2.10)은 크게 올리지만 피로는 ×1.05뿐 → soft 조건 피로는 peak 대비 ~0.92-0.95.
     (이전 0.60/0.65 는 피로를 인장처럼 과소평가.) impact(i)/KIC(k) 는 soft=더 인성↑ 물리값 유지. */
  it('Inconel 718 annealed — 피로 ~peak (R212: f=0.95, not 0.60)', () => {
    const r = htConditionMultiplier({ name: 'Inconel 718 — Annealed (980°C/1h AC)' });
    expect(r.f).toBe(0.95);
    expect(r.i).toBe(1.50); // annealed 가 더 인성 높음 — 유지
    expect(r.k).toBe(1.40);
    expect(r.condTag).toContain('annealed');
  });

  it('Inconel 718 solution treated — 피로 ~peak (R212: f=0.92, not 0.65)', () => {
    const r = htConditionMultiplier({ name: 'Inconel 718 — Solution treated (1065°C/1h WQ)' });
    expect(r.f).toBe(0.92);
    expect(r.condTag).toContain('solution treated');
  });

  it('Inconel X-750 annealed — 동일 γ′/γ″ 거동 물리 외삽 (f=0.95)', () => {
    const r = htConditionMultiplier({ name: 'Inconel X-750 — Annealed (Wrought)' });
    expect(r.f).toBe(0.95);
  });

  it('Inconel 625 solid-solution (HT-insensitive)', () => {
    const r = htConditionMultiplier({ name: 'Inconel 625 — Annealed' });
    expect(r.f).toBe(1.00); // solid-solution baseline
  });

  /* R218 — cast/SX γ′ 분리: wrought 718 보정(annealed f=0.95)을 상속하면 안 됨 (defect-지배). */
  it('MAR-M 247 (cast γ′) solution — wrought 0.95 미적용, cast defect-capped 0.85', () => {
    const r = htConditionMultiplier({ name: 'MAR-M 247 — Solution treated' });
    expect(r.f).toBe(0.85);
    expect(r.condTag).toContain('cast');
  });

  it('Inconel 738 (cast 7xx) as-cast — defect-limited f=0.80 (cast block)', () => {
    const r = htConditionMultiplier({ name: 'Inconel 738 (IN738) — As-built' });
    expect(r.f).toBe(0.80);
    expect(r.condTag).toContain('as-cast');
  });

  it('René 80 (cast) HIP — 기공 제거로 피로 ↑ (f=1.10)', () => {
    const r = htConditionMultiplier({ name: 'Rene 80 — Cast + HIP' });
    expect(r.f).toBe(1.10);
  });

  it('Inconel 740H (wrought 7xx) solution — wrought block 유지 (f=0.92, cast 분리에 영향 없음)', () => {
    const r = htConditionMultiplier({ name: 'Inconel 740H — Solution treated (1135°C)' });
    expect(r.f).toBe(0.92);
    expect(r.condTag).toContain('solution treated');
  });
});

describe('htConditionMultiplier — Ti-6Al-4V', () => {
  it('Ti-6Al-4V mill annealed (baseline)', () => {
    const r = htConditionMultiplier({ name: 'Ti-6Al-4V — Mill Annealed' });
    expect(r.f).toBe(1.00);
  });

  it('Ti-6Al-4V STA aged (higher strength, lower ductility)', () => {
    const r = htConditionMultiplier({ name: 'Ti-6Al-4V — STA' });
    expect(r.f).toBe(1.10);
    expect(r.i).toBe(0.90);
  });

  it('Ti-6Al-4V HIP densified', () => {
    const r = htConditionMultiplier({ name: 'Ti-6Al-4V — HIP' });
    expect(r.f).toBe(1.05);
    expect(r.condTag).toContain('HIP');
  });

  it('Ti-6Al-4V β-annealed (coarse grain)', () => {
    const r = htConditionMultiplier({ name: 'Ti-6Al-4V — β-annealed' });
    expect(r.f).toBe(0.85);
  });

  it('Ti-6Al-4V As-built (LPBF acicular)', () => {
    const r = htConditionMultiplier({ name: 'Ti-6Al-4V — As-built' });
    expect(r.f).toBe(0.85);
    expect(r.condTag).toContain('as-built');
  });
});

describe('htConditionMultiplier — Austenitic stainless', () => {
  it('304 / 316 solution annealed (baseline)', () => {
    const r = htConditionMultiplier({ name: '316L stainless steel' });
    expect(r.f).toBe(1.00);
    expect(r.condTag).toContain('solution annealed');
  });

  it('304L cold worked (CW)', () => {
    const r = htConditionMultiplier({ name: '304L — cold worked' });
    expect(r.f).toBe(1.40);
    expect(r.i).toBe(0.50);
  });
});

describe('htConditionMultiplier — Alloy steel Q+T (4140 etc.)', () => {
  it('4140 Q+T 450°C peak (baseline)', () => {
    const r = htConditionMultiplier({ name: 'AISI 4140 — Q+T 450°C' });
    expect(r.f).toBe(1.00);
  });

  it('4140 Q+T 200°C full hard', () => {
    const r = htConditionMultiplier({ name: 'AISI 4140 — Q+T 200°C' });
    expect(r.f).toBe(1.15);
    expect(r.i).toBe(0.40);
  });

  it('4140 Q+T 600°C high-temper', () => {
    const r = htConditionMultiplier({ name: 'AISI 4140 — Q+T 600°C' });
    expect(r.f).toBe(0.92);
  });

  it('4140 annealed (fully)', () => {
    const r = htConditionMultiplier({ name: 'AISI 4140 — Annealed' });
    expect(r.f).toBe(0.50);
  });
});

describe('htConditionMultiplier — Aluminum T-tempers', () => {
  it('AA 6061-T6 baseline (peak-aged)', () => {
    const r = htConditionMultiplier({ name: 'AA 6061-T6' });
    expect(r.f).toBe(1.00);
    expect(r.condTag).toContain('T6');
  });

  it('AA 7075-T6 baseline', () => {
    const r = htConditionMultiplier({ name: 'AA 7075-T6' });
    expect(r.f).toBe(1.00);
  });

  it('AA 7075-T7351 SCC-resistant over-aged', () => {
    const r = htConditionMultiplier({ name: 'AA 7075-T7351' });
    expect(r.f).toBe(0.78);
    expect(r.condTag).toContain('over-aged');
  });

  it('AA 6061-O annealed soft', () => {
    const r = htConditionMultiplier({ name: 'AA 6061 — O' });
    expect(r.f).toBe(0.40);
  });

  it('AA 5083-H32 (5xxx non-HT, 1/2 hard baseline)', () => {
    const r = htConditionMultiplier({ name: 'AA 5083-H32' });
    expect(r.f).toBe(1.00);
  });

  it('AA 5083-O (annealed soft)', () => {
    const r = htConditionMultiplier({ name: 'AA 5083 — O' });
    expect(r.f).toBe(0.50);
  });
});

describe('htConditionMultiplier — BeCu', () => {
  it('C17200 TF00 peak aged (baseline)', () => {
    const r = htConditionMultiplier({ name: 'Beryllium Copper C17200 — TF00' });
    expect(r.f).toBe(1.00);
  });

  it('C17200 TH04 CW+aged (high strength, low impact)', () => {
    const r = htConditionMultiplier({ name: 'C17200 — TH04' });
    expect(r.f).toBe(1.10);
    expect(r.i).toBe(0.40);
  });

  it('C17200 TB00 solution annealed (soft)', () => {
    const r = htConditionMultiplier({ name: 'C17200 — TB00' });
    expect(r.f).toBe(0.35);
  });
});

describe('htConditionMultiplier — CoCrMo', () => {
  it('CoCrMo solution annealed (baseline)', () => {
    const r = htConditionMultiplier({ name: 'CoCrMo F75' });
    expect(r.f).toBe(1.00);
  });

  it('CoCrMo as-built fine grain', () => {
    const r = htConditionMultiplier({ name: 'CoCrMo — As-built' });
    expect(r.f).toBe(1.05);
  });

  it('CoCrMo HIP', () => {
    const r = htConditionMultiplier({ name: 'CoCrMo — HIP' });
    expect(r.f).toBe(1.10);
  });
});

describe('htConditionMultiplier — bounds / null input', () => {
  it('null → identity multipliers', () => {
    const r = htConditionMultiplier(null);
    expect(r.f).toBe(1);
    expect(r.i).toBe(1);
    expect(r.k).toBe(1);
    expect(r.condTag).toBeNull();
  });

  it('empty material → identity', () => {
    const r = htConditionMultiplier({});
    expect(r.f).toBe(1.00);
    expect(r.condTag).toBeNull();
  });

  it('unknown alloy → identity', () => {
    const r = htConditionMultiplier({ name: 'Made-up alloy XYZ' });
    expect(r.f).toBe(1.00);
  });
});
