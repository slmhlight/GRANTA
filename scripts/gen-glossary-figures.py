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
from matplotlib.patches import FancyArrowPatch
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
    ax.annotate("코(nose)", xy=(0.55, nose), xytext=(1.15, 480), fontsize=8.5, color=C_AX,
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
    ax.text(150, 58, "경도 ↓", color=C_M, fontsize=11, fontweight="bold")
    ax.text(520, 82, "인성 ↑", color=C_A, fontsize=11, fontweight="bold")
    ax.set_xlabel("뜨임 온도 (°C)", fontsize=11, color=C_AX)
    ax.set_ylabel("상대 경도 · 인성", fontsize=11, color=C_AX)
    ax.set_xlim(100, 650); ax.set_ylim(0, 105)
    ax.set_yticks([]); ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    save(fig, "tempering-curve")


if __name__ == "__main__":
    fig_martensite_lattice()
    fig_fcc_bcc()
    fig_iron_carbon()
    fig_ttt()
    fig_tempering()
    print("done →", os.path.abspath(OUT))
