#!/usr/bin/env node
/* R129 — 모든 금속 데이터 + fallback 검증 audit.
   사용자 요청: 15-5/17-4 PH HT 미반영 케이스 시작점. fallback 출처 명시 및 confidence breakdown.

   Report 구조:
   1) 카테고리별 confidence breakdown (measured/handbook/subfam/fam/class/derived)
   2) HT-sensitive 속성 (fatigue/impact/KIC/k/CTE) 가 condition variant 간 동일한 케이스
   3) Low-confidence (class/derived) + popularity≥4 high-impact gap 리스트
   4) source verified=false 인 고-우선순위 entry
   5) HT condition 누락 의심 (PH/Maraging/Tool/Aged Ni superalloy 인데 condition 정보 없는 경우)
*/
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('client/public/materials.json', 'utf8'));
const mats = (data.materials || data).filter(m => m.category === 'Metal');

const PROPS = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness',
  'thermal_conductivity', 'fatigue_strength', 'impact_strength', 'fracture_toughness',
  'electrical_conductivity', 'max_service_temp', 'thermal_expansion', 'poisson_ratio',
  'specific_heat', 'melting_point', 'price_per_kg'];

const HT_SENSITIVE = ['yield_strength', 'uts', 'elongation', 'hardness', 'fatigue_strength',
  'impact_strength', 'fracture_toughness'];

function confidenceCounts(m) {
  const c = { measured: 0, handbook: 0, subfamily: 0, family: 0, class: 0, derived: 0, missing: 0 };
  for (const p of PROPS) {
    const r = m.ranges?.[p];
    if (!r) { c.missing++; continue; }
    c[r.confidence || 'missing']++;
  }
  return c;
}

// ─── 1) Subcategory-level confidence breakdown ───
const bySubcat = {};
for (const m of mats) {
  const sub = m.subcategory || 'Unknown';
  if (!bySubcat[sub]) bySubcat[sub] = { count: 0, props: { measured: 0, handbook: 0, subfamily: 0, family: 0, class: 0, derived: 0, missing: 0 } };
  bySubcat[sub].count++;
  const c = confidenceCounts(m);
  for (const k of Object.keys(c)) bySubcat[sub].props[k] += c[k];
}

console.log('\n═══ 1) Subcategory confidence breakdown (entries · totalProps · %measured · %handbook · %fallback · %class+derived) ═══\n');
console.log('Subcategory'.padEnd(45) + ' | Ent | Props | M%  | H%  | SF% | F%  | C%  | D%');
console.log('-'.repeat(110));
const subRows = Object.entries(bySubcat).sort((a, b) => b[1].count - a[1].count);
for (const [sub, x] of subRows) {
  const total = Object.values(x.props).reduce((a, b) => a + b, 0);
  const pct = k => total ? ((x.props[k] / total) * 100).toFixed(1).padStart(4) : '   -';
  console.log(sub.substring(0, 43).padEnd(45) + ' | ' +
    String(x.count).padStart(3) + ' | ' +
    String(total).padStart(5) + ' | ' +
    pct('measured') + '| ' +
    pct('handbook') + '| ' +
    pct('subfamily') + '| ' +
    pct('family') + '| ' +
    pct('class') + '| ' +
    pct('derived'));
}

// ─── 2) HT-variant condition consistency ───
// 같은 base alloy (이름에서 conditions 제거) 의 여러 entry 가 HT-sensitive props 같은 값 → fallback artifact
// R129 — peak-equivalent (aged/sta/dsa/null) 만 모인 경우는 정상 (legitimate flatline) → 별도 분류.
console.log('\n\n═══ 2a) TRUE flatline — 서로 다른 HT condition 인데 secondary prop 동일 (진짜 fallback 미반영) ═══\n');
const baseKey = (name) => name
  .replace(/—\s*(?:As-?built|H900|H925|H1025|H1075|H1100|H1150|H1175|H1200|Annealed|Aged|Solution[\s+a-zA-Z]*|Q\+T[\s+a-zA-Z]*|Maraged[\s+a-zA-Z]*|HIP|STA|MA|CW|HT|wrought|cast|forged|TF\d{2}|TH\d{2}|TC\d{2}|wp|whp).*$/i, '')
  .replace(/\([^)]*\)/g, '')
  .trim()
  .toLowerCase();

const PEAK_EQ = /^(aged|maraged|sta|stat|dsa|solution\s*\+\s*aged|peak|hardened|tempered|q\+t|hip|null|empty|\(empty\)|unknown|as-?supplied|standard|typical)$/i;
/* R130c — austenitic SS / solid-solution Ni / Invar / pure refractory 는 metallurgically HT-insensitive.
   이들 family 에서는 annealed / solution-treated / stress-relieved 사이 flatline 이 정상 (peak 가 별도로 없음). */
