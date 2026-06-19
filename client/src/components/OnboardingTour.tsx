/*
 * Sprint 2 B1 / R61 — First-visit Onboarding Tour
 * 6-step modal — Welcome · Search · Filter · Detail · Compare · Quick Start.
 * Each step has illustrative visual + concise body.
 * localStorage flag 'am_onboarding_done' prevents repeat.
 * Header `?` button (Home.tsx) reopens.
 */
import { useState } from 'react';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, MousePointerClick, GitCompareArrows, Rocket, Sparkles, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import type { ScenarioKey } from '@/lib/scenario-presets';

interface Props {
  open: boolean;
  onClose: () => void;
  /** R61 #1 — Quick-start scenario from final step. Closes tour, opens ScenarioDialog. */
  onQuickStart?: (key: ScenarioKey) => void;
}

/* ───────── R61 #8 — Step illustrations (inline SVG, no extra bundle weight) ───────── */
function IllustWelcome() {
  // R209 C-6 — 1,206 entries (1,040 → 정정, 헤더·본문과 일치).
  return (
    <svg viewBox="0 0 200 64" className="w-full h-16">
      <g transform="translate(10 12)">
        <rect width="52" height="40" rx="6" fill="oklch(0.6 0.12 220 / 0.15)" stroke="oklch(0.6 0.12 220)" />
        <text x="26" y="22" textAnchor="middle" fontSize="14" fontWeight="bold" fill="oklch(0.45 0.12 220)">1,206</text>
        <text x="26" y="34" textAnchor="middle" fontSize="7" fill="oklch(0.45 0.12 220)">alloys</text>
      </g>
      <g transform="translate(74 12)">
        <rect width="52" height="40" rx="6" fill="oklch(0.6 0.12 30 / 0.15)" stroke="oklch(0.6 0.12 30)" />
        <polyline points="6,32 18,22 28,28 40,12 46,18" fill="none" stroke="oklch(0.5 0.12 30)" strokeWidth="2" />
        <circle cx="46" cy="18" r="3" fill="oklch(0.5 0.12 30)" />
        <text x="26" y="38" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.12 30)">Ashby</text>
      </g>
      <g transform="translate(138 12)">
        <rect width="52" height="40" rx="6" fill="oklch(0.6 0.12 110 / 0.15)" stroke="oklch(0.6 0.12 110)" />
        <text x="26" y="22" textAnchor="middle" fontSize="14" fontWeight="bold" fill="oklch(0.45 0.12 110)">16</text>
        <text x="26" y="34" textAnchor="middle" fontSize="7" fill="oklch(0.45 0.12 110)">사례</text>
      </g>
    </svg>
  );
}
function IllustSearch() {
  return (
    <svg viewBox="0 0 200 60" className="w-full h-16">
      <rect x="2" y="14" width="196" height="32" rx="6" fill="oklch(0.97 0.005 250)" stroke="oklch(0.85 0.012 250)" />
      <circle cx="20" cy="30" r="6" fill="none" stroke="oklch(0.55 0.08 220)" strokeWidth="2" />
      <line x1="24" y1="34" x2="30" y2="40" stroke="oklch(0.55 0.08 220)" strokeWidth="2" />
      <text x="36" y="34" fontSize="10" fill="oklch(0.45 0.04 250)" fontFamily="monospace">ti6al4v</text>
      <rect x="92" y="22" width="100" height="16" rx="3" fill="oklch(0.93 0.01 250)" />
      <text x="98" y="33" fontSize="9" fill="oklch(0.4 0.04 250)">→ Ti-6Al-4V</text>
    </svg>
  );
}
function IllustFilter() {
  return (
    <svg viewBox="0 0 200 60" className="w-full h-16">
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <text x="6" y={16 + i * 16} fontSize="8" fill="oklch(0.45 0.04 250)">{['σy', 'E', 'ρ'][i]}</text>
          <line x1="22" y1={14 + i * 16} x2="180" y2={14 + i * 16} stroke="oklch(0.88 0.012 250)" strokeWidth="2" strokeLinecap="round" />
          <line x1={50 + i * 20} y1={14 + i * 16} x2={140 - i * 10} y2={14 + i * 16} stroke="oklch(0.55 0.08 220)" strokeWidth="3" strokeLinecap="round" />
          <circle cx={50 + i * 20} cy={14 + i * 16} r="3.5" fill="oklch(0.55 0.08 220)" />
          <circle cx={140 - i * 10} cy={14 + i * 16} r="3.5" fill="oklch(0.55 0.08 220)" />
        </g>
      ))}
    </svg>
  );
}
function IllustDetail() {
  return (
    <svg viewBox="0 0 200 60" className="w-full h-16">
      <rect x="100" y="2" width="98" height="56" rx="4" fill="oklch(0.97 0.005 250)" stroke="oklch(0.85 0.012 250)" />
      <text x="106" y="14" fontSize="9" fill="oklch(0.3 0.04 250)" fontWeight="bold">Inconel 718</text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <text x="106" y={26 + i * 8} fontSize="7" fill="oklch(0.5 0.04 250)">{['σy', 'UTS', 'E', 'ρ'][i]}</text>
          <rect x="125" y={20 + i * 8} width={40 + i * 8} height="4" fill="oklch(0.55 0.08 220)" opacity="0.6" />
        </g>
      ))}
      {/* Click pointer */}
      <circle cx="40" cy="30" r="14" fill="none" stroke="oklch(0.55 0.08 220)" strokeWidth="1.5" strokeDasharray="2 2" />
      <path d="M40 30 L48 22 M40 30 L46 38" stroke="oklch(0.55 0.08 220)" strokeWidth="1.5" />
      <text x="20" y="55" fontSize="8" fill="oklch(0.45 0.04 250)">클릭 →</text>
    </svg>
  );
}
function IllustCompare() {
  // Mini radar with 2 overlapping polygons
  return (
    <svg viewBox="0 0 200 60" className="w-full h-16">
      <g transform="translate(100 30)">
        {[0, 1, 2, 3, 4].map((i) => {
          const ang = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          return <line key={i} x1="0" y1="0" x2={Math.cos(ang) * 22} y2={Math.sin(ang) * 22} stroke="oklch(0.88 0.012 250)" strokeWidth="0.8" />;
        })}
        <polygon
          points={[0, 1, 2, 3, 4].map(i => {
            const ang = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            const r = [16, 12, 18, 14, 20][i];
            return `${Math.cos(ang) * r},${Math.sin(ang) * r}`;
          }).join(' ')}
          fill="oklch(0.55 0.15 30 / 0.3)" stroke="oklch(0.55 0.15 30)" strokeWidth="1.5"
        />
        <polygon
          points={[0, 1, 2, 3, 4].map(i => {
            const ang = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            const r = [20, 18, 12, 19, 14][i];
            return `${Math.cos(ang) * r},${Math.sin(ang) * r}`;
          }).join(' ')}
          fill="oklch(0.55 0.12 220 / 0.3)" stroke="oklch(0.55 0.12 220)" strokeWidth="1.5"
        />
      </g>
      <g transform="translate(10 18)">
        <rect width="64" height="10" rx="2" fill="oklch(0.55 0.15 30 / 0.2)" stroke="oklch(0.55 0.15 30)" />
        <text x="32" y="8" textAnchor="middle" fontSize="7" fill="oklch(0.3 0.04 250)">Inconel 718</text>
      </g>
      <g transform="translate(10 32)">
        <rect width="64" height="10" rx="2" fill="oklch(0.55 0.12 220 / 0.2)" stroke="oklch(0.55 0.12 220)" />
        <text x="32" y="8" textAnchor="middle" fontSize="7" fill="oklch(0.3 0.04 250)">Ti-6Al-4V</text>
      </g>
    </svg>
  );
}
function IllustQuickStart() {
  return (
    <svg viewBox="0 0 200 60" className="w-full h-16">
      {[
        { x: 4, c: 'oklch(0.6 0.12 30)', label: 'Bracket' },
        { x: 54, c: 'oklch(0.6 0.12 180)', label: 'Heatsink' },
        { x: 104, c: 'oklch(0.6 0.12 280)', label: 'Fatigue' },
        { x: 154, c: 'oklch(0.6 0.12 110)', label: 'Marine' },
      ].map((t, i) => (
        <g key={i}>
          <rect x={t.x} y="8" width="42" height="44" rx="6" fill={`${t.c.replace(')', ' / 0.15)')}`} stroke={t.c} />
          <text x={t.x + 21} y="40" textAnchor="middle" fontSize="8" fill={t.c}>{t.label}</text>
          <circle cx={t.x + 21} cy="22" r="6" fill="none" stroke={t.c} strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

interface StepEntry {
  icon: any;
  illust: () => React.ReactElement;
  title: string;
  body: string;
  quickStart?: boolean;
}

const STEPS_KO: StepEntry[] = [
  { icon: Sparkles, illust: IllustWelcome, title: '환영합니다', body: 'AM Materials Explorer 는 1,200+ 합금 데이터베이스 · Ashby 차트 · 16 설계 사례를 한 곳에서. 약 1분이면 둘러보기 완료, 곧장 한 사례로 시작할 수 있어요.\n\n💡 처음이라면 Guide 부터 차근차근 학습하는 것을 권장합니다 — 14 chapter (실전 사례 → 이론 → 산업 적용) 의 학습 경로 가 마련되어 있어요.' },
  { icon: Search, illust: IllustSearch, title: '1. 검색', body: '상단 검색창에서 합금 이름·별칭·공정으로 검색하세요. 구분자·약어도 fuzzy 검색으로 잡힙니다. 예: "ti6al4v", "316l", "ss316".' },
  { icon: SlidersHorizontal, illust: IllustFilter, title: '2. 필터', body: '왼쪽 사이드바에서 카테고리·공정·물성·조성으로 필터링하세요. Granta MI 스타일 — 한 필터가 좁혀지면 다른 필터의 범위도 자동 좁아집니다.' },
  { icon: MousePointerClick, illust: IllustDetail, title: '3. 상세 보기', body: '재료를 클릭하면 우측에 상세 패널이 열립니다. 물성 범위(min/max/typical)와 각 값의 신뢰도 라벨(measured · handbook · class 추정 · derived 유도), Radar 차트, Composition, 출처 datasheet URL 을 확인하세요.\n\n⚠ 일부 값은 핸드북·family 평균 추정치입니다 — 신뢰도 라벨을 확인하고 설계 전 vendor datasheet 로 검증하세요.' },
  { icon: GitCompareArrows, illust: IllustCompare, title: '4. 비교', body: '"＋" 체크박스로 합금을 추가 (헤더 ＋ 로 페이지 전체 일괄). Compare 탭에서 Radar (≤20)·표·CSV·PNG 로 한꺼번에 비교.' },
  { icon: Rocket, illust: IllustQuickStart, title: '5. 지금 시작', body: '처음이라면 자주 쓰는 4가지 설계 사례 중 하나로 시작해 보세요. 클릭 한 번에 추천 필터·차트가 자동 적용됩니다.', quickStart: true },
];

const STEPS_EN: StepEntry[] = [
  { icon: Sparkles, illust: IllustWelcome, title: 'Welcome', body: 'AM Materials Explorer combines a 1,200+ alloy database, Ashby charts, and 16 design scenarios in one place. The tour takes about a minute — you can also jump straight into one scenario.\n\n💡 If you are new to materials selection, the Guide (14 chapters: case-study → theory → industry application) is the recommended starting point.' },
  { icon: Search, illust: IllustSearch, title: '1. Search', body: 'Search by alloy name, alias, or process in the top search bar. Fuzzy matching handles separators and abbreviations — try "ti6al4v", "316l", or "ss316".' },
  { icon: SlidersHorizontal, illust: IllustFilter, title: '2. Filter', body: 'Use the left sidebar to filter by category, process, properties, or composition. Granta MI-style — narrowing one filter automatically narrows the others.' },
  { icon: MousePointerClick, illust: IllustDetail, title: '3. Material Detail', body: 'Click a material to open the detail panel on the right. See property ranges (min/max/typical) with a confidence label on each value (measured · handbook · class-estimate · derived), a Radar chart, composition, and datasheet sources.\n\n⚠ Some values are handbook or family-average estimates — check the confidence label and verify against a vendor datasheet before design.' },
  { icon: GitCompareArrows, illust: IllustCompare, title: '4. Compare', body: 'Use the "＋" checkbox to add alloys (header ＋ adds the whole page). The Compare tab gives you Radar overlay (≤20), table, CSV, and PNG export.' },
  { icon: Rocket, illust: IllustQuickStart, title: '5. Start Now', body: 'For a quick first run, pick one of these four common design scenarios — recommended filters and chart axes are applied in one click.', quickStart: true },
];

const QUICK_KEYS: Array<{ key: ScenarioKey; ko: string; en: string }> = [
  { key: 'bracket', ko: '구조 브래킷', en: 'Bracket' },
  { key: 'heatsink', ko: '히트싱크', en: 'Heatsink' },
  { key: 'fatigue', ko: '회전·진동축', en: 'Shaft (Fatigue)' },
  { key: 'corrosion', ko: '해양·화학', en: 'Marine / Corrosion' },
];

export default function OnboardingTour({ open, onClose, onQuickStart }: Props) {
  const { lang } = useLang();
  const STEPS = lang === 'en' ? STEPS_EN : STEPS_KO;
  const [step, setStep] = useState(0);
  const cur = STEPS[step];
  const Icon = cur.icon;
  const Illust = cur.illust;

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onClose();
  };
  const prev = () => setStep(Math.max(0, step - 1));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Icon className="w-5 h-5 text-accent" />
            {cur.title}
          </DialogTitle>
        </DialogHeader>
        {/* R61 #8 — Step illustration */}
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <Illust />
        </div>
        <div className="text-sm leading-relaxed text-foreground/85 py-1 whitespace-pre-line">
          {cur.body}
        </div>
        {/* R187 — Welcome step 에 Guide 직접 link CTA. 신규 사용자가 차근차근 학습 진입. */}
        {step === 0 && (
          <Link href="/guide" onClick={onClose}>
            <Button variant="outline" size="sm" className="w-full h-9 text-xs justify-center font-medium border-accent/40 text-accent hover:bg-accent/10">
              <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
              {lang === 'en' ? 'Start with the Guide (14 chapters)' : 'Guide 로 학습 시작하기 (14 chapter)'}
            </Button>
          </Link>
        )}
        {/* R61 #1 — Quick-start scenario buttons on final step */}
        {cur.quickStart && onQuickStart && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {QUICK_KEYS.map((q) => (
              <Button
                key={q.key}
                variant="outline"
                size="sm"
                className="h-9 text-xs justify-start font-normal"
                onClick={() => { onQuickStart(q.key); onClose(); }}
              >
                <Rocket className="w-3.5 h-3.5 mr-1.5 text-accent" />
                {lang === 'en' ? q.en : q.ko}
              </Button>
            ))}
          </div>
        )}
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
