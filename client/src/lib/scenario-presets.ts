/*
 * 사례별 프리셋 + 설계 다이얼로그용 configurator —
 *  - Guide의 "이 사례로 앱 시작" 버튼이 다이얼로그를 열어 사용자 입력을 받음
 *  - 입력 → compute() → Partial<FilterState> override (필요 σy / E / k 등 산출)
 *  - URL `/?p=<key>&f.X=Y` 형태로 Home에 전달, Home이 baseline filters 위에 머지
 *
 * 데이터 무결성: 모든 계산은 표준 재료역학 공식. 사용자 입력값 그대로 사용,
 * 추가 가정 없음. 안전계수·사용 조건은 사용자가 명시.
 */
import type { FilterState } from '@/hooks/useMaterialFilter';

export type ScenarioPreset = {
  label: string;
  filters: Partial<FilterState>;
  viewMode?: 'table' | 'cards' | 'ashby';
  indexHint?: string;
  configurator?: ScenarioConfigurator;
};

export type ConfigField =
  | { id: string; label: string; unit?: string; type: 'number'; default: number; min?: number; max?: number; step?: number; group?: string; help?: string }
  | { id: string; label: string; type: 'select'; default: string; options: { value: string; label: string }[]; group?: string; help?: string };

/** 단면 형상 + 단면 성질 식 (I, Z, A) 계산용 */
export type CrossSection = {
  id: string;
  label: string;
  /** 이 단면을 선택했을 때 추가로 요구되는 치수 필드들 */
  dimFields: ConfigField[];
  /** 단면 2차모멘트 I [mm⁴] */
  I: (v: Record<string, number>) => number;
  /** 단면계수 Z [mm³] */
  Z: (v: Record<string, number>) => number;
  /** 단면적 A [mm²] (참고용, 인장 응력에 사용) */
  A: (v: Record<string, number>) => number;
};

export type ScenarioConfigurator = {
  description: string;
  fields: ConfigField[];
  /** 단면 선택이 필요한 경우 옵션 목록 */
  sections?: CrossSection[];
  /** 입력값 + 선택 단면 ID → 필터 오버라이드 + 산출 요약 */
  compute: (v: Record<string, number | string>, section?: CrossSection) => { filters: Partial<FilterState>; summary: { label: string; value: string }[] };
};

/* ──────────────────────────────────────────────────────────────────────────
 * 공통 단면 (굽힘이 핵심인 사례에서 재사용)
 * ─────────────────────────────────────────────────────────────────────── */
const SHAPE_RECT: CrossSection = {
  id: 'rect', label: '직사각형 b×h',
  dimFields: [
    { id: 'b', label: '폭 b', unit: 'mm', type: 'number', default: 20, min: 1, step: 0.5 },
    { id: 'h', label: '높이 h (굽힘방향)', unit: 'mm', type: 'number', default: 10, min: 1, step: 0.5 },
  ],
  I: (v) => v.b * Math.pow(v.h, 3) / 12,
  Z: (v) => v.b * v.h * v.h / 6,
  A: (v) => v.b * v.h,
};
const SHAPE_CIRC: CrossSection = {
  id: 'circ', label: '원형 (꽉찬) d',
  dimFields: [{ id: 'd', label: '지름 d', unit: 'mm', type: 'number', default: 10, min: 1, step: 0.5 }],
  I: (v) => Math.PI * Math.pow(v.d, 4) / 64,
  Z: (v) => Math.PI * Math.pow(v.d, 3) / 32,
  A: (v) => Math.PI * v.d * v.d / 4,
};
const SHAPE_TUBE: CrossSection = {
  id: 'tube', label: '관 (튜브) D/d',
  dimFields: [
    { id: 'D', label: '외경 D', unit: 'mm', type: 'number', default: 20, min: 1, step: 0.5 },
    { id: 'd', label: '내경 d', unit: 'mm', type: 'number', default: 16, min: 0, step: 0.5 },
  ],
  I: (v) => Math.PI * (Math.pow(v.D, 4) - Math.pow(v.d, 4)) / 64,
  Z: (v) => Math.PI * (Math.pow(v.D, 4) - Math.pow(v.d, 4)) / (32 * v.D),
  A: (v) => Math.PI * (v.D * v.D - v.d * v.d) / 4,
};
const SHAPE_BOX: CrossSection = {
  id: 'box', label: '박스(중공) B,H/b,h',
  dimFields: [
    { id: 'B', label: '외부 폭 B', unit: 'mm', type: 'number', default: 30, min: 1, step: 0.5 },
    { id: 'H', label: '외부 높이 H', unit: 'mm', type: 'number', default: 20, min: 1, step: 0.5 },
    { id: 'bi', label: '내부 폭 b', unit: 'mm', type: 'number', default: 24, min: 0, step: 0.5 },
    { id: 'hi', label: '내부 높이 h', unit: 'mm', type: 'number', default: 14, min: 0, step: 0.5 },
  ],
  I: (v) => (v.B * Math.pow(v.H, 3) - v.bi * Math.pow(v.hi, 3)) / 12,
  Z: (v) => 2 * ((v.B * Math.pow(v.H, 3) - v.bi * Math.pow(v.hi, 3)) / 12) / v.H,
  A: (v) => v.B * v.H - v.bi * v.hi,
};
const SHAPE_SQ: CrossSection = {
  id: 'sq', label: '정사각형 a×a',
  dimFields: [{ id: 'a', label: '한변 a', unit: 'mm', type: 'number', default: 12, min: 1, step: 0.5 }],
  I: (v) => Math.pow(v.a, 4) / 12,
  Z: (v) => Math.pow(v.a, 3) / 6,
  A: (v) => v.a * v.a,
};
const SHAPES_BENDING = [SHAPE_RECT, SHAPE_SQ, SHAPE_CIRC, SHAPE_TUBE, SHAPE_BOX];

