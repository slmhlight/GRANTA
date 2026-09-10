/*
 * W4-6 — ref 자동 앵커화 + confidence↔provenance 정합 게이트.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { splitRefLinks } from '../client/src/lib/ref-link';

describe('W4-6 — ref 링크 분해', () => {
  it('URL 없는 서지 인용은 그대로 둔다', () => {
    const t = 'Davis J R (1994) ASM Specialty Handbook: Stainless Steels';
    expect(splitRefLinks(t)).toEqual([{ kind: 'text', s: t }]);
  });

  it('괄호 안 URL 을 앵커로 자르되 닫는 괄호는 링크에 넣지 않는다', () => {
    const segs = splitRefLinks('NASA SLS docs (https://www.nasa.gov/sls) 참조');
    const link = segs.find((s) => s.kind === 'link');
    expect(link, '링크를 못 찾음').toBeTruthy();
    expect((link as { s: string }).s).toBe('https://www.nasa.gov/sls');
    /* 원문이 손실되지 않는다 */
    expect(segs.map((s) => s.s).join('')).toBe('NASA SLS docs (https://www.nasa.gov/sls) 참조');
  });

  it('문장 끝 마침표를 링크에 포함하지 않는다', () => {
    const segs = splitRefLinks('see https://example.com/a/b.');
    expect((segs.find((s) => s.kind === 'link') as { s: string }).s).toBe('https://example.com/a/b');
    expect(segs.map((s) => s.s).join('')).toBe('see https://example.com/a/b.');
  });

  it('doi: 를 doi.org 앵커로 만든다', () => {
    const segs = splitRefLinks('Nakkalil R et al., doi:10.1007/BF02646160');
    const link = segs.find((s) => s.kind === 'link') as { s: string; href: string };
    expect(link.href).toBe('https://doi.org/10.1007/BF02646160');
  });

  it('빈 입력을 견딘다', () => {
    expect(splitRefLinks('')).toEqual([]);
    expect(splitRefLinks(null)).toEqual([]);
  });

  it('연속 호출에서 결과가 흔들리지 않는다 (전역 정규식 lastIndex 누수)', () => {
    const t = 'a https://x.com b';
    expect(splitRefLinks(t)).toEqual(splitRefLinks(t));
  });
});

describe('W4-6 — confidence 는 provenance 보다 낙관적일 수 없다', () => {
  /* 계열 폴백으로 유도한 값에 'handbook'/'measured' 배지가 붙어 있으면
     UI 가 근거 없는 신뢰를 표시하게 된다(원칙 8). 빌드가 표시 등급을 하향하므로 잔여 0 이어야 한다. */
  const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
  const ALL: Array<{ id: string; name: string; stable_id?: string; ranges?: Record<string, { confidence?: string; provenance?: string } | undefined> }> =
    Array.isArray(raw) ? raw : raw.materials;
  const FALLBACK = /^(1st_family|2nd_family|3rd_family|class|family|subfamily):/;

  it('계열 폴백 provenance 에 handbook/measured 가 남아 있지 않다', () => {
    const bad: string[] = [];
    for (const m of ALL) for (const [p, r] of Object.entries(m.ranges ?? {})) {
      if (!r?.provenance || !FALLBACK.test(r.provenance)) continue;
      if (r.confidence === 'handbook' || r.confidence === 'measured')
        bad.push(`${m.stable_id ?? m.id} ${m.name.slice(0, 34)} · ${p} [${r.confidence}] ← ${r.provenance.slice(0, 34)}`);
    }
    expect(bad, `근거보다 낙관적인 신뢰도 ${bad.length}건:\n  ${bad.slice(0, 12).join('\n  ')}`).toEqual([]);
  });
});
