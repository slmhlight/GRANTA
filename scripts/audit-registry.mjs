// R226 검수 — 1198 entry 명백한 오류 전수 검출 (물리 불가능·데이터 공백·중복·가짜 variant·분류 불일치).
import fs from 'node:fs';
const all = [];
const REG = 'data/registry/entries';   // R226 — 교정 반영된 레지스트리를 SSOT 로 감사 (없으면 shard fallback)
if (fs.existsSync(REG)) { for (const cc of fs.readdirSync(REG)) for (const fn of fs.readdirSync(`${REG}/${cc}`)) all.push(JSON.parse(fs.readFileSync(`${REG}/${cc}/${fn}`, 'utf8'))); }
else for (const f of ['metal', 'polymer', 'ceramic', 'composite']) for (const m of JSON.parse(fs.readFileSync(`client/public/materials/${f}.json`, 'utf8'))) all.push(m);
const rng = (m, p) => (m.ranges?.[p]?.typical ?? (typeof m[p] === 'number' ? m[p] : null));
const findings = {}; const add = (k, m, d) => { (findings[k] = findings[k] || []).push(`${(m.name || '').slice(0, 44)} :: ${d}`); };

for (const m of all) {
  const sy = rng(m, 'yield_strength'), uts = rng(m, 'uts'), el = rng(m, 'elongation'), den = rng(m, 'density'),
    mod = rng(m, 'modulus'), fat = rng(m, 'fatigue_strength'), hard = rng(m, 'hardness'),
    tmax = rng(m, 'max_service_temp'), tmelt = rng(m, 'melting_point');
  // A. σy > UTS (불가능)
  if (sy != null && uts != null && sy > uts + 1) add('A_yield>uts', m, `σy ${sy} > UTS ${uts}`);
  // B. fatigue > UTS (불가능)
  if (fat != null && uts != null && fat > uts + 1) add('B_fatigue>uts', m, `σf ${fat} > UTS ${uts}`);
  // C. elongation 범위 — 폴리머/엘라스토머는 100%+ 정상이므로 metal 한정 (metal El>80 의심)
  if (el != null && (el < 0 || (m.category === 'Metal' && el > 90))) add('C_elongation', m, `El ${el}% (${m.category})`);
  // D. density 범위 (0.01~25 g/cc; W 19.3 + 여유)
  if (den != null && (den <= 0.01 || den > 25)) add('D_density', m, `ρ ${den}`);
  // E. modulus 범위 (0~1200 GPa)
  if (mod != null && (mod <= 0 || mod > 1200)) add('E_modulus', m, `E ${mod}`);
  // F. 음수 물성
  for (const [p, v] of [['σy', sy], ['UTS', uts], ['El', el], ['ρ', den], ['E', mod], ['σf', fat], ['HV', hard]]) if (v != null && v < 0) add('F_negative', m, `${p} ${v}`);
  // G. Tmax > Tmelt
  if (tmax != null && tmelt != null && tmax > tmelt + 1) add('G_tmax>tmelt', m, `Tmax ${tmax} > Tmelt ${tmelt}`);
  // H. curated/am_vendor 인데 σy·UTS 둘 다 없음 (고신뢰 데이터 공백)
  if ((m.tier === 'curated' || m.tier === 'am_vendor') && sy == null && uts == null) add('H_curated_gap', m, `tier=${m.tier} σy/UTS 둘 다 null`);
  // I. UTS/σy 비 이상 (>4 의심, metal 한정)
  if (m.category === 'Metal' && sy != null && uts != null && sy > 10 && uts / sy > 4) add('I_uts_yield_ratio', m, `UTS/σy = ${(uts / sy).toFixed(1)} (σy${sy}/UTS${uts})`);
}

// J. 중복 이름 (정확 일치)
const byName = {}; for (const m of all) (byName[m.name] = byName[m.name] || []).push(m.id);
for (const [n, ids] of Object.entries(byName)) if (ids.length > 1) add('J_dup_name', { name: n }, `${ids.length}× ids: ${ids.join(',')}`);

