/*
 * R210 B7 — Tools.tsx 9개 엔지니어링 계산기의 순수 수식 커널.
 * 이전: 공식이 전부 React 컴포넌트 본문에 인라인 → import·단위 테스트 불가.
 * 동작 보존: Tools.tsx 컴포넌트가 이 함수들을 호출하도록 리팩터(UI/숫자 결과 불변).
 * 레퍼런스: Pilkey(Peterson) · ASTM E140 · ASME B&PV · Euler/Johnson · Larson-Miller · Schaeffler/DeLong · Roark(Lamé).
 *
 * AUD (2026-09-22, 감사 F02·F13·F14·F15·R06·R07) — 커널이 "모델 밖 입력" 을 숫자로 돌려주지 않는다:
 *   · 입력 검증은 각 계산기의 validate*() 가 담당하고 UI 는 오류가 있으면 결과를 숨긴다(NaN/Infinity 노출 0).
 *   · 경도는 출처 없는 식 대신 ASTM E140-12b 표(hardness-convert.ts)를 쓴다.
 *   · sharp corner 는 특이점(r=0 → Kt→∞) — 유한 수치를 돌려주지 않는다.
 *   · Schaeffler 는 그림·판정·예시가 같은 경계식(SCHAEFFLER_LINES)을 쓴다.
 */
import { steelHardness } from './hardness-convert';

/** 입력 검증 결과 — 빈 배열이면 유효. 메시지는 입력 이름을 앞에 둬 어느 칸이 문제인지 읽히게 한다. */
export type ValidationIssue = { field: string; msg: string };
const finite = (v: number) => Number.isFinite(v);

/* ── #3 응력 집중 계수 Kt (Pilkey 근사) ── */
/* 선택지는 **런타임 배열이 SSOT** 고 타입은 거기서 파생한다 — UI 의 <option> 목록을 이
   배열로 렌더하면 선택지와 상태 타입이 어긋날 수 없다(어긋나면 예전처럼 `as any` 로만
   넘어간다). 새 항목을 추가하면 라벨 Record 와 아래 계산식이 함께 걸린다. */
export const KT_SHAPES = ['hole', 'fillet', 'sharpCorner', 'shoulderCut'] as const;
export type KtShape = typeof KT_SHAPES[number];
/**
 * Kt. sharpCorner 는 `Infinity` 를 돌려준다 — 이론상 r=0 은 응력 특이점이라 유한 Kt 가 없다
 * (이전의 상수 5.5 는 근거 없는 수치였다, 감사 F15). UI 는 이를 "∞ · 유한 반경 필요" 로 표시한다.
 */
export function ktFactor(shape: KtShape, { d = 10, w = 40, r = 2 }: { d?: number; w?: number; r?: number }): number {
  if (shape === 'hole') {
    const ratio = Math.min(0.95, d / w);
    return 2 + Math.pow(1 - ratio, 3);
  }
  if (shape === 'fillet') {
    const rd = r / d;
    return Math.max(1.05, Math.min(4.5, 1 + 0.65 * Math.pow(rd, -0.4)));
  }
  if (shape === 'sharpCorner') return Number.POSITIVE_INFINITY;
  if (shape === 'shoulderCut') return 1.8 + 0.3 * Math.max(0, 1 - r / d);
  /* KtShape 에 항목을 추가하고 식을 안 쓰면 여기서 컴파일이 깨진다 — 예전에는 마지막 식이
     조용히 모든 미처리 형상의 답이 됐다. */
  const _exhaustive: never = shape;
  return _exhaustive;
}
/** Kt 입력 검증 — 구멍은 0<d<w(판보다 큰 구멍 금지, 감사 F13), 필릿·숄더는 r>0·d>0. */
export function validateKt(shape: KtShape, { d, w, r }: { d: number; w: number; r: number }): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (shape === 'hole') {
    if (!finite(d) || d <= 0) out.push({ field: 'd', msg: '구멍 지름 d 는 0 보다 커야 합니다.' });
    if (!finite(w) || w <= 0) out.push({ field: 'w', msg: '판 폭 w 는 0 보다 커야 합니다.' });
    if (finite(d) && finite(w) && d > 0 && w > 0 && d >= w) out.push({ field: 'd', msg: '구멍이 판보다 크거나 같습니다 (d < w 여야 함).' });
  } else if (shape === 'fillet' || shape === 'shoulderCut') {
    if (!finite(d) || d <= 0) out.push({ field: 'd', msg: '기준 치수 d 는 0 보다 커야 합니다.' });
    if (!finite(r) || r <= 0) out.push({ field: 'r', msg: '필릿 반경 r 은 0 보다 커야 합니다 (r=0 은 특이점).' });
  }
  return out;
}

