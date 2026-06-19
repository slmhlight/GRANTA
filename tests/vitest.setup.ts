/*
 * Vitest 공용 setup. node 환경 테스트(.test.ts 다수)에서는 window 가 없어 전부 no-op.
 * jsdom 환경(컴포넌트 .test.tsx)에서만 브라우저 API 폴리필을 채운다 (Radix/SVG 렌더용).
 */
if (typeof window !== 'undefined') {
  // matchMedia — Home/모바일 감지 등에서 사용.
  if (!window.matchMedia) {
    // @ts-expect-error 테스트 폴리필
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() { return false; },
    });
  }

  // ResizeObserver / IntersectionObserver — Radix·recharts 일부에서 참조.
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  // @ts-expect-error 테스트 폴리필
  window.ResizeObserver ||= NoopObserver;
  // @ts-expect-error 테스트 폴리필
  window.IntersectionObserver ||= NoopObserver;

  // Pointer capture / scrollIntoView — Radix Select·Tooltip 등이 호출.
  const proto = window.Element.prototype as unknown as Record<string, unknown>;
  proto.scrollIntoView ||= function scrollIntoView() {};
  proto.hasPointerCapture ||= function hasPointerCapture() { return false; };
  proto.setPointerCapture ||= function setPointerCapture() {};
  proto.releasePointerCapture ||= function releasePointerCapture() {};
}
