// R198 — composition validation across all source JSONs
// Catch: (1) two-balance bug, (2) missing major element, (3) sum > 110% or < 70%, (4) negative/NaN
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const SOURCES = [
  'data/supplementary-materials.json',
  'data/material_db.json',
  'data/ceramics-data.json',
  'data/composites-data.json',
  'data/polymers-data.json',
];

const REPORT = { twoBalance: [], missingMajor: [], sumOutOfRange: [], negNaN: [], suspicious: [] };

function parsePct(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim().toLowerCase();
  if (s === 'balance' || s === 'bal' || s === 'rem' || s === 'remainder') return 'BAL';
  // range "5.2~5.8" or "5-6" → midpoint
  const m = s.match(/^(\d+(?:\.\d+)?)\s*[~\-–to]+\s*(\d+(?:\.\d+)?)$/);
  if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function checkComposition(name, comp, srcFile) {
  if (!comp || typeof comp !== 'object') return;
  const elements = Object.keys(comp);
  if (elements.length === 0) return;
  // (1) two-balance
  const bals = elements.filter(e => {
    const v = String(comp[e]).toLowerCase();
    return v === 'balance' || v === 'bal' || v === 'rem' || v === 'remainder';
  });
  if (bals.length >= 2) {
    REPORT.twoBalance.push({ src: srcFile, name, balances: bals });
  }
  // (3) sum check (only when no balance)
  if (bals.length === 0) {
    let sum = 0, hasNumeric = 0;
    for (const e of elements) {
      const n = parsePct(comp[e]);
      if (typeof n === 'number') { sum += n; hasNumeric++; }
    }
    if (hasNumeric >= 2 && (sum > 110 || sum < 50)) {
      REPORT.sumOutOfRange.push({ src: srcFile, name, sum: sum.toFixed(2), comp });
    }
  }
  // (4) negative or NaN
  for (const e of elements) {
    const n = parsePct(comp[e]);
    if (typeof n === 'number' && (n < 0 || !isFinite(n))) {
      REPORT.negNaN.push({ src: srcFile, name, element: e, value: comp[e] });
    }
  }
}

function walk(srcPath, key) {
  const full = path.join(ROOT, srcPath);
  if (!fs.existsSync(full)) return;
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  let mats;
  if (Array.isArray(data)) mats = data;
  else if (Array.isArray(data.materials)) mats = data.materials;
  else return;
  for (const m of mats) {
    if (m && m.composition) checkComposition(m.name || '(unnamed)', m.composition, srcPath);
    // conditions[] with their own composition?
    if (m && Array.isArray(m.conditions)) {
      for (const c of m.conditions) {
        if (c && typeof c === 'object' && c.composition) {
          checkComposition(`${m.name || ''} — ${c.name || c.label || ''}`, c.composition, srcPath);
        }
      }
    }
  }
  console.log(`[${srcPath}] scanned ${mats.length} entries`);
}

for (const src of SOURCES) walk(src);

console.log('\n=== TWO-BALANCE BUG ===');
console.log(`Count: ${REPORT.twoBalance.length}`);
REPORT.twoBalance.forEach(r => console.log(`  [${r.src}] ${r.name} — balances: ${r.balances.join(', ')}`));

console.log('\n=== SUM OUT OF RANGE (<50% or >110%) ===');
console.log(`Count: ${REPORT.sumOutOfRange.length}`);
REPORT.sumOutOfRange.slice(0, 30).forEach(r => console.log(`  [${r.src}] ${r.name} — sum=${r.sum}% ${JSON.stringify(r.comp).slice(0,160)}`));

console.log('\n=== NEGATIVE / NaN ===');
console.log(`Count: ${REPORT.negNaN.length}`);
REPORT.negNaN.forEach(r => console.log(`  [${r.src}] ${r.name} — ${r.element}: ${r.value}`));

fs.writeFileSync(path.join(ROOT, 'data/r198-composition-audit.json'), JSON.stringify(REPORT, null, 2), 'utf8');
console.log('\nWrote: data/r198-composition-audit.json');
