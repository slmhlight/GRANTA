/*
 * 공정 그룹 (Wrought / Molding / Casting / Powder / AM) — 필터 술어와 사이드바 count 의 **단일 정의**.
 *
 * 2026-09-20 F1 이전에는 같은 키워드 표가 세 벌 있었다(useMaterialFilter 본필터·leave-one-out 모집단·
 * FilterSidebar count). 표는 우연히 같았지만 **읽는 필드가 달랐다** — 필터는 `process`, 사이드바는
 * `processes[]`. 두 필드가 어긋난 entry(레지스트리 교정이 process 만 바꾼 2건)에서 count 가 필터 결과와
 * 1건씩 틀렸다(Wrought 752 vs 753 · Molding 118 vs 117). 정의가 하나면 이 부류는 생길 수 없다.
 *
 * R192/R193 — UI 옵션 5개 vs DB 44개 process 문자열: 키워드 부분일치. 'Sintered'/'Powder-Metallurgy' 는
 * AM 이 아니라 Powder(전통 press-and-sinter / MIM).
 */
import type { Material } from '@/lib/materials';

export interface ProcessGroup {
  name: string;
  /** 소문자 부분일치 키워드 — `m.process` 문자열에 대해 검사한다. */
  keywords: readonly string[];
  /** 사이드바 보조 설명. */
  description: string;
}

export const PROCESS_GROUPS: readonly ProcessGroup[] = [
  { name: 'Wrought', keywords: ['wrought', 'cold rolled', 'hot rolled', 'cold drawn', 'hot dip galvani', 'tmcp', 'forged', 'extrusion', 'vacuum refined', 'q+t (heat'], description: '(Forging, rolling, extrusion)' },
  { name: 'Molding', keywords: ['injection mold', 'compression mold', 'layup'], description: '(Injection, compression, layup)' },
  { name: 'Casting', keywords: ['cast'], description: '(Sand, die, investment)' },
  { name: 'Powder', keywords: ['sintered', 'powder-metallurgy', 'powder metallurgy', 'press-and-sinter', 'mim ', 'metal injection mold'], description: '(Sintered, MIM, press-and-sinter)' },
  { name: 'AM', keywords: ['lpbf', 'dmls', 'slm', 'sls', 'fdm', 'closed-cell foam', 'am ', 'am('], description: '(LPBF, DMLS, SLM, EBM, FDM, SLS)' },
];

export const PROCESS_GROUP_NAMES: readonly string[] = PROCESS_GROUPS.map((g) => g.name);

const BY_NAME = new Map(PROCESS_GROUPS.map((g) => [g.name, g.keywords]));

/** 재료가 그룹에 속하는가. 그룹명이 표에 없으면 process 문자열 정확일치로 폴백(구 동작 유지). */
export function matchesProcessGroup(m: Material, group: string): boolean {
  const p = String(m.process || '').toLowerCase();
  if (!p) return false;
  const keys = BY_NAME.get(group);
  if (!keys) return p === group.toLowerCase();
  return keys.some((k) => p.includes(k));
}

/** 선택 그룹 중 하나라도 속하면 통과(OR). 빈 선택은 호출부가 걸러야 한다. */
export function matchesAnyProcessGroup(m: Material, groups: readonly string[]): boolean {
  return groups.some((g) => matchesProcessGroup(m, g));
}
