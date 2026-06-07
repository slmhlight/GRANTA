/*
 * R155b — Classification helpers from build-materials.mjs.
 *
 * Pure 함수 (stateless). 단위 테스트 가능.
 *
 *   - alloyOf(name): vendor prefix + class word stripped → bare alloy designation
 *   - aaSubcategory(name): AA aluminum series → app subcategory (2xxx Cu, 5xxx Mg, …)
 *   - nameBasedSubcategory(name): keyword-based subcategory override (Inconel→Nickel Superalloy etc.)
 *   - fixSubcategory(name, rawSub): combined override → name-based || AA-based || raw
 *   - conditionClass(name): condition-in-paren → coarse class (Annealed/Aged/Q+T/…)
 *   - isExcludedByName(name): R137a generic composite exclusion
 *   - isExcludedAlloy(name): R134a-R137a specialty alloy exclusion
 */
import { baseName } from '../utilities.mjs';

export const VENDOR_PREFIXES = [
  '3D Systems', 'EOS', 'Renishaw', 'Nikon SLM Solutions', 'Nikon SLM', 'SLM Solutions',
  'GE Additive', 'ExOne', 'Farsoon', 'Trumpf', 'Huake 3D', 'Huake', 'Colibrium',
];

export const CLASS_WORDS = [
  'Stainless Steel', 'Stainless', 'Titanium', 'Aluminium', 'Aluminum', 'Nickel Alloy',
  'Nickel', 'Copper', 'Cobalt Chrome', 'Cobalt-Chrome', 'Bronze', 'Steel', 'Alloy',
];

export function alloyOf(name) {
  let s = baseName(name);
  for (const v of VENDOR_PREFIXES) {
    if (s.toLowerCase().startsWith(v.toLowerCase())) {
      s = s.slice(v.length).trim();
      break;
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const w of CLASS_WORDS) {
      if (s.toLowerCase().startsWith(w.toLowerCase() + ' ')) {
        s = s.slice(w.length).trim();
        changed = true;
      }
    }
  }
  return s || baseName(name);
}

/* AA aluminium series → app subcategory.
   R134a — Al-Li (2050/2090/2099/2195/2196/2198/2199) 는 별도 subcategory 로 분리.
   일반 2xxx (2014/2024/2219/2618) 는 Cu Alloys (2xxx). */
export function aaSubcategory(name) {
  const nm = baseName(name);
  if (/\b20(50|90|99|95)\b|\b219[5-9]\b|\b21\d{2}\b.*?\bli\b|\bal-?li\b/i.test(nm)) return 'Aluminum - Lithium';
  const m = nm.match(/^AA\s*(\d)\d{3}/i);
  if (!m) return null;
  return {
    '1': 'Aluminum - Pure/Other',
    '2': 'Aluminum - Cu Alloys (2xxx)',
    '3': 'Aluminum - Mn Alloys (3xxx)',
    '5': 'Aluminum - Mg Alloys (5xxx)',
    '6': 'Aluminum - Si Alloys (6xxx/7xxx)',
    '7': 'Aluminum - Si Alloys (6xxx/7xxx)',
    '8': 'Aluminum - Pure/Other',
  }[m[1]] || null;
}

/* Name-based subcategory override — CSV의 잘못된 subcategory를 정정.
   합금 이름에 분명한 키워드가 있으면 raw subcategory 보다 우선. */
