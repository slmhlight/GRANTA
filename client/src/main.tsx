import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import App from "./App";
import "./index.css";

// GitHub Pages 배포 시 서브디렉토리 경로를 base로 설정
// 예: https://leeseulbi53.github.io/am-materials-database/
const base = (import.meta.env.VITE_ROUTER_BASE as string) ?? "";

/* R120 — Dynamic chunk load failure 자동 복구.
   GitHub Pages 새 deploy 시 hash 변경된 chunk (예: AshbyChartPlotly-D442Ii3v.js) 를
   stale main bundle 이 fetch 시도 → 404. 자동 reload 로 사용자 mental load X.
   - vite:preloadError (Vite 5+): module preload 실패
   - 'TypeError: Failed to fetch dynamically imported module': 일반 dynamic import 실패
   sessionStorage 로 무한 reload 루프 방지. */
const handleChunkError = (event: Event | PromiseRejectionEvent) => {
  const err = (event as any).reason || (event as any).message || (event as any).error;
  const msg = String(err?.message || err || '');
  const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed/i.test(msg);
  if (!isChunkError) return;
  try {
    const key = 'am_chunk_reload_attempt';
    const last = Number(sessionStorage.getItem(key) || '0');
    const now = Date.now();
    // 최근 10초 내 reload 시도 있으면 skip (무한 루프 방지)
    if (now - last < 10_000) return;
    sessionStorage.setItem(key, String(now));
  } catch { /* private mode */ }
  console.warn('[R120] Chunk load failed, reloading page to get fresh bundle:', msg);
  event.preventDefault?.();
  window.location.reload();
};
window.addEventListener('vite:preloadError', handleChunkError);
window.addEventListener('unhandledrejection', handleChunkError);
window.addEventListener('error', handleChunkError);

createRoot(document.getElementById("root")!).render(
  <Router base={base}>
    <App />
  </Router>
);
