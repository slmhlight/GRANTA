/*
 * 사이드바 접이식 섹션 — 제목 · 활성 개수 배지 · 펼침 화살표. 여섯 필터가 같은 헤더 마크업을 각자
 * 복사해 갖고 있던 것을 한 곳으로(F1). 마크업·클래스는 복사본과 동일하다(렌더 대조로 확인).
 * RangeSlider 는 배지 대신 점 마커를 쓰고 last:border-0 이 붙어 별도 헤더를 유지한다.
 */
import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FilterSectionProps {
  title: ReactNode;
  /** 활성 항목 수 — 0 이면 배지를 숨긴다. */
  activeCount: number;
  /** 배지 뒤에 붙는 보조 표기 (예: 그룹 수). */
  extra?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function FilterSection({ title, activeCount, extra, defaultExpanded = false, children }: FilterSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="border-b border-border/50">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-1.5">
          {title}
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-accent/20 text-accent border-0">
              {activeCount}
            </Badge>
          )}
          {extra}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && children}
    </div>
  );
}

/** 필터 그룹 구분자 (R35a — sticky uppercase divider). */
export function SectionGroup({ label }: { label: string }) {
  return (
    <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider font-bold text-muted-foreground/70 bg-muted/40 border-b border-border/30 select-none">
      {label}
    </div>
  );
}

/** 다중 선택 토글 — 목록에 있으면 빼고 없으면 더한다. 여섯 필터가 같은 3줄을 각자 갖고 있었다. */
export function toggleIn<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}
