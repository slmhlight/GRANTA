/*
 * R66 Sprint A — Guide 검색 인덱스.
 * 각 entry: chapter anchor (#chXX) + section title + keywords + snippet.
 * Search 시 fuzzy-substring 매칭 → 결과 dropdown.
 * 새 chapter/sub-section 추가 시 이 파일에 entry 추가 (chapter 본문 hard-coded 텍스트는 검색 대상에서 빠짐).
 */

export interface GuideIndexEntry {
  ch: string;       // anchor id (e.g. 'ch10')
  chapterN: number; // displayed chapter number
  chapterLabel: string;
  section?: string; // optional sub-section
  keywords: string[]; // search keywords (한국어 + 영어 + 약어)
  snippet: string;  // 결과 dropdown 에 보여줄 한 줄 요약
}

export const GUIDE_INDEX: GuideIndexEntry[] = [
  // Ch.1 (ch7) — 실전 사례 16선
  { ch: 'ch7', chapterN: 1, chapterLabel: '실전 사례 16선', keywords: ['사례', 'scenario', 'preset', '브래킷', 'bracket', '히트싱크', 'heatsink', '회전축', 'shaft', 'fatigue', '의료', 'medical', '극저온', 'cryogenic', '내마모', 'wear', '전기', 'electrical'], snippet: '16개 산업 설계 사례 — 클릭 한 번에 필터·차트 자동 적용' },
  { ch: 'ch7', chapterN: 1, chapterLabel: '실전 사례 16선', section: '구조 브래킷', keywords: ['brackt', '경량', '고강성', 'Scalmalloy', 'AlSi10Mg', 'Ti-6Al-4V', 'LPBF'], snippet: '경량 고강성 — 항공·드론용 LPBF 출력 브래킷' },
  { ch: 'ch7', chapterN: 1, chapterLabel: '실전 사례 16선', section: '고온 부품', keywords: ['hightemp', '700도', '터빈', '배기', 'Inconel', 'Haynes', 'P91', '800H'], snippet: '700°C 부근 — 배기 매니폴드·터빈 디스크 (Inconel 718/625/617/800H)' },
  { ch: 'ch7', chapterN: 1, chapterLabel: '실전 사례 16선', section: '의료 임플란트', keywords: ['임플란트', 'implant', '생체적합', 'CoCrMo', 'Ti6Al4V ELI', '316L', 'F75'], snippet: '생체적합 — Ti-6Al-4V ELI · CoCrMo · 316L (ISO 14801)' },

  // Ch.2 (ch6) — Ashby + 차트 인터랙션
  { ch: 'ch6', chapterN: 2, chapterLabel: 'Ashby 재료 선택법', keywords: ['Ashby', '성능지수', 'material index', 'function', 'constraint', 'objective', '자유변수', 'free variable'], snippet: 'F·C·O·Free 4 요소로 문제 정리, 성능지수 M 도출' },
  { ch: 'ch6', chapterN: 2, chapterLabel: 'Ashby 재료 선택법', section: '성능지수 표', keywords: ['E/ρ', 'E^½/ρ', 'σy/ρ', 'σy²/E', 'k/ρ', '비강도', '비강성', 'specific strength', 'specific stiffness'], snippet: 'E/ρ · σy/ρ · σy²/E · k/ρ — 기능별 성능지수 8가지' },
  { ch: 'ch6', chapterN: 2, chapterLabel: 'Ashby 재료 선택법', section: '차트 인터랙션', keywords: ['zoom', 'pan', 'box select', 'spike lines', 'reset', 'PNG', '드래그', 'index slider', 'envelope'], snippet: '확대·패닝·박스선택·Spike Lines·PNG export·Index 드래그' },
  { ch: 'ch6', chapterN: 2, chapterLabel: 'Ashby 재료 선택법', section: 'Compare 활용', keywords: ['Compare', '비교', 'Radar', 'CSV', 'PNG', 'columns', '신뢰도', 'confidence'], snippet: '후보 추가→컬럼→정렬→Radar→신뢰도→Export→검증 8단계' },

  // Ch.3 (ch10) — Family 매핑 + 환경 (신규 R65)
  { ch: 'ch10', chapterN: 3, chapterLabel: 'Family 매핑 + 환경 조건', keywords: ['family', '매핑', 'mapping', 'mental shortcut', 'shortcut', '도메인', '환경'], snippet: '도메인 → 우선 검토 family 30초 매핑' },
  { ch: 'ch10', chapterN: 3, chapterLabel: 'Family 매핑 + 환경 조건', section: '도메인 매핑', keywords: ['구조', '경량', 'lightweight', 'aluminum', 'titanium', 'magnesium', '고온', 'high temp', '내식', 'corrosion', '전기전도', 'electrical', 'conductivity', '내마모', 'wear', '생체', 'biocompatible', 'CTE', 'low CTE', '방열', '히트싱크', '탄성에너지', 'spring', '압력용기'], snippet: '10 도메인 (구조·고온·내식·전기·내마모·생체·CTE·방열·스프링·압력) → family' },
  { ch: 'ch10', chapterN: 3, chapterLabel: 'Family 매핑 + 환경 조건', section: '환경 조건', keywords: ['해수', 'seawater', '산성', 'acid', '알칼리', 'alkaline', '저온', 'cryogenic', 'DBTT', '방사선', 'radiation', 'H2', '수소취화', 'embrittlement', '갈바닉', 'galvanic', 'MIC', '미생물'], snippet: '10 환경 (해수·산·알칼리·고온·저온·방사선·마모·H2·갈바닉·MIC) → 적합/회피' },

  // Ch.4 (ch1) — 물성 사전 + HT
  { ch: 'ch1', chapterN: 4, chapterLabel: '물성 사전 + HT 글로서리', keywords: ['물성', 'property', 'σy', 'yield', 'UTS', 'tensile', 'E', 'modulus', '탄성계수', 'ρ', 'density', 'HV', 'hardness', '경도', '연신', 'elongation', 'CTE', '열전도', 'thermal conductivity'], snippet: '핵심 물성 8개 — σy/UTS/El/E/HV/ρ/k/CTE + 의미·범위·용도' },
  { ch: 'ch1', chapterN: 4, chapterLabel: '물성 사전 + HT 글로서리', section: 'HT 글로서리 26행', keywords: ['heat treatment', '열처리', 'H900', 'H1025', 'H1075', 'H1100', 'H1150', '17-4 PH', 'STA', 'aged', 'solution', 'Q+T', 'quenched', 'tempered', 'annealed', 'normalized', 'HIP', 'as-built', 'T6', 'T651', 'T7', 'T4', 'O temper', 'H-temper', 'mill annealed', 'beta annealed', 'SA aged'], snippet: '26 HT condition — H900·STA·Q+T·HIP·T6·MA·β-annealed 등 + 효과' },

  // Ch.5 (ch2) — 요구→숫자 + SF 사전
  { ch: 'ch2', chapterN: 5, chapterLabel: '요구→숫자 + 안전계수', keywords: ['σ=F/A', '응력', 'stress', 'F/A', '처짐', 'deflection', 'E·I', '안전계수', 'safety factor', 'SF'], snippet: '응력 σ=F/A 에서 필요 σy 산출 + 처짐 식에서 E 산출' },
  { ch: 'ch2', chapterN: 5, chapterLabel: '요구→숫자 + 안전계수', section: 'SF 사전', keywords: ['안전계수', 'safety factor', 'SF', '항공', '자동차', '압력용기', 'ASME', 'AISC', 'FAR', 'EUROCODE', '의료', 'crane', '엘리베이터'], snippet: '9 산업 SF (항공 1.5 / 자동차 2-3 / 압력용기 3-4 / 엘리베이터 8-12) + 조건별 가산' },

  // Ch.6 (ch3) — 단면 도감
  { ch: 'ch3', chapterN: 6, chapterLabel: '단면 성질 도감', keywords: ['단면', 'cross section', 'A', 'I', 'Z', 'J', 'moment of inertia', 'section modulus', 'polar moment'], snippet: '면적 A · 2차 모멘트 I · 단면계수 Z · 극관성 J' },

  // Ch.7 (ch4) — 보 처짐
  { ch: 'ch4', chapterN: 7, chapterLabel: '보 처짐·모멘트', keywords: ['보', 'beam', '외팔', 'cantilever', '단순지지', 'simply supported', '고정-고정', 'fixed', '처짐', 'deflection', '모멘트', 'bending moment'], snippet: '6가지 표준 하중·지지조건 — 최대 처짐 / 최대 모멘트 식' },

  // Ch.8 (ch5) — 비틀림·좌굴·복합·압력
  { ch: 'ch5', chapterN: 8, chapterLabel: '비틀림·좌굴·복합·압력', keywords: ['비틀림', 'torsion', 'TL/GJ', '좌굴', 'buckling', 'Euler', 'P_cr', 'von Mises', 'σ_eq', 'Mohr', '주응력', 'principal stress', '압력용기', 'hoop'], snippet: '비틀림 · Euler 좌굴 · von Mises · Mohr · 압력용기 hoop' },

  // Ch.9 (ch11) — 흔한 실수 10선 (신규 R65)
  { ch: 'ch11', chapterN: 9, chapterLabel: '흔한 설계 실수 10선', keywords: ['실수', 'mistake', 'pitfall', 'failure', '실패', '취성', 'brittle', 'KIC', '갈바닉', 'galvanic', '노치', 'notch', '용접성', 'weldability', 'H 취화', 'embrittlement', 'DBTT', 'CTE mismatch'], snippet: 'KIC 무시·AM Z 피로·표면거칠기·갈바닉·노치·H 취화·DBTT 등 10가지' },

  // Ch.10 (ch9) — AM 특화
  { ch: 'ch9', chapterN: 10, chapterLabel: 'AM (적층제조) 특화', keywords: ['AM', 'additive', '적층', 'LPBF', 'EBM', 'DED', 'Binder Jet', '이방성', 'anisotropy', 'XY', 'Z', 'HIP', '잔류응력', 'residual stress', '분말', 'powder', 'PSD'], snippet: '이방성 (Z 30-70%) + 7단계 후처리 + 4 공정 비교 + 분말 spec' },
  { ch: 'ch9', chapterN: 10, chapterLabel: 'AM (적층제조) 특화', section: '4 AM 공정 비교', keywords: ['LPBF', 'SLM', 'DMLS', 'EBM', 'electron beam', 'DED', 'LMD', 'DMD', 'binder jetting'], snippet: 'LPBF · EBM · DED · Binder Jetting — 강점·약점·표준 합금' },
  { ch: 'ch9', chapterN: 10, chapterLabel: 'AM (적층제조) 특화', section: '후처리', keywords: ['stress relief', 'HIP', 'hot isostatic press', 'solution', 'aging', '기공', 'porosity', 'CT scan'], snippet: 'Stress relief → HIP → SA+Aging → 기계가공 → 표면처리 → CT 검사' },

  // Ch.11 (ch12) — 인증·가공·시험 (신규 R65)
  { ch: 'ch12', chapterN: 11, chapterLabel: '인증·가공·시제품 시험', keywords: ['인증', 'certification', 'AS9100', 'NADCAP', 'ISO 13485', 'FDA', 'ASME', 'NACE', 'MMPDS', 'EUROCODE', 'FAR'], snippet: '9 산업 인증 매핑 + 7 공정 가능성 + 10 시제품 시험' },
  { ch: 'ch12', chapterN: 11, chapterLabel: '인증·가공·시제품 시험', section: '가공성', keywords: ['machinability', '절삭성', 'welding', '용접성', 'CET', '성형성', 'forming', 'forging', '단조', 'casting', '주조'], snippet: 'Machinability rating · CET · n-value · forging · casting · AM' },
  { ch: 'ch12', chapterN: 11, chapterLabel: '인증·가공·시제품 시험', section: '시제품 시험 10종', keywords: ['ASTM E8', 'tensile', 'Charpy', 'E23', 'hardness', 'fatigue', 'E466', 'KIC', 'E399', 'CT scan', 'NDT', 'FPI'], snippet: '인장 E8 · Charpy E23 · 피로 E466 · KIC E399 · CT · FPI · fractography' },

  // Ch.12 (ch14) — Case study (신규 R65)
  { ch: 'ch14', chapterN: 12, chapterLabel: '산업 case study 5선', keywords: ['case study', '사례 분석', 'F1', 'engine block', 'JWST', 'beryllium', 'SpaceX', 'Raptor', 'Tesla', 'giga press', 'DJI', '인공 관절', 'hip replacement'], snippet: 'F1 엔진 / JWST mirror / Raptor / Tesla giga press / 드론·인공관절' },

  // Ch.13 (ch8) — 데이터 해석·datasheet·FAQ
  { ch: 'ch8', chapterN: 13, chapterLabel: '데이터 해석·출처·단위·FAQ', keywords: ['datasheet', 'typical', 'minimum', 'A-basis', 'B-basis', 'MMPDS', '신뢰도', 'confidence', 'measured', 'handbook', 'class', 'derived'], snippet: 'typical / min / A-basis / B-basis 의 의미 + 4 confidence 라벨' },
  { ch: 'ch8', chapterN: 13, chapterLabel: '데이터 해석·출처·단위·FAQ', section: '출처', keywords: ['ASM', 'MMPDS', 'Aluminum Association', 'Special Metals', 'Haynes', 'Carpenter', 'EOS', 'Renishaw', 'Shigley', 'ECCC', 'LME'], snippet: '11 출처 — ASM · MMPDS · vendor · 교과서 · 규격' },
  { ch: 'ch8', chapterN: 13, chapterLabel: '데이터 해석·출처·단위·FAQ', section: '단위 변환', keywords: ['SI', 'imperial', 'MPa', 'ksi', 'GPa', 'Msi', 'Celsius', 'Fahrenheit', 'lb/in3', 'BTU'], snippet: 'MPa↔ksi · GPa↔Msi · °C↔°F · g/cm³↔lb/in³ · KIC' },
  { ch: 'ch8', chapterN: 13, chapterLabel: '데이터 해석·출처·단위·FAQ', section: 'FAQ 10항목', keywords: ['FAQ', 'collection', 'shortcut', 'language', 'unit', 'reset', 'bookmark', 'URL'], snippet: '같은 합금 여러 row / class 신뢰성 / AM 방향 / 단위 / collection 등' },

  // Ch.15 (chGloss) — 기술용어 사전 (글로서리)
  { ch: 'chGloss', chapterN: 15, chapterLabel: '기술용어 사전 (글로서리)', keywords: ['글로서리', 'glossary', '용어', '용어사전', 'term', '정의', 'definition', '마르텐사이트', 'martensite', '오스테나이트', 'austenite', '석출경화', 'precipitation', '크리프', 'creep', '피로', 'fatigue', '내식성', 'corrosion', '부동태', 'passivation', '예민화', 'sensitization', '인성', 'toughness', '담금질', 'quench', '뜨임', 'temper', '시효', 'aging'], snippet: '금속·재료 전문용어 — 미세조직·강화·열처리·부식·파괴·성형·AM 표준 정의 + 검색' },
];

/** R66 — 단순 substring match (fuzzy 는 너무 노이즈). 다국어 (KO+EN) 동시 매칭 위해 keywords 가 다국어 포함. */
export function searchGuide(q: string): GuideIndexEntry[] {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];
  return GUIDE_INDEX.filter((e) => {
    const haystack = [e.chapterLabel, e.section || '', e.snippet, ...e.keywords].join(' ').toLowerCase();
    return haystack.includes(query);
  }).slice(0, 12);
}
