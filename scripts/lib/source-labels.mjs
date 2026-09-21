/*
 * R226e — 출처 라벨 도출 공유 모듈 (build-from-registry presentation, C1).
 *
 * placeholder 라벨("Datasheet N"·"MatWeb N", URL 은 실재) → URL 도메인 기반 서술 라벨.
 * url 필드에 표준 인용(비-http 텍스트)이 든 경우 그 텍스트를 라벨로 승격(+ 가짜 url 제거).
 * 값 SSOT(레지스트리)는 불변 — presentation 도출.
 */
export const PUBLISHER = {
  'matweb.com': 'MatWeb datasheet', 'poongsan.co.kr': 'Poongsan datasheet', 'hyundai-steel.com': 'Hyundai Steel datasheet',
  'aksteel.com': 'AK Steel (Cleveland-Cliffs) datasheet', 'carpentertechnology.com': 'Carpenter Technology datasheet',
  'store.astm.org': 'ASTM standard', 'haynesintl.com': 'Haynes International datasheet', 'plansee.com': 'Plansee datasheet',
  'outokumpu.com': 'Outokumpu datasheet', 'specialmetals.com': 'Special Metals datasheet', 'product.posco.com': 'POSCO datasheet',
  'aluminum.org': 'Aluminum Association', 'en-standard.eu': 'EN standard', 'api.org': 'API standard', 'batelle.org': 'Battelle / MMPDS',
  'uddeholm.com': 'Uddeholm datasheet', 'bohler.uddeholm.com': 'Böhler-Uddeholm datasheet', 'kaiseraluminum.com': 'Kaiser Aluminum datasheet',
  'alcoa.com': 'Alcoa datasheet', 'ssab.com': 'SSAB datasheet', 'ntrs.nasa.gov': 'NASA technical report', 'nasa.gov': 'NASA technical report',
  'aisc.org': 'AISC steel construction', 'azom.com': 'AZoM materials', 'everyspec.com': 'EverySpec (MIL-SPEC)', 'eccc-creep.com': 'ECCC creep data',
  'crucible.com': 'Crucible Industries datasheet', 'celanese.com': 'Celanese datasheet', 'worldautosteel.org': 'WorldAutoSteel (AHSS)',
  'jisc.go.jp': 'JIS standard', 'spsfasteners.com': 'SPS Technologies', 'energy-steel.com': 'Energy Steel', 'additive.oerlikon.com': 'Oerlikon AM datasheet',
  'automotive.arcelormittal.com': 'ArcelorMittal datasheet', 'ww2.eagle.org': 'ABS (Bureau of Shipping)', 'kssa.co.kr': 'Korea steel datasheet',
  'rohacell.com': 'Rohacell (Evonik) datasheet', 'constellium.com': 'Constellium datasheet', 'portlandbolt.com': 'Portland Bolt',
  'copper.org': 'Copper Development Association', 'bgh.de': 'BGH Edelstahl datasheet', 'asme.org': 'ASME standard', 'nipponsteel.com': 'Nippon Steel datasheet',
  'leecosteel.com': 'Leeco Steel', 'daido.co.jp': 'Daido Steel datasheet', 'vestamid.com': 'VESTAMID (Evonik) datasheet', 'plastics-rubber.basf.com': 'BASF datasheet',
  'metalsusa.com': 'Metals USA', 'hightempmetals.com': 'High Temp Metals', 'octalmetals.com': 'Octal Metals', 'kist.re.kr': 'KIST',
  'rolledalloys.com': 'Rolled Alloys', 'alleghenytechnologies.com': 'ATI datasheet', 'timetal.com': 'TIMET datasheet',
};

/** placeholder("Datasheet N"/"MatWeb N") 라벨만 도메인 서술 라벨로 승격. 그 외는 원본 그대로 반환(동일 참조). */
export function improveLabel(s) {
  if (!/^(Datasheet|MatWeb) \d+$/.test(s.label || '')) return s;
  const url = s.url || '';
  if (!/^https?:/i.test(url)) return url ? { ...s, label: url, url: undefined } : s;   // url 이 비-http 인용 → 라벨로 승격
  const dom = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  return { ...s, label: PUBLISHER[dom] || `${dom} datasheet` };
}

