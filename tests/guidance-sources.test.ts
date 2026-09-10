/*
 * W4-7 (H6 W4) — 공정 가이드 블록의 출처 필드 게이트.
 *
 * 배경: selection-insights 는 23/23 블록이 `sources` 를 갖는데(그게 모델이다),
 * ht-guidance·welding-guidance 는 **0** 이었다. 본문에 규격명을 써 놓고도 필드로는 없어서,
 * "이 권고가 어느 규격에 근거하는가" 를 기계가 읽을 수 없었다.
 *
 * 인용은 **본문에서 뽑았다** — 없는 것을 만들지 않았고, 규격명이 본문에 없는 블록은
 * `sources` 없이 두었다(ht 30 · welding 15). 그래서 이 게이트의 핵심은 두 가지다:
 *   ① 있는 인용은 **반드시 본문에 근거**할 것 (날조 차단)
 *   ② 형태가 온전할 것 (빈 배열·빈 문자열·기관만 있고 번호 없는 인용 금지)
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Block = { text?: string; note?: string; title?: string; sources?: unknown };
const load = (f: string) => JSON.parse(fs.readFileSync(path.resolve(`data/${f}.json`), 'utf8'));

const FILES = ['ht-guidance', 'welding-guidance'];
const ORG = /^(ASTM|ASME|SAE|AMS|AWS|ISO|EN|DIN|JIS|KS|MIL|API|NACE|AMPP|MMPDS|ASM)\b/;

for (const f of FILES) {
  describe(`W4-7 — ${f}.sources`, () => {
    const blocks: Record<string, Block> = load(f).blocks ?? {};
    const entries = Object.entries(blocks).filter(([k, b]) => !k.startsWith('_') && b && typeof b === 'object');
    const withSrc = entries.filter(([, b]) => b.sources !== undefined);

    it('출처를 가진 블록이 실제로 존재한다 (파이프 회귀 검출)', () => {
      expect(withSrc.length, `${f}: sources 보유 블록 0 — 승격이 사라졌다`).toBeGreaterThan(20);
    });

    it('형태 — 비어있지 않은 문자열 배열이고 각 인용이 기관+번호 꼴이다', () => {
      const bad: string[] = [];
      for (const [k, b] of withSrc) {
        const s = b.sources;
        if (!Array.isArray(s) || s.length === 0) { bad.push(`${k}: 배열 아님/빈 배열`); continue; }
        for (const x of s) {
          if (typeof x !== 'string' || !x.trim()) { bad.push(`${k}: 빈 인용`); continue; }
          if (!ORG.test(x)) bad.push(`${k}: 발행기관 없음 — "${x}"`);
          if (!/\d/.test(x)) bad.push(`${k}: 지정번호 없음 — "${x}"`);
        }
      }
      expect(bad, `형태 이상 ${bad.length}건 — ${bad.slice(0, 8).join(' | ')}`).toEqual([]);
    });

    it('근거 — 모든 인용이 그 블록 본문에 실제로 나온다 (날조 차단)', () => {
      const bad: string[] = [];
      for (const [k, b] of withSrc) {
        const text = [b.text, b.note, b.title].filter(Boolean).join(' ').replace(/\s+/g, ' ');
        for (const x of b.sources as string[]) {
          const org = x.split(' ')[0];
          const rest = x.slice(org.length).trim();
          const grounded = text.includes(x) || (text.includes(org) && text.includes(rest));
          if (!grounded) bad.push(`${k} → "${x}"`);
        }
      }
      expect(bad, `본문에 없는 인용 ${bad.length}건 — ${bad.slice(0, 8).join(' | ')}`).toEqual([]);
    });

    it('본문에 규격명이 있는 블록은 빠짐없이 출처를 갖는다', () => {
      /* 추출을 돌린 뒤 새 블록이 추가되면 여기서 잡힌다 — 규격을 써 놓고 필드를 안 채운 상태. */
      const STD = /\b(ASTM|ASME|SAE|AMS|AWS|ISO|EN|DIN|JIS|KS|MIL|API|NACE|AMPP|MMPDS|ASM)\b[\s-]?(?:Vol\.|Sec\.)?[A-Z]?\d/;
      const bad = entries
        .filter(([, b]) => b.sources === undefined)
        .filter(([, b]) => STD.test([b.text, b.note, b.title].filter(Boolean).join(' ')))
        .map(([k]) => k);
      expect(bad, `규격명이 본문에 있는데 sources 없는 블록 ${bad.length}건: ${bad.join(' | ')}`).toEqual([]);
    });
  });
}

describe('W4-7 — selection-insights (모델)', () => {
  it('전 그룹이 출처를 갖는다 — 이 파일이 기준이다', () => {
    const groups: Record<string, { sources?: unknown }> = load('selection-insights').groups ?? {};
    const bad = Object.entries(groups)
      .filter(([k]) => !k.startsWith('_'))
      .filter(([, g]) => !Array.isArray(g.sources) || g.sources.length === 0)
      .map(([k]) => k);
    expect(bad, `출처 없는 인사이트 그룹: ${bad.join(' | ')}`).toEqual([]);
  });
});
