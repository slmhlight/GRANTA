/*
 * AUD R13 (2026-09-22) — 페이지별 <title>·description (SPA 이동 시). 정적 HTML 의 메타는 scripts/build-static-routes.mjs 가
 * 심고, 이 훅은 클라이언트 라우팅 뒤 문서 제목이 홈 제목으로 남지 않게 한다. 브라우저 탭·히스토리·공유 미리보기용.
 */
import { useEffect } from 'react';

export const SITE_NAME = 'AM Materials Explorer';

export function usePageMeta(title: string | null | undefined, description?: string | null) {
  useEffect(() => {
    const full = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Granta-Style Database`;
    document.title = full;
    if (description !== undefined) {
      let el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!el) { el = document.createElement('meta'); el.name = 'description'; document.head.appendChild(el); }
      el.content = description || '';
    }
  }, [title, description]);
}
