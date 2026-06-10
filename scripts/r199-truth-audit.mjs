// R199 — DB 자료 진실성 systematic audit
// 검증: σy<UTS / El>0 / density family / modulus reasonable / fatigue ratio / hardness 상관
//       max_service_temp vs melting / source verified

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'client/public/materials.json'), 'utf8'));
console.log(`Loaded ${all.length} materials`);

const REPORT = {
  ytsGtUts: [],         // σy > UTS (impossible)
  elNegative: [],       // El < 0
  densityFamily: [],    // density out of family range
  modulusFamily: [],    // modulus out of family range
  fatigueRatio: [],     // fatigue not in [0.2, 0.7] of UTS
  fatigueGtUts: [],     // fatigue > UTS (impossible)
  hardnessVsYield: [],  // HV vs σy mismatch
  maxTempVsMelt: [],    // max_service_temp > melting (impossible)
  ktcMissing: [],       // toughness 0 or huge
  sourceUnverified: [], // sources unverified count
  ranges: { yield_strength: {min: Infinity, max: -Infinity}, uts: {min: Infinity, max: -Infinity}, density: {min: Infinity, max: -Infinity} },
};

function getRange(r) {
  if (typeof r === 'number') return r;
  if (r && typeof r === 'object') return r.typical ?? r.min ?? r.max;
  return null;
}

function familyDensity(m) {
  const c = (m.category || '').toLowerCase();
  const s = (m.subcategory || '').toLowerCase();
  const combined = c + ' ' + s + ' ' + (m.name||'').toLowerCase();
  if (/polymer|plastic|nylon|peek|pps|abs|pet\b|pp\b|pe\b|pvc|polycarbonate|polystyrene|polyimide|epoxy|silicone|nbr|hnbr|tpu|tpe|elastomer|rubber|hdpe|ldpe/.test(combined)) return [0.8, 2.3];
  if (/foam|honeycomb/.test(combined)) return [0.02, 1.0];
  if (/balsa|bamboo|wood/.test(combined)) return [0.1, 1.2];
  if (/ceramic|alumina|al2o3|zirconia|zro2|sialon|silicon carbide|silicon nitride|sic\b|si3n4|boron carbide|b4c|cermet|wc-co|tungsten carbide/.test(combined)) return [2.0, 16];
  if (/composite|cfrp|gfrp|smc|bmc|kevlar|aramid|glare/.test(combined)) return [0.9, 2.5];
  if (/magnesium|az\d/.test(combined)) return [1.6, 2.1];
  if (/aluminum|aluminium|aa[\s-]?\d|7068|7075|2024|6061|5083|5052|6063/.test(combined)) return [2.5, 3.5];
  if (/titanium|ti-|ti6|ti grade|ti cp|cp[\s-]?ti/.test(combined)) return [4.3, 5.5];
  if (/^cu|copper|brass|bronze|cuni|c1\d{4}|c2\d{4}|c3\d{4}|c4\d{4}|c5\d{4}|c6\d{4}|c7\d{4}|c8\d{4}|c9\d{4}|naval brass|beryllium copper|cube|cucr|cuzr/.test(combined)) return [7.5, 9.5];
  if (/zircaloy|zirconium/.test(combined)) return [6.0, 7.5];
  if (/tungsten|^w[\s-]/.test(combined)) return [16, 19.5];
  if (/molybdenum|^mo[\s-]/.test(combined)) return [9.5, 10.5];
  if (/tantalum|^ta[\s-]/.test(combined)) return [15.5, 17];
  if (/niobium|^nb[\s-]/.test(combined)) return [8.0, 9.0];
  if (/rhenium/.test(combined)) return [20.5, 21.5];
  if (/hafnium/.test(combined)) return [12.5, 14];
  if (/vanadium/.test(combined)) return [5.8, 6.4];
  if (/chromium\b/.test(combined)) return [7.0, 7.4];
  if (/cobalt|stellite|cocr|haynes 188|l-?605|elgiloy/.test(combined)) return [8.0, 9.5];
  if (/lead|pb\b/.test(combined)) return [10.5, 11.6];
  if (/zinc|zamak|galfan/.test(combined)) return [6.5, 7.5];
  if (/nickel|inconel|hastelloy|monel|incoloy|nimonic|waspaloy|haynes|rene\b|cmsx|udimet|nichrome|kovar|invar|grx-?810|in7\d{2}|in6\d{2}|in9\d{2}/.test(combined)) return [7.8, 9.5];
  if (/steel|stainless|iron|cast iron|maraging|tool steel|hss|chromoly|aisi|sae|sus\d|astm a|spa-h|ah\d{2}|dh\d{2}|eh\d{2}|9% ni|hadfield|grade 9\d|p91|p355|p460|s235|s275|s355|s460|s690|api 5l|api 2h/.test(combined)) return [7.0, 8.3];
  return null;
}
function familyModulus(m) {
  const c = (m.category || '').toLowerCase();
  const s = (m.subcategory || '').toLowerCase();
  const combined = c + ' ' + s + ' ' + (m.name||'').toLowerCase();
  if (/foam/.test(combined)) return [0.001, 5];
  if (/rubber|silicone|elastomer|nbr|hnbr/.test(combined)) return [0.001, 0.05];
  if (/polymer|plastic|nylon|peek|pps|abs|pet\b|pp\b|pe\b|pvc|polycarbonate|polystyrene|epoxy|tpu|tpe|hdpe|ldpe/.test(combined)) return [0.2, 6];
  if (/ceramic|alumina|al2o3|zirconia|zro2|silicon carbide|silicon nitride|sic\b|si3n4|boron carbide|b4c/.test(combined)) return [150, 600];
  if (/tungsten carbide|wc-co/.test(combined)) return [500, 720];
  if (/composite|cfrp|gfrp|smc|bmc/.test(combined)) return [10, 250];
  if (/magnesium/.test(combined)) return [40, 50];
  if (/aluminum|aluminium|aa\s/.test(combined)) return [60, 80];
  if (/titanium/.test(combined)) return [100, 125];
  if (/copper|brass|bronze/.test(combined)) return [95, 145];
  if (/zircaloy|zirconium/.test(combined)) return [85, 105];
  if (/tungsten\b/.test(combined)) return [380, 420];
  if (/molybdenum/.test(combined)) return [310, 340];
  if (/tantalum/.test(combined)) return [180, 200];
  if (/niobium/.test(combined)) return [100, 110];
  if (/rhenium/.test(combined)) return [460, 480];
  if (/cobalt|stellite|cocr/.test(combined)) return [200, 240];
  if (/nickel|inconel|hastelloy|monel|incoloy|nimonic|waspaloy|haynes|rene\b/.test(combined)) return [180, 230];
  if (/steel|stainless|iron|maraging|tool steel|hss/.test(combined)) return [180, 220];
  if (/cast iron/.test(combined)) return [70, 170];
  return null;
}

