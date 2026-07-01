/*
 * R226f — 커버리지 갭 리포트 (DATA-STRATEGY 축1c·3c·3d 계측).
 * 산출: docs/COVERAGE-GAPS.md (커밋되는 스냅샷 — 분기별 재실행해 추세 추적).
 *   §1 파생값 실측 대체 우선순위 (축1c): 인기 × 파생(KIC class / fatigue derived) 의존 상위.
 *   §2 조건(temper/HT) 매트릭스 (축3c): 인기 상위 base 의 조건 수 — 단일조건 고인기 = 확장 후보.
 *   §3 elevated-temp/creep 부재 (축3d): 인기 상위 metal 중 곡선 없는 것.
 * 사용: node scripts/report-coverage-gaps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'public', 'materials.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'public', 'build-meta.json'), 'utf8'));
const prim = (n) => String(n).split(' — ')[0].trim();
const L = [];
L.push('# 커버리지 갭 리포트 (자동 생성 — scripts/report-coverage-gaps.mjs)', '');
L.push(`빌드: ${meta.buildDate} · ${meta.totalAlloys}종 · authority ${JSON.stringify(meta.authorityDistribution)}`, '');

// §1 파생값 실측 대체 우선순위 (축1c)
L.push('## §1 파생값 → 실측 대체 우선순위 (축1c)', '');
L.push('KIC(class-confidence)·fatigue(derived) 를 파생값에 의존하는 인기 합금 — 실측 datasheet 확보 시 신뢰도 상승 폭이 가장 큰 대상.', '');
const derived = all.filter((m) => m.category === 'Metal').map((m) => {
  const kic = m.ranges?.fracture_toughness?.confidence;
  const fat = m.ranges?.fatigue_strength?.confidence;
  const dep = (kic === 'class' ? 1 : 0) + (fat === 'derived' ? 1 : 0) + (m.fatigue_estimated ? 0.5 : 0);
  return { m, dep, score: dep * (m.popularity || 0) };
}).filter((x) => x.dep > 0).sort((a, b) => b.score - a.score);
L.push('| 우선순위 | 재료 | 인기 | 파생 의존 |', '|---|---|---|---|');
const seenB1 = new Set();
let rank = 0;
for (const { m, dep } of derived) {
  const b = prim(m.name); if (seenB1.has(b)) continue; seenB1.add(b);
  L.push(`| ${++rank} | ${b} | ${(m.popularity || 0).toFixed(1)} | ${dep >= 2 ? 'KIC+fatigue' : dep >= 1 ? (m.ranges?.fracture_toughness?.confidence === 'class' ? 'KIC' : 'fatigue') : 'fatigue(est)'} |`);
  if (rank >= 30) break;
}
L.push('', `파생 의존 metal (base 단위): ${seenB1.size >= 30 ? '30+ 표기 (전체 ' + new Set(derived.map((x) => prim(x.m.name))).size + ')' : seenB1.size}`, '');

// §2 조건 매트릭스 (축3c)
L.push('## §2 조건(temper/HT) 커버리지 — 단일조건 고인기 base (축3c)', '');
L.push('인기 높은데 조건이 1개뿐인 base — temper/HT 축 확장(예: T73/T7351·aged 변형) 1차 후보.', '');
const byBase = new Map();
for (const m of all.filter((x) => x.category === 'Metal')) {
  const b = prim(m.name);
  if (!byBase.has(b)) byBase.set(b, { conds: 0, pop: 0 });
  const e = byBase.get(b); e.conds++; e.pop = Math.max(e.pop, m.popularity || 0);
}
const single = [...byBase.entries()].filter(([, v]) => v.conds === 1 && v.pop >= 3.4).sort((a, b) => b[1].pop - a[1].pop);
L.push('| base | 인기 | 조건 수 |', '|---|---|---|');
for (const [b, v] of single.slice(0, 25)) L.push(`| ${b} | ${v.pop.toFixed(1)} | ${v.conds} |`);
L.push('', `단일조건 & 인기≥3.4: ${single.length} base`, '');

// §3 elevated-temp / creep 부재 (축3d)
L.push('## §3 elevated-temp/creep 곡선 부재 — 인기 상위 (축3d)', '');
const noCurve = new Map();
for (const m of all.filter((x) => x.category === 'Metal')) {
  const b = prim(m.name);
  const has = (m.elevated_temp?.length || 0) > 0 || (m.creep_rupture?.length || 0) > 0;
  if (!noCurve.has(b)) noCurve.set(b, { pop: 0, has: false });
  const e = noCurve.get(b); e.pop = Math.max(e.pop, m.popularity || 0); e.has = e.has || has;
}
const withCurve = [...noCurve.values()].filter((v) => v.has).length;
const missing = [...noCurve.entries()].filter(([, v]) => !v.has && v.pop >= 4.0).sort((a, b) => b[1].pop - a[1].pop);
L.push(`곡선 보유 base: ${withCurve} / ${noCurve.size}. 인기≥4.0 인데 부재 (확장 목표 60종의 후보):`, '');
L.push('| base | 인기 |', '|---|---|');
for (const [b, v] of missing.slice(0, 35)) L.push(`| ${b} | ${v.pop.toFixed(1)} |`);
L.push('', `인기≥4.0 & 곡선 부재: ${missing.length} base`, '');

fs.writeFileSync(path.join(ROOT, 'docs', 'COVERAGE-GAPS.md'), L.join('\n') + '\n');
console.log('docs/COVERAGE-GAPS.md 생성 — §1 파생대체 30 · §2 단일조건', single.length, '· §3 곡선부재', missing.length);
