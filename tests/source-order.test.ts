/*
 * G3-2 — 출처 정렬 게이트: "첫 출처 = 검색결과 페이지" 재발 차단.
 * 감사(2026-07): 245 재료의 첫 출처가 MatWeb QuickText 검색 URL(문서 추적 불가)이었음 →
 * build-from-registry 1b+ 가 권위 우선·검색링크 최하위로 정렬(presentation — 값 SSOT 불변).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '@/lib/materials';

const mats: Material[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'client/public/materials.json'), 'utf8'));
const isSearchUrl = (u?: string | null) => /QuickText\.aspx|[?&]SearchText=|\/search\?|google\.[a-z.]+\/search|bing\.com\/search/i.test(u || '');

describe('출처 정렬 (G3-2)', () => {
  it('출처 ≥2 인 재료의 첫 출처는 검색결과 URL 이 아니다', () => {
    const bad = mats
      .filter((m) => (m.sources || []).length >= 2 && isSearchUrl(m.sources![0].url))
      .map((m) => m.name);
    expect(bad, `첫 출처가 검색링크: ${bad.slice(0, 5).join(' / ')}`).toEqual([]);
  });
  it('권위 역전 없음 — 검색링크 앞에 오는 standard/handbook 출처 존재 시 검색링크는 뒤', () => {
    const bad: string[] = [];
    for (const m of mats) {
      const srcs = m.sources || [];
      const searchIdx = srcs.findIndex((s) => isSearchUrl(s.url));
      if (searchIdx === -1) continue;
      const laterAuthority = srcs.slice(searchIdx + 1).some((s: any) => s.authority === 'standard' || s.authority === 'handbook');
      if (laterAuthority) bad.push(m.name);
    }
    expect(bad, bad.slice(0, 5).join(' / ')).toEqual([]);
  });
  it('통계 리포트 — 검색링크 보유 현황 (GUID 딥링크 교체 후보 큐)', () => {
    const withSearch = mats.filter((m) => (m.sources || []).some((s) => isSearchUrl(s.url)));
    console.log(`검색링크 보유 재료: ${withSearch.length} (전부 최하위 정렬됨 — G3-2a GUID 교체 후보)`);
    expect(withSearch.length).toBeLessThan(400);
  });
});
