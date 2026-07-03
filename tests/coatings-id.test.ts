/*
 * R226p Phase 5 — coatings 추천 Material-ID 전환 behavior-identical 게이트.
 *
 * 구 recommendedCoatings 는 런타임에 substrateMatch **name-regex** 를 재료 이름+공정에 매칭했다.
 * 전환 후엔 빌드가 alloy-specific 매칭 coating id 집합을 m.profiles.coatings 로 스탬프하고,
 * 런타임은 그 집합 + 'all' 코팅만 쓴다 (regex 0).
 *
 * 이 테스트는 client/public/materials.json 전 재료에 대해:
 *  (1) profiles.coatings === regex 오라클(구 호출부 입력 name+process 재현) — 스탬프 정합
 *  (2) 신규 recommendedCoatings 출력 === 구 로직 출력 — 최종 추천 리스트 불변
 * 을 게이트해, 표현(regex→ID) 전환이 값·순서 완전 불변임을 CI 에서 고정한다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { COATINGS, recommendedCoatings, type Coating } from '../client/src/lib/coatings';
import type { Material } from '../client/src/lib/materials';

const all: Material[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'client', 'public', 'materials.json'), 'utf8'));

/* 구 로직 오라클 — 호출부가 넘긴 입력({category,name,process}, subcategory 미전달) 그대로 재현.
 * concat = lower(name)+' '+lower(process)+' '+lower('')  → 실질 name+process. */
function oracleAlloyMatches(m: Material): Set<string> {
  const cat = m.category;
  const concat = `${String(m.name || '').toLowerCase()} ${String(m.process || '').toLowerCase()}  `;
  const ids = new Set<string>();
  for (const c of COATINGS) {
    if (cat && !c.applicableTo.includes(cat as any) && !c.applicableTo.includes('All')) continue;
    if (c.substrateMatch !== 'all' && new RegExp(c.substrateMatch, 'i').test(concat)) ids.add(c.id);
  }
  return ids;
}

/* 구 recommendedCoatings 전체 재현 (점수/보너스/정렬 동일) — 최종 리스트 비교용. */
function oracleRecommend(m: Material, max = 3): Coating[] {
  const cat = m.category;
  const matched = oracleAlloyMatches(m);
  const scored: { coating: Coating; score: number }[] = [];
  for (const c of COATINGS) {
    if (cat && !c.applicableTo.includes(cat as any) && !c.applicableTo.includes('All')) continue;
    let score = 0;
    if (c.substrateMatch === 'all') score = 0.5;
    else if (matched.has(c.id)) score = 10;
    else continue;
    if (c.fatigueGainPct && c.fatigueGainPct >= 30) score += 1;
    if (c.corrosionUpgrade === '+2' || c.corrosionUpgrade === 'major') score += 1;
    if ((c.surfaceHardnessHV ?? 0) >= 1500) score += 0.5;
    if (c.costFactor >= 2.0) score -= 0.5;
    scored.push({ coating: c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((x) => x.coating);
}

describe('R226p Phase 5 — coatings Material-ID 전환 (behavior identical)', () => {
  it('profiles.coatings 가 alloy-specific regex 오라클과 전 재료 정합', () => {
    const mismatches: string[] = [];
    for (const m of all) {
      const expected = [...oracleAlloyMatches(m)].sort();
      const actual = [...(m.profiles?.coatings || [])].sort();
      if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        mismatches.push(`${(m as any).stable_id || m.id} ${m.name}: exp[${expected}] act[${actual}]`);
      }
    }
    expect(mismatches.slice(0, 20).join('\n')).toBe('');
    expect(mismatches.length).toBe(0);
  });

  it('recommendedCoatings 최종 추천 리스트가 구 로직과 전 재료 동일', () => {
    const diffs: string[] = [];
    for (const m of all) {
      const now = recommendedCoatings(m, 3).map((c) => c.id);
      const old = oracleRecommend(m, 3).map((c) => c.id);
      if (JSON.stringify(now) !== JSON.stringify(old)) {
        diffs.push(`${m.name}: now[${now}] old[${old}]`);
      }
    }
    expect(diffs.slice(0, 20).join('\n')).toBe('');
    expect(diffs.length).toBe(0);
  });

  it('스탬프된 모든 coating id 가 COATINGS 에 실재', () => {
    const known = new Set(COATINGS.map((c) => c.id));
    const bad: string[] = [];
    for (const m of all) for (const id of m.profiles?.coatings || []) if (!known.has(id)) bad.push(`${m.name}: ${id}`);
    expect(bad.join('\n')).toBe('');
  });

  it('런타임 recommendedCoatings 에 live name-regex 부재 (표현 전환 회귀 방지)', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'client', 'src', 'lib', 'coatings.ts'), 'utf8');
    const fnStart = src.indexOf('export function recommendedCoatings');
    const fnBody = src.slice(fnStart, src.indexOf('\n}', fnStart) + 2);
    // 함수 본문 내 substrateMatch 를 RegExp 로 테스트하는 잔재가 없어야 함 (regex 매칭은 빌드로 이동)
    expect(/new RegExp\([^)]*substrateMatch/.test(fnBody)).toBe(false);
    // 'all' 분기는 런타임 유지 (재료 무관 코팅)
    expect(fnBody.includes("=== 'all'")).toBe(true);
    // profiles.coatings 집합 조회로 alloy 매칭
    expect(fnBody.includes('m.profiles?.coatings')).toBe(true);
  });
});
