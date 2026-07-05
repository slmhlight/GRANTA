/*
 * R226j/C6 — 공정 가이드 해석기 (Material ID 기반 — 런타임 regex 없음).
 *
 * 빌드(build-from-registry)가 stable_id 로 스탬프한 material.profiles 를 콘텐츠 SSOT
 * (data/process-profiles.json · machining-guidance.json · selection-insights.json) 와 조합해
 * 절삭성/조건 노트/가공 가이드/선택 인사이트를 순수 조회로 반환한다.
 * 분류 오류의 교정은 data/process-profile-overrides.json (stable_id + src) → pnpm build:profiles.
 */
import type { Material } from '@/lib/materials';
import profilesData from '../../../data/process-profiles.json';
import guidanceData from '../../../data/machining-guidance.json';
import insightsData from '../../../data/selection-insights.json';
import htGuidanceData from '../../../data/ht-guidance.json';
import weldGuidanceData from '../../../data/welding-guidance.json';

export interface MachinabilityResult {
  rating: number;
  band: 'easy' | 'normal' | 'hard' | 'very_hard';
  label: string;
  note: string;
  /** R226r — 조건(HT)별 보정이 적용됐으면 true + base(연질) rating 병기. */
  conditionAdjusted?: boolean;
  baseRating?: number;
  htc?: string;
}
export interface PolymerMachResult {
  band: 'easy' | 'normal' | 'hard';
  label: string;
  note: string;
}
export interface InsightPick { when: string; use: string; why: string }
export interface InsightGroup { title: string; intro: string; picks: InsightPick[]; sources: string[] }

const METAL_MACH = (profilesData as any).machinability.metal as Record<string, { rating: number; band: MachinabilityResult['band']; label: string; note: string; guidance_key?: string }>;
/* R226r — 조건(HT)별 절삭성 보정 (process-profiles.json.machinability.condition_adjust). */
const COND_ADJ = (profilesData as any).machinability.condition_adjust as {
  rating_mult: Record<string, number>; cost_mult: Record<string, number>;
  band_thresholds: { easy: number; normal: number; hard: number }; ferrous_hardening: string[];
  hardness_ref_hv?: Record<string, number>; hardness_floor?: number;
};
const FERROUS_HARDENING = new Set(COND_ADJ.ferrous_hardening);
const BAND_LABEL: Record<MachinabilityResult['band'], string> = { easy: '우수', normal: '보통', hard: '어려움', very_hard: '매우 어려움' };
function bandForRating(r: number): MachinabilityResult['band'] {
  const t = COND_ADJ.band_thresholds;
  return r >= t.easy ? 'easy' : r >= t.normal ? 'normal' : r >= t.hard ? 'hard' : 'very_hard';
}
/** 절삭성 조건(HT) 보정 배율 — ferrous 경화군 + htc 스탬프일 때만 적용. rating(곱)·cost(역보정). */
export function machinabilityConditionMult(m: Material): { rating: number; cost: number; applies: boolean; htc?: string } {
  const key = m.profiles?.mach; const htc = m.profiles?.htc;
  if (!key || !htc || !FERROUS_HARDENING.has(key)) return { rating: 1, cost: 1, applies: false, htc };
  let rating = COND_ADJ.rating_mult[htc] ?? 1;
  const cost = COND_ADJ.cost_mult[htc] ?? 1;
  // R226r-2 — 경화 클래스 내 조건별 경도 편차 반영: 클래스 대표경도(ref_hv)보다 단단한 entry 만 추가 감산
  //   (더 연하거나 경도 데이터 부실 시 factor=1 → class base 유지, 오값 회피). H900 vs H1150 등 구분.
  const ref = COND_ADJ.hardness_ref_hv?.[htc];
  const hv = m.ranges?.hardness?.typical;
  if (ref && typeof hv === 'number' && hv > 0) {
    const factor = Math.min(1, ref / hv);
    rating = Math.max(COND_ADJ.hardness_floor ?? 0.42, rating * factor);
  }
  return { rating, cost, applies: rating !== 1 || cost !== 1, htc };
}
const POLYMER_MACH = (profilesData as any).machinability.polymer as Record<string, PolymerMachResult>;
const CONDITION_NOTES = (profilesData as any).condition_notes as Record<string, string>;
const MACH_SOURCES = (profilesData as any).machinability.sources as { metal: string[]; polymer: string[] };
const GUIDANCE = (guidanceData as any).guidance as Record<string, string>;
const INSIGHT_GROUPS = (insightsData as any).groups as Record<string, InsightGroup>;

