/* 내부마커 노출 게이트 (E15o') — 사용자 대면 텍스트에 개발 라운드 ID·작업 서사·방어/메타 문구가
 * 노출되면 실패. 두 표면을 검사한다:
 *   ① 빌드 산출물 materials.json 의 노출 필드(industry_note · elevated_temp_src · creep_rupture_src ·
 *      ranges[*].provenance · ranges[*].min_spec_source · sources[*].label) — build-from-registry 의
 *      새니타이저(1b++)가 지키는 계약.
 *   ② 콘텐츠 SSOT(부식·가공·용접·HT·인사이트·코팅·스토리·글로서리) 전 문자열 필드.
 * 주의: R41(René 41)·R250(Böhler)·R260/R350HT(레일강)·R134a(냉매) 같은 실명은 합법 —
 * 패턴은 내부 토큰 명시형만 사용한다 (범용 R\d+ 금지). */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

/** 내부 작업 서사 마커 — 어느 사용자 대면 텍스트에도 등장 금지. */
const INTERNAL_MARKERS: RegExp[] = [
  /사용자 (지시|제공)/,
  /재검증 대상/,
  /fake-variant/i,
  /벡터 추출|앵커 검증|앵커 게이트/,
  /WebFetch/i,
  /verified 강등/,
  /stale 값/,
  /REAL_PROPS|ELEV_DATA|build-materials|build-registry/,
  /\(R\d{1,3}[a-z]? 배치/,
  /R132 검증|R221 검증|\bR226[a-z]?\b|R205-R|\bR212b\b|\bR214 σf|R216:|R173 fake/,
  /sibling MET-\d/,
  /append-only|legacy_id|fp 게이트/,
];

/** 방어/메타 문구 (E15o 스윕 확정 패턴) — 콘텐츠 SSOT 한정. */
const DEFENSIVE_MARKERS: RegExp[] = [
  /그룹 (주의|기본|공통)[을은는]? ?유지/,
  /여기 판정|판정은 무의미/,
  /교정 완료|구 DB|본 DB/,
  /여지 명시|데이터 제한 명시/,
  /이 DB 의|수록 범위 밖/,
];

const hitAny = (s: string, pats: RegExp[]) => pats.find((re) => re.test(s));

describe('no-internal-leak — 빌드 산출물 노출 필드', () => {
  const mats = read('client/public/materials.json') as Record<string, unknown>[];

  it('industry_note · elevated_temp_src · creep_rupture_src 에 내부 마커 없음', () => {
    const bad: string[] = [];
    for (const m of mats) {
      for (const f of ['industry_note', 'elevated_temp_src', 'creep_rupture_src']) {
        const v = m[f];
        if (typeof v !== 'string') continue;
        const re = hitAny(v, INTERNAL_MARKERS);
        if (re) bad.push(`${m.name} .${f} ~ ${re} :: ${v.slice(0, 100)}`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('ranges provenance/min_spec_source 에 내부 마커 없음', () => {
    const bad: string[] = [];
    for (const m of mats) {
      const ranges = m.ranges as Record<string, Record<string, unknown>> | undefined;
      if (!ranges) continue;
      for (const [prop, r] of Object.entries(ranges)) {
        if (!r || typeof r !== 'object') continue;
        for (const f of ['provenance', 'min_spec_source']) {
          const v = r[f];
          if (typeof v !== 'string') continue;
          const re = hitAny(v, INTERNAL_MARKERS);
          if (re) bad.push(`${m.name} .${prop}.${f} ~ ${re} :: ${v.slice(0, 100)}`);
        }
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('sources[].label 에 내부 마커 없음', () => {
    const bad: string[] = [];
    for (const m of mats) {
      for (const s of (m.sources as { label?: string }[] | undefined) || []) {
        if (typeof s?.label !== 'string') continue;
        const re = hitAny(s.label, INTERNAL_MARKERS);
        if (re) bad.push(`${m.name} :: ${s.label.slice(0, 110)} ~ ${re}`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('no-internal-leak — 콘텐츠 SSOT', () => {
  const FILES = [
    'data/corrosion-guidance.json',
    'data/process-profiles.json',
    'data/machining-guidance.json',
    'data/selection-insights.json',
    'data/coating-recommendations.json',
    'data/ht-guidance.json',
    'data/welding-guidance.json',
    'data/alloy-stories.json',
    'data/glossary.json',
    'data/glossary-articles.json',
    'data/elevated-temp-curves.json',
  ];

  it('내부 마커·방어/메타 문구 없음 (전 문자열 필드)', () => {
    const bad: string[] = [];
    const PATS = [...INTERNAL_MARKERS, ...DEFENSIVE_MARKERS];
    for (const f of FILES) {
      const walk = (o: unknown, p: string) => {
        if (typeof o === 'string') {
          const re = hitAny(o, PATS);
          if (re) bad.push(`${f} ${p} ~ ${re} :: ${o.slice(0, 100)}`);
          return;
        }
        if (o && typeof o === 'object') {
          for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
            if (k.startsWith('_')) continue;
            walk(v, `${p}.${k}`);
          }
        }
      };
      walk(read(f), '');
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