/*
 * R226e/D3 — 출처 권위 등급 도출. 신뢰도: standard > handbook > manufacturer > aggregator > other.
 * URL 도메인·라벨 토큰으로 분류(값 SSOT 불변, presentation). UI 가 provenance 품질 표기·정렬에 활용.
 */
/* G3-3/W2-9 — 제조사·기관 명칭 사전. URL 이 없어 'other' 로 강등되던 실제 vendor/협회/기관 출처를
 *   라벨 토큰으로 승격 (표시 계층만 — 값 SSOT 불변). 근거: 감사 G3-3 (other 1098 중 264 오분류). */
const MANUFACTURER_TOKENS = /\bHaynes\b|\bEOS\b|\bATI\b|Allegheny|\bPlansee\b|\bSSAB\b|ArcelorMittal|Special Metals|Carpenter|Uddeholm|B[öo]hler|\bDaido\b|Kennametal|Sandvik|Crucible|Evonik|ROHACELL|VESTAMID|\bBASF\b|Celanese|Solvay|Victrex|Arkema|Chemours|Covestro|\bSABIC\b|LyondellBasell|Constellium|Arconic|\bAlcoa\b|Kaiser Aluminum|APWorks|Materion|Wieland|Poongsan|POSCO|Hyundai Steel|Nippon Steel|\bDSM\b|Stanyl|Dyneema|\bSPS\b|Nikon SLM|Renishaw|GE Additive|Velo3D|Markforged|Stratasys|3D Systems|Oerlikon|TIMET|Timetal|Rolled Alloys|Elgiloy|Cannon-Muskegon|Magnesium Elektron|\bAMS \d|\bNiagara\b|\bDuPont\b|Parker|Schott|R[öo]hm|Eastman|Ingevity|NatureWorks|Danimer|CoorsTek|CeramTec|Kyocera|Element Six|Ansys Granta|\(AM vendor datasheet\)|vendor datasheet|Product Information|Brochure|Technical Data Sheet|\bTDS\b|\bMDS\b/i;
/* H6 W2 리뷰 — 약어 표기(`Aluminum Assoc.`)도 같은 협회다. 전체 명칭만 받으면 조용히 other 로 떨어진다.
 * 재점검 — 같은 함정이 제조사 쪽에도 남아 있었다. 사전이 `SPS Technologies` 전체 명칭만 갖고 있어
 * `SPS — MP159` 표기가, `DSM`(Stanyl·Dyneema 브랜드 보유)은 아예 없어서 other 로 떨어졌다.
 * 코퍼스 전수 확인: DSM/SPS 를 포함한 라벨 5종은 모두 이 제조사들이다(오탐 없음). */
