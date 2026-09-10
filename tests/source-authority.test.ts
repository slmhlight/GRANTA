/*
 * E3 (H6 W4-2) — 출처 권위 등급 필터·정렬 술어 회귀.
 *
 * 이 필터의 위험은 기능이 아니라 **정책**이다: 저신뢰 출처를 감추는 장치가 되면
 * LONGTERM-PLAN 원칙 8("UI 는 confidence/provenance/authority 를 숨기지 않고 표기")을 어긴다.
 * 그래서 "선택이 비면 전량 통과" 와 "OR 조건(그 등급을 가진 재료를 남김)" 을 게이트로 고정한다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  AUTHORITY_ORDER, AUTHORITY_META, authorityGrades, bestAuthority, authorityRank, matchesAuthority,
} from '../client/src/lib/source-authority';
import type { Material } from '../client/src/lib/materials';

const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
const ALL: Material[] = Array.isArray(raw) ? raw : raw.materials;

const mk = (grades: Array<string | undefined>): Material =>
  ({ id: 'x', name: 'X', category: 'Metal', sources: grades.map((g) => ({ label: 'l', url: null, verified: false, authority: g })) } as unknown as Material);

describe('E3 — 권위 등급 술어', () => {
  it('선택이 비면 전량 통과 (기본은 노출이지 은폐가 아니다)', () => {
    for (const sel of [undefined, []] as const) {
      const kept = ALL.filter((m) => matchesAuthority(m, sel));
      expect(kept.length).toBe(ALL.length);
    }
  });

  it('OR 조건 — 선택 등급을 하나라도 가지면 통과', () => {
    const m = mk(['standard', 'aggregator']);
    expect(matchesAuthority(m, ['standard'])).toBe(true);
    expect(matchesAuthority(m, ['aggregator'])).toBe(true);
    expect(matchesAuthority(m, ['handbook'])).toBe(false);
    expect(matchesAuthority(m, ['handbook', 'aggregator'])).toBe(true);
  });

  it('선택을 늘리면 결과가 줄지 않는다 (OR 의 단조성)', () => {
    const one = ALL.filter((m) => matchesAuthority(m, ['handbook'])).length;
    const two = ALL.filter((m) => matchesAuthority(m, ['handbook', 'aggregator'])).length;
    expect(two).toBeGreaterThanOrEqual(one);
  });

  it('authority 미표기 출처는 other 로 센다', () => {
    expect([...authorityGrades(mk([undefined]))]).toEqual(['other']);
  });

  it('최고 등급·정렬 순위가 순서표를 따른다', () => {
    expect(bestAuthority(mk(['aggregator', 'standard', 'other']))).toBe('standard');
    expect(bestAuthority(mk([]))).toBeNull();
    expect(authorityRank(mk(['standard']))).toBeLessThan(authorityRank(mk(['handbook'])));
    expect(authorityRank(mk(['other']))).toBeLessThan(authorityRank(mk([])));   // 출처 없음이 맨 뒤
  });

  it('라벨 맵이 순서표를 빠짐없이 덮는다 (chip 이 빈 칸을 그리지 않도록)', () => {
    for (const a of AUTHORITY_ORDER) {
      expect(AUTHORITY_META[a], `${a} 라벨 없음`).toBeTruthy();
      expect(AUTHORITY_META[a].s.length).toBeGreaterThan(0);
    }
    expect(Object.keys(AUTHORITY_META).sort()).toEqual([...AUTHORITY_ORDER].sort());
  });
});

describe('E3 — 코퍼스 실측 (필터가 실제로 쓸모 있는가)', () => {
  it('각 등급이 유의미한 재료 수를 가진다 (chip 이 죽은 버튼이 아님)', () => {
    const counts = Object.fromEntries(AUTHORITY_ORDER.map((a) => [a, ALL.filter((m) => authorityGrades(m).has(a)).length]));
    for (const a of AUTHORITY_ORDER) {
      expect(counts[a], `${a} 보유 재료 0 — chip 이 아무것도 못 거른다`).toBeGreaterThan(0);
      expect(counts[a], `${a} 가 전량(${ALL.length}) — chip 이 아무것도 안 거른다`).toBeLessThan(ALL.length);
    }
  });

  it('최고 등급 축으로는 필터가 성립하지 않는다 — OR(any) 축을 쓴 근거', () => {
    /* 전 재료의 최고 등급이 standard/handbook 둘뿐이라, '최고 등급' chip 은
       manufacturer·aggregator·other 에서 항상 0건이 된다. 설계 근거를 데이터로 고정한다. */
    const bests = new Set(ALL.map((m) => bestAuthority(m)));
    expect([...bests].filter((b): b is string => b !== null).sort()).toEqual(['handbook', 'standard']);
  });
});
