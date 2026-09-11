/*
 * 용어사전 감사 3종 상설화 (H6 마감 2026-09-11).
 *
 * 배경: 감사 3종 중 family-coverage·terminology 만 게이트가 있었고, **wiki-coverage 의
 * absent·미정의는 리포트 전용**이었다. 그래서 콘텐츠가 늘 때마다 조용히 다시 쌓였다 —
 * H4i 에서 0 을 찍어 놓고도 이번 점검에서 absent 5 · 미정의 31 이 되어 있었다.
 * "게이트 없는 지표는 낡는다" 를 이 저장소에서 다시 확인한 셈이라, 0 을 만든 김에 고정한다.
 *
 * 판정 방식(H4i 확립): 목표는 기계적인 0 이 아니라 **전건 판정**이다.
 *   · 개념이면 → 용어를 만들거나(dendrite) 기존 용어가 흡수(surface_form)
 *   · 개념이 아니면 → 필터(EN_STOP/NON_MATERIAL)에 사유와 함께
 *   · 개념이지만 그 문서에서 설명이 끝나고 그 문서 전용이면 → 보류 기록(DOCUMENTED_*)
 * 보류·필터는 "쓰이지 않으면 지운다" — 사문화 수도 함께 본다(A13·D4 와 같은 규율).
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const run = (script: string, env: Record<string, string> = {}) =>
  execSync(`node scripts/${script}.mjs`, { cwd: ROOT, encoding: 'utf8', timeout: 180_000, env: { ...process.env, ...env } });

const coverage = run('audit-wiki-coverage', { FILTER_AUDIT: '1' });
const terminology = run('audit-terminology');
const family = run('audit-family-coverage');

describe('용어사전 감사 — 연결 완전성', () => {
  const m = coverage.match(/absent (\d+) · 미정의용어 (\d+)/);

  it('감사가 실제로 수치를 내놓는다', () => {
    expect(m, `출력 형식이 바뀌었다:\n${coverage.slice(-500)}`).toBeTruthy();
  });

  it('진짜 부재 0 — 언급한 재료는 DB 에 있거나 판정이 기록돼 있다', () => {
    const absent = Number(m![1]);
    const lines = coverage.split('\n').filter((l) => l.startsWith('absent 상위:')).join('');
    expect(absent, `absent ${absent}건 — ${lines}\n  DB entry 를 추가하거나, 재료가 아니면 audit-wiki-coverage 의 `
      + `NON_MATERIAL/DOCUMENTED_ABSENT 에 **사유와 함께** 등재할 것.`).toBe(0);
  });

  it('미정의 용어 0 — 본문이 소개한 전문어는 정의되거나 판정이 기록돼 있다', () => {
    const undef = Number(m![2]);
    const lines = coverage.split('\n').filter((l) => l.startsWith('용어 상위:')).join('');
    expect(undef, `미정의 ${undef}건 — ${lines}\n  글로서리 용어를 만들거나, 기존 용어의 surface_forms 로 흡수하거나, `
      + `그 문서에서 설명이 끝나면 DOCUMENTED_UNDEFINED 에 사유와 함께 등재할 것.`).toBe(0);
  });
});

describe('용어사전 감사 — 용어 일관·계열 커버리지', () => {
  it('정규화 오역 0 (§3.1 열처리 용어 대응표)', () => {
    const t = terminology.match(/정규화 오역 (\d+) 건/);
    expect(t, `출력 형식이 바뀌었다:\n${terminology.slice(-300)}`).toBeTruthy();
    expect(Number(t![1]), '오역 발생 — docs/audits/terminology.md 확인').toBe(0);
  });

  it('미커버 subcategory 0 (DB 계열 전부 용어 페이지에 연결)', () => {
    const f = family.match(/미커버 subcat (\d+)/);
    expect(f, `출력 형식이 바뀌었다:\n${family.slice(-300)}`).toBeTruthy();
    expect(Number(f![1]), '새 subcategory 가 계열 용어에 안 붙었다 — SUBCAT_TO_SLUG 매핑 추가').toBe(0);
  });
});

describe('용어사전 감사 — 보류·필터가 낡지 않는다', () => {
  /* 보류와 필터는 "지금은 이렇게 판정한다" 는 기록이다. 대상이 사라졌는데 기록만 남으면
     다음 사람이 "여긴 이미 판정된 곳" 으로 오해한다 — A13(위키 엔티티)·D4(REVIEWED)와 같은 부류. */
  it('용어화 보류에 사문화 항목이 없다', () => {
    const d = coverage.match(/DU_AUDIT: 용어화 보류 (\d+) · 사문화 (\d+)(?: — (.*))?/);
    expect(d, `DU_AUDIT 줄이 없다 — 보류 계측이 빠졌는지 확인:\n${coverage.slice(-400)}`).toBeTruthy();
    expect(Number(d![1]), '보류 항목이 0 이면 계측이 의미 없다').toBeGreaterThan(0);
    expect(Number(d![2]), `발화하지 않는 보류 ${d![2]}건: ${d![3] ?? ''} — 대상이 사라졌으면 지울 것`).toBe(0);
  });

  it('필터 계측이 돌고 있다 (과차단·사문화를 볼 수 있는 상태)', () => {
    expect(coverage, 'FILTER_AUDIT 출력이 없다 — 필터 계측이 꺼졌다').toMatch(/FILTER_AUDIT: STOP 사문화/);
  });
});
