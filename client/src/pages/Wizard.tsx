/*
 * R144e — Design Problem Wizard.
 *
 * 사용자가 어떤 alloy class 인지 모를 때, 환경·하중·수명·예산·인증을 묻고 →
 * 1~3 개의 Scenario preset + 관련 Guide chapter 를 추천.
 *
 * URL: /wizard (또는 모바일 deep-link)
 * Output: home (/?p=scenarioKey) 로 이동 + Guide 학습 링크 옵션.
 */
import { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Compass, BookOpen, ChevronRight, RotateCcw, CheckCircle2, AlertTriangle, ThumbsUp } from 'lucide-react';
import { useT } from '@/lib/i18n';

/* ───────── Step 정의 ───────── */

interface Choice {
  value: string;
  label: string;
  detail?: string;
}

/* R182 — Numeric bracket — typical industrial value 예시 (사용자가 수치 입력 시 reference). */
interface NumericBracket {
  value: number;       // typical numeric value
  label: string;       // industrial example (e.g., "AISI 1018 normalized")
}

interface NumericInputDef {
  key: string;         // answer key (props.σy, σUTS, E, El)
  label: string;       // visible label (예: '항복 강도 σy')
  unit: string;        // unit (예: 'MPa')
  brackets: NumericBracket[]; // industrial examples — sorted ascending
  placeholder?: string;
}

interface Step {
  id: string;
  question: string;
  detail?: string;
  guideChapter?: { num: string; id: string; label: string };
  choices?: Choice[];  // categorical step
  numerics?: NumericInputDef[]; // numeric input step (R182)
}

