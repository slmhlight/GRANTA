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


/*
 * E5 (H6 W4-3a) — Designations 카드에서 UNS 를 다른 별칭과 분리 렌더.
 * Designations 카드는 Process 탭에 있고 radix 가 기본으로 마운트하지 않으므로 controlled prop(tab)으로 직접 연다.
 */
describe('E5 — Designations UNS 분리', () => {
  const m = mkMaterial({
    name: 'AISI 316L (AM)', tier: 'verified',
    ranges: { density: { typical: 8.0 } } as R,
    aliases: ['UNS S31603', 'EN 1.4404', 'JIS SUS316L', 'S31603'],
  } as never);

  it('UNS 는 전용 그룹 라벨 + 정규화된 번호로, 나머지는 별도 줄로 렌더된다', () => {
    const { container } = render(
      <MaterialDetail {...baseProps} material={m} tab="process" onTabChange={vi.fn()} />
    );
    const txt = container.textContent || '';
    expect(txt).toContain('Designations');
    // UNS 그룹 라벨 + 번호 (접두어 중복 'UNS S31603'/'S31603' 은 하나로)
    expect((txt.match(/S31603/g) || []).length).toBe(1);
    // 나머지 별칭은 그대로 남는다
    expect(txt).toContain('EN 1.4404');
    expect(txt).toContain('JIS SUS316L');
    // UNS 번호가 UNS 배지 색으로 렌더 (다른 별칭의 중립 배지와 구분)
    const amber = [...container.querySelectorAll('span[style]')].filter((e) =>
      (e.getAttribute('style') || '').includes('253, 230, 138') ||       // #fde68a rgb
      (e.getAttribute('style') || '').toLowerCase().includes('#fde68a'));
    expect(amber.length, 'UNS 전용 스타일 배지가 없다').toBeGreaterThan(0);
  });

  it('UNS 가 없는 재료는 UNS 그룹을 그리지 않는다', () => {
    const noUns = mkMaterial({
      name: 'Plain', tier: 'verified',
      ranges: { density: { typical: 7.8 } } as R,
      aliases: ['JIS SS400', '≈ A36'],
    } as never);
    const { container } = render(
      <MaterialDetail {...baseProps} material={noUns} tab="process" onTabChange={vi.fn()} />
    );
    const txt = container.textContent || '';
    expect(txt).toContain('JIS SS400');
    expect(txt).not.toMatch(/UNS/);
  });
});


/*
 * E4 (H6 W4-1) — 규격 하한 배지. RangeRow 는 Properties 탭(기본 탭)에서 렌더된다.
 */
describe('E4 — 규격 하한(spec min) 배지', () => {
  it('basis=min_spec 행에 배지가 뜨고 툴팁이 규격을 인용한다', () => {
    const m = mkMaterial({
      name: 'AISI 304 — Annealed', tier: 'verified',
      ranges: {
        yield_strength: { typical: 205, min: 205, max: 205, basis: 'min_spec', basis_source: 'ASTM A240/A240M' },
      } as unknown as R,
    } as never);
    const { container } = render(<MaterialDetail {...baseProps} material={m} />);
    const badge = [...container.querySelectorAll('span')].find((e) => e.textContent === 'spec min');
    expect(badge, 'spec min 배지가 렌더되지 않았다').toBeTruthy();
    const tip = badge!.getAttribute('title') || '';
    expect(tip).toContain('ASTM A240/A240M');
    expect(tip).toMatch(/최소값|floor/);
  });

  it('평균값 행에는 배지를 그리지 않는다', () => {
    const m = mkMaterial({
      name: 'Plain', tier: 'verified',
      ranges: { yield_strength: { typical: 290, min: 250, max: 330 } } as unknown as R,
    } as never);
    const { container } = render(<MaterialDetail {...baseProps} material={m} />);
    expect([...container.querySelectorAll('span')].some((e) => e.textContent === 'spec min')).toBe(false);
  });
});


/*
 * E6 (H6 W4-3b) — '≈' 근사대응은 같은 합금이 아니다. 동일 규격명과 시각적으로 갈라야 한다.
 * 계획의 완화책("상세패널 카드 1개로 한정")에 맞춰 새 카드가 아니라 Designations 카드를 확장했다.
 */
