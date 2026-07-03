/*
 * R226p Phase 1 — name-regex override → stable_id 이관 게이트.
 * (1) 라이브 build-materials 에 regex namePattern 매칭 없음, (2) 3 override 파일이 stableIds 사용,
 * (3) 모든 stableId 가 레지스트리에 실재(stale/오타 ID 차단 — corrections-schema 와 동형 견고성).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const regIds = new Set<string>();
const REG = path.join(ROOT, 'data', 'registry', 'entries');
for (const cc of fs.readdirSync(REG)) for (const fn of fs.readdirSync(path.join(REG, cc))) regIds.add(fn.replace(/\.json$/, ''));

const FILES: Array<[string, string]> = [
  ['data/r199-stainless-overrides.json', 'overrides'],
  ['data/r199-source-urls.json', 'mappings'],
  ['data/r205-reliability-overrides.json', 'overrides'],
];

describe('R226p — override name-regex → stable_id', () => {
  it('build-materials 라이브 경로에 new RegExp(namePattern) 매칭 없음', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'build-materials.mjs'), 'utf8');
    expect(src.match(/new RegExp\((?:ov|map)\.namePattern\)/g) || []).toEqual([]);
  });

  for (const [rel, key] of FILES) {
    it(`${rel} — 항목이 stableIds 사용 + 모든 ID 실재`, () => {
      const doc = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
      const arr = doc[key] || [];
      const noNamePattern = arr.filter((o: any) => o.namePattern);   // 활성 namePattern 필드 잔존 금지
      expect(noNamePattern).toEqual([]);
      const stale: string[] = [];
      for (const o of arr) for (const sid of (o.stableIds || [])) if (!regIds.has(sid)) stale.push(sid);
      expect(stale).toEqual([]);
    });
  }
});