const STEPS: Step[] = [
  {
    id: 'environment',
    question: '1. 사용 환경은?',
    detail: '재료의 부식·산화·SCC 우려를 결정. 둘 이상 해당 시 가장 가혹한 환경을 선택.',
    guideChapter: { num: 'Ch.3', id: 'ch10', label: '환경별 합금 매핑' },
    choices: [
      { value: 'indoor', label: '실내 / 일반 대기', detail: '보호된 건물 내부, 25°C ± 30°C' },
      { value: 'outdoor', label: '실외 / 옥외 / 자동차', detail: '비·자외선·계절 변화 (-30 ~ +60°C)' },
      { value: 'marine', label: '해상 / 염수 / 항만', detail: '염화물 + 습기, SCC + pitting 위험' },
      { value: 'chemical', label: '화학 plant / 산성', detail: 'H₂SO₄·HCl·HNO₃ 등 반복 노출' },
      { value: 'hightemp', label: '고온 (>300°C)', detail: '엔진·가열로·터빈·고온 가스 경로' },
      { value: 'cryogenic', label: '극저온 (<-50°C)', detail: 'LNG·우주 cryo·액체 질소' },
      { value: 'biomedical', label: '생체 / 인체 접촉', detail: '임플란트·의료기기 (FDA / ISO 10993)' },
    ],
  },
  {
    id: 'load',
    question: '2. 하중 유형은?',
    detail: '실패 모드를 결정 — 정적 항복 (σy), 피로 (σ_endurance), 좌굴 (E·I), 마모, creep.',
    guideChapter: { num: 'Ch.7', id: 'ch7', label: '하중 패턴 & 파괴 모드' },
    choices: [
      { value: 'static', label: '정적 인장 / 압축', detail: 'σ_max < σy / SF (가장 일반적 하중)' },
      { value: 'fatigue', label: '반복 / 진동 (피로)', detail: '10⁵-10⁷ cycle, σ_a < σ_endurance (~σUTS×0.4)' },
      { value: 'impact', label: '충격 / 단발 고하중', detail: 'Charpy KV 또는 동적 σy 검토 (data 가 부족할 수 있음)' },
      { value: 'buckling', label: '압축 좌굴 우려', detail: 'P_cr = π²EI/L² (E + 단면 2차 모멘트 I)' },
      { value: 'creep', label: '고온 장기 (creep)', detail: '서비스 > 400°C 인 경우 시간-temp-stress 곡선 필요' },
      { value: 'pressure', label: '내압 (압력용기)', detail: 'σ_hoop = pD/2t, σy → 두께 결정 (ASME B&PV Sec.VIII)' },
      { value: 'wear', label: '마모 / 접촉', detail: '경도 + 윤활 + 표면 처리' },
    ],
  },
  {
    id: 'lifetime',
    question: '3. 설계 수명은?',
    detail: '수명별 안전계수 + 안전 critical 여부.',
    choices: [
      { value: 'prototype', label: '프로토타입 / 1회', detail: '시제품, 안전계수 1.5-2' },
      { value: 'short', label: '단기 (< 1년)', detail: '안전계수 2-3, 일반 산업용' },
      { value: 'medium', label: '중기 (1-10년)', detail: '안전계수 3-5, 정밀 기계' },
      { value: 'long', label: '장기 (10년+)', detail: '안전계수 5+, 항공·원자력·인프라' },
      { value: 'safety_critical', label: '안전 critical', detail: '결함 = 인명피해. 인증 (AMS / ASME / FDA) + 정밀 fatigue / σy 검증.' },
    ],
  },
  {
    id: 'budget',
    question: '4. 단가 한도는?',
    detail: '재료 가격 기준 (USD/kg). 가공·HT 비용 별도.',
    choices: [
      { value: 'low', label: '< $10/kg', detail: '탄소강 · Al 보통 grade · 일반 polymer' },
      { value: 'mid', label: '$10 - $50/kg', detail: 'Stainless · 6xxx Al · 일반 공구강' },
      { value: 'high', label: '$50 - $200/kg', detail: 'Ti grade 5 · Inconel · PH stainless · Mg alloy' },
      { value: 'premium', label: '$200+ /kg', detail: 'γ-TiAl · Inconel 718/HX · 의료 grade · BeCu' },
      { value: 'nolimit', label: '제약 없음', detail: '성능 우선 (항공 · 우주 · F1)' },
    ],
  },
  {
    id: 'cert',
    question: '5. 인증 요구사항?',
    detail: '필수 spec 매칭 — 후보 좁히기.',
    guideChapter: { num: 'Ch.11', id: 'ch12', label: '인증 · 가공 · 시제품' },
    choices: [
      { value: 'none', label: '특별한 인증 없음', detail: '일반 산업용' },
      { value: 'ams', label: 'AMS (항공)', detail: 'AMS 5xxx 강·합금, 4xxx 비철' },
      { value: 'astm', label: 'ASTM (산업 표준)', detail: 'A-강, B-비철, F-의료' },
      { value: 'asme', label: 'ASME B&PV (압력용기)', detail: 'ASME SA-240, B31.3 배관' },
      { value: 'fda_iso', label: 'FDA / ISO 10993 (의료)', detail: 'ASTM F75 · F136 · F1537' },
      { value: 'nace', label: 'NACE MR0175 (sour service)', detail: 'H₂S 환경 — 강도 한계 + SCC' },
      { value: 'dnv', label: 'DNV (해상)', detail: 'DNV-OS-B101' },
    ],
  },
  /* R182 — 새 step 6: 기본 물성 수치 입력. 각 input 옆에 bracket 예시 (산업별 typical) 표시. */
  {
    id: 'properties',
    question: '6. 필요한 기본 물성 (선택)',
    detail: '수치 입력 시 후보 자동 필터. 예시 alloy 의 값과 비교하여 적정 수준 선택. 모두 비워두면 hint 만 사용.',
    guideChapter: { num: 'Ch.4', id: 'ch4', label: '기본 물성 · 단위 · 시험 표준' },
    numerics: [
      {
        key: 'sigma_y',
        label: '항복 강도 σy (min)',
        unit: 'MPa',
        placeholder: '예: 275',
        brackets: [
          { value: 50,   label: '순 알루미늄 / 일반 polymer' },
          { value: 200,  label: 'AISI 1018 normalized / AA 6061-T4' },
          { value: 350,  label: 'AISI 4140 annealed / AA 2024-T3' },
          { value: 500,  label: 'AA 7075-T6 / 4140 Q+T / Ti-6Al-4V annealed' },
          { value: 800,  label: 'Inconel 718 STA / 4340 Q+T (peak)' },
          { value: 1200, label: '17-4 PH H900 / Maraging 250 / 52100 bearing' },
          { value: 1700, label: 'Maraging 300 / 52100 hardened / SX γ\' Ni' },
        ],
      },
      {
        key: 'uts',
        label: '인장 강도 σUTS (min)',
        unit: 'MPa',
        placeholder: '예: 310',
        brackets: [
          { value: 150,  label: '순 알루미늄 / HDPE' },
          { value: 350,  label: 'AA 6061-T6 / 일반 brass / AA 5083-O' },
          { value: 600,  label: 'AISI 4140 annealed / AA 7075-T6' },
          { value: 900,  label: 'AISI 4340 Q+T / Ti-6Al-4V / Inconel 625' },
          { value: 1300, label: 'Inconel 718 STA / 17-4 PH H900' },
          { value: 1800, label: 'Maraging 250-350 / piano wire / Aermet 100' },
        ],
      },
      {
        key: 'modulus',
        label: '탄성 계수 E (min)',
        unit: 'GPa',
        placeholder: '예: 70',
        brackets: [
          { value: 3,   label: '일반 polymer (PP, ABS, PVC)' },
          { value: 70,  label: 'Aluminum / Mg 합금' },
          { value: 110, label: 'Brass / Titanium / Cu alloys' },
          { value: 200, label: 'Steel / Stainless / Ni superalloy' },
          { value: 380, label: 'Al₂O₃ ceramic / SiC' },
          { value: 600, label: 'Tungsten / W heavy alloy' },
        ],
      },
      {
        key: 'elongation',
        label: '연신율 El (min)',
        unit: '%',
        placeholder: '예: 12',
        brackets: [
          { value: 2,   label: 'Cast iron / Si3N4 / brittle ceramic' },
          { value: 5,   label: '17-4 PH H900 peak / 7075-T6 / 52100 hardened' },
          { value: 12,  label: 'AA 6061-T6 / 4140 Q+T / Ti-6Al-4V STA' },
          { value: 20,  label: 'AA 2024-T3 / AA 5083-O / 1045 annealed' },
          { value: 30,  label: 'AISI 304L annealed / AA 1100-O / pure Cu' },
          { value: 50,  label: 'HDPE / pure Al / 어닐드 brass' },
        ],
      },
    ],
  },
];

