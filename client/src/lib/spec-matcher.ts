/*
 * R144c — Engineering standard spec extractor + classifier.
 *
 * 재료의 name / heat_treatment / sources.label 에서 표준 spec 번호 (AMS, ASTM,
 * ASME, DNV, EN, DIN, JIS, MIL, UNS, API, NACE) 를 추출 → badge 로 표시 + filter.
 *
 * 패턴은 의도적으로 보수적 — false positive 보다 false negative 를 선호.
 * (`AMS 5662` 같은 명확한 spec 만 — `5662` 단독은 거부)
 */

export type SpecOrg = 'AMS' | 'ASTM' | 'ASME' | 'DNV' | 'EN' | 'DIN' | 'JIS' | 'MIL' | 'UNS' | 'API' | 'NACE' | 'OTHER';

export interface SpecRef {
  /** Normalized id, e.g., "AMS 5662", "ASTM A553", "UNS S17400" */
  id: string;
  /** Issuing organization */
  org: SpecOrg;
  /** Optional grade / class — e.g., "Type I" for A553 */
  grade?: string;
  /** Short human-readable description */
  description?: string;
}

/** Spec org → 표준 카테고리 + 색상 (UI badge). */
export const SPEC_ORG_META: Record<SpecOrg, { label: string; color: string; bg: string; description: string }> = {
  AMS: { label: 'AMS', color: '#1d4ed8', bg: '#dbeafe', description: 'SAE Aerospace Material Spec — 항공 재료 표준 (5xxx 강·합금, 4xxx 비철)' },
  ASTM: { label: 'ASTM', color: '#7c2d12', bg: '#fed7aa', description: 'ASTM International — 일반 재료 시험·spec (A 강 · B 비철 · F 의료)' },
  ASME: { label: 'ASME', color: '#7e22ce', bg: '#e9d5ff', description: 'ASME B&PV / B31 — 압력용기·배관 코드' },
  DNV: { label: 'DNV', color: '#0c4a6e', bg: '#bae6fd', description: 'DNV / DNV-GL — 해상·offshore 구조 표준' },
  EN: { label: 'EN', color: '#166534', bg: '#bbf7d0', description: '유럽 EN/CEN — DIN/BS 통합 표준' },
  DIN: { label: 'DIN', color: '#365314', bg: '#d9f99d', description: '독일 산업 표준' },
  JIS: { label: 'JIS', color: '#9f1239', bg: '#fecdd3', description: '일본 산업 표준' },
  MIL: { label: 'MIL', color: '#1e293b', bg: '#cbd5e1', description: '미국 군용 사양 (MIL-STD / MIL-S 등)' },
  UNS: { label: 'UNS', color: '#92400e', bg: '#fde68a', description: 'Unified Numbering System — 합금 통일 번호 (Sxxxxx 스테인리스, Nxxxxx Ni 등)' },
  API: { label: 'API', color: '#075985', bg: '#bae6fd', description: 'American Petroleum Institute — 석유·가스 파이프·기기' },
  NACE: { label: 'NACE', color: '#854d0e', bg: '#fef08a', description: 'AMPP/NACE — 부식 환경 (sour service H₂S 등)' },
  OTHER: { label: 'spec', color: '#475569', bg: '#e2e8f0', description: '기타' },
};

