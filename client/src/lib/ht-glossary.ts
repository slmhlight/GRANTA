/*
 * Sprint 4 C7 — Heat Treatment glossary.
 * 각 HT 조건에 한 줄 효과 설명 — MaterialDetail 에 hover tooltip 으로 노출.
 *
 * 데이터 출처: ASM Handbook Vol. 4 (Heat Treating), Vol. 1 (Properties);
 * AMS spec; MMPDS-2018; Vendor datasheets (EOS, Renishaw, Sandvik).
 *
 * lookup 은 normalize 된 lowercase key 로 prefix match — order matters
 * (longest prefix first). 미매칭 시 undefined → MaterialDetail 에서 일반 표시.
 */

export interface HtEntry {
  short: string;
  effect: string;
  appliesTo?: string[];
}

const ENTRIES: Array<[string[], HtEntry]> = [
  // 17-4 PH H-temper (강도 1차)
  [['h900'], { short: '17-4PH H900', effect: '최대 σy (~1170 MPa), 인성·연성 ↓, 부식 ↓', appliesTo: ['17-4 PH', '15-5 PH'] }],
  [['h1025'], { short: '17-4PH H1025', effect: 'σy ~1000 MPa, 연성 ↑, 일반적 균형 조건' }],
  [['h1075'], { short: '17-4PH H1075', effect: 'σy ~860 MPa, 충격인성 우수' }],
  [['h1100'], { short: '17-4PH H1100', effect: 'σy ~795 MPa, 내응력부식 ↑' }],
  [['h1150'], { short: '17-4PH H1150', effect: '최대 연성, σy ~720 MPa, 내응력부식 최대' }],
  // PH conditions
  [['solution treated', 'sa', 'condition a'], { short: 'Solution Annealed', effect: 'PH 강 출발조건, 시효 전 가공·용접 적합 (σy 낮음, El ↑)' }],
  [['aged', 'precipitation hardened', 'ph'], { short: 'Aged / PH', effect: '시효 경화 — σy·강도 ↑, El ↓' }],
  [['sta'], { short: 'Solution + Aged', effect: 'Ti 합금 (Ti-6Al-4V 등) 표준 강화 조건' }],
  // Steel
  [['quenched and tempered', 'q&t', 'qt', 'quenched + tempered'], { short: 'Q & T', effect: '담금질 후 템퍼링 — 강도·인성 균형, 일반 구조강 기본' }],
  [['normalized'], { short: 'Normalized', effect: '균질 미세조직, 응력 완화, σy·연성 모두 중간' }],
  [['annealed', 'soft annealed', 'full annealed'], { short: 'Annealed', effect: '최대 연성·가공성, σy ↓ (시작점)' }],
  [['stress relieved', 'stress-relieved'], { short: 'Stress relieved', effect: 'AM 잔류응력 완화, 미세조직 변화 미미' }],
  // AM 후처리
  [['hip', 'hot isostatic press'], { short: 'HIP', effect: '기공 제거 → 피로 강도·연신 ↑ (AM 표준)' }],
  [['as-built', 'as built', 'as-printed', 'asb'], { short: 'As-built', effect: 'AM 후처리 없음 — 잔류응력 + 일부 기공, 피로 ↓' }],
  // Al / Mg / Cu
  [['t6'], { short: 'T6', effect: 'Al 합금 표준 시효 (peak hardness)' }],
  [['t651'], { short: 'T651', effect: 'T6 + stress-relieved (잔류응력 ↓)' }],
  [['t73', 't74', 't7'], { short: 'T7', effect: 'Over-aged — 응력부식 ↑, σy 약간 ↓' }],
  [['t4'], { short: 'T4', effect: 'Solution + 자연시효 — El ↑, σy 중간' }],
  [['o temper', 'temper o', '-o'], { short: 'O', effect: 'Annealed Al — 최대 연성' }],
  [['h14', 'h18', 'h22', 'h32'], { short: 'H-temper', effect: 'Al cold-work strengthened (변형 경화)' }],
  // Ti
  [['mill annealed', 'ma'], { short: 'Mill Annealed', effect: 'Ti 합금 출발 조건 — α+β 미세조직 균질' }],
  [['beta annealed'], { short: 'β-annealed', effect: 'β-transus 위 균질화, 인성 ↑, El ↓' }],
  // Ni-base
  [['solution + aged', 'solution treated + aged'], { short: 'SA + Aged', effect: 'Inconel/HSF 강화 — γ\' 석출' }],
  [['homogenized'], { short: 'Homogenized', effect: '주조·AM 미세편석 균질화' }],
  // Cu
  [['precipitation strengthened'], { short: 'PH (Cu)', effect: 'CuBe / Cu-Cr 시효 — 강도·전도성 균형' }],
];

const NORMALIZE = (s: string) => String(s || '').toLowerCase().trim().replace(/[_]/g, ' ').replace(/\s+/g, ' ');

export function htGlossaryFor(ht: string): HtEntry | undefined {
  const k = NORMALIZE(ht);
  if (!k) return undefined;
  // longest prefix match
  for (const [keys, entry] of ENTRIES) {
    if (keys.some(key => k === key || k.startsWith(key + ' ') || k.endsWith(' ' + key))) return entry;
  }
  // partial match (포함)
  for (const [keys, entry] of ENTRIES) {
    if (keys.some(key => k.includes(key))) return entry;
  }
  return undefined;
}
