// @vitest-environment jsdom
/*
 * AUD-3 D02 (2026-09-22) — 범위 검색의 로딩 상태 고지.
 * 로직(어떤 질의가 전량 데이터를 요구하는가)은 tests/audit-deep-2026-09-22.test.ts 가 고정하고,
 * 여기서는 "말해야 할 때 실제로 말하는가"(로딩 중 문구·실패 시 재시도)를 고정한다.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PartialDataNotice } from '@/components/PartialDataNotice';
import { LanguageProvider } from '@/lib/i18n';

const renderIn = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);
afterEach(cleanup);

describe('PartialDataNotice (AUD-3 D02)', () => {
  it('로딩 중에는 "아직 확정이 아니다" 를 말한다 (재시도 버튼 없음)', () => {
    renderIn(<PartialDataNotice failed={[]} onRetry={() => {}} />);
    const el = screen.getByTestId('partial-data-notice');
    expect(el.textContent).toMatch(/확정|final/);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('샤드 로딩 실패는 어떤 카테고리인지 밝히고 재시도를 제안한다', () => {
    const onRetry = vi.fn();
    renderIn(<PartialDataNotice failed={['Metal', 'Polymer']} onRetry={onRetry} />);
    const el = screen.getByTestId('partial-data-notice');
    expect(el.textContent).toContain('Metal');
    expect(el.textContent).toContain('Polymer');
    fireEvent.click(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('status 역할로 알려 준다 (스크린리더가 놓치지 않도록)', () => {
    renderIn(<PartialDataNotice failed={[]} onRetry={() => {}} />);
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
