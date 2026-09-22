/*
 * R157b — MaterialDetail 의 Sources/Datasheets 리스트.
 * R226e/D2 — 출처 권위 등급(authority) 배지 추가. provenance 품질을 시각적으로 구분(규격 > 핸드북 > 제조사 > DB > 기타).
 */
import { ExternalLink, Check, BookText, Unlink } from 'lucide-react';
import type { MaterialSource } from '@/lib/materials';
import { AUTHORITY_META } from '@/lib/source-authority';
import { useLang } from '@/lib/i18n';   // AUD F23

/* E3 — 라벨 맵은 lib/source-authority 로 이동(사이드바 chip 과 같은 정의를 공유). */
const AUTHORITY = AUTHORITY_META;

function AuthorityBadge({ authority }: { authority?: MaterialSource['authority'] }) {
  const { lang } = useLang();
  if (!authority) return null;
  const a = AUTHORITY[authority];
  return <span className={`text-[9px] px-1 mt-0.5 rounded border font-medium whitespace-nowrap flex-shrink-0 ${a.cls}`} title={lang === 'en' ? a.titleEn : a.title}>{lang === 'en' ? a.sEn : a.s}</span>;
}

/* AUD F11 잔여 → AUD-3 (2026-09-22) — 링크 접근 상태 배지. 내용 검증(✓)과 별개의 축이다.
   dead(404/410)는 붉게, **확인 보류**(자동 요청이 차단·실패해 접근을 확인하지 못한 상태)는 회색으로 — 보류를 '정상' 으로 보이게 하지 않는다. */
const PENDING_STATUS = new Set(['bot-blocked-candidate', 'error', 'unchecked']);
function LinkStatus({ s }: { s: MaterialSource }) {
  const { lang } = useLang();
  const en = lang === 'en';
  if (s.link_status === 'dead') {
    const tip = en
      ? `Link did not respond (HTTP 404/410) on ${s.link_checked || 'last check'} — the citation stays, the address needs replacing.`
      : `링크 응답 없음(HTTP 404/410, 검사일 ${s.link_checked || '최근'}) — 인용은 유지되나 주소 교체가 필요합니다.`;
    return <span title={tip} data-testid="source-link-dead" className="text-[9px] px-1 mt-0.5 rounded border border-rose-300 bg-rose-50 text-rose-700 font-medium whitespace-nowrap flex-shrink-0 inline-flex items-center gap-0.5"><Unlink className="w-2.5 h-2.5" />{en ? 'link dead' : '링크 끊김'}</span>;
  }
  if (s.link_status && PENDING_STATUS.has(s.link_status)) {
    const why = s.link_status === 'unchecked'
      ? (en ? 'not checked yet' : '아직 검사하지 않음')
      : s.link_status === 'error'
        ? (en ? 'request failed (timeout/TLS/DNS)' : '요청 실패(타임아웃·TLS·DNS)')
        : (en ? 'automated request blocked; opens in a browser' : '자동 요청 차단 — 브라우저로는 열림');
    const tip = en
      ? `Link access unconfirmed: ${why}${s.link_checked ? ` (checked ${s.link_checked})` : ''}. This says nothing about whether the cited content is correct.`
      : `링크 접근 확인 보류: ${why}${s.link_checked ? ` (검사일 ${s.link_checked})` : ''}. 인용 내용의 정오와는 별개입니다.`;
    return <span title={tip} data-testid="source-link-pending" className="text-[9px] px-1 mt-0.5 rounded border border-border bg-muted text-muted-foreground whitespace-nowrap flex-shrink-0">{en ? 'access pending' : '접근 보류'}</span>;
  }
  return null;
}

export function SourcesList({ sources }: { sources: MaterialSource[] }) {
  if (!sources.length) {
    return <p className="text-xs text-muted-foreground italic py-2">No source information</p>;
  }
  return (
    <div className="space-y-1.5">
      {sources.map((s, i) =>
        s.url ? (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-1.5 p-2 rounded bg-muted/40 hover:bg-muted border border-border/30 transition-colors group"
          >
            <ExternalLink className="w-3 h-3 mt-0.5 text-accent flex-shrink-0" />
            <span className="text-[11px] text-foreground group-hover:text-accent break-words flex-1 leading-snug">{s.label}</span>
            <AuthorityBadge authority={s.authority} />
            <LinkStatus s={s} />
            {s.verified && <span title="Verified datasheet" className="mt-0.5"><Check className="w-3 h-3 text-emerald-500 flex-shrink-0" /></span>}
          </a>
        ) : (
          <div key={i} className="flex items-start gap-1.5 p-2 rounded bg-muted/30 border border-border/20">
            <BookText className="w-3 h-3 mt-0.5 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground flex-1 leading-snug">{s.label}</span>
            <AuthorityBadge authority={s.authority} />
          </div>
        )
      )}
    </div>
  );
}
