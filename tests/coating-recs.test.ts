/*
 * R226s/E10 — 후공정 추천 시스템(합금 그룹 기반) 무결성·합리성 게이트.
 *
 * 구 시스템(substrateMatch name-regex + 합금 무관 점수제)을 폐기하고 coating-recommendations.json
 * (그룹 SSOT) + m.profiles.cg(빌드 스탬프)로 전환. 이 테스트가 막는 것:
 *  (1) 스키마 드리프트 — rec.coating ↔ COATINGS id, purpose ↔ PURPOSE_LABEL, 매핑 키 ↔ 콘텐츠 키 parity
 *  (2) 오추천 회귀 — 합금별 앵커 (스테인리스에 아연도금, Ti 에 경질크롬 같은 비합리 추천 차단)
 *  (3) 조건 보정 누락 — 수소취성(UTS≥1000)·AM as-built·세부 프로파일 주의
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { COATINGS, resolveCoatingPlan, PURPOSE_LABEL } from '../client/src/lib/coatings';
import type { Material } from '../client/src/lib/materials';

const ROOT = process.cwd();
const readJ = (p: string) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const CREC = readJ('data/coating-recommendations.json');
const PROFILES = readJ('data/process-profiles.json');
const INSIGHTS = readJ('data/selection-insights.json').groups as Record<string, unknown>;
const all: Material[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'public', 'materials.json'), 'utf8'));

const COATING_IDS = new Set(COATINGS.map((c) => c.id));
const MACH_KEYS = new Set([...Object.keys(PROFILES.machinability.metal), ...Object.keys(PROFILES.machinability.polymer)]);
const GROUPS = CREC.groups as Record<string, { title: string; intro?: string; recs: Array<{ coating: string; purpose: string; when: string; why: string; caution_mach?: Record<string, string> }>; notes?: string[]; notes_mach?: Record<string, string> }>;

describe('coating-recommendations 스키마 무결성', () => {
  it('모든 rec.coating 은 COATINGS 카탈로그에 실재', () => {
    const bad: string[] = [];
    for (const [g, def] of Object.entries(GROUPS))
      for (const r of def.recs) if (!COATING_IDS.has(r.coating)) bad.push(`${g}→${r.coating}`);
    expect(bad).toEqual([]);
  });
  it('모든 rec 은 purpose(정의된 라벨)·when·why 필수', () => {
    const bad: string[] = [];
    for (const [g, def] of Object.entries(GROUPS))
      for (const r of def.recs) {
        if (!(r.purpose in PURPOSE_LABEL)) bad.push(`${g}:${r.coating} purpose=${r.purpose}`);
        if (!r.when || !r.why) bad.push(`${g}:${r.coating} when/why 누락`);
      }
    expect(bad).toEqual([]);
  });
  it('assignment 매핑: by_mach 키 ⊂ mach 프로파일 · by_insight 키 ⊂ 인사이트 그룹 · 값 ⊂ groups', () => {
    const badK: string[] = [];
    for (const k of Object.keys(CREC.assignment.by_mach)) if (!MACH_KEYS.has(k)) badK.push(`by_mach:${k}`);
    for (const k of Object.keys(CREC.assignment.by_insight)) if (!INSIGHTS[k]) badK.push(`by_insight:${k}`);
    for (const tbl of Object.values(CREC.assignment) as Array<Record<string, string>>)
      for (const v of Object.values(tbl)) if (!GROUPS[v]) badK.push(`→미정의 그룹 ${v}`);
    expect(badK).toEqual([]);
  });
  it('caution_mach/notes_mach 키는 mach 프로파일 키', () => {
    const bad: string[] = [];
    for (const [g, def] of Object.entries(GROUPS)) {
      for (const r of def.recs) for (const k of Object.keys(r.caution_mach || {})) if (!MACH_KEYS.has(k)) bad.push(`${g}:${r.coating} caution_mach:${k}`);
      for (const k of Object.keys(def.notes_mach || {})) if (!MACH_KEYS.has(k)) bad.push(`${g} notes_mach:${k}`);
    }
    expect(bad).toEqual([]);
  });
  it('스탬프된 모든 profiles.cg 는 groups 에 실재 + 커버리지 (Metal≥95%·Composite 전량·Ceramic 0)', () => {
    const badCg = all.filter((m) => m.profiles?.cg && !GROUPS[m.profiles.cg]).map((m) => `${m.name}:${m.profiles!.cg}`);
    expect(badCg).toEqual([]);
    const metals = all.filter((m) => m.category === 'Metal');
    const withCg = metals.filter((m) => m.profiles?.cg).length;
    expect(withCg / metals.length).toBeGreaterThan(0.95);
    expect(all.filter((m) => m.category === 'Composite' && !m.profiles?.cg)).toEqual([]);
    expect(all.filter((m) => m.category === 'Ceramic' && m.profiles?.cg)).toEqual([]);   // 세라믹은 의도적 미할당(연삭·랩핑 영역)
  });
});

/* 합금별 앵커 — "합리적" 추천의 회귀 고정. 각 케이스: 있어야 할 것 + 있으면 안 되는 것. */
describe('합금별 추천 앵커 (오추천 회귀 차단)', () => {
  const find = (rx: RegExp) => {
    const m = all.find((x) => rx.test(x.name));
    expect(m, `데이터에 매칭 재료 없음: ${rx}`).toBeTruthy();
    return m!;
  };
  const planOf = (rx: RegExp) => {
    const p = resolveCoatingPlan(find(rx));
    expect(p, `플랜 없음: ${rx}`).toBeTruthy();
    return p!;
  };
  const ids = (p: NonNullable<ReturnType<typeof resolveCoatingPlan>>) => p.recs.map((r) => r.coating.id);

  it('AA 7075-T6 → 아노다이즈·피닝 (아연도금·침탄 없음)', () => {
    const p = planOf(/AA 7075 — T6$/);
    expect(p.group).toBe('al-wrought');
    expect(ids(p)).toContain('anodizing-type2');
    expect(ids(p)).toContain('anodizing-hard');
    expect(ids(p)).toContain('shot-peening');
    expect(ids(p)).not.toContain('zinc-plating');
    expect(ids(p)).not.toContain('carburizing');
  });
  it('AA 2024 → 하드아노다이즈에 2xxx 품질 주의 (caution_mach)', () => {
    const p = planOf(/AA 2024 — T3$/);
    const hard = p.recs.find((r) => r.coating.id === 'anodizing-hard');
    expect(hard?.caution).toMatch(/2xxx/);
  });
  it('AISI 304L → 부동태화+전해연마 (아연도금·인산염 없음 + 불필요 노트)', () => {
    const p = planOf(/AISI 304L \/ STS304L — Annealed/);
    expect(p.group).toBe('ss-austenitic');
    expect(ids(p)).toContain('passivation');
    expect(ids(p)).toContain('electropolish');
    expect(ids(p)).not.toContain('zinc-plating');
    expect(p.notes.join(' ')).toMatch(/아연도금.*불필요|불필요.*아연/);
  });
  it('AISI 4140 Q&T (UTS 1410) → 질화·피닝 + 도금 수소취성 베이킹 주의 (he_risk)', () => {
    const p = planOf(/AISI 4140 \/ 42CrMo4 \(Cr-Mo\) — Q\+T/);
    expect(p.group).toBe('steel-alloy');
    expect(ids(p)).toContain('nitriding');
    expect(ids(p)).toContain('shot-peening');
    const zinc = p.recs.find((r) => r.coating.id === 'zinc-plating');
    expect(zinc?.caution).toMatch(/수소취성/);
    const cr = p.recs.find((r) => r.coating.id === 'hard-chrome');
    expect(cr?.caution).toMatch(/수소취성/);
  });
  it('연질 탄소강 (1018) → 아연도금 주의 없음 (UTS<1000)', () => {
    const p = planOf(/AISI 1018$/);
    const zinc = p.recs.find((r) => r.coating.id === 'zinc-plating');
    expect(zinc).toBeTruthy();
    expect(zinc?.caution || '').not.toMatch(/수소취성/);
  });
  it('Ti-6Al-4V → Ti 양극산화·피닝 (경질크롬·아연 없음 + 수소취화 노트)', () => {
    const p = planOf(/^Ti-6Al-4V/);
    expect(p.group).toBe('ti');
    expect(ids(p)).toContain('ti-anodize');
    expect(ids(p)).toContain('shot-peening');
    expect(ids(p)).not.toContain('hard-chrome');
    expect(ids(p)).not.toContain('zinc-plating');
    expect(p.notes.join(' ')).toMatch(/수소취화/);
  });
  it('Inconel 718 → 알루미나이징(고온)·피닝 (방청 도금 불필요 노트)', () => {
    const p = planOf(/Inconel 718 — Solution treated/);
    expect(p.group).toBe('ni-super');
    expect(ids(p)).toContain('aluminizing');
    expect(ids(p)).toContain('shot-peening');
    expect(ids(p)).not.toContain('zinc-plating');
  });
  it('AZ91D (Mg) → PEO 필수급 + 갈바닉 절연 노트', () => {
    const p = planOf(/AZ91D/);
    expect(p.group).toBe('mg');
    expect(ids(p)).toContain('peo');
    expect(p.notes.join(' ')).toMatch(/갈바닉/);
  });
  it('H13 → PVD TiAlN·질화 (duplex 관행)', () => {
    const p = planOf(/^H13 — Heat-Treated/);
    expect(p.group).toBe('tool-steel');
    expect(ids(p)).toContain('pvd-tialn');
    expect(ids(p)).toContain('nitriding');
  });
  it('C11000 (Cu) → 주석·은 도금 (전기 목적)', () => {
    const p = planOf(/C11000/);
    expect(p.group).toBe('cu');
    expect(ids(p)).toContain('tin-plating');
    expect(ids(p)).toContain('silver-plating');
    expect(ids(p)).not.toContain('anodizing-type2');
  });
  it('C17200 (BeCu) → Be 분진 안전 노트 (notes_mach)', () => {
    const p = planOf(/C17200 — As-supplied/);
    expect(p.notes.join(' ')).toMatch(/Be 안전|Be 분진/);
  });
  it('52100 베어링강 → 무코팅 기본 노트 + black-oxide', () => {
    const p = planOf(/AISI 52100/);
    expect(p.group).toBe('bearing');
    expect(ids(p)).toContain('black-oxide');
    expect(p.notes.join(' ')).toMatch(/무코팅/);
  });
  it('17-4 PH → 부동태화·피닝 + 질화-시효 간섭 노트', () => {
    const p = planOf(/17-4 PH \(UNS S17400\) — H900/);
    expect(p.group).toBe('ss-ph');
    expect(ids(p)).toContain('passivation');
    expect(ids(p)).toContain('shot-peening');
    expect(p.notes.join(' ')).toMatch(/시효.*간섭|과시효/);
  });
  it('텅스텐 (refractory) → 추천 없음 + 사유 intro (정직한 공백)', () => {
    const p = planOf(/Tungsten Heavy Alloy/);
    expect(p.group).toBe('refractory');
    expect(p.recs).toEqual([]);
    expect(p.intro).toMatch(/불활성|진공/);
  });
  it('PEEK (폴리머) → 어닐링·표면활성화', () => {
    const p = planOf(/PEEK — As-supplied/);
    expect(p.group).toBe('polymer');
    expect(ids(p)).toContain('pol-annealing');
    expect(ids(p)).toContain('pol-surface-activation');
  });
  it('CFRP (복합재) → 갈바닉 절연 안내 intro', () => {
    const p = planOf(/CFRP — T300/);
    expect(p.group).toBe('composite');
    expect(p.intro).toMatch(/갈바닉/);
  });
  it('Alumina (세라믹) → 플랜 없음 (카드 미표시)', () => {
    const m = find(/Alumina \(Al₂O₃, 96%\)/);
    expect(resolveCoatingPlan(m)).toBeNull();
  });
  it('AM as-built (316L LPBF) → 응력해제 선행 노트 (condition_mod)', () => {
    const p = planOf(/AISI 316L \(AM\) — As-built/);
    expect(p.notes.join(' ')).toMatch(/as-built|응력해제/);
  });
});

describe('런타임 regex 부재 (표현 회귀 방지)', () => {
  it('coatings.ts 에 substrateMatch·new RegExp 없음', () => {
    const src = fs.readFileSync(path.join(ROOT, 'client', 'src', 'lib', 'coatings.ts'), 'utf8');
    expect(src.includes('substrateMatch:')).toBe(false);   // 필드 자체 소멸 (주석의 역사 언급은 허용)
    expect(/new RegExp/.test(src)).toBe(false);
  });
});
