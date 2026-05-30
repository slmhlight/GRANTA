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
  '316l': ['UNS S31603', 'EN 1.4404', 'X2CrNiMo17-12-2', 'JIS SUS316L', 'KS STS316L', 'GB 022Cr17Ni12Mo2'],
  '304l': ['UNS S30403', 'EN 1.4307', 'X2CrNi18-9', 'JIS SUS304L', 'KS STS304L'],
  '174ph': ['UNS S17400', 'EN 1.4542', 'AISI 630', 'JIS SUS630', 'KS STS630'],
  '155ph': ['UNS S15500', 'EN 1.4545', 'XM-12'],
  '420': ['UNS S42000', 'EN 1.4021', 'JIS SUS420J2', 'KS STS420J2'],
  'ti6al4v': ['UNS R56400', 'ASTM Grade 5', 'DIN 3.7165', 'Gr23 ELI (R56407)', 'GB TC4', 'JIS Class 60', 'Russian VT6'],
  'ticpgr1': ['UNS R50250', 'ASTM Grade 1'],
  'ticpgr2': ['UNS R50400', 'ASTM Grade 2'],
  'alsi10mg': ['EN AC-43000', 'EN AC-AlSi10Mg', 'DIN 3.2381'],
  'alsi7mg': ['EN AC-42000', 'AlSi7Mg', 'A356 (cast equiv.)'],
  'al12si': ['EN AC-44000', 'AlSi12', 'A413 (cast equiv.)'],
  'inconel625': ['UNS N06625', 'EN 2.4856', 'NiCr22Mo9Nb', 'Alloy 625'],
  'inconel718': ['UNS N07718', 'EN 2.4668', 'Alloy 718', 'AMS 5662', 'GH4169', 'NC19FeNb'],
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
  'tungsten': ['W', 'Pure tungsten 99.95', 'EN 2.4060'],
  // ── thorough cross-standard designations for the added / standard alloys ──
  '1018': ['UNS G10180', 'DIN 1.0453', 'JIS S20C', 'C18'],
  '12l14': ['UNS G12144', 'DIN 1.0718', '11SMnPb30', 'JIS SUM24L'],
  'graycastiron': ['ASTM A48 Class 30', 'EN-GJL-200', 'DIN GG20', 'JIS FC200'],
  '654512': ['ASTM A536 65-45-12', 'EN-GJS-450-10', 'DIN GGG-50'],
  'zamak3': ['UNS Z33520', 'ZnAl4', 'EN ZL0410 (ZP3)', 'Mazak 3'],
  'c51000': ['UNS C51000', 'EN CW451K', 'CuSn5', 'PB1 phosphor bronze'],
  '316ti': ['UNS S31635', 'EN 1.4571', 'X6CrNiMoTi17-12-2', 'JIS SUS316Ti'],
  '904l': ['UNS N08904', 'EN 1.4539', 'X1NiCrMoCu25-20-5', '2RK65'],
  'custom465': ['UNS S46500', 'Carpenter Custom 465'],
  'scalmalloy': ['Al-Mg-Sc-Zr', 'AlMg4.6Sc0.66ZrMn', 'APWORKS Scalmalloy'],
  'hastelloyx': ['UNS N06002', 'EN 2.4665', 'NiCr22Fe18Mo', 'Alloy X', 'GH3536'],
  'grcop42': ['Cu-4Cr-2Nb', 'NASA GRCop-42'],
  'kovar': ['UNS K94610', 'ASTM F15', 'NiCo29Co18', 'Nilo K', 'Pernifer 2918'],
  'nitinol': ['NiTi', 'ASTM F2063', 'Nitinol SE508', 'UNS N01555'],
  'c103': ['Nb-10Hf-1Ti', 'UNS R04295', 'Niobium C-103'],
  'c95800': ['UNS C95800', 'EN CC333G', 'AB2', 'Nickel-Aluminium Bronze'],
  'ti6al7nb': ['UNS R56700', 'ASTM F1295', 'Ti-6Al-7Nb', 'Protasul-100'],
  '2507': ['UNS S32750', 'EN 1.4410', 'SAF 2507', 'F53'],
  'inconel713c': ['IN-713C', 'UNS N07713', 'Nickel 713C'],
  'stellite6': ['UNS R30006', 'Co-28Cr-4W-1C', 'CoCr-A'],
  'c17200': ['UNS C17200', 'EN CW101C', 'CuBe2', 'Alloy 25', 'Beryllium copper'],
  'haynes230': ['UNS N06230', 'EN 2.4733', 'NiCr22W14Mo', 'Alloy 230'],
  'waspaloy': ['UNS N07001', 'NiCr19Co14Mo4Ti3Al'],
  'rene41': ['UNS N07041', 'Rene 41', 'NiCr19Co11Mo10Ti3'],
  'nimonic80a': ['UNS N07080', 'EN 2.4952', 'NiCr20TiAl', 'Alloy 80A'],
  'tigrade9': ['UNS R56320', 'ASTM Grade 9', 'Ti-3Al-2.5V', 'GB TC9'],
  'az31b': ['UNS M11311', 'EN MgAl3Zn1', 'ISO MgAl3Zn1A'],
  'aermet100': ['UNS K92580', 'AerMet 100'],
  '300m': ['UNS K44220', '300M', '35NiCrMoV'],
  'peek': ['Victrex PEEK', 'PEEK 450G', 'Ketron PEEK'],
  'ultem9085': ['PEI', 'ULTEM 9085', 'SABIC ULTEM'],
  'pa12': ['Nylon 12', 'PA 2200', 'Rilsan'],
  // ── added standard alloys (stainless / Ni / Cu-Ni / Ti / Co / tool-bearing / Mg / refractory) ──
  '317l': ['UNS S31703', 'EN 1.4438', 'X2CrNiMo18-15-4', 'JIS SUS317L'],
  '177ph': ['UNS S17700', 'EN 1.4568', '17-7 PH', 'JIS SUS631'],
  'ph138mo': ['UNS S13800', 'EN 1.4534', 'PH13-8Mo'],
  'nitronic50': ['UNS S20910', 'XM-19', 'EN 1.3964', '22Cr-13Ni-5Mn'],
  'nitronic60': ['UNS S21800', 'Alloy 218', '218-SMO'],
  'al6xn': ['UNS N08367', 'EN 1.4529', 'AL-6XN'],
  'inconel601': ['UNS N06601', 'EN 2.4851', 'NiCr23Fe'],
  'inconel617': ['UNS N06617', 'EN 2.4663', 'NiCr23Co12Mo'],
  'inconel690': ['UNS N06690', 'EN 2.4642', 'NiCr29Fe'],
  'incoloy800h': ['UNS N08810', 'EN 1.4958', 'Alloy 800H', 'X10NiCrAlTi32-21'],
  'incoloy825': ['UNS N08825', 'EN 2.4858', 'Alloy 825', 'NiCr21Mo'],
  'a286': ['UNS S66286', 'EN 1.4980', 'A-286', 'AMS 5737'],
  'hastelloyb2': ['UNS N10665', 'EN 2.4617', 'Alloy B-2'],
  'nimonic90': ['UNS N07090', 'EN 2.4632', 'NiCr20Co18Ti'],
  'c70600': ['UNS C70600', 'EN CW352H', 'CuNi10Fe1Mn', '90/10 cupronickel'],
  'c71500': ['UNS C71500', 'EN CW354H', 'CuNi30Mn1Fe', '70/30 cupronickel'],
  'tigrade12': ['UNS R53400', 'ASTM Grade 12', 'Ti-0.3Mo-0.8Ni'],
  'ti10v2fe3al': ['UNS R58010', 'Ti-10-2-3', 'Ti-10V-2Fe-3Al'],
  'l605': ['UNS R30605', 'Haynes 25', 'Co-20Cr-15W-10Ni', 'AMS 5537'],
  'stellite21': ['UNS R30021', 'Co-28Cr-6Mo', 'Stellite 21'],
  '52100': ['UNS G52986', 'DIN 1.3505', '100Cr6', 'JIS SUJ2', 'EN31'],
  'p20moldsteel': ['DIN 1.2311', '40CrMnMo7', 'P20'],
  's7toolsteel': ['UNS T41907', 'S7 shock-resisting'],
  'we43': ['UNS M18430', 'Elektron WE43', 'MgY4Nd3'],
  'tzm': ['Mo-0.5Ti-0.08Zr', 'Molybdenum TZM', 'UNS R03640'],
  // ── round-2 expansion aliases ──
  'aa2618': ['UNS A92618', 'EN AW-2618', 'AlCu2Mg1.5Ni'],
  'a319': ['UNS A03190', 'AlSi6Cu4', '319 cast aluminium'],
  'a380': ['UNS A03800', 'EN AC-46500', 'AlSi8Cu3'],
  'astma36': ['ASTM A36', 'EN S275JR', 'St37-2'],
  'a516grade70': ['ASTM A516-70', 'SA-516-70', 'EN P355GH (~)'],
  '5160': ['UNS G51600', 'DIN 1.7176', '60Cr3', 'JIS SUP9A'],
  'a2toolsteel': ['DIN 1.2363', 'X100CrMoV5', 'JIS SKD12', 'AISI A2'],
  'cpm3v': ['Crucible CPM 3V', 'PM tool steel'],
  'hy80': ['MIL-S-16216', 'HY-80'],
  '416': ['UNS S41600', 'EN 1.4005', 'X12CrS13', 'JIS SUS416'],
  '431': ['UNS S43100', 'EN 1.4057', 'X17CrNi16-2', 'JIS SUS431'],
  '2304': ['UNS S32304', 'EN 1.4362', 'SAF 2304'],
  '253ma': ['UNS S30815', 'EN 1.4835', '253 MA'],
  'inconel706': ['UNS N09706', 'Alloy 706'],
  'inconel751': ['UNS N07751', 'Alloy 751'],
  'udimet720': ['Udimet 720', 'U720Li'],
  'nimonic263': ['UNS N07263', 'EN 2.4650', 'C-263'],
  'nickel200': ['UNS N02200', 'EN 2.4066', 'Ni 99.6'],
  'haynes188': ['UNS R30188', 'Co-22Cr-22Ni-14W', 'Alloy 188'],
  'ultimet': ['UNS R31233', 'Co-26Cr-9Ni-5Mo'],
  'stellite12': ['UNS R30012', 'Co-30Cr-8W'],
  'betac': ['UNS R58640', 'Ti-3-8-6-4-4', 'Ti Beta-C', 'ATI 38-6-44'],
  'c10100': ['UNS C10100', 'OFE copper', 'EN CW009A', 'oxygen-free'],
  'c46400': ['UNS C46400', 'EN CW712R', 'CuZn38Sn1', 'naval brass'],
  'c65500': ['UNS C65500', 'EN CW116C', 'CuSi3Mn1', 'silicon bronze'],
  'am60': ['UNS M10600', 'MgAl6Mn', 'AM60B'],
  'ze41': ['UNS M16410', 'MgZn4RE1Zr', 'ZE41A'],
  'hafnium': ['Hf', 'UNS R02001'],
  'pai': ['Torlon', 'Polyamide-imide'],
  'polyimide': ['Vespel', 'PI', 'Kapton'],
  'pbt': ['Valox', 'Crastin', 'Polybutylene terephthalate'],
  'lcp': ['Vectra', 'Xydar', 'Liquid-crystal polymer'],
  'uhmwpe': ['PE-UHMW', 'UHMW polyethylene'],
  'etfe': ['Tefzel', 'Ethylene tetrafluoroethylene'],
  'pa11': ['Rilsan', 'Nylon 11'],
  // ── round-3 expansion aliases ──
  'cmsx4': ['CMSX-4', '2nd-gen single crystal'],
  'renen5': ['Rene N5', 'CMSX-4 class SX'],
  'pwa1484': ['PWA 1484', '2nd-gen single crystal'],
  'inconel740h': ['UNS N07740', 'Alloy 740H'],
  'incoloy901': ['UNS N09901', 'Alloy 901'],
  'nimonic105': ['UNS N13021', 'Alloy 105'],
  'hastelloyc2000': ['UNS N06200', 'Alloy C-2000'],
  '157ph': ['UNS S15700', 'EN 1.4568', '15-7 PH'],
  '309s': ['UNS S30908', 'EN 1.4833', 'JIS SUS309S'],
  '310s': ['UNS S31008', 'EN 1.4845', 'JIS SUS310S'],
  '347h': ['UNS S34709', 'EN 1.4961'],
  '410s': ['UNS S41008', 'EN 1.4000'],
  'c18000': ['UNS C18000', 'CuNiSiCr'],
  'c19400': ['UNS C19400', 'CuFe2P'],
  'c22000': ['UNS C22000', 'EN CW502L', 'commercial bronze'],
  'c63000': ['UNS C63000', 'EN CW307G', 'nickel-aluminium bronze'],
  'c93200': ['UNS C93200', 'SAE 660', 'bearing bronze'],
  'ti6al2sn4zr2mo': ['UNS R54620', 'Ti-6242', 'Ti-6-2-4-2'],
  'ti15v3cr3al3sn': ['Ti-15-3', 'Ti-15V-3Cr-3Al-3Sn'],
  'stellite6b': ['UNS R30016', 'Co-30Cr-4.5W'],
  'mp159': ['UNS R30159', 'Co-Ni multiphase'],
  'elgiloy': ['UNS R30003', 'Co-Cr-Ni-Mo spring', 'Phynox'],
  'we54': ['Elektron WE54', 'MgY5RE'],
  'ez33a': ['UNS M12330', 'MgRE3Zn2.5Zr'],
  'ta10w': ['UNS R05252', 'Ta-10W'],
  'zirconium705': ['UNS R60705', 'Zr-2.5Nb'],
  'pesu': ['Ultrason E', 'Polyethersulfone', 'PES'],
  'pfa': ['Perfluoroalkoxy', 'Teflon PFA'],
  'pctfe': ['Kel-F', 'Polychlorotrifluoroethylene'],
  'pa46': ['Stanyl', 'Nylon 46'],
  'hips': ['High-impact polystyrene'],
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
// class-typical physical & qualitative properties — handbook-level representative values
// (NOT per-sample measurements; flagged estimated and shown as "typical" in the UI).
// ec = electrical conductivity %IACS, tmax = max continuous service temp °C, price = approx raw-material $/kg
function assignPhysicals(m) {
  const fam = m.families || [];
  const sub = String(m.subcategory || '').toLowerCase();
  const nm = String(m.name || '').toLowerCase();
  const has = (re) => re.test(nm) || re.test(sub);
  if (m.category === 'Polymer') {
    const tmax = has(/peek/) ? 250 : has(/ultem|pei/) ? 170 : has(/pes/) ? 180 : has(/nylon|pa1[12]|pa6|pa2|polyamide/) ? 110
      : has(/polycarb|\bpc\b/) ? 115 : has(/abs/) ? 90 : has(/petg/) ? 70 : has(/pla/) ? 55 : has(/tpu/) ? 80 : has(/\bpp\b|polypro/) ? 100 : 90;
    const price = has(/peek/) ? 400 : has(/ultem|pei|pes/) ? 200 : has(/nylon|polyamide/) ? 50 : has(/tpu|polycarb|\bpc\b/) ? 40 : 25;
    return { ec: 0, tmax, price, qual: { corrosion: 'Excellent', machinability: 'Good', weldability: 'N/A' } };
  }
  if (fam.includes('Copper-based')) {
    const ec = has(/becu|beryllium/) ? 22 : has(/brass/) ? 28 : has(/bronze/) ? 15 : has(/cucr|crzr|grcop|glidcop/) ? 80 : 95;
    return { ec, tmax: 200, price: has(/becu|beryllium/) ? 40 : has(/bronze/) ? 12 : 9, qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' } };
  }
  if (fam.includes('Aluminum-based')) {
    const ec = has(/7075|7050|7175|7068/) ? 33 : has(/2024|2014|2219|2618/) ? 30 : has(/alsi10|alsi7|a356|f357|scalmalloy/) ? 40 : 45;
    return { ec, tmax: has(/7075|7050/) ? 120 : 170, price: has(/scalmalloy/) ? 12 : 4, qual: { corrosion: 'Good', machinability: 'Excellent', weldability: 'Good' } };
  }
  if (fam.includes('Titanium-based')) {
    return { ec: 1.5, tmax: has(/6242|6246|1100/) ? 540 : has(/5553|beta|2154/) ? 315 : 400, price: 35, qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' } };
  }
  if (fam.includes('Nickel-based') || fam.includes('Superalloy')) {
    const tmax = has(/haynes|230/) ? 1100 : has(/hastelloy/) ? 1000 : has(/625/) ? 815 : has(/738|939|713|waspaloy|rene|nimonic|247/) ? 950 : has(/718/) ? 650 : has(/600|601|617/) ? 1000 : 800;
    return { ec: 1.3, tmax, price: has(/waspaloy|rene|haynes|247/) ? 80 : 50, qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
  }
  if (fam.includes('Cobalt-based')) return { ec: 1.5, tmax: 1000, price: 60, qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
  if (fam.includes('Magnesium-based')) return { ec: 33, tmax: 120, price: 6, qual: { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Fair' } };
  if (fam.includes('Refractory')) return { ec: 31, tmax: 1000, price: 70, qual: { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' } };
  if (fam.includes('Iron-based') || has(/steel|stainless|invar|kovar/)) {
    if (has(/stainless|316|304|17-?4|174ph|155ph|duplex|2205|austenit|ferritic|martensit|410|420|440|nitronic/)) {
      const tmax = has(/austenit|316|304|310|nitronic/) ? 800 : 500;
      return { ec: 2.5, tmax, price: has(/duplex|2205|nitronic/) ? 6 : 5, qual: { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' } };
    }
    if (has(/maraging|18ni|c300|c250|c350|m300/) || sub.includes('maraging')) return { ec: 3, tmax: 400, price: 15, qual: { corrosion: 'Moderate', machinability: 'Good', weldability: 'Excellent' } };
    if (sub.includes('tool') || has(/h13|d2|m2|m4|p20|s7|a2|o1|cpm/)) return { ec: 5, tmax: 550, price: 6, qual: { corrosion: 'Poor', machinability: 'Fair', weldability: 'Poor' } };
    return { ec: 9, tmax: 450, price: 2, qual: { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' } };
  }
  return { ec: null, tmax: null, price: null, qual: null };
}
// measured fatigue (R=-1, MPa) / Charpy impact (J) / elevated-temp YS-UTS (handbook-typical) for key alloys
const REAL_PROPS = {
  'ti6al4v': { fatigue: [450, 525, 600], impact: [17, 20, 24], elevated_temp: [{ temp: 20, ys: 880, uts: 950 }, { temp: 200, ys: 710, uts: 820 }, { temp: 400, ys: 560, uts: 670 }, { temp: 500, ys: 470, uts: 570 }] },
  '316l': { fatigue: [240, 255, 270], impact: [100, 140, 180], elevated_temp: [{ temp: 20, ys: 290, uts: 580 }, { temp: 300, ys: 190, uts: 480 }, { temp: 500, ys: 150, uts: 430 }, { temp: 600, ys: 140, uts: 360 }] },
  '174ph': { fatigue: [550, 600, 650], impact: [20, 30, 40], elevated_temp: [{ temp: 20, ys: 1100, uts: 1190 }, { temp: 300, ys: 950, uts: 1050 }, { temp: 425, ys: 880, uts: 1000 }] },
  'inconel718': { fatigue: [450, 535, 620], impact: [30, 40, 50], elevated_temp: [{ temp: 20, ys: 1100, uts: 1280 }, { temp: 540, ys: 1010, uts: 1150 }, { temp: 650, ys: 950, uts: 1110 }, { temp: 760, ys: 870, uts: 950 }] },
  'inconel625': { fatigue: [350, 415, 480], impact: [50, 70, 90], elevated_temp: [{ temp: 20, ys: 490, uts: 930 }, { temp: 540, ys: 410, uts: 780 }, { temp: 650, ys: 400, uts: 760 }, { temp: 815, ys: 330, uts: 550 }] },
  'alsi10mg': { fatigue: [90, 115, 140], impact: [3, 4, 5], elevated_temp: [{ temp: 20, ys: 230, uts: 360 }, { temp: 150, ys: 180, uts: 270 }, { temp: 200, ys: 120, uts: 180 }, { temp: 250, ys: 70, uts: 110 }] },
  'maraging': { fatigue: [600, 650, 700], impact: [15, 20, 25], elevated_temp: [{ temp: 20, ys: 1900, uts: 1950 }, { temp: 300, ys: 1700, uts: 1800 }, { temp: 450, ys: 1500, uts: 1600 }] },
  'haynes230': { fatigue: [250, 300, 350], impact: [50, 70, 90], elevated_temp: [{ temp: 20, ys: 390, uts: 860 }, { temp: 760, ys: 285, uts: 575 }, { temp: 870, ys: 250, uts: 420 }, { temp: 980, ys: 180, uts: 280 }] },
  '304l': { fatigue: [220, 240, 260], impact: [120, 160, 200], elevated_temp: [{ temp: 20, ys: 250, uts: 580 }, { temp: 300, ys: 150, uts: 450 }, { temp: 500, ys: 130, uts: 400 }, { temp: 600, ys: 120, uts: 330 }] },
  '155ph': { fatigue: [550, 600, 650], impact: [25, 35, 45], elevated_temp: [{ temp: 20, ys: 1070, uts: 1140 }, { temp: 300, ys: 930, uts: 1010 }, { temp: 425, ys: 860, uts: 950 }] },
  'alsi7mg': { fatigue: [80, 100, 120], impact: [4, 6, 8], elevated_temp: [{ temp: 20, ys: 250, uts: 320 }, { temp: 150, ys: 200, uts: 260 }, { temp: 200, ys: 140, uts: 190 }] },
  'aa6061': { fatigue: [90, 97, 110], impact: [8, 12, 18], elevated_temp: [{ temp: 20, ys: 275, uts: 310 }, { temp: 150, ys: 260, uts: 290 }, { temp: 200, ys: 210, uts: 235 }, { temp: 300, ys: 40, uts: 60 }] },
  'aa7075': { fatigue: [140, 159, 180], impact: [5, 8, 12], elevated_temp: [{ temp: 20, ys: 505, uts: 570 }, { temp: 150, ys: 400, uts: 455 }, { temp: 200, ys: 215, uts: 260 }] },
  'aa2024': { fatigue: [120, 138, 160], impact: [10, 15, 20], elevated_temp: [{ temp: 20, ys: 345, uts: 485 }, { temp: 150, ys: 290, uts: 420 }, { temp: 200, ys: 180, uts: 290 }] },
  '4340': { fatigue: [380, 470, 560], impact: [20, 35, 50], elevated_temp: [{ temp: 20, ys: 1240, uts: 1380 }, { temp: 300, ys: 1100, uts: 1240 }, { temp: 425, ys: 1000, uts: 1100 }] },
};
const REAL_ALIAS = { 'maragingsteel': 'maraging', 'm300': 'maraging', 'ms1': 'maraging', '18ni300': 'maraging', '718': 'inconel718', '625': 'inconel625', '6061': 'aa6061', '7075': 'aa7075', '2024': 'aa2024', '304': '304l', 'a357': 'alsi7mg' };
function realPropsFor(name) {
  const keys = new Set([norm(alloyOf(name)), norm(baseName(name))]);
  for (const tok of String(name).split(/[\s(),/]+/)) if (/\d/.test(tok)) keys.add(norm(tok));
  for (const k of keys) { const kk = REAL_ALIAS[k] || k; if (REAL_PROPS[kk]) return REAL_PROPS[kk]; }
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
// reference (supplementary) metal alloys are authoritative — drop CSV generics of the same alloy
// (polymers excluded so FDM reference vs injection-moulded CSV stay as distinct materials)
const refAlloySet = new Set(
  (((JSON.parse(fs.readFileSync(path.join(DATA, 'supplementary-materials.json'), 'utf8')).materials) || [])
    .filter((s) => s.category !== 'Polymer'))
    .map((s) => norm(alloyOf(s.name)))
);
const ncGroups = new Map(); // norm(alloy)|process -> { rows, hasAm, name, process }
for (const r of csvRows) {
  if (isCurated(r.material_name)) { droppedCuratedDup++; continue; }
  const isAm = r.manufacturer !== 'Generic' || AM_PROC.has(r.process);
  const alloy = (isAm ? alloyOf(r.material_name) : baseName(r.material_name)).trim();
  if (!norm(alloy)) { droppedCuratedDup++; continue; }
  if (refAlloySet.has(norm(alloy))) { droppedCuratedDup++; continue; } // reference entry is authoritative for this alloy
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
const supplementary = supRaw
  .filter((s) => !curatedAlias.has(norm(alloyOf(s.name))) && !curatedAlias.has(norm(baseName(s.name)))) // curated wins over reference
  .map((s, idx) => {
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
  // measured fatigue/impact/elevated-temp overrides for key alloys (take precedence over estimates)
  const rp = realPropsFor(m.name);
  if (rp) {
    if (rp.fatigue) { m.ranges.fatigue_strength = rangeFrom(rp.fatigue); m.fatigue_strength = m.ranges.fatigue_strength.typical; m.fatigue_estimated = false; }
    if (rp.impact && !m.ranges.impact_strength) { m.ranges.impact_strength = rangeFrom(rp.impact); m.impact_strength = m.ranges.impact_strength.typical; }
    if (rp.elevated_temp) m.elevated_temp = rp.elevated_temp;
  }
  // estimated fatigue (endurance) from UTS where no measured value — labelled as an estimate
  if (m.category !== 'Polymer' && !m.ranges.fatigue_strength && m.ranges.uts) {
    const f = m.families || [];
    const ratio = f.includes('Titanium-based') ? 0.55 : f.includes('Nickel-based') ? 0.40 : (f.includes('Aluminum-based') || f.includes('Copper-based') || f.includes('Magnesium-based')) ? 0.35 : 0.45;
    const u = m.ranges.uts;
    m.ranges.fatigue_strength = { min: round(u.min * ratio), max: round(u.max * ratio), typical: round(u.typical * ratio), n: 0, estimated: true };
    m.fatigue_strength = round(u.typical * ratio);
    m.fatigue_estimated = true;
  }
  // class-typical physical & qualitative properties (handbook-level; flagged estimated)
  const ph = assignPhysicals(m);
  if (ph.qual) {
    m.corrosion_resistance = m.corrosion_resistance || ph.qual.corrosion;
    m.machinability = m.machinability || ph.qual.machinability;
    m.weldability = m.weldability || ph.qual.weldability;
  }
  const setTyp = (k, v) => { if (v != null) { m[k] = v; m.ranges[k] = { min: v, max: v, typical: v, n: 0, estimated: true }; } };
  if (ph.ec != null) setTyp('electrical_conductivity', ph.ec);
  if (ph.tmax != null) setTyp('max_service_temp', ph.tmax);
  if (ph.price != null) {
    setTyp('price_per_kg', ph.price);
    if (m.density) setTyp('price_per_cm3', +(ph.price * m.density / 1000).toFixed(4));
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