/* 메인 추출 패턴 — 순서 중요 (긴 prefix 먼저). */
const PATTERNS: { rx: RegExp; org: SpecOrg }[] = [
  // Aerospace material spec — AMS 4928, AMS 5662C
  { rx: /\bAMS\s?(\d{3,5}[A-Z]?)\b/gi, org: 'AMS' },
  // ASTM — A553, B265, F75 (with optional /M for metric)
  { rx: /\bASTM\s?([A-Z]\s?\d{1,4}(?:\/?M)?[A-Z]?(?:[-\s]\d{2,4})?)\b/gi, org: 'ASTM' },
  // ASME B&PV / B31 / SA spec — ASME SA-240, ASME B31.3
  { rx: /\bASME\s?((?:SA[-\s]?)?[A-Z]?\d{1,3}(?:\.\d{1,2})?)\b/gi, org: 'ASME' },
  // DNV — DNV-OS-B101, DNVGL-RP-C203
  { rx: /\bDNV(?:GL)?[-\s]?([A-Z]{2,4}[-\s]?[A-Z0-9]+(?:[-\s]?\d{0,4})?)\b/gi, org: 'DNV' },
  // EN — EN 10025, EN 1.4301
  { rx: /\bEN\s?(\d{4,6}(?:[-\s]?\d{1,3})?)\b/gi, org: 'EN' },
  // EN material number — EN 1.4301 (3-4-2 format)
  { rx: /\bEN\s?(\d\.\d{3,4})\b/gi, org: 'EN' },
  // DIN — DIN 1.2344, DIN 17440
  { rx: /\bDIN\s?(\d{1,2}\.\d{3,4})\b/gi, org: 'DIN' },
  { rx: /\bDIN\s?(\d{3,7})\b/gi, org: 'DIN' },
  // JIS — JIS G3101, JIS H4080
  { rx: /\bJIS\s?([A-Z]\s?\d{4})\b/gi, org: 'JIS' },
  // MIL — MIL-S-16216, MIL-STD-810
  { rx: /\bMIL[-\s]?([A-Z]+[-\s]?\d{3,5}[A-Z]?)\b/gi, org: 'MIL' },
  // UNS — S17400, N07718, R56400 (letter + 5 digits)
  { rx: /\bUNS\s?([A-Z]\d{5})\b/gi, org: 'UNS' },
  // API — 5L, 5LC, 6A
  { rx: /\bAPI\s?(\d{1,2}[A-Z]{1,3})\b/gi, org: 'API' },
  // NACE — MR0175, MR0103
  { rx: /\bNACE\s?(MR\s?\d{4})\b/gi, org: 'NACE' },
];

/** Extract all unique specs from a haystack of strings. */
export function extractSpecs(haystacks: (string | undefined | null)[]): SpecRef[] {
  const text = haystacks.filter(Boolean).join(' \n ');
  if (!text) return [];
  const seen = new Map<string, SpecRef>();
  for (const { rx, org } of PATTERNS) {
    rx.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(text))) {
      const fullMatch = m[0].replace(/\s+/g, ' ').trim().toUpperCase();
      const orgPrefix = org;
      // Normalize: collapse multi-space, ensure "ORG NUMBER" form
      const idWithoutOrg = m[1].replace(/\s+/g, ' ').trim().toUpperCase();
      const id = `${orgPrefix} ${idWithoutOrg}`;
      if (!seen.has(id)) seen.set(id, { id, org, description: orgDescription(org, idWithoutOrg) });
    }
  }
  return Array.from(seen.values()).sort((a, b) => {
    // Sort by org priority (AMS first for aerospace, then ASTM, then UNS, etc.)
    const order: SpecOrg[] = ['AMS', 'ASTM', 'ASME', 'DNV', 'API', 'NACE', 'EN', 'DIN', 'JIS', 'MIL', 'UNS', 'OTHER'];
    const oa = order.indexOf(a.org), ob = order.indexOf(b.org);
    if (oa !== ob) return oa - ob;
    return a.id.localeCompare(b.id);
  });
}

