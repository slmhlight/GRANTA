/*
 * R210 B7 — engineering-calcs 순수 수식 회귀 테스트 (핸드북 레퍼런스 대조).
 */
import { describe, it, expect } from 'vitest';
import {
  ktFactor, galvanicDeltaV, galvanicBand, buckling, thermalMismatchStress,
  hardnessConvert, pressureVesselThickness, larsonMiller, larsonMillerInverseTime,
  mohrCircle, schaefflerEq,
} from '@/lib/engineering-calcs';

describe('ktFactor (Kt)', () => {
  it('무한판 중앙 구멍(d≪w) → 3.0', () => {
    expect(ktFactor('hole', { d: 0.01, w: 1000 })).toBeCloseTo(3, 2);
  });
  it('d/w=0.5 → 2 + (0.5)³ = 2.125', () => {
    expect(ktFactor('hole', { d: 20, w: 40 })).toBeCloseTo(2.125, 3);
  });
  it('sharpCorner 고정 5.5, fillet 은 [1.05,4.5] clamp', () => {
    expect(ktFactor('sharpCorner', {})).toBe(5.5);
    expect(ktFactor('fillet', { d: 10, r: 1e6 })).toBe(1.05); // r 큼 → 하한
  });
});

describe('galvanic', () => {
  it('ΔV = |va-vb|, band 임계 0.15/0.30', () => {
    expect(galvanicDeltaV(-0.6, -0.05)).toBeCloseTo(0.55, 6);
    expect(galvanicBand(0.1)).toBe('safe');
    expect(galvanicBand(0.2)).toBe('caution');
    expect(galvanicBand(0.4)).toBe('danger');
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

describe('hardnessConvert (ASTM A370)', () => {
  it('HV 300 → UTS ≈ 1035 MPa (3.45×HV), HB ≈ 285.7', () => {
    const r = hardnessConvert('HV', 300);
    expect(r.HV).toBe(300);
    expect(r.UTS).toBeCloseTo(1035, 6);
    expect(r.HB).toBeCloseTo(285.71, 1);
    expect(r.HRC).toBeGreaterThan(50); // 경강 영역
    expect(Number.isFinite(r.HRC)).toBe(true);
  });
  it('낮은 HV(<240)는 HRC 범위 밖 → NaN', () => {
    expect(Number.isNaN(hardnessConvert('HV', 150).HRC)).toBe(true);
  });
});

describe('pressureVesselThickness', () => {
  it('원통 hoop: p10·r150·SF3/σ250 = 18 mm, t/r=0.12 → 두꺼운 벽', () => {
    const r = pressureVesselThickness({ p: 10, r: 150, sy: 250, SF: 3, shape: 'cyl' });
    expect(r.t).toBeCloseTo(18, 6);
    expect(r.thick).toBe(true);
  });
  it('구형은 원통의 절반 두께', () => {
    const r = pressureVesselThickness({ p: 10, r: 150, sy: 250, SF: 3, shape: 'sph' });
    expect(r.t).toBeCloseTo(9, 6);
    expect(r.thick).toBe(false);
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
});

describe('schaefflerEq', () => {
  it('304-유사 조성 → Cr_eq/Ni_eq + 영역', () => {
    const r = schaefflerEq({ Cr: 18, Ni: 10, Mo: 0, Si: 0.5, Nb: 0, C: 0.05, N: 0.04, Mn: 1.5 });
    expect(r.crEq).toBeCloseTo(18.75, 6);
    expect(r.niEq).toBeCloseTo(13.45, 6);
    expect(r.phase).toContain('A+F');
  });
  it('고-Ni → austenite, 저-Ni/고-Cr → martensite', () => {
    expect(schaefflerEq({ Cr: 18, Ni: 30, Mo: 0, Si: 0, Nb: 0, C: 0, N: 0, Mn: 0 }).phase).toContain('Austenite');
    expect(schaefflerEq({ Cr: 13, Ni: 1, Mo: 0, Si: 0, Nb: 0, C: 0.1, N: 0, Mn: 0 }).phase).toContain('Martensite');
  });
});
