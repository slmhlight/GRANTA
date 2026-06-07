/*
 * R157b — Home 의 amber preset banner (시나리오 / 검색 preset 적용 상태).
 * Home.tsx 의 inline 정의에서 추출. Behavior identical.
 *
 * 표시:
 *  - 적용된 preset label (+ secondary label / index hint)
 *  - 첫 후보 / Compare / 권장 뷰 / Edit / Reset / × 버튼
 */
import type { Dispatch, SetStateAction } from 'react';
import { GraduationCap, Info, GitCompareArrows, BarChart3, Table2, Pencil, RotateCcw } from 'lucide-react';
import type { Material } from '@/lib/materials';
import type { ScenarioKey } from '@/lib/scenario-presets';

type ViewMode = 'table' | 'cards' | 'ashby';

export interface AppliedPreset {
  key: string;
  label: string;
  secondaryLabel?: string;
  indexHint?: string;
  suggestedView?: ViewMode;
}

interface HomePresetBannerProps {
  appliedPreset: AppliedPreset | null;
  viewFiltered: Material[];
  selectedMaterial: Material | null;
  setSelectedMaterial: (m: Material | null) => void;
  compareList: string[];
  showCompare: boolean;
  setShowCompare: Dispatch<SetStateAction<boolean>>;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  setEditingScenario: (k: ScenarioKey) => void;
  resetFilters: () => void;
  setAppliedPreset: (p: AppliedPreset | null) => void;
  t: (key: string) => string;
}

export function HomePresetBanner({
  appliedPreset,
  viewFiltered,
  selectedMaterial,
  setSelectedMaterial,
  compareList,
  showCompare,
  setShowCompare,
  viewMode,
  setViewMode,
  setEditingScenario,
  resetFilters,
  setAppliedPreset,
  t,
}: HomePresetBannerProps) {
  if (!appliedPreset) return null;
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1 sm:py-1.5 bg-amber-500/10 border-b border-amber-500/30 text-[11px] sm:text-xs">
      <GraduationCap className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
      <span className="text-amber-700 font-medium truncate min-w-0">
        {appliedPreset.label}
        {appliedPreset.secondaryLabel && (
          <span className="text-amber-800 ml-1.5">∩ <span className="font-medium">{appliedPreset.secondaryLabel}</span></span>
        )}
      </span>
      {appliedPreset.indexHint && !appliedPreset.secondaryLabel && (
        <span className="text-muted-foreground hidden md:inline truncate">· {t('banner.recommendedIndex')}: <span className="font-mono">{appliedPreset.indexHint}</span></span>
      )}
      <div className="ml-auto flex items-center gap-1 flex-shrink-0">
        {/* R61 #7 — Apply 후 다음 액션 안내: 첫 후보 보기 / Compare 다보기. 사용자가 막히지 않도록. */}
        {viewFiltered.length > 0 && !selectedMaterial && (
          <button onClick={() => setSelectedMaterial(viewFiltered[0])} className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded border border-emerald-500/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 items-center gap-0.5" title="첫 후보 상세 보기">
            <Info className="w-3 h-3" /> 첫 후보 ({viewFiltered.length})
          </button>
        )}
        {compareList.length >= 2 && !showCompare && (
          <button onClick={() => setShowCompare(true)} className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded border border-sky-500/60 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 items-center gap-0.5" title="Compare 패널 열기">
            <GitCompareArrows className="w-3 h-3" /> Compare ({compareList.length})
          </button>
        )}
        {/* U12: suggest the recommended view — only when user is currently elsewhere */}
        {appliedPreset.suggestedView && viewMode !== appliedPreset.suggestedView && (
          <button onClick={() => setViewMode(appliedPreset.suggestedView!)} className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded border border-amber-500/60 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 flex items-center gap-0.5" title="권장 뷰로 전환">
            {appliedPreset.suggestedView === 'ashby' ? <BarChart3 className="w-3 h-3" /> : <Table2 className="w-3 h-3" />}
            <span className="hidden sm:inline">{appliedPreset.suggestedView === 'ashby' ? 'Ashby' : appliedPreset.suggestedView === 'cards' ? 'Cards' : 'Table'}</span>
          </button>
        )}
        {/* R36a — 모바일에서도 표시. 모바일은 icon 만, sm+ 는 icon + 텍스트. */}
        <button onClick={() => setEditingScenario(appliedPreset.key as ScenarioKey)} className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded border border-amber-500/40 text-amber-700 hover:bg-amber-500/10 inline-flex items-center gap-1" title={t('banner.editAgain')}>
          <Pencil className="w-3 h-3" />
          <span className="hidden sm:inline">{t('banner.editAgain')}</span>
        </button>
        <button onClick={() => { resetFilters(); setAppliedPreset(null); }} className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded border border-amber-500/40 text-amber-700 hover:bg-amber-500/10 inline-flex items-center gap-1" title={t('banner.resetFilters')}>
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">{t('banner.resetFilters')}</span>
        </button>
        <button onClick={() => { setAppliedPreset(null); try { window.history.replaceState(null, '', window.location.pathname + window.location.hash); } catch { /* ignore */ } }} className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-700 hover:bg-amber-500/10" title={t('banner.closeBanner')}>×</button>
      </div>
    </div>
  );
}
