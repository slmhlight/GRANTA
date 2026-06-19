// @vitest-environment jsdom
/*
 * ComparePanel — R209 C-1 회귀 테스트 (in-cell 막대 역전).
 * density 처럼 '작을수록 우수'(LOWER_IS_BETTER) 한 물성은 막대를 역전해야 한다:
 *   최저 density → 최장 막대(100%), 최고 density → 최단 막대(3% floor).
 * 일반 물성(uts)은 역전하지 않는다: 최고값 → 최장 막대.
 *
 * price/cost 컬럼에 값을 주지 않아 density 가 유일한 LOWER_IS_BETTER 막대가 되도록 구성.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ComparePanel } from '@/components/ComparePanel';
import type { Material } from '@/lib/materials';

afterEach(cleanup);

function mk(id: string, name: string, density: number, uts: number): Material {
  // 실제 PropertyRange 는 항상 min/max/typical 보유 — min=max=typical 로 두면
  // hasRange(max>min) false → 범위 텍스트 없이 typical 만 셀에 노출(파싱 단순).
  return {
    id, name, category: 'Metal', subcategory: 'Test',
    ranges: {
      density: { min: density, max: density, typical: density },
      uts: { min: uts, max: uts, typical: uts },
    },
    sources: [],
  } as unknown as Material;
}

// Al(가벼움) · Ti · Steel(무거움) — density 2.70 < 4.43 < 7.85
const MATERIALS = [
  mk('al', 'Al 6061', 2.70, 310),
  mk('ti', 'Ti-6Al-4V', 4.43, 950),
  mk('st', 'Steel 4340', 7.85, 600),
];

const props = { onRemove: vi.fn(), onClose: vi.fn() };

function widthOf(barWrap: Element): number {
  const inner = barWrap.querySelector('div[style*="width"]') as HTMLElement | null;
  const m = (inner?.getAttribute('style') || '').match(/width:\s*([\d.]+)%/);
  return m ? parseFloat(m[1]) : NaN;
}

describe('ComparePanel — LOWER_IS_BETTER 막대 역전 (C-1)', () => {
  it('density(작을수록 우수): 최저 density 가 최장 막대, 최고가 최단', () => {
    const { container } = render(<ComparePanel materials={MATERIALS} {...props} />);

    // 역전 막대(title 에 '역전 표시') = density 컬럼의 3개 셀
    const invBars = Array.from(container.querySelectorAll('div[title*="역전 표시"]'));
    expect(invBars.length).toBe(3);

    // 각 막대를 (density 값, 막대 너비) 로 매핑
    const pairs = invBars.map((b) => {
      const td = b.closest('td')!;
      const density = parseFloat((td.textContent || '').match(/\d+\.\d+/)?.[0] || 'NaN');
      return { density, width: widthOf(b) };
    }).sort((a, b) => a.density - b.density);

    // 최저 density(2.70) → 100%, 최고(7.85) → 3% floor
    expect(pairs[0].density).toBeCloseTo(2.70, 2);
    expect(pairs[0].width).toBeCloseTo(100, 1);
    expect(pairs[2].density).toBeCloseTo(7.85, 2);
    expect(pairs[2].width).toBeCloseTo(3, 1);
    // 단조 감소 (density ↑ → 막대 ↓)
    expect(pairs[0].width).toBeGreaterThan(pairs[1].width);
    expect(pairs[1].width).toBeGreaterThan(pairs[2].width);
  });

  it('uts(클수록 우수): 역전하지 않음 — 최고 uts 가 최장 막대', () => {
    const { container } = render(<ComparePanel materials={MATERIALS} {...props} />);

    const normBars = Array.from(container.querySelectorAll('div[title="막대가 길수록 값이 큼"]'));
    // density 는 역전 title 이라 여기 안 잡힘. uts 만 일반 막대 → 3개.
    expect(normBars.length).toBe(3);

    const pairs = normBars.map((b) => {
      const td = b.closest('td')!;
      const uts = parseFloat((td.textContent || '').match(/\d+/)?.[0] || 'NaN');
      return { uts, width: widthOf(b) };
    }).sort((a, b) => b.uts - a.uts);

    // 최고 uts(950) → 100%
    expect(pairs[0].uts).toBe(950);
    expect(pairs[0].width).toBeCloseTo(100, 1);
    // 최고가 최저보다 긴 막대
    expect(pairs[0].width).toBeGreaterThan(pairs[pairs.length - 1].width);
  });

  it('헤더에 density ↓ (작을수록 우수) 마커가 표시된다', () => {
    const { container } = render(<ComparePanel materials={MATERIALS} {...props} />);
    // Density 헤더 셀에 ↓ 마커 (LOWER_IS_BETTER 시각 표식)
    const densityHeader = Array.from(container.querySelectorAll('th')).find((th) => /Density/i.test(th.textContent || ''));
    expect(densityHeader?.textContent).toMatch(/↓/);
  });
});
