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


def _cube_faces(ax, c, color):
    """단위셀 6면을 반투명으로 채워 입체감 (c=z 높이). BCT 는 c>1."""
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection
    v = [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0),
         (0, 0, c), (1, 0, c), (1, 1, c), (0, 1, c)]
    faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4],
             [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]]
    pc = Poly3DCollection([[v[i] for i in f] for f in faces],
                          facecolor=color, alpha=0.06, edgecolor="none")
    ax.add_collection3d(pc)


def fig_martensite_lattice():
    """FCC 오스테나이트 → BCT 마르텐사이트 (3D 단위격자)."""
    fig = plt.figure(figsize=(8.4, 4.2))

    # FCC
    ax1 = fig.add_subplot(1, 2, 1, projection="3d")
    _cube_faces(ax1, 1, C_G)
    _cube_edges(ax1, 0, 0, 0, 1, 1, 1, C_G)
    corners = [(i, j, k) for i in (0, 1) for j in (0, 1) for k in (0, 1)]
    faces = [(0.5, 0.5, 0), (0.5, 0.5, 1), (0.5, 0, 0.5), (0.5, 1, 0.5), (0, 0.5, 0.5), (1, 0.5, 0.5)]
    ax1.scatter(*zip(*corners), s=190, c=C_G, depthshade=True, edgecolors="white", linewidths=0.5)
    ax1.scatter(*zip(*faces), s=130, c=C_G, alpha=0.55, depthshade=True, edgecolors="white", linewidths=0.5)
    # 8면체 공극(탄소가 들어갈 침입형 자리) — 큰 빈틈
    ax1.scatter([0.5], [0.5], [0.5], s=60, facecolors="none", edgecolors="#111", linewidths=1.1, depthshade=False)
    ax1.set_title("FCC 오스테나이트 (γ)", fontsize=12, color=C_G, fontweight="bold", pad=2)
    ax1.text2D(0.5, -0.02, "면심입방 · 8면체 공극 큼(탄소 고용↑)", transform=ax1.transAxes, ha="center", fontsize=8.6, color=C_MUTE)

    # BCT (c > a)
    ax2 = fig.add_subplot(1, 2, 2, projection="3d")
    c = 1.45
    _cube_faces(ax2, c, C_M)
    _cube_edges(ax2, 0, 0, 0, 1, 1, c, C_M)
    corners2 = [(i, j, k) for i in (0, 1) for j in (0, 1) for k in (0, c)]
    ax2.scatter(*zip(*corners2), s=190, c=C_M, depthshade=True, edgecolors="white", linewidths=0.5)
    ax2.scatter([0.5], [0.5], [c / 2], s=150, c=C_M, depthshade=True, edgecolors="white", linewidths=0.5)  # body center
    ax2.scatter([0.5], [0.5], [c * 0.83], s=80, c="#111", marker="D", depthshade=False)  # 침입형 탄소
    ax2.set_title("BCT 마르텐사이트", fontsize=12, color=C_M, fontweight="bold", pad=2)
    ax2.text2D(0.5, -0.02, "체심정방(c>a) · 탄소 과포화(◆)", transform=ax2.transAxes, ha="center", fontsize=8.6, color=C_MUTE)

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
    _cube_faces(ax1, 1, C_G)
    _cube_edges(ax1, 0, 0, 0, 1, 1, 1, C_G)
    corners = [(i, j, k) for i in (0, 1) for j in (0, 1) for k in (0, 1)]
    faces = [(0.5, 0.5, 0), (0.5, 0.5, 1), (0.5, 0, 0.5), (0.5, 1, 0.5), (0, 0.5, 0.5), (1, 0.5, 0.5)]
    ax1.scatter(*zip(*corners), s=180, c=C_G, depthshade=True, edgecolors="white", linewidths=0.5)
    ax1.scatter(*zip(*faces), s=120, c=C_G, alpha=0.55, depthshade=True, edgecolors="white", linewidths=0.5)
    ax1.scatter([0.5], [0.5], [0.5], s=55, facecolors="none", edgecolors="#111", linewidths=1.0, depthshade=False)
    ax1.set_title("FCC 오스테나이트 (γ)", fontsize=12, color=C_G, fontweight="bold", pad=2)
    ax1.text2D(0.5, -0.02, "면심입방 · 탄소 고용도 큼(~2.1%)", transform=ax1.transAxes, ha="center", fontsize=8.6, color=C_MUTE)

    ax2 = fig.add_subplot(1, 2, 2, projection="3d")
    _cube_faces(ax2, 1, C_A)
    _cube_edges(ax2, 0, 0, 0, 1, 1, 1, C_A)
    ax2.scatter(*zip(*corners), s=180, c=C_A, depthshade=True, edgecolors="white", linewidths=0.5)
    ax2.scatter([0.5], [0.5], [0.5], s=150, c=C_A, depthshade=True, edgecolors="white", linewidths=0.5)  # body center
    ax2.set_title("BCC 페라이트 (α)", fontsize=12, color=C_A, fontweight="bold", pad=2)
    ax2.text2D(0.5, -0.02, "체심입방 · 탄소 고용도 작음(~0.02%)", transform=ax2.transAxes, ha="center", fontsize=8.6, color=C_MUTE)

    for ax in (ax1, ax2):
        ax.set_box_aspect((1, 1, 1)); ax.set_axis_off(); ax.view_init(elev=18, azim=-58)
        ax.set_xlim(-0.15, 1.15); ax.set_ylim(-0.15, 1.15); ax.set_zlim(-0.1, 1.1)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.98, bottom=0.06, wspace=0.05)
    save(fig, "fcc-bcc")


def fig_iron_carbon():
    """철-Fe₃C 상태도 (완전판) — 전 영역 음영·경계선·불변점(포정·공정·공석)."""
    fig, ax = plt.subplots(figsize=(9.4, 6.2))
    # ── 불변점 좌표 (표준값) ────────────────────────────────
    A = (0.0, 1538); N = (0.0, 1394); Gp = (0.0, 912); P = (0.022, 727)
    H = (0.09, 1495); J = (0.16, 1495); Bp = (0.53, 1495)          # 포정 1495
    E = (2.11, 1147); Cc = (4.30, 1147); F = (6.67, 1147); K = (6.67, 727); D = (6.67, 1250)
    S = (0.76, 727)                                                 # 공석
    FE3C = 6.67

    # ── 영역 음영 (상별 색) ────────────────────────────────
    regions = [
        ([A, Bp, Cc, D, (FE3C, 1600), (0, 1600)],           "#d9dee6", None, None),                 # L
        ([N, A, H],                                          "#cfe0f2", "δ", (0.045, 1455)),         # δ
        ([A, Bp, H],                                         "#e2ecf5", None, None),                 # δ+L
        ([J, Bp, Cc, E],                                     "#ecdfca", "γ + L", (2.1, 1300)),       # γ+L
        ([Cc, D, F],                                         "#e8dfc9", "L + Fe₃C", (5.7, 1178)),    # L+Fe3C
        ([Gp, N, J, E, S],                                   "#f6e2c6", None, None),                 # γ 오스테나이트
        ([Gp, S, P],                                         "#dfe9f4", None, None),                 # α+γ
        ([(0, 912), P, (0, 727)],                            "#cfe0f2", None, None),                 # α
        ([S, E, F, K],                                       "#f1e7d0", "γ + Fe₃C", (3.9, 930)),     # γ+Fe3C
        ([P, K, (FE3C, 500), (0, 500), (0, 727)],           "#efe6d6", None, None),                 # α+Fe3C
    ]
    for poly, fc, lab, lpos in regions:
        ax.add_patch(Polygon(poly, closed=True, facecolor=fc, edgecolor="none", zorder=0))
        if lab:
            ax.text(*lpos, lab, ha="center", va="center", fontsize=10, color=C_AX, zorder=5)
    # γ / α+Fe3C 큰 영역 라벨(강조)
    ax.text(0.95, 1055, "γ 오스테나이트", ha="center", fontsize=13, color=C_G, fontweight="bold", zorder=5)
    ax.text(0.95, 1010, "(FCC)", ha="center", fontsize=9, color=C_MUTE, zorder=5)
    ax.text(3.0, 610, "α 페라이트 + Fe₃C", ha="center", fontsize=11.5, color=C_AX, fontweight="bold", zorder=5)
    ax.text(3.0, 568, "(펄라이트 기반 조직)", ha="center", fontsize=9, color=C_MUTE, zorder=5)

    # ── 경계선 ────────────────────────────────────────────
    def line(p, q, **kw): ax.plot([p[0], q[0]], [p[1], q[1]], **kw)
    lw = dict(color=C_AX, lw=2.0, zorder=3)
    line(A, Bp, **lw); line(Bp, Cc, **lw); line(Cc, D, **lw)        # 액상선
    line(A, H, **lw); line(J, E, **lw)                             # 고상선(δ·γ)
    line(H, Bp, color=C_AX, lw=1.4, zorder=3)                      # 포정선 1495
    line(E, F, color=C_M, lw=1.8, zorder=3)                        # 공정선 1147
    line(Cc, E, color=C_M, lw=1.8, zorder=3)
    line(Gp, S, color=C_G, lw=2.0, zorder=3)                       # A3 (GS)
    line(S, E, color=C_G, lw=2.0, ls="--", zorder=3)               # Acm (SE)
    line(P, K, color=C_M, lw=1.8, zorder=3)                        # 공석선 727 (PSK)
    ax.plot([FE3C, FE3C], [500, 1250], color=C_AX, lw=2.0, zorder=3)  # Fe₃C 축

    # ── 불변점 (포정·공정·공석) ────────────────────────────
    for (pt, txt, tp) in [
        (J,  "포정 J\n0.16%C · 1495°C", (0.62, 1540)),
        (Cc, "공정 C\n4.30%C · 1147°C", (4.55, 1245)),
        (S,  "공석 S\n0.76%C · 727°C",  (1.30, 815)),
    ]:
        ax.plot(*pt, "o", color=C_M, ms=7, zorder=6)
        ax.annotate(txt, xy=pt, xytext=tp, fontsize=8.6, color=C_M, ha="left", va="center",
                    zorder=6, arrowprops=dict(arrowstyle="->", color=C_M, lw=0.9))
    # 페라이트(α) 콜아웃 — 얇아 라벨 불가
    ax.annotate("α 페라이트 (BCC)", xy=(0.03, 800), xytext=(1.35, 690), fontsize=9, color=C_A,
                ha="left", va="center", zorder=6, arrowprops=dict(arrowstyle="->", color=C_A, lw=0.9))
    ax.text(5.4, 1470, "L 액체", ha="center", fontsize=12, color=C_AX, zorder=5)

    # ── 조성 구간 브래킷 (하단) ────────────────────────────
    for x0, x1, name in [(0.022, 0.76, "아공석강"), (0.76, 2.11, "과공석강"), (2.11, 6.67, "주철")]:
        ax.annotate("", xy=(x0, 520), xytext=(x1, 520),
                    arrowprops=dict(arrowstyle="<->", color=C_MUTE, lw=0.9))
        ax.text((x0 + x1) / 2, 505, name, ha="center", va="top", fontsize=8, color=C_MUTE)

    ax.set_xlabel("탄소 함량 (wt % C)", fontsize=12, color=C_AX)
    ax.set_ylabel("온도 (°C)", fontsize=12, color=C_AX)
    ax.set_xlim(-0.05, 7.0); ax.set_ylim(480, 1600)
    ax.set_xticks([0, 0.76, 2.11, 4.30, 6.67])
    ax.set_yticks([500, 727, 912, 1147, 1394, 1538])
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    save(fig, "iron-carbon")


