/*
 * R227/E14/H4a — 기술용어 글로서리 게이트 (SSOT + 소비처).
 * H5-D2: glossary-link(용어 자동링크 매처)·guide-search(가이드 검색 자동파생) 게이트를 흡수 통합.
 * 커버:
 *   ① data/glossary.json 무결성 — 필드·카테고리·autolink⊆surface_forms·related·동음이의·충돌 0
 *   ② A4 본문(articles) 무결성 — 섹션·도표·참고문헌
 *   ③ glossary-link.ts 매처 — KO 조사경계·동음이의·라틴 경계·첫등장(client autolink)
 *   ④ guide 검색 — GLOSSARY.terms 자동 파생(termSlug→/guide/term/:slug)
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { findTermSpans, linkifyTerms } from '@/lib/glossary-link';
import { searchGuide, GLOSSARY_ENTRIES } from '@/pages/guide/index-entries';
import { GLOSSARY } from '@/lib/glossary';
import { figureAlt, CAPTIONS } from '@/pages/guide/glossary-figures';

const g = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data/glossary.json'), 'utf8'));
const terms: Record<string, any> = g.terms;
const keys = Object.keys(terms);
const cats = new Set(Object.keys(g.categories));

describe('glossary SSOT — 구조', () => {
  it('version·categories·terms 존재', () => {
    expect(typeof g.version).toBe('number');
    expect(cats.size).toBeGreaterThanOrEqual(5);
    expect(keys.length).toBeGreaterThanOrEqual(50); // 커버리지 하한
  });
});

describe('glossary SSOT — 각 term 필드', () => {
  it('display·category·surface_forms·short·sources 필수, autolink⊆surface_forms', () => {
    const bad: string[] = [];
    for (const [k, t] of Object.entries(terms)) {
      if (!t.display) bad.push(`${k}: no display`);
      if (!cats.has(t.category)) bad.push(`${k}: bad category ${t.category}`);
      if (!Array.isArray(t.surface_forms) || !t.surface_forms.length) bad.push(`${k}: no surface_forms`);
      if (!t.short || t.short.length < 10) bad.push(`${k}: short too short`);
      if (!Array.isArray(t.sources) || !t.sources.length) bad.push(`${k}: no sources`); // 표준정의라도 출처 필수
      for (const a of t.autolink || []) if (!t.surface_forms.includes(a)) bad.push(`${k}: autolink '${a}' not in surface_forms`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('glossary SSOT — related 참조 무결성', () => {
  it('모든 related slug 는 실재 term', () => {
    const bad: string[] = [];
    for (const [k, t] of Object.entries(terms)) for (const r of t.related || []) if (!terms[r]) bad.push(`${k} → ${r}`);
    expect(bad, bad.join(', ')).toEqual([]);
  });
});

describe('glossary SSOT — autolink 안전', () => {
  it('autolink form 은 전역 unique (모호 0)', () => {
    const map: Record<string, string[]> = {};
    for (const [k, t] of Object.entries(terms)) for (const a of t.autolink || []) (map[a] ||= []).push(k);
    const collisions = Object.entries(map).filter(([, ks]) => ks.length > 1);
    expect(collisions, JSON.stringify(collisions)).toEqual([]);
  });
  it('동음이의(공식=formula·공정=process) 는 autolink 제외', () => {
    for (const bare of ['공식', '공정', '연신', '공석']) {
      for (const [k, t] of Object.entries(terms)) {
        expect((t.autolink || []).includes(bare), `${bare} autolinked in ${k}`).toBe(false);
      }
    }
  });

  /* H5-D2 (W6) — 검색 노이즈가 prose 과링크로 번지지 않게 하는 방어막.
   * surface_forms(검색·감사용)에는 'plate martensite'의 plate, 'cast iron growth'의 growth 등
   * 광범위 영단어가 정당하게 있으나(=실제 야금 연관), 이들이 autolink 로 승격되면 본문의
   * 흔한 단어가 전부 링크돼 노이즈가 된다. autolink 는 큐레이션된 소수 폼만 — 이를 강제. */
  it('과광범위 일반 영단어·초단축 영문은 autolink 제외 (surface_forms/검색 전용)', () => {
    const GENERIC_EN = new Set([
      'plate', 'mold', 'mould', 'growth', 'twin', 'cast', 'bar', 'sheet', 'rod', 'wire',
      'ring', 'weld', 'heat', 'cold', 'hot', 'pipe', 'tube', 'strip', 'block', 'form',
      'age', 'grade', 'class', 'core', 'case', 'free', 'red', 'cell', 'wear', 'flow',
      'film', 'hard', 'soft', 'tough', 'skin', 'band', 'draw', 'roll', 'set', 'pin',
    ]);
    const bad: string[] = [];
    for (const [k, t] of Object.entries(terms)) {
      for (const a of t.autolink || []) {
        if (GENERIC_EN.has(String(a).toLowerCase())) bad.push(`${k}: 과광범위 "${a}" autolink 승격`);
        // 영문 단독폼은 alnum 3자 이상 (KO 폼은 대상 아님)
        if (/^[\x00-\x7f]+$/.test(a) && a.replace(/[^a-z0-9]/gi, '').length < 3) {
          bad.push(`${k}: 초단축 영문 autolink "${a}"`);
        }
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('glossary SSOT — 핵심 앵커', () => {
  it('고빈도 기초 용어가 존재하고 분류가 맞음', () => {
    expect(terms.martensite?.category).toBe('microstructure');
    expect(terms.fatigue?.category).toBe('mechanical');
    expect(terms['corrosion-resistance']?.category).toBe('corrosion');
    expect(terms['precipitation-hardening']?.category).toBe('strengthening');
    expect(terms.quenching?.category).toBe('heat-treatment');
    // 최고빈도(인성·내식성·피로) 커버
    for (const k of ['toughness', 'corrosion-resistance', 'fatigue', 'aging', 'austenite']) {
      expect(terms[k], `${k} missing`).toBeTruthy();
    }
  });
});

describe('glossary A4 본문(articles) 무결성', () => {
  const artPath = path.resolve(process.cwd(), 'data/glossary-articles.json');
  const figDir = path.resolve(process.cwd(), 'client/src/assets/glossary');
  const articles: Record<string, any> = JSON.parse(fs.readFileSync(artPath, 'utf8')).articles;
  // 도표 id = 에셋 폴더의 PNG 파일명 (scripts/gen-glossary-figures.py 산출).
  const figIds = new Set(
    (fs.existsSync(figDir) ? fs.readdirSync(figDir) : [])
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.replace(/\.png$/, '')),
  );

  it('article slug 는 실재 term, 섹션·도표·참고문헌 유효', () => {
    const bad: string[] = [];
    for (const [slug, a] of Object.entries(articles)) {
      if (!terms[slug]) bad.push(`${slug}: not a glossary term`);
      if (!Array.isArray(a.sections) || a.sections.length < 3) bad.push(`${slug}: <3 sections`);
      for (const s of a.sections || []) {
        if (!s.heading) bad.push(`${slug}: section no heading`);
        if (!s.body || s.body.length < 30) bad.push(`${slug}: section body too short`);
        if (s.figure && !figIds.has(s.figure)) bad.push(`${slug}: unknown figure '${s.figure}'`);
      }
      for (const em of a.example_materials || []) {
        if (!em.label || !em.id) bad.push(`${slug}: example_material 은 label·id 필수`);
      }
      // H5 W13 — Tools 딥링크 CTA: label 필수 + href 는 앱 내부 경로(/)만 (외부 href 주입 차단)
      if (a.cta) {
        if (typeof a.cta.label !== 'string' || !a.cta.label) bad.push(`${slug}: cta.label 필수`);
        if (typeof a.cta.href !== 'string' || !a.cta.href.startsWith('/')) bad.push(`${slug}: cta.href 는 내부경로(/)여야`);
      }
      if (!Array.isArray(a.refs) || !a.refs.length) bad.push(`${slug}: no refs`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
  it('도표 레지스트리에 id 존재', () => {
    expect(figIds.size).toBeGreaterThanOrEqual(3);
  });
  // H5 W14 — 접근성: 모든 캡션이 비지 않은·한 줄(≤80자)·'그림 ·' 접두 없는 alt 를 만든다.
  it('도표 alt = 캡션 한 줄 요약 (전 도표)', () => {
    const bad: string[] = [];
    for (const [id, cap] of Object.entries(CAPTIONS)) {
      const alt = figureAlt(id, cap);
      if (!alt) bad.push(`${id}: alt 비어있음`);
      else if (alt.length > 80) bad.push(`${id}: alt 너무 김 (${alt.length}자)`);
      else if (/^그림\s*·/.test(alt)) bad.push(`${id}: '그림 ·' 접두 미제거`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
  // H5 W15 — 무도표 확정 유지(사유 명문). 새 무도표 article 은 도표를 넣거나 여기 사유와 함께 등재.
  it('무도표 article 은 ≤6 이며 전부 사유 명문', () => {
    const DOCUMENTED_NO_FIGURE: Record<string, string> = {
      pren: '수식 중심(PREN = Cr+3.3Mo+16N) — 단일 도표보다 식이 본체',
      'sour-service': '규격 중심(NACE MR0175/ISO 15156) — 도표보다 조건표',
      'residual-stress': '원인(용접·주조·가공·상변태) 다양 — 대표 1장으로 오도 우려',
      'sigma-phase': '개념(취성 금속간상) — sensitization/ferrite-micro 로 대체 설명',
      intermetallic: '광범위 개념(수백 화합물) — 대표 단일 도표 부적절',
      'zirconium-alloy': '표(세대·핵심물성)가 골격 — W12 정량 표 2종',
    };
    const noFig = Object.entries(articles)
      .filter(([, a]) => !(a.sections || []).some((s: any) => s.figure))
      .map(([slug]) => slug);
    const undocumented = noFig.filter((s) => !DOCUMENTED_NO_FIGURE[s]);
    expect(undocumented, `무도표인데 사유 미등재: ${undocumented.join(', ')}`).toEqual([]);
    expect(noFig.length, `무도표 ${noFig.length} > 6`).toBeLessThanOrEqual(6);
  });
});

/* ── glossary-link.ts 매처 (R227/E14/H4b — 흡수 통합) ──
 * 용어 자동링크 정밀도: KO 조사경계·동음이의·라틴 경계·첫등장. 실제 glossary.json 폼으로 검증. */
const linkedSlugs = (text: string) => findTermSpans(text).map((s) => s.slug);
const linkedForms = (text: string) => findTermSpans(text).map((s) => text.slice(s.start, s.end));

describe('glossary-link — 한글 조사 경계', () => {
  it('조사가 붙어도 용어를 링크 ("마르텐사이트로")', () => {
    expect(linkedSlugs('오스테나이트를 급랭하면 마르텐사이트로 변태한다')).toContain('martensite');
    expect(linkedForms('마르텐사이트로 변태')).toContain('마르텐사이트');
  });
  it('접미(계) 앞에서도 용어만 링크 ("오스테나이트계")', () => {
    const spans = findTermSpans('오스테나이트계 스테인리스강');
    expect(spans.some((s) => s.slug === 'austenite')).toBe(true);
    // "오스테나이트" 만 링크(계 제외)
    expect(spans.find((s) => s.slug === 'austenite')?.end).toBe('오스테나이트'.length);
  });
  it('합성어 중간(앞이 한글)은 링크 안 함 ("고강도마르텐사이트")', () => {
    expect(linkedSlugs('고강도마르텐사이트 조직')).not.toContain('martensite');
  });
});

describe('glossary-link — 동음이의 가드', () => {
  it('"단조로운"(monotonous) 은 단조(forging) 로 링크 안 함', () => {
    expect(linkedSlugs('단조로운 표면 처리')).not.toContain('forging');
  });
  it('"단조 공정" 은 단조 링크', () => {
    expect(linkedSlugs('단조 공정으로 성형')).toContain('forging');
  });
  it('동음이의(공식·공정) 는 autolink 제외 → 매칭 없음', () => {
    expect(linkedSlugs('공식 유도 · 제조 공정')).toEqual([]);
  });
});

describe('glossary-link — 라틴 경계', () => {
  it('영단어 경계로 매칭 ("creep")', () => {
    expect(linkedSlugs('creep resistance at high temp')).toContain('creep');
  });
  it('부분문자열 오탐 없음 ("creepy" 는 creep 아님)', () => {
    expect(linkedSlugs('a creepy result')).not.toContain('creep');
  });
});

describe('glossary-link — 중첩·첫등장', () => {
  it('블록당 첫 등장만 링크', () => {
    const spans = findTermSpans('피로 파괴는 피로 하중에서 온다');
    expect(spans.filter((s) => s.slug === 'fatigue').length).toBe(1);
  });
  it('최장 우선 (잔류 오스테나이트 > 오스테나이트)', () => {
    const spans = findTermSpans('잔류 오스테나이트가 남는다');
    // retained-austenite 로 링크(오스테나이트 별도 아님)
    expect(spans.some((s) => s.slug === 'retained-austenite')).toBe(true);
    expect(spans.filter((s) => s.slug === 'austenite').length).toBe(0);
  });
  it('seen 공유 시 블록 간 첫등장 유지', () => {
    const seen = new Set<string>();
    findTermSpans('크리프 변형', seen);
    expect(findTermSpans('크리프 파단', seen).some((s) => s.slug === 'creep')).toBe(false);
  });
});

describe('glossary-link — linkifyTerms 노드', () => {
  it('용어를 term 노드로, 나머지는 무손실 text', () => {
    const nodes = linkifyTerms('마르텐사이트는 단단하다');
    expect(nodes.map((n) => n.s).join('')).toBe('마르텐사이트는 단단하다'); // 무손실
    const term = nodes.find((n) => n.t === 'term');
    expect(term && term.t === 'term' && term.slug).toBe('martensite');
  });
});

/* ── Guide 검색 자동 파생 (H5-D2 W6+ — 흡수 통합) ──
 * GLOSSARY.terms 가 SSOT: 신규 용어 추가 시 무손질 검색 편입 + termSlug(/guide/term/:slug) 무결성. */
describe('Guide 검색 — 글로서리 자동 파생 (W6+)', () => {
  it('모든 글로서리 용어가 검색 엔트리로 파생 (수동 목록 이중관리 제거)', () => {
    expect(GLOSSARY_ENTRIES.length).toBe(Object.keys(GLOSSARY.terms).length);
  });

  it('모든 term 엔트리의 termSlug 는 실재 글로서리 용어', () => {
    const bad = GLOSSARY_ENTRIES.filter((e) => !e.termSlug || !GLOSSARY.terms[e.termSlug]);
    expect(bad.map((e) => e.section), 'termSlug 무결성').toEqual([]);
  });

  it('신규·특수 용어가 display·surface·약어 어느 표기로도 검색됨', () => {
    const cases: Array<[string, string]> = [
      ['쉐플러', 'schaeffler-diagram'],
      ['schaeffler', 'schaeffler-diagram'],
      ['ahss', 'ahss'],
      ['초고장력강', 'ahss'],
      ['베이나이트', 'bainite'],
      ['bainite', 'bainite'],
      ['엘라스토머', 'elastomer'],
      ['tpu', 'elastomer'],
      ['백주철', 'white-cast-iron'],
      ['마르텐사이트', 'martensite'],
    ];
    for (const [q, slug] of cases) {
      const hit = searchGuide(q).some((e) => e.termSlug === slug);
      expect(hit, `"${q}" → ${slug} 미검색`).toBe(true);
    }
  });

  it('term 검색 결과는 /guide/term/:slug 이동용 termSlug 보유', () => {
    const term = searchGuide('마르텐사이트').find((e) => e.termSlug === 'martensite');
    expect(term?.termSlug).toBe('martensite');
  });

  it('챕터 검색은 여전히 동작 (Ashby → ch6, term 아님)', () => {
    expect(searchGuide('ashby').some((e) => !e.termSlug && e.ch === 'ch6')).toBe(true);
  });

  it('결과는 최대 12개', () => {
    expect(searchGuide('강').length).toBeLessThanOrEqual(12);
  });
});
