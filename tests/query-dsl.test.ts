/* R144b — Query DSL parser & matcher tests. */
import { describe, expect, it } from 'vitest';
import { applyQuery, parseQuery, describeConstraint } from '../client/src/lib/query-dsl';
import type { Material } from '../client/src/lib/materials';

const M = (overrides: Partial<Material>): Material => ({
  id: 'test-id',
  name: 'Test',
  category: 'Metal',
  subcategory: 'Stainless Steel',
  manufacturer: '',
  process: '',
  density: 7.8,
  yield_strength: 500,
  uts: 600,
  elongation: 20,
  modulus: 200,
  hardness: 250,
  thermal_conductivity: 15,
  composition: {} as Material['composition'],
  ...overrides,
});

describe('parseQuery', () => {
  it('parses simple numeric constraint', () => {
    const p = parseQuery('σy>500');
    expect(p.constraints).toHaveLength(1);
    expect(p.constraints[0]).toMatchObject({ prop: 'yield_strength', op: '>', value: 500 });
  });

  it('parses multi-constraint AND', () => {
    const p = parseQuery('yield>500 density<8 T>300');
    expect(p.constraints).toHaveLength(3);
  });

  it('parses quoted text', () => {
    const p = parseQuery('"Ti-6Al-4V"');
    expect(p.constraints).toHaveLength(1);
    expect(p.constraints[0]).toMatchObject({ kind: 'text', query: 'Ti-6Al-4V' });
  });

  it('parses spec prefix', () => {
    const p = parseQuery('spec:AMS5662');
    expect(p.constraints[0]).toMatchObject({ kind: 'spec', query: 'AMS5662' });
  });

  it('parses category prefix', () => {
    const p = parseQuery('cat:metal');
    expect(p.constraints[0]).toMatchObject({ kind: 'category', value: 'metal' });
  });

  it('handles mixed numeric + text + spec', () => {
    const p = parseQuery('"Inconel" σy>1000 spec:AMS5662 cat:metal');
    expect(p.constraints.length).toBeGreaterThanOrEqual(4);
  });

  it('records unknown tokens', () => {
    const p = parseQuery('!!! σy>500');
    expect(p.constraints).toHaveLength(1);
    expect(p.unknown.length).toBeGreaterThan(0);
  });
});

describe('applyQuery', () => {
  const mats: Material[] = [
    M({ id: 'a', name: 'Steel A', ranges: { yield_strength: { min: 400, max: 600, typical: 500, n: 1 }, density: { min: 7.7, max: 7.9, typical: 7.8, n: 1 } } }),
    M({ id: 'b', name: 'Aluminum B', ranges: { yield_strength: { min: 200, max: 280, typical: 240, n: 1 }, density: { min: 2.6, max: 2.8, typical: 2.7, n: 1 } } }),
    M({ id: 'c', name: 'Inconel 718', ranges: { yield_strength: { min: 1000, max: 1300, typical: 1150, n: 1 }, density: { min: 8.1, max: 8.3, typical: 8.2, n: 1 } }, meta: { specs: [{ id: 'AMS 5662', org: 'AMS' as const }] } }),
  ];

  it('filters by single numeric constraint', () => {
    const p = parseQuery('σy>800');
    const r = applyQuery(mats, p);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('c');
  });

  it('AND-combines multi-constraint', () => {
    const p = parseQuery('σy>400 density<5');
    const r = applyQuery(mats, p);
    expect(r).toHaveLength(0); // no material satisfies both
  });

  it('matches by spec', () => {
    const p = parseQuery('spec:AMS5662');
    const r = applyQuery(mats, p);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('c');
  });

  it('matches text in name', () => {
    const p = parseQuery('"Inconel"');
    const r = applyQuery(mats, p);
    expect(r).toHaveLength(1);
  });

  it('returns all when query empty', () => {
    const r = applyQuery(mats, parseQuery(''));
    expect(r).toHaveLength(3);
  });
});

describe('describeConstraint', () => {
  it('formats numeric with unit', () => {
    const p = parseQuery('σy>500');
    expect(describeConstraint(p.constraints[0])).toContain('MPa');
  });
});

