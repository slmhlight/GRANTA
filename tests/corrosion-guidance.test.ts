/*
 * H6 E15 — Corrosion 카드 게이트.
 * ① SSOT 스키마: assignment→groups parity(빌드 게이트와 동일) · 그룹 필수 필드 · enum 유효
 * ② 커버리지: profiles.corr 스탬프 규모 (Metal 대부분 + Polymer/Ceramic 전량, Composite 는 의도적 부재)
 * ③ 합금 앵커: 그룹 배정 + 모드 캐비엇(단일 등급이 취약 모드를 가리지 않는다는 원칙의 회귀 앵커)
 * ④ PREN: 실조성 계산 검증 (2205≈36 · 304=18 하한 · Al→null)
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resolveCorrosionPlan, prenOf, prenBand, alloyNoteFor } from '@/lib/corrosion-guidance';
import type { Material } from '@/lib/materials';
import guidance from '../data/corrosion-guidance.json';

const mats: Material[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'client/public/materials.json'), 'utf8'));
const byName = (n: string) => mats.find((m) => m.name === n);
const g = guidance as any;

describe('corrosion-guidance SSOT 스키마', () => {
  it('assignment 대상 그룹 전부 정의됨 (parity)', () => {
    for (const [src, tbl] of Object.entries<Record<string, string>>(g.assignment)) {
      for (const [k, v] of Object.entries(tbl)) {
        expect(g.groups[v], `assignment.${src}.${k} → '${v}'`).toBeDefined();
      }
    }
  });
  it('전 그룹: title·intro·modes(≥1)·sources(≥1) + enum 유효', () => {
    const V = new Set(['excellent', 'good', 'caution', 'poor']);
    const R = new Set(['high', 'med', 'low']);
    for (const [key, gr] of Object.entries<any>(g.groups)) {
      expect(gr.title, key).toBeTruthy();
      expect(String(gr.intro).length, `${key} intro`).toBeGreaterThan(30);
      expect(gr.modes.length, `${key} modes`).toBeGreaterThanOrEqual(1);
      expect(gr.sources.length, `${key} sources`).toBeGreaterThanOrEqual(1);
      for (const m of gr.media) expect(V.has(m.verdict), `${key} verdict '${m.verdict}'`).toBe(true);
      for (const m of gr.modes) expect(R.has(m.risk), `${key} risk '${m.risk}'`).toBe(true);
    }
  });
  it('매체 6축 고정 — 전 그룹 동일 축·동일 순서 (해수/염수·강산/약산 분리 — 사용자 지시)', () => {
    const AXES = ['대기', '해수', '염수·염화물', '강산', '약산(묽은산·유기산)', '알칼리'];
    for (const [key, gr] of Object.entries<any>(g.groups)) {
      expect(gr.media.map((m: any) => m.env), `${key} 매체 축`).toEqual(AXES);
    }
  });
  it('강산/약산 verdict 실분화 — 축만 쪼갠 형식 분리가 아님', () => {
    // 대표 앵커: 오스테나이트 SS(강산 caution ↔ 약산 good) · Ti(강산 caution ↔ 해수 excellent)
    const ss = g.groups['ss-austenitic'].media;
    expect(ss.find((m: any) => m.env === '강산').verdict).toBe('caution');
    expect(ss.find((m: any) => m.env.startsWith('약산')).verdict).toBe('good');
    const ti = g.groups['ti'].media;
    expect(ti.find((m: any) => m.env === '해수').verdict).toBe('excellent');
    expect(ti.find((m: any) => m.env === '강산').verdict).toBe('caution');
    // 전 그룹 통계: 강산≠약산 verdict 인 그룹이 3분의 1 이상 (실분화 증명)
    const diff = Object.values<any>(g.groups).filter((gr) => {
      const s = gr.media.find((m: any) => m.env === '강산')?.verdict;
      const w = gr.media.find((m: any) => m.env.startsWith('약산'))?.verdict;
      return s !== w;
    }).length;
    expect(diff).toBeGreaterThanOrEqual(8);
  });
});

describe('커버리지 (profiles.corr 스탬프)', () => {
  it('Metal ≥900 · Polymer/Ceramic 전량 · Composite 0 (의도적 hide)', () => {
    const has = (m: Material) => !!(m.profiles as any)?.corr;
    const cnt = (cat: string) => mats.filter((m) => m.category === cat && has(m)).length;
    expect(cnt('Metal')).toBeGreaterThanOrEqual(900);
    expect(cnt('Polymer')).toBe(mats.filter((m) => m.category === 'Polymer').length);
    expect(cnt('Ceramic')).toBe(mats.filter((m) => m.category === 'Ceramic').length);
    expect(cnt('Composite')).toBe(0);
  });
});

describe('합금 앵커 — 그룹 배정 + 모드 캐비엇', () => {
  it('AISI 304 → ss-austenitic + 염화물 SCC 위험 high 명시', () => {
    const p = resolveCorrosionPlan(byName('AISI 304 — Annealed (Wrought)')!)!;
    expect(p.groupKey).toBe('ss-austenitic');
    const scc = p.group.modes.find((m) => m.mode.includes('SCC'));
    expect(scc?.risk).toBe('high');
  });
  it('2205 Duplex → ss-duplex + SCC 저항 low(강점) + σ상 주의', () => {
    const p = resolveCorrosionPlan(byName('2205 Duplex Stainless')!)!;
    expect(p.groupKey).toBe('ss-duplex');
    expect(p.group.modes.find((m) => m.mode.includes('SCC'))?.risk).toBe('low');
    expect(p.group.modes.some((m) => m.mode.includes('σ상'))).toBe(true);
  });
  it('마레이징 → maraging (Cr 없음 녹 함정 그룹) + HE high', () => {
    const m = mats.find((x) => /^Maraging 250/.test(x.name))!;
    const p = resolveCorrosionPlan(m)!;
    expect(p.groupKey).toBe('maraging');
    expect(p.group.modes.find((x) => x.mode.includes('수소취성'))?.risk).toBe('high');
  });
  it('AA 6061 → al-wrought + 갈바닉 high', () => {
    const p = resolveCorrosionPlan(byName('AA 6061 — T6')!)!;
    expect(p.groupKey).toBe('al-wrought');
    expect(p.group.modes.find((x) => x.mode.includes('갈바닉'))?.risk).toBe('high');
  });
  it('폴리머 → polymer (화학 열화 프레임) · 세라믹 → ceramic', () => {
    const peek = mats.find((m) => m.name.startsWith('PEEK — As-supplied'))!;
    expect(resolveCorrosionPlan(peek)?.groupKey).toBe('polymer');
    const al2o3 = mats.find((m) => /^Alumina/.test(m.name))!;
    expect(resolveCorrosionPlan(al2o3)?.groupKey).toBe('ceramic');
  });
  it('Composite 는 카드 생략 (null)', () => {
    const c = mats.find((m) => m.category === 'Composite')!;
    expect(resolveCorrosionPlan(c)).toBeNull();
  });
  it('조건 보정 — ss-ph + aged 는 H900 SCC 노트', () => {
    const ph = mats.find((m) => /17-4 PH/.test(m.name) && (m.profiles as any)?.htc === 'aged' && (m.profiles as any)?.corr === 'ss-ph');
    if (!ph) return; // 데이터 변동 허용
    const p = resolveCorrosionPlan(ph)!;
    expect(p.conditionNotes.some((n) => n.includes('H1025'))).toBe(true);
  });
});

describe('개별 합금 노트 (E15c — base-키 조회)', () => {
  it('alloy_notes 전 키가 실제 재료 base 와 매칭 (stale 키 차단)', () => {
    const bases = new Set<string>();
    for (const m of mats) {
      const b = m.name.split(' — ')[0].trim();
      bases.add(b);
      bases.add(b.split(' (')[0].trim());
    }
    const stale = Object.keys((g as any).alloy_notes).filter((k) => !k.startsWith('_') && !bases.has(k));
    expect(stale, `재료와 매칭 안 되는 alloy_notes 키: ${stale.join(', ')}`).toEqual([]);
  });
  it('E15d — corr 스탬프 전 엔트리가 개별 노트 해석 (636 base 100% 커버 게이트)', () => {
    const missing = new Set<string>();
    for (const m of mats) {
      if (!(m.profiles as any)?.corr) continue;
      if (alloyNoteFor(m.name) === null) missing.add(m.name.split(' — ')[0].trim());
    }
    expect([...missing], `alloy_notes 누락 base: ${[...missing].join(', ')}`).toEqual([]);
  });
  it('E15f — 전 노트 {t, src} 형식·개별 출처 필수 (배치 주석 수준 출처 재발 차단)', () => {
    const bad = Object.entries<any>((g as any).alloy_notes)
      .filter(([k]) => !k.startsWith('_'))
      .filter(([, v]) => typeof v !== 'object' || !v.t || String(v.t).length < 10 || !v.src || String(v.src).length < 2)
      .map(([k]) => k);
    expect(bad, `t/src 형식 위반 키: ${bad.join(', ')}`).toEqual([]);
  });
  it('E15h — 동일 텍스트 공유는 명시적 표기 변형 세트만 (그 외 일체 공유 = 실패)', () => {
    // 같은 재료의 표기/철자 변형만 등재. 다른 합금·등급·그레이드는 공유 금지 — 세트 추가는 리뷰 대상.
    const VARIANT_SETS: string[][] = [
      ['CuNi30', 'Cupronickel 70/30'], ['ULTEM 1010', 'Ultem 1010'], ['PSU Udel P-1700', 'Udel P-1700'],
      ['PES', 'PESU'], ['PPS Fortron 1140L4', 'PPS GF40'], ['PC', 'Polycarbonate'], ['PC-ABS', 'ABS-PC'],
      ['PS', 'Polystyrene'], ['POM Homopolymer', 'POM-H'], ['POM Copolymer', 'POM-C'], ['PP', 'Polypropylene'],
      ['PVDF', 'PVDF Kynar 740'], ['Fused Silica', 'Quartz'],
      ['API 5L X65 / L450 PSL2', 'API 5L X65 PSL2'],
      ['API 5L X70 / L485 PSL2', 'API 5L X70 PSL2', 'API 5L X70 line pipe'],
      ['AISI 4140 / 42CrMo4', '42CrMo4'], ['9% Ni Steel', 'ASTM A553 Type I'],
      ['R260 Rail Steel', 'Rail Steel R260'], ['O1', 'O1 tool steel'], ['D2', 'D2 Tool Steel'],
      ['H13', 'H13 Tool Steel', 'Tool Steel H13'], ['Maraging 300', 'Maraging C300'],
      ['AISI 304L / STS304 ULC', 'AISI 304L / STS304L', '304L'], ['Zeron 100', 'ZERON 100'],
      ['A286', 'Carpenter A-286'], ['SS420', 'Stainless Steel 420'], ['15-5 PH Stainless', '15-5PH'],
      ['Nickel 200', 'CP-Nickel'], ['Hastelloy C-22', 'Hastelloy C22'], ['Allvac 718Plus', 'Inconel 718Plus'],
      ['IN-100', 'Inconel 100'], ['C10200', 'OF Copper C10200'], ['OFE Copper C10100', 'OFHC Copper C10100'],
      ['C12200', 'DHP Copper C12200'], ['Copper', 'Cu'], ['C22000', 'Commercial Bronze C22000'],
      ['Bronze C95400', 'C95400 Aluminum Bronze'], ['Beryllium Copper C17200', 'C17200', 'Be-Cu'],
      ['Ti Grade 1', 'Ti CP Gr1'], ['Ti Grade 3', 'Ti CP Gr3'], ['Ti Grade 11', 'Titanium Grade 11'],
      ['Ti Grade 23', 'Ti-6Al-4V Grade 23 ELI'], ['Ti6242', 'Ti-6Al-2Sn-4Zr-2Mo'],
      ['A205', 'A20X / A6061-RAM2'], ['A356', 'A356.0'], ['Nb-1Zr', 'Niobium-1Zr'],
      ['C-103', 'Niobium C-103'], ['AZ80', 'AZ80A'],
    ];
    const allowed = VARIANT_SETS.map((s) => new Set(s));
    const byText = new Map<string, string[]>();
    for (const [k, v] of Object.entries<any>((g as any).alloy_notes)) {
      if (k.startsWith('_')) continue;
      const arr = byText.get(v.t) || [];
      arr.push(k);
      byText.set(v.t, arr);
    }
    const bad = [...byText.values()]
      .filter((ks) => ks.length >= 2)
      .filter((ks) => !allowed.some((set) => ks.every((k) => set.has(k))))
      .map((ks) => ks.join('|'));
    expect(bad, `allowlist 밖 공유 묶음: ${bad.join(' / ')}`).toEqual([]);
  });
  it('앵커 — 304(PREN 언급)·7075(T73 과시효)·2205(CPT)·1010(도금 모재)', () => {
    expect(alloyNoteFor('AISI 304 — Annealed (Wrought)')!.t).toMatch(/PREN ~19/);
    expect(alloyNoteFor('AA 7075 — T6')!.t).toMatch(/T73/);
    expect(alloyNoteFor('2205 Duplex Stainless')!.t).toMatch(/CPT/);
    expect(alloyNoteFor('AISI 1010 — Annealed (Wrought)')!.t).toMatch(/도금 모재/);
  });
  it('앵커 — E15f 웹 검증 교정: SHP=강널말뚝(내후성강 아님)·SG325=LPG 용기·CBN↔Diamond 분리', () => {
    const shp = alloyNoteFor('SHP275W (KS F 4603, weldable steel sheet pile) — As-rolled')!;
    expect(shp.t).toMatch(/강널말뚝/);
    expect(shp.t).not.toMatch(/내후성|녹층/);
    expect(shp.src).toMatch(/KS F 4603/);
    expect(alloyNoteFor('SG325 (KS D 3533) — Normalized')!.t).toMatch(/LPG 용기/);
    expect(alloyNoteFor('Diamond — Sintered')!.t).toMatch(/철계 절삭 금기/);
    expect(alloyNoteFor('CBN — Sintered')!.t).toMatch(/철계 고속 절삭/);
  });
  it('resolveCorrosionPlan 이 alloyNote {t, src} 를 노출', () => {
    const p = resolveCorrosionPlan(byName('AISI 304 — Annealed (Wrought)')!)!;
    expect(p.alloyNote!.t).toMatch(/316 급 검토/);
    expect(p.alloyNote!.src.length).toBeGreaterThan(2);
  });
});

describe('E15i — 합금별 매체 verdict 보정층', () => {
  const AXES = ['대기', '해수', '염수·염화물', '강산', '약산(묽은산·유기산)', '알칼리'];
  const V = new Set(['excellent', 'good', 'caution', 'poor']);
  it('스키마 — pren.groups 실재·rules/by_base 축·verdict 유효·why/src 필수', () => {
    const adj = (g as any).alloy_adjust;
    expect(adj).toBeDefined();
    for (const gk of adj.pren.groups) expect((g as any).groups[gk], `pren group '${gk}'`).toBeDefined();
    expect(adj.pren.src.length).toBeGreaterThan(3);
    for (const [env, bands] of Object.entries<any>(adj.pren.axes)) {
      expect(AXES.includes(env), `pren 축 '${env}'`).toBe(true);
      for (const [min, v] of bands) { expect(typeof min).toBe('number'); expect(V.has(v), `pren verdict '${v}'`).toBe(true); }
    }
    for (const r of adj.rules) {
      expect((g as any).groups[r.group], `rule group '${r.group}'`).toBeDefined();
      expect(r.why?.length, 'rule why').toBeGreaterThan(3);
      expect(r.src?.length, 'rule src').toBeGreaterThan(3);
      for (const [env, v] of Object.entries<any>(r.axes)) { expect(AXES.includes(env), `rule 축 '${env}'`).toBe(true); expect(V.has(v)).toBe(true); }
    }
    const bases = new Set<string>();
    for (const m of mats) { const b = m.name.split(' — ')[0].trim(); bases.add(b); bases.add(b.split(' (')[0].trim()); }
    for (const [b, ov] of Object.entries<any>(adj.by_base)) {
      expect(bases.has(b), `by_base stale 키 '${b}'`).toBe(true);
      expect(ov.why?.length).toBeGreaterThan(3);
      expect(ov.src?.length).toBeGreaterThan(3);
      for (const [env, v] of Object.entries<any>(ov.axes)) { expect(AXES.includes(env), `by_base 축 '${env}'`).toBe(true); expect(V.has(v)).toBe(true); }
    }
  });
  it('PREN 밴드 — 654 SMO 해수 excellent↑ · 304 해수 poor↓ (그룹 기본 caution 에서 양방향)', () => {
    const smo = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('654 SMO'))!)!;
    const sea1 = smo.media.find((r) => r.env === '해수')!;
    expect(sea1.verdict).toBe('excellent');
    expect(sea1.adj?.from).toBe('caution');
    expect(sea1.adj?.why).toMatch(/PREN/);
    const p304 = resolveCorrosionPlan(byName('AISI 304 — Annealed (Wrought)')!)!;
    const sea2 = p304.media.find((r) => r.env === '해수')!;
    expect(sea2.verdict).toBe('poor');
    expect(sea2.adj?.why).toMatch(/PREN 18/);
  });
  it('조성 규칙 — C28000(Zn40) 해수 poor · CuNi(Ni30) 해수 excellent · AA 2024 해수 poor · AA 5083 해수 good', () => {
    const muntz = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('C28000'))!)!;
    expect(muntz.media.find((r) => r.env === '해수')!.verdict).toBe('poor');
    const cuni = resolveCorrosionPlan(mats.find((m) => /^C71500|^Cupronickel 70/.test(m.name))!)!;
    expect(cuni.media.find((r) => r.env === '해수')!.verdict).toBe('excellent');
    const a2024 = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('AA 2024'))!)!;
    expect(a2024.media.find((r) => r.env === '해수')!.verdict).toBe('poor');
    const a5083 = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('AA 5083'))!)!;
    expect(a5083.media.find((r) => r.env === '해수')!.verdict).toBe('good');
  });
  it('E15j — 수지별 판정: PTFE 강산 excellent ↔ POM 강산 poor · PVDF 알칼리 caution 유지 · PET 알칼리 poor', () => {
    const ptfe = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('PTFE'))!)!;
    expect(ptfe.media.find((r) => r.env === '강산')!.verdict).toBe('excellent');
    const pom = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('POM Homopolymer') || m.name.startsWith('POM-H'))!)!;
    expect(pom.media.find((r) => r.env === '강산')!.verdict).toBe('poor');
    const pvdf = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('PVDF'))!)!;
    expect(pvdf.media.find((r) => r.env === '강산')!.verdict).toBe('excellent');
    expect(pvdf.media.find((r) => r.env === '알칼리')!.verdict).toBe('caution');
    const pet = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('PET ') || m.name === 'PET')!)!;
    expect(pet.media.find((r) => r.env === '알칼리')!.verdict).toBe('poor');
  });
  it('E15k — refractory 개별화: Ta 강산 excellent 무보정(그룹=판정) · V poor · Mo caution · WHA 바인더 침출', () => {
    const ta = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Tantalum ('))!)!;
    const taAcid = ta.media.find((r) => r.env === '강산')!;
    expect(taAcid.verdict).toBe('excellent');
    expect(taAcid.adj).toBeUndefined();   // Ta 는 그룹 기본이 곧 자기 판정
    const v = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Vanadium'))!)!;
    expect(v.media.find((r) => r.env === '강산')!.verdict).toBe('poor');
    const mo = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Molybdenum'))!)!;
    expect(mo.media.find((r) => r.env === '강산')!.verdict).toBe('caution');
    const wha = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Tungsten Heavy Alloy'))!)!;
    const whaAcid = wha.media.find((r) => r.env === '강산')!;
    expect(whaAcid.verdict).toBe('poor');
    expect(whaAcid.adj?.why).toMatch(/바인더/);
  });
  it('E15k — MP35N 해수 excellent · A588 대기 good(내후) · Naval Brass 해수 caution(Zn 규칙 예외 복권) · Scalmalloy 해수 good', () => {
    const mp = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('MP35N'))!)!;
    expect(mp.media.find((r) => r.env === '해수')!.verdict).toBe('excellent');
    const a588 = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('ASTM A588'))!)!;
    const atm = a588.media.find((r) => r.env === '대기')!;
    expect(atm.verdict).toBe('good');
    expect(atm.adj?.why).toMatch(/내후성|녹층/);
    const naval = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Naval Brass'))!)!;
    const sea = naval.media.find((r) => r.env === '해수')!;
    expect(sea.verdict).toBe('caution');   // Zn28 규칙 poor → by_base 복권
    expect(sea.adj?.why).toMatch(/억제/);
    const scal = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Scalmalloy'))!)!;
    expect(scal.media.find((r) => r.env === '해수')!.verdict).toBe('good');
  });
  it('E15j — 세라믹 예외: WC-Co 강산 poor(바인더 침출) · MgO 해수 poor(수화) · SiC 는 그룹 기본 유지', () => {
    const wc = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Tungsten Carbide'))!)!;
    const acid = wc.media.find((r) => r.env === '강산')!;
    expect(acid.verdict).toBe('poor');
    expect(acid.adj?.why).toMatch(/바인더|Co/);
    const mgo = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Magnesia'))!)!;
    expect(mgo.media.find((r) => r.env === '해수')!.verdict).toBe('poor');
    const sic = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Silicon Carbide'))!)!;
    expect(sic.media.find((r) => r.env === '강산')!.verdict).toBe('excellent');
    expect(sic.media.find((r) => r.env === '강산')!.adj).toBeUndefined();
  });
  it('by_base — Ti Gr7 강산 good↑ · Waspaloy(저Mo 규칙) 강산 caution↓ · C-276 강산 excellent 유지', () => {
    const gr7 = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Ti Grade 7'))!)!;
    expect(gr7.media.find((r) => r.env === '강산')!.verdict).toBe('good');
    const wasp = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Waspaloy'))!)!;
    const acid = wasp.media.find((r) => r.env === '강산')!;
    expect(acid.verdict).toBe('caution');
    expect(acid.adj?.from).toBe('excellent');
    const c276 = resolveCorrosionPlan(mats.find((m) => m.name.startsWith('Hastelloy C-276'))!)!;
    expect(c276.media.find((r) => r.env === '강산')!.verdict).toBe('excellent');
  });
});

describe('PREN 밴드 (관행 사용 등급)', () => {
  it('18→담수·경부식 · 24→연안 · 35→해수 · 42→상시 침지', () => {
    expect(prenBand(18)).toBe('담수·경부식 급');
    expect(prenBand(24)).toBe('연안·간헐 염화물 급');
    expect(prenBand(35)).toBe('해수·공정수 급');
    expect(prenBand(42)).toBe('상시 침지·초내식 급');
  });
});

describe('PREN (Cr + 3.3Mo + 16N)', () => {
  it('2205 (Cr 22~23·Mo 3~3.5·N 0.14~0.2) ≈ 36', () => {
    const p = prenOf(byName('2205 Duplex Stainless')!);
    expect(p).not.toBeNull();
    expect(p!.value).toBeGreaterThan(33);
    expect(p!.value).toBeLessThan(39);
    expect(p!.nMissing).toBe(false);
  });
  it('304 (Cr 18·Mo/N 무) = 18 하한 (nMissing)', () => {
    const p = prenOf(byName('AISI 304 — Annealed (Wrought)')!);
    expect(p!.value).toBe(18);
    expect(p!.nMissing).toBe(true);
  });
  it('AA 6061 (Cr<10.5) → null (스테인리스 도메인 밖)', () => {
    expect(prenOf(byName('AA 6061 — T6')!)).toBeNull();
  });
});
