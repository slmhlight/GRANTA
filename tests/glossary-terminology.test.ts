/*
 * R227/E14/H4f — §3.1 용어 표기 게이트 (재발 방지).
 *
 * 규칙(GLOSSARY-IMPROVEMENT-PLAN §3.1, 사용자 확정): 열처리·야금 전문어는 영어 원문이
 * 기본 표기, 한글은 병기 괄호 안에서만. 이 게이트는 글로서리 문서·short 정의에서
 * "standalone 한글 HT 용어"(= 앞뒤가 한글이 아닌 독립 사용)를 찾아, 직전 40자 안에
 * 영어 동의어가 없으면(병기가 아니면) 실패시킨다.
 *
 * 통과하는 것: "Quenching(담금질)" · "(Quenching, 담금질)" 병기, 자연시효·재시효·
 * 시효경화·질화물·뜨임취성 같은 복합어(한글 경계), "예민화된·담금질했을" 동사 활용.
 * 잡는 것: "480 °C 용체화 →" · "H900 등 시효" 처럼 병기 없이 남은 한글 전문어.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const articles = JSON.parse(readFileSync(resolve(ROOT, 'data/glossary-articles.json'), 'utf8')).articles as Record<
  string,
  { sections: Array<{ heading: string; body: string; table?: { headers: string[]; rows: string[][] } }> }
>;
const glossary = JSON.parse(readFileSync(resolve(ROOT, 'data/glossary.json'), 'utf8')).terms as Record<
  string,
  { short: string }
>;

/** §3.1 확정 대응표 (+ 음역어). [한글폼, 영어표준] — 긴 폼 우선. */
const TERMS: Array<[string, string]> = [
  ['오스테나이트화', 'Austenitizing'],
  ['노멀라이징', 'Normalizing'],
  ['용체화 처리', 'Solution treatment'],
  ['용체화처리', 'Solution treatment'],
  ['오스템퍼링', 'Austempering'],
  ['마르퀜칭', 'Martempering'],
  ['마템퍼링', 'Martempering'],
  ['서브제로', 'Sub-zero'],
  ['적열경도', 'Red hardness'],
  ['응력제거', 'Stress relief'],
  ['용체화', 'Solution treatment'],
  ['어닐링', 'Annealing'],
  ['템퍼링', 'Tempering'],
  ['경화능', 'Hardenability'],
  ['예민화', 'Sensitization'],
  ['담금질', 'Quenching'],
  ['침탄', 'Carburizing'],
  ['질화', 'Nitriding'],
  ['뜨임', 'Tempering'],
  ['풀림', 'Annealing'],
  ['불림', 'Normalizing'],
  ['시효', 'Aging'],
];

const JOSA = [
  '이라는', '라는', '이라도', '라도', '이라고', '라고', '으로는', '로는', '으로도', '로도',
  '으로써', '로써', '으로의', '로의', '이란', '란', '이라', '라', '이며', '며', '이다', '다',
  '으로', '로', '과의', '와의', '이', '가', '은', '는', '을', '를', '과', '와', '의',
  '에서는', '에서의', '에서', '에는', '에도', '에', '도', '만', '보다', '처럼', '부터', '까지',
];
const HANGUL = /[가-힣]/;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** H5-D1 (W4) — 병기 패턴 직접 파싱(직전 40자 창 휴리스틱 대체).
 *  KO 가 아래 병기 형태 안에 있으면 면제(=위반 아님):
 *   ① EN(KO   — "Quenching(담금질" · "Red hardness(적열경도"  (여는 괄호 앞 단어가 EN)
 *   ② KO(EN)  — "경화능(hardenability)"  (KO 직후 (EN)
 *   ③ (…EN…KO…) — "(Quenching, 담금질)" · "(EN·KO)"  (같은 괄호 안 EN·KO 공존)
 *  창(window) 없이 구조로 판정 → 장문·다중병기 오탐/미탐 제거. */
export function isAnnotated(text: string, idx: number, ko: string, en: string): boolean {
  const enL = en.toLowerCase();
  const koEnd = idx + ko.length;
  // ② KO(EN…) — KO 직후 여는 괄호 안에 EN (역병기)
  const am = text.slice(koEnd).match(/^\s*[(（]([^)）]*)[)）]/);
  if (am && am[1].toLowerCase().includes(enL)) return true;
  // ①③ KO 가 괄호 안 → 괄호 content + 괄호 앞 '영문 run'(추가 단어 포함) 에 EN 존재
  //    "Sub-zero treatment(서브제로…)" · "stress relief annealing(응력제거 풀림)" · "Annealing(어닐링·풀림)" 처리.
  const before = text.slice(0, idx);
  const open = Math.max(before.lastIndexOf('('), before.lastIndexOf('（'));
  if (open !== -1 && !/[)）]/.test(before.slice(open + 1))) {
    const closeRel = text.slice(open).search(/[)）]/);
    const parenContent = text.slice(open + 1, closeRel === -1 ? open + 80 : open + closeRel).toLowerCase();
    const preRun = (before.slice(0, open).match(/[A-Za-z][A-Za-z0-9 .\-]*$/) || [''])[0].toLowerCase();
    if (parenContent.includes(enL) || preRun.includes(enL)) return true;
  }
  return false;
}

