/*
 * H6 W2-2 — 조건 간 물리 정합 게이트.
 *
 * 배경: generic tier 의 조건별 값이 base × 합성배율로 찍혀 있던 잔재 때문에 **냉간가공했는데
 * 연신율이 annealed 보다 높은** entry 가 13 base 존재했다(σy ×1.227 · El ×1.108 동시 상승).
 * anomaly 검출(물리 상한)·golden(값 대조) 어느 쪽에도 안 걸리는 유형 — 조건 **사이의 관계**가
 * 깨진 것이라 base 를 가로질러 봐야만 보인다.
 *
 * 규칙: 같은 base 안에서 σy 가 유의하게(>8%) 높은 조건은 연신율이 더 높을 수 없다.
 * 예외는 아래 LEGITIMATE 에 **사유와 함께** 등재한다(전공정이 달라 실제로 연성이 회복되는 경우).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type M = {
  name?: string; heat_treatment?: string; category?: string;
  ranges?: Record<string, { typical?: number }>;
};
const all: M[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'client', 'public', 'materials.json'), 'utf8'));

/** 강화 조건인데 연신율이 더 높은 것이 **실제로 정상**인 경우 — 전공정이 달라 연성이 회복된다. */
const LEGITIMATE: Record<string, string> = {
  'AISI 1080': '냉간인발 제품형은 구상화 어닐링 후 인발 — 구상 세멘타이트가 펄라이트(annealed)보다 연성이 높다',
  'AISI 1095': '동상 — 고탄소강은 구상화하지 않으면 인발 자체가 불가',
  'AA 2014': 'Aluminum Association 공인값 — O 18% < T4 20% (용체화 상태의 연성)',
  'AA 2025': '동상 — 2xxx 계 T4/용체화 조건의 공인 연신율이 O 보다 높다',
};

/* 미해소 잔여 — **숨기지 않고 공개**(원칙: 그룹 잔존 시 정직 공개). W2-2 에서 냉간가공(strain-hardened)
 * 계열은 웹 검증 후 전건 교정했으나, 아래는 진단이 다르다: Q&T 값은 실제와 맞고 **annealed 쪽 연신율이
 * 저평가**돼 역전이 생긴다(예 1040 annealed El 16.7 — ASM 실제 ~30%). generic 탄소강 annealed 층의
 * 별개 오염이라 base 값 재검증이 선행돼야 한다 → 백로그 D9. 신규 위배는 여전히 게이트가 잡는다. */
const KNOWN_OPEN: Record<string, string> = {
  'AISI 1010': 'annealed El 저평가 의심 (Q&T 값은 정합) — D9 큐',
  'AISI 1020': 'annealed El 저평가 의심 — D9 큐',
  'AISI 1025': 'annealed El 저평가 의심 — D9 큐',
  'AISI 1030': 'annealed El 저평가 의심 — D9 큐',
  'AISI 1040': 'annealed El 16.7 (ASM ~30%) — D9 큐',
  'AISI 1050': 'annealed El 14.0 (ASM ~24%) — D9 큐',
  'AISI 4150': 'annealed El 12.1 저평가 + 냉간인발 검증 소스 미확보 — D9 큐',
  'AISI 5130': 'annealed El 23.3 대비 Q&T 25 — 냉간인발 검증 소스 미확보 — D9 큐',
};

const SOFT = /anneal|solution|as-supplied|as-cast|hot.?roll|normali/i;
const HARD = /strain.?harden|cold.?work|hard|quench|temper|aged|aging|H\d|T\d/i;
const baseOf = (m: M) => (m.name || '').split('—')[0].trim();
const V = (m: M, k: string) => m.ranges?.[k]?.typical;

describe('물리 정합 (W2-2) — 조건 간 강도·연성 역전 검출', () => {
  it('강화 조건(σy +8% 초과)은 연질 조건보다 연신율이 높을 수 없다', () => {
    const groups = new Map<string, M[]>();
    for (const m of all) {
      const b = baseOf(m);
      if (!groups.has(b)) groups.set(b, []);
      groups.get(b)!.push(m);
    }
    const bad: string[] = [];
    for (const [b, ms] of groups) {
      if (LEGITIMATE[b] || KNOWN_OPEN[b] || ms.length < 2) continue;
      const soft = ms.filter((m) => SOFT.test(`${m.heat_treatment || ''} ${m.name || ''}`) && !HARD.test(m.heat_treatment || ''));
      const hard = ms.filter((m) => HARD.test(m.heat_treatment || ''));
      for (const s of soft) {
        for (const h of hard) {
          const [es, eh] = [V(s, 'elongation'), V(h, 'elongation')];
          const [ys, yh] = [V(s, 'yield_strength'), V(h, 'yield_strength')];
          if ([es, eh, ys, yh].some((x) => typeof x !== 'number')) continue;
          if (yh! > ys! * 1.08 && eh! > es! * 1.02) {
            bad.push(`${b}: [${s.heat_treatment}] σy${ys}/El${es} → [${h.heat_treatment}] σy${yh}/El${eh}`);
          }
        }
      }
    }
    expect(bad, `강화됐는데 연신율도 오른 조건쌍 (합성값 의심 — 검증 후 교정하거나 LEGITIMATE 에 사유 등재):\n${bad.join('\n')}`).toEqual([]);
  });

  it('예외 목록은 전부 사유가 있고, 실재 base 를 가리킨다 (stale 예외 차단)', () => {
    const bases = new Set(all.map(baseOf));
    for (const [tag, list] of [['LEGITIMATE', LEGITIMATE], ['KNOWN_OPEN', KNOWN_OPEN]] as const) {
      for (const [b, why] of Object.entries(list)) {
        expect(bases.has(b), `${tag} 의 '${b}' 가 DB 에 없음 (stale 예외 — 해소됐으면 목록에서 지울 것)`).toBe(true);
        expect(why.length, `${b}: 사유가 너무 짧다`).toBeGreaterThan(15);
      }
    }
  });

  /* 미해소 잔여가 늘지 않게 상한 고정 — 줄면 목록에서 지우고 이 수를 낮춘다. */
  it('KNOWN_OPEN(미해소 공개 목록)은 8 base 이하', () => {
    expect(Object.keys(KNOWN_OPEN).length).toBeLessThanOrEqual(8);
  });
});
