"use client";

import { useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "./button";
import { ChevronDownIcon, ChevronUpIcon, ExclamationCircleIcon } from "./icons";
import {
  flipSurface,
  raisedClass,
  raisedPressedClass,
  SurfaceProvider,
  useSurface,
} from "./surface";

export { Spinner } from "./spinner";

/** 동그란 사진 (Figma 아바타 28·38·40·52·56·64·72). 사진이 없으면 primary-100 자리 */
export function Avatar({
  src,
  alt = "",
  size = 52,
  ring = false,
  className,
  children,
}: {
  src?: string | null;
  alt?: string;
  size?: 28 | 38 | 40 | 52 | 56 | 64 | 72;
  /** 고른 상태의 파란 테두리 (2.5px) */
  ring?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-body-md text-muted-foreground",
        ring && "border-[2.5px] border-primary",
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

/** 네모난 사진 (Figma 이미지 자리, 모서리 12). 사진이 없으면 gray-100 점선 + '사진' */
export function PhotoBox({
  src,
  label = "사진",
  size,
  className,
}: {
  src?: string | null;
  label?: string;
  /** 한 변(px). 안 주면 48 (className 의 size-* 로도 바꿀 수 있다) */
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg",
        src
          ? "bg-primary-100"
          : "border-[1.5px] border-dashed border-input bg-secondary text-body-md font-medium text-subtle-foreground",
        className,
      )}
      style={size !== undefined ? { width: size, height: size } : undefined}
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

/**
 * hint 회색 · contrast 검정 · primary 파랑 테두리 · outline 회색 테두리 (Figma 배지).
 * pet 은 Figma 개체 태그(primary-50 바탕 + 파란 semibold 글자).
 * info·success·warning·danger 는 색 16% 바탕
 */
export type BadgeTone =
  "pet" | "primary" | "info" | "success" | "warning" | "danger" | "contrast" | "hint" | "outline";
export type BadgeSize = "sm" | "md" | "lg";
export type BadgeShape = "pill" | "square";

const BADGE_TONE: Record<BadgeTone, string> = {
  hint: "bg-secondary text-secondary-text",
  pet: "bg-primary-soft font-semibold text-primary",
  contrast: "bg-inverse text-inverse-foreground",
  primary: "border border-primary text-primary",
  outline: "border border-subtle-foreground text-secondary-text",
  info: "bg-info/16 text-info",
  success: "bg-success/16 text-success",
  warning: "bg-warning/16 text-warning",
  danger: "bg-destructive/16 text-destructive",
};

/** sm 20px/12 (Figma 배지) · md 24px/12 · lg 32px/14 */
const BADGE_SIZE: Record<BadgeSize, string> = {
  sm: "h-5 gap-0.5 px-1.5 text-body-md",
  md: "h-6 gap-1 px-2 text-body-md",
  lg: "h-8 gap-1.5 px-3 text-body-lg",
};

/** 작은 배지 (Figma 배지) */
export function Badge({
  tone = "hint",
  size = "sm",
  shape = "pill",
  faded = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  size?: BadgeSize;
  shape?: BadgeShape;
  /** 완료한 할 일의 개체 배지처럼 흐리게 (60%) */
  faded?: boolean;
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
        faded && "opacity-60",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * 회색 자리 (Figma 데이터 상태 · 스켈레톤). 숨 쉬듯 깜빡인다.
 * 색은 바탕을 따른다 (회색 화면 위 흰색 · 흰 바탕 위 gray-100). 크기는 className 이나 width·height 로
 */
export function Skeleton({
  className,
  shape = "block",
  width,
  height,
}: {
  className?: string;
  /** bar: 글 막대(완전 둥글게, 12) · block: 카드·칸 덩어리(모서리 12, 20) · circle: 사진(40) */
  shape?: "bar" | "block" | "circle";
  width?: number | `${number}%`;
  height?: number;
}) {
  const surface = useSurface();
  const style: CSSProperties = {};
  if (width !== undefined) style.width = width;
  if (height !== undefined) {
    style.height = height;
    if (shape === "circle") style.width = height;
  }
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse",
        raisedClass(surface),
        shape === "block" && "h-5 rounded-lg",
        shape === "bar" && "h-3 rounded-full",
        shape === "circle" && "size-10 shrink-0 rounded-full",
        className,
      )}
      style={style}
    />
  );
}

/** 자주 쓰는 스켈레톤 묶음 (Figma 스켈레톤: 목록 · 카드 · 폼) */
export function SkeletonGroup({
  kind,
  count,
  className,
}: {
  kind: "list" | "card" | "form";
  count?: number;
  className?: string;
}) {
  const n = count ?? (kind === "list" ? 4 : 3);
  const items = Array.from({ length: n }, (_, i) => i);
  return (
    <div className={cn("flex flex-col gap-2.5", className)} role="status" aria-label="불러오는 중">
      {kind === "card" ? <Skeleton shape="bar" width={128} /> : null}
      {items.map((i) =>
        kind === "list" ? (
          <div key={i} className="flex items-center gap-2.5 py-1.5">
            <Skeleton shape="circle" height={40} />
            <div className="flex flex-col gap-1.5">
              <Skeleton shape="bar" width={170} />
              <Skeleton shape="bar" width={110} height={10} />
            </div>
          </div>
        ) : kind === "card" ? (
          <Skeleton key={i} height={54} />
        ) : (
          <div key={i} className="flex flex-col gap-2.5">
            <Skeleton shape="bar" width={80} />
            <Skeleton height={46} />
          </div>
        ),
      )}
    </div>
  );
}

const TEXT_VARIANT = {
  "body-xl": "text-body-xl",
  "body-lg": "text-body-lg",
  "body-md": "text-body-md",
  "body-sm": "text-body-sm",
} as const;

/**
 * 안내 상자 (Figma 안내 상자: 회색 · 파랑). 모서리 12, 글자 body-md medium.
 * 회색은 회색 화면 위에서 흰색, 흰 바탕 위에서 gray-100
 */
export function InfoBox({
  children,
  tone = "gray",
  textVariant = "body-md",
  className,
}: {
  children: ReactNode;
  tone?: "gray" | "primary";
  textVariant?: keyof typeof TEXT_VARIANT;
  className?: string;
}) {
  const surface = useSurface();
  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2.5 font-medium",
        TEXT_VARIANT[textVariant],
        tone === "gray"
          ? cn(raisedClass(surface), "text-secondary-text")
          : "bg-primary-soft text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

type StateAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "outline" | "secondary";
};

/**
 * 화면 오류 · 빈 화면 (Figma 데이터 상태, C1).
 * 동그라미 아이콘(44) · 제목 body-xl semibold · 설명 body-md medium gray-500 · 버튼.
 * 빈 화면은 파란 버튼(primary), 오류는 회색 보조 버튼(outline·secondary → 바탕에 맞춰 white·secondary)
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
  /** null 이면 아이콘 자리를 없앤다 */
  icon?: ReactNode | null;
  action?: StateAction;
  secondaryAction?: StateAction;
  compact?: boolean;
  className?: string;
}) {
  const surface = useSurface();
  const renderAction = (a: StateAction, fallback: StateAction["variant"], first: boolean) => {
    const kind = a.variant ?? fallback;
    return (
      <Button
        variant={kind === "primary" ? "default" : surface === "gray" ? "white" : "secondary"}
        size={compact ? "md" : "lg"}
        className={cn(compact ? first && "mt-1" : cn("w-54", first && "mt-3"))}
        onClick={a.onClick}
      >
        {a.label}
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-6 text-center",
        compact ? "pt-10 pb-8" : "pt-15 pb-10",
        className,
      )}
    >
      {icon !== null ? (
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-full text-foreground [&_svg:not([class*='size-'])]:size-7",
            raisedClass(surface),
          )}
        >
          {icon ?? <ExclamationCircleIcon />}
        </span>
      ) : null}
      <p className="text-body-xl font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-80 text-body-md font-medium whitespace-pre-line text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? renderAction(action, "primary", true) : null}
      {secondaryAction ? renderAction(secondaryAction, "outline", !action) : null}
    </div>
  );
}

