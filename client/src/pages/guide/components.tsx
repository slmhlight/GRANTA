/*
 * Guide 페이지 공용 UI 컴포넌트 — 챕터·카드·강조 박스 등.
 * Guide.tsx 가 너무 커져 분리. svg 들은 ./svgs.tsx 로 별도 분리.
 */
import { Link } from 'wouter';
import { ExternalLink, Play, Settings } from 'lucide-react';
import type { ScenarioKey } from '@/lib/scenario-presets';

/** 인라인 수식/기호 강조 */
export function F({ children }: { children: React.ReactNode }) {
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

/** 챕터 인트로 — 번호 배지 + 제목 + "이 챕터에서 배우는 것" */
export function Chapter({ n, id, title, learn, prereq, children }: { n: number; id: string; title: string; learn: string[]; prereq?: React.ReactNode; children?: React.ReactNode }) {
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
        {icon && <div className="w-20 h-12 flex-shrink-0 bg-muted/30 rounded border border-border/50 p-1">{icon}</div>}
      </div>
      <p className="text-[13px] leading-relaxed text-foreground/90"><b className="text-accent">물리적 의미:</b> {intuition}</p>
      <p className="text-[12px] mt-2 leading-relaxed text-muted-foreground"><b className="text-foreground/80">관련 설계 요구:</b> {useFor}</p>
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
