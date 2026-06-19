// @vitest-environment jsdom
/*
 * MaterialDetail — R209 C-9 / C-16 / C-11 회귀 테스트 (Properties 탭).
 *   C-9  generic tier → inline amber 경고 박스 ("vendor datasheet 검증").
 *   C-16 데이터 없는 물성은 "—" 행 대신 접이식 <details> 요약으로 묶음.
 *   C-11 섹션 헤더가 i18n (기본 KO: "기계적 물성" / "물리적 물성").
 *
 * 기본 활성 탭은 Properties 뿐 — Composition(SimilarMaterials)·Process(welding compute)
 * 탭은 radix 가 마운트하지 않으므로 무거운 자식 없이 렌더된다. allMaterials 미전달.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MaterialDetail } from '@/components/MaterialDetail';
import type { Material } from '@/lib/materials';

afterEach(cleanup);

type R = Record<string, { typical: number }>;
function mkMaterial(over: Partial<Material> & { ranges: R; tier: string }): Material {
  return {
    id: 'm1', name: 'Test Alloy', category: 'Metal', subcategory: 'Carbon Steel',
    sources: [], ...over,
  } as unknown as Material;
}

const baseProps = {
  compareList: [] as string[],
  onToggleCompare: vi.fn(),
  onClose: vi.fn(),
};

describe('MaterialDetail — generic 경고 & 빈 행 정리 (C-9 / C-16 / C-11)', () => {
  it('generic tier + 일부 결측 물성: 경고 박스 + 접이식 빈 행 + KO 섹션 헤더', () => {
    const mat = mkMaterial({
      tier: 'generic',
      ranges: {
        // 존재: 기계 3 / 물리 1
        yield_strength: { typical: 400 }, uts: { typical: 600 }, modulus: { typical: 205 },
        density: { typical: 7.85 },
        // 나머지(elongation·hardness·fatigue·impact·fracture / 열전도·전기전도·… ) 결측
      },
    });
    const { container } = render(<MaterialDetail material={mat} {...baseProps} />);

    // C-9 — generic 경고 박스 (badge 의 title 속성이 아니라 본문에 'vendor datasheet')
    const warnBox = Array.from(container.querySelectorAll('p')).find((p) => /vendor datasheet/.test(p.textContent || ''));
    expect(warnBox, 'generic 경고 박스가 보여야 함').toBeTruthy();
    expect(warnBox!.textContent).toContain('Generic reference');

    // C-11 — 섹션 헤더 i18n (기본 KO)
    expect(container.textContent).toContain('기계적 물성');
    expect(container.textContent).toContain('물리적 물성');

    // C-16 — 빈 행이 접이식 <details> 로 묶임
    const details = Array.from(container.querySelectorAll('details'));
    expect(details.length, '빈 행 details 블록이 1개 이상').toBeGreaterThanOrEqual(1);
    expect(details.some((d) => /개 항목 데이터 없음/.test(d.querySelector('summary')?.textContent || ''))).toBe(true);
    // 결측 물성(Hardness)은 details 안에, 존재 물성(UTS)은 일반 행에 노출
    expect(details.some((d) => /Hardness/.test(d.textContent || ''))).toBe(true);
    expect(container.textContent).toContain('UTS');
  });

  it('reference tier + 완전한 물성: 경고 박스 없음 · 빈 행 details 없음', () => {
    const mat = mkMaterial({
      tier: 'reference',
      ranges: {
        // 금속 기계 8종 전부
        yield_strength: { typical: 400 }, uts: { typical: 600 }, elongation: { typical: 18 },
        modulus: { typical: 205 }, hardness: { typical: 180 }, fatigue_strength: { typical: 260 },
        impact_strength: { typical: 40 }, fracture_toughness: { typical: 90 },
        // 금속 물리 8종 전부
        density: { typical: 7.85 }, thermal_conductivity: { typical: 50 }, electrical_conductivity: { typical: 10 },
        max_service_temp: { typical: 450 }, thermal_expansion: { typical: 12 }, specific_heat: { typical: 470 },
        melting_point: { typical: 1500 }, poisson_ratio: { typical: 0.29 },
      },
    });
    const { container } = render(<MaterialDetail material={mat} {...baseProps} />);

    // C-9 control — generic 박스 없음
    expect(Array.from(container.querySelectorAll('p')).some((p) => /vendor datasheet/.test(p.textContent || ''))).toBe(false);
    // C-16 control — 모든 물성 존재 → 빈 행 details 없음
    expect(container.querySelectorAll('details').length).toBe(0);
    // 섹션은 여전히 렌더
    expect(container.textContent).toContain('기계적 물성');
  });
});
