/*
 * Sprint 1 B6 — Verified datasheet URL health check.
 *
 * 사용 방법:
 *   node scripts/verify-datasheet-urls.mjs               # 모든 verified URL 검증
 *   node scripts/verify-datasheet-urls.mjs --max 50      # 처음 50개만
 *   node scripts/verify-datasheet-urls.mjs --concurrent 5 # 동시 5개
 *
 * 결과: data/dead-urls-report.md (broken / redirected / 200 OK 분류)
 *
 * 본 script 는 prebuild 에 포함하지 않음 (네트워크 의존 + 시간 소요).
 * 분기마다 수동 실행 권장 — vendor 사이트 URL 구조 변경 감지.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');

const args = process.argv.slice(2);
const maxIdx = args.indexOf('--max');
const concurrentIdx = args.indexOf('--concurrent');
const MAX = maxIdx >= 0 ? parseInt(args[maxIdx + 1], 10) : Infinity;
const CONCURRENT = concurrentIdx >= 0 ? parseInt(args[concurrentIdx + 1], 10) : 3;

const materials = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'public', 'materials.json'), 'utf8'));

// 모든 verified URL 수집 + dedupe (alloy 여러 개가 같은 URL 가질 수 있음 — R49d의 138 매핑)
const urlSet = new Set();
const urlMeta = new Map(); // url → { firstAlloy, count }
for (const m of materials) {
  for (const s of m.sources || []) {
    if (s.verified && s.url && /^https?:\/\//.test(s.url)) {
      if (!urlSet.has(s.url)) {
        urlSet.add(s.url);
        urlMeta.set(s.url, { firstAlloy: m.name, count: 1 });
      } else {
        urlMeta.get(s.url).count++;
      }
    }
  }
}

const urls = Array.from(urlSet).slice(0, MAX);
console.log(`Checking ${urls.length} unique verified URLs (concurrent ${CONCURRENT})...`);

const results = { ok: [], redirected: [], dead: [], error: [], 'bot-blocked': [] };

/* R158 — 403/405 시 GET 으로 재시도. MatWeb 등 일부 사이트가 HEAD 요청을 차단함. */
const UA = 'Mozilla/5.0 (compatible; GRANTA-link-check/1.1; +https://github.com/slmhlight/GRANTA)';
async function fetchOnce(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(url, {
      method,
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/pdf,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    return r;
  } finally {
    clearTimeout(timeout);
  }
}

/* R158 — Bot-blocked domain list. 사람이 브라우저로 열면 정상 동작, automated HEAD/GET 만 403.
 * 이런 URL 은 'dead' 가 아니라 'bot-blocked' 카테고리로 분류 → CI fail 대상 제외. */
const BOT_BLOCKED_DOMAINS = new Set([
  'www.matweb.com',
  'matweb.com',
  'www.astm.org',  // ASTM HTML 페이지는 store.astm.org redirect 인데 store 도 종종 bot detect
]);

async function checkUrl(url) {
  try {
    let r = await fetchOnce(url, 'HEAD');
    /* 403/405/501 → GET 재시도 (HEAD 비허용). 다만 GET 도 같은 status 면 진짜 dead. */
    if (r.status === 403 || r.status === 405 || r.status === 501) {
      try {
        r = await fetchOnce(url, 'GET');
      } catch {
        /* GET 실패 시 원래 HEAD 결과 유지. */
      }
    }
    const meta = urlMeta.get(url);
    if (r.status === 200) return { url, status: 200, meta, type: 'ok' };
    if (r.status >= 300 && r.status < 400) {
      const location = r.headers.get('location');
      return { url, status: r.status, location, meta, type: 'redirected' };
    }
    /* R158: bot-blocked 도메인 의 403 은 'bot-blocked' 로 별도 분류. CI fail 제외. */
    if (r.status === 403) {
      try {
        const host = new URL(url).hostname.toLowerCase();
        if (BOT_BLOCKED_DOMAINS.has(host)) {
          return { url, status: r.status, meta, type: 'bot-blocked' };
        }
      } catch { /* URL parse 실패 */ }
    }
    if (r.status >= 400) return { url, status: r.status, meta, type: 'dead' };
    return { url, status: r.status, meta, type: 'error' };
  } catch (err) {
    return { url, error: err.message, meta: urlMeta.get(url), type: 'error' };
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
      if ((i + 1) % 10 === 0) process.stdout.write(`\r  ${i + 1}/${items.length}`);
    }
  });
  await Promise.all(workers);
  process.stdout.write('\n');
  return out;
}

