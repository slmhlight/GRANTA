/*
 * R144b — Multi-constraint query bar.
 *
 * 한 줄 입력 → numeric / text / spec / category constraint 파싱 → filter.
 * Above filter sidebar 의 별도 row. 입력 우측에 (?) helper 가 도움말 popover 를 띄움.
 *
 * UX:
 *   - Enter / blur 시 parse → 결과 chip 표시 + filter 적용
 *   - 빈 입력 시 무효 (filter 영향 없음)
 *   - 잘못된 token 은 회색 chip "?" 으로 표시 (silent fail 회피)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle, X, Filter as FilterIcon } from 'lucide-react';
import { parseQuery, describeConstraint, QUERY_HELP_EXAMPLES, QUERY_HELP_PROPS, QUERY_HELP_NATURAL_EXAMPLES, type ParsedQuery } from '@/lib/query-dsl';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useT } from '@/lib/i18n';
/* R167 Phase B — Autocomplete dropdown. */
import { QueryAutocomplete } from '@/components/QueryAutocomplete';
import type { PropertyStats } from '@/lib/query-autocomplete';
/* R167 Phase C — Visual condition builder. */
import { QueryConditionBuilder } from '@/components/QueryConditionBuilder';

interface QueryBarProps {
  value: string;
  onChange: (value: string, parsed: ParsedQuery) => void;
  /** 결과 개수 (피드백) */
  matchedCount?: number;
  totalCount?: number;
}

export function QueryBar({ value, onChange, matchedCount, totalCount }: QueryBarProps) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();
  /* R167 Phase B — Korean IME composition 상태 (compositionstart/end 동안 dropdown 비활성). */
  const [isComposing, setIsComposing] = useState(false);
  /* R167 Phase B — input blur 시 dropdown 강제 닫기. */
  const [autocompleteClosed, setAutocompleteClosed] = useState(false);
  /* R167 Phase B — property-stats.json lazy load. */
  const [propertyStats, setPropertyStats] = useState<Record<string, PropertyStats> | null>(null);
  useEffect(() => {
    let cancel = false;
    const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    fetch(`${base}property-stats.json`).then((r) => r.ok ? r.json() : null).then((j) => { if (!cancel) setPropertyStats(j); }).catch(() => {});
    return () => { cancel = true; };
  }, []);

  // 외부에서 value 가 바뀌면 draft sync (preset apply 등)
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const parsed = useMemo(() => parseQuery(draft), [draft]);

  const commit = (s: string) => {
    const p = parseQuery(s);
    onChange(s, p);
  };

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2">
        <FilterIcon className="w-3.5 h-3.5 text-accent flex-shrink-0" />
        {/* R167 Phase C — Visual condition builder (desktop Popover / mobile Sheet). */}
        <QueryConditionBuilder
          value={draft}
          onAdd={(v) => { setDraft(v); commit(v); inputRef.current?.focus(); }}
          stats={propertyStats}
        />
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setAutocompleteClosed(false); }}
          onKeyDown={(e) => {
            /* R168 fix — autocomplete dropdown 이 Enter/Tab 을 잡으면 commit 막음. */
            if (e.defaultPrevented) return;
            if (e.key === 'Enter') commit(draft);
          }}
          onFocus={() => setAutocompleteClosed(false)}
          onBlur={() => { commit(draft); /* 약간의 지연 — autocomplete click 처리. */ setTimeout(() => setAutocompleteClosed(true), 150); }}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            /* IME 가 input 의 value 를 갱신한 직후 — draft 동기화. */
            setDraft(e.currentTarget.value);
          }}
          placeholder={t('query.placeholder')}
          /* R170 — 모바일 iOS Safari 의 auto-zoom 방지: 16px 이상 강제. md+ 부터 desktop 디자인 12px. */
          className="flex-1 bg-transparent text-[16px] md:text-[12px] font-mono outline-none placeholder:text-muted-foreground/60 min-w-0"
          autoComplete="off"
          spellCheck={false}
          aria-label="Multi-constraint query"
        />
        {/* R167 Phase B — Autocomplete dropdown. */}
        <QueryAutocomplete
          inputRef={inputRef}
          value={draft}
          onApply={(newVal, _newCursor) => { setDraft(newVal); /* commit 은 blur/enter 에서. */ }}
          stats={propertyStats}
          isComposing={isComposing}
          forceClose={autocompleteClosed}
        />
        {draft && (
          <button
            onClick={() => { setDraft(''); commit(''); inputRef.current?.focus(); }}
            className="text-muted-foreground hover:text-foreground text-xs"
            aria-label="Clear query"
            type="button"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="text-muted-foreground hover:text-accent"
              aria-label="Query syntax help"
              type="button"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(384px,calc(100vw-1rem))] text-[11px] p-3" align="end">
            <p className="font-semibold mb-1.5 text-[12px]">{t('query.help.title')}</p>
            <p className="text-muted-foreground mb-2 leading-relaxed">
              {t('query.help.intro')}
            </p>
            <p className="font-semibold mt-2 mb-1">{t('query.help.examples')}</p>
            <ul className="space-y-0.5 font-mono text-[10px] text-foreground/85">
              {QUERY_HELP_EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    onClick={() => { setDraft(ex); commit(ex); inputRef.current?.focus(); }}
                    className="text-left hover:text-accent hover:underline"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
            {/* R167 Phase A — 자연어 한국어 예시 (밀도 8 미만 등). */}
            <p className="font-semibold mt-3 mb-1">자연어 (한국어)</p>
            <ul className="space-y-0.5 text-[10px] text-foreground/85">
              {QUERY_HELP_NATURAL_EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    onClick={() => { setDraft(ex); commit(ex); inputRef.current?.focus(); }}
                    className="text-left hover:text-accent hover:underline"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
            <p className="font-semibold mt-3 mb-1">{t('query.help.tokens')}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
              {QUERY_HELP_PROPS.map((p) => (
                <div key={p.token}>
                  <span className="font-mono text-accent">{p.token}</span>
                  <span className="text-muted-foreground"> — {p.means}{p.unit ? ` (${p.unit})` : ''}</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mt-3 text-[10px]">
              {t('query.help.rangeNote')}
            </p>
          </PopoverContent>
        </Popover>
      </div>

      {parsed.constraints.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-5">
          {parsed.constraints.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-mono"
              title="Click to remove"
            >
              {describeConstraint(c)}
              <button
                type="button"
                /* R170 — 모바일 터치 영역 확보: padding + flex center. ✕ 자체는 작지만 hit-area 24px. */
                className="inline-flex items-center justify-center w-6 h-6 -mr-1 hover:text-rose-700 active:bg-accent/20 rounded transition-colors"
                onClick={() => {
                  // Remove this constraint from the raw query by re-tokenizing (lossy but fine)
                  const others = parsed.constraints.filter((_, j) => j !== i).map((cc) => describeConstraint(cc).replace(/^"|"$/g, '"').replace(/\s/g, ''));
                  /* R169 — `;` 으로 join → chip remove 후에도 명확한 구분. */
                  const newRaw = others.join('; ');
                  setDraft(newRaw);
                  commit(newRaw);
                }}
                aria-label="Remove constraint"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {parsed.unknown.length > 0 && parsed.unknown.map((u, i) => (
            <span key={'u' + i} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-mono" title="Unrecognized token">
              ? {u}
            </span>
          ))}
          {matchedCount != null && totalCount != null && (
            <span className="ml-auto text-[10px] text-muted-foreground self-center whitespace-nowrap">
              {matchedCount.toLocaleString()} / {totalCount.toLocaleString()} {t('query.matched')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
