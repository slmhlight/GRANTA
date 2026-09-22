/*
 * AUD-3 D02 (2026-09-22) — "지금 보고 있는 결과가 전량 데이터로 계산된 것인가".
 *
 * 앱은 slim 인덱스(대표값만)로 먼저 그리고 카테고리 샤드로 채운다. 범위(min/max)나 샤드 전용 필드를 읽는 검색·필터는
 * 샤드가 오기 전에는 **다른 답**을 낸다(실측: cp>500 이 0 → 586, yield>500 이 386 → 402). 그 사실을 숨기지 않고
 * 로딩 중임을 말하고, 샤드 로딩이 실패했으면 재시도를 제안한다 — 근거 없는 '0 건' 을 확정으로 보여 주지 않는다.
 */
import { Loader2, RefreshCw } from 'lucide-react';
import { useLang } from '@/lib/i18n';

export function PartialDataNotice({ failed, onRetry }: { failed: string[]; onRetry: () => void }) {
  const { lang } = useLang();
  const en = lang === 'en';
  const hasFailure = failed.length > 0;
  return (
    <div
      role="status"
      data-testid="partial-data-notice"
      className={`mx-3 mt-2 rounded border px-3 py-1.5 text-[11px] flex items-center gap-2 ${hasFailure ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-sky-300 bg-sky-50 text-sky-900'}`}
    >
      {hasFailure ? <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" /> : <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />}
      <span className="flex-1 leading-relaxed">
        {hasFailure
          ? (en
            ? `Full data for ${failed.join(', ')} failed to load — this query reads value ranges, so the result below is incomplete.`
            : `${failed.join(', ')} 상세 데이터를 불러오지 못했습니다 — 이 검색은 값의 범위를 읽으므로 아래 결과는 아직 전량이 아닙니다.`)
          : (en
            ? 'This query reads value ranges, which live in the per-category data still loading — the result is not final yet.'
            : '이 검색은 값의 범위를 읽습니다. 범위는 카테고리별 상세 데이터에 있고 지금 불러오는 중이라, 아래 결과는 아직 확정이 아닙니다.')}
      </span>
      {hasFailure && (
        <button type="button" onClick={onRetry} className="px-2 py-0.5 rounded border border-rose-300 hover:bg-rose-100 font-medium whitespace-nowrap">
          {en ? 'Retry' : '다시 시도'}
        </button>
      )}
    </div>
  );
}
