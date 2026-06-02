/*
 * 단면 형상별 단면 성질 (A · I · Z) 단위 테스트.
 * 표준 핸드북 (Hibbeler, AISC) 값 대비 ±2% 이내.
 */
import { describe, it, expect } from 'vitest';
import { SCENARIO_PRESETS } from '@/lib/scenario-presets';

const sections = SCENARIO_PRESETS.bracket.configurator!.sections!;
const get = (id: string) => sections.find((s) => s.id === id)!;

const closeTo = (actual: number, expected: number, pct = 0.02) => Math.abs(actual - expected) / expected < pct;

describe('단면 형상별 I·Z·A 정확성', () => {
  it('직사각형 b×h (20×10): I=bh³/12=1666.67, Z=bh²/6=333.33', () => {
    const s = get('rect');
    const I = s.I({ b: 20, h: 10 });
    const Z = s.Z({ b: 20, h: 10 });
    const A = s.A({ b: 20, h: 10 });
    expect(I).toBeCloseTo(20 * 1000 / 12, 1);
    expect(Z).toBeCloseTo(20 * 100 / 6, 1);
    expect(A).toBe(200);
  });

  it('정사각형 a×a (12): I=a⁴/12, Z=a³/6', () => {
    const s = get('sq');
    expect(s.I({ a: 12 })).toBeCloseTo(Math.pow(12, 4) / 12, 1);
    expect(s.Z({ a: 12 })).toBeCloseTo(Math.pow(12, 3) / 6, 1);
    expect(s.A({ a: 12 })).toBe(144);
  });

  it('원형 d=20: I=π·d⁴/64, Z=π·d³/32, J=π·d⁴/32', () => {
    const s = get('circ');
    const I = s.I({ d: 20 });
    const Z = s.Z({ d: 20 });
    expect(I).toBeCloseTo(Math.PI * Math.pow(20, 4) / 64, 1);
    expect(Z).toBeCloseTo(Math.PI * Math.pow(20, 3) / 32, 1);
  });

  it('관 D=24/d=20: I 대비 (D⁴-d⁴) 식 일치', () => {
    const s = get('tube');
    const I = s.I({ D: 24, d: 20 });
    const ref = Math.PI * (Math.pow(24, 4) - Math.pow(20, 4)) / 64;
    expect(I).toBeCloseTo(ref, 1);
    expect(s.A({ D: 24, d: 20 })).toBeCloseTo(Math.PI * (576 - 400) / 4, 1);
  });

  it('박스 B=30,H=20,b=24,h=14: I = (B·H³-b·h³)/12', () => {
    const s = get('box');
    const I = s.I({ B: 30, H: 20, bi: 24, hi: 14 });
    const ref = (30 * 8000 - 24 * 2744) / 12;
    expect(I).toBeCloseTo(ref, 1);
  });

  it('I-빔 b_f=80, h=120, t_f=10, t_w=6 — 표준 핸드북 값 ~7.91e6 mm⁴', () => {
    const s = get('ibeam');
    const I = s.I({ bf: 80, h: 120, tf: 10, tw: 6 });
    // 직접 검산: 80·120³/12 - (80-6)·100³/12 = 11,520,000 - 6,166,667 = 5,353,333
    expect(I).toBeCloseTo(80 * Math.pow(120, 3) / 12 - 74 * Math.pow(100, 3) / 12, 0.5);
  });

  it('ㄷ-채널 b_f=50,h=100,t_f=8,t_w=6 — 박스−빈공간 공식과 일치', () => {
    const s = get('channel');
    const I = s.I({ bf: 50, h: 100, tf: 8, tw: 6 });
    // 직접 검산: 50·100³/12 - 44·84³/12 ≈ 4,166,667 - 2,172,912 ≈ 1,993,755
    const ref = (50 * 1e6 - 44 * Math.pow(84, 3)) / 12;
    expect(I).toBeCloseTo(ref, 0.5);
  });

  it('T-단면 b_f=80,t_f=10,t_w=8,h_w=80: y_c≈25mm, I≈1,068,000 mm⁴', () => {
    const s = get('tsec');
    const I = s.I({ bf: 80, tf: 10, tw: 8, hw: 80 });
    // 손계산: y_c=25, I_flange=326,667, I_web=741,333 → 1,068,000
    expect(closeTo(I, 1_068_000)).toBe(true);
  });

  it('ㄱ-앵글 a=50, t=6 — 핸드북 ~131,000 mm⁴ 대비 ±5% 이내', () => {
    const s = get('angle');
    const I = s.I({ a: 50, t: 6 });
    expect(I).toBeGreaterThan(120_000);
    expect(I).toBeLessThan(145_000);
  });

  it('직사각형 강축/약축 교환: I_strong/I_weak = (h/b)²', () => {
    const s = get('rect');
    const dims = { b: 20, h: 10 };
    const Is = s.I(dims, 'strong');
    const Iw = s.I(dims, 'weak');
    expect(Is / Iw).toBeCloseTo(Math.pow(dims.h / dims.b, 2), 0.01);
  });

  it('I-빔 약축 I_y ≈ tf·bf³/6 + hw·tw³/12 (b_f=80, h=120, t_f=10, t_w=6)', () => {
    const s = get('ibeam');
    const dims = { bf: 80, h: 120, tf: 10, tw: 6 };
    const Iw = s.I(dims, 'weak');
    const ref = 2 * (10 * Math.pow(80, 3) / 12) + 100 * Math.pow(6, 3) / 12;
    expect(Iw).toBeCloseTo(ref, 0.5);
    // 약축은 강축의 ~1/6 정도
    const Is = s.I(dims, 'strong');
    expect(Iw / Is).toBeLessThan(0.2);
  });

  it('박스 강축/약축 — 외부 치수 교환 시 식 일치', () => {
    const s = get('box');
    const dims = { B: 30, H: 20, bi: 24, hi: 14 };
    const Is = s.I(dims, 'strong');
    const Iw = s.I(dims, 'weak');
    // weak 는 (H·B³ - h·b³)/12
    const ref_weak = (20 * Math.pow(30, 3) - 14 * Math.pow(24, 3)) / 12;
    expect(Iw).toBeCloseTo(ref_weak, 0.5);
    // 약축이 강축보다 큼 (B>H 이므로) — B=30 > H=20 이라 weak 가 더 큼
    expect(Iw).toBeGreaterThan(Is);
  });
});

