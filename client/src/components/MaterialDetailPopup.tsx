/*
 * Floating, draggable Material Detail popup.
 * Desktop: a non-modal floating window (no opaque backdrop) so the Ashby chart and
 *          the Compare panel stay fully visible/interactive behind it; drag by the header.
 * Mobile : full-screen overlay (dragging makes no sense on a small screen).
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { MaterialDetail } from '@/components/MaterialDetail';
import type { Material } from '@/lib/materials';

const WIDTH = 430;

export function MaterialDetailPopup({
  material,
  compareList,
  onToggleCompare,
  onClose,
  allMaterials,
  favorites,
  onToggleFavorite,
}: {
  material: Material | null;
  compareList: string[];
  onToggleCompare: (id: string) => void;
  onClose: () => void;
  /** R53a — Radar 정규화 base 에 사용. */
  allMaterials?: Material[];
  /** R69 A — 즐겨찾기 props 패스스루. */
  favorites?: Set<string>;
  onToggleFavorite?: (id: string) => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const on = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const startDrag = (e: any) => {
    if (e.target?.closest?.('button, a')) return; // ignore clicks on close button / links
    e.preventDefault();
    const shell = e.currentTarget?.closest?.('[data-detail-popup]') as HTMLElement | null;
    const rect = shell?.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const baseX = rect ? rect.left : 0, baseY = rect ? rect.top : 0;
    const onMove = (ev: PointerEvent) => {
      const nx = Math.max(8, Math.min(window.innerWidth - 100, baseX + (ev.clientX - startX)));
      const ny = Math.max(8, Math.min(window.innerHeight - 60, baseY + (ev.clientY - startY)));
      setPos({ x: nx, y: ny });
    };
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      document.body.style.userSelect = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    document.body.style.userSelect = 'none';
  };

  if (!material) return null;

  if (!isDesktop) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <MaterialDetail material={material} compareList={compareList} onToggleCompare={onToggleCompare} onClose={onClose} allMaterials={allMaterials} favorites={favorites} onToggleFavorite={onToggleFavorite} />
      </div>
    );
  }

  const style: CSSProperties = pos
    ? { left: pos.x, top: pos.y, width: WIDTH }
    : { left: '50%', top: 72, width: WIDTH, transform: 'translateX(-50%)' };

  return (
    <div
      data-detail-popup
      className="fixed z-50 max-h-[84vh] rounded-lg border border-border shadow-2xl bg-background overflow-hidden flex flex-col ring-1 ring-black/5"
      style={style}
    >
      <MaterialDetail
        material={material}
        compareList={compareList}
        onToggleCompare={onToggleCompare}
        onClose={onClose}
        floating
        dragHandleProps={{ onPointerDown: startDrag }}
        allMaterials={allMaterials}
      />
    </div>
  );
}
