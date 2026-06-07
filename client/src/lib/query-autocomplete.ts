/*
 * R167 Phase B — QueryBar autocomplete logic.
 *
 * 사용자가 입력 중인 query 의 cursor 위치에서, "현재 입력 중인 token" 을 식별하고
 * 적절한 suggestion 을 반환. Pure function — 단위 테스트 가능.
 *
 * Suggestion 종류:
 *   - 'property': property alias 제안 (예: '밀' → '밀도', 'den' → 'density')
 *   - 'operator': property 뒤에 비교 연산자 (`<`, `>`, `<=`, `>=`, `=`, `~`)
 *   - 'value-hint':  operator 뒤에 typical 값 chip (p10/median/p90)
 *   - 'prefix': 'spec:' / 'cat:' / quoted text 같은 special prefix
 */
import { PROP_ALIAS } from './query-dsl';

export interface PropertyStats {
  n: number;
  min: number;
  max: number;
  p10: number;
  median: number;
  p90: number;
}

export interface Suggestion {
  kind: 'property' | 'operator' | 'value-hint' | 'prefix';
  /** 사용자에게 보일 텍스트 (예: '밀도 (ρ, g/cm³)' or '<' or '5') */
  label: string;
  /** 입력에 삽입할 텍스트 (예: '밀도' or '<' or '5') */
  insert: string;
  /** 추가 설명 (단위 / property 의미) */
  detail?: string;
  /** 정렬 우선순위 — 낮을수록 위. 한국어 > 영어 > 그리스 순. */
  priority: number;
}

/** Operator 후보 (property 직후 / autocomplete 의 두 번째 step). */
const OPERATORS: Array<{ op: string; label: string; detail: string }> = [
  { op: '<', label: '< (미만)', detail: 'min < value' },
  { op: '>', label: '> (초과)', detail: 'max > value' },
  { op: '<=', label: '≤ (이하)', detail: 'min ≤ value' },
  { op: '>=', label: '≥ (이상)', detail: 'max ≥ value' },
  { op: '=', label: '= (typical ±10%)', detail: 'typical 부근' },
  { op: '~', label: '~ (typical ±20%)', detail: 'typical 근사' },
];

/** Prefix tokens. */
const PREFIXES = [
  { token: 'spec:', label: 'spec: (표준 spec 매칭)', detail: '예: spec:AMS5662' },
  { token: 'cat:', label: 'cat: (카테고리)', detail: 'metal / polymer / ceramic / composite' },
];

/** Property alias 의 종류 판별 — 정렬 우선순위에 사용. */
function classifyAlias(alias: string): { lang: 'ko' | 'en' | 'greek'; priority: number } {
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(alias)) return { lang: 'ko', priority: 0 }; // 한국어 최우선
  if (/^[a-z][a-z_]*$/i.test(alias)) return { lang: 'en', priority: 1 };   // 영문 보통
  return { lang: 'greek', priority: 2 };                                    // 그리스 (전문가용)
}

/**
 * Cursor 위치에서 현재 입력 중인 token 을 식별.
 * @returns { tokenStart, tokenEnd, token } — tokenStart 는 input 의 절대 위치.
 * 공백·quoted span 안은 token 으로 간주하지 않음.
 */
