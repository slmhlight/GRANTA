/*
 * AUD R15 (2026-09-22) — 가이드·Tools 에서 "탐색기로 돌아가기" 가 필터·선택을 잃고 기본 상태로 돌아가던 것.
 * 탐색기(Home)는 상태를 URL(?p=…&f.X=Y&d=…#g=…)에 이미 인코딩한다. 떠나기 직전의 그 URL 을 세션에 남기고,
 * 돌아가기 링크가 그 주소를 쓴다. 세션 범위(탭)만 — 다른 세션·다음 방문까지 살리지 않는다.
 */
const KEY = 'am_explorer_return';

export function saveExplorerState(search: string, hash: string) {
  try { sessionStorage.setItem(KEY, `${search || ''}${hash || ''}`); } catch { /* ignore */ }
}

/** wouter <Link href> 용 — base 는 Router 가 붙인다. 저장이 없으면 '/'. */
export function explorerHref(): string {
  try { return `/${sessionStorage.getItem(KEY) || ''}`; } catch { return '/'; }
}
