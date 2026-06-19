/*
 * R157b — RangeRow: property value + range + confidence badge row.
 * MaterialDetail.tsx 의 inline 정의에서 추출. Behavior identical.
 *
 * Used by Properties/Composition/Cost sections of detail panel.
 */
import type { PropertyRange } from '@/lib/materials';
import { useLang } from '@/lib/i18n';
import { formatPrice, loadUnitSystem } from '@/lib/unit-convert';
import { CONFIDENCE, type ConfidenceLevel } from '@/lib/material-colors';

/** 숫자 포맷 helper — 10 미만은 소수 2자리, 10 이상은 1자리, integer 그대로. */
export const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 2 : 1));

/* R204 #3 — Cost factor / Difficulty factor 의 directness 라벨 helper.
 *   사용자 권장: 1.0 = 보통, 작을수록 쉬움/저렴, 클수록 어려움/비쌈.
 *   Machining / HT factor → 어려움 의미
 *   Price condition/form/grade × → 가격(premium) 의미 */
export function factorDifficultyLabel(value: number, kind: 'difficulty' | 'price'): { label: string; color: string } | null {
  if (!isFinite(value) || value <= 0) return null;
  const v = value;
  /* 단계 7가지: 매우쉬움/쉬움/조금쉬움/보통/조금어려움/어려움/매우어려움 */
  const labels = kind === 'difficulty'
    ? ['매우 쉬움', '쉬움', '조금 쉬움', '보통', '조금 어려움', '어려움', '매우 어려움']
    : ['매우 저렴', '저렴', '약간 저렴', '표준', '약간 비쌈', '비쌈', '매우 비쌈'];
  const colors = ['text-emerald-700', 'text-emerald-600', 'text-emerald-500', 'text-muted-foreground', 'text-amber-600', 'text-orange-600', 'text-rose-600'];
  let idx: number;
  if (v < 0.72) idx = 0;       // ≤ 0.71
  else if (v < 0.88) idx = 1;  // 0.72 – 0.87
  else if (v < 0.97) idx = 2;  // 0.88 – 0.96
  else if (v <= 1.05) idx = 3; // 0.97 – 1.05 (표준 / 보통)
  else if (v <= 1.18) idx = 4; // 1.06 – 1.18
  else if (v <= 1.45) idx = 5; // 1.19 – 1.45
  else idx = 6;                // 1.46+
  return { label: labels[idx], color: colors[idx] };
}

