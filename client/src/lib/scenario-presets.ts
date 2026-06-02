/*
 * 사례별 프리셋 — Guide 페이지의 "이 사례로 앱 시작" 버튼이 가리키는 URL(`/?p=<key>`)을
 * Home이 mount 시 읽어 자동 적용. 필터·뷰모드는 즉시 반영하고, 권장 Index 힌트는
 * 배너에 띄워 사용자가 차트에서 직접 선택하도록 안내.
 *
 * 데이터 무결성: 프리셋은 "현실적 하한" 같은 출발점일 뿐 — 실제 설계 요구는 본인이 계산.
 */
import type { FilterState } from '@/hooks/useMaterialFilter';

export type ScenarioPreset = {
  label: string;            // 배너 표시용 짧은 사례명 (한국어)
  filters: Partial<FilterState>;
  viewMode?: 'table' | 'cards' | 'ashby';
  indexHint?: string;       // 추천 Ashby 성능지수 (UI에서 사용자가 직접 선택)
};

// 상한선 — FilterState range 튜플의 max 위치. 모든 물성을 충분히 덮는 큰 값.
const HI = 99999;

export const SCENARIO_PRESETS: Record<string, ScenarioPreset> = {
  bracket: {
    label: '경량 고강성 브래킷 (LPBF)',
    filters: { yieldStrengthRange: [300, HI], modulusRange: [90, HI], processes: ['LPBF'] },
    viewMode: 'ashby',
    indexHint: '경량 강성 보 E^½/ρ — 평판이면 E^⅓/ρ',
  },
  hightemp: {
    label: '고온 부품 (배기·터빈)',
    filters: { maxServiceTempRange: [700, HI] },
    viewMode: 'ashby',
    indexHint: '먼저 상세 팝업의 "온도-강도 곡선"으로 사용 온도에서의 σy/UTS 비교',
  },
  fatigue: {
    label: '회전·진동 부품 (피로)',
    filters: { fatigueStrengthRange: [225, HI] },
    viewMode: 'ashby',
    indexHint: '강도/무게가 중요하면 σy/ρ — 피로한도는 별도 확인',
  },
  precision: {
    label: '정밀 치수안정 마운트 (저 CTE)',
    filters: { thermalExpansionRange: [0, 5] },
    viewMode: 'ashby',
    indexHint: '강성도 필요하면 Modulus 하한 추가',
  },
  corrosion: {
    label: '해양·화학 환경 부품',
    filters: { corrosion: ['Excellent', 'Good'], yieldStrengthRange: [200, HI] },
    viewMode: 'ashby',
    indexHint: '정량 부식(부식속도·PREN)은 데이터시트로 최종 확인',
  },
  lowcost: {
    label: '저원가 양산 부품',
    filters: { yieldStrengthRange: [200, HI] },
    viewMode: 'ashby',
    indexHint: '저원가 강도 σy/Cm — Compare에 Price 열 추가',
  },
  spring: {
    label: '스프링·탄성 힌지',
    filters: { elongationRange: [3, HI] },
    viewMode: 'ashby',
    indexHint: '탄성 에너지 저장 σy²/E',
  },
  heatsink: {
    label: '방열 부품 (히트싱크)',
    filters: { thermalConductivityRange: [100, HI] },
    viewMode: 'ashby',
    indexHint: '경량 방열이면 k/ρ',
  },
};

export type ScenarioKey = keyof typeof SCENARIO_PRESETS;
