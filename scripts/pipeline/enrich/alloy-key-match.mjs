/*
 * R212c — alloy-key 매칭 가드 (build-materials.mjs 의 >3자 substring 분기 공용).
 *
 * 문제: 정규화된 substring 매칭(lc.includes(kn))이 숫자로 끝나는 키를 더 긴 합금 번호의 prefix 로 오매칭.
 *   예: niobium 키 'c103' 가 copper 'c10300' 에 매칭 → C10300(구리)이 niobium 의 fatigue/KIC/tmax/price 상속
 *       (truthfulness 위반: 구리가 melt 2350°C·price $150 등 niobium 값을 가짐).
 *
 * 해결: 원본(separator 보존) 문자열 기준 digit-boundary 가드.
 *   - 키 char 사이에 separator 를 허용 → 'c103' 가 'C-103' 에 매칭(공백/하이픈 무시) 유지.
 *   - 키의 첫/끝이 숫자일 때, *separator 없이 바로* 다른 숫자에 붙으면(같은 토큰) 거부.
 *     · 'c103' ⊄ 'c10300' (같은 토큰, glue)        · 'c103' ⊂ 'C-103' (separator 경계)
 *     · '304l' ⊄ '2304 lean duplex' (앞 숫자 glue)  · '4140' ⊂ 'AISI 4140 / 42CrMo4' (cross-token, separator)
 *     · 'ti153' ⊂ 'Ti-15-3-3-3' (separator)         · 'inconel718' ⊂ 'Inconel 718'
 *
 * 주: 'i' flag 미사용 — 기존 `lc.includes(kn)`(소문자 orig vs 원본 case kn)의 case 동작 보존
 *    (혼합 case 키 'reneN5' 등은 기존대로 family fallback 유지; case 정합은 별도 범위).
 *
 * orig = baseName.toLowerCase() (separator 포함), kn = key.replace(/[\s\-_(),/]+/g,'') (정규화 키, case 보존).
 */
const _cache = new Map();

export function matchesAlloyKey(orig, kn) {
  if (!orig || !kn) return false;
  let re = _cache.get(kn);
  if (!re) {
    const SEP = '[\\s\\-_(),/]*';
    const body = kn.split('').map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(SEP);
    const left = /[0-9]/.test(kn[0]) ? '(?<![0-9])' : '';            // 앞 토큰 숫자와 붙으면 거부
    const right = /[0-9]/.test(kn[kn.length - 1]) ? '(?![0-9])' : ''; // 뒤 토큰 숫자와 붙으면 거부
    re = new RegExp(left + body + right);
    _cache.set(kn, re);
  }
  return re.test(orig);
}
