/*
 * A10 — 런타임 문자열 매처 전수 감사 (T651→T6 조건 오선택 교훈의 일반화).
 *
 * 원칙: "더 특이한(긴) 후보가 존재하는데 짧은 후보가 선택"되는 경로를 실제 함수 호출로 전수 검출.
 * 대상: ① htAlloySpecificFor(조건 코드) ② htGlossaryFor(HT 용어) ③ am_map.byHt(접두 잠식)
 *       ④ matchHeatTreatment(필터 — 광의 매칭 의도이나 의미 오염은 버그: Hardened↔가공경화)
 * 판정 3분류: 버그(여기 게이트)·정당(광의 필터 OR 의미)·판정보류(리포트 출력).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { FAMILIES, htAlloySpecificFor } from '@/lib/ht-alloy-specific';
import { htGlossaryFor, HT_GLOSSARY_ENTRIES } from '@/lib/ht-glossary';
import { matchHeatTreatment } from '@/lib/ht-matcher';
import type { Material } from '@/lib/materials';
import htGuidance from '../data/ht-guidance.json';

const mats: Material[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'client/public/materials.json'), 'utf8'));
const norm = (s: string) => String(s || '').toLowerCase().trim().replace(/[_]/g, ' ').replace(/\s+/g, ' ');

describe('① htAlloySpecificFor — 조건 코드 최특이 선택 (전 재료)', () => {
  it('heat_treatment/name 후보 중 최장 코드가 선택된다 (H5 수정의 전수 회귀)', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const m of mats) {
      const famName = (m.profiles as any)?.ht as string | undefined;
      if (!famName) continue;
      const fam = FAMILIES.find((f) => f.familyName === famName);
      if (!fam) continue;
      const res = htAlloySpecificFor(m.name, m.heat_treatment, famName);
      if (!res) continue;
      const pickedCodes = Object.entries(fam.conditions).filter(([, d]) => d === res.description).map(([c]) => c);
      if (!pickedCodes.length) continue; // fallback (peak-aged 등) — 후보 검사 비대상
      const htStr = norm(m.heat_treatment || '');
      const nameStr = norm(m.name);
      const htCands = htStr ? Object.keys(fam.conditions).filter((c) => htStr.includes(c)) : [];
      const cands = htCands.length
        ? htCands
        : Object.keys(fam.conditions).filter((c) => new RegExp(`\\b${c.replace(/[+().°]/g, '\\$&')}\\b`, 'i').test(nameStr));
      if (!cands.length) continue;
      const maxLen = Math.max(...cands.map((c) => c.length));
      if (!pickedCodes.some((c) => c.length === maxLen)) {
        bad.push(`${m.name} :: 후보[${cands.join(',')}] 중 선택[${pickedCodes.join(',')}]`);
      }
      checked++;
    }
    console.log(`htAlloySpecificFor 특이성 검사: ${checked} entry`);
    expect(bad, bad.slice(0, 5).join(' / ')).toEqual([]);
  });
});

describe('② htGlossaryFor — HT 용어 최특이 선택 (A9 수정 게이트)', () => {
  it('전 heat_treatment 문자열에서 매칭 최장 키의 entry 가 반환된다', () => {
    const bad: string[] = [];
    const seen = new Set<string>();
    for (const m of mats) {
      const ht = String(m.heat_treatment || '');
      if (!ht || seen.has(ht)) continue;
      seen.add(ht);
      const k = norm(ht);
      const res = htGlossaryFor(ht);
      const bCands: { len: number; entry: unknown }[] = [];
      const pCands: { len: number; entry: unknown }[] = [];
      for (const [keys, entry] of HT_GLOSSARY_ENTRIES) {
        for (const key of keys) {
          if (k === key || k.startsWith(key + ' ') || k.endsWith(' ' + key)) bCands.push({ len: key.length, entry });
          else if (k.includes(key)) pCands.push({ len: key.length, entry });
        }
      }
      const pool = bCands.length ? bCands : pCands;
      if (!pool.length) { if (res) bad.push(`${ht} :: 후보 0 인데 반환 존재`); continue; }
      const maxLen = Math.max(...pool.map((c) => c.len));
      const bestEntries = pool.filter((c) => c.len === maxLen).map((c) => c.entry);
      if (!res || !bestEntries.includes(res)) bad.push(`${ht} :: 최장 ${maxLen} 아닌 entry 선택`);
    }
    console.log(`htGlossaryFor 검사: 고유 HT 문자열 ${seen.size}`);
    expect(bad, bad.slice(0, 5).join(' / ')).toEqual([]);
  });
});

describe('③ am_map.byHt — 접두 잠식 없음 (구조 게이트)', () => {
  it('짧은 prefix 가 긴 prefix 를 가리는 조합 0', () => {
    const am = (htGuidance as any).am_map as { byHt: Record<string, string> } | undefined;
    if (!am) return;
    const ks = Object.keys(am.byHt);
    const shadow: string[] = [];
    for (const a of ks) for (const b of ks) {
      if (a !== b && b.startsWith(a) && ks.indexOf(a) < ks.indexOf(b) && am.byHt[a] !== am.byHt[b]) shadow.push(`${a} ⊂ ${b}`);
    }
    expect(shadow).toEqual([]);
  });
});

describe('④ HT 필터 — 의미 오염 교정 (Hardened ↔ 가공경화) + 신설 카테고리', () => {
  it('순수 가공경화는 Hardened 탈락·Cold-worked 포함, 침탄/질화·age hardened 는 제 카테고리로', () => {
    expect(matchHeatTreatment('strain-hardened', 'hardened')).toBe(false);
    expect(matchHeatTreatment('strain-hardened', 'cold-worked / strain-hardened')).toBe(true);
    expect(matchHeatTreatment('h321 (strain-hardened + stabilized)', 'cold-worked / strain-hardened')).toBe(true);
    expect(matchHeatTreatment('carburized + quenched', 'hardened')).toBe(true);
    expect(matchHeatTreatment('nitrided', 'hardened')).toBe(true);
    expect(matchHeatTreatment('precipitation hardened after cold work', 'aged / precipitation')).toBe(true);
    expect(matchHeatTreatment('precipitation hardened after cold work', 'hardened')).toBe(false);
    expect(matchHeatTreatment('age hardened', 'aged / precipitation')).toBe(true);
    // 혼합 상태는 양쪽 다 (cold rolled + peak age hardened → Aged + Cold-worked)
    expect(matchHeatTreatment('th04 — cold rolled 37% + peak age hardened', 'aged / precipitation')).toBe(true);
    expect(matchHeatTreatment('th04 — cold rolled 37% + peak age hardened', 'cold-worked / strain-hardened')).toBe(true);
  });
  it('리포트 — 어떤 카테고리에도 안 걸리는 heat_treatment (판정보류 목록)', () => {
    const CATS = ['none / as-supplied', 'annealed', 'solution treated', 'aged / precipitation', 'quenched & tempered', 'hip (hot isostatic)', 'stress-relieved', 'normalized', 'hardened', 'cold-worked / strain-hardened'];
    const uncat = new Set<string>();
    for (const m of mats) {
      const ht = String(m.heat_treatment || '').toLowerCase();
      if (!ht) continue;
      if (!CATS.some((c) => matchHeatTreatment(ht, c))) uncat.add(ht.slice(0, 44));
    }
    console.log(`카테고리 무매칭 HT: ${uncat.size}종 — ${[...uncat].slice(0, 12).join(' | ')}`);
    // A10 교정 후 실측 33종 — 잔여는 비열처리 라벨(폴리머 dry as-molded·폼 밀도·범칭 heat-treated 등) 판정보류 정당.
    expect(uncat.size).toBeLessThan(40);
  });
});