export function tokenAtCursor(input: string, cursor: number): {
  tokenStart: number;
  tokenEnd: number;
  token: string;
  /** 현재 cursor 가 quoted span 안에 있으면 true → autocomplete 비활성. */
  insideQuote: boolean;
} {
  /* Quoted span 감지: 짝수 번 미만의 따옴표 = 안에 있음. */
  const quoteCount = (input.slice(0, cursor).match(/"/g) || []).length;
  const insideQuote = quoteCount % 2 === 1;

  /* token boundary: 공백·`;` 또는 input 시작/끝. R169 — `;` 도 token boundary. */
  let start = cursor;
  while (start > 0 && !/[\s;]/.test(input[start - 1])) start--;
  let end = cursor;
  while (end < input.length && !/[\s;]/.test(input[end])) end++;
  return { tokenStart: start, tokenEnd: end, token: input.slice(start, end), insideQuote };
}

/**
 * Property alias prefix 매칭 → 제안 목록.
 * 한국어 → 영어 → 그리스 순. 동일 priority 안에서는 alphabetical.
 */
function suggestProperties(prefix: string, limit = 8): Suggestion[] {
  const p = prefix.toLowerCase();
  if (!p) return [];
  const out: Suggestion[] = [];
  const seenKey = new Set<string>();
  for (const [alias, info] of Object.entries(PROP_ALIAS)) {
    if (!alias.toLowerCase().startsWith(p)) continue;
    const { priority } = classifyAlias(alias);
    /* 중복 key 는 한 번만 (priority 낮은 alias 우선). */
    if (seenKey.has(info.key)) continue;
    out.push({
      kind: 'property',
      label: alias + (info.unit ? ` (${info.unit})` : ''),
      insert: alias,
      detail: info.key,
      priority,
    });
  }
  /* 정렬 + 중복 키 제거 (priority 낮은 alias 만 유지). */
  out.sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label));
  /* 중복 키 제거 — 같은 property 의 다른 alias 는 한 줄만 (가장 높은 priority = 한국어 우선). */
  const uniq: Suggestion[] = [];
  for (const s of out) {
    if (seenKey.has(s.detail!)) continue;
    seenKey.add(s.detail!);
    uniq.push(s);
    if (uniq.length >= limit) break;
  }
  return uniq;
}

/** Property name + operator 직후 (`밀도<`) → value-hint chip. */
function suggestValueHints(prop: string, stats: Record<string, PropertyStats> | null): Suggestion[] {
  if (!stats) return [];
  const aliasInfo = PROP_ALIAS[prop.toLowerCase()];
  if (!aliasInfo) return [];
  const propStats = stats[aliasInfo.key];
  if (!propStats) return [];
  const unit = aliasInfo.unit ?? '';
  const fmt = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '');
  return [
    { kind: 'value-hint', label: `${fmt(propStats.p10)}${unit ? ' ' + unit : ''}`, insert: fmt(propStats.p10), detail: '낮은 값 (p10)', priority: 0 },
    { kind: 'value-hint', label: `${fmt(propStats.median)}${unit ? ' ' + unit : ''}`, insert: fmt(propStats.median), detail: '평균 (median)', priority: 1 },
    { kind: 'value-hint', label: `${fmt(propStats.p90)}${unit ? ' ' + unit : ''}`, insert: fmt(propStats.p90), detail: '높은 값 (p90)', priority: 2 },
  ];
}

/** Operator 후보 — property 직후. */
function suggestOperators(): Suggestion[] {
  return OPERATORS.map((o, i) => ({
    kind: 'operator',
    label: o.label,
    insert: o.op,
    detail: o.detail,
    priority: i,
  }));
}

/** Prefix tokens (spec: / cat:). 빈 token 또는 's' / 'c' 같은 한 글자에서 활성. */
function suggestPrefixes(prefix: string): Suggestion[] {
  const p = prefix.toLowerCase();
  return PREFIXES.filter((px) => p === '' || px.token.startsWith(p)).map((px, i) => ({
    kind: 'prefix',
    label: px.label,
    insert: px.token,
    detail: px.detail,
    priority: 10 + i,
  }));
}

/**
 * Top-level suggest function.
 *
 * @param input  전체 query string
 * @param cursor cursor position (input index)
 * @param stats  property typical-value 통계 (없으면 value-hint 생략)
 * @returns 0 ~ N 개의 suggestion
 */
