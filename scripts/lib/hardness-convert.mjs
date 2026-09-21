/*
 * AUD F02/F03 (2026-09-22) — 경도 환산 커널 (ASTM E140-12b 근사 환산표, data/hardness-conversion-e140.json).
 *
 * 왜 표인가: 이전 계산기는 HRC→HV 에 (HRC/23.5)^1.7×50+100 이라는 출처 없는 식을 썼다 — HRC 30 을 넣으면
 * HV 176 이 나왔다(E140 은 302). 그 값을 다시 HRC 로 되돌리면 "범위 밖" 이 됐다(감사 F02). 데이터 쪽은
 * 데이터시트의 Brinell(HB) 수치를 Vickers(HV) 열에 그대로 실었다(감사 F03 — Al HB 95 는 HV 111 이다).
 *
 * 원칙: 표 안에서는 선형 보간, 표 밖은 null(외삽 금지). 재료군별 표를 다른 군에 쓰지 않는다.
 * 클라이언트(Tools 계산기·상세 표시)와 레지스트리 교정(build-registry 4c)이 이 한 모듈을 쓴다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const E140 = JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', 'data', 'hardness-conversion-e140.json'), 'utf8'));

/** 단조 감소/증가 열 쌍(x→y)에서 선형 보간. x 가 표 밖이면 null. rows 는 [x,y] 쌍 배열(정렬 불문). */
export function interpPairs(pairs, x) {
  const pts = pairs.filter(([a, b]) => typeof a === 'number' && typeof b === 'number').sort((p, q) => p[0] - q[0]);
  if (!pts.length || typeof x !== 'number' || !isFinite(x)) return null;
  if (x < pts[0][0] || x > pts[pts.length - 1][0]) return null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (x >= x0 && x <= x1) return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

const col = (tbl, name) => tbl.columns.indexOf(name);
const pairsOf = (tbl, xName, yName) => { const xi = col(tbl, xName), yi = col(tbl, yName); return tbl.rows.map(r => [r[xi], r[yi]]); };

/* 강(비오스테나이트) — Table 1(HRC 범위) + Table 2(HRB 범위) 를 HV 축으로 이어 붙인다. */
const STEEL_HV_HRC = pairsOf(E140.steel.hrc, 'HV', 'HRC');
/* 두 표는 겹치는 구간(HRB 96~100 ↔ HRC 20~21)에서 서로 다른 모집단이라 HB 열이 단조가 아니다
   (HRB 100: HV 240/HB 240 · HRC 20: HV 238/HB 226). HV 210(HRB 95) 이하는 Table 2, 238(HRC 20) 이상은
   Table 1 을 쓰고 그 사이만 잇는다 — 두 축 모두 단조. */
const T2_CUT = 210;
const hrbPart = (y) => pairsOf(E140.steel.hrb, 'HV', y).filter(([hv]) => hv <= T2_CUT);
const STEEL_HV_HB = [...pairsOf(E140.steel.hrc, 'HV', 'HB3000'), ...hrbPart('HB3000')];
const STEEL_HV_KSI = [...pairsOf(E140.steel.hrc, 'HV', 'ksi'), ...hrbPart('ksi')];
const STEEL_HV_HRB = pairsOf(E140.steel.hrb, 'HV', 'HRB');

/** 강 경도 한 값(scale: HV|HRC|HRB|HB) → { HV, HRC, HRB, HB, UTS(MPa) } (표 밖은 null). 인장강도는 E140 근사열(ksi×6.895). */
export function steelHardness(scale, value) {
  let HV = null;
  if (scale === 'HV') HV = value;
  else if (scale === 'HRC') HV = interpPairs(STEEL_HV_HRC.map(([hv, hrc]) => [hrc, hv]), value);
  else if (scale === 'HRB') HV = interpPairs(STEEL_HV_HRB.map(([hv, hrb]) => [hrb, hv]), value);
  else if (scale === 'HB') HV = interpPairs(STEEL_HV_HB.map(([hv, hb]) => [hb, hv]), value);
  if (HV == null) return { HV: null, HRC: null, HRB: null, HB: null, UTS: null };
  const inTable = HV >= 107 && HV <= 940;
  const ksi = inTable ? interpPairs(STEEL_HV_KSI, HV) : null;
  return {
    HV: inTable ? HV : null,
    HRC: inTable ? interpPairs(STEEL_HV_HRC, HV) : null,
    HRB: inTable ? interpPairs(STEEL_HV_HRB, HV) : null,
    HB: inTable ? interpPairs(STEEL_HV_HB, HV) : null,
    UTS: ksi == null ? null : ksi * 6.894757,
  };
}

/* 단조 알루미늄 — Table 9 (HB 500 kgf ↔ HV 15 kgf ↔ HRB/HRE/HRH). */
const AL_HB_HV = pairsOf(E140.aluminum, 'HB500', 'HV');
const AL_HRB_HB = pairsOf(E140.aluminum, 'HRB', 'HB500');
/** 알루미늄 HB(500 kgf) → HV. 표 밖(HB<40 또는 >160) 은 null. */
export const alHvFromHB500 = (hb) => interpPairs(AL_HB_HV, hb);
/** 알루미늄 HRB → HB(500) → HV. */
export const alHvFromHRB = (hrb) => { const hb = interpPairs(AL_HRB_HB, hrb); return hb == null ? null : alHvFromHB500(hb); };

/* 70/30 황동 — Table 4 (HV ↔ HRB ↔ HB 500 kgf). */
const BR_HRB_HV = pairsOf(E140.brass, 'HRB', 'HV');
const BR_HB_HV = pairsOf(E140.brass, 'HB500', 'HV');
export const brassHvFromHRB = (hrb) => interpPairs(BR_HRB_HV, hrb);
export const brassHvFromHB500 = (hb) => interpPairs(BR_HB_HV, hb);

/**
 * 데이터 교정용 단일 진입점 — 원자료 스케일·값·재료군 → { hv, table } 또는 null(표 밖/미지원).
 * family: 'steel' | 'aluminum' | 'brass'. scale: 'HB' (강 3000 kgf · Al/황동 500 kgf) | 'HRB' | 'HRC'.
 */
export function toHV(family, scale, value) {
  const r = (hv, table) => (hv == null ? null : { hv: Math.round(hv), table });
  if (family === 'steel') {
    const s = steelHardness(scale, value);
    return r(s.HV, scale === 'HRC' ? 'ASTM E140-12b Table 1' : 'ASTM E140-12b Table 2');
  }
  if (family === 'aluminum') {
    if (scale === 'HB') return r(alHvFromHB500(value), 'ASTM E140-12b Table 9');
    if (scale === 'HRB') return r(alHvFromHRB(value), 'ASTM E140-12b Table 9');
    return null;
  }
  if (family === 'brass') {
    if (scale === 'HRB') return r(brassHvFromHRB(value), 'ASTM E140-12b Table 4');
    if (scale === 'HB') return r(brassHvFromHB500(value), 'ASTM E140-12b Table 4');
    return null;
  }
  return null;
}
