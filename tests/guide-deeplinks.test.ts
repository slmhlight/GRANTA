/*
 * H6 A-1 — 가이드 딥링크 게이트.
 * 배경: 멀티페이지 라우팅(/guide/:section) 전환 후에도 13곳이 해시형(/guide#chX)으로 남아
 * 전부 가이드 홈에 착지하던 실사고. 가이드 내부 검색(gotoEntry)도 hash+getElementById 로 무동작.
 * 게이트: ① 소스에 /guide# 패턴 잔존 0 ② 모든 /guide/chX 링크 타깃이 TOC 챕터 id 로 실재.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TOC } from '@/pages/guide/toc';

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

const SRC = path.resolve(process.cwd(), 'client/src');
const files = walk(SRC);

describe('가이드 딥링크 (H6 A-1)', () => {
  it('해시형 /guide# 링크 잔존 0 (라우터는 경로 기반 — 해시는 홈 착지)', () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      const m = src.match(/\/guide#\w+/g);
      if (m) bad.push(`${path.relative(SRC, f)}: ${m.join(', ')}`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('모든 /guide/<section> 링크 타깃이 TOC 에 실재', () => {
    const ids = new Set(TOC.map((t) => t.id));
    const bad: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      // href="/guide/chX" 형태만 (term/ 등 하위 경로 제외)
      for (const m of src.matchAll(/["'`]\/guide\/(ch\w+)["'`]/g)) {
        if (!ids.has(m[1])) bad.push(`${path.relative(SRC, f)}: /guide/${m[1]} — TOC 에 없음`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  /* AUD N04 (2026-09-22) — 챕터 페이지(/guide/chX) 안에서 다른 장으로 가는 링크가 같은 페이지 해시(#ch9)로 남아
     ch8·ch12·ch14 에서 무동작이었다. 챕터 파일에는 #chX 해시 링크가 있으면 안 된다(다른 장 = 라우트). 랜딩(Guide.tsx)은
     onLandingAnchorClick 이 #chX 를 가로채 라우팅하므로 허용. */
  it('챕터 파일 안의 다른 장 링크는 해시(#chX)가 아니라 라우트(/guide/chX)', () => {
    const chDir = path.join(SRC, 'pages', 'guide', 'chapters');
    const bad: string[] = [];
    for (const f of walk(chDir)) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/href=["'`]#(ch\w+)["'`]/g)) bad.push(`${path.relative(SRC, f)}: #${m[1]}`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
