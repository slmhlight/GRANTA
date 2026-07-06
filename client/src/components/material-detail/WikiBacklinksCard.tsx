/*
 * R227/E14/H2 — 서술 상호참조(위키 backlink) 카드.
 * "이 재료를 개발 스토리에서 함께 언급하는 다른 재료" — 물성 거리(SimilarMaterialsCard)와 다른 축.
 *   in  = 다른 재료의 스토리가 이 재료를 언급 (↑ 언급됨)
 *   out = 이 재료의 스토리가 다른 재료를 언급 (↓ 언급함)
 * 데이터는 build:wiki 산출(빌드타임 slug 해석) — 런타임 텍스트 매칭 없음.
 */
import { Link2 } from 'lucide-react';
import { useMemo } from 'react';
import type { Material } from '@/lib/materials';
import { narrativeRefs, type WikiLookups } from '@/lib/wiki-refs';

interface Props {
  material: Material;
  allMaterials: Material[];
  lookups: WikiLookups | null;
  onSelectMaterial?: (id: string) => void;
  max?: number;
}

export function WikiBacklinksCard({ material, allMaterials, lookups, onSelectMaterial, max = 10 }: Props) {
  const byId = useMemo(() => {
    const m = new Map<string, Material>();
    for (const x of allMaterials) m.set(x.id, x);
    return m;
  }, [allMaterials]);

  const items = useMemo(() => {
    if (!lookups) return [];
    return narrativeRefs(material.story_key, lookups)
      .map((r) => ({ dir: r.dir, ent: r.entity, mat: r.entity.rep_id ? byId.get(r.entity.rep_id) : undefined }))
      .filter((x) => x.mat && x.mat.id !== material.id)   // 대상 재료 실재 + self 제외
      .slice(0, max);
  }, [material.story_key, material.id, lookups, byId, max]);

  if (!items.length) return null;

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3">
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-violet-900 mb-1.5">
        <Link2 className="w-3.5 h-3.5" />
        <span>함께 언급되는 재료</span>
        <span className="text-[10px] font-normal text-violet-700/70">· 개발 스토리 상호참조</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(({ dir, ent, mat }) => (
          <button
            key={ent.id}
            onClick={() => mat && onSelectMaterial?.(mat.id)}
            className="group inline-flex items-center gap-1 px-2 py-1 rounded border border-violet-300 bg-white/70 hover:bg-violet-100 transition-colors text-[11px]"
            title={dir === 'in' ? '이 재료를 언급하는 스토리' : '이 재료의 스토리가 언급'}
          >
            <span className="text-[9px] text-violet-500" aria-hidden>{dir === 'in' ? '↑' : '↓'}</span>
            <span className="font-medium text-violet-900 group-hover:underline">{mat!.name.replace(/\s*[—(].*$/, '').trim()}</span>
          </button>
        ))}
      </div>
      <p className="text-[9.5px] text-violet-700/60 mt-1.5 leading-snug">
        ↑ 이 재료를 언급하는 재료 · ↓ 이 재료가 언급하는 재료 (물성 유사도가 아닌 서술상 관계)
      </p>
    </div>
  );
}
