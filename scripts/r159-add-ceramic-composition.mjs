/*
 * R159 — Add chemical-formula-based composition to ceramic entries.
 *
 * Parses the formula in each ceramic's name (between parens) and converts to element mass percentages.
 * Writes the updated ceramics-data.json in place.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const APPLY = process.argv.includes('--apply');

/* IUPAC atomic weights (g/mol). */
const AW = {
  H: 1.008, Li: 6.94, Be: 9.012, B: 10.81, C: 12.01, N: 14.01, O: 16.00, Na: 22.99, Mg: 24.31, Al: 26.98,
  Si: 28.09, P: 30.97, S: 32.07, K: 39.10, Ca: 40.08, Ti: 47.87, V: 50.94, Cr: 52.00, Mn: 54.94, Fe: 55.85,
  Co: 58.93, Ni: 58.69, Cu: 63.55, Zn: 65.38, Ga: 69.72, Ge: 72.63, As: 74.92, Y: 88.91, Zr: 91.22,
  Nb: 92.91, Mo: 95.95, Ag: 107.87, Sn: 118.71, Sb: 121.76, Ba: 137.33, La: 138.91, Ce: 140.12,
  Hf: 178.49, Ta: 180.95, W: 183.84, Pb: 207.20, Bi: 208.98, F: 19.00, Cl: 35.45, Br: 79.90, I: 126.90, Pt: 195.08,
};

/* Convert subscript chars (₀-₉) to ASCII digits. */
const SUBSCRIPTS = { '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9' };
const desub = (s) => s.split('').map(c => SUBSCRIPTS[c] || c).join('');

/* Parse formula like "Al2O3" / "Si3N4" / "Y2O3" → {Al:2, O:3} stoichiometry. */
function parseFormula(formula) {
  const f = desub(formula);
  const re = /([A-Z][a-z]?)(\d*)/g;
  const out = {};
  let m;
  while ((m = re.exec(f)) !== null) {
    const el = m[1]; const n = m[2] ? parseInt(m[2], 10) : 1;
    if (!el) continue;
    if (!AW[el]) return null;  /* element 모르면 fail */
    out[el] = (out[el] || 0) + n;
  }
  return Object.keys(out).length ? out : null;
}

/* {Al:2, O:3} → {Al:"52.9", O:"47.1"} (mass %). */
function stoichToMassPct(stoich) {
  let totalMass = 0;
  const partial = {};
  for (const [el, n] of Object.entries(stoich)) {
    const m = n * AW[el];
    partial[el] = m;
    totalMass += m;
  }
  const out = {};
  for (const [el, m] of Object.entries(partial)) {
    out[el] = (m / totalMass * 100).toFixed(1);
  }
  return out;
}

/* Heuristic name parser: pull all formula candidates from the parens / name.
 *  e.g. "Zirconia (Y-TZP, 3 mol% Y₂O₃, CoorsTek DURA-Z / TZ-3Y-E)" → use main ZrO₂.
 *       "Silicon Nitride (Si₃N₄, HIP'd)" → Si3N4
 *
 *  Returns composition or null. Falls back to manual lookup by name prefix.
 */
const NAME_LOOKUP = {
  /* 일반 명칭 → 주성분 formula. */
  'alumina': 'Al2O3',
  'zirconia': 'ZrO2',
  'silicon nitride': 'Si3N4',
  'silicon carbide': 'SiC',
  'boron carbide': 'B4C',
  'boron nitride': 'BN',
  'tungsten carbide': 'WC',
  'titanium carbide': 'TiC',
  'titanium nitride': 'TiN',
  'titanium diboride': 'TiB2',
  'magnesia': 'MgO',
  'magnesium oxide': 'MgO',
  'yttria': 'Y2O3',
  'ceria': 'CeO2',
  'aluminum nitride': 'AlN',
  'aluminium nitride': 'AlN',
  'hafnia': 'HfO2',
  'mullite': 'Al6Si2O13',  /* 3Al2O3·2SiO2 */
  'cordierite': 'Mg2Al4Si5O18',
  'spinel': 'MgAl2O4',
  'beryllia': 'BeO',
  'silica': 'SiO2',
  'fused silica': 'SiO2',
  'quartz': 'SiO2',
  'sialon': 'Si4Al2O2N6',  /* β-SiAlON typical: Si4Al2O2N6 */
  'mosi2': 'MoSi2',
  'zirconium carbide': 'ZrC',
  'zirconium diboride': 'ZrB2',
  'hafnium carbide': 'HfC',
  'tantalum carbide': 'TaC',
  'tantalum nitride': 'TaN',
  'steatite': 'MgSiO3',  /* enstatite group */
  'sapphire': 'Al2O3',   /* single-crystal Al₂O₃ */
  'diamond': 'C',        /* pure carbon */
  'mica': 'KMg3AlSi3O10F2',  /* fluorophlogopite (Macor base) */
  'macor': 'KMg3AlSi3O10F2', /* glass-ceramic Macor ≈ fluorophlogopite + borosilicate. 근사 */
  'soda-lime': 'Si4Na2CaO11',  /* 근사 72% SiO₂, 14% Na₂O, 9% CaO */
  'borosilicate': 'B2Si4O11',
  'porcelain': 'Al2Si2O7',  /* 근사 (kaolinite-derived) */
};

function deriveComposition(name) {
  /* R159 — Order:
   *   1) Keyword lookup first (예: "Zirconia (Y-TZP, ...)" → ZrO₂ regardless of stabilizer mention).
   *   2) Falls through to formula extraction only for unknown ceramics.
   */
  const lower = name.toLowerCase();
  /* Sort keywords by length DESC — longest match wins (sialon > si, aluminium > al). */
  const sortedKeys = Object.keys(NAME_LOOKUP).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (lower.includes(keyword)) {
      const parsed = parseFormula(NAME_LOOKUP[keyword]);
      if (parsed) return stoichToMassPct(parsed);
    }
  }
  /* 2) Formula extraction inside parens. desub first so ₂→2 etc. */
  const paren = name.match(/\(([^,()]+)/);
  if (paren) {
    const cand = desub(paren[1]).trim();
    /* validate it looks like a formula: starts with capital, only letters/digits */
    if (/^[A-Z][A-Za-z0-9]+$/.test(cand)) {
      const parsed = parseFormula(cand);
      if (parsed) return stoichToMassPct(parsed);
    }
  }
  return null;
}

const file = path.join(DATA, 'ceramics-data.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
let added = 0, skipped = 0;
const skippedNames = [];
for (const c of data.ceramics) {
  if (c.composition && Object.keys(c.composition).length > 0) { continue; /* already has composition */ }
  const comp = deriveComposition(c.name);
  if (comp) {
    c.composition = comp;
    added++;
  } else {
    skipped++;
    skippedNames.push(c.name);
  }
}
console.log(`Ceramic composition derive: ${added} added, ${skipped} skipped`);
if (skipped) {
  console.log('Skipped (no formula match):');
  for (const n of skippedNames) console.log('  - ' + n);
}
if (APPLY) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log('✓ written: ' + file);
} else {
  console.log('(dry-run — pass --apply to write)');
  /* Sample what got added. */
  console.log('\nSample compositions:');
  for (const c of data.ceramics.slice(0, 5)) {
    console.log('  ' + c.name + ' → ' + JSON.stringify(c.composition || {}));
  }
}
