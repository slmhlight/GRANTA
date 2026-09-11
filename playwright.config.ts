/*
 * F4 — E2E 스모크 1 개.
 *
 * **왜 도입했나.** 이 프로젝트가 실제로 겪은 사고는 "배포에서 build:wiki 가 빠져
 * wiki-index.json 이 404 → 재료 자동링크가 전멸" 이었다. 지금 게이트
 * (pipeline-integrity.test.ts)는 **워크플로 파일에 그 단계가 적혀 있는지**만 본다 — 적혀 있어도
 * 산출물이 없거나 base 경로가 어긋나면 잡지 못한다. 그 부류는 **실제로 띄워 봐야** 보인다.
 *
 * **왜 하나뿐인가.** 나머지는 1,215 개 단위·게이트 테스트가 훨씬 싸고 안정적으로 덮는다.
 * E2E 는 덮는 범위가 아니라 **다른 종류의 실패**(빌드 산출물·경로·런타임 부팅)를 맡는다.
 *
 * **flake 예산** (도입 조건 — 백로그 F4 의 완화책):
 *   · 재시도 0. 실패를 숨기지 않는다 — 불안정하면 바로 보이는 편이 낫다.
 *   · 외부 네트워크 0. 폰트·CDN 요청이 하나라도 있으면 **테스트가 실패한다**(스모크가
 *     외부 사정으로 깨지는 가장 흔한 경로를 원천 차단).
 *   · 고정 sleep 금지 — 역할·텍스트 기반 대기만 사용.
 *   · 기준: 코드 원인이 아닌 실패가 **최근 20 회 중 2 회** 를 넘으면 그 즉시 격리
 *     (continue-on-error)하고 원인을 고치거나 이 테스트를 폐기한다. 방치하지 않는다.
 *
 * 배포와 **같은 base**(/GRANTA/)로 빌드해 미리보기한다 — base 경로 어긋남도 검사 범위 안.
 */
import { defineConfig, devices } from '@playwright/test';

const BASE = process.env.VITE_BASE || '/GRANTA/';
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,                 // flake 예산 — 재시도로 덮지 않는다
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list']] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    /* 배포와 동일한 산출물을 그대로 미리보기 — dev 서버가 아니다(빌드 산출물·base 를 검사 대상에 포함).
       vite 를 직접 부른다: pnpm 경유는 PATH·버전 스위처에 의존해 환경마다 다르게 깨진다. */
    command: `node node_modules/vite/bin/vite.js preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_BASE: BASE },
  },
});
