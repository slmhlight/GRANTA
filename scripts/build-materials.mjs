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
function rangeFrom(values, confidence) {
  const vals = values.map(num).filter(v => v != null && v > 0).sort((a, b) => a - b);
  if (!vals.length) return null;
  // 다수의 실측이 모이면 'measured', 핸드북 1–3 포인트는 'handbook' (호출 측에서 지정)
  const conf = confidence || (vals.length >= 3 ? 'measured' : 'handbook');
  return { min: round(vals[0]), max: round(vals[vals.length - 1]), typical: round(vals[Math.floor(vals.length / 2)]), n: vals.length, confidence: conf };
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
const supplementary = supRaw
  // curated wins over reference ONLY when both target the same (AM) process. Wrought/Cast/Injection-Molded
  // counterparts are kept even when the alloy name matches a curated AM entry — that's the whole point.
  .filter((s) => AM_PROC.has(s.process) ? !(curatedAlias.has(norm(alloyOf(s.name))) || curatedAlias.has(norm(baseName(s.name)))) : true)
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

// 잘 알려진 표준 합금(가전·자동차·항공·산업에 광범위) → 높은 점수.
// AM 전용·실험적 합금 → 낮음. 명확한 규칙 기반이라 데이터 무결성 원칙에 부합.
function popularityFor(m) {
  const n = String(m.name || '').toLowerCase();
  const has = (re) => re.test(n);
  const cat = m.category;
  // tier 5: 학생도 들어본 표준 합금
  if (cat === 'Metal') {
    if (has(/ti[\s-]?6al[\s-]?4v|ti-6-4|gr ?5\b/) || has(/alsi10mg/) || has(/\b316l?\b/) || has(/17[\s-]?4 ?ph/) || has(/inconel 718|in[\s-]?718/) || has(/\b6061\b/) || has(/\ba356\b/) || has(/\b4340\b/) || has(/\bh13\b/)) return 5;
  }
  if (cat === 'Polymer' && (has(/\babs\b/) || has(/pa[\s-]?12|nylon 12/) || has(/polycarbonate|\bpc\b(?!-)/) || has(/\bpla\b/))) return 5;
  // tier 4: 매우 흔함
  if (cat === 'Metal') {
    if (has(/inconel 625|in[\s-]?625/) || has(/alsi7mg|\ba357\b/) || has(/\b304l?\b/) || has(/15[\s-]?5 ?ph/) || has(/\b7075\b/) || has(/\b5052\b/) || has(/\b4140\b/) || has(/cocrmo|\bcocr\b/) || has(/maraging|m300|c300|18ni/)) return 4;
  }
  if (cat === 'Polymer' && (has(/\bpeek\b(?!-)/) || has(/ultem|pei\b/) || has(/petg/))) return 4;
  // tier 3
  if (cat === 'Metal') {
    if (has(/haynes 230/) || has(/hastelloy x/) || has(/a-?286/) || has(/\b2205\b|\bduplex\b/) || has(/invar/) || has(/becu|beryllium copper/) || has(/bronze/) || has(/\b2024\b/) || has(/\b2014\b/) || has(/inconel 600/) || has(/cunisi|c18000|cuni2sicr/)) return 3;
  }
  if (cat === 'Polymer' && (has(/pa[\s-]?11|nylon 11/) || has(/asa\b/) || has(/\bpp\b|polypro/) || has(/\btpu\b/))) return 3;
  // tier 2
  if (cat === 'Metal') {
    if (has(/inconel 738|inconel 939|inconel x-?750|in[\s-]?(738|939|713)/) || has(/haynes 282|haynes 214/) || has(/hastelloy c-?22|c-?276/) || has(/cucr1zr|c18150|grcop/) || has(/tantal/) || has(/niobium|\bnb-?\b|c-?103/) || has(/superduplex|\b2507\b/) || has(/nitinol/) || has(/cuni30|c71500/)) return 2;
  }
  if (cat === 'Polymer' && (has(/ppsu/) || has(/pekk/) || has(/pps\b/) || has(/lcp\b/))) return 2;
  // tier 1: AM 전용 또는 매우 특수
  if (has(/scalmalloy/) || has(/aheadd/) || has(/al5x1|a205|a20x/) || has(/\bcx\b|cm55/) || has(/ta15|ti[\s-]?5[\s-]?8[\s-]?5|ti[\s-]?6242/)) return 1;
  if (cat === 'Polymer' && (has(/-cf|onyx|pcl|pha\b|pekk-?cf/))) return 1;
  return 1;
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