// K. 조성↔subcategory 원소 불일치: subcat 이 특정 base 원소를 지시하는데 조성에 그 원소 없음
const subEl = (s) => { s = s.toLowerCase(); if (/nickel|inconel|incoloy|hastelloy|monel|nimonic/.test(s)) return 'Ni'; if (/titanium/.test(s)) return 'Ti'; if (/copper|bronze|brass/.test(s)) return 'Cu'; if (/magnesium/.test(s)) return 'Mg'; if (/cobalt/.test(s)) return 'Co'; if (/alumin/.test(s) && !/bronze/.test(s)) return 'Al'; return null; };
for (const m of all) {
  if (m.category !== 'Metal' || !m.composition || typeof m.composition !== 'object' || Array.isArray(m.composition)) continue;
  const want = subEl(m.subcategory); if (!want) continue;
  const keys = Object.keys(m.composition);
  // "Ni+Co" 같은 결합 표기도 인정. 조성 자체가 비었으면 별도 플래그.
  if (!keys.length) add('K_comp_subcat_mismatch', m, `subcat "${m.subcategory.slice(0, 24)}" — 조성 비어있음(empty)`);
  else if (!keys.some(k => new RegExp(`\\b${want}\\b`).test(k))) add('K_comp_subcat_mismatch', m, `subcat "${m.subcategory.slice(0, 24)}" → ${want} 기대, 조성 키: ${keys.slice(0, 6).join(',')}`);
}

// I2. 가짜 variant (R226 정밀화): 같은 alloy-base, 동일 σy/UTS, HT가 서로 다른 "공정상태"인데 같은 값.
//     같은 상태끼리(soft↔soft, hard↔hard) 같은 값은 정상(genuinely similar) → SOFT↔HARD 교차 충돌만 진짜 오류.
const baseOf = (n) => String(n || '').split(' — ')[0].trim();
const byBase = {}; for (const m of all) (byBase[baseOf(m.name)] = byBase[baseOf(m.name)] || []).push(m);
// 공정상태 분류: 강화(HARD) vs 연화/as-fab(SOFT)
const stateOf = (h) => {
  h = (h || '').toLowerCase();
  if (/\baged|solution.?age|\bsta\b|q\s*\+?\s*t|quench|temper|strain.?hard|cold.?work|peak|precipit|hardened|carburiz|\bcase\b|h\d{3,}|h9\d\d/.test(h)) return 'HARD';
  return 'SOFT'; // annealed · as-cast/forged · mill-annealed · normalized · tmcp · as-built · stress-relieved · solution(only)
};
// R226 검토완료 아티팩트: 합성 HARD 라벨(strain-hardened/aged)이 실제로는 = annealed 인 케이스.
//   값은 정상 — 해당 합금이 냉간가공/석출경화 안 하거나(α·near-α·CP·마르텐사이트), 가공률 의존이라 단일표준 없음.
const REVIEWED = {
  'Ti-5-2-5': 'Ti-5Al-2.5Sn Grade6 α 비열처리 — aged/SH ≈ annealed (교정 827/861)',
  'Ti-6-2-4-6': 'α/β — STA 교정(1105/1200); SH은 Ti 냉간가공 비표준 → annealed',
  'Ti-8-1-1': 'near-α 시효응답 미미 — 라벨 아티팩트 (교정 910/937)',
  'Ti Grade 23': 'Ti-6Al-4V ELI — STA 교정(900/965); SH 비표준 → annealed',
  'Ti Grade 1': 'CP Ti — SH 냉간가공률 의존(단일표준 없음), annealed 유지',
  'Ti Grade 2': 'CP Ti — SH 냉간가공률 의존, annealed 유지',
  'Ti Grade 3': 'CP Ti — SH 냉간가공률 의존, annealed 유지',
  'Ti Grade 4': 'CP Ti — SH 냉간가공률 의존, annealed 유지',
  'Ti Grade 7': 'CP Ti+Pd 비석출경화 — aged≈annealed; SH 가공률 의존',
  'AISI 440C': '마르텐사이트 — 경화 교정(1900/1970); SH 냉간가공 안 함 → annealed',
  'AISI 6150': '스프링강 — SH 냉간가공률 의존; 경화조건은 데이터 공백(별도)',
  'AISI 1020': '탄소강 — SH=cold-drawn≈annealed; 라벨 아티팩트',
  'Inconel 100': '주조 Ni superalloy — 주조+시효 단일조건; annealed/as-forged 라벨 합성(값 정상)',
  'CuNi2SiCr': 'Cu-Ni-Si Corson — Heat-Treated/Solution-Age/Aged 모두 peak-aged 동일조건(정상); solution-only 200/275 별도',
};
for (const [b, arr] of Object.entries(byBase)) {
  if (arr.length < 2) continue;
  const byVal = {}; for (const m of arr) { const k = `${rng(m, 'yield_strength')}|${rng(m, 'uts')}`; (byVal[k] = byVal[k] || []).push(m); }
  for (const grp of Object.values(byVal)) {
    if (grp.length < 2 || rng(grp[0], 'yield_strength') == null) continue;
    const states = new Set(grp.map(m => stateOf(m.heat_treatment)));
    if (states.size < 2) continue; // 같은 상태끼리 같은 값 = 정상
    const byState = { SOFT: [], HARD: [] }; for (const m of grp) byState[stateOf(m.heat_treatment)].push((m.heat_treatment || '?').slice(0, 20));
    const desc = `σy${rng(grp[0], 'yield_strength')}/UTS${rng(grp[0], 'uts')} — SOFT[${byState.SOFT.join(',')}] ≡ HARD[${byState.HARD.join(',')}]`;
    if (REVIEWED[b]) add('I2_reviewed', { name: b }, `${desc} → ${REVIEWED[b]}`);
    else add('I2_fake_variant', { name: b }, `${desc} (강화상태가 연화값 — 미해결)`);
  }
}

