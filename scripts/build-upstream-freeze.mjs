/*
 * D6 — 위치 기반 legacy_id 를 만드는 **상류 배열의 순서**를 동결한다.
 *
 * 배경: legacy_id(C_/G_/R_/CER_/CMP_/POL_)는 소스 배열의 인덱스로 매겨진다. 그래서 배열
 * 중간에 항목이 끼면 그 뒤 id 가 전부 한 칸씩 밀리고, 이미 동결된 stable_id 가 **다른 재료에
 * 조용히 붙는다**. build-registry 의 fp 게이트가 이걸 잡아 빌드를 세우지만, 증상만 말한다
 * ("C_0071 의 이름이 다르다"). 원인이 어느 파일 몇 번째인지는 사람이 다시 찾아야 했다.
 *
 * 특히 놓치기 쉬운 것: supplementary 계열은 **네 파일의 연결**이다.
 *
 *     supRaw = supplementary-materials + cast-alloys + granta-datasheets + alloy-additions
 *
 * 즉 `cast-alloys.json` 끝에 얌전히 append 해도, 합쳐진 배열에서는 granta·additions 앞에
 * **끼워 넣은 것**이라 그 뒤 R_ id 가 전부 밀린다. 그래서 마지막 파일(alloy-additions)만
 * 자랄 수 있고, 앞의 셋은 개수까지 고정이다 (build-materials.mjs 주석의 규약 —
 * "새 entry 는 alloy-additions.json 끝에만 append").
 *
 * 이 스크립트는 그 규약을 검사 가능한 형태로 굳힌다. 재생성:  node scripts/build-upstream-freeze.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(DATA, 'upstream-order-freeze.json');

/** growth: 'frozen' = 개수까지 고정(뒤 파일 id 를 밀기 때문) · 'append' = 끝에 추가 허용. */
export const UPSTREAM_SOURCES = [
  { file: 'AM_Materials_DB_enriched.csv', kind: 'csv', growth: 'append', gives: 'C_ · G_' },
  { file: 'supplementary-materials.json', kind: 'json', array: 'materials', growth: 'frozen', gives: 'R_ (연결 1/4)' },
  { file: 'cast-alloys.json', kind: 'json', array: 'materials', growth: 'frozen', gives: 'R_ (연결 2/4)' },
  { file: 'granta-datasheets.json', kind: 'json', array: 'materials', growth: 'frozen', gives: 'R_ (연결 3/4)' },
  { file: 'alloy-additions.json', kind: 'json', array: 'materials', growth: 'append', gives: 'R_ (연결 4/4 — 신규는 여기 끝에만)' },
  { file: 'ceramics-data.json', kind: 'json', array: 'ceramics', growth: 'append', gives: 'CER_' },
  { file: 'composites-data.json', kind: 'json', array: 'composites', growth: 'append', gives: 'CMP_' },
  { file: 'polymers-data.json', kind: 'json', array: 'polymers', growth: 'append', gives: 'POL_' },
];

/** 소스에서 '순서가 곧 id' 인 이름 목록을 뽑는다. 없으면 null (선택 소스). */
export function namesOf(src, root = ROOT) {
  const p = path.join(root, 'data', src.file);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf8');
  if (src.kind === 'csv') {
    // 헤더 다음 줄부터, 4번째 칸(material_name)이 순서의 신원.
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 1);
    return lines.slice(1).map((l) => (l.split(',')[3] ?? '').trim());
  }
  const arr = JSON.parse(raw)[src.array];
  return Array.isArray(arr) ? arr.map((m) => String(m?.name ?? '')) : null;
}

export const prefixSha = (names, n) => crypto.createHash('sha256').update(names.slice(0, n).join('\n')).digest('hex').slice(0, 16);

/** 256 간격 체크포인트 사다리 — 어긋났을 때 **어느 구간**에서 갈렸는지 짚기 위한 것.
 *  전체 해시 하나만 두면 "다르다" 밖에 못 말한다(fp 게이트의 한계와 같은 문제).
 *  이름 전체를 저장하기엔 3천 건이 넘어 크고, 구간만 알면 그 근처를 보면 되므로 이 정도면 충분하다. */
export const STEP = 256;
export function checkpoints(names, n) {
  const cps = [];
  for (let i = STEP; i < n; i += STEP) cps.push({ n: i, sha: prefixSha(names, i) });
  return cps;
}

/** 동결본과 현재 목록이 처음 갈리는 구간 — [이전 체크포인트, 다음 체크포인트]. */
export function divergenceRange(rec, names) {
  let lo = 0;
  for (const cp of rec.checkpoints ?? []) {
    if (prefixSha(names, cp.n) !== cp.sha) return [lo, cp.n];
    lo = cp.n;
  }
  return [lo, rec.frozen_count];
}

function main() {
  const sources = {};
  for (const src of UPSTREAM_SOURCES) {
    const names = namesOf(src);
    if (!names) { console.log(`  skip (없음): ${src.file}`); continue; }
    sources[src.file] = {
      gives: src.gives, growth: src.growth,
      frozen_count: names.length,
      prefix_sha: prefixSha(names, names.length),
      first: names[0], last: names[names.length - 1],
      checkpoints: checkpoints(names, names.length),
    };
    console.log(`  ${src.file.padEnd(34)} ${String(names.length).padStart(5)} 항목 · ${src.growth}`);
  }
  const doc = {
    _note: '위치 기반 legacy_id 를 만드는 상류 배열의 순서 동결 (D6). growth=frozen 은 개수까지 고정 — '
      + 'supRaw 가 네 파일의 연결이라 앞 파일이 자라면 뒤 파일의 R_ id 가 전부 밀린다. '
      + '신규 entry 는 alloy-additions.json 끝에만 append. 게이트: tests/upstream-append-only.test.ts. '
      + '재생성: node scripts/build-upstream-freeze.mjs (의도된 변경일 때만).',
    sources,
  };
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
  console.log(`✅ ${path.relative(ROOT, OUT)} — 소스 ${Object.keys(sources).length}`);
}

if (process.argv[1] && process.argv[1].endsWith('build-upstream-freeze.mjs')) main();
