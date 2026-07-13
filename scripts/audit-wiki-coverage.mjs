/*
 * R227/E14/H4d Phase1 — 위키 연결 완전성 감사 (GLOSSARY-IMPROVEMENT-PLAN §4.1, D4·D9).
 *
 * 코퍼스(글로서리 A4 본문·스토리·절삭성/열처리/용접/인사이트 노트)에서 재료·용어 언급을 추출해 3분류:
 *   ① 존재-미링크  — DB 에 있으나 autolink allowlist 밖(모호/짧음)이라 링크 안 걸림 → 링크 배선 후보
 *   ② 진짜 부재    — 어떤 entry·별칭과도 안 맞는 합금명 → 신규 DB entry 후보 (§5.4)
 *   ③ 미정의 용어  — 본문이 "한글(English)" 로 소개하지만 글로서리에 없는 전문어 → 신규 용어 후보
 *
 * 읽기 전용(리포트만): docs/audits/wiki-coverage.md + .json. 게이트 아님(1차는 수동 검수용).
 * 사용: node scripts/audit-wiki-coverage.mjs   (build:data + build:wiki 산출물 필요)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensOf, norm } from './lib/name-tokens.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const materials = rd('client/public/materials.json');
const wiki = rd('client/public/wiki-index.json');
const glossary = rd('data/glossary.json');
const articles = rd('data/glossary-articles.json').articles;
const stories = rd('data/alloy-stories.json').stories;

/* ── 1) 존재 조회 맵 ───────────────────────────────────────────── */
// (a) wiki-index surface forms (스토리 보유 242 그룹) — autolink 여부 포함
const wikiForms = new Map(); // norm form → { id, autolink }
for (const e of wiki.entities) {
  for (const sf of e.surface_forms) {
    const prev = wikiForms.get(sf.form);
    if (!prev || (sf.autolink && !prev.autolink)) wikiForms.set(sf.form, { id: e.id, autolink: !!sf.autolink });
  }
  for (const u of e.uns || []) {
    const nu = norm(u);
    if (nu && !wikiForms.has(nu)) wikiForms.set(nu, { id: e.id, autolink: false });
  }
}
// (b) 전체 materials(1129) 이름·별칭·UNS — 스토리 없는 entry 도 "존재"
const dbForms = new Map(); // norm form → material id
for (const m of materials) {
  const base = String(m.name || '').replace(/\s*[—(].*$/, '').trim();
  for (const tk of tokensOf(base)) if (!dbForms.has(tk)) dbForms.set(tk, m.id);
  for (const a of m.aliases || []) for (const tk of tokensOf(a)) if (!dbForms.has(tk)) dbForms.set(tk, m.id);
  for (const u of m.uns || []) { const nu = norm(u); if (nu && !dbForms.has(nu)) dbForms.set(nu, m.id); }
}
// (c) 글로서리 용어 surface forms
const termForms = new Set();
for (const t of Object.values(glossary.terms)) for (const f of t.surface_forms || []) termForms.add(norm(f));

/* ── 2) 코퍼스 조립 (source 라벨 부착) ─────────────────────────── */
const corpus = []; // {src, key, text}
for (const [slug, art] of Object.entries(articles))
  for (const [i, sec] of (art.sections || []).entries())
    corpus.push({ src: 'article', key: `${slug}#${i} ${sec.heading}`, text: sec.body || '' });
for (const [key, st] of Object.entries(stories)) {
  const parts = [...(st.sections ? Object.values(st.sections) : []), ...(st.timeline || []).map((e) => e.event)];
  corpus.push({ src: 'story', key, text: parts.join(' ') });
}
for (const [srcFile, label] of [
  ['data/machining-guidance.json', 'machining'],
  ['data/process-profiles.json', 'profiles'],
  ['data/selection-insights.json', 'insights'],
  ['data/coating-recommendations.json', 'coating'],
  ['data/ht-guidance.json', 'ht'],
]) {
  try {
    const collect = [];
    (function walk(o, p) {
      if (typeof o === 'string') { if (/[가-힣]/.test(o) && o.length > 20) collect.push({ p, s: o }); return; }
      if (Array.isArray(o)) { o.forEach((v, i) => walk(v, `${p}[${i}]`)); return; }
      if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k.startsWith('_')) continue; walk(v, p ? `${p}.${k}` : k); }
    })(rd(srcFile), '');
    for (const { p, s } of collect) corpus.push({ src: label, key: p, text: s });
  } catch { /* optional source */ }
}
// (H4g) 가이드 14챕터 프로즈 — Guide.tsx 의 JSX 텍스트 노드·한글 문자열 리터럴.
// 이전까지 감사 사각지대(합금명·용어 언급이 코퍼스 밖) → 편입.
try {
  const tsx = fs.readFileSync(path.join(ROOT, 'client/src/pages/Guide.tsx'), 'utf8');
  let gi = 0;
  for (const m of tsx.matchAll(/>([^<>{}]{6,})</g)) {
    const t = m[1].trim();
    if (!t || /^https?:|className|^\w+=/.test(t)) continue;
    if (!/[가-힣]/.test(t) && t.length < 12) continue;
    corpus.push({ src: 'guide', key: `tsx#${gi++}`, text: t });
  }
  for (const m of tsx.matchAll(/\{\s*['"`]([^'"`]{8,})['"`]\s*\}/g)) {
    if (/[가-힣]/.test(m[1])) corpus.push({ src: 'guide', key: `str#${gi++}`, text: m[1] });
  }
} catch { /* optional */ }

/* ── 3) 합금-형 언급 추출 (Latin) ──────────────────────────────── */
// 대상 패턴(보수적·타깃형): 규격 grade·상용명+숫자·PH 계열·UNS. 순수숫자·연도·규격서 번호 제외.
const ALLOY_PATTERNS = [
  /\bUNS ?[A-Z]\d{5}\b/g,
  /\b(?:Custom|Carpenter) ?\d{3}\b/g,
  /\bAM ?3\d{2}\b/g,
  /\bPH ?\d{2}-\d(?:\s?Mo)?\b/g,
  /\b\d{2}-\d{1,2}(?:-\d{1,2})? ?(?:PH|Mo)\b/g,
  // 브랜드+지정번호 — 꼬리는 숫자 시작 토큰만 흡수 ("Monel Ni-Cu"·"Waspaloy bar" 방지, H4i)
  /\b(?:Inconel|Incoloy|Hastelloy|Haynes|Monel|Nimonic|Waspaloy|Rene|René|Udimet|Stellite|MAR-M|CMSX)(?:[- ]?[A-Z]?-?\d[\w.]{0,7})?\b/g,
  // 일반 짧은 grade 코드 — 규격기관 접두(ASTM A967 등)·경도(HRC 30)·온도 문맥은 lookbehind/lookahead 로 제외
  /(?<!ASTM )(?<!AMS )(?<!AWS )(?<!ISO )(?<!ASME )(?<!NACE )(?<!API )(?<!SAE )(?<!JIS )(?<!MIL-)(?<!MIL )(?<!DTL-)(?<!\/)\b[A-Z]{1,3}[- ]?\d{2,4}[A-Z]{0,2}\b(?! ?°C)/g,
  /\b(?:Grade|Gr\.?) ?\d{1,3}\b/gi,
];
// 규격서·단위·연도·temper 조건 — 합금명 아님.
// ※ H5-D1 (W3) 동결(2026-07-13): FILTER_AUDIT 로 전 항목 계측·검토 완료.
//    known-material(dbForms/wikiForms) 은 STOP 이전에 통과하므로 실합금(A36·A2·F75·S7 등)
//    오차단 없음 — 아래 패턴은 '비-재료 토큰'에만 적용. 0건 항목은 방어적 가드(콘텐츠 변경 대비).
//    신규 항목 추가는 반드시 원문 확인 후. #5 등 광범위 패턴도 known-material 우선 판정이 보호막.
const STOP_RE = [
  /^(ASTM|AMS|ISO|EN|JIS|DIN|KS|SAE|AWS|API|NACE|MIL|BS|GB)[- ]?[A-Z]?\d/i, // 규격서 번호(EN/JIS/DIN/KS 접두 포함 — 구 중복 패턴 #8 흡수)
  /^(19|20)\d{2}$/, // 연도 (방어)
  /^\d+$/, // 순수 숫자 (방어)
  /^(HRC|HRB|HBW?|HV|MPA|GPA|KSI|PSI|RA|UTS|CVN)[- ]?\d*$/i, // 경도·물성 값
  /^(H|T|TH|RH|CH|O)[- ]?\d{1,4}$/i, // temper·시효 조건 (H900·T6·TH1050·RH950)
  /^(A|B|C|F|S)\d{1,2}$/i, // 짧은 클래스 라벨(Shore A40·A60 등) — 실합금은 known-material 우선 통과
  /^GR(ADE)?\.? ?\d{1,3}$/i, // Grade N — 문맥 없인 판별 불가(과공·grade 91 등) → 별도 검토
  /^(AC|WQ|OQ|AQ|FC)\d*$/i, // 냉각 약어 (방어)
  /^(KIC|KISCC|LMP|PAG|HSS|PCD|PBT|CE|PREN)[- ]?\d*$/i, // 물성 기호·공정 약어 + 숫자
  /^(VIM|VAR|ESR)[- ]?\d*$/i, // 용해 공정 접두 (VIM 9310 등 — 합금 본체는 별도 매칭)
  /^CMH[- ]?\d+$/i, // 핸드북 (CMH-17)
  /^F[- ]?\d{4}$/i, // ASTM F 4자리 규격 (F3301 등; F75 같은 2자리 합금명은 통과)
  /^G ?\d{3,4}$/i, // ASTM G·JIS G 규격 번호
  /^[CE] ?\d{1,3}$/i, // 온도·모듈러스 파편 ("C 27"·"E 114"; 구리 C+5자리는 통과)
  /^D ?\d{3,4}$/i, // 문서·규격 코드 (D008·D 8302; D2 등 1자리는 통과)
  /^[IVX]{1,4} ?\d+$/, // 로마숫자 Type 표기 (III 25 µm 등)
  /^HT-? ?\d{1,3}$/i, // 강도클래스·열처리 파편 (HT-125·"HT 10")
  /^AR-?0\d$/i, // FAA 보고서 번호 (FAA AR-03 등; AR400 내마모강은 통과)
  // H4i — 원문 확인으로 판명된 비합금 (오탐 재분류)
  /^(FAR|CFR|CS|FDA|FAA|QQ|TM|SMC|KBC|AS)[- ]?\d/i, // 인증·법규·문서 번호 (FAR 25·CFR 177·QQ-N-286·NASA TM·AS9100)
  /^(HIP|SHT|EBM|LPBF|SLM|DED) ?\d{1,4}$/i, // 공정 파라미터 파편 (HIP 1120°C·SHT 520·EBM 45µm)
  /^EOS ?\d*$/i, // 장비 제조사 (EOS 17-4 파편)
  /^TF\d{2}$/i, // temper 코드 (C17200 TF00)
  /^P\d{3}$/i, // 방진 보호구 등급 (P100 — K110·M247 등 합금과 무충돌)
  /^N-?\d{3}$/i, // QQ-N-286 파편 등 (N+3자리 합금 없음)
  /^E ?\d{4}$/i, // ASTM E 시험규격 (E1820·E1570; E52100 5자리는 통과)
  /^G ?\d{2}$/i, // 아연도금 코팅 등급 (G60·G90)
  /^(SA|SB)-\d{2,3}$/i, // ASME 재료규격 접두 (SA-240·SA-335)
  /^A(500|706|743|744|352|967)$/i, // ASTM 규격 번호 — 합금명과 충돌 없는 것만 명시
  /^B(171|187|453)$/i, // ASTM B 구리 규격 번호
  /^WRC-?\d{4}$/i, // 용접연구회 다이어그램 판 (WRC-1992)
];
// 실재하나 등재 보류 — 사유 기록 (리포트 별도 섹션으로 이동, absent 집계 제외)
const DOCUMENTED_ABSENT = new Map([
  ['sx300', '독점 Cu계 AM 합금 — 공개 검증 datasheet 없음'],
  ['m55j', '탄소섬유 원사 규격 — 구조 entry 범위 밖(라미네이트는 CFRP 로 수록)'],
  ['dx51d', 'EN 아연도금 강판 grade — KS D 3506 등가 서술용 언급'],
  ['zk60a', 'Mg 단조합금 — 1회 언급·수요 미확인'],
  ['unsn07720', 'Udimet 720Li — 1회 언급(터빈 디스크 niche)'],
  ['unsn13017', 'HT 노트 인용 UNS — 대응 상용명 미상'],
  ['unsr56410', 'Ti-6246 — β Ti 노트 인용'],
  ['unsr58153', 'β Ti 변형 grade — 노트 인용'],
  ['unsr58210', 'β Ti 변형 grade — 노트 인용'],
  ['unsm16600', 'Mg 합금 UNS — 노트 인용'],
  ['unsk93160', 'Maraging 350 — DB 는 250/300 만 수록'],
]);
// 항공기·엔진·무기 호칭 — 합금 아님 (실재 합금과 겹치지 않는 것만: A380 다이캐스트 합금 등은 제외)
const NON_MATERIAL = new Set([
  'a320', 'a350', 'b47', 'b52', 'b58', 'f15', 'f16', 'f86', 'a18', 'p47', 'p51',
  'sr71', 'm16', 'j57', 'j79', 'f404', 'cfm56',
]);
// H5-D1 (W3) — 필터 계측(env FILTER_AUDIT): 항목별 차단 실적 → 사문화(0건)·과차단 검출용.
const FA = !!process.env.FILTER_AUDIT;
const STOP_HITS = STOP_RE.map(() => ({ n: 0, ex: new Set() }));
const NM_HITS = new Map(), EN_HITS = new Map();
const isStop = (s) => {
  const t = s.trim();
  for (let i = 0; i < STOP_RE.length; i++) if (STOP_RE[i].test(t)) {
    if (FA) { STOP_HITS[i].n++; if (STOP_HITS[i].ex.size < 6) STOP_HITS[i].ex.add(t); }
    return true;
  }
  return false;
};

const mentions = new Map(); // norm → { raw, count, srcs:Set, cls, matchId }
const documented = new Map(); // norm → { raw, count, srcs:Set, reason }
for (const { src, key, text } of corpus) {
  const seen = new Set();
  const spans = []; // [start,end] — 앞선(우선) 패턴의 스팬. 뒤 패턴의 부분 매치("M 247" ⊂ "MAR-M 247") 차단 (H4i)
  for (const re of ALLOY_PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const s = m.index, e = s + m[0].length;
      if (spans.some(([a, b]) => s < b && a < e)) continue; // 우선 패턴 스팬과 겹침 → 파편
      const raw = m[0].trim();
      // é 등 결합 분음부호 제거 후 정규화 (René → Rene)
      const nf = norm(raw.normalize('NFD').replace(/[̀-ͯ]/g, ''));
      if (!nf || nf.length < 2) continue;
      // H5-D1 (W3) — known-material 판정을 STOP 필터보다 우선.
      //   실합금(A36·A2·F75·S7 등)이 짧은-라벨 STOP(#5 [ABCFS]\d{1,2})에 오차단되던 문제 해소.
      //   별칭 폴백 포함(X7050→7050·13-8Mo→PH13-8Mo·SM490Y→SM490).
      const alts = [nf, nf.replace(/^x(?=\d)/, ''), `ph${nf}`, nf.replace(/^haynes(?=[a-z])/, '')];
      if (/\d[a-z]$/.test(nf)) alts.push(nf.slice(0, -1));
      let w = null, dbId = null;
      for (const alt of alts) { w = wikiForms.get(alt); dbId = dbForms.get(alt); if (w || dbId) break; }
      const known = !!(w || dbId);
      if (!known) {
        if (isStop(raw)) continue;                         // 규격서·단위·연도 등 (비-재료만)
        if (NON_MATERIAL.has(nf)) { if (FA) NM_HITS.set(nf, (NM_HITS.get(nf) || 0) + 1); continue; }
      }
      spans.push([s, e]);
      if (seen.has(nf)) continue;
      seen.add(nf);
      if (DOCUMENTED_ABSENT.has(nf)) {
        let d = documented.get(nf);
        if (!d) { d = { raw, count: 0, srcs: new Set(), reason: DOCUMENTED_ABSENT.get(nf) }; documented.set(nf, d); }
        d.count++;
        if (d.srcs.size < 3) d.srcs.add(`${src}:${key.slice(0, 42)}`);
        continue;
      }
      let rec = mentions.get(nf);
      if (!rec) {
        const cls = w ? (w.autolink ? 'linked' : 'exists-unlinked') : dbId ? 'exists-unlinked' : 'absent';
        rec = { raw, count: 0, srcs: new Set(), cls, matchId: w ? w.id : dbId || null };
        mentions.set(nf, rec);
      }
      rec.count++;
      if (rec.srcs.size < 6) rec.srcs.add(`${src}:${key.slice(0, 42)}`);
    }
  }
}

/* ── 4) 미정의 용어: "한글(English)" 소개 패턴 ─────────────────── */
const termIntro = new Map(); // english norm → {ko, en, count, srcs}
// "…한글용어(English)" — 한글은 괄호 직전 1~2 어절만(긴 구문 유입 방지)
const INTRO_RE = /([가-힣·]{2,12}(?:\s[가-힣·]{2,12})?)\(([A-Za-z][A-Za-z\s'-]{2,32})\)/g;
const EN_STOP = new Set(['si', 'iso', 'astm', 'ams', 'ks', 'jis', 'en', 'din', 'uns', 'ai',
  // H4i — ③ 노이즈 재분류: 기관·프로그램·상표·어원 설명·광의 일반어 (용어화 부적절)
  'asme', 'slwt', 'celcon', 'hpht', 'rampt', 'grcop', 'guillaume', 'ductibor', 'spallation',
  'sweet', 'poison', 'patent', 'pearl', 'cement', 'commodity', 'retorque', 'kinetics',
  'scratch', 'rusting', 'ironbased', 'alsi', 'wirerod', 'moltenlead', 'delrinvshostaform',
  // H4i-2 — ③ 잔여 전수분류: 기관·상표·관용구·문맥 파편(실질 개념은 surface 흡수 완료)
  'wshape', 'iads', 'duralumin', 'vimvar', 'screwmachine', 'dualcertified', 'marinegrade',
  'naca', 'aircrafttubing', 'taps', 'brushberyllium', 'unioncarbide', 'ornl', 'msre', 'mpie',
  'osseointegration', 'rheniumeffect', 'ausc', 'gelspinning', 'laminatedglass', 'dyneema',
  'goretex', 'nomex', 'celazole', 'frozensmoke', 'invariable', 'copperbottomed', 'pigtail',
  'catenary', 'sheath', 'cucrnb', 'ssme', 'balsa', 'bamboo', 'hexagonalcell', 'skin',
  'norun', 'hard', 'metalreplacement', 'rubbing', 'welding', 'chipping', 'diecut', 'cryo',
  'cbnwheel', 'induction', 'acsr', 'rohs', 'citric', 'hepa', 'oemproprietary', 'xyvsz',
  'materialindex', 'osteoconductive', 'ferrotic',
]);
for (const { src, key, text } of corpus) {
  INTRO_RE.lastIndex = 0;
  for (const m of text.matchAll(INTRO_RE)) {
    const ko = m[1].trim(), en = m[2].trim();
    const ne = norm(en);
    if (!ne || ne.length < 4) continue;
    if (EN_STOP.has(ne)) { if (FA) EN_HITS.set(ne, (EN_HITS.get(ne) || 0) + 1); continue; }
    if (termForms.has(ne) || termForms.has(norm(ko))) continue; // 이미 글로서리
    if (wikiForms.has(ne) || dbForms.has(ne)) continue; // 재료명
    let rec = termIntro.get(ne);
    if (!rec) { rec = { ko, en, count: 0, srcs: new Set() }; termIntro.set(ne, rec); }
    rec.count++;
    if (rec.srcs.size < 5) rec.srcs.add(`${src}:${key.slice(0, 42)}`);
  }
}

/* ── 5) 리포트 ─────────────────────────────────────────────────── */
const rows = [...mentions.values()];
const absent = rows.filter((r) => r.cls === 'absent').sort((a, b) => b.count - a.count);
const unlinked = rows.filter((r) => r.cls === 'exists-unlinked').sort((a, b) => b.count - a.count);
const linked = rows.filter((r) => r.cls === 'linked');
const terms = [...termIntro.values()].sort((a, b) => b.count - a.count);

const md = [];
md.push('# 위키 연결 완전성 감사 리포트 (자동 생성 — audit-wiki-coverage.mjs)');
md.push('');
md.push(`> 코퍼스: article ${Object.keys(articles).length} · story ${Object.keys(stories).length} + 절삭성/열처리/용접/인사이트 노트. `);
md.push(`> 언급 고유형 ${rows.length} = 링크됨 ${linked.length} · **①존재-미링크 ${unlinked.length}** · **②진짜부재 ${absent.length}** · **③미정의용어 ${terms.length}**`);
md.push('> ②는 §5.4 신규 entry 후보(수동 검수 — 별칭 오탐 가능), ③은 신규 글로서리 후보.');
md.push('');
md.push('## ② 진짜 부재 (신규 DB entry 후보)');
md.push('');
md.push('| 언급 | 횟수 | 출처(샘플) |');
md.push('|---|---|---|');
for (const r of absent.slice(0, 80)) md.push(`| ${r.raw} | ${r.count} | ${[...r.srcs].slice(0, 3).join(' · ')} |`);
md.push('');
md.push('## ① 존재-미링크 (autolink 밖 — 링크 배선 후보)');
md.push('');
md.push('| 언급 | 횟수 | 매칭 | 출처(샘플) |');
md.push('|---|---|---|---|');
for (const r of unlinked.slice(0, 80)) md.push(`| ${r.raw} | ${r.count} | ${r.matchId} | ${[...r.srcs].slice(0, 2).join(' · ')} |`);
md.push('');
md.push('## ③ 미정의 용어 ("한글(English)" 소개 패턴 중 글로서리 부재)');
md.push('');
md.push('| 한글 | English | 횟수 | 출처(샘플) |');
md.push('|---|---|---|---|');
for (const t of terms.slice(0, 100)) md.push(`| ${t.ko} | ${t.en} | ${t.count} | ${[...t.srcs].slice(0, 2).join(' · ')} |`);
md.push('');
md.push('## ④ 등재 보류 (실재 확인·사유 기록 — absent 집계 제외)');
md.push('');
md.push('| 언급 | 횟수 | 보류 사유 |');
md.push('|---|---|---|');
for (const [, d] of [...documented.entries()].sort((a, b) => b[1].count - a[1].count)) {
  md.push(`| ${d.raw} | ${d.count} | ${d.reason} |`);
}
md.push('');

fs.mkdirSync(path.join(ROOT, 'docs/audits'), { recursive: true });
if (FA) {
  // W3 필터 계측 리포트 — 항목별 차단 실적. 0건=사문화 후보.
  const fam = ['# 오탐 필터 계측 (FILTER_AUDIT — audit-wiki-coverage.mjs)', ''];
  fam.push('## STOP_RE 패턴별 차단 실적 (0건 = 사문화)', '', '| # | 패턴 | 차단 | 샘플 |', '|---|---|---|---|');
  STOP_RE.forEach((re, i) => fam.push(`| ${i} | \`${String(re).replace(/\|/g, '\\|').slice(0, 46)}\` | ${STOP_HITS[i].n} | ${[...STOP_HITS[i].ex].slice(0, 4).join(', ')} |`));
  fam.push('', '## NON_MATERIAL 항목별 (0건 = 사문화)', '', '| 항목 | 차단 |', '|---|---|');
  for (const nm of NON_MATERIAL) fam.push(`| ${nm} | ${NM_HITS.get(nm) || 0} |`);
  fam.push('', '## EN_STOP 항목별 (0건 = 사문화)', '', '| 항목 | 차단 |', '|---|---|');
  for (const en of EN_STOP) fam.push(`| ${en} | ${EN_HITS.get(en) || 0} |`);
  fs.writeFileSync(path.join(ROOT, 'docs/audits/filter-audit.md'), fam.join('\n') + '\n');
  const deadStop = STOP_HITS.filter((h) => h.n === 0).length;
  const deadNM = [...NON_MATERIAL].filter((x) => !(NM_HITS.get(x) > 0)).length;
  const deadEN = [...EN_STOP].filter((x) => !(EN_HITS.get(x) > 0)).length;
  console.log(`FILTER_AUDIT: STOP 사문화 ${deadStop}/${STOP_RE.length} · NON_MATERIAL 사문화 ${deadNM}/${NON_MATERIAL.size} · EN_STOP 사문화 ${deadEN}/${EN_STOP.size} → docs/audits/filter-audit.md`);
}
fs.writeFileSync(path.join(ROOT, 'docs/audits/wiki-coverage.md'), md.join('\n') + '\n');
fs.writeFileSync(path.join(ROOT, 'docs/audits/wiki-coverage.json'), JSON.stringify({
  absent: absent.map((r) => ({ raw: r.raw, count: r.count, srcs: [...r.srcs] })),
  unlinked: unlinked.map((r) => ({ raw: r.raw, count: r.count, matchId: r.matchId, srcs: [...r.srcs] })),
  terms: terms.map((t) => ({ ko: t.ko, en: t.en, count: t.count, srcs: [...t.srcs] })),
}, null, 1) + '\n');

console.log(`audit-wiki-coverage: 언급 ${rows.length} = linked ${linked.length} · unlinked ${unlinked.length} · absent ${absent.length} · 미정의용어 ${terms.length}`);
console.log('absent 상위:', absent.slice(0, 15).map((r) => `${r.raw}(${r.count})`).join(' '));
console.log('용어 상위:', terms.slice(0, 12).map((t) => `${t.ko}/${t.en}(${t.count})`).join(' '));
console.log('→ docs/audits/wiki-coverage.md');