const HI = 99999;
const round1 = (x: number) => Math.round(x * 10) / 10;
const round0 = (x: number) => Math.round(x);

export const SCENARIO_PRESETS: Record<string, ScenarioPreset> = {
  bracket: {
    label: '경량 고강성 브래킷 (LPBF)',
    filters: { processes: ['LPBF'] },
    viewMode: 'ashby',
    indexHint: '경량 강성 보 E^½/ρ — 평판이면 E^⅓/ρ',
    configurator: {
      description: '외팔보(브래킷)의 길이·하중·처짐 한계·단면을 입력하면 필요 E와 σy를 자동 계산합니다.',
      fields: [
        { id: 'L', label: '길이 L', unit: 'mm', type: 'number', default: 100, min: 10, step: 5, group: '하중·치수' },
        { id: 'F', label: '끝하중 F', unit: 'N', type: 'number', default: 200, min: 1, step: 10, group: '하중·치수' },
        { id: 'dmax', label: '처짐 한계 δ_max', unit: 'mm', type: 'number', default: 0.5, min: 0.01, step: 0.1, group: '하중·치수' },
        { id: 'SF', label: '안전계수 SF', type: 'number', default: 2, min: 1, step: 0.1, group: '설계 마진' },
      ],
      sections: SHAPES_BENDING,
      compute: (v, section) => {
        const dims: Record<string, number> = {};
        for (const f of section?.dimFields || []) dims[f.id] = Number(v[f.id] ?? (f.type === 'number' ? f.default : 0));
        const I = section ? section.I(dims) : 1; // mm^4
        const Z = section ? section.Z(dims) : 1; // mm^3
        const F = Number(v.F), L = Number(v.L), dmax = Number(v.dmax), SF = Number(v.SF);
        // 처짐: δ = F·L³ / (3·E·I) → 필요 E [MPa] = F·L³ / (3·I·δ); ÷1000 → GPa
        const needE_MPa = (F * Math.pow(L, 3)) / (3 * I * dmax);
        const needE_GPa = needE_MPa / 1000;
        // 굽힘응력: σ_b = M_max/Z = F·L/Z → 필요 σy ≥ SF·σ_b
        const sigmaB = (F * L) / Z;
        const needSy = SF * sigmaB;
        return {
          filters: { yieldStrengthRange: [round0(needSy), HI], modulusRange: [Math.max(1, round1(needE_GPa)), HI], processes: ['LPBF'] },
          summary: [
            { label: '단면 I', value: `${round0(I)} mm⁴` },
            { label: '단면 Z', value: `${round0(Z)} mm³` },
            { label: '필요 E', value: `≥ ${round1(needE_GPa)} GPa` },
            { label: '굽힘응력 σ_b', value: `${round0(sigmaB)} MPa` },
            { label: '필요 σy (SF 포함)', value: `≥ ${round0(needSy)} MPa` },
          ],
        };
      },
    },
  },

  hightemp: {
    label: '고온 부품 (배기·터빈)',
    filters: {},
    viewMode: 'ashby',
    indexHint: '먼저 상세 팝업의 "온도-강도 곡선"으로 사용 온도에서의 σy/UTS 비교',
    configurator: {
      description: '연속 사용 온도와 그 온도에서 필요한 강도를 입력하면 후보를 좁힙니다.',
      fields: [
        { id: 'Top', label: '사용 온도 T_op', unit: '°C', type: 'number', default: 700, min: 20, max: 1200, step: 10 },
        { id: 'margin', label: '온도 마진', unit: '°C', type: 'number', default: 50, min: 0, step: 10, help: '최대사용온도 ≥ T_op + 마진' },
        { id: 'sy_req', label: '필요 σy (사용 온도에서)', unit: 'MPa', type: 'number', default: 200, min: 0, step: 10, help: '상온이 아닌 사용 온도 기준 — 상세의 온도-강도 곡선으로 검증' },
      ],
      compute: (v) => {
        const Top = Number(v.Top), mar = Number(v.margin), sy = Number(v.sy_req);
        return {
          filters: { maxServiceTempRange: [Top + mar, HI], yieldStrengthRange: [sy, HI] },
          summary: [
            { label: '최대사용온도', value: `≥ ${Top + mar} °C` },
            { label: 'σy 요구 (참고, 상온)', value: `≥ ${sy} MPa` },
            { label: '핵심 확인', value: `상세 팝업의 ${Top}°C에서 σy 곡선` },
          ],
        };
      },
    },
  },

  fatigue: {
    label: '회전·진동 부품 (피로)',
    filters: {},
    viewMode: 'ashby',
    indexHint: '강도/무게가 중요하면 σy/ρ — 피로한도는 별도 확인',
    configurator: {
      description: '응력 진폭과 안전계수를 입력하면 필요 피로 한도를 계산합니다. 토크 입력 모드도 가능.',
      fields: [
        { id: 'mode', label: '입력 모드', type: 'select', default: 'direct', options: [{ value: 'direct', label: '응력진폭 직접' }, { value: 'torque', label: '토크·축경' }] },
        { id: 'sigma_a', label: '응력진폭 σ_a', unit: 'MPa', type: 'number', default: 150, min: 0, step: 5, group: '직접 입력' },
        { id: 'T_in', label: '토크 T', unit: 'N·m', type: 'number', default: 50, min: 0, step: 5, group: '토크 입력 (대안)' },
        { id: 'D_in', label: '축 외경 D', unit: 'mm', type: 'number', default: 20, min: 1, step: 0.5, group: '토크 입력 (대안)' },
        { id: 'SF', label: '안전계수 SF', type: 'number', default: 1.5, min: 1, step: 0.1, group: '설계 마진' },
      ],
      compute: (v) => {
        const mode = String(v.mode);
        let sa: number;
        if (mode === 'torque') {
          // 비틀림 전단응력 τ = 16T / (π D³). 등가 응력진폭으로 보수적으로 사용.
          const T = Number(v.T_in) * 1000; // N·m → N·mm
          const D = Number(v.D_in);
          sa = (16 * T) / (Math.PI * Math.pow(D, 3));
        } else {
          sa = Number(v.sigma_a);
        }
        const SF = Number(v.SF);
        const need = sa * SF;
        return {
          filters: { fatigueStrengthRange: [round0(need), HI] },
          summary: [
            { label: '응력진폭 σ_a', value: `${round0(sa)} MPa` + (mode === 'torque' ? ' (T·D 환산)' : '') },
            { label: 'SF', value: `${SF}` },
            { label: '필요 피로한도', value: `≥ ${round0(need)} MPa` },
          ],
        };
      },
    },
  },

  precision: {
    label: '정밀 치수안정 마운트 (저 CTE)',
    filters: {},
    viewMode: 'ashby',
    indexHint: '강성도 필요하면 Modulus 하한 추가',
    configurator: {
      description: '작동 온도 변화·부품 길이·허용 치수변화로 필요 CTE를 산출합니다.',
      fields: [
        { id: 'dT', label: '작동 온도 변화 ΔT', unit: '°C', type: 'number', default: 50, min: 1, step: 5 },
        { id: 'L', label: '부품 길이 L', unit: 'mm', type: 'number', default: 100, min: 1, step: 5 },
        { id: 'dL', label: '허용 치수변화 ΔL', unit: 'μm', type: 'number', default: 10, min: 0.1, step: 0.5, help: '1 mm = 1000 μm' },
        { id: 'E_req', label: '최소 강성 E (선택)', unit: 'GPa', type: 'number', default: 100, min: 0, step: 10 },
      ],
      compute: (v) => {
        const dT = Number(v.dT), L = Number(v.L), dL_um = Number(v.dL), E = Number(v.E_req);
        // ΔL = L · CTE · ΔT → CTE_max = ΔL / (L · ΔT). 단위: ΔL[μm]/L[mm] = ΔL_um/(L*1000) [m/m]
        // CTE [1/K] = (ΔL_um × 1e-6) / (L × 1e-3 × ΔT) = ΔL_um / (L × ΔT × 1e-3)
        // 10⁻⁶/K 로 환산 → ÷ 1e-6
        // 그래서 CTE [10⁻⁶/K] = ΔL_um / (L × ΔT × 1e-3) × 1e6 → 단위 환산은 결국 단순:
        const cteMax = dL_um / (L * dT * 1e-3); // [10⁻⁶/K]
        return {
          filters: { thermalExpansionRange: [0, Math.max(0.1, round1(cteMax))], ...(E > 0 ? { modulusRange: [E, HI] } : {}) },
          summary: [
            { label: '필요 CTE', value: `≤ ${round1(cteMax)} ×10⁻⁶/K` },
            ...(E > 0 ? [{ label: '필요 E', value: `≥ ${E} GPa` }] : []),
          ],
        };
      },
    },
  },

  corrosion: {
    label: '해양·화학 환경 부품',
    filters: {},
    viewMode: 'ashby',
    indexHint: '정량 부식(부식속도·PREN)은 데이터시트로 최종 확인',
    configurator: {
      description: '환경 등급과 강도 요구를 입력하면 후보를 좁힙니다.',
      fields: [
        { id: 'env', label: '환경 심도', type: 'select', default: 'high', options: [{ value: 'mild', label: '경미 — Good 이상' }, { value: 'high', label: '심함(해수) — Excellent 만' }] },
        { id: 'sy', label: '필요 σy', unit: 'MPa', type: 'number', default: 300, min: 0, step: 10 },
      ],
      compute: (v) => {
        const env = String(v.env);
        const sy = Number(v.sy);
        return {
          filters: {
            corrosion: env === 'high' ? ['Excellent'] : ['Excellent', 'Good'],
            yieldStrengthRange: [sy, HI],
          },
          summary: [
            { label: '내식성', value: env === 'high' ? 'Excellent만' : 'Excellent · Good' },
            { label: '필요 σy', value: `≥ ${sy} MPa` },
          ],
        };
      },
    },
  },

  lowcost: {
    label: '저원가 양산 부품',
    filters: {},
    viewMode: 'ashby',
    indexHint: '저원가 강도 σy/Cm — Compare에 Price 열 추가',
    configurator: {
      description: '필요 강도와 단가 상한을 입력하면 가성비 후보를 좁힙니다.',
      fields: [
        { id: 'sy', label: '필요 σy', unit: 'MPa', type: 'number', default: 250, min: 0, step: 10 },
        { id: 'maxPrice', label: '최대 단가', unit: '$/kg', type: 'number', default: 5, min: 0.1, step: 0.5 },
      ],
      compute: (v) => {
        const sy = Number(v.sy), mp = Number(v.maxPrice);
        return {
          filters: { yieldStrengthRange: [sy, HI], pricePerKgRange: [0, mp] },
          summary: [
            { label: '필요 σy', value: `≥ ${sy} MPa` },
            { label: '단가 상한', value: `≤ $${mp}/kg` },
          ],
        };
      },
    },
  },

  spring: {
    label: '스프링·탄성 힌지',
    filters: {},
    viewMode: 'ashby',
    indexHint: '탄성 에너지 저장 σy²/E',
    configurator: {
      description: '필요 강도와 최소 연신율을 입력합니다. 큰 변형이 가능해야 영구변형 없이 복원합니다.',
      fields: [
        { id: 'sy', label: '필요 σy', unit: 'MPa', type: 'number', default: 800, min: 0, step: 50 },
        { id: 'el', label: '최소 연신율', unit: '%', type: 'number', default: 5, min: 0, step: 0.5 },
      ],
      compute: (v) => {
        const sy = Number(v.sy), el = Number(v.el);
        return {
          filters: { yieldStrengthRange: [sy, HI], elongationRange: [el, HI] },
          summary: [
            { label: '필요 σy', value: `≥ ${sy} MPa` },
            { label: '최소 연신율', value: `≥ ${el}%` },
          ],
        };
      },
    },
  },

  heatsink: {
    label: '방열 부품 (히트싱크)',
    filters: {},
    viewMode: 'ashby',
    indexHint: '경량 방열이면 k/ρ',
    configurator: {
      description: '발열량·전열 경로 단면적·길이·허용 온도차를 입력하면 1D 열전도식으로 필요 k를 산출합니다.',
      fields: [
        { id: 'P', label: '발열 P', unit: 'W', type: 'number', default: 100, min: 0.1, step: 5 },
        { id: 'A', label: '단면적 A', unit: 'mm²', type: 'number', default: 500, min: 1, step: 10 },
        { id: 'L', label: '전열 경로 L', unit: 'mm', type: 'number', default: 30, min: 0.1, step: 1 },
        { id: 'dT', label: '허용 ΔT', unit: '°C', type: 'number', default: 20, min: 0.1, step: 1 },
        { id: 'light', label: '경량 우선?', type: 'select', default: 'no', options: [{ value: 'no', label: '아니오 (k만)' }, { value: 'yes', label: '예 (k 우수 + 경량)' }] },
      ],
      compute: (v) => {
        const P = Number(v.P), A = Number(v.A), L = Number(v.L), dT = Number(v.dT);
        // q = k · A · ΔT / L → k = q·L / (A·ΔT). 단위: P[W]·L[m] / (A[m²]·ΔT[K])
        // = P·(L/1000) / ((A/1e6)·ΔT) = (P·L·1000)/(A·ΔT) [W/m·K]
        const k = (P * L * 1000) / (A * dT);
        const light = String(v.light) === 'yes';
        return {
          filters: { thermalConductivityRange: [round0(k), HI], ...(light ? { densityRange: [0, 8] } : {}) },
          summary: [
            { label: '필요 k', value: `≥ ${round0(k)} W/m·K` },
            ...(light ? [{ label: '경량 조건', value: '밀도 ≤ 8 g/cm³' }] : []),
          ],
        };
      },
    },
  },
};

