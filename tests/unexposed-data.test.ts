/*
 * W4-2b — 미노출 데이터 렌더 + 죽은 필드 정리 게이트.
 *
 * 이 항목의 성격: 데이터는 이미 있는데 화면에 안 나오는 것들이다. 반대로 화면에도 없고
 * 의미도 없는 필드는 산출물에서 빼야 한다. 둘 다 "있는 것과 보이는 것을 맞춘다" 는 같은 일이다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Mat = {
  id: string; stable_id?: string; name: string; category: string;
  elevated_temp_src?: string; elevated_temp?: unknown[];
  meta?: Record<string, unknown>;
  ranges?: Record<string, Record<string, unknown> | undefined>;
};
const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
const ALL: Mat[] = Array.isArray(raw) ? raw : raw.materials;
const SRC = fs.readFileSync(path.resolve('client/src/components/MaterialDetail.tsx'), 'utf8');

describe('W4-2b — 있는 데이터는 화면에 나온다', () => {
  it('meta.limitations 보유 재료가 존재하고 렌더 경로가 있다', () => {
    const n = ALL.filter((m) => m.meta?.limitations).length;
    expect(n, 'limitations 보유 재료 0 — 데이터가 사라졌다').toBeGreaterThan(50);
    expect(SRC, 'meta.limitations 렌더 경로 없음').toContain('meta.limitations');
  });

  it('복합재 적층 정보(fiber_vf / ply_direction) 렌더 경로가 있다', () => {
    const n = ALL.filter((m) => m.meta?.fiber_vf != null || m.meta?.ply_direction).length;
    expect(n, '적층 정보 보유 재료 0').toBeGreaterThan(10);
    expect(SRC).toContain('meta.fiber_vf');
    expect(SRC).toContain('meta.ply_direction');
  });

  it('고온곡선 보유 재료는 출처를 함께 갖고, 렌더 경로가 있다', () => {
    const withCurve = ALL.filter((m) => Array.isArray(m.elevated_temp) && m.elevated_temp.length);
    const noSrc = withCurve.filter((m) => !m.elevated_temp_src).map((m) => m.stable_id ?? m.id);
    expect(noSrc, `곡선은 있는데 출처 없는 재료 ${noSrc.length}건`).toEqual([]);
    expect(SRC).toContain('elevated_temp_src');
  });
});

describe('W4-2b — 죽은 필드는 산출물에서 뺀다', () => {
  it('spec_type 이 산출물에 남아 있지 않다', () => {
    const bad: string[] = [];
    for (const m of ALL) for (const [p, r] of Object.entries(m.ranges ?? {})) {
      if (r && typeof r === 'object' && 'spec_type' in r) bad.push(`${m.stable_id ?? m.id} · ${p}`);
    }
    expect(bad, `spec_type 잔존 ${bad.length}건 — 값 성격은 basis 가 담당한다`).toEqual([]);
  });

  it('은퇴한 spec_type 대신 basis 가 실제로 쓰인다 (역할 이관 확인)', () => {
    let n = 0;
    for (const m of ALL) for (const r of Object.values(m.ranges ?? {})) if (r && (r as { basis?: string }).basis === 'min_spec') n++;
    expect(n, 'basis 스탬프 0 — 역할을 넘겨받을 대상이 없다').toBeGreaterThan(100);
  });
});
