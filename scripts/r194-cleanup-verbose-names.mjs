// R194 — Clean up verbose entry names / conditions / heat_treatment that still contain numeric values
// (σy, UTS, El, HRC, HB, HV with numbers) embedded after R178/R185/R186 cleanups
//
// Source: data/supplementary-materials.json — modify in place
//
// Rules:
//   1. conditions[] strings: strip parenthetical containing σy/UTS/El/HB/HV numerics.
//      HRC may be kept ONLY when it's the differentiator between entries (e.g., H13 Q+T 540°C HRC 50 vs 53).
//   2. heat_treatment: strip σy/UTS suffix parentheticals; preserve procedure
//   3. base name verbose suffix: only the most egregious cases cleaned (long compound descriptors)

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const SUPP_PATH = path.join(ROOT, 'data', 'supplementary-materials.json');
const supp = JSON.parse(fs.readFileSync(SUPP_PATH, 'utf8'));
const mats = supp.materials;

// Explicit replacement map keyed by base name (when needed)
// Each entry: { conditions: [old, new][], heat_treatment: [old, new], name?: [old, new] }
const PATCHES = {
  'Tool Steel H13': {
    conditions: [
      // Tool Steel H13 conditions need HRC kept (differentiator) but verbose stripped
      ['Q + Temper 540°C (HRC 50)', 'Q+T 540°C (HRC 50)'],
      ['Q + Temper 540°C (HRC 53)', 'Q+T 540°C (HRC 53)'],
      ['Q + Temper 610°C (HRC 44)', 'Q+T 610°C (HRC 44)'],
    ],
  },
  'Maraging C350 / VascoMax C-350 (ATI 18Ni-9Co cobalt-strengthened)': {
    name: 'Maraging C350 (VascoMax, 18Ni-9Co)',
    conditions: [
      ['Aged 480-510°C 3-6h AC (peak strength UTS 2413 MPa, 53-55 HRC)', 'Aged 480-510°C / 3-6h AC (peak, HRC 53-55)'],
    ],
    heat_treatment: ['Solution 815°C AC + Aged 482°C 6h AC (peak — UTS 2413 MPa, HRC 53-55)', 'Solution 815°C AC + Aged 482°C / 6h AC (peak, HRC 53-55)'],
  },
  'AISI 1144 Stressproof': {
    conditions: [
      ['Normalized (σy 360-440, UTS 600-740, El 16-26%, HV 180-225)', 'Normalized'],
      ['Q+T 540°C high-temper (σy 620, UTS 760)', 'Q+T 540°C (high-temper)'],
      ['Q+T 425°C medium-temper (σy 760, UTS 880, peak strength)', 'Q+T 425°C (medium-temper, peak)'],
    ],
    heat_treatment: ['Stressproof (CW + stress-relief 600°C, σy 620 MPa, machinability rating 80%)', 'Stressproof (CW + stress-relief 600°C, machinability 80%)'],
  },
  'AISI 301 (cold-rolled high-strength austenitic stainless)': {
    name: 'AISI 301 (cold-rolled HS austenitic)',
    conditions: [
      ['Annealed (S30100, σy 205-240, UTS 503-556, El 30-40%)', 'Annealed (S30100)'],
      ['1/4 hard (cold-rolled, σy 515-760, UTS 860-1100)', '1/4 hard (cold-rolled)'],
      ['1/2 hard (cold-rolled, σy 760-965, UTS 1035-1280)', '1/2 hard (cold-rolled)'],
      ['3/4 hard (cold-rolled, σy 930-1240, UTS 1170-1380)', '3/4 hard (cold-rolled)'],
      ['Full hard (cold-rolled, σy 965-1380, UTS 1275-1520)', 'Full hard (cold-rolled)'],
    ],
  },
  'API 5L X42N + X52M PSL2 (heavy-wall pipeline, normalized/TMCP)': {
    name: 'API 5L X42N / X52M PSL2 (heavy-wall pipeline)',
    conditions: [
      ['X42N / L290N (normalized, σy 290 MPa min, σu 415 min)', 'X42N / L290N (normalized)'],
      ['X52M / L360M (TMCP, σy 360 MPa min, σu 460 min)', 'X52M / L360M (TMCP)'],
    ],
  },
  'AISI 440A (low-C martensitic stainless)': {
    name: 'AISI 440A (low-C martensitic)',
    conditions: [
      ['Q+T 200°C peak (HRC 56, knife/bearing application)', 'Q+T 200°C (HRC 56, knife/bearing)'],
    ],
    heat_treatment: ['Annealed (soft, HRC ≤22); end-use Q+T HRC 56-58', 'Annealed (soft); end-use Q+T'],
  },
  'AISI 440B (medium-C martensitic stainless)': {
    name: 'AISI 440B (medium-C martensitic)',
    conditions: [
      ['Q+T 200°C peak (HRC 58, cutlery/bearing application)', 'Q+T 200°C (HRC 58, cutlery/bearing)'],
    ],
    heat_treatment: ['Annealed (soft, HRC ≤24); end-use Q+T HRC 58-60', 'Annealed (soft); end-use Q+T'],
  },
  'Aluminum 1200 (commercial pure Al)': {
    name: 'AA 1200 (CP Al)',
    conditions: [
      ['Annealed (Annealed, soft) — σy 38-42 / UTS 86-95 / El 33-38%', 'Annealed (soft)'],
      ['H14 (Half-hard) — σy 95-110 / UTS 105-125 / El 4-6%', 'H14 (half-hard)'],
      ['H19 (Extra-hard) — σy 130-150 / UTS 140-160 / El 2-4%', 'H19 (extra-hard)'],
    ],
  },
  'AA 6463 (architectural extrusion)': {
    name: 'AA 6463 (architectural extrusion)',
    conditions: [
      ['T4 (Solution + naturally aged) — σy 75-87 / UTS 125-146 / El 16-23%', 'T4 (sol. + nat aged)'],
      ['T6 (Solution + artificial aging) — σy 170-185 / UTS 200-220 / El 8-12%', 'T6 (sol. + artificial aged)'],
    ],
  },
  'API 5L X65 / L450 PSL2 (line pipe)': {
    conditions: [
      ['X65M / L450M (TMCP, σy 450 MPa min, σu 535-760)', 'X65M / L450M (TMCP)'],
    ],
  },
  'API 5L X70 / L485 PSL2 (high-strength line pipe)': {
    conditions: [
      ['X70M / L485M (TMCP, σy 485 MPa min, σu 570-760)', 'X70M / L485M (TMCP)'],
    ],
  },
  '22MnB5 (USIBOR 1500) — hot-stamped automotive PHS': {
    name: '22MnB5 (USIBOR 1500) — hot-stamped PHS',
    conditions: [
      ['Hot-stamped (austenitized + die-quenched AlSi coated, σy 1100, UTS 1500)', 'Hot-stamped + AlSi coated'],
      ['As-rolled / pre-formed (ferritic-pearlitic, σy 400, UTS 600)', 'As-rolled / pre-formed (ferritic-pearlitic)'],
      ['Hot-stamped + tailored property (laser-softened zones, σy 600-1100, UTS 800-1500)', 'Hot-stamped + tailored (laser-softened zones)'],
    ],
  },
  'SA516 Grade 70 / P355N (pressure vessel HSLA)': {
    name: 'SA516 Gr 70 / P355N (pressure vessel)',
    conditions: [
      ['SA516 Gr 70 normalized (σy 260, UTS 485-620, ASTM A516)', 'SA516 Gr 70 (normalized, ASTM A516)'],
      ['P355N normalized (σy 355 min, UTS 490-630, EN 10028-3)', 'P355N (normalized, EN 10028-3)'],
    ],
  },
  'Pyrowear 53 (Carpenter, AMS 6308) — helicopter transmission gear': {
    name: 'Pyrowear 53 (AMS 6308) — helicopter transmission',
    conditions: [
      ['Carburized + Q+T (case HRC 60-62, core HRC 38-42, σy core 1100 MPa)', 'Carburized + Q+T (case HRC 60-62, core HRC 38-42)'],
    ],
  },
  'AISI 8620 (case-hardening)': {
    conditions: [
      ['Carburized + Q+T (case HRC 58-63, core HRC 30-40, σy core 700, UTS core 1050)', 'Carburized + Q+T (case HRC 58-63, core HRC 30-40)'],
    ],
  },
  'DP980 dual-phase steel (EN HCT980X / VDA 239-100 CR980Y700T-DP)': {
    name: 'DP980 (EN HCT980X) dual-phase',
    conditions: [
      ['CR (cold-rolled, σy 700 min, UTS 980 min, El 8-10% A50)', 'CR (cold-rolled)'],
      ['GI/GA (galvanized/galvannealed, σy 700 min, UTS 980 min)', 'GI/GA (galvanized/galvannealed)'],
    ],
  },
  // Tool steels with heat_treatment numeric (no conditions[] array)
  'P20 mold steel': {
    heat_treatment: ['Pre-hardened (Q+T HRC 30, mill supplied)', 'Pre-hardened (Q+T, HRC 30 mill-supplied)'],
  },
  'S7 tool steel': null,
  'A2 tool steel': null,
  'CPM 3V': null,
  'M4 tool steel (HSS)': null,
  'M42 HSS': null,
  'CPM S30V': null,
  'D3 tool steel': null,
  'O1 tool steel': null,
};

