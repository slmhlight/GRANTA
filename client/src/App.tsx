import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { LanguageProvider } from "./lib/i18n";
import Home from "./pages/Home";
// R71 A — Guide·Tools 는 첫 로드에 필요 없음 → lazy chunk 분리 → 첫 페인트 ↓
const Guide = lazy(() => import("./pages/Guide"));
const Tools = lazy(() => import("./pages/Tools"));
const RouteLoader = () => <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">Loading…</div>;

// R49a — ThemeProvider 영구 제거. light 모드 고정 (CSS 기본 동작). 다크 모드 미지원.

function AppRouter() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/guide"} component={Guide} />
        <Route path={"/tools"} component={Tools} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
