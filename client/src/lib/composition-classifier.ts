/*
 * Composition-Based Material Classifier
 * Automatically categorizes materials based on chemical composition ranges
 * Generates dynamic family classifications (e.g., "High-Cr Stainless", "Al-Si Casting Alloy")
 */

import type { Material } from './materials';
import { parseCompositionRange } from './composition-parser';

/* 파서는 lib/composition-parser 하나다. 예전에는 이 파일이 **자체 구현**을 들고 있어서,
   공용 파서를 고쳐도 분류기에는 닿지 않았다 — 두 벌은 실제로 다르게 읽고 있었다
   ("1.50 max" 를 1.5 정확값으로, "≥2.5×C" 를 2.5% 로, "balance (substrate)" 를 값 없음으로). */
function numericRange(s: string): { min: number; max: number; openMax: boolean } | null {
  const r = parseCompositionRange(s);
  if (!r || typeof r.min !== 'number' || typeof r.max !== 'number') return null;
  return { min: r.min, max: r.max, openMax: !!r.openMax };
}

/** balance(잔부) 표기인지 — "balance (substrate)" 처럼 괄호 주석이 붙은 것도 포함(파서가 판정). */
function isBalanceNotation(v: unknown): boolean {
  return typeof v === 'string' && !!parseCompositionRange(v)?.isBalance;
}

/**
 * H6 A-2 — 'balance'(잔부)는 "값 없음"이 아니라 "최대 성분": 100 − (타 원소 합) 으로 추정.
 * 타 원소 max 합이 잔부의 min 을, min 합이 잔부의 max 를 정한다.
 * (기존엔 null 반환 → isElementHigh('Fe',50)=false → balance-Fe 강 전체(658곳)가 철강 분기 탈락.)
 */
/* 조성 딕셔너리에는 **구성분이 아닌 주석 키**가 섞여 있다. balance 를 나머지 합으로 역산하는
   아래 함수가 그것까지 구성분으로 더해서 실제로 값이 틀어져 있었다:
     Coating "Zn ~93% · Mg 3% · Al 4%"  → 93% 를 빼서 도금강판의 Fe 가 **7–97%** 로 나왔다
     CE "≤0.50%" (탄소당량 — 조성이 아니라 조성에서 **유도한 지표**) → 철근 6종 Fe 가 0.5%p 낮게
   반대로 ceramic "~5%"(MMC 의 세라믹 강화상)는 실제 구성분이라 그대로 더한다. 그래서 기준은
   "원소 기호가 아닌 키" 가 아니라 **"구성분이 아닌 키"** 다 — 원소 화이트리스트로 거르면
   세라믹·수지 같은 비원소 구성분까지 잃는다(복합재 조성은 상(相) 이름으로 적힌다).
   prose 주석 키(composition)는 지금은 숫자가 없어 무해하지만 같은 성격이라 함께 제외한다. */
export const NON_CONSTITUENT = new Set(['CE', 'Coating', 'composition']);

function balanceRange(entries: [string, unknown][], element: string): { min: number; max: number } {
  let sumMin = 0, sumMax = 0;
  for (const [el, v] of entries) {
    if (el === element || v === null || v === undefined || v === '') continue;
    if (NON_CONSTITUENT.has(el)) continue;
    const r = typeof v === 'number' ? { min: v, max: v, openMax: false } : numericRange(String(v));
    if (!r) continue;
    sumMin += r.min;
    /* 상한이 명시되지 않은 항목("≥0.15 V")의 max 는 자리표시자 100 이다. 그걸 그대로 더하면
       합이 100 을 넘겨 balance 의 하한이 0 으로 무너지고, isElementHigh(Fe,50) 가 false 가 돼
       **조성 기반 분류가 통째로 subcategory 폴백으로 떨어졌다**(실측 12 재료). 상한을 모르는
       것은 사실이므로 지어내지 않고, 확실한 하한만 더한다 — 그래서 balance 하한은
       "명시된 최소치만 뺀 값" 이라는 뜻이 된다. */
    sumMax += r.openMax ? r.min : r.max;
  }
  return { min: Math.max(0, 100 - sumMax), max: Math.min(100, 100 - sumMin) };
}

/**
 * Extract element concentration from material composition.
 * export 이유: balance 역산이 조성의 비구성분 키에 오염됐던 적이 있어(도금강판 Fe 7–97%)
 * 게이트가 **숫자 자체**를 검사한다 — 분류 결과만 보면 0.5%p 오차 같은 것은 안 드러난다.
 */
