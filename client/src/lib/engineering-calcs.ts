/*
 * R210 B7 — Tools.tsx 9개 엔지니어링 계산기의 순수 수식 커널.
 * 이전: 공식이 전부 React 컴포넌트 본문에 인라인 → import·단위 테스트 불가.
 * 동작 보존: Tools.tsx 컴포넌트가 이 함수들을 호출하도록 리팩터(UI/숫자 결과 불변).
 * 레퍼런스: Pilkey(Peterson) · ASTM E140/A370 · ASME B&PV · Euler/Johnson · Larson-Miller · Schaeffler/DeLong.
 */

/* ── #3 응력 집중 계수 Kt (Pilkey 근사) ── */
export type KtShape = 'hole' | 'fillet' | 'sharpCorner' | 'shoulderCut';
export function ktFactor(shape: KtShape, { d = 10, w = 40, r = 2 }: { d?: number; w?: number; r?: number }): number {
  if (shape === 'hole') {
    const ratio = Math.min(0.95, d / w);
    return 2 + Math.pow(1 - ratio, 3);
  }
  if (shape === 'fillet') {
    const rd = r / d;
    return Math.max(1.05, Math.min(4.5, 1 + 0.65 * Math.pow(rd, -0.4)));
  }
  if (shape === 'sharpCorner') return 5.5;
  return 1.8 + 0.3 * Math.max(0, 1 - r / d); // shoulderCut
}

/* ── #4 갈바닉 전위차 ── */
export type CorrosionBand = 'safe' | 'caution' | 'danger';
export const galvanicDeltaV = (va: number, vb: number): number => Math.abs(va - vb);
export const galvanicBand = (deltaV: number): CorrosionBand =>
  deltaV < 0.15 ? 'safe' : deltaV < 0.30 ? 'caution' : 'danger';

/* ── #5 좌굴 임계하중 (Euler / Johnson) ── */
export interface BucklingResult {
  area: number; momentOfInertia: number; radiusGyration: number;
  effectiveLength: number; slenderness: number; lambdaC: number;
  isEuler: boolean; Pcr: number;
}
export function buckling({ L, d, E, sy, K }: { L: number; d: number; E: number; sy: number; K: number }): BucklingResult {
  const area = Math.PI * (d / 2) ** 2;               // mm²
  const momentOfInertia = Math.PI * Math.pow(d, 4) / 64; // mm⁴
  const radiusGyration = Math.sqrt(momentOfInertia / area);
  const effectiveLength = K * L;
  const slenderness = effectiveLength / radiusGyration;
  const lambdaC = Math.sqrt(2 * Math.PI ** 2 * (E * 1e3) / sy);
  const isEuler = slenderness > lambdaC;
  const Pcr_Euler = (Math.PI ** 2 * (E * 1e3) * momentOfInertia) / (effectiveLength ** 2) / 1000; // kN
  const Pcr_Johnson = (sy * (1 - sy * slenderness ** 2 / (4 * Math.PI ** 2 * E * 1e3)) * area) / 1000; // kN
  return { area, momentOfInertia, radiusGyration, effectiveLength, slenderness, lambdaC, isEuler, Pcr: isEuler ? Pcr_Euler : Pcr_Johnson };
}

/* ── #6 CTE mismatch 열응력: σ ≈ ΔCTE·ΔT·E ── */
export function thermalMismatchStress(cteA: number, cteB: number, dT: number, E: number): number {
  return (cteA - cteB) * dT * 1e-6 * E * 1000; // MPa (E in GPa)
}

/* ── #7 경도 변환 HV↔HRC↔HB + UTS (ASTM E140/A370 근사, 탄소·합금강) ── */
export type HardnessScale = 'HV' | 'HRC' | 'HB';
export interface HardnessResult { HV: number; HRC: number; HB: number; UTS: number; }
export function hardnessConvert(scale: HardnessScale, val: number): HardnessResult {
  let HV = val;
  if (scale === 'HRC') HV = Math.pow(val / 23.5, 1.7) * 50 + 100;
  if (scale === 'HB') HV = val * 1.05;
  const HRC = HV > 240 ? 23.5 * Math.pow((HV - 100) / 50, 1 / 1.7) : NaN;
  return { HV, HRC, HB: HV / 1.05, UTS: HV * 3.45 };
}

/* ── #9 압력 용기 두께 (얇은 벽) ── */
export type VesselShape = 'cyl' | 'sph';
export function pressureVesselThickness({ p, r, sy, SF, shape }: { p: number; r: number; sy: number; SF: number; shape: VesselShape }): { t: number; thick: boolean } {
  const t = shape === 'cyl' ? (p * r * SF) / sy : (p * r * SF) / (2 * sy);
  return { t, thick: t / r > 0.1 };
}

/* ── Larson-Miller (creep): LMP = T(K)·(C + log₁₀ t)/1000 ── */
export const larsonMiller = (T_celsius: number, t_hours: number, C: number): number =>
  (T_celsius + 273.15) * (C + Math.log10(t_hours)) / 1000;
/** 같은 LMP 에서 다른 온도의 파단 시간(h) 역산. */
export const larsonMillerInverseTime = (LMP: number, T2_celsius: number, C: number): number =>
  Math.pow(10, (LMP * 1000) / (T2_celsius + 273.15) - C);

/* ── Mohr's circle (2D 응력) ── */
export interface MohrResult { center: number; R: number; s1: number; s2: number; tauMax: number; angleDeg: number; vonMises: number; }
export function mohrCircle(sx: number, sy: number, txy: number): MohrResult {
  const center = (sx + sy) / 2;
  const R = Math.sqrt(((sx - sy) / 2) ** 2 + txy ** 2);
  const s1 = center + R;
  const s2 = center - R;
  const angleDeg = (Math.atan2(2 * txy, sx - sy) * 180 / Math.PI) / 2;
  return { center, R, s1, s2, tauMax: R, angleDeg, vonMises: Math.sqrt(s1 * s1 - s1 * s2 + s2 * s2) };
}

/* ── Schaeffler/DeLong (stainless 미세조직): Cr_eq / Ni_eq → phase ── */
export interface SchaefflerInput { Cr: number; Ni: number; Mo: number; Si: number; Nb: number; C: number; N: number; Mn: number; }
export interface SchaefflerResult { crEq: number; niEq: number; phase: string; }
export function schaefflerEq({ Cr, Ni, Mo, Si, Nb, C, N, Mn }: SchaefflerInput): SchaefflerResult {
  const crEq = Cr + Mo + 1.5 * Si + 0.5 * Nb;
  // R209 A-12 — 비표준 0.3·Cu 제거 (Schaeffler/DeLong 표준 아님).
  const niEq = Ni + 30 * C + 30 * N + 0.5 * Mn;
  let phase: string;
  if (niEq > 25) phase = 'γ Austenite';
  else if (crEq > 25 && niEq < 5) phase = 'α Ferrite';
  else if (niEq < 8 && crEq > 12) phase = "α' Martensite";
  else phase = 'A+F (Duplex 영역)';
  return { crEq, niEq, phase };
}
