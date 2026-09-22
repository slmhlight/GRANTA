/*
 * AUD-T (2026-09-22) — 외부 감사 "수정검증 추적보고서"(잔여 7·신규 7)에서 고친 항목의 재발 방지 게이트.
 * 각 it 은 보고서 ID 를 달고, 보고서가 실증한 상태를 다시 만들면 즉시 실패한다. 수(count)가 아니라 규칙을 고정한다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '@/lib/materials';
import { deliveredMismatch } from '../scripts/lib/derived-prices.mjs';
import { suggestAutolink, GRADE_TOKEN_RE } from '../scripts/lib/name-tokens.mjs';

const ROOT = process.cwd();
const ALL: Material[] = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'client/public/materials.json'), 'utf8'));
type R = { min?: number; max?: number; typical?: number; n?: number; confidence?: string; estimated?: boolean; provenance?: string; base_value?: number; base_range?: number[]; factor?: number; condition?: string; model?: string };
const rg = (m: Material, k: string): R | undefined => (m.ranges as Record<string, R | undefined> | undefined)?.[k];

describe('AUD-T N01 — HT 계수를 곱한 피로·충격은 모델 출력(derived + estimated + 기초값·계수)', () => {
  const htRows = (k: string) => ALL.map((m) => ({ m, r: rg(m, k) })).filter((x): x is { m: Material; r: R } => !!x.r && /× HT:/.test(x.r.provenance || '') && /\b[fi]×/.test(x.r.provenance || ''));

  it('대상이 실제로 존재한다 (피로·충격 각 ≥ 50 — 사라지면 게이트가 공회전)', () => {
    expect(htRows('fatigue_strength').length).toBeGreaterThan(50);
    expect(htRows('impact_strength').length).toBeGreaterThan(50);
  });

  for (const k of ['fatigue_strength', 'impact_strength']) {
    it(`${k}: "× HT:" 계수 ≠ 1 인 값은 confidence handbook 이 아니고, derived 면 estimated·base_value·factor·condition 이 있다`, () => {
      const bad: string[] = [];
      for (const { m, r } of htRows(k)) {
        const fac = k === 'fatigue_strength' ? /f×([\d.]+)/.exec(r.provenance || '') : /i×([\d.]+)/.exec(r.provenance || '');
        const factor = fac ? parseFloat(fac[1]) : 1;
        if (factor === 1) continue;   // 계수 1 은 핸드북 값 그대로 — handbook 유지가 맞다
        if (r.confidence === 'handbook' && r.model) bad.push(`${m.name}: handbook 인데 model ${r.model}`);
        if (r.model && String(r.model).startsWith('ht-multiplier')) {
          // 핸드북 기초값 × 계수 = derived(추정) · 계열 폴백 기초값 × 계수 = class(추정) — 둘 다 estimated 필수, handbook 금지
          if (!((r.confidence === 'derived' || r.confidence === 'class') && r.estimated === true)) bad.push(`${m.name}: ${r.confidence}/${r.estimated}`);
          if (typeof r.base_value !== 'number' || typeof r.factor !== 'number' || !r.condition) bad.push(`${m.name}: 기초값·계수·조건 누락`);
          else if (Math.abs(r.factor - factor) > 1e-9) bad.push(`${m.name}: factor ${r.factor} ≠ provenance ${factor}`);
          else if (!/cap σf≤/.test(r.provenance || '') && typeof r.typical === 'number' && Math.abs(Math.round(r.base_value * r.factor) - r.typical) > 1) bad.push(`${m.name}: typical ${r.typical} ≠ base ${r.base_value} × ${r.factor}`);   // X-750 물리 상한 cap 은 provenance 에 명시되고 typical 이 줄어든다
          if (r.n !== 0) bad.push(`${m.name}: n=${r.n} (모델값의 표본 수는 0)`);
        }
      }
      expect(bad, bad.slice(0, 10).join('\n')).toEqual([]);
    });
  }

  it('보고서 사례 — 316L AM as-built(C_0000)·AA 7050 T7451(R_0363_1): 피로·충격이 derived+estimated', () => {
    for (const id of ['C_0000', 'R_0363_1']) {
      const m = ALL.find((x) => x.id === id)!;
      expect(m, id).toBeTruthy();
      for (const k of ['fatigue_strength', 'impact_strength']) {
        const r = rg(m, k)!;
        expect(r.confidence, `${id} ${k}`).toBe('derived');
        expect(r.estimated, `${id} ${k}`).toBe(true);
        expect(typeof r.base_value, `${id} ${k}`).toBe('number');
      }
    }
  });

  it('값을 덮는 override 뒤에 HT 모델 필드(base_value·factor·model)가 남지 않는다 — handbook 값에 거짓 계보 금지', () => {
    const bad: string[] = [];
    for (const m of ALL) for (const k of ['fatigue_strength', 'impact_strength', 'fracture_toughness']) {
      const r = rg(m, k);
      if (r && r.confidence === 'handbook' && (r.model || r.base_value != null || r.factor != null)) bad.push(`${m.name} ${k}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('AUD-T N02 — 파생 가격은 최종 raw 로 다시 계산된다', () => {
  it('delivered_price_per_kg = raw × condition × form × grade (±0.02 USD/kg) — 전 재료', () => {
    const bad = ALL.filter((m) => (deliveredMismatch(m) || 0) > 0).map((m) => `${m.id} ${m.name}: raw ${rg(m, 'price_per_kg')?.typical} → delivered ${m.delivered_price_per_kg}`);
    expect(bad, bad.slice(0, 10).join('\n')).toEqual([]);
  });
  it('보고서 사례 — 316L AM(C_0000) 15.5 · PEEK(G_0172) 90 — 시장가 덮어쓰기 뒤에도 곱셈식이 재현된다', () => {
    const c = ALL.find((m) => m.id === 'C_0000')!;
    expect(c.delivered_price_per_kg).toBeCloseTo(6.2 * 1 * 2.5 * 1, 2);
    const p = ALL.find((m) => m.id === 'G_0172')!;
    expect(p.delivered_price_per_kg).toBeCloseTo(90, 2);
  });
  it('평면 price_per_kg = ranges.price_per_kg.typical · 총원가 = delivered × (1 + machining index) · provenance 에 식이 적혀 있다', () => {
    const bad: string[] = [];
    for (const m of ALL) {
      const pk = rg(m, 'price_per_kg')?.typical;
      if (typeof pk !== 'number') continue;
      if (typeof m.price_per_kg !== 'number' || Math.abs(m.price_per_kg - pk) > 1e-9) bad.push(`${m.name}: 평면 ${m.price_per_kg} ≠ ranges ${pk}`);
      const d = m.delivered_price_per_kg;
      if (typeof d !== 'number') { bad.push(`${m.name}: delivered 없음`); continue; }
      const prov = rg(m, 'delivered_price_per_kg')?.provenance || '';
      if (!/raw .* × condition .* × form .* × grade|견적 고정값/.test(prov)) bad.push(`${m.name}: provenance 없음`);
      const idx = m.machining_cost_factor;
      if (typeof idx === 'number') {
        if (typeof m.total_cost_estimate !== 'number' || Math.abs(m.total_cost_estimate - +(d * (1 + idx)).toFixed(2)) > 0.02) bad.push(`${m.name}: 총원가 ${m.total_cost_estimate} ≠ ${d}×(1+${idx})`);
      } else if (m.total_cost_estimate != null) bad.push(`${m.name}: 절삭 모델 부적용인데 총원가 존재`);
    }
    expect(bad, bad.slice(0, 10).join('\n')).toEqual([]);
  });
});

describe('AUD-T N05 — 자동 링크 일반어·등급 토큰 제외', () => {
  it("'standard'·'tube'·'grade2'·'gr70' 은 autolink 후보가 아니고, 합금명이 붙은 'ticpgr2'·'cpgr2' 는 후보다", () => {
    for (const f of ['standard', 'tube', 'grade2', 'grade1', 'gr70', 'type316', 'class1', 'carpenter', 'victrex', 'solvay', 'daido']) expect(suggestAutolink(f, false), f).toBe(false);
    for (const f of ['ticpgr2', 'cpgr2', 'a516gr70', 'inconel718']) expect(suggestAutolink(f, false), f).toBe(true);
    expect(GRADE_TOKEN_RE.test('grade2')).toBe(true);
    expect(GRADE_TOKEN_RE.test('ticpgr2')).toBe(false);
  });
  it('배포 wiki-index 에 일반어·등급 토큰이 autolink=true 로 남아 있지 않다', () => {
    const idx = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'client/public/wiki-index.json'), 'utf8'));
    const bad: string[] = [];
    for (const e of idx.entities) for (const sf of e.surface_forms || []) {
      if (sf.autolink && (['standard', 'tube', 'carpenter', 'victrex', 'solvay', 'daido', 'markforged', 'crucible', 'sabic', 'allvac'].includes(sf.form) || GRADE_TOKEN_RE.test(sf.form))) bad.push(`${e.id}: ${sf.form}`);
    }
    expect(bad).toEqual([]);
  });
  it('surface form 은 그 form 을 만든 재료 id 를 갖는다 (Ti CP Gr2 → Gr2 entry, 대표 Gr1 아님)', () => {
    const idx = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'client/public/wiki-index.json'), 'utf8'));
    const cp = idx.entities.find((e: { id: string }) => e.id === 'cp-ti');
    expect(cp).toBeTruthy();
    const gr2 = cp.surface_forms.find((sf: { form: string }) => sf.form === 'ticpgr2');
    expect(gr2?.id).toBeTruthy();
    const target = ALL.find((m) => m.id === gr2.id)!;
    expect(/Gr2|Grade 2/i.test(target.name)).toBe(true);
  });
});

describe('AUD-T F02/F30 — 가이드 서술이 도구의 식과 같다', () => {
  const guideDir = path.resolve(ROOT, 'client/src/pages/guide');
  const files = fs.readdirSync(path.join(guideDir, 'chapters')).map((f) => path.join(guideDir, 'chapters', f)).concat([path.join(guideDir, 'components.tsx')]);
  it('가이드 어디에도 HV≈10×HRC / HRC≈HV/10 같은 선형 경도식이 없다 (E140 표 참조만)', () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      if (/HV\s*≈\s*10\s*[×x]\s*HRC|HRC\s*≈\s*HV\s*\/\s*10/.test(src)) bad.push(path.basename(f));
    }
    expect(bad).toEqual([]);
  });
  it("압력용기 사례가 'SF ≥ 3 typical ASME' 처럼 특정 코드의 보편 계수인 양 σy 와 묶지 않는다", () => {
    const ch7 = fs.readFileSync(path.join(guideDir, 'chapters', 'ch7.tsx'), 'utf8');
    expect(/SF\s*≥\s*3\s*typical\s*ASME/i.test(ch7)).toBe(false);
  });
});
