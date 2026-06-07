/*
 * R157b — Composition 관련 pure helpers + element color map.
 * MaterialDetail.tsx 의 inline 정의에서 추출. Behavior identical.
 */
import type { Material } from '@/lib/materials';

/* R76 — 원소별 색상 매핑 (CPK + handbook 관습 mix).
   R84 — 채도 ↑ (38% → 50%), 명도 살짝 ↓ 로 인접 원소 구분성 강화. */
export const ELEMENT_COLORS: Record<string, string> = {
  Fe: '#5a6473', Cr: '#5fa3d8', Ni: '#8fbd86', C: '#3a3a3a', Mn: '#8a5fc4',
  Si: '#d4be4f', Cu: '#cf6f2e', Al: '#a5acba', Ti: '#9aa4b3', V: '#d870a5',
  Mo: '#7a4fb8', W: '#2a2a2a', Co: '#4f7fbd', Nb: '#5aada3', Ta: '#646872',
  Mg: '#80c075', Zn: '#a7a8b3', Sn: '#9da0b5', N: '#7fcbd9', P: '#e08c44',
  S:  '#e8c83a', B: '#dc8aa4', Y: '#d089a8', Zr: '#8c92a0', O: '#e35a5a',
  Ag: '#c8cdda', Hf: '#828891', Li: '#daa05f', La: '#bb88dc', Ce: '#c89edb',
  Re: '#666c78', Pb: '#697080', Be: '#85c89e', Bi: '#7560a0', Cd: '#cab045',
  Ga: '#a087c0', In: '#828a98', Pt: '#aab0b8', Pd: '#94a0a8', Au: '#e8b840',
};

export function elementColor(el: string): string {
  if (ELEMENT_COLORS[el]) return ELEMENT_COLORS[el];
  let h = 0;
  for (let i = 0; i < el.length; i++) h = (h * 31 + el.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(h) % 360}, 50%, 55%)`;
}

/* "16.0~18.0" → 17.0, "≤2" → 2, "≥58" → 58, "0.25" → 0.25, "balance" / "trace" → null. */
export function parseCompValue(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return isFinite(raw) ? raw : null;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === 'balance' || s === 'bal' || s === 'bal.' || s === 'rem' || s === 'remainder' || s === 'trace' || s === 'micro' || s === 'tr' || s === 'others') return null;
  let m = s.match(/^[≤<≦]\s*([\d.]+)/); if (m) return parseFloat(m[1]);
  m = s.match(/^[≥>≧]\s*([\d.]+)/);     if (m) return parseFloat(m[1]);
  m = s.match(/^([\d.]+)\s*[~–\-—]\s*([\d.]+)/); if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

export type CompSlice = {
  element: string;
  value: number;
  color: string;
  isBalance: boolean;
  raw: string;
};

export function buildCompSlices(comp: Material['composition']): CompSlice[] {
  // 통일 처리: array form [[el, range], ...] 또는 object form {El: range, ...} 둘 다.
  const pairs: Array<[string, unknown]> = Array.isArray(comp)
    ? (comp.filter((p): p is [string, string] => Array.isArray(p) && p.length >= 2))
    : (comp && typeof comp === 'object' ? Object.entries(comp) : []);
  if (pairs.length === 0) return [];
  const items: Array<{ element: string; value: number; raw: string }> = [];
  let balanceEl: string | null = null;
  for (const [el, v] of pairs) {
    if (v == null || v === '' || v === 0 || v === '0') continue;
    const s = String(v).trim().toLowerCase();
    if (s === 'balance' || s === 'bal' || s === 'bal.' || s === 'rem' || s === 'remainder') { balanceEl = el; continue; }
    const num = parseCompValue(v);
    if (num != null && num > 0) items.push({ element: el, value: num, raw: String(v) });
  }
  const knownSum = items.reduce((s, d) => s + d.value, 0);
  const balVal = Math.max(0, 100 - knownSum);
  if (balanceEl && balVal > 0) items.push({ element: balanceEl, value: balVal, raw: 'balance' });
  items.sort((a, b) => b.value - a.value);
  return items.map((d) => ({ ...d, color: elementColor(d.element), isBalance: d.element === balanceEl }));
}