/** 영역 오류 (Figma 데이터 상태 · 영역 오류). 화면 일부만 못 불러왔을 때 그 자리에 */
export function AreaError({
  message,
  onRetry,
  retryLabel = "다시 시도",
  className,
}: {
  message: ReactNode;
  onRetry: () => void;
  retryLabel?: string;
  className?: string;
}) {
  const surface = useSurface();
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-lg px-3.5 py-4 text-center",
        raisedClass(surface),
        className,
      )}
    >
      <p className="text-body-md font-medium text-muted-foreground">{message}</p>
      <Button variant={surface === "gray" ? "secondary" : "white"} size="md" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}

/** 가로 정보 줄 (Figma 정보 줄: 라벨 96 · 값 · 아래 구분선) */
export function InfoRow({
  label,
  children,
  divider = true,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  /** 마지막 줄은 구분선 없이 */
  divider?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 py-2 text-body-lg",
        divider && "border-b border-border",
        className,
      )}
    >
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 text-foreground">{children}</div>
    </div>
  );
}

/** 단계 머리 (Figma: 4px 막대 하나를 단계 수만큼 나눠 지난 칸까지 파랗게) */
export function StepProgress({
  step,
  total,
  label,
  showLabel = false,
  className,
}: {
  step: number;
  total: number;
  label: string;
  /** Figma 단계 머리는 막대만 있다. 글(1/4 · 분류)도 보여야 하면 true */
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={`${step}/${total} · ${label}`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={step}
      className={cn("flex flex-col gap-2", className)}
    >
      {showLabel ? (
        <p className="text-body-lg font-semibold text-primary">
          {step}/{total} · {label}
        </p>
      ) : null}
      <div className="flex h-1 overflow-hidden rounded-full bg-input" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn("h-1 flex-1", i < step && "bg-primary")} />
        ))}
      </div>
    </div>
  );
}

