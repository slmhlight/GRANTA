/*
 * F2 — UI 의 `any` 가 **무엇을 가리는지**를 고정한다.
 *
 * 개수 상한은 약한 게이트다(숫자가 임의적이고, 다른 곳에 새 any 가 생겨도 총합만 맞으면 통과).
 * 대신 **남아 있는 이유**를 검사한다: 라이브러리 타입이 못 미치는 자리(Plotly trace·layout,
 * recharts formatter, 벤더링한 shadcn 컴포넌트)는 불가피하지만, 우리 도메인 타입을 any 로
 * 읽는 것은 다르다 — 그건 스키마가 바뀌어도 컴파일이 조용히 통과하는 구멍이다.
 *
 * 처음엔 AshbyChartPlotly·FilterSidebar 두 파일만 봤는데, 열어 보니 같은 부류가 곳곳에 있었고
 * **절반은 실제 결함을 가리고 있었다**:
 *   · `(comp as any)[el]` — 조성 딕셔너리에 원소가 아닌 키(CE·Coating)가 섞여 있어
 *     balance 역산이 오염돼 있었다(도금강판 Fe 7–97%)
 *   · `(f as any).default` — ConfigField 는 전 멤버가 default 를 가진 판별 유니온이라 불필요했고,
 *     캐스트를 걷어내자 값 타입이 상태보다 좁게 선언된 자리가 드러났다
 *   · `Record<string, …>` + `as any` 로 돌던 FilterState 키 순회 — 필드가 늘어도 아무 말이 없었다
 *     (실제로 manufacturers·compositions 가 URL 공유에서 빠져 있었다)
 *   · `e.target.value as any` — <select> 선택지와 상태 유니온이 어긋나도 통과
 *
 * 그래서 규칙은 하나다: **client 전체에서 any 는 아래 목록의 사유가 있을 때만 허용한다.**
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'client', 'src');

/** 라이브러리 표면 — 타입 정의가 못 미치는 자리. 새로 추가할 땐 **사유와 함께**. */
const LIB_OK: { re: RegExp; why: string }[] = [
  { re: /\b(shapes|envelopeTraces|indexTraces|guideAnnotations|paretoTraces|contextTrace|markerTraces|selTrace|selMarker)\s*:\s*any\[\]/, why: 'Plotly trace 배열' },
  { re: /\blayout\s*:\s*any\b/, why: 'Plotly layout' },
  { re: /\bon(Click|Selected|Relayout|Hover|Unhover|DoubleClick)\s*[:={]+\s*\(e:\s*any\)/, why: 'Plotly 이벤트' },
  { re: /\(p:\s*any\)\s*=>/, why: 'Plotly point 객체' },
  { re: /\}\s*as any\)\}/, why: '<Plot {...(props as any)} />' },
  { re: /\b(formatter|labelFormatter)=\{\(\(/, why: 'recharts formatter — 시그니처가 값 타입을 안 실어 준다' },
  { re: /\(v:\s*unknown\)/, why: '이미 좁힌 것 — 통과용' },
];

/** 파일 단위 예외 — 사유를 남긴다. 0 건이 되면 "검사 대상" 테스트가 알려 준다. */
const FILE_OK = new Map<string, string>([
  ['client/src/hooks/usePersistFn.ts', '임의 함수를 감싸는 제네릭 제약(noop) — 인자 타입을 알 수 없는 것이 이 훅의 정의다'],
]);

/** 벤더링한 shadcn/ui 원본 — 우리가 쓴 코드가 아니다. */
const VENDOR = /^client\/src\/components\/ui\//;

/** 도메인 타입을 가리면 안 되는 이름들 — 이 단어 옆의 any 는 즉시 실패. */
const DOMAIN = /\b(m|material|materials|comp|composition|filters|updateFilter|ranges|sources|values|weights)\b[^\n]{0,24}\bany\b/;

const walk = (d: string, acc: string[] = []): string[] => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
};

/* 주석은 지우고 본다 — 이 파일들의 설명문이 `m: any` 를 인용한다. 줄 단위로 거르면 블록
   주석의 **중간 줄**(별표로 시작하지 않는 줄)이 새어 실제로 한 번 새 버렸다. 그래서 지우되
   줄 번호는 보존하도록 공백만 남긴다. */
const scan = (rel: string) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*/g, '');
  return src.split('\n').map((line, i) => ({ n: i + 1, line }))
    .filter(({ line }) => /\bas any\b|:\s*any\b|<any>|any\[\]/.test(line));
};

const FILES = walk(SRC)
  .map((p) => path.relative(ROOT, p).replace(/\\/g, '/'))
  .filter((p) => !VENDOR.test(p) && !FILE_OK.has(p));

describe('F2 — UI any 의 적용 범위', () => {
  it('검사 대상이 실제로 모였다', () => {
    expect(FILES.length, '스캔 파일이 0 이면 게이트가 무의미하다 — 경로 확인').toBeGreaterThan(50);
    const total = FILES.reduce((s, f) => s + scan(f).length, 0);
    expect(total, 'any 가 0 이면 라이브러리 예외 목록이 사문화된 것 — 목록과 이 게이트를 함께 정리할 것').toBeGreaterThan(0);
    for (const f of FILE_OK.keys()) expect(fs.existsSync(path.join(ROOT, f)), `파일 예외 ${f} 가 없다 — 사문화된 예외는 지울 것`).toBe(true);
  });

  it('도메인 타입을 any 로 읽지 않는다', () => {
    const bad: string[] = [];
    for (const f of FILES) for (const { n, line } of scan(f)) {
      if (DOMAIN.test(line) && !LIB_OK.some(({ re }) => re.test(line))) bad.push(`${f}:${n}  ${line.trim().slice(0, 96)}`);
    }
    expect(
      bad,
      `도메인 타입을 any 로 읽는 곳 ${bad.length}건 — 스키마가 바뀌어도 컴파일이 통과한다:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });

  it('남은 any 는 전부 라이브러리 표면이다', () => {
    const bad: string[] = [];
    for (const f of FILES) for (const { n, line } of scan(f)) {
      if (!LIB_OK.some(({ re }) => re.test(line))) bad.push(`${f}:${n}  ${line.trim().slice(0, 96)}`);
    }
    expect(
      bad,
      `라이브러리 표면이 아닌 any ${bad.length}건 — 타입을 붙이거나, 불가피하면 LIB_OK/FILE_OK 에 사유와 함께 추가할 것:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });
});