/** R226o — 인사이트(용도) 그룹의 짧은 라벨 — 배지·비교용 (긴 title 대신). key = m.profiles.insight. */
export const INSIGHT_GROUP_LABEL: Record<string, string> = {
  'structural-steel': '구조용 강', 'carbon-alloy-steel': '탄소·합금강', 'stainless': '스테인리스',
  'stainless-highperf': '고성능 스테인리스', 'aluminum': '알루미늄', 'titanium': '티타늄',
  'ni-superalloy': 'Ni 초내열합금', 'cobalt': '코발트 합금', 'copper': '구리 합금',
  'magnesium': '마그네슘', 'tool-steel': '공구강', 'refractory': '내화금속',
  'pol-highperf': '고성능 폴리머', 'pol-engineering': '엔지니어링 폴리머', 'pol-commodity': '범용 폴리머',
  'pol-elastomer': '탄성체', 'pol-fluoro': '불소수지',
  ceramic: '구조 세라믹', composite: '복합재',
};
export const insightGroupLabel = (key?: string | null): string | null => (key ? (INSIGHT_GROUP_LABEL[key] ?? null) : null);

/** 금속 절삭성 — m.profiles.mach 조회 (프로파일 없으면 null = 카드 미표시).
 *  R226r — 열처리(조건)별 보정: 같은 합금이라도 어닐 vs 경화(Q&T/시효/냉간) 로 가공성이 크게 달라짐.
 *  ferrous 경화군은 htc(빌드 스탬프)로 rating 을 보정(연질 base × 배율) + band 재산출. name-regex 없음. */
export function resolveMachinability(m: Material): MachinabilityResult | null {
  if (m.category !== 'Metal') return null;
  const key = m.profiles?.mach;
  if (!key) return null;
  const p = METAL_MACH[key];
  if (!p) return null;
  const adj = machinabilityConditionMult(m);
  if (!adj.applies || adj.rating === 1) return { rating: p.rating, band: p.band, label: p.label, note: p.note };
  const rating = Math.max(3, Math.round(p.rating * adj.rating));
  const band = bandForRating(rating);
  return { rating, band, label: BAND_LABEL[band], note: p.note, conditionAdjusted: true, baseRating: p.rating, htc: adj.htc };
}

/** 폴리머 절삭성 (정성) — 전 폴리머가 빌드에서 클래스 할당됨. */
export function resolvePolymerMachinability(m: Material): PolymerMachResult | null {
  if (m.category !== 'Polymer') return null;
  const key = m.profiles?.mach;
  if (!key) return null;
  const p = POLYMER_MACH[key];
  return p ? { band: p.band, label: p.label, note: p.note } : null;
}

/** 조건(variation)별 가공 노트 — 같은 합금이라도 HT 조건 entry 마다 다른 안내. */
export function resolveConditionNote(m: Material): string | null {
  const mach = m.profiles?.mach;
  const htc = m.profiles?.htc;
  if (!mach || !htc) return null;
  return CONDITION_NOTES[`${mach}|${htc}`] || null;
}

/** 가족별 가공 주의사항/권장 방법 (구 R176 인라인 — machining-guidance.json). */
export function resolveMachiningGuidance(m: Material): string | null {
  const key = m.profiles?.mach;
  if (!key) return null;
  const gk = METAL_MACH[key]?.guidance_key;
  return (gk && GUIDANCE[gk]) || null;
}

/** 절삭성 출처 라벨 (카테고리별). */
export function machinabilitySources(m: Material): string[] {
  return m.category === 'Polymer' ? MACH_SOURCES.polymer : MACH_SOURCES.metal;
}

interface GuidanceBlock { pattern: string; field: string; nonferrous_only?: boolean; text: string }
const HT_GUIDANCE = (htGuidanceData as any).blocks as Record<string, GuidanceBlock>;
const WELD_GUIDANCE = (weldGuidanceData as any).blocks as Record<string, GuidanceBlock>;