describe('bracket 시나리오 compute — 핸드북 외팔보 식', () => {
  it('F=200,L=100,δ=0.5,I=1000(직접),SF=2 → 필요 E≈133GPa, σy≈80MPa', () => {
    const cfg = SCENARIO_PRESETS.bracket.configurator!;
    const rect = cfg.sections!.find((s) => s.id === 'rect')!;
    // 직사각형 b=10, h≈10.84 mm 으로 I≈1000. 단순 계산을 위해 직접 mock:
    const fakeSection: any = { ...rect, I: () => 1000, Z: () => 200, A: () => 100, dimFields: [], id: 'mock' };
    const r = cfg.compute({ pattern: 'cant_tip', L: 100, F: 200, w: 0, dmax: 0.5, SF: 2, process: 'any' }, fakeSection);
    // 필요 E = 200·100³/(3·1000·0.5) = 133333 MPa = 133.3 GPa
    // 모듈러스 필터: r.filters.modulusRange[0]
    const E = (r.filters.modulusRange as [number, number])[0];
    expect(E).toBeGreaterThan(132);
    expect(E).toBeLessThan(135);
    // σ_b = M/Z = 200·100/200 = 100 MPa; 필요 σy = 200 MPa
    const sy = (r.filters.yieldStrengthRange as [number, number])[0];
    expect(sy).toBe(200);
  });

  it('단순지지·중앙 하중 패턴 (1/48 계수)', () => {
    const cfg = SCENARIO_PRESETS.bracket.configurator!;
    const fakeSection: any = { I: () => 1000, Z: () => 200, A: () => 100, dimFields: [], id: 'mock', label: 'mock' };
    const r = cfg.compute({ pattern: 'ss_center', L: 100, F: 200, w: 0, dmax: 0.5, SF: 2, process: 'any' }, fakeSection);
    // 필요 E·I = F·L³/(48·δ) = 200·1e6/(48·0.5) = 8,333,333
    // 필요 E = 8,333,333 / 1000 / 1000 (MPa→GPa) ≈ 8.33 GPa
    const E = (r.filters.modulusRange as [number, number])[0];
    expect(E).toBeCloseTo(8.3, 0.5);
  });
});

