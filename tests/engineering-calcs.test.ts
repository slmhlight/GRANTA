/*
 * R210 B7 — engineering-calcs 순수 수식 회귀 테스트 (핸드북 레퍼런스 대조).
 */
import { describe, it, expect } from 'vitest';
import {
  ktFactor, validateKt, galvanicDeltaV, galvanicBand, galvanicAnode, buckling, validateBuckling, thermalMismatchStress,
  hardnessConvert, validateHardness, pressureVesselThickness, validateVessel, larsonMiller, larsonMillerInverseTime, validateLMP, lmpResult,
  mohrCircle, schaefflerEq, schaefflerRegion, validateSchaeffler, SCHAEFFLER_EXAMPLES, SCHAEFFLER_LINES,
} from '@/lib/engineering-calcs';
import { steelHardness } from '@/lib/hardness-convert';

describe('ktFactor (Kt)', () => {
  it('무한판 중앙 구멍(d≪w) → 3.0', () => {
    expect(ktFactor('hole', { d: 0.01, w: 1000 })).toBeCloseTo(3, 2);
  });
  it('d/w=0.5 → 2 + (0.5)³ = 2.125', () => {
    expect(ktFactor('hole', { d: 20, w: 40 })).toBeCloseTo(2.125, 3);
  });
  it('sharpCorner 는 특이점 → Infinity (유한 상수 금지, AUD F15), fillet 은 [1.05,4.5] clamp', () => {
    expect(ktFactor('sharpCorner', {})).toBe(Number.POSITIVE_INFINITY);
    expect(ktFactor('fillet', { d: 10, r: 1e6 })).toBe(1.05); // r 큼 → 하한
  });
  it('validateKt — 판보다 큰 구멍(d≥w)·0·음수·r=0 을 거부한다 (AUD F13)', () => {
    expect(validateKt('hole', { d: 10, w: 1, r: 2 }).map((i) => i.field)).toContain('d');
    expect(validateKt('hole', { d: 0, w: 40, r: 2 }).length).toBeGreaterThan(0);
    expect(validateKt('fillet', { d: 10, w: 40, r: 0 }).map((i) => i.field)).toEqual(['r']);
    expect(validateKt('hole', { d: 10, w: 40, r: 2 })).toEqual([]);
    expect(validateKt('sharpCorner', { d: 0, w: 0, r: 0 })).toEqual([]);   // 입력 없음 — 특이점 안내만
  });
});

describe('galvanic', () => {
  it('ΔV = |va-vb|, band 임계 0.15/0.30', () => {
    expect(galvanicDeltaV(-0.6, -0.05)).toBeCloseTo(0.55, 6);
    expect(galvanicBand(0.1)).toBe('safe');
    expect(galvanicBand(0.2)).toBe('caution');
    expect(galvanicBand(0.4)).toBe('danger');
  });
  it('양극은 전위가 낮은 쪽 — A/B 순서를 바꿔도 같은 금속이 부식된다 (AUD F16)', () => {
    expect(galvanicAnode(-1.65, 0.30)).toBe('A');   // Mg vs Au
    expect(galvanicAnode(0.30, -1.65)).toBe('B');   // Au vs Mg
    expect(galvanicAnode(-0.3, -0.3)).toBeNull();
  });
});

describe('buckling (Euler/Johnson)', () => {
  it('단면 기하: d=20 → A≈314.16, I≈7853.98, k=5', () => {
    const r = buckling({ L: 500, d: 20, E: 200, sy: 250, K: 1 });
    expect(r.area).toBeCloseTo(314.16, 1);
    expect(r.momentOfInertia).toBeCloseTo(7853.98, 1);
    expect(r.radiusGyration).toBeCloseTo(5, 3);
  });
  it('짧은 기둥(slender<임계)은 Johnson', () => {
    const r = buckling({ L: 500, d: 20, E: 200, sy: 250, K: 1 });
    expect(r.slenderness).toBeCloseTo(100, 1);
    expect(r.isEuler).toBe(false);
    expect(r.Pcr).toBeGreaterThan(0);
  });
  it('가는 기둥(slender>임계)은 Euler', () => {
    const r = buckling({ L: 2000, d: 20, E: 200, sy: 250, K: 1 });
    expect(r.isEuler).toBe(true);
    expect(r.Pcr).toBeCloseTo(3.88, 1); // π²EI/Le²
  });
});

describe('thermalMismatchStress', () => {
  it('ΔCTE 11·ΔT 100·E 200GPa → 220 MPa', () => {
    expect(thermalMismatchStress(23, 12, 100, 200)).toBeCloseTo(220, 6);
  });
});

