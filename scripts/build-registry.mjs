/*
 * R226 PoC — 안정 ID 레지스트리 생성기 (1198 현재 entry 기준).
 *
 * 목적: 빌드가 버리던 안정 식별자를 복원. 현재 HTML(빌드 산출 1198종)을 기준으로
 *   - frozen 안정 ID (<CAT>-NNNN) 부여
 *   - family tree (category > subcategory + element-family) + family ID
 *   - 참조 테이블(index) + per-entry 파일 샘플
 * 을 생성. 이후 override 시스템을 이름-정규식 → 안정 ID/family ID 로 재키잉하기 위한 토대.
 *
 * 산출: data/registry/index.json · families.json · entries/<cat>/<id>.json (샘플)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'client', 'public', 'materials');
const OUT = path.join(ROOT, 'data', 'registry');

const CATCODE = { Metal: 'MET', Polymer: 'POL', Ceramic: 'CER', Composite: 'CMP' };
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// 1) 현재 1198 entry 로드 (= HTML 기준 entry list)
const all = [];
for (const f of ['metal', 'polymer', 'ceramic', 'composite']) {
  for (const m of JSON.parse(fs.readFileSync(path.join(PUB, `${f}.json`), 'utf8'))) all.push(m);
}

// 변형 전 깨끗한 원본 스냅샷 (라운드트립 검증 기준)
const cleanJson = new Map(all.map(m => [m.id, JSON.stringify(m)]));

// 2) 결정적 순서로 정렬 후 frozen 안정 ID 부여 (category 내 seq).
//    정렬 기준: category → subcategory → name (초기 1회 freeze; 이후엔 레지스트리에 저장돼 불변).
all.sort((a, b) =>
  (a.category || '').localeCompare(b.category || '') ||
  (a.subcategory || '').localeCompare(b.subcategory || '') ||
  (a.name || '').localeCompare(b.name || ''));

const seq = {};
for (const m of all) {
  const cc = CATCODE[m.category] || 'OTH';
  seq[cc] = (seq[cc] || 0) + 1;
  m.stable_id = `${cc}-${String(seq[cc]).padStart(4, '0')}`;
}

// 3) family tree 구성
//    - 루트: category (F-MET ...)
//    - 2단계: subcategory (F-<cc>-<slug>)  parent=category
//    - 교차: element-family (families[] 의 '-based' 태그 → F-EL-<slug>)
const families = {}; // id -> {id, label, kind, parent, member_count}
const ensure = (id, label, kind, parent) => { if (!families[id]) families[id] = { id, label, kind, parent: parent || null, member_count: 0 }; return families[id]; };
for (const m of all) {
  const cc = CATCODE[m.category] || 'OTH';
  const catId = `F-${cc}`;
  ensure(catId, m.category, 'category', null).member_count++;
  const subId = `F-${cc}-${slug(m.subcategory)}`;
  ensure(subId, m.subcategory, 'subcategory', catId).member_count++;
  const elTags = (m.families || []).filter(f => /-based$|refractory/i.test(f));
  const elIds = [...new Set(elTags.map(t => /refractory/i.test(t) ? 'Refractory' : t))] // refractory 중복 병합
    .map(t => { const id = `F-EL-${slug(t)}`; ensure(id, t, 'element-family', null).member_count++; return id; });
  m._fam = { category: catId, subcategory: subId, element_families: elIds };
}

// 4) per-entry 레코드 = 현재 entry + stable_id + family refs (+ 추적용 legacy_id/origin)
const ORIGIN = { C: 'curated(material_db)', V: 'am_vendor(csv)', G: 'generic(csv)', R: 'reference(supplementary)', POL: 'polymers-data', CER: 'ceramics-data', CMP: 'composites-data' };
const records = all.map(m => {
  const legacy = m.id;
  const origin = ORIGIN[(legacy || '').split('_')[0]] || 'unknown';
  const { _fam, ...rest } = m;
  return { stable_id: m.stable_id, family: _fam, legacy_id: legacy, origin, ...rest };
});

// 5) 참조 테이블(index) — slim
const index = records.map(r => ({
  stable_id: r.stable_id, name: r.name, category: r.category, subcategory: r.subcategory,
  family: r.family, tier: r.tier, popularity: r.popularity ?? null, legacy_id: r.legacy_id, origin: r.origin,
}));

// 6) 출력
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ count: index.length, generated_from: 'client/public/materials (1198)', entries: index }, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'families.json'), JSON.stringify({ count: Object.keys(families).length, families: Object.values(families).sort((a, b) => a.id.localeCompare(b.id)) }, null, 2) + '\n');

// per-entry 파일 전체 생성: data/registry/<catcode>/<stable_id>.json
const entriesRoot = path.join(OUT, 'entries');
fs.rmSync(entriesRoot, { recursive: true, force: true });
for (const r of records) {
  const cc = r.stable_id.split('-')[0].toLowerCase();
  const dir = path.join(entriesRoot, cc);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${r.stable_id}.json`), JSON.stringify(r, null, 2) + '\n');
}

// 무손실 라운드트립 검증: 파일을 모두 다시 읽어 재구성 → 원본(현재 entry)과 핵심 필드 deep-equal
const ADDED = new Set(['stable_id', 'family', 'legacy_id', 'origin']);
let readBack = 0, mismatch = 0; const badEx = [];
for (const cc of fs.readdirSync(entriesRoot)) {
  for (const fn of fs.readdirSync(path.join(entriesRoot, cc))) {
    const rec = JSON.parse(fs.readFileSync(path.join(entriesRoot, cc, fn), 'utf8'));
    readBack++;
    // record 에서 추가 필드 제거 → 원본과 동일해야 함 (stable_id 는 ...rest 에도 있으나 ADDED 로 제거됨)
    const stripped = Object.fromEntries(Object.entries(rec).filter(([k]) => !ADDED.has(k)));
    const clean = cleanJson.get(rec.legacy_id);
    if (!clean || JSON.stringify(stripped) !== clean) { mismatch++; if (badEx.length < 3) badEx.push(rec.stable_id + '/' + (rec.legacy_id || '?')); }
  }
}

// 7) 통계 출력
console.log('레지스트리 생성:', records.length, 'entries');
console.log('category별 ID:', Object.entries(seq).map(([k, v]) => `${k}=${v}`).join(' · '));
console.log('family:', Object.keys(families).length, '(category', Object.values(families).filter(f => f.kind === 'category').length,
  '· subcategory', Object.values(families).filter(f => f.kind === 'subcategory').length,
  '· element', Object.values(families).filter(f => f.kind === 'element-family').length, ')');
console.log('index.json:', Math.round(fs.statSync(path.join(OUT, 'index.json')).size / 1024), 'KB · families.json:', Math.round(fs.statSync(path.join(OUT, 'families.json')).size / 1024), 'KB');
console.log('per-entry 파일:', records.length, '생성 (data/registry/entries/<cat>/<id>.json)');
console.log(`라운드트립 검증: ${readBack} 읽음 · 불일치 ${mismatch}`, mismatch ? `❌ 예: ${badEx.join(', ')}` : '✓ 무손실');
console.log('\n=== 참조 테이블 index 샘플 1건 ===');
console.log(JSON.stringify(index.find(e => /316L/.test(e.name)) || index[0], null, 2));
console.log('\n=== element-family 예시 ===');
console.log(Object.values(families).filter(f => f.kind === 'element-family').map(f => `${f.id}(${f.member_count})`).join(' · '));
