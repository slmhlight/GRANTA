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
/* 공정상태 분류: 강화(HARD) · 연화/as-fab(SOFT) · 알 수 없음(UNKNOWN).
   A6(2026-09-11)에서 세 가지를 보강했다 — 셋 다 "라벨을 잘못 읽어 없는 문제를 만들거나
   있는 문제를 못 보던" 경우다:

   ① 강화 템퍼를 놓치고 있었다. Al/Mg 의 T3~T8(T6·T651·T73·T7351…)과 두 자리 H 템퍼
      (H32·H34·H14·H19)가 전부 SOFT 로 분류됐다 — 기존 패턴이 `h\d{3,}`(3자리 이상)만 봤다.
      레일 두부경화(HHT)·냉간인발도 마찬가지. 25종 라벨이 이 때문에 뒤집혀 있었다.
   ② **부정문을 긍정으로 읽었다.** "As-Forged (controlled cooled, **no Q+T**)" 가 'Q+T' 에
      걸려 HARD 가 됐다 — 텍스트가 명시적으로 아니라고 말하는데도.
   ③ **모르는 것을 SOFT 로 세고 있었다.** "Heat-Treated"·"As-supplied" 는 어느 상태인지
      말해 주지 않는다. 이걸 SOFT 로 취급하면 시효값과 비교돼 헛것이 잡힌다(실제로 A6
      후보 8건 중 5건이 이 때문이었다). 모르면 모른다고 두고 비교에서 뺀다. */
const NEG_RE = /\b(?:no|non|without|free\s+of)[\s-]*(?:q\s*\+?\s*t\b|quench\w*|temper\w*|heat[\s-]?treat\w*|ag(?:e|ed|ing)\b|harden\w*)/g;
const HARD_RE = /\baged|solution.?age|\bsta\b|q\s*\+?\s*t|quench|temper|strain.?hard|cold.?work|peak|precipit|hardened|carburiz|\bcase\b|h\d{3,}|h9\d\d/;
const HARD_ADD = /\bt[3-8]\d{0,3}\b|\bh[123]\d\b|head.?harden|\bhht\b|cold.?draw|hard.?draw|work.?harden/;
const UNKNOWN_RE = /^(heat[-\s]?treated|as[-\s]?supplied|as[-\s]?received|as[-\s]?processed|standard|mill)$/;
const stateOf = (h) => {
  const raw = (h || '').toLowerCase().trim();
  if (!raw || UNKNOWN_RE.test(raw)) return 'UNKNOWN';
  const t = raw.replace(NEG_RE, ' ');                      // 부정된 언급은 지우고 본다
  if (HARD_RE.test(t) || (/solution/.test(t) && /\bag(?:e|ed|ing)\b/.test(t)) || HARD_ADD.test(t)) return 'HARD';
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
  /* 'AISI 1020' 은 2026-09-11 제거 — H6 D9 에서 1020 소둔값을 ASM 표로 교정하며 SOFT≡HARD
     충돌 자체가 사라져 이 예외가 죽은 키가 됐다. 예외는 필요가 없어지면 지운다(A13 교훈). */
  'Inconel 100': '주조 Ni superalloy — 주조+시효 단일조건; annealed/as-forged 라벨 합성(값 정상)',
  /* 'CuNi2SiCr' 은 2026-09-11 제거 — 충돌의 한 축이 'Heat-Treated'(상태 불명)였고,
     A6 에서 그것을 UNKNOWN 으로 빼면서 충돌 자체가 사라졌다. 필요 없어진 예외는 지운다. */
};

/* A6 — 역전(HARD 가 SOFT 보다 약하다) 검사의 검토완료 목록. I2 와 성격이 달라 따로 둔다. */
const REVIEWED_A6 = {
  'AlSi7Mg|AM': 'LPBF AlSi 계 — as-built(255/El 8) 의 미세 Si 셀 조직이 T6(252/El 10)보다 항복이 약간 높다. '
    + 'T6 는 Si 를 조대화해 연성을 얻고 항복을 조금 내주는 것이 알려진 거동(값 정상)',
  'Railway Wheel Class C (AAR M-107)|WROUGHT': 'AAR M-107/M-208 — "Premium Class C+"(690/1100)는 열처리 상태가 아니라 '
    + '별도 고사양 등급이다. "Rim-Toughened"(600/1050)와는 같은 base 이름을 쓰는 다른 제품(값 정상)',
};
/* 어떤 REVIEWED 예외가 실제로 발화했는지 — 발화하지 않는 예외는 '죽은 키'다.
   값을 고쳐 충돌이 사라지면 예외도 같이 지워야 하는데, 안 지우면 다음 사람이 "여긴 원래
   예외 처리된 곳" 으로 오해한다. A13(위키 엔티티)에서 낡은 하드코딩 제외로 재료 2종이
   통째로 빠졌던 것과 같은 부류라, 여기서는 수를 세어 게이트가 보게 한다. */
