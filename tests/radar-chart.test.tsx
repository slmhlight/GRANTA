// @vitest-environment jsdom
/*
 * RadarChart — R209 A-13 회귀 테스트.
 * "데이터 없음" 축이 0.25 floor(실제 최저값처럼 보임)와 혼동되지 않도록:
 *   1) 결측 vertex 는 빈 원(흰 채움 + 색 점선 테두리)
 *   2) 모든 series 가 결측인 축 라벨은 흐림(#cbd5e1) + " ⚠"
 *   3) 하단 캡션이 결측 축 목록을 안내
 * 데이터가 완전하면 위 3가지가 전혀 나타나지 않아야 한다(과오탐 0).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { RadarChart, type RadarAxis, type RadarSeries } from '@/components/RadarChart';
import type { Material } from '@/lib/materials';

afterEach(cleanup);

const AXES: RadarAxis[] = [
  { key: 'yield_strength', label: 'σy' },
  { key: 'uts', label: 'UTS' },
  { key: 'modulus', label: 'E' },
  { key: 'hardness', label: 'HV' },
];

function mkMaterial(ranges: Record<string, { typical: number }>): Material {
  return {
    id: 't1', name: 'TestAlloy', category: 'Metal', subcategory: 'Steel', ranges,
  } as unknown as Material;
}

function mkSeries(m: Material): RadarSeries[] {
  return [{ id: 't1', name: 'TestAlloy', color: '#3b82f6', material: m }];
}

describe('RadarChart — 결측 축 표식 (A-13)', () => {
  it('hardness 결측 시 빈 원 + ⚠ 라벨 + 안내 캡션을 렌더한다', () => {
    const mat = mkMaterial({
      yield_strength: { typical: 500 }, uts: { typical: 700 }, modulus: { typical: 200 },
      // hardness 없음 → 결측
    });
    const { container } = render(
      <RadarChart series={mkSeries(mat)} axes={AXES} normalizeBase="set" />
    );

    // 1) 빈 원 (흰 채움 + 점선 테두리) — 정확히 1개 (결측 축 1개)
    const hollow = container.querySelectorAll('circle[stroke-dasharray="1.5 1"]');
    expect(hollow.length).toBe(1);
    expect(hollow[0].getAttribute('fill')).toBe('#ffffff');
    expect(hollow[0].getAttribute('stroke')).toBe('#3b82f6');

    // 2) HV 축 라벨이 흐림(#cbd5e1) + ⚠
    const warnLabel = Array.from(container.querySelectorAll('text')).find((t) => /⚠/.test(t.textContent || ''));
    expect(warnLabel).toBeTruthy();
    expect(warnLabel!.textContent).toContain('HV');
    expect(warnLabel!.getAttribute('fill')).toBe('#cbd5e1');

    // 3) 하단 캡션이 결측 축(HV)을 안내하고 "실제 최저값 아님"을 명시
    expect(container.textContent).toContain('데이터 없음');
    expect(container.textContent).toContain('실제 최저값 아님');
    const caption = Array.from(container.querySelectorAll('p')).find((p) => /빈 원/.test(p.textContent || ''));
    expect(caption?.textContent).toContain('HV');
  });

  it('두 축 결측 시 캡션이 두 축 라벨을 모두 나열한다', () => {
    const mat = mkMaterial({
      yield_strength: { typical: 500 }, uts: { typical: 700 },
      // modulus, hardness 없음 → 2축 결측
    });
    const { container } = render(
      <RadarChart series={mkSeries(mat)} axes={AXES} normalizeBase="set" />
    );
    expect(container.querySelectorAll('circle[stroke-dasharray="1.5 1"]').length).toBe(2);
    const caption = Array.from(container.querySelectorAll('p')).find((p) => /빈 원/.test(p.textContent || ''));
    expect(caption?.textContent).toContain('E');
    expect(caption?.textContent).toContain('HV');
  });

  it('데이터가 완전하면 빈 원·⚠·캡션이 전혀 없다 (과오탐 0)', () => {
    const mat = mkMaterial({
      yield_strength: { typical: 500 }, uts: { typical: 700 }, modulus: { typical: 200 }, hardness: { typical: 250 },
    });
    const { container } = render(
      <RadarChart series={mkSeries(mat)} axes={AXES} normalizeBase="set" />
    );
    expect(container.querySelectorAll('circle[stroke-dasharray="1.5 1"]').length).toBe(0);
    expect(Array.from(container.querySelectorAll('text')).some((t) => /⚠/.test(t.textContent || ''))).toBe(false);
    expect(Array.from(container.querySelectorAll('p')).some((p) => /빈 원/.test(p.textContent || ''))).toBe(false);
  });

  it('값이 0 또는 음수인 축도 결측으로 취급한다', () => {
    const mat = mkMaterial({
      yield_strength: { typical: 500 }, uts: { typical: 0 }, modulus: { typical: -5 }, hardness: { typical: 250 },
    });
    const { container } = render(
      <RadarChart series={mkSeries(mat)} axes={AXES} normalizeBase="set" />
    );
    // uts(0), modulus(-5) → 2축 결측
    expect(container.querySelectorAll('circle[stroke-dasharray="1.5 1"]').length).toBe(2);
  });
});
