/*
 * R167 Phase B — Property statistics for QueryBar autocomplete hint.
 *
 * 각 property 에 대해 p10 / median / p90 + min/max 계산 → client/public/property-stats.json.
 * Autocomplete 가 사용자에게 "보통 값: 5 ~ 10 g/cm³" 같은 hint 표시.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MATERIALS = path.join(ROOT, 'client', 'public', 'materials.json');
const OUT = path.join(ROOT, 'client', 'public', 'property-stats.json');

const PROPS = [
  'yield_strength', 'uts', 'modulus', 'density', 'hardness', 'elongation',
  'thermal_conductivity', 'electrical_conductivity', 'max_service_temp',
  'fatigue_strength', 'impact_strength', 'price_per_kg', 'thermal_expansion',
  'poisson_ratio', 'specific_heat', 'melting_point', 'popularity',
  'fracture_toughness', 'total_cost_estimate', 'min_wall_thickness',
  'surface_finish_typical', 'machining_cost_factor', 'ht_cost_factor',
];

function getPropValue(m, key) {
  /* ranges 의 typical 우선, 없으면 (min+max)/2, 없으면 flat property. */
  const r = m.ranges?.[key];
  if (r) {
    if (typeof r.typical === 'number') return r.typical;
    if (typeof r.min === 'number' && typeof r.max === 'number') return (r.min + r.max) / 2;
  }
  const v = m[key];
  return typeof v === 'number' ? v : null;
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function round(n, d = 2) {
  if (n == null) return null;
  const mult = Math.pow(10, d);
  return Math.round(n * mult) / mult;
}

const materials = JSON.parse(fs.readFileSync(MATERIALS, 'utf8'));
const stats = {};
for (const prop of PROPS) {
  const values = materials.map((m) => getPropValue(m, prop)).filter((v) => v != null && Number.isFinite(v) && v > 0);
  values.sort((a, b) => a - b);
  if (values.length === 0) continue;
  stats[prop] = {
    n: values.length,
    min: round(values[0]),
    max: round(values[values.length - 1]),
    p10: round(percentile(values, 0.1)),
    median: round(percentile(values, 0.5)),
    p90: round(percentile(values, 0.9)),
  };
}

fs.writeFileSync(OUT, JSON.stringify(stats, null, 2));
console.log(`Property stats written: ${OUT} (${Object.keys(stats).length} properties)`);
for (const [k, s] of Object.entries(stats)) {
  console.log(`  ${k.padEnd(28)} n=${String(s.n).padStart(4)}  min=${String(s.min).padStart(7)}  p10=${String(s.p10).padStart(7)}  med=${String(s.median).padStart(7)}  p90=${String(s.p90).padStart(7)}  max=${String(s.max).padStart(7)}`);
}
