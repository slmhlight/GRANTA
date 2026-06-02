/*
 * 재료 선택 가이드 (한국어) — 기계공학 1학년부터 따라올 수 있도록
 * 교과서식으로 풀어 쓴 도움말 페이지. 챕터 단위 구성 + 카드형 시각 자료.
 *
 * 내용은 정립된 공학 지식 (Ashby, "Materials Selection in Mechanical Design";
 * Ansys Granta EduPack 교육자료; 일반 재료역학) 기반. 워크드 예제의 수치는
 * 방법을 보여주기 위한 예시이며 특정 재료의 측정값이 아님.
 */
import { Link } from 'wouter';
import { useState } from 'react';
import { ArrowLeft, GraduationCap, Ruler, Target, LineChart, ListChecks, AlertTriangle, BookText, ExternalLink, Play, Sigma, Lightbulb, BookOpen, Compass, Settings } from 'lucide-react';
import type { ScenarioKey } from '@/lib/scenario-presets';
import { ScenarioDialog } from '@/components/ScenarioDialog';

/* ─────────────────────────────────────────────────────────────────────────────
 * 작은 표시 컴포넌트
 * ────────────────────────────────────────────────────────────────────────── */

/** 인라인 수식/기호 강조 */
function F({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[0.95em] text-accent whitespace-nowrap">{children}</span>;
}

/** 강조 박스 */
function Note({ children, tone = 'info', title }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'tip' | 'why'; title?: string }) {
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
function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline underline-offset-2 inline-flex items-center gap-0.5">
      {children}<ExternalLink className="w-3 h-3 inline" />
    </a>
  );
}

/** 용어 카드 — 새로운 용어 한 줄 정의 */
function Term({ word, children }: { word: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded border border-border bg-muted/30 px-2 py-0.5 text-[12px]">
      <b className="text-foreground">{word}</b>
      <span className="text-muted-foreground">— {children}</span>
    </span>
  );
}

/** 챕터 인트로 — 번호 배지 + 제목 + "이 챕터에서 배우는 것" */
function Chapter({ n, id, title, learn, prereq, children }: { n: number; id: string; title: string; learn: string[]; prereq?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mt-14">
      <div className="border-b-2 border-accent/30 pb-4 mb-5">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] tracking-[0.2em] uppercase text-accent font-bold">CHAPTER {n}</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mt-1 tracking-tight">{title}</h2>
        <div className="mt-3 rounded-md bg-accent/5 border border-accent/20 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1">이 챕터에서 배우는 것</p>
          <ul className="list-disc pl-5 text-sm space-y-0.5 text-foreground/85">
            {learn.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
        {prereq && (
          <p className="mt-2 text-[12px] text-muted-foreground italic">선수 지식: {prereq}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** 소제목 */
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-bold text-foreground mt-8 mb-2 flex items-center gap-2">{children}</h3>;
}

/** 물성 카드 (Chapter 1 글로서리) — 작은 아이콘 슬롯 포함 */
function PropCard({ name, unit, icon, intuition, useFor, range }: { name: string; unit: string; icon?: React.ReactNode; intuition: string; useFor: string; range: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-accent/40 transition-colors">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2 mb-2">
        <div className="min-w-0">
          <p className="font-bold text-foreground">{name}</p>
          <p className="font-mono text-[11px] text-accent">{unit}</p>
        </div>
        {icon && <div className="w-20 h-12 flex-shrink-0 bg-muted/30 rounded border border-border/50 p-1">{icon}</div>}
      </div>
      <p className="text-[13px] leading-relaxed text-foreground/90"><b className="text-accent">감 잡기:</b> {intuition}</p>
      <p className="text-[12px] mt-2 leading-relaxed text-muted-foreground"><b className="text-foreground/80">언제 보나:</b> {useFor}</p>
      <p className="text-[11px] mt-2 text-muted-foreground font-mono"><b className="not-italic text-foreground/70">일반 범위:</b> {range}</p>
    </div>
  );
}

/** 워크드 예제의 한 단계 — 번호 + 식 + 설명 */
function Step({ n, title, formula, result, note }: { n: number; title: React.ReactNode; formula?: React.ReactNode; result?: React.ReactNode; note?: React.ReactNode }) {
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
function ShapeCard({ svg, name, dims, formulas, usedFor }: { svg: React.ReactNode; name: string; dims: string; formulas: { label: string; expr: string }[]; usedFor: string }) {
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
function LoadCard({ svg, name, deflection, moment, common, hint }: { svg: React.ReactNode; name: string; deflection: string; moment: string; common: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-bold text-foreground mb-2">{name}</p>
      <div className="bg-muted/30 rounded border border-border/60 p-2 flex items-center justify-center min-h-[88px]">{svg}</div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-baseline gap-2 text-[13px]">
          <span className="font-mono text-accent w-16 flex-shrink-0">최대 처짐</span>
          <span className="font-mono text-foreground/90">{deflection}</span>
        </div>
        <div className="flex items-baseline gap-2 text-[13px]">
          <span className="font-mono text-accent w-16 flex-shrink-0">최대 모멘트</span>
          <span className="font-mono text-foreground/90">{moment}</span>
        </div>
      </div>
      <p className="text-[11px] mt-3 pt-2 border-t border-border/60 text-muted-foreground"><b className="text-foreground/80">자주 쓰이는 예:</b> {common}</p>
      {hint && <p className="text-[11px] mt-1 text-amber-700">⚠ {hint}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 사례별 카드 (Chapter 7) — 기존 SVG / 외부 링크 유지
 * ────────────────────────────────────────────────────────────────────────── */
function Scenario({ n, title, presetKey, diagram, examples, situation, needs, steps, families, onConfigure }: {
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

/* ─────────────────────────────────────────────────────────────────────────────
 * 시나리오 도식 SVG 8종 (기존 유지)
 * ────────────────────────────────────────────────────────────────────────── */
const stroke = 'stroke-foreground/70';
const accent = 'stroke-accent';
const force = 'stroke-rose-500';
const SvgBracket = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <g className={stroke} strokeWidth="1.2"><line x1="14" y1="8" x2="14" y2="82" /><line x1="10" y1="12" x2="14" y2="16" /><line x1="10" y1="22" x2="14" y2="26" /><line x1="10" y1="32" x2="14" y2="36" /><line x1="10" y1="42" x2="14" y2="46" /><line x1="10" y1="52" x2="14" y2="56" /><line x1="10" y1="62" x2="14" y2="66" /><line x1="10" y1="72" x2="14" y2="76" /></g>
    <path d="M 14 14 L 96 14 L 96 30 L 30 30 L 30 82 L 14 82 Z" className={`fill-accent/15 ${accent}`} strokeWidth="2" />
    <g className={force} strokeWidth="2" fill="none"><line x1="86" y1="34" x2="86" y2="64" /><polyline points="80,58 86,68 92,58" /></g>
    <text x="90" y="50" fontSize="10" className="fill-rose-500" fontFamily="monospace">F</text>
  </svg>
);
const SvgManifold = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <path d="M 16 60 L 100 60 M 30 60 L 30 22 M 50 60 L 50 22 M 70 60 L 70 22 M 90 60 L 90 22" className={`fill-none ${accent}`} strokeWidth="3.5" strokeLinecap="round" />
    <g className={force} strokeWidth="1.5" fill="none"><path d="M 30 18 q 3 -4 6 0 t 6 0" /><path d="M 50 18 q 3 -4 6 0 t 6 0" /><path d="M 70 18 q 3 -4 6 0 t 6 0" /></g>
    <text x="10" y="80" fontSize="9" className="fill-rose-500" fontFamily="monospace">~700°C</text>
  </svg>
);
const SvgShaft = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <rect x="14" y="38" width="92" height="18" rx="2" className={`fill-accent/15 ${accent}`} strokeWidth="2" />
    <g className={stroke} strokeWidth="1.5" fill="none"><rect x="22" y="32" width="10" height="30" /><rect x="88" y="32" width="10" height="30" /></g>
    <path d="M 60 30 a 14 14 0 1 1 -10 6" className={accent} strokeWidth="1.5" fill="none" />
    <polygon points="48,32 52,38 56,32" className="fill-accent" />
    <text x="14" y="80" fontSize="9" className="fill-rose-500" fontFamily="monospace">±σ 반복</text>
  </svg>
);
const SvgPrecision = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <rect x="22" y="36" width="60" height="32" rx="2" className={`fill-accent/15 ${accent}`} strokeWidth="2" />
    <g className={force} strokeWidth="1.5" fill="none"><circle cx="98" cy="40" r="5" /><line x1="98" y1="45" x2="98" y2="64" /><circle cx="98" cy="64" r="3.5" className="fill-rose-500" /></g>
    <text x="89" y="80" fontSize="9" className="fill-rose-500" fontFamily="monospace">ΔT</text>
    <g className={stroke} strokeWidth="1" fill="none"><line x1="22" y1="76" x2="82" y2="76" /><line x1="22" y1="73" x2="22" y2="79" /><line x1="82" y1="73" x2="82" y2="79" /></g>
    <text x="38" y="86" fontSize="8" className="fill-foreground/70" fontFamily="monospace">ΔL ≈ 0</text>
  </svg>
);
const SvgMarine = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <path d="M 6 28 q 6 -6 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0" className="stroke-sky-500" strokeWidth="1.5" fill="none" />
    <circle cx="60" cy="58" r="18" className={`fill-accent/15 ${accent}`} strokeWidth="2" />
    <g className={accent} strokeWidth="1.5"><line x1="60" y1="40" x2="60" y2="76" /><line x1="42" y1="58" x2="78" y2="58" /><line x1="47" y1="45" x2="73" y2="71" /><line x1="73" y1="45" x2="47" y2="71" /></g>
    <text x="20" y="86" fontSize="8" className="fill-sky-600" fontFamily="monospace">Cl⁻ · NaCl</text>
  </svg>
);
const SvgLowcost = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <g className={`fill-accent/15 ${accent}`} strokeWidth="1.5">
      <rect x="10" y="20" width="32" height="18" rx="1.5" /><rect x="10" y="42" width="32" height="18" rx="1.5" /><rect x="10" y="64" width="32" height="18" rx="1.5" />
      <rect x="48" y="20" width="32" height="18" rx="1.5" /><rect x="48" y="42" width="32" height="18" rx="1.5" /><rect x="48" y="64" width="32" height="18" rx="1.5" />
    </g>
    <text x="92" y="46" fontSize="22" className="fill-emerald-600" fontFamily="serif" fontWeight="bold">$</text>
    <text x="86" y="64" fontSize="8" className="fill-foreground/60" fontFamily="monospace">×10⁵</text>
  </svg>
);
const SvgSpring = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <path d="M 18 45 q 6 -18 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0" className={accent} strokeWidth="2.5" fill="none" />
    <line x1="14" y1="22" x2="14" y2="68" className={stroke} strokeWidth="2.5" />
    <line x1="106" y1="22" x2="106" y2="68" className={stroke} strokeWidth="2.5" />
    <g className={force} strokeWidth="1.5" fill="none"><line x1="6" y1="45" x2="14" y2="45" /><polyline points="8,42 4,45 8,48" /><line x1="106" y1="45" x2="114" y2="45" /><polyline points="112,42 116,45 112,48" /></g>
    <text x="44" y="82" fontSize="9" className="fill-foreground/70" fontFamily="monospace">σy² / E ↑</text>
  </svg>
);
const SvgHeatsink = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <g className={`fill-accent/20 ${accent}`} strokeWidth="1.2">
      <rect x="20" y="14" width="6" height="40" /><rect x="32" y="14" width="6" height="40" /><rect x="44" y="14" width="6" height="40" /><rect x="56" y="14" width="6" height="40" /><rect x="68" y="14" width="6" height="40" /><rect x="80" y="14" width="6" height="40" /><rect x="92" y="14" width="6" height="40" />
    </g>
    <rect x="14" y="54" width="92" height="10" className={`fill-accent/30 ${accent}`} strokeWidth="1.5" />
    <rect x="50" y="68" width="20" height="6" className="fill-rose-500/70" stroke="none" />
    <g className={force} strokeWidth="1.5" fill="none"><path d="M 36 12 q 2 -4 4 0 t 4 0" /><path d="M 58 8 q 2 -4 4 0 t 4 0" /><path d="M 78 12 q 2 -4 4 0 t 4 0" /></g>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
 * 단면 형상 SVG (Chapter 3) — Chapter 카드용 큰 버전
 * ────────────────────────────────────────────────────────────────────────── */
const SvgRect = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <rect x="22" y="10" width="46" height="60" className="fill-accent/15 stroke-accent" strokeWidth="2"/>
    <line x1="14" y1="40" x2="76" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="40" y="78" fontSize="11" className="fill-foreground/70" fontFamily="monospace">b</text>
    <text x="73" y="44" fontSize="11" className="fill-foreground/70" fontFamily="monospace">h</text>
  </svg>
);
const SvgSquare = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <rect x="24" y="14" width="42" height="52" className="fill-accent/15 stroke-accent" strokeWidth="2"/>
    <line x1="16" y1="40" x2="74" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="42" y="78" fontSize="11" className="fill-foreground/70" fontFamily="monospace">a</text>
  </svg>
);
const SvgCircle = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <circle cx="45" cy="40" r="26" className="fill-accent/15 stroke-accent" strokeWidth="2"/>
    <line x1="14" y1="40" x2="76" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="42" y="78" fontSize="11" className="fill-foreground/70" fontFamily="monospace">d</text>
  </svg>
);
const SvgBox = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <rect x="16" y="10" width="58" height="60" className="fill-accent/15 stroke-accent" strokeWidth="2"/>
    <rect x="30" y="22" width="30" height="36" className="fill-background stroke-accent" strokeWidth="1.5"/>
    <line x1="10" y1="40" x2="80" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="36" y="78" fontSize="10" className="fill-foreground/70" fontFamily="monospace">B,b</text>
  </svg>
);
const SvgTube = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <circle cx="45" cy="40" r="28" className="fill-accent/15 stroke-accent" strokeWidth="2"/>
    <circle cx="45" cy="40" r="16" className="fill-background stroke-accent" strokeWidth="1.5"/>
    <line x1="12" y1="40" x2="78" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="40" y="78" fontSize="10" className="fill-foreground/70" fontFamily="monospace">D,d</text>
  </svg>
);
const SvgIBeam = () => (
  <svg viewBox="0 0 90 80" className="w-full h-full">
    <g className="fill-accent/15 stroke-accent" strokeWidth="1.6">
      <rect x="14" y="12" width="62" height="10"/>
      <rect x="40" y="22" width="10" height="36"/>
      <rect x="14" y="58" width="62" height="10"/>
    </g>
    <line x1="8" y1="40" x2="82" y2="40" strokeDasharray="3 2" className="stroke-foreground/40"/>
    <text x="32" y="78" fontSize="10" className="fill-foreground/70" fontFamily="monospace">I-빔</text>
  </svg>
);

