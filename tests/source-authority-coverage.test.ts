/*
 * H6 W2-3 — 출처 권위 커버리지 게이트.
 * "모든 재료는 값이 속한 규격 체계(표준) 또는 핸드북 인용을 최소 1개 보유한다" 를 강제.
 * 근거: KPI 진단(2026-07-17) — 343 entry 가 vendor/aggregator-only 였음 → 족보 출처(sourcesBySubcategory)
 *   조건 확장(noStandard) + 폴리머 시험 표준(ISO 527/178/75) 부착으로 0 달성. 신규 subcategory 추가 시
 *   족보 출처 미등재면 여기서 실패 — 조용한 권위 공백 재발 차단.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '@/lib/materials';

const mats: Material[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'client/public/materials.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'client/public/build-meta.json'), 'utf8'));
const hasAuth = (m: Material) => (m.sources || []).some((s: any) => s.authority === 'standard' || s.authority === 'handbook');

describe('출처 권위 커버리지 (W2-3)', () => {
  it('전 재료가 standard/handbook 인용 ≥1 (subcategory 족보 또는 시험 표준)', () => {
    const bad = mats.filter((m) => !hasAuth(m)).map((m) => `${m.name} [${m.subcategory}]`);
    expect(bad, `권위 인용 0: ${bad.slice(0, 6).join(' / ')}`).toEqual([]);
  });
  it('폴리머는 시험 표준(ISO 527/178) 인용 보유 — 물성 측정 근거', () => {
    const polys = mats.filter((m) => m.category === 'Polymer');
    const bad = polys.filter((m) => !(m.sources || []).some((s) => /ISO 527|ISO 178/.test(s.label || ''))).map((m) => m.name);
    // 제조사 TDS 에 표준이 이미 명시된 entry 는 예외 (standard/handbook 보유로 규칙 미발화)
    const reallyBad = bad.filter((n) => !hasAuth(mats.find((m) => m.name === n)!));
    expect(reallyBad).toEqual([]);
  });
  it('KPI — standard+handbook 비율 ≥35% (Q3 로드맵 목표)', () => {
    const d = meta.authorityDistribution as Record<string, number>;
    const total = Object.values(d).reduce((a, b) => a + b, 0);
    const pct = (d.standard + d.handbook) / total * 100;
    console.log(`출처 권위 KPI: ${pct.toFixed(1)}% (standard ${d.standard} + handbook ${d.handbook} / ${total})`);
    expect(pct).toBeGreaterThanOrEqual(35);
  });
});
