/*
 * H6 A-2 — 조성 분류기 balance 처리 회귀.
 * 버그: parseCompositionRange('balance')→null → isElementHigh false → balance-Fe/Al/Ti 재료가
 * 원소 분기 전체를 건너뛰고 subcategory fallback 으로 추락 (강 대부분 658곳 무력화).
 * 수정: balance = 잔부(100 − 타 원소 합) 추정 + 마레이징을 Ni-Co 분기보다 먼저(Fe-balance 강이
 * "Nickel-based" 로 빠지는 모순 방지).
 * 조성은 client/public/materials.json 실제 값에서 채록.
 */
import { describe, it, expect } from 'vitest';
import { classifyMaterialByComposition, getElementConcentration, NON_CONSTITUENT } from '@/lib/composition-classifier';
import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '@/lib/materials';

const mat = (composition: Record<string, string>, subcategory = 'X') =>
  ({ composition, subcategory } as unknown as Material);

describe('composition-classifier — balance 잔부 시맨틱 (H6 A-2)', () => {
  it('Fe balance 강이 철강 분기에 진입 (fallback 아님)', () => {
    // 42CrMo4/4140 실조성 — 타 원소 max 합 ~3.3 → Fe min ~96.7 ≥ 50
    const r = classifyMaterialByComposition(mat({
      Fe: 'balance', Cr: '0.9~1.2', Mo: '0.15~0.3', C: '0.38~0.45', Mn: '0.6~0.9', Si: '≤0.4',
    }, 'Carbon/Low-alloy Steel'));
    // 철강 분기 내부 판정(휴리스틱) — fallback('Carbon/Low-alloy Steel')이 아니면 게이트 통과
    expect(r).not.toBe('Carbon/Low-alloy Steel');
    /* A16 — 기대값을 'Carbon Steel' 에서 교정. 42CrMo4 는 Cr-Mo **합금강**이다. 옛 분기가
       Ni≥3 || Mo≥0.5 만 합금강으로 봐서 여기로 떨어졌고, 이 테스트가 그 결과를 그대로
       박제하고 있었다(원래 의도는 "폴백이 아니다" 였다 — 그 단언은 위에 그대로 남는다). */
    expect(r).toBe('Alloy Steel');
  });

  it('2205 duplex (Fe balance·Cr 22~23·Mo 3+) → Duplex', () => {
    expect(classifyMaterialByComposition(mat({
      Fe: 'balance', Cr: '22~23', Ni: '4.5~6.5', Mo: '3~3.5', N: '0.14~0.2', Mn: '≤2', Si: '≤1',
    }))).toBe('Stainless Steel - Duplex');
  });

  it('Ti-6Al-4V (Ti balance) → Titanium - Ti6Al4V', () => {
    expect(classifyMaterialByComposition(mat({
      Ti: 'balance', Al: '5.5~6.75', V: '3.5~4.5', O: '≤0.20', Fe: '≤0.40', C: '≤0.08', N: '≤0.05', H: '≤0.015',
    }))).toBe('Titanium - Ti6Al4V');
  });

  it('AA 6061 (Al balance) → Al 분기 진입', () => {
    const r = classifyMaterialByComposition(mat({
      Al: 'balance', Mg: '0.8~1.2', Si: '0.4~0.8', Cu: '0.15~0.4', Cr: '0.04~0.35', Fe: '≤0.7', Mn: '≤0.15',
    }, 'ShouldNotFallback'));
    expect(r.startsWith('Aluminum')).toBe(true);
  });

  it('Maraging 250 (Fe 66~71·Ni 17~19·Co 7~8.5·Mo 4.6~5.2) → Maraging (Ni-Co 초합금 오분류 방지)', () => {
    expect(classifyMaterialByComposition(mat({
      Fe: '66~71', Ni: '17~19', Co: '7~8.5', Mo: '4.6~5.2', Ti: '0.3~0.6', Al: '0.05~0.15',
    }))).toBe('Maraging Steel');
  });

  it('명시 Fe 수치(304, Fe 70.5)는 기존대로 austenitic — 회귀 없음', () => {
    expect(classifyMaterialByComposition(mat({
      C: '0.08', Fe: '70.5', Cr: '18', Ni: '8', Mn: '2', Si: '1',
    }))).toBe('Stainless Steel - Austenitic');
  });
});

