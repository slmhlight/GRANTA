/*
 * R226j/C6 — 공정 가이드 프로파일 분류기 (빌드타임 전용).
 *
 * 목적: 이전에 클라이언트 런타임에서 name-regex 로 매번 추론하던 절삭성/용접성 모델/HT family/
 * 인사이트 그룹을 "레지스트리 재생성 시 1회" 분류해 data/process-profile-assignments.json 에
 * stable_id 키로 동결한다. 런타임은 조회만 — regex 오분류가 사용자에게 도달할 경로가 없다.
 *
 * 규칙:
 *  - 여기의 휴리스틱은 부트스트랩이다. 산출물(assignments)은 커밋되어 리뷰·수동교정 대상이며,
 *    교정은 data/process-profile-overrides.json (stable_id 키 + src 인용) 에만 쓴다.
 *  - 프로파일 키는 data/process-profiles.json 콘텐츠 키와 1:1 (테스트 게이트가 parity 검증).
 *  - R226i 견고성 유지: 측정치 토큰 제거(machiningKey) + 지정번호 단어경계.
 */

/** 매칭 키 — 측정치 토큰(수치+°C/HV/HRC/MPa/ksi)과 PH 시효코드(H900~H1150)를 제거해
 *  grade 번호 오인 방지 (R226i; "H 1050" 이 탄소강 10xx 에 오매칭되던 사례 포함). */
export function machiningKey(name, subcategory) {
  return `${subcategory || ''} ${name || ''}`
    .replace(/\d+(?:[.,]\d+)?\s*(?:°\s*[cf]?|h(?:v|rc|rb|ra|b)|[mg]pa|ksi)\b/gi, ' ')
    .replace(/\bh\s?(?:9\d{2}|1[01]\d{2})\b/gi, ' ');
}

/* ── 금속 절삭성 프로파일 (키는 process-profiles.json machinability.metal 과 1:1) ── */
const METAL_MACH = [
  [/\b303\b|sus\s?303|1\.?4305|303se/i, 'ss-303'],
  [/free.?machining|leaded|12L14|11SMnPb|c36000|brass.*free|1144|stressproof|c14500|tellurium/i, 'fm-steel'],
  [/416\b.*stainless|stainless.*416/i, 'ss-416'],
  [/aluminum.*2011|\b6262\b/i, 'al-fm'],
  [/aluminum.*6\d{3}|\b6061\b|\b6063\b|\b6082\b/i, 'al-6xxx'],
  [/aluminum.*7\d{3}|\b7075\b|\b7050\b/i, 'al-7xxx'],
  [/aluminum.*2\d{3}|\b2024\b|\b2219\b/i, 'al-2xxx'],
  [/aluminum.*5\d{3}|\b5052\b|\b5083\b/i, 'al-5xxx'],
  [/aluminum.*1\d{3}|\b1100\b|aluminum.*3\d{3}/i, 'al-soft'],
  [/alsi10mg|alsi7mg|aluminum/i, 'al-cast-am'],
  [/brass|c[34]\d{4}/i, 'brass'],
  [/cupronickel|c70600|c71500/i, 'cuni'],
  [/beryllium|c17200|\bbecu\b|cube2/i, 'becu'],
  [/copper.*pure|ofhc|c11000|c10100|c10200|c12200/i, 'cu-pure'],
  [/copper.*cr.?zr|cucrzr/i, 'cu-crzr'],
  [/\b1018\b|\b1020\b|carbon steel.*low|sae 10[12]\d/i, 'carbon-low'],
  [/\b10[3-8]\d\b|\bs45c\b/i, 'carbon-medhigh'],   // SK 계(탄소 공구강)는 subcategory 'Tool Steel' 행이 담당
  [/\b413[05]\b|4140|42crmo|scm4[1345]\d|31crmov/i, 'crmo'],
  [/4340|sncm/i, 'nicrmo'],
  [/8620|9310|carburizing|case.hardening/i, 'case-hard'],
  [/52100|100cr6|bearing steel/i, 'bearing'],
  [/maraging/i, 'maraging'],
  [/magnesium|\baz\d{2}\b|\bwe43\b|\bzk60\b|\bam60\b|\belektron\b/i, 'magnesium'],
  [/tool steel|\bd2\b|\bd3\b|\bh1[13]\b|\bm[24]\b|skd|cpm/i, 'tool-steel'],
  [/stainless.*ph|17-?4|15-?5|13-?8|custom 465/i, 'ss-ph'],
  // 조합 subcategory "Ferritic/Martensitic" 는 subcat 단어로 구분 불가(둘 다 매칭) → **grade 번호**로 판정.
  //   마르텐사이트(경화형: 410/420/422/431/440·SS4x0·13Cr)를 페라이트보다 먼저. 410S(페라이트)·FSX-414(Co)는 제외.
  [/\b410\b|\b420\b|\b422\b|\b431\b|\b440[a-c]?\b|\bss4[124]0[a-c]?\b|13\s*cr/i, 'ss-martensitic'],
  [/\b40[59]\b|\b430\b|\b434\b|\b436\b|\b439\b|\b44[246]\b|\b410s\b|stainless.*ferritic|fecral|ma956/i, 'ss-ferritic'],
  [/stainless.*austenitic|\b304l?\b|\b316l?\b|\b309\b|\b310s?\b|\b321\b/i, 'ss-austenitic'],
  [/stainless.*duplex|\b2205\b|\b2507\b/i, 'ss-duplex'],
  [/inconel 617|haynes 230|hastelloy x|haynes 282/i, 'ni-super-solidsol'],
  [/nickel.*super|inconel|hastelloy|nimonic|waspaloy|udimet|rene|incoloy/i, 'ni-super'],
  [/cobalt|stellite|cocrmo|l605|f-?75|mp35n/i, 'cobalt'],
  [/titanium.*pure|cp.?ti|ti grade [12]\b/i, 'ti-cp'],
  [/titanium|ti6al4v|ti-6al-4v/i, 'ti-alloy'],
  [/tungsten/i, 'tungsten'],
  [/tantalum|niobium/i, 'ta-nb'],
  [/molybdenum|tzm|mo-?la|moly/i, 'moly'],
  [/refractory/i, 'refractory'],
];

