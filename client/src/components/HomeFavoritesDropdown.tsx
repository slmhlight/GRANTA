/*
 * R157b — Home 의 즐겨찾기 dropdown (R69 A).
 * Home.tsx 의 inline 정의에서 추출. Behavior identical.
 */
import { Star, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Material } from '@/lib/materials';

interface HomeFavoritesDropdownProps {
  favorites: Set<string>;
  materials: Material[];
  setSelectedMaterial: (m: Material) => void;
  toggleFavorite: (id: string) => void;
}

export function HomeFavoritesDropdown({
  favorites,
  materials,
  setSelectedMaterial,
  toggleFavorite,
}: HomeFavoritesDropdownProps) {
  if (favorites.size === 0) return null;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button className="h-7 px-2 flex items-center gap-1 rounded border border-sidebar-border text-sidebar-foreground/70 hover:text-white hover:border-accent transition-colors text-[11px] font-medium">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="hidden lg:inline">{favorites.size}</span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">즐겨찾기 ({favorites.size})</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="max-h-80 overflow-auto w-64">
        <DropdownMenuLabel className="text-xs">즐겨찾기</DropdownMenuLabel>
        {Array.from(favorites).map((id) => {
          const m = materials.find((x) => x.id === id);
          if (!m) return null;
          return (
            <div key={id} className="flex items-center gap-1 px-1.5 py-1 hover:bg-muted/50 rounded">
              <button
                type="button"
                onClick={() => { setSelectedMaterial(m); }}
                className="flex-1 text-left text-xs truncate min-w-0"
              >
                <span className="block truncate font-medium text-foreground">{m.name}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{m.subcategory}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleFavorite(id)}
                className="text-muted-foreground/50 hover:text-destructive flex-shrink-0"
                title="즐겨찾기 해제"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
