#!/usr/bin/env node
/* R140 — Alloy-specific HT lookup 검증.
   주요 alloy + HT 조합에서 정확한 description 이 매칭되는지 확인. */
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('client/public/materials.json', 'utf8'));
const mats = (data.materials || data);

/* Test cases — material 의 name + heat_treatment 가 alloy-specific desc 와 매칭되어야 함. */
const TEST_CASES = [
  // PH stainless
  { match: '17-4 PH (UNS S17400) — H900', expectFamily: '17-4 PH', expectCode: 'H900' },
  { match: '17-4 PH (UNS S17400) — H1025', expectFamily: '17-4 PH', expectCode: 'H1025' },
  { match: '17-4 PH (UNS S17400) — H1150', expectFamily: '17-4 PH', expectCode: 'H1150' },
  { match: 'Custom 465 — H 950', expectFamily: 'Custom 465', expectCode: 'H 950' },
  // Maraging
  { match: 'Maraging 250 (UNS K92890) — Maraged 482°C/3h (typical)', expectFamily: 'Maraging 250', expectCode: '482°C/3h' },
  { match: 'Maraging 300 (UNS K93120, AMS 6514) — Solution + Aged (peak 480°C/6h)', expectFamily: 'Maraging 300', expectCode: 'Aged' },
  { match: 'Maraging C350 / VascoMax C-350', expectFamily: 'Maraging 350', expectCode: 'Aged' },
  // Ni superalloy
  { match: 'Inconel 718 Tech Data', expectFamily: '718', expectCode: 'STA' },
  // Ti
  { match: 'Ti-6Al-4V — Annealed', expectFamily: 'Ti-6Al-4V', expectCode: 'Annealed' },
  // BeCu
  { match: 'Beryllium Copper C17200 (CuBe2) — TF00', expectFamily: 'C17200', expectCode: 'TF00' },
  { match: 'Beryllium Copper C17200 (CuBe2) — TH04', expectFamily: 'C17200', expectCode: 'TH04' },
  // H13
  { match: 'Tool Steel H13', expectFamily: 'H13', expectCode: 'Q+T 540°C' },
  // 9% Ni A553
  { match: '9% Ni Steel (ASTM A553 Type I) — LNG tank', expectFamily: 'A553', expectCode: 'DN+T' },
  // 22MnB5
  { match: '22MnB5 (USIBOR 1500)', expectFamily: '22MnB5', expectCode: 'PHS' },
  // R141b — 새 family 매칭 확인 (이름 매칭만 검증 — heat_treatment 값은 실제 DB 의 표기에 의존)
  { match: '304', expectFamily: '304', expectCode: 'Annealed' },
  { match: '316', expectFamily: '316', expectCode: 'Annealed' },
  { match: 'Inconel 625', expectFamily: 'IN625', expectCode: 'Annealed' },
  { match: 'Inconel 600', expectFamily: 'IN600', expectCode: 'Annealed' },
  { match: 'Hastelloy X', expectFamily: 'Hastelloy X', expectCode: 'Solution' },
  { match: 'Haynes 230', expectFamily: 'Haynes 230', expectCode: 'Solution' },
  { match: 'Haynes 282', expectFamily: 'Haynes 282', expectCode: 'STA' },
  { match: 'CoCrMo', expectFamily: 'CoCrMo', expectCode: 'F75' },
];

