/*
 * R226t/E13 — 합금 개발배경(스토리) 시스템 무결성 게이트.
 *
 * 구 name-매칭(exact/base/prefix — rename 에 dead 17 발생)을 stable_id 동결로 이관한 SSOT
 * (data/alloy-stories.json)의 신뢰성 규율: (1) 스키마 (refs 필수·본문 필수·sid 실재·중복 금지),
 * (2) v2 구조(sections/timeline) 유효성, (3) 산출물 parity (부착 수·텍스트 일치·story_key),
 * (4) dead 스토리는 문서화된 집합만 (조용한 증가 차단), (5) 빌드에 name-매칭 잔재 없음.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '../client/src/lib/materials';

const ROOT = process.cwd();
const DOC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'alloy-stories.json'), 'utf8'));
const STORIES = DOC.stories as Record<string, {
  display: string; stable_ids: string[]; refs: string[]; legacy_text?: string;
  sections?: Record<string, string>; timeline?: Array<{ year: number | string; event: string; ref?: number }>;
}>;
const all: Material[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'public', 'materials.json'), 'utf8'));

const regIds = new Set<string>();
const REG = path.join(ROOT, 'data', 'registry', 'entries');
for (const cc of fs.readdirSync(REG)) for (const fn of fs.readdirSync(path.join(REG, cc))) regIds.add(fn.replace(/\.json$/, ''));

const SECTION_KEYS = new Set(['hook', 'origin', 'breakthrough', 'adoption', 'today', 'fun_fact']);
const ORDER = ['hook', 'origin', 'breakthrough', 'adoption', 'today', 'fun_fact'];
const bodyOf = (st: (typeof STORIES)[string]) =>
  st.legacy_text || ORDER.map((k) => st.sections?.[k]).filter(Boolean).join('\n\n');

/* dead(멤버 0) 허용 목록 — R226t 이관 시점 문서화. 재연결/재작성/삭제는 Opus 회차 (STORY-SYSTEM.md).
 * 여기 없는 dead 가 생기면 = 조용한 할당 상실 → 실패. */
// R226t 작문회차: aisi-420·cp-ti 재연결, aisi-4340·astm-a36-structural·wc-6co 삭제(개념중복). epdm/fkm 은 DB 에 재료 없음(향후 추가 대비).
const DOCUMENTED_DEAD = new Set(['epdm', 'fkm']);

