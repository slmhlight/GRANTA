/*
 * R158 — Revert the URL substitutions that ended up landing on 404 pages.
 * These "fixes" replaced a working-or-redirected URL with one that's directly 404.
 * Reverting them keeps the original — which at least gives a 30x signal to the user.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const APPLY = process.argv.includes('--apply');

const REVERTS = [
  // Velo3D: my fix dropped trailing /, but final lands at 404. Revert to original (which 30x then 404 — same end state but cleaner trail).
  { from: 'https://www.velo3d.com/material-data-sheets', to: 'https://velo3d.com/material-data-sheets/' },
  // DIN Media without slash → 404. Revert to original beuth.de URL.
  { from: 'https://www.dinmedia.de/en/standard/din-en-10084', to: 'https://www.beuth.de/en/standard/din-en-10084/' },
  { from: 'https://www.dinmedia.de/en/standard/din-en-10083-3', to: 'https://www.beuth.de/en/standard/din-en-10083-3/' },
  // Hexion epoxy 404 — revert
  { from: 'https://www.hexion.com/products/epoxy', to: 'https://www.hexion.com/en-us/products/epoxy-resins' },
  // EOS /3d-printing-materials/plastic 404 — revert
  { from: 'https://www.eos.info/3d-printing-materials/plastic', to: 'https://www.eos.info/en-us/3d-printing-materials/plastic' },
  // BASF Ultramid (.html) 404 — revert
  { from: 'https://www.basf.com/global/en/products/plastics/engineering-plastics/ultramid', to: 'https://www.basf.com/global/en/products/plastics/engineering-plastics/ultramid.html' },
  { from: 'https://www.basf.com/global/en/products/plastics/eviva', to: 'https://www.basf.com/global/en/products/plastics/eviva.html' },
  { from: 'https://www.basf.com/global/en/performance-polymers/products/ultramid', to: 'https://plastics-rubber.basf.com/global/en/performance-polymers/products/ultramid.html' },
  // Materion c17200 404 — revert
  { from: 'https://www.materion.com/products/alloys-and-composites/copper-beryllium/c17200', to: 'https://materion.com/products/alloys-and-composites/copper-beryllium/c17200' },
  // Lubrizol /engineered-polymers (lowercase) → 다른 제품 redirect — revert
  { from: 'https://www.lubrizol.com/engineered-polymers', to: 'https://www.lubrizol.com/Engineered-Polymers' },
  // DuPont Delrin .com (bot-blocked + 404) — revert
  { from: 'https://www.delrin.com', to: 'https://www.dupont.com/products/delrin.html' },
  // ASTM IDs that 404 after store redirect (specific spec numbers)
  { from: 'https://store.astm.org/b0708-21.html', to: 'https://www.astm.org/b0708-21.html' },
  { from: 'https://store.astm.org/b0652_b0652m-18.html', to: 'https://www.astm.org/b0652_b0652m-18.html' },
  { from: 'https://store.astm.org/a0336_a0336m-22.html', to: 'https://www.astm.org/a0336_a0336m-22.html' },
];

const FILES = ['material_db.json', 'supplementary-materials.json', 'standard-datasheets.json', 'ceramics-data.json', 'composites-data.json'];

let total = 0;
const log = [];
for (const f of FILES) {
  const p = path.join(DATA, f);
  if (!fs.existsSync(p)) continue;
  let cur = fs.readFileSync(p, 'utf8');
  let fileTotal = 0;
  for (const r of REVERTS) {
    const esc = r.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(esc, 'g');
    const c = (cur.match(re) || []).length;
    if (c) {
      cur = cur.replace(re, r.to);
      log.push(`  ${f}  ${c}×  revert ${r.from.slice(0, 65)} → ${r.to.slice(0, 60)}`);
      fileTotal += c;
    }
  }
  if (fileTotal && APPLY) {
    try { JSON.parse(cur); } catch (e) { console.error(`✗ ${f}: ${e.message}`); process.exit(1); }
    fs.writeFileSync(p, cur);
    log.push(`✓ ${f}: ${fileTotal} reverts written`);
  }
  total += fileTotal;
}
console.log(log.join('\n'));
console.log(`\nTotal reverts: ${total} ${APPLY ? '(written)' : '(dry-run)'}`);
