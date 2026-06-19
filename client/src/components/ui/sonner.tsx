import { useEffect, useState } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  // 다크모드 영구 금지 (memory/feedback_no_dark_mode) — theme 고정 'light'. next-themes 의존 제거.
  const theme = "light";
  /** 라운드 14 — 모바일에서 토스트가 화면 하단의 bottom action bar (h≈46px) 와 겹치지 않게
   *  bottom-center + offset 으로 약간 위로. 데스크탑은 기본 (bottom-right) 유지. */
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setIsMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={isMobile ? 'bottom-center' : 'bottom-right'}
      offset={isMobile ? 60 : 16}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        // R62 — sonner default description 색이 너무 옅음 (muted-foreground/50).
        //   foreground/85 + leading 보강 → 본문 가독성 ↑. title 은 그대로 유지.
        classNames: {
          description: '!text-foreground/85 !leading-relaxed !text-[13px]',
          title: '!text-foreground !font-semibold',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
