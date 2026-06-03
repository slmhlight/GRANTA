/*
 * R67 Sprint B — Engineering Tools.
 * 6 계산기 — Stress concentration Kt / Galvanic / Buckling / CTE mismatch / Hardness / Pressure vessel.
 * 각 카드 = 입력 + 결과 + Guide 챕터 link.
 */
import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Calculator, Zap, BookOpen } from 'lucide-react';

const W = 'rounded-lg border border-border bg-card p-4';
const In = 'h-7 px-2 text-[12px] rounded border border-border bg-background focus:outline-none focus:border-accent';
const Lab = 'text-[11px] font-semibold text-muted-foreground block mb-1';

/* ───────── #3 Stress concentration Kt ───────── */
function KtCalc() {
  const [shape, setShape] = useState<'hole' | 'fillet' | 'sharpCorner' | 'shoulderCut'>('hole');
  const [d, setD] = useState(10);
  const [w, setW] = useState(40);
  const [r, setR] = useState(2);
  // 근사식 (Pilkey - Peterson's Stress Concentration Factors)
  let kt = 1;
  if (shape === 'hole') {
    // Round hole in infinite plate: 3.0. Finite width correction: Kt = 2 + (1 - d/w)^3
    const ratio = Math.min(0.95, d / w);
    kt = 2 + Math.pow(1 - ratio, 3);
  } else if (shape === 'fillet') {
    // Stepped shaft / plate with shoulder fillet: 일반 근사
    const rd = r / d;
    kt = 1 + 0.65 * Math.pow(rd, -0.4);  // rough
    kt = Math.max(1.05, Math.min(4.5, kt));
  } else if (shape === 'sharpCorner') {
    kt = 5.5; // 거의 무한, 권장값
  } else if (shape === 'shoulderCut') {
    kt = 1.8 + 0.3 * Math.max(0, 1 - r / d);
  }
  const band = kt < 2 ? 'safe' : kt < 3.5 ? 'caution' : 'danger';
  const color = band === 'safe' ? 'text-emerald-700' : band === 'caution' ? 'text-amber-700' : 'text-rose-700';
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #3 응력 집중 계수 Kt</p>
      <p className="text-[11px] text-muted-foreground mb-3">노치·구멍·필렛에 의한 국부 응력 증대. σ_max = K_t · σ_nom.</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className={Lab}>형상</label>
          <select className={In + ' w-full'} value={shape} onChange={(e) => setShape(e.target.value as any)}>
            <option value="hole">중앙 구멍 (판)</option>
            <option value="fillet">필렛 라운드 (계단축)</option>
            <option value="sharpCorner">Sharp corner (위험)</option>
            <option value="shoulderCut">Shoulder cut</option>
          </select>
        </div>
        {shape === 'hole' ? (
          <>
            <div><label className={Lab}>구멍 d (mm)</label><input type="number" className={In + ' w-full'} value={d} onChange={(e) => setD(+e.target.value || 0)} /></div>
            <div><label className={Lab}>판 폭 w (mm)</label><input type="number" className={In + ' w-full'} value={w} onChange={(e) => setW(+e.target.value || 1)} /></div>
          </>
        ) : shape !== 'sharpCorner' && (
          <>
            <div><label className={Lab}>특성 치수 d (mm)</label><input type="number" className={In + ' w-full'} value={d} onChange={(e) => setD(+e.target.value || 0)} /></div>
            <div><label className={Lab}>라디우스 r (mm)</label><input type="number" className={In + ' w-full'} value={r} onChange={(e) => setR(+e.target.value || 0.01)} /></div>
          </>
        )}
      </div>
      <div className={`rounded p-2 text-sm font-mono ${color} bg-muted/30`}>
        K<sub>t</sub> ≈ <b className="text-base">{kt.toFixed(2)}</b>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">설계 응력 = σ × K<sub>t</sub>. 피로 고려 시 K<sub>f</sub> = 1 + q·(K<sub>t</sub>−1) (q: 강 0.9·Al 0.6·취성 0).</p>
      <a href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 노치·좌굴 →</a>
    </div>
  );
}

