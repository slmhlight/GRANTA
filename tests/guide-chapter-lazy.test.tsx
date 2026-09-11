// @vitest-environment jsdom
/*
 * F1 — Guide 챕터 본문을 **지연 함수**로 넘기는 계약을 고정한다.
 *
 * Guide.tsx 는 2298 줄이었고 그중 1857 줄이 15 개 챕터 본문 JSX 였다. 본문을 파일로 분리하면서
 * 단순히 컴포넌트(<Ch7Body />)로 감쌌더니 **자동링크가 통째로 사라졌다** — ch10 의 <a> 40 → 0.
 *
 * 원인: 자동링크(GlossaryText)는 **이미 만들어진 element 트리**를 걸어가며 문자열 잎을 용어·
 * 합금 링크로 바꾼다(components.tsx processGlossary). 컴포넌트로 감싸면 그 시점에 children 이
 * 비어 있어 walker 가 즉시 멈춘다.
 *
 * 그래서 계약은 "함수로 넘긴다" 다:
 *   · <Chapter> 는 라우트가 다르면 return null 이므로 **호출 자체가 일어나지 않는다**
 *     (예전엔 부모가 15 개 본문을 전부 만들어 넘기고 14 개를 버렸다. /guide/ch10 실측 — 지금은
 *      ch10Body 만 호출되고 나머지 13 은 호출 0)
 *   · 호출하면 완성된 트리를 돌려주므로 walker 는 종전대로 동작한다
 *
 * 이 두 성질은 서로를 배반하기 쉽다(하나를 고치면 다른 하나가 조용히 깨진다). 그래서 게이트가
 * **양쪽 모두**를 검사한다.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Router, Route } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import fs from 'node:fs';
import path from 'node:path';
import { Chapter } from '@/pages/guide/components';

afterEach(cleanup);

const ROOT = process.cwd();
/* Chapter 는 useParams 로 :section 을 읽는다 — 실제 앱과 같이 매칭된 Route 안에서 렌더해야
   라우팅 분기(early return · 자동링크)가 재현된다. 랜딩(/guide)은 Route 없이. */
const at = (route: string, ui: React.ReactNode) => {
  const { hook } = memoryLocation({ path: route });
  return render(<Router hook={hook}><Route path="/guide/:section">{ui}</Route></Router>);
};
const atLanding = (ui: React.ReactNode) => {
  const { hook } = memoryLocation({ path: '/guide' });
  return render(<Router hook={hook}>{ui}</Router>);
};

const LEARN = ['학습 목표 1'];
/** 용어 자동링크는 TermLink 의 팝오버 트리거 버튼으로 렌더된다(<a> 아님). */
const TERM_LINK = 'button[aria-haspopup="dialog"]';

describe('F1 — 챕터 본문은 지연 함수로 넘긴다', () => {
  it('라우트가 다른 챕터의 본문 함수는 호출되지 않는다', () => {
    const body = vi.fn(() => <p>ch9 본문</p>);
    at('/guide/ch1', <Chapter n={9} id="ch9" title="다른 챕터" learn={LEARN}>{body}</Chapter>);
    expect(body, '라우트가 다른데 본문이 만들어졌다 — <Chapter> 의 early return 앞에서 호출되고 있다').not.toHaveBeenCalled();
    expect(screen.queryByText('ch9 본문')).toBeNull();
  });

  it('해당 라우트에서는 호출되고 렌더된다', () => {
    const body = vi.fn(() => <p>ch9 본문</p>);
    at('/guide/ch9', <Chapter n={9} id="ch9" title="이 챕터" learn={LEARN}>{body}</Chapter>);
    expect(body).toHaveBeenCalled();
    expect(screen.getByText('ch9 본문')).toBeTruthy();
  });

  it('JSX 로 직접 넘겨도(랜딩 경로 등) 그대로 렌더된다 — 하위호환', () => {
    atLanding(<Chapter n={9} id="ch9" title="랜딩" learn={LEARN}><p>직접 JSX</p></Chapter>);
    expect(screen.getByText('직접 JSX')).toBeTruthy();
  });

  /* 자동링크는 라우팅된 단일 챕터에서만 걸린다(components.tsx 의 routedSection 분기).
     함수가 돌려준 트리가 walker 에게 그대로 보이는지 — 이게 깨졌던 부분이다. */
  it('함수가 돌려준 트리에도 자동링크가 걸린다 (컴포넌트로 감싸면 깨지는 자리)', () => {
    const { container } = at('/guide/ch9',
      <Chapter n={9} id="ch9" title="자동링크" learn={LEARN}>{() => <p>오스테나이트 조직은 면심입방이다.</p>}</Chapter>);
    /* 용어 링크는 <a> 가 아니라 팝오버 트리거 버튼(TermLink)으로 렌더된다. */
    expect(container.querySelectorAll(TERM_LINK).length,
      '함수가 돌려준 본문에 용어 링크가 없다 — walker 가 트리를 못 본 것').toBeGreaterThan(0);
    expect([...container.querySelectorAll('p')].some((p) => p.textContent?.includes('오스테나이트')),
      '본문 텍스트 자체가 사라졌다면 링크 문제가 아니라 렌더 문제다').toBe(true);
  });

  it('컴포넌트로 감싸면 자동링크가 깨진다 — 이 게이트가 지키는 바로 그 차이', () => {
    const Body = () => <p>오스테나이트 조직은 면심입방이다.</p>;
    const { container } = at('/guide/ch9',
      <Chapter n={9} id="ch9" title="자동링크" learn={LEARN}><Body /></Chapter>);
    expect([...container.querySelectorAll('p')].some((p) => p.textContent?.includes('오스테나이트')),
      '텍스트는 그대로 나온다 — 사라지는 것은 링크뿐이라 눈으로는 안 보인다').toBe(true);
    expect(container.querySelectorAll(TERM_LINK).length,
      '컴포넌트로 감싸도 링크가 생긴다면 walker 구현이 바뀐 것 — 이 게이트의 전제를 다시 확인할 것').toBe(0);
  });
});

