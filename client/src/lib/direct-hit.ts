/*
 * R226e/C4 — Home.tsx 의 direct-hit 검색 해소 로직 추출 (behavior identical).
 * 검색어 → 자료 매칭: name + aliases + shop-alias-dict 를 정규화해 exact → startsWith → includes → token 5단계.
 * 이전엔 Home.tsx(995 LOC) 내부 인라인이라 vitest 커버리지 0 이던 로직.
 */
import type { Material } from '@/lib/materials';
import { SHOP_ALIAS_DICT } from '@/lib/shop-alias-dict';

/** 소문자화 + 구분자 제거 ('304-SS' · 'SUS 304' → 'sus304'). */
export const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_.()/]+/g, '');

/** 등급 토큰(숫자 + 짧은 영문) 추출 — 최소 3자 또는 2+자리 숫자. '304L SS' → ['304l','ss']. */
export const extractTokens = (s: string): string[] => {
  const tokens: string[] = [];
  const re = /[a-z0-9]+/g; let m;
  const lower = s.toLowerCase();
  while ((m = re.exec(lower))) {
    const t = m[0];
    if (t.length >= 3 || /^\d{2,}/.test(t)) tokens.push(t); // 숫자 2+자리는 키 등급일 가능성
  }
  return tokens;
};

/** 단일 쿼리 → direct-hit 자료. name+aliases 정규화 후 exact→startsWith→includes→token 순으로 첫 매칭 반환. 없으면 null. */
export function resolveDirectHit(query: string, materials: Material[]): Material | null {
  const q = query.trim();
  if (!q) return null;
  const nq = normalize(q);
  // 입력 자체 + shop alias dict 확장
  const queries2 = [nq, ...(SHOP_ALIAS_DICT[nq] ?? []).map(normalize)];
  // R226h/P3-8 — 후보에 UNS 정규 코드 포함 ("N07718" direct-hit)
  const candsOf = (m: Material) => [m.name, ...(m.aliases || []), ...(m.uns || [])].map(normalize);
  // 2단계: 정확일치
  for (const m of materials) {
    if (queries2.some(q2 => candsOf(m).includes(q2))) return m;
  }
  // 3단계: startsWith
  for (const m of materials) {
    if (queries2.some(q2 => candsOf(m).some(c => c.startsWith(q2)))) return m;
  }
  // 4단계: 부분일치
  for (const m of materials) {
    if (queries2.some(q2 => candsOf(m).some(c => c.includes(q2)))) return m;
  }
  // 5단계: 토큰 기반 (입력 토큰 모두가 후보 토큰에 포함 — 작은 문자열 false positive 회피)
  const qTokens = extractTokens(q);
  if (qTokens.length) {
    for (const m of materials) {
      const candidates = [m.name, ...(m.aliases || [])];
      for (const c of candidates) {
        const cTokens = extractTokens(c);
        if (qTokens.every(qt => cTokens.includes(qt))) return m;
      }
    }
  }
  return null;
}
