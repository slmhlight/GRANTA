// R205-B — supplementary-materials.json 의 steel entries 에서 points[6] (thermal_conductivity)
// 에 0.45×UTS (fatigue 유도값) 가 잘못 들어간 44건을 family-typical k 로 정정.
// 비철 (AA 5454/HK31A/C22000/AA 5182) 은 실제 k 와 우연 일치 — 제외.
import fs from 'node:fs';
import path from 'node:path';

const SUPP = path.join(path.resolve('.'), 'data', 'supplementary-materials.json');
const supp = JSON.parse(fs.readFileSync(SUPP, 'utf8'));

// name prefix → correct k (W/mK, RT family-typical, ASM Vol.1 + vendor datasheets)
const K_FIX = [
  [/^SHN(275|355|420|460)/, 50],          // 구조용 압연 H 형강 (탄소강)
  [/^SD(400|500|600|700)/, 48],           // 철근
  [/^SM(275A|355B|420C|490[ABC]?|570)/, 47], // 용접구조용 (SM570 TMCP 45 근사 포함)
  [/^SS(275|315) \(KS D 3503/, 50],       // 일반구조용
  [/^SAPH440/, 48],                        // 자동차 HSLA
  [/^SPFH590/, 45],
  [/^SHP(275W|355W|450W)/, 48],            // 시트파일
  [/^SGCC/, 50],                           // 아연도금 일반
  [/^SGC400/, 48],
  [/^STK490/, 50],                         // 구조용 강관
  [/^STKM13B/, 50],
  [/^SG325/, 50],                          // 가스용기
  [/^SPA-H/, 48],                          // 내후성강
  [/^Hot-dip Zn-Mg-Al/, 48],
  [/^API 5L X(70|80) line pipe/, 45],      // TMCP line pipe
  [/^SUP(9|10) \(KS D 3701/, 40],          // 스프링강 (Cr-Mn/Cr-V)
  [/^SK85/, 45],                           // 탄소공구강
  [/^TWIP1180/, 14],                       // 고Mn austenitic — austenitic 급 낮은 k
  [/^ASTM A553 Type I \(9% Ni/, 27],       // 9Ni cryogenic
  [/^CGO 0\.27/, 19],                      // 3.2% Si 전기강판
  [/^STS304L \(KS D 3705/, 16],            // austenitic
  [/^STS316L \(KS D 3705/, 16],
  [/^STS304 ULC/, 16],
];

let fixed = 0;
const log = [];
for (const m of supp.materials) {
  if (!Array.isArray(m.points)) continue;
  const rule = K_FIX.find(([re]) => re.test(m.name || ''));
  if (!rule) continue;
  const newK = rule[1];
  for (const p of m.points) {
    if (Array.isArray(p) && p.length >= 7 && typeof p[6] === 'number' && p[6] > 60) {
      log.push(`${m.name.slice(0, 60)}: k ${p[6]} → ${newK}`);
      p[6] = newK;
      fixed++;
    }
  }
}

console.log(`Fixed ${fixed} points rows`);
log.forEach(l => console.log('  ' + l));
fs.writeFileSync(SUPP, JSON.stringify(supp, null, 2) + '\n', 'utf8');
console.log('Wrote: ' + SUPP);
