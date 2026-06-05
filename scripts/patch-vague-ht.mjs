#!/usr/bin/env node
/* R130a — Vague-HT 62건 보강: supplementary-materials.json + material_db.json 의
   heat_treatment 필드 채우기. ASM Vol.1·4, Special Metals SMC-XXX, Haynes International
   datasheet 의 standard mill product condition 기반. */
import fs from 'node:fs';
import path from 'node:path';

const SUPP_HT = {
  // ──────── Nickel superalloy — solid-solution (annealed mill product) ────────
  'Haynes 230': 'Solution Annealed (1230°C WQ) — standard mill product',
  'Inconel 600': 'Annealed (1010°C, air cooled)',
  'Inconel 601': 'Annealed (1150°C)',
  'Inconel 617': 'Solution Annealed (1175°C)',
  'Inconel 625': 'Solution Annealed (1100°C) — Grade 1',
  'Inconel 686': 'Solution Annealed (1120°C WQ)',
  'Inconel 690': 'Annealed (1040-1100°C)',
  'Inconel 740H': 'Solution + Aged (1100°C / 800°C 16h)',
  'Hastelloy B-2': 'Solution Annealed (1066°C WQ)',
  'Hastelloy C-22': 'Solution Annealed (1120°C WQ)',
  'Hastelloy C-276': 'Solution Annealed (1120°C WQ) — mill annealed',
  'Hastelloy C-2000': 'Solution Annealed (1120°C WQ)',
  'Hastelloy X': 'Solution Annealed (1175°C WQ)',
  'Incoloy 800H': 'Solution Annealed (1150°C)',
  'Incoloy 825': 'Annealed (940°C)',
  'Incoloy 909': 'Solution + Aged (980°C / 720°C 8h + 620°C 8h)',
  'Incoloy 925': 'Solution + Aged (1010°C / 730°C 8h + 620°C 8h)',
  'Haynes 188': 'Solution Annealed (1175°C WQ)',
  'Haynes 214': 'Solution Annealed (1175°C)',
  'Haynes 214 — Wrought': 'Solution Annealed (1175°C)',
  'Monel 400': 'Hot-finished and Annealed (mill product)',
  'Nickel 200': 'Annealed (815°C)',
  // ──────── Nickel superalloy — precipitation hardened ────────
  'Inconel 100': 'As-Cast + γ′ Solutioned (1075°C / 870°C aging)',
  'Inconel 706': 'Solution + 2-stage Aged (980°C / 720°C 8h + 620°C 8h)',
  'Inconel 718': 'Solution + Double Aged (980°C / 720°C 8h + 620°C 8h, AMS 5662)',
  'Inconel 718Plus': 'STA — Solution + 2-stage Aged (1040°C / 790°C 8h + 700°C 8h)',
  'Inconel 751': 'Solution + 2-stage Aged (1150°C / 845°C 24h + 705°C 20h)',
  'Inconel 939': 'Solution + 2-stage Aged (1160°C 4h / 1000°C 6h + 900°C 16h, Allvac IN939)',
  'Inconel X-750': 'Solution + 2-stage Aged (1150°C / 845°C 24h + 705°C 20h, AMS 5667 — Spec 2)',
  'Waspaloy': 'Solution + 2-stage Aged (1080°C 4h / 845°C 24h + 760°C 16h, AMS 5708)',
  'Rene 41': 'Solution + Aged (1080°C / 760°C 16h, AMS 5712)',
  'Rene 88DT': 'Sub-solvus Solution + 2-stage Aged (1080°C / 760°C 4h + 650°C 4h)',
  'Nimonic 80A': 'Solution + Aged (1080°C / 705°C 16h)',
  'Nimonic 90': 'Solution + Aged (1080°C / 705°C 16h)',
  'Nimonic 105': 'Solution + Aged (1150°C / 850°C 8h + 700°C 16h)',
  'Nimonic 263': 'Solution + Aged (1150°C 1h / 800°C 8h)',
  'Udimet 720': 'Solution + 2-stage Aged (1110°C 4h / 760°C 8h + 650°C 24h)',
  'Haynes 282': 'Solution + Aged (1135°C / 1010°C 2h + 790°C 8h, Haynes std)',
  // ──────── Single crystal Ni superalloy ────────
  'CMSX-4': 'Solution + 2-stage Aged (1320°C / 1140°C 6h + 870°C 20h) — single crystal',
  'Rene N5': 'Solution + 2-stage Aged (1300°C / 1080°C 6h + 870°C 20h) — single crystal',
  'PWA1484': 'Solution + 2-stage Aged (1300°C / 1080°C 6h + 870°C 20h) — single crystal',
  // ──────── ODS Ni ────────
  'MA754 (ODS)': 'Recrystallization Annealed (γ′-free, ODS strengthening)',
  // ──────── Incoloy 901 ────────
  'Incoloy 901': 'Solution + 2-stage Aged (1095°C / 790°C 2h + 720°C 24h)',
  // ──────── Tool steels — standard Q+T ────────
  'P20 mold steel': 'Pre-hardened (Q+T HRC 30, mill supplied)',
  'S7 tool steel': 'Q+T (HRC 56-58, 940°C austenitize + 200°C temper)',
  'A2 tool steel': 'Q+T (HRC 60, 960°C austenitize + 175°C temper)',
  'D2 tool steel': 'Q+T (HRC 60, 1020°C austenitize + 180°C temper)',
  'D3 tool steel': 'Q+T (HRC 60, 980°C austenitize + 180°C temper)',
  'O1 tool steel': 'Q+T (HRC 60-62, 800°C austenitize OQ + 180°C temper)',
  'H11 tool steel': 'Q+T (HRC 50-54, 1000°C austenitize + 540°C temper)',
  'CPM 3V': 'Q+T (HRC 58-60, 1100°C austenitize + 550°C temper)',
  'CPM S30V': 'Q+T (HRC 60-61, 1080°C austenitize + 200°C temper)',
  'M4 tool steel (HSS)': 'Q+T (HRC 64-66, 1230°C austenitize + 550°C triple temper)',
  'M42 HSS': 'Q+T (HRC 65-67, 1180°C austenitize + 550°C triple temper)',
};

let patched = 0;

const suppPath = path.join('data', 'supplementary-materials.json');
const supp = JSON.parse(fs.readFileSync(suppPath, 'utf8'));
for (const m of supp.materials) {
  if (m.heat_treatment) continue;
  if (SUPP_HT[m.name]) {
    m.heat_treatment = SUPP_HT[m.name];
    patched++;
  }
}

fs.writeFileSync(suppPath, JSON.stringify(supp, null, 2) + '\n', 'utf8');
console.log(`patched ${patched} supplementary entries with explicit heat_treatment.`);

// Also material_db.json — alloys with bare name (no HT in name)
const dbPath = path.join('data', 'material_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
let dbPatched = 0;
for (const [key, m] of Object.entries(db.materials)) {
  const nm = m.name;
  if (!nm || m.heat_treatment) continue;
  if (SUPP_HT[nm]) {
    m.heat_treatment = SUPP_HT[nm];
    dbPatched++;
  }
}
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2) + '\n', 'utf8');
console.log(`patched ${dbPatched} material_db entries.`);
