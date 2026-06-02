/*
 * 재료 선택 가이드 (한국어) — 설계 요구를 물성 수치로 번역하고, Ashby 선택법으로
 * 후보를 좁히는 방법을 이 앱의 기능과 1:1로 연결해 설명하는 도움말 페이지.
 *
 * 내용은 정립된 공학 지식(Ashby, "Materials Selection in Mechanical Design";
 * Ansys Granta EduPack 교육자료) 기반. 워크드 예제의 수치는 방법을 보여주기 위한
 * 예시이며 특정 재료의 측정값이 아님.
 */
import { Link } from 'wouter';
import { ArrowLeft, GraduationCap, Ruler, Target, LineChart, ListChecks, AlertTriangle, BookText } from 'lucide-react';

/** 인라인 수식/기호 강조 */
function F({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[0.95em] text-accent whitespace-nowrap">{children}</span>;
}
/** 강조 박스 */
function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'tip' }) {
  const cls =
    tone === 'warn'
      ? 'border-amber-400/40 bg-amber-50'
      : tone === 'tip'
      ? 'border-emerald-400/40 bg-emerald-50/60'
      : 'border-accent/30 bg-accent/5';
  return <div className={`rounded-lg border ${cls} p-3 text-sm leading-relaxed my-3`}>{children}</div>;
}
function H({ id, icon: Icon, children }: { id: string; icon?: any; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-20 text-lg font-bold text-foreground mt-10 mb-3 flex items-center gap-2 border-b border-border pb-2">
      {Icon && <Icon className="w-5 h-5 text-accent" />} {children}
    </h2>
  );
}

/** 사례별 예시 시나리오 카드 (상황 → 요구를 숫자로 → 이 앱에서 → 유력 재료군) */
function Scenario({ n, title, situation, needs, steps, families }: {
  n: number;
  title: React.ReactNode;
  situation: React.ReactNode;
  needs: React.ReactNode;
  steps: React.ReactNode[];
  families: React.ReactNode;
}) {
  const Label = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-accent/80">{children}</span>
  );
  return (
    <div className="rounded-lg border border-border bg-card p-4 my-4">
      <p className="font-semibold text-foreground"><span className="text-accent">사례 {n}.</span> {title}</p>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{situation}</p>
      <div className="mt-3 space-y-2 text-sm leading-relaxed">
        <div><Label>요구 → 숫자</Label><div className="mt-0.5">{needs}</div></div>
        <div><Label>이 앱에서</Label><ol className="list-decimal pl-5 space-y-0.5 mt-0.5">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
        <div><Label>유력 재료군</Label> <span>{families}</span></div>
      </div>
    </div>
  );
}

const TOC: { id: string; label: string }[] = [
  { id: 'intro', label: '0. 이 가이드를 읽는 이유' },
  { id: 'glossary', label: '1. 물성 용어 — 설계 언어로' },
  { id: 'translate', label: '2. 설계 요구 → 물성 수치 변환' },
  { id: 'method', label: '3. Ashby 재료 선택법' },
  { id: 'chart', label: '4. Ashby 차트 읽기 & 이 앱 사용법' },
  { id: 'workflow', label: '5. 사례별 예시 시나리오' },
  { id: 'caveats', label: '6. 데이터 해석 시 주의' },
  { id: 'refs', label: '참고문헌' },
];