def fig_ttt():
    """TTT/냉각변태 (개략) — 시작/완료 곡선을 색·화살표 리더로 명확 구분, 급랭도 약간의 기울기."""
    fig, ax = plt.subplots(figsize=(7.4, 4.7))
    # C-곡선: 시간 x = f(온도), 코(nose)에서 최소시간 → 온도의 파라볼라
    temp = np.linspace(210, 715, 220)
    nose = 545.0
    x_start = 0.55 + 1.55 * ((temp - nose) / 255.0) ** 2
    x_finish = x_start + 0.62
    # 시작(진한 초록 실선) vs 완료(보라 파선) — 색+선종+리더 화살표 3중 구분
    C_ST, C_FI = "#2f7d4f", "#7a5aa8"
    ax.plot(x_start, temp, color=C_ST, lw=2.3)
    ax.plot(x_finish, temp, color=C_FI, lw=1.8, ls=(0, (6, 3)))
    # 변태 영역(시작~완료 사이) 옅은 음영 — 두 곡선이 쌍임을 시각화
    ax.fill_betweenx(temp, x_start, x_finish, color="#8a8f4a", alpha=0.10)
    ax.annotate("변태 시작 곡선", xy=(1.20, 710), xytext=(1.62, 752),
                fontsize=9.5, color=C_ST, fontweight="bold", ha="left", va="center",
                arrowprops=dict(arrowstyle="-|>", color=C_ST, lw=1.3))
    ax.annotate("변태 완료 곡선", xy=(float(x_finish[30]), float(temp[30])), xytext=(2.62, 320),
                fontsize=9.5, color=C_FI, fontweight="bold", ha="left",
                arrowprops=dict(arrowstyle="-|>", color=C_FI, lw=1.3))
    ax.text(2.05, 505, "변태 진행", color="#6b7042", fontsize=8, ha="center")
    # Ms / Mf
    ax.plot([0, 3.6], [300, 300], color=C_M, lw=1.3, ls="--")
    ax.plot([0, 3.6], [180, 180], color=C_M, lw=1.0, ls=":")
    ax.text(3.65, 300, "Ms", color=C_M, fontsize=10, va="center")
    ax.text(3.65, 180, "Mf", color=C_M, fontsize=10, va="center")
    # 냉각경로: 급랭 — 완전 수직이 아니라 약간의 기울기(현실 냉각속도)
    ax.annotate("", xy=(0.38, 165), xytext=(0.16, 735),
                arrowprops=dict(arrowstyle="-|>", color=C_A, lw=2.5))
    ax.text(0.115, 440, "급랭 → 마르텐사이트", color=C_A, fontsize=9.5, rotation=84, va="center", ha="center")
    # 냉각경로: 서랭 (완만·코 오른쪽 통과) → 펄라이트
    ax.annotate("", xy=(3.28, 470), xytext=(0.5, 735),
                arrowprops=dict(arrowstyle="-|>", color=C_G, lw=2.5))
    ax.text(2.5, 655, "서랭 → 펄라이트", color=C_G, fontsize=9.5, ha="center")
    # 코(nose): 시작~완료 사이 음영 밴드 안(곡선 비접촉)에서 짧은 화살표로 지시
    ax.annotate("코(nose)\n변태 최속점", xy=(0.585, nose), xytext=(0.8, 520), fontsize=8.0, color=C_AX,
                ha="left", va="center", arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    ax.set_xlabel("시간 (log)", fontsize=11, color=C_AX)
    ax.set_ylabel("온도 (°C)", fontsize=11, color=C_AX)
    ax.set_xlim(0, 4.0); ax.set_ylim(120, 780)
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
    """부동태 피막과 공식 v2 — 자가재생 vs 자가촉매 공식 화학 (Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(9.6, 5.2))
    # 금속 + 피막 + 전해질
    ax.add_patch(Rectangle((0.5, 0.2), 9.2, 2.0, facecolor="#cfd3d8", edgecolor=C_AX, lw=1.2))
    ax.text(2.1, 0.5, "금속 (스테인리스강)", ha="center", fontsize=9.5, color=C_AX)
    ax.add_patch(Rectangle((0.5, 2.42), 9.2, 1.95, facecolor="#dce8f2", alpha=0.55, edgecolor="none"))
    ax.text(9.55, 4.15, "전해질 (염화물 수용액)", fontsize=8.5, color=C_A, ha="right")
    ax.add_patch(Rectangle((0.5, 2.2), 9.2, 0.22, facecolor="#4a9b6e", edgecolor="none"))
    ax.annotate("부동태 피막 $\\mathrm{Cr_2O_3}$ — 두께 겨우 2~5 nm", xy=(1.7, 2.32), xytext=(0.7, 3.15),
                fontsize=8.6, color="#2f6b4a", arrowprops=dict(arrowstyle="->", color="#2f6b4a", lw=0.9))
    # (좌) 자가재생: 긁힘 + O2 재생
    ax.add_patch(Polygon([(3.1, 2.2), (3.3, 2.2), (3.2, 2.05)], facecolor="white", edgecolor="#2f6b4a", lw=1.0))
    ax.annotate("긁힘 → $\\mathrm{O_2}$ 만 있으면 수 초 내 재생(self-healing)", xy=(3.2, 2.28), xytext=(2.0, 3.7),
                fontsize=8.2, color="#2f6b4a", arrowprops=dict(arrowstyle="->", color="#2f6b4a", lw=0.9))
    # (우) 공식 pit — 내부 화학
    ax.add_patch(Polygon([(6.35, 2.2), (7.45, 2.2), (7.05, 0.85), (6.9, 0.6), (6.72, 0.85)],
                         facecolor="#f3e4e0", edgecolor=C_M, lw=1.5))
    # Cl- 유입(입구로 이주)
    for x0 in (6.6, 7.2):
        ax.annotate("$\\mathrm{Cl^-}$", xy=(x0, 2.35), xytext=(x0 - 0.25, 3.35), fontsize=10, color=C_M,
                    arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.2))
    # pit 내부: 양극 용해·산성화
    ax.text(6.92, 1.55, "$\\mathrm{M \\to M^{2+} + 2e^-}$", fontsize=8.2, color=C_M, ha="center")
    ax.text(6.92, 1.15, "가수분해 → $\\mathrm{H^+}$ 축적\npH ↓ (2~3)", fontsize=7.4, color=C_M, ha="center")
    # 전자 흐름(금속 내부) → 바깥 음극
    ax.annotate("", xy=(4.7, 1.0), xytext=(6.6, 0.95),
                arrowprops=dict(arrowstyle="-|>", color=C_AX, lw=1.2, ls="--"))
    ax.text(5.6, 0.72, "$e^-$", fontsize=9, color=C_AX, ha="center")
    # 피막 표면 음극 반응
    ax.text(4.4, 2.85, "음극(피막 표면): $\\mathrm{O_2+2H_2O+4e^- \\to 4OH^-}$", fontsize=8.0, color=C_A, ha="center")
    # 자가촉매 사이클 화살표
    ax.annotate("", xy=(7.62, 1.7), xytext=(7.62, 2.6),
                arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.3, connectionstyle="arc3,rad=-0.6"))
    ax.text(8.6, 1.5, "산성화가 $\\mathrm{Cl^-}$ 를 더 부르고\n용해를 가속 — 자가촉매", fontsize=7.8, color=C_M, ha="center")
    ax.annotate("공식(pit) — 좁고 깊게 진행", xy=(7.0, 0.75), xytext=(8.35, 0.7), fontsize=8.4, color=C_M,
                arrowprops=dict(arrowstyle="->", color=C_M, lw=0.9))
    ax.set_xlim(0.2, 10.0); ax.set_ylim(0.1, 4.6); ax.axis("off")
    ax.set_title("부동태(passivation)와 공식(pitting) — 재생하는 방패, 뚫리면 자가촉매 (개략)", fontsize=11, color=C_AX, pad=6)
    save(fig, "passivation-pitting")


def fig_scc_venn():
    """응력부식균열 v2 — 3요소 벤(구체 예시) + 가지치기 균열 조직도 (Figure Quality v2)."""
    fig, (ax, ax2) = plt.subplots(1, 2, figsize=(9.8, 5.0), gridspec_kw={"width_ratios": [1.05, 1]})
    # ── (좌) 벤 다이어그램 + 각 원 안 구체 예시 ──
    data = [((0.37, 0.62), "인장응력", C_A, (0.16, 0.885), "작동응력\n잔류응력(용접)\n볼트 체결력"),
            ((0.63, 0.62), "부식환경", C_M, (0.84, 0.885), "염화물(해수)\n$\\mathrm{H_2S}$(sour)\n고온수·가성"),
            ((0.50, 0.38), "감수성 재료", C_G, (0.50, 0.05), "오스테나이트계 SS\n고강도강(HRC≥32)\n황동(암모니아)")]
    for (cx, cy), label, col, (lx, ly), ex in data:
        ax.add_patch(Circle((cx, cy), 0.26, facecolor=col, alpha=0.15, edgecolor=col, lw=1.8))
        ax.text(lx, ly, label, ha="center", color=col, fontsize=10.5, fontweight="bold")
        # 원 안 예시(작게)
        exx, exy = (cx - 0.09, cy + 0.1) if cx < 0.5 else ((cx + 0.09, cy + 0.1) if cx > 0.5 else (cx, cy - 0.13))
        ax.text(exx, exy, ex, ha="center", va="center", fontsize=6.6, color=col, linespacing=1.4)
    ax.text(0.50, 0.545, "SCC", ha="center", va="center", fontsize=14, fontweight="bold", color=C_AX)
    ax.text(0.5, -0.075, "하나만 제거해도 멈춘다 — 응력완화·재질 변경·환경 제어가 모두 대책", ha="center",
            fontsize=7.8, color=C_MUTE, transform=ax.transAxes)
    ax.set_xlim(0, 1); ax.set_ylim(-0.02, 1.0); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("세 요소의 교집합에서만 발생", fontsize=10.5, color=C_AX, fontweight="bold")
    # ── (우) 가지치기 균열 조직도 — SCC 의 지문 (박스를 낮춰 위 여백에 σ·pit 라벨 분리) ──
    grains = _poly_grains(ax2, n=11, bbox=(0.05, 0.02, 0.9, 0.7), color="#eef0f3", lw=1.0, seed=37)
    ax2.add_patch(Polygon([(0.42, 0.72), (0.5, 0.72), (0.46, 0.655)], facecolor="white", edgecolor=C_M, lw=1.0))
    trunk = [(0.46, 0.67), (0.48, 0.56), (0.43, 0.47), (0.47, 0.36), (0.42, 0.26)]
    br1 = [(0.48, 0.56), (0.58, 0.51), (0.63, 0.43), (0.6, 0.34)]
    br2 = [(0.43, 0.47), (0.33, 0.4), (0.3, 0.31)]
    br3 = [(0.63, 0.43), (0.72, 0.38)]
    for path in (trunk, br1, br2, br3):
        xs, ys = zip(*path)
        ax2.plot(xs, ys, color=C_M, lw=1.6, solid_capstyle="round", zorder=6)
    # σ 인장 화살표(박스 위 전용 줄)
    ax2.annotate("", xy=(0.1, 0.79), xytext=(0.24, 0.79), arrowprops=dict(arrowstyle="-|>", color=C_A, lw=1.6))
    ax2.annotate("", xy=(0.9, 0.79), xytext=(0.76, 0.79), arrowprops=dict(arrowstyle="-|>", color=C_A, lw=1.6))
    ax2.text(0.5, 0.775, "σ (인장)", fontsize=8.5, color=C_A, ha="center", va="center")
    # pit 라벨(최상단 전용 줄 — 짧은 수직 화살표)
    ax2.annotate("표면 pit 에서 시작", xy=(0.46, 0.73), xytext=(0.35, 0.92), fontsize=7.8, color=C_M,
                 arrowprops=dict(arrowstyle="->", color=C_M, lw=0.8))
    # 가지치기 라벨(우하 여백에서 가지 끝 지시)
    ax2.annotate("입계를 따라 가지치기(branching) — SCC 파면의 지문", xy=(0.71, 0.375), xytext=(0.97, 0.12),
                 fontsize=7.6, color=C_M, ha="right", arrowprops=dict(arrowstyle="->", color=C_M, lw=0.8))
    ax2.text(0.5, -0.075, "하중은 항복 아래·부식은 눈에 안 띄게 — 예고 없이 취성 파단", ha="center",
             fontsize=7.8, color=C_MUTE, transform=ax2.transAxes)
    ax2.set_xlim(0, 1); ax2.set_ylim(-0.02, 1.0); ax2.set_aspect("equal"); ax2.axis("off")
    ax2.set_title("가지치는 균열 — 304 SS + 염화물 유형", fontsize=10.5, color=C_AX, fontweight="bold")
    fig.suptitle("응력부식균열 SCC (stress corrosion cracking) — 개략", fontsize=11.5, color=C_AX, y=0.99)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.86, bottom=0.09, wspace=0.08)
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


def _fill_parallel(ax, rect, angle_deg, spacing=0.06, color=C_M, lw=1.0):
    """사각 영역을 평행선으로 채움(마르텐사이트 라스 표현). rect=(x,y,w,h)."""
    x, y, w, h = rect
    clip = Rectangle((x, y), w, h, transform=ax.transData)
    a = np.deg2rad(angle_deg)
    dx, dy = np.cos(a), np.sin(a)
    diag = np.hypot(w, h)
    cx, cy = x + w / 2, y + h / 2
    for t in np.arange(-diag, diag, spacing):
        px, py = cx - dy * t, cy + dx * t
        ln, = ax.plot([px - dx * diag, px + dx * diag], [py - dy * diag, py + dy * diag],
                      color=color, lw=lw, alpha=0.55)
        ln.set_clip_path(clip)


def fig_martensite_morphology():
    """마르텐사이트 형태 — 라스(저·중탄소) vs 판상/렌티큘러(고탄소). 불규칙 다각형 구오스테나이트립 기반."""
    from matplotlib.patches import Ellipse
    fig, axes = plt.subplots(1, 2, figsize=(9.6, 4.6))
    rng = np.random.RandomState(4)
    # (좌) 라스: 구 오스테나이트립(다각형) 안에 방향이 다른 평행 라스 packet
    ax = axes[0]
    grains = _poly_grains(ax, n=9, color="#f4efe9", lw=1.6, seed=11)
    for patch, verts in grains:
        _laths_in(ax, patch, verts, rng.uniform(0, 180), spacing=0.045, color=C_M, lw=0.95)
    ax.set_title("라스 마르텐사이트 (저·중탄소강)", fontsize=10.5, color=C_M, fontweight="bold")
    ax.text(0.5, -0.06, "구 오스테나이트립(다각형) 안에 평행 라스 다발(packet)", ha="center",
            fontsize=8.2, color=C_MUTE, transform=ax.transAxes)
    # (우) 판상/렌티큘러: 다각형 립 안에서 렌즈 판이 서로 교차 (립 경계를 넘지 않음)
    ax = axes[1]
    grains = _poly_grains(ax, n=6, color="#f4efe9", lw=1.6, seed=23)
    for patch, verts in grains:
        w0 = max(np.ptp(verts[:, 0]), np.ptp(verts[:, 1]))
        for (cx, cy) in _pts_inside(verts, 4, rng, shrink=0.55):
            ell = Ellipse((cx, cy), w0 * rng.uniform(0.45, 0.85), w0 * rng.uniform(0.07, 0.12),
                          angle=rng.uniform(0, 180), facecolor=C_M, alpha=0.32, edgecolor=C_M, lw=1.1)
            ell.set_clip_path(patch)
            ax.add_patch(ell)
    ax.set_title("판상(렌티큘러) 마르텐사이트 (고탄소강)", fontsize=10.5, color=C_M, fontweight="bold")
    ax.text(0.5, -0.06, "렌즈 모양 판이 립 내부에서 교차 · 사이는 잔류 오스테나이트", ha="center",
            fontsize=8.2, color=C_MUTE, transform=ax.transAxes)
    for ax in axes:
        ax.set_xlim(-0.01, 1.01); ax.set_ylim(-0.01, 1.01); ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("마르텐사이트 형태 (개략)", fontsize=11.5, color=C_AX, y=1.02)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.88, bottom=0.08, wspace=0.08)
    save(fig, "martensite-morphology")


def fig_pearlite():
    """펄라이트 — 페라이트(밝음)와 시멘타이트(어둠) 교대 층상. 개략."""
    fig, ax = plt.subplots(figsize=(6.6, 4.0))
    ax.add_patch(Rectangle((0, 0), 6, 4, facecolor="#f4efe9", edgecolor=C_AX, lw=1.4))
    # 콜로니 3개, 방향 다름
    colonies = [((0.3, 0.3, 2.6, 3.4), 0), ((3.0, 0.3, 2.7, 1.8), 90), ((3.0, 2.2, 2.7, 1.5), 35)]
    for (x, y, w, h), ang in colonies:
        clip = Rectangle((x, y), w, h, transform=ax.transData)
        a = np.deg2rad(ang)
        dx, dy = np.cos(a), np.sin(a)
        cx, cy = x + w / 2, y + h / 2
        diag = np.hypot(w, h)
        for i, t in enumerate(np.arange(-diag, diag, 0.16)):
            px, py = cx - dy * t, cy + dx * t
            col = "#333" if i % 2 == 0 else "#f4efe9"
            lw = 3.0 if i % 2 == 0 else 0
            if lw:
                ln, = ax.plot([px - dx * diag, px + dx * diag], [py - dy * diag, py + dy * diag], color=col, lw=lw)
                ln.set_clip_path(clip)
    ax.text(1.6, 3.75, "α 페라이트(밝음) + Fe₃C 시멘타이트(어둠) 교대 층상", ha="center", fontsize=8.5, color=C_AX)
    ax.set_xlim(-0.1, 6.1); ax.set_ylim(-0.1, 4.2); ax.set_aspect("equal"); ax.axis("off")
    save(fig, "pearlite")


def _voronoi_grains(ax, pts, color="#eef1f4"):
    from scipy.spatial import Voronoi
    far = np.array([[-9, -9], [-9, 9], [9, -9], [9, 9]])
    vor = Voronoi(np.vstack([pts, far]))
    for pr in vor.point_region[:len(pts)]:
        region = vor.regions[pr]
        if not region or -1 in region:
            continue
        poly = [vor.vertices[i] for i in region]
        ax.add_patch(Polygon(poly, facecolor=color, edgecolor=C_AX, lw=1.0))


# ── 미세조직 공통 헬퍼 (H4d D1: grain = 불규칙 다각형·6각↑, Voronoi) ──────────
def _clip_poly_bbox(verts, x0, y0, x1, y1):
    """다각형을 bbox 로 실제 클리핑 (Sutherland–Hodgman). 경계 Voronoi 셀의 far-point 꼭짓점 제거."""
    pts = [tuple(p) for p in verts]
    edges = [
        (lambda p: p[0] >= x0, lambda a, b: (x0, a[1] + (x0 - a[0]) / (b[0] - a[0]) * (b[1] - a[1]))),
        (lambda p: p[0] <= x1, lambda a, b: (x1, a[1] + (x1 - a[0]) / (b[0] - a[0]) * (b[1] - a[1]))),
        (lambda p: p[1] >= y0, lambda a, b: (a[0] + (y0 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]), y0)),
        (lambda p: p[1] <= y1, lambda a, b: (a[0] + (y1 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]), y1)),
    ]
    for inside, intersect in edges:
        if not pts:
            break
        nxt = []
        for i in range(len(pts)):
            cur, prv = pts[i], pts[i - 1]
            ci, pi = inside(cur), inside(prv)
            if ci:
                if not pi:
                    nxt.append(intersect(prv, cur))
                nxt.append(cur)
            elif pi:
                nxt.append(intersect(prv, cur))
        pts = nxt
    return np.array(pts) if len(pts) >= 3 else None


def _poly_grains(ax, n=14, bbox=(0, 0, 1, 1), color="#f4efe9", edge=C_AX, lw=1.2, seed=0):
    """불규칙 다각형 결정립으로 bbox 를 채움. [(Polygon patch, 꼭짓점 array)] 반환 — 상 채움/클리핑용.
    꼭짓점은 bbox 로 실제 클리핑되어 centroid·크기 계산이 안전(자식 요소가 밖으로 새지 않음)."""
    from scipy.spatial import Voronoi
    rng = np.random.RandomState(seed)
    x0, y0, w, h = bbox
    pts = rng.rand(n, 2) * [w, h] + [x0, y0]
    far = np.array([[x0 - 3 * w, y0 - 3 * h], [x0 - 3 * w, y0 + 4 * h],
                    [x0 + 4 * w, y0 - 3 * h], [x0 + 4 * w, y0 + 4 * h]])
    vor = Voronoi(np.vstack([pts, far]))
    out = []
    for pr in vor.point_region[:len(pts)]:
        region = vor.regions[pr]
        if not region or -1 in region:
            continue
        raw = np.array([vor.vertices[i] for i in region])
        verts = _clip_poly_bbox(raw, x0, y0, x0 + w, y0 + h)
        if verts is None:
            continue
        patch = Polygon(verts, facecolor=color, edgecolor=edge, lw=lw)
        ax.add_patch(patch)
        out.append((patch, verts))
    return out


def _lamellae_in(ax, patch, verts, angle_deg, spacing=0.045, color="#333", lw=2.0):
    """결정립(patch) 내부를 층상(펄라이트)으로 채움 — 각 립마다 방향 다르게."""
    a = np.deg2rad(angle_deg)
    dx, dy = np.cos(a), np.sin(a)
    cx, cy = verts[:, 0].mean(), verts[:, 1].mean()
    diag = max(np.ptp(verts[:, 0]), np.ptp(verts[:, 1])) * 1.6
    for t in np.arange(-diag, diag, spacing):
        px, py = cx - dy * t, cy + dx * t
        ln, = ax.plot([px - dx * diag, px + dx * diag], [py - dy * diag, py + dy * diag],
                      color=color, lw=lw, solid_capstyle="butt")
        ln.set_clip_path(patch)


def _laths_in(ax, patch, verts, angle_deg, spacing=0.05, color=C_M, lw=1.0):
    """결정립 내부 평행 라스(마르텐사이트) — packet 표현."""
    a = np.deg2rad(angle_deg)
    dx, dy = np.cos(a), np.sin(a)
    cx, cy = verts[:, 0].mean(), verts[:, 1].mean()
    diag = max(np.ptp(verts[:, 0]), np.ptp(verts[:, 1])) * 1.6
    for t in np.arange(-diag, diag, spacing):
        px, py = cx - dy * t, cy + dx * t
        ln, = ax.plot([px - dx * diag, px + dx * diag], [py - dy * diag, py + dy * diag],
                      color=color, lw=lw, alpha=0.6)
        ln.set_clip_path(patch)


def _pts_inside(verts, n, rng, shrink=0.72):
    """다각형 내부 점 n개(중심 수축 샘플링 — 경계 걸침 방지)."""
    cx, cy = verts[:, 0].mean(), verts[:, 1].mean()
    idx = rng.randint(0, len(verts), n)
    frac = rng.uniform(0.15, shrink, n)
    return [(cx + (verts[i, 0] - cx) * f, cy + (verts[i, 1] - cy) * f) for i, f in zip(idx, frac)]


def fig_grain_structure():
    """결정립 조직 — 등축(어닐링) / 냉간가공(연신) / 재결정. 개략."""
    fig, axes = plt.subplots(1, 3, figsize=(10.2, 3.5))
    np.random.seed(7)
    base = np.random.rand(28, 2)
    # (A) 등축
    _voronoi_grains(axes[0], base)
    axes[0].set_title("등축 (어닐링)", fontsize=10, color=C_AX)
    # (B) 냉간가공 — y 압축 → 수평으로 늘어난 결정립
    stretched = base.copy(); stretched[:, 1] *= 0.32
    _voronoi_grains(axes[1], stretched, color="#f0ece6")
    axes[1].set_title("냉간가공 (연신)", fontsize=10, color=C_AX)
    axes[1].set_ylim(-0.02, 0.34)
    # (C) 재결정 — 더 많은·작은 등축립
    fine = np.random.rand(70, 2)
    _voronoi_grains(axes[2], fine)
    axes[2].set_title("재결정 (새 미세립)", fontsize=10, color=C_AX)
    for i, ax in enumerate(axes):
        ax.set_xlim(0.03, 0.97)
        if i != 1:
            ax.set_ylim(0.03, 0.97)
        ax.set_aspect("auto" if i == 1 else "equal"); ax.axis("off")
    fig.suptitle("결정립 조직 변화 (개략)", fontsize=11, color=C_AX, y=1.02)
    save(fig, "grain-structure")


def fig_steel_microstructures():
    """탄소 함량별 강 미세조직 — 아공석/공석/과공석. 불규칙 다각형 결정립(Voronoi) 기반."""
    fig, axes = plt.subplots(1, 3, figsize=(10.2, 3.9))
    titles = ["아공석강 (<0.76%C)\n페라이트 + 펄라이트",
              "공석강 (0.76%C)\n전부 펄라이트",
              "과공석강 (>0.76%C)\n펄라이트 + 입계 시멘타이트"]
    rng = np.random.RandomState(5)
    for k, (ax, title) in enumerate(zip(axes, titles)):
        if k == 0:
            # 아공석: 밝은 페라이트 다각립 + 일부 립이 펄라이트 콜로니(층상)
            grains = _poly_grains(ax, n=13, color="#f6f1ea", lw=1.2, seed=7)
            pearl_idx = rng.choice(len(grains), size=max(3, len(grains) * 2 // 5), replace=False)
            for i in pearl_idx:
                patch, verts = grains[i]
                _lamellae_in(ax, patch, verts, rng.uniform(0, 180), spacing=0.035, color="#3a3a3a", lw=1.6)
            ax.text(0.16, 1.045, "α 페라이트", fontsize=8, color=C_A, ha="center")
            ax.text(0.72, 1.045, "펄라이트 콜로니", fontsize=8, color="#333", ha="center")
        elif k == 1:
            # 공석: 전 립이 펄라이트 — 립마다 층 방향 다름
            grains = _poly_grains(ax, n=11, color="#f4efe9", lw=1.2, seed=17)
            for patch, verts in grains:
                _lamellae_in(ax, patch, verts, rng.uniform(0, 180), spacing=0.037, color="#3a3a3a", lw=1.6)
            ax.text(0.5, 1.045, "펄라이트 (립마다 층 방향 다름)", fontsize=8, color="#333", ha="center")
        else:
            # 과공석: 펄라이트 립 + 립 경계를 감싸는 두꺼운 시멘타이트 망(어두운 경계)
            grains = _poly_grains(ax, n=11, color="#f4efe9", edge="#101010", lw=3.4, seed=29)
            for patch, verts in grains:
                _lamellae_in(ax, patch, verts, rng.uniform(0, 180), spacing=0.045, color="#5a5a5a", lw=1.3)
            ax.text(0.5, 1.045, "입계 Fe₃C 망(두꺼운 경계) + 펄라이트", fontsize=8, color="#101010", ha="center")
        ax.text(0.5, -0.06, title, ha="center", va="top", fontsize=8.6, color=C_AX, fontweight="bold", transform=ax.transAxes)
        ax.set_xlim(-0.01, 1.01); ax.set_ylim(-0.01, 1.09); ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("탄소 함량별 강 미세조직 (서랭 후, 개략)", fontsize=11.5, color=C_AX, y=1.03)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.86, bottom=0.14, wspace=0.10)
    save(fig, "steel-microstructures")


def fig_austenite_micro():
    """오스테나이트 조직 — 등축 다각립 + 어닐링 쌍정(annealing twin). 전용 조직도."""
    fig, ax = plt.subplots(figsize=(6.8, 4.6))
    rng = np.random.RandomState(9)
    grains = _poly_grains(ax, n=12, bbox=(0, 0, 1.45, 1.0), color="#f7ead8", edge=C_AX, lw=1.4, seed=31)
    # 어닐링 쌍정: 일부 립 내부에 평행 직선 띠(twin band)
    twin_idx = rng.choice(len(grains), size=max(3, len(grains) // 2), replace=False)
    for i in twin_idx:
        patch, verts = grains[i]
        cx, cy = verts[:, 0].mean(), verts[:, 1].mean()
        a = rng.uniform(0, np.pi)
        dx, dy = np.cos(a), np.sin(a)
        diag = max(np.ptp(verts[:, 0]), np.ptp(verts[:, 1]))
        off = rng.uniform(0.05, 0.12)
        band = Polygon([(cx - dx * diag - dy * off, cy - dy * diag + dx * off),
                        (cx + dx * diag - dy * off, cy + dy * diag + dx * off),
                        (cx + dx * diag + dy * off, cy + dy * diag - dx * off),
                        (cx - dx * diag + dy * off, cy - dy * diag - dx * off)],
                       facecolor=C_G, alpha=0.28, edgecolor=C_G, lw=1.0)
        band.set_clip_path(patch)
        ax.add_patch(band)
    # 콜아웃 — 라벨(우측 여백)에서 가장 가까운(오른쪽) 립을 지시해 화살표를 짧게
    twin_set = set(int(i) for i in twin_idx)
    twin_near = max((grains[i] for i in twin_set), key=lambda g: g[1][:, 0].mean())
    plain_near = max((g for j, g in enumerate(grains) if j not in twin_set), key=lambda g: g[1][:, 0].mean())
    twin_y = twin_near[1][:, 1].mean()
    plain_y = plain_near[1][:, 1].mean()
    # 라벨 y 를 대상 립의 상하 위치에 맞춰 배치 → 화살표 교차 방지
    ty, py = (0.78, 0.3) if twin_y >= plain_y else (0.3, 0.78)
    ax.annotate("어닐링 쌍정(twin) —\n오스테나이트계의 특징", xy=(twin_near[1][:, 0].mean(), twin_y),
                xytext=(1.52, ty), fontsize=8.6, color=C_G, va="center",
                arrowprops=dict(arrowstyle="->", color=C_G, lw=1.0))
    ax.annotate("등축 다각형 결정립\n(FCC γ)", xy=(plain_near[1][:, 0].mean(), plain_y),
                xytext=(1.52, py), fontsize=8.6, color=C_AX, va="center",
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=1.0))
    ax.set_xlim(-0.01, 2.15); ax.set_ylim(-0.03, 1.03); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("오스테나이트 조직 (개략) — 304 스테인리스강 유형", fontsize=11, color=C_AX, pad=8)
    save(fig, "austenite-micro")


def fig_cementite_forms():
    """시멘타이트 형태 4종 — 층상(펄라이트)·입계 망·구상화·미세 분산. 전용 조직도."""
    fig, axes = plt.subplots(2, 2, figsize=(8.8, 7.2))
    rng = np.random.RandomState(13)
    # (1) 층상 — 펄라이트
    ax = axes[0, 0]
    grains = _poly_grains(ax, n=8, color="#f4efe9", lw=1.2, seed=41)
    for patch, verts in grains:
        _lamellae_in(ax, patch, verts, rng.uniform(0, 180), spacing=0.045, color="#333", lw=1.9)
    ax.set_title("층상 (펄라이트 속 Fe₃C)", fontsize=10, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, -0.05, "페라이트와 교대 층 · 서랭 조직", ha="center", fontsize=8, color=C_MUTE, transform=ax.transAxes)
    # (2) 초석 입계망 — 과공석강
    ax = axes[0, 1]
    _poly_grains(ax, n=10, color="#f4efe9", edge="#101010", lw=4.0, seed=43)
    ax.set_title("초석 입계 망 (과공석강)", fontsize=10, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, -0.05, "립 경계를 감싸는 망 — 취성의 원인", ha="center", fontsize=8, color=C_MUTE, transform=ax.transAxes)
    # (3) 구상화(spheroidite)
    ax = axes[1, 0]
    grains = _poly_grains(ax, n=8, color="#f6f1ea", lw=1.0, seed=47)
    for patch, verts in grains:
        for (cx, cy) in _pts_inside(verts, 9, rng):
            ax.add_patch(Circle((cx, cy), rng.uniform(0.012, 0.026), facecolor="#222", edgecolor="none"))
    ax.set_title("구상화 (spheroidite)", fontsize=10, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, -0.05, "둥근 입자 → 연하고 가공 쉬움 (구상화 annealing)", ha="center", fontsize=8, color=C_MUTE, transform=ax.transAxes)
    # (4) 미세 분산 — tempered martensite
    ax = axes[1, 1]
    grains = _poly_grains(ax, n=8, color="#f6efe9", lw=1.0, seed=53)
    for patch, verts in grains:
        _laths_in(ax, patch, verts, rng.uniform(0, 180), spacing=0.07, color=C_M, lw=0.6)
        for (cx, cy) in _pts_inside(verts, 26, rng, shrink=0.85):
            ax.add_patch(Circle((cx, cy), rng.uniform(0.004, 0.009), facecolor="#222", edgecolor="none"))
    ax.set_title("미세 분산 (tempered martensite)", fontsize=10, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, -0.05, "Tempering 으로 석출한 미세 탄화물 — 강도·인성 균형", ha="center", fontsize=8, color=C_MUTE, transform=ax.transAxes)
    for ax in axes.ravel():
        ax.set_xlim(-0.01, 1.01); ax.set_ylim(-0.01, 1.01); ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("시멘타이트(Fe₃C)의 형태 — 같은 상, 다른 분포, 다른 성질 (개략)", fontsize=11.5, color=C_AX, y=0.99)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.9, bottom=0.05, wspace=0.10, hspace=0.24)
    save(fig, "cementite-forms")


def fig_carbide_micro():
    """탄화물 분포 조직 — 합금강(입내 미세 MC·입계 M23C6) vs 초경합금(WC-Co). 전용 조직도."""
    fig, axes = plt.subplots(1, 2, figsize=(9.6, 4.6))
    rng = np.random.RandomState(19)
    # (좌) 합금강: 기지 다각립 + 입내 미세 MC 점 + 입계 따라 M23C6 사슬
    ax = axes[0]
    grains = _poly_grains(ax, n=8, color="#f4f0e9", lw=1.3, seed=61)
    for patch, verts in grains:
        for (cx, cy) in _pts_inside(verts, 14, rng, shrink=0.8):
            ax.add_patch(Circle((cx, cy), rng.uniform(0.005, 0.011), facecolor="#8a2f2a", edgecolor="none"))
    # 입계 사슬: 각 립 변을 따라 검은 점
    for patch, verts in grains:
        for i in range(len(verts)):
            a, b = verts[i], verts[(i + 1) % len(verts)]
            for f in np.linspace(0.15, 0.85, 4):
                p = a + (b - a) * f
                if 0.02 < p[0] < 0.98 and 0.02 < p[1] < 0.98:
                    ax.add_patch(Circle((p[0], p[1]), 0.011, facecolor="#111", edgecolor="none"))
    ax.annotate("입내 미세 MC\n(V·Nb·Ti 탄화물)", xy=(0.32, 0.62), xytext=(0.03, 1.06), fontsize=8.2, color="#8a2f2a",
                arrowprops=dict(arrowstyle="->", color="#8a2f2a", lw=0.9))
    ax.annotate("입계 $\\mathrm{M_{23}C_6}$ 사슬\n(예민화·크리프 관련)", xy=(0.62, 0.4), xytext=(0.6, 1.06), fontsize=8.2, color="#111",
                arrowprops=dict(arrowstyle="->", color="#111", lw=0.9))
    ax.set_title("합금강 속 탄화물", fontsize=10.5, color=C_AX, fontweight="bold", pad=22)
    # (우) 초경합금 WC-Co: 각진 WC 입자(작은 다각형·촘촘) + 밝은 Co 결합상
    ax = axes[1]
    ax.add_patch(Rectangle((0, 0), 1, 1, facecolor="#e9dfc9", edgecolor=C_AX, lw=1.2))  # Co binder
    _poly_grains(ax, n=42, color="#5a6675", edge="#e9dfc9", lw=2.4, seed=67)
    ax.annotate("WC 입자 (각진 다각형·~1500 HV)", xy=(0.35, 0.55), xytext=(0.02, 1.06), fontsize=8.2, color="#39424e",
                arrowprops=dict(arrowstyle="->", color="#39424e", lw=0.9))
    ax.annotate("Co 결합상(binder) — 인성 담당", xy=(0.68, 0.32), xytext=(0.56, -0.1), fontsize=8.2, color="#8a6d1d",
                arrowprops=dict(arrowstyle="->", color="#8a6d1d", lw=0.9))
    ax.set_title("초경합금 (WC-Co cemented carbide)", fontsize=10.5, color=C_AX, fontweight="bold", pad=22)
    for ax in axes:
        ax.set_xlim(-0.01, 1.01); ax.set_ylim(-0.16, 1.18); ax.set_aspect("equal"); ax.axis("off")
    fig.subplots_adjust(left=0.02, right=0.98, top=0.86, bottom=0.02, wspace=0.10)
    save(fig, "carbide-micro")


def fig_gp_zones():
    """석출경화 v2 — 4단계 조직 + 경도 곡선 매핑 + 전단↔우회 전환 (Figure Quality v2)."""
    fig = plt.figure(figsize=(10.2, 5.8))
    gs = fig.add_gridspec(2, 4, height_ratios=[1.15, 1], hspace=0.3, wspace=0.08)
    axes = [fig.add_subplot(gs[0, i]) for i in range(4)]
    axc = fig.add_subplot(gs[1, :])
    rng = np.random.RandomState(3)
    stages = [
        ("I. 과포화 고용체", 0, 0, False),
        ("II. GP존 (정합)", 60, 9, True),
        ("III. 중간 석출상 (반정합)", 20, 42, False),
        ("IV. 과시효 (비정합·조대)", 6, 150, False),
    ]
    for ax, (title, n, s, halo) in zip(axes, stages):
        ax.add_patch(Circle((0.5, 0.55), 0.42, facecolor="#eef1f4", edgecolor=C_AX, lw=1.4))
        if n:
            ang = rng.rand(n) * 2 * np.pi
            rad = np.sqrt(rng.rand(n)) * 0.36
            xs, ys = 0.5 + rad * np.cos(ang), 0.55 + rad * np.sin(ang)
            if halo:  # 정합 변형장(halo) — 격자 왜곡 표현
                ax.scatter(xs, ys, s=s * 6.5, c="none", edgecolors=C_M, linewidths=0.4, alpha=0.5)
            ax.scatter(xs, ys, s=s, c=C_M, edgecolors="none")
        if title.startswith("I."):
            gx, gy = np.meshgrid(np.linspace(0.24, 0.76, 6), np.linspace(0.3, 0.8, 6))
            ax.scatter(gx, gy, s=7, c="#9aa4ae")
            ax.text(0.5, 0.55, "", fontsize=1)
        ax.text(0.5, 0.02, title, ha="center", va="bottom", fontsize=8.4, color=C_AX, fontweight="bold")
        ax.set_xlim(0, 1); ax.set_ylim(-0.02, 1.03); ax.set_aspect("equal"); ax.axis("off")
    axes[1].annotate("정합 변형장 —\n전위가 '베어야' 통과", xy=(0.62, 0.75), xytext=(0.52, 1.06), fontsize=7.2, color=C_M,
                     arrowprops=dict(arrowstyle="->", color=C_M, lw=0.8), annotation_clip=False)
    # ── (하) 경도-시효시간 곡선 + 단계 매핑 ──
    lt = np.linspace(0, 6, 300)
    hard = 40 + 58 * np.exp(-((lt - 3.1) ** 2) / 1.6)
    axc.plot(lt, hard, color=C_A, lw=2.4)
    for x0, x1, lab in [(0, 0.8, "I"), (0.8, 2.6, "II"), (2.6, 4.0, "III"), (4.0, 6, "IV")]:
        axc.axvspan(x0, x1, color=C_MUTE, alpha=0.05)
        axc.text((x0 + x1) / 2, 34, lab, fontsize=9.5, color=C_AX, ha="center")
    axc.plot(3.1, 98.2, "o", color=C_M, ms=7)
    axc.annotate("최고경도 = 전단(cutting)↔우회(Orowan) 전환점", xy=(3.18, 98.5), xytext=(3.75, 103), fontsize=8.4,
                 color=C_M, arrowprops=dict(arrowstyle="->", color=C_M, lw=0.9))
    axc.text(1.35, 72, "미세·정합 → 전위가 자름\n(자를수록 강해짐)", fontsize=7.8, color=C_AX, ha="center")
    axc.text(5.0, 72, "조대·간격↑ → 전위가 우회\n(간격 클수록 약해짐)", fontsize=7.8, color=C_AX, ha="center")
    axc.set_xlabel("시효 시간 (log) →", fontsize=9.5, color=C_AX)
    axc.set_ylabel("경도", fontsize=9.5, color=C_AX)
    axc.set_xlim(0, 6); axc.set_ylim(30, 108)
    axc.set_xticks([]); axc.set_yticks([])
    axc.spines[["top", "right"]].set_visible(False)
    fig.suptitle("석출경화의 진행 — 조직(위)과 경도(아래)의 대응 (개략)", fontsize=11.5, color=C_AX, y=0.99)
    fig.subplots_adjust(left=0.05, right=0.98, top=0.88, bottom=0.09)
    save(fig, "gp-zones")


def fig_galvanic_cell():
    """갈바닉 부식 v2 — 전지 반응 + 갈바닉 계열 스케일 + 면적비 경고 (Figure Quality v2)."""
    fig, (ax, axs) = plt.subplots(1, 2, figsize=(9.8, 4.9), gridspec_kw={"width_ratios": [2.1, 1]})
    # ── (좌) 전지 ──
    ax.add_patch(Rectangle((0.5, 0.3), 9, 2.9, facecolor="#dce8f2", edgecolor=C_A, lw=1))
    ax.text(5.0, 0.55, "전해질 (해수 등 — 이온 통로)", ha="center", fontsize=9, color=C_A)
    # 양극(용해로 거칠어진 윤곽)
    ax.add_patch(Polygon([(1.6, 1.3), (3.1, 1.3), (3.05, 1.8), (3.12, 2.3), (3.0, 2.8), (3.1, 3.3), (3.1, 3.7), (1.6, 3.7)],
                         facecolor="#b6bac0", edgecolor=C_M, lw=2.2))
    ax.text(2.35, 4.06, "양극 (활성) — 가속 부식", ha="center", fontsize=9.2, color=C_M, fontweight="bold")
    ax.text(2.35, 1.05, "예: 알루미늄·아연", ha="center", fontsize=7.6, color=C_M)
    ax.add_patch(Rectangle((6.9, 1.3), 1.5, 2.4, facecolor="#cdd0d5", edgecolor=C_A, lw=2.2))
    ax.text(7.65, 4.06, "음극 (귀함) — 보호됨", ha="center", fontsize=9.2, color=C_A, fontweight="bold")
    ax.text(7.65, 1.05, "예: 구리·SS·흑연", ha="center", fontsize=7.6, color=C_A)
    # 도선 + 전자 방향 (연결점을 라벨 밖 가장자리로)
    ax.plot([1.75, 1.75, 8.25, 8.25], [3.7, 4.55, 4.55, 3.7], color=C_AX, lw=1.6)
    ax.annotate("", xy=(6.1, 4.55), xytext=(3.9, 4.55), arrowprops=dict(arrowstyle="-|>", color=C_AX, lw=1.4))
    ax.text(5.0, 4.72, "$e^-$ 전자: 양극 → 음극", ha="center", fontsize=9, color=C_AX)
    # 반응식
    ax.annotate("$\\mathrm{M \\to M^{n+} + ne^-}$ (용해)", xy=(3.15, 2.5), xytext=(4.55, 2.75), fontsize=8.6, color=C_M,
                va="center", arrowprops=dict(arrowstyle="<-", color=C_M, lw=1.1))
    ax.text(5.5, 1.85, "$\\mathrm{O_2+2H_2O+4e^- \\to 4OH^-}$", fontsize=8.4, color=C_A, ha="center")
    ax.annotate("", xy=(6.85, 2.2), xytext=(6.2, 2.0), arrowprops=dict(arrowstyle="->", color=C_A, lw=0.9))
    # 이온 전류(전해질 내)
    ax.annotate("", xy=(6.6, 0.85), xytext=(3.4, 0.85), arrowprops=dict(arrowstyle="-|>", color=C_A, lw=1.0, ls=":"))
    ax.text(5.0, 0.98, "이온 이동", fontsize=7.4, color=C_A, ha="center")
    ax.text(5.0, -0.12, "면적비 경고: 작은 양극 + 큰 음극 = 최악 (예: 강판의 SS 볼트는 안전, SS 판의 강 볼트는 위험)",
            ha="center", fontsize=8.0, color=C_M)
    ax.set_xlim(0, 10); ax.set_ylim(-0.4, 5.1); ax.axis("off")
    # ── (우) 갈바닉 계열(해수 기준 개략) ──
    series = [("Mg", 1.00), ("Zn", 0.88), ("Al 합금", 0.76), ("탄소강", 0.62), ("주철", 0.55),
              ("황동", 0.42), ("구리", 0.35), ("316 SS(부동태)", 0.22), ("티타늄", 0.12), ("흑연", 0.03)]
    for i, (name, y) in enumerate(series):
        col = C_M if y > 0.6 else (C_G if y > 0.3 else C_A)
        axs.plot([0.32, 0.42], [y, y], color=col, lw=2.4)
        axs.text(0.46, y, name, fontsize=7.8, color=col, va="center")
    axs.annotate("", xy=(0.25, 0.02), xytext=(0.25, 1.0), arrowprops=dict(arrowstyle="-|>", color=C_AX, lw=1.2))
    axs.text(0.14, 0.99, "활성\n(양극 됨)", fontsize=7.6, color=C_M, ha="center", va="top")
    axs.text(0.14, 0.05, "귀함\n(음극 됨)", fontsize=7.6, color=C_A, ha="center", va="bottom")
    axs.text(0.5, -0.115, "계열에서 멀리 떨어진\n조합일수록 위험", fontsize=7.8, color=C_MUTE, ha="center")
    axs.set_xlim(0, 1); axs.set_ylim(-0.2, 1.1); axs.axis("off")
    axs.set_title("갈바닉 계열 (해수, 개략)", fontsize=9.5, color=C_AX, fontweight="bold")
    fig.suptitle("갈바닉 부식 (galvanic corrosion) — 이종 금속 접촉 전지 (개략)", fontsize=11.5, color=C_AX, y=0.99)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.86, bottom=0.06, wspace=0.05)
    save(fig, "galvanic-cell")


def fig_sensitization():
    """예민화 v2 — 입계 탄화물 + Cr 농도 프로파일(12% 부동태선) + 온도창 (Figure Quality v2)."""
    fig = plt.figure(figsize=(9.4, 5.4))
    gs = fig.add_gridspec(2, 1, height_ratios=[1.5, 1], hspace=0.32)
    ax = fig.add_subplot(gs[0])
    axp = fig.add_subplot(gs[1])
    # ── (상) 조직: 두 결정립 + 입계 탄화물 + 결핍띠 ──
    ax.add_patch(Rectangle((0.5, 0.5), 4.3, 3.0, facecolor="#e8ecf0", edgecolor=C_AX, lw=1.2))
    ax.add_patch(Rectangle((5.2, 0.5), 4.3, 3.0, facecolor="#e8ecf0", edgecolor=C_AX, lw=1.2))
    ax.text(2.0, 1.9, "결정립 A\n(Cr 18% — 부동태 유지)", ha="center", color=C_AX, fontsize=8.6)
    ax.text(8.0, 1.9, "결정립 B", ha="center", color=C_AX, fontsize=8.6)
    ax.add_patch(Rectangle((4.5, 0.5), 1.0, 3.0, facecolor=C_M, alpha=0.14))
    ax.plot([5.0, 5.0], [0.5, 3.5], color=C_AX, lw=2)
    for y in [0.9, 1.55, 2.2, 2.85]:
        ax.add_patch(Circle((5.0, y), 0.14, facecolor="#111", edgecolor="none"))
    ax.annotate("$\\mathrm{Cr_{23}C_6}$ 입계 석출\n(500~800 °C 노출 — 용접 HAZ·서랭)", xy=(5.05, 2.85), xytext=(6.1, 3.95),
                fontsize=8.4, color=C_AX, ha="left", arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    ax.annotate("Cr 결핍띠 → 부동태 상실\n= 입계부식·IGSCC 통로", xy=(4.6, 1.2), xytext=(0.55, 3.95), fontsize=8.4,
                color=C_M, ha="left", arrowprops=dict(arrowstyle="->", color=C_M, lw=0.9))
    ax.set_xlim(0, 10); ax.set_ylim(0.3, 4.6); ax.axis("off")
    # ── (하) Cr 농도 프로파일 (입계 가로지름) ──
    x = np.linspace(-1, 1, 400)
    cr = 18 - 8.5 * np.exp(-(x / 0.18) ** 2)
    axp.plot(x, cr, color=C_AX, lw=2.0)
    axp.axhline(12, color=C_M, lw=1.2, ls="--")
    axp.text(0.98, 12.4, "부동태 한계 ~12% Cr", fontsize=7.8, color=C_M, ha="right")
    mask = cr < 12
    axp.fill_between(x, cr, 12, where=mask, color=C_M, alpha=0.18)
    axp.annotate("입계 부근만 12% 아래로 —\n여기만 선택적으로 부식", xy=(0.1, 10.2), xytext=(0.42, 14.6), fontsize=7.8,
                 color=C_M, arrowprops=dict(arrowstyle="->", color=C_M, lw=0.9))
    axp.axvline(0, color=C_AX, lw=0.8, ls=":")
    axp.text(0.02, 18.6, "입계", fontsize=7.4, color=C_AX)
    axp.set_xlabel("입계로부터의 거리 →", fontsize=9, color=C_AX)
    axp.set_ylabel("Cr (%)", fontsize=9, color=C_AX)
    axp.set_xlim(-1, 1); axp.set_ylim(8, 20)
    axp.set_xticks([]); axp.tick_params(labelsize=7.5, colors=C_AX)
    axp.spines[["top", "right"]].set_visible(False)
    fig.suptitle("예민화 (sensitization) — 입계 크로뮴 탄화물이 만드는 방어선의 구멍 (개략)", fontsize=11.5, color=C_AX, y=0.98)
    fig.subplots_adjust(left=0.09, right=0.97, top=0.88, bottom=0.1)
    save(fig, "sensitization")


def fig_case_hardening():
    """표면경화 — 표면부터 깊이에 따른 경도(침탄·질화·심부) 개략."""
    fig, ax = plt.subplots(figsize=(7.4, 4.6))
    d = np.linspace(0, 2.0, 300)
    core = 300.0
    # 침탄: 두꺼운 경화층(~1mm), 완만한 천이
    carb = core + (720 - core) / (1 + np.exp((d - 0.9) / 0.12))
    # 질화: 얇고 매우 단단한 층(~0.3mm), 급한 천이
    nitr = core + (1050 - core) / (1 + np.exp((d - 0.32) / 0.05))
    ax.plot(d, nitr, color=C_M, lw=2.4, label="질화 (얇고 매우 단단)")
    ax.plot(d, carb, color=C_A, lw=2.4, label="침탄 (두꺼운 경화층)")
    ax.axhline(core, color=C_MUTE, lw=1.2, ls="--")
    ax.text(1.6, core + 22, "심부(core) — 연하고 인성 유지", color=C_MUTE, fontsize=8.6, ha="center")
    # 유효경화깊이(550HV 등가) 표시
    ax.axhline(550, color=C_AX, lw=0.8, ls=":")
    ax.text(1.97, 565, "경화깊이 기준", color=C_AX, fontsize=7.6, ha="right")
    ax.annotate("질화층", xy=(0.16, 1000), xytext=(0.42, 980), color=C_M, fontsize=9,
                arrowprops=dict(arrowstyle="->", color=C_M, lw=0.9))
    ax.annotate("침탄 경화층", xy=(0.55, 700), xytext=(0.72, 780), color=C_A, fontsize=9,
                arrowprops=dict(arrowstyle="->", color=C_A, lw=0.9))
    ax.set_xlabel("표면으로부터의 깊이 (mm) →", fontsize=11, color=C_AX)
    ax.set_ylabel("경도 (HV)", fontsize=11, color=C_AX)
    ax.set_xlim(0, 2.0); ax.set_ylim(250, 1150)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    ax.set_title("표면경화 — 단단한 표면 + 인성 있는 심부 (개략)", fontsize=11, color=C_AX, pad=8)
    save(fig, "case-hardening")


def fig_ferrite_micro():
    """페라이트 전용 조직도 — 저탄소강의 등축 BCC 다각립 + 소량 펄라이트 (Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(6.8, 4.6))
    rng = np.random.RandomState(14)
    grains = _poly_grains(ax, n=14, bbox=(0, 0, 1.45, 1.0), color="#f2f4f6", edge=C_AX, lw=1.3, seed=51)
    # 저탄소강: 일부 립만 펄라이트(어두운 층상)
    pearl_idx = rng.choice(len(grains), size=max(2, len(grains) // 6), replace=False)
    for i in pearl_idx:
        patch, verts = grains[i]
        _lamellae_in(ax, patch, verts, rng.uniform(0, 180), spacing=0.03, color="#3a3a3a", lw=1.4)
    plain = max((g for j, g in enumerate(grains) if j not in set(int(x) for x in pearl_idx)),
                key=lambda g: g[1][:, 0].mean())
    ax.annotate("등축 페라이트 립 (BCC α)\n— 연하고(~90 HV) 연성·강자성", xy=(plain[1][:, 0].mean(), plain[1][:, 1].mean()),
                xytext=(1.52, 0.72), fontsize=8.4, color=C_A, va="center",
                arrowprops=dict(arrowstyle="->", color=C_A, lw=1.0))
    pp = grains[pearl_idx[0]]
    ax.annotate("소량의 펄라이트\n(탄소 0.1~0.2% 몫)", xy=(pp[1][:, 0].mean(), pp[1][:, 1].mean()),
                xytext=(1.52, 0.28), fontsize=8.4, color="#3a3a3a", va="center",
                arrowprops=dict(arrowstyle="->", color="#3a3a3a", lw=1.0))
    ax.set_xlim(-0.01, 2.2); ax.set_ylim(-0.03, 1.03); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("페라이트 조직 (개략) — 저탄소강(연강) 유형", fontsize=11, color=C_AX, pad=8)
    save(fig, "ferrite-micro")


def fig_hall_petch():
    """결정립 미세화 전용 — Hall–Petch 직선 + 조대/미세 조직 인셋 (Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(7.6, 5.0))
    d_inv = np.linspace(1, 8, 100)  # d^{-1/2} (mm^{-1/2})
    sy = 70 + 22 * d_inv
    ax.plot(d_inv, sy, color=C_A, lw=2.4)
    ax.set_xlabel("$d^{-1/2}$  (결정립이 작을수록 → 오른쪽)", fontsize=10, color=C_AX)
    ax.set_ylabel("항복강도 $\\sigma_y$ (MPa)", fontsize=10, color=C_AX)
    ax.text(4.5, 235, "$\\sigma_y = \\sigma_0 + k\\,d^{-1/2}$", fontsize=12, color=C_A, ha="center")
    ax.annotate("$\\sigma_0$ (단결정 한계)", xy=(1.05, 93), xytext=(1.7, 65), fontsize=8.5, color=C_MUTE,
                arrowprops=dict(arrowstyle="->", color=C_MUTE, lw=0.9))
    # 인셋 2: 조대(좌상, 선 위 여백) vs 미세(우하, 선 아래 여백) — 단위정사각 Voronoi 를 스케일(등방 형상 유지)
    from scipy.spatial import Voronoi
    for (x0, y0, n, seed, lab) in [(1.15, 190, 6, 61, "조대립 $d\\approx$0.1 mm (약함·인성↓)"),
                                    (5.35, 62, 24, 67, "미세립 $d\\approx$0.01 mm (강함·인성↑ — 유일한 동시 개선)")]:
        iw, ih = 1.7, 48
        ax.add_patch(Rectangle((x0, y0), iw, ih, facecolor="white", edgecolor=C_AX, lw=1.1, zorder=5))
        rng = np.random.RandomState(seed)
        pts = rng.rand(n, 2)
        far = np.array([[-3, -3], [-3, 4], [4, -3], [4, 4]])
        vor = Voronoi(np.vstack([pts, far]))
        for pr in vor.point_region[:n]:
            region = vor.regions[pr]
            if not region or -1 in region:
                continue
            v = _clip_poly_bbox(np.array([vor.vertices[i] for i in region]), 0, 0, 1, 1)
            if v is not None:
                sv = np.column_stack([x0 + v[:, 0] * iw, y0 + v[:, 1] * ih])
                ax.add_patch(Polygon(sv, facecolor="#eef1f4", edgecolor=C_AX, lw=0.7, zorder=6))
        ax.text(x0 + iw / 2, y0 - 6, lab, fontsize=7.4, color=C_AX, ha="center", va="top", zorder=6)
    ax.annotate("", xy=(5.9, 118), xytext=(3.0, 200), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.6))
    ax.text(4.62, 182, "결정립 미세화", fontsize=8.5, color=C_M, ha="center", rotation=-30)
    ax.set_xlim(0.8, 8.2); ax.set_ylim(45, 260)
    ax.set_xticks([]); ax.tick_params(labelsize=8, colors=C_AX)
    ax.spines[["top", "right"]].set_visible(False)
    ax.set_title("Hall–Petch 관계 — 결정립이 작을수록 강해진다 (개략)", fontsize=11.5, color=C_AX, pad=8)
    save(fig, "hall-petch")


def fig_cold_work_effects():
    """냉간가공 전용 — %CW 에 따른 강도↑·연성↓ + 연신 조직 인셋 (Figure Quality v2)."""
    from matplotlib.patches import Ellipse
    fig, ax = plt.subplots(figsize=(7.6, 5.0))
    cw = np.linspace(0, 60, 200)
    uts = 45 + 50 * (1 - np.exp(-cw / 22))
    el = 8 + 82 * np.exp(-cw / 13)
    ax.plot(cw, uts, color=C_M, lw=2.4)
    ax.plot(cw, el, color=C_A, lw=2.4)
    ax.text(46, 92, "강도·경도 ↑", fontsize=10, color=C_M, fontweight="bold")
    ax.text(46, 20, "연성(연신율) ↓", fontsize=10, color=C_A, fontweight="bold")
    ax.axvline(37, color=C_MUTE, lw=1.0, ls=":")
    ax.annotate("연성 고갈 → 균열 위험\n(중간 Annealing 으로 회복 후 재가공)", xy=(37, 15), xytext=(15, 30),
                fontsize=8.2, color=C_MUTE, arrowprops=dict(arrowstyle="->", color=C_MUTE, lw=0.9))
    # 조직 인셋: 0%CW 등축(좌상 — 곡선 위 여백) vs 50%CW 연신(우하 — 곡선 아래 여백)
    for (x0, y0, mode, lab, above) in [(2.5, 79, "eq", "0 %CW — 등축립", False),
                                        (44, 16, "el", "50 %CW — 연신립+전위↑", True)]:
        iw, ih = 14, 23
        ax.add_patch(Rectangle((x0, y0), iw, ih, facecolor="white", edgecolor=C_AX, lw=1.1, zorder=5))
        rng = np.random.RandomState(9 if mode == "eq" else 13)
        if mode == "eq":
            for _ in range(9):
                ax.add_patch(Circle((rng.uniform(x0 + 1.5, x0 + iw - 1.5), rng.uniform(y0 + 3, y0 + ih - 3)),
                                    rng.uniform(1.1, 1.9), facecolor="#eef1f4", edgecolor=C_AX, lw=0.7, zorder=6))
        else:
            for _ in range(9):
                ax.add_patch(Ellipse((rng.uniform(x0 + 2, x0 + iw - 2), rng.uniform(y0 + 3, y0 + ih - 3)),
                                     rng.uniform(5.5, 8.5), rng.uniform(1.0, 1.7), facecolor="#eef1f4",
                                     edgecolor=C_AX, lw=0.7, zorder=6))
        if above:
            ax.text(x0 + iw / 2, y0 + ih + 1.5, lab, fontsize=7.6, color=C_AX, ha="center", va="bottom", zorder=6)
        else:
            ax.text(x0 + iw / 2, y0 - 2.5, lab, fontsize=7.6, color=C_AX, ha="center", va="top", zorder=6)
    ax.set_xlabel("냉간가공률 %CW (단면 감소율) →", fontsize=10, color=C_AX)
    ax.set_ylabel("상대값", fontsize=10, color=C_AX)
    ax.set_xlim(0, 62); ax.set_ylim(0, 105)
    ax.set_yticks([]); ax.tick_params(labelsize=8, colors=C_AX)
    ax.spines[["top", "right"]].set_visible(False)
    ax.set_title("냉간가공의 효과 — 강해지는 대신 연성을 소모한다 (개략)", fontsize=11.5, color=C_AX, pad=8)
    save(fig, "cold-work-effects")


def fig_hot_cold_scale():
    """열간/온간/냉간 전용 — 상동온도(T/Tm) 척도와 재결정 경계 (Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(8.6, 4.6))
    # 온도 척도 바
    zones = [(0.0, 0.3, "#dfe9f4", "냉간가공 (cold work)"), (0.3, 0.6, "#efe6d0", "온간가공 (warm)"),
             (0.6, 1.0, "#f3ddd0", "열간가공 (hot work)")]
    for x0, x1, col, lab in zones:
        ax.add_patch(Rectangle((x0, 0.52), x1 - x0, 0.16, facecolor=col, edgecolor=C_AX, lw=1.2))
        ax.text((x0 + x1) / 2, 0.74, lab, fontsize=9.5, color=C_AX, ha="center", fontweight="bold")
    ax.axvline(0.4, ymin=0.35, ymax=0.62, color=C_M, lw=1.6, ls="--")
    ax.annotate("재결정온도 $\\approx 0.4\\,T_m$ (K)", xy=(0.4, 0.52), xytext=(0.32, 0.3), fontsize=9, color=C_M,
                arrowprops=dict(arrowstyle="->", color=C_M, lw=1.0))
    for x, t in [(0, "0"), (0.3, "0.3"), (0.6, "0.6"), (1.0, "$T_m$(융점)")]:
        ax.text(x, 0.47, t, fontsize=8.5, color=C_AX, ha="center", va="top")
    # 특징 비교(아래 2열)
    ax.text(0.15, 0.16, "가공경화 O — 강해짐\n치수·표면 정밀\n큰 가공력·연성 한계", fontsize=8.4, color=C_A, ha="center", linespacing=1.5)
    ax.text(0.8, 0.16, "동적 재결정 — 안 강해짐\n큰 변형 가능·주조조직 개선\n산화 스케일·치수 러프", fontsize=8.4, color=C_M, ha="center", linespacing=1.5)
    ax.annotate("", xy=(0.62, 0.2), xytext=(0.38, 0.2), arrowprops=dict(arrowstyle="<->", color=C_MUTE, lw=1.0))
    # 예: 강(Tm~1800K) 열간압연 ~1100°C, 납은 상온이 이미 열간!
    ax.text(0.5, 0.9, "예: 강의 열간압연 ~1100 °C · 납(Tm 600 K)은 상온이 이미 '열간' — 기준은 절대온도 비율", fontsize=8.4, color=C_MUTE, ha="center")
    ax.set_xlim(-0.04, 1.06); ax.set_ylim(0, 1.0); ax.axis("off")
    ax.set_title("냉간·온간·열간의 경계 — 상동온도 $T/T_m$ 이 정한다 (개략)", fontsize=11.5, color=C_AX, pad=6)
    save(fig, "hot-cold-scale")


def fig_annealing_cycle():
    """Annealing vs Normalizing 전용 — 온도-시간 사이클과 조직 결과 (Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(8.6, 5.0))
    t = np.linspace(0, 10, 400)
    # 공통 가열·유지 (A3 위 ~880°C), 이후 냉각 분기
    def cycle(cool_rate):
        T = np.where(t < 2, 20 + (880 - 20) * t / 2, 880.0)
        T = np.where(t > 4, 880 * np.exp(-cool_rate * (t - 4)) + 20, T)
        return T
    ax.plot(t, cycle(0.18), color=C_G, lw=2.4)   # 노냉(완전 annealing)
    ax.plot(t, cycle(0.55), color=C_A, lw=2.4)   # 공랭(normalizing)
    ax.axhline(727, color=C_M, lw=1.0, ls=":")
    ax.axhline(880, color=C_MUTE, lw=0.8, ls=":")
    ax.text(9.85, 745, "$A_1$ 727 °C", fontsize=8, color=C_M, ha="right")
    ax.text(9.85, 898, "오스테나이트화 ($A_3$+30~50 °C)", fontsize=8, color=C_MUTE, ha="right")
    ax.text(7.4, 560, "노냉(furnace cool)\n→ Annealing: 조대 펄라이트\n= 가장 연함·절삭 준비", fontsize=8.6, color=C_G)
    ax.text(2.6, 200, "공랭(air cool)\n→ Normalizing: 미세 펄라이트\n= 약간 강함·조직 균질", fontsize=8.6, color=C_A)
    ax.annotate("가열", xy=(1.0, 450), xytext=(0.25, 620), fontsize=8.5, color=C_AX,
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    ax.annotate("유지(균열)", xy=(3.0, 880), xytext=(2.4, 960), fontsize=8.5, color=C_AX,
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    ax.set_xlabel("시간 →", fontsize=10, color=C_AX)
    ax.set_ylabel("온도 (°C)", fontsize=10, color=C_AX)
    ax.set_xlim(0, 10); ax.set_ylim(0, 1020)
    ax.set_xticks([]); ax.tick_params(labelsize=8, colors=C_AX)
    ax.spines[["top", "right"]].set_visible(False)
    ax.set_title("Annealing vs Normalizing — 같은 가열, 다른 냉각, 다른 조직 (개략)", fontsize=11.5, color=C_AX, pad=8)
    save(fig, "annealing-cycle")


def fig_orowan():
    """분산강화 전용 — Orowan 우회 3단계 + 간격-강도 관계 (Figure Quality v2)."""
    fig, axes = plt.subplots(1, 3, figsize=(9.6, 3.6))
    P = [(0.35, 0.5), (0.65, 0.5)]
    r = 0.055
    for k, (ax, title) in enumerate(zip(axes, ["① 접근", "② 활처럼 휨 (bowing)", "③ 통과 — 루프를 남김"])):
        for (cx, cy) in P:
            ax.add_patch(Circle((cx, cy), r, facecolor=C_G, edgecolor=C_AX, lw=1.2, zorder=4))
        if k == 0:
            ax.plot([0.05, 0.95], [0.3, 0.3], color="#1f2933", lw=2.2)
            ax.annotate("", xy=(0.5, 0.41), xytext=(0.5, 0.31), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.4))
            ax.text(0.56, 0.35, "τ", fontsize=10, color=C_M)
        elif k == 1:
            xs = np.linspace(0.05, 0.95, 200)
            ys = np.full_like(xs, 0.5)
            mid = (xs > P[0][0] + r) & (xs < P[1][0] - r)
            ys[mid] = 0.5 + 0.16 * np.sin((xs[mid] - (P[0][0] + r)) / (P[1][0] - P[0][0] - 2 * r) * np.pi)
            left = xs <= P[0][0] + r
            right = xs >= P[1][0] - r
            ys[left] = 0.5 - 0.0
            ys[right] = 0.5 - 0.0
            ax.plot(xs, ys, color="#1f2933", lw=2.2)
            ax.annotate("간격 λ 가 좁을수록\n더 큰 응력이 필요", xy=(0.5, 0.68), xytext=(0.5, 0.88), fontsize=7.8,
                        color=C_M, ha="center", arrowprops=dict(arrowstyle="->", color=C_M, lw=0.8))
            ax.annotate("", xy=(P[1][0] - r - 0.01, 0.5), xytext=(P[0][0] + r + 0.01, 0.5),
                        arrowprops=dict(arrowstyle="<->", color=C_MUTE, lw=0.8))
            ax.text(0.5, 0.44, "λ", fontsize=9, color=C_MUTE, ha="center")
        else:
            ax.plot([0.05, 0.95], [0.72, 0.72], color="#1f2933", lw=2.2)
            for (cx, cy) in P:
                ax.add_patch(Circle((cx, cy), r + 0.03, facecolor="none", edgecolor="#1f2933", lw=1.3,
                                    ls=(0, (3, 2)), zorder=5))
            ax.text(0.5, 0.28, "입자 둘레에 전위 루프 잔류\n→ 다음 전위는 더 힘들어짐(강화 누적)", fontsize=7.6,
                    color=C_AX, ha="center")
        ax.set_title(title, fontsize=10, color=C_AX, fontweight="bold")
        ax.set_xlim(0, 1); ax.set_ylim(0.1, 1.0); ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("Orowan 우회 — 전위가 뚫지 못하는 입자를 지나는 법 ($\\Delta\\tau \\propto 1/\\lambda$)", fontsize=11.5, color=C_AX, y=1.0)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.8, bottom=0.03, wspace=0.08)
    save(fig, "orowan")


def fig_al_families():
    """알루미늄 계열 전용 — 시리즈별 σy 스펙트럼 바 + 강화방식 구분 (Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(8.8, 5.2))
    # (이름, σy MPa, 열처리형?, 주원소·강화)
    rows = [
        ("1100-O  (순Al 99%+)", 35, False, "전도·내식 — 가공경화만"),
        ("3003-H14  (+Mn)", 145, False, "일반 판재 — 가공경화"),
        ("5052-H32  (+Mg)", 195, False, "해양·용접 구조 — 고용+가공경화"),
        ("6061-T6  (+Mg·Si)", 276, True, "압출·범용 구조 — Mg₂Si 석출"),
        ("2024-T3  (+Cu)", 345, True, "항공 인장재 — Al₂CuMg 석출"),
        ("7075-T6  (+Zn·Mg·Cu)", 503, True, "항공 최고강도 — MgZn₂ 석출"),
    ]
    y = np.arange(len(rows))[::-1]
    for yi, (name, sy, ht, note) in zip(y, rows):
        col = C_M if ht else C_A
        ax.barh(yi, sy, height=0.55, color=col, alpha=0.75)
        ax.text(-12, yi, name, va="center", ha="right", fontsize=8.6, color=C_AX)
        if sy >= 160:
            ax.text(sy + 8, yi, f"{sy} MPa", va="center", fontsize=8.2, color=col)
            ax.text(sy / 2, yi, note, va="center", ha="center", fontsize=6.8, color="white")
        else:
            ax.text(sy + 8, yi, f"{sy} MPa — {note}", va="center", fontsize=7.6, color=col)
    ax.text(390, 5.32, "■ 열처리형(석출경화)", fontsize=8.6, color=C_M)
    ax.text(390, 4.86, "■ 비열처리형(가공·고용)", fontsize=8.6, color=C_A)
    ax.axvline(250, color=C_MUTE, lw=0.8, ls=":")
    ax.text(252, -0.62, "A36 구조강 σy(250)", fontsize=7.2, color=C_MUTE)
    ax.set_xlabel("항복강도 σy (MPa, 대표 temper)", fontsize=10, color=C_AX)
    ax.set_xlim(0, 585); ax.set_ylim(-0.8, 5.8)
    ax.set_yticks([]); ax.tick_params(labelsize=8, colors=C_AX)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.set_title("알루미늄 합금 계열 — 시리즈·강화방식·강도 스펙트럼 (개략)", fontsize=11.5, color=C_AX, pad=8)
    fig.subplots_adjust(left=0.24, right=0.97, top=0.9, bottom=0.12)
    save(fig, "al-families")


def fig_ti_families():
    """티타늄 계열 전용 — α↔β 스펙트럼과 대표 합금 위치 (Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(9.0, 4.6))
    # 스펙트럼 밴드
    segs = [(0, 0.28, "#dfe9f4", "α (알파)"), (0.28, 0.42, "#e8e3ee", "near-α"),
            (0.42, 0.72, "#eadfe5", "α+β"), (0.72, 1.0, "#f3ddd0", "β (베타)")]
    for x0, x1, col, lab in segs:
        ax.add_patch(Rectangle((x0, 0.5), x1 - x0, 0.14, facecolor=col, edgecolor=C_AX, lw=1.1))
        ax.text((x0 + x1) / 2, 0.69, lab, fontsize=9.5, color=C_AX, ha="center", fontweight="bold")
    ax.annotate("", xy=(1.02, 0.57), xytext=(-0.02, 0.57), arrowprops=dict(arrowstyle="->", color=C_MUTE, lw=0.8))
    ax.text(0.0, 0.435, "β 안정화 원소(V·Mo·Cr) 증가 →", fontsize=7.6, color=C_MUTE)
    # 대표 합금 마커(위/아래 지그재그 콜아웃)
    alloys = [
        (0.10, "CP-Ti (Gr1~4)", "내식·용접성 최고 — 화학 플랜트·판형 열교환기", True),
        (0.34, "Ti-3Al-2.5V (Gr9)", "관·자전거 프레임 — 냉간가공 가능", False),
        (0.55, "Ti-6Al-4V (Gr5/23)", "시장의 절반 — 항공·의료·AM 표준", True),
        (0.85, "Ti-5553·Beta-C", "고강도 단조(σy 1200+)·랜딩기어 — 열처리로 조절", False),
    ]
    for x, name, note, up in alloys:
        ax.plot(x, 0.57, "o", color=C_M, ms=7, zorder=5)
        ty = 0.88 if up else 0.24
        ax.annotate(f"{name}\n{note}", xy=(x, 0.615 if up else 0.525), xytext=(x, ty),
                    fontsize=7.8, color=C_AX, ha="center", va="center",
                    arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.8))
    # 특성 그래디언트 요약
    ax.text(0.02, 0.06, "← 용접성·내식·크리프(고온)", fontsize=8.2, color=C_A)
    ax.text(0.98, 0.06, "강도·경화능(열처리 반응) →", fontsize=8.2, color=C_M, ha="right")
    ax.set_xlim(-0.04, 1.04); ax.set_ylim(0, 1.0); ax.axis("off")
    ax.set_title("티타늄 합금 계열 — α↔β 스펙트럼 위의 지도 (개략)", fontsize=11.5, color=C_AX, pad=6)
    save(fig, "ti-families")


def fig_cast_iron_family():
    """주철 4계열 조직 — 회주철(편상흑연)·구상흑연·백주철(탄화물)·ADI(ausferrite). 전용 조직도."""
    fig, axes = plt.subplots(2, 2, figsize=(8.8, 7.4))
    rng = np.random.RandomState(21)
    # (1) 회주철 — 편상(flake) 흑연: 가늘고 구부러진 검은 조각들
    ax = axes[0, 0]
    ax.add_patch(Rectangle((0, 0), 1, 1, facecolor="#f2ede6", edgecolor=C_AX, lw=1.3))
    for _ in range(26):
        x0, y0 = rng.uniform(0.06, 0.94, 2)
        ang = rng.uniform(0, np.pi)
        ln = rng.uniform(0.08, 0.22)
        t = np.linspace(-ln / 2, ln / 2, 24)
        curv = rng.uniform(-2.5, 2.5)
        xs = x0 + t * np.cos(ang) - curv * t ** 2 * np.sin(ang)
        ys = y0 + t * np.sin(ang) + curv * t ** 2 * np.cos(ang)
        ax.plot(np.clip(xs, 0.02, 0.98), np.clip(ys, 0.02, 0.98), color="#1a1a1a", lw=2.4, solid_capstyle="round")
    ax.set_title("회주철 (gray iron)", fontsize=10, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, -0.05, "편상 흑연 — 균열처럼 작용해 취약, 감쇠·절삭성 우수", ha="center", fontsize=8, color=C_MUTE, transform=ax.transAxes)
    # (2) 구상흑연주철 — 둥근 흑연 nodule
    ax = axes[0, 1]
    ax.add_patch(Rectangle((0, 0), 1, 1, facecolor="#f2ede6", edgecolor=C_AX, lw=1.3))
    for _ in range(13):
        x0, y0 = rng.uniform(0.1, 0.9, 2)
        ax.add_patch(Circle((x0, y0), rng.uniform(0.035, 0.06), facecolor="#1a1a1a", edgecolor="none"))
    ax.set_title("구상흑연주철 (ductile iron)", fontsize=10, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, -0.05, "Mg 처리로 흑연이 구상 — 응력집중 해소, 연성 회복", ha="center", fontsize=8, color=C_MUTE, transform=ax.transAxes)
    # (3) 백주철 — 흑연 없음: 탄화물 기지(밝음) + 펄라이트 섬(어둠)
    ax = axes[1, 0]
    ax.add_patch(Rectangle((0, 0), 1, 1, facecolor="#f6f3ee", edgecolor=C_AX, lw=1.3))
    for _ in range(16):
        x0, y0 = rng.uniform(0.08, 0.92, 2)
        w0, h0 = rng.uniform(0.07, 0.16), rng.uniform(0.05, 0.1)
        blob = Polygon([(x0 + w0 * np.cos(a) * rng.uniform(0.7, 1.2), y0 + h0 * np.sin(a) * rng.uniform(0.7, 1.2))
                        for a in np.linspace(0, 2 * np.pi, 9)[:-1]],
                       facecolor="#4a4a4a", edgecolor="none", alpha=0.85)
        ax.add_patch(blob)
    ax.set_title("백주철 (white iron)", fontsize=10, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, -0.05, "흑연 없음 — $\\mathrm{Fe_3C/M_7C_3}$ 탄화물 기지(밝음)+펄라이트(어둠), 내마모·취성", ha="center", fontsize=7.6, color=C_MUTE, transform=ax.transAxes)
    # (4) ADI — 구상 흑연 + ausferrite(침상 페라이트) 기지
    ax = axes[1, 1]
    ax.add_patch(Rectangle((0, 0), 1, 1, facecolor="#f2ede6", edgecolor=C_AX, lw=1.3))
    for _ in range(240):
        x0, y0 = rng.uniform(0.03, 0.97, 2)
        ang = rng.uniform(0, np.pi)
        ln = rng.uniform(0.025, 0.06)
        ax.plot([x0 - ln * np.cos(ang), x0 + ln * np.cos(ang)], [y0 - ln * np.sin(ang), y0 + ln * np.sin(ang)],
                color="#2f6f8f", lw=1.0, alpha=0.55)
    for _ in range(10):
        x0, y0 = rng.uniform(0.12, 0.88, 2)
        ax.add_patch(Circle((x0, y0), rng.uniform(0.035, 0.055), facecolor="#1a1a1a", edgecolor="#f2ede6", lw=1.2))
    ax.set_title("ADI (austempered ductile iron)", fontsize=10, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, -0.05, "구상 흑연 + ausferrite(침상 페라이트+안정 γ) — 강급 강도", ha="center", fontsize=8, color=C_MUTE, transform=ax.transAxes)
    for ax in axes.ravel():
        ax.set_xlim(-0.01, 1.01); ax.set_ylim(-0.01, 1.01); ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("주철 가족 — 흑연·탄화물의 형태가 성질을 결정한다 (개략)", fontsize=11.5, color=C_AX, y=0.99)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.9, bottom=0.05, wspace=0.10, hspace=0.24)
    save(fig, "cast-iron-family")


def fig_forming_processes():
    """소성가공 4공정 v2 — 결정립 변화·유동선·치수 주석 포함 (Figure Quality v2)."""
    from matplotlib.patches import Ellipse
    fig, axes = plt.subplots(2, 2, figsize=(9.6, 7.0))
    rng = np.random.RandomState(2)
    BIL = "#d98f4a"; DIE = "#8a96a3"
    # ── (1) Rolling — 입측 등축립 → 출측 연신립 + 회전·t0/t1 ──
    ax = axes[0, 0]
    ax.add_patch(Rectangle((0.03, 0.42), 0.44, 0.2, facecolor="#d9dde2", edgecolor=C_AX, lw=1.2))   # 입측(두꺼움)
    ax.add_patch(Rectangle((0.53, 0.475), 0.44, 0.11, facecolor="#c9ccd2", edgecolor=C_AX, lw=1.2))  # 출측(얇음)
    ax.add_patch(Polygon([(0.47, 0.42), (0.53, 0.475), (0.53, 0.585), (0.47, 0.62)], facecolor="#d1d5da", edgecolor=C_AX, lw=1.0))
    # 결정립: 입측 등축 원 → 출측 납작 타원
    for _ in range(12):
        ax.add_patch(Circle((rng.uniform(0.06, 0.42), rng.uniform(0.455, 0.585)), 0.017, facecolor="none", edgecolor="#5a6572", lw=0.7))
    for _ in range(12):
        ax.add_patch(Ellipse((rng.uniform(0.57, 0.94), rng.uniform(0.505, 0.555)), 0.075, 0.014, facecolor="none", edgecolor="#5a6572", lw=0.7))
    # 롤 + 회전 화살표 (롤이 출측 판을 정확히 무는 위치)
    ax.add_patch(Circle((0.5, 0.74), 0.155, facecolor=DIE, edgecolor=C_AX, lw=1.5))
    ax.add_patch(Circle((0.5, 0.32), 0.155, facecolor=DIE, edgecolor=C_AX, lw=1.5))
    ax.add_patch(Circle((0.5, 0.74), 0.02, facecolor=C_AX)); ax.add_patch(Circle((0.5, 0.32), 0.02, facecolor=C_AX))
    for (cy, s) in [(0.74, 1), (0.32, -1)]:
        ax.annotate("", xy=(0.585, cy + 0.09 * s), xytext=(0.415, cy + 0.09 * s),
                    arrowprops=dict(arrowstyle="->", color="#222", lw=1.3, connectionstyle=f"arc3,rad={-0.6 * s}"))
    ax.annotate("", xy=(0.99, 0.53), xytext=(0.9, 0.53), arrowprops=dict(arrowstyle="-|>", color=C_A, lw=2))
    # 치수 주석 t0 → t1
    ax.annotate("", xy=(0.055, 0.42), xytext=(0.055, 0.62), arrowprops=dict(arrowstyle="<->", color=C_M, lw=0.9))
    ax.text(0.075, 0.665, "$t_0$", fontsize=9, color=C_M)
    ax.annotate("", xy=(0.945, 0.475), xytext=(0.945, 0.585), arrowprops=dict(arrowstyle="<->", color=C_M, lw=0.9))
    ax.text(0.9, 0.63, "$t_1$", fontsize=9, color=C_M)
    ax.text(0.5, 0.045, "등축립 → 압연 방향 연신립 (이방성 발생) · 열간은 재결정", ha="center", fontsize=7.8, color=C_MUTE)
    ax.set_title("압연 (Rolling)", fontsize=10.5, color=C_AX, fontweight="bold")
    # ── (2) Forging — 형단조 곡면 다이·플래시·grain flow ──
    ax = axes[0, 1]
    ax.add_patch(Polygon([(0.18, 0.88), (0.82, 0.88), (0.82, 0.66), (0.68, 0.66), (0.6, 0.58), (0.4, 0.58), (0.32, 0.66), (0.18, 0.66)],
                         facecolor=DIE, edgecolor=C_AX, lw=1.4))  # 상형(형상 파임)
    ax.add_patch(Polygon([(0.18, 0.1), (0.82, 0.1), (0.82, 0.32), (0.68, 0.32), (0.6, 0.4), (0.4, 0.4), (0.32, 0.32), (0.18, 0.32)],
                         facecolor=DIE, edgecolor=C_AX, lw=1.4))  # 하형
    ax.add_patch(Polygon([(0.32, 0.34), (0.4, 0.42), (0.6, 0.42), (0.68, 0.34), (0.78, 0.49), (0.68, 0.64),
                          (0.6, 0.56), (0.4, 0.56), (0.32, 0.64), (0.22, 0.49)],
                         facecolor=BIL, edgecolor=C_M, lw=1.3))  # 성형 소재
    # 플래시(분할면으로 삐져나온 잔탕)
    ax.add_patch(Rectangle((0.13, 0.465), 0.1, 0.05, facecolor=BIL, edgecolor=C_M, lw=0.9))
    ax.add_patch(Rectangle((0.77, 0.465), 0.1, 0.05, facecolor=BIL, edgecolor=C_M, lw=0.9))
    ax.annotate("플래시(flash)", xy=(0.875, 0.462), xytext=(1.01, 0.365), fontsize=7.6, color=C_M, ha="right",
                arrowprops=dict(arrowstyle="->", color=C_M, lw=0.8))
    # grain flow — 형상을 따라 흐르는 유동선
    tt = np.linspace(-1, 1, 60)
    for off in [-0.055, -0.02, 0.02, 0.055]:
        xs = 0.5 + tt * 0.21
        ys = 0.49 + off + 0.075 * np.sign(off) * (1 - tt ** 2) * (abs(off) / 0.055)
        ax.plot(xs, ys, color="#8a4a2a", lw=0.9, alpha=0.85)
    ax.annotate("", xy=(0.5, 0.9), xytext=(0.5, 1.0), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=2.6))
    ax.text(0.56, 0.95, "타격/가압", fontsize=8.2, color=C_M)
    ax.text(0.5, 0.02, "", ha="center", fontsize=1)
    ax.text(0.42, 0.02, "grain flow 가 형상을 따라 이어짐 → 피로에 강함", ha="center", fontsize=7.8, color=C_MUTE)
    ax.set_title("단조 (Forging)", fontsize=10.5, color=C_AX, fontweight="bold")
    # ── (3) Extrusion — 램·수렴 유동선·L형 단면 출력 ──
    ax = axes[1, 0]
    ax.add_patch(Rectangle((0.04, 0.3), 0.56, 0.4, facecolor="none", edgecolor=C_AX, lw=2))
    ax.add_patch(Rectangle((0.05, 0.32), 0.07, 0.36, facecolor="#5a6572", edgecolor=C_AX, lw=1.0))  # 램+패드
    ax.add_patch(Rectangle((0.12, 0.33), 0.47, 0.34, facecolor=BIL, edgecolor="none"))               # 빌릿
    ax.add_patch(Polygon([(0.59, 0.3), (0.59, 0.7), (0.72, 0.57), (0.72, 0.43)], facecolor=DIE, edgecolor=C_AX, lw=1.4))
    ax.add_patch(Rectangle((0.72, 0.455), 0.26, 0.09, facecolor=BIL, edgecolor=C_M, lw=1.0))         # 압출재
    # 수렴 유동선
    for y0 in [0.38, 0.45, 0.55, 0.62]:
        xs = np.linspace(0.15, 0.7, 40)
        ys = y0 + (0.5 - y0) * ((xs - 0.15) / 0.55) ** 2.2
        ax.plot(xs, ys, color="#8a4a2a", lw=0.85, alpha=0.85)
    ax.annotate("", xy=(0.05, 0.5), xytext=(-0.04, 0.5), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=2.4))
    ax.text(0.06, 0.745, "램(ram) — 가압 ~수백 MPa", fontsize=7.4, color=C_M)
    ax.annotate("", xy=(1.0, 0.5), xytext=(0.93, 0.5), arrowprops=dict(arrowstyle="-|>", color=C_A, lw=1.8))
    # 출력 단면 예시(L형 프로파일)
    ax.add_patch(Polygon([(0.8, 0.13), (0.97, 0.13), (0.97, 0.19), (0.87, 0.19), (0.87, 0.33), (0.8, 0.33)],
                         facecolor=BIL, edgecolor=C_M, lw=1.0))
    ax.text(0.885, 0.055, "복잡 단면 가능", fontsize=7.4, color=C_MUTE, ha="center")
    ax.text(0.34, 0.16, "유동선이 다이로 수렴 —\n압출비 10~100 (Al 400~500 °C)", fontsize=7.6, color=C_MUTE, ha="center")
    ax.set_title("압출 (Extrusion)", fontsize=10.5, color=C_AX, fontweight="bold")
    # ── (4) Drawing — 다이 반단면·각도·d0→d1·인발력 ──
    ax = axes[1, 1]
    ax.add_patch(Polygon([(0.34, 0.86), (0.58, 0.63), (0.58, 0.555), (0.34, 0.555)], facecolor=DIE, edgecolor=C_AX, lw=1.3))
    ax.add_patch(Polygon([(0.34, 0.14), (0.58, 0.37), (0.58, 0.445), (0.34, 0.445)], facecolor=DIE, edgecolor=C_AX, lw=1.3))
    ax.add_patch(Rectangle((0.02, 0.4), 0.34, 0.2, facecolor=BIL, edgecolor="none"))                 # 굵은 입측 d0
    ax.add_patch(Polygon([(0.36, 0.4), (0.58, 0.455), (0.58, 0.545), (0.36, 0.6)], facecolor=BIL, edgecolor="none"))
    ax.add_patch(Rectangle((0.58, 0.455), 0.4, 0.09, facecolor=BIL, edgecolor=C_M, lw=1.0))          # 가는 출측 d1
    # 다이 각도 α
    ax.plot([0.34, 0.62], [0.5, 0.5], color=C_AX, lw=0.6, ls=":")
    ax.annotate("반각 $\\alpha \\approx$ 6~10°", xy=(0.47, 0.55), xytext=(0.36, 0.73), fontsize=7.6, color=C_AX,
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.8))
    # 치수
    ax.annotate("", xy=(0.05, 0.4), xytext=(0.05, 0.6), arrowprops=dict(arrowstyle="<->", color=C_M, lw=0.9))
    ax.text(0.075, 0.65, "$d_0$", fontsize=9, color=C_M)
    ax.annotate("", xy=(0.93, 0.455), xytext=(0.93, 0.545), arrowprops=dict(arrowstyle="<->", color=C_M, lw=0.9))
    ax.text(0.885, 0.6, "$d_1$", fontsize=9, color=C_M)
    ax.annotate("", xy=(1.0, 0.5), xytext=(0.955, 0.5), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=2.2))
    ax.text(0.975, 0.41, "F", fontsize=9.5, color=C_M, fontweight="bold", ha="center")
    ax.text(0.2, 0.335, "윤활 필수", fontsize=7.4, color=C_MUTE, ha="center")
    ax.text(0.5, 0.06, "패스당 단면감소 20~45% · 가공경화 누적 → 중간 Annealing", ha="center", fontsize=7.8, color=C_MUTE)
    ax.set_title("인발 (Drawing)", fontsize=10.5, color=C_AX, fontweight="bold")
    for ax in axes.ravel():
        ax.set_xlim(-0.06, 1.02); ax.set_ylim(0, 1.02); ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("소성가공 4대 공정 (개략) — 힘·유동·조직 변화", fontsize=11.5, color=C_AX, y=0.99)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.92, bottom=0.02, wspace=0.06, hspace=0.14)
    save(fig, "forming-processes")


def fig_casting_process():
    """주조 v2 — 사형 단면(레이들·코어·수축관) + 응고 조직 인셋 (Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(9.6, 5.4))
    rng = np.random.RandomState(6)
    # ── 사형(모래) 본체 + 모래 텍스처(stipple) ──
    ax.add_patch(Rectangle((0.5, 0.4), 9, 4.2, facecolor="#d8cdb8", edgecolor=C_AX, lw=1.5))
    sx = rng.uniform(0.6, 9.4, 950); sy = rng.uniform(0.5, 4.5, 950)
    ax.scatter(sx, sy, s=1.1, c="#b9ab90", alpha=0.6, zorder=1)
    ax.plot([0.5, 9.5], [2.5, 2.5], color=C_AX, lw=1.0, ls=":", zorder=3)  # 분할면(parting line)
    ax.text(9.42, 2.62, "분할면", fontsize=7.2, color=C_AX, ha="right", zorder=6)
    ax.text(9.42, 4.38, "상형(cope)", fontsize=7.5, color="#6b5d43", ha="right", zorder=6)
    ax.text(9.42, 0.55, "하형(drag)", fontsize=7.5, color="#6b5d43", ha="right", zorder=6)
    # ── 쇳물 시스템 (온도 그라데이션: 탕구 뜨거움 → 말단 식음) ──
    HOT, MID = "#f2903a", "#e8a34e"
    ax.add_patch(Polygon([(1.7, 4.6), (2.5, 4.6), (2.25, 3.9), (1.95, 3.9)], facecolor=HOT, edgecolor=C_M, lw=1.2, zorder=4))
    ax.add_patch(Rectangle((1.95, 1.4), 0.3, 2.5, facecolor=HOT, edgecolor=C_M, lw=1.2, zorder=4))
    ax.add_patch(Rectangle((2.25, 1.4), 0.95, 0.55, facecolor=MID, edgecolor=C_M, lw=1.2, zorder=4))  # 러너
    ax.add_patch(Rectangle((3.2, 1.4), 3.6, 1.0, facecolor=MID, edgecolor=C_M, lw=1.4, zorder=4))     # 제품
    # 코어(모래 심) — 제품 속 구멍
    ax.add_patch(Circle((4.6, 1.9), 0.32, facecolor="#cdbfa2", edgecolor="#6b5d43", lw=1.2, zorder=5))
    ax.annotate("코어(core) — 구멍·중공부", xy=(4.6, 2.22), xytext=(3.15, 3.35), fontsize=7.8, color="#6b5d43", zorder=6,
                arrowprops=dict(arrowstyle="->", color="#6b5d43", lw=0.9))
    # 라이저 + 수축관(shrinkage pipe — 라이저가 수축을 흡수한 증거)
    ax.add_patch(Rectangle((5.7, 2.4), 0.7, 1.8, facecolor=MID, edgecolor=C_M, lw=1.2, zorder=4))
    ax.add_patch(Polygon([(5.82, 4.2), (6.28, 4.2), (6.05, 3.55)], facecolor="#d8cdb8", edgecolor=C_M, lw=1.0, zorder=5))
    ax.annotate("수축관(pipe) —\n라이저가 수축을 대신 흡수", xy=(6.05, 3.85), xytext=(7.15, 4.0), fontsize=7.8, color=C_M, zorder=6,
                va="center", arrowprops=dict(arrowstyle="->", color=C_M, lw=0.9))
    # 레이들(주입)
    ax.add_patch(Polygon([(0.85, 5.25), (1.75, 5.25), (1.55, 4.85), (1.05, 4.85)], facecolor="#8a96a3", edgecolor=C_AX, lw=1.2, zorder=6))
    ax.plot([1.62, 2.02], [4.92, 4.62], color=HOT, lw=3.0, zorder=6, solid_capstyle="round")
    ax.text(0.72, 5.42, "레이들 — 쇳물 주입 (주철 ~1400 °C · 주강 ~1600 °C)", fontsize=7.8, color=C_M, zorder=6)
    # 콜아웃
    ax.annotate("탕구(sprue)", xy=(2.1, 3.4), xytext=(0.62, 3.4), fontsize=8.2, color=C_AX, zorder=6,
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    ax.annotate("러너(runner)", xy=(2.7, 1.65), xytext=(0.62, 1.0), fontsize=7.8, color=C_AX, zorder=6,
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    ax.annotate("제품 캐비티", xy=(5.6, 1.55), xytext=(5.3, 0.62), fontsize=8.4, color=C_M, zorder=6,
                arrowprops=dict(arrowstyle="->", color=C_M, lw=1.0))
    ax.annotate("라이저(압탕) — 마지막에 응고하도록 설계", xy=(6.4, 3.1), xytext=(6.9, 2.35), fontsize=7.8, color=C_AX, zorder=6,
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    # ── 인셋: 응고 조직 (주형벽→중심: 칠층·주상정·등축정) ──
    ix, iy, iw, ih = 7.6, 0.55, 2.2, 1.35
    ax.add_patch(Rectangle((ix, iy), iw, ih, facecolor="white", edgecolor=C_AX, lw=1.2, zorder=7))
    ax.add_patch(Rectangle((ix, iy), 0.18, ih, facecolor="#9aa4ae", edgecolor="none", zorder=8))  # 주형벽
    # 칠층(미세 등축)
    for _ in range(40):
        ax.add_patch(Circle((rng.uniform(ix + 0.2, ix + 0.42), rng.uniform(iy + 0.06, iy + ih - 0.06)),
                            0.018, facecolor="#c9ccd2", edgecolor=C_AX, lw=0.3, zorder=8))
    # 주상정(길쭉)
    for k in range(5):
        y0 = iy + 0.12 + k * (ih - 0.24) / 4
        ax.add_patch(Polygon([(ix + 0.44, y0 - 0.07), (ix + 1.25, y0 - 0.045), (ix + 1.25, y0 + 0.045), (ix + 0.44, y0 + 0.07)],
                             facecolor="#dfe3e8", edgecolor=C_AX, lw=0.5, zorder=8))
    # 중심 등축정
    for _ in range(16):
        ax.add_patch(Circle((rng.uniform(ix + 1.3, ix + iw - 0.08), rng.uniform(iy + 0.1, iy + ih - 0.1)),
                            rng.uniform(0.035, 0.06), facecolor="#c9ccd2", edgecolor=C_AX, lw=0.4, zorder=8))
    ax.text(ix + iw / 2, iy + ih + 0.08, "응고 조직: 칠층→주상정→등축정", fontsize=7.2, color=C_AX, ha="center", zorder=8)
    ax.annotate("", xy=(ix - 0.05, iy + ih * 0.6), xytext=(6.85, 1.75), zorder=7,
                arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.8, ls=":"))
    ax.set_xlim(0, 10.2); ax.set_ylim(0.1, 5.75); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("사형 주조 단면 (개략) — 쇳물의 길과 응고의 설계", fontsize=11.5, color=C_AX, pad=6)
    save(fig, "casting-process")


def fig_sintering_stages():
    """소결 3단계 v2 — 크기분포 분말·실제 neck 필렛·수축 표시 + 밀도-시간 인셋 (Figure Quality v2)."""
    fig = plt.figure(figsize=(10.2, 4.6))
    gs = fig.add_gridspec(1, 4, width_ratios=[1, 1, 1, 0.85], wspace=0.32)
    axes = [fig.add_subplot(gs[0, i]) for i in range(3)]
    axc = fig.add_subplot(gs[0, 3])
    rng = np.random.RandomState(3)
    # 크기 분포 있는 분말(현실적) — 중심·반경
    P = [(0.30, 0.66, 0.15), (0.63, 0.73, 0.12), (0.48, 0.42, 0.16), (0.79, 0.44, 0.115),
         (0.24, 0.33, 0.115), (0.71, 0.16, 0.13), (0.41, 0.13, 0.10), (0.85, 0.72, 0.08)]
    # ① 분말 충전 (점 접촉)
    ax = axes[0]
    for (cx, cy, r) in P:
        ax.add_patch(Circle((cx, cy), r, facecolor="#cdd1d7", edgecolor=C_AX, lw=1.2))
        ax.add_patch(Circle((cx - r * 0.3, cy + r * 0.3), r * 0.35, facecolor="white", alpha=0.35, edgecolor="none"))  # 하이라이트(입체감)
    ax.text(0.5, -0.075, "① 점 접촉 — 상대밀도 ~60%", ha="center", fontsize=8.2, color=C_MUTE, transform=ax.transAxes)
    ax.set_title("분말 충전", fontsize=10, color=C_AX, fontweight="bold")
    # ② 목 성장 (실제 필렛: 접점 양쪽 오목 필렛 원)
    ax = axes[1]
    for (cx, cy, r) in P:
        ax.add_patch(Circle((cx, cy), r * 1.04, facecolor="#cdd1d7", edgecolor=C_AX, lw=1.2))
    for i in range(len(P)):
        for j in range(i + 1, len(P)):
            a = np.array(P[i][:2]); b = np.array(P[j][:2]); ra, rb = P[i][2], P[j][2]
            d = np.linalg.norm(b - a)
            if d < (ra + rb) * 1.18:
                u = (b - a) / d; perp = np.array([-u[1], u[0]])
                w = min(ra, rb) * 0.62
                # neck 몸통
                ax.add_patch(Polygon([a + perp * w, b + perp * w, b - perp * w, a - perp * w],
                                     facecolor="#cdd1d7", edgecolor="none", zorder=2))
                # 오목 필렛(작은 흰 원으로 표면장력 곡률 표현)
                mid = (a + b) / 2
                for s in (1, -1):
                    ax.add_patch(Circle(mid + perp * (w + 0.028) * s, 0.03, facecolor="white", edgecolor=C_AX, lw=0.7, zorder=3))
    ax.annotate("목(neck)", xy=(0.47, 0.56), xytext=(0.06, 0.9), fontsize=7.8, color=C_M,
                arrowprops=dict(arrowstyle="->", color=C_M, lw=0.9))
    ax.text(0.5, -0.075, "② 확산으로 목 성장 — 수축 시작", ha="center", fontsize=8.0, color=C_MUTE, transform=ax.transAxes)
    ax.set_title("목(neck) 성장 (융점의 0.7~0.9배)", fontsize=10, color=C_AX, fontweight="bold")
    # ③ 치밀화 — 다각립 + 삼중점 기공 + 수축 화살표
    ax = axes[2]
    grains = _poly_grains(ax, n=9, bbox=(0.1, 0.06, 0.8, 0.8), color="#cdd1d7", lw=1.2, seed=77)
    for (cx, cy) in [(0.38, 0.5), (0.64, 0.32), (0.56, 0.66), (0.3, 0.26)]:
        ax.add_patch(Circle((cx, cy), 0.02, facecolor="white", edgecolor=C_AX, lw=0.8, zorder=5))
    for (x, y, dx0, dy0) in [(0.5, 0.95, 0, -1), (0.5, 0.0, 0, 1), (0.02, 0.46, 1, 0), (0.98, 0.46, -1, 0)]:
        ax.annotate("", xy=(x + 0.055 * dx0, y + 0.055 * dy0), xytext=(x, y),
                    arrowprops=dict(arrowstyle="-|>", color=C_A, lw=1.4))
    ax.text(0.5, -0.075, "③ 결정립+잔류기공 — 상대밀도 92~98%", ha="center", fontsize=8.0, color=C_MUTE, transform=ax.transAxes)
    ax.set_title("치밀화 (수축)", fontsize=10, color=C_AX, fontweight="bold")
    for ax in axes:
        ax.set_xlim(0, 1); ax.set_ylim(-0.02, 0.95); ax.set_aspect("equal"); ax.axis("off")
    # ── 인셋: 상대밀도-시간 곡선 (3단계 매핑) ──
    t = np.linspace(0, 10, 200)
    rho = 60 + 38 * (1 - np.exp(-t / 2.6)) ** 1.4
    axc.plot(t, rho, color=C_A, lw=2.2)
    axc.axhline(100, color=C_MUTE, lw=0.8, ls=":")
    axc.text(9.8, 100.8, "100%", fontsize=7, color=C_MUTE, ha="right")
    for x0, x1, lab in [(0, 1.2, "①"), (1.2, 5.0, "②"), (5.0, 10, "③")]:
        axc.axvspan(x0, x1, color=C_MUTE, alpha=0.06)
        axc.text((x0 + x1) / 2, 63, lab, fontsize=9, color=C_AX, ha="center")
    axc.set_xlabel("소결 시간 →", fontsize=8.5, color=C_AX)
    axc.set_ylabel("상대밀도 (%)", fontsize=7.5, color=C_AX, labelpad=1)
    axc.set_xlim(0, 10); axc.set_ylim(55, 104)
    axc.set_xticks([]); axc.tick_params(labelsize=7, colors=C_AX)
    axc.spines[["top", "right"]].set_visible(False)
    axc.set_title("치밀화 곡선", fontsize=9, color=C_AX)
    fig.suptitle("소결(sintering) — 녹이지 않고 확산으로 붙인다 (개략)", fontsize=11.5, color=C_AX, y=1.0)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.82, bottom=0.14)
    save(fig, "sintering-stages")


def fig_stress_concentration_kt():
    """응력집중 — 구멍 주변 힘 흐름선과 국부 응력 피크 (Kt≈3)."""
    fig, ax = plt.subplots(figsize=(7.6, 4.6))
    # 판 + 중앙 구멍
    ax.add_patch(Rectangle((0.6, 0.5), 5.4, 3.6, facecolor="#eef1f4", edgecolor=C_AX, lw=1.4))
    hole = Circle((3.3, 2.3), 0.55, facecolor="white", edgecolor=C_M, lw=1.8)
    ax.add_patch(hole)
    # 힘 흐름선(streamlines) — 구멍을 피해 휘어짐 (중앙선 없음·구멍 비관통)
    yy0 = np.linspace(0.85, 3.75, 8)
    xx = np.linspace(0.65, 5.95, 160)
    for y0 in yy0:
        dy = y0 - 2.3
        ys = 2.3 + dy * (1 + 0.35 / ((xx - 3.3) ** 2 + dy ** 2 + 0.1))
        ys = np.clip(ys, 0.55, 4.05)
        ax.plot(xx, ys, color=C_A, lw=1.0, alpha=0.75)
    # 인장 화살표(양끝)
    for x, s in [(0.45, -1), (6.15, 1)]:
        for y in [1.2, 2.3, 3.4]:
            ax.annotate("", xy=(x + 0.38 * s, y), xytext=(x, y), arrowprops=dict(arrowstyle="-|>", color=C_AX, lw=1.6))
    ax.text(6.35, 4.0, "σ (원격응력)", fontsize=9, color=C_AX)
    # 오른쪽: 구멍 단면의 응력 분포 곡선
    ybar = np.linspace(2.85, 4.05, 80)
    dist = (ybar - 2.85) / 1.2
    sigma = 1 + 2 / (1 + 12 * dist ** 1.6)
    ax.plot(7.0 + sigma * 0.55, ybar, color=C_M, lw=2.0)
    ax.plot([7.0, 7.0], [2.85, 4.15], color=C_AX, lw=0.9)
    ax.plot([7.55, 7.55], [2.85, 4.15], color=C_MUTE, lw=0.8, ls=":")
    ax.text(7.55, 4.25, "σ (평균)", fontsize=7.8, color=C_MUTE, ha="center")
    ax.text(8.75, 2.95, "3σ !", fontsize=10, color=C_M, fontweight="bold")
    ax.annotate("구멍 가장자리에서 응력이\n3배로 집중 ($K_t \\approx 3$)", xy=(8.62, 2.9), xytext=(7.0, 1.3), fontsize=8.6, color=C_M,
                arrowprops=dict(arrowstyle="->", color=C_M, lw=1.0))
    ax.set_xlim(0, 9.6); ax.set_ylim(0.2, 4.6); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("응력집중 (stress concentration) — 힘의 흐름이 구멍을 비켜가며 몰린다", fontsize=11, color=C_AX, pad=6)
    save(fig, "stress-concentration-kt")


def fig_hardness_tests():
    """경도시험 3종 v2 — 단면+압흔 평면도+하중·식·적용범위 (Figure Quality v2)."""
    fig, axes = plt.subplots(1, 3, figsize=(10.2, 4.6))
    for ax in axes:
        ax.add_patch(Rectangle((0.05, 0.16), 0.9, 0.34, facecolor="#d5d9de", edgecolor=C_AX, lw=1.3))  # 시편
    # ── Brinell ──
    ax = axes[0]
    ax.add_patch(Circle((0.5, 0.66), 0.15, facecolor="#8a96a3", edgecolor=C_AX, lw=1.4))
    ax.text(0.5, 0.66, "Ø10", fontsize=7.5, color="white", ha="center", va="center")
    ax.add_patch(Polygon([(0.36, 0.5), (0.64, 0.5), (0.5, 0.435)], facecolor="white", edgecolor=C_AX, lw=1.0))
    ax.annotate("", xy=(0.5, 0.84), xytext=(0.5, 0.97), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=2))
    ax.text(0.56, 0.915, "3000 kgf", fontsize=7.6, color=C_M)
    # 평면도 인셋: 원형 압흔 + d
    ax.add_patch(Circle((0.24, 0.315), 0.075, facecolor="white", edgecolor=C_AX, lw=1.1))
    ax.annotate("", xy=(0.165, 0.315), xytext=(0.315, 0.315), arrowprops=dict(arrowstyle="<->", color=C_M, lw=0.8))
    ax.text(0.24, 0.21, "압흔 d 측정", fontsize=7.2, color=C_M, ha="center")
    ax.text(0.68, 0.37, "$HB=\\frac{2F}{\\pi D(D-\\sqrt{D^2-d^2})}$", fontsize=8.5, color=C_AX, ha="center")
    ax.text(0.5, 0.06, "범위 ~650 HB · 큰 압흔 = 거친 조직 평균(주물·모재)", ha="center", fontsize=7.4, color=C_MUTE)
    ax.set_title("Brinell (HB) — 구 압입", fontsize=10, color=C_AX, fontweight="bold")
    # ── Vickers ──
    ax = axes[1]
    ax.add_patch(Polygon([(0.4, 0.8), (0.6, 0.8), (0.5, 0.5)], facecolor="#8a96a3", edgecolor=C_AX, lw=1.4))
    ax.text(0.5, 0.86, "136°", fontsize=7.4, color=C_AX, ha="center")
    ax.add_patch(Polygon([(0.455, 0.5), (0.5, 0.525), (0.545, 0.5), (0.5, 0.45)], facecolor="white", edgecolor=C_AX, lw=1.0))
    ax.annotate("", xy=(0.5, 0.88), xytext=(0.5, 0.97), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=2))
    ax.text(0.56, 0.93, "1~120 kgf", fontsize=7.6, color=C_M)
    # 평면도: 마름모 압흔 + 대각선
    dx, dy0 = 0.24, 0.315
    ax.add_patch(Polygon([(dx, dy0 + 0.08), (dx + 0.08, dy0), (dx, dy0 - 0.08), (dx - 0.08, dy0)],
                         facecolor="white", edgecolor=C_AX, lw=1.1))
    ax.plot([dx - 0.08, dx + 0.08], [dy0, dy0], color=C_M, lw=0.7, ls=":")
    ax.plot([dx, dx], [dy0 - 0.08, dy0 + 0.08], color=C_M, lw=0.7, ls=":")
    ax.text(dx, 0.21, "대각선 $d_1{\\cdot}d_2$", fontsize=7.2, color=C_M, ha="center")
    ax.text(0.68, 0.37, "$HV=1.854\\,F/d^2$", fontsize=8.5, color=C_AX, ha="center")
    ax.text(0.5, 0.06, "전 경도역 한 척도 · 미세 압흔 = 얇은 층·상(相)별 측정", ha="center", fontsize=7.4, color=C_MUTE)
    ax.set_title("Vickers (HV) — 다이아몬드 피라미드", fontsize=10, color=C_AX, fontweight="bold")
    # ── Rockwell ──
    ax = axes[2]
    ax.add_patch(Polygon([(0.43, 0.8), (0.57, 0.8), (0.5, 0.5)], facecolor="#8a96a3", edgecolor=C_AX, lw=1.4))
    ax.text(0.61, 0.72, "120°\n다이아몬드 콘", fontsize=7.0, color=C_AX)
    ax.annotate("", xy=(0.5, 0.88), xytext=(0.5, 0.97), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=2))
    ax.text(0.56, 0.93, "150 kgf (HRC)", fontsize=7.6, color=C_M)
    # 깊이 직독: 기준선-압입 깊이 t
    ax.plot([0.35, 0.65], [0.5, 0.5], color=C_AX, lw=0.8, ls=":")
    ax.plot([0.44, 0.56], [0.44, 0.44], color=C_M, lw=1.2)
    ax.annotate("", xy=(0.68, 0.5), xytext=(0.68, 0.44), arrowprops=dict(arrowstyle="<->", color=C_M, lw=0.9))
    ax.annotate("깊이 t 직독 (다이얼/디지털)", xy=(0.68, 0.44), xytext=(0.72, 0.3), fontsize=7.2, color=C_M,
                arrowprops=dict(arrowstyle="->", color=C_M, lw=0.7))
    ax.text(0.24, 0.315, "HRC 20~70\nHRB(연질재)\nHRA(초경)", fontsize=7.2, color=C_AX, ha="center")
    ax.text(0.5, 0.06, "수 초 측정 = 현장·열처리 전수검사 표준", ha="center", fontsize=7.4, color=C_MUTE)
    ax.set_title("Rockwell (HRC 등) — 깊이 직독", fontsize=10, color=C_AX, fontweight="bold")
    for ax in axes:
        ax.set_xlim(0, 1); ax.set_ylim(0, 1.02); ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("경도시험 3종 (개략) — 압입자·하중·측정량·적용 범위", fontsize=11.5, color=C_AX, y=1.0)
    # 하단 공통: 환산 감각 바
    fig.text(0.5, 0.015, "환산 감각(강): 60 HRC $\\approx$ 700 HV · 40 HRC $\\approx$ 390 HV $\\approx$ 370 HB · 200 HB $\\approx$ 210 HV — 정밀 환산은 ASTM E140",
             ha="center", fontsize=7.8, color=C_AX)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.84, bottom=0.1, wspace=0.08)
    save(fig, "hardness-tests")


