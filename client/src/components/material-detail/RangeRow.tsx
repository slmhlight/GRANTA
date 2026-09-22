/*
 * R157b — RangeRow: property value + range + confidence badge row.
 * MaterialDetail.tsx 의 inline 정의에서 추출. Behavior identical.
 *
 * Used by Properties/Composition/Cost sections of detail panel.
 */
import type { PropertyRange } from '@/lib/materials';
import { useLang } from '@/lib/i18n';
import { formatPrice } from '@/lib/unit-convert';
import { useUnitSystem, displayNumber, displayUnit } from '@/lib/unit-context';   // AUD F01
import { CONFIDENCE, type ConfidenceLevel } from '@/lib/material-colors';
import { Link } from 'wouter';
import { glossarySlugFor } from '@/lib/property-glossary';

/** 숫자 포맷 helper — 10 미만은 소수 2자리, 10 이상은 1자리, integer 그대로. */
export const fmt = (v: number | null | undefined) => (v == null ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 2 : 1));

/* R204 #3 — Cost factor / Difficulty factor 의 directness 라벨 helper.
 *   사용자 권장: 1.0 = 보통, 작을수록 쉬움/저렴, 클수록 어려움/비쌈.
 *   Machining / HT factor → 어려움 의미
 *   Price condition/form/grade × → 가격(premium) 의미 */