/* R167 Phase A — 한국어 별칭 + 자연어 비교어. */
describe('parseQuery — R167 Phase A 한국어', () => {
  it('한국어 property 별칭: 밀도', () => {
    const p = parseQuery('밀도<8');
    expect(p.constraints).toHaveLength(1);
    expect(p.constraints[0]).toMatchObject({ prop: 'density', op: '<', value: 8 });
  });

  it('한국어 property 별칭: 항복', () => {
    const p = parseQuery('항복>500');
    expect(p.constraints[0]).toMatchObject({ prop: 'yield_strength', op: '>', value: 500 });
  });

  it('한국어 property 별칭: 항복강도 (긴 형태)', () => {
    const p = parseQuery('항복강도>=800');
    expect(p.constraints[0]).toMatchObject({ prop: 'yield_strength', op: '>=', value: 800 });
  });

  it('한국어 property 별칭: 인장 / 인장강도', () => {
    const a = parseQuery('인장>600');
    const b = parseQuery('인장강도>600');
    expect(a.constraints[0]).toMatchObject({ prop: 'uts' });
    expect(b.constraints[0]).toMatchObject({ prop: 'uts' });
  });

  it('한국어 property 별칭: 탄성 / 영률', () => {
    const p = parseQuery('영률>100');
    expect(p.constraints[0]).toMatchObject({ prop: 'modulus', op: '>', value: 100 });
  });

  it('한국어 property 별칭: 온도 / 사용온도 / 최대온도', () => {
    const p = parseQuery('사용온도>500');
    expect(p.constraints[0]).toMatchObject({ prop: 'max_service_temp', op: '>', value: 500 });
  });

  it('한국어 property 별칭: 가격 / 단가 / 비용', () => {
    const a = parseQuery('가격<50');
    const b = parseQuery('단가<50');
    const c = parseQuery('비용<50');
    expect(a.constraints[0]).toMatchObject({ prop: 'price_per_kg', op: '<', value: 50 });
    expect(b.constraints[0]).toMatchObject({ prop: 'price_per_kg', op: '<', value: 50 });
    expect(c.constraints[0]).toMatchObject({ prop: 'price_per_kg', op: '<', value: 50 });
  });

  it('한국어 property 별칭: 경도 / 인성 / 파괴인성', () => {
    expect(parseQuery('경도>400').constraints[0]).toMatchObject({ prop: 'hardness' });
    expect(parseQuery('인성>50').constraints[0]).toMatchObject({ prop: 'fracture_toughness' });
    expect(parseQuery('파괴인성>50').constraints[0]).toMatchObject({ prop: 'fracture_toughness' });
  });

  it('한국어 자연어 비교어: 미만 → <', () => {
    const p = parseQuery('밀도 8 미만');
    expect(p.constraints).toHaveLength(1);
    expect(p.constraints[0]).toMatchObject({ prop: 'density', op: '<', value: 8 });
  });

  it('한국어 자연어 비교어: 이하 → <=', () => {
    const p = parseQuery('경도 200 이하');
    expect(p.constraints[0]).toMatchObject({ prop: 'hardness', op: '<=', value: 200 });
  });

  it('한국어 자연어 비교어: 이상 → >=', () => {
    const p = parseQuery('항복 500 이상');
    expect(p.constraints[0]).toMatchObject({ prop: 'yield_strength', op: '>=', value: 500 });
  });

  it('한국어 자연어 비교어: 초과 → >', () => {
    const p = parseQuery('온도 300 초과');
    expect(p.constraints[0]).toMatchObject({ prop: 'max_service_temp', op: '>', value: 300 });
  });

  it('한국어 자연어 비교어: 이내 → <=', () => {
    const p = parseQuery('단가 50 이내');
    expect(p.constraints[0]).toMatchObject({ prop: 'price_per_kg', op: '<=', value: 50 });
  });

  it('한국어 + 영어 혼합 multi-constraint', () => {
    const p = parseQuery('밀도<8 yield>500');
    expect(p.constraints).toHaveLength(2);
    expect(p.constraints[0]).toMatchObject({ prop: 'density', op: '<', value: 8 });
    expect(p.constraints[1]).toMatchObject({ prop: 'yield_strength', op: '>', value: 500 });
  });

  it('자연어 비교어 multi-constraint', () => {
    const p = parseQuery('밀도 8 미만 항복 500 이상');
    expect(p.constraints).toHaveLength(2);
    expect(p.constraints[0]).toMatchObject({ prop: 'density', op: '<', value: 8 });
    expect(p.constraints[1]).toMatchObject({ prop: 'yield_strength', op: '>=', value: 500 });
  });

  it('따옴표 안의 한국어 키워드는 자연어 변환되지 않음 (text 로 보존)', () => {
    const p = parseQuery('"밀도 8 미만" 항복>500');
    /* "밀도 8 미만" 은 quote 안이므로 그대로 text constraint 로, 그 외 항복>500 만 numeric. */
    const textC = p.constraints.find(c => 'kind' in c && c.kind === 'text');
    const numC = p.constraints.find(c => !('kind' in c));
    expect(textC).toMatchObject({ kind: 'text', query: '밀도 8 미만' });
    expect(numC).toMatchObject({ prop: 'yield_strength', op: '>', value: 500 });
  });
});