describe('alloy-stories 스키마 무결성', () => {
  it('전 스토리: display·refs≥1·본문(legacy_text 또는 sections) 필수', () => {
    const bad: string[] = [];
    for (const [k, st] of Object.entries(STORIES)) {
      if (!st.display) bad.push(`${k}: display 없음`);
      if (!Array.isArray(st.refs) || st.refs.length < 1) bad.push(`${k}: refs 없음`);
      if (!bodyOf(st)) bad.push(`${k}: 본문 없음`);
    }
    expect(bad).toEqual([]);
  });
  it('stable_ids 전부 레지스트리 실재 + 스토리 간 중복 없음', () => {
    const bad: string[] = [];
    const seen = new Map<string, string>();
    for (const [k, st] of Object.entries(STORIES)) {
      for (const sid of st.stable_ids) {
        if (!regIds.has(sid)) bad.push(`${k}: ${sid} 미실재`);
        if (seen.has(sid)) bad.push(`${sid} 중복: ${seen.get(sid)} & ${k}`);
        seen.set(sid, k);
      }
    }
    expect(bad).toEqual([]);
  });
  it('v2 sections: 허용 키만 + 비어있지 않음 + origin·today 필수 + timeline.ref 는 refs 1-base 유효 인덱스', () => {
    const bad: string[] = [];
    for (const [k, st] of Object.entries(STORIES)) {
      if (st.sections) {
        for (const [sk, sv] of Object.entries(st.sections)) {
          if (!SECTION_KEYS.has(sk)) bad.push(`${k}: 미허용 섹션 ${sk}`);
          if (!sv || !sv.trim()) bad.push(`${k}: 빈 섹션 ${sk}`);
        }
        if (!st.sections.origin || !st.sections.today) bad.push(`${k}: v2 필수(origin·today) 누락`);
        if (st.refs.length < 2) bad.push(`${k}: v2 는 refs≥2`);
      }
      for (const t of st.timeline || []) {
        if (!t.year || !t.event) bad.push(`${k}: timeline year/event 누락`);
        if (t.ref != null && !(t.ref >= 1 && t.ref <= st.refs.length)) bad.push(`${k}: timeline ref ${t.ref} 범위 밖`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('dead(멤버 0) 스토리는 문서화된 집합과 정확히 일치', () => {
    const dead = Object.entries(STORIES).filter(([, st]) => !st.stable_ids.length).map(([k]) => k).sort();
    expect(dead).toEqual([...DOCUMENTED_DEAD].sort());
  });
});

describe('산출물 parity (materials.json)', () => {
  const expectedSids = new Map<string, string>();
  for (const [k, st] of Object.entries(STORIES)) for (const sid of st.stable_ids) expectedSids.set(sid, k);

  it('부착 수 = SSOT 멤버 총합 (403) · story 보유 entry 는 전부 story_key 보유', () => {
    const withStory = all.filter((m) => m.story);
    expect(withStory.length).toBe(expectedSids.size);
    expect(withStory.filter((m) => !m.story_key).map((m) => m.name)).toEqual([]);
  });
  it('본문·refs·key 가 SSOT 와 전량 일치 (무손실)', () => {
    const byKey = STORIES;
    const bad: string[] = [];
    for (const m of all) {
      if (!m.story_key) continue;
      const st = byKey[m.story_key];
      if (!st) { bad.push(`${m.name}: 미정의 key ${m.story_key}`); continue; }
      if (m.story !== bodyOf(st)) bad.push(`${m.name}: 본문 불일치`);
      if (JSON.stringify(m.story_refs) !== JSON.stringify(st.refs)) bad.push(`${m.name}: refs 불일치`);
    }
    expect(bad).toEqual([]);
  });
  it('v2 exemplar — Inconel 718: 6섹션 완비 + timeline 3 (ref 인덱스 유효)', () => {
    const m = all.find((x) => x.story_key === 'inconel-718');
    expect(m).toBeTruthy();
    expect(Object.keys(m!.story_v2?.sections || {}).sort()).toEqual(['adoption', 'breakthrough', 'fun_fact', 'hook', 'origin', 'today']);
    expect(m!.story_v2?.timeline?.length).toBe(3);
  });
  /* R226u 구조 2.0 — 사용자 요구: v2 는 풀 스켈레톤(6섹션) + 표준 순서 준수. */
  it('v2 전량: hook/origin/breakthrough/adoption/today/fun_fact 6섹션 완비 + 표준 순서', () => {
    const bad: string[] = [];
    for (const [k, st] of Object.entries(STORIES)) {
      if (!st.sections) continue;
      for (const req of ORDER) if (!(st.sections as Record<string, string>)[req]) bad.push(`${k}:${req} 누락`);
      const keys = Object.keys(st.sections);
      const ref = ORDER.filter((x) => keys.includes(x));
      if (JSON.stringify(keys) !== JSON.stringify(ref)) bad.push(`${k}: 순서 ${keys.join(',')}`);
    }
    expect(bad).toEqual([]);
  });
  it('재연결 앵커 — A-286·2205 Duplex·CBN 이 스토리 보유 (dead 복구 회귀 방지)', () => {
    for (const rx of [/Carpenter A-286/, /^2205 Duplex Stainless/, /CBN \(cubic Boron Nitride/]) {
      const m = all.find((x) => rx.test(x.name));
      expect(m?.story, String(rx)).toBeTruthy();
    }
  });
});

describe('name-매칭 잔재 부재 (ID 원칙)', () => {
  it('build-materials 에 스토리 주입 없음 · 레거시 3파일 소멸 · build-from-registry 는 stable_id 부착', () => {
    const bm = fs.readFileSync(path.join(ROOT, 'scripts', 'build-materials.mjs'), 'utf8');
    expect(/material-stories(-r1[47]\d)?\.json'/.test(bm)).toBe(false);
    expect(bm.includes('m.story =')).toBe(false);
    for (const f of ['material-stories.json', 'material-stories-r149.json', 'material-stories-r177.json'])
      expect(fs.existsSync(path.join(ROOT, 'data', f)), f).toBe(false);
    const bfr = fs.readFileSync(path.join(ROOT, 'scripts', 'build-from-registry.mjs'), 'utf8');
    expect(bfr.includes('STORY_BY_SID.get(rec.stable_id)')).toBe(true);
  });
  it('레지스트리 entry 에 baked story 없음 (콘텐츠/값 분리)', () => {
    // 샘플 전수는 비용 큼 — met 디렉터리 전수 스캔 (923 파일, JSON parse 없이 문자열 검사)
    const dirs = ['met', 'pol', 'cer', 'cmp'];
    const bad: string[] = [];
    for (const cc of dirs) {
      for (const fn of fs.readdirSync(path.join(REG, cc))) {
        const raw = fs.readFileSync(path.join(REG, cc, fn), 'utf8');
        if (raw.includes('"story"')) bad.push(`${cc}/${fn}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