/* ───────── #4 Galvanic compatibility ───────── */
function GalvanicCalc() {
  const SERIES: Array<{ name: string; v: number }> = [
    { name: '마그네슘 (Mg)', v: -1.65 },
    { name: '아연 (Zn) · 갈바나이즈', v: -1.05 },
    { name: '알루미늄 (Al · 1xxx-7xxx)', v: -0.85 },
    { name: '카드뮴 (Cd)', v: -0.70 },
    { name: '강 / 주철 (Carbon steel)', v: -0.60 },
    { name: '저합금강 (4140, 4340)', v: -0.55 },
    { name: '주석 (Sn) · 황동 일부', v: -0.40 },
    { name: '구리 · 청동 (Cu, Bronze)', v: -0.30 },
    { name: '구리합금 (황동 C36000, CuBe)', v: -0.25 },
    { name: '니켈 합금 (Inconel 600, Monel)', v: -0.15 },
    { name: '스테인리스 (304/316 active)', v: -0.50 },
    { name: '스테인리스 (304/316 passive)', v: -0.05 },
    { name: '티타늄 (CP-Ti, Ti6Al4V)', v: -0.05 },
    { name: 'Inconel 625 · Hastelloy', v: -0.04 },
    { name: '금 (Au), 백금 (Pt) · 흑연', v: +0.30 },
  ];
  const [a, setA] = useState(SERIES[6].name);
  const [b, setB] = useState(SERIES[10].name);
  const va = SERIES.find(x => x.name === a)?.v ?? 0;
  const vb = SERIES.find(x => x.name === b)?.v ?? 0;
  const diff = Math.abs(va - vb);
  const anode = va < vb ? a : b;
  const band = diff < 0.15 ? 'safe' : diff < 0.30 ? 'caution' : 'danger';
  const color = band === 'safe' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : band === 'caution' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200';
  const advice = band === 'safe'
    ? '안전 — 일반 환경에서 갈바닉 부식 무시 가능.'
    : band === 'caution'
      ? `주의 — 습한·해양 환경에서 ${anode} 가 점진 부식. 절연 와셔·실링 권장.`
      : `위험 — ${anode} 가 빠르게 부식. 직접 접촉 금지. 절연 / 캐소드 보호 / 같은 family 통일.`;
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> #4 갈바닉 부식 호환성</p>
      <p className="text-[11px] text-muted-foreground mb-3">접촉하는 두 금속의 전위차로 부식. 전위 가까울수록 안전, 0.30V 이상이면 위험.</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div><label className={Lab}>재료 A</label><select className={In + ' w-full'} value={a} onChange={(e) => setA(e.target.value)}>{SERIES.map(s => <option key={s.name}>{s.name}</option>)}</select></div>
        <div><label className={Lab}>재료 B</label><select className={In + ' w-full'} value={b} onChange={(e) => setB(e.target.value)}>{SERIES.map(s => <option key={s.name}>{s.name}</option>)}</select></div>
      </div>
      <div className={`rounded border p-2 text-sm ${color}`}>
        <p className="font-mono">전위차 ΔV ≈ <b>{diff.toFixed(2)} V</b></p>
        <p className="text-[12px] mt-1">{advice}</p>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">기준: 해수 (3.5% NaCl) at 25°C, vs Ag/AgCl. 산성·고온에서 더 위험.</p>
      <a href="/guide#ch10" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.3 환경별 합금 →</a>
    </div>
  );
}

