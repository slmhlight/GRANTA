/*
 * R227/E14/H4d Phase1 — 용어 정확·일관 감사 (GLOSSARY-IMPROVEMENT-PLAN §4.2, D5).
 *
 * §3.1 용어 대응표 기준으로 콘텐츠 소스(스토리·글로서리·절삭성/열처리/용접 노트·가이드 프로즈)에서
 * 한글 열처리어 사용처를 전수 리포트 — 영어 원문 우선 스윕(Phase 5)의 작업 목록.
 * "정규화"는 열처리 문맥(±60자 창에 야금 키워드)일 때만 오역으로 flag.
 *
 * 읽기 전용(리포트만): docs/audits/terminology.md. 사용: node scripts/audit-terminology.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* §3.1 대응표 — 한글 → 영어 표준 */
const MAP = [
  { ko: /담금질|소입/g, en: 'Quenching' },
  { ko: /뜨임|소려/g, en: 'Tempering' },
  { ko: /불림/g, en: 'Normalizing' },
  { ko: /정규화/g, en: 'Normalizing', ctx: true }, // 오역 — 열처리 문맥만
  { ko: /풀림/g, en: 'Annealing' },
  { ko: /용체화/g, en: 'Solution treatment' },
  { ko: /시효/g, en: 'Aging' },
  { ko: /오스템퍼링/g, en: 'Austempering' },
  { ko: /마르퀜칭|마템퍼링/g, en: 'Martempering' },
  { ko: /서브제로/g, en: 'Sub-zero (cryogenic) treatment' },
  { ko: /응력제거|응력 제거/g, en: 'Stress relief' },
  { ko: /오스테나이트화/g, en: 'Austenitizing' },
  { ko: /침탄/g, en: 'Carburizing' },
  { ko: /질화(?!물|텅스텐)/g, en: 'Nitriding' }, // 질화물(nitride)은 제외
  { ko: /경화능/g, en: 'Hardenability' },
  { ko: /적열경도/g, en: 'Red hardness' },
  { ko: /예민화/g, en: 'Sensitization' },
];
const HT_CTX = /열처리|조직|페라이트|펄라이트|오스테나이트|마르텐사이트|공랭|노냉|급랭|서랭|A3|A1|미세|균질|탄소|강도|경도|불림|normaliz/i;

/* 대상 콘텐츠 소스 (코드 식별자·i18n 키 제외 — 사용자 노출 프로즈만) */
const SOURCES = [
  { p: 'data/alloy-stories.json', label: '스토리' },
  { p: 'data/glossary.json', label: '글로서리 정의' },
  { p: 'data/glossary-articles.json', label: '글로서리 A4' },
  { p: 'data/machining-guidance.json', label: '절삭성 가이드' },
  { p: 'data/process-profiles.json', label: '공정 프로파일' },
  { p: 'data/ht-guidance.json', label: 'HT 가이드' },
  { p: 'data/selection-insights.json', label: '선택 인사이트' },
  { p: 'data/coating-recommendations.json', label: '코팅 추천' },
  { p: 'client/src/lib/ht-glossary.ts', label: 'HT 글로서리(UI)' },
  { p: 'client/src/lib/ht-alloy-specific.ts', label: 'HT 합금별(UI)' },
  { p: 'client/src/pages/Guide.tsx', label: '가이드 프로즈(UI)' },
  { p: 'client/src/pages/guide/components.tsx', label: '가이드 컴포넌트(UI)' },
];

const report = []; // {term, en, src, count, mistranslation, samples[]}
for (const { p, label } of SOURCES) {
  let text;
  try { text = read(p); } catch { continue; }
  for (const { ko, en, ctx } of MAP) {
    ko.lastIndex = 0;
    const hits = [];
    for (const m of text.matchAll(ko)) {
      if (ctx) { // 열처리 문맥 판별 (정규화 오역)
        const win = text.slice(Math.max(0, m.index - 60), m.index + 60);
        if (!HT_CTX.test(win)) continue;
      }
      hits.push(m.index);
    }
    if (!hits.length) continue;
    const samples = hits.slice(0, 3).map((i) => text.slice(Math.max(0, i - 28), i + 32).replace(/\s+/g, ' ').replace(/\|/g, '·'));
    report.push({ term: ko.source, en, src: `${label} (${p})`, count: hits.length, mis: !!ctx, samples });
  }
}

report.sort((a, b) => (b.mis - a.mis) || b.count - a.count);
const total = report.reduce((s, r) => s + r.count, 0);
const misRows = report.filter((r) => r.mis);

const md = [];
md.push('# 용어 정확·일관 감사 리포트 (자동 생성 — audit-terminology.mjs)');
md.push('');
md.push(`> §3.1 대응표 기준 한글 열처리어 사용처: **총 ${total} 건 / ${report.length} (용어×소스)**. Phase 5 영어원문 스윕의 작업 목록.`);
md.push(`> **"정규화" 오역(열처리 문맥): ${misRows.reduce((s, r) => s + r.count, 0)} 건** — 최우선 교정.`);
md.push('');
md.push('| 한글 패턴 | 영어 표준 | 소스 | 건수 | 오역 | 샘플 |');
md.push('|---|---|---|---|---|---|');
for (const r of report) md.push(`| ${r.term} | ${r.en} | ${r.src} | ${r.count} | ${r.mis ? '**⚠**' : ''} | ${r.samples[0] || ''} |`);
md.push('');

fs.mkdirSync(path.join(ROOT, 'docs/audits'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audits/terminology.md'), md.join('\n') + '\n');
console.log(`audit-terminology: ${total} 건 (${report.length} 용어×소스) · 정규화 오역 ${misRows.reduce((s, r) => s + r.count, 0)} 건`);
console.log('상위:', report.slice(0, 10).map((r) => `${r.term}@${r.src.split(' ')[0]}(${r.count})`).join(' '));
console.log('→ docs/audits/terminology.md');
