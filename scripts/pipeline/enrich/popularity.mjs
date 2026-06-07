/*
 * R156 — popularityFor(m): 산업 인기도 (1.0-5.0) 휴리스틱.
 *
 * build-materials.mjs 의 본문에서 extract → 단위 테스트 가능.
 * Tier 매핑 + 한국 산업 modifier + condition modifier 통합.
 *
 * Tier 5 — 한국 산업 현장 일상 (S45C, SUS304, 6061, ABS, PC, PVC 등)
 * Tier 4 — 자주 사용 (PH stainless, Maraging, 항공 7xxx Al, AM 표준 IN718)
 * Tier 3 — 보통 특수 (의료 CoCrMo, Duplex 2205, PEEK)
 * Tier 2 — 항공우주·연구 (Inconel 738/939, Haynes 282, Nitinol)
 * Tier 1 — 전문/희귀 (CMSX, Rene N5, AM 신소재)
 */

export function popularityFor(m) {
  const n = String(m.name || '').toLowerCase();
  const has = (re) => re.test(n);
  const cat = m.category;
  let t = 1;

  if (cat === 'Metal') {
    // T5 — 한국 산업 표준
    if (
      has(/\bs45c\b|^1045\b|\b1045\b|c45\b/) ||
      has(/\bscm440\b|\b4140\b|42crmo/) ||
      has(/\bss400\b|\ba36\b|^st37/) ||
      has(/\bsus304\b|\b304l?\b/) ||
      has(/\bsus316\b|\b316l?\b/) ||
      has(/aa\s*?6061|\b6061\b/) ||
      has(/aa\s*?5052|\b5052\b/) ||
      has(/\b1018\b|\b1020\b|^1010|aisi 10[12]0/) ||
      has(/alsi10mg/) ||
      has(/ti[\s-]?6al[\s-]?4v|ti-6-4|grade ?5\b|gr ?5\b/) ||
      has(/inconel 718|in[\s-]?718/)
    ) t = 5;
    // T4 — 자주 사용
    if (t < 5 && (
      has(/\bsus430\b|\b430\b/) ||
      has(/\bsus410\b|\b410\b|\bsus420\b|\b420\b/) ||
      has(/17[\s-]?4 ?ph|\bsus630\b/) ||
      has(/15[\s-]?5 ?ph/) ||
      has(/\bsm45c\b|^1050|s50c\b/) ||
      has(/aa\s*?7075|\b7075\b/) ||
      has(/aa\s*?6063|\b6063\b/) ||
      has(/aa\s*?5083|\b5083\b/) ||
      has(/aa\s*?2024|\b2024\b/) ||
      has(/\ba356\b|\baa357\b|alsi7mg/) ||
      has(/\bh13\b|\bskd61\b/) ||
      has(/\bp20\b/) ||
      has(/\b4340\b|sncm/) ||
      has(/\b8620\b/) ||
      has(/\bsuj2\b|\b52100\b|\b100cr6\b/) ||
      has(/inconel 625|in[\s-]?625/) ||
      has(/maraging|18ni/) ||
      has(/cocrmo|\bcocr\b|f75/) ||
      has(/c10100|c11000|ofe.?copper/) ||
      has(/c26000|brass/) ||
      has(/cucr|c18\d{3}/) ||
      has(/az31|az91|magnesium/) ||
      has(/\binvar\b|invar 36|fe-?ni36/) ||
      /* R164 — 추가: 일반 산업 표준 carbon steel (1040 spring/gear, 1080 high-C). 1018/1020/1045/1050 은 이미 T5. */
      has(/\b10[348]0\b|\baisi 10[348]0\b/) ||
      /* AISI 4130 (Cr-Mo, motorcycle frame / aerospace tubing) */
      has(/\b4130\b|aisi 4130/) ||
      /* A516 Grade 70 (pressure vessel carbon steel — petrochem 표준) */
      has(/a516|sa-?516/) ||
      /* A572 Grade 50 (HSLA structural — bridge / building) */
      has(/a572|sa-?572/) ||
      /* AA 6082 (general structural Al, EU 표준) */
      has(/aa\s*?6082|\b6082\b/) ||
      /* AA 1050 (commercially pure Al, decorative / electrical) */
      has(/aa\s*?1050|\b1050\b/)
    )) t = 4;
    // T3 — 특수/고성능
    if (t < 4 && (
      has(/haynes 230/) ||
      has(/hastelloy x|hastelloy c-?(22|276)/) ||
      has(/inconel 6\d{2}/) ||
      has(/a-?286|incoloy 901/) ||
      has(/\b2205\b|duplex/) ||
      has(/becu|beryllium copper|c17200/) ||
      has(/bronze|c5\d{3}|c6\d{3}|c9\d{3}/) ||
      has(/aa\s*?2014|\b2014\b/) ||
      has(/aa\s*?7050|\b7050\b/) ||
      has(/(ti\s*cp|ti grade ?[1-4]|ti gr ?[1-4])/) ||
      has(/ti grade ?9|ti-?3al-?2\.?5v/) ||
      has(/tool steel|d2|cpm|m2|s7/) ||
      has(/cuni|c70600|c71500/)
    )) t = 3;
    // T2 — 항공우주·연구
    if (t < 3 && (
      has(/inconel 7(38|39|13|40|51)|inconel x-?750|in[\s-]?9\d{2}/) ||
      has(/haynes (282|214|188|25)/) ||
      has(/waspaloy|nimonic|rene 41|udimet/) ||
      has(/cucr1zr|c18150|grcop/) ||
      has(/tantal|niobium|c-?103|tzm/) ||
      has(/superduplex|\b2507\b|254\s?smo|al-?6xn/) ||
      has(/nitinol|niti\b/) ||
      has(/ti[\s-]?6242|ti-?6242|ti-?17/) ||
      has(/aermet 100|300m\b/) ||
      has(/scalmalloy/)
    )) t = 2;
    // T1 (default) — 매우 특수
    if (t < 2 && (
      has(/cmsx|rene n5|pwa 1484|single[\s-]?crystal|cm247/) ||
      has(/aheadd|al5x1|a205|a20x|cm55/) ||
      has(/ti[\s-]?5[\s-]?8[\s-]?5|ti-5553|ta15/)
    )) t = 1;
    // R43 — subcategory level fallback.
    const sub = String(m.subcategory || '');
    if (t === 1) {
      if (/Stainless Steel - Austenitic/.test(sub)) t = 3.5;
      else if (/Stainless Steel - Ferritic|Stainless Steel - Martensitic/.test(sub)) t = 3.3;
      else if (/Stainless Steel - PH/.test(sub)) t = 3.0;
      else if (/Stainless Steel - Duplex/.test(sub)) t = 2.7;
      else if (/Carbon Steel/.test(sub)) t = 3.4;
      else if (/Alloy Steel/.test(sub)) t = 3.2;
      else if (/Tool Steel/.test(sub)) t = 2.9;
      else if (/Cast Iron/.test(sub)) t = 3.3;
      else if (/Maraging Steel/.test(sub)) t = 2.6;
      else if (/Aluminum - Si Alloys|Aluminum - Pure/.test(sub)) t = 3.5;
      else if (/Aluminum - Mg Alloys|Aluminum - Cu Alloys/.test(sub)) t = 3.3;
      else if (/Aluminum - Mn Alloys|Aluminum - Cast/.test(sub)) t = 3.0;
      else if (/^Aluminum/.test(sub)) t = 3.2;
      else if (/Titanium - α\+β|Ti-6Al-4V/.test(sub)) t = 3.4;
      else if (/^Titanium/.test(sub)) t = 2.8;
      else if (/Copper Alloy - Pure|Copper Alloy - Brass/.test(sub)) t = 3.4;
      else if (/Copper Alloy - Bronze/.test(sub)) t = 3.1;
      else if (/Copper Alloy - Specialty|Copper Alloy - Cu-Ni/.test(sub)) t = 2.7;
      else if (/^Copper Alloy/.test(sub)) t = 3.0;
      else if (/Magnesium/.test(sub)) t = 2.5;
      else if (/Nickel Superalloy - Inconel/.test(sub)) t = 2.4;
      else if (/Nickel Superalloy - Hastelloy/.test(sub)) t = 2.2;
      else if (/Nickel Superalloy/.test(sub)) t = 2.3;
      else if (/Cobalt Alloy - Chrome/.test(sub)) t = 2.5;
      else if (/Cobalt Alloy/.test(sub)) t = 2.1;
      else if (/Beryllium Alloy/.test(sub)) t = 2.4;
      else if (/Shape Memory Alloy/.test(sub)) t = 2.3;
      else if (/Controlled Expansion/.test(sub)) t = 2.5;
      else if (/Refractory Metal/.test(sub)) t = 1.8;
      else if (/Zinc Alloy/.test(sub)) t = 2.4;
      else t = 1.5;
    }
  }

  if (cat === 'Polymer') {
    if (
      has(/\babs\b/) ||
      has(/pa\s*?12|nylon 12|pa\s*?6\b|nylon 6\b|pa\s*?66|nylon 66/) ||
      has(/polycarbonate|\bpc\b(?!-)|lexan/) ||
      has(/\bpla\b/) ||
      has(/\bpp\b|polypro/) ||
      has(/\bpmma\b|acrylic|plexiglas/) ||
      has(/\bpom\b|delrin|acetal/) ||
      has(/\bpet\b/) ||
      has(/petg/) ||
      has(/\bpvc\b|polyvinyl/)
    ) t = 5;
    if (t < 5 && (
      has(/\bpeek\b(?!-)/) ||
      has(/ultem|pei\b/) ||
      has(/pa\s*?11|nylon 11|rilsan/) ||
      has(/asa\b/) ||
      has(/\btpu\b|\btpe\b|elastollan/) ||
      has(/\bhdpe\b|\bldpe\b|polyethylene/) ||
      has(/silicone/) ||
      has(/\bpbt\b|valox/) ||
      has(/\bnbr\b|nitrile butadiene/) ||
      has(/\bhnbr\b|hydrogenated nitrile|therban|zetpol/)
    )) t = 4;
    if (has(/\bnbr\b|nitrile butadiene/) && !has(/\bhnbr\b|hydrogenated/)) t = 5;
    if (t < 4 && (
      has(/ppsu|radel/) ||
      has(/\bpsu\b|udel/) ||
      has(/\bpps\b|fortron/) ||
      has(/ptfe|teflon/) ||
      has(/pvdf|kynar/) ||
      has(/etfe|tefzel/)
    )) t = 3;
    if (t < 3 && (
      has(/pekk|antero/) ||
      has(/lcp\b|vectra|xydar/) ||
      has(/\bpai\b|torlon/) ||
      has(/polyimide|vespel|kapton/) ||
      has(/uhmwpe/)
    )) t = 2;
    if (t < 2 && (
      has(/-cf|carbon[\s-]?fiber/) ||
      has(/onyx|pcl|pha\b/) ||
      has(/pbi\b/)
    )) t = 1;
  }

  if (cat === 'Ceramic') {
    if (has(/tungsten carbide|wc-?co|^wc\b/)) t = 5;
    else if (has(/glass|silica|quartz/)) t = 5;
    else if (has(/alumina|al2o3|99.5%/)) t = 4;
    else if (has(/zirconia|zro2|y-?tzp|ysz/)) t = 4;
    else if (has(/silicon carbide|^sic|sic\b/)) t = 4;
    else if (has(/pzt|piezoelectric|batio3|mlcc|dielectric/)) t = 4;
    else if (has(/silicon nitride|si3n4/)) t = 3;
    else if (has(/aluminum nitride|^aln|aln\b/)) t = 3;
    else if (has(/macor|cordierite|steatite|porcelain|mullite/)) t = 3;
    else if (has(/zrb2|hfb2|hfc|uhtc|ultra-?high/)) t = 1;
    else if (has(/lab6/)) t = 1;
    else t = 2;
  }

  if (cat === 'Composite') {
    if (has(/glass.*epoxy|gfrp/)) t = 5;
    else if (has(/wood/)) t = 5;
    else if (has(/foam/)) t = 4;
    else if (has(/carbon.*epoxy|cfrp/)) t = 4;
    else if (has(/aramid|kevlar/)) t = 3;
    else if (has(/uhmwpe|polyethylene/)) t = 3;
    else if (has(/honeycomb|sandwich/)) t = 3;
    else if (has(/mmc|metal-?matrix/)) t = 2;
    else if (has(/cmc|ceramic-?matrix/)) t = 2;
    else t = 3;
  }

  // R40a — 한국 산업 노출도 modifier (0 ~ 0.45)
  let mod = 0;
  if (
    has(/\bsus3(04|16)\b|\b3(04|16)l?\b/) ||
    has(/\baa\s?6061\b|\b6061\b/) ||
    has(/\bs45c\b|^1045\b|c45\b/) ||
    has(/\babs\b/) || has(/polycarbonate|\bpc\b(?!-)|lexan/)
  ) mod = 0.45;
  else if (
    has(/\bsus4(30|10|20)\b|\b4(30|10|20)\b/) ||
    has(/scm440|\b4140\b|42crmo/) ||
    has(/\baa\s?5083\b|\b5083\b/) ||
    has(/alsi10mg/) ||
    has(/inconel\s?718|in[\s-]?718/) ||
    has(/pa\s?66|nylon\s?66/) ||
    has(/\bss400\b|\ba36\b/) ||
    has(/\b1018\b|\b1020\b|aisi 10[12]0/) ||
    has(/\bsus630\b|17[\s-]?4\s?ph/) ||
    has(/\bh13\b|skd61/) ||
    has(/\bsuj2\b|\b52100\b|\b100cr6\b/)
  ) mod = 0.35;
  else if (
    has(/aa\s?5052|\b5052\b/) || has(/aa\s?7075|\b7075\b/) ||
    has(/ti[\s-]?6al[\s-]?4v|grade\s?5|gr\s?5/) ||
    has(/\bpla\b|petg/) || has(/\bpom\b|delrin|acetal/) ||
    has(/\bpmma\b|acrylic/) || has(/\bpp\b|polypro/) ||
    has(/cocrmo|\bcocr\b|f75/) || has(/inconel\s?625|in[\s-]?625/) ||
    has(/maraging|18ni/) || has(/\b4340\b|sncm/) || has(/\b8620\b/) ||
    has(/aa\s?6063|\b6063\b/)
  ) mod = 0.25;
  else if (
    has(/haynes\s?230/) || has(/hastelloy x/) ||
    has(/invar|\bp20\b/) ||
    has(/\bbrass\b|c26000|황동/) || has(/bronze/) ||
    has(/\bpeek\b(?!-)/) || has(/ultem|pei\b/) ||
    has(/\baa\s?2024\b|\b2024\b/) || has(/\b2205\b|duplex/) ||
    has(/c10100|c11000|ofe.?copper/) ||
    has(/\ba356\b|alsi7mg/)
  ) mod = 0.15;

  // R43 — condition modifier (-0.10 ~ +0.10)
  const ht = String(m.heat_treatment || '').toLowerCase();
  const nameRest = String(m.name || '').toLowerCase();
  const haystack = ht + ' ' + nameRest;
  let condMod = 0;
  if (/q\+t|quench.*tempered|tempered\b|aged|peak[\s-]?ag|h900|h1025|h1075|sta\b|dsa\b/.test(haystack)) condMod = 0.07;
  else if (/hip|isostatic/.test(haystack)) condMod = 0.04;
  else if (/anneal|solution|mill annealed|beta annealed/.test(haystack)) condMod = 0;
  else if (/cold[\s-]?worked|strain[\s-]?hardened|hardened\b/.test(haystack)) condMod = 0.03;
  else if (/normaliz|stress[\s-]?reliev/.test(haystack)) condMod = -0.03;
  else if (/as[\s-]?(built|cast|supplied|received|rolled|forged|extruded)/.test(haystack)) condMod = -0.08;

  let score = t + mod + condMod;
  // R35a — AM 합금 상한 3.0 → R164 — 3.5 로 완화.
  //   기존 3.0 cap 은 대중적 base alloy (316L / IN718 / Ti-6-4 / AlSi10Mg) 의 AM 변종 까지 누른다.
  //   AM 자체는 아직 mainstream 미달이지만, 인기 base alloy 의 AM 그레이드 (e.g., LPBF 316L) 는 산업 표준.
  const proc = String(m.process || '');
  const isAM = /LPBF|DMLS|SLM|EBM|Binder Jetting|DED|MJF|FDM|SLS/i.test(proc);
  if (isAM && score > 3.5) score = 3.5;
  // 1-5 clamp
  if (score > 5) score = 5;
  if (score < 1) score = 1;
  return Math.round(score * 100) / 100;
}