/* ───────── R162 — Answer-interaction logic ─────────
 * 이전 단계 답변에 따라 현재 단계의 각 choice 에 hint (권장/주의) 부여.
 * 또한 현재 답변이 prior 답변과 충돌하면 conflict 경고 표시.
 */

type ChoiceHint = 'recommended' | 'caution' | null;

/**
 * 현재 step 의 choice 별 hint 계산.
 *  - 'recommended' : 이전 답변과 잘 맞음 (녹색)
 *  - 'caution'    : 이전 답변과 충돌 가능 (노랑/빨강)
 */
function choiceHint(
  stepId: string,
  choiceValue: string,
  answers: Record<string, string>,
): { hint: ChoiceHint; reason?: string } {
  const env = answers.environment;
  const load = answers.load;
  const lifetime = answers.lifetime;
  const budget = answers.budget;

  /* ===== load step hints ===== */
  if (stepId === 'load') {
    if (env === 'cryogenic' && choiceValue === 'creep') {
      return { hint: 'caution', reason: '극저온 환경에서 creep 은 일반적으로 무시 가능' };
    }
    if (env === 'hightemp' && choiceValue === 'creep') {
      return { hint: 'recommended', reason: '고온 환경에서 creep 이 주요 실패 모드' };
    }
    /* R182 — 극저온 + 충격 hint: KIC 강조 제거. Charpy KV 또는 일반 σy 검토. */
    if (env === 'cryogenic' && choiceValue === 'impact') {
      return { hint: 'recommended', reason: '극저온에서 충격 인성 검토 필요 (Charpy KV)' };
    }
    if (env === 'marine' && (choiceValue === 'fatigue' || choiceValue === 'pressure')) {
      return { hint: 'recommended', reason: '해상 환경에서 피로·내압 부하 일반적' };
    }
  }

  /* ===== lifetime step hints ===== */
  if (stepId === 'lifetime') {
    if (env === 'biomedical' && choiceValue === 'long') {
      return { hint: 'recommended', reason: '의료 임플란트는 10년+ 수명 표준' };
    }
    if (load === 'fatigue' && (choiceValue === 'long' || choiceValue === 'safety_critical')) {
      return { hint: 'recommended', reason: '피로 critical → 수명 보장 필수' };
    }
    if (env === 'hightemp' && load === 'creep' && choiceValue === 'safety_critical') {
      return { hint: 'recommended', reason: '고온 + creep → safety critical 분류 일반적' };
    }
  }

  /* ===== budget step hints ===== */
  if (stepId === 'budget') {
    if (env === 'hightemp' && (choiceValue === 'low' || choiceValue === 'mid')) {
      return { hint: 'caution', reason: '고온용 합금 (Inconel/Hastelloy/Haynes) 대부분 $100/kg 이상' };
    }
    if (env === 'biomedical' && (choiceValue === 'low' || choiceValue === 'mid')) {
      return { hint: 'caution', reason: '의료 grade (Ti-6Al-4V ELI / CoCrMo / 316LVM) 대부분 고가' };
    }
    if (env === 'biomedical' && (choiceValue === 'high' || choiceValue === 'premium')) {
      return { hint: 'recommended', reason: '의료 grade 합금 일반 가격대' };
    }
    if (lifetime === 'safety_critical' && choiceValue === 'low') {
      return { hint: 'caution', reason: 'Safety critical 부품은 저가 generic grade 사용 어려움' };
    }
    if (lifetime === 'safety_critical' && (choiceValue === 'high' || choiceValue === 'premium' || choiceValue === 'nolimit')) {
      return { hint: 'recommended', reason: 'Safety critical → AMS / ASME 인증 grade (고가)' };
    }
    if (env === 'cryogenic' && choiceValue === 'low') {
      return { hint: 'caution', reason: '극저온용 (9Ni / 304L / Invar 36) 일반 grade 대비 가공비 ↑' };
    }
  }

  /* ===== cert step hints ===== */
  if (stepId === 'cert') {
    if (env === 'biomedical' && choiceValue === 'fda_iso') {
      return { hint: 'recommended', reason: '의료 환경 → FDA / ISO 10993 필수' };
    }
    if ((env === 'marine' || env === 'chemical') && choiceValue === 'nace') {
      return { hint: 'recommended', reason: '해상·화학 환경 → NACE MR0175 (sour service) 필수' };
    }
    if (env === 'hightemp' && choiceValue === 'ams') {
      return { hint: 'recommended', reason: '고온 항공 부품 → AMS 5xxx series' };
    }
    if (load === 'pressure' && choiceValue === 'asme') {
      return { hint: 'recommended', reason: '내압 용기 → ASME B&PV Sec.VIII' };
    }
    if (env === 'biomedical' && choiceValue !== 'fda_iso' && choiceValue !== 'none') {
      return { hint: 'caution', reason: '의료 환경에서 일반적 인증 아님 — FDA / ISO 권장' };
    }
    if (lifetime === 'safety_critical' && choiceValue === 'none') {
      return { hint: 'caution', reason: 'Safety critical → 인증 필수 (AMS / ASME / FDA 중 선택)' };
    }
    if (budget === 'low' && (choiceValue === 'ams' || choiceValue === 'fda_iso')) {
      return { hint: 'caution', reason: 'AMS / FDA grade 는 일반적으로 $50/kg 이상' };
    }
  }

  return { hint: null };
}

