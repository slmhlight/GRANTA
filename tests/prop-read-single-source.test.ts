/*
 * A15 — 물성 값을 읽는 방법은 **하나**여야 한다.
 *
 * 재료 한 건에 같은 물성이 두 자리에 실려 나간다: top-level 평면값(v1 잔재)과 `ranges[key]`
 * (v2 파이프라인 산출). 교정·인용·신뢰도는 ranges 에만 붙으므로 **ranges 가 정본**이고,
 * 산출 파이프의 slim 인덱스도 이미 그 순서로 평면값을 찍는다.
 *
 * 그런데 그 규칙이 전체 파일·카테고리 샤드에는 적용되지 않았고(불일치 248 재료×물성),
 * 클라이언트는 리더를 **6벌** 따로 구현해 우선순위가 갈렸다 — 표·카드·Ashby 는 평면값 먼저,
 * 비교판·레이더·Goodman 은 ranges 먼저. 같은 재료가 화면마다 다른 숫자로 보였다는 뜻이다.
 * 필터·정렬은 아예 평면값만 읽어, ranges 에만 값이 있는 503 건을 "값 없음" 으로 떨궜다.
 *
 * 그래서 세 가지를 고정한다:
 *   (1) 산출물에서 두 자리가 어긋나지 않는다 — 그리고 그 정합 단계가 **죽지 않았다**
 *   (2) 공용 리더가 ranges 전용 값을 실제로 되살린다 (필터·정렬 복구의 근거)
 *   (3) 아무도 리더를 다시 구현하지 않는다 — 우선순위 결정은 lib/materials.ts 한 곳
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUB = path.join(ROOT, 'client', 'public');

type Rec = Record<string, unknown> & { name?: string; ranges?: Record<string, { typical?: number } | null> };
const read = (p: string): Rec[] => {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  return Array.isArray(j) ? j : (j.materials ?? []);
};

/** 평면값과 ranges.typical 이 **둘 다 숫자인데 다른** 쌍. */
function mismatches(arr: Rec[]) {
  const out: string[] = [];
  let checked = 0;
  for (const m of arr) {
    for (const [k, r] of Object.entries(m.ranges ?? {})) {
      const t = r?.typical;
      const v = m[k];
      if (typeof t !== 'number' || typeof v !== 'number') continue;
      checked++;
      if (Math.abs(t - v) > 1e-9) out.push(`${m.name} · ${k}: 평면 ${v} vs ranges ${t}`);
    }
  }
  return { out, checked };
}

const OUTPUTS = [
  'materials.json',
  path.join('materials', 'index.json'),
  path.join('materials', 'metal.json'),
  path.join('materials', 'polymer.json'),
  path.join('materials', 'ceramic.json'),
  path.join('materials', 'composite.json'),
];

describe('A15 (1) 산출물 — 평면값과 ranges 가 어긋나지 않는다', () => {
  for (const f of OUTPUTS) {
    it(`${f} 불일치 0`, () => {
      const { out, checked } = mismatches(read(path.join(PUB, f)));
      expect(checked, `${f}: 비교 대상이 0 이면 검사가 무의미하다 — 스키마나 경로 확인`).toBeGreaterThan(0);
      expect(out.slice(0, 10), `${f} 불일치 ${out.length}건 (build:data 1h 정합 단계 확인):\n  ${out.slice(0, 10).join('\n  ')}`).toEqual([]);
    });
  }

  /* 정합 단계가 사문화되지 않았는지 — 상류(레지스트리)에 어긋난 쌍이 남아 있어야 1h 가 일한다.
     0 이 되면 상류가 정리된 것이므로 **단계와 이 게이트를 함께 정리**할 것(A13 의 교훈: 0 건
     판정 기록은 지운다). 방어 가드가 아니라 판정 기록 쪽이다. */
  it('정합 단계가 살아 있다 — 레지스트리 수준에는 아직 어긋난 쌍이 있다', () => {
    const entries: Rec[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.json')) entries.push(JSON.parse(fs.readFileSync(p, 'utf8')));
      }
    };
    walk(path.join(ROOT, 'data', 'registry', 'entries'));
    const { out } = mismatches(entries);
    expect(entries.length).toBeGreaterThan(1000);
    expect(
      out.length,
      '레지스트리 불일치가 0 이다 — build-from-registry 1h 정합 단계가 더는 할 일이 없다. 단계와 이 게이트를 함께 정리할 것.',
    ).toBeGreaterThan(0);
  });
});

