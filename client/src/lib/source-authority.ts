/*
 * E3 (H6 W4-2) — 출처 권위 등급 공용 모듈.
 *
 * 등급 자체는 빌드가 매긴다(scripts/lib/source-labels.mjs · sourceAuthority).
 * 여기서는 그 등급을 **읽는 쪽**의 공통 어휘를 한 곳에 둔다 — 라벨·순서·술어.
 * SourcesList 안에만 있던 라벨 맵을 끌어낸 것이라, 사이드바가 두 번째 정의를 만들지 않는다.
 *
 * ## 원칙 8 — 구분 표시만, 은폐 금지
 * 이 필터는 **저신뢰 출처를 숨기는 장치가 아니다**. 아무것도 선택하지 않으면 전량이 보이고,
 * 선택은 "이 등급의 출처를 **가진** 재료"를 남기는 OR 조건이다(그 등급만 보여주는 게 아니다).
 * 재료 하나가 규격·제조사·애그리게이터 출처를 함께 갖는 게 정상이라, '최고 등급' 으로 거르면
 * 정보가 사라진다 — 실측상 전 재료의 최고 등급은 standard(876) 아니면 handbook(262) 뿐이라
 * 그 축으로는 필터가 아무 일도 하지 않는다.
 */
import type { Material, MaterialSource } from '@/lib/materials';

export type Authority = NonNullable<MaterialSource['authority']>;

/** 신뢰 강도 순. 정렬·'최고 등급' 판정이 이 순서를 쓴다. */
export const AUTHORITY_ORDER: readonly Authority[] = ['standard', 'handbook', 'manufacturer', 'aggregator', 'other'];

/** 라벨·색·설명 (SourcesList 배지와 사이드바 chip 이 같은 정의를 공유). */
export const AUTHORITY_META: Record<Authority, { s: string; cls: string; title: string }> = {
  standard: { s: '규격', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300', title: '공식 표준 (ASTM · ASME · SAE · JIS · EN · ISO · MIL 등)' },
  handbook: { s: '핸드북', cls: 'bg-sky-100 text-sky-700 border-sky-300', title: '권위 핸드북 (ASM Handbook · MMPDS · NASA · ECCC)' },
  manufacturer: { s: '제조사', cls: 'bg-slate-100 text-slate-600 border-slate-300', title: '제조사 datasheet' },
  aggregator: { s: 'DB', cls: 'bg-amber-100 text-amber-700 border-amber-300', title: '애그리게이터 2차 출처 (MatWeb · AZoM · MakeItFrom)' },
  other: { s: '기타', cls: 'bg-muted text-muted-foreground border-border/40', title: '인용 / 파생값 마커' },
};

/** 이 재료가 가진 출처 등급 집합. */
export function authorityGrades(m: Material): Set<Authority> {
  const out = new Set<Authority>();
  for (const s of m.sources ?? []) {
    const a = (s.authority ?? 'other') as Authority;
    if (AUTHORITY_ORDER.includes(a)) out.add(a);
  }
  return out;
}

/** 가장 높은 등급 (없으면 null). */
export function bestAuthority(m: Material): Authority | null {
  const g = authorityGrades(m);
  return AUTHORITY_ORDER.find((a) => g.has(a)) ?? null;
}

/** 정렬용 순위 — 작을수록 권위가 높다. 출처 없음은 맨 뒤. */
export function authorityRank(m: Material): number {
  const b = bestAuthority(m);
  return b === null ? AUTHORITY_ORDER.length : AUTHORITY_ORDER.indexOf(b);
}

/**
 * 필터 술어 — 선택된 등급 중 **하나라도 가진** 재료면 통과(OR).
 * 선택이 비면 전량 통과 — 기본이 은폐가 아니라 노출이다.
 */
export function matchesAuthority(m: Material, selected: readonly string[] | undefined): boolean {
  if (!selected || selected.length === 0) return true;
  const g = authorityGrades(m);
  return selected.some((s) => g.has(s as Authority));
}
