// R198b — broader composition audit (improved parser + base-element heuristic)
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

const REPORT = {
  twoBalance: [],
  baseMissing: [],   // category suggests base element but missing/0
  sumOutOfRange: [],
  densityMismatch: [],
};

function parsePct(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim().toLowerCase().replace(/\s+/g,'');
  if (s === 'balance' || s === 'bal' || s === 'rem' || s === 'remainder') return 'BAL';
  // ≥58 or ≤5 — use the bound as approx
  let m = s.match(/^[≥>=]+\s*(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]);
  m = s.match(/^[≤<=]+\s*(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]) / 2; // upper bound only; assume midpoint
  // "5 min" / "5 max"
  m = s.match(/^(\d+(?:\.\d+)?)\s*(min|max)?$/);
  if (m) return parseFloat(m[1]);
  // range a~b or a-b or atob
  m = s.match(/^(\d+(?:\.\d+)?)[~\-–]+(\d+(?:\.\d+)?)$/);
  if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Map subcategory/name keywords to expected base element
function expectedBase(m) {
  const subcat = (m.subcategory || '').toLowerCase();
  const name = (m.name || '').toLowerCase();
  const combined = subcat + ' ' + name;
  if (/aluminum|aluminium|aa\b|al-/.test(combined)) return 'Al';
  if (/copper|brass|bronze|cuni|cube|c1\d|c2\d|c3\d|c4\d|c5\d|c6\d|c7\d|c8\d|c9\d/.test(combined)) return 'Cu';
  if (/titanium|ti-|ti6|ti grade|ti alloy/.test(combined)) return 'Ti';
  if (/magnesium|az\d|mg-/.test(combined)) return 'Mg';
  if (/nickel|inconel|hastelloy|monel|incoloy|nimonic|waspaloy|haynes|rene|cmsx|udimet/.test(combined)) return 'Ni';
  if (/steel|stainless|sus\d|aisi|sae|s\d{3}|sa\d|astm a|p91|p92|p355|p460|en s\d|s235|s275|s355|s460/.test(combined) && !/stainless.*duplex/.test(combined)) return 'Fe';
  if (/cobalt|stellite|cocrmo|cocr\b/.test(combined)) return 'Co';
  if (/zinc|zamak/.test(combined)) return 'Zn';
  if (/tungsten\b|^w\b/.test(combined)) return 'W';
  if (/molybdenum|^mo\b/.test(combined)) return 'Mo';
  if (/tantalum|^ta\b/.test(combined)) return 'Ta';
  if (/niobium|^nb\b/.test(combined)) return 'Nb';
  if (/zirconium|zircaloy/.test(combined)) return 'Zr';
  return null;
}

// Density sanity by family
function densityRange(m) {
  const cat = (m.category || '').toLowerCase();
  const sub = (m.subcategory || '').toLowerCase();
  const combined = cat + ' ' + sub + ' ' + (m.name||'').toLowerCase();
  if (/polymer|plastic|nylon|peek|pps|abs|pet|pp\b|pe\b|pvc|polycarbonate|polystyrene|epoxy|rubber|elastomer|tpu|tpe|silicone/.test(combined)) return [0.8, 2.5];
  if (/ceramic|alumina|zirconia|silicon (carbide|nitride)|boron carbide|wc-co|cermet/.test(combined)) return [2.0, 15];
  if (/composite|cfrp|gfrp|smc|bmc|kevlar|aramid/.test(combined)) return [1.0, 2.5];
  if (/foam|honeycomb|sandwich/.test(combined)) return [0.02, 1.0];
  if (/aluminum|aluminium|magnesium/.test(combined)) return [1.5, 3.5];
  if (/titanium/.test(combined)) return [4.0, 5.5];
  if (/copper|brass|bronze/.test(combined)) return [7.0, 9.5];
  if (/stainless|nickel|inconel|hastelloy|monel|incoloy|steel|iron|cobalt/.test(combined)) return [6.5, 9.5];
  if (/tungsten|^w\b/.test(combined)) return [16, 19.5];
  if (/molybdenum/.test(combined)) return [9, 11];
  if (/tantalum/.test(combined)) return [15, 17];
  if (/zirconium|zircaloy/.test(combined)) return [6.0, 7.5];
  return null;
}

function checkMaterial(m, srcFile) {
  const name = m.name || '(unnamed)';
  const comp = m.composition;
  if (comp && typeof comp === 'object') {
    const elements = Object.keys(comp);
    // (1) two-balance
    const bals = elements.filter(e => /^(balance|bal|rem|remainder)$/i.test(String(comp[e]).trim()));
    if (bals.length >= 2) {
      REPORT.twoBalance.push({ src: srcFile, name, balances: bals, comp });
    }
    // (2) base element check
    const base = expectedBase(m);
    if (base && elements.length > 0) {
      const hasBase = elements.some(e => e.toLowerCase() === base.toLowerCase());
      if (!hasBase) {
        REPORT.baseMissing.push({ src: srcFile, name, expected: base, present: elements });
      } else {
        const baseKey = elements.find(e => e.toLowerCase() === base.toLowerCase());
        const baseVal = comp[baseKey];
        const baseNum = parsePct(baseVal);
        if (baseNum !== 'BAL' && typeof baseNum === 'number' && baseNum < 30 && !(baseNum >= 5 && /Fe.*alloy|low.*alloy|stainless.*duplex/i.test(name))) {
          // For Cu-base brass etc, base should be >40% typically; this is a soft check
          if (baseNum < 30) REPORT.baseMissing.push({ src: srcFile, name, expected: base, lowValue: baseVal, present: elements });
        }
      }
    }
    // (3) sum check
    if (bals.length === 0) {
      let sum = 0, hasNumeric = 0;
      for (const e of elements) {
        const n = parsePct(comp[e]);
        if (typeof n === 'number') { sum += n; hasNumeric++; }
      }
      if (hasNumeric >= 2 && (sum > 115 || sum < 50)) {
        REPORT.sumOutOfRange.push({ src: srcFile, name, sum: sum.toFixed(2), comp });
      }
    }
  }
  // (4) density sanity
  const dens = m.density || (m.ranges && m.ranges.density && m.ranges.density.typical);
  if (typeof dens === 'number' && dens > 0) {
    const range = densityRange(m);
    if (range && (dens < range[0] * 0.85 || dens > range[1] * 1.15)) {
      REPORT.densityMismatch.push({ src: srcFile, name, density: dens, expected: `${range[0]}-${range[1]}` });
    }
  }
}

function normalizeComp(c) {
  // Array of pairs → object
  if (Array.isArray(c)) {
    const o = {};
    for (const p of c) {
      if (Array.isArray(p) && p.length >= 2) o[p[0]] = p[1];
    }
    return o;
  }
  return c;
}

function walk(srcPath) {
  const full = path.join(ROOT, srcPath);
  if (!fs.existsSync(full)) return;
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  let mats;
  if (Array.isArray(data)) mats = data;
  else if (Array.isArray(data.materials)) mats = data.materials;
  else if (data.materials && typeof data.materials === 'object') {
    mats = Object.entries(data.materials).map(([name, v]) => ({ name, ...v, composition: normalizeComp(v.composition) }));
  } else if (Array.isArray(data.ceramics)) mats = data.ceramics;
  else if (Array.isArray(data.composites)) mats = data.composites;
  else if (Array.isArray(data.polymers)) mats = data.polymers;
  else mats = [];
  for (const m of mats) {
    if (m && Array.isArray(m.composition)) m.composition = normalizeComp(m.composition);
    checkMaterial(m, srcPath);
  }
  console.log(`[${srcPath}] scanned ${mats.length}`);
}

for (const src of SOURCES) walk(src);

console.log('\n=== TWO-BALANCE ===', REPORT.twoBalance.length);
REPORT.twoBalance.forEach(r => console.log(`  [${r.src}] ${r.name} — ${r.balances.join('+')}`));

console.log('\n=== BASE ELEMENT MISSING/LOW ===', REPORT.baseMissing.length);
REPORT.baseMissing.slice(0, 30).forEach(r => {
  if (r.expected) console.log(`  [${r.src}] ${r.name} — expected ${r.expected}, ${r.lowValue ? `lowValue=${r.lowValue}` : `present=[${r.present.join(',')}]`}`);
});

console.log('\n=== SUM OUT OF RANGE ===', REPORT.sumOutOfRange.length);
REPORT.sumOutOfRange.slice(0, 30).forEach(r => console.log(`  [${r.src}] ${r.name} — sum=${r.sum}%`));

console.log('\n=== DENSITY MISMATCH ===', REPORT.densityMismatch.length);
REPORT.densityMismatch.slice(0, 30).forEach(r => console.log(`  [${r.src}] ${r.name} — ρ=${r.density} (expected ${r.expected})`));

fs.writeFileSync(path.join(ROOT, 'data/r198-composition-audit.json'), JSON.stringify(REPORT, null, 2), 'utf8');
console.log('\nFull report: data/r198-composition-audit.json');
