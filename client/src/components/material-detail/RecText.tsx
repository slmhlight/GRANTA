/*
 * R177 — Recommendation Text Renderer.
 *
 * 권고 string 안의 ASCII art table (┌─┬─┐ 구조) 을 React <table> 로 변환.
 * 일반 text 는 whitespace-pre-line 으로 줄바꿈 유지.
 *
 * 사용자 R177 요청 — "표 형식이 마크다운 형식으로 들어가 있으나 실제로는 적용 안되고 있음."
 * 한국어 character 가 monospace font 에서도 정렬 안 맞아, ASCII table 을 실제 <table> 로 변환.
 *
 * 사용 — 기존 <p className="..."> 의 inline conditional 결과를 그대로 child 로 받음:
 *   <RecText className="text-[11px] leading-relaxed">
 *     {cond1 && 'text1'}
 *     {cond2 && 'text2'}
 *   </RecText>
 */
import * as React from 'react';

type Segment = { type: 'text' | 'table'; content: string };

const BOX_CHAR = /[┌┬┐│├┼┤└┴┘]/;

function flattenToString(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenToString).join('');
  return ''; // Ignore JSX elements
}

function splitSegments(text: string): Segment[] {
  if (!text) return [];
  const lines = text.split('\n');
  const segments: Segment[] = [];
  let buf: string[] = [];
  let bufType: 'text' | 'table' = 'text';
  const flush = () => {
    if (!buf.length) return;
    while (buf.length && !buf[0].trim()) buf.shift();
    while (buf.length && !buf[buf.length - 1].trim()) buf.pop();
    if (buf.length) segments.push({ type: bufType, content: buf.join('\n') });
    buf = [];
  };
  for (const line of lines) {
    const isTable = BOX_CHAR.test(line);
    if (isTable !== (bufType === 'table')) {
      flush();
      bufType = isTable ? 'table' : 'text';
    }
    buf.push(line);
  }
  flush();
  return segments;
}

function parseAsciiTable(block: string): { headers: string[]; rows: string[][] } | null {
  const dataLines = block.split('\n').filter((l) => l.includes('│'));
  if (dataLines.length < 2) return null;
  const cells = dataLines.map((l) =>
    l
      .split('│')
      .map((s) => s.trim())
      .filter((_, i, arr) => i !== 0 && i !== arr.length - 1),
  );
  const [headers, ...rows] = cells;
  if (!headers || headers.length < 2) return null;
  const validRows = rows.filter((r) => r.length === headers.length);
  return { headers, rows: validRows };
}

function AsciiTable({ block }: { block: string }) {
  const parsed = parseAsciiTable(block);
  if (!parsed) {
    return (
      <pre className="font-mono text-[10px] leading-tight my-1 overflow-x-auto bg-white/30 rounded px-1 py-0.5">
        {block}
      </pre>
    );
  }
  return (
    <div className="my-1 overflow-x-auto">
      <table className="text-[11px] border-collapse w-fit">
        <thead>
          <tr className="bg-white/40">
            {parsed.headers.map((h, i) => (
              <th key={i} className="border border-current/30 px-1.5 py-0.5 font-semibold text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parsed.rows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white/10' : ''}>
              {r.map((c, j) => (
                <td key={j} className="border border-current/20 px-1.5 py-0.5 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * RecText — accepts either `text` prop (direct string) or `children` (inline conditional JSX).
 * Children 방식 (가장 invasive 적음) — 기존 <p> 의 conditional 그대로 사용.
 */
export function RecText({
  text,
  children,
  className,
}: {
  text?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const rawText = text != null ? text : flattenToString(children);
  const segments = React.useMemo(() => splitSegments(rawText), [rawText]);
  if (!segments.length) return null;
  return (
    <div className={className || 'text-[11px] leading-relaxed'}>
      {segments.map((seg, i) =>
        seg.type === 'table' ? (
          <AsciiTable key={i} block={seg.content} />
        ) : (
          <div key={i} className="whitespace-pre-line">
            {seg.content}
          </div>
        ),
      )}
    </div>
  );
}

/** Helper — join multiple recommendation strings (filter falsy first). */
export function joinRecs(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join('\n\n');
}
