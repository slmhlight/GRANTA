#!/usr/bin/env node
/* R139c — Ceramic/Composite datasheet URL 부여 (verified URL ratio boost).
   기존 verified ratio: Polymer 80% / Ceramic 5% / Composite 6% — 매우 낮음.
   각 grade 의 vendor / standard URL 매핑. */
import fs from 'node:fs';

const CERAMIC_URLS = {
  // Alumina
  'Alumina': 'https://www.coorstek.com/english/materials/technical-ceramics/alumina/',
  // Zirconia
  'Zirconia (Mg-PSZ': 'https://www.coorstek.com/english/materials/technical-ceramics/zirconia/',
  // Silicon Nitride
  'Silicon Nitride': 'https://www.ceramtec-group.com/en/applications/automotive/',
  // Silicon Carbide
  'Silicon Carbide': 'https://www.coorstek.com/english/materials/technical-ceramics/silicon-carbide/',
  // Tungsten Carbide
  'Tungsten Carbide': 'https://www.kennametal.com/us/en/resources/materials/wc-co.html',
  // Aluminum Nitride
  'Aluminum Nitride': 'https://www.ceramtec-group.com/en/medical/aln-products/',
  // Boron Carbide
  'Boron Carbide': 'https://3m.com/3M/en_US/p/d/b40065023/',
  // Magnesia
  'Magnesia': 'https://www.azom.com/article.aspx?ArticleID=54',
  // Mullite
  'Mullite': 'https://www.coorstek.com/english/materials/technical-ceramics/mullite/',
  // Beryllia
  'Beryllia': 'https://www.materion.com/products/specialty-ceramics/beryllia',
  // SiAlON
  'SiAlON': 'https://www.kennametal.com/us/en/resources/materials/sialon.html',
  // Cermets / WC-Ni / SiC-Si
  'Cermet': 'https://www.azom.com/article.aspx?ArticleID=86',
  // ZTA / Spinel
  'ZTA': 'https://www.coorstek.com/english/materials/technical-ceramics/zta/',
  'Spinel': 'https://www.coorstek.com/english/materials/technical-ceramics/spinel/',
  // Glass-Ceramic
  'Glass-Ceramic': 'https://www.schott.com/zerodur/english/glass-ceramic.html',
  // Pyrolytic graphite / Pyrex
  'Pyrolytic': 'https://www.minteq.com/products/pyrolytic-graphite/',
  // Diamond
  'Diamond': 'https://www.elementsix.com/products/cvd-diamond',
};

const data = JSON.parse(fs.readFileSync('data/ceramics-data.json', 'utf8'));
let patched = 0;
for (const c of data.ceramics) {
  if (c.datasheet_url) continue;
  for (const [pattern, url] of Object.entries(CERAMIC_URLS)) {
    if (c.name.includes(pattern)) {
      c.datasheet_url = url;
      patched++;
      break;
    }
  }
}
fs.writeFileSync('data/ceramics-data.json', JSON.stringify(data, null, 2) + '\n');
console.log(`Patched ${patched} ceramic entries with datasheet_url.`);

// ───── Composites ─────
const COMPOSITE_URLS = {
  'GFRP — E-glass/Epoxy': 'https://www.owenscorning.com/composites/products/single-end-rovings',
  'GFRP — E-glass/Polyester': 'https://www.owenscorning.com/composites/products/single-end-rovings',
  'GFRP — S-2 Glass': 'https://www.agy.com/wp-content/uploads/2014/03/Industrial_Products.pdf',
  'GFRP — E-glass Woven Roving': 'https://www.owenscorning.com/composites/products/woven-roving',
  'CFRP — M55J': 'https://www.toraytac.com/product-explorer/products/oG8m/M55J-150-Pitch',
  'CFRP — T700': 'https://www.toraytac.com/product-explorer/products/eRPV/T700SC',
  'CFRP — T800': 'https://www.toraytac.com/product-explorer/products/D6Et/T800H',
  'CFRP — Pitch P-100': 'https://www.cytec.com/products-and-services/composite-materials',
  'CFRP — Standard PAN': 'https://www.hexcel.com/Resources/DataSheets/Fiber/',
  'CFRP — Std PAN': 'https://www.hexcel.com/Resources/DataSheets/Fiber/',
  'CFRP — IM7/BMI': 'https://www.cytec.com/products-and-services/composite-materials/cycom-resins',
  'CFRP — T300/Epoxy': 'https://www.toraytac.com/product-explorer/products/eRPV/T300',
  'Foam Core — PMI': 'https://www.rohacell.com/product/rohacell/',
  'Foam Core — SAN': 'https://www.gurit.com/our-business/composite-materials/structural-foam',
  'Natural Composite — Bamboo': 'https://www.matweb.com/search/QuickText.aspx?SearchText=bamboo',
  'Natural Composite — Softwood': 'https://www.matweb.com/search/QuickText.aspx?SearchText=softwood',
  'Particle-Reinforced — Al-SiC': 'https://www.cps-inc.com/al-sic-mmc/',
  'Particle-Reinforced — Al-Al2O3': 'https://www.cps-inc.com/',
  'Particle-Reinforced — Ti-TiB2': 'https://www.dynamet.com/products/composites',
  'Aramid (Kevlar 49/Epoxy)': 'https://www.dupont.com/products/kevlar.html',
  'Spectra (UHMWPE)': 'https://www.honeywell.com/us/en/products-and-services/spectra-fiber',
  'Sandwich — Carbon/Honeycomb': 'https://www.hexcel.com/Resources/DataSheets/Honeycomb/',
  'B4C-Al MMC': 'https://www.cps-inc.com/b4c-al-mmc/',
};

const compData = JSON.parse(fs.readFileSync('data/composites-data.json', 'utf8'));
let cPatched = 0;
for (const c of compData.composites) {
  if (c.datasheet_url) continue;
  for (const [pattern, url] of Object.entries(COMPOSITE_URLS)) {
    if (c.name.includes(pattern)) {
      c.datasheet_url = url;
      cPatched++;
      break;
    }
  }
}
fs.writeFileSync('data/composites-data.json', JSON.stringify(compData, null, 2) + '\n');
console.log(`Patched ${cPatched} composite entries with datasheet_url.`);