const HT_INSENSITIVE = /^(annealed|solution|stress[\s-]*relieved|recrystalliz|hot[\s-]*worked|mill[\s-]*annealed|as[\s-]*rolled|as[\s-]*cast|as[\s-]*forged|as[\s-]*built|as[\s-]*supplied|cold[\s-]*finished|cold[\s-]*work|cw\b|h0[2-9]|h1[0-4])/i;
/* austenitic SS / solid-solution Ni / Invar/Kovar / pure metals — peak hardening 불가 → 모든 condition 동일 취급. */
const ALLOY_HT_INSENSITIVE = /\baustenit|\b316l?\b|\b304l?\b|\b321\b|\b347\b|\b301\b|\b302\b|\b305\b|invar|kovar|monel\s*400|monel(?!.*k)|inconel\s*60[0-9]|inconel\s*617|inconel\s*690|inconel\s*740|hastelloy|incoloy\s*8(?:00|25)|haynes\s*230|haynes\s*214|haynes\s*188|nickel\s*200|cp[\s-]?nickel|tantalum|niobium|c-?103|tzm|molybdenum|tungsten|cocrmo|cocr\b|narloy|aa[\s-]*3[0-9]{3}|aa[\s-]*5[0-9]{3}|aa[\s-]*1[0-9]{3}|aa\s*1100|1010\b|1018\b|1020\b|astm\s*a36|a36\b|a992\b|brass|c2[6-8]\d{3}|c4[6-8]\d{3}|c3[0-9]{4}|naval\s*brass/i;
const isPeakEquivalent = (ht, alloyHint) => {
  if (!ht) return true;
  const t = ht.trim();
  if (PEAK_EQ.test(t)) return true;
  if (alloyHint && ALLOY_HT_INSENSITIVE.test(alloyHint) && HT_INSENSITIVE.test(t)) return true;
  /* CSV-generic multi-condition string like "Aged / solution-treated / Annealed" → 모호함, audit 신뢰도 낮음. */
  if (t.includes('/') || t.includes(',')) return true;
  return false;
};

const groups = {};
for (const m of mats) {
  const k = baseKey(m.name);
  if (!groups[k]) groups[k] = [];
  groups[k].push(m);
}

const trueFlatlines = [];
const okFlatlines = [];
for (const [k, ms] of Object.entries(groups)) {
  if (ms.length < 2) continue;
  for (const prop of HT_SENSITIVE) {
    const typicals = ms.map(m => m.ranges?.[prop]?.typical).filter(x => x !== undefined && x !== null);
    if (typicals.length < 2) continue;
    const uniq = new Set(typicals);
    if (uniq.size === 1) {
      const hts = ms.map(m => m.heat_treatment || '');
      const alloyHint = ms[0].name;
      const distinctNonPeak = hts.filter(h => h && !isPeakEquivalent(h, alloyHint));
      const entry = { base: k, prop, value: typicals[0], variants: hts, count: ms.length, nonPeakHTs: [...new Set(distinctNonPeak)] };
      if (distinctNonPeak.length >= 1) trueFlatlines.push(entry);
      else okFlatlines.push(entry);
    }
  }
}
trueFlatlines.sort((a, b) => (b.nonPeakHTs.length * 10 + b.count) - (a.nonPeakHTs.length * 10 + a.count));
console.log(`Found ${trueFlatlines.length} TRUE flatlines (heat-treatment-sensitive 인데 분기 안 됨):\n`);
for (const f of trueFlatlines.slice(0, 30)) {
  console.log(`  ${f.base.substring(0, 38).padEnd(40)} | ${f.prop.padEnd(20)} = ${String(f.value).padStart(6)} | distinct non-peak HTs: ${f.nonPeakHTs.slice(0, 4).join(' / ')}`);
}
if (trueFlatlines.length > 30) console.log(`  ... (${trueFlatlines.length - 30} more)`);

console.log(`\n═══ 2b) OK flatline (peak-equivalent 만 모임 — 합리적) ═══`);
console.log(`Found ${okFlatlines.length} peak-equivalent flatlines (Aged/STA/DSA/peak null 등이 같은 값 → 합리적)`);

