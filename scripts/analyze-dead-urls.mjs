/*
 * R158 — Count broken-URL patterns in source data files.
 * Output: which dead-URL patterns occur in material_db.json + supplementary-materials.json + standard-datasheets.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');

const files = ['material_db.json', 'supplementary-materials.json', 'standard-datasheets.json', 'ceramics-data.json', 'composites-data.json'];

const patterns = [
  ['matweb.com', /matweb\.com\/search\/QuickText\.aspx[^"]*/g],
  ['outokumpu.com/en/forta', /outokumpu\.com\/en\/forta[^"]*/g],
  ['outokumpu.com/en/superduplex', /outokumpu\.com\/en\/superduplex[^"]*/g],
  ['outokumpu.com (other)', /outokumpu\.com\/en\/(?!forta|superduplex)[^"]*/g],
  ['bohler-edelstahl.com', /bohler-edelstahl\.com[^"]*/g],
  ['carpentertechnology.com/alloy-finder', /carpentertechnology\.com\/alloy-finder[^"]*/g],
  ['haynesintl.com', /haynesintl\.com[^"]*/g],
  ['copper.org/resources', /copper\.org\/resources[^"]*/g],
  ['specialmetals.com/documents', /specialmetals\.com\/documents[^"]*/g],
  ['eos.info/en/3d-printing', /eos\.info\/en\/3d-printing[^"]*/g],
  ['astm.org html', /astm\.org\/[^"]*\.html/g],
  ['makeitfrom.com', /makeitfrom\.com\/material-properties[^"]*/g],
  ['nikon-slm-solutions.com/materials', /nikon-slm-solutions\.com\/materials[^"]*/g],
  ['solvay.com', /solvay\.com\/en\/brands\/veradel[^"]*/g],
  ['exxonmobilchemical.com', /exxonmobilchemical\.com[^"]*/g],
  ['hexion.com', /hexion\.com\/en-us\/products\/epoxy-resins[^"]*/g],
];

for (const f of files) {
  const p = path.join(DATA, f);
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8');
  console.log(`\n=== ${f} ===`);
  let total = 0;
  for (const [name, re] of patterns) {
    const m = s.match(re);
    if (m && m.length) {
      console.log(`  ${name.padEnd(40)} ${m.length}`);
      total += m.length;
    }
  }
  console.log(`  ${'TOTAL broken'.padEnd(40)} ${total}`);
}
