/*
 * R67/R110 — Welding (CE_IIW · CET · Pcm · Schaeffler) + Machinability rating helpers.
 *
 * 용접성 평가 — 4가지 보완 지표 (모두 동시 계산하면 정확도 ↑):
 *
 * 1) CE_IIW (Carbon Equivalent — IIW formula, IIW Doc IX-535-67) — 가장 일반적
 *    CE = C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15
 *    < 0.40  → cold cracking 우려 낮음
 *    0.40 - 0.50 → moderate, 두꺼운 plate 에서 preheat 권장
 *    > 0.50  → preheat 필수 + low-hydrogen 용접봉
 *
 * 2) CET (Carbon Equivalent — Thyssen formula, IIW Doc IX-1086-87) — modern HSLA 용
 *    CET = C + (Mn + Mo)/10 + (Cr + Cu)/20 + Ni/40
 *    < 0.40 / 0.40-0.60 / > 0.60 의 3 band.
 *    CE_IIW 보다 high-strength low-alloy steel 에 더 정확.
 *
 * 3) Pcm (Ito-Bessyo formula, JIS 표기) — 저합금 강 (low CE) 에 권장
 *    Pcm = C + Si/30 + (Mn + Cu + Cr)/20 + Ni/60 + Mo/15 + V/10 + 5B
 *    < 0.20 / 0.20-0.30 / > 0.30 의 3 band.
 *    C 비중 1.0 으로 가장 높음 — 미량합금강 평가에 정확.
 *
 * 4) Schaeffler diagram (오스테나이트계 스테인리스 용접 부위 phase prediction)
 *    Cr_eq = Cr + Mo + 1.5·Si + 0.5·Nb
 *    Ni_eq = Ni + 30·C + 0.5·Mn
 *    Output: phase (Austenite / Martensite / Ferrite / A+M / A+F / M+F / Mixed)
 *    Source: AWS A3.0 · ASM Vol. 6 (Welding) · Schaeffler 1949.
 *
 * Machinability rating — AISI 1212 = 100% baseline (Machining Data Handbook · ASM Vol. 16).
 *   (R205 정정: 이전 '1018 = 100%' 표기는 오류 — 1018 은 ~70%.)
 */

import type { Material } from './materials';

/* ───────── CET 계산 ───────── */

