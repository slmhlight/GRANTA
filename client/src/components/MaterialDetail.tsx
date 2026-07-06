/*
 * AM Materials Explorer — Material Detail Panel
 * Range-aware: shows typical value + min–max range (n data points) and clickable
 * source citations (verified datasheet URLs where available).
 */

import { X, Plus, Check, ExternalLink, Layers, Atom, Wrench, FlaskConical, BookText, Coins, Thermometer, Star, AlertTriangle, Pin, Lightbulb, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Material, PropertyRange, MaterialSource } from '@/lib/materials';
import { MECHANICAL_PROPERTIES, PHYSICAL_PROPERTIES, COST_PROPERTIES } from '@/lib/materials';
import { htGlossaryFor } from '@/lib/ht-glossary';
import { htAlloySpecificFor } from '@/lib/ht-alloy-specific';
import { computeCET, computeCEIIW, computePcm, computeSchaeffler, machiningCostBand, htCostBand } from '@/lib/welding-machinability';
import { resolveMachinability, resolvePolymerMachinability, resolveConditionNote, resolveMachiningGuidance, machinabilitySources, resolveInsights, insightPickMatches, resolveHtGuidanceTexts, resolveWeldGuidance, resolveWeldConditionNote, machinabilityConditionMult } from '@/lib/process-guidance';
/* R222c — recharts(~150KB)는 아래에서 lazy 로드 (elev-temp/creep 데이터 있는 재료의 탭이 열릴 때만). */
import { resolveCoatingPlan, PURPOSE_LABEL } from '@/lib/coatings';
/* R157b — MaterialDetail 의 sub-components 분리. */
import { SourcesList } from '@/components/material-detail/SourcesList';
import { RangeRow, fmt } from '@/components/material-detail/RangeRow';
import { CompositionDisplay } from '@/components/material-detail/CompositionDisplay';
import { Field } from '@/components/material-detail/Field';
/* R160 — Spec badge popover. */
import { SpecBadgeList } from '@/components/material-detail/SpecBadgeList';
/* R161 — Similar / alternative materials card → Composition tab. */
import { SimilarMaterialsCard } from '@/components/material-detail/SimilarMaterialsCard';
import { WikiBacklinksCard } from '@/components/material-detail/WikiBacklinksCard';
import { StoryLinkedText } from '@/components/material-detail/StoryLinkedText';
import { TermText } from '@/components/TermLink';
import { useWikiRefs } from '@/hooks/useWikiRefs';
import { buildAutolinkMap } from '@/lib/wiki-link';
/* R177 — Recommendation text renderer (ASCII table → real <table>). */
import { RecText, joinRecs } from '@/components/material-detail/RecText';
import { useT, useLang } from '@/lib/i18n';
import { familyColor, CONFIDENCE, CONFIDENCE_ORDER } from '@/lib/material-colors';
import { formatPrice, loadUnitSystem } from '@/lib/unit-convert';
import { useState as useStateRD, useEffect as useEffectRD, useMemo as useMemoRD, lazy as lazyRD, Suspense as SuspenseRD, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { RadarChart, RadarConfig, DEFAULT_RADAR_AXES, type RadarAxis, type NormalizeBase } from '@/components/RadarChart';

/* R222c — recharts 차트 lazy 분리 (named export → default 변환). 메인 청크에서 recharts 제거. */
const TempCurveChart = lazyRD(() => import('@/components/TempCurveChart').then(m => ({ default: m.TempCurveChart })));
const CreepRuptureChart = lazyRD(() => import('@/components/CreepRuptureChart').then(m => ({ default: m.CreepRuptureChart })));

interface MaterialDetailProps {
  material: Material | null;
  compareList: string[];
  onToggleCompare: (id: string) => void;
  onClose: () => void;
  /** R227/E14 — 링크로 다른 재료를 열었을 때 이전 재료로 돌아가는 back-stack. 있으면 헤더에 ← 버튼. */
  onBack?: () => void;
  dragHandleProps?: { onPointerDown?: (e: ReactPointerEvent<HTMLElement>) => void }; // when floating, makes the header a drag handle
  floating?: boolean;
  /** R53a — Radar normalize 에 사용할 전체 dataset. 없으면 'set' base 만 동작. */
  allMaterials?: Material[];
  /** R69 A — 즐겨찾기. favorites set + toggle callback. */
  favorites?: Set<string>;
  onToggleFavorite?: (id: string) => void;
  /** R148 — 유사 재료 추천 클릭 시 해당 material 로 detail panel 전환. */
  onSelectMaterial?: (id: string) => void;
  /** R204 #1 — PC 에서 detail popup 을 multi-stack. pin 시 floating popup 으로 분리. */
  onPin?: (m: Material) => void;
  isPinned?: boolean;
}

// R157b — fmt → components/material-detail/RangeRow.tsx (export 됨, RangeRow 와 함께 사용).

const TIER_BADGE: Record<string, { label: string; cls: string; warn?: boolean; tip?: string }> = {
  curated:   { label: 'Curated · multi-vendor', cls: 'bg-accent/15 text-accent border-accent/30' },
  am_vendor: { label: 'AM vendor data',          cls: 'bg-violet-500/15 text-violet-600 border-violet-500/30' },
  reference: { label: 'Reference data',          cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  /* R202 #1 — Generic tier 에 'verify before design' 경고. 일부 entries 는 CSV mock 데이터에서
     handbook 값으로 R199 override 됐지만 원본 CSV 의 신뢰도 낮음. */
  generic: {
    label: 'Generic reference',
    cls: 'bg-amber-50 text-amber-700 border-amber-300',
    warn: true,
    tip: 'Generic tier — 일부 properties 는 CSV-derived (mock 가능). 설계 적용 전 vendor datasheet 로 검증 필수. R199 audit override 적용된 entries 는 신뢰도 ↑.',
  },
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

export function MaterialDetail({ material, compareList, onToggleCompare, onClose, onBack, dragHandleProps, floating, allMaterials, favorites, onToggleFavorite, onSelectMaterial, onPin, isPinned }: MaterialDetailProps) {
  const t = useT();
  // R227/E14/H2 — 위키 상호참조(backlink) 데이터. 실패 시 null → 카드 숨김(비치명적).
  const wikiLookups = useWikiRefs();
  // R227/E14/H2b — 스토리 본문 인라인 auto-link 조회 맵(빌드 allowlist). null 이면 평문 렌더.
  const wikiAutolink = useMemoRD(() => (wikiLookups ? buildAutolinkMap(wikiLookups) : null), [wikiLookups]);
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

  /* R202 #10 — ESC 키로 detail panel 닫기 */
  useEffectRD(() => {
    if (!material) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [material, onClose]);

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
          {onBack && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onBack(); }}
              className="flex-shrink-0 -ml-1 mt-0.5 p-1 rounded hover:bg-violet-100 text-violet-700 transition-colors"
              title="이전 재료로 돌아가기"
              aria-label="뒤로"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ring-1 ring-background" style={{ background: famColor }} />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground leading-tight">{material.name}</h2>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{material.subcategory}</p>
            {tier && (
              <span
                className={`inline-flex items-center gap-1 mt-1.5 text-[10px] px-1.5 py-0.5 rounded border font-medium ${tier.cls}`}
                title={tier.tip}
              >
                {tier.warn && <AlertTriangle className="w-3 h-3" />}
                {tier.label}
              </span>
            )}
            {/* R144c — Spec badges (AMS / ASTM / UNS …). R160 — popover 로 확장 (클릭 시 org/description/url 표시). */}
            {material.meta?.specs && material.meta.specs.length > 0 && (
              <SpecBadgeList specs={material.meta.specs} colorMap={SPEC_BADGE_COLOR} maxInline={8} />
            )}
          </div>
        </div>
        <div className="flex items-start gap-1 flex-shrink-0">
          {/* R204 #1 — Pin 버튼: 클릭 시 floating multi-popup 으로 분리 (PC desktop 만, 이미 pinned 면 숨김) */}
          {onPin && floating && !isPinned && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPin(material); }}
              className="ml-1 p-1 hover:bg-muted rounded transition-colors"
              title="이 detail 을 별도 popup 으로 핀 (여러 재료 동시 비교 가능)"
              aria-label="Pin detail panel"
            >
              <Pin className="w-4 h-4 text-muted-foreground hover:text-sky-600" />
            </button>
          )}
          {/* Pinned indicator (already in stack) */}
          {isPinned && (
            <span className="ml-1 p-1" title="핀 상태 (별도 popup)">
              <Pin className="w-4 h-4 text-sky-600 fill-sky-100" />
            </span>
          )}
          {/* R69 A — 즐겨찾기 ⭐ 토글 */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(material.id)}
              className="ml-1 p-1 hover:bg-muted rounded transition-colors"
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
          <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-background p-0 h-auto sticky top-0 z-10 shadow-sm">
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
            {/* R209 C-9 — generic tier 경고를 inline 으로 (title 툴팁은 터치기기에서 안 보임). 행동지침 명시. */}
            {material.tier === 'generic' && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-amber-800">
                  <b>Generic reference</b> — 일부 물성은 자동 집계(CSV-derived) 값입니다. <b>설계 적용 전 vendor datasheet / 핸드북으로 검증</b>하세요. 각 값 옆 신뢰도 점(아래 범례)으로 출처 등급 확인 가능.
                </p>
              </div>
            )}
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
            {/* 신뢰도 뱃지 범례 — R210 B5: CONFIDENCE 단일 소스에서 매핑 (RangeRow·ComparePanel 과 색 일치). */}
            <div className="rounded border border-border/50 bg-muted/20 p-2 text-[10px] flex flex-wrap gap-x-3 gap-y-1 items-center">
              <span className="text-foreground/70 font-semibold">{t('detail.confidence')}:</span>
              {CONFIDENCE_ORDER.map((lv) => (
                <span key={lv} className="inline-flex items-center gap-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${CONFIDENCE[lv].twDot}`} />
                  <span className={CONFIDENCE[lv].twText}>{lv === 'measured' ? 'n=N' : CONFIDENCE[lv].label}</span>
                  {lv === 'measured' && <> {t('detail.confidence.measured')}</>}
                  {lv === 'class' && <> {t('detail.confidence.class')}</>}
                  {lv === 'derived' && <> {t('detail.confidence.derived')}</>}
                </span>
              ))}
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
              /* R209 C-16 — 데이터 있는 행 우선, 빈 항목은 접이식 요약으로 묶어 정보 위계 정리.
                 RangeRow 의 typical 판정과 동일 로직으로 partition. */
              const hasData = (key: string) => {
                const r = ranges[key];
                const fb = material[key as keyof Material];
                const tv = r?.typical ?? (typeof fb === 'number' ? fb : null);
                return tv != null;
              };
              const renderSection = (icon: ReactNode, title: string, props: typeof mechProps) => {
                const present = props.filter((p) => hasData(p.key as string));
                const empty = props.filter((p) => !hasData(p.key as string));
                return (
                  <div>
                    <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1">{icon}{title}</h3>
                    <div className="space-y-1">
                      {present.map((prop) => (
                        <RangeRow key={prop.key} label={prop.label} unit={prop.unit} range={ranges[prop.key as string]} fallback={material[prop.key as keyof Material] as number | string | null} />
                      ))}
                    </div>
                    {empty.length > 0 && (
                      <details className="mt-1 group">
                        <summary className="text-[10px] text-muted-foreground/60 cursor-pointer hover:text-muted-foreground list-none flex items-center gap-1 select-none">
                          <span className="transition-transform group-open:rotate-90">▸</span>
                          {empty.length}{t('detail.section.noData')}
                        </summary>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-3">
                          {empty.map((prop) => (
                            <span key={prop.key} className="text-[10px] text-muted-foreground/50">{prop.label} <span className="font-mono">—</span></span>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              };
              return (
                <>
                  {renderSection(<FlaskConical className="w-3 h-3" />, t('detail.section.mechanical'), mechProps)}
                  {renderSection(<Layers className="w-3 h-3" />, t('detail.section.physical'), physProps)}
                </>
              );
            })()}
            {COST_PROPERTIES.some(p => material[p.key as keyof Material] != null) && (
              <div>
                <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1">
                  <Coins className="w-3 h-3" />{t('detail.section.cost')}
                  {/* R146 — verified date badge if measured + recent. */}
                  {material.meta?.price_verified_date ? (
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Source: ${material.meta?.price_verified_source}`}>
                      ✓ verified {material.meta.price_verified_date as string}
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal text-muted-foreground/60">{t('detail.section.costEstimate')}</span>
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
                <SuspenseRD fallback={<div className="h-[200px]" />}>
                  <TempCurveChart series={[{ name: material.name, color: '#0066CC', points: material.elevated_temp }]} mode="single" height={200} />
                </SuspenseRD>
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
                <SuspenseRD fallback={<div className="h-[200px]" />}>
                  <CreepRuptureChart points={material.creep_rupture} height={200} />
                </SuspenseRD>
                <p className="text-[10px] text-muted-foreground mt-1">{t('detail.creep.source')}</p>
              </div>
            )}
            <div>
              <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1">
                <BookText className="w-3 h-3" />{t('detail.section.sources')}
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
            {/* R227/E14/H2 — 서술 상호참조(위키 backlink). 물성 거리와 다른 축. lookups 없으면(로드 전/실패) 카드 미표시. */}
            {allMaterials && allMaterials.length > 0 && (
              <WikiBacklinksCard
                material={material}
                allMaterials={allMaterials}
                lookups={wikiLookups}
                onSelectMaterial={onSelectMaterial}
              />
            )}
            {/* R226j/E9 → R226k 이동 — 재료 선택 인사이트: 유사재료 카드 바로 아래(조성 탭), "어떤 경우 어떤 재료가 유리한가" (m.profiles.insight → selection-insights.json) */}
            {(() => {
              const ins = resolveInsights(material);
              if (!ins) return null;
              return (
                <details className="rounded-lg border-2 border-indigo-200 bg-indigo-50/40 p-3" open>
                  <summary className="text-[12px] font-bold flex items-center justify-between cursor-pointer select-none list-none text-indigo-900">
                    <span className="flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" />선택 인사이트 · {ins.title}</span>
                    <span className="text-[10px] font-normal opacity-60">{ins.picks.length} 시나리오</span>
                  </summary>
                  <p className="text-[11px] mt-2 text-foreground/75 leading-relaxed"><TermText text={ins.intro} /></p>
                  <div className="mt-2 space-y-1.5">
                    {ins.picks.map((p, i) => {
                      const hit = insightPickMatches(material, p);
                      return (
                        <div key={i} className={`text-[11px] leading-relaxed rounded-md px-2 py-1.5 border ${hit ? 'bg-indigo-100 border-indigo-300' : 'bg-white/60 border-border/50'}`}>
                          <div className="flex items-baseline gap-1 flex-wrap">
                            <span className="text-foreground/60">{p.when}</span>
                            <span className={`font-bold ${hit ? 'text-indigo-800' : 'text-foreground'}`}>→ {p.use}</span>
                            {hit && <span className="text-[9px] font-bold text-indigo-700 border border-indigo-400 rounded px-1">현재 재료</span>}
                          </div>
                          <div className="text-foreground/70 mt-0.5">{p.why}</div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] mt-2 pt-1.5 border-t border-indigo-200 text-foreground/55">
                    <b>출처</b>: {ins.sources.join(' · ')} — 일반 관행 요약이며 개별 설계 검증을 대체하지 않음.
                  </p>
                </details>
              );
            })()}
          </TabsContent>

          {/* Process */}
          <TabsContent value="process" className="p-4 space-y-3">
            {/* R112 — 공정 평가 3 종합 카드 (Machinability / Heat Treatment / Weldability). 각각 단일 카드로 통합 + 경고 색상. */}
            {(() => {
              // R226j/C6 — 절삭성은 m.profiles (stable_id 기반 빌드 스탬프) 조회 — 런타임 name-regex 없음.
              const mach = resolveMachinability(material);
              // R125 — Ceramic / Composite 에서 가공·HT 카드 hide (Si3N4 등 가공 불가 재료에 부적절한 카드 제거)
              // R226r — 열처리(조건)별 가공비 보정: ferrous 경화군은 htc 로 machining_cost_factor 상향 (경화=고비용)
              const machAdj = machinabilityConditionMult(material);
              const adjMcf = (material.machining_cost_factor != null && machAdj.applies)
                ? material.machining_cost_factor * machAdj.cost : material.machining_cost_factor;
              const machCost = machiningCostBand(adjMcf, material.category);
              // R226i — 폴리머는 금속 tool-life 모델 대신 카테고리 전용 정성 절삭성
              const polyMach = resolvePolymerMachinability(material);
              // R226j — 조건(variation)별 가공 노트 + 가족별 가공 가이드
              const condNote = resolveConditionNote(material);
              const machGuidance = resolveMachiningGuidance(material);
              const htCost = htCostBand(material.ht_cost_factor, material.category);
              const cet = computeCET(material);
              const ce_iiw = computeCEIIW(material);
              const pcm = computePcm(material);
              const sch = computeSchaeffler(material);
              /* R173 — Metal 이고 weldability rating 있으면 (quantitative metric 없어도) 카드 표시.
                 AA 7075/Ti-6Al-4V/Inconel 718 등 비철금속이 CE_IIW 미적용이라 weldability 카드 누락 fix. */
              const hasWeldFallback = material.category === 'Metal' && !!material.weldability;
              if (!mach && !machCost && !polyMach && !htCost && !cet && !ce_iiw && !pcm && !sch && !hasWeldFallback) return null;
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
              // R226k — HT 주의사항·합금별 용접 권고 (ID 조회; 구 인라인 name-regex 83블록 대체)
              const htGuidanceTexts = resolveHtGuidanceTexts(material);
              const weldGuidance = resolveWeldGuidance(material, !!weldWorst);
              // R226r — 용접성 rating 은 조성기반(조건무관)이나, 경화/시효/냉간 상태는 HAZ 연화 유발 → 조건별 HAZ 노트
              const weldCondNote = resolveWeldConditionNote(material);
              /* R113 + R152b — 3 카드 모두 collapsible (mobile 가독성). default: Machinability open · HT/Weld closed.
                 R152b: 폭 좁은 detail panel (좌측 floating popup 430px 또는 모바일) 에서 2-column 이 텍스트
                 wrap 으로 가독성 ↓ → 항상 1 column stack 으로 변경. */
              return (
                <div className="grid grid-cols-1 gap-3">
                  {/* 카드 1 — 절삭성 + 가공비 통합 (default open) */}
                  {/* R226v — 절삭성 데이터가 전무한 금속: pop>2.0 이면 "미확보" 명시 (1.0 표시가 '가공 용이'로 오독되던 문제),
                      pop≤2.0 이면 카드 자체 생략. 대상: AHSS 판재(TWIP/DP — 절삭 아닌 성형 재료)·전기강판·Nitinol 등. */}
                  {material.category === 'Metal' && !mach && !machCost && (material.popularity ?? 0) > 2.0 && (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-[11px] text-foreground/70 leading-relaxed">
                      <span className="font-semibold flex items-center gap-1.5 text-foreground/80"><Wrench className="w-3.5 h-3.5" />Machinability · 절삭성</span>
                      <p className="mt-1">절삭성 등급 <b>데이터 미확보</b> — 등급이 없다는 뜻이며 "가공이 쉽다"는 뜻이 아닙니다. 판재 성형 전용 강재(AHSS 등)·전기강판처럼 절삭 등급이 통용되지 않는 재료이거나, 신뢰할 수 있는 출처를 아직 확보하지 못한 경우입니다.</p>
                    </div>
                  )}
                  {(mach || machCost || polyMach) && (
                    <details className={`rounded-lg border-2 p-3 ${bandColor((polyMach?.band || machCost?.band || mach?.band) as string)}`}>
                      <summary className="text-[12px] font-bold flex items-center justify-between cursor-pointer select-none list-none">
                        <span className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" />Machinability · 절삭성</span>
                        <span className="text-[10px] font-normal opacity-70">
                          {mach && `${mach.rating}%`}{machCost && ` · ×${machCost.factor.toFixed(2)}`}{(mach || machCost) && ' · '}<b>{(polyMach?.label || machCost?.label || mach?.label)}</b>
                        </span>
                      </summary>
                      <div className="space-y-1.5 text-[12px] mt-2 pt-2 border-t border-current/15">
                        {mach && (
                          <div className="flex items-baseline justify-between gap-2">
                            <b>절삭성 rating</b>
                            <span className="font-mono">{mach.rating}% · <b>{mach.label}</b>{mach.conditionAdjusted && <span className="text-[10px] font-normal opacity-70"> (연질 {mach.baseRating}%)</span>}</span>
                          </div>
                        )}
                        {/* R226r — 열처리 조건 보정 설명: 같은 합금이라도 어닐 vs 경화(Q&T/시효/냉간)로 가공성 상이 */}
                        {mach?.conditionAdjusted && (
                          <p className="text-[10px] leading-relaxed text-foreground/70">
                            ⓘ 이 열처리 조건에서 경도↑ → 절삭성 {mach.baseRating}%→{mach.rating}% 보정 (가공비도 상향). 어닐/용체화 상태로 가공 후 열처리·연삭이 통상 순서.
                          </p>
                        )}
                        {machCost && (
                          <div className="flex items-baseline justify-between gap-2">
                            <b>가공비 가중치</b>
                            <span className="font-mono">×{machCost.factor.toFixed(2)} · {machCost.detail} · <b>{machCost.label}</b></span>
                          </div>
                        )}
                        {mach && <p className="text-[11px] leading-relaxed mt-1 text-foreground/80"><TermText text={mach.note} /></p>}
                        {machCost && machCost.band !== mach?.band && <p className="text-[11px] leading-relaxed text-foreground/80">{machCost.note}</p>}
                        {/* R226i — 폴리머 전용 정성 절삭성 (금속 rating/가공비 대신) */}
                        {polyMach && (
                          <div className="flex items-baseline justify-between gap-2">
                            <b>절삭성 (정성)</b>
                            <span className="font-mono"><b>{polyMach.label}</b></span>
                          </div>
                        )}
                        {polyMach && <p className="text-[11px] leading-relaxed mt-1 text-foreground/80"><TermText text={polyMach.note} /></p>}
                        {/* R226j — 조건(variation)별 가공 노트: 같은 합금이라도 HT 조건 entry(고유 ID)마다 다른 안내 */}
                        {condNote && (
                          <p className="text-[11px] leading-relaxed mt-1 pt-1.5 border-t border-current/10">
                            <b>이 조건{material.heat_treatment ? ` (${material.heat_treatment})` : ''}:</b> {condNote}
                          </p>
                        )}
                        {/* R226j/C6 — 가공 주의사항/권장 방법: m.profiles.mach → machining-guidance.json (구 R175/R176/R177 인라인 name-regex 21블록 이관) */}
                        {machGuidance && (
                          <div className="mt-2 pt-2 border-t border-current/15">
                            <p className="text-[11px] font-semibold leading-relaxed mb-1">⚠ 가공 주의사항 / 권장 방법:</p>
                            <RecText className="text-[11px] leading-relaxed">{machGuidance}</RecText>
                          </div>
                        )}
                        {/* R226j — 출처는 콘텐츠 SSOT(process-profiles.json)에서 카테고리별 도출 */}
                        <p className="text-[10px] mt-2 pt-1.5 border-t border-current/10 text-foreground/60">
                          <b>출처 / 기준</b>: {machinabilitySources(material).join(' · ')}{material.category !== 'Polymer' && machCost ? ' · raw 단가 × cost factor = 가공 후 추정 단가 (vendor 견적과 ±20-30% 차이)' : ''}.
                        </p>
                      </div>
                    </details>
                  )}
                  {/* R140 — 카드 2: 재료명에 HT 가 이미 반영된 경우 alloy-specific 설명 표시.
                      예: "17-4 PH H900" → 1170 MPa peak strength + 482°C aged 1h + landing gear use case.
                      미매칭 (specific HT 없거나 generic alloy) 시 기존 HT 가중치 카드 표시. */}
                  {(() => {
                    // R226j — family 식별은 빌드 스탬프 m.profiles.ht (name-regex 스캔 제거)
                    const alloyHt = htAlloySpecificFor(material.name, material.heat_treatment, material.profiles?.ht);
                    if (alloyHt) {
                      const { family, description } = alloyHt;
                      return (
                        <details className="rounded-lg border-2 border-sky-300 bg-sky-50 p-3">
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
                    // R226v — htf 정확히 1.0 은 htCostBand 가 null (미산출 vs 진짜 불요 구분 불가·정보량 0).
                    //          단 HT 주의사항(htGuidanceTexts)이 있으면 가이드만으로 카드 유지 (Ti64 AM·AlSi10Mg 등 34건 손실 방지).
                    if (!htCost && htGuidanceTexts.length === 0) return null;
                    return (
                      <details className={`rounded-lg border-2 p-3 ${htCost ? bandColor(htCost.band) : 'border-border bg-muted/30'}`}>
                        <summary className="text-[12px] font-bold flex items-center justify-between cursor-pointer select-none list-none">
                          <span className="flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5" />Heat Treatment · 열처리</span>
                          <span className="text-[10px] font-normal opacity-70">{htCost ? <>×{htCost.factor.toFixed(2)} · <b>{htCost.label}</b></> : <b>주의사항</b>}</span>
                        </summary>
                        <div className="space-y-1.5 text-[12px] mt-2 pt-2 border-t border-current/15">
                          {htCost && (
                            <div className="flex items-baseline justify-between gap-2">
                              <b>HT 가중치</b>
                              <span className="font-mono">×{htCost.factor.toFixed(2)} · {htCost.detail} · <b>{htCost.label}</b></span>
                            </div>
                          )}
                          {(() => {
                            const f = htCost?.factor;
                            const atmosphere = f == null ? null : f >= 1.5 ? 'Vacuum / Inert gas (Ar/N₂)' : f >= 1.2 ? 'Inert gas 또는 controlled air' : 'Air / open furnace';
                            const steps = f == null ? null : f >= 1.5 ? '3-5 step (solution → quench → multi-stage aging + HIP/coating)' : f >= 1.2 ? '2 step (Q+T 또는 solution+aging)' : f >= 1.05 ? '1 step (stress relief 또는 anneal)' : 'None';
                            const hours = f == null ? null : f >= 1.5 ? '8-24h' : f >= 1.2 ? '4-8h' : f >= 1.05 ? '1-3h' : '0h';
                            const ksRef = f != null && f >= 1.2 ? 'KS D 0040 (열처리 일반) · KS D 3866 (구조용 강)' : null;
                            return (
                              <>
                                {htCost && (
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mt-1">
                                    <div><span className="text-foreground/60">분위기:</span> <b>{atmosphere}</b></div>
                                    <div><span className="text-foreground/60">총 시간:</span> <b>{hours}</b></div>
                                    <div className="col-span-2"><span className="text-foreground/60">단계:</span> <b>{steps}</b></div>
                                  </div>
                                )}
                                {htCost && <p className="text-[11px] leading-relaxed mt-1 text-foreground/80">{htCost.note}</p>}
                                {/* R226k — HT 주의사항: m.profiles.htg / htc → ht-guidance.json (구 인라인 12블록 이관) */}
                                {htGuidanceTexts.length > 0 && (
                                  <div className={htCost ? 'mt-2 pt-2 border-t border-current/15' : ''}>
                                    <p className="text-[11px] font-semibold leading-relaxed mb-1">⚠ 열처리 주의사항:</p>
                                    <RecText className="text-[11px] leading-relaxed">{htGuidanceTexts.join('\n\n')}</RecText>
                                  </div>
                                )}
                                <p className="text-[10px] mt-2 pt-1.5 border-t border-current/10 text-foreground/60">
                                  <b>출처 / 기준</b>: ASM Handbook Vol.4 Heat Treating{ksRef && ` · ${ksRef}`} · AMS spec (alloy 별){htCost ? ' · 분위기/단계/시간은 factor 기반 휴리스틱 (vendor 견적 별도 필요)' : ''}.
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
                    <details className={`rounded-lg border-2 p-3 ${bandColor(weldWorst || (material.weldability === 'Poor' ? 'high' : material.weldability === 'Fair' ? 'med' : 'low'))}`}>
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
                        {/* R226r — 조건(HT)별 HAZ 주의: 용접성 rating 은 조성기반(조건무관)이나 경화/시효/냉간 상태는 HAZ 연화 유발 */}
                        {weldCondNote && (
                          <div className="mt-2 pt-2 border-t border-current/15">
                            <p className="text-[11px] leading-relaxed text-foreground/80">
                              <b>이 조건{material.heat_treatment ? ` (${material.heat_treatment})` : ''}:</b> {weldCondNote}
                            </p>
                          </div>
                        )}
                        <div className="mt-2 pt-2 border-t-2 border-current/30">
                          <p className="text-[11px] font-semibold leading-relaxed mb-1">권고 절차:</p>
                          <RecText className="text-[11px] leading-relaxed">
                            {weldWorst === 'high' && '⚠ 균열 위험 高. Pre-heat 200°C+ · low-H 용접봉 · interpass temp 통제 · PWHT 필수.\n\n'}
                            {weldWorst === 'med' && '주의 필요. Pre-heat 100-200°C · 두꺼운 plate 에서 low-H 권장.\n\n'}
                            {weldWorst === 'low' && '✓ 일반 절차 가능. 표준 용접봉 + 일반 procedure.\n\n'}
                                                        {/* R226k — 합금별 용접 권고: m.profiles.wg → welding-guidance.json (구 인라인 71블록 이관; nonferrous 는 CE 지표 없을 때만) */}
                            {weldGuidance && '\n' + weldGuidance}
                            </RecText>
                          {sch && <p className="text-[11px] leading-relaxed text-foreground/80 mt-1"><TermText text={sch.note} /></p>}
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
                {material.industry_note && (() => {
                  /* R217 — industry_note 가독성: '<규격 designations> — <설명>' 구조를 분리.
                     규격 코드(UNS/EN/AMS/별칭)는 mono chip, 설명은 prose. em-dash 없으면 통째로 prose. */
                  const note = material.industry_note;
                  const split = note.indexOf(' — ');
                  const designations = split > 0 ? note.slice(0, split) : '';
                  const desc = split > 0 ? note.slice(split + 3) : note;
                  return (
                    <div className="mt-2">
                      <div className="flex items-center gap-1 text-[10.5px] font-semibold mb-1.5" style={{ color: famColor }}>
                        <span>📌</span><span>{t('detail.history.standard') || 'Industry standard'}</span>
                      </div>
                      {designations && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {designations.split(' / ').map((d, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap" style={{ background: `${famColor}1f`, color: famColor }}>{d.trim()}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-[11.5px] text-foreground/80 leading-relaxed whitespace-pre-wrap"><TermText text={desc} /></p>
                    </div>
                  );
                })()}
                {/* R226t/E13 — v2 구조화 스토리 (sections+timeline) 우선, 없으면 legacy blob 문단 */}
                {material.story_v2?.sections ? (() => {
                  const SEC_LABEL: Record<string, string> = {
                    hook: '', origin: '개발 배경', breakthrough: '기술적 돌파', adoption: '최초 적용·확산', today: '오늘날', fun_fact: '여담',
                  };
                  const ORDER = ['hook', 'origin', 'breakthrough', 'adoption', 'today', 'fun_fact'] as const;
                  const secs = material.story_v2.sections;
                  const tl = material.story_v2.timeline;
                  return (
                    <div className="mt-2 space-y-2.5 text-[11.5px] text-foreground/85 leading-relaxed">
                      {secs.hook && <p className="font-semibold text-foreground/95 italic"><StoryLinkedText text={secs.hook} map={wikiAutolink} byKey={wikiLookups?.byKey ?? null} selfKey={material.story_key} onSelectMaterial={onSelectMaterial} /></p>}
                      {tl && tl.length > 0 && (
                        <div className="rounded border px-2 py-1.5 space-y-1" style={{ borderColor: `${famColor}40`, background: `${famColor}0a` }}>
                          {tl.map((e, i) => (
                            <div key={i} className="flex gap-2 text-[10.5px] leading-snug">
                              <span className="font-mono font-bold whitespace-nowrap" style={{ color: famColor }}>{e.year}</span>
                              <span className="text-foreground/80">{e.event}{typeof e.ref === 'number' && <sup className="opacity-60"> [{e.ref}]</sup>}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {ORDER.filter((k) => k !== 'hook' && secs[k]).map((k) => (
                        <div key={k}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: famColor }}>{SEC_LABEL[k]}</p>
                          <p className="whitespace-pre-wrap"><StoryLinkedText text={secs[k] as string} map={wikiAutolink} byKey={wikiLookups?.byKey ?? null} selfKey={material.story_key} onSelectMaterial={onSelectMaterial} /></p>
                        </div>
                      ))}
                    </div>
                  );
                })() : material.story && (
                  <div className="mt-2 space-y-2 text-[11.5px] text-foreground/85 leading-relaxed">
                    {material.story.split('\n\n').map((para, i) => (
                      <p key={i} className="whitespace-pre-wrap"><StoryLinkedText text={para} map={wikiAutolink} byKey={wikiLookups?.byKey ?? null} selfKey={material.story_key} onSelectMaterial={onSelectMaterial} /></p>
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
              /* R140 — alloy-specific HT 우선, 없으면 generic glossary. R226j — ID 기반 family. */
              const alloyHt = htAlloySpecificFor(material.name, material.heat_treatment, material.profiles?.ht);
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
            {/* R226s/E10: 권장 후공정 — 합금 그룹별 목적·근거 기반 추천 (빌드 스탬프 profiles.cg → coating-recommendations.json) */}
            {(() => {
              const plan = resolveCoatingPlan(material);
              if (!plan || (!plan.recs.length && !plan.intro && !plan.notes.length)) return null;
              return (
                <div className="mt-3 rounded border border-accent/30 bg-accent/5 p-2.5">
                  <p className="text-[11px] font-semibold text-accent mb-1 uppercase tracking-wide">{t('detail.coatings.title')} · {plan.title}</p>
                  {plan.intro && <p className="text-[10px] text-foreground/75 mb-1.5 leading-relaxed">{plan.intro}</p>}
                  <div className="space-y-2">
                    {plan.recs.map((r) => {
                      const c = r.coating;
                      return (
                        <div key={c.id} className="text-[11px] leading-snug border-b border-accent/15 pb-1.5 last:border-0">
                          <p className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap" title={`${c.applications}${c.limitations ? `\n한계: ${c.limitations}` : ''}`}>
                            <span className="text-[9px] px-1 rounded bg-accent/15 text-accent border border-accent/30 font-semibold whitespace-nowrap">{PURPOSE_LABEL[r.purpose] || r.purpose}</span>
                            {c.nameKo}
                          </p>
                          <p className="text-[10px] text-foreground/85 mt-0.5"><b>언제:</b> {r.when}</p>
                          <p className="text-[10px] text-foreground/70 mt-0.5">{r.why}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-0.5">
                            {c.thicknessMicrons[1] > 0 && <span>두께 {c.thicknessMicrons[0]}-{c.thicknessMicrons[1]}μm</span>}
                            {c.surfaceHardnessHV && <span>HV ≈ {c.surfaceHardnessHV}</span>}
                            {c.frictionCoef != null && <span>μ ≈ {c.frictionCoef}</span>}
                            {c.fatigueGainPct != null && c.fatigueGainPct !== 0 && <span className={c.fatigueGainPct > 0 ? 'text-emerald-700' : 'text-rose-700'}>Δ피로 {c.fatigueGainPct > 0 ? '+' : ''}{c.fatigueGainPct}%</span>}
                            {c.corrosionUpgrade !== 'none' && <span>내식 {c.corrosionUpgrade}</span>}
                            <span>비용 ×{c.costFactor}</span>
                          </div>
                          {r.caution && <p className="text-[10px] text-amber-700 mt-0.5">⚠ {r.caution}</p>}
                        </div>
                      );
                    })}
                  </div>
                  {plan.notes.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {plan.notes.map((n, i) => <li key={i} className="text-[10px] text-foreground/70 leading-relaxed">ⓘ {n}</li>)}
                    </ul>
                  )}
                  <p className="text-[9px] text-muted-foreground mt-1.5 pt-1 border-t border-accent/15"><b>출처</b>: {plan.sources.join(' · ')}</p>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
