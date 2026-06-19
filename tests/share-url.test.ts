/*
 * R210 B3 — 공유 URL encode/decode 라운드트립 회귀 테스트.
 * encodeFiltersToParams ↔ decodeFiltersFromParams 비대칭(한쪽만 갱신)이 생기면 즉시 검출.
 * (R167 `?dsl=` 누락 share 버그 이력)
 */
import { describe, it, expect } from 'vitest';
import { encodeFiltersToParams, decodeFiltersFromParams } from '@/lib/scenario-presets';

const roundtrip = (f: any) => decodeFiltersFromParams(new URLSearchParams(encodeFiltersToParams(f)));

describe('share URL 라운드트립', () => {
  it('search·query·대표 range·list·rohs 가 손실 없이 복원', () => {
    const f = {
      search: 'ti', query: 'density<8',
      yieldStrengthRange: [200, 800], densityRange: [2, 9],
      processes: ['AM', 'Wrought'], heatTreatments: ['H900'], specs: ['AMS5662'],
      rohsOnly: true,
    };
    expect(roundtrip(f)).toEqual(f);
  });

  it('모든 RANGE_MAP·LIST_MAP 키가 대칭적으로 복원 (비대칭 가드)', () => {
    const f: any = {
      search: 's', query: 'q',
      // 파일에 정의된 모든 range 키
      yieldStrengthRange: [1, 2], modulusRange: [3, 4], fatigueStrengthRange: [5, 6],
      maxServiceTempRange: [7, 8], thermalExpansionRange: [9, 10], thermalConductivityRange: [11, 12],
      elongationRange: [13, 14], pricePerKgRange: [15, 16], densityRange: [17, 18],
      hardnessRange: [19, 20], utsRange: [21, 22], electricalConductivityRange: [23, 24],
      impactStrengthRange: [25, 26], popularityRange: [27, 28], fractureToughnessRange: [29, 30],
      totalCostEstimateRange: [31, 32], minWallThicknessRange: [33, 34], surfaceFinishTypicalRange: [35, 36],
      machiningCostFactorRange: [37, 38], htCostFactorRange: [39, 40], specificHeatRange: [41, 42],
      poissonRatioRange: [43, 44], meltingPointRange: [45, 46],
      // 모든 list 키
      processes: ['a'], corrosion: ['b'], categories: ['Metal'], subcategories: ['c'],
      heatTreatments: ['d'], machinability: ['e'], weldability: ['f'], specs: ['g'],
      rohsOnly: true,
    };
    expect(roundtrip(f)).toEqual(f);
  });

  it('빈 필터는 빈 객체로 (불필요한 키 미출력)', () => {
    expect(roundtrip({})).toEqual({});
    // 공백 검색어는 출력 안 함
    expect(roundtrip({ search: '   ' })).toEqual({});
  });

  it('rohs 미설정(false)은 복원 시 키 부재', () => {
    const decoded = roundtrip({ rohsOnly: false, search: 'x' });
    expect(decoded).toEqual({ search: 'x' });
    expect('rohsOnly' in decoded).toBe(false);
  });

  it('hideLowConfidence=false(숨김 해제)는 복원됨; true/미설정은 키 부재(default 유지)', () => {
    expect(roundtrip({ hideLowConfidence: false })).toEqual({ hideLowConfidence: false });
    // default(true)는 인코딩 안 함 → 구버전 링크 하위호환 (복원 시 default 유지)
    expect('hideLowConfidence' in roundtrip({ hideLowConfidence: true })).toBe(false);
  });

  it('compositionRanges 가 손실 없이 복원 (R210 B4)', () => {
    const f = { compositionRanges: { Fe: [10, 50], Cr: [5, 20] } };
    expect(roundtrip(f)).toEqual(f);
  });
});
