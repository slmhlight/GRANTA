/*
 * R161 — Similar / alternative materials card with reason chips.
 * Composition tab 안에 위치 (R161 요구), 각 추천 재료에 "왜 비슷한가" 설명 chip 추가.
 *
 * 변경:
 *  - "same family" 배지 → 항상 표시
 *  - 가격 ↓ / 강도 ↑ / 무게 ↓ 등 dominant trade-off 한 줄 요약 chip 추가
 *  - 기존 property delta chips 유지 (정량 차이)
 */
import { Layers } from 'lucide-react';
import type { Material } from '@/lib/materials';
import { findSimilar, type SimilarMaterial } from '@/lib/similar-materials';

interface SimilarMaterialsCardProps {
  material: Material;
  allMaterials: Material[];
  onSelectMaterial?: (id: string) => void;
  topN?: number;
}

/**
 * R161 — Synthesize a short reason chip from sharedFamily + diffs.
 * 예:
 *   sharedFamily=true, $ -30% → "같은 family · 30% 저렴"
 *   sharedFamily=false, σy +15%, $ -20% → "다른 family · 강도 15%↑, 가격 20%↓"
 *   sharedFamily=true, no large diffs → "같은 family · 거의 동등"
 */
function synthesizeReason(s: SimilarMaterial): string {
  const parts: string[] = [];
  parts.push(s.sharedFamily ? '같은 family' : '다른 family');
  /* Highlight the largest positive/negative diff. */
  const sorted = [...s.diffs].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const significant = sorted.filter(d => Math.abs(d.delta) >= 5).slice(0, 2);
  if (significant.length === 0) {
    parts.push('거의 동등');
  } else {
    for (const d of significant) {
      const arrow = d.delta > 0 ? '↑' : '↓';
      parts.push(`${d.label} ${Math.abs(d.delta)}%${arrow}`);
    }
  }
  return parts.join(' · ');
}

export function SimilarMaterialsCard({ material, allMaterials, onSelectMaterial, topN = 5 }: SimilarMaterialsCardProps) {
  const similar = findSimilar(material, allMaterials, { topN });
  if (!similar.length) return null;
  return (
    <details open className="rounded-lg border-2 border-sky-300 bg-sky-50/50 p-3">
      <summary className="text-[12px] font-bold flex items-center justify-between cursor-pointer select-none list-none text-sky-900">
        <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />유사 · 대체 재료 (popularity 순)</span>
        <span className="text-[10px] font-normal opacity-70">top {similar.length}</span>
      </summary>
      <div className="space-y-1.5 mt-2 pt-2 border-t border-sky-300/50">
        {similar.map((s) => (
          <button
            key={s.material.id}
            type="button"
            onClick={() => onSelectMaterial?.(s.material.id)}
            disabled={!onSelectMaterial}
            className="w-full text-left p-2 rounded border border-sky-200 bg-background hover:border-sky-400 hover:bg-sky-50/80 transition-colors disabled:cursor-default disabled:hover:border-sky-200 disabled:hover:bg-background group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground group-hover:text-sky-700 truncate">{s.material.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{s.material.subcategory}</p>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                {typeof s.material.popularity === 'number' && (
                  <span className="text-[10px] font-mono text-amber-700">★ {s.material.popularity.toFixed(1)}</span>
                )}
                {s.sharedFamily && (
                  <span className="text-[9px] px-1 rounded bg-sky-100 text-sky-700 border border-sky-200">same family</span>
                )}
              </div>
            </div>
            {/* R161 — 한 줄 reason chip (왜 비슷한지). */}
            <div className="mt-1 text-[10px] text-sky-800/90 bg-sky-100/60 rounded px-1.5 py-0.5 inline-block">
              {synthesizeReason(s)}
            </div>
            {/* 정량 delta chips. */}
            {s.diffs.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {s.diffs.map((d) => (
                  <span
                    key={d.prop}
                    className={`text-[9.5px] px-1.5 py-0.5 rounded font-mono ${
                      Math.abs(d.delta) < 10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : Math.abs(d.delta) < 30 ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                    title={`${d.label} ${d.delta > 0 ? '+' : ''}${d.delta}% (대상 대비)`}
                  >
                    {d.label}: {d.delta > 0 ? '+' : ''}{d.delta}%
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
        <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
          같은 카테고리 + property log-distance &lt; 1.5 + popularity ≥ 3.0 + 같은 family +50% boost.
          클릭하면 해당 재료로 이동. <span className="text-emerald-700">초록</span>=&lt;10% 차이 ·{' '}
          <span className="text-amber-700">노랑</span>=&lt;30% · <span className="text-rose-700">빨강</span>=≥30%.
        </p>
      </div>
    </details>
  );
}