export function RangeRow({
  label,
  range,
  fallback,
  unit,
}: {
  label: string;
  range?: PropertyRange | null;
  fallback?: number | string | null;
  unit: string;
}) {
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
  /* R125c — fallback chain 단계별 confidence 라벨 차별화:
     handbook (1차자료) → subfamily (3rd, 특정 subcategory, e.g. austenitic) → family (2nd, group)
     → class (1st, category 일반) → derived (다른 물성 유도). 신뢰도 sky → blue → amber → orange → rose 순. */
  /* R204 #2 — derived label 을 property type 별 context-aware 화.
     이전: '≈UTS' (피로 유도 의미) 가 price 에도 표시 → 사용자 혼란.
     이제: price 류 = '계산', fatigue 류 = '≈UTS', 기타 = '유도'. */
  const isPriceProp = /price|cost/i.test(label);
  const isFatigueProp = /피로|fatigue|σ_?f\b|σf/i.test(label);
  const derivedLabel = isPriceProp ? '계산' : (isFatigueProp ? '≈UTS' : '유도');
  const derivedTip = isPriceProp
    ? '계산값 — base price × condition/form/grade 배수 적용 (raw price 의 product)'
    : (isFatigueProp ? '피로 한도 = UTS·비율 (Shigley/MMPDS family typical)' : '다른 물성에서 유도된 값');

  /* R210 B5 — 색/툴팁은 material-colors.ts 의 CONFIDENCE 단일 소스에서. measured 의 라벨은 n=N,
     derived 의 라벨·툴팁은 property type 별(가격='계산'/피로='≈UTS'/기타='유도')로 override. */
  const base = conf ? CONFIDENCE[conf as ConfidenceLevel] : null;
  const badge = base ? {
    label: conf === 'measured' ? `n=${range?.n ?? 0}` : conf === 'derived' ? derivedLabel : base.label,
    cls: base.twText,
    dot: base.twDot,
    tip: conf === 'derived' ? derivedTip : base.tip,
  } : null;
  /* R129 — fallback 출처/조정 표시 (provenance). hover tooltip 에 fallback chain 명시.
            예: "alloy:174ph × HT:H1025 (f×0.9, i×1.4)" → 17-4 PH peak 값에서 H1025 condition 조정. */
  const prov = (range as { provenance?: string })?.provenance;
  /* R139b — typical (ASM/Granta 평균값) vs min_spec (vendor 보증 minimum, 예: AMS) 구분.
            vendor minimum 이 typical 과 다를 때 별표 표시 + tooltip 에 출처 명시. */
  const minSpec = (range as { min_spec_value?: number })?.min_spec_value;
  const minSpecSrc = (range as { min_spec_source?: string })?.min_spec_source;
  // R48c — price 표시는 formatPrice 사용 — typical 만 항상 평가. range min/max 는 hasRange 조건 안에서만
  //        (이전: range null 인 5 flat-only properties 클릭 시 range!.min eager 평가로 crash).
  const typicalStr = isPrice && sys ? formatPrice(typical, lang, sys, priceUnit) : `${fmt(typical)}`;
  /* R204 #3 — Cost/Difficulty factor (unit=×) 의 directness 라벨.
     Machining/HT factor → 어려움 등급, Condition/Form/Grade × → 가격(premium) 등급. */
  const isFactorRow = unit === '×' && typeof typical === 'number';
  const isDifficultyFactor = /machining|ht factor|machinability|wear/i.test(label);
  const factorBadge = isFactorRow ? factorDifficultyLabel(typical as number, isDifficultyFactor ? 'difficulty' : 'price') : null;
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground pt-0.5 flex items-center gap-1">
        {/* R202 #2 — confidence dot (한 눈에 신뢰도 식별) */}
        {badge && (
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${badge.dot} flex-shrink-0`}
            title={prov ? `${badge.tip}\n출처: ${prov}` : badge.tip}
          />
        )}
        {label}
      </span>
      <div className="text-right">
        <span className="font-mono text-xs font-medium text-foreground">{typicalStr}</span>
        {!isPrice && <span className="text-muted-foreground font-normal text-[11px]"> {unit}</span>}
        {/* R204 #3 — factor directness 라벨 (×값 옆) */}
        {factorBadge && (
          <span className={`ml-1.5 text-[10px] font-medium ${factorBadge.color}`} title={`${factorBadge.label} (값 ${typical?.toFixed?.(2)} ×, 1.0=표준/보통 기준)`}>
            {factorBadge.label}
          </span>
        )}
        {badge && !isFactorRow && (
          <span className={`ml-1 text-[10px] ${badge.cls}`} title={prov ? `${badge.tip}\n출처: ${prov}` : badge.tip}>{badge.label}</span>
        )}
        {/* R139b — min spec (vendor 보증) vs typical (ASM) 차이 표시 */}
        {minSpec != null && typeof typical === 'number' && Math.abs(minSpec - typical) > typical * 0.15 && (
          <span
            className="ml-1 text-[10px] text-amber-600 font-medium"
            title={`Typical: ${fmt(typical)} ${unit} (ASM/Granta 평균)\nMin spec: ${fmt(minSpec)} ${unit}${minSpecSrc ? ` (${minSpecSrc})` : ''}\n\n사용자 의사결정 권장: 안전 임계 시 min spec 사용.`}
          >
            min={fmt(minSpec)}
          </span>
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
