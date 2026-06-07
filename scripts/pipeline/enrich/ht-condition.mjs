/*
 * R155b — htConditionMultiplier: HT condition 기반 fatigue/impact/KIC multiplier (R129).
 *
 * Returns { f, i, k, condTag }:
 *   - f: fatigue strength multiplier (peak-aged = 1.00, soft = ~0.40, full-hard = ~1.40)
 *   - i: impact strength multiplier (반비례 — peak = 1.00, soft = 1.40-3.50, full-hard = 0.40-0.85)
 *   - k: KIC multiplier (반비례 — peak = 1.00, soft = 1.20-2.20, full-hard = 0.65-0.95)
 *   - condTag: 시각화용 condition 식별 문자열
 *
 * Pure 함수. m = { name, heat_treatment, subcategory }.
 *
 * Alloy family 별 baseline + condition 차등:
 *   PH stainless / Maraging / Tool steel / Ni superalloy(PH + SS) / Ti-6Al-4V / β-Ti /
 *   Austenitic stainless / Martensitic stainless / Ferritic stainless / Spring steel /
 *   Mild steel / Medium-C steel / Bearing steel / Case hardening / BeCu / Cu-Cr-Zr /
 *   Brass / High-N stainless / Narloy-Z / 4140-class alloy steel / Al T-tempers / CoCrMo
 */

