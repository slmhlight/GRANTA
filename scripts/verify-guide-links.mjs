/*
 * R70 — Verify Guide.tsx external links.
 *
 * 사용법:
 *   node scripts/verify-guide-links.mjs
 *   node scripts/verify-guide-links.mjs --concurrent 5
 *
 * Output: data/guide-links-report.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUIDE = path.join(ROOT, 'client', 'src', 'pages', 'Guide.tsx');

const args = process.argv.slice(2);
const concurrentIdx = args.indexOf('--concurrent');
const CONCURRENT = concurrentIdx >= 0 ? parseInt(args[concurrentIdx + 1], 10) : 4;
const TIMEOUT_MS = 20000;

const content = fs.readFileSync(GUIDE, 'utf8');

// 모든 href="..." (ExtLink + a 둘 다) 의 https 만 추출
const urlSet = new Set();
const reHref = /href="(https?:\/\/[^"]+)"/g;
let m;
while ((m = reHref.exec(content))) {
  const u = m[1];
  // ignore #anchor / search params 없음
  if (!u.includes('localhost')) urlSet.add(u);
}
const urls = Array.from(urlSet);
console.log(`Found ${urls.length} unique external URLs in Guide.tsx`);

async function checkUrl(url) {
  const tStart = Date.now();
  // GET (HEAD 가 거부되는 사이트 많음 — Cambridge, ASTM 등). User-Agent 명시.
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GRANTA-link-check/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);
    const ms = Date.now() - tStart;
    const finalUrl = r.url;
    const redirected = finalUrl !== url;
    if (r.status === 200) return { url, status: 200, type: 'ok', redirected, finalUrl, ms };
    if (r.status >= 300 && r.status < 400) return { url, status: r.status, type: 'redirect', finalUrl, ms };
    if (r.status === 403) return { url, status: 403, type: 'forbidden', redirected, finalUrl, ms }; // bot-block ≠ dead
    if (r.status >= 400 && r.status < 500) return { url, status: r.status, type: 'dead-4xx', ms };
    if (r.status >= 500) return { url, status: r.status, type: 'server-error', ms };
    return { url, status: r.status, type: 'other', ms };
  } catch (err) {
    clearTimeout(timeout);
    const ms = Date.now() - tStart;
    return { url, error: err.message, type: err.name === 'AbortError' ? 'timeout' : 'error', ms };
  }
}

async function runBatched(items, fn, concurrency) {
  const out = [];
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      const r = await fn(items[i]);
      out[i] = r;
      const tag = r.type === 'ok' ? '✓' : r.type === 'forbidden' ? '⚠' : r.type === 'redirect' ? '→' : '✗';
      const dur = r.ms ? `${r.ms}ms` : '';
      process.stdout.write(`  ${tag} [${i + 1}/${items.length}] ${dur.padStart(6)} ${r.type.padEnd(13)} ${items[i].slice(0, 80)}\n`);
    }
  });
  await Promise.all(workers);
  return out;
}

const results = await runBatched(urls, checkUrl, CONCURRENT);

const ok = results.filter(r => r.type === 'ok');
const forbidden = results.filter(r => r.type === 'forbidden');
const redirect = results.filter(r => r.type === 'redirect');
const dead = results.filter(r => r.type === 'dead-4xx' || r.type === 'server-error');
const errors = results.filter(r => r.type === 'error' || r.type === 'timeout');

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`OK 200        : ${ok.length}`);
console.log(`Forbidden 403 : ${forbidden.length}  (bot-block, likely OK in browser)`);
console.log(`Redirect      : ${redirect.length}`);
console.log(`Dead 4xx/5xx  : ${dead.length}`);
console.log(`Error/timeout : ${errors.length}`);

const rep = [];
rep.push('# Guide External Links — Health Report', '');
rep.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
rep.push(`Total URLs checked: ${urls.length}`);
rep.push('');
rep.push('## Summary');
rep.push(`- ✓ OK (200): **${ok.length}**`);
rep.push(`- ⚠ Forbidden 403 (bot-block): ${forbidden.length}`);
rep.push(`- → Redirect (still works): ${redirect.length}`);
rep.push(`- ✗ Dead (4xx/5xx): **${dead.length}**`);
rep.push(`- ⏱ Error / timeout: ${errors.length}`);
rep.push('');

if (dead.length > 0) {
  rep.push('## ✗ Dead URLs (urgent — replace)');
  rep.push('| URL | Status |', '|---|---|');
  for (const r of dead) rep.push(`| ${r.url} | ${r.status} |`);
  rep.push('');
}
if (errors.length > 0) {
  rep.push('## ⏱ Network errors / timeouts');
  rep.push('| URL | Error |', '|---|---|');
  for (const r of errors) rep.push(`| ${r.url} | ${r.error || 'timeout'} |`);
  rep.push('');
}
if (redirect.length > 0) {
  rep.push('## → Redirected (consider updating to final URL)');
  rep.push('| Original | Final |', '|---|---|');
  for (const r of redirect) rep.push(`| ${r.url} | ${r.finalUrl} |`);
  rep.push('');
}
if (forbidden.length > 0) {
  rep.push('## ⚠ Forbidden 403 (bot-block, likely valid in browser)');
  rep.push('| URL |', '|---|');
  for (const r of forbidden) rep.push(`| ${r.url} |`);
  rep.push('');
}

const outPath = path.join(ROOT, 'data', 'guide-links-report.md');
fs.writeFileSync(outPath, rep.join('\n'));
console.log(`\nReport: ${outPath}`);
