/*
 * R226f/축2b — audit:registry 상설화 (CI 게이트).
 * 물리 불가능 값·공정상태 SOFT↔HARD 교차충돌(HT 라벨 ↔ 값 상태 정합) 등 12종 검사를
 * push 시점에 강제. 이전엔 수동 실행 전용이라 회귀가 조용히 쌓일 수 있었음.
 * (스크립트가 오류>0 이면 exit 1 — execSync 가 throw.)
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('audit:registry 게이트 (축2b)', () => {
  it('레지스트리 감사 오류 0 (HT↔값 교차충돌 포함)', () => {
    const out = execSync('node scripts/audit-registry.mjs', { cwd: process.cwd(), encoding: 'utf8', timeout: 120_000 });
    expect(out).toMatch(/총 오류: 0 건/);
  });
});
