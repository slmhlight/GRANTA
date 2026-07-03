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
}
export interface PolymerMachResult {
  band: 'easy' | 'normal' | 'hard';
  label: string;
  note: string;
}
export interface InsightPick { when: string; use: string; why: string }
export interface InsightGroup { title: string; intro: string; picks: InsightPick[]; sources: string[] }

const METAL_MACH = (profilesData as any).machinability.metal as Record<string, { rating: number; band: MachinabilityResult['band']; label: string; note: string; guidance_key?: string }>;
const POLYMER_MACH = (profilesData as any).machinability.polymer as Record<string, PolymerMachResult>;
const CONDITION_NOTES = (profilesData as any).condition_notes as Record<string, string>;
const MACH_SOURCES = (profilesData as any).machinability.sources as { metal: string[]; polymer: string[] };
const GUIDANCE = (guidanceData as any).guidance as Record<string, string>;
const INSIGHT_GROUPS = (insightsData as any).groups as Record<string, InsightGroup>;

/** 금속 절삭성 — m.profiles.mach 조회 (프로파일 없으면 null = 카드 미표시). */
export function resolveMachinability(m: Material): MachinabilityResult | null {
  if (m.category !== 'Metal') return null;
  const key = m.profiles?.mach;
  if (!key) return null;
  const p = METAL_MACH[key];
  if (!p) return null;
  return { rating: p.rating, band: p.band, label: p.label, note: p.note };
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
export function resolveHtGuidanceTexts(m: Material): string[] {
  const out: string[] = [];
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
