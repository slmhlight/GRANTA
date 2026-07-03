/*
 * R226p Phase 5b — family-color Material-ID 전환 behavior-identical 게이트.
 *
 * 구 classOf 는 런타임에 재료 이름(+subcategory)에 name-regex(CLASSES.test)를 돌려 color key 를 정했다.
 * 전환 후엔 빌드 분류기(color-classify.mjs)가 key 를 계산해 m.profiles.colorFamily 로 스탬프하고,
 * 런타임 classOf 는 CLASS_COLOR 조회만 한다(정규식 미실행).
 *
 * (1) 스탬프 === 빌드 분류기 오라클(전 재료) · (2) golden anchor(대표 재료 색 고정) ·
 * (3) 런타임 classOf 에 new RegExp/.test 부재 · (4) classOf 색 = CLASS_COLOR[stamp].
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CLASSES, CLASS_COLOR, classOf } from '../client/src/lib/material-colors';
import { parseColorClasses, classifyColorKey } from '../scripts/lib/color-classify.mjs';
import type { Material } from '../client/src/lib/materials';

const ROOT = process.cwd();
const all: Material[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'public', 'materials.json'), 'utf8'));
const oracle = parseColorClasses(path.join(ROOT, 'client', 'src', 'lib', 'material-colors.ts'));

describe('R226p Phase 5b — family-color Material-ID 전환 (behavior identical)', () => {
  it('profiles.colorFamily 가 빌드 분류기 오라클과 전 재료 정합', () => {
    const mism: string[] = [];
    for (const m of all) {
      const stamped = m.profiles?.colorFamily || 'Other';
      const expect0 = classifyColorKey(oracle, (m as any).subcategory, m.name, m.category);
      if (stamped !== expect0) mism.push(`${m.name}: ${expect0} → ${stamped}`);
    }
    expect(mism.slice(0, 20).join('\n')).toBe('');
    expect(mism.length).toBe(0);
  });

  it('golden anchor — 대표 재료 color key 고정 (오분류 회귀 차단)', () => {
    const find = (needle: string) => all.find((m) => m.name?.includes(needle));
    const keyOf = (m?: Material) => (m ? m.profiles?.colorFamily || 'Other' : 'MISSING');
    // Fe-heavy 초합금이라도 Nickel · 스테인리스는 Steel · Ti 합금 Titanium · Alumina 는 Ceramic(≠Aluminum)
    expect(keyOf(find('Inconel 718'))).toBe('Nickel');
    expect(keyOf(find('316L'))).toBe('Steel');
    expect(keyOf(find('Ti-6Al-4V'))).toBe('Titanium');
    expect(keyOf(all.find((m) => m.category === 'Ceramic' && /alumina/i.test(m.name || '')))).toBe('Ceramic');
    expect(keyOf(all.find((m) => m.category === 'Polymer'))).toBe('Polymer');
    expect(keyOf(all.find((m) => m.category === 'Composite'))).toBe('Composite');
  });

  it('런타임 classOf 에 name-regex 미실행 (스탬프 조회만)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'client', 'src', 'lib', 'material-colors.ts'), 'utf8');
    const s = src.indexOf('export function classOf');
    const body = src.slice(s, src.indexOf('\n}', s) + 2);
    expect(/new RegExp|\.test\(/.test(body)).toBe(false);
    expect(body.includes('profiles?.colorFamily')).toBe(true);
  });

  it('classOf 색 = CLASS_COLOR[stamp] · 모든 스탬프 key 가 CLASS_COLOR 에 실재', () => {
    const known = new Set(Object.keys(CLASS_COLOR));
    for (const m of all) {
      const key = m.profiles?.colorFamily || 'Other';
      expect(known.has(key)).toBe(true);
      expect(classOf(m).color).toBe(CLASS_COLOR[key]);
    }
    // CLASSES 데이터 무결성 — 각 항목은 category 또는 pattern 중 하나
    for (const c of CLASSES) expect(Boolean(c.category) !== Boolean(c.pattern)).toBe(true);
  });
});
