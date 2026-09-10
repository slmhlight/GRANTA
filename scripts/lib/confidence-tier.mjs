/*
 * C3 — confidence_tier 산출 규칙의 **단일 정의**.
 *
 * 규칙 자체는 R133b/R211 부터 build-materials(동결 모놀리스) 안에 있었고, 뜻은
 * client/src/lib/materials.ts 주석에만 적혀 있었다. 그래서 두 가지 문제가 있었다:
 *
 *  ① 문서가 코드와 어긋났다 — 주석의 medium-low 조건에 `safetyScore ≥ 1.5` 분기가 빠져 있었다.
 *  ② **산출 시점이 너무 일렀다.** 모놀리스가 tier 를 찍은 뒤, 레지스트리 교정이
 *     `data/corrections/sources.json` 으로 검증된 규격·핸드북 출처를 덧붙인다.
 *     증거가 늘어도 tier 는 그대로라, 배포된 데이터에서 **205 entry 가 자기 규칙과 어긋났다**
 *     (전부 medium 인데 규칙대로면 high — 교정이 verified 출처를 2개 이상으로 늘린 경우).
 *
 * 그래서 규칙을 여기 한 곳에 두고, build-from-registry(최종 산출) 가 **교정·정합이 모두 끝난
 * 뒤** 다시 계산한다. 게이트도 이 모듈을 import 해서 판정 기준을 재구현하지 않는다.
 *
 * 값의 뜻(R133b):
 *   high       안전 임계 사용 가능 — 검증 출처 2개 이상, 또는 핵심 물성 실측 4개 이상 + 검증 출처 1개
 *   medium     표준 의사결정 사용 가능 — 검증 출처 1개, 또는 핸드북 6개 이상 + 안전물성 점수 3 이상
 *   medium-low sanity check 용 — 검증 출처 0, 핸드북 4개 이상 또는 안전물성 점수 1.5 이상
 *   low        UI 기본 hide — 안전물성이 거의 폴백
 */

/** confidence 종류별 가중치 — 안전물성 점수(safetyScore) 합산에 쓴다. */
export const CONF_W = { measured: 4, handbook: 3, subfamily: 1.5, family: 0.5, class: 0.2, derived: 0.1 };

/** 핵심 물성 — 실측/핸드북 **개수**를 센다(가중치 아님). */
export const CORE_PROPS = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];

/** 안전 관련 물성 — 가중치 합(safetyScore)으로 본다. 이 셋이 폴백이면 안전 판단에 못 쓴다. */
export const SAFETY_PROPS = ['fatigue_strength', 'impact_strength', 'fracture_toughness'];

export const TIER_RANK = { low: 0, 'medium-low': 1, medium: 2, high: 3 };

/** 규칙 적용에 쓰인 중간값 — 게이트가 "왜 그 등급인지" 를 말할 수 있게 함께 돌려준다. */
export function confidenceInputs(m) {
  let measuredCount = 0, handbookCount = 0, safetyScore = 0;
  for (const p of CORE_PROPS) {
    const c = m.ranges?.[p]?.confidence;
    if (c === 'measured') measuredCount++;
    if (c === 'handbook') handbookCount++;
  }
  for (const p of SAFETY_PROPS) safetyScore += CONF_W[m.ranges?.[p]?.confidence] || 0;
  const verified = (m.sources || []).filter((s) => s && s.verified).length;
  return { measuredCount, handbookCount, safetyScore, verified };
}

/** R133b/R211 규칙 — build-materials 의 assignConfidenceTiers 와 같은 판정. */
export function confidenceTierOf(m) {
  const { measuredCount, handbookCount, safetyScore, verified } = confidenceInputs(m);
  if (verified >= 2 || (measuredCount >= 4 && verified >= 1)) return 'high';
  if (verified >= 1 || (handbookCount >= 6 && safetyScore >= 3)) return 'medium';
  if (handbookCount >= 4 || safetyScore >= 1.5) return 'medium-low';
  return 'low';
}
