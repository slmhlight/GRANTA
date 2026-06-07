/*
 * R157b — Field: simple label + content row.
 * MaterialDetail.tsx 의 inline 정의에서 추출.
 */
import type { ReactNode } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">{label}</div>
      <div className="text-xs text-foreground">{children}</div>
    </div>
  );
}
