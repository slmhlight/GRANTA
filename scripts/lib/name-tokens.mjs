/*
 * R227/E14 — 재료 이름 토큰화 순수 lib (audit-story-names 로직 승격).
 *
 * 목적: 합금 이름/별칭에서 검색·위키링크에 쓸 "지정자 토큰(surface-form)"을 결정적으로 추출.
 *   - audit-story-names.mjs (이름-커버리지 게이트)와 build-wiki-index.mjs (위키 lexicon)가 공유.
 *   - tokensOf/norm/KO/FORMULA/STOP 은 audit 와 **동작 동일**(승격 시 회귀 0 검증).
 *   - wiki 전용 추가 규칙(쓰레기 form 필터·autolink 후보 판정)은 별도 함수로 분리 → audit 불변.
 */

// 스토리 본문에서 한글로 언급될 수 있는 영문명 → 한글 표기 (커버리지·검색 동의어)
export const KO = {
  'music wire': '피아노선', 'gray cast iron': '회주철', 'tungsten': '텅스텐', 'vanadium': '바나듐',
  'beryllium': '베릴륨', 'diamond': '다이아몬드', 'epoxy': '에폭시', 'polyester': '폴리에스터',
  'polystyrene': '폴리스타이렌', 'polyimide': '폴리이미드', 'zirconium': '지르코늄', 'rhenium': '레늄',
  'hafnium': '하프늄', 'chromium': '크롬', 'copper': '구리', 'brass': '황동', 'bronze': '청동',
  'kovar': '코바', 'invar': '인바', 'molybdenum': '몰리브데넘', 'tantalum': '탄탈럼', 'niobium': '나이오븀',
  'titanium': '티타늄', 'magnesium': '마그네슘', 'aluminum': '알루미늄', 'nickel': '니켈', 'cobalt': '코발트',
  'polyethylene': '폴리에틸렌', 'polysulfone': '폴리설폰', 'rebar': '철근', 'forsterite': '포스터라이트',
  'polycarbonate': '폴리카보네이트', 'polypropylene': '폴리프로필렌', 'polyurethane': '폴리우레탄',
};

// 지정자가 아닌 범용 단어 (무숫자 fallback 에서 제외 — 규격 접두어 포함: 단독으론 식별력 없음)
export const STOP = new Set(['steel', 'tool', 'alloy', 'iron', 'high', 'cast', 'wire', 'grade', 'type', 'plate',
  'stainless', 'carbon', 'structural', 'foam', 'resin', 'rubber', 'polymer', 'composite', 'fiber', 'glass',
  'sheet', 'coated', 'heavy', 'pure', 'hot', 'cold', 'work', 'speed', 'spring', 'bearing', 'strip', 'homopolymer',
  'viscosity', 'rolled', 'homogeneous', 'armor', 'dip', 'mold', 'super',
  'aisi', 'astm', 'asme', 'uns', 'sae', 'jis', 'din', 'jindal', 'api']);

// 원소 화합물명 → 화학식 (스토리가 식으로 표기하는 경우)
export const FORMULA = {
  'tantalumcarbide': 'tac', 'hafniumcarbide': 'hfc', 'hafniumdiboride': 'hfb', 'zirconiumdiboride': 'zrb',
  'titaniumcarbide': 'tic', 'boroncarbide': 'b4c', 'boronnitride': 'bn', 'siliconcarbide': 'sic',
  'siliconnitride': 'si3n4', 'aluminumnitride': 'aln',
};

/** 정규화: 구분자·괄호·%·하이픈 제거 후 소문자. "Ti-6Al-4V" → "ti6al4v". */
export const norm = (s) => s.replace(/[\s‐‑–—―·×,()\/%]/g, '').replace(/-/g, '').toLowerCase();