def fig_hip_densification():
    """HIP v2 — 장비 단면(압력용기·히터·부품) + 조직 전/후 + 조건·밀도 수치 (Figure Quality v2)."""
    fig = plt.figure(figsize=(10.2, 4.8))
    gs = fig.add_gridspec(1, 3, width_ratios=[1.0, 1, 1], wspace=0.12)
    axv = fig.add_subplot(gs[0, 0])
    ax1 = fig.add_subplot(gs[0, 1])
    ax2 = fig.add_subplot(gs[0, 2])
    rng = np.random.RandomState(8)
    # ── (좌) HIP 장비 단면 ──
    axv.add_patch(Rectangle((0.18, 0.06), 0.64, 0.88, facecolor="#aeb6bf", edgecolor=C_AX, lw=2.2))   # 압력용기(후육)
    axv.add_patch(Rectangle((0.26, 0.13), 0.48, 0.74, facecolor="#e8ebee", edgecolor=C_AX, lw=1.0))    # 내부(로)
    for y in np.linspace(0.18, 0.82, 8):                                                               # 히터 코일
        axv.add_patch(Circle((0.30, y), 0.017, facecolor=C_M, edgecolor="none"))
        axv.add_patch(Circle((0.70, y), 0.017, facecolor=C_M, edgecolor="none"))
    axv.add_patch(Polygon([(0.42, 0.32), (0.58, 0.32), (0.61, 0.5), (0.55, 0.66), (0.45, 0.66), (0.39, 0.5)],
                          facecolor="#c9a05a", edgecolor="#7a5f2a", lw=1.3))                            # 부품
    # Ar 가압 화살표(부품 향해 사방)
    for (x, y, dx0, dy0) in [(0.5, 0.8, 0, -1), (0.5, 0.2, 0, 1), (0.335, 0.5, 1, 0), (0.665, 0.5, -1, 0)]:
        axv.annotate("", xy=(x + 0.07 * dx0, y + 0.07 * dy0), xytext=(x, y),
                     arrowprops=dict(arrowstyle="-|>", color=C_A, lw=1.5))
    axv.annotate("가스 주입구 (Ar)", xy=(0.5, 0.945), xytext=(0.5, 1.04), fontsize=7.6, color=C_A, ha="center",
                 arrowprops=dict(arrowstyle="->", color=C_A, lw=0.9))
    axv.text(0.13, 0.5, "후육 압력용기", fontsize=7.4, color=C_AX, rotation=90, va="center")
    axv.annotate("히터", xy=(0.30, 0.75), xytext=(0.06, 0.86), fontsize=7.4, color=C_M,
                 arrowprops=dict(arrowstyle="->", color=C_M, lw=0.8))
    axv.text(0.5, -0.06, "Ar 100~200 MPa · 융점의 ~0.7배 (Ti-6-4: ~920 °C/100 MPa/2 h)",
             ha="center", fontsize=7.6, color=C_MUTE, transform=axv.transAxes)
    axv.set_title("HIP 장비 단면", fontsize=10.5, color=C_AX, fontweight="bold")
    axv.set_xlim(0, 1); axv.set_ylim(-0.02, 1.08); axv.set_aspect("equal"); axv.axis("off")
    # ── (중) HIP 전 조직 ──
    grains = _poly_grains(ax1, n=10, color="#e9e4da", lw=1.2, seed=83)
    pores = [(0.3, 0.62, 0.042), (0.55, 0.4, 0.03), (0.72, 0.7, 0.045), (0.45, 0.78, 0.024),
             (0.62, 0.18, 0.036), (0.2, 0.3, 0.028), (0.82, 0.42, 0.022)]
    for (cx, cy, r) in pores:
        ax1.add_patch(Circle((cx, cy), r, facecolor="#2a2a2a", edgecolor="none", zorder=5))
    # lack-of-fusion(판상 결함)도 하나
    ax1.add_patch(Ellipse := Polygon([(0.32, 0.13), (0.5, 0.16), (0.52, 0.135), (0.34, 0.105)],
                                     facecolor="#2a2a2a", edgecolor="none", zorder=5))
    ax1.annotate("구형 기공(가스)", xy=(0.72, 0.7), xytext=(0.72, 0.97), fontsize=7.4, color="#2a2a2a",
                 arrowprops=dict(arrowstyle="->", color="#2a2a2a", lw=0.8))
    ax1.annotate("판상 미융합(LoF)", xy=(0.42, 0.135), xytext=(0.6, 0.015), fontsize=7.4, color="#2a2a2a",
                 arrowprops=dict(arrowstyle="->", color="#2a2a2a", lw=0.8))
    ax1.set_title("HIP 전 — 상대밀도 ~99.5%", fontsize=10.5, color=C_M, fontweight="bold")
    ax1.text(0.5, -0.06, "AM·주조 기공 — 피로 균열 시작점", ha="center", fontsize=7.6, color=C_MUTE, transform=ax1.transAxes)
    ax1.set_xlim(-0.02, 1.02); ax1.set_ylim(-0.02, 1.02); ax1.set_aspect("equal"); ax1.axis("off")
    # ── (우) HIP 후 조직 — 기공 소멸(닫힌 흔적 없음) ──
    _poly_grains(ax2, n=10, color="#e9e4da", lw=1.2, seed=83)
    ax2.annotate("기공 확산 폐쇄 —\n흉터 없이 접합", xy=(0.55, 0.42), xytext=(0.62, 0.9), fontsize=7.6, color=C_A,
                 arrowprops=dict(arrowstyle="->", color=C_A, lw=0.9))
    ax2.set_title("HIP 후 — ~100% 치밀", fontsize=10.5, color=C_A, fontweight="bold")
    ax2.text(0.5, -0.06, "피로수명 회복 (단조재 수준 근접) · 표면 연결 기공은 예외", ha="center", fontsize=7.6, color=C_MUTE, transform=ax2.transAxes)
    ax2.set_xlim(-0.02, 1.02); ax2.set_ylim(-0.02, 1.02); ax2.set_aspect("equal"); ax2.axis("off")
    fig.suptitle("열간등방압소결 HIP (hot isostatic pressing) — 장비·조건·조직 변화 (개략)", fontsize=11.5, color=C_AX, y=1.0)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.84, bottom=0.1)
    save(fig, "hip-densification")


