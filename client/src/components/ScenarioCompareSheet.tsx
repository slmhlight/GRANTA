/*
 * B5 — 두 사례 동시 비교 Sheet.
 *
 * 사용자가 두 개의 설계 사례 (예: bracket vs gear)를 나란히 입력하고 산출 결과를 비교.
 * 각 panel 은 사례 picker + ScenarioConfigurator 입력 + 산출 결과를 자체 카드로 렌더.
 * 두 결과의 filter intersection 을 "두 사례 모두 적용" 으로 한 번에 Home 에 전달.
 */
import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Sigma, GitCompareArrows } from 'lucide-react';
import { SCENARIO_PRESETS, encodeFiltersToParams, type ScenarioKey, type ConfigField, type CrossSection } from '@/lib/scenario-presets';
import type { FilterState } from '@/hooks/useMaterialFilter';

/** 사례 panel 한 칸 — picker + 입력 + summary. Compare sheet 안에 2 개 렌더. */
function ScenarioColumn({ panelKey, label, scenarioKey, onScenarioChange }: {
  panelKey: 'L' | 'R';
  label: string;
  scenarioKey: ScenarioKey | null;
  onScenarioChange: (k: ScenarioKey | null) => void;
}) {
  const scenario = scenarioKey ? SCENARIO_PRESETS[scenarioKey] : null;
  const cfg = scenario?.configurator;
  const initialValues = useMemo(() => {
    const v: Record<string, number | string> = {};
    if (!cfg) return v;
    for (const f of cfg.fields) v[f.id] = f.default;
    if (cfg.sections) for (const f of cfg.sections[0].dimFields) v[f.id] = (f as any).default;
    return v;
  }, [scenarioKey, cfg]);
  const [values, setValues] = useState<Record<string, number | string>>(initialValues);
  const [sectionId, setSectionId] = useState<string>(cfg?.sections?.[0]?.id ?? '');
  useEffect(() => { setValues(initialValues); setSectionId(cfg?.sections?.[0]?.id ?? ''); }, [scenarioKey]);
  const section: CrossSection | undefined = cfg?.sections?.find((s) => s.id === sectionId);
  const result = useMemo(() => {
    if (!cfg) return null;
    try { return cfg.compute(values, section); }
    catch { return null; }
  }, [cfg, values, section]);

  // Picker for either side
  return (
    <div className="flex-1 min-w-0 flex flex-col border border-border/60 rounded-lg overflow-hidden bg-card">
      <div className="px-3 py-2 border-b border-border/60 bg-muted/30 flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">{label}</span>
        <Select value={scenarioKey ?? ''} onValueChange={(v) => onScenarioChange(v ? (v as ScenarioKey) : null)}>
          <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
            <SelectValue placeholder="사례 선택…" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(SCENARIO_PRESETS) as [ScenarioKey, typeof SCENARIO_PRESETS[ScenarioKey]][]).map(([k, s]) => (
              <SelectItem key={k} value={k} className="text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!scenario || !cfg ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-6 text-center">
          왼쪽의 드롭다운에서 비교할 사례를 선택하세요.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{cfg.description}</p>
          {/* 입력 — Compare 모드에서는 그룹 접기 없이 모두 표시 (단순화) */}
          <div className="space-y-2">
            {cfg.fields.map((f) => (
              <CompactInput key={f.id} field={f} value={values[f.id]} error={result?.fieldErrors?.[f.id]} onChange={(v) => setValues((p) => ({ ...p, [f.id]: v }))} />
            ))}
            {cfg.sections && (
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">단면 형상</label>
                <Select value={sectionId} onValueChange={(v) => {
                  setSectionId(v);
                  setValues((p) => {
                    const np: Record<string, number | string> = { ...p, _axis: 'strong' };
                    const s = cfg.sections!.find((x) => x.id === v);
                    if (s) for (const f of s.dimFields) np[f.id] = (f as any).default;
                    return np;
                  });
                }}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cfg.sections.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {section && (
                  <div className="mt-2 space-y-1.5">
                    {section.dimFields.map((f) => f.type === 'number'
                      ? <CompactInput key={f.id} field={f} value={values[f.id]} onChange={(v) => setValues((p) => ({ ...p, [f.id]: v }))} />
                      : null)}
                    {section.hasAxes && (
                      <div className="flex gap-1.5 mt-2">
                        {['strong', 'weak'].map((ax) => (
                          <button key={ax} type="button" onClick={() => setValues((p) => ({ ...p, _axis: ax }))} className={`flex-1 text-[10px] px-2 py-1 rounded border ${String(values._axis ?? 'strong') === ax ? 'border-accent bg-accent/15 text-foreground' : 'border-border text-muted-foreground'}`}>
                            {ax === 'strong' ? '강축' : '약축'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Summary card */}
          <div className="bg-emerald-50/40 rounded-lg border border-emerald-200 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 mb-1.5">📐 산출 결과</p>
            {result ? (
              <dl className="text-[11px] space-y-1">
                {result.summary.map((s, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-2 border-b border-emerald-200/40 pb-1 last:border-0">
                    <dt className="text-foreground/70 leading-tight">{s.label}</dt>
                    <dd className="font-mono text-foreground text-right leading-tight">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-muted-foreground italic">입력값 확인</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** ScenarioColumn 안에서 쓰는 콤팩트 입력 — 라벨 위 / 입력 아래 stacking. */
function CompactInput({ field, value, error, onChange }: { field: ConfigField; value: number | string | undefined; error?: string; onChange: (v: number | string) => void }) {
  if (field.type === 'select') {
    return (
      <label className="block text-[11px]">
        <span className="text-muted-foreground block leading-tight">{field.label}</span>
        <select value={String(value ?? field.default)} onChange={(e) => onChange(e.target.value)} className="mt-0.5 w-full h-7 text-[11px] rounded border border-border bg-background px-1.5">
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="block text-[11px]">
      <span className="text-muted-foreground block leading-tight">
        {field.label}{field.unit && <span className="text-[10px] ml-1">({field.unit})</span>}
      </span>
      <input
        type="number"
        value={Number(value ?? field.default)}
        min={field.min} max={field.max} step={field.step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`mt-0.5 w-full h-7 text-right font-mono text-[11px] rounded border ${error ? 'border-rose-500 bg-rose-50' : 'border-border bg-background'} px-2 focus:outline-none focus:ring-1 focus:ring-accent`}
      />
      {error && <p className="text-[10px] text-rose-600 mt-0.5">⚠ {error}</p>}
    </label>
  );
}

/** 두 filter 의 교집합 — 두 사례 모두 만족하는 후보만 남기기 위해 더 엄격한 쪽을 채택. */
function intersectFilters(a: Partial<FilterState>, b: Partial<FilterState>): Partial<FilterState> {
  const out: Partial<FilterState> = { ...a };
  for (const k of Object.keys(b) as (keyof FilterState)[]) {
    const av = (a as any)[k], bv = (b as any)[k];
    if (!av) { (out as any)[k] = bv; continue; }
    if (!bv) continue;
    // 범위 [min, max] 교집합 — 더 큰 min, 더 작은 max
    if (Array.isArray(av) && av.length === 2 && typeof av[0] === 'number') {
      (out as any)[k] = [Math.max(av[0], bv[0]), Math.min(av[1], bv[1])];
    } else if (Array.isArray(av) && Array.isArray(bv)) {
      // 문자열 배열 (categories/processes/corrosion) — 교집합
      (out as any)[k] = av.filter((x: string) => bv.includes(x));
    }
  }
  return out;
}

export function ScenarioCompareSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [, navigate] = useLocation();
  const [leftKey, setLeftKey] = useState<ScenarioKey | null>(null);
  const [rightKey, setRightKey] = useState<ScenarioKey | null>(null);

  const applyLeft = () => applyOne(leftKey);
  const applyRight = () => applyOne(rightKey);
  const applyOne = (key: ScenarioKey | null) => {
    if (!key) return;
    const scenario = SCENARIO_PRESETS[key];
    const cfg = scenario.configurator;
    if (!cfg) return;
    // Default values used — for full configurator-derived filter the user should use single Sheet.
    // Compare sheet 모드에서는 기본 필터만 적용 (사용자 입력은 결과 비교용).
    const qs = encodeFiltersToParams(scenario.filters || {});
    navigate(`/?p=${key}${qs ? `&${qs}` : ''}`);
    onOpenChange(false);
  };

  const applyBoth = () => {
    if (!leftKey || !rightKey) return;
    const aFilters = SCENARIO_PRESETS[leftKey].filters || {};
    const bFilters = SCENARIO_PRESETS[rightKey].filters || {};
    const merged = intersectFilters(aFilters, bFilters);
    const qs = encodeFiltersToParams(merged);
    // 첫 사례만 banner 표시 (URL 의 p 파라미터). 사용자가 두 사례 비교 의도를 명시했음.
    navigate(`/?p=${leftKey}${qs ? `&${qs}` : ''}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[1100px] flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border/60 pb-3">
          <SheetTitle className="flex items-center gap-2 pr-8">
            <GitCompareArrows className="w-4 h-4 text-accent" /> 두 사례 동시 비교
          </SheetTitle>
          <SheetDescription>
            두 사례를 옆에 두고 산출치를 비교 — 예: bracket 외팔보 vs gear 굽힘 → 어느 σy 가 더 엄격한지 확인.
            <span className="block mt-1 text-[11px]">"두 사례 모두 적용" 시 두 필터의 <b>교집합</b> 만 통과.</span>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
            <ScenarioColumn panelKey="L" label="좌측 (A)" scenarioKey={leftKey} onScenarioChange={setLeftKey} />
            <ScenarioColumn panelKey="R" label="우측 (B)" scenarioKey={rightKey} onScenarioChange={setRightKey} />
          </div>
        </div>
        <SheetFooter className="border-t border-border/60 mt-0 flex-row justify-between gap-2 p-3 sm:p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-shrink-0">취소</Button>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <Button variant="outline" onClick={applyLeft} disabled={!leftKey} className="gap-1 text-xs">
              <Play className="w-3 h-3" /> A 만 적용
            </Button>
            <Button variant="outline" onClick={applyRight} disabled={!rightKey} className="gap-1 text-xs">
              <Play className="w-3 h-3" /> B 만 적용
            </Button>
            <Button onClick={applyBoth} disabled={!leftKey || !rightKey} className="gap-1.5 text-xs">
              <Sigma className="w-3.5 h-3.5" /> A ∩ B 적용 (교집합)
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