export function nameBasedSubcategory(name) {
  const n = String(name).toLowerCase();
  if (/inconel|hastelloy|haynes|monel|nimonic|waspaloy|rene|incoloy|udimet|cm247|nitinol|invar|cp-nickel/.test(n)) return 'Nickel Superalloy';
  if (/cocr|cobalt|stellite|haynes 188/.test(n)) return 'Cobalt-based';
  if (/ti[\s-]?6al|ti6al|ti-6|ti5|ti6242|ta15|beta-2/.test(n)) return 'Titanium - α+β';
  if (/tungsten|tantalum|niobium|molybden|rhenium|c-103/.test(n)) return 'Refractory';
  if (/(brass|bronze|cuni|cucr|grcop|becu|beryllium copper)/.test(n)) return 'Copper-based';
  if (/maraging|18ni-?300|m300|c300|c350|ms1/.test(n)) return 'Maraging Steel';
  if (/h13|d2|p20|s7|a2|o1|cpm|m2|m4 |\btool\b/.test(n)) return 'Tool Steel';
  if (/duplex|2205|2507|superduplex/.test(n)) return 'Stainless - Duplex';
  if (/15-?5 ?ph|17-?4 ?ph|155ph|174ph|13-?8 ?ph/.test(n)) return 'Stainless - PH';
  if (/316l?|304l?|310|nitronic|austenit/.test(n)) return 'Stainless - Austenitic';
  return null;
}

export function fixSubcategory(name, rawSub) {
  const nb = nameBasedSubcategory(name);
  return nb || aaSubcategory(name) || rawSub;
}

/* bucket the in-name condition into a coarse class so an alloy×process splits into a few materials.
   R155b — real bugs found by unit test:
     - H900/H925/H1025 (PH stainless aging spec, H + 3-4 digits) was mis-classified as Strain-hardened
       because /h\d/ in strain-hardened branch matched before Aged branch.
       Fix: 명시적 /h\d{3,4}/ in Aged branch.
     - Q+T (4140-Q+T) was mis-classified as As-supplied because neither /quench/ nor /temper/ matched.
       Fix: /q\+t|\bqt\b/ in Quenched branch. */
export function conditionClass(name) {
  const m = String(name).match(/\(([^)]+)\)/);
  const c = (m ? m[1] : '').toLowerCase().trim();
  if (!c) return 'As-supplied';
  if (/anneal|^o$|^o\b/.test(c)) return 'Annealed';
  if (/solution|aged|t\d|precipit|\bph\b|h\d{3,4}/.test(c)) return 'Aged / solution-treated';
  if (/quench|temper|normaliz|harden|q\+t|\bqt\b/.test(c)) return 'Quenched / tempered';
  if (/\bh\d{1,2}\b|cold|hot roll|rolled|drawn|work/.test(c)) return 'Strain-hardened';
  if (/cast|forged/.test(c)) return 'As-cast / forged';
  return 'As-supplied';
}

/* R134a-R137a — 사용자 명시 specialty alloy 제외 (data sparse + 대체 anchor 존재). */
export const EXCLUDED_ALLOY_PATTERNS = [
  /^ti[\s-]?5[\s-]?8[\s-]?5$/i,        // Ti-5-8-5 (Ti-5Al-8V-5Cr) — R134a
  /^aa[\s-]?7178$/i,                    // AA 7178 — R134a
  /^aa[\s-]?500[5]$/i, /^aa[\s-]?5050$/i, /^aa[\s-]?5154$/i,
  /^aa[\s-]?5251$/i, /^aa[\s-]?5356$/i, /^aa[\s-]?5383$/i,
  /^aa[\s-]?7005$/i,                    // R136a
  /^309s$/i, /^310s$/i,                 // low-C 변종 (309/310 anchor 로 충분)
  /^654[\s-]?smo$/i,                    // Outokumpu 독점
  /^bronze$/i,                          // generic 명시 없음
  /^c95500$/i, /^c68000$/i,             // R137a
];

