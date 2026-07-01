/*
 * R226e — 출처 라벨 도출 공유 모듈 (build-from-registry presentation, C1).
 *
 * placeholder 라벨("Datasheet N"·"MatWeb N", URL 은 실재) → URL 도메인 기반 서술 라벨.
 * url 필드에 표준 인용(비-http 텍스트)이 든 경우 그 텍스트를 라벨로 승격(+ 가짜 url 제거).
 * 값 SSOT(레지스트리)는 불변 — presentation 도출.
 */
export const PUBLISHER = {
  'matweb.com': 'MatWeb datasheet', 'poongsan.co.kr': 'Poongsan datasheet', 'hyundai-steel.com': 'Hyundai Steel datasheet',
  'aksteel.com': 'AK Steel (Cleveland-Cliffs) datasheet', 'carpentertechnology.com': 'Carpenter Technology datasheet',
  'store.astm.org': 'ASTM standard', 'haynesintl.com': 'Haynes International datasheet', 'plansee.com': 'Plansee datasheet',
  'outokumpu.com': 'Outokumpu datasheet', 'specialmetals.com': 'Special Metals datasheet', 'product.posco.com': 'POSCO datasheet',
  'aluminum.org': 'Aluminum Association', 'en-standard.eu': 'EN standard', 'api.org': 'API standard', 'batelle.org': 'Battelle / MMPDS',
  'uddeholm.com': 'Uddeholm datasheet', 'bohler.uddeholm.com': 'Böhler-Uddeholm datasheet', 'kaiseraluminum.com': 'Kaiser Aluminum datasheet',
  'alcoa.com': 'Alcoa datasheet', 'ssab.com': 'SSAB datasheet', 'ntrs.nasa.gov': 'NASA technical report', 'nasa.gov': 'NASA technical report',
  'aisc.org': 'AISC steel construction', 'azom.com': 'AZoM materials', 'everyspec.com': 'EverySpec (MIL-SPEC)', 'eccc-creep.com': 'ECCC creep data',
  'crucible.com': 'Crucible Industries datasheet', 'celanese.com': 'Celanese datasheet', 'worldautosteel.org': 'WorldAutoSteel (AHSS)',
  'jisc.go.jp': 'JIS standard', 'spsfasteners.com': 'SPS Technologies', 'energy-steel.com': 'Energy Steel', 'additive.oerlikon.com': 'Oerlikon AM datasheet',
  'automotive.arcelormittal.com': 'ArcelorMittal datasheet', 'ww2.eagle.org': 'ABS (Bureau of Shipping)', 'kssa.co.kr': 'Korea steel datasheet',
  'rohacell.com': 'Rohacell (Evonik) datasheet', 'constellium.com': 'Constellium datasheet', 'portlandbolt.com': 'Portland Bolt',
  'copper.org': 'Copper Development Association', 'bgh.de': 'BGH Edelstahl datasheet', 'asme.org': 'ASME standard', 'nipponsteel.com': 'Nippon Steel datasheet',
  'leecosteel.com': 'Leeco Steel', 'daido.co.jp': 'Daido Steel datasheet', 'vestamid.com': 'VESTAMID (Evonik) datasheet', 'plastics-rubber.basf.com': 'BASF datasheet',
  'metalsusa.com': 'Metals USA', 'hightempmetals.com': 'High Temp Metals', 'octalmetals.com': 'Octal Metals', 'kist.re.kr': 'KIST',
  'rolledalloys.com': 'Rolled Alloys', 'alleghenytechnologies.com': 'ATI datasheet', 'timetal.com': 'TIMET datasheet',
};

/** placeholder("Datasheet N"/"MatWeb N") 라벨만 도메인 서술 라벨로 승격. 그 외는 원본 그대로 반환(동일 참조). */
export function improveLabel(s) {
  if (!/^(Datasheet|MatWeb) \d+$/.test(s.label || '')) return s;
  const url = s.url || '';
  if (!/^https?:/i.test(url)) return url ? { ...s, label: url, url: undefined } : s;   // url 이 비-http 인용 → 라벨로 승격
  const dom = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  return { ...s, label: PUBLISHER[dom] || `${dom} datasheet` };
}