export function suggest(
  input: string,
  cursor: number,
  stats: Record<string, PropertyStats> | null = null,
): Suggestion[] {
  const { token, insideQuote } = tokenAtCursor(input, cursor);
  if (insideQuote) return [];

  /* 빈 input 이면 표시 안 함 (혼란 회피). */
  if (token === '' && input.trim() === '') return [];

  /* Special prefix detection: `s` / `sp` / `spe` / `spec` → spec:  /  `c` / `ca` / `cat` → cat: */
  if (/^(s|sp|spe|spec|c|ca|cat)$/i.test(token)) {
    return suggestPrefixes(token);
  }

  /* operator 가 token 안에 이미 있으면 value-hint 단계.
   *  e.g., '밀도<', '밀도<5' (입력 중 — cursor at end of partial value) */
  const opMatch = token.match(/^([^<>=~]+)(>=|<=|>|<|=|~)(.*)$/);
  if (opMatch) {
    const [, prop, _op, partialValue] = opMatch;
    /* 사용자가 이미 값을 다 적었으면 (숫자) hint 표시 안 함. */
    if (/^\d+(\.\d+)?$/.test(partialValue.trim())) return [];
    return suggestValueHints(prop, stats);
  }

  /* R168 — token 이 PROP_ALIAS 의 exact match → IDE-style operator step 으로 자동 전환.
   *  예: 사용자가 '밀도' 까지 입력 또는 autocomplete 로 '밀도' 채워졌을 때,
   *      Tab/Enter 시 operator (<, >, <=, >=, =, ~) 를 바로 선택 가능.
   *
   *  R168 fix — 1글자 ASCII alias (e/t/k/v/$) 는 더 입력 가능성 → prefix step 유지.
   *  그리스 기호 (ρ/σy/α/E_그리스 등) 와 한국어 (밀도) 는 보통 의도된 완성이므로 exact match 진행.
   *  조건: token 길이 ≥ 2 또는 ASCII 알파벳이 아님 (그리스/한글/$ 등). */
  if (PROP_ALIAS[token.toLowerCase()] && (token.length >= 2 || !/^[a-zA-Z]$/.test(token))) {
    return suggestOperators();
  }

  /* Otherwise = property prefix step. */
  const propSuggestions = suggestProperties(token);
  /* token 이 짧고 (1~2 글자) 특별 prefix 후보가 있을 수도 → 함께 표시. */
  const prefixSuggestions = token.length <= 2 ? suggestPrefixes(token) : [];
  return [...propSuggestions, ...prefixSuggestions].slice(0, 10);
}

/**
 * 사용자가 suggestion 을 선택했을 때, input string 을 어떻게 갱신할지 계산.
 *  - property 선택: 현재 token 을 alias 로 교체 (e.g., '밀' → '밀도')
 *  - operator 선택: 토큰 끝에 operator 를 append (e.g., '밀도' → '밀도<')
 *  - value-hint 선택: 토큰 끝에 값 append (e.g., '밀도<' → '밀도<5 ')
 *  - prefix 선택: 토큰을 prefix 로 교체 (e.g., 's' → 'spec:')
 *
 * @returns { newInput, newCursor } — 새 input 문자열 + 새 cursor 위치.
 */
export function applySuggestion(
  input: string,
  cursor: number,
  suggestion: Suggestion,
): { newInput: string; newCursor: number } {
  const { tokenStart, tokenEnd, token } = tokenAtCursor(input, cursor);
  let replaced: string;
  switch (suggestion.kind) {
    case 'property':
    case 'prefix':
      replaced = suggestion.insert;
      break;
    case 'operator':
      /* token 끝에 operator append (token 자체는 유지). */
      replaced = token + suggestion.insert;
      break;
    case 'value-hint':
      /* R169 — token 뒤에 숫자 + `; ` (세미콜론 + 공백) append. 명확한 시각적 구분. */
      replaced = token + suggestion.insert + '; ';
      break;
  }
  const newInput = input.slice(0, tokenStart) + replaced + input.slice(tokenEnd);
  const newCursor = tokenStart + replaced.length;
  return { newInput, newCursor };
}
