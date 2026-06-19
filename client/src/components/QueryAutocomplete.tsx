/*
 * R167 Phase B — QueryBar autocomplete dropdown.
 *
 * Headless 디자인 — 부모 (QueryBar) 가 input ref + value 관리, 본 컴포넌트는 dropdown 만 그림.
 *
 * 핵심 동작:
 *   - input + cursor → suggest() → suggestion 목록
 *   - 한국어 IME composition 중에는 dropdown 비활성 (isComposing prop)
 *   - 모바일에서 가상 키보드가 input 가리면 dropdown 을 input 위에 배치 (visualViewport API)
 *   - Up/Down/Enter/Esc 키보드 nav (desktop)
 *   - 터치 친화 — 각 row 최소 44px 높이
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { suggest, applySuggestion, type Suggestion, type PropertyStats } from '@/lib/query-autocomplete';

interface QueryAutocompleteProps {
  /** 부모 input 의 ref — dropdown 위치 계산에 사용. */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** 현재 input value. */
  value: string;
  /** Suggestion 선택 시 부모에 새 값 + cursor 전달. */
  onApply: (newValue: string, newCursor: number) => void;
  /** Property typical stats (autocomplete value-hint 용). */
  stats: Record<string, PropertyStats> | null;
  /** Korean IME composition 중 여부 (true → dropdown 비활성). */
  isComposing: boolean;
  /** 외부에서 강제로 닫기 (예: blur 후). */
  forceClose?: boolean;
}

export function QueryAutocomplete({ inputRef, value, onApply, stats, isComposing, forceClose }: QueryAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; placement: 'above' | 'below' } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Suggestion 계산 — cursor 위치는 input 의 selectionStart. */
  const suggestions = useMemo(() => {
    if (isComposing || forceClose) return [];
    const el = inputRef.current;
    if (!el) return [];
    const cursor = el.selectionStart ?? value.length;
    return suggest(value, cursor, stats);
  }, [value, isComposing, forceClose, stats, inputRef]);

  /* Suggestion 이 있고 input focus 일 때만 표시. */
  useEffect(() => {
    setOpen(suggestions.length > 0);
    setActiveIdx(0);
  }, [suggestions]);

  /* Position 계산 — visualViewport 고려 (모바일 가상 키보드). */
  const recalcPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) { setPosition(null); return; }
    const rect = el.getBoundingClientRect();
    /* visualViewport 가 있으면 (모바일 Safari/Chrome) 키보드 위 영역만 사용 가능. */
    const vv = window.visualViewport;
    const viewportHeight = vv ? vv.height : window.innerHeight;
    /* dropdown 예상 높이 (40vh max). */
    const estimatedHeight = Math.min(viewportHeight * 0.4, 280);
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    /* 키보드가 input 을 가릴 수도 있음 → 가능 공간이 dropdown 보다 작으면 위쪽으로 */
    const placement: 'above' | 'below' = spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove ? 'below' : 'above';
    setPosition({
      top: placement === 'below' ? rect.bottom + 4 : rect.top - estimatedHeight - 4,
      left: rect.left,
      width: Math.min(rect.width, 360),
      placement,
    });
  }, [inputRef]);

  useEffect(() => {
    if (!open) return;
    recalcPosition();
    const handler = () => recalcPosition();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    window.visualViewport?.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
      window.visualViewport?.removeEventListener('resize', handler);
    };
  }, [open, recalcPosition, value]);

  /* R210 B11 — handleSelect 를 사용처(키보드 useEffect) 위로 이동 (no-use-before-define).
     props/state/import 에만 의존하므로 위치 이동 안전. */
  const handleSelect = (s: Suggestion) => {
    const el = inputRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const { newInput, newCursor } = applySuggestion(value, cursor, s);
    onApply(newInput, newCursor);
    /* focus 유지 + cursor 위치 복원 (다음 tick). */
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newCursor, newCursor);
    });
  };

  /* 키보드 nav (desktop). */
  useEffect(() => {
    if (!open) return;
    const el = inputRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Tab' || (e.key === 'Enter' && suggestions[activeIdx])) {
        e.preventDefault();
        const sel = suggestions[activeIdx];
        if (sel) handleSelect(sel);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open, suggestions, activeIdx]);

  if (!open || !position || suggestions.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-[60] bg-popover text-popover-foreground border border-border rounded-md shadow-lg overflow-auto"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: '40vh',
      }}
      onMouseDown={(e) => e.preventDefault() /* prevent blur on input */}
    >
      {/* 모바일에서 닫기 버튼 — touch-only 환경 대비. */}
      <div className="md:hidden flex items-center justify-between px-3 py-1.5 border-b border-border/40 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>추천</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground text-xs"
          aria-label="자동완성 닫기"
        >
          닫기
        </button>
      </div>
      <ul role="listbox" className="py-1">
        {suggestions.map((s, idx) => (
          <li
            key={s.kind + ':' + s.insert + ':' + idx}
            role="option"
            aria-selected={idx === activeIdx}
            onClick={() => handleSelect(s)}
            onMouseEnter={() => setActiveIdx(idx)}
            className={`flex items-center justify-between gap-3 px-3 cursor-pointer transition-colors ${
              idx === activeIdx ? 'bg-accent/10 text-accent' : 'hover:bg-muted/50'
            }`}
            style={{ minHeight: 44 /* HIG touch target */ }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-mono truncate">
                <span className={`text-[9px] uppercase tracking-wider mr-1.5 ${
                  s.kind === 'property' ? 'text-emerald-600'
                  : s.kind === 'operator' ? 'text-amber-600'
                  : s.kind === 'value-hint' ? 'text-sky-600'
                  : 'text-violet-600'
                }`}>
                  {s.kind === 'property' ? 'P' : s.kind === 'operator' ? 'OP' : s.kind === 'value-hint' ? 'V' : 'PF'}
                </span>
                {s.label}
              </p>
              {s.detail && (
                <p className="text-[10px] text-muted-foreground truncate">{s.detail}</p>
              )}
            </div>
            {idx === activeIdx && (
              <span className="text-[9px] text-muted-foreground hidden md:inline">↵ Tab</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