/* ── #4 갈바닉 전위차 ── */
export type CorrosionBand = 'safe' | 'caution' | 'danger';
export const galvanicDeltaV = (va: number, vb: number): number => Math.abs(va - vb);
export const galvanicBand = (deltaV: number): CorrosionBand =>
  deltaV < 0.15 ? 'safe' : deltaV < 0.30 ? 'caution' : 'danger';
/**
 * 어느 쪽이 양극(anode, 부식되는 쪽)인지 — 전위가 더 낮은(더 활성인) 금속. 같으면 null.
 * 도식(anode/cathode 라벨)과 본문이 같은 판정을 쓰도록 여기서 한 번만 결정한다(감사 F16).
 */
export const galvanicAnode = (va: number, vb: number): 'A' | 'B' | null => (va === vb ? null : va < vb ? 'A' : 'B');

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
export function validateBuckling({ L, d, E, sy, K }: { L: number; d: number; E: number; sy: number; K: number }): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (!finite(L) || L <= 0) out.push({ field: 'L', msg: '길이 L 은 0 보다 커야 합니다.' });
  if (!finite(d) || d <= 0) out.push({ field: 'd', msg: '지름 d 는 0 보다 커야 합니다.' });
  if (!finite(E) || E <= 0) out.push({ field: 'E', msg: '탄성계수 E 는 0 보다 커야 합니다.' });
  if (!finite(sy) || sy <= 0) out.push({ field: 'sy', msg: '항복강도 σy 는 0 보다 커야 합니다.' });
  if (!finite(K) || K <= 0) out.push({ field: 'K', msg: '유효길이 계수 K 는 0 보다 커야 합니다.' });
  return out;
}

/* ── #6 CTE mismatch 열응력: σ ≈ ΔCTE·ΔT·E ── */
export function thermalMismatchStress(cteA: number, cteB: number, dT: number, E: number): number {
  return (cteA - cteB) * dT * 1e-6 * E * 1000; // MPa (E in GPa)
}

/* ── #7 경도 변환 HV↔HRC↔HRB↔HB + UTS (ASTM E140-12b Table 1·2, 비오스테나이트 강) ── */
export const HARDNESS_SCALES = ['HV', 'HRC', 'HRB', 'HB'] as const;
export type HardnessScale = typeof HARDNESS_SCALES[number];
/** 표 밖 값은 null — UI 가 "범위 외" 로 표시한다(수치를 지어내지 않는다). UTS 는 E140 근사열(강 한정). */
export interface HardnessResult { HV: number | null; HRC: number | null; HRB: number | null; HB: number | null; UTS: number | null; }
export function hardnessConvert(scale: HardnessScale, val: number): HardnessResult {
  return steelHardness(scale, val);
}
/** 입력 스케일별 표 범위 — 입력 칸 옆 안내와 검증에 같이 쓴다. */
export const HARDNESS_INPUT_RANGE: Record<HardnessScale, { min: number; max: number }> = {
  HV: { min: 107, max: 940 }, HRC: { min: 20, max: 68 }, HRB: { min: 60, max: 100 }, HB: { min: 107, max: 739 },
};
export function validateHardness(scale: HardnessScale, val: number): ValidationIssue[] {
  const r = HARDNESS_INPUT_RANGE[scale];
  if (!finite(val)) return [{ field: 'val', msg: '경도값을 입력하세요.' }];
  if (val < r.min || val > r.max) return [{ field: 'val', msg: `${scale} ${val} 은 E140 표 범위(${r.min}~${r.max}) 밖입니다 — 환산하지 않습니다.` }];
  return [];
}

