/*
 * Sprint 1 B6 — Verified datasheet URL health check.
 *
 * 사용 방법:
 *   node scripts/verify-datasheet-urls.mjs               # 모든 verified URL 검증
 *   node scripts/verify-datasheet-urls.mjs --all         # verified=false 출처까지 전부 (AUD F11 잔여 — 54 dead 가 전부 미검증 출처였다)
 *   node scripts/verify-datasheet-urls.mjs --max 50      # 처음 50개만
 *   node scripts/verify-datasheet-urls.mjs --concurrent 5 # 동시 5개
 *
 * 결과: data/dead-urls-report.md (broken / redirected / 200 OK 분류)
 *       data/url-health.json — URL 별 접근 상태 원장(link_access_status). `verified`(내용 검증) 와 별개의 축 —
 *       build-from-registry 가 각 출처에 link_status·link_checked 로 붙이고, tests/url-health.test.ts 가 dead 잔존을 막는다.
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
const CHECK_ALL = args.includes('--all');   // AUD F11 잔여 — 미검증 출처 URL 도 검사
/* 2026-09-28 — 원장(data/url-health.json, 커밋 대상)을 쓰지 않는다. 스모크 테스트(`--max 0`)가 워킹트리를 건드리지 않게. */
const NO_LEDGER = args.includes('--no-ledger');

const materials = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'public', 'materials.json'), 'utf8'));

