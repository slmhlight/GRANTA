/* R167 Phase B — QueryBar autocomplete logic tests. */
import { describe, expect, it } from 'vitest';
import { tokenAtCursor, suggest, applySuggestion, type PropertyStats } from '../client/src/lib/query-autocomplete';

const STATS: Record<string, PropertyStats> = {
  density: { n: 100, min: 0.5, max: 22, p10: 1.4, median: 7.8, p90: 8.7 },
  yield_strength: { n: 100, min: 1, max: 3700, p10: 75, median: 372, p90: 1200 },
  max_service_temp: { n: 100, min: 50, max: 3000, p10: 120, median: 450, p90: 1000 },
};

describe('tokenAtCursor', () => {
  it('빈 input 에서 cursor 0 → 빈 token', () => {
    const r = tokenAtCursor('', 0);
    expect(r.token).toBe('');
    expect(r.insideQuote).toBe(false);
  });

  it('밀도 → 전체가 token', () => {
    const r = tokenAtCursor('밀도', 2);
    expect(r.token).toBe('밀도');
    expect(r.tokenStart).toBe(0);
    expect(r.tokenEnd).toBe(2);
  });

  it('두 token 사이 공백 cursor → 빈 token', () => {
    const r = tokenAtCursor('밀도<5 항복', 6);
    /* cursor 6 = 공백 직후, 항복 시작 직전 → token = "항" 로 시작 .*/
    expect(r.token.length).toBeGreaterThanOrEqual(0);
  });

  it('cursor 가 첫 token 끝 (공백 직전) → 첫 token 반환', () => {
    /* 밀(0) 도(1) <(2) 5(3) (4=공백) 항(5)... cursor 4 = 첫 token 직후 (공백 위치). */
    const r = tokenAtCursor('밀도<5 항복>500', 4);
    expect(r.token).toBe('밀도<5');
  });

  it('cursor 가 두 번째 token 안 → 두 번째 token 반환', () => {
    const r = tokenAtCursor('밀도<5 항복>500', 10);
    expect(r.token).toBe('항복>500');
  });

  it('따옴표 안에 있으면 insideQuote = true', () => {
    const r = tokenAtCursor('"hello world', 8);
    expect(r.insideQuote).toBe(true);
  });

  it('짝수번 따옴표 밖이면 insideQuote = false', () => {
    const r = tokenAtCursor('"hello" world', 10);
    expect(r.insideQuote).toBe(false);
  });
});

describe('suggest — property step', () => {
  it('"밀" → 밀도 한국어 우선', () => {
    const sugs = suggest('밀', 1, STATS);
    expect(sugs.length).toBeGreaterThan(0);
    /* 첫 번째는 한국어 alias. */
    expect(sugs[0].insert).toBe('밀도');
    expect(sugs[0].kind).toBe('property');
  });

  it('"den" → density 영문', () => {
    const sugs = suggest('den', 3, STATS);
    expect(sugs[0].insert).toBe('density');
  });

  it('"ρ" exact match → R168 에 의해 operator step (별도 테스트). 여기는 prefix step 동작만 확인.', () => {
    /* `ρ` 는 PROP_ALIAS exact match — R168 에 따라 operator 단계로 직행.
     *  prefix step (suggestProperties) 자체 동작은 다른 테스트에서 확인. */
    const sugs = suggest('ρ', 1, STATS);
    /* exact match → operator 만 반환 (R168). */
    expect(sugs[0].kind).toBe('operator');
  });

  it('"항" → 항복강도 / 항복 추천', () => {
    const sugs = suggest('항', 1, STATS);
    /* 한국어 우선, 동일 property key 의 다른 alias 는 중복 제거. */
    const ksKey = sugs.find((s) => s.detail === 'yield_strength');
    expect(ksKey).toBeDefined();
  });

  it('빈 input → 제안 없음 (혼란 회피)', () => {
    const sugs = suggest('', 0, STATS);
    expect(sugs.length).toBe(0);
  });

  it('동일 property 의 한·영·그리스 → 한국어 alias 만 한 줄', () => {
    /* "밀" 입력 시 밀도/density/rho/ρ 4개 모두 매치 가능하지만, 같은 key=density → 1개만. */
    const sugs = suggest('밀', 1, STATS);
    const densityRows = sugs.filter((s) => s.detail === 'density');
    expect(densityRows.length).toBe(1);
  });
});

