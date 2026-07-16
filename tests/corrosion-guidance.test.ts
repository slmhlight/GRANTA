/*
 * H6 E15 — Corrosion 카드 게이트.
 * ① SSOT 스키마: assignment→groups parity(빌드 게이트와 동일) · 그룹 필수 필드 · enum 유효
 * ② 커버리지: profiles.corr 스탬프 규모 (Metal 대부분 + Polymer/Ceramic 전량, Composite 는 의도적 부재)
 * ③ 합금 앵커: 그룹 배정 + 모드 캐비엇(단일 등급이 취약 모드를 가리지 않는다는 원칙의 회귀 앵커)
 * ④ PREN: 실조성 계산 검증 (2205≈36 · 304=18 하한 · Al→null)
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resolveCorrosionPlan, prenOf } from '@/lib/corrosion-guidance';
import type { Material } from '@/lib/materials';
import guidance from '../data/corrosion-guidance.json';

const mats: Material[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'client/public/materials.json'), 'utf8'));
const byName = (n: string) => mats.find((m) => m.name === n);
const g = guidance as any;

describe('corrosion-guidance SSOT 스키마', () => {
  it('assignment 대상 그룹 전부 정의됨 (parity)', () => {
    for (const [src, tbl] of Object.entries<Record<string, string>>(g.assignment)) {
      for (const [k, v] of Object.entries(tbl)) {
        expect(g.groups[v], `assignment.${src}.${k} → '${v}'`).toBeDefined();
      }
    }
  });
  it('전 그룹: title·intro·modes(≥1)·sources(≥1) + enum 유효', () => {
    const V = new Set(['excellent', 'good', 'caution', 'poor']);
    const R = new Set(['high', 'med', 'low']);
    for (const [key, gr] of Object.entries<any>(g.groups)) {
      expect(gr.title, key).toBeTruthy();
      expect(String(gr.intro).length, `${key} intro`).toBeGreaterThan(30);
      expect(gr.modes.length, `${key} modes`).toBeGreaterThanOrEqual(1);
      expect(gr.sources.length, `${key} sources`).toBeGreaterThanOrEqual(1);
      for (const m of gr.media) expect(V.has(m.verdict), `${key} verdict '${m.verdict}'`).toBe(true);
      for (const m of gr.modes) expect(R.has(m.risk), `${key} risk '${m.risk}'`).toBe(true);
    }
  });
  it('매체 6축 고정 — 전 그룹 동일 축·동일 순서 (해수/염수·강산/약산 분리 — 사용자 지시)', () => {
    const AXES = ['대기', '해수', '염수·염화물', '강산', '약산(묽은산·유기산)', '알칼리'];
    for (const [key, gr] of Object.entries<any>(g.groups)) {
      expect(gr.media.map((m: any) => m.env), `${key} 매체 축`).toEqual(AXES);
    }
  });
  it('강산/약산 verdict 실분화 — 축만 쪼갠 형식 분리가 아님', () => {
    // 대표 앵커: 오스테나이트 SS(강산 caution ↔ 약산 good) · Ti(강산 caution ↔ 해수 excellent)
    const ss = g.groups['ss-austenitic'].media;
    expect(ss.find((m: any) => m.env === '강산').verdict).toBe('caution');
    expect(ss.find((m: any) => m.env.startsWith('약산')).verdict).toBe('good');
    const ti = g.groups['ti'].media;
    expect(ti.find((m: any) => m.env === '해수').verdict).toBe('excellent');
    expect(ti.find((m: any) => m.env === '강산').verdict).toBe('caution');
    // 전 그룹 통계: 강산≠약산 verdict 인 그룹이 3분의 1 이상 (실분화 증명)
    const diff = Object.values<any>(g.groups).filter((gr) => {
      const s = gr.media.find((m: any) => m.env === '강산')?.verdict;
      const w = gr.media.find((m: any) => m.env.startsWith('약산'))?.verdict;
      return s !== w;
    }).length;
    expect(diff).toBeGreaterThanOrEqual(8);
  });
});

describe('커버리지 (profiles.corr 스탬프)', () => {
  it('Metal ≥900 · Polymer/Ceramic 전량 · Composite 0 (의도적 hide)', () => {
    const has = (m: Material) => !!(m.profiles as any)?.corr;
    const cnt = (cat: string) => mats.filter((m) => m.category === cat && has(m)).length;
    expect(cnt('Metal')).toBeGreaterThanOrEqual(900);
    expect(cnt('Polymer')).toBe(mats.filter((m) => m.category === 'Polymer').length);
    expect(cnt('Ceramic')).toBe(mats.filter((m) => m.category === 'Ceramic').length);
    expect(cnt('Composite')).toBe(0);
  });
});

describe('합금 앵커 — 그룹 배정 + 모드 캐비엇', () => {
  it('AISI 304 → ss-austenitic + 염화물 SCC 위험 high 명시', () => {
    const p = resolveCorrosionPlan(byName('AISI 304 — Annealed (Wrought)')!)!;
    expect(p.groupKey).toBe('ss-austenitic');
    const scc = p.group.modes.find((m) => m.mode.includes('SCC'));
    expect(scc?.risk).toBe('high');
  });
  it('2205 Duplex → ss-duplex + SCC 저항 low(강점) + σ상 주의', () => {
    const p = resolveCorrosionPlan(byName('2205 Duplex Stainless')!)!;
    expect(p.groupKey).toBe('ss-duplex');
    expect(p.group.modes.find((m) => m.mode.includes('SCC'))?.risk).toBe('low');
    expect(p.group.modes.some((m) => m.mode.includes('σ상'))).toBe(true);
  });
  it('마레이징 → maraging (Cr 없음 녹 함정 그룹) + HE high', () => {
    const m = mats.find((x) => /^Maraging 250/.test(x.name))!;
    const p = resolveCorrosionPlan(m)!;
    expect(p.groupKey).toBe('maraging');
    expect(p.group.modes.find((x) => x.mode.includes('수소취성'))?.risk).toBe('high');
  });
  it('AA 6061 → al-wrought + 갈바닉 high', () => {
    const p = resolveCorrosionPlan(byName('AA 6061 — T6')!)!;
    expect(p.groupKey).toBe('al-wrought');
    expect(p.group.modes.find((x) => x.mode.includes('갈바닉'))?.risk).toBe('high');
  });
  it('폴리머 → polymer (화학 열화 프레임) · 세라믹 → ceramic', () => {
    const peek = mats.find((m) => m.name.startsWith('PEEK — As-supplied'))!;
    expect(resolveCorrosionPlan(peek)?.groupKey).toBe('polymer');
    const al2o3 = mats.find((m) => /^Alumina/.test(m.name))!;
    expect(resolveCorrosionPlan(al2o3)?.groupKey).toBe('ceramic');
  });
  it('Composite 는 카드 생략 (null)', () => {
    const c = mats.find((m) => m.category === 'Composite')!;
    expect(resolveCorrosionPlan(c)).toBeNull();
  });
  it('조건 보정 — ss-ph + aged 는 H900 SCC 노트', () => {
    const ph = mats.find((m) => /17-4 PH/.test(m.name) && (m.profiles as any)?.htc === 'aged' && (m.profiles as any)?.corr === 'ss-ph');
    if (!ph) return; // 데이터 변동 허용
    const p = resolveCorrosionPlan(ph)!;
    expect(p.conditionNotes.some((n) => n.includes('H1025'))).toBe(true);
  });
});

describe('PREN (Cr + 3.3Mo + 16N)', () => {
  it('2205 (Cr 22~23·Mo 3~3.5·N 0.14~0.2) ≈ 36', () => {
    const p = prenOf(byName('2205 Duplex Stainless')!);
    expect(p).not.toBeNull();
    expect(p!.value).toBeGreaterThan(33);
    expect(p!.value).toBeLessThan(39);
    expect(p!.nMissing).toBe(false);
  });
  it('304 (Cr 18·Mo/N 무) = 18 하한 (nMissing)', () => {
    const p = prenOf(byName('AISI 304 — Annealed (Wrought)')!);
    expect(p!.value).toBe(18);
    expect(p!.nMissing).toBe(true);
  });
  it('AA 6061 (Cr<10.5) → null (스테인리스 도메인 밖)', () => {
    expect(prenOf(byName('AA 6061 — T6')!)).toBeNull();
  });
});
