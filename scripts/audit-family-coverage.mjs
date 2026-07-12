/*
 * R227/E14/H4d Phase1 — 분류 완결 감사 (GLOSSARY-IMPROVEMENT-PLAN §4.3, D9).
 *
 * DB subcategory ↔ 글로서리 alloy-family 상호 대조:
 *   (a) DB 에 있으나 글로서리 계열 페이지 없는 subcategory → 신규 용어/문서 후보
 *   (b) 글로서리 계열 페이지는 있으나 DB 대표 멤버가 빈약한 계열 → entry 보강 후보
 *
 * 읽기 전용(리포트만): docs/audits/family-coverage.md. 사용: node scripts/audit-family-coverage.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const materials = rd('client/public/materials.json');
const glossary = rd('data/glossary.json');
const articles = rd('data/glossary-articles.json').articles;

/* subcategory → 글로서리 slug 매핑 (있는 것만 — 나머지는 미커버로 리포트).
 * H4f-D: P7a/P7c/H4e-B 신설 계열 페이지(carbon-steel·alloy-steel·aluminum-alloy·copper-alloy·
 * titanium-alloy·refractory-metal·cobalt-alloy·magnesium-alloy·gray-cast-iron 등) 반영 —
 * 매핑 누락으로 '미커버 126' 과다집계되던 버그 수정. */
const SUBCAT_TO_SLUG = {
  'Stainless Steel - Austenitic': 'stainless-steel',
  'Stainless Steel - Ferritic/Martensitic': 'stainless-steel',
  'Stainless Steel - Duplex': 'duplex-stainless-steel',
  'Stainless Steel - PH': 'precipitation-hardening',
  'Nickel Superalloy': 'nickel-superalloy',
  'Tool Steel': 'tool-steel',
  'Tool Steel - Cold-Work': 'tool-steel',
  'Tool Steel - Hot-Work': 'tool-steel',
  'Carbon Steel': 'carbon-steel',
  'Structural Steel': 'carbon-steel',
  'Alloy Steel': 'alloy-steel',
  'Alloy Steel - Case Hardening': 'alloy-steel',
  'Spring Steel': 'alloy-steel',
  'Rail Steel': 'carbon-steel',
  'Pipeline Steel': 'tmcp',
  'Pressure Vessel Steel': 'alloy-steel',
  'Heat-Resistant Steel': 'alloy-steel',
  'Maraging Steel': 'maraging-steel',
  'Copper Alloy': 'copper-alloy',
  'Aluminum - Si Alloys (6xxx/7xxx)': 'aluminum-alloy',
  'Aluminum - Cu Alloys (2xxx)': 'aluminum-alloy',
  'Aluminum - Mg Alloys (5xxx)': 'aluminum-alloy',
  'Aluminum - Mn Alloys (3xxx)': 'aluminum-alloy',
  'Aluminum - Pure/Other': 'aluminum-alloy',
  'Aluminum - Lithium': 'aluminum-alloy',
  'Titanium - α+β': 'titanium-alloy',
  'Titanium - Pure / CP Grades': 'titanium-alloy',
  'Titanium - α / near-α': 'titanium-alloy',
  'Titanium - β': 'titanium-alloy',
  'Refractory Metal': 'refractory-metal',
  'Cobalt Alloy - Chrome': 'cobalt-alloy',
  'Magnesium Alloy': 'magnesium-alloy',
  'Cast Iron': 'gray-cast-iron',
  'Zinc Alloy': 'casting',
  // H4h — 비금속 계열 페이지 신설분
  'Oxide': 'oxide-ceramic',
  'Carbide': 'non-oxide-ceramic',
  'Nitride': 'non-oxide-ceramic',
  'Polymer - Polyamide': 'polyamide',
  'Polymer - Polyamide GF': 'polyamide',
  'Polymer - Polyamide CF': 'polyamide',
  'Polymer - POM': 'pom',
  'Polymer - Polycarbonate': 'polycarbonate',
  'Polymer - PEI/ULTEM': 'high-performance-polymer',
  'Polymer - PSU': 'high-performance-polymer',
  'Polymer - PPSU': 'high-performance-polymer',
  'Polymer - PPS': 'high-performance-polymer',
  'Polymer - PEEK': 'high-performance-polymer',
  'Polymer - PEEK GF': 'high-performance-polymer',
  'Polymer - PEEK CF': 'high-performance-polymer',
  'Carbon-Epoxy': 'cfrp',
  'Glass-Epoxy': 'cfrp',
  'Glass-Polyester': 'cfrp',
  'Aramid-Epoxy': 'cfrp',
  'Advanced High-Strength Steel': 'ahss',
  'Press-Hardening Steel': 'ahss',
  // 나머지 subcat(폴리머 범용 수지·특수 복합재 등)은 의도적으로 미매핑 → (a) 리포트에 후보로 등장
};

