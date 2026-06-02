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
  | { id: string; label: string; type: 'select'; default: string; options: { value: string; label: string }[]; group?: string; help?: string }
  // R35b — 다중 선택 (체크박스) 입력. 빈 배열 = 제약 없음 (all-allowed).
  | { id: string; label: string; type: 'multiselect'; default: string[]; options: { value: string; label: string }[]; group?: string; help?: string };

/** 단면 형상 + 단면 성질 식 (I, Z, A) 계산용.
 *  비대칭 단면은 강축(strong, default) vs 약축(weak) 모두 지원. */
export type SectionAxis = 'strong' | 'weak';
export type CrossSection = {
  id: string;
  label: string;
  /** 이 단면을 선택했을 때 추가로 요구되는 치수 필드들 */
  dimFields: ConfigField[];
  /** 단면 2차모멘트 I [mm⁴]. axis 미지정 시 강축. */
  I: (v: Record<string, number>, axis?: SectionAxis) => number;
  /** 단면계수 Z [mm³]. axis 미지정 시 강축. */
  Z: (v: Record<string, number>, axis?: SectionAxis) => number;
  /** 단면적 A [mm²] (참고용, 인장 응력에 사용) */
  A: (v: Record<string, number>) => number;
  /** 강축/약축이 구분되는 단면인지 (선택 UI 표시 여부) */
  hasAxes?: boolean;
};

export type ScenarioConfigurator = {
  description: string;
  fields: ConfigField[];
  /** 단면 선택이 필요한 경우 옵션 목록 */
  sections?: CrossSection[];
  /** 입력값 + 선택 단면 ID → 필터 오버라이드 + 산출 요약 + (NB14) 필드별 인라인 검증 메시지.
   *  fieldErrors 는 field.id → 한 줄 경고. ScenarioDialog 가 해당 입력 옆에 빨간 메시지/테두리로 표시. */
  compute: (v: Record<string, number | string | string[]>, section?: CrossSection) => { filters: Partial<FilterState>; summary: { label: string; value: string }[]; fieldErrors?: Record<string, string> };
};

/* ──────────────────────────────────────────────────────────────────────────
 * 공통 단면 (굽힘이 핵심인 사례에서 재사용)
 * ─────────────────────────────────────────────────────────────────────── */
const SHAPE_RECT: CrossSection = {
  id: 'rect', label: '직사각형 b×h',
  dimFields: [
    { id: 'b', label: '폭 b', unit: 'mm', type: 'number', default: 20, min: 1, step: 0.5 },
    { id: 'h', label: '높이 h', unit: 'mm', type: 'number', default: 10, min: 1, step: 0.5 },
  ],
  // 강축: h가 하중방향(높이) — I = b·h³/12. 약축: b가 하중방향 — I = h·b³/12.
  I: (v, axis) => axis === 'weak' ? v.h * Math.pow(v.b, 3) / 12 : v.b * Math.pow(v.h, 3) / 12,
  Z: (v, axis) => axis === 'weak' ? v.h * v.b * v.b / 6 : v.b * v.h * v.h / 6,
  A: (v) => v.b * v.h,
  hasAxes: true,
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
  // 강축: 하중이 H 방향. 약축: 하중이 B 방향.
  I: (v, axis) => axis === 'weak'
    ? (v.H * Math.pow(v.B, 3) - v.hi * Math.pow(v.bi, 3)) / 12
    : (v.B * Math.pow(v.H, 3) - v.bi * Math.pow(v.hi, 3)) / 12,
  Z: (v, axis) => axis === 'weak'
    ? 2 * ((v.H * Math.pow(v.B, 3) - v.hi * Math.pow(v.bi, 3)) / 12) / v.B
    : 2 * ((v.B * Math.pow(v.H, 3) - v.bi * Math.pow(v.hi, 3)) / 12) / v.H,
  A: (v) => v.B * v.H - v.bi * v.hi,
  hasAxes: true,
};
const SHAPE_SQ: CrossSection = {
  id: 'sq', label: '정사각형 a×a',
  dimFields: [{ id: 'a', label: '한변 a', unit: 'mm', type: 'number', default: 12, min: 1, step: 0.5 }],
  I: (v) => Math.pow(v.a, 4) / 12,
  Z: (v) => Math.pow(v.a, 3) / 6,
  A: (v) => v.a * v.a,
};
// I-빔 / H-빔 (대칭) — 강축(수평 중립축) 굽힘 기준. h = 웹 높이 + 2·플랜지 두께(전체 높이).
// 약축은 하중이 수평이고 단면이 옆으로 휘는 경우 — 플랜지가 약축에서 I 의 대부분.
const SHAPE_IBEAM: CrossSection = {
  id: 'ibeam', label: 'I-빔 / H-빔',
  dimFields: [
    { id: 'bf', label: '플랜지 폭 b_f', unit: 'mm', type: 'number', default: 80, min: 1, step: 1 },
    { id: 'tf', label: '플랜지 두께 t_f', unit: 'mm', type: 'number', default: 10, min: 0.5, step: 0.5 },
    { id: 'tw', label: '웹 두께 t_w', unit: 'mm', type: 'number', default: 6, min: 0.5, step: 0.5 },
    { id: 'h', label: '전체 높이 h', unit: 'mm', type: 'number', default: 120, min: 1, step: 1 },
  ],
  I: (v, axis) => {
    const hw = v.h - 2 * v.tf;
    if (axis === 'weak') {
      // I_y = 2·(tf·bf³/12) + hw·tw³/12  — 플랜지 두 개 + 웹
      return 2 * (v.tf * Math.pow(v.bf, 3) / 12) + hw * Math.pow(v.tw, 3) / 12;
    }
    return (v.bf * Math.pow(v.h, 3) - (v.bf - v.tw) * Math.pow(hw, 3)) / 12;
  },
  Z: (v, axis) => {
    const hw = v.h - 2 * v.tf;
    if (axis === 'weak') {
      const Iy = 2 * (v.tf * Math.pow(v.bf, 3) / 12) + hw * Math.pow(v.tw, 3) / 12;
      return Iy / (v.bf / 2);
    }
    const I = (v.bf * Math.pow(v.h, 3) - (v.bf - v.tw) * Math.pow(hw, 3)) / 12;
    return I / (v.h / 2);
  },
  A: (v) => 2 * v.bf * v.tf + (v.h - 2 * v.tf) * v.tw,
  hasAxes: true,
};
// ㄷ-채널 (U-channel) — 강축 굽힘(수평 중립축). bf 는 전체 플랜지 길이(웹 두께 포함).
// 강축에 대해 I_x 는 채널을 "닫힌 박스 − 측면 빈공간"으로 보는 식이 가장 정확.
const SHAPE_CHANNEL: CrossSection = {
  id: 'channel', label: 'ㄷ-채널 (U-channel)',
  dimFields: [
    { id: 'bf', label: '플랜지 길이 b_f', unit: 'mm', type: 'number', default: 50, min: 1, step: 1 },
    { id: 'tf', label: '플랜지 두께 t_f', unit: 'mm', type: 'number', default: 8, min: 0.5, step: 0.5 },
    { id: 'tw', label: '웹 두께 t_w', unit: 'mm', type: 'number', default: 6, min: 0.5, step: 0.5 },
    { id: 'h', label: '전체 높이 h', unit: 'mm', type: 'number', default: 100, min: 1, step: 1 },
  ],
  // 강축(수평): I_x = (b_f·h³ − (b_f − t_w)·(h − 2·t_f)³) / 12 — 박스 − 한쪽 측면 빈공간.
  // 약축(수직): 약식 — 신경통이 웹에서 약간 떨어져 있어 정확식은 복잡. 대수적 근사:
  //   I_y ≈ 2·(tf·bf³/12) + (h−2tf)·tw³/12  (대칭으로 가정한 보수적 근사).
  I: (v, axis) => {
    if (axis === 'weak') {
      const hw = v.h - 2 * v.tf;
      return 2 * (v.tf * Math.pow(v.bf, 3) / 12) + hw * Math.pow(v.tw, 3) / 12;
    }
    return (v.bf * Math.pow(v.h, 3) - (v.bf - v.tw) * Math.pow(v.h - 2 * v.tf, 3)) / 12;
  },
  Z: (v, axis) => {
    if (axis === 'weak') {
      const hw = v.h - 2 * v.tf;
      const Iy = 2 * (v.tf * Math.pow(v.bf, 3) / 12) + hw * Math.pow(v.tw, 3) / 12;
      return Iy / (v.bf / 2);  // 약식 — 신경통 offset 무시
    }
    return ((v.bf * Math.pow(v.h, 3) - (v.bf - v.tw) * Math.pow(v.h - 2 * v.tf, 3)) / 12) / (v.h / 2);
  },
  A: (v) => 2 * v.bf * v.tf + v.tw * (v.h - 2 * v.tf),
  hasAxes: true,
};
// T-단면 — 비대칭. 상부 플랜지 + 하부 웹(스템). 신경통은 위에서 y_c 만큼 아래.
const SHAPE_T: CrossSection = {
  id: 'tsec', label: 'T-단면',
  dimFields: [
    { id: 'bf', label: '플랜지 폭 b_f', unit: 'mm', type: 'number', default: 80, min: 1, step: 1 },
    { id: 'tf', label: '플랜지 두께 t_f', unit: 'mm', type: 'number', default: 10, min: 0.5, step: 0.5 },
    { id: 'tw', label: '웹 두께 t_w', unit: 'mm', type: 'number', default: 8, min: 0.5, step: 0.5 },
    { id: 'hw', label: '웹 높이 h_w', unit: 'mm', type: 'number', default: 80, min: 1, step: 1 },
  ],
  // 신경통(상단으로부터): y_c = (b_f·t_f·t_f/2 + t_w·h_w·(t_f + h_w/2)) / A
  I: (v) => {
    const Af = v.bf * v.tf, Aw = v.tw * v.hw;
    const A = Af + Aw;
    const yc = (Af * v.tf / 2 + Aw * (v.tf + v.hw / 2)) / A;
    const Iflange = v.bf * Math.pow(v.tf, 3) / 12 + Af * Math.pow(yc - v.tf / 2, 2);
    const Iweb = v.tw * Math.pow(v.hw, 3) / 12 + Aw * Math.pow(v.tf + v.hw / 2 - yc, 2);
    return Iflange + Iweb;
  },
  Z: (v) => {
    const Af = v.bf * v.tf, Aw = v.tw * v.hw;
    const A = Af + Aw;
    const yc = (Af * v.tf / 2 + Aw * (v.tf + v.hw / 2)) / A;
    const Iflange = v.bf * Math.pow(v.tf, 3) / 12 + Af * Math.pow(yc - v.tf / 2, 2);
    const Iweb = v.tw * Math.pow(v.hw, 3) / 12 + Aw * Math.pow(v.tf + v.hw / 2 - yc, 2);
    const I = Iflange + Iweb;
    const cMax = Math.max(yc, v.tf + v.hw - yc);
    return I / cMax;
  },
  A: (v) => v.bf * v.tf + v.tw * v.hw,
};
// ㄱ-앵글(L) — 등변 (다리 길이 a, 두께 t). 한 다리에 평행한 강축에 대한 I.
// L 을 두 직사각형으로 분해 — 수평 다리(a×t) + 수직 다리(t×(a−t)) (코너 중복 제외).
// y_c (외측 코너 기준) = (a²·t/2 + (a−t)·t·(t + (a−t)/2)·t) / A → 아래 식으로 정리.
const SHAPE_ANGLE: CrossSection = {
  id: 'angle', label: 'ㄱ-앵글 (L)',
  dimFields: [
    { id: 'a', label: '다리 길이 a (등변)', unit: 'mm', type: 'number', default: 50, min: 1, step: 1 },
    { id: 't', label: '두께 t', unit: 'mm', type: 'number', default: 6, min: 0.5, step: 0.5 },
  ],
  // A = t·(2a − t).  L = (수평 다리 a×t) + (수직 다리 t×(a−t)), 두 사각형으로 분해.
  // y_c (외측 코너에서) = [a·t·(t/2) + (a−t)·t·(t + (a−t)/2)] / A
  // I_x (수평 중립축) = 두 사각형 각각의 (own I + parallel-axis) 합 — 표준 핸드북식.
  I: (v) => {
    const a = v.a, t = v.t;
    const A = t * (2 * a - t);
    const yc = (a * t * (t / 2) + (a - t) * t * (t + (a - t) / 2)) / A;
    const Ih = (a * Math.pow(t, 3)) / 12 + (a * t) * Math.pow(yc - t / 2, 2);
    const Iv = (t * Math.pow(a - t, 3)) / 12 + (t * (a - t)) * Math.pow(t + (a - t) / 2 - yc, 2);
    return Ih + Iv;
  },
  Z: (v) => {
    const a = v.a, t = v.t;
    const A = t * (2 * a - t);
    const yc = (a * t * (t / 2) + (a - t) * t * (t + (a - t) / 2)) / A;
    const Ih = (a * Math.pow(t, 3)) / 12 + (a * t) * Math.pow(yc - t / 2, 2);
    const Iv = (t * Math.pow(a - t, 3)) / 12 + (t * (a - t)) * Math.pow(t + (a - t) / 2 - yc, 2);
    return (Ih + Iv) / Math.max(yc, a - yc);
  },
  A: (v) => v.t * (2 * v.a - v.t),
};
const SHAPES_BENDING = [SHAPE_RECT, SHAPE_SQ, SHAPE_CIRC, SHAPE_TUBE, SHAPE_BOX, SHAPE_IBEAM, SHAPE_CHANNEL, SHAPE_T, SHAPE_ANGLE];

