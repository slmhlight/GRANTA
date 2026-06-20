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
/* R156b — pipeline 4-stage structure (scripts/pipeline/{loaders,enrich,validate,output}/).
   현재는 enrich/ 만 채워져 있음 (R155b 의 pure function 모듈). 추후 R156c 에서 loaders/validate/output 으로 확장. */
import { num, baseName, norm, round, smartRound, rangeFrom, uniq, mostCommon, mostCommonKnown, dedupeSources, dominantElement } from './pipeline/utilities.mjs';
import { htCostFactor, priceConditionFactor, priceFormFactor, priceGradePremium } from './pipeline/enrich/factors.mjs';
import { popularityFor } from './pipeline/enrich/popularity.mjs';
import { VENDOR_PREFIXES, CLASS_WORDS, alloyOf, aaSubcategory, nameBasedSubcategory, fixSubcategory, conditionClass, isExcludedByName, isExcludedAlloy, EXCLUDED_ALLOY_PATTERNS, EXCLUDED_NAME_PATTERNS, isFakeVariant } from './pipeline/enrich/classification.mjs';
import { htConditionMultiplier } from './pipeline/enrich/ht-condition.mjs';

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
// R155b — num, baseName, norm, round, smartRound, rangeFrom, uniq, mostCommon → scripts/lib/utilities.mjs 로 이동.

// generic/am_vendor source enrichment — verifiable references, NOT fabricated per-material datasheets
const matwebSearch = (name) => ({ label: `MatWeb — search "${name}"`, url: `https://www.matweb.com/search/QuickText.aspx?SearchText=${encodeURIComponent(name)}`, verified: false });
function familyHandbook(category, subcategory) {
  if (category === 'Polymer') return { label: 'ASM Engineered Materials Handbook, Vol. 2: Engineering Plastics', url: null, verified: false };
  const sc = String(subcategory || '').toLowerCase();
  if (sc.includes('alumin')) return { label: 'ASM Handbook Vol. 2 (Nonferrous) · Aluminum Association designations', url: null, verified: false };
  if (sc.includes('steel') || sc.includes('iron')) return { label: 'ASM Handbook Vol. 1: Irons, Steels & High-Performance Alloys', url: null, verified: false };
  return { label: 'ASM Handbook Vol. 2: Properties & Selection: Nonferrous Alloys', url: null, verified: false };
}

/* R112 — Polymer family 별 대표 vendor URL. CSV polymer ~94종에 자동 매핑 (verified). */
function polymerVendorURL(subcategory, name) {
  const s = String(subcategory || '').toLowerCase();
  const n = String(name || '').toLowerCase();
  if (s.includes('peek') || n.includes('peek')) return { label: 'Victrex PEEK product page', url: 'https://www.victrex.com/en/products', verified: true };
  if (s.includes('pei') || s.includes('ultem') || n.includes('ultem')) return { label: 'SABIC ULTEM resin', url: 'https://www.sabic.com/en/products/specialties/ultem-resins', verified: true };
  if (s.includes('pekk') || n.includes('pekk')) return { label: 'Solvay KetaSpire PEEK / KEPSTAN PEKK', url: 'https://www.solvay.com/en/brands/kepstan', verified: true };
  if (s.includes('psu') || s.includes('polysulf')) return { label: 'Solvay Udel PSU', url: 'https://www.solvay.com/en/brands/udel-psu', verified: true };
  if (s.includes('ppsu') || n.includes('ppsu')) return { label: 'Solvay Radel PPSU', url: 'https://www.solvay.com/en/brands/radel-ppsu', verified: true };
  if (s.includes('pes') || n.includes('pes ')) return { label: 'Solvay Veradel PES', url: 'https://www.solvay.com/en/brands/veradel-pes', verified: true };
  if (s.includes('pps') || n.includes('fortron')) return { label: 'Celanese Fortron PPS', url: 'https://www.celanese.com/products/Fortron-PPS', verified: true };
  if (s.includes('pa12') || n.includes('pa12') || n.includes('nylon 12')) return { label: 'EOS PA 2200 / Arkema Rilsan PA12', url: 'https://www.eos.info/en-us/3d-printing-materials/plastic/polyamide-pa-12-alumide', verified: true };
  if (s.includes('pa66') || n.includes('pa66') || n.includes('nylon 66')) return { label: 'BASF Ultramid PA66', url: 'https://www.basf.com/global/en/products/plastics/engineering-plastics/ultramid.html', verified: true };
  if (s.includes('nylon') || s.includes('polyamide') || s.includes('pa1') || s.includes(' pa')) return { label: 'BASF Ultramid / EOS PA powder', url: 'https://www.eos.info/en-us/3d-printing-materials/plastic', verified: true };
  if (s.includes('polycarb') || n.includes('lexan') || n === 'pc' || n.includes(' pc ') || n.startsWith('pc ')) return { label: 'SABIC LEXAN PC', url: 'https://www.sabic.com/en/products/specialties/lexan-resins', verified: true };
  if (s.includes('abs') || n.startsWith('abs')) return { label: 'SABIC CYCOLAC ABS', url: 'https://www.sabic.com/en/products/specialties/cycolac-resin', verified: true };
  if (s.includes('pmma') || s.includes('acrylic') || n.includes('plexiglas')) return { label: 'Arkema Plexiglas PMMA', url: 'https://www.plexiglas.com/en/products', verified: true };
  if (s.includes('petg') || n.includes('petg')) return { label: 'Eastman Tritan / Polyclear PETG', url: 'https://www.eastman.com/en/products/product-detail/77003116/tritan-copolyester', verified: true };
  if (s.includes('pla') || n.startsWith('pla')) return { label: 'NatureWorks Ingeo PLA', url: 'https://www.natureworksllc.com/Products', verified: true };
  if (s.includes('tpu') || n.includes('tpu')) return { label: 'Lubrizol Estane TPU', url: 'https://www.lubrizol.com/Engineered-Polymers', verified: true };
  if (s.includes('pom') || s.includes('acetal') || n.includes('hostaform') || n.includes('delrin')) return { label: 'Celanese Hostaform / DuPont Delrin POM', url: 'https://www.celanese.com/products/hostaform-pom', verified: true };
  if (s.includes('vespel') || s.includes('polyimid')) return { label: 'DuPont Vespel Polyimide', url: 'https://www.dupont.com/products/vespel-parts-and-shapes.html', verified: true };
  if (s.includes('epoxy') || n.includes('epoxy')) return { label: 'Hexion Epoxy resins', url: 'https://www.hexion.com/en-us/products/epoxy-resins', verified: true };
  if (s.includes('polyester') || n.includes('polyester')) return { label: 'AOC Vipel polyester resins', url: 'https://aocresins.com/products', verified: true };
  if (s.includes('hdpe') || s.includes('ldpe') || s.includes('pe') && !s.includes('peek')) return { label: 'Dow PE resin product family', url: 'https://www.dow.com/en-us/market/mkt-packaging/sub-pack-flex-pack/resins-for-flex-pack/polyethylene-resins.html', verified: true };
  if (s.includes('pp') || s.includes('polypro')) return { label: 'ExxonMobil PP product family', url: 'https://www.exxonmobilchemical.com/en/products/polymers-and-plastics/polypropylene', verified: true };
  return null;
}
// R155b — dedupeSources, mostCommonKnown → scripts/lib/utilities.mjs 로 이동.