export function htConditionMultiplier(m) {
  if (!m) return { f: 1, i: 1, k: 1, condTag: null };
  const name = String(m.name || '').toLowerCase();
  const ht = String(m.heat_treatment || '').toLowerCase();
  const sub = String(m.subcategory || '').toLowerCase();
  const combined = name + ' ' + ht;

  /* R155b — Aluminum detection at TOP. Spring steel regex `\b5\d{3}\b` 와 alloy steel `\b5\d{3}\b`
     이 AA 5xxx Al alloy 와 충돌 → 사전에 Al alloy 임을 식별하면 직접 Al branch 로 jump.
     `_isAl` flag 를 두고 후속 branch 들이 이를 확인해 skip 처리. */
  const _isAl = (/^aa\s?\d{4}|al-?\d{4}|aluminum|al\s*si|alsi|alumi|^al-?si/.test(name)
    || sub.toLowerCase().includes('aluminum'))
    && !(/\b4[01]\d{2}\b|\b8[0-9]\d{2}\b|\b9\d{3}\b/.test(name));

  // PH stainless — baseline = H900 (peak-aged)
  if (/17-?4\s*ph|15-?5\s*ph|13-?8\s*ph|17-?7\s*ph|s17400|s15500|s13800|s17700|custom\s*4\d{2}|ph13|ph15|ph17/.test(name) || sub.includes('ph')) {
    if (/h900\b/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'H900 peak-aged' };
    if (/h925\b/.test(combined)) return { f: 0.97, i: 1.10, k: 1.06, condTag: 'H925' };
    if (/h1025\b/.test(combined)) return { f: 0.90, i: 1.40, k: 1.20, condTag: 'H1025' };
    if (/h1075\b/.test(combined)) return { f: 0.85, i: 2.20, k: 1.45, condTag: 'H1075' };
    if (/h1100\b/.test(combined)) return { f: 0.82, i: 2.50, k: 1.55, condTag: 'H1100' };
    if (/h1150[a-z]*|h1175\b|h1200\b/.test(combined)) return { f: 0.78, i: 3.00, k: 1.60, condTag: 'H1150 over-aged' };
    if (/as-?built|as-?fab/.test(combined)) return { f: 0.92, i: 1.30, k: 1.10, condTag: 'as-built martensitic' };
    if (/annealed|solution(?!\s*\+\s*aged)/.test(combined)) return { f: 0.55, i: 3.50, k: 1.50, condTag: 'solution annealed (soft)' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'PH peak-aged (assumed)' };
  }

  // Maraging — baseline = aged 482°C peak
  if (/maraging|18ni|c2[5-8]\d|c3\d{2}|m250|m300|m350|ms1|vasco/.test(name) || sub.includes('maraging')) {
    if (/annealed(?!.*aged)/.test(combined)) return { f: 0.40, i: 3.50, k: 1.50, condTag: 'annealed (austenitic)' };
    if (/solution(?!.*aged)|solution treated$/.test(combined)) return { f: 0.45, i: 3.00, k: 1.45, condTag: 'solution treated' };
    if (/aged|maraged|sta\b|stat\b|hardened|peak/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'aged (peak strength)' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'aged (assumed)' };
  }

  // Tool steel — baseline = Q+T peak hardness HRC 50-55
  if (/tool steel|\b(?:h1[013]|d[23]|m[24]|s7|a2|p20|cpm|skd\d{1,2}|o1|w1|w2)\b/.test(name) || sub.includes('tool')) {
    if (/annealed(?!.*temper)/.test(combined)) return { f: 0.30, i: 4.00, k: 2.20, condTag: 'spheroidized annealed' };
    if (/q\s*\+\s*t.*?(?:610|softer|620|650)|over[\s-]?tempered/.test(combined)) return { f: 0.78, i: 1.50, k: 1.30, condTag: 'Q+T high-temper (softer)' };
    if (/q\s*\+\s*t|tempered|hrc|maraged/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T peak HRC 50-55' };
    if (/as-?built|as-?fab/.test(combined)) return { f: 0.88, i: 1.20, k: 1.10, condTag: 'as-built (no temper)' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T peak (assumed)' };
  }

  // Ni superalloy precipitation hardenable — baseline = STA (solution + aged peak)
  if (/inconel\s*7\d{2}|inconel\s*x[\s-]?7\d{2}|inconel\s*939|inconel\s*100|inconel\s*706|waspaloy|nimonic\s*(?:80|90|105|115|263)|udimet|rene\s*\d|cmsx|pwa|mar[\s-]?m|haynes\s*282|haynes\s*214/.test(name)) {
    if (/annealed(?!.*aged)/.test(combined)) return { f: 0.60, i: 1.50, k: 1.40, condTag: 'annealed' };
    if (/solution\s*(?:treated|annealed)(?!.*aged)|^solution$/.test(combined)) return { f: 0.65, i: 1.40, k: 1.30, condTag: 'solution treated' };
    if (/single\s*age|sta\b/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'STA single age' };
    if (/double\s*age|dsa\b/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'DSA double age' };
    if (/aged|peak/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'aged peak' };
    if (/as-?built|as-?fab/.test(combined)) return { f: 0.80, i: 1.30, k: 1.20, condTag: 'as-built (no age)' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'STA (assumed)' };
  }

  // Ni superalloy solid-solution (Inconel 600/601/617/625/690, Hastelloy, Incoloy) — no real HT effect on fatigue/KIC
  if (/inconel\s*(?:600|601|617|625|690)|hastelloy\s*[a-z]|incoloy|haynes\s*230|haynes\s*188|monel/.test(name)) {
    if (/cold\s*work|cw\b|hard/.test(combined)) return { f: 1.20, i: 0.70, k: 0.85, condTag: 'cold worked' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'solid-solution annealed' };
  }

  // Ti-6Al-4V (Gr5) — baseline = mill annealed
  if (/ti[\s-]?6al[\s-]?4v|tigr5|grade\s*5\b|r56400|r56407|grade\s*23/.test(name)) {
    if (/as-?built|as-?fab/.test(combined)) return { f: 0.85, i: 0.85, k: 0.90, condTag: "as-built (acicular α+β')" };
    if (/hip\b/.test(combined)) return { f: 1.05, i: 1.10, k: 1.05, condTag: 'HIP densified' };
    if (/sta|solution\s*\+?\s*aged?/.test(combined)) return { f: 1.10, i: 0.90, k: 0.95, condTag: 'STA aged' };
    /* R155b — Greek β 도 처리 (이전엔 영문 "beta-annealed" 만 매칭). */
    if (/β[\s-]?annealed|beta[\s-]?annealed/.test(combined)) return { f: 0.85, i: 1.20, k: 1.15, condTag: 'β-annealed (coarse)' };
    if (/mill\s*annealed|annealed/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'mill annealed' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'mill annealed (assumed)' };
  }

  // β-Ti / near-α Ti — baseline = STA
  if (/ti[\s-]?6242|ti[\s-]?5553|ti[\s-]?10[\sv]|ti[\s-]?153|ti[\s-]?525|ti[\s-]?185|ti[\s-]?17/.test(name)) {
    if (/annealed(?!.*aged)/.test(combined)) return { f: 0.85, i: 1.20, k: 1.20, condTag: 'annealed (soft)' };
    if (/sta|solution.*aged|aged/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'STA' };
    if (/as-?built/.test(combined)) return { f: 0.85, i: 0.90, k: 0.95, condTag: 'as-built' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'STA (assumed)' };
  }

  /* Austenitic stainless (304/316/321/347) — no HT effect except CW.
     R155b — `\b3[1-4]\d\b` 가 "316L" 매칭 실패 (L 뒤에 word boundary 없음). l? 추가. */
  if (/\b30[1-9]l?\b|\b3[1-4]\dl?\b|\b34[7-9]l?\b|austenit/.test(name) || sub.includes('austenitic')) {
    if (/cold\s*work|cw\b|strain[\s-]?hardened|full[\s-]?hard/.test(combined)) return { f: 1.40, i: 0.50, k: 0.65, condTag: 'cold worked' };
    if (/as-?built/.test(combined)) return { f: 1.05, i: 0.95, k: 0.95, condTag: 'as-built (fine columnar)' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'solution annealed' };
  }

  // Stainless martensitic (410, 420, 440) — 3-digit. Q+T baseline.
  if (/\b4[1-4]0\b|\bsus41[0-9]\b|\bsus42[0-9]\b|\bsus44[0-9]\b|\bx12cr13|\bx40cr|martensit/.test(name) || sub.includes('martensitic')) {
    if (/annealed(?!.*temper)|spheroidized/.test(combined)) return { f: 0.45, i: 2.80, k: 1.60, condTag: 'fully annealed (soft)' };
    if (/q\s*\+\s*t.*?(?:600|650|high[\s-]?temper)/.test(combined)) return { f: 0.85, i: 1.40, k: 1.25, condTag: 'Q+T high-temper' };
    if (/q\s*\+\s*t.*?(?:200|150|peak|max[\s-]?hard|full[\s-]?hard)/.test(combined)) return { f: 1.05, i: 0.70, k: 0.85, condTag: 'Q+T peak hardness' };
    if (/q\s*\+\s*t|tempered/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T mid-range' };
    if (/strain[\s-]?hardened|cold\s*work/.test(combined)) return { f: 1.15, i: 0.65, k: 0.80, condTag: 'cold worked' };
    if (/as-?cast|forged/.test(combined)) return { f: 0.65, i: 1.80, k: 1.30, condTag: 'as-cast/forged (no temper)' };
    if (/as-?supplied/.test(combined)) return { f: 0.95, i: 1.05, k: 1.00, condTag: 'as-supplied (Q+T assumed)' };
    if (/aged|solution[\s-]?treated/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'aged/STA' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T (assumed)' };
  }

  // Stainless ferritic (430, 446) — HT-insensitive (no quench-hardening)
  if (/\b43[06]\b|\b44[68]\b|\bx6cr17|ferritic\s*stainless/.test(name) || sub.includes('ferritic')) {
    if (/cold\s*work|strain[\s-]?hardened/.test(combined)) return { f: 1.30, i: 0.60, k: 0.80, condTag: 'cold worked' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'annealed (HT-insensitive)' };
  }

  // Spring steel — R155b: skip if Al alloy (AA 5xxx 매칭 충돌)
  if (!_isAl && (/\bsup\d{1,2}\b|\b5\d{3}\b|\b9260\b|51crv4|spring/.test(name) || sub.includes('spring'))) {
    if (/annealed(?!.*temper)/.test(combined)) return { f: 0.45, i: 3.00, k: 1.60, condTag: 'annealed (forming)' };
    if (/q\s*\+\s*t.*?(?:380|400|full[\s-]?spring)/.test(combined)) return { f: 1.05, i: 0.85, k: 0.90, condTag: 'Q+T 380°C full spring' };
    if (/q\s*\+\s*t.*?(?:430|450|spring[\s-]?temper)/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T spring temper' };
    if (/q\s*\+\s*t|tempered/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T (assumed)' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T (assumed)' };
  }

  // Mild steel
  if (/\b10[12]\d\b|\b1018\b|\ba36\b|astm\s*a36|structural\s*steel|mild\s*steel/.test(name) || sub === 'carbon steel' || sub.includes('structural')) {
    if (/cold\s*work|strain[\s-]?hardened|cold[\s-]?drawn/.test(combined)) return { f: 1.25, i: 0.60, k: 0.80, condTag: 'cold worked' };
    if (/normalized/.test(combined)) return { f: 1.05, i: 1.15, k: 1.10, condTag: 'normalized' };
    if (/annealed|as-?cast/.test(combined)) return { f: 0.95, i: 1.20, k: 1.10, condTag: 'annealed/as-cast' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'as-rolled (mild)' };
  }

  // Medium-C steel
  if (/\b10[34]\d\b|\b10[56]\d\b|\b1095\b/.test(name)) {
    if (/annealed(?!.*temper)/.test(combined)) return { f: 0.50, i: 2.50, k: 1.80, condTag: 'fully annealed' };
    if (/normalized/.test(combined)) return { f: 0.75, i: 1.60, k: 1.40, condTag: 'normalized' };
    if (/q\s*\+\s*t/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T (assumed)' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T (assumed)' };
  }

  // Bearing steel
  if (/\b52100\b|\b100cr6\b|\bsuj2\b|bearing\s*steel/.test(name) || sub.includes('bearing')) {
    if (/annealed/.test(combined)) return { f: 0.40, i: 2.50, k: 1.50, condTag: 'annealed (spheroidized)' };
    if (/q\s*\+\s*t/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T peak' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T (assumed)' };
  }

  // Case hardening steel
  if (/\b8620\b|\b9310\b|\b4620\b|\b4820\b|case[\s-]?hardening|carburiz/.test(name) || sub.includes('case hardening')) {
    if (/carburized/.test(combined)) return { f: 1.10, i: 0.85, k: 0.90, condTag: 'carburized case' };
    if (/annealed/.test(combined)) return { f: 0.55, i: 2.20, k: 1.60, condTag: 'annealed' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T (assumed)' };
  }

  // BeCu / Cu-Ni-Si precipitation hardened
  if (/\bc17[0-9]{3}\b|\bc18000\b|\bcube|beryllium\s*copper|moldmax/.test(name)) {
    if (/tb00|annealed|solution(?!.*aged)/.test(combined)) return { f: 0.35, i: 3.50, k: 1.80, condTag: 'TB00 solution annealed' };
    if (/tf00|peak[\s-]?aged|aged(?!.*cold)/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'TF00 peak aged' };
    if (/th04|cold[\s-]?rolled.*aged|cw\s*\+\s*age/.test(combined)) return { f: 1.10, i: 0.40, k: 0.75, condTag: 'TH04 CW+aged (high strength)' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'TF00 (assumed)' };
  }

  // Cu-Cr-Zr
  if (/\bc181[0-9]{2}\b|\bc18200\b|cucr|chromium\s*copper|elbrodur/.test(name)) {
    if (/wp\b|solution[\s-]?aged|tf00/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'wp solution + aged' };
    if (/whp\b|th04|cw\s*\+\s*age/.test(combined)) return { f: 1.30, i: 0.50, k: 0.80, condTag: 'whp CW + aged' };
    if (/annealed/.test(combined)) return { f: 0.45, i: 2.50, k: 1.50, condTag: 'fully annealed' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'precipitation hardened (assumed)' };
  }

  // Brass
  if (/\bc2[6-8]\d{3}\b|brass|\bcuzn|c46400|naval\s*brass/.test(name)) {
    if (/\bh0[24]\b|quarter[\s-]?hard/.test(combined)) return { f: 1.15, i: 0.85, k: 0.90, condTag: 'H02 quarter-hard' };
    if (/\bh0[68]\b|half[\s-]?hard/.test(combined)) return { f: 1.25, i: 0.70, k: 0.85, condTag: 'H04 half-hard' };
    if (/\bh10\b|three[\s-]?quarter|full[\s-]?hard/.test(combined)) return { f: 1.40, i: 0.55, k: 0.75, condTag: 'H08/H10 hard' };
    if (/annealed|\b0\s*temper/.test(combined)) return { f: 0.65, i: 1.40, k: 1.20, condTag: 'annealed (soft)' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'annealed (assumed)' };
  }

  // High-N austenitic stainless
  if (/sae\s*21[\s-]?4n|21-?4n|high[\s-]?nitrogen.*?stainless|21cr.*?4ni.*?n/.test(name)) {
    if (/solution\s*\+?\s*aged|aged|peak/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Solution + Aged peak' };
    if (/solution\s*treated|solution(?!\s*\+)|annealed/.test(combined)) return { f: 0.65, i: 1.40, k: 1.20, condTag: 'Solution Treated (no aging)' };
    if (/tested at 700/.test(combined)) return { f: 0.65, i: 0.90, k: 0.95, condTag: 'hot strength at 700°C' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Solution + Aged (assumed)' };
  }

  // Narloy-Z
  if (/narloy/.test(name)) {
    if (/solution\s*aged|aged/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Solution + Aged peak' };
    if (/solution\s*annealed|solution\s*treated/.test(combined)) return { f: 0.65, i: 1.50, k: 1.30, condTag: 'Solution Annealed' };
    if (/creep|tested.*500/.test(combined)) return { f: 0.55, i: 0.85, k: 0.90, condTag: 'creep regime' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Solution + Aged (assumed)' };
  }

  // Carbon / alloy steel Q+T — R155b: _isAl 가드로 AA 5xxx 와 충돌 회피
  if (!_isAl && (/\b4[01]\d{2}\b|\b8[0-9]\d{2}\b|\b9\d{3}\b|\b5\d{3}\b|sncm|scm\s*\d|alloy steel|42crmo|31crmov|34crnimo/.test(name) || sub.includes('alloy steel'))) {
    if (/as-?built|as-?fab/.test(combined)) return { f: 0.85, i: 0.90, k: 0.92, condTag: 'as-built (no Q+T)' };
    if (/annealed(?!.*temper)/.test(combined)) return { f: 0.50, i: 2.50, k: 1.80, condTag: 'fully annealed' };
    if (/normalized/.test(combined)) return { f: 0.70, i: 1.80, k: 1.50, condTag: 'normalized' };
    if (/q\s*\+\s*t.*?(?:200|full\s*hard)/.test(combined)) return { f: 1.15, i: 0.40, k: 0.65, condTag: 'Q+T 200°C (full hard)' };
    if (/q\s*\+\s*t.*?(?:550|600|650)/.test(combined)) return { f: 0.92, i: 1.40, k: 1.25, condTag: 'Q+T high-temper' };
    if (/q\s*\+\s*t.*?(?:450|500)/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T 450°C (peak)' };
    if (/q\s*\+\s*t.*?heavy|heavy\s*section/.test(combined)) return { f: 0.95, i: 0.85, k: 0.95, condTag: 'Q+T heavy section (slower cooling)' };
    if (/q\s*\+\s*t|tempered|quenched/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T peak (assumed)' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'Q+T peak (assumed)' };
  }

  // Aluminum T-tempers
  if (/^aa\s?\d{4}|al-?\d{4}|aluminum|al\s*si|alsi|alumi|^al-?si/.test(name) || sub.toLowerCase().includes('aluminum')) {
    // 5xxx (non-HT)
    if (/aa\s?5\d{3}|al-?mg|^5\d{3}/.test(name)) {
      if (/\bo\b|^o$|annealed/.test(combined)) return { f: 0.50, i: 1.80, k: 1.50, condTag: 'O (annealed soft)' };
      if (/\bh1[12]\b/.test(combined)) return { f: 0.85, i: 1.20, k: 1.15, condTag: 'H11/H12 1/8-1/4 hard' };
      if (/\bh1[34]\b|\bh32\b/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'H14/H32 1/2 hard (peak baseline)' };
      if (/\bh1[6-9]\b|\bh34\b/.test(combined)) return { f: 1.15, i: 0.75, k: 0.85, condTag: 'H16-H19/H34 3/4-full hard' };
      if (/\bh111\b|\bh112\b/.test(combined)) return { f: 0.75, i: 1.40, k: 1.20, condTag: 'H111/H112 as-fabricated' };
      if (/\bh321\b/.test(combined)) return { f: 1.10, i: 0.95, k: 1.05, condTag: 'H321 strain + stabilized' };
      if (/as-?built/.test(combined)) return { f: 0.95, i: 1.00, k: 1.00, condTag: 'as-built' };
      return { f: 1.00, i: 1.00, k: 1.00, condTag: '5xxx mid-temper (assumed)' };
    }
    // 6xxx/7xxx/2xxx (HT)
    /* R155b — 이전 `\bo\s*temper|\bo\b\s*\(annealed\)|^o\s|^annealed` 는 "AA 6061 — O" 같은 단순 O temper 미매칭.
       단순 \bo\b 단독 (앞뒤 word boundary) 도 O temper 로 인정. */
    if (/\bo\s*temper|\bo\b\s*\(annealed\)|—\s*o\s*$|—\s*o\s|annealed|^o\b/.test(combined)) return { f: 0.40, i: 3.00, k: 2.00, condTag: 'O (annealed soft, fallback derived from T6)' };
    if (/\bt1\b/.test(combined)) return { f: 0.50, i: 2.20, k: 1.70, condTag: 'T1 cooled from extrusion + naturally aged' };
    if (/\bt2\b/.test(combined)) return { f: 0.55, i: 2.00, k: 1.60, condTag: 'T2 cooled + CW + naturally aged' };
    if (/\bt3\b/.test(combined)) return { f: 0.85, i: 1.30, k: 1.30, condTag: 'T3 solution + CW + naturally aged' };
    if (/\bt4\b/.test(combined)) return { f: 0.80, i: 1.40, k: 1.35, condTag: 'T4 solution + naturally aged' };
    if (/\bt5\b/.test(combined)) return { f: 0.90, i: 1.20, k: 1.20, condTag: 'T5 cooled + artificial aged' };
    if (/\bt6\b|peak[\s-]?aged/.test(combined)) return { f: 1.00, i: 1.00, k: 1.00, condTag: 'T6 peak-aged (baseline)' };
    /* R155b — T7351/T7451 은 T73 또는 T74 뒤에 2자리 더 (5,1) 가 붙음. 이전 `\d?` 는 1자리만 처리. */
    if (/\bt73\d{0,2}\b|\bt74\d{0,2}\b/.test(combined)) return { f: 0.78, i: 1.50, k: 1.40, condTag: 'T7351/T7451 over-aged SCC-resistant' };
    if (/\bt7\b|over[\s-]?aged/.test(combined)) return { f: 0.85, i: 1.40, k: 1.30, condTag: 'T7 over-aged' };
    if (/\bt81\d?\b/.test(combined)) return { f: 1.08, i: 0.90, k: 0.95, condTag: 'T81 CW + aged peak' };
    if (/\bt8\b/.test(combined)) return { f: 1.08, i: 0.90, k: 0.95, condTag: 'T8 CW + aged' };
    if (/\bt9\b/.test(combined)) return { f: 1.10, i: 0.85, k: 0.90, condTag: 'T9 CW after aging' };
    if (/\bt10\b/.test(combined)) return { f: 0.60, i: 1.90, k: 1.55, condTag: 'T10 cooled + CW + aged' };
    if (/strain[\s-]?hardened|cold[\s-]?work/.test(combined)) return { f: 0.95, i: 1.10, k: 1.05, condTag: 'strain-hardened (fallback)' };
    if (/aged\s*\/\s*solution[\s-]?treated/.test(combined)) return { f: 0.95, i: 1.10, k: 1.10, condTag: 'mixed aged/solution-treated CSV-generic (fallback midpoint)' };
    if (/as-?cast|forged/.test(combined)) return { f: 0.65, i: 1.70, k: 1.40, condTag: 'as-cast / forged (no T-temper)' };
    if (/as-?supplied/.test(combined)) return { f: 0.92, i: 1.15, k: 1.10, condTag: 'as-supplied (mill T-temper assumed)' };
    if (/as-?built/.test(combined)) return { f: 1.10, i: 0.95, k: 1.00, condTag: 'as-built (fine grain)' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'T6 (assumed default)' };
  }

  // CoCr / CoCrMo
  if (/cocr|f75|f1537/.test(name) || sub.includes('cobalt')) {
    if (/as-?built/.test(combined)) return { f: 1.05, i: 0.85, k: 0.90, condTag: 'as-built (fine grain)' };
    if (/hip\b/.test(combined)) return { f: 1.10, i: 1.05, k: 1.05, condTag: 'HIP' };
    if (/cold\s*work/.test(combined)) return { f: 1.30, i: 0.55, k: 0.70, condTag: 'cold worked' };
    return { f: 1.00, i: 1.00, k: 1.00, condTag: 'solution annealed' };
  }

  return { f: 1.00, i: 1.00, k: 1.00, condTag: null };
}
