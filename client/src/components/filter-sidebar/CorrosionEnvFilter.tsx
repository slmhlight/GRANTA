/*
 * E15l — 환경별 내식성 필터 (부식 카드의 합금 보정 판정 기준 — 그룹 기본값 아님).
 * 환경 키는 lib/corrosion-guidance.ts 의 CORROSION_ENV_AXES 와 타입으로 묶여 있다(오타는 컴파일 실패).
 * 표시 순서·짧은 라벨만 여기서 정한다.
 */
import { useState } from 'react';
import { useLang } from '@/lib/i18n';   // AUD F23
import { type CORROSION_ENV_AXES } from '@/lib/corrosion-guidance';

type CorrEnv = (typeof CORROSION_ENV_AXES)[number];
type EnvMin = 'good' | 'excellent';

export const CORR_ENV_ROWS: { env: CorrEnv; short: string }[] = [
  { env: '해수', short: '해수' },
  { env: '염수·염화물', short: '염수·염화물' },
  { env: '강산', short: '강산' },
  { env: '약산(묽은산·유기산)', short: '약산' },
  { env: '알칼리', short: '알칼리' },
  { env: '대기', short: '대기(내후)' },
];

interface CorrosionEnvFilterProps {
  value: Record<string, EnvMin>;
  onChange: (v: Record<string, EnvMin>) => void;
}

export function CorrosionEnvFilter({ value, onChange }: CorrosionEnvFilterProps) {
  const { lang } = useLang();
  const [expanded, setExpanded] = useState(false);
  const active = Object.keys(value).length;
  const set = (env: string, min: EnvMin | null) => {
    const next = { ...value };
    if (min === null) delete next[env];
    else next[env] = min;
    onChange(next);
  };
  return (
    <div className="px-3 py-1.5">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between text-xs font-medium hover:text-accent">
        <span>{lang === 'en' ? 'Corrosion environment' : '내식 환경'} <span className="text-[9px] text-muted-foreground font-normal">{lang === 'en' ? 'alloy-adjusted rating' : '합금 보정 판정'}</span></span>
        <span className="flex items-center gap-1">
          {active > 0 && <span className="text-[10px] bg-accent/15 text-accent rounded px-1">{active}</span>}
          <span className="text-muted-foreground">{expanded ? '−' : '+'}</span>
        </span>
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1">
          {CORR_ENV_ROWS.map(({ env, short }) => {
            const cur = value[env] ?? null;
            const seg = (min: EnvMin | null, label: string) => (
              <button
                key={String(min)}
                onClick={() => set(env, min)}
                className={`px-1.5 py-0.5 text-[10px] rounded border ${cur === min ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
              >{label}</button>
            );
            return (
              <div key={env} className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-foreground/80">{short}</span>
                <span className="flex gap-1">{seg(null, '전체')}{seg('good', '양호+')}{seg('excellent', '탁월')}</span>
              </div>
            );
          })}
          <p className="text-[9px] text-muted-foreground leading-snug pt-0.5">상세 화면의 부식 카드와 같은 기준(합금별 보정 반영). 복합재는 부식 판정이 없어 제외.</p>
        </div>
      )}
    </div>
  );
}
