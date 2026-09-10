/*
 * W4-2b C-9 — 상류 데이터 파일 스키마 게이트.
 *
 * 이 세 파일은 **레지스트리 재생성의 입력**이다. 여기가 깨지면 값이 조용히 틀어지거나
 * (positional legacy_id 오염) 인용 없는 값이 들어온다 — 둘 다 빌드가 성공한 채로 벌어진다.
 * 그래서 형태·인용·순서를 여기서 못 박는다.
 *
 *   data/elevated-temp-curves.json  고온곡선 by_id (stable_id 키)
 *   data/alloy-additions.json       신규 재료의 **유일한 지정 추가 지점** (append-only)
 *   data/cast-alloys.json           주조 합금 (append-only)
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => JSON.parse(fs.readFileSync(path.resolve(p), 'utf8'));
const j = (a: string[]) => a.join(' | ');

describe('C-9 — elevated-temp-curves.json', () => {
  const doc = read('data/elevated-temp-curves.json');
  const byId: Record<string, { elevated_temp?: Array<{ temp?: number; ys?: number | null; uts?: number | null }>; src?: string }> = doc.by_id ?? {};
  const ids = Object.keys(byId);

  it('by_id 키가 stable_id 형식이고 레지스트리에 실재한다', () => {
    const SID = /^(MET|POL|CER|CMP)-\d{4}$/;
    const bad = ids.filter((k) => !SID.test(k));
    expect(bad, `stable_id 형식이 아닌 키: ${j(bad)}`).toEqual([]);
    const missing = ids.filter((k) => !fs.existsSync(path.resolve(`data/registry/entries/${k.slice(0, 3).toLowerCase()}/${k}.json`)));
    expect(missing, `레지스트리에 없는 stable_id: ${j(missing)}`).toEqual([]);
  });

  it('모든 곡선이 출처(src)를 갖는다 — 인용 없는 곡선 금지', () => {
    const bad = ids.filter((k) => !byId[k].src || !String(byId[k].src).trim());
    expect(bad, `src 없는 곡선 ${bad.length}건: ${j(bad)}`).toEqual([]);
  });

  it('온도가 오름차순이고 강도가 양수이며 σy ≤ UTS', () => {
    const bad: string[] = [];
    for (const k of ids) {
      const pts = byId[k].elevated_temp ?? [];
      if (!pts.length) { bad.push(`${k}: 빈 곡선`); continue; }
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (typeof p.temp !== 'number') { bad.push(`${k}[${i}]: temp 없음`); continue; }
        if (i > 0 && p.temp <= (pts[i - 1].temp as number)) bad.push(`${k}[${i}]: 온도 역전 ${pts[i - 1].temp}→${p.temp}`);
        for (const f of ['ys', 'uts'] as const) {
          const v = p[f];
          if (v != null && !(typeof v === 'number' && v > 0)) bad.push(`${k}[${i}].${f}=${v}`);
        }
        if (typeof p.ys === 'number' && typeof p.uts === 'number' && p.ys > p.uts * 1.02) bad.push(`${k}@${p.temp}: σy ${p.ys} > UTS ${p.uts}`);
      }
    }
    expect(bad, `곡선 형태 이상 ${bad.length}건 — ${j(bad.slice(0, 10))}`).toEqual([]);
  });

  it('상온 앵커(≤30°C)를 갖는다 — 조건 정합 판정이 이 점에 의존한다', () => {
    const bad = ids.filter((k) => !(byId[k].elevated_temp ?? []).some((p) => typeof p.temp === 'number' && p.temp <= 30));
    expect(bad, `RT 앵커 없는 곡선 ${bad.length}건: ${j(bad)}`).toEqual([]);
  });
});

type Row = {
  name?: string; category?: string; subcategory?: string; process?: string;
  composition?: Record<string, unknown>; points?: unknown[][];
  sources?: Array<{ label?: string }>;
};

/* points 열 순서 — build-materials 가 이 순서로 읽는다. 바뀌면 값이 통째로 밀린다. */
const POINT_COLS = ['density', 'yield_strength', 'uts', 'elongation', 'modulus', 'hardness', 'thermal_conductivity'];

/* append-only 동결 — 지금까지의 이름 순서. 새 재료는 **뒤에만** 붙는다.
   중간 삽입·재정렬·삭제는 positional legacy_id 를 밀어 다른 재료의 값을 오염시킨다(원칙 3). */
