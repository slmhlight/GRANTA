/*
 * R27 — 단위 변환 유틸. SI ↔ 영미식 자동 변환.
 *
 * 사용처: MaterialDetail · Compare panel · Ashby chart axis label · CSV export.
 * 사용자 preference (localStorage 'am_units' = 'si' | 'imperial') 따라 전체 toggle.
 */

export type UnitSystem = 'si' | 'imperial';

const UNIT_FACTORS: Record<string, { si: string; imp: string; toImp: number; from?: 'add' }> = {
  // 응력·강도 — SI MPa ↔ 영미식 ksi (1 ksi = 6.895 MPa).
  yield_strength:        { si: 'MPa',    imp: 'ksi',     toImp: 1 / 6.895 },
  uts:                   { si: 'MPa',    imp: 'ksi',     toImp: 1 / 6.895 },
  fatigue_strength:      { si: 'MPa',    imp: 'ksi',     toImp: 1 / 6.895 },
  // 모듈러스 — SI GPa ↔ 영미식 Msi (1 Msi = 6.895 GPa).
  modulus:               { si: 'GPa',    imp: 'Msi',     toImp: 1 / 6.895 },
  // 경도 — 무차원 동일 (HV, HB, HRC 등).
  hardness:              { si: 'HV',     imp: 'HV',      toImp: 1 },
  // 연신율 — % 동일.
  elongation:            { si: '%',      imp: '%',       toImp: 1 },
  // 충격 — J ↔ ft·lbf (1 ft·lbf = 1.356 J).
  impact_strength:       { si: 'J',      imp: 'ft·lbf',  toImp: 1 / 1.356 },
  // 밀도 — g/cm³ ↔ lb/in³ (1 lb/in³ = 27.68 g/cm³).
  density:               { si: 'g/cm³',  imp: 'lb/in³',  toImp: 1 / 27.68 },
  // 열전도도 — W/m·K ↔ BTU/hr·ft·°F (1 BTU/hr·ft·°F = 1.731 W/m·K).
  thermal_conductivity:  { si: 'W/m·K',  imp: 'BTU/hr·ft·°F', toImp: 1 / 1.731 },
  // 열팽창 — 10⁻⁶/K ↔ 10⁻⁶/°F (×5/9).
  thermal_expansion:     { si: '10⁻⁶/K', imp: '10⁻⁶/°F', toImp: 5 / 9 },
  // 비열 — J/kg·K ↔ BTU/lb·°F (1 BTU/lb·°F = 4187 J/kg·K).
  specific_heat:         { si: 'J/kg·K', imp: 'BTU/lb·°F', toImp: 1 / 4187 },
  // 온도 — °C ↔ °F (선형 변환은 별도).
  max_service_temp:      { si: '°C',     imp: '°F',      toImp: 1, from: 'add' },
  melting_point:         { si: '°C',     imp: '°F',      toImp: 1, from: 'add' },
  // 가격 — USD/kg ↔ USD/lb (1 lb = 0.4536 kg).
  price_per_kg:          { si: 'USD/kg', imp: 'USD/lb',  toImp: 0.4536 },
  price_per_cm3:         { si: 'USD/cm³', imp: 'USD/in³', toImp: 16.387 },
  // 단위 없는 항목 — 그대로.
  electrical_conductivity: { si: '%IACS', imp: '%IACS', toImp: 1 },
  poisson_ratio:           { si: '–',     imp: '–',     toImp: 1 },
  popularity:              { si: '0–5',   imp: '0–5',   toImp: 1 },
  fracture_toughness:      { si: 'MPa·√m', imp: 'ksi·√in', toImp: 0.910 },
};

/** 값과 키로 영미식 변환. 온도는 °C → °F = °C × 9/5 + 32. */
export function convertToImperial(key: string, valueSI: number | null): number | null {
  if (valueSI == null) return null;
  const f = UNIT_FACTORS[key];
  if (!f) return valueSI;
  if (f.from === 'add') return valueSI * 9 / 5 + 32;
  return valueSI * f.toImp;
}

/** 단위 라벨 — 'MPa' / 'ksi' 등 형식. */
export function unitLabel(key: string, system: UnitSystem): string {
  const f = UNIT_FACTORS[key];
  if (!f) return '';
  return system === 'imperial' ? f.imp : f.si;
}