/* ── 폴리머 절삭성 프로파일 (Ensinger·Quadrant/MCAM 가공 가이드 검증 클래스) ── */
const POLYMER_MACH = [
  [/glass.?fib|carbon.?fib|\b(?:gf|cf|scf)\s*-?\s*\d{2,3}\b|\bgf\b|\bcf\b|-gf\b|-cf\b|\d{2}\s*%?\s*(?:gf|cf|glass|carbon)|reinforc|woven fabric|laminate|\bonyx\b/i, 'pol-filled'],
  [/epoxy|thermoset|phenolic|melamine|bakelite|polyester resin|resin.*cast|cast.*resin/i, 'pol-thermoset'],
  [/\bfoam\b|rohacell|\bpmi\b/i, 'pol-foam'],
  [/\btpu\b|\btpe\b|elastomer|silicone|rubber|\bnbr\b|hnbr|\beva\b|polyurethane|urethane/i, 'pol-elastomer'],
  [/ptfe|teflon|\bpfa\b|\bfep\b|pctfe|polyethylen|uhmw|hdpe|ldpe|\bpe\b|polypropylen|\bpp\b|\bpla\b|\bpcl\b|\bpha\b|petg|\bpvb\b/i, 'pol-soft'],
  [/pmma|acrylic|plexiglas|perspex|polystyren|\bps\b|gpps|hips/i, 'pol-brittle'],
  // 비정질 ESC 클래스 (Quadrant: PC·PPSU·PEI·PSU 는 수용성 절삭유 environmental stress-cracking — 순수 물/압축공기)
  [/polycarbonate|\bpc\b|lexan|makrolon|ppsu|radel|\bpei\b|ultem|\bpsu\b|udel|polysulfone|pesu|\bpes\b|polyethersulfone/i, 'pol-amorphous'],
];
const POLYMER_DEFAULT = 'pol-rigid';   // 강성 엔지니어링 열가소성 (POM/PA/PBT/PEEK/PPS/PET/LCP/PI…)

/* ── 용접성 모델 (CE 계열은 C-Mn/저합금강 전용 — R205 F2 물리 근거) ── */
const WELD_NONE_RE = /aluminum|copper|titanium|magnesium|nickel|cobalt|refractory|maraging|zinc|beryllium|controlled expansion|shape memory|zirconium|cast iron|electrical/i;
const WELD_SCHAEFFLER_RE = /stainless/i;