const FROZEN: Record<string, string[]> = {
  'data/alloy-additions.json': [
    "Ni-Hard 1 (white cast iron, ASTM A532 Class I-A)",
    "High-Cr White Iron 25%Cr (ASTM A532 Class III-A)",
    "ADI Grade 900 (austempered ductile iron, ASTM A897)",
    "ADI Grade 1200 (austempered ductile iron, ASTM A897)",
    "Grade P92 (9Cr-2W creep steel, ASTM A335)",
    "HK40 (cast 25Cr-20Ni heat-resistant, ASTM A297)",
    "ZA-27 (zinc-aluminum casting alloy, ASTM B791)",
    "DC53 (Cr8 cold-work tool steel, Daido)",
    "M35 HSS (Co5 high speed steel, DIN 1.3243)",
    "A357.0 (Al-Si-Mg premium casting, AMS 4219)",
    "A201.0 (Al-Cu-Ag premium casting, AMS 4229)",
    "IN-100 (cast Ni superalloy, AMS 5397)",
    "Inconel 740H (Ni-Cr-Co A-USC boiler alloy)",
    "Astroloy (Ni-Co-Cr γ′ superalloy)",
    "EPDM — Ethylene Propylene Diene Monomer (70 Shore A)",
    "FKM — Fluoroelastomer (Viton A type, 75 Shore A)",
  ],
  'data/cast-alloys.json': [
    "CF8 (cast 304, ASTM A351)",
    "CF8M (cast 316, ASTM A351)",
    "CF3 (cast 304L, ASTM A351)",
    "CF3M (cast 316L, ASTM A351)",
    "WCB (cast carbon steel, ASTM A216)",
    "WCC (cast carbon steel, ASTM A216)",
    "Ti-6Al-4V Cast (Grade C-5, ASTM B367)",
    "ADC12 / A383 (die-cast Al-Si-Cu)",
  ],
};

for (const file of Object.keys(FROZEN)) {
  describe(`C-9 — ${file}`, () => {
    const rows: Row[] = read(file).materials ?? [];

    it('필수 필드를 갖는다', () => {
      const bad: string[] = [];
      rows.forEach((r, i) => {
        for (const f of ['name', 'category', 'subcategory', 'process'] as const)
          if (!r[f] || !String(r[f]).trim()) bad.push(`[${i}] ${r.name ?? '(무명)'} — ${f} 없음`);
        if (!r.composition || !Object.keys(r.composition).length) bad.push(`[${i}] ${r.name} — composition 없음`);
      });
      expect(bad, `필수 필드 누락 ${bad.length}건 — ${j(bad)}`).toEqual([]);
    });

    it('모든 재료가 인용을 갖는다 — 미검증 값 유입 차단', () => {
      const bad = rows.filter((r) => !(r.sources ?? []).some((s) => s.label && String(s.label).trim())).map((r) => String(r.name));
      expect(bad, `출처 없는 재료 ${bad.length}건: ${j(bad)}`).toEqual([]);
    });

    it('points 는 7열 한 행이다 (density·σy·UTS·El·E·경도·열전도)', () => {
      const bad: string[] = [];
      rows.forEach((r) => {
        const pts = r.points;
        if (!Array.isArray(pts) || pts.length !== 1) { bad.push(`${r.name}: points 행 ${Array.isArray(pts) ? pts.length : '없음'}`); return; }
        const row = pts[0];
        if (!Array.isArray(row) || row.length !== POINT_COLS.length) { bad.push(`${r.name}: 열 ${Array.isArray(row) ? row.length : '?'}`); return; }
        row.forEach((v, c) => {
          if (v !== null && !(typeof v === 'number' && isFinite(v))) bad.push(`${r.name}.${POINT_COLS[c]}=${v}`);
        });
      });
      expect(bad, `points 형태 이상 ${bad.length}건 — ${j(bad)}`).toEqual([]);
    });

    it('이름이 중복되지 않는다', () => {
      const seen = new Map<string, number>();
      rows.forEach((r) => seen.set(String(r.name), (seen.get(String(r.name)) ?? 0) + 1));
      const dup = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
      expect(dup, `중복 이름: ${j(dup)}`).toEqual([]);
    });

    it('append-only — 기존 순서가 보존되고 새 재료는 뒤에만 붙는다', () => {
      /* positional legacy_id 체계라 중간 삽입·재정렬·삭제는 **다른 재료의 값**을 오염시킨다.
         새 재료를 추가할 때는 이 동결 목록 뒤에 이름을 덧붙이면 된다. */
      const frozen = FROZEN[file];
      const head = rows.slice(0, frozen.length).map((r) => String(r.name));
      expect(head, '앞부분 순서가 바뀌었다 — 중간 삽입·재정렬·삭제 의심(원칙 3 append-only)').toEqual(frozen);
      expect(rows.length, '재료가 사라졌다').toBeGreaterThanOrEqual(frozen.length);
    });
  });
}