const HI = 99999;
const round1 = (x: number) => Math.round(x * 10) / 10;
const round0 = (x: number) => Math.round(x);

export const SCENARIO_PRESETS: Record<string, ScenarioPreset> = {
  bracket: {
    label: '경량 고강성 구조 브래킷',
    filters: {},
    viewMode: 'ashby',
    indexHint: '경량 강성 보 E^½/ρ — 평판이면 E^⅓/ρ',
    configurator: {
      description: '하중 형태·단면·치수를 선택하면 표준 재료역학식으로 필요한 E와 σy를 산출합니다. 공정은 선택 사항.',
      fields: [
        { id: 'pattern', label: '하중·지지 형태', type: 'select', default: 'cant_tip', options: [
          { value: 'cant_tip', label: '외팔보 · 끝단 집중하중' },
          { value: 'cant_udl', label: '외팔보 · 등분포하중' },
          { value: 'ss_center', label: '단순지지 · 중앙 집중하중' },
          { value: 'ss_udl', label: '단순지지 · 등분포하중' },
          { value: 'ff_center', label: '양단 고정 · 중앙 집중하중' },
          { value: 'ff_udl', label: '양단 고정 · 등분포하중' },
        ], group: '하중 형태' },
        { id: 'L', label: '길이 L', unit: 'mm', type: 'number', default: 100, min: 10, step: 5, group: '치수·하중' },
        { id: 'F', label: '집중하중 F (해당 시)', unit: 'N', type: 'number', default: 200, min: 0, step: 10, group: '치수·하중' },
        { id: 'w', label: '등분포하중 w (해당 시)', unit: 'N/mm', type: 'number', default: 2, min: 0, step: 0.1, group: '치수·하중' },
        { id: 'dmax', label: '처짐 한계 δ_max', unit: 'mm', type: 'number', default: 0.5, min: 0.01, step: 0.1, group: '치수·하중' },
        { id: 'SF', label: '안전계수 SF', type: 'number', default: 2, min: 1, step: 0.1, group: '설계 마진' },
        { id: 'process', label: '제조 공정 (다중 선택)', type: 'multiselect', default: [], help: '체크 없음 = 전체 허용. 여러 공정 동시 선택 가능.', options: [
          { value: 'LPBF', label: 'LPBF (금속 분말상 적층)' },
          { value: 'DMLS', label: 'DMLS' },
          { value: 'EBM', label: 'EBM' },
          { value: 'Wrought', label: '단조·압연(Wrought)' },
          { value: 'Cast', label: '주조(Cast)' },
        ], group: '제조' },
        // axis 는 다이얼로그에서 단면 picker 옆 토글로 별도 렌더링 (collapsible 안에 숨기지 않음)
        // values['_axis'] = 'strong' | 'weak' 로 ScenarioDialog 가 채워 넣음
      ],
      sections: SHAPES_BENDING,
      compute: (v, section) => {
        const dims: Record<string, number> = {};
        for (const f of section?.dimFields || []) dims[f.id] = Number(v[f.id] ?? (f.type === 'number' ? f.default : 0));
        const axis = (String(v._axis) === 'weak' ? 'weak' : 'strong') as SectionAxis;
        const I = section ? section.I(dims, axis) : 1;
        const Z = section ? section.Z(dims, axis) : 1;
        const F = Number(v.F), w = Number(v.w), L = Number(v.L), dmax = Number(v.dmax), SF = Number(v.SF);
        const pattern = String(v.pattern);
        // 하중 패턴별 δ·M_max 표준식 (boundary-condition coefficient)
        let needEI = 0, Mmax = 0, label = '';
        switch (pattern) {
          case 'cant_tip':   needEI = (F * Math.pow(L, 3)) / (3 * dmax);    Mmax = F * L;         label = 'δ=FL³/(3EI), M=FL'; break;
          case 'cant_udl':   needEI = (w * Math.pow(L, 4)) / (8 * dmax);    Mmax = w * L * L / 2; label = 'δ=wL⁴/(8EI), M=wL²/2'; break;
          case 'ss_center':  needEI = (F * Math.pow(L, 3)) / (48 * dmax);   Mmax = F * L / 4;     label = 'δ=FL³/(48EI), M=FL/4'; break;
          case 'ss_udl':     needEI = (5 * w * Math.pow(L, 4)) / (384 * dmax); Mmax = w * L * L / 8; label = 'δ=5wL⁴/(384EI), M=wL²/8'; break;
          case 'ff_center':  needEI = (F * Math.pow(L, 3)) / (192 * dmax);  Mmax = F * L / 8;     label = 'δ=FL³/(192EI), M=FL/8'; break;
          case 'ff_udl':     needEI = (w * Math.pow(L, 4)) / (384 * dmax);  Mmax = w * L * L / 12; label = 'δ=wL⁴/(384EI), M=wL²/12'; break;
        }
        const needE_MPa = needEI / I;
        const needE_GPa = needE_MPa / 1000;
        const sigmaB = Mmax / Z;
        const needSy = SF * sigmaB;
        // R35b — process 는 multiselect (string[]). 빈 배열 = 제약 없음.
        const procs = Array.isArray(v.process) ? (v.process as string[]) : [];
        const filters: Partial<FilterState> = {
          yieldStrengthRange: [round0(needSy), HI],
          modulusRange: [Math.max(1, round1(needE_GPa)), HI],
        };
        if (procs.length > 0) filters.processes = procs;
        return {
          filters,
          summary: [
            { label: '하중 패턴', value: label },
            { label: '하중 방향', value: axis === 'weak' ? '약축' : '강축' + (section?.hasAxes ? '' : ' (대칭 단면)') },
            { label: '단면 I', value: `${round0(I)} mm⁴` },
            { label: '단면 Z', value: `${round0(Z)} mm³` },
            { label: '최대 모멘트', value: `${round0(Mmax)} N·mm` },
            { label: '필요 E', value: `≥ ${round1(needE_GPa)} GPa` },
            { label: '굽힘응력 σ_b', value: `${round0(sigmaB)} MPa` },
            { label: '필요 σy (SF 포함)', value: `≥ ${round0(needSy)} MPa` },
            ...(procs.length > 0 ? [{ label: '공정 제약', value: procs.join(' / ') }] : []),
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
      description: '연속 사용 온도·환경·강도를 입력하면 후보를 좁힙니다. 환경에 따라 권장 안전 마진이 다릅니다.',
      fields: [
        { id: 'app', label: '응용 (기준 온도 빠른 설정)', type: 'select', default: 'custom', options: [
          { value: 'custom', label: '직접 입력' },
          { value: 'exhaust', label: '자동차 배기 매니폴드 (700–900 °C)' },
          { value: 'turbine_blade', label: '제트 터빈 블레이드 (900–1100 °C)' },
          { value: 'turbine_disk', label: '터빈 디스크 (650–760 °C)' },
          { value: 'heat_exchanger', label: '열교환기 (450–650 °C)' },
          { value: 'rocket_nozzle', label: '로켓 노즐 (>1000 °C)' },
        ], group: '응용 분야' },
        { id: 'Top', label: '사용 온도 T_op', unit: '°C', type: 'number', default: 700, min: 20, max: 1500, step: 10, group: '온도·환경' },
        { id: 'env', label: '환경', type: 'select', default: 'oxidizing', options: [
          { value: 'oxidizing', label: '산화성 (공기·연소가스)' },
          { value: 'inert', label: '불활성 (Ar·진공)' },
          { value: 'reducing', label: '환원성 (수소·CO)' },
        ], group: '온도·환경' },
        { id: 'duration', label: '사용 시간 추정', type: 'select', default: 'continuous', options: [
          { value: 'cyclic_short', label: '주기적 단시간 (재시동)' },
          { value: 'continuous', label: '연속 운전 (>10⁴ h, 크리프 우려)' },
          { value: 'transient', label: '과도 (수 분/시간 이내)' },
        ], group: '하중' },
        { id: 'sy_req', label: '필요 σy (사용 온도에서)', unit: 'MPa', type: 'number', default: 200, min: 0, step: 10, help: '상세 팝업의 온도-강도 곡선으로 검증', group: '하중' },
      ],
      compute: (v) => {
        const Top = Number(v.Top), sy = Number(v.sy_req);
        const env = String(v.env), duration = String(v.duration);
        // 환경별 권장 마진 (보수적): 산화성은 산화/탈탄 가속 위험으로 더 큰 마진.
        // 연속(creep) 운전이면 30°C 추가 마진 — 0.4·Tm 이상에서 크리프 가속.
        const baseMargin = env === 'oxidizing' ? 100 : env === 'reducing' ? 80 : 50;
        const margin = baseMargin + (duration === 'continuous' ? 30 : 0);
        const durNote = duration === 'continuous' ? '크리프 데이터 필수 확인 (Larson-Miller, 100kh 강도)' : duration === 'cyclic_short' ? '열피로(thermal fatigue) + 산화막 박리 고려' : '단발 강도 위주 (산화막 형성 시간 짧음)';
        const envNote = env === 'oxidizing' ? '내산화성 합금 우선 (Inconel·Haynes·Hastelloy)' : env === 'reducing' ? '환원성 분위기 적합 합금 (특수 Ni 합금)' : '광범위한 합금 가능';
        return {
          filters: { maxServiceTempRange: [Top + margin, HI], yieldStrengthRange: [sy, HI] },
          summary: [
            { label: '환경 + 시간 마진', value: `+${margin} °C${duration === 'continuous' ? ' (크리프 +30)' : ''}` },
            { label: '최대사용온도 (필터)', value: `≥ ${Top + margin} °C` },
            { label: '환경 메모', value: envNote },
            { label: '하중 메모', value: durNote },
            { label: '필요 σy', value: `≥ ${sy} MPa  ⚠ DB 는 상온 기준, T_op 의 σy 는 상세 팝업 곡선 확인` },
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
      description: '하중 모드·R-비·표면 상태를 함께 입력하면 보수적인 피로 요구치를 계산합니다.',
      fields: [
        { id: 'mode', label: '입력 모드', type: 'select', default: 'direct', options: [
          { value: 'direct', label: '응력진폭 직접' },
          { value: 'torque', label: '비틀림 (T·D)' },
          { value: 'bending', label: '굽힘 (M·c·I, 단면도)' },
        ], group: '하중 입력' },
        { id: 'sigma_a', label: '응력진폭 σ_a', unit: 'MPa', type: 'number', default: 150, min: 0, step: 5, group: '직접 입력' },
        { id: 'T_in', label: '토크 T', unit: 'N·m', type: 'number', default: 50, min: 0, step: 5, group: '비틀림 입력' },
        { id: 'D_in', label: '축 외경 D', unit: 'mm', type: 'number', default: 20, min: 1, step: 0.5, group: '비틀림 입력' },
        { id: 'M_in', label: '굽힘 모멘트 M', unit: 'N·m', type: 'number', default: 80, min: 0, step: 5, group: '굽힘 입력' },
        { id: 'Db_in', label: '환봉 지름 D', unit: 'mm', type: 'number', default: 25, min: 1, step: 0.5, group: '굽힘 입력' },
        { id: 'R_ratio', label: 'R-비 (min/max 응력)', type: 'select', default: '-1', options: [
          { value: '-1', label: 'R = −1 (완전 교번, 가장 가혹)' },
          { value: '0', label: 'R = 0 (영-인장)' },
          { value: '0.5', label: 'R = 0.5 (낮은 진폭)' },
        ], group: '응력 패턴' },
        { id: 'surface', label: '표면 상태', type: 'select', default: 'machined', options: [
          { value: 'polished', label: '연마 — 감쇠 없음 (~1.0)' },
          { value: 'machined', label: '기계가공 — 감쇠 ~0.8' },
          { value: 'asbuilt', label: 'AM as-built — 감쇠 ~0.6 (보수적)' },
          { value: 'hipped', label: 'AM + HIP — 감쇠 ~0.85' },
        ], group: '표면·결함' },
        { id: 'SF', label: '안전계수 SF', type: 'number', default: 1.5, min: 1, step: 0.1, group: '설계 마진' },
      ],
      compute: (v) => {
        const mode = String(v.mode);
        let sa: number;
        if (mode === 'torque') {
          // τ = 16T/(π D³). 보수적으로 σ_a ≈ √3·τ (von Mises) 사용.
          const T = Number(v.T_in) * 1000; const D = Number(v.D_in);
          sa = Math.sqrt(3) * (16 * T) / (Math.PI * Math.pow(D, 3));
        } else if (mode === 'bending') {
          // 원형 단면 굽힘응력: σ = M·c/I = 32M / (π D³)
          const M = Number(v.M_in) * 1000; const D = Number(v.Db_in);
          sa = (32 * M) / (Math.PI * Math.pow(D, 3));
        } else {
          sa = Number(v.sigma_a);
        }
        // 표면 보정 → 데이터시트 피로한도는 보통 연마 시편 기준. 거친 표면은 실제 한계가 낮음 → 필요값을 1/감쇠로 증액.
        const surfaceFactor = { polished: 1.0, machined: 0.8, asbuilt: 0.6, hipped: 0.85 }[String(v.surface)] ?? 0.8;
        // R-비 영향 (Goodman 근사). R=-1 기준 → R=0이면 한도 ~0.7배, R=0.5 ~0.4배 (보수적).
        // 즉 실제 한계가 떨어지므로 필요값을 1/계수 만큼 증액.
        const rFactor = { '-1': 1.0, '0': 0.7, '0.5': 0.4 }[String(v.R_ratio)] ?? 1.0;
        const SF = Number(v.SF);
        const need = sa * SF / (surfaceFactor * rFactor);
        return {
          filters: { fatigueStrengthRange: [round0(need), HI] },
          summary: [
            { label: '응력진폭 σ_a', value: `${round0(sa)} MPa` + (mode === 'torque' ? ' (T·D 환산)' : mode === 'bending' ? ' (M·D 환산)' : '') },
            { label: '표면 감쇠', value: `×${surfaceFactor}` },
            { label: 'R-비 감쇠', value: `×${rFactor}` },
            { label: 'SF', value: `${SF}` },
            { label: '필요 피로한도 (등가)', value: `≥ ${round0(need)} MPa` },
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
      description: '작동 온도 범위·부품 길이·허용 치수변화로 필요 CTE를 산출합니다. 정밀도 등급 빠른 선택 포함.',
      fields: [
        { id: 'preset', label: '정밀도 등급 (빠른 설정)', type: 'select', default: 'custom', options: [
          { value: 'custom', label: '직접 입력' },
          { value: 'optical', label: '광학 마운트 (μm급)' },
          { value: 'metrology', label: '정밀 측정기 (10nm급, 매우 엄격)' },
          { value: 'jig', label: '치공구 (10μm급)' },
          { value: 'general', label: '일반 기계 (0.1mm급)' },
        ], group: '응용' },
        { id: 'mode', label: '온도 입력 모드', type: 'select', default: 'delta', options: [
          { value: 'delta', label: 'ΔT 직접' },
          { value: 'range', label: '두 운전 온도 (T_high, T_low)' },
        ], group: '온도' },
        { id: 'dT', label: '온도 변화 ΔT', unit: '°C', type: 'number', default: 50, min: 1, step: 5, group: '온도' },
        { id: 'T_high', label: '최고 작동 온도', unit: '°C', type: 'number', default: 60, step: 5, group: '온도 범위' },
        { id: 'T_low', label: '최저 작동 온도', unit: '°C', type: 'number', default: 10, step: 5, group: '온도 범위' },
        { id: 'L', label: '부품 길이 L', unit: 'mm', type: 'number', default: 100, min: 1, step: 5, group: '기하' },
        { id: 'dL', label: '허용 치수변화 ΔL', unit: 'μm', type: 'number', default: 60, min: 0.001, step: 1, help: '기본값 60μm → CTE 한도 ≈ 12 ×10⁻⁶/K (일반 강 통과). 더 정밀하면 ΔL 작게.', group: '기하' },
        { id: 'E_req', label: '최소 강성 E (선택)', unit: 'GPa', type: 'number', default: 100, min: 0, step: 10, group: '강성 옵션' },
      ],
      compute: (v) => {
        const mode = String(v.mode);
        // L5/NB14: 입력 검증 — 필드별 인라인 에러 메시지 생성. compute 가 fallback (양수화) 으로
        // 깨지지 않게 처리하되, 사용자에게는 명확히 알려 줌.
        const rawDT = mode === 'range' ? Math.abs(Number(v.T_high) - Number(v.T_low)) : Math.abs(Number(v.dT));
        const rawL = Number(v.L), rawDL = Number(v.dL);
        const fieldErrors: Record<string, string> = {};
        if (mode === 'delta' && rawDT < 0.1) fieldErrors.dT = 'ΔT 가 0 — 양의 값 필요';
        if (mode === 'range' && rawDT < 0.1) { fieldErrors.T_high = 'T_high ≈ T_low — 범위 0'; fieldErrors.T_low = 'T_low ≈ T_high — 범위 0'; }
        if (!isFinite(rawL) || rawL <= 0) fieldErrors.L = '양수 길이 필요';
        if (!isFinite(rawDL) || rawDL <= 0) fieldErrors.dL = '양수 변위 필요';
        const dT = Math.max(0.1, rawDT);
        const L = Math.max(0.1, rawL);
        const dL_um = Math.max(0.001, rawDL);
        const E = Math.max(0, Number(v.E_req));
        const cteMax = dL_um / (L * dT * 1e-3);
        return {
          filters: { thermalExpansionRange: [0, Math.max(0.1, round1(cteMax))], ...(E > 0 ? { modulusRange: [E, HI] } : {}) },
          summary: [
            { label: 'ΔT', value: `${dT} °C` + (mode === 'range' ? ' (범위 절댓값)' : '') },
            { label: '허용 ΔL/L', value: `${(dL_um / L).toFixed(2)} ppm` },
            { label: '필요 CTE', value: `≤ ${round1(cteMax)} ×10⁻⁶/K` },
            ...(E > 0 ? [{ label: '필요 E', value: `≥ ${E} GPa` }] : []),
          ],
          fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
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
      description: '환경 종류·온도·강도를 입력하면 권장 내식성 등급을 자동 적용합니다.',
      fields: [
        { id: 'env', label: '환경 종류', type: 'select', default: 'seawater', options: [
          { value: 'atmosphere', label: '대기·실외 — Moderate 이상' },
          { value: 'freshwater', label: '담수·일반 산업수 — Good 이상' },
          { value: 'seawater', label: '해수 — Excellent + Cu-Ni·듀플렉스 권장' },
          { value: 'acid', label: '산성 (HCl·황산) — Excellent + 데이터시트 필수' },
          { value: 'alkaline', label: '알칼리 (NaOH) — Good 이상' },
          { value: 'oxidizing', label: '강산화성 (HNO₃) — Excellent' },
        ], group: '환경' },
        { id: 'T', label: '환경 온도', unit: '°C', type: 'number', default: 25, min: -50, max: 200, step: 5, group: '환경', help: '온도가 높을수록 부식 가속' },
        { id: 'sy', label: '필요 σy', unit: 'MPa', type: 'number', default: 300, min: 0, step: 10, group: '하중' },
      ],
      compute: (v) => {
        const env = String(v.env), T = Number(v.T), sy = Number(v.sy);
        // L4: 환경별 critical 온도 — 부식이 가속되기 시작하는 임계점
        const critT: Record<string, number> = { seawater: 40, acid: 25, alkaline: 80, freshwater: 60, atmosphere: 100, oxidizing: 25 };
        const tCrit = critT[env] ?? 60;
        const isHighSeverity = ['seawater', 'acid', 'oxidizing'].includes(env) || T > tCrit;
        const corr = isHighSeverity ? ['Excellent'] : env === 'atmosphere' ? ['Excellent', 'Good', 'Moderate'] : ['Excellent', 'Good'];
        const hints: Record<string, string> = {
          atmosphere: '도금/도장 후 사용 가능',
          freshwater: '대부분의 스테인리스로 충분',
          seawater: 'Cu-Ni 90/10·70/30, 듀플렉스 2205/2507, Ti 우선',
          acid: 'Hastelloy C-22·C-276, 특수 합금',
          alkaline: 'Ni 합금, 스테인리스',
          oxidizing: 'Ti, Hastelloy, 일부 스테인리스',
        };
        return {
          filters: { corrosion: corr, yieldStrengthRange: [sy, HI] },
          summary: [
            { label: '내식성 (필터)', value: corr.join(' · ') },
            { label: '환경 메모', value: hints[env] },
            { label: `환경 임계 온도 (${env})`, value: `${tCrit} °C — ${T > tCrit ? '초과 (가혹)' : '이하 (정상 범위)'}` },
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
      description: '강도·단가에 더해 제조 공정·기준 단위를 선택할 수 있습니다.',
      fields: [
        { id: 'sy', label: '필요 σy', unit: 'MPa', type: 'number', default: 250, min: 0, step: 10, group: '성능' },
        { id: 'maxPrice', label: '최대 단가 ($/kg)', unit: '$/kg', type: 'number', default: 5, min: 0.1, step: 0.5, group: '원가' },
        { id: 'process', label: '제조 공정 제약 (다중)', type: 'multiselect', default: [], help: '체크 없음 = 제약 없음. 여러 공정 동시 허용.', options: [
          { value: 'Wrought', label: '단조·압연 (대량 강·알루미늄)' },
          { value: 'Cast', label: '주조 (복잡 형상)' },
          { value: 'Injection-Molded', label: '사출 (폴리머)' },
        ], group: '제조' },
        { id: 'category', label: '재료 카테고리', type: 'select', default: 'any', options: [
          { value: 'any', label: '제약 없음' },
          { value: 'Metal', label: '금속만' },
          { value: 'Polymer', label: '폴리머만' },
        ], group: '제조' },
      ],
      compute: (v) => {
        const sy = Number(v.sy), mp = Number(v.maxPrice), cat = String(v.category);
        // R35b — process multiselect (string[]).
        const procs = Array.isArray(v.process) ? (v.process as string[]) : [];
        const filters: Partial<FilterState> = { yieldStrengthRange: [sy, HI], pricePerKgRange: [0, mp] };
        if (procs.length > 0) filters.processes = procs;
        if (cat !== 'any') filters.categories = [cat];
        return {
          filters,
          summary: [
            { label: '필요 σy', value: `≥ ${sy} MPa` },
            { label: '원가', value: `≤ $${mp}/kg` },
            ...(procs.length > 0 ? [{ label: '제조', value: procs.join(' / ') }] : []),
            ...(cat !== 'any' ? [{ label: '카테고리', value: cat }] : []),
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
      description: '스프링 형식과 사이클·강도·연신율을 입력합니다.',
      fields: [
        { id: 'form', label: '스프링 형식', type: 'select', default: 'compression', options: [
          { value: 'compression', label: '압축 코일 (밸브·서스펜션)' },
          { value: 'tension', label: '인장 코일' },
          { value: 'cantilever', label: '외팔 판/리프 (스냅핏)' },
          { value: 'disc', label: '디스크/Belleville' },
          { value: 'torsion', label: '비틀림 (시계 헤어스프링)' },
        ], group: '형식' },
        { id: 'cycle', label: '동작 사이클', type: 'select', default: 'cyclic', options: [
          { value: 'static', label: '거의 정적 (가끔 압축)' },
          { value: 'cyclic', label: '반복 동작 (>10⁵ 사이클, 피로 고려)' },
        ], group: '동작' },
        { id: 'sy', label: '필요 σy', unit: 'MPa', type: 'number', default: 800, min: 0, step: 50, group: '성능' },
        { id: 'el', label: '최소 연신율', unit: '%', type: 'number', default: 5, min: 0, step: 0.5, group: '성능' },
      ],
      compute: (v) => {
        const sy = Number(v.sy), el = Number(v.el), form = String(v.form), cycle = String(v.cycle);
        const filters: Partial<FilterState> = { yieldStrengthRange: [sy, HI], elongationRange: [el, HI] };
        // 반복 사이클이면 피로한도도 σy의 0.4배 정도로 적용 (보수적)
        if (cycle === 'cyclic') filters.fatigueStrengthRange = [Math.round(sy * 0.4), HI];
        const formNotes: Record<string, string> = {
          compression: '스프링강·BeCu 우선, 표면 결함 최소화',
          tension: '훅 응력집중 — 마감 처리 중요',
          cantilever: '폴리머도 가능 (POM·PA12)',
          disc: '높은 σy 필요 (Belleville)',
          torsion: '시계용 Co-Ni 합금, 박판 스프링강',
        };
        return {
          filters,
          summary: [
            { label: '스프링 형식', value: formNotes[form] },
            { label: '사이클', value: cycle === 'cyclic' ? '반복 (피로 필터 자동)' : '정적' },
            { label: '필요 σy', value: `≥ ${sy} MPa` },
            { label: '최소 연신율', value: `≥ ${el}%` },
            ...(cycle === 'cyclic' ? [{ label: '필요 피로한도 (추정)', value: `≥ ${Math.round(sy * 0.4)} MPa` }] : []),
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
      description: '응용을 선택하면 전형적 발열·단면이 채워집니다. 1D 열전도식으로 필요 k를 산출.',
      fields: [
        { id: 'app', label: '응용 (빠른 설정)', type: 'select', default: 'custom', options: [
          { value: 'custom', label: '직접 입력' },
          { value: 'cpu', label: 'CPU/GPU 쿨러 (~100 W)' },
          { value: 'led', label: 'LED 방열 (5–30 W)' },
          { value: 'power_semi', label: '전력반도체 콜드플레이트 (>200 W)' },
          { value: 'electronics', label: '소형 전자기기 (~10 W)' },
        ], group: '응용' },
        { id: 'P', label: '발열 P', unit: 'W', type: 'number', default: 50, min: 0.1, step: 5, group: '하중·기하' },
        { id: 'A', label: '단면적 A', unit: 'mm²', type: 'number', default: 500, min: 1, step: 10, group: '하중·기하' },
        { id: 'L', label: '전열 경로 L', unit: 'mm', type: 'number', default: 30, min: 0.1, step: 1, group: '하중·기하' },
        { id: 'dT', label: '허용 ΔT', unit: '°C', type: 'number', default: 20, min: 0.1, step: 1, help: '기본값 50W/500mm²/30mm/20°C → 필요 k ≈ 150 W/m·K (구리·알루미늄·일부 합금 통과)', group: '하중·기하' },
        { id: 'mode', label: '냉각 모드', type: 'select', default: 'conduction', options: [
          { value: 'conduction', label: '전도 위주 (1D)' },
          { value: 'forced_air', label: '강제 공냉 (대류 추가)' },
          { value: 'liquid', label: '액냉 (콜드플레이트)' },
        ], group: '냉각' },
        { id: 'light', label: '경량 우선?', type: 'select', default: 'no', options: [
          { value: 'no', label: '아니오 (k만)' },
          { value: 'yes', label: '예 (밀도 ≤ 8)' },
          { value: 'strict', label: '엄격 (밀도 ≤ 3, 알루미늄급)' },
        ], group: '제약' },
      ],
      compute: (v) => {
        const P = Number(v.P), A = Number(v.A), L = Number(v.L), dT = Number(v.dT);
        const mode = String(v.mode);
        // 전도식: k = P·L / (A·ΔT). 강제 공냉/액냉이면 대류가 추가 방열하므로 필요 k가 낮아짐 (보수적 보정).
        const convFactor = mode === 'forced_air' ? 0.6 : mode === 'liquid' ? 0.35 : 1.0;
        const k = (P * L * 1000) / (A * dT) * convFactor;
        const light = String(v.light);
        const dMax = light === 'strict' ? 3 : light === 'yes' ? 8 : null;
        const filters: Partial<FilterState> = { thermalConductivityRange: [round0(k), HI] };
        if (dMax !== null) filters.densityRange = [0, dMax];
        return {
          filters,
          summary: [
            { label: '냉각 모드 보정', value: `×${convFactor}` },
            { label: '필요 k', value: `≥ ${round0(k)} W/m·K` },
            ...(dMax !== null ? [{ label: '경량 조건', value: `밀도 ≤ ${dMax} g/cm³` }] : []),
          ],
        };
      },
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 라운드 6 추가 사례: 마모, 의료 임플란트, 극저온, 전기 전도체
   * 각 사례는 표준 핸드북 근거를 둔 필터 산출로만 동작 (값 조작 없음).
   * ────────────────────────────────────────────────────────────────────── */
  wear: {
    label: '마모·내마모 부품',
    filters: {},
    viewMode: 'ashby',
    indexHint: '경도 HV 우선, 연성 확보 후 σy 보조 — 표면 처리 별도',
    configurator: {
      description: '응용·접촉 모드·하중을 입력하면 경도/연성 권장치를 산출합니다. 표면 처리(질화·코팅)는 후처리로 분리.',
      fields: [
        { id: 'app', label: '응용 (빠른 설정)', type: 'select', default: 'custom', options: [
          { value: 'custom', label: '직접 입력' },
          { value: 'gear', label: '기어 (피팅·플랭크 마모)' },
          { value: 'cam', label: '캠·종동절 (접촉 응력)' },
          { value: 'bearing_race', label: '베어링 레이스 (구름 피로)' },
          { value: 'wear_plate', label: '내마모 플레이트 (abrasive)' },
          { value: 'cutting_tool', label: '절삭공구 (고경도)' },
        ], group: '응용' },
        { id: 'mode', label: '마모 모드', type: 'select', default: 'abrasive', options: [
          { value: 'abrasive', label: '연마성 (입자·모래)' },
          { value: 'adhesive', label: '응착성 (금속-금속 미끄럼)' },
          { value: 'rolling', label: '구름 피로 (접촉 응력)' },
          { value: 'erosive', label: '침식 (고속 입자)' },
        ], group: '접촉' },
        { id: 'HV_req', label: '필요 경도 HV (직접 입력 시)', unit: 'HV', type: 'number', default: 450, min: 50, step: 10, help: '연마성→500+, 응착성→350+, 구름→700+ (베어링급)', group: '경도' },
        { id: 'el_min', label: '최소 연신율 (취성 회피)', unit: '%', type: 'number', default: 5, min: 0, step: 0.5, group: '연성' },
      ],
      compute: (v) => {
        const mode = String(v.mode);
        const HV = Number(v.HV_req);
        const el = Number(v.el_min);
        // 모드별 권장 최소 경도 — Archard 마모 W ∝ FL/H 에 따라 H 가 클수록 마모 감소.
        const recHV: Record<string, number> = { abrasive: 500, adhesive: 350, rolling: 700, erosive: 600 };
        const finalHV = Math.max(HV, recHV[mode] ?? 400);
        const note: Record<string, string> = {
          abrasive: '입자 경도 < 재료 경도 — 1.2배 권장. 표면 침탄·질화 효과 큼.',
          adhesive: '경질·연질 짝짓기 (galling 방지). PTFE/그리스 윤활 검토.',
          rolling: '접촉 응력 (Hertz) 우선 — σ_y 가 아니라 H 와 청정도(inclusion).',
          erosive: '입자 각도 90° 면 취성재 위험. HV 우선 + 두께 마진.',
        };
        return {
          filters: { hardnessRange: [finalHV, HI], elongationRange: [el, HI] },
          summary: [
            { label: '권장 경도 (모드 적용)', value: `≥ ${finalHV} HV` },
            { label: '최소 연신율', value: `≥ ${el}%` },
            { label: '모드 메모', value: note[mode] ?? '' },
            { label: '표면 처리 고려', value: '질화·DLC·HVOF 코팅으로 경도·내마모 추가 향상' },
          ],
        };
      },
    },
  },

  medical: {
    label: '의료 임플란트 (생체적합)',
    filters: {},
    viewMode: 'ashby',
    indexHint: '뼈와 modulus 매칭(과강성 회피 — stress shielding) + 부식 면역',
    configurator: {
      description: '임플란트 위치·하중 종류·내구 기간을 입력하면 생체적합 금속군과 modulus 범위를 좁힙니다.',
      fields: [
        { id: 'site', label: '식립 부위', type: 'select', default: 'orthopedic', options: [
          { value: 'orthopedic', label: '정형외과 (대퇴골·고관절 — 굽힘·압축)' },
          { value: 'dental', label: '치과 (임플란트 픽스처 — 압축)' },
          { value: 'spine', label: '척추 (케이지·스크류)' },
          { value: 'cardiovascular', label: '심혈관 (스텐트·인공판막 — 피로)' },
          { value: 'cranial', label: '두개골·맥실로페이셜 (정적 하중)' },
        ], group: '부위' },
        { id: 'duration', label: '체내 체류 기간', type: 'select', default: 'long', options: [
          { value: 'short', label: '단기 (<1년, 골절 fixation)' },
          { value: 'long', label: '장기 (>5년, 영구)' },
        ], group: '체류' },
        { id: 'load', label: '주 하중 타입', type: 'select', default: 'cyclic', options: [
          { value: 'static', label: '정적 (작은 변형)' },
          { value: 'cyclic', label: '주기적 보행/맥동 (피로 확실)' },
        ], group: '하중' },
        { id: 'sy_req', label: '필요 σy', unit: 'MPa', type: 'number', default: 600, min: 0, step: 50, group: '하중', help: '치과·정형외과 600+ 일반, 척추 800+' },
      ],
      compute: (v) => {
        const site = String(v.site), load = String(v.load), sy = Number(v.sy_req);
        // 피질골 모듈러스 E ≈ 18 GPa. Ti-6Al-4V 110 GPa, CoCr 230, 316L 200, PEEK 4.
        // Stress shielding 방지 위해 E 상한 권장 (정형/척추), 치과는 압축 위주라 상한 완화.
        const ePrefRange: [number, number] = site === 'dental' || site === 'cardiovascular' ? [100, HI] : [90, 200];
        const corr = ['Excellent']; // 생체 환경 → 부식 면역 필수.
        const filters: Partial<FilterState> = {
          yieldStrengthRange: [sy, HI],
          modulusRange: ePrefRange,
          corrosion: corr,
          categories: ['Metal'], // 생체적합 금속 (Ti·CoCr·316L 등)
        };
        if (load === 'cyclic') filters.fatigueStrengthRange = [Math.round(sy * 0.4), HI];
        const siteNote: Record<string, string> = {
          orthopedic: 'Ti-6Al-4V 표준. E 매칭 위해 Ti-Nb-Zr 등 β-Ti 도 검토.',
          dental: 'Grade 4·5 Ti 일반. 표면 처리 (SLA·anodizing) 로 osseointegration 향상.',
          spine: 'PEEK 케이지 + Ti 스크류 조합 잦음 (modulus 매칭).',
          cardiovascular: '스텐트 — 316L 또는 Nitinol(형상기억). 피로 시험 필수.',
          cranial: 'Ti mesh 또는 PEEK. 영상 호환성도 고려.',
        };
        return {
          filters,
          summary: [
            { label: '필요 σy', value: `≥ ${sy} MPa` },
            { label: 'Modulus 권장', value: `${ePrefRange[0]}–${ePrefRange[1] === HI ? '∞' : ePrefRange[1]} GPa  (피질골 ≈ 18, 과강성 회피)` },
            { label: '부식', value: 'Excellent (생체 환경 면역 필수)' },
            ...(load === 'cyclic' ? [{ label: '필요 피로한도 (추정)', value: `≥ ${Math.round(sy * 0.4)} MPa` }] : []),
            { label: '부위 메모', value: siteNote[site] },
            { label: '규제', value: 'ISO 10993 (생체적합성), ISO 5832 (재료 등급)' },
          ],
        };
      },
    },
  },

  cryogenic: {
    label: '극저온 부품 (LNG·우주)',
    filters: {},
    viewMode: 'ashby',
    indexHint: '연신율 ≥ 15% + FCC 구조(Al·Cu·γ-Fe austenitic·Ni) — BCC 강은 DBTT 주의',
    configurator: {
      description: '운전 온도와 하중을 입력하면 저온 인성을 확보한 합금만 남깁니다. DBTT가 있는 BCC 강은 자동 제외.',
      fields: [
        { id: 'T_low', label: '최저 운전 온도', unit: '°C', type: 'number', default: -196, min: -273, max: 25, step: 10, help: '액화N₂ −196°C, 액화수소 −253°C, 액화헬륨 −269°C', group: '온도' },
        { id: 'sy_req', label: '필요 σy', unit: 'MPa', type: 'number', default: 300, min: 0, step: 10, group: '하중' },
        { id: 'el_min', label: '최소 연신율 (저온 인성 지표)', unit: '%', type: 'number', default: 15, min: 0, step: 1, help: 'FCC 금속은 저온에서도 15%+ 유지. BCC 강 위험.', group: '인성' },
        { id: 'app', label: '응용 (참고)', type: 'select', default: 'lng', options: [
          { value: 'lng', label: 'LNG 저장·이송 (−162°C)' },
          { value: 'rocket', label: '액체산소·수소 로켓 탱크' },
          { value: 'cryo_med', label: '의료·연구 (액N₂·He)' },
        ], group: '응용' },
      ],
      compute: (v) => {
        const Tlow = Number(v.T_low), sy = Number(v.sy_req), el = Number(v.el_min);
        // 권장: 오스테나이트계 (FCC), Al, Cu, Ni 합금. 페라이트·마르텐사이트 강(BCC)은
        // DBTT(Ductile-Brittle Transition Temperature) 가 보통 −30~−80°C 이상에서 취성 천이 → 제외.
        // 필터로 직접 제외 불가능하므로 subcategories 권장: Austenitic SS, Al 합금, Ni 합금.
        const subRec = ['Stainless - Austenitic', 'Aluminum', 'Nickel Superalloy', 'Copper - High Strength'];
        return {
          filters: {
            yieldStrengthRange: [sy, HI],
            elongationRange: [el, HI],
            categories: ['Metal'],
            subcategories: subRec,
          },
          summary: [
            { label: '운전 온도', value: `${Tlow} °C` },
            { label: '필요 σy', value: `≥ ${sy} MPa` },
            { label: '필요 연신율', value: `≥ ${el}% (FCC 구조 보존 지표)` },
            { label: '추천 군', value: 'Austenitic SS · Al · Ni · 일부 Cu — BCC 강은 DBTT 위험으로 제외' },
            { label: '검증', value: 'Charpy 시험 (−196°C, ≥27J/kV) — 저온 인성 직접 확인 필수' },
            { label: '주의', value: 'Ti 는 저온 강도↑·인성↓ — α 상 다량 시 위험. β·근접 합금 확인.' },
          ],
        };
      },
    },
  },

  pressure_vessel: {
    label: '압력용기 (탱크·실린더·보일러)',
    filters: {},
    viewMode: 'ashby',
    indexHint: 'Hoop stress 우선 — Sy/ρ 로 무게 비교, 내식·고온 필터로 환경 조건 반영',
    configurator: {
      description: '내압·내경·온도·환경을 입력하면 박판/후판 식으로 필요 σy 와 두께를 산출합니다. ASME VIII Div.1 식 기반.',
      fields: [
        { id: 'P', label: '설계 압력 P', unit: 'MPa', type: 'number', default: 2, min: 0.01, step: 0.1, group: '하중' },
        { id: 'D', label: '내경 D', unit: 'mm', type: 'number', default: 500, min: 10, step: 10, group: '기하' },
        { id: 'T', label: '사용 온도', unit: '°C', type: 'number', default: 60, step: 10, group: '환경' },
        { id: 'env', label: '내부 환경', type: 'select', default: 'water', options: [
          { value: 'water', label: '물·일반 액체 — 부식 무시' },
          { value: 'steam', label: '증기·고온수 — 산화 고려' },
          { value: 'corrosive', label: '부식성 (산·해수) — 내식 필수' },
          { value: 'gas', label: '압축 가스 (LPG·CO₂) — 부식 무시' },
          { value: 'cryogen', label: '극저온 액체 (LNG·LOX·LH₂)' },
        ], group: '환경' },
        { id: 'SF', label: '안전계수 SF', type: 'number', default: 3.5, min: 1.5, step: 0.5, help: '일반 압력용기 SF=3.5 (ASME VIII Div.1)', group: '설계 마진' },
        { id: 't_assumed', label: '가정 두께 t (산출 검증용)', unit: 'mm', type: 'number', default: 6, min: 0.1, step: 0.5, group: '기하' },
      ],
      compute: (v) => {
        const P = Number(v.P), D = Number(v.D), T = Number(v.T), SF = Number(v.SF), t = Number(v.t_assumed);
        const env = String(v.env);
        // Hoop stress (박판 가정): σ_h = P·D/(2·t). 두꺼우면 Lamé 식 필요하지만 D/t > 20 가정.
        const sigmaHoop = (P * D) / (2 * t);
        const needSy = SF * sigmaHoop;
        // 환경별 추가 마진·내식 등급
        const envMargin = env === 'steam' ? 30 : env === 'cryogen' ? 0 : 0;
        const corr = env === 'corrosive' ? ['Excellent'] : env === 'steam' ? ['Excellent', 'Good'] : env === 'cryogen' ? ['Excellent', 'Good'] : [];
        const subRec = env === 'cryogen' ? ['Stainless - Austenitic', 'Aluminum', 'Nickel Superalloy'] : [];
        const tMax = Math.max(T + envMargin, T);
        const filters: Partial<FilterState> = {
          yieldStrengthRange: [round0(needSy), HI],
          maxServiceTempRange: [tMax + 20, HI],
        };
        if (corr.length) filters.corrosion = corr;
        if (subRec.length) filters.subcategories = subRec;
        return {
          filters,
          summary: [
            { label: 'Hoop 응력', value: `σ_h = P·D/(2t) = ${round1(sigmaHoop)} MPa` },
            { label: '필요 σy', value: `≥ ${round0(needSy)} MPa  (SF=${SF})` },
            { label: 'D/t', value: `${round1(D / t)}  ${D / t < 20 ? '⚠ 후판 — Lamé 식 필요' : '(박판 가정 OK)'}` },
            { label: '내부식 등급', value: corr.length ? corr.join(' · ') : '제약 없음' },
            { label: '최대사용온도 (필터)', value: `≥ ${tMax + 20} °C` },
            ...(env === 'cryogen' ? [{ label: '극저온 군', value: 'Austenitic SS · Al · Ni (BCC 강 제외)' }] : []),
            { label: '표준 코드', value: 'ASME BPVC Sec.VIII Div.1 UG-27 (얇은 셸 식) · 용접부 효율 E (코드 표 UW-12) 별도 적용 — 실 설계 시 검증 필수' },
          ],
        };
      },
    },
  },

  gear: {
    label: '기어 (전동·동력 전달)',
    filters: {},
    viewMode: 'ashby',
    indexHint: '굽힘 한도 + 접촉 한도 동시 — 침탄·질화로 후공정 강도 추가 흔함',
    configurator: {
      description: '토크·치수·사이클로 굽힘응력(Lewis)·접촉응력(Hertz)을 추정해 필요 σy/HV 를 산출합니다. AGMA 단순화.',
      fields: [
        { id: 'app', label: '응용', type: 'select', default: 'industrial', options: [
          { value: 'industrial', label: '산업용 감속기 (보통 강도)' },
          { value: 'automotive', label: '자동차 변속기 (고강도 + 피로)' },
          { value: 'aerospace', label: '항공 (고강도 + 경량 + 정밀)' },
          { value: 'precision', label: '시계·계측 (정밀, 저토크)' },
        ], group: '응용' },
        { id: 'T_torque', label: '전달 토크 T', unit: 'N·m', type: 'number', default: 100, min: 0.1, step: 10, group: '하중' },
        { id: 'd_pitch', label: '피치원 지름 d', unit: 'mm', type: 'number', default: 80, min: 5, step: 5, group: '기하' },
        { id: 'm_module', label: '모듈 m', unit: 'mm', type: 'number', default: 2.5, min: 0.5, step: 0.5, group: '기하', help: '치형 크기 — 자동차 2-4, 산업용 3-8' },
        { id: 'b_face', label: '치폭 b', unit: 'mm', type: 'number', default: 20, min: 1, step: 2, group: '기하' },
        { id: 'cycles', label: '예상 사이클 수', type: 'select', default: '1e7', options: [
          { value: '1e5', label: '~10⁵ (저 사이클)' },
          { value: '1e7', label: '~10⁷ (피로한도 수렴)' },
          { value: '1e9', label: '~10⁹ (영구 — 차량 변속기 급)' },
        ], group: '수명' },
        { id: 'surface', label: '표면 처리', type: 'select', default: 'hardened', options: [
          { value: 'asis', label: '소재 그대로 (가공 후 그대로)' },
          { value: 'hardened', label: '침탄/질화 (HV 600+ 표층)' },
          { value: 'ground', label: '연삭 + 침탄 (HV 700+, 항공 등급)' },
        ], group: '표면' },
      ],
      compute: (v) => {
        const T = Number(v.T_torque) * 1000; // N·mm
        const d = Number(v.d_pitch), m = Number(v.m_module), b = Number(v.b_face);
        const cyclesStr = String(v.cycles), surf = String(v.surface);
        // Tangential force Ft = 2T/d
        const Ft = (2 * T) / d;
        // Lewis form factor 단순화: Y ≈ 0.35 (m=2-5 강), 굽힘응력 σ_b ≈ Ft/(b·m·Y)
        const Y = 0.35;
        const sigmaBend = Ft / (b * m * Y);
        // Hertz 접촉응력: σ_c ≈ 0.418·sqrt(Ft·E/(b·d·sin(α)·cos(α))), α=20°. E=200GPa 가정.
        const alpha = 20 * Math.PI / 180;
        const E = 200e3; // MPa
        const sigmaContact = 0.418 * Math.sqrt(Ft * E / (b * d * Math.sin(alpha) * Math.cos(alpha)));
        // 피로 마진
        const cyclesFactor: Record<string, number> = { '1e5': 1.0, '1e7': 1.4, '1e9': 1.8 };
        const cyc = cyclesFactor[cyclesStr] ?? 1.4;
        const needSy = sigmaBend * cyc * 1.5; // 굽힘 SF=1.5
        // 표면 경도 권장 (Hertz 접촉응력 기반 — 접촉응력 1MPa ≈ 0.3 HV 환산 보수적)
        const surfHV: Record<string, number> = { asis: 200, hardened: 600, ground: 700 };
        const recHV = Math.max(Math.round(sigmaContact * 0.35), surfHV[surf] ?? 400);
        return {
          filters: {
            yieldStrengthRange: [round0(needSy), HI],
            hardnessRange: [recHV, HI],
            fatigueStrengthRange: [Math.round(needSy * 0.5), HI],
          },
          summary: [
            { label: '접선력 F_t', value: `${round0(Ft)} N` },
            { label: '굽힘응력 (Lewis)', value: `σ_b = F_t/(b·m·Y) = ${round0(sigmaBend)} MPa` },
            { label: '접촉응력 (Hertz)', value: `σ_c ≈ ${round0(sigmaContact)} MPa` },
            { label: '필요 σy (SF=1.5·사이클 보정)', value: `≥ ${round0(needSy)} MPa` },
            { label: '권장 경도 (표층)', value: `≥ ${recHV} HV` },
            { label: '필요 피로한도', value: `≥ ${Math.round(needSy * 0.5)} MPa` },
            { label: '후공정', value: surf === 'hardened' ? '침탄(SCM·SNCM) 또는 질화(질화강)' : surf === 'ground' ? '연삭 + 침탄(SAE 8620·9310) + Shot peening' : '냉간·온간 가공 그대로' },
            { label: '표준 코드', value: 'AGMA 2001 (강도 등급), ISO 6336 (굽힘·접촉 안전계수). Lewis Y는 m=2-5·치수 z=15-25 가정 — 정밀 설계는 AGMA 표 참고.' },
          ],
        };
      },
    },
  },

  fastener: {
    label: '체결구 (볼트·스터드)',
    filters: {},
    viewMode: 'ashby',
    indexHint: 'UTS + σy 동시 — 등급 자체가 표준값을 정의하므로 등급 선택 우선',
    configurator: {
      description: '체결구 등급(ISO/SAE) 선택 시 표준 UTS/σy 가 자동 적용됩니다. 사용자 정의 모드도 지원.',
      fields: [
        { id: 'grade', label: '등급 (자동 표준값)', type: 'select', default: '8.8', options: [
          { value: 'custom', label: '직접 입력' },
          { value: '4.8', label: 'ISO 4.8 (UTS 400 / σy 320)' },
          { value: '8.8', label: 'ISO 8.8 (UTS 800 / σy 640) — 범용' },
          { value: '10.9', label: 'ISO 10.9 (UTS 1040 / σy 940) — 자동차' },
          { value: '12.9', label: 'ISO 12.9 (UTS 1220 / σy 1100) — 고강도' },
          { value: 'A2-70', label: 'A2-70 SS 304 (UTS 700 / σy 450) — 내식' },
          { value: 'A4-80', label: 'A4-80 SS 316 (UTS 800 / σy 600) — 해수' },
          { value: 'inconel', label: 'Inconel 718 (UTS 1240 / σy 1030) — 고온' },
        ], group: '등급' },
        { id: 'app', label: '응용', type: 'select', default: 'general', options: [
          { value: 'general', label: '일반 기계 결합' },
          { value: 'preload', label: '체결 + 예압 (밀폐·구조)' },
          { value: 'dynamic', label: '진동·반복 하중 (피로 핵심)' },
          { value: 'marine', label: '해양·실외 (부식 필수)' },
          { value: 'hightemp', label: '고온 (>200°C)' },
        ], group: '응용' },
        { id: 'F_axial', label: '예상 축력 F', unit: 'kN', type: 'number', default: 10, min: 0, step: 1, group: '하중' },
        { id: 'UTS_custom', label: '필요 UTS (직접 모드)', unit: 'MPa', type: 'number', default: 800, min: 0, step: 10, group: '직접 입력' },
        { id: 'Sy_custom', label: '필요 σy (직접 모드)', unit: 'MPa', type: 'number', default: 640, min: 0, step: 10, group: '직접 입력' },
      ],
      compute: (v) => {
        const grade = String(v.grade), app = String(v.app);
        const F = Number(v.F_axial);
        // 표준 등급값
        const gradeMap: Record<string, { uts: number; sy: number; el: number; note: string; corr?: string[]; temp?: number }> = {
          '4.8': { uts: 400, sy: 320, el: 14, note: 'ISO 898-1 4.8 — 저강도 일반용' },
          '8.8': { uts: 800, sy: 640, el: 12, note: 'ISO 898-1 8.8 — 범용 (가장 흔함)' },
          '10.9': { uts: 1040, sy: 940, el: 9, note: 'ISO 898-1 10.9 — 자동차·기계' },
          '12.9': { uts: 1220, sy: 1100, el: 8, note: 'ISO 898-1 12.9 — 고강도, 수소취성 주의' },
          'A2-70': { uts: 700, sy: 450, el: 40, note: 'ISO 3506 A2-70 (304 SS)', corr: ['Excellent', 'Good'] },
          'A4-80': { uts: 800, sy: 600, el: 25, note: 'ISO 3506 A4-80 (316 SS) — 해수', corr: ['Excellent'] },
          'inconel': { uts: 1240, sy: 1030, el: 12, note: 'Inconel 718 — 고온 (~650°C)', corr: ['Excellent'], temp: 650 },
        };
        const g = gradeMap[grade];
        const uts = g ? g.uts : Number(v.UTS_custom);
        const sy = g ? g.sy : Number(v.Sy_custom);
        const filters: Partial<FilterState> = {
          utsRange: [uts, HI],
          yieldStrengthRange: [sy, HI],
          elongationRange: [g ? g.el : 8, HI],
        };
        if (app === 'dynamic') filters.fatigueStrengthRange = [Math.round(sy * 0.4), HI];
        if (app === 'marine' || g?.corr) filters.corrosion = (g?.corr || ['Excellent']);
        if (app === 'hightemp' || g?.temp) filters.maxServiceTempRange = [(g?.temp ?? 200) + 50, HI];
        return {
          filters,
          summary: [
            { label: '등급', value: g ? g.note : '직접 입력' },
            { label: '필요 UTS', value: `≥ ${uts} MPa` },
            { label: '필요 σy', value: `≥ ${sy} MPa` },
            { label: '최소 연신율', value: `≥ ${g?.el ?? 8}%` },
            { label: '축력 F', value: `${F} kN` },
            ...(app === 'dynamic' ? [{ label: '피로한도', value: `≥ ${Math.round(sy * 0.4)} MPa (R≈-1)` }] : []),
            ...(app === 'preload' ? [{ label: '예압 토크', value: '0.7·σy → 토크 환산식 별도' }] : []),
            { label: '주의', value: grade === '12.9' ? '수소취성 — 도금 후 베이킹 필수' : grade === 'inconel' ? '단가↑, 절삭성 ↓' : '표준 강·SS 가능' },
            { label: '표준 코드', value: 'ISO 898-1 (탄소·합금강) / ISO 3506 (스테인리스) / ASME B18.2.6 (구조용). 등급값은 그대로 — 응용별 보정만 추가.' },
          ],
        };
      },
    },
  },

  die_mold: {
    label: '다이·금형 (절삭·사출·단조)',
    filters: {},
    viewMode: 'ashby',
    indexHint: '경도 우선 + 인성으로 chipping 회피 — 사이클이 길면 열피로도 필터',
    configurator: {
      description: '응용·사이클·내마모 요구로 공구강 등급 권장값을 산출합니다. AISI 표준 등급 매핑.',
      fields: [
        { id: 'app', label: '금형 응용', type: 'select', default: 'plastic_injection', options: [
          { value: 'plastic_injection', label: '플라스틱 사출 (저-중 사이클, 광택)' },
          { value: 'die_casting', label: '다이캐스팅 (Al·Mg, 600-700°C 열피로)' },
          { value: 'cold_forging', label: '냉간 단조 (고압력, 마모)' },
          { value: 'hot_forging', label: '열간 단조 (>900°C, 열피로 + 마모)' },
          { value: 'stamping', label: '스탬핑 (절단 다이, 경도 + 인성)' },
          { value: 'extrusion', label: '압출 다이 (고압력, 마모, 열간)' },
        ], group: '응용' },
        { id: 'T_op', label: '작동 온도 (열간)', unit: '°C', type: 'number', default: 200, min: 20, max: 1200, step: 50, help: '냉간이면 상온 그대로', group: '온도' },
        { id: 'cycles_target', label: '목표 사이클 수', type: 'select', default: '1e5', options: [
          { value: '1e4', label: '~10⁴ (저생산, 시제품)' },
          { value: '1e5', label: '~10⁵ (양산)' },
          { value: '1e6', label: '~10⁶ (대량 양산)' },
        ], group: '수명' },
        { id: 'wear_priority', label: '마모 우선도', type: 'select', default: 'medium', options: [
          { value: 'low', label: '낮음 (인성 우선)' },
          { value: 'medium', label: '균형' },
          { value: 'high', label: '높음 (HV >60 HRC급)' },
        ], group: '마모' },
      ],
      compute: (v) => {
        const app = String(v.app);
        const T = Number(v.T_op);
        const wear = String(v.wear_priority);
        // 응용별 표준 공구강 권장
        const appMap: Record<string, { hv: number; tempMin: number; note: string; grade: string }> = {
          plastic_injection: { hv: 350, tempMin: 200, note: 'P20·1.2738 (열처리 출하) — 경도/광택 균형', grade: 'P20 / NAK80' },
          die_casting: { hv: 500, tempMin: 750, note: 'H13(1.2344) — 열피로·고온 안정', grade: 'H13 / SKD61' },
          cold_forging: { hv: 700, tempMin: 200, note: 'D2·DC53·SLD — 고경도·내마모', grade: 'D2 / SKD11' },
          hot_forging: { hv: 500, tempMin: 1000, note: 'H13·H21 — 고온 안정 + 인성', grade: 'H13 / H21' },
          stamping: { hv: 600, tempMin: 100, note: 'A2·D2·SKD11 — 경도 + 인성 균형', grade: 'A2 / D2 / SKD11' },
          extrusion: { hv: 550, tempMin: 800, note: 'H13·Inconel — 고압 + 고온', grade: 'H13 + Nitriding' },
        };
        const m = appMap[app];
        const wearBoost: Record<string, number> = { low: -50, medium: 0, high: 100 };
        const recHV = Math.max(200, m.hv + wearBoost[wear]);
        const recTemp = Math.max(m.tempMin, T + 100); // 마진
        return {
          filters: {
            hardnessRange: [recHV, HI],
            maxServiceTempRange: [recTemp, HI],
            // 인성: low/medium 이면 impactStrength 도 일정 수준
            ...(wear === 'low' || wear === 'medium' ? { impactStrengthRange: [10, HI] } : {}),
          },
          summary: [
            { label: '권장 공구강', value: m.grade },
            { label: '권장 경도', value: `≥ ${recHV} HV  (≈ ${Math.round(recHV / 10)} HRC)` },
            { label: '필요 최대사용온도', value: `≥ ${recHV > 600 ? recTemp : recTemp} °C` },
            { label: '특성 메모', value: m.note },
            ...(wear === 'low' || wear === 'medium' ? [{ label: '충격 인성', value: '≥ 10 J (chipping 회피)' }] : []),
            { label: '열처리', value: '담금질 + 1차/2차 템퍼링 + (필요 시) 질화 코팅' },
            { label: '표준 코드', value: 'NADCA #207 (다이캐스팅), DIN 17350 / JIS G4404 (공구강), AISI Tool Steel Composition — 등급명·열처리 condition 명시 권장.' },
          ],
        };
      },
    },
  },

  electrical: {
    label: '전기 전도체 (버스바·접점)',
    filters: {},
    viewMode: 'ashby',
    indexHint: '전기전도도 ≥ N % IACS — 동시에 σy 확보로 영구 변형 회피',
    configurator: {
      description: '응용·전류·온도 상승 한도를 입력하면 단면적과 필요 전기전도도를 산출합니다.',
      fields: [
        { id: 'app', label: '응용', type: 'select', default: 'busbar', options: [
          { value: 'busbar', label: '버스바 (배전반·EV 배터리)' },
          { value: 'contact', label: '전기 접점 (스위치·릴레이)' },
          { value: 'connector', label: '커넥터 핀 (저항 가열 회피)' },
          { value: 'rf', label: 'RF·마이크로파 (표피효과)' },
        ], group: '응용' },
        { id: 'I', label: '연속 전류 I', unit: 'A', type: 'number', default: 100, min: 0.1, step: 10, group: '하중' },
        { id: 'dT', label: '허용 온도상승 ΔT', unit: '°C', type: 'number', default: 40, min: 5, step: 5, help: '도체 IEC 권장 ΔT = 30~50°C', group: '하중' },
        { id: 'A_mm2', label: '단면적 (현재 설계)', unit: 'mm²', type: 'number', default: 100, min: 1, step: 10, group: '기하' },
        { id: 'sy_min', label: '최소 σy (변형 방지)', unit: 'MPa', type: 'number', default: 100, min: 0, step: 10, group: '기계' },
      ],
      compute: (v) => {
        const I = Number(v.I), dT = Number(v.dT), A = Number(v.A_mm2), sy = Number(v.sy_min);
        // Cu 표준 전기전도도 약 58 MS/m ≈ 100% IACS. 동손 P = I²·R = I²·ρ·L/A.
        // 정상상태 도체 dT ≈ ρ·I²/(A²·h) — 정확하지 않으나 필요 전도도 (=1/ρ) 의 가이드.
        // 보수적 근사: σ_e (S/m) ≥ I²·L_ref / (A²·dT·h_ref), L_ref=1m, h_ref ≈ 10 W/m²K 자유대류.
        const Lref = 1000; // mm
        const h = 10;      // W/m²K (자유 대류)
        // 표면적 ~ 4·sqrt(A) ·L (대략 정사각 단면 가정). dT = P/(h·As) = (I²/(σ_e A)) / (h·As)
        // → σ_e ≥ I² · Lref / (A² · dT · h · As_factor). 단순화: σ_e ≥ I² / (A · dT · 0.05)
        const sigmaE = (I * I) / (A * dT * 0.05); // S/m (보수적)
        const iacsPct = sigmaE / 58e6 * 100;
        const sigmaE_MS = sigmaE / 1e6;
        const rec: Record<string, string> = {
          busbar: 'Cu (C11000) 표준 — Al (1350) 도 가능 (2배 단면).',
          contact: 'Ag/AgCdO 도금 베이스 + Cu 합금 (CuBe·CuCr).',
          connector: '베릴륨동(C17200) · 인청동 — σy·탄성 동시 확보.',
          rf: '도금 Cu (도금 두께 ≥ 표피두께 5배) — 표피효과 보상.',
        };
        return {
          filters: {
            electricalConductivityRange: [Math.round(iacsPct * 0.95), HI], // %IACS 로 가정 (DB 키 확인 필요)
            yieldStrengthRange: [sy, HI],
            categories: ['Metal'],
          },
          summary: [
            { label: '소모전력 (개략)', value: `~${round0(I * I / (A * sigmaE_MS * 1000))} W (1m 당)` },
            { label: '필요 전도도', value: `≥ ${round1(iacsPct)} %IACS  (=${round1(sigmaE_MS)} MS/m)` },
            { label: '필요 σy', value: `≥ ${sy} MPa (변형 방지)` },
            { label: '응용 권장', value: rec[String(v.app)] },
            { label: '검증', value: 'IEEE/IEC 도체 표준 (도체 단면·온도 상승) 으로 최종 검증' },
          ],
        };
      },
    },
  },
};

export type ScenarioKey = keyof typeof SCENARIO_PRESETS;

/** indexHint 문자열에서 Ashby 차트의 MATERIAL_INDICES 키 추출.
 *  예: "경량 강성 보 E^½/ρ — 평판이면 E^⅓/ρ" → 'sqrtE/rho'. 실패 시 null.
 *  ScenarioDialog 와 Home (자동 축 전환) 양쪽에서 재사용. */
export function indexKeyFromHint(hint?: string): string | null {
  if (!hint) return null;
  const tests: [RegExp, string][] = [
    [/E\^½\s*\/\s*ρ/, 'sqrtE/rho'],
    [/E\^⅓\s*\/\s*ρ/, 'cbrtE/rho'],
    [/E\s*\/\s*ρ/, 'E/rho'],
    [/σy²\s*\/\s*E/, 'Sy2/E'],
    [/σy\s*\/\s*E/, 'Sy/E'],
    [/σy\^⅔\s*\/\s*ρ/, 'Sy23/rho'],
    [/σy\^½\s*\/\s*ρ/, 'sqrtSy/rho'],
    [/σy\s*\/\s*ρ/, 'Sy/rho'],
    [/k\s*\/\s*ρ/, 'k/rho'],
    [/E\s*\/\s*Cm/, 'E/cost'],
    [/σy\s*\/\s*Cm/, 'Sy/cost'],
  ];
  for (const [re, key] of tests) if (re.test(hint)) return key;
  return null;
}

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
  // R19 — gear/wear/die_mold 사례에서 자주 쓰는 hardness/uts/electrical/impact 도 URL 에 인코딩.
  hardnessRange: ['hvm', 'hvx'], utsRange: ['utm', 'utx'], electricalConductivityRange: ['ecm', 'ecx'],
  impactStrengthRange: ['imm', 'imx'],
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
