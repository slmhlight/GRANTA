/*
 * F4 — 스모크 1 flow: 로드 → 검색 → 상세 → 비교.
 *
 * 단위 테스트가 못 보는 것만 본다:
 *   · 빌드 산출물이 실제로 서빙되는가 (materials/index.json · wiki-index.json · property-stats.json)
 *     — 이 프로젝트의 실사고가 정확히 이 부류였다(배포에서 build:wiki 누락 → 404 → 자동링크 전멸).
 *     기존 게이트는 워크플로 **텍스트에 그 단계가 적혀 있는지**만 봤다. 여기서는 실제 요청을 본다.
 *   · 배포와 같은 base(/GRANTA/)에서 경로가 맞는가
 *   · 앱이 부팅해 실제로 데이터를 그린다 (0 행이 아니다)
 *
 * 값의 정확성은 여기서 보지 않는다 — 그건 1,215 개 단위·게이트 테스트의 몫이고, 느리고 불안정한
 * 곳에 중복을 놓을 이유가 없다.
 */
import { test, expect, type Page, type Request } from '@playwright/test';

/* 앱이 실제로 부르는 외부 호스트는 웹폰트뿐이다. 스모크는 **전부 차단**한다:
   ① 바깥 사정으로 깨지지 않게 한다(flake 예산의 핵심)
   ② 폰트를 못 받아도 앱이 도는지 함께 확인된다
   ③ 새 외부 의존이 생기면 아래 집합과 달라져 드러난다 */
const ALLOWED_EXTERNAL = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/** 실패한 요청·외부 호스트·콘솔 오류를 모은다 — 스모크의 본체. */
async function watch(page: Page) {
  const failed: string[] = [];
  const external = new Set<string>();
  const errors: string[] = [];
  const isLocal = (u: string) => u.startsWith('http://localhost:') || u.startsWith('data:') || u.startsWith('blob:');

  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (isLocal(u)) return route.continue();
    external.add(new URL(u).hostname);
    return route.abort();                 // 차단 — 아래 failed 집계에서 제외된다
  });
  page.on('requestfailed', (r: Request) => {
    if (isLocal(r.url())) failed.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText ?? '?'}`);
  });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  /* 위에서 외부 요청을 **우리가** 끊었기 때문에 브라우저가 그 건마다 일반 오류를 찍는다 —
     그건 우리 코드의 문제가 아니다. 차단 유래(net::ERR_*)만 걸러내고, 서버가 실제로 돌려준
     404/500 류는 남긴다(그 부류는 위 failed 목록에서도 잡힌다 — 두 신호가 겹쳐야 한다). */
  const BLOCKED_BY_US = /Failed to load resource: net::ERR_(FAILED|BLOCKED_BY_CLIENT|ABORTED)/;
  page.on('console', (m) => { if (m.type() === 'error' && !BLOCKED_BY_US.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return { failed, external, errors };
}

/** 차단된 외부 호스트가 알려진 집합 안인지. */
function unknownHosts(seen: Set<string>) {
  /* Array.from — 이 저장소 tsconfig 는 target 을 안 잡아 Set 스프레드가 막힌다(프로젝트 전역
     설정을 e2e 편의로 바꾸지 않는다). */
  return Array.from(seen).filter((h) => !ALLOWED_EXTERNAL.includes(h));
}

test('로드 → 검색 → 상세 → 비교', async ({ page }) => {
  const seen = await watch(page);

  /* 첫 방문 온보딩(6단계 환영 다이얼로그)이 오버레이로 조작을 막는다 — 실제 동작이고, 스모크를
     처음 돌린 날 바로 이걸로 걸렸다. 클릭으로 닫으면 애니메이션 타이밍에 의존하므로 앱이 쓰는
     플래그를 미리 세워 둔다(= 재방문 사용자 상태). */
  await page.addInitScript(() => {
    try { localStorage.setItem('am_onboarding_done', '1'); } catch { /* private 모드 */ }
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });

  /* 1) 부팅 — 재료 수 배지가 실제 숫자를 그린다(= index.json 을 받아 파싱했다). */
  const badge = page.locator('button', { hasText: /^[\d,]+재료$/ }).first();
  await expect(badge, '재료 수 배지가 없다 — index.json 을 못 받았거나 부팅이 실패했다').toBeVisible();
  const count = Number((await badge.innerText()).replace(/[^\d]/g, ''));
  expect(count, `재료 수 ${count} — 데이터가 비었다`).toBeGreaterThan(1000);

  /* 2) 표가 행과 함께 그려진다 (0 행이 아니다). */
  const rows = page.locator('tbody tr');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count(), '표에 행이 없다').toBeGreaterThan(10);

  /* 3) 검색 → 결과가 좁혀진다. */
  const search = page.getByPlaceholder(/재료·합금·공정 검색/).first();
  await search.click();
  await search.fill('Ti-6Al-4V');
  await expect(rows.first()).toContainText('Ti-6Al-4V', { timeout: 10_000 });

  /* 4) 상세 — 행을 열면 물성이 보인다. */
  await rows.first().click();
  await expect(page.getByText(/Yield Strength/).first(), '상세 패널에 물성이 없다').toBeVisible();

  /* 5) 비교 — Compare 에 담고 패널을 연다. 버튼 표기가 바뀌어도 스모크가 깨지지 않게 존재할 때만. */
  const add = page.locator('button[title*="Compare"], button[aria-label*="Compare"]').first();
  if (await add.count()) {
    await add.click();
    const open = page.locator('button', { hasText: /Compare\s*\d+/ }).first();
    if (await open.count()) {
      await open.click();
      await expect(page.getByText(/MATERIAL/i).first(), '비교판이 열리지 않았다').toBeVisible();
    }
  }

  /* 6) 본체 — 실패한 요청·미지의 외부 호스트·콘솔 오류가 없다. */
  expect(seen.failed, `실패한 요청 ${seen.failed.length}건 — 빌드 산출물 누락·base 경로 오류의 신호다: ${seen.failed.join(' · ')}`).toEqual([]);
  expect(unknownHosts(seen.external), `알려지지 않은 외부 호스트 — 새 외부 의존이 생겼다(차단돼 통과했더라도 기록해야 한다): ${unknownHosts(seen.external).join(' · ')}`).toEqual([]);
  expect(seen.errors, `콘솔 오류 ${seen.errors.length}건: ${seen.errors.join(' · ')}`).toEqual([]);
});

test('가이드 챕터 라우트 — 부팅하고 자동링크가 살아 있다', async ({ page }) => {
  const seen = await watch(page);
  /* F1 에서 챕터 본문을 분리하며 자동링크가 한 번 전멸했다(텍스트는 그대로라 눈으로는 안 보인다).
     단위 게이트가 계약을 고정하지만, **배포 산출물에서도** 살아 있는지는 여기서만 보인다. */
  await page.goto('./guide/ch10', { waitUntil: 'domcontentloaded' });
  const section = page.locator('section#ch10');
  await expect(section).toBeVisible();
  expect(await section.locator('a').count(), '챕터 본문에 링크가 하나도 없다 — wiki-index 404 또는 자동링크 파손').toBeGreaterThan(5);
  expect(seen.failed, `실패한 요청: ${seen.failed.join(' · ')}`).toEqual([]);
  expect(unknownHosts(seen.external), `알려지지 않은 외부 호스트: ${unknownHosts(seen.external).join(' · ')}`).toEqual([]);
  expect(seen.errors, `콘솔 오류: ${seen.errors.join(' · ')}`).toEqual([]);
});