describe('E6 — ≈ 근사대응 분리', () => {
  it('≈ 별칭은 전용 그룹으로, 동일 규격명과 다른 스타일로 렌더된다', () => {
    const m = mkMaterial({
      name: 'ASTM A36 (structural carbon steel)', tier: 'verified',
      ranges: { density: { typical: 7.85 } } as R,
      aliases: ['SS400 (JIS/KS ≈)', 'S235JR (EN ≈)', 'JIS G3101'],
    } as never);
    const { container } = render(
      <MaterialDetail {...baseProps} material={m} tab="process" onTabChange={vi.fn()} />
    );
    const txt = container.textContent || '';
    expect(txt).toContain('≈ 근사');            // 그룹 라벨
    expect(txt).toContain('SS400 (JIS/KS ≈)');
    expect(txt).toContain('JIS G3101');          // 동일 규격명은 그대로

    /* 근사 배지에는 "같은 합금이 아니다" 경고가 붙어야 한다 */
    const approxBadge = [...container.querySelectorAll('span[title]')]
      .find((e) => e.textContent === 'SS400 (JIS/KS ≈)');
    expect(approxBadge, '근사 배지를 못 찾음').toBeTruthy();
    expect(approxBadge!.getAttribute('title') || '').toMatch(/같은 합금이 아닙니다|치환/);

    /* 동일 규격명 배지는 근사 경고를 달지 않는다 */
    const eqBadge = [...container.querySelectorAll('span[title]')]
      .find((e) => e.textContent === 'JIS G3101');
    expect((eqBadge?.getAttribute('title') || '')).not.toMatch(/같은 합금이 아닙니다/);
  });

  it('≈ 가 없으면 근사 그룹을 그리지 않는다', () => {
    const m = mkMaterial({
      name: 'AISI 316L', tier: 'verified',
      ranges: { density: { typical: 8.0 } } as R,
      aliases: ['UNS S31603', 'JIS SUS316L'],
    } as never);
    const { container } = render(
      <MaterialDetail {...baseProps} material={m} tab="process" onTabChange={vi.fn()} />
    );
    expect(container.textContent || '').not.toContain('≈ 근사');
  });
});


/*
 * W4-2b — 미노출 데이터 렌더. 둘 다 Process 탭(meta 영역)에 있다.
 */
describe('W4-2b — meta 미노출 데이터', () => {
  it('meta.limitations 가 주의 카드로 렌더된다', () => {
    const m = mkMaterial({
      name: 'Zirconia (Y-TZP)', tier: 'verified', category: 'Ceramic',
      ranges: { density: { typical: 6.0 } } as R,
      meta: { limitations: '200-300°C 저온 열화(LTD) 가능 — 수증기 노출 시 t→m 변환' },
    } as never);
    const { container } = render(
      <MaterialDetail {...baseProps} material={m} tab="process" onTabChange={vi.fn()} />
    );
    const txt = container.textContent || '';
    expect(txt).toContain('사용 한계');
    expect(txt).toContain('저온 열화');
  });

  it('복합재 적층 정보(Vf · 적층 방향)가 렌더된다', () => {
    const m = mkMaterial({
      name: 'CFRP — T300/Epoxy (UD 0°)', tier: 'verified', category: 'Composite',
      ranges: { density: { typical: 1.58 } } as R,
      meta: { fiber_vf: 0.6, ply_direction: 'UD 0°' },
    } as never);
    const { container } = render(
      <MaterialDetail {...baseProps} material={m} tab="process" onTabChange={vi.fn()} />
    );
    const txt = container.textContent || '';
    expect(txt).toContain('Vf');
    expect(txt).toContain('60%');          // 0.6 → 60%
    expect(txt).toContain('UD 0°');
  });

  it('해당 데이터가 없으면 카드를 그리지 않는다', () => {
    const m = mkMaterial({
      name: 'Plain', tier: 'verified',
      ranges: { density: { typical: 7.8 } } as R,
      meta: {},
    } as never);
    const { container } = render(
      <MaterialDetail {...baseProps} material={m} tab="process" onTabChange={vi.fn()} />
    );
    const txt = container.textContent || '';
    expect(txt).not.toContain('사용 한계');
    expect(txt).not.toContain('Layup');
  });
});


/*
 * W4-5 — 물성 라벨이 글로서리 용어로 연결된다 (Properties 탭 = 기본 탭).
 */
describe('W4-5 — 물성 라벨 → 용어 링크', () => {
  it('대응 용어가 있는 물성은 라벨이 /guide/term 링크가 된다', () => {
    const m = mkMaterial({
      name: 'AISI 304', tier: 'verified',
      ranges: { yield_strength: { typical: 205, min: 205, max: 205 } } as unknown as R,
    } as never);
    const { container } = render(<MaterialDetail {...baseProps} material={m} />);
    const a = [...container.querySelectorAll('a')].find((e) => /guide\/term\/yield-strength/.test(e.getAttribute('href') || ''));
    expect(a, 'yield_strength 라벨이 용어로 연결되지 않았다').toBeTruthy();
  });

  it('대응 용어가 없는 물성은 링크하지 않는다', () => {
    const m = mkMaterial({
      name: 'AISI 304', tier: 'verified',
      ranges: { density: { typical: 8.0, min: 8.0, max: 8.0 } } as unknown as R,
    } as never);
    const { container } = render(<MaterialDetail {...baseProps} material={m} />);
    const bad = [...container.querySelectorAll('a')].filter((e) => /guide\/term\//.test(e.getAttribute('href') || ''));
    /* density 는 대응 용어가 없다 — 다른 행이 없으므로 용어 링크가 하나도 없어야 한다 */
    expect(bad.map((e) => e.getAttribute('href')), '대응 용어 없는 물성에 링크가 생겼다').toEqual([]);
  });
});
