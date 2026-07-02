/*
 * R226g/축3d — elevated-temp/creep 곡선 외부 확장 파이프 (순수함수).
 * build-materials 의 인라인 ELEV_DATA(동결)를 건드리지 않고 data/elevated-temp-curves.json 으로 확장.
 * 매칭: injectTempCurves 와 동일한 name-substring(lowercase) 규칙. 기존 곡선 보유 entry 는 불변(인라인 우선).
 *
 * curves 테이블 형식: { "<name substring>": { elevated_temp: [{temp, ys, uts, E?}...], creep_rupture?: [...], src?: "인용" } }
 * 값 정책: 검증된 datasheet/핸드북 수치만 (COVERAGE-GAPS §3 이 후보 44 제공 — 분기 캠페인·사용자 PDF 제공으로 채움).
 */
export function attachElevCurves(m, table) {
  if (!m || !m.name || !table) return false;
  const n = String(m.name).toLowerCase();
  for (const [pattern, data] of Object.entries(table)) {
    if (!n.includes(String(pattern).toLowerCase())) continue;
    let attached = false;
    if (Array.isArray(data.elevated_temp) && data.elevated_temp.length && (!m.elevated_temp || m.elevated_temp.length === 0)) {
      m.elevated_temp = data.elevated_temp;
      attached = true;
    }
    if (Array.isArray(data.creep_rupture) && data.creep_rupture.length && !m.creep_rupture) {
      m.creep_rupture = data.creep_rupture;
      attached = true;
    }
    if (attached && data.src) (m.meta = m.meta || {}).elev_curve_src = data.src;
    if (attached) return true;
  }
  return false;
}
