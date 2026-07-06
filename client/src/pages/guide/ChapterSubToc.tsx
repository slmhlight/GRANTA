/*
 * R227/E14/H7 — 챕터별 상세 목차(sub-TOC).
 * 활성 챕터(<section id={section}>)의 h3 소제목을 스캔해 앵커 목차를 렌더.
 * h3 에 id 가 없으면 슬러그로 부여(스크롤 타깃). 섹션 2개 미만이면 숨김.
 */
import { useEffect, useState } from 'react';
import { List } from 'lucide-react';

const slug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'sec';

export function ChapterSubToc({ section }: { section: string }) {
  const [items, setItems] = useState<Array<{ id: string; text: string }>>([]);

  useEffect(() => {
    // 챕터 콘텐츠가 마운트된 뒤 h3 스캔 (라우팅 전환 후 살짝 지연 허용).
    let cancelled = false;
    const scan = () => {
      const root = document.getElementById(section);
      if (!root) { if (!cancelled) setItems([]); return; }
      const hs = Array.from(root.querySelectorAll('h3'));
      const list = hs.map((h, i) => {
        const text = (h.textContent || '').trim() || `섹션 ${i + 1}`;
        let id = h.id;
        if (!id) { id = `s-${slug(text)}-${i}`; h.id = id; }
        h.classList.add('scroll-mt-20');
        return { id, text };
      });
      if (!cancelled) setItems(list);
    };
    scan();
    const t = setTimeout(scan, 150); // 지연 렌더(차트 등) 대비 한 번 더
    return () => { cancelled = true; clearTimeout(t); };
  }, [section]);

  if (items.length < 2) return null;

  return (
    <nav className="rounded-lg border border-accent/25 bg-accent/5 p-3 mb-6">
      <p className="text-[11px] font-bold uppercase tracking-wide text-accent mb-1.5 flex items-center gap-1.5">
        <List className="w-3.5 h-3.5" /> 이 챕터의 목차
      </p>
      <ol className="space-y-0.5 sm:columns-2 sm:gap-4">
        {items.map((it) => (
          <li key={it.id} className="break-inside-avoid">
            <a
              href={`#${it.id}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(it.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', `#${it.id}`); }}
              className="block text-[12.5px] leading-snug text-foreground/75 hover:text-accent hover:underline underline-offset-2 py-0.5"
            >
              {it.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
