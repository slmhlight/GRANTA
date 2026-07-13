/*
 * R227/E14/H2b — 재료 인라인 auto-link(linkify) 게이트 (client 매처).
 * H5-D2: link-coverage(실 corpus 커버리지 하한) 게이트를 흡수 통합 — 동일 linkify/buildAutolinkMap 검증.
 * 커버:
 *   ① linkify 동작 — 합성 맵으로(데이터 독립): 조사경계·부분문자열·§D·sliding·authored [[key|label]]
 *   ② buildAutolinkMap 정밀도 — 실제 wiki-index (고가치 유지·노이즈 제외)
 *   ③ 링크 커버리지 하한 — 실제 매처×전체 corpus(article/guide/story) 구조적 회귀 차단
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { linkify, buildAutolinkMap, norm, type AutolinkMap } from '@/lib/wiki-link';
import { buildWikiLookups } from '@/lib/wiki-refs';

const T = (id: string, repId: string | null, display = id) => ({ entityId: id, repId, display });
const MAP: AutolinkMap = new Map([
  ['peek', T('peek', 'R_0048', 'PEEK')],
  ['pekk', T('pekk', 'R_0100', 'PEKK')],
  ['inconel718', T('inconel-718', 'M_1', 'Inconel 718')],
  ['300m', T('uhss', 'M_2', '300M')],
  ['aermet100', T('aermet-100', 'M_3', 'AerMet 100')],
  ['nulltarget', T('nully', null, 'Nully')],
]);
const BYKEY = new Map([
  ['peek', { id: 'peek', rep_id: 'R_0048', display: 'PEEK' }],
]);
const linkTexts = (nodes: ReturnType<typeof linkify>) => nodes.filter((n) => n.t === 'link').map((n) => n.s);
const plainOf = (nodes: ReturnType<typeof linkify>) => nodes.map((n) => n.s).join('');

describe('norm — name-tokens 와 동일', () => {
  it('구분자·하이픈 제거 후 소문자', () => {
    expect(norm('Ti-6Al-4V')).toBe('ti6al4v');
    expect(norm('Inconel 718')).toBe('inconel718');
    expect(norm('AerMet 100')).toBe('aermet100');
  });
});

describe('linkify — 기본 매칭', () => {
  it('다단어 지정자(공백)를 한 링크로, 나머지는 평문', () => {
    const n = linkify('Inconel 718은 니켈초합금이다.', MAP, null, null);
    expect(linkTexts(n)).toEqual(['Inconel 718']);
    expect(plainOf(n)).toBe('Inconel 718은 니켈초합금이다.'); // 무손실
  });
  it('한글 조사/접미 경계 — "300M강" → "300M" 링크 + "강" 평문', () => {
    const n = linkify('300M강은 초고장력강', MAP, null, null);
    expect(linkTexts(n)).toEqual(['300M']);
    expect(plainOf(n)).toBe('300M강은 초고장력강');
  });
  it('부분문자열 오탐 없음 — "Peekaboo" 는 링크 안 함', () => {
    const n = linkify('Peekaboo 는 놀이, PEEK 는 폴리머', MAP, null, null);
    expect(linkTexts(n)).toEqual(['PEEK']);
  });
});

describe('linkify — §D 규칙', () => {
  it('self 제외 — 자기 스토리(peek)에서 PEEK 무링크', () => {
    const n = linkify('PEEK 는 우수하다', MAP, null, 'peek');
    expect(linkTexts(n)).toEqual([]);
  });
  it('섹션당 첫 등장만 — 반복 form 은 1회', () => {
    const n = linkify('PEEK 그리고 또 PEEK', MAP, null, null);
    expect(linkTexts(n)).toEqual(['PEEK']);
  });
  it('repId 없는 타깃은 링크하지 않음', () => {
    const n = linkify('nulltarget 은 무효', MAP, null, null);
    expect(linkTexts(n)).toEqual([]);
  });
  it('순수 숫자/짧은 토큰은 매칭 안 함(map 부재)', () => {
    const n = linkify('718 은 숫자, 강도 30', MAP, null, null);
    expect(linkTexts(n)).toEqual([]);
  });
});

describe('linkify — H4f-C sliding + 3자 화이트리스트', () => {
  const MAP2: AutolinkMap = new Map([
    ...MAP,
    ['p91', T('grade-91', 'M_10', 'Grade 91')],
    ['m42', T('high-speed-steel', 'M_11', 'M42 HSS')],
    ['hastelloyx', T('hastelloy-x', 'M_12', 'Hastelloy X')],
    ['haynes230', T('haynes-230', 'M_13', 'Haynes 230')],
  ]);
  it('나열식 run 에서 뒤 항목도 링크 — "Inconel 718·Hastelloy X·Haynes 230"', () => {
    const n = linkify('Inconel 718·Hastelloy X·Haynes 230 이 있다', MAP2, null, null);
    expect(linkTexts(n)).toEqual(['Inconel 718', 'Hastelloy X', 'Haynes 230']);
    expect(plainOf(n)).toBe('Inconel 718·Hastelloy X·Haynes 230 이 있다'); // 무손실
  });
  it('선두 토큰 미스 후 재시도 — "공구강 M42" 아닌 "HSS M42" 같은 접두 뒤 항목', () => {
    const n = linkify('보일러엔 P91 이, 절삭엔 M42 가 쓰인다', MAP2, null, null);
    expect(linkTexts(n)).toEqual(['P91', 'M42']);
  });
  it('3자 폼은 map 등록시에만 — 미등록 3자(304)는 여전히 무링크', () => {
    const n = linkify('304 는 map 에 없다', MAP2, null, null);
    expect(linkTexts(n)).toEqual([]);
  });
  it('2자 토큰은 map 에 있어도 링크 안 함(하한 3)', () => {
    const MAP3: AutolinkMap = new Map([['d2', T('d2', 'M_20', 'D2')]]);
    const n = linkify('D2 공구강', MAP3, null, null);
    expect(linkTexts(n)).toEqual([]);
  });
});

describe('linkify — authored [[key|label]]', () => {
  it('key 해결 시 label 로 링크', () => {
    const n = linkify('참조: [[peek|폴리이터이터케톤]] 를 보라', MAP, BYKEY, null);
    const link = n.find((x) => x.t === 'link');
    expect(link && link.t === 'link' && link.s).toBe('폴리이터이터케톤');
    expect(link && link.t === 'link' && link.repId).toBe('R_0048');
    expect(plainOf(n)).toBe('참조: 폴리이터이터케톤 를 보라'); // 마커 소거·라벨 보존
  });
  it('미해결 key 는 라벨을 평문으로(무손실)', () => {
    const n = linkify('[[unknown|정의없음]]', MAP, BYKEY, null);
    expect(linkTexts(n)).toEqual([]);
    expect(plainOf(n)).toBe('정의없음');
  });
});

describe('buildAutolinkMap + 실제 wiki-index 정밀도', () => {
  const p = path.resolve(process.cwd(), 'client/public/wiki-index.json');
  const bp = path.resolve(process.cwd(), 'client/public/wiki-backlinks.json');
  const hasFiles = fs.existsSync(p) && fs.existsSync(bp);
  it.runIf(hasFiles)('고가치 form 은 autolink, 원소명·흔한단어는 제외', () => {
    const idx = JSON.parse(fs.readFileSync(p, 'utf8'));
    const bl = JSON.parse(fs.readFileSync(bp, 'utf8'));
    const lk = buildWikiLookups(idx, bl);
    const map = buildAutolinkMap(lk);
    // 고가치 유지
    for (const f of ['peek', 'pekk', 'inconel718', 'ti6al4v', 'aermet100', '300m']) {
      expect(map.has(f), `${f} should autolink`).toBe(true);
    }
    // 노이즈 제외
    for (const f of ['chromium', 'molybdenum', 'yield', 'peak', 'glass', 'gray', 'boron', 'ductile']) {
      expect(map.has(f), `${f} should NOT autolink`).toBe(false);
    }
    // 모든 타깃 repId 는 문자열(네비게이션 가능)
    for (const t of map.values()) expect(typeof t.repId).toBe('string');
  });
});

/* ── 재료 링크 커버리지 하한 (H5-D1 W1 — 흡수 통합) ──
 * audit-link-coverage.mjs 는 진단 리포트(로직 복제)지만, 이 게이트는 위 linkify+buildAutolinkMap
 * (실제 client 매처)를 그대로 호출해 커버리지가 기준선 아래로 떨어지면 fail — mjs 복제와 TS 매처의 드리프트 차단.
 * 기준선(2026-07-12, 7a50582): article 147 · guide 251 · story 89. 하한은 여유 마진(편집 변동 허용, 구조 회귀만 차단). */
