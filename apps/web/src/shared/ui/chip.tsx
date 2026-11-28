"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { useSurface, type Surface } from "./surface";

type Option<T extends string | number> = { value: T; label: ReactNode; disabled?: boolean };

export type ChipTone =
  "primary" | "info" | "success" | "warning" | "danger" | "contrast" | "hint" | "border";
/** sm 20 · md 24 · lg 32 · xl 44(Figma 칩, 기본) */
export type ChipSize = "sm" | "md" | "lg" | "xl";
export type ChipShape = "pill" | "square";

/** tone 을 준 칩(꼬리표): 색을 꽉 채우고 흰 글자. border 는 흰 바탕 + gray-300 테두리 */
const CHIP_TONE: Record<ChipTone, string> = {
  primary: "bg-primary text-primary-foreground",
  info: "bg-info text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  danger: "bg-destructive text-white",
  contrast: "bg-inverse text-inverse-foreground",
  hint: "bg-muted text-secondary-text",
  border: "border border-input bg-background text-subtle-foreground active:bg-muted",
};

const CHIP_SIZE: Record<ChipSize, string> = {
  sm: "h-5 gap-1 px-1.5 text-body-sm",
  md: "h-6 gap-1 px-2 text-body-md",
  lg: "h-8 gap-1 px-3 text-body-lg",
  xl: "h-11 gap-1.5 px-5 text-body-xl",
};

/** 고르는 칩 (Figma 칩: 선택=예·아니오 × 상태=기본·눌림·비활성 × 바탕) */
const selectClass = (selected: boolean, surface: Surface) =>
  selected
    ? // 고름: 검정, 누르면 진한 그라데이션, 비활성 primary-100
      "bg-inverse font-semibold text-inverse-foreground active:bg-gradient-primary-press disabled:bg-primary-100 disabled:bg-none disabled:text-primary-foreground"
    : cn(
        // 안 고름: 회색 화면 위 흰색 · 흰 바탕 위 gray-100, 누르면 gray-200
        surface === "gray" ? "bg-card" : "bg-secondary",
        "font-medium text-foreground hover:bg-gray-200 active:bg-gray-200 disabled:bg-muted disabled:text-disabled-foreground",
      );

/**
 * 칩 (앱 chip.tsx 와 같다). tone 을 주면 그 색 꼬리표로, 아니면 고르는 칩(Figma 칩 44px):
 * 안 고름은 회색 화면에서 흰색·흰 바탕에서 gray-100, 고름은 검정, 누르면 진한 그라데이션
 */
export function Chip({
  tone,
  selected = false,
  size = "xl",
  shape = "pill",
  icon,
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  tone?: ChipTone;
  selected?: boolean;
  size?: ChipSize;
  shape?: ChipShape;
  /** 글자 왼쪽 아이콘 (18px) */
  icon?: ReactNode;
}) {
  const surface = useSurface();
  return (
    <button
      type="button"
      aria-pressed={!tone && !props.role ? selected : undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden whitespace-nowrap transition-colors outline-none",
        shape === "pill" ? "rounded-full" : "rounded-md",
        CHIP_SIZE[size],
        tone
          ? cn(CHIP_TONE[tone], "font-medium disabled:opacity-40")
          : selectClass(selected, surface),
        "focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4.5",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * 하나만 고르는 칩 묶음.
 * allowDeselect면 같은 칩을 다시 눌러 선택을 비울 수 있다 (선택 입력용)
 */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  allowDeselect = false,
  columns,
  size = "xl",
  shape = "pill",
  className,
}: {
  options: readonly Option<T>[];
  value: T | null | undefined;
  onChange: (value: T | null) => void;
  label: string;
  allowDeselect?: boolean;
  /** 2면 칸을 반씩 나눠 꽉 채운다 (급여 결과 칩) */
  columns?: 2;
  size?: ChipSize;
  shape?: ChipShape;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(columns === 2 ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Chip
            key={String(option.value)}
            role="radio"
            aria-checked={selected}
            selected={selected}
            disabled={option.disabled}
            size={size}
            shape={shape}
            className={columns === 2 ? "w-full" : undefined}
            onClick={() => onChange(selected && allowDeselect ? null : option.value)}
          >
            {option.label}
          </Chip>
        );
      })}
    </div>
  );
}
