/*
 * W4-6 — 참고문헌(ref) 안의 URL·DOI 자동 앵커화.
 *
 * 실측 먼저: 스토리 ref 710 · 글로서리 ref 367 중 **URL/DOI 를 담은 것은 6건뿐**이다.
 * 대부분은 서지 인용(저자·제목·연도)이라 링크로 바꿀 대상이 애초에 없다 —
 * 계획서가 적은 "스토리 663·글로서리 314" 는 링크 수가 아니라 ref 총수였다.
 *
 * 그래서 이 모듈은 큰 기능이 아니라 **렌더러의 정직성**이다: ref 에 URL 이 들어오면
 * 클릭 가능해야 하고, 없으면 아무것도 바꾸지 않는다. 앞으로 URL 을 단 ref 가 추가돼도 그냥 동작한다.
 */

/** ref 한 줄을 텍스트/링크 조각으로 자른다. 링크가 없으면 조각 하나(text)만 돌려준다. */
export type RefSegment = { kind: 'text'; s: string } | { kind: 'link'; s: string; href: string };

/* URL 은 흔히 괄호 안에 온다: `... exhibit notes (https://airandspace.si.edu/...)`.
   닫는 괄호·마침표·쉼표는 주소가 아니라 문장부호이므로 링크에서 뺀다. */
const URL_OR_DOI = /\bhttps?:\/\/[^\s<>()]+|(?:\bdoi:\s*|\bhttps?:\/\/doi\.org\/)10\.\d{4,9}\/[^\s<>()]+/gi;
const TRAILING_PUNCT = /[.,;:)\]]+$/;

export function splitRefLinks(text: string | null | undefined): RefSegment[] {
  const src = String(text ?? '');
  if (!src) return [];
  const out: RefSegment[] = [];
  let last = 0;
  URL_OR_DOI.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_OR_DOI.exec(src)) !== null) {
    let hit = m[0];
    const trail = hit.match(TRAILING_PUNCT)?.[0] ?? '';
    if (trail) hit = hit.slice(0, hit.length - trail.length);
    if (!hit) continue;
    if (m.index > last) out.push({ kind: 'text', s: src.slice(last, m.index) });
    const href = /^doi:/i.test(hit) ? `https://doi.org/${hit.replace(/^doi:\s*/i, '')}` : hit;
    out.push({ kind: 'link', s: hit, href });
    last = m.index + hit.length;
  }
  if (last < src.length) out.push({ kind: 'text', s: src.slice(last) });
  return out.length ? out : [{ kind: 'text', s: src }];
}

/** ref 한 줄 렌더 — URL/DOI 만 앵커로, 나머지는 그대로. */
export function RefText({ text }: { text: string }) {
  const segs = splitRefLinks(text);
  return (
    <>
      {segs.map((seg, i) =>
        seg.kind === 'link' ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline break-all"
          >{seg.s}</a>
        ) : (
          <span key={i}>{seg.s}</span>
        ),
      )}
    </>
  );
}
