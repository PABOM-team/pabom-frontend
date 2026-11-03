"use client";

import { Checkbox as CheckboxPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { CheckIcon, MinusIcon } from "./icons";

/**
 * 칸 제목 + 내용 + 도움말/오류 (Figma Field: Label · text field · help message).
 * 제목은 body-xl medium / gray-700, 도움말은 body-md medium / gray-400 · 오류 red · 성공 green
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  success,
  children,
  className,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  success?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-body-xl font-medium text-secondary-text">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <HelpMessage tone="error" role="alert">
          {error}
        </HelpMessage>
      ) : success ? (
        <HelpMessage tone="success">{success}</HelpMessage>
      ) : hint ? (
        <HelpMessage>{hint}</HelpMessage>
      ) : null}
    </div>
  );
}

/** 칸 아래 도움말 (Figma help message) */
export function HelpMessage({
  tone = "default",
  className,
  ...props
}: ComponentProps<"p"> & { tone?: "default" | "error" | "success" }) {
  return (
    <p
      className={cn(
        "text-body-md font-medium",
        tone === "error" && "text-destructive",
        tone === "success" && "text-success",
        tone === "default" && "text-subtle-foreground",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 입력 칸 바탕 (Figma text field): 44px · 모서리 8 · gray-300 테두리 · body-lg medium.
 * focus primary · 오류 red · 성공 green · 비활성 gray-100 바탕 + gray-300 글자
 */
const fieldBox =
  "w-full rounded-md border border-input bg-background px-3 text-body-lg font-medium text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary aria-invalid:border-destructive aria-invalid:text-destructive data-[success]:border-success disabled:border-input disabled:bg-muted disabled:text-disabled-foreground";

export function Input({
  className,
  suffix,
  wrapperClassName,
  success,
  variant = "box",
  ...props
}: ComponentProps<"input"> & {
  suffix?: ReactNode;
  wrapperClassName?: string;
  /** 성공 상태 (초록 테두리) */
  success?: boolean;
  /** underline: 밑줄만 있는 칸 (Figma text field/기본, 40px) */
  variant?: "box" | "underline";
}) {
  const input = (
    <input
      data-success={success || undefined}
      className={cn(
        fieldBox,
        variant === "underline" && "h-10 rounded-none border-0 border-b",
        variant === "box" && "h-11",
        suffix && "pr-12",
        className,
      )}
      {...props}
    />
  );
  if (!suffix) return input;
  return (
    <div className={cn("relative", wrapperClassName)}>
      {input}
      <span className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center text-body-lg text-subtle-foreground [&_svg]:size-6">
        {suffix}
      </span>
    </div>
  );
}

export function Textarea({
  className,
  value,
  maxLength,
  ...props
}: ComponentProps<"textarea"> & { maxLength: number }) {
  const length = typeof value === "string" ? value.length : 0;
  // 글자 수를 다 채우면 칸과 글자 수를 빨갛게 (C2-3)
  const full = length >= maxLength;
  return (
    <div>
      <textarea
        value={value}
        maxLength={maxLength}
        rows={3}
        className={cn(
          fieldBox,
          "min-h-17 resize-none py-3",
          full && "border-destructive",
          className,
        )}
        {...props}
      />
      <HelpMessage tone={full ? "error" : "default"} className="mt-1 text-right">
        {length} / {maxLength}자
      </HelpMessage>
    </div>
  );
}

/** 칸처럼 생긴 버튼 (날짜 고르기·모프 고르기 등) */
export function FieldButton({
  children,
  placeholder,
  icon,
  className,
  ...props
}: ComponentProps<"button"> & { placeholder?: string; icon?: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        fieldBox,
        "flex h-11 items-center justify-between gap-2 text-left disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      <span className={cn("truncate", !children && "text-subtle-foreground")}>
        {children || placeholder}
      </span>
      {icon ? <span className="shrink-0 text-foreground [&_svg]:size-6">{icon}</span> : null}
    </button>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-input bg-background text-white outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:data-[state=checked]:border-input disabled:data-[state=checked]:bg-input",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        {props.checked === "indeterminate" ? (
          <MinusIcon className="size-4" strokeWidth={3} />
        ) : (
          <CheckIcon className="size-4" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-input transition-colors outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-1 rounded-full bg-white shadow-xs transition-transform data-[state=checked]:translate-x-6" />
    </SwitchPrimitive.Root>
  );
}
