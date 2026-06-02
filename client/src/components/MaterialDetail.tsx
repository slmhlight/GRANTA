/*
 * AM Materials Explorer — Material Detail Panel
 * Range-aware: shows typical value + min–max range (n data points) and clickable
 * source citations (verified datasheet URLs where available).
 */

import { X, Plus, Check, ExternalLink, Layers, Atom, Wrench, FlaskConical, BookText, Coins, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Material, PropertyRange, MaterialSource } from '@/lib/materials';
import { MECHANICAL_PROPERTIES, PHYSICAL_PROPERTIES, COST_PROPERTIES } from '@/lib/materials';
import { TempCurveChart } from '@/components/TempCurveChart';
import { CreepRuptureChart } from '@/components/CreepRuptureChart';
import { recommendedCoatings } from '@/lib/coatings';
import { useT, useLang } from '@/lib/i18n';
import { familyColor } from '@/lib/material-colors';
import { formatPrice, loadUnitSystem } from '@/lib/unit-convert';

interface MaterialDetailProps {
  material: Material | null;
  compareList: string[];
  onToggleCompare: (id: string) => void;
  onClose: () => void;
  dragHandleProps?: { onPointerDown?: (e: any) => void }; // when floating, makes the header a drag handle
  floating?: boolean;
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 2 : 1));

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  curated: { label: 'Curated · multi-vendor', cls: 'bg-accent/15 text-accent border-accent/30' },
  am_vendor: { label: 'AM vendor data', cls: 'bg-violet-500/15 text-violet-600 border-violet-500/30' },
  generic: { label: 'Generic reference', cls: 'bg-muted text-muted-foreground border-border' },
  reference: { label: 'Reference data', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
};

function RangeRow({ label, range, fallback, unit }: { label: string; range?: PropertyRange | null; fallback?: number | string | null; unit: string }) {
  // R40b — price 표시 시 lang/unitSystem 에 따라 USD/KRW + kg/lb 자동 변환.
  const { lang } = useLang();
  const isPrice = /USD\//.test(unit);
  const priceUnit: 'kg' | 'cm3' = unit.includes('cm³') || unit.includes('cm3') ? 'cm3' : 'kg';
  const sys = isPrice ? loadUnitSystem() : null;

  const typical = range?.typical ?? (typeof fallback === 'number' ? fallback : null);
  const hasRange = !!range && range.max > range.min;
  if (typical == null) {
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground/40">—</span>
      </div>
    );
  }
  // confidence 단계별 뱃지: 'measured' (회색 n=N) · 'handbook' (파랑) · 'class' (앰버 추정) · 'derived' (붉은 ≈UTS)
  const conf = range?.confidence;
  const confBadge: Record<string, { label: string; cls: string; tip: string }> = {
    measured: { label: `n=${range?.n ?? 0}`, cls: 'text-foreground/50', tip: '실측 데이터 다수' },
    handbook: { label: '핸드북', cls: 'text-sky-600', tip: '표준 데이터시트 기반' },
    class: { label: 'class', cls: 'text-amber-600', tip: '재료 클래스 대표값 (handbook 평균)' },
    derived: { label: '≈UTS', cls: 'text-rose-500', tip: '다른 물성에서 유도 (예: 피로 = UTS·비율)' },
  };
  const badge = conf ? confBadge[conf] : null;
  // price 표시는 formatPrice 사용 — 단위 라벨까지 포함된 string 반환.
  const typicalStr = isPrice && sys ? formatPrice(typical, lang, sys, priceUnit) : `${fmt(typical)}`;
  const rangeMinStr = isPrice && sys ? formatPrice(range!.min, lang, sys, priceUnit) : fmt(range!.min);
  const rangeMaxStr = isPrice && sys ? formatPrice(range!.max, lang, sys, priceUnit) : fmt(range!.max);
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
      <div className="text-right">
        <span className="font-mono text-xs font-medium text-foreground">{typicalStr}</span>
        {!isPrice && <span className="text-muted-foreground font-normal text-[11px]"> {unit}</span>}
        {badge && (
          <span className={`ml-1 text-[10px] ${badge.cls}`} title={badge.tip}>{badge.label}</span>
        )}
        {hasRange && (
          <div className="text-[10px] font-mono text-muted-foreground/70 leading-tight">
            {rangeMinStr}–{rangeMaxStr}
          </div>
        )}
      </div>
    </div>
  );
}

function SourcesList({ sources }: { sources: MaterialSource[] }) {
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
            {s.verified && <span title="Verified datasheet"><Check className="w-3 h-3 text-emerald-500 flex-shrink-0" /></span>}
          </a>
        ) : (
          <div key={i} className="flex items-center gap-1.5 p-2 rounded bg-muted/30 border border-border/20">
            <BookText className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
          </div>
        )
      )}
    </div>
  );
}