describe('hardnessConvert (ASTM E140-12b Table 1·2, 비오스테나이트 강) — AUD F02', () => {
  it('HRC 30 ↔ HV 302 · HB 286 · 인장 ≈ 951 MPa (138 ksi) — 표 앵커', () => {
    const r = hardnessConvert('HRC', 30);
    expect(r.HV).toBeCloseTo(302, 6);
    expect(r.HB).toBeCloseTo(286, 6);
    expect(r.UTS).toBeCloseTo(138 * 6.894757, 1);
    expect(r.HRC).toBeCloseTo(30, 6);
  });
  it('HRC 50 → HV 513 · HB 481 · 255 ksi ; HV 300 → HRC ≈ 29.75 (보간)', () => {
    const r = hardnessConvert('HRC', 50);
    expect(r.HV).toBeCloseTo(513, 6);
    expect(r.HB).toBeCloseTo(481, 6);
    expect(r.UTS).toBeCloseTo(255 * 6.894757, 1);
    expect(hardnessConvert('HV', 300).HRC).toBeCloseTo(29.75, 2);
  });
  it('왕복 — HRC→HV→HRC 가 원래 값을 복원한다 (예전 식은 HRC 30 → HV 176 → "범위 외")', () => {
    for (const hrc of [22, 30, 45, 60]) {
      const hv = hardnessConvert('HRC', hrc).HV!;
      expect(hardnessConvert('HV', hv).HRC).toBeCloseTo(hrc, 6);
    }
  });
  it('HRB 범위 — HRB 100 → HV 240 · 116 ksi ; HRB 75 → HV 137 ; HRC 는 null (표 밖)', () => {
    expect(hardnessConvert('HRB', 100).HV).toBeCloseTo(240, 6);
    // 인장 근사열은 두 표의 접합 구간(HV 210~238)에서 잇기 때문에 HRB 100(HV 240)이 아니라 Table 2 안쪽 HRB 90 으로 앵커.
    expect(hardnessConvert('HRB', 90).HV).toBeCloseTo(185, 6);
    expect(hardnessConvert('HRB', 90).UTS).toBeCloseTo(89 * 6.894757, 1);
    const r = hardnessConvert('HRB', 75);
    expect(r.HV).toBeCloseTo(137, 6);
    expect(r.HRC).toBeNull();
  });
  it('표 밖 입력은 환산하지 않는다 — HRC 10 · HV 50 · HB 900 → 전부 null, validateHardness 가 이유를 준다', () => {
    for (const [sc, v] of [['HRC', 10], ['HV', 50], ['HB', 900]] as const) {
      const r = hardnessConvert(sc, v);
      expect(r.HV).toBeNull(); expect(r.HRC).toBeNull(); expect(r.UTS).toBeNull();
      expect(validateHardness(sc, v).length).toBe(1);
    }
    expect(validateHardness('HV', 300)).toEqual([]);
  });
  it('클라이언트 커널 === 빌드 커널(scripts/lib/hardness-convert.mjs) — 같은 표, 같은 값', async () => {
    const mjs = await import('../scripts/lib/hardness-convert.mjs');
    for (const [sc, v] of [['HRC', 30], ['HRC', 58], ['HRB', 90], ['HB', 187], ['HV', 500]] as const) {
      const a = steelHardness(sc, v), b = mjs.steelHardness(sc, v);
      expect(a.HV).toBeCloseTo(b.HV, 9); expect(a.HB ?? -1).toBeCloseTo(b.HB ?? -1, 9);
    }
    expect(mjs.toHV('aluminum', 'HB', 95)).toEqual({ hv: 111, table: 'ASTM E140-12b Table 9' });
    expect(mjs.toHV('brass', 'HRB', 26)).toEqual({ hv: 71, table: 'ASTM E140-12b Table 4' });
    expect(mjs.toHV('aluminum', 'HB', 31)).toBeNull();   // 표 밖(HB<40) — 외삽 금지
  });
});