describe('F1 — 분리한 챕터 파일의 제약', () => {
  const DIR = path.join(ROOT, 'client', 'src', 'pages', 'guide', 'chapters');
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.tsx'));

  it('챕터 파일이 실제로 있다', () => {
    expect(files.length, '분리된 챕터 파일이 없다 — 경로나 추출이 되돌려졌는지 확인').toBeGreaterThan(10);
  });

  it('본문은 훅을 쓰지 않는다 (컴포넌트가 아니라 호출되는 함수다)', () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(path.join(DIR, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/\/\/.*/g, '');
      src.split('\n').forEach((line, i) => {
        if (/(?<![\w$.])use[A-Z]\w*\s*\(/.test(line)) bad.push(`${f}:${i + 1}  ${line.trim().slice(0, 90)}`);
      });
    }
    expect(bad, `훅 호출 ${bad.length}건 — 이 함수들은 컴포넌트가 아니라 <Chapter> 안에서 호출된다(훅 규칙 위반):\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('Guide.tsx 는 본문을 함수로 넘긴다 (JSX 로 넘기면 자동링크가 죽는다)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'client', 'src', 'pages', 'Guide.tsx'), 'utf8');
    const lazy = src.match(/\{\(\) => ch\w+Body\(/g) ?? [];
    const asJsx = src.match(/<ch\w+Body[\s/>]/g) ?? [];
    expect(lazy.length, '지연 호출 형태가 0 이다 — 본문 전달 방식이 바뀌었는지 확인').toBeGreaterThan(10);
    expect(asJsx, `본문을 JSX 컴포넌트로 넘긴 곳 ${asJsx.length}건 — 자동링크가 조용히 사라진다:\n  ${asJsx.join(', ')}`).toEqual([]);
  });
});

/*
 * F1 — 가이드 프로즈의 **파일 목록은 한 곳**(scripts/lib/guide-sources)에서만 만든다.
 *
 * 챕터를 파일로 쪼개자, 'client/src/pages/Guide.tsx' 를 직접 적어 둔 **여섯 곳이 한꺼번에 빈
 * 코퍼스**를 읽기 시작했다 — 검색 인덱스 헤딩 41→0 · 재료 링크 커버리지 238→0 · 용어→챕터
 * 매핑 55→8. 세 게이트가 다 잡아 주었지만, 다음에 파일이 또 늘면 같은 일이 반복된다.
 * 그래서 "경로를 직접 적지 않는다" 를 규칙으로 고정한다.
 */
describe('F1 — 가이드 소스 목록은 SSOT 하나', () => {
  const walk = (d: string, acc: string[] = []): string[] => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, acc);
      else if (/\.(mjs|ts|tsx)$/.test(e.name)) acc.push(p);
    }
    return acc;
  };
  /* 예외: 목록을 만드는 당사자와, Guide.tsx **자체의 구조**(호출 형태)를 검사하는 이 파일. */
  const ALLOW = new Set(['scripts/lib/guide-sources.mjs', 'tests/guide-chapter-lazy.test.tsx']);

  it('Guide.tsx 경로를 직접 읽는 곳이 없다', () => {
    const files = [...walk(path.join(ROOT, 'scripts')), ...walk(path.join(ROOT, 'tests'))]
      .map((p) => path.relative(ROOT, p).split(path.sep).join('/'))
      .filter((p) => !ALLOW.has(p));
    const bad: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/^\s*\/\/.*$/gm, '');
      src.split('\n').forEach((line, i) => {
        if (/pages\/Guide\.tsx|'pages',\s*'Guide\.tsx'/.test(line)) bad.push(`${f}:${i + 1}  ${line.trim().slice(0, 90)}`);
      });
    }
    expect(bad, `Guide.tsx 를 직접 읽는 곳 ${bad.length}건 — chapters/* 를 놓친다. scripts/lib/guide-sources 를 쓸 것: ${bad.join(' · ')}`).toEqual([]);
  });

  it('예외 목록이 사문화되지 않았다', () => {
    for (const f of ALLOW) expect(fs.existsSync(path.join(ROOT, f)), `예외 ${f} 가 없다 — 지울 것`).toBe(true);
  });
});