/*
 * A16 — balance 역산이 **구성분이 아닌 키**에 오염돼 있었다.
 *
 * balance 원소는 "100 − 나머지 합" 으로 역산한다. 그런데 조성 딕셔너리에는 원소가 아닌
 * 주석 키가 섞여 들어온다 — 그것까지 구성분으로 더하고 있었다:
 *
 *   Coating "Zn ~93% · Mg 3% · Al 4%" → 93 을 빼서 도금강판의 Fe 가 **7–97%**
 *     → isElementHigh(Fe, 50) 가 false → 철강 분기를 통째로 건너뛰고 subcategory 로 추락
 *   CE "≤0.50%" (탄소당량 — 조성이 아니라 조성에서 유도한 지표) → 철근 6종 Fe 가 0.5%p 낮게
 *
 * 반대로 ceramic "~5%"(MMC 세라믹 강화상)는 **실제 구성분**이라 계속 뺀다. 원소 화이트리스트로
 * 거르면 이런 비원소 구성분까지 잃는다(복합재 조성은 상 이름으로 적힌다).
 */
describe('A16 — balance 역산은 구성분만 더한다', () => {
  it('도금강판: Coating 문자열이 Fe balance 를 먹지 않는다', () => {
    const m = mat({ Fe: 'balance (substrate)', Coating: 'Zn ~93% · Mg 3% · Al 4% (PosMAC 3.0)' }, 'Carbon Steel');
    const fe = getElementConcentration(m, 'Fe');
    expect(fe, 'Fe balance 를 못 읽으면 이 검사가 무의미하다').not.toBeNull();
    expect(fe!.min, `Fe min ${fe?.min} — Coating 93% 를 구성분으로 빼면 7 이 된다`).toBeGreaterThan(90);
    expect(classifyMaterialByComposition(m).toLowerCase()).toContain('steel');
  });

  it('철근: CE(탄소당량)는 구성분이 아니다', () => {
    const withCE = mat({ Fe: 'balance', C: '≤0.30', Si: '≤0.60', Mn: '≤1.60', P: '≤0.040', S: '≤0.040', CE: '≤0.50%' });
    const without = mat({ Fe: 'balance', C: '≤0.30', Si: '≤0.60', Mn: '≤1.60', P: '≤0.040', S: '≤0.040' });
    expect(getElementConcentration(withCE, 'Fe')).toEqual(getElementConcentration(without, 'Fe'));
  });

  it('MMC 의 ceramic 은 실제 구성분이라 계속 뺀다', () => {
    const fe = getElementConcentration(mat({ Al: 'balance', Cu: '4.5', Mg: '0.3', Mn: '0.3', ceramic: '~5%' }), 'Al');
    expect(fe!.max, 'ceramic 5% 를 빼지 않으면 Al 이 100 이 된다').toBeLessThan(96);
  });

  it('제외 목록이 사문화되지 않았다 — 실제 데이터에 아직 그 키가 있다', () => {
    const p = path.join(process.cwd(), 'client', 'public', 'materials.json');
    const all: { composition?: unknown }[] = JSON.parse(fs.readFileSync(p, 'utf8'));
    const seen = new Set<string>();
    for (const m of all) {
      const c = m.composition;
      if (!c || Array.isArray(c)) continue;
      for (const k of Object.keys(c as Record<string, unknown>)) seen.add(k);
    }
    const dead = [...NON_CONSTITUENT].filter((k) => !seen.has(k));
    expect(dead, `데이터에 없는 제외 키 ${dead.join(', ')} — 사문화된 제외는 지울 것(낡으면 오탐이 된다)`).toEqual([]);
  });

  it('산출물 전체에서 balance 범위가 비상식적으로 벌어진 재료가 없다', () => {
    const p = path.join(process.cwd(), 'client', 'public', 'materials.json');
    const all: { id?: string; name?: string; composition?: unknown; subcategory?: string }[] = JSON.parse(fs.readFileSync(p, 'utf8'));
    const bad: string[] = [];
    for (const m of all) {
      const c = m.composition;
      if (!c || Array.isArray(c)) continue;
      const dict = c as Record<string, unknown>;
      const base = Object.keys(dict).find((k) => String(dict[k]).toLowerCase().startsWith('balance'));
      if (!base) continue;
      const r = getElementConcentration(m as never, base);
      /* 폭 50%p 이상 = "나머지 합" 의 min/max 가 크게 벌어진 것 — 규격 범위가 아니라 잘못
         파싱된 키가 섞였을 때 나타나는 모양이다(도금강판이 7–97 이었다). */
      if (r && r.max - r.min > 50) bad.push(`${m.id} ${m.name} · ${base} ${r.min}–${r.max}%`);
    }
    expect(bad, `balance 범위가 50%p 넘게 벌어진 재료 ${bad.length}건: ${bad.join(' · ')}`).toEqual([]);
  });
});