export function factorDifficultyLabel(value: number, kind: 'difficulty' | 'price', lang: 'ko' | 'en' = 'ko'): { label: string; color: string } | null {
  if (!isFinite(value) || value <= 0) return null;
  const v = value;
  /* 단계 7가지: 매우쉬움/쉬움/조금쉬움/보통/조금어려움/어려움/매우어려움 */
  const labels = kind === 'difficulty'
    ? (lang === 'en' ? ['very easy', 'easy', 'fairly easy', 'average', 'fairly hard', 'hard', 'very hard'] : ['매우 쉬움', '쉬움', '조금 쉬움', '보통', '조금 어려움', '어려움', '매우 어려움'])
    : (lang === 'en' ? ['very cheap', 'cheap', 'slightly cheap', 'standard', 'slightly costly', 'costly', 'very costly'] : ['매우 저렴', '저렴', '약간 저렴', '표준', '약간 비쌈', '비쌈', '매우 비쌈']);
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
  propKey,
}: {
  label: string;
  range?: PropertyRange | null;
  fallback?: number | string | null;
  unit: string;
  /** W4-5 — 물성 키. 글로서리 용어가 있는 물성이면 라벨이 그 문서로 가는 링크가 된다. */
  propKey?: string;
}) {
  // R40b — price 표시 시 lang/unitSystem 에 따라 USD/KRW + kg/lb 자동 변환.
  const { lang } = useLang();
  const termSlug = glossarySlugFor(propKey);
  const isPrice = /USD\//.test(unit);
  const priceUnit: 'kg' | 'cm3' = unit.includes('cm³') || unit.includes('cm3') ? 'cm3' : 'kg';
  const sysAll = useUnitSystem();
  const sys = isPrice ? sysAll : null;
  /* AUD F01 — 가격 외 물성도 단위계를 따른다. 값 SSOT 는 SI, 표시만 변환(propKey 가 변환표에 있을 때). */
  const disp = (v: number | null | undefined) => (propKey && !isPrice ? displayNumber(propKey, v, sysAll) : (v ?? null));
  const dispUnit = propKey && !isPrice ? displayUnit(propKey, unit, sysAll) : unit;
  /* AUD F01 — 가격 라벨의 "(per kg)/(per cm³)" 도 단위계를 따른다 ($/lb 인데 라벨은 per kg 이던 것). */
  const shownLabel = isPrice && sysAll === 'imperial' ? label.replace('(per kg)', '(per lb)').replace('(per cm³)', '(per in³)') : label;

  /* 호출부가 fallback 으로 propValue(material, key) 를 넘긴다 — range.typical 이 있으면
     양쪽이 같은 값이고, 없으면 fallback 이 곧 propValue 다. 즉 이 줄은 공용 리더와 동치이며,
     그래서 이 컴포넌트만 range 객체(신뢰도·n·min/max·provenance)를 따로 받아도 값은 안 갈라진다. */
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
  /* AUD F22 (2026-09-22) — 피로 유도값의 배지·툴팁은 provenance 에 적힌 식을 그대로 읽는다. 예전엔 어떤 값이든
     '≈UTS' 로 찍었지만 실제 규칙은 σy 기반(family:σf≈0.38·σy …)과 UTS 기반(σf≈0.45·UTS)이 섞여 있다. */
  const provStr = String((range as { provenance?: string })?.provenance ?? '');
  const fatigueRule = provStr.match(/σf≈([\d.]+)·(σy|UTS)/);
  const derivedLabel = isPriceProp ? (lang === 'en' ? 'calc' : '계산') : (isFatigueProp ? (fatigueRule ? `≈${fatigueRule[1]}·${fatigueRule[2]}` : (lang === 'en' ? 'derived' : '유도')) : (lang === 'en' ? 'derived' : '유도'));
  const en = lang === 'en';
  /* AUD N01 (2026-09-22) — HT 보정계수를 곱한 모델값(피로·충격·KIC): 기초값 × 계수 (조건) 을 툴팁에 그대로 노출. */
  const htm = range as { base_value?: number; base_range?: number[]; factor?: number; condition?: string; model?: string; base_n?: number } | undefined;
  const isHtModel = !!(htm && typeof htm.base_value === 'number' && typeof htm.factor === 'number' && String(htm.model || '').startsWith('ht-multiplier'));
  const htModelTip = isHtModel
    ? (en
      ? `Model value — handbook base ${fmt(disp(htm!.base_value))}${htm!.base_range ? ` (${fmt(disp(htm!.base_range[0]))}–${fmt(disp(htm!.base_range[1]))})` : ''} ${dispUnit} × heat-treatment factor ${htm!.factor} (${htm!.condition}) = ${fmt(disp(typical))}. Not a measurement for this condition; the base is a handbook value for the peak/reference condition.`
      : `모델값 — 핸드북 기초값 ${fmt(disp(htm!.base_value))}${htm!.base_range ? ` (${fmt(disp(htm!.base_range[0]))}–${fmt(disp(htm!.base_range[1]))})` : ''} ${dispUnit} × 열처리 보정계수 ${htm!.factor} (${htm!.condition}) = ${fmt(disp(typical))}. 이 조건의 실측이 아니라 기준 조건 핸드북 값에 계수를 곱한 추정입니다.`)
    : null;
  const derivedTip = htModelTip ?? (isPriceProp
    ? (en ? 'Calculated — base price × condition/form/grade multipliers (product of raw price)' : '계산값 — base price × condition/form/grade 배수 적용 (raw price 의 product)')
    : (isFatigueProp
      ? (fatigueRule
        ? (en ? `Endurance limit ≈ ${fatigueRule[1]} × ${fatigueRule[2]} (family-typical ratio — 10⁷ cycles, R=−1, smooth specimen; not measured)` : `피로 한도 ≈ ${fatigueRule[1]} × ${fatigueRule[2]} (계열 대표 비율 — 10⁷ cycles·R=−1·매끈 시편 가정, 실측 아님)`)
        : (en ? 'Fatigue value derived from other properties' : '다른 물성에서 유도된 피로값'))
      : (en ? 'Value derived from other properties' : '다른 물성에서 유도된 값')));
  /* AUD F26 — measured 툴팁은 표본 수를 그대로 말한다. n=1 은 "실측 데이터 다수" 가 아니다.
     AUD Q02 (2026-09-22) — 가격의 n 은 시험 표본이 아니라 시세·견적 출처 수다. */
  const nPts = range?.n ?? 0;
  const measuredTip = isPrice
    ? (en ? `Market price citation${nPts === 1 ? '' : 's'}: ${nPts} — n counts price sources/quotes, not test specimens.` : `시장 단가 인용 ${nPts}건 — n 은 시험 표본 수가 아니라 시세·견적 출처 수입니다.`)
    : nPts >= 3 ? (en ? `Measured data: ${nPts} points (mean ± range)` : `실측 데이터 ${nPts}점 (평균 ± 범위)`)
      : nPts === 1 || nPts === 2 ? (en ? `Measured: ${nPts} point${nPts === 2 ? 's' : ''} — close to a single representative value. Check condition, test method and sample size in the source.` : `실측 ${nPts}점 — 단일 대표값에 가깝습니다. 조건·시험법·표본 수를 출처에서 확인하세요.`)
        : (en ? 'Labelled measured but no sample-size information — check the source.' : '실측으로 표기됐지만 표본 수 정보가 없습니다 — 출처를 확인하세요.');

  /* R210 B5 — 색/툴팁은 material-colors.ts 의 CONFIDENCE 단일 소스에서. measured 의 라벨은 n=N,
     derived 의 라벨·툴팁은 property type 별(가격='계산'/피로='≈UTS'/기타='유도')로 override. */
  const base = conf ? CONFIDENCE[conf as ConfidenceLevel] : null;
  const badge = base ? {
    label: conf === 'measured' ? `n=${range?.n ?? 0}` : conf === 'derived' ? (isHtModel ? `HT×${htm!.factor}` : derivedLabel) : (lang === 'en' ? base.labelEn : base.label),   // AUD F23 · N01 (HT×계수 라벨)
    cls: base.twText,
    dot: base.twDot,
    tip: conf === 'derived' ? derivedTip : conf === 'measured' ? measuredTip : (en && (base as { tipEn?: string }).tipEn) || base.tip,
  } : null;
  /* R129 — fallback 출처/조정 표시 (provenance). hover tooltip 에 fallback chain 명시.
            예: "alloy:174ph × HT:H1025 (f×0.9, i×1.4)" → 17-4 PH peak 값에서 H1025 condition 조정. */
  const prov = (range as { provenance?: string })?.provenance;
  /* R139b — typical (ASM/Granta 평균값) vs min_spec (vendor 보증 minimum, 예: AMS) 구분.
            vendor minimum 이 typical 과 다를 때 별표 표시 + tooltip 에 출처 명시. */
  const minSpec = (range as { min_spec_value?: number })?.min_spec_value;
  const minSpecSrc = (range as { min_spec_source?: string })?.min_spec_source;
  /* E4 (H6 W4-1) — 위 min_spec_value 와 다른 축이다.
     저쪽은 "평균은 따로 있고 보증 최소가 이것"(두 숫자 병기)이고,
     이쪽 basis='min_spec' 은 **표에 실린 숫자 하나가 곧 규격 하한**이다.
     표기하지 않으면 한 표 안에서 어떤 행은 평균·어떤 행은 하한이라 비교가 성립하지 않는다. */
  /* W4-6 — `estimated` 표기.
     confidence 배지가 이미 'class/family/subfamily/derived' 라고 말하는 값에는 붙이지 않는다(중복 소음).
     문제는 배지가 **직접 증거**를 시사하는데(measured) 값은 추정인 경우다 — 예: 벤더 견적 기반 가격.
     실측 19건이 여기 해당하고, 계열 폴백에 handbook 이 붙어 있던 80건은 빌드에서 이미 등급을 맞췄다. */
  const isEstimated = !!(range as { estimated?: boolean })?.estimated && (conf === 'measured' || conf === 'handbook');
  const isSpecFloor = (range as { basis?: string })?.basis === 'min_spec';
  const isNearMin = !!(range as { near_min_spec?: boolean })?.near_min_spec;
  /* 인용은 두 경로로 들어온다: min-spec 표 매칭은 basis_source(규격명), 교정 경로는
     provenance("교정: AMS 5662 RT 최소 …"). 둘 중 있는 것을 쓴다 — 인용 없는 floor 는 없어야 한다. */
  const specFloorSrc = (range as { basis_source?: string })?.basis_source ?? prov;
  const specFloorNote = (range as { basis_note?: string })?.basis_note;
  const specFloorVerified = (range as { basis_verified?: string })?.basis_verified;
  // R48c — price 표시는 formatPrice 사용 — typical 만 항상 평가. range min/max 는 hasRange 조건 안에서만
  //        (이전: range null 인 5 flat-only properties 클릭 시 range!.min eager 평가로 crash).
  const typicalStr = isPrice && sys ? formatPrice(typical, lang, sys, priceUnit) : `${fmt(disp(typical))}`;
  /* R204 #3 — Cost/Difficulty factor (unit=×) 의 directness 라벨.
     Machining/HT factor → 어려움 등급, Condition/Form/Grade × → 가격(premium) 등급. */
  const isFactorRow = unit === '×' && typeof typical === 'number';
  /* AUD F03 (2026-09-22) — range.scale 이 있으면 그 스케일이 표시 단위다 (예: 순알루미늄 소둔 HB 23 — E140 표 밖이라 HV 로 환산하지 않음).
     환산된 값(scale HV + source_scale)은 단위는 HV 그대로, 툴팁에 "HB 95 → HV 111 (ASTM E140-12b Table 9)" 를 보인다. */
  const hs = range as { scale?: string; source_scale?: string; source_value?: number; conversion?: string | null; scale_note?: string } | undefined;
  const scaleUnit = hs?.scale && hs.scale !== 'HV' && unit === 'HV' ? hs.scale : dispUnit;
  const hardnessScaleTip = unit === 'HV' && hs?.source_scale
    ? (hs.conversion
      ? (en ? `Source ${hs.source_scale} ${hs.source_value} → HV ${typical} (${hs.conversion})` : `원자료 ${hs.source_scale} ${hs.source_value} → HV ${typical} (${hs.conversion})`)
      : (en ? `Source ${hs.source_scale} ${hs.source_value} — ${hs.scale_note || 'no conversion table; shown in the original scale'}` : `원자료 ${hs.source_scale} ${hs.source_value} — ${hs.scale_note || '환산표 없음, 원 스케일 표기'}`))
    : undefined;
  const isDifficultyFactor = /machining|ht factor|machinability|wear/i.test(label);
  const factorBadge = isFactorRow ? factorDifficultyLabel(typical as number, isDifficultyFactor ? 'difficulty' : 'price', lang) : null;
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground pt-0.5 flex items-center gap-1">
        {/* R202 #2 — confidence dot (한 눈에 신뢰도 식별) */}
        {badge && (
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${badge.dot} flex-shrink-0`}
            title={prov ? `${badge.tip}\n${en ? 'Source' : '출처'}: ${prov}` : badge.tip}
          />
        )}
        {/* W4-5 — 대응 용어가 있으면 라벨을 글로서리로 연결. 없으면 그냥 텍스트(억지 링크 금지). */}
        {termSlug ? (
          <Link
            href={`/guide/term/${termSlug}`}
            className="border-b border-dotted border-muted-foreground/50 hover:text-accent hover:border-accent"
            title={en ? `What '${label}' means — open the glossary entry` : `'${label}' 이(가) 무엇인지 — 용어 설명 보기`}
          >{shownLabel}</Link>
        ) : shownLabel}
      </span>
      <div className="text-right">
        <span className="font-mono text-xs font-medium text-foreground">{typicalStr}</span>
        {/* AUD F03 — 경도 스케일: 환산되지 않은 원 스케일(HB 등)은 그 스케일로 표기하고, 환산된 HV 는 툴팁에 원자료·표를 남긴다. */}
        {!isPrice && <span className="text-muted-foreground font-normal text-[11px]" title={hardnessScaleTip}> {scaleUnit}</span>}
        {/* R204 #3 — factor directness 라벨 (×값 옆) */}
        {factorBadge && (
          <span className={`ml-1.5 text-[10px] font-medium ${factorBadge.color}`} title={`${factorBadge.label} (값 ${typical?.toFixed?.(2)} ×, 1.0=표준/보통 기준)`}>
            {factorBadge.label}
          </span>
        )}
        {badge && !isFactorRow && (
          <span className={`ml-1 text-[10px] ${badge.cls}`} title={prov ? `${badge.tip}\n${en ? 'Source' : '출처'}: ${prov}` : badge.tip}>{badge.label}</span>
        )}
        {/* W4-6 — 출처는 실재하지만 값은 추정 (배지가 직접 증거를 시사할 때만) */}
        {isEstimated && (
          <span
            className="ml-1 text-[10px] px-1 py-px rounded bg-amber-100 text-amber-800 border border-amber-300 font-medium"
            title={`${en ? 'Estimated — a source exists but this is not a direct measurement.' : '추정값 — 출처는 있으나 직접 측정치가 아닙니다.'}${prov ? `
${en ? 'Basis' : '근거'}: ${prov}` : ''}`}
          >
            {en ? 'est.' : '추정'}
          </span>
        )}
        {/* E4 — 이 값 자체가 규격 하한임을 명시 (평균값 행과 섞이지 않도록) */}
        {isSpecFloor && (
          <span
            className="ml-1 text-[10px] px-1 py-px rounded bg-sky-100 text-sky-800 border border-sky-300 font-medium"
            title={en
              ? `This value is the **specification minimum (floor)**, not an average.${specFloorSrc ? `
Standard: ${specFloorSrc}` : ''}${specFloorNote ? `
Checked: ${specFloorNote}` : ''}${specFloorVerified ? ` (${specFloorVerified})` : ''}

Real material is usually higher. Do not compare it directly with typical rows — for safety-critical design this floor is the right value.`
              : `이 값은 평균이 아니라 **규격 보증 최소값(floor)** 입니다.${specFloorSrc ? `
근거 규격: ${specFloorSrc}` : ''}${specFloorNote ? `
원문 대조: ${specFloorNote}` : ''}${specFloorVerified ? ` (${specFloorVerified})` : ''}

실제 재료는 대개 이보다 높습니다. 평균값 행과 직접 비교하지 마세요 — 안전 임계 설계에는 이 값을 쓰는 것이 맞습니다.`}
          >
            spec min
          </span>
        )}
        {/* R139b + AUD-3 D04 — 인용 규격의 최소값을 **별도 축**으로 병기한다(표시값의 성격을 바꾸지 않는다).
            표시값이 그 최소값과 거의 같으면(±2%, near_min_spec) "대표값인지 하한인지 출처 확인" 이라고 밝힌다 —
            예전에는 이 근접만 보고 basis='min_spec'(=이 값이 곧 보증 최소)으로 단정했다. */}
        {minSpec != null && typeof typical === 'number' && (
          <span
            className={`ml-1 text-[10px] font-medium ${isNearMin ? 'text-amber-700' : 'text-muted-foreground'}`}
            data-testid="min-spec-value"
            title={`${en ? 'Displayed value' : '표시값'}: ${fmt(disp(typical))} ${dispUnit}\n${en ? 'Specification minimum' : '규격 최소값'}: ${fmt(disp(minSpec))} ${dispUnit}${minSpecSrc ? ` (${minSpecSrc})` : ''}\n\n${isNearMin
              ? (en
                ? 'The displayed value is within 2% of the cited minimum — it may be the specification floor rather than a typical value. Check the source for product form, thickness, heat treatment and test direction.'
                : '표시값이 인용 규격의 최소값과 2% 이내입니다 — 대표값이 아니라 규격 하한일 수 있습니다. 제품 형태·두께·열처리·시험 방향을 출처에서 확인하세요.')
              : (en
                ? 'Typical value shown; the standard guarantees at least the minimum. Use the minimum for safety-critical design.'
                : '표시값은 대표값이고, 규격이 보증하는 것은 최소값입니다. 안전 임계 설계에는 최소값을 쓰세요.')}`}
          >
            {en ? 'spec min' : '규격최소'} {fmt(disp(minSpec))}{isNearMin ? ' ≈' : ''}
          </span>
        )}
        {hasRange && range && (
          <div className="text-[10px] font-mono text-muted-foreground/70 leading-tight">
            {isPrice && sys ? formatPrice(range.min, lang, sys, priceUnit) : fmt(disp(range.min))}
            –
            {isPrice && sys ? formatPrice(range.max, lang, sys, priceUnit) : fmt(disp(range.max))}
          </div>
        )}
      </div>
    </div>
  );
}
