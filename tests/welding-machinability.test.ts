/*
 * R71 Sprint E → R226j/C6 재작성 — 용접성(CET 물리식 + weld 모델 게이트) · 절삭성(ID 프로파일 해석).
 * 분류(name→프로파일)는 빌드타임 (scripts/lib/process-classify.mjs → assignments) — 그 검증은
 * machinability-robustness.test.ts (실 데이터) + process-profiles.test.ts (parity 게이트).
 */
import { describe, it, expect } from 'vitest';
import { computeCET, computeSchaeffler, machiningCostBand } from '../client/src/lib/welding-machinability';
import { resolveMachinability, resolvePolymerMachinability, resolveConditionNote, resolveMachiningGuidance, resolveInsights, insightPickMatches, machinabilitySources, resolveHtGuidanceTexts, isAmProcess } from '../client/src/lib/process-guidance';
import type { Material } from '../client/src/lib/materials';

function mk(over: Partial<Material>): Material {
  return {
    id: 'test', name: 'test alloy', category: 'Metal', subcategory: 'Test',
    process: 'Wrought', manufacturer: '', composition: {}, sources: [],
    ranges: {} as any,
    ...over,
  } as Material;
}

describe('computeCET (IIW Doc IX-1086-87) — weld 모델 게이트 (R226j)', () => {
  it('profiles.weld !== ce → null (비철·스테인리스·프로파일 없음)', () => {
    expect(computeCET(mk({ profiles: { weld: 'none' } }))).toBeNull();
    expect(computeCET(mk({ profiles: { weld: 'schaeffler' } }))).toBeNull();
    expect(computeCET(mk({}))).toBeNull();   // 스탬프 없음 = 안전한 null
  });
  it('weld=ce + mild steel 조성 → low band', () => {
    const r = computeCET(mk({
      profiles: { weld: 'ce' },
      composition: { Fe: 'balance', C: '0.18', Mn: '0.7', Si: '0.2' } as any,
    }));
    expect(r).not.toBeNull();
    expect(r!.cet).toBeLessThan(0.4);
    expect(r!.band).toBe('low');
  });
  it('weld=ce + 4140 조성 → CET > 0.4', () => {
    const r = computeCET(mk({
      profiles: { weld: 'ce' },
      composition: { Fe: 'balance', C: '0.4', Mn: '0.85', Cr: '1.0', Mo: '0.2', Si: '0.25' } as any,
    }));
    expect(r!.cet).toBeGreaterThan(0.4);
  });
});

describe('computeSchaeffler — weld 모델 게이트', () => {
  it('weld=schaeffler + 304 조성 → phase 산출', () => {
    const r = computeSchaeffler(mk({
      profiles: { weld: 'schaeffler' },
      composition: { Cr: '18.5', Ni: '9', C: '0.05', Mn: '1.5', Si: '0.5' } as any,
    }));
    expect(r).not.toBeNull();
    expect(r!.cr_eq).toBeGreaterThan(18);
  });
  it('weld=ce → null (탄소강에 Schaeffler 미적용)', () => {
    expect(computeSchaeffler(mk({ profiles: { weld: 'ce' }, composition: { Cr: '1', Ni: '0.5' } as any }))).toBeNull();
  });
});

describe('resolveMachinability — ID 프로파일 조회 (regex 없음)', () => {
  it('mach=carbon-low → 70 easy · crmo → 60 · ni-super → 15 very_hard', () => {
    expect(resolveMachinability(mk({ profiles: { mach: 'carbon-low' } }))?.rating).toBe(70);
    expect(resolveMachinability(mk({ profiles: { mach: 'carbon-low' } }))?.band).toBe('easy');
    expect(resolveMachinability(mk({ profiles: { mach: 'crmo' } }))?.rating).toBe(60);
    const ni = resolveMachinability(mk({ profiles: { mach: 'ni-super' } }));
    expect(ni?.rating).toBe(15);
    expect(ni?.band).toBe('very_hard');
  });
  it('프로파일 없음 → null (안전) · 비금속 → null', () => {
    expect(resolveMachinability(mk({}))).toBeNull();
    expect(resolveMachinability(mk({ category: 'Polymer', profiles: { mach: 'pol-rigid' } }))).toBeNull();
  });
  it('미정의 키 → null (콘텐츠 parity 는 별도 게이트)', () => {
    expect(resolveMachinability(mk({ profiles: { mach: 'no-such-key' } }))).toBeNull();
  });
});

