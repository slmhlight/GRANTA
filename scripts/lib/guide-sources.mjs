/*
 * 가이드 프로즈의 **파일 목록 SSOT**.
 *
 * Guide.tsx 하나였을 때는 소비자마다 그 경로를 직접 적어도 문제가 없었다. F1 에서 챕터 본문을
 * `pages/guide/chapters/*.tsx` 로 분리하자 그 경로를 적어 둔 **여섯 곳이 한꺼번에 빈 코퍼스**를
 * 읽기 시작했다(검색 인덱스 헤딩 41→0 · 재료 링크 커버리지 238→0 · 용어→챕터 매핑 55→8).
 * 게이트가 전부 잡아 주었지만, 다음에 파일이 또 늘면 같은 일이 반복된다.
 *
 * 그래서 "가이드 본문이 어느 파일에 있나" 를 여기 한 곳에만 둔다. 소비자는 목록을 만들지 않고
 * 받아 쓴다 — 새 챕터 파일이 생겨도 자동으로 포함된다.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const GUIDE = path.join(ROOT, 'client', 'src', 'pages', 'Guide.tsx');
const CHAPTERS = path.join(ROOT, 'client', 'src', 'pages', 'guide', 'chapters');

/** 가이드 프로즈를 담은 파일 경로들 — Guide.tsx(껍데기·랜딩) + 분리된 챕터 본문 전부. */
export function guideSourceFiles() {
  const files = [GUIDE];
  if (fs.existsSync(CHAPTERS)) {
    for (const f of fs.readdirSync(CHAPTERS).sort()) {
      if (f.endsWith('.tsx')) files.push(path.join(CHAPTERS, f));
    }
  }
  return files;
}

/** 전 파일을 이어 붙인 텍스트. 줄 번호가 필요한 소비자는 guideSourceFiles() 로 개별 처리할 것. */
export function readGuideSource() {
  return guideSourceFiles().map((f) => fs.readFileSync(f, 'utf8')).join('\n');
}

/** [{ file, rel, src }] — 파일별로 따로 봐야 하는 소비자용(링크 검증 등 위치 보고가 필요한 곳). */
export function readGuideSourceParts() {
  return guideSourceFiles().map((file) => ({
    file,
    rel: path.relative(ROOT, file).split(path.sep).join('/'),
    src: fs.readFileSync(file, 'utf8'),
  }));
}

/*
 * **프로즈 전용** — 코드 주석을 제거한 소스.
 *
 * 감사·커버리지 코퍼스는 "사용자가 읽는 글" 이어야 한다. 주석은 코드다. 파일이 하나였을 때는
 * 주석이 코퍼스에 섞여도 눈에 안 띄었는데, F1 로 챕터 14 파일이 같은 헤더 주석을 갖게 되자
 * 주석 문구 하나가 **14 회 언급된 신조어**로 집계돼 "미정의 용어" 로 잡혔다.
 * 그 자리에서 문구만 바꾸면 구멍은 그대로 남으므로, 코퍼스 쪽을 고친다.
 */
export function readGuideProse() {
  return guideSourceFiles()
    .map((f) => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ''))
    .join(String.fromCharCode(10));
}

/*
 * 챕터 단위 본문 — 메타데이터(n·id·title·learn)는 Guide.tsx 의 <Chapter> 태그가 SSOT 이고,
 * 본문은 분리된 chapters/<id>.tsx 에 있다. 이어 붙인 통짜 텍스트로는 **챕터 경계가 사라져서**
 * 헤딩이 전부 마지막 챕터로 귀속된다(실제로 41 헤딩이 전부 chGloss 로 붙었다) — 그래서
 * 소비자는 이 함수로 챕터별로 받아 간다.
 */
export function guideChapters() {
  const guide = fs.readFileSync(GUIDE, 'utf8');
  const chapRe = /<Chapter\s+n=\{(\d+)\}\s+id="([^"]+)"\s+title="([^"]+)"/g;
  const chaps = [];
  let m;
  while ((m = chapRe.exec(guide))) chaps.push({ n: Number(m[1]), id: m[2], title: m[3], at: m.index });
  return chaps.map((c, i) => {
    /* 여는 태그부터 다음 챕터까지 = learn[] 등 인라인 부분. 분리된 본문이 있으면 이어 붙인다
       (chGloss 처럼 본문이 한 줄이라 안 뺀 챕터는 인라인만으로 충분하다). */
    const inline = guide.slice(c.at, i + 1 < chaps.length ? chaps[i + 1].at : guide.length);
    const f = path.join(CHAPTERS, c.id + '.tsx');
    const body = fs.existsSync(f) ? [inline, fs.readFileSync(f, 'utf8')].join('\n') : inline;
    return { n: c.n, id: c.id, title: c.title, body };
  });
}