const reviewedUsed = new Set();
for (const [b, arr] of Object.entries(byBase)) {
  if (arr.length < 2) continue;
  const byVal = {}; for (const m of arr) { const k = `${rng(m, 'yield_strength')}|${rng(m, 'uts')}`; (byVal[k] = byVal[k] || []).push(m); }
  for (const grp of Object.values(byVal)) {
    if (grp.length < 2 || rng(grp[0], 'yield_strength') == null) continue;
    const known = grp.filter(m => stateOf(m.heat_treatment) !== 'UNKNOWN');
    const states = new Set(known.map(m => stateOf(m.heat_treatment)));
    if (states.size < 2) continue; // 같은 상태끼리 같은 값 = 정상 (상태 모르는 라벨은 비교에서 제외)
    const byState = { SOFT: [], HARD: [] }; for (const m of known) byState[stateOf(m.heat_treatment)].push((m.heat_treatment || '?').slice(0, 20));
    const desc = `σy${rng(grp[0], 'yield_strength')}/UTS${rng(grp[0], 'uts')} — SOFT[${byState.SOFT.join(',')}] ≡ HARD[${byState.HARD.join(',')}]`;
    if (REVIEWED[b]) { reviewedUsed.add(b); add('I2_reviewed', { name: b }, `${desc} → ${REVIEWED[b]}`); }
    else add('I2_fake_variant', { name: b }, `${desc} (강화상태가 연화값 — 미해결)`);
  }
}

/* L (A6) — 같은 합금 안에서 **강화 조건이 연화 조건보다 약한** 경우.
 *
 * I2 는 값이 '똑같은' 경우만 잡는다. 그런데 값이 다르면서 방향이 뒤집힌 것도 라벨↔값
 * 불일치이고, 오히려 눈에 덜 띈다. 경화·시효·냉간가공은 항복을 올리는 처리이므로,
 * 같은 재료·같은 제조형태 안에서 HARD 최댓값이 SOFT 최댓값보다 낮으면 둘 중 하나다:
 * 값이 틀렸거나, 둘이 사실은 비교 대상이 아니거나.
 *
 * 비교 범위를 좁힌 것이 이 검사의 핵심이다 — 넓게 잡으면 오탐이 쏟아진다:
 *   · 상태를 모르는 라벨(UNKNOWN)은 뺀다 — 후보 8건 중 5건이 'Heat-Treated' 때문이었다
 *   · AM 과 단조/주조를 섞지 않는다 — LPBF as-built 는 조직이 미세해 단조 시효재보다
 *     항복이 높을 수 있다(Hastelloy X 610 vs 367). 제조형태가 다르면 애초에 다른 물건이다
 * 이렇게 좁히면 비교쌍 140 중 역전 2건(1.4%) — 둘 다 검토 결과 정상이라 REVIEWED_A6 로 둔다.
 */
