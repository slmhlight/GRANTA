/*
 * F2 — UI 의 `any` 가 **무엇을 가리는지**를 고정한다.
 *
 * 개수 상한은 약한 게이트다(숫자가 임의적이고, 다른 곳에 새 any 가 생겨도 총합만 맞으면 통과).
 * 대신 **남아 있는 이유**를 검사한다: Plotly 는 타입 정의가 부실해 trace·layout·이벤트에
 * any 가 불가피하지만, 우리 도메인 타입(Material·FilterState)을 any 로 읽는 것은 다르다 —
 * 그건 스키마가 바뀌어도 컴파일이 조용히 통과하는 구멍이고, 이번에 걷어낸 것이 그 부류다
 * (AshbyChartPlotly 의 `(m: any)` 12곳 · FilterSidebar 의 실재 필드에 걸린 캐스트 2곳).
 *
 * 그래서 규칙은 하나다: **이 파일들의 any 는 Plotly 표면에서만 허용한다.**
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** Plotly 표면 — 라이브러리 타입이 못 미치는 자리. */
const PLOTLY_OK = [
  /\b(shapes|envelopeTraces|indexTraces|guideAnnotations|paretoTraces|contextTrace|markerTraces|selTrace|selMarker)\s*:\s*any\[\]/,
  /\blayout\s*:\s*any\b/,
  /\bon(Click|Selected|Relayout|Hover|Unhover|DoubleClick)\s*[:={]+\s*\(e:\s*any\)/,
  /\(p:\s*any\)\s*=>/,          // plotly point 객체
  /\}\s*as any\)\}/,            // <Plot {...(props as any)} />
  /\(v:\s*unknown\)/,           // 이미 좁힌 것 — 통과용
];

/** 도메인 타입을 가리면 안 되는 이름들 — 이 단어 옆의 any 는 즉시 실패. */
const DOMAIN = /\b(m|material|materials|filters|updateFilter|ranges|sources)\b[^\n]{0,24}\bany\b/;

const FILES = ['client/src/components/AshbyChartPlotly.tsx', 'client/src/components/FilterSidebar.tsx'];

describe('F2 — UI any 의 적용 범위', () => {
  const scan = (f: string) => {
    /* 주석은 지우고 본다 — 이 파일들의 설명문이 `m: any` 를 인용한다. 줄 단위로 거르면
       블록 주석의 **중간 줄**(별표로 시작하지 않는 줄)이 새어 실제로 한 번 새 버렸다.
       그래서 지우되 줄 번호는 보존하도록 개행만 남긴다. */
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/\/\/.*/g, '');
    return src.split('\n').map((line, i) => ({ n: i + 1, line }))
      .filter(({ line }) => /\bas any\b|:\s*any\b|<any>|any\[\]/.test(line));
  };

  it('검사 대상이 실제로 모였다', () => {
    const total = FILES.reduce((s, f) => s + scan(f).length, 0);
    expect(total, 'any 가 0 이면 이 게이트가 의미 없다 — 파일 경로나 패턴이 깨졌는지 확인').toBeGreaterThan(0);
  });

  it('도메인 타입(Material·FilterState)을 any 로 읽지 않는다', () => {
    const bad: string[] = [];
    for (const f of FILES) for (const { n, line } of scan(f)) {
      if (DOMAIN.test(line) && !PLOTLY_OK.some((re) => re.test(line))) bad.push(`${f}:${n}  ${line.trim().slice(0, 96)}`);
    }
    expect(
      bad,
      `도메인 타입을 any 로 읽는 곳 ${bad.length}건 — 스키마가 바뀌어도 컴파일이 통과한다:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });

  it('남은 any 는 전부 Plotly 표면이다', () => {
    const bad: string[] = [];
    for (const f of FILES) for (const { n, line } of scan(f)) {
      if (!PLOTLY_OK.some((re) => re.test(line))) bad.push(`${f}:${n}  ${line.trim().slice(0, 96)}`);
    }
    expect(
      bad,
      `Plotly 가 아닌 any ${bad.length}건 — 타입을 붙이거나, 불가피하면 PLOTLY_OK 에 사유와 함께 추가할 것:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });
});
