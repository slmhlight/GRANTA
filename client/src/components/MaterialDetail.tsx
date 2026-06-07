/*
 * AM Materials Explorer — Material Detail Panel
 * Range-aware: shows typical value + min–max range (n data points) and clickable
 * source citations (verified datasheet URLs where available).
 */

import { X, Plus, Check, ExternalLink, Layers, Atom, Wrench, FlaskConical, BookText, Coins, Thermometer, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Material, PropertyRange, MaterialSource } from '@/lib/materials';
import { MECHANICAL_PROPERTIES, PHYSICAL_PROPERTIES, COST_PROPERTIES } from '@/lib/materials';
import { htGlossaryFor } from '@/lib/ht-glossary';
import { htAlloySpecificFor } from '@/lib/ht-alloy-specific';
import { computeCET, computeCEIIW, computePcm, computeSchaeffler, computeMachinability, machiningCostBand, htCostBand } from '@/lib/welding-machinability';
import { TempCurveChart } from '@/components/TempCurveChart';
import { CreepRuptureChart } from '@/components/CreepRuptureChart';
import { recommendedCoatings } from '@/lib/coatings';
/* R157b — MaterialDetail 의 sub-components 분리. */
import { SourcesList } from '@/components/material-detail/SourcesList';
import { RangeRow, fmt } from '@/components/material-detail/RangeRow';
import { CompositionDisplay } from '@/components/material-detail/CompositionDisplay';
import { Field } from '@/components/material-detail/Field';
/* R160 — Spec badge popover. */
import { SpecBadgeList } from '@/components/material-detail/SpecBadgeList';
/* R161 — Similar / alternative materials card → Composition tab. */
import { SimilarMaterialsCard } from '@/components/material-detail/SimilarMaterialsCard';
import { useT, useLang } from '@/lib/i18n';
import { familyColor } from '@/lib/material-colors';
import { formatPrice, loadUnitSystem } from '@/lib/unit-convert';
import { useState as useStateRD, type PointerEvent as ReactPointerEvent } from 'react';
import { RadarChart, RadarConfig, DEFAULT_RADAR_AXES, type RadarAxis, type NormalizeBase } from '@/components/RadarChart';

interface MaterialDetailProps {
  material: Material | null;
  compareList: string[];
  onToggleCompare: (id: string) => void;
  onClose: () => void;
  dragHandleProps?: { onPointerDown?: (e: ReactPointerEvent<HTMLElement>) => void }; // when floating, makes the header a drag handle
  floating?: boolean;
  /** R53a — Radar normalize 에 사용할 전체 dataset. 없으면 'set' base 만 동작. */
  allMaterials?: Material[];
  /** R69 A — 즐겨찾기. favorites set + toggle callback. */
  favorites?: Set<string>;
  onToggleFavorite?: (id: string) => void;
  /** R148 — 유사 재료 추천 클릭 시 해당 material 로 detail panel 전환. */
  onSelectMaterial?: (id: string) => void;
}

// R157b — fmt → components/material-detail/RangeRow.tsx (export 됨, RangeRow 와 함께 사용).

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  curated: { label: 'Curated · multi-vendor', cls: 'bg-accent/15 text-accent border-accent/30' },
  am_vendor: { label: 'AM vendor data', cls: 'bg-violet-500/15 text-violet-600 border-violet-500/30' },
  generic: { label: 'Generic reference', cls: 'bg-muted text-muted-foreground border-border' },
  reference: { label: 'Reference data', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
};

/** R144c — Spec badge colors by issuing organization. */
const SPEC_BADGE_COLOR: Record<string, { color: string; bg: string }> = {
  AMS: { color: '#1d4ed8', bg: '#dbeafe' },
  ASTM: { color: '#7c2d12', bg: '#fed7aa' },
  ASME: { color: '#7e22ce', bg: '#e9d5ff' },
  DNV: { color: '#0c4a6e', bg: '#bae6fd' },
  EN: { color: '#166534', bg: '#bbf7d0' },
  DIN: { color: '#365314', bg: '#d9f99d' },
  JIS: { color: '#9f1239', bg: '#fecdd3' },
  MIL: { color: '#1e293b', bg: '#cbd5e1' },
  UNS: { color: '#92400e', bg: '#fde68a' },
  API: { color: '#075985', bg: '#bae6fd' },
  NACE: { color: '#854d0e', bg: '#fef08a' },
  OTHER: { color: '#475569', bg: '#e2e8f0' },
};

// R157b — RangeRow → components/material-detail/RangeRow.tsx 로 이동.

// R157b — SourcesList → components/material-detail/SourcesList.tsx 로 이동.

// R157b — ELEMENT_COLORS, elementColor, parseCompValue, buildCompSlices, CompSlice →
//         components/material-detail/composition.ts 로 이동.

// R157b — CompositionDonut → components/material-detail/CompositionDonut.tsx 로 이동.

// R157b — CompositionDisplay → components/material-detail/CompositionDisplay.tsx 로 이동.
// R157b — Field → components/material-detail/Field.tsx 로 이동.

