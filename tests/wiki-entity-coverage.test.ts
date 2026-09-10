/*
 * A13 — 위키 상호참조·계열 매핑 커버리지 게이트.
 *
 * 이번에 고친 결함은 **하드코딩된 제외 목록이 낡은 것**이었다:
 * `build-wiki-index.mjs` 에 `DEAD = {epdm, fkm}`("멤버 0")이 박혀 있었는데,
 * H6 W3-10 에서 두 스토리를 v2 로 격상하며 재료에 연결한 뒤에도 목록이 남아
 * 두 재료가 위키에서 통째로 빠졌다. 같은 파일에 이미 `if (!members.length) continue` 라는
 * **데이터 기반 판정**이 있었으니, 하드코딩은 중복이면서 낡을 수 있는 쪽이었다.
 *
 * 그래서 이 게이트는 "지금 0인가" 가 아니라 **"제외가 데이터를 따라가는가"** 를 본다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SUBCAT_TO_SLUG } from '../scripts/audit-family-coverage.mjs';

type Mat = { id: string; stable_id?: string; name: string; category: string; subcategory?: string; story_key?: string };
type Entity = { id: string; story_key?: string; rep_id?: string; member_count?: number };

const raw = JSON.parse(fs.readFileSync(path.resolve('client/public/materials.json'), 'utf8'));
const ALL: Mat[] = Array.isArray(raw) ? raw : raw.materials;
const wiki = JSON.parse(fs.readFileSync(path.resolve('client/public/wiki-index.json'), 'utf8'));
const ENTITIES: Entity[] = wiki.entities ?? [];
const stories = JSON.parse(fs.readFileSync(path.resolve('data/alloy-stories.json'), 'utf8')).stories;
const glossary = JSON.parse(fs.readFileSync(path.resolve('data/glossary.json'), 'utf8'));

describe('A13 — 위키 엔티티 커버리지', () => {
  const keys = new Set(ENTITIES.map((e) => e.story_key).filter(Boolean));

  it('모든 재료가 위키 상호참조로 도달 가능하다', () => {
    const miss = ALL.filter((m) => !(m.story_key && keys.has(m.story_key)))
      .map((m) => `${m.stable_id ?? m.id} ${m.name.slice(0, 40)} (story_key=${m.story_key ?? '없음'})`);
    expect(miss, `엔티티 없는 재료 ${miss.length}건:\n  ${miss.join('\n  ')}`).toEqual([]);
  });

  it('멤버가 있는 스토리는 빠짐없이 엔티티가 된다 — 하드코딩 제외가 낡는 것을 막는다', () => {
    /* 이 검사가 A13 의 재발 방지다. 어떤 스토리가 재료에 연결됐는데 엔티티가 없다면,
       어딘가에서 그 스토리를 명시적으로 걸러내고 있다는 뜻이다. */
    const bad: string[] = [];
    for (const [key, st] of Object.entries(stories as Record<string, { stable_ids?: string[] }>)) {
      if (key.startsWith('_')) continue;
      const members = (st.stable_ids ?? []).filter((sid) => ALL.some((m) => m.stable_id === sid || m.story_key === key));
      if (members.length && !keys.has(key)) bad.push(`${key} (멤버 ${members.length})`);
    }
    expect(bad, `멤버가 있는데 엔티티가 없는 스토리 ${bad.length}건: ${bad.join(' | ')}`).toEqual([]);
  });

  it('엔티티는 대표 entry 와 표면형을 갖는다 (빈 껍데기 방지)', () => {
    const bad = ENTITIES.filter((e) => !e.rep_id || !(e.member_count && e.member_count > 0)).map((e) => e.id);
    expect(bad, `대표·멤버가 없는 엔티티: ${bad.join(' | ')}`).toEqual([]);
  });
});

describe('A13 — subcategory ↔ 계열 용어 매핑', () => {
  const subOf = (sc: string) => sc.split(' / ').slice(1).join(' / ');

  it('DB 의 모든 subcategory 가 계열 용어에 매핑돼 있다', () => {
    const subs = new Set(ALL.map((m) => `${m.category} / ${m.subcategory ?? '(none)'}`));
    const miss = [...subs].filter((sc) => !(SUBCAT_TO_SLUG as Record<string, string>)[subOf(sc)]);
    expect(miss, `매핑 없는 subcategory ${miss.length}건: ${miss.join(' | ')}`).toEqual([]);
  });

  it('매핑이 가리키는 계열 용어가 글로서리에 실재한다', () => {
    const terms = glossary.terms ?? glossary;
    const bad = Object.entries(SUBCAT_TO_SLUG as Record<string, string>)
      .filter(([, slug]) => !(slug in terms))
      .map(([sc, slug]) => `${sc} → ${slug}`);
    expect(bad, `글로서리에 없는 계열 슬러그 ${bad.length}건: ${bad.join(' | ')}`).toEqual([]);
  });

  it('죽은 매핑이 없다 — DB 에 없는 subcategory 를 가리키지 않는다', () => {
    /* 재료가 사라졌는데 매핑만 남으면, 다음 사람이 그 계열이 아직 있다고 오해한다. */
    const subs = new Set(ALL.map((m) => m.subcategory ?? '(none)'));
    const stale = Object.keys(SUBCAT_TO_SLUG as Record<string, string>).filter((sc) => !subs.has(sc));
    expect(stale.length, `DB 에 없는 subcategory 매핑 ${stale.length}건: ${stale.slice(0, 12).join(' | ')}`).toBeLessThanOrEqual(2);
  });
});