/* ───────── 답변 → recommended scenario + filters ───────── */

interface Recommendation {
  scenarioKey: string;
  scenarioLabel: string;
  why: string;
  guideChapters: Array<{ num: string; id: string; label: string }>;
  /** Multi-constraint query string (R144b) to pre-fill QueryBar */
  query: string;
  /** Spec hint */
  specs?: string[];
}

function deriveRecommendations(answers: Record<string, string>): Recommendation[] {
  const recs: Recommendation[] = [];
  const env = answers.environment;
  const load = answers.load;
  const lifetime = answers.lifetime;
  const budget = answers.budget;
  const cert = answers.cert;

  // 환경 기반 1차 시나리오
  const envScenario: Record<string, { key: string; label: string; query: string }> = {
    marine: { key: 'corrosion', label: '해양·내식 환경', query: 'cat:metal' },
    chemical: { key: 'corrosion', label: '화학 plant', query: 'cat:metal' },
    hightemp: { key: 'hightemp', label: '고온 응력', query: 'T>500' },
    cryogenic: { key: 'cryogenic', label: '극저온 인성', query: '' },
    biomedical: { key: 'medical', label: '의료 implant', query: '' },
    outdoor: { key: 'corrosion', label: '실외 내식·도장', query: '' },
    indoor: { key: 'lowcost', label: '실내·일반 산업', query: '' },
  };
  const envEntry = envScenario[env];

  /* R182 — 하중 기반 시나리오. KIC 강조 제거 (data 부족). 기본 물성 (σy, σUTS, E, El) 중심.
   *        impact 의 query 도 KIC 제거하고 σy + El 위주 (ductile 한 alloy 가 충격 흡수 유리). */
  const loadScenario: Record<string, { key: string; label: string; query: string }> = {
    fatigue: { key: 'fatigue', label: '피로 critical', query: 'σf>300' },
    impact: { key: 'cryogenic', label: '충격·인성', query: 'σy>400 el>10' },
    buckling: { key: 'bracket', label: '경량 강성 (좌굴)', query: 'E>100' },
    creep: { key: 'hightemp', label: 'Creep (고온 장기)', query: 'T>500' },
    pressure: { key: 'pressure_vessel', label: '압력용기', query: 'σy>300' },
    wear: { key: 'wear', label: '마모·내마모', query: 'hv>400' },
    static: { key: 'bracket', label: '정적 구조', query: 'σy>250' },
  };
  const loadEntry = loadScenario[load];

  // 인증 기반 spec hint
  const certSpec: Record<string, string[]> = {
    ams: ['AMS 5662', 'AMS 4928', 'AMS 5643'],
    astm: ['ASTM A240', 'ASTM A553'],
    asme: ['ASME SA-240', 'ASME B31.3'],
    fda_iso: ['ASTM F136', 'ASTM F75', 'ASTM F1537'],
    nace: ['NACE MR0175'],
    dnv: ['DNV OS-B101'],
  };

  // 예산 기반 query 추가
  const budgetQuery: Record<string, string> = {
    low: 'cost<10',
    mid: 'cost<50',
    high: 'cost<200',
    premium: '',
    nolimit: '',
  };

  // 1차: 환경 + 하중 우선 결합
  const primaryKey = envEntry?.key || loadEntry?.key || 'lowcost';
  const primaryLabel = `${envEntry?.label || ''}${envEntry && loadEntry ? ' + ' : ''}${loadEntry?.label || ''}`.trim() || '일반 산업';
  const queryParts: string[] = [];
  if (envEntry?.query) queryParts.push(envEntry.query);
  if (loadEntry?.query) queryParts.push(loadEntry.query);
  if (budget && budgetQuery[budget]) queryParts.push(budgetQuery[budget]);

  /* R182 — Lifetime → safety filter. KIC 제거. safety critical 의 경우 σy + El + σf 우선 검증. */
  if (lifetime === 'safety_critical') queryParts.push('σy>400 el>8');
  if (lifetime === 'long') queryParts.push('σf>200');

  /* R182 — 사용자가 step 6 에서 입력한 numeric values 를 query 에 추가. */
  const numKeys: Array<{ key: string; q: string }> = [
    { key: 'sigma_y', q: 'σy' },
    { key: 'uts', q: 'σUTS' },
    { key: 'modulus', q: 'E' },
    { key: 'elongation', q: 'el' },
  ];
  for (const n of numKeys) {
    const v = answers[n.key];
    if (v && !isNaN(parseFloat(v))) queryParts.push(`${n.q}>${parseFloat(v)}`);
  }

  // Cert specs
  const specs = cert ? certSpec[cert] : undefined;
  if (specs && specs.length) queryParts.push(`spec:${specs[0].replace(/\s+/g, '')}`);

  const guideChapters: Array<{ num: string; id: string; label: string }> = [];
  for (const s of STEPS) {
    if (s.guideChapter && answers[s.id]) guideChapters.push(s.guideChapter);
  }

  recs.push({
    scenarioKey: primaryKey,
    scenarioLabel: primaryLabel,
    why: `환경=${env || '-'}, 하중=${load || '-'}, 수명=${lifetime || '-'}, 예산=${budget || '-'}, 인증=${cert || '-'}`,
    guideChapters,
    query: queryParts.join(' '),
    specs,
  });

  // Secondary: 환경 ≠ 하중 인 경우 둘 다 후보로
  if (envEntry && loadEntry && envEntry.key !== loadEntry.key) {
    recs.push({
      scenarioKey: loadEntry.key,
      scenarioLabel: `${loadEntry.label} (대안)`,
      why: '하중 관점 대안',
      guideChapters,
      query: [loadEntry.query, budget && budgetQuery[budget]].filter(Boolean).join(' '),
      specs,
    });
  }

  // Tertiary: 가벼운 alternative (저비용)
  if (budget === 'low' || budget === 'mid') {
    recs.push({
      scenarioKey: 'lowcost',
      scenarioLabel: '저비용 대안',
      why: '예산 압박이 가장 큰 경우',
      guideChapters,
      query: budgetQuery[budget] || '',
      specs,
    });
  }

  return recs;
}