/* 보 케이스 SVG (Chapter 4) — 큰 버전 */
const wallHatch = (x: number) => (
  <g className={stroke} strokeWidth="1">
    <line x1={x} y1={12} x2={x} y2={60}/>
    {[16,24,32,40,48,56].map(y => <line key={y} x1={x-4} y1={y-2} x2={x} y2={y+2}/>)}
  </g>
);
const wallHatchR = (x: number) => (
  <g className={stroke} strokeWidth="1">
    <line x1={x} y1={12} x2={x} y2={60}/>
    {[16,24,32,40,48,56].map(y => <line key={y} x1={x} y1={y-2} x2={x+4} y2={y+2}/>)}
  </g>
);
const udl = (x1: number, x2: number) => (
  <g className={force} strokeWidth="1.5" fill="none">
    {Array.from({length: Math.floor((x2-x1)/14)+1}, (_,i)=>x1+8+i*14).filter(x=>x<x2-4).map(x => (
      <g key={x}><line x1={x} y1={14} x2={x} y2={28}/><polyline points={`${x-2},26 ${x},30 ${x+2},26`}/></g>
    ))}
  </g>
);
const SvgCantilever = () => (
  <svg viewBox="0 0 200 80" className="w-full h-full">
    {wallHatch(20)}
    <rect x="20" y="32" width="160" height="10" className={`fill-accent/15 ${accent}`} strokeWidth="2"/>
    <g className={force} strokeWidth="2.4" fill="none"><line x1="175" y1="14" x2="175" y2="52"/><polyline points="170,46 175,54 180,46"/></g>
    <text x="168" y="10" fontSize="12" className="fill-rose-500" fontFamily="monospace">F</text>
    <text x="92" y="72" fontSize="11" className="fill-foreground/70" fontFamily="monospace">L</text>
  </svg>
);
const SvgCantileverUDL = () => (
  <svg viewBox="0 0 200 80" className="w-full h-full">
    {wallHatch(20)}
    <rect x="20" y="32" width="160" height="10" className={`fill-accent/15 ${accent}`} strokeWidth="2"/>
    {udl(28, 180)}
    <text x="94" y="10" fontSize="12" className="fill-rose-500" fontFamily="monospace">w</text>
  </svg>
);
const SvgSimpleCenter = () => (
  <svg viewBox="0 0 200 80" className="w-full h-full">
    <rect x="14" y="32" width="172" height="10" className={`fill-accent/15 ${accent}`} strokeWidth="2"/>
    <polygon points="14,42 6,56 22,56" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    <polygon points="186,42 178,56 194,56" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    <g className={force} strokeWidth="2.4" fill="none"><line x1="100" y1="12" x2="100" y2="32"/><polyline points="95,26 100,34 105,26"/></g>
    <text x="92" y="9" fontSize="12" className="fill-rose-500" fontFamily="monospace">F</text>
    <text x="60" y="74" fontSize="11" className="fill-foreground/70" fontFamily="monospace">L/2</text>
    <text x="116" y="74" fontSize="11" className="fill-foreground/70" fontFamily="monospace">L/2</text>
  </svg>
);
const SvgSimpleUDL = () => (
  <svg viewBox="0 0 200 80" className="w-full h-full">
    <rect x="14" y="32" width="172" height="10" className={`fill-accent/15 ${accent}`} strokeWidth="2"/>
    <polygon points="14,42 6,56 22,56" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    <polygon points="186,42 178,56 194,56" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    {udl(22, 180)}
    <text x="94" y="10" fontSize="12" className="fill-rose-500" fontFamily="monospace">w</text>
  </svg>
);
const SvgFixedCenter = () => (
  <svg viewBox="0 0 200 80" className="w-full h-full">
    {wallHatch(20)}{wallHatchR(180)}
    <rect x="20" y="32" width="160" height="10" className={`fill-accent/15 ${accent}`} strokeWidth="2"/>
    <g className={force} strokeWidth="2.4" fill="none"><line x1="100" y1="12" x2="100" y2="32"/><polyline points="95,26 100,34 105,26"/></g>
    <text x="92" y="9" fontSize="12" className="fill-rose-500" fontFamily="monospace">F</text>
  </svg>
);
const SvgFixedUDL = () => (
  <svg viewBox="0 0 200 80" className="w-full h-full">
    {wallHatch(20)}{wallHatchR(180)}
    <rect x="20" y="32" width="160" height="10" className={`fill-accent/15 ${accent}`} strokeWidth="2"/>
    {udl(28, 180)}
    <text x="94" y="10" fontSize="12" className="fill-rose-500" fontFamily="monospace">w</text>
  </svg>
);
const SvgColumn = () => (
  <svg viewBox="0 0 120 100" className="w-full h-full">
    <g className={stroke} strokeWidth="1"><line x1="20" y1="88" x2="100" y2="88"/>{[24,34,44,54,64,74,84].map(x => <line key={x} x1={x} y1={88} x2={x-4} y2={96}/>)}</g>
    <rect x="55" y="18" width="10" height="70" className={`fill-accent/15 ${accent}`} strokeWidth="2"/>
    <g className={force} strokeWidth="2.4" fill="none"><line x1="60" y1="4" x2="60" y2="18"/><polyline points="55,14 60,20 65,14"/></g>
    <text x="48" y="8" fontSize="12" className="fill-rose-500" fontFamily="monospace">P</text>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
 * 교육용 큰 도식 (Chapter 인트로용)
 * ────────────────────────────────────────────────────────────────────────── */

/** 응력-변형률 곡선 — 한 그림으로 σy·UTS·연신율·E 모두 라벨링 */
const SvgStressStrain = () => (
  <svg viewBox="0 0 320 200" className="w-full h-full">
    {/* 격자 (살짝) */}
    <g className="stroke-foreground/10" strokeWidth="0.8">
      {[40, 80, 120, 160].map(y => <line key={y} x1="40" y1={y} x2="300" y2={y} />)}
      {[80, 130, 180, 230, 280].map(x => <line key={x} x1={x} y1="20" y2="180" x2={x} />)}
    </g>
    {/* 축 */}
    <g className="stroke-foreground/80" strokeWidth="1.5" fill="none">
      <line x1="40" y1="20" x2="40" y2="180" />
      <line x1="40" y1="180" x2="300" y2="180" />
      <polyline points="36,28 40,18 44,28" />
      <polyline points="292,176 302,180 292,184" />
    </g>
    <text x="20" y="22" fontSize="11" className="fill-foreground font-semibold">σ</text>
    <text x="306" y="178" fontSize="11" className="fill-foreground font-semibold">ε</text>

    {/* 곡선: 탄성(선형) → 항복 무릎 → 가공경화 → UTS → 네킹 → 파단 */}
    <path d="M 40 180 L 100 70 Q 115 60 145 60 Q 195 65 220 40 Q 245 40 260 130" fill="none" className="stroke-accent" strokeWidth="2.6" />
    {/* 파단 점 (X 표시) */}
    <g className="stroke-rose-500" strokeWidth="2"><line x1="255" y1="125" x2="265" y2="135" /><line x1="265" y1="125" x2="255" y2="135" /></g>
    <text x="248" y="148" fontSize="10" className="fill-rose-500" fontFamily="monospace">파단</text>

    {/* σy 표식 */}
    <line x1="40" y1="70" x2="100" y2="70" className="stroke-emerald-600" strokeDasharray="3 2" strokeWidth="1.2" />
    <line x1="100" y1="70" x2="100" y2="180" className="stroke-emerald-600" strokeDasharray="3 2" strokeWidth="1.2" />
    <circle cx="100" cy="70" r="3.5" className="fill-emerald-600" />
    <text x="18" y="74" fontSize="11" className="fill-emerald-600 font-bold">σy</text>

    {/* UTS 표식 */}
    <line x1="40" y1="40" x2="220" y2="40" className="stroke-violet-600" strokeDasharray="3 2" strokeWidth="1.2" />
    <circle cx="220" cy="40" r="3.5" className="fill-violet-600" />
    <text x="14" y="44" fontSize="11" className="fill-violet-600 font-bold">UTS</text>

    {/* E 기울기 표시 */}
    <text x="58" y="120" fontSize="10" className="fill-amber-600 font-semibold">E = 기울기 (강성)</text>
    <line x1="55" y1="135" x2="95" y2="80" className="stroke-amber-600" strokeWidth="1.4" strokeDasharray="3 2" />

    {/* 연신율 = 파단 점의 x */}
    <g className="stroke-sky-500" strokeWidth="1.2" fill="none">
      <line x1="40" y1="192" x2="260" y2="192" />
      <polyline points="44,189 40,192 44,195" />
      <polyline points="256,189 260,192 256,195" />
    </g>
    <text x="125" y="200" fontSize="10" className="fill-sky-600 font-semibold">연신율 (파단 변형률)</text>

    {/* 구간 라벨 */}
    <text x="55" y="155" fontSize="9" className="fill-foreground/60">탄성</text>
    <text x="115" y="55" fontSize="9" className="fill-foreground/60">소성(가공경화)</text>
    <text x="226" y="55" fontSize="9" className="fill-foreground/60">네킹</text>
  </svg>
);

/** 굽힘 응력 분포 — 중립축과 σ_max 위치, 왜 I가 중요한가 */
const SvgBendingStress = () => (
  <svg viewBox="0 0 320 180" className="w-full h-full">
    {/* 1) 좌측: 보가 굽혀진 모습 */}
    <text x="6" y="14" fontSize="10" className="fill-foreground/70 font-semibold">① 굽힘 받은 보</text>
    <path d="M 10 50 Q 80 90 150 50" fill="none" className="stroke-accent" strokeWidth="2.2" />
    <path d="M 10 70 Q 80 110 150 70" fill="none" className="stroke-accent/50" strokeWidth="2" strokeDasharray="3 2" />
    {/* 단부 모멘트 */}
    <path d="M 14 38 a 8 8 0 1 1 0 16" fill="none" className="stroke-foreground/70" strokeWidth="1.3" />
    <polygon points="13,38 18,38 16,33" className="fill-foreground/70" />
    <path d="M 146 38 a 8 8 0 1 0 0 16" fill="none" className="stroke-foreground/70" strokeWidth="1.3" />
    <polygon points="146,38 142,38 144,33" className="fill-foreground/70" />
    <text x="20" y="34" fontSize="9" className="fill-foreground/70" fontFamily="monospace">M</text>
    <text x="138" y="34" fontSize="9" className="fill-foreground/70" fontFamily="monospace">M</text>

    {/* 2) 우측: 단면 + 응력 분포 삼각형 */}
    <text x="172" y="14" fontSize="10" className="fill-foreground/70 font-semibold">② 단면 + 응력 분포</text>
    <rect x="180" y="30" width="50" height="120" className="fill-accent/15 stroke-accent" strokeWidth="2" />
    {/* 중립축 */}
    <line x1="172" y1="90" x2="312" y2="90" className="stroke-foreground/60" strokeDasharray="3 2" strokeWidth="1.2" />
    <text x="168" y="94" fontSize="9" className="fill-foreground/70" textAnchor="end">중립축</text>

    {/* 상부 압축 삼각형 (σ = -) */}
    <polygon points="230,30 280,30 230,90" className="fill-rose-500/20 stroke-rose-500" strokeWidth="1.5" />
    {/* 하부 인장 삼각형 (σ = +) */}
    <polygon points="230,90 280,150 230,150" className="fill-sky-500/20 stroke-sky-500" strokeWidth="1.5" />
    {/* 압축 화살표 */}
    <g className="stroke-rose-500" strokeWidth="1.4" fill="rose-500">
      <line x1="232" y1="32" x2="278" y2="32" /><polyline points="274,28 278,32 274,36" fill="none" />
      <line x1="232" y1="50" x2="266" y2="50" /><polyline points="262,46 266,50 262,54" fill="none" />
      <line x1="232" y1="70" x2="250" y2="70" /><polyline points="246,66 250,70 246,74" fill="none" />
    </g>
    {/* 인장 화살표 */}
    <g className="stroke-sky-500" strokeWidth="1.4" fill="none">
      <line x1="232" y1="110" x2="252" y2="110" /><polyline points="248,106 252,110 248,114" />
      <line x1="232" y1="130" x2="268" y2="130" /><polyline points="264,126 268,130 264,134" />
      <line x1="232" y1="148" x2="278" y2="148" /><polyline points="274,144 278,148 274,152" />
    </g>
    <text x="282" y="34" fontSize="9" className="fill-rose-500 font-semibold">σ_max (압축)</text>
    <text x="282" y="152" fontSize="9" className="fill-sky-500 font-semibold">σ_max (인장)</text>

    {/* c 라벨 */}
    <g className="stroke-foreground/60" strokeWidth="1" fill="none">
      <line x1="174" y1="30" x2="178" y2="30" /><line x1="174" y1="90" x2="178" y2="90" /><line x1="176" y1="30" x2="176" y2="90" />
    </g>
    <text x="160" y="62" fontSize="10" className="fill-foreground/70" fontFamily="monospace">c</text>

    {/* 공식 */}
    <text x="2" y="172" fontSize="11" className="fill-foreground font-mono">σ_max = M · c / I &nbsp;→&nbsp; 같은 M·c여도 I가 크면 σ가 작아짐</text>
  </svg>
);

/** Ashby 차트 샘플 — 한계선·외피·등지수선·통과 영역 라벨 */
const SvgAshbyChart = () => (
  <svg viewBox="0 0 320 220" className="w-full h-full">
    <text x="8" y="14" fontSize="10" className="fill-foreground/70 font-semibold">샘플: ρ vs σy (log–log)</text>
    {/* 축 */}
    <g className="stroke-foreground/70" strokeWidth="1.4" fill="none">
      <line x1="40" y1="30" x2="40" y2="190" />
      <line x1="40" y1="190" x2="300" y2="190" />
      <polyline points="36,38 40,28 44,38" />
      <polyline points="292,186 302,190 292,194" />
    </g>
    <text x="14" y="34" fontSize="10" className="fill-foreground/70 font-mono">σy</text>
    <text x="304" y="190" fontSize="10" className="fill-foreground/70 font-mono">ρ</text>

    {/* 한계선 (수평: σy 하한) */}
    <line x1="40" y1="110" x2="300" y2="110" className="stroke-amber-500" strokeWidth="1.5" strokeDasharray="5 3" />
    <text x="240" y="106" fontSize="9" className="fill-amber-600 font-semibold">σy ≥ 한계 (필터)</text>

    {/* 외피 — 폴리머, 알루미늄, 강철, 티타늄 (대략 위치) */}
    <ellipse cx="220" cy="160" rx="38" ry="14" className="fill-emerald-500/15 stroke-emerald-600" strokeWidth="1.5" />
    <text x="200" y="178" fontSize="9" className="fill-emerald-700">폴리머</text>
    <ellipse cx="160" cy="120" rx="28" ry="14" className="fill-amber-500/15 stroke-amber-600" strokeWidth="1.5" />
    <text x="142" y="138" fontSize="9" className="fill-amber-700">알루미늄</text>
    <ellipse cx="120" cy="78" rx="22" ry="16" className="fill-sky-500/15 stroke-sky-600" strokeWidth="1.5" />
    <text x="104" y="56" fontSize="9" className="fill-sky-700">티타늄</text>
    <ellipse cx="200" cy="70" rx="34" ry="20" className="fill-violet-500/15 stroke-violet-600" strokeWidth="1.5" />
    <text x="186" y="48" fontSize="9" className="fill-violet-700">강·고합금</text>

    {/* 등지수선 (slope 1 on log–log → M = σy/ρ) */}
    <line x1="60" y1="180" x2="280" y2="55" className="stroke-rose-500" strokeWidth="2.2" />
    <polygon points="280,55 274,57 277,63" className="fill-rose-500" />
    <text x="200" y="80" fontSize="9" className="fill-rose-500 font-bold">M = σy/ρ ↑ 더 좋음</text>

    {/* 통과 영역 강조 */}
    <text x="50" y="48" fontSize="9" className="fill-foreground/70 font-semibold">통과: 한계선 위 AND 등지수선 위쪽</text>

    {/* 범례 */}
    <g fontSize="9" className="fill-foreground/70" fontFamily="monospace">
      <text x="58" y="210">─ 한계(제약)</text>
      <text x="160" y="210">→ 성능지수 방향</text>
    </g>
  </svg>
);

/** Function · Constraint · Objective · Free → M 흐름도 */
const SvgFCOF = () => (
  <svg viewBox="0 0 320 160" className="w-full h-full">
    {/* 4 박스 */}
    {[
      { x: 20, y: 28, color: 'sky', label: '기능 (Function)', sub: '인장재 / 보 / 패널 / 축' },
      { x: 20, y: 88, color: 'amber', label: '제약 (Constraints)', sub: 'σy ≥ X · 온도 ≥ Y · 공정' },
      { x: 180, y: 28, color: 'emerald', label: '목적 (Objective)', sub: '무게↓ · 원가↓ · 강성↑' },
      { x: 180, y: 88, color: 'violet', label: '자유변수 (Free)', sub: '단면적 · 두께 · 재료' },
    ].map((b, i) => (
      <g key={i}>
        <rect x={b.x} y={b.y} width="120" height="48" rx="6" className={`fill-${b.color}-500/10 stroke-${b.color}-500`} strokeWidth="1.5" />
        <text x={b.x + 8} y={b.y + 18} fontSize="11" className={`fill-${b.color}-700 font-bold`}>{b.label}</text>
        <text x={b.x + 8} y={b.y + 34} fontSize="9" className="fill-foreground/70">{b.sub}</text>
      </g>
    ))}
    {/* 화살표들을 가운데 모음 */}
    <g className="stroke-rose-500" strokeWidth="1.8" fill="none">
      <path d="M 140 52 Q 160 56 158 76" />
      <path d="M 140 112 Q 160 108 158 84" />
      <path d="M 180 52 Q 160 56 162 76" />
      <path d="M 180 112 Q 160 108 162 84" />
    </g>
    <circle cx="160" cy="80" r="14" className="fill-rose-500/15 stroke-rose-500" strokeWidth="2" />
    <text x="151" y="84" fontSize="13" className="fill-rose-600 font-bold" fontFamily="monospace">M</text>
    {/* 결과 박스 */}
    <rect x="60" y="135" width="200" height="20" rx="4" className="fill-rose-500/10 stroke-rose-500" strokeWidth="1.5" />
    <text x="74" y="150" fontSize="10" className="fill-rose-700 font-semibold">자유변수 소거 → 성능지수 M (물성 조합)</text>
  </svg>
);

/** 비틀림 축 + 단면 전단응력 분포 */
const SvgTorsion = () => (
  <svg viewBox="0 0 320 160" className="w-full h-full">
    {/* 좌측: 원형 축 */}
    <text x="6" y="14" fontSize="10" className="fill-foreground/70 font-semibold">① 토크 T 작용</text>
    <g className="fill-accent/15 stroke-accent" strokeWidth="2">
      <ellipse cx="40" cy="80" rx="10" ry="28" />
      <rect x="40" y="52" width="120" height="56" />
      <ellipse cx="160" cy="80" rx="10" ry="28" />
    </g>
    {/* 비틀림 화살표 */}
    <g className="stroke-rose-500" strokeWidth="2" fill="none">
      <path d="M 156 36 a 18 14 0 1 1 14 12" />
      <polygon points="166,52 174,46 172,56" className="fill-rose-500" />
    </g>
    <text x="142" y="32" fontSize="11" className="fill-rose-500 font-bold" fontFamily="monospace">T</text>
    {/* 비틀린 표시선 */}
    <line x1="40" y1="60" x2="160" y2="68" className="stroke-foreground/50" strokeDasharray="3 2" strokeWidth="1" />
    <line x1="40" y1="100" x2="160" y2="92" className="stroke-foreground/50" strokeDasharray="3 2" strokeWidth="1" />

    {/* 우측: 단면 + 전단응력 분포 */}
    <text x="186" y="14" fontSize="10" className="fill-foreground/70 font-semibold">② 단면 전단응력</text>
    <circle cx="250" cy="80" r="44" className="fill-accent/10 stroke-accent" strokeWidth="2" />
    {/* 반경 방향 응력 화살표 (선형 증가) */}
    {[12, 22, 32, 42].map((r, i) => (
      <g key={i} className="stroke-rose-500" strokeWidth="1.4" fill="none">
        <path d={`M ${250 + r - 3} 80 a ${r} ${r} 0 0 1 6 6`} />
        <polygon points={`${256 + r - 3},85 ${256 + r + 1},91 ${254 + r - 1},85`} className="fill-rose-500" />
      </g>
    ))}
    <line x1="250" y1="80" x2="294" y2="80" className="stroke-foreground/60" strokeWidth="1" />
    <text x="296" y="84" fontSize="9" className="fill-foreground/70" fontFamily="monospace">c=D/2</text>
    <text x="244" y="138" fontSize="10" className="fill-rose-600 font-bold" fontFamily="monospace">τ_max = T·c/J</text>
    <text x="248" y="152" fontSize="9" className="fill-foreground/70 italic">중심: τ=0</text>
  </svg>
);

/** Mohr 원 + 응력 요소 */
const SvgMohr = () => (
  <svg viewBox="0 0 320 180" className="w-full h-full">
    {/* 좌측: 응력 요소 */}
    <text x="6" y="14" fontSize="10" className="fill-foreground/70 font-semibold">① 응력 요소</text>
    <rect x="20" y="50" width="80" height="80" className="fill-accent/10 stroke-accent" strokeWidth="2" />
    {/* σ_x 화살표 */}
    <g className="stroke-sky-600" strokeWidth="1.8" fill="none">
      <line x1="8" y1="90" x2="20" y2="90" /><polyline points="14,86 20,90 14,94" />
      <line x1="100" y1="90" x2="112" y2="90" /><polyline points="106,86 112,90 106,94" />
    </g>
    <text x="0" y="86" fontSize="11" className="fill-sky-700 font-bold" fontFamily="monospace">σx</text>
    <text x="105" y="86" fontSize="11" className="fill-sky-700 font-bold" fontFamily="monospace">σx</text>
    {/* τ 화살표 */}
    <g className="stroke-rose-500" strokeWidth="1.6" fill="none">
      <line x1="32" y1="40" x2="88" y2="40" /><polyline points="84,36 88,40 84,44" />
      <line x1="32" y1="140" x2="88" y2="140" /><polyline points="36,136 32,140 36,144" />
    </g>
    <text x="56" y="32" fontSize="10" className="fill-rose-500 font-bold" fontFamily="monospace">τ</text>

    {/* 우측: Mohr 원 */}
    <text x="170" y="14" fontSize="10" className="fill-foreground/70 font-semibold">② Mohr 원</text>
    <g className="stroke-foreground/80" strokeWidth="1.4" fill="none">
      <line x1="170" y1="100" x2="310" y2="100" />
      <line x1="240" y1="40" x2="240" y2="160" />
      <polyline points="306,96 314,100 306,104" />
      <polyline points="236,46 240,38 244,46" />
    </g>
    <text x="312" y="98" fontSize="10" className="fill-foreground/70 font-mono">σ</text>
    <text x="244" y="40" fontSize="10" className="fill-foreground/70 font-mono">τ</text>
    {/* 원 */}
    <circle cx="258" cy="100" r="36" className="fill-violet-500/10 stroke-violet-600" strokeWidth="2" />
    <line x1="258" y1="100" x2="294" y2="100" className="stroke-violet-600" strokeWidth="1" strokeDasharray="2 2" />
    {/* 주응력 점 */}
    <circle cx="294" cy="100" r="3" className="fill-violet-600" />
    <text x="284" y="118" fontSize="9" className="fill-violet-700 font-mono">σ₁</text>
    <circle cx="222" cy="100" r="3" className="fill-violet-600" />
    <text x="208" y="118" fontSize="9" className="fill-violet-700 font-mono">σ₂</text>
    {/* τ_max */}
    <circle cx="258" cy="64" r="3" className="fill-rose-500" />
    <text x="262" y="62" fontSize="9" className="fill-rose-500 font-mono">τ_max</text>

    <text x="170" y="172" fontSize="10" className="fill-foreground font-mono">σ_eq = √(σx² + 3τ²) ≤ σy/SF</text>
  </svg>
);

/** 얇은 압력 용기 — 후프·축 응력 */
const SvgPressureVessel = () => (
  <svg viewBox="0 0 320 160" className="w-full h-full">
    {/* 좌측: 측면도 */}
    <ellipse cx="60" cy="80" rx="14" ry="40" className="fill-accent/15 stroke-accent" strokeWidth="2" />
    <line x1="60" y1="40" x2="200" y2="40" className="stroke-accent" strokeWidth="2" />
    <line x1="60" y1="120" x2="200" y2="120" className="stroke-accent" strokeWidth="2" />
    <ellipse cx="200" cy="80" rx="14" ry="40" className="fill-accent/15 stroke-accent" strokeWidth="2" />
    <path d="M 200 40 a 14 40 0 0 0 0 80" fill="none" className="stroke-accent" strokeWidth="2" strokeDasharray="2 2" />
    {/* 내압 화살표 (가운데) */}
    <g className="stroke-rose-500" strokeWidth="1.4" fill="none">
      <line x1="130" y1="65" x2="130" y2="50" /><polyline points="126,54 130,48 134,54" />
      <line x1="130" y1="95" x2="130" y2="110" /><polyline points="126,106 130,112 134,106" />
      <line x1="130" y1="80" x2="120" y2="80" /><polyline points="124,76 118,80 124,84" />
      <line x1="130" y1="80" x2="140" y2="80" /><polyline points="136,76 142,80 136,84" />
    </g>
    <text x="125" y="84" fontSize="10" className="fill-rose-500 font-bold" fontFamily="monospace">p</text>
    {/* 후프 응력 화살표 (둘레 따라) */}
    <g className="stroke-violet-600" strokeWidth="1.6" fill="none">
      <path d="M 130 40 q -10 -10 -16 0" /><polygon points="114,40 110,36 118,36" className="fill-violet-600" />
      <path d="M 130 120 q -10 10 -16 0" /><polygon points="114,120 110,124 118,124" className="fill-violet-600" />
    </g>
    <text x="84" y="30" fontSize="10" className="fill-violet-700 font-semibold">σ_h (후프)</text>
    {/* 축응력 화살표 (양 끝) */}
    <g className="stroke-emerald-600" strokeWidth="1.6" fill="none">
      <line x1="44" y1="80" x2="30" y2="80" /><polyline points="34,76 28,80 34,84" />
      <line x1="216" y1="80" x2="230" y2="80" /><polyline points="226,76 232,80 226,84" />
    </g>
    <text x="14" y="98" fontSize="10" className="fill-emerald-700 font-semibold">σ_a (축)</text>
    <text x="222" y="98" fontSize="10" className="fill-emerald-700 font-semibold">σ_a</text>
    {/* r, t 라벨 */}
    <g className="stroke-foreground/50" strokeWidth="1" fill="none"><line x1="200" y1="80" x2="200" y2="120" /></g>
    <text x="204" y="105" fontSize="9" className="fill-foreground/70" fontFamily="monospace">r</text>
    <text x="246" y="80" fontSize="9" className="fill-foreground/70" fontFamily="monospace">t (얇음)</text>

    {/* 공식 */}
    <text x="22" y="148" fontSize="11" className="fill-foreground font-mono">σ_h = p·r/t · σ_a = p·r/(2t)</text>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
 * 물성 카드용 작은 아이콘 (10종, ~70x50)
 * ────────────────────────────────────────────────────────────────────────── */
const _box = "w-full h-full";
const IconYield = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <g className="stroke-foreground/70" strokeWidth="1.2" fill="none"><line x1="10" y1="42" x2="10" y2="8" /><line x1="10" y1="42" x2="74" y2="42" /></g>
    <path d="M 10 42 L 32 20 Q 40 17 56 20 Q 62 25 60 38" fill="none" className="stroke-accent" strokeWidth="2" />
    <circle cx="32" cy="20" r="3" className="fill-emerald-600" />
    <text x="38" y="14" fontSize="10" className="fill-emerald-600 font-bold" fontFamily="monospace">σy</text>
  </svg>
);
const IconUTS = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <g className="stroke-foreground/70" strokeWidth="1.2" fill="none"><line x1="10" y1="42" x2="10" y2="8" /><line x1="10" y1="42" x2="74" y2="42" /></g>
    <path d="M 10 42 L 28 18 Q 36 14 50 14 Q 60 16 64 36" fill="none" className="stroke-accent" strokeWidth="2" />
    <circle cx="48" cy="13" r="3" className="fill-violet-600" />
    <text x="52" y="14" fontSize="9" className="fill-violet-600 font-bold" fontFamily="monospace">UTS</text>
  </svg>
);
const IconElongation = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <g className="stroke-foreground/70" strokeWidth="1.2" fill="none"><line x1="10" y1="42" x2="10" y2="8" /><line x1="10" y1="42" x2="74" y2="42" /></g>
    {/* 취성 (짧음) */}
    <path d="M 10 42 L 22 14" fill="none" className="stroke-rose-500" strokeWidth="2" />
    <line x1="22" y1="13" x2="24" y2="11" className="stroke-rose-500" strokeWidth="2" />
    <text x="14" y="10" fontSize="8" className="fill-rose-500">취성</text>
    {/* 연성 (길음) */}
    <path d="M 10 42 L 30 24 Q 40 22 58 22 L 62 38" fill="none" className="stroke-emerald-600" strokeWidth="2" />
    <text x="46" y="18" fontSize="8" className="fill-emerald-600">연성</text>
  </svg>
);
const IconE = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <g className="stroke-foreground/70" strokeWidth="1.2" fill="none"><line x1="10" y1="42" x2="10" y2="8" /><line x1="10" y1="42" x2="74" y2="42" /></g>
    {/* 가파른 (E 큼) */}
    <line x1="10" y1="42" x2="32" y2="10" className="stroke-amber-600" strokeWidth="2" />
    <text x="18" y="14" fontSize="8" className="fill-amber-600">E ↑</text>
    {/* 완만한 (E 작음) */}
    <line x1="10" y1="42" x2="70" y2="30" className="stroke-sky-600" strokeWidth="2" />
    <text x="50" y="38" fontSize="8" className="fill-sky-600">E ↓</text>
  </svg>
);
const IconHardness = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    {/* 표면 */}
    <line x1="6" y1="36" x2="74" y2="36" className="stroke-foreground/70" strokeWidth="1.4" />
    {/* 피라미드 압입자 */}
    <polygon points="40,8 30,30 50,30" className="fill-accent/30 stroke-accent" strokeWidth="1.6" />
    {/* 자국 */}
    <polygon points="30,36 40,42 50,36" className="fill-rose-500/30 stroke-rose-500" strokeWidth="1.4" />
    {/* 하중 화살표 */}
    <g className="stroke-rose-500" strokeWidth="1.6" fill="none">
      <line x1="40" y1="2" x2="40" y2="10" /><polyline points="37,8 40,11 43,8" />
    </g>
    <text x="56" y="26" fontSize="9" className="fill-foreground/70" fontFamily="monospace">HV</text>
  </svg>
);
const IconFatigue = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    <g className="stroke-foreground/70" strokeWidth="1.2" fill="none"><line x1="10" y1="42" x2="10" y2="6" /><line x1="10" y1="42" x2="74" y2="42" /></g>
    <text x="2" y="10" fontSize="7" className="fill-foreground/60">σ_a</text>
    <text x="68" y="50" fontSize="7" className="fill-foreground/60">log N</text>
    <path d="M 12 10 Q 28 14 40 24 Q 56 32 70 32" fill="none" className="stroke-accent" strokeWidth="2" />
    <line x1="40" y1="32" x2="70" y2="32" className="stroke-rose-500" strokeWidth="1.2" strokeDasharray="2 2" />
    <text x="46" y="30" fontSize="7" className="fill-rose-500">한도</text>
  </svg>
);
const IconDensity = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    {/* 큐브 */}
    <g className="fill-accent/20 stroke-accent" strokeWidth="1.4">
      <polygon points="14,20 36,8 60,20 60,40 38,52 14,40" />
      <line x1="14" y1="20" x2="38" y2="32" />
      <line x1="60" y1="20" x2="38" y2="32" />
      <line x1="38" y1="32" x2="38" y2="52" />
    </g>
    {/* 무거움 표시 점 */}
    <g className="fill-foreground/70">
      <circle cx="24" cy="26" r="1.2" /><circle cx="32" cy="24" r="1.2" /><circle cx="40" cy="22" r="1.2" />
      <circle cx="48" cy="24" r="1.2" /><circle cx="28" cy="34" r="1.2" /><circle cx="36" cy="36" r="1.2" /><circle cx="44" cy="34" r="1.2" /><circle cx="52" cy="32" r="1.2" />
    </g>
    <text x="64" y="42" fontSize="9" className="fill-foreground/70" fontFamily="monospace">ρ</text>
  </svg>
);
const IconCTE = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    {/* 차가운 바 */}
    <rect x="6" y="14" width="36" height="14" className="fill-sky-500/20 stroke-sky-600" strokeWidth="1.4" />
    {/* 뜨거운 바 (길어짐) */}
    <rect x="6" y="30" width="56" height="14" className="fill-rose-500/20 stroke-rose-500" strokeWidth="1.4" />
    {/* 길이 변화 화살표 */}
    <g className="stroke-foreground/70" strokeWidth="1" fill="none">
      <line x1="42" y1="50" x2="62" y2="50" />
      <polyline points="44,48 42,50 44,52" /><polyline points="60,48 62,50 60,52" />
    </g>
    <text x="42" y="58" fontSize="7" className="fill-foreground/70">ΔL</text>
    <text x="62" y="10" fontSize="8" className="fill-rose-500 font-bold">+ΔT</text>
  </svg>
);
const IconK = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    {/* 막대 */}
    <rect x="6" y="20" width="68" height="14" className="fill-accent/15 stroke-accent" strokeWidth="1.4" />
    {/* 좌측 뜨거움 */}
    <circle cx="10" cy="27" r="6" className="fill-rose-500/30 stroke-rose-500" strokeWidth="1.2" />
    {/* 우측 차가움 */}
    <circle cx="70" cy="27" r="6" className="fill-sky-500/30 stroke-sky-600" strokeWidth="1.2" />
    {/* 열 흐름 화살표 */}
    <g className="stroke-rose-500" strokeWidth="1.4" fill="none">
      <line x1="22" y1="27" x2="34" y2="27" /><polyline points="30,24 34,27 30,30" />
      <line x1="38" y1="27" x2="50" y2="27" /><polyline points="46,24 50,27 46,30" />
      <line x1="54" y1="27" x2="62" y2="27" /><polyline points="58,24 62,27 58,30" />
    </g>
  </svg>
);
const IconMaxTemp = () => (
  <svg viewBox="0 0 80 50" className={_box}>
    {/* 온도계 */}
    <rect x="36" y="4" width="8" height="32" rx="4" className="fill-rose-500/20 stroke-rose-500" strokeWidth="1.4" />
    <circle cx="40" cy="40" r="6" className="fill-rose-500 stroke-rose-500" strokeWidth="1.4" />
    {/* 한계선 */}
    <line x1="20" y1="18" x2="56" y2="18" className="stroke-rose-500" strokeDasharray="3 2" strokeWidth="1.2" />
    <text x="58" y="22" fontSize="9" className="fill-rose-500 font-bold" fontFamily="monospace">한계</text>
    {/* 눈금 */}
    <g className="stroke-foreground/50" strokeWidth="0.8"><line x1="32" y1="12" x2="36" y2="12" /><line x1="32" y1="22" x2="36" y2="22" /><line x1="32" y1="30" x2="36" y2="30" /></g>
  </svg>
);