def fig_strengthening_mechanisms():
    """4대 강화기구 — 전위가 용질·결정립계·석출물·전위얽힘에 막힘(개략)."""
    fig, axes = plt.subplots(2, 2, figsize=(8.6, 7.0))
    for ax in axes.ravel():
        ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.set_aspect("equal"); ax.axis("off")
        ax.add_patch(Rectangle((0, 0), 1, 1, facecolor="#f6f7f9", edgecolor=C_AX, lw=1.2))

    # (A) 고용강화 — 격자 + 용질(대/소) + 전위선
    ax = axes[0, 0]
    gx, gy = np.meshgrid(np.linspace(0.1, 0.9, 8), np.linspace(0.12, 0.9, 8))
    ax.scatter(gx, gy, s=42, c="#b8c0cb", edgecolors="none", zorder=2)
    ax.scatter([0.32, 0.66, 0.5], [0.4, 0.66, 0.24], s=95, c=C_M, edgecolors="white", lw=0.6, zorder=3)  # 큰 용질
    ax.scatter([0.5, 0.24, 0.76], [0.55, 0.72, 0.42], s=20, c=C_A, edgecolors="white", lw=0.4, zorder=3)  # 작은 용질
    xx = np.linspace(0.08, 0.92, 100)
    ax.plot(xx, 0.5 + 0.05 * np.sin((xx - 0.08) * 14), color="#1f2933", lw=2.2, zorder=4)
    ax.text(0.12, 0.52, "⊥", fontsize=13, color="#1f2933", ha="center", va="center", zorder=5)
    ax.set_title("고용강화", fontsize=11, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, 0.02, "용질 원자의 격자 왜곡이 전위를 방해", ha="center", va="bottom", fontsize=8.3, color=C_MUTE)

    # (B) 결정립 미세화 — 입계에 전위 pile-up
    ax = axes[0, 1]
    ax.add_patch(Polygon([(0.52, 0), (0.6, 1), (1, 1), (1, 0)], facecolor="#efe3d2", edgecolor="none", zorder=1))
    ax.add_patch(Polygon([(0, 0), (0, 1), (0.6, 1), (0.52, 0)], facecolor="#dfe9f4", edgecolor="none", zorder=1))
    ax.plot([0.52, 0.6], [0, 1], color=C_AX, lw=2.4, zorder=3)  # 입계
    for i, y in enumerate([0.26, 0.42, 0.58, 0.74]):
        x = 0.5 - 0.055 - i * 0.085
        ax.text(x, y, "⊥", fontsize=13, color=C_M, ha="center", va="center", zorder=4)
    ax.annotate("", xy=(0.46, 0.5), xytext=(0.14, 0.5), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.4), zorder=4)
    ax.text(0.74, 0.5, "입계", fontsize=9, color=C_AX, rotation=90, va="center", ha="center")
    ax.set_title("결정립 미세화", fontsize=11, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, 0.02, "결정립계가 전위를 막음 (Hall–Petch)", ha="center", va="bottom", fontsize=8.3, color=C_MUTE)

    # (C) 석출·분산강화 — Orowan bowing + 잔류 루프
    ax = axes[1, 0]
    px = [0.2, 0.4, 0.6, 0.8]
    for x in px:
        ax.add_patch(Circle((x, 0.5), 0.045, facecolor=C_G, edgecolor=C_AX, lw=0.8, zorder=3))
    # 전위선: 입자 사이에서 위로 부풀며 통과
    seg = np.linspace(0.08, 0.92, 200)
    line = 0.5 + 0.11 * np.abs(np.sin((seg - 0.08) / (0.92 - 0.08) * np.pi * 4))
    ax.plot(seg, line, color="#1f2933", lw=2.2, zorder=4)
    for x in [0.3, 0.5]:  # 지나간 입자 둘레 잔류 루프
        ax.add_patch(Circle((x - 0.1, 0.5), 0.07, facecolor="none", edgecolor="#1f2933", lw=1.0, ls=(0, (3, 2)), zorder=2))
    ax.set_title("석출·분산강화", fontsize=11, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, 0.02, "전위가 입자를 우회 (Orowan 루프)", ha="center", va="bottom", fontsize=8.3, color=C_MUTE)

    # (D) 가공경화 — 전위 얽힘(밀도↑)
    ax = axes[1, 1]
    rng = np.random.RandomState(11)
    for _ in range(11):
        x0, y0 = rng.uniform(0.1, 0.9, 2)
        ang = rng.uniform(0, np.pi)
        t = np.linspace(-0.42, 0.42, 40)
        wob = 0.05 * np.sin(t * rng.uniform(6, 12) + rng.uniform(0, 3))
        xs = x0 + t * np.cos(ang) - wob * np.sin(ang)
        ys = y0 + t * np.sin(ang) + wob * np.cos(ang)
        ax.plot(np.clip(xs, 0.05, 0.95), np.clip(ys, 0.1, 0.94), color="#1f2933", lw=1.3, alpha=0.8, zorder=3)
    ax.set_title("가공경화", fontsize=11, color=C_AX, fontweight="bold", pad=3)
    ax.text(0.5, 0.02, "전위 밀도↑·서로 얽혀 이동 방해", ha="center", va="bottom", fontsize=8.3, color=C_MUTE)

    fig.suptitle("4대 강화기구 — 전위 이동을 막는 방법 (개략)", fontsize=12, color=C_AX, y=0.98)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.9, bottom=0.02, wspace=0.08, hspace=0.16)
    save(fig, "strengthening-mechanisms")


