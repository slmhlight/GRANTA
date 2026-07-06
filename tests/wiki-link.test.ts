/*
 * R227/E14/H2b — 스토리 본문 인라인 auto-link(linkify) 게이트.
 * 로직은 합성 맵으로(데이터 독립), 정밀도는 실제 wiki-index 로 검증.
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
