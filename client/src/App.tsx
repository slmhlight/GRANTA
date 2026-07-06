import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { LanguageProvider } from "./lib/i18n";
import Home from "./pages/Home";
// R71 A — Guide·Tools 는 첫 로드에 필요 없음 → lazy chunk 분리 → 첫 페인트 ↓
// R186 — Wizard 기능 영구 제거. 사용자: 너무 낮은 레벨 즉시 사용 배제, Guide 차근차근 학습 유도.
const Guide = lazy(() => import("./pages/Guide"));
const Tools = lazy(() => import("./pages/Tools"));
const RouteLoader = () => <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">Loading…</div>;

// R49a — ThemeProvider 영구 제거. light 모드 고정 (CSS 기본 동작). 다크 모드 미지원.

function AppRouter() {
  /* R141a — base path 인식. GitHub Pages 배포 시 VITE_BASE=/GRANTA/ 로 inject 됨 → router 에 전달
     해야 절대 href="/guide" 같은 링크가 /GRANTA/guide 로 해석됨 (이전: 호스트 root 로 잘못 이동). */
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return (
    <Router base={base}>
      <Suspense fallback={<RouteLoader />}>
        <Switch>
          <Route path={"/"} component={Home} />
          <Route path={"/guide"} component={Guide} />
          <Route path={"/guide/:section"} component={Guide} />
          <Route path={"/tools"} component={Tools} />
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
