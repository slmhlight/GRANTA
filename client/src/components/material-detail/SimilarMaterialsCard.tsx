/*
 * R161 — Similar / alternative materials card with reason chips.
 * Composition tab 안에 위치 (R161 요구), 각 추천 재료에 "왜 비슷한가" 설명 chip 추가.
 *
 * R226l — 유사재료(물성 거리) × 선택 인사이트(용도 관행) 융합:
 *  후보가 현재 재료와 같은 인사이트 그룹이면, 후보에만 해당하는 when-to-use 시나리오를
 *  "이 대체가 유리한 경우" 로 표시 — 조성/물성 유사도만으로는 답할 수 없는 '언제 갈아타는가' 를
 *  ID 기반(m.profiles.insight + 대표지정명 매칭)으로 제공. 절삭성 rating 델타도 함께 (공정 관점).
 */
import { Layers, Lightbulb } from 'lucide-react';
import type { Material } from '@/lib/materials';
import { findSimilar, type SimilarMaterial } from '@/lib/similar-materials';
import { resolveInsights, insightPickMatches, resolveMachinability, resolvePolymerMachinability } from '@/lib/process-guidance';

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

/** R226l — 후보별 결정 컨텍스트 (전부 m.profiles 조회 — regex 없음). export = 유닛테스트 대상. */
export function decisionContext(cur: Material, cand: Material): { whenLine: string | null; machChip: string | null } {
  let whenLine: string | null = null;
  const curIns = resolveInsights(cur);
  if (curIns && cand.profiles?.insight && cand.profiles.insight === cur.profiles?.insight) {
    // 같은 인사이트 그룹: 후보에는 해당하고 현재에는 해당하지 않는 시나리오 = 갈아탈 이유
    const pick = curIns.picks.find(p => insightPickMatches(cand, p) && !insightPickMatches(cur, p));
    if (pick) whenLine = `${pick.when} → ${pick.use}`;
  } else if (cand.profiles?.insight && cand.profiles.insight !== cur.profiles?.insight) {
    const candIns = resolveInsights(cand);
    if (candIns) whenLine = `다른 계열 — ${candIns.title}`;
  }
  let machChip: string | null = null;
  const m1 = resolveMachinability(cur);
  const m2 = resolveMachinability(cand);
  if (m1 && m2 && m1.rating !== m2.rating) machChip = `절삭성 ${m1.rating}%→${m2.rating}%`;
  else {
    const p1 = resolvePolymerMachinability(cur);
    const p2 = resolvePolymerMachinability(cand);
    if (p1 && p2 && p1.label !== p2.label) machChip = `절삭성 ${p1.label}→${p2.label}`;
  }
  return { whenLine, machChip };
}

export function SimilarMaterialsCard({ material, allMaterials, onSelectMaterial, topN = 5 }: SimilarMaterialsCardProps) {
  const similar = findSimilar(material, allMaterials, { topN });
  if (!similar.length) return null;
  return (
    <details open className="rounded-lg border-2 border-sky-300 bg-sky-50/50 p-3">
      <summary className="text-[12px] font-bold flex items-center justify-between cursor-pointer select-none list-none text-sky-900">
        <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />유사 · 대체 재료 (대응 합금 우선 · popularity 순)</span>
        <span className="text-[10px] font-normal opacity-70">top {similar.length}</span>
      </summary>
      <div className="space-y-1.5 mt-2 pt-2 border-t border-sky-300/50">
        {similar.map((s) => {
          const ctx = decisionContext(material, s.material);
          return (
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
                {s.crossRef && (
                  <span className="text-[9px] px-1 rounded bg-violet-100 text-violet-700 border border-violet-300 font-semibold whitespace-nowrap" title="주조↔단조(wrought) 대응 합금 — cross-reference">↔ 대응 합금</span>
                )}
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
            {/* R226l — 인사이트 융합: 언제 이 대체가 유리한가 (같은 그룹 시나리오) / 다른 계열 표시 */}
            {ctx.whenLine && (
              <div className="mt-1 text-[10px] text-indigo-800 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 flex items-start gap-1">
                <Lightbulb className="w-3 h-3 flex-shrink-0 mt-[1px]" />
                <span className="leading-snug">{ctx.whenLine}</span>
              </div>
            )}
            {/* 정량 delta chips (+R226l 절삭성 델타 — 공정 관점). */}
            {(s.diffs.length > 0 || ctx.machChip) && (
              <div className="flex flex-wrap gap-1 mt-1">
                {ctx.machChip && (
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded font-mono bg-violet-50 text-violet-700 border border-violet-200" title="절삭성 rating 변화 (AISI 1212=100 기준, 공정 프로파일)">
                    {ctx.machChip}
                  </span>
                )}
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
          );
        })}
        <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
          같은 카테고리 + property log-distance &lt; 1.5 + popularity ≥ 3.0 + 같은 family +50% boost.
          클릭하면 해당 재료로 이동. <span className="text-emerald-700">초록</span>=&lt;10% 차이 ·{' '}
          <span className="text-amber-700">노랑</span>=&lt;30% · <span className="text-rose-700">빨강</span>=≥30%.{' '}
          <span className="text-indigo-700">💡 줄</span> = 선택 인사이트 융합 — 이 대체가 유리한 용도 시나리오 (아래 인사이트 카드와 연동).
        </p>
      </div>
    </details>
  );
}
