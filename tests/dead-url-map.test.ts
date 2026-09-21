/*
 * AUD F11 (2026-09-22) — 죽은 URL 재발 게이트.
 * data/r208-url-replacements.json 의 replacements 키는 "확인된 죽은 URL" 목록이다(2026-09-22 외부 감사 404 57건 포함).
 * 산출물(materials.json)의 출처 URL 에 그 키가 다시 나타나면 상류 파일 어딘가에서 옛 주소가 되살아난 것이다.
 * (네트워크 검사는 pnpm verify:urls / url-health 워크플로가 담당 — 이 게이트는 오프라인 불변식.)
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '@/lib/materials';

const ROOT = process.cwd();
const ALL: Material[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'client/public/materials.json'), 'utf8'));
const r208 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/r208-url-replacements.json'), 'utf8')) as { replacements: Record<string, string> };
const DEAD = new Set(Object.entries(r208.replacements).filter(([k, v]) => k !== v).map(([k]) => k));

describe('죽은 URL 맵 (F11)', () => {
  it('교체 맵의 옛 주소가 산출물 출처에 남아 있지 않다', () => {
    const bad: string[] = [];
    for (const m of ALL) for (const s of (m.sources || []) as Array<{ url?: string | null }>) if (s.url && DEAD.has(s.url)) bad.push(`${m.name}: ${s.url}`);
    expect(bad.slice(0, 10)).toEqual([]);
  });
  it('감사 404 대표 URL(ASM Vol.1/2 구주소·Haynes 구 슬러그·copper.org properties)이 맵에 있고 새 주소는 옛 주소와 다르다', () => {
    for (const k of [
      'https://www.asminternational.org/asm-handbook-volume-1-properties-and-selection-irons-steels-and-high-performance-alloys',
      'https://www.asminternational.org/asm-handbook-volume-2-properties-and-selection-nonferrous-alloys-and-special-purpose-materials',
      'https://haynesintl.com/en/alloys/alloy/haynes-282-alloy',
      'https://www.copper.org/resources/properties/db/results.php?Bid=C71500',
    ]) {
      expect(DEAD.has(k), k).toBe(true);
      expect(r208.replacements[k]).not.toBe(k);
      expect(/^https:\/\//.test(r208.replacements[k])).toBe(true);
    }
  });
  it('ASM 핸드북 인용은 ASM Digital Library 주소를 쓴다', () => {
    const asm = ALL.flatMap((m) => (m.sources || []) as Array<{ url?: string | null; label?: string }>).filter((s) => /ASM Handbook Vol\.\s?[12]\b/.test(s.label || '') && s.url);
    expect(asm.length).toBeGreaterThan(100);
    const dl = asm.filter((s) => /^https:\/\/dl\.asminternational\.org\/handbooks\/edited-volume\/(16|14)\//.test(s.url || ''));
    expect(dl.length).toBeGreaterThan(100);
    // 구 asminternational.org 볼륨 페이지(404)는 0 — 다른 정상 주소(DL 챕터·handbooks 랜딩·SAE 병기)는 허용
    const dead = asm.filter((s) => /asminternational\.org\/asm-handbook-volume-[12]-/.test(s.url || ''));
    expect(dead.map((s) => s.url)).toEqual([]);
  });
});
