/* R155b — Classification helpers unit test (scripts/lib/classification.mjs).
 *
 * Coverage: alloyOf · aaSubcategory · nameBasedSubcategory · fixSubcategory ·
 *           conditionClass · isExcludedByName · isExcludedAlloy
 */
import { describe, expect, it } from 'vitest';
import {
  alloyOf,
  aaSubcategory,
  nameBasedSubcategory,
  fixSubcategory,
  conditionClass,
  isExcludedByName,
  isExcludedAlloy,
  VENDOR_PREFIXES,
  CLASS_WORDS,
  isFakeVariant,
} from '../scripts/pipeline/enrich/classification.mjs';

/* ───────── alloyOf ───────── */

describe('alloyOf', () => {
  it('strips vendor prefix', () => {
    expect(alloyOf('EOS Stainless Steel 316L')).toBe('316L');
    expect(alloyOf('Renishaw Titanium Ti6Al4V')).toBe('Ti6Al4V');
  });

  it('strips class word prefixes (Stainless Steel, Titanium, etc.)', () => {
    expect(alloyOf('Stainless Steel 304')).toBe('304');
    expect(alloyOf('Titanium Ti-6Al-4V')).toBe('Ti-6Al-4V');
    expect(alloyOf('Aluminum 6061')).toBe('6061');
  });

  it('strips multiple class words iteratively', () => {
    expect(alloyOf('Stainless 304')).toBe('304');
  });

  it('returns baseName if all stripped', () => {
    expect(alloyOf('Steel')).toBe('Steel');
  });

  it('strips paren contents (via baseName)', () => {
    expect(alloyOf('AISI 4140 (Q+T)')).toBe('AISI 4140');
  });

  it('VENDOR_PREFIXES contains expected vendors', () => {
    expect(VENDOR_PREFIXES).toContain('EOS');
    expect(VENDOR_PREFIXES).toContain('Renishaw');
    expect(VENDOR_PREFIXES).toContain('GE Additive');
  });

  it('CLASS_WORDS contains expected class words', () => {
    expect(CLASS_WORDS).toContain('Stainless Steel');
    expect(CLASS_WORDS).toContain('Titanium');
    expect(CLASS_WORDS).toContain('Aluminum');
  });
});

/* ───────── aaSubcategory ───────── */

describe('aaSubcategory', () => {
  it('AA 6xxx → Si Alloys (6xxx/7xxx)', () => {
    expect(aaSubcategory('AA 6061-T6')).toBe('Aluminum - Si Alloys (6xxx/7xxx)');
    expect(aaSubcategory('AA 6063')).toBe('Aluminum - Si Alloys (6xxx/7xxx)');
  });

  it('AA 7xxx → Si Alloys (6xxx/7xxx)', () => {
    expect(aaSubcategory('AA 7075-T6')).toBe('Aluminum - Si Alloys (6xxx/7xxx)');
  });

  it('AA 5xxx → Mg Alloys', () => {
    expect(aaSubcategory('AA 5083')).toBe('Aluminum - Mg Alloys (5xxx)');
  });

  it('AA 2xxx (non-Li) → Cu Alloys', () => {
    expect(aaSubcategory('AA 2024')).toBe('Aluminum - Cu Alloys (2xxx)');
    expect(aaSubcategory('AA 2014')).toBe('Aluminum - Cu Alloys (2xxx)');
    expect(aaSubcategory('AA 2219')).toBe('Aluminum - Cu Alloys (2xxx)');
  });

  it('Al-Li 2xxx (2050/2090/2195/etc.) → Aluminum - Lithium', () => {
    expect(aaSubcategory('AA 2090')).toBe('Aluminum - Lithium');
    expect(aaSubcategory('AA 2195')).toBe('Aluminum - Lithium');
    expect(aaSubcategory('AA 2099')).toBe('Aluminum - Lithium');
  });

  it('AA 3xxx → Mn Alloys', () => {
    expect(aaSubcategory('AA 3003')).toBe('Aluminum - Mn Alloys (3xxx)');
  });

  it('non-AA → null', () => {
    expect(aaSubcategory('Inconel 718')).toBeNull();
    expect(aaSubcategory('316L')).toBeNull();
  });
});

