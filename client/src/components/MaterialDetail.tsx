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
import { computeCET, computeCEIIW, computePcm, computeSchaeffler, computeMachinability, machiningCostBand, htCostBand } from '@/lib/welding-machinability';
import { TempCurveChart } from '@/components/TempCurveChart';
import { CreepRuptureChart } from '@/components/CreepRuptureChart';
import { recommendedCoatings } from '@/lib/coatings';
import { useT, useLang } from '@/lib/i18n';
import { familyColor } from '@/lib/material-colors';
import { formatPrice, loadUnitSystem } from '@/lib/unit-convert';
import { useState as useStateRD } from 'react';
import { RadarChart, RadarConfig, DEFAULT_RADAR_AXES, type RadarAxis, type NormalizeBase } from '@/components/RadarChart';

interface MaterialDetailProps {
  material: Material | null;
  compareList: string[];
  onToggleCompare: (id: string) => void;
  onClose: () => void;
  dragHandleProps?: { onPointerDown?: (e: any) => void }; // when floating, makes the header a drag handle
  floating?: boolean;
  /** R53a — Radar normalize 에 사용할 전체 dataset. 없으면 'set' base 만 동작. */
  allMaterials?: Material[];
  /** R69 A — 즐겨찾기. favorites set + toggle callback. */
  favorites?: Set<string>;
  onToggleFavorite?: (id: string) => void;
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
  // R48c — price 표시는 formatPrice 사용 — typical 만 항상 평가. range min/max 는 hasRange 조건 안에서만
  //        (이전: range null 인 5 flat-only properties 클릭 시 range!.min eager 평가로 crash).
  const typicalStr = isPrice && sys ? formatPrice(typical, lang, sys, priceUnit) : `${fmt(typical)}`;
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
      <div className="text-right">
        <span className="font-mono text-xs font-medium text-foreground">{typicalStr}</span>
        {!isPrice && <span className="text-muted-foreground font-normal text-[11px]"> {unit}</span>}
        {badge && (
          <span className={`ml-1 text-[10px] ${badge.cls}`} title={badge.tip}>{badge.label}</span>
        )}
        {hasRange && range && (
          <div className="text-[10px] font-mono text-muted-foreground/70 leading-tight">
            {isPrice && sys ? formatPrice(range.min, lang, sys, priceUnit) : fmt(range.min)}
            –
            {isPrice && sys ? formatPrice(range.max, lang, sys, priceUnit) : fmt(range.max)}
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

/* R76 — 원소별 색상 매핑 (CPK + handbook 관습 mix). R84 — 채도 ↑ (38% → 50%), 명도 살짝 ↓ 로 인접 원소 구분성 강화. */
const ELEMENT_COLORS: Record<string, string> = {
  Fe: '#5a6473', Cr: '#5fa3d8', Ni: '#8fbd86', C: '#3a3a3a', Mn: '#8a5fc4',
  Si: '#d4be4f', Cu: '#cf6f2e', Al: '#a5acba', Ti: '#9aa4b3', V: '#d870a5',
  Mo: '#7a4fb8', W: '#2a2a2a', Co: '#4f7fbd', Nb: '#5aada3', Ta: '#646872',
  Mg: '#80c075', Zn: '#a7a8b3', Sn: '#9da0b5', N: '#7fcbd9', P: '#e08c44',
  S:  '#e8c83a', B: '#dc8aa4', Y: '#d089a8', Zr: '#8c92a0', O: '#e35a5a',
  Ag: '#c8cdda', Hf: '#828891', Li: '#daa05f', La: '#bb88dc', Ce: '#c89edb',
  Re: '#666c78', Pb: '#697080', Be: '#85c89e', Bi: '#7560a0', Cd: '#cab045',
  Ga: '#a087c0', In: '#828a98', Pt: '#aab0b8', Pd: '#94a0a8', Au: '#e8b840',
};
function elementColor(el: string): string {
  if (ELEMENT_COLORS[el]) return ELEMENT_COLORS[el];
  let h = 0; for (let i = 0; i < el.length; i++) h = (h * 31 + el.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(h) % 360}, 50%, 55%)`;
}
/* "16.0~18.0" → 17.0, "≤2" → 2, "≥58" → 58, "0.25" → 0.25, "balance" / "trace" → null. */
function parseCompValue(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return isFinite(raw) ? raw : null;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === 'balance' || s === 'bal' || s === 'bal.' || s === 'rem' || s === 'remainder' || s === 'trace' || s === 'micro' || s === 'tr' || s === 'others') return null;
  let m = s.match(/^[≤<≦]\s*([\d.]+)/); if (m) return parseFloat(m[1]);
  m = s.match(/^[≥>≧]\s*([\d.]+)/);     if (m) return parseFloat(m[1]);
  m = s.match(/^([\d.]+)\s*[~–\-—]\s*([\d.]+)/); if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
  const n = parseFloat(s); return isFinite(n) ? n : null;
}
type CompSlice = { element: string; value: number; color: string; isBalance: boolean; raw: string };
function buildCompSlices(comp: Material['composition']): CompSlice[] {
  // 통일 처리: array form [[el, range], ...] 또는 object form {El: range, ...} 둘 다.
  const pairs: Array<[string, unknown]> = Array.isArray(comp)
    ? (comp.filter((p): p is [string, string] => Array.isArray(p) && p.length >= 2))
    : (comp && typeof comp === 'object' ? Object.entries(comp) : []);
  if (pairs.length === 0) return [];
  const items: Array<{ element: string; value: number; raw: string }> = [];
  let balanceEl: string | null = null;
  for (const [el, v] of pairs) {
    if (v == null || v === '' || v === 0 || v === '0') continue;
    const s = String(v).trim().toLowerCase();
    if (s === 'balance' || s === 'bal' || s === 'bal.' || s === 'rem' || s === 'remainder') { balanceEl = el; continue; }
    const num = parseCompValue(v);
    if (num != null && num > 0) items.push({ element: el, value: num, raw: String(v) });
  }
  const knownSum = items.reduce((s, d) => s + d.value, 0);
  const balVal = Math.max(0, 100 - knownSum);
  if (balanceEl && balVal > 0) items.push({ element: balanceEl, value: balVal, raw: 'balance' });
  items.sort((a, b) => b.value - a.value);
  return items.map((d) => ({ ...d, color: elementColor(d.element), isBalance: d.element === balanceEl }));
}

/* SVG donut. center 에 dominant element 강조. hover title 로 wt% / share % 표시. */
function CompositionDonut({ slices }: { slices: CompSlice[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total <= 0 || slices.length === 0) return null;
  const cx = 100, cy = 100, R = 78, r = 48;
  let acc = 0;
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" className="block" role="img" aria-label="composition donut">
      {slices.map((d) => {
        const frac = d.value / total;
        const a0 = (acc / total) * 2 * Math.PI - Math.PI / 2; acc += d.value;
        const a1 = (acc / total) * 2 * Math.PI - Math.PI / 2;
        const large = frac > 0.5 ? 1 : 0;
        // 100% 단일 원소 시 path 가 닫히지 않는 문제 → 두 개의 반-arc 로 분할 (a0 .. a0+π .. a1).
        if (frac > 0.999) {
          return (
            <g key={d.element}>
              <title>{`${d.element}: ${d.value.toFixed(2)} wt% (100%)`}</title>
              <circle cx={cx} cy={cy} r={R} fill={d.color} stroke="white" strokeWidth="1" />
              <circle cx={cx} cy={cy} r={r} fill="white" />
            </g>
          );
        }
        const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
        const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        const xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
        const xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
        const path = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi0} ${yi0} Z`;
        return (
          <g key={d.element}>
            <title>{`${d.element}: ${d.value.toFixed(2)} wt% (${(frac * 100).toFixed(1)}%${d.isBalance ? ', balance' : ''})`}</title>
            <path d={path} fill={d.color} stroke="white" strokeWidth="1" />
          </g>
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: 14, fontWeight: 700 }}>{slices[0].element}</text>
      <text x={cx} y={cy + 11} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>{((slices[0].value / total) * 100).toFixed(1)}%</text>
    </svg>
  );
}

