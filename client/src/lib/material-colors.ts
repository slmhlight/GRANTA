/*
 * 재료 분류별 색상 — 차트의 외피 색상과 모든 UI(테이블 행 닷, Compare 닷, 카드 액센트,
 * 상세 헤더 보더)에서 동일하게 쓰이는 단일 진실 소스. 비슷한 클래스끼리는 비슷한
 * hue 를 유지하도록 의도적으로 배치.
 */
import type { Material } from './materials';

/* R226p Phase 5b — family-color 분류를 **Material ID 기반**으로 전환: 런타임 name-regex 제거.
 * CLASSES 는 이제 순수 **데이터**(key·color·category|pattern) — pattern 은 빌드 분류기
 * (scripts/lib/color-classify.mjs)만 실행하고, 결과 key 를 `m.profiles.colorFamily` 로 스탬프한다.
 * 런타임 classOf 는 그 key 를 CLASS_COLOR 로 조회만 한다(정규식 미실행). 순서·색 완전 불변
 * (tests/color-family 가 stamp === 분류기 오라클 게이트).
 *
 * 순서 중요(빌드 분류기가 이 순서로 first-match): BRAND/구체 키워드를 일반 "alumin" 앞에.
 * Polymer/Ceramic/Composite 은 category 기반(R101: "Alumina"→"alumin" 오매칭 방지). */
export const CLASSES: Array<{ key: string; color: string; category?: string; pattern?: string }> = [
  { key: 'Polymer', color: '#16A34A', category: 'Polymer' },
  /* R179 — Ceramic color: #0EA5E9 (sky) → #DC2626 (red-600). 사용자 지적: Al 과 너무 비슷. */
  { key: 'Ceramic', color: '#DC2626', category: 'Ceramic' },
  { key: 'Composite', color: '#A855F7', category: 'Composite' },
  { key: 'Nickel', color: '#8B5CF6', pattern: '\\bnickel\\b|inconel|hastelloy|haynes|monel|\\binvar\\b|kovar|cm247|nimonic|waspaloy|\\brene\\b|nitinol|incoloy|udimet|cp-nickel|ni 200|a-?286|pyromet' },
  { key: 'Cobalt', color: '#EC4899', pattern: 'cobalt|cocr|stellite|mp35n|elgiloy|haynes 188|haynes 25|l-?605' },
  /* R179 — Titanium regex 에 zirconium / zircaloy / hafnium 추가 (group 4 transition metal). */
  { key: 'Titanium', color: '#06B6D4', pattern: '\\btitan|\\bti\\b|ti6|ti-6|ti5|ti cp|ti6242|ta15|\\bbeta-2|zirconium|zircaloy|zr-?2|\\bhafnium\\b|\\bhf\\b' },
  /* R179 — Refractory regex 에 beryllium / vanadium / chromium 추가. */
  { key: 'Refractory', color: '#475569', pattern: 'refract|tungsten|tantal|niobium|molybden|c-103|rhenium|\\bnb\\b|\\btzm\\b|beryllium|\\bvanadium\\b|pure cr|pure chromium' },
  { key: 'Copper', color: '#D97706', pattern: '\\bcopper\\b|bronze|brass|cuni|cucr|grcop|beryllium copper|becu|\\bcu\\b|c1\\d{4}|c2\\d{4}|c3\\d{4}|c4\\d{4}|c5\\d{4}|c6\\d{4}|c7\\d{4}|c8\\d{4}|c9\\d{4}|narloy' },
  /* R180 — Magnesium regex 매우 specific 화(\bmg\b 가 'Al-Mg-Si' 매칭하던 버그 fix). */
  { key: 'Magnesium', color: '#0D9488', pattern: '\\bmagnes|^az\\d|^we\\d|^zk\\d|^am[\\s-]?\\d|^ez33|^hk31|^elektron|^zamak|magnesium alloy|mg alloy' },
  { key: 'Steel', color: '#3B82F6', pattern: 'steel|maraging|stainless|aisi|aheadd|superduplex|duplex|chromoly|42crmo|20mncr|\\biron\\b|sus\\d|sncm|scm\\d|s45c|sm\\d{2}c|sphc|saph|spfh|astm a\\d|api 5l|\\bsteel\\b' },
  { key: 'Aluminum', color: '#F59E0B', pattern: 'alumin(?!a)|\\bal\\b|aa\\s*\\d|alsi|a356|a357|a360|a380|a413|scalmalloy|a205|a20x|a356-rs|\\bautoaa|6xxx|7xxx|2xxx|5xxx' },
];

/** color key → hex. CLASSES + 'Other' 폴백. */
export const CLASS_COLOR: Record<string, string> = {
  ...Object.fromEntries(CLASSES.map((c) => [c.key, c.color])),
  Other: '#94A3B8',
};

