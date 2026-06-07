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
                            {/* === Ti 합금 (AWS D17.1 aerospace) — R175 주의사항 강화 === */}
                            {!weldWorst && /^ti[\s-]?grade ?[1234]\b|^cp-?ti\b|^unalloyed ti/i.test(material.name || '') &&
                              '✓ CP-Ti (α single phase) — 가장 weldable Ti grade. **ERTi-1 (R50250) / ERTi-2 (R50400) / ERTi-3 / ERTi-4** matching filler. GTAW DC EN, **Ar shielding: 25 L/min front + 15 L/min trailing + back-purge (root side Ar 5 L/min)** 必. ⚠ **주의 1 — O/N/H 흡수 → embrittlement (가장 critical)**: 500°C+ 에서 O/N/H 가 α-phase 에 침투 → α-case 형성 (hard + brittle 표층). **Color test**: 정상 weld bead 은 silver/light straw, 황금색 = O 약간 흡수 (acceptable), 보라/blue = 심함 (재용접), grey/white = severe (폐기). ⚠ **주의 2 — Cleanliness 절대 필수**: pre-weld acetone wipe + SS brush only (carbon steel/Cu brush 금지 — Fe/Cu contamination → embrittlement). Glove cotton, fingerprint X. ⚠ **주의 3 — Tungsten contamination**: 2% ThO₂ tungsten electrode (red) 또는 2% La₂O₃ (blue, safer — Th 방사능 회피) 권장. Stub end 1.5× electrode diameter. NDT: visual color + LP + bend test per AWS D17.1 Class B (commercial) / Class A (aerospace).'}
                            {!weldWorst && /^ti-?6al-?4v|^ti[\s-]?grade ?5\b|^ti gr5/i.test(material.name || '') &&
                              '✓ Ti-6Al-4V (α+β Gr5, R56400) — GTAW DC EN with **ERTi-5 (R56400) matching filler** (또는 ERTi-23 ELI for medical applications). Ar shielding **25 L/min front + 15 L/min trailing + back-purge (root Ar 5 L/min) 必** — Ar purity ≥ 99.997% (welding grade), dew point < -50°C. ⚠ **주의 1 — α-case (interstitial pickup)**: 500°C+ atmosphere → O/N/H absorption + α-case 형성 (HV 600+ brittle layer). 정상 weld 색: **silver / light straw**. 황금색 acceptable, 보라/blue 재용접, grey 폐기. ⚠ **주의 2 — Heat tint test**: NDT 보충용 — bead color + side color 확인. ⚠ **주의 3 — Post-weld heat treatment**: as-welded σy 약 88% retention. Solution + Aged (955°C SHT + 540°C/4h aging) post-weld 시 fully recover. ⚠ **주의 4 — Distortion**: high CTE (8.9 ppm/K) + low thermal conductivity (6.7 W/m·K) → 변형 大. Fixture clamping + skip-step welding 必. NDT: visual + LP + RT per AWS D17.1 Class A.'}
                            {!weldWorst && /^ti.*grade ?(23|7|9|12)\b|^ti-?3al-?2\.5v|^ti-?6al-?7nb/i.test(material.name || '') &&
                              '✓ Ti Gr9 (Ti-3Al-2.5V) / Gr12 / Gr23 ELI (medical) — ELI = Extra Low Interstitial (O ≤ 0.13%). **ERTi-9 (Ti-3Al-2.5V) / ERTi-23 (R56407)** matching filler. AWS D17.1 Class A 표준 (no porosity > 0.13mm dia, no crack, color = silver/straw). ⚠ **주의 1 — Medical implant 등급은 cleanroom welding (RH < 40%, particle < ISO Class 7)** + 모든 도구 의료용 SS 만 사용. ⚠ **주의 2 — Pulse GTAW 권장**: pulse current (peak 100 A / base 30 A, 2 Hz) 로 heat input 통제 → α-case 최소화. ⚠ **주의 3 — Mechanical test**: bend test (180°, mandrel diameter 4t) 필수 — Gr23 medical 은 100% sample inspection.'}
                            {!weldWorst && /^beta-?21s|^beta-?c|^ti-?13v|^ti-?15-?3|^ti-?10v|^ti-?5553/i.test(material.name || '') &&
                              '⚠ β-Ti (Beta-21S / Beta-C / Ti-15-3 / Ti-5553 / Ti-10-2-3) — β stabilizer 농축 → **solidification crack 위험 大**. **EBW (Electron Beam Welding, vacuum 10⁻⁴ mbar) 권장** (low heat input + clean atmosphere). GTAW 시 inter-pass < 150°C 통제 (β-recrystallization 회피). ⚠ **주의 1 — Solution + STA post-weld 필수**: as-welded 의 β-phase 가 weld 후 그대로 → σy 손실 50%. Solution (β-transus 위 1-2시간) + Aged (480-540°C/8h) 처리 후 σy 회복. ⚠ **주의 2 — Solidification crack**: Mo/V β stabilizer 가 narrow solidification range 만들어 hot tear. Constraint 회피 (fixture loose), tabular bead 권장. ⚠ **주의 3 — α-case formation 동일**: O/N 흡수 → embrittlement. β-Ti 는 cold work 후 used 라 cleanness 더 critical. NDT: LP + RT per AMS 4978 (Beta-21S) / 4980 (Beta-C).'}
                            {/* === Ni superalloy (AMS Ni filler) — R175 주의사항 강화 === */}
                            {!weldWorst && /^inconel ?(600|601|625|617|690)|^in[\s-]?(600|625|617)/i.test(material.name || '') &&
                              '✓ Solid-solution Ni (Inconel 600/601/625/617/690) — fusion welding 우수. **ERNiCr-3 (600/X-750, AMS 5679), ERNiCrMo-3 (625, AMS 5837), ERNiCrCoMo-1 (617, AMS 5887)** matching filler. GTAW DC EN with **Ar + He (75/25) mix** (He 가 puddle wetting + penetration ↑). Pre-heat 미요, **inter-pass < 175°C 통제 (carbide precipitation 회피)**. ⚠ **주의 1 — Sulfur embrittlement**: surface S contamination (oil/SO₂/sulfide) → HAZ embrittlement crack. **Pre-clean acetone + grit blast 必**. ⚠ **주의 2 — High-T 응용 (600/617/690 — nuclear/유리 furnace)**: weld 후 PWHT 1050°C/30min/air-cool (carbide dissolution) 권장. ⚠ **주의 3 — 625 의 Nb segregation**: laves phase (Ni₂NbAl) HAZ 석출 → 균열 가능. 빠른 cooling 권장. NDT: PT + RT per ASME B&PV Sec.IX.'}
                            {!weldWorst && /^inconel ?718\b|^in[\s-]?718\b|^alloy ?718\b/i.test(material.name || '') &&
                              '✓ Inconel 718 (γ\'\' Ni₃Nb slow aging — no SAC = uniquely weldable PH Ni alloy) — GTAW / EBW / LBW 모두 OK. **ERNiFeCr-2 (AMS 5832) matching filler**. **Solution treated (Sol-T) condition 에서 weld** (aged condition X — 응력 + 균열). Post-weld **STA (Solution + Two-step Aging)**: 980°C/1h SHT + AC → 720°C/8h + FC 50°C/h to 620°C/8h + AC. ⚠ **주의 1 — Solidification crack (laves phase Ni₂(Nb,Mo))**: Nb 5% + Mo 3% segregation → low-melt eutectic 위험. Sol-T condition + low heat input + 빠른 cooling. ⚠ **주의 2 — Sub-solvus 영역 control**: weld 후 920°C SHT (sub-γ\'\' solvus) 사용하면 grain refinement. ⚠ **주의 3 — Distortion**: 두꺼운 disk weld 시 fixture + back-to-back symmetric welding. NDT: RT (X-ray) + PT per AMS 5832 / ASME Sec.IX.'}
                            {!weldWorst && /^inconel ?718plus\b/i.test(material.name || '') &&
                              '✓ Inconel 718Plus (ATI Allvac, Co 첨가 γ\'/γ\'\' dual precipitate, +50°C 사용 vs 718) — 718 와 procedure 동일. **ER 718Plus matching filler**. ⚠ **주의 — 718 보다 γ\' Vf 약간 ↑** → SAC 위험 약간 증가. Sol-T condition + low heat input.'}
                            {!weldWorst && /^inconel ?x-?750|^in[\s-]?x-?750/i.test(material.name || '') &&
                              '⚠ Inconel X-750 (γ\' Ni₃(Al,Ti) precipitation, Vf 15%) — **strain-age cracking (SAC) 위험 高**. **EBW 권장** (low heat input, vacuum 10⁻⁵ mbar). GTAW 강행 시 solution-treated condition 에서만 weld + post-weld solution (1150°C/1h) + double aging (845°C + 705°C). ⚠ **주의 1 — Re-heat crack**: HAZ 의 γ\' aging 이 weld 직후 RT cooling 중 시작 → 균열. **Continuous solution (welding 직후 1150°C) 권장**. ⚠ **주의 2 — Constraint sensitivity**: 두꺼운 plate / 고정 fixture → 응력 집중 → SAC. NDT: RT + PT 100% 검사.'}
                            {!weldWorst && /^inconel ?(738|100|939|713)|^in[\s-]?(738|100)|^rene ?80|^rene ?142|^mar-?m/i.test(material.name || '') &&
                              '⚠⚠ Cast γ\' high-Vf (IN-738/100/939, Rene 80/142, MAR-M 247, Vf 43-65%) — **fusion welding 매우 어려움 / 거의 불가**. **EBW only** (vacuum 10⁻⁵ mbar, focused beam, low heat input). Repair (turbine blade tip restoration) 만 가능 — **Ni-base braze filler (BNi-1, AMS 4778) 또는 vacuum brazing (1180°C)** 사용. ⚠ **주의 1 — Massive SAC**: γ\' Vf > 40% 이상에서는 GTAW/GMAW 시 100% 균열. ⚠ **주의 2 — Repair 후 X-ray 100%**: 사용 중 turbine blade tip clearance 손실 → repair → RT inspection.'}
                            {!weldWorst && /^hastelloy ?c-?(22|276|2000)|^alloy c-?(22|276)/i.test(material.name || '') &&
                              '✓ Hastelloy C-22/C-276/C-2000 (solid-solution Ni-Cr-Mo) — fusion welding 우수. **ERNiCrMo-10 (C-22, AMS 5800), ERNiCrMo-4 (C-276, AMS 5789), ERNiCrMo-17 (C-2000)** matching filler. Solution-annealed condition 에서만 weld. ⚠ **주의 1 — Sigma + μ phase 석출 (540-820°C 영역)**: weld 후 이 T 영역 노출 시 critical pitting resistance 감소. **Inter-pass 250°C max** 통제, post-weld solution annealing (1120°C SHT + 빠른 cooling, AMS 5854) 권장. ⚠ **주의 2 — Sensitization test**: ASTM G28 method A (ferric sulfate + sulfuric acid) 통과 必. NDT: PT + RT per ASME B&PV Sec.VIII Div.1.'}
                            {!weldWorst && /^hastelloy ?x\b|^alloy x\b|^un n06002/i.test(material.name || '') &&
                              '✓ Hastelloy X (Ni-Cr-Fe-Mo solid solution) — F100/F404/F119/F135 jet engine combustor liner 표준 (sheet < 1.5mm GTAW). **ERNiCrMo-2 (AMS 5798) matching filler**. Pre-heat 미요. ⚠ **주의 1 — Sigma phase (650-900°C 의 장기 노출)**: 사용 중 brittle. ⚠ **주의 2 — Thin-sheet distortion**: 0.5-1.0 mm 항공 sheet 의 GTAW 시 pulse 사용 (peak 50 A / base 15 A, 5 Hz) + skip-step. NDT: visual + LP per AMS 5754.'}
                            {!weldWorst && /^hastelloy ?b-?[23]\b/i.test(material.name || '') &&
                              '⚠ Hastelloy B-2/B-3 (Ni-28Mo, HCl 산 환경 최강) — **sigma + μ phase 540-820°C 우려**. **ERNiMo-7 (B-2, AMS 5837), ERNiMo-10 (B-3) matching filler**. Solution-annealed condition only. ⚠ **주의 1 — Welded part 의 service performance 손실**: HAZ 가 sensitization 영역 (540-820°C) 통과 → 부식 저항 손실. **PWHT 1120°C/30min + water quench (AMS 5854) 必**. ⚠ **주의 2 — Mo segregation**: Mo 28% 의 Ni 매트릭스 → micro-segregation → laves phase 가능. Low heat input + 빠른 cooling. ⚠ **주의 3 — B-3 우수 (B-2 보다)**: B-3 의 Ti 첨가 + 낮은 Fe 가 sigma 형성 회피. Welded structural application 은 B-3 권장.'}
                            {!weldWorst && /^haynes ?(230|556|214)\b|^alloy ?(230|556|214)\b/i.test(material.name || '') &&
                              '✓ Haynes 230/556/214 (solid-solution + La oxide stabilization) — **ERNiCrWMo-1 (230, AMS 5839), ERNiCrCoMo-2 (556), ERNiCrAl-1 (214)** matching filler. GTAW with Ar shielding. ⚠ **주의 — La₂O₃ stable arc + thin oxide layer**: Lanthanum 가 arc 안정성 + 부식 저항 oxide. Pre-clean 시 stainless brush only. Inter-pass < 175°C.'}
                            {!weldWorst && /^haynes ?282\b/i.test(material.name || '') &&
                              '✓ Haynes 282 (γ\' Vf 19%, low-SAC superalloy, A-USC boiler 표준) — **ER 282 matching filler** (Haynes spec). EBW 권장, GTAW 가능 (Sol-T condition). Post-weld STA: 1010°C/2h SHT + AC → 788°C/8h aging. ⚠ **주의 1 — Strain-age cracking 가능 (Waspaloy 보다는 낮음)**: 두꺼운 section + 고정 fixture 회피. Sol-T condition + low heat input. ⚠ **주의 2 — Post-weld STA distortion**: 두꺼운 forging 의 SHT 시 distortion. Fixture support 필요.'}
                            {!weldWorst && /^haynes ?188|^l-?605|^haynes ?25/i.test(material.name || '') &&
                              '✓ Haynes 188 (Co-22Cr-22Ni-14W) / L-605 (Co-Cr-W-Ni, Haynes 25) — F100/F404 jet engine afterburner liner sheet 표준 (< 1.5mm GTAW). **ERCoCrW-A (AMS 5772) matching filler**. ⚠ **주의 1 — W 14% 의 dendritic segregation**: low heat input + 빠른 cooling. ⚠ **주의 2 — Sigma + Laves phase (650-900°C 장기 노출)**: 사용 중 brittle. ⚠ **주의 3 — Thin sheet distortion**: pulse GTAW + skip-step (4 pass 표준 — 1/3/2/4 sequence).'}
                            {!weldWorst && /^waspaloy\b|^rene ?41|^rene ?88|^astroloy|^u(?:dimet)? ?720/i.test(material.name || '') &&
                              '⚠⚠ γ\' high-Vf wrought (Waspaloy γ\' Vf 25%, Rene 41 Vf 40%, Astroloy 50%, U-720Li 45%) — **strain-age cracking (SAC) 위험 매우 高**. **EBW only** (low heat input + immediate post-weld solution treatment 1180°C/1h). GTAW 강행 시 **over-aged condition** (850°C/16h pre-temper) 에서만 weld + post-weld 직후 solution (가열 보류 시 균열 진행). ⚠ **주의 1 — Crack 진행 메커니즘**: weld 직후 cooling 중 γ\' precipitation 이 응력 집중 영역에 빠르게 일어나 brittle crack 진행. ⚠ **주의 2 — 100% RT 필수**: turbine disc forging weld 는 모든 weld zone X-ray 100% 검사. Defect detect 시 grind + re-weld + re-RT cycle (3회 max).'}
                            {!weldWorst && /^cmsx|^rene ?n5|^pwa ?14|directionally.?solidified|sx[\s-]?single/i.test(material.name || '') &&
                              '⚠⚠⚠ SX (Single-Crystal Ni superalloy: CMSX-4/10, Rene N5/N6, PWA 1480/1484) — **fusion welding 거의 불가능** (single crystal 구조가 polycrystalline weld pool 으로 변환 → blade efficiency 손실). **Repair only** — **LMD (Laser Metal Deposition) + Directional Solidification (DS) 시드 crystal 사용**. ⚠ **주의 1 — Crystal orientation 보존**: weld pool 의 epitaxial solidification 으로 base crystal orientation 유지 가능 (단 작은 부피만). ⚠ **주의 2 — Stray grain (다른 방향 결정)**: 부피 > 5mm³ 이면 stray grain 생성 → 구조 손실. ⚠ **주의 3 — Repair 한도**: turbine blade tip < 3mm restoration 만 commercial. 깊은 repair = scrap.'}
                            {!weldWorst && /^monel ?400\b|^alloy ?400\b/i.test(material.name || '') &&
                              '✓ Monel 400 (Ni-Cu 70/30 solid solution, marine 표준) — fusion welding 우수. **ERNiCu-7 (AMS 4831) matching filler**. GTAW or GMAW. ⚠ **주의 1 — Sulfur embrittlement**: HAZ 에서 S → Ni-S 입계 석출 → 균열. **Pre-weld degrease (acetone) + grit blast 必**. S 함유 cutting oil/lubricant 모두 제거. ⚠ **주의 2 — Hot cracking (Ni-Cu solidification)**: low heat input + small bead.'}
                            {!weldWorst && /^monel ?k-?500\b/i.test(material.name || '') &&
                              '✓ Monel K-500 (γ\' Ni₃(Al,Ti) precipitation, marine + 강도 hybrid) — Inconel 718 와 비슷. **ERNiCuAl-1 matching filler**. Sol-T condition 에서 weld + post-weld aging (595°C/8h). ⚠ **주의 — SAC 가능성** (γ\' precipitation): Sol-T 후 weld + 즉시 aging 권장. 두꺼운 section 회피.'}
                            {!weldWorst && /^a-?286|^uns s66286/i.test(material.name || '') &&
                              '✓ A-286 (Fe-Ni γ\' precipitation austenitic) — 718 와 비슷 procedure. **ERNiFeCrMo-1 (AMS 5778) matching filler** 또는 ER308L for non-PH service. Solution treated condition 에서 weld + post-weld aging (720°C/16h). ⚠ **주의 — Strain-age cracking**: γ\' Vf 약 10% → SAC 위험 718 보다는 ↑. Sol-T + low heat input.'}
                            {!weldWorst && /^incoloy ?(800|825|909|925)/i.test(material.name || '') &&
                              '✓ Incoloy 800H/825 (Fe-Ni solid solution) — fusion welding 우수. **ERNiCrMo-3 (825, AMS 5837), ERNiCrCoMo-1 (800H high-T), ERNi-1 (800 일반)** filler. Pre-heat 미요. ⚠ **주의 1 — Carbide sensitization (450-850°C)**: 304/316 austenitic stainless 와 동일 issue. Stabilized grade (321/347 같은 Ti/Nb) 가 없으므로 PWHT solution annealing (1120°C/30min) 권장 if pickling 환경. ⚠ **주의 2 — Incoloy 909 (Curie ~ 235°C, low-CTE controlled-expansion)**: weld 후 CTE 손실 회피 위해 controlled cooling.'}
                            {/* === Cobalt-based (AMS Co filler) — R175 주의사항 강화 === */}
                            {!weldWorst && /^cocrmo|^co-?cr-?mo|^astm f75|^astm f1537/i.test(material.name || '') &&
                              '주의. CoCrMo (medical implant grade, F75 cast / F1537 wrought) — **ERCoCr-A (AMS 5797) matching filler**. GTAW DC EN with Ar. Solution-annealed condition (1175°C SHT + water quench) 에서만 weld. ⚠ **주의 1 — Carbide reprecipitation (650-1050°C, M₂₃C₆ + M₆C 입계 석출)**: weld HAZ → 균열 + 부식 저항 손실. **Post-weld solution annealing (1175°C/1h + WQ) 必**. ⚠ **주의 2 — Hot cracking (cast F75)**: cast 의 micro-segregation + low-melt eutectic → hot tear. Cast → wrought (forging) 변환 후 weld 권장. ⚠ **주의 3 — 의료 임플란트 응용**: cleanroom welding + 100% RT + LP + dimensional QA per ASTM F139 / ISO 5832-4.'}
                            {!weldWorst && /^stellite ?(6|12|21)\b/i.test(material.name || '') &&
                              '주의. Stellite 6/12/21 (hard-facing overlay, Co-Cr-W-C) — fusion welding 어려움 (high W/C). **ERCoCr-A (Stellite 6 matching), ERCoCr-B (12), ERCoCr-E (21) filler**. **PTA (Plasma Transferred Arc) 또는 laser cladding 권장** (단조/주조 base 에 overlay). GTAW 가능 단 limited. ⚠ **주의 1 — Dilution control < 10%**: base metal 의 Fe 가 overlay 에 섞이면 wear resistance 손실. Multi-pass overlay (3-5 mm thick) 권장. ⚠ **주의 2 — Crack 위험 (W-rich M₆C carbide)**: cooling rate 통제 (slow cool 또는 pre-heat 400-500°C). ⚠ **주의 3 — Stellite 21 (low-C version, 0.25% C)**: 6/12 (1-2% C) 보다 weldable. Valve seat overlay 표준.'}
                            {!weldWorst && /^mp35n|^elgiloy|^ultimet/i.test(material.name || '') &&
                              '주의. MP35N (UNS R30035) / Elgiloy / Ultimet (Co-Ni-Cr-Mo multiphase) — **ERCoCrMo-A matching filler**. **Cold-worked condition 에서 weld 시 강도 100% 손실** (cold-work 의 σy 1800 MPa → as-welded 1000 MPa). Solution-annealed condition 에서만 weld 권장. ⚠ **주의 — Post-weld aging 必**: solution (1066°C/1h) + aging (538°C/4h) 후 σy 회복.'}
                            {/* === Mg 합금 (AWS D1.1) — R175 ⚠ Mg fire hazard 강화 === */}
                            {!weldWorst && /^az31|^az80a?\b/i.test(material.name || '') &&
                              '✓ Wrought Mg AZ31/AZ80 (Al 3-8%, 가장 weldable Mg) — **ERAZ61A (Al 6%) matching filler**. GTAW AC sine wave with **high-frequency arc starter** (Mg oxide 표면 cleaning), Ar shielding 25 L/min. Pre-heat 200-300°C (두꺼운 plate). ⚠⚠⚠ **주의 1 — Mg shaving / dust 화재 위험 (가장 critical)**: Mg powder/swarf 자연 발화 (480°C). **건조 Class D extinguisher (specialty graphite/sand, NOT water/CO₂)** 必, wet swarf 처리 (KS containment + 즉시 wet down), 흡연/spark 금지. ⚠ **주의 2 — Pre-heat 필수 (cold cracking)**: Mg 의 high CTE (26 ppm/K) + low thermal conductivity → 빠른 thermal gradient → solidification crack. Pre-heat 300°C 또는 두꺼운 fixture 사용. ⚠ **주의 3 — Hot crack (Al-Mg eutectic)**: Al 9% (AZ91) > Al 3% (AZ31) 순으로 hot crack 증가. AZ91D 는 die-cast 만 (welded structural X). NDT: PT + visual (RT 어려움 — Mg X-ray attenuation 낮음).'}
                            {!weldWorst && /^az91d?\b|^am[56]0|^am-lite/i.test(material.name || '') &&
                              '주의. Die-cast Mg AZ91/AM60 (HPDC, high Al/Mn) — **fusion welding 거의 불가** (entrapped gas porosity 大). **ER AZ92A filler**. Re-melt zone 만 weldable. ⚠⚠ **주의 1 — Porosity (가장 critical)**: HPDC 의 dissolved H + 진공 gas → 1 mm² 당 100+ pore. Welding 시 expand → bubble 균열. **HIP 또는 hot-isostatic post-treatment 후 weldable**. ⚠ **주의 2 — Mg fire hazard 동일**.'}
                            {!weldWorst && /^we43\b|^we54\b/i.test(material.name || '') &&
                              '⚠ WE43/54 (Mg-Y-Nd-RE, 의료 임플란트 biodegradable) — RE element (Y/Nd) 가 oxide 형성 → **ERWE43 matching filler** + **vacuum or 99.999% pure Ar (leak < 10⁻⁶ Torr)** 必. ⚠ **주의 1 — Cleanroom welding (의료 등급)**: ISO Class 7 (10000 particle) 이상, RH < 40%, dedicated medical tooling. ⚠ **주의 2 — RE element burn-off**: RE oxide 가 weld 표면에 → bead 균질성 손실. Pulse GTAW (peak 80 A / base 20 A, 3 Hz) + low heat input. ⚠ **주의 3 — Biodegradation 통제**: weld 후 부식 거동 변화 → 의료 implant fatigue life 평가 필수.'}
                            {!weldWorst && /^zk60|^ze41|^ez33a|^hk31a/i.test(material.name || '') &&
                              '주의. Mg-Zn-Zr / RE 합금 (ZK60 / ZE41 / EZ33A / HK31A) — **ER AZ92A filler** (matching RE filler 없을 시). Pre-heat 250-300°C. ⚠ **주의 1 — Solution treatment 후 fast cool 必** (β-phase 입계 석출 회피). ⚠ **주의 2 — Mg fire hazard 동일**.'}
                            {/* === Cu 합금 (AWS D1.4) — R175 ⚠ thermal conductivity + fume hazard 강화 === */}
                            {!weldWorst && /^c10[01]\d{2}\b|^ofe ?copper|^ofhc ?copper|^c11000/i.test(material.name || '') &&
                              '주의. Pure Cu (OFE C10100 / OFHC C10200 / ETP C11000) — **fusion welding 가장 어려운 Cu group** (thermal conductivity 400 W/m·K — Fe 의 8×). **ER Cu (AMS 4731) matching filler**. GTAW DC EN with **Ar + He 25/75 mix** (He 가 penetration ↑). ⚠ **주의 1 — Pre-heat 절대 필수 (가장 critical)**: thin sheet < 3mm = 100°C, plate 3-12mm = 300°C, **두꺼운 plate >12mm = 500-600°C** (가열 cooling 통제 어려워 specialty 화로 사용). ⚠ **주의 2 — ETP C11000 의 H₂ embrittlement**: ETP (Electrolytic Tough Pitch) 의 dissolved O (~0.04%) + welding H₂ atmosphere → Cu₂O reduction → H₂O steam pocket → 균열. **OFE (C10100 < 5 ppm O) / OFHC (C10200 < 10 ppm O) 사용** 또는 Ag-brazing 으로 대체. ⚠ **주의 3 — Bead penetration 부족**: thermal cond 높아 puddle 가 빠르게 식음 → low heat input 시 cold lap. high current + multiple pass 필요.'}
                            {!weldWorst && /^c1[78]\d{3}\b|^cu-?cr-?zr|^c18150|^c18000|^grcop/i.test(material.name || '') &&
                              '주의. PH Cu (CuCrZr C18150, CuNiSiCr C18000, GRCop-42 NASA) — **ER Cu (AMS 4731) 또는 ER CuCr matching filler**. Solution-annealed condition (980°C SHT + WQ) 에서만 weld. ⚠ **주의 1 — Post-weld aging 必** (peak strength 회복): 450-500°C/3h aging. ⚠ **주의 2 — Cr/Zr 입계 석출 회피**: weld 후 빠른 cooling (water spray 또는 forced air). ⚠ **주의 3 — GRCop-42 (NASA rocket combustion chamber)**: Cr-Nb 시 dispersed → weldable but careful cleanliness (CMC contamination 회피).'}
                            {!weldWorst && /^c17200|^cube|^berryllium copper/i.test(material.name || '') &&
                              '⚠⚠ BeCu C17200 (Be 1.8-2.0%) — **⚠⚠ Beryllium dust/fume 발암성 (NIOSH 1A carcinogen, OSHA PEL 0.2 μg/m³)**. **ERCuBe matching filler** (Materion supply). Solution-annealed condition (TB00). ⚠⚠ **주의 1 — Full PPE + 격리 welding booth**: HEPA → ULPA filter (99.999% @ 0.12 μm), positive-pressure SCBA respirator (PAPR 부족), Tyvek body suit, double gloves. ⚠⚠ **주의 2 — Berylliosis 위험**: chronic Be inhalation → 폐 sarcoidosis 유사 질병 (CBD chronic beryllium disease, 일생 unrecoverable). 작업 후 wet decon + medical surveillance 必. ⚠ **주의 3 — Spark/grinding 후처리 절대 금지** (BeO dust). NDT: PT + RT.'}
                            {!weldWorst && /^c2[123]\d{3}|^red brass|^c22000|^c23000/i.test(material.name || '') &&
                              '주의. Red Brass (C21000/22000/23000, Cu-Zn 5-15%) — **ERCuSn-A (phosphor bronze) 또는 ERCuSi-A (silicon bronze) filler** (matching ERCu-Zn 은 Zn evaporation 으로 비추). Pre-heat 200-300°C. ⚠ **주의 1 — Zn fume 위험 (가장 critical)**: Zn 비등점 907°C → welding arc 4000°C 에서 즉시 vaporize → ZnO 가루 + metal fume fever. **Local exhaust ventilation (LEV) > 0.5 m/s capture velocity 필수**, full-face respirator (P100 + organic vapor cartridge) 권장. ⚠ **주의 2 — Dezincification (탈아연)**: 일반 분위기 OK, 단 chloride 환경 (해수) 에서 weld zone 부식. Naval brass C46400 (Sn 첨가) 사용 권장.'}
                            {!weldWorst && /^c26000|^c26800|^c36000|^naval brass|^c46400/i.test(material.name || '') &&
                              '주의. Cartridge brass C26000 (70/30) / Yellow C26800 (66/34) / Free-mach C36000 (Pb 3.5%) / Naval C46400 (Sn 1%). **ERCuSn-A filler**. ⚠ **주의 1 — C36000 Pb fume 매우 위험**: Pb 3.5% → welding arc 1740°C 비등 → Pb fume + 신경독성. C36000 weldable 안 됨 (대체 grade C46400 권장). ⚠ **주의 2 — Zn fume 동일 (C26000, C46400)**. ⚠ **주의 3 — C46400 우수 (Sn 1% dezincification 회피)**: marine propeller hub / shaft 표준 (ABS Marine class).'}
                            {!weldWorst && /^c70[60]00|^c715[00]|^cuni|^cupronickel/i.test(material.name || '') &&
                              '✓ Cupronickel C70600 (90Cu-10Ni) / C71500 (70Cu-30Ni) — fusion welding 우수 (Zn 없음). **ERCuNi (AMS 4715) matching filler**. GTAW or GMAW with Ar. FPSO + ship seawater piping 표준. ⚠ **주의 1 — Hot cracking (Ni-Cu solidification)**: low heat input + small bead. ⚠ **주의 2 — Marine post-weld surface treatment**: pickling (HNO₃ 5%) 또는 polishing 으로 weld zone 부식 안정. ⚠ **주의 3 — H₂S sour service**: 90/10 (C70600) 의 sulfide 부식 우려, 70/30 (C71500) 사용 권장 in sour 환경.'}
                            {!weldWorst && /^c75200|^nickel silver|^german silver/i.test(material.name || '') &&
                              '주의. Nickel Silver C75200 (Cu 65% + Ni 18% + Zn 17%) — Cu-Ni-Zn. **ERCuNi 또는 ERNiCu-7 filler**. Pre-heat 200°C. ⚠ **주의 — Zn fume 동일 (Zn 17%)**: LEV + respirator 필수.'}
                            {!weldWorst && /^c95800|^nickel aluminum bronze|^nab\b/i.test(material.name || '') &&
                              '✓ NAB C95800 (Ni-Al bronze, Marine propeller 표준) — **ERCuNiAl (AMS 4870) matching filler**. ABS / DNV / KR marine class spec 표준. ⚠ **주의 1 — Cu-Al β-phase + α-phase intermetallic (κ-phase)**: weld 후 controlled cooling (slow) 으로 κ-phase microstructure 회복. ⚠ **주의 2 — Marine surface peening 필요**: propeller blade cavitation erosion 회피.'}
                            {/* === Refractory metals — R175 주의사항 강화 === */}
                            {!weldWorst && /^tantalum\b|^ta\b\s*\(|^ta-?10w/i.test(material.name || '') &&
                              '✓ Tantalum (uniquely weldable refractory metal — α only, no DBTT issue at RT) — **EBW (vacuum < 10⁻⁴ mbar) preferred, GTAW in Ar glove-box (O₂ < 10 ppm) 가능**. Matching Ta filler. Ta-10W (R05252) = 동일 procedure. ⚠ **주의 1 — O/N pickup → embrittlement (Ti 와 동일)**: 300°C+ atmosphere → Ta₂O₅ formation → brittle. Glove-box (RH < 0.1%, O₂ < 10 ppm) 必. Color: silver = OK, gold = trace O (재용접), blue = severe (폐기). ⚠ **주의 2 — Tantalum sensitivity to Fe**: Fe contamination → low-melt Ta-Fe eutectic → 균열. SS tools only (carbon steel 금지). ⚠ **주의 3 — Post-weld stress relief**: 1100°C/1h vacuum 권장 (recrystallization 회피 위해 < 1100°C). 화학 plant (HCl/H₂SO₄ tank) + 반도체 sputtering target 표준.'}
                            {!weldWorst && /^tungsten\b|^w-la\b|^pure tungsten/i.test(material.name || '') &&
                              '⚠⚠ Tungsten (Tm 3422°C, DBTT 300°C — RT brittle) — **fusion welding 매우 어려움 (거의 불가능)**. **EBW only** (vacuum 10⁻⁵ mbar, high-energy beam). W-La (Lanthanated W) 동일. Sintered W heavy alloy (W-Ni-Fe 90-97%W) 는 **Ni-base brazing filler (BNi-2, AMS 4777) 으로 brazing 권장**. ⚠ **주의 1 — DBTT 300°C 의 brittle 균열**: cooling 시 stress 가 DBTT 위쪽에서 미리 발산되어야 함. Pre-heat 500°C 필수 + post-weld stress relief 1500°C/1h vacuum. ⚠ **주의 2 — Recrystallization (1200-1400°C)**: grain growth → 더욱 brittle. Low heat input + 빠른 cooling. ⚠ **주의 3 — Cost + criticality**: KE penetrator, X-ray collimator → 균열 시 폐기. Pre-weld NDT (UT) 권장.'}
                            {!weldWorst && /^molybdenum\b|^mo-?la|^mo-?0\.5ti|^tzm\b|^mo-?re\b/i.test(material.name || '') &&
                              '⚠ Mo / TZM / Mo-La / Mo-Re (DBTT 0°C, Tm 2623°C) — **EBW preferred (vacuum)**, GTAW 가능 단 Ar glove-box (O₂ < 10 ppm) 必. ⚠ **주의 1 — Oxidation 매우 빠름 (>300°C → MoO₃ vapor)**: pre-heat 500°C 必 (DBTT 0°C 위쪽, brittle 회피) + 즉시 Ar shielding 또는 vacuum. ⚠ **주의 2 — Recrystallization (1100-1400°C)**: grain growth → brittleness. Low heat input + Pulse GTAW (peak/base ratio < 0.3). ⚠ **주의 3 — Post-weld stress relief 1100°C/1h vacuum 必** (residual stress 의 균열 진행 회피). ⚠ **주의 4 — Mo-Re (Re 효과)**: Re 가 DBTT 낮춤 (-100°C) → 가장 weldable Mo alloy. Mo-La 도 비슷. TZM (Ti-Zr 첨가) = 일반 Mo 와 유사. 우주 nuclear thermal rocket nozzle 표준.'}
                            {!weldWorst && /^niobium\b|^c-?103\b|^nb-?1zr/i.test(material.name || '') &&
                              '✓ Niobium (DBTT -200°C, ductile RT) / C-103 (Nb-10Hf-1Ti) / Nb-1Zr — Ta 와 비슷 (weldable refractory). **EBW (vacuum 10⁻⁵ mbar) 또는 GTAW high-purity Ar (99.999%) glove-box**. C-103 nuclear thermal rocket nozzle (Atlas V Centaur, Plansee/ATI 표준). ⚠ **주의 1 — O/N/H pickup**: 300°C+ 빠른 oxidation (NbO₂). Glove-box (O₂ < 10 ppm) 必. Color: silver/light blue = OK. ⚠ **주의 2 — Hf-rich C-103 의 hafnium oxide**: Hf 10% 의 oxide formation 으로 weld zone surface 변색. Pickling (HF/HNO₃) post-clean. ⚠ **주의 3 — Post-weld stress relief**: 1100°C/1h vacuum 권장.'}
                            {!weldWorst && /^rhenium\b|^pure rhenium/i.test(material.name || '') &&
                              '⚠⚠ Rhenium (Tm 3186°C, ρ 21.0 g/cc — Os 다음 dense) — **EBW only** (precision instrument, repair only). ⚠ **주의 1 — 매우 비쌈 (\$5000+/kg) → repair only**. ⚠ **주의 2 — Brittle at RT** (HCP structure). ⚠ **주의 3 — 응용은 W 의 Re 첨가 ductility 향상 alloy 또는 thermocouple type C (W-26Re vs W-5Re)** — pure Re welding 산업적 사용 거의 없음.'}
                            {!weldWorst && /^chromium\b|^pure cr|^pure chromium/i.test(material.name || '') &&
                              '⚠⚠ Pure Chromium (DBTT 300°C, BCC brittle at RT) — **welding impractical** (Cr ingot 자체가 brittle 가공 어려움). 산업 응용은 Cr plating / coating 또는 stainless / Ni superalloy 의 alloying element 로만 사용. Pure Cr welding 사례 없음.'}
                            {!weldWorst && /^hafnium\b|^pure hf/i.test(material.name || '') &&
                              '✓ Hafnium (Zr 와 동족, 화학 성질 거의 동일) — **GTAW with Ar (front+back+trailing, 의 cuprum-brazing) 또는 EBW**. **Matching Hf filler** (Plansee/ATI supply). ⚠ **주의 1 — O/N pickup**: Zr 와 동일 — 300°C+ HfO₂ formation → embrittlement. ⚠ **주의 2 — Nuclear application (control rod)**: Hf 의 neutron capture cross-section 600 barn (Zr 의 0.2 barn) → reactor 표준. Welding 시 dimension precision + clean atmosphere.'}
                            {!weldWorst && /^vanadium\b|^pure v\b/i.test(material.name || '') &&
                              '주의. Pure V (Tm 1910°C) — **GTAW in Ar glove-box** (rapid V₂O₅ oxidation > 300°C, volatile vapor). V-Cr-Ti 합금이 ITER/fusion reactor first-wall material (low neutron activation). ⚠ **주의 1 — V₂O₅ vapor 위험 (toxic)**: Local exhaust + respirator. ⚠ **주의 2 — Cleanliness 필수**: Fe/Ni contamination → V-Fe brittle phase.'}
                            {!weldWorst && /^zirconium\b|^zr-?2\.5nb|^zircaloy/i.test(material.name || '') &&
                              '✓ Zr / Zircaloy-2 (BWR cladding) / Zr-2.5Nb (CANDU) — Ti 와 비슷 procedure. **GTAW with Ar (front + back-purge + trailing) 또는 EBW**. PWR/BWR fuel cladding 표준. ⚠ **주의 1 — O/N/H 흡수 → embrittlement (Ti 와 동일)**: 300°C+ ZrO₂ formation. Color: silver = OK, gold/blue = 폐기. Glove-box 권장. ⚠ **주의 2 — Nuclear cleanness**: Fe/Cr contamination 회피 (low absorption requirement). SS-only tools. ⚠ **주의 3 — Hot-water hydride embrittlement**: BWR/PWR coolant 의 H 흡수 → ZrH brittle phase. Pickling (HF) post-clean 권장.'}
                            {/* === Specialty 가공 합금 === */}
                            {!weldWorst && /^invar ?36|^kovar/i.test(material.name || '') &&
                              '✓ Invar 36 (Fe-36Ni, CTE ~ 1.3 ppm/K) / Kovar (Fe-29Ni-17Co, CTE ~ 5.5 ppm/K, glass-metal seal) — fusion welding 우수. **Matching Invar / Kovar filler** (Carpenter / ATI / VDM). GTAW with Ar. ⚠ **주의 1 — Curie 230°C (Invar) / 435°C (Kovar)**: 위쪽에서 CTE 증가 → low-CTE 응용 손실. Service T 통제. ⚠ **주의 2 — PWHT 800-870°C/2h vacuum (stress relief)**: residual stress 의 CTE drift 회피. ⚠ **주의 3 — Hot crack (Fe-Ni solidification)**: low heat input + small bead. 정밀 광학 mount / vacuum chamber 표준.'}
                            {!weldWorst && /^maraging|^vascomax|^18ni-?\d/i.test(material.name || '') &&
                              '✓ Maraging Steel 250/300/350 (18Ni-7Co-5Mo-Ti, C-free martensitic) — **매우 우수한 weldability (C-free 라 HAZ crack 없음)**. **ER 18Ni Maraging matching filler** (AMS 6463 / 6464 / 6520 per grade). Solution-treated condition → weld → **post-weld aging (480-500°C/3-6h)** 必. ⚠ **주의 1 — Aged 후 weld 절대 금지**: aged condition welded → over-aging + crack. ⚠ **주의 2 — Cleanliness (S/P 회피)**: maraging 의 ultra-low impurity 라 contamination 즉시 영향. ESR/VAR melt 권장. ⚠ **주의 3 — 응용**: aerospace landing gear (Lockheed F-22, Boeing 787), AM LPBF 표준 (EOS MS1, SLM Solutions 1.2709).'}
                            {!weldWorst && /^nitinol\b|^niti\b/i.test(material.name || '') &&
                              '⚠ Nitinol (NiTi 50-50 shape-memory) — **laser welding only (Yb-fiber laser, pulse mode, 의료 정밀 welding)**. ⚠ **주의 1 — Shape-memory T (As/Af) drift**: weld 열이 transformation temperature 변경 → device 동작 손실 (예: stent expansion 압력 변화). **Pre-weld DSC + post-weld DSC 비교 검사 必**. ⚠ **주의 2 — Ti-Ni-O 형성 (HAZ)**: O contamination → TiNi → Ti2NiOx 변환 → brittle. Cleanroom + 99.999% Ar shielding. ⚠ **주의 3 — Medical implant (cardiovascular stent)**: 100% inspection + biocompatibility test (ISO 10993).'}
                            {!weldWorst && /^beryllium\b/i.test(material.name || '') &&
                              '⚠⚠⚠ Pure Beryllium — **⚠⚠⚠ Be dust/fume 발암성 (NIOSH 1A carcinogen, OSHA PEL 0.2 μg/m³, Korean MOEL TLV 0.001 mg/m³)**. **Welding rarely done — Ag-base brazing 권장 (BAg-1 / BAg-2 filler, AMS 4770)**. ⚠⚠⚠ **주의 1 — Berylliosis (CBD chronic beryllium disease)**: 만성 폐 sarcoidosis 유사 + 일생 unrecoverable. ⚠⚠ **주의 2 — Full isolation welding booth + PAPR + Tyvek + decon**: ULPA (99.999% @ 0.12 μm) + positive-pressure SCBA + body suit + post-work wet decon. ⚠ **주의 3 — Grinding/sanding 절대 금지 (post-weld 시도 X)**: 산업적 사용은 specialty 만 (정밀 광학 mirror, X-ray window).'}
                            {!weldWorst && /^zamak ?[35]\b/i.test(material.name || '') &&
                              '주의. Zamak 3/5 (Zn-Al die-cast, Tm 385°C, low-melt zinc alloy) — **fusion welding rarely done** (Tm 낮아 puddle 통제 어려움). **대체: soldering with Zn-Al filler (Sn-Zn paste) 또는 mechanical repair (epoxy bonding) 권장**. ⚠ **주의 — Zn fume 위험 동일** (Zn 95% 함량) — LEV + respirator 必. Die-cast component 의 부분 손상 시 cosmetic repair 만 가능 (structural repair X).'}
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