/** HT 주의사항 가이드 (R226k) — name-키(m.profiles.htg) + 조건 클래스(hip/case) 블록의 배열.
 *  구 인라인에서는 매칭 블록이 모두 연결 표시됐던 의미를 배열로 보존 (예: Ti STA + HIP). */
/* R226w — AM(적층제조) 후처리 가이드. AM 판정은 구조 필드(process/processes)만 사용 — name regex 없음.
 * family 는 빌드 스탬프 조회: profiles.ht 접두(am_map.byHt) 우선, 없으면 profiles.mach(am_map.byMach). */
const AM_MAP = (htGuidanceData as any).am_map as { byHt: Record<string, string>; byMach: Record<string, string> } | undefined;
const AM_PROC_RE = /lpbf|dmls|slm\b|ebm|binder|waam|\bded\b|direct energy|directed energy/i;
export function isAmProcess(m: Material): boolean {
  return AM_PROC_RE.test(m.process || '') || (m.processes || []).some((p) => AM_PROC_RE.test(p));
}
function amGuidanceKey(m: Material): string | null {
  if (!AM_MAP || m.category !== 'Metal' || !isAmProcess(m)) return null;
  const ht = m.profiles?.ht;
  if (ht) for (const [prefix, key] of Object.entries(AM_MAP.byHt)) if (ht.startsWith(prefix)) return key;
  const mach = m.profiles?.mach;
  return (mach && AM_MAP.byMach[mach]) || null;
}

export function resolveHtGuidanceTexts(m: Material): string[] {
  const out: string[] = [];
  const amKey = amGuidanceKey(m);
  if (amKey && HT_GUIDANCE[amKey]) out.push(HT_GUIDANCE[amKey].text);   // AM 후처리 우선 (as-built 사용자에게 가장 유효)
  const htg = m.profiles?.htg;
  if (htg && HT_GUIDANCE[htg]) out.push(HT_GUIDANCE[htg].text);
  const htc = m.profiles?.htc;
  if (htc === 'hip' && HT_GUIDANCE['hip']) out.push(HT_GUIDANCE['hip'].text);
  if (htc === 'case' && HT_GUIDANCE['case']) out.push(HT_GUIDANCE['case'].text);
  return out;
}

/** 합금별 용접 권고 (R226k) — m.profiles.wg 조회. nonferrous_only 블록은 CE 지표가 없을 때만
 *  (구 !weldWorst 가드 의미 보존 — CE 강은 정량 지표+권고절차가 이미 표시됨). */
export function resolveWeldGuidance(m: Material, hasCeMetrics: boolean): string | null {
  const wg = m.profiles?.wg;
  if (!wg) return null;
  const b = WELD_GUIDANCE[wg];
  if (!b) return null;
  if (b.nonferrous_only && hasCeMetrics) return null;
  return b.text;
}

/** R226r — 용접 조건(HT) 노트: 용접성 rating 은 조성기반(조건무관)이나, 경화/시효/냉간 상태는
 *  HAZ 연화를 유발 → htc(빌드 스탬프) 기준 HAZ 주의 노트. soft/hip/as-built 는 null. name-regex 없음. */
const WELD_COND_NOTES = (profilesData as any).weld_condition_notes as Record<string, string>;
export function resolveWeldConditionNote(m: Material): string | null {
  if (m.category !== 'Metal') return null;
  const htc = m.profiles?.htc;
  if (!htc) return null;
  return WELD_COND_NOTES[htc] || null;
}

/** 재료 선택 인사이트 그룹 (E9 — when-to-use). */
export function resolveInsights(m: Material): InsightGroup | null {
  const key = m.profiles?.insight;
  if (!key) return null;
  return INSIGHT_GROUPS[key] || null;
}

/** 현재 재료가 인사이트 pick 의 대표 지정명에 해당하는지 (강조용 — 표시 전용). */
export function insightPickMatches(m: Material, pick: InsightPick): boolean {
  const hay = `${m.name} ${(m.aliases || []).join(' ')}`.toLowerCase();
  return pick.use.split(/[/·()]| 또는 /).some(tok => {
    const t = tok.trim().toLowerCase();
    return t.length >= 2 && hay.includes(t);
  });
}
