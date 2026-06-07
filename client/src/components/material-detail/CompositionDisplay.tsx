/*
 * R157b — CompositionDisplay: composition donut + element grid.
 * MaterialDetail.tsx 의 inline 정의에서 추출. Behavior identical.
 */
import type { Material } from '@/lib/materials';
import { CompositionDonut } from './CompositionDonut';
import { buildCompSlices, parseCompValue, elementColor } from './composition';

export function CompositionDisplay({ material }: { material: Material }) {
  const composition = material.composition;
  const slices = buildCompSlices(composition);

  // 둘 다: array form / object form 동일하게 grid 표시 + donut 상단.
  const pairs: Array<[string, string]> = Array.isArray(composition)
    ? (composition.filter((p): p is [string, string] => Array.isArray(p) && p.length >= 2).map(p => [String(p[0]), String(p[1])]))
    : (composition && typeof composition === 'object'
        ? Object.entries(composition).filter(([_, v]) => v !== null && v !== undefined && v !== '' && v !== '0' && v !== 0).map(([k, v]) => [k, String(v)])
        : []);

  if (pairs.length === 0 && slices.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-4 text-center">Chemical composition data not available</p>;
  }
  // grid sort: balance 우선 → 값 큰 순.
  pairs.sort((a, b) => {
    const isBalA = /^(balance|bal|bal\.|rem|remainder)$/i.test(a[1]);
    const isBalB = /^(balance|bal|bal\.|rem|remainder)$/i.test(b[1]);
    if (isBalA && !isBalB) return -1;
    if (isBalB && !isBalA) return 1;
    const va = parseCompValue(a[1]) ?? 0;
    const vb = parseCompValue(b[1]) ?? 0;
    return vb - va;
  });

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-foreground/80 mb-2">Chemical Composition (wt%)</div>
      {slices.length > 0 && (
        <div className="rounded border border-border/50 bg-muted/10 p-3 flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-shrink-0 mx-auto sm:mx-0"><CompositionDonut slices={slices} /></div>
          <div className="flex-1 mt-2 sm:mt-0 grid grid-cols-2 gap-x-3 gap-y-1">
            {slices.map((d) => (
              <div key={d.element} className="flex items-center justify-between text-[10.5px]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                  <span className="font-semibold text-foreground">{d.element}</span>
                  {d.isBalance && <span className="text-[9px] text-muted-foreground italic">bal</span>}
                </span>
                <span className="font-mono text-muted-foreground">{d.value.toFixed(d.value < 1 ? 2 : 1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {pairs.map(([element, range]) => (
          <div key={element} className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border/30">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: elementColor(element) }} />
              {element}
            </span>
            <span className="text-xs font-mono text-muted-foreground">{range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
