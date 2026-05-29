/*
 * AM Materials Explorer — data build pipeline (v3)
 *
 * Three tiers, no fabricated data:
 *   • curated   ← material_db.json (46 AM alloys; ranges from heat_treatments ×
 *                 build-direction × vendors; composition ranges; verified ref_urls)
 *   • am_vendor ← CSV vendor/AM rows whose alloy is NOT in the curated db
 *                 (e.g. 304L, 15-5PH, Ti5-8-5, Inconel X-750, Bronze)
 *   • generic   ← CSV "Generic" conventional rows grouped by base alloy → range across tempers
 *
 * Property → {min, max, typical, n}. Integrity fixes: process-label canonicalisation,
 * AA-series subcategory correction, placeholder cleanup. Emits preview + validation report.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');

// ───────── helpers ─────────
function parseCSV(text) {
  const rows = []; let field = '', record = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { record.push(field); field = ''; }
    else if (c === '\n') { record.push(field); rows.push(record); record = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || record.length) { record.push(field); rows.push(record); }
  return rows;
}
const num = v => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const baseName = n => String(n).split(' (')[0].trim();
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const round = (x, d = 2) => x == null ? null : Math.round(x * 10 ** d) / 10 ** d;
function rangeFrom(values) {
  const vals = values.map(num).filter(v => v != null && v > 0).sort((a, b) => a - b);
  if (!vals.length) return null;
  return { min: round(vals[0]), max: round(vals[vals.length - 1]), typical: round(vals[Math.floor(vals.length / 2)]), n: vals.length };
}
const uniq = a => [...new Set(a.filter(Boolean))];
const mostCommon = arr => { const c = {}; let best = arr[0], n = 0; for (const x of arr) { c[x] = (c[x] || 0) + 1; if (c[x] > n) { n = c[x]; best = x; } } return best; };

// generic/am_vendor source enrichment — verifiable references, NOT fabricated per-material datasheets
const matwebSearch = (name) => ({ label: `MatWeb — search "${name}"`, url: `https://www.matweb.com/search/QuickText.aspx?SearchText=${encodeURIComponent(name)}`, verified: false });
function familyHandbook(category, subcategory) {
  if (category === 'Polymer') return { label: 'ASM Engineered Materials Handbook, Vol. 2: Engineering Plastics', url: null, verified: false };
  const sc = String(subcategory || '').toLowerCase();
  if (sc.includes('alumin')) return { label: 'ASM Handbook Vol. 2 (Nonferrous) · Aluminum Association designations', url: null, verified: false };
  if (sc.includes('steel') || sc.includes('iron')) return { label: 'ASM Handbook Vol. 1: Irons, Steels & High-Performance Alloys', url: null, verified: false };
  return { label: 'ASM Handbook Vol. 2: Properties & Selection: Nonferrous Alloys', url: null, verified: false };
}
const dedupeSources = (arr) => { const seen = new Set(); return arr.filter(s => s && s.label && !seen.has(s.label) && seen.add(s.label)); };
const mostCommonKnown = (arr) => { const v = arr.filter(x => x && x !== 'Unknown' && x !== '0'); return v.length ? mostCommon(v) : null; };

// multi-family auto-tagging — one material can belong to several families
const ELEMENT_FAMILY = [['Fe', 'Iron-based'], ['Al', 'Aluminum-based'], ['Ni', 'Nickel-based'], ['Ti', 'Titanium-based'], ['Co', 'Cobalt-based'], ['Cu', 'Copper-based'], ['Mg', 'Magnesium-based'], ['W', 'Refractory'], ['Ta', 'Refractory'], ['Nb', 'Refractory']];
function dominantElement(composition) {
  let best = null, bestVal = -1;
  for (const [el, v] of Object.entries(composition || {})) {
    let val; if (v === 'balance') val = 100; else { const mm = String(v).match(/[\d.]+/g); val = mm ? Math.max(...mm.map(Number)) : 0; }
    if (val > bestVal) { bestVal = val; best = el; }
  }
  return best;
}
function familyTags(category, subcategory, composition) {
  const tags = new Set();
  if (category) tags.add(category);
  if (subcategory) tags.add(subcategory);
  if (category !== 'Polymer') {
    const fam = (ELEMENT_FAMILY.find(([e]) => e === dominantElement(composition)) || [])[1];
    if (fam) tags.add(fam);
  }
  const s = String(subcategory || '').toLowerCase();
  if (s.includes('stainless')) tags.add('Stainless Steel');
  if (s.includes('austenit')) tags.add('Austenitic');
  if (s.includes('superalloy') || s.includes('inconel') || s.includes('nickel')) tags.add('Superalloy');
  if (s.includes('tool')) tags.add('Tool Steel');
  return Array.from(tags);
}

const NUM_PROPS = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity', 'fatigue_strength', 'impact_strength'];
const ELEMENTS = ['C', 'O', 'Fe', 'Cr', 'Ni', 'Mo', 'Mn', 'Si', 'Cu', 'Al', 'Ti', 'V', 'Co', 'W', 'Nb', 'N', 'P', 'S', 'Mg', 'Zn', 'Sn', 'Be', 'Ta', 'La', 'Ce'];
const AM_PROC = new Set(['LPBF', 'DMLS', 'SLM', 'EBM', 'Binder Jetting', 'SLS', 'MJF', 'DED', 'Powder', 'Directed Energy Deposition']);
const PROCESS_CANON = { 'Casting': 'Cast', 'Die Casting': 'Cast', 'Sand Casting': 'Cast', 'Investment Casting': 'Cast', 'Cast/Wrought': 'Wrought' };
const dbCatToSub = { 'Stainless Steel': 'Stainless Steel', 'Tool Steel': 'Tool Steel', 'Alloy Steel': 'Alloy Steel', 'Maraging Steel': 'Maraging Steel', 'Titanium': 'Titanium', 'Aluminum': 'Aluminum', 'Nickel': 'Nickel Superalloy', 'Cobalt': 'Cobalt-Chrome Alloy', 'Copper': 'Copper', 'Refractory': 'Refractory Metal' };

// vendor/class prefix stripper → true alloy designation
const VENDOR_PREFIXES = ['3D Systems', 'EOS', 'Renishaw', 'Nikon SLM Solutions', 'Nikon SLM', 'SLM Solutions', 'GE Additive', 'ExOne', 'Farsoon', 'Trumpf', 'Huake 3D', 'Huake', 'Colibrium'];
const CLASS_WORDS = ['Stainless Steel', 'Stainless', 'Titanium', 'Aluminium', 'Aluminum', 'Nickel Alloy', 'Nickel', 'Copper', 'Cobalt Chrome', 'Cobalt-Chrome', 'Bronze', 'Steel', 'Alloy'];
function alloyOf(name) {
  let s = baseName(name);
  for (const v of VENDOR_PREFIXES) if (s.toLowerCase().startsWith(v.toLowerCase())) { s = s.slice(v.length).trim(); break; }
  let changed = true;
  while (changed) { changed = false; for (const w of CLASS_WORDS) { if (s.toLowerCase().startsWith(w.toLowerCase() + ' ')) { s = s.slice(w.length).trim(); changed = true; } } }
  return s || baseName(name);
}
// AA aluminium series → app subcategory
function aaSubcategory(name) {
  const m = baseName(name).match(/^AA\s*(\d)\d{3}/i);
  if (!m) return null;
  return { '1': 'Aluminum - Pure/Other', '2': 'Aluminum - Cu Alloys (2xxx)', '3': 'Aluminum - Mn Alloys (3xxx)', '5': 'Aluminum - Mg Alloys (5xxx)', '6': 'Aluminum - Si Alloys (6xxx/7xxx)', '7': 'Aluminum - Si Alloys (6xxx/7xxx)', '8': 'Aluminum - Pure/Other' }[m[1]] || null;
}

// ── cross-standard designations (widely-published equivalents; conservative, not fabricated) ──
const ALIAS_MAP = {
  '316l': ['UNS S31603', 'EN 1.4404', 'X2CrNiMo17-12-2', 'JIS SUS316L', 'KS STS316L'],
  '304l': ['UNS S30403', 'EN 1.4307', 'X2CrNi18-9', 'JIS SUS304L', 'KS STS304L'],
  '174ph': ['UNS S17400', 'EN 1.4542', 'AISI 630', 'JIS SUS630', 'KS STS630'],
  '155ph': ['UNS S15500', 'EN 1.4545', 'XM-12'],
  '420': ['UNS S42000', 'EN 1.4021', 'JIS SUS420J2', 'KS STS420J2'],
  'ti6al4v': ['UNS R56400', 'ASTM Grade 5', 'DIN 3.7165', 'Gr23 ELI (R56407)'],
  'ticpgr1': ['UNS R50250', 'ASTM Grade 1'],
  'ticpgr2': ['UNS R50400', 'ASTM Grade 2'],
  'alsi10mg': ['EN AC-43000', 'EN AC-AlSi10Mg', 'DIN 3.2381'],
  'alsi7mg': ['EN AC-42000', 'AlSi7Mg', 'A356 (cast equiv.)'],
  'al12si': ['EN AC-44000', 'AlSi12', 'A413 (cast equiv.)'],
  'inconel625': ['UNS N06625', 'EN 2.4856', 'NiCr22Mo9Nb', 'Alloy 625'],
  'inconel718': ['UNS N07718', 'EN 2.4668', 'Alloy 718', 'AMS 5662'],
  'inconel738': ['IN738', 'IN-738LC'],
  'inconel939': ['IN939'],
  'inconel600': ['UNS N06600', 'EN 2.4816', 'Alloy 600'],
  'inconelx750': ['UNS N07750', 'EN 2.4669', 'Alloy X-750'],
  'hastelloyc22': ['UNS N06022', 'EN 2.4602', 'Alloy C-22'],
  'haynes282': ['UNS N07208'],
  'haynes214': ['UNS N07214'],
  'monelk500': ['UNS N05500', 'EN 2.4375', 'Alloy K-500'],
  'cocr': ['CoCrMo', 'ASTM F75', 'UNS R30075', 'Co-28Cr-6Mo'],
  'h13': ['DIN 1.2344', 'X40CrMoV5-1', 'JIS SKD61', 'KS STD61', 'AISI H13'],
  'maragingsteel': ['18Ni-300', 'DIN 1.2709', 'UNS K93120'],
  'invar36': ['UNS K93600', 'EN 1.3912', 'FeNi36', 'Nilo 36'],
  'aa6061': ['UNS A96061', 'EN AW-6061', 'AlMg1SiCu', 'DIN 3.3211'],
  'aa7075': ['UNS A97075', 'EN AW-7075', 'AlZn5.5MgCu', 'DIN 3.4365'],
  'aa2024': ['UNS A92024', 'EN AW-2024', 'AlCu4Mg1', 'DIN 3.1355'],
  'aa5052': ['UNS A95052', 'EN AW-5052', 'AlMg2.5'],
  'aa6082': ['UNS A96082', 'EN AW-6082', 'AlSi1MgMn'],
  'tantalum': ['Ta', 'UNS R05200'],
  'cucr1zr': ['UNS C18150', 'EN CW106C', 'CuCrZr'],
  // conventional alloy/carbon steels (AISI/SAE)
  '4140': ['UNS G41400', 'DIN 1.7225', '42CrMo4', 'JIS SCM440', 'EN19', 'GB 42CrMo'],
  '42crmo4': ['AISI 4140', 'UNS G41400', 'DIN 1.7225', 'JIS SCM440'],
  '4340': ['UNS G43400', 'DIN 1.6582', '34CrNiMo6', 'JIS SNCM439'],
  '4130': ['UNS G41300', 'DIN 1.7218', '25CrMo4', 'JIS SCM430'],
  '8620': ['UNS G86200', 'DIN 1.6523', '21NiCrMo2', 'JIS SNCM220'],
  '5140': ['UNS G51400', 'DIN 1.7035', '41Cr4', 'JIS SCr440'],
  '6150': ['UNS G61500', 'DIN 1.8159', '51CrV4', 'JIS SUP10'],
  '1045': ['UNS G10450', 'DIN 1.1191', 'C45', 'JIS S45C', 'KS SM45C'],
  '20mncr5': ['DIN 1.7147', '20MnCr5', 'JIS SMnC420'],
  // stainless (non-L grades)
  '304': ['UNS S30400', 'EN 1.4301', 'X5CrNi18-10', 'JIS SUS304', 'KS STS304'],
  '316': ['UNS S31600', 'EN 1.4401', 'X5CrNiMo17-12-2', 'JIS SUS316', 'KS STS316'],
  '410': ['UNS S41000', 'EN 1.4006', 'X12Cr13', 'JIS SUS410', 'KS STS410'],
  '430': ['UNS S43000', 'EN 1.4016', 'X6Cr17', 'JIS SUS430'],
  '254smo': ['UNS S31254', 'EN 1.4547', '254 SMO'],
  'superduplex': ['UNS S32750', 'EN 1.4410', '2507', 'SAF 2507'],
  // titanium / nickel
  'ti6242': ['Ti-6Al-2Sn-4Zr-2Mo', 'UNS R54620'],
  'cm247lc': ['CM247LC', 'MAR-M247'],
  'cpnickel': ['Nickel 200', 'UNS N02200'],
  'cuni30': ['UNS C71500', 'CuNi30Mn1Fe', 'CW354H'],
  // aluminium
  'aa1050': ['UNS A91050', 'EN AW-1050A', 'Al99.5'],
  'aa2014': ['UNS A92014', 'EN AW-2014', 'AlCu4SiMg'],
  'aa2219': ['UNS A92219', 'EN AW-2219', 'AlCu6Mn'],
  'aa7050': ['UNS A97050', 'EN AW-7050'],
  'aa5083': ['UNS A95083', 'EN AW-5083', 'AlMg4.5Mn0.7'],
  'aa3003': ['UNS A93003', 'EN AW-3003', 'AlMn1Cu'],
  // magnesium / refractory
  'az91d': ['UNS M11916', 'MgAl9Zn1'],
  'az80a': ['MgAl8Zn'],
  'tungsten': ['W', 'Pure tungsten 99.95'],
};
function extractAliases(name) {
  const out = [];
  for (const p of String(name).match(/\(([^)]+)\)/g) || []) {
    for (const tok of p.slice(1, -1).split(/[/,]/).map((t) => t.trim())) {
      if (tok.length >= 2 && /\d/.test(tok) && !/°|aged|anneal|temper|built|quench|solution|stress|^h\d+$|^t\d+$|^o$/i.test(tok)) out.push(tok);
    }
  }
  return out;
}
function aliasesFor(name) {
  const set = new Set(extractAliases(name));
  const keys = new Set([norm(alloyOf(name)), norm(baseName(name))]);
  for (const tok of String(name).split(/[\s(),/]+/)) if (/\d/.test(tok)) keys.add(norm(tok));
  for (const k of keys) (ALIAS_MAP[k] || []).forEach((a) => set.add(a));
  return Array.from(set);
}

// established qualitative ratings for well-known alloys (textbook engineering facts, not fabricated)
const QUAL_MAP = {
  '316l': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },
  '304l': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },
  '174ph': { corrosion: 'Good', machinability: 'Fair', weldability: 'Good' },
  '155ph': { corrosion: 'Good', machinability: 'Fair', weldability: 'Good' },
  '420': { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Poor' },
  'ti6al4v': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },
  'alsi10mg': { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },
  'alsi7mg': { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },
  'inconel625': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Excellent' },
  'inconel718': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },
  'inconel600': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  'hastelloyc22': { corrosion: 'Outstanding', machinability: 'Poor', weldability: 'Good' },
  'cocr': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },
  'h13': { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Fair' },
  'maragingsteel': { corrosion: 'Moderate', machinability: 'Good', weldability: 'Excellent' },
  'aa6061': { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },
  'aa7075': { corrosion: 'Moderate', machinability: 'Good', weldability: 'Poor' },
  'aa2024': { corrosion: 'Moderate', machinability: 'Good', weldability: 'Poor' },
  'cucr1zr': { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },
  'tantalum': { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },
};
function qualFor(name) {
  const keys = new Set([norm(alloyOf(name)), norm(baseName(name))]);
  for (const tok of String(name).split(/[\s(),/]+/)) if (/\d/.test(tok)) keys.add(norm(tok));
  for (const k of keys) if (QUAL_MAP[k]) return QUAL_MAP[k];
  return null;
}

// ───────── load ─────────
const csvMatrix = parseCSV(fs.readFileSync(path.join(DATA, 'AM_Materials_DB_enriched.csv'), 'utf8')).filter(r => r.length > 1);
const header = csvMatrix[0];
const csvRowsRaw = csvMatrix.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
const csvRows = csvRowsRaw.filter(r => r.material_name && r.material_name !== '0' && /[A-Za-z]/.test(r.material_name) && r.category && r.category !== '0');
const garbageRemoved = csvRowsRaw.length - csvRows.length;
const db = JSON.parse(fs.readFileSync(path.join(DATA, 'material_db.json'), 'utf8'));
const dbKeys = Object.keys(db.materials);

// ───────── curated tier ─────────
const curatedAlias = new Set();
function addAliases(key, m) {
  curatedAlias.add(norm(key)); curatedAlias.add(norm(alloyOf(key)));
  if (m._original_name) curatedAlias.add(norm(alloyOf(m._original_name)));
  if (m.composition_family) curatedAlias.add(norm(m.composition_family.replace(/_family$/, '')));
  for (const tok of String(key).split(/[\s(),/]+/)) if (/\d/.test(tok) && tok.length >= 2) curatedAlias.add(norm(tok));
}
function curatedSources(m) {
  const out = [];
  for (const pair of (m.ref_urls || [])) if (Array.isArray(pair)) out.push({ label: pair[0], url: pair[1], verified: true });
  for (const v of Object.values(m.vendors || {})) if (v.tds_link) out.push({ label: v.data_source || v.manufacturer || 'Vendor TDS', url: v.tds_link, verified: !!v._tds_verified });
  const seen = new Set();
  return out.filter(s => s.url && !seen.has(s.url) && seen.add(s.url));
}
function curatedRanges(m) {
  const pts = { yield_strength: [], uts: [], elongation: [], hardness: [], modulus: [], density: [], thermal_conductivity: [], fatigue_strength: [], impact_strength: [] };
  if (m.E != null) pts.modulus.push(m.E);
  if (m.density != null) pts.density.push(m.density);
  if (m.thermal_k != null) pts.thermal_conductivity.push(m.thermal_k);
  for (const ht of Object.values(m.heat_treatments || {})) {
    pts.yield_strength.push(ht.ys, ht.ys_z); pts.uts.push(ht.uts, ht.uts_z);
    pts.elongation.push(ht.elong, ht.elong_z); pts.hardness.push(ht.hardness_HV);
  }
  for (const v of Object.values(m.vendors || {})) {
    pts.yield_strength.push(v.yield_MPa, v.yield_z_MPa); pts.uts.push(v.uts_xy_MPa, v.uts_z_MPa);
    pts.elongation.push(v.elongation_pct, v.elongation_xy_pct, v.elongation_z_pct); pts.hardness.push(v.hardness_HV);
    const vr = v._value_ranges || {};
    if (vr.yield_MPa_z) pts.yield_strength.push(...vr.yield_MPa_z);
    if (vr.tensile_MPa_xy) pts.uts.push(...vr.tensile_MPa_xy);
    if (vr.tensile_MPa_z) pts.uts.push(...vr.tensile_MPa_z);
    if (vr.elongation_pct_xy) pts.elongation.push(...vr.elongation_pct_xy);
    if (vr.elongation_pct_z) pts.elongation.push(...vr.elongation_pct_z);
  }
  const ranges = {};
  for (const p of NUM_PROPS) ranges[p] = rangeFrom(pts[p]);
  return ranges;
}
function prettyHT(k) {
  const map = { as_built: 'As-built', annealed: 'Annealed', HT_HIP: 'HIP', stress_relieved: 'Stress-relieved', solution_annealed: 'Solution-annealed' };
  return map[k] || String(k).replace(/[_+]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function vendorMatchesHT(vPost, htKey) {
  if (!vPost) return false;
  const a = norm(vPost), b = norm(htKey);
  return a === b || a.includes(b) || b.includes(a);
}
function curatedRangesForHT(m, htKey) {
  const ht = m.heat_treatments[htKey];
  const pts = { yield_strength: [ht.ys, ht.ys_z], uts: [ht.uts, ht.uts_z], elongation: [ht.elong, ht.elong_z], hardness: [ht.hardness_HV], modulus: [m.E], density: [m.density], thermal_conductivity: [m.thermal_k], fatigue_strength: [], impact_strength: [] };
  for (const v of Object.values(m.vendors || {})) {
    if (!vendorMatchesHT(v.post_treatment, htKey)) continue;
    pts.yield_strength.push(v.yield_MPa, v.yield_z_MPa); pts.uts.push(v.uts_xy_MPa, v.uts_z_MPa);
    pts.elongation.push(v.elongation_pct, v.elongation_xy_pct, v.elongation_z_pct); pts.hardness.push(v.hardness_HV);
    const vr = v._value_ranges || {};
    if (vr.yield_MPa_z) pts.yield_strength.push(...vr.yield_MPa_z);
    if (vr.tensile_MPa_xy) pts.uts.push(...vr.tensile_MPa_xy);
    if (vr.tensile_MPa_z) pts.uts.push(...vr.tensile_MPa_z);
    if (vr.elongation_pct_xy) pts.elongation.push(...vr.elongation_pct_xy);
    if (vr.elongation_pct_z) pts.elongation.push(...vr.elongation_pct_z);
  }
  const ranges = {}; for (const p of NUM_PROPS) ranges[p] = rangeFrom(pts[p]);
  return ranges;
}
// raw data points per material (for convex-hull property envelopes on the chart)
const PROP_ORDER = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];
function curatedPointsForHT(m, htKey) {
  const ht = htKey ? m.heat_treatments[htKey] : null;
  const D = m.density ?? null, E = m.E ?? null, K = m.thermal_k ?? null;
  const out = [];
  const push = (ys, uts, el, hv) => out.push([D, ys ?? null, uts ?? null, el ?? null, E, hv ?? null, K]);
  if (ht) { push(ht.ys, ht.uts, ht.elong, ht.hardness_HV); push(ht.ys_z, ht.uts_z, ht.elong_z, ht.hardness_HV); }
  for (const v of Object.values(m.vendors || {})) {
    if (htKey && !vendorMatchesHT(v.post_treatment, htKey)) continue;
    push(v.yield_MPa, v.uts_xy_MPa, v.elongation_xy_pct ?? v.elongation_pct, v.hardness_HV);
    push(v.yield_z_MPa, v.uts_z_MPa, v.elongation_z_pct, v.hardness_HV);
  }
  return out.filter(t => (t[1] > 0) || (t[2] > 0)); // keep points with a yield or UTS value
}
// Curated AM alloys → one entry PER heat-treatment (different heat treatment = different material).
const curated = [];
let cidx = 0;
for (const key of dbKeys) {
  const m = db.materials[key];
  addAliases(key, m);
  const vendors = Object.values(m.vendors || {});
  const composition = Object.fromEntries((m.composition || []).filter(Array.isArray));
  const subcategory = dbCatToSub[m.category] || m.category || 'Metal - Other';
  const sources = curatedSources(m);
  const manufacturers = uniq(vendors.map(v => v.manufacturer)).length ? uniq(vendors.map(v => v.manufacturer)) : ['Multiple (AM)'];
  const machines = uniq(vendors.map(v => v.machine));
  const baseMeta = { applications: m.applications || null, magnetic: m.magnetic ?? null, melt_C: m.melt ?? null, cte: m.cte ?? null, cp: m.cp ?? null, poisson: m.poisson ?? null, vendor_count: vendors.length, anisotropy: true };
  const htKeys = Object.keys(m.heat_treatments || {});
  for (const htKey of (htKeys.length ? htKeys : [null])) {
    const ranges = htKey ? curatedRangesForHT(m, htKey) : curatedRanges(m);
    if (!ranges.yield_strength && !ranges.uts && !ranges.hardness && !ranges.elongation) continue; // no mechanical data for this condition
    const htLabel = htKey ? prettyHT(htKey) : 'AM (combined)';
    curated.push({
      id: 'C_' + String(cidx++).padStart(4, '0'),
      name: htKey ? `${key} — ${htLabel}` : key,
      category: 'Metal', subcategory, tier: 'curated',
      manufacturers, machines, processes: ['LPBF'], heat_treatment: htLabel,
      ranges, composition, sources, points: curatedPointsForHT(m, htKey),
      machinability: null, weldability: null, corrosion_resistance: null,
      meta: baseMeta,
    });
  }
}
['copper', 'nickel', 'cobaltchrome'].forEach(x => curatedAlias.add(x)); // word-name alloys → curated Cu / CP-Nickel / CoCr
const isCurated = name => {
  const a = norm(alloyOf(name));
  if (a.startsWith('maraging')) return true;            // all maraging vendor variants → curated Maraging Steel
  if (curatedAlias.has(a)) return true;
  for (const tok of String(name).split(/[\s(),/]+/)) if (/\d/.test(tok) && curatedAlias.has(norm(tok))) return true;
  return false;
};

// ───────── non-curated tiers (am_vendor / generic) ─────────
function compositionFromRows(g) {
  const composition = {};
  for (const el of ELEMENTS) { const vals = g.map(r => num(r[el])).filter(v => v != null && v > 0); if (vals.length) { const mn = round(Math.min(...vals)), mx = round(Math.max(...vals)); composition[el] = mn === mx ? String(mn) : `${mn}~${mx}`; } }
  return composition;
}
function rangesFromRows(g) { const ranges = {}; for (const p of NUM_PROPS) ranges[p] = rangeFrom(g.map(r => r[p])); return ranges; }
function fixSubcategory(name, rawSub) { return aaSubcategory(name) || rawSub; }
// bucket the in-name condition into a coarse class so an alloy×process splits into a few materials
function conditionClass(name) {
  const m = String(name).match(/\(([^)]+)\)/);
  const c = (m ? m[1] : '').toLowerCase().trim();
  if (!c) return 'As-supplied';
  if (/anneal|^o$|^o\b/.test(c)) return 'Annealed';
  if (/solution|aged|t\d|precipit|\bph\b/.test(c)) return 'Aged / solution-treated';
  if (/quench|temper|normaliz|harden/.test(c)) return 'Quenched / tempered';
  if (/h\d|cold|hot roll|rolled|drawn|work/.test(c)) return 'Strain-hardened';
  if (/cast|forged/.test(c)) return 'As-cast / forged';
  return 'As-supplied';
}

// Non-curated rows → one entry per (alloy × process). Different process = different
// material; conditions/tempers within a process are aggregated into the range.
// Curated alloys are dropped here (curated db is authoritative).
let droppedCuratedDup = 0;
const ncGroups = new Map(); // norm(alloy)|process -> { rows, hasAm, name, process }
for (const r of csvRows) {
  if (isCurated(r.material_name)) { droppedCuratedDup++; continue; }
  const isAm = r.manufacturer !== 'Generic' || AM_PROC.has(r.process);
  const alloy = (isAm ? alloyOf(r.material_name) : baseName(r.material_name)).trim();
  if (!norm(alloy)) { droppedCuratedDup++; continue; }
  const proc = PROCESS_CANON[r.process] || r.process || 'Unknown';
  const cond = conditionClass(r.material_name);
  const key = norm(alloy) + '|' + proc + '|' + cond;
  if (!ncGroups.has(key)) ncGroups.set(key, { rows: [], hasAm: false, name: alloy, process: proc, cond });
  const grp = ncGroups.get(key);
  grp.rows.push(r);
  if (isAm) grp.hasAm = true;
  if (alloy.length < grp.name.length) grp.name = alloy; // prefer the most concise designation
}

let aaFixed = 0;
const subcatFlags = [];
const nonCurated = Array.from(ncGroups.values()).map((grp, idx) => {
  const g = grp.rows, rep = g[0];
  const rawSub = mostCommon(g.map(r => r.subcategory));
  const sub = fixSubcategory(grp.name, rawSub); if (sub !== rawSub) aaFixed++;
  const variants = uniq(g.map(r => r.subcategory));
  if (variants.length > 1) subcatFlags.push({ name: grp.name, variants });
  const tier = grp.hasAm ? 'am_vendor' : 'generic';
  const manus = uniq(g.map(r => r.manufacturer));
  const realSrc = uniq(g.map(r => r.source).filter(s => s !== 'Unknown')).map(s => ({ label: s, url: null, verified: false }));
  const sources = grp.hasAm
    ? dedupeSources([...manus.filter(m => m !== 'Generic').map(mf => ({ label: `${mf} (AM vendor datasheet)`, url: null, verified: false })), ...realSrc, matwebSearch(grp.name)])
    : dedupeSources([...realSrc, familyHandbook(rep.category, sub), matwebSearch(grp.name)]);
  const conditions = uniq(g.map(r => { const mm = String(r.material_name).match(/\(([^)]+)\)/); return mm ? mm[1] : null; }));
  return {
    id: (tier === 'am_vendor' ? 'V_' : 'G_') + String(idx).padStart(4, '0'),
    name: `${grp.name} — ${grp.cond} (${grp.process})`,
    category: rep.category || 'Metal', subcategory: sub, tier,
    manufacturers: tier === 'am_vendor' ? manus : ['Generic'], machines: [],
    processes: [grp.process], heat_treatment: grp.cond,
    ranges: rangesFromRows(g), composition: compositionFromRows(g), sources, points: g.map(r => PROP_ORDER.map(p => num(r[p]))),
    machinability: mostCommonKnown(g.map(r => r.machinability)),
    weldability: mostCommonKnown(g.map(r => r.weldability)),
    corrosion_resistance: mostCommonKnown(g.map(r => r.corrosion_resistance)),
    meta: { row_count: g.length, subcategory_variants: variants, conditions },
  };
});
const am_vendor = nonCurated.filter(m => m.tier === 'am_vendor');
const generic = nonCurated.filter(m => m.tier === 'generic');

// supplementary reference materials (web/handbook-verified ranges) — broadens coverage
const supRaw = (JSON.parse(fs.readFileSync(path.join(DATA, 'supplementary-materials.json'), 'utf8')).materials) || [];
const supplementary = supRaw.map((s, idx) => {
  const ranges = {};
  for (const p of NUM_PROPS) ranges[p] = null;
  PROP_ORDER.forEach((p, i) => { ranges[p] = rangeFrom(s.points.map((row) => row[i])); });
  if (Array.isArray(s.fatigue)) ranges.fatigue_strength = rangeFrom(s.fatigue);
  if (Array.isArray(s.impact)) ranges.impact_strength = rangeFrom(s.impact);
  return {
    id: 'R_' + String(idx).padStart(4, '0'),
    name: s.name, category: s.category, subcategory: s.subcategory, tier: 'reference',
    manufacturers: ['Reference data'], machines: [], processes: [s.process], heat_treatment: null,
    ranges, composition: s.composition || {}, sources: s.sources || [], points: s.points,
    machinability: null, weldability: null, corrosion_resistance: null, meta: { reference: true },
  };
});
const all = [...curated, ...am_vendor, ...generic, ...supplementary];

// back-compat flat fields: current app reads m.density / m.manufacturer / m.process / m.source directly.
// Keep them (= typical value) alongside the richer {ranges, sources, tier, meta} so the UI can migrate gradually.
for (const m of all) {
  for (const p of NUM_PROPS) m[p] = m.ranges[p]?.typical ?? null;
  m.manufacturer = m.manufacturers.join(', ');
  m.process = m.processes.join(' / ');
  m.source = m.sources[0]?.label ?? null;
  m.aliases = aliasesFor(m.name);
  m.families = familyTags(m.category, m.subcategory, m.composition);
  const q = qualFor(m.name);
  if (q) { m.machinability = m.machinability || q.machinability; m.weldability = m.weldability || q.weldability; m.corrosion_resistance = m.corrosion_resistance || q.corrosion; }
  // estimated fatigue (endurance) from UTS where no measured value — labelled as an estimate
  if (m.category !== 'Polymer' && !m.ranges.fatigue_strength && m.ranges.uts) {
    const f = m.families || [];
    const ratio = f.includes('Titanium-based') ? 0.55 : f.includes('Nickel-based') ? 0.40 : (f.includes('Aluminum-based') || f.includes('Copper-based') || f.includes('Magnesium-based')) ? 0.35 : 0.45;
    const u = m.ranges.uts;
    m.ranges.fatigue_strength = { min: round(u.min * ratio), max: round(u.max * ratio), typical: round(u.typical * ratio), n: 0, estimated: true };
    m.fatigue_strength = round(u.typical * ratio);
    m.fatigue_estimated = true;
  }
}

// ───────── validation report ─────────
const rawUnknownSrc = csvRows.filter(r => r.source === 'Unknown').length;
const rawCorrosion0 = csvRows.filter(r => r.corrosion_resistance === '0').length;
const rawFatigueEmpty = csvRows.filter(r => r.fatigue_strength === '').length;
const withVerifiedSrc = all.filter(m => m.sources.some(s => s.verified)).length;
const rangeCov = {};
for (const p of NUM_PROPS) { const have = all.filter(m => m.ranges[p]).length; const real = all.filter(m => m.ranges[p] && m.ranges[p].max > m.ranges[p].min).length; rangeCov[p] = { have, real }; }

const rep = [];
rep.push('# AM Materials Explorer — Data Validation Report', '');
rep.push(`Generated from \`material_db.json\` (${dbKeys.length} curated) + \`AM_Materials_DB_enriched.csv\` (${csvRows.length} rows).`, '');
rep.push('## Output', `- **${all.length} materials**: ${curated.length} curated · ${am_vendor.length} am_vendor · ${generic.length} generic`, `- Dropped ${droppedCuratedDup} CSV rows that duplicate curated AM alloys (curated db is the richer source).`, '');
rep.push('## Property range coverage', '| property | has range | non-degenerate (max>min) |', '|---|---|---|');
for (const p of NUM_PROPS) rep.push(`| ${p} | ${rangeCov[p].have}/${all.length} | ${rangeCov[p].real} |`);
rep.push('');
rep.push('## Sources (Task 2)', `- Materials with ≥1 **verified datasheet URL**: ${withVerifiedSrc}/${all.length} (all curated + ref_urls).`, `- Raw CSV had \`source=Unknown\` for ${rawUnknownSrc}/${csvRows.length} rows; curated provenance restored from \`ref_urls\`.`, '- Generic & am_vendor tiers enriched with a family handbook reference + a MatWeb QuickText search link (verifiable URLs, not fabricated datasheets).', '');
rep.push('## Integrity fixes', `- Removed **${garbageRemoved}** corrupt CSV row(s) (e.g. \`material_name="0"\`).`, `- AA aluminium series subcategory auto-corrected: **${aaFixed}** materials.`, `- Process labels canonicalised: ${JSON.stringify(PROCESS_CANON)}.`, `- Placeholder \`corrosion_resistance=0\` in ${rawCorrosion0} raw rows (treated as “unknown”, not 0).`, `- Empty fatigue/impact in ${rawFatigueEmpty} raw rows (left null, not zero).`, '');
rep.push(`## Subcategory mismatch flags (${subcatFlags.length}) — manual review`);
for (const f of subcatFlags.slice(0, 25)) rep.push(`- ${f.name}: ${f.variants.join(' / ')}`);
rep.push('', '## TODO', '- Hardness scale unification (HV/HRC/HB).', '- Reconcile fatigue/impact gaps where datasheets provide values.');

const liveJson = path.join(ROOT, 'client', 'public', 'materials.json');
const backup = path.join(DATA, 'materials.original.json');
if (fs.existsSync(liveJson) && !fs.existsSync(backup)) fs.copyFileSync(liveJson, backup); // preserve original 2902-row dataset once
const outJson = JSON.stringify(all, null, 2);
fs.writeFileSync(path.join(DATA, 'materials.preview.json'), outJson);
fs.writeFileSync(liveJson, outJson);
fs.writeFileSync(path.join(DATA, 'validation-report.md'), rep.join('\n'));

// ───────── console summary ─────────
console.log(`TOTAL ${all.length} = curated ${curated.length} + am_vendor ${am_vendor.length} + generic ${generic.length} + reference ${supplementary.length}`);
console.log('am_vendor recovered:', am_vendor.map(m => m.name).join(', '));
console.log('AA subcategory fixes:', aaFixed, '| subcat mismatch flags:', subcatFlags.length, '| verified-source materials:', withVerifiedSrc);
console.log('Wrote data/materials.preview.json + data/validation-report.md');
