/*
 * 사례 시작 다이얼로그 — Guide에서 "이 사례로 앱 시작"을 누르면 열림.
 * 사례별 configurator의 입력 필드 + 단면 선택 + 라이브 미리보기를 보여주고,
 * "적용"하면 /?p=KEY&f.X=Y 형태로 Home에 baseline + 오버라이드 전달.
 */
import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Sigma } from 'lucide-react';
import { SCENARIO_PRESETS, encodeFiltersToParams, type ScenarioKey, type ConfigField, type CrossSection } from '@/lib/scenario-presets';

function NumberInput({ field, value, onChange }: { field: Extract<ConfigField, { type: 'number' }>; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="flex-1 min-w-0">
        <span className="text-foreground">{field.label}</span>
        {field.unit && <span className="text-muted-foreground ml-1 text-[11px]">({field.unit})</span>}
        {field.help && <span className="block text-[11px] text-muted-foreground">{field.help}</span>}
      </span>
      <input
        type="number"
        value={value}
        min={field.min} max={field.max} step={field.step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 h-7 text-right font-mono text-sm rounded border border-border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </label>
  );
}

function SelectInput({ field, value, onChange }: { field: Extract<ConfigField, { type: 'select' }>; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="flex-1 min-w-0">
        <span className="text-foreground">{field.label}</span>
        {field.help && <span className="block text-[11px] text-muted-foreground">{field.help}</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-44 h-7 text-sm rounded border border-border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-accent"
      >
        {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** 단면 SVG 미니 아이콘 (선택자 버튼용) */
function SectionIcon({ id }: { id: string }) {
  const c = 'stroke-accent';
  const fc = `fill-accent/15 ${c}`;
  switch (id) {
    case 'rect':
      return <svg viewBox="0 0 30 30" className="w-7 h-7"><rect x="10" y="6" width="10" height="18" className={fc} strokeWidth="1.5"/></svg>;
    case 'sq':
      return <svg viewBox="0 0 30 30" className="w-7 h-7"><rect x="9" y="9" width="12" height="12" className={fc} strokeWidth="1.5"/></svg>;
    case 'circ':
      return <svg viewBox="0 0 30 30" className="w-7 h-7"><circle cx="15" cy="15" r="9" className={fc} strokeWidth="1.5"/></svg>;
    case 'tube':
      return <svg viewBox="0 0 30 30" className="w-7 h-7"><circle cx="15" cy="15" r="11" className={fc} strokeWidth="1.5"/><circle cx="15" cy="15" r="6" className="fill-background stroke-accent" strokeWidth="1.3"/></svg>;
    case 'box':
      return <svg viewBox="0 0 30 30" className="w-7 h-7"><rect x="6" y="6" width="18" height="18" className={fc} strokeWidth="1.5"/><rect x="11" y="11" width="8" height="8" className="fill-background stroke-accent" strokeWidth="1.3"/></svg>;
    case 'ibeam':
      return <svg viewBox="0 0 30 30" className="w-7 h-7"><g className={fc} strokeWidth="1.4"><rect x="6" y="4" width="18" height="4"/><rect x="13" y="8" width="4" height="14"/><rect x="6" y="22" width="18" height="4"/></g></svg>;
    case 'channel':
      return <svg viewBox="0 0 30 30" className="w-7 h-7"><g className={fc} strokeWidth="1.4"><rect x="6" y="4" width="6" height="22"/><rect x="12" y="4" width="14" height="4"/><rect x="12" y="22" width="14" height="4"/></g></svg>;
    case 'tsec':
      return <svg viewBox="0 0 30 30" className="w-7 h-7"><g className={fc} strokeWidth="1.4"><rect x="4" y="6" width="22" height="5"/><rect x="13" y="11" width="4" height="13"/></g></svg>;
    case 'angle':
      return <svg viewBox="0 0 30 30" className="w-7 h-7"><g className={fc} strokeWidth="1.4"><polygon points="6,4 11,4 11,21 26,21 26,26 6,26"/></g></svg>;
    default:
      return null;
  }
}

export function ScenarioDialog({ scenarioKey, open, onOpenChange }: { scenarioKey: ScenarioKey | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [, navigate] = useLocation();
  const scenario = scenarioKey ? SCENARIO_PRESETS[scenarioKey] : null;
  const cfg = scenario?.configurator;

  // 입력 상태 — 사례가 바뀌면 default 로 초기화
  const initialValues: Record<string, number | string> = useMemo(() => {
    const v: Record<string, number | string> = {};
    if (!cfg) return v;
    for (const f of cfg.fields) v[f.id] = f.default;
    if (cfg.sections) for (const f of cfg.sections[0].dimFields) v[f.id] = (f as any).default;
    return v;
  }, [scenarioKey, cfg]);
  const [values, setValues] = useState<Record<string, number | string>>(initialValues);
  const [sectionId, setSectionId] = useState<string>(cfg?.sections?.[0]?.id ?? '');
  // 사례가 바뀌면 입력값을 default 로 리셋
  useEffect(() => { setValues(initialValues); setSectionId(cfg?.sections?.[0]?.id ?? ''); }, [scenarioKey]);

  const section: CrossSection | undefined = cfg?.sections?.find((s) => s.id === sectionId);

  // 라이브 계산
  const result = useMemo(() => {
    if (!cfg) return null;
    try { return cfg.compute(values, section); }
    catch { return null; }
  }, [cfg, values, section]);

  const apply = () => {
    if (!scenarioKey || !result) return;
    const qs = encodeFiltersToParams(result.filters);
    navigate(`/?p=${scenarioKey}${qs ? `&${qs}` : ''}`);
    onOpenChange(false);
  };

  if (!scenario || !cfg) return null;

  // 그룹별 필드 정렬
  const grouped: Record<string, ConfigField[]> = {};
  for (const f of cfg.fields) {
    const g = f.group || '기본';
    (grouped[g] = grouped[g] || []).push(f);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sigma className="w-4 h-4 text-accent" /> {scenario.label}</DialogTitle>
          <DialogDescription>{cfg.description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {/* 왼쪽: 입력 */}
          <div className="space-y-4">
            {Object.entries(grouped).map(([g, fs]) => (
              <div key={g}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-accent/80 mb-2">{g}</p>
                <div className="space-y-2">
                  {fs.map((f) => f.type === 'number'
                    ? <NumberInput key={f.id} field={f} value={Number(values[f.id] ?? f.default)} onChange={(v) => setValues((p) => ({ ...p, [f.id]: v }))} />
                    : <SelectInput key={f.id} field={f} value={String(values[f.id] ?? f.default)} onChange={(v) => setValues((p) => ({ ...p, [f.id]: v }))} />)}
                </div>
              </div>
            ))}

            {cfg.sections && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-accent/80 mb-2">단면 형상</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {cfg.sections.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => {
                        setSectionId(s.id);
                        // 단면 전환 시 그 단면의 dimField default 를 항상 적용 (이전 단면의 같은 id 값 carryover 방지)
                        setValues((p) => { const np = { ...p }; for (const f of s.dimFields) np[f.id] = (f as any).default; return np; });
                      }}
                      className={`flex flex-col items-center gap-0.5 p-1.5 rounded border text-[10px] transition-colors ${sectionId === s.id ? 'border-accent bg-accent/10 text-foreground' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                      title={s.label}
                    >
                      <SectionIcon id={s.id} />
                      <span className="truncate w-full text-center">{s.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
                {section && (
                  <div className="mt-2 space-y-2">
                    {section.dimFields.map((f) => f.type === 'number'
                      ? <NumberInput key={f.id} field={f} value={Number(values[f.id] ?? (f as any).default)} onChange={(v) => setValues((p) => ({ ...p, [f.id]: v }))} />
                      : null)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 오른쪽: 라이브 미리보기 */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">📐 산출 결과 (라이브)</p>
            {result ? (
              <dl className="text-sm space-y-1.5">
                {result.summary.map((s, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-2 border-b border-border/40 pb-1.5 last:border-0">
                    <dt className="text-foreground/70">{s.label}</dt>
                    <dd className="font-mono font-semibold text-foreground text-right">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground italic">입력값을 확인해 주세요.</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/40">
              위 값들이 좌측 <b>필터</b>에 자동 입력됩니다. Index는 차트 상단에서 골라주세요.
              {scenario.indexHint && <span className="block mt-1">권장 Index: <span className="font-mono text-accent">{scenario.indexHint}</span></span>}
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={apply} className="gap-1.5"><Play className="w-3.5 h-3.5" /> 적용하고 시작</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
