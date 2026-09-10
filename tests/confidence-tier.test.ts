/*
 * C3 — confidence_tier 가 자기 규칙과 맞는지 (배포 데이터 기준 재현).
 *
 * 이 등급은 UI 필터·배지가 읽는 값이라 "안전 임계에 써도 되는가" 를 사실상 결정한다.
 * 그런데 규칙은 동결된 build-materials 안에 있고 뜻은 타입 주석에만 있었으며, 무엇보다
 * **찍는 시점이 너무 일렀다** — 그 뒤에 레지스트리 교정이 검증된 규격·핸드북 출처를 덧붙이고
 * (corrections/sources.json), build-from-registry 1d 가 표시 신뢰도를 하향한다. 둘 다 규칙의
 * 입력이라 상류에서 찍은 등급은 낡는다. 실제로 배포본에서 **205 entry** 가 어긋나 있었다.
 *
 * 그래서 이 게이트는 산출물을 규칙으로 **다시 계산해** 대조한다. 판정 기준은 재구현하지 않고
 * 생산자와 같은 모듈(scripts/lib/confidence-tier.mjs)을 import 한다 — 두 정의가 갈라지면
 * 게이트가 통과해 버리기 때문이다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { confidenceTierOf, confidenceInputs, CONF_W, CORE_PROPS, SAFETY_PROPS, TIER_RANK } from '../scripts/lib/confidence-tier.mjs';

type Mat = { id: string; stable_id?: string; name: string; confidence_tier?: string; sources?: unknown[]; ranges?: Record<string, { confidence?: string } | null> };

const raw = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'client/public/materials.json'), 'utf8'));
const ALL: Mat[] = Array.isArray(raw) ? raw : raw.materials;

describe('C3 — confidence_tier 재현', () => {
  it('모든 entry 의 등급이 규칙 재계산과 일치한다', () => {
    const bad: string[] = [];
    for (const m of ALL) {
      const want = confidenceTierOf(m);
      if (want === m.confidence_tier) continue;
      const i = confidenceInputs(m);
      bad.push(
        `${m.stable_id ?? m.id} ${String(m.name).slice(0, 36)}: 저장=${m.confidence_tier} 규칙=${want}`
        + ` (verified ${i.verified} · measured ${i.measuredCount} · handbook ${i.handbookCount} · safety ${i.safetyScore})`,
      );
    }
    expect(
      bad,
      `규칙과 어긋난 등급 ${bad.length}건 — 근거가 바뀐 뒤 재계산이 빠졌을 수 있다 (build-from-registry 1f).\n  ${bad.slice(0, 10).join('\n  ')}`,
    ).toEqual([]);
  });

  it('등급이 빠진 entry 가 없다', () => {
    const miss = ALL.filter((m) => !m.confidence_tier).map((m) => m.stable_id ?? m.id);
    expect(miss, `confidence_tier 없는 entry ${miss.length}건: ${miss.slice(0, 8).join(' | ')}`).toEqual([]);
  });

  it('등급 값은 정의된 넷 뿐이다', () => {
    const bad = [...new Set(ALL.map((m) => m.confidence_tier))].filter((t) => t != null && !(t in TIER_RANK));
    expect(bad, `정의 밖 등급: ${bad.join(' | ')}`).toEqual([]);
  });
});

describe('C3 — 규칙 자체가 뜻을 지키는지', () => {
  /* 규칙을 바꿀 수는 있지만, 바꾸면서 뜻이 뒤집히는 것은 막는다.
     "high = 안전 임계 사용 가능" 이 검증 출처 없이도 나오면 그 등급의 의미가 사라진다. */
  it('검증 출처가 하나도 없으면 high·medium 이 될 수 없다', () => {
    const mk = (verified: number, ranges: Record<string, { confidence: string }>) => ({
      sources: Array.from({ length: verified }, () => ({ verified: true })), ranges,
    });
    const allMeasured = Object.fromEntries([...CORE_PROPS, ...SAFETY_PROPS].map((p) => [p, { confidence: 'measured' }]));
    expect(confidenceTierOf(mk(0, allMeasured)), '검증 출처 0 이면 최대 medium-low').toBe('medium-low');
    expect(confidenceTierOf(mk(1, allMeasured))).toBe('high');   // measured ≥4 + verified ≥1
    expect(confidenceTierOf(mk(2, {}))).toBe('high');            // verified ≥2 단독
  });

  it('근거가 전혀 없으면 low', () => {
    expect(confidenceTierOf({ sources: [], ranges: {} })).toBe('low');
  });

  it('가중치는 실측 > 핸드북 > 계열 폴백 순서를 지킨다', () => {
    expect(CONF_W.measured).toBeGreaterThan(CONF_W.handbook);
    expect(CONF_W.handbook).toBeGreaterThan(CONF_W.subfamily);
    expect(CONF_W.subfamily).toBeGreaterThan(CONF_W.family);
    expect(CONF_W.family).toBeGreaterThan(CONF_W.class);
    expect(CONF_W.class).toBeGreaterThan(CONF_W.derived);
  });

  it('안전 물성은 core 와 겹치지 않는다 (이중 계산 방지)', () => {
    const overlap = SAFETY_PROPS.filter((p: string) => CORE_PROPS.includes(p));
    expect(overlap, `core·safety 중복: ${overlap.join(' | ')}`).toEqual([]);
  });
});