/** Per-spec short description heuristic — only for very common specs. */
function orgDescription(org: SpecOrg, idPart: string): string | undefined {
  const key = `${org} ${idPart}`;
  const KNOWN: Record<string, string> = {
    'AMS 5662': 'Inconel 718 bar (precipitation hardened)',
    'AMS 5663': 'Inconel 718 bar (annealed)',
    'AMS 5664': 'Inconel 718 forging (solution treated)',
    'AMS 5666': 'Inconel 625 solution annealed',
    'AMS 5599': 'Inconel 625 sheet/plate',
    'AMS 5643': '17-4 PH bar/forging',
    'AMS 5659': '15-5 PH bar/forging',
    'AMS 5936': 'Custom 465 PH bar',
    'AMS 5754': 'Hastelloy X sheet/plate',
    'AMS 5887': 'Inconel 617',
    'AMS 5891': 'Haynes 230',
    'AMS 6512': 'Maraging 250 bar',
    'AMS 6514': 'Maraging 300 bar',
    'AMS 6520': 'Maraging 350 bar',
    'AMS 6415': 'AISI 4340 bar (Q+T)',
    'AMS 4928': 'Ti-6Al-4V annealed bar/forging',
    'AMS 4965': 'Ti-6Al-4V STA bar',
    'AMS 4117': '7075 T7451 plate',
    'ASTM A36': 'Carbon structural steel',
    'ASTM A240': 'Stainless steel plate (304/316/duplex)',
    'ASTM A276': 'Stainless steel bar',
    'ASTM A553': '9% Ni cryogenic steel (LNG)',
    'ASTM A572': 'HSLA carbon steel (Gr 50/65)',
    'ASTM A588': 'Weathering structural steel (Corten)',
    'ASTM A789': 'Duplex stainless seamless tube',
    'ASTM B265': 'Titanium plate/sheet',
    'ASTM B196': 'BeCu rod/bar (C17200)',
    'ASTM B107': 'Magnesium alloy extruded',
    'ASTM B90': 'Magnesium sheet/plate',
    'ASTM F75': 'CoCrMo cast biomedical implant',
    'ASTM F136': 'Ti-6Al-4V ELI biomedical',
    'ASTM F1537': 'CoCrMo wrought biomedical',
    'ASTM F3001': 'AM Ti-6Al-4V (PBF)',
    'ASTM F3056': 'AM Ni-base superalloy (PBF)',
    'ASTM F3184': 'AM SS 316L (PBF)',
    'ASME SA240': 'Pressure vessel stainless plate',
    'ASME B31.3': 'Process piping code',
    'ASME B16.5': 'Pipe flange dimensional',
    'DNV OS-B101': '해상 metallic material 표준',
    'DNV RP-C203': 'Fatigue design (offshore)',
    'EN 10025': '구조용 강 (S235~S355)',
    'EN 10083': '담금질 + 템퍼링 강 (22MnB5 등)',
    'EN 13674': '레일 강',
    'API 5L': 'Line pipe (gas/oil 송유관)',
    'NACE MR0175': 'Sour service (H₂S 환경) 재료 한도',
    'UNS S17400': '17-4 PH stainless (Cr-Ni-Cu)',
    'UNS S15500': '15-5 PH stainless',
    'UNS S46500': 'Custom 465 PH (Carpenter)',
    'UNS S30400': '304 austenitic SS',
    'UNS S30403': '304L (low-C)',
    'UNS S31600': '316 austenitic SS (Mo)',
    'UNS S31603': '316L (low-C)',
    'UNS S32205': '2205 duplex SS',
    'UNS S32750': '2507 super-duplex SS',
    'UNS S32760': 'ZERON 100 super-duplex',
    'UNS N06002': 'Hastelloy X (Ni-Cr-Mo-Fe)',
    'UNS N06600': 'Inconel 600 (Ni-Cr-Fe)',
    'UNS N06617': 'Inconel 617 (Ni-Cr-Co-Mo)',
    'UNS N06625': 'Inconel 625 (Ni-Cr-Mo-Nb)',
    'UNS N06230': 'Haynes 230 (Ni-Cr-W-Mo)',
    'UNS N07208': 'Haynes 282 (γ\' Ni superalloy)',
    'UNS N07718': 'Inconel 718 (γ" Ni superalloy)',
    'UNS R56400': 'Ti-6Al-4V (Grade 5)',
    'UNS R56407': 'Ti-6Al-4V ELI (Grade 23)',
    'UNS R30006': 'Stellite 6 (Co-Cr-W wear)',
    'UNS K92890': 'Maraging 250 (18Ni-Co)',
    'UNS K93120': 'Maraging 300 (18Ni-Co-Mo)',
    'UNS C17200': 'BeCu (CuBe2)',
  };
  return KNOWN[key];
}

/** Quick check whether a material's name matches a spec query (case-insensitive). */
export function specMatches(specs: SpecRef[] | undefined, query: string): boolean {
  if (!specs || !specs.length || !query) return false;
  const q = query.trim().toUpperCase().replace(/\s+/g, ' ');
  for (const s of specs) {
    if (s.id.includes(q)) return true;
    // Match "S17400" against "UNS S17400"
    if (s.id.split(' ').slice(1).join(' ') === q) return true;
  }
  return false;
}
