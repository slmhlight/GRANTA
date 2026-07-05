/* R226t/E13 — 스토리 이름-커버리지 감사.
 * 각 스토리 멤버(entry)의 합금 지정자가 스토리 텍스트(display+sections+legacy+timeline)에
 * 등장하는지 검사한다. "다른 합금 이야기만 보이는" 그룹 스토리를 검출하기 위한 도구.
 * 사용: node scripts/audit-story-names.mjs  (build:data 산출물 client/public/materials.json 필요)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'client/public/materials.json'), 'utf8'));
const fr = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry-id-freeze.json'), 'utf8'));
const map = fr.map || fr; const rev = {}; for (const [l, s] of Object.entries(map)) rev[s] = l;
const by = {}; for (const x of m) by[x.id] = x;
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/alloy-stories.json'), 'utf8'));

// 스토리 본문에서 한글로 언급될 수 있는 명칭
const KO = {
  'music wire': '피아노선', 'gray cast iron': '회주철', 'tungsten': '텅스텐', 'vanadium': '바나듐',
  'beryllium': '베릴륨', 'diamond': '다이아몬드', 'epoxy': '에폭시', 'polyester': '폴리에스터',
  'polystyrene': '폴리스타이렌', 'polyimide': '폴리이미드', 'zirconium': '지르코늄', 'rhenium': '레늄',
  'hafnium': '하프늄', 'chromium': '크롬', 'copper': '구리', 'brass': '황동', 'bronze': '청동',
  'kovar': '코바', 'invar': '인바', 'molybdenum': '몰리브데넘', 'tantalum': '탄탈럼', 'niobium': '나이오븀',
  'titanium': '티타늄', 'magnesium': '마그네슘', 'aluminum': '알루미늄', 'nickel': '니켈', 'cobalt': '코발트',
  'polyethylene': '폴리에틸렌', 'polysulfone': '폴리설폰', 'rebar': '철근', 'forsterite': '포스터라이트',
};
// 지정자가 아닌 범용 단어 (무숫자 fallback 에서 제외 — 규격 접두어 포함: 단독으론 식별력 없음)
const STOP = new Set(['steel', 'tool', 'alloy', 'iron', 'high', 'cast', 'wire', 'grade', 'type', 'plate',
  'stainless', 'carbon', 'structural', 'foam', 'resin', 'rubber', 'polymer', 'composite', 'fiber', 'glass',
  'sheet', 'coated', 'heavy', 'pure', 'hot', 'cold', 'work', 'speed', 'spring', 'bearing', 'strip', 'homopolymer',
  'viscosity', 'rolled', 'homogeneous', 'armor', 'dip', 'mold', 'super',
  'aisi', 'astm', 'asme', 'uns', 'sae', 'jis', 'din', 'jindal', 'api']);
// 원소 화합물명 → 화학식 (스토리가 식으로 표기하는 경우)
const FORMULA = {
  'tantalumcarbide': 'tac', 'hafniumcarbide': 'hfc', 'hafniumdiboride': 'hfb', 'zirconiumdiboride': 'zrb',
  'titaniumcarbide': 'tic', 'boroncarbide': 'b4c', 'boronnitride': 'bn', 'siliconcarbide': 'sic',
  'siliconnitride': 'si3n4', 'aluminumnitride': 'aln',
};

const norm = (s) => s.replace(/[\s‐‑–—―·×,()\/%]/g, '').replace(/-/g, '').toLowerCase();

function tokensOf(base) {
  const t = new Set();
  const full = norm(base);
  if (full.length >= 2) t.add(full); // 전체 이름 (EVA·PC-ABS·Onyx 등)
  if (FORMULA[full]) t.add(FORMULA[full]);
  const words = base.split(/[\s\/(),]+/).map((r) => r.replace(/[.,;:~]+$/g, '')).filter(Boolean);
  words.forEach((w, i) => {
    if (/\d/.test(w)) {
      for (const piece of w.split('-')) { // 하이픈 분해: 2024-T351 → 2024, T351
        if (!/\d/.test(piece)) continue;
        const p = piece.replace(/[^\dA-Za-z.]/g, '');
        if (p.length >= 2) t.add(norm(p));
        const noLead = p.replace(/^[A-Za-z]+/, '');   // SS410 → 410
        if (noLead.length >= 3) t.add(norm(noLead));
        const noTrail = p.replace(/[A-Za-z]+$/, '');  // SD400W → SD400 (숫자 유지 시)
        if (noTrail.length >= 3 && /\d/.test(noTrail)) t.add(norm(noTrail));
      }
      if (w.includes('-')) t.add(norm(w)); // 결합형도 (Ti-6Al-4V → ti6al4v)
      if (i > 0 && !/\d/.test(words[i - 1])) t.add(norm(words[i - 1] + w)); // 인접 쌍: "Grade 7" → grade7
      if (i + 1 < words.length && !/\d/.test(words[i + 1])) t.add(norm(w + words[i + 1])); // "9% Ni" → 9ni
    } else if (w.length >= 3 && !STOP.has(w.toLowerCase())) {
      t.add(norm(w));
    }
  });
  return [...t].filter((tk) => tk && tk.length >= 2);
}

const report = [];
for (const [key, st] of Object.entries(doc.stories)) {
  const text = norm([st.display || '', ...(st.sections ? Object.values(st.sections) : []), st.legacy_text || '',
    ...(st.timeline || []).map((e) => e.event)].join(' '));
  const missing = new Map();
  for (const sid of st.stable_ids) {
    const e = by[rev[sid]]; if (!e) continue;
    const base = e.name.replace(/\s*[—(].*$/, '').trim();
    const toks = tokensOf(base);
    const hit = toks.some((tk) => text.includes(tk) || (KO[tk] && text.includes(norm(KO[tk]))))
      || (KO[base.toLowerCase()] && text.includes(norm(KO[base.toLowerCase()])));
    if (!hit) { if (!missing.has(base)) missing.set(base, []); missing.get(base).push(sid); }
  }
  if (missing.size) report.push({ key, v2: !!st.sections, display: st.display, missing: [...missing.entries()] });
}
report.sort((a, b) => b.missing.length - a.missing.length);
console.log('이름 미커버 스토리:', report.length, '/', Object.keys(doc.stories).length);
for (const r of report) {
  console.log(`\n[${r.v2 ? 'v2' : 'V1'}] ${r.key} :: ${r.display}`);
  for (const [base, sids] of r.missing) console.log('   -', base, '(' + sids.join(',') + ')');
}