function CompositionDisplay({ material }: { material: Material }) {
  const composition = material.composition;

  // Array of [element, range] pairs
  if (Array.isArray(composition) && composition.length > 0) {
    return (
      <div className="space-y-3">
        <div className="text-xs font-semibold text-foreground/80 mb-2">Chemical Composition (wt%)</div>
        <div className="grid grid-cols-2 gap-2">
          {composition.map((item, i) => {
            if (!Array.isArray(item) || item.length < 2) return null;
            const [element, range] = item;
            return (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border/30">
                <span className="text-xs font-semibold text-foreground">{element}</span>
                <span className="text-xs font-mono text-muted-foreground">{String(range)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Object dict with string range values ("16.0~18.0", "balance", "≤2.0") or numbers
  if (typeof composition === 'object' && !Array.isArray(composition)) {
    const entries = Object.entries(composition).filter(([_, v]) => v !== null && v !== undefined && v !== '' && v !== '0' && v !== 0);
    if (entries.length === 0) {
      return <p className="text-xs text-muted-foreground italic py-4 text-center">Chemical composition data not available</p>;
    }
    entries.sort((a, b) => (a[0] as string).localeCompare(b[0] as string));
    return (
      <div className="space-y-3">
        <div className="text-xs font-semibold text-foreground/80 mb-2">Chemical Composition (wt%)</div>
        <div className="grid grid-cols-2 gap-2">
          {entries.map(([element, range]) => (
            <div key={element} className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border/30">
              <span className="text-xs font-semibold text-foreground">{element}</span>
              <span className="text-xs font-mono text-muted-foreground">{String(range)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <p className="text-xs text-muted-foreground italic py-4 text-center">Chemical composition data not available</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">{label}</div>
      <div className="text-xs text-foreground">{children}</div>
    </div>
  );
}

export function MaterialDetail({ material, compareList, onToggleCompare, onClose, dragHandleProps, floating }: MaterialDetailProps) {
  const t = useT();
  if (!material) return null;

  const isCompared = compareList.includes(material.id);
  const tier = material.tier ? TIER_BADGE[material.tier] : null;
  const sources: MaterialSource[] = material.sources ?? (material.source ? [{ label: material.source, url: null, verified: false }] : []);
  const ranges = material.ranges ?? {};
  const meta = (material.meta ?? {}) as Record<string, any>;
  const manufacturers = material.manufacturers ?? (material.manufacturer ? [material.manufacturer] : []);
  const processes = material.processes ?? (material.process ? [material.process] : []);

  const famColor = familyColor(material);
  return (
    <div className="h-full w-full bg-background overflow-hidden flex flex-col">
      {/* Family color bar at very top */}
      <div className="h-1.5 flex-shrink-0" style={{ background: famColor }} />
      {/* Header (drag handle when floating) */}
      <div {...dragHandleProps} className={`flex items-start justify-between p-4 border-b border-border/50 flex-shrink-0 ${floating ? 'cursor-move select-none' : ''}`}>
        <div className="flex-1 min-w-0 flex items-start gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ring-1 ring-background" style={{ background: famColor }} />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground leading-tight">{material.name}</h2>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{material.subcategory}</p>
            {tier && (
              <span className={`inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded border font-medium ${tier.cls}`}>{tier.label}</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="ml-2 p-1 hover:bg-muted rounded transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-border/50">
          <Button onClick={() => onToggleCompare(material.id)} variant={isCompared ? 'default' : 'outline'} size="sm" className="w-full">
            {isCompared ? <><Check className="w-3 h-3 mr-1" />In Compare</> : <><Plus className="w-3 h-3 mr-1" />Add to Compare</>}
          </Button>
        </div>

        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent p-0 h-auto">
            <TabsTrigger value="properties" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-3 py-2">
              <Layers className="w-3 h-3 mr-1" />{t('detail.properties')}
            </TabsTrigger>
            <TabsTrigger value="composition" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-3 py-2">
              <Atom className="w-3 h-3 mr-1" />{t('detail.composition')}
            </TabsTrigger>
            <TabsTrigger value="process" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-3 py-2">
              <Wrench className="w-3 h-3 mr-1" />{t('detail.process')}
            </TabsTrigger>
          </TabsList>

          {/* Properties */}
          <TabsContent value="properties" className="p-4 space-y-4">
            <p className="text-[10px] text-muted-foreground/60 -mt-1">Value = typical · sub-line = min–max across {meta.vendor_count ? `${meta.vendor_count} vendors` : 'conditions'}</p>
            {/* 신뢰도 뱃지 범례 */}
            <div className="rounded border border-border/50 bg-muted/20 p-2 text-[10px] flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-foreground/70 font-semibold">{t('detail.confidence')}:</span>
              <span><span className="text-foreground/50">n=N</span> {t('detail.confidence.measured')}</span>
              <span><span className="text-sky-600">handbook</span> {t('detail.confidence.handbook')}</span>
              <span><span className="text-amber-600">class</span> {t('detail.confidence.class')}</span>
              <span><span className="text-rose-500">≈UTS</span> {t('detail.confidence.derived')}</span>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1"><FlaskConical className="w-3 h-3" />Mechanical Properties</h3>
              <div className="space-y-1">
                {MECHANICAL_PROPERTIES.map(prop => (
                  <RangeRow key={prop.key} label={prop.label} unit={prop.unit} range={ranges[prop.key as string]} fallback={material[prop.key as keyof Material] as number | string | null} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1"><Layers className="w-3 h-3" />Physical Properties</h3>
              <div className="space-y-1">
                {PHYSICAL_PROPERTIES.map(prop => (
                  <RangeRow key={prop.key} label={prop.label} unit={prop.unit} range={ranges[prop.key as string]} fallback={material[prop.key as keyof Material] as number | string | null} />
                ))}
              </div>
            </div>
            {COST_PROPERTIES.some(p => material[p.key as keyof Material] != null) && (
              <div>
                <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1"><Coins className="w-3 h-3" />Cost <span className="text-[10px] font-normal text-muted-foreground/60">(approx. market)</span></h3>
                <div className="space-y-1">
                  {COST_PROPERTIES.map(prop => (
                    <RangeRow key={prop.key} label={prop.label} unit={prop.unit} range={ranges[prop.key as string]} fallback={material[prop.key as keyof Material] as number | string | null} />
                  ))}
                </div>
              </div>
            )}
            {material.elevated_temp && material.elevated_temp.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1"><Thermometer className="w-3 h-3" />{t('detail.tempCurve.title')}</h3>
                <TempCurveChart series={[{ name: material.name, color: '#0066CC', points: material.elevated_temp }]} mode="single" height={200} />
                <table className="w-full text-[11px] mt-2">
                  <thead><tr className="text-muted-foreground"><th className="text-left font-normal py-0.5">Temp</th><th className="text-right font-normal">σy (MPa)</th><th className="text-right font-normal">UTS (MPa)</th><th className="text-right font-normal">E (GPa)</th></tr></thead>
                  <tbody>
                    {material.elevated_temp.map((e) => (
                      <tr key={e.temp} className="border-t border-border/30">
                        <td className="py-0.5 font-mono">{e.temp}°C</td>
                        <td className="text-right font-mono">{e.ys ?? '—'}</td>
                        <td className="text-right font-mono">{e.uts ?? '—'}</td>
                        <td className="text-right font-mono text-emerald-700">{e.E ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* R20: Creep rupture (log–log, one line per temperature) */}
            {material.creep_rupture && material.creep_rupture.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1">
                  <Thermometer className="w-3 h-3" />{t('detail.creep.title')}
                  <span className="ml-auto text-[10px] text-muted-foreground">{material.creep_rupture.length} {t('detail.creep.dataPts')}</span>
                </h3>
                <CreepRuptureChart points={material.creep_rupture} height={200} />
                <p className="text-[10px] text-muted-foreground mt-1">{t('detail.creep.source')}</p>
              </div>
            )}
            <div>
              <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1">
                <BookText className="w-3 h-3" />Sources & Datasheets
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">{sources.length}</span>
              </h3>
              <SourcesList sources={sources} />
            </div>
          </TabsContent>

          {/* Composition */}
          <TabsContent value="composition" className="p-4">
            <CompositionDisplay material={material} />
          </TabsContent>

          {/* Process */}
          <TabsContent value="process" className="p-4 space-y-3">
            {material.aliases && material.aliases.length > 0 && (
              <Field label="Designations / a.k.a. (ISO·ASTM·JIS·DIN·KS·UNS)">
                <div className="flex flex-wrap gap-1">
                  {material.aliases.map((a) => (
                    <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border/40 font-mono">{a}</span>
                  ))}
                </div>
              </Field>
            )}
            {material.families && material.families.length > 0 && (
              <Field label="Families">
                <div className="flex flex-wrap gap-1">
                  {material.families.map((f) => (
                    <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30">{f}</span>
                  ))}
                </div>
              </Field>
            )}
            {material.heat_treatment && <Field label="Condition / heat treatment">{material.heat_treatment}</Field>}
            {(material.corrosion_resistance || material.machinability || material.weldability) && (
              <Field label="Fabrication & durability">
                <div className="space-y-0.5 text-[11px]">
                  {material.corrosion_resistance != null && material.corrosion_resistance !== '' && <div>Corrosion: <span className="font-medium text-foreground">{String(material.corrosion_resistance)}</span></div>}
                  {material.machinability && <div>Machinability: <span className="font-medium text-foreground">{material.machinability}</span></div>}
                  {material.weldability && <div>Weldability: <span className="font-medium text-foreground">{material.weldability}</span></div>}
                </div>
              </Field>
            )}
            <Field label="Process">
              <div className="flex flex-wrap gap-1">
                {processes.length ? processes.map(p => (
                  <Badge key={p} variant="secondary" className="bg-accent/10 text-accent border-accent/30">{p}</Badge>
                )) : <span className="text-muted-foreground italic">Not available</span>}
              </div>
            </Field>
            <Field label="Manufacturer / Vendor">{manufacturers.length ? manufacturers.join(', ') : '—'}</Field>
            {material.machines && material.machines.length > 0 && <Field label="Machines">{material.machines.join(', ')}</Field>}
            {meta.heat_treatments && (meta.heat_treatments as string[]).length > 0 && <Field label="Heat treatments">{(meta.heat_treatments as string[]).join(', ')}</Field>}
            {meta.applications && <Field label="Applications">{String(meta.applications)}</Field>}
            {(meta.anisotropy || meta.anisotropic) && (
              <div className={`mt-2 rounded border p-2 text-[12px] leading-relaxed ${meta.anisotropy_reduced ? 'border-emerald-400/40 bg-emerald-50/60' : 'border-amber-400/40 bg-amber-50/60'}`}>
                <b className={meta.anisotropy_reduced ? 'text-emerald-700' : 'text-amber-700'}>{meta.anisotropy_reduced ? 'ℹ HIP 처리 — 이방성 감소:' : '⚠ AM 이방성 주의:'}</b> {String(meta.anisotropy_note || 'AM 빌드 방향(XY vs Z)에 따라 σy·연신율·피로가 ~10–30% 차이날 수 있습니다. 데이터시트의 방향·후처리(HIP·열처리) 조건을 반드시 확인하세요.')}
              </div>
            )}
            {/* R17: RoHS / SVHC 우려 — 자동 검출된 항목 노출. */}
            {(material.rohs_compliant === false || (material.svhc_concerns && material.svhc_concerns.length > 0)) && (
              <div className="mt-2 rounded border border-rose-400/40 bg-rose-50/60 p-2 text-[11px] leading-relaxed">
                <p className="font-semibold text-rose-700 mb-1">{t('detail.regulated.title')} ({material.rohs_compliant === false ? t('detail.regulated.rohsFail') : t('detail.regulated.svhc')})</p>
                <ul className="list-disc pl-4 space-y-0.5 text-rose-900">
                  {(material.svhc_concerns || []).map((c, i) => <li key={i}>{c}</li>)}
                </ul>
                <p className="text-[10px] text-muted-foreground mt-1">{t('detail.regulated.note')}</p>
              </div>
            )}
            {/* R17: 권장 후공정 — material 의 process + name 패턴 매칭 */}
            {(() => {
              const recs = recommendedCoatings({ category: material.category, name: material.name, process: material.process }, 3);
              if (!recs.length) return null;
              return (
                <div className="mt-3 rounded border border-accent/30 bg-accent/5 p-2.5">
                  <p className="text-[11px] font-semibold text-accent mb-1.5 uppercase tracking-wide">{t('detail.coatings.title')}</p>
                  <div className="space-y-2">
                    {recs.map((c) => (
                      <div key={c.id} className="text-[11px] leading-snug border-b border-accent/15 pb-1.5 last:border-0">
                        <p className="font-semibold text-foreground">{c.nameKo}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-0.5">
                          {c.surfaceHardnessHV && <span>HV ≈ {c.surfaceHardnessHV}</span>}
                          {c.frictionCoef != null && <span>μ ≈ {c.frictionCoef}</span>}
                          {c.fatigueGainPct != null && c.fatigueGainPct !== 0 && <span className={c.fatigueGainPct > 0 ? 'text-emerald-700' : 'text-rose-700'}>Δ피로 {c.fatigueGainPct > 0 ? '+' : ''}{c.fatigueGainPct}%</span>}
                          {c.corrosionUpgrade !== 'none' && <span>내식 {c.corrosionUpgrade}</span>}
                          <span>두께 {c.thicknessMicrons[0]}-{c.thicknessMicrons[1]}μm</span>
                          <span>비용 ×{c.costFactor}</span>
                        </div>
                        <p className="text-[10px] text-foreground/70 mt-0.5">{c.applications}</p>
                        {c.limitations && <p className="text-[10px] text-amber-700 mt-0.5">⚠ {c.limitations}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
