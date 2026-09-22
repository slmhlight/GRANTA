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
/**
 * AUD R09 (2026-09-22) — 매칭 등급. 0 = 정확 부분문자열 · 1 = 구분자 제거 부분문자열 · 2 = 부분수열(오타·약어) · -1 = 불일치.
 * 부분수열은 문자가 섞인 질의(≥3자)에만 허용한다 — 순숫자 '7075' 가 '17-4 PH H1075'·'Cupronickel 70/30' 을 끌어오던 원인.
 */
/* AUD-3 D08 (2026-09-22) — 화학식 표기 정규화. 표시 이름은 아래첨자(B₄C·Al₂O₃)를 쓰지만 사용자는 ASCII(B4C)로 친다.
 * 정규화가 없으면 같은 재료가 표기에 따라 검색되지 않았다(순수 B₄C 가 "B4C" 질의에서 누락 — 보고서 19 재료·22 토큰).
 * NFKC 가 아래첨자·위첨자·전각을 ASCII 로 접는다. 표시 이름은 그대로 두고 **검색 키만** 정규화한다. */
export function normFormula(s: string): string {
  return typeof s?.normalize === 'function' ? s.normalize('NFKC') : s;
}

export function fuzzyRank(rawText: string, rawQ: string): number {
  const text = normFormula(rawText), q = normFormula(rawQ);
  if (!text) return -1;
  if (text.includes(q)) return 0;
  if (q.length < 2) return -1;
  const cleanText = text.replace(/[-\s./_]/g, '');
  const cleanQ = q.replace(/[-\s./_]/g, '');
  if (cleanQ.length >= 2 && cleanText.includes(cleanQ)) return 1;
  if (cleanQ.length < 3 || /^\d+$/.test(cleanQ)) return -1;
  let i = 0;
  for (let j = 0; j < cleanText.length && i < cleanQ.length; j++) {
    if (cleanText[j] === cleanQ[i]) i++;
  }
  return i === cleanQ.length ? 2 : -1;
}

export function fuzzyContains(rawText: string, rawQ: string): boolean {
  const text = normFormula(rawText), q = normFormula(rawQ);
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
