/*
 * R144b — Multi-constraint query DSL (simple, AND-only).
 *
 * 한 줄 입력으로 multi-property filter — e.g.:
 *   σy>500 ρ<5 T>300
 *   yield>1000 density<8 service>500 kic>50
 *   "ti-6al-4v" σy>900 cost<200      ← name fragment + numeric constraints 혼합
 *   spec:AMS5662                     ← spec filter
 *
 * 지원 token (대소문자 무관):
 *   σy / yield / ys                  → yield_strength (MPa)
 *   uts / σu / tensile               → uts (MPa)
 *   ρ / density / rho                → density (g/cm³)
 *   E / modulus                      → modulus (GPa)
 *   el / elongation                  → elongation (%)
 *   hv / hardness                    → hardness (HV)
 *   kic / fracture / k1c             → fracture_toughness (MPa√m)
 *   σf / fatigue                     → fatigue_strength (MPa)
 *   impact / charpy                  → impact_strength (J)
 *   k / tc / thermal                 → thermal_conductivity (W/m·K)
 *   α / cte / expansion              → thermal_expansion (10⁻⁶/K)
 *   T / temp / service / tmax        → max_service_temp (°C)
 *   cp / specific_heat               → specific_heat (J/kg·K)
 *   v / poisson                      → poisson_ratio
 *   tmelt / melt                     → melting_point (°C)
 *   $ / price / cost                 → price_per_kg (USD/kg)
 *
 *   spec:AMS5662 또는 spec:UNS S17400  → specs[] 매칭
 *   cat:metal / cat:polymer / cat:ceramic / cat:composite → category
 *   "name fragment" 또는 그냥 (대소문자 무관) name 단어 → free-text 매칭
 */
import type { Material } from './materials';

type Op = '>' | '<' | '>=' | '<=' | '=' | '~';

interface NumericConstraint {
  prop: string;
  op: Op;
  value: number;
}

interface SpecConstraint {
  kind: 'spec';
  query: string;
}

interface CategoryConstraint {
  kind: 'category';
  value: string;
}

interface TextConstraint {
  kind: 'text';
  query: string;
}

type Constraint = NumericConstraint | SpecConstraint | CategoryConstraint | TextConstraint;

