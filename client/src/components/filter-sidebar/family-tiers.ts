/*
 * Family Tree 의 2단계(family bucket) 분류 — subcategory 문자열 → 버킷 이름.
 * R35a-v2: tier1 = Category · tier2 = 이 버킷 · tier3 = subcategory 자체.
 * A9 결론에 따라 유지되는 subcat-정규화 분류기(동결) — 이름 regex 가 아니라 subcategory 라벨을 본다.
 *
 * 버킷 색은 lib/material-colors.ts CLASSES 의 것을 **그대로 가져온다**(R96 의 "일치시킨다" 를 복사가 아니라
 * 참조로) — 카드·표·상세·Ashby 의 family dot 과 같은 hue. tier1 색은 tailwind 정적 클래스(JIT 인식).
 */
import { CLASS_COLOR } from '@/lib/material-colors';

export function tier2OfMetal(sub: string): string {
  const s = sub.toLowerCase();
  if (/stainless|ph stainless/.test(s)) return 'Stainless Steel';
  if (/^aluminum/.test(s)) return 'Aluminum';
  if (/nickel|inconel|hastelloy|monel|incoloy|waspaloy|haynes|rene|nimonic|udimet|cmsx|cm247|in[\s-]?7\d{2}|in[\s-]?9\d{2}/.test(s)) return 'Nickel Alloy';
  if (/cobalt|stellite|cocr|l605|mp159|elgiloy/.test(s)) return 'Cobalt Alloy';
  if (/^titanium|ti cp|ti grade|ti-/.test(s)) return 'Titanium';
  if (/^copper|brass|bronze|cu-/.test(s)) return 'Copper Alloy';
  if (/magnesium|^az\d|^we\d|^ez\d|^am6/.test(s)) return 'Magnesium';
  if (/tool steel|maraging|aermet|300m/.test(s)) return 'Tool / Special Steel';
  if (/carbon steel|alloy steel|case-hardening|cast iron|^\d{4}$/.test(s)) return 'Carbon / Alloy Steel';
  if (/refractory|tungsten|tantalum|niobium|molybdenum|tzm|hafnium|c103|zirconium/.test(s)) return 'Refractory';
  if (/invar|controlled expansion|kovar/.test(s)) return 'Controlled Expansion';
  if (/beryllium|zinc|shape memory|nitinol/.test(s)) return 'Other Specialty';
  return 'Other Metal';
}
export function tier2OfPolymer(sub: string): string {
  const s = sub.toLowerCase();
  if (/peek|pekk|pei|ultem|ppsu|psu|pps|pai|pbi|polyimide|\bpes\b/.test(s)) return 'High-Performance';
  if (/polyamide|polycarbonate|pom|pbt|pet|pmma/.test(s)) return 'Engineering';
  if (/abs|asa|\bpp\b|polystyrene|pvc|polyethylene|petg|pla/.test(s)) return 'Commodity';
  if (/ptfe|pvdf|etfe|fluoropolymer/.test(s)) return 'Fluoropolymer';
  if (/tpu|tpe|silicone|elastomer/.test(s)) return 'Elastomer / Rubber';
  if (/lcp|uhmwpe|pcl|eva|pvb/.test(s)) return 'Specialty';
  if (/epoxy|thermoset|polyester|photopolymer/.test(s)) return 'Thermoset';
  if (/nylon \(fdm/.test(s)) return 'Engineering';
  return 'Other Polymer';
}
export function tier2OfCeramic(sub: string): string {
  const s = sub.toLowerCase();
  if (/oxide|alumina|zirconia|yttria|ceria|spinel|sapphire|quartz|mullite|magnesia|porcelain|steatite/.test(s)) return 'Oxide';
  if (/nitride|si3n4|aln|^bn$|cbn|tin/.test(s)) return 'Nitride';
  if (/carbide|sic|wc|b4c|tic|tac/.test(s)) return 'Carbide';
  if (/uhtc|hfc|zrb2|hfb2/.test(s)) return 'UHTC (Ultra-High-Temp)';
  if (/glass|aerogel|silica/.test(s)) return 'Glass / Aerogel';
  if (/piezoelectric|dielectric|pzt|batio3|alsic/.test(s)) return 'Electronic Ceramic';
  if (/bioceramic|hydroxyapatite/.test(s)) return 'Bioceramic';
  if (/silicate|cordierite|forsterite/.test(s)) return 'Silicate';
  if (/macor|lab6|boride/.test(s)) return 'Specialty Ceramic';
  return 'Other Ceramic';
}
export function tier2OfComposite(sub: string): string {
  const s = sub.toLowerCase();
  if (/carbon/.test(s)) return 'Carbon Fiber (CFRP)';
  if (/glass/.test(s)) return 'Glass Fiber (GFRP)';
  if (/aramid/.test(s)) return 'Aramid (AFK)';
  if (/metal-matrix|mmc/.test(s)) return 'Metal-Matrix (MMC)';
  if (/ceramic-matrix|cmc/.test(s)) return 'Ceramic-Matrix (CMC)';
  if (/wood/.test(s)) return 'Natural (Wood)';
  if (/honeycomb/.test(s)) return 'Sandwich (Honeycomb)';
  if (/foam/.test(s)) return 'Foam';
  if (/polyethylene/.test(s)) return 'Polyethylene-Composite';
  if (/bulk-molding/.test(s)) return 'Bulk Molding (BMC/SMC)';
  return 'Other Composite';
}
export function tier2Of(category: string, subcategory: string): string {
  if (category === 'Metal') return tier2OfMetal(subcategory);
  if (category === 'Polymer') return tier2OfPolymer(subcategory);
  if (category === 'Ceramic') return tier2OfCeramic(subcategory);
  if (category === 'Composite') return tier2OfComposite(subcategory);
  return 'Other';
}

/** display-friendly leaf label — 카테고리 prefix 제거. */
export function leafLabel(sub: string): string {
  return sub.replace(/^Polymer - /, '').replace(/^Stainless Steel - /, 'SS - ').replace(/^Stainless - /, 'SS - ').replace(/^Aluminum - /, 'Al - ').replace(/^Titanium - /, 'Ti - ').replace(/^Copper - /, 'Cu - ').replace(/^Nickel - /, 'Ni - ').replace(/^Cobalt - /, 'Co - ');
}

export interface TierStyle { bg1: string; bg2: string; tier1Bd: string; tier2Bd: string; tier3Bd: string; text1: string; text2: string; dot: string }

/** R36b — 카테고리별 색상 토큰 (CATEGORY_COLORS 와 일관). tailwind 정적 클래스만 사용해야 JIT 가 인식. */
export const CATEGORY_TIER_STYLE: Record<string, TierStyle> = {
  Metal: {
    bg1: 'bg-sky-500/10', bg2: 'bg-sky-500/5',
    tier1Bd: 'border-l-[4px] border-sky-500',
    tier2Bd: 'border-l-2 border-sky-500/60',
    tier3Bd: 'border-l border-sky-500/35',
    text1: 'text-sky-800', text2: 'text-sky-700/85',
    dot: 'bg-sky-500',
  },
  Polymer: {
    bg1: 'bg-emerald-500/10', bg2: 'bg-emerald-500/5',
    tier1Bd: 'border-l-[4px] border-emerald-500',
    tier2Bd: 'border-l-2 border-emerald-500/60',
    tier3Bd: 'border-l border-emerald-500/35',
    text1: 'text-emerald-800', text2: 'text-emerald-700/85',
    dot: 'bg-emerald-500',
  },
  Ceramic: {
    bg1: 'bg-amber-500/10', bg2: 'bg-amber-500/5',
    tier1Bd: 'border-l-[4px] border-amber-500',
    tier2Bd: 'border-l-2 border-amber-500/60',
    tier3Bd: 'border-l border-amber-500/35',
    text1: 'text-amber-800', text2: 'text-amber-700/85',
    dot: 'bg-amber-500',
  },
  Composite: {
    bg1: 'bg-violet-500/10', bg2: 'bg-violet-500/5',
    tier1Bd: 'border-l-[4px] border-violet-500',
    tier2Bd: 'border-l-2 border-violet-500/60',
    tier3Bd: 'border-l border-violet-500/35',
    text1: 'text-violet-800', text2: 'text-violet-700/85',
    dot: 'bg-violet-500',
  },
};
export const FALLBACK_TIER_STYLE = CATEGORY_TIER_STYLE.Metal;

/* R96 — 금속 tier2 버킷 → material-colors CLASSES 키. 색 hex 는 CLASS_COLOR 에서 읽는다(정의 한 곳).
 *       Controlled Expansion(Invar/Kovar, Fe-Ni)은 classOf 가 Nickel 로 두므로 같은 색. 비금속 버킷은 tier1 색 유지. */
const TIER2_CLASS_KEY: Record<string, string> = {
  'Stainless Steel': 'Steel',
  'Tool / Special Steel': 'Steel',
  'Carbon / Alloy Steel': 'Steel',
  'Aluminum': 'Aluminum',
  'Nickel Alloy': 'Nickel',
  'Cobalt Alloy': 'Cobalt',
  'Titanium': 'Titanium',
  'Copper Alloy': 'Copper',
  'Magnesium': 'Magnesium',
  'Refractory': 'Refractory',
  'Controlled Expansion': 'Nickel',
  'Other Specialty': 'Other',
  'Other Metal': 'Other',
};

/** tier2 버킷의 family 색 (hex) — 매핑 없는 버킷(비금속)은 null → 호출부가 tier1 색으로 폴백. */
export function tier2FamilyColor(tier2: string): string | null {
  const key = TIER2_CLASS_KEY[tier2];
  return key ? (CLASS_COLOR[key] ?? null) : null;
}
