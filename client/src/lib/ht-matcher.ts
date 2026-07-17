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
      /* A10 — hot-rolled·TMCP(압연 그대로 공급) 도 as-supplied 계열: 'hot-rolled bar' 등이 무매칭이던 것 보강. */
      return /as[\s-]?(built|cast|supplied|received|forged|rolled|extruded|deposited)|hot[\s-]?rolled|tmcp/.test(ht);
    case 'annealed':
      return /anneal/.test(ht);
    case 'solution treated':
      return /solution/.test(ht);
    case 'aged / precipitation':
      /* A10 — ① "age hardened" 표기 ② PH 시효 코드(H900~H1150: \bh9xx|h1[01]xx\b — Al 3자리 H111 과
       * 자릿수로 구분) 가 aged 에 안 걸려 누락되던 것 보강. */
      return /aged|aging|age[\s-]?harden|precipitation|peak\s*ag|t6|t7|\bt[38]\d*\b|\bh(9\d{2}|1[01]\d{2})\b/.test(ht);
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
      /* A10 — "Hardened(담금)" 은 담금·표면경화 의미: strain/work-hardened(가공경화)·age/precipitation-
       * hardened(시효 — Aged 소관) 토큰만으로 걸리던 오흡수 제거. 토큰 제거 후 잔여 harden 계로 판정. */
      return /harden|nitrid|carburiz/.test(ht.replace(/(strain|work|age|precipitation)[\s-]?harden\w*/g, ''));
    case 'cold-worked / strain-hardened':
      /* A10 신설 — 냉간가공 상태(가공경화·압연·인발·Hxx temper). 기존엔 어느 카테고리로도 못 찾거나
       * Hardened 에 오분류되던 105 entry 의 정식 거처. */
      return /strain[\s-]?harden|work[\s-]?harden|cold[\s-]?(work|roll|draw)|half[\s-]?hard|full[\s-]?hard|quarter[\s-]?hard|\b[13]\/[24]\s?h(ard)?\b|spring temper|\bdrawn\b|\bt[38]\d*\b|\bh1[1-9]\d?\b|\bh3\d{1,2}\b/.test(ht);
    default:
      return ht.includes(wanted);
  }
}

/** Check if any of `wanted` HT categories match the material's HT string. */
export function matchAnyHeatTreatment(ht: string, wanted: string[]): boolean {
  if (!ht) return wanted.includes('none / as-supplied');
  return wanted.some((w) => matchHeatTreatment(ht, w));
}
