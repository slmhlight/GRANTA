/*
 * AUD Q03 (2026-09-22) — 옛 딥링크(?d=<legacy_id>)가 가리키는 entry 가 배포에서 제거됐을 때의 안내.
 *
 * 왜: 같은 ID 를 다른 재료에 재사용하지는 않지만(안정 ID 예약), 북마크·보고서의 ID 가 조용히 "없는 재료" 가 되면 과거 재현이 끊긴다.
 * build:data 가 내보내는 removed-ids.json(제거 원장 slim: 사유·날짜·대체 entry)을 읽어 사유와 대체 링크를 보여 준다.
 */
import { useEffect, useState } from 'react';
import { X, ArchiveX } from 'lucide-react';
import { useLang } from '@/lib/i18n';

export interface RemovedIdRecord {
  id: string; sid: string; name: string; kind: string; reason: string; on: string | null; ref: string | null;
  to: string | null; to_name: string | null; how: string | null;
}

let cache: Promise<RemovedIdRecord[]> | null = null;
/** removed-ids.json 을 한 번만 받는다(없으면 빈 배열). */
export function loadRemovedIds(): Promise<RemovedIdRecord[]> {
  if (!cache) {
    const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    cache = fetch(`${base}removed-ids.json`).then((r) => (r.ok ? r.json() : { removed: [] })).then((j) => (j.removed || []) as RemovedIdRecord[]).catch(() => []);
  }
  return cache;
}

export function RemovedIdNotice({ id, onOpen, onDismiss }: { id: string; onOpen: (legacyId: string) => void; onDismiss: () => void }) {
  const { lang } = useLang();
  const [rec, setRec] = useState<RemovedIdRecord | null | undefined>(undefined);
  useEffect(() => { let alive = true; loadRemovedIds().then((list) => { if (alive) setRec(list.find((r) => r.id === id) ?? null); }); return () => { alive = false; }; }, [id]);
  if (rec === undefined) return null;
  const en = lang === 'en';
  return (
    <div role="status" data-testid="removed-id-notice" className="mx-3 mt-2 rounded border border-amber-300 bg-amber-50 text-amber-900 text-[12px] px-3 py-2 flex items-start gap-2">
      <ArchiveX className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 leading-relaxed">
        {rec ? (
          <>
            <b>{en ? `Material ${id} (${rec.name}) was removed from the database` : `재료 ${id} (${rec.name}) 은(는) 데이터베이스에서 제거되었습니다`}</b>
            {rec.on ? ` · ${rec.on}` : ''}{rec.sid ? ` · ${rec.sid}` : ''}
            <div className="mt-0.5">{en ? 'Reason' : '사유'}: {rec.reason}</div>
            {rec.ref && <div className="text-[11px] opacity-80">{en ? 'Record' : '기록'}: {rec.ref}</div>}
            {rec.to ? (
              <div className="mt-1">
                {en ? (rec.how?.startsWith('declared') || rec.how?.includes('duplicate') ? 'Replacement' : 'Related entry (same alloy, different values)') : (rec.how?.startsWith('declared') || rec.how?.includes('duplicate') ? '대체 entry' : '참조 entry (같은 합금, 값은 다름)')}:{' '}
                <button type="button" className="underline font-medium hover:text-accent" onClick={() => onOpen(rec.to!)}>{rec.to_name || rec.to}</button>
              </div>
            ) : (
              <div className="mt-1">{en ? 'No replacement entry — the data had no verifiable source for this condition.' : '대체 entry 없음 — 이 조건의 값을 뒷받침할 검증 가능한 출처가 없었습니다.'}</div>
            )}
          </>
        ) : (
          <b>{en ? `Material ${id} was not found (unknown ID).` : `재료 ${id} 를 찾을 수 없습니다 (알 수 없는 ID).`}</b>
        )}
      </div>
      <button type="button" aria-label={en ? 'Dismiss' : '닫기'} onClick={onDismiss} className="p-0.5 rounded hover:bg-amber-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}