/* ── #9 압력 용기 두께 (얇은 벽 + 두꺼운 벽 Lamé) ── */
export const VESSEL_SHAPES = ['cyl', 'sph'] as const;
export type VesselShape = typeof VESSEL_SHAPES[number];
/**
 * 얇은 벽 식: 원통 t = p·r·SF/σy, 구 t = p·r·SF/(2σy). t/r > 0.1 이면 얇은 벽 가정 밖(thick) —
 * 이때는 `tLame` (Roark, 내압 두꺼운 벽 Lamé 해: 내면 후프응력 = 허용응력) 을 함께 돌려준다.
 *   원통: σθ,max = p(ro²+ri²)/(ro²−ri²) → ro = ri·√((σa+p)/(σa−p))
 *   구:   σθ,max = p(ro³+2ri³)/(2(ro³−ri³)) → ro = ri·((2σa+2p)/(2σa−p))^(1/3)
 * σa = σy/SF 가 p 이하(원통) 또는 p/2 이하(구)면 Lamé 해가 없다(무한 두께) → tLame = null.
 */
export function pressureVesselThickness({ p, r, sy, SF, shape }: { p: number; r: number; sy: number; SF: number; shape: VesselShape }): { t: number; thick: boolean; tLame: number | null } {
  const t = shape === 'cyl' ? (p * r * SF) / sy : (p * r * SF) / (2 * sy);
  const sa = sy / SF;
  let tLame: number | null = null;
  if (shape === 'cyl') { if (sa > p) tLame = r * Math.sqrt((sa + p) / (sa - p)) - r; }
  else if (2 * sa > p) tLame = r * Math.cbrt((2 * sa + 2 * p) / (2 * sa - p)) - r;
  return { t, thick: t / r > 0.1, tLame };
}
export function validateVessel({ p, r, sy, SF }: { p: number; r: number; sy: number; SF: number }): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (!finite(p) || p <= 0) out.push({ field: 'p', msg: '내압 p 는 0 보다 커야 합니다.' });
  if (!finite(r) || r <= 0) out.push({ field: 'r', msg: '반경 r 은 0 보다 커야 합니다.' });
  if (!finite(sy) || sy <= 0) out.push({ field: 'sy', msg: '항복강도 σy 는 0 보다 커야 합니다.' });
  if (!finite(SF) || SF < 1) out.push({ field: 'SF', msg: '안전계수 SF 는 1 이상이어야 합니다.' });
  return out;
}

/* ── Larson-Miller (creep): LMP = T(K)·(C + log₁₀ t)/1000 ── */
export const larsonMiller = (T_celsius: number, t_hours: number, C: number): number =>
  (T_celsius + 273.15) * (C + Math.log10(t_hours)) / 1000;
/** 같은 LMP 에서 다른 온도의 파단 시간(h) 역산. */
export const larsonMillerInverseTime = (LMP: number, T2_celsius: number, C: number): number =>
  Math.pow(10, (LMP * 1000) / (T2_celsius + 273.15) - C);
/** 절대온도 > 0 K, 시간 > 0 h (log 정의역). 감사 F13: T=−273.15 에서 NaN 이 그대로 노출됐다. */
export function validateLMP({ T, t, C, T2 }: { T: number; t: number; C: number; T2: number }): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (!finite(T) || T <= -273.15) out.push({ field: 'T', msg: '온도 T 는 절대영도(−273.15°C)보다 높아야 합니다.' });
  if (!finite(T2) || T2 <= -273.15) out.push({ field: 'T2', msg: '온도 T₂ 는 절대영도(−273.15°C)보다 높아야 합니다.' });
  if (!finite(t) || t <= 0) out.push({ field: 't', msg: '시간 t 는 0 보다 커야 합니다 (log₁₀ 정의역).' });
  if (!finite(C) || C <= 0) out.push({ field: 'C', msg: 'Larson-Miller 상수 C 는 양수입니다 (강 ≈ 20).' });
  return out;
}

