# -*- coding: utf-8 -*-
"""
R227/E14/H4c — 글로서리 A4 용어 페이지 도표 생성 (matplotlib → PNG).
3D 결정격자(mplot3d) + 겹침 없는 2D 개략 그래프. PNG 는 client/src/assets/glossary/ 로 저장,
Vite 가 번들(오프라인·CSP 안전). 개략(schematic)이며 정밀 측정값 아님.

실행:  python scripts/gen-glossary-figures.py
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Rectangle, Circle, Polygon
from mpl_toolkits.mplot3d import proj3d
import numpy as np

# ── 한글 폰트 (Windows) ─────────────────────────────────────────────
for _f in ["Malgun Gothic", "NanumGothic", "Batang", "Gulim"]:
    try:
        matplotlib.font_manager.findfont(_f, fallback_to_default=False)
        plt.rcParams["font.family"] = _f
        break
    except Exception:
        continue
plt.rcParams["axes.unicode_minus"] = False

OUT = os.path.join(os.path.dirname(__file__), "..", "client", "src", "assets", "glossary")
os.makedirs(OUT, exist_ok=True)
DPI = 200

# 색 (앱 팔레트와 유사)
C_AX = "#4a5568"
C_G = "#c2621f"    # 오스테나이트(주황)
C_A = "#2f6fb0"    # 페라이트(청)
C_M = "#b4322a"    # 마르텐사이트(적)
C_MUTE = "#8a96a3"


def save(fig, name):
    fig.savefig(os.path.join(OUT, name + ".png"), dpi=DPI, bbox_inches="tight",
                facecolor="white", edgecolor="none")
    plt.close(fig)
    print("saved", name)


class Arrow3D(FancyArrowPatch):
    def __init__(self, xs, ys, zs, *args, **kwargs):
        super().__init__((0, 0), (0, 0), *args, **kwargs)
        self._verts3d = xs, ys, zs

    def do_3d_projection(self, renderer=None):
        xs3d, ys3d, zs3d = self._verts3d
        xs, ys, _ = proj3d.proj_transform(xs3d, ys3d, zs3d, self.axes.M)
        self.set_positions((xs[0], ys[0]), (xs[1], ys[1]))
        return np.min(zs3d)


def _cube_edges(ax, ox, oy, oz, ax_, ay_, az_, color):
    """정육면체/정방 셀 모서리."""
    x = [ox, ox + ax_]; y = [oy, oy + ay_]; z = [oz, oz + az_]
    pts = [(i, j, k) for i in x for j in y for k in z]
    edges = [(0, 1), (0, 2), (0, 4), (1, 3), (1, 5), (2, 3), (2, 6),
             (3, 7), (4, 5), (4, 6), (5, 7), (6, 7)]
    for a, b in edges:
        ax.plot(*zip(pts[a], pts[b]), color=color, lw=1.6, alpha=0.9)


def fig_martensite_lattice():
    """FCC 오스테나이트 → BCT 마르텐사이트 (3D 단위격자)."""
    fig = plt.figure(figsize=(8.4, 4.2))

    # FCC
    ax1 = fig.add_subplot(1, 2, 1, projection="3d")
    _cube_edges(ax1, 0, 0, 0, 1, 1, 1, C_G)
    corners = [(i, j, k) for i in (0, 1) for j in (0, 1) for k in (0, 1)]
    faces = [(0.5, 0.5, 0), (0.5, 0.5, 1), (0.5, 0, 0.5), (0.5, 1, 0.5), (0, 0.5, 0.5), (1, 0.5, 0.5)]
    ax1.scatter(*zip(*corners), s=190, c=C_G, depthshade=True, edgecolors="white", linewidths=0.5)
    ax1.scatter(*zip(*faces), s=130, c=C_G, alpha=0.55, depthshade=True, edgecolors="white", linewidths=0.5)
    ax1.set_title("FCC 오스테나이트 (γ)", fontsize=12, color=C_G, fontweight="bold", pad=2)
    ax1.text2D(0.5, -0.02, "면심입방 · 탄소 고용", transform=ax1.transAxes, ha="center", fontsize=9, color=C_MUTE)

    # BCT (c > a)
    ax2 = fig.add_subplot(1, 2, 2, projection="3d")
    c = 1.45
    _cube_edges(ax2, 0, 0, 0, 1, 1, c, C_M)
    corners2 = [(i, j, k) for i in (0, 1) for j in (0, 1) for k in (0, c)]
    ax2.scatter(*zip(*corners2), s=190, c=C_M, depthshade=True, edgecolors="white", linewidths=0.5)
    ax2.scatter([0.5], [0.5], [c / 2], s=150, c=C_M, depthshade=True, edgecolors="white", linewidths=0.5)  # body center
    ax2.scatter([0.5], [0.5], [c * 0.83], s=70, c="#111", marker="D", depthshade=False)  # 침입형 탄소
    ax2.set_title("BCT 마르텐사이트", fontsize=12, color=C_M, fontweight="bold", pad=2)
    ax2.text2D(0.5, -0.02, "체심정방(c>a) · 탄소 과포화(◆)", transform=ax2.transAxes, ha="center", fontsize=9, color=C_MUTE)

    for ax, zmax in ((ax1, 1), (ax2, c)):
        ax.set_box_aspect((1, 1, zmax))
        ax.set_axis_off()
        ax.view_init(elev=18, azim=-58)
        ax.set_xlim(-0.15, 1.15); ax.set_ylim(-0.15, 1.15); ax.set_zlim(-0.1, max(1, zmax) + 0.1)

    fig.text(0.5, 0.55, "급랭·무확산 전단", ha="center", fontsize=10, color=C_M)
    fig.text(0.5, 0.5, "──▶", ha="center", fontsize=15, color=C_M)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.98, bottom=0.06, wspace=0.05)
    save(fig, "martensite-lattice")


def fig_fcc_bcc():
    """FCC(오스테나이트) vs BCC(페라이트) 3D 단위격자 — austenite/ferrite 공용."""
    fig = plt.figure(figsize=(8.4, 4.2))
    ax1 = fig.add_subplot(1, 2, 1, projection="3d")
    _cube_edges(ax1, 0, 0, 0, 1, 1, 1, C_G)
    corners = [(i, j, k) for i in (0, 1) for j in (0, 1) for k in (0, 1)]
    faces = [(0.5, 0.5, 0), (0.5, 0.5, 1), (0.5, 0, 0.5), (0.5, 1, 0.5), (0, 0.5, 0.5), (1, 0.5, 0.5)]
    ax1.scatter(*zip(*corners), s=180, c=C_G, edgecolors="white", linewidths=0.5)
    ax1.scatter(*zip(*faces), s=120, c=C_G, alpha=0.55, edgecolors="white", linewidths=0.5)
    ax1.set_title("FCC 오스테나이트 (γ)", fontsize=12, color=C_G, fontweight="bold", pad=2)
    ax1.text2D(0.5, -0.02, "면심입방 · 탄소 고용도 큼", transform=ax1.transAxes, ha="center", fontsize=9, color=C_MUTE)

    ax2 = fig.add_subplot(1, 2, 2, projection="3d")
    _cube_edges(ax2, 0, 0, 0, 1, 1, 1, C_A)
    ax2.scatter(*zip(*corners), s=180, c=C_A, edgecolors="white", linewidths=0.5)
    ax2.scatter([0.5], [0.5], [0.5], s=150, c=C_A, edgecolors="white", linewidths=0.5)  # body center
    ax2.set_title("BCC 페라이트 (α)", fontsize=12, color=C_A, fontweight="bold", pad=2)
    ax2.text2D(0.5, -0.02, "체심입방 · 탄소 고용도 작음", transform=ax2.transAxes, ha="center", fontsize=9, color=C_MUTE)

    for ax in (ax1, ax2):
        ax.set_box_aspect((1, 1, 1)); ax.set_axis_off(); ax.view_init(elev=18, azim=-58)
        ax.set_xlim(-0.15, 1.15); ax.set_ylim(-0.15, 1.15); ax.set_zlim(-0.1, 1.1)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.98, bottom=0.06, wspace=0.05)
    save(fig, "fcc-bcc")


def fig_iron_carbon():
    """철-탄소 상태도 (개략) — 라벨 겹침 회피."""
    fig, ax = plt.subplots(figsize=(6.6, 4.4))
    # A3 line γ→α (912→727)
    cc = np.linspace(0, 0.76, 50)
    a3 = 912 - (912 - 727) * (cc / 0.76) ** 0.75
    ax.plot(cc, a3, color=C_G, lw=2)
    # Acm line γ→Fe3C (727→상승)
    cc2 = np.linspace(0.76, 2.0, 50)
    acm = 727 + (1147 - 727) * ((cc2 - 0.76) / (2.0 - 0.76)) ** 0.9
    ax.plot(cc2, acm, color=C_G, lw=2, ls="--")
    # eutectoid 727 line
    ax.plot([0, 2.0], [727, 727], color=C_M, lw=1.4, ls=":")
    ax.plot(0.76, 727, "o", color=C_M, ms=7)
    # 영역 라벨 (열린 공간에 배치 — 겹침 없음)
    ax.text(1.15, 1050, "γ 오스테나이트", fontsize=13, color=C_G, fontweight="bold", ha="center")
    ax.text(1.15, 1000, "(FCC · 고온상)", fontsize=9, color=C_MUTE, ha="center")
    ax.text(0.28, 620, "α + Fe₃C", fontsize=11, color=C_A, ha="center")
    ax.text(0.28, 585, "(펄라이트)", fontsize=8.5, color=C_MUTE, ha="center")
    ax.text(1.45, 640, "γ + Fe₃C", fontsize=10, color=C_MUTE, ha="center")
    ax.annotate("공석점\n0.76%C · 727°C", xy=(0.76, 727), xytext=(1.15, 800),
                fontsize=9, color=C_M, ha="left",
                arrowprops=dict(arrowstyle="->", color=C_M, lw=1))
    ax.set_xlabel("탄소 함량 (wt % C)", fontsize=11, color=C_AX)
    ax.set_ylabel("온도 (°C)", fontsize=11, color=C_AX)
    ax.set_xlim(0, 2.0); ax.set_ylim(500, 1150)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    save(fig, "iron-carbon")


def fig_ttt():
    """TTT/냉각변태 (개략) — 코가 왼쪽을 향하는 C-곡선. 냉각경로·라벨 겹침 회피."""
    fig, ax = plt.subplots(figsize=(7.0, 4.5))
    # C-곡선: 시간 x = f(온도), 코(nose)에서 최소시간 → 온도의 파라볼라
    temp = np.linspace(210, 715, 220)
    nose = 545.0
    x_start = 0.55 + 1.55 * ((temp - nose) / 255.0) ** 2
    x_finish = x_start + 0.55
    ax.plot(x_start, temp, color=C_AX, lw=1.9)
    ax.plot(x_finish, temp, color=C_MUTE, lw=1.3, ls="--")
    # Ms / Mf
    ax.plot([0, 3.5], [300, 300], color=C_M, lw=1.3, ls="--")
    ax.plot([0, 3.5], [180, 180], color=C_M, lw=1.0, ls=":")
    ax.text(3.55, 300, "Ms", color=C_M, fontsize=10, va="center")
    ax.text(3.55, 180, "Mf", color=C_M, fontsize=10, va="center")
    # 냉각경로: 급랭 (코 왼쪽 수직) → 마르텐사이트
    ax.annotate("", xy=(0.26, 165), xytext=(0.26, 735),
                arrowprops=dict(arrowstyle="-|>", color=C_A, lw=2.5))
    ax.text(0.13, 455, "급랭 → 마르텐사이트", color=C_A, fontsize=9.5, rotation=90, va="center", ha="center")
    # 냉각경로: 서랭 (완만·코 오른쪽 통과) → 펄라이트
    ax.annotate("", xy=(3.05, 470), xytext=(0.45, 735),
                arrowprops=dict(arrowstyle="-|>", color=C_G, lw=2.5))
    ax.text(2.35, 640, "서랭 → 펄라이트", color=C_G, fontsize=9.5, ha="center")
    # 곡선 라벨 (곡선 옆 빈 공간)
    ax.text(1.55, 690, "변태 시작", color=C_AX, fontsize=9.5)
    ax.text(2.75, 250, "변태 완료", color=C_MUTE, fontsize=9.5)
    # 코(nose): start·finish 사이 빈 공간에서 화살표로 지시 (점선과 겹치지 않게)
    ax.annotate("코(nose)", xy=(0.56, nose), xytext=(0.98, 628), fontsize=8.5, color=C_AX, ha="left",
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    ax.set_xlabel("시간 (log)", fontsize=11, color=C_AX)
    ax.set_ylabel("온도 (°C)", fontsize=11, color=C_AX)
    ax.set_xlim(0, 3.9); ax.set_ylim(120, 780)
    ax.set_xticks([]); ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    save(fig, "ttt-curve")


def fig_tempering():
    """뜨임 온도 vs 경도·인성 (개략)."""
    fig, ax = plt.subplots(figsize=(6.6, 4.0))
    T = np.linspace(100, 650, 100)
    hardness = 62 - 34 * ((T - 100) / 550) ** 1.4
    toughness = 12 + 78 * ((T - 100) / 550) ** 1.25
    ax.plot(T, hardness, color=C_M, lw=2.2, label="경도")
    ax.plot(T, toughness, color=C_A, lw=2.2, label="인성")
    ax.axvspan(250, 400, color=C_MUTE, alpha=0.10)
    ax.text(325, 96, "뜨임취성역", color=C_MUTE, fontsize=8.5, ha="center")
    # 라벨을 곡선 위 빈 공간에 (선과 겹치지 않게)
    ax.text(150, 80, "경도 ↓", color=C_M, fontsize=11, fontweight="bold")
    ax.text(500, 92, "인성 ↑", color=C_A, fontsize=11, fontweight="bold")
    ax.set_xlabel("뜨임 온도 (°C)", fontsize=11, color=C_AX)
    ax.set_ylabel("상대 경도 · 인성", fontsize=11, color=C_AX)
    ax.set_xlim(100, 650); ax.set_ylim(0, 105)
    ax.set_yticks([]); ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    save(fig, "tempering-curve")


def fig_stress_strain():
    """응력-변형 곡선 — 연성 vs 취성 · 항복·인장강도·연신·인성(면적)."""
    fig, ax = plt.subplots(figsize=(6.8, 4.4))
    # 연성(ductile): 탄성→항복→가공경화(UTS)→네킹→파단
    ex = np.array([0, 1.2, 3, 6, 10, 14, 18, 21.5])
    sy = np.array([0, 60, 78, 89, 94, 95, 90, 80])
    e = np.linspace(0, 21.5, 300)
    s = np.interp(e, ex, sy)
    ax.fill_between(e, 0, s, color=C_A, alpha=0.10)
    ax.plot(e, s, color=C_A, lw=2.3)
    ax.plot(21.5, 80, "x", color=C_A, ms=9, mew=2)
    # 취성(brittle): 급경사 선형 후 파단
    eb = np.array([0, 3.3]); sb = np.array([0, 102])
    ax.plot(eb, sb, color=C_M, lw=2.3)
    ax.plot(3.3, 102, "x", color=C_M, ms=9, mew=2)
    # 마커
    ax.plot(1.2, 60, "o", color=C_A, ms=6)
    ax.annotate("항복", xy=(1.2, 60), xytext=(2.6, 40), fontsize=9, color=C_AX,
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    ax.annotate("인장강도(UTS)", xy=(14, 95), xytext=(9.5, 104), fontsize=9, color=C_AX,
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    ax.text(15.5, 55, "인성 =\n곡선 아래 면적", color=C_A, fontsize=9, ha="center")
    ax.text(1.3, 96, "취성", color=C_M, fontsize=10, fontweight="bold")
    ax.text(18.6, 100, "연성", color=C_A, fontsize=10, fontweight="bold")
    ax.annotate("", xy=(21.5, 6), xytext=(0, 6), arrowprops=dict(arrowstyle="<->", color=C_MUTE, lw=1))
    ax.text(10.7, 11, "연신율", color=C_MUTE, fontsize=8.5, ha="center")
    ax.set_xlabel("변형률 (%)", fontsize=11, color=C_AX)
    ax.set_ylabel("응력", fontsize=11, color=C_AX)
    ax.set_xlim(0, 24); ax.set_ylim(0, 112)
    ax.set_yticks([]); ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    save(fig, "stress-strain")


def fig_sn_curve():
    """피로 S-N 곡선 — 강(피로한도 있음) vs 알루미늄(없음)."""
    fig, ax = plt.subplots(figsize=(6.8, 4.2))
    N = np.linspace(2, 8, 200)
    steel = 252 + 260 * np.exp(-(N - 2) / 0.90)  # 부드러운 knee → 피로한도(~252) 평탄
    al = 430 * np.exp(-(N - 2) / 3.6) + 60
    ax.plot(N, steel, color=C_A, lw=2.2)
    ax.plot(N, al, color=C_M, lw=2.2)
    ax.text(7.05, 268, "피로한도", color=C_A, fontsize=9)
    ax.text(3.1, 470, "강 (BCC)", color=C_A, fontsize=10, fontweight="bold")
    ax.text(5.6, 175, "알루미늄", color=C_M, fontsize=10, fontweight="bold")
    ax.text(5.6, 150, "(한도 없음)", color=C_MUTE, fontsize=8)
    ax.set_xlabel("파단 반복수 N  (log 스케일)", fontsize=11, color=C_AX)
    ax.set_ylabel("응력 진폭 (MPa)", fontsize=11, color=C_AX)
    ax.set_xlim(2, 8); ax.set_ylim(80, 580)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    save(fig, "sn-curve")


def fig_creep_curve():
    """크리프 곡선 — 1차(감속)·2차(정상)·3차(가속) 3단계."""
    fig, ax = plt.subplots(figsize=(6.8, 4.2))
    t = np.linspace(0, 10, 300)
    primary = 0.9 * (1 - np.exp(-t / 0.8))
    secondary = 0.16 * t
    tertiary = 0.02 * np.exp((t - 6.5) / 1.1)
    strain = 0.6 + primary + secondary + tertiary
    strain = strain[t <= 9.2]; tt = t[t <= 9.2]
    ax.plot(tt, strain, color=C_A, lw=2.3)
    ax.plot(tt[-1], strain[-1], "x", color=C_M, ms=10, mew=2)
    ax.text(tt[-1] - 0.1, strain[-1] + 0.15, "파단", color=C_M, fontsize=9, ha="right")
    # 단계 경계
    for x0, x1, name, xc in [(0, 1.8, "1차\n(감속)", 0.9), (1.8, 6.5, "2차 (정상 · 최소속도)", 4.1), (6.5, 9.2, "3차\n(가속)", 7.9)]:
        ax.axvspan(x0, x1, color=C_MUTE, alpha=0.06)
        ax.text(xc, 0.35, name, color=C_AX, fontsize=8.5, ha="center", va="center")
    ax.axvline(1.8, color=C_MUTE, lw=0.7, ls=":"); ax.axvline(6.5, color=C_MUTE, lw=0.7, ls=":")
    ax.plot(0, 0.6, "o", color=C_AX, ms=5)
    ax.text(0.15, 0.72, "순간 변형", color=C_MUTE, fontsize=8)
    ax.set_xlabel("시간 →", fontsize=11, color=C_AX)
    ax.set_ylabel("변형률", fontsize=11, color=C_AX)
    ax.set_xlim(0, 9.6); ax.set_ylim(0, max(strain) + 0.4)
    ax.set_xticks([]); ax.set_yticks([]); ax.spines[["top", "right"]].set_visible(False)
    save(fig, "creep-curve")


def fig_aging_curve():
    """시효경화 곡선 — 시효시간에 따른 경도(peak aging·overaging)."""
    fig, ax = plt.subplots(figsize=(6.8, 4.2))
    lt = np.linspace(0, 5, 300)  # log time
    def curve(peak_t, peak_h):
        return 40 + (peak_h - 40) * np.exp(-((lt - peak_t) ** 2) / (1.1 if peak_t > 2 else 0.7))
    hi = curve(1.7, 92)   # 고온 시효(빠르게 peak·낮은 최고)
    lo = curve(3.0, 100)  # 저온 시효(늦게 peak·높은 최고)
    ax.plot(lt, lo, color=C_A, lw=2.2)
    ax.plot(lt, hi, color=C_M, lw=2.2, ls="-")
    ax.plot(3.0, 100, "o", color=C_A, ms=6); ax.plot(1.7, 92, "o", color=C_M, ms=6)
    ax.annotate("최고경도(peak aging)", xy=(3.0, 101), xytext=(2.35, 108), fontsize=8.5, color=C_A, ha="center",
                arrowprops=dict(arrowstyle="->", color=C_A, lw=0.9))
    ax.text(4.45, 52, "과시효\n(overaging)", color=C_MUTE, fontsize=8.5, ha="center")
    ax.text(0.95, 88, "저온", color=C_A, fontsize=9)
    ax.text(0.7, 65, "고온", color=C_M, fontsize=9)
    ax.set_xlabel("시효 시간  (log) →", fontsize=11, color=C_AX)
    ax.set_ylabel("경도", fontsize=11, color=C_AX)
    ax.set_xlim(0, 5); ax.set_ylim(35, 112)
    ax.set_xticks([]); ax.set_yticks([]); ax.spines[["top", "right"]].set_visible(False)
    save(fig, "aging-curve")


def fig_dbtt_curve():
    """연성-취성 천이 — 충격에너지 vs 온도. BCC 는 천이, FCC 는 평탄."""
    fig, ax = plt.subplots(figsize=(6.8, 4.2))
    T = np.linspace(-150, 100, 300)
    bcc = 15 + 85 / (1 + np.exp(-(T + 20) / 15))
    fcc = 92 + 0.02 * T
    ax.plot(T, bcc, color=C_A, lw=2.3)
    ax.plot(T, fcc, color=C_G, lw=2.2, ls="-")
    ax.axvline(-20, color=C_M, lw=1, ls="--")
    ax.text(-17, 20, "DBTT", color=C_M, fontsize=9)
    ax.text(-120, 25, "취성\n(저에너지)", color=C_AX, fontsize=8.5, ha="center")
    ax.text(70, 108, "연성\n(고에너지)", color=C_AX, fontsize=8.5, ha="center")
    ax.text(55, 82, "BCC 강 (천이 있음)", color=C_A, fontsize=9, ha="center")
    ax.text(-55, 98, "FCC (천이 없음)", color=C_G, fontsize=9, ha="center")
    ax.set_xlabel("온도 (°C) →", fontsize=11, color=C_AX)
    ax.set_ylabel("충격 흡수 에너지", fontsize=11, color=C_AX)
    ax.set_xlim(-150, 100); ax.set_ylim(0, 122)
    ax.set_yticks([]); ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    save(fig, "dbtt-curve")


def fig_passivation_pitting():
    """부동태 피막과 공식(pitting) 발생 — 모식도."""
    fig, ax = plt.subplots(figsize=(7.2, 3.8))
    ax.add_patch(Rectangle((0.5, 0.2), 9, 2.0, facecolor="#cfd3d8", edgecolor=C_AX, lw=1.2))
    ax.text(3.2, 1.15, "금속 (스테인리스강 등)", ha="center", fontsize=10, color=C_AX)
    ax.add_patch(Rectangle((0.5, 2.2), 9, 0.26, facecolor="#4a9b6e", edgecolor="none"))
    ax.text(0.7, 2.72, "부동태 피막 (치밀한 Cr₂O₃ 산화막)", fontsize=9, color="#2f6b4a", ha="left")
    # Cl- 공격 (위첨자 마이너스는 mathtext 로 — 폰트 tofu 회피)
    ax.annotate(r"$\mathrm{Cl^{-}}$", xy=(6.5, 2.5), xytext=(6.5, 3.5), fontsize=13, color=C_M, ha="center",
                arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.8))
    # pit (금속으로 파고든 V)
    ax.add_patch(Polygon([(6.05, 2.2), (6.95, 2.2), (6.62, 0.7), (6.5, 0.45), (6.38, 0.7)],
                         facecolor="white", edgecolor=C_M, lw=1.5))
    ax.annotate("공식(pit)\n피막 국부 파괴→국부 부식", xy=(6.7, 1.2), xytext=(7.7, 1.5),
                fontsize=9, color=C_M, ha="left",
                arrowprops=dict(arrowstyle="->", color=C_M, lw=0.9))
    ax.set_xlim(0, 12.2); ax.set_ylim(0, 4); ax.axis("off")
    save(fig, "passivation-pitting")


def fig_scc_venn():
    """응력부식균열 = 인장응력 + 부식환경 + 감수성 재료 (동시 작용)."""
    fig, ax = plt.subplots(figsize=(5.8, 5.2))
    data = [((0.37, 0.60), "인장응력", C_A, (0.20, 0.83)),
            ((0.63, 0.60), "부식환경", C_M, (0.80, 0.83)),
            ((0.50, 0.38), "감수성 재료", C_G, (0.50, 0.14))]
    for (cx, cy), label, col, (lx, ly) in data:
        ax.add_patch(Circle((cx, cy), 0.25, facecolor=col, alpha=0.16, edgecolor=col, lw=1.8))
        ax.text(lx, ly, label, ha="center", color=col, fontsize=11, fontweight="bold")
    ax.text(0.50, 0.53, "SCC", ha="center", va="center", fontsize=15, fontweight="bold", color=C_AX)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
    ax.set_title("응력부식균열 — 세 요소가 동시에 있을 때만 발생", fontsize=11, color=C_AX, pad=8)
    save(fig, "scc-venn")


def fig_fracture_crack():
    """파괴역학 — 균열·원격응력·응력확대계수 K·소성역."""
    fig, ax = plt.subplots(figsize=(5.6, 5.4))
    ax.add_patch(Rectangle((0.7, 0.7), 3.6, 3.6, facecolor="#eef1f4", edgecolor=C_AX, lw=1.3))
    # 중앙 균열 2a
    ax.plot([1.75, 3.25], [2.5, 2.5], color=C_M, lw=3)
    ax.annotate("", xy=(3.25, 2.15), xytext=(1.75, 2.15), arrowprops=dict(arrowstyle="<->", color=C_M, lw=0.9))
    ax.text(2.5, 1.85, "균열 길이 2a", ha="center", color=C_M, fontsize=9)
    # 원격 응력
    for x in [1.3, 2.5, 3.7]:
        ax.annotate("", xy=(x, 4.35), xytext=(x, 5.0), arrowprops=dict(arrowstyle="-|>", color=C_A, lw=1.7))
        ax.annotate("", xy=(x, 0.7), xytext=(x, 0.05), arrowprops=dict(arrowstyle="-|>", color=C_A, lw=1.7))
    ax.text(2.5, 5.25, "σ  (원격 인장응력)", ha="center", color=C_A, fontsize=9.5)
    # 소성역
    ax.add_patch(Circle((3.25, 2.5), 0.2, facecolor=C_G, alpha=0.35, edgecolor=C_G))
    ax.annotate("소성역", xy=(3.42, 2.62), xytext=(3.95, 3.15), fontsize=8.5, color=C_G,
                arrowprops=dict(arrowstyle="->", color=C_G, lw=0.8))
    ax.text(2.5, -0.35, r"$K = Y\,\sigma\,\sqrt{\pi a}$   →   $K \geq K_{IC}$ 이면 불안정 파괴", ha="center", fontsize=10, color=C_AX)
    ax.set_xlim(0.1, 5.0); ax.set_ylim(-0.7, 5.6); ax.axis("off")
    save(fig, "fracture-crack")


def fig_gp_zones():
    """석출경화 — 시효 진행에 따른 석출물 변화(과포화→GP존→중간석출→과시효). 개략."""
    fig, axes = plt.subplots(1, 4, figsize=(10.2, 3.0))
    np.random.seed(3)
    stages = [
        ("I. 과포화 고용체", 0, 0),
        ("II. GP존 (정합)\n미세·최고경도", 60, 9),
        ("III. 중간 석출물\n(반정합)", 20, 42),
        ("IV. 과시효 (비정합)\n조대화·강도↓", 6, 150),
    ]
    for ax, (title, n, s) in zip(axes, stages):
        ax.add_patch(Circle((0.5, 0.58), 0.42, facecolor="#eef1f4", edgecolor=C_AX, lw=1.4))
        if n:
            ang = np.random.rand(n) * 2 * np.pi
            rad = np.sqrt(np.random.rand(n)) * 0.36
            ax.scatter(0.5 + rad * np.cos(ang), 0.58 + rad * np.sin(ang), s=s, c=C_M, edgecolors="none")
        ax.text(0.5, 0.02, title, ha="center", va="bottom", fontsize=8.8, color=C_AX, fontweight="bold")
        ax.set_xlim(0, 1); ax.set_ylim(-0.02, 1.05); ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("석출경화 — 시효에 따른 석출물 변화 (개략)", fontsize=11, color=C_AX, y=1.03)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.9, bottom=0.02, wspace=0.06)
    save(fig, "gp-zones")


def fig_galvanic_cell():
    """갈바닉 부식 — 활성(양극) 금속이 귀한(음극) 금속과 접촉해 가속 부식."""
    fig, ax = plt.subplots(figsize=(7.2, 4.4))
    ax.add_patch(Rectangle((0.5, 0.3), 9, 2.9, facecolor="#dce8f2", edgecolor=C_A, lw=1))
    ax.text(5.0, 0.6, "전해질 (예: 해수)", ha="center", fontsize=9.5, color=C_A)
    ax.add_patch(Rectangle((1.6, 1.3), 1.5, 2.4, facecolor="#b6bac0", edgecolor=C_M, lw=2.2))
    ax.text(2.35, 4.05, "양극 (활성 금속)", ha="center", fontsize=9.5, color=C_M, fontweight="bold")
    ax.text(2.35, 3.78, "→ 가속 부식", ha="center", fontsize=8.5, color=C_M)
    ax.add_patch(Rectangle((6.9, 1.3), 1.5, 2.4, facecolor="#cdd0d5", edgecolor=C_A, lw=2.2))
    ax.text(7.65, 4.05, "음극 (귀한 금속)", ha="center", fontsize=9.5, color=C_A, fontweight="bold")
    ax.text(7.65, 3.78, "→ 보호됨", ha="center", fontsize=8.5, color=C_A)
    ax.plot([2.35, 2.35, 7.65, 7.65], [3.7, 4.55, 4.55, 3.7], color=C_AX, lw=1.6)
    ax.text(5.0, 4.72, r"$e^{-}$  전자 흐름", ha="center", fontsize=9.5, color=C_AX)
    ax.annotate(r"$M^{n+}$ 용출", xy=(3.25, 2.5), xytext=(4.7, 2.5), fontsize=9.5, color=C_M, va="center",
                arrowprops=dict(arrowstyle="<-", color=C_M, lw=1.2))
    ax.set_xlim(0, 10); ax.set_ylim(0, 5.1); ax.axis("off")
    save(fig, "galvanic-cell")


def fig_sensitization():
    """예민화 — 입계 Cr 탄화물 석출 + 인접 Cr 결핍역(입계부식 취약)."""
    fig, ax = plt.subplots(figsize=(7.2, 4.2))
    ax.add_patch(Rectangle((0.5, 0.5), 4.3, 3.0, facecolor="#e8ecf0", edgecolor=C_AX, lw=1.2))
    ax.add_patch(Rectangle((5.2, 0.5), 4.3, 3.0, facecolor="#e8ecf0", edgecolor=C_AX, lw=1.2))
    ax.text(2.65, 1.9, "결정립 A", ha="center", color=C_AX, fontsize=10)
    ax.text(7.35, 1.9, "결정립 B", ha="center", color=C_AX, fontsize=10)
    # Cr 결핍역 (입계 양쪽 밝은 띠)
    ax.add_patch(Rectangle((4.55, 0.5), 0.9, 3.0, facecolor=C_M, alpha=0.13))
    # 입계
    ax.plot([5.0, 5.0], [0.5, 3.5], color=C_AX, lw=2)
    # Cr 탄화물 (입계 석출)
    for y in [1.0, 1.7, 2.4, 3.1]:
        ax.add_patch(Circle((5.0, y), 0.15, facecolor="#111", edgecolor="none"))
    ax.annotate("Cr 탄화물 (입계 석출)", xy=(5.0, 3.1), xytext=(5.7, 4.05), fontsize=9, color=C_AX, ha="left",
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    ax.annotate("Cr 결핍역 → 입계부식 취약", xy=(4.55, 1.2), xytext=(0.6, 4.05), fontsize=9, color=C_M, ha="left",
                arrowprops=dict(arrowstyle="->", color=C_M, lw=0.9))
    ax.set_xlim(0, 10); ax.set_ylim(0, 4.7); ax.axis("off")
    save(fig, "sensitization")


if __name__ == "__main__":
    fig_martensite_lattice()
    fig_fcc_bcc()
    fig_iron_carbon()
    fig_ttt()
    fig_tempering()
    fig_stress_strain()
    fig_sn_curve()
    fig_creep_curve()
    fig_aging_curve()
    fig_dbtt_curve()
    fig_passivation_pitting()
    fig_scc_venn()
    fig_fracture_crack()
    fig_galvanic_cell()
    fig_sensitization()
    fig_gp_zones()
    print("done →", os.path.abspath(OUT))
