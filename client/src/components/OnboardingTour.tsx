/*
 * Sprint 2 B1 — First-visit Onboarding Tour
 * 4-step modal — Search · Filter · Detail · Compare.
 * localStorage flag 'am_onboarding_done' prevents repeat.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, MousePointerClick, GitCompareArrows, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '@/lib/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS_KO = [
  {
    icon: Search,
    title: '1. 검색',
    body: '상단 검색창에서 합금 이름·별칭·공정으로 검색하세요. 구분자·약어도 fuzzy 검색으로 잡힙니다. 예: "ti6al4v", "316l", "ss316".',
  },
  {
    icon: SlidersHorizontal,
    title: '2. 필터',
    body: '왼쪽 사이드바에서 카테고리·공정·물성·조성으로 필터링하세요. Granta MI 스타일 — 한 필터가 좁혀지면 다른 필터의 범위도 자동 좁아집니다.',
  },
  {
    icon: MousePointerClick,
    title: '3. 상세 보기',
    body: '재료를 클릭하면 우측에 상세 패널이 열립니다. 측정값 범위(min/max/typical), Radar 차트, Composition, 출처 datasheet URL 까지 확인 가능합니다.',
  },
  {
    icon: GitCompareArrows,
    title: '4. 비교',
    body: '"+ Compare" 버튼으로 최대 20개 합금을 추가하고, Compare 탭에서 Radar·표·CSV·PNG 로 한꺼번에 비교할 수 있습니다.',
  },
];

const STEPS_EN = [
  {
    icon: Search,
    title: '1. Search',
    body: 'Search by alloy name, alias, or process in the top search bar. Fuzzy matching handles separators and abbreviations — try "ti6al4v", "316l", or "ss316".',
  },
  {
    icon: SlidersHorizontal,
    title: '2. Filter',
    body: 'Use the left sidebar to filter by category, process, properties, or composition. Granta MI-style — narrowing one filter automatically narrows the others.',
  },
  {
    icon: MousePointerClick,
    title: '3. Material Detail',
    body: 'Click a material to open the detail panel on the right. See measurement ranges (min/max/typical), a Radar chart, composition, and verified datasheet URLs.',
  },
  {
    icon: GitCompareArrows,
    title: '4. Compare',
    body: 'Use "+ Compare" to add up to 20 alloys, then switch to the Compare tab for side-by-side Radar, table, CSV, and PNG export.',
  },
];

export default function OnboardingTour({ open, onClose }: Props) {
  const { lang } = useLang();
  const STEPS = lang === 'en' ? STEPS_EN : STEPS_KO;
  const [step, setStep] = useState(0);
  const cur = STEPS[step];
  const Icon = cur.icon;

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onClose();
  };
  const prev = () => setStep(Math.max(0, step - 1));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Icon className="w-5 h-5 text-accent" />
            {cur.title}
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm leading-relaxed text-foreground/85 py-2">
          {cur.body}
        </div>
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-accent' : 'w-1.5 bg-muted'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-7">
              {lang === 'en' ? 'Skip' : '건너뛰기'}
            </Button>
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={prev} className="h-7 px-2">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="sm" onClick={next} className="h-7 text-xs">
              {step < STEPS.length - 1 ? (lang === 'en' ? 'Next' : '다음') : (lang === 'en' ? 'Done' : '완료')}
              {step < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