/* ── Mohr's circle (2D 응력) ── */
/** tauMax 는 면내(σ1,σ2) 최대 전단. tauMaxAbs 는 σ3=0 을 포함한 절대 최대 전단 = max(|σ1−σ2|,|σ1|,|σ2|)/2 (Tresca 에 쓰는 값, 감사 R06). */
export interface MohrResult { center: number; R: number; s1: number; s2: number; tauMax: number; tauMaxAbs: number; angleDeg: number; vonMises: number; }
export function mohrCircle(sx: number, sy: number, txy: number): MohrResult {
  const center = (sx + sy) / 2;
  const R = Math.sqrt(((sx - sy) / 2) ** 2 + txy ** 2);
  const s1 = center + R;
  const s2 = center - R;
  const angleDeg = (Math.atan2(2 * txy, sx - sy) * 180 / Math.PI) / 2;
  const tauMaxAbs = Math.max(Math.abs(s1 - s2), Math.abs(s1), Math.abs(s2)) / 2;
  return { center, R, s1, s2, tauMax: R, tauMaxAbs, angleDeg, vonMises: Math.sqrt(s1 * s1 - s1 * s2 + s2 * s2) };
}

/* ── Schaeffler (stainless 미세조직): Cr_eq / Ni_eq → phase ── */
/*
 * 경계식 — Schaeffler(1949) 다이어그램의 **직선 근사**. 세 직선 하나로 그림(SVG)·판정·예시가 같이 움직인다
 * (감사 F14: 예전엔 그림 따로, 판정은 임계 3개, 예시는 손으로 적은 좌표 — 같은 점에서 셋이 달랐다).
 *   L_A  (0 % ferrite, γ ↔ A+F):   Ni_eq = 1.125·(Cr_eq − 8)          — 이 선 위(고 Ni_eq)면 δ-ferrite 0
 *   L_M  (martensite 형성 한계):   Ni_eq = −0.749·(Cr_eq − 31.5)      — 이 선 아래면 냉각 중 martensite 형성
 *   L_F  (100 % ferrite, A+F ↔ α): Ni_eq = 0.6·Cr_eq − 9.5             — 이 선 아래면 완전 ferrite
 *   L_MF (α' ↔ M+F):               Cr_eq = 13 + 0.415·Ni_eq            — (13, 0) 에서 쐐기 꼭짓점으로 오르는 선
 * 출처: L_A·L_M 은 Schaeffler 다이어그램을 읽어 쓴 특허 문헌의 직선식(US 7,459,034 — "Ni_eq > 1.125(Cr_eq−8) 이면
 * ferrite 형성 영역 회피", "Ni_eq < −0.749(Cr_eq−31.5) 이면 martensite 형성"). L_F·L_MF 는 이 앱의 근사 — 446(Cr_eq≈26,
 * Ni_eq≈6)이 완전 ferrite, 2205(≈26, ≈12)가 A+F ≈ 50 %, 410(≈13, ≈5)이 martensite, 430(≈18, ≈3)이 M+F 가 되도록
 * 놓았다. L_A 와 L_M 의 교점(≈17.4, ≈10.6)이 austenite 쐐기의 꼭짓점이고 L_MF 도 거기서 만난다.
 * δ-ferrite 분율은 L_A(0 %)~L_F(100 %) 사이 위치 f 의 f^1.5 — 등-ferrite 선이 0 % 쪽에 몰려 있는 원도표 간격의 근사.
 * 한계: 정밀 FN 은 WRC-1992 로 구한다. 이 판정은 "어느 상 영역인가" 의 교육용 근사다.
 */