def fig_stainless_families():
    """스테인리스강 5계열 — Cr–Ni 조성 계통도(개략, Schaeffler 축약)."""
    from matplotlib.patches import Ellipse
    fig, ax = plt.subplots(figsize=(8.6, 5.6))
    C_D = "#3f8f6f"; C_P = "#7a5aa8"
    # 계열 영역(정성적 Cr–Ni 범위) — 반투명
    regions = [
        ((20.0, 14.5), 13.5, 18.0, 12, C_G, "오스테나이트계", (24.5, 20.5)),
        ((21.5, 1.0),  13.0, 3.4,  0,  C_A, "페라이트계",   (26.5, 2.8)),
        ((12.8, 1.2),  3.8,  3.8,  0,  C_M, "마르텐사이트계", (10.2, 4.2)),
        ((23.2, 5.6),  6.2,  4.2,  22, C_D, "듀플렉스",     (27.4, 7.2)),
        ((16.2, 5.2),  4.6,  5.6,  78, C_P, "석출경화(PH)", (13.0, 8.6)),
    ]
    for (cx, cy), w, h, ang, col, lab, lpos in regions:
        ax.add_patch(Ellipse((cx, cy), w, h, angle=ang, facecolor=col, alpha=0.15, edgecolor=col, lw=1.6))
        ax.text(*lpos, lab, color=col, fontsize=10.5, fontweight="bold", ha="center")
    # 대표 grade 점
    grades = [("304", 18, 8.2), ("316", 17.5, 12), ("310", 25, 20),
              ("430", 17, 0.4), ("446", 24, 0.4), ("410", 12.5, 0.4),
              ("2205", 22, 5.5), ("2507", 25, 7), ("17-4PH", 16.5, 4.5)]
    for name, cr, ni in grades:
        ax.plot(cr, ni, "o", color=C_AX, ms=5, zorder=5)
        ax.annotate(name, (cr, ni), textcoords="offset points", xytext=(5, 3),
                    fontsize=8, color=C_AX, zorder=5)
    ax.set_xlabel("크로뮴 Cr (wt %)  →  내식성", fontsize=11, color=C_AX)
    ax.set_ylabel("니켈 Ni (wt %)  →  오스테나이트 안정", fontsize=11, color=C_AX)
    ax.set_xlim(9, 30); ax.set_ylim(-1.5, 24)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    ax.set_title("스테인리스강 5계열 — Cr·Ni 조성 계통도 (개략)", fontsize=11.5, color=C_AX, pad=8)
    save(fig, "stainless-families")