/** Property alias → canonical (ranges 키 + 단위 hint). R167 Phase B — autocomplete 가 활용. */
export const PROP_ALIAS: Record<string, { key: string; unit?: string }> = {
  σy: { key: 'yield_strength', unit: 'MPa' },
  yield: { key: 'yield_strength', unit: 'MPa' },
  ys: { key: 'yield_strength', unit: 'MPa' },
  uts: { key: 'uts', unit: 'MPa' },
  σu: { key: 'uts', unit: 'MPa' },
  tensile: { key: 'uts', unit: 'MPa' },
  ρ: { key: 'density', unit: 'g/cm³' },
  rho: { key: 'density', unit: 'g/cm³' },
  density: { key: 'density', unit: 'g/cm³' },
  e: { key: 'modulus', unit: 'GPa' },
  modulus: { key: 'modulus', unit: 'GPa' },
  el: { key: 'elongation', unit: '%' },
  elongation: { key: 'elongation', unit: '%' },
  hv: { key: 'hardness', unit: 'HV' },
  hardness: { key: 'hardness', unit: 'HV' },
  kic: { key: 'fracture_toughness', unit: 'MPa·√m' },
  fracture: { key: 'fracture_toughness', unit: 'MPa·√m' },
  k1c: { key: 'fracture_toughness', unit: 'MPa·√m' },
  σf: { key: 'fatigue_strength', unit: 'MPa' },
  fatigue: { key: 'fatigue_strength', unit: 'MPa' },
  impact: { key: 'impact_strength', unit: 'J' },
  charpy: { key: 'impact_strength', unit: 'J' },
  k: { key: 'thermal_conductivity', unit: 'W/m·K' },
  tc: { key: 'thermal_conductivity', unit: 'W/m·K' },
  thermal: { key: 'thermal_conductivity', unit: 'W/m·K' },
  α: { key: 'thermal_expansion', unit: '10⁻⁶/K' },
  cte: { key: 'thermal_expansion', unit: '10⁻⁶/K' },
  expansion: { key: 'thermal_expansion', unit: '10⁻⁶/K' },
  t: { key: 'max_service_temp', unit: '°C' },
  temp: { key: 'max_service_temp', unit: '°C' },
  service: { key: 'max_service_temp', unit: '°C' },
  tmax: { key: 'max_service_temp', unit: '°C' },
  cp: { key: 'specific_heat', unit: 'J/kg·K' },
  specific_heat: { key: 'specific_heat', unit: 'J/kg·K' },
  v: { key: 'poisson_ratio' },
  poisson: { key: 'poisson_ratio' },
  tmelt: { key: 'melting_point', unit: '°C' },
  melt: { key: 'melting_point', unit: '°C' },
  $: { key: 'price_per_kg', unit: 'USD/kg' },
  price: { key: 'price_per_kg', unit: 'USD/kg' },
  cost: { key: 'price_per_kg', unit: 'USD/kg' },
  /* R167 Phase A — 한국어 별칭. PROP_ALIAS key 매칭은 소문자 normalize 후 진행되지만
   *   한국어는 case 없음 → key 그대로 한글. parser 가 `propRaw = token.toLowerCase()` 한 결과를
   *   조회. 한글은 toLowerCase 영향 없음. */
  항복: { key: 'yield_strength', unit: 'MPa' },
  항복강도: { key: 'yield_strength', unit: 'MPa' },
  인장: { key: 'uts', unit: 'MPa' },
  인장강도: { key: 'uts', unit: 'MPa' },
  밀도: { key: 'density', unit: 'g/cm³' },
  탄성: { key: 'modulus', unit: 'GPa' },
  탄성률: { key: 'modulus', unit: 'GPa' },
  영률: { key: 'modulus', unit: 'GPa' },
  연신: { key: 'elongation', unit: '%' },
  연신율: { key: 'elongation', unit: '%' },
  경도: { key: 'hardness', unit: 'HV' },
  파괴인성: { key: 'fracture_toughness', unit: 'MPa·√m' },
  인성: { key: 'fracture_toughness', unit: 'MPa·√m' },
  피로: { key: 'fatigue_strength', unit: 'MPa' },
  피로한도: { key: 'fatigue_strength', unit: 'MPa' },
  충격: { key: 'impact_strength', unit: 'J' },
  열전도: { key: 'thermal_conductivity', unit: 'W/m·K' },
  열전도도: { key: 'thermal_conductivity', unit: 'W/m·K' },
  열팽창: { key: 'thermal_expansion', unit: '10⁻⁶/K' },
  팽창: { key: 'thermal_expansion', unit: '10⁻⁶/K' },
  온도: { key: 'max_service_temp', unit: '°C' },
  사용온도: { key: 'max_service_temp', unit: '°C' },
  최대온도: { key: 'max_service_temp', unit: '°C' },
  비열: { key: 'specific_heat', unit: 'J/kg·K' },
  푸아송: { key: 'poisson_ratio' },
  푸아송비: { key: 'poisson_ratio' },
  융점: { key: 'melting_point', unit: '°C' },
  녹는점: { key: 'melting_point', unit: '°C' },
  용융점: { key: 'melting_point', unit: '°C' },
  가격: { key: 'price_per_kg', unit: 'USD/kg' },
  단가: { key: 'price_per_kg', unit: 'USD/kg' },
  비용: { key: 'price_per_kg', unit: 'USD/kg' },
};

export interface ParsedQuery {
  constraints: Constraint[];
  raw: string;
  /** Tokens we couldn't parse — feedback to user. */
  unknown: string[];
}

/**
 * Tokenize the query string. Quoted strings are single tokens.
 * R169 — `;` 와 공백 둘 다 token boundary 로 인식. `;` 이 더 명확한 시각적 구분자.
 * Examples:
 *   "ti-6al-4v" σy>500    →  ['"ti-6al-4v"', 'σy>500']
 *   밀도<8;항복>500       →  ['밀도<8', '항복>500']
 *   spec:AMS 5662         →  ['spec:AMS', '5662']  ← spec: prefix handled in parser
 */
function tokenize(s: string): string[] {
  const tokens: string[] = [];
  /* `;` 또는 공백 둘 다 구분자. quoted span 은 single token. */
  const re = /"([^"]*)"|([^;\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) tokens.push(m[1] !== undefined ? `"${m[1]}"` : m[2]);
  return tokens;
}