export type ScenarioKey = keyof typeof SCENARIO_PRESETS;

/* ──────────────────────────────────────────────────────────────────────────
 * URL 쿼리 파라미터 직렬화 — 다이얼로그가 계산한 filters 오버라이드를
 * `?p=KEY&f.XYZ=...` 형태로 인코딩, Home이 디코드해 baseline 위에 머지.
 *
 * 매핑: keyof FilterState의 카멜케이스 → 짧은 ID
 *  yieldStrengthRange  → ysm/yxx
 *  modulusRange        → mdm/mdx
 *  fatigueStrengthRange→ fsm/fsx
 *  maxServiceTempRange → tmm/tmx
 *  thermalExpansionRange → ctem/ctex
 *  thermalConductivityRange → tcm/tcx
 *  elongationRange     → elm/elx
 *  pricePerKgRange     → prm/prx
 *  densityRange        → dnm/dnx
 *  processes           → proc (comma-sep)
 *  corrosion           → corr (comma-sep)
 * ─────────────────────────────────────────────────────────────────────── */
const RANGE_MAP: Record<string, [string, string]> = {
  yieldStrengthRange: ['ysm', 'ysx'], modulusRange: ['mdm', 'mdx'], fatigueStrengthRange: ['fsm', 'fsx'],
  maxServiceTempRange: ['tmm', 'tmx'], thermalExpansionRange: ['ctem', 'ctex'], thermalConductivityRange: ['tcm', 'tcx'],
  elongationRange: ['elm', 'elx'], pricePerKgRange: ['prm', 'prx'], densityRange: ['dnm', 'dnx'],
};
const LIST_MAP: Record<string, string> = { processes: 'proc', corrosion: 'corr', categories: 'cat', subcategories: 'sub' };

export function encodeFiltersToParams(f: Partial<FilterState>): string {
  const p = new URLSearchParams();
  for (const [k, [m, x]] of Object.entries(RANGE_MAP)) {
    const r = (f as any)[k] as [number, number] | null | undefined;
    if (Array.isArray(r)) { p.set(m, String(r[0])); p.set(x, String(r[1])); }
  }
  for (const [k, qk] of Object.entries(LIST_MAP)) {
    const arr = (f as any)[k] as string[] | undefined;
    if (Array.isArray(arr) && arr.length) p.set(qk, arr.join(','));
  }
  return p.toString();
}

export function decodeFiltersFromParams(qs: URLSearchParams): Partial<FilterState> {
  const out: Partial<FilterState> = {};
  for (const [k, [m, x]] of Object.entries(RANGE_MAP)) {
    if (qs.has(m) && qs.has(x)) (out as any)[k] = [Number(qs.get(m)), Number(qs.get(x))];
  }
  for (const [k, qk] of Object.entries(LIST_MAP)) {
    const raw = qs.get(qk);
    if (raw) (out as any)[k] = raw.split(',').filter(Boolean);
  }
  return out;
}
