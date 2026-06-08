// R194-c — Final polish for cosmetic issues
// - AA 1200 'Annealed (Annealed, soft)' duplicate after R179 'O' → 'Annealed' normalization
// - 22MnB5 'hot-stamped PHS' suffix collides with condition em-dash

import fs from 'node:fs';
import path from 'node:path';

const SUPP_PATH = path.join(path.resolve('.'), 'data', 'supplementary-materials.json');
const supp = JSON.parse(fs.readFileSync(SUPP_PATH, 'utf8'));
const mats = supp.materials;

let changes = 0;

for (const m of mats) {
  if (m.name === 'AA 1200 (CP Al)' && Array.isArray(m.conditions)) {
    const i = m.conditions.indexOf('O (Annealed, soft)');
    if (i >= 0) {
      m.conditions[i] = 'O (soft)';
      changes++;
    }
  }
  if (m.name === '22MnB5 (USIBOR 1500) — hot-stamped PHS') {
    m.name = '22MnB5 (USIBOR 1500)';
    changes++;
  }
  if (m.name === 'Pyrowear 53 (AMS 6308) — helicopter transmission') {
    m.name = 'Pyrowear 53 (AMS 6308)';
    changes++;
  }
}

console.log(`Applied ${changes} changes`);
fs.writeFileSync(SUPP_PATH, JSON.stringify(supp, null, 2) + '\n', 'utf8');
console.log(`Wrote: ${SUPP_PATH}`);