/** Parse `prop OP value` (e.g., "σy>=500", "cost<20", "density~5"). */
function parseNumericConstraint(token: string): NumericConstraint | null {
  // Match prop, op, number
  const m = token.match(/^([^<>=~]+)(>=|<=|>|<|=|~)([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)$/);
  if (!m) return null;
  const propRaw = m[1].toLowerCase();
  const op = m[2] as Op;
  const value = parseFloat(m[3]);
  if (!Number.isFinite(value)) return null;
  const alias = PROP_ALIAS[propRaw];
  if (!alias) return null;
  return { prop: alias.key, op, value };
}

/* R167 Phase A — 자연어 한국어 비교 표현 → DSL 형태 정규화.
 *   "밀도 8 미만"   → "밀도<8"
 *   "항복 500 이상" → "항복>=500"
 *   "온도 300 초과" → "온도>300"
 *   "단가 50 이내"  → "단가<=50"
 *   "경도 200 이하" → "경도<=200"
 *
 * Tokenize 전에 input 문자열에 적용 → 기존 parser 로직은 변경 없음.
 * Quoted (`"…"`) 부분 안은 보존: regex 가 따옴표 안을 매칭하지 않도록 후처리는 quote-aware.
 */
const KOREAN_COMPARATOR_MAP: Record<string, string> = {
  미만: '<',
  이하: '<=',
  이상: '>=',
  초과: '>',
  이내: '<=',
};
function preprocessKoreanComparators(input: string): string {
  /* Quoted span 보호 — quoted 부분을 placeholder 로 치환 → 변환 → 복원. */
  const quoted: string[] = [];
  let withPlaceholders = input.replace(/"([^"]*)"/g, (_, inner) => {
    const idx = quoted.length;
    quoted.push(inner);
    return `__QQ${idx}__`;
  });
  /* `<token> <number> <korean op>` 매칭. token 은 한글/영문/그리스 (operator chars 제외). */
  withPlaceholders = withPlaceholders.replace(
    /([^\s;<>=~"]+)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+(미만|이하|이상|초과|이내)/g,
    (_, prop, num, korOp) => `${prop}${KOREAN_COMPARATOR_MAP[korOp]}${num}`,
  );
  /* Placeholder 복원. */
  return withPlaceholders.replace(/__QQ(\d+)__/g, (_, idx) => `"${quoted[parseInt(idx, 10)]}"`);
}

export function parseQuery(input: string): ParsedQuery {
  const constraints: Constraint[] = [];
  const unknown: string[] = [];
  if (!input || !input.trim()) return { constraints, raw: input, unknown };

  /* R167 Phase A — 한국어 자연어 비교어 정규화. */
  const normalizedInput = preprocessKoreanComparators(input);
  const tokens = tokenize(normalizedInput);
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];

    // Quoted phrase → text
    if (t.startsWith('"') && t.endsWith('"')) {
      const inner = t.slice(1, -1).trim();
      if (inner) constraints.push({ kind: 'text', query: inner });
      i++;
      continue;
    }

    // spec:VALUE or spec:VALUE WITH SPACES (greedy: consume until next operator-like token or space)
    if (/^spec:/i.test(t)) {
      const val = t.slice(5).trim();
      if (val) constraints.push({ kind: 'spec', query: val });
      i++;
      continue;
    }
    if (/^cat:/i.test(t)) {
      const val = t.slice(4).trim().toLowerCase();
      if (val) constraints.push({ kind: 'category', value: val });
      i++;
      continue;
    }

    // Numeric constraint
    const nc = parseNumericConstraint(t);
    if (nc) {
      constraints.push(nc);
      i++;
      continue;
    }

    // Otherwise treat as free-text fragment (single word OK for fuzzy name match)
    if (/^[a-zA-Z0-9가-힣\-]/.test(t) && t.length >= 2) {
      constraints.push({ kind: 'text', query: t });
    } else {
      unknown.push(t);
    }
    i++;
  }
  return { constraints, raw: input, unknown };
}

/* ───────── Matching ───────── */
/* R157 — `as unknown as` 우회 marker 제거: Material.ranges 의 PropertyRange type 사용. */

function getNumericProp(m: Material, key: string): number | null {
  const r = m.ranges?.[key];
  if (!r) return null;
  if (typeof r.typical === 'number') return r.typical;
  if (typeof r.min === 'number' && typeof r.max === 'number') return (r.min + r.max) / 2;
  if (typeof r.min === 'number') return r.min;
  if (typeof r.max === 'number') return r.max;
  return null;
}

function matchNumeric(value: number, op: Op, target: number, key: string, m: Material): boolean {
  // For range-typed properties, "<" should check against MIN (most permissive) — material's minimum
  // value must be < target — vs default which uses typical.
  // We use a smarter check: any range value can satisfy the constraint.
  const r = m.ranges?.[key];
  const minV = r?.min ?? value, maxV = r?.max ?? value, typV = r?.typical ?? value;
  switch (op) {
    case '>': return maxV > target;          // max can exceed
    case '>=': return maxV >= target;
    case '<': return minV < target;           // min can be below
    case '<=': return minV <= target;
    case '=': return typV >= target * 0.9 && typV <= target * 1.1;  // ±10%
    case '~': return typV >= target * 0.8 && typV <= target * 1.2;  // ±20% fuzzy
  }
}

