"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { PawPrintIcon } from "./icons";
import { SurfaceProvider } from "./surface";

/**
 * 회색 바탕 + 흰 묶음 카드 화면의 부품 (설정·개체 목록 등, 앱 screens/settings/settings-ui.tsx).
 * 이런 화면은 좌우 여백이 gutter(20) 대신 16 이다 → ScreenBody className="px-4"
 */
export const PAGE_PADDING = 16;

/** 회색 바탕 위 묶음 제목 (알림 · 정보 · 내 개체). body-lg semibold gray-700 */
export function SectionLabel({
  children,
  inGap = false,
  className,
}: {
  children: ReactNode;
  /** 부모가 gap 으로 줄 간격을 줄 때 (위아래 여백을 빼고 위에 2만) */
  inGap?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-body-lg font-semibold text-secondary-text",
        inGap ? "mt-0.5" : "my-3",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * 흰 묶음 카드 (Figma 묶음: 모서리 20). 위아래 여백은 줄(GroupRow) 안에 있어
 * 맨 위·아래 줄을 누르면 눌림 색이 카드 끝까지 찬다. 안은 흰 바탕(surface="white")
 */
export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <SurfaceProvider value="white">
      <div className={cn("overflow-hidden rounded-2xl bg-card", className)}>{children}</div>
    </SurfaceProvider>
  );
}

const ROW =
  "relative flex min-h-13.5 w-full items-center gap-3 px-4 py-3.5 text-left outline-none focus-visible:bg-muted";
const PRESSABLE = "transition-colors hover:bg-muted active:bg-muted";

/**
 * 묶음 안 한 줄 (54px · 좌우 16 · 사이 12). divider 면 위에 안쪽 구분선 (dividerInset 부터, 오른쪽 16).
 * href 면 링크, onClick 이면 버튼, 둘 다 없으면 그냥 줄
 */
export function GroupRow({
  children,
  href,
  onClick,
  divider = false,
  dividerInset = 16,
  disabled,
  className,
  ...props
}: {
  children: ReactNode;
  href?: ComponentProps<typeof Link>["href"];
  onClick?: () => void;
  divider?: boolean;
  /** 구분선이 시작하는 왼쪽 위치(px). 사진이 있는 줄은 사진 오른쪽부터 */
  dividerInset?: number;
  disabled?: boolean;
  className?: string;
  role?: string;
  "aria-label"?: string;
  "aria-checked"?: boolean;
}) {
  const line = divider ? (
    <span
      aria-hidden
      className="pointer-events-none absolute top-0 right-4 h-px bg-border"
      style={{ left: dividerInset }}
    />
  ) : null;

  if (href && !disabled) {
    return (
      <Link href={href} className={cn(ROW, PRESSABLE, className)} {...props}>
        {line}
        {children}
      </Link>
    );
  }
  if (onClick || href) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(ROW, !disabled && PRESSABLE, className)}
        {...props}
      >
        {line}
        {children}
      </button>
    );
  }
  return (
    <div className={cn(ROW, className)} {...props}>
      {line}
      {children}
    </div>
  );
}

/** 줄 가운데 글 두 줄 (제목 body-xl semibold + 보조 글 body-md gray-500). dim 이면 흐리게 */
export function RowText({
  title,
  description,
  dim = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  dim?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span
        className={cn(
          "truncate text-body-xl font-semibold",
          dim ? "text-subtle-foreground" : "text-foreground",
        )}
      >
        {title}
      </span>
      {description ? (
        <span
          className={cn(
            "line-clamp-2 text-body-md",
            dim ? "text-subtle-foreground" : "text-muted-foreground",
          )}
        >
          {description}
        </span>
      ) : null}
    </span>
  );
}

/** 44px 동그란 사진. 사진이 없으면 발자국 (Figma 기본 프로필) */
export function RoundThumb({ src, dim = false }: { src?: string | null; dim?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
        dim && "opacity-45",
      )}
    >
      {src ? (
        // 서명 URL 이라 next/image 최적화를 쓰지 않는다
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <PawPrintIcon className="size-6.5 text-subtle-foreground" />
      )}
    </span>
  );
}