/** 이름(괄호/대시 이전 base)에서 지정자 토큰 집합 추출. audit-story-names 와 동작 동일. */
export function tokensOf(base) {
  const t = new Set();
  const full = norm(base);
  if (full.length >= 2) t.add(full); // 전체 이름 (EVA·PC-ABS·Onyx 등)
  if (FORMULA[full]) t.add(FORMULA[full]);
  const words = base.split(/[\s\/(),]+/).map((r) => r.replace(/[.,;:~]+$/g, '')).filter(Boolean);
  // 다단어 이름의 첫 대문자 약어 (PC High Viscosity → pc)
  if (words.length >= 2 && /^[A-Z]{2,4}$/.test(words[0]) && !STOP.has(words[0].toLowerCase())) t.add(norm(words[0]));
  words.forEach((w, i) => {
    if (/\d/.test(w)) {
      for (const piece of w.split('-')) { // 하이픈 분해: 2024-T351 → 2024, T351
        if (!/\d/.test(piece)) continue;
        const p = piece.replace(/[^\dA-Za-z.]/g, '');
        if (p.length >= 2) t.add(norm(p));
        const gr = p.match(/^Gr\.?(\d+)$/i); // Gr1 ↔ Grade 1 동치
        if (gr) t.add('grade' + gr[1]);
        const noLead = p.replace(/^[A-Za-z]+/, '');   // SS410 → 410
        if (noLead.length >= 3) t.add(norm(noLead));
        const noTrail = p.replace(/[A-Za-z]+$/, '');  // SD400W → SD400 (숫자 유지 시)
        if (noTrail.length >= 3 && /\d/.test(noTrail)) t.add(norm(noTrail));
      }
      if (w.includes('-')) t.add(norm(w)); // 결합형도 (Ti-6Al-4V → ti6al4v)
      if (i > 0 && !/\d/.test(words[i - 1])) t.add(norm(words[i - 1] + w)); // 인접 쌍: "Grade 7" → grade7
      if (i + 1 < words.length && !/\d/.test(words[i + 1])) t.add(norm(w + words[i + 1])); // "9% Ni" → 9ni
    } else if (w.length >= 3 && !STOP.has(w.toLowerCase())) {
      t.add(norm(w));
    }
  });
  return [...t].filter((tk) => tk && tk.length >= 2);
}

/* ── 아래는 WIKI 전용 (audit 미사용 — audit 동작 불변 보장) ── */

/** 야금 용어·지표 토큰 (합금명/별칭에 섞여 새지만 재료 지정자가 아님 — Phase4 glossary 소관). */
export const TERM_STOP = new Set([
  'pren', 'iacs', 'dbtt', 'scc', 'haz', 'igc', 'esc', 'ksi', 'mpa', 'hrc', 'hbw', 'hrb',
  'wpqr', 'pwht', 'osseointegration', 'passivation', 'sensitization',
]);

/** 쓰레기 surface-form 제거: 시간/온도/퍼센트 파편·순수 1~2자·야금용어. wiki lexicon 정제용. */
export function isJunkForm(f) {
  if (!f || f.length < 2) return true;
  if (/^\d+h$/.test(f)) return true;         // "4h" "16h" (시효 시간)
  if (/^\d+(c|f)$/.test(f)) return true;      // "480c" 온도
  if (/^\d{1,2}$/.test(f)) return true;       // 순수 1~2자 숫자 "30" "12"
  if (TERM_STOP.has(f)) return true;          // 야금 용어(pren·iacs·dbtt…) — 재료 form 아님
  return false;
}

/** 3자 지정자 화이트리스트 (H4f-C) — 검증된 고유·고가치 grade 코드만.
 *  조건: 글자 포함(순숫자 불가)·산문 영어단어와 무충돌·단일 entity 해석(ambiguous 는 어차피 차단).
 *  P91/P92(크리프강)·X-grade(라인파이프)·M-grade(HSS)·A36(구조강)·L80(유정관)·P20(금형강). */
export const SHORT_AUTOLINK_OK = new Set([
  'p91', 'p92', 'x42', 'x52', 'x60', 'x65', 'x70', 'x80', 'm35', 'm42', 'm50', 'a36', 'l80', 'p20', 'h13',
]);

/** autolink 후보 판정(자동 제안 — 이후 수동 검수 대상).
 *  보수적: 길이≥4(화이트리스트 3자 예외) · 알파벳 포함(순수숫자 4150/304 제외 — 단어경계 처리 전까지 명시링크만) · 비-junk · 비-모호.
 *  @param ambiguous  이 form 이 2개 이상 엔티티로 해석되면 true (호출측이 전역 계산해 전달) */
