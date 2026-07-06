/*
 * R227/E14/H2 — 위키 상호참조 데이터 로드 훅.
 * client/public/wiki-index.json + wiki-backlinks.json 를 1회 fetch (build:wiki 산출).
 * 실패는 비치명적 — lookups=null 이면 소비 컴포넌트가 패널을 숨긴다(behavior-additive).
 */
import { useEffect, useState } from 'react';
import { buildWikiLookups, type WikiLookups, type WikiIndex, type WikiBacklinks } from '@/lib/wiki-refs';

export function useWikiRefs(): WikiLookups | null {
  const [lookups, setLookups] = useState<WikiLookups | null>(null);

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL || '/';
    Promise.all([
      fetch(`${base}wiki-index.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`wiki-index ${r.status}`)))),
      fetch(`${base}wiki-backlinks.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`wiki-backlinks ${r.status}`)))),
    ])
      .then(([index, bl]: [WikiIndex, WikiBacklinks]) => {
        if (cancelled) return;
        if (!index?.entities?.length || !bl?.backlinks) return; // 형식 이상 → 무시
        setLookups(buildWikiLookups(index, bl));
      })
      .catch((e) => {
        console.warn(`[useWikiRefs] 위키 인덱스 로드 실패 (비치명적): ${e.message}`);
      });
    return () => { cancelled = true; };
  }, []);

  return lookups;
}
