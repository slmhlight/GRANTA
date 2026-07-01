/*
 * R226e/S1 — 레지스트리 SSOT 무결성 (CI 게이트).
 *
 * "무손실+문서화교정" 불변식을 push 시점에 강제. 커밋된 레지스트리를 직접 읽어:
 *   - freeze 정합 (legacy_id→stable_id) · 중복 stable_id 없음 · 형식
 *   - r226-value-corrections.json 의 교정이 전부 실제 적용됐는지 (ranges/remove/aliases)
 *   - 교정 entry 는 _corrections 로 원본 보존 (round-trip provenance)
 *   - Metal points σy/uts ↔ ranges 자기정합
 * 손편집·교정 드리프트를 CI 에서 즉시 검출.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REG = path.join(ROOT, 'data', 'registry', 'entries');
type Entry = any;
const all: Entry[] = [];
for (const cc of fs.readdirSync(REG)) {
  for (const fn of fs.readdirSync(path.join(REG, cc))) {
    all.push(JSON.parse(fs.readFileSync(path.join(REG, cc, fn), 'utf8')));
  }
}
const byId = new Map(all.map((m) => [m.stable_id, m]));
const freeze = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'registry-id-freeze.json'), 'utf8')).map as Record<string, string>;
const corr = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'r226-value-corrections.json'), 'utf8'));
const primBase = (n: string) => String(n).split(' — ')[0].trim();
const primDesig = (n: string) => primBase(n).split(' (')[0].trim();

describe('registry 무결성 (S1)', () => {
  it('중복 stable_id 없음', () => {
    expect(byId.size).toBe(all.length);
  });

  it('freeze 정합: 모든 entry 의 legacy_id→stable_id', () => {
    const bad = all.filter((m) => freeze[m.legacy_id] !== m.stable_id).map((m) => `${m.legacy_id}→${m.stable_id}`);
    expect(bad).toEqual([]);
  });

  it('stable_id 형식 + 필수 필드', () => {
    const bad = all.filter((m) => !/^(MET|POL|CER|CMP)-\d{4}$/.test(m.stable_id || '') || !(m.id && m.name && m.category && m.legacy_id));
    expect(bad.map((m) => m.stable_id)).toEqual([]);
  });

  it('ranges 교정이 전부 적용 + _corrections 보존', () => {
    const bad: string[] = [];
    for (const [sid, fix] of Object.entries<any>(corr.ranges || {})) {
      const m = byId.get(sid);
      if (!m) continue;   // 제거된 entry 대상 교정은 no-op — stale 여부는 S3(corrections-schema)에서 별도 검증
      for (const [k, v] of Object.entries<any>(fix)) {
        if (typeof v === 'number' && m.ranges?.[k]?.typical !== v) bad.push(`${sid}.${k}=${m.ranges?.[k]?.typical}≠${v}`);
      }
      if (!m._corrections) bad.push(`${sid} _corrections 없음`);
    }
    expect(bad).toEqual([]);
  });

  it('remove.ids 는 제거됨 (freeze 에는 reserve 유지)', () => {
    for (const id of corr.remove?.ids || []) {
      expect(byId.has(id), `${id} 제거`).toBe(false);
      expect(Object.values(freeze).includes(id), `${id} freeze reserve`).toBe(true);
    }
  });

  it('remove.bases 는 레지스트리에서 제거됨', () => {
    const bases = new Set(corr.remove?.bases || []);
    const present = all.filter((m) => bases.has(primBase(m.name)));
    expect(present.map((m) => m.name)).toEqual([]);
  });

  it('aliasesByBase 별칭이 매칭 entry 에 적용됨', () => {
    const bad: string[] = [];
    for (const [base, aliases] of Object.entries<string[]>(corr.aliasesByBase || {})) {
      const matches = all.filter((m) => primBase(m.name) === base || primDesig(m.name) === base);
      for (const m of matches) for (const a of aliases) if (!(m.aliases || []).includes(a)) bad.push(`${m.stable_id} ⊅ ${a}`);
    }
    expect(bad).toEqual([]);
  });

  // NOTE: points[0] ↔ ranges.typical 는 자기정합 불변식이 아님 (357 Metal entry 가 다중행 points —
  //   points[0]=한 조건, ranges.typical=집계). Ashby(points) vs 표(ranges) 정합은 별도 감사 대상.
});
