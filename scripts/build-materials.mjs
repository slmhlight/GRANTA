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
// R48a — 적응형 정밀도: silicone E 0.002 GPa 같은 작은 값도 정확히 표시. round1 만 쓰면 0 으로 잘림.
const smartRound = (x) => {
  if (x == null) return null;
  const abs = Math.abs(x);
  const d = abs < 0.01 ? 4 : abs < 1 ? 3 : abs < 100 ? 2 : 1;
  return Math.round(x * 10 ** d) / 10 ** d;
};
function rangeFrom(values, confidence) {
  const vals = values.map(num).filter(v => v != null && v > 0).sort((a, b) => a - b);
  if (!vals.length) return null;
  const conf = confidence || (vals.length >= 3 ? 'measured' : 'handbook');
  return { min: smartRound(vals[0]), max: smartRound(vals[vals.length - 1]), typical: smartRound(vals[Math.floor(vals.length / 2)]), n: vals.length, confidence: conf };
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
  // ── round-4 expansion aliases ──
  'aa5454': ['UNS A95454', 'EN AW-5454', 'AlMg3Mn'],
  'aa6005a': ['UNS A96005', 'EN AW-6005A', 'AlSiMg'],
  'aa7068': ['UNS A97068', 'EN AW-7068'],
  'aa2099': ['UNS A92099', 'Al-Li 2099'],
  '4145': ['UNS G41450', 'AISI 4145', '42CrMo4(~)'],
  'cpms30v': ['CPM S30V', 'UNS S30V'],
  '316h': ['UNS S31609', 'EN 1.4919'],
  '654smo': ['UNS S32654', 'EN 1.4652'],
  'zeron100': ['UNS S32760', 'EN 1.4501', 'F55'],
  'inconel718plus': ['UNS N07818', 'ATI 718Plus'],
  'incoloy925': ['UNS N09925', 'Alloy 925'],
  'inconel686': ['UNS N06686', 'Alloy 686'],
  'chromium': ['Cr', 'pure chromium'],
  'ultem1010': ['PEI', 'ULTEM 1010', 'SABIC'],
  'onyx': ['Markforged Onyx', 'micro-carbon nylon'],
  // ── round-5 expansion aliases ──
  'aa5456': ['UNS A95456', 'EN AW-5456', 'AlMg5'],
  'aa6463': ['UNS A96463', 'EN AW-6463'],
  '8740': ['UNS G87400', 'AISI 8740', 'DIN 1.6546'],
  'd3toolsteel': ['DIN 1.2080', 'X210Cr12', 'JIS SKD1', 'AISI D3'],
  'o1toolsteel': ['DIN 1.2510', '100MnCrW4', 'JIS SKS3', 'AISI O1'],
  '316ln': ['UNS S31653', 'EN 1.4429'],
  '422': ['UNS S42200', 'EN 1.4935'],
  'ma754': ['UNS N07754', 'Alloy MA754 ODS'],
  'ma956': ['Alloy MA956', 'FeCrAlY ODS'],
  'incoloy909': ['UNS N19909', 'Alloy 909'],
  'rene88dt': ['Rene 88DT', 'R88DT'],
  'beta21s': ['Ti-15Mo-3Nb-3Al', 'TIMETAL 21S'],
  'c10200': ['UNS C10200', 'OF copper', 'EN CW008A'],
  'c12200': ['UNS C12200', 'DHP copper', 'EN CW024A'],
  'c61400': ['UNS C61400', 'EN CW307G(~)', 'aluminium bronze D'],
  'stellite3': ['UNS R30103', 'Co-31Cr-12.5W'],
  'fsx414': ['Co-29Cr-10Ni-7W', 'X-40 derivative'],
  'hk31a': ['UNS M13310', 'MgTh3Zr'],
  'niobium1zr': ['UNS R04251', 'Nb-1Zr'],
  'rhenium': ['Re', 'pure rhenium'],
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
    const cte = has(/peek|ultem|pei|pes/) ? 50 : has(/nylon|polyamide/) ? 90 : has(/abs|polycarb|\bpc\b/) ? 70 : 80;
    return { ec: 0, tmax, price, cte, poisson: 0.40, cp: 1500, melt: null, qual: { corrosion: 'Excellent', machinability: 'Good', weldability: 'N/A' } };
  }
  if (fam.includes('Copper-based')) {
    const ec = has(/becu|beryllium/) ? 22 : has(/brass/) ? 28 : has(/bronze/) ? 15 : has(/cucr|crzr|grcop|glidcop/) ? 80 : 95;
    return { ec, tmax: 200, price: has(/becu|beryllium/) ? 40 : has(/bronze/) ? 12 : 9, cte: 17.5, poisson: 0.34, cp: 385, melt: has(/brass/) ? 930 : has(/bronze/) ? 950 : 1083, qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' } };
  }
  if (fam.includes('Aluminum-based')) {
    const ec = has(/7075|7050|7175|7068/) ? 33 : has(/2024|2014|2219|2618/) ? 30 : has(/alsi10|alsi7|a356|f357|scalmalloy/) ? 40 : 45;
    return { ec, tmax: has(/7075|7050/) ? 120 : 170, price: has(/scalmalloy/) ? 12 : 4, cte: 23, poisson: 0.33, cp: 900, melt: 650, qual: { corrosion: 'Good', machinability: 'Excellent', weldability: 'Good' } };
  }
  if (fam.includes('Titanium-based')) {
    return { ec: 1.5, tmax: has(/6242|6246|1100/) ? 540 : has(/5553|beta|2154/) ? 315 : 400, price: 35, cte: 8.8, poisson: 0.34, cp: 560, melt: 1650, qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' } };
  }
  if (fam.includes('Nickel-based') || fam.includes('Superalloy')) {
    const tmax = has(/haynes|230/) ? 1100 : has(/hastelloy/) ? 1000 : has(/625/) ? 815 : has(/738|939|713|waspaloy|rene|nimonic|247/) ? 950 : has(/718/) ? 650 : has(/600|601|617/) ? 1000 : 800;
    return { ec: 1.3, tmax, price: has(/waspaloy|rene|haynes|247/) ? 80 : 50, cte: 13, poisson: 0.30, cp: 440, melt: 1350, qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
  }
  if (fam.includes('Cobalt-based')) return { ec: 1.5, tmax: 1000, price: 60, cte: 12.5, poisson: 0.30, cp: 420, melt: 1330, qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
  if (fam.includes('Magnesium-based')) return { ec: 33, tmax: 120, price: 6, cte: 26, poisson: 0.35, cp: 1020, melt: 620, qual: { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Fair' } };
  if (fam.includes('Refractory')) {
    const cte = has(/tungsten|\bw\b/) ? 4.5 : has(/tantal/) ? 6.5 : has(/molybden|\bmo\b|tzm/) ? 5.0 : has(/niobium|\bnb\b|c-?103/) ? 7.3 : 5.5;
    const cp = has(/tungsten|\bw\b/) ? 135 : has(/tantal/) ? 140 : has(/molybden|\bmo\b|tzm/) ? 250 : has(/niobium|\bnb\b|c-?103/) ? 265 : 200;
    const melt = has(/tungsten|\bw\b/) ? 3410 : has(/tantal/) ? 3017 : has(/molybden|\bmo\b|tzm/) ? 2620 : has(/niobium|\bnb\b|c-?103/) ? 2477 : 2600;
    return { ec: 31, tmax: 1000, price: 70, cte, poisson: 0.30, cp, melt, qual: { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' } };
  }
  if (fam.includes('Iron-based') || has(/steel|stainless|invar|kovar/)) {
    if (has(/\binvar\b|fe-?ni-?36|nilo|super-?invar/)) return { ec: 2, tmax: 200, price: 25, cte: 1.3, poisson: 0.29, cp: 515, melt: 1430, qual: { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Good' } };
    if (has(/kovar|fe-?ni-?co|nilo-?k|dilver/)) return { ec: 3, tmax: 450, price: 30, cte: 5.5, poisson: 0.32, cp: 460, melt: 1450, qual: { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Good' } };
    if (has(/stainless|316|304|17-?4|174ph|155ph|duplex|2205|austenit|ferritic|martensit|410|420|440|nitronic/)) {
      const aust = has(/austenit|316|304|310|nitronic/);
      const tmax = aust ? 800 : 500;
      return { ec: 2.5, tmax, price: has(/duplex|2205|nitronic/) ? 6 : 5, cte: aust ? 16 : 10.8, poisson: aust ? 0.30 : 0.29, cp: aust ? 500 : 460, melt: 1440, qual: { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' } };
    }
    if (has(/maraging|18ni|c300|c250|c350|m300/) || sub.includes('maraging')) return { ec: 3, tmax: 400, price: 15, cte: 10.3, poisson: 0.30, cp: 450, melt: 1430, qual: { corrosion: 'Moderate', machinability: 'Good', weldability: 'Excellent' } };
    if (sub.includes('tool') || has(/h13|d2|m2|m4|p20|s7|a2|o1|cpm/)) return { ec: 5, tmax: 550, price: 6, cte: 11.5, poisson: 0.29, cp: 460, melt: 1430, qual: { corrosion: 'Poor', machinability: 'Fair', weldability: 'Poor' } };
    return { ec: 9, tmax: 450, price: 2, cte: 12, poisson: 0.29, cp: 470, melt: 1500, qual: { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' } };
  }
  return { ec: null, tmax: null, price: null, cte: null, poisson: null, cp: null, melt: null, qual: null };
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
  'a286': { fatigue: [350, 420, 480], impact: [30, 45, 60], elevated_temp: [{ temp: 20, ys: 590, uts: 895 }, { temp: 540, ys: 520, uts: 790 }, { temp: 650, ys: 480, uts: 690 }, { temp: 760, ys: 280, uts: 410 }] },
  '2205': { fatigue: [240, 280, 320], impact: [80, 120, 160], elevated_temp: [{ temp: 20, ys: 480, uts: 700 }, { temp: 100, ys: 410, uts: 650 }, { temp: 200, ys: 360, uts: 630 }, { temp: 300, ys: 330, uts: 610 }] },
  'inconel600': { fatigue: [180, 220, 260], impact: [80, 110, 140], elevated_temp: [{ temp: 20, ys: 310, uts: 660 }, { temp: 540, ys: 200, uts: 580 }, { temp: 760, ys: 180, uts: 340 }, { temp: 870, ys: 95, uts: 190 }] },
  'ti6242': { fatigue: [400, 480, 560], impact: [12, 16, 20], elevated_temp: [{ temp: 20, ys: 900, uts: 1010 }, { temp: 200, ys: 740, uts: 870 }, { temp: 400, ys: 620, uts: 760 }, { temp: 540, ys: 540, uts: 690 }] },
  '4140': { fatigue: [340, 400, 460], impact: [40, 55, 70], elevated_temp: [{ temp: 20, ys: 655, uts: 850 }, { temp: 200, ys: 600, uts: 790 }, { temp: 425, ys: 520, uts: 710 }, { temp: 540, ys: 380, uts: 540 }] },
  'h13': { fatigue: [550, 620, 690], impact: [12, 18, 25], elevated_temp: [{ temp: 20, ys: 1380, uts: 1560 }, { temp: 425, ys: 1100, uts: 1280 }, { temp: 540, ys: 900, uts: 1050 }, { temp: 650, ys: 600, uts: 720 }] },
  'cocrmo': { fatigue: [350, 450, 550], impact: [25, 50, 75], elevated_temp: [{ temp: 20, ys: 450, uts: 655 }, { temp: 540, ys: 380, uts: 560 }, { temp: 760, ys: 280, uts: 420 }, { temp: 870, ys: 180, uts: 280 }] },
  'aa5052': { fatigue: [105, 117, 140], impact: [20, 30, 40], elevated_temp: [{ temp: 20, ys: 195, uts: 230 }, { temp: 100, ys: 185, uts: 220 }, { temp: 200, ys: 165, uts: 195 }, { temp: 300, ys: 70, uts: 95 }] },
  'hastelloyx': { fatigue: [255, 290, 325], impact: [80, 110, 140], elevated_temp: [{ temp: 20, ys: 360, uts: 785 }, { temp: 540, ys: 260, uts: 620 }, { temp: 760, ys: 220, uts: 415 }, { temp: 870, ys: 180, uts: 275 }] },
  'haynes282': { fatigue: [400, 475, 550], impact: [50, 80, 110], elevated_temp: [{ temp: 20, ys: 730, uts: 1110 }, { temp: 540, ys: 700, uts: 1050 }, { temp: 760, ys: 650, uts: 920 }, { temp: 870, ys: 480, uts: 620 }] },
  'inconel939': { fatigue: [380, 430, 480], impact: [10, 14, 20], elevated_temp: [{ temp: 20, ys: 800, uts: 1050 }, { temp: 540, ys: 760, uts: 1000 }, { temp: 760, ys: 720, uts: 950 }, { temp: 870, ys: 620, uts: 800 }] },
  'inconel738': { fatigue: [400, 450, 500], impact: [10, 15, 22], elevated_temp: [{ temp: 20, ys: 950, uts: 1130 }, { temp: 540, ys: 920, uts: 1100 }, { temp: 760, ys: 860, uts: 1020 }, { temp: 870, ys: 700, uts: 870 }] },
  '155ph': { fatigue: [480, 540, 600], impact: [25, 40, 55], elevated_temp: [{ temp: 20, ys: 1170, uts: 1310 }, { temp: 300, ys: 1010, uts: 1170 }, { temp: 425, ys: 940, uts: 1080 }, { temp: 540, ys: 760, uts: 900 }] },
};
const REAL_ALIAS = { 'maragingsteel': 'maraging', 'm300': 'maraging', 'ms1': 'maraging', '18ni300': 'maraging', '718': 'inconel718', '625': 'inconel625', '6061': 'aa6061', '7075': 'aa7075', '2024': 'aa2024', '304': '304l', 'a357': 'alsi7mg', '286': 'a286', '600': 'inconel600', '6242': 'ti6242', 'ti6242s': 'ti6242', '316': '316l', '42crmo4': '4140', '4142': '4140', '5052': 'aa5052', '15-5ph': '155ph', '155': '155ph', '174': '174ph', '17-4ph': '174ph', 'cocr': 'cocrmo', 'cocrmoasf75': 'cocrmo', 'cocrmoasf1537': 'cocrmo', '738': 'inconel738', '939': 'inconel939', '282': 'haynes282', 'x': 'hastelloyx' };
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

// R49d — 표준 alloy → 공식/MatWeb/Wikipedia datasheet URL 매핑 (data/standard-datasheets.json).
// build pipeline 의 최종 sources 정리 직전에 모든 material 에 적용 (regex name match → unshift verified URL).
// 일반 alloy (Inconel/Stainless/Steel/Al/Ti/Cu/Mg/refractory/polymer) 의 verified URL 비율 19% → 32%+ 향상.
const STANDARD_DATASHEETS = (() => {
  try { return (JSON.parse(fs.readFileSync(path.join(DATA, 'standard-datasheets.json'), 'utf8')).datasheets) || []; }
  catch { return []; }
})().map((ds) => ({ ...ds, _re: new RegExp(ds.pattern, 'i') }));
function applyStandardSource(m) {
  const n = String(m.name || '').toLowerCase();
  for (const ds of STANDARD_DATASHEETS) {
    if (ds._re.test(n)) {
      m.sources = m.sources || [];
      if (!m.sources.some((s) => s && s.url === ds.url)) {
        m.sources.unshift({ label: ds.label, url: ds.url, verified: true });
      }
      break;
    }
  }
}

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
// Name-based subcategory override — CSV의 잘못된 subcategory를 정정.
// 합금 이름에 분명한 키워드가 있으면 raw subcategory 보다 우선.
function nameBasedSubcategory(name) {
  const n = String(name).toLowerCase();
  if (/inconel|hastelloy|haynes|monel|nimonic|waspaloy|rene|incoloy|udimet|cm247|nitinol|invar|cp-nickel/.test(n)) return 'Nickel Superalloy';
  if (/cocr|cobalt|stellite|haynes 188/.test(n)) return 'Cobalt-based';
  if (/ti[\s-]?6al|ti6al|ti-6|ti5|ti6242|ta15|beta-2/.test(n)) return 'Titanium - α+β';
  if (/tungsten|tantalum|niobium|molybden|rhenium|c-103/.test(n)) return 'Refractory';
  if (/(brass|bronze|cuni|cucr|grcop|becu|beryllium copper)/.test(n)) return 'Copper-based';
  if (/maraging|18ni-?300|m300|c300|c350|ms1/.test(n)) return 'Maraging Steel';
  if (/h13|d2|p20|s7|a2|o1|cpm|m2|m4 |\btool\b/.test(n)) return 'Tool Steel';
  if (/duplex|2205|2507|superduplex/.test(n)) return 'Stainless - Duplex';
  if (/15-?5 ?ph|17-?4 ?ph|155ph|174ph|13-?8 ?ph/.test(n)) return 'Stainless - PH';
  if (/316l?|304l?|310|nitronic|austenit/.test(n)) return 'Stainless - Austenitic';
  return null;
}
function fixSubcategory(name, rawSub) {
  const nb = nameBasedSubcategory(name);
  return nb || aaSubcategory(name) || rawSub;
}
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
// R39 — supplementary loader: `conditions[]` 가 있고 길이가 points 와 같으면 condition 별 row 로 분리.
//        LPBF-Wrought pair 에서 Wrought 쪽 열처리 다양성 (Annealed / Solution / Aged / Q+T / STA / DSA …)
//        을 살리기 위함. 없으면 기존 패턴 — 전체 통합 single row.
const supplementary = supRaw
  .filter((s) => AM_PROC.has(s.process) ? !(curatedAlias.has(norm(alloyOf(s.name))) || curatedAlias.has(norm(baseName(s.name)))) : true)
  .flatMap((s, idx) => {
    const hasConditions = Array.isArray(s.conditions) && s.conditions.length === s.points.length;
    if (hasConditions) {
      // condition 별 별도 entry — heat_treatment 채워서 R38e HT 필터·MaterialDetail 이 인식.
      return s.conditions.map((cond, ci) => {
        const ranges = {};
        for (const p of NUM_PROPS) ranges[p] = null;
        PROP_ORDER.forEach((p, i) => { ranges[p] = rangeFrom([s.points[ci][i]]); });
        if (Array.isArray(s.fatigue) && s.fatigue[ci] != null) ranges.fatigue_strength = rangeFrom([s.fatigue[ci]]);
        if (Array.isArray(s.impact) && s.impact[ci] != null) ranges.impact_strength = rangeFrom([s.impact[ci]]);
        return {
          id: 'R_' + String(idx).padStart(4, '0') + '_' + ci,
          name: `${s.name} — ${cond}`,
          category: s.category, subcategory: s.subcategory, tier: 'reference',
          manufacturers: ['Reference data'], machines: [], processes: [s.process], heat_treatment: cond,
          ranges, composition: s.composition || {}, sources: (s.ref_urls || []).map((u) => ({ label: `Datasheet ${ci + 1}`, url: u, verified: true })),
          points: [s.points[ci]],
          machinability: null, weldability: null, corrosion_resistance: null, meta: { reference: true, condition: cond },
        };
      });
    }
    // 기존 패턴 — 모든 points 통합 (분류 없음)
    const ranges = {};
    for (const p of NUM_PROPS) ranges[p] = null;
    PROP_ORDER.forEach((p, i) => { ranges[p] = rangeFrom(s.points.map((row) => row[i])); });
    if (Array.isArray(s.fatigue)) ranges.fatigue_strength = rangeFrom(s.fatigue);
    if (Array.isArray(s.impact)) ranges.impact_strength = rangeFrom(s.impact);
    return [{
      id: 'R_' + String(idx).padStart(4, '0'),
      name: s.name, category: s.category, subcategory: s.subcategory, tier: 'reference',
      manufacturers: ['Reference data'], machines: [], processes: [s.process], heat_treatment: null,
      ranges, composition: s.composition || {}, sources: s.sources || [], points: s.points,
      machinability: null, weldability: null, corrosion_resistance: null, meta: { reference: true },
    }];
  });
// R25 — Ceramic 30종 별도 파일 (data/ceramics-data.json) 에서 로드해 material 형식으로 변환 → all 에 추가.
const CERAMIC_PROPS = ['density', 'yield_strength', 'uts', 'modulus', 'hardness', 'thermal_conductivity', 'thermal_expansion', 'max_service_temp', 'poisson_ratio', 'specific_heat', 'melting_point', 'price_per_kg', 'electrical_conductivity'];
function loadCeramicsAsMaterials() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA, 'ceramics-data.json'), 'utf8'));
    const ceramics = raw.ceramics || [];
    return ceramics.map((c, i) => {
      const ranges = {};
      for (const p of CERAMIC_PROPS) ranges[p] = null;
      const setR = (k, v) => { if (v != null && isFinite(v)) ranges[k] = { min: v, max: v, typical: v, n: 1, confidence: 'handbook' }; };
      setR('density', c.density);
      setR('yield_strength', c.ys);
      setR('uts', c.uts);
      setR('modulus', c.modulus);
      setR('hardness', c.hardness_HV);
      setR('thermal_conductivity', c.thermal_k);
      setR('thermal_expansion', c.cte);
      setR('max_service_temp', c.max_temp);
      setR('poisson_ratio', c.poisson);
      setR('specific_heat', c.specific_heat);
      setR('melting_point', c.melting_point);
      setR('price_per_kg', c.price_per_kg);
      setR('electrical_conductivity', c.electrical_conductivity);
      setR('fracture_toughness', c.fracture_toughness);
      return {
        id: 'CER_' + String(i).padStart(3, '0'),
        name: c.name, category: 'Ceramic', subcategory: c.subcategory || 'Oxide', tier: 'reference',
        manufacturers: ['Reference data'], machines: [], processes: ['Sintered'],
        heat_treatment: null, ranges,
        composition: c.composition || {}, sources: [{ label: c.applications ? `Applications: ${c.applications}` : 'Ceramic handbook', url: null, verified: false }],
        machinability: null, weldability: null, corrosion_resistance: 'Excellent',
        meta: { ceramic: true, applications: c.applications, limitations: c.limitations },
        popularity: c.popularity || 3,
      };
    });
  } catch { return []; }
}
const ceramics = loadCeramicsAsMaterials();
// R26 — 복합재 30종 (data/composites-data.json). CFRP/GFRP/AFK/UHMWPE/Wood/Foam/MMC/CMC 카테고리.
function loadCompositesAsMaterials() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA, 'composites-data.json'), 'utf8'));
    const list = raw.composites || [];
    return list.map((c, i) => {
      const ranges = {};
      for (const p of CERAMIC_PROPS) ranges[p] = null;
      ranges.elongation = null;
      const setR = (k, v) => { if (v != null && isFinite(v)) ranges[k] = { min: v, max: v, typical: v, n: 1, confidence: 'handbook' }; };
      setR('density', c.density);
      setR('yield_strength', c.ys);
      setR('uts', c.uts);
      setR('modulus', c.modulus);
      setR('elongation', c.elongation);
      setR('thermal_conductivity', c.thermal_k);
      setR('thermal_expansion', c.cte);
      setR('max_service_temp', c.max_temp);
      setR('price_per_kg', c.price_per_kg);
      return {
        id: 'CMP_' + String(i).padStart(3, '0'),
        name: c.name, category: 'Composite', subcategory: c.subcategory || 'Composite', tier: 'reference',
        manufacturers: ['Reference data'], machines: [], processes: ['Layup'],
        heat_treatment: null, ranges, composition: {},
        sources: [{ label: c.applications ? `Apps: ${c.applications}` : 'Composites handbook', url: null, verified: false }],
        machinability: null, weldability: null, corrosion_resistance: null,
        meta: { composite: true, anisotropic: true, ply_direction: c.ply_direction, fiber_vf: c.fiber_vf, applications: c.applications, limitations: c.limitations,
          anisotropy_note: '복합재 — 강성·강도가 fiber 방향 의존. 0° UD 값 (수직 방향은 1/10~1/20).' },
        popularity: c.popularity || 3,
      };
    });
  } catch { return []; }
}
const composites = loadCompositesAsMaterials();
// R34a — 고성능/엔지니어링 폴리머 19종 (data/polymers-data.json) PEEK / PEEK-CF / ULTEM / PEKK / PSU / PPSU / PA12 / PA66 / Vespel / POM / PC. tg/tm/hdt/flame/uv 등 폴리머 특유 속성 meta 에 보존.
const POLYMER_NUM = ['density', 'yield_strength', 'uts', 'modulus', 'elongation', 'thermal_conductivity', 'thermal_expansion', 'max_service_temp', 'price_per_kg'];
function loadPolymersAsMaterials() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA, 'polymers-data.json'), 'utf8'));
    const list = raw.polymers || [];
    return list.map((p, i) => {
      const ranges = {};
      for (const k of POLYMER_NUM) ranges[k] = null;
      const setR = (k, v) => { if (v != null && isFinite(v)) ranges[k] = { min: v, max: v, typical: v, n: 1, confidence: 'handbook' }; };
      setR('density', p.density);
      setR('yield_strength', p.ys);
      setR('uts', p.uts);
      setR('modulus', p.modulus);
      setR('elongation', p.elongation);
      setR('thermal_conductivity', p.thermal_k);
      setR('thermal_expansion', p.cte);
      setR('max_service_temp', p.max_temp);
      setR('price_per_kg', p.price_per_kg);
      const sources = [];
      if (p.datasheet_url) sources.push({ label: `Datasheet — ${p.name.split(' — ')[0]}`, url: p.datasheet_url, verified: true });
      if (p.applications) sources.push({ label: `Applications: ${p.applications}`, url: null, verified: false });
      return {
        id: 'POL_' + String(i).padStart(3, '0'),
        name: p.name, category: 'Polymer', subcategory: p.subcategory || 'Polymer - Other', tier: 'reference',
        manufacturers: ['Reference data'], machines: [], processes: ['Injection Molding'],
        heat_treatment: null, ranges, composition: {},
        sources,
        machinability: null, weldability: null, corrosion_resistance: null,
        meta: { polymer: true, tg: p.tg, tm: p.tm, hdt_182: p.hdt_182, moisture_24h: p.moisture_24h,
          flame_ul94: p.flame_ul94, uv_resistance: p.uv_resistance,
          applications: p.applications, limitations: p.limitations },
        popularity: p.popularity || 3,
      };
    });
  } catch (err) { console.error('Polymer load failed:', err.message); return []; }
}
const polymers_extra = loadPolymersAsMaterials();
const all = [...curated, ...am_vendor, ...generic, ...supplementary, ...ceramics, ...composites, ...polymers_extra];