// 출력
const labels = { 'A_yield>uts': 'σy > UTS (물리 불가능)', 'B_fatigue>uts': 'fatigue > UTS (불가능)', 'C_elongation': 'elongation 범위 밖', 'D_density': 'density 범위 밖', 'E_modulus': 'modulus 범위 밖', 'F_negative': '음수 물성', 'G_tmax>tmelt': 'Tmax > Tmelt', 'H_curated_gap': 'curated/vendor σy·UTS 공백', 'I_uts_yield_ratio': 'UTS/σy 비 이상(>4)', 'J_dup_name': '중복 이름', 'K_comp_subcat_mismatch': '조성↔subcat base원소 불일치', 'I2_fake_variant': '가짜 variant 미해결(SOFT≡HARD)', 'I2_reviewed': '가짜 variant 검토완료(라벨 아티팩트·값 정상)' };
let total = 0;
const order = ['A_yield>uts', 'B_fatigue>uts', 'F_negative', 'C_elongation', 'D_density', 'E_modulus', 'G_tmax>tmelt', 'H_curated_gap', 'K_comp_subcat_mismatch', 'J_dup_name', 'I_uts_yield_ratio', 'I2_fake_variant'];
const lines = ['# R226 검수 — 명백한 오류 리포트 (레지스트리 = 교정 반영 SSOT)\n'];
for (const k of order) {
  const arr = findings[k] || []; total += arr.length;
  lines.push(`\n## [${k}] ${labels[k]} — ${arr.length}건`);
  arr.slice(0, 40).forEach(x => lines.push('- ' + x));
  if (arr.length > 40) lines.push(`  …외 ${arr.length - 40}건`);
}
// 검토완료(오류 아님) — 별도 섹션, total 미집계
const rev = findings['I2_reviewed'] || [];
lines.push(`\n\n---\n## [I2_reviewed] ${labels['I2_reviewed']} — ${rev.length}건 (오류 아님)`);
rev.forEach(x => lines.push('- ' + x));
fs.writeFileSync('data/registry/audit-report.md', lines.join('\n') + '\n');
console.log('총 오류:', total, '건 · 검토완료(아티팩트):', rev.length, '건');
for (const k of order) console.log(`  ${k.padEnd(24)} ${(findings[k] || []).length}`);
console.log(`  ${'I2_reviewed(비오류)'.padEnd(24)} ${rev.length}`);
// R226f/축2b — 게이트화: 오류 존재 시 exit 1 (HT↔값 공정상태 교차충돌 I2 포함). tests/audit-registry-gate 가 CI 상설화.
if (total > 0) { console.error(`❌ audit:registry 오류 ${total}건 — data/registry/audit-report.md 확인`); process.exit(1); }
