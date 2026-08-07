/*
 * H6 W3-3 (D8) — AM 후처리 가이드 커버리지 게이트.
 *
 * am_map 은 byHt(합금 특정) → byHtg(열처리 가족) → byMach(폴백) 3단으로 조회한다.
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

  it('AM 재료의 첫 안내는 AM 전용 블록이다 (일반 HT 가 앞서지 않는다)', () => {
    /* resolveHtGuidanceTexts 는 amGuidanceKey 를 먼저 push 한다 — 그 계약을 고정. */
    const sample = amMetals.filter((m) => m.profiles?.htg).slice(0, 40);
    const bad = sample.filter((m) => !resolveHtGuidanceTexts(m)[0]?.startsWith('⚠ AM'));
    expect(bad.map((m) => m.name)).toEqual([]);
  });
});
