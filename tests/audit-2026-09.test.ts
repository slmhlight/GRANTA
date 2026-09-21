/*
 * AUD (2026-09-22) — 외부 감사(2026-09-21, 확정 결함 31·검토 16)에서 데이터 진실성 항목을 고친 뒤 재발을 막는 게이트.
 * 각 it 은 감사 ID 를 달고, 감사가 실증한 상태(예: 세라믹 35 에 Fe-based 피로식)를 다시 만들면 즉시 실패한다.
 * 수(count)가 아니라 근거·규칙을 고정한다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '@/lib/materials';
import { sourceAuthority } from '../scripts/lib/source-labels.mjs';

const ALL: Material[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'client/public/materials.json'), 'utf8'));
type R = { min?: number; max?: number; typical?: number; confidence?: string; estimated?: boolean; provenance?: string; scale?: string; source_scale?: string; source_value?: number; conversion?: string | null; base_value?: number; factor?: number };
const rg = (m: Material, k: string): R | undefined => (m.ranges as Record<string, R | undefined> | undefined)?.[k];
const isAM = (m: Material) => (m.processes || [m.process]).some((p) => /LPBF|DMLS|SLM|EBM|DED|Binder/i.test(String(p)));

describe('AUD F05/F06 — 피로 계열 폴백은 금속에만, 식과 값이 일치', () => {
  it('세라믹·복합재·폴리머에 family:σf≈k·UTS 유도 피로가 없다', () => {
    const bad = ALL.filter((m) => m.category !== 'Metal' && /family:\S+ σf≈[\d.]+·UTS/.test(rg(m, 'fatigue_strength')?.provenance || '')).map((m) => m.name);
    expect(bad).toEqual([]);
  });
  it('UTS 비율 유도값은 현재 UTS × 계수와 일치한다 (stale 유도값 0)', () => {
    const bad: string[] = [];
    for (const m of ALL) {
      const f = rg(m, 'fatigue_strength'); const u = rg(m, 'uts')?.typical;
      const mm = String(f?.provenance || '').match(/σf≈([\d.]+)·UTS/);
      if (!f || !mm || typeof u !== 'number' || typeof f.typical !== 'number') continue;
      if (Math.abs(f.typical - u * parseFloat(mm[1])) > Math.max(1, u * 0.01)) bad.push(`${m.name}: ${f.typical} ≠ ${u}×${mm[1]}`);
    }
    expect(bad).toEqual([]);
  });
  it('Fe-based 태그는 Iron-based 계열에만 붙는다 (아연 등 무규칙 계열은 값 없음)', () => {
    const bad = ALL.filter((m) => /family:Fe-based/.test(rg(m, 'fatigue_strength')?.provenance || '') && !(m.families || []).includes('Iron-based')).map((m) => m.name);
    expect(bad).toEqual([]);
  });
});

describe('AUD F09 — 열처리 계수를 곱한 KIC 는 모델 출력(derived)', () => {
  it('"× HT:" provenance 가 handbook·estimated=false 로 실리지 않고, 원값·계수를 노출한다', () => {
    const rows = ALL.map((m) => rg(m, 'fracture_toughness')).filter((k): k is R => !!k && /× HT:/.test(k.provenance || ''));
    expect(rows.length).toBeGreaterThan(50);   // 모델이 실제로 쓰이고 있음(대상이 사라지면 게이트가 공회전)
    // class×HT 는 이미 class(추정) 등급이라 estimated 표기가 없다(W4-6 관례) — estimated=false 만 금지.
    // alloy-specific×HT 는 handbook 으로 실리던 경로 — derived + estimated + 원값·계수 필수.
    const bad = rows.filter((k) => k.confidence === 'handbook' || k.estimated === false
      || (/^alloy-specific KIC × HT/.test(k.provenance || '') && (k.confidence !== 'derived' || k.estimated !== true || typeof k.base_value !== 'number' || typeof k.factor !== 'number')));
    expect(bad.length).toBe(0);
  });
});

describe('AUD R01 — 푸아송비 물리 상한', () => {
  it('모든 poisson_ratio.max < 0.5 이고 min ≥ 0', () => {
    const bad = ALL.filter((m) => { const p = rg(m, 'poisson_ratio'); return p && ((p.max ?? 0) >= 0.5 || (p.min ?? 0) < 0); }).map((m) => m.name);
    expect(bad).toEqual([]);
  });
});

describe('AUD R02 — 취성 재료에 복사된 항복강도 없음', () => {
  it('세라믹은 항복강도가 없고 no_yield 사유가 있다', () => {
    const cer = ALL.filter((m) => m.category === 'Ceramic');
    expect(cer.length).toBeGreaterThan(30);
    expect(cer.filter((m) => rg(m, 'yield_strength')).map((m) => m.name)).toEqual([]);
    expect(cer.filter((m) => !m.meta?.no_yield).map((m) => m.name)).toEqual([]);
  });
  it('복합재 항복강도가 있으면 인장강도 복사본이 아니다', () => {
    const bad = ALL.filter((m) => m.category === 'Composite' && rg(m, 'yield_strength') && rg(m, 'yield_strength')?.typical === rg(m, 'uts')?.typical).map((m) => m.name);
    expect(bad).toEqual([]);
  });
});

describe('AUD R03/F03 — 경도 스케일', () => {
  it('폴리머에 스케일 불명 경도가 없다', () => {
    const bad = ALL.filter((m) => m.category === 'Polymer' && rg(m, 'hardness') && !rg(m, 'hardness')?.scale && !rg(m, 'hardness')?.provenance).map((m) => m.name);
    expect(bad).toEqual([]);
  });
  it('비-AM 알루미늄 경도는 HV(환산표 명시) 또는 HB(표 밖, 원 스케일) 둘 중 하나로 표기된다', () => {
    const al = ALL.filter((m) => /^Aluminum/.test(m.subcategory || '') && rg(m, 'hardness') && !isAM(m));
    expect(al.length).toBeGreaterThan(60);
    const bad = al.filter((m) => {
      const h = rg(m, 'hardness')!;
      if (h.scale === 'HV') return h.source_scale !== 'HB' || !/E140/.test(h.conversion || '');
      if (h.scale === 'HB') return typeof h.source_value !== 'number';
      return true;   // 스케일 미표기 = 감사 F03 상태
    }).map((m) => `${m.name} ${JSON.stringify(rg(m, 'hardness'))}`);
    expect(bad).toEqual([]);
  });
  it('앵커 — AA 7075-T6: HB 150 → HV 177 · AA 6061-T6: HB 95 → HV 111 (E140 Table 9)', () => {
    const h7 = rg(ALL.find((m) => m.name === 'AA 7075 — T6')!, 'hardness')!;
    const h6 = rg(ALL.find((m) => m.name === 'AA 6061 — T6')!, 'hardness')!;
    expect([h7.source_value, h7.typical]).toEqual([150, 177]);
    expect([h6.source_value, h6.typical]).toEqual([95, 111]);
  });
  it('HRB 원자료 교정 — C26000 OS050 HRB 26 → HV 71 (Table 4) · AISI 434 소둔 75 HRB → HV 137 (Table 2)', () => {
    const c = rg(ALL.find((m) => m.name.startsWith('C26000 — As-supplied'))!, 'hardness')!;
    const s = rg(ALL.find((m) => m.name.startsWith('AISI 434 — Annealed'))!, 'hardness')!;
    expect([c.source_scale, c.source_value, c.typical]).toEqual(['HRB', 26, 71]);
    expect([s.source_scale, s.source_value, s.typical]).toEqual(['HRB', 75, 137]);
  });
});

describe('AUD F04 — 알루미늄 계열 분류', () => {
  it("'Si Alloys (6xxx/7xxx)' 통합 subcategory 가 없다", () => {
    expect(ALL.filter((m) => m.subcategory === 'Aluminum - Si Alloys (6xxx/7xxx)').length).toBe(0);
  });
  it('AA 7xxx → Zn Alloys, AA 6xxx → Mg-Si Alloys, Al-Si 주조/AM → Si Alloys (cast/AM)', () => {
    const sub = (re: RegExp) => new Set(ALL.filter((m) => re.test(m.name)).map((m) => m.subcategory));
    expect([...sub(/^AA 7\d{3}\b/)]).toEqual(['Aluminum - Zn Alloys (7xxx)']);
    expect([...sub(/^AA 6\d{3}\b/)]).toEqual(['Aluminum - Mg-Si Alloys (6xxx)']);
    expect([...sub(/^(A356|A380|ADC12|AlSi10Mg|Al12Si)\b/)]).toEqual(['Aluminum - Si Alloys (cast/AM 3xx·4xx)']);
  });
});

describe('AUD F08 — 복합재 구성비 기준', () => {
  it("구성 라벨에 vol% 가 있으면 meta.composition_basis = 'vol%'", () => {
    const bad = ALL.filter((m) => m.category === 'Composite' && Array.isArray(m.composition)
      && (m.composition as unknown[]).some((p) => /vol\s?%/i.test(String(Array.isArray(p) ? p[0] : '')))
      && m.meta?.composition_basis !== 'vol%').map((m) => m.name);
    expect(bad).toEqual([]);
  });
});

describe('AUD F10 — 총 원가 모델', () => {
  it('total_cost_estimate ≥ delivered_price_per_kg (가공비는 음수가 아니다)', () => {
    const bad = ALL.filter((m) => m.total_cost_estimate != null && m.delivered_price_per_kg != null && m.total_cost_estimate < m.delivered_price_per_kg).map((m) => m.name);
    expect(bad).toEqual([]);
  });
});

describe('AUD F12 — 출처 권위는 발행처가 정한다', () => {
  it("URL 이 제조사·aggregator 도메인인 출처는 'standard' 가 아니다", () => {
    const bad: string[] = [];
    for (const m of ALL) for (const s of (m.sources || []) as Array<{ url?: string | null; label?: string; authority?: string }>) {
      if (s.authority === 'standard' && /aksteel|smithshp|makeitfrom|matweb|carpentertechnology|specialmetals|haynes|outokumpu|sandvik|alleima|timet|kaiseraluminum/i.test(s.url || '')) bad.push(`${m.name}: ${s.label}`);
    }
    expect(bad).toEqual([]);
  });
  it('주입 실증 — 제조사 URL + UNS/AMS 라벨 → manufacturer · 규격 번호로 시작하는 URL 없는 라벨 → standard · 학술지 → handbook', () => {
    expect(sourceAuthority({ label: 'AK Steel — 410 Stainless Steel (martensitic, UNS S41000)', url: 'https://www.aksteel.com/x' })).toBe('manufacturer');
    expect(sourceAuthority({ label: 'Special Metals — Inconel 718 (AMS 5662)' })).toBe('manufacturer');
    expect(sourceAuthority({ label: 'ASTM A240 (Type 434)' })).toBe('standard');
    expect(sourceAuthority({ label: 'Zhang et al. 2017, Appl. Sci. 7:1009', url: 'https://www.mdpi.com/2076-3417/7/10/1009' })).toBe('handbook');
  });
});

describe('AUD R05/F07/F29 — 개별 교정', () => {
  it('순수 베릴륨에 BeCu 계열 KIC 가 붙지 않는다', () => {
    const be = ALL.find((m) => /^Beryllium —/.test(m.name))!;
    expect(rg(be, 'fracture_toughness') ?? undefined).toBeUndefined();
  });
  it('B4C-Al MMC 는 논문 실측(20 wt% 306 · 15 wt% 281 MPa)이며 굽힘값·유도피로·침투장갑 설명이 없다', () => {
    const b = ALL.filter((m) => /^B4C-Al MMC/.test(m.name));
    expect(b.map((m) => rg(m, 'uts')?.typical).sort()).toEqual([281, 306]);
    for (const m of b) {
      expect(rg(m, 'uts')?.confidence).toBe('measured');
      expect(/Zhang/.test(rg(m, 'uts')?.provenance || '')).toBe(true);
      expect(rg(m, 'fatigue_strength') ?? undefined).toBeUndefined();
      expect(/60-80 vol%/.test(String(m.industry_note || ''))).toBe(false);
      expect(m.meta?.composition_basis).toBe('wt%');
    }
  });
});