// R20 — Ni 초합금 5종 (Inconel 718, 625, 738LC, Haynes 230, Hastelloy X) 의 elevated_temp + creep_rupture.
// 출처: Special Metals SMC-045/093, Haynes International H-3000H/H-3008C, ASM Aerospace.
//   const 가 hoisting 되지 않아 loop 전에 선언해야 injectTempCurves() 가 ELEV_DATA 접근 가능.
const ELEV_DATA = {
  'inconel 718': {
    elevated_temp: [
      { temp: 25,  ys: 1100, uts: 1280, E: 200 },
      { temp: 200, ys: 1050, uts: 1230, E: 192 },
      { temp: 400, ys: 1020, uts: 1180, E: 178 },
      { temp: 600, ys: 980,  uts: 1110, E: 168 },
      { temp: 650, ys: 950,  uts: 1050, E: 162 },
      { temp: 760, ys: 760,  uts: 850,  E: 145 },
    ],
    creep_rupture: [
      { temp: 650, stress: 700, hours: 100 },
      { temp: 650, stress: 620, hours: 1000 },
      { temp: 650, stress: 540, hours: 10000 },
      { temp: 700, stress: 480, hours: 1000 },
      { temp: 760, stress: 410, hours: 100 },
      { temp: 760, stress: 310, hours: 1000 },
    ],
  },
  'inconel 625': {
    elevated_temp: [
      { temp: 25,  ys: 480, uts: 930, E: 207 },
      { temp: 200, ys: 420, uts: 890, E: 200 },
      { temp: 400, ys: 380, uts: 850, E: 188 },
      { temp: 600, ys: 360, uts: 800, E: 172 },
      { temp: 800, ys: 320, uts: 540, E: 154 },
      { temp: 900, ys: 240, uts: 320, E: 140 },
    ],
    creep_rupture: [
      { temp: 650, stress: 450, hours: 1000 },
      { temp: 760, stress: 240, hours: 1000 },
      { temp: 800, stress: 200, hours: 100 },
      { temp: 900, stress: 100, hours: 1000 },
    ],
  },
  'inconel 738': {
    elevated_temp: [
      { temp: 25,   ys: 950, uts: 1095, E: 200 },
      { temp: 600,  ys: 870, uts: 980,  E: 169 },
      { temp: 800,  ys: 760, uts: 850,  E: 145 },
      { temp: 900,  ys: 580, uts: 660,  E: 130 },
      { temp: 1000, ys: 350, uts: 400,  E: 110 },
    ],
    creep_rupture: [
      { temp: 850,  stress: 350, hours: 100 },
      { temp: 900,  stress: 200, hours: 1000 },
      { temp: 1000, stress: 100, hours: 1000 },
    ],
  },
  'haynes 230': {
    elevated_temp: [
      { temp: 25,   ys: 400, uts: 860, E: 211 },
      { temp: 400,  ys: 280, uts: 800, E: 197 },
      { temp: 600,  ys: 260, uts: 770, E: 184 },
      { temp: 800,  ys: 240, uts: 530, E: 162 },
      { temp: 1000, ys: 165, uts: 240, E: 130 },
    ],
    creep_rupture: [
      { temp: 800,  stress: 165, hours: 100 },
      { temp: 900,  stress: 90,  hours: 1000 },
      { temp: 1000, stress: 35,  hours: 1000 },
    ],
  },
  'hastelloy x': {
    elevated_temp: [
      { temp: 25,   ys: 360, uts: 770, E: 205 },
      { temp: 400,  ys: 280, uts: 680, E: 184 },
      { temp: 600,  ys: 250, uts: 620, E: 168 },
      { temp: 800,  ys: 240, uts: 470, E: 145 },
      { temp: 1000, ys: 130, uts: 195, E: 124 },
    ],
    creep_rupture: [
      { temp: 760, stress: 140, hours: 1000 },
      { temp: 870, stress: 70,  hours: 1000 },
      { temp: 980, stress: 35,  hours: 1000 },
    ],
  },
  // R21 — 9 additional alloys spanning Ti, SS, Al, tool steel, Cu, Ni superalloy.
  // 출처: MMPDS-15, ASM Handbook Vol.2, Special Metals, Carpenter Technology datasheets.
  'ti6al4v': {  // Grade 5 / Gr23 ELI — annealed
    elevated_temp: [
      { temp: 25,  ys: 880, uts: 950, E: 113 },
      { temp: 200, ys: 750, uts: 830, E: 110 },
      { temp: 300, ys: 700, uts: 780, E: 104 },
      { temp: 400, ys: 600, uts: 690, E: 100 },
      { temp: 500, ys: 450, uts: 590, E:  92 },
    ],
    // Ti 의 creep 은 400°C 이상에서 의미 있음 (ASM Handbook Vol.2 Table 2.62).
    creep_rupture: [
      { temp: 450, stress: 350, hours: 100 },
      { temp: 450, stress: 280, hours: 1000 },
      { temp: 500, stress: 200, hours: 1000 },
    ],
  },
  'ti-6al-4v': {  // 별칭 패턴
    elevated_temp: [
      { temp: 25,  ys: 880, uts: 950, E: 113 },
      { temp: 200, ys: 750, uts: 830, E: 110 },
      { temp: 300, ys: 700, uts: 780, E: 104 },
      { temp: 400, ys: 600, uts: 690, E: 100 },
      { temp: 500, ys: 450, uts: 590, E:  92 },
    ],
    creep_rupture: [
      { temp: 450, stress: 350, hours: 100 },
      { temp: 450, stress: 280, hours: 1000 },
      { temp: 500, stress: 200, hours: 1000 },
    ],
  },
  '304l': {  // Annealed austenitic — ASM Handbook Vol.2 / Carpenter datasheet
    elevated_temp: [
      { temp: 25,  ys: 200, uts: 520, E: 195 },
      { temp: 200, ys: 150, uts: 460, E: 186 },
      { temp: 400, ys: 130, uts: 410, E: 170 },
      { temp: 600, ys: 110, uts: 350, E: 153 },
      { temp: 800, ys:  70, uts: 200, E: 130 },
    ],
    creep_rupture: [
      { temp: 600, stress: 150, hours: 1000 },
      { temp: 700, stress:  60, hours: 1000 },
      { temp: 800, stress:  20, hours: 1000 },
    ],
  },
  '316l': {  // Annealed — Carpenter Custom 316L datasheet
    elevated_temp: [
      { temp: 25,  ys: 220, uts: 550, E: 200 },
      { temp: 200, ys: 170, uts: 480, E: 191 },
      { temp: 400, ys: 140, uts: 430, E: 174 },
      { temp: 600, ys: 115, uts: 370, E: 156 },
      { temp: 800, ys:  80, uts: 220, E: 132 },
    ],
    creep_rupture: [
      { temp: 650, stress: 100, hours: 1000 },
      { temp: 750, stress:  50, hours: 1000 },
      { temp: 850, stress:  20, hours: 1000 },
    ],
  },
  '7075': {  // 7075-T6 — MMPDS-15 Table 3.7.4.0
    elevated_temp: [
      { temp: 25,  ys: 503, uts: 572, E: 71.7 },
      { temp: 100, ys: 400, uts: 470, E: 69   },
      { temp: 200, ys: 200, uts: 240, E: 65   },
      { temp: 300, ys:  60, uts:  90, E: 58   },
    ],
  },
  '6061': {  // 6061-T6 — MMPDS-15 / ASM Handbook Vol.2
    elevated_temp: [
      { temp: 25,  ys: 276, uts: 310, E: 68.9 },
      { temp: 100, ys: 260, uts: 290, E: 66   },
      { temp: 200, ys: 130, uts: 170, E: 60   },
      { temp: 300, ys:  50, uts:  75, E: 50   },
    ],
  },
  'h13': {  // Quenched + double-tempered. 다이캐스팅 다이 표준 (NADCA #207).
    elevated_temp: [
      { temp: 25,  ys: 1500, uts: 1850, E: 210 },
      { temp: 200, ys: 1380, uts: 1750, E: 200 },
      { temp: 400, ys: 1240, uts: 1500, E: 185 },
      { temp: 500, ys: 1100, uts: 1300, E: 170 },
      { temp: 600, ys:  850, uts: 1000, E: 150 },
    ],
    creep_rupture: [
      { temp: 600, stress: 500, hours: 1000 },
      { temp: 700, stress: 250, hours: 100 },
      { temp: 700, stress: 180, hours: 1000 },
    ],
  },
  'cu (pure': {  // DB 의 'Cu (Pure)' — OFHC / C10100 / C11000 등 annealed copper.
    elevated_temp: [
      { temp: 25,  ys: 70, uts: 220, E: 117 },
      { temp: 100, ys: 60, uts: 200, E: 113 },
      { temp: 200, ys: 50, uts: 170, E: 107 },
      { temp: 300, ys: 40, uts: 140, E: 100 },
      { temp: 400, ys: 30, uts: 110, E:  90 },
    ],
  },
  'waspaloy': {  // Solution + age — Special Metals
    elevated_temp: [
      { temp: 25,  ys: 1000, uts: 1300, E: 209 },
      { temp: 400, ys:  950, uts: 1240, E: 192 },
      { temp: 600, ys:  900, uts: 1150, E: 175 },
      { temp: 760, ys:  800, uts:  950, E: 153 },
      { temp: 900, ys:  350, uts:  500, E: 130 },
    ],
    creep_rupture: [
      { temp: 730, stress: 540, hours: 100 },
      { temp: 760, stress: 420, hours: 1000 },
      { temp: 815, stress: 240, hours: 1000 },
    ],
  },
  'rene 41': {  // Solution + age — High-Temp Aerospace
    elevated_temp: [
      { temp: 25,  ys: 1050, uts: 1410, E: 215 },
      { temp: 540, ys:  950, uts: 1310, E: 188 },
      { temp: 760, ys:  900, uts: 1100, E: 158 },
      { temp: 870, ys:  600, uts:  700, E: 138 },
    ],
    creep_rupture: [
      { temp: 760, stress: 580, hours: 100 },
      { temp: 870, stress: 280, hours: 1000 },
    ],
  },
  // R23 — 추가 10 합금 (의료·항공·PH·합금강·전통 Ni base).
  // 출처: ASTM F75/F90, ASM Handbook Vol.2, Special Metals SMC, Haynes International H-3068C, Carpenter Custom 15Cr-5Ni.
  'cocrmo': {  // ASTM F75 cast cobalt-chrome-molybdenum (의료 임플란트).
    elevated_temp: [
      { temp: 25,  ys: 500, uts: 800, E: 230 },
      { temp: 200, ys: 460, uts: 760, E: 220 },
      { temp: 400, ys: 420, uts: 700, E: 200 },
      { temp: 600, ys: 400, uts: 600, E: 180 },
    ],
  },
  'l605': {  // L-605 / Haynes 25 Co-base superalloy (의료 스텐트 + 고온 항공)
    elevated_temp: [
      { temp: 25,   ys: 460, uts: 1000, E: 220 },
      { temp: 400,  ys: 350, uts:  850, E: 200 },
      { temp: 600,  ys: 290, uts:  720, E: 180 },
      { temp: 800,  ys: 250, uts:  410, E: 160 },
      { temp: 1000, ys: 110, uts:  170, E: 130 },
    ],
    creep_rupture: [
      { temp: 815, stress: 80, hours: 1000 },
      { temp: 900, stress: 40, hours: 1000 },
    ],
  },
  'mar-m247': {  // 단결정 Ni superalloy turbine blade
    elevated_temp: [
      { temp: 25,   ys: 870, uts: 1080, E: 195 },
      { temp: 800,  ys: 750, uts:  950, E: 160 },
      { temp: 900,  ys: 600, uts:  700, E: 145 },
      { temp: 1000, ys: 350, uts:  400, E: 130 },
      { temp: 1050, ys: 200, uts:  230, E: 120 },
    ],
    creep_rupture: [
      { temp: 982,  stress: 110, hours: 1000 },
      { temp: 1038, stress: 70,  hours: 1000 },
      { temp: 1093, stress: 60,  hours: 100 },
    ],
  },
  '17-4 ph': {  // H900 condition — PH stainless 표준
    elevated_temp: [
      { temp: 25,  ys: 1170, uts: 1310, E: 200 },
      { temp: 200, ys: 1050, uts: 1190, E: 190 },
      { temp: 300, ys: 1000, uts: 1140, E: 184 },
      { temp: 400, ys:  900, uts: 1020, E: 175 },
      { temp: 500, ys:  700, uts:  800, E: 165 },
    ],
  },
  '17-4ph': {  // 별칭 (붙어있는 표기)
    elevated_temp: [
      { temp: 25,  ys: 1170, uts: 1310, E: 200 },
      { temp: 200, ys: 1050, uts: 1190, E: 190 },
      { temp: 300, ys: 1000, uts: 1140, E: 184 },
      { temp: 400, ys:  900, uts: 1020, E: 175 },
      { temp: 500, ys:  700, uts:  800, E: 165 },
    ],
  },
  '15-5 ph': {  // H900 condition — clean PH (Δ-ferrite 적음)
    elevated_temp: [
      { temp: 25,  ys: 1170, uts: 1310, E: 196 },
      { temp: 200, ys: 1050, uts: 1180, E: 187 },
      { temp: 300, ys: 1010, uts: 1130, E: 180 },
      { temp: 400, ys:  920, uts: 1020, E: 172 },
    ],
  },
  '15-5ph': {  // 별칭
    elevated_temp: [
      { temp: 25,  ys: 1170, uts: 1310, E: 196 },
      { temp: 200, ys: 1050, uts: 1180, E: 187 },
      { temp: 300, ys: 1010, uts: 1130, E: 180 },
      { temp: 400, ys:  920, uts: 1020, E: 172 },
    ],
  },
  'a286': {  // 별칭 (dash 없는 표기)
    elevated_temp: [
      { temp: 25,  ys: 660, uts: 1000, E: 201 },
      { temp: 200, ys: 600, uts:  920, E: 190 },
      { temp: 400, ys: 580, uts:  870, E: 175 },
      { temp: 600, ys: 540, uts:  800, E: 158 },
      { temp: 700, ys: 480, uts:  680, E: 145 },
    ],
    creep_rupture: [
      { temp: 650, stress: 290, hours: 1000 },
      { temp: 730, stress: 170, hours: 1000 },
    ],
  },
  'a-286': {  // AMS 5731 Fe-Ni-Cr-Ti austenitic + age — 가스 터빈 디스크
    elevated_temp: [
      { temp: 25,  ys: 660, uts: 1000, E: 201 },
      { temp: 200, ys: 600, uts:  920, E: 190 },
      { temp: 400, ys: 580, uts:  870, E: 175 },
      { temp: 600, ys: 540, uts:  800, E: 158 },
      { temp: 700, ys: 480, uts:  680, E: 145 },
    ],
    creep_rupture: [
      { temp: 650, stress: 290, hours: 1000 },
      { temp: 730, stress: 170, hours: 1000 },
    ],
  },
  '4140': {  // AISI 4140 / 42CrMo4 / SCM440 Q+T — 자동차·기계 표준
    elevated_temp: [
      { temp: 25,  ys: 685, uts: 760, E: 210 },
      { temp: 200, ys: 620, uts: 700, E: 200 },
      { temp: 300, ys: 580, uts: 660, E: 190 },
      { temp: 400, ys: 510, uts: 580, E: 178 },
      { temp: 500, ys: 350, uts: 420, E: 162 },
      { temp: 600, ys: 180, uts: 240, E: 142 },
    ],
  },
  'nimonic 80a': {  // Ni-Cr-Ti-Al precipitation hardened — turbine blade
    elevated_temp: [
      { temp: 25,  ys: 780, uts: 1230, E: 219 },
      { temp: 600, ys: 740, uts: 1150, E: 195 },
      { temp: 750, ys: 680, uts:  940, E: 175 },
      { temp: 815, ys: 550, uts:  700, E: 165 },
      { temp: 870, ys: 250, uts:  350, E: 150 },
    ],
    creep_rupture: [
      { temp: 750, stress: 280, hours: 1000 },
      { temp: 815, stress: 180, hours: 1000 },
      { temp: 870, stress: 60,  hours: 1000 },
    ],
  },
  'inconel 706': {  // 구 turbine disk (718 의 전임자)
    elevated_temp: [
      { temp: 25,  ys: 1000, uts: 1300, E: 209 },
      { temp: 400, ys:  920, uts: 1200, E: 192 },
      { temp: 540, ys:  880, uts: 1140, E: 180 },
      { temp: 650, ys:  750, uts:  940, E: 162 },
    ],
  },
  'inconel 600': {  // Annealed Ni-Cr-Fe — 열교환기·요업 furnace
    elevated_temp: [
      { temp: 25,   ys: 250, uts: 615, E: 207 },
      { temp: 400,  ys: 180, uts: 560, E: 195 },
      { temp: 600,  ys: 160, uts: 500, E: 180 },
      { temp: 800,  ys: 140, uts: 380, E: 158 },
      { temp: 1000, ys:  60, uts:  90, E: 130 },
    ],
    creep_rupture: [
      { temp: 800, stress: 30, hours: 1000 },
      { temp: 900, stress: 15, hours: 1000 },
    ],
  },
  // R24 — 25 additional alloys.
  // Ti 등급 — DB 패턴 'Ti CP Gr2' 또는 'Ti Grade 1' (둘 다 매칭).
  'ti cp gr1': { elevated_temp: [{ temp: 25, ys: 170, uts: 240, E: 103 }, { temp: 200, ys: 130, uts: 190, E: 98 }] },
  'ti cp gr2': { elevated_temp: [{ temp: 25, ys: 275, uts: 345, E: 105 }, { temp: 200, ys: 180, uts: 250, E: 100 }, { temp: 400, ys: 80, uts: 140, E: 90 }] },
  'ti cp gr3': { elevated_temp: [{ temp: 25, ys: 380, uts: 450, E: 105 }, { temp: 200, ys: 280, uts: 350, E: 100 }] },
  'ti cp gr4': { elevated_temp: [{ temp: 25, ys: 480, uts: 550, E: 108 }, { temp: 200, ys: 350, uts: 430, E: 102 }] },
  'ti grade 1': { elevated_temp: [{ temp: 25, ys: 170, uts: 240, E: 103 }, { temp: 200, ys: 130, uts: 190, E: 98 }] },
  'ti grade 2': { elevated_temp: [{ temp: 25, ys: 275, uts: 345, E: 105 }, { temp: 200, ys: 180, uts: 250, E: 100 }] },
  'ti grade 3': { elevated_temp: [{ temp: 25, ys: 380, uts: 450, E: 105 }, { temp: 200, ys: 280, uts: 350, E: 100 }] },
  'ti grade 4': { elevated_temp: [{ temp: 25, ys: 480, uts: 550, E: 108 }, { temp: 200, ys: 350, uts: 430, E: 102 }] },
  'ti-6242': {  // Ti-6Al-2Sn-4Zr-2Mo — 고온 항공 엔진
    elevated_temp: [
      { temp: 25,  ys: 950,  uts: 1010, E: 114 },
      { temp: 300, ys: 760,  uts:  870, E: 108 },
      { temp: 450, ys: 620,  uts:  740, E: 100 },
      { temp: 540, ys: 540,  uts:  650, E:  95 },
    ],
    creep_rupture: [{ temp: 480, stress: 380, hours: 1000 }, { temp: 540, stress: 250, hours: 1000 }],
  },
  'ti-5553': {  // Ti-5Al-5V-5Mo-3Cr — 고강도 항공 구조 (랜딩기어)
    elevated_temp: [
      { temp: 25,  ys: 1240, uts: 1310, E: 113 },
      { temp: 200, ys: 1100, uts: 1190, E: 108 },
      { temp: 400, ys:  920, uts: 1000, E: 100 },
    ],
  },
  'ti-beta-21s': {  // β-Ti — 형상기억·박판
    elevated_temp: [
      { temp: 25,  ys: 1175, uts: 1240, E: 105 },
      { temp: 300, ys:  920, uts: 1000, E:  96 },
      { temp: 500, ys:  600, uts:  700, E:  85 },
    ],
  },
  'ti-3al-2.5v': {  // Aerospace tubing
    elevated_temp: [
      { temp: 25,  ys: 620, uts: 700, E: 100 },
      { temp: 200, ys: 480, uts: 580, E:  95 },
      { temp: 300, ys: 380, uts: 480, E:  90 },
    ],
  },
  // Al 합금 — DB 패턴 'AA 2014' 형식 매칭.
  'aa 2014': {
    elevated_temp: [
      { temp: 25,  ys: 414, uts: 483, E: 72 },
      { temp: 100, ys: 380, uts: 450, E: 70 },
      { temp: 200, ys: 180, uts: 220, E: 64 },
      { temp: 300, ys:  60, uts:  90, E: 56 },
    ],
  },
  'aa 5052': {
    elevated_temp: [
      { temp: 25,  ys: 193, uts: 228, E: 70 },
      { temp: 100, ys: 180, uts: 220, E: 68 },
      { temp: 200, ys: 130, uts: 180, E: 64 },
    ],
  },
  'aa 5083': {
    elevated_temp: [
      { temp: 25,  ys: 145, uts: 290, E: 70 },
      { temp: 200, ys: 100, uts: 200, E: 64 },
      { temp: 300, ys:  60, uts: 120, E: 58 },
    ],
  },
  'aa 2024': {
    elevated_temp: [
      { temp: 25,  ys: 345, uts: 483, E: 73 },
      { temp: 100, ys: 320, uts: 450, E: 71 },
      { temp: 200, ys: 220, uts: 290, E: 65 },
      { temp: 300, ys:  85, uts: 130, E: 56 },
    ],
  },
  'aa 7050': {  // 항공 plate
    elevated_temp: [
      { temp: 25,  ys: 470, uts: 540, E: 71.7 },
      { temp: 100, ys: 420, uts: 490, E:  69 },
      { temp: 200, ys: 270, uts: 320, E:  64 },
    ],
  },
  'aa 6082': {
    elevated_temp: [
      { temp: 25,  ys: 250, uts: 290, E: 70 },
      { temp: 100, ys: 230, uts: 270, E: 67 },
      { temp: 200, ys: 130, uts: 170, E: 60 },
    ],
  },
  'aa 6063': {
    elevated_temp: [
      { temp: 25,  ys: 145, uts: 185, E: 68 },
      { temp: 100, ys: 140, uts: 180, E: 65 },
      { temp: 200, ys:  75, uts: 100, E: 58 },
    ],
  },
  // 스테인리스 확장
  '301': {  // 1/4 hard or full annealed
    elevated_temp: [
      { temp: 25,  ys: 275, uts: 760, E: 193 },
      { temp: 200, ys: 200, uts: 660, E: 184 },
      { temp: 400, ys: 165, uts: 550, E: 168 },
      { temp: 600, ys: 140, uts: 440, E: 150 },
    ],
  },
  '321': {  // Ti-stabilized austenitic
    elevated_temp: [
      { temp: 25,  ys: 240, uts: 600, E: 200 },
      { temp: 200, ys: 180, uts: 510, E: 191 },
      { temp: 400, ys: 150, uts: 470, E: 175 },
      { temp: 600, ys: 130, uts: 410, E: 158 },
      { temp: 800, ys:  90, uts: 250, E: 135 },
    ],
    creep_rupture: [{ temp: 650, stress: 130, hours: 1000 }, { temp: 800, stress: 35, hours: 1000 }],
  },
  '347': {  // Nb-stabilized
    elevated_temp: [
      { temp: 25,  ys: 245, uts: 620, E: 200 },
      { temp: 400, ys: 160, uts: 470, E: 174 },
      { temp: 600, ys: 135, uts: 400, E: 157 },
      { temp: 800, ys:  90, uts: 230, E: 135 },
    ],
    creep_rupture: [{ temp: 700, stress: 100, hours: 1000 }],
  },
  '310': {  // High-temp stainless (25Cr-20Ni)
    elevated_temp: [
      { temp: 25,   ys: 220, uts: 550, E: 200 },
      { temp: 600,  ys: 120, uts: 410, E: 158 },
      { temp: 800,  ys: 100, uts: 270, E: 138 },
      { temp: 1000, ys:  60, uts: 140, E: 115 },
    ],
    creep_rupture: [{ temp: 900, stress: 35, hours: 1000 }, { temp: 1000, stress: 20, hours: 1000 }],
  },
  '904l': {  // Super-austenitic, 부식 저항
    elevated_temp: [
      { temp: 25,  ys: 220, uts: 540, E: 195 },
      { temp: 400, ys: 140, uts: 420, E: 175 },
      { temp: 600, ys: 110, uts: 350, E: 155 },
    ],
  },
  '2205 duplex': {  // 23Cr-5Ni-3Mo-N
    elevated_temp: [
      { temp: 25,  ys: 450, uts: 655, E: 200 },
      { temp: 200, ys: 360, uts: 600, E: 191 },
      { temp: 300, ys: 320, uts: 570, E: 184 },
    ],
  },
  '2507 super duplex': {  // 25Cr-7Ni-4Mo-N
    elevated_temp: [
      { temp: 25,  ys: 550, uts: 750, E: 200 },
      { temp: 200, ys: 470, uts: 700, E: 191 },
      { temp: 300, ys: 430, uts: 660, E: 184 },
    ],
  },
  '410': {  // Martensitic SS — Q+T
    elevated_temp: [
      { temp: 25,  ys: 500, uts: 660, E: 200 },
      { temp: 300, ys: 380, uts: 540, E: 184 },
      { temp: 500, ys: 240, uts: 380, E: 165 },
    ],
  },
  '420': {  // High-C martensitic — knife/bearing
    elevated_temp: [
      { temp: 25,  ys: 1480, uts: 1720, E: 200 },
      { temp: 200, ys: 1330, uts: 1570, E: 192 },
      { temp: 400, ys: 1100, uts: 1300, E: 174 },
    ],
  },
  // 탄소강·합금강 확장
  '4340': {  // Q+T — high-strength alloy steel
    elevated_temp: [
      { temp: 25,  ys: 860, uts: 1280, E: 200 },
      { temp: 200, ys: 800, uts: 1180, E: 191 },
      { temp: 400, ys: 670, uts: 950,  E: 175 },
      { temp: 500, ys: 500, uts: 680,  E: 160 },
    ],
  },
  '8620': {  // 침탄 표준
    elevated_temp: [
      { temp: 25,  ys: 360, uts: 540, E: 200 },
      { temp: 200, ys: 320, uts: 500, E: 191 },
      { temp: 400, ys: 270, uts: 430, E: 174 },
    ],
  },
  '52100': {  // 베어링강 (Q+T)
    elevated_temp: [
      { temp: 25,  ys: 1700, uts: 2000, E: 210 },
      { temp: 200, ys: 1500, uts: 1850, E: 200 },
      { temp: 400, ys: 1100, uts: 1400, E: 180 },
    ],
  },
  '1045': {  // 표준 탄소강
    elevated_temp: [
      { temp: 25,  ys: 410, uts: 565, E: 200 },
      { temp: 200, ys: 350, uts: 510, E: 192 },
      { temp: 400, ys: 240, uts: 360, E: 175 },
    ],
  },
  // 공구강 추가
  'a2': {  // Air-hardening tool steel
    elevated_temp: [
      { temp: 25,  ys: 1860, uts: 2070, E: 210 },
      { temp: 200, ys: 1700, uts: 1900, E: 200 },
      { temp: 400, ys: 1380, uts: 1620, E: 180 },
    ],
  },
  'm2 hss': {  // High-speed steel
    elevated_temp: [
      { temp: 25,  ys: 1900, uts: 2200, E: 210 },
      { temp: 400, ys: 1700, uts: 1980, E: 195 },
      { temp: 540, ys: 1450, uts: 1700, E: 180 },
    ],
  },
  'h11': {  // Hot-work die steel
    elevated_temp: [
      { temp: 25,  ys: 1400, uts: 1700, E: 207 },
      { temp: 400, ys: 1100, uts: 1380, E: 188 },
      { temp: 540, ys:  900, uts: 1100, E: 170 },
      { temp: 600, ys:  700, uts:  900, E: 155 },
    ],
  },
  // Cu 확장 — DB 'C17200' 또는 'Beryllium Copper'.
  'c17200': {  // Berylium copper — 정밀 스프링
    elevated_temp: [
      { temp: 25,  ys: 1100, uts: 1280, E: 128 },
      { temp: 200, ys:  900, uts: 1100, E: 124 },
      { temp: 300, ys:  600, uts:  800, E: 115 },
    ],
  },
  'beryllium copper': {
    elevated_temp: [
      { temp: 25,  ys: 1100, uts: 1280, E: 128 },
      { temp: 200, ys:  900, uts: 1100, E: 124 },
      { temp: 300, ys:  600, uts:  800, E: 115 },
    ],
  },
  'cuni 90-10': {  // C70600 marine heat exchanger
    elevated_temp: [
      { temp: 25,  ys: 120, uts: 320, E: 138 },
      { temp: 200, ys: 100, uts: 290, E: 130 },
      { temp: 400, ys:  80, uts: 240, E: 118 },
      { temp: 600, ys:  40, uts: 130, E: 100 },
    ],
  },
  'cuni 70-30': {  // C71500
    elevated_temp: [
      { temp: 25,  ys: 130, uts: 380, E: 150 },
      { temp: 200, ys: 110, uts: 340, E: 142 },
      { temp: 400, ys:  85, uts: 270, E: 128 },
    ],
  },
  // R34a — 고성능 폴리머 elevated_temp (typical thermoplastic creep: Tg 부근 강도 급강하).
  //   출처: Victrex PEEK technical guide, SABIC ULTEM design guide, Solvay KetaSpire & KEPSTAN datasheet,
  //   DuPont Delrin handbook, SABIC Lexan PC design guide.
  'peek victrex 450g': {
    elevated_temp: [
      { temp: 25,  ys: 100, uts: 100, E: 3.7 },
      { temp: 100, ys:  85, uts:  85, E: 3.5 },
      { temp: 150, ys:  70, uts:  70, E: 3.3 },
      { temp: 200, ys:  50, uts:  50, E: 2.5 },
      { temp: 250, ys:  20, uts:  20, E: 1.5 },
    ],
  },
  'peek victrex 450ca30': {
    elevated_temp: [
      { temp: 25,  ys: 230, uts: 230, E: 23 },
      { temp: 150, ys: 200, uts: 200, E: 22 },
      { temp: 200, ys: 160, uts: 160, E: 18 },
      { temp: 250, ys: 100, uts: 100, E: 12 },
    ],
  },
  'peek solvay ketaspire': {
    elevated_temp: [
      { temp: 25,  ys: 270, uts: 270, E: 22 },
      { temp: 150, ys: 240, uts: 240, E: 21 },
      { temp: 200, ys: 200, uts: 200, E: 17 },
      { temp: 250, ys: 130, uts: 130, E: 11 },
    ],
  },
  'ultem 1010': {
    elevated_temp: [
      { temp: 25,  ys: 110, uts: 110, E: 3.6 },
      { temp: 100, ys:  95, uts:  95, E: 3.4 },
      { temp: 150, ys:  75, uts:  75, E: 3.0 },
      { temp: 200, ys:  35, uts:  35, E: 1.5 },
    ],
  },
  'ultem 9085': {
    elevated_temp: [
      { temp: 25,  ys: 71, uts: 71, E: 2.5 },
      { temp: 100, ys: 62, uts: 62, E: 2.3 },
      { temp: 150, ys: 45, uts: 45, E: 2.0 },
      { temp: 180, ys: 18, uts: 18, E: 0.8 },
    ],
  },
  'pekk kepstan': {
    elevated_temp: [
      { temp: 25,  ys: 105, uts: 105, E: 4.5 },
      { temp: 100, ys:  90, uts:  90, E: 4.0 },
      { temp: 150, ys:  75, uts:  75, E: 3.5 },
      { temp: 200, ys:  50, uts:  50, E: 2.5 },
      { temp: 240, ys:  20, uts:  20, E: 1.2 },
    ],
  },
  'antero 800na': {
    elevated_temp: [
      { temp: 25,  ys: 90, uts: 90, E: 3.5 },
      { temp: 100, ys: 78, uts: 78, E: 3.2 },
      { temp: 150, ys: 60, uts: 60, E: 2.7 },
      { temp: 200, ys: 35, uts: 35, E: 1.6 },
    ],
  },
  'udel p-1700': {
    elevated_temp: [
      { temp: 25,  ys: 70, uts: 70, E: 2.5 },
      { temp: 100, ys: 55, uts: 55, E: 2.2 },
      { temp: 150, ys: 35, uts: 35, E: 1.8 },
      { temp: 187, ys: 15, uts: 15, E: 0.5 },
    ],
  },
  'radel r-5000': {
    elevated_temp: [
      { temp: 25,  ys: 70, uts: 70, E: 2.3 },
      { temp: 100, ys: 65, uts: 65, E: 2.1 },
      { temp: 150, ys: 55, uts: 55, E: 1.9 },
      { temp: 200, ys: 35, uts: 35, E: 1.3 },
    ],
  },
  'pa 2200': {  // PA12 SLS
    elevated_temp: [
      { temp: 25,  ys: 48, uts: 48, E: 1.7 },
      { temp: 50,  ys: 40, uts: 40, E: 1.4 },
      { temp: 80,  ys: 25, uts: 25, E: 0.9 },
      { temp: 120, ys: 10, uts: 10, E: 0.3 },
    ],
  },
  'pa66 ultramid': {
    elevated_temp: [
      { temp: 25,  ys: 85, uts: 85, E: 3.3 },
      { temp: 60,  ys: 70, uts: 70, E: 2.5 },
      { temp: 100, ys: 40, uts: 40, E: 1.3 },
      { temp: 150, ys: 18, uts: 18, E: 0.5 },
    ],
  },
  'pa66-gf30 zytel': {
    elevated_temp: [
      { temp: 25,  ys: 175, uts: 175, E: 9.5 },
      { temp: 100, ys: 130, uts: 130, E: 6.5 },
      { temp: 150, ys:  85, uts:  85, E: 4.5 },
      { temp: 200, ys:  35, uts:  35, E: 2.2 },
    ],
  },
  'delrin 500': {  // POM
    elevated_temp: [
      { temp: 25,  ys: 70, uts: 70, E: 3.1 },
      { temp: 60,  ys: 55, uts: 55, E: 2.5 },
      { temp: 90,  ys: 35, uts: 35, E: 1.5 },
      { temp: 120, ys: 15, uts: 15, E: 0.6 },
    ],
  },
  'lexan 101r': {  // PC
    elevated_temp: [
      { temp: 25,  ys: 65, uts: 65, E: 2.4 },
      { temp: 80,  ys: 55, uts: 55, E: 2.2 },
      { temp: 120, ys: 35, uts: 35, E: 1.8 },
      { temp: 145, ys: 10, uts: 10, E: 0.5 },
    ],
  },
  'vespel sp-1': {  // Polyimide
    elevated_temp: [
      { temp: 25,  ys: 86, uts: 86, E: 3.1 },
      { temp: 100, ys: 75, uts: 75, E: 2.9 },
      { temp: 200, ys: 60, uts: 60, E: 2.5 },
      { temp: 290, ys: 35, uts: 35, E: 1.8 },
    ],
  },
  'pa12-cf eos hp 3': {
    elevated_temp: [
      { temp: 25,  ys: 76, uts: 76, E: 5.2 },
      { temp: 80,  ys: 60, uts: 60, E: 4.0 },
      { temp: 120, ys: 30, uts: 30, E: 1.8 },
      { temp: 150, ys: 12, uts: 12, E: 0.7 },
    ],
  },
};
function injectTempCurves(m) {
  if (!m || !m.name) return;
  const n = String(m.name).toLowerCase();
  for (const [pattern, data] of Object.entries(ELEV_DATA)) {
    if (n.includes(pattern)) {
      if (!m.elevated_temp || m.elevated_temp.length === 0) {
        m.elevated_temp = data.elevated_temp;
      } else {
        m.elevated_temp = m.elevated_temp.map(p => ({ ...p, E: p.E ?? data.elevated_temp.find(d => Math.abs(d.temp - p.temp) < 25)?.E ?? null }));
      }
      if (!m.creep_rupture) m.creep_rupture = data.creep_rupture;
      break;
    }
  }
}

