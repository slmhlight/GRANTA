/*
 * AM Materials Explorer — Material Detail Panel
 * Range-aware: shows typical value + min–max range (n data points) and clickable
 * source citations (verified datasheet URLs where available).
 */

import { X, Plus, Check, ExternalLink, Layers, Atom, Wrench, FlaskConical, BookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Material, PropertyRange, MaterialSource } from '@/lib/materials';
import { MECHANICAL_PROPERTIES, PHYSICAL_PROPERTIES } from '@/lib/materials';

interface MaterialDetailProps {
  material: Material | null;
  compareList: string[];
  onToggleCompare: (id: string) => void;
  onClose: () => void;
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 2 : 1));

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  curated: { label: 'Curated · multi-vendor', cls: 'bg-accent/15 text-accent border-accent/30' },
  am_vendor: { label: 'AM vendor data', cls: 'bg-violet-500/15 text-violet-600 border-violet-500/30' },
  generic: { label: 'Generic reference', cls: 'bg-muted text-muted-foreground border-border' },
};

function RangeRow({ label, range, fallback, unit }: { label: string; range?: PropertyRange | null; fallback?: number | string | null; unit: string }) {
  const typical = range?.typical ?? (typeof fallback === 'number' ? fallback : null);
  const hasRange = !!range && range.max > range.min;
  if (typical == null) {
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground/40">—</span>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
      <div className="text-right">
        <span className="font-mono text-xs font-medium text-foreground">{fmt(typical)}</span>
        <span className="text-muted-foreground font-normal text-[11px]"> {unit}</span>
        {hasRange && (
          <div className="text-[10px] font-mono text-muted-foreground/70 leading-tight">
            {fmt(range!.min)}–{fmt(range!.max)} <span className="text-muted-foreground/40">n={range!.n}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SourcesList({ sources }: { sources: MaterialSource[] }) {
  if (!sources.length) {
    return <p className="text-xs text-muted-foreground italic py-2">No source information</p>;
  }
  return (
    <div className="space-y-1.5">
      {sources.map((s, i) =>
        s.url ? (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-1.5 p-2 rounded bg-muted/40 hover:bg-muted border border-border/30 transition-colors group"
          >
            <ExternalLink className="w-3 h-3 mt-0.5 text-accent flex-shrink-0" />
            <span className="text-[11px] text-foreground group-hover:text-accent break-words flex-1 leading-snug">{s.label}</span>
            {s.verified && <span title="Verified datasheet"><Check className="w-3 h-3 text-emerald-500 flex-shrink-0" /></span>}
          </a>
        ) : (
          <div key={i} className="flex items-center gap-1.5 p-2 rounded bg-muted/30 border border-border/20">
            <BookText className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
          </div>
        )
      )}
    </div>
  );
}

function CompositionDisplay({ material }: { material: Material }) {
  const composition = material.composition;

  // Array of [element, range] pairs
  if (Array.isArray(composition) && composition.length > 0) {
    return (
      <div className="space-y-3">
        <div className="text-xs font-semibold text-foreground/80 mb-2">Chemical Composition (wt%)</div>
        <div className="grid grid-cols-2 gap-2">
          {composition.map((item, i) => {
            if (!Array.isArray(item) || item.length < 2) return null;
            const [element, range] = item;
            return (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border/30">
                <span className="text-xs font-semibold text-foreground">{element}</span>
                <span className="text-xs font-mono text-muted-foreground">{String(range)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Object dict with string range values ("16.0~18.0", "balance", "≤2.0") or numbers
  if (typeof composition === 'object' && !Array.isArray(composition)) {
    const entries = Object.entries(composition).filter(([_, v]) => v !== null && v !== undefined && v !== '' && v !== '0' && v !== 0);
    if (entries.length === 0) {
      return <p className="text-xs text-muted-foreground italic py-4 text-center">Chemical composition data not available</p>;
    }
    entries.sort((a, b) => (a[0] as string).localeCompare(b[0] as string));
    return (
      <div className="space-y-3">
        <div className="text-xs font-semibold text-foreground/80 mb-2">Chemical Composition (wt%)</div>
        <div className="grid grid-cols-2 gap-2">
          {entries.map(([element, range]) => (
            <div key={element} className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border/30">
              <span className="text-xs font-semibold text-foreground">{element}</span>
              <span className="text-xs font-mono text-muted-foreground">{String(range)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <p className="text-xs text-muted-foreground italic py-4 text-center">Chemical composition data not available</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">{label}</div>
      <div className="text-xs text-foreground">{children}</div>
    </div>
  );
}

export function MaterialDetail({ material, compareList, onToggleCompare, onClose }: MaterialDetailProps) {
  if (!material) return null;

  const isCompared = compareList.includes(material.id);
  const tier = material.tier ? TIER_BADGE[material.tier] : null;
  const sources: MaterialSource[] = material.sources ?? (material.source ? [{ label: material.source, url: null, verified: false }] : []);
  const ranges = material.ranges ?? {};
  const meta = (material.meta ?? {}) as Record<string, any>;
  const manufacturers = material.manufacturers ?? (material.manufacturer ? [material.manufacturer] : []);
  const processes = material.processes ?? (material.process ? [material.process] : []);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-lg z-40 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border/50 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-foreground leading-tight">{material.name}</h2>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{material.subcategory}</p>
          {tier && (
            <span className={`inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded border font-medium ${tier.cls}`}>{tier.label}</span>
          )}
        </div>
        <button onClick={onClose} className="ml-2 p-1 hover:bg-muted rounded transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-border/50">
          <Button onClick={() => onToggleCompare(material.id)} variant={isCompared ? 'default' : 'outline'} size="sm" className="w-full">
            {isCompared ? <><Check className="w-3 h-3 mr-1" />In Compare</> : <><Plus className="w-3 h-3 mr-1" />Add to Compare</>}
          </Button>
        </div>

        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent p-0 h-auto">
            <TabsTrigger value="properties" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-3 py-2">
              <Layers className="w-3 h-3 mr-1" />Properties
            </TabsTrigger>
            <TabsTrigger value="composition" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-3 py-2">
              <Atom className="w-3 h-3 mr-1" />Composition
            </TabsTrigger>
            <TabsTrigger value="process" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-3 py-2">
              <Wrench className="w-3 h-3 mr-1" />Process
            </TabsTrigger>
          </TabsList>

          {/* Properties */}
          <TabsContent value="properties" className="p-4 space-y-4">
            <p className="text-[10px] text-muted-foreground/60 -mt-1">Value = typical · sub-line = min–max across {meta.vendor_count ? `${meta.vendor_count} vendors` : 'conditions'}</p>
            <div>
              <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1"><FlaskConical className="w-3 h-3" />Mechanical Properties</h3>
              <div className="space-y-1">
                {MECHANICAL_PROPERTIES.map(prop => (
                  <RangeRow key={prop.key} label={prop.label} unit={prop.unit} range={ranges[prop.key as string]} fallback={material[prop.key as keyof Material] as number | string | null} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1"><Layers className="w-3 h-3" />Physical Properties</h3>
              <div className="space-y-1">
                {PHYSICAL_PROPERTIES.map(prop => (
                  <RangeRow key={prop.key} label={prop.label} unit={prop.unit} range={ranges[prop.key as string]} fallback={material[prop.key as keyof Material] as number | string | null} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground/70 mb-2 flex items-center gap-1">
                <BookText className="w-3 h-3" />Sources & Datasheets
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">{sources.length}</span>
              </h3>
              <SourcesList sources={sources} />
            </div>
          </TabsContent>

          {/* Composition */}
          <TabsContent value="composition" className="p-4">
            <CompositionDisplay material={material} />
          </TabsContent>

          {/* Process */}
          <TabsContent value="process" className="p-4 space-y-3">
            <Field label="Process">
              <div className="flex flex-wrap gap-1">
                {processes.length ? processes.map(p => (
                  <Badge key={p} variant="secondary" className="bg-accent/10 text-accent border-accent/30">{p}</Badge>
                )) : <span className="text-muted-foreground italic">Not available</span>}
              </div>
            </Field>
            <Field label="Manufacturer / Vendor">{manufacturers.length ? manufacturers.join(', ') : '—'}</Field>
            {material.machines && material.machines.length > 0 && <Field label="Machines">{material.machines.join(', ')}</Field>}
            {meta.heat_treatments && (meta.heat_treatments as string[]).length > 0 && <Field label="Heat treatments">{(meta.heat_treatments as string[]).join(', ')}</Field>}
            {meta.applications && <Field label="Applications">{String(meta.applications)}</Field>}
            {meta.anisotropy && <Field label="Note"><span className="text-muted-foreground">Properties vary by build direction (XY vs Z).</span></Field>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
