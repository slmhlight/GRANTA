/*
 * AUD F01 (2026-09-22) — 단위계(SI/Imperial)를 한 곳에서 내려보내는 컨텍스트 + 표시 헬퍼.
 *
 * 왜: 헤더의 SI/IMP 토글이 실제로는 가격(USD/kg↔USD/lb)만 바꿨다. 표·상세·비교는 항상 SI 로 렌더해
 * "IMP 인데 밀도 7.78 g/cm³·항복 1170 MPa" 가 남았다(감사 F01). 값은 SSOT 그대로 SI 로 두고, 렌더 직전에만
 * `displayNumber(key, v, sys)`·`displayUnit(key, unit, sys)` 로 바꾼다 — 필터 상태·차트 데이터는 SI 유지
 * (필터·Ashby 는 SI 고정이라고 헤더에 표시한다).
 */
import { createContext, useContext } from 'react';
import { convertToImperial, unitLabel, loadUnitSystem, type UnitSystem } from './unit-convert';

export const UnitSystemContext = createContext<UnitSystem | null>(null);

/** 현재 단위계 — Provider 밖(Guide/Tools 페이지)에서는 저장된 설정을 읽는다. */
export function useUnitSystem(): UnitSystem {
  const ctx = useContext(UnitSystemContext);
  return ctx ?? loadUnitSystem();
}

/** 물성 값을 현재 단위계로. 변환표에 없는 키(경도·%·×)는 그대로. */
export function displayNumber(key: string, valueSI: number | null | undefined, sys: UnitSystem): number | null {
  if (valueSI == null || !Number.isFinite(valueSI)) return null;
  return sys === 'imperial' ? convertToImperial(key, valueSI) : valueSI;
}

/** 단위 라벨 — 변환표에 있으면 그 단위계 라벨, 없으면 원래 라벨. */
export function displayUnit(key: string, fallbackUnit: string, sys: UnitSystem): string {
  const l = unitLabel(key, sys);
  return l || fallbackUnit;
}

/** 소수 자릿수 — 영미식은 값이 작아지므로(ksi·lb/in³) 한 자리 더. */
export function displayDigits(key: string, digitsSI: number, sys: UnitSystem): number {
  if (sys !== 'imperial') return digitsSI;
  if (key === 'density') return 3;               // lb/in³ ≈ 0.098~0.8
  if (/yield_strength|uts|fatigue_strength|modulus/.test(key)) return Math.max(1, digitsSI);
  return digitsSI;
}