/** standalone 한글 HT 용어인데 병기 형태 밖 → 위반 목록. */
function violations(text: string, loc: string): string[] {
  const out: string[] = [];
  if (!text) return out;
  for (const [ko, en] of TERMS) {
    let idx = 0;
    while ((idx = text.indexOf(ko, idx)) !== -1) {
      const beforeCh = idx > 0 ? text[idx - 1] : '';
      const rest = text.slice(idx + ko.length);
      const isJosaOrEnd =
        !rest[0] || !HANGUL.test(rest[0]) ||
        JOSA.some((j) => rest.startsWith(j) && !HANGUL.test(rest[j.length] ?? ''));
      const standalone = !HANGUL.test(beforeCh) && isJosaOrEnd;
      if (standalone && !isAnnotated(text, idx, ko, en)) {
        out.push(`${loc}: "…${text.slice(Math.max(0, idx - 14), idx + ko.length + 10)}…" — ${ko}→${en} 병기/영어화 필요`);
      }
      idx += ko.length;
    }
  }
  return out;
}

describe('§3.1 병기 파서 (W4 — 창 없는 구조 판정)', () => {
  it('EN(KO) 형태는 면제', () => {
    expect(isAnnotated('Quenching(담금질)', 'Quenching('.length, '담금질', 'Quenching')).toBe(true);
    expect(isAnnotated('Red hardness(적열경도)', 'Red hardness('.length, '적열경도', 'Red hardness')).toBe(true);
  });
  it('KO(EN) 역병기도 면제', () => {
    expect(isAnnotated('경화능(hardenability)은', 0, '경화능', 'Hardenability')).toBe(true);
  });
  it('(EN, KO) 같은 괄호 공존 면제', () => {
    const t = '베이킹(de-embrittlement, 담금질 회복)';
    expect(isAnnotated(t, t.indexOf('담금질'), '담금질', 'Quenching')).toBe(false); // EN 은 quenching 이 아님
    const t2 = '(Quenching, 담금질)';
    expect(isAnnotated(t2, t2.indexOf('담금질'), '담금질', 'Quenching')).toBe(true);
  });
  it('창 밖(멀리 있는) EN 은 면제 안 함 — 구 40자 휴리스틱 오탐 제거', () => {
    const t = 'Quenching 은 중요한 공정이며 여러 문장 뒤에 다시 담금질 이 나온다';
    expect(isAnnotated(t, t.indexOf('담금질'), '담금질', 'Quenching')).toBe(false);
  });
  it('다중 병기 문장 — 각 KO 는 자기 괄호로만 판정', () => {
    const t = 'Quenching(담금질) 후 Tempering(뜨임) 을 한다';
    expect(isAnnotated(t, t.indexOf('담금질'), '담금질', 'Quenching')).toBe(true);
    expect(isAnnotated(t, t.indexOf('뜨임'), '뜨임', 'Tempering')).toBe(true);
  });
});

describe('§3.1 열처리 용어 표기 게이트 (영어 기본표기·병기 규칙)', () => {
  it('글로서리 문서(heading·body·table)에 병기 없는 한글 HT 용어 없음', () => {
    const bad: string[] = [];
    for (const [slug, art] of Object.entries(articles)) {
      art.sections.forEach((sec, i) => {
        bad.push(...violations(sec.heading, `${slug}#${i}H`));
        bad.push(...violations(sec.body, `${slug}#${i}B`));
        if (sec.table) {
          sec.table.headers.forEach((h) => bad.push(...violations(h, `${slug}#${i}T`)));
          sec.table.rows.forEach((r) => r.forEach((c) => bad.push(...violations(c, `${slug}#${i}T`))));
        }
      });
    }
    expect(bad, bad.slice(0, 20).join('\n')).toEqual([]);
  });

  it('용어 short 정의에 병기 없는 한글 HT 용어 없음', () => {
    const bad: string[] = [];
    for (const [slug, t] of Object.entries(glossary)) {
      bad.push(...violations(t.short, `short:${slug}`));
    }
    expect(bad, bad.slice(0, 20).join('\n')).toEqual([]);
  });
});

/* ── W5 (H5-D2): §3.1 게이트를 콘텐츠 5소스 + Guide 본문으로 확장 ──
 * 공정 노트(HT·절삭성·용접성)·선택 인사이트·코팅 추천·프로파일 조건노트·합금 스토리·
 * Guide 본문까지 "standalone 한글 HT 용어 = 영어화/병기" 규칙을 강제한다.
 * 문자열 잎 전수 스캔(넓은 추출) — 짧은 라벨·조사무관 포함. */