const COV_ROOT = process.cwd();
const covRd = (p: string) => fs.readFileSync(path.join(COV_ROOT, p), 'utf8');
const covRj = (p: string) => JSON.parse(covRd(p));
const covIdxPath = path.join(COV_ROOT, 'client/public/wiki-index.json');
const covBlPath = path.join(COV_ROOT, 'client/public/wiki-backlinks.json');
const covHasFiles = fs.existsSync(covIdxPath) && fs.existsSync(covBlPath);

// 합금-형 언급 패턴 (audit-link-coverage.mjs 와 동일)
const MENTION: RegExp[] = [
  /\bUNS ?[A-Z]\d{5}\b/g,
  /\b(?:Inconel|Incoloy|Hastelloy|Haynes|Monel|Nimonic|Waspaloy|Rene|Udimet|Stellite|MAR-M|CMSX|Zamak|Nitronic)[- ]?[\w.]{0,8}\b/g,
  /\bAA ?\d{4}\b/g, /\bAISI ?\d{3,4}[A-Z]?\b/g, /\bTi-6Al-4V\b/g,
  /\b\d{4}-T\d{1,2}\b/g, /\b1[0-9]{3}\b/g, /\b4[0-9]{3}\b/g, /\b7[0-9]{3}\b/g, /\b6[0-9]{3}\b/g, /\b2[0-9]{3}\b/g,
  /\b3\d{2}L?N?\b/g, /\b4\d{2}[A-Z]?\b/g, /\b17-[47] ?PH\b/g, /\bP9[12]\b/g, /\b52100\b/g, /\bM\d{2}\b/g,
];
const NUM_BAD_BEFORE = /(°C|°F|MPa|GPa|HV|HB|HRC|~|≥|≤|약 |서 |도 |년 |g\/)$/;
const NUM_BAD_AFTER = /^ ?(°C|°F|MPa|GPa|h\b|시간|년|%|배)/;

