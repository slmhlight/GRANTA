/*
 * Sprint 4 C1 — 피로강도 계열 폴백 규칙 (σf ≈ k·σy, 10^7 cycles, R=-1, smooth specimen).
 * 출처: Shigley's Mechanical Engineering Design (10th ed) Ch. 6 Eq. 6-10; ASM Vol. 19 Fatigue.
 *
 * A19 (2026-09-20) — 규칙을 build-materials 밖으로 뽑았다. 파생값은 **입력이 바뀌면 다시 계산돼야** 하는데,
 * 모놀리스가 σy 교정 **전에** 한 번 찍은 값이 레지스트리에 그대로 남아 있었다(C3 confidence_tier 와 같은
 * '재계산 시점' 문제). 실측: 파생 피로 487 entry 중 **43 금속**이 현재 σy 와 어긋남 — 예 AISI 1040 Q+T 157
 * (규칙대로면 295) · AA 6101-H111 88(UTS 95 의 0.93배 — 물리 상한 0.63 초과). 생산자(build-materials)와
 * 재유도(build-from-registry 1i)·게이트(derived-fatigue.test)가 이 한 표를 공유한다.
 */

/** [pattern, k_low, k_typ, k_high, source] — 순서가 우선순위(첫 매칭). */
export const FATIGUE_RATIO = [
  [/stainless.*austenitic|austenitic.*stainless|304\b|316\b/i, 0.35, 0.42, 0.50, 'ASM Vol.19 SS fatigue'],
  [/stainless.*martensitic|martensitic|17-?4|15-?5|13-?8|\b41[03]\b/i, 0.40, 0.50, 0.58, 'ASM Vol.19 Martensitic SS'],
  /* Al 규칙을 공구강 앞에 둔다 — 'AA 2017 — H13'(Al 냉간가공 템퍼)이 \bh1[13]\b(H11/H13 공구강)에 먼저 걸려
     0.42 규칙으로 떨어지던 것(A3 2026-09-20). 다른 entry 의 매칭은 불변(레지스트리 재생성 diff 로 확인). */
  [/aluminum|aa\s?\d{4}|alsi\d+|7075|6061|2024/i, 0.30, 0.38, 0.46, 'Aluminum Association handbook'],
  [/tool steel|\bd[23]\b|\bm[24]\b|\bh1[13]\b/i, 0.35, 0.42, 0.50, 'ASM Vol.1 Tool Steels'],
  [/inconel|hastelloy|haynes|nimonic|monel|udimet|rene/i, 0.40, 0.48, 0.55, 'Special Metals fatigue data'],
  [/cobalt|stellite|f-?75|l-?605/i, 0.40, 0.48, 0.55, 'ASM Vol.2 Co alloys'],
  [/titanium|ti-?6al-?4v|ti grade|cp ?ti/i, 0.42, 0.52, 0.60, 'MMPDS-2018 Titanium'],
  [/magnesium|\baz\d/i, 0.30, 0.35, 0.42, 'ASM Vol.2 Mg alloys'],
  [/copper|brass|bronze|c[12389]\d{4}/i, 0.28, 0.35, 0.42, 'ASM Vol.2 Cu alloys'],
  [/refractory|tantalum|tungsten|niobium|molybdenum/i, 0.35, 0.42, 0.50, 'ASM Vol.2 Refractory'],
  [/carbon steel|alloy steel|41\d{2}|43\d{2}|s45c|aisi|sae/i, 0.40, 0.50, 0.58, "Shigley's Mechanical Engineering Design"],
];

/** 계열 매칭 키 — 생산자와 재유도가 같은 문자열을 써야 같은 규칙에 떨어진다. */
export const fatigueKey = (m) => `${m.subcategory || ''} ${m.name} ${m.category}`;

/** 계열 규칙 조회 — 없으면 null. */
export function fatigueRule(m) {
  const key = fatigueKey(m);
  for (const [rx, kLo, kTyp, kHi, src] of FATIGUE_RATIO) if (rx.test(key)) return { kLo, kTyp, kHi, src };
  return null;
}

/** 규칙과 σy 로 range 객체를 만든다 — 생산자의 출력 형태 그대로(provenance 문자열 포함). */
export function deriveFatigueRange(rule, sy) {
  return {
    min: Math.round(sy * rule.kLo), max: Math.round(sy * rule.kHi), typical: Math.round(sy * rule.kTyp),
    n: 0, confidence: 'derived',
    provenance: `family:σf≈${rule.kTyp}·σy (${rule.src})`,  // R129 — Sprint 4 C1 fallback provenance
  };
}

/** provenance 문자열에서 규칙 계수를 읽는다: `family:σf≈0.38·σy (…)` → {k:0.38, base:'σy'} · R205-R `σf≈0.35·UTS` → base 'UTS'. */
export function parseDerivedFatigue(provenance) {
  const m = String(provenance || '').match(/σf≈([\d.]+)·(σy|UTS)/);
  return m ? { k: parseFloat(m[1]), base: m[2] } : null;
}
