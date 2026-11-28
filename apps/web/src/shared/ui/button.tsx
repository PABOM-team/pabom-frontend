import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import { Slot } from "radix-ui";
import { Spinner } from "./spinner";

/**
 * 버튼 (Figma 버튼 v0.6, 앱 apps/mobile/src/shared/ui/button.tsx 와 같은 모양). 모서리 12 · 글자 semibold.
 * - default: sub→primary 그라데이션, hover 600 · 누르면 700 그라데이션, 비활성 gray-300 + 흰 글자
 * - outline: primary 1.4px 테두리, 누르면 primary-50 바탕 + 700
 * - secondary(보조): gray-100 · white(흰 보조, 회색 화면 위): 흰 바탕. 글자 gray-700
 * - ghost: 바탕 없음, 누르면 gray-200
 * - danger(위험)·inverse(검정): gray-900, 누르면 gray-800
 * - destructive: red-50 바탕 + 빨간 글자
 * - kakao·google: 소셜 로그인 (누르면 8% 검정을 덮는다)
 * - link: 글자만
 * 크기: xl 56(Figma 기본) · lg 44(Figma 작은) · md 38 · sm 28 · xs 24. default 는 md 와 같다
 */
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border-transparent font-semibold whitespace-nowrap transition-[background,color,border-color,opacity] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none aria-busy:pointer-events-none aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-primary text-primary-foreground hover:bg-gradient-primary-hover active:bg-gradient-primary-press disabled:bg-gray-300 disabled:bg-none disabled:text-primary-foreground aria-busy:bg-gradient-primary-press",
        outline:
          "border-[1.4px] border-primary bg-background text-primary hover:bg-primary-soft active:border-primary-700 active:bg-primary-soft active:text-primary-700 disabled:border-input disabled:bg-background disabled:text-disabled-foreground aria-busy:bg-primary-soft aria-expanded:bg-primary-soft",
        secondary:
          "bg-secondary text-secondary-text hover:bg-gray-200 active:bg-gray-200 disabled:bg-muted disabled:text-disabled-foreground aria-busy:bg-gray-200",
        white:
          "bg-card text-secondary-text hover:bg-secondary active:bg-secondary disabled:bg-muted disabled:text-disabled-foreground aria-busy:bg-secondary",
        ghost:
          "text-foreground hover:bg-gray-200 active:bg-gray-200 disabled:text-disabled-foreground aria-expanded:bg-gray-200",
        danger:
          "bg-inverse text-inverse-foreground hover:bg-gray-800 active:bg-gray-800 disabled:bg-gray-300 disabled:text-primary-foreground aria-busy:bg-gray-800",
        inverse:
          "bg-inverse text-inverse-foreground hover:bg-gray-800 active:bg-gray-800 disabled:bg-gray-300 disabled:text-primary-foreground aria-busy:bg-gray-800",
        destructive:
          "bg-destructive-soft text-destructive hover:bg-red-100 focus-visible:ring-destructive/20 active:bg-red-100 disabled:bg-gray-300 disabled:text-primary-foreground",
        kakao:
          "bg-kakao text-kakao-foreground after:pointer-events-none after:absolute after:inset-0 after:bg-gray-950/8 after:opacity-0 hover:after:opacity-100 active:after:opacity-100 disabled:bg-gray-300 disabled:text-primary-foreground",
        google:
          "border border-input bg-background text-foreground after:pointer-events-none after:absolute after:inset-0 after:bg-gray-950/8 after:opacity-0 hover:after:opacity-100 active:after:opacity-100 disabled:text-disabled-foreground",
        link: "h-auto! px-0! text-primary underline-offset-4 hover:underline disabled:text-disabled-foreground",
      },
      size: {
        default: "h-9.5 gap-2 px-4 text-body-lg [&_svg:not([class*='size-'])]:size-5",
        xs: "h-6 gap-1 rounded-sm px-2 text-body-sm font-medium [&_svg:not([class*='size-'])]:size-4",
        sm: "h-7 gap-1 rounded-md px-2.5 text-body-md [&_svg:not([class*='size-'])]:size-4",
        md: "h-9.5 gap-2 px-4 text-body-lg [&_svg:not([class*='size-'])]:size-5",
        /** Figma 버튼 / 작은 (44px) */
        lg: "h-11 gap-2 px-4 text-body-lg [&_svg:not([class*='size-'])]:size-5",
        /** Figma 버튼 / 기본 (56px). 하단 고정 주 버튼이라 기본으로 칸을 꽉 채운다 */
        xl: "h-14 w-full gap-2 px-4 text-body-xl [&_svg:not([class*='size-'])]:size-5",
        icon: "size-9.5 [&_svg:not([class*='size-'])]:size-5",
        "icon-sm": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-4",
        /** Figma icon button (48px · 모서리 12 · 아이콘 24) */
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

/** 진한 바탕이라 흰 스피너를 쓰는 종류 */
const DARK_FILL: readonly ButtonVariant[] = ["default", "danger", "inverse"];

function Button({
  className,
  variant = "default",
  size = "md",
  asChild = false,
  loading = false,
  icon,
  disabled,
  children,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** 저장 중: 비활성 회색이 아니라 눌린 모양 그대로 글자 대신 스피너 (Figma 상태=저장 중) */
    loading?: boolean;
    /** 글자 왼쪽 아이콘 (20px 권장). children 안에 넣어도 된다 */
    icon?: React.ReactNode;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  const resolvedVariant = variant ?? "default";
  const showSpinner = loading && !asChild;

  return (
    <Comp
      data-slot="button"
      data-variant={resolvedVariant}
      data-size={size}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      disabled={disabled}
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={
        loading ? (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault() : onClick
      }
      {...props}
    >
      {asChild ? (
        children
      ) : showSpinner ? (
        <Spinner
          tone={DARK_FILL.includes(resolvedVariant) ? "inverse" : "primary"}
          label="저장 중"
        />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants, type ButtonSize, type ButtonVariant };
