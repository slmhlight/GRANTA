/*
 * R226f/축2b — audit:registry 상설화 (CI 게이트).
 * 물리 불가능 값·공정상태 SOFT↔HARD 교차충돌(HT 라벨 ↔ 값 상태 정합) 등 12종 검사를
 * push 시점에 강제. 이전엔 수동 실행 전용이라 회귀가 조용히 쌓일 수 있었음.
 *
 * D4(2026-09-11) — "CI 에 별도 단계를 둘까" 를 검토한 결과 **래퍼로 충분**하다.
 * 이 래퍼가 스크립트를 그대로 실행하고(execSync), CI 는 `pnpm test:cov` 로 전 테스트를
 * 돌리므로 별도 단계는 같은 일을 두 번 하는 것이다. 대신 검토 중 드러난 진짜 구멍을 막았다:
 *
 *   실패했을 때 "오류 N건 — audit-report.md 확인" 만 말했다. 그런데 그 리포트는
 *   .gitignore 대상이라 **CI 로그에는 없다** — 어느 재료의 어느 검사인지 알려면 로컬에서
 *   재현해야 했다. 그래서 실패 시 항목별 건수와 실제 위반 줄을 메시지에 실어 보낸다.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function runAudit(): { code: number; out: string } {
  try {
    return { code: 0, out: execSync('node scripts/audit-registry.mjs', { cwd: ROOT, encoding: 'utf8', timeout: 120_000 }) };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

/** 리포트에서 건수가 0 이 아닌 섹션의 위반 줄을 뽑는다 (CI 로그에 실어 보내기 위함). */
function offendingLines(limit = 12): string[] {
  const p = path.join(ROOT, 'data/registry/audit-report.md');
  if (!fs.existsSync(p)) return ['(리포트 파일 없음)'];
  const out: string[] = [];
  let live = false;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const head = line.match(/^## \[([^\]]+)\].*— (\d+)건/);
    if (head) { live = head[1] !== 'I2_reviewed' && Number(head[2]) > 0; if (live) out.push(line.replace(/^## /, '')); continue; }
    if (live && line.startsWith('- ') && out.length < limit) out.push('  ' + line);
  }
  return out.length ? out : ['(리포트에 위반 섹션 없음 — 스크립트 출력 형식이 바뀌었는지 확인)'];
}

const audit = runAudit();

describe('audit:registry 게이트 (축2b)', () => {
  it('레지스트리 감사 오류 0 (HT↔값 교차충돌 포함)', () => {
    const m = audit.out.match(/총 오류: (\d+) 건/);
    expect(m, `스크립트 출력에서 '총 오류' 줄을 못 찾았다 — 출력 형식이 바뀌었는지 확인:\n${audit.out.slice(-600)}`).toBeTruthy();
    const total = Number(m![1]);
    expect(total, `감사 오류 ${total}건 — 리포트는 .gitignore 라 CI 로그에 없으므로 여기 옮겨 적는다:\n${offendingLines().join('\n')}`).toBe(0);
    expect(audit.code, '오류 0 인데 스크립트가 non-zero 로 끝났다').toBe(0);
  });

  it('죽은 REVIEWED 예외가 없다 — 필요 없어진 예외는 지운다', () => {
    /* REVIEWED 는 "값은 정상이고 라벨만 아티팩트" 인 SOFT≡HARD 충돌을 눌러 두는 허용목록이다.
       값을 고쳐 충돌이 사라지면 예외도 같이 지워야 하는데, 안 지우면 다음 사람이 "여긴 원래
       예외 처리된 곳" 으로 오해한다. A13 에서 낡은 하드코딩 제외 때문에 재료 2종이 위키에서
       통째로 빠졌던 것과 같은 부류다.
       실제로 이 게이트를 켜자마자 'AISI 1020' 이 죽은 키로 잡혔다 — D9 에서 1020 소둔값을
       ASM 표로 교정하며 충돌이 사라진 뒤에도 예외만 남아 있었다. */
    const m = audit.out.match(/죽은 REVIEWED 키: (\d+) 건(?: — (.*))?/);
    expect(m, `'죽은 REVIEWED 키' 줄을 못 찾았다 — 스크립트가 더 이상 보고하지 않는다:\n${audit.out.slice(-400)}`).toBeTruthy();
    expect(
      Number(m![1]),
      `발화하지 않는 REVIEWED 예외 ${m![1]}건: ${m![2] ?? ''}\n  충돌이 해소됐다면 scripts/audit-registry.mjs 의 REVIEWED 에서 해당 키를 지울 것.`,
    ).toBe(0);
  });
});
