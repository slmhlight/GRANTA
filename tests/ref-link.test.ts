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

describe('A14 — 폴백 출처 라벨은 값이 추정일 때만 남는다', () => {
  /* KIC·피로강도는 값이 없으면 계열 typical 로 채우고, "이 숫자가 어디서 왔나" 를 밝히려
     `KIC fallback: <계열>` 출처 줄을 함께 붙인다. 거기까지는 정직하다.

     문제는 그 뒤다 — datasheet 교정으로 값이 실측/핸드북 근거가 되어도 폴백 줄이 그대로
     남아, 사용자에게 "이 값은 계열 추정" 이라고 잘못 말한다. 실측 321 건이 그 상태였고,
     build-from-registry 1g 가 정리한다. 값이 아니라 **근거 표시**의 문제라는 점에서
     바로 위 W4-6 검사와 같은 부류다(둘 다 원칙 8: 표시는 근거를 넘지 않는다). */
  const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
  const ALL: Array<{ id: string; name: string; stable_id?: string; sources?: Array<{ label?: string }>; ranges?: Record<string, { confidence?: string } | undefined> }> =
    Array.isArray(raw) ? raw : raw.materials;
  const FALLBACK_SRC = [
    { prefix: 'KIC fallback', prop: 'fracture_toughness' },
    { prefix: 'Fatigue fallback', prop: 'fatigue_strength' },
  ];
  const EVIDENCED = new Set(['measured', 'handbook']);

  it('실측·핸드북 근거를 얻은 물성에 폴백 출처가 남아 있지 않다', () => {
    const bad: string[] = [];
    for (const m of ALL) for (const s of m.sources ?? []) {
      const hit = FALLBACK_SRC.find((f) => String(s?.label ?? '').startsWith(f.prefix));
      if (!hit) continue;
      const c = m.ranges?.[hit.prop]?.confidence;
      if (c && EVIDENCED.has(c))
        bad.push(`${m.stable_id ?? m.id} ${m.name.slice(0, 30)} · ${hit.prop}[${c}] ← "${String(s.label).slice(0, 40)}"`);
    }
    expect(bad, `낡은 폴백 출처 ${bad.length}건 — 값은 교정됐는데 출처가 계열 폴백을 가리킨다:\n  ${bad.slice(0, 10).join('\n  ')}`).toEqual([]);
  });

  it('아직 추정인 물성의 폴백 출처는 지우지 않는다 (유일한 설명을 뺏지 않는다)', () => {
    /* 과잉 삭제 방지 — class·derived·family 로 남은 값에는 그 줄이 유일한 근거 설명이다. */
    const kept = ALL.flatMap((m) => (m.sources ?? []).filter((s) => FALLBACK_SRC.some((f) => String(s?.label ?? '').startsWith(f.prefix))));
    expect(kept.length, '폴백 출처가 전멸했다 — 추정값의 근거 설명까지 지웠는지 확인').toBeGreaterThan(100);
  });

  it('출처가 하나도 없는 재료를 만들지 않았다', () => {
    const zero = ALL.filter((m) => Array.isArray(m.sources) && m.sources.length === 0).map((m) => m.stable_id ?? m.id);
    expect(zero, `출처 0 인 재료 ${zero.length}건: ${zero.slice(0, 8).join(' | ')}`).toEqual([]);
  });
});
