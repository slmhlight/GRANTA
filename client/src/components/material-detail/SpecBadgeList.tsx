/*
 * R160 — Spec badge list with click-to-expand popover.
 * 이전: 8 chip + "+N" 으로만 표시되어 추가 spec 정보 표시 어려움.
 * 이후: 각 chip 클릭 → popover 로 org / id / description 표시.
 *      "+N" 클릭 → 모든 spec 리스트 popover.
 */
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface Spec {
  id: string;
  org: string;
  description?: string;
  /** Optional vendor / standards-body URL where this spec can be purchased / viewed. */
  url?: string;
}

interface SpecBadgeListProps {
  specs: Spec[];
  /** Color map per org. Caller passes existing SPEC_BADGE_COLOR map. */
  colorMap: Record<string, { color: string; bg: string }>;
  /** Max # specs shown inline before overflow popover. Default 8. */
  maxInline?: number;
}

/** Default fallback color for orgs not in the color map. */
const FALLBACK = { color: '#475569', bg: '#e2e8f0' };

/* R160 — Per-org full name + reference URL pattern for the popover. */
const ORG_INFO: Record<string, { name: string; refUrl?: (id: string) => string }> = {
  AMS: { name: 'Aerospace Material Specification (SAE)', refUrl: (id) => `https://www.sae.org/standards/content/${id.toLowerCase().replace(/\s+/g, '')}/` },
  ASTM: { name: 'ASTM International', refUrl: (id) => `https://www.astm.org/${id.toLowerCase().replace(/\s+/g, '').replace(/^astm/, '')}.html` },
  ASME: { name: 'American Society of Mechanical Engineers' },
  DNV: { name: 'Det Norske Veritas (offshore / marine)' },
  EN: { name: 'European Norm (CEN)' },
  ISO: { name: 'International Organization for Standardization' },
  API: { name: 'American Petroleum Institute' },
  NACE: { name: 'NACE International (corrosion engineering)' },
  UNS: { name: 'Unified Numbering System (SAE/ASTM)' },
  MIL: { name: 'US Military specification' },
  JIS: { name: 'Japanese Industrial Standards' },
  KS: { name: 'Korean Industrial Standards' },
  DIN: { name: 'Deutsches Institut für Normung' },
  GB: { name: 'Chinese National Standards (Guobiao)' },
  OTHER: { name: '기타 표준' },
};

function SpecBadge({ spec, color }: { spec: Spec; color: { color: string; bg: string } }) {
  const orgInfo = ORG_INFO[spec.org] || ORG_INFO.OTHER;
  const refUrl = spec.url || (orgInfo.refUrl ? orgInfo.refUrl(spec.id) : undefined);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-block text-[9.5px] px-1.5 py-0.5 rounded font-mono font-semibold border cursor-pointer hover:shadow-sm transition-shadow"
          style={{ color: color.color, background: color.bg, borderColor: color.color }}
          title={spec.description || `${spec.org} standard — click for detail`}
        >
          {spec.id}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-3 text-xs">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/60">
            <span className="font-mono font-bold text-sm" style={{ color: color.color }}>{spec.id}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{spec.org}</span>
          </div>
          {orgInfo.name && (
            <p className="text-[10px] text-muted-foreground">{orgInfo.name}</p>
          )}
          {spec.description && (
            <p className="text-foreground/90 leading-relaxed">{spec.description}</p>
          )}
          {refUrl && (
            <a
              href={refUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline text-[11px] mt-1"
            >
              표준 문서 보기 →
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SpecBadgeList({ specs, colorMap, maxInline = 8 }: SpecBadgeListProps) {
  if (!specs || specs.length === 0) return null;
  const inline = specs.slice(0, maxInline);
  const overflow = specs.slice(maxInline);
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {inline.map((s) => (
        <SpecBadge key={s.id} spec={s} color={colorMap[s.org] || FALLBACK} />
      ))}
      {overflow.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded font-medium text-muted-foreground hover:text-foreground border border-border hover:border-accent transition-colors"
              title="모든 spec 보기"
            >
              +{overflow.length} <ChevronDown className="w-2.5 h-2.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-80 max-h-72 overflow-auto p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              추가 표준 spec ({overflow.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {overflow.map((s) => (
                <SpecBadge key={s.id} spec={s} color={colorMap[s.org] || FALLBACK} />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