/* 개선된 LoadCard 처짐 곡선 오버레이 (Chapter 4) — 변형 모양·δ_max 표시 */
const SvgCantileverV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    {wallHatch(20)}
    {/* 원래 위치 (점선) */}
    <line x1="20" y1="38" x2="180" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    {/* 변형된 보 */}
    <path d="M 20 38 Q 110 38 180 64" fill="none" className="stroke-accent" strokeWidth="3" />
    {/* 하중 */}
    <g className={force} strokeWidth="2.4" fill="none"><line x1="180" y1="40" x2="180" y2="76"/><polyline points="176,70 180,78 184,70"/></g>
    <text x="184" y="58" fontSize="11" className="fill-rose-500" fontFamily="monospace">F</text>
    {/* δ_max */}
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="170" y1="38" x2="170" y2="64" /><polyline points="167,42 170,38 173,42" /><polyline points="167,60 170,64 173,60" /></g>
    <text x="150" y="76" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
    <text x="92" y="86" fontSize="11" className="fill-foreground/70" fontFamily="monospace">L</text>
  </svg>
);
const SvgCantileverUDLV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    {wallHatch(20)}
    <line x1="20" y1="38" x2="180" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    <path d="M 20 38 Q 110 40 180 56" fill="none" className="stroke-accent" strokeWidth="3" />
    {udl(28, 180)}
    <text x="94" y="14" fontSize="12" className="fill-rose-500" fontFamily="monospace">w</text>
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="170" y1="38" x2="170" y2="56" /><polyline points="167,42 170,38 173,42" /><polyline points="167,52 170,56 173,52" /></g>
    <text x="150" y="72" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
  </svg>
);
const SvgSimpleCenterV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    <line x1="14" y1="38" x2="186" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    <path d="M 14 38 Q 100 60 186 38" fill="none" className="stroke-accent" strokeWidth="3" />
    <polygon points="14,38 6,52 22,52" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    <polygon points="186,38 178,52 194,52" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    <g className={force} strokeWidth="2.4" fill="none"><line x1="100" y1="14" x2="100" y2="34"/><polyline points="95,28 100,36 105,28"/></g>
    <text x="92" y="11" fontSize="12" className="fill-rose-500" fontFamily="monospace">F</text>
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="106" y1="38" x2="106" y2="52" /><polyline points="103,42 106,38 109,42" /><polyline points="103,48 106,52 109,48" /></g>
    <text x="110" y="48" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
  </svg>
);
const SvgSimpleUDLV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    <line x1="14" y1="38" x2="186" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    <path d="M 14 38 Q 100 56 186 38" fill="none" className="stroke-accent" strokeWidth="3" />
    <polygon points="14,38 6,52 22,52" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    <polygon points="186,38 178,52 194,52" className={`fill-foreground/30 ${stroke}`} strokeWidth="1"/>
    {udl(22, 180)}
    <text x="94" y="11" fontSize="12" className="fill-rose-500" fontFamily="monospace">w</text>
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="106" y1="38" x2="106" y2="48" /></g>
    <text x="110" y="48" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
  </svg>
);
const SvgFixedCenterV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    {wallHatch(20)}{wallHatchR(180)}
    <line x1="20" y1="38" x2="180" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    <path d="M 20 38 C 60 38 80 50 100 50 C 120 50 140 38 180 38" fill="none" className="stroke-accent" strokeWidth="3" />
    <g className={force} strokeWidth="2.4" fill="none"><line x1="100" y1="14" x2="100" y2="34"/><polyline points="95,28 100,36 105,28"/></g>
    <text x="92" y="11" fontSize="12" className="fill-rose-500" fontFamily="monospace">F</text>
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="108" y1="38" x2="108" y2="50" /></g>
    <text x="112" y="48" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
  </svg>
);
const SvgFixedUDLV2 = () => (
  <svg viewBox="0 0 200 90" className="w-full h-full">
    {wallHatch(20)}{wallHatchR(180)}
    <line x1="20" y1="38" x2="180" y2="38" className="stroke-foreground/30" strokeDasharray="3 2" strokeWidth="1.2" />
    <path d="M 20 38 C 60 38 80 46 100 46 C 120 46 140 38 180 38" fill="none" className="stroke-accent" strokeWidth="3" />
    {udl(28, 180)}
    <text x="94" y="11" fontSize="12" className="fill-rose-500" fontFamily="monospace">w</text>
    <g className="stroke-emerald-600" strokeWidth="1" fill="none"><line x1="106" y1="38" x2="106" y2="46" /></g>
    <text x="110" y="46" fontSize="9" className="fill-emerald-700 font-bold" fontFamily="monospace">δ_max</text>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
 * 메인 페이지
 * ────────────────────────────────────────────────────────────────────────── */

const TOC: { id: string; n: number; label: string; icon: any }[] = [
  { id: 'ch1', n: 1, label: '물성 사전 — 재료가 말하는 언어', icon: BookOpen },
  { id: 'ch2', n: 2, label: '설계 요구를 숫자로 바꾸기', icon: Target },
  { id: 'ch3', n: 3, label: '단면 모양 도감 (A · I · Z · J)', icon: Sigma },
  { id: 'ch4', n: 4, label: '보 하중·지지조건 도감', icon: Sigma },
  { id: 'ch5', n: 5, label: '응용 — 비틀림 · 좌굴 · 압력', icon: Sigma },
  { id: 'ch6', n: 6, label: 'Ashby 재료 선택법', icon: ListChecks },
  { id: 'ch7', n: 7, label: '실전 사례 8선 (앱 자동 연계)', icon: LineChart },
  { id: 'ch8', n: 8, label: '데이터 해석 & 참고문헌', icon: BookText },
];

export default function Guide() {
  const [dialogKey, setDialogKey] = useState<ScenarioKey | null>(null);
  const openConfig = (k: ScenarioKey) => setDialogKey(k);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScenarioDialog scenarioKey={dialogKey} open={dialogKey !== null} onOpenChange={(v) => { if (!v) setDialogKey(null); }} />
      {/* 상단 바 */}
      <header className="sticky top-0 z-20 h-12 flex items-center gap-3 px-4 border-b border-border bg-[oklch(0.22_0.055_250)] text-sidebar-foreground">
        <Link href="/" className="flex items-center gap-1.5 text-sm hover:text-white text-sidebar-foreground/80">
          <ArrowLeft className="w-4 h-4" /> 탐색기로 돌아가기
        </Link>
        <div className="w-px h-5 bg-sidebar-border" />
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <GraduationCap className="w-4 h-4 text-accent" /> 재료 선택 가이드
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10">
        {/* Hero */}
        <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-emerald-500/5 p-6">
          <p className="text-[11px] tracking-[0.25em] uppercase text-accent font-bold">기계공학 1학년부터 따라올 수 있는</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">재료 선택 가이드</h1>
          <p className="text-foreground/80 mt-3 leading-relaxed">
            “이 부품이 안 부러지고, 안 휘고, 가벼웠으면 좋겠다”는 요구를 <b className="text-accent">σy ≥ 250 MPa</b>, <b className="text-accent">E ≥ 70 GPa</b> 같은 <b>숫자</b>로 바꾸고,
            그 숫자로 수백 개 재료에서 최적을 고르는 <b>방법</b>을 단계별로 익힙니다. 교과서처럼 천천히 읽고, 마지막엔 이 앱에서 바로 적용해 보세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              '응력 = F/A 부터 시작',
              '보 처짐과 단면의 관계',
              'Ashby 차트로 후보 좁히기',
              '실전 사례 8선 → 한 클릭 적용',
            ].map((t) => (
              <span key={t} className="text-[11px] px-2 py-1 rounded-full bg-background border border-border text-foreground/80">{t}</span>
            ))}
          </div>
        </div>

        {/* 학습 흐름 */}
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><Compass className="w-3.5 h-3.5" /> 학습 흐름 (목차)</p>
          <ol className="space-y-1.5">
            {TOC.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="text-[10px] w-6 text-center bg-accent/15 text-accent rounded font-bold py-0.5">{t.n}</span>
                <a href={`#${t.id}`} className="text-sm text-foreground hover:text-accent hover:underline underline-offset-2">{t.label}</a>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Chapter 1: 물성 사전 ─────────────────────────────────────────── */}
        <Chapter
          n={1}
          id="ch1"
          title="물성 사전 — 재료가 말하는 언어"
          learn={[
            '각 물성이 “어떤 설계 요구”와 짝지어지는지 한 카드에서 본다',
            '단위(MPa, GPa, %)의 의미와 일반 범위(강철 vs 알루미늄 vs 폴리머)',
            '나중에 차트의 X·Y 축이나 좌측 필터에서 바로 알아본다',
          ]}
          prereq={<>고등학교 물리의 힘·면적·압력 개념(P = F/A)을 알면 충분합니다.</>}
        >
          <p className="leading-relaxed text-foreground/90">
            재료 데이터베이스에는 <F>MPa</F>, <F>GPa</F>, <F>%</F> 같은 숫자가 잔뜩 있습니다. 각 물성이 무엇을 뜻하는지 <b>먼저 감을 잡고</b> 시작합시다.
          </p>

          {/* 핵심 도식: 응력-변형률 곡선 — 한 그림으로 σy/UTS/연신율/E 모두 보기 */}
          <div className="rounded-lg border border-border bg-card p-3 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📊 핵심 그림 — 응력-변형률 곡선 한 장</p>
            <div className="h-[180px]"><SvgStressStrain /></div>
            <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
              인장 시험으로 얻는 이 한 곡선에 <span className="text-emerald-600 font-bold">σy</span>·<span className="text-violet-600 font-bold">UTS</span>·<span className="text-sky-600 font-bold">연신율</span>·<span className="text-amber-600 font-bold">E(탄성 영역의 기울기)</span>가 모두 들어 있습니다. 아래 카드들은 각각의 의미와 일반 범위를 따로 풉니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <PropCard
              name="항복강도 σy"
              unit="MPa"
              icon={<IconYield />}
              intuition="이 응력을 넘으면 영구 변형(소성). 클립을 살짝 구부리면 다시 펴지지만(탄성), 세게 구부리면 안 돌아오죠(소성) — 그 경계점."
              useFor="‘하중을 받아도 변형되면 안 된다’는 가장 흔한 강도 기준."
              range="알루미늄 100~500 · 강 250~1500 · 티타늄 800~1100 · 폴리머 30~100"
            />
            <PropCard
              name="인장강도 UTS"
              unit="MPa"
              icon={<IconUTS />}
              intuition="끊어지기 직전 최대 응력. σy가 ‘변하기 시작’ 이라면 UTS는 ‘파단 직전’."
              useFor="파단 안전여유 확인, 취성 재료 평가, 안전계수 산정."
              range="보통 σy의 1.1~1.5배"
            />
            <PropCard
              name="연신율"
              unit="%"
              icon={<IconElongation />}
              intuition="끊어질 때까지 늘어난 비율 = 연성. 낮으면 취성(갑자기 깨짐). 알루미늄 캔이 잘 찌그러지는 건 연성 덕분."
              useFor="충격 흡수, 성형/굽힘, 취성 파괴 회피."
              range="취성 세라믹 < 1 · 일반 금속 8~30 · 폴리머 50~500"
            />
            <PropCard
              name="탄성계수 E"
              unit="GPa"
              icon={<IconE />}
              intuition="‘뻣뻣함(강성)’. 같은 하중에서 얼마나 적게 휘는가. 고무는 작고, 강철은 크다."
              useFor="처짐 제한, 진동·고유진동수, 정밀도."
              range="고무 0.01 · 폴리머 1~5 · 알루미늄 70 · 티타늄 115 · 강 200 · 텅스텐 410"
            />
            <PropCard
              name="경도 HV"
              unit="HV"
              icon={<IconHardness />}
              intuition="국부 압입 저항. ‘긁힘·찍힘에 강한 정도’. 대략 마모·표면 강도의 지표."
              useFor="베어링/기어 표면, 마모 부품."
              range="알루미늄 30~150 · 강 150~700 · 공구강 700~"
            />
            <PropCard
              name="피로강도"
              unit="MPa"
              icon={<IconFatigue />}
              intuition="반복 하중(매번 같은 방향·반대 방향)에 견디는 응력 한계. 정적 강도보다 훨씬 낮음."
              useFor="회전·진동·반복 하중 부품 (샤프트·스프링·임펠러)."
              range="대략 UTS의 0.3~0.55. 알루미늄은 명확한 한도 없음(주의)"
            />
            <PropCard
              name="밀도 ρ"
              unit="g/cm³"
              icon={<IconDensity />}
              intuition="단위 부피당 무게. 경량화의 분모."
              useFor="‘비강도(σy/ρ)’ · ‘비강성(E/ρ)’ 같은 조합으로 경량화."
              range="폴리머 1~1.4 · 알루미늄 2.7 · 티타늄 4.5 · 강 7.8 · 텅스텐 19"
            />
            <PropCard
              name="열팽창계수 CTE"
              unit="10⁻⁶/K"
              icon={<IconCTE />}
              intuition="온도 1 °C 오르면 늘어나는 비율. 끼워맞춤·기차레일 틈·정밀 측정 등에서 결정적."
              useFor="열응력, 끼워맞춤, 치수 안정성. ‘끼워맞춤 부품의 가공이 어렵다’ 보통 CTE 미스매치."
              range="Invar 1.3 (정밀) · 강 12 · 알루미늄 23 · 폴리머 50~150"
            />
            <PropCard
              name="열전도도 k"
              unit="W/m·K"
              icon={<IconK />}
              intuition="열이 얼마나 잘 흐르는가. 구리는 빠르고, 폴리머는 거의 안 흐름."
              useFor="히트싱크, 금형, 단열재."
              range="단열 폴리머 0.2 · 강 50 · 알루미늄 240 · 구리 400"
            />
            <PropCard
              name="최대사용온도"
              unit="°C"
              icon={<IconMaxTemp />}
              intuition="장시간 사용 가능한 온도 상한. 잠깐은 더 견딜 수 있어도 ‘연속’ 사용은 여기까지."
              useFor="고온 부품(배기·터빈·열교환기)."
              range="폴리머 60~250 · 알루미늄 150 · 강 450 · Ni 초합금 800~1100"
            />
          </div>
          <Note tone="tip">
            <b>한 줄 요약.</b> 변형 = <F>E</F> · 영구변형 시작 = <F>σy</F> · 파단 = <F>UTS</F> · 늘어나는 정도 = 연신율 · 반복하중 = 피로강도. 나머지 물리 물성은 “열·전기·치수” 카테고리.
          </Note>
        </Chapter>

        {/* ── Chapter 2: 요구를 숫자로 ─────────────────────────────────────── */}
        <Chapter
          n={2}
          id="ch2"
          title="설계 요구를 숫자로 바꾸기"
          learn={[
            '응력 σ = F/A 한 줄에서 “필요 항복강도”를 산출한다',
            '처짐 식으로 “필요 탄성계수 E”를 산출한다',
            '안전계수 SF의 의미와 보수적 사용',
          ]}
          prereq={<>벡터·힘·기본 적분(약간) — 모르면 결과 식만 외우고 넘어가도 됩니다.</>}
        >

          <H3><Lightbulb className="w-4 h-4 text-amber-500"/> 2.1 응력 = 힘 ÷ 면적 — 가장 먼저 만나는 식</H3>
          <p className="leading-relaxed">
            막대를 잡아당기는 힘 <F>F</F> 가 단면적 <F>A</F> 에 골고루 퍼진다면, 단면 안 어디서나 같은 응력이 작용합니다. 이게 <F>σ = F / A</F>.
            영구 변형을 막으려면 <b>작용 응력이 항복강도 σy 보다 충분히 작아야</b> 합니다.
          </p>
          <Note tone="why">
            <p>σy 를 그대로 쓰지 않고 “안전계수 SF” 로 나눠 “허용응력” 을 만듭니다. 측정 오차, 결함, 충격, 환경, 데이터 불확실성 같은 미지의 요소에 대비하는 여유분이죠.</p>
            <p className="mt-1 font-mono text-[13px]">허용응력 = σy / SF &nbsp;→&nbsp; 필요 σy ≥ SF · σ = SF · F / A</p>
            <p className="mt-1 text-muted-foreground">정적·연성 부품은 보통 <F>SF = 1.5~2</F>, 인명·취성·불확실 영역은 더 높게.</p>
          </Note>
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/40 p-4 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">📐 워크드 예제 — 인장 부재</p>
            <p className="text-sm text-foreground/85 mb-3">
              지름 약 5 mm, 단면적 <F>A = 20 mm²</F>인 봉이 <F>F = 4000 N</F>의 인장하중을 받습니다. <F>SF = 2</F>로 설계합니다.
            </p>
            <Step n={1} title="작용 응력 계산" formula={<>σ = F / A</>} result={<>σ = 4000 / 20 = <b>200 MPa</b></>} />
            <Step n={2} title="안전계수 적용 → 필요 σy" formula={<>필요 σy ≥ SF · σ</>} result={<>≥ 2 × 200 = <b>400 MPa</b></>} />
            <Step n={3} title="앱에서 후보 좁히기" result={<>좌측 <b>Yield Strength</b> 필터 하한을 <b>400</b>으로 설정.</>} note="알루미늄 일반품은 탈락, 고강도 알루미늄 일부·강·티타늄·니켈 통과." />
          </div>

          <H3><Lightbulb className="w-4 h-4 text-amber-500"/> 2.2 처짐과 강성 — “덜 휘려면 E가 얼마여야 하나?”</H3>
          <p className="leading-relaxed">
            “덜 휜다”는 <b>강성</b>의 문제이고, 강성은 <b>형상(I)</b> + <b>재료 E</b>로 결정됩니다. 가장 단순한 예는 외팔보:
          </p>
          <p className="font-mono text-[13px] mt-1 bg-muted/40 inline-block px-2 py-1 rounded">δ_max = F · L³ / (3 · E · I)</p>
          <p className="text-sm mt-2 text-muted-foreground">
            <F>I</F> = 단면 2차모멘트(단면 모양으로 결정, Chapter 3). 처짐 한계 <F>δ_max</F> 를 정하면 식을 뒤집어서 <F>필요 E·I</F> 를 알 수 있고, <F>I</F> 가 단면으로 정해지면 <F>필요 E</F> 가 나옵니다.
          </p>

          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/40 p-4 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">📐 워크드 예제 — 외팔보 처짐 한계</p>
            <p className="text-sm text-foreground/85 mb-3">
              길이 <F>L = 100 mm</F>, 단면 2차모멘트 <F>I = 1,000 mm⁴</F> 인 외팔보가 <F>F = 200 N</F> 끝하중에서 <F>δ ≤ 0.5 mm</F> 로 유지되어야 합니다.
            </p>
            <Step n={1} title="처짐 식 뒤집기" formula={<>필요 E = F·L³ / (3·I·δ_max)</>} />
            <Step n={2} title="값 대입" formula={<>= 200 × 100³ / (3 × 1000 × 0.5)</>} result={<>= 133,000 MPa = <b>133 GPa</b></>} />
            <Step n={3} title="앱에서 후보 좁히기" result={<><b>Modulus</b> 필터 하한 133 GPa.</>} note="알루미늄(~70) 탈락 · 티타늄(~115) 부족 · 강(~200)·텅스텐 통과." />
          </div>

          <Note tone="tip">
            <b>강성 직관.</b> 강성이 부족하면 보통 <b>단면을 키우는 게 재료를 바꾸는 것보다 효과적</b>입니다 (<F>I</F> 는 두께의 <b>세제곱</b>에 비례 — Chapter 3 참고). 무게·공간 제약이 빡빡할 때만 “더 단단한 재료”로 갑니다.
          </Note>

          <H3><Lightbulb className="w-4 h-4 text-amber-500"/> 2.3 그 밖의 흔한 변환 (치트시트)</H3>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">요구</th><th className="p-2 font-semibold">보는 물성 / 식</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2">반복·진동 하중</td><td className="p-2"><b>피로강도</b> ≥ 응력진폭 × SF — 정적 σy 만으로 부족</td></tr>
                <tr><td className="p-2">충격·갑작스런 하중</td><td className="p-2"><b>연신율·충격값</b> 충분 (취성 회피), 동시에 강도</td></tr>
                <tr><td className="p-2">고온 사용</td><td className="p-2"><b>최대사용온도</b> ≥ 사용온도, 그리고 <b>그 온도에서의</b> σy/UTS (상세의 “온도-강도” 곡선)</td></tr>
                <tr><td className="p-2">열변형/끼워맞춤</td><td className="p-2">열응력 <F>σ ≈ E·CTE·ΔT</F>, 치수변화 <F>ΔL = L·CTE·ΔT</F> → 작은 <b>CTE</b></td></tr>
                <tr><td className="p-2">방열</td><td className="p-2">높은 <b>열전도도 k</b> (경량 방열은 <F>k/ρ</F>)</td></tr>
                <tr><td className="p-2">부식·내후</td><td className="p-2">환경에 맞는 <b>내식성</b> 등급(정성) — 정량은 데이터시트 확인</td></tr>
              </tbody>
            </table>
          </div>
        </Chapter>

        {/* ── Chapter 3: 단면 모양 도감 ────────────────────────────────────── */}
        <Chapter
          n={3}
          id="ch3"
          title="단면 모양 도감 — A · I · Z · J"
          learn={[
            '6가지 단면(직사각·정사각·원·박스·관·I빔)의 단면적·2차모멘트·단면계수',
            '왜 I빔·박스·관이 무게당 가장 강하고 뻣뻣한지',
            '굽힘응력 식 σ_b = M / Z 의 의미',
          ]}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Term word="A">단면적 — 인장응력 <F>σ = F/A</F></Term>
            <Term word="I">단면 2차모멘트 — 굽힘 변형·응력의 단면 인자, 중립축 기준</Term>
            <Term word="Z = I/c">단면계수 — 굽힘응력 <F>σ_b = M / Z</F>, <F>c</F>는 중립축에서 가장 먼 거리</Term>
            <Term word="J">극관성모멘트 — 비틀림 <F>τ = T·r / J</F>, 원형 단면만 단순한 닫힌식</Term>
          </div>

          <Note tone="why" title="왜 I빔·박스·관이 효율적인가?">
            <F>I</F>는 “재료를 중립축에서 얼마나 멀리 두었는가”에 매우 민감합니다 (거리의 제곱·세제곱으로 들어감). 그래서 같은 단면적이면 <b>속을 비우고 멀리</b> 배치한 박스·관·I빔이 굽힘에 압도적으로 유리합니다. 건물 보·자전거 프레임·골프 채가 그렇죠.
          </Note>

          {/* 핵심 도식: 굽힘 응력 분포 + 중립축 */}
          <div className="rounded-lg border border-border bg-card p-3 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📊 핵심 그림 — 굽힘 응력 분포와 중립축</p>
            <div className="h-[180px]"><SvgBendingStress /></div>
            <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
              보가 굽혀지면 <span className="text-rose-500 font-bold">위는 압축</span>, <span className="text-sky-500 font-bold">아래는 인장</span>이 됩니다. 중간 어딘가는 응력이 0(<b>중립축</b>). 응력은 중립축에서 거리(<F>c</F>)에 비례해 선형 증가 → 같은 모멘트 <F>M</F>이어도 <F>I</F>가 크면 σ가 작아집니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <ShapeCard
              svg={<SvgRect />}
              name="직사각형"
              dims="b × h (h 가 굽힘 방향)"
              formulas={[
                { label: 'A', expr: 'b · h' },
                { label: 'I', expr: 'b · h³ / 12' },
                { label: 'Z', expr: 'b · h² / 6' },
              ]}
              usedFor="목재 보·간단한 막대·기계 가공 부품의 기본 단면."
            />
            <ShapeCard
              svg={<SvgSquare />}
              name="정사각형"
              dims="a × a"
              formulas={[
                { label: 'A', expr: 'a²' },
                { label: 'I', expr: 'a⁴ / 12' },
                { label: 'Z', expr: 'a³ / 6' },
                { label: 'J', expr: '≈ 0.141 · a⁴' },
              ]}
              usedFor="기계 부품의 일반 단면. 비틀림은 원형보다 약함."
            />
            <ShapeCard
              svg={<SvgCircle />}
              name="원형 (꽉찬)"
              dims="지름 d"
              formulas={[
                { label: 'A', expr: 'π · d² / 4' },
                { label: 'I', expr: 'π · d⁴ / 64' },
                { label: 'Z', expr: 'π · d³ / 32' },
                { label: 'J', expr: 'π · d⁴ / 32' },
              ]}
              usedFor="축·핀·볼트. 비틀림에 자연스럽고 가공 쉬움."
            />
            <ShapeCard
              svg={<SvgBox />}
              name="박스 (중공 직사각)"
              dims="B,H 외부 / b,h 내부"
              formulas={[
                { label: 'A', expr: 'B·H − b·h' },
                { label: 'I', expr: '(B·H³ − b·h³) / 12' },
                { label: 'Z', expr: '2 · I / H' },
              ]}
              usedFor="차체 프레임·로봇 팔. 굽힘/비틀림 둘 다 좋음."
            />
            <ShapeCard
              svg={<SvgTube />}
              name="원형 관 (튜브)"
              dims="외경 D / 내경 d"
              formulas={[
                { label: 'A', expr: 'π(D² − d²) / 4' },
                { label: 'I', expr: 'π(D⁴ − d⁴) / 64' },
                { label: 'Z', expr: 'π(D⁴ − d⁴) / (32·D)' },
                { label: 'J', expr: 'π(D⁴ − d⁴) / 32' },
              ]}
              usedFor="자전거 프레임·드론 암·송유관. 굽힘·비틀림에 압도적."
            />
            <ShapeCard
              svg={<SvgIBeam />}
              name="I-빔 (H-빔)"
              dims="플랜지 b_f·t_f / 웹 h_w·t_w"
              formulas={[
                { label: 'A', expr: '2·b_f·t_f + h_w·t_w' },
                { label: 'I', expr: '플랜지+웹 합산 (parallel-axis)' },
                { label: 'Z', expr: 'I / (h/2)' },
              ]}
              usedFor="건축·교량 보. 한 방향 굽힘에 최적, 비틀림은 약함."
            />
          </div>

          <Note tone="tip">
            <b>설계 흐름.</b> ① 부품의 ‘<b>주된 하중</b>’(인장? 굽힘? 비틀림?)을 정한다 → ② 그에 맞는 <b>단면 모양</b>을 고른다 → ③ Chapter 4의 처짐 식으로 필요 E·I 산출 → ④ 단면이 정해지면 <F>I</F> 가 나오므로 <b>필요 E</b> 가 결정 → ⑤ 강도는 <F>σ_b = M / Z ≤ σy / SF</F> 로 점검.
          </Note>
        </Chapter>

        {/* ── Chapter 4: 보 하중 도감 ───────────────────────────────────── */}
        <Chapter
          n={4}
          id="ch4"
          title="보 하중·지지조건 도감"
          learn={[
            '6가지 표준 하중·지지조건의 최대 처짐 / 최대 모멘트 공식',
            '식의 형태: 외팔보는 L³·L⁴ 계수가 크고, 양단고정은 매우 작다',
            '단면(Chapter 3)과 결합하여 필요 E·I 와 필요 σy 를 산출하는 흐름',
          ]}
        >
          <p className="leading-relaxed">
            처짐 식은 모두 <F>δ = (계수) · F·L³ / (E·I)</F> 또는 <F>(계수) · w·L⁴ / (E·I)</F> 형태입니다. <b>계수만 외우면 됩니다</b>. 모멘트도 마찬가지 — <F>M_max</F> 에서 <F>σ_b = M/Z</F>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <LoadCard
              svg={<SvgCantileverV2 />}
              name="외팔보 · 끝단 집중하중"
              deflection="F·L³ / (3·E·I)"
              moment="F·L (근원에서 최대)"
              common="브래킷, 진단봉, 다이빙 보드, 사무용 책상 모서리."
              hint="처짐 계수가 1/3 — 모든 케이스 중 가장 크게 휨"
            />
            <LoadCard
              svg={<SvgCantileverUDLV2 />}
              name="외팔보 · 등분포하중 w"
              deflection="w·L⁴ / (8·E·I)"
              moment="w·L² / 2"
              common="천장에서 자중 받는 캔틸레버, 비행기 날개(근사)."
            />
            <LoadCard
              svg={<SvgSimpleCenterV2 />}
              name="단순지지 · 중앙 집중하중"
              deflection="F·L³ / (48·E·I)"
              moment="F·L / 4"
              common="가장 흔한 시험·교과서 케이스. 두 지점 올려놓은 막대 위 한 점."
            />
            <LoadCard
              svg={<SvgSimpleUDLV2 />}
              name="단순지지 · 등분포하중 w"
              deflection="5·w·L⁴ / (384·E·I)"
              moment="w·L² / 8"
              common="자기 무게로 휘는 보, 균등 하중 책장 선반."
            />
            <LoadCard
              svg={<SvgFixedCenterV2 />}
              name="양단 고정 · 중앙 집중하중"
              deflection="F·L³ / (192·E·I)"
              moment="F·L / 8 (단부 최대)"
              common="용접·볼팅으로 양 끝이 회전 못 하는 강판 보."
              hint="처짐이 단순지지의 1/4 — 고정조건이 매우 강력"
            />
            <LoadCard
              svg={<SvgFixedUDLV2 />}
              name="양단 고정 · 등분포하중 w"
              deflection="w·L⁴ / (384·E·I)"
              moment="w·L² / 12 (단부)"
              common="강구조 빔, 슬라브, 자동차 차체 보강재."
            />
          </div>

          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/40 p-4 my-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">📐 워크드 예제 — 외팔보 + 관 단면</p>
            <p className="text-sm mb-3 text-foreground/85">
              길이 <F>L = 200 mm</F> 외팔보, 끝 하중 <F>F = 500 N</F>, 처짐 한계 <F>δ ≤ 1 mm</F>. 단면은 <b>관</b>(외경 20·내경 16 mm)으로 시작합니다.
            </p>
            <Step n={1} title="단면의 I 계산 (Ch.3)" formula={<>I = π(20⁴ − 16⁴) / 64</>} result={<>≈ <b>4,633 mm⁴</b></>} />
            <Step n={2} title="필요 E·I 계산" formula={<>E·I = F·L³ / (3·δ) = 500 × 200³ / (3 × 1)</>} result={<>= <b>1.333 × 10⁹ N·mm²</b></>} />
            <Step n={3} title="필요 E" formula={<>E = 1.333×10⁹ / 4633</>} result={<>≈ <b>288 GPa</b> — 일반 금속(E ≤ 210)으론 안 됨!</>} />
            <Step n={4} title="단면 키워서 재시도" formula={<>외경 24·내경 20 → I ≈ 8,454 mm⁴</>} result={<>필요 E ≈ <b>158 GPa</b> — 강·티타늄·구리합금 후보</>} note="형상으로 푸는 게 첫 번째 선택" />
            <Step n={5} title="강도 점검 (σ_b = M/Z)" formula={<>M_max = F·L = 10⁵ N·mm, Z ≈ 704 mm³</>} result={<>σ_b ≈ 142 MPa · SF=2 → 필요 σy ≥ <b>284 MPa</b></>} />
            <Step n={6} title="앱에서 후보 보기" result={<><b>Modulus ≥ 158</b>, <b>Yield ≥ 284</b> 두 필터로 산점도 + Compare.</>} />
          </div>
        </Chapter>

        {/* ── Chapter 5: 응용 ───────────────────────────────────────────── */}
        <Chapter
          n={5}
          id="ch5"
          title="응용 — 비틀림 · 좌굴 · 복합 · 압력"
          learn={[
            '비틀림 응력 τ = T·c/J 와 비틀림각',
            'Euler 좌굴 — 가는 기둥이 σy 넘기 전에 휘어버리는 현상',
            '복합 하중에서 von Mises 등가응력',
            '얇은 압력 용기의 후프·축방향 응력',
          ]}
        >
          <H3>5.1 비틀림 (원형축)</H3>
          <p className="leading-relaxed">토크 <F>T</F> 가 원형 축에 작용할 때 전단응력은 표면(<F>c = D/2</F>)에서 최대입니다.</p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[160px]"><SvgTorsion /></div>
          <ul className="list-disc pl-6 mt-1 space-y-1 text-sm leading-relaxed">
            <li>최대 전단응력: <F>τ_max = T·c / J</F> &nbsp;(원형축은 <F>J = π·D⁴/32</F>)</li>
            <li>비틀림각: <F>φ = T·L / (G·J)</F> &nbsp;(<F>G = E / [2(1+ν)]</F>, 금속은 <F>G ≈ 0.38·E</F>)</li>
            <li>허용 전단응력: 보통 <F>τ_allow ≈ 0.5~0.6 · σy / SF</F></li>
          </ul>
          <Note tone="warn">
            비원형 단면의 <F>J</F> 는 간단한 닫힌식이 없습니다. 직사각형은 <F>J ≈ β · b · h³</F> (β는 h/b에 의존). 개단면(I·L·채널)은 비틀림에 매우 약하므로 비틀림 부품엔 권장하지 않습니다.
          </Note>

          <H3>5.2 좌굴 (Euler 식) — 가는 기둥의 함정</H3>
          <div className="flex items-start gap-4 mt-2">
            <div className="w-28 h-28 bg-muted/30 rounded border border-border/60 flex items-center justify-center p-1 flex-shrink-0"><SvgColumn /></div>
            <div className="text-sm leading-relaxed">
              <p>가늘고 긴 기둥은 σy 를 넘기 <b>전에</b> 옆으로 휘어 무너집니다 (좌굴). 임계하중:</p>
              <p className="font-mono text-[13px] mt-1 bg-muted/40 inline-block px-2 py-1 rounded">P_cr = π² · E · I / L_eff²</p>
              <p className="mt-2"><b>유효길이</b> <F>L_eff = K·L</F> — 단부 조건에 따라:</p>
              <ul className="list-disc pl-5 text-[13px] mt-1">
                <li>핀-핀 (양단 자유 회전): <F>K = 1.0</F></li>
                <li>고정-자유 (외팔): <F>K = 2.0</F></li>
                <li>고정-핀: <F>K ≈ 0.7</F></li>
                <li>고정-고정: <F>K = 0.5</F></li>
              </ul>
            </div>
          </div>
          <Note tone="tip">강도(σy) 와 좌굴 둘 다 점검: <b>가는 부재는 좌굴이 먼저</b>, 굵은 부재는 강도가 먼저.</Note>

          <H3>5.3 복합 응력 (von Mises)</H3>
          <p className="text-sm leading-relaxed">굽힘과 비틀림이 동시에 작용하는 회전축처럼, 축응력 <F>σ_x</F> 와 전단응력 <F>τ</F> 가 같이 있을 때는 등가응력을 σy 와 비교합니다.</p>
          <p className="font-mono text-sm mt-1 bg-muted/40 inline-block px-2 py-1 rounded">σ_eq = √(σ_x² + 3·τ²) ≤ σy / SF</p>
          <p className="text-[12px] mt-1 text-muted-foreground">일반 3축 응력: <F>σ_eq = √[½((σ₁−σ₂)² + (σ₂−σ₃)² + (σ₃−σ₁)²)]</F></p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[180px]"><SvgMohr /></div>
          <p className="text-[12px] text-muted-foreground">응력 요소(좌)의 σ_x·τ 가 작용할 때, 면의 회전에 따른 응력 변화를 <b>Mohr 원</b>(우)으로 시각화합니다. 원의 양 끝이 <b>주응력 σ₁, σ₂</b> 이고 정점이 <b>최대 전단 τ_max</b>.</p>

          <H3>5.4 얇은 압력 용기</H3>
          <p className="text-sm leading-relaxed">반경 <F>r</F>, 두께 <F>t</F>, 내압 <F>p</F> (<F>t ≪ r</F>):</p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[160px]"><SvgPressureVessel /></div>
          <ul className="list-disc pl-6 mt-1 text-sm font-mono">
            <li>원주(후프) σ_h = p·r / t &nbsp;<span className="font-sans text-muted-foreground">— 후프 응력이 축응력의 2배</span></li>
            <li>축방향 σ_a = p·r / (2t)</li>
            <li>구형 용기 σ = p·r / (2t)</li>
          </ul>
          <p className="text-sm mt-1 text-muted-foreground">필요 두께 <F>t ≥ p·r·SF / σy</F>. 코드(ASME 등)를 따르세요. <span className="text-foreground/80">압력 용기에 보통 세로로 갈라지는 이유는 후프 응력이 2배라서</span>.</p>
        </Chapter>

        {/* ── Chapter 6: Ashby 방법 ─────────────────────────────────────── */}
        <Chapter
          n={6}
          id="ch6"
          title="Ashby 재료 선택법"
          learn={[
            '문제를 “기능 · 제약 · 목적 · 자유변수” 4가지로 정리',
            '성능지수(material index)가 무엇이고 왜 거듭제곱이 분수가 되는지',
            'Ashby 차트의 한계선과 등지수선을 이 앱에서 그대로 다루기',
          ]}
        >
          <p className="leading-relaxed">Ashby 방법은 문제를 네 가지로 분리합니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div className="rounded border border-border bg-card p-3 text-sm"><b>① 기능 (Function)</b><br/>부품이 무엇을 하는가 (인장재·보·패널·축…).</div>
            <div className="rounded border border-border bg-card p-3 text-sm"><b>② 제약 (Constraints)</b><br/>반드시 만족할 조건 (σy ≥ X · 온도 ≥ Y · 공정 = LPBF…).</div>
            <div className="rounded border border-border bg-card p-3 text-sm"><b>③ 목적 (Objective)</b><br/>최대/최소화할 것 (무게 ↓ · 원가 ↓ · 강성 ↑).</div>
            <div className="rounded border border-border bg-card p-3 text-sm"><b>④ 자유변수 (Free)</b><br/>설계가 바꿀 수 있는 것 (단면적, 두께…) + 재료.</div>
          </div>

          {/* 핵심 도식: F-C-O-Free → M */}
          <div className="rounded-lg border border-border bg-card p-3 my-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">📊 핵심 그림 — 4요소를 모아 성능지수 M 도출</p>
            <div className="h-[160px]"><SvgFCOF /></div>
          </div>

          <H3>성능지수(material index) — 왜 거듭제곱이 분수가 될까?</H3>
          <Note tone="why" title="유도 (경량 인장 부재)">
            <p>강도 제약: <F>F/A ≤ σy</F> → 필요 단면 <F>A ≥ F/σy</F>.</p>
            <p>질량: <F>m = A · L · ρ = F · L · (ρ/σy)</F>.</p>
            <p><F>F, L</F> 은 고정 → 질량 최소화는 <F>ρ/σy</F> 최소화 = <F>σy/ρ</F> <b>최대화</b>. ⇒ 성능지수 <F>M = σy/ρ</F>.</p>
            <p className="mt-2">기능이 “굽힘 보/패널”이면 두께·폭이 자유변수로 들어가고 단면 2차모멘트(<F>I ∝ h³</F>)를 통해 식이 정리되면서 <b>거듭제곱이 분수</b>가 됩니다. 그래서 보는 <F>E^½/ρ</F>, 패널은 <F>E^⅓/ρ</F>.</p>
          </Note>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">기능 / 목적</th><th className="p-2 font-semibold">성능지수 M (클수록 우수)</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2">경량 강성 인장재</td><td className="p-2 font-mono"><F>E/ρ</F></td></tr>
                <tr><td className="p-2">경량 강성 보</td><td className="p-2 font-mono"><F>E^½/ρ</F></td></tr>
                <tr><td className="p-2">경량 강성 패널</td><td className="p-2 font-mono"><F>E^⅓/ρ</F></td></tr>
                <tr><td className="p-2">경량 강도 인장재</td><td className="p-2 font-mono"><F>σy/ρ</F></td></tr>
                <tr><td className="p-2">경량 강도 보 / 패널</td><td className="p-2 font-mono"><F>σy^⅔/ρ</F> / <F>σy^½/ρ</F></td></tr>
                <tr><td className="p-2">탄성 스프링·힌지 (에너지 저장)</td><td className="p-2 font-mono"><F>σy²/E</F></td></tr>
                <tr><td className="p-2">경량 방열</td><td className="p-2 font-mono"><F>k/ρ</F></td></tr>
                <tr><td className="p-2">저원가 강성 / 강도</td><td className="p-2 font-mono"><F>E/Cm</F> / <F>σy/Cm</F></td></tr>
              </tbody>
            </table>
          </div>

          <H3>차트 활용 (이 앱과 1:1 매핑)</H3>
          <p className="text-sm leading-relaxed">Ashby 차트는 보통 <b>로그-로그 축</b>에 두 물성을 그립니다. 한계선(필터)·외피(재료군 분포)·등지수선(성능지수 방향)을 함께 보면 좋은 후보가 어디에 모이는지 한눈에 잡힙니다.</p>
          <div className="rounded-lg border border-border bg-card p-3 my-3 h-[220px]"><SvgAshbyChart /></div>
          <p className="text-[12px] text-muted-foreground">위 그림은 ρ vs σy 샘플 — <span className="text-amber-600 font-semibold">한계선(노랑)</span> 위쪽이 σy 제약 통과, <span className="text-rose-500 font-semibold">등지수선(빨강)</span>을 위쪽으로 옮길수록 더 좋은 재료. 둘 다 만족하는 영역에 모인 재료가 최종 후보입니다.</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">Ashby 개념</th><th className="p-2 font-semibold">이 앱에서</th></tr></thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
                <tr><td className="p-2">제약 (반드시 만족)</td><td className="p-2">좌측 <b>필터</b> 범위 · 차트 축 <b>한계 슬라이더</b></td></tr>
                <tr><td className="p-2">목적 (성능지수)</td><td className="p-2">상단 <b>Index</b> 프리셋 + <b>M 임계값</b> 슬라이더</td></tr>
                <tr><td className="p-2">다목적 (여러 지수)</td><td className="p-2"><b>+ constraint</b> 로 N개 AND</td></tr>
                <tr><td className="p-2">재료군 분포</td><td className="p-2"><b>Envelopes</b>(category/family/sub) 토글</td></tr>
                <tr><td className="p-2">후보 추리기</td><td className="p-2"><b>박스 선택</b> → Add all → Compare / → Filter</td></tr>
                <tr><td className="p-2">비교·검증</td><td className="p-2"><b>Compare</b> · 상세 팝업 · 출처 링크 · CSV</td></tr>
              </tbody>
            </table>
          </div>
        </Chapter>

        {/* ── Chapter 7: 실전 사례 ─────────────────────────────────────── */}
        <Chapter
          n={7}
          id="ch7"
          title="실전 사례 8선 — 클릭 한 번으로 앱 시작"
          learn={[
            '대표 부품 유형 8가지의 “요구→숫자→앱 단계→유력 재료군”',
            '각 사례의 “이 사례로 앱 시작” 버튼이 필터·뷰·Index 힌트를 자동 적용',
          ]}
        >
          <p className="leading-relaxed">
            자기 상황과 가장 가까운 사례를 찾아 그대로 따라 해 보세요.
            <span className="text-muted-foreground"> 수치는 방법을 보여주는 예시이고, “유력 재료군”은 일반적 경향입니다 — 최종 선택은 항상 데이터로 검증하세요.</span>
          </p>

          <Scenario
            n={1}
            presetKey="bracket"
            onConfigure={openConfig}
            diagram={<SvgBracket />}
            examples={<>GE Aviation의 LPBF 제트엔진 연료 노즐·브래킷, Airbus A350 캐빈 브래킷(티타늄 LPBF). <ExtLink href="https://en.wikipedia.org/wiki/3D_printing#Aerospace">Aerospace AM 개요</ExtLink></>}
            title="경량 고강성 구조 브래킷 (드론·항공, LPBF 출력)"
            situation="진동·하중을 받는 마운트를 가능한 한 가볍게, 충분히 강하고 덜 휘게. 금속 적층제조로 출력."
            needs={<>하중·처짐 분석(Ch.2) 결과 예: <F>σy ≥ 300 MPa</F>, <F>E ≥ 90 GPa</F>, 무게 최소.</>}
            steps={[
              <>좌측 필터: <b>Yield ≥ 300</b>, <b>Modulus ≥ 90</b>, <b>Process = LPBF</b>.</>,
              <>상단 <b>Index = 경량 강성 보 <F>E^½/ρ</F></b> 선택. <b>+ constraint</b>로 <F>σy^⅔/ρ</F> 추가.</>,
              <><b>M 임계</b>를 올려 통과를 5~10개로 좁힘 → <b>Add all → Compare</b> → 무게·강도·가격 비교.</>,
            ]}
            families={<>고강도 알루미늄(Scalmalloy·AlSi10Mg), 티타늄(Ti-6Al-4V), 마그네슘 합금.</>}
          />

          <Scenario
            n={2}
            presetKey="hightemp"
            onConfigure={openConfig}
            diagram={<SvgManifold />}
            examples={<>자동차/F1 배기 매니폴드, 제트엔진 터빈 디스크·블레이드, 로켓 노즐. <ExtLink href="https://en.wikipedia.org/wiki/Inconel">Inconel(Ni 초합금)</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Exhaust_manifold">Exhaust manifold</ExtLink></>}
            title="고온 부품 (배기 매니폴드 · 터빈 디스크)"
            situation="700 °C 부근에서 연속 사용, 반복 가열·산화."
            needs={<>최대사용온도 <F>≥ 700 °C</F>, 그리고 <b>그 온도에서의</b> <F>σy</F>가 충분(상온값이 아님). 내산화.</>}
            steps={[
              <>필터: <b>Max Service Temp ≥ 700</b>.</>,
              <>후보 상세 팝업의 <b>온도-강도 곡선</b>으로 700 °C 부근 σy/UTS 비교 · <b>Compare</b>에 여러 후보 곡선 오버레이.</>,
              <>내식성(정성) 등급도 확인.</>,
            ]}
            families={<>니켈 초합금(Inconel 718/625, Haynes 230), 코발트 합금. 중온(≤540 °C)은 티타늄 Ti-6242.</>}
          />

          <Scenario
            n={3}
            presetKey="fatigue"
            onConfigure={openConfig}
            diagram={<SvgShaft />}
            examples={<>자동차 크랭크샤프트, 발전기·증기터빈 로터, 항공기 랜딩기어 액슬. <ExtLink href="https://en.wikipedia.org/wiki/Crankshaft">Crankshaft</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Fatigue_(material)">Fatigue</ExtLink></>}
            title="회전·진동 부품 (샤프트 · 임펠러)"
            situation="반복 응력을 오래 견뎌야 하는 부품. 정적 강도만으로는 부족."
            needs={<>응력진폭 예 <F>150 MPa</F>, <F>SF = 1.5</F> → <b>피로강도</b> <F>≥ 225 MPa</F>.</>}
            steps={[
              <>필터: <b>Fatigue Strength ≥ 225</b> (<F>est.</F>가 붙었는지 상세에서 확인).</>,
              <><b>Compare</b>로 피로강도·연신율·강도 함께 비교.</>,
            ]}
            families={<>티타늄(높은 피로/강도비), 고강도강(4340), 일부 니켈합금. <span className="text-muted-foreground">알루미늄은 뚜렷한 내구한도가 없어 주의.</span></>}
          />

          <Scenario
            n={4}
            presetKey="precision"
            onConfigure={openConfig}
            diagram={<SvgPrecision />}
            examples={<>James Webb 우주망원경 백플레인(흑연·Invar 조합), 정밀 측정기 광학 마운트, 시계 밸런스. <ExtLink href="https://en.wikipedia.org/wiki/Invar">Invar</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/James_Webb_Space_Telescope">JWST</ExtLink></>}
            title="정밀 계측·광학 마운트 (치수 안정성)"
            situation="온도가 변해도 치수가 거의 변하면 안 되는 부품."
            needs={<>열변형 <F>ΔL = L·CTE·ΔT</F>에서 역산 → 매우 낮은 <b>CTE</b>(예 <F>≤ 3×10⁻⁶/K</F>), 충분한 <F>E</F>.</>}
            steps={[
              <>필터: <b>Thermal Expansion (CTE) 상한 ≤ 3</b>, 필요시 Modulus 하한.</>,
              <><b>Compare</b>로 CTE·E·밀도 비교.</>,
            ]}
            families={<>Invar(Fe-Ni36, CTE≈1.3), Kovar, 일부 세라믹·복합재.</>}
          />

          <Scenario
            n={5}
            presetKey="corrosion"
            onConfigure={openConfig}
            diagram={<SvgMarine />}
            examples={<>해수 펌프·임펠러(Cu-Ni·듀플렉스 스테인리스), 잠수함 밸브, 해양 플랜트 파이프. <ExtLink href="https://en.wikipedia.org/wiki/Duplex_stainless_steel">Duplex stainless steel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Cupronickel">Cupronickel</ExtLink></>}
            title="해양·화학 환경 부품"
            situation="염수·약품에 노출되며 하중도 받는 부품."
            needs={<>환경에 맞는 <b>내식성</b> 등급 + 강도 <F>σy ≥</F> 요구값.</>}
            steps={[
              <>필터: <b>Corrosion resistance = Excellent/Good</b> + <b>Yield</b> 하한.</>,
              <>정량 부식(부식속도·PREN 등)은 앱에 없으므로 <b>데이터시트</b>로 최종 확인.</>,
            ]}
            families={<>스테인리스(316L, 듀플렉스 2205), 티타늄, 니켈합금(Inconel 625).</>}
          />

          <Scenario
            n={6}
            presetKey="lowcost"
            onConfigure={openConfig}
            diagram={<SvgLowcost />}
            examples={<>자동차 차체·새시 패널, 가전 외장(스탬핑 강판), 일반 산업기계 프레임. <ExtLink href="https://en.wikipedia.org/wiki/Carbon_steel">Carbon steel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/6061_aluminium_alloy">6061 Al</ExtLink></>}
            title="저원가 대량 생산 부품"
            situation="성능 요구는 평범하고 단가가 최우선."
            needs={<>필요 강도 <F>σy</F>를 만족하면서 <b>kg당 가격 최소</b>.</>}
            steps={[
              <>필터: <b>Yield</b> 하한으로 “쓸 수 있는” 재료만 남김.</>,
              <>상단 <b>Index = 저원가 강도 <F>σy/Cm</F></b>로 정렬 · <b>Compare</b>에 <b>Price</b> 열 추가.</>,
            ]}
            families={<>탄소강·저합금강, 일반 알루미늄(6061), 일부 폴리머.</>}
          />

          <Scenario
            n={7}
            presetKey="spring"
            onConfigure={openConfig}
            diagram={<SvgSpring />}
            examples={<>자동차 밸브스프링·서스펜션 스프링, 시계 헤어스프링, 베릴륨동 커넥터 콘택트. <ExtLink href="https://en.wikipedia.org/wiki/Spring_steel">Spring steel</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Beryllium_copper">Beryllium copper</ExtLink></>}
            title="스프링 · 스냅핏 · 탄성 힌지"
            situation="큰 탄성 변형으로 에너지를 저장·복원하되 영구변형은 없어야."
            needs={<>단위부피당 탄성에너지 지표 <F>σy²/E</F> 최대 + 충분한 연신율.</>}
            steps={[
              <>상단 <b>Index = 탄성 스프링/힌지 <F>σy²/E</F></b> 선택.</>,
              <><b>Compare</b>로 σy·E·연신율 비교.</>,
            ]}
            families={<>스프링강, 베릴륨동(BeCu), 티타늄, 일부 니켈합금.</>}
          />

          <Scenario
            n={8}
            presetKey="heatsink"
            onConfigure={openConfig}
            diagram={<SvgHeatsink />}
            examples={<>CPU·GPU 쿨러, LED 조명 방열 케이스, 전력반도체 콜드플레이트. <ExtLink href="https://en.wikipedia.org/wiki/Heat_sink">Heat sink</ExtLink>, <ExtLink href="https://en.wikipedia.org/wiki/Thermal_conductivity_of_metals">Thermal conductivity of metals</ExtLink></>}
            title="방열 부품 (히트싱크 · 콜드플레이트)"
            situation="열을 빠르게 퍼뜨려야 하고, 가벼우면 더 좋음."
            needs={<>높은 <b>열전도도 k</b>; 경량 방열이면 <F>k/ρ</F> 최대.</>}
            steps={[
              <>필터: <b>Thermal Conductivity</b> 하한. 경량까지 필요하면 상단 <b>Index = 경량 방열 <F>k/ρ</F></b>.</>,
              <><b>Compare</b>로 k·밀도·가격 비교.</>,
            ]}
            families={<>구리(최고 k), 알루미늄(경량 방열 <F>k/ρ</F> 우수), AlSi 합금.</>}
          />

          <Note tone="tip">
            공통 마무리: 후보를 좁혔으면 <b>Compare</b>에서 이름을 클릭해 차트에 위치를 확인하고, <b>상세 팝업</b>에서 범위(min–max)·<F>est.</F> 여부·온도-강도·<b>출처 데이터시트</b>를 검증한 뒤 컬렉션으로 저장/공유하세요.
          </Note>
        </Chapter>

        {/* ── Chapter 8: 데이터 해석 + 참고 ─────────────────────────────── */}
        <Chapter
          n={8}
          id="ch8"
          title="데이터 해석 시 주의 & 참고문헌"
          learn={[
            '값은 “대표값 + 범위”이며 조건에 따라 달라진다',
            'est. 라벨의 의미와 데이터시트의 역할',
            '안전계수·인증은 설계자 책임',
          ]}
        >
          <ul className="list-disc pl-6 mt-1 space-y-1.5 leading-relaxed text-sm">
            <li>값은 <b>대표값(typical) + min–max 범위</b>입니다. 같은 합금도 공정·열처리·빌드 방향에 따라 크게 달라집니다.</li>
            <li><F>est.</F> 라벨(피로 추정, 클래스 대표 물리값 등)은 <b>측정값이 아니라 추정/대표값</b>입니다. 설계 확정 전 데이터시트로 확인하세요.</li>
            <li><b>AM(적층제조)은 이방성</b>이 있습니다(XY vs Z). 방향·후처리(HIP/열처리)에 따른 차이를 반드시 고려하세요.</li>
            <li>최종 판단은 항상 <b>출처(데이터시트·규격)</b>로 검증하고, 안전계수·인증 요구를 적용하세요. 이 앱은 <b>후보를 좁히는 도구</b>이지 설계 승인 근거가 아닙니다.</li>
          </ul>

          <H3>참고문헌</H3>
          <ul className="list-disc pl-6 mt-1 space-y-1 leading-relaxed text-sm">
            <li>M. F. Ashby, <i>Materials Selection in Mechanical Design</i>, Butterworth-Heinemann — 재료 선택 방법·성능지수의 표준 교과서.</li>
            <li>Ansys Granta EduPack, <i>Materials Selection</i> &amp; <i>Performance Indices</i> 교육 자료 — 성능지수 목록과 차트 활용.</li>
            <li>일반 재료역학(응력 <F>σ=F/A</F>, 보 처짐, 안전계수) — 표준 기계공학 교과서 (Hibbeler·Beer 등).</li>
          </ul>

          <div className="mt-10 pt-4 border-t border-border">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline underline-offset-2">
              <ArrowLeft className="w-4 h-4" /> 탐색기로 돌아가 바로 적용해 보기
            </Link>
          </div>
        </Chapter>

      </div>
    </div>
  );
}