describe('pressureVesselThickness', () => {
  it('원통 hoop: p10·r150·SF3/σ250 = 18 mm, t/r=0.12 → 두꺼운 벽 + Lamé 해 (AUD R07)', () => {
    const r = pressureVesselThickness({ p: 10, r: 150, sy: 250, SF: 3, shape: 'cyl' });
    expect(r.t).toBeCloseTo(18, 6);
    expect(r.thick).toBe(true);
    // Lamé: ro = ri·√((σa+p)/(σa−p)), σa = 250/3 = 83.33 → ro = 150·√(93.33/73.33) = 169.23 → t ≈ 19.23
    expect(r.tLame).toBeCloseTo(150 * Math.sqrt((250 / 3 + 10) / (250 / 3 - 10)) - 150, 6);
    expect(r.tLame!).toBeGreaterThan(r.t);   // 두꺼운 벽 해는 얇은 벽 식보다 두껍다
  });
  it('구형은 원통의 절반 두께', () => {
    const r = pressureVesselThickness({ p: 10, r: 150, sy: 250, SF: 3, shape: 'sph' });
    expect(r.t).toBeCloseTo(9, 6);
    expect(r.thick).toBe(false);
  });
  it('허용응력 ≤ p 면 Lamé 해 없음(null) · validateVessel 이 0/음수/SF<1 을 거부', () => {
    expect(pressureVesselThickness({ p: 100, r: 100, sy: 250, SF: 3, shape: 'cyl' }).tLame).toBeNull();
    expect(validateVessel({ p: 0, r: 100, sy: 250, SF: 3 }).map((i) => i.field)).toEqual(['p']);
    expect(validateVessel({ p: 10, r: 100, sy: 250, SF: 0.5 }).map((i) => i.field)).toEqual(['SF']);
  });
});

describe('Larson-Miller', () => {
  it('T600°C·t1000h·C20 → LMP ≈ 20.08 (×10³)', () => {
    expect(larsonMiller(600, 1000, 20)).toBeCloseTo(20.08, 2);
  });
  it('역산이 원래 시간을 복원 (round-trip)', () => {
    const lmp = larsonMiller(600, 1000, 20);
    expect(larsonMillerInverseTime(lmp, 600, 20)).toBeCloseTo(1000, 0);
  });
  it('validateLMP — 절대영도 이하·t≤0 을 거부한다 (AUD F13: T=−273.15 에서 NaN 노출)', () => {
    expect(validateLMP({ T: -273.15, t: 1000, C: 20, T2: -273.15 }).map((i) => i.field)).toEqual(['T', 'T2']);
    expect(validateLMP({ T: 600, t: 0, C: 20, T2: 650 }).map((i) => i.field)).toEqual(['t']);
    expect(validateLMP({ T: 600, t: 1000, C: 20, T2: 650 })).toEqual([]);
  });
  /* AUD F13 잔여 (2026-09-22) — 절대영도보다 0.01 K 높은 T₂ 는 검사를 통과했고 결과가 Infinity h 였다. */
  it('validateLMP — 모델 적용 온도 범위(0–1500°C) 밖·t/C 상한 초과를 거부한다', () => {
    for (const T2 of [-273.16, -273.15, -273.14, -1, 1501]) {
      expect(validateLMP({ T: 600, t: 1000, C: 20, T2 }).map((i) => i.field), `T2=${T2}`).toEqual(['T2']);
    }
    expect(validateLMP({ T: 600, t: 1e12, C: 20, T2: 650 }).map((i) => i.field)).toEqual(['t']);
    expect(validateLMP({ T: 600, t: 1000, C: 400, T2: 650 }).map((i) => i.field)).toEqual(['C']);
    expect(validateLMP({ T: 0, t: 1000, C: 20, T2: 1500 })).toEqual([]);
  });
  it('lmpResult — 유효 입력에서만 유한 결과, 그 밖은 null; 극단 입력에서도 NaN/Infinity 가 결과로 나오지 않는다', () => {
    const r = lmpResult({ T: 600, t: 1000, C: 20, T2: 650 })!;
    expect(r.finite).toBe(true);
    expect(Number.isFinite(r.t2) && Number.isFinite(r.log10t2)).toBe(true);
    expect(r.log10t2).toBeCloseTo(Math.log10(r.t2), 6);
    expect(r.extrapolated).toBe(false);
    expect(lmpResult({ T: 600, t: 1000, C: 20, T2: -273.14 })).toBeNull();
    expect(lmpResult({ T: 600, t: 1000, C: 20, T2: 1e9 })).toBeNull();
    // 범위 안의 극단 조합(1500°C·10⁹ h·C 60 → 0°C)은 숫자로 유한하지 않을 수 있다 — 그때 finite=false 로 표시가 막힌다
    const ex = lmpResult({ T: 1500, t: 1e9, C: 60, T2: 0 });
    expect(ex).not.toBeNull();
    if (ex!.finite) expect(Number.isFinite(ex!.t2)).toBe(true);
  });
});

