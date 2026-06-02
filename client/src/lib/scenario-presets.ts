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
// I-빔 / H-빔 (대칭) — 강축(수평 중립축) 굽힘 기준. h = 웹 높이 + 2·플랜지 두께(전체 높이).
const SHAPE_IBEAM: CrossSection = {
  id: 'ibeam', label: 'I-빔 / H-빔',
  dimFields: [
    { id: 'bf', label: '플랜지 폭 b_f', unit: 'mm', type: 'number', default: 80, min: 1, step: 1 },
    { id: 'tf', label: '플랜지 두께 t_f', unit: 'mm', type: 'number', default: 10, min: 0.5, step: 0.5 },
    { id: 'tw', label: '웹 두께 t_w', unit: 'mm', type: 'number', default: 6, min: 0.5, step: 0.5 },
    { id: 'h', label: '전체 높이 h', unit: 'mm', type: 'number', default: 120, min: 1, step: 1 },
  ],
  I: (v) => {
    const hw = v.h - 2 * v.tf;  // 웹 높이
    return (v.bf * Math.pow(v.h, 3) - (v.bf - v.tw) * Math.pow(hw, 3)) / 12;
  },
  Z: (v) => {
    const hw = v.h - 2 * v.tf;
    const I = (v.bf * Math.pow(v.h, 3) - (v.bf - v.tw) * Math.pow(hw, 3)) / 12;
    return I / (v.h / 2);
  },
  A: (v) => 2 * v.bf * v.tf + (v.h - 2 * v.tf) * v.tw,
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
  // I_x = (b_f·h³ − (b_f − t_w)·(h − 2·t_f)³) / 12  — 박스 − 한쪽 측면 빈공간
  I: (v) => (v.bf * Math.pow(v.h, 3) - (v.bf - v.tw) * Math.pow(v.h - 2 * v.tf, 3)) / 12,
  Z: (v) => ((v.bf * Math.pow(v.h, 3) - (v.bf - v.tw) * Math.pow(v.h - 2 * v.tf, 3)) / 12) / (v.h / 2),
  A: (v) => 2 * v.bf * v.tf + v.tw * (v.h - 2 * v.tf),  // 플랜지 2개 + 웹(플랜지 사이)
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
        { id: 'process', label: '제조 공정', type: 'select', default: 'any', options: [
          { value: 'any', label: '전체 (선택 안 함)' },
          { value: 'LPBF', label: 'LPBF (금속 분말상 적층)' },
          { value: 'DMLS', label: 'DMLS' },
          { value: 'EBM', label: 'EBM' },
          { value: 'Wrought', label: '단조·압연(Wrought)' },
          { value: 'Cast', label: '주조(Cast)' },
        ], group: '제조' },
      ],
      sections: SHAPES_BENDING,
      compute: (v, section) => {
        const dims: Record<string, number> = {};
        for (const f of section?.dimFields || []) dims[f.id] = Number(v[f.id] ?? (f.type === 'number' ? f.default : 0));
        const I = section ? section.I(dims) : 1;
        const Z = section ? section.Z(dims) : 1;
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
        const proc = String(v.process);
        const filters: Partial<FilterState> = {
          yieldStrengthRange: [round0(needSy), HI],
          modulusRange: [Math.max(1, round1(needE_GPa)), HI],
        };
        if (proc !== 'any') filters.processes = [proc];
        return {
          filters,
          summary: [
            { label: '하중 패턴', value: label },
            { label: '단면 I', value: `${round0(I)} mm⁴` },
            { label: '단면 Z', value: `${round0(Z)} mm³` },
            { label: '최대 모멘트', value: `${round0(Mmax)} N·mm` },
            { label: '필요 E', value: `≥ ${round1(needE_GPa)} GPa` },
            { label: '굽힘응력 σ_b', value: `${round0(sigmaB)} MPa` },
            { label: '필요 σy (SF 포함)', value: `≥ ${round0(needSy)} MPa` },
            ...(proc !== 'any' ? [{ label: '공정 제약', value: proc }] : []),
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
        // 환경별 권장 마진
        const margin = env === 'oxidizing' ? 100 : env === 'reducing' ? 80 : 50;
        const durNote = duration === 'continuous' ? '크리프 데이터 필수 확인' : duration === 'cyclic_short' ? '열피로(thermal fatigue) 고려' : '단발 강도 위주';
        const envNote = env === 'oxidizing' ? '내산화성 합금 우선 (예: Ni 초합금, Haynes)' : env === 'reducing' ? '환원성 분위기 적합 합금' : '광범위한 합금 가능';
        return {
          filters: { maxServiceTempRange: [Top + margin, HI], yieldStrengthRange: [sy, HI] },
          summary: [
            { label: '환경별 권장 마진', value: `+${margin} °C` },
            { label: '최대사용온도 (필터)', value: `≥ ${Top + margin} °C` },
            { label: '환경 메모', value: envNote },
            { label: '하중 메모', value: durNote },
            { label: '필요 σy (상온 기준)', value: `≥ ${sy} MPa` },
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
        { id: 'dL', label: '허용 치수변화 ΔL', unit: 'μm', type: 'number', default: 10, min: 0.001, step: 0.5, help: '1 mm = 1000 μm', group: '기하' },
        { id: 'E_req', label: '최소 강성 E (선택)', unit: 'GPa', type: 'number', default: 100, min: 0, step: 10, group: '강성 옵션' },
      ],
      compute: (v) => {
        const mode = String(v.mode);
        const dT = mode === 'range' ? Math.max(0.1, Number(v.T_high) - Number(v.T_low)) : Number(v.dT);
        const L = Number(v.L), dL_um = Number(v.dL), E = Number(v.E_req);
        const cteMax = dL_um / (L * dT * 1e-3);
        return {
          filters: { thermalExpansionRange: [0, Math.max(0.1, round1(cteMax))], ...(E > 0 ? { modulusRange: [E, HI] } : {}) },
          summary: [
            { label: 'ΔT', value: `${dT} °C` + (mode === 'range' ? ' (범위로부터)' : '') },
            { label: '허용 ΔL/L', value: `${(dL_um / L).toFixed(2)} ppm` },
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
        const isHighSeverity = ['seawater', 'acid', 'oxidizing'].includes(env) || T > 60;
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
            { label: '온도 영향', value: T > 60 ? '상온대비 가혹 (마진↑)' : '상온 부근' },
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
        { id: 'process', label: '제조 공정 제약', type: 'select', default: 'any', options: [
          { value: 'any', label: '제약 없음' },
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
        const sy = Number(v.sy), mp = Number(v.maxPrice), proc = String(v.process), cat = String(v.category);
        const filters: Partial<FilterState> = { yieldStrengthRange: [sy, HI], pricePerKgRange: [0, mp] };
        if (proc !== 'any') filters.processes = [proc];
        if (cat !== 'any') filters.categories = [cat];
        return {
          filters,
          summary: [
            { label: '필요 σy', value: `≥ ${sy} MPa` },
            { label: '원가', value: `≤ $${mp}/kg` },
            ...(proc !== 'any' ? [{ label: '제조', value: proc }] : []),
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
        { id: 'P', label: '발열 P', unit: 'W', type: 'number', default: 100, min: 0.1, step: 5, group: '하중·기하' },
        { id: 'A', label: '단면적 A', unit: 'mm²', type: 'number', default: 500, min: 1, step: 10, group: '하중·기하' },
        { id: 'L', label: '전열 경로 L', unit: 'mm', type: 'number', default: 30, min: 0.1, step: 1, group: '하중·기하' },
        { id: 'dT', label: '허용 ΔT', unit: '°C', type: 'number', default: 20, min: 0.1, step: 1, group: '하중·기하' },
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