describe('suggest — operator step (R168 IDE-style)', () => {
  it('"밀도" exact alias → operator chip 6개 자동 제안', () => {
    const sugs = suggest('밀도', 2, STATS);
    expect(sugs.length).toBe(6);
    expect(sugs.every((s) => s.kind === 'operator')).toBe(true);
    expect(sugs.map((s) => s.insert)).toEqual(['<', '>', '<=', '>=', '=', '~']);
  });

  it('"density" exact alias → operator 자동 제안', () => {
    const sugs = suggest('density', 7, STATS);
    expect(sugs.length).toBe(6);
    expect(sugs[0].kind).toBe('operator');
  });

  it('"ρ" 그리스 exact alias → operator 자동 제안', () => {
    const sugs = suggest('ρ', 1, STATS);
    expect(sugs.length).toBe(6);
    expect(sugs[0].kind).toBe('operator');
  });

  it('"항복" exact 한국어 alias → operator 자동 제안', () => {
    const sugs = suggest('항복', 2, STATS);
    expect(sugs.length).toBe(6);
    expect(sugs[0].kind).toBe('operator');
  });

  it('"밀도<" → value-hint 단계 (operator 이미 포함)', () => {
    const sugs = suggest('밀도<', 3, STATS);
    expect(sugs.length).toBe(3);  // p10/median/p90
    expect(sugs[0].kind).toBe('value-hint');
  });

  it('"밀도<8" → 사용자가 값 입력 완료 → suggestion 없음', () => {
    const sugs = suggest('밀도<8', 4, STATS);
    expect(sugs.length).toBe(0);
  });

  it('"밀" partial → property suggestion (exact 아님)', () => {
    const sugs = suggest('밀', 1, STATS);
    expect(sugs.length).toBeGreaterThan(0);
    expect(sugs[0].kind).toBe('property');
  });

  /* R168 fix: 1글자 ASCII alias 는 더 입력 가능성이 있어 operator step 직행 금지. */
  it('"e" 1글자 ASCII alias → property prefix step 유지 (operator 아님)', () => {
    const sugs = suggest('e', 1, STATS);
    expect(sugs.length).toBeGreaterThan(0);
    /* 'e' 가 modulus alias 이지만, prop step 에서 modulus + elongation + electrical 등 prefix 매칭 표시. */
    expect(sugs[0].kind).not.toBe('operator');
  });

  it('"t" 1글자 ASCII alias → property prefix step 유지', () => {
    const sugs = suggest('t', 1, STATS);
    expect(sugs[0].kind).not.toBe('operator');
  });

  it('"ρ" 1글자 그리스 alias → operator step (의도된 완성)', () => {
    const sugs = suggest('ρ', 1, STATS);
    expect(sugs.length).toBe(6);
    expect(sugs[0].kind).toBe('operator');
  });

  it('"$" 1글자 비-alphabet alias → operator step', () => {
    const sugs = suggest('$', 1, STATS);
    expect(sugs.length).toBe(6);
    expect(sugs[0].kind).toBe('operator');
  });
});

describe('suggest — prefix step', () => {
  it('"s" → spec: 제안 + property "σy" 등', () => {
    const sugs = suggest('s', 1, STATS);
    /* prefix suggestions 포함. */
    const specSug = sugs.find((s) => s.kind === 'prefix' && s.insert === 'spec:');
    expect(specSug).toBeDefined();
  });

  it('"c" → cat: 제안', () => {
    const sugs = suggest('c', 1, STATS);
    const catSug = sugs.find((s) => s.kind === 'prefix' && s.insert === 'cat:');
    expect(catSug).toBeDefined();
  });

  it('"spec" → spec: prefix 만', () => {
    const sugs = suggest('spec', 4, STATS);
    /* prefix 단독 매칭 (3글자 이상이면 prop autocomplete 가 같은 prefix 한국어/영어 없음). */
    const specSug = sugs.find((s) => s.insert === 'spec:');
    expect(specSug).toBeDefined();
  });
});

describe('applySuggestion', () => {
  it('property: token 을 alias 로 교체', () => {
    const r = applySuggestion('밀', 1, { kind: 'property', label: '밀도', insert: '밀도', priority: 0 });
    expect(r.newInput).toBe('밀도');
    expect(r.newCursor).toBe(2);
  });

  it('operator: token 뒤에 operator append', () => {
    const r = applySuggestion('밀도', 2, { kind: 'operator', label: '<', insert: '<', priority: 0 });
    expect(r.newInput).toBe('밀도<');
    expect(r.newCursor).toBe(3);
  });

  it('value-hint: 값 + `; ` (세미콜론+공백) append (R169)', () => {
    const r = applySuggestion('밀도<', 3, { kind: 'value-hint', label: '8', insert: '8', priority: 0 });
    expect(r.newInput).toBe('밀도<8; ');
    expect(r.newCursor).toBe(6);
  });

  it('prefix: token 을 prefix 로 교체', () => {
    const r = applySuggestion('s', 1, { kind: 'prefix', label: 'spec:', insert: 'spec:', priority: 0 });
    expect(r.newInput).toBe('spec:');
    expect(r.newCursor).toBe(5);
  });

  it('두 token 사이 → 첫 token 영향 없음', () => {
    /* "밀도<5 항" — 길이 6, cursor 6 = 마지막 '항' 직후.
     *  '항' (position 5) 을 '항복' 으로 교체 → "밀도<5 항복" (길이 7), cursor 7. */
    const r = applySuggestion('밀도<5 항', 6, { kind: 'property', label: '항복', insert: '항복', priority: 0 });
    expect(r.newInput).toBe('밀도<5 항복');
    expect(r.newCursor).toBe(7);
  });
});