// ─── 3) Low-confidence high-popularity gaps ───
console.log('\n\n═══ 3) Low-confidence + popularity≥4 (high-impact data gaps) ═══\n');
const gaps = [];
for (const m of mats) {
  if ((m.popularity || 0) < 4) continue;
  const c = confidenceCounts(m);
  const lowQuality = c.class + c.derived;
  const highQuality = c.measured + c.handbook;
  if (lowQuality >= 6 || (highQuality < 5 && c.subfamily + c.family >= 4)) {
    gaps.push({ name: m.name, sub: m.subcategory, pop: m.popularity, c, score: lowQuality - highQuality });
  }
}
gaps.sort((a, b) => b.score - a.score);
console.log(`Found ${gaps.length} low-confidence popular metals:\n`);
console.log('Name'.padEnd(50) + ' | Sub'.padEnd(30) + ' | Pop | Meas | Hbk | SubF | Fam | Class | Der');
console.log('-'.repeat(140));
for (const g of gaps.slice(0, 50)) {
  console.log(g.name.substring(0, 48).padEnd(50) + ' | ' +
    String(g.sub).substring(0, 28).padEnd(30) + ' |  ' + g.pop +
    '  |  ' + String(g.c.measured).padStart(3) +
    ' | ' + String(g.c.handbook).padStart(3) +
    ' |  ' + String(g.c.subfamily).padStart(3) +
    ' | ' + String(g.c.family).padStart(3) +
    ' |  ' + String(g.c.class).padStart(3) +
    '  | ' + String(g.c.derived).padStart(3));
}
if (gaps.length > 50) console.log(`  ... (${gaps.length - 50} more)`);

// ─── 4) Source verified=false 인 high-popularity entry ───
console.log('\n\n═══ 4) Unverified sources + popularity≥4 ═══\n');
const unverified = [];
for (const m of mats) {
  if ((m.popularity || 0) < 4) continue;
  const sources = m.sources || [];
  if (sources.length === 0) {
    unverified.push({ name: m.name, sub: m.subcategory, pop: m.popularity, status: 'NO SOURCES' });
  } else {
    const verifiedCount = sources.filter(s => s.verified).length;
    if (verifiedCount === 0) {
      unverified.push({ name: m.name, sub: m.subcategory, pop: m.popularity, status: `${sources.length} unverified` });
    }
  }
}
console.log(`Found ${unverified.length} high-popularity entries without verified sources:\n`);
for (const u of unverified.slice(0, 60)) {
  console.log(`  ${u.name.substring(0, 52).padEnd(54)} | ${u.sub.padEnd(32)} | pop=${u.pop} | ${u.status}`);
}
if (unverified.length > 60) console.log(`  ... (${unverified.length - 60} more)`);

// ─── 5) HT condition 누락 의심 ───
// PH stainless / Maraging / Tool Steel / Aged Ni superalloy 인데 heat_treatment 가 비었거나 일반적인 'As-supplied'/'Annealed'
console.log('\n\n═══ 5) HT condition 누락 의심 (precipitation-hardened material 인데 condition info 없음) ═══\n');
const PH_SUBS = /Stainless Steel - PH|Maraging|Tool Steel|Nickel Superalloy/;
/* R130a — vague-HT 판정: empty / generic "as-supplied" 만 vague. 구체적 HT 가 명시되면 "(standard mill product)" 같은
   부연 표현은 OK. "typical" 도 condition 명 안에 정상적으로 들어가는 단어 (예: "Maraged 482°C/3h (typical)" 는 명시적). */
const VAGUE_HT = /^$|^undefined$|^unknown$|^as-?supplied$|^wrought$|^cast$|^forged$|^standard$/i;
const phSuspects = [];
for (const m of mats) {
  if (!PH_SUBS.test(m.subcategory || '')) continue;
  const ht = m.heat_treatment || '';
  if (VAGUE_HT.test(ht)) {
    phSuspects.push({ name: m.name, sub: m.subcategory, ht: ht || '(empty)' });
  }
}
console.log(`Found ${phSuspects.length} PH/Maraging/Tool/Ni-superalloy entries with vague/missing HT:\n`);
for (const p of phSuspects) {
  console.log(`  ${p.name.substring(0, 60).padEnd(62)} | ${p.sub.padEnd(35)} | HT="${p.ht}"`);
}

// ─── 6) Summary ───
console.log('\n\n═══ 6) Overall summary ═══\n');
const totalProps = mats.reduce((acc, m) => {
  const c = confidenceCounts(m);
  for (const k of Object.keys(c)) acc[k] = (acc[k] || 0) + c[k];
  return acc;
}, {});
const grandTotal = Object.values(totalProps).reduce((a, b) => a + b, 0);
console.log(`Total metals: ${mats.length}`);
console.log(`Total prop slots: ${grandTotal}\n`);
console.log('Confidence distribution:');
for (const k of ['measured', 'handbook', 'subfamily', 'family', 'class', 'derived', 'missing']) {
  const n = totalProps[k] || 0;
  const pct = ((n / grandTotal) * 100).toFixed(1);
  console.log(`  ${k.padEnd(10)}: ${String(n).padStart(5)} (${pct}%)`);
}
console.log(`\nTRUE flatlines (HT-sensitive 분기 미반영): ${trueFlatlines.length}`);
console.log(`OK flatlines (peak-equivalent — 합리적): ${okFlatlines.length}`);
console.log(`Low-confidence high-pop gaps: ${gaps.length}`);
console.log(`Unverified high-pop entries: ${unverified.length}`);
console.log(`Vague-HT precipitation-hardened entries: ${phSuspects.length}\n`);