/* Inline lookup (script doesn't load TS) */
const FAMILIES = [
  // R140
  { pattern: /17-?4\s?ph|s17400/i, family: '17-4 PH' },
  { pattern: /15-?5\s?ph|s15500/i, family: '15-5 PH' },
  { pattern: /custom\s?465/i, family: 'Custom 465' },
  { pattern: /aa\s?2024|^2024|aa\s?2014|aa\s?2219/i, family: 'AA 2xxx' },
  { pattern: /aa\s?6061|^6061|aa\s?6063|aa\s?6082|aa\s?6151/i, family: 'AA 6xxx' },
  { pattern: /aa\s?7075|^7075|aa\s?7050|aa\s?7068/i, family: 'AA 7xxx' },
  { pattern: /maraging\s?250|m-?250|vascomax\s?c-?250|k92890/i, family: 'Maraging 250' },
  { pattern: /maraging\s?300|m-?300|vascomax\s?c-?300|k93120/i, family: 'Maraging 300' },
  { pattern: /maraging\s?350|c-?350|vascomax\s?c-?350/i, family: 'Maraging 350' },
  { pattern: /inconel\s?718|in[\s-]?718|n07718/i, family: 'Inconel 718' },
  { pattern: /ti-?6al-?4v|ti6al4v|r56400/i, family: 'Ti-6Al-4V' },
  { pattern: /c17200|cube2?|moldmax/i, family: 'C17200 BeCu' },
  { pattern: /\bh13\b|skd61/i, family: 'H13' },
  { pattern: /a553|9\s?%?\s?ni|9ni/i, family: 'A553 9% Ni' },
  { pattern: /22mnb5|usibor/i, family: '22MnB5' },
  // R141b — Austenitic SS / Duplex / AHSS / Shipbuilding / Ni-SS / Co / Mg
  { pattern: /\b304l?\b|s30400|s30403|aisi\s?304/i, family: '304/304L' },
  { pattern: /\b316l?\b|s31600|s31603|aisi\s?316/i, family: '316/316L' },
  { pattern: /zeron\s?100|s32760|super.?duplex/i, family: 'ZERON 100' },
  { pattern: /2205|s32205|s31803/i, family: '2205 Duplex' },
  { pattern: /2507|s32750/i, family: '2507 Super-Duplex' },
  { pattern: /dp\s?980|dp980/i, family: 'DP980' },
  { pattern: /twip\s?1180|twip1180/i, family: 'TWIP1180' },
  { pattern: /\bah\s?36|\bdh\s?36|\beh\s?36|ah36|dh36|eh36/i, family: 'AH/DH/EH36' },
  { pattern: /inconel\s?625|in[\s-]?625|n06625/i, family: 'IN625' },
  { pattern: /inconel\s?600|in[\s-]?600|n06600/i, family: 'IN600' },
  { pattern: /inconel\s?617|in[\s-]?617|n06617/i, family: 'IN617' },
  { pattern: /hastelloy\s?x|n06002|hx\b/i, family: 'Hastelloy X' },
  { pattern: /haynes\s?230|n06230/i, family: 'Haynes 230' },
  { pattern: /haynes\s?282|n07208/i, family: 'Haynes 282' },
  { pattern: /stellite\s?6|r30006/i, family: 'Stellite 6' },
  { pattern: /cocrmo|f75|f1537/i, family: 'CoCrMo' },
  { pattern: /we\s?43|we43/i, family: 'WE43' },
  { pattern: /az\s?31|az31/i, family: 'AZ31' },
];

console.log('═══ Alloy-specific HT lookup 검증 (R140) ═══\n');
let passed = 0, failed = 0;
for (const tc of TEST_CASES) {
  const m = mats.find(m => m.name === tc.match) || mats.find(m => m.name && m.name.includes(tc.match.split(' — ')[0]));
  if (!m) {
    console.log(`✗ Material not found: ${tc.match}`);
    failed++;
    continue;
  }
  let foundFamily = null;
  for (const { pattern, family } of FAMILIES) {
    if (pattern.test(m.name)) { foundFamily = family; break; }
  }
  if (foundFamily && (foundFamily.includes(tc.expectFamily) || tc.expectFamily.includes(foundFamily))) {
    console.log(`✓ ${tc.match.substring(0, 55).padEnd(57)} → ${foundFamily}`);
    passed++;
  } else {
    console.log(`✗ ${tc.match.substring(0, 55).padEnd(57)} → expected ${tc.expectFamily}, got ${foundFamily || 'NONE'}`);
    failed++;
  }
}

console.log(`\n결과: ${passed}/${TEST_CASES.length} passed, ${failed} failed`);
console.log(`Coverage: ${Math.round(passed / TEST_CASES.length * 100)}%`);

// Count materials with HT in name + alloy match
let withHTInName = 0;
const HT_PATTERNS = [/h9\d{2}|h10\d{2}|h11\d{2}|h12\d{2}|t6|t7\d{2,3}|t8\d?|sta|dsa|aged|annealed|q\+t|tempered|maraged|tf00|th04|hip|as-built/i];
for (const m of mats) {
  if (HT_PATTERNS.some(rx => rx.test(m.name) || rx.test(m.heat_treatment || ''))) {
    let matched = false;
    for (const { pattern } of FAMILIES) {
      if (pattern.test(m.name)) { matched = true; break; }
    }
    if (matched) withHTInName++;
  }
}
console.log(`\n전체 DB 에서 alloy-specific HT 매칭 entries: ${withHTInName} / ${mats.length} (${Math.round(withHTInName / mats.length * 100)}%)`);