export function getElementConcentration(material: Material, element: string): { min: number; max: number } | null {
  const comp = material.composition;

  // Handle array format (range list)
  if (Array.isArray(comp)) {
    const found = comp.find(item => Array.isArray(item) && item[0] === element);
    if (found && found[1]) {
      if (isBalanceNotation(found[1])) {
        return balanceRange(comp.map((it) => [it[0], it[1]] as [string, unknown]), element);
      }
      return numericRange(String(found[1]));
    }
  }

  // Handle dict format (value may be a number or a range/notation string e.g. "16.0~18.0", "≤2.0", "balance")
  if (typeof comp === 'object' && !Array.isArray(comp)) {
    const value = (comp as Record<string, unknown>)[element];
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return { min: value, max: value };
    if (isBalanceNotation(value)) return balanceRange(Object.entries(comp as Record<string, unknown>), element);
    return numericRange(String(value));
  }

  return null;
}

/**
 * Check if element concentration is above threshold
 */
function isElementHigh(material: Material, element: string, threshold: number): boolean {
  const conc = getElementConcentration(material, element);
  return conc ? conc.min >= threshold : false;
}

/**
 * Check if element concentration is below threshold
 */
/* 미표기 원소는 "모름" 이 아니라 **규격이 의도적으로 넣지 않은 것** 이다 — 강 규격표는 의도적
   첨가원소만 적는다. 예전에는 값이 없으면 false 라, "Ni ≤ 2" 같은 **상한 조건이 Ni 를 아예
   안 적은 합금에서 실패**했다 → AISI 410·420·430·434·440C·405 등 페라이트·마르텐사이트계
   **29 종**이 스테인리스 분기를 통과하지 못하고 탄소강/폴백으로 떨어졌다.
   하한 조건(isElementHigh)은 반대다 — 안 적힌 원소가 많다고 볼 근거가 없으므로 false 유지. */
function isElementLow(material: Material, element: string, threshold: number): boolean {
  const comp = material.composition;
  if (!comp || (Array.isArray(comp) && comp.length === 0)) return false;   // 조성 자체가 없으면 판단 불가
  const conc = getElementConcentration(material, element);
  return conc ? conc.max <= threshold : true;
}

/**
 * Check if element concentration is in range
 */
function isElementInRange(material: Material, element: string, min: number, max: number): boolean {
  const conc = getElementConcentration(material, element);
  return conc ? conc.min >= min && conc.max <= max : false;
}

/**
 * Classify material based on composition
 * Returns dynamic family classification
 */
/** SAE J404 / AISI — 이 중 하나라도 규정 최소치를 넘으면 탄소강이 아니라 합금강. */
const ALLOY_STEEL_MIN: [string, number][] = [
  ['Cr', 0.30], ['Ni', 0.30], ['Mo', 0.08], ['V', 0.10], ['W', 0.10],
  ['Mn', 1.66], ['Si', 0.61], ['Cu', 0.61],
];