def fig_superalloy_strength():
    """니켈초합금 vs 강 vs 알루미늄 — 온도에 따른 강도 유지(개략)."""
    fig, ax = plt.subplots(figsize=(7.2, 4.6))
    T = np.linspace(20, 1000, 300)
    # 상대강도(상온=100 기준). 초합금: γ' 로 고온까지 유지 후 급락
    ni = 100 / (1 + np.exp((T - 800) / 55)) + 6
    steel = 100 / (1 + np.exp((T - 480) / 90)) + 3
    al = 100 / (1 + np.exp((T - 190) / 55)) + 1
    ax.plot(T, ni, color=C_M, lw=2.4, label="니켈초합금")
    ax.plot(T, steel, color=C_A, lw=2.2, label="강(steel)")
    ax.plot(T, al, color=C_G, lw=2.2, label="알루미늄")
    ax.axvspan(650, 1000, color=C_M, alpha=0.06)
    ax.text(825, 88, "초합금\n사용역", color=C_M, fontsize=9, ha="center")
    ax.text(150, 20, "알루미늄\n(~200°C↑ 급락)", color=C_G, fontsize=8.6, ha="center")
    ax.text(430, 74, "강", color=C_A, fontsize=10, fontweight="bold")
    ax.text(720, 60, "니켈초합금", color=C_M, fontsize=10, fontweight="bold", ha="center")
    ax.set_xlabel("온도 (°C) →", fontsize=11, color=C_AX)
    ax.set_ylabel("상대 강도 (상온 = 100)", fontsize=11, color=C_AX)
    ax.set_xlim(20, 1000); ax.set_ylim(0, 112)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    save(fig, "superalloy-strength")