/* ───────── Wizard component ───────── */

export default function Wizard() {
  const [, navigate] = useLocation();
  const t = useT();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const recommendations = useMemo(() => deriveRecommendations(answers), [answers]);
  const isComplete = step >= STEPS.length;

  const handleSelect = (val: string) => {
    const id = STEPS[step].id;
    setAnswers((p) => ({ ...p, [id]: val }));
    // Auto-advance with small delay
    setTimeout(() => setStep((s) => Math.min(s + 1, STEPS.length)), 250);
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => { setAnswers({}); setStep(0); };

  const applyRecommendation = (rec: Recommendation) => {
    // Build URL: home + scenario preset + query
    const params = new URLSearchParams();
    params.set('p', rec.scenarioKey);
    if (rec.query) params.set('q', rec.query);
    navigate(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 h-12 flex items-center gap-2 sm:gap-3 px-2 sm:px-4 border-b border-border bg-[oklch(0.22_0.055_250)] text-sidebar-foreground">
        <Link href="/" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm hover:text-white text-sidebar-foreground/80 whitespace-nowrap">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('wizard.back')}</span>
        </Link>
        <div className="w-px h-5 bg-sidebar-border hidden sm:block" />
        <span className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-white truncate">
          <Compass className="w-4 h-4 text-accent flex-shrink-0" />
          <span className="truncate">{t('wizard.title')}</span>
        </span>
        <Link href="/guide" className="ml-auto text-[11px] text-sidebar-foreground/70 hover:text-white flex items-center gap-1 flex-shrink-0">
          <BookOpen className="w-3.5 h-3.5" /> {t('wizard.guide')}
        </Link>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8">
        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                  i < step ? 'bg-accent text-white' : i === step ? 'ring-2 ring-accent bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-[9px] text-muted-foreground hidden md:block">{s.id}</span>
            </div>
          ))}
        </div>

        {!isComplete && (
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h1 className="text-xl font-bold mb-1">{STEPS[step].question}</h1>
            {STEPS[step].detail && (
              <p className="text-[13px] text-muted-foreground mb-3">{STEPS[step].detail}</p>
            )}
            {STEPS[step].guideChapter && (
              <Link
                href={`/guide#${STEPS[step].guideChapter.id}`}
                className="text-[11px] text-accent hover:underline flex items-center gap-1 mb-3"
              >
                <BookOpen className="w-3 h-3" /> Guide {STEPS[step].guideChapter.num} — {STEPS[step].guideChapter.label}
              </Link>
            )}

            {/* R182 — Numeric input step (basic properties) — input + bracket 예시 hint */}
            {STEPS[step].numerics && (
              <div className="space-y-4 mt-4">
                {STEPS[step].numerics!.map((n) => {
                  const val = answers[n.key] || '';
                  const numVal = parseFloat(val);
                  return (
                    <div key={n.key} className="rounded border border-border bg-background p-3">
                      <div className="flex items-baseline justify-between gap-2 mb-2">
                        <label className="text-[13px] font-semibold">{n.label}</label>
                        <span className="text-[10px] text-muted-foreground">{n.unit}</span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        placeholder={n.placeholder}
                        value={val}
                        onChange={(e) => setAnswers((p) => ({ ...p, [n.key]: e.target.value }))}
                        className="w-full px-3 py-2 text-[14px] border border-border rounded bg-background focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      {/* Bracket 예시 (industrial typical values) */}
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {n.brackets.map((b, i) => {
                          const isClose = !isNaN(numVal) && Math.abs(numVal - b.value) <= b.value * 0.3;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setAnswers((p) => ({ ...p, [n.key]: String(b.value) }))}
                              className={`text-left px-2 py-1 rounded text-[10px] flex items-baseline gap-1.5 transition-colors ${
                                isClose
                                  ? 'bg-accent/15 border border-accent text-foreground'
                                  : 'hover:bg-muted/50 border border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                              title={`클릭하면 ${b.value} ${n.unit} 자동 입력`}
                            >
                              <span className="font-mono font-semibold text-foreground">{b.value}</span>
                              <span className="opacity-60">— {b.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground italic mt-2">
                  ℹ 모두 비워두면 사전 hint 만 적용. 일부 입력해도 OK (입력된 항목만 필터에 반영).
                </p>
              </div>
            )}

            {/* Categorical step (기존 choices) */}
            {STEPS[step].choices && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
              {STEPS[step].choices!.map((c) => {
                /* R162 — 이전 답변 기반 hint. */
                const { hint, reason } = choiceHint(STEPS[step].id, c.value, answers);
                const isSelected = answers[STEPS[step].id] === c.value;
                const hintBorder = hint === 'recommended'
                  ? 'border-emerald-300 ring-1 ring-emerald-200'
                  : hint === 'caution'
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-border';
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleSelect(c.value)}
                    className={`text-left p-3 rounded border transition-all hover:border-accent hover:bg-accent/5 ${
                      isSelected ? 'border-accent bg-accent/10' : hintBorder + ' bg-background'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold mb-0.5 flex-1">{c.label}</p>
                      {hint === 'recommended' && (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-300 flex-shrink-0">
                          <ThumbsUp className="w-2.5 h-2.5" /> 권장
                        </span>
                      )}
                      {hint === 'caution' && (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300 flex-shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5" /> 주의
                        </span>
                      )}
                    </div>
                    {c.detail && <p className="text-[11px] text-muted-foreground leading-snug">{c.detail}</p>}
                    {hint && reason && (
                      <p className={`text-[10px] mt-1 italic ${hint === 'recommended' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        ↳ {reason}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            )}

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/50">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> 이전
              </button>
              <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> 다시
              </button>
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(s + 1, STEPS.length))}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                {STEPS[step].numerics ? '다음' : '건너뛰기'} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-4">
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
              <p className="text-[11px] tracking-[0.25em] uppercase text-accent font-bold">추천 결과</p>
              <h1 className="text-xl font-bold mt-1">{recommendations.length} 개의 후보 시나리오</h1>
              <p className="text-[12px] text-muted-foreground mt-1">{recommendations[0]?.why}</p>
            </div>

            {recommendations.map((rec, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-card p-4 hover:border-accent transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{idx === 0 ? '1순위' : idx === 1 ? '2순위' : '3순위'}</p>
                    <h2 className="text-base font-bold mt-0.5">{rec.scenarioLabel}</h2>
                    <p className="text-[11px] text-muted-foreground mt-1">시나리오 키: <code className="font-mono text-accent">{rec.scenarioKey}</code></p>
                    {rec.query && (
                      <p className="text-[11px] mt-1.5">
                        <span className="text-muted-foreground">사전 필터:</span>{' '}
                        <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{rec.query}</code>
                      </p>
                    )}
                    {rec.specs && rec.specs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-[10px] text-muted-foreground self-center">권장 spec:</span>
                        {rec.specs.map((s) => (
                          <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => applyRecommendation(rec)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded hover:bg-accent/90 flex-shrink-0"
                  >
                    탐색기로 <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {rec.guideChapters.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-2">
                    <span className="text-[10px] text-muted-foreground self-center">관련 Guide:</span>
                    {rec.guideChapters.map((g) => (
                      <Link
                        key={g.id}
                        href={`/guide#${g.id}`}
                        className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
                      >
                        <BookOpen className="w-3 h-3" /> {g.num} {g.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center justify-center gap-3 mt-6">
              <button onClick={reset} className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> 처음부터
              </button>
              <Link href="/" className="text-[12px] text-accent hover:underline flex items-center gap-1">
                탐색기로 직접 이동 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
