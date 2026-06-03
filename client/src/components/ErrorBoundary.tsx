import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      // R71 A — 친화적 에러 메시지 + 디버그 stack collapsible + diagnostic actions.
      const err = this.state.error;
      const isFetchError = err?.message?.match(/Failed to fetch|NetworkError|Load failed/i);
      const isTDZError = err?.message?.match(/before initialization|Cannot access/i);
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle size={48} className="text-destructive mb-6 flex-shrink-0" />
            <h2 className="text-xl mb-2 font-semibold">예기치 못한 오류가 발생했습니다 / Unexpected error</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              {isFetchError && '네트워크 연결을 확인하거나 잠시 후 다시 시도해 주세요. The data could not be loaded — check your network.'}
              {isTDZError && 'JavaScript 초기화 순서 오류 (R54 회귀 가능). Cache 비우고 hard reload (Ctrl+F5) 권장.'}
              {!isFetchError && !isTDZError && '아래 액션 중 하나로 복구를 시도해 주세요.'}
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => window.location.reload()}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-lg', 'bg-primary text-primary-foreground', 'hover:opacity-90 cursor-pointer')}
              >
                <RotateCcw size={16} /> 새로고침
              </button>
              <button
                onClick={() => { try { localStorage.clear(); } catch { /* ignore */ } window.location.reload(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted cursor-pointer"
                title="localStorage (collections·favorites·검색 기록) 비우고 새로고침"
              >
                저장 데이터 비우고 새로고침
              </button>
              <a
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted cursor-pointer"
              >
                홈으로
              </a>
            </div>
            <details className="w-full">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">기술 상세 (개발자용)</summary>
              <div className="p-4 mt-2 w-full rounded bg-muted overflow-auto">
                <pre className="text-[11px] text-muted-foreground whitespace-break-spaces">{err?.stack || err?.message || 'no error info'}</pre>
              </div>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
