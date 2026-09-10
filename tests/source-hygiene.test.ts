/*
 * 소스에 제어문자가 섞이는 것을 막는다.
 *
 * 왜 필요한가: 이 저장소의 파일은 스크립트로 자주 고쳐 쓴다. 그 과정에서 셸 heredoc 을
 * 거치면 역슬래시가 한 겹 벗겨져 정규식의 \b 가 **백스페이스(U+0008)** 로, \n 이 실제
 * 줄바꿈으로 바뀐다. 결과는 조용하다 — 파일은 잘 파싱되고, 정규식은 "거의" 맞게 동작하며,
 * 테스트가 통과해 버리기도 한다(2026-09-11 작업에서 네 번 밟았다: 게이트 전건 실패 ·
 * 정규식이 0건 매칭 · esbuild 파싱 실패 · 매칭 조건 오작동).
 *
 * 화면에도 안 보이고 diff 에서도 티가 안 나므로, 기계가 보게 한다.
 *
 * 판정은 정규식이 아니라 **코드포인트**로 한다 — 제어문자를 찾는 검사를 제어문자가 든
 * 정규식 리터럴로 쓰면, 이 파일 자신이 검사에 걸린다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIRS = ['client/src', 'tests', 'scripts', 'server'];
const EXT = /\.(ts|tsx|mjs|js|json|css)$/;

/** 허용: 탭(9) · LF(10) · CR(13). 나머지 C0 제어문자와 DEL(127) 은 소스에 있을 이유가 없다. */
function isControl(code: number): boolean {
  if (code === 9 || code === 10 || code === 13) return false;
  return code < 32 || code === 127;
}

function walk(dir: string, out: string[] = []): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'assets') continue;
      walk(rel, out);
    } else if (EXT.test(e.name)) out.push(rel);
  }
  return out;
}

describe('소스 위생 — 제어문자', () => {
  const files = DIRS.flatMap((d) => walk(d));

  it('검사 대상이 실제로 모였다', () => {
    expect(files.length, '스캔한 파일이 0 — 경로 규칙이 깨졌다').toBeGreaterThan(100);
  });

  it('소스·데이터에 제어문자가 없다 (heredoc 이 삼킨 역슬래시 검출)', () => {
    const bad: string[] = [];
    for (const f of files) {
      const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
      let found = 0;
      for (let i = 0; i < s.length && found < 3; i++) {
        const code = s.charCodeAt(i);
        if (!isControl(code)) continue;
        found++;
        const line = s.slice(0, i).split('\n').length;
        const ctx = s.slice(Math.max(i - 40, 0), i + 20).replace(/\n/g, '⏎');
        bad.push(`${f}:${line} U+${code.toString(16).padStart(4, '0')} … ${ctx}`);
      }
    }
    expect(
      bad,
      `제어문자 ${bad.length}건 — 정규식의 백슬래시-b 가 백스페이스로 바뀐 사고가 대표적이다.\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });
});