describe('A15 (2) 공용 리더가 ranges 전용 값을 되살린다', () => {
  const all = read(path.join(PUB, 'materials.json'));

  /* 필터·정렬이 평면값만 읽던 시절 조용히 떨어져 나가던 물성들. 숫자는 실측치(측정 시점
     2026-09) 이고, 하한만 건다 — 데이터가 늘면 통과, **리더가 ranges 를 안 보면 0 이 되어 실패**. */
  const FLOOR: Record<string, number> = {
    max_service_temp: 100,   // 실측 129
    price_per_kg: 90,        // 실측 105
    thermal_expansion: 90,   // 실측 105
    fracture_toughness: 30,  // 실측 39
    melting_point: 25,       // 실측 35
    glass_transition_temp: 25, // 실측 32
  };

  for (const [key, floor] of Object.entries(FLOOR)) {
    it(`${key} — 평면값이 없고 ranges 에만 값이 있는 재료 ≥ ${floor}`, () => {
      const n = all.filter((m) => typeof m[key] !== 'number' && typeof m.ranges?.[key]?.typical === 'number').length;
      expect(n, `${key}: 이 재료들은 인용된 값을 가지고 있다 — 평면값만 읽는 리더는 이들을 '값 없음' 으로 떨군다`).toBeGreaterThanOrEqual(floor);
    });
  }

  it('리더의 우선순위가 ranges 먼저다 (정의 자체를 고정)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'client', 'src', 'lib', 'materials.ts'), 'utf8');
    expect(src).toMatch(/export function propValue\(m: Material, key: string\): number \| null \{\s*const t = m\.ranges\?\.\[key\]\?\.typical;/);
    expect(src).toMatch(/export function propBound\(m: Material, key: string, side: 'min' \| 'max'\)/);
  });
});

describe('A15 (3) 리더를 다시 구현하지 않는다', () => {
  /* range 객체 자체가 필요한 곳(신뢰도·n·min/max·provenance 표시)만 예외 — 값 우선순위를
     스스로 정하지 않는다는 조건으로. RangeRow 는 호출부가 fallback 으로 propValue 를 넘겨
     `range?.typical ?? fallback` 이 공용 리더와 동치가 된다. */
  const ALLOW = new Map<string, string>([
    ['client/src/lib/materials.ts', '정의 — propValue·propBound·propRange'],
    ['client/src/components/material-detail/RangeRow.tsx', 'range+fallback 표시 — 호출부가 fallback 으로 propValue 를 넘겨 공용 리더와 동치'],
  ]);

  const walk = (d: string, acc: string[] = []): string[] => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, acc);
      else if (/\.tsx?$/.test(e.name)) acc.push(p);
    }
    return acc;
  };
  const files = walk(path.join(ROOT, 'client', 'src'))
    .map((p) => path.relative(ROOT, p).replace(/\\/g, '/'))
    .filter((p) => !ALLOW.has(p));

  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/\/\/.*/g, '');

  it('ranges 를 동적 키로 인덱싱하지 않는다', () => {
    const bad: string[] = [];
    for (const f of files) {
      strip(fs.readFileSync(path.join(ROOT, f), 'utf8')).split('\n').forEach((line, i) => {
        /* `.ranges` 로 한정한다 — 조성 범위를 담는 **지역 변수** `ranges` 가 따로 있어서
           맨 단어로 잡으면 FilterSidebar·scenario-presets 가 전부 걸린다(실제로 걸렸다). */
        const direct = /\w\.ranges\s*(\?\.)?\[/.test(line);                  // m.ranges[k] · m.ranges?.[k]
        const wrapped = /\(\s*\w+\.ranges\b[^\n]*?\)\s*\[/.test(line);       // (m.ranges || {})[k] · (m.ranges as X)[k]
        if (direct || wrapped) bad.push(`${f}:${i + 1}  ${line.trim().slice(0, 96)}`);
      });
    }
    expect(bad, `동적 ranges 인덱싱 ${bad.length}건 — propValue/propBound 를 쓸 것:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('ranges 읽기에 평면값 폴백을 직접 붙이지 않는다', () => {
    const bad: string[] = [];
    for (const f of files) {
      strip(fs.readFileSync(path.join(ROOT, f), 'utf8')).split('\n').forEach((line, i) => {
        if (/\.ranges\b/.test(line) && /\?\?/.test(line) && !/^\s*const ranges = /.test(line)) bad.push(`${f}:${i + 1}  ${line.trim().slice(0, 96)}`);
      });
    }
    expect(bad, `평면값 폴백을 직접 구현한 곳 ${bad.length}건 — 우선순위 결정은 lib/materials.ts 한 곳:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('검사 대상이 실제로 모였다', () => {
    expect(files.length, '스캔 파일이 0 이면 게이트가 무의미하다').toBeGreaterThan(50);
    expect([...ALLOW.keys()].every((f) => fs.existsSync(path.join(ROOT, f))), '예외 목록에 없는 파일이 있다 — 사문화된 예외는 지울 것').toBe(true);
  });
});
