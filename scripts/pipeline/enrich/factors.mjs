/*
 * R155 — 비용 / 가격 factor 의 pure 함수 모듈.
 *
 * build-materials.mjs 의 본문에서 extract → 단위 테스트 가능.
 * 모든 함수는 stateless (입력만으로 출력 결정). top-level 부작용 없음.
 *
 * Functions:
 *   - htCostFactor(m): heat treatment 비용 factor (1.0 ~ 1.75)
 *   - priceConditionFactor(m): condition 별 가격 multiplier (1.0 ~ 1.60)
 *   - priceFormFactor(m): process form 별 가격 multiplier (1.0 ~ 3.0)
 *
 * 모두 R152a 같은 silent bug 자동 감지 가능 위해 추출.
 */

/* F4 열처리/후공정 비용 가중치 — heat_treatment 있으면 + HIP/coating + 합금 분류.
   R152a — name 도 함께 검사 (기존 ht-only check 가 "42CrMo4 — Wrought, Quenched-Tempered" 같이
   heat_treatment 가 비어있고 name 에 condition 만 있는 경우를 놓침). */
export function htCostFactor(m) {
  const ht = String(m.heat_treatment || '').toLowerCase();
  const n = String(m.name || '').toLowerCase();
  const all = ht + ' ' + n;
  /* R155 — early-exit gate 가 "Q+T" · "HIP" · "Hot Isostatic" · "Carburized" · "Nitrided" 등을 놓침
     (R152a 류 silent bug). 모든 후속 가중 패턴을 gate 에도 포함. */
  if (!ht && !/heat.?treated|aged|tempered|hipped|hip\b|hot.?isostatic|q\+t|quenched|solution|annealed|normalized|sta\b|t6\b|h\d{3,4}|carbur|nitrid|cementat|coating|coated|dlc\b|tbc\b|mcraly|aluminide|tialn|cvd\b|pvd\b/i.test(n)) return 1.0;
  let f = 1.05; // anneal/normalize 기본 (가벼운 단일 사이클)
  // As-supplied / mill / as-rolled — 가공 단계 없음
  if (/as.?supplied|as.?rolled|as.?cast|mill.?finish|as.?received|as.?built/.test(all)) return 1.0;
  // 단순 stress relief / anneal — 단일 사이클
  if (/^o\b|^annealed|annealed\b|stress.?relief|softened|normalized/.test(all)) f = Math.max(f, 1.10);
  // Cold-worked / strain-hardened — extra rolling pass
  if (/\b1\/4h\b|\b1\/2h\b|\bfull.?hard\b|cold.?work|strain.?harden|cold.?drawn|cold.?rolled|temper.?rolled/.test(all)) f = Math.max(f, 1.10);
  if (/\beh\b|extra.?hard|spring.?temper/.test(all)) f = Math.max(f, 1.15);
  // Q+T / Quenched-Tempered / Hardened-Tempered — 본격 다단 열처리 (austenitize + quench + temper)
  if (/q\+t|quench.*temper|quenched.?tempered|tempered\b|martensitic.?temper|hardened.*tempered|quenched/.test(all)) f = Math.max(f, 1.30);
  // Solution + Aged / T6 / H9xx — PH stainless / Al / Maraging
  if (/solution|aged|aging|시효|sta\b|h900|h925|h1025|h1075|h1100|h1150|t6\b|t651|t73|t76|t8\b/.test(all)) f = Math.max(f, 1.35);
  // STA double aging — Inconel 718 표준 사이클 + Ni superalloy
  if (/double.?age|sta.*age|sta.*solution|two.?step.*age|718.*sta/.test(all)) f = Math.max(f, 1.50);
  // HIP — vacuum + high pressure + high temp
  if (/hip|hot.?isostatic/.test(all)) f = Math.max(f, 1.65);
  // Carburize / Nitride / Cementation — case hardening
  if (/nitrid|carburiz|cementation|침탄|질화/.test(all)) f = Math.max(f, 1.40);
  // Coating (TBC, MCrAlY, DLC, PVD/CVD)
  if (/coating|coated|dlc|tin\b|tialn|cvd|pvd|tbc\b|mcraly|aluminide/.test(all)) f = Math.max(f, 1.50);
  // 다단 사이클 — comma/+/→ 다수 → 추가 비용
  const cycleCount = (all.match(/[,+→]|2차|1차/g) || []).length;
  if (cycleCount >= 2) f += 0.10;
  return +f.toFixed(2);
}