describe('resolvePolymerMachinability — 폴리머 클래스 (Ensinger·Quadrant 검증)', () => {
  const pm = (mach: string) => resolvePolymerMachinability(mk({ category: 'Polymer', profiles: { mach } }));
  it('pol-filled → hard 마모성 필러', () => {
    expect(pm('pol-filled')?.band).toBe('hard');
    expect(pm('pol-filled')?.label).toContain('필러');
  });
  it('pol-amorphous → ESC 절삭유 주의 (Quadrant 원문 확증 신규 클래스)', () => {
    const r = pm('pol-amorphous');
    expect(r?.band).toBe('easy');
    expect(r?.note).toContain('stress-cracking');
  });
  it('pol-rigid → easy · pol-elastomer → hard · pol-soft → normal', () => {
    expect(pm('pol-rigid')?.band).toBe('easy');
    expect(pm('pol-elastomer')?.band).toBe('hard');
    expect(pm('pol-soft')?.band).toBe('normal');
  });
  it('금속 → null', () => {
    expect(resolvePolymerMachinability(mk({ profiles: { mach: 'pol-rigid' } }))).toBeNull();
  });
});

describe('machiningCostBand — 카테고리 가드 유지', () => {
  it('Polymer/Ceramic/Composite → null · Metal → band', () => {
    expect(machiningCostBand(0.7, 'Polymer')).toBeNull();
    expect(machiningCostBand(0.7, 'Ceramic')).toBeNull();
    expect(machiningCostBand(0.7, 'Metal')?.band).toBe('easy');
  });
  it('R226v — 정확히 1.0(미산출 기본값)은 표시 억제, 1.0 근방 산출값은 유지', () => {
    expect(machiningCostBand(1.0, 'Metal')).toBeNull();
    expect(machiningCostBand(1.02, 'Metal')?.band).toBe('normal');
    expect(machiningCostBand(0.98, 'Metal')?.band).toBe('normal');
  });
});

/* R226w — AM 후처리 HT 가이드: 구조 필드(process) 판정 + 빌드 스탬프(ht/mach) family 매핑. */
describe('AM 후처리 열처리 가이드 (R226w)', () => {
  it('LPBF Ti-6Al-4V(ht family) → am-ti64: SR·HIP 920°C 포함', () => {
    const texts = resolveHtGuidanceTexts(mk({ process: 'LPBF', profiles: { ht: 'Ti-6Al-4V (UNS R56400 Grade 5 / R56407 Grade 23 ELI)' } }));
    expect(texts.join('\n')).toContain('920°C');
    expect(texts.join('\n')).toContain('Stress Relief');
  });
  it('LPBF AlSi10Mg → am-alsi: SR 강도 하락 경고 포함', () => {
    const texts = resolveHtGuidanceTexts(mk({ process: 'LPBF (DMLS)', profiles: { ht: 'AlSi cast / AM (AlSi10Mg, AlSi12, A357)' } }));
    expect(texts.join('\n')).toContain('As-built 가 가장 강함');
  });
  it('LPBF CP-Ti(ht 없음 → mach fallback) → am-ti-cp', () => {
    const texts = resolveHtGuidanceTexts(mk({ process: 'LPBF', profiles: { mach: 'ti-cp' } }));
    expect(texts.join('\n')).toContain('CP-Ti');
  });
  it('Wrought(비 AM) 는 am 블록 미적용 · Polymer/비금속 미적용', () => {
    expect(resolveHtGuidanceTexts(mk({ process: 'Wrought', profiles: { mach: 'ti-cp' } }))).toEqual([]);
    expect(isAmProcess(mk({ process: 'Wrought' }))).toBe(false);
    expect(isAmProcess(mk({ process: 'LPBF (SLM)' }))).toBe(true);
  });
});