const INSTITUTION_TOKENS = /Aluminum Assoc|Copper Development|\bCDA\b|\bIMOA\b|WorldAutoSteel|\bAISC\b|\bAWS\b|\bNACE\b|\bAMPP\b|\bIACS\b|\bABS\b \(|\bDNV\b|Lloyd|\bKIST\b|\bFAA\b|\bDOT\/FAA|\bNIST\b|\bEPRI\b|\bTMS\b|Superalloys \d{4}/i;
const AUTH = {
  standard: { dom: /store\.astm\.org|asme\.org|sae\.org|jisc\.go\.jp|en-standard\.eu|api\.org|aisc\.org|everyspec\.com|dinmedia\.de|beuth\.de/i,
              lbl: /\bASTM\b|\bASME\b|\bSAE\b|\bJIS\b|\bEN ?\d|\bISO\b|\bMIL-|\bAMS \d|\bMMPDS\b|\bAPI \d|\bDIN\b|\bAAR\b|\bUNS\b|\bKS [A-Z] \d/i },
  /* H6 W2 리뷰 — `\bASM\b` 단독 토큰 추가. "ASM — Niobium C-103" 처럼 Handbook/Desk 를 안 붙인 인용이
     30건 other 로 남아 있었다(ASM 은 핸드북 발행처이므로 handbook 이 맞다).
     ASME 는 위 standard 검사가 먼저 잡고, `\bASM\b` 는 단어경계라 ASME 에 걸리지 않는다. */
  /* AUD (2026-09-22) — 동료심사 학술지(MDPI·Elsevier·Springer·Wiley·Nature·T&F·IEEE·doi.org)는 핸드북 등급 —
     제조사 문서도 규격도 아닌 1차 측정 문헌. B4C-Al 논문 인용이 'manufacturer' 로 떨어지던 것을 바로잡는다. */
  handbook: { dom: /asminternational\.org|batelle\.org|ntrs\.nasa\.gov|nasa\.gov|eccc-creep\.com|mdpi\.com|doi\.org|sciencedirect\.com|springer\.com|link\.springer|wiley\.com|nature\.com|tandfonline\.com|ieeexplore/i,
              lbl: /\bASM\b|MMPDS|Battelle|NASA|ECCC|\bhandbook\b|Shigley|Outokumpu Corrosion Handbook|\bet al\.|Appl\. Sci\.|\bJ\. [A-Z]|Journal of|Proceedings/i },
  aggregator: { dom: /matweb\.com|azom\.com|makeitfrom\.com|lookpolymers|specialchem|ulprospector|wikipedia|steelnumber\.com|matmatch\.com|totalmateria|efunda\.com/i,
                lbl: /MatWeb|AZoM|MakeItFrom|Wikipedia|QuickText|eFunda|steelnumber/i },
};
/* AUD F12 (2026-09-22) — 라벨 첫머리가 규격 번호(ASTM A240 …)면 그 문서는 규격이다. 라벨 어딘가에 UNS/AMS 가 *언급*된 것과 다르다. */
const STANDARD_LEAD = /^\s*(?:ASTM|ASME|SAE|AMS\s?\d|JIS|EN\s?\d|ISO\s?\d|DIN|MIL-|API\s?\d|AAR|KS\s?[A-Z]\s?\d|UNS\s+[A-Z]\d|MMPDS)/i;
/**
 * 출처 권위 등급: 'standard' | 'handbook' | 'manufacturer' | 'aggregator' | 'other'.
 *
 * AUD F12 (2026-09-22) — **발행처가 등급을 정한다.** 이전엔 라벨 토큰(`UNS`·`AMS \d`·`ASTM`)이 도메인보다 먼저 검사돼
 * "AK Steel — 410 Stainless (UNS S41000)" 같은 제조사 datasheet 48건이 'standard' 로 올라갔다. URL 이 있으면 도메인이
 * 발행처(표준기구/핸드북/aggregator/그 외=제조사)이고, URL 이 없을 때만 라벨을 읽되 제조사 명칭이 있으면 규격 인용이
 * 딸려 있어도 제조사 문서로 본다(규격 번호로 **시작**하는 라벨만 규격; MMPDS 로 시작하면 핸드북).
 */
export function sourceAuthority(s) {
  const url = s.url || '', lbl = s.label || '';
  if (/\bfallback\b|estimated|derived|baseline/i.test(lbl)) return 'other';   // 파생값 provenance 마커 (표준 아님)
  if (/^https?:\/\//i.test(url)) {
    if (AUTH.standard.dom.test(url)) return 'standard';
    if (AUTH.handbook.dom.test(url)) return 'handbook';
    if (AUTH.aggregator.dom.test(url)) return 'aggregator';
    return 'manufacturer';   // 그 외 실 URL = 벤더 datasheet (라벨이 규격을 인용해도 문서 자체는 제조사 것)
  }
  if (/^\s*MMPDS/i.test(lbl)) return 'handbook';
  if (STANDARD_LEAD.test(lbl)) return 'standard';
  if (AUTH.aggregator.lbl.test(lbl)) return 'aggregator';
  if (MANUFACTURER_TOKENS.test(lbl)) return 'manufacturer';
  if (AUTH.standard.lbl.test(lbl)) return 'standard';
  if (AUTH.handbook.lbl.test(lbl)) return 'handbook';
  // G3-3/W2-9 — URL 이 없어도 라벨이 실제 기관 인용이면 승격 (파생 마커는 위에서 이미 other 확정)
  if (INSTITUTION_TOKENS.test(lbl)) return 'handbook';    // 협회·기관 기술자료
  return 'other';   // url 없는 일반 인용·fallback (정직한 파생 마커 포함)
}
