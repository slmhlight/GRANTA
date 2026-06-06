#!/usr/bin/env node
/* R132b — 3rd_family + HT heuristic 신뢰도 평가.
   목적: subgroup typical (3rd family) + HT condition multiplier 조합의 실제 정확도 측정.
   결과로 어느 subfamily 에 handbook anchor 가 빠져있는지 파악. */
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('client/public/materials.json', 'utf8'));
const mats = (data.materials || data).filter(m => m.category === 'Metal');

// 각 subcategory 마다 confidence 분포 + provenance level 집계
const subStats = {};
for (const m of mats) {
  const sub = m.subcategory || 'Unknown';
  if (!subStats[sub]) {
    subStats[sub] = {
      count: 0,
      handbookProps: 0, subfamilyProps: 0, familyProps: 0, classProps: 0, derivedProps: 0,
      measured: 0,
      handbookAnchors: 0,   // measured+handbook ≥4 properties — 이 subfamily 의 anchor 노릇
      provenanceKeys: new Set(),
    };
  }
  const s = subStats[sub];
  s.count++;
  let highCount = 0;
  for (const [pk, r] of Object.entries(m.ranges || {})) {
    const c = r?.confidence;
    if (c === 'measured') { s.measured++; highCount++; }
    else if (c === 'handbook') { s.handbookProps++; highCount++; }
    else if (c === 'subfamily') s.subfamilyProps++;
    else if (c === 'family') s.familyProps++;
    else if (c === 'class') s.classProps++;
    else if (c === 'derived') s.derivedProps++;
    if (r?.provenance) {
      const pk2 = r.provenance.split('×')[0].trim();
      s.provenanceKeys.add(pk2);
    }
  }
  if (highCount >= 8) s.handbookAnchors++;  // 핵심 8+ property 가 measured/handbook 인 entry
}

// 3rd_family 의 fallback 사용 빈도
const provFreq = {};
for (const m of mats) {
  for (const r of Object.values(m.ranges || {})) {
    if (!r?.provenance) continue;
    const k = r.provenance.split('×')[0].trim();
    provFreq[k] = (provFreq[k] || 0) + 1;
  }
}

console.log('\n═══ 1) Subcategory anchor 가용성 (handbook anchor = 8+ measured/handbook props 보유 entry) ═══\n');
console.log('Subcategory'.padEnd(45) + ' | Total | Anchor | Anchor% | M/H% | Subf% | Fam% | Class% | Der%');
console.log('-'.repeat(120));
const rows = Object.entries(subStats).sort((a, b) => b[1].count - a[1].count);
const lowAnchor = [];
for (const [sub, s] of rows) {
  const tot = s.handbookProps + s.subfamilyProps + s.familyProps + s.classProps + s.derivedProps + s.measured;
  if (tot === 0) continue;
  const pct = n => (tot ? ((n / tot) * 100).toFixed(1).padStart(4) : '   -');
  const anchorPct = s.count ? ((s.handbookAnchors / s.count) * 100).toFixed(1).padStart(5) : '  0.0';
  console.log(
    sub.substring(0, 43).padEnd(45) + ' |  ' +
    String(s.count).padStart(3) + '  |  ' +
    String(s.handbookAnchors).padStart(3) + '   |  ' + anchorPct + '% | ' +
    pct(s.measured + s.handbookProps) + '% |  ' +
    pct(s.subfamilyProps) + '% | ' +
    pct(s.familyProps) + '% | ' +
    pct(s.classProps) + '% | ' +
    pct(s.derivedProps) + '%'
  );
  if (s.handbookAnchors === 0 && s.count >= 2) lowAnchor.push({ sub, count: s.count });
}

console.log('\n\n═══ 2) Anchor 부족 subfamily (entries≥2 인데 handbook anchor 0) ═══\n');
if (lowAnchor.length === 0) {
  console.log('  없음 — 모든 active subfamily 가 anchor 보유.');
} else {
  for (const x of lowAnchor) console.log(`  ${x.sub.padEnd(40)} | ${x.count} entries — anchor 없음`);
}

console.log('\n\n═══ 3) Provenance 사용 빈도 (Top 30 — fallback 의존도 가장 큰 source) ═══\n');
const topProv = Object.entries(provFreq).sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [k, n] of topProv) {
  console.log(`  ${String(n).padStart(5)} × ${k}`);
}

// 3rd_family heuristic 신뢰도 추정 — provenance 라벨로부터 expected error band
console.log('\n\n═══ 4) Heuristic 신뢰도 (3rd family / 2nd family / 1st family · expected error band) ═══\n');
const bands = {
  'measured': '±5-10% (실측 다수, 통계적 신뢰)',
  'handbook (alloy-specific)': '±10-15% (vendor datasheet 1차 자료)',
  'handbook (alloy × HT-adjusted)': '±15-20% (peak baseline + multiplier 조정)',
  'subfamily (3rd family)': '±15-25% (예: Stainless Austenitic typical)',
  'family (2nd family)': '±25-40% (예: Stainless 일반)',
  'class (1st family)': '±40-60% (예: Iron-based 일반)',
  'derived (σf ≈ k·UTS)': '±25-30% (Shigley ratio family typical)',
};
for (const [k, v] of Object.entries(bands)) {
  console.log(`  ${k.padEnd(40)} → ${v}`);
}
