/*
 * R227/E14/H4f — §3.1 용어 표기 게이트 (재발 방지).
 *
 * 규칙(GLOSSARY-IMPROVEMENT-PLAN §3.1, 사용자 확정): 열처리·야금 전문어는 영어 원문이
 * 기본 표기, 한글은 병기 괄호 안에서만. 이 게이트는 글로서리 문서·short 정의에서
 * "standalone 한글 HT 용어"(= 앞뒤가 한글이 아닌 독립 사용)를 찾아, 직전 40자 안에
 * 영어 동의어가 없으면(병기가 아니면) 실패시킨다.
 *
 * 통과하는 것: "Quenching(담금질)" · "(Quenching, 담금질)" 병기, 자연시효·재시효·
 * 시효경화·질화물·뜨임취성 같은 복합어(한글 경계), "예민화된·담금질했을" 동사 활용.
 * 잡는 것: "480 °C 용체화 →" · "H900 등 시효" 처럼 병기 없이 남은 한글 전문어.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const articles = JSON.parse(readFileSync(resolve(ROOT, 'data/glossary-articles.json'), 'utf8')).articles as Record<
  string,
  { sections: Array<{ heading: string; body: string; table?: { headers: string[]; rows: string[][] } }> }
>;
const glossary = JSON.parse(readFileSync(resolve(ROOT, 'data/glossary.json'), 'utf8')).terms as Record<
  string,
  { short: string }
>;

/** §3.1 확정 대응표 (+ 음역어). [한글폼, 영어표준] — 긴 폼 우선. */
const TERMS: Array<[string, string]> = [
  ['오스테나이트화', 'Austenitizing'],
  ['노멀라이징', 'Normalizing'],
  ['용체화 처리', 'Solution treatment'],
  ['용체화처리', 'Solution treatment'],
  ['오스템퍼링', 'Austempering'],
  ['마르퀜칭', 'Martempering'],
  ['마템퍼링', 'Martempering'],
  ['서브제로', 'Sub-zero'],
  ['적열경도', 'Red hardness'],
  ['응력제거', 'Stress relief'],
  ['용체화', 'Solution treatment'],
  ['어닐링', 'Annealing'],
  ['템퍼링', 'Tempering'],
  ['경화능', 'Hardenability'],
  ['예민화', 'Sensitization'],
  ['담금질', 'Quenching'],
  ['침탄', 'Carburizing'],
  ['질화', 'Nitriding'],
  ['뜨임', 'Tempering'],
  ['풀림', 'Annealing'],
  ['불림', 'Normalizing'],
  ['시효', 'Aging'],
];

const JOSA = [
  '이라는', '라는', '이라도', '라도', '이라고', '라고', '으로는', '로는', '으로도', '로도',
  '으로써', '로써', '으로의', '로의', '이란', '란', '이라', '라', '이며', '며', '이다', '다',
  '으로', '로', '과의', '와의', '이', '가', '은', '는', '을', '를', '과', '와', '의',
  '에서는', '에서의', '에서', '에는', '에도', '에', '도', '만', '보다', '처럼', '부터', '까지',
];
const HANGUL = /[가-힣]/;

/** standalone 한글 HT 용어인데 병기(직전 40자 내 EN)가 아닌 위치 → 위반 목록. */
function violations(text: string, loc: string): string[] {
  const out: string[] = [];
  if (!text) return out;
  for (const [ko, en] of TERMS) {
    let idx = 0;
    while ((idx = text.indexOf(ko, idx)) !== -1) {
      const before = idx > 0 ? text[idx - 1] : '';
      const rest = text.slice(idx + ko.length);
      const isJosaOrEnd =
        !rest[0] || !HANGUL.test(rest[0]) ||
        JOSA.some((j) => rest.startsWith(j) && !HANGUL.test(rest[j.length] ?? ''));
      const standalone = !HANGUL.test(before) && isJosaOrEnd;
      if (standalone) {
        const pre = text.slice(Math.max(0, idx - 40), idx).toLowerCase();
        if (!pre.includes(en.toLowerCase())) {
          out.push(`${loc}: "…${text.slice(Math.max(0, idx - 14), idx + ko.length + 10)}…" — ${ko}→${en} 병기/영어화 필요`);
        }
      }
      idx += ko.length;
    }
  }
  return out;
}

describe('§3.1 열처리 용어 표기 게이트 (영어 기본표기·병기 규칙)', () => {
  it('글로서리 문서(heading·body·table)에 병기 없는 한글 HT 용어 없음', () => {
    const bad: string[] = [];
    for (const [slug, art] of Object.entries(articles)) {
      art.sections.forEach((sec, i) => {
        bad.push(...violations(sec.heading, `${slug}#${i}H`));
        bad.push(...violations(sec.body, `${slug}#${i}B`));
        if (sec.table) {
          sec.table.headers.forEach((h) => bad.push(...violations(h, `${slug}#${i}T`)));
          sec.table.rows.forEach((r) => r.forEach((c) => bad.push(...violations(c, `${slug}#${i}T`))));
        }
      });
    }
    expect(bad, bad.slice(0, 20).join('\n')).toEqual([]);
  });

  it('용어 short 정의에 병기 없는 한글 HT 용어 없음', () => {
    const bad: string[] = [];
    for (const [slug, t] of Object.entries(glossary)) {
      bad.push(...violations(t.short, `short:${slug}`));
    }
    expect(bad, bad.slice(0, 20).join('\n')).toEqual([]);
  });
});
