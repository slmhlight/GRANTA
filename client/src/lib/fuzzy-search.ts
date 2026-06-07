/*
 * R157b — Fuzzy 텍스트 매칭. useMaterialFilter / DSL 등에서 공유.
 *
 * Sprint 2 A3 알고리즘:
 *   1) exact substring (가장 빠른 케이스, 100% 의미 보존)
 *   2) separator-stripped substring — "ti6al4v" 입력으로 "Ti-6Al-4V" 매칭
 *   3) subsequence (q.length ≥ 3) — 오타·약어 허용 ("tisalv" → "Ti-6Al-4V")
 *
 * 입력 너무 짧으면(<2자) fuzzy 비활성 — false positive 방지.
 */
export function fuzzyContains(text: string, q: string): boolean {
  if (!text) return false;
  if (text.includes(q)) return true;
  if (q.length < 2) return false;
  const cleanText = text.replace(/[-\s./_]/g, '');
  const cleanQ = q.replace(/[-\s./_]/g, '');
  if (cleanQ.length >= 2 && cleanText.includes(cleanQ)) return true;
  if (cleanQ.length < 3) return false;
  let i = 0;
  for (let j = 0; j < cleanText.length && i < cleanQ.length; j++) {
    if (cleanText[j] === cleanQ[i]) i++;
  }
  return i === cleanQ.length;
}