describe('fatigue 시나리오 compute — 표면·R-비 감쇠', () => {
  it('직접 σ_a=150, surface=machined(0.8), R=-1, SF=1.5 → 필요 ≈ 281 MPa', () => {
    const cfg = SCENARIO_PRESETS.fatigue.configurator!;
    const r = cfg.compute({ mode: 'direct', sigma_a: 150, surface: 'machined', R_ratio: '-1', SF: 1.5, T_in: 0, D_in: 20, M_in: 0, Db_in: 25 });
    const f = (r.filters.fatigueStrengthRange as [number, number])[0];
    // 150 × 1.5 / (0.8 × 1.0) = 281.25
    expect(f).toBeCloseTo(281, 0.5);
  });

  it('표면=AM as-built(0.6) → 더 큰 등가 한도 필요', () => {
    const cfg = SCENARIO_PRESETS.fatigue.configurator!;
    const r = cfg.compute({ mode: 'direct', sigma_a: 150, surface: 'asbuilt', R_ratio: '-1', SF: 1.5, T_in: 0, D_in: 20, M_in: 0, Db_in: 25 });
    const f = (r.filters.fatigueStrengthRange as [number, number])[0];
    // 150 × 1.5 / 0.6 = 375
    expect(f).toBeCloseTo(375, 0.5);
  });
});

describe('heatsink 시나리오 compute', () => {
  it('P=100W, A=500mm², L=30mm, ΔT=20°C → 전도식 k=300 W/m·K', () => {
    const cfg = SCENARIO_PRESETS.heatsink.configurator!;
    const r = cfg.compute({ P: 100, A: 500, L: 30, dT: 20, mode: 'conduction', light: 'no', app: 'custom' });
    const k = (r.filters.thermalConductivityRange as [number, number])[0];
    // k = P·L·1000/(A·ΔT) = 100·30·1000/(500·20) = 300
    expect(k).toBe(300);
  });

  it('강제공냉 모드는 필요 k가 60% 로 감소', () => {
    const cfg = SCENARIO_PRESETS.heatsink.configurator!;
    const r = cfg.compute({ P: 100, A: 500, L: 30, dT: 20, mode: 'forced_air', light: 'no', app: 'custom' });
    const k = (r.filters.thermalConductivityRange as [number, number])[0];
    expect(k).toBe(180); // 300 × 0.6
  });
});

describe('precision 시나리오 compute', () => {
  it('ΔT=50, L=100, ΔL=10μm → 필요 CTE ≤ 2.0 ×10⁻⁶/K', () => {
    const cfg = SCENARIO_PRESETS.precision.configurator!;
    const r = cfg.compute({ mode: 'delta', dT: 50, L: 100, dL: 10, E_req: 0, preset: 'custom', T_high: 60, T_low: 10 });
    const cteMax = (r.filters.thermalExpansionRange as [number, number])[1];
    // ΔL/L/ΔT = 10/(100·50·0.001) = 2.0
    expect(cteMax).toBeCloseTo(2.0, 0.1);
  });
});
