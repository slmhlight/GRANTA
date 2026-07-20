# -*- coding: utf-8 -*-
"""
H4k / H6 W3-11 — 생성 이미지 도표에 한글 라벨·리더선 합성.

배경: 생성 모델은 이미지 안 텍스트를 왜곡하고 한글은 사실상 불가하다. 그래서 원화는
**글자 없는 그림**으로 받고, 라벨·구역명·수치는 여기서 matplotlib 로 얹는다 —
기존 67 도표(gen-glossary-figures.py)와 같은 폰트·색·여백 규약을 공유해 톤이 붙는다.

입력:  data/figure-sources/<id>.png   (생성 원화, 커밋 — 재현 가능하게)
출력:  client/src/assets/glossary/<id>.png  (Vite 가 자동 번들, 게이트가 id 실재 검사)

실행:  python scripts/overlay-figure-labels.py [id ...]      (인자 없으면 전체)

좌표계: 모든 라벨 위치는 **트림된 원화의 정규화 좌표(0~1, 좌상단 원점)** 로 적는다 —
원화 크기가 바뀌어도 유지된다. `at` = 지시 대상(화살표 끝), `text` = 글상자 위치.
글상자를 이미지 밖(0 미만·1 초과)에 두면 흰 여백에 놓이고 리더선이 안으로 들어간다.

`row_split` 을 주면 그 높이에서 그림을 위/아래로 갈라 `row_gap` 만큼 흰 띠를 만든다
(2×2 판에서 아래 행 제목이 그림을 덮지 않게). 이때 **`at` 은 원화 좌표로 적으면 되고**
(아래 행이면 자동으로 gap 만큼 내려간다), 글상자·제목 y 는 최종 출력 좌표로 적는다.

폰트 주의: Malgun Gothic 에 ≈ ≳ 등 일부 수학기호가 없어 □ 로 깨진다 — 한글로 풀어 쓴다.
"""
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyArrowPatch

# ── 한글 폰트 (gen-glossary-figures.py 와 동일 규약) ────────────────────────
for _f in ["Malgun Gothic", "NanumGothic", "Batang", "Gulim"]:
    try:
        matplotlib.font_manager.findfont(_f, fallback_to_default=False)
        plt.rcParams["font.family"] = _f
        break
    except Exception:
        continue
plt.rcParams["axes.unicode_minus"] = False

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "data", "figure-sources")
OUT = os.path.join(ROOT, "client", "src", "assets", "glossary")

# 팔레트 (gen-glossary-figures.py 상수와 동일)
C_AX = "#4a5568"     # 축·본문
C_G = "#c2621f"      # 주황 — 강조 2
C_A = "#2f6fb0"      # 청 — 강조 1
C_M = "#b4322a"      # 적 — 위험·결함
C_MUTE = "#8a96a3"   # 회 — 보조

TITLE_FS = 12.5      # 패널 제목
LABEL_FS = 10.0      # 콜아웃
NOTE_FS = 9.0        # 하단 주석


def trim_white(img, thr=0.985, pad=4):
    """흰 여백 자동 트림 — 생성물마다 다른 바깥 여백을 없애 배치를 안정화."""
    if img.ndim == 3:
        lum = img[..., :3].mean(axis=2)
    else:
        lum = img
    mask = lum < thr
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    if not len(rows) or not len(cols):
        return img
    r0, r1 = max(rows[0] - pad, 0), min(rows[-1] + pad + 1, img.shape[0])
    c0, c1 = max(cols[0] - pad, 0), min(cols[-1] + pad + 1, img.shape[1])
    return img[r0:r1, c0:c1]