/* ───────── nameBasedSubcategory ───────── */

describe('nameBasedSubcategory', () => {
  it('Inconel/Hastelloy/Haynes → Nickel Superalloy', () => {
    expect(nameBasedSubcategory('Inconel 718')).toBe('Nickel Superalloy');
    expect(nameBasedSubcategory('Hastelloy X')).toBe('Nickel Superalloy');
    expect(nameBasedSubcategory('Haynes 230')).toBe('Nickel Superalloy');
    expect(nameBasedSubcategory('Monel K-500')).toBe('Nickel Superalloy');
  });

  it('CoCr → Cobalt-based', () => {
    expect(nameBasedSubcategory('CoCrMo F75')).toBe('Cobalt-based');
    expect(nameBasedSubcategory('Stellite 6')).toBe('Cobalt-based');
  });

  it('Ti-6Al → Titanium - α+β', () => {
    expect(nameBasedSubcategory('Ti-6Al-4V')).toBe('Titanium - α+β');
    expect(nameBasedSubcategory('Ti6Al4V')).toBe('Titanium - α+β');
  });

  it('Refractory keywords → Refractory', () => {
    expect(nameBasedSubcategory('Tungsten WC-Co')).toBe('Refractory');
    expect(nameBasedSubcategory('Tantalum Ta')).toBe('Refractory');
    expect(nameBasedSubcategory('C-103 Nb-Hf')).toBe('Refractory');
  });

  it('Maraging → Maraging Steel', () => {
    expect(nameBasedSubcategory('Maraging 250')).toBe('Maraging Steel');
    expect(nameBasedSubcategory('Maraging 300 M300')).toBe('Maraging Steel');
  });

  it('H13/D2/Tool → Tool Steel', () => {
    expect(nameBasedSubcategory('H13 hot work tool')).toBe('Tool Steel');
    expect(nameBasedSubcategory('Tool Steel D2')).toBe('Tool Steel');
  });

  it('Duplex 2205/2507 → Stainless - Duplex', () => {
    expect(nameBasedSubcategory('Duplex 2205')).toBe('Stainless - Duplex');
    expect(nameBasedSubcategory('Super duplex 2507')).toBe('Stainless - Duplex');
  });

  it('17-4 PH / 15-5 PH → Stainless - PH', () => {
    expect(nameBasedSubcategory('17-4 PH H1025')).toBe('Stainless - PH');
    expect(nameBasedSubcategory('15-5 PH')).toBe('Stainless - PH');
  });

  it('316L / 304L → Stainless - Austenitic', () => {
    expect(nameBasedSubcategory('316L stainless')).toBe('Stainless - Austenitic');
    expect(nameBasedSubcategory('304 austenitic')).toBe('Stainless - Austenitic');
  });

  it('unrecognized → null', () => {
    expect(nameBasedSubcategory('Plain carbon steel')).toBeNull();
  });
});

/* ───────── fixSubcategory ───────── */

describe('fixSubcategory', () => {
  it('name-based wins over raw', () => {
    expect(fixSubcategory('Inconel 718', 'Some Wrong Cat')).toBe('Nickel Superalloy');
  });

  it('AA-based when name-based null', () => {
    expect(fixSubcategory('AA 6061', 'Raw')).toBe('Aluminum - Si Alloys (6xxx/7xxx)');
  });

  it('raw when neither match', () => {
    expect(fixSubcategory('Random Alloy XYZ', 'Carbon Steel')).toBe('Carbon Steel');
  });
});

/* ───────── conditionClass ───────── */