describe('mohrCircle', () => {
  it('σx100·σy40·τ30 → σ1≈112.4, σ2≈27.6, τmax≈42.4, 2θ/2=22.5°', () => {
    const r = mohrCircle(100, 40, 30);
    expect(r.center).toBe(70);
    expect(r.R).toBeCloseTo(42.43, 2);
    expect(r.s1).toBeCloseTo(112.43, 2);
    expect(r.s2).toBeCloseTo(27.57, 2);
    expect(r.tauMax).toBeCloseTo(42.43, 2);
    expect(r.angleDeg).toBeCloseTo(22.5, 2);
  });
  it('절대 최대 전단 (σ₃=0 포함) — 기본 예제 112.43/2 ≈ 56.2 MPa (AUD R06)', () => {
    expect(mohrCircle(100, 40, 30).tauMaxAbs).toBeCloseTo(56.21, 2);
    expect(mohrCircle(100, -100, 0).tauMaxAbs).toBeCloseTo(100, 6);   // 순수 전단: 면내 = 절대
  });
});

describe('schaefflerEq — 직선 근사 경계 (AUD F14: 그림·판정·예시가 한 식)', () => {
  it('등가식: Cr_eq = Cr+Mo+1.5Si+0.5Nb, Ni_eq = Ni+30C+30N+0.5Mn', () => {
    const r = schaefflerEq({ Cr: 18, Ni: 10, Mo: 0, Si: 0.5, Nb: 0, C: 0.05, N: 0.04, Mn: 1.5 });
    expect(r.crEq).toBeCloseTo(18.75, 6);
    expect(r.niEq).toBeCloseTo(13.45, 6);
    expect(r.phase).toBe('γ Austenite');   // 0 % ferrite 선(1.125·(18.75−8)=12.09) 위
  });
  it('전형 합금의 영역 — 304 A+F(수 %) · 310 γ · 2205 A+F(≈50 %) · 17-4/430 M+F · 446 α · 410 α′', () => {
    const by = Object.fromEntries(SCHAEFFLER_EXAMPLES.map((e) => [e.label.split(' ')[0], schaefflerEq(e.comp)]));
    expect(by['304'].phase).toBe('A+F'); expect(by['304'].ferritePct!).toBeLessThanOrEqual(5);
    expect(by['310'].phase).toBe('γ Austenite');
    expect(by['2205'].phase).toBe('A+F'); expect(by['2205'].ferritePct!).toBeGreaterThan(30); expect(by['2205'].ferritePct!).toBeLessThan(65);
    expect(by['17-4'].phase).toBe('M+F');
    expect(by['430'].phase).toBe('M+F');
    expect(by['446'].phase).toBe('α Ferrite');
    expect(by['410'].phase).toBe("α' Martensite");
  });
  it('경계 양쪽 — 같은 Cr_eq 에서 Ni_eq 를 0 % ferrite 선 위/아래로 두면 γ / A+F 로 갈린다', () => {
    const x = 22, yA = SCHAEFFLER_LINES.A(x);
    expect(schaefflerRegion(x, yA + 0.01).phase).toBe('γ Austenite');
    expect(schaefflerRegion(x, yA - 0.01).phase).toBe('A+F');
    const yF = SCHAEFFLER_LINES.F(30);
    expect(schaefflerRegion(30, yF - 0.01).phase).toBe('α Ferrite');
  });
  it('validateSchaeffler — 음수·100 % 초과·합계 초과를 거부한다 (AUD F13: Cr=−10 % 도 판정됐다)', () => {
    const base = { Cr: 18, Ni: 8, Mo: 0, Si: 0.5, Nb: 0, C: 0.05, N: 0.04, Mn: 1.5 };
    expect(validateSchaeffler({ ...base, Cr: -10 }).map((i) => i.field)).toEqual(['Cr']);
    expect(validateSchaeffler({ ...base, Cr: 60, Ni: 50 }).map((i) => i.field)).toEqual(['sum']);
    expect(validateSchaeffler(base)).toEqual([]);
  });
});

describe('입력 검증 — buckling', () => {
  it('validateBuckling 이 0/음수 치수를 거부한다', () => {
    expect(validateBuckling({ L: 0, d: 20, E: 200, sy: 250, K: 1 }).map((i) => i.field)).toEqual(['L']);
    expect(validateBuckling({ L: 500, d: 20, E: 200, sy: 250, K: 1 })).toEqual([]);
  });
});
