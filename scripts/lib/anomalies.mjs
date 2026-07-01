/*
 * R226e — detectAnomalies 공유 모듈 (build-from-registry·build-materials 중복 제거, S4).
 *
 * 최종 데이터(레지스트리) 기준 검출이 canonical (build-from-registry 호출부).
 * build-materials 는 소스 부착 전 호출이라 과다집계 — 이는 함수가 아니라 호출 시점(timing) 차이이며 문서화됨.
 * category-aware 임계값: 폴리머 elongation > 1000% 정상, CFRP CTE 음수 정상, Diamond HV ~10000 정상.
 */
export function detectAnomalies(all) {
  const out = [];
  const push = (sev, kind, m, detail) => out.push({ severity: sev, kind, id: m.id, name: m.name, detail });
  const typ = (m, k) => (m.ranges && m.ranges[k]) ? m.ranges[k].typical : null;
  for (const m of all) {
    const cat = m.category || 'Metal';
    const sy = typ(m, 'yield_strength'), uts = typ(m, 'uts');
    if (sy != null && uts != null && sy > uts * 1.02) push('high', 'σy > UTS', m, `σy ${sy} > UTS ${uts}`);

    // family-aware σy/UTS ratio — verified datasheet URL 있는 alloy 는 family 임계 skip (신뢰 출처 우선).
    const hasVerifiedSource = m.sources && m.sources.some(s => s.verified);
    if (sy != null && uts != null && uts > 0 && !hasVerifiedSource) {
      const ratio = sy / uts;
      const sub = String(m.subcategory || '');
      if (cat === 'Metal') {
        if (ratio > 1.01) push('high', 'σy/UTS > 1.01 (data error)', m, `${ratio.toFixed(2)} (σy=${sy}, UTS=${uts})`);
        else if (/Stainless Steel - Austenitic/.test(sub) && (ratio < 0.20 || ratio > 0.95))
          push('med', 'Austenitic SS σy/UTS out of [0.20, 0.95]', m, `${ratio.toFixed(2)}`);
        else if (/Carbon Steel/.test(sub) && (ratio < 0.35 || ratio > 0.95))
          push('low', 'Carbon Steel σy/UTS out of [0.35, 0.95]', m, `${ratio.toFixed(2)}`);
        else if (/Nickel Superalloy/.test(sub) && ratio > 0.99)
          push('med', 'Ni Superalloy σy/UTS > 0.99 (suspect)', m, `${ratio.toFixed(2)}`);
        else if (/Maraging/.test(sub) && ratio > 1.00)
          push('low', 'Maraging σy/UTS > 1.00', m, `${ratio.toFixed(2)}`);
        else if (/Titanium - α\+β/.test(sub) && (ratio < 0.75 || ratio > 0.99))
          push('low', 'Ti α+β σy/UTS out of [0.75, 0.99]', m, `${ratio.toFixed(2)}`);
        else if (/Tool Steel/.test(sub) && ratio > 0.99)
          push('low', 'Tool Steel σy/UTS > 0.99', m, `${ratio.toFixed(2)}`);
      }
      if (cat === 'Polymer' && ratio > 1.05) push('med', 'Polymer σy > UTS × 1.05', m, `${ratio.toFixed(2)}`);
    }

    const dens = typ(m, 'density');
    if (dens != null && (dens <= 0 || dens > 25)) push('high', 'density out of range', m, `${dens} g/cm³`);
    const E = typ(m, 'modulus');
    if (E != null && (E <= 0 || E > 1500)) push('high', 'modulus out of range', m, `${E} GPa`);
    if (E != null && cat === 'Metal' && !hasVerifiedSource) {
      const sub = String(m.subcategory || '');
      if (/^Aluminum/.test(sub) && (E < 55 || E > 85)) push('low', 'Aluminum E out of [55, 85] GPa', m, `${E}`);
      else if (/^Titanium/.test(sub) && (E < 85 || E > 135)) push('low', 'Titanium E out of [85, 135] GPa', m, `${E}`);
      else if (/Stainless Steel|Carbon Steel|Alloy Steel|Tool Steel|Maraging/.test(sub) && (E < 175 || E > 225)) push('low', 'Steel family E out of [175, 225] GPa', m, `${E}`);
      else if (/Nickel Superalloy/.test(sub) && !/monel|cmsx|rene n|pwa14|ma754|ods|incoloy 909|inconel 783|single-crystal/i.test(m.name) && (E < 185 || E > 235)) push('low', 'Ni Superalloy E out of [185, 235] GPa', m, `${E}`);
      else if (/^Copper Alloy/.test(sub) && (E < 95 || E > 145)) push('low', 'Cu Alloy E out of [95, 145] GPa', m, `${E}`);
      else if (/Magnesium/.test(sub) && (E < 40 || E > 50)) push('low', 'Mg E out of [40, 50] GPa', m, `${E}`);
    }
    if (sy != null && sy < 0) push('high', 'σy negative', m, `${sy}`);
    if (uts != null && uts < 0) push('high', 'UTS negative', m, `${uts}`);

    const HV = typ(m, 'hardness');
    const hvCap = cat === 'Ceramic' ? 12000 : (cat === 'Composite' ? 1000 : 5000);
    if (HV != null && (HV < 0 || HV > hvCap)) push('high', `hardness out of range (${cat})`, m, `${HV} HV`);

    const el = typ(m, 'elongation');
    const elCap = (cat === 'Polymer' || cat === 'Composite') ? 1500 : 200;
    if (el != null && (el < 0 || el > elCap)) push('med', `elongation out of range (${cat})`, m, `${el}%`);

    const nu = typ(m, 'poisson_ratio');
    if (nu != null && (nu <= 0 || nu > 0.5)) push('med', 'poisson_ratio out of range', m, `${nu}`);

    const cte = typ(m, 'thermal_expansion');
    if (cte != null) {
      if (cat === 'Composite') { if (cte < -15 || cte > 250) push('med', 'CTE out of composite range', m, `${cte}`); }
      else if (cte < 0 || cte > 250) push('med', 'CTE out of range', m, `${cte} ×10⁻⁶/K`);
    }

    const tk = typ(m, 'thermal_conductivity');
    if (tk != null && (tk < 0 || tk > 3000)) push('med', 'thermal_conductivity out of range', m, `${tk} W/m·K`);

    if (m.tier === 'curated' && (!m.sources || m.sources.length === 0)) push('med', 'curated alloy without sources', m, '');
    if (m.tier !== 'reference' && m.sources && !m.sources.some(s => s.verified)) push('low', 'no verified source URL', m, '');

    if (m.popularity != null && (m.popularity < 1 || m.popularity > 5)) push('high', 'popularity out of [1,5]', m, `${m.popularity}`);

    for (const propKey of ['yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'density']) {
      const r = m.ranges && m.ranges[propKey];
      if (r && r.min != null && r.max != null && r.min > r.max) push('high', `${propKey}: min > max`, m, `${r.min} > ${r.max}`);
    }
  }
  return out;
}
