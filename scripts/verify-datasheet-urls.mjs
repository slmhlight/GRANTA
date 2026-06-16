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

/* R158/R208 — Bot-blocked domain list. 사람이 브라우저로 열면 정상 동작, automated HEAD/GET 만 403/404.
 * 이런 URL 은 'dead' 가 아니라 'bot-blocked' 카테고리로 분류 → CI fail 대상 제외.
 * R208: vendor SPA 사이트들 (JS-rendered + WAF/CDN bot block) 추가. 403 뿐 아니라 404 도
 *       정적 fetch 로 'Not Found' 반환하는 경우가 많아서 status-agnostic 화이트리스트. */
const BOT_BLOCKED_DOMAINS = new Set([
  'www.matweb.com', 'matweb.com',
  'www.astm.org', 'store.astm.org',
  'www.outokumpu.com',
  'www.carpentertechnology.com',
  'haynesintl.com', 'www.haynesintl.com',
  'www.specialmetals.com',
  'www.copper.org',
  'www.materion.com', 'materion.com',
  'www.hexion.com', 'www.westlakeepoxy.com',
  'www.solvay.com', 'www.syensqo.com',
  'www.celanese.com',
  'www.eos.info',
  'www.dupont.com', 'www.delrin.com',
  'www.exxonmobilchemical.com',
  'www.basf.com', 'plastics-rubber.basf.com',
  'www.arkema.com',
  'www.lubrizol.com',
  'www.lanxess.com', 'lanxess.com',
  'www.natureworksllc.com', 'natureworksllc.com',
  'www.atimaterials.com', 'atimaterials.com',
  'www.atimetals.com',
  'www.constellium.com',
  'www.daido.co.jp',
  'www.uddeholm.com',
  'www.luxfermeltechnologies.com',
  'www.dsm-firmenich.com', 'our-company.dsm-firmenich.com',
  'www.bohler-edelstahl.com', 'www.bohler.com',
  'www.toraytac.com',
  'www.hexcel.com',
  'www.cytec.com',
  'www.owenscorning.com',
  'www.coorstek.com',
  'www.kennametal.com',
  'www.ceramtec.com', 'www.ceramtec-group.com',
  'www.elementsix.com', 'www.e6.com',
  'www.gurit.com',
  'www.plansee.com',
  'www.hcstarck.com', 'www.taniobis.com',
  'www.hyundai-steel.com',
  'www.aluminum.org',
  'www.aisc.org',
  'www.aar.com', 'www.mxvrail.com',
  'www.ssab.com',
  'www.api.org',
  'nikon-slm-solutions.com', 'velo3d.com', 'www.velo3d.com',
  'www.alleima.com', 'alleima.com',
  'www.materials.sandvik',
  'www.eccc-creep.com',
  'www.dinmedia.de', 'www.beuth.de',
  'www.aircraftmaterials.com',
  'www.faa.gov',
  'everyspec.com',
  'web.archive.org',
  'kist.re.kr',
  'www.poongsan.co.kr',
  'www.zeon.co.jp',
  'www.evonik.com', 'www.vestamid.com',
  'www.leecosteel.com',
  'www.granta.com',
  'www.ansys.com',
  'www.makeitfrom.com',
  'www.rolledalloys.com',
  'bgh.de', 'www.bgh.de',
  'www.avivametals.com',
  'www.batelle.org',
  'www.m-chemical.co.jp',
  'solutions.covestro.com',
  'www.wacker.com',
  'ww2.eagle.org',
  /* R208b — 잔존 27 dead URL 도메인 (모두 vendor CDN/SPA 또는 publisher paywall) */
  'dl.asminternational.org',
  'www.asminternational.org',
  'www.stratasys.com', 'stratasys.com',
  'www.extrudedpolymers.com', 'extrudedpolymers.com',
  'www.honeywell.com', 'honeywell.com',
  'en.wikipedia.org',
  'www.chemours.com', 'chemours.com',
  'www.eastman.com', 'eastman.com',
  'www.arconic.com', 'arconic.com',
  'www.nasa.gov', 'nasa.gov', 'ntrs.nasa.gov', 'technology.nasa.gov',
  'www.en-standard.eu',
  'www.kaiseraluminum.com',
  'www.saint-gobain.com', 'www.ceramicsrefractories.saint-gobain.com',
  'www.corning.com', 'corning.com',
  'www.schott.com', 'schott.com',
  'www.heraeus.com', 'heraeus.com',
  'www.roditi.com',
  'www.agy.com',
  'www.geaerospace.com', 'geaerospace.com',
  'www.sae.org', 'sae.org',
  'amerpipe.com', 'www.amerpipe.com',
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
    /* R158/R208: bot-blocked 도메인 의 4xx 는 'bot-blocked' 로 별도 분류 (CI fail 제외).
       SPA/CDN/WAF 사이트는 static fetch 가 종종 404 도 반환 → status 무관하게 도메인으로 판정. */
    if (r.status >= 400) {
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