const all = await runBatched(urls, checkUrl, CONCURRENT);
for (const r of all) results[r.type].push(r);

console.log();
console.log(`OK          ${results.ok.length}`);
console.log(`Redirected  ${results.redirected.length}`);
console.log(`Dead        ${results.dead.length}`);
console.log(`Bot-blocked ${results['bot-blocked'].length}`);
console.log(`Error       ${results.error.length}`);

// Markdown report
const rep = [];
rep.push('# Datasheet URL Health Report', '');
rep.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
rep.push(`Total unique verified URLs checked: ${urls.length}`);
rep.push('');
rep.push('## Summary', `- OK (200): **${results.ok.length}**`, `- Redirected: ${results.redirected.length}`, `- Dead (4xx/5xx): **${results.dead.length}**`, `- Bot-blocked (브라우저는 정상, 자동 fetch 만 403): ${results['bot-blocked'].length}`, `- Network error / timeout: ${results.error.length}`, '');
if (results.dead.length > 0) {
  rep.push('## Dead URLs (urgent)');
  rep.push('| URL | Status | First alloy | Uses |', '|---|---|---|---|');
  for (const r of results.dead) rep.push(`| ${r.url} | ${r.status} | ${r.meta.firstAlloy} | ${r.meta.count} |`);
  rep.push('');
}
if (results.redirected.length > 0) {
  rep.push('## Redirected (update recommended)');
  rep.push('| Original | Status | New location | First alloy |', '|---|---|---|---|');
  for (const r of results.redirected) rep.push(`| ${r.url} | ${r.status} | ${r.location || '?'} | ${r.meta.firstAlloy} |`);
  rep.push('');
}
if (results['bot-blocked'].length > 0) {
  rep.push('## Bot-blocked (not actually dead — browser works, automated checker blocked)');
  rep.push('| URL | Status | First alloy | Uses |', '|---|---|---|---|');
  for (const r of results['bot-blocked']) rep.push(`| ${r.url} | ${r.status} | ${r.meta.firstAlloy} | ${r.meta.count} |`);
  rep.push('');
}
if (results.error.length > 0) {
  rep.push('## Network errors (transient, retry recommended)');
  rep.push('| URL | Error | First alloy |', '|---|---|---|');
  for (const r of results.error.slice(0, 20)) rep.push(`| ${r.url} | ${r.error} | ${r.meta?.firstAlloy} |`);
  rep.push('');
}
fs.writeFileSync(path.join(DATA, 'dead-urls-report.md'), rep.join('\n'));
console.log('\nReport written: data/dead-urls-report.md');

/* R144a — CI 통합: `--fail-on-dead` 또는 `--fail-threshold N` 옵션 시 dead URL 검출 시 exit 1.
   GitHub Actions weekly cron 이 실패 시 issue 자동 생성 → URL rot 즉시 인지. */
const failOnDead = args.includes('--fail-on-dead');
const failThresholdIdx = args.indexOf('--fail-threshold');
const failThreshold = failThresholdIdx >= 0 ? parseInt(args[failThresholdIdx + 1], 10) : (failOnDead ? 0 : -1);
if (failThreshold >= 0 && results.dead.length > failThreshold) {
  console.error(`\n✗ Dead URL count (${results.dead.length}) exceeds threshold (${failThreshold}).`);
  process.exit(1);
}
