/*
 * R227/E14/H1 — 위키 상호참조 인덱스 게이트 (Phase 1).
 *
 * 검증: (1) 스키마·slug 유니크, (2) rep_stable_id 가 스토리 멤버·유효 결정성,
 * (3) surface_form 정제(영숫자·비-junk), (4) ambiguous form 은 autolink=false,
 * (5) staleness — inputHashes 가 현재 materials.json/alloy-stories.json 과 일치(미재빌드 검출),
 * (6) 대표 해석 앵커(ti6al4v→ti-6al-4v·aermet100→aermet-100 등).
 *
 * 렌더 없음(Phase1) — 이 게이트는 파생 인덱스 무결성만 본다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const rd = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const materialsRaw = rd('client/public/materials.json');
const storiesRaw = rd('data/alloy-stories.json');
const IDX = JSON.parse(rd('client/public/wiki-index.json')) as {
  version: number;
  inputHashes: { materials: string; stories: string };
  entities: Array<{
    id: string; type: string; display: string; story_key: string; rep_stable_id: string; rep_id: string | null;
    surface_forms: Array<{ form: string; sid: string; id: string | null; autolink?: boolean; ambiguous?: boolean }>;
    uns: string[]; member_count: number;
  }>;
};
const STORIES = JSON.parse(storiesRaw).stories as Record<string, { stable_ids: string[] }>;
const BL = JSON.parse(rd('client/public/wiki-backlinks.json')) as {
  generated_from: { materials: string; stories: string };
  backlinks: Record<string, string[]>;
};
const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const entIds = new Set(IDX.entities.map((e) => e.id));

describe('wiki-index 스키마·무결성 (R227/E14/H1)', () => {
  it('엔티티 존재 + 필수 필드', () => {
    expect(IDX.entities.length).toBeGreaterThan(200);
    for (const e of IDX.entities) {
      expect(e.id, 'id').toBeTruthy();
      expect(e.type).toBe('material');
      expect(e.story_key, `${e.id} story_key`).toBeTruthy();
      expect(e.rep_stable_id, `${e.id} rep`).toMatch(/^[A-Z]{3}-\d+/);
      expect(e.rep_id, `${e.id} rep_id(legacy — 클라이언트 네비게이션)`).toBeTruthy();
      expect(Array.isArray(e.surface_forms) && e.surface_forms.length > 0, `${e.id} forms`).toBe(true);
    }
  });

  it('rep_id 는 실제 materials entry 로 해석됨 (클라이언트 네비게이션 유효)', () => {
    const mIds = new Set((JSON.parse(materialsRaw) as Array<{ id: string }>).map((x) => x.id));
    const bad = IDX.entities.filter((e) => !mIds.has(e.rep_id!)).map((e) => e.id);
    expect(bad).toEqual([]);
  });

  it('엔티티 id(slug) 유니크', () => {
    const ids = IDX.entities.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rep_stable_id 는 해당 스토리의 멤버 (결정적 유효)', () => {
    const bad: string[] = [];
    for (const e of IDX.entities) {
      const members = STORIES[e.story_key]?.stable_ids || [];
      if (!members.includes(e.rep_stable_id)) bad.push(`${e.id}: rep ${e.rep_stable_id} ∉ 멤버`);
    }
    expect(bad).toEqual([]);
  });

  it('surface_form 정제: 영숫자·길이·비-junk', () => {
    const bad: string[] = [];
    for (const e of IDX.entities) for (const sf of e.surface_forms) {
      if (!/^[a-z0-9]+$/.test(sf.form)) bad.push(`${e.id}: 비영숫자 "${sf.form}"`);
      if (sf.form.length < 2 || sf.form.length > 24) bad.push(`${e.id}: 길이 "${sf.form}"`);
      if (/^\d+h$/.test(sf.form) || /^\d{1,2}$/.test(sf.form)) bad.push(`${e.id}: junk "${sf.form}"`);
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('ambiguous form 은 autolink=false (§D 규칙)', () => {
    const bad: string[] = [];
    for (const e of IDX.entities) for (const sf of e.surface_forms) {
      if (sf.ambiguous && sf.autolink) bad.push(`${e.id}: ${sf.form} ambiguous+autolink`);
    }
    expect(bad).toEqual([]);
  });

  // H5-D1 (W2) — 폼 소유권: 서술구 오주입(SUS304→AISI 302) 데이터 수정 잠금 + 이름>별칭 규칙.
  it('SUS304/STS304 는 AISI 302 엔티티에 귀속되지 않음 (aliasesFor 서술구 오주입 회귀 차단)', () => {
    const e302 = IDX.entities.find((e) => e.id === 'aisi-302');
    if (e302) {
      const forms = new Set(e302.surface_forms.map((s) => s.form));
      expect([...forms].filter((f) => f === 'sus304' || f === 'sts304'), 'aisi-302 에 304 JIS/KS 폼 잔존').toEqual([]);
    }
  });

  it('폼 소유권 — 소유 확정 시 비-소유 엔티티는 autolink 억제(owned_by 표식)', () => {
    const bad: string[] = [];
    for (const e of IDX.entities) for (const sf of e.surface_forms as Array<{ form: string; autolink?: boolean; owned_by?: string }>) {
      if (sf.owned_by && sf.owned_by !== e.id && sf.autolink) bad.push(`${e.id}: ${sf.form} owned_by ${sf.owned_by} 인데 autolink`);
    }
    expect(bad).toEqual([]);
  });

  it('autolink=true form 은 len≥4·알파벳 포함 (순수숫자/약어 제외; 3자는 화이트리스트만)', async () => {
    // H4f-C — 검증된 3자 grade 코드 화이트리스트 (name-tokens SHORT_AUTOLINK_OK 와 동일 SSOT)
    const { SHORT_AUTOLINK_OK } = await import('../scripts/lib/name-tokens.mjs');
    const bad: string[] = [];
    for (const e of IDX.entities) for (const sf of e.surface_forms) {
      if (!sf.autolink) continue;
      if (sf.form.length < 4 && !SHORT_AUTOLINK_OK.has(sf.form)) bad.push(`${e.id}: 짧은 autolink "${sf.form}"`);
      if (!/[a-z]/.test(sf.form)) bad.push(`${e.id}: 숫자만 autolink "${sf.form}"`);
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('staleness — inputHashes 가 현재 산출물과 일치 (미재빌드 검출)', () => {
    // 불일치 시: `pnpm build:data && pnpm build:wiki` 재실행 필요.
    expect(IDX.inputHashes.materials).toBe(hash(materialsRaw));
    expect(IDX.inputHashes.stories).toBe(hash(storiesRaw));
  });

  it('대표 해석 앵커 — 이름→엔티티/rep 매핑', () => {
    const formToEnt = new Map<string, string>();
    for (const e of IDX.entities) for (const sf of e.surface_forms) {
      if (!formToEnt.has(sf.form)) formToEnt.set(sf.form, e.id);
    }
    // ti6al4v 는 ti-6al-4v 엔티티에 존재
    expect(IDX.entities.find((e) => e.id === 'ti-6al-4v')?.surface_forms.some((s) => s.form === 'ti6al4v')).toBe(true);
    // aermet100 → aermet-100
    expect(IDX.entities.find((e) => e.id === 'aermet-100')?.surface_forms.some((s) => s.form === 'aermet100')).toBe(true);
    // 300m 은 ultra-high-strength-steel 그룹에
    expect(IDX.entities.find((e) => e.id === 'ultra-high-strength-steel')?.surface_forms.some((s) => s.form === '300m')).toBe(true);
  });
});

describe('wiki-backlinks 역인덱스 무결성 (H2 기반)', () => {
  it('피언급 엔티티·참조원이 모두 유효(실재)하고 self-link 없음', () => {
    const bad: string[] = [];
    for (const [ent, froms] of Object.entries(BL.backlinks)) {
      if (!entIds.has(ent)) bad.push(`대상 엔티티 부재: ${ent}`);
      for (const f of froms) {
        if (!STORIES[f]) bad.push(`참조원 스토리 부재: ${f}`);
        if (f === ent) bad.push(`self-link: ${ent}`);   // 자기 스토리가 자기를 언급 금지
      }
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('참조원 목록에 중복 없음 (스토리당 엔티티 1회)', () => {
    const dup: string[] = [];
    for (const [ent, froms] of Object.entries(BL.backlinks)) {
      if (new Set(froms).size !== froms.length) dup.push(ent);
    }
    expect(dup).toEqual([]);
  });

  it('staleness — backlinks 도 현재 산출물 해시와 일치', () => {
    expect(BL.generated_from.materials).toBe(hash(materialsRaw));
    expect(BL.generated_from.stories).toBe(hash(storiesRaw));
  });
});
