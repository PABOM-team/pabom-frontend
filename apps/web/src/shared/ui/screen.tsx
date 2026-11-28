import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { SurfaceProvider } from "./surface";

/**
 * 한 화면의 뼈대. 위 제목 줄과 아래 고정 영역 사이만 스크롤된다 (앱 screen.tsx 와 같다).
 * 바탕은 Figma 화면처럼 gray-100(bg-screen)이고 그 위에 흰 카드를 올린다.
 * 흰 화면(로그인·약관 등)은 tone="white". 안의 칩·안내 상자·카드는 바탕(surface)에 맞춰 색을 바꾼다.
 * 좌우 여백은 디자인 시스템 Grid(375 기준 20px) 토큰 `gutter` 를 쓴다
 */
export function Screen({
  children,
  className,
  tone = "gray",
}: {
  children: ReactNode;
  className?: string;
  tone?: "gray" | "white";
}) {
  return (
    <SurfaceProvider value={tone}>
      <div
        data-surface={tone}
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          tone === "gray" ? "bg-screen" : "bg-background",
          className,
        )}
      >
        {children}
      </div>
    </SurfaceProvider>
  );
}

export function ScreenBody({
  children,
  className,
  flush = false,
  gap,
  style,
  ...props
}: ComponentProps<"main"> & {
  children: ReactNode;
  /** 좌우 여백 없이 (날짜 머리가 좌우 꽉 차는 목록 등) */
  flush?: boolean;
  /** 세로 간격(px). 주면 자식을 세로로 쌓는다 */
  gap?: number;
}) {
  return (
    <main
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2 pb-6",
        !flush && "px-gutter",
        // 스크롤 칸 안의 자식이 줄어들어 잘리지 않게 (RN ScrollView 내용처럼 제 높이를 지킨다)
        gap !== undefined && "flex flex-col *:shrink-0",
        className,
      )}
      style={gap !== undefined ? { rowGap: gap, ...style } : style}
      {...props}
    >
      {children}
    </main>
  );
}

/** 하단 고정 버튼 영역. 바탕은 화면 색을 그대로 비춘다 */
export function ScreenFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 px-gutter pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 스크롤 없이 세우는 본문 (가운데 정렬 상태 화면 등) */
export function ScreenCenter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col justify-center", className)}>{children}</div>
  );
}
