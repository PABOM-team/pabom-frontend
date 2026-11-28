"use client";

import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "./button";
import { usePortalContainer } from "./portal";
import { SurfaceProvider } from "./surface";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  /** 없으면 버튼 1개짜리 안내 창 (C4-4) */
  cancelLabel?: string | null;
  /** default: 파란 그라데이션 · danger(삭제)·inverse(나가기): 검정 (Figma 확인 창) */
  tone?: "default" | "danger" | "inverse";
  pending?: boolean;
  onConfirm: () => void;
};

/**
 * 가운데 뜨는 확인 창 (Figma 확인 창, C4 · 앱 confirm-dialog.tsx 와 같다).
 * 모서리 20 · 제목 body-xl semibold · 설명 body-lg gray-500. 바깥을 눌러도 닫히지 않는다.
 * 버튼은 50px: 닫기는 회색 보조, 확인은 파랑(일반·안내) 또는 검정(삭제·나가기). pending 이면 확인 버튼에 스피너
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "닫기",
  tone = "default",
  pending,
  onConfirm,
}: ConfirmDialogProps) {
  const container = usePortalContainer();

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Overlay className="absolute inset-0 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="absolute top-1/2 left-1/2 flex w-[calc(100%-56px)] max-w-83.5 -translate-x-1/2 -translate-y-1/2 flex-col gap-2.5 rounded-2xl bg-background px-4.5 pt-5.5 pb-4 shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <SurfaceProvider value="white">
            <AlertDialog.Title className="text-body-xl font-semibold text-foreground">
              {title}
            </AlertDialog.Title>
            {description ? (
              <AlertDialog.Description className="text-body-lg whitespace-pre-line text-muted-foreground">
                {description}
              </AlertDialog.Description>
            ) : (
              <AlertDialog.Description className="sr-only">{title}</AlertDialog.Description>
            )}
            <div className="flex gap-2 pt-1.5">
              {cancelLabel ? (
                <AlertDialog.Cancel asChild>
                  <Button variant="secondary" size="xl" className="h-12.5 flex-1">
                    {cancelLabel}
                  </Button>
                </AlertDialog.Cancel>
              ) : null}
              <Button
                variant={tone === "danger" ? "danger" : tone === "inverse" ? "inverse" : "default"}
                size="xl"
                className="h-12.5 flex-1"
                loading={pending}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </SurfaceProvider>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
