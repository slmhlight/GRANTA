/*
 * R158 — Verify replacement URLs work before applying.
 */
const UA = 'Mozilla/5.0 (compatible; GRANTA-link-check/1.1; +https://github.com/slmhlight/GRANTA)';

const urls = [
  'https://www.eos.info/metal-solutions/metal-materials/stainless-steel',
  'https://www.velo3d.com/material-data-sheets/',
  'https://www.dinmedia.de/en/standard/din-en-10084/',
  'https://www.dinmedia.de/en/standard/din-en-10083-3/',
  'https://www.materion.com/products/alloys-and-composites/copper-beryllium/c17200',
  'https://www.eos.info/3d-printing-materials/plastic',
  'https://www.eos.info/metal-solutions/metal-materials/titanium',
  'https://www.eos.info/metal-solutions/metal-materials/aluminium-alsi10mg',
  'https://www.eos.info/metal-solutions/metal-materials',
  'https://www.outokumpu.com/en/products/austenitic-stainless-steel-316l',
  'https://www.outokumpu.com/en/products/austenitic-stainless-steel-304l',
  'https://www.outokumpu.com/en/products/austenitic-stainless-steel-254-smo',
  'https://www.outokumpu.com/en/products/duplex-stainless-steel-2507',
  'https://www.alleima.com/en/products-and-services/tube/seamless-stainless-tube/duplex/sanmac-2507/',
  'https://www.basf.com/global/en/products/plastics/engineering-plastics/ultramid',
  'https://natureworksllc.com/Products',
  'https://www.lubrizol.com/engineered-polymers',
  'https://www.carpentertechnology.com/alloy-techzone/technical-information/technical-articles/specialty-alloys/stainless-steel/17-4-ph-stainless-steel',
  'https://www.carpentertechnology.com/alloy-techzone/technical-information/technical-articles/specialty-alloys/stainless-steel/15-5-ph-stainless-steel',
  'https://www.carpentertechnology.com/alloy-techzone/technical-information/technical-articles/specialty-alloys/maraging-steel/vascomax-c-300',
  'https://www.bohler.com/en/products/w302/',
  'https://www.hexion.com/products/epoxy/',
  'https://www.syensqo.com/en/product/veradel-pes',
  'https://www.exxonmobilchemical.com/en/products/polymers-and-films/polypropylene',
  'https://store.astm.org/f0075-18.html',  // sample ASTM URL
  'https://store.astm.org/b0708-21.html',
  'https://store.astm.org/b0652_b0652m-18.html',
];

async function check(url, method = 'HEAD') {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const r = await fetch(url, {
      method, redirect: 'manual', signal: controller.signal,
      headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' },
    });
    clearTimeout(timeout);
    return { status: r.status, location: r.headers.get('location') };
  } catch (e) { return { error: e.message }; }
}

let ok = 0, redir = 0, bad = 0;
for (const u of urls) {
  let r = await check(u, 'HEAD');
  if (r.status === 403 || r.status === 405) r = await check(u, 'GET');
  let mark, status;
  if (r.error) { mark = '✗'; status = 'ERR ' + r.error.slice(0, 40); bad++; }
  else if (r.status === 200) { mark = '✓'; status = '200'; ok++; }
  else if (r.status >= 300 && r.status < 400) { mark = '↪'; status = `${r.status} → ${(r.location || '?').slice(0, 60)}`; redir++; }
  else { mark = '✗'; status = String(r.status); bad++; }
  console.log(`${mark} ${status.padEnd(60)} ${u.slice(0, 80)}`);
}
console.log(`\n${ok} OK, ${redir} redirect, ${bad} dead`);
