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

// 복수 stableIds (구 regex namePattern) 파일
const FILES: Array<[string, string]> = [
  ['data/r199-stainless-overrides.json', 'overrides'],
  ['data/r199-source-urls.json', 'mappings'],
  ['data/r205-reliability-overrides.json', 'overrides'],
];
// 단수 stableId (구 exact-name) 파일 — R226p Phase 2
const SINGLE_FILES: Array<[string, string]> = [
  ['data/r173-range-overrides.json', 'overrides'],
  ['data/r214-fatigue-overrides.json', 'overrides'],
];

describe('R226p — override name-regex → stable_id', () => {
  it('build-materials 라이브 경로에 new RegExp(namePattern) / exact-name find 매칭 없음', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'build-materials.mjs'), 'utf8');
    expect(src.match(/new RegExp\((?:ov|map)\.namePattern\)/g) || []).toEqual([]);
    // R173-range·R214 의 구 exact-name 매칭도 제거됨 (stable_id 매칭으로 대체)
    expect(src.match(/all\.find\(m => m\.name === ov\.name\)/g) || []).toEqual([]);
    expect(src.match(/byName\.get\(ov\.name\)/g) || []).toEqual([]);
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

  for (const [rel, key] of SINGLE_FILES) {
    it(`${rel} — 단수 stableId 실재 (부여된 것만; 미부여=no-op 허용)`, () => {
      const doc = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
      const stale = (doc[key] || []).filter((o: any) => o.stableId && !regIds.has(o.stableId)).map((o: any) => o.stableId);
      expect(stale).toEqual([]);
    });
  }
});
