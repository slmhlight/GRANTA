/*
 * H6 G3-1 — 고온곡선 출처 전파 게이트.
 * 배경: elevated_temp 보유 239 entry 중 211 의 출처가 build-materials 코드 주석에만 존재
 * (데이터 필드 미전파·UI 미표시). 곡선 값은 있는데 "어디서 온 값인지" 를 사용자가 알 수 없었음.
 * 원칙: 출처가 기록되지 않은 배치(R24·REAL_PROPS 일부)는 "개별 인용 미기재 · 재검증 대상" 으로
 * 정직하게 라벨 — 거짓 인용 금지.
 * 게이트: elevated_temp 가 있으면 elevated_temp_src 필수 (빈 문자열 불가).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const mats = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'client/public/materials.json'), 'utf8'));

describe('고온곡선 출처 전파 (H6 G3-1)', () => {
  it('elevated_temp 보유 entry 전부 elevated_temp_src 보유', () => {
    const missing = mats
      .filter((m: any) => m.elevated_temp && m.elevated_temp.length && !(typeof m.elevated_temp_src === 'string' && m.elevated_temp_src.trim()))
      .map((m: any) => m.name);
    expect(missing, `곡선은 있는데 출처 필드 없는 entry ${missing.length}:\n${missing.slice(0, 15).join('\n')}`).toEqual([]);
  });

  it('출처 앵커 — 검증 배치는 문서 수준 인용 유지', () => {
    const i718 = mats.find((m: any) => /^Inconel 718/.test(m.name) && m.elevated_temp && m.elevated_temp.length);
    expect(i718?.elevated_temp_src, `Inconel 718 곡선 출처 (${i718?.name})`).toMatch(/Special Metals|핸드북|Granta/);
    const h282 = mats.find((m: any) => /Haynes 282/.test(m.name) && m.elevated_temp && m.elevated_temp.length);
    if (h282) expect(h282.elevated_temp_src, `Haynes 282 (${h282.name})`).toMatch(/H-3173F|Granta|핸드북/);
  });
});