const AM_RE = /lpbf|dmls|slm|ebm|binder|waam|\bded\b|directed energy/i;
const isAmEntry = (m) => AM_RE.test(m.process || '') || (m.processes || []).some(p => AM_RE.test(p)) || /as-?built/i.test(m.heat_treatment || '');
let a6Pairs = 0;
const a6ReviewedUsed = new Set();
for (const [b, arr] of Object.entries(byBase)) {
  for (const form of ['AM', 'WROUGHT']) {
    const sub = arr.filter(m => (isAmEntry(m) ? 'AM' : 'WROUGHT') === form);
    const soft = sub.filter(m => stateOf(m.heat_treatment) === 'SOFT' && rng(m, 'yield_strength') != null);
    const hard = sub.filter(m => stateOf(m.heat_treatment) === 'HARD' && rng(m, 'yield_strength') != null);
    if (!soft.length || !hard.length) continue;
    a6Pairs++;
    const pick = (list) => list.reduce((a, c) => (rng(c, 'yield_strength') > rng(a, 'yield_strength') ? c : a));
    const sTop = pick(soft), hTop = pick(hard);
    const sMax = rng(sTop, 'yield_strength'), hMax = rng(hTop, 'yield_strength');
    if (hMax >= sMax) continue;
    const key = `${b}|${form}`;
    const desc = `[${form}] SOFT "${(sTop.heat_treatment || '?').slice(0, 26)}" σy${sMax} > HARD "${(hTop.heat_treatment || '?').slice(0, 26)}" σy${hMax} (비 ${(hMax / sMax).toFixed(2)})`;
    if (REVIEWED_A6[key]) { a6ReviewedUsed.add(key); add('L_reviewed', { name: b }, `${desc} → ${REVIEWED_A6[key]}`); }
    else add('L_hard_weaker', { name: b }, `${desc} (강화 조건이 더 약하다 — 미해결)`);
  }
}

// 출력
const labels = { 'A_yield>uts': 'σy > UTS (물리 불가능)', 'B_fatigue>uts': 'fatigue > UTS (불가능)', 'C_elongation': 'elongation 범위 밖', 'D_density': 'density 범위 밖', 'E_modulus': 'modulus 범위 밖', 'F_negative': '음수 물성', 'G_tmax>tmelt': 'Tmax > Tmelt', 'H_curated_gap': 'curated/vendor σy·UTS 공백', 'I_uts_yield_ratio': 'UTS/σy 비 이상(>4)', 'J_dup_name': '중복 이름', 'K_comp_subcat_mismatch': '조성↔subcat base원소 불일치', 'I2_fake_variant': '가짜 variant 미해결(SOFT≡HARD)', 'I2_reviewed': '가짜 variant 검토완료(라벨 아티팩트·값 정상)',
  'L_hard_weaker': '강화 조건이 연화 조건보다 약함(A6)', 'L_reviewed': '역전 검토완료(비교대상 아님·값 정상)' };
let total = 0;
const order = ['A_yield>uts', 'B_fatigue>uts', 'F_negative', 'C_elongation', 'D_density', 'E_modulus', 'G_tmax>tmelt', 'H_curated_gap', 'K_comp_subcat_mismatch', 'J_dup_name', 'I_uts_yield_ratio', 'I2_fake_variant', 'L_hard_weaker'];
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
const revL = findings['L_reviewed'] || [];
lines.push(`\n## [L_reviewed] ${labels['L_reviewed']} — ${revL.length}건 (오류 아님)`);
revL.forEach(x => lines.push('- ' + x));
fs.writeFileSync('data/registry/audit-report.md', lines.join('\n') + '\n');
console.log('총 오류:', total, '건 · 검토완료(아티팩트):', rev.length, '건');
for (const k of order) console.log(`  ${k.padEnd(24)} ${(findings[k] || []).length}`);
console.log(`  ${'I2_reviewed(비오류)'.padEnd(24)} ${rev.length}`);
console.log(`  ${'L_reviewed(비오류)'.padEnd(24)} ${revL.length}`);
const a6Inv = (findings['L_hard_weaker'] || []).length + revL.length;
console.log(`A6 역전 검사: 비교쌍 ${a6Pairs} · 역전 ${a6Inv} (${a6Pairs ? (a6Inv / a6Pairs * 100).toFixed(1) : '0'}%)`);
const deadReviewed = [
  ...Object.keys(REVIEWED).filter((k) => !reviewedUsed.has(k)),
  ...Object.keys(REVIEWED_A6).filter((k) => !a6ReviewedUsed.has(k)).map((k) => `A6:${k}`),
];
console.log(`죽은 REVIEWED 키: ${deadReviewed.length} 건${deadReviewed.length ? ' — ' + deadReviewed.join(', ') : ''}`);
// R226f/축2b — 게이트화: 오류 존재 시 exit 1 (HT↔값 공정상태 교차충돌 I2 포함). tests/audit-registry-gate 가 CI 상설화.
if (total > 0) { console.error(`❌ audit:registry 오류 ${total}건 — data/registry/audit-report.md 확인`); process.exit(1); }
