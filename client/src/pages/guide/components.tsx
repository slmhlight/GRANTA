/*
 * Guide 페이지 공용 UI 컴포넌트 — 챕터·카드·강조 박스 등.
 * Guide.tsx 가 너무 커져 분리. svg 들은 ./svgs.tsx 로 별도 분리.
 */
import { useState, useEffect, Fragment, cloneElement, isValidElement, type ReactNode } from 'react';
import { Link, useParams } from 'wouter';
import { ExternalLink, Play, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import type { ScenarioKey } from '@/lib/scenario-presets';
import { linkifyTerms } from '@/lib/glossary-link';
import { TermLink, TermText } from '@/components/TermLink';

/** R61 #4 — 약어/기호 풀이 사전. F 컴포넌트가 자식 텍스트를 lookup → title 자동 부여.
 *  hover 시 native browser tooltip 으로 풀이 표시. 모바일에서는 첫 등장 시 한 번 해설.
 *  정확 일치 외에 prefix/substring 도 시도 — "σy ≥ 250 MPa" 같이 단위가 붙어도 매칭. */
const SYM_GLOSSARY: Record<string, string> = {
  'σy': '항복강도 (Yield Strength) — 영구 변형이 시작되는 응력',
  'σ_y': '항복강도 (Yield Strength) — 영구 변형이 시작되는 응력',
  'UTS': '인장강도 (Ultimate Tensile Strength) — 파단 직전의 최대 응력',
  'σu': '인장강도 (Ultimate Tensile Strength) — 파단 직전의 최대 응력',
  'E': '영률·탄성계수 (Young\'s Modulus) — 응력 ÷ 변형률, 강성의 척도',
  'ρ': '밀도 (Density) — 단위 부피당 질량 [g/cm³]',
  'KIC': '파괴인성 (Fracture Toughness K_IC) — 균열 진전 저항',
  'K_IC': '파괴인성 (Fracture Toughness K_IC) — 균열 진전 저항',
  'K': '열전도도 (Thermal Conductivity) — 단위 시간·면적·온도구배당 열류',
  'k': '열전도도 (Thermal Conductivity) — 단위 시간·면적·온도구배당 열류',
  'HV': 'Vickers 경도 — 다이아몬드 압자 압흔 면적 기준',
  'HRC': 'Rockwell C 경도 — HV ≈ 10 × HRC',
  'CTE': '열팽창계수 (Coefficient of Thermal Expansion) — 온도 변화당 길이 변화율',
  'σf': '피로한도 (Fatigue Strength) — 무한수명 응력진폭 한계',
  'σ_f': '피로한도 (Fatigue Strength) — 무한수명 응력진폭 한계',
  'σh': 'Hoop stress (원주응력) — 압력용기 σ = PD/2t',
  'σ_h': 'Hoop stress (원주응력) — 압력용기 σ = PD/2t',
  'I': '단면 2차모멘트 — 굽힘 강성의 단면 의존 항',
  'Z': '단면계수 — 굽힘 응력 σ = M/Z',
  'J': '극관성모멘트 — 비틀림 강성 θ = TL/GJ',
  'M': '성능지수 (Material Index) — Ashby 방법, 클수록 우수',
  'F': '집중 하중 (Force, N)',
  'L': '길이 (m 또는 mm)',
  'SF': '안전계수 (Safety Factor)',
};
function lookupSym(text: string): string | undefined {
  const trimmed = text.trim();
  if (SYM_GLOSSARY[trimmed]) return SYM_GLOSSARY[trimmed];
  // 단위 등 뒤붙은 경우 ("σy ≥ 250 MPa" → σy 매칭)
  const first = trimmed.split(/[\s≥≤=≈]/)[0];
  if (first && SYM_GLOSSARY[first]) return SYM_GLOSSARY[first];
  // 분수 (E^½/ρ → 첫 ρ/M 등) — first symbol 만 hover
  return undefined;
}

/** 인라인 수식/기호 강조. R61 #4 — 약어이면 hover 풀이 (점선 밑줄 신호). */
export function F({ children }: { children: React.ReactNode }) {
  const text = typeof children === 'string' ? children : '';
  const tip = text ? lookupSym(text) : undefined;
  if (tip) {
    return (
      <abbr title={tip} className="font-mono text-[0.95em] text-accent whitespace-nowrap cursor-help no-underline border-b border-dotted border-accent/40">
        {children}
      </abbr>
    );
  }
  return <span className="font-mono text-[0.95em] text-accent whitespace-nowrap">{children}</span>;
}

/** 강조 박스 — info / warn / tip / why 4 톤 */
export function Note({ children, tone = 'info', title }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'tip' | 'why'; title?: string }) {
  const cfg = {
    info: { cls: 'border-accent/30 bg-accent/5', label: '참고', icon: 'ℹ️' },
    warn: { cls: 'border-amber-400/40 bg-amber-50', label: '주의', icon: '⚠️' },
    tip: { cls: 'border-emerald-400/40 bg-emerald-50/60', label: '핵심', icon: '💡' },
    why: { cls: 'border-violet-400/40 bg-violet-50/60', label: '왜 그런가요?', icon: '🔎' },
  }[tone];
  return (
    <div className={`rounded-lg border ${cfg.cls} p-3 my-3`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70 mb-1">{cfg.icon} {title ?? cfg.label}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

/** 외부 링크 (실제 산업 예시) */
export function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline underline-offset-2 inline-flex items-center gap-0.5">
      {children}<ExternalLink className="w-3 h-3 inline" />
    </a>
  );
}

/** 용어 카드 — 새로운 용어 한 줄 정의 */
export function Term({ word, children }: { word: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded border border-border bg-muted/30 px-2 py-0.5 text-[12px]">
      <b className="text-foreground">{word}</b>
      <span className="text-muted-foreground">— {children}</span>
    </span>
  );
}

/* R227/E14/H4b — 가이드 본문 기술용어 자동링크(React 트리 재귀).
 * children 의 문자열 leaf 만 용어 링크로 치환. F(수식)·ExtLink·Term·H3·코드·헤딩·기존 링크는 스킵
 * (오탐/중첩 방지). 챕터당 첫 등장 1회(seen 공유). DOM 변형 아님 → React 재렌더 안전. */
const GLOSSARY_SKIP_TAGS = new Set(['a', 'button', 'code', 'abbr', 'sup', 'kbd', 'pre', 'h1', 'h2', 'h3', 'h4', 'style', 'script']);
function glossarySkip(type: unknown): boolean {
  if (type === F || type === ExtLink || type === Term || type === H3) return true;
  return typeof type === 'string' && GLOSSARY_SKIP_TAGS.has(type);
}
function processGlossary(node: ReactNode, seen: Set<string>, keyPrefix: string): ReactNode {
  if (typeof node === 'string') {
    const parts = linkifyTerms(node, seen);
    if (parts.length === 1 && parts[0].t === 'text') return node;
    return parts.map((p, i) =>
      p.t === 'term' ? (
        <TermLink key={`${keyPrefix}-${i}`} slug={p.slug} short={p.short}>{p.s}</TermLink>
      ) : (
        <Fragment key={`${keyPrefix}-${i}`}>{p.s}</Fragment>
      ),
    );
  }
  if (Array.isArray(node)) return node.map((c, i) => <Fragment key={`${keyPrefix}-${i}`}>{processGlossary(c, seen, `${keyPrefix}-${i}`)}</Fragment>);
  if (isValidElement(node)) {
    if (glossarySkip(node.type)) return node;
    const kids = (node.props as { children?: ReactNode })?.children;
    if (kids == null) return node;
    return cloneElement(node, undefined, processGlossary(kids, seen, keyPrefix));
  }
  return node;
}
/** 가이드 챕터 본문을 감싸 기술용어를 자동링크. */
export function GlossaryText({ children }: { children: ReactNode }) {
  const seen = new Set<string>();
  return <>{processGlossary(children, seen, 'g')}</>;
}

/** R187 — Chapter 진행률 indicator helpers (localStorage 'am_guide_read' = chapter id Set). */
const GUIDE_READ_KEY = 'am_guide_read';
function loadReadChapters(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(GUIDE_READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}
function saveReadChapters(s: Set<string>) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(GUIDE_READ_KEY, JSON.stringify(Array.from(s))); } catch {}
}
/* R187 — Custom event 로 same-window cross-component state sync.
 * (localStorage 'storage' event 는 다른 window 만 fire 함. 같은 window 의 hook 인스턴스 간 sync 위해 custom event.) */