let idx = 0;
for (const m of all) {
  idx++;
  const yld = getRange(m.ranges?.yield_strength) ?? m.yield_strength;
  const uts = getRange(m.ranges?.uts) ?? m.uts;
  const el  = getRange(m.ranges?.elongation) ?? m.elongation;
  const dens= getRange(m.ranges?.density) ?? m.density;
  const mod = getRange(m.ranges?.modulus) ?? m.modulus;
  const fat = getRange(m.ranges?.fatigue_strength) ?? m.fatigue_strength;
  const tmax= getRange(m.ranges?.max_service_temp) ?? m.max_service_temp;
  const ktc = getRange(m.ranges?.fracture_toughness) ?? m.fracture_toughness;
  const hv  = getRange(m.ranges?.hardness) ?? m.hardness;
  const tm  = m.melting_point;

  // σy > UTS impossible
  if (typeof yld === 'number' && typeof uts === 'number' && yld > 0 && uts > 0 && yld > uts) {
    REPORT.ytsGtUts.push({ name: m.name, yld, uts, ratio: (yld/uts).toFixed(2) });
  }
  // Elongation negative
  if (typeof el === 'number' && el < 0) {
    REPORT.elNegative.push({ name: m.name, el });
  }
  // Density family check
  const dr = familyDensity(m);
  if (dr && typeof dens === 'number' && dens > 0) {
    if (dens < dr[0] * 0.85 || dens > dr[1] * 1.15) {
      REPORT.densityFamily.push({ name: m.name, density: dens, expected: `${dr[0]}-${dr[1]}` });
    }
  }
  // Modulus family check
  const mr = familyModulus(m);
  if (mr && typeof mod === 'number' && mod > 0) {
    if (mod < mr[0] * 0.6 || mod > mr[1] * 1.4) {
      REPORT.modulusFamily.push({ name: m.name, modulus: mod, expected: `${mr[0]}-${mr[1]}` });
    }
  }
  // Fatigue ratio
  if (typeof fat === 'number' && typeof uts === 'number' && fat > 0 && uts > 0) {
    if (fat > uts) REPORT.fatigueGtUts.push({ name: m.name, fat, uts });
    const r = fat / uts;
    if (r < 0.15 || r > 0.75) REPORT.fatigueRatio.push({ name: m.name, fat, uts, ratio: r.toFixed(2) });
  }
  // max_service_temp vs melting
  if (typeof tmax === 'number' && typeof tm === 'number' && tmax > 0 && tm > 0 && tmax > tm) {
    REPORT.maxTempVsMelt.push({ name: m.name, tmax, tm });
  }
  // Hardness HV vs σy (steel-only approx: σy ≈ 3.3·HV MPa)
  if (typeof hv === 'number' && typeof yld === 'number' && hv > 0 && yld > 0 && /steel|stainless|iron|maraging|tool/i.test((m.category||'')+(m.subcategory||''))) {
    const expectedYld = 3.3 * hv;
    if (yld > expectedYld * 2.0 || yld < expectedYld * 0.3) {
      REPORT.hardnessVsYield.push({ name: m.name, hv, yld, expectedYld: expectedYld.toFixed(0), ratio: (yld/expectedYld).toFixed(2) });
    }
  }
  // Sources unverified
  if (Array.isArray(m.sources)) {
    const total = m.sources.length;
    const verified = m.sources.filter(s => s.verified).length;
    if (total > 0 && verified === 0 && m.tier !== 'reference') {
      REPORT.sourceUnverified.push({ name: m.name, total, tier: m.tier });
    }
  }
  // Property ranges (informational)
  if (typeof yld === 'number') { REPORT.ranges.yield_strength.min = Math.min(REPORT.ranges.yield_strength.min, yld); REPORT.ranges.yield_strength.max = Math.max(REPORT.ranges.yield_strength.max, yld); }
  if (typeof uts === 'number') { REPORT.ranges.uts.min = Math.min(REPORT.ranges.uts.min, uts); REPORT.ranges.uts.max = Math.max(REPORT.ranges.uts.max, uts); }
  if (typeof dens === 'number') { REPORT.ranges.density.min = Math.min(REPORT.ranges.density.min, dens); REPORT.ranges.density.max = Math.max(REPORT.ranges.density.max, dens); }
}

