/*
 * R155b — Pure utility helpers from build-materials.mjs.
 *
 * 모두 stateless · stat-free. test 가능.
 *   - num(v): string → number | null
 *   - baseName(n): "Foo (bar)" → "Foo"
 *   - norm(s): lowercase alphanumeric only
 *   - round(x, d=2): rounded to d decimals or null
 *   - smartRound(x): adaptive precision (4 for <0.01, 3 for <1, 2 for <100, 1 above)
 *   - rangeFrom(values, confidence): {min, max, typical, n, confidence} or null
 *   - uniq(a): unique Boolean-filtered array
 *   - mostCommon(arr): most frequent element
 *   - mostCommonKnown(arr): mostCommon excluding 'Unknown' and '0'
 *   - dedupeSources(arr): dedupe sources by label
 *   - dominantElement(composition): most-prevalent element name
 */

export const num = v => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* R173 — split by ' — ' as well as ' (' so that "Inconel 718 — As-built"
   yields "Inconel 718" (alloy designation only). Critical for QUAL_MAP / fakeVariant
   lookups, otherwise norm() produces 'inconel718asbuilt' (no match). */
export const baseName = n => String(n).split(' (')[0].split(' — ')[0].trim();

/* R155b — null/undefined 입력 시 'null'/'undefined' 문자열로 변환되는 silent bug 회피. */
export const norm = s => (s == null ? '' : String(s).toLowerCase().replace(/[^a-z0-9]/g, ''));

export const round = (x, d = 2) =>
  x == null ? null : Math.round(x * 10 ** d) / 10 ** d;

/* R48a — 적응형 정밀도: silicone E 0.002 GPa 같은 작은 값도 정확히 표시.
   round1 만 쓰면 0 으로 잘림. */
export const smartRound = (x) => {
  if (x == null) return null;
  const abs = Math.abs(x);
  const d = abs < 0.01 ? 4 : abs < 1 ? 3 : abs < 100 ? 2 : 1;
  return Math.round(x * 10 ** d) / 10 ** d;
};

export function rangeFrom(values, confidence) {
  const vals = values.map(num).filter(v => v != null && v > 0).sort((a, b) => a - b);
  if (!vals.length) return null;
  const conf = confidence || (vals.length >= 3 ? 'measured' : 'handbook');
  return {
    min: smartRound(vals[0]),
    max: smartRound(vals[vals.length - 1]),
    typical: smartRound(vals[Math.floor(vals.length / 2)]),
    n: vals.length,
    confidence: conf,
  };
}

export const uniq = a => [...new Set(a.filter(Boolean))];

export const mostCommon = arr => {
  const c = {};
  let best = arr[0], n = 0;
  for (const x of arr) {
    c[x] = (c[x] || 0) + 1;
    if (c[x] > n) { n = c[x]; best = x; }
  }
  return best;
};

export const mostCommonKnown = (arr) => {
  const v = arr.filter(x => x && x !== 'Unknown' && x !== '0');
  return v.length ? mostCommon(v) : null;
};

export const dedupeSources = (arr) => {
  const seen = new Set();
  return arr.filter(s => s && s.label && !seen.has(s.label) && seen.add(s.label));
};

export function dominantElement(composition) {
  let best = null, bestVal = -1;
  for (const [el, v] of Object.entries(composition || {})) {
    let val;
    if (v === 'balance') val = 100;
    else {
      const mm = String(v).match(/[\d.]+/g);
      val = mm ? Math.max(...mm.map(Number)) : 0;
    }
    if (val > bestVal) { bestVal = val; best = el; }
  }
  return best;
}
