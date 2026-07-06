/*
 * R227/E14/H2 — 위키 상호참조 (backlink) 순수 resolver.
 *
 * build:wiki 산출(client/public/wiki-index.json·wiki-backlinks.json)을 읽어,
 * 한 재료(story_key)에 대해 "서술상 함께 언급되는 재료"를 계산한다.
 *   incoming = 이 재료를 본문에서 언급하는 다른 스토리들 (전형적 "what links here")
 *   outgoing = 이 재료의 스토리가 언급하는 다른 재료들
 * 전부 빌드타임 결정된 stable_id/slug 기반 — 런타임 텍스트 매칭 없음(설계 원칙 1).
 */

export interface WikiEntity {
  id: string;            // = story_key (canonical slug)
  type: 'material';
  display: string;
  story_key: string;
  rep_stable_id: string;
  rep_id: string | null; // 클라이언트 m.id(legacy) — 네비게이션 타깃
  surface_forms: Array<{ form: string; sid: string; id: string | null; autolink?: boolean; ambiguous?: boolean }>;
  uns: string[];
  member_count: number;
}

export interface WikiIndex {
  version: number;
  inputHashes: { materials: string; stories: string };
  entities: WikiEntity[];
}

export interface WikiBacklinks {
  backlinks: Record<string, string[]>; // entityId(story_key) → [story_keys that mention it]
}

export interface WikiLookups {
  byKey: Map<string, WikiEntity>;
  /** story_key → 이 스토리가 언급하는 엔티티 id[] (backlinks 역전) */
  forward: Map<string, string[]>;
  backlinks: Record<string, string[]>;
}

/** index+backlinks → 조회 구조 (컴포넌트/훅에서 1회 계산). */
export function buildWikiLookups(index: WikiIndex, bl: WikiBacklinks): WikiLookups {
  const byKey = new Map<string, WikiEntity>();
  for (const e of index.entities) byKey.set(e.id, e);
  const forward = new Map<string, string[]>();
  for (const [ent, froms] of Object.entries(bl.backlinks)) {
    for (const from of froms) {
      const arr = forward.get(from) || [];
      arr.push(ent);
      forward.set(from, arr);
    }
  }
  return { byKey, forward, backlinks: bl.backlinks };
}

export interface NarrativeRef {
  entity: WikiEntity;
  dir: 'in' | 'out'; // in = 나를 언급함 / out = 내가 언급함
}

/** storyKey 에 대한 서술 상호참조 (incoming 우선, 중복 제거, self 제외). */
export function narrativeRefs(storyKey: string | null | undefined, lk: WikiLookups): NarrativeRef[] {
  if (!storyKey) return [];
  const seen = new Set<string>([storyKey]);
  const out: NarrativeRef[] = [];
  for (const k of lk.backlinks[storyKey] || []) {          // incoming: 나를 언급하는
    if (seen.has(k)) continue; seen.add(k);
    const e = lk.byKey.get(k); if (e) out.push({ entity: e, dir: 'in' });
  }
  for (const k of lk.forward.get(storyKey) || []) {        // outgoing: 내가 언급하는
    if (seen.has(k)) continue; seen.add(k);
    const e = lk.byKey.get(k); if (e) out.push({ entity: e, dir: 'out' });
  }
  return out;
}