def render(fig_id, spec):
    path = os.path.join(SRC, fig_id + ".png")
    if not os.path.exists(path):
        print("  skip (원화 없음):", os.path.relpath(path, ROOT))
        return False
    img = plt.imread(path)
    if "crop" in spec:   # (x0, y0, x1, y1) 정규화 — 생성물 구도 정리용
        h, w = img.shape[:2]
        x0, y0, x1, y1 = spec["crop"]
        img = img[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    img = trim_white(img)
    h, w = img.shape[:2]
    ar = h / w

    m = spec.get("margin", {})
    ml, mr = m.get("l", 0.02), m.get("r", 0.02)
    mt, mb = m.get("t", 0.10), m.get("b", 0.04)

    split = spec.get("row_split")          # 행 분리 지점(원화 y) — 없으면 단일 이미지
    gap = spec.get("row_gap", 0.085) if split else 0.0
    total_h = 1 + gap                       # 출력 y 범위

    def oy(y):
        """원화 y → 출력 y (아래 행이면 gap 만큼 내림)."""
        return y + gap if (split is not None and y > split) else y

    base_w = 9.0
    fig_w = base_w * (1 + ml + mr)
    fig_h = base_w * ar * (total_h + mt + mb)
    fig = plt.figure(figsize=(fig_w, fig_h), facecolor="white")
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_axis_off()
    if split is None:
        ax.imshow(img, extent=[0, 1, 1, 0], aspect="auto", interpolation="lanczos")
    else:
        cut = int(split * h)
        ax.imshow(img[:cut], extent=[0, 1, split, 0], aspect="auto", interpolation="lanczos")
        ax.imshow(img[cut:], extent=[0, 1, total_h, split + gap], aspect="auto", interpolation="lanczos")
    # 정규화 좌표계로 고정 + 여백 확보 (y 는 위가 0)
    ax.set_xlim(-ml, 1 + mr)
    ax.set_ylim(total_h + mb, -mt)

    # 패널 구분선 (원화에 없거나 흐릴 때)
    for x in spec.get("vsep", []):
        for y0, y1 in ([(0, split), (split + gap, total_h)] if split is not None else [(0, 1)]):
            ax.plot([x, x], [y0, y1], color="white", lw=2.4, zorder=3)
            ax.plot([x, x], [y0, y1], color=C_MUTE, lw=0.7, alpha=0.55, zorder=4)
    for y in spec.get("hsep", []):
        ax.plot([0, 1], [oy(y), oy(y)], color="white", lw=2.4, zorder=3)
        ax.plot([0, 1], [oy(y), oy(y)], color=C_MUTE, lw=0.7, alpha=0.55, zorder=4)

    # 패널 제목 — 이미지 위쪽 흰 여백
    for t in spec.get("titles", []):
        ax.text(t["x"], t["y"], t["s"], fontsize=t.get("fs", TITLE_FS), color=t.get("c", C_AX),
                ha=t.get("ha", "center"), va="bottom", fontweight="bold", zorder=6)

    # 콜아웃 — 글상자 + 리더선
    for lb in spec.get("labels", []):
        col = lb.get("c", C_AX)
        tx, ty = lb["text"]
        bbox = dict(boxstyle="round,pad=0.28", fc="white", ec=col, lw=0.8, alpha=0.94)
        ax.annotate(
            lb["s"], xy=(lb["at"][0], oy(lb["at"][1])), xytext=(tx, ty),
            fontsize=lb.get("fs", LABEL_FS), color=col, ha=lb.get("ha", "center"),
            va=lb.get("va", "center"), bbox=bbox, zorder=7,
            arrowprops=dict(arrowstyle="-|>", color=col, lw=1.1,
                            shrinkA=2, shrinkB=3,
                            connectionstyle=lb.get("cs", "arc3,rad=0.0")),
        )

    # 화살표 (지시선만 — 글상자 없이)
    for ar_ in spec.get("arrows", []):
        ax.add_patch(FancyArrowPatch(ar_["a"], ar_["b"], arrowstyle="-|>", mutation_scale=13,
                                     color=ar_.get("c", C_AX), lw=1.2, zorder=6))

    # 자유 텍스트 (제목/주석)
    for t in spec.get("texts", []):
        ax.text(t["x"], t["y"], t["s"], fontsize=t.get("fs", NOTE_FS), color=t.get("c", C_MUTE),
                ha=t.get("ha", "left"), va=t.get("va", "top"), zorder=6,
                rotation=t.get("rot", 0), fontweight=t.get("fw", "normal"))

    out = os.path.join(OUT, fig_id + ".png")
    fig.savefig(out, dpi=200, facecolor="white", edgecolor="none", bbox_inches="tight", pad_inches=0.04)
    plt.close(fig)
    print("  saved:", os.path.relpath(out, ROOT))
    return True


# ══════════════════════════════════════════════════════════════════════════
# 도표별 라벨 명세
# ══════════════════════════════════════════════════════════════════════════
SPECS = {}

# ① 파면 4종 (2×2 사분면) — 아래 행 제목이 그림을 덮지 않게 흰 띠로 분리
SPECS["fractography-plate"] = {
    "margin": {"l": 0.015, "r": 0.015, "t": 0.075, "b": 0.20},
    "row_split": 0.5, "row_gap": 0.085,
    "vsep": [0.5],
    "titles": [
        {"x": 0.25, "y": -0.012, "s": "① 연성 파면 — 딤플(dimple)", "c": C_A},
        {"x": 0.75, "y": -0.012, "s": "② 취성 파면 — 벽개(cleavage)", "c": C_M},
        {"x": 0.25, "y": 0.573, "s": "③ 피로 파면 — 비치마크·스트라이에이션", "c": C_G},
        {"x": 0.75, "y": 0.573, "s": "④ 입계 파면 — 결정립 형상 그대로 분리", "c": C_AX},
    ],
    "labels": [
        {"s": "컵 모양 미세공동\n(소성변형의 흔적)", "at": (0.15, 0.16), "text": (0.115, 0.055), "c": C_A},
        {"s": "공동 바닥의 개재물 — 균열 발생 기점", "at": (0.235, 0.30), "text": (0.315, 0.435), "c": C_A},
        {"s": "리버 패턴 — 지류가 합류하는 쪽이\n균열 진행 방향", "at": (0.66, 0.14), "text": (0.695, 0.065), "c": C_M},
        {"s": "평탄한 벽개면 = 특정 결정면\n(소성변형 거의 없음)", "at": (0.88, 0.30), "text": (0.855, 0.435), "c": C_M},
        {"s": "기점(origin) — 여기서 시작해\n바깥으로 퍼졌다", "at": (0.055, 0.86), "text": (0.10, 1.10), "c": C_G, "fs": 9.5},
        {"s": "비치마크 — 하중 변동·정지 이력\n(육안으로 보이는 크기)", "at": (0.28, 0.70), "text": (0.30, 0.66), "c": C_G, "fs": 9.5},
        {"s": "스트라이에이션 — 1 줄이 1 사이클\n(전자현미경 크기)", "at": (0.40, 0.90), "text": (0.42, 1.17), "c": C_G, "fs": 9.5},
        {"s": "결정립 하나하나가 그대로 드러남\n— 입계가 약해졌다는 증거", "at": (0.76, 0.74), "text": (0.78, 1.10), "c": C_AX, "fs": 9.5},
    ],
}

# ② AM 용융풀·결함 (단일 패널)
SPECS["am-melt-pool"] = {
    "margin": {"l": 0.115, "r": 0.02, "t": 0.155, "b": 0.145},
    "titles": [{"x": 0.5, "y": -0.115, "s": "레이저 분말베드 용융(LPBF) 부품의 수직 단면", "c": C_AX}],
    "labels": [
        {"s": "미용융 분말층", "at": (0.42, 0.035), "text": (0.40, -0.048), "c": C_MUTE, "fs": 9.5},
        {"s": "용융풀 경계 — 층·트랙이 겹쳐\n물고기 비늘(fish-scale) 무늬", "at": (0.60, 0.16), "text": (0.665, -0.055), "c": C_AX, "fs": 9.5},
        {"s": "주상정 — 용융풀 경계에서 안쪽으로 성장,\n층을 가로지른다 → 이방성의 뿌리", "at": (0.36, 0.36), "text": (0.375, 0.245), "c": C_A, "fs": 9.5},
        {"s": "가스 기공 — 구형\n(분말 속 가스가 갇힘)", "at": (0.222, 0.375), "text": (0.125, -0.048), "c": C_G, "fs": 9.5},
        {"s": "키홀 기공 — 용융풀 바닥의\n뾰족한 공동(입열 과다)", "at": (0.415, 0.78), "text": (0.40, 1.085), "c": C_M, "fs": 9.5},
        {"s": "미용융(lack-of-fusion) — 트랙 사이 불규칙 공동,\n미용융 분말이 남는다(입열 부족·해치 과다)", "at": (0.72, 0.615), "text": (0.755, 1.085), "c": C_M, "fs": 9.5},
    ],
    "arrows": [{"a": (-0.065, 0.92), "b": (-0.065, 0.10), "c": C_AX}],
    "texts": [{"x": -0.088, "y": 0.51, "s": "적층 방향", "rot": 90, "ha": "center", "va": "center", "fs": 10, "c": C_AX}],
}

# ③ 용접 HAZ 구역 (좌우 대칭 단면) — 라벨을 위·아래로 번갈아 배치해 충돌 회피
SPECS["haz-zones"] = {
    "margin": {"l": 0.02, "r": 0.02, "t": 0.235, "b": 0.185},
    "titles": [{"x": 0.5, "y": -0.205, "s": "용접부 단면 — 최고 도달온도에 따라 조직이 층을 이룬다 (탄소강 기준)", "c": C_AX}],
    "labels": [
        {"s": "모재 — 열영향 없음\n(압연 조직 유지)", "at": (0.05, 0.50), "text": (0.055, -0.065), "c": C_MUTE, "fs": 9.5},
        {"s": "부분변태역 — 일부만 오스테나이트화\n(약 730~900 °C)", "at": (0.16, 0.62), "text": (0.175, 1.085), "c": C_G, "fs": 9.5},
        {"s": "세립 HAZ — 재결정으로 미세화\n(약 900~1100 °C)", "at": (0.26, 0.35), "text": (0.265, -0.135), "c": C_G, "fs": 9.5},
        {"s": "조립 HAZ — 결정립이 크게 자라\n인성이 가장 낮은 구역 (1100 °C 이상)", "at": (0.37, 0.62), "text": (0.475, 1.085), "c": C_M, "fs": 9.5},
        {"s": "용융부(fusion zone) — 융합선에서\n안쪽으로 자란 주상 수지상", "at": (0.50, 0.35), "text": (0.535, -0.065), "c": C_A, "fs": 9.5},
        {"s": "융합선(fusion line)", "at": (0.585, 0.30), "text": (0.775, -0.135), "c": C_AX, "fs": 9.5},
        {"s": "용접 덧살(reinforcement)", "at": (0.50, 0.055), "text": (0.875, -0.065), "c": C_MUTE, "fs": 9.5},
        {"s": "이면 비드(root)", "at": (0.50, 0.95), "text": (0.80, 1.085), "c": C_MUTE, "fs": 9.5},
    ],
    "texts": [{"x": 0.998, "y": 1.155, "s": "※ 좌우 대칭 — 오른쪽도 같은 구역 배열", "ha": "right", "va": "top", "fs": 8.5}],
}

# ④ 주철 흑연 형태 (4 세로 패널)
SPECS["graphite-forms"] = {
    "margin": {"l": 0.012, "r": 0.012, "t": 0.135, "b": 0.165},
    "vsep": [0.25, 0.5, 0.75],
    "titles": [
        {"x": 0.125, "y": -0.014, "s": "① 회주철\n편상 흑연(flake)", "c": C_AX, "fs": 11.5},
        {"x": 0.375, "y": -0.014, "s": "② CGI\n벌레 모양(vermicular)", "c": C_AX, "fs": 11.5},
        {"x": 0.625, "y": -0.014, "s": "③ 구상흑연주철\n구상(nodular)", "c": C_AX, "fs": 11.5},
        {"x": 0.875, "y": -0.014, "s": "④ 백주철\n흑연 없음 · 탄화물", "c": C_AX, "fs": 11.5},
    ],
    "labels": [
        {"s": "날카로운 흑연 끝 = 내부 노치\n→ 인장에 약하고 진동은 잘 먹는다", "at": (0.125, 0.845), "text": (0.125, 1.075), "c": C_M, "fs": 9.3},
        {"s": "끝이 뭉툭하고 서로 이어짐\n→ 강도와 열전도의 절충", "at": (0.375, 0.845), "text": (0.375, 1.075), "c": C_G, "fs": 9.3},
        {"s": "구형이라 노치 효과 없음\n밝은 테 = 황소눈(bull's-eye) 페라이트", "at": (0.625, 0.845), "text": (0.625, 1.075), "c": C_A, "fs": 9.3},
        {"s": "레데뷰라이트 탄화물 망\n→ 매우 경하고 취성(내마모 전용)", "at": (0.875, 0.845), "text": (0.875, 1.075), "c": C_MUTE, "fs": 9.3},
    ],
}

# ⑤ 폴리머 형태 (2 패널)
SPECS["polymer-morphology"] = {
    "margin": {"l": 0.015, "r": 0.015, "t": 0.085, "b": 0.145},
    "vsep": [0.5],
    "titles": [
        {"x": 0.25, "y": -0.012, "s": "① 비정질(amorphous) — 무질서한 엉킴", "c": C_AX},
        {"x": 0.75, "y": -0.012, "s": "② 반결정(semi-crystalline) — 구정(spherulite)", "c": C_AX},
    ],
    "labels": [
        {"s": "사슬이 규칙 없이 엉켜 있다\n→ 뚜렷한 융점 없이 Tg 에서 물러진다", "at": (0.25, 0.45), "text": (0.235, 1.075), "c": C_A, "fs": 9.5},
        {"s": "핵(nucleus)에서 방사상으로 성장", "at": (0.605, 0.50), "text": (0.585, 1.075), "c": C_M, "fs": 9.5},
        {"s": "라멜라 — 접힌 사슬 결정", "at": (0.70, 0.32), "text": (0.845, 0.325), "c": C_A, "fs": 9.5},
        {"s": "라멜라 사이 비정질 영역", "at": (0.655, 0.66), "text": (0.60, 0.895), "c": C_MUTE, "fs": 9.5},
        {"s": "구정끼리 부딪힌 경계", "at": (0.845, 0.72), "text": (0.885, 1.075), "c": C_MUTE, "fs": 9.5},
    ],
}


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(SRC, exist_ok=True)
    ids = sys.argv[1:] or list(SPECS)
    ok = 0
    for i in ids:
        if i not in SPECS:
            print("  unknown id:", i)
            continue
        print("[" + i + "]")
        if render(i, SPECS[i]):
            ok += 1
    print(f"완료: {ok}/{len(ids)}")
    if ok < len(ids):
        print(f"원화를 {os.path.relpath(SRC, ROOT)}/<id>.png 로 저장 후 재실행")


if __name__ == "__main__":
    main()
