/*
 * R157b — Heat-treatment matcher (filter side).
 * useMaterialFilter 의 filters.heatTreatments 슬라이더 → material.heat_treatment 매칭 헬퍼.
 *
 * 입력: material.heat_treatment 문자열 (이미 lowercase) + 사용자 선택한 HT category (lowercase)
 * 출력: 매칭되면 true.
 */

/** wanted = 사용자가 선택한 카테고리 (lowercase). 카테고리별 keyword 그룹과 매칭. */
export function matchHeatTreatment(ht: string, wanted: string): boolean {
  if (!ht) return wanted === 'none / as-supplied';
  switch (wanted) {
    case 'none / as-supplied':
      return /as[\s-]?(built|cast|supplied|received|forged|rolled|extruded|deposited)/.test(ht);
    case 'annealed':
      return /anneal/.test(ht);
    case 'solution treated':
      return /solution/.test(ht);
    case 'aged / precipitation':
      return /aged|aging|precipitation|peak\s*ag|t6|t7/.test(ht);
    case 'quenched & tempered':
      /* R157b — `q+t` 표기 (자주 쓰임) 미매칭 → q\+t 추가. */
      return /quench|tempered|qt\b|q\s*&\s*t|q\s*\+\s*t/.test(ht);
    case 'hip (hot isostatic)':
      return /hip|isostatic/.test(ht);
    case 'stress-relieved':
      return /stress[\s-]?reliev/.test(ht);
    case 'normalized':
      /* R157b — 영국 식 "normalised" (s) 도 매칭. */
      return /normali[sz]/.test(ht);
    case 'hardened':
      return /harden|case[\s-]?harden|nitrid|carburiz/.test(ht);
    default:
      return ht.includes(wanted);
  }
}

/** Check if any of `wanted` HT categories match the material's HT string. */
export function matchAnyHeatTreatment(ht: string, wanted: string[]): boolean {
  if (!ht) return wanted.includes('none / as-supplied');
  return wanted.some((w) => matchHeatTreatment(ht, w));
}