const GUIDE_READ_EVENT = 'guide-read-change';
export function useReadChapters(): { read: Set<string>; toggle: (id: string) => void; isRead: (id: string) => boolean } {
  const [read, setRead] = useState<Set<string>>(() => loadReadChapters());
  useEffect(() => {
    const refresh = () => setRead(loadReadChapters());
    const onStorage = (e: StorageEvent) => { if (e.key === GUIDE_READ_KEY) refresh(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener(GUIDE_READ_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(GUIDE_READ_EVENT, refresh);
    };
  }, []);
  const toggle = (id: string) => {
    const next = new Set(loadReadChapters());
    if (next.has(id)) next.delete(id); else next.add(id);
    saveReadChapters(next);
    setRead(next);
    // Sync 다른 hook 인스턴스
    window.dispatchEvent(new CustomEvent(GUIDE_READ_EVENT));
  };
  const isRead = (id: string) => read.has(id);
  return { read, toggle, isRead };
}

/** 챕터 인트로 — 번호 배지 + 제목 + "이 챕터에서 배우는 것" */
/** R61 #11 — 모바일 (<sm) 에서는 chapter 가 collapsed 시작, 데스크탑은 항상 펼쳐짐.
 *  hash navigation (#ch6 등) 시 해당 챕터 자동 펼침.
 *  R187 — 학습 진행률 tracking: 'Mark as read' 버튼 + ✓ badge. */
export function Chapter({ n, id, title, learn, prereq, children }: { n: number; id: string; title: string; learn: string[]; prereq?: React.ReactNode; children?: React.ReactNode }) {
  /* R227/E14/H7 — 멀티페이지 라우팅. /guide/:section 이면 매칭 챕터만 렌더(나머지 null).
     section 미설정(/guide 랜딩)이면 종전대로 전부 렌더 → 하위호환. */
  const routeParams = useParams<{ section?: string }>();
  const routedSection = routeParams?.section;
  const isMobileInit = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
  const [isMobile, setIsMobile] = useState(() => isMobileInit);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setIsMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return n === 1;
    if (window.location.hash === `#${id}`) return true;
    return !window.matchMedia('(max-width: 639px)').matches || n === 1;
  });
  useEffect(() => {
    const onHash = () => { if (window.location.hash === `#${id}`) setOpen(true); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [id]);
  const effectiveOpen = routedSection ? true : (isMobile ? open : true); // 라우팅 단일 챕터는 항상 펼침
  // R187 — 진행률 hook
  const { isRead, toggle } = useReadChapters();
  const read = isRead(id);
  /* R188 — 학습 완료 chapter 의 'Review' toggle. learn section 을 collapse/expand.
   * Read 가 false 일 때 항상 expanded (initial 학습 mode).
   * Read 가 true 일 때 default collapsed (이미 학습 — review 시 expand). */
  const [reviewOpen, setReviewOpen] = useState(false);
  const learnVisible = !read || reviewOpen;
  // R227/E14/H7 — 라우팅: 다른 섹션이면 이 챕터는 렌더 안 함 (모든 hook 호출 이후이므로 안전).
  if (routedSection && routedSection !== id) return null;
  return (
    <section id={id} className="scroll-mt-24 mt-14">
      <div className="border-b-2 border-accent/30 pb-4 mb-5">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] tracking-[0.2em] uppercase text-accent font-bold">CHAPTER {n}</span>
          {/* R187 — Read badge */}
          {read && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold">
              ✓ 학습 완료
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <button
            type="button"
            onClick={() => isMobile && setOpen(o => !o)}
            className="sm:cursor-default flex-1 text-left flex items-baseline gap-2"
            aria-expanded={effectiveOpen}
          >
            {isMobile && (effectiveOpen ? <ChevronDown className="w-4 h-4 text-accent flex-shrink-0 self-center" /> : <ChevronRight className="w-4 h-4 text-accent flex-shrink-0 self-center" />)}
            <h2 className="text-2xl font-bold text-foreground mt-1 tracking-tight">{title}</h2>
          </button>
          {/* R188 — Review toggle (학습 완료 chapter 만) + Mark as read toggle */}
          <div className="flex-shrink-0 flex items-center gap-1.5">
            {read && (
              <button
                type="button"
                onClick={() => setReviewOpen(v => !v)}
                className="text-[11px] px-2.5 py-1 rounded border font-medium transition-colors bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100"
                title="이 chapter 의 학습 목표 다시 보기"
              >
                {reviewOpen ? '↑ 핵심 숨기기' : '↓ 핵심 다시 보기'}
              </button>
            )}
            <button
              type="button"
              onClick={() => toggle(id)}
              className={`text-[11px] px-2.5 py-1 rounded border font-medium transition-colors ${
                read
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-background border-border text-muted-foreground hover:border-accent hover:text-accent'
              }`}
              title={read ? '학습 완료 표시 취소' : '이 chapter 를 학습 완료로 표시 (localStorage 저장)'}
            >
              {read ? '✓ 읽음' : '읽음 표시'}
            </button>
          </div>
        </div>
        {effectiveOpen && learnVisible && (
          <>
            <div className={`mt-3 rounded-md border px-3 py-2 ${read ? 'bg-violet-50/50 border-violet-200' : 'bg-accent/5 border-accent/20'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${read ? 'text-violet-700' : 'text-accent'}`}>
                {read ? '핵심 요약 (Review)' : '이 챕터에서 배우는 것'}
              </p>
              <ul className="list-disc pl-5 text-sm space-y-0.5 text-foreground/85">
                {learn.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </div>
            {prereq && (
              <p className="mt-2 text-[12px] text-muted-foreground italic">선수 지식: {prereq}</p>
            )}
          </>
        )}
      </div>
      {effectiveOpen && (routedSection ? <GlossaryText>{children}</GlossaryText> : children)}
    </section>
  );
}

/** 소제목 */
export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-bold text-foreground mt-8 mb-2 flex items-center gap-2">{children}</h3>;
}

/** 물성 카드 (Chapter 1 글로서리) — 작은 아이콘 슬롯 포함 */
export function PropCard({ name, unit, icon, intuition, useFor, range }: { name: string; unit: string; icon?: React.ReactNode; intuition: string; useFor: string; range: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-accent/40 transition-colors">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2 mb-2">
        <div className="min-w-0">
          <p className="font-bold text-foreground">{name}</p>
          <p className="font-mono text-[11px] text-accent">{unit}</p>
        </div>
        {icon && <div className="w-28 h-20 flex-shrink-0 bg-muted/30 rounded border border-border/50 p-1.5">{icon}</div>}
      </div>
      <p className="text-[13px] leading-relaxed text-foreground/90"><b className="text-accent">물리적 의미:</b> <TermText text={intuition} /></p>
      <p className="text-[12px] mt-2 leading-relaxed text-muted-foreground"><b className="text-foreground/80">관련 설계 요구:</b> <TermText text={useFor} /></p>
      <p className="text-[11px] mt-2 text-muted-foreground font-mono"><b className="not-italic text-foreground/70">일반 범위:</b> {range}</p>
    </div>
  );
}

/** 워크드 예제의 한 단계 — 번호 + 식 + 설명 */
export function Step({ n, title, formula, result, note }: { n: number; title: React.ReactNode; formula?: React.ReactNode; result?: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex gap-3 my-2">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-white text-sm font-bold flex items-center justify-center shadow-sm">{n}</div>
      <div className="flex-1 min-w-0 border-l-2 border-accent/30 pl-3 pb-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {formula && <p className="font-mono text-[13px] mt-1 bg-muted/40 px-2 py-1 rounded inline-block text-foreground/90">{formula}</p>}
        {result && <p className="text-sm mt-1 text-foreground/90"><b className="text-emerald-700">→</b> {result}</p>}
        {note && <p className="text-[12px] mt-1 text-muted-foreground italic">{note}</p>}
      </div>
    </div>
  );
}

/** 단면 형상 카드 (Chapter 3) */
export function ShapeCard({ svg, name, dims, formulas, usedFor }: { svg: React.ReactNode; name: string; dims: string; formulas: { label: string; expr: string }[]; usedFor: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="w-24 h-24 flex-shrink-0 bg-muted/30 rounded border border-border/60 flex items-center justify-center p-1">{svg}</div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground">{name}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{dims}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {formulas.map((f, i) => (
          <div key={i} className="flex items-baseline gap-2 text-[12.5px]">
            <span className="font-mono text-accent w-12 flex-shrink-0">{f.label}</span>
            <span className="font-mono text-foreground/90">{f.expr}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] mt-3 pt-2 border-t border-border/60 text-muted-foreground"><b className="text-foreground/80">자주 쓰이는 곳:</b> {usedFor}</p>
    </div>
  );
}

/** 보 하중 케이스 카드 (Chapter 4) */
export function LoadCard({ svg, name, deflection, moment, common, hint }: { svg: React.ReactNode; name: string; deflection: string; moment: string; common: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-bold text-foreground mb-2">{name}</p>
      <div className="bg-muted/30 rounded border border-border/60 p-2 flex items-center justify-center min-h-[88px]">{svg}</div>
      {/* R189 — label width w-16 (64px) 가 한글 "최대 처짐"/"최대 모멘트" mono 7-8글자 (~84-96px)
                보다 좁아 줄바꿈 ('최대 처\n트') 발생 → w-20 (80px) 으로 확장. */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-baseline gap-2 text-[13px]">
          <span className="font-mono text-accent w-24 flex-shrink-0 whitespace-nowrap">최대 처짐</span>
          <span className="font-mono text-foreground/90">{deflection}</span>
        </div>
        <div className="flex items-baseline gap-2 text-[13px]">
          <span className="font-mono text-accent w-24 flex-shrink-0 whitespace-nowrap">최대 모멘트</span>
          <span className="font-mono text-foreground/90">{moment}</span>
        </div>
      </div>
      <p className="text-[11px] mt-3 pt-2 border-t border-border/60 text-muted-foreground"><b className="text-foreground/80">자주 쓰이는 예:</b> {common}</p>
      {hint && <p className="text-[11px] mt-1 text-amber-700">⚠ {hint}</p>}
    </div>
  );
}

/** 사례별 카드 (Chapter 7) — 기존 SVG / 외부 링크 유지 */
export function Scenario({ n, title, presetKey, diagram, examples, situation, needs, steps, families, onConfigure }: {
  n: number;
  title: React.ReactNode;
  presetKey: ScenarioKey;
  diagram: React.ReactNode;
  examples: React.ReactNode;
  situation: React.ReactNode;
  needs: React.ReactNode;
  steps: React.ReactNode[];
  families: React.ReactNode;
  onConfigure: (k: ScenarioKey) => void;
}) {
  const Label = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-accent/80">{children}</span>
  );
  return (
    <div className="rounded-lg border border-border bg-card p-4 my-5">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-32 h-24 bg-muted/30 rounded border border-border/60 flex items-center justify-center p-2">{diagram}</div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground"><span className="text-accent">사례 {n}.</span> {title}</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{situation}</p>
          <p className="text-xs mt-2 leading-relaxed"><Label>실제 예시</Label> <span className="ml-1">{examples}</span></p>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm leading-relaxed">
        <div><Label>요구 → 숫자</Label><div className="mt-0.5">{needs}</div></div>
        <div><Label>이 앱에서</Label><ol className="list-decimal pl-5 space-y-0.5 mt-0.5">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
        <div><Label>유력 재료군</Label> <span>{families}</span></div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/60 flex justify-end gap-2">
        <button type="button" onClick={() => onConfigure(presetKey)} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-accent text-accent hover:bg-accent/10 transition-colors" title="치수·하중을 입력해 정밀하게 시작">
          <Settings className="w-3 h-3" /> 세부 조건 입력
        </button>
        <Link href={`/?p=${presetKey}`} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-accent text-white hover:bg-accent/90 transition-colors" title="기본값으로 바로 시작">
          <Play className="w-3 h-3" /> 빠른 시작
        </Link>
      </div>
    </div>
  );
}
