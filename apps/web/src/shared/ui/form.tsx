"use client";

import { Checkbox as CheckboxPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { CheckIcon, MinusIcon } from "./icons";

/**
 * 칸 제목 + 내용 + 도움말/오류 (Figma 기록 폼의 칸, 앱 form.tsx 와 같다).
 * 라벨 body-lg medium gray-700 · 6 · 입력 칸 · 도움말 body-md medium gray-500 (오류 red · 성공 green)
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
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-body-lg font-medium text-secondary-text">
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

/** 칸 아래 도움말 (body-md medium · gray-500 · 오류 red · 성공 green) */
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
        tone === "default" && "text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 입력 칸 바탕 (Figma 입력 칸): 46px · 모서리 12 · gray-300 1.3px 테두리 · 흰 바탕 · body-xl regular.
 * 입력 중 primary · 오류(aria-invalid) red · 성공 green · 읽기 전용·비활성은 흐린 글자
 */
const fieldBox =
  "w-full rounded-lg border-[1.3px] border-input bg-card px-3 text-body-xl text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary aria-invalid:border-destructive data-[success]:border-success read-only:text-subtle-foreground read-only:focus:border-input disabled:text-subtle-foreground";

export function Input({
  className,
  suffix,
  wrapperClassName,
  success,
  invalid,
  variant = "box",
  "aria-invalid": ariaInvalid,
  ...props
}: ComponentProps<"input"> & {
  /** 오른쪽 단위(g)나 아이콘 */
  suffix?: ReactNode;
  wrapperClassName?: string;
  /** 성공 상태 (초록 테두리) */
  success?: boolean;
  /** 오류 상태 (빨간 테두리). aria-invalid 를 직접 줘도 된다 */
  invalid?: boolean;
  /** underline: 밑줄만 있는 칸 (40px) */
  variant?: "box" | "underline";
}) {
  const input = (
    <input
      data-success={success || undefined}
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(
        fieldBox,
        variant === "underline" &&
          "h-10 rounded-none border-0 border-b-[1.3px] bg-transparent px-0",
        variant === "box" && "h-11.5",
        suffix && "pr-10",
        className,
      )}
      {...props}
    />
  );
  if (!suffix) return input;
  return (
    <div className={cn("relative", wrapperClassName)}>
      {input}
      <span className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center text-body-xl text-muted-foreground [&_svg]:size-6">
        {suffix}
      </span>
    </div>
  );
}

/**
 * 여러 줄 입력 + 글자 수 (Figma 여러 줄 입력 · 다 참).
 * 글자 수를 다 채우면 칸과 글자 수를 빨갛게 하고 왼쪽에 'N자까지 쓸 수 있어요'
 */
export function Textarea({
  className,
  value,
  maxLength,
  invalid,
  "aria-invalid": ariaInvalid,
  ...props
}: ComponentProps<"textarea"> & { maxLength: number; invalid?: boolean }) {
  const length = typeof value === "string" ? value.length : 0;
  const full = length >= maxLength;
  return (
    <div className="flex flex-col gap-1">
      <textarea
        value={value}
        maxLength={maxLength}
        rows={3}
        aria-invalid={full || invalid || ariaInvalid || undefined}
        className={cn(fieldBox, "min-h-17.5 resize-none py-2.5", className)}
        {...props}
      />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {full ? <HelpMessage tone="error">{maxLength}자까지 쓸 수 있어요</HelpMessage> : null}
        </div>
        <HelpMessage tone={full ? "error" : "default"} className="text-right">
          {length} / {maxLength}자
        </HelpMessage>
      </div>
    </div>
  );
}

/** 칸처럼 생긴 버튼 (날짜 고르기·모프 고르기 등). 46px, 오른쪽 아이콘은 크기를 주지 않으면 24px */
export function FieldButton({
  children,
  placeholder,
  icon,
  invalid,
  className,
  "aria-invalid": ariaInvalid,
  ...props
}: ComponentProps<"button"> & { placeholder?: string; icon?: ReactNode; invalid?: boolean }) {
  return (
    <button
      type="button"
      data-invalid={invalid || ariaInvalid || undefined}
      className={cn(
        fieldBox,
        "data-[invalid]:border-destructive",
        "group/field flex h-11.5 items-center justify-between gap-2 text-left active:border-primary disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          // 버튼은 브라우저가 늘 :read-only 로 보므로 fieldBox 의 read-only 회색을 값 글자에서 되돌린다
          children ? "text-foreground" : "text-subtle-foreground",
          "group-disabled/field:text-subtle-foreground",
        )}
      >
        {children || placeholder}
      </span>
      {icon ? (
        <span className="shrink-0 text-foreground group-disabled/field:opacity-40 [&_svg:not([class*='size-'])]:size-6">
          {icon}
        </span>
      ) : null}
    </button>
  );
}

/**
 * 체크박스 (Figma 체크박스 22px · 모서리 6 · 1.6px 테두리).
 * 빈칸 gray-400 테두리 · 체크 primary · 잠김(disabled) gray-200 바탕 + gray-300 테두리
 */
export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "relative flex size-5.5 shrink-0 items-center justify-center rounded-sm border-[1.6px] border-subtle-foreground bg-card text-white outline-none",
        // 22 칸이지만 누르는 자리는 44 까지 넓힌다
        "after:absolute after:-inset-2.75 after:content-['']",
        "focus-visible:ring-3 focus-visible:ring-ring/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
        "disabled:border-input disabled:bg-gray-200 disabled:data-[state=checked]:border-input disabled:data-[state=checked]:bg-gray-200",
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

/** 체크박스 + 글 한 줄 (약관·확인 문구). 줄 전체가 눌린다 (44px) */
export function CheckboxRow({
  checked,
  onChange,
  disabled,
  children,
  className,
  textClassName,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  /** 글 색·굵기 (기본 body-lg regular gray-700) */
  textClassName?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-h-11 items-center gap-2.5", className)}>
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(on) => onChange(on === true)}
      />
      <label
        htmlFor={id}
        className={cn(
          "min-w-0 flex-1 cursor-pointer text-body-lg text-secondary-text",
          disabled && "cursor-default",
          textClassName,
        )}
      >
        {children}
      </label>
    </div>
  );
}

/** 작은 체크 글 (Figma v1.2 모름 체크): ✓ + '몰라요'. 켜면 파랑 semibold, 끄면 gray-500 */
export function CheckToggle({
  checked,
  onChange,
  label = "몰라요",
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex shrink-0 items-center gap-1 py-1 pl-1 text-body-lg transition-opacity outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:opacity-60 disabled:opacity-60",
        checked ? "font-semibold text-primary" : "font-medium text-muted-foreground",
        className,
      )}
    >
      <CheckIcon className={cn("size-4", checked ? "text-primary" : "text-subtle-foreground")} />
      {label}
    </button>
  );
}

/** 스위치 (Figma 스위치 44×26). 켬 primary · 끔 gray-300, 비활성은 primary-100 · gray-200 */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-6.5 w-11 shrink-0 items-center rounded-full bg-input transition-colors outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/40 data-[state=checked]:bg-primary",
        "disabled:bg-gray-200 disabled:data-[state=checked]:bg-primary-100",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5.5 translate-x-0.5 rounded-full bg-card shadow-xs transition-transform duration-150 data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  );
}
