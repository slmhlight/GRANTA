/*
 * H6 E15 — Corrosion(부식) 카드 해석기.
 *
 * 패턴은 coatings.ts(R226s) 미러:
 *  - "이 재료의 부식 성격/취약 모드"는 data/corrosion-guidance.json(그룹 24종 SSOT)이 담당,
 *  - 재료→그룹 매핑은 빌드 스탬프 m.profiles.corr (Material ID 기반 — 런타임 regex 0),
 *  - 조건 보정(PH 최고강도 시효 SCC·AM as-built 공식 기점)은 condition_mods.
 * 역할 분리: 이 카드 = 성격/취약 모드 · 코팅 카드 = 표면 대책 (상호참조).
 *
 * PREN(공식 저항 당량, Cr+3.3Mo+16N)은 조성에서 계산 — 스테인리스 도메인(Cr≥10.5%)에만 의미.
 * N 결측 시 0 가정 = 하한값 (질소강 과소평가 가능 — 라벨에 명시).
 *
 * 단일 등급(corrosion_resistance)이 모드별 취약(Cl-SCC·공식·입계)을 가리지 않도록
 * 카드가 모드 캐비엇을 항상 병기한다. 일반 관행 요약 — 설계 검증 대체 불가.
 */
import type { Material } from './materials';
import { parseCompositionRange, getRangeValue } from './composition-parser';
import guidanceData from '../../../data/corrosion-guidance.json';

export interface CorrosionMedia { env: string; verdict: 'excellent' | 'good' | 'caution' | 'poor'; note: string }
export interface CorrosionMode { mode: string; risk: 'high' | 'med' | 'low'; note: string }
export interface CorrosionGroup {
  title: string;
  intro: string;
  media: CorrosionMedia[];
  modes: CorrosionMode[];
  caution?: string;
  sources: string[];
}

const GROUPS = (guidanceData as any).groups as Record<string, CorrosionGroup>;
const MODS = (guidanceData as any).condition_mods as Record<string, { corr?: string; htc?: string; text: string }>;
/* H6 E15c/E15f — 개별 합금 1줄 노트 + 노트별 출처 (base-키 exact 조회 — 이 합금만의 특징적 주의사항). */
export interface AlloyNote { t: string; src: string }
const ALLOY_NOTES = (guidanceData as any).alloy_notes as Record<string, AlloyNote>;
export const CORROSION_TOP_SOURCES: string[] = (guidanceData as any).sources || [];

/** PREN 해석 밴드 — 관행적 사용 등급 (Outokumpu/IMOA 계열 밴딩, 개략). */
export function prenBand(v: number): string {
  if (v >= 40) return '상시 침지·초내식 급';
  if (v >= 30) return '해수·공정수 급';
  if (v >= 20) return '연안·간헐 염화물 급';
  return '담수·경부식 급';
}

/** 개별 합금 노트 — base(— 앞) exact → 괄호 제거형 exact 순 조회. 런타임 regex 없음. */
export function alloyNoteFor(name: string): AlloyNote | null {
  const base = String(name).split(' — ')[0].trim();
  return ALLOY_NOTES[base] ?? ALLOY_NOTES[base.split(' (')[0].trim()] ?? null;
}

/** 조성 문자열/숫자 → 대표값 (범위는 중앙값, 'balance'는 null — PREN 원소는 balance 아님). */
function elemVal(comp: Material['composition'], el: string): number | null {
  if (!comp || typeof comp !== 'object' || Array.isArray(comp)) return null;
  const v = (comp as Record<string, unknown>)[el];
  if (v == null || v === '' || String(v) === 'balance') return null;
  if (typeof v === 'number') return v;
  return getRangeValue(parseCompositionRange(String(v)));
}

export interface PrenResult { value: number; nMissing: boolean }

/** PREN = Cr + 3.3·Mo + 16·N — 스테인리스(Cr≥10.5%)에만 의미 있어 그 외 null. */
export function prenOf(m: Material): PrenResult | null {
  const cr = elemVal(m.composition, 'Cr');
  if (cr == null || cr < 10.5) return null;
  const mo = elemVal(m.composition, 'Mo') ?? 0;
  const n = elemVal(m.composition, 'N');
  return { value: Math.round((cr + 3.3 * mo + 16 * (n ?? 0)) * 10) / 10, nMissing: n == null };
}

export interface CorrosionPlan {
  groupKey: string;
  group: CorrosionGroup;
  /** 종합 등급 (빌드 스탬프 corrosion_resistance — 표시용, 모드 캐비엇과 병기). */
  rating: string | null;
  pren: PrenResult | null;
  /** H6 E15c/E15f — 이 합금만의 특징적 주의사항 + 개별 출처 (base-키 조회). */
  alloyNote: AlloyNote | null;
  /** 조건 보정 노트 (해당 시). */
  conditionNotes: string[];
}

/** m.profiles.corr → 그룹 콘텐츠 + PREN + 조건 보정. 미스탬프(Composite 등)면 null → 카드 생략. */
export function resolveCorrosionPlan(m: Material): CorrosionPlan | null {
  const key = (m.profiles as { corr?: string } | undefined)?.corr;
  if (!key) return null;
  const group = GROUPS[key];
  if (!group) return null;   // 게이트가 빌드에서 차단하므로 도달 불가 — 방어
  const htc = (m.profiles as { htc?: string } | undefined)?.htc;
  const conditionNotes: string[] = [];
  for (const mod of Object.values(MODS)) {
    if (mod.corr && mod.corr !== key) continue;
    if (mod.htc && mod.htc !== htc) continue;
    if (!mod.corr && !mod.htc) continue;
    conditionNotes.push(mod.text);
  }
  return {
    groupKey: key,
    group,
    rating: (m as Material & { corrosion_resistance?: string }).corrosion_resistance ?? null,
    pren: prenOf(m),
    alloyNote: alloyNoteFor(m.name),
    conditionNotes,
  };
}

export const VERDICT_LABEL: Record<CorrosionMedia['verdict'], { label: string; cls: string }> = {
  excellent: { label: '탁월', cls: 'text-emerald-700' },
  good: { label: '양호', cls: 'text-emerald-600' },
  caution: { label: '주의', cls: 'text-amber-700' },
  poor: { label: '부적합', cls: 'text-rose-700' },
};
export const RISK_LABEL: Record<CorrosionMode['risk'], { label: string; cls: string }> = {
  high: { label: '높음', cls: 'text-rose-700' },
  med: { label: '중간', cls: 'text-amber-700' },
  low: { label: '낮음', cls: 'text-emerald-700' },
};
