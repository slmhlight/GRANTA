/*
 * R31 — i18n 시스템. 한국어 (KO) ↔ 영어 (EN) 토글.
 *
 * 사용법:
 *   const t = useT();
 *   <span>{t('compare.title')}</span>  // "재료 비교" or "Material Comparison"
 *
 * 누락된 키는 키 자체 반환 (fallback). localStorage 'am_lang' 영속.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'ko' | 'en';

/** Translation dictionary — 모든 사용자 노출 문자열. 키 형식: "domain.subkey". */
export const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  // Header / nav
  'header.materials': { ko: '재료', en: 'materials' },
  'header.search.placeholder': { ko: '재료·합금·공정 검색…', en: 'Search materials, alloys, processes…' },
  'header.guide': { ko: '가이드', en: 'Guide' },
  'header.guide.tooltip': { ko: '가이드·사례 빠른 시작', en: 'Guide · scenario quick start' },
  'header.scenarioCompare': { ko: '사례 비교', en: 'Compare scenarios' },
  'header.scenarioCompare.tooltip': { ko: '두 사례 동시 입력 + 산출 비교', en: 'Side-by-side scenario inputs + outputs' },
  'header.compare': { ko: 'Compare', en: 'Compare' },
  'header.import': { ko: 'Import', en: 'Import' },
  'header.import.tooltip': { ko: '가공집 재료 목록 파일 → collection', en: 'Import shop material list file → collection' },
  'header.collections': { ko: 'Collections', en: 'Collections' },
  'header.exportCsv.tooltip': { ko: 'CSV 내보내기', en: 'Export to CSV' },
  'header.unit.si': { ko: 'SI', en: 'SI' },
  'header.unit.imperial': { ko: '영미식', en: 'IMP' },
  'header.viewMode.table': { ko: '테이블', en: 'Table' },
  'header.viewMode.cards': { ko: '카드', en: 'Cards' },
  'header.viewMode.ashby': { ko: 'Ashby', en: 'Ashby' },

  // Results / banner
  'results.count': { ko: '결과', en: 'results' },
  'results.clearFilters': { ko: '필터 초기화', en: 'clear filters' },
  'banner.scenarioApplied': { ko: '사례 적용', en: 'Scenario applied' },
  'banner.recommendedIndex': { ko: '권장 Index', en: 'Recommended index' },
  'banner.editAgain': { ko: '다시 편집', en: 'Edit again' },
  'banner.resetFilters': { ko: '필터 초기화', en: 'Reset filters' },
  'banner.closeBanner': { ko: '배너 닫기', en: 'Dismiss banner' },
  'banner.switchTo.ashby': { ko: 'Ashby로 보기', en: 'Switch to Ashby' },
  'banner.switchTo.cards': { ko: 'Cards로 보기', en: 'Switch to Cards' },
  'banner.switchTo.table': { ko: 'Table로 보기', en: 'Switch to Table' },
  'banner.pinned': { ko: '재료 chart 선택 핀', en: 'materials pinned from chart' },
  'banner.save': { ko: '저장', en: 'Save' },
  'banner.share': { ko: '공유', en: 'Share' },
  'banner.copied': { ko: '복사됨!', en: 'Copied!' },
  'banner.clear': { ko: '비우기', en: 'Clear' },

  // Filter sidebar
  'filter.title': { ko: '필터', en: 'Filters' },
  'filter.reset': { ko: '초기화', en: 'Reset' },
  'filter.category': { ko: '카테고리', en: 'Category' },
  'filter.elementRange': { ko: '원소 함량', en: 'Element Range' },
  'filter.process': { ko: '공정', en: 'Process' },
  // R57 — KO property 라벨에 영문 병기 (한국어 모드에서도 학술/표준 영문 한 눈에 확인 가능).
  'filter.density': { ko: '밀도 (Density)', en: 'Density' },
  'filter.yieldStrength': { ko: '항복강도 (Yield Strength)', en: 'Yield Strength' },
  'filter.uts': { ko: 'UTS', en: 'UTS' },
  'filter.elongation': { ko: '연신율 (Elongation)', en: 'Elongation' },
  'filter.modulus': { ko: "탄성계수 (Young's Modulus)", en: "Young's Modulus" },
  'filter.hardness': { ko: '경도 (Hardness)', en: 'Hardness' },
  'filter.popularity': { ko: '인기도 (Popularity)', en: 'Popularity' },
  'filter.family': { ko: '소재 패밀리 (Family)', en: 'Family' },
  'filter.fatigueStrength': { ko: '피로 한도 (Fatigue Strength)', en: 'Fatigue Strength' },
  'filter.impactStrength': { ko: '충격 인성 (Impact / Charpy)', en: 'Impact (Charpy)' },
  'filter.thermalConductivity': { ko: '열전도도 (Thermal Conductivity)', en: 'Thermal Conductivity' },
  'filter.electricalConductivity': { ko: '전기전도도 (Electrical Conductivity)', en: 'Electrical Conductivity' },
  'filter.maxServiceTemp': { ko: '최대 사용 온도 (Max Service Temp)', en: 'Max Service Temp' },
  'filter.price': { ko: '단가 (Price)', en: 'Price' },
  'filter.thermalExpansion': { ko: '열팽창 (Thermal Expansion / CTE)', en: 'Thermal Expansion (CTE)' },
  'filter.meltingPoint': { ko: '용융점 (Melting / Liquidus)', en: 'Melting / Liquidus' },
  'filter.specificHeat': { ko: '비열 (Specific Heat)', en: 'Specific Heat' },
  'filter.poissonRatio': { ko: "푸아송비 (Poisson's Ratio)", en: "Poisson's Ratio" },
  'filter.fractureToughness': { ko: '파괴 인성 (Fracture Toughness)', en: 'Fracture Toughness' },
  'filter.totalCost': { ko: '총 추정 단가 (Total Cost est.)', en: 'Total Cost (est.)' },
  'filter.machiningFactor': { ko: '가공 비용 가중치 (Machining factor)', en: 'Machining factor' },
  'filter.htFactor': { ko: '열처리 비용 가중치 (HT factor)', en: 'HT factor' },
  'filter.minWall': { ko: '최소 벽 두께 (Min wall)', en: 'Min wall' },
  'filter.surfaceRa': { ko: '표면 거칠기 (Surface Ra)', en: 'Surface Ra' },
  'filter.corrosion': { ko: '내식성 (Corrosion resistance)', en: 'Corrosion resistance' },
  'filter.machinability': { ko: '가공성 (Machinability)', en: 'Machinability' },
  'filter.weldability': { ko: '용접성 (Weldability)', en: 'Weldability' },
  'filter.rohsOnly': { ko: 'RoHS 통과만 (EU 규제)', en: 'RoHS compliant only' },

  // Compare panel
  'compare.title': { ko: '재료 비교', en: 'Material Comparison' },
  'compare.columns': { ko: '컬럼', en: 'Columns' },
  'compare.clearAll': { ko: '전체 비우기', en: 'Clear all' },
  'compare.empty': { ko: '비교할 재료를 선택하세요 (최대 30개)', en: 'Select materials to compare (up to 30)' },
  'compare.hint': { ko: '컬럼 헤더 클릭으로 정렬 · 가로 막대 = 컬럼 최댓값 대비 비율', en: 'Click a column header to sort · bar = value vs the highest in column' },
  'compare.material': { ko: '재료', en: 'MATERIAL' },

  // Chart / Ashby
  'chart.filter': { ko: '필터', en: 'Filter' },
  'chart.envelopes': { ko: '외피', en: 'Envelopes' },
  'chart.envelopes.show': { ko: '표시', en: 'Show' },
  'chart.envelopes.short': { ko: '외피', en: 'Env' },
  'chart.envelopes.metals': { ko: '전체 금속/폴리머', en: 'All metals/polymers' },
  'chart.envelopes.family1': { ko: '1차 family', en: '1st-level family' },
  'chart.envelopes.family2': { ko: '하위 family', en: 'Sub-family (2nd)' },
  'chart.pareto': { ko: 'Pareto', en: 'Pareto' },
  'chart.pareto.tooltip': { ko: 'Pareto frontier — X·Y 두 물성의 trade-off 외곽선', en: 'Pareto frontier — X·Y trade-off outline' },
  'chart.display': { ko: 'Display', en: 'Display' },
  'chart.allClasses': { ko: '전체 분류', en: 'All classes' },
  'chart.allFamilies': { ko: '전체 family', en: 'All families' },
  'chart.index': { ko: 'Index', en: 'Index' },
  'chart.indexOff': { ko: '없음', en: 'Off' },

  // Scenario
  'scenario.dialog.title': { ko: '사례 적용', en: 'Apply Scenario' },
  'scenario.apply': { ko: '적용하고 시작', en: 'Apply and start' },
  'scenario.cancel': { ko: '취소', en: 'Cancel' },
  'scenario.section': { ko: '단면 형상', en: 'Section shape' },
  'scenario.strongAxis': { ko: '강축', en: 'Strong axis' },
  'scenario.weakAxis': { ko: '약축', en: 'Weak axis' },
  'scenario.strongAxis.sub': { ko: '하중 ⊥ h/H — 가장 효율', en: 'Load ⊥ h/H — most efficient' },
  'scenario.weakAxis.sub': { ko: '하중 ⊥ b/B — I 작아짐', en: 'Load ⊥ b/B — smaller I' },
  'scenario.loadDirection': { ko: '하중 방향 (이 단면의 축)', en: 'Load direction (section axis)' },
  'scenario.result': { ko: '산출 결과 (라이브)', en: 'Result (live)' },
  'scenario.fillValues': { ko: '입력값을 확인해 주세요.', en: 'Please check input values.' },
  'scenario.appliesToFilter': { ko: '위 값들이 좌측 필터에 자동 입력됩니다. Index는 차트 상단에서 골라주세요.', en: 'Values above auto-populate the left filters. Pick Index at the chart top.' },
  'scenario.recommendedIndex': { ko: '권장 Index', en: 'Recommended Index' },
  'scenario.compare.title': { ko: '두 사례 동시 비교', en: 'Compare two scenarios' },
  'scenario.compare.description': { ko: '두 사례를 옆에 두고 산출치를 비교 — 예: bracket 외팔보 vs gear 굽힘 → 어느 σy 가 더 엄격한지 확인.', en: 'Place two scenarios side by side and compare outputs — e.g. bracket cantilever vs gear bending → which σy is stricter.' },
  'scenario.compare.bothNote': { ko: '"두 사례 모두 적용" 시 두 필터의 교집합 만 통과.', en: '"Apply both" passes only the intersection of the two filters.' },
  'scenario.compare.pick': { ko: '사례 선택…', en: 'Select scenario…' },
  'scenario.compare.empty': { ko: '왼쪽의 드롭다운에서 비교할 사례를 선택하세요.', en: 'Pick a scenario from the dropdown on the left to compare.' },
  'scenario.compare.summary': { ko: '산출 결과', en: 'Result' },
  'scenario.compare.invalid': { ko: '입력값 확인', en: 'Check inputs' },
  'scenario.compare.left': { ko: '좌측 (A)', en: 'Left (A)' },
  'scenario.compare.right': { ko: '우측 (B)', en: 'Right (B)' },
  'scenario.compare.applyLeft': { ko: 'A 만 적용', en: 'Apply A only' },
  'scenario.compare.applyRight': { ko: 'B 만 적용', en: 'Apply B only' },
  'scenario.compare.applyBoth': { ko: 'A ∩ B 적용 (교집합)', en: 'Apply A ∩ B (intersect)' },
  'scenario.compare.preview': { ko: '📐 교집합 미리보기', en: '📐 Intersection preview' },
  'scenario.compare.emptyWarn': { ko: '가 빈 교집합 → 적용 시 통과 재료 0개. 두 사례가 충돌함.', en: ' is empty intersection → 0 materials pass. The two scenarios conflict.' },
  'scenario.warn.label': { ko: '⚠ 입력 경고', en: '⚠ Input warning' },

  // Material detail
  'detail.properties': { ko: '물성', en: 'Properties' },
  'detail.composition': { ko: '조성', en: 'Composition' },
  'detail.process': { ko: '공정', en: 'Process' },
  'detail.confidence': { ko: '신뢰도', en: 'Confidence' },
  'detail.confidence.measured': { ko: '실측 다수', en: 'measured (many)' },
  'detail.confidence.handbook': { ko: '표준 데이터시트', en: 'handbook' },
  'detail.confidence.class': { ko: '클래스 대표(추정)', en: 'class typical (estimated)' },
  'detail.confidence.derived': { ko: '다른 물성에서 유도', en: 'derived from other properties' },
  'detail.tempCurve.title': { ko: '온도 의존성 — 강도·강성', en: 'Strength & Modulus vs Temperature' },
  'detail.creep.title': { ko: '크리프 파단 (응력 vs 시간)', en: 'Creep Rupture (stress vs time)' },
  'detail.creep.dataPts': { ko: '데이터 포인트', en: 'data pts' },
  'detail.creep.source': { ko: 'Larson-Miller 보간 — 데이터시트 (Special Metals SMC, Haynes International) 표준값. 실 사용 시 안전계수 적용.', en: 'Larson-Miller interpolation — datasheet (Special Metals SMC, Haynes International) values. Apply safety factor in practice.' },
  'detail.regulated.title': { ko: '⚠ 규제 우려', en: '⚠ Regulatory concern' },
  'detail.regulated.rohsFail': { ko: 'RoHS 미통과', en: 'RoHS non-compliant' },
  'detail.regulated.svhc': { ko: 'SVHC', en: 'SVHC' },
  'detail.regulated.note': { ko: '자동 검출 (composition 기반). EU·국내 전자제품 출시 시 실측 검증 필요.', en: 'Auto-detected (composition-based). Verify with measurements before EU/domestic electronics release.' },
  'detail.coatings.title': { ko: '권장 후공정 (R17)', en: 'Recommended surface treatments' },
  'detail.coatings.thickness': { ko: '두께', en: 'thickness' },
  'detail.coatings.cost': { ko: '비용', en: 'cost' },
  'detail.compare.added': { ko: 'Compare 에 추가됨', en: 'Added to Compare' },
  'detail.compare.add': { ko: 'Compare 에 추가', en: 'Add to Compare' },
  'detail.sources': { ko: '출처 · 데이터시트', en: 'Sources & Datasheets' },

  // Banner — restrict / pinned / saved collection
  'banner.materialsPinned': { ko: 'chart 선택에서 핀된 재료', en: 'materials pinned from chart selection' },
  'banner.tableCards': { ko: '(table & cards)', en: '(table & cards)' },
  'banner.collectionName': { ko: 'collection 이름', en: 'collection name' },

  // Toast
  'toast.ashbyIndexAuto': { ko: 'Ashby Index 자동 적용', en: 'Ashby index auto-applied' },
  'toast.ashbyAxisAuto': { ko: 'Ashby 축 자동 전환', en: 'Ashby axes auto-switched' },

  // Common buttons
  'common.cancel': { ko: '취소', en: 'Cancel' },
  'common.save': { ko: '저장', en: 'Save' },
  'common.delete': { ko: '삭제', en: 'Delete' },
  'common.close': { ko: '닫기', en: 'Close' },
  'common.apply': { ko: '적용', en: 'Apply' },
  'common.confirm': { ko: '확인', en: 'Confirm' },
  'common.required': { ko: '필수', en: 'Required' },
  'common.optional': { ko: '선택', en: 'Optional' },
  'common.loading': { ko: '로딩 중…', en: 'Loading…' },
  'common.error': { ko: '오류', en: 'Error' },
};

const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'ko',
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem('am_lang');
      return (s === 'en' ? 'en' : 'ko') as Lang;
    } catch { return 'ko'; }
  });
  useEffect(() => {
    try { localStorage.setItem('am_lang', lang); } catch { /* ignore */ }
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => setLangState(l), []);
  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}

/** Translation hook. 누락 키는 key 자체 반환. */
export function useT() {
  const { lang } = useLang();
  return useCallback((key: string): string => {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;  // 누락된 키 — 디버그용으로 key 반환
    return entry[lang] ?? entry.ko ?? key;
  }, [lang]);
}
