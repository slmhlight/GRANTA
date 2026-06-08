// R194-b — Clean remaining verbose conditions in supplementary-materials.json
// Run after r194-cleanup-verbose-names.mjs

import fs from 'node:fs';
import path from 'node:path';

const SUPP_PATH = path.join(path.resolve('.'), 'data', 'supplementary-materials.json');
const supp = JSON.parse(fs.readFileSync(SUPP_PATH, 'utf8'));
const mats = supp.materials;

const PATCHES = {
  'AA 1200 (CP Al)': {
    conditions: [
      ['O (Annealed, soft) — σy 38-42 / UTS 86-95 / El 33-38%', 'O (Annealed, soft)'],
    ],
  },
  'AA 6463 (architectural extrusion)': {
    conditions: [
      ['T6 (Solution + artificially aged peak) — σy 145-180 / UTS 195-220 / El 10-14%', 'T6 (sol. + artificial aged peak)'],
    ],
  },
  'API 5L X65 / L450 PSL2 (line pipe)': {
    conditions: [
      ['L450Q/QO (Q+T, σy 450 MPa min, σu 535 MPa min, PSL2 standard)', 'L450Q/QO (Q+T, PSL2)'],
    ],
  },
  'API 5L X70 / L485 PSL2 (high-strength line pipe)': {
    conditions: [
      ['L485M (TMCP, σy 485 MPa min, σu 570 MPa min)', 'L485M (TMCP)'],
    ],
  },
  '22MnB5 (USIBOR 1500) — hot-stamped PHS': {
    conditions: [
      ['High-ductility blank (ferrite-pearlite, pre-stamping σy 400 MPa)', 'High-ductility blank (ferrite-pearlite, pre-stamping)'],
      ['Austenitized + H2O quenched + AlSi coated (post-PHS, peak martensite, σy 1100)', 'Austenitized + H2O quenched + AlSi coated (post-PHS, peak martensite)'],
      ['Austenitized + H2O quenched uncoated (post-PHS, σy 950)', 'Austenitized + H2O quenched uncoated (post-PHS)'],
    ],
  },
  'SA516 Gr 70 / P355N (pressure vessel)': {
    conditions: [
      ['Normalized (min spec, σy 355 MPa)', 'Normalized (min spec)'],
      ['Normalized (typical thin section, σy 414 MPa)', 'Normalized (typical thin section)'],
    ],
  },
  'DP980 (EN HCT980X) dual-phase': {
    conditions: [
      ['Cold-rolled YS600 (typical, σy 600 MPa min, σu 980-1100)', 'Cold-rolled YS600 (typical)'],
      ['Cold-rolled YS750 (high-end, σy 750 MPa)', 'Cold-rolled YS750 (high-end)'],
    ],
  },
};

let changes = 0;
let unmatched = [];

for (const m of mats) {
  const patch = PATCHES[m.name];
  if (!patch) continue;
  if (patch.conditions && Array.isArray(m.conditions)) {
    for (const [oldStr, newStr] of patch.conditions) {
      const idx = m.conditions.indexOf(oldStr);
      if (idx >= 0) {
        m.conditions[idx] = newStr;
        changes++;
      } else {
        unmatched.push(`[${m.name}] not found: ${oldStr.slice(0,80)}`);
      }
    }
  }
}

console.log(`Applied ${changes} changes`);
if (unmatched.length) {
  console.log('\nUnmatched:');
  unmatched.forEach(u => console.log(u));
}

fs.writeFileSync(SUPP_PATH, JSON.stringify(supp, null, 2) + '\n', 'utf8');
console.log(`\nWrote: ${SUPP_PATH}`);
