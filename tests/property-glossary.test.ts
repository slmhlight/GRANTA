/*
 * W4-5 — 물성 라벨 → 글로서리 연결 게이트.
 *
 * 위험은 **드리프트**다: 글로서리 슬러그가 바뀌거나 용어가 사라지면 링크가 404 로 죽는데,
 * 화면에는 멀쩡한 밑줄로 보인다. 그래서 매핑의 양쪽 끝이 실재하는지 검사한다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PROPERTY_TERM, glossarySlugFor } from '../client/src/lib/property-glossary';
import { ALL_NUMERIC_PROPERTIES } from '../client/src/lib/materials';

const glossary = JSON.parse(fs.readFileSync(path.resolve('data/glossary.json'), 'utf8'));
const TERMS: Record<string, unknown> = glossary.terms ?? glossary;
const articles = JSON.parse(fs.readFileSync(path.resolve('data/glossary-articles.json'), 'utf8')).articles;

describe('W4-5 — 물성↔용어 매핑', () => {
  it('매핑된 슬러그가 글로서리에 전부 실재한다', () => {
    const bad = Object.entries(PROPERTY_TERM).filter(([, slug]) => !(slug in TERMS)).map(([k, s]) => `${k} → ${s}`);
    expect(bad, `글로서리에 없는 슬러그 ${bad.length}건: ${bad.join(' | ')}`).toEqual([]);
  });

  it('매핑된 용어가 A4 문서를 갖는다 — 눌렀는데 빈 페이지면 안 된다', () => {
    const bad = Object.entries(PROPERTY_TERM).filter(([, slug]) => !articles[slug]).map(([k, s]) => `${k} → ${s}`);
    expect(bad, `문서 없는 용어 ${bad.length}건: ${bad.join(' | ')}`).toEqual([]);
  });

  it('매핑 키가 실제 물성 키다 — 오타면 링크가 영영 안 뜬다', () => {
    const known = new Set(ALL_NUMERIC_PROPERTIES.map((p) => String(p.key)));
    const bad = Object.keys(PROPERTY_TERM).filter((k) => !known.has(k));
    expect(bad, `ALL_NUMERIC_PROPERTIES 에 없는 물성 키: ${bad.join(' | ')}`).toEqual([]);
  });

  it('대응 용어가 없는 물성은 링크하지 않는다', () => {
    /* 억지로 근처 용어에 거는 것보다 링크 없는 편이 낫다 (퍼지 매칭이 thermal_conductivity 를
       thermal-expansion 에 걸었던 것이 이 규칙의 이유다). */
    for (const k of ['density', 'melting_point', 'specific_heat', 'poisson_ratio', 'max_service_temp'])
      expect(glossarySlugFor(k), `${k} 에 링크가 생겼다 — 대응 용어를 신설했다면 매핑에 명시할 것`).toBeNull();
    expect(glossarySlugFor(undefined)).toBeNull();
    expect(glossarySlugFor('없는키')).toBeNull();
  });

  it('핵심 기계 물성은 연결돼 있다', () => {
    for (const k of ['yield_strength', 'uts', 'elongation', 'modulus', 'hardness'])
      expect(glossarySlugFor(k), `${k} 연결 끊김`).toBeTruthy();
  });
});