def fig_red_hardness():
    """고속도강 적열경도 — 온도에 따른 경도 유지(개략)."""
    fig, ax = plt.subplots(figsize=(7.2, 4.4))
    T = np.linspace(20, 700, 300)
    # 탄소공구강: ~200°C 부터 급락 / HSS: 2차경화로 ~550°C 까지 유지
    carbon = 64 / (1 + np.exp((T - 230) / 45)) + 3
    hss = 65 / (1 + np.exp((T - 560) / 35)) + 4 + 3 * np.exp(-((T - 520) / 60) ** 2)  # 2차경화 융기
    ax.plot(T, hss, color=C_M, lw=2.4)
    ax.plot(T, carbon, color=C_A, lw=2.2)
    ax.axvline(560, color=C_M, lw=1, ls="--")
    ax.text(566, 20, "적열경도 한계\n(~600°C)", color=C_M, fontsize=8.6, va="center")
    ax.text(120, 30, "탄소공구강\n(~200°C 연화)", color=C_A, fontsize=8.8, ha="center")
    ax.text(330, 63, "고속도강(HSS)", color=C_M, fontsize=10.5, fontweight="bold")
    ax.text(470, 55, "2차경화 융기", color=C_M, fontsize=8.2, ha="center")
    ax.set_xlabel("절삭날 온도 (°C) →", fontsize=11, color=C_AX)
    ax.set_ylabel("경도 (HRC)", fontsize=11, color=C_AX)
    ax.set_xlim(20, 700); ax.set_ylim(0, 72)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=C_AX, labelsize=9)
    save(fig, "red-hardness")


def fig_jominy():
    """경화능 전용 — Jominy 끝단 급랭 장치 + 거리-경도 곡선 3강종 (Figure Quality v2)."""
    fig, (axL, axR) = plt.subplots(1, 2, figsize=(9.8, 4.4), gridspec_kw={"width_ratios": [1, 1.55]})

    # (좌) 시험 장치 단면 — 봉 세워 놓고 아래 끝만 수분사
    axL.set_xlim(0, 10); axL.set_ylim(0, 10); axL.set_aspect("equal"); axL.axis("off")
    bar_x, bar_w, bar_y0, bar_y1 = 4.1, 1.8, 3.2, 9.0
    # 냉각 구배(아래=급랭 어두움 → 위=서랭 밝음)
    grad = np.linspace(0, 1, 60).reshape(-1, 1)
    axL.imshow(grad, extent=(bar_x, bar_x + bar_w, bar_y0, bar_y1), origin="lower",
               cmap="OrRd", alpha=0.85, aspect="auto", zorder=2)
    axL.add_patch(Rectangle((bar_x, bar_y0), bar_w, bar_y1 - bar_y0, facecolor="none",
                            edgecolor=C_AX, lw=1.6, zorder=3))
    # 지지 플랜지
    axL.plot([bar_x - 0.7, bar_x + bar_w + 0.7], [bar_y1, bar_y1], color=C_AX, lw=2.4)
    axL.text(bar_x + bar_w / 2, bar_y1 + 0.35, "Ø25 × 100 mm 시편 (오스테나이트화 직후)",
             ha="center", fontsize=8.2, color=C_AX)
    # 물 분사 노즐
    axL.add_patch(Rectangle((bar_x + bar_w / 2 - 0.28, 0.8), 0.56, 0.9, facecolor="#9fb7c9",
                            edgecolor=C_AX, lw=1.0))
    for dx in (-0.28, 0.0, 0.28):
        xs = np.full(24, bar_x + bar_w / 2 + dx * 0.6)
        ys = np.linspace(1.8, bar_y0 - 0.08, 24)
        axL.plot(xs + 0.06 * np.sin(ys * 7 + dx * 9), ys, color="#2f6fb0", lw=1.3, alpha=0.75, zorder=1)
    axL.text(bar_x + bar_w / 2, 0.12, "수분사 (끝단만 급랭)", ha="center", fontsize=8.4,
             color="#2f6fb0", fontweight="bold")
    # 냉각속도 스펙트럼 화살표
    axL.annotate("", xy=(bar_x - 0.85, bar_y1 - 0.2), xytext=(bar_x - 0.85, bar_y0 + 0.2),
                 arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.4))
    axL.text(bar_x - 1.15, (bar_y0 + bar_y1) / 2, "냉각속도\n급 → 완", ha="right", va="center",
             fontsize=8.2, color=C_M)
    # 경도 측정 방향
    axL.annotate("", xy=(bar_x + bar_w + 0.9, bar_y0 + 0.25), xytext=(bar_x + bar_w + 0.9, bar_y1 - 0.4),
                 arrowprops=dict(arrowstyle="-|>", color=C_AX, lw=1.1))
    axL.text(bar_x + bar_w + 1.15, (bar_y0 + bar_y1) / 2, "끝에서 거리별로\n경도 측정 →", ha="left",
             va="center", fontsize=8.0, color=C_AX)
    axL.set_title("Jominy 끝단 급랭 시험 (ASTM A255)", fontsize=10.5, color=C_AX, fontweight="bold")

    # (우) 거리-경도 곡선 — 같은 0.4%C, 다른 경화능
    d = np.linspace(0, 50, 300)
    def jcurve(h0, hmin, d50, k):
        return hmin + (h0 - hmin) / (1 + np.exp((d - d50) / k))
    h1045 = jcurve(57, 22, 6, 2.2)     # 얕은 경화 — 급락
    h4140 = jcurve(56, 30, 20, 5.0)    # 중간
    h4340 = jcurve(56, 38, 38, 7.0)    # 깊은 경화 — 완만
    axR.plot(d, h1045, color=C_A, lw=2.2, label="1045 (무합금)")
    axR.plot(d, h4140, color=C_G, lw=2.2, label="4140 (Cr-Mo)")
    axR.plot(d, h4340, color=C_M, lw=2.2, label="4340 (Ni-Cr-Mo)")
    axR.set_xlim(0, 50); axR.set_ylim(15, 65)
    axR.set_xlabel("급랭 끝단으로부터 거리 (mm)", fontsize=9)
    axR.set_ylabel("경도 (HRC)", fontsize=9)
    axR.tick_params(labelsize=8)
    axR.grid(alpha=0.25, lw=0.6)
    # 시작 경도 = 탄소 몫
    axR.annotate("시작 경도는 셋이 같다\n(탄소 ~0.4%가 결정)", xy=(1.2, 56.5), xytext=(13, 58.8),
                 fontsize=8.2, color=C_AX, va="center",
                 arrowprops=dict(arrowstyle="->", color=C_AX, lw=0.9))
    # 유지 깊이 = 합금 몫
    axR.annotate("", xy=(40, 41), xytext=(11, 26),
                 arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.2, ls=(0, (4, 2))))
    axR.text(27, 25.5, "곡선이 완만할수록 경화능↑\n(Mo·Cr·Ni·B 가 미는 것)", fontsize=8.2, color=C_M,
             ha="center")
    axR.legend(fontsize=8.2, loc="upper right", framealpha=0.9)
    axR.set_title("거리-경도 곡선 — 경화능의 지문", fontsize=10.5, color=C_AX, fontweight="bold")

    fig.suptitle("경화능 — 최고 경도(탄소)와 경화 깊이(합금)는 다른 능력이다", fontsize=11.5,
                 color=C_AX, y=1.02)
    fig.subplots_adjust(left=0.04, right=0.98, top=0.86, bottom=0.13, wspace=0.18)
    save(fig, "jominy")


def fig_bainite_upper_lower():
    """베이나이트 전용 — 온도 사다리 + 상부/하부 조직 대비 (탄화물 위치가 핵심, Figure Quality v2)."""
    fig = plt.figure(figsize=(9.8, 4.5))
    gs = fig.add_gridspec(1, 3, width_ratios=[0.5, 1, 1], wspace=0.24)
    axT = fig.add_subplot(gs[0]); axU = fig.add_subplot(gs[1]); axB = fig.add_subplot(gs[2])

    # (좌) 등온변태 온도 사다리
    axT.set_xlim(0, 1); axT.set_ylim(150, 650); axT.set_xticks([])
    axT.set_ylabel("등온변태 온도 (°C)", fontsize=9)
    axT.tick_params(labelsize=8)
    zones = [(550, 650, "#f4e8d7", "펄라이트"), (400, 550, "#f9dcc5", "상부\n베이나이트"),
             (250, 400, "#f5c6a8", "하부\n베이나이트"), (150, 250, "#eebdb8", "마르텐사이트\n(Ms 아래)")]
    for y0, y1, c, lab in zones:
        axT.add_patch(Rectangle((0, y0), 1, y1 - y0, facecolor=c, edgecolor=C_AX, lw=0.9))
        axT.text(0.5, (y0 + y1) / 2, lab, ha="center", va="center", fontsize=8.2, color=C_AX)
    axT.set_title("변태 온도역", fontsize=10, color=C_AX, fontweight="bold")

    # (중) 상부 베이나이트 — 라스 다발(sheaf) + 라스 '사이' 탄화물 필름
    rng = np.random.RandomState(11)
    for ax, upper in ((axU, True), (axB, False)):
        ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.set_aspect("equal"); ax.axis("off")
        ax.add_patch(Rectangle((0.02, 0.06), 0.96, 0.86, facecolor="#f7f3ee", edgecolor=C_AX, lw=1.4))
    # 상부: 3개 sheaf(평행 라스 묶음), 라스 경계에 길쭉한 시멘타이트 필름
    sheaves = [((0.08, 0.12, 0.42, 0.76), 62), ((0.52, 0.44, 0.44, 0.46), -48), ((0.30, 0.10, 0.55, 0.30), 8)]
    for (x0, y0, w, h), ang in sheaves:
        a = np.deg2rad(ang); dx, dy = np.cos(a), np.sin(a)
        cx, cy = x0 + w / 2, y0 + h / 2
        clip = Rectangle((x0, y0), w, h, facecolor="#efe6da", edgecolor=C_MUTE, lw=0.8)
        axU.add_patch(clip)
        diag = max(w, h) * 1.5
        for t in np.arange(-diag, diag, 0.052):
            px, py = cx - dy * t, cy + dx * t
            ln, = axU.plot([px - dx * diag, px + dx * diag], [py - dy * diag, py + dy * diag],
                           color=C_A, lw=1.1, alpha=0.55)
            ln.set_clip_path(clip)
            # 라스 사이 탄화물 필름(길쭉한 검은 조각)
            for s in rng.uniform(-diag * 0.5, diag * 0.5, 2):
                fx, fy = px + dx * s, py + dy * s
                seg, = axU.plot([fx - dx * 0.035, fx + dx * 0.035], [fy - dy * 0.035, fy + dy * 0.035],
                                color="#1f2933", lw=2.6, solid_capstyle="round")
                seg.set_clip_path(clip)
    axU.set_title("상부 베이나이트 (550~400 °C)", fontsize=10, color=C_G, fontweight="bold")
    axU.text(0.5, -0.02, "탄화물이 라스 ‘사이’에 필름형으로 —\n깃털(feathery) 모양 · 인성 불리", ha="center",
             va="top", fontsize=8.3, color=C_AX, transform=axU.transAxes)

    # (우) 하부 베이나이트 — 침상 판 + 판 '안' 미세 탄화물 점 (프레임에 클리핑)
    frameB = Rectangle((0.02, 0.06), 0.96, 0.86, facecolor="none", edgecolor="none")
    axB.add_patch(frameB)
    n_plates = 26
    for _ in range(n_plates):
        cx, cy = rng.uniform(0.14, 0.86), rng.uniform(0.18, 0.80)
        ang = np.deg2rad(rng.choice([55, 60, -55, -60]) + rng.uniform(-6, 6))
        L = rng.uniform(0.10, 0.17)
        dx, dy = np.cos(ang) * L, np.sin(ang) * L
        ln, = axB.plot([cx - dx, cx + dx], [cy - dy, cy + dy], color=C_A, lw=3.6, alpha=0.8,
                       solid_capstyle="round")
        ln.set_clip_path(frameB)
        # 판 내부 미세 탄화물(점) — 판 방향과 ~60° 로 정렬된 짧은 점열
        for f in np.linspace(-0.6, 0.6, 4):
            pt, = axB.plot(cx + dx * f, cy + dy * f, marker="o", ms=1.9, color="#1f2933", zorder=5)
            pt.set_clip_path(frameB)
    axB.set_title("하부 베이나이트 (400 °C~Ms)", fontsize=10, color=C_M, fontweight="bold")
    axB.text(0.5, -0.02, "탄화물이 판 ‘안’에 미세하게 —\n침상(acicular) · 강도+인성 우수", ha="center",
             va="top", fontsize=8.3, color=C_AX, transform=axB.transAxes)

    fig.suptitle("상부 vs 하부 베이나이트 — 탄화물의 ‘위치’가 성질을 가른다 (오스템퍼링의 목표 = 하부)",
                 fontsize=11.5, color=C_AX, y=1.02)
    fig.subplots_adjust(left=0.07, right=0.98, top=0.84, bottom=0.12)
    save(fig, "bainite-upper-lower")


def fig_polymer_pyramid():
    """고성능 폴리머 전용 — 폴리머 피라미드 + 연속사용온도 축 (Figure Quality v2)."""
    fig, (axL, axR) = plt.subplots(1, 2, figsize=(9.8, 4.6), gridspec_kw={"width_ratios": [1.15, 1]})

    # (좌) 피라미드 — 3계층
    axL.set_xlim(0, 10); axL.set_ylim(0, 10); axL.axis("off")
    tiers = [
        (0.4, 0.6, 9.2, 2.6, "#dbe7f3", "범용 (commodity)", "PE · PP · PS · PVC", "값싸고 대량 — 포장·생활용품"),
        (1.6, 3.6, 6.8, 2.6, "#f3e3cd", "엔지니어링", "PA · POM · PC · ABS · PBT", "기계 부품 — 기어·하우징"),
        (2.9, 6.6, 4.2, 2.6, "#f3d2c2", "고성능 (슈퍼 엔지니어링)", "PEEK · PEI · PSU · PPS", "금속 대체·항공·의료"),
    ]
    for x, y, w, h, c, name, resins, use in tiers:
        axL.add_patch(Polygon([(x, y), (x + w, y), (x + w * 0.86 + x * 0.14 if False else x + w - 0.65, y + h), (x + 0.65, y + h)],
                              closed=True, facecolor=c, edgecolor=C_AX, lw=1.4))
        axL.text(5, y + h * 0.66, name, ha="center", fontsize=9.6, fontweight="bold", color=C_AX)
        axL.text(5, y + h * 0.40, resins, ha="center", fontsize=8.6, color="#1f2933")
        axL.text(5, y + h * 0.15, use, ha="center", fontsize=7.6, color=C_MUTE)
    # 가격·물량 화살표
    axL.annotate("", xy=(0.35, 9.4), xytext=(0.35, 0.7), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.3))
    axL.text(0.1, 5.0, "가격·성능 ↑", rotation=90, va="center", fontsize=8.4, color=C_M)
    axL.annotate("", xy=(9.85, 0.7), xytext=(9.85, 9.4), arrowprops=dict(arrowstyle="-|>", color=C_A, lw=1.3))
    axL.text(9.55, 5.0, "생산량 ↑", rotation=90, va="center", fontsize=8.4, color=C_A)
    axL.set_title("폴리머 피라미드", fontsize=11, color=C_AX, fontweight="bold")

    # (우) 연속사용온도 축 — 반결정/비정질 구분
    resins = [
        ("PE", 60, "s"), ("ABS", 78, "a"), ("POM", 92, "s"), ("PP", 104, "s"),
        ("PA66", 116, "s"), ("PC", 128, "a"), ("PSU", 160, "a"), ("PEI", 172, "a"),
        ("PPS", 220, "s"), ("PEEK", 250, "s"),
    ]
    axR.set_xlim(0, 1.6); axR.set_ylim(20, 290)
    axR.set_xticks([])
    axR.set_ylabel("연속사용온도 (°C, 개략)", fontsize=9)
    axR.tick_params(labelsize=8)
    axR.grid(axis="y", alpha=0.25, lw=0.6)
    axR.axhline(150, color=C_M, lw=1.0, ls=(0, (4, 2)))
    axR.text(1.56, 153, "150 °C — 고성능의 문턱", fontsize=7.8, color=C_M, ha="right")
    for name, t, kind in resins:
        c = C_G if kind == "s" else C_A
        axR.plot([0.28, 0.55], [t, t], color=c, lw=2.6, solid_capstyle="round")
        axR.text(0.62, t, name, fontsize=8.6, color=c, va="center", fontweight="bold")
    axR.plot([], [], color=C_G, lw=2.6, label="반결정 (내약품·내마모)")
    axR.plot([], [], color=C_A, lw=2.6, label="비정질 (투명·치수안정)")
    axR.legend(fontsize=7.8, loc="upper right", framealpha=0.9)
    axR.set_title("어디까지 버티나", fontsize=10.5, color=C_AX, fontweight="bold")

    fig.suptitle("고성능 폴리머 — 피라미드의 꼭대기층 (연속사용온도 150 °C 이상)", fontsize=11.5, color=C_AX, y=1.0)
    fig.subplots_adjust(left=0.02, right=0.99, top=0.85, bottom=0.08, wspace=0.16)
    save(fig, "polymer-pyramid")


def fig_ceramic_families():
    """세라믹 계열 전용 — 경도 vs 파괴인성 지도 (산화물/비산화물/초경, Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(8.8, 5.4))
    # (이름, K_IC, HV, 계열) — 개략 대표값
    pts = [
        ("유리", 0.7, 550, "o"),
        ("알루미나 96%", 3.5, 1400, "o"), ("알루미나 99.5%", 4.0, 1600, "o"),
        ("ZTA", 5.5, 1500, "o"), ("Y-TZP 지르코니아", 8.0, 1250, "o"), ("Mg-PSZ", 10.0, 1100, "o"),
        ("SiC", 4.0, 2500, "n"), ("Si$_3$N$_4$", 6.5, 1500, "n"), ("B$_4$C", 3.5, 2900, "n"),
        ("AlN", 3.0, 1100, "n"), ("WC-Co 6%", 9.0, 1600, "c"),
    ]
    COLORS = {"o": C_G, "n": C_A, "c": C_M}
    # 포인트별 라벨 오프셋 (dx, dy, ha, va) — 겹침 없는 명시 배치
    LBL = {
        "유리": (0, 90, "center", "bottom"),
        "알루미나 96%": (-0.18, 0, "right", "center"),
        "알루미나 99.5%": (0, 95, "center", "bottom"),
        "ZTA": (0, 95, "center", "bottom"),
        "Y-TZP 지르코니아": (0, 95, "center", "bottom"),
        "Mg-PSZ": (0, 95, "center", "bottom"),
        "SiC": (0, -140, "center", "top"),
        "Si$_3$N$_4$": (0.18, 90, "left", "bottom"),
        "B$_4$C": (0, 95, "center", "bottom"),
        "AlN": (0, -140, "center", "top"),
        "WC-Co 6%": (0, 95, "center", "bottom"),
    }
    for name, k, hv, fam in pts:
        ax.scatter(k, hv, s=90, color=COLORS[fam], edgecolor="white", linewidth=0.8, zorder=4)
        dx, dy, ha, va = LBL[name]
        ax.text(k + dx, hv + dy, name, fontsize=8.4, ha=ha, va=va, color=COLORS[fam])
    # 변태강화 화살표 (알루미나 → 지르코니아) — 텍스트는 화살표 아래쪽
    ax.annotate("", xy=(7.6, 1280), xytext=(4.3, 1560),
                arrowprops=dict(arrowstyle="-|>", color=C_G, lw=1.3, ls=(0, (4, 2))))
    ax.text(5.6, 1300, "변태강화 (지르코니아)", fontsize=8.2, color=C_G, ha="center", va="top")
    # 강(비교 기준) — 축 밖 화살표
    ax.annotate("강(Q+T)은 K$_IC$ 50+ →", xy=(11.6, 620), xytext=(8.2, 620),
                fontsize=8.6, color=C_MUTE,
                arrowprops=dict(arrowstyle="->", color=C_MUTE, lw=1.0))
    ax.set_xlim(0, 12); ax.set_ylim(300, 3200)
    ax.set_xlabel("파괴인성 K$_{IC}$ (MPa√m, 개략)", fontsize=9.5)
    ax.set_ylabel("경도 (HV, 개략)", fontsize=9.5)
    ax.tick_params(labelsize=8.5)
    ax.grid(alpha=0.25, lw=0.6)
    for fam, label in (("o", "산화물 (Al₂O₃·ZrO₂)"), ("n", "비산화물 (SiC·Si₃N₄·B₄C·AlN)"), ("c", "초경 (WC-Co)")):
        ax.scatter([], [], s=90, color=COLORS[fam], label=label)
    ax.legend(fontsize=8.4, loc="upper right", framealpha=0.92)
    ax.set_title("세라믹 가족 지도 — 단단할수록 잘 깨지는 저울 위에서", fontsize=11.5, color=C_AX, fontweight="bold")
    fig.subplots_adjust(left=0.1, right=0.97, top=0.92, bottom=0.11)
    save(fig, "ceramic-families")


def _family_barh(name, title, subtitle, items, xlabel, legend_map, xmax=None, note=None, legend_loc="upper right"):
    """계열 스펙트럼 공용 포맷 — 가로 막대(겹침 무발생) + 계열 색 + 값 라벨 (Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(8.8, 0.52 * len(items) + 2.1))
    ys = range(len(items))
    vals = [v for _, v, _ in items]
    xm = xmax or max(vals) * 1.18
    for y, (label, v, kind) in enumerate(items):
        ax.barh(y, v, height=0.6, color=legend_map[kind][1], edgecolor="white", linewidth=0.6)
        ax.text(v + xm * 0.012, y, f"{v:,}", va="center", fontsize=8.2, color=C_AX)
    ax.set_yticks(list(ys))
    ax.set_yticklabels([label for label, _, _ in items], fontsize=8.8)
    ax.invert_yaxis()
    ax.set_xlim(0, xm)
    ax.set_xlabel(xlabel, fontsize=9)
    ax.tick_params(labelsize=8)
    ax.grid(axis="x", alpha=0.25, lw=0.6)
    handles = [plt.Rectangle((0, 0), 1, 1, color=c) for _, (_, c) in legend_map.items()]
    labels = [lab for _, (lab, _) in legend_map.items()]
    ax.legend(handles, labels, fontsize=7.8, loc=legend_loc, framealpha=0.95)
    if note:
        ax.text(0.0, 1.02, note, transform=ax.transAxes, ha="left", fontsize=7.8, color=C_MUTE)
    ax.set_title(title + " — " + subtitle, fontsize=11, color=C_AX, fontweight="bold", pad=14)
    fig.subplots_adjust(left=0.30, right=0.97, top=0.86, bottom=0.16)
    save(fig, name)