const bySubcat = new Map();
for (const m of materials) {
  const sc = `${m.category} / ${m.subcategory || '(none)'}`;
  if (!bySubcat.has(sc)) bySubcat.set(sc, []);
  bySubcat.get(sc).push(m);
}

const famTerms = Object.entries(glossary.terms).filter(([, t]) => t.category === 'alloy-family');

const md = [];
md.push('# 분류 완결 감사 리포트 (자동 생성 — audit-family-coverage.mjs)');
md.push('');
md.push(`> DB subcategory ${bySubcat.size} ↔ 글로서리 alloy-family ${famTerms.length}. (a)=페이지 없는 계열(후보), (b)=글로서리만 있고 DB 빈약.`);
md.push('');
md.push('## (a) DB subcategory 전수 — 글로서리 계열 페이지 유무');
md.push('');
md.push('| subcategory | entry 수 | 글로서리 | A4 문서 |');
md.push('|---|---|---|---|');
const rows = [...bySubcat.entries()].sort((a, b) => b[1].length - a[1].length);
// subcategory 에 ' / ' 가 포함될 수 있어(예: 'Titanium - Pure / CP Grades') 첫 구분자만 소비
const subOf = (sc) => sc.slice(sc.indexOf(' / ') + 3);
for (const [sc, list] of rows) {
  const sub = subOf(sc);
  const slug = SUBCAT_TO_SLUG[sub] || null;
  const hasTerm = slug && glossary.terms[slug] ? slug : '';
  const hasArt = slug && articles[slug] ? '✓' : '';
  md.push(`| ${sc} | ${list.length} | ${hasTerm || '**—**'} | ${hasArt} |`);
}
md.push('');
md.push('## (b) 글로서리 alloy-family 용어별 DB 근거');
md.push('');
md.push('| slug | display | A4 | 비고 |');
md.push('|---|---|---|---|');
for (const [slug, t] of famTerms) {
  md.push(`| ${slug} | ${t.display} | ${articles[slug] ? '✓' : '—'} |  |`);
}
md.push('');
md.push('> 후보 판단 기준: entry 수가 많은 미커버 subcategory(상단 — 표) 순으로 alloy-family 용어·문서 신설 검토.');
md.push('> 백주철(white cast iron)·ADI 는 §5 확정 — Cast Iron subcat 하위로 추가 예정.');

fs.mkdirSync(path.join(ROOT, 'docs/audits'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audits/family-coverage.md'), md.join('\n') + '\n');
const uncovered = rows.filter(([sc]) => !SUBCAT_TO_SLUG[subOf(sc)]);
console.log(`audit-family-coverage: subcat ${bySubcat.size} · alloy-family 용어 ${famTerms.length} · 미커버 subcat ${uncovered.length}`);
console.log('미커버 상위:', uncovered.slice(0, 10).map(([sc, l]) => `${subOf(sc)}(${l.length})`).join(' · '));
console.log('→ docs/audits/family-coverage.md');
