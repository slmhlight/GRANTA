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
import { gradeGuidanceFor } from '../client/src/lib/process-guidance';
import type { Material } from '../client/src/lib/materials';

const ROOT = process.cwd();
const readJ = (p: string) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const ASSIGN = readJ('data/process-profile-assignments.json');
const PROFILES = readJ('data/process-profiles.json');
const GUIDANCE = readJ('data/machining-guidance.json').guidance as Record<string, { text: string; sources?: string[] }>;
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
  it('htg/wg 키는 가이드 콘텐츠에 정의됨 (R226k)', () => {
    const HTG = readJ('data/ht-guidance.json').blocks as Record<string, any>;
    const WGB = readJ('data/welding-guidance.json').blocks as Record<string, any>;
    const badH = Object.entries(A).filter(([, a]) => a.htg && !HTG[a.htg]);
    const badW = Object.entries(A).filter(([, a]) => a.wg && !WGB[a.wg]);
    expect(badH.map(([id, a]) => `${id}:${a.htg}`)).toEqual([]);
    expect(badW.map(([id, a]) => `${id}:${a.wg}`)).toEqual([]);
  });
  it('insight 키는 selection-insights 에 정의됨 + 모든 그룹이 실제 사용됨 (죽은 콘텐츠 방지)', () => {
    const used = new Set(Object.values(A).map((a: any) => a.insight).filter(Boolean));
    const badRef = [...used].filter(k => !INSIGHTS[k as string]);
    const dead = Object.keys(INSIGHTS).filter(k => !used.has(k));
    expect(badRef).toEqual([]);
    expect(dead).toEqual([]);
  });
});

describe('F2 — 콘텐츠 SSOT 를 타입으로 읽는다', () => {
  /* process-guidance.ts 가 JSON 을 `as any` 로 지우고 원하는 타입을 씌우던 것을 걷어내고
     **선언한 타입에 대입**하도록 바꿨다. 그래야 SSOT 의 모양이 바뀌면 tsc 가 잡는다 —
     W4-7 에서 machining 블록을 문자열→객체로 바꿨을 때 컴파일이 조용히 통과했던 전례가 있다.

     대입 검사에는 구멍이 하나 있다: JSON 의 문자열은 리터럴 유니온이 아니라 string 으로
     추론되므로, band 같은 필드는 tsc 가 값을 못 본다. 런타임에서 좁히되(narrowBand),
     그 예외가 **실제로는 죽은 코드**임을 여기서 못박는다. */
  const BANDS = { metal: ['easy', 'normal', 'hard', 'very_hard'], polymer: ['easy', 'normal', 'hard'] };

  it('로드 중 버려진 SSOT 항목이 없다', async () => {
    /* 좁히기에 실패한 항목은 예외를 던지지 않고 **미수록**된다 — 이 리더들은 useMaterialFilter 가
       정적 import 하므로, 모듈 로드 예외는 React 가 뜨기도 전에 앱 전체를 백지로 만든다.
       대신 SSOT_ISSUES 에 기록하고 여기서 비어 있음을 검사한다. */
    await import('@/lib/process-guidance');
    await import('@/lib/corrosion-guidance');
    const { SSOT_ISSUES } = await import('@/lib/ssot-json');
    expect(SSOT_ISSUES, `SSOT 로드 중 버려진 항목 ${SSOT_ISSUES.length}건 — ${SSOT_ISSUES.join(' | ')}`).toEqual([]);
  });

  it('machinability band 는 정해진 값만 쓴다 (버려짐 없이 전건 좁혀진다)', () => {
    const bad: string[] = [];
    for (const kind of ['metal', 'polymer'] as const) {
      for (const [k, v] of Object.entries(PROFILES.machinability[kind] as Record<string, any>)) {
        if (!BANDS[kind].includes(v.band)) bad.push(`${kind}.${k}: "${v.band}"`);
      }
    }
    expect(bad, `허용되지 않은 band ${bad.length}건: ${bad.join(' | ')}`).toEqual([]);
  });

  it('콘텐츠 SSOT 해석기는 JSON 을 any 로 읽지 않는다', () => {
    /* `(json as any).key as T` 는 tsc 를 두 번 우회한다 — any 로 지운 뒤 원하는 타입을 씌우므로
       실제 모양이 달라도 통과한다. 다시 들어오면 여기서 막는다. */
    const READERS = ['client/src/lib/process-guidance.ts', 'client/src/lib/corrosion-guidance.ts', 'client/src/lib/ssot-json.ts'];
    const src = READERS.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    // 주석은 제거하고 본다 — 이 파일의 설명문이 `as any` 를 인용하고 있다.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    const hits = code.match(/as any|:\s*any(?![A-Za-z0-9_])/g) ?? [];
    expect(hits, `SSOT 리더에 any ${hits.length}건 — 콘텐츠 SSOT 는 타입으로 읽어야 한다 (${READERS.join(' · ')})`).toEqual([]);
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

/* W20 — grade 별 authored 가이드 선택 (by_grade). 재료는 자기 grade 콘텐츠만 조회, 형제 grade 미포함.
 * 핵심: (1) 정확한 grade 선택 (2) 숫자 경계로 오탐 방지(4140≠14140) (3) 별칭(SCM440=4140) 매칭. */
describe('W20 grade 별 가이드 선택 (gradeGuidanceFor)', () => {
  const M = (name: string, aliases: string[] = []): Material => ({ name, aliases } as Material);
  const BG = { '304': 'C304', '316': 'C316', '321': 'C321', '347': 'C347' };

  it('현재 재료 grade 의 콘텐츠만 선택 (형제 미포함)', () => {
    expect(gradeGuidanceFor(BG, M('AISI 304 — Annealed'))).toBe('C304');
    expect(gradeGuidanceFor(BG, M('AISI 316L / STS316L'))).toBe('C316'); // 316L → 316 키
    expect(gradeGuidanceFor(BG, M('AISI 321'))).toBe('C321');
  });

  it('숫자 경계 — 부분 숫자 오탐 방지', () => {
    // 4140 키가 14140·41400 에 오매칭되지 않음
    expect(gradeGuidanceFor({ '4140': 'X' }, M('AISI 14140 (가상)'))).toBeNull();
    expect(gradeGuidanceFor({ '414': 'X' }, M('AISI 4140'))).toBeNull(); // 414 ⊄ 4140 (경계)
  });

  it('별칭(cross-standard)으로도 grade 매칭', () => {
    expect(gradeGuidanceFor({ '4140': 'CrMo' }, M('42CrMo4', ['AISI 4140', 'SCM440']))).toBe('CrMo');
  });

  it('가장 구체적(긴) 키 우선 · 미해당 재료는 null', () => {
    expect(gradeGuidanceFor({ '440': 'A', '440C': 'B' }, M('AISI 440C'))).toBe('B');
    expect(gradeGuidanceFor(BG, M('AISI 310S'))).toBeNull(); // 310S 는 by_grade 에 없음 → 공통만
    expect(gradeGuidanceFor(undefined, M('AISI 304'))).toBeNull();
  });
});