/* ───────── #5 Buckling Euler vs Johnson ───────── */
function BucklingCalc() {
  const [L, setL] = useState(500);
  const [d, setD] = useState(20); // 원기둥 직경
  const [E, setE] = useState(200); // GPa
  const [sy, setSy] = useState(250); // MPa
  const [K, setK] = useState(1); // 단부조건
  const A = Math.PI * (d / 2) ** 2; // mm²
  const I = Math.PI * Math.pow(d, 4) / 64; // mm⁴
  const k_r = Math.sqrt(I / A); // 회전 반경 mm
  const Le = K * L;
  const slender = Le / k_r;
  // Critical slenderness ratio: √(2π²E/σy)
  const lambdaC = Math.sqrt(2 * Math.PI ** 2 * (E * 1e3) / sy);
  const isEuler = slender > lambdaC;
  // Euler: Pcr = π²·E·I/Le² (E in GPa·1000 → MPa, output kN)
  const Pcr_Euler = (Math.PI ** 2 * (E * 1e3) * I) / (Le ** 2) / 1000; // kN
  // Johnson: Pcr = σy·[1 − σy·(L/k)² / (4π²·E·1e3)]·A
  const Pcr_Johnson = (sy * (1 - sy * slender ** 2 / (4 * Math.PI ** 2 * E * 1e3)) * A) / 1000; // kN
  const Pcr = isEuler ? Pcr_Euler : Pcr_Johnson;
  const formula = isEuler ? 'Euler (가는 기둥)' : 'Johnson (짧은 기둥)';
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #5 좌굴 임계하중 (Euler / Johnson)</p>
      <p className="text-[11px] text-muted-foreground mb-3">기둥의 좌굴 한계 — 가늘면 Euler, 짧으면 Johnson 공식.</p>
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <div><label className={Lab}>길이 L (mm)</label><input type="number" className={In + ' w-full'} value={L} onChange={(e) => setL(+e.target.value || 1)} /></div>
        <div><label className={Lab}>직경 d (mm)</label><input type="number" className={In + ' w-full'} value={d} onChange={(e) => setD(+e.target.value || 1)} /></div>
        <div><label className={Lab}>E (GPa)</label><input type="number" className={In + ' w-full'} value={E} onChange={(e) => setE(+e.target.value || 1)} /></div>
        <div><label className={Lab}>σy (MPa)</label><input type="number" className={In + ' w-full'} value={sy} onChange={(e) => setSy(+e.target.value || 1)} /></div>
        <div className="col-span-2"><label className={Lab}>단부 조건 K</label><select className={In + ' w-full'} value={K} onChange={(e) => setK(+e.target.value)}><option value={1}>핀-핀 (K=1.0)</option><option value={2}>고정-자유 외팔 (K=2.0)</option><option value={0.7}>고정-핀 (K≈0.7)</option><option value={0.5}>고정-고정 (K=0.5)</option></select></div>
      </div>
      <div className="rounded bg-muted/30 p-2 text-sm font-mono space-y-0.5">
        <div>(L/k) = {slender.toFixed(1)} · 임계 = {lambdaC.toFixed(1)}</div>
        <div className="text-emerald-700">{formula} 적용</div>
        <div className="text-base">P_cr ≈ <b>{Pcr.toFixed(1)} kN</b></div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">설계 안전계수 SF = P_cr / P_applied. 항공 SF ≥ 1.5, 일반 ≥ 2.</p>
      <a href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 좌굴 이론 →</a>
    </div>
  );
}

