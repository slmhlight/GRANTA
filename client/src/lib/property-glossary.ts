/*
 * W4-5 (H6 W4) — 물성 라벨 → 글로서리 용어 연결 (라벨-slug 명시 매핑).
 *
 * 상세 패널의 물성 행은 "Yield Strength 205 MPa" 처럼 **이름과 숫자만** 보여준다.
 * 기계공학 1학년이 읽는 DB 인데(메모리: 글로서리 독자 기준), 그 이름이 무엇을 뜻하는지로
 * 가는 길이 없었다. 글로서리에는 이미 127 용어 · A4 문서가 다 있는데 연결만 없던 상태다.
 *
 * ## 매핑은 명시 테이블로만 한다
 * 이름이 비슷하다고 이어 붙이면 틀린다 — 실제로 퍼지 매칭을 해 보니
 * `thermal_conductivity` 가 `thermal-expansion` 에 걸렸다(둘은 완전히 다른 물성이다).
 * 그래서 손으로 확인한 쌍만 여기 적고, 게이트가 슬러그 실재를 검사한다.
 *
 * ## 없으면 링크하지 않는다
 * density·melting_point·specific_heat·poisson_ratio·max_service_temp·가격은 대응 용어가
 * 아직 없다. 억지로 근처 용어에 걸지 않고 **링크 없이 둔다** — 잘못된 설명으로 보내는 것보다 낫다.
 */

/** 물성 키 → 글로서리 슬러그. 손으로 확인한 쌍만. */
export const PROPERTY_TERM: Readonly<Record<string, string>> = {
  yield_strength: 'yield-strength',
  uts: 'tensile-strength',
  elongation: 'elongation',
  modulus: 'elastic-modulus',
  hardness: 'hardness',
  fatigue_strength: 'fatigue-limit',
  fracture_toughness: 'fracture-toughness',
  impact_strength: 'impact-strength',
  thermal_conductivity: 'thermal-conductivity',
  thermal_expansion: 'thermal-expansion',
  electrical_conductivity: 'electrical-conductivity',
  glass_transition_temp: 'glass-transition',
  hdt_182: 'hdt',
  /* corrosion_resistance 는 넣지 않는다 — 정성 등급 필드라 RangeRow(수치 물성 행)를 타지 않는다.
     게이트(ALL_NUMERIC_PROPERTIES 대조)가 이 실수를 잡아 줬다. 부식 용어 연결이 필요하면
     그 값을 렌더하는 자리에서 따로 걸어야 한다. */
};

/** 이 물성에 연결할 글로서리 슬러그 (없으면 null). */
export function glossarySlugFor(propKey: string | null | undefined): string | null {
  if (!propKey) return null;
  return PROPERTY_TERM[propKey] ?? null;
}
