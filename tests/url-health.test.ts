/*
 * AUD F11 잔여 (2026-09-22) — 출처 링크 접근 상태 원장 게이트.
 *
 * `verified`(내용을 사람이 대조했는가)와 `link_status`(지금 그 주소가 응답하는가)는 다른 축이다. 추적보고서는 54 개 URL 이
 * 두 번 연속 404 인데 전부 미검증 출처라 검증기가 보지도 않았고, 13 재료는 verified=true 인 채 404 였다고 적었다.
 * 이제 `pnpm verify:urls --all` 이 전 출처를 검사해 data/url-health.json 에 남기고, build:data 가 각 출처에 link_status 를 찍는다.
 * 이 게이트: 원장이 'dead'(404/410) 라고 기록한 주소는 산출물에 남아 있으면 안 된다 — 교체(r208 맵·상류 교정)하거나 원장을 갱신해야 한다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Material, MaterialSource } from '@/lib/materials';

const ROOT = process.cwd();
const ALL: Material[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'client/public/materials.json'), 'utf8'));
const health = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/url-health.json'), 'utf8')) as { checked_at: string; results: Record<string, { status: string; code: number | null; checked_at: string }> };
const src = (m: Material) => (m.sources || []) as MaterialSource[];

describe('출처 링크 접근 상태 (F11 잔여)', () => {
  it('원장이 있고 날짜와 결과를 갖는다', () => {
    expect(/^\d{4}-\d{2}-\d{2}$/.test(health.checked_at)).toBe(true);
    expect(Object.keys(health.results).length).toBeGreaterThan(500);
  });

  it("원장이 dead(404/410) 로 기록한 주소는 산출물 출처에 남지 않는다 — 교체하거나 원장을 갱신할 것", () => {
    const dead = new Set(Object.entries(health.results).filter(([, v]) => v.status === 'dead').map(([k]) => k));
    const bad: string[] = [];
    for (const m of ALL) for (const s of src(m)) if (s.url && dead.has(s.url)) bad.push(`${m.id} ${m.name}: ${s.url}`);
    expect(bad.slice(0, 15), `dead 원장 주소 잔존 ${bad.length}건`).toEqual([]);
  });

  it('build:data 가 모든 URL 출처에 link_status 를 찍는다 (원장 밖 주소는 unchecked)', () => {
    const missing = ALL.flatMap((m) => src(m).filter((s) => s.url && !s.link_status).map((s) => `${m.id}: ${s.url}`));
    expect(missing.slice(0, 5)).toEqual([]);
    const stamped = ALL.flatMap((m) => src(m).filter((s) => s.url && s.link_status && s.link_status !== 'unchecked'));
    expect(stamped.length).toBeGreaterThan(1000);
  });

  it("추적보고서 54 dead 의 대표 주소(ASTM B637-22·ASM EMH Vol.4·ASME bpvc-ii-materials)가 산출물에 없다", () => {
    const gone = [
      'https://store.astm.org/b0637-22.html',
      'https://www.asminternational.org/engineered-materials-handbook-volume-4-ceramics-and-glasses',
      'https://www.asme.org/codes-standards/find-codes-standards/bpvc-ii-materials',
      'https://www.iss.it/',
    ];
    const urls = new Set(ALL.flatMap((m) => src(m).map((s) => s.url)));
    for (const u of gone) expect(urls.has(u), u).toBe(false);
  });
});