console.log('\n=== σy > UTS (impossible) ===', REPORT.ytsGtUts.length);
REPORT.ytsGtUts.slice(0, 30).forEach(r => console.log(`  ${r.name} — σy=${r.yld} > UTS=${r.uts} (ratio ${r.ratio})`));

console.log('\n=== Elongation negative ===', REPORT.elNegative.length);
REPORT.elNegative.forEach(r => console.log(`  ${r.name} — El=${r.el}`));

console.log('\n=== Density out of family range ===', REPORT.densityFamily.length);
REPORT.densityFamily.slice(0, 30).forEach(r => console.log(`  ${r.name} — ρ=${r.density} (expected ${r.expected})`));

console.log('\n=== Modulus out of family range ===', REPORT.modulusFamily.length);
REPORT.modulusFamily.slice(0, 30).forEach(r => console.log(`  ${r.name} — E=${r.modulus} GPa (expected ${r.expected})`));

console.log('\n=== Fatigue > UTS (impossible) ===', REPORT.fatigueGtUts.length);
REPORT.fatigueGtUts.slice(0, 20).forEach(r => console.log(`  ${r.name} — fat=${r.fat} > UTS=${r.uts}`));

console.log('\n=== Fatigue ratio out [0.15, 0.75] ===', REPORT.fatigueRatio.length);
REPORT.fatigueRatio.slice(0, 30).forEach(r => console.log(`  ${r.name} — fat=${r.fat}/UTS=${r.uts} = ${r.ratio}`));

console.log('\n=== max_service_temp > melting (impossible) ===', REPORT.maxTempVsMelt.length);
REPORT.maxTempVsMelt.slice(0, 20).forEach(r => console.log(`  ${r.name} — Tmax=${r.tmax} > Tm=${r.tm}`));

console.log('\n=== Hardness HV vs σy mismatch ===', REPORT.hardnessVsYield.length);
REPORT.hardnessVsYield.slice(0, 20).forEach(r => console.log(`  ${r.name} — HV=${r.hv}, σy=${r.yld}, expected σy ~${r.expectedYld} (ratio ${r.ratio})`));

console.log('\n=== Source unverified (non-reference tier) ===', REPORT.sourceUnverified.length);
REPORT.sourceUnverified.slice(0, 15).forEach(r => console.log(`  ${r.name} (tier=${r.tier}, ${r.total} sources)`));

console.log('\n=== Property ranges (informational) ===');
console.log(`  σy: ${REPORT.ranges.yield_strength.min} ~ ${REPORT.ranges.yield_strength.max} MPa`);
console.log(`  UTS: ${REPORT.ranges.uts.min} ~ ${REPORT.ranges.uts.max} MPa`);
console.log(`  ρ:  ${REPORT.ranges.density.min} ~ ${REPORT.ranges.density.max} g/cc`);

fs.writeFileSync(path.join(ROOT, 'data/r199-truth-audit.json'), JSON.stringify(REPORT, null, 2), 'utf8');
console.log('\nFull report: data/r199-truth-audit.json');
