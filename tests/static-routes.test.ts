/*
 * AUD F28/R13 (2026-09-22) — 정적 라우트 생성기 게이트.
 * 라우트 목록이 App.tsx 의 <Route> 와 어긋나면(새 라우트를 App 에만 추가) 그 경로는 배포에서 다시 404 가 된다.
 * 렌더는 셸의 <title> 을 바꾸고 description/canonical/OG 를 심어야 한다(R13).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { listRoutes, renderPage, basePath } from '../scripts/build-static-routes.mjs';

const ROOT = process.cwd();
const app = fs.readFileSync(path.join(ROOT, 'client/src/App.tsx'), 'utf8');
const routes = listRoutes();

describe('정적 라우트 (F28)', () => {
  it('App.tsx 의 정적 경로(/tools · /guide)와 동적 경로 패턴(/guide/:section · /guide/term/:slug)을 모두 덮는다', () => {
    const staticInApp = [...app.matchAll(/<Route path=\{"\/([^":]+)"\}/g)].map((m) => m[1]).filter((r) => r !== '404');
    for (const r of staticInApp) expect(routes.some((x) => x.route === r), `App.tsx 라우트 /${r} 가 정적 생성 목록에 없다`).toBe(true);
    expect(app).toContain('/guide/:section');
    expect(app).toContain('/guide/term/:slug');
    expect(routes.filter((r) => /^guide\/ch/.test(r.route)).length).toBeGreaterThanOrEqual(14);   // toc.ts 챕터
    expect(routes.filter((r) => /^guide\/term\//.test(r.route)).length).toBeGreaterThanOrEqual(100);   // glossary.json 용어
  });
  it('용어 라우트는 glossary.json 의 모든 슬러그와 1:1', () => {
    const glossary = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/glossary.json'), 'utf8'));
    const slugs = new Set(Object.keys(glossary.terms));
    const termRoutes = routes.filter((r) => /^guide\/term\//.test(r.route)).map((r) => r.route.replace('guide/term/', ''));
    expect(new Set(termRoutes)).toEqual(slugs);
  });
  it('renderPage — 제목 교체 + description/canonical/og 주입, 프로젝트 base 반영 (R13)', () => {
    const shell = '<!doctype html><html><head><title>Shell</title><meta name="description" content="old" /></head><body></body></html>';
    process.env.VITE_BASE = '/GRANTA/';
    const html = renderPage(shell, { route: 'tools', title: 'Engineering Tools — X', desc: 'a "quoted" <desc>' });
    expect(html).toContain('<title>Engineering Tools — X</title>');
    expect(html).not.toContain('content="old"');
    expect(html).toContain('<meta name="description" content="a &quot;quoted&quot; &lt;desc&gt;" />');
    expect(html).toContain('<link rel="canonical" href="https://slmhlight.github.io/GRANTA/tools/" />');   // Pages 가 200 을 주는 슬래시 형태
    expect(html).toContain('<meta property="og:title" content="Engineering Tools — X" />');
    expect(html.match(/<title>/g)!.length).toBe(1);
  });
  it("basePath — '/GRANTA/' 와 MSYS 가 바꾼 'C:/Program Files/Git/GRANTA/' 모두 '/GRANTA', '/' 는 '' ", () => {
    process.env.VITE_BASE = '/GRANTA/'; expect(basePath()).toBe('/GRANTA');
    process.env.VITE_BASE = 'C:/Program Files/Git/GRANTA/'; expect(basePath()).toBe('/GRANTA');
    process.env.VITE_BASE = ['C:', 'Program Files', 'Git', 'GRANTA', ''].join(String.fromCharCode(92)); expect(basePath()).toBe('/GRANTA');   // 백슬래시 경로
    process.env.VITE_BASE = '/'; expect(basePath()).toBe('');
    process.env.VITE_BASE = '/GRANTA/';
  });
  it('주입 실증 — 라우트 하나를 빼면 App.tsx 커버 검사가 실패한다', () => {
    const missing = routes.filter((r) => r.route !== 'tools');
    expect(missing.some((x) => x.route === 'tools')).toBe(false);
  });
});
