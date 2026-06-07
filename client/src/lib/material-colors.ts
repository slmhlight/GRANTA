/*
 * 재료 분류별 색상 — 차트의 외피 색상과 모든 UI(테이블 행 닷, Compare 닷, 카드 액센트,
 * 상세 헤더 보더)에서 동일하게 쓰이는 단일 진실 소스. 비슷한 클래스끼리는 비슷한
 * hue 를 유지하도록 의도적으로 배치.
 */
import type { Material } from './materials';

// 순서 중요: CSV 데이터의 subcategory 가 잘못 입력된 경우(예: Inconel 100 의 subcategory 가
// "Aluminum - Pure/Other"로 잘못 들어가 있음)를 우회하기 위해 BRAND/구체적인 키워드를
// 일반적인 "alumin" 같은 패턴보다 먼저 검사. Polymer / Ceramic / Composite 은 category 기반
// (R101: name regex 가 "Alumina" 를 "alumin" 으로 잘못 매칭해 Aluminum family 로 분류된 버그 fix).
export const CLASSES: Array<{ key: string; color: string; test: (s: string, cat: string) => boolean }> = [
  { key: 'Polymer', color: '#16A34A', test: (_s, cat) => cat === 'Polymer' },
  /* R179 — Ceramic color: #0EA5E9 (sky) → #DC2626 (red-600). 사용자 지적: Al 과 너무 비슷.
   *        Ceramic = ceramic kiln fire imagery. distinct from Al/Cu/Ti family. */
  { key: 'Ceramic', color: '#DC2626', test: (_s, cat) => cat === 'Ceramic' },
  { key: 'Composite', color: '#A855F7', test: (_s, cat) => cat === 'Composite' },
  { key: 'Nickel', color: '#8B5CF6', test: (s) => /\bnickel\b|inconel|hastelloy|haynes|monel|\binvar\b|kovar|cm247|nimonic|waspaloy|\brene\b|nitinol|incoloy|udimet|cp-nickel|ni 200|a-?286|pyromet/.test(s) },
  { key: 'Cobalt', color: '#EC4899', test: (s) => /cobalt|cocr|stellite|mp35n|elgiloy|haynes 188|haynes 25|l-?605/.test(s) },
  /* R179 — Titanium regex 에 zirconium / zircaloy / hafnium 추가 (group 4 transition metal, chemistry 유사). */
  { key: 'Titanium', color: '#06B6D4', test: (s) => /\btitan|\bti\b|ti6|ti-6|ti5|ti cp|ti6242|ta15|\bbeta-2|zirconium|zircaloy|zr-?2|\bhafnium\b|\bhf\b/.test(s) },
  /* R179 — Refractory regex 에 beryllium / vanadium / chromium 추가. */
  { key: 'Refractory', color: '#475569', test: (s) => /refract|tungsten|tantal|niobium|molybden|c-103|rhenium|\bnb\b|\btzm\b|beryllium|\bvanadium\b|pure cr|pure chromium/.test(s) },
  { key: 'Copper', color: '#D97706', test: (s) => /\bcopper\b|bronze|brass|cuni|cucr|grcop|beryllium copper|becu|\bcu\b|c1\d{4}|c2\d{4}|c3\d{4}|c4\d{4}|c5\d{4}|c6\d{4}|c7\d{4}|c8\d{4}|c9\d{4}|narloy/.test(s) },
  /* R180 — Magnesium regex 매우 specific 화. 이전 \bmg\b 가 'Al-Mg-Si' 같은 composition string 의 'Mg' 매칭 →
   *        AA 5xxx/6xxx 의 family color 오류 (R180 user 지적). Fix: Mg alloy designation 또는 'magnesium' 단어만. */
  { key: 'Magnesium', color: '#0D9488', test: (s) => /\bmagnes|^az\d|^we\d|^zk\d|^am[\s-]?\d|^ez33|^hk31|^elektron|^zamak|magnesium alloy|mg alloy/.test(s) },
  { key: 'Steel', color: '#3B82F6', test: (s) => /steel|maraging|stainless|aisi|aheadd|superduplex|duplex|chromoly|42crmo|20mncr|\biron\b|sus\d|sncm|scm\d|s45c|sm\d{2}c|sphc|saph|spfh|astm a\d|api 5l|\bsteel\b/.test(s) },
  { key: 'Aluminum', color: '#F59E0B', test: (s) => /alumin(?!a)|\bal\b|aa\s*\d|alsi|a356|a357|a360|a380|a413|scalmalloy|a205|a20x|a356-rs|\bautoaa|6xxx|7xxx|2xxx|5xxx/.test(s) },
];

export function classOf(m: Material): { key: string; color: string } {
  const s = `${m.subcategory || ''} ${m.name || ''}`.toLowerCase();
  for (const c of CLASSES) if (c.test(s, m.category)) return { key: c.key, color: c.color };
  return { key: 'Other', color: '#94A3B8' };
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