describe('conditionClass', () => {
  it('no paren → As-supplied', () => {
    expect(conditionClass('Plain name')).toBe('As-supplied');
  });

  it('Annealed', () => {
    expect(conditionClass('Steel (Annealed)')).toBe('Annealed');
    expect(conditionClass('AA 6061 (O)')).toBe('Annealed');
  });

  it('Aged / solution-treated', () => {
    expect(conditionClass('Inconel 718 (Aged)')).toBe('Aged / solution-treated');
    expect(conditionClass('17-4 PH (H900)')).toBe('Aged / solution-treated');
    expect(conditionClass('AA 7075 (T6)')).toBe('Aged / solution-treated');
  });

  it('Quenched / tempered', () => {
    expect(conditionClass('4140 (Q+T)')).toBe('Quenched / tempered');
    expect(conditionClass('AISI 1045 (Normalized)')).toBe('Quenched / tempered');
  });

  it('Strain-hardened', () => {
    expect(conditionClass('Brass (H02)')).toBe('Strain-hardened');
    expect(conditionClass('Cu (Cold drawn)')).toBe('Strain-hardened');
  });

  it('As-cast / forged', () => {
    expect(conditionClass('Iron (Cast)')).toBe('As-cast / forged');
    expect(conditionClass('Steel (Forged)')).toBe('As-cast / forged');
  });
});

/* ───────── isExcludedByName / isExcludedAlloy ───────── */

describe('isExcludedByName', () => {
  it('R137a CFRP — Std PAN/PEEK', () => {
    expect(isExcludedByName('CFRP — Std PAN/PEEK (TP, UD 0°)')).toBe(true);
  });

  it('R137a Natural Composite Hardwood', () => {
    expect(isExcludedByName('Natural Composite — Hardwood (oak)')).toBe(true);
  });

  it('common name → false', () => {
    expect(isExcludedByName('CFRP — IM7/8552 Epoxy')).toBe(false);
    expect(isExcludedByName('Foam Core — PMI Rohacell 71')).toBe(false);
  });

  it('handles null gracefully', () => {
    expect(isExcludedByName(null)).toBe(false);
    expect(isExcludedByName('')).toBe(false);
  });
});

describe('isExcludedAlloy', () => {
  it('R134a — Ti-5-8-5 excluded', () => {
    expect(isExcludedAlloy('Ti-5-8-5')).toBe(true);
    expect(isExcludedAlloy('ti585')).toBe(true);
  });

  it('R134a — AA 5005/5050/5154/5251 excluded', () => {
    expect(isExcludedAlloy('AA 5005')).toBe(true);
    expect(isExcludedAlloy('AA 5050')).toBe(true);
    expect(isExcludedAlloy('AA 5154')).toBe(true);
  });

  it('R136a — AA 7005 excluded', () => {
    expect(isExcludedAlloy('AA 7005')).toBe(true);
  });

  it('309S / 310S low-C variant excluded', () => {
    expect(isExcludedAlloy('309S')).toBe(true);
    expect(isExcludedAlloy('310S')).toBe(true);
  });

  it('common alloy → false', () => {
    expect(isExcludedAlloy('AA 6061')).toBe(false);
    expect(isExcludedAlloy('Inconel 718')).toBe(false);
    expect(isExcludedAlloy('Ti-6Al-4V')).toBe(false);
  });
});

/* ───────── R173 — isFakeVariant ───────── */

describe('isFakeVariant — Pattern 1: plain carbon steel × Aged', () => {
  it('AISI 1010-1095 × Aged → fake (precipitation impossible)', () => {
    expect(isFakeVariant('AISI 1010', 'Aged / solution-treated')).toBe(true);
    expect(isFakeVariant('AISI 1020', 'aged / solution-treated')).toBe(true);
    expect(isFakeVariant('AISI 1045', 'Aged')).toBe(true);
    expect(isFakeVariant('AISI 1080', 'Peak aged')).toBe(true);
    expect(isFakeVariant('AISI 1095', 'precipitation')).toBe(true);
  });

  it('SAE 11xx free-machining × Aged → fake', () => {
    expect(isFakeVariant('SAE 1117', 'Aged')).toBe(true);
  });

  it('A36 × Aged → fake', () => {
    expect(isFakeVariant('A36', 'Aged')).toBe(true);
  });

  it('plain carbon × valid condition → ok', () => {
    expect(isFakeVariant('AISI 1020', 'Annealed')).toBe(false);
    expect(isFakeVariant('AISI 1080', 'Q+T')).toBe(false);
    expect(isFakeVariant('AISI 1045', 'Normalized')).toBe(false);
  });
});