/** 칸 나눔 탭 (Figma 세그먼트 칸: 38px · 모서리 8 · 고르면 primary-50 + 파란 글자) */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  minItemWidth,
  className,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** 달 탭처럼 칸이 많을 때 최소 너비(px) */
  minItemWidth?: number;
  className?: string;
}) {
  const surface = useSurface();
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex gap-1 rounded-lg p-1", raisedClass(surface), className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            style={minItemWidth !== undefined ? { minWidth: minItemWidth } : undefined}
            className={cn(
              "flex h-9.5 flex-1 items-center justify-center rounded-md text-body-lg transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              selected
                ? "bg-primary-soft font-semibold text-primary"
                : cn("font-medium text-gray-600", raisedPressedClass(surface)),
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** 불러오기 실패 (Figma 데이터 상태 · 화면 오류) */
export function LoadError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  return (
    <StateMessage
      compact
      title="불러오지 못했어요"
      description="인터넷 연결을 확인하고 다시 시도해 주세요."
      action={{ label: "다시 불러오기", onClick: onRetry, variant: "secondary" }}
      className={className}
    />
  );
}

/**
 * 둥근 카드 (모서리 20). 회색 화면 위에서는 흰 카드, 흰 바탕(시트) 위에서는 gray-100 카드.
 * 안쪽 부품은 카드 색을 바탕으로 삼는다 (칩·안내 상자가 반대 색이 된다).
 * onClick 을 주면 누를 수 있는 카드(button)가 된다. 다른 화면으로 가는 카드는 Card 안에 Link 를 꽉 채워 넣는다
 */
export function Card({
  children,
  className,
  dashed = false,
  onClick,
  ...props
}: Omit<ComponentProps<"div">, "onClick"> & {
  dashed?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  const surface = useSurface();
  const base = cn(
    "rounded-2xl",
    raisedClass(surface),
    dashed && "border-[1.3px] border-dashed border-input",
  );
  return (
    <SurfaceProvider value={flipSurface(surface)}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={props["aria-label"]}
          className={cn(
            base,
            "block w-full text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
            raisedPressedClass(surface),
            className,
          )}
        >
          {children}
        </button>
      ) : (
        <div className={cn(base, className)} {...props}>
          {children}
        </div>
      )}
    </SurfaceProvider>
  );
}

/**
 * 접힘 칸 (Figma 접힘 칸, 모서리 20). 머리를 누르면 내용이 펼쳐진다.
 * open 을 주면 바깥에서, 안 주면 스스로 상태를 든다
 */
export function Collapsible({
  title,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const surface = useSurface();
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const isOpen = open ?? innerOpen;
  const toggle = () => {
    setInnerOpen(!isOpen);
    onOpenChange?.(!isOpen);
  };
  const Chevron = isOpen ? ChevronUpIcon : ChevronDownIcon;
  return (
    <div className={cn("overflow-hidden rounded-2xl", raisedClass(surface), className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={toggle}
        className={cn(
          "flex w-full items-center gap-2 px-3.5 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset",
          raisedPressedClass(surface),
        )}
      >
        <span className="min-w-0 flex-1 text-body-lg font-medium text-foreground">{title}</span>
        <Chevron className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      {isOpen && children ? (
        <SurfaceProvider value={flipSurface(surface)}>
          <div className="-mt-0.5 flex flex-col gap-2 px-3.5 pb-3">{children}</div>
        </SurfaceProvider>
      ) : null}
    </div>
  );
}

/** 목록 구분선 (gray-200) */
export function Divider({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-px shrink-0 bg-border", className)} />;
}