describe('조건(variation)별 노트 + 가이드 + 인사이트 (R226j)', () => {
  it('ni-super|aged → 시효 시퀀스 노트 · soft 는 다른 노트 (조건 분화)', () => {
    const aged = resolveConditionNote(mk({ profiles: { mach: 'ni-super', htc: 'aged' } }));
    const soft = resolveConditionNote(mk({ profiles: { mach: 'ni-super', htc: 'soft' } }));
    expect(aged).toContain('시효');
    expect(soft).toContain('가공 적기');
    expect(aged).not.toBe(soft);
  });
  it('htc 없으면 null', () => {
    expect(resolveConditionNote(mk({ profiles: { mach: 'ni-super' } }))).toBeNull();
  });
  it('가이드 — ti-alloy → titanium 가이드 (발화 경고 포함)', () => {
    const g = resolveMachiningGuidance(mk({ profiles: { mach: 'ti-alloy' } }));
    expect(g).toContain('Ti');
    expect(g).toContain('발화');
  });
  it('인사이트 — stainless 그룹 + 현재 재료 강조 매칭', () => {
    const m = mk({ name: 'AISI 316L (Wrought) — Annealed', profiles: { insight: 'stainless' } });
    const ins = resolveInsights(m);
    expect(ins?.title).toContain('스테인리스');
    const pick316 = ins!.picks.find(p => p.use.includes('316'));
    expect(pick316).toBeTruthy();
    expect(insightPickMatches(m, pick316!)).toBe(true);
    const pick430 = ins!.picks.find(p => p.use.includes('430'));
    expect(insightPickMatches(m, pick430!)).toBe(false);
  });
  it('융합 (R226l) — 718 STA vs 625: 같은 그룹에서 후보 전용 시나리오 → whenLine + 절삭성 델타', async () => {
    const { decisionContext } = await import('../client/src/components/material-detail/SimilarMaterialsCard');
    const cur = mk({ name: 'Inconel 718 — Solution + Single age (STA)', profiles: { insight: 'ni-superalloy', mach: 'ni-super' } });
    const cand = mk({ name: 'Inconel 625 — Solution treated', profiles: { insight: 'ni-superalloy', mach: 'ni-super-solidsol' } });
    const ctx = decisionContext(cur, cand);
    expect(ctx.whenLine).toContain('Inconel 625');       // 625 전용 시나리오 (650-980°C/부식)
    expect(ctx.machChip).toBe('절삭성 15%→12%');
    expect(ctx.crossGroup).toBe(false);                  // 같은 ni-superalloy 그룹
    // 다른 그룹(R226m): crossGroup 플래그 + 후보 그룹명 배지 + 주 용도 안내
    const ti = mk({ name: 'Ti-6Al-4V', profiles: { insight: 'titanium', mach: 'ti-alloy' } });
    const tctx = decisionContext(cur, ti);
    expect(tctx.crossGroup).toBe(true);
    expect(tctx.candGroupTitle).toBe('티타늄');            // R226o — 짧은 그룹 라벨
    expect(tctx.whenLine).toContain('통상 용도');           // "이 재료의 통상 용도: ..."
  });
  it('출처 — 카테고리별 분리 (폴리머에 금속 표준 없음)', () => {
    const polySrc = machinabilitySources(mk({ category: 'Polymer' })).join(' ');
    expect(polySrc).toContain('Ensinger');
    expect(polySrc).not.toMatch(/ISO 3685|1212/);
    expect(machinabilitySources(mk({})).join(' ')).toContain('Machining Data Handbook');
  });
});