function pctOf(comp: any, el: string): number {
  const v = comp?.[el];
  if (v == null) return 0;
  if (v === 'balance') return 0; // balance 는 base 가정, CET 에 반영 안 함
  // 'min~max' 또는 '0.5' 또는 '≤0.08' 형식
  const s = String(v).replace(/[≤<]/g, '').trim();
  const match = s.match(/[\d.]+/g);
  if (!match) return 0;
  const nums = match.map(Number).filter(n => !isNaN(n));
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export interface CETResult {
  cet: number;
  band: 'low' | 'med' | 'high';
  label: string;          // KO 라벨
  preheat: string;        // 권장 pre-heat
  note: string;           // 한 줄 설명
}

/* R205 F2 — CE 계열 식 (CE_IIW/CET/Pcm) 은 C-Mn / low-alloy 강 전용.
 * Stainless (Cr 18% → CE 4+ 로 '위험' 오표시) · maraging (Ni 18%) · 고합금은 무의미 → 제외.
 * Stainless 는 Schaeffler 만 적용. [AWS D1.1 적용범위]
 * R226j/C6 — 적격성 판단을 런타임 subcategory-regex 에서 빌드 스탬프 m.profiles.weld
 * ('ce'|'schaeffler'|'none', stable_id 기반 process-profile-assignments.json) 로 전환. */

export function computeCET(material: Material): CETResult | null {
  // CE 계열은 C-Mn/저합금강 전용 — 빌드가 stable_id 별로 판정한 weld 모델을 조회 (R226j).
  if (material.profiles?.weld !== 'ce') return null;

  const comp = material.composition || {};
  const C = pctOf(comp, 'C');
  const Mn = pctOf(comp, 'Mn');
  const Mo = pctOf(comp, 'Mo');
  const Cr = pctOf(comp, 'Cr');
  const Cu = pctOf(comp, 'Cu');
  const Ni = pctOf(comp, 'Ni');
  if (C === 0 && Mn === 0 && Cr === 0) return null; // 조성 없음

  const cet = C + (Mn + Mo) / 10 + (Cr + Cu) / 20 + Ni / 40;

  if (cet < 0.4) return {
    cet, band: 'low', label: '우수',
    preheat: 'Pre-heat 불요',
    note: 'CET < 0.40 — 일반 용접 절차로 균열 위험 낮음.',
  };
  if (cet < 0.6) return {
    cet, band: 'med', label: '주의',
    preheat: 'Pre-heat 100-200°C 권장',
    note: 'CET 0.40-0.60 — 두께·구속 조건 따라 hydrogen-induced cracking (HIC) 위험.',
  };
  return {
    cet, band: 'high', label: '위험',
    preheat: 'Pre-heat 200-300°C + post-weld heat treatment',
    note: 'CET > 0.60 — 균열 위험 高. 저수소 용접봉 + post-weld stress relief 필수.',
  };
}

/* R110 — 추가 용접성 지표 — CE_IIW, Pcm, Schaeffler */

export interface CEIIWResult {
  ce: number;
  band: 'low' | 'med' | 'high';
  label: string;
  preheat: string;
  note: string;
}

export function computeCEIIW(material: Material): CEIIWResult | null {
  if (material.profiles?.weld !== 'ce') return null; // R226j — 빌드 판정 weld 모델 조회 (R205 F2 대체)

  const comp = material.composition || {};
  const C = pctOf(comp, 'C');
  const Mn = pctOf(comp, 'Mn');
  const Cr = pctOf(comp, 'Cr');
  const Mo = pctOf(comp, 'Mo');
  const V = pctOf(comp, 'V');
  const Ni = pctOf(comp, 'Ni');
  const Cu = pctOf(comp, 'Cu');
  if (C === 0 && Mn === 0 && Cr === 0) return null;

  const ce = C + Mn / 6 + (Cr + Mo + V) / 5 + (Ni + Cu) / 15;

  if (ce < 0.40) return {
    ce, band: 'low', label: '우수',
    preheat: 'Pre-heat 불요',
    note: 'CE_IIW < 0.40 — 25 mm 이하 plate 에서 일반 용접 절차 가능.',
  };
  if (ce < 0.50) return {
    ce, band: 'med', label: '주의',
    preheat: 'Pre-heat 100-150°C (두께 ≥ 25 mm) 권장',
    note: 'CE_IIW 0.40-0.50 — 두께 + 구속 조건에 따라 cold cracking. low-H 용접봉 권장.',
  };
  return {
    ce, band: 'high', label: '위험',
    preheat: 'Pre-heat 150-250°C + low-H 용접봉 + PWHT 필수',
    note: 'CE_IIW > 0.50 — 균열 위험 高. interpass temp 통제 + post-weld heat treatment 필수.',
  };
}

export interface PcmResult {
  pcm: number;
  band: 'low' | 'med' | 'high';
  label: string;
  preheat: string;
  note: string;
}

export function computePcm(material: Material): PcmResult | null {
  if (material.profiles?.weld !== 'ce') return null; // R226j — 빌드 판정 weld 모델 조회 (R205 F2 대체)

  const comp = material.composition || {};
  const C = pctOf(comp, 'C');
  const Si = pctOf(comp, 'Si');
  const Mn = pctOf(comp, 'Mn');
  const Cu = pctOf(comp, 'Cu');
  const Cr = pctOf(comp, 'Cr');
  const Ni = pctOf(comp, 'Ni');
  const Mo = pctOf(comp, 'Mo');
  const V = pctOf(comp, 'V');
  const B = pctOf(comp, 'B');
  if (C === 0 && Mn === 0) return null;

  const pcm = C + Si / 30 + (Mn + Cu + Cr) / 20 + Ni / 60 + Mo / 15 + V / 10 + 5 * B;

  if (pcm < 0.20) return {
    pcm, band: 'low', label: '우수',
    preheat: 'Pre-heat 불요',
    note: 'Pcm < 0.20 — Ito-Bessyo 기준 cold cracking 위험 낮음 (저합금 강 표준).',
  };
  if (pcm < 0.30) return {
    pcm, band: 'med', label: '주의',
    preheat: 'Pre-heat 100-150°C 권장',
    note: 'Pcm 0.20-0.30 — 두꺼운 plate 또는 micro-alloy 첨가 시 위험 ↑.',
  };
  return {
    pcm, band: 'high', label: '위험',
    preheat: 'Pre-heat 150-250°C + low-H 용접봉',
    note: 'Pcm > 0.30 — 미세조직 변태 위험. Pcm + B 함량 동시 통제 필수.',
  };
}

/* Schaeffler diagram — stainless 용접 후 결정상 예측. */
export interface SchaefflerResult {
  cr_eq: number;
  ni_eq: number;
  phase: 'Austenite' | 'Ferrite' | 'Martensite' | 'A+F' | 'A+M' | 'F+M' | 'A+F+M' | 'Mixed';
  ferrite_pct: number | null;  // estimated % ferrite (A+F 영역 only)
  note: string;
}

export function computeSchaeffler(material: Material): SchaefflerResult | null {
  // Schaeffler 는 stainless 용접 weld metal phase 예측 — 빌드 판정 weld 모델 조회 (R226j).
  if (material.profiles?.weld !== 'schaeffler') return null;

  const comp = material.composition || {};
  const Cr = pctOf(comp, 'Cr');
  const Mo = pctOf(comp, 'Mo');
  const Si = pctOf(comp, 'Si');
  const Nb = pctOf(comp, 'Nb');
  const Ni = pctOf(comp, 'Ni');
  const C = pctOf(comp, 'C');
  const Mn = pctOf(comp, 'Mn');
  if (Cr === 0 && Ni === 0) return null;

  const N = pctOf(comp, 'N');
  const cr_eq = Cr + Mo + 1.5 * Si + 0.5 * Nb;
  /* R209 A-12 — Tools.tsx 와 식 통일 (DeLong 계열: N 의 강한 austenite 안정화 반영, 30·N).
     비표준 0.3·Cu 항은 양쪽 모두 제외. */
  const ni_eq = Ni + 30 * C + 30 * N + 0.5 * Mn;

  /* Phase 분류 — Schaeffler 1949 zones (simplified):
   *   Pure Austenite: Ni_eq > 0.6 × Cr_eq + 8 (대략)
   *   Pure Ferrite:   Ni_eq < 0.5 × Cr_eq - 8
   *   Pure Martensite: Cr_eq < 14, Ni_eq < 8
   *   A+F: Ni_eq ≈ Cr_eq / 2 (standard 304/316 영역)
   *   A+M: Cr_eq < 15, 6 < Ni_eq < 10
   *   F+M: Cr_eq > 15, Ni_eq < 6
   */
  let phase: SchaefflerResult['phase'] = 'Mixed';
  let ferrite_pct: number | null = null;
  let note = '';

  if (cr_eq < 13 && ni_eq < 6) { phase = 'Martensite'; note = '410/420 류 — 용접부 martensite 다량 → preheat + low-H 필수.'; }
  else if (cr_eq < 15 && ni_eq < 8 && ni_eq >= 4) { phase = 'A+M'; note = 'Austenite + Martensite 혼합 — 균열 위험. preheat 권장.'; }
  else if (cr_eq > 18 && ni_eq < 5) { phase = 'F+M'; note = '430/446 류 ferritic — coarse grain → impact 손실. interpass temp ≤ 200°C.'; }
  else if (cr_eq > 24 && ni_eq < 8 + 0.5 * cr_eq) { phase = 'Ferrite'; note = '430 류 fully ferritic. 균열 위험 낮으나 grain growth + 부식 위험.'; }
  /* R209 A-11 — fully-austenite 경계 완화 (0.6→0.55, +6→+5). 310 류(Cr_eq~27/Ni_eq~23)가 A+F 로
     오판되던 문제 완화. Schaeffler diagram 의 austenite zone 경계 단순화. */
  else if (ni_eq > 0.55 * cr_eq + 5) { phase = 'Austenite'; note = '310/Nitronic 류 사실상 100% austenite — 균열 위험 낮음. hot cracking(고온균열) 만 주의.'; }
  else {
    // A+F band (가장 일반 — 304/316/Duplex)
    phase = 'A+F';
    // FN (Ferrite Number) 추정 — 304/316 = 5-10%, duplex 2205 = 40-50%
    if (cr_eq > 22) ferrite_pct = Math.min(60, Math.round((cr_eq - 18) * 8));
    else ferrite_pct = Math.max(0, Math.round((cr_eq - 16) * 4));
    /* R209 A-11 — ferrite 매우 낮으면 사실상 austenite (304 류 δ-ferrite 미량). 헬프텍스트와 정합. */
    note = ferrite_pct <= 3
      ? `거의 완전 austenite (δ-ferrite ${ferrite_pct}% 미량, FN ≈ ${ferrite_pct}). 304 류 — hot cracking 주의 (소량 ferrite 가 오히려 균열 억제).`
      : `A+F dual-phase. Ferrite ${ferrite_pct}% (FN ≈ ${ferrite_pct}). σ-phase + hot cracking 회피 — 3-10% ferrite 권장.`;
  }

  return { cr_eq, ni_eq, phase, ferrite_pct, note };
}

/* R111 — Machining/HT cost factor 의미 라벨화. 단순 숫자 (0.9× / 1.2× 등) 대신 정확한 의미 전달. */

export interface CostFactorResult {
  factor: number;
  band: 'easy' | 'normal' | 'hard' | 'very_hard';
  label: string;          // 한 단어 라벨
  detail: string;         // 비용 영향 한 줄 (e.g. "+50%")
  note: string;           // 의미 + 근거 한 줄
}

/** Machining cost factor (raw 단가 × machining factor = 가공 후 단가). 1.0 = 표준 강.
 *  R125: Ceramic / Composite 은 절삭 자체가 적용 안 됨 (grinding 등 별도 공정) → null 반환.
 *  R226i: Polymer 는 금속 tool-life 모델(ISO 3685·AISI baseline)이 무의미 → computePolymerMachinability 로 분리, 여기선 null. */
export function machiningCostBand(factor: number | null | undefined, category?: string | null): CostFactorResult | null {
  if (category === 'Ceramic' || category === 'Composite' || category === 'Polymer') return null;
  if (factor == null || !isFinite(factor) || factor <= 0) return null;
  const f = factor;
  const pct = Math.round((f - 1) * 100);
  const pctStr = pct === 0 ? '기준' : pct > 0 ? `+${pct}%` : `${pct}%`;
  if (f < 0.85) return {
    factor: f, band: 'easy', label: '쉬움', detail: `${pctStr} (저렴)`,
    note: '저탄소강/free-machining/연한 Al 류 — 표준보다 가공시간·공구비 ↓.'
  };
  if (f < 1.25) return {
    factor: f, band: 'normal', label: '보통', detail: `${pctStr}`,
    note: '일반 carbon steel·stainless·Al alloy — 표준 절삭. 표준 carbide 공구.'
  };
  if (f < 1.80) return {
    factor: f, band: 'hard', label: '어려움', detail: `${pctStr} (가공비 ↑↑)`,
    note: '저합금강 high-C, 일부 stainless martensitic·duplex — coated carbide, 낮은 속도.'
  };
  return {
    factor: f, band: 'very_hard', label: '매우 어려움', detail: `${pctStr} (가공비 ↑↑↑)`,
    note: 'Ni superalloy / Ti / 공구강 / 코발트 — CBN/ceramic 공구, cryo cooling. 가공시간 3-8×.'
  };
}

/** HT (Heat Treatment + post-process) cost factor. 1.0 = 추가 비용 없음 (as-supplied 그대로).
 *  R125: Ceramic / Composite 은 별도 sintering 공정이 본체 — 후처리 HT 무의미 → null. */
export function htCostBand(factor: number | null | undefined, category?: string | null): CostFactorResult | null {
  if (category === 'Ceramic' || category === 'Composite') return null;
  if (factor == null || !isFinite(factor) || factor < 1.0) return null;
  const f = factor;
  const pct = Math.round((f - 1) * 100);
  const pctStr = pct === 0 ? '없음' : `+${pct}%`;
  if (f < 1.05) return {
    factor: f, band: 'easy', label: '불요', detail: `${pctStr}`,
    note: '추가 열처리 불필요 — as-supplied / annealed 그대로 사용.'
  };
  if (f < 1.20) return {
    factor: f, band: 'normal', label: '단순 HT', detail: `${pctStr}`,
    note: 'Stress relief / 단순 anneal — single furnace cycle (~2-4h).'
  };
  if (f < 1.50) return {
    factor: f, band: 'hard', label: '본격 HT', detail: `${pctStr}`,
    note: 'Q+T (강) / T6 aging (Al) — 다단 열처리 사이클 + quench, dimensional control 필요.'
  };
  return {
    factor: f, band: 'very_hard', label: '복잡 HT', detail: `${pctStr}`,
    note: 'STA + double aging (Ni superalloy) / HIP / 코팅 (TBC, MCrAlY) — 5+ 시간 furnace, vacuum 필요.'
  };
}

/* R226j/C6 — 절삭성 rating (금속 name-regex 테이블)·폴리머 절삭성 테이블은 제거됨.
 * 해석은 @/lib/process-guidance (resolveMachinability·resolvePolymerMachinability — m.profiles 조회),
 * 분류는 빌드타임 scripts/lib/process-classify.mjs → data/process-profile-assignments.json (stable_id 키). */