/* ───────── #6 CTE mismatch ───────── */
function CTEMismatch() {
  const [cteA, setCteA] = useState(23); // Al
  const [cteB, setCteB] = useState(12); // Steel
  const [dT, setDT] = useState(100);
  const [E, setE] = useState(200); // GPa, 작은 쪽
  // Free strain difference. 만약 둘 다 같은 길이로 자유 변형하면 Δε = (cteA − cteB) · ΔT
  const dStrain = (cteA - cteB) * dT * 1e-6;
  const sigma = dStrain * E * 1000; // GPa→MPa
  const band = Math.abs(sigma) < 50 ? 'safe' : Math.abs(sigma) < 200 ? 'caution' : 'danger';
  const color = band === 'safe' ? 'text-emerald-700' : band === 'caution' ? 'text-amber-700' : 'text-rose-700';
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #6 CTE mismatch 열응력</p>
      <p className="text-[11px] text-muted-foreground mb-3">두 재료의 열팽창 차이로 발생하는 응력. σ ≈ ΔCTE × ΔT × E.</p>
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <div><label className={Lab}>재료 A CTE (×10⁻⁶/K)</label><input type="number" className={In + ' w-full'} value={cteA} onChange={(e) => setCteA(+e.target.value || 0)} /></div>
        <div><label className={Lab}>재료 B CTE</label><input type="number" className={In + ' w-full'} value={cteB} onChange={(e) => setCteB(+e.target.value || 0)} /></div>
        <div><label className={Lab}>온도 변화 ΔT (°C)</label><input type="number" className={In + ' w-full'} value={dT} onChange={(e) => setDT(+e.target.value || 0)} /></div>
        <div><label className={Lab}>구속 재료 E (GPa)</label><input type="number" className={In + ' w-full'} value={E} onChange={(e) => setE(+e.target.value || 1)} /></div>
      </div>
      <div className={`rounded bg-muted/30 p-2 text-sm font-mono ${color}`}>
        <div>ΔCTE × ΔT = {((cteA - cteB) * dT * 1e-6 * 100).toFixed(3)} %</div>
        <div className="text-base">σ_th ≈ <b>{sigma.toFixed(0)} MPa</b></div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">참고: Al 23 · Steel 12 · Ti 9 · Invar 1.3 · CFRP ≈0 · 세라믹 5-8 (×10⁻⁶/K).</p>
      <a href="/guide#ch11" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.9 #9 CTE mismatch →</a>
    </div>
  );
}

/* ───────── #7 Hardness conversion (HV ↔ HRC ↔ HB ↔ UTS) ───────── */
function HardnessConv() {
  const [scale, setScale] = useState<'HV' | 'HRC' | 'HB'>('HV');
  const [val, setVal] = useState(300);
  // Approximate conversions (ASTM E140, valid for low/medium carbon steel)
  let HV = val;
  if (scale === 'HRC') HV = Math.pow(val / 23.5, 1.7) * 50 + 100; // rough back-calc
  if (scale === 'HB') HV = val * 1.05;
  const HRC = HV > 240 ? 23.5 * Math.pow((HV - 100) / 50, 1 / 1.7) : NaN;
  const HB = HV / 1.05;
  const UTS = HV * 3.45; // MPa, rough (ASTM A370)
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #7 경도 변환 (HV/HRC/HB)</p>
      <p className="text-[11px] text-muted-foreground mb-3">ASTM E140 근사 — 탄소·합금강에 가장 정확, 다른 합금은 ±10%.</p>
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <div><label className={Lab}>입력 scale</label><select className={In + ' w-full'} value={scale} onChange={(e) => setScale(e.target.value as any)}><option value="HV">Vickers HV</option><option value="HRC">Rockwell HRC</option><option value="HB">Brinell HB</option></select></div>
        <div><label className={Lab}>값</label><input type="number" className={In + ' w-full'} value={val} onChange={(e) => setVal(+e.target.value || 0)} /></div>
      </div>
      <div className="rounded bg-muted/30 p-2 text-sm font-mono space-y-0.5">
        <div>HV ≈ <b>{HV.toFixed(0)}</b></div>
        <div>HRC ≈ <b>{isFinite(HRC) ? HRC.toFixed(1) : '— (HRC 범위 외)'}</b></div>
        <div>HB ≈ <b>{HB.toFixed(0)}</b></div>
        <div className="text-emerald-700 mt-1 pt-1 border-t border-border/30">UTS 추정 ≈ <b>{UTS.toFixed(0)} MPa</b></div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">UTS ≈ 3.45 × HV (탄소강). 다른 합금은 vendor datasheet 사용.</p>
      <a href="/guide#ch1" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.4 물성 사전 →</a>
    </div>
  );
}

