"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
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

/**
 * 화면 위 제목 줄 (Figma 앱바 52px, 앱 top-bar.tsx 와 같다).
 * 왼쪽 ‹·× 24 아이콘 · 제목 body-xl semibold 왼쪽 정렬 · 오른쪽 글·아이콘.
 * 바탕은 화면 색을 그대로 비추고, 아이콘 버튼은 44px 터치 타깃을 아이콘 바깥으로 넓힌다
 */
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
        "box-content flex h-13 shrink-0 items-center gap-2 px-gutter pt-[env(safe-area-inset-top)]",
        className,
      )}
    >
      {leading !== "none" && (
        <IconButton
          aria-label={leading === "back" ? "뒤로" : "닫기"}
          onClick={goBack}
          // 44 터치 칸 안의 24 아이콘이 여백 선(gutter)에 붙도록
          className="-mr-1.5 -ml-2.5"
        >
          {leading === "back" ? <ChevronLeftIcon /> : <XIcon />}
        </IconButton>
      )}
      <h1 className="min-w-0 flex-1 truncate text-body-xl font-semibold text-foreground">
        {title}
      </h1>
      {trailing ? <div className="-mr-2.5 flex shrink-0 items-center gap-1">{trailing}</div> : null}
    </header>
  );
}

/**
 * 동그란 아이콘 버튼 (제목 줄·메뉴 트리거). 기본 44px, 누르면 gray-200.
 * 안의 svg 는 크기를 주지 않으면 24px
 */
export function IconButton({
  className,
  size = 44,
  style,
  ...props
}: ComponentProps<"button"> & {
  /** 한 변(px). 기본 44 */
  size?: number;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-foreground transition-colors outline-none hover:bg-gray-200 focus-visible:ring-3 focus-visible:ring-ring/40 active:bg-gray-200 disabled:pointer-events-none disabled:opacity-30 [&_svg:not([class*='size-'])]:size-6",
        className,
      )}
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  );
}

/** 위 제목 줄 오른쪽 글자 버튼 (예: 저장, 건너뛰기). Figma: body-lg medium · info 파랑 */
export function TopBarAction({ children, className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-11 items-center rounded-md px-2.5 text-body-lg font-medium text-info transition-opacity outline-none active:opacity-60 disabled:text-disabled-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