/* R116 — Condition-aware price multiplier. heat_treatment / condition string 기반.
   같은 grade 라도 As-supplied vs Annealed vs Q+T vs STA vs HIP 별로 가격 차이.
   raw material price 자체에는 영향 X — 별도 delivered_price 계산에 사용.
   1.00 = no extra processing · 0.95 = pre-anneal (slight discount) · 1.05-1.50 = various HT */
export function priceConditionFactor(m) {
  const ht = String(m.heat_treatment || '').toLowerCase();
  const cond = String(m.condition || '').toLowerCase();
  const n = String(m.name || '').toLowerCase();
  const all = ht + ' ' + cond + ' ' + n;
  let f = 1.0;
  // As-supplied / As-rolled / Mill-finish → 기본 (raw price 그대로)
  if (/as.?supplied|as.?rolled|as.?cast|mill.?finish|as.?received/.test(all)) return 1.00;
  // Annealed — 보통 mill 에서 함, 거의 추가 비용 없음
  if (/^o\b|^annealed|annealed\b|softened/.test(all)) f = 1.02;
  // Normalized — 더 큰 anneal 사이클
  if (/normaliz/.test(all)) f = 1.05;
  // Cold-worked (1/4H, 1/2H, H, EH) — extra cold rolling pass
  if (/\b1\/4h\b|\b1\/2h\b|\bfull.?hard\b|cold.?work|strain.?harden|cold.?drawn|cold.?rolled/.test(all)) f = Math.max(f, 1.08);
  if (/\beh\b|extra.?hard|spring.?temper/.test(all)) f = Math.max(f, 1.15);
  // Q+T — 표준 quench + temper
  if (/q\+t|quench.*temper|tempered|martensitic.?temper|hardened.*tempered/.test(all)) f = Math.max(f, 1.18);
  // Solution + Aged — PH stainless / Ni 합금
  if (/solution|aged|aging|시효|sta\b|h900|h925|h1025|h1075|h1100|h1150|t6\b|t651|t73|t76/.test(all)) f = Math.max(f, 1.25);
  // Multi-step (STA + double aging, 718 standard 사이클)
  if (/double.?age|sta.*age|sta.*solution|two.?step.*age|718.*sta/.test(all)) f = Math.max(f, 1.40);
  // HIP — hot isostatic pressing, vacuum + high temp
  if (/hip|hot.?isostatic/.test(all)) f = Math.max(f, 1.60);
  // Carburizing / Nitriding — case hardening
  if (/carburiz|nitrid|cementation|침탄|질화/.test(all)) f = Math.max(f, 1.30);
  // Coating (TBC, MCrAlY, DLC, PVD/CVD)
  if (/tbc\b|mcraly|aluminide|diffusion.?coating|dlc|tin\b|tialn|cvd|pvd/.test(all)) f = Math.max(f, 1.50);
  // Multi-cycle indicator
  const cycleCount = (all.match(/[,+→]|2차|1차/g) || []).length;
  if (cycleCount >= 2) f += 0.05;
  return +f.toFixed(3);
}

/* R116 — Grade premium within family. 같은 family 내 grade 차이 (이미 ALLOY_SPECIFIC 의 195 entry 는 base price 가 정확).
   여기서는 CSV/generic entry 의 grade-수준 premium 만 추정. AISI/SAE 번호 기반.
   주의: 4-digit 매치는 AISI/SAE 명시 prefix 또는 합금명 시작 위치만 사용 (e.g. "1065°C" 같은 temperature 매치 회피). */
