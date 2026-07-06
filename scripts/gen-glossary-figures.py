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
    """마르텐사이트 형태 — 라스(저·중탄소) vs 판상/렌티큘러(고탄소). 개략."""
    from matplotlib.patches import Ellipse
    fig, axes = plt.subplots(1, 2, figsize=(9.2, 4.4))
    # 라스: 결정립을 조각(packet)으로 나눠 각 조각에 평행 라스
    ax = axes[0]
    ax.add_patch(Rectangle((0, 0), 1, 1, facecolor="#f4efe9", edgecolor=C_AX, lw=1.5))
    packets = [((0.0, 0.0, 0.5, 0.5), 22), ((0.5, 0.0, 0.5, 0.5), -32),
               ((0.0, 0.5, 0.5, 0.5), -58), ((0.5, 0.5, 0.5, 0.5), 62)]
    for rect, ang in packets:
        _fill_parallel(ax, rect, ang, spacing=0.055, color=C_M, lw=0.9)
    ax.plot([0.5, 0.5], [0, 1], color=C_AX, lw=0.8, alpha=0.5)
    ax.plot([0, 1], [0.5, 0.5], color=C_AX, lw=0.8, alpha=0.5)
    ax.set_title("라스 마르텐사이트 (저·중탄소강)", fontsize=10.5, color=C_M, fontweight="bold")
    # 판상/렌티큘러: 렌즈 모양 판 교차
    ax = axes[1]
    ax.add_patch(Rectangle((0, 0), 1, 1, facecolor="#f4efe9", edgecolor=C_AX, lw=1.5))
    lenses = [(0.35, 0.62, 0.62, 0.13, 28), (0.62, 0.38, 0.7, 0.11, -22),
              (0.48, 0.78, 0.42, 0.09, -68), (0.72, 0.68, 0.4, 0.08, 48),
              (0.28, 0.32, 0.5, 0.1, -50), (0.55, 0.2, 0.38, 0.08, 15)]
    for cx, cy, w, h, ang in lenses:
        ax.add_patch(Ellipse((cx, cy), w, h, angle=ang, facecolor=C_M, alpha=0.28, edgecolor=C_M, lw=1.2))
    ax.set_title("판상(렌티큘러) 마르텐사이트 (고탄소강)", fontsize=10.5, color=C_M, fontweight="bold")
    for ax in axes:
        ax.set_xlim(-0.02, 1.02); ax.set_ylim(-0.02, 1.02); ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("마르텐사이트 형태 (개략)", fontsize=11, color=C_AX, y=1.0)
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
    """탄소 함량별 강 미세조직 — 아공석/공석/과공석 (개략)."""
    fig, axes = plt.subplots(1, 3, figsize=(9.6, 3.4))
    titles = ["아공석강 (<0.76%C)\n페라이트 + 펄라이트",
              "공석강 (0.76%C)\n전부 펄라이트",
              "과공석강 (>0.76%C)\n펄라이트 + 입계 시멘타이트"]
    np.random.seed(5)
    for k, (ax, title) in enumerate(zip(axes, titles)):
        ax.add_patch(Circle((0.5, 0.55), 0.42, facecolor="#f4efe9", edgecolor=C_AX, lw=1.4))
        clipc = Circle((0.5, 0.55), 0.42, transform=ax.transData)
        # 펄라이트 영역(층상 해칭) + 페라이트(밝음)/시멘타이트(입계)
        if k == 0:  # 아공석: 밝은 페라이트 바탕 + 깔끔한 펄라이트 콜로니 2개
            for (px, py, pw, ph) in [(0.30, 0.30, 0.27, 0.22), (0.54, 0.58, 0.23, 0.19)]:
                clipp = Rectangle((px, py), pw, ph, transform=ax.transData)
                for i, yy in enumerate(np.arange(py, py + ph, 0.028)):
                    ln, = ax.plot([px, px + pw], [yy, yy], color="#333" if i % 2 == 0 else "none", lw=1.7)
                    ln.set_clip_path(clipp)
            ax.text(0.25, 0.76, "α 페라이트", fontsize=7.5, color=C_A)
            ax.text(0.435, 0.255, "펄라이트", fontsize=7, color="#333", ha="center")
        elif k == 1:  # 공석: 전면 펄라이트
            for i, off in enumerate(np.arange(-0.4, 0.4, 0.035)):
                ln, = ax.plot([0.1, 0.9], [0.55 + off, 0.55 + off], color="#333" if i % 2 == 0 else "none", lw=2.2)
                ln.set_clip_path(clipc)
        else:  # 과공석: 펄라이트 + 입계 시멘타이트 망
            for i, off in enumerate(np.arange(-0.4, 0.4, 0.045)):
                ln, = ax.plot([0.1, 0.9], [0.55 + off, 0.55 + off], color="#555" if i % 2 == 0 else "none", lw=1.6)
                ln.set_clip_path(clipc)
            ax.add_patch(Circle((0.5, 0.55), 0.42, facecolor="none", edgecolor="#111", lw=2.5))
            ax.text(0.5, 1.02, "입계 Fe₃C", fontsize=8, color="#111", ha="center")
        ax.text(0.5, 0.02, title, ha="center", va="bottom", fontsize=8.5, color=C_AX, fontweight="bold")
        ax.set_xlim(0, 1); ax.set_ylim(-0.02, 1.12); ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("탄소 함량별 강 미세조직 (냉각 후, 개략)", fontsize=11, color=C_AX, y=1.04)
    save(fig, "steel-microstructures")


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
    fig_strengthening_mechanisms()
    fig_stainless_families()
    fig_superalloy_strength()
    fig_red_hardness()
    print("done →", os.path.abspath(OUT))
