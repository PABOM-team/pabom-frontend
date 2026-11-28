"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { cn } from "@/shared/lib/utils";

type ToastAction = {
  label: string;
  onClick: () => void;
  /** 누를 수 없는 행동. 왜 못 하는지 메시지로 알릴 때 (QA T05-08) */
  disabled?: boolean;
};
type ToastItem = {
  id: number;
  message: string;
  action?: ToastAction;
  /** ms. 되돌리기 같은 행동이 있으면 5초 (FL-02) */
  duration: number;
};

type ToastState = {
  current: ToastItem | null;
  show: (message: string, options?: { action?: ToastAction; duration?: number }) => void;
  dismiss: () => void;
};

let seq = 0;

const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (message, options) =>
    set({
      current: {
        id: ++seq,
        message,
        action: options?.action,
        duration: options?.duration ?? (options?.action ? 5000 : 3000),
      },
    }),
  dismiss: () => set({ current: null }),
}));

/** 화면 아래 검은 토스트 (Figma 토스트, C3 · 앱 toast.tsx 와 같다). 한 번에 하나만 보인다 */
export const toast = (message: string, options?: { action?: ToastAction; duration?: number }) =>
  useToastStore.getState().show(message, options);

export function Toaster() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(dismiss, current.duration);
    return () => window.clearTimeout(timer);
  }, [current, dismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-gutter bottom-[calc(96px+env(safe-area-inset-bottom))] z-60 flex justify-center"
    >
      {current ? (
        <div
          key={current.id}
          role="status"
          className={cn(
            // Figma 토스트: gray-900 · 모서리 12 · 14/12 여백 · 글 body-md medium
            "pointer-events-auto flex min-h-10 w-full items-center gap-2.5 rounded-lg bg-inverse px-3.5 py-3 text-body-md font-medium text-inverse-foreground shadow-md",
            // Figma 프로토타입: 아래에서 밀려 들어온다 (MOVE_IN 0.3s ease-out)
            "animate-in duration-300 ease-out fade-in-0 slide-in-from-bottom-6",
          )}
        >
          <span className="min-w-0 flex-1">{current.message}</span>
          {current.action ? (
            <button
              type="button"
              disabled={current.action.disabled}
              className="shrink-0 font-semibold text-primary-300 disabled:opacity-40"
              onClick={() => {
                current.action?.onClick();
                dismiss();
              }}
            >
              {current.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
