/*
 * R226j/C6 — 공정 프로파일 시스템 무결성 게이트.
 *
 * ID 기반 시스템의 "오류를 막는 필터": (1) 전 entry 할당 존재, (2) stale ID 없음,
 * (3) 할당 키 ↔ 콘텐츠 키 parity (mach/guidance/insight/ht/weld/htc), (4) overrides 스키마(src 필수),
 * (5) 인사이트 그룹 양방향 사용. 어긋나면 CI 가 빨간불 — 조용한 미표시/오표시가 불가능해진다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { FAMILIES } from '../client/src/lib/ht-alloy-specific';

const ROOT = process.cwd();
const readJ = (p: string) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const ASSIGN = readJ('data/process-profile-assignments.json');
const PROFILES = readJ('data/process-profiles.json');
const GUIDANCE = readJ('data/machining-guidance.json').guidance as Record<string, string>;
const INSIGHTS = readJ('data/selection-insights.json').groups as Record<string, any>;
const OVERRIDES = readJ('data/process-profile-overrides.json').overrides as Record<string, any>;

// 레지스트리 stable_id 전수
const regIds = new Set<string>();
const REG = path.join(ROOT, 'data', 'registry', 'entries');
for (const cc of fs.readdirSync(REG)) for (const fn of fs.readdirSync(path.join(REG, cc))) regIds.add(fn.replace(/\.json$/, ''));

const A = ASSIGN.assignments as Record<string, any>;
const METAL_KEYS = new Set(Object.keys(PROFILES.machinability.metal));
const POLY_KEYS = new Set(Object.keys(PROFILES.machinability.polymer));
const HT_FAMILY_NAMES = new Set(FAMILIES.map(f => f.familyName));
const HTC_CLASSES = new Set(['case', 'aged', 'qt', 'soft', 'as-built', 'hip', 'cold']);

describe('process-profile-assignments 무결성', () => {
  it('레지스트리 전 entry 에 할당 레코드 존재 (누락 = 빌드 게이트와 동일)', () => {
    const missing = [...regIds].filter(id => !A[id]);
    expect(missing).toEqual([]);
  });
  it('stale 할당 없음 (레지스트리에 없는 ID)', () => {
    const stale = Object.keys(A).filter(id => !regIds.has(id));
    expect(stale).toEqual([]);
  });
  it('mach 키는 콘텐츠에 정의됨 (metal/polymer)', () => {
    const bad = Object.entries(A).filter(([, a]) => a.mach && !METAL_KEYS.has(a.mach) && !POLY_KEYS.has(a.mach));
    expect(bad.map(([id, a]) => `${id}:${a.mach}`)).toEqual([]);
  });
  it('weld ∈ {ce,schaeffler,none} · htc ∈ 정의 클래스', () => {
    const badW = Object.entries(A).filter(([, a]) => a.weld && !PROFILES.weld_models[a.weld]);
    const badH = Object.entries(A).filter(([, a]) => a.htc && !HTC_CLASSES.has(a.htc));
    expect(badW).toEqual([]);
    expect(badH).toEqual([]);
  });
  it('ht familyName 은 클라이언트 FAMILIES 에 존재 (빌드 파싱 ↔ 콘텐츠 parity)', () => {
    const bad = Object.entries(A).filter(([, a]) => a.ht && !HT_FAMILY_NAMES.has(a.ht));
    expect(bad.map(([id, a]) => `${id}:${a.ht}`)).toEqual([]);
  });
  it('insight 키는 selection-insights 에 정의됨 + 모든 그룹이 실제 사용됨 (죽은 콘텐츠 방지)', () => {
    const used = new Set(Object.values(A).map((a: any) => a.insight).filter(Boolean));
    const badRef = [...used].filter(k => !INSIGHTS[k as string]);
    const dead = Object.keys(INSIGHTS).filter(k => !used.has(k));
    expect(badRef).toEqual([]);
    expect(dead).toEqual([]);
  });
});

describe('콘텐츠 내부 무결성', () => {
  it('metal 프로파일 guidance_key 는 machining-guidance 에 존재', () => {
    const bad = Object.entries(PROFILES.machinability.metal as Record<string, any>)
      .filter(([, p]) => p.guidance_key && !GUIDANCE[p.guidance_key]);
    expect(bad.map(([k, p]) => `${k}→${p.guidance_key}`)).toEqual([]);
  });
  it('condition_notes 키 형식 mach|htc — 양쪽 모두 정의된 키', () => {
    const bad = Object.keys(PROFILES.condition_notes).filter(k => {
      if (k.startsWith('_')) return false;
      const [mach, htc] = k.split('|');
      return !(METAL_KEYS.has(mach) || POLY_KEYS.has(mach)) || !HTC_CLASSES.has(htc);
    });
    expect(bad).toEqual([]);
  });
  it('metal 프로파일 필수 필드 (rating 1..110 · band · label · note)', () => {
    const bad = Object.entries(PROFILES.machinability.metal as Record<string, any>)
      .filter(([, p]) => !(p.rating >= 1 && p.rating <= 110) || !['easy', 'normal', 'hard', 'very_hard'].includes(p.band) || !p.label || !p.note);
    expect(bad.map(([k]) => k)).toEqual([]);
  });
  it('인사이트 그룹 필수 필드 (title·intro·picks≥3·sources≥1, pick 은 when/use/why)', () => {
    const bad = Object.entries(INSIGHTS).filter(([, g]: [string, any]) =>
      !g.title || !g.intro || !Array.isArray(g.picks) || g.picks.length < 3 || !g.sources?.length
      || g.picks.some((p: any) => !p.when || !p.use || !p.why));
    expect(bad.map(([k]) => k)).toEqual([]);
  });
});

describe('overrides 스키마', () => {
  it('모든 override 는 src 인용 필수 + 레지스트리 ID', () => {
    const bad = Object.entries(OVERRIDES).filter(([id, o]: [string, any]) => !o.src || !regIds.has(id));
    expect(bad.map(([id]) => id)).toEqual([]);
  });
});

describe('할당 커버리지 (정보 리포트)', () => {
  it('금속 mach 커버리지 출력', () => {
    const metals = Object.entries(A).filter(([id]) => id.startsWith('MET-'));
    const withMach = metals.filter(([, a]) => a.mach).length;
    console.log(`금속 mach 할당: ${withMach}/${metals.length} (${Math.round(withMach / metals.length * 100)}%) — 미할당은 카드 미표시(안전), 확장은 overrides`);
    expect(withMach).toBeGreaterThan(500);
  });
});
