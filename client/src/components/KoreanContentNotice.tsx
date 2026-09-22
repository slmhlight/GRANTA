/*
 * AUD F23 잔여 (2026-09-22) — 한국어 전용 문서(가이드·Tools 본문)의 지원 범위 표시.
 *
 * 탐색기 UI 는 KO/EN 이지만 학습 가이드·계산기 설명은 한국어로만 쓰여 있다. EN 사용자에게 그 사실을 숨기지 않고
 * 한 줄로 알리고, 본문 컨테이너에는 lang="ko" 를 붙여(부모 html 은 en) 스크린리더가 언어를 바꿔 읽게 한다.
 */
import { useLang } from '@/lib/i18n';

export function KoreanContentNotice({ what = 'page' }: { what?: string }) {
  const { lang } = useLang();
  if (lang !== 'en') return null;
  return (
    <div role="note" lang="en" data-testid="korean-content-notice" className="mx-auto max-w-5xl px-5 pt-4">
      <p className="rounded border border-amber-300 bg-amber-50 text-amber-900 text-[12px] px-3 py-2 leading-relaxed">
        <b>Korean-language content.</b> This {what} is written in Korean; the explorer UI, property tables and tooltips are bilingual, but the
        learning guide and calculator explanations are Korean-only. Numbers, symbols and formulas are language-independent — your browser's
        translate feature works on this page.
      </p>
    </div>
  );
}
