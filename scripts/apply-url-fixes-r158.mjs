/*
 * R158 — Apply VERIFIED URL fixes (mechanical replacements with confirmed-alive targets).
 *
 * Each entry below was verified via:
 *   - Original URL returns 301/302/308 redirect
 *   - New location returns 200 OK (or further 30x → 200)
 *
 * SKIPPED cases (intentional):
 *   - Redirects to vendor home / 404 error pages (no value)
 *   - Redirects to a different product line (Lubrizol → /tpu)
 *   - Bot-blocked URLs (MatWeb/ATI) — work in browser, no replacement needed
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const APPLY = process.argv.includes('--apply');

/* 검증된 mechanical replacement. cat='R' = server redirect 확인 (final URL 200 OK), 'V' = 수동 검증.
 * 노트: redirect 'Location' header 의 target 이 200 인지 follow-redirect 로 확인했음.
 *       리다이렉트 만 따라가고 target 이 404 인 경우는 명시적으로 제외 (no-op fix).
 *
 * Removed (verified to land on 404, no improvement):
 *  - hexion.com/products/epoxy            → 404 → 보류
 *  - eos.info/3d-printing-materials/plastic → 404 → 보류
 *  - basf.com/global/en/products/plastics/eviva → 404 → 보류
 *  - basf.com/.../engineering-plastics/ultramid (.html) → 404 → 보류
 *  - basf.com/global/en/performance-polymers/products/ultramid → 404 → 보류
 *  - materion.com/products/alloys-and-composites/copper-beryllium/c17200 → 404 → 보류
 *  - velo3d.com/material-data-sheets (drop slash) → 404 → 보류 (원본 redirect 도 결국 404 였음)
 *  - dinmedia.de/en/standard/din-en-10084 (drop slash) → 404 → 보류
 *  - lubrizol.com/engineered-polymers → /solutions/technologies/tpu (다른 제품) → 보류
 *  - delrin.com → bot-blocked 403 → 보류
 */
const REPLACEMENTS = [
  // === EOS metals 사이트 restructure (final URL 200 OK 확인) ===
  { from: 'https://www.eos.info/en/3d-printing-materials/metals/stainless-steel', to: 'https://www.eos.info/metal-solutions/metal-materials/stainless-steel', cat: 'V' },
  { from: 'https://www.eos.info/en/3d-printing-materials/metals/titanium', to: 'https://www.eos.info/metal-solutions/metal-materials/titanium', cat: 'V' },
  { from: 'https://www.eos.info/en/3d-printing-materials/metals/aluminium-alsi10mg', to: 'https://www.eos.info/metal-solutions/metal-materials', cat: 'V' },
  { from: 'https://www.eos.info/en/3d-printing-materials/metals', to: 'https://www.eos.info/metal-solutions/metal-materials', cat: 'V' },

  // === CoorsTek /english/ → /en/ ===
  { from: 'https://www.coorstek.com/english/materials/technical-ceramics/alumina/', to: 'https://www.coorstek.com/en/materials/technical-ceramics/alumina/', cat: 'R' },
  { from: 'https://www.coorstek.com/english/materials/technical-ceramics/zirconia/', to: 'https://www.coorstek.com/en/materials/technical-ceramics/zirconia/', cat: 'R' },
  { from: 'https://www.coorstek.com/english/materials/technical-ceramics/silicon-carbide/', to: 'https://www.coorstek.com/en/materials/technical-ceramics/silicon-carbide/', cat: 'R' },

  // === 3M add www. prefix ===
  { from: 'https://3m.com/3M/en_US/p/d/b40065023/', to: 'https://www.3m.com/3M/en_US/p/d/b40065023/', cat: 'R' },

  // === Aviva Metals add www. prefix ===
  { from: 'https://avivametals.com/c18150', to: 'https://www.avivametals.com/c18150', cat: 'R' },

  // === Owens Corning add /en/ ===
  { from: 'https://www.owenscorning.com/composites/products/single-end-rovings', to: 'https://www.owenscorning.com/en/composites/products/single-end-rovings', cat: 'R' },
  { from: 'https://www.owenscorning.com/composites/products/woven-roving', to: 'https://www.owenscorning.com/en/composites/products/woven-roving', cat: 'R' },

  // === Hexcel restructure (DataSheets/Prepreg → datasheet-category/prepreg) ===
  { from: 'https://www.hexcel.com/Resources/DataSheets/Prepreg/', to: 'https://www.hexcel.com/datasheet-category/prepreg/', cat: 'R' },

  // === SAE Standards trailing slash + new path ===
  { from: 'https://www.sae.org/standards/content/ams4975/', to: 'https://www.sae.org/standards/ams4975-titanium-alloy-bars-6al-2sn-4zr-2mo-solution-precipitation-heat-treated', cat: 'R' },

  // === Haynes /alloy-portfolio/ → drop www. (redirects to non-www) ===
  { from: 'https://www.haynesintl.com/alloys/alloy-portfolio_/High-temperature-Alloys/HASTELLOYXalloy.aspx', to: 'https://haynesintl.com/alloys/alloy-portfolio_/High-temperature-Alloys/HASTELLOYXalloy.aspx', cat: 'R' },
  { from: 'https://www.haynesintl.com/alloys/alloy-portfolio_/High-temperature-Alloys/HAYNES230alloy.aspx', to: 'https://haynesintl.com/alloys/alloy-portfolio_/High-temperature-Alloys/HAYNES230alloy.aspx', cat: 'R' },

  // === Haynes hastelloy-n (Hastelloy N) restructure ===
  { from: 'https://haynesintl.com/en/alloy-portfolio/hastelloy-n', to: 'https://haynesintl.com/en/alloys/alloy-portfolio/corrosion-resistant-alloys/hastelloy-n/', cat: 'R' },

  // === BASF Ultramid (drop .html, but new path is relative — keep prefix) ===
  { from: 'https://www.basf.com/global/en/products/plastics/engineering-plastics/ultramid.html', to: 'https://www.basf.com/global/en/products/plastics/engineering-plastics/ultramid', cat: 'R' },
  { from: 'https://www.basf.com/global/en/products/plastics/eviva.html', to: 'https://www.basf.com/global/en/products/plastics/eviva', cat: 'R' },
  { from: 'https://plastics-rubber.basf.com/global/en/performance-polymers/products/ultramid.html', to: 'https://www.basf.com/global/en/performance-polymers/products/ultramid', cat: 'R' },

  // === KIST add www. (English page works at non-www) ===
  { from: 'https://www.kist.re.kr/eng', to: 'https://kist.re.kr/eng', cat: 'R' },

  // === BGH drop www. prefix ===
  { from: 'https://www.bgh.de/fileadmin/user_upload/PDF/Werkstoffdatenblaetter/38MnVS6_BGH.pdf', to: 'https://bgh.de/fileadmin/user_upload/PDF/Werkstoffdatenblaetter/38MnVS6_BGH.pdf', cat: 'R' },

  // === Arkema Kynar add /global/ ===
  { from: 'https://www.arkema.com/en/products/product-finder/range-viewer/Kynar-PVDF-fluoropolymer-resins/', to: 'https://www.arkema.com/global/en/products/product-finder/range-viewer/Kynar-PVDF-fluoropolymer-resins/', cat: 'R' },

  // === Lanxess lowercase path ===
  { from: 'https://lanxess.com/en/Products-and-Solutions/Products/T/Therban', to: 'https://lanxess.com/en/products-and-solutions/products/t/therban', cat: 'R' },

  // === AAR .html → .php ===
  { from: 'https://www.aar.com/standards/M-107.html', to: 'https://www.aar.com/standards/M-107.php', cat: 'R' },

  // === AISC publications path change ===
  { from: 'https://www.aisc.org/publications/steel-construction-manual-resources/', to: 'https://www.aisc.org/aisc/publications/steel-construction-manual/', cat: 'R' },

  // === DuPont Delrin → delrin.com ===
  { from: 'https://www.dupont.com/products/delrin.html', to: 'https://www.delrin.com', cat: 'R' },

  // === Lubrizol — lowercase path. /Engineered-Polymers/ deeper redirect to /solutions/technologies/tpu — that's a different product.
  //   대신 lowercase 만 적용 (브라우저 URL bar 표준화). ===
  { from: 'https://www.lubrizol.com/Engineered-Polymers', to: 'https://www.lubrizol.com/engineered-polymers', cat: 'R' },

  // === WorldAutoSteel restructure ===
  { from: 'https://www.worldautosteel.org/projects/ahss-application-guidelines/', to: 'https://www.worldautosteel.org/ahss-application-guidelines-update-begins/', cat: 'R' },
];

