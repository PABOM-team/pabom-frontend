"use client";

import { cn } from "@/shared/lib/utils";
import { BottomSheet } from "@/shared/ui/sheet";

export type ActionSheetItem = {
  label: string;
  description?: string;
  tone?: "default" | "danger";
  onSelect: () => void;
};

/**
 * 아래에서 올라오는 고르기 시트 (Figma P04 '⋯ 메뉴'): 손잡이 · 큰 줄(제목 + 설명) · 닫기.
 * 고른 항목은 바로 실행한다. 앱 features/pet-lifecycle/action-sheet.tsx 와 같다
 */
export function ActionSheet({
  open,
  onOpenChange,
  items,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ActionSheetItem[];
  /** 화면 읽기 이름 */
  label: string;
}) {
  const close = () => onOpenChange(false);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} label={label} contentClassName="px-5">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            close();
            item.onSelect();
          }}
          className="flex min-h-18 w-full flex-col justify-center gap-0.5 py-3.5 text-left transition-opacity active:opacity-60"
        >
          <span
            className={cn(
              "text-body-xl font-semibold",
              item.tone === "danger" ? "text-destructive" : "text-foreground",
            )}
          >
            {item.label}
          </span>
          {item.description ? (
            <span className="text-body-md text-subtle-foreground">{item.description}</span>
          ) : null}
        </button>
      ))}
      <button
        type="button"
        onClick={close}
        className="mt-3 flex h-13 w-full items-center justify-center rounded-lg bg-secondary text-body-xl font-semibold text-secondary-text transition-colors hover:bg-border active:bg-border"
      >
        닫기
      </button>
    </BottomSheet>
  );
}