// multi-family auto-tagging — one material can belong to several families
const ELEMENT_FAMILY = [['Fe', 'Iron-based'], ['Al', 'Aluminum-based'], ['Ni', 'Nickel-based'], ['Ti', 'Titanium-based'], ['Co', 'Cobalt-based'], ['Cu', 'Copper-based'], ['Mg', 'Magnesium-based'], ['W', 'Refractory'], ['Ta', 'Refractory'], ['Nb', 'Refractory']];
// R155b — dominantElement → scripts/lib/utilities.mjs 로 이동.
function familyTags(category, subcategory, composition) {
  const tags = new Set();
  if (category) tags.add(category);
  if (subcategory) tags.add(subcategory);
  /* R199 — element family tags 는 Metal 카테고리만 적용.
     Ceramic (Al₂O₃ 의 dominant element Al → 'Aluminum-based' false-positive 회피),
     Composite, Polymer 는 element-based family 부적합. */
  if (category === 'Metal') {
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
// R155b — VENDOR_PREFIXES, CLASS_WORDS, alloyOf, aaSubcategory → scripts/lib/classification.mjs 로 이동.

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
  'c18100': ['UNS C18100', 'EN CW106C', 'CuCr1Zr', 'Elbrodur'],
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
  // Sprint1 A1 — sub-token 매칭 강화. "Tool Steel H13" / "Maraging 300 (UNS K93120)" /
  //   "Stainless Steel 17-4PH" 같은 prefix-augmented name 도 ALIAS_MAP 매칭.
  const subTokens = String(name).toLowerCase().match(/\b(?:h1[013]|m2|d2|d3|skd\d{2}|17[\s-]?4\s?ph|15[\s-]?5\s?ph|maraging\s?\d{0,3}|inconel\s?\d{3}|hastelloy\s?[a-z]\b|hastelloy\s?[cxbn]-?\d{0,3}|haynes\s?\d{3}|nimonic\s?\d{2,3}|monel\s?[a-z]?-?\d{0,3}|aa\s?\d{4}|s45c|scm\d{3,4}|sncm\d{3}|sus\d{3}|suj2|s\d{2,3}c|\d{4,5}ph|4\d{3}|8620|9310|52100|100cr6|cocrmo|f75|f1537)\b/g) || [];
  for (const tok of subTokens) keys.add(norm(tok));
  for (const k of keys) (ALIAS_MAP[k] || []).forEach((a) => set.add(a));
  return Array.from(set);
}

/* R108 + R173 Phase B — handbook qualitative ratings (ASM Vol.1 corrosion / Vol.6 welding / Vol.16 machining).
   confidence: handbook (1st reference); 4 grades: Outstanding > Excellent > Good > Fair > Poor.
   Key = norm(name) — alpha-numeric only. */
const QUAL_MAP = {
  /* Stainless steels — austenitic */
  '304':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },       // Sensitization risk on Q+T cycles
  '304l':  { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },  // ELC → no sensitization
  'aisi304':  { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  'aisi304l': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },
  '316':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },       // +Mo → Cl-pitting 저항
  '316l':  { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },
  'aisi316':  { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  'aisi316l': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },
  '321':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },  // Ti stabilized — no sensit.
  '347':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },  // Nb stabilized
  '302':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  /* Stainless steels — martensitic / ferritic */
  '410':   { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Poor' },        // Q+T + preheat 필수
  '420':   { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Poor' },        // High-C martensitic
  '430':   { corrosion: 'Moderate', machinability: 'Good', weldability: 'Fair' },        // Ferritic
  '440c':  { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Poor' },        // Bearing grade
  /* Stainless steels — PH */
  '174ph': { corrosion: 'Good', machinability: 'Fair', weldability: 'Good' },
  '155ph': { corrosion: 'Good', machinability: 'Fair', weldability: 'Good' },
  '177ph': { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' },
  '157ph': { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' },
  'ph138mo': { corrosion: 'Good', machinability: 'Fair', weldability: 'Good' },
  'custom465': { corrosion: 'Good', machinability: 'Fair', weldability: 'Good' },
  /* Plain carbon steels */
  '1018':  { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Excellent' },  // ASM Vol.16 baseline = 100
  '1020':  { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Excellent' },
  '1010':  { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Excellent' },
  '1045':  { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },            // Medium-C, Q+T 가능
  '1040':  { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },
  '1050':  { corrosion: 'Poor', machinability: 'Good', weldability: 'Fair' },
  '1080':  { corrosion: 'Poor', machinability: 'Fair', weldability: 'Fair' },            // High-C, preheat 필요
  '1144':  { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Fair' },       // Resulfurized free-machining
  'a36':   { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Excellent' },  // ASTM A36 structural
  '52100': { corrosion: 'Poor', machinability: 'Fair', weldability: 'Poor' },            // Bearing — Q+T HRC 60+
  /* Alloy steels (Cr-Mo, Ni-Cr-Mo) */
  '4140':  { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },            // Q+T 표준
  '42crmo4': { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },          // EN 4140 동등
  '4340':  { corrosion: 'Poor', machinability: 'Fair', weldability: 'Fair' },            // High-strength, preheat
  '4130':  { corrosion: 'Poor', machinability: 'Good', weldability: 'Excellent' },       // Aerospace chromoly
  '8620':  { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },            // Case-hardening
  '8740':  { corrosion: 'Poor', machinability: 'Fair', weldability: 'Fair' },
  '300m':  { corrosion: 'Poor', machinability: 'Fair', weldability: 'Poor' },            // UHS landing gear
  'aermet100': { corrosion: 'Poor', machinability: 'Fair', weldability: 'Fair' },
  /* Tool steels */
  'h13':   { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Fair' },        // Hot-work
  'd2':    { corrosion: 'Moderate', machinability: 'Poor', weldability: 'Poor' },        // High-Cr cold-work
  'a2':    { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Poor' },
  'o1':    { corrosion: 'Moderate', machinability: 'Good', weldability: 'Poor' },
  's7':    { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Fair' },        // Shock-resisting
  'p20':   { corrosion: 'Moderate', machinability: 'Good', weldability: 'Fair' },        // Pre-hardened mold
  'cpm3v': { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Poor' },        // PM high-impact
  /* Spring steels */
  'sup9':  { corrosion: 'Poor', machinability: 'Fair', weldability: 'Fair' },
  'sup10': { corrosion: 'Poor', machinability: 'Fair', weldability: 'Fair' },
  /* Maraging */
  'maraging250': { corrosion: 'Moderate', machinability: 'Good', weldability: 'Excellent' },  // Carbon-free → no HAZ crack
  'maraging300': { corrosion: 'Moderate', machinability: 'Good', weldability: 'Excellent' },
  'maraging350': { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Excellent' },
  'maragingsteel': { corrosion: 'Moderate', machinability: 'Good', weldability: 'Excellent' },
  /* Titanium */
  'tigrade1': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Excellent' },   // CP-Ti most weldable
  'tigrade2': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Excellent' },
  'tigrade3': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Excellent' },
  'tigrade4': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  'tigrade5': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },        // Ti-6Al-4V
  'tigrade23': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },       // ELI medical
  'ti6al4v': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },
  'ti6al7nb': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },
  'tigrade9': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' },        // Ti-3Al-2.5V
  /* Nickel superalloys */
  'inconel718': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },      // γ'' slow aging → no SAC
  'inconel718plus': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },
  'inconel625': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Excellent' }, // Solid-solution
  'inconel600': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  'inconel601': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  'inconel617': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },
  'inconel690': { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },    // SG tube
  'inconel740h': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },
  'inconelx750': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },
  'incoloy800h': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  'incoloy825': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  'a286':   { corrosion: 'Good', machinability: 'Fair', weldability: 'Good' },               // Fe-base γ'
  'hastelloyc276': { corrosion: 'Outstanding', machinability: 'Poor', weldability: 'Good' }, // Best reducing acid
  'hastelloyc22': { corrosion: 'Outstanding', machinability: 'Poor', weldability: 'Good' },  // Best general
  'hastelloyx':  { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },
  'hastelloyb2': { corrosion: 'Outstanding', machinability: 'Poor', weldability: 'Fair' },
  'haynes230': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },
  'haynes282': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },       // No SAC (low γ' Vf)
  'haynes188': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },
  'haynes214': { corrosion: 'Outstanding', machinability: 'Poor', weldability: 'Good' },     // Alumina-forming
  'waspaloy': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },        // γ' → strain-age crack
  'nimonic80a': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },
  'nimonic90':  { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },
  'nimonic263': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },
  'udimet720':  { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },      // High γ' — SAC
  'udimet720li': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },
  'cmsx4':  { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },          // SX — repair only
  'cmsx10': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },
  'rene80': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },
  'monel400': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' },
  'monelk500': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' },
  'nickel200': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },
  'invar36': { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Good' },          // Low CTE Fe-Ni
  'kovar':   { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Excellent' },     // Glass-metal seal
  'nitinol': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },
  /* Cobalt-based */
  'cocr':    { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },
  'cocrmo':  { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },         // F75 / F1537
  'stellite6':  { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },      // Hard-facing overlay
  'stellite21': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },
  'l605':    { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },         // Combustor liner
  'haynes25': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },        // L-605 dup
  'mp35n':   { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },
  /* Aluminum */
  'aa1050': { corrosion: 'Excellent', machinability: 'Excellent', weldability: 'Excellent' }, // Pure Al
  'aa1100': { corrosion: 'Excellent', machinability: 'Excellent', weldability: 'Excellent' },
  'aa2014': { corrosion: 'Moderate', machinability: 'Good', weldability: 'Poor' },             // High-Cu SCC
  'aa2024': { corrosion: 'Moderate', machinability: 'Good', weldability: 'Poor' },             // SCC + porosity
  'aa2099': { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },                 // Al-Li
  'aa2618': { corrosion: 'Moderate', machinability: 'Good', weldability: 'Fair' },
  'aa3003': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Excellent' },       // Non-HT, Mn
  /* R175 — AA 5xxx weldability 'Excellent' → 'Good' 정정.
     5xxx Al-Mg 합금은 fusion welding 자체는 우수 (4043/5356 filler 표준) 이지만:
     · HAZ softening — non-HT alloy 라 cold-worked H32/H34 → as-welded annealed (σy 50% 손실)
     · Marine SCC — Mg ≥ 3% (5083 4.5%, 5456 5%) 의 50°C+ 장기 노출 시 β-phase 입계 석출 → SCC
     · ASM Vol.6 의 정확한 rating 은 'Good' (Excellent 는 1xxx/3xxx 만) */
  'aa5005': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' },        // Low-Mg (0.8%), 안전
  'aa5052': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' },        // Mg 2.5%, HAZ softening
  'aa5083': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' },        // Mg 4.5%, Marine SCC > 50°C
  'aa5454': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' },        // Mg 3%, 자동차 fuel tank
  'aa5456': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Fair' },        // Mg 5%, 가장 high-Mg → SCC 우려 大
  'aa5086': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' },        // Mg 4%, 해상
  'aa6005a': { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },
  'aa6061': { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },                 // 4043 filler
  'aa6063': { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },                 // Extrusion
  'aa6082': { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },                 // EU structural
  'aa7050': { corrosion: 'Moderate', machinability: 'Good', weldability: 'Poor' },
  'aa7068': { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Poor' },             // Highest-strength Al
  'aa7075': { corrosion: 'Moderate', machinability: 'Good', weldability: 'Poor' },
  'alsi10mg': { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },               // AM standard
  'alsi7mg':  { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },
  'a356':     { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },               // Cast Al
  'a380':     { corrosion: 'Moderate', machinability: 'Good', weldability: 'Fair' },           // Cast Al-Si-Cu
  'scalmalloy': { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },
  /* Copper alloys */
  'cucr1zr': { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },
  'c11000':  { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },                // ETP, H-embrittlement
  'c10100':  { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },                // OFE
  'c10200':  { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },                // OF
  'c18000':  { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },                // CuNiSiCr
  'c18150':  { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },                // CuCrZr
  'c17200':  { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },                // BeCu — toxic dust
  'c46400':  { corrosion: 'Excellent', machinability: 'Excellent', weldability: 'Fair' },      // Naval brass
  'c70600':  { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' },           // 90/10 cupronickel
  'c71500':  { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' },           // 70/30 cupronickel
  'c75200':  { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },                // Nickel silver
  'c95800':  { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Fair' },           // NAB marine
  /* Magnesium */
  'az31b':  { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Good' },             // Wrought Mg
  'az91d':  { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Fair' },             // Die-cast
  'we43':   { corrosion: 'Moderate', machinability: 'Excellent', weldability: 'Fair' },          // RE-Mg
  /* Refractory */
  'tantalum': { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },
  'tungsten': { corrosion: 'Good', machinability: 'Poor', weldability: 'Poor' },                 // Brittle, oxidation
  'molybdenum': { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' },
  'niobium':  { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  'c103':     { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },             // Nb-Hf-Ti
  /* Wear / pressure vessel / spring */
  'hadfieldmanganesesteel': { corrosion: 'Poor', machinability: 'Poor', weldability: 'Fair' },    // Work-hardening Mn13 — ASM
  'hadfield': { corrosion: 'Poor', machinability: 'Poor', weldability: 'Fair' },
  'mn13':     { corrosion: 'Poor', machinability: 'Poor', weldability: 'Fair' },
  'sa516':    { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },                  // Pressure vessel
  'a516':     { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },
  'p355n':    { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },
  'a572':     { corrosion: 'Poor', machinability: 'Good', weldability: 'Excellent' },             // HSLA
  /* Austenitic stainless variants */
  'super304h': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },            // Nb-Cu strengthened
  's30432':    { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  '253ma':     { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },            // High-temp
  '904l':      { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },          // Super austenitic
  'n08904':    { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },
  '654smo':    { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },          // 7Mo super
  '309s':      { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },            // High-temp
  '310s':      { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  '316h':      { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  '316ln':     { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },       // Low-C high-N
  '347h':      { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },       // Nb stabilized H grade
  '317l':      { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Excellent' },     // 3-4% Mo
  '317':       { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },
  'aisi301':   { corrosion: 'Good', machinability: 'Fair', weldability: 'Good' },                 // CW high-strength
  'aisi303':   { corrosion: 'Good', machinability: 'Excellent', weldability: 'Poor' },            // Free-machining (S)
  'aisi305':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },            // Low-Ni
  'aisi308':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Excellent' },       // Welding rod
  'aisi309':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },            // Heat-resist
  'aisi310':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  'aisi317':   { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },
  /* Valve steels */
  '214n':      { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },            // SAE 21-4N
  'sae214n':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },
  'ncf3':      { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },            // JIS NCF3 = 21-4N
  /* Titanium high-temp */
  'ti525':     { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },            // Ti-5Al-2.5Sn α
  'ti811':     { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },            // Ti-8Al-1Mo-1V near-α
  'ti6242':    { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },            // High-temp α+β
  /* Additional Al */
  'aa1100':    { corrosion: 'Excellent', machinability: 'Excellent', weldability: 'Excellent' },  // CP Al 99.0
  'aa1200':    { corrosion: 'Excellent', machinability: 'Excellent', weldability: 'Excellent' },
  'aa6101':    { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },                 // Electrical bus
  'aa6151':    { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },                 // Forging
  'aa6262':    { corrosion: 'Good', machinability: 'Excellent', weldability: 'Fair' },            // Pb-Bi free-mach
  /* More tool steel + HSS + mold */
  'm50':       { corrosion: 'Poor', machinability: 'Fair', weldability: 'Poor' },                   // AMS 6491 bearing
  'm42':       { corrosion: 'Poor', machinability: 'Fair', weldability: 'Poor' },                   // Co-8% HSS
  'm42hss':    { corrosion: 'Poor', machinability: 'Fair', weldability: 'Poor' },
  'h11':       { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Fair' },               // Hot-work
  'h21':       { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Poor' },               // W-Cr hot-work
  'aisih21':   { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Poor' },
  'd3':        { corrosion: 'Moderate', machinability: 'Poor', weldability: 'Poor' },               // High-Cr cold-work
  'nak80':     { corrosion: 'Poor', machinability: 'Fair', weldability: 'Poor' },                   // Daido pre-hard
  /* More Titanium variants */
  'ti6al7nb':  { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },              // ASTM F1295 medical
  'beta21s':   { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },              // TIMETAL 21S
  'betac':     { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },              // Ti-3-8-6-4-4
  'ti13v11cr3al': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },           // B120-VCA 1st-gen β
  'ti1533':    { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },              // Ti-15-3
  'ti15v3cr3al3sn': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },
  'ti6al2sn4zr2mo': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },         // Ti-6242
  'ti6al2sn4zr6mo': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },         // Ti-6246
  'ti10v2fe3al':    { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },          // Ti-10-2-3
  'titaniumgrade11': { corrosion: 'Excellent', machinability: 'Good', weldability: 'Excellent' },    // Ti-0.15Pd
  /* More Mg alloys */
  'az80a':     { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Fair' },               // CW Mg
  'zk60':      { corrosion: 'Moderate', machinability: 'Excellent', weldability: 'Good' },           // Mg-Zn-Zr extrusion
  'am60':      { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Fair' },               // Die-cast
  'ze41':      { corrosion: 'Moderate', machinability: 'Excellent', weldability: 'Good' },
  'ez33a':     { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Fair' },
  'hk31a':     { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Fair' },               // Mg-Th-Zr (legacy)
  'we54':      { corrosion: 'Moderate', machinability: 'Excellent', weldability: 'Fair' },
  'ze63a':     { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Fair' },
  /* Zinc / Beryllium / special */
  'zamak3':    { corrosion: 'Moderate', machinability: 'Good', weldability: 'Poor' },                // ZnAl4 die-cast — ZA series
  'zamak':     { corrosion: 'Moderate', machinability: 'Good', weldability: 'Poor' },
  'beryllium': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },               // Pure Be — toxic
  'becu':      { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },                    // Same as C17200
  /* PPS polymer */
  'pps':       { corrosion: 'Excellent', machinability: 'Good', weldability: 'N/A' },                // Solvent-resistant
  'fortron':   { corrosion: 'Excellent', machinability: 'Good', weldability: 'N/A' },
  'ryton':     { corrosion: 'Excellent', machinability: 'Good', weldability: 'N/A' },
  /* Advanced Ni superalloys */
  'inconel100': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },              // Cast γ' high-Vf
  'inconel706': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },              // Fe-Ni γ''
  'inconel783': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' },              // Low-CTE γ'
  'inconel713': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },              // Cast
  'inconel738': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },              // Cast
  'incoloy909': { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Good' },               // Controlled expansion
  'incoloy925': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },              // Oil/gas downhole
  'rene80':     { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },              // Cast
  'rene41':     { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },              // γ' wrought
  'rene88dt':   { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },              // PM disc
  'renen5':     { corrosion: 'Excellent', machinability: 'Very Poor', weldability: 'Poor' },         // SX
  'pwa1484':    { corrosion: 'Excellent', machinability: 'Very Poor', weldability: 'Poor' },         // 2nd-gen SX
  'allvac718plus': { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' },           // ATI 718Plus
  'astroloy':   { corrosion: 'Excellent', machinability: 'Very Poor', weldability: 'Poor' },         // PM disc
  /* Free-machining brass */
  'c36000':    { corrosion: 'Good', machinability: 'Excellent', weldability: 'Fair' },               // CDA 360, baseline for machinability
  /* Refractory metals (pure + alloyed) */
  'chromium':    { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },              // Pure Cr — brittle
  'hafnium':     { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },               // Nuclear cladding
  'rhenium':     { corrosion: 'Good', machinability: 'Poor', weldability: 'Poor' },                    // High-T thrust chamber
  'vanadium':    { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Fair' },               // Pure V (nuclear)
  'zirconium':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },               // Nuclear cladding
  'zircaloy2':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },               // BWR cladding
  'zircaloy4':   { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },               // PWR cladding
  'zirconium705': { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' },              // Zr-2.5Nb chem
  'mola':        { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' },                    // Lanthanum-doped Mo
  'mo05ti':      { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' },                    // Mo-Ti-Zr (TZM)
  'tzm':         { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' },                    // Mo-0.5Ti-0.08Zr
  'more':        { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' },                    // Mo-Re
  'wla':         { corrosion: 'Good', machinability: 'Poor', weldability: 'Poor' },                    // Lanthanated W
  'tungstenheavy': { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' },                  // W-Ni-Fe HMA
  'wnife':       { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' },
  'nb1zr':       { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' },               // Reactor
  'ta10w':       { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },             // Acid + high-T
  /* Specialty steels (cryogenic, armor, microalloyed) */
  'eh36':        { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },                    // Shipbuilding
  'dh36':        { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },
  '9nisteel':    { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },                    // LNG cryogenic
  'astma553':    { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },                    // 9% Ni / 7% Ni LNG
  'api5lx65':    { corrosion: 'Poor', machinability: 'Good', weldability: 'Excellent' },               // Pipeline HSLA
  'l450':        { corrosion: 'Poor', machinability: 'Good', weldability: 'Excellent' },
  'armox600t':   { corrosion: 'Poor', machinability: 'Fair', weldability: 'Fair' },                    // Quenched armor
  'armox':       { corrosion: 'Poor', machinability: 'Fair', weldability: 'Fair' },
  'aisi9310':    { corrosion: 'Poor', machinability: 'Fair', weldability: 'Good' },                    // Aerospace gear
  '38mnvs6':     { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' },                    // Microalloy crank
  '254smo':      { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },             // Super austenitic
  'aisi254smo':  { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },
  's31254':      { corrosion: 'Outstanding', machinability: 'Fair', weldability: 'Good' },
  /* Chrome-silicon spring */
  'chromesilicon': { corrosion: 'Poor', machinability: 'Fair', weldability: 'Fair' },                  // ASTM A401
  /* Advanced Ni superalloys */
  'inconel738':  { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },               // Cast turbine blade
  'in738':       { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },
  'in939':       { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },
  'in713':       { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' },
  /* GRCop-42 (NASA Cu alloy) */
  'grcop42':     { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },                    // Rocket combustion
  'grcop':       { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },
  /* R179 — Cu alloys missing weldability rating (low-Zn brass + Al-Cu). ASM Vol.6 Cu welding. */
  'c21000': { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },      // Red Brass 95Cu-5Zn (Gilding Metal) — ER CuSn-A filler, low Zn fume
  'c22000': { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },      // Red Brass 90Cu-10Zn (Commercial Bronze)
  'c23000': { corrosion: 'Good', machinability: 'Good', weldability: 'Good' },      // Red Brass 85Cu-15Zn
  'c26800': { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' },      // Yellow Brass 66Cu-34Zn — Zn fume LEV 필수
  'a205':   { corrosion: 'Poor', machinability: 'Good', weldability: 'Poor' },      // AA 2139 Al-Cu (aerospace) — fusion welding 거의 불가 (Cu-Mg-Si segregation, hot crack)
};
function qualFor(name) {
  const keys = new Set([norm(alloyOf(name)), norm(baseName(name))]);
  for (const tok of String(name).split(/[\s(),/]+/)) if (/\d/.test(tok)) keys.add(norm(tok));
  for (const k of keys) if (QUAL_MAP[k]) return QUAL_MAP[k];
  return null;
}
// R108 — alloy-specific physical properties (handbook values from ASM Vol.1/2/4, MMPDS-08, Special Metals datasheets).
// 정확한 1차 자료 값으로 class fallback (~1119 개) 을 handbook 값으로 대체.
// 키 = norm(name) 일부 또는 정확 매치 → { ec, tmax, price, cte, poisson, cp, melt, kic, fatigue }
// kic = MPa·√m, fatigue = endurance MPa (R=-1, 10^7 cycles), price = $/kg market 2026 Q1
const ALLOY_SPECIFIC = {
  // ─── Carbon / Alloy steels (ASM Vol.1 + MMPDS-08 Ch.2) ───
  '4130': { ec: 7.5, tmax: 425, price: 3.0, cte: 12.2, poisson: 0.29, cp: 477, melt: 1432, kic: 90 },
  '4140': { ec: 7.0, tmax: 425, price: 2.8, cte: 12.3, poisson: 0.29, cp: 473, melt: 1426, kic: 80 },
  '4340': { ec: 6.5, tmax: 425, price: 4.5, cte: 12.3, poisson: 0.29, cp: 475, melt: 1425, kic: 75 },
  '8740': { ec: 6.8, tmax: 425, price: 4.0, cte: 11.9, poisson: 0.29, cp: 477, melt: 1427, kic: 80 },
  '8620': { ec: 7.0, tmax: 400, price: 2.7, cte: 11.9, poisson: 0.29, cp: 477, melt: 1427, kic: 60 },
  '300m': { ec: 6.2, tmax: 425, price: 8.0, cte: 12.0, poisson: 0.29, cp: 472, melt: 1425, kic: 65 },
  'd6ac': { ec: 6.5, tmax: 425, price: 6.0, cte: 11.8, poisson: 0.29, cp: 470, melt: 1425, kic: 100 },
  '1045': { ec: 14, tmax: 540, price: 1.2, cte: 11.5, poisson: 0.29, cp: 486, melt: 1495, kic: 50 },
  '1018': { ec: 16, tmax: 540, price: 0.9, cte: 11.7, poisson: 0.29, cp: 486, melt: 1515, kic: 60 },
  '1020': { ec: 16, tmax: 540, price: 0.9, cte: 11.7, poisson: 0.29, cp: 486, melt: 1515, kic: 60 },
  '1050': { ec: 14, tmax: 540, price: 1.3, cte: 11.5, poisson: 0.29, cp: 486, melt: 1495, kic: 45 },
  '5140': { ec: 7.5, tmax: 425, price: 2.5, cte: 12.3, poisson: 0.29, cp: 475, melt: 1430, kic: 65 },
  '5160': { ec: 7.5, tmax: 425, price: 2.8, cte: 12.3, poisson: 0.29, cp: 475, melt: 1430, kic: 60 },
  's7':   { ec: 5,   tmax: 540, price: 8.0, cte: 11.5, poisson: 0.29, cp: 461, melt: 1430, kic: 50 },
  // ─── Stainless steels (ASM Vol.1 + handbook) ───
  '304':   { ec: 2.4, tmax: 870, price: 4.5, cte: 17.3, poisson: 0.29, cp: 500, melt: 1450, kic: 220 },
  '304l':  { ec: 2.4, tmax: 870, price: 4.7, cte: 17.3, poisson: 0.29, cp: 500, melt: 1450, kic: 220 },
  '316':   { ec: 2.3, tmax: 870, price: 5.5, cte: 16.0, poisson: 0.30, cp: 500, melt: 1400, kic: 200 },
  '316l':  { ec: 2.3, tmax: 870, price: 5.8, cte: 16.0, poisson: 0.30, cp: 500, melt: 1400, kic: 200 },
  '321':   { ec: 2.3, tmax: 870, price: 6.0, cte: 16.6, poisson: 0.30, cp: 500, melt: 1425, kic: 180 },
  '347':   { ec: 2.3, tmax: 870, price: 6.5, cte: 16.6, poisson: 0.30, cp: 500, melt: 1425, kic: 180 },
  '410':   { ec: 3.0, tmax: 650, price: 3.5, cte: 9.9,  poisson: 0.28, cp: 460, melt: 1480, kic: 40 },
  '420':   { ec: 3.0, tmax: 650, price: 3.7, cte: 10.3, poisson: 0.28, cp: 460, melt: 1480, kic: 30 },
  '430':   { ec: 3.5, tmax: 815, price: 3.0, cte: 10.4, poisson: 0.30, cp: 460, melt: 1480, kic: 80 },
  '440c':  { ec: 2.5, tmax: 480, price: 4.5, cte: 10.2, poisson: 0.28, cp: 460, melt: 1480, kic: 22 },
  '174ph': { ec: 2.5, tmax: 315, price: 6.5, cte: 11.0, poisson: 0.27, cp: 460, melt: 1404, kic: 90 },
  '155ph': { ec: 2.5, tmax: 315, price: 7.0, cte: 10.8, poisson: 0.27, cp: 460, melt: 1404, kic: 80 },
  '177ph': { ec: 2.5, tmax: 315, price: 7.5, cte: 11.0, poisson: 0.27, cp: 460, melt: 1404, kic: 65 },
  '2205':  { ec: 2.0, tmax: 300, price: 8.0, cte: 13.0, poisson: 0.30, cp: 500, melt: 1465, kic: 110 },
  '2507':  { ec: 1.9, tmax: 300, price: 12,  cte: 13.0, poisson: 0.30, cp: 480, melt: 1450, kic: 110 },
  // ─── Aluminum alloys (ASM Vol.2 + Aluminum Association datasheets) ───
  '6061':  { ec: 43,  tmax: 170, price: 3.0, cte: 23.6, poisson: 0.33, cp: 896, melt: 652, kic: 29 },
  '6063':  { ec: 53,  tmax: 170, price: 2.8, cte: 23.4, poisson: 0.33, cp: 900, melt: 655, kic: 32 },
  '6082':  { ec: 50,  tmax: 170, price: 3.0, cte: 23.4, poisson: 0.33, cp: 900, melt: 650, kic: 31 },
  '7075':  { ec: 33,  tmax: 120, price: 5.5, cte: 23.4, poisson: 0.33, cp: 960, melt: 635, kic: 26 },
  '7050':  { ec: 41,  tmax: 120, price: 7.0, cte: 23.5, poisson: 0.33, cp: 860, melt: 635, kic: 32 },
  '7175':  { ec: 35,  tmax: 120, price: 6.0, cte: 23.4, poisson: 0.33, cp: 860, melt: 635, kic: 26 },
  '2024':  { ec: 30,  tmax: 150, price: 5.0, cte: 22.9, poisson: 0.33, cp: 875, melt: 638, kic: 25 },
  '2014':  { ec: 38,  tmax: 150, price: 4.5, cte: 22.5, poisson: 0.33, cp: 880, melt: 638, kic: 22 },
  '2219':  { ec: 30,  tmax: 200, price: 6.0, cte: 22.3, poisson: 0.33, cp: 864, melt: 638, kic: 32 },
  '2090':  { ec: 39,  tmax: 150, price: 12,  cte: 21.5, poisson: 0.33, cp: 920, melt: 625, kic: 28 },
  '2195':  { ec: 39,  tmax: 200, price: 18,  cte: 21.6, poisson: 0.33, cp: 920, melt: 625, kic: 30 },
  '5052':  { ec: 35,  tmax: 200, price: 3.0, cte: 23.8, poisson: 0.33, cp: 880, melt: 650, kic: 38 },
  '5083':  { ec: 29,  tmax: 200, price: 3.2, cte: 23.8, poisson: 0.33, cp: 900, melt: 638, kic: 40 },
  '5086':  { ec: 31,  tmax: 200, price: 3.2, cte: 23.9, poisson: 0.33, cp: 900, melt: 638, kic: 38 },
  '3003':  { ec: 50,  tmax: 200, price: 2.5, cte: 23.2, poisson: 0.33, cp: 893, melt: 660, kic: 50 },
  'a356':  { ec: 39,  tmax: 175, price: 3.5, cte: 21.5, poisson: 0.33, cp: 963, melt: 615, kic: 18 },
  'a357':  { ec: 39,  tmax: 175, price: 4.0, cte: 21.5, poisson: 0.33, cp: 963, melt: 615, kic: 19 },
  'a360':  { ec: 28,  tmax: 175, price: 3.0, cte: 21.0, poisson: 0.33, cp: 963, melt: 595, kic: 17 },
  'a380':  { ec: 23,  tmax: 175, price: 3.0, cte: 22.0, poisson: 0.33, cp: 963, melt: 593, kic: 15 },
  'alsi10mg': { ec: 40, tmax: 175, price: 8.0, cte: 21.0, poisson: 0.33, cp: 920, melt: 614, kic: 18 },
  'alsi7mg':  { ec: 40, tmax: 175, price: 9.0, cte: 21.5, poisson: 0.33, cp: 920, melt: 615, kic: 19 },
  'scalmalloy': { ec: 28, tmax: 250, price: 200, cte: 23.0, poisson: 0.33, cp: 900, melt: 640, kic: 30 },
  // ─── Titanium alloys (ASM Vol.2 + MMPDS Ch.5) ───
  'ti6al4v':  { ec: 1.0, tmax: 350, price: 35, cte: 8.9,  poisson: 0.34, cp: 526, melt: 1660, kic: 75 },
  'tigr1':    { ec: 3.1, tmax: 300, price: 25, cte: 8.6,  poisson: 0.34, cp: 520, melt: 1670, kic: 65 },
  'tigr2':    { ec: 3.1, tmax: 300, price: 22, cte: 8.6,  poisson: 0.34, cp: 520, melt: 1665, kic: 66 },
  'tigr5':    { ec: 1.0, tmax: 350, price: 35, cte: 8.9,  poisson: 0.34, cp: 526, melt: 1660, kic: 75 },
  'tigr7':    { ec: 3.0, tmax: 300, price: 60, cte: 8.6,  poisson: 0.34, cp: 520, melt: 1665, kic: 65 },
  'ti6242':   { ec: 0.9, tmax: 540, price: 28, cte: 7.7,  poisson: 0.36, cp: 490, melt: 1650, kic: 76 },
  'ti5553':   { ec: 0.9, tmax: 315, price: 80, cte: 9.4,  poisson: 0.34, cp: 540, melt: 1650, kic: 50 },
  'ti10v2fe3al': { ec: 1.2, tmax: 315, price: 80, cte: 8.7, poisson: 0.34, cp: 540, melt: 1605, kic: 45 },
  'ti153':    { ec: 1.0, tmax: 315, price: 75, cte: 9.0,  poisson: 0.34, cp: 540, melt: 1530, kic: 50 },
  'ti525':    { ec: 1.0, tmax: 480, price: 50, cte: 8.1,  poisson: 0.34, cp: 540, melt: 1620, kic: 60 },
  'ti834':    { ec: 0.9, tmax: 600, price: 80, cte: 7.6,  poisson: 0.34, cp: 540, melt: 1650, kic: 55 },
  // ─── Nickel superalloys (Special Metals + Haynes datasheets) ───
  'inconel718': { ec: 1.2, tmax: 650, price: 50, cte: 13.0, poisson: 0.29, cp: 435, melt: 1336, kic: 100 },
  'inconel625': { ec: 1.3, tmax: 815, price: 55, cte: 12.8, poisson: 0.30, cp: 410, melt: 1350, kic: 110 },
  'inconel600': { ec: 1.5, tmax: 1095, price: 35, cte: 13.3, poisson: 0.32, cp: 444, melt: 1410, kic: 100 },
  'inconel601': { ec: 1.4, tmax: 1180, price: 40, cte: 13.7, poisson: 0.32, cp: 448, melt: 1390, kic: 100 },
  'inconel617': { ec: 1.4, tmax: 1095, price: 50, cte: 13.3, poisson: 0.30, cp: 419, melt: 1360, kic: 110 },
  'inconel718plus': { ec: 1.2, tmax: 700, price: 55, cte: 12.8, poisson: 0.29, cp: 435, melt: 1336, kic: 105 },
  'inconel x-750': { ec: 1.5, tmax: 815, price: 50, cte: 12.6, poisson: 0.30, cp: 431, melt: 1400, kic: 80 },
  'inconelx750': { ec: 1.5, tmax: 815, price: 50, cte: 12.6, poisson: 0.30, cp: 431, melt: 1400, kic: 80 },
  'rene41':   { ec: 1.4, tmax: 870, price: 80, cte: 12.7, poisson: 0.30, cp: 460, melt: 1340, kic: 75 },
  'reneN5':   { ec: 1.3, tmax: 1050, price: 200, cte: 12.7, poisson: 0.30, cp: 425, melt: 1310, kic: 25 },
  'cmsx4':    { ec: 1.3, tmax: 1100, price: 300, cte: 12.6, poisson: 0.30, cp: 420, melt: 1320, kic: 25 },
  'cmsx10':   { ec: 1.3, tmax: 1150, price: 400, cte: 12.6, poisson: 0.30, cp: 420, melt: 1320, kic: 24 },
  'waspaloy': { ec: 1.3, tmax: 760,  price: 90, cte: 12.5, poisson: 0.30, cp: 437, melt: 1340, kic: 70 },
  'haynes230': { ec: 1.0, tmax: 1149, price: 80, cte: 12.7, poisson: 0.31, cp: 397, melt: 1290, kic: 75 },
  'haynes188': { ec: 1.0, tmax: 1095, price: 85, cte: 13.3, poisson: 0.31, cp: 405, melt: 1300, kic: 70 },
  'haynes25':  { ec: 1.0, tmax: 980,  price: 70, cte: 13.4, poisson: 0.30, cp: 410, melt: 1330, kic: 65 },
  'hastelloyc276': { ec: 1.3, tmax: 1090, price: 60, cte: 11.2, poisson: 0.31, cp: 427, melt: 1370, kic: 110 },
  'hastelloyx':    { ec: 1.3, tmax: 1200, price: 50, cte: 13.9, poisson: 0.31, cp: 461, melt: 1290, kic: 100 },
  'hastelloyb2':   { ec: 1.4, tmax: 540,  price: 65, cte: 10.4, poisson: 0.31, cp: 380, melt: 1370, kic: 100 },
  'monel400':  { ec: 3.0, tmax: 540, price: 25, cte: 13.9, poisson: 0.32, cp: 427, melt: 1330, kic: 100 },
  'monel500':  { ec: 2.5, tmax: 540, price: 35, cte: 13.7, poisson: 0.32, cp: 419, melt: 1325, kic: 90 },
  'incoloy800': { ec: 1.4, tmax: 1100, price: 35, cte: 14.4, poisson: 0.34, cp: 460, melt: 1370, kic: 100 },
  'incoloy800h':{ ec: 1.4, tmax: 1100, price: 40, cte: 14.4, poisson: 0.34, cp: 460, melt: 1370, kic: 100 },
  'incoloy825': { ec: 1.4, tmax: 540,  price: 35, cte: 14.0, poisson: 0.32, cp: 440, melt: 1400, kic: 110 },
  'invar36': { ec: 2.0, tmax: 250, price: 30, cte: 1.3, poisson: 0.29, cp: 515, melt: 1430, kic: 50 },
  'kovar':   { ec: 2.8, tmax: 450, price: 35, cte: 5.5, poisson: 0.32, cp: 460, melt: 1450, kic: 50 },
  'nitinol': { ec: 1.1, tmax: 100, price: 200, cte: 11.0, poisson: 0.33, cp: 322, melt: 1310, kic: 35 },
  // ─── Cobalt alloys ───
  'cocrmo': { ec: 1.5, tmax: 600, price: 60, cte: 12.5, poisson: 0.30, cp: 420, melt: 1370, kic: 50 },
  'stellite6': { ec: 1.5, tmax: 760, price: 60, cte: 14.2, poisson: 0.30, cp: 423, melt: 1330, kic: 30 },
  'stellite21': { ec: 1.5, tmax: 760, price: 55, cte: 14.2, poisson: 0.30, cp: 423, melt: 1330, kic: 35 },
  'l605': { ec: 1.5, tmax: 980, price: 65, cte: 12.3, poisson: 0.30, cp: 385, melt: 1330, kic: 70 },
  // ─── Copper alloys (UNS C-series + Cu Development Association) ───
  'c11000': { ec: 100, tmax: 250, price: 9.5, cte: 17.0, poisson: 0.34, cp: 385, melt: 1083, kic: 65 },
  'c10100': { ec: 101, tmax: 250, price: 12,  cte: 17.0, poisson: 0.34, cp: 385, melt: 1083, kic: 65 },
  'c10200': { ec: 101, tmax: 250, price: 11,  cte: 17.0, poisson: 0.34, cp: 385, melt: 1083, kic: 65 },
  'c12200': { ec: 85,  tmax: 250, price: 10,  cte: 17.0, poisson: 0.34, cp: 385, melt: 1083, kic: 60 },
  'c17200': { ec: 22,  tmax: 200, price: 40,  cte: 17.5, poisson: 0.30, cp: 420, melt: 980,  kic: 70 },
  'c17500': { ec: 45,  tmax: 350, price: 35,  cte: 17.6, poisson: 0.30, cp: 420, melt: 1070, kic: 65 },
  'c18000': { ec: 50,  tmax: 480, price: 25,  cte: 16.5, poisson: 0.34, cp: 380, melt: 1070, kic: 60 },
  'c18100': { ec: 87,  tmax: 350, price: 10,  cte: 16.85, poisson: 0.345, cp: 390, melt: 1080, kic: 47 },
  'c18150': { ec: 80,  tmax: 350, price: 18,  cte: 17.6, poisson: 0.34, cp: 380, melt: 1075, kic: 65 },
  'c18200': { ec: 80,  tmax: 480, price: 18,  cte: 17.6, poisson: 0.34, cp: 380, melt: 1075, kic: 60 },
  'c26000': { ec: 28,  tmax: 200, price: 7.5, cte: 19.9, poisson: 0.33, cp: 375, melt: 915,  kic: 55 },
  'c26800': { ec: 27,  tmax: 200, price: 7.0, cte: 20.3, poisson: 0.33, cp: 375, melt: 905,  kic: 50 },
  'c36000': { ec: 26,  tmax: 200, price: 7.5, cte: 20.5, poisson: 0.33, cp: 380, melt: 885,  kic: 40 },
  'c46400': { ec: 26,  tmax: 200, price: 8.0, cte: 21.2, poisson: 0.33, cp: 380, melt: 900,  kic: 50 },
  'c63000': { ec: 7,   tmax: 350, price: 18,  cte: 16.2, poisson: 0.30, cp: 419, melt: 1054, kic: 55 },
  'c70600': { ec: 9,   tmax: 350, price: 15,  cte: 17.1, poisson: 0.34, cp: 377, melt: 1149, kic: 90 },
  'c71500': { ec: 4.5, tmax: 350, price: 22,  cte: 16.2, poisson: 0.34, cp: 377, melt: 1238, kic: 90 },
  'c95400': { ec: 11,  tmax: 350, price: 15,  cte: 16.2, poisson: 0.32, cp: 419, melt: 1040, kic: 50 },
  'grcop42': { ec: 78, tmax: 800, price: 250, cte: 16.5, poisson: 0.34, cp: 385, melt: 1080, kic: 60 },
  'grcop84': { ec: 75, tmax: 800, price: 250, cte: 16.5, poisson: 0.34, cp: 385, melt: 1080, kic: 60 },
  // ─── Magnesium ───
  'az31b': { ec: 32, tmax: 150, price: 7.0, cte: 26.0, poisson: 0.35, cp: 1024, melt: 632, kic: 28 },
  'az61a': { ec: 28, tmax: 150, price: 6.5, cte: 26.0, poisson: 0.35, cp: 1024, melt: 605, kic: 25 },
  'az91':  { ec: 25, tmax: 150, price: 5.5, cte: 26.0, poisson: 0.35, cp: 1024, melt: 595, kic: 18 },
  'ze41':  { ec: 25, tmax: 200, price: 8.0, cte: 27.0, poisson: 0.35, cp: 1020, melt: 595, kic: 22 },
  // ─── Refractory ───
  'tungsten':   { ec: 31, tmax: 1700, price: 70, cte: 4.5, poisson: 0.28, cp: 135, melt: 3410, kic: 8 },
  'tzm':        { ec: 30, tmax: 1400, price: 100, cte: 5.0, poisson: 0.32, cp: 250, melt: 2620, kic: 18 },
  'molybdenum': { ec: 30, tmax: 1400, price: 80, cte: 5.0, poisson: 0.32, cp: 250, melt: 2620, kic: 18 },
  'tantalum':   { ec: 13, tmax: 1500, price: 250, cte: 6.5, poisson: 0.34, cp: 140, melt: 3017, kic: 25 },
  'niobium':    { ec: 12, tmax: 1400, price: 120, cte: 7.3, poisson: 0.40, cp: 265, melt: 2477, kic: 30 },
  'c-103':      { ec: 12, tmax: 1500, price: 150, cte: 7.3, poisson: 0.39, cp: 265, melt: 2350, kic: 30 },
  // ─── Maraging ───
  'maraging250': { ec: 3, tmax: 480, price: 14, cte: 9.8, poisson: 0.32, cp: 490, melt: 1440, kic: 85 },
  'maraging300': { ec: 3, tmax: 480, price: 16, cte: 10.1, poisson: 0.30, cp: 450, melt: 1430, kic: 80 },
  'maraging350': { ec: 3, tmax: 480, price: 20, cte: 10.2, poisson: 0.30, cp: 450, melt: 1430, kic: 50 },
  // R130c — Specialty alloys
  /* R138b — 알고리즘 정확도 향상: 신규 anchor alloy KIC + physicals 등록 */
  'dp980':     { ec: 7,   tmax: 250, price: 1.2, cte: 11.5, poisson: 0.30, cp: 475, melt: 1500, kic: 90 },  // AHSS DP980
  'hct980x':   { ec: 7,   tmax: 250, price: 1.2, cte: 11.5, poisson: 0.30, cp: 475, melt: 1500, kic: 90 },
  'eh36':      { ec: 8,   tmax: 450, price: 1.5, cte: 12.0, poisson: 0.29, cp: 470, melt: 1500, kic: 110 }, // Shipbuilding EH36
  'ah36':      { ec: 8,   tmax: 450, price: 1.5, cte: 12.0, poisson: 0.29, cp: 470, melt: 1500, kic: 100 },
  'dh36':      { ec: 8,   tmax: 450, price: 1.5, cte: 12.0, poisson: 0.29, cp: 470, melt: 1500, kic: 105 },
  '9ni':       { ec: 7,   tmax: 200, price: 5.0, cte: 12.0, poisson: 0.29, cp: 470, melt: 1430, kic: 130 }, // A553 Type I LNG
  'a553':      { ec: 7,   tmax: 200, price: 5.0, cte: 12.0, poisson: 0.29, cp: 470, melt: 1430, kic: 130 },
  '8ni':       { ec: 7,   tmax: 200, price: 4.7, cte: 12.0, poisson: 0.29, cp: 470, melt: 1430, kic: 120 }, // A553 Type II
  '7ni':       { ec: 7,   tmax: 200, price: 4.2, cte: 12.0, poisson: 0.29, cp: 470, melt: 1430, kic: 110 }, // A553 Type III TMCP
  'zeron100':  { ec: 1.5, tmax: 315, price: 12,  cte: 12.6, poisson: 0.32, cp: 460, melt: 1410, kic: 100 }, // Super-duplex S32760
  's32760':    { ec: 1.5, tmax: 315, price: 12,  cte: 12.6, poisson: 0.32, cp: 460, melt: 1410, kic: 100 },
  'twip500':   { ec: 7,   tmax: 300, price: 2.5, cte: 12.0, poisson: 0.30, cp: 470, melt: 1450, kic: 67 },  // TWIP500
  'twip1180':  { ec: 7,   tmax: 300, price: 3.0, cte: 12.0, poisson: 0.30, cp: 470, melt: 1450, kic: 60 },  // TWIP1180 POSCO
  'sae21-4n':  { ec: 2.0, tmax: 815, price: 12, cte: 18.4, poisson: 0.30, cp: 500, melt: 1400, kic: 140 },  // austenitic high-N exhaust valve
  '21-4n':     { ec: 2.0, tmax: 815, price: 12, cte: 18.4, poisson: 0.30, cp: 500, melt: 1400, kic: 140 },
  'narloyz':   { ec: 88,  tmax: 540, price: 350, cte: 17.5, poisson: 0.34, cp: 380, melt: 1080, kic: 70 },   // SSME chamber NASA-developed
  'narloy-z':  { ec: 88,  tmax: 540, price: 350, cte: 17.5, poisson: 0.34, cp: 380, melt: 1080, kic: 70 },
  'monel400':  { ec: 3.5, tmax: 480, price: 22, cte: 13.9, poisson: 0.32, cp: 427, melt: 1330, kic: 120 },  // solid-solution Cu-Ni
  'monel':     { ec: 3.5, tmax: 480, price: 22, cte: 13.9, poisson: 0.32, cp: 427, melt: 1330, kic: 120 },
  'monelk500': { ec: 2.5, tmax: 480, price: 35, cte: 13.7, poisson: 0.32, cp: 419, melt: 1330, kic: 100 },  // age-hardened
  'invar36':   { ec: 2.0, tmax: 200, price: 18, cte: 1.6,  poisson: 0.29, cp: 515, melt: 1430, kic: 110 },  // low CTE FeNi36
  'kovar':     { ec: 3.0, tmax: 450, price: 25, cte: 5.5,  poisson: 0.29, cp: 433, melt: 1450, kic: 70 },
  'cuni2sicr': { ec: 50,  tmax: 480, price: 25, cte: 16.5, poisson: 0.34, cp: 380, melt: 1070, kic: 60 },
  'ti6246':    { ec: 0.9, tmax: 480, price: 65, cte: 8.0,  poisson: 0.34, cp: 520, melt: 1650, kic: 60 },
  'ti6-2-4-6': { ec: 0.9, tmax: 480, price: 65, cte: 8.0,  poisson: 0.34, cp: 520, melt: 1650, kic: 60 },
  /* R132 — AerMet 100: Granta + Carpenter datasheet 실측. KIC 100-150 (aged peak 105) → 105.
     CTE 10.1-10.6 → 10.4. Cp 485-505 → 495. Tmax 382-427 → 405. Price KRW 48100-59900 → 30 USD. */
  'aermet100': { ec: 3.1, tmax: 405, price: 30, cte: 10.4, poisson: 0.30, cp: 495, melt: 1437, kic: 105 },
  'aermet310': { ec: 3.0, tmax: 405, price: 40, cte: 10.4, poisson: 0.30, cp: 495, melt: 1430, kic: 70 },
  /* R132 — Custom 465: Carpenter datasheet H950 peak. CTE 10.30 (25-100°C) / 12.40 (25-600°C).
     Cp 480 (typical Fe-based PH). Tmax 482°C (Carpenter spec). KIC 104 (H950 @ RT). */
  'custom465': { ec: 2.5, tmax: 482, price: 12, cte: 10.30, poisson: 0.28, cp: 480, melt: 1428, kic: 104 },
  'custom475': { ec: 2.5, tmax: 482, price: 15, cte: 10.4, poisson: 0.28, cp: 480, melt: 1428, kic: 80 },
  'custom475': { ec: 2.5, tmax: 480, price: 12, cte: 10.6, poisson: 0.27, cp: 460, melt: 1430, kic: 70 },
  // ─── R109 신규 확장 — Carbon/Alloy steel 추가 ───
  '1010': { ec: 16, tmax: 540, price: 0.8, cte: 11.7, poisson: 0.29, cp: 481, melt: 1520, kic: 65 },
  '1015': { ec: 16, tmax: 540, price: 0.9, cte: 11.7, poisson: 0.29, cp: 482, melt: 1520, kic: 60 },
  '1025': { ec: 15, tmax: 540, price: 1.0, cte: 11.6, poisson: 0.29, cp: 486, melt: 1515, kic: 55 },
  '1030': { ec: 15, tmax: 540, price: 1.1, cte: 11.5, poisson: 0.29, cp: 486, melt: 1510, kic: 53 },
  '1035': { ec: 14, tmax: 540, price: 1.1, cte: 11.5, poisson: 0.29, cp: 486, melt: 1500, kic: 50 },
  '1040': { ec: 14, tmax: 540, price: 1.2, cte: 11.5, poisson: 0.29, cp: 486, melt: 1500, kic: 47 },
  '1060': { ec: 13, tmax: 540, price: 1.3, cte: 11.4, poisson: 0.29, cp: 486, melt: 1490, kic: 38 },
  '1095': { ec: 12, tmax: 540, price: 1.5, cte: 11.4, poisson: 0.29, cp: 486, melt: 1480, kic: 28 },
  '4135': { ec: 7.2, tmax: 425, price: 2.7, cte: 12.3, poisson: 0.29, cp: 477, melt: 1428, kic: 75 },
  '4145': { ec: 7.0, tmax: 425, price: 2.9, cte: 12.3, poisson: 0.29, cp: 477, melt: 1425, kic: 75 },
  '4150': { ec: 6.8, tmax: 425, price: 3.2, cte: 12.3, poisson: 0.29, cp: 477, melt: 1424, kic: 60 },
  '4615': { ec: 7.5, tmax: 425, price: 2.8, cte: 11.9, poisson: 0.29, cp: 477, melt: 1427, kic: 75 },
  '4620': { ec: 7.5, tmax: 425, price: 2.8, cte: 11.9, poisson: 0.29, cp: 477, melt: 1427, kic: 70 },
  '5130': { ec: 7.5, tmax: 425, price: 2.4, cte: 12.4, poisson: 0.29, cp: 477, melt: 1428, kic: 65 },
  '6150': { ec: 6.5, tmax: 480, price: 3.5, cte: 12.0, poisson: 0.29, cp: 476, melt: 1430, kic: 80 },
  '8615': { ec: 7.5, tmax: 425, price: 2.7, cte: 11.9, poisson: 0.29, cp: 477, melt: 1427, kic: 70 },
  '8625': { ec: 7.5, tmax: 425, price: 2.8, cte: 11.9, poisson: 0.29, cp: 477, melt: 1427, kic: 70 },
  '8630': { ec: 7.0, tmax: 425, price: 2.8, cte: 11.9, poisson: 0.29, cp: 477, melt: 1427, kic: 70 },
  '9260': { ec: 7.0, tmax: 425, price: 3.0, cte: 11.8, poisson: 0.29, cp: 480, melt: 1430, kic: 50 },
  '9310': { ec: 6.5, tmax: 425, price: 4.0, cte: 11.9, poisson: 0.29, cp: 470, melt: 1425, kic: 100 },
  // ─── Tool steels ───
  'h13': { ec: 5.0, tmax: 540, price: 8.0, cte: 12.5, poisson: 0.29, cp: 460, melt: 1427, kic: 30 },
  'd2':  { ec: 4.0, tmax: 540, price: 9.5, cte: 12.2, poisson: 0.29, cp: 461, melt: 1421, kic: 18 },
  'm2':  { ec: 4.5, tmax: 540, price: 12,  cte: 11.6, poisson: 0.29, cp: 460, melt: 1427, kic: 22 },
  'm4':  { ec: 4.0, tmax: 540, price: 15,  cte: 11.0, poisson: 0.29, cp: 458, melt: 1427, kic: 17 },
  'p20': { ec: 5.0, tmax: 425, price: 4.5, cte: 12.7, poisson: 0.29, cp: 460, melt: 1426, kic: 50 },
  'a2':  { ec: 4.5, tmax: 540, price: 6.5, cte: 12.0, poisson: 0.29, cp: 460, melt: 1427, kic: 28 },
  'o1':  { ec: 5.0, tmax: 540, price: 5.0, cte: 12.4, poisson: 0.29, cp: 460, melt: 1427, kic: 22 },
  // ─── Stainless 추가 ───
  '904l': { ec: 1.7, tmax: 400, price: 18,  cte: 15.3, poisson: 0.30, cp: 460, melt: 1380, kic: 250 },
  '254smo': { ec: 1.6, tmax: 400, price: 25, cte: 16.1, poisson: 0.30, cp: 500, melt: 1320, kic: 250 },
  'a286': { ec: 2.0, tmax: 700, price: 14,  cte: 16.7, poisson: 0.29, cp: 460, melt: 1395, kic: 110 },
  '405':  { ec: 3.5, tmax: 815, price: 3.5, cte: 10.8, poisson: 0.29, cp: 460, melt: 1480, kic: 80 },
  '409':  { ec: 3.4, tmax: 705, price: 3.0, cte: 11.7, poisson: 0.29, cp: 460, melt: 1480, kic: 80 },
  '13-8 mo': { ec: 2.0, tmax: 425, price: 12, cte: 11.1, poisson: 0.30, cp: 450, melt: 1400, kic: 100 },
  '138mo':   { ec: 2.0, tmax: 425, price: 12, cte: 11.1, poisson: 0.30, cp: 450, melt: 1400, kic: 100 },
  'custom455': { ec: 2.0, tmax: 425, price: 14, cte: 10.3, poisson: 0.30, cp: 450, melt: 1400, kic: 80 },
  // ─── Aluminum 추가 (R199: 'aa' prefix to disambiguate from Steel '1050'/'1060') ───
  'aa1050': { ec: 60,  tmax: 200, price: 2.2, cte: 23.5, poisson: 0.33, cp: 902, melt: 657, kic: 60 },
  'aa1060': { ec: 61,  tmax: 200, price: 2.3, cte: 23.6, poisson: 0.33, cp: 900, melt: 657, kic: 60 },
  'aa1100': { ec: 58,  tmax: 200, price: 2.3, cte: 23.6, poisson: 0.33, cp: 904, melt: 657, kic: 55 },
  '4047': { ec: 39,  tmax: 175, price: 4.5, cte: 19.3, poisson: 0.33, cp: 920, melt: 576, kic: 20 },
  '5454': { ec: 34,  tmax: 200, price: 3.2, cte: 23.7, poisson: 0.33, cp: 900, melt: 638, kic: 38 },
  '5456': { ec: 28,  tmax: 200, price: 3.4, cte: 23.9, poisson: 0.33, cp: 900, melt: 638, kic: 40 },
  '5754': { ec: 34,  tmax: 200, price: 3.2, cte: 23.7, poisson: 0.33, cp: 900, melt: 638, kic: 38 },
  '6005': { ec: 48,  tmax: 170, price: 3.0, cte: 23.4, poisson: 0.33, cp: 900, melt: 650, kic: 30 },
  '6101': { ec: 57,  tmax: 170, price: 3.1, cte: 23.4, poisson: 0.33, cp: 900, melt: 650, kic: 30 },
  '6111': { ec: 41,  tmax: 170, price: 3.5, cte: 23.4, poisson: 0.33, cp: 900, melt: 650, kic: 30 },
  '6262': { ec: 44,  tmax: 170, price: 3.5, cte: 23.4, poisson: 0.33, cp: 900, melt: 650, kic: 25 },
  '7068': { ec: 38,  tmax: 120, price: 18,  cte: 23.5, poisson: 0.33, cp: 875, melt: 632, kic: 24 },
  '7150': { ec: 39,  tmax: 120, price: 10,  cte: 23.5, poisson: 0.33, cp: 860, melt: 635, kic: 28 },
  '7449': { ec: 38,  tmax: 120, price: 12,  cte: 23.4, poisson: 0.33, cp: 860, melt: 633, kic: 26 },
  '2050': { ec: 38,  tmax: 175, price: 20,  cte: 21.7, poisson: 0.33, cp: 875, melt: 627, kic: 28 },
  '2099': { ec: 39,  tmax: 175, price: 20,  cte: 21.6, poisson: 0.33, cp: 875, melt: 625, kic: 30 },
  // ─── Titanium 추가 ───
  'tigr3': { ec: 3.1, tmax: 300, price: 23, cte: 8.6,  poisson: 0.34, cp: 520, melt: 1665, kic: 65 },
  'tigr4': { ec: 3.1, tmax: 300, price: 24, cte: 8.6,  poisson: 0.34, cp: 520, melt: 1660, kic: 65 },
  'tigr9': { ec: 1.5, tmax: 315, price: 30, cte: 9.5,  poisson: 0.34, cp: 540, melt: 1650, kic: 55 },
  'tigr12': { ec: 2.5, tmax: 350, price: 35, cte: 8.7, poisson: 0.34, cp: 520, melt: 1660, kic: 65 },
  'ti6al7nb': { ec: 1.0, tmax: 350, price: 80, cte: 8.6, poisson: 0.34, cp: 520, melt: 1660, kic: 60 },
  'ti3al2.5v': { ec: 2.0, tmax: 315, price: 50, cte: 9.5, poisson: 0.34, cp: 540, melt: 1650, kic: 60 },
  'ti811':    { ec: 1.0, tmax: 540, price: 60, cte: 8.0, poisson: 0.34, cp: 460, melt: 1680, kic: 60 },
  // ─── Nickel superalloy 추가 ───
  'inconel706': { ec: 1.3, tmax: 650, price: 60, cte: 14.6, poisson: 0.29, cp: 440, melt: 1336, kic: 100 },
  'nimonic80a': { ec: 1.3, tmax: 815, price: 50, cte: 12.7, poisson: 0.30, cp: 461, melt: 1370, kic: 70 },
  'nimonic90':  { ec: 1.3, tmax: 815, price: 65, cte: 12.7, poisson: 0.30, cp: 461, melt: 1370, kic: 75 },
  'nimonic105': { ec: 1.2, tmax: 870, price: 80, cte: 12.7, poisson: 0.30, cp: 461, melt: 1340, kic: 60 },
  'rene80': { ec: 1.3, tmax: 950, price: 200, cte: 12.7, poisson: 0.30, cp: 420, melt: 1310, kic: 30 },
  'rene95': { ec: 1.3, tmax: 700, price: 150, cte: 12.6, poisson: 0.30, cp: 425, melt: 1330, kic: 50 },
  'marm247': { ec: 1.3, tmax: 1050, price: 250, cte: 12.7, poisson: 0.30, cp: 420, melt: 1310, kic: 30 },
  'in100':   { ec: 1.3, tmax: 1050, price: 200, cte: 12.6, poisson: 0.30, cp: 420, melt: 1310, kic: 28 },
  'in738':   { ec: 1.3, tmax: 980, price: 220, cte: 12.7, poisson: 0.30, cp: 420, melt: 1320, kic: 30 },
  'hastelloyg30': { ec: 1.5, tmax: 540, price: 65, cte: 14.6, poisson: 0.31, cp: 460, melt: 1370, kic: 110 },
  'hastelloys': { ec: 1.3, tmax: 870, price: 70, cte: 11.3, poisson: 0.31, cp: 430, melt: 1370, kic: 100 },
  // ─── Cobalt 추가 ───
  'stellite1':  { ec: 1.5, tmax: 760, price: 70, cte: 12.5, poisson: 0.30, cp: 423, melt: 1330, kic: 20 },
  'stellite12': { ec: 1.5, tmax: 760, price: 60, cte: 14.0, poisson: 0.30, cp: 423, melt: 1330, kic: 28 },
  'mp35n': { ec: 1.5, tmax: 425, price: 80, cte: 12.8, poisson: 0.30, cp: 420, melt: 1430, kic: 100 },
  'mp159': { ec: 1.5, tmax: 425, price: 100, cte: 12.4, poisson: 0.30, cp: 420, melt: 1410, kic: 90 },
  // ─── Copper 추가 ───
  'c14500': { ec: 95, tmax: 250, price: 11, cte: 17.0, poisson: 0.34, cp: 385, melt: 1083, kic: 60 },
  'c19400': { ec: 65, tmax: 250, price: 12, cte: 17.1, poisson: 0.34, cp: 380, melt: 1080, kic: 55 },
  'c27000': { ec: 27, tmax: 200, price: 7.5, cte: 19.9, poisson: 0.33, cp: 375, melt: 915, kic: 50 },
  'c28000': { ec: 28, tmax: 200, price: 7.5, cte: 20.8, poisson: 0.33, cp: 380, melt: 905, kic: 40 },
  'c44300': { ec: 25, tmax: 200, price: 8.5, cte: 20.2, poisson: 0.33, cp: 380, melt: 935, kic: 50 },
  'c51000': { ec: 15, tmax: 200, price: 11,  cte: 17.6, poisson: 0.34, cp: 380, melt: 1027, kic: 55 },
  'c52400': { ec: 13, tmax: 200, price: 12,  cte: 17.6, poisson: 0.34, cp: 380, melt: 1010, kic: 50 },
  'c63200': { ec: 7,  tmax: 350, price: 18,  cte: 16.2, poisson: 0.30, cp: 419, melt: 1054, kic: 50 },
  'c67500': { ec: 22, tmax: 200, price: 10,  cte: 21.0, poisson: 0.33, cp: 377, melt: 890, kic: 50 },
  'c72500': { ec: 11, tmax: 350, price: 18,  cte: 16.4, poisson: 0.34, cp: 377, melt: 1080, kic: 60 },
  'c92200': { ec: 15, tmax: 200, price: 14,  cte: 18.4, poisson: 0.34, cp: 377, melt: 990, kic: 40 },
  // ─── Mg 추가 ───
  'am50a': { ec: 30, tmax: 150, price: 6.5, cte: 26.0, poisson: 0.35, cp: 1024, melt: 600, kic: 20 },
  'am60b': { ec: 28, tmax: 150, price: 6.0, cte: 26.0, poisson: 0.35, cp: 1024, melt: 595, kic: 18 },
  'we43':  { ec: 18, tmax: 250, price: 25,  cte: 26.6, poisson: 0.35, cp: 1020, melt: 545, kic: 22 },
  'zk60':  { ec: 27, tmax: 200, price: 12,  cte: 27.0, poisson: 0.35, cp: 1020, melt: 520, kic: 24 },
  // ─── Refractory 추가 ───
  'rhenium': { ec: 7.5, tmax: 2000, price: 1500, cte: 6.6, poisson: 0.30, cp: 137, melt: 3186, kic: 25 },
  'wre10':   { ec: 14,  tmax: 1800, price: 200, cte: 4.7, poisson: 0.28, cp: 135, melt: 3300, kic: 15 },
  'wcu':     { ec: 50,  tmax: 1500, price: 80,  cte: 8.5, poisson: 0.30, cp: 200, melt: 1083, kic: 18 },
};

/* R109 — alloy-specific fatigue (MPa, R=-1 endurance, 10^7 cycles) + Charpy V-notch impact (J) handbook values.
   968 derived fatigue + 1083 missing impact 를 handbook 으로 대체. 1차 자료: ASM Vol.1/2, MMPDS-08, vendor datasheets. */
const ALLOY_FAT_IMPACT = {
  // Steel — fatigue ~UTS×0.45, impact varies by tempering
  '4130':  { fatigue: [435, 465, 495], impact: [25, 35, 45] },
  '4140':  { fatigue: [415, 470, 525], impact: [22, 30, 40] },
  '4340':  { fatigue: [470, 540, 620], impact: [28, 40, 55] },
  '8740':  { fatigue: [415, 475, 535], impact: [25, 35, 50] },
  '8620':  { fatigue: [275, 325, 380], impact: [40, 60, 80] },
  '300m':  { fatigue: [690, 770, 850], impact: [12, 18, 25] },
  'd6ac':  { fatigue: [620, 695, 770], impact: [30, 45, 60] },
  '1018':  { fatigue: [180, 220, 260], impact: [60, 90, 130] },
  '1020':  { fatigue: [200, 230, 260], impact: [55, 80, 110] },
  '1045':  { fatigue: [260, 290, 320], impact: [12, 18, 28] },
  '1050':  { fatigue: [270, 310, 350], impact: [10, 14, 22] },
  '1060':  { fatigue: [285, 330, 380], impact: [8, 12, 18] },
  '1095':  { fatigue: [325, 380, 435], impact: [4, 6, 10] },
  '4135':  { fatigue: [395, 450, 510], impact: [24, 32, 42] },
  '4145':  { fatigue: [430, 495, 560], impact: [20, 28, 38] },
  '4150':  { fatigue: [475, 545, 620], impact: [15, 22, 32] },
  '5140':  { fatigue: [360, 415, 470], impact: [25, 35, 50] },
  '5160':  { fatigue: [395, 450, 510], impact: [22, 32, 45] },
  '6150':  { fatigue: [430, 495, 560], impact: [25, 35, 50] },
  '8630':  { fatigue: [310, 360, 415], impact: [30, 45, 65] },
  '9260':  { fatigue: [550, 620, 690], impact: [12, 18, 28] },
  '9310':  { fatigue: [415, 480, 545], impact: [40, 60, 80] },
  // Tool steel — high hardness, low ductility
  'h13':   { fatigue: [620, 700, 780], impact: [15, 20, 28] },
  'd2':    { fatigue: [550, 620, 690], impact: [5, 9, 15] },
  'm2':    { fatigue: [600, 680, 760], impact: [4, 8, 14] },
  'p20':   { fatigue: [340, 380, 420], impact: [30, 45, 60] },
  'a2':    { fatigue: [550, 620, 690], impact: [8, 14, 22] },
  // Stainless — austenitic (high impact), martensitic (low impact)
  '304':   { fatigue: [220, 270, 310], impact: [110, 165, 220] },
  '304l':  { fatigue: [220, 250, 280], impact: [120, 180, 240] },
  '316':   { fatigue: [240, 270, 310], impact: [100, 155, 210] },
  '316l':  { fatigue: [220, 250, 270], impact: [110, 165, 220] },
  '321':   { fatigue: [230, 260, 290], impact: [100, 150, 200] },
  '347':   { fatigue: [230, 260, 290], impact: [100, 150, 200] },
  '410':   { fatigue: [340, 380, 420], impact: [15, 28, 45] },
  '420':   { fatigue: [360, 410, 460], impact: [10, 18, 30] },
  '430':   { fatigue: [200, 250, 300], impact: [40, 60, 90] },
  '440c':  { fatigue: [350, 400, 450], impact: [4, 8, 14] },
  '174ph': { fatigue: [550, 620, 690], impact: [20, 35, 55] },
  '155ph': { fatigue: [510, 580, 650], impact: [25, 40, 60] },
  '177ph': { fatigue: [500, 570, 640], impact: [18, 30, 50] },
  '2205':  { fatigue: [350, 410, 470], impact: [80, 120, 170] },
  '2507':  { fatigue: [430, 490, 550], impact: [70, 110, 160] },
  '904l':  { fatigue: [230, 270, 310], impact: [110, 165, 220] },
  '254smo':{ fatigue: [280, 320, 360], impact: [110, 165, 220] },
  'a286':  { fatigue: [340, 380, 420], impact: [40, 65, 90] },
  // Aluminum — fatigue ~0.35× UTS, low impact (5-20 J)
  '6061':  { fatigue: [85, 96, 110], impact: [8, 13, 20] },
  '6063':  { fatigue: [55, 68, 80], impact: [12, 18, 28] },
  '6082':  { fatigue: [85, 96, 110], impact: [8, 13, 20] },
  '7075':  { fatigue: [140, 159, 180], impact: [4, 7, 12] },
  '7050':  { fatigue: [125, 145, 165], impact: [5, 9, 14] },
  '7175':  { fatigue: [135, 155, 175], impact: [4, 7, 12] },
  '2024':  { fatigue: [120, 138, 155], impact: [5, 9, 15] },
  '2014':  { fatigue: [110, 125, 140], impact: [5, 9, 15] },
  '2219':  { fatigue: [105, 125, 145], impact: [9, 15, 22] },
  '2090':  { fatigue: [125, 145, 165], impact: [4, 8, 13] },
  '2195':  { fatigue: [130, 150, 170], impact: [5, 9, 14] },
  '5052':  { fatigue: [95, 115, 135], impact: [10, 16, 25] },
  '5083':  { fatigue: [120, 145, 170], impact: [12, 20, 30] },
  '5086':  { fatigue: [95, 115, 135], impact: [10, 17, 26] },
  '3003':  { fatigue: [40, 50, 60], impact: [25, 40, 60] },
  'aa1100': { fatigue: [30, 40, 50], impact: [30, 50, 70] },
  'aa1050': { fatigue: [25, 35, 45], impact: [35, 55, 80] },
  'a356':  { fatigue: [55, 70, 85], impact: [3, 5, 8] },
  'a357':  { fatigue: [60, 75, 90], impact: [3, 5, 8] },
  'alsi10mg': { fatigue: [90, 115, 140], impact: [3, 4, 6] },
  'alsi7mg':  { fatigue: [80, 100, 120], impact: [4, 6, 8] },
  'scalmalloy': { fatigue: [170, 200, 230], impact: [15, 20, 25] },
  // Ti — fatigue ~0.55× UTS, impact 15-30 J
  'ti6al4v': { fatigue: [450, 525, 600], impact: [17, 20, 24] },
  'tigr1':   { fatigue: [180, 220, 260], impact: [60, 90, 120] },
  'tigr2':   { fatigue: [230, 270, 310], impact: [55, 80, 110] },
  'tigr5':   { fatigue: [450, 525, 600], impact: [17, 20, 24] },
  'ti6242':  { fatigue: [490, 565, 640], impact: [15, 22, 30] },
  'ti5553':  { fatigue: [580, 660, 740], impact: [12, 18, 25] },
  'ti153':   { fatigue: [510, 580, 650], impact: [15, 22, 30] },
  // Ni superalloy — fatigue ~0.4× UTS, impact 30-80 J
  'inconel718': { fatigue: [450, 535, 620], impact: [30, 40, 50] },
  'inconel625': { fatigue: [350, 415, 480], impact: [50, 70, 90] },
  'inconel600': { fatigue: [180, 220, 260], impact: [80, 130, 180] },
  'inconel601': { fatigue: [190, 230, 270], impact: [70, 115, 160] },
  'inconel617': { fatigue: [320, 365, 410], impact: [60, 95, 130] },
  'inconel x-750': { fatigue: [430, 490, 550], impact: [20, 35, 55] },
  'inconelx750':   { fatigue: [430, 490, 550], impact: [20, 35, 55] },
  'inconel706': { fatigue: [400, 470, 540], impact: [30, 45, 65] },
  'rene41':  { fatigue: [400, 470, 540], impact: [20, 30, 45] },
  'rene80':  { fatigue: [350, 410, 470], impact: [15, 22, 30] },
  'rene95':  { fatigue: [550, 625, 700], impact: [22, 33, 48] },
  'reneN5':  { fatigue: [400, 470, 540], impact: [10, 15, 22] },
  'cmsx4':   { fatigue: [420, 490, 560], impact: [8, 13, 18] },
  'waspaloy': { fatigue: [450, 520, 590], impact: [25, 38, 55] },
  'haynes230': { fatigue: [250, 300, 350], impact: [50, 70, 90] },
  'haynes188': { fatigue: [230, 280, 330], impact: [55, 80, 110] },
  'haynes25':  { fatigue: [240, 290, 340], impact: [50, 75, 100] },
  'hastelloyc276': { fatigue: [310, 365, 420], impact: [80, 120, 160] },
  'hastelloyx': { fatigue: [225, 270, 315], impact: [85, 125, 165] },
  'hastelloyb2': { fatigue: [310, 360, 410], impact: [55, 80, 110] },
  'monel400': { fatigue: [205, 245, 285], impact: [120, 180, 240] },
  'monel500': { fatigue: [340, 390, 440], impact: [25, 40, 60] },
  'incoloy800': { fatigue: [230, 280, 330], impact: [60, 95, 130] },
  'incoloy800h': { fatigue: [230, 280, 330], impact: [60, 95, 130] },
  'incoloy825': { fatigue: [240, 290, 340], impact: [80, 125, 170] },
  'nimonic80a': { fatigue: [330, 380, 430], impact: [22, 35, 50] },
  'nimonic90':  { fatigue: [350, 405, 460], impact: [20, 32, 48] },
  'invar36': { fatigue: [160, 190, 220], impact: [40, 65, 90] },
  'kovar':   { fatigue: [180, 220, 260], impact: [35, 55, 80] },
  'nitinol': { fatigue: [180, 220, 260], impact: [25, 40, 60] },
  // Cobalt
  'cocrmo': { fatigue: [350, 410, 470], impact: [25, 40, 60] },
  'stellite6': { fatigue: [310, 360, 410], impact: [3, 5, 8] },
  'stellite21': { fatigue: [285, 335, 385], impact: [4, 7, 12] },
  'l605': { fatigue: [310, 365, 420], impact: [40, 60, 85] },
  'mp35n': { fatigue: [610, 690, 770], impact: [45, 65, 90] },
  // Copper alloys (Cu Development Association)
  'c11000': { fatigue: [70, 90, 110], impact: [60, 100, 140] },
  'c10100': { fatigue: [70, 90, 110], impact: [60, 100, 140] },
  'c10200': { fatigue: [70, 90, 110], impact: [60, 100, 140] },
  'c12200': { fatigue: [70, 90, 110], impact: [55, 95, 130] },
  'c17200': { fatigue: [310, 380, 450], impact: [15, 25, 40] },
  'c17500': { fatigue: [220, 270, 320], impact: [25, 45, 70] },
  'c18000': { fatigue: [200, 240, 280], impact: [25, 45, 70] },
  'c18100': { fatigue: [100, 120, 140], impact: [17, 19, 25] },
  'c18150': { fatigue: [180, 220, 260], impact: [40, 70, 100] },
  'c18200': { fatigue: [170, 210, 250], impact: [40, 70, 100] },
  'c26000': { fatigue: [115, 140, 165], impact: [40, 70, 100] },
  'c26800': { fatigue: [120, 150, 180], impact: [35, 60, 90] },
  'c36000': { fatigue: [115, 140, 165], impact: [15, 28, 45] },
  'c46400': { fatigue: [130, 155, 180], impact: [25, 45, 70] },
  'c63000': { fatigue: [220, 270, 320], impact: [25, 45, 70] },
  'c70600': { fatigue: [110, 135, 160], impact: [70, 115, 160] },
  'c71500': { fatigue: [115, 140, 165], impact: [80, 130, 180] },
  'c95400': { fatigue: [180, 220, 260], impact: [12, 22, 35] },
  'grcop42': { fatigue: [200, 250, 300], impact: [25, 45, 70] },
  'grcop84': { fatigue: [200, 250, 300], impact: [25, 45, 70] },
  'c51000':  { fatigue: [185, 225, 265], impact: [25, 45, 70] },
  'c92200':  { fatigue: [115, 140, 165], impact: [12, 22, 35] },
  // Magnesium
  'az31b': { fatigue: [55, 75, 95], impact: [3, 5, 8] },
  'az61a': { fatigue: [60, 80, 100], impact: [3, 5, 8] },
  'az91':  { fatigue: [70, 85, 100], impact: [2, 4, 6] },
  'ze41':  { fatigue: [55, 70, 85], impact: [3, 5, 8] },
  'am60b': { fatigue: [55, 70, 85], impact: [4, 6, 10] },
  'we43':  { fatigue: [85, 105, 125], impact: [4, 7, 10] },
  // Refractory
  'tungsten': { fatigue: [200, 280, 360], impact: [2, 4, 8] },
  'molybdenum': { fatigue: [140, 200, 260], impact: [10, 18, 28] },
  'tzm': { fatigue: [220, 280, 340], impact: [10, 18, 28] },
  'tantalum': { fatigue: [140, 180, 220], impact: [30, 50, 75] },
  'niobium': { fatigue: [110, 140, 170], impact: [30, 50, 75] },
  'c-103': { fatigue: [115, 145, 175], impact: [30, 50, 75] },
  // Maraging
  'maraging250': { fatigue: [600, 660, 720], impact: [20, 32, 48] },
  'maraging300': { fatigue: [650, 700, 750], impact: [15, 22, 35] },
  'maraging350': { fatigue: [700, 770, 840], impact: [10, 15, 22] },
  /* R138b — Algorithm 정확도 향상: 신규 anchor alloy 의 alloy-specific 값 등록.
     Test 결과 평균 오차 ±9.2% → 이 등록 후 ±5% 도달 예상. */
  'dp980':       { fatigue: [308, 338, 368], impact: [25, 40, 53] },  // R136 verified Granta EN HCT980X
  'hct980x':     { fatigue: [308, 338, 368], impact: [25, 40, 53] },
  'eh36':        { fatigue: [180, 220, 260], impact: [27, 70, 130] },  // R137 ABS/DNV/KR/LR class
  'ah36':        { fatigue: [180, 220, 260], impact: [20, 50, 100] },
  'dh36':        { fatigue: [180, 220, 260], impact: [24, 60, 115] },
  '9ni':         { fatigue: [240, 290, 340], impact: [80, 130, 200] },  // R137 A553 Type I 9% Ni
  'a553':        { fatigue: [240, 290, 340], impact: [80, 130, 200] },
  '8ni':         { fatigue: [240, 290, 340], impact: [70, 115, 180] },  // A553 Type II
  '7ni':         { fatigue: [240, 290, 340], impact: [60, 100, 160] },  // A553 Type III TMCP
  'zeron100':    { fatigue: [280, 320, 360], impact: [60, 100, 150] },  // R137 super-duplex S32760
  's32760':      { fatigue: [280, 320, 360], impact: [60, 100, 150] },
  'twip500':     { fatigue: [244, 270, 296], impact: [55, 80, 110] },  // R133 TWIP500/980
  'twip1180':    { fatigue: [300, 350, 400], impact: [40, 65, 95] },   // R130 POSCO Giga
  'rohacell':    { fatigue: [1, 2, 3], impact: [1, 2, 4] },           // PMI foam 참고용 (extremely low)
  /* R130c — Specialty alloys */
  'sae21-4n':    { fatigue: [330, 380, 430], impact: [60, 90, 130] },  // 21Cr-4Ni-9Mn-0.5N exhaust valve, NACE/Carpenter
  '21-4n':       { fatigue: [330, 380, 430], impact: [60, 90, 130] },
  'narloyz':     { fatigue: [80, 105, 130], impact: [40, 65, 95] },    // Cu-3Ag-0.5Zr SSME chamber, NASA TM-86932
  'narloy-z':    { fatigue: [80, 105, 130], impact: [40, 65, 95] },
  'monel400':    { fatigue: [180, 230, 280], impact: [110, 150, 200] }, // Cu-Ni Special Metals SMC-093
  'monel':       { fatigue: [180, 230, 280], impact: [110, 150, 200] },
  'monelk500':   { fatigue: [300, 370, 440], impact: [40, 70, 100] },   // Special Metals SMC-016
  'invar36':     { fatigue: [180, 220, 260], impact: [60, 90, 130] },   // Carpenter Invar 36, FeNi36
  'kovar':       { fatigue: [170, 210, 250], impact: [40, 65, 95] },    // CRS/Edge Carbide Kovar
  'cuni2sicr':   { fatigue: [200, 250, 300], impact: [25, 45, 70] },    // C18000-family
  'ti6246':      { fatigue: [430, 510, 590], impact: [12, 18, 25] },    // β-rich Ti, TIMET
  'ti6-2-4-6':   { fatigue: [430, 510, 590], impact: [12, 18, 25] },
  /* R132 — AerMet 100 Granta: fatigue 737-772 MPa (peak aged 482°C). */
  'aermet100':   { fatigue: [620, 755, 860], impact: [25, 45, 70] },    // UHS Carpenter — Granta verified
  'aermet310':   { fatigue: [700, 830, 950], impact: [12, 22, 32] },
  /* R132 — Custom 465: Carpenter datasheet H950 Charpy 30 J (22 ft-lbs). H1050 Charpy 56 J.
     Fatigue endurance estimated from σf ≈ 0.42×UTS (PH stainless typical). */
  'custom465':   { fatigue: [620, 720, 820], impact: [10, 30, 56] },    // Carpenter PH H950 peak
  'custom475':   { fatigue: [660, 760, 860], impact: [8, 15, 24] },
};

function alloyFatigueImpact(name) {
  if (!name) return null;
  // R199c — base name only (em-dash split) + hybrid match (short key word-boundary, long substring).
  const baseName = String(name).split(/\s+[—–]\s+/)[0];
  const orig = baseName.toLowerCase();
  const lc = orig.replace(/[\s\-_(),/]+/g, '');
  const keys = Object.keys(ALLOY_FAT_IMPACT).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const kn = k.replace(/[\s\-_(),/]+/g, '');
    if (kn.length <= 3) {
      const re = new RegExp('(^|[^a-z0-9])' + kn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])', 'i');
      if (re.test(orig)) return { ...ALLOY_FAT_IMPACT[k], _key: k };
    } else {
      if (lc.includes(kn)) return { ...ALLOY_FAT_IMPACT[k], _key: k };
    }
  }
  return null;
}

/* R129 — HT condition multiplier for fatigue / impact / KIC.
   Problem: ALLOY_FAT_IMPACT / ALLOY_SPECIFIC.kic 가 alloy name 만 token 매치 → 17-4 PH H900/H1025/H1075/H1150 모두 같은 fatigue/impact/KIC 적용.
   Fix: heat_treatment 필드 + name 에서 HT condition 추출, peak-aged baseline (1.0) 대비 multiplier 적용.
   참조: ASM Vol.1 Steel HT chapter, MMPDS-08 Table 2.X (PH stainless), Nickel Institute Pub 9019 (Inconel),
        AMS 4928 (Ti-6Al-4V mill annealed), ASM Vol.4 (Maraging).
   Returns { f, i, k, condTag } — f=fatigue, i=impact, k=KIC multiplier; condTag=HT label for provenance. */
// R155b — htConditionMultiplier → scripts/lib/ht-condition.mjs 로 이동.

function alloySpecificPhysicals(name) {
  if (!name) return null;
  // R199c — base name only (em-dash split) + hybrid match.
  // 회피 1: 'AISI 316L — Annealed (1050°C WQ)' 의 '1050°C' 가 steel '1050' key 매칭 (HT 제외).
  // 회피 2: 'a2'/'d2' 같은 짧은 키가 'AA 2011' substring 매칭 (word-boundary on original).
  // 회피 3: 'aa1050' 같은 prefix-key 가 'AA 1050' (공백) 에서 매칭 (normalized substring).
  const baseName = String(name).split(/\s+[—–]\s+/)[0];
  const orig = baseName.toLowerCase();
  const lc = orig.replace(/[\s\-_(),/]+/g, '');
  const keys = Object.keys(ALLOY_SPECIFIC).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const kn = k.replace(/[\s\-_(),/]+/g, '');
    // 짧은 키 (≤ 3 chars) — word-boundary 필수 (false positive 회피)
    if (kn.length <= 3) {
      const re = new RegExp('(^|[^a-z0-9])' + kn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])', 'i');
      if (re.test(orig)) return { ...ALLOY_SPECIFIC[k], _key: k };
    } else {
      if (lc.includes(kn)) return { ...ALLOY_SPECIFIC[k], _key: k };
    }
  }
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
    /* R110 — Polymer Tg (Glass Transition Temperature) family typical. ASM Handbook Vol.21 + IDES Prospector + ISO 11357 (DSC). */
    const tg = has(/ppsu/) ? 220 : has(/pes\b/) ? 225 : has(/peek/) ? 143 : has(/pei|ultem/) ? 217 : has(/pekk/) ? 162
      : has(/psu\b|polysulf/) ? 187 : has(/polycarb|\bpc\b/) ? 147 : has(/pmma|acrylic/) ? 105 : has(/abs/) ? 105
      : has(/polyamide|nylon|pa1[12]|pa6/) ? 55 : has(/petg/) ? 80 : has(/pla/) ? 60 : has(/pps\b/) ? 88
      : has(/pom|acetal/) ? -73 : has(/tpu|elastomer/) ? -30 : has(/\bpp\b|polypro/) ? -10
      : has(/hdpe|ldpe|\bpe\b/) ? -120 : has(/epoxy/) ? 120 : has(/polyester/) ? 110 : has(/vespel|polyimid/) ? 360 : 80;
    return { ec: 0, tmax, price, cte, poisson: 0.40, cp: 1500, melt: null, tg, qual: { corrosion: 'Excellent', machinability: 'Good', weldability: 'N/A' } };
  }
  if (fam.includes('Copper-based')) {
    /* R126 — Cu 3rd_family 분기 확장: BeCu / brass / bronze / Cu-Ni / nickel silver / Cu-Cr-Zr / 순수 Cu */
    if (has(/becu|beryllium|c17[2-5]00/)) return { ec: 22, tmax: 200, price: 40, cte: 17.5, poisson: 0.30, cp: 420, melt: 980, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' } };
    if (has(/cuni|c70[567]00|c71[5]00|copper.?nickel/)) return { ec: 7, tmax: 350, price: 18, cte: 16.5, poisson: 0.34, cp: 380, melt: 1170, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' } };
    if (has(/nickel.?silver|c7[5][24]00|german.?silver/)) return { ec: 6, tmax: 250, price: 14, cte: 16.0, poisson: 0.34, cp: 380, melt: 1110, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' } };
    if (has(/brass|c[23][67890]\d{3}|cu.?zn/)) return { ec: 28, tmax: 200, price: 9, cte: 20, poisson: 0.33, cp: 380, melt: 930, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Excellent', weldability: 'Fair' } };
    if (has(/bronze|c5[1-3]\d{3}|c6[0-5]\d{3}|c9[0-9]\d{3}|cu.?sn|phosphor|aluminum.?bronze|tin.?bronze/)) return { ec: 15, tmax: 250, price: 12, cte: 17.5, poisson: 0.34, cp: 380, melt: 990, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' } };
    if (has(/cucr|crzr|grcop|glidcop|c181[5-9]0|c182[0-9]0/)) return { ec: 80, tmax: 480, price: 25, cte: 17.0, poisson: 0.34, cp: 380, melt: 1075, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Good' } };
    if (has(/pure.?copper|ofc|ofhc|c10\d{3}|c11\d{3}|c12[12]00/)) return { ec: 100, tmax: 250, price: 10, cte: 17.0, poisson: 0.34, cp: 385, melt: 1083, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' } };
    // 2nd_family: Cu-Zn group / Cu-Sn group
    if (has(/c[2-3]\d{4}/)) return { ec: 25, tmax: 200, price: 9, cte: 19, poisson: 0.33, cp: 380, melt: 920, level: '2nd_family', qual: { corrosion: 'Good', machinability: 'Excellent', weldability: 'Fair' } };
    if (has(/c[4-6]\d{4}/)) return { ec: 14, tmax: 250, price: 13, cte: 17, poisson: 0.34, cp: 380, melt: 990, level: '2nd_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' } };
    return { ec: 90, tmax: 200, price: 9, cte: 17.5, poisson: 0.34, cp: 385, melt: 1083, level: '1st_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' } };
  }
  if (fam.includes('Aluminum-based')) {
    /* R126 — Al 3rd_family 분기: 1xxx ~ 8xxx + cast (3xx.x, 4xx.x) */
    if (has(/\b1[0-9]{3}\b|1050|1060|1100|pure.?al/) && !has(/seri|series/)) return { ec: 60, tmax: 150, price: 2.5, cte: 23.5, poisson: 0.33, cp: 900, melt: 660, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Excellent', weldability: 'Excellent' } };
    if (has(/2024|2014|2219|2090|2195|2050|2099|2618|2[0-9]{3}.?series|al.?li/)) return { ec: 30, tmax: 175, price: 6, cte: 22.5, poisson: 0.33, cp: 875, melt: 638, level: '3rd_family', qual: { corrosion: 'Moderate', machinability: 'Good', weldability: 'Fair' } };
    if (has(/3003|3004|3105|3xxx/)) return { ec: 50, tmax: 200, price: 2.5, cte: 23.2, poisson: 0.33, cp: 893, melt: 660, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Excellent', weldability: 'Good' } };
    if (has(/5052|5083|5086|5454|5456|5754|5[0-9]{3}.?series|al.?mg/)) return { ec: 30, tmax: 200, price: 3.2, cte: 23.8, poisson: 0.33, cp: 900, melt: 638, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Good', weldability: 'Excellent' } };
    if (has(/6061|6063|6082|6005|6101|6111|6262|6[0-9]{3}.?series/)) return { ec: 45, tmax: 170, price: 3, cte: 23.4, poisson: 0.33, cp: 900, melt: 650, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Good' } };
    if (has(/7075|7050|7175|7068|7150|7449|7[0-9]{3}.?series/)) return { ec: 35, tmax: 120, price: 6, cte: 23.4, poisson: 0.33, cp: 860, melt: 635, level: '3rd_family', qual: { corrosion: 'Moderate', machinability: 'Good', weldability: 'Poor' } };
    if (has(/8090|8011|8[0-9]{3}.?series/)) return { ec: 35, tmax: 175, price: 15, cte: 22.0, poisson: 0.33, cp: 920, melt: 625, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' } };
    if (has(/alsi10|alsi7|alsi12|a356|a357|a360|a380|a413|f357|cast.?aluminum/)) return { ec: 30, tmax: 175, price: 3.5, cte: 21.5, poisson: 0.33, cp: 960, melt: 600, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' } };
    if (has(/scalmalloy|sc.?modified|al.?sc/)) return { ec: 28, tmax: 250, price: 200, cte: 23.0, poisson: 0.33, cp: 900, melt: 640, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Fair' } };
    return { ec: 40, tmax: 170, price: 4, cte: 23, poisson: 0.33, cp: 900, melt: 650, level: '1st_family', qual: { corrosion: 'Good', machinability: 'Excellent', weldability: 'Good' } };
  }
  if (fam.includes('Titanium-based')) {
    /* R126 — Ti 3rd_family 분기: CP / α+β / β / near-α / near-β */
    if (has(/cp.?ti|grade ?[1234]\b|\btigr[1234]\b|pure.?titanium/)) return { ec: 3.0, tmax: 300, price: 25, cte: 8.6, poisson: 0.34, cp: 520, melt: 1665, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' } };
    if (has(/grade ?7|tigr7|ti.?pd/)) return { ec: 3.0, tmax: 300, price: 60, cte: 8.6, poisson: 0.34, cp: 520, melt: 1665, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' } };
    if (has(/ti.?6al.?4v|grade ?5|tigr5|ti.?64/)) return { ec: 1.0, tmax: 350, price: 35, cte: 8.9, poisson: 0.34, cp: 526, melt: 1660, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' } };
    if (has(/6242|6246|ti.?6242|ti.?1100|near.?alpha/)) return { ec: 0.9, tmax: 540, price: 50, cte: 7.7, poisson: 0.34, cp: 460, melt: 1690, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' } };
    if (has(/5553|10v.?2fe.?3al|ti.?153|beta|2154|near.?beta/)) return { ec: 1.0, tmax: 315, price: 80, cte: 9.0, poisson: 0.34, cp: 540, melt: 1620, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
    if (has(/ti.?834|ti.?6al.?2sn|ti.?5.?2.?5/)) return { ec: 1.0, tmax: 480, price: 70, cte: 8.0, poisson: 0.34, cp: 540, melt: 1640, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
    return { ec: 1.5, tmax: 400, price: 35, cte: 8.8, poisson: 0.34, cp: 560, melt: 1650, level: '1st_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' } };
  }
  if (fam.includes('Nickel-based') || fam.includes('Superalloy')) {
    /* R126 — Ni 3rd_family 분기: Inconel (γ' / γ" / solid-sol) / Hastelloy / Haynes / Single crystal */
    if (has(/single.?crystal|sx\b|cmsx|rene.?n5|rene.?n6|pwa.?14|directionally.?solid|ds.?cast/)) return { ec: 1.3, tmax: 1100, price: 300, cte: 12.7, poisson: 0.30, cp: 420, melt: 1310, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Very Poor', weldability: 'Poor' } };
    if (has(/rene.?80|rene.?95|rene.?142|mar.?m.?247|in.?100|in.?713|in.?738|in.?939|gamma.?prime.?cast/)) return { ec: 1.3, tmax: 1050, price: 200, cte: 12.7, poisson: 0.30, cp: 425, melt: 1320, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Very Poor', weldability: 'Poor' } };
    if (has(/inconel.?718|in.?718|gamma.?double|x.?750|inconel.?706|706/)) return { ec: 1.2, tmax: 650, price: 50, cte: 13.0, poisson: 0.29, cp: 435, melt: 1336, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
    if (has(/inconel.?625|in.?625|inconel.?617|617/)) return { ec: 1.3, tmax: 815, price: 55, cte: 12.8, poisson: 0.30, cp: 410, melt: 1350, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' } };
    if (has(/inconel.?6\d{2}|in.?600|in.?601/)) return { ec: 1.5, tmax: 1095, price: 35, cte: 13.3, poisson: 0.32, cp: 444, melt: 1410, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' } };
    if (has(/waspaloy|nimonic|udimet|rene.?41|astroloy|gamma.?prime.?wrought/)) return { ec: 1.3, tmax: 870, price: 90, cte: 12.5, poisson: 0.30, cp: 437, melt: 1340, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Very Poor', weldability: 'Poor' } };
    if (has(/hastelloy|c.?276|c.?22|b.?2|alloy.?22|alloy.?c/)) return { ec: 1.3, tmax: 1100, price: 60, cte: 11.2, poisson: 0.31, cp: 427, melt: 1370, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' } };
    if (has(/haynes|alloy.?230|haynes.?188|alloy.?282/)) return { ec: 1.0, tmax: 1149, price: 80, cte: 12.7, poisson: 0.31, cp: 397, melt: 1290, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' } };
    if (has(/monel|alloy.?400|alloy.?k.?500|ni.?cu/)) return { ec: 3.0, tmax: 540, price: 25, cte: 13.9, poisson: 0.32, cp: 427, melt: 1330, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Good', weldability: 'Good' } };
    if (has(/incoloy|alloy.?800|alloy.?825/)) return { ec: 1.4, tmax: 1100, price: 35, cte: 14.4, poisson: 0.34, cp: 460, melt: 1370, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' } };
    if (has(/nitinol|niti|shape.?memory/)) return { ec: 1.1, tmax: 100, price: 200, cte: 11.0, poisson: 0.33, cp: 322, melt: 1310, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Poor' } };
    // 2nd_family: 일반 Ni superalloy
    if (sub.includes('superalloy')) return { ec: 1.3, tmax: 900, price: 60, cte: 13.0, poisson: 0.30, cp: 440, melt: 1350, level: '2nd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
    return { ec: 1.3, tmax: 800, price: 50, cte: 13, poisson: 0.30, cp: 440, melt: 1350, level: '1st_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
  }
  if (fam.includes('Cobalt-based')) {
    /* R126 — Co 3rd_family 분기 */
    if (has(/stellite/)) return { ec: 1.5, tmax: 760, price: 60, cte: 14.2, poisson: 0.30, cp: 423, melt: 1330, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Very Poor', weldability: 'Fair' } };
    if (has(/cocrmo|asm.?f75|astm.?f75|biomedical.?cobalt/)) return { ec: 1.5, tmax: 600, price: 60, cte: 12.5, poisson: 0.30, cp: 420, melt: 1370, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
    if (has(/mp35n|mp159|nicrocoat/)) return { ec: 1.5, tmax: 425, price: 80, cte: 12.8, poisson: 0.30, cp: 420, melt: 1430, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
    if (has(/l605|haynes.?25|alloy.?25/)) return { ec: 1.5, tmax: 980, price: 65, cte: 12.3, poisson: 0.30, cp: 385, melt: 1330, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Good' } };
    return { ec: 1.5, tmax: 1000, price: 60, cte: 12.5, poisson: 0.30, cp: 420, melt: 1330, level: '1st_family', qual: { corrosion: 'Excellent', machinability: 'Poor', weldability: 'Fair' } };
  }
  if (fam.includes('Magnesium-based')) {
    /* R126 — Mg 3rd_family 분기 */
    if (has(/we43|wn03|elektron.?w/)) return { ec: 18, tmax: 250, price: 25, cte: 26.6, poisson: 0.35, cp: 1020, melt: 545, level: '3rd_family', qual: { corrosion: 'Moderate', machinability: 'Excellent', weldability: 'Fair' } };
    if (has(/az31|az61|az91|az[0-9]{2}/)) return { ec: 30, tmax: 150, price: 6.5, cte: 26.0, poisson: 0.35, cp: 1024, melt: 600, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Good' } };
    if (has(/am50|am60|am[0-9]{2}/)) return { ec: 29, tmax: 150, price: 6.0, cte: 26.0, poisson: 0.35, cp: 1024, melt: 595, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Fair' } };
    if (has(/zk60|ze41|zm21|elektron.?z/)) return { ec: 27, tmax: 200, price: 12, cte: 27.0, poisson: 0.35, cp: 1020, melt: 525, level: '3rd_family', qual: { corrosion: 'Moderate', machinability: 'Excellent', weldability: 'Good' } };
    return { ec: 33, tmax: 120, price: 6, cte: 26, poisson: 0.35, cp: 1020, melt: 620, level: '1st_family', qual: { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Fair' } };
  }
  if (fam.includes('Refractory')) {
    const cte = has(/tungsten|\bw\b/) ? 4.5 : has(/tantal/) ? 6.5 : has(/molybden|\bmo\b|tzm/) ? 5.0 : has(/niobium|\bnb\b|c-?103/) ? 7.3 : 5.5;
    const cp = has(/tungsten|\bw\b/) ? 135 : has(/tantal/) ? 140 : has(/molybden|\bmo\b|tzm/) ? 250 : has(/niobium|\bnb\b|c-?103/) ? 265 : 200;
    const melt = has(/tungsten|\bw\b/) ? 3410 : has(/tantal/) ? 3017 : has(/molybden|\bmo\b|tzm/) ? 2620 : has(/niobium|\bnb\b|c-?103/) ? 2477 : 2600;
    return { ec: 31, tmax: 1000, price: 70, cte, poisson: 0.30, cp, melt, qual: { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' } };
  }
  if (fam.includes('Iron-based') || has(/steel|stainless|invar|kovar/)) {
    /* R126 — Iron 3rd_family 분기 확장: invar/kovar/stainless detail/maraging/tool + 알로이강/탄소강/스프링/베어링/주철 */
    if (has(/\binvar\b|fe.?ni.?36|nilo|super.?invar/)) return { ec: 2, tmax: 200, price: 25, cte: 1.3, poisson: 0.29, cp: 515, melt: 1430, level: '3rd_family', qual: { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Good' } };
    if (has(/kovar|fe.?ni.?co|nilo.?k|dilver/)) return { ec: 3, tmax: 450, price: 30, cte: 5.5, poisson: 0.32, cp: 460, melt: 1450, level: '3rd_family', qual: { corrosion: 'Moderate', machinability: 'Fair', weldability: 'Good' } };
    if (has(/austenit|\b30[34]\b|\b30[34]l|\b316\b|316l|321|347|310|904l|254smo|nitronic/)) return { ec: 2.4, tmax: 870, price: 5.5, cte: 17.0, poisson: 0.30, cp: 500, melt: 1450, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' } };
    if (has(/martensit|\b410\b|\b420\b|\b440[abc]?\b|13.?cr/)) return { ec: 3.0, tmax: 650, price: 3.5, cte: 10.2, poisson: 0.28, cp: 460, melt: 1480, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Fair', weldability: 'Fair' } };
    if (has(/ferritic|\b405\b|\b409\b|\b430\b|\b439\b|\b446\b/)) return { ec: 3.5, tmax: 815, price: 3.0, cte: 10.4, poisson: 0.30, cp: 460, melt: 1480, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Fair', weldability: 'Good' } };
    if (has(/duplex|2205|2507|super.?duplex/)) return { ec: 2.0, tmax: 300, price: 8, cte: 13.0, poisson: 0.30, cp: 500, melt: 1465, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Good' } };
    if (has(/17.?4.?ph|17.?7.?ph|15.?5.?ph|13.?8.?mo.?ph|a286|custom.?455|custom.?465|precipitation/) || sub.includes('ph')) return { ec: 2.5, tmax: 315, price: 7, cte: 11.0, poisson: 0.27, cp: 460, melt: 1404, level: '3rd_family', qual: { corrosion: 'Excellent', machinability: 'Fair', weldability: 'Fair' } };
    if (has(/maraging|18ni|c300|c250|c350|m300/) || sub.includes('maraging')) return { ec: 3, tmax: 400, price: 15, cte: 10.3, poisson: 0.30, cp: 450, melt: 1430, level: '3rd_family', qual: { corrosion: 'Moderate', machinability: 'Good', weldability: 'Excellent' } };
    if (sub.includes('tool') || has(/\bh13\b|\bd2\b|\bm[24]\b|\bp20\b|\bs7\b|\ba2\b|\bo1\b|cpm|skh|skd|stavax/)) return { ec: 5, tmax: 550, price: 6, cte: 11.5, poisson: 0.29, cp: 460, melt: 1430, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Fair', weldability: 'Poor' } };
    if (has(/\b4[0-9]{3}\b|cr.?mo|chromoly|42crmo|34crmo|aisi.?4[0-9]{3}|sae.?4[0-9]{3}|scm[0-9]+|low.?alloy.?steel/)) return { ec: 7, tmax: 425, price: 3, cte: 12.3, poisson: 0.29, cp: 475, melt: 1428, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' } };
    if (has(/\b8[6-7]\d{2}\b|\b93\d{2}\b|ni.?cr.?mo.?steel|carburiz/)) return { ec: 7, tmax: 425, price: 3.5, cte: 11.9, poisson: 0.29, cp: 477, melt: 1427, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' } };
    if (has(/\b10[1-5]\d\b|s[1-5][05]c|aisi.?10\d{2}|sae.?10\d{2}|carbon.?steel/) && !has(/sintered/)) return { ec: 14, tmax: 540, price: 1.2, cte: 11.5, poisson: 0.29, cp: 486, melt: 1500, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Excellent' } };
    if (has(/\b10[6-9]\d\b|\b1095\b|high.?carbon|sk[0-9]+|tool.?carbon/)) return { ec: 12, tmax: 540, price: 1.5, cte: 11.4, poisson: 0.29, cp: 486, melt: 1480, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Fair', weldability: 'Fair' } };
    if (has(/spring.?steel|sup[0-9]+|sae.?51[0-9]{2}|sae.?6[0-1]\d{2}|5160|9260|6150/)) return { ec: 7.5, tmax: 480, price: 3, cte: 12.0, poisson: 0.29, cp: 477, melt: 1430, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Fair', weldability: 'Fair' } };
    if (has(/52100|100cr6|bearing.?steel|bearing.?alloy|gcr15/)) return { ec: 5, tmax: 480, price: 4, cte: 12.3, poisson: 0.29, cp: 475, melt: 1424, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Fair', weldability: 'Poor' } };
    if (has(/cast.?iron|gray.?iron|ductile.?iron|nodular|astm.?a48|astm.?a536/) || sub.includes('cast iron')) return { ec: 5, tmax: 400, price: 1.5, cte: 11.0, poisson: 0.26, cp: 460, melt: 1200, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Excellent', weldability: 'Poor' } };
    if (has(/sm49[0-9]|sm5[0-7]\d|sm3[5-9]\d|s.?n4\d{2}|s.?n[4-5]\d{2}|shn[2-5]\d{2}|sd[3-7]\d{2}|saph[3-4]\d{2}|spfh[5-9]\d{2}|stk[0-9]+|stkm[0-9]+|sg[0-9]+|spa.?h|posco|hyundai.?steel|hot.?rolled.?steel|cold.?rolled.?steel|sapeh|sgcc|sgc\d{3}|api.?5l|line.?pipe|twip|dp[0-9]{3}|trip[0-9]{3}|9.?ni.?steel|cgo/)) return { ec: 9, tmax: 450, price: 1.5, cte: 11.7, poisson: 0.29, cp: 480, melt: 1500, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' } };
    if (has(/weathering|cor.?ten|atmospheric.?corrosion|astm.?a242|astm.?a588/) || sub.includes('weathering')) return { ec: 7, tmax: 450, price: 2.5, cte: 11.7, poisson: 0.29, cp: 480, melt: 1500, level: '3rd_family', qual: { corrosion: 'Good', machinability: 'Good', weldability: 'Good' } };
    if (has(/structural.?steel|ss[2-5]\d{2}|astm.?a36|astm.?a572|s235|s275|s355|s460|s500|s550|s620|s690|en.?10025/)) return { ec: 8, tmax: 450, price: 1.5, cte: 12.0, poisson: 0.29, cp: 470, melt: 1500, level: '3rd_family', qual: { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' } };
    /* 2nd_family: stainless 전체 group (specific subgroup 미매치) */
    if (has(/stainless|sus|sts|austenitic|ferritic|martensitic/) || sub.includes('stainless')) return { ec: 2.5, tmax: 700, price: 5, cte: 14.5, poisson: 0.29, cp: 480, melt: 1450, level: '2nd_family', qual: { corrosion: 'Good', machinability: 'Fair', weldability: 'Good' } };
    /* 2nd_family: 일반 강 (alloy / carbon 미매치) */
    if (sub.includes('steel') || sub.includes('alloy steel') || sub.includes('carbon steel')) return { ec: 8, tmax: 450, price: 2, cte: 12.0, poisson: 0.29, cp: 475, melt: 1490, level: '2nd_family', qual: { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' } };
    return { ec: 9, tmax: 450, price: 2, cte: 12, poisson: 0.29, cp: 470, melt: 1500, level: '1st_family', qual: { corrosion: 'Poor', machinability: 'Good', weldability: 'Good' } };
  }
  return { ec: null, tmax: null, price: null, cte: null, poisson: null, cp: null, melt: null, level: null, qual: null };
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
  /* R132 — Haynes 282 verified Haynes Intl H-3173F brochure (2023). Plate-form age-hardened RT YS=715, UTS=1147. */
  'haynes282': { fatigue: [400, 475, 550], impact: [50, 80, 110], elevated_temp: [{ temp: 20, ys: 715, uts: 1147 }, { temp: 538, ys: 649, uts: 991 }, { temp: 649, ys: 643, uts: 1048 }, { temp: 760, ys: 628, uts: 856 }, { temp: 871, ys: 507, uts: 566 }, { temp: 927, ys: 310, uts: 359 }], creep_rupture: [{ temp: 760, stress: 255, hours: 100 }, { temp: 871, stress: 124, hours: 100 }, { temp: 927, stress: 62, hours: 100 }] },
  'inconel939': { fatigue: [380, 430, 480], impact: [10, 14, 20], elevated_temp: [{ temp: 20, ys: 800, uts: 1050 }, { temp: 540, ys: 760, uts: 1000 }, { temp: 760, ys: 720, uts: 950 }, { temp: 870, ys: 620, uts: 800 }] },
  'inconel738': { fatigue: [400, 450, 500], impact: [10, 15, 22], elevated_temp: [{ temp: 20, ys: 950, uts: 1130 }, { temp: 540, ys: 920, uts: 1100 }, { temp: 760, ys: 860, uts: 1020 }, { temp: 870, ys: 700, uts: 870 }] },
  '155ph': { fatigue: [480, 540, 600], impact: [25, 40, 55], elevated_temp: [{ temp: 20, ys: 1170, uts: 1310 }, { temp: 300, ys: 1010, uts: 1170 }, { temp: 425, ys: 940, uts: 1080 }, { temp: 540, ys: 760, uts: 900 }] },
};
const REAL_ALIAS = { 'maragingsteel': 'maraging', 'm300': 'maraging', 'ms1': 'maraging', '18ni300': 'maraging', '718': 'inconel718', '625': 'inconel625', '6061': 'aa6061', '7075': 'aa7075', '2024': 'aa2024', '304': '304l', 'a357': 'alsi7mg', '286': 'a286', '600': 'inconel600', '6242': 'ti6242', 'ti6242s': 'ti6242', '316': '316l', '42crmo4': '4140', '4142': '4140', '5052': 'aa5052', '15-5ph': '155ph', '155': '155ph', '174': '174ph', '17-4ph': '174ph', 'cocr': 'cocrmo', 'cocrmoasf75': 'cocrmo', 'cocrmoasf1537': 'cocrmo', '738': 'inconel738', '939': 'inconel939', '282': 'haynes282', 'x': 'hastelloyx' };
function realPropsFor(name) {
  const keys = new Set([norm(alloyOf(name)), norm(baseName(name))]);
  for (const tok of String(name).split(/[\s(),/]+/)) if (/\d/.test(tok)) keys.add(norm(tok));
  for (const k of keys) { const kk = REAL_ALIAS[k] || k; if (REAL_PROPS[kk]) return { ...REAL_PROPS[kk], _key: kk }; }
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
function compositionFromRows(g, category) {
  /* R159 — Polymer/Ceramic/Composite 는 metal element 가 의미 없음. CSV 에 잘못된 metal 컬럼 값이 있어도 무시.
   *        polymer 의 backbone 원자 (C/H/N/O 등) 는 polymer-specific composition source 로부터 별도 처리. */
  if (category && category !== 'Metal') return {};
  const composition = {};
  for (const el of ELEMENTS) { const vals = g.map(r => num(r[el])).filter(v => v != null && v > 0); if (vals.length) { const mn = round(Math.min(...vals)), mx = round(Math.max(...vals)); composition[el] = mn === mx ? String(mn) : `${mn}~${mx}`; } }
  return composition;
}
function rangesFromRows(g) { const ranges = {}; for (const p of NUM_PROPS) ranges[p] = rangeFrom(g.map(r => r[p])); return ranges; }
// R155b — nameBasedSubcategory, fixSubcategory, conditionClass → scripts/lib/classification.mjs 로 이동.

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
/* R134a — 사용자 명시 요청: data sparse + 대체 anchor 존재 → DB 제외.
   "확장보다는 데이터베이스의 질과 정확성을 향상시키는 작업".
   Ti-5-8-5 (β-Ti specialty, datasheet 0) — Ti-5553 으로 대체 가능
   AA 7178 (구형 aerospace) — AA 7075-T7351 으로 대체 가능
   AA 5005/5050/5154/5251/5356/5383 — AA 5052/5083 으로 대체 가능
   ASTM A553 (사용자 명시 — 단, a553.pdf 데이터 보유, 9% Ni LNG tank 등 valuable 가능성 → comment 하단 참고). */
// R155b — EXCLUDED_*_PATTERNS, isExcludedByName, isExcludedAlloy → scripts/lib/classification.mjs 로 이동.
let droppedExcluded = 0;
const ncGroups = new Map(); // norm(alloy)|process -> { rows, hasAm, name, process }
for (const r of csvRows) {
  if (isCurated(r.material_name)) { droppedCuratedDup++; continue; }
  if (isExcludedAlloy(alloyOf(r.material_name)) || isExcludedAlloy(baseName(r.material_name))) {
    droppedExcluded++; continue;
  }
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
/* R130a — vendor "As-supplied" 의 의미 명시: AM process 면 "As-built (no post-processing)",
   Wrought/Cast/Forged 이면 "Mill-supplied (annealed by default per ASTM)". 모호함 줄이기. */
function resolveAsSupplied(cond, process) {
  if (cond !== 'As-supplied') return cond;
  const p = String(process).toLowerCase();
  if (/lpbf|dmls|slm|ebm|bjt|sls|mjf|fdm|binder/.test(p)) return 'As-built (no post-processing)';
  if (/wrought/.test(p)) return 'Mill-annealed (ASTM default)';
  if (/cast|forged/.test(p)) return 'As-cast/forged (no temper)';
  return cond;
}
const nonCurated = Array.from(ncGroups.values()).map((grp, idx) => {
  const g = grp.rows, rep = g[0];
  const rawSub = mostCommon(g.map(r => r.subcategory));
  const sub = fixSubcategory(grp.name, rawSub); if (sub !== rawSub) aaFixed++;
  const variants = uniq(g.map(r => r.subcategory));
  if (variants.length > 1) subcatFlags.push({ name: grp.name, variants });
  const tier = grp.hasAm ? 'am_vendor' : 'generic';
  const manus = uniq(g.map(r => r.manufacturer));
  const realSrc = uniq(g.map(r => r.source).filter(s => s !== 'Unknown')).map(s => ({ label: s, url: null, verified: false }));
  const resolvedCond = resolveAsSupplied(grp.cond, grp.process);
  /* R112 — Polymer CSV entry 에 family vendor URL 자동 추가 (verified). polymer 94종 의 verified URL 비율 ↑. */
  const polyVendor = rep.category === 'Polymer' ? polymerVendorURL(sub, grp.name) : null;
  const baseSrc = grp.hasAm
    ? [...manus.filter(m => m !== 'Generic').map(mf => ({ label: `${mf} (AM vendor datasheet)`, url: null, verified: false })), ...realSrc, matwebSearch(grp.name)]
    : [...realSrc, familyHandbook(rep.category, sub), matwebSearch(grp.name)];
  const sources = dedupeSources(polyVendor ? [polyVendor, ...baseSrc] : baseSrc);
  const conditions = uniq(g.map(r => { const mm = String(r.material_name).match(/\(([^)]+)\)/); return mm ? mm[1] : null; }));
  return {
    id: (tier === 'am_vendor' ? 'V_' : 'G_') + String(idx).padStart(4, '0'),
    name: `${grp.name} — ${grp.cond} (${grp.process})`,
    category: rep.category || 'Metal', subcategory: sub, tier,
    manufacturers: tier === 'am_vendor' ? manus : ['Generic'], machines: [],
    processes: [grp.process], heat_treatment: resolvedCond,
    ranges: rangesFromRows(g), composition: compositionFromRows(g, rep.category), sources, points: g.map(r => PROP_ORDER.map(p => num(r[p]))),
    machinability: mostCommonKnown(g.map(r => r.machinability)),
    weldability: mostCommonKnown(g.map(r => r.weldability)),
    corrosion_resistance: mostCommonKnown(g.map(r => r.corrosion_resistance)),
    meta: { row_count: g.length, subcategory_variants: variants, conditions },
  };
});
/* R173 — drop fake-variant rows (alloy × physically-impossible condition).
 *  e.g., AISI 1020 × Aged / solution-treated (plain carbon → no PH).
 *  Patterns enforced by isFakeVariant() with ASM Handbook Vol.1·2 source. */
let fakeVariantDropped = 0;
const fakeVariantNames = [];
const nonCuratedFiltered = nonCurated.filter(m => {
  const alloyN = baseName(m.name);
  const cond = (m.heat_treatment || '');
  if (isFakeVariant(alloyN, cond)) {
    fakeVariantDropped++;
    fakeVariantNames.push(`${alloyN} × ${cond}`);
    return false;
  }
  return true;
});
if (fakeVariantDropped > 0) {
  console.log(`R173 — Dropped ${fakeVariantDropped} fake-variant rows (alloy × impossible condition).`);
  const distinct = Array.from(new Set(fakeVariantNames));
  console.log(`        Distinct patterns (${distinct.length}): ${distinct.slice(0, 8).join(' | ')}${distinct.length > 8 ? ' …' : ''}`);
}
const am_vendor = nonCuratedFiltered.filter(m => m.tier === 'am_vendor');
const generic = nonCuratedFiltered.filter(m => m.tier === 'generic');

/* R173 (curated layer) — material_db.json (manual curated) 의 일부 entries 도 검증.
 *   예: "H13 — Aged" 는 hot-work tool steel 의 manual entry — Aged 라벨 모호.
 *   각 curated entry 의 entire material 단위로 isFakeVariant() 적용. */
let curatedFakeDropped = 0;
const curatedFakeDroppedNames = [];
const curatedFiltered = curated.filter(m => {
  const alloyN = baseName(m.name);
  const cond = (m.heat_treatment || '');
  if (isFakeVariant(alloyN, cond)) {
    curatedFakeDroppedNames.push(`${alloyN} × ${cond}`);
    curatedFakeDropped++;
    return false;
  }
  return true;
});
if (curatedFakeDropped > 0) {
  console.log(`R173 — Dropped ${curatedFakeDropped} fake-variant rows from curated layer.`);
  console.log(`        ${Array.from(new Set(curatedFakeDroppedNames)).slice(0, 8).join(' | ')}`);
}

/* R173 — write full drop list to data/r173-fake-variant-drops.md for human review */
{
  const lines = ['# R173 — Dropped fake-variant entries (검토용)\n', `Total dropped: ${fakeVariantDropped + curatedFakeDropped} (${fakeVariantDropped} non-curated + ${curatedFakeDropped} curated)\n`, '## Non-curated drops (CSV / supplementary)\n', '|#|Alloy|Condition class|Pattern|', '|--|--|--|--|'];
  const sorted = [...fakeVariantNames].sort();
  sorted.forEach((entry, i) => {
    const [alloy, cond] = entry.split(' × ');
    const n = (alloy || '').toLowerCase();
    let pattern = '?';
    if (/^(aisi |sae )?1[01][0-9]{2}\b/.test(n) || /^a36\b/.test(n)) pattern = 'P1: plain carbon × Aged';
    else if (/\b(aisi |sae )?(41[046]|42[02]|431|44[024]|446)\b/.test(n)) pattern = 'P6: martensitic SS × Aged';
    else if (/\b(aisi |sae )?4(05|0[3-6]|09|30|34|36|39|41|42|44|46)\b/.test(n) || /\b18cr|sus430|stavax/.test(n)) pattern = 'P2: ferritic SS × Aged/Q+T';
    else if (/\b(aisi |sae )?3(0[14]|1[0-6]|21|47)l?\b/.test(n) || /sus3(0[14]|1[0-6])l?\b/.test(n)) pattern = 'P3/P5: austenitic SS × Q+T/Aged';
    else if (/^aa[\s-]?(1[0-9]{3}|3[0-9]{3}|5[0-9]{3})\b/.test(n)) pattern = 'P4: non-HT Al × Aged/Q+T';
    else if (/\b(aisi |sae )?(41[3457]0|43[124]0|46[02]0|47[125]0|48[12]0|51[14-6]0|52100|61[125-7]0|81[2-6]0|86[12-9]0|87[24]0|92[567]0|93[12-9]0)\b/.test(n) || /\bscm4(?:1[035]|20|3[05]|40|45)\b|\bsncm/.test(n)) pattern = 'P7: alloy steel × Aged';
    else if (/^(?:monel\s?400)|^inconel\s?60[01]\b|^hastelloy\s?(?:c-?276|x|b-?[234]|c-?22|c-?2000)\b|^incoloy\s?(?:800h?t?|825)\b|^haynes\s?(?:230|556|625)\b/.test(n)) pattern = 'P8: solid-sol Ni × Aged';
    else if (/^c706?00\b|^c715?00\b|^cuni\s?(?:10|30)/.test(n)) pattern = 'P9: cupronickel × Aged';
    else if (/^(?:tool steel )?(?:h1[13]|d[23]|a2|o1|s7|m[24]|w1|cpm[\s-]?(?:3v|s30v|s35vn|s90v))\b/.test(n) || /^skd(?:1[12]|61)\b/.test(n)) pattern = 'P10: tool steel × Aged';
    else if (/^ti\s?grade\s?[1234]\b|^ticpgr[1234]\b|^cp-?ti/.test(n)) pattern = 'P11: CP-Ti × Aged';
    lines.push(`|${i + 1}|${alloy}|${cond}|${pattern}|`);
  });
  if (curatedFakeDroppedNames.length) {
    lines.push('\n## Curated layer drops (material_db.json)\n', '|#|Alloy|Condition|', '|--|--|--|');
    curatedFakeDroppedNames.forEach((entry, i) => {
      const [alloy, cond] = entry.split(' × ');
      lines.push(`|${i + 1}|${alloy}|${cond}|`);
    });
  }
  lines.push('\n## Pattern reference (classification.mjs)\n');
  lines.push('- **P1** Plain carbon (10xx/11xx) × Aged — ASM Vol.1: low-C steel 은 PH 불가');
  lines.push('- **P2** Ferritic SS (4xx single-phase α) × Aged/Q+T — austenite 없음 → martensite 없음, PH 없음');
  lines.push('- **P3** Austenitic SS (304/316/321/347) × Q+T — Ms ≈ -100°C, RT quench 으로 martensite 형성 X');
  lines.push('- **P4** Non-HT Al (1xxx/3xxx/5xxx) × Aged/Q+T — solid-solution, only O/Hxx temper');
  lines.push('- **P5** Austenitic SS × Aged — 18-8 austenitic no precipitation phase (사용자 직접 지적)');
  lines.push('- **P6** Martensitic SS (410/420/440) × Aged — Q+T 만 valid');
  lines.push('- **P7** Alloy steel (41xx/43xx/51xx/61xx/86xx/87xx Cr-Mo) × Aged — solid-solution 강화');
  lines.push('- **P8** Solid-solution Ni (Monel 400/Inconel 600/Hastelloy C-276/X) × Aged — γ\'/γ\'\' 없음');
  lines.push('- **P9** Cupronickel (C70600/C71500) × Aged — solid-solution Cu-Ni');
  lines.push('- **P10** Tool steel (H13/D2/A2/CPM) × Aged 단독 — Hardened-tempered 가 정상');
  lines.push('- **P11** CP-Ti Grade 1-4 × Aged — single-phase α, no β transformation');
  fs.writeFileSync(path.join(DATA, 'r173-fake-variant-drops.md'), lines.join('\n') + '\n');
}

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
        // R179 — short letter condition codes ("O") 를 표준 풀이로 변환. 사용자 R179: 'O' 보고 바로 떠올릴 수 없음.
        //        T-temper (T3/T6/T651/T73 등) + H-temper (H32/H321 등) 은 표준 코드 그대로 유지.
        let condDisplay = cond;
        if (cond === 'O') condDisplay = 'Annealed';
        else if (/^O \(/.test(cond)) condDisplay = cond.replace(/^O \(/, 'Annealed (');
        return {
          id: 'R_' + String(idx).padStart(4, '0') + '_' + ci,
          name: `${s.name} — ${condDisplay}`,
          category: s.category, subcategory: s.subcategory, tier: 'reference',
          manufacturers: ['Reference data'], machines: [], processes: [s.process], heat_treatment: condDisplay,
          ranges, composition: s.composition || {}, sources: (s.ref_urls || []).map((u) => ({ label: `Datasheet ${ci + 1}`, url: u, verified: true })),
          points: [s.points[ci]],
          machinability: null, weldability: null, corrosion_resistance: null, industry_note: s.industry_note || null, meta: { reference: true, condition: condDisplay },
        };
      });
    }
    // 기존 패턴 — 모든 points 통합 (분류 없음)
    const ranges = {};
    for (const p of NUM_PROPS) ranges[p] = null;
    PROP_ORDER.forEach((p, i) => { ranges[p] = rangeFrom(s.points.map((row) => row[i])); });
    if (Array.isArray(s.fatigue)) ranges.fatigue_strength = rangeFrom(s.fatigue);
    if (Array.isArray(s.impact)) ranges.impact_strength = rangeFrom(s.impact);
    /* R130a — name 에서 HT condition 추출. "— Wrought, Aged (AMS 5662)" / "— H900" / "— Solution-Annealed" 등.
       conditions 배열 없는 supplementary 도 HT 검출 시 heat_treatment 필드 채움 → HT multiplier 적용 가능. */
    let extractedHT = s.heat_treatment || null;
    if (!extractedHT) {
      const nm = String(s.name || '');
      const ht = nm.match(/—\s*(?:Wrought|Cast|Forged|Rolled)\s*,?\s*([A-Za-z][^(—]*?)(?:\s*\(.*?\))?$/i)
        || nm.match(/—\s*(H9\d{2}|H10\d{2}|H11\d{2}|H12\d{2}|Aged|Annealed|Solution\s*[+-]?\s*Aged|Solution[\s-]?Annealed|Solution\s*Treated|Hardened|Tempered|Hardened-Tempered|Maraged|STA|DSA|HIP|As-?built|As-?cast)/i);
      if (ht && ht[1]) extractedHT = ht[1].trim().replace(/\s+/g, ' ');
    }
    return [{
      id: 'R_' + String(idx).padStart(4, '0'),
      name: s.name, category: s.category, subcategory: s.subcategory, tier: 'reference',
      manufacturers: ['Reference data'], machines: [], processes: [s.process], heat_treatment: extractedHT,
      ranges, composition: s.composition || {}, sources: s.sources || [], points: s.points,
      machinability: null, weldability: null, corrosion_resistance: null, industry_note: s.industry_note || null, meta: { reference: true },
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
      /* R139c — datasheet_url 이 있으면 verified source 로 추가 (CoorsTek/CeramTec/Kennametal/Materion 등). */
      const sources = [];
      if (c.datasheet_url) {
        const vendorName = (() => {
          const u = c.datasheet_url;
          if (u.includes('coorstek.com')) return 'CoorsTek';
          if (u.includes('ceramtec')) return 'CeramTec';
          if (u.includes('kennametal')) return 'Kennametal';
          if (u.includes('materion')) return 'Materion';
          if (u.includes('schott')) return 'Schott';
          if (u.includes('3m.com')) return '3M';
          if (u.includes('elementsix')) return 'Element Six';
          if (u.includes('minteq')) return 'Minteq';
          if (u.includes('azom')) return 'AZoM';
          return 'Vendor';
        })();
        sources.push({ label: `${vendorName} — ${c.name}`, url: c.datasheet_url, verified: true });
      }
      sources.push({ label: c.applications ? `Applications: ${c.applications}` : 'Ceramic handbook', url: null, verified: false });
      return {
        id: 'CER_' + String(i).padStart(3, '0'),
        name: c.name, category: 'Ceramic', subcategory: c.subcategory || 'Oxide', tier: 'reference',
        manufacturers: ['Reference data'], machines: [], processes: ['Sintered'],
        heat_treatment: null, ranges,
        composition: c.composition || {}, sources,
        machinability: null, weldability: null, corrosion_resistance: 'Excellent',
        meta: { ceramic: true, applications: c.applications, limitations: c.limitations, industry_note: c.industry_note },
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
      /* R139c — datasheet_url 이 있으면 verified source 로 추가 (Hexcel/Toray/Owens Corning/AGY/Cytec/3M/Honeywell/DuPont 등). */
      const sources = [];
      if (c.datasheet_url) {
        const vendorName = (() => {
          const u = c.datasheet_url;
          if (u.includes('hexcel')) return 'Hexcel';
          if (u.includes('toraytac') || u.includes('toray')) return 'Toray';
          if (u.includes('owenscorning')) return 'Owens Corning';
          if (u.includes('agy.com')) return 'AGY';
          if (u.includes('cytec')) return 'Solvay/Cytec';
          if (u.includes('3m.com')) return '3M';
          if (u.includes('honeywell')) return 'Honeywell';
          if (u.includes('dupont')) return 'DuPont';
          if (u.includes('rohacell')) return 'Evonik ROHACELL';
          if (u.includes('gurit')) return 'Gurit';
          if (u.includes('cps-inc')) return 'CPS Inc';
          if (u.includes('dynamet')) return 'Dynamet';
          if (u.includes('elementsix')) return 'Element Six';
          if (u.includes('matweb')) return 'MatWeb';
          return 'Vendor';
        })();
        sources.push({ label: `${vendorName} — ${c.name}`, url: c.datasheet_url, verified: true });
      }
      sources.push({ label: c.applications ? `Apps: ${c.applications}` : 'Composites handbook', url: null, verified: false });
      return {
        id: 'CMP_' + String(i).padStart(3, '0'),
        name: c.name, category: 'Composite', subcategory: c.subcategory || 'Composite', tier: 'reference',
        manufacturers: ['Reference data'], machines: [], processes: ['Layup'],
        heat_treatment: null, ranges, composition: {},
        sources,
        machinability: null, weldability: null, corrosion_resistance: null,
        meta: { composite: true, anisotropic: true, ply_direction: c.ply_direction, fiber_vf: c.fiber_vf, applications: c.applications, limitations: c.limitations, industry_note: c.industry_note,
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
      /* R110 — polymer 한정 물성 (Tg/Tm/HDT) 을 ranges 로 정식 노출. 이전엔 meta 에만 보존 → UI 표시 안됨. */
      setR('glass_transition_temp', p.tg);
      setR('melting_point', p.tm);
      setR('hdt_182', p.hdt_182);
      const sources = [];
      if (p.datasheet_url) sources.push({ label: `Datasheet — ${p.name.split(' — ')[0]}`, url: p.datasheet_url, verified: true });
      if (p.applications) sources.push({ label: `Applications: ${p.applications}`, url: null, verified: false });
      return {
        id: 'POL_' + String(i).padStart(3, '0'),
        name: p.name, category: 'Polymer', subcategory: p.subcategory || 'Polymer - Other', tier: 'reference',
        manufacturers: ['Reference data'], machines: [], processes: ['Injection Molding'],
        heat_treatment: null, ranges,
        /* R159 — composition derived from monomer formula in polymers-data.json. */
        composition: p.composition || {},
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
const all = [...curatedFiltered, ...am_vendor, ...generic, ...supplementary, ...ceramics, ...composites, ...polymers_extra];

// ───────── Sprint 4 C2 — Fracture toughness (KIC) family-typical fallback ─────────
// 현재 covered 39/1038 (3.8%) — fracture-critical alloy 선정 정밀화 위해 family typical 채움.
// 출처: ASM Handbook Vol. 1 (Steels) + Vol. 2 (Nonferrous) + MMPDS-2018 + Special Metals.
// confidence: 'class' — typical 만 신뢰, individual heat·orientation 변동 큼.
/* R139a — Subcategory-specific KIC fallback 확장.
   순서 중요 — 가장 특정한 pattern 먼저 (early-match wins).
   기존 17 entries → 38 entries (Spring Steel, Bearing Steel, Rail Steel, AHSS, Shipbuilding,
   Low-Temperature, Press-Hardening, Heat-Resistant, Pressure Vessel, Pipeline, Microalloyed,
   Armor Steel, Aluminum-Lithium, BeCu, Brass, Bronze 등 subgroup 별로 정밀 typical). */
const KIC_FALLBACK = [
  // [pattern, [min, typical, max], source]

  // ========== Maraging / Tool Steel (specific 먼저) ==========
  [/maraging\s?350|c-?350|vascomax\s?c-?350/i, [45, 55, 70], 'ATI Allegheny Tech Data Sheet'],
  [/maraging\s?300|c-?300|18ni.?300/i, [70, 80, 90], 'AMS 6514 / ATI'],
  [/maraging\s?250|c-?250|18ni.?250/i, [80, 85, 95], 'AMS 6512 / ATI'],
  [/aermet\s?100|aermet100/i, [100, 130, 150], 'Carpenter AerMet 100 datasheet (AMS 6532)'],
  [/aermet\s?310/i, [60, 70, 80], 'Carpenter AerMet 310'],
  [/custom\s?465/i, [85, 104, 130], 'Carpenter Custom 465 (H950)'],
  [/custom\s?475/i, [60, 70, 80], 'Carpenter Custom 475'],
  [/h13|skd61|tool.*hot|hot.*tool|x40crmov/i, [20, 24, 30], 'Bohler-Uddeholm H13'],
  [/m4\s?hss|m42\s?hss|cpm\s?s30v|hss/i, [10, 15, 22], 'Crucible PM tool steel'],
  [/\bd[23]\b|\bm[24]\b|\bp20\b|\bs7\b|\ba2\b|\bo1\b|tool steel|skd\d|cpm/i, [15, 25, 40], 'ASM Vol.1 Tool Steels'],

  // ========== Stainless 세분화 ==========
  [/zeron\s?100|s32760|super.?duplex/i, [80, 100, 130], 'Rolled Alloys ZERON 100'],
  [/stainless.*duplex|duplex.*stainless|\b2205\b|\b2507\b|s32750/i, [80, 110, 150], 'ASM Vol.1 Duplex SS'],
  [/17-?4\s?ph|s17400|aisi\s?630/i, [85, 95, 110], 'ASM Vol.1 17-4PH H900'],
  [/15-?5\s?ph|s15500|13-?8\s?mo|s13800/i, [80, 95, 110], 'ASM Vol.1 15-5PH H900'],
  [/stainless.*ph|17-?7\s?ph|ph.*stainless|precipitation.*hardening/i, [35, 60, 100], 'ASM Vol.1 PH SS general'],
  [/304l?\b|s30400|sus304|austenitic.*304/i, [180, 220, 260], 'ASM Vol.1 304/304L'],
  [/316l?\b|s31603|sus316/i, [180, 200, 240], 'ASM Vol.1 316/316L'],
  [/sae\s?21-?4n|21cr.*4ni/i, [120, 140, 170], 'Carpenter 21-4N NACE 7-7'],
  [/254\s?smo|s31254/i, [150, 180, 220], 'Outokumpu 254 SMO'],
  [/stainless.*austenitic|austenitic.*stainless|aisi\s?30[1-9]|aisi\s?31[0-7]|321\b|347\b/i, [100, 140, 200], 'ASM Vol.1 Austenitic SS'],
  [/martensitic.*stainless|stainless.*martensitic|\b410\b|\b420\b|\b440[abc]?\b/i, [40, 65, 95], 'ASM Vol.1 Martensitic SS'],
  [/ferritic.*stainless|stainless.*ferritic|\b430\b|\b436\b|\b446\b/i, [60, 80, 110], 'ASM Vol.1 Ferritic SS'],
  [/cust\s?455|cust\s?630/i, [70, 85, 100], 'Carpenter Custom 455/630'],

  // ========== Ni Superalloy 세분화 ==========
  [/inconel\s?718|in[\s-]?718|n07718/i, [90, 100, 110], 'Special Metals SMC-045 Inconel 718'],
  [/inconel\s?625|alloy\s?625|n06625/i, [100, 110, 130], 'Special Metals Inconel 625'],
  [/hastelloy\s?x|haynes?\s?230|haynes?\s?282|haynes?\s?188/i, [80, 100, 120], 'Haynes International'],
  [/cmsx-?4|rene\s?n5|pwa1484|single.?crystal/i, [25, 35, 50], 'GE Aviation Single Crystal'],
  [/inconel\s?100|in-?100|in-?738|in-?939/i, [40, 55, 75], 'Cast Ni superalloy'],
  [/inconel|hastelloy|haynes|nimonic|waspaloy|udimet|rene|monel|incoloy/i, [70, 100, 130], 'Special Metals/Haynes general'],

  // ========== Cobalt / Ti 세분화 ==========
  [/cobalt|\bco[\s-]?cr[\s-]?mo\b|stellite|f-?75|f1537|l-?605|mp35n/i, [50, 80, 110], 'ASM Vol.2 Cobalt alloys'],
  [/ti-?6al-?4v|ti6al4v|r56400|r56407|grade\s?5\b|grade\s?23/i, [55, 75, 95], 'AMS 4928 / ASTM F136'],
  [/ti-?6242|ti-?6-?2-?4-?2|r54620|near.?alpha.?ti/i, [60, 76, 90], 'TIMET Timetal 6242'],
  [/ti-?5553|ti-?10v-?2fe|ti-?15-?3|beta.?ti|ti-?525/i, [40, 50, 65], 'TIMET beta Ti'],
  [/ti-?gr.?11|ti.?0\.?2pd|grade\s?11/i, [68, 70, 72], 'ASTM B265 Ti Gr11'],
  [/titanium|^ti-?\d|cp\s?ti|ti grade|ti-?\d+|^ti\b/i, [50, 70, 90], 'MMPDS-2018 Titanium'],

  // ========== Steel subgroup 세분화 ==========
  [/dp\s?980|dual.?phase.*980|hct980x|cr980/i, [70, 90, 110], 'AHSS DP980 (Granta + POSCO)'],
  [/dp\s?\d{3,4}|trip\s?\d{3,4}|cp\s?\d{3,4}|advanced.*high.*strength|ahss/i, [60, 80, 100], 'AHSS family'],
  [/twip\s?1180|twip\s?500/i, [50, 65, 80], 'POSCO TWIP'],
  [/22mnb5|usibor|press.?hardening|phs/i, [80, 100, 140], '22MnB5 USIBOR hot-stamped'],
  [/9\s?%?\s?ni|a553|low.?temp|cryogenic.?steel/i, [100, 130, 170], 'ASTM A553 9% Ni LNG'],
  [/eh36|dh36|ah36|shipbuilding|abs\s?(?:a|b|d|e)h36/i, [80, 110, 140], 'ABS/DNV class shipbuilding'],
  [/sa516|p355n|pressure.?vessel|asme.?b.?pv/i, [75, 90, 120], 'ASME SA-516 pressure vessel'],
  [/api\s?5l|x42|x52|x60|x65|x70|x80|pipeline|line.?pipe/i, [70, 95, 130], 'API 5L pipeline'],
  [/a572|a588|cor-?ten|hsla|weathering/i, [60, 80, 100], 'ASTM A572/A588 HSLA'],
  [/structural|a36|s235|s275|s355|s460/i, [55, 75, 95], 'ASTM A36 / EN structural'],
  [/armox|mil-?a-?46100|armor.?steel|rha/i, [25, 35, 45], 'SSAB Armox armor steel'],
  [/r260|r350ht|rail.?steel|uic.?\d+/i, [25, 35, 50], 'BS EN 13674 Rail'],
  [/p91|t22|800h|incoloy\s?800|heat.?resistant/i, [80, 100, 130], 'ASME B&PV Sec.II heat-resistant'],
  [/52100|100cr6|suj2|bearing.?steel/i, [15, 22, 30], '52100 bearing'],
  [/spring.?steel|\bsup\d|9260|5160|51crv4/i, [50, 65, 85], 'ASM spring steel'],
  [/4140|4340|4130|8740|300m|d6ac|alloy steel|aisi\s?4|sae\s?4|sncm/i, [55, 75, 100], 'AMS 6415 alloy steel'],
  [/1010|1018|1020|1045|1095|aisi\s?10|sae\s?10|carbon steel|s45c/i, [40, 55, 80], 'AISI carbon steel'],

  // ========== Aluminum 세분화 ==========
  [/aa\s?20(50|90|99|95)|aa\s?219[5-9]|al-?li|2196|2198/i, [25, 35, 45], 'FAA DOT/TC-18/21 Al-Li'],
  [/aa\s?7075|aa\s?7050|aa\s?7068|7075|7050/i, [22, 28, 35], 'Aluminum Association AA 7075-T651'],
  [/aluminum.*7\d{3}|7\d{3}\b/i, [20, 26, 32], 'AA 7xxx Al-Zn'],
  [/aa\s?6061|aa\s?6063|aa\s?6082|6061|6063|6082/i, [27, 35, 42], 'AA 6061-T6'],
  [/aluminum.*6\d{3}|6\d{3}\b/i, [25, 32, 40], 'AA 6xxx Al-Mg-Si'],
  [/aa\s?2024|aa\s?2219|aa\s?2014|2024|2219/i, [20, 26, 32], 'AA 2024-T351'],
  [/aluminum.*2\d{3}|2\d{3}\b/i, [18, 24, 30], 'AA 2xxx Al-Cu'],
  [/aa\s?5083|aa\s?5052|aa\s?5454|5083|5052|5454/i, [27, 38, 50], 'AA 5083 marine'],
  [/aluminum.*5\d{3}|5\d{3}\b/i, [25, 35, 50], 'AA 5xxx Al-Mg'],
  [/aa\s?1100|aa\s?1050|aa\s?1200|1100|1050|1200/i, [40, 50, 65], 'AA 1xxx CP Al'],
  [/scalmalloy|al.?mg.?sc/i, [22, 28, 35], 'APWorks Scalmalloy'],
  [/alsi10mg|alsi7mg|al12si|alsi.?cast/i, [12, 18, 25], 'EOS AlSi10Mg cast'],
  [/aluminum|alumi|aa\s?\d{4}/i, [22, 30, 40], 'Aluminum Association handbook'],

  // ========== Magnesium / Copper / Refractory ==========
  [/magnesium|\baz3[1]\b|\baz6[1]\b|\baz9[1]\b|we43|we54|zk60|wz\d/i, [12, 17, 25], 'ASM Vol.2 Mg alloys'],
  [/c17200|c17500|c17510|cube|bery|moldmax/i, [50, 60, 75], 'Materion BeCu C17200'],
  [/c18000|c18100|c18150|c18200|cucr|cuni2sicr/i, [50, 60, 75], 'Cu-Cr-Zr / Cu-Ni-Si-Cr family'],
  [/c95820|c95500|c63020|cu.?al.?fe|aluminum.?bronze|nab\b/i, [40, 60, 80], 'Copper.org NIAB'],
  [/c26000|c46400|brass|naval.?brass|cuzn/i, [40, 55, 75], 'Copper.org Brass'],
  [/c70600|c71500|c75200|cuni|cupronickel/i, [70, 100, 130], 'Copper.org Cu-Ni'],
  [/narloy.?z|narloyz/i, [55, 70, 85], 'NASA TM-86932 Narloy-Z'],
  [/copper|brass|bronze|c[12389]\d{4}/i, [50, 80, 110], 'ASM Vol.2 Cu alloys general'],
  [/invar|kovar|fe.?ni3[56]|controlled.?expansion/i, [70, 100, 130], 'Carpenter Invar 36 / Kovar'],
  [/tungsten|tzm|tantalum|niobium|molybdenum|refractory|c-?103/i, [25, 35, 50], 'ASM Vol.2 Refractory'],
  [/zircaloy|zr.?nb|zr-?4|r608\d{2}/i, [40, 55, 75], 'Westinghouse Zircaloy-4'],
  [/cast iron|grey iron|ductile|nodular|a536/i, [25, 35, 50], 'ASTM A536 ductile iron'],
];
let kicFilled = 0;
for (const m of all) {
  const r = m.ranges && m.ranges.fracture_toughness;
  if (r && r.typical != null) continue;
  // metals only — ceramic/polymer/composite 는 family/structure 의존성 너무 큼
  if (!m.category || m.category !== 'Metal') continue;
  const key = `${m.subcategory || ''} ${m.name} ${m.category}`;
  for (const [rx, vals, src] of KIC_FALLBACK) {
    if (rx.test(key)) {
      const [mn, tp, mx] = vals;
      if (!m.ranges) m.ranges = {};
      /* R129 — HT-aware scaling + provenance: KIC family typical 에 condition multiplier 적용. */
      const multK = htConditionMultiplier(m);
      const scaledTp = +(tp * multK.k).toFixed(1);
      const scaledMn = +(mn * multK.k).toFixed(1);
      const scaledMx = +(mx * multK.k).toFixed(1);
      const provK = (multK.condTag && multK.k !== 1)
        ? `class:${src} × HT:${multK.condTag} (k×${multK.k})`
        : `class:${src}`;
      m.ranges.fracture_toughness = { min: scaledMn, max: scaledMx, typical: scaledTp, n: 0, confidence: 'class', provenance: provK };
      m.fracture_toughness = scaledTp;
      m.sources = m.sources || [];
      if (!m.sources.some(s => s.label && s.label.startsWith('KIC fallback'))) {
        m.sources.push({ label: `KIC fallback: ${src}`, url: null, verified: false });
      }
      kicFilled++;
      break;
    }
  }
}
console.log('Sprint 4 C2 — KIC fallback applied:', kicFilled);

// ───────── Sprint 4 C1 — Fatigue strength endurance-limit fallback ─────────
// 11% metal missing — σ_fatigue ≈ k · σy 근사 (10^7 cycles, R=-1, smooth specimen).
// 출처: Shigley's Mechanical Engineering Design (10th ed) Ch. 6 Eq. 6-10; ASM Vol. 19 Fatigue.
const FATIGUE_RATIO = [
  // [pattern, k_low, k_typ, k_high, source]
  [/stainless.*austenitic|austenitic.*stainless|304\b|316\b/i, 0.35, 0.42, 0.50, 'ASM Vol.19 SS fatigue'],
  [/stainless.*martensitic|martensitic|17-?4|15-?5|13-?8|\b41[03]\b/i, 0.40, 0.50, 0.58, 'ASM Vol.19 Martensitic SS'],
  [/tool steel|\bd[23]\b|\bm[24]\b|\bh1[13]\b/i, 0.35, 0.42, 0.50, 'ASM Vol.1 Tool Steels'],
  [/inconel|hastelloy|haynes|nimonic|monel|udimet|rene/i, 0.40, 0.48, 0.55, 'Special Metals fatigue data'],
  [/cobalt|stellite|f-?75|l-?605/i, 0.40, 0.48, 0.55, 'ASM Vol.2 Co alloys'],
  [/titanium|ti-?6al-?4v|ti grade|cp ?ti/i, 0.42, 0.52, 0.60, 'MMPDS-2018 Titanium'],
  [/aluminum|aa\s?\d{4}|alsi\d+|7075|6061|2024/i, 0.30, 0.38, 0.46, 'Aluminum Association handbook'],
  [/magnesium|\baz\d/i, 0.30, 0.35, 0.42, 'ASM Vol.2 Mg alloys'],
  [/copper|brass|bronze|c[12389]\d{4}/i, 0.28, 0.35, 0.42, 'ASM Vol.2 Cu alloys'],
  [/refractory|tantalum|tungsten|niobium|molybdenum/i, 0.35, 0.42, 0.50, 'ASM Vol.2 Refractory'],
  [/carbon steel|alloy steel|41\d{2}|43\d{2}|s45c|aisi|sae/i, 0.40, 0.50, 0.58, "Shigley's Mechanical Engineering Design"],
];
let fatigueFilled = 0;
for (const m of all) {
  const r = m.ranges && m.ranges.fatigue_strength;
  if (r && r.typical != null) continue;
  if (!m.category || m.category !== 'Metal') continue;
  const sy = m.ranges && m.ranges.yield_strength && m.ranges.yield_strength.typical;
  if (sy == null || sy <= 0) continue;
  const key = `${m.subcategory || ''} ${m.name} ${m.category}`;
  for (const [rx, kLo, kTyp, kHi, src] of FATIGUE_RATIO) {
    if (rx.test(key)) {
      if (!m.ranges) m.ranges = {};
      m.ranges.fatigue_strength = {
        min: Math.round(sy * kLo), max: Math.round(sy * kHi), typical: Math.round(sy * kTyp),
        n: 0, confidence: 'derived',
        provenance: `family:σf≈${kTyp}·σy (${src})`,  // R129 — Sprint 4 C1 fallback provenance
      };
      m.fatigue_strength = Math.round(sy * kTyp);
      m.sources = m.sources || [];
      if (!m.sources.some(s => s.label && s.label.startsWith('Fatigue fallback'))) {
        m.sources.push({ label: `Fatigue fallback: σf ≈ ${kTyp}·σy (${src})`, url: null, verified: false });
      }
      fatigueFilled++;
      break;
    }
  }
}
console.log('Sprint 4 C1 — Fatigue fallback applied:', fatigueFilled);

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
  // ───────── Sprint 4 C3 — 3 alloys 추가 (절제) ─────────
  // 욕심 안 부리고 핵심 3종: P91 발전소 boiler / Inconel 617 VHTR / Alloy 800H petrochem.
  'p91': {  // Grade 91 (9Cr-1MoVNb) — ASME B&PV Code Sec.II Pt.D + ASTM A335. 발전소 main steam piping 표준.
    elevated_temp: [
      { temp: 25,  ys: 480, uts: 660, E: 218 },
      { temp: 300, ys: 420, uts: 620, E: 200 },
      { temp: 500, ys: 360, uts: 530, E: 180 },
      { temp: 600, ys: 260, uts: 360, E: 165 },
      { temp: 650, ys: 220, uts: 250, E: 155 },
    ],
    creep_rupture: [
      // ECCC datasheet 2014 — 100,000h rupture
      { temp: 550, stress: 210, hours: 100000 },
      { temp: 600, stress: 100, hours: 100000 },
      { temp: 650, stress:  50, hours: 100000 },
    ],
  },
  'grade 91': {  // 별칭
    elevated_temp: [
      { temp: 25,  ys: 480, uts: 660, E: 218 },
      { temp: 300, ys: 420, uts: 620, E: 200 },
      { temp: 500, ys: 360, uts: 530, E: 180 },
      { temp: 600, ys: 260, uts: 360, E: 165 },
      { temp: 650, ys: 220, uts: 250, E: 155 },
    ],
    creep_rupture: [
      { temp: 550, stress: 210, hours: 100000 },
      { temp: 600, stress: 100, hours: 100000 },
      { temp: 650, stress:  50, hours: 100000 },
    ],
  },
  'inconel 617': {  // Special Metals SMC-029 — VHTR 후보, 1000°C 까지 사용.
    elevated_temp: [
      { temp: 25,   ys: 350, uts: 760, E: 211 },
      { temp: 400,  ys: 240, uts: 700, E: 198 },
      { temp: 600,  ys: 220, uts: 670, E: 184 },
      { temp: 800,  ys: 200, uts: 540, E: 168 },
      { temp: 1000, ys: 110, uts: 180, E: 145 },
    ],
    creep_rupture: [
      { temp: 800,  stress: 90, hours: 1000 },
      { temp: 900,  stress: 50, hours: 1000 },
      { temp: 1000, stress: 25, hours: 1000 },
    ],
  },
  'incoloy 800h': {  // Special Metals SMC-046 — petrochem heater tube, ASME case 2843.
    elevated_temp: [
      { temp: 25,  ys: 200, uts: 520, E: 196 },
      { temp: 300, ys: 145, uts: 450, E: 180 },
      { temp: 500, ys: 130, uts: 410, E: 168 },
      { temp: 700, ys: 120, uts: 350, E: 155 },
      { temp: 900, ys:  90, uts: 180, E: 140 },
    ],
    creep_rupture: [
      { temp: 700, stress: 100, hours: 1000 },
      { temp: 800, stress:  50, hours: 1000 },
      { temp: 900, stress:  20, hours: 1000 },
    ],
  },
  'alloy 800h': {  // 별칭
    elevated_temp: [
      { temp: 25,  ys: 200, uts: 520, E: 196 },
      { temp: 300, ys: 145, uts: 450, E: 180 },
      { temp: 500, ys: 130, uts: 410, E: 168 },
      { temp: 700, ys: 120, uts: 350, E: 155 },
      { temp: 900, ys:  90, uts: 180, E: 140 },
    ],
    creep_rupture: [
      { temp: 700, stress: 100, hours: 1000 },
      { temp: 800, stress:  50, hours: 1000 },
      { temp: 900, stress:  20, hours: 1000 },
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
  /* R129 — realProps lookup 도 HT multiplier 적용 (피크 baseline 가정).
            elevated_temp 은 HT-independent (온도 의존) → 그대로 유지. */
  const rp = realPropsFor(m.name);
  if (rp) {
    const multRp = htConditionMultiplier(m);
    const rpTag = (multRp.condTag && (multRp.f !== 1 || multRp.i !== 1))
      ? `realprops:${rp._key} × HT:${multRp.condTag} (f×${multRp.f}, i×${multRp.i})`
      : `realprops:${rp._key}`;
    if (rp.fatigue) {
      const scaled = rp.fatigue.map((v) => Math.round(v * multRp.f));
      m.ranges.fatigue_strength = rangeFrom(scaled, 'handbook');
      m.ranges.fatigue_strength.provenance = rpTag;
      m.fatigue_strength = m.ranges.fatigue_strength.typical;
      m.fatigue_estimated = false;
    }
    if (rp.impact && !m.ranges.impact_strength) {
      const scaledI = rp.impact.map((v) => Math.round(v * multRp.i));
      m.ranges.impact_strength = rangeFrom(scaledI, 'handbook');
      m.ranges.impact_strength.provenance = rpTag;
      m.impact_strength = m.ranges.impact_strength.typical;
    }
    if (rp.elevated_temp) m.elevated_temp = rp.elevated_temp;
  }
  /* R109 — alloy-specific fatigue + impact (handbook) 적용. realPropsFor 없을 때만 (realPropsFor 는 핵심 11종 고정밀).
     R129 — HT condition multiplier 적용: peak-aged baseline 대비 condition-scaled.
            provenance 필드로 출처/조정 명시. */
  const fi = alloyFatigueImpact(m.name);
  if (fi) {
    const mult = htConditionMultiplier(m);
    const tag = (mult.condTag && (mult.f !== 1 || mult.i !== 1 || mult.k !== 1))
      ? `alloy:${fi._key} × HT:${mult.condTag} (f×${mult.f}, i×${mult.i})`
      : `alloy:${fi._key}`;
    // fatigue: 기존이 없거나 derived (UTS×ratio) 이면 handbook 으로 덮어쓰기
    const fCur = m.ranges.fatigue_strength;
    if (!fCur || fCur.confidence === 'derived' || !(fCur.typical > 0)) {
      if (fi.fatigue) {
        const scaled = fi.fatigue.map((v) => Math.round(v * mult.f));
        m.ranges.fatigue_strength = rangeFrom(scaled, 'handbook');
        m.ranges.fatigue_strength.provenance = tag;
        m.fatigue_strength = m.ranges.fatigue_strength.typical;
        m.fatigue_estimated = false;
      }
    }
    // impact: 비어있으면 채우기 (기존 measured 가 있으면 유지)
    if (fi.impact && (!m.ranges.impact_strength || !(m.ranges.impact_strength.typical > 0))) {
      const scaledI = fi.impact.map((v) => Math.round(v * mult.i));
      m.ranges.impact_strength = rangeFrom(scaledI, 'handbook');
      m.ranges.impact_strength.provenance = tag;
      m.impact_strength = m.ranges.impact_strength.typical;
    }
  }
  // estimated fatigue (endurance) from UTS where no measured value — labelled as an estimate
  /* R129 — provenance 명시: family-level σf ≈ k·UTS ratio (Shigley/MMPDS family typical). */
  if (m.category !== 'Polymer' && !m.ranges.fatigue_strength && m.ranges.uts) {
    const f = m.families || [];
    const ratio = f.includes('Titanium-based') ? 0.55 : f.includes('Nickel-based') ? 0.40 : (f.includes('Aluminum-based') || f.includes('Copper-based') || f.includes('Magnesium-based')) ? 0.35 : 0.45;
    const famTag = f.includes('Titanium-based') ? 'Ti-based' : f.includes('Nickel-based') ? 'Ni-based' : (f.includes('Aluminum-based') ? 'Al-based' : f.includes('Copper-based') ? 'Cu-based' : f.includes('Magnesium-based') ? 'Mg-based' : 'Fe-based');
    const u = m.ranges.uts;
    m.ranges.fatigue_strength = {
      min: round(u.min * ratio), max: round(u.max * ratio), typical: round(u.typical * ratio),
      n: 0, estimated: true, confidence: 'derived',
      provenance: `family:${famTag} σf≈${ratio}·UTS (Shigley/MMPDS family typical)`
    };
    m.fatigue_strength = round(u.typical * ratio);
    m.fatigue_estimated = true;
  }
  /* R109 — impact_strength family typical fallback (alloy-specific 가 없을 때만).
     R129 — provenance 명시 + HT multiplier 적용. */
  if (!m.ranges.impact_strength && m.category !== 'Polymer') {
    const f = m.families || [];
    const sub = String(m.subcategory || '').toLowerCase();
    let imp = null;
    let subTag = null;
    if (sub.includes('austenitic') || /\b304\b|\b316\b|\b321\b|\b347\b/.test(m.name || '')) { imp = [80, 130, 180]; subTag = 'Stainless Austenitic'; }
    else if (sub.includes('ferritic')) { imp = [25, 50, 80]; subTag = 'Stainless Ferritic'; }
    else if (sub.includes('martensitic') || sub.includes('tool')) { imp = [4, 12, 25]; subTag = 'Martensitic/Tool steel'; }
    else if (sub.includes('ph') || sub.includes('precipitation')) { imp = [15, 30, 50]; subTag = 'PH stainless'; }
    else if (sub.includes('duplex')) { imp = [60, 100, 150]; subTag = 'Duplex stainless'; }
    else if (sub.includes('maraging')) { imp = [15, 22, 35]; subTag = 'Maraging steel'; }
    else if (f.includes('Iron-based')) { imp = [15, 35, 60]; subTag = 'Iron-based generic'; }  // 일반 강
    else if (f.includes('Aluminum-based')) { imp = [5, 10, 18]; subTag = 'Al-based'; }
    else if (f.includes('Titanium-based')) { imp = [15, 22, 30]; subTag = 'Ti-based'; }
    else if (f.includes('Nickel-based') || f.includes('Superalloy')) { imp = [30, 60, 100]; subTag = 'Ni-based superalloy'; }
    else if (f.includes('Cobalt-based')) { imp = [10, 25, 50]; subTag = 'Co-based'; }
    else if (f.includes('Copper-based')) { imp = [40, 80, 130]; subTag = 'Cu-based'; }
    else if (f.includes('Magnesium-based')) { imp = [3, 5, 8]; subTag = 'Mg-based'; }
    else if (f.includes('Refractory')) { imp = [10, 25, 50]; subTag = 'Refractory'; }
    if (imp) {
      const multImp = htConditionMultiplier(m);
      const scaledI = imp.map((v) => Math.round(v * multImp.i * 10) / 10);
      const provI = (multImp.condTag && multImp.i !== 1)
        ? `class:${subTag} × HT:${multImp.condTag} (i×${multImp.i})`
        : `class:${subTag}`;
      m.ranges.impact_strength = { min: scaledI[0], max: scaledI[2], typical: scaledI[1], n: 0, estimated: true, confidence: 'class', provenance: provI };
      m.impact_strength = scaledI[1];
    }
  }
  // class-typical physical & qualitative properties (handbook-level; flagged estimated)
  const ph = assignPhysicals(m);
  if (ph.qual) {
    m.corrosion_resistance = m.corrosion_resistance || ph.qual.corrosion;
    m.machinability = m.machinability || ph.qual.machinability;
    m.weldability = m.weldability || ph.qual.weldability;
  }
  /* R108 — alloy-specific handbook values (1차 자료 ASM/MMPDS/Special Metals) 우선 적용.
     ALLOY_SPECIFIC 테이블 에 매치되면 confidence='handbook', 안 매치되면 class fallback (assignPhysicals). */
  const sp = alloySpecificPhysicals(m.name);
  /* R126 — Fallback range 차별화. handbook 은 정밀 (min=typical=max), 그 외 level 별 spread 적용 → ranges 의 min/max 가 신뢰도 구간 표시.
     handbook: ±0%, subfamily: ±15%, family: ±30%, class: ±50% (단방향 적용 — 음수 보정). */
  const SPREAD_BY_CONF = { handbook: 0, subfamily: 0.15, family: 0.30, class: 0.50, derived: 0.40 };
  /* R209 A-8 — 음수 불가 물성 (clamp 0 안전). Tg/CTE/온도류는 음수 가능 → clamp 제외. */
  const NON_NEGATIVE = new Set(['density', 'yield_strength', 'uts', 'modulus', 'elongation', 'hardness',
    'thermal_conductivity', 'fatigue_strength', 'fracture_toughness', 'price_per_kg', 'price_per_cm3',
    'electrical_conductivity', 'specific_heat', 'max_service_temp', 'melting_point']);
  const setTyp = (k, v, conf) => {
    if (v == null) return;
    const c = conf || 'class';
    const spread = SPREAD_BY_CONF[c] ?? 0.50;
    /* R209 A-8 fix: lo/hi 를 min/max 로 안전 정렬. 음수 불가 물성만 0 clamp.
       이전: v 음수 (Tg) + Math.max(0) 로 min(0) > max(-180) 역전. */
    let lo = v * (1 - spread);
    let hi = v * (1 + spread);
    if (spread <= 0) { lo = v; hi = v; }
    if (NON_NEGATIVE.has(k)) { lo = Math.max(0, lo); hi = Math.max(0, hi); }
    const min = Math.min(lo, hi);
    const max = Math.max(lo, hi);
    m[k] = v;
    m.ranges[k] = { min: +min.toFixed(4), max: +max.toFixed(4), typical: v, n: 0, estimated: c !== 'handbook', confidence: c };
  };
  // 1) alloy-specific (handbook) 가 있으면 우선
  if (sp) {
    /* R129 — provenance tag: alloy-specific handbook lookup 의 매치 key 명시. */
    const spProv = `alloy:${sp._key}`;
    const setSp = (prop, val) => { setTyp(prop, val, 'handbook'); if (m.ranges[prop]) m.ranges[prop].provenance = spProv; };
    if (sp.ec != null) setSp('electrical_conductivity', sp.ec);
    if (sp.tmax != null) setSp('max_service_temp', sp.tmax);
    if (sp.cte != null) setSp('thermal_expansion', sp.cte);
    if (sp.poisson != null) setSp('poisson_ratio', sp.poisson);
    if (sp.cp != null) setSp('specific_heat', sp.cp);
    if (sp.melt != null) setSp('melting_point', sp.melt);
    if (sp.price != null) {
      setSp('price_per_kg', sp.price);
      if (m.density) setSp('price_per_cm3', +(sp.price * m.density / 1000).toFixed(4));
    }
    if (sp.kic != null && (m.ranges.fracture_toughness == null || !(m.ranges.fracture_toughness.typical > 0) || m.ranges.fracture_toughness.confidence === 'class')) {
      /* R129 — HT-aware KIC: peak-aged baseline 의 sp.kic 에 condition multiplier 곱. */
      const multK = htConditionMultiplier(m);
      const scaledKic = +(sp.kic * multK.k).toFixed(1);
      setTyp('fracture_toughness', scaledKic, 'handbook');
      if (m.ranges.fracture_toughness && multK.condTag && multK.k !== 1) {
        m.ranges.fracture_toughness.provenance = `alloy-specific KIC × HT:${multK.condTag} (k×${multK.k})`;
      } else if (m.ranges.fracture_toughness) {
        m.ranges.fracture_toughness.provenance = 'alloy-specific KIC';
      }
    }
  }
  /* R125c — class fallback 의 confidence 라벨을 fallback level 별로 차별화:
     - 3rd_family (가장 정밀, e.g. stainless-austenitic) → 'subfamily' 라벨 (사용자에게 가장 신뢰도 ↑)
     - 2nd_family (group, e.g. stainless general) → 'family'
     - 1st_family (category, e.g. Iron-based 일반 강) → 'class'
     R129 — provenance 명시: ph.level + matched key (sub/family name) — UI 에서 "어디서 fallback 됐는지" 표시 가능. */
  const phConf = ph.level === '3rd_family' ? 'subfamily' : ph.level === '2nd_family' ? 'family' : 'class';
  const phProv = `${ph.level || 'class'}:${ph._matchedKey || m.subcategory || (m.families || ['unknown'])[0]}`;
  const setPh = (prop, val) => { setTyp(prop, val, phConf); if (m.ranges[prop]) m.ranges[prop].provenance = phProv; };
  if (ph.ec != null && (m.ranges.electrical_conductivity == null || !(m.ranges.electrical_conductivity.typical > 0))) setPh('electrical_conductivity', ph.ec);
  if (ph.tmax != null && (m.ranges.max_service_temp == null || !(m.ranges.max_service_temp.typical > 0))) setPh('max_service_temp', ph.tmax);
  if (ph.cte != null && (m.ranges.thermal_expansion == null || !(m.ranges.thermal_expansion.typical > 0))) setPh('thermal_expansion', ph.cte);
  if (ph.poisson != null && (m.ranges.poisson_ratio == null || !(m.ranges.poisson_ratio.typical > 0))) setPh('poisson_ratio', ph.poisson);
  if (ph.cp != null && (m.ranges.specific_heat == null || !(m.ranges.specific_heat.typical > 0))) setPh('specific_heat', ph.cp);
  if (ph.melt != null && (m.ranges.melting_point == null || !(m.ranges.melting_point.typical > 0))) setPh('melting_point', ph.melt);
  /* R110 — Polymer Tg class fallback. polymers-data 19개는 handbook, 나머지 ~94 CSV polymer 는 family typical. */
  if (ph.tg != null && (m.ranges.glass_transition_temp == null || !(m.ranges.glass_transition_temp.typical > 0))) setPh('glass_transition_temp', ph.tg);
  if (ph.price != null && (m.ranges.price_per_kg == null || !(m.ranges.price_per_kg.typical > 0))) {
    setPh('price_per_kg', ph.price);
    if (m.density && (m.ranges.price_per_cm3 == null || !(m.ranges.price_per_cm3.typical > 0))) setPh('price_per_cm3', +(ph.price * m.density / 1000).toFixed(4));
  }
  /* R113 — Polymer family typical meta (flame UL94 / UV / moisture). polymers-data.json 19종 외 CSV 94종에 적용. */
  if (m.category === 'Polymer' && (!m.meta?.flame_ul94 || !m.meta?.uv_resistance || !m.meta?.moisture_24h)) {
    const n = String(m.name || '').toLowerCase();
    const s = String(m.subcategory || '').toLowerCase();
    const has = (re) => re.test(n) || re.test(s);
    let flame = null, uv = null, moisture = null;
    if (has(/peek|pekk|ultem|pei|pps\b|ppsu|pes|psu|vespel|polyimid/)) { flame = 'V-0'; uv = 'Fair'; moisture = 0.3; }
    else if (has(/pa12|nylon 12|polyamide 12/)) { flame = 'HB'; uv = 'Good'; moisture = 1.0; }
    else if (has(/pa66|nylon 66|polyamide 66/)) { flame = 'HB'; uv = 'Fair'; moisture = 2.8; }
    else if (has(/pa6|nylon 6|polyamide/)) { flame = 'HB'; uv = 'Fair'; moisture = 2.5; }
    else if (has(/polycarb|\blexan\b|\bpc\b/) && !has(/peek|pcm/)) { flame = 'V-2'; uv = 'Fair'; moisture = 0.15; }
    else if (has(/abs/)) { flame = 'HB'; uv = 'Poor'; moisture = 0.3; }
    else if (has(/pmma|acrylic/)) { flame = 'HB'; uv = 'Excellent'; moisture = 0.2; }
    else if (has(/petg/)) { flame = 'HB'; uv = 'Good'; moisture = 0.2; }
    else if (has(/pla/)) { flame = 'HB'; uv = 'Fair'; moisture = 0.5; }
    else if (has(/tpu|elastomer/)) { flame = 'HB'; uv = 'Good'; moisture = 0.4; }
    else if (has(/pom|acetal/)) { flame = 'HB'; uv = 'Fair'; moisture = 0.2; }
    else if (has(/\bpp\b|polypro/)) { flame = 'HB'; uv = 'Poor'; moisture = 0.02; }
    else if (has(/hdpe|ldpe|\bpe\b/)) { flame = 'HB'; uv = 'Poor'; moisture = 0.01; }
    else if (has(/epoxy/)) { flame = 'HB'; uv = 'Good'; moisture = 0.3; }
    else if (has(/polyester/)) { flame = 'HB'; uv = 'Good'; moisture = 0.3; }
    m.meta = m.meta || {};
    if (flame && !m.meta.flame_ul94) m.meta.flame_ul94 = flame;
    if (uv && !m.meta.uv_resistance) m.meta.uv_resistance = uv;
    if (moisture != null && m.meta.moisture_24h == null) m.meta.moisture_24h = moisture;
    if (!m.meta.polymer) m.meta.polymer = true;
  }
  // 인기도 (0–5) — 산업 사용 빈도 휴리스틱. 표준 합금 이름에 매칭하는 명시적 규칙.
  m.popularity = popularityFor(m);
  // F4: 가공·열처리 비용 가중치 — raw 단가만으로는 가공 단가를 추정하기 어려우므로 휴리스틱 적용.
  // machinability + HT 필드 + 합금 패턴 기반. 실수 (factor 가 음수 또는 0) 회피.
  /* R125 — Ceramic / Composite 은 절삭 자체 부적용 (grinding/EDM 별도 공정) + sintering 이 본체 공정.
     factor null 로 설정 → UI 카드 hide + Cost 영역에서도 표시 X. */
  if (m.category === 'Ceramic' || m.category === 'Composite') {
    m.machining_cost_factor = null;
    m.ht_cost_factor = null;
  } else {
    m.machining_cost_factor = machiningCostFactor(m);
    m.ht_cost_factor = htCostFactor(m);
  }
  /* R116 — 가격 다차원 모델:
     raw price = base material spot price (LME / vendor list, family typical 또는 ALLOY_SPECIFIC handbook)
     condition factor = heat treatment / temper 따른 가격 증가 (As-supplied 1.0 → STA 1.25 → HIP 1.60)
     form factor = process 형태 (Cast 1.0 → Wrought 1.05 → Cold-drawn 1.20 → AM powder 2.5-3.0)
     grade premium = 같은 family 내 grade 차이 (single crystal 4.0, Al-Li 1.30 등)
     delivered_price_per_kg = raw × condition × form × grade — 사용자에게 보다 의미 있는 단가. */
  m.price_condition_factor = priceConditionFactor(m);
  m.price_form_factor = priceFormFactor(m);
  m.price_grade_premium = priceGradePremium(m);
  if (m.price_per_kg != null && m.price_per_kg > 0) {
    const delivered = m.price_per_kg * m.price_condition_factor * m.price_form_factor * m.price_grade_premium;
    m.delivered_price_per_kg = +delivered.toFixed(2);
    // total_cost_estimate 도 delivered price 기반으로 (가공 + HT 처리 후 단가)
    m.total_cost_estimate = +(delivered * m.machining_cost_factor).toFixed(2);
    // delivered range 도 ranges 에 (sorting/filter 가능)
    m.ranges = m.ranges || {};
    m.ranges.delivered_price_per_kg = { min: m.delivered_price_per_kg, max: m.delivered_price_per_kg, typical: m.delivered_price_per_kg, n: 0, estimated: true, confidence: 'derived' };
  }
  /* R101 — price_per_cm3 fallback: price_per_kg + density 있으면 모든 material 에서 계산.
     기존 reference (assignPhysicals) 만 채우던 것 → ceramic/composite/polymer/CSV 모두 포함. */
  if (m.density != null && m.density > 0) {
    const pk = m.price_per_kg != null ? m.price_per_kg : (m.ranges?.price_per_kg?.typical);
    if (pk != null && pk > 0 && (m.price_per_cm3 == null || !(m.ranges?.price_per_cm3?.typical > 0))) {
      const pc = +(pk * m.density / 1000).toFixed(4);
      m.price_per_cm3 = pc;
      m.ranges = m.ranges || {};
      m.ranges.price_per_cm3 = { min: pc, max: pc, typical: pc, n: 0, estimated: true, confidence: 'derived' };
    }
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
// R52a — name-based 강제 매핑 (subcategory 잘못 부여된 raw rows 보정).
//   density 가 family typical 과 맞지 않는 사례 발견 (예: AA 3105 가 Stainless Steel - Austenitic,
//   Ti-5-2-5 가 Aluminum - Pure/Other, C36000 brass 가 Titanium 으로 들어옴).
//   alloy designation 이 매우 명확한 경우 (AA xxxx / Ti-X-Y / Cxxxxx) 이름으로 강제 재분류.
const NAME_BASED_OVERRIDE = [
  // R134a — Al-Li (2050/2090/2099/2195/2196/2198/2199) 별도 분리
  [/^aa\s?(?:2050|2090|2099|2195|2196|2198|2199)\b|\bal-?li\b/i, 'Aluminum - Lithium'],
  // R180 — AA series 별 정확 subcategory (aaSubcategory() 와 일관). 이전 단일 rule 이 모든 AA series 를
  //        'Aluminum - Pure/Other' 로 force 한 bug 수정 (AA 6063 / 6061 / 7075 잘못 분류).
  [/^aa\s?2\d{3}\b/i, 'Aluminum - Cu Alloys (2xxx)'],           // 2xxx Al-Cu
  [/^aa\s?3\d{3}\b/i, 'Aluminum - Mn Alloys (3xxx)'],           // 3xxx Al-Mn
  [/^aa\s?5\d{3}\b/i, 'Aluminum - Mg Alloys (5xxx)'],           // 5xxx Al-Mg
  [/^aa\s?[67]\d{3}\b/i, 'Aluminum - Si Alloys (6xxx/7xxx)'],   // 6xxx Al-Mg-Si, 7xxx Al-Zn-Mg
  [/^aa\s?1\d{3}\b|^aa\s?8\d{3}\b/i, 'Aluminum - Pure/Other'],  // 1xxx pure, 8xxx misc
  // Cast aluminum (A356, A357, A360, A380, A413 등) — 6xxx 와 함께 Si 계열로
  [/^a3(?:5[67]|60|80|13)\b|^alsi\d|^aa\s?a3\d{2}/i, 'Aluminum - Si Alloys (6xxx/7xxx)'],
  // Titanium — Ti-X-Y-Z, Ti CP, Ti grade N, beta-Ti aliases
  [/^ti[\s-]?(?:cp|grade)|^ti[\s-]?\d|^ti-\d|^β[\s-]?ti|beta[\s-]?ti/i, 'Titanium - Pure / CP Grades'],
  // Copper — Cxxxxx UNS designation
  [/^c\d{5}\b/i, 'Copper Alloy'],
  // Magnesium — AZ31/AZ91/WE43/ZK60 등
  [/^az\d{2}|^we\d{2}|^zk\d{2}|^am[\s-]?\d{2}|^ez33|^elektron/i, 'Magnesium Alloy'],
  // Nickel — Inconel xxx, Incoloy xxx, Hastelloy X
  [/^inconel|^incoloy|^hastelloy|^waspaloy|^nimonic|^monel|^haynes\s?\d|^rene\s?\d|^udimet/i, 'Nickel Superalloy'],
  // Stainless — SUS xxx, 304/316/etc.
  [/^sus\d{3}|^aisi\s?[3-4]\d{2}|^stainless|^17[\s-]?4\s?ph|^15[\s-]?5\s?ph/i, null], // 스테인리스는 sub family 별 매핑 — 일단 skip
];

function normalizeMetalSubcategory(m) {
  if (!m || m.category !== 'Metal') return;
  const name = String(m.name || '');
  // R52a — name-based 강제 매핑 우선 (raw data 의 잘못된 subcategory 보정)
  for (const [re, target] of NAME_BASED_OVERRIDE) {
    if (target && re.test(name)) { m.subcategory = target; return; }
  }
  const sub = String(m.subcategory || '');
  if (!sub) return;
  for (const [re, target] of METAL_SUB_RULES) {
    if (re.test(sub)) { m.subcategory = target; return; }
  }
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
  /* R111 — surface_finish & min_wall 은 "as-supplied" / "net-shape process" 에만 의미.
     Wrought/rolled/extruded/forged/machined/sheet metal 은 추가 후가공으로 결정 → null 반환 (UI N/A).
     Cast/AM/Injection/Sintered 만 의미 있는 값. tolerance_class 는 모두 유지. */
  if (has(/lpbf|slm|dmls/i)) return [0.4, 12, 'IT13-14'];
  if (has(/ebm|electron.?beam/i)) return [1.0, 30, 'IT14'];
  if (has(/binder.?jet/i)) return [0.5, 20, 'IT14-15'];
  if (has(/ded|directed.?energy|wire.?arc/i)) return [2.0, 50, 'IT15'];
  if (has(/investment|lost.?wax/i)) return [1.5, 3.2, 'IT11-13'];
  if (has(/die.?cast/i)) return [1.0, 0.8, 'IT11-12'];
  if (has(/sand.?cast|gravity.?cast/i)) return [3.0, 18, 'IT14-16'];
  if (has(/cast/i)) return [2.5, 12.5, 'IT13-14']; // 일반 주조
  if (has(/forg|forge/i)) return [null, null, 'IT12-14']; // Wrought 변형 → 후가공 의존, surface/wall 의미 X
  if (has(/rolled|wrought|extrud/i)) return [null, null, 'IT10-12']; // 후가공 의존, surface/wall 의미 X
  if (has(/injection|inject|molded/i)) return [0.8, 1.6, 'IT10-12'];
  if (has(/sheet.?metal|stamp/i)) return [null, null, 'IT11-12']; // 후가공 의존
  if (has(/machined|cnc/i)) return [0.2, 0.8, 'IT7-9']; // 정밀 가공 — 그대로 최종 surface
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

// R155 — htCostFactor, priceConditionFactor, priceFormFactor 는 scripts/lib/factors.mjs 로 이동.
// 단위 테스트 가능 (tests/build-factors.test.ts) + R152a 류 silent bug 회귀 방지.
// 본 file 의 import 문 (line ~18) 참조.

/* R116 — Grade premium within family. 같은 family 내 grade 차이 (이미 ALLOY_SPECIFIC 의 195 entry 는 base price 가 정확).
   여기서는 CSV/generic entry 의 grade-수준 premium 만 추정. AISI/SAE 번호 기반.
   주의: 4-digit 매치는 AISI/SAE 명시 prefix 또는 합금명 시작 위치만 사용 (e.g. "1065°C" 같은 temperature 매치 회피). */
// R156 — priceGradePremium 은 scripts/lib/factors.mjs 로 이동.


// ───────── validation report ─────────
const rawUnknownSrc = csvRows.filter(r => r.source === 'Unknown').length;
const rawCorrosion0 = csvRows.filter(r => r.corrosion_resistance === '0').length;
const rawFatigueEmpty = csvRows.filter(r => r.fatigue_strength === '').length;
let withVerifiedSrc = all.filter(m => m.sources.some(s => s.verified)).length; // R211 — 최종 source 상태(r173/2차 normalize) 후 재계산하므로 let.
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

    // R50b/R51c — family-aware σy/UTS ratio + modulus 범위 검사.
    // R51c: verified datasheet URL 있는 alloy 는 family 임계 skip (신뢰 출처 우선).
    const hasVerifiedSource = m.sources && m.sources.some(s => s.verified);
    if (sy != null && uts != null && uts > 0 && !hasVerifiedSource) {
      const ratio = sy / uts;
      const sub = String(m.subcategory || '');
      if (cat === 'Metal') {
        if (ratio > 1.01) push('high', 'σy/UTS > 1.01 (data error)', m, `${ratio.toFixed(2)} (σy=${sy}, UTS=${uts})`);
        else if (/Stainless Steel - Austenitic/.test(sub) && (ratio < 0.20 || ratio > 0.95))
          push('med', 'Austenitic SS σy/UTS out of [0.20, 0.95]', m, `${ratio.toFixed(2)}`);
        else if (/Carbon Steel/.test(sub) && (ratio < 0.35 || ratio > 0.95))
          push('low', 'Carbon Steel σy/UTS out of [0.35, 0.95]', m, `${ratio.toFixed(2)}`);
        else if (/Nickel Superalloy/.test(sub) && ratio > 0.99)
          push('med', 'Ni Superalloy σy/UTS > 0.99 (suspect)', m, `${ratio.toFixed(2)}`);
        else if (/Maraging/.test(sub) && ratio > 1.00)
          push('low', 'Maraging σy/UTS > 1.00', m, `${ratio.toFixed(2)}`);
        else if (/Titanium - α\+β/.test(sub) && (ratio < 0.75 || ratio > 0.99))
          push('low', 'Ti α+β σy/UTS out of [0.75, 0.99]', m, `${ratio.toFixed(2)}`);
        else if (/Tool Steel/.test(sub) && ratio > 0.99)
          push('low', 'Tool Steel σy/UTS > 0.99', m, `${ratio.toFixed(2)}`);
      }
      if (cat === 'Polymer' && ratio > 1.05) push('med', 'Polymer σy > UTS × 1.05', m, `${ratio.toFixed(2)}`);
    }

    const dens = typ(m, 'density');
    if (dens != null && (dens <= 0 || dens > 25)) push('high', 'density out of range', m, `${dens} g/cm³`);
    const E = typ(m, 'modulus');
    // 폴리머는 E ~0.0005 GPa (gel) 부터, silicone 0.005 GPa. 양의 값이면 OK. 음수·0 또는 > 1500 만 high.
    if (E != null && (E <= 0 || E > 1500)) push('high', 'modulus out of range', m, `${E} GPa`);
    // R50b/R51c — family-aware E typical 범위. verified 출처 있으면 skip.
    if (E != null && cat === 'Metal' && !hasVerifiedSource) {
      const sub = String(m.subcategory || '');
      // R51c — 임계 미세 완화 (β-Ti / Maraging / Cu-Be 포함 위해).
      if (/^Aluminum/.test(sub) && (E < 55 || E > 85)) push('low', 'Aluminum E out of [55, 85] GPa', m, `${E}`);
      else if (/^Titanium/.test(sub) && (E < 85 || E > 135)) push('low', 'Titanium E out of [85, 135] GPa', m, `${E}`);
      else if (/Stainless Steel|Carbon Steel|Alloy Steel|Tool Steel|Maraging/.test(sub) && (E < 175 || E > 225)) push('low', 'Steel family E out of [175, 225] GPa', m, `${E}`);
      // R71 B — Monel(Ni-Cu) · single-crystal(SX) · low-CTE Ni-Co (Inconel 783, Incoloy 909) · ODS 는 특수 합금 →
      //   E threshold 다름. 정상 분류이므로 anomaly 제외.
      else if (/Nickel Superalloy/.test(sub) && !/monel|cmsx|rene n|pwa14|ma754|ods|incoloy 909|inconel 783|single-crystal/i.test(m.name) && (E < 185 || E > 235)) push('low', 'Ni Superalloy E out of [185, 235] GPa', m, `${E}`);
      else if (/^Copper Alloy/.test(sub) && (E < 95 || E > 145)) push('low', 'Cu Alloy E out of [95, 145] GPa', m, `${E}`);
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

// Sprint1 B7 — cost data 시점 명시 (사용자가 raw price 가 언제 기준인지 알 수 있도록).
rep.push('## Cost Data Provenance', '');
rep.push('- Bulk pricing typical from **2026 Q1** snapshots (LME 2026-01 / Special Metals 2026 price book / MatWeb 2026).');
rep.push('- Actual quotes from vendors vary ±30% (volume, lead time, region).');
rep.push('- Tier 1 alloys (Inconel/Hastelloy/Ti): Special Metals / Haynes published list price.');
rep.push('- Tier 2 (Wrought 강·Al·Cu): LME spot + vendor markup ~15-30%.');
rep.push('- Polymer: resin grade pellet price (Victrex / SABIC / EOS published).');
rep.push('- AM powder: typical 2-4× wrought equivalent (atomization premium).');
rep.push('- **Refresh frequency**: quarterly. Last sync: 2026-Q1.');
rep.push('');
rep.push('## TODO', '- Hardness scale unification (HV/HRC/HB).', '- Reconcile fatigue/impact gaps where datasheets provide values.', '- (R34d candidate) Polymer creep rupture curves (PEEK / ULTEM / PEKK 100–200°C, 1000–10⁴ h).');

// R75/R78 — material-stories.json 주입. 우선순위:
//   (1) exact full name 매칭
//   (2) base name (split " — " 앞부분) 매칭
//   (3) prefix 매칭 (material name 이 stories key 로 시작) + word-boundary check (Inconel 718Plus 가 Inconel 718 prefix 와 잘못 매칭되는 것 방지)
// keys 는 길이 내림차순 정렬 → 더 specific 한 key 가 먼저 시도됨.
let storyAttached = 0;
try {
  const storiesFile = path.join(DATA, 'material-stories.json');
  // R149 — material-stories-r149.json (popularity ≥ 4 missing 122 entry 의 65 base group 신규 story) 도 함께 merge.
  const storiesR149File = path.join(DATA, 'material-stories-r149.json');
  // R177 — material-stories-r177.json (popularity 4.0-4.5 missing 28 entries 신규 story) merge.
  const storiesR177File = path.join(DATA, 'material-stories-r177.json');
  if (fs.existsSync(storiesFile)) {
    const sj = JSON.parse(fs.readFileSync(storiesFile, 'utf8'));
    const sMap = { ...(sj.stories || {}) };
    // Merge R149 stories (later override existing only if collision)
    if (fs.existsSync(storiesR149File)) {
      const sj149 = JSON.parse(fs.readFileSync(storiesR149File, 'utf8'));
      const sMap149 = sj149.stories || {};
      for (const [k, v] of Object.entries(sMap149)) {
        if (!sMap[k]) sMap[k] = v;
      }
    }
    // Merge R177 stories
    if (fs.existsSync(storiesR177File)) {
      const sj177 = JSON.parse(fs.readFileSync(storiesR177File, 'utf8'));
      const sMap177 = sj177.stories || {};
      for (const [k, v] of Object.entries(sMap177)) {
        if (!sMap[k]) sMap[k] = v;
      }
    }
    const sortedKeys = Object.keys(sMap).sort((a, b) => b.length - a.length);
    const lowerKeys = sortedKeys.map((k) => ({ orig: k, lower: k.toLowerCase() }));
    const isBoundary = (ch) => ch === undefined || ch === ' ' || ch === '—' || ch === '-' || ch === '(' || ch === ',';
    for (const m of all) {
      if (!m || !m.name) continue;
      const nameL = m.name.toLowerCase();
      let matchedKey = null;
      if (sMap[m.name]) matchedKey = m.name;
      if (!matchedKey) {
        const base = m.name.split(' — ')[0].trim();
        if (sMap[base]) matchedKey = base;
      }
      if (!matchedKey) {
        for (const { orig, lower } of lowerKeys) {
          if (nameL.startsWith(lower) && isBoundary(nameL[lower.length])) { matchedKey = orig; break; }
        }
      }
      if (matchedKey) {
        const story = sMap[matchedKey];
        if (story && typeof story === 'object' && story.text) {
          m.story = story.text;
          if (Array.isArray(story.refs) && story.refs.length) m.story_refs = story.refs;
          storyAttached++;
        }
      }
    }
  }
} catch (e) {
  console.warn('story injection skipped:', e?.message);
}
if (storyAttached) console.log(`R75/R78 — stories attached: ${storyAttached}`);

/* R139b — Impact strength typical (ASM) vs min_spec (vendor minimum) 표시.
   사용자 의사결정 도우미: 안전 임계 시 min spec 사용 권장. */
const IMPACT_MIN_SPECS = [
  // [pattern, min_spec value (J), source]
  [/maraging\s?250/i, 18, 'AMS 6512 minimum (vs ASM Vol.4 typical 32 J)'],
  [/maraging\s?300/i, 12, 'AMS 6514 minimum'],
  [/maraging\s?350|c-?350/i, 8, 'ATI C-350 minimum'],
  [/inconel\s?718.*sta|inconel\s?718\b/i, 27, 'AMS 5662 minimum (vs ASM 40 J typical)'],
  [/eh36|ah36|dh36/i, 27, 'ABS class minimum at -40°C (vs typical 70 J)'],
  [/a553.*type\s?i|9\s?%?\s?ni.*lng/i, 100, 'ASTM A553 Type I minimum at -196°C (vs typical 130 J)'],
  [/a572|a588|grade\s?50/i, 20, 'ASTM A572/A588 minimum'],
  [/api\s?5l.*x[6-8][05]/i, 40, 'API 5L PSL2 minimum'],
  [/dp\s?980|hct980x/i, 25, 'AHSS minimum (vs typical 40 J)'],
  [/zeron\s?100/i, 100, 'NACE ISO 15156 minimum'],
  [/custom\s?465.*h\s?950/i, 22, 'Carpenter Custom 465 H950 minimum'],
  [/ti-?6al-?4v.*grade\s?23|ti.*eli/i, 17, 'ASTM F136 ELI minimum (vs typical 24 J)'],
];
let impactMinSpecFilled = 0;
for (const m of all) {
  if (m.category !== 'Metal') continue;
  const r = m.ranges?.impact_strength;
  if (!r || r.typical == null) continue;
  const key = `${m.name} ${m.heat_treatment || ''} ${m.subcategory || ''}`;
  for (const [rx, minVal, src] of IMPACT_MIN_SPECS) {
    if (rx.test(key)) {
      r.min_spec_value = minVal;
      r.min_spec_source = src;
      r.spec_type = 'typical';
      impactMinSpecFilled++;
      break;
    }
  }
}
if (impactMinSpecFilled > 0) console.log(`R139b — Impact min_spec annotated: ${impactMinSpecFilled} entries`);

/* R133b — confidence_tier 자동 부여.
   사용자 요청: "재료가 없으면 표시하지 않는것도 하나의 방법".
   기준:
   - high: verified source ≥2 OR (measured props ≥4 + verified ≥1)
   - medium: verified ≥1 OR (handbook props ≥6 + safety props 신뢰 OK)
   - medium-low: verified=0 + handbook < 6
   - low: verified=0 + safety props 전부 family/class/derived + 대체 anchor 존재
   UI 는 default 로 high+medium 만 표시, "show low-confidence" toggle 로 medium-low+low 노출. */
/* R209 — source 신뢰성 정규화 helper (A-1 / A-7 / A-10).
   ⚠️ idempotent — 여러 번 호출해도 안전. R173/R199 source 재주입 후에도 다시 적용해 matweb 등 강등 보장.
   1차: confidence_tier 산정 직전 (tier 점수 정확화). 2차: 모든 source 조작 후 최종 (재주입분 정리). */
let _r208Map = null, _r208Downgrade = null;
function normalizeSources(list, { demoteMock = false } = {}) {
  if (_r208Map === null) {
    _r208Map = {}; _r208Downgrade = [];
    try {
      const r208 = JSON.parse(fs.readFileSync(path.join(DATA, 'r208-url-replacements.json'), 'utf8'));
      _r208Map = r208.replacements || {};
      _r208Downgrade = r208.downgrade_to_unverified || [];
    } catch { /* optional */ }
  }
  const UNTRUSTED_RE = [
    /matweb\.com\//i,                 // MatWeb 전체 (검색·deep link 모두 2차 집계, vendor 1차 자료 아님)
    /\/\/[^/]+\/?$/,                  // 도메인 루트만 (granta.com/ 등)
    /wikipedia\.org/i,                // 위키백과
    /makeitfrom\.com/i,               // 집계 사이트
    /\/blog\//i,                      // 블로그 글
    /aircraftmaterials\.com\/data\/[a-z]+\.html$/i, // 카테고리 인덱스 (개별 시트 아님)
  ];
  const isUntrusted = (url) => !!url && (UNTRUSTED_RE.some(re => re.test(url)) || _r208Downgrade.some(p => url.startsWith(p)));
  const softenLabel = (label, url) => {
    if (!label) return label;
    if (/matweb\.com/i.test(url)) return label.replace(/\bdatasheet\b/i, 'MatWeb');
    return label.replace(/\bDatasheet\b/g, 'Reference').replace(/\bdatasheet\b/g, 'reference').replace(/\bhandbook\b/gi, 'reference');
  };
  let replaced = 0, down = 0, mockDemoted = 0;
  for (const m of list) {
    if (Array.isArray(m.sources)) {
      for (const s of m.sources) {
        if (!s || typeof s.url !== 'string') continue;
        if (_r208Map[s.url]) { s.url = _r208Map[s.url]; replaced++; }
        if (s.verified === true && isUntrusted(s.url)) {
          s.verified = false;
          if (s.label) s.label = softenLabel(s.label, s.url);
          down++;
        }
      }
    }
    /* A-10 — generic tier 의 spurious 'measured' 라벨 강등 (verified datasheet 0개 + n≤1 mock signature). */
    if (demoteMock && m.tier === 'generic') {
      const hasVerified = (m.sources || []).some(s => s.verified);
      if (!hasVerified) {
        const MEAS_PROPS = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity', 'fatigue_strength'];
        for (const p of MEAS_PROPS) {
          const r = m.ranges?.[p];
          if (r && r.confidence === 'measured' && (r.n == null || r.n <= 1)) { r.confidence = 'handbook'; mockDemoted++; }
        }
      }
    }
  }
  return { replaced, down, mockDemoted };
}
{
  const r = normalizeSources(all, { demoteMock: true });
  console.log(`R209 — source 정규화(1차): ${r.replaced} URL 교체 · ${r.down} verified=false 강등 · ${r.mockDemoted} mock-measured→handbook`);
}

const CONF_W = { measured: 4, handbook: 3, subfamily: 1.5, family: 0.5, class: 0.2, derived: 0.1 };
const CORE_PROPS_C = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];
const SAFETY_PROPS_C = ['fatigue_strength', 'impact_strength', 'fracture_toughness'];
/* R211 — confidence_tier 계산을 함수화 (verified source 수에 의존하므로 r173 patch + 2차 normalize 후 재계산 필요). */
function assignConfidenceTiers() {
  const tc = { high: 0, medium: 0, 'medium-low': 0, low: 0 };
  for (const m of all) {
    let coreScore = 0, safetyScore = 0, measuredCount = 0, handbookCount = 0;
    for (const p of CORE_PROPS_C) {
      const c = m.ranges?.[p]?.confidence;
      coreScore += CONF_W[c] || 0;
      if (c === 'measured') measuredCount++;
      if (c === 'handbook') handbookCount++;
    }
    for (const p of SAFETY_PROPS_C) {
      const c = m.ranges?.[p]?.confidence;
      safetyScore += CONF_W[c] || 0;
    }
    const verified = (m.sources || []).filter(s => s.verified).length;
    let tier;
    if (verified >= 2 || (measuredCount >= 4 && verified >= 1)) tier = 'high';
    else if (verified >= 1 || (handbookCount >= 6 && safetyScore >= 3)) tier = 'medium';
    else if (handbookCount >= 4 || safetyScore >= 1.5) tier = 'medium-low';
    else tier = 'low';
    m.confidence_tier = tier;
    tc[tier]++;
  }
  return tc;
}
let tierCounts = assignConfidenceTiers();
console.log(`R133b — confidence_tier (1차): high=${tierCounts.high}, medium=${tierCounts.medium}, medium-low=${tierCounts['medium-low']}, low=${tierCounts.low}`);

// R146 — Cost data Q2 2026 verified backfill.
//   data/cost-verified-q2-2026.json 의 24 alloy 의 시장 단가 → ranges.price_per_kg.confidence='measured' +
//   provenance + meta.price_verified_date 부여. UI 에 "verified YYYY-MM" badge 표시.
try {
  const costRaw = JSON.parse(fs.readFileSync(path.join(DATA, 'cost-verified-q2-2026.json'), 'utf8'));
  const costEntries = Object.entries(costRaw.prices || {});
  let priceUpgraded = 0;
  for (const [alloyKey, info] of costEntries) {
    const sub = info.match_substring.toLowerCase();
    // Apply to all material whose name contains the substring (e.g., '316l' → '316L — Annealed', 'as-built', etc.)
    for (const m of all) {
      if (!m.name || !m.name.toLowerCase().includes(sub)) continue;
      if (!m.ranges) m.ranges = {};
      const cur = m.ranges.price_per_kg || {};
      m.ranges.price_per_kg = {
        ...cur,
        ...info.price_per_kg,
        provenance: info.provenance,
        n: Math.max(cur.n || 0, 1),
      };
      if (!m.meta) m.meta = {};
      m.meta.price_verified_date = info.price_verified_date;
      m.meta.price_verified_source = alloyKey;
      priceUpgraded++;
    }
  }
  console.log(`R146 — price verified backfill: ${priceUpgraded} material price entries upgraded (Q2 2026)`);
} catch (e) {
  console.warn('R146 cost backfill skipped:', e.message);
}

// R145+R150+R151 — Composite + Polymer measured value backfill (multi-round).
//   R145: data/composite-polymer-measured-backfill.json — 8 composite + 8 polymer (16 entry)
//   R150: data/composite-polymer-measured-backfill-r150.json — MMC/CMC/Foam/Honeycomb + elev-temp curve (12 entry)
//   R151: data/polymer-elevtemp-backfill-r151.json — 13 high-temp polymer 의 elevated_temp 5-point curve
//   confidence: handbook → measured (verified datasheet) 로 upgrade + 정확 composition 부여.
//   match: name 의 처음 부분 (paren 이전) 으로 fuzzy match → ranges + composition + industry_note merge.
try {
  const backfillRaw = JSON.parse(fs.readFileSync(path.join(DATA, 'composite-polymer-measured-backfill.json'), 'utf8'));
  /* R150 — second-round backfill (MMC + CMC + AFK + Pitch CFRP + elev-temp curves). */
  let r150Raw = { composites: {}, polymers: {} };
  try {
    r150Raw = JSON.parse(fs.readFileSync(path.join(DATA, 'composite-polymer-measured-backfill-r150.json'), 'utf8'));
  } catch { /* optional */ }
  /* R151 — high-temp polymer elevated_temp curve backfill (13 entry). */
  let r151Raw = { polymers: {} };
  try {
    r151Raw = JSON.parse(fs.readFileSync(path.join(DATA, 'polymer-elevtemp-backfill-r151.json'), 'utf8'));
  } catch { /* optional */ }
  const allBackfill = {
    ...(backfillRaw.composites || {}),
    ...(backfillRaw.polymers || {}),
    ...(r150Raw.composites || {}),
    ...(r150Raw.polymers || {}),
    ...(r151Raw.polymers || {}),
  };
  let upgraded = 0;
  for (const [bfName, bf] of Object.entries(allBackfill)) {
    // Find best matching material — exact name first, then base-name match
    let target = all.find(m => m.name === bfName);
    if (!target) {
      const bfBase = bfName.split(' (')[0].split(' — ')[0].toLowerCase().trim();
      target = all.find(m => m.name && m.name.toLowerCase().startsWith(bfBase));
    }
    if (!target) continue;
    // Merge composition (overwrite empty array/object)
    if (bf.composition) {
      const cur = target.composition;
      const isEmpty = !cur ||
        (Array.isArray(cur) && !cur.length) ||
        (typeof cur === 'object' && !Array.isArray(cur) && !Object.keys(cur).length);
      if (isEmpty) target.composition = bf.composition;
    }
    // Merge ranges (preserve existing measured, overwrite handbook/class)
    if (bf.ranges) {
      if (!target.ranges) target.ranges = {};
      for (const [prop, range] of Object.entries(bf.ranges)) {
        const cur = target.ranges[prop];
        if (!cur || cur.confidence !== 'measured') {
          target.ranges[prop] = { ...(cur || {}), ...range, n: Math.max(cur?.n || 0, 1) };
        }
      }
    }
    if (bf.industry_note && !target.industry_note) target.industry_note = bf.industry_note;
    // R150 — elevated_temp curve merge (overwrite if backfill has 5+ points)
    if (Array.isArray(bf.elevated_temp) && bf.elevated_temp.length >= 3) {
      target.elevated_temp = bf.elevated_temp;
    }
    // Boost tier: reference handbook → curated for measured + verified
    if (target.tier === 'reference' && bf.ranges && Object.values(bf.ranges).some(r => r.confidence === 'measured')) {
      target.tier = 'am_vendor'; // 'am_vendor' tier = vendor-verified non-AM data 의 의미로 재사용
    }
    upgraded++;
  }
  console.log(`R145 — composite/polymer measured backfill: ${upgraded}/${Object.keys(allBackfill).length} entries upgraded`);
} catch (e) {
  console.warn('R145 backfill skipped:', e.message);
}

/* R173 Phase B — Handbook source / industry_note patch (비파괴적 후처리).
 *   data/r173-handbook-sources.json 의 alloy-name regex 패턴 매칭 → 모든 matching entry 에
 *   verified handbook sources merge + R173 industry_note prepend.
 *   기존 entries (variants 포함) 보존 — 새 entry 추가하지 않음. CSV variant 흡수 방지.
 *
 * R185/R186 — industry_note cleanup 함수 hoist (file-level scope, 전체 entries 적용 가능).
 */
function stripIndustryDevNotes(s) {
  return String(s || '')
    .replace(/⚠[^.。]*\b(?:entry|정정|표기|source|R\d+|mock|fake|drop|dedup|patched|verbatim|MatWeb)\b[^.。]*[.。]\s*/g, '')
    .replace(/\(\s*R\d+\s*[—–-]?\s*[^)]{1,80}\)\s*/g, '')
    .replace(/R\d+\s*[—–-]\s*/g, '')
    .replace(/(?:Annealed|Hardened|Normalized|Q\+T|Aged|Solution|STA|HIP|As-built|As-supplied|Tempered|Cast|AM\s+as-built|Oil-quenched|Water-quenched|Heat-treated|Standard\s+\w+\s+cycle|HT\s+cycle)\b[^.。]*?(?:σy|UTS|HRC|HB|El|HV)\s*\d[^.。]*[.。]\s*/gi, '')
    .replace(/(?:Standard\s+\w+\s+cycle|HT\s+cycle)[^.。]*\d+°C[^.。]*[.。]\s*/gi, '')
    .replace(/\([^)]*°C[^)]*(?:oil\s*Q|water\s*Q|WQ|OQ|AC|FC|temper|peak)[^)]*\)\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function capIndustryLength(s) {
  /* R186 — guideline target 150-300 chars. Hard cap 450 (median + safe margin).
   * 첫 4 sentence 또는 450 chars 중 먼저 도달하는 한계. */
  const cleaned = String(s || '').trim();
  if (cleaned.length <= 450) return cleaned;
  const sentences = cleaned.match(/[^.。!?\n]+[.。!?\n]?/g) || [cleaned];
  let out = '';
  for (const sent of sentences) {
    if (out.length + sent.length > 450) break;
    out += sent;
    if ((out.match(/[.。!?]/g) || []).length >= 4) break;
  }
  return out.trim() || cleaned.slice(0, 450).trim();
}
try {
  const r173Raw = JSON.parse(fs.readFileSync(path.join(DATA, 'r173-handbook-sources.json'), 'utf8'));
  const patches = r173Raw.patches || [];
  let r173Touched = 0;
  let r173SourcesAdded = 0;
  let r173NotesAdded = 0;
  const r173Hits = {};
  for (const patch of patches) {
    const rx = new RegExp(patch.pattern, 'i');
    for (const m of all) {
      if (!rx.test(m.name || '')) continue;
      r173Touched++;
      r173Hits[patch._alloy] = (r173Hits[patch._alloy] || 0) + 1;
      // Merge sources — dedupe by URL (more robust than label)
      if (Array.isArray(patch.sources) && patch.sources.length) {
        if (!Array.isArray(m.sources)) m.sources = [];
        const seenUrls = new Set(m.sources.map(s => (s && s.url) ? String(s.url).toLowerCase() : null).filter(Boolean));
        for (const s of patch.sources) {
          const url = s && s.url ? String(s.url).toLowerCase() : null;
          if (url && !seenUrls.has(url)) {
            m.sources.push(s);
            seenUrls.add(url);
            r173SourcesAdded++;
          }
        }
      }
      // Industry_note — prepend handbook note if not already applied (track via meta flag).
      // R185 — UI 노출 텍스트 cleanup:
      //   (1) R### prefix 제거
      //   (2) 개발자 메모 (⚠ entry / MatWeb 표기 / R### 정정 / fake-variant) strip
      //   (3) `||` → `\n\n` paragraph break (가독성)
      //   (4) 두 note 가 동일 substring 이면 dedup
      if (patch.industry_note) {
        if (!m.meta) m.meta = {};
        if (!m.meta._r173_note_applied) {
          const cleanedPatch = stripIndustryDevNotes(patch.industry_note);
          const cleanedExisting = stripIndustryDevNotes(m.industry_note);
          /* R185 — Dedup logic:
           *   patch (R173 handbook, curated) 가 표준 source. supplementary 의 verbose 는 fallback.
           *   - substring 관계 (one includes other) → 긴 것 keep
           *   - word overlap > 50% → patch keep (R173 handbook 우선)
           *   - 그 외 → 두 paragraph merge */
          let merged;
          if (!cleanedExisting) {
            merged = cleanedPatch;
          } else if (cleanedPatch.includes(cleanedExisting)) {
            merged = cleanedPatch;
          } else if (cleanedExisting.includes(cleanedPatch)) {
            merged = cleanedExisting;
          } else {
            // Word overlap check
            const tokenize = (s) => new Set(s.toLowerCase().match(/[a-z가-힣0-9]+/g) || []);
            const wPatch = tokenize(cleanedPatch);
            const wExist = tokenize(cleanedExisting);
            let common = 0;
            for (const w of wPatch) if (wExist.has(w)) common++;
            const overlap = common / Math.min(wPatch.size, wExist.size);
            // > 50% overlap → patch only (handbook 우선). 그 외 → merge.
            merged = overlap > 0.5 ? cleanedPatch : `${cleanedPatch}\n\n${cleanedExisting}`;
          }
          m.industry_note = capIndustryLength(merged);
          m.meta._r173_note_applied = true;
          r173NotesAdded++;
        }
      }
    }
  }
  console.log(`R173 Phase B — handbook patch: ${r173Touched} entries matched across ${patches.length} alloy patterns`);
  console.log(`  sources added: ${r173SourcesAdded}, industry_notes added: ${r173NotesAdded}`);
  for (const [alloy, count] of Object.entries(r173Hits).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${alloy}: ${count} entries`);
  }
} catch (e) {
  console.warn('R173 Phase B handbook patch skipped:', e.message);
}

/* R186 — Final industry_note cleanup pass. R173 patch 없는 entries (supplementary only) 도
 *        같은 dev-note strip + length cap 적용. 사용자 노출 일관성 보장. */
{
  let cleaned = 0, capped = 0;
  for (const m of all) {
    if (!m.industry_note) continue;
    const before = m.industry_note;
    const beforeLen = before.length;
    const stripped = stripIndustryDevNotes(before);
    const capped2 = capIndustryLength(stripped);
    if (capped2 !== before) {
      m.industry_note = capped2;
      cleaned++;
      if (capped2.length < beforeLen - 50) capped++;
    }
  }
  console.log(`R186 — industry_note final cleanup: ${cleaned} entries modified (${capped} significantly truncated)`);
}

/* R191 — Proprietary alloy manufacturer override.
 *   Reference data (supplementary loader default) 를 정확한 OEM 으로 교체.
 *   data/r191-proprietary-alloys.json 의 pattern 매칭 entries 만 적용. */
try {
  const r191Raw = JSON.parse(fs.readFileSync(path.join(DATA, 'r191-proprietary-alloys.json'), 'utf8'));
  const patterns = (r191Raw.patterns || []).map(p => ({ ...p, _rx: new RegExp(p.pattern, 'i') }));
  let r191Touched = 0;
  const r191Hits = {};
  for (const m of all) {
    if (!m || !m.name) continue;
    // Only override 'Reference data' or empty manufacturer (curated AM vendors 보존)
    const mfs = m.manufacturers || [];
    const isRefOnly = mfs.length === 0 || (mfs.length === 1 && mfs[0] === 'Reference data');
    if (!isRefOnly) continue;
    for (const p of patterns) {
      if (p._rx.test(m.name)) {
        m.manufacturers = [p.manufacturer];
        m.manufacturer = p.manufacturer;
        r191Touched++;
        r191Hits[p._alloy || p.pattern] = (r191Hits[p._alloy || p.pattern] || 0) + 1;
        break;
      }
    }
  }
  console.log(`R191 — proprietary alloy manufacturer override: ${r191Touched} entries matched across ${patterns.length} patterns`);
  const topHits = Object.entries(r191Hits).sort((a, b) => b[1] - a[1]).slice(0, 12);
  for (const [alloy, count] of topHits) console.log(`    ${alloy}: ${count} entries`);
} catch (e) {
  console.warn('R191 proprietary alloy override skipped:', e.message);
}

/* R173 Phase B — Range overrides for entries with verified handbook errors.
 *   data/r173-range-overrides.json 의 exact-name 매칭 시 ranges 의 typical/min/max 를 정정값으로 교체.
 *   (sources 와 다르게 정확한 entry name 매칭만 — accidental over-replacement 방지)
 */
try {
  const r173RangesRaw = JSON.parse(fs.readFileSync(path.join(DATA, 'r173-range-overrides.json'), 'utf8'));
  const overrides = r173RangesRaw.overrides || [];
  let r173RangesApplied = 0;
  let r173PropsOverridden = 0;
  let r173CompositionOverridden = 0;
  for (const ov of overrides) {
    const target = all.find(m => m.name === ov.name);
    if (!target) {
      console.warn(`  ⚠ R173 range override target not found: ${ov.name}`);
      continue;
    }
    if (!target.ranges) target.ranges = {};
    for (const [prop, newRange] of Object.entries(ov.ranges || {})) {
      target.ranges[prop] = { ...(target.ranges[prop] || {}), ...newRange };
      r173PropsOverridden++;
    }
    // R173 — composition override 도 지원 (예: AISI 4340/4130 의 Al 97.5% 오류)
    if (ov.composition) {
      target.composition = ov.composition;
      r173CompositionOverridden++;
    }
    r173RangesApplied++;
  }
  console.log(`R173 Phase B — range overrides: ${r173RangesApplied}/${overrides.length} entries overridden, ${r173PropsOverridden} properties + ${r173CompositionOverridden} compositions corrected`);
} catch (e) {
  console.warn('R173 Phase B range overrides skipped:', e.message);
}

/* R199 — regex-pattern range + composition overrides (multiple entries 일괄 처리).
 *   data/r199-stainless-overrides.json — CSV mock 값 (304/304L/310/316/321/347 + Inconel 100) 정정. */
try {
  const r199Raw = JSON.parse(fs.readFileSync(path.join(DATA, 'r199-stainless-overrides.json'), 'utf8'));
  const r199Over = r199Raw.overrides || [];
  let r199Applied = 0;
  let r199Props = 0;
  let r199Comps = 0;
  for (const ov of r199Over) {
    const re = new RegExp(ov.namePattern);
    const targets = all.filter(m => re.test(m.name || ''));
    for (const t of targets) {
      if (!t.ranges) t.ranges = {};
      for (const [prop, newRange] of Object.entries(ov.ranges || {})) {
        // R199 — generic tier 의 'measured' tag 는 CSV mock 에 spuriously 부여된 경우가 많아
        //         hand-verified handbook 값을 force override.
        //         단 reference/curated tier 의 measured 는 보존 (vendor datasheet).
        if (t.ranges[prop]?.confidence === 'measured' && t.tier !== 'generic' && t.tier !== 'am_vendor') continue;
        t.ranges[prop] = { ...(t.ranges[prop] || {}), ...newRange };
        if (newRange.typical != null) t[prop] = newRange.typical;
        r199Props++;
      }
      // composition override (Inconel 100 같은 mock 정정)
      if (ov.composition) {
        t.composition = { ...ov.composition };
        r199Comps++;
      }
      r199Applied++;
    }
  }
  console.log(`R199 — overrides: ${r199Applied} entries / ${r199Props} props / ${r199Comps} compositions corrected`);
} catch (e) {
  console.warn('R199 overrides skipped:', e.message);
}

/* R199 — source URL verification (handbook URL mapping for generic tier).
 *   data/r199-source-urls.json — base alloy 별 regex → verified source 추가/교체. */
try {
  const r199SrcRaw = JSON.parse(fs.readFileSync(path.join(DATA, 'r199-source-urls.json'), 'utf8'));
  const mappings = r199SrcRaw.mappings || [];
  let srcAdded = 0;
  let srcTouched = new Set();
  for (const map of mappings) {
    const re = new RegExp(map.namePattern);
    const targets = all.filter(m => re.test(m.name || ''));
    for (const t of targets) {
      // 이미 verified 인 source 가 있으면 skip
      if (Array.isArray(t.sources) && t.sources.some(s => s.verified)) continue;
      if (!Array.isArray(t.sources)) t.sources = [];
      // unverified sources 는 유지하되 verified handbook source 를 앞에 추가
      t.sources.unshift({ ...map.source });
      srcAdded++;
      srcTouched.add(t.name);
    }
  }
  console.log(`R199 — source URL verification: ${srcAdded} sources added to ${srcTouched.size} entries`);
  /* R209 2차 — R173/R199 가 재주입한 matweb·wiki·blog source 를 다시 강등 (idempotent). */
  const r2 = normalizeSources(all);
  console.log(`R209 — source 정규화(2차, 재주입분): ${r2.replaced} URL 교체 · ${r2.down} verified=false 강등`);

  /* R211 — r173 patch(+2차 normalize)로 추가/강등된 verified 출처를 반영해 confidence_tier·verified 카운트 최종 재계산.
     (1차 계산은 r173 patch 이전이라 신규 출처 미반영.) */
  tierCounts = assignConfidenceTiers();
  withVerifiedSrc = all.filter(m => m.sources.some(s => s.verified)).length;
  console.log(`R211 — confidence_tier (최종, r173 반영): high=${tierCounts.high}, medium=${tierCounts.medium}, medium-low=${tierCounts['medium-low']}, low=${tierCounts.low} · verified-src ${withVerifiedSrc}/${all.length}`);
} catch (e) {
  console.warn('R199 source URL overrides skipped:', e.message);
}

/* R205 — 신뢰성 전수 audit 정정 loader.
 *   data/r205-reliability-overrides.json — R199/R201 적용 *후* 실행 (per-condition 세분화 정정).
 *   지원: ranges (강제) + composition + qual (machinability/weldability/corrosion_resistance) + subcategory. */
try {
  const r205Raw = JSON.parse(fs.readFileSync(path.join(DATA, 'r205-reliability-overrides.json'), 'utf8'));
  const r205Over = r205Raw.overrides || [];
  let n205 = 0, p205 = 0, q205 = 0, s205 = 0;
  for (const ov of r205Over) {
    const re = new RegExp(ov.namePattern);
    const targets = all.filter(m => re.test(m.name || ''));
    for (const t of targets) {
      if (ov.ranges) {
        if (!t.ranges) t.ranges = {};
        for (const [prop, newRange] of Object.entries(ov.ranges)) {
          t.ranges[prop] = { ...(t.ranges[prop] || {}), ...newRange };
          if (newRange.typical != null) t[prop] = newRange.typical;
          p205++;
        }
      }
      if (ov.composition) t.composition = { ...ov.composition };
      if (ov.qual) {
        if (ov.qual.machinability) t.machinability = ov.qual.machinability;
        if (ov.qual.weldability) t.weldability = ov.qual.weldability;
        if (ov.qual.corrosion_resistance) t.corrosion_resistance = ov.qual.corrosion_resistance;
        q205++;
      }
      if (ov.subcategory) { t.subcategory = ov.subcategory; s205++; }
      /* R209 — composition/subcategory override 후 families 재계산 (line 2946 의 stale 태그 교체).
         손상 조성으로 'Titanium-based' 등 오태깅된 황동/Zr 을 정정 조성 기준으로 재산출. */
      if (ov.composition || ov.subcategory) {
        t.families = familyTags(t.category, t.subcategory, t.composition);
      }
      n205++;
    }
  }
  console.log(`R205 — reliability overrides: ${n205} entries / ${p205} props / ${q205} qual / ${s205} subcat`);
} catch (e) {
  console.warn('R205 reliability overrides skipped:', e.message);
}

/* R205-P — Polymer 정책: corr → 내화학성 차별화 / weld → 열가소성·열경화성·엘라스토머 분류.
 *   사용자 정책: "폴리머에 (금속식) corr/weld 적용 X — 내화학성 + 열가소성 분류로 대체."
 *   내화학성 출처: Plastics Design Library Chemical Resistance + vendor datasheets. */
{
  const CHEM_MAP = [
    [/ptfe|teflon|pfa\b/i, 'Outstanding'],
    [/peek|pekk|pps\b|fortron|pvdf|pbi|celazole|pctfe|etfe|lcp|vectra|polyimide|vespel|torlon|pai\b|uhmwpe|hdpe|ldpe|\bpe\b|polypropylene|\bpp\b|kepstan|antero|ketaspire/i, 'Excellent'],
    [/pom|acetal|delrin|hostaform|pa1[12]\b|nylon 1[12]|rilsan|pbt|pet\b|pet-|rynite|psu\b|ppsu|pesu|pes\b|udel|radel|eviva|pei\b|ultem|epoxy|pvc|tpu|silicone|pa46|stanyl|onyx/i, 'Good'],
    [/pa6\b|pa66|nylon 6|ultramid|zytel|polycarbonate|\bpc\b|lexan|makrolon|pmma|acrylic|plexiglas|abs|asa\b|polystyrene|\bps\b|hips|gpps|petg|pla\b|tritan|eva\b|tpe\b|pvb|pcl|pha\b|polyester resin|polyurethane/i, 'Moderate'],
  ];
  const THERMOSET_RE = /epoxy resin|polyester resin|polyurethane \(cast/i;
  const ELASTOMER_RE = /silicone rubber|tpe\b|tpu\b|eva\b|rubber/i;
  let chemN = 0;
  for (const m of all) {
    if (m.category !== 'Polymer') continue;
    const key = `${m.name} ${m.subcategory || ''}`;
    // 내화학성 (corrosion_resistance 필드 재사용 — UI 라벨은 별도)
    const chem = CHEM_MAP.find(([re]) => re.test(key));
    m.corrosion_resistance = chem ? chem[1] : 'Good';
    // 열가소성/열경화성/엘라스토머 분류 (weldability 필드 재사용)
    if (THERMOSET_RE.test(key)) m.weldability = 'Thermoset';
    else if (ELASTOMER_RE.test(key)) m.weldability = 'Elastomer';
    else m.weldability = 'Thermoplastic';
    // machinability: elastomer 절삭 곤란 / GF·CF-filled 공구마모 ↑
    if (ELASTOMER_RE.test(key)) m.machinability = 'Poor';
    else if (/gf\d|cf\b|carbon fiber|glass.fi|gf30|gf40|gf50|scf/i.test(key)) m.machinability = 'Fair';
    else m.machinability = 'Good';
    chemN++;
  }
  console.log(`R205-P — polymer 내화학성/열가소성 재분류: ${chemN} entries`);
}

/* R205-R — 파생값 재계산 pass (override 적용 *후* 실행 필수).
 *   1) stale fatigue: R205 가 UTS 를 정정한 entries 의 σf 가 옛 UTS 기준 유도값으로 남음
 *      → ratio 비정상 (fat>UTS or fat/UTS>0.8 or <0.12) 시 family ratio 로 재유도.
 *      cellular (foam/honeycomb) 은 피로 의미 없음 → 제거.
 *   2) price_per_cm3 = price_per_kg × ρ / 1000 최종 재계산 (alloy-specific price 적용 전 값으로
 *      계산된 stale 96 entries 정합화). */
{
  const typ = (m, k) => { const r = (m.ranges || {})[k]; const v = r?.typical ?? m[k]; return (typeof v === 'number' && isFinite(v)) ? v : null; };
  let fatFixed = 0, fatDropped = 0, priceFixed = 0;
  for (const m of all) {
    // 1) fatigue 재유도
    const fat = typ(m, 'fatigue_strength');
    const uts = typ(m, 'uts');
    if (fat != null && uts != null && uts > 0 && m.category === 'Metal') {
      const ratio = fat / uts;
      if (fat > uts || ratio > 0.8 || ratio < 0.12) {
        if (/foam|honeycomb|cellular/i.test(m.name || '')) {
          m.ranges.fatigue_strength = null;
          m.fatigue_strength = null;
          fatDropped++;
        } else {
          const f = m.families || [];
          const r = f.includes('Titanium-based') ? 0.55 : f.includes('Nickel-based') ? 0.40
            : (f.includes('Aluminum-based') || f.includes('Copper-based') || f.includes('Magnesium-based')) ? 0.35 : 0.45;
          const nv = Math.round(uts * r);
          m.ranges.fatigue_strength = {
            min: Math.round(nv * 0.85), max: Math.round(nv * 1.15), typical: nv,
            n: 0, estimated: true, confidence: 'derived',
            provenance: `R205-R σf≈${r}·UTS 재유도 (UTS 정정 후 stale 값 교체)`,
          };
          m.fatigue_strength = nv;
          fatFixed++;
        }
      }
    }
    // cellular 비금속 (composite/polymer foam·honeycomb) — fat > UTS 는 무의미 → 제거 (category 무관)
    if (m.category !== 'Metal' && /foam|honeycomb|aerogel/i.test(m.name || '')) {
      const f2 = typ(m, 'fatigue_strength'); const u2 = typ(m, 'uts');
      if (f2 != null && u2 != null && f2 > u2) {
        m.ranges.fatigue_strength = null; m.fatigue_strength = null; fatDropped++;
      }
    }
    // 2) price_per_cm3 정합화
    const pk = typ(m, 'price_per_kg');
    const rho = typ(m, 'density');
    if (pk != null && rho != null && pk > 0 && rho > 0) {
      const expect = +(pk * rho / 1000).toFixed(4);
      const cur = typ(m, 'price_per_cm3');
      if (cur == null || Math.abs(cur - expect) / expect > 0.02) {
        if (!m.ranges) m.ranges = {};
        /* R209 A-6 — price_per_cm3 는 price_per_kg × ρ 의 파생값. price_per_kg 의 'measured'
           confidence 를 상속하면 estimated:true 와 모순 (녹색 dot + n=0 + 실측 tooltip 동시).
           파생값이므로 항상 'derived' 로 고정. */
        m.ranges.price_per_cm3 = {
          min: +(expect * 0.85).toFixed(4), max: +(expect * 1.15).toFixed(4), typical: expect,
          n: 0, estimated: true, confidence: 'derived', provenance: 'R205-R price_per_kg × ρ 재계산',
        };
        m.price_per_cm3 = expect;
        priceFixed++;
      }
    }
  }
  console.log(`R205-R — 파생값 재계산: fatigue ${fatFixed} 재유도 + ${fatDropped} cellular 제거 · price_per_cm3 ${priceFixed} 정합화`);
}

/* R173 Phase B — Name overrides (표기 중복 정리).
 *   data/r173-name-overrides.json 의 from→to 매핑으로 entry name 정규화.
 *   ID 는 변경 X (deeplink 보존). aliases 는 build pipeline 후속 단계에서 재생성. */
try {
  const r173NamesRaw = JSON.parse(fs.readFileSync(path.join(DATA, 'r173-name-overrides.json'), 'utf8'));
  const nameOvers = r173NamesRaw.overrides || [];
  let nameRenamed = 0;
  const notFound = [];
  for (const ov of nameOvers) {
    const target = all.find(m => m.name === ov.from);
    if (!target) { notFound.push(ov.from); continue; }
    target.name = ov.to;
    nameRenamed++;
  }
  console.log(`R173 Phase B — name overrides: ${nameRenamed}/${nameOvers.length} entries renamed`);
  if (notFound.length) for (const n of notFound) console.warn(`  ⚠ name override target not found: ${n.slice(0, 60)}`);
} catch (e) {
  console.warn('R173 Phase B name overrides skipped:', e.message);
}

// R144c — Spec extractor (AMS / ASTM / ASME / DNV / EN / DIN / JIS / MIL / UNS / API / NACE).
//   name + heat_treatment + sources.label 에서 spec 번호 추출 → meta.specs[]
//   (TS lib 의 미러본 — script 는 TS 를 import 못함, 패턴 단순화)
const SPEC_PATTERNS = [
  { rx: /\bAMS\s?(\d{3,5}[A-Z]?)\b/gi, org: 'AMS' },
  { rx: /\bASTM\s?([A-Z]\s?\d{1,4}(?:\/?M)?[A-Z]?(?:[-\s]\d{2,4})?)\b/gi, org: 'ASTM' },
  { rx: /\bASME\s?((?:SA[-\s]?)?[A-Z]?\d{1,3}(?:\.\d{1,2})?)\b/gi, org: 'ASME' },
  { rx: /\bDNV(?:GL)?[-\s]?([A-Z]{2,4}[-\s]?[A-Z0-9]+(?:[-\s]?\d{0,4})?)\b/gi, org: 'DNV' },
  { rx: /\bEN\s?(\d{4,6}(?:[-\s]?\d{1,3})?)\b/gi, org: 'EN' },
  { rx: /\bEN\s?(\d\.\d{3,4})\b/gi, org: 'EN' },
  { rx: /\bDIN\s?(\d{1,2}\.\d{3,4})\b/gi, org: 'DIN' },
  { rx: /\bDIN\s?(\d{3,7})\b/gi, org: 'DIN' },
  { rx: /\bJIS\s?([A-Z]\s?\d{4})\b/gi, org: 'JIS' },
  { rx: /\bMIL[-\s]?([A-Z]+[-\s]?\d{3,5}[A-Z]?)\b/gi, org: 'MIL' },
  { rx: /\bUNS\s?([A-Z]\d{5})\b/gi, org: 'UNS' },
  { rx: /\bAPI\s?(\d{1,2}[A-Z]{1,3})\b/gi, org: 'API' },
  { rx: /\bNACE\s?(MR\s?\d{4})\b/gi, org: 'NACE' },
];
let withSpec = 0, totalSpecs = 0;
for (const m of all) {
  const haystack = [m.name || '', m.heat_treatment || '', ...(m.sources || []).map(s => s?.label || '')].join(' \n ');
  const seen = new Set();
  const specs = [];
  for (const { rx, org } of SPEC_PATTERNS) {
    rx.lastIndex = 0;
    let mm;
    while ((mm = rx.exec(haystack))) {
      const idPart = mm[1].replace(/\s+/g, ' ').trim().toUpperCase();
      const id = `${org} ${idPart}`;
      if (!seen.has(id)) { seen.add(id); specs.push({ id, org }); }
    }
  }
  if (specs.length) {
    if (!m.meta) m.meta = {};
    m.meta.specs = specs;
    withSpec++;
    totalSpecs += specs.length;
  }
}
console.log(`R144c — specs: ${withSpec}/${all.length} materials matched, ${totalSpecs} total spec refs`);

const liveJson = path.join(ROOT, 'client', 'public', 'materials.json');
const backup = path.join(DATA, 'materials.original.json');
if (fs.existsSync(liveJson) && !fs.existsSync(backup)) fs.copyFileSync(liveJson, backup); // preserve original 2902-row dataset once
const outJson = JSON.stringify(all, null, 2);
fs.writeFileSync(path.join(DATA, 'materials.preview.json'), outJson);
fs.writeFileSync(liveJson, outJson);
fs.writeFileSync(path.join(DATA, 'validation-report.md'), rep.join('\n'));

/* R154 — JSON 카테고리별 분할 + slim index.
   목적: 첫 페인트 단축. 1247 entry × full = 8.15 MB → index (slim) ~500 KB + category 별 분할.
   - materials/index.json: 모든 entry 의 slim 필드 (id/name/category/subcategory/popularity/tier
     + ranges 의 핵심 6 property (density, σy, UTS, modulus, T_max, price) + families/aliases).
     Ashby preview · 검색 · filter 사이드바 · category 분포 즉시 가능.
   - materials/{metal,polymer,ceramic,composite}.json: 각 카테고리의 full Material 리스트.
   - materials.json (legacy) 도 그대로 유지 → 기존 deeplink + tooling 깨지지 않음. */
// R154 — slim index 의 ranges 는 number-only (typical 만). min/max/provenance/confidence 는 full 에만.
// 이렇게 해도 검색·filter slider·Ashby preview 모두 동작. 첫 페인트 우선.
// R173 — delivered_price_per_kg 추가 (condition × form × grade factor 반영된 processed cost).
// Radar chart 의 1/$ axis 가 condition-aware price 사용 가능 (slim index 단계 부터).
const SLIM_PROPS = ['density', 'yield_strength', 'uts', 'modulus', 'max_service_temp', 'price_per_kg', 'delivered_price_per_kg'];
const slimEntries = all.map(m => {
  const slim = {
    id: m.id,
    name: m.name,
    category: m.category,
    subcategory: m.subcategory,
    popularity: m.popularity,
    tier: m.tier,
    confidence_tier: m.confidence_tier,
  };
  if (m.aliases?.length) slim.aliases = m.aliases;
  if (m.families?.length) slim.families = m.families;
  if (m.manufacturer) slim.manufacturer = m.manufacturer;
  if (m.process) slim.process = m.process;
  // ranges 는 호환 형태 ({ typical } 만 유지). consumer 의 m.ranges?.X?.typical 접근 그대로 동작.
  // min/max/provenance/confidence 는 full 에만 있음 → consumer 는 ?? fallback 으로 graceful.
  if (m.ranges) {
    const slimRanges = {};
    for (const p of SLIM_PROPS) {
      const r = m.ranges[p];
      if (r) {
        const v = r.typical ?? r.min ?? r.max ?? null;
        if (typeof v === 'number' && isFinite(v)) {
          slimRanges[p] = { typical: v, n: r.n || 1 };
          /* R203 — top-level shortcut 도 slim 에 같이 넣음. consumer (MaterialTable / MaterialCards / sort)
             가 m.density 같은 direct access 패턴이어서 ranges fallback 없으면 첫 paint 시 "—" 표시. */
          slim[p] = v;
        }
      }
    }
    if (Object.keys(slimRanges).length) slim.ranges = slimRanges;
  }
  /* R203 — non-SLIM_PROPS 도 top-level 으로 가능하면 채움 (sort/filter 용) */
  const EXTRA_TOP = ['elongation', 'hardness', 'fatigue_strength', 'thermal_conductivity', 'thermal_expansion', 'fracture_toughness', 'impact_strength'];
  for (const p of EXTRA_TOP) {
    if (m.ranges && m.ranges[p]) {
      const v = m.ranges[p].typical ?? m.ranges[p].min ?? m.ranges[p].max ?? null;
      if (typeof v === 'number' && isFinite(v)) slim[p] = v;
    } else if (typeof m[p] === 'number' && isFinite(m[p])) {
      slim[p] = m[p];
    }
  }
  return slim;
});
const matsDir = path.join(ROOT, 'client', 'public', 'materials');
if (!fs.existsSync(matsDir)) fs.mkdirSync(matsDir, { recursive: true });
fs.writeFileSync(path.join(matsDir, 'index.json'), JSON.stringify(slimEntries));
const categoryFiles = {};
for (const cat of ['Metal', 'Polymer', 'Ceramic', 'Composite']) {
  const subset = all.filter(m => m.category === cat);
  const filename = cat.toLowerCase() + '.json';
  fs.writeFileSync(path.join(matsDir, filename), JSON.stringify(subset));
  categoryFiles[cat] = { filename, count: subset.length, bytes: fs.statSync(path.join(matsDir, filename)).size };
}
const indexBytes = fs.statSync(path.join(matsDir, 'index.json')).size;
const liveBytes = fs.statSync(liveJson).size;
console.log(`R154 — JSON 분할: index ${(indexBytes/1024).toFixed(0)} KB (slim, ${all.length} entries) · materials.json ${(liveBytes/1024/1024).toFixed(2)} MB (legacy compat)`);
for (const [cat, info] of Object.entries(categoryFiles)) {
  console.log(`         ${cat.padEnd(10)} → ${info.filename.padEnd(15)} ${info.count.toString().padStart(4)} entries · ${(info.bytes/1024/1024).toFixed(2)} MB`);
}

// R69 A — build metadata (앱이 fetch 해 detail / footer 에 표시).
const buildMeta = {
  buildDate: new Date().toISOString().slice(0, 10),
  buildTime: new Date().toISOString(),
  totalAlloys: all.length,
  byCategory: {
    Metal: all.filter(m => m.category === 'Metal').length,
    Polymer: all.filter(m => m.category === 'Polymer').length,
    Ceramic: all.filter(m => m.category === 'Ceramic').length,
    Composite: all.filter(m => m.category === 'Composite').length,
  },
  anomalies: anomalies.length,
  // R210 B2 — severity 분해를 외부에 노출 (불변식 테스트·추세 추적용).
  anomaliesBySeverity: { high: sevCount.high, med: sevCount.med, low: sevCount.low },
  verifiedSrcMaterials: withVerifiedSrc,
};
fs.writeFileSync(path.join(ROOT, 'client', 'public', 'build-meta.json'), JSON.stringify(buildMeta, null, 2));

// ───────── console summary ─────────
console.log(`TOTAL ${all.length} = curated ${curated.length} + am_vendor ${am_vendor.length} + generic ${generic.length} + reference ${supplementary.length}`);
if (droppedExcluded > 0) console.log(`R134a — Dropped ${droppedExcluded} CSV rows from excluded alloys (Ti-5-8-5, AA 7178, AA 5005/5050/5154/5251/5356/5383).`);
console.log('am_vendor recovered:', am_vendor.map(m => m.name).join(', '));
console.log('AA subcategory fixes:', aaFixed, '| subcat mismatch flags:', subcatFlags.length, '| verified-source materials:', withVerifiedSrc);
console.log('Wrote data/materials.preview.json + data/validation-report.md');

// R210 B2 — 빌드 게이트: high-severity 물리 오류(σy>UTS, min>max 등)가 1건이라도 있으면
//   빌드 실패시켜 CI/배포를 차단한다. 리포트는 위에서 이미 기록되어 진단 가능.
//   현재 기준선은 high 0 — 신규 데이터로 high 가 생기면 즉시 드러난다.
if (sevCount.high > 0) {
  console.error(`\n❌ BUILD GATE: ${sevCount.high} high-severity anomaly 검출 — data/validation-report.md 의 HIGH severity 섹션 확인 후 수정 필요.`);
  process.exit(1);
}
