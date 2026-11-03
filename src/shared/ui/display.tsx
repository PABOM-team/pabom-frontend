import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "./button";
import { ExclamationCircleIcon } from "./icons";

/** 동그란 사진. 사진이 없으면 회색 자리 */
export function Avatar({
  src,
  alt = "",
  size = 52,
  className,
  children,
}: {
  src?: string | null;
  alt?: string;
  size?: 28 | 38 | 52 | 56 | 64 | 72;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-input bg-placeholder text-body-md text-muted-foreground",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // 서명 URL·data URL이라 next/image 최적화를 쓰지 않는다
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        children
      )}
    </span>
  );
}

/** 네모난 사진 자리 (Figma 이미지 자리: 점선 + '사진') */
export function PhotoBox({
  src,
  label = "사진",
  className,
}: {
  src?: string | null;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border-[1.5px] border-dashed border-input bg-placeholder text-body-md text-subtle-foreground",
        src && "border-solid",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        label
      )}
    </span>
  );
}

export type BadgeTone = "primary" | "info" | "success" | "warning" | "danger" | "contrast" | "hint";
export type BadgeSize = "sm" | "md" | "lg";
export type BadgeShape = "pill" | "square";

/** Figma Badge: 색 16% 바탕(hint 는 8%) + 같은 색 글자 */
const BADGE_TONE: Record<BadgeTone, string> = {
  primary: "bg-primary/16 text-primary",
  info: "bg-info/16 text-info",
  success: "bg-success/16 text-success",
  warning: "bg-warning/16 text-warning",
  danger: "bg-destructive/16 text-destructive",
  contrast: "bg-gray-800/16 text-gray-800",
  hint: "bg-gray-500/8 text-gray-500",
};

/** sm 20px/10 · md 24px/12 · lg 32px/14 */
const BADGE_SIZE: Record<BadgeSize, string> = {
  sm: "h-5 gap-0.5 px-1.5 text-body-sm",
  md: "h-6 gap-1 px-2 text-body-md",
  lg: "h-8 gap-1.5 px-3 text-body-lg",
};

/** 작은 배지 (Figma Badge) */
export function Badge({
  tone = "hint",
  size = "sm",
  shape = "pill",
  children,
  className,
}: {
  tone?: BadgeTone;
  size?: BadgeSize;
  shape?: BadgeShape;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap",
        shape === "pill" ? "rounded-full" : "rounded-md",
        BADGE_SIZE[size],
        BADGE_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({
  className,
  label = "불러오는 중",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-label={label} className={cn("inline-flex", className)}>
      <span className="size-6 animate-spin rounded-full border-[2.5px] border-input border-t-primary" />
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} aria-hidden />;
}

/** 회색 안내 상자 (기록 방식 안내, 면책 문구 등) */
export function InfoBox({
  children,
  tone = "gray",
  className,
}: {
  children: ReactNode;
  tone?: "gray" | "primary";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md px-3 py-2.5 text-body-md leading-relaxed",
        tone === "gray" ? "bg-muted text-secondary-text" : "bg-primary-soft text-secondary-text",
        className,
      )}
    >
      {children}
    </div>
  );
}

type StateAction = { label: string; onClick: () => void; variant?: "primary" | "outline" };

/**
 * 화면·영역 오류와 빈 상태 (C1).
 * compact면 Figma C1처럼 작은 버튼 하나(빈 화면은 파랑, 오류는 테두리)
 */
export function StateMessage({
  title,
  description,
  icon,
  action,
  secondaryAction,
  compact = false,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: StateAction;
  secondaryAction?: StateAction;
  compact?: boolean;
  className?: string;
}) {
  const renderAction = (a: StateAction, fallback: "primary" | "outline", first: boolean) => (
    <Button
      variant={(a.variant ?? fallback) === "primary" ? "default" : "outline"}
      size={compact ? "md" : "lg"}
      className={cn(compact ? "mt-4 px-4" : "w-54", !compact && (first ? "mt-5" : "mt-2"))}
      onClick={a.onClick}
    >
      {a.label}
    </Button>
  );

  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {icon !== null ? (
        <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon ?? <ExclamationCircleIcon className="size-5" />}
        </span>
      ) : null}
      <p className="text-body-xl font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1.5 text-body-lg leading-relaxed whitespace-pre-line text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? renderAction(action, "primary", true) : null}
      {secondaryAction ? renderAction(secondaryAction, "outline", false) : null}
    </div>
  );
}

/** 가로 정보 줄 (생애 단계 · 준성체) */
export function InfoRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-11.5 items-center border-b border-border py-2.5 text-body-lg">
      <span className="w-26 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-foreground">{children}</span>
    </div>
  );
}

/** 단계 표시 (1/4 · 분류 + 막대) */
export function StepProgress({
  step,
  total,
  label,
}: {
  step: number;
  total: number;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-body-lg font-semibold text-primary">
        {step}/{total} · {label}
      </p>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn("h-[3px] flex-1 rounded-full", i < step ? "bg-primary" : "bg-gray-200")}
          />
        ))}
      </div>
    </div>
  );
}

/** 칸 나눔 탭 (이용약관 / 개인정보 처리방침, 8월 / 9월 / 10월) */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex overflow-hidden rounded-md border border-input"
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 flex-1 text-body-lg",
              index > 0 && "border-l border-input",
              selected
                ? "bg-primary-soft font-semibold text-primary"
                : "bg-background text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** 불러오기 실패 (C1-2). Figma에 따로 화면이 없는 목록·상세의 실패도 이 모양으로 */
export function LoadError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  return (
    <StateMessage
      compact
      icon={<span className="text-body-xl font-bold">!</span>}
      title="불러오지 못했어요"
      description="인터넷 연결을 확인하고 다시 시도해 주세요."
      action={{ label: "다시 불러오기", onClick: onRetry, variant: "outline" }}
      className={className}
    />
  );
}