/* ───────── #9 Pressure vessel thickness ───────── */
function PressureVessel() {
  const [p, setP] = useState(10); // MPa
  const [r, setR] = useState(150); // mm (inner radius)
  const [sy, setSy] = useState(250); // MPa
  const [SF, setSF] = useState(3);
  const [shape, setShape] = useState<'cyl' | 'sph'>('cyl');
  // 얇은 벽 가정
  const t = shape === 'cyl' ? (p * r * SF) / sy : (p * r * SF) / (2 * sy);
  // 두꺼운 벽 보정 (Lame): if t/r > 0.1, use Lame's equation
  const thick = t / r > 0.1;
  return (
    <div className={W}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> #9 압력 용기 두께</p>
      <p className="text-[11px] text-muted-foreground mb-3">얇은 벽 가정 — 원통 σ = p·r/t (후프), 구형 σ = p·r/(2t). 두꺼운 벽 (t/r &gt; 0.1) 은 Lame 식 필요.</p>
      <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
        <div><label className={Lab}>형상</label><select className={In + ' w-full'} value={shape} onChange={(e) => setShape(e.target.value as any)}><option value="cyl">원통 (후프 응력)</option><option value="sph">구형</option></select></div>
        <div><label className={Lab}>내압 p (MPa)</label><input type="number" className={In + ' w-full'} value={p} onChange={(e) => setP(+e.target.value || 0)} /></div>
        <div><label className={Lab}>내반경 r (mm)</label><input type="number" className={In + ' w-full'} value={r} onChange={(e) => setR(+e.target.value || 1)} /></div>
        <div><label className={Lab}>σy (MPa)</label><input type="number" className={In + ' w-full'} value={sy} onChange={(e) => setSy(+e.target.value || 1)} /></div>
        <div><label className={Lab}>안전계수 SF</label><input type="number" className={In + ' w-full'} value={SF} onChange={(e) => setSF(+e.target.value || 1)} /></div>
      </div>
      <div className="rounded bg-muted/30 p-2 text-sm font-mono">
        <div>최소 두께 t ≈ <b className="text-base">{t.toFixed(2)} mm</b></div>
        <div className="text-[11px] mt-1">t/r = {(t / r).toFixed(3)} {thick && <span className="text-amber-700">· 두꺼운 벽 — Lame 식 권장</span>}</div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">ASME B&PV Sec. VIII SF ≥ 3 (UTS) · 1.5 (σy). 부식 여유 (corrosion allowance) 1-3 mm 추가.</p>
      <a href="/guide#ch5" className="text-[11px] text-accent hover:underline flex items-center gap-0.5 mt-1"><BookOpen className="w-3 h-3" /> Guide Ch.8 압력용기 →</a>
    </div>
  );
}

export default function Tools() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 h-12 flex items-center gap-3 px-4 border-b border-border bg-[oklch(0.22_0.055_250)] text-sidebar-foreground">
        <Link href="/" className="flex items-center gap-1.5 text-sm hover:text-white text-sidebar-foreground/80">
          <ArrowLeft className="w-4 h-4" /> 탐색기로 돌아가기
        </Link>
        <div className="w-px h-5 bg-sidebar-border" />
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Calculator className="w-4 h-4 text-accent" /> Engineering Tools
        </span>
        <Link href="/guide" className="ml-auto text-[11px] text-sidebar-foreground/70 hover:text-white flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" /> Guide
        </Link>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 mb-6">
          <p className="text-[11px] tracking-[0.25em] uppercase text-accent font-bold">기계공학 빠른 계산</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Engineering Tools</h1>
          <p className="text-[13px] text-foreground/80 mt-1">6 개 빠른 계산기 — 응력 집중·갈바닉·좌굴·CTE mismatch·경도 변환·압력 용기. 각 계산기 = Guide 상세 챕터 link.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KtCalc />
          <GalvanicCalc />
          <BucklingCalc />
          <CTEMismatch />
          <HardnessConv />
          <PressureVessel />
        </div>

        <div className="mt-8 pt-4 border-t border-border text-[12px] text-muted-foreground">
          <p>주의: 모든 계산은 <b>근사식</b>이며 실제 설계는 vendor datasheet + FEA + 시제품 시험으로 검증하세요. ASTM·ASME·MMPDS 규격 우선.</p>
        </div>
      </div>
    </div>
  );
}
