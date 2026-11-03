import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * 한 화면의 뼈대. 위 제목 줄과 아래 고정 영역 사이만 스크롤된다.
 * 좌우 여백은 디자인 시스템 Grid(375 기준 20px) 토큰 `gutter` 를 쓴다.
 */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-0 flex-1 flex-col", className)}>{children}</div>;
}

export function ScreenBody({
  children,
  className,
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  /** 좌우 여백 없이 (날짜 머리가 좌우 꽉 차는 목록 등) */
  flush?: boolean;
}) {
  return (
    <main
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2 pb-6",
        !flush && "px-gutter",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** 하단 고정 버튼 영역 */
export function ScreenFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 bg-background px-gutter pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
