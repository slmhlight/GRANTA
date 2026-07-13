/*
 * R227/E14/H4a — 기술용어 글로서리 SSOT 게이트.
 * data/glossary.json 무결성: 필드·카테고리·autolink⊆surface_forms·related 참조·동음이의 제외·충돌 0.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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
      if (!Array.isArray(a.refs) || !a.refs.length) bad.push(`${slug}: no refs`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
  it('도표 레지스트리에 id 존재', () => {
    expect(figIds.size).toBeGreaterThanOrEqual(3);
  });
});