// back-compat flat fields: current app reads m.density / m.manufacturer / m.process / m.source directly.
// Keep them (= typical value) alongside the richer {ranges, sources, tier, meta} so the UI can migrate gradually.
for (const m of all) {
  for (const p of NUM_PROPS) m[p] = m.ranges[p]?.typical ?? null;
  m.manufacturer = m.manufacturers.join(', ');
  m.process = m.processes.join(' / ');
  // R49d — 표준 alloy datasheet (specialmetals / haynesintl / outokumpu / carpenter / materion / copper.org / eos…)
  // 가 매칭되면 verified source 로 prepend. dedupe 직전에 호출해 중복 url 은 자동으로 제거됨.
  applyStandardSource(m);
  // dedupe sources (by URL, else by label), keep verified first, cap at 3 per material
  {
    const seen = new Set();
    m.sources = (m.sources || [])
      .slice()
      .sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0))
      .filter((s) => { const k = String(s.url || s.label || '').trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 3);
  }
  m.source = m.sources[0]?.label ?? null;
  m.aliases = aliasesFor(m.name);
  m.families = familyTags(m.category, m.subcategory, m.composition);
  const q = qualFor(m.name);
  if (q) { m.machinability = m.machinability || q.machinability; m.weldability = m.weldability || q.weldability; m.corrosion_resistance = m.corrosion_resistance || q.corrosion; }
  // measured fatigue/impact/elevated-temp overrides for key alloys (take precedence over estimates)
  const rp = realPropsFor(m.name);
  if (rp) {
    if (rp.fatigue) { m.ranges.fatigue_strength = rangeFrom(rp.fatigue, 'handbook'); m.fatigue_strength = m.ranges.fatigue_strength.typical; m.fatigue_estimated = false; }
    if (rp.impact && !m.ranges.impact_strength) { m.ranges.impact_strength = rangeFrom(rp.impact, 'handbook'); m.impact_strength = m.ranges.impact_strength.typical; }
    if (rp.elevated_temp) m.elevated_temp = rp.elevated_temp;
  }
  // estimated fatigue (endurance) from UTS where no measured value — labelled as an estimate
  if (m.category !== 'Polymer' && !m.ranges.fatigue_strength && m.ranges.uts) {
    const f = m.families || [];
    const ratio = f.includes('Titanium-based') ? 0.55 : f.includes('Nickel-based') ? 0.40 : (f.includes('Aluminum-based') || f.includes('Copper-based') || f.includes('Magnesium-based')) ? 0.35 : 0.45;
    const u = m.ranges.uts;
    m.ranges.fatigue_strength = { min: round(u.min * ratio), max: round(u.max * ratio), typical: round(u.typical * ratio), n: 0, estimated: true, confidence: 'derived' };
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
  const setTyp = (k, v) => { if (v != null) { m[k] = v; m.ranges[k] = { min: v, max: v, typical: v, n: 0, estimated: true, confidence: 'class' }; } };
  if (ph.ec != null) setTyp('electrical_conductivity', ph.ec);
  if (ph.tmax != null) setTyp('max_service_temp', ph.tmax);
  if (ph.cte != null) setTyp('thermal_expansion', ph.cte);
  if (ph.poisson != null) setTyp('poisson_ratio', ph.poisson);
  if (ph.cp != null) setTyp('specific_heat', ph.cp);
  if (ph.melt != null) setTyp('melting_point', ph.melt);
  if (ph.price != null) {
    setTyp('price_per_kg', ph.price);
    if (m.density) setTyp('price_per_cm3', +(ph.price * m.density / 1000).toFixed(4));
  }
  // 인기도 (0–5) — 산업 사용 빈도 휴리스틱. 표준 합금 이름에 매칭하는 명시적 규칙.
  m.popularity = popularityFor(m);
  // F4: 가공·열처리 비용 가중치 — raw 단가만으로는 가공 단가를 추정하기 어려우므로 휴리스틱 적용.
  // machinability + HT 필드 + 합금 패턴 기반. 실수 (factor 가 음수 또는 0) 회피.
  m.machining_cost_factor = machiningCostFactor(m);
  m.ht_cost_factor = htCostFactor(m);
  if (m.price_per_kg != null && m.price_per_kg > 0) {
    m.total_cost_estimate = +(m.price_per_kg * m.machining_cost_factor * m.ht_cost_factor).toFixed(2);
  }
  // R15: process attributes — 시제품 단계 즉시 판단용.
  // process + 합금 패턴 기반 휴리스틱. AM/주조/단조/사출/시트 별 일반적 한계값.
  const [mw, sr, tc] = processAttributes(m);
  if (mw != null) m.min_wall_thickness = mw;
  if (sr != null) m.surface_finish_typical = sr;
  if (tc != null) m.tolerance_class = tc;
  // R16: RoHS 통과 여부 + SVHC 우려 검출 — composition 에서 Pb/Cd/Hg 농도 확인.
  // EU RoHS 2 한계: Pb 0.1%, Cd 0.01%, Hg 0.1%, Cr⁶⁺ 0.1%, PBB/PBDE 0.1% (homogeneous 기준).
  const { rohs, svhc } = checkRegulated(m);
  m.rohs_compliant = rohs;
  if (svhc.length) m.svhc_concerns = svhc;
  // F3: cast superalloy 의 누락된 heat_treatment 를 표준 문헌값으로 보완 — reference-tier 라
  // 별도 condition 데이터가 없는 IN713C / IN738LC / IN939 등은 일반적 적용 사이클을 기록.
  if (!m.heat_treatment) {
    const nm = String(m.name || '');
    const proc = String(m.process || '');
    if (/cast/i.test(proc) && /Inconel|IN ?7\d{2}|IN ?9\d{2}/i.test(nm)) {
      if (/713/.test(nm)) m.heat_treatment = 'As-cast (AC) — IN713C 는 통상 별도 솔루션 처리 없이 사용 (γ′ 안정)';
      else if (/738/.test(nm)) m.heat_treatment = 'HIP 1175°C / 4h / 100MPa Ar → 솔루션 1120°C / 2h, 공냉 → 시효 845°C / 24h, 공냉 (표준 IN738 사이클)';
      else if (/939/.test(nm)) m.heat_treatment = 'HIP 1200°C / 4h / 100MPa Ar → 솔루션 1160°C / 4h → 1차 시효 1000°C / 6h → 2차 시효 900°C / 16h, 공냉 (Allvac IN939 표준)';
      else m.heat_treatment = 'Cast superalloy — HIP + 솔루션 + 1·2차 시효 표준 사이클 (구체 값은 데이터시트 확인)';
    }
  }
  // AM 이방성 플래그 — 적층제조 공정 금속은 빌드 방향(XY vs Z)에 따라 σy·연신율·피로
  // ~10–30% 차이. HIP 처리되면 다공성·이방성이 크게 완화되므로 약화된 메시지.
  const procStr = String(m.process || '');
  const isAM = /LPBF|DMLS|SLM|EBM|Binder Jetting|DED/i.test(procStr);
  const isHipped = /HIP|hipped|hot[\s-]?isostatic/i.test(String(m.name || '') + ' ' + String(m.heat_treatment || ''));
  m.meta = m.meta || {};
  if (isAM && m.category === 'Metal') {
    m.meta.anisotropic = true;
    m.meta.anisotropy_note = isHipped
      ? 'HIP 처리 후 빌드 방향(XY vs Z) 차이는 일반적으로 ~5% 미만으로 감소 — 데이터시트 확인 권장.'
      : 'AM 빌드 방향(XY vs Z)에 따라 σy·연신율·피로 ~10–30% 편차 — 데이터시트의 방향·후처리(HIP) 조건 확인 필수.';
    if (isHipped) m.meta.anisotropy_reduced = true;
  }
  // R20 — 핵심 Ni 초합금 5종에 elevated_temp (σy/UTS/E vs T) + creep_rupture 데이터 주입.
  injectTempCurves(m);
}

