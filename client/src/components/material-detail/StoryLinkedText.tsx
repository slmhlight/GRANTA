/*
 * R227/E14/H2b — 스토리 본문 인라인 위키링크 렌더.
 * linkify(순수) 산출 노드를 텍스트 / <WikiLink> 로 매핑. 클릭 → onSelectMaterial(repId).
 * map=null(위키 인덱스 미로드) 이면 평문 그대로 — behavior-additive(비치명적).
 */
import { Fragment, useMemo } from 'react';
import { linkify, type AutolinkMap, type LinkNode } from '@/lib/wiki-link';
import type { WikiEntity } from '@/lib/wiki-refs';

interface Props {
  text: string;
  map: AutolinkMap | null;
  byKey: Map<string, WikiEntity> | null;
  selfKey?: string | null;
  onSelectMaterial?: (id: string) => void;
}

/** 스토리 한 구간(섹션/문단)을 인라인 링크로 렌더. 첫등장 스코프 = 이 구간(호출당). */
export function StoryLinkedText({ text, map, byKey, selfKey, onSelectMaterial }: Props) {
  const nodes = useMemo<LinkNode[]>(
    () => linkify(text, map, byKey, selfKey),
    [text, map, byKey, selfKey],
  );
  return (
    <>
      {nodes.map((n, i) =>
        n.t === 'link' ? (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelectMaterial?.(n.repId); }}
            className="text-violet-700 underline decoration-dotted decoration-violet-300 underline-offset-2 hover:decoration-violet-600 hover:bg-violet-50 rounded-[2px] transition-colors"
            title={`${n.display} — 상세로 이동`}
          >
            {n.s}
          </button>
        ) : (
          <Fragment key={i}>{n.s}</Fragment>
        ),
      )}
    </>
  );
}
