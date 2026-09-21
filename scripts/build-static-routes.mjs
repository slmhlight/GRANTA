#!/usr/bin/env node
/*
 * AUD F28/R13 (2026-09-22) — GitHub Pages 정적 라우트 생성.
 *
 * 왜: 프로젝트 사이트(/GRANTA/)에서 /tools, /guide/ch1, /guide/term/<slug> 를 직접 GET 하면 Pages 가 404.html(SPA 셸)을
 * **404 상태**로 돌려줬다. 화면은 뜨지만 검색엔진·링크 검사기·미리보기·모니터링은 "없는 페이지" 로 본다(감사 F28).
 * 해법: vite build 뒤 각 정상 라우트에 `<route>/index.html` 을 실제 파일로 둔다(Pages 가 200 으로 서빙). 없는 경로만 404.
 * 같은 김에 페이지별 <title>·description·canonical·OG 메타를 심는다(감사 R13) — 초기 HTML 이 공통 제목만 갖고 있었다.
 *
 * 라우트 SSOT: App.tsx 의 Route 목록과 같다 — /tools · /guide · /guide/<chapter id> (pages/guide/toc.ts) · /guide/term/<slug> (data/glossary.json).
 * 사용: node scripts/build-static-routes.mjs [distDir=dist/public]   (deploy-pages.yml 이 vite build 직후 호출)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(ROOT, process.argv[2] || 'dist/public');
const siteOrigin = () => process.env.SITE_ORIGIN || 'https://slmhlight.github.io';
/* '/GRANTA' — 호출 시점에 읽는다(테스트가 env 를 바꿈). Git Bash(MSYS)는 '/GRANTA/' 를 'C:/Program Files/Git/GRANTA/' 로
   바꿔 넘기므로 마지막 경로 조각만 취한다 — 실배포(Linux)는 그대로 통과. */
export const basePath = () => {
  const raw = String(process.env.VITE_BASE || '/').split('\\').join('/');
  const seg = raw.split('/').filter(Boolean).pop();
  return seg && seg !== '.' ? `/${seg}` : '';
};

/** 라우트 목록 — App.tsx 와 동일 (게이트: tests/static-routes.test.ts) */
export function listRoutes() {
  const toc = fs.readFileSync(path.join(ROOT, 'client/src/pages/guide/toc.ts'), 'utf8');
  const chapters = [...toc.matchAll(/\{\s*id:\s*'([^']+)',\s*n:\s*\d+,\s*label:\s*[`'"]([^`'"]+)/g)].map((m) => ({ id: m[1], label: m[2] }));
  const glossary = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/glossary.json'), 'utf8'));
  const terms = Object.entries(glossary.terms).map(([slug, t]) => ({ slug, display: t.display, short: String(t.short || '') }));
  const routes = [
    { route: 'tools', title: 'Engineering Tools — AM Materials Explorer', desc: '9 개 기계공학 계산기 — 응력집중 Kt · 갈바닉 부식 · 좌굴 · CTE mismatch · ASTM E140 경도 환산 · 압력용기 · Larson-Miller · Mohr 원 · Schaeffler.' },
    { route: 'guide', title: 'Guide — AM Materials Explorer', desc: `재료 선택 학습 가이드 ${chapters.length} 챕터 — 실전 사례 · Ashby 선택법 · 물성 사전 · 단면·보·좌굴 · AM 특화 · 데이터 해석 · 글로서리.` },
    ...chapters.map((c) => ({ route: `guide/${c.id}`, title: `${c.label} — Guide · AM Materials Explorer`, desc: `학습 가이드: ${c.label}.` })),
    ...terms.map((t) => ({ route: `guide/term/${t.slug}`, title: `${t.display} — 기술용어 · AM Materials Explorer`, desc: t.short.slice(0, 160) })),
  ];
  return routes;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** 셸의 <title> 을 바꾸고 <head> 끝에 메타를 심는다. canonical 은 프로젝트 base 를 포함한 절대 URL. */
export function renderPage(shellHtml, { route, title, desc }) {
  const url = `${siteOrigin()}${basePath()}/${route}`.replace(/\/$/, '');
  const meta = [
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
  ].join('\n    ');
  let html = shellHtml.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  // 셸 자체의 description/canonical/og 는 지우고(홈 전용) 페이지 것으로 교체
  html = html.replace(/\s*<meta name="description"[^>]*\/>/g, '').replace(/\s*<link rel="canonical"[^>]*\/>/g, '').replace(/\s*<meta property="og:[^"]+"[^>]*\/>/g, '');
  return html.replace('</head>', `    ${meta}\n  </head>`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const indexPath = path.join(DIST, 'index.html');
  if (!fs.existsSync(indexPath)) { console.error(`❌ ${indexPath} 없음 — vite build 먼저`); process.exit(1); }
  const shell = fs.readFileSync(indexPath, 'utf8');
  const routes = listRoutes();
  let n = 0;
  for (const r of routes) {
    const dir = path.join(DIST, r.route);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPage(shell, r));
    n++;
  }
  // 없는 경로는 여전히 404 — 셸을 404.html 로 (deploy 스텝과 동일, 여기서도 보장)
  fs.writeFileSync(path.join(DIST, '404.html'), shell);
  console.log(`정적 라우트 ${n} 생성 (${DIST}) — tools · guide · chapters ${routes.filter((r) => /^guide\/ch/.test(r.route)).length} · terms ${routes.filter((r) => /^guide\/term\//.test(r.route)).length} · 404.html`);
}
