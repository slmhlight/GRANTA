import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // For GitHub Pages project sites the app is served from /<repo>/, so the asset
  // base path must match. Set VITE_BASE=/GRANTA/ in CI; defaults to "/" for local dev.
  base: process.env.VITE_BASE || "/",
  // R210 B9 — plotly.js/lib/core(소스 빌드)의 일부 의존성(has-hover 등)이 Node 의 `global` 을
  //   참조 → 브라우저 ESM 에 없어 ReferenceError. scatter-only 커스텀 번들을 쓰려면 shim 필요.
  define: { global: 'globalThis' },
  plugins: [react(), tailwindcss(), jsxLocPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // fall back to the next free port if 3000 is busy
    host: true,
  },
  // @ts-expect-error vitest test config (vitest extends vite UserConfig at runtime)
  test: {
    // 기본 node 환경 (로직 .test.ts — 빠름). 컴포넌트 .test.tsx 는 파일 상단
    // `// @vitest-environment jsdom` docblock 으로 jsdom 으로 전환.
    environment: 'node',
    root: path.resolve(import.meta.dirname),  // 테스트는 레포 루트 기준
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/vitest.setup.ts'],
    // R210 B3 — 커버리지는 순수 로직(lib)·필터 엔진(hooks)만 측정. 컴포넌트/페이지는 제외
    //   (렌더 테스트 부담 회피). 임계는 보수적으로 — 하향 회귀만 차단.
    coverage: {
      provider: 'v8',
      include: ['client/src/lib/**', 'client/src/hooks/**'],
      reporter: ['text', 'json-summary'],
      // 측정값(2026-06 기준 lines/stmts 72% · branches 67% · funcs 67%) 대비 ~7%p 하단.
      thresholds: { lines: 65, functions: 58, statements: 65, branches: 60 },
    },
  },
});
