"use client";

import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { XIcon } from "./icons";
import { usePortalContainer } from "./portal";
import { SurfaceProvider } from "./surface";
import { IconButton } from "./top-bar";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 손잡이 아래 고정 머리 (스크롤되지 않는다) */
  header?: ReactNode;
  children?: ReactNode;
  /** 아래 고정 버튼 영역 (가로로 늘어선다) */
  footer?: ReactNode;
  /** 시트 자체 */
  className?: string;
  /** 스크롤되는 내용 칸 */
  contentClassName?: string;
  /** 제목 줄이 없는 시트의 화면 읽기 이름 */
  label?: string;
  /** header 안에 Dialog.Description 이 있으면 true (화면 읽기 설명으로 잇는다) */
  described?: boolean;
};

/**
 * 아래에서 올라오는 시트의 공통 바탕 (앱 bottom-sheet.tsx 의 모양).
 * 위 모서리 24 · 흰 바탕 · 그림자 lg · 36×4 손잡이. 화면 위 12 까지만 커지고 넘치면 안에서 스크롤된다.
 * 시트는 흰 바탕이라 안의 칩·안내 상자는 회색 면을 쓴다 (surface="white")
 */
export function BottomSheet({
  open,
  onOpenChange,
  header,
  children,
  footer,
  className,
  contentClassName,
  label,
  described = false,
}: BottomSheetProps) {
  const container = usePortalContainer();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="absolute inset-0 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          {...(described ? {} : { "aria-describedby": undefined })}
          className={cn(
            "absolute inset-x-0 bottom-0 flex max-h-[calc(100%-12px-env(safe-area-inset-top))] flex-col rounded-t-3xl bg-card shadow-lg outline-none",
            "data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:ease-out data-[state=open]:slide-in-from-bottom",
            className,
          )}
        >
          <SurfaceProvider value="white">
            {label ? <Dialog.Title className="sr-only">{label}</Dialog.Title> : null}
            <div className="flex shrink-0 justify-center pt-2 pb-2.5" aria-hidden>
              <div className="h-1 w-9 rounded-full bg-input" />
            </div>
            {header}
            <div
              className={cn(
                "scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain",
                contentClassName,
              )}
            >
              {children}
            </div>
            {footer ? (
              <div className="flex shrink-0 gap-2 px-gutter pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            ) : (
              <div className="h-[max(16px,env(safe-area-inset-bottom))] shrink-0" />
            )}
          </SurfaceProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * 아래에서 올라오는 시트 (Figma 시트: 손잡이 · 시트 머리(제목 title-xs · ×) · 내용 · 하단 버튼).
 * 앱 sheet.tsx 의 Sheet 와 같다
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: SheetProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      className={className}
      contentClassName="px-gutter pb-2"
      footer={footer}
      described={Boolean(description)}
      header={
        <div className="flex shrink-0 items-start gap-2 px-gutter pt-1 pb-3">
          <div className="min-w-0 flex-1">
            <Dialog.Title className="text-title-xs text-foreground">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1.5 text-body-lg text-muted-foreground">
                {description}
              </Dialog.Description>
            ) : null}
          </div>
          <Dialog.Close asChild>
            <IconButton aria-label="닫기" className="-mt-2 -mr-2.5 text-muted-foreground">
              <XIcon />
            </IconButton>
          </Dialog.Close>
        </div>
      }
    >
      {children}
    </BottomSheet>
  );
}

/**
 * 제목·× 없이 내용을 마음대로 채우는 바텀 시트 (Figma H02 '바텀 시트'·'기록 시트', 앱 task-actions/sheet-frame.tsx).
 * 할 일 머리·키패드처럼 머리 모양이 정해지지 않은 시트에 쓴다. label 은 화면 읽기 이름
 */
export function SheetFrame({
  open,
  onOpenChange,
  label,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      label={label}
      className={className}
      contentClassName="px-gutter pt-1"
      footer={footer}
    >
      {children}
    </BottomSheet>
  );
}

/** 시트 안 칸 제목 (예: 얼마나 먹었나요?). Figma 라벨: body-lg medium gray-700 */
export function SheetLabel({
  children,
  first = false,
  className,
}: {
  children: ReactNode;
  /** 맨 위 칸이면 위 여백을 줄인다 */
  first?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-1.5 text-body-lg font-medium text-secondary-text",
        first ? "mt-1" : "mt-3",
        className,
      )}
    >
      {children}
    </p>
  );
}