const readJSON = (rel: string): any => JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));

/** §3.1 동음이의 예외 (열처리 용어가 아닌 용법). 문자열이 바뀌면 재검토를 강제하도록 정확 일치. */
const HOMONYM_EXEMPT = new Set<string>([
  // '풀림' = 체결 풀림(bolt loosening), Annealing(열처리) 아님.
  '인장·전단·반복 풀림 — 토크 설계는 σ_yield 의 60-90 %로 preload.',
]);

/** 객체 트리의 한글 문자열 잎을 전수 검사 (URL·_ 키·동음이의 예외 제외). */
function scanTree(node: unknown, loc: string, bad: string[]): void {
  if (typeof node === 'string') {
    if (HANGUL.test(node) && !/https?:\/\//i.test(node) && !HOMONYM_EXEMPT.has(node)) {
      bad.push(...violations(node, loc));
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => scanTree(v, `${loc}[${i}]`, bad));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith('_')) continue;
      scanTree(v, loc ? `${loc}.${k}` : k, bad);
    }
  }
}

describe('§3.1 확장 — 공정노트·인사이트·코팅·프로파일·스토리·Guide (W5)', () => {
  it('HT·절삭성·용접성 가이드 블록 (text + by_grade)', () => {
    const bad: string[] = [];
    // W20 — text 뿐 아니라 by_grade(grade별 authored 콘텐츠)도 §3.1 준수 검사.
    const scanBlock = (b: any, loc: string) => {
      bad.push(...violations(b.text ?? '', loc));
      for (const [g, txt] of Object.entries<any>(b.by_grade ?? {})) bad.push(...violations(String(txt), `${loc}|${g}`));
    };
    for (const [k, b] of Object.entries<any>(readJSON('data/ht-guidance.json').blocks)) scanBlock(b, `ht:${k}`);
    for (const [k, b] of Object.entries<any>(readJSON('data/welding-guidance.json').blocks)) scanBlock(b, `weld:${k}`);
    for (const [k, v] of Object.entries<any>(readJSON('data/machining-guidance.json').guidance)) {
      bad.push(...violations(String(v), `mach:${k}`));
    }
    expect(bad, bad.slice(0, 30).join('\n')).toEqual([]);
  });

  it('선택 인사이트·코팅 추천', () => {
    const bad: string[] = [];
    scanTree(readJSON('data/selection-insights.json').groups, 'ins', bad);
    const cg = readJSON('data/coating-recommendations.json');
    scanTree(cg.groups, 'cg', bad);
    (cg.sources ?? []).forEach((s: string, i: number) => bad.push(...violations(s, `cg:sources[${i}]`)));
    expect(bad, bad.slice(0, 20).join('\n')).toEqual([]);
  });

  it('공정 프로파일 노트·조건노트', () => {
    const bad: string[] = [];
    const pf = readJSON('data/process-profiles.json');
    scanTree(pf.machinability, 'prof.mach', bad);
    scanTree(pf.condition_notes, 'prof.cond', bad);
    scanTree(pf.weld_condition_notes, 'prof.weld', bad);
    expect(bad, bad.slice(0, 20).join('\n')).toEqual([]);
  });

  it('합금 스토리 (sections·timeline)', () => {
    const bad: string[] = [];
    for (const [k, st] of Object.entries<any>(readJSON('data/alloy-stories.json').stories)) {
      for (const [sk, sv] of Object.entries<any>(st.sections ?? {})) {
        if (typeof sv === 'string') bad.push(...violations(sv, `story:${k}.${sk}`));
      }
      (st.timeline ?? []).forEach((ev: any, i: number) =>
        bad.push(...violations(ev.event ?? '', `story:${k}.tl[${i}]`)),
      );
    }
    expect(bad, bad.slice(0, 20).join('\n')).toEqual([]);
  });

  it('Guide.tsx 본문 (JSX 텍스트 + 한글 문자열 리터럴)', () => {
    const tsx = readFileSync(resolve(ROOT, 'client/src/pages/Guide.tsx'), 'utf8');
    const bad: string[] = [];
    for (const m of tsx.matchAll(/>([^<>{}]{6,})</g)) {
      const t = m[1].trim();
      if (!t || /^https?:/.test(t) || !HANGUL.test(t) || HOMONYM_EXEMPT.has(t)) continue;
      bad.push(...violations(t, 'Guide.tsx:jsx'));
    }
    for (const m of tsx.matchAll(/['"`]([^'"`\n]{6,})['"`]/g)) {
      const t = m[1];
      if (!HANGUL.test(t) || HOMONYM_EXEMPT.has(t)) continue;
      bad.push(...violations(t, 'Guide.tsx:lit'));
    }
    expect(bad, bad.slice(0, 20).join('\n')).toEqual([]);
  });
});