// (R20 ELEV_DATA + injectTempCurves 는 loop 전으로 이동됨 — const hoisting 미지원으로 TDZ 회피)

// R34c — 폴리머 subcategory normalization 룰 테이블. [namePattern, modifierPattern, targetSubcategory].
// modifierPattern 이 있으면 그것까지 매칭해야 적용 (CF / GF 변종 분리). 순서가 우선순위 — PEKK 가 PEEK 보다 먼저.
const POLY_SUB_RULES = [
  // PEKK 가 PEEK 보다 먼저 — 'pekk' 가 'peek' 보다 selective
  [/pekk|kepstan|antero\s*800/i, /carbon|cf|gf/i, 'Polymer - PEKK CF'],
  [/pekk|kepstan|antero\s*800/i, null, 'Polymer - PEKK'],
  // PEEK CF 우선 (PEEK 보다 selective)
  [/peek/i, /carbon|cf|ca30|scf|fortron/i, 'Polymer - PEEK CF'],
  [/peek/i, null, 'Polymer - PEEK'],
  // PEI / ULTEM
  [/ultem|polyetherimide|\bpei\b/i, /glass|gf/i, 'Polymer - PEI/ULTEM GF'],
  [/ultem|polyetherimide|\bpei\b/i, null, 'Polymer - PEI/ULTEM'],
  // sulfone family — PPSU 가 PSU 보다 selective
  [/ppsu|radel/i, null, 'Polymer - PPSU'],
  [/\bpsu\b|udel/i, null, 'Polymer - PSU'],
  [/\bpes\b|polyethersulfone/i, null, 'Polymer - PES'],
  // PPS
  [/\bpps\b|fortron/i, null, 'Polymer - PPS'],
  // polyimide
  [/vespel|polyimide/i, null, 'Polymer - Polyimide'],
  // polyamide-imide / polybenzimidazole
  [/\bpai\b|torlon/i, null, 'Polymer - PAI'],
  [/\bpbi\b/i, null, 'Polymer - PBI'],
  // Polyamide variants (GF / CF / base)
  [/pa\s*?(?:6|11|12|66)|\bnylon\b|polyamide|rilsan|ultramid|zytel|pa\s*?2200|pa\s*?1101|hp\s*?3/i, /glass\b|gf|^.*\bgf\b|with\s+glass/i, 'Polymer - Polyamide GF'],
  [/pa\s*?12.*(?:cf|carbon)|hp\s*?3|pa-cf|nylon.*carbon/i, null, 'Polymer - Polyamide CF'],
  [/pa\s*?(?:6|11|12|66)|\bnylon\b|polyamide|rilsan|ultramid|zytel|pa\s*?2200|pa\s*?1101/i, null, 'Polymer - Polyamide'],
  // Polycarbonate (PC) — ABS-PC 는 ABS+PC 둘 다 가짐 → PC-ABS 는 ABS 로 먼저 매칭
  [/abs\s*-\s*pc|pc\s*-\s*abs|abs\/pc|pc\/abs/i, null, 'Polymer - ABS-PC blend'],
  [/lexan|polycarbonate|^pc\s*—|^pc\s*[—\(]|\bpc\b/i, null, 'Polymer - Polycarbonate'],
  // PET / PETG / PBT
  [/petg/i, null, 'Polymer - PETG'],
  [/\bpet\b|polyethylene\s*terephthalate/i, null, 'Polymer - PET'],
  [/\bpbt\b|valox|crastin/i, null, 'Polymer - PBT'],
  // LCP
  [/\blcp\b|vectra|xydar/i, null, 'Polymer - LCP'],
  // POM / Delrin
  [/delrin|\bpom\b|acetal/i, null, 'Polymer - POM'],
  // PMMA / acrylic
  [/pmma|acrylic|plexiglas/i, null, 'Polymer - PMMA'],
  // ABS / ASA
  [/\babs\b/i, null, 'Polymer - ABS'],
  [/\basa\b/i, null, 'Polymer - ASA'],
  // PP
  [/^pp\s*—|^pp\s*[—\(]|\bpp\b\s*gf|polypropylene/i, /glass|gf/i, 'Polymer - PP GF'],
  [/^pp\s*—|^pp\s*[—\(]|polypropylene/i, null, 'Polymer - PP'],
  // PE variants
  [/uhmwpe|uhmw-pe|ultra\s*high/i, null, 'Polymer - UHMWPE'],
  [/\bhdpe\b/i, null, 'Polymer - Polyethylene'],
  [/\bldpe\b/i, null, 'Polymer - Polyethylene'],
  [/\bpe\b|polyethylene/i, null, 'Polymer - Polyethylene'],
  // halogenated / specialty
  [/\bpvc\b|polyvinyl\s*chloride/i, null, 'Polymer - PVC'],
  [/pvdf|kynar/i, null, 'Polymer - PVDF'],
  [/ptfe|teflon|fluoropolymer/i, null, 'Polymer - PTFE'],
  [/etfe|tefzel/i, null, 'Polymer - ETFE'],
  // PS family
  [/\bps\b|polystyrene/i, null, 'Polymer - Polystyrene'],
  // PLA / bio
  [/pla|polylactic|polylactide/i, null, 'Polymer - PLA'],
  // elastomers / rubbers
  [/tpu|polyurethane|elastollan|estane/i, null, 'Polymer - TPU'],
  [/\btpe\b|thermoplastic\s*elast/i, null, 'Polymer - TPE'],
  [/silicone|pdms/i, null, 'Polymer - Silicone Rubber'],
  // thermoset resins
  [/epoxy|aralite/i, null, 'Polymer - Epoxy/Thermoset'],
  [/polyester\s*resin|unsaturated\s*polyester|upr/i, null, 'Polymer - Polyester'],
  [/photopolymer|sla\s+resin|resin\s+sla/i, null, 'Polymer - Photopolymer Resin'],
];
function normalizePolymerSubcategory(m) {
  if (!m || m.category !== 'Polymer') return;
  const name = String(m.name || '');
  for (const [namePat, modPat, sub] of POLY_SUB_RULES) {
    if (!namePat.test(name)) continue;
    if (modPat && !modPat.test(name)) continue;
    m.subcategory = sub;
    return;
  }
  // 매칭 실패 시 'Polymer - Other' fallback (기존 잘못 매핑된 카테고리 차단)
  if (!String(m.subcategory || '').startsWith('Polymer')) m.subcategory = 'Polymer - Other';
}
// R34c pass — 룰 + 함수 정의 후 호출 (const TDZ 회피).
let polyNormalized = 0;
for (const m of all) {
  if (m.category === 'Polymer') { const before = m.subcategory; normalizePolymerSubcategory(m); if (m.subcategory !== before) polyNormalized++; }
}

// R36c — Metal subcategory 합리화. 같은 family 가 여러 라벨로 분산되어 있어 (Stainless / Stainless Steel /
//   Nickel-based / Nickel Alloy / Nickel Superalloy / Cobalt Chrome / Cobalt-Chrome Alloy / Copper / Copper Alloy / Copper-based)
//   tree 에 중복으로 나타남. canonical 라벨로 통합.
const METAL_SUB_RULES = [
  // Stainless — "Stainless Steel - X" 로 통일
  [/stainless[\s-]*(?:steel[\s-]*)?(?:austenit)/i, 'Stainless Steel - Austenitic'],
  [/stainless[\s-]*(?:steel[\s-]*)?(?:ferrit|martens)/i, 'Stainless Steel - Ferritic/Martensitic'],
  [/stainless[\s-]*(?:steel[\s-]*)?(?:duplex|super[\s-]?duplex|2205|2507|2304)/i, 'Stainless Steel - Duplex'],
  [/(?:stainless[\s-]*(?:steel[\s-]*)?[\s-]*ph|^ph[\s-]?stainless)/i, 'Stainless Steel - PH'],
  [/^stainless(\s+steel)?$/i, 'Stainless Steel - Austenitic'],   // bare 'Stainless' / 'Stainless Steel' default austenitic
  // Nickel 통합 — 모든 Ni alloy 는 Nickel Superalloy 카테고리 아래 family bucket
  [/nickel.*(hastelloy)|^hastelloy/i, 'Nickel Superalloy - Hastelloy'],
  [/nickel.*(inconel)|^inconel|^incoloy/i, 'Nickel Superalloy - Inconel'],
  [/nickel.*(monel)|^monel/i, 'Nickel Superalloy - Monel'],
  [/(haynes|waspaloy|nimonic|rene|udimet|cmsx|cm247|in[\s-]?7\d{2}|in[\s-]?9\d{2}|a-?286|pwa1484)/i, 'Nickel Superalloy - Other'],
  [/nickel[\s-]?based|^nickel(\s+alloy)?$|nickel superalloy/i, 'Nickel Superalloy'],
  // Cobalt 통합
  [/cobalt[\s-]?chrome|cocrmo|cocr|cocr[\s-]?mo/i, 'Cobalt Alloy - Chrome'],
  [/(stellite|l605|haynes\s*25|mp159|elgiloy)/i, 'Cobalt Alloy - Wear'],
  [/cobalt[\s-]?based|^cobalt(\s+alloy)?$/i, 'Cobalt Alloy'],
  // Copper 통합
  [/copper.*brass|^brass$|cu[\s-]?zn/i, 'Copper Alloy - Brass'],
  [/copper.*(bronze)|^bronze/i, 'Copper Alloy - Bronze'],
  [/copper.*(pure|other)|^pure[\s-]?copper|c1[01]\d{3}|ofe[\s-]?copper/i, 'Copper Alloy - Pure'],
  [/cucr|c18\d{3}|grcop|cu[\s-]?be|c172\d{2}|beryllium copper/i, 'Copper Alloy - Specialty (CuBe·CuCr)'],
  [/cuni|c70\d{3}|c71\d{3}|cu[\s-]?ni/i, 'Copper Alloy - Cu-Ni'],
  [/^copper(\s+alloy)?$|copper[\s-]?based/i, 'Copper Alloy'],
  // Steel 합리화 — Carbon Steel / Alloy Steel / Tool Steel / Maraging 구분
  [/^(carbon[\s\/]+low-?alloy|carbon\s+steel|steel)$/i, 'Carbon Steel'],
  [/(case[\s-]?hardening|carburizing)/i, 'Alloy Steel - Case Hardening'],
  [/^alloy steel$/i, 'Alloy Steel'],
  [/^maraging|18ni-?\d{2,3}/i, 'Maraging Steel'],
  [/^tool steel$/i, 'Tool Steel'],
  [/cast iron|^gj[ls]|asm a48/i, 'Cast Iron'],
  // Titanium 통합 — "Titanium - X" 표준
  [/titanium.*(pure|other)|titanium\s*-\s*cp/i, 'Titanium - Pure / CP Grades'],
  [/titanium.*(α[\s+-]?β|alpha[\s+-]?beta)/i, 'Titanium - α+β (Ti-6Al-4V class)'],
  [/^titanium$/i, 'Titanium - Pure / CP Grades'],
  // Aluminum — series 별. 기존 라벨 유지하되 통일.
  [/^aluminum$/i, 'Aluminum - Pure/Other'],
  // Refractory
  [/^refractory(\s+metal)?$/i, 'Refractory Metal'],
  // Misc
  [/iron[\s-]?nickel|^invar/i, 'Controlled Expansion (Invar/Kovar)'],
  [/controlled expansion|^kovar/i, 'Controlled Expansion (Invar/Kovar)'],
  [/^beryllium\s+alloy$/i, 'Beryllium Alloy'],
  [/shape memory|nitinol|niti/i, 'Shape Memory Alloy'],
];
function normalizeMetalSubcategory(m) {
  if (!m || m.category !== 'Metal') return;
  const sub = String(m.subcategory || '');
  if (!sub) return;
  for (const [re, target] of METAL_SUB_RULES) {
    if (re.test(sub)) { m.subcategory = target; return; }
  }
  // 매칭 실패 → 그대로 유지 (이미 합리적 라벨일 가능성)
}
let metalNormalized = 0;
for (const m of all) {
  if (m.category === 'Metal') { const before = m.subcategory; normalizeMetalSubcategory(m); if (m.subcategory !== before) metalNormalized++; }
}

// R16 — RoHS / REACH SVHC 검출 (composition 기반 휴리스틱).
//   RoHS 2 EU Directive 2011/65/EU: Pb 0.1%, Cd 0.01%, Hg 0.1%, Cr⁶⁺ 0.1%, PBB·PBDE 0.1% (homogeneous).
//   REACH SVHC (Substances of Very High Concern): Be, Co compounds, Ni-allergen (피부), Pb·Cd 일부.
//   composition entry 형식: ["Element", "min~max"] | ["Element", "balance"] | ["Element", "≤x"]
function checkRegulated(m) {
  const comp = m.composition;
  if (!comp || typeof comp !== 'object') return { rohs: null, svhc: [] };
  const svhc = [];
  let pb = 0, cd = 0, hg = 0;
  const pct = (val) => {
    if (typeof val !== 'string') return 0;
    const v = String(val).trim();
    if (v === 'balance' || v === '나머지') return 0;
    // "0.1~0.5" → 0.3 평균, "≤0.5" → 0.5 (보수적 최대), "0.05" → 0.05
    if (v.startsWith('≤') || v.startsWith('<')) { const n = parseFloat(v.replace(/[^\d.]/g, '')); return isFinite(n) ? n : 0; }
    if (v.includes('~')) { const [a, b] = v.split('~').map(parseFloat); return isFinite(b) ? b : (isFinite(a) ? a : 0); }
    const n = parseFloat(v); return isFinite(n) ? n : 0;
  };
  // composition 은 객체 or 배열 두 형식 모두
  const entries = Array.isArray(comp) ? comp : Object.entries(comp);
  for (const [el, val] of entries) {
    const key = String(el).trim();
    const p = pct(val);
    if (/^Pb$/i.test(key)) pb = p;
    if (/^Cd$/i.test(key)) cd = p;
    if (/^Hg$/i.test(key)) hg = p;
    if (/^Be$/i.test(key) && p > 0.1) svhc.push(`Be ${p}% — 호흡기 유해 (베릴륨 분진), CMR Cat.1`);
    if (/^Co$/i.test(key) && p > 0.1) svhc.push(`Co ${p}% — REACH SVHC 후보 (소비자 접촉 제품 제한)`);
    if (/^Ni$/i.test(key) && p > 1.0) svhc.push(`Ni ${p}% — 피부 알레르겐 (직접 접촉 제품 EU 규제 EN 1811)`);
  }
  // RoHS 한계 비교
  const rohsViolations = [];
  if (pb > 0.1) rohsViolations.push(`Pb ${pb}% > 0.1%`);
  if (cd > 0.01) rohsViolations.push(`Cd ${cd}% > 0.01%`);
  if (hg > 0.1) rohsViolations.push(`Hg ${hg}% > 0.1%`);
  const rohs = rohsViolations.length === 0;
  if (!rohs) svhc.push(...rohsViolations.map(v => `RoHS 초과: ${v}`));
  return { rohs, svhc };
}

// R15 process attributes — 표준 한계값.
// LPBF/DMLS: 분말상 적층 — 최소벽 0.4mm, Ra 8-15μm as-built, IT13-14.
// EBM: 전자빔 — 최소벽 1mm, Ra 20-40μm as-built, IT14.
// Binder Jetting: 최소벽 0.5mm, Ra 15-25μm, IT14-15.
// Investment casting: 최소벽 1.5-3mm, Ra 1.6-6.3μm, IT11-13.
// Sand casting: 최소벽 3-5mm, Ra 12-25μm, IT14-16.
// Forging: 최소벽 3mm, Ra 6.3-25μm, IT12-14.
// Wrought (rolled): Ra 1.6-3.2μm, IT10-12.
// Injection molding (polymer): 최소벽 0.5-1.5mm, Ra 0.4-3.2μm, IT10-12.
// 수치는 핸드북 기준 (ASM Handbook, NADCA, ISO 286, MPIF).
function processAttributes(m) {
  const proc = String(m.process || '').toLowerCase();
  const cat = m.category;
  const has = (re) => re.test(proc);
  if (has(/lpbf|slm|dmls/i)) return [0.4, 12, 'IT13-14'];
  if (has(/ebm|electron.?beam/i)) return [1.0, 30, 'IT14'];
  if (has(/binder.?jet/i)) return [0.5, 20, 'IT14-15'];
  if (has(/ded|directed.?energy|wire.?arc/i)) return [2.0, 50, 'IT15'];
  if (has(/investment|lost.?wax/i)) return [1.5, 3.2, 'IT11-13'];
  if (has(/die.?cast/i)) return [1.0, 0.8, 'IT11-12'];
  if (has(/sand.?cast|gravity.?cast/i)) return [3.0, 18, 'IT14-16'];
  if (has(/cast/i)) return [2.5, 12.5, 'IT13-14']; // 일반 주조
  if (has(/forg|forge/i)) return [3.0, 12.5, 'IT12-14'];
  if (has(/rolled|wrought|extrud/i)) return [0.5, 1.6, 'IT10-12'];
  if (has(/injection|inject|molded/i)) return [0.8, 1.6, 'IT10-12'];
  if (has(/sheet.?metal|stamp/i)) return [0.3, 3.2, 'IT11-12'];
  if (has(/machined|cnc/i)) return [0.2, 0.8, 'IT7-9']; // 정밀 가공
  if (has(/sintered|powder|pm/i)) return [1.5, 3.2, 'IT12-13'];
  if (cat === 'Polymer') return [0.8, 1.6, 'IT10-12']; // 폴리머 default = 사출
  return [null, null, null]; // 정보 없음
}

// F4 가공 비용 가중치 — 가공성·합금 패턴 기반. 1.0 = 표준 (저합금 강 기준), 높을수록 가공 어려움.
// 데이터 무결성: 휴리스틱이며 실 가공 견적과 다를 수 있음 — 비교 용도. raw price 자체는 그대로.
function machiningCostFactor(m) {
  const n = String(m.name || '').toLowerCase();
  const cat = m.category;
  const mach = String(m.machinability || '').toLowerCase();
  const proc = String(m.process || '').toLowerCase();
  // AM 출력물은 후가공 (서포트 제거, 표면 마감, HIP) 비용 추가
  if (/lpbf|dmls|slm|ebm|binder|ded/i.test(proc)) return 1.8;
  if (cat === 'Polymer') {
    if (/peek|ultem|pekk|ppsu/i.test(n)) return 1.3; // 고성능 폴리머 가공 까다로움
    return 0.7; // 일반 폴리머 사출
  }
  // 금속: 합금명·machinability 기준
  if (/inconel|hastelloy|haynes|waspaloy|udimet|in[\s-]?7\d{2}|in[\s-]?9\d{2}/i.test(n)) return 2.6; // Ni 초합금 절삭 매우 어려움
  if (/ti[\s-]?6al|ti6al|titanium|grade ?5|grade ?23|ti-6-4/i.test(n)) return 2.2; // 티타늄
  if (/maraging|m300|c300|18ni/i.test(n)) return 2.0; // 마레이징강
  if (/(d2|h13|m2|skd|skh|cpm|powder metal)/i.test(n)) return 2.0; // 공구강
  if (/(440c|17-?4 ?ph|15-?5 ?ph|duplex|2205|2507)/i.test(n)) return 1.5; // PH·듀플렉스
  if (/304|316|stainless/i.test(n)) return 1.3; // 일반 스테인리스
  if (/(7075|7050|aerospace al|2024|2014)/i.test(n)) return 0.8; // 고강도 알루미늄
  if (/(6061|6063|aluminum|al-?si|alsi)/i.test(n)) return 0.6; // 일반 알루미늄
  if (/(brass|c360|c272|cu-zn|free.?cutting)/i.test(n)) return 0.5; // 황동
  if (/(bronze|c5|c9)/i.test(n)) return 1.1; // 동
  if (/(45c|1045|s45c|45 carbon|aisi 10)/i.test(n)) return 1.0; // 표준 탄소강
  if (/(4140|4340|scm|sncm|chromoly)/i.test(n)) return 1.1; // 합금강
  if (/(cast iron|gjl|gjs|gray iron|ductile)/i.test(n)) return 0.9; // 주철
  // machinability 라벨 fallback
  if (mach.includes('excellent') || mach.includes('good')) return 0.9;
  if (mach.includes('poor') || mach.includes('difficult')) return 1.8;
  return 1.0;
}

// F4 열처리/후공정 비용 가중치 — heat_treatment 있으면 + HIP/coating + 합금 분류.
function htCostFactor(m) {
  const ht = String(m.heat_treatment || '').toLowerCase();
  const n = String(m.name || '').toLowerCase();
  if (!ht && !/heat.?treated|aged|tempered|hipped/i.test(n)) return 1.0;
  let f = 1.15; // 기본 열처리 사이클
  if (/hip|hot.?isostatic/i.test(ht + ' ' + n)) f += 0.5;
  if (/solution|aged|aging|시효/i.test(ht)) f += 0.15;
  if (/nitrid|carburiz|cementation|침탄|질화/i.test(ht)) f += 0.3;
  if (/coating|coated|dlc|tin|cvd|pvd/i.test(ht + ' ' + n)) f += 0.25;
  // 다단 사이클 — '1차/2차' 또는 콤마/+ 다수 → 비용↑
  const cycleCount = (ht.match(/[,+→]|2차|1차/g) || []).length;
  if (cycleCount >= 2) f += 0.15;
  return +f.toFixed(2);
}

// R38c — 한국 산업 기준 인기도 (KS/JIS 표준 합금 우선, 자동차·조선·반도체·디스플레이·건설·가전).
//        많이 쓰이고 흔할수록 높은 점수. AM process 합금은 상한 3 (R35a 유지).
//
// Tier 5 — 한국 산업 현장에서 학생·실무 모두 일상적으로 쓰는 흔한 합금/플라스틱.
//   자동차(현대·기아·HD), 조선(HD현대·삼성중공업), 가전(LG·삼성), 건설(포스코·현대제철), 일반 기계.
// Tier 4 — 자주 보이지만 가공·조달 까다로움 (PH stainless, Maraging, 항공 7xxx Al, AM 표준).
// Tier 3 — 보통: 특수 application (의료 CoCr, 항공 7075, 듀플렉스 2205, 고성능 폴리머 PEEK).
// Tier 2 — 특수/항공우주 (Inconel 738/939, Haynes 282, Hastelloy C, Cu-Cr-Zr, Nitinol, PEKK).
// Tier 1 — 전문/희귀 (single-crystal SX, refractory composite, UHTC, PBI, AM 신소재).
function popularityFor(m) {
  const n = String(m.name || '').toLowerCase();
  const has = (re) => re.test(n);
  const cat = m.category;
  let t = 1;

  if (cat === 'Metal') {
    // T5 — 한국 산업 표준
    if (
      has(/\bs45c\b|^1045\b|\b1045\b|c45\b/) ||
      has(/\bscm440\b|\b4140\b|42crmo/) ||
      has(/\bss400\b|\ba36\b|^st37/) ||
      has(/\bsus304\b|\b304l?\b/) ||
      has(/\bsus316\b|\b316l?\b/) ||
      has(/aa\s*?6061|\b6061\b/) ||
      has(/aa\s*?5052|\b5052\b/) ||
      has(/\b1018\b|\b1020\b|^1010|aisi 10[12]0/) ||
      has(/alsi10mg/) ||
      has(/ti[\s-]?6al[\s-]?4v|ti-6-4|grade ?5\b|gr ?5\b/) ||
      has(/inconel 718|in[\s-]?718/)
    ) t = 5;
    // T4 — 자주 사용
    if (t < 5 && (
      has(/\bsus430\b|\b430\b/) ||
      has(/\bsus410\b|\b410\b|\bsus420\b|\b420\b/) ||
      has(/17[\s-]?4 ?ph|\bsus630\b/) ||
      has(/15[\s-]?5 ?ph/) ||
      has(/\bsm45c\b|^1050|s50c\b/) ||
      has(/aa\s*?7075|\b7075\b/) ||
      has(/aa\s*?6063|\b6063\b/) ||
      has(/aa\s*?5083|\b5083\b/) ||
      has(/aa\s*?2024|\b2024\b/) ||
      has(/\ba356\b|\baa357\b|alsi7mg/) ||
      has(/\bh13\b|\bskd61\b/) ||
      has(/\bp20\b/) ||
      has(/\b4340\b|sncm/) ||
      has(/\b8620\b/) ||
      has(/\bsuj2\b|\b52100\b|\b100cr6\b/) ||
      has(/inconel 625|in[\s-]?625/) ||
      has(/maraging|18ni/) ||
      has(/cocrmo|\bcocr\b|f75/) ||
      has(/c10100|c11000|ofe.?copper/) ||
      has(/c26000|brass/) ||
      has(/cucr|c18\d{3}/) ||
      has(/az31|az91|magnesium/) ||
      has(/\binvar\b|invar 36|fe-?ni36/)
    )) t = 4;
    // T3 — 특수/고성능
    if (t < 4 && (
      has(/haynes 230/) ||
      has(/hastelloy x|hastelloy c-?(22|276)/) ||
      has(/inconel 6\d{2}/) ||
      has(/a-?286|incoloy 901/) ||
      has(/\b2205\b|duplex/) ||
      has(/becu|beryllium copper|c17200/) ||
      has(/bronze|c5\d{3}|c6\d{3}|c9\d{3}/) ||
      has(/aa\s*?2014|\b2014\b/) ||
      has(/aa\s*?7050|\b7050\b/) ||
      has(/(ti\s*cp|ti grade ?[1-4]|ti gr ?[1-4])/) ||
      has(/ti grade ?9|ti-?3al-?2\.?5v/) ||
      has(/tool steel|d2|cpm|m2|s7/) ||
      has(/cuni|c70600|c71500/)
    )) t = 3;
    // T2 — 항공우주·연구
    if (t < 3 && (
      has(/inconel 7(38|39|13|40|51)|inconel x-?750|in[\s-]?9\d{2}/) ||
      has(/haynes (282|214|188|25)/) ||
      has(/waspaloy|nimonic|rene 41|udimet/) ||
      has(/cucr1zr|c18150|grcop/) ||
      has(/tantal|niobium|c-?103|tzm/) ||
      has(/superduplex|\b2507\b|254\s?smo|al-?6xn/) ||
      has(/nitinol|niti\b/) ||
      has(/ti[\s-]?6242|ti-?6242|ti-?17/) ||
      has(/aermet 100|300m\b/) ||
      has(/scalmalloy/)
    )) t = 2;
    // T1 (default) — 매우 특수
    if (t < 2 && (
      has(/cmsx|rene n5|pwa 1484|single[\s-]?crystal|cm247/) ||
      has(/aheadd|al5x1|a205|a20x|cm55/) ||
      has(/ti[\s-]?5[\s-]?8[\s-]?5|ti-5553|ta15/)
    )) t = 1;
    // R43 — subcategory level fallback. 이전 R38c 가 정수 3 / 2 로 단일화 → R43 에서
    //        family 별 미세 차등으로 분포 자연화 (2.0 ~ 3.7 spread, 흔할수록 높음).
    const sub = String(m.subcategory || '');
    if (t === 1) {
      // Stainless 계열 — 식기·반도체·의료 매우 흔함
      if (/Stainless Steel - Austenitic/.test(sub)) t = 3.5;
      else if (/Stainless Steel - Ferritic|Stainless Steel - Martensitic/.test(sub)) t = 3.3;
      else if (/Stainless Steel - PH/.test(sub)) t = 3.0;
      else if (/Stainless Steel - Duplex/.test(sub)) t = 2.7;
      // Carbon Steel — 건설·조선·자동차 동력 전달
      else if (/Carbon Steel/.test(sub)) t = 3.4;
      else if (/Alloy Steel/.test(sub)) t = 3.2;
      else if (/Tool Steel/.test(sub)) t = 2.9;
      else if (/Cast Iron/.test(sub)) t = 3.3;
      else if (/Maraging Steel/.test(sub)) t = 2.6;
      // Aluminum 계열 — 자동차·가전·자전거·항공
      else if (/Aluminum - Si Alloys|Aluminum - Pure/.test(sub)) t = 3.5;
      else if (/Aluminum - Mg Alloys|Aluminum - Cu Alloys/.test(sub)) t = 3.3;
      else if (/Aluminum - Mn Alloys|Aluminum - Cast/.test(sub)) t = 3.0;
      else if (/^Aluminum/.test(sub)) t = 3.2;
      // Titanium — 항공·의료 (덜 흔함)
      else if (/Titanium - α\+β|Ti-6Al-4V/.test(sub)) t = 3.4;       // Ti-6-4 더 흔함
      else if (/^Titanium/.test(sub)) t = 2.8;
      // Copper 계열 — 전기·전자·배관
      else if (/Copper Alloy - Pure|Copper Alloy - Brass/.test(sub)) t = 3.4;
      else if (/Copper Alloy - Bronze/.test(sub)) t = 3.1;
      else if (/Copper Alloy - Specialty|Copper Alloy - Cu-Ni/.test(sub)) t = 2.7;
      else if (/^Copper Alloy/.test(sub)) t = 3.0;
      // Magnesium — 노트북·드론 (자동차 일부)
      else if (/Magnesium/.test(sub)) t = 2.5;
      // Nickel Superalloy / Cobalt Alloy — 항공우주 위주
      else if (/Nickel Superalloy - Inconel/.test(sub)) t = 2.4;
      else if (/Nickel Superalloy - Hastelloy/.test(sub)) t = 2.2;
      else if (/Nickel Superalloy/.test(sub)) t = 2.3;
      else if (/Cobalt Alloy - Chrome/.test(sub)) t = 2.5;          // 의료
      else if (/Cobalt Alloy/.test(sub)) t = 2.1;
      // 특수 합금
      else if (/Beryllium Alloy/.test(sub)) t = 2.4;                // 정밀 측정 (희소)
      else if (/Shape Memory Alloy/.test(sub)) t = 2.3;
      else if (/Controlled Expansion/.test(sub)) t = 2.5;            // Invar 분광기·MEMS
      else if (/Refractory Metal/.test(sub)) t = 1.8;                // 우주·핵
      else if (/Zinc Alloy/.test(sub)) t = 2.4;
      else t = 1.5;                                                  // 진짜 fallback (rare alloy)
    }
  }

  if (cat === 'Polymer') {
    // T5 — 일상
    if (
      has(/\babs\b/) ||
      has(/pa\s*?12|nylon 12|pa\s*?6\b|nylon 6\b|pa\s*?66|nylon 66/) ||
      has(/polycarbonate|\bpc\b(?!-)|lexan/) ||
      has(/\bpla\b/) ||
      has(/\bpp\b|polypro/) ||
      has(/\bpmma\b|acrylic|plexiglas/) ||
      has(/\bpom\b|delrin|acetal/) ||
      has(/\bpet\b/) ||
      has(/petg/) ||
      has(/\bpvc\b|polyvinyl/)
    ) t = 5;
    // T4 — 엔지니어링 표준
    if (t < 5 && (
      has(/\bpeek\b(?!-)/) ||
      has(/ultem|pei\b/) ||
      has(/pa\s*?11|nylon 11|rilsan/) ||
      has(/asa\b/) ||
      has(/\btpu\b|\btpe\b|elastollan/) ||
      has(/\bhdpe\b|\bldpe\b|polyethylene/) ||
      has(/silicone/) ||
      has(/\bpbt\b|valox/)
    )) t = 4;
    // T3 — 고성능
    if (t < 4 && (
      has(/ppsu|radel/) ||
      has(/\bpsu\b|udel/) ||
      has(/\bpps\b|fortron/) ||
      has(/ptfe|teflon/) ||
      has(/pvdf|kynar/) ||
      has(/etfe|tefzel/)
    )) t = 3;
    // T2 — 특수
    if (t < 3 && (
      has(/pekk|antero/) ||
      has(/lcp\b|vectra|xydar/) ||
      has(/\bpai\b|torlon/) ||
      has(/polyimide|vespel|kapton/) ||
      has(/uhmwpe/)
    )) t = 2;
    // T1 — 전문 (CF·BIO·PBI)
    if (t < 2 && (
      has(/-cf|carbon[\s-]?fiber/) ||
      has(/onyx|pcl|pha\b/) ||
      has(/pbi\b/)
    )) t = 1;
  }

  if (cat === 'Ceramic') {
    if (has(/tungsten carbide|wc-?co|^wc\b/)) t = 5;
    else if (has(/glass|silica|quartz/)) t = 5;
    else if (has(/alumina|al2o3|99.5%/)) t = 4;
    else if (has(/zirconia|zro2|y-?tzp|ysz/)) t = 4;
    else if (has(/silicon carbide|^sic|sic\b/)) t = 4;
    else if (has(/pzt|piezoelectric|batio3|mlcc|dielectric/)) t = 4;
    else if (has(/silicon nitride|si3n4/)) t = 3;
    else if (has(/aluminum nitride|^aln|aln\b/)) t = 3;
    else if (has(/macor|cordierite|steatite|porcelain|mullite/)) t = 3;
    else if (has(/zrb2|hfb2|hfc|uhtc|ultra-?high/)) t = 1;
    else if (has(/lab6/)) t = 1;
    else t = 2;
  }

  if (cat === 'Composite') {
    if (has(/glass.*epoxy|gfrp/)) t = 5;
    else if (has(/wood/)) t = 5;
    else if (has(/foam/)) t = 4;
    else if (has(/carbon.*epoxy|cfrp/)) t = 4;
    else if (has(/aramid|kevlar/)) t = 3;
    else if (has(/uhmwpe|polyethylene/)) t = 3;
    else if (has(/honeycomb|sandwich/)) t = 3;
    else if (has(/mmc|metal-?matrix/)) t = 2;
    else if (has(/cmc|ceramic-?matrix/)) t = 2;
    else t = 3;
  }
  // R40a — 한국 산업 노출도 modifier (0 ~ 0.45) — base tier 안에서 세분화.
  //   같은 tier 안에서도 한국 자동차·조선·반도체·사출 현장 노출도가 다름 → 소수 둘째자리 점수.
  let mod = 0;
  // Tier A 매우 흔함 (자동차 동력전달 · 조선 H형강 · 식기 · 사출 표준 · 일반 PC/ABS)
  if (
    has(/\bsus3(04|16)\b|\b3(04|16)l?\b/) ||                  // 식기·반도체·의료
    has(/\baa\s?6061\b|\b6061\b/) ||                          // 자전거·드론·일반
    has(/\bs45c\b|^1045\b|c45\b/) ||                          // 자동차 샤프트·기어
    has(/\babs\b/) || has(/polycarbonate|\bpc\b(?!-)|lexan/)  // 사출 가전 표준
  ) mod = 0.45;
  // Tier B 자주 보이는 표준 (현장 알면 신뢰)
  else if (
    has(/\bsus4(30|10|20)\b|\b4(30|10|20)\b/) ||
    has(/scm440|\b4140\b|42crmo/) ||
    has(/\baa\s?5083\b|\b5083\b/) ||                          // LNG 조선
    has(/alsi10mg/) ||                                        // LPBF 산업 표준
    has(/inconel\s?718|in[\s-]?718/) ||
    has(/pa\s?66|nylon\s?66/) ||
    has(/\bss400\b|\ba36\b/) ||                               // 구조용 H형강
    has(/\b1018\b|\b1020\b|aisi 10[12]0/) ||                  // 저탄소강 (가공 표준)
    has(/\bsus630\b|17[\s-]?4\s?ph/) ||
    has(/\bh13\b|skd61/) ||                                    // 자동차 단조 die
    has(/\bsuj2\b|\b52100\b|\b100cr6\b/)                      // 베어링강
  ) mod = 0.35;
  // Tier C 보통 (지명도 있음)
  else if (
    has(/aa\s?5052|\b5052\b/) || has(/aa\s?7075|\b7075\b/) ||
    has(/ti[\s-]?6al[\s-]?4v|grade\s?5|gr\s?5/) ||
    has(/\bpla\b|petg/) || has(/\bpom\b|delrin|acetal/) ||
    has(/\bpmma\b|acrylic/) || has(/\bpp\b|polypro/) ||
    has(/cocrmo|\bcocr\b|f75/) || has(/inconel\s?625|in[\s-]?625/) ||
    has(/maraging|18ni/) || has(/\b4340\b|sncm/) || has(/\b8620\b/) ||
    has(/aa\s?6063|\b6063\b/)
  ) mod = 0.25;
  // Tier D 약간 흔함
  else if (
    has(/haynes\s?230/) || has(/hastelloy x/) ||
    has(/invar|\bp20\b/) ||
    has(/\bbrass\b|c26000|황동/) || has(/bronze/) ||
    has(/\bpeek\b(?!-)/) || has(/ultem|pei\b/) ||
    has(/\baa\s?2024\b|\b2024\b/) || has(/\b2205\b|duplex/) ||
    has(/c10100|c11000|ofe.?copper/) ||
    has(/\ba356\b|alsi7mg/)
  ) mod = 0.15;
  // 그 외 → mod 0 (base tier 그대로)

  // R43 — condition (heat_treatment / name suffix) 기반 modifier (-0.10 ~ +0.10).
  //        같은 alloy 의 condition 별 미세 차등 — 사용 상태에 가까울수록 높음.
  const ht = String(m.heat_treatment || '').toLowerCase();
  const nameRest = String(m.name || '').toLowerCase();
  const haystack = ht + ' ' + nameRest;
  let condMod = 0;
  if (/q\+t|quench.*tempered|tempered\b|aged|peak[\s-]?ag|h900|h1025|h1075|sta\b|dsa\b/.test(haystack)) condMod = 0.07;
  else if (/hip|isostatic/.test(haystack)) condMod = 0.04;
  else if (/anneal|solution|mill annealed|beta annealed/.test(haystack)) condMod = 0;
  else if (/cold[\s-]?worked|strain[\s-]?hardened|hardened\b/.test(haystack)) condMod = 0.03;
  else if (/normaliz|stress[\s-]?reliev/.test(haystack)) condMod = -0.03;
  else if (/as[\s-]?(built|cast|supplied|received|rolled|forged|extruded)/.test(haystack)) condMod = -0.08;

  let score = t + mod + condMod;
  // R35a — AM 공정 합금은 상한 3.0 (mod 포함). 검증 단계 신소재 — 산업 표준 대비 보수적 평가.
  const proc = String(m.process || '');
  const isAM = /LPBF|DMLS|SLM|EBM|Binder Jetting|DED|MJF|FDM|SLS/i.test(proc);
  if (isAM && score > 3.0) score = 3.0;
  // R42 — popularity 5 점 만점 cap.  R43 — 1 점 하한 + 5 점 상한 (slider [0,5] 호환).
  if (score > 5) score = 5;
  if (score < 1) score = 1;
  // 소수 둘째자리 반올림.
  return Math.round(score * 100) / 100;
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
rep.push('');
// R34 expansion summary — polymer/ceramic/temperature curves.
{
  const polyCount = all.filter(x => x.category === 'Polymer').length;
  const cerCount = all.filter(x => x.category === 'Ceramic').length;
  const cmpCount = all.filter(x => x.category === 'Composite').length;
  const withTempCurve = all.filter(x => Array.isArray(x.elevated_temp) && x.elevated_temp.length > 0).length;
  const withCreep = all.filter(x => Array.isArray(x.creep_rupture) && x.creep_rupture.length > 0).length;
  const withE = all.filter(x => Array.isArray(x.elevated_temp) && x.elevated_temp.some(p => p.E)).length;
  const polySubs = new Set(all.filter(x => x.category === 'Polymer').map(x => x.subcategory));
  const cerSubs = new Set(all.filter(x => x.category === 'Ceramic').map(x => x.subcategory));
  rep.push('## R34 — Category Expansion & Normalization Summary', '');
  rep.push('### Category counts');
  rep.push('| Category | Count | Distinct subcategories |', '|---|---|---|');
  rep.push(`| Metal | ${all.filter(x => x.category === 'Metal').length} | (multiple) |`);
  rep.push(`| Polymer | ${polyCount} | ${polySubs.size} |`);
  rep.push(`| Ceramic | ${cerCount} | ${cerSubs.size} |`);
  rep.push(`| Composite | ${cmpCount} | — |`);
  rep.push('');
  rep.push('### Metal subcategory canonicalization (R36c)');
  rep.push(`- ${metalNormalized} metal entries had their subcategory rewritten by \`METAL_SUB_RULES\`.`);
  rep.push('- Stainless: Stainless / Stainless Steel / PH Stainless → "Stainless Steel - Austenitic / Ferritic·Martensitic / Duplex / PH".');
  rep.push('- Nickel: Nickel-based / Nickel Alloy / Nickel Superalloy / Hastelloy / Inconel / Monel / Haynes 등 → "Nickel Superalloy - <subfamily>".');
  rep.push('- Cobalt: Cobalt Chrome / Cobalt-based → "Cobalt Alloy - Chrome / Wear".');
  rep.push('- Copper: Copper / Copper Alloy / Copper-based / Brass / Bronze / Cu-Be / Cu-Ni → "Copper Alloy - <subfamily>".');
  rep.push('- Steel: Carbon Steel / Steel / Carbon-Low-alloy → "Carbon Steel"; Maraging / Tool / Cast Iron 분리.');
  rep.push('');
  rep.push('### Polymer subcategory canonicalization (R34c)');
  rep.push(`- ${polyNormalized} polymer entries had their subcategory rewritten by the canonicalization pass (\`POLY_SUB_RULES\`).`);
  rep.push('- PEEK / PEEK CF, PEKK / PEKK CF, PA / PA GF / PA CF, ULTEM / ULTEM GF kept distinct (reinforcement variants have meaningfully different properties).');
  rep.push('- "Polymer - Nylon (FDM/SLS)" residual count: ' + all.filter(x => x.subcategory === 'Polymer - Nylon (FDM/SLS)').length + ' — unmatched entries fall back to category-specific subcategory.');
  rep.push('');
  rep.push('### Temperature & creep coverage');
  rep.push(`- ${withTempCurve} materials carry σy/UTS vs temperature data (was 241 before R34a, gain +${withTempCurve - 241} mostly polymer).`);
  rep.push(`- ${withE} have Young's modulus vs T (E(T)).`);
  rep.push(`- ${withCreep} have creep rupture curves (Ni superalloys, no change in R34).`);
  rep.push('');
}

// R48a — Anomaly Detection (물리 제약 + 이상치 자동 검출).
//   High: σy > UTS, density / E / hardness 음수 또는 비현실적
//   Med: elongation / poisson / CTE 범위 위반, sources 누락 (verified 합금)
//   Low: aged condition 의 σy 가 annealed 보다 낮음, range 가 단일 값
function detectAnomalies(all) {
  const out = [];
  const push = (sev, kind, m, detail) => out.push({ severity: sev, kind, id: m.id, name: m.name, detail });
  const typ = (m, k) => (m.ranges && m.ranges[k]) ? m.ranges[k].typical : null;
  // R48a — category-aware 임계값. 폴리머/엘라스토머 elongation > 1000% 정상, CFRP·AFK CTE 음수 정상, Diamond HV ~10000 정상.
  for (const m of all) {
    const cat = m.category || 'Metal';
    const sy = typ(m, 'yield_strength'), uts = typ(m, 'uts');
    if (sy != null && uts != null && sy > uts * 1.02) push('high', 'σy > UTS', m, `σy ${sy} > UTS ${uts}`);

    // R50b — family-aware σy/UTS ratio + modulus 범위 검사.
    if (sy != null && uts != null && uts > 0) {
      const ratio = sy / uts;
      const sub = String(m.subcategory || '');
      if (cat === 'Metal') {
        if (ratio > 1.00) push('high', 'σy/UTS > 1.00 (data error)', m, `${ratio.toFixed(2)} (σy=${sy}, UTS=${uts})`);
        else if (/Stainless Steel - Austenitic/.test(sub) && (ratio < 0.20 || ratio > 0.95))
          push('med', 'Austenitic SS σy/UTS out of [0.20, 0.95]', m, `${ratio.toFixed(2)}`);
        else if (/Carbon Steel/.test(sub) && (ratio < 0.35 || ratio > 0.95))
          push('low', 'Carbon Steel σy/UTS out of [0.35, 0.95]', m, `${ratio.toFixed(2)}`);
        else if (/Nickel Superalloy/.test(sub) && ratio > 0.98)
          push('med', 'Ni Superalloy σy/UTS > 0.98 (suspect)', m, `${ratio.toFixed(2)}`);
        else if (/Maraging/.test(sub) && ratio > 0.99)
          push('low', 'Maraging σy/UTS > 0.99', m, `${ratio.toFixed(2)}`);
        else if (/Titanium - α\+β/.test(sub) && (ratio < 0.75 || ratio > 0.98))
          push('low', 'Ti α+β σy/UTS out of [0.75, 0.98]', m, `${ratio.toFixed(2)}`);
        else if (/Tool Steel/.test(sub) && ratio > 0.98)
          push('low', 'Tool Steel σy/UTS > 0.98', m, `${ratio.toFixed(2)}`);
      }
      if (cat === 'Polymer' && ratio > 1.05) push('med', 'Polymer σy > UTS × 1.05', m, `${ratio.toFixed(2)}`);
    }

    const dens = typ(m, 'density');
    if (dens != null && (dens <= 0 || dens > 25)) push('high', 'density out of range', m, `${dens} g/cm³`);
    const E = typ(m, 'modulus');
    // 폴리머는 E ~0.0005 GPa (gel) 부터, silicone 0.005 GPa. 양의 값이면 OK. 음수·0 또는 > 1500 만 high.
    if (E != null && (E <= 0 || E > 1500)) push('high', 'modulus out of range', m, `${E} GPa`);
    // R50b — family-aware E typical 범위.
    if (E != null && cat === 'Metal') {
      const sub = String(m.subcategory || '');
      if (/^Aluminum/.test(sub) && (E < 50 || E > 90)) push('low', 'Aluminum E out of [50, 90] GPa', m, `${E}`);
      else if (/^Titanium/.test(sub) && (E < 95 || E > 130)) push('low', 'Titanium E out of [95, 130] GPa', m, `${E}`);
      else if (/Stainless Steel|Carbon Steel|Alloy Steel|Tool Steel|Maraging/.test(sub) && (E < 180 || E > 220)) push('low', 'Steel family E out of [180, 220] GPa', m, `${E}`);
      else if (/Nickel Superalloy/.test(sub) && (E < 190 || E > 230)) push('low', 'Ni Superalloy E out of [190, 230] GPa', m, `${E}`);
      else if (/^Copper Alloy/.test(sub) && (E < 100 || E > 140)) push('low', 'Cu Alloy E out of [100, 140] GPa', m, `${E}`);
      else if (/Magnesium/.test(sub) && (E < 40 || E > 50)) push('low', 'Mg E out of [40, 50] GPa', m, `${E}`);
    }
    if (sy != null && sy < 0) push('high', 'σy negative', m, `${sy}`);
    if (uts != null && uts < 0) push('high', 'UTS negative', m, `${uts}`);

    const HV = typ(m, 'hardness');
    // Ceramic (Diamond 10000 / cBN 4500 / SiC 2800 / WC 1300 / Al2O3 1600) 정상. Metal 은 ~2000 상한.
    const hvCap = cat === 'Ceramic' ? 12000 : (cat === 'Composite' ? 1000 : 5000);
    if (HV != null && (HV < 0 || HV > hvCap)) push('high', `hardness out of range (${cat})`, m, `${HV} HV`);

    const el = typ(m, 'elongation');
    // 폴리머/엘라스토머/composite 매트릭스 elongation 1000% 까지 정상 (silicone gel 700%, EVA 700%, UHMWPE 350%).
    const elCap = (cat === 'Polymer' || cat === 'Composite') ? 1500 : 200;
    if (el != null && (el < 0 || el > elCap)) push('med', `elongation out of range (${cat})`, m, `${el}%`);

    const nu = typ(m, 'poisson_ratio');
    if (nu != null && (nu <= 0 || nu > 0.5)) push('med', 'poisson_ratio out of range', m, `${nu}`);

    const cte = typ(m, 'thermal_expansion');
    // CFRP (UD 0°) 음수 CTE 정상 — fiber Pitch P-100 CTE ≈ -1.4. composite 만 음수 허용.
    if (cte != null) {
      // UHMWPE fiber (Dyneema/Spectra) 음수 CTE -12 정상 — composite 범위 ±15 까지 허용
      if (cat === 'Composite') { if (cte < -15 || cte > 250) push('med', 'CTE out of composite range', m, `${cte}`); }
      else if (cte < 0 || cte > 250) push('med', 'CTE out of range', m, `${cte} ×10⁻⁶/K`);
    }

    const tk = typ(m, 'thermal_conductivity');
    if (tk != null && (tk < 0 || tk > 3000)) push('med', 'thermal_conductivity out of range', m, `${tk} W/m·K`);

    if (m.tier === 'curated' && (!m.sources || m.sources.length === 0)) push('med', 'curated alloy without sources', m, '');
    if (m.tier !== 'reference' && m.sources && !m.sources.some(s => s.verified)) push('low', 'no verified source URL', m, '');

    if (m.popularity != null && (m.popularity < 1 || m.popularity > 5)) push('high', 'popularity out of [1,5]', m, `${m.popularity}`);

    for (const propKey of ['yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'density']) {
      const r = m.ranges && m.ranges[propKey];
      if (r && r.min != null && r.max != null && r.min > r.max) push('high', `${propKey}: min > max`, m, `${r.min} > ${r.max}`);
    }
  }
  return out;
}
const anomalies = detectAnomalies(all);
const sevCount = { high: 0, med: 0, low: 0 };
const byKind = {};
for (const a of anomalies) { sevCount[a.severity]++; byKind[a.kind] = (byKind[a.kind] || 0) + 1; }
rep.push('## R48a — Anomaly Detection', '');
rep.push(`Total: **${anomalies.length}** — high ${sevCount.high} / medium ${sevCount.med} / low ${sevCount.low}`);
rep.push('');
rep.push('### By kind');
rep.push('| Kind | Count |', '|---|---|');
for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) rep.push(`| ${k} | ${n} |`);
rep.push('');
const showSev = (sev, max) => {
  const items = anomalies.filter(a => a.severity === sev);
  if (items.length === 0) return;
  rep.push(`### ${sev.toUpperCase()} severity (showing ${Math.min(max, items.length)} / ${items.length})`);
  rep.push('| Material | Kind | Detail |', '|---|---|---|');
  for (const a of items.slice(0, max)) rep.push(`| ${a.name.replace(/\|/g, '\\|')} | ${a.kind} | ${a.detail} |`);
  rep.push('');
};
showSev('high', 40);
showSev('med', 20);
showSev('low', 10);

rep.push('## TODO', '- Hardness scale unification (HV/HRC/HB).', '- Reconcile fatigue/impact gaps where datasheets provide values.', '- (R34d candidate) Polymer creep rupture curves (PEEK / ULTEM / PEKK 100–200°C, 1000–10⁴ h).');

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