/** 값 + 라벨을 한 번에 — UI 에서 자주 쓰는 형식. */
export function formatValue(key: string, valueSI: number | null, system: UnitSystem, digits = 1): string {
  if (valueSI == null) return '—';
  const v = system === 'imperial' ? convertToImperial(key, valueSI) : valueSI;
  if (v == null) return '—';
  return `${v.toFixed(digits)} ${unitLabel(key, system)}`;
}

/** localStorage 에서 사용자 단위 환경 읽기. */
export function loadUnitSystem(): UnitSystem {
  try {
    const s = localStorage.getItem('am_units');
    return s === 'imperial' ? 'imperial' : 'si';
  } catch { return 'si'; }
}

export function saveUnitSystem(s: UnitSystem) {
  try { localStorage.setItem('am_units', s); } catch { /* ignore */ }
}

// ── R40b — 통화 변환 (USD ↔ KRW) ─────────────────────────────────────────
// price_per_kg / price_per_cm³ / total_cost_estimate 는 모두 USD 기준 저장.
// 사용자 lang 가 'ko' 면 KRW (₩) 자동 변환 표시. 환율: 1 USD ≈ 1,400 KRW (2026 기준 평균).
// 환율은 정확한 실시간이 아닌 표시 편의용 — 정확한 가격은 사용자가 별도 quote 받아야 함.

export type Currency = 'usd' | 'krw';
export const USD_TO_KRW = 1400;

export function currencyForLang(lang: 'ko' | 'en'): Currency {
  return lang === 'ko' ? 'krw' : 'usd';
}

/**
 * 통화 변환 + 단위 변환 (lb vs kg) 통합. priceKey 는 'price_per_kg' / 'price_per_cm3' /
 * 'total_cost_estimate' 등 USD/kg 기반 값. KRW 변환 시 1,000원 단위로 반올림 (₩ 가독성).
 */
export function formatPrice(
  valueUSDPerKg: number | null,
  lang: 'ko' | 'en',
  system: UnitSystem,
  perUnit: 'kg' | 'cm3' = 'kg'
): string {
  if (valueUSDPerKg == null || !isFinite(valueUSDPerKg)) return '—';
  const isKRW = lang === 'ko';
  // 1) per-unit 변환 (kg ↔ lb, cm³ ↔ in³)
  let v = valueUSDPerKg;
  let unitLabel = perUnit === 'kg' ? '/kg' : '/cm³';
  if (system === 'imperial') {
    v = valueUSDPerKg * (perUnit === 'kg' ? 0.4536 : 16.387);
    unitLabel = perUnit === 'kg' ? '/lb' : '/in³';
  }
  // 2) 통화 변환
  if (isKRW) {
    v = v * USD_TO_KRW;
    // 1,000원 단위 반올림 (소액은 100원 단위)
    const rounded = v < 10000 ? Math.round(v / 100) * 100 : Math.round(v / 1000) * 1000;
    return `₩${rounded.toLocaleString()}${unitLabel}`;
  }
  // USD — 가격 크기별 소수 자릿수 자동 조정
  const digits = v < 10 ? 2 : v < 100 ? 1 : 0;
  return `$${v.toFixed(digits)}${unitLabel}`;
}

/** 통화 라벨만 ('USD/kg' or '₩/kg' or '$/lb' 등). slider 라벨용. */
export function priceUnitLabel(lang: 'ko' | 'en', system: UnitSystem, perUnit: 'kg' | 'cm3' = 'kg'): string {
  const isKRW = lang === 'ko';
  const unitTail = system === 'imperial' ? (perUnit === 'kg' ? '/lb' : '/in³') : (perUnit === 'kg' ? '/kg' : '/cm³');
  return isKRW ? `₩${unitTail}` : `$${unitTail}`;
}

/** 값 자체만 변환 (라벨 없이). FilterSidebar slider min/max 같이 숫자만 필요할 때. */
export function convertPrice(valueUSDPerKg: number | null, lang: 'ko' | 'en', system: UnitSystem, perUnit: 'kg' | 'cm3' = 'kg'): number | null {
  if (valueUSDPerKg == null) return null;
  let v = valueUSDPerKg;
  if (system === 'imperial') v = valueUSDPerKg * (perUnit === 'kg' ? 0.4536 : 16.387);
  if (lang === 'ko') v = v * USD_TO_KRW;
  return v;
}
