/*
 * A19 (2026-09-20) — 파생 피로강도는 **현재 입력**으로 계산된 값이어야 한다.
 *
 * C1 폴백(σf ≈ k·σy)·R205-R 재유도(σf ≈ r·UTS)는 모놀리스가 값을 찍는 시점의 σy·UTS 로 계산되고,
 * 그 뒤 레지스트리 단계의 datasheet 교정이 σy 를 바꿔도 파생값은 옛 입력에 묶여 있었다 — C3 의
 * confidence_tier 와 같은 '재계산 시점' 문제. 실측(A3 Al re-verify 중 적발): 파생 피로 487 중 금속 43 이
 * 현재 σy 와 불일치(AISI 1040 Q+T 157 vs 규칙 295 · AA 6101-H111 88 = UTS 의 0.93, 물리 상한 초과).
 * build-from-registry 1i 가 같은 규칙(lib/fatigue-fallback.mjs)을 바뀐 입력에 다시 적용한다.
 *
 * 이 게이트는 생산자·재유도와 **같은 모듈**을 import 한다 — 규칙을 여기서 재구현하면 둘이 갈라진다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fatigueRule, parseDerivedFatigue, FATIGUE_RATIO } from '../scripts/lib/fatigue-fallback.mjs';

type Range = { typical?: number | null; min?: number | null; max?: number | null; confidence?: string; provenance?: string };
type Mat = { name: string; category: string; fatigue_strength?: number | null; ranges?: Record<string, Range | undefined> };
const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
const ALL: Mat[] = Array.isArray(raw) ? raw : raw.materials;
const num = (x: unknown): x is number => typeof x === 'number' && isFinite(x);

const derived = ALL.filter((m) => m.category === 'Metal' && m.ranges?.fatigue_strength?.confidence === 'derived');

describe('A19 — 파생 피로강도 = 규칙(현재 σy·UTS)', () => {
  it('검사 대상이 실제로 모였다 (파생 금속 피로 ≥ 300)', () => {
    expect(derived.length).toBeGreaterThan(300);
  });

  it('provenance 의 계수는 규칙 표(lib)의 계수와 같다 — 이름이 다른 계열 규칙에 걸리면 실패', () => {
    const bad: string[] = [];
    for (const m of derived) {
      const p = parseDerivedFatigue(m.ranges!.fatigue_strength!.provenance);
      if (!p || p.base !== 'σy') continue;
      const rule = fatigueRule(m);
      if (!rule || Math.abs(rule.kTyp - p.k) > 1e-9) bad.push(`${m.name}: provenance ${p.k} vs 규칙 ${rule ? rule.kTyp : '없음'}`);
    }
    expect(bad).toEqual([]);
  });

  it('typical = round(k·기준값) — σy(계열 폴백)·UTS(R205-R) 모두, 그리고 평면값도 같다', () => {
    const stale: string[] = [];
    for (const m of derived) {
      const fr = m.ranges!.fatigue_strength!;
      const p = parseDerivedFatigue(fr.provenance);
      if (!p) continue;
      const base = p.base === 'σy' ? m.ranges!.yield_strength?.typical : m.ranges!.uts?.typical;
      if (!num(base) || !num(fr.typical)) continue;
      const expected = Math.round(base * p.k);
      if (Math.abs(expected - fr.typical) > 1) stale.push(`${m.name}: σf ${fr.typical} ≠ round(${p.k}·${p.base} ${base}) = ${expected}`);
      if (num(m.fatigue_strength) && Math.abs(m.fatigue_strength - fr.typical) > 1e-9) stale.push(`${m.name}: 평면값 ${m.fatigue_strength} ≠ ranges ${fr.typical}`);
    }
    expect(stale, `되돌아오면 정확히 이 목록으로 발화한다 (2026-09-20 실측 43건):\n${stale.slice(0, 8).join('\n')}`).toEqual([]);
  });

  it('min ≤ typical ≤ max, 그리고 물리 상한(0.63·UTS) 이내', () => {
    const bad: string[] = [];
    for (const m of derived) {
      const fr = m.ranges!.fatigue_strength!;
      if (!num(fr.typical)) continue;
      if (num(fr.min) && fr.min > fr.typical + 1e-9) bad.push(`${m.name}: min ${fr.min} > typical ${fr.typical}`);
      if (num(fr.max) && fr.max < fr.typical - 1e-9) bad.push(`${m.name}: max ${fr.max} < typical ${fr.typical}`);
      const u = m.ranges!.uts?.typical;
      if (num(u) && u > 0 && fr.typical / u > 0.63) bad.push(`${m.name}: σf/UTS ${(fr.typical / u).toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  });

  it('규칙 표 자체의 뜻 — 계수는 오름차순(k_low < k_typ < k_high), 모두 0.63 아래', () => {
    for (const [, kLo, kTyp, kHi] of FATIGUE_RATIO as Array<[RegExp, number, number, number, string]>) {
      expect(kLo).toBeLessThan(kTyp);
      expect(kTyp).toBeLessThan(kHi);
      expect(kHi).toBeLessThanOrEqual(0.63);
    }
  });
});
