/*
 * H6 W3-3 (D8) — AM 후처리 가이드 커버리지 게이트.
 *
 * am_map 은 byHt(합금 특정) → byMach(명시 키 — ti-cp·cu-crzr) → byHtg(열처리 가족) 3단으로 조회한다
 * (D8 확장 2026-09-22: 가족을 먼저 보면 CP-Ti 가 am-ti-alloy 의 HIP·STA 처방을 받았다 — 순서 교정).
 * 여기서 **런타임 resolveHtGuidanceTexts 를 실제로 호출**해, AM 공정 금속에 후처리 카드가
 * 빠지지 않는지 전수 확인한다(새 AM 재료가 들어와도 매핑 누락이면 실패).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '../client/src/lib/materials';
import { isAmProcess, resolveHtGuidanceTexts } from '../client/src/lib/process-guidance';
import htGuidance from '../data/ht-guidance.json';

const ROOT = path.resolve(__dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'public', 'materials.json'), 'utf8'));
const all: Material[] = Array.isArray(raw) ? raw : raw.materials;
const amMetals = all.filter((m) => m.category === 'Metal' && isAmProcess(m));

describe('AM 후처리 가이드 (D8)', () => {
  it('AM 공정 금속은 전부 후처리 안내를 받는다', () => {
    expect(amMetals.length).toBeGreaterThan(50);
    const miss = amMetals.filter((m) => resolveHtGuidanceTexts(m).length === 0);
    expect(miss.map((m) => `${m.name} [htg=${m.profiles?.htg ?? '-'}]`)).toEqual([]);
  });

  it('am_map 의 모든 매핑 대상 블록이 정의돼 있다', () => {
    const { am_map: map, blocks } = htGuidance as unknown as {
      am_map: { byHt: Record<string, string>; byHtg?: Record<string, string>; byMach: Record<string, string> };
      blocks: Record<string, unknown>;
    };
    const targets = [
      ...Object.values(map.byHt), ...Object.values(map.byHtg ?? {}), ...Object.values(map.byMach),
    ];
    expect(targets.filter((k) => !blocks[k])).toEqual([]);
  });

  it('byHtg 키는 실재하는 htg 블록이어야 한다 (오타 방지)', () => {
    const { am_map: map, blocks } = htGuidance as unknown as {
      am_map: { byHtg?: Record<string, string> }; blocks: Record<string, unknown>;
    };
    expect(Object.keys(map.byHtg ?? {}).filter((k) => !blocks[k])).toEqual([]);
  });

  /* D8 확장(2026-09-22) — 가족 폴백이 잘못 적용되던 5 군을 실제 entry 로 고정. 텍스트 앵커는 각 블록/grade 의
     첫 토큰(【…】·⚠ AM …)만 본다 — 문구 다듬기는 자유, 매핑이 바뀌면 실패. */
  const pick = (re: RegExp) => { const m = amMetals.find((x) => re.test(x.name)); expect(m, String(re)).toBeTruthy(); return m as Material; };
  it('CP-Ti AM → am-ti-cp (α 단상 — HIP·STA 처방인 am-ti-alloy 가 아니다)', () => {
    const t = resolveHtGuidanceTexts(pick(/^Ti CP Gr2 — As-built/))[0];
    expect(t).toMatch(/^⚠ AM CP-Ti/);
    expect(t).not.toMatch(/Solution treatment\(용체화\)\+Aging/);
  });
  it('Monel K-500 AM → am-k500 (γ′ 직접 시효 — 주조 γ′ 초합금의 HIP 1180°C 처방이 아니다)', () => {
    const t = resolveHtGuidanceTexts(pick(/^Monel K-500 — Heat-Treated/))[0];
    expect(t).toMatch(/^⚠ AM \(LPBF\) Monel K-500/);
    expect(t).toMatch(/595°C/);
    expect(t).not.toMatch(/HIP 1180/);
  });
  it('Al-Cu AM(A205/Al2139)·Al5X1 → am-al-advanced + grade 문구 (AlSi 의 "T6 무익" 이 붙지 않는다)', () => {
    const a = resolveHtGuidanceTexts(pick(/^A205 \(Al-Cu/))[0];
    expect(a).toMatch(/^⚠ AM 특수 Al/);
    expect(a).toMatch(/【A205/);
    expect(a).not.toMatch(/T6 만큼의 이득 없음/);
    const b = resolveHtGuidanceTexts(pick(/^Al5x1/))[0];
    expect(b).toMatch(/【Al5X1/);
  });
  it('Cu 계열 grade 문구 — CuNi30(고용체)·CuNi2SiCr(용체화+시효)·순 Cu(어닐)', () => {
    expect(resolveHtGuidanceTexts(pick(/^CuNi30 .*Heat-Treated/))[0]).toMatch(/【CuNi30】/);
    expect(resolveHtGuidanceTexts(pick(/^CuNi2SiCr — Solution Age/))[0]).toMatch(/【CuNi2SiCr】.*950°C/);
    expect(resolveHtGuidanceTexts(pick(/^Cu \(Pure\) — Heat-Treated/))[0]).toMatch(/【순 Cu】/);
  });
  it('254 SMO AM → am-316l + 254 SMO grade 문구(1180°C)', () => {
    expect(resolveHtGuidanceTexts(pick(/^AISI 254 SMO — As-built/))[0]).toMatch(/【254 SMO】.*1180°C/);
  });

  it('AM 재료의 첫 안내는 AM 전용 블록이다 (일반 HT 가 앞서지 않는다)', () => {
    /* resolveHtGuidanceTexts 는 amGuidanceKey 를 먼저 push 한다 — 그 계약을 고정. */
    const sample = amMetals.filter((m) => m.profiles?.htg).slice(0, 40);
    const bad = sample.filter((m) => !resolveHtGuidanceTexts(m)[0]?.startsWith('⚠ AM'));
    expect(bad.map((m) => m.name)).toEqual([]);
  });
});