/* ── HT 조건 클래스 (구조 필드 heat_treatment → 클래스; 조건별 가공 노트 키) ── */
const HT_CLASSES = [
  [/carburiz|nitrid|case|carbonitrid/i, 'case'],
  [/aged|aging|\bsta\b|\bt6\b|\bt5\b|\bt73?\b|\bt76\b|\bt8\b|h9[05]0|h1[01]\d{2}|precipitat/i, 'aged'],
  [/q\s*[+&]\s*t|quench|temper|hardened|austemper|martemper/i, 'qt'],
  [/anneal|normaliz|solution|spheroidiz|stress.reliev|\bo\b temper|soft/i, 'soft'],
  [/as.built|as.printed/i, 'as-built'],
  [/\bhip\b|hot isostatic/i, 'hip'],
  [/cold.work|strain.harden|\bh1[1-9]\b|half.hard|full.hard|spring temper|drawn/i, 'cold'],
];

export function classifyMachinability(category, name, subcategory) {
  const key = machiningKey(name, subcategory);
  if (category === 'Metal') {
    for (const [re, k] of METAL_MACH) if (re.test(key)) return k;
    return null;   // 미매칭 = 안전한 null (카드 미표시) — 커버리지 확장은 overrides 로
  }
  if (category === 'Polymer') {
    for (const [re, k] of POLYMER_MACH) if (re.test(key)) return k;
    return POLYMER_DEFAULT;
  }
  return null;   // Ceramic/Composite — 절삭 아닌 별도 공정 (R125)
}

export function classifyWeldModel(category, subcategory) {
  if (category !== 'Metal') return null;
  const sub = subcategory || '';
  if (WELD_SCHAEFFLER_RE.test(sub)) return 'schaeffler';
  if (WELD_NONE_RE.test(sub)) return 'none';
  return 'ce';
}

export function classifyHtClass(heatTreatment) {
  const ht = String(heatTreatment || '');
  if (!ht) return null;
  for (const [re, cls] of HT_CLASSES) if (re.test(ht)) return cls;
  return null;
}

/** HT alloy-specific family — 클라이언트 ht-alloy-specific.ts 의 alloyPattern 을 파싱해 받은
 *  [{pattern: RegExp, familyName}] 목록으로 1회 매칭 (패턴 SSOT = 그 파일, 여기 중복 없음). */
export function classifyHtFamily(name, htFamilies) {
  for (const f of htFamilies) if (f.pattern.test(name || '')) return f.familyName;
  return null;
}

/* ── 선택 인사이트 그룹 (subcategory 기반; 콘텐츠는 data/selection-insights.json) ── */
export function classifyInsightGroup(category, subcategory) {
  const sub = subcategory || '';
  if (category === 'Metal') {
    if (/structural|shipbuilding|weathering|microalloyed|hsla|high-strength low|rail|pipeline|pressure vessel|armor/i.test(sub)) return 'structural-steel';
    if (/stainless.*(duplex|ph)/i.test(sub)) return 'stainless-highperf';
    if (/stainless/i.test(sub)) return 'stainless';
    if (/aluminum/i.test(sub)) return 'aluminum';
    if (/titanium/i.test(sub)) return 'titanium';
    if (/nickel superalloy/i.test(sub)) return 'ni-superalloy';
    if (/cobalt/i.test(sub)) return 'cobalt';
    if (/copper/i.test(sub)) return 'copper';
    if (/magnesium/i.test(sub)) return 'magnesium';
    if (/tool steel|maraging/i.test(sub)) return 'tool-steel';
    if (/refractory/i.test(sub)) return 'refractory';
    if (/carbon|alloy steel|spring|bearing|case|cr-mo|wear|heat-resistant|advanced high|press-harden|cryogenic/i.test(sub)) return 'carbon-alloy-steel';
    return null;
  }
  if (category === 'Polymer') {
    if (/ptfe|pvdf|etfe|fluoro/i.test(sub)) return 'pol-fluoro';
    if (/peek|pekk|pei|ultem|pai|pbi|pps|ppsu|psu|pes|lcp|polyimide/i.test(sub)) return 'pol-highperf';
    if (/elastomer|tpu|tpe|silicone|rubber/i.test(sub)) return 'pol-elastomer';
    if (/foam/i.test(sub)) return null;
    if (/polyamide|pom|polycarbonate|pbt|pet\b|pmma|abs|asa|acetal|nylon|ppa/i.test(sub)) return 'pol-engineering';
    if (/polyethylene|uhmwpe|\bpp\b|pvc|polystyrene|pla|petg|eva|pcl|polyester|epoxy|pvb/i.test(sub)) return 'pol-commodity';
    return null;
  }
  // R226r — 세라믹·복합재 인사이트 그룹 (구조 세라믹 / 섬유·금속기지 복합재 when-to-use). 구조재 전용.
  if (category === 'Ceramic') return 'ceramic';
  if (category === 'Composite') return 'composite';
  return null;
}
