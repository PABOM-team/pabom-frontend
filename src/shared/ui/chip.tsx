"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type Option<T extends string | number> = { value: T; label: ReactNode; disabled?: boolean };

export type ChipTone =
  "primary" | "info" | "success" | "warning" | "danger" | "contrast" | "hint" | "border";
export type ChipSize = "sm" | "md" | "lg";
export type ChipShape = "pill" | "square";

/** Figma Chip: 색을 꽉 채우고 흰 글자. border 는 흰 바탕 + gray-300 테두리 */
const CHIP_TONE: Record<ChipTone, string> = {
  primary: "bg-primary text-primary-foreground",
  info: "bg-info text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  danger: "bg-destructive text-white",
  contrast: "bg-inverse text-inverse-foreground",
  hint: "bg-muted text-secondary-text",
  border: "border border-input bg-background text-subtle-foreground",
};

/** sm 20px/10 · md 24px/12 · lg 32px/14 */
const CHIP_SIZE: Record<ChipSize, string> = {
  sm: "h-5 gap-0.5 px-1.5 text-body-sm",
  md: "h-6 gap-1 px-2 text-body-md",
  lg: "h-8 gap-1.5 px-3 text-body-lg",
};

/**
 * 하나만 고르는 칩 묶음 (고르면 primary 로 꽉 채움, 아니면 테두리).
 * allowDeselect면 같은 칩을 다시 눌러 선택을 비울 수 있다 (선택 입력용)
 */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  allowDeselect = false,
  columns,
  size = "lg",
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

/**
 * 칩 (Figma Chip). tone 을 주면 그 색으로, 아니면 selected 에 따라 primary / border.
 * 터치 타깃은 44px 보다 작으니 목록 안에서 gap 을 충분히 둔다
 */
export function Chip({
  tone,
  selected,
  size = "lg",
  shape = "pill",
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  tone?: ChipTone;
  selected?: boolean;
  size?: ChipSize;
  shape?: ChipShape;
}) {
  const resolvedTone = tone ?? (selected ? "primary" : "border");
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors outline-none",
        shape === "pill" ? "rounded-full" : "rounded-md",
        CHIP_SIZE[size],
        CHIP_TONE[resolvedTone],
        "focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40",
        resolvedTone === "border" && "hover:bg-muted",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
