/*
 * R167 Phase C — Visual condition builder (Popover on desktop, Bottom Sheet on mobile).
 *
 * UX:
 *   - Property selector (드롭다운 grid)
 *   - Operator chips (< > <= >= = ~)
 *   - Value input + p10 / median / p90 chip 제안
 *   - "추가" → query string 에 token append → 부모 QueryBar 가 commit
 *
 * Mobile (≤ md): Bottom Sheet (full-width, 핸들바, swipe-down 닫기)
 * Desktop:       Popover (320px width)
 *
 * 단순성: 한 번에 한 조건만 추가. 여러 조건은 반복 클릭.
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PROP_ALIAS } from '@/lib/query-dsl';
import type { PropertyStats } from '@/lib/query-autocomplete';

interface QueryConditionBuilderProps {
  /** 현재 query string. */
  value: string;
  /** 새 조건을 추가했을 때 호출. (예: "밀도<8") */
  onAdd: (newValue: string) => void;
  /** Property typical-value 통계. */
  stats: Record<string, PropertyStats> | null;
}

type Op = '<' | '>' | '<=' | '>=' | '=' | '~';

interface PropOption {
  /** Canonical key (ranges 키). */
  key: string;
  /** 사용자 보일 라벨 (한국어 우선). */
  label: string;
  /** Query 에 삽입할 token. */
  token: string;
  /** 단위. */
  unit?: string;
}

/* Property 옵션 — PROP_ALIAS 에서 한국어 별칭 우선으로 dedupe. */
function buildPropOptions(): PropOption[] {
  const seenKey = new Set<string>();
  const out: PropOption[] = [];
  /* 한국어 → 영문 → 그리스 순으로 정렬해 첫 번째만 채택. */
  const entries = Object.entries(PROP_ALIAS).sort(([a], [b]) => {
    const aKo = /[가-힣]/.test(a) ? 0 : (/^[a-z]/.test(a) ? 1 : 2);
    const bKo = /[가-힣]/.test(b) ? 0 : (/^[a-z]/.test(b) ? 1 : 2);
    if (aKo !== bKo) return aKo - bKo;
    /* 같은 lang 내에서는 더 짧은 이름 우선 (e.g., 밀도 < 항복강도). */
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  });
  for (const [alias, info] of entries) {
    if (seenKey.has(info.key)) continue;
    seenKey.add(info.key);
    out.push({
      key: info.key,
      label: alias + (info.unit ? ` (${info.unit})` : ''),
      token: alias,
      unit: info.unit,
    });
  }
  return out;
}

const OPERATORS: Array<{ op: Op; label: string; hint: string }> = [
  { op: '<', label: '< 미만', hint: 'min < value' },
  { op: '>', label: '> 초과', hint: 'max > value' },
  { op: '<=', label: '≤ 이하', hint: 'min ≤ value' },
  { op: '>=', label: '≥ 이상', hint: 'max ≥ value' },
  { op: '=', label: '= 부근', hint: 'typical ±10%' },
  { op: '~', label: '~ 근사', hint: 'typical ±20%' },
];

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(min-width: 768px)').matches;
}

/* ─────────── 공용 form (popover/sheet 안 공통) ─────────── */

interface BuilderFormProps {
  stats: Record<string, PropertyStats> | null;
  onSubmit: (token: string) => void;
  onCancel: () => void;
}

function BuilderForm({ stats, onSubmit, onCancel }: BuilderFormProps) {
  const props = useMemo(buildPropOptions, []);
  const [prop, setProp] = useState<PropOption | null>(null);
  const [op, setOp] = useState<Op>('<');
  const [value, setValue] = useState('');

  const propStats = prop ? stats?.[prop.key] : null;

  const handleAdd = () => {
    if (!prop || !value.trim() || isNaN(parseFloat(value))) return;
    /* 자연어 변환 대신 직접 DSL token 생성. */
    onSubmit(`${prop.token}${op}${value.trim()}`);
    /* reset for next entry. */
    setValue('');
  };

  return (
    <div className="space-y-3">
      {/* Step 1 — Property */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">물성</label>
        <select
          value={prop?.key || ''}
          onChange={(e) => setProp(props.find((p) => p.key === e.target.value) || null)}
          /* R170 — 모바일 iOS auto-zoom 방지. */
          className="mt-1 w-full h-10 px-2.5 text-base md:text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">물성 선택…</option>
          {props.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2 — Operator */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">비교</label>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {OPERATORS.map((o) => (
            <button
              key={o.op}
              type="button"
              onClick={() => setOp(o.op)}
              className={`h-10 rounded border text-xs font-medium transition-colors ${
                op === o.op
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
              title={o.hint}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 3 — Value */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          값 {prop?.unit ? `(${prop.unit})` : ''}
        </label>
        <input
          type="number"
          step="any"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder={propStats ? `보통 ${propStats.p10} – ${propStats.p90}` : '숫자 입력…'}
          /* R170 — 모바일 iOS auto-zoom 방지 (16px 강제). md+ 부터 사이드디자인 14px. */
          className="mt-1 w-full h-10 px-2.5 text-base md:text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {propStats && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-muted-foreground self-center">자주:</span>
            {[
              { label: `${propStats.p10}`, detail: 'p10 (낮음)' },
              { label: `${propStats.median}`, detail: 'median (중간)' },
              { label: `${propStats.p90}`, detail: 'p90 (높음)' },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setValue(chip.label)}
                className="text-[11px] px-2 py-1 rounded border border-border bg-background hover:bg-muted/40 hover:border-accent transition-colors"
                title={chip.detail}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground px-3 py-2"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!prop || !value.trim() || isNaN(parseFloat(value))}
          className="text-xs font-semibold text-white bg-accent rounded px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90"
        >
          추가
        </button>
      </div>
    </div>
  );
}

/* ─────────── 메인: Popover (desktop) / Sheet (mobile) ─────────── */

export function QueryConditionBuilder({ value, onAdd, stats }: QueryConditionBuilderProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileViewport());
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsMobile(!mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleSubmit = (token: string) => {
    /* R169 — 기존 query 에 `; ` (세미콜론 + 공백) + token append. 명확한 시각적 구분. */
    const trimmed = value.trim();
    /* 기존 query 끝에 이미 `;` 가 있으면 중복 방지. */
    const base = trimmed.replace(/;\s*$/, '');
    const newValue = base ? `${base}; ${token}` : token;
    onAdd(newValue);
    setOpen(false);
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="조건 추가 (visual builder)"
            className="h-7 px-2 inline-flex items-center gap-1 text-[11px] font-medium rounded border border-border bg-background hover:border-accent hover:text-accent transition-colors"
          >
            <Plus className="w-3 h-3" />
            조건
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle>조건 추가</SheetTitle>
          </SheetHeader>
          <div className="mt-3">
            <BuilderForm stats={stats} onSubmit={handleSubmit} onCancel={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="조건 추가 (visual builder)"
          className="h-7 px-2 inline-flex items-center gap-1 text-[11px] font-medium rounded border border-border bg-background hover:border-accent hover:text-accent transition-colors"
        >
          <Plus className="w-3 h-3" />
          조건
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start" side="bottom">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold">조건 추가</p>
          <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="닫기">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <BuilderForm stats={stats} onSubmit={handleSubmit} onCancel={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