/** 재료 family 분류/색 — **빌드 스탬프**(m.profiles.colorFamily) 조회. 런타임 regex 없음. */
export function classOf(m: Material): { key: string; color: string } {
  const key = m.profiles?.colorFamily || 'Other';
  return { key, color: CLASS_COLOR[key] || CLASS_COLOR.Other };
}

/** 재료의 family 색 — UI 어디서나 일관되게 사용. 비어 있으면 회색 폴백. */
export const familyColor = (m: Material | null | undefined): string => (m ? classOf(m).color : '#94A3B8');

/* ────────────────────────────────────────────────────────────────────────
 * Property-group 팔레트 — Compare 막대·차트 라벨에서 비슷한 물성이 비슷한 색을 갖도록.
 * 그룹별 hue 는 의미 단위(역학·열·물리·비용·정성)로 묶음.
 * ─────────────────────────────────────────────────────────────────────── */
export const GROUP_COLORS: Record<string, string> = {
  mechanical: '#2563EB',  // 파랑 — 강도·연신율·탄성·경도·피로
  thermal: '#DC2626',     // 빨강 — 열전도·내열·열팽창
  physical: '#7C3AED',    // 보라 — 밀도·푸아송비·비열
  cost: '#D97706',        // 앰버 — 가격
  qualitative: '#059669', // 에메랄드 — 내식성·가공성·용접성·인기도
  chemical: '#475569',    // 슬레이트 — 조성
};

/** 물성 키 → 그룹별 색상. UI 컴포넌트가 PropertyMeta를 import 안 해도 쓸 수 있게 약간의 매핑 캐시. */
export const PROP_GROUP: Record<string, keyof typeof GROUP_COLORS> = {
  density: 'physical', poisson_ratio: 'physical', specific_heat: 'physical',
  yield_strength: 'mechanical', uts: 'mechanical', elongation: 'mechanical', modulus: 'mechanical', hardness: 'mechanical', fatigue_strength: 'mechanical', impact_strength: 'mechanical',
  thermal_conductivity: 'thermal', electrical_conductivity: 'thermal', max_service_temp: 'thermal', thermal_expansion: 'thermal', melting_point: 'thermal',
  price_per_kg: 'cost', price_per_cm3: 'cost',
  popularity: 'qualitative',
};

export const propColor = (key: string): string => GROUP_COLORS[PROP_GROUP[key] || 'mechanical'] || '#94A3B8';

/* ────────────────────────────────────────────────────────────────────────
 * R210 B5 — confidence 6단계 색/라벨/툴팁 단일 진실 소스.
 * 이전: RangeRow(tailwind class)·ComparePanel(hex)·MaterialDetail/Compare 범례에 각각 하드코딩
 *       → 한 곳만 바꾸면 범례가 어긋날 위험. hex == 해당 tailwind -500 값으로 일치 유지.
 * measured.label 은 RangeRow 에서 `n=N` 으로, derived.label/tip 은 property type 별로 override.
 * ─────────────────────────────────────────────────────────────────────── */
export type ConfidenceLevel = 'measured' | 'handbook' | 'subfamily' | 'family' | 'class' | 'derived';
export const CONFIDENCE_ORDER: ConfidenceLevel[] = ['measured', 'handbook', 'subfamily', 'family', 'class', 'derived'];
export const CONFIDENCE: Record<ConfidenceLevel, { hex: string; twDot: string; twText: string; label: string; labelEn: string; tip: string }> = {
  measured:  { hex: '#10b981', twDot: 'bg-emerald-500', twText: 'text-foreground/50', label: '실측',    labelEn: 'measured', tip: '실측 데이터 다수 (가장 신뢰)' },
  handbook:  { hex: '#0ea5e9', twDot: 'bg-sky-500',     twText: 'text-sky-600',       label: '핸드북',  labelEn: 'handbook', tip: '표준 데이터시트 기반 (개별 alloy 1차 자료)' },
  subfamily: { hex: '#3b82f6', twDot: 'bg-blue-500',    twText: 'text-blue-600',      label: 'sub-fam', labelEn: 'sub-fam',  tip: '3rd family typical (예: 스테인리스 austenitic / Al 7xxx 등 — 특정 subgroup)' },
  family:    { hex: '#06b6d4', twDot: 'bg-cyan-500',    twText: 'text-cyan-600',      label: 'family',  labelEn: 'family',   tip: '2nd family typical (예: 스테인리스 일반 / Al 일반 등 — group)' },
  class:     { hex: '#f59e0b', twDot: 'bg-amber-500',   twText: 'text-amber-600',     label: 'class',   labelEn: 'class',    tip: '1st family / category typical (예: Iron-based 일반 / Polymer 일반)' },
  derived:   { hex: '#f43f5e', twDot: 'bg-rose-500',    twText: 'text-rose-500',      label: '유도',    labelEn: 'derived',  tip: '다른 물성에서 유도된 값' },
};