/** linkify 출력 노드 → 링크 구간 [start,end][] (문자 오프셋). */
function linkSpansOf(text: string, map: AutolinkMap): Array<[number, number]> {
  const nodes = linkify(text, map, null, null);
  const spans: Array<[number, number]> = [];
  let pos = 0;
  for (const n of nodes) {
    const len = n.s.length;
    if (n.t === 'link') spans.push([pos, pos + len]);
    pos += len;
  }
  return spans;
}

function coverage(texts: string[], map: AutolinkMap): { mentions: number; linked: number } {
  let mentions = 0, linked = 0;
  for (const text of texts) {
    const spans = linkSpansOf(text, map);
    for (const re of MENTION) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const s = m.index, e = s + m[0].length, raw = m[0];
        if (/^\d+$/.test(raw)) {
          const pre = text.slice(Math.max(0, s - 8), s), post = text.slice(e, e + 6);
          if (NUM_BAD_BEFORE.test(pre) || NUM_BAD_AFTER.test(post)) continue;
          if (/[\d.]/.test(text[s - 1] || '') || /[\d.]/.test(text[e] || '')) continue;
        }
        mentions++;
        if (spans.some(([a, b]) => (a <= s && e <= b) || (s <= a && a < e))) linked++;
      }
    }
  }
  return { mentions, linked };
}

function corpusTexts(): { article: string[]; guide: string[]; story: string[] } {
  const articles = covRj('data/glossary-articles.json').articles as Record<string, { sections: Array<{ body?: string; table?: { headers: string[]; rows: string[][] } }> }>;
  const stories = covRj('data/alloy-stories.json').stories as Record<string, { sections?: Record<string, string>; timeline?: Array<{ event: string }> }>;
  const article: string[] = [];
  for (const art of Object.values(articles)) for (const s of art.sections) {
    article.push(s.body || '');
    if (s.table) article.push(...s.table.rows.flat(), ...s.table.headers);
  }
  const tsx = covRd('client/src/pages/Guide.tsx');
  const guide: string[] = [];
  for (const m of tsx.matchAll(/>([^<>{}]{6,})</g)) {
    const t = m[1].trim();
    if (!t || /^https?:|className|^\w+=/.test(t)) continue;
    if (!/[가-힣]/.test(t) && t.length < 12) continue;
    guide.push(t);
  }
  for (const m of tsx.matchAll(/\{\s*['"`]([^'"`]{8,})['"`]\s*\}/g)) if (/[가-힣]/.test(m[1])) guide.push(m[1]);
  const story: string[] = [];
  for (const st of Object.values(stories)) {
    const parts = [...(st.sections ? Object.values(st.sections) : []), ...(st.timeline || []).map((e) => e.event)];
    story.push(parts.filter(Boolean).join(' '));
  }
  return { article, guide, story };
}

describe('재료 링크 커버리지 게이트 (H5-D1 — 실 linkify)', () => {
  it.runIf(covHasFiles)('커버리지가 기준선 하한 이상 (구조적 회귀 차단)', () => {
    const lk = buildWikiLookups(covRj('client/public/wiki-index.json'), covRj('client/public/wiki-backlinks.json'));
    const map = buildAutolinkMap(lk);
    const c = corpusTexts();
    const art = coverage(c.article, map);
    const guide = coverage(c.guide, map);
    const story = coverage(c.story, map);
    // 기준선 147/251/89 대비 여유 하한 (편집 변동 허용, 구조 붕괴만 fail)
    expect(art.linked, `article 링크 ${art.linked}/${art.mentions} (하한 138)`).toBeGreaterThanOrEqual(138);
    expect(guide.linked, `guide 링크 ${guide.linked}/${guide.mentions} (하한 238)`).toBeGreaterThanOrEqual(238);
    expect(story.linked, `story 링크 ${story.linked}/${story.mentions} (하한 82)`).toBeGreaterThanOrEqual(82);
  });
});
