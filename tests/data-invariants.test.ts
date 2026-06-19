/*
 * R210 B2 — 빌드 산출물 불변식 테스트.
 * CI 가 매 run 마다 `pnpm build:data` 로 client/public/materials.json 을 재생성하지만
 * 그 산출물을 검증하는 테스트가 없었다 (카테고리 누락·필수필드 결손·min>max·doc drift 가 조용히 통과).
 * 정확한 개수 toBe 하드코딩은 데이터 갱신마다 false-fail 을 내므로 금지 — 범위·불변식·SSOT 일치만 검증.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.resolve(__dirname, '..', 'client', 'public');

const load = (f: string) => JSON.parse(readFileSync(path.join(pub, f), 'utf8'));
const materials: any[] = load('materials.json');
const buildMeta: any = load('build-meta.json');

const CATEGORIES = ['Metal', 'Polymer', 'Ceramic', 'Composite'];

describe('데이터 산출물 불변식 (materials.json)', () => {
  it('총 개수가 합리적 범위 안 (1000~1500)', () => {
    expect(materials.length).toBeGreaterThanOrEqual(1000);
    expect(materials.length).toBeLessThanOrEqual(1500);
  });

  it('모든 항목이 id·name·category·subcategory 를 가진다', () => {
    const missing = materials.filter((m) => !m.id || !m.name || !m.category || !m.subcategory);
    expect(missing.map((m) => m.id || m.name)).toEqual([]);
  });

  it('id 가 유니크하다', () => {
    const ids = materials.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('category 가 허용 집합에 속한다', () => {
    const bad = [...new Set(materials.map((m) => m.category))].filter((c) => !CATEGORIES.includes(c));
    expect(bad).toEqual([]);
  });

  it('모든 range 가 min ≤ typical ≤ max 를 만족한다', () => {
    const violations: string[] = [];
    for (const m of materials) {
      const ranges = m.ranges || {};
      for (const [key, r] of Object.entries<any>(ranges)) {
        if (!r || typeof r !== 'object') continue;
        const { min, max, typical } = r;
        if (typeof min === 'number' && typeof max === 'number' && min > max) {
          violations.push(`${m.id}.${key}: min ${min} > max ${max}`);
        }
        if (typeof typical === 'number' && typeof min === 'number' && typical < min) {
          violations.push(`${m.id}.${key}: typical ${typical} < min ${min}`);
        }
        if (typeof typical === 'number' && typeof max === 'number' && typical > max) {
          violations.push(`${m.id}.${key}: typical ${typical} > max ${max}`);
        }
      }
    }
    expect(violations.slice(0, 20)).toEqual([]);
  });
});

describe('build-meta.json SSOT 일치 (doc-drift 게이트)', () => {
  it('totalAlloys 가 실제 materials.json 길이와 일치한다', () => {
    expect(buildMeta.totalAlloys).toBe(materials.length);
  });

  it('byCategory 합이 totalAlloys 와 일치한다', () => {
    const sum = CATEGORIES.reduce((acc, c) => acc + (buildMeta.byCategory?.[c] ?? 0), 0);
    expect(sum).toBe(buildMeta.totalAlloys);
  });

  it('byCategory 카운트가 실제 분포와 일치한다', () => {
    for (const c of CATEGORIES) {
      const actual = materials.filter((m) => m.category === c).length;
      expect(buildMeta.byCategory?.[c]).toBe(actual);
    }
  });

  it('high-severity anomaly 가 0 이다 (빌드 게이트 불변식)', () => {
    // build-materials.mjs 가 high>0 이면 exit(1) 하므로 산출물에는 항상 0 이어야 한다.
    expect(buildMeta.anomaliesBySeverity?.high ?? 0).toBe(0);
  });
});