function CompositionDisplay({ material }: { material: Material }) {
  const composition = material.composition;
  const slices = buildCompSlices(composition);

  // 둘 다: array form / object form 동일하게 grid 표시 + donut 상단.
  const pairs: Array<[string, string]> = Array.isArray(composition)
    ? (composition.filter((p): p is [string, string] => Array.isArray(p) && p.length >= 2).map(p => [String(p[0]), String(p[1])]))
    : (composition && typeof composition === 'object'
        ? Object.entries(composition).filter(([_, v]) => v !== null && v !== undefined && v !== '' && v !== '0' && v !== 0).map(([k, v]) => [k, String(v)])
        : []);

  if (pairs.length === 0 && slices.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-4 text-center">Chemical composition data not available</p>;
  }
  // grid sort: balance 우선 → 값 큰 순.
  pairs.sort((a, b) => {
    const isBalA = /^(balance|bal|bal\.|rem|remainder)$/i.test(a[1]);
    const isBalB = /^(balance|bal|bal\.|rem|remainder)$/i.test(b[1]);
    if (isBalA && !isBalB) return -1;
    if (isBalB && !isBalA) return 1;
    const va = parseCompValue(a[1]) ?? 0;
    const vb = parseCompValue(b[1]) ?? 0;
    return vb - va;
  });

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-foreground/80 mb-2">Chemical Composition (wt%)</div>
      {slices.length > 0 && (
        <div className="rounded border border-border/50 bg-muted/10 p-3 flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-shrink-0 mx-auto sm:mx-0"><CompositionDonut slices={slices} /></div>
          <div className="flex-1 mt-2 sm:mt-0 grid grid-cols-2 gap-x-3 gap-y-1">
            {slices.map((d) => (
              <div key={d.element} className="flex items-center justify-between text-[10.5px]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                  <span className="font-semibold text-foreground">{d.element}</span>
                  {d.isBalance && <span className="text-[9px] text-muted-foreground italic">bal</span>}
                </span>
                <span className="font-mono text-muted-foreground">{d.value.toFixed(d.value < 1 ? 2 : 1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {pairs.map(([element, range]) => (
          <div key={element} className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border/30">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: elementColor(element) }} />
              {element}
            </span>
            <span className="text-xs font-mono text-muted-foreground">{range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">{label}</div>
      <div className="text-xs text-foreground">{children}</div>
    </div>
  );
}

export function MaterialDetail({ material, compareList, onToggleCompare, onClose, dragHandleProps, floating, allMaterials, favorites, onToggleFavorite }: MaterialDetailProps) {
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
                <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1"><Coins className="w-3 h-3" />Cost <span className="text-[10px] font-normal text-muted-foreground/60">(approx. market)</span></h3>
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
          <TabsContent value="composition" className="p-4">
            <CompositionDisplay material={material} />
          </TabsContent>

          {/* Process */}
          <TabsContent value="process" className="p-4 space-y-3">
            {/* R112 — 공정 평가 3 종합 카드 (Machinability / Heat Treatment / Weldability). 각각 단일 카드로 통합 + 경고 색상. */}
            {(() => {
              const mach = computeMachinability(material);
              const machCost = machiningCostBand(material.machining_cost_factor);
              const htCost = htCostBand(material.ht_cost_factor);
              const cet = computeCET(material);
              const ce_iiw = computeCEIIW(material);
              const pcm = computePcm(material);
              const sch = computeSchaeffler(material);
              if (!mach && !machCost && !htCost && !cet && !ce_iiw && !pcm && !sch) return null;
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
              /* R113 — 3 카드 모두 collapsible (mobile 가독성). default: Machinability open · HT/Weld closed.
                 모바일 1단 + 데스크탑 2단 grid 로 폭 적응. */
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 카드 1 — 절삭성 + 가공비 통합 (default open) */}
                  {(mach || machCost) && (
                    <details open className={`rounded-lg border-2 p-3 ${bandColor((machCost?.band || mach?.band) as string)} md:col-span-1`}>
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
                  {/* 카드 2 — 열처리·후공정 통합 (R117: default open, 사용자 요청). collapse 기능 유지. */}
                  {htCost && (
                    <details open className={`rounded-lg border-2 p-3 ${bandColor(htCost.band)} md:col-span-1`}>
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
                  )}
                  {/* 카드 3 — 용접성 4 지표 통합 경고 (default closed, but high band 면 open) */}
                  {(ce_iiw || cet || pcm || sch) && (
                    <details open={weldWorst === 'high'} className={`rounded-lg border-2 p-3 ${bandColor(weldWorst || 'normal')} md:col-span-2`}>
                      <summary className="text-[12px] font-bold flex items-center justify-between cursor-pointer select-none list-none">
                        <span className="flex items-center gap-1.5">
                          <FlaskConical className="w-3.5 h-3.5" />Weldability · 용접성 종합
                          {weldWorst === 'high' && <span className="text-rose-700">⚠</span>}
                        </span>
                        <span className="text-[10px] font-normal opacity-70">
                          {weldWorst === 'high' ? '⚠ 위험' : weldWorst === 'med' ? '주의' : '✓ 우수'} · CE+CET+Pcm+Schaeffler
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
                        <div className="mt-2 pt-2 border-t-2 border-current/30">
                          <p className="text-[11px] font-semibold leading-relaxed">권고 절차:</p>
                          <p className="text-[11px] leading-relaxed">
                            {weldWorst === 'high' && '⚠ 균열 위험 高. Pre-heat 200°C+ · low-H 용접봉 · interpass temp 통제 · PWHT 필수.'}
                            {weldWorst === 'med' && '주의 필요. Pre-heat 100-200°C · 두꺼운 plate 에서 low-H 권장.'}
                            {weldWorst === 'low' && '✓ 일반 절차 가능. 표준 용접봉 + 일반 procedure.'}
                          </p>
                          {sch && <p className="text-[11px] leading-relaxed text-foreground/80 mt-1">{sch.note}</p>}
                          <p className="text-[10px] mt-2 pt-1.5 border-t border-current/10 text-foreground/60">
                            <b>출처 / 기준</b>: IIW Doc IX-535-67 (CE_IIW) · IIW IX-1086-87 (CET, Thyssen) · JIS (Pcm, Ito-Bessyo 1969) · AWS A3.0 / Schaeffler 1949 · ASM Vol.6 Welding
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

            {/* R76 → R87 — History·개발 스토리. amber 단일톤 → 재료 family color 의 옅은 배경 + 진한 텍스트 (Card/Table 배지와 통일). */}
            {(material.story || material.industry_note) && (
              <details open className="rounded border p-3" style={{ background: `${famColor}10`, borderColor: `${famColor}55` }}>
                <summary className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none" style={{ color: famColor }}>
                  <BookText className="w-3.5 h-3.5" />
                  {t('detail.history') || 'History · 개발 스토리'}
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
              const g = htGlossaryFor(material.heat_treatment);
              return (
                <Field label="Condition / heat treatment">
                  <span>{material.heat_treatment}</span>
                  {g && <span className="ml-1.5 text-[10px] text-muted-foreground italic" title={g.short}>— {g.effect}</span>}
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
