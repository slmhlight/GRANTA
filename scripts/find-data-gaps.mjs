#!/usr/bin/env node
/* R126 — 데이터 부족 entry 추출. popularity 높지만 handbook/measured 비율 낮은 것 우선. */
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('client/public/materials.json', 'utf8'));
const mats = data.materials || data;

function dataScore(m) {
  let score = 0;
  for (const k of Object.keys(m.ranges || {})) {
    const c = m.ranges[k]?.confidence;
    if (c === 'measured') score += 4;
    else if (c === 'handbook') score += 3;
    else if (c === 'subfamily') score += 1;
    else if (c === 'family') score += 0.5;
  }
  const verified = (m.sources || []).filter(s => s.verified).length;
  score += verified * 5;
  return score;
}

const candidates = mats
  .filter(m => (m.popularity || 0) >= 4)
  .filter(m => m.category === 'Metal' || m.category === 'Polymer')
  .map(m => ({
    name: m.name,
    pop: m.popularity,
    cat: m.category,
    sub: m.subcategory,
    process: m.process,
    score: dataScore(m),
    verified: (m.sources || []).filter(s => s.verified).length,
    measured: Object.values(m.ranges || {}).filter(r => r?.confidence === 'measured').length,
    handbook: Object.values(m.ranges || {}).filter(r => r?.confidence === 'handbook').length,
    subfamily: Object.values(m.ranges || {}).filter(r => r?.confidence === 'subfamily').length,
    cls: Object.values(m.ranges || {}).filter(r => r?.confidence === 'class').length,
    derived: Object.values(m.ranges || {}).filter(r => r?.confidence === 'derived').length,
  }))
  .sort((a, b) => a.score - b.score);

// 동일 base alloy 중복 제거
const seen = new Set();
const top = [];
for (const c of candidates) {
  const baseToken = c.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/);
  const base = baseToken.slice(0, 2).join('_');
  if (seen.has(base)) continue;
  seen.add(base);
  top.push(c);
  if (top.length >= 15) break;
}

console.log('\nTop 15 data-deficient popular alloys (popularity >= 4):\n');
console.log('Rank | Name'.padEnd(60) + ' | Pop | Verified | Measured | Handbook | Subfam | Class | Derived | Score');
console.log('-'.repeat(150));
top.forEach((c, i) => {
  const nm = c.name.substring(0, 55).padEnd(57);
  console.log(
    String(i + 1).padStart(4) + ' | ' + nm + ' |  ' + c.pop +
    '  |    ' + c.verified +
    '     |    ' + c.measured +
    '     |    ' + c.handbook +
    '     |   ' + c.subfamily +
    '    |   ' + c.cls +
    '   |   ' + c.derived +
    '    | ' + c.score.toFixed(1)
  );
});
console.log();