// Apply patches
let changes = 0;
let unmatchedConditions = [];

for (const m of mats) {
  const patch = PATCHES[m.name];
  if (patch === null || patch === undefined) continue;

  // Apply conditions[]
  if (patch.conditions && Array.isArray(m.conditions)) {
    for (const [oldStr, newStr] of patch.conditions) {
      const idx = m.conditions.indexOf(oldStr);
      if (idx >= 0) {
        m.conditions[idx] = newStr;
        changes++;
      } else {
        unmatchedConditions.push(`[${m.name}] not found: ${oldStr.slice(0,80)}`);
      }
    }
  }
  // Apply heat_treatment
  if (patch.heat_treatment) {
    const [oldHt, newHt] = patch.heat_treatment;
    if (m.heat_treatment === oldHt) {
      m.heat_treatment = newHt;
      changes++;
    } else if (m.heat_treatment) {
      unmatchedConditions.push(`[${m.name}] HT mismatch. current="${m.heat_treatment.slice(0,80)}"`);
    }
  }
  // Apply name change
  if (patch.name && patch.name !== m.name) {
    m.name = patch.name;
    changes++;
  }
}

// Also handle the tool steels (S7, A2, CPM 3V, M4, M42, S30V, D3, O1) that have numeric in heat_treatment
// For these we do a soft numeric strip
const TOOL_STEEL_KEEP_AS_IS = ['S7 tool steel', 'A2 tool steel', 'CPM 3V', 'M4 tool steel (HSS)', 'M42 HSS', 'CPM S30V', 'D3 tool steel', 'O1 tool steel'];
for (const m of mats) {
  if (!TOOL_STEEL_KEEP_AS_IS.includes(m.name)) continue;
  console.log(`[tool steel keep] ${m.name}`);
  console.log(`  ht: ${m.heat_treatment}`);
  if (m.conditions && Array.isArray(m.conditions)) {
    for (const c of m.conditions) console.log(`  cond: ${c}`);
  }
}

console.log(`\n=== Applied ${changes} changes ===`);
if (unmatchedConditions.length) {
  console.log(`\n=== Unmatched (${unmatchedConditions.length}) ===`);
  unmatchedConditions.forEach(u => console.log(u));
}

// Write back
fs.writeFileSync(SUPP_PATH, JSON.stringify(supp, null, 2) + '\n', 'utf8');
console.log(`\nWrote: ${SUPP_PATH}`);
