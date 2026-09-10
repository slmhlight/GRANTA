// @vitest-environment jsdom
/*
 * H6 F3 — 사례(시나리오) 입력 초기화 게이트.
 *
 * exhaustive-deps 경고를 없애면서 ScenarioDialog·ScenarioCompareSheet 의 리셋 effect 의존성을
 * `[scenarioKey]` → `[initialValues, cfg]` 로 바꿨다. 이게 성립하는 근거는 하나다:
 *
 *   cfg = SCENARIO_PRESETS[scenarioKey]?.configurator 이고 SCENARIO_PRESETS 는 모듈 상수라,
 *   cfg 의 참조는 scenarioKey 에 1:1 로 매여 있다 → 발화 시점이 달라지지 않는다.
 *
 * 그 전제가 조용히 깨지는 길이 있다. 누가 SCENARIO_PRESETS 를 함수·getter·매 호출 새 객체로
 * 바꾸면 cfg 참조가 렌더마다 달라져 리셋이 무한히 돌고, 반대로 프리셋끼리 configurator 객체를
 * 공유시키면 사례를 바꿔도 리셋이 안 걸린다. 둘 다 화면에서는 "가끔 이상한 값이 남아 있다"
 * 로만 보여서 눈으로 잡기 어렵다.
 *
 * 그래서 전제(참조 안정성)와 결론(실제로 리셋된다)을 따로 고정한다.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SCENARIO_PRESETS } from '@/lib/scenario-presets';
import { ScenarioDialog } from '@/components/ScenarioDialog';

afterEach(cleanup);

type AnyField = { id: string; type: string; group?: string; default: unknown };
const cfgOf = (k: string) => (SCENARIO_PRESETS[k] as any).configurator as { fields: AnyField[] } | undefined;

describe('F3 전제 — 사례 프리셋의 참조 안정성', () => {
  const keys = Object.keys(SCENARIO_PRESETS);

  it('configurator 참조는 접근할 때마다 같다 (모듈 상수여야 한다)', () => {
    const unstable = keys.filter((k) => cfgOf(k) !== cfgOf(k));
    expect(
      unstable,
      `접근마다 새 객체를 주는 사례 ${unstable.length}건: ${unstable.join(' | ')}\n` +
        '  리셋 effect 가 cfg 참조에 의존하므로, 여기가 불안정하면 매 렌더 리셋이 돈다.',
    ).toEqual([]);
  });

  it('서로 다른 사례는 서로 다른 configurator 객체를 갖는다', () => {
    const withCfg = keys.filter((k) => cfgOf(k));
    const seen = new Map<unknown, string>();
    const shared: string[] = [];
    for (const k of withCfg) {
      const c = cfgOf(k);
      const prev = seen.get(c);
      if (prev) shared.push(`${prev} ≡ ${k}`);
      else seen.set(c, k);
    }
    expect(
      shared,
      `configurator 객체를 공유하는 사례 ${shared.length}건: ${shared.join(' | ')}\n` +
        '  공유하면 두 사례를 오갈 때 cfg 가 안 바뀌어 입력이 리셋되지 않는다.',
    ).toEqual([]);
    expect(withCfg.length, 'configurator 를 가진 사례가 있어야 이 게이트가 의미 있다').toBeGreaterThan(1);
  });
});

describe('F3 결론 — 사례를 바꾸면 입력이 새 사례의 default 로 돌아간다', () => {
  /* 이 결함은 두 사례가 **같은 필드 id** 를 쓸 때만 드러난다. 값은 `values[f.id] ?? f.default`
     로 읽으므로 id 가 안 겹치면 리셋이 없어도 새 default 가 보이기 때문이다.
     실제 프리셋에서 그런 쌍을 찾는다 — 같은 그룹 이름이어야 두 화면에서 같은 방법으로 펼친다. */
  const withCfg = Object.keys(SCENARIO_PRESETS).filter((k) => cfgOf(k));
  let pair: { a: string; b: string; group: string; aDefault: string; bDefault: string } | null = null;
  outer: for (const a of withCfg) {
    for (const b of withCfg) {
      if (b === a) continue;
      for (const fa of cfgOf(a)!.fields) {
        if (fa.type !== 'number' || !fa.group) continue;
        const fb = cfgOf(b)!.fields.find((g) => g.id === fa.id && g.group === fa.group && g.default !== fa.default);
        if (fb) {
          pair = { a, b, group: fa.group, aDefault: String(fa.default), bDefault: String(fb.default) };
          break outer;
        }
      }
    }
  }

  const numbers = () => screen.queryAllByRole('spinbutton') as HTMLInputElement[];

  /** 그룹은 첫 번째만 펼쳐져 시작한다(CollapsibleGroup defaultOpen={gi===0}).
   *  닫힌 그룹은 자식을 아예 마운트하지 않으므로, 읽기 전에 펼쳐야 한다. */
  function ensureGroupOpen(title: string) {
    const btn = screen.getAllByRole('button').find((b) => (b.textContent ?? '').trim().startsWith(title));
    if (!btn) return;
    const before = numbers().length;
    fireEvent.click(btn);
    if (numbers().length < before) fireEvent.click(btn); // 열려 있던 걸 닫았으면 되돌린다
  }

  it('겹치는 숫자 입력을 가진 사례 쌍이 존재한다 (이 게이트의 전제)', () => {
    expect(
      pair,
      '같은 그룹에 같은 id·다른 default 인 숫자 필드를 쓰는 사례 쌍이 없다 — 프리셋 구조가 바뀌었다면 이 테스트를 갱신할 것',
    ).not.toBeNull();
  });

  it('사례를 바꾸면 직전 사례에서 고친 값이 남지 않는다', () => {
    if (!pair) return;
    const noop = vi.fn();
    const { rerender } = render(<ScenarioDialog scenarioKey={pair.a as any} open onOpenChange={noop} />);

    ensureGroupOpen(pair.group);
    const target = numbers().find((el) => el.value === pair!.aDefault);
    expect(target, `사례 ${pair.a} 의 '${pair.group}' 그룹에서 default ${pair.aDefault} 인 숫자 입력을 찾지 못했다`).toBeTruthy();

    const edited = String(Number(pair.aDefault) + 37);
    fireEvent.change(target!, { target: { value: edited } });
    expect(numbers().some((el) => el.value === edited), '입력이 실제로 바뀌어야 테스트가 의미 있다').toBe(true);

    rerender(<ScenarioDialog scenarioKey={pair.b as any} open onOpenChange={noop} />);
    ensureGroupOpen(pair.group);

    expect(
      numbers().some((el) => el.value === edited),
      `사례를 ${pair.a} → ${pair.b} 로 바꿨는데 직전 값(${edited})이 남아 있다 — 리셋 effect 가 안 걸렸다`,
    ).toBe(false);
    expect(
      numbers().some((el) => el.value === pair!.bDefault),
      `새 사례 ${pair.b} 의 default(${pair.bDefault})가 보여야 한다`,
    ).toBe(true);
  });
});