/* R137a — generic composite 명칭 제외 (vendor anchor 없음). */
export const EXCLUDED_NAME_PATTERNS = [
  /CFRP — Std PAN\/PEEK \(TP, UD/i,
  /Natural Composite — Hardwood/i,
  /Carbon-Phenolic \(rocket nozzle/i,
];

export function isExcludedByName(name) {
  return EXCLUDED_NAME_PATTERNS.some(rx => rx.test(String(name || '')));
}

export function isExcludedAlloy(name) {
  const n = String(name || '').trim();
  return EXCLUDED_ALLOY_PATTERNS.some(rx => rx.test(n));
}

/*
 * R173 — Fake-variant detection.
 *
 *  CSV 의 자동 condition classifier 가 alloy 의 야금학적 metallurgy 와 무관하게
 *  6 가지 condition (Annealed/Aged/Q+T/As-cast-forged/Strain-hardened/As-supplied) 을
 *  모든 alloy 에 부여 → 일부 alloy 에 적용 불가능한 condition 이 fake variant 로 생성.
 *
 *  출처 (ASM Handbook):
 *    - Vol.1: "Plain carbon steels (C ≤ 0.20%) cannot undergo precipitation hardening;
 *             strengthening relies on cold work, normalizing, or hot rolling."
 *    - Vol.1: "Ferritic stainless steels (AISI 405, 430, 444, etc.) are single-phase α;
 *             no austenite forms → no Q+T, no aging."
 *    - Vol.1: "Austenitic stainless steels (304/316/321 etc.) have Ms ≈ -100°C;
 *             room-temp quench cannot form martensite → no Q+T."
 *    - Vol.2: "Aluminum 1xxx/3xxx/5xxx (non-heat-treatable) cannot be Q+T;
 *             temper designations are O / Hxx series only."
 *
 *  Returns true → entry should be dropped.
 *
 *  @param name      Alloy name (lowercase or mixed)
 *  @param condition Coarse condition class (output of conditionClass())
 */
export function isFakeVariant(name, condition) {
  if (!name || !condition) return false;
  const n = String(name).toLowerCase();
  const c = String(condition).toLowerCase();

  /* Pattern 1 — plain carbon steel (AISI 10xx, 11xx, 12xx) × "Aged" */
  const isPlainCarbon = /^(aisi |sae )?1[01][0-9]{2}\b/.test(n) || /^a36\b/.test(n);
  if (isPlainCarbon && /aged|precipit|solution.treat|peak.ag/.test(c)) return true;

  /* Pattern 2 — ferritic stainless × Aged or Q+T (no PH, no martensite) */
  const isFerriticSS = /\b(aisi |sae )?4(05|0[3-6]|09|30|34|36|39|41|42|44|46)\b/.test(n) ||
                       /\b18cr|sus430|stavax/.test(n);
  if (isFerriticSS && (/aged|precipit/.test(c) || /quench.*tempered|^q\+t$|qt\b/.test(c))) return true;

  /* Pattern 3 — austenitic stainless × Q+T (Ms ≈ -100°C → no martensite at RT) */
  const isAusteniticSS = /\b(aisi |sae )?3(0[14]|1[0-6]|21|47)l?\b/.test(n) ||
                        /sus3(0[14]|1[0-6])l?\b/.test(n);
  if (isAusteniticSS && /quench.*tempered|^q\+t$|qt\b/.test(c)) return true;

  /* Pattern 4 — non-heat-treatable Al (1xxx, 3xxx, 5xxx) × "Aged" or "Q+T".
   *  Heat-treatable Al (2xxx Cu, 6xxx Mg-Si, 7xxx Zn) 는 aging 가능. */
  const isNonHTAlu = /^aa[\s-]?(1[0-9]{3}|3[0-9]{3}|5[0-9]{3})\b/.test(n);
  if (isNonHTAlu && (/aged|precipit/.test(c) || /quench.*tempered|^q\+t$/.test(c))) return true;

  /* Pattern 5 — austenitic stainless × "Aged" (Q+T 만 Pattern 3 처리, Aged 도 추가).
   *  ASM Vol.1: "Standard 18-8 austenitic (304/316/321/347) have no
   *  precipitation strengthening — Cr/Ni 가 γ-Fe matrix 에 solid-solute, no second phase."
   *  Exception: A286, Nitronic, 17-7 PH, 15-7 PH 는 별도 PH austenitic (별도 grade).
   *  사용자 reported: "AISI 304L Aged / solution-treated" — 명백한 fake. */
  if (isAusteniticSS && /aged|precipit/.test(c)) return true;

  /* Pattern 6 — martensitic stainless (410/420/440) × "Aged".
   *  Q+T 가 valid, Aged 는 wrong (no precipitation phase). */
  const isMartensiticSS = /\b(aisi |sae )?(41[046]|42[02]|431|44[024]|446)\b/.test(n) ||
                          /\bsus41[046]\b|\bsus420j[12]?\b|\bsus440[abc]?\b/.test(n);
  if (isMartensiticSS && /aged|precipit/.test(c)) return true;

  /* Pattern 7 — alloy steel (43xx Ni-Cr-Mo, 51xx Cr, 61xx Cr-V, 86xx Ni-Cr-Mo,
   *   87xx Ni-Cr-Mo, 92xx, 93xx) × "Aged".  Q+T 가 정상이며 PH 안 됨. */
  const isAlloySteel = /\b(aisi |sae )?(41[3457]0|43[124]0|46[02]0|47[125]0|48[12]0|51[14-6]0|52100|61[125-7]0|81[2-6]0|86[12-9]0|87[24]0|92[567]0|93[12-9]0)\b/.test(n) ||
                       /\bscm4(?:1[035]|20|3[05]|40|45)\b|\bsncm(?:220|240|41[05]|42[05]|439|447|815)\b/.test(n);
  if (isAlloySteel && /aged|precipit/.test(c)) return true;

  /* Pattern 8 — solid-solution Ni alloy (Monel 400, Inconel 600/601, Hastelloy X/C-276/C-22, etc.)
   *   × "Aged". Solid-solution strengthened — no γ' / γ'' precipitation.
   *   PH Ni alloy (Inconel 718, 725, 740, X-750, 925, Monel K-500, Waspaloy, Rene, CMSX,
   *     Udimet, Nimonic 80A/90/105, Haynes 282/214, Custom 465, Pyromet) 는 제외 — 모두 Aged 가능. */
  const isSolidSolNi = /^(?:monel\s?400|monel-?400)\b/.test(n) ||
                       /^inconel\s?60[01]\b/.test(n) ||
                       /^hastelloy\s?(?:c-?276|x|b-?[234]|c-?22|c-?2000)\b/.test(n) ||
                       /^incoloy\s?(?:800h?t?|825)\b/.test(n) ||
                       /^haynes\s?(?:230|556|625)\b/.test(n);
  if (isSolidSolNi && /aged|precipit/.test(c)) return true;

  /* Pattern 9 — cupronickel (C70600, C71500, CuNi10, CuNi30) × "Aged".
   *   Solid-solution Cu-Ni — no precipitation. PH Cu alloy (CuCrZr, CuBe, C18000, C18150)
   *   는 별도 — pattern 미해당. */
  const isCupronickel = /^c706?00\b|^c715?00\b|^cuni\s?(?:10|30)/.test(n);
  if (isCupronickel && /aged|precipit/.test(c)) return true;

  /* Pattern 10 — tool steel (H13/H11/D2/D3/A2/O1/S7/M2/M4/W1/CPM-3V/CPM-S30V/etc.)
   *   × "Aged" 단독. Q+T / Hardened-Tempered 가 정상.
   *   고온 tool steel (P20 mod, P21 PH) 의 일부 aging 가능 — 보수적으로 제외. */
  const isToolSteel = /^(?:tool steel )?(?:h1[13]|d[23]|a2|o1|s7|m[24]|w1|cpm[\s-]?(?:3v|s30v|s35vn|s90v))\b/.test(n) ||
                      /^skd(?:1[12]|61)\b/.test(n);
  if (isToolSteel && /aged|precipit/.test(c) && !/quench|temper|harden/.test(c)) return true;

  /* Pattern 11 — CP-Ti (Grade 1-4) × Aged.
   *   ASM Vol.2: "Commercially Pure (CP) Titanium grades 1-4 are single-phase α —
   *   no aging response. Only annealing or cold work strengthening."
   *   α+β Ti (Ti-6Al-4V Gr5) 또는 β-Ti (Ti Beta-C) 는 aging 가능 — 별도 grade 처리. */
  const isCpTi = /^ti\s?grade\s?[1234]\b|^ticpgr[1234]\b|^cp-?ti\s?(?:grade\s?)?[1234]?\b|^unalloyed\s?ti/.test(n);
  if (isCpTi && /aged|precipit/.test(c)) return true;

  return false;
}