describe('isFakeVariant — Pattern 2: ferritic SS × Aged / Q+T', () => {
  it('AISI 405/430/444 × Aged → fake (single-phase ferrite, no PH)', () => {
    expect(isFakeVariant('AISI 405', 'Aged / solution-treated')).toBe(true);
    expect(isFakeVariant('AISI 430', 'Aged')).toBe(true);
    expect(isFakeVariant('AISI 444', 'Aged')).toBe(true);
  });

  it('AISI 405/430 × Q+T → fake (no martensite)', () => {
    expect(isFakeVariant('AISI 405', 'Quenched / tempered')).toBe(true);
    expect(isFakeVariant('AISI 430', 'Q+T')).toBe(true);
  });

  it('ferritic SS × Annealed → ok', () => {
    expect(isFakeVariant('AISI 430', 'Annealed')).toBe(false);
  });
});

describe('isFakeVariant — Pattern 3: austenitic SS × Q+T', () => {
  it('AISI 304/304L/316 × Q+T → fake (Ms < RT, no martensite)', () => {
    expect(isFakeVariant('AISI 304', 'Quenched / tempered')).toBe(true);
    expect(isFakeVariant('AISI 304L', 'Q+T')).toBe(true);
    expect(isFakeVariant('AISI 316', 'Quenched / tempered')).toBe(true);
    expect(isFakeVariant('AISI 321', 'Q+T')).toBe(true);
    expect(isFakeVariant('AISI 347', 'Q+T')).toBe(true);
  });

  it('austenitic SS × Annealed → ok (solution anneal is valid)', () => {
    expect(isFakeVariant('AISI 304', 'Annealed')).toBe(false);
    expect(isFakeVariant('AISI 316', 'Annealed')).toBe(false);
    expect(isFakeVariant('AISI 316L', 'Strain-hardened')).toBe(false);
    // 'Aged / solution-treated' coarse label now considered fake (Pattern 5 — no PH in 18-8 austenitic)
    expect(isFakeVariant('AISI 316L', 'Aged / solution-treated')).toBe(true);
  });
});

describe('isFakeVariant — Pattern 4: non-heat-treatable Al × Aged/Q+T', () => {
  it('AA 1xxx (pure Al) × Aged → fake', () => {
    expect(isFakeVariant('AA 1050', 'Aged')).toBe(true);
    expect(isFakeVariant('AA 1100', 'Aged / solution-treated')).toBe(true);
  });

  it('AA 3xxx (Mn) × Aged → fake', () => {
    expect(isFakeVariant('AA 3003', 'Aged')).toBe(true);
    expect(isFakeVariant('AA 3105', 'Aged')).toBe(true);
  });

  it('AA 5xxx (Mg, non-heat-treatable) × Aged → fake', () => {
    expect(isFakeVariant('AA 5052', 'Aged')).toBe(true);
    expect(isFakeVariant('AA 5083', 'Aged / solution-treated')).toBe(true);
    expect(isFakeVariant('AA 5454', 'Aged')).toBe(true);
  });

  it('AA 2xxx/6xxx/7xxx (heat-treatable) × Aged → ok', () => {
    expect(isFakeVariant('AA 2024', 'Aged')).toBe(false);
    expect(isFakeVariant('AA 6061', 'Aged / solution-treated')).toBe(false);
    expect(isFakeVariant('AA 7075', 'Aged')).toBe(false);
  });
});

