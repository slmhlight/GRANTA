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
/* H6 E15i — 합금별 매체 verdict 보정층: ① PREN 밴드(ss-* 염화물 축) ② 조성 임계 규칙 ③ base 오버라이드. */
interface AdjustRule { group: string; el: string; min?: number; max?: number; maxOther?: { el: string; max: number }; axes: Record<string, string>; why: string; src: string }
interface AdjustCfg {
  pren: { groups: string[]; src: string; axes: Record<string, [number, string][]> };
  rules: AdjustRule[];
  by_base: Record<string, { axes: Record<string, string>; why: string; src: string }>;
}
const ADJ = (guidanceData as any).alloy_adjust as AdjustCfg;
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

/** E15i — 보정 적용 후 매체 행: 그룹 기본과 다르면 adj 에 근거(원값·이유·출처) 기록. */
export interface ResolvedMedia extends CorrosionMedia {
  adj?: { from: CorrosionMedia['verdict']; why: string; src: string };
}

/** 그룹 media → ① PREN 밴드 → ② 조성 임계 규칙 → ③ base 오버라이드 순 적용 (후순위 우선). */
function resolveMedia(m: Material, groupKey: string, group: CorrosionGroup, pren: PrenResult | null): ResolvedMedia[] {
  const rows: ResolvedMedia[] = group.media.map((md) => ({ ...md }));
  const apply = (env: string, verdict: string, why: string, src: string) => {
    const row = rows.find((r) => r.env === env);
    if (!row) return;
    if (row.verdict === verdict) {
      // 후순위 레이어가 같은 verdict 재단언 — 더 구체적인 사유(by_base 등)로 근거만 갱신
      if (row.adj) row.adj = { from: row.adj.from, why, src };
      return;
    }
    row.adj = { from: row.adj?.from ?? row.verdict, why, src };
    row.verdict = verdict as CorrosionMedia['verdict'];
  };
  if (ADJ?.pren && pren && ADJ.pren.groups.includes(groupKey)) {
    for (const [env, bands] of Object.entries(ADJ.pren.axes)) {
      const hit = bands.find(([min]) => pren.value >= min);
      if (hit) apply(env, hit[1], `PREN ${pren.value}${pren.nMissing ? '(N=0 하한)' : ''} 밴드`, ADJ.pren.src);
    }
  }
  // 'balance' 원소는 100 − (타 원소 대표값 합) 으로 해석 (황동 Zn=balance 등 — composition-classifier 관례)
  const elemValB = (el: string): number => {
    const direct = elemVal(m.composition, el);
    if (direct != null) return direct;
    const comp = m.composition;
    if (!comp || typeof comp !== 'object' || Array.isArray(comp)) return 0;
    if (String((comp as Record<string, unknown>)[el] ?? '') !== 'balance') return 0;
    let others = 0;
    for (const [k, raw] of Object.entries(comp as Record<string, unknown>)) {
      if (k === el || raw == null || String(raw) === 'balance') continue;
      others += elemVal(comp, k) ?? 0;
    }
    return Math.max(0, 100 - others);
  };
  for (const rule of ADJ?.rules ?? []) {
    if (rule.group !== groupKey) continue;
    const v = elemValB(rule.el);
    if (rule.min != null && v < rule.min) continue;
    if (rule.max != null && v > rule.max) continue;
    if (rule.maxOther && elemValB(rule.maxOther.el) > rule.maxOther.max) continue;
    for (const [env, verdict] of Object.entries(rule.axes)) apply(env, verdict, rule.why, rule.src);
  }
  const base = String(m.name).split(' — ')[0].trim();
  const ov = ADJ?.by_base?.[base] ?? ADJ?.by_base?.[base.split(' (')[0].trim()];
  if (ov) for (const [env, verdict] of Object.entries(ov.axes)) apply(env, verdict, ov.why, ov.src);
  return rows;
}

export interface CorrosionPlan {
  groupKey: string;
  group: CorrosionGroup;
  /** 종합 등급 (빌드 스탬프 corrosion_resistance — 표시용, 모드 캐비엇과 병기). */
  rating: string | null;
  pren: PrenResult | null;
  /** H6 E15c/E15f — 이 합금만의 특징적 주의사항 + 개별 출처 (base-키 조회). */
  alloyNote: AlloyNote | null;
  /** E15i — 합금 보정 적용된 매체 표 (그룹 기본과 다른 축은 adj 에 원값·근거). */
  media: ResolvedMedia[];
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
  const pren = prenOf(m);
  return {
    groupKey: key,
    group,
    rating: (m as Material & { corrosion_resistance?: string }).corrosion_resistance ?? null,
    pren,
    alloyNote: alloyNoteFor(m.name),
    media: resolveMedia(m, key, group, pren),
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