export const SCHAEFFLER_LINES = {
  A: (crEq: number) => 1.125 * (crEq - 8),
  M: (crEq: number) => -0.749 * (crEq - 31.5),
  F: (crEq: number) => 0.6 * crEq - 9.5,
  /** martensite 영역의 오른쪽 경계(α' ↔ M+F) — Ni_eq 로 푼 Cr_eq. */
  crMF: (niEq: number) => 13 + 0.415 * niEq,
  /** austenite 쐐기 꼭짓점 (L_A ∩ L_M). */
  apex: { crEq: 32.59 / 1.874, niEq: 1.125 * (32.59 / 1.874 - 8) },
} as const;
export type SchaefflerPhase = 'γ Austenite' | 'A+F' | "α' Martensite" | 'M+F' | 'α Ferrite';
export interface SchaefflerInput { Cr: number; Ni: number; Mo: number; Si: number; Nb: number; C: number; N: number; Mn: number; }
export interface SchaefflerResult { crEq: number; niEq: number; phase: SchaefflerPhase; ferritePct: number | null; }
/** 좌표 → 상 영역 (그림·판정 공용). */
export function schaefflerRegion(crEq: number, niEq: number): { phase: SchaefflerPhase; ferritePct: number | null } {
  const { A, M, F, crMF } = SCHAEFFLER_LINES;
  if (niEq <= F(crEq)) return { phase: 'α Ferrite', ferritePct: 100 };
  if (niEq < M(crEq)) {
    if (crEq < crMF(niEq)) return { phase: "α' Martensite", ferritePct: null };
    return { phase: 'M+F', ferritePct: null };
  }
  if (niEq >= A(crEq)) return { phase: 'γ Austenite', ferritePct: 0 };
  const f = (A(crEq) - niEq) / (A(crEq) - F(crEq));
  return { phase: 'A+F', ferritePct: Math.round(100 * Math.pow(Math.min(1, Math.max(0, f)), 1.5)) };
}
export function schaefflerEq({ Cr, Ni, Mo, Si, Nb, C, N, Mn }: SchaefflerInput): SchaefflerResult {
  const crEq = Cr + Mo + 1.5 * Si + 0.5 * Nb;
  // R209 A-12 — 비표준 0.3·Cu 제거 (Schaeffler/DeLong 표준 아님). N 항은 DeLong(30·N).
  const niEq = Ni + 30 * C + 30 * N + 0.5 * Mn;
  return { crEq, niEq, ...schaefflerRegion(crEq, niEq) };
}
/** 조성 0~100 %, 합계 ≤ 100 (Fe 잔부). 감사 F13: Cr=−10 % 도 판정이 나왔다. */
export function validateSchaeffler(inp: SchaefflerInput): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  let sum = 0;
  for (const [k, v] of Object.entries(inp)) {
    if (!finite(v) || v < 0 || v > 100) out.push({ field: k, msg: `${k} 는 0~100 % 사이여야 합니다.` });
    else sum += v;
  }
  if (sum > 100) out.push({ field: 'sum', msg: `합계 ${sum.toFixed(1)} % 가 100 % 를 넘습니다 (Fe 잔부가 음수).` });
  return out;
}
/** 전형 조성 예시 — 예시 문구의 판정도 같은 모델에서 계산한다(손으로 적은 좌표·상 이름 금지). */
export const SCHAEFFLER_EXAMPLES: { label: string; comp: SchaefflerInput }[] = [
  { label: '304 (18Cr-8Ni)', comp: { Cr: 18, Ni: 8, Mo: 0, Si: 0.5, Nb: 0, C: 0.05, N: 0.04, Mn: 1.5 } },
  { label: '310 (25Cr-20Ni)', comp: { Cr: 25, Ni: 20, Mo: 0, Si: 1.0, Nb: 0, C: 0.08, N: 0.03, Mn: 1.5 } },
  { label: '2205 duplex', comp: { Cr: 22.5, Ni: 5.5, Mo: 3.2, Si: 0.5, Nb: 0, C: 0.02, N: 0.17, Mn: 1.5 } },
  { label: '17-4 PH', comp: { Cr: 16, Ni: 4, Mo: 0, Si: 0.5, Nb: 0.3, C: 0.04, N: 0.02, Mn: 0.5 } },
  { label: '430 ferritic', comp: { Cr: 17, Ni: 0, Mo: 0, Si: 0.5, Nb: 0, C: 0.06, N: 0.02, Mn: 0.5 } },
  { label: '446 ferritic', comp: { Cr: 25, Ni: 0, Mo: 0, Si: 0.5, Nb: 0, C: 0.08, N: 0.1, Mn: 0.8 } },
  { label: '410 martensitic', comp: { Cr: 12.5, Ni: 0.3, Mo: 0, Si: 0.5, Nb: 0, C: 0.12, N: 0.02, Mn: 0.6 } },
];
