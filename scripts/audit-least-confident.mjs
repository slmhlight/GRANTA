#!/usr/bin/env node
/* R133b — 자신감 가장 낮은 재료 식별.
   사용자: "재료가 없으면 표시하지 않는것도 하나의 방법이라고 생각해"
   → 표시 가치 < confidence 위험인 entry 추출 정책 제안. */
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('client/public/materials.json', 'utf8'));
const mats = (data.materials || data);

const CORE_PROPS = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];
const SAFETY_PROPS = ['fatigue_strength', 'impact_strength', 'fracture_toughness'];
const OPTIONAL_PROPS = ['electrical_conductivity', 'max_service_temp', 'thermal_expansion', 'poisson_ratio', 'specific_heat', 'melting_point', 'price_per_kg'];

/* Confidence score per property:
   measured = 4, handbook = 3, subfamily = 1.5, family = 0.5, class = 0.2, derived = 0.1, missing = 0 */
const CONF_W = { measured: 4, handbook: 3, subfamily: 1.5, family: 0.5, class: 0.2, derived: 0.1 };

function confidenceScore(m) {
  let core = 0, safety = 0, opt = 0;
  for (const p of CORE_PROPS) {
    const r = m.ranges?.[p];
    core += CONF_W[r?.confidence] || 0;
  }
  for (const p of SAFETY_PROPS) {
    const r = m.ranges?.[p];
    safety += CONF_W[r?.confidence] || 0;
  }
  for (const p of OPTIONAL_PROPS) {
    const r = m.ranges?.[p];
    opt += CONF_W[r?.confidence] || 0;
  }
  // Source quality bonus
  const sources = m.sources || [];
  const verifiedURLs = sources.filter(s => s.verified && s.url).length;
  const unverifiedNoURL = sources.filter(s => !s.verified && !s.url).length;
  const sourceBonus = verifiedURLs * 4 - unverifiedNoURL * 0.5;
  return { core, safety, opt, sourceBonus, total: core + safety + opt + sourceBonus };
}

function dispRisk(m) {
  // 사용자가 봤을 때 잘못된 데이터로 인식할 위험 점수
  // 1) 모든 prop class/derived 만 → 위험
  // 2) verified=false 인데 popularity 높음 → 위험
  // 3) safety props (fatigue/impact/KIC) 가 단순 family fallback → 위험
  let risk = 0;
  for (const p of SAFETY_PROPS) {
    const c = m.ranges?.[p]?.confidence;
    if (c === 'class' || c === 'derived') risk += 3;
    else if (c === 'family') risk += 2;
    else if (c === 'subfamily') risk += 1;
  }
  for (const p of CORE_PROPS) {
    const c = m.ranges?.[p]?.confidence;
    if (c === 'class' || c === 'derived') risk += 2;
    else if (c === 'family') risk += 1;
  }
  const sources = m.sources || [];
  const hasVerified = sources.some(s => s.verified);
  if (!hasVerified) risk += 4;
  return risk;
}

const scored = mats.map(m => {
  const s = confidenceScore(m);
  return {
    name: m.name,
    category: m.category,
    sub: m.subcategory,
    pop: m.popularity || 0,
    score: s.total,
    coreScore: s.core,
    safetyScore: s.safety,
    sourceBonus: s.sourceBonus,
    risk: dispRisk(m),
    verifiedCount: (m.sources || []).filter(s => s.verified).length,
    sourceCount: (m.sources || []).length,
  };
});

/* 1) 가장 자신감 낮은 (score 낮은 + risk 높은) entry */
console.log('\n═══ 1) 자신감 가장 낮은 25 material (low score + high risk + high pop) ═══\n');
const lowConf = scored
  .filter(s => s.pop >= 3)
  .map(s => ({ ...s, badness: s.risk - s.score * 0.3 + s.pop * 1.5 }))
  .sort((a, b) => b.badness - a.badness)
  .slice(0, 25);
console.log('Name'.padEnd(52) + ' | Cat'.padEnd(12) + ' | Pop | Score | CoreS | SafetyS | Risk | Verified');
console.log('-'.repeat(130));
for (const s of lowConf) {
  console.log(
    s.name.substring(0, 50).padEnd(52) + ' | ' +
    String(s.category).substring(0, 10).padEnd(12) + ' |  ' +
    s.pop.toFixed(1).padStart(3) + ' | ' +
    s.score.toFixed(1).padStart(5) + ' | ' +
    s.coreScore.toFixed(1).padStart(5) + ' |  ' +
    s.safetyScore.toFixed(1).padStart(5) + '  |  ' +
    s.risk.toFixed(0).padStart(2) + '  | ' +
    s.verifiedCount + '/' + s.sourceCount
  );
}

/* 2) "표시하지 말까?" 후보 — 안전 임계 데이터 거의 없음 + verified source 0 */
console.log('\n\n═══ 2) 표시 제외 후보 (verified=0 + safetyScore<2 + popularity≥3) ═══\n');
const hideCandidates = scored
  .filter(s => s.verifiedCount === 0 && s.safetyScore < 2 && s.pop >= 3)
  .sort((a, b) => b.pop - a.pop)
  .slice(0, 30);
if (hideCandidates.length === 0) {
  console.log('  없음 — 모든 popular entry 가 최소 verified source 1개 또는 적절한 safety 데이터 보유');
} else {
  for (const s of hideCandidates) {
    console.log(`  ${s.name.substring(0, 56).padEnd(58)} | ${s.sub.padEnd(30)} | pop=${s.pop.toFixed(1)} | safety=${s.safetyScore.toFixed(1)} | verified=${s.verifiedCount}/${s.sourceCount}`);
  }
}

/* 3) Polymer 가장 자신감 낮은 entries */
console.log('\n\n═══ 3) Polymer 자신감 낮은 entries (popularity≥3) ═══\n');
const polLow = scored.filter(s => s.category === 'Polymer' && s.pop >= 3)
  .sort((a, b) => (b.risk - b.score * 0.3) - (a.risk - a.score * 0.3))
  .slice(0, 15);
for (const s of polLow) {
  console.log(`  ${s.name.substring(0, 56).padEnd(58)} | pop=${s.pop.toFixed(1)} | score=${s.score.toFixed(1)} | risk=${s.risk} | verified=${s.verifiedCount}/${s.sourceCount}`);
}

/* 4) Ceramic/Composite */
console.log('\n\n═══ 4) Ceramic/Composite 자신감 낮은 entries ═══\n');
const cerCompLow = scored.filter(s => s.category === 'Ceramic' || s.category === 'Composite')
  .sort((a, b) => (b.risk - b.score * 0.3) - (a.risk - a.score * 0.3))
  .slice(0, 10);
for (const s of cerCompLow) {
  console.log(`  ${s.name.substring(0, 56).padEnd(58)} | ${s.category.padEnd(10)} | pop=${s.pop.toFixed(1)} | score=${s.score.toFixed(1)} | risk=${s.risk} | verified=${s.verifiedCount}/${s.sourceCount}`);
}