export default function Guide() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 상단 바 */}
      <header className="sticky top-0 z-20 h-12 flex items-center gap-3 px-4 border-b border-border bg-[oklch(0.22_0.055_250)] text-sidebar-foreground">
        <Link href="/" className="flex items-center gap-1.5 text-sm hover:text-white text-sidebar-foreground/80">
          <ArrowLeft className="w-4 h-4" /> 탐색기로 돌아가기
        </Link>
        <div className="w-px h-5 bg-sidebar-border" />
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <GraduationCap className="w-4 h-4 text-accent" /> 재료 선택 가이드
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8">
        <p className="text-2xl font-bold tracking-tight">설계 요구를 “필요한 물성”으로 번역하기</p>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          “이 부품이 안 부러지고, 안 휘고, 가벼웠으면 좋겠다”는 요구를 어떻게{' '}
          <F>항복강도 ≥ 250&nbsp;MPa</F>, <F>탄성계수 ≥ 70&nbsp;GPa</F> 같은 <b>숫자</b>로 바꾸고,
          그 숫자로 수백 개 재료 중 최적을 고르는지 — 단계별로 설명합니다. 이 앱(Ashby 차트·필터·Compare)을 그대로 따라 쓰며 익힐 수 있습니다.
        </p>

        {/* 목차 */}
        <nav className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">목차</p>
          <ol className="space-y-1 text-sm">
            {TOC.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="text-accent hover:underline underline-offset-2">{t.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 0. 인트로 */}
        <H id="intro" icon={GraduationCap}>0. 이 가이드를 읽는 이유</H>
        <p className="leading-relaxed">
          재료 선택이 어려운 진짜 이유는 “좋은 재료”를 모르기 때문이 아니라, <b>내 부품의 요구를 물성 숫자로 바꾸는 단계</b>가 빠져 있기 때문입니다.
          데이터베이스에는 <F>MPa</F>, <F>%</F>, <F>GPa</F> 가 가득한데, 정작 “내 부품엔 얼마가 필요한가?”에 답하지 못하면 필터를 걸 수 없습니다.
        </p>
        <p className="leading-relaxed mt-2">아래 4단계로 진행합니다. 이 앱의 기능이 각 단계를 그대로 지원합니다.</p>
        <ol className="list-decimal pl-6 mt-2 space-y-1 leading-relaxed">
          <li><b>요구 정의</b> — 부품이 받는 하중·환경·무게/원가 목표를 적는다.</li>
          <li><b>물성 수치로 변환</b> — 하중→강도, 처짐→강성처럼 공식으로 “필요 물성값”을 계산한다. <span className="text-muted-foreground">(2부)</span></li>
          <li><b>제약으로 거르고, 목적으로 순위</b> — 반드시 만족할 값은 필터/한계선, 최대화할 지표는 성능지수. <span className="text-muted-foreground">(3·4부)</span></li>
          <li><b>후보 비교·검증</b> — Compare로 나란히 보고, 출처/조건을 확인한다. <span className="text-muted-foreground">(5·6부)</span></li>
        </ol>

        {/* 1. 물성 용어 */}
        <H id="glossary" icon={Ruler}>1. 물성 용어 — 설계 언어로</H>
        <p className="leading-relaxed">각 물성이 <b>설계의 어떤 요구와 연결되는지</b>를 함께 외우면, 요구가 생겼을 때 어떤 숫자를 봐야 할지 바로 보입니다.</p>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2 font-semibold">물성 (기호·단위)</th>
                <th className="p-2 font-semibold">의미</th>
                <th className="p-2 font-semibold">이럴 때 본다</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
              <tr><td className="p-2"><b>항복강도</b> <F>σy</F>, MPa</td><td className="p-2">영구(소성) 변형이 시작되는 응력. 이 값을 넘으면 안 돌아온다.</td><td className="p-2">“하중을 받아도 변형되면 안 된다” → 가장 흔한 강도 기준</td></tr>
              <tr><td className="p-2"><b>인장강도</b> <F>UTS</F>, MPa</td><td className="p-2">최종 파단 직전 최대 응력.</td><td className="p-2">파단 안전여유, 취성 재료, 안전계수 산정</td></tr>
              <tr><td className="p-2"><b>연신율</b> <F>%</F></td><td className="p-2">파단까지 늘어나는 정도 = 연성. 낮으면 취성(갑자기 깨짐).</td><td className="p-2">충격·변형 흡수, 성형/굽힘, 취성 파괴 회피</td></tr>
              <tr><td className="p-2"><b>탄성계수</b> <F>E</F>, GPa</td><td className="p-2">강성(뻣뻣함). 같은 하중에서 얼마나 적게 휘는가.</td><td className="p-2">처짐 제한, 진동/고유진동수, 정밀도</td></tr>
              <tr><td className="p-2"><b>경도</b> <F>HV</F></td><td className="p-2">국부 압입 저항. 대략 마모·표면 강도의 지표.</td><td className="p-2">마모·긁힘, 베어링/기어 표면</td></tr>
              <tr><td className="p-2"><b>피로강도</b> <F>MPa</F></td><td className="p-2">반복 하중에서 견디는 응력 한계(여기선 R=-1 내구한도 기준, 추정치는 est.).</td><td className="p-2">회전·진동·반복 하중 부품</td></tr>
              <tr><td className="p-2"><b>밀도</b> <F>ρ</F>, g/cm³</td><td className="p-2">단위 부피당 질량.</td><td className="p-2">경량화 — 강도/강성을 무게로 나눈 “비(比)성능”</td></tr>
              <tr><td className="p-2"><b>열팽창계수</b> <F>CTE</F>, 10⁻⁶/K</td><td className="p-2">온도 1도당 늘어나는 비율.</td><td className="p-2">열응력, 끼워맞춤, 정밀 치수 안정성</td></tr>
              <tr><td className="p-2"><b>열전도도</b> <F>k</F>, W/m·K</td><td className="p-2">열을 전달하는 능력.</td><td className="p-2">방열판/히트싱크, 금형, 열 격리</td></tr>
              <tr><td className="p-2"><b>최대사용온도·융점</b> <F>°C</F></td><td className="p-2">연속 사용 가능 온도 / 녹는 온도.</td><td className="p-2">고온 부품 사용 한계</td></tr>
              <tr><td className="p-2"><b>푸아송비</b> <F>ν</F></td><td className="p-2">세로로 당길 때 가로로 줄어드는 비율(보통 0.3 부근).</td><td className="p-2">정밀 응력 해석, 압입/접촉</td></tr>
            </tbody>
          </table>
        </div>
        <Note tone="tip">
          이 앱에서는 좌측 <b>필터</b>로 각 물성의 범위를 직접 자를 수 있고, 차트의 <b>X·Y 축</b>으로 아무 물성이나 둘씩 골라 비교할 수 있습니다.
          각 값은 <b>min–max 범위 + 대표값(typical)</b>으로 제공되며, 핸드북 추정값은 <F>est.</F> 라벨이 붙습니다.
        </Note>

        {/* 2. 변환 */}
        <H id="translate" icon={Target}>2. 설계 요구 → 물성 수치 변환 (핵심)</H>
        <p className="leading-relaxed">
          “튼튼하게”를 숫자로 바꾸는 다리는 결국 <b>재료역학 기본식</b>입니다. 가장 많이 쓰는 세 가지를 예제와 함께 봅니다.
        </p>

        <h3 className="font-semibold mt-5 mb-1">2.1 하중 → 필요 항복강도 <F>σy</F></h3>
        <p className="leading-relaxed">응력은 <F>σ = F / A</F> (힘 ÷ 단면적). 영구 변형을 막으려면 작용 응력이 “허용응력”보다 작아야 합니다.</p>
        <p className="leading-relaxed mt-1"><F>허용응력 = σy / SF</F> &nbsp;→&nbsp; 따라서 <F>필요 σy ≥ SF · F / A</F> &nbsp;(<F>SF</F> = 안전계수).</p>
        <Note>
          <b>예제.</b> 단면 <F>A = 20&nbsp;mm²</F> 봉이 <F>F = 4,000&nbsp;N</F> 인장을 받고, 안전계수 <F>SF = 2</F> 로 가고 싶다.
          <br />작용 응력 <F>σ = 4000 / 20 = 200&nbsp;MPa</F>. → <F>필요 σy ≥ 2 × 200 = 400&nbsp;MPa</F>.
          <br />→ 앱에서 <b>Yield Strength</b> 필터 하한을 400으로 두면, 이 제약을 통과하는 재료만 남습니다.
        </Note>

        <h3 className="font-semibold mt-5 mb-1">2.2 처짐/강성 → 필요 탄성계수 <F>E</F></h3>
        <p className="leading-relaxed">
          “덜 휘게”는 강성 문제이고, 강성은 <b>형상 + 탄성계수</b>로 정해집니다. 예로 외팔보 끝단 처짐은 <F>δ = F·L³ / (3·E·I)</F>
          (<F>I</F> = 단면 2차모멘트, 사각단면이면 <F>I = b·h³/12</F>).
        </p>
        <p className="leading-relaxed mt-1">목표 처짐 <F>δ_max</F> 가 정해지면 <F>필요 E ≥ F·L³ / (3·I·δ_max)</F>.</p>
        <Note>
          <b>예제.</b> 길이 <F>L = 100&nbsp;mm</F>, 단면 <F>I = 1,000&nbsp;mm⁴</F> 외팔보가 <F>F = 200&nbsp;N</F> 에서 <F>δ_max = 0.5&nbsp;mm</F> 이하로 휘어야 한다.
          <br /><F>필요 E ≥ 200 × 100³ / (3 × 1000 × 0.5) = 133,000&nbsp;MPa ≈ 133&nbsp;GPa</F>.
          <br />→ <b>Modulus</b> 필터 하한 133&nbsp;GPa. (알루미늄 ~70은 탈락, 티타늄 ~115도 부족, 강·일부 합금이 통과.)
        </Note>
        <Note tone="tip">강성이 부족하면 보통 <b>형상(단면 키우기)</b>이 재료 바꾸기보다 효과적입니다(<F>I</F>가 <F>h³</F>로 들어가므로). 재료는 무게·공간 제약이 있을 때 결정적입니다.</Note>

        <h3 className="font-semibold mt-5 mb-1">2.3 무게/원가 목표 → “비(比)성능”과 성능지수</h3>
        <p className="leading-relaxed">
          “같은 강도를 <b>가장 가볍게</b>”는 단일 물성이 아니라 <b>조합</b>이 중요합니다. 인장 부재를 최소 무게로 만들려면 <F>σy / ρ</F> 가 큰 재료가 유리합니다(2.x의 강도 제약은 그대로 만족시키면서).
          이런 “목적을 담은 조합”이 바로 <b>성능지수</b>이고 3부에서 다룹니다.
        </p>

        <h3 className="font-semibold mt-5 mb-1">2.4 그 밖의 흔한 변환</h3>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">요구</th><th className="p-2 font-semibold">보는 물성 / 식</th></tr></thead>
            <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
              <tr><td className="p-2">반복·진동 하중</td><td className="p-2"><b>피로강도</b> ≥ 작용 응력진폭 × SF (정적 σy만으로 부족)</td></tr>
              <tr><td className="p-2">충격·갑작스런 하중</td><td className="p-2"><b>연신율·충격값</b> 충분히 (취성 회피), 동시에 강도</td></tr>
              <tr><td className="p-2">고온 사용</td><td className="p-2"><b>최대사용온도</b> ≥ 사용온도, 그리고 <b>그 온도에서의</b> σy/UTS (상세의 “온도-강도” 곡선 참고)</td></tr>
              <tr><td className="p-2">열변형/끼워맞춤</td><td className="p-2">열응력 <F>σ ≈ E·CTE·ΔT</F>, 치수변화 <F>ΔL = L·CTE·ΔT</F> → 작은 <b>CTE</b></td></tr>
              <tr><td className="p-2">방열</td><td className="p-2">높은 <b>열전도도 k</b> (경량 방열은 <F>k/ρ</F>)</td></tr>
              <tr><td className="p-2">부식·내후</td><td className="p-2">환경에 맞는 <b>내식성</b> 등급(정성) — 정량은 데이터시트 확인</td></tr>
            </tbody>
          </table>
        </div>
        <Note tone="warn">
          <b>안전계수(SF)는 설계자·규격의 책임</b>입니다. 정적/연성 재료는 보통 1.5~2, 취성·불확실·인명 관련은 더 높게. 피로·고온·충격은 별도 기준을 따르세요. 이 앱은 물성값을 제공할 뿐 SF를 정해주지 않습니다.
        </Note>

        {/* 3. Ashby 방법 */}
        <H id="method" icon={ListChecks}>3. Ashby 재료 선택법</H>
        <p className="leading-relaxed">Ashby의 방법은 문제를 네 가지로 정리하는 데서 시작합니다.</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 leading-relaxed">
          <li><b>기능(Function)</b> — 부품이 무엇을 하는가(인장 부재, 굽힘 보, 패널, 축…).</li>
          <li><b>제약(Constraints)</b> — <i>반드시</i> 만족할 조건(σy ≥ X, 온도 ≥ Y, 공정 = LPBF…). 통과/탈락의 기준.</li>
          <li><b>목적(Objective)</b> — 최대/최소화할 것(무게 최소, 원가 최소, 강성 최대…).</li>
          <li><b>자유변수(Free variable)</b> — 설계가 바꿀 수 있는 것(단면적, 두께…)과 재료.</li>
        </ul>

        <h3 className="font-semibold mt-5 mb-1">성능지수(재료지수)란?</h3>
        <p className="leading-relaxed">
          제약(예: 강성)을 만족시키도록 <b>자유변수(예: 단면적)를 소거</b>하고 목적(예: 무게)을 정리하면, 목적이 <b>재료 물성만의 조합</b>으로 깔끔히 떨어집니다.
          그 조합이 <b>성능지수 M</b>이고, <b>M이 클수록 좋은 재료</b>입니다.
        </p>
        <Note>
          <b>유도 직관 (경량 인장 부재).</b> 강도 제약 <F>F/A ≤ σy</F> → 필요 단면적 <F>A ≥ F/σy</F>.
          질량 <F>m = A·L·ρ = F·L·(ρ/σy)</F>. <F>F, L</F>은 고정이므로 질량을 줄이려면 <F>ρ/σy</F>를 최소화 = <F>σy/ρ</F>를 <b>최대화</b>. → 성능지수 <F>M = σy/ρ</F>.
        </Note>
        <p className="leading-relaxed">기능이 “굽힘 보/패널”처럼 바뀌면 지수의 지수(거듭제곱)가 달라집니다. 이 앱이 제공하는 표준 지수:</p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">기능 / 목적</th><th className="p-2 font-semibold">성능지수 M (클수록 우수)</th></tr></thead>
            <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
              <tr><td className="p-2">경량 강성 인장재</td><td className="p-2"><F>E/ρ</F></td></tr>
              <tr><td className="p-2">경량 강성 <b>보</b></td><td className="p-2"><F>E^½/ρ</F></td></tr>
              <tr><td className="p-2">경량 강성 <b>패널</b></td><td className="p-2"><F>E^⅓/ρ</F></td></tr>
              <tr><td className="p-2">경량 강도 인장재</td><td className="p-2"><F>σy/ρ</F></td></tr>
              <tr><td className="p-2">경량 강도 보 / 패널</td><td className="p-2"><F>σy^⅔/ρ</F> / <F>σy^½/ρ</F></td></tr>
              <tr><td className="p-2">탄성 스프링·힌지(에너지 저장)</td><td className="p-2"><F>σy²/E</F></td></tr>
              <tr><td className="p-2">탄성 변형 한계</td><td className="p-2"><F>σy/E</F></td></tr>
              <tr><td className="p-2">경량 방열</td><td className="p-2"><F>k/ρ</F></td></tr>
              <tr><td className="p-2">저원가 강성 / 강도</td><td className="p-2"><F>E/Cm</F> / <F>σy/Cm</F> (Cm=kg당 가격)</td></tr>
            </tbody>
          </table>
        </div>
        <Note tone="tip">왜 보는 <F>E^½</F>, 패널은 <F>E^⅓</F>? 보·패널은 두께가 자유변수라 단면 2차모멘트를 통해 들어가고, 자유변수를 소거하면 E의 거듭제곱이 분수로 바뀌기 때문입니다. 결론: <b>기능에 맞는 지수</b>를 골라야 합니다.</Note>

        {/* 4. 차트 & 앱 */}
        <H id="chart" icon={LineChart}>4. Ashby 차트 읽기 & 이 앱 사용법</H>
        <p className="leading-relaxed">
          Ashby 차트는 보통 <b>로그-로그</b> 축에 물성 두 개를 그립니다(예: 가로 ρ, 세로 E). 물성이 여러 자릿수에 걸쳐 분포하고, 성능지수가 직선으로 보이기 때문입니다.
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1.5 leading-relaxed">
          <li>
            <b>제약 = 한계선(상자).</b> “σy ≥ 400” 같은 조건은 그 값에서 축을 자르는 선이고, 통과 영역만 남깁니다.
            <br /><span className="text-muted-foreground">→ 이 앱: 차트 <b>X·Y 축 옆의 한계(limit) 슬라이더/숫자 입력</b>. (로그 축이면 슬라이더도 로그.)</span>
          </li>
          <li>
            <b>목적 = 기울기 직선(등지수선).</b> 성능지수 <F>M = Y^p/X</F> 가 일정한 선은 로그축에서 기울기 <F>1/p</F> 의 직선이고, 그 선을 <b>위로</b> 평행이동할수록 더 좋은 재료입니다. 선 위쪽이 “통과”.
            <br /><span className="text-muted-foreground">→ 이 앱: 상단 <b>Index</b> 드롭다운에서 지수를 고르면 X·Y축이 자동 설정되고 빨간 등지수선이 그려집니다. <b>M ≥ 임계값</b>을 올리면 선이 올라가며 통과 개수(<F>N/총</F>)가 갱신됩니다.</span>
          </li>
          <li>
            <b>여러 제약 동시에.</b> 강성 <i>그리고</i> 강도처럼 지표가 둘 이상이면 모두 AND로 걸 수 있습니다.
            <br /><span className="text-muted-foreground">→ 이 앱: Index 옆 <b>+ constraint</b> 로 지수를 무제한 추가(각각 M 임계값). 모두 통과한 재료만 색칠됩니다.</span>
          </li>
          <li>
            <b>직접 영역 선택·후피(envelope).</b> 군집(재료군)의 분포를 외피로 보고, 마음에 드는 영역을 드래그로 묶을 수 있습니다.
            <br /><span className="text-muted-foreground">→ 이 앱: <b>박스 선택</b>(드래그), <b>Envelopes</b> 토글(1차 family 기본), 활성 목록에서 <b>Add all → Compare</b>.</span>
          </li>
          <li>
            <b>후보 비교·검증.</b> 좁힌 후보를 나란히 비교하고 한 재료를 깊게 봅니다.
            <br /><span className="text-muted-foreground">→ 이 앱: <b>Compare</b>(물성별 막대·정렬), 이름 클릭 시 차트에 <b>링 마커</b>로 위치 표시 + <b>상세 팝업</b>(온도-강도 곡선·출처 포함).</span>
          </li>
        </ul>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted/50 text-left"><tr><th className="p-2 font-semibold">Ashby 개념</th><th className="p-2 font-semibold">이 앱에서</th></tr></thead>
            <tbody className="[&>tr]:border-t [&>tr]:border-border align-top">
              <tr><td className="p-2">제약(반드시 만족)</td><td className="p-2">좌측 <b>필터</b> 범위 · 차트 축 <b>한계 슬라이더</b></td></tr>
              <tr><td className="p-2">목적(성능지수)</td><td className="p-2">상단 <b>Index</b> 프리셋 + <b>M 임계값</b> 슬라이더</td></tr>
              <tr><td className="p-2">다목적(여러 지수)</td><td className="p-2"><b>+ constraint</b> 로 N개 AND</td></tr>
              <tr><td className="p-2">재료군 분포</td><td className="p-2"><b>Envelopes</b>(category/family/sub) 토글</td></tr>
              <tr><td className="p-2">후보 추리기</td><td className="p-2"><b>박스 선택</b> → Add all → Compare / → Filter</td></tr>
              <tr><td className="p-2">비교·검증</td><td className="p-2"><b>Compare</b> · 상세 팝업 · 출처 링크 · CSV</td></tr>
            </tbody>
          </table>
        </div>

        {/* 5. 사례별 예시 시나리오 */}
        <H id="workflow" icon={LineChart}>5. 사례별 예시 시나리오</H>
        <p className="leading-relaxed">
          자기 상황과 가장 가까운 사례를 찾아 그대로 따라 해 보세요.
          <span className="text-muted-foreground"> 수치는 방법을 보여주는 예시이고, “유력 재료군”은 일반적 경향입니다 — 최종 선택은 항상 데이터·데이터시트로 검증하세요.</span>
        </p>

        <Scenario
          n={1}
          title="경량 고강성 구조 브래킷 (드론·항공, LPBF 출력)"
          situation="진동·하중을 받는 마운트를 가능한 한 가볍게, 충분히 강하고 덜 휘게. 금속 적층제조로 출력."
          needs={<>하중·처짐 분석(2부) 결과 예: <F>σy ≥ 300&nbsp;MPa</F>, <F>E ≥ 90&nbsp;GPa</F>, 무게 최소.</>}
          steps={[
            <>좌측 필터: <b>Yield ≥ 300</b>, <b>Modulus ≥ 90</b>, <b>Process = LPBF</b>.</>,
            <>상단 <b>Index = 경량 강성 보 <F>E^½/ρ</F></b> 선택(보 형상). <b>+ constraint</b>로 <F>σy^⅔/ρ</F> 추가.</>,
            <><b>M 임계</b>를 올려 통과를 5~10개로 좁힘 → <b>Add all → Compare</b> → 무게·강도·가격 비교.</>,
          ]}
          families={<>고강도 알루미늄(예: Scalmalloy·AlSi10Mg), 티타늄(Ti-6Al-4V), 마그네슘 합금.</>}
        />

        <Scenario
          n={2}
          title="고온 부품 (배기 매니폴드 · 터빈 디스크)"
          situation="700 °C 부근에서 연속 사용, 반복 가열·산화."
          needs={<>최대사용온도 <F>≥ 700&nbsp;°C</F>, 그리고 <b>그 온도에서의</b> <F>σy</F>가 충분(상온값이 아님). 내산화.</>}
          steps={[
            <>필터: <b>Max Service Temp ≥ 700</b>.</>,
            <>후보 상세 팝업의 <b>온도-강도 곡선</b>으로 700 °C 부근 σy/UTS 비교 · <b>Compare</b>에 여러 후보 곡선 오버레이.</>,
            <>내식성(정성) 등급도 확인.</>,
          ]}
          families={<>니켈 초합금(Inconel 718/625, Haynes 230), 코발트 합금. 중온(≤540 °C)은 티타늄 Ti-6242.</>}
        />

        <Scenario
          n={3}
          title="회전·진동 부품 (샤프트 · 임펠러)"
          situation="반복 응력을 오래 견뎌야 하는 부품. 정적 강도만으로는 부족."
          needs={<>응력진폭 예 <F>150&nbsp;MPa</F>, <F>SF = 1.5</F> → <b>피로강도</b> <F>≥ 225&nbsp;MPa</F>.</>}
          steps={[
            <>필터: <b>Fatigue Strength ≥ 225</b> (값에 <F>est.</F>가 붙었는지 상세에서 확인).</>,
            <><b>Compare</b>로 피로강도·연신율·강도 함께 비교.</>,
          ]}
          families={<>티타늄(높은 피로/강도비), 고강도강(예: 4340), 일부 니켈합금. <span className="text-muted-foreground">알루미늄은 뚜렷한 내구한도가 없어 주의.</span></>}
        />

        <Scenario
          n={4}
          title="정밀 계측·광학 마운트 (치수 안정성)"
          situation="온도가 변해도 치수가 거의 변하면 안 되는 부품."
          needs={<>열변형 <F>ΔL = L·CTE·ΔT</F>에서 역산 → 매우 낮은 <b>CTE</b>(예 <F>≤ 3×10⁻⁶/K</F>), 충분한 <F>E</F>.</>}
          steps={[
            <>필터: <b>Thermal Expansion (CTE) 상한 ≤ 3</b>, 필요시 Modulus 하한.</>,
            <><b>Compare</b>로 CTE·E·밀도 비교.</>,
          ]}
          families={<>Invar(Fe-Ni36, CTE≈1.3), Kovar, 일부 세라믹·복합재.</>}
        />

        <Scenario
          n={5}
          title="해양·화학 환경 부품"
          situation="염수·약품에 노출되며 하중도 받는 부품."
          needs={<>환경에 맞는 <b>내식성</b> 등급 + 강도 <F>σy ≥</F> 요구값.</>}
          steps={[
            <>필터: <b>Corrosion resistance = Excellent/Good</b> + <b>Yield</b> 하한.</>,
            <>정량 부식(부식속도·PREN 등)은 앱에 없으므로 <b>데이터시트</b>로 최종 확인.</>,
          ]}
          families={<>스테인리스(316L, 듀플렉스 2205), 티타늄, 니켈합금(Inconel 625).</>}
        />

        <Scenario
          n={6}
          title="저원가 대량 생산 부품"
          situation="성능 요구는 평범하고 단가가 최우선."
          needs={<>필요 강도 <F>σy</F>를 만족하면서 <b>kg당 가격 최소</b>.</>}
          steps={[
            <>필터: <b>Yield</b> 하한으로 “쓸 수 있는” 재료만 남김.</>,
            <>상단 <b>Index = 저원가 강도 <F>σy/Cm</F></b>로 정렬 · <b>Compare</b>에 <b>Price</b> 열 추가.</>,
          ]}
          families={<>탄소강·저합금강, 일반 알루미늄(6061), 일부 폴리머.</>}
        />

        <Scenario
          n={7}
          title="스프링 · 스냅핏 · 탄성 힌지"
          situation="큰 탄성 변형으로 에너지를 저장·복원하되 영구변형은 없어야."
          needs={<>단위부피당 탄성에너지 지표 <F>σy²/E</F> 최대 + 충분한 연신율.</>}
          steps={[
            <>상단 <b>Index = 탄성 스프링/힌지 <F>σy²/E</F></b> 선택.</>,
            <><b>Compare</b>로 σy·E·연신율 비교.</>,
          ]}
          families={<>스프링강, 베릴륨동(BeCu), 티타늄, 일부 니켈합금.</>}
        />

        <Scenario
          n={8}
          title="방열 부품 (히트싱크 · 콜드플레이트)"
          situation="열을 빠르게 퍼뜨려야 하고, 가벼우면 더 좋음."
          needs={<>높은 <b>열전도도 k</b>; 경량 방열이면 <F>k/ρ</F> 최대.</>}
          steps={[
            <>필터: <b>Thermal Conductivity</b> 하한. 경량까지 필요하면 상단 <b>Index = 경량 방열 <F>k/ρ</F></b>.</>,
            <><b>Compare</b>로 k·밀도·가격 비교.</>,
          ]}
          families={<>구리(최고 k), 알루미늄(경량 방열 <F>k/ρ</F> 우수), AlSi 합금.</>}
        />

        <Note tone="tip">
          공통 마무리: 후보를 좁혔으면 <b>Compare</b>에서 이름을 클릭해 차트에 위치를 확인하고, <b>상세 팝업</b>에서 범위(min–max)·<F>est.</F> 여부·온도-강도·<b>출처 데이터시트</b>를 검증한 뒤 컬렉션으로 저장/공유하세요.
        </Note>

        {/* 6. 주의 */}
        <H id="caveats" icon={AlertTriangle}>6. 데이터 해석 시 주의</H>
        <ul className="list-disc pl-6 mt-1 space-y-1.5 leading-relaxed">
          <li>값은 <b>대표값(typical) + min–max 범위</b>입니다. 같은 합금도 공정·열처리·빌드 방향에 따라 크게 달라집니다.</li>
          <li><F>est.</F> 라벨(피로 추정, 클래스 대표 물리값 등)은 <b>측정값이 아니라 추정/대표값</b>입니다. 설계 확정 전 데이터시트로 확인하세요.</li>
          <li><b>AM(적층제조)은 이방성</b>이 있습니다(XY vs Z). 방향·후처리(HIP/열처리)에 따른 차이를 반드시 고려하세요.</li>
          <li>최종 판단은 항상 <b>출처(데이터시트·규격)</b>로 검증하고, 안전계수·인증 요구를 적용하세요. 이 앱은 <b>후보를 좁히는 도구</b>이지 설계 승인 근거가 아닙니다.</li>
        </ul>

        {/* 참고 */}
        <H id="refs" icon={BookText}>참고문헌</H>
        <ul className="list-disc pl-6 mt-1 space-y-1 leading-relaxed text-sm">
          <li>M. F. Ashby, <i>Materials Selection in Mechanical Design</i>, Butterworth-Heinemann (재료 선택 방법·성능지수의 표준 교과서).</li>
          <li>Ansys Granta EduPack, <i>Materials Selection</i> &amp; <i>Performance Indices</i> 교육 자료(성능지수 목록과 차트 활용).</li>
          <li>일반 재료역학(응력 <F>σ=F/A</F>, 보 처짐, 안전계수) — 표준 기계공학 교과서.</li>
        </ul>

        <div className="mt-10 pt-4 border-t border-border">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline underline-offset-2">
            <ArrowLeft className="w-4 h-4" /> 탐색기로 돌아가 바로 적용해 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