def fig_cu_families():
    _family_barh(
        "cu-families", "구리 합금 계열", "σy 스펙트럼 (대표 조건, 개략)",
        [("순동 C11000 (annealed)", 70, "s"),
         ("쿠프로니켈 C71500 (70/30)", 140, "s"),
         ("황동 C26000 (H02 냉간)", 360, "w"),
         ("CuCrZr (aged)", 400, "p"),
         ("알루미늄청동 C63000", 415, "s"),
         ("인청동 C51000 (H)", 470, "w"),
         ("베릴륨동 C17200 (AT)", 1100, "p")],
        "항복강도 σy (MPa, 개략)",
        {"s": ("고용·기본", C_A), "w": ("가공경화", C_G), "p": ("석출경화", C_M)},
        note="전도도는 대체로 강도와 반비례 — 순동 100 %IACS ↔ 베릴륨동 ~22 %IACS")


def fig_co_families():
    _family_barh(
        "co-families", "코발트 합금 계열", "σy 와 세 갈래 용도 (개략)",
        [("CoCrMo F75 (주조·생체)", 450, "b"),
         ("L605 / Haynes 25 (고온 판재)", 460, "h"),
         ("Haynes 188 (연소기)", 465, "h"),
         ("Stellite 6 (하드페이싱)", 540, "w"),
         ("CoCrMo F1537 (단조·생체)", 830, "b"),
         ("MP35N (aged — 최강 Co계)", 1600, "b")],
        "항복강도 σy (MPa, 개략)",
        {"w": ("내마모 (Stellite)", C_M), "h": ("고온 (Haynes·L605)", C_G), "b": ("생체·고강도 (CoCrMo·MP35N)", C_A)},
        note="내마모 계열의 본체는 σy 가 아니라 경도(~40 HRC)와 탄화물")


def fig_mg_families():
    _family_barh(
        "mg-families", "마그네슘 합금 계열", "σy 스펙트럼 (개략) — 전 계열 밀도 1.74~1.85 g/cm³",
        [("AZ91D (다이캐스트)", 150, "c"),
         ("WE43 (T6 — 고온·희토류)", 170, "r"),
         ("AZ31B (판재·압출)", 200, "w"),
         ("ZK60A (T5 — 고강도 단조)", 260, "w")],
        "항복강도 σy (MPa, 개략)",
        {"c": ("주조 (AZ 다이캐스트)", C_A), "w": ("가공재 (AZ31·ZK60)", C_G), "r": ("희토류계 (WE43)", C_M)},
        note="같은 σy 라도 무게는 Al 의 2/3, 강의 1/4 급 — '비강도'로 읽을 것")


def fig_refractory_melting():
    _family_barh(
        "refractory-melting", "고융점 금속", "융점 스펙트럼 — 이 가족의 신분증 (°C)",
        [("텅스텐 W", 3422, "m"),
         ("레늄 Re", 3186, "d"),
         ("탄탈럼 Ta", 3017, "d"),
         ("몰리브데넘 Mo", 2623, "m"),
         ("니오븀 Nb", 2477, "m")],
        "융점 (°C)",
        {"m": ("상온 취성 주의 (W·Mo·Nb — DBTT)", C_M), "d": ("상온 연성 (Ta·Re)", C_A)},
        xmax=4300,
        note="비교: 철 1538 °C · 니켈 1455 °C — 초합금이 끝나는 곳에서 시작하는 가족",
        legend_loc="lower right")


def fig_toolsteel_hardness():
    _family_barh(
        "toolsteel-hardness", "공구강 계열", "사용 경도 스펙트럼 (HRC, 개략)",
        [("P20 (몰드 — pre-hardened)", 32, "mo"),
         ("H13 (열간 다이캐스트)", 48, "h"),
         ("S7 (내충격)", 56, "s"),
         ("A2 (공랭 냉간)", 61, "c"),
         ("O1 (유랭 냉간)", 62, "c"),
         ("D2 (고크로뮴 냉간)", 62, "c"),
         ("DC53 (Cr8 개량)", 63, "c"),
         ("M2 (범용 HSS)", 65, "hs"),
         ("M42 (Co8 HSS)", 67, "hs")],
        "사용 경도 (HRC, 개략)",
        {"mo": ("몰드", C_MUTE), "h": ("열간", C_G), "s": ("내충격", "#7a5195"), "c": ("냉간", C_A), "hs": ("고속도", C_M)},
        xmax=78,
        note="열간(H)은 경도 대신 고온 연화 저항, 내충격(S)은 인성이 본체")


def fig_maraging_grades():
    _family_barh(
        "maraging-grades", "마레이징강", "grade 별 σy — 가공은 무른 상태에서, 강도는 Aging 후 (개략)",
        [("용체화 상태 (가공·용접 시점)", 800, "a"),
         ("Maraging 250 (aged)", 1720, "g"),
         ("Maraging 300 (aged)", 2000, "g"),
         ("Maraging 350 (aged)", 2400, "g")],
        "항복강도 σy (MPa, 개략)",
        {"a": ("annealed/용체화 — 무른 마르텐사이트", C_A), "g": ("480 °C Aging 후", C_M)},
        note="탄소 거의 0 — 강화는 Ni₃(Ti,Mo) 금속간화합물 석출의 몫")


def fig_schaeffler():
    """쉐플러 다이어그램 전용 — Cr/Ni 당량 조직 지도 (개략, Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(8.6, 6.0))
    ax.set_xlim(0, 30); ax.set_ylim(0, 24)
    ax.set_xlabel("Cr 당량 = Cr + Mo + 1.5Si + 0.5Nb", fontsize=9.5)
    ax.set_ylabel("Ni 당량 = Ni + 30C + 0.5Mn", fontsize=9.5)
    ax.tick_params(labelsize=8.5)
    # 영역(개략 폴리곤 — 실제 경계의 단순화)
    A = Polygon([(0, 12), (13, 8.5), (30, 16), (30, 24), (0, 24)], closed=True,
                facecolor="#f3e3cd", edgecolor="none", alpha=0.9)
    M = Polygon([(0, 0), (13, 0), (13, 8.5), (0, 12)], closed=True,
                facecolor="#eebdb8", edgecolor="none", alpha=0.9)
    F = Polygon([(17, 0), (30, 0), (30, 10), (24, 6.5), (17, 1.5)], closed=True,
                facecolor="#dbe7f3", edgecolor="none", alpha=0.9)
    AF = Polygon([(13, 8.5), (30, 16), (30, 10), (24, 6.5)], closed=True,
                 facecolor="#e9edc9", edgecolor="none", alpha=0.9)
    MF = Polygon([(13, 0), (17, 0), (17, 1.5), (24, 6.5), (13, 8.5)], closed=True,
                 facecolor="#e8d9ec", edgecolor="none", alpha=0.9)
    for p in (A, M, F, AF, MF):
        ax.add_patch(p)
    ax.text(7, 19, "오스테나이트 (A)", fontsize=10.5, color="#8a5a1f", fontweight="bold")
    ax.text(3.2, 4.5, "마르텐사이트 (M)", fontsize=9.5, color="#8f2f28", fontweight="bold")
    ax.text(25.5, 2.2, "페라이트 (F)", fontsize=9.5, color="#2f5b8f", fontweight="bold", ha="center")
    ax.text(23.5, 10.6, "A + F", fontsize=9.5, color="#5c6b2f", fontweight="bold")
    ax.text(16.6, 4.6, "M + F\n/ M + A", fontsize=8.2, color="#5b3a6b", ha="center")
    # 페라이트 5~10% 안전 밴드 (고온균열 회피 창 — 개략)
    ax.plot([14, 30], [9.4, 17.2], color=C_AX, lw=1.1, ls=(0, (5, 3)))
    ax.plot([15.5, 30], [8.8, 15.4], color=C_AX, lw=1.1, ls=(0, (5, 3)))
    ax.text(28.2, 17.4, "δ 페라이트 5~10%\n(고온균열 안전 창)", fontsize=7.8, color=C_AX, ha="right", va="bottom")
    # 대표 grade 점
    PTS = [("410", 12.5, 2.5), ("430", 17.5, 1.8), ("304", 19, 10.3), ("308L", 20.5, 11.2),
           ("309L", 24.5, 13.5), ("316L", 21.5, 11.6), ("2205", 25.5, 9.0)]
    for name, x, y in PTS:
        ax.scatter(x, y, s=52, color="#1f2933", zorder=5, edgecolor="white", linewidth=0.7)
        dy = 0.55 if name not in ("308L", "316L") else -1.0
        ax.text(x, y + dy, name, fontsize=8.4, ha="center", color="#1f2933",
                va="bottom" if dy > 0 else "top", fontweight="bold")
    # 이종 용접 희석 화살표 (탄소강 × 309L)
    ax.scatter(1.2, 1.5, s=52, color=C_M, zorder=5, edgecolor="white", linewidth=0.7)
    ax.text(1.3, 0.7, "탄소강", fontsize=8.2, color=C_M, ha="left", fontweight="bold")
    ax.annotate("", xy=(24.0, 13.2), xytext=(1.8, 1.9),
                arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.2, ls=(0, (4, 2))))
    ax.text(9.2, 2.2, "이종 용접 희석 경로 — 중간이 M 지대를\n지나므로 309L 로 A 쪽에 착지시킨다",
            fontsize=7.9, color=C_M, ha="center", va="center")
    ax.set_title("쉐플러 다이어그램 — 용접금속 조직의 지도 (개략)", fontsize=11.5, color=C_AX, fontweight="bold")
    fig.subplots_adjust(left=0.09, right=0.97, top=0.93, bottom=0.09)
    save(fig, "schaeffler")


def fig_he_triangle():
    """수소취성 전용 — 3요소 벤 + 베이킹 창 (Figure Quality v2)."""
    fig, (axL, axR) = plt.subplots(1, 2, figsize=(9.6, 4.3), gridspec_kw={"width_ratios": [1.15, 1]})
    axL.set_xlim(0, 10); axL.set_ylim(0, 10); axL.set_aspect("equal"); axL.axis("off")
    cs = [(3.6, 6.2, C_A, "원자수소 유입\n(도금·산세·부식·용접)"),
          (6.4, 6.2, C_G, "인장응력\n(외력+잔류응력)"),
          (5.0, 3.6, C_M, "감수성 재료\n(고강도강 ≥HRC 32)")]
    for cx, cy, c, lab in cs:
        axL.add_patch(Circle((cx, cy), 2.6, facecolor=c, alpha=0.25, edgecolor=c, lw=1.6))
    axL.text(3.0, 7.6, cs[0][3], fontsize=8.4, ha="center", color="#2f5b8f")
    axL.text(7.1, 7.6, cs[1][3], fontsize=8.4, ha="center", color="#8a5a1f")
    axL.text(5.0, 1.7, cs[2][3], fontsize=8.4, ha="center", color="#8f2f28")
    axL.text(5.0, 5.4, "지연파괴", fontsize=10.5, ha="center", color="#1f2933", fontweight="bold")
    axL.text(5.0, 4.7, "(수 시간~수일 뒤)", fontsize=7.6, ha="center", color=C_MUTE)
    axL.set_title("세 원이 겹칠 때만 일어난다 — 하나를 끊는 게 대책", fontsize=10, color=C_AX, fontweight="bold")
    # (우) 베이킹 창
    axR.set_xlim(0, 10); axR.set_ylim(0, 10); axR.axis("off")
    axR.add_patch(Rectangle((0.6, 6.4), 8.8, 1.5, facecolor="#dbe7f3", edgecolor=C_A, lw=1.2))
    axR.text(5.0, 7.15, "도금 후 4시간 이내 착수", ha="center", fontsize=8.8, color="#2f5b8f", fontweight="bold")
    axR.add_patch(Rectangle((0.6, 3.9), 8.8, 1.5, facecolor="#f3e3cd", edgecolor=C_G, lw=1.2))
    axR.text(5.0, 4.65, "190~220 °C × 수 시간~24 h (강도급별)", ha="center", fontsize=8.8, color="#8a5a1f", fontweight="bold")
    axR.add_patch(Rectangle((0.6, 1.4), 8.8, 1.5, facecolor="#eebdb8", edgecolor=C_M, lw=1.2))
    axR.text(5.0, 2.15, "수소 방출 — 취성 회복 (ASTM F519 검증)", ha="center", fontsize=8.8, color="#8f2f28", fontweight="bold")
    for y in (6.4, 3.9):
        axR.annotate("", xy=(5.0, y - 0.35), xytext=(5.0, y - 0.05),
                     arrowprops=dict(arrowstyle="-|>", color=C_AX, lw=1.2))
    axR.set_title("베이킹(de-embrittlement) 창 — 시간이 생명", fontsize=10, color=C_AX, fontweight="bold")
    fig.suptitle("수소취성 — 3요소의 교집합, 그리고 도금 라인의 시계", fontsize=11.5, color=C_AX, y=1.0)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.84, bottom=0.04, wspace=0.1)
    save(fig, "he-triangle")


def fig_solidification_cracking():
    """고온균열 전용 — 응고 액막과 수축 구속 (Figure Quality v2)."""
    fig, ax = plt.subplots(figsize=(8.6, 4.4))
    ax.set_xlim(0, 10); ax.set_ylim(0, 10); ax.set_aspect("equal"); ax.axis("off")
    # 주상정 4기둥 (아래에서 위로 응고 성장)
    rng = np.random.RandomState(5)
    cols = [(0.8, 2.2), (2.6, 4.4), (4.8, 6.6), (7.0, 8.8)]
    for x0, x1 in cols:
        verts = [(x0, 0.6)]
        xs = np.linspace(x0, x1, 7)
        for i, x in enumerate(xs):
            verts.append((x, 6.2 + 0.55 * np.sin(i * 1.9) + rng.uniform(-0.15, 0.15)))
        verts.append((x1, 0.6))
        ax.add_patch(Polygon(verts, closed=True, facecolor="#dbe7f3", edgecolor=C_A, lw=1.3))
    # 결정 사이 마지막 액막 (저융점 편석)
    for (a0, a1), (b0, b1) in zip(cols[:-1], cols[1:]):
        gap_l, gap_r = a1, b0
        ax.add_patch(Polygon([(gap_l, 0.8), (gap_r, 0.8), ((gap_l + gap_r) / 2 + 0.05, 6.6)],
                             closed=True, facecolor="#f0b27a", edgecolor="#c2621f", lw=1.0, alpha=0.9))
    ax.text(3.55, 7.3, "마지막 액막 (S·P 저융점 편석 — Fe-S 공정 988 °C)", fontsize=8.3, color="#c2621f", ha="center")
    # 수축 구속 화살표
    ax.annotate("", xy=(0.2, 3.6), xytext=(1.6, 3.6), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.6))
    ax.annotate("", xy=(9.8, 3.6), xytext=(8.4, 3.6), arrowprops=dict(arrowstyle="-|>", color=C_M, lw=1.6))
    ax.text(0.25, 4.15, "응고 수축\n+ 구속", fontsize=8.2, color=C_M)
    ax.text(9.75, 4.15, "응고 수축\n+ 구속", fontsize=8.2, color=C_M, ha="right")
    # 균열 (세 번째 액막이 찢어짐 — gap 6.6~7.0)
    zz = [(6.82, 0.9), (6.72, 1.9), (6.92, 2.9), (6.76, 3.9), (6.9, 4.9), (6.8, 5.8)]
    ax.plot([p[0] for p in zz], [p[1] for p in zz], color="#1f2933", lw=2.2)
    ax.text(7.15, 1.5, "응고 균열\n(액막이 찢김)", fontsize=8.4, color="#1f2933")
    ax.text(5.0, 0.15, "대책 = 3요소 중 하나 제거: 저 S·P 청정도 · δ 페라이트 5~10% (SS) · 필러로 조성 이동 (Al) · 구속 완화",
            fontsize=8.0, color=C_AX, ha="center")
    ax.set_title("고온균열 — 응고 마지막 순간, 액막이 수축을 못 이길 때 (개략)", fontsize=11.5, color=C_AX, fontweight="bold")
    fig.subplots_adjust(left=0.02, right=0.98, top=0.9, bottom=0.02)
    save(fig, "solidification-cracking")


def fig_am_anisotropy():
    """AM 이방성 전용 — 적층 방향과 물성 격차 (Figure Quality v2)."""
    fig, (axL, axR) = plt.subplots(1, 2, figsize=(9.4, 4.2), gridspec_kw={"width_ratios": [1, 1.2]})
    # (좌) 적층 방향 모식
    axL.set_xlim(0, 10); axL.set_ylim(0, 10); axL.set_aspect("equal"); axL.axis("off")
    for i in range(7):
        y = 1.2 + i * 1.0
        ax_c = "#dbe7f3" if i % 2 == 0 else "#cfdeee"
        axL.add_patch(Rectangle((2.2, y), 5.2, 0.9, facecolor=ax_c, edgecolor=C_A, lw=0.8))
    axL.annotate("", xy=(9.2, 4.8), xytext=(7.9, 4.8), arrowprops=dict(arrowstyle="<->", color=C_G, lw=1.6))
    axL.text(9.35, 4.8, "XY\n(층 방향)", fontsize=8.6, color=C_G, va="center")
    axL.annotate("", xy=(4.8, 9.4), xytext=(4.8, 8.4), arrowprops=dict(arrowstyle="<->", color=C_M, lw=1.6))
    axL.text(5.1, 9.0, "Z (적층 방향)", fontsize=8.6, color=C_M, va="center")
    axL.text(4.8, 0.4, "층간 계면·기공이 Z 인장의 약한 고리", fontsize=8.2, color=C_MUTE, ha="center")
    axL.set_title("적층이 만드는 방향성", fontsize=10, color=C_AX, fontweight="bold")
    # (우) XY 대비 Z 상대 물성 (as-built, 개략)
    props = [("인장강도", 92), ("항복강도", 90), ("연신율", 55), ("피로수명", 60)]
    ys = range(len(props))
    axR.barh(list(ys), [100] * len(props), height=0.62, color="#e5e9ee", edgecolor="white")
    axR.barh(list(ys), [v for _, v in props], height=0.62, color=C_M, alpha=0.85, edgecolor="white")
    for y, (lab, v) in zip(ys, props):
        axR.text(v - 2, y, f"{v}%", va="center", ha="right", fontsize=8.4, color="white", fontweight="bold")
    axR.set_yticks(list(ys))
    axR.set_yticklabels([lab for lab, _ in props], fontsize=9)
    axR.invert_yaxis()
    axR.set_xlim(0, 112)
    axR.set_xlabel("Z 방향 물성 (XY = 100% 기준, as-built LPBF 개략)", fontsize=8.8)
    axR.tick_params(labelsize=8)
    axR.axvline(100, color=C_AX, lw=1.0, ls=(0, (4, 2)))
    axR.text(101, -0.55, "XY 기준", fontsize=7.8, color=C_AX)
    axR.set_title("어디가 얼마나 약한가 — 연신·피로가 급소", fontsize=10, color=C_AX, fontweight="bold")
    axR.text(0.98, -0.28, "HIP·열처리로 격차가 크게 줄어든다 (설계는 Z 값 기준)", transform=axR.transAxes,
             ha="right", fontsize=7.8, color=C_MUTE)
    fig.suptitle("AM 이방성 — 성질에 방향이 생기는 이유와 크기", fontsize=11.5, color=C_AX, y=1.0)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.84, bottom=0.18, wspace=0.24)
    save(fig, "am-anisotropy")


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
    fig_martensite_morphology()
    fig_pearlite()
    fig_grain_structure()
    fig_steel_microstructures()
    fig_austenite_micro()
    fig_cementite_forms()
    fig_carbide_micro()
    fig_cast_iron_family()
    fig_orowan()
    fig_al_families()
    fig_ti_families()
    fig_ferrite_micro()
    fig_hall_petch()
    fig_cold_work_effects()
    fig_hot_cold_scale()
    fig_annealing_cycle()
    fig_forming_processes()
    fig_casting_process()
    fig_sintering_stages()
    fig_stress_concentration_kt()
    fig_hardness_tests()
    fig_hip_densification()
    fig_strengthening_mechanisms()
    fig_case_hardening()
    fig_stainless_families()
    fig_superalloy_strength()
    fig_red_hardness()
    fig_jominy()
    fig_bainite_upper_lower()
    fig_polymer_pyramid()
    fig_ceramic_families()
    fig_cu_families()
    fig_co_families()
    fig_mg_families()
    fig_refractory_melting()
    fig_toolsteel_hardness()
    fig_maraging_grades()
    fig_schaeffler()
    fig_he_triangle()
    fig_solidification_cracking()
    fig_am_anisotropy()
    print("done →", os.path.abspath(OUT))
