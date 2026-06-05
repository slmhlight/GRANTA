#!/usr/bin/env node
/*
 * R125b — 랜덤 샘플 검수 script.
 *
 * 사용법:
 *   node scripts/audit-random-sample.mjs                # default 20 entries
 *   node scripts/audit-random-sample.mjs 30             # 30 entries
 *   node scripts/audit-random-sample.mjs 30 Ceramic     # category 필터
 *   node scripts/audit-random-sample.mjs 20 Metal Stainless   # category + subcategory 필터
 *
 * 출력: 각 entry 의 핵심 derived value + 카드 표시 여부 + fallback level 표시.
 * 사용자 검토 후 잘못된 매핑을 발견하면 build-materials.mjs 의 family rule 또는
 * ALLOY_SPECIFIC 항목에 직접 입력해서 fix.
 */
import fs from 'node:fs';
import path from 'node:path';

const N = Number(process.argv[2] || 20);
const filterCat = process.argv[3] || null;
const filterSub = process.argv[4] || null;

const dataPath = path.resolve('client/public/materials.json');
if (!fs.existsSync(dataPath)) {
  console.error('Error: client/public/materials.json not found. Run `pnpm build:data` first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const all = data.materials || data;

let pool = all;
if (filterCat) pool = pool.filter(m => m.category === filterCat);
if (filterSub) pool = pool.filter(m => (m.subcategory || '').includes(filterSub));

if (pool.length === 0) {
  console.error('Error: no materials match filter.');
  process.exit(1);
}

// 시드 기반 shuffle (재현 가능) — 시드는 일자 + 입력 인자
const seed = `${new Date().toISOString().slice(0, 10)}_${N}_${filterCat || ''}_${filterSub || ''}`;
let h = 0;
for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
const rng = () => { h = (h * 9301 + 49297) % 233280; return h / 233280; };

const sample = [...pool].sort(() => rng() - 0.5).slice(0, N);

// 각 entry 의 derived value 분석
console.log(`\n${'='.repeat(110)}`);
console.log(`Random Sample Audit — ${N} entries`);
console.log(`Filter: category=${filterCat || 'all'}, subcategory=${filterSub || 'all'}`);
console.log(`Pool size: ${pool.length} / Total DB: ${all.length}`);
console.log(`Seed: ${seed}`);
console.log(`${'='.repeat(110)}\n`);

const FLAG = (cond, msg) => cond ? `⚠ ${msg}` : '';

let flagCount = 0;
const issues = [];

for (let i = 0; i < sample.length; i++) {
  const m = sample[i];
  const r = m.ranges || {};
  const f = (n) => n == null ? 'N/A' : (typeof n === 'number' ? (Number.isInteger(n) ? n.toString() : n.toFixed(2)) : String(n));

  // 카드 표시 적절성 평가
  const cardFlags = [];
  const isMetal = m.category === 'Metal';
  const isCeramic = m.category === 'Ceramic';
  const isComposite = m.category === 'Composite';
  const isPolymer = m.category === 'Polymer';

  // Machining card — Metal 만 표시되어야 함
  if (m.machining_cost_factor != null && (isCeramic || isComposite)) {
    cardFlags.push('가공성 카드 부적절 (Ceramic/Composite)');
  }
  // HT card — Metal 만
  if (m.ht_cost_factor != null && m.ht_cost_factor > 1.0 && (isCeramic || isComposite)) {
    cardFlags.push('HT 카드 부적절 (Ceramic/Composite, sintering 이 본체)');
  }
  // 가격 차별화 평가
  const cf = m.price_condition_factor;
  const ff = m.price_form_factor;
  const gp = m.price_grade_premium;
  // Confidence level 분석
  const confLevels = {};
  for (const k of Object.keys(r)) {
    const c = r[k]?.confidence;
    if (c) confLevels[c] = (confLevels[c] || 0) + 1;
  }
  // 출처 검증
  const verified = (m.sources || []).filter(s => s.verified).length;
  const totalSrc = (m.sources || []).length;

  console.log(`\n[${i + 1}/${N}] ${m.name}`);
  console.log(`   category: ${m.category} · subcategory: ${m.subcategory || 'N/A'} · process: ${m.process || 'N/A'} · tier: ${m.tier || 'N/A'}`);
  console.log(`   condition: ${m.heat_treatment || 'N/A'}`);
  console.log(`   ρ: ${f(r.density?.typical)} · σy: ${f(r.yield_strength?.typical)} · UTS: ${f(r.uts?.typical)} · E: ${f(r.modulus?.typical)} · El: ${f(r.elongation?.typical)}`);
  console.log(`   raw $/kg: ${f(m.price_per_kg)} → deliv: ${f(m.delivered_price_per_kg)} (cond×${f(cf)} · form×${f(ff)} · grade×${f(gp)})`);
  console.log(`   machining ×${f(m.machining_cost_factor)} · ht ×${f(m.ht_cost_factor)}`);
  console.log(`   confidence breakdown: ${JSON.stringify(confLevels)}`);
  console.log(`   sources: ${verified}/${totalSrc} verified${m.industry_note ? ' · 산업 노트 ✓' : ''}`);
  if (cardFlags.length > 0) {
    flagCount++;
    cardFlags.forEach(f => {
      issues.push(`${m.name}: ${f}`);
      console.log(`   ⚠ FLAG: ${f}`);
    });
  }
  // 가격 1.0 plain — fallback 의심
  if (cf === 1.0 && ff === 1.0 && gp === 1.0 && isMetal && !/as.?supplied/i.test(String(m.heat_treatment || ''))) {
    issues.push(`${m.name}: condition/form/grade 모두 1.0 — fallback 의심`);
    console.log(`   ⚠ FLAG: condition/form/grade 모두 1.0 — fallback 의심 (heat_treatment 매칭 안 됨?)`);
    flagCount++;
  }
}

console.log(`\n${'='.repeat(110)}`);
console.log(`Audit complete — ${N} sample · ${flagCount} flag${flagCount === 1 ? '' : 's'}`);
console.log(`${'='.repeat(110)}\n`);

if (issues.length > 0) {
  console.log('\n📋 Issue summary:');
  issues.slice(0, 20).forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  if (issues.length > 20) console.log(`  ... ${issues.length - 20} more`);
}

// validation report 에 append (옵션)
const reportPath = path.resolve('data/audit-random-samples.md');
const newSection = `\n## Random sample audit — ${new Date().toISOString().slice(0, 10)} · seed=${seed}\n`
  + `Filter: cat=${filterCat || 'all'}, sub=${filterSub || 'all'} · pool=${pool.length} / ${all.length} · sampled=${N} · flagged=${flagCount}\n\n`
  + issues.map(s => `- ${s}`).join('\n') + '\n';
const existing = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : '# Random Sample Audit Log\n\n샘플 검수 기록. `node scripts/audit-random-sample.mjs` 실행 결과를 누적.\n';
fs.writeFileSync(reportPath, existing + newSection);
console.log(`\n💾 Issue log appended to ${reportPath}`);