/* R169 — `;` 구분 기호 지원. */
describe('parseQuery — R169 `;` 구분 기호', () => {
  it('`;` 으로 token 구분: "밀도<8;항복>500"', () => {
    const p = parseQuery('밀도<8;항복>500');
    expect(p.constraints).toHaveLength(2);
    expect(p.constraints[0]).toMatchObject({ prop: 'density', op: '<', value: 8 });
    expect(p.constraints[1]).toMatchObject({ prop: 'yield_strength', op: '>', value: 500 });
  });

  it('`; ` (세미콜론 + 공백) 도 정상: "밀도<8; 항복>500"', () => {
    const p = parseQuery('밀도<8; 항복>500');
    expect(p.constraints).toHaveLength(2);
  });

  it('공백 단독도 backward-compat: "밀도<8 항복>500"', () => {
    const p = parseQuery('밀도<8 항복>500');
    expect(p.constraints).toHaveLength(2);
  });

  it('`;` 과 공백 혼합: "밀도<8; 항복>500 인장>700"', () => {
    const p = parseQuery('밀도<8; 항복>500 인장>700');
    expect(p.constraints).toHaveLength(3);
  });

  it('따옴표 안의 `;` 는 보존', () => {
    const p = parseQuery('"hello;world" 밀도<8');
    const textC = p.constraints.find(c => 'kind' in c && c.kind === 'text');
    const numC = p.constraints.find(c => !('kind' in c));
    expect(textC).toMatchObject({ kind: 'text', query: 'hello;world' });
    expect(numC).toMatchObject({ prop: 'density', op: '<', value: 8 });
  });

  it('연속된 `;` 는 빈 token 으로 처리하지 않음', () => {
    const p = parseQuery('밀도<8;;;항복>500');
    expect(p.constraints).toHaveLength(2);
  });
});

/* R167 Phase A — applyQuery 검증 (한국어 통합). */
describe('applyQuery — R167 Phase A 한국어 통합', () => {
  const mats: Material[] = [
    M({ id: 'a', name: '강철 A', ranges: { yield_strength: { min: 400, max: 600, typical: 500, n: 1 }, density: { min: 7.7, max: 7.9, typical: 7.8, n: 1 } } }),
    M({ id: 'b', name: '알루미늄 B', ranges: { yield_strength: { min: 200, max: 280, typical: 240, n: 1 }, density: { min: 2.6, max: 2.8, typical: 2.7, n: 1 } } }),
  ];

  it('한국어 자연어 query 가 정상 필터링', () => {
    const p = parseQuery('밀도 5 미만 항복 200 이상');
    const r = applyQuery(mats, p);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('b');
  });

  it('한국어 별칭 = 영어 별칭 = 그리스 결과 동일', () => {
    const a = applyQuery(mats, parseQuery('밀도<5'));
    const b = applyQuery(mats, parseQuery('density<5'));
    const c = applyQuery(mats, parseQuery('ρ<5'));
    expect(a.length).toBe(b.length);
    expect(b.length).toBe(c.length);
  });
});