describe('isFakeVariant — edge cases', () => {
  it('null/empty inputs → false', () => {
    expect(isFakeVariant(null, 'Aged')).toBe(false);
    expect(isFakeVariant('', 'Aged')).toBe(false);
    expect(isFakeVariant('AISI 1020', null)).toBe(false);
    expect(isFakeVariant('AISI 1020', '')).toBe(false);
  });

  it('alloy steel (43xx Cr-Mo) × Q+T → valid (Q+T is the standard condition)', () => {
    expect(isFakeVariant('AISI 4340', 'Q+T')).toBe(false);
    expect(isFakeVariant('AISI 4340', 'Quenched / tempered')).toBe(false);
    expect(isFakeVariant('AISI 4140', 'Q+T')).toBe(false);
  });

  it('alloy steel (41xx/43xx Cr-Mo) × Aged → fake (Pattern 7 — no PH precipitation phase)', () => {
    // ASM Vol.1: alloy steels are solid-solution Cr/Mo strengthened — Q+T is the only HT
    expect(isFakeVariant('AISI 4140', 'Aged')).toBe(true);
    expect(isFakeVariant('AISI 4340', 'Aged / solution-treated')).toBe(true);
    expect(isFakeVariant('AISI 5140', 'Aged')).toBe(true);
    expect(isFakeVariant('AISI 6150', 'Aged')).toBe(true);
  });

  it('austenitic stainless × Aged → fake (Pattern 5 — no precipitation in 18-8)', () => {
    expect(isFakeVariant('AISI 304', 'Aged')).toBe(true);
    expect(isFakeVariant('AISI 304L', 'Aged / solution-treated')).toBe(true);
    expect(isFakeVariant('AISI 316', 'Aged')).toBe(true);
    expect(isFakeVariant('AISI 321', 'Precipitation hardened')).toBe(true);
  });

  it('martensitic stainless × Aged → fake (Pattern 6 — Q+T is valid, Aged is not)', () => {
    expect(isFakeVariant('AISI 410', 'Aged')).toBe(true);
    expect(isFakeVariant('AISI 420', 'Aged / solution-treated')).toBe(true);
    expect(isFakeVariant('AISI 410', 'Quenched / tempered')).toBe(false);
  });

  it('solid-solution Ni alloy × Aged → fake (Pattern 8 — no γ\' precipitation)', () => {
    expect(isFakeVariant('Monel 400', 'Aged')).toBe(true);
    expect(isFakeVariant('Inconel 600', 'Aged / solution-treated')).toBe(true);
    expect(isFakeVariant('Hastelloy C-276', 'Aged')).toBe(true);
    // PH Ni alloys still valid
    expect(isFakeVariant('Inconel 718', 'Aged')).toBe(false);
    expect(isFakeVariant('Monel K-500', 'Aged')).toBe(false);
  });

  it('cupronickel × Aged → fake (Pattern 9 — solid-solution Cu-Ni)', () => {
    expect(isFakeVariant('C70600', 'Aged')).toBe(true);
    expect(isFakeVariant('C71500', 'Aged')).toBe(true);
    expect(isFakeVariant('CuNi30', 'Aged')).toBe(true);
    // PH Cu alloys still valid
    expect(isFakeVariant('CuCrZr', 'Aged')).toBe(false);
    expect(isFakeVariant('C18000', 'Aged')).toBe(false);
  });

  it('tool steel × Aged alone → fake (Pattern 10 — Q+T/Hardened is the term)', () => {
    expect(isFakeVariant('H13', 'Aged')).toBe(true);
    expect(isFakeVariant('D2', 'Aged')).toBe(true);
    expect(isFakeVariant('CPM 3V', 'Aged')).toBe(true);
    // Hardened-tempered phrasing remains valid
    expect(isFakeVariant('H13', 'Hardened-Tempered')).toBe(false);
    expect(isFakeVariant('D2', 'Quenched / tempered')).toBe(false);
  });
});