export function suggestAutolink(form, ambiguous) {
  if (ambiguous) return false;
  if (isJunkForm(form)) return false;
  if (form.length < 4 && !SHORT_AUTOLINK_OK.has(form)) return false; // 약어(<4)는 화이트리스트만
  if (form.length > 18) return false; // 설명블롭(>18)은 명시링크만
  if (!/[a-z]/i.test(form)) return false;      // 순수 숫자(4150·304)는 명시링크만 (§A 오탐 방지)
  if (AUTOLINK_STOP.has(form)) return false;   // 원소명·흔한 영어단어·서술어(§D — 산문 상시등장 → 과링크 재앙)
  if (!/[0-9]/.test(form) && GENERIC_WORDS.has(form)) return false; // 설명어 leak (wing·tank·marine…)
  return true;
}

/** autolink 제외 — 산문에 흔히 등장하는 단독 토큰(원소명·일반 영어단어·서술어).
 *  §D "원소기호/명·약어·일반어 기본 false". 재료 지정력이 낮거나 과링크 위험이 큰 form 만.
 *  (합성어 form: castcarbonsteel·pchighviscosity 등은 산문에 그대로 안 나와 자기제한적 → 미포함.) */
export const AUTOLINK_STOP = new Set([
  // 원소명(영문) — 조성 서술에 상시 등장, 순원소 재료로의 링크는 저가치
  'chromium', 'molybdenum', 'manganese', 'niobium', 'vanadium', 'rhenium', 'lithium', 'boron',
  'tungsten', 'tantalum', 'titanium', 'aluminum', 'aluminium', 'magnesium', 'nickel', 'cobalt',
  'copper', 'silicon', 'zirconium', 'hafnium', 'beryllium', 'carbon', 'iron', 'diamond',
  'purechromium', 'purerhenium', 'ethylene', 'terephthalate', 'copolymer',
  // 흔한 영어단어(단독 토큰) — 물성/공정 서술에 상시 등장
  'yield', 'peak', 'cycle', 'depth', 'ratio', 'target', 'spec', 'full', 'more', 'soft', 'rigid',
  'lean', 'single', 'ahead', 'glass', 'gray', 'naval', 'music', 'rail', 'fused', 'woven', 'twill', 'creep',
  'nasa', 'alli', 'density', 'derivative', 'natural', 'section', 'variant', 'crystal', 'cryogenic',
  'electrical', 'russian', 'injection', 'honeycomb', 'strengthened', 'ductile',
  // 일반 서술 접두/복합(산문에 단독 토큰으로 새어나오면 오탐)
  'hightemp', 'mediumcarbon', 'microcarbon', 'maragingsteel', 'superduplex',
]);

/** 스토리 제목/이름에서 새는 설명 단어 (합금 지정자 아님) — autolink 제외 (§D). */
export const GENERIC_WORDS = new Set([
  'variants', 'beam', 'wing', 'tank', 'misc', 'marine', 'line', 'pipe', 'sand', 'inch', 'advanced',
  'extrusion', 'hotstamped', 'usibor', 'wideflange', 'semiaustenitic', 'secondaryhardening',
  'higherc', 'dualphase', 'gastransmission', 'lowinterstitial', 'submarine', 'pressure', 'hull',
  'aerospace', 'blade', 'turbo', 'wheel', 'helicopter', 'transmission', 'railway', 'chamber',
  'abrasion', 'resistant', 'ferritic', 'martensitic', 'austenitic', 'duplex', 'general', 'purpose',
  'grades', 'family', 'class', 'series', 'commercial', 'building', 'welded', 'deformed', 'galvanized',
  'coating', 'coated', 'equivalent', 'equiv', 'typical', 'ternary', 'yellow', 'silver', 'hotdip',
  'deoxidized', 'phosphor', 'nominal', 'modified', 'reinforced', 'toughened', 'stabilized', 'diecast',
]);
