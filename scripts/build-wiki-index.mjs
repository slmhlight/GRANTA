/*
 * R227/E14/H1 — 위키 상호참조 인덱스 빌드 (Phase 1: lexicon + surface table, 렌더 없음).
 *
 * 산출:
 *   data/wiki-index.json    — canonical 재료 엔티티(story_key 단위) 레지스트리 + surface_forms(autolink 제안)
 *   data/wiki-meta.json     — 성공지표/검수 리포트(ambiguity·junk·커버리지·staleness 해시)
 *
 * 원칙(WIKI-CROSSREF-DESIGN.md §B): 빌드타임 stable_id/slug 해석, 런타임 regex 0, SSOT+게이트.
 * 이 단계는 파생만 — 클라이언트 렌더/링크 없음(behavior-additive, 무위험).
 *
 * 사용: node scripts/build-wiki-index.mjs   (build:data 산출물 필요)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { tokensOf, norm, KO, isJunkForm, suggestAutolink } from './lib/name-tokens.mjs'; // tokensOf: 멤버 이름 전용

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const materialsRaw = rd('client/public/materials.json');
const storiesRaw = rd('data/alloy-stories.json');
const m = JSON.parse(materialsRaw);
const fr = JSON.parse(rd('data/registry-id-freeze.json'));
const map = fr.map || fr; const rev = {}; for (const [l, s] of Object.entries(map)) rev[s] = l;
const by = {}; for (const x of m) by[x.id] = x;
const doc = JSON.parse(storiesRaw);

// ── 대표 entry 선정 (WIKI §C: base/annealed/solution/as-supplied → popularity → stable_id min) ──
const BASE_HT = /anneal|solution|as.?supplied|as.?rolled|normaliz|mill.?anneal|as.?built/i;
function pickRep(members) {
  // members: [{sid, entry}]
  const base = members.filter((x) => BASE_HT.test(String(x.entry.heat_treatment || '')) || !x.entry.heat_treatment);
  const pool = base.length ? base : members;
  pool.sort((a, b) => (b.entry.popularity || 0) - (a.entry.popularity || 0) || (a.sid < b.sid ? -1 : 1));
  return pool[0].sid;
}

// ── surface-form 수집 (엔티티당) ──
// form → {form, sid} : 이 form 이 유래한 멤버 stable_id (클릭 시 그 멤버 열기)
function memberForms(entry) {
  const out = [];
  const base = entry.name.replace(/\s*[—(].*$/, '').trim();
  for (const tk of tokensOf(base)) out.push(tk);
  // 한글 동의어 (KO 매핑: 영문 base → 한글)
  const koBase = KO[base.toLowerCase()];
  if (koBase) out.push(norm(koBase));
  for (const tk of tokensOf(base)) { const ko = KO[tk]; if (ko) out.push(norm(ko)); }
  // 별칭·UNS
  for (const a of (entry.aliases || [])) for (const tk of tokensOf(a)) out.push(tk);
  // 정제: 영숫자만·설명블롭(>24) 제거·junk 제거 (표제/조성 blob 유입 차단)
  return [...new Set(out)].filter((f) => f && f.length <= 24 && /^[a-z0-9]+$/.test(f) && !isJunkForm(f));
}

// 1) 엔티티(스토리 단위) 조립
const entities = [];
const DEAD = new Set(['epdm', 'fkm']); // 멤버 0 (문서화된 dead)
for (const [key, st] of Object.entries(doc.stories)) {
  if (DEAD.has(key)) continue;
  const members = st.stable_ids.map((sid) => ({ sid, entry: by[rev[sid]] })).filter((x) => x.entry);
  if (!members.length) continue;
  const rep = pickRep(members);
  // form → sid (여러 멤버가 같은 form 이면 rep 우선).
  // ※ 스토리 display(제목)는 토큰화하지 않음 — 제목의 설명어("wing"·"tank"·조성 blob)가 새는 원인.
  //   surface-form 은 실제 멤버 entry 이름/별칭/UNS 에서만.
  const formMap = new Map();
  for (const { sid, entry } of members) {
    for (const f of memberForms(entry)) {
      if (!formMap.has(f) || sid === rep) formMap.set(f, sid);
    }
  }
  const uns = [...new Set(members.flatMap((x) => x.entry.uns || []))];
  entities.push({
    id: key, type: 'material', display: st.display || key,
    story_key: key, rep_stable_id: rep, rep_id: rev[rep] || null,  // rep_id = 클라이언트 m.id(legacy) — 네비게이션용
    surface_forms: [...formMap.entries()].map(([form, sid]) => ({ form, sid, id: rev[sid] || null })),
    uns, member_count: members.length,
  });
}

// 2) 전역 ambiguity: 같은 form 이 2+ 엔티티에 → 모호
const formOwners = new Map(); // form → Set(entityId)
for (const e of entities) for (const { form } of e.surface_forms) {
  if (!formOwners.has(form)) formOwners.set(form, new Set());
  formOwners.get(form).add(e.id);
}
// UNS 도 surface (검색용, 정규화)
for (const e of entities) for (const u of e.uns) {
  const nu = norm(u); if (!nu) continue;
  if (!formOwners.has(nu)) formOwners.set(nu, new Set());
  formOwners.get(nu).add(e.id);
}

// 3) autolink 제안 + ambiguity 플래그 부착
let autolinkYes = 0, autolinkNo = 0, ambiguousForms = 0;
const ambiguityReport = [];
for (const e of entities) {
  for (const sf of e.surface_forms) {
    const owners = formOwners.get(sf.form);
    const ambiguous = owners && owners.size > 1;
    sf.autolink = suggestAutolink(sf.form, ambiguous);
    if (ambiguous) sf.ambiguous = true;
    if (sf.autolink) autolinkYes++; else autolinkNo++;
  }
}
for (const [form, owners] of formOwners) {
  if (owners.size > 1 && form.length >= 3) { ambiguousForms++; ambiguityReport.push({ form, owners: [...owners] }); }
}
ambiguityReport.sort((a, b) => b.owners.length - a.owners.length);

// 4) staleness 해시 (상류 변경 감지 — 게이트가 검증)
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const inputHashes = { materials: hash(materialsRaw), stories: hash(storiesRaw) };

// 5) backlink 역인덱스 — allowlist(autolink=true) form 을 스토리 본문에서 단어경계 매칭.
//    ※ naive substring 금지(§A) — 본문을 구분자로 split 한 span 을 norm 해 정확 일치(단어경계 무료).
//    self-reference(자기 스토리 form) 제외 → 진짜 상호참조만.
const autolinkForms = new Map(); // form → entityId (autolink=true, 즉 allowlist·비모호만)
for (const e of entities) for (const sf of e.surface_forms) if (sf.autolink) {
  if (!autolinkForms.has(sf.form)) autolinkForms.set(sf.form, e.id);
}
const SPLIT = /[\s,.;:()/·\[\]{}"'“”‘’—–…?!°%×+=<>|~]+/;
const backlinks = {}; // entityId → Set(storyKey that mention)
const sampleEdges = [];
let edgeCount = 0;
for (const [key, st] of Object.entries(doc.stories)) {
  if (DEAD.has(key)) continue;
  const body = [st.display || '', ...(st.sections ? Object.values(st.sections) : []), st.legacy_text || '',
    ...(st.timeline || []).map((e) => e.event)].join(' ');
  const seen = new Set(); // 스토리당 엔티티 1회
  for (const span of body.split(SPLIT)) {
    const nf = norm(span);
    if (nf.length < 4) continue;
    const owner = autolinkForms.get(nf);
    if (!owner || owner === key || seen.has(owner)) continue;   // 미매칭·self·중복 제외
    seen.add(owner);
    (backlinks[owner] = backlinks[owner] || []).push(key);
    edgeCount++;
    if (sampleEdges.length < 40) sampleEdges.push({ from: key, mentions: owner, via: nf });
  }
}
const backlinkObj = {
  _note: 'R227/E14/H2 위키 역인덱스: entityId → 이 재료를 본문에서 언급하는 스토리들. allowlist auto-link 매칭(단어경계·self제외).',
  generated_from: inputHashes, backlinks,
};
// 산출물은 client/public/ (gitignore, CI/build:wiki 가 재생성 — materials.json 관행). build:data 선행 필요.
fs.writeFileSync(path.join(ROOT, 'client/public/wiki-backlinks.json'), JSON.stringify(backlinkObj, null, 1) + '\n');
const entitiesWithBacklink = Object.keys(backlinks).length;
const storiesWithOutlink = new Set(sampleEdges.map(() => 0)); // placeholder
const outByStory = {};
for (const [ent, froms] of Object.entries(backlinks)) for (const f of froms) outByStory[f] = (outByStory[f] || 0) + 1;
const avgOut = (edgeCount / Object.keys(outByStory).length).toFixed(1);

const index = {
  _note: 'R227/E14 위키 인덱스 (Phase1: 재료 lexicon+surface table). 런타임은 조회만. 빌드: build-wiki-index.mjs.',
  version: 1,
  inputHashes,
  entities,
};
fs.writeFileSync(path.join(ROOT, 'client/public/wiki-index.json'), JSON.stringify(index, null, 1) + '\n');

const totalForms = entities.reduce((s, e) => s + e.surface_forms.length, 0);
const meta = {
  _note: 'R227/E14 위키 빌드 리포트(성공지표·검수 대상).',
  generated_from: inputHashes,
  entity_count: entities.length,
  surface_form_total: totalForms,
  autolink_suggested: autolinkYes,
  autolink_off: autolinkNo,
  ambiguous_forms: ambiguousForms,
  ambiguity_top: ambiguityReport.slice(0, 40),
  backlink_edges: edgeCount,
  entities_with_backlink: entitiesWithBacklink,
  stories_with_outlink: Object.keys(outByStory).length,
  avg_outlink_per_story: Number(avgOut),
  backlink_sample: sampleEdges,
};
fs.writeFileSync(path.join(ROOT, 'client/public/wiki-meta.json'), JSON.stringify(meta, null, 1) + '\n');

console.log(`wiki-index: 엔티티 ${entities.length} · surface-form ${totalForms} (autolink 제안 ${autolinkYes} / off ${autolinkNo}) · 모호 form ${ambiguousForms}`);
console.log('모호 상위:', ambiguityReport.slice(0, 12).map((a) => `${a.form}(${a.owners.length})`).join(' '));
console.log(`backlink: 상호참조 edge ${edgeCount} · 피언급 엔티티 ${entitiesWithBacklink} · outlink 보유 스토리 ${Object.keys(outByStory).length} (평균 ${avgOut}/스토리)`);
console.log('샘플:', sampleEdges.slice(0, 10).map((e) => `${e.from}→${e.mentions}(${e.via})`).join('  '));
