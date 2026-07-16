/*
 * R227/E14/H4f — 파이프라인 무결성 게이트.
 *
 * 배경: client/public 의 런타임 fetch 산출물(materials.json·wiki-index.json 등)은
 * gitignore 되어 있어 각 워크플로가 빌드 스텝으로 직접 재생성해야 한다. deploy-pages.yml
 * 에서 build:wiki 스텝이 누락되어 배포 사이트에서 wiki-index.json 이 404 → 재료
 * 자동링크·백링크 카드가 조용히 전멸한 실사고(H4f)의 재발 방지.
 *
 * useWikiRefs 는 로드 실패를 비치명적으로 삼키므로(설계 — behavior-additive),
 * 런타임에서는 이 회귀를 잡을 수 없다. 워크플로 텍스트를 직접 게이트한다.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

/** 워크플로별로 반드시 존재해야 하는 산출물 생성 스텝. */
const REQUIRED_STEPS: Record<string, string[]> = {
  // 배포는 사이트가 fetch 하는 모든 gitignored 산출물을 직접 재생성해야 한다.
  // H6 A-3: property-stats.json 도 동일 부류 (커밋본 5주 stale 서빙 실사고 → build:stats 필수).
  '.github/workflows/deploy-pages.yml': ['pnpm build:data', 'pnpm build:wiki', 'pnpm build:stats'],
  // CI 는 테스트·빌드 전에 동일 산출물이 준비되어야 한다.
  '.github/workflows/ci.yml': ['pnpm build:data', 'pnpm build:wiki', 'pnpm build:stats'],
};

describe('워크플로 산출물 스텝 무결성 (H4f — 배포 build:wiki 누락 재발 방지)', () => {
  for (const [file, steps] of Object.entries(REQUIRED_STEPS)) {
    it(`${file} 에 필수 빌드 스텝 존재`, () => {
      const yml = read(file);
      for (const step of steps) {
        expect(yml, `${file} 에 "${step}" 스텝이 없음 — 런타임 fetch 산출물이 배포에서 빠진다`).toContain(step);
      }
    });
  }

  it('deploy 는 build:data → build:wiki → vite build 순서 유지 (wiki 는 materials.json 을 읽음)', () => {
    const yml = read('.github/workflows/deploy-pages.yml');
    const iData = yml.indexOf('pnpm build:data');
    const iWiki = yml.indexOf('pnpm build:wiki');
    const iVite = yml.indexOf('vite build');
    expect(iData).toBeGreaterThan(-1);
    expect(iWiki).toBeGreaterThan(iData);
    expect(iVite).toBeGreaterThan(iWiki);
  });
});
