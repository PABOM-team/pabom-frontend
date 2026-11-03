import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import { Slot } from "radix-ui";

/**
 * 버튼 (Figma Button).
 * - default(fill): sub→primary 그라데이션, hover/press 는 한 단계씩 진한 그라데이션
 * - outline: primary 2px 테두리, hover/press 는 600/700
 * - 비활성: gray-100 바탕 · gray-300 글자 (fill) / + gray-300 테두리 (outline)
 * 크기: xl = large(56) · lg = medium(44) · icon-lg = icon button(48). 나머지는 DS 밖의 보조 크기
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-transparent bg-clip-padding text-body-lg font-semibold whitespace-nowrap transition-[background,color,border-color,transform] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-primary text-primary-foreground hover:bg-gradient-primary-hover active:bg-gradient-primary-press disabled:bg-muted disabled:bg-none disabled:text-disabled-foreground",
        outline:
          "border-primary bg-background text-primary hover:border-primary-600 hover:text-primary-600 active:border-primary-700 active:text-primary-700 disabled:border-input disabled:bg-muted disabled:text-disabled-foreground aria-expanded:bg-primary-soft",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-gray-200 active:bg-gray-300 disabled:text-disabled-foreground",
        ghost:
          "text-foreground hover:bg-muted active:bg-gray-200 disabled:text-disabled-foreground aria-expanded:bg-muted",
        danger:
          "bg-destructive text-white hover:bg-red-600 active:bg-red-700 disabled:bg-muted disabled:text-disabled-foreground",
        destructive:
          "bg-destructive-soft text-destructive hover:bg-red-100 focus-visible:ring-destructive/20 active:bg-red-200 disabled:bg-muted disabled:text-disabled-foreground",
        inverse:
          "bg-inverse text-inverse-foreground hover:bg-gray-800 active:bg-gray-700 disabled:bg-muted disabled:text-disabled-foreground",
        kakao: "bg-kakao text-kakao-foreground hover:bg-kakao/90 disabled:opacity-50",
        link: "text-primary underline-offset-4 hover:underline disabled:text-disabled-foreground",
      },
      size: {
        default: "h-9 gap-1 px-3 [&_svg:not([class*='size-'])]:size-5",
        xs: "h-6 gap-1 rounded-sm px-2 text-body-sm [&_svg:not([class*='size-'])]:size-4",
        sm: "h-7 gap-1 rounded-md px-2.5 text-body-md [&_svg:not([class*='size-'])]:size-4",
        md: "h-9 gap-1 rounded-md px-3 text-body-lg font-bold [&_svg:not([class*='size-'])]:size-5",
        /** Figma Button / medium (44px · 모서리 12 · title-xs) */
        lg: "h-11 gap-2 px-5 text-title-xs font-bold",
        /** Figma Button / large (56px · 모서리 12 · title-xs). 하단 고정 주 버튼 */
        xl: "h-14 w-full gap-2 px-5 text-title-xs font-bold",
        icon: "size-9 rounded-md",
        "icon-sm": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-4",
        /** Figma icon button (48px · 모서리 12 · 아이콘 24) */
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
