/*
 * W4-8 — 완전성 측정 기준의 **근거**를 고정하는 게이트.
 *
 * 이번에 고친 것은 임계값이 아니라 질문이다. 이전 감사는 부적용을 공백으로 세고 있었다:
 *   · 세라믹에 연신율을, 폴리머·복합재에 HV 경도를 요구 (해당 척도를 안 쓰는 재료들)
 *   · 조건이 없는 세라믹·복합재에 조건별 points 를 요구
 *   · 조건 entry 각각이 위키 엔티티의 **대표**이길 요구 (엔티티는 합금 단위로 하나다)
 *
 * 기준을 현재 커버리지에 맞추면 순환논리가 되므로, 여기서는 **그 판단이 딛고 선 사실**을 검사한다.
 * 사실이 달라지면(예: 세라믹 연신율을 인용하기 시작하면) 이 게이트가 먼저 깨지고, 기준을 다시 본다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Mat = {
  category: string; story_key?: string; stable_id?: string; id: string;
  points?: unknown[]; ranges?: Record<string, { typical?: number | null } | undefined>;
  [k: string]: unknown;
};
const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
const ALL: Mat[] = Array.isArray(raw) ? raw : raw.materials;
const has = (m: Mat, p: string) => m.ranges?.[p]?.typical != null || typeof m[p] === 'number';
const cov = (cat: string, p: string) => {
  const g = ALL.filter((m) => m.category === cat);
  return g.length ? g.filter((m) => has(m, p)).length / g.length : 0;
};

describe('W4-8 — 카테고리별 부적용 물성 (제외의 근거)', () => {
  it('세라믹은 연신율을 인용하지 않는다 (취성)', () => {
    expect(cov('Ceramic', 'elongation'), '세라믹 연신율 보유율이 올랐다 — core 기대 집합을 다시 볼 것').toBeLessThan(0.1);
  });

  it('폴리머·복합재는 HV 경도를 인용하지 않는다 (Shore 척도)', () => {
    expect(cov('Polymer', 'hardness')).toBeLessThan(0.5);
    expect(cov('Composite', 'hardness')).toBeLessThan(0.5);
  });

  it('복합재는 융점·파괴인성을 인용하지 않는다 (기지 분해 · 라미네이트)', () => {
    expect(cov('Composite', 'melting_point')).toBeLessThan(0.1);
    expect(cov('Composite', 'fracture_toughness')).toBeLessThan(0.1);
  });

  it('금속은 core 물성을 사실상 전부 갖는다 (기대를 낮추지 않았음을 확인)', () => {
    for (const p of ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'thermal_conductivity'])
      expect(cov('Metal', p), `금속 ${p}`).toBeGreaterThan(0.9);
  });
});

describe('W4-8 — 조건별 points 는 조건이 있는 재료에만', () => {
  it('세라믹·복합재는 조건 행을 갖지 않는다', () => {
    expect(cov0('Ceramic')).toBeLessThan(0.1);
    expect(cov0('Composite')).toBeLessThan(0.2);
  });
  it('금속은 조건 행을 갖는다', () => {
    expect(cov0('Metal')).toBeGreaterThan(0.9);
  });
  function cov0(cat: string) {
    const g = ALL.filter((m) => m.category === cat);
    return g.length ? g.filter((m) => Array.isArray(m.points) && m.points.length > 0).length / g.length : 0;
  }
});

describe('W4-8 — 위키 엔티티는 합금 단위다', () => {
  const wi = JSON.parse(fs.readFileSync(path.resolve('client/public/wiki-index.json'), 'utf8'));
  const entities: Array<{ rep_id?: string; story_key?: string }> = wi.entities ?? [];
  const repIds = new Set(entities.map((e) => e.rep_id).filter(Boolean));
  const keys = new Set(entities.map((e) => e.story_key).filter(Boolean));

  it('entry 각각이 대표일 수는 없다 — 대표 비율은 낮고 합금 도달률은 높다', () => {
    const repRatio = ALL.filter((m) => repIds.has(m.id)).length / ALL.length;
    const reachRatio = ALL.filter((m) => m.story_key && keys.has(m.story_key)).length / ALL.length;
    expect(repRatio, '대표 비율이 높다 — 엔티티가 조건별로 생겼는지 확인').toBeLessThan(0.5);
    expect(reachRatio, '합금 단위 도달률이 떨어졌다 — 상호참조 회귀').toBeGreaterThan(0.95);
  });

  it('엔티티 없는 재료는 소수이고 목록으로 남는다', () => {
    const miss = ALL.filter((m) => !(m.story_key && keys.has(m.story_key))).map((m) => m.stable_id ?? m.id);
    expect(miss.length, `엔티티 없는 재료 ${miss.length}건: ${miss.slice(0, 10).join(' | ')}`).toBeLessThanOrEqual(5);
  });
});
