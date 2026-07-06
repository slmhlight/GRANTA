/*
 * R227/E14/H2b·H4b — 스토리 본문 인라인 링크 렌더.
 * 1) 재료 auto-link(linkify, 클릭→onSelectMaterial) 2) 그 외 텍스트에 기술용어 auto-link(→용어 페이지).
 * map=null(위키 인덱스 미로드) 이면 재료 링크는 생략되나 용어 링크는 유지 — behavior-additive.
 */
import { Fragment, useMemo } from 'react';
import { Link } from 'wouter';
import { linkify, type AutolinkMap, type LinkNode } from '@/lib/wiki-link';
import { linkifyTerms } from '@/lib/glossary-link';
import type { WikiEntity } from '@/lib/wiki-refs';

interface Props {
  text: string;
  map: AutolinkMap | null;
  byKey: Map<string, WikiEntity> | null;
  selfKey?: string | null;
  onSelectMaterial?: (id: string) => void;
}

/** 스토리 한 구간(섹션/문단)을 인라인 링크로 렌더. 재료=구간당 첫등장, 용어=구간당 첫등장. */
export function StoryLinkedText({ text, map, byKey, selfKey, onSelectMaterial }: Props) {
  const nodes = useMemo<LinkNode[]>(
    () => linkify(text, map, byKey, selfKey),
    [text, map, byKey, selfKey],
  );
  const termSeen = new Set<string>(); // 이 구간 렌더 동안 용어 첫등장 추적(순서대로 소비)
  return (
    <>
      {nodes.map((n, i) => {
        if (n.t === 'link') {
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelectMaterial?.(n.repId); }}
              className="text-violet-700 underline decoration-dotted decoration-violet-300 underline-offset-2 hover:decoration-violet-600 hover:bg-violet-50 rounded-[2px] transition-colors"
              title={`${n.display} — 상세로 이동`}
            >
              {n.s}
            </button>
          );
        }
        // 재료 링크가 아닌 텍스트 → 기술용어 auto-link
        const parts = linkifyTerms(n.s, termSeen);
        return parts.map((p, j) =>
          p.t === 'term' ? (
            <Link
              key={`${i}-${j}`}
              href={`/guide/term/${p.slug}`}
              title={`${p.display.replace(/\s*\(.*$/, '')} — ${p.short}`}
              onClick={(e) => e.stopPropagation()}
              className="text-teal-700 no-underline border-b border-dotted border-teal-400/70 hover:bg-teal-50 hover:border-teal-500"
            >
              {p.s}
            </Link>
          ) : (
            <Fragment key={`${i}-${j}`}>{p.s}</Fragment>
          ),
        );
      })}
    </>
  );
}
