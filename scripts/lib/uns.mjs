/*
 * R226f/축4c — UNS 코드 정규 필드 도출 (순수함수).
 * 별칭·이름·meta.specs 에 산재한 UNS 지정(예: "UNS N07718"·"N07718")을 1급 필드로 → 외부 시스템 연동 키.
 * UNS 형식: 대문자 1 + 숫자 5 (A=Al, C=Cu, G=탄소/합금강, J=주강, K=철계특수, N=Ni, R=내화/Ti, S=STS, T=공구강 …).
 */
const UNS_RE = /\bUNS[\s-]?([A-Z]\d{5})\b/g;
const BARE_RE = /^([A-Z]\d{5})$/;
// 첫 글자 계열 필터 — 우연한 영숫자 토큰(부품번호 등) 오탐 방지
const VALID_PREFIX = new Set(['A', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'W', 'Z']);

export function extractUNS(m) {
  const found = new Set();
  const scanText = (t) => { if (!t) return; let x; UNS_RE.lastIndex = 0; while ((x = UNS_RE.exec(String(t)))) { if (VALID_PREFIX.has(x[1][0])) found.add(x[1]); } };
  scanText(m.name);
  for (const a of m.aliases || []) {
    scanText(a);
    const b = BARE_RE.exec(String(a).trim());
    if (b && VALID_PREFIX.has(b[1][0])) found.add(b[1]);
  }
  for (const sp of m.meta?.specs || []) if (sp.org === 'UNS' && sp.id) {
    const b = /([A-Z]\d{5})/.exec(String(sp.id)); if (b && VALID_PREFIX.has(b[1][0])) found.add(b[1]);
  }
  return [...found].sort();
}
