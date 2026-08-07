/*
 * R226e/S3 — r226-value-corrections.json 스키마·정합 검증.
 *
 * 8종 교정 타입(ranges·fields·compositionByBase·subcategoryByBase·remove·sourcesBySubcategory·aliasesByBase)의
 * 키 타입·값 형식을 게이트. 특히 ranges/fields 교정 대상 stable_id 가 레지스트리에 실재하는지(=stale 교정 없음) 검증
 * — S1 이 미룬 부분. (dead config: 제거된 entry 대상 교정) 을 push 시점에 차단.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// H6 D5 — 단일 파일(888줄) → data/corrections/ 도메인 분할. 로더가 병합 + 도메인 충돌 게이트.
import { loadCorrections } from '../scripts/lib/corrections.mjs';

const ROOT = process.cwd();
const corr = loadCorrections(ROOT) as any;
const REG = path.join(ROOT, 'data', 'registry', 'entries');
const ids = new Set<string>();
for (const cc of fs.readdirSync(REG)) for (const fn of fs.readdirSync(path.join(REG, cc))) ids.add(JSON.parse(fs.readFileSync(path.join(REG, cc, fn), 'utf8')).stable_id);
const SID = /^(MET|POL|CER|CMP)-\d{4}$/;

describe('corrections 스키마·정합 (S3)', () => {
  it('ranges: stable_id 키 + 대상 entry 실재 (stale 없음)', () => {
    const stale: string[] = [];
    for (const [k, v] of Object.entries<any>(corr.ranges || {})) {
      expect(SID.test(k), `${k} 형식`).toBe(true);
      expect(typeof v).toBe('object');
      if (!ids.has(k)) stale.push(k);
    }
    expect(stale, 'ranges 교정 대상이 제거된 entry (dead config)').toEqual([]);
  });

  it('fields: stable_id 키 + 대상 실재', () => {
    const stale: string[] = [];
    for (const k of Object.keys(corr.fields || {})) {
      expect(SID.test(k)).toBe(true);
      if (!ids.has(k)) stale.push(k);
    }
    expect(stale).toEqual([]);
  });

  it('remove.ids: 형식 유효 + 레지스트리 부재', () => {
    for (const id of corr.remove?.ids || []) {
      expect(SID.test(id), `${id} 형식`).toBe(true);
      expect(ids.has(id), `${id} 제거됨`).toBe(false);
    }
  });

  it('remove.bases / heatTreatments 는 문자열 배열', () => {
    expect(Array.isArray(corr.remove?.bases)).toBe(true);
    expect(Array.isArray(corr.remove?.heatTreatments)).toBe(true);
    for (const b of corr.remove.bases) expect(typeof b).toBe('string');
  });

  it('aliasesByBase: base → 비어있지 않은 문자열 배열', () => {
    for (const [b, a] of Object.entries<any>(corr.aliasesByBase || {})) {
      expect(Array.isArray(a) && a.length > 0, `${b}`).toBe(true);
      for (const x of a) expect(typeof x).toBe('string');
    }
  });

  it('sourcesBySubcategory: subcat → {label, http url, verified} 배열', () => {
    for (const [, arr] of Object.entries<any>(corr.sourcesBySubcategory || {})) {
      expect(Array.isArray(arr)).toBe(true);
      for (const src of arr) {
        expect(typeof src.label).toBe('string');
        expect(/^https?:\/\//.test(src.url || ''), `${src.label} url`).toBe(true);
        expect(typeof src.verified).toBe('boolean');
      }
    }
  });

  /* H6 W3-9 — industryNoteByBase: base 키 + {t, src}. 오타난 base 는 조용히 무적용되므로
     레지스트리 base 실재를 함께 검증한다(다른 *ByBase 도메인이 못 잡던 사각지대). */
  it('industryNoteByBase: base 실재 + {t, src} 비어있지 않음', () => {
    const bases = new Set<string>();
    for (const cc of fs.readdirSync(REG)) {
      for (const fn of fs.readdirSync(path.join(REG, cc))) {
        const name = JSON.parse(fs.readFileSync(path.join(REG, cc, fn), 'utf8')).name as string;
        bases.add(String(name).split(' — ')[0]);
      }
    }
    const bad: string[] = [];
    for (const [b, v] of Object.entries<any>(corr.industryNoteByBase || {})) {
      if (!bases.has(b)) bad.push(`${b}: 실재하지 않는 base`);
      if (!v || typeof v.t !== 'string' || !v.t.trim()) bad.push(`${b}: t 없음`);
      if (!v || typeof v.src !== 'string' || !v.src.trim()) bad.push(`${b}: src 없음`);
    }
    expect(bad).toEqual([]);
  });

  it('compositionByBase 는 객체, subcategoryByBase 는 문자열 값', () => {
    for (const v of Object.values<any>(corr.compositionByBase || {})) expect(typeof v).toBe('object');
    for (const v of Object.values<any>(corr.subcategoryByBase || {})) expect(typeof v).toBe('string');
  });
});
