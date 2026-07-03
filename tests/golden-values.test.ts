/*
 * R226e/D1 — golden-values 회귀. 인기·대표 합금의 표준 σy/UTS/밀도를 고정, 빌드 산출(materials.json)과 대조.
 *
 * A588 형 in-range 오염(σy 를 다른 합금 값으로 오기 — anomaly 검출은 통과) 방어. bound 는 표준값 중심 ±수%
 * (정상 조건 변동은 허용, 그러나 다른 합금 값으로 바뀌는 gross 오류는 검출). 조건별 편차는 ht 로 좁힘.
 * client/public/materials.json 은 CI 가 test 전 build:data 로 생성(ci.yml).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const all: any[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'client', 'public', 'materials.json'), 'utf8'));
const V = (m: any, k: string) => m.ranges?.[k]?.typical;

type G = { name: string; ht?: string; y?: [number, number]; u?: [number, number]; d?: [number, number]; e?: [number, number]; yMax?: number };
const GOLDEN: G[] = [
  { name: 'A588 Grade A', y: [330, 360], u: [475, 510], d: [7.75, 7.95] },   // ← A588 오염 방어 (σy 250 오기 재발 차단)
  { name: 'ASTM A36', y: [235, 270], d: [7.75, 7.95] },
  { name: 'ASTM A572 Grade 50', y: [335, 360] },
  { name: 'A516 Grade 70', y: [250, 275], u: [478, 510] },
  { name: 'AA 6061', ht: 'T6', y: [260, 290], u: [298, 325], d: [2.65, 2.75] },
  { name: 'AA 7075', ht: 'T6', y: [470, 540], u: [545, 600] },
  { name: 'AA 2024 ', ht: 'T3', y: [325, 360], u: [465, 500], d: [2.72, 2.85] },
  { name: 'AA 5052', ht: 'Anneal', y: [75, 110], u: [180, 215] },
  { name: 'Ti-6Al-4V', ht: 'Anneal', y: [850, 1050], d: [4.35, 4.5] },
  { name: 'AISI 304 ', ht: 'Anneal', y: [185, 225], u: [490, 560], d: [7.9, 8.05] },
  { name: 'AISI 316 ', ht: 'Anneal', y: [185, 225], u: [490, 560] },
  { name: '17-4 PH', ht: 'H900', y: [1120, 1230], u: [1270, 1360], d: [7.7, 7.85] },
  { name: 'C11000', y: [55, 90], u: [200, 240], d: [8.85, 8.98] },
  { name: 'AISI 1045', y: [490, 570], d: [7.75, 7.95] },
  { name: 'Ti Grade 2', ht: 'Anneal', y: [255, 320], u: [340, 400], d: [4.4, 4.6] },
  { name: 'Inconel 718', d: [8.1, 8.3], yMax: 1000 },       // aged 조건 σy ≥ 1000 존재
  { name: 'Inconel 625', d: [8.35, 8.5] },
  { name: 'Maraging 300', d: [7.95, 8.2], yMax: 1700 },     // aged 조건 σy ≥ 1700 존재

  // ── R226e 확장 (18 → 51): 표준 앵커 — 철강(AISI/ASTM)·Al(AA temper)·Ti(ASTM grade)·Ni(AMS)·Mg·주조·AM vendor ──
  { name: 'AISI 1018', y: [340, 400], u: [415, 470], d: [7.8, 7.9] },            // cold drawn 370/440
  { name: '42CrMo4', ht: 'Quench', y: [620, 820], u: [880, 1100] },              // 4140 Q&T
  { name: 'SNCM439', y: [820, 1000], u: [960, 1130] },                            // 4340 Q&T 900/1050
  { name: 'AISI 304L', ht: 'Anneal', y: [150, 210], u: [460, 560] },             // min 170/485
  { name: 'AISI 316L (Wrought)', ht: 'Anneal', y: [150, 260], u: [460, 620] },    // min 170/485 · wrought bar typ 240/570
  { name: 'AISI 321', ht: 'Anneal', y: [185, 250], u: [485, 580] },
  { name: 'AISI 310', ht: 'Anneal', y: [185, 260], u: [485, 600] },
  { name: 'SS410', y: [250, 320], u: [480, 560] },                                // annealed 275/515
  { name: 'AISI 304 — 1/2 Hard', y: [700, 800], u: [1050, 1200] },                // R226n — 냉간가공 temper 를 R199 clobber 회귀로부터 고정 (Granta/A666)
  { name: 'AISI 304 — 1/4 Hard', y: [560, 660], u: [880, 1000] },
  { name: '17-7 PH', y: [1350, 1620], u: [1550, 1750] },                          // RH950/CH900 급
  { name: 'AA 1100', ht: 'Anneal', y: [25, 45], u: [75, 100], d: [2.69, 2.73] },  // O 34/90
  { name: 'AA 5052', ht: 'H32', y: [170, 215], u: [215, 250] },
  { name: 'AA 5083', ht: 'H116', y: [205, 245], u: [290, 330], d: [2.6, 2.7] },
  { name: 'AA 6063', ht: 'T6', y: [195, 235], u: [225, 260] },
  { name: 'AA 2014', ht: 'T6', y: [390, 445], u: [455, 510] },
  { name: 'AA 2219', ht: 'T87', y: [365, 420], u: [445, 500] },
  { name: 'AA 7050', ht: 'T7451', y: [440, 500], u: [500, 560] },
  { name: 'Ti Grade 1', ht: 'Anneal', y: [140, 220], u: [220, 290], d: [4.48, 4.54] },
  { name: 'Ti Grade 9', y: [460, 560], u: [580, 680], d: [4.44, 4.52] },          // 3Al-2.5V ann
  { name: 'Ti Grade 23', ht: 'Aged', y: [840, 990], u: [900, 1040] },             // ELI STA
  { name: 'Inconel 718 (UNS N07718, AMS 5662', y: [1030, 1180], u: [1240, 1400] },// AMS 5662 min 1034/1276
  { name: 'Inconel 625 — Anneal', y: [410, 640], u: [820, 990] },                 // Gr1 min 414/827
  { name: 'Inconel 600', ht: 'Anneal', y: [200, 320], u: [540, 700], d: [8.4, 8.52] },
  { name: 'Monel 400', ht: 'Anneal', y: [200, 300], u: [500, 620], d: [8.75, 8.9] },
  { name: 'Hastelloy C-276', ht: 'Anneal', y: [320, 420], u: [740, 860], d: [8.85, 8.94] },
  { name: 'C17200', d: [8.2, 8.4], yMax: 950 },                                   // BeCu aged σy ≥ 950 존재
  { name: 'AZ31B', y: [160, 235], u: [235, 295], d: [1.74, 1.81] },
  { name: 'AZ91D', y: [130, 170], u: [200, 245], d: [1.78, 1.84] },
  { name: 'A356', ht: 'T6', y: [175, 230], u: [250, 300], d: [2.65, 2.72] },      // min 186/262
  { name: 'CF8 ', y: [190, 260], u: [460, 560], d: [7.7, 7.8] },                  // A351 min 205/485
  { name: 'WCB ', y: [235, 290], u: [480, 600] },                                 // A216 min 250/485-655
  { name: 'AlSi10Mg', ht: 'As-built', y: [210, 290], u: [380, 480], d: [2.6, 2.72] },
  { name: 'AISI 316L (AM)', ht: 'As-built', y: [440, 600], u: [540, 720] },
  { name: 'H13', ht: 'Harden', y: [1250, 1550], u: [1420, 1750] },                // 44-48 HRC Q&T

  // ── R226g tranche 3 (51 → 89): 탄소강 어닐드 사다리·Ni 초합금·Cu 계열·폴리머(밀도 앵커)·세라믹(ρ/E 앵커) ──
  { name: 'AISI 1010', ht: 'Anneal', y: [140, 220], u: [255, 340] },
  { name: 'AISI 1015', ht: 'Anneal', y: [255, 315], u: [345, 430] },   // R226l 재캘리브레이션 — 구 bound 는 오염값(167/286) 기준. ASM annealed 284/386 + Granta MI 255~315/345~430
  { name: 'AISI 1025', ht: 'Anneal', y: [175, 250], u: [280, 380] },
  { name: 'AISI 1030', ht: 'Anneal', y: [200, 280], u: [300, 400] },
  { name: 'AISI 1050', ht: 'Anneal', y: [280, 400], u: [490, 660] },
  { name: 'AISI 1080', ht: 'Anneal', y: [350, 560], u: [580, 770] },              // 펄라이트강 소스 산포 커버
  { name: 'AISI 1095', ht: 'Anneal', y: [380, 600], u: [640, 840] },
  { name: 'AISI 8620', ht: 'Anneal', y: [310, 400], u: [480, 600] },
  { name: 'AISI 9310', y: [400, 520], u: [560, 700] },
  { name: 'HY-80', y: [530, 620], u: [620, 760] },                                // MIL-S-16216 YS min 550
  { name: 'AISI 347', ht: 'Anneal', y: [185, 250], u: [480, 580] },
  { name: 'SS420', ht: 'harden', y: [1350, 1700], u: [1550, 1900] },              // ~52HRC
  { name: 'PH13-8', y: [1350, 1480], u: [1450, 1590] },                           // H950 1410/1520
  { name: 'AA 6082', ht: 'T6', y: [235, 290], u: [280, 330] },
  { name: 'AA 7475', ht: 'T7351', y: [370, 460], u: [440, 530] },
  { name: 'Waspaloy', ht: 'aged', y: [730, 880], u: [1180, 1380] },
  { name: 'Hastelloy X', ht: 'Anneal', y: [280, 400], u: [650, 800], d: [8.15, 8.3] },
  { name: 'Nimonic 80A', y: [560, 700], u: [900, 1100] },
  { name: 'Rene 41', y: [950, 1150], u: [1300, 1520] },
  { name: 'Incoloy 901', y: [800, 980], u: [1080, 1300] },
  { name: 'C36000', y: [270, 360], u: [340, 430], d: [8.4, 8.6] },                // free-cutting brass H02
  { name: 'C46400', y: [150, 220], u: [360, 450] },                               // naval brass ann
  { name: 'C63000', y: [320, 520], u: [660, 820] },                               // NAB
  { name: 'C93200', y: [110, 150], u: [215, 270], d: [8.85, 9.0] },               // SAE 660 125/240
  { name: 'C95400', y: [185, 260], u: [480, 590] },                               // B148 min 205/515
  { name: 'WE43', y: [145, 200], u: [220, 280], d: [1.8, 1.87] },
  { name: 'ZK60', ht: 'T5', y: [255, 320], u: [330, 380] },                       // ← 오염 교정 검증 (was 195/305)
  { name: 'Zircaloy-4', y: [480, 620], u: [620, 760], d: [6.5, 6.6] },            // CWSR 연료피복
  { name: 'Invar 36', y: [280, 420], u: [380, 500], d: [8.0, 8.2] },              // AM as-built
  { name: 'Molybdenum', y: [340, 470], u: [470, 590], d: [10.1, 10.3] },
  { name: 'PEEK', ht: 'As-supplied', y: [80, 105], u: [90, 115], d: [1.28, 1.34] },
  { name: 'Polycarbonate', y: [55, 70], u: [60, 78], d: [1.18, 1.22] },
  { name: 'PTFE', y: [8, 16], u: [18, 36], d: [2.1, 2.25] },
  { name: 'Acetal (POM)', y: [58, 75], u: [62, 82], d: [1.39, 1.44] },
  { name: 'PEI', ht: 'As-supplied', y: [90, 112], u: [98, 118], d: [1.25, 1.29] },
  { name: 'Silicon Carbide', d: [3.0, 3.22], e: [370, 460] },
  { name: 'Silicon Nitride', d: [3.15, 3.35], e: [290, 330] },
  { name: 'Zirconia (Y-TZP', d: [5.95, 6.15], e: [195, 215] },
  { name: 'Tungsten Carbide (WC-Co', d: [14.5, 15.3], e: [580, 660] },
];

describe('golden-values 회귀 (D1) — 표준값 대조', () => {
  for (const g of GOLDEN) {
    it(`${g.name.trim()}${g.ht ? ' [' + g.ht + ']' : ''}`, () => {
      const matches = all.filter((m) => (m.name || '').includes(g.name) && (!g.ht || (m.heat_treatment || '').toLowerCase().includes(g.ht.toLowerCase())));
      expect(matches.length, `${g.name} 매칭 entry`).toBeGreaterThan(0);
      const inR = (v: any, r?: [number, number]) => !r || (typeof v === 'number' && v >= r[0] && v <= r[1]);
      if (g.y || g.u || g.d || g.e) {
        const ok = matches.some((m) => inR(V(m, 'yield_strength'), g.y) && inR(V(m, 'uts'), g.u) && inR(V(m, 'density'), g.d) && inR(V(m, 'modulus'), g.e));
        const seen = matches.slice(0, 3).map((m) => `σy${V(m, 'yield_strength')}/uts${V(m, 'uts')}/ρ${V(m, 'density')}/E${V(m, 'modulus')}`).join(' , ');
        expect(ok, `${g.name}: 표준 범위 만족 조건 없음 (실제 ${seen})`).toBe(true);
      }
      if (g.yMax != null) {
        const maxY = Math.max(...matches.map((m) => V(m, 'yield_strength') || 0));
        expect(maxY, `${g.name}: max σy`).toBeGreaterThanOrEqual(g.yMax);
      }
    });
  }
});
