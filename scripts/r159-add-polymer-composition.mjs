/*
 * R159 — Add per-monomer composition to polymer entries in polymers-data.json.
 *
 * Polymers are organic; "composition" = elemental mass-% from the repeat unit.
 * Filled grades (GF/CF/CA) inherit base polymer composition (filler 영향 미반영).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const APPLY = process.argv.includes('--apply');

const AW = { H: 1.008, B: 10.81, C: 12.01, N: 14.01, O: 16.00, F: 19.00, Si: 28.09, S: 32.07, Cl: 35.45 };

function parseFormula(formula) {
  const re = /([A-Z][a-z]?)(\d*)/g;
  const out = {}; let m;
  while ((m = re.exec(formula)) !== null) {
    const el = m[1]; const n = m[2] ? parseInt(m[2], 10) : 1;
    if (!el) continue;
    if (!AW[el]) return null;
    out[el] = (out[el] || 0) + n;
  }
  return Object.keys(out).length ? out : null;
}

function massPct(stoich) {
  let total = 0; const partial = {};
  for (const [el, n] of Object.entries(stoich)) { partial[el] = n * AW[el]; total += partial[el]; }
  const out = {};
  for (const [el, m] of Object.entries(partial)) out[el] = (m / total * 100).toFixed(1);
  return out;
}

/* Polymer monomer 형식 lookup. subcategory 또는 name keyword 으로 매칭. */
const POLYMER_FORMULA = {
  /* PEEK = poly(ether-ether-ketone). monomer C19H12O3 (per repeat unit) */
  'peek': 'C19H12O3',
  'pekk': 'C23H14O4',
  /* PEI (ULTEM) — bisphenol-A polyetherimide. C37H24N2O6 per repeat. */
  'pei': 'C37H24N2O6', 'ultem': 'C37H24N2O6',
  /* PSU (Udel polysulfone) — C27H22O4S */
  'psu': 'C27H22O4S',
  'ppsu': 'C24H16O2S',
  /* PPS = (C6H4S)n */
  'pps': 'C6H4S',
  /* PA6 (Nylon 6) — (C6H11NO)n */
  'pa6': 'C6H11NO', 'pa 6': 'C6H11NO', 'nylon 6': 'C6H11NO',
  /* PA66 same formula. */
  'pa66': 'C6H11NO', 'pa 66': 'C6H11NO', 'nylon 66': 'C6H11NO', 'pa6/66': 'C6H11NO',
  /* PA12 — (C12H23NO)n */
  'pa12': 'C12H23NO', 'pa 12': 'C12H23NO', 'nylon 12': 'C12H23NO',
  /* PA11 — (C11H21NO)n */
  'pa11': 'C11H21NO', 'pa 11': 'C11H21NO', 'nylon 11': 'C11H21NO',
  /* PA46 — (C10H18N2O2)n */
  'pa46': 'C10H18N2O2',
  /* PPA — high-temp polyamide; close to PA6T (C14H16N2O2). */
  'ppa': 'C14H16N2O2',
  /* Polyimide (Kapton) — (C22H10N2O5)n */
  'polyimide': 'C22H10N2O5', 'vespel': 'C22H10N2O5', 'kapton': 'C22H10N2O5',
  /* POM (acetal) — (CH2O)n */
  'pom': 'CH2O', 'acetal': 'CH2O', 'delrin': 'CH2O', 'hostaform': 'CH2O',
  /* PC (Polycarbonate) — (C16H14O3)n */
  'polycarbonate': 'C16H14O3', 'pc-h': 'C16H14O3', 'pc-l': 'C16H14O3',
  /* PMMA — (C5H8O2)n */
  'pmma': 'C5H8O2', 'acrylic': 'C5H8O2', 'plexiglas': 'C5H8O2',
  /* PET — (C10H8O4)n */
  'pet': 'C10H8O4',
  /* PBT — (C12H12O4)n */
  'pbt': 'C12H12O4',
  /* PVC — (C2H3Cl)n */
  'pvc': 'C2H3Cl',
  /* PP — (C3H6)n */
  'polypropylene': 'C3H6', 'pp ': 'C3H6', 'pp(': 'C3H6',
  /* PE — (C2H4)n */
  'polyethylene': 'C2H4', 'uhmwpe': 'C2H4',
  /* PVDF — (C2H2F2)n */
  'pvdf': 'C2H2F2', 'kynar': 'C2H2F2',
  /* PTFE — (C2F4)n */
  'ptfe': 'C2F4', 'teflon': 'C2F4',
  /* ABS — copolymer; use representative 23/15/62 ratio: ~C8H8 (styrene) dominates. 평균 monomer ≈ C7H7N0.18. 근사 (~C8H8). */
  'abs': 'C8H8',
  /* PS — (C8H8)n */
  'polystyrene': 'C8H8',
  /* Epoxy — bisphenol-A diglycidyl ether C21H24O4 (per repeat unit). */
  'epoxy': 'C21H24O4',
  /* NBR (Nitrile) — copolymer (butadiene C4H6 + acrylonitrile C3H3N), ~33% ACN: mix ≈ C7H9.5N0.5. 근사 (C7H10N0.5 → use C14H19N as integer). 더 정확히는 평균 monomer 다양. */
  'nbr': 'C14H19N', 'nitrile butadiene': 'C14H19N',
  /* HNBR — hydrogenated NBR. similar. */
  'hnbr': 'C14H21N', 'hydrogenated nitrile': 'C14H21N',
  /* TPU (Thermoplastic PU) — varies; representative MDI-based ester: (C25H38N2O7)n. */
  'tpu': 'C25H38N2O7', 'polyurethane': 'C25H38N2O7',
  /* PLA — (C3H4O2)n */
  'pla': 'C3H4O2',
  /* Polyester resin (UPR) — typical: (C8H8O3)n */
  'polyester resin': 'C8H8O3', 'upr': 'C8H8O3',
  /* PSU Eviva — similar to PSU. */
  'eviva': 'C27H22O4S',
  /* Stanyl (DSM) = PA46. */
  'stanyl': 'C10H18N2O2',
  /* Veradel = PES (Polyethersulfone) — (C12H8O3S)n */
  'pes': 'C12H8O3S', 'veradel': 'C12H8O3S',
  /* LCP (liquid crystal polymer) — Vectra approx (C14H8O4)n */
  'lcp': 'C14H8O4', 'vectra': 'C14H8O4',
  /* PSU clear (eviva) covered. */
  /* PMI structural foam (Rohacell): (C5H7NO)n */
  'rohacell': 'C5H7NO', 'pmi': 'C5H7NO',
  /* ASA — close to ABS (acrylate-modified styrene). C8H8 평균. */
  'asa': 'C8H8',
  /* PAI (Torlon) — C15H8N2O3 */
  'pai': 'C15H8N2O3', 'torlon': 'C15H8N2O3',
  /* ETFE — copolymer (C2H4 + C2F4) → C4H4F4 / 2 = C2H2F2 평균. 정확히는 C4H4F4 monomer (alternating). */
  'etfe': 'C4H4F4',
  /* PC-CF, PC-H, PC-L 등 PC 계 — already covered by 'polycarbonate'. */
  /* Onyx (CF nylon) — falls under polyamide. add 'onyx' shortcut. */
  'onyx': 'C6H11NO',
  /* PCL (polycaprolactone) — (C6H10O2)n */
  'pcl': 'C6H10O2', 'polycaprolactone': 'C6H10O2',
  /* EVA (ethylene-vinyl-acetate) — (C4H6O)n typical 18% VA. */
  'eva': 'C4H6O',
  /* PVB (polyvinyl butyral) — (C8H14O2)n */
  'pvb': 'C8H14O2',
  /* PBI (Celazole) — (C20H12N4)n */
  'pbi': 'C20H12N4', 'celazole': 'C20H12N4',
  /* PETG (PET-Glycol modified) — slightly different from PET, use same formula. */
  'petg': 'C10H8O4',
  /* PC-CF (carbon-fiber polycarbonate) — base PC formula. */
  'pc-cf': 'C16H14O3',
};

