/*
 * D6 — 위치 기반 legacy_id 를 지키는 상류 append-only 게이트.
 *
 * legacy_id(C_/G_/R_/CER_/CMP_/POL_)는 소스 배열의 **인덱스**로 매겨진다. 배열 중간에 항목이
 * 끼면 그 뒤 id 가 한 칸씩 밀리고, 이미 동결된 stable_id 가 다른 재료에 조용히 붙는다.
 *
 * build-registry 의 fp 게이트가 이미 이걸 잡아 빌드를 세운다. 다만 증상만 말한다 —
 * "C_0071 의 이름이 fp 와 다르다". 어느 파일 몇 번째에서 밀렸는지는 사람이 다시 찾아야 했고,
 * 실제로 두 번(R226l·R226m) 그렇게 찾았다. 이 게이트는 **원인 쪽**에서 잡는다.
 *
 * 특히 놓치기 쉬운 규칙 하나를 못박는다: supplementary 계열은 네 파일의 **연결**이다.
 *
 *     supRaw = supplementary-materials + cast-alloys + granta-datasheets + alloy-additions
 *
 * 그래서 `cast-alloys.json` 끝에 얌전히 append 해도 합쳐진 배열에서는 뒤 두 파일 앞에
 * **끼워 넣은 것**이 된다. 앞의 셋은 개수까지 고정이고, 자랄 수 있는 건 마지막 파일뿐이다.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { UPSTREAM_SOURCES, namesOf, prefixSha, divergenceRange } from '../scripts/build-upstream-freeze.mjs';

const ROOT = process.cwd();
const freeze = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'upstream-order-freeze.json'), 'utf8'));

describe('D6 — 상류 배열 append-only (위치 기반 id 보호)', () => {
  it('동결 파일이 소스를 빠짐없이 덮는다', () => {
    const missing = UPSTREAM_SOURCES.filter((s) => namesOf(s, ROOT) && !freeze.sources[s.file]).map((s) => s.file);
    expect(
      missing,
      `동결에 없는 상류 소스: ${missing.join(' | ')} — node scripts/build-upstream-freeze.mjs 로 재생성할 것`,
    ).toEqual([]);
  });

  it('기존 항목의 순서·이름이 그대로다 (중간 삽입·재정렬·개명 차단)', () => {
    const bad: string[] = [];
    for (const src of UPSTREAM_SOURCES) {
      const rec = freeze.sources[src.file];
      const names = namesOf(src, ROOT);
      if (!rec || !names) continue;
      if (names.length < rec.frozen_count) {
        bad.push(`${src.file}: ${rec.frozen_count} → ${names.length} 로 줄었다 (삭제는 뒤 id 를 앞으로 당긴다)`);
        continue;
      }
      if (prefixSha(names, rec.frozen_count) !== rec.prefix_sha) {
        /* 어디서 갈렸는지 구간으로 짚어 준다 — fp 게이트가 못 하던 부분. */
        const [lo, hi] = divergenceRange(rec, names);
        bad.push(`${src.file}: 앞 ${rec.frozen_count}개가 동결본과 다르다 (${rec.gives}) — idx ${lo}~${hi} 구간, 현재 그 자리 "${names[lo]}"`);
      }
    }
    expect(
      bad,
      `상류 순서가 어긋났다 ${bad.length}건 — legacy_id 가 밀려 stable_id 가 다른 재료에 붙는다.\n  ${bad.join('\n  ')}\n`
        + '  의도된 변경이면 node scripts/build-upstream-freeze.mjs 재생성 + 영향 범위를 커밋에 남길 것.',
    ).toEqual([]);
  });

  it('연결 앞쪽 파일은 자라지 않는다 (자라면 뒤 파일의 R_ id 가 전부 밀린다)', () => {
    const bad: string[] = [];
    for (const src of UPSTREAM_SOURCES.filter((s) => s.growth === 'frozen')) {
      const rec = freeze.sources[src.file];
      const names = namesOf(src, ROOT);
      if (!rec || !names) continue;
      if (names.length !== rec.frozen_count) {
        bad.push(`${src.file}: ${rec.frozen_count} → ${names.length} (${src.gives})`);
      }
    }
    expect(
      bad,
      `연결 중간 파일이 커졌다 ${bad.length}건 — 끝에 붙여도 합쳐진 배열에서는 중간 삽입이다.\n  ${bad.join('\n  ')}\n`
        + '  신규 entry 는 alloy-additions.json 끝에만 append 할 것.',
    ).toEqual([]);
  });

  it('마지막 파일(alloy-additions)만 성장 허용으로 표시돼 있다', () => {
    /* 규약 자체가 낡는 것을 막는다 — 연결 순서가 바뀌면 'frozen' 표시도 같이 바뀌어야 한다. */
    const chain = UPSTREAM_SOURCES.filter((s) => String(s.gives).includes('연결'));
    expect(chain.length, '연결 체인이 4개여야 한다 (build-materials 의 supRaw 조립 순서)').toBe(4);
    expect(chain.slice(0, 3).every((s) => s.growth === 'frozen'), '연결 앞 3개는 frozen 이어야 한다').toBe(true);
    expect(chain[3].growth, '연결 마지막만 append 허용').toBe('append');
    expect(chain[3].file).toBe('alloy-additions.json');
  });
});