export function MaterialDetail({ material, compareList, onToggleCompare, onClose, dragHandleProps, floating, allMaterials, favorites, onToggleFavorite, onSelectMaterial }: MaterialDetailProps) {
  const t = useT();
  // R53a — Radar axes + normalize base (localStorage 저장)
  const [radarAxes, setRadarAxes] = useStateRD<RadarAxis[]>(() => {
    try {
      const s = localStorage.getItem('am_radar_axes');
      if (s) { const parsed = JSON.parse(s); if (Array.isArray(parsed) && parsed.length >= 3) return parsed; }
    } catch { /* ignore */ }
    return DEFAULT_RADAR_AXES;
  });
  const [radarBase, setRadarBase] = useStateRD<NormalizeBase>(() => {
    try {
      const s = localStorage.getItem('am_radar_base');
      if (s === 'category' || s === 'family2' || s === 'family3') return s as NormalizeBase;
    } catch { /* ignore */ }
    return 'family3';
  });
  const updateAxes = (a: RadarAxis[]) => { setRadarAxes(a); try { localStorage.setItem('am_radar_axes', JSON.stringify(a)); } catch { /* ignore */ } };
  const updateBase = (b: NormalizeBase) => { setRadarBase(b); try { localStorage.setItem('am_radar_base', b); } catch { /* ignore */ } };

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
            {/* R144c — Spec badges (AMS / ASTM / UNS …). R160 — popover 로 확장 (클릭 시 org/description/url 표시). */}
            {material.meta?.specs && material.meta.specs.length > 0 && (
              <SpecBadgeList specs={material.meta.specs} colorMap={SPEC_BADGE_COLOR} maxInline={8} />
            )}
          </div>
        </div>
        <div className="flex items-start gap-1 flex-shrink-0">
          {/* R69 A — 즐겨찾기 ⭐ 토글 */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(material.id)}
              className="ml-2 p-1 hover:bg-muted rounded transition-colors"
              title={favorites?.has(material.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              aria-label="Toggle favorite"
            >
              <Star className={`w-4 h-4 ${favorites?.has(material.id) ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}`} />
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
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
            <TabsTrigger value="properties" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-accent/5 data-[state=active]:text-accent data-[state=active]:font-semibold px-3 py-2">
              <Layers className="w-3 h-3 mr-1" />{t('detail.properties')}
            </TabsTrigger>
            <TabsTrigger value="composition" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-accent/5 data-[state=active]:text-accent data-[state=active]:font-semibold px-3 py-2">
              <Atom className="w-3 h-3 mr-1" />{t('detail.composition')}
            </TabsTrigger>
            <TabsTrigger value="process" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-accent/5 data-[state=active]:text-accent data-[state=active]:font-semibold px-3 py-2">
              <Wrench className="w-3 h-3 mr-1" />{t('detail.process')}
            </TabsTrigger>
          </TabsList>

          {/* Properties */}
          <TabsContent value="properties" className="p-4 space-y-4">
            {/* R53a — Radar chart (단일 alloy, normalize base 선택). 모바일·데스크탑 가로 정렬. */}
            <div className="rounded border border-border/50 bg-muted/10 p-3 flex flex-col sm:flex-row sm:items-start sm:gap-4">
              <div className="flex-shrink-0">
                <RadarChart
                  series={[{ id: material.id, name: material.name, color: familyColor(material), material }]}
                  axes={radarAxes}
                  allMaterials={allMaterials}
                  normalizeBase={radarBase === 'set' ? 'family3' : radarBase}
                  size={200}
                />
              </div>
              <div className="flex-1 mt-2 sm:mt-0">
                <p className="text-[11px] font-semibold text-foreground/80 mb-1">{material.name} — 다축 성능</p>
                <p className="text-[10px] text-muted-foreground mb-2">각 축은 normalize base 안에서 0~1 점수 (1 = base 내 최고). 축 / 정규화 기준은 ⚙ 버튼에서 변경.</p>
                <RadarConfig
                  axes={radarAxes}
                  onAxesChange={updateAxes}
                  normalizeBase={radarBase === 'set' ? 'family3' : radarBase}
                  onNormalizeChange={updateBase}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60 -mt-1">Value = typical · sub-line = min–max across {meta.vendor_count ? `${meta.vendor_count} vendors` : 'conditions'}</p>
            {/* 신뢰도 뱃지 범례 */}
            <div className="rounded border border-border/50 bg-muted/20 p-2 text-[10px] flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-foreground/70 font-semibold">{t('detail.confidence')}:</span>
              <span><span className="text-foreground/50">n=N</span> {t('detail.confidence.measured')}</span>
              <span><span className="text-sky-600">handbook</span> {t('detail.confidence.handbook')}</span>
              <span><span className="text-amber-600">class</span> {t('detail.confidence.class')}</span>
              <span><span className="text-rose-500">≈UTS</span> {t('detail.confidence.derived')}</span>
              {/* R67 #11 — MMPDS A/B basis 안내 link → Guide datasheet section */}
              <a href="/guide#ch8" className="ml-auto text-accent hover:underline">A/B basis 의미 →</a>
            </div>
            {(() => {
              /* R112 — Category-aware property filter. polymer 만 Tg/HDT 표시, metal/ceramic/composite 에서는 hide. */
              const cat = material.category || '';
              const isPolymer = cat === 'Polymer';
              const filterByCat = (p: { key: string }) => {
                // Polymer 한정 물성
                if (p.key === 'glass_transition_temp' || p.key === 'hdt_182') return isPolymer;
                // melting_point: polymer 는 hide (대신 Tg 가 의미 있음), metal/ceramic 만 표시
                if (p.key === 'melting_point' && isPolymer) return false;
                // electrical_conductivity: polymer 는 비전도성 → hide
                if (p.key === 'electrical_conductivity' && isPolymer) return false;
                // fracture_toughness: polymer 는 다른 단위 → hide (Charpy impact 로 대체)
                if (p.key === 'fracture_toughness' && isPolymer) return false;
                return true;
              };
              const mechProps = MECHANICAL_PROPERTIES.filter(filterByCat);
              const physProps = PHYSICAL_PROPERTIES.filter(filterByCat);
              return (
                <>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1"><FlaskConical className="w-3 h-3" />Mechanical Properties</h3>
                    <div className="space-y-1">
                      {mechProps.map(prop => (
                        <RangeRow key={prop.key} label={prop.label} unit={prop.unit} range={ranges[prop.key as string]} fallback={material[prop.key as keyof Material] as number | string | null} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1"><Layers className="w-3 h-3" />Physical Properties</h3>
                    <div className="space-y-1">
                      {physProps.map(prop => (
                        <RangeRow key={prop.key} label={prop.label} unit={prop.unit} range={ranges[prop.key as string]} fallback={material[prop.key as keyof Material] as number | string | null} />
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
            {COST_PROPERTIES.some(p => material[p.key as keyof Material] != null) && (
              <div>
                <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1">
                  <Coins className="w-3 h-3" />Cost
                  {/* R146 — verified date badge if measured + recent. */}
                  {material.meta?.price_verified_date ? (
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Source: ${material.meta?.price_verified_source}`}>
                      ✓ verified {material.meta.price_verified_date as string}
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal text-muted-foreground/60">(handbook estimate)</span>
                  )}
                </h3>
                <div className="space-y-1">
                  {COST_PROPERTIES.map(prop => (
                    <RangeRow key={prop.key} label={prop.label} unit={prop.unit} range={ranges[prop.key as string]} fallback={material[prop.key as keyof Material] as number | string | null} />
                  ))}
                </div>
              </div>
            )}
            {/* R112 — 제조성/HT/용접성 종합 카드는 Process 탭으로 이동. Properties 탭은 순수 물성만. */}
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
          <TabsContent value="composition" className="p-4 space-y-4">
            <CompositionDisplay material={material} />
            {/* R161 — 유사 · 대체 재료 추천 + 각 추천 reason chip. Properties tab 에서 이동. */}
            {allMaterials && allMaterials.length > 0 && (
              <SimilarMaterialsCard
                material={material}
                allMaterials={allMaterials}
                onSelectMaterial={onSelectMaterial}
              />
            )}
          </TabsContent>

          {/* Process */}
          <TabsContent value="process" className="p-4 space-y-3">
            {/* R112 — 공정 평가 3 종합 카드 (Machinability / Heat Treatment / Weldability). 각각 단일 카드로 통합 + 경고 색상. */}
            {(() => {
              const mach = computeMachinability(material);
              // R125 — Ceramic / Composite 에서 가공·HT 카드 hide (Si3N4 등 가공 불가 재료에 부적절한 카드 제거)
              const machCost = machiningCostBand(material.machining_cost_factor, material.category);
              const htCost = htCostBand(material.ht_cost_factor, material.category);
              const cet = computeCET(material);
              const ce_iiw = computeCEIIW(material);
              const pcm = computePcm(material);
              const sch = computeSchaeffler(material);
              /* R173 — Metal 이고 weldability rating 있으면 (quantitative metric 없어도) 카드 표시.
                 AA 7075/Ti-6Al-4V/Inconel 718 등 비철금속이 CE_IIW 미적용이라 weldability 카드 누락 fix. */
              const hasWeldFallback = material.category === 'Metal' && !!material.weldability;
              if (!mach && !machCost && !htCost && !cet && !ce_iiw && !pcm && !sch && !hasWeldFallback) return null;
              const bandColor = (b: string) => ({
                easy: 'text-emerald-700 bg-emerald-50 border-emerald-300',
                normal: 'text-foreground bg-muted/40 border-border',
                hard: 'text-amber-700 bg-amber-50 border-amber-300',
                very_hard: 'text-rose-700 bg-rose-50 border-rose-300',
                low: 'text-emerald-700 bg-emerald-50 border-emerald-300',
                med: 'text-amber-700 bg-amber-50 border-amber-300',
                high: 'text-rose-700 bg-rose-50 border-rose-300',
              } as Record<string, string>)[b] || '';
              // Weldability — worst band 기준 (CE_IIW vs CET vs Pcm 중 가장 보수적)
              const weldBands = [ce_iiw?.band, cet?.band, pcm?.band].filter(Boolean) as string[];
              const weldWorst = weldBands.includes('high') ? 'high' : weldBands.includes('med') ? 'med' : weldBands.length ? 'low' : null;
              /* R113 + R152b — 3 카드 모두 collapsible (mobile 가독성). default: Machinability open · HT/Weld closed.
                 R152b: 폭 좁은 detail panel (좌측 floating popup 430px 또는 모바일) 에서 2-column 이 텍스트
                 wrap 으로 가독성 ↓ → 항상 1 column stack 으로 변경. */
              return (
                <div className="grid grid-cols-1 gap-3">
                  {/* 카드 1 — 절삭성 + 가공비 통합 (default open) */}
                  {(mach || machCost) && (
                    <details open className={`rounded-lg border-2 p-3 ${bandColor((machCost?.band || mach?.band) as string)}`}>
                      <summary className="text-[12px] font-bold flex items-center justify-between cursor-pointer select-none list-none">
                        <span className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" />Machinability · 절삭성</span>
                        <span className="text-[10px] font-normal opacity-70">
                          {mach && `${mach.rating}%`}{machCost && ` · ×${machCost.factor.toFixed(2)}`} · <b>{(machCost?.label || mach?.label)}</b>
                        </span>
                      </summary>
                      <div className="space-y-1.5 text-[12px] mt-2 pt-2 border-t border-current/15">
                        {mach && (
                          <div className="flex items-baseline justify-between gap-2">
                            <b>절삭성 rating</b>
                            <span className="font-mono">{mach.rating}% · <b>{mach.label}</b></span>
                          </div>
                        )}
                        {machCost && (
                          <div className="flex items-baseline justify-between gap-2">
                            <b>가공비 가중치</b>
                            <span className="font-mono">×{machCost.factor.toFixed(2)} · {machCost.detail} · <b>{machCost.label}</b></span>
                          </div>
                        )}
                        {mach && <p className="text-[11px] leading-relaxed mt-1 text-foreground/80">{mach.note}</p>}
                        {machCost && machCost.band !== mach?.band && <p className="text-[11px] leading-relaxed text-foreground/80">{machCost.note}</p>}
                        <p className="text-[10px] mt-2 pt-1.5 border-t border-current/10 text-foreground/60">
                          <b>출처 / 기준</b>: ASM Handbook Vol.16 Machining · AISI 1018 = rating 100% · raw 단가 × cost factor = 가공 후 추정 단가 (vendor 견적과 ±20-30% 차이).
                        </p>
                      </div>
                    </details>
                  )}
                  {/* R140 — 카드 2: 재료명에 HT 가 이미 반영된 경우 alloy-specific 설명 표시.
                      예: "17-4 PH H900" → 1170 MPa peak strength + 482°C aged 1h + landing gear use case.
                      미매칭 (specific HT 없거나 generic alloy) 시 기존 HT 가중치 카드 표시. */}
                  {(() => {
                    const alloyHt = htAlloySpecificFor(material.name, material.heat_treatment);
                    if (alloyHt) {
                      const { family, description } = alloyHt;
                      return (
                        <details open className="rounded-lg border-2 border-sky-300 bg-sky-50 p-3">
                          <summary className="text-[12px] font-bold flex items-center justify-between cursor-pointer select-none list-none text-sky-800">
                            <span className="flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5" />Heat Treatment · {description.code}</span>
                            <span className="text-[10px] font-normal opacity-70">{family.familyName}</span>
                          </summary>
                          <div className="space-y-2 text-[12px] mt-2 pt-2 border-t border-sky-300/40">
                            <div className="font-semibold text-sky-900">{description.title}</div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wide text-sky-700/70 mb-0.5">공정 / Process</div>
                              <div className="text-[11px] font-mono leading-relaxed text-foreground/90 bg-white/60 rounded px-2 py-1">{description.process}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wide text-sky-700/70 mb-0.5">결과 물성 / Resulting</div>
                              <div className="text-[11px] font-mono leading-relaxed text-foreground/90 bg-white/60 rounded px-2 py-1">{description.resulting}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wide text-sky-700/70 mb-0.5">적용 / Use case</div>
                              <div className="text-[11px] leading-relaxed text-foreground/80">{description.useCase}</div>
                            </div>
                            {description.caveat && (
                              <div className="rounded border border-amber-300 bg-amber-50 px-2 py-1.5">
                                <div className="text-[10px] uppercase tracking-wide text-amber-700 mb-0.5">⚠ 주의 / Caveat</div>
                                <div className="text-[11px] leading-relaxed text-amber-900">{description.caveat}</div>
                              </div>
                            )}
                            <p className="text-[10px] mt-2 pt-1.5 border-t border-sky-300/40 text-foreground/60">
                              <b>출처</b>: {description.source}
                              {htCost && ` · HT 가공비 가중치: ×${htCost.factor.toFixed(2)} (${htCost.label})`}
                            </p>
                          </div>
                        </details>
                      );
                    }
                    // Fallback: 기존 HT 가중치 카드 (specific HT 매칭 안 됨)
                    if (!htCost) return null;
                    return (
                      <details open className={`rounded-lg border-2 p-3 ${bandColor(htCost.band)}`}>
                        <summary className="text-[12px] font-bold flex items-center justify-between cursor-pointer select-none list-none">
                          <span className="flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5" />Heat Treatment · 열처리</span>
                          <span className="text-[10px] font-normal opacity-70">×{htCost.factor.toFixed(2)} · <b>{htCost.label}</b></span>
                        </summary>
                        <div className="space-y-1.5 text-[12px] mt-2 pt-2 border-t border-current/15">
                          <div className="flex items-baseline justify-between gap-2">
                            <b>HT 가중치</b>
                            <span className="font-mono">×{htCost.factor.toFixed(2)} · {htCost.detail} · <b>{htCost.label}</b></span>
                          </div>
                          {(() => {
                            const f = htCost.factor;
                            const atmosphere = f >= 1.5 ? 'Vacuum / Inert gas (Ar/N₂)' : f >= 1.2 ? 'Inert gas 또는 controlled air' : 'Air / open furnace';
                            const steps = f >= 1.5 ? '3-5 step (solution → quench → multi-stage aging + HIP/coating)' : f >= 1.2 ? '2 step (Q+T 또는 solution+aging)' : f >= 1.05 ? '1 step (stress relief 또는 anneal)' : 'None';
                            const hours = f >= 1.5 ? '8-24h' : f >= 1.2 ? '4-8h' : f >= 1.05 ? '1-3h' : '0h';
                            const ksRef = f >= 1.2 ? 'KS D 0040 (열처리 일반) · KS D 3866 (구조용 강)' : null;
                            return (
                              <>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mt-1">
                                  <div><span className="text-foreground/60">분위기:</span> <b>{atmosphere}</b></div>
                                  <div><span className="text-foreground/60">총 시간:</span> <b>{hours}</b></div>
                                  <div className="col-span-2"><span className="text-foreground/60">단계:</span> <b>{steps}</b></div>
                                </div>
                                <p className="text-[11px] leading-relaxed mt-1 text-foreground/80">{htCost.note}</p>
                                <p className="text-[10px] mt-2 pt-1.5 border-t border-current/10 text-foreground/60">
                                  <b>출처 / 기준</b>: ASM Handbook Vol.4 Heat Treating{ksRef && ` · ${ksRef}`} · 분위기/단계/시간은 factor 기반 휴리스틱 (vendor 견적 별도 필요).
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </details>
                    );
                  })()}
                  {/* 카드 3 — 용접성 종합 (R173: 항상 펼침 + 비철금속도 qualitative weldability 표시).
                      R172 — `md:col-span-2` 제거: R152b 이전 2-col 디자인 잔재. 현재 grid-cols-1 만 사용.
                      R173: (1) 항상 `open` (Mach/HT 카드와 일관성 — 이전 high 일 때만 open 은 버그)
                            (2) ce_iiw/cet/pcm/sch 가 모두 null 인 Al/Cu/Ti/Mg/Ni-superalloy 같은 비철금속도
                                qualitative weldability (material.weldability) 표시 — 카드 누락 fix. */}
                  {(material.category === 'Metal' && (ce_iiw || cet || pcm || sch || material.weldability)) && (
                    <details open className={`rounded-lg border-2 p-3 ${bandColor(weldWorst || (material.weldability === 'Poor' ? 'high' : material.weldability === 'Fair' ? 'med' : 'low'))}`}>
                      <summary className="text-[12px] font-bold flex items-center justify-between cursor-pointer select-none list-none">
                        <span className="flex items-center gap-1.5">
                          <FlaskConical className="w-3.5 h-3.5" />Weldability · 용접성 종합
                          {weldWorst === 'high' && <span className="text-rose-700">⚠</span>}
                          {!weldWorst && material.weldability === 'Poor' && <span className="text-rose-700">⚠</span>}
                        </span>
                        <span className="text-[10px] font-normal opacity-70">
                          {weldWorst === 'high' ? '⚠ 위험' : weldWorst === 'med' ? '주의' : weldWorst === 'low' ? '✓ 우수' : material.weldability && `${material.weldability}`}
                          {(ce_iiw || cet || pcm || sch) ? ' · CE+CET+Pcm+Schaeffler' : ' · qualitative (handbook)'}
                        </span>
                      </summary>
                      <div className="space-y-1 text-[12px] mt-2 pt-2 border-t border-current/15">
                        {ce_iiw && (
                          <div className="flex items-baseline justify-between gap-2 py-0.5 border-b border-current/10">
                            <b>CE_IIW (일반)</b>
                            <span className="font-mono">{ce_iiw.ce.toFixed(2)} · <b>{ce_iiw.label}</b></span>
                          </div>
                        )}
                        {cet && (
                          <div className="flex items-baseline justify-between gap-2 py-0.5 border-b border-current/10">
                            <b>CET (HSLA)</b>
                            <span className="font-mono">{cet.cet.toFixed(2)} · <b>{cet.label}</b></span>
                          </div>
                        )}
                        {pcm && (
                          <div className="flex items-baseline justify-between gap-2 py-0.5 border-b border-current/10">
                            <b>Pcm (저합금)</b>
                            <span className="font-mono">{pcm.pcm.toFixed(3)} · <b>{pcm.label}</b></span>
                          </div>
                        )}
                        {sch && (
                          <div className="flex items-baseline justify-between gap-2 py-0.5 border-b border-current/10">
                            <b>Schaeffler (스테인리스)</b>
                            <span className="font-mono">Cr<sub>eq</sub>{sch.cr_eq.toFixed(1)} · Ni<sub>eq</sub>{sch.ni_eq.toFixed(1)} · <b>{sch.phase}</b></span>
                          </div>
                        )}
                        {/* R173 — 비철금속 fallback: ce_iiw/cet/pcm/sch 모두 null 이면 qualitative rating + alloy 별 권고 */}
                        {!ce_iiw && !cet && !pcm && !sch && material.weldability && (
                          <div className="flex items-baseline justify-between gap-2 py-0.5 border-b border-current/10">
                            <b>Weldability rating</b>
                            <span className="font-mono"><b>{material.weldability}</b> (ASM Vol.6 handbook)</span>
                          </div>
                        )}
                        <div className="mt-2 pt-2 border-t-2 border-current/30">
                          <p className="text-[11px] font-semibold leading-relaxed">권고 절차:</p>
                          <p className="text-[11px] leading-relaxed">
                            {weldWorst === 'high' && '⚠ 균열 위험 高. Pre-heat 200°C+ · low-H 용접봉 · interpass temp 통제 · PWHT 필수.'}
                            {weldWorst === 'med' && '주의 필요. Pre-heat 100-200°C · 두꺼운 plate 에서 low-H 권장.'}
                            {weldWorst === 'low' && '✓ 일반 절차 가능. 표준 용접봉 + 일반 procedure.'}
                            {/* R174 — 비철금속 alloy-specific 권고 (정교화: ~25 패턴, AWS spec + AMS filler grade) */}
                            {/* === Al 합금 (AWS D1.2 / ASM Vol.6) — R175 주의사항 강화 === */}
                            {!weldWorst && /^aa[\s-]?1[01]\d{2}\b|^al99/i.test(material.name || '') &&
                              '✓ Al 1xxx (CP 99%+) — 모든 Al 중 가장 weldable. **GTAW DC EN with Ar** (또는 GMAW spray transfer), **ER1100 filler** (matching). Pre-heat: ≤12mm 불요, >12mm = 50-100°C. ⚠ **주의: oxide film (Al₂O₃) 제거 필수** — wire brush (stainless steel only, no carbon steel) + acetone degrease. NDT: visual + Liquid Penetrant (PT) per AWS D1.2.'}
                            {!weldWorst && /^aa[\s-]?2014\b/i.test(material.name || '') &&
                              '⚠ AA 2014 (Al-Cu-Si-Mg, Si 1.0%) — 2xxx 중 가장 weldable (Si filler 효과). GMAW + **ER4043 filler** 권장 (5356 X — Mg₂Si crack 위험). Pre-heat 150°C. ⚠ **주의: Cu 4.4% 로 hot crack 위험 + HAZ liquation crack 가능**. Post-weld T62 aging 필요 (as-welded σy 30% 손실). NDT: PT + RT (radiograph) 필수 (porosity 확인).'}
                            {!weldWorst && /^aa[\s-]?2024\b/i.test(material.name || '') &&
                              '⚠⚠ AA 2024 (Al-Cu-Mg, T3) — **Fusion welding 거의 불가** (porosity + hot crack + SCC). **권장: FSW (Friction Stir Welding) — Boeing 787 fuselage, Airbus A380 wing rib 표준** (rotation 800 rpm, traverse 100 mm/min, pin 5mm depth). Fusion 강행 시 ER2319 + DC EP + Ar+He shielding (필수 hot wire). ⚠ **HAZ 영역 SCC 위험 高 — short-transverse 방향 사용 회피**. As-welded σy 50% 손실. RT (radiograph) + UT NDT 필수.'}
                            {!weldWorst && /^aa[\s-]?2219\b/i.test(material.name || '') &&
                              '✓ AA 2219 (Al-Cu 6.3%, low Mg) — 2xxx 중 GMAW 가능한 유일 grade. **ER2319 filler (matching)** + DC EP + Ar shielding. NASA Space Shuttle external tank ET-1~135 (1981-2011) 의 GMAW 표준. ⚠ **주의: Pre-heat 100-150°C (porosity 회피)**, interpass < 200°C (over-aging 회피), Post-weld T87 aging 필요. NDT: RT + LP per NASA NSTS 08303.'}
                            {!weldWorst && /^aa[\s-]?2099\b|al-?li/i.test(material.name || '') &&
                              '⚠ Al-Li 2099 (Airbus A350 inner wing skin) — Li 가 H₂O 가스 흡수 (H, Li₂O film) → porosity 절대 회피 어려움. **FSW only** (LCC, EWI 표준). Fusion welding → σy 60% 손실. ⚠ **주의: Li 가 piping 의 oil/water 와 반응 → 절대 cleanroom welding (RH < 30%, particle < 1000 class)**. NDT: PA-UT (phased array ultrasonic) 필수.'}
                            {!weldWorst && /^aa[\s-]?(5052|5083|5086|5454|5754|5005)/i.test(material.name || '') &&
                              '✓ Al-Mg (Mg 2-5%, non-HT) — fusion welding 우수. **ER5356 filler** (matching Mg, 표준) 또는 **ER5183 (5083 marine premium, 4.5% Mg matching)**. GTAW AC sine wave 또는 GMAW spray transfer. Pre-heat 50°C (두께 < 12mm) / 100°C (>12mm). ⚠ **주의 1 — HAZ softening**: H32/H34 cold-worked condition 의 strain hardening 이 welding 열에 의해 풀림 → as-welded σy 40-50% 손실 (H32 σy 195 → annealed 90 MPa). 강도 critical 부품 시 추가 두께 또는 cold-work 후-weld 필요. ⚠ **주의 2 — Marine SCC**: Mg ≥ 3% (5083 4.5%, 5454 3%, 5456 5%, 5086 4%) 합금이 **50°C+ 환경 장기 노출 시 β-phase (Mg₂Al₃) 입계 석출 → 응력 부식 균열**. ASTM G67 (NAMLT test, sensitization 평가) per ASTM B928 marine spec 필수. **5083-H321 (stabilized for SCC)** 또는 **H116 (anti-SCC)** temper 사용 권장. NDT: PT + RT.'}
                            {!weldWorst && /^aa[\s-]?(6061|6063|6082|6005|6101|6151)/i.test(material.name || '') &&
                              '✓ Al-Mg-Si (6xxx) — fusion welding 우수. **ER4043 filler** (Si match, 일반, ductile) / **ER5356 filler** (Mg-Si match, 강도 우선 — 단 hot crack 우려 약간 ↑). GTAW AC sine 또는 GMAW spray transfer. Pre-heat 50°C (얇은 sheet) / 100-150°C (두꺼운 plate). ⚠ **주의 1 — HAZ softening (critical)**: T6 (peak-aged) condition 이 welding 열에 의해 over-aged 또는 solution-treated state 로 → **as-welded σy 60% 손실 (6061-T6 σy 276 → 110 MPa, 6082-T6 250 → 100 MPa)**. 강도 회복 위해 **post-weld T6 re-aging (solution 530°C + WQ + 175°C aging) 필수** (단, 두께 < 12mm + 단순 형상만 가능). 큰 구조물은 회복 X → 응력 계산 시 as-welded 값 사용. ⚠ **주의 2 — Hot crack**: 6xxx 는 Mg-Si eutectic 의 narrow solidification range → hot crack 발생 가능 (특히 6063 extrusion). ER4043 filler 가 Si 12% 로 hot crack 완화. ⚠ **주의 3 — Black smut**: AC 의 cleaning half-cycle 부족 시 표면 black smut → arc cleanness 조정 (balance 75% EN 권장). NDT: PT + visual.'}
                            {!weldWorst && /^aa[\s-]?(7075|7050|7068|7150|7449|7178)/i.test(material.name || '') &&
                              '⚠⚠ AA 7xxx (Al-Zn-Mg-Cu, T6) — **Fusion welding 매우 어려움** (Zn 5-8% 의 highly precipitation-strengthened alloy). **FSW only** (Boeing 787 wing inner skin, Airbus A350 fuselage stringer, Lockheed F-35 wing rib — rotation 600-900 rpm, traverse 100-200 mm/min). Fusion 강행 시 ER5556 또는 7075 self-filler (제한적). ⚠ **주의 1 — SCC 매우 위험**: 7075-T6 의 HAZ 가 humid air + tensile stress 환경에서 **수개월 내 응력 부식 균열** 발생 (short-transverse 방향 가장 위험). T73/T7351 over-aged temper 가 SCC 저항 향상 (단 σy 15% 손실). ⚠ **주의 2 — Liquation crack**: Zn 5.5%+ 의 low-melt eutectic 이 HAZ grain boundary 에 → 균열 무조건 발생. ⚠ **주의 3 — As-welded σy 60-70% 손실 + 회복 거의 불가** (자연 시효 X, T6 재처리 시 distortion 大). NDT: RT + PA-UT 필수.'}
                            {!weldWorst && /^alsi10mg|^alsi7|^a356|^a360|^a380|^a413/i.test(material.name || '') &&
                              '✓ Al-Si cast / AM (Si 7-13%) — fusion welding 우수 (Si eutectic 이 hot crack 방지). **ER4043 filler** (Si 5%, 일반 cast Al), **ER4047 filler** (Si 12%, 모든 Al-Si cast). GTAW AC 또는 GMAW. Pre-heat 100-150°C (cast 의 잔류응력 + porosity 가스 방출). ⚠ **주의 1 — Cast porosity**: gas porosity (H₂ from melt) + shrinkage micro-void 가 welding 시 expand → re-weld 시 발생. **HIP 후처리** 권장 (cast 와 AM 모두). ⚠ **주의 2 — AM as-built 의 anisotropy**: Z-direction 의 fusion line + lack-of-fusion defect 가 welding 시 propagate. ⚠ **주의 3 — High-Mg cast (A356 0.4 Mg)**: T6 후 welded → HAZ over-aging (6xxx 와 동일 issue). NDT: RT + UT (cast porosity 검출).'}
                            {/* === Ti 합금 (AWS D17.1 aerospace) === */}
                            {!weldWorst && /^ti[\s-]?grade ?[1234]\b|^cp-?ti\b|^unalloyed ti/i.test(material.name || '') &&
                              '✓ CP-Ti (α single phase) — 가장 weldable Ti. **ERTi-1/2/3/4** matching filler. GTAW DC EN with **flow-meter Ar 25 L/min** front, **15 L/min trailing**, back-purge required. O/N/H pickup → embrittlement.'}
                            {!weldWorst && /^ti-?6al-?4v|^ti[\s-]?grade ?5\b|^ti gr5/i.test(material.name || '') &&
                              '✓ Ti-6Al-4V (α+β Gr5) — GTAW DC EN, **ERTi-5 (R56400)** filler 또는 Gr23 ELI filler for medical. Pre-clean: acetone + SS brush (no Cu). Ar shielding: 25 L/min front + back + trailing. Charpy fail = O/N contamination 의심.'}
                            {!weldWorst && /^ti.*grade ?(23|7|9|12)\b|^ti-?3al-?2\.5v/i.test(material.name || '') &&
                              '✓ Ti Gr9/12/23 ELI — medical grade. **ERTi-9 (Ti-3Al-2.5V)** 또는 **ERTi-23 (R56407)** matching. AWS D17.1 Class A weld 표준 (no porosity > 0.13mm).'}
                            {!weldWorst && /^beta-?21s|^beta-?c|^ti-?13v|^ti-?15-?3|^ti-?10v|^ti-?5553/i.test(material.name || '') &&
                              '⚠ β-Ti (Beta-21S/Beta-C/Ti-15-3 등) — β stabilizer 농축 → solidification crack 위험. EBW 권장 (low heat input). GTAW 시 inter-pass < 150°C 통제. Solution + aged 처리 후 weld.'}
                            {/* === Ni superalloy === */}
                            {!weldWorst && /^inconel ?(600|601|625|617|690)|^in[\s-]?(600|625|617)/i.test(material.name || '') &&
                              '✓ Solid-solution Ni (600/601/625/617/690) — 우수. **ERNiCr-3 (600/X-750), ERNiCrMo-3 (625, AMS 5837), ERNiCrCoMo-1 (617)** filler. GTAW DC EN with Ar+He. Pre-heat 미요, inter-pass < 175°C.'}
                            {!weldWorst && /^inconel ?718\b|^in[\s-]?718\b|^alloy ?718\b/i.test(material.name || '') &&
                              '✓ Inconel 718 (γ\'\' slow aging → no SAC) — GTAW / EBW / LBW 모두 OK. **ERNiFeCr-2 (AMS 5832)** matching filler. Solution treated condition 에서 weld → post-weld STA (980°C SHT + 720°C/8h + 620°C/8h aging).'}
                            {!weldWorst && /^inconel ?718plus\b/i.test(material.name || '') &&
                              '✓ Inconel 718Plus — 718 와 동일 procedure. **ER 718Plus matching filler** (ATI Allvac).'}
                            {!weldWorst && /^inconel ?x-?750|^in[\s-]?x-?750/i.test(material.name || '') &&
                              '⚠ Inconel X-750 (γ\' precipitation, Vf 15%) — strain-age cracking 가능. **EBW 권장** (low heat input). GTAW 시 solution-treated condition + post-weld solution + aging 필수.'}
                            {!weldWorst && /^inconel ?(738|100|939|713)|^in[\s-]?(738|100)|^rene ?80|^rene ?142|^mar-?m/i.test(material.name || '') &&
                              '⚠⚠ Cast γ\' high-Vf (IN-738/100/939, Rene 80, MAR-M) — fusion welding 매우 어려움. **EBW only** (vacuum, low heat input). Repair only — Ni-base braze filler (BNi-1, AMS 4778) 사용 권장.'}
                            {!weldWorst && /^hastelloy ?c-?(22|276|2000)|^alloy c-?(22|276)/i.test(material.name || '') &&
                              '✓ Hastelloy C-22/C-276/C-2000 (solid-solution Ni-Cr-Mo) — 우수. **ERNiCrMo-10 (C-22, AMS 5800), ERNiCrMo-4 (C-276, AMS 5789)** filler. Solution-annealed condition. Sigma phase 540-820°C 영역 회피.'}
                            {!weldWorst && /^hastelloy ?x\b|^alloy x\b|^un n06002/i.test(material.name || '') &&
                              '✓ Hastelloy X (Ni-Cr-Fe-Mo solid solution) — 우수. **ERNiCrMo-2 (AMS 5798)** filler. Combustor liner 표준 (F100/F404/F119 engine). Pre-heat 미요.'}
                            {!weldWorst && /^hastelloy ?b-?[23]\b/i.test(material.name || '') &&
                              '⚠ Hastelloy B-2/B-3 (Ni-28Mo) — sigma phase 540°C+ 우려. **ERNiMo-7 (B-2, AMS 5837)** filler. Solution-annealed only. Welded part PWHT 1120°C SHT + water quench 권장.'}
                            {!weldWorst && /^haynes ?(230|556|214)\b|^alloy ?(230|556|214)\b/i.test(material.name || '') &&
                              '✓ Haynes 230/556/214 (solid-solution + La) — 우수. **ERNiCrWMo-1 (230, AMS 5839)** matching filler. GTAW with Ar shielding. Lanthanum oxide → stable arc.'}
                            {!weldWorst && /^haynes ?282\b/i.test(material.name || '') &&
                              '✓ Haynes 282 (γ\' Vf low ~ 19%) — 신소재, low SAC. **ER 282 matching filler** (Haynes spec). EBW 권장, GTAW 가능 (solution-treated). Post-weld STA 표준 (1010°C + 788°C/8h).'}
                            {!weldWorst && /^haynes ?188|^l-?605|^haynes ?25/i.test(material.name || '') &&
                              '✓ Haynes 188 (Co-22Cr-22Ni-14W) / L-605 (Co-Cr-W-Ni) — 우수. **ERCoCrW-A (AMS 5772)** filler. F100 jet engine combustor liner 표준 (sheet < 1.5mm GTAW).'}
                            {!weldWorst && /^waspaloy\b|^rene ?41|^rene ?88|^astroloy|^u(?:dimet)? ?720/i.test(material.name || '') &&
                              '⚠⚠ γ\' high-Vf wrought (Waspaloy Vf 25%, Rene 41 Vf 40%, Astroloy/U-720) — strain-age cracking 위험 매우 高. **EBW only** (low heat input + immediate solution treatment). GTAW 시 over-aged condition 필수, post-weld 직후 solution treatment.'}
                            {!weldWorst && /^cmsx|^rene ?n5|^pwa ?14|directionally.?solidified|sx[\s-]?single/i.test(material.name || '') &&
                              '⚠⚠⚠ SX (Single-Crystal) — fusion welding 거의 불가능 (single crystal 구조 깨짐). **Repair only** — directionally-solidified weld with seed crystal. Rene N5/CMSX-4 turbine blade tip 수리 = LMD (Laser Metal Deposition).'}
                            {!weldWorst && /^monel ?400\b|^alloy ?400\b/i.test(material.name || '') &&
                              '✓ Monel 400 (Ni-Cu 70/30 solid solution) — 우수. **ERNiCu-7 (AMS 4831)** matching filler. GTAW or GMAW. Sulfur contamination 회피 (HAZ embrittlement).'}
                            {!weldWorst && /^monel ?k-?500\b/i.test(material.name || '') &&
                              '✓ Monel K-500 (γ\' precipitation) — Inconel 718 와 비슷 procedure. **ERNiCuAl-1 matching** filler. Solution treated condition + post-weld aging (Al/Ti precipitate).'}
                            {!weldWorst && /^a-?286|^uns s66286/i.test(material.name || '') &&
                              '✓ A-286 (Fe-Ni γ\' precipitation) — 718 와 비슷. **ERNiFeCrMo-1** filler. Solution treated + post-weld aging.'}
                            {!weldWorst && /^incoloy ?(800|825|909|925)/i.test(material.name || '') &&
                              '✓ Incoloy 800H/825 (solid solution) — 우수. **ERNiCrMo-3 (825), ERNiCr-3 (800H)** filler. Pre-heat 미요. PWHT 미요.'}
                            {/* === Cobalt-based === */}
                            {!weldWorst && /^cocrmo|^co-?cr-?mo|^astm f75|^astm f1537/i.test(material.name || '') &&
                              '주의. CoCrMo (medical implant grade, F75 cast / F1537 wrought) — **ERCoCr-A** filler (matching). GTAW DC EN with Ar. Solution-annealed condition (1175°C SHT) 에서 weld. Carbide reprecipitation 회피 (재용해 후 quench).'}
                            {!weldWorst && /^stellite ?(6|12|21)\b/i.test(material.name || '') &&
                              '주의. Stellite 6/12/21 (hard-facing overlay) — **ERCoCr-A/B/E** filler. PTA (Plasma Transferred Arc) 또는 laser cladding 권장 (GTAW 가능). Dilution < 10% 통제.'}
                            {!weldWorst && /^mp35n|^elgiloy|^ultimet/i.test(material.name || '') &&
                              '주의. MP35N/Elgiloy (Co-Ni-Cr-Mo multiphase) — **ERCoCrMo-A** filler. Cold-worked condition 에서 weld 시 강도 손실 100%. Solution-annealed only.'}
                            {/* === Mg 합금 (AWS D1.1) === */}
                            {!weldWorst && /^az31|^az80a?\b/i.test(material.name || '') &&
                              '✓ Wrought Mg AZ31/AZ80 — 우수 (가장 weldable Mg). **ERAZ61A** filler. GTAW AC sine with Ar (high frequency). Pre-heat 300°C 두꺼운 plate. ⚠ Mg shaving fire — wet swarf cleanup.'}
                            {!weldWorst && /^az91d?\b|^am[56]0|^am-lite/i.test(material.name || '') &&
                              '주의. Die-cast Mg AZ91/AM60 (high Al) — porosity 위험 (entrapped gas). **ER AZ92A** filler. Re-melt zone 만 weldable (fully solidified zone 만). HPDC porosity 다수.'}
                            {!weldWorst && /^we43\b|^we54\b/i.test(material.name || '') &&
                              '⚠ WE43/54 (Mg-Y-Nd-RE) — RE element 가 oxide 생성. **ERWE43** matching filler. Vacuum or pure Ar (no leak). 의료 임플란트 → controlled cleanroom welding.'}
                            {!weldWorst && /^zk60|^ze41|^ez33a|^hk31a/i.test(material.name || '') &&
                              '주의. Mg-Zn-Zr / RE 합금 (ZK60/ZE41/EZ33A) — **ER AZ92A** filler (RE filler 없을 시). Pre-heat 250-300°C. Solution treatment 후 fast cool.'}
                            {/* === Cu 합금 (AWS D1.4) === */}
                            {!weldWorst && /^c10[01]\d{2}\b|^ofe ?copper|^ofhc ?copper|^c11000/i.test(material.name || '') &&
                              '주의. Pure Cu (C10100/10200/11000) — 매우 high thermal conductivity (400 W/m·K). **ER Cu (AMS 4731)** filler. **Pre-heat 400-500°C 필수** (두꺼운 plate). GTAW DC EN with Ar + He (1:1) mix.'}
                            {!weldWorst && /^c1[78]\d{3}\b|^cu-?cr-?zr|^c18150|^c18000|^grcop/i.test(material.name || '') &&
                              '주의. PH Cu (CuCrZr C18150, CuNiSiCr C18000, GRCop-42) — solution-annealed condition. **ERCu** or **ERCuCr matching** filler. Post-weld aging (450-500°C) 필수.'}
                            {!weldWorst && /^c17200|^cube|^berryllium copper/i.test(material.name || '') &&
                              '⚠ BeCu C17200 — **⚠ Be dust/fume 발암성** (NIOSH 1A). Full PPE + ULPA fume extraction. **ERCuBe** filler (Materion supply). Solution-annealed condition.'}
                            {!weldWorst && /^c2[123]\d{3}|^red brass|^c22000|^c23000/i.test(material.name || '') &&
                              '주의. Red Brass (C21000/22000/23000) — Zn fume 위험 (vent 必). **ERCuSn-A (phosphor bronze) 또는 ERCuSi-A (silicon bronze)** filler. Pre-heat 200-300°C.'}
                            {!weldWorst && /^c26000|^c26800|^c36000|^naval brass|^c46400/i.test(material.name || '') &&
                              '주의. Cartridge/Yellow brass (C26000), Free-mach brass (C36000), Naval brass (C46400) — **Pb fume in C36000 위험**. ERCuSn-A filler. C46400: 우수 (Sn 함유로 dezincification 회피).'}
                            {!weldWorst && /^c70[60]00|^c715[00]|^cuni|^cupronickel/i.test(material.name || '') &&
                              '✓ Cupronickel C70600 (90/10) / C71500 (70/30) — 우수. **ERCuNi (AMS 4715)** matching filler. GTAW or GMAW. FPSO seawater piping 표준.'}
                            {!weldWorst && /^c75200|^nickel silver|^german silver/i.test(material.name || '') &&
                              '주의. Nickel Silver C75200 — Cu-Ni-Zn. **ERCuNi or ERNiCu-7** filler. Zn fume vent. Pre-heat 200°C.'}
                            {!weldWorst && /^c95800|^nickel aluminum bronze|^nab\b/i.test(material.name || '') &&
                              '✓ NAB C95800 (Ni-Al bronze) — 우수. **ERCuNiAl (AMS 4870)** matching filler. Marine propeller welding 표준 (ABS / DNV / KR class).'}
                            {/* === Refractory metals === */}
                            {!weldWorst && /^tantalum\b|^ta\b\s*\(|^ta-?10w/i.test(material.name || '') &&
                              '✓ Tantalum (uniquely weldable refractory) — **EBW (vacuum) 또는 GTAW in Ar glove-box** (Ta + O2 → Ta2O5 embrittlement). Matching Ta filler. Ta-10W = 동일 procedure.'}
                            {!weldWorst && /^tungsten\b|^w-la\b|^pure tungsten/i.test(material.name || '') &&
                              '⚠⚠ Tungsten — fusion welding 매우 어려움 (Tm 3422°C, brittle DBTT 300°C). **EBW only** (vacuum). Sintered W heavy alloy (W-Ni-Fe) 는 ERNiCr filler 로 brazing.'}
                            {!weldWorst && /^molybdenum\b|^mo-?la|^mo-?0\.5ti|^tzm\b|^mo-?re\b/i.test(material.name || '') &&
                              '⚠ Mo / TZM / Mo-La / Mo-Re — **EBW preferred**. GTAW in Ar glove-box (O2 absorption → recrystallization). Pre-heat 400°C. Post-weld stress relief 1100°C.'}
                            {!weldWorst && /^niobium\b|^c-?103\b|^nb-?1zr/i.test(material.name || '') &&
                              '✓ Niobium / C-103 (Nb-Hf-Ti) — Ta 와 비슷 (weldable refractory). **EBW (vacuum) 또는 GTAW high-purity Ar**. C-103 = nuclear thermal rocket 표준 (Plansee/ATI).'}
                            {!weldWorst && /^rhenium\b|^pure rhenium/i.test(material.name || '') &&
                              '⚠⚠ Rhenium — **EBW only** (Tm 3186°C, dense, brittle). Cost $5000+/kg → repair-only.'}
                            {!weldWorst && /^chromium\b|^pure cr|^pure chromium/i.test(material.name || '') &&
                              '⚠⚠ Pure Cr — RT brittle (DBTT 300°C). **Welding impractical** — Cr plating / coating 으로 사용.'}
                            {!weldWorst && /^hafnium\b|^pure hf/i.test(material.name || '') &&
                              '✓ Hafnium — Zr 와 동일 procedure. **GTAW or EBW**. Reactor control rod 표준 (US Navy nuclear submarine).'}
                            {!weldWorst && /^vanadium\b|^pure v\b/i.test(material.name || '') &&
                              '주의. Pure V — **GTAW in Ar glove-box** (rapid oxidation > 300°C). V-Cr-Ti 합금 (fusion reactor) 표준.'}
                            {!weldWorst && /^zirconium\b|^zr-?2\.5nb|^zircaloy/i.test(material.name || '') &&
                              '✓ Zr / Zircaloy / Zr-2.5Nb — Ti 와 비슷 procedure. **GTAW with Ar (front+back)** or EBW. PWR/BWR fuel cladding 표준. O/N absorption 회피.'}
                            {/* === Specialty 가공 합금 === */}
                            {!weldWorst && /^invar ?36|^kovar/i.test(material.name || '') &&
                              '✓ Invar 36 / Kovar (Fe-Ni / Fe-Ni-Co low-CTE) — 우수. Matching Invar/Kovar filler. GTAW with Ar. Vacuum chamber / glass-metal seal 표준. PWHT 870°C/2h (stress relief).'}
                            {!weldWorst && /^maraging|^vascomax|^18ni-?\d/i.test(material.name || '') &&
                              '✓ Maraging Steel (18Ni-7Co-5Mo-Ti, C-free) — 매우 우수 (no HAZ crack). **ER 18Ni Maraging matching** filler. Solution treated condition → weld → post-weld aging (480°C/3-6h).'}
                            {!weldWorst && /^nitinol\b|^niti\b/i.test(material.name || '') &&
                              '⚠ Nitinol (NiTi shape-memory) — laser welding only (precision medical). Heat affects shape-memory transformation temperature.'}
                            {!weldWorst && /^beryllium\b/i.test(material.name || '') &&
                              '⚠⚠ Pure Beryllium — **⚠⚠ Be dust/fume 발암성** (NIOSH 1A carcinogen, OSHA PEL 0.2 μg/m³). Welding rarely done — brazing preferred (BAg series).'}
                            {!weldWorst && /^zamak ?[35]\b/i.test(material.name || '') &&
                              '주의. Zamak 3 (Zn die-cast) — low melt 점 (385°C). Welding rarely done — replace 또는 soldering (Zn-Al filler) 권장.'}
                          </p>
                          {sch && <p className="text-[11px] leading-relaxed text-foreground/80 mt-1">{sch.note}</p>}
                          <p className="text-[10px] mt-2 pt-1.5 border-t border-current/10 text-foreground/60">
                            <b>출처 / 기준</b>: {(ce_iiw || cet || pcm || sch) ? 'IIW Doc IX-535-67 (CE_IIW) · IIW IX-1086-87 (CET, Thyssen) · JIS (Pcm, Ito-Bessyo 1969) · AWS A3.0 / Schaeffler 1949 · ASM Vol.6 Welding' : 'ASM Vol.6 Welding · AWS D1.2 (Al) / D1.6 (stainless) / D17.1 (aerospace) · Handbook qualitative rating'}
                          </p>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              );
            })()}

            {/* R113 — Polymer 한정 카드 (Flame UL94 / UV / Moisture / Tg / HDT). Metal/Ceramic/Composite hide. */}
            {material.category === 'Polymer' && (() => {
              const meta = material.meta || {};
              const flame = meta.flame_ul94 as string | undefined;
              const uv = meta.uv_resistance as string | undefined;
              const moisture = meta.moisture_24h as number | undefined;
              const tg = material.ranges?.glass_transition_temp?.typical;
              const hdt = material.ranges?.hdt_182?.typical;
              if (!flame && !uv && moisture == null && tg == null && hdt == null) return null;
              const flameColor = flame === 'V-0' ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
                : flame === 'V-1' ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                : flame === 'V-2' ? 'text-amber-700 bg-amber-50 border-amber-300'
                : 'text-rose-700 bg-rose-50 border-rose-300';
              const uvColor = uv === 'Excellent' ? 'text-emerald-700' : uv === 'Good' ? 'text-emerald-600' : uv === 'Fair' ? 'text-amber-700' : 'text-rose-700';
              const moistColor = (moisture ?? 0) < 0.5 ? 'text-emerald-700' : (moisture ?? 0) < 1.5 ? 'text-amber-700' : 'text-rose-700';
              return (
                <details open className="rounded-lg border-2 border-violet-300 bg-violet-50/50 p-3">
                  <summary className="text-[12px] font-bold flex items-center justify-between cursor-pointer select-none list-none text-violet-900">
                    <span className="flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5" />Polymer-specific Properties</span>
                    <span className="text-[10px] font-normal opacity-70">UL94 · UV · Moisture · Tg · HDT</span>
                  </summary>
                  <div className="space-y-1.5 text-[12px] mt-2 pt-2 border-t border-violet-300/50">
                    {flame && (
                      <div className="flex items-baseline justify-between gap-2 p-1.5 rounded border">
                        <b className="text-foreground/80">난연성 UL94</b>
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono border ${flameColor}`}>{flame}</span>
                      </div>
                    )}
                    {uv && (
                      <div className="flex items-baseline justify-between gap-2">
                        <b className="text-foreground/80">UV 내성</b>
                        <span className={`text-[11px] font-mono ${uvColor}`}>{uv}</span>
                      </div>
                    )}
                    {moisture != null && (
                      <div className="flex items-baseline justify-between gap-2">
                        <b className="text-foreground/80">수분 흡수 (24h, dry as molded)</b>
                        <span className={`text-[11px] font-mono ${moistColor}`}>{moisture}%</span>
                      </div>
                    )}
                    {tg != null && (
                      <div className="flex items-baseline justify-between gap-2">
                        <b className="text-foreground/80">Glass Transition Tg</b>
                        <span className="text-[11px] font-mono">{tg}°C</span>
                      </div>
                    )}
                    {hdt != null && (
                      <div className="flex items-baseline justify-between gap-2">
                        <b className="text-foreground/80">HDT @ 1.82 MPa</b>
                        <span className="text-[11px] font-mono">{hdt}°C</span>
                      </div>
                    )}
                    <p className="text-[10px] mt-2 pt-1.5 border-t border-violet-300/30 text-foreground/60">
                      <b>출처 / 기준</b>: UL94 (Flame), ISO 4892 (UV), ISO 62 (Moisture 24h DAM), ISO 11357 (Tg DSC), ISO 75-A (HDT 1.82 MPa). polymers-data 19종 vendor handbook + 94종 family typical.
                    </p>
                  </div>
                </details>
              );
            })()}

            {/* R76 → R87 — History·개발 스토리. R174: 기본 접힘 (collapse) — 사용자 요청.
                긴 story 가 detail panel 의 상단 영역을 차지하던 issue 해소. 클릭 시만 펼침. */}
            {(material.story || material.industry_note) && (
              <details className="rounded border p-3" style={{ background: `${famColor}10`, borderColor: `${famColor}55` }}>
                <summary className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none" style={{ color: famColor }}>
                  <BookText className="w-3.5 h-3.5" />
                  {t('detail.history') || 'History · 개발 스토리'}
                  <span className="ml-auto text-[10px] font-normal opacity-60">▸ 클릭하여 펼침</span>
                </summary>
                {material.industry_note && (
                  <p className="mt-2 text-[11px] text-foreground/80 leading-relaxed">
                    <span className="font-semibold" style={{ color: famColor }}>📌 Industry standard:</span> {material.industry_note}
                  </p>
                )}
                {material.story && (
                  <div className="mt-2 space-y-2 text-[11.5px] text-foreground/85 leading-relaxed">
                    {material.story.split('\n\n').map((para, i) => (
                      <p key={i} className="whitespace-pre-wrap">{para}</p>
                    ))}
                  </div>
                )}
                {Array.isArray(material.story_refs) && material.story_refs.length > 0 && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: `${famColor}33` }}>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: famColor }}>출처 · References</p>
                    <ul className="text-[10px] text-foreground/65 space-y-0.5 leading-snug list-disc list-inside">
                      {material.story_refs.map((r, i) => (
                        <li key={i} className="whitespace-pre-wrap">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </details>
            )}
            {/* R148 / R161 — 유사 · 대체 재료 추천 Composition tab 으로 이동. 여기는 빈 자리. */}
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
            {material.heat_treatment && (() => {
              /* R140 — alloy-specific HT 우선, 없으면 generic glossary. */
              const alloyHt = htAlloySpecificFor(material.name, material.heat_treatment);
              const g = htGlossaryFor(material.heat_treatment);
              return (
                <Field label="Condition / heat treatment">
                  <span>{material.heat_treatment}</span>
                  {alloyHt ? (
                    <span
                      className="ml-1.5 text-[10px] text-sky-700 italic"
                      title={`${alloyHt.description.title}\n공정: ${alloyHt.description.process}\n결과: ${alloyHt.description.resulting}\n적용: ${alloyHt.description.useCase}${alloyHt.description.caveat ? `\n⚠ ${alloyHt.description.caveat}` : ''}\n출처: ${alloyHt.description.source}`}
                    >— {alloyHt.description.title} (Process 탭 참조)</span>
                  ) : g ? (
                    <span className="ml-1.5 text-[10px] text-muted-foreground italic" title={g.short}>— {g.effect}</span>
                  ) : null}
                </Field>
              );
            })()}
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
            {meta.heat_treatments && (meta.heat_treatments as string[]).length > 0 && (
              <Field label="Heat treatments">
                {/* R63 G — 효과 multiline · 색조 강화. 좁은 panel 에서 ellipsis 없이 가독성 ↑. */}
                <ul className="space-y-1.5 mt-0.5">
                  {(meta.heat_treatments as string[]).map((ht, i) => {
                    const g = htGlossaryFor(ht);
                    return (
                      <li key={i} className="leading-snug">
                        <span className="font-mono text-foreground text-[12px]">{ht}</span>
                        {g && <span className="block text-[10px] text-muted-foreground/90 italic mt-0.5">— {g.effect}</span>}
                      </li>
                    );
                  })}
                </ul>
              </Field>
            )}
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
