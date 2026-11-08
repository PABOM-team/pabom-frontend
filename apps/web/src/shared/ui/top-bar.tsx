"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { ChevronLeftIcon, XIcon } from "./icons";

type TopBarProps = {
  title?: ReactNode;
  /** back: ‹ 뒤로, close: × 닫기(왼쪽), none: 없음 */
  leading?: "back" | "close" | "none";
  onLeading?: () => void;
  /** 이전 화면이 없을 때(바로 들어온 경우) 갈 곳 */
  fallbackHref?: string;
  trailing?: ReactNode;
  className?: string;
};

/** 화면 위 제목 줄 (52px). 좌우 여백은 그리드 20에 맞추고, 아이콘 버튼은 44px 터치 타깃 */
export function TopBar({
  title,
  leading = "back",
  onLeading,
  fallbackHref = "/home",
  trailing,
  className,
}: TopBarProps) {
  const router = useRouter();
  const goBack = () => {
    if (onLeading) return onLeading();
    if (window.history.length > 1) router.back();
    else router.replace(fallbackHref);
  };

  return (
    <header
      className={cn(
        "flex h-13 shrink-0 items-center gap-1 bg-background px-2 pt-[env(safe-area-inset-top)]",
        leading === "none" && "pl-gutter",
        className,
      )}
    >
      {leading !== "none" && (
        <button
          type="button"
          onClick={goBack}
          aria-label={leading === "back" ? "뒤로" : "닫기"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
        >
          {leading === "back" ? (
            <ChevronLeftIcon className="size-6" />
          ) : (
            <XIcon className="size-6" />
          )}
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-title-xs text-foreground">{title}</h1>
      {trailing ? <div className="flex shrink-0 items-center gap-1 pr-2">{trailing}</div> : null}
    </header>
  );
}

/** 위 제목 줄 오른쪽 글자 버튼 (예: 저장, 건너뛰기) */
export function TopBarAction({ children, className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-11 rounded-md px-2 text-body-xl font-medium text-primary disabled:text-disabled-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