export function priceGradePremium(m) {
  const n = String(m.name || '').toLowerCase();
  // Steel — AISI/SAE 번호 (prefix 명시 또는 강 합금명 anchored)
  const aisi = n.match(/\b(?:aisi|sae|astm)\s*([1-9])(0|1|2|4|5|6|8|9)(\d)(\d)\b/) || n.match(/^(?:\W*)([1-9])(0|1|2|4|5|6|8|9)(\d)(\d)\b/);
  if (aisi) {
    const series = aisi[1] + aisi[2];
    const cPct = +(aisi[3] + aisi[4]) / 100;
    if (/^41|^43|^86|^93/.test(series)) return +(1.0 + cPct * 0.10).toFixed(3); // Cr-Mo / Ni-Cr-Mo, C 함량 따라 ↑
    if (/^10|^15/.test(series)) return +(0.95 + cPct * 0.05).toFixed(3); // carbon steel
    if (/^51|^61/.test(series)) return +(1.0 + cPct * 0.08).toFixed(3); // Cr spring
  }
  // Aluminum — series 별
  if (/\b7068|7075|7050|7175/.test(n)) return 1.10;  // high-strength aerospace
  if (/\b2090|2195|2099|2050/.test(n)) return 1.30;  // Al-Li
  if (/\b2024|2014|2219/.test(n)) return 1.05;       // 2xxx
  if (/\bscalmalloy|sc-modified/.test(n)) return 2.0; // Sc 추가 매우 비쌈
  // Ni superalloy — single crystal premium
  if (/cmsx-?[12345]|rene n5|rene n6|pwa 1480|pwa 1484/.test(n)) return 4.0; // single crystal
  if (/ds-?cast|directionally.?solidified|rene 80|in 738|in 939/.test(n)) return 2.0; // DS cast
  return 1.0;
}

/* R116 — Form-factor (process) price multiplier. 같은 grade 라도 process 형태에 따라 가격 차이.
   Cast: 1.0 (base), Wrought bar: 1.05, Rolled sheet: 1.10, Cold-drawn tube/wire: 1.20,
   Forged: 1.15, Powder (AM): 2.0~3.5, Sintered (PM): 1.5 */
export function priceFormFactor(m) {
  const proc = String(m.process || '').toLowerCase();
  let f = 1.0;
  if (/lpbf|slm|dmls/.test(proc)) f = 2.5;       // AM powder + atomization premium
  else if (/\bebm\b|electron.?beam/.test(proc)) f = 3.0;  // EBM Ti powder 더 비쌈
  else if (/binder.?jet/.test(proc)) f = 2.2;
  /* R155 — /ded/ 가 "molded" · "extruded" 안의 "ded" 부분 매치 → 잘못된 f=2.0.
     word boundary 적용. */
  else if (/\bded\b|directed.?energy|wire.?arc/.test(proc)) f = 2.0;
  else if (/sintered|powder.?metal|\bpm\b/.test(proc)) f = 1.5;
  else if (/investment|lost.?wax/.test(proc)) f = 1.20;  // 정밀 주조
  else if (/die.?cast/.test(proc)) f = 1.05;
  else if (/sand.?cast|gravity.?cast|cast\b/.test(proc)) f = 1.00;  // base
  else if (/cold.?drawn|cold.?rolled|hard.?drawn/.test(proc)) f = 1.20;
  else if (/forg|forge/.test(proc)) f = 1.15;
  else if (/sheet.?metal|stamp/.test(proc)) f = 1.10;  // rolled sheet
  else if (/rolled|hot.?rolled/.test(proc)) f = 1.08;
  else if (/wrought|extrud/.test(proc)) f = 1.05;
  else if (/injection|molded/.test(proc)) f = 1.0;
  return +f.toFixed(3);
}
