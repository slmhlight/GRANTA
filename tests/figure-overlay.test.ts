/*
 * 생성 원화 + 한글 라벨 합성 파이프(scripts/overlay-figure-labels.py)의 게이트.
 *
 * 이 파이프의 고질 결함은 값이 아니라 **좌표가 조용히 낡는 것**이다. 라벨 위치는
 * "트림된 원화의 정규화 좌표"라, 원화를 다시 그려 받으면 구도가 조금만 달라져도
 * 화살표가 결함이 아니라 빈 배경을 가리키게 된다. 그런데 그림은 여전히 그럴듯해서
 * 눈으로 넘기기 쉽다 — 2026-09-11 재생성에서 20종 중 14종이 그 상태였고,
 * graphite-forms·casting-defects 는 아예 1×4 가로 띠에서 2×2 판으로 구도가 바뀌어
 * 제목 4개가 엉뚱한 사분면 위에 얹혀 있었다.
 *
 * 그래서 이 게이트는 결과 그림이 "예쁜가"가 아니라 세 가지를 본다:
 *   ① 원화 지문이 매니페스트와 같은가 (= 원화를 바꿔놓고 좌표를 안 봤는가)
 *   ② 화살표 끝이 실제 특징 위에 있는가 (= 허공을 가리키는가)
 *   ③ SPEC·원화·산출 3자가 빠짐없이 짝을 이루는가
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SRC = path.resolve(process.cwd(), 'data/figure-sources');
const OUT = path.resolve(process.cwd(), 'client/src/assets/glossary');
const MAN = path.join(SRC, 'manifest.json');

type Label = { s: string; at: [number, number]; dist_px: number };
type Fig = { sha256: string; src_size: [number, number]; labels: Label[] };

const manifest: { figures: Record<string, Fig> } = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const figures = Object.entries(manifest.figures);
const sources = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith('.png'))
  .map((f) => f.replace(/\.png$/, ''));

/* 화살표 끝에서 '배경이 아닌 화소'까지 허용하는 최대 거리.
   교정 후 실측 최대는 12.7px(용접 루트 틈 — 흰 틈새를 가리키는 게 맞는 라벨)이고,
   교정 전 빗나간 것들은 36~55px 였다. 25px 는 그 사이를 가른다. */
const AIM_TOLERANCE_PX = 25;

describe('도표 합성 파이프 — 원화 지문', () => {
  it('매니페스트와 원화가 1:1 로 대응한다', () => {
    const inMan = new Set(figures.map(([id]) => id));
    const missing = sources.filter((id) => !inMan.has(id));
    const orphan = [...inMan].filter((id) => !sources.includes(id));
    expect(missing, `원화는 있는데 매니페스트에 없다(overlay 재실행 필요): ${missing.join(' | ')}`).toEqual([]);
    expect(orphan, `매니페스트에만 있고 원화가 없다: ${orphan.join(' | ')}`).toEqual([]);
  });

  it('원화 지문이 매니페스트와 일치한다 — 그림만 갈아끼우고 좌표를 안 본 상태를 막는다', () => {
    const drift: string[] = [];
    for (const [id, f] of figures) {
      const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(SRC, `${id}.png`))).digest('hex').slice(0, 16);
      if (sha !== f.sha256) drift.push(`${id} (매니페스트 ${f.sha256} ≠ 실제 ${sha})`);
    }
    expect(
      drift,
      `원화가 바뀌었다 ${drift.length}건. 라벨 좌표는 원화 구도에 매여 있으므로 그림만 바꾸면 화살표가 어긋난다.\n` +
        `  python scripts/overlay-figure-labels.py 로 다시 그린 뒤 **결과를 눈으로 확인**하고 매니페스트를 갱신할 것.\n  ${drift.join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('도표 합성 파이프 — 화살표가 실제 대상을 가리킨다', () => {
  it('모든 지시점이 특징 화소 위에 있다 (빈 배경 지목 금지)', () => {
    const bad: string[] = [];
    for (const [id, f] of figures) {
      for (const lb of f.labels) {
        if (lb.dist_px > AIM_TOLERANCE_PX) {
          bad.push(`${id} "${lb.s}" at(${lb.at.join(',')}) — 가장 가까운 특징까지 ${lb.dist_px}px`);
        }
      }
    }
    expect(bad, `허공을 가리키는 라벨 ${bad.length}건:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('지시점이 그림 안에 있다', () => {
    const bad: string[] = [];
    for (const [id, f] of figures) {
      for (const lb of f.labels) {
        const [x, y] = lb.at;
        if (x < 0 || x > 1 || y < 0 || y > 1) bad.push(`${id} "${lb.s}" at(${x},${y})`);
      }
    }
    expect(bad, `그림 밖을 가리키는 라벨: ${bad.join(' | ')}`).toEqual([]);
  });

  it('라벨 없는 도표는 없다 — 글자 없는 원화를 그대로 내보내는 것을 막는다', () => {
    const empty = figures.filter(([, f]) => !f.labels.length).map(([id]) => id);
    expect(empty, `라벨이 하나도 없는 도표: ${empty.join(' | ')}`).toEqual([]);
  });
});

describe('도표 합성 파이프 — 산출물', () => {
  it('원화마다 합성 결과 PNG 가 있다', () => {
    const missing = figures.filter(([id]) => !fs.existsSync(path.join(OUT, `${id}.png`))).map(([id]) => id);
    expect(missing, `합성 결과가 없는 도표: ${missing.join(' | ')}`).toEqual([]);
  });

  it('원화는 가로 1600px 이상이다 (README 규약 — 확대해도 뭉개지지 않게)', () => {
    const small = figures.filter(([, f]) => f.src_size[0] < 1600).map(([id, f]) => `${id} ${f.src_size.join('x')}`);
    expect(small, `가로가 부족한 원화: ${small.join(' | ')}`).toEqual([]);
  });
});