/* Sort keywords by length DESC (longest match wins). */
const sortedKeys = Object.keys(POLYMER_FORMULA).sort((a, b) => b.length - a.length);

/* Generic processor — receives entry list, derives composition per entry. Returns {added, skipped, names}. */
function processList(list) {
  let added = 0, skipped = 0;
  const names = [];
  for (const p of list) {
    if (p.composition && Object.keys(p.composition).length > 0) continue;
    const haystack = ((p.subcategory || '') + ' ' + (p.name || '')).toLowerCase();
    let formula = null;
    for (const k of sortedKeys) {
      if (haystack.includes(k)) { formula = POLYMER_FORMULA[k]; break; }
    }
    if (!formula) { skipped++; names.push(p.name); continue; }
    const stoich = parseFormula(formula);
    if (!stoich) { skipped++; names.push(p.name + ' (formula ' + formula + ' invalid)'); continue; }
    p.composition = massPct(stoich);
    added++;
  }
  return { added, skipped, names };
}

/* 1) polymers-data.json (39 entries). */
{
  const file = path.join(DATA, 'polymers-data.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = processList(data.polymers);
  console.log(`polymers-data.json: ${r.added} added, ${r.skipped} skipped`);
  if (r.skipped) for (const n of r.names) console.log('  skip: ' + n);
  if (APPLY) fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* 2) supplementary-materials.json — only `materials[]` where category=='Polymer'. */
{
  const file = path.join(DATA, 'supplementary-materials.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const polymers = data.materials.filter(m => m.category === 'Polymer');
  const r = processList(polymers);
  console.log(`supplementary-materials.json (polymers): ${r.added} added, ${r.skipped} skipped`);
  if (r.skipped) for (const n of r.names) console.log('  skip: ' + n);
  if (APPLY) fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

if (!APPLY) console.log('\n(dry-run — pass --apply to write)');
else console.log('✓ all files written');