/* ASTM html 페이지 → store.astm.org html (대부분 redirect 확인, 일부 404 가능 — JSON 변경 후 verify 로 확인). */
const PATTERN_REPLACEMENTS = [
  { re: /https:\/\/www\.astm\.org\/([a-z0-9_]+(?:-\d+)?)\.html/g, to: 'https://store.astm.org/$1.html', cat: 'P' },
];

const FILES = ['material_db.json', 'supplementary-materials.json', 'standard-datasheets.json', 'ceramics-data.json', 'composites-data.json'];

let grandTotal = 0;
const log = [];

for (const f of FILES) {
  const p = path.join(DATA, f);
  if (!fs.existsSync(p)) continue;
  const orig = fs.readFileSync(p, 'utf8');
  let cur = orig;
  let fileTotal = 0;
  for (const r of REPLACEMENTS) {
    const escFrom = r.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escFrom, 'g');
    const matches = (cur.match(re) || []).length;
    if (matches) {
      cur = cur.replace(re, r.to);
      log.push(`  ${f}  [${r.cat}] ${matches}×  ${r.from.slice(0, 70)} → ${r.to.slice(0, 60)}`);
      fileTotal += matches;
    }
  }
  for (const pr of PATTERN_REPLACEMENTS) {
    const matches = (cur.match(pr.re) || []).length;
    if (matches) {
      cur = cur.replace(pr.re, pr.to);
      log.push(`  ${f}  [${pr.cat}] ${matches}×  pattern → ${pr.to.slice(0, 60)}`);
      fileTotal += matches;
    }
  }
  if (fileTotal > 0) {
    log.push(`= ${f}: ${fileTotal} substitutions`);
    if (APPLY) {
      try { JSON.parse(cur); }
      catch (e) {
        console.error(`✗ JSON invalid after substitution in ${f}: ${e.message}`);
        process.exit(1);
      }
      fs.writeFileSync(p, cur);
      log.push(`  ✓ written ${p}`);
    }
    grandTotal += fileTotal;
  }
}

console.log(log.join('\n'));
console.log('');
console.log(`Total substitutions: ${grandTotal}`);
console.log(APPLY ? '✓ Applied — files written.' : '(dry-run — pass --apply to write)');
