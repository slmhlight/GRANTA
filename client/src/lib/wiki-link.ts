/*
 * R227/E14/H2b — 스토리 본문 인라인 auto-link (순수 함수, 유닛테스트).
 *
 * 빌드 산출 wiki-index 의 surface_form(autolink && !ambiguous) 를 allowlist 로 삼아,
 * 스토리 본문 텍스트에서 해당 지정자 run 을 찾아 <WikiLink> 노드로 치환한다.
 *   - 매칭은 build-time 결정된 정규화 form 에 대한 exact 조회 (런타임 분류 regex 0 — 설계 원칙 1).
 *   - allowlist 는 원소명·흔한 영어단어·서술어를 제외(name-tokens AUTOLINK_STOP) → 과링크 차단.
 *   - 규칙(§D): 최장 선두 프리픽스 · self 제외 · 섹션당 첫 등장 1회 · 대상 material 실재(repId).
 * 한글 form 은 정규화 단계에서 autolink=false(§ 감사: 한글 autolink 0) → 매칭은 Latin run 전용.
 */
import type { WikiLookups } from './wiki-refs';

/** name-tokens.mjs 의 norm 과 **정확히 동일** (구분자·괄호·%·하이픈 제거 후 소문자). */
export const norm = (s: string): string =>
  s.replace(/[\s‐‑–—―·×,()\/%]/g, '').replace(/-/g, '').toLowerCase();

export interface AutolinkTarget {
  entityId: string;
  repId: string | null;
  display: string;
}
export type AutolinkMap = Map<string, AutolinkTarget>;

/** wiki-index → autolink 조회 맵 (form → 타깃). autolink && !ambiguous 만; form 은 전역 unique 보장. */
export function buildAutolinkMap(lk: WikiLookups): AutolinkMap {
  const m: AutolinkMap = new Map();
  for (const e of Array.from(lk.byKey.values())) {
    for (const sf of e.surface_forms) {
      if (sf.autolink && !sf.ambiguous && !m.has(sf.form)) {
        m.set(sf.form, { entityId: e.id, repId: e.rep_id, display: e.display });
      }
    }
  }
  return m;
}

export type LinkNode =
  | { t: 'text'; s: string }
  | { t: 'link'; s: string; entityId: string; repId: string; display: string };

// 후보 run: 라틴 영숫자 + 내부 단일 구분자(공백·하이픈·middle-dot). 한글/문장부호에서 끊김 → 조사 경계 자동 처리.
const RUN = /[A-Za-z0-9][A-Za-z0-9]*(?:[ \-·][A-Za-z0-9]+)*/g;
const SEP = /[ \-·]/;

/** run 내 선두 n 토큰이 차지하는 원문 문자 길이(후행 구분자 제외). */
function prefixLen(run: string, toks: string[], n: number): number {
  if (n >= toks.length) return run.length;
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const found = run.indexOf(toks[i], idx);
    idx = found + toks[i].length;
  }
  return idx;
}

/**
 * 텍스트 → 링크 노드[]. authored [[key|label]] 우선 파싱 → 나머지 구간에 allowlist auto-link.
 * @param selfKey  현재 스토리 엔티티 id (자기 링크 제외)
 * @param seen     섹션당 첫등장 추적 Set (미지정 시 호출당 새로 생성 = 섹션 스코프)
 */
export function linkify(
  text: string,
  map: AutolinkMap | null,
  byKey: Map<string, { id: string; rep_id: string | null; display: string }> | null,
  selfKey: string | null | undefined,
  seen?: Set<string>,
): LinkNode[] {
  if (!text) return [{ t: 'text', s: text }];
  const linked = seen ?? new Set<string>();
  const nodes: LinkNode[] = [];

  // authored [[key]] / [[key|label]] 분해 (H3 대비 — 현재 스토리엔 없음)
  const MARK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let cursor = 0;
  let mk: RegExpExecArray | null;
  const segments: Array<{ authored: false; s: string } | { authored: true; key: string; label: string }> = [];
  while ((mk = MARK.exec(text)) !== null) {
    if (mk.index > cursor) segments.push({ authored: false, s: text.slice(cursor, mk.index) });
    segments.push({ authored: true, key: mk[1].trim(), label: (mk[2] ?? mk[1]).trim() });
    cursor = mk.index + mk[0].length;
  }
  if (cursor < text.length) segments.push({ authored: false, s: text.slice(cursor) });
  if (!segments.length) segments.push({ authored: false, s: text });

  for (const seg of segments) {
    if (seg.authored) {
      const ent = byKey?.get(seg.key) ?? null;
      if (ent && ent.rep_id && ent.id !== selfKey) {
        nodes.push({ t: 'link', s: seg.label, entityId: ent.id, repId: ent.rep_id, display: ent.display });
        linked.add(ent.id);
      } else {
        nodes.push({ t: 'text', s: seg.label }); // 미해결/self → 라벨을 평문으로 (무손실)
      }
      continue;
    }
    if (!map) { nodes.push({ t: 'text', s: seg.s }); continue; }
    // auto-link 스캔 — run 선두 프리픽스 최장 매칭 + 미스/히트 후 run 내 다음 토큰부터 재시도(sliding).
    // sliding 은 "M35·M42"·"Inconel 625·Hastelloy X" 같은 나열에서 뒤 항목도 링크되게 한다 (H4f-C).
    const src = seg.s;
    let last = 0;
    RUN.lastIndex = 0;
    let mm: RegExpExecArray | null;
    while ((mm = RUN.exec(src)) !== null) {
      const run = mm[0];
      const start = mm.index;
      const toks = run.split(SEP).filter(Boolean);
      let hitLen = 0;
      let hitTgt: AutolinkTarget | null = null;
      for (let n = toks.length; n >= 1; n--) {
        const cand = norm(toks.slice(0, n).join(''));
        if (cand.length < 3) continue; // 1~2자는 항상 제외; 3자는 빌드타임 화이트리스트(SHORT_AUTOLINK_OK)가 맵 등록을 통제
        const tgt = map.get(cand);
        if (tgt && tgt.repId && tgt.entityId !== selfKey && !linked.has(tgt.entityId)) {
          hitLen = prefixLen(run, toks, n);
          hitTgt = tgt;
          break;
        }
      }
      if (hitTgt) {
        if (start > last) nodes.push({ t: 'text', s: src.slice(last, start) });
        nodes.push({ t: 'link', s: run.slice(0, hitLen), entityId: hitTgt.entityId, repId: hitTgt.repId!, display: hitTgt.display });
        linked.add(hitTgt.entityId);
        last = start + hitLen;
        // run 꼬리("·M42" 등)를 이어서 스캔 — 구분자 1자 건너뛰고 재개
        if (hitLen < run.length) RUN.lastIndex = start + hitLen + 1;
      } else if (toks.length > 1) {
        // 선두 토큰 매칭 실패 — 다음 토큰부터 재시도 ("Grade 1200/850" 의 뒷항목 등)
        RUN.lastIndex = start + prefixLen(run, toks, 1) + 1;
      }
    }
    if (last < src.length) nodes.push({ t: 'text', s: src.slice(last) });
  }

  return nodes.length ? nodes : [{ t: 'text', s: text }];
}