// 모든 verified URL 수집 + dedupe (alloy 여러 개가 같은 URL 가질 수 있음 — R49d의 138 매핑)
const urlSet = new Set();
const urlMeta = new Map(); // url → { firstAlloy, count }
for (const m of materials) {
  for (const s of m.sources || []) {
    if ((CHECK_ALL || s.verified) && s.url && /^https?:\/\//.test(s.url)) {
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
console.log(`Checking ${urls.length} unique ${CHECK_ALL ? 'source' : 'verified'} URLs (concurrent ${CONCURRENT})...`);

const results = { ok: [], redirected: [], dead: [], error: [], 'bot-blocked': [], 'bot-blocked-candidate': [] };

/* R158 — 403/405 시 GET 으로 재시도. MatWeb 등 일부 사이트가 HEAD 요청을 차단함. */
const UA = 'Mozilla/5.0 (compatible; GRANTA-link-check/1.1; +https://github.com/slmhlight/GRANTA)';
/* R226e/D4 — 실제 브라우저 UA. bot UA 로 4xx 인데 이 UA 로 200 이면 안티봇 후보(자동 검출 → 화이트리스트 권장). */
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
async function fetchOnce(url, method, ua = UA) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(url, {
      method,
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': ua,
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
  /* H6 W4-4 월간 마감 — 403 은 "요청을 보고 거부"(차단)이고 404 가 "자원 없음"이다.
     아래 도메인들은 검증기의 브라우저-UA 재시도와 별도 에이전트(WebFetch) 양쪽에서 일관되게 403 을
     돌려준다 — 실재하는 상용·기관 사이트가 자동 접근만 막는 전형(이 목록의 ASTM·MatWeb·copper.org 와 같은 패턴).
     dead 로 세면 "출처가 사라졌다" 로 오독된다. */
  'www.hudsontoolsteel.com', 'hudsontoolsteel.com',
  'www.upmet.com', 'upmet.com',
  'www.portlandbolt.com', 'portlandbolt.com',
  'imsteel.com', 'www.imsteel.com',
  'nickelinstitute.org', 'www.nickelinstitute.org',
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
  /* R226d — URL체크 메일 dead 오분류 해소: 브라우저/WebFetch 로 LIVE 콘텐츠 확인된 안티봇 datasheet 사이트.
   *   steeljis(S55C 조성 반환)·espimetals(Chromium ρ7.19/E248)·stellite(Stellite 3 Co-Cr-W)·aalco(6005A) — 자동 HEAD/GET 만 403/404. */
  'steeljis.com', 'www.steeljis.com',
  'www.espimetals.com', 'espimetals.com',
  'www.stellite.com', 'stellite.com',
  'www.aalco.co.uk', 'aalco.co.uk',
  /* 전수 verify 에서 추가 검출된 LIVE 안티봇 (WebFetch 콘텐츠 확인): regentsteel(IN939 조성)·sunrise-metal(AlSi12)·shspecialsteel(AAR M-107 PDF 719KB) */
  'www.regentsteel.com', 'regentsteel.com',
  /* AUD F11 잔여 (2026-09-22) — 54 dead 교체 중 브라우저로 LIVE 확인된 안티봇: tandfonline(J. Asian Ceram. Soc. 스피넬 논문 403)·crystran(사파이어 데이터시트 403) */
  'www.tandfonline.com', 'tandfonline.com',
  'www.crystran.com', 'crystran.com',
  /* --all 전수 검사(2026-09-22)에서 드러난 안티봇: ISO 카탈로그(403, 브라우저 정상 — TC 17 페이지 확인)·DTIC 인용 페이지(403) */
  'www.iso.org', 'iso.org',
  'apps.dtic.mil',
  'www.investmentcastchina.com', 'investmentcastchina.com',   // CFS Foundry CF3/CF3M 비교 페이지 — 403 이나 브라우저 정상(2026-09-22 확인)
  'www.sunrise-metal.com', 'sunrise-metal.com',
  'shspecialsteel.com', 'www.shspecialsteel.com',
  /* 2026-09-28 — GitHub 러너(데이터센터 IP)에서만 403: MDPI(Appl. Sci. 7(10) 1009 B4C-Al 논문 — 브라우저로 본문 확인).
     로컬 가정 회선에서는 200 이 나온다. doi.org 링크도 여기로 이어진다. */
  'www.mdpi.com', 'mdpi.com',
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
    /* 2026-09-28 — SAE 는 자동 요청에 202 Accepted(검사 페이지)를 돌려준다. 200 이 아니라서 예전엔 'error'(접근 보류)로
       빠졌다(27 URL). 자원은 있다 — 차단 목록 도메인이면 bot-blocked, 아니면 ok. */
    if (r.status > 200 && r.status < 300) {
      let host = '';
      try { host = new URL(url).hostname.toLowerCase(); } catch { /* noop */ }
      return { url, status: r.status, meta, type: BOT_BLOCKED_DOMAINS.has(host) ? 'bot-blocked' : 'ok' };
    }
    if (r.status >= 300 && r.status < 400) {
      const location = r.headers.get('location');
      /* 2026-09-28 — 깊은 경로가 **사이트 첫 화면으로** 튕기면 자원은 사라진 것이다(soft-404).
         예: worldautosteel 의 AHSS 지침 글 → "/", ceramtec 제품 페이지 → "/en/?…/error/", DSM Stanyl → "/en/home.html".
         이전엔 전부 'redirected(갱신 권장)' 로만 보고돼 출처가 없어진 줄 몰랐다. */
      if (location && isRootRedirect(url, location)) {
        return { url, status: r.status, location, meta, type: 'dead', reason: 'redirect-to-root' };
      }
      return { url, status: r.status, location, meta, type: 'redirected' };
    }
    /* R158/R208: bot-blocked 도메인 의 4xx 는 'bot-blocked' 로 별도 분류 (CI fail 제외).
       AUD F11 (2026-09-22) — **404/410 은 차단이 아니라 자원 없음이다.** 예전엔 "status 무관하게 도메인으로 판정" 해
       ASM·Outokumpu·Haynes 등의 진짜 404 57건이 'bot-blocked' 로 숨어 Dead 0 으로 보고됐다(외부 감사가 적발).
       이제 허용 도메인이라도 404/410 은 dead 로 세고, 401/403/405/406/429/5xx 만 차단으로 본다. */
    if (r.status >= 400 && r.status !== 404 && r.status !== 410) {
      try {
        const host = new URL(url).hostname.toLowerCase();
        if (BOT_BLOCKED_DOMAINS.has(host)) {
          return { url, status: r.status, meta, type: 'bot-blocked' };
        }
      } catch { /* URL parse 실패 */ }
    }
    if (r.status >= 400) {
      /* R226e/D4 — dead 처리 전 실제 브라우저 UA 로 재시도. 200 이면 안티봇 후보(수동 WebFetch 불필요, 화이트리스트 추가 권장). */
      try {
        const br = await fetchOnce(url, 'GET', BROWSER_UA);
        if (br.status >= 200 && br.status < 300) return { url, status: r.status, browserStatus: br.status, meta, type: 'bot-blocked-candidate' };
      } catch { /* 브라우저 UA 재시도 실패 → 진짜 dead */ }
      return { url, status: r.status, meta, type: 'dead' };
    }
    return { url, status: r.status, meta, type: 'error' };
  } catch (err) {
    /* 2026-09-28 — 'fetch failed' 를 전부 "일시 장애(error)" 로 두면 **도메인이 사라진 출처**가 숨는다.
       로컬·CI 양쪽에서 aksteel.com(AK Steel → Cleveland-Cliffs, 16 URL)·magnesium-elektron.com 등 23 URL 이
       DNS 에 아예 없었고, 6 URL 은 다른 이름의 인증서를 내밀었다(사이트 폐쇄·주차). 두 경우만 dead 로 센다 —
       ENOTFOUND 는 권한 있는 "그런 이름 없음"(일시 장애는 EAI_AGAIN)이고, 한 번 더 확인한 뒤에만 판정한다.
       타임아웃·연결 리셋·TLS 버전 오류는 환경·안티봇일 수 있어 여전히 error. */
    const code = err?.cause?.code || '';
    if (code === 'ENOTFOUND' || code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
      await new Promise((res) => setTimeout(res, 1500));
      try {
        await fetchOnce(url, 'GET', BROWSER_UA);
      } catch (err2) {
        const code2 = err2?.cause?.code || '';
        if (code2 === code) return { url, status: null, error: code, meta: urlMeta.get(url), type: 'dead', reason: code === 'ENOTFOUND' ? 'dns-nxdomain' : 'tls-host-mismatch' };
      }
    }
    return { url, error: code ? `${err.message} (${code})` : err.message, meta: urlMeta.get(url), type: 'error' };
  }
}

/** 깊은 경로 → 사이트 루트(또는 언어 루트·home/index)로의 리다이렉트인가. */
function isRootRedirect(url, location) {
  const ROOTISH = /^\/?(?:[a-z]{2}(?:[-_][a-z]{2})?\/?)?(?:(?:home|index)(?:\.html?)?)?$/i;
  try {
    const from = new URL(url);
    const to = new URL(location, url);
    // 원래 주소가 이미 루트(또는 /en, /en/home.html)면 루트로 가는 건 정상 — 깊은 경로만 본다
    return !ROOTISH.test(from.pathname) && ROOTISH.test(to.pathname);
  } catch { return false; }
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
console.log(`Bot-candidate ${results['bot-blocked-candidate'].length}  (browser-UA 200 — 화이트리스트 추가 권장)`);
console.log(`Error       ${results.error.length}`);

// Markdown report
const rep = [];
rep.push('# Datasheet URL Health Report', '');
rep.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
rep.push(`Total unique verified URLs checked: ${urls.length}`);
rep.push('');
rep.push('## Summary', `- OK (200): **${results.ok.length}**`, `- Redirected: ${results.redirected.length}`, `- Dead (4xx/5xx): **${results.dead.length}**`, `- Bot-blocked (브라우저는 정상, 자동 fetch 만 403): ${results['bot-blocked'].length}`, `- Bot-candidate (자동검출 — 화이트리스트 추가 권장): **${results['bot-blocked-candidate'].length}**`, `- Network error / timeout: ${results.error.length}`, '');
if (results.dead.length > 0) {
  rep.push('## Dead URLs (urgent)');
  rep.push('| URL | Status | First alloy | Uses |', '|---|---|---|---|');
  for (const r of results.dead) rep.push(`| ${r.url} | ${[r.status, r.reason].filter(Boolean).join(' · ')} | ${r.meta.firstAlloy} | ${r.meta.count} |`);
  rep.push('');
}
if (results.redirected.length > 0) {
  rep.push('## Redirected (update recommended)');
  rep.push('| Original | Status | New location | First alloy |', '|---|---|---|---|');
  for (const r of results.redirected) rep.push(`| ${r.url} | ${r.status} | ${r.location || '?'} | ${r.meta.firstAlloy} |`);
  rep.push('');
}
if (results['bot-blocked-candidate'].length > 0) {
  rep.push('## Bot-blocked candidates (자동검출 — bot-UA 4xx 이나 browser-UA 200; BOT_BLOCKED_DOMAINS 추가 권장)');
  rep.push('| URL | bot | browser | First alloy | Uses |', '|---|---|---|---|---|');
  for (const r of results['bot-blocked-candidate']) rep.push(`| ${r.url} | ${r.status} | ${r.browserStatus} | ${r.meta.firstAlloy} | ${r.meta.count} |`);
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

/* AUD F11 잔여 (2026-09-22) — 접근 상태 원장. 검사한 URL 만 갱신(merge), 검사하지 않은 URL 의 이전 기록은 유지.
   status: ok · redirected · dead · bot-blocked · bot-blocked-candidate · error. 여기의 'dead' 는 HTTP 404/410(브라우저 UA 재시도 포함).
   `verified`(사람이 내용을 대조했는가)와는 다른 축이다 — 내용이 맞아도 링크는 죽을 수 있고, 링크가 살아 있어도 내용은 검증 전일 수 있다. */
if (!NO_LEDGER) {
  const healthPath = path.join(DATA, 'url-health.json');
  let health = { _note: '', checked_at: '', results: {} };
  try { health = JSON.parse(fs.readFileSync(healthPath, 'utf8')); } catch { /* 첫 생성 */ }
  const today = new Date().toISOString().slice(0, 10);
  health._note = 'AUD F11 — 출처 URL 접근 상태 원장 (pnpm verify:urls [--all] 이 갱신). status = link_access_status; verified(내용 검증)와 별개. dead 는 404/410(브라우저 UA 재시도 포함).';
  health.checked_at = today;
  health.results = health.results || {};
  for (const r of all) {
    const rec = { status: r.type, code: r.status ?? null, checked_at: today };
    if (r.reason) rec.reason = r.reason;   // dns-nxdomain · tls-host-mismatch · redirect-to-root
    if (r.type === 'redirected' && r.location) rec.location = r.location;
    if (r.type === 'bot-blocked-candidate') rec.browser_code = r.browserStatus;
    health.results[r.url] = rec;
  }
  // 산출물에 더는 없는 URL 은 원장에서 제거(교체된 옛 주소가 dead 로 남아 게이트를 오염시키지 않도록)
  const live = new Set();
  for (const m of materials) for (const s of m.sources || []) if (s.url) live.add(s.url);
  for (const u of Object.keys(health.results)) if (!live.has(u)) delete health.results[u];
  const sorted = Object.fromEntries(Object.keys(health.results).sort().map((k) => [k, health.results[k]]));
  health.results = sorted;
  fs.writeFileSync(healthPath, JSON.stringify(health, null, 1) + '\n');
  const deadN = Object.values(sorted).filter((x) => x.status === 'dead').length;
  console.log(`URL health ledger: data/url-health.json — ${Object.keys(sorted).length} URLs (dead ${deadN})`);
}

/* R144a — CI 통합: `--fail-on-dead` 또는 `--fail-threshold N` 옵션 시 dead URL 검출 시 exit 1.
   GitHub Actions weekly cron 이 실패 시 issue 자동 생성 → URL rot 즉시 인지. */
const failOnDead = args.includes('--fail-on-dead');
const failThresholdIdx = args.indexOf('--fail-threshold');
const failThreshold = failThresholdIdx >= 0 ? parseInt(args[failThresholdIdx + 1], 10) : (failOnDead ? 0 : -1);
if (failThreshold >= 0 && results.dead.length > failThreshold) {
  console.error(`\n✗ Dead URL count (${results.dead.length}) exceeds threshold (${failThreshold}).`);
  process.exit(1);
}