export function classifyMaterialByComposition(material: Material): string {
  // Skip if no composition data
  const comp = material.composition;
  if (!comp || (Array.isArray(comp) && comp.length === 0)) {
    return material.subcategory || 'Other';
  }

  // Iron-based alloys
  if (isElementHigh(material, 'Fe', 50)) {
    if (isElementInRange(material, 'Cr', 16, 30) && isElementInRange(material, 'Ni', 8, 14)) {
      return 'Stainless Steel - Austenitic';
    }
    if (isElementInRange(material, 'Cr', 12, 18) && isElementLow(material, 'Ni', 2)) {
      return 'Stainless Steel - Ferritic/Martensitic';
    }
    if (isElementHigh(material, 'Cr', 12) && isElementHigh(material, 'Mo', 2)) {
      return 'Stainless Steel - Duplex';
    }
    // H6 A-2 — 마레이징(Fe-balance·Ni 17~19·Co 8~9.5·Mo 4~5)을 Ni-Co 분기보다 먼저:
    // Fe 가 잔부(≥50%)인 강이 "Nickel-based" 로 빠지는 모순 방지. Ni 문턱 18→17 (18Ni 계 min 17).
    if (isElementHigh(material, 'Mo', 4) && isElementHigh(material, 'Ni', 17) && isElementHigh(material, 'Co', 5)) {
      return 'Maraging Steel';
    }
    if (isElementHigh(material, 'Ni', 8) && isElementHigh(material, 'Co', 5)) {
      return 'Nickel-based Superalloy';
    }
    if (isElementHigh(material, 'Ni', 45)) {
      return 'Nickel-based Superalloy';
    }
    if (isElementHigh(material, 'C', 0.8)) {
      return 'Tool Steel';
    }
    /* SAE J404/AISI 의 합금강 정의 — 의도적 첨가원소가 규정 최소치를 넘으면 합금강이다.
       예전 조건(Ni≥3 || Mo≥0.5)은 그보다 훨씬 높아 42CrMo4·AISI 5130/5140·6150 같은 전형적
       합금강 **108 종**이 'Carbon Steel' 로 떨어졌다 — 정작 각 재료의 subcategory 는 이미
       'Alloy Steel' 이라고 말하고 있었다. */
    if (ALLOY_STEEL_MIN.some(([el, t]) => isElementHigh(material, el, t))) {
      return 'Alloy Steel';
    }
    return 'Carbon Steel';
  }

  // Aluminum-based alloys
  if (isElementHigh(material, 'Al', 85)) {
    if (isElementInRange(material, 'Si', 4, 13)) {
      return 'Aluminum - Si Alloys (6xxx/7xxx)';
    }
    if (isElementInRange(material, 'Mg', 3, 6)) {
      return 'Aluminum - Mg Alloys (5xxx)';
    }
    if (isElementInRange(material, 'Cu', 3, 5)) {
      return 'Aluminum - Cu Alloys (2xxx)';
    }
    if (isElementInRange(material, 'Zn', 4, 8)) {
      return 'Aluminum - Zn Alloys (7xxx)';
    }
    return 'Aluminum - Pure/Other';
  }

  // Titanium-based alloys
  if (isElementHigh(material, 'Ti', 85)) {
    if (isElementInRange(material, 'Al', 5, 7) && isElementInRange(material, 'V', 3, 5)) {
      return 'Titanium - Ti6Al4V';
    }
    if (isElementHigh(material, 'Al', 5)) {
      return 'Titanium - Alpha Alloys';
    }
    if (isElementHigh(material, 'V', 3)) {
      return 'Titanium - Beta Alloys';
    }
    return 'Titanium - Pure/Other';
  }

  // Cobalt-based alloys
  if (isElementHigh(material, 'Co', 50)) {
    if (isElementHigh(material, 'Cr', 20) && isElementHigh(material, 'Mo', 8)) {
      return 'Cobalt - Stellite';
    }
    return 'Cobalt-based Superalloy';
  }

  // Nickel-based alloys
  if (isElementHigh(material, 'Ni', 50)) {
    if (isElementInRange(material, 'Cu', 60, 75)) {
      return 'Nickel-Copper (Monel)';
    }
    return 'Nickel-based Superalloy';
  }

  // Copper-based alloys
  if (isElementHigh(material, 'Cu', 50)) {
    if (isElementHigh(material, 'Zn', 20)) {
      return 'Copper - Brass';
    }
    if (isElementHigh(material, 'Sn', 5)) {
      return 'Copper - Bronze';
    }
    return 'Copper - Pure/Other';
  }

  // Magnesium-based alloys
  if (isElementHigh(material, 'Mg', 85)) {
    /* ASTM B275 지정 코드 — A=Al · Z=Zn · K=Zr · E=희토류 · W=Y. AZ 계열은 AZ31(Al 3%)부터라
       문턱 8 은 **AZ80 조차 놓쳤다**(Al 7.8~9.2 의 하한이 7.8). Zn 계열(ZK60·ZE41·EZ33A)은
       버킷 자체가 없어 전부 'Pure/Other' 였다. */
    if (isElementHigh(material, 'Al', 2.5)) {
      return 'Magnesium - Al Alloys';
    }
    if (isElementHigh(material, 'Zn', 2)) {
      return 'Magnesium - Zn/RE Alloys';
    }
    return 'Magnesium - Pure/Other';
  }

  // Fallback to subcategory
  return material.subcategory || 'Other';
}

/**
 * Generate dynamic family descriptions based on composition
 */
export function generateCompositionDescription(material: Material): string {
  const comp = material.composition;
  if (!comp || (Array.isArray(comp) && comp.length === 0)) {
    return 'Composition data not available';
  }

  const elements: string[] = [];

  if (isElementHigh(material, 'Fe', 50)) {
    const cr = getElementConcentration(material, 'Cr');
    const ni = getElementConcentration(material, 'Ni');
    const mo = getElementConcentration(material, 'Mo');

    if (cr && ni && cr.min >= 16 && ni.min >= 8) {
      elements.push(`High-Cr (${cr.min.toFixed(0)}%)`);
      elements.push(`High-Ni (${ni.min.toFixed(0)}%)`);
    }
    if (mo && mo.min >= 2) {
      elements.push(`Mo-enhanced (${mo.min.toFixed(1)}%)`);
    }
  }

  if (isElementHigh(material, 'Al', 85)) {
    const si = getElementConcentration(material, 'Si');
    const mg = getElementConcentration(material, 'Mg');

    if (si && si.min >= 4) {
      elements.push(`Si-rich (${si.min.toFixed(1)}%)`);
    }
    if (mg && mg.min >= 3) {
      elements.push(`Mg-alloyed (${mg.min.toFixed(1)}%)`);
    }
  }

  if (elements.length === 0) {
    elements.push('Multi-element alloy');
  }

  return elements.join(', ');
}

/**
 * Get all materials grouped by composition-based family
 */
export function groupMaterialsByCompositionFamily(materials: Material[]): Record<string, Material[]> {
  const groups: Record<string, Material[]> = {};

  materials.forEach(material => {
    const family = classifyMaterialByComposition(material);
    if (!groups[family]) {
      groups[family] = [];
    }
    groups[family].push(material);
  });

  return groups;
}
