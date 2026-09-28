/*
 * 2026-09-28 — URL 검사기 자체의 회귀 게이트 (네트워크 없음).
 *
 * 배경: 주간 워크플로(.github/workflows/url-health.yml)가 2026-06-08 부터 16주 동안 매주
 * "URL health check failed — failure persists" 를 이슈 #1 에 달았다. 링크가 죽어서가 아니었다 —
 * verify-guide-links.mjs 의 마지막 임계 판정이 `results.dead.length`(results 는 배열)를 읽다가
 * **TypeError 로 죽어** 링크 상태와 무관하게 exit 1 이었다(a965dce, 2026-06-07 유입).
 * 검사기가 죽으면 "링크가 죽었다" 와 구별이 안 되므로, 이 테스트가 두 검사기를 `--max 0` 으로
 * 돌려 보고서 작성·임계 판정까지의 꼬리 경로가 **예외 없이 exit 0** 으로 끝나는지 본다.
 * (0 개를 검사하니 네트워크를 쓰지 않는다. 데이터시트 검사기는 `--no-ledger` 로 커밋 대상 원장을 건드리지 않는다.)
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function run(script: string, extra: string[]): { code: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [path.join('scripts', script), '--max', '0', '--fail-threshold', '0', ...extra], {
      cwd: ROOT, encoding: 'utf8', timeout: 60_000,
    });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

describe('URL 검사기 스모크 (--max 0, 네트워크 없음)', () => {
  it('가이드 링크 검사기가 보고서·임계 판정 경로를 끝까지 통과한다', () => {
    const r = run('verify-guide-links.mjs', []);
    expect(r.out, '검사기 출력').not.toMatch(/TypeError|ReferenceError|SyntaxError/);
    expect(r.code, `exit ${r.code}\n${r.out.slice(-800)}`).toBe(0);
    expect(r.out).toMatch(/Report:/);
  });

  it('데이터시트 검사기가 보고서·임계 판정 경로를 끝까지 통과한다 (원장 미기록)', () => {
    const ledger = path.join(ROOT, 'data', 'url-health.json');
    const before = fs.readFileSync(ledger, 'utf8');
    const r = run('verify-datasheet-urls.mjs', ['--no-ledger']);
    expect(r.out, '검사기 출력').not.toMatch(/TypeError|ReferenceError|SyntaxError/);
    expect(r.code, `exit ${r.code}\n${r.out.slice(-800)}`).toBe(0);
    expect(r.out).toMatch(/Report written/);
    expect(fs.readFileSync(ledger, 'utf8'), '--no-ledger 인데 원장이 바뀌었다').toBe(before);
  });
});