function matchText(m: Material, q: string): boolean {
  const lc = q.toLowerCase();
  const haystack = [
    m.name,
    ...(m.aliases || []),
    m.subcategory,
    m.heat_treatment,
    m.industry_note,
    ...(m.processes || []),
    ...(m.manufacturers || []),
    ...(((m.meta as { applications?: string[] | string })?.applications) ? (
      Array.isArray((m.meta as { applications?: string[] | string }).applications)
        ? (m.meta as { applications: string[] }).applications
        : [(m.meta as { applications: string }).applications]
    ) : []),
    ...(m.composition ? Object.keys(m.composition) : []),
  ].filter(Boolean).join(' ').toLowerCase();
  if (haystack.includes(lc)) return true;
  // Try collapsed (no separators)
  const cleanHs = haystack.replace(/[-\s./_]/g, '');
  const cleanQ = lc.replace(/[-\s./_]/g, '');
  if (cleanQ.length >= 2 && cleanHs.includes(cleanQ)) return true;
  return false;
}

function matchSpec(m: Material, q: string): boolean {
  const specs = (m.meta as { specs?: Array<{ id: string; org: string }> })?.specs;
  if (!specs?.length) return false;
  const qn = q.trim().toUpperCase().replace(/\s+/g, ' ');
  return specs.some(s => {
    if (s.id.replace(/\s+/g, '').includes(qn.replace(/\s+/g, ''))) return true;
    if (s.id.includes(qn)) return true;
    return false;
  });
}

/** Apply parsed query to a list of materials (AND semantics). */
export function applyQuery(materials: Material[], parsed: ParsedQuery): Material[] {
  if (!parsed.constraints.length) return materials;
  return materials.filter(m => {
    for (const c of parsed.constraints) {
      if ('kind' in c && c.kind === 'text') {
        if (!matchText(m, c.query)) return false;
      } else if ('kind' in c && c.kind === 'spec') {
        if (!matchSpec(m, c.query)) return false;
      } else if ('kind' in c && c.kind === 'category') {
        if ((m.category || '').toLowerCase() !== c.value.toLowerCase()) return false;
      } else if (!('kind' in c)) {
        const v = getNumericProp(m, c.prop);
        if (v == null) return false;
        if (!matchNumeric(v, c.op, c.value, c.prop, m)) return false;
      }
    }
    return true;
  });
}

/** Human-readable description of a parsed query — for badge/chip UI. */
export function describeConstraint(c: Constraint): string {
  if ('kind' in c) {
    switch (c.kind) {
      case 'text': return `"${c.query}"`;
      case 'spec': return `spec ${c.query}`;
      case 'category': return `cat ${c.value}`;
    }
  }
  const aliasEntry = Object.entries(PROP_ALIAS).find(([_, v]) => v.key === c.prop);
  const label = aliasEntry ? aliasEntry[0] : c.prop;
  const unit = aliasEntry?.[1].unit ?? '';
  return `${label}${c.op}${c.value}${unit ? ' ' + unit : ''}`;
}

/** Common property aliases for autocomplete / help. */
export const QUERY_HELP_EXAMPLES = [
  'σy>500 ρ<8',
  'yield>1000 fatigue>300',
  'cost<20 T>400',
  '"Ti-6Al-4V"',
  'spec:AMS5662',
  'cat:metal kic>50',
];

export const QUERY_HELP_PROPS: Array<{ token: string; means: string; unit?: string }> = [
  /* R167 Phase A — 한국어 별칭도 token 컬럼에 함께 표시. */
  { token: 'σy / yield / 항복', means: '항복강도', unit: 'MPa' },
  { token: 'uts / tensile / 인장', means: '인장강도', unit: 'MPa' },
  { token: 'ρ / density / 밀도', means: '밀도', unit: 'g/cm³' },
  { token: 'E / modulus / 탄성', means: '탄성률 / 영률', unit: 'GPa' },
  { token: 'el / elongation / 연신', means: '연신율', unit: '%' },
  { token: 'hv / hardness / 경도', means: '경도', unit: 'HV' },
  { token: 'kic / fracture / 인성', means: '파괴인성', unit: 'MPa·√m' },
  { token: 'σf / fatigue / 피로', means: '피로한도', unit: 'MPa' },
  { token: 'impact / charpy / 충격', means: '충격', unit: 'J' },
  { token: 'T / tmax / 온도', means: '사용 온도', unit: '°C' },
  { token: 'α / cte / 열팽창', means: '열팽창', unit: '10⁻⁶/K' },
  { token: 'k / thermal / 열전도', means: '열전도', unit: 'W/m·K' },
  { token: '$ / cost / 단가', means: '가격', unit: 'USD/kg' },
  { token: 'spec:XXX', means: 'spec (AMS / ASTM / UNS …)' },
  { token: 'cat:XXX', means: 'metal / polymer / ceramic / composite' },
];

/* R167 Phase A — 자연어 비교 표현 예시. QueryBar help popover 에서 노출 가능. */
export const QUERY_HELP_NATURAL_EXAMPLES = [
  '밀도 8 미만',
  '항복 500 이상',
  '온도 300 초과',
  '단가 50 이내',
  '경도 200 이하',
];
