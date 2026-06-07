/*
 * R157b — Home 의 모바일 Ashby preview card.
 * Home.tsx 의 inline 정의에서 추출. Behavior identical.
 *
 * Ashby view 에서 모바일 한 번 탭 → floating card. "자세히" 누르거나 다시 탭 → detail open.
 */
import type { Material } from '@/lib/materials';

interface HomeAshbyPreviewCardProps {
  previewMaterial: Material | null;
  setPreviewMaterial: (m: Material | null) => void;
  setSelectedMaterial: (m: Material) => void;
}

export function HomeAshbyPreviewCard({
  previewMaterial,
  setPreviewMaterial,
  setSelectedMaterial,
}: HomeAshbyPreviewCardProps) {
  if (!previewMaterial) return null;
  return (
    <div className="md:hidden fixed left-2 right-2 bottom-[58px] z-30 rounded-lg border border-accent/40 bg-card shadow-xl px-3 py-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold truncate">{previewMaterial.name}</div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <span>{previewMaterial.category}{previewMaterial.subcategory ? ` · ${previewMaterial.subcategory}` : ''}</span>
          {previewMaterial.ranges?.density?.typical != null && <span>· ρ {previewMaterial.ranges.density.typical} g/cm³</span>}
          {previewMaterial.ranges?.modulus?.typical != null && <span>· E {previewMaterial.ranges.modulus.typical} GPa</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => { setSelectedMaterial(previewMaterial); setPreviewMaterial(null); }}
        className="text-[11px] px-2 py-1 rounded bg-accent text-white whitespace-nowrap"
      >자세히 →</button>
      <button
        type="button"
        onClick={() => setPreviewMaterial(null)}
        className="text-muted-foreground hover:text-foreground p-1"
        aria-label="닫기"
      >×</button>
    </div>
  );
}
