"use client";

import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { DotsHorizontalIcon } from "./icons";
import { usePortalContainer } from "./portal";

export type MenuItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  hidden?: boolean;
};

/**
 * ⋯ 메뉴 (Figma 할 일 카드·개체 상세의 떠 있는 메뉴, 앱 menu.tsx 와 같다).
 * 팝업: 160 · 모서리 12 · gray-300 테두리 · 그림자 md · 줄 46 사이 구분선.
 * 트리거는 44px 동그란 버튼(누르면 gray-200)이고, 화면 밖으로 나가면 안쪽으로 밀어 넣는다
 */
export function Menu({
  items,
  label = "더 보기",
  trigger,
  triggerClassName,
  align = "end",
}: {
  items: MenuItem[];
  label?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
  /** 트리거 기준 정렬. 왼쪽 가장자리 트리거(사진 칸 +)는 start */
  align?: "start" | "end";
}) {
  const container = usePortalContainer();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={label}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-gray-200 focus-visible:ring-3 focus-visible:ring-ring/40 active:bg-gray-200 data-[state=open]:bg-gray-200 [&_svg:not([class*='size-'])]:size-6",
          triggerClassName,
        )}
      >
        {trigger ?? <DotsHorizontalIcon />}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.Content
          align={align}
          sideOffset={2}
          collisionPadding={12}
          className="z-50 min-w-40 overflow-hidden rounded-lg border border-input bg-background shadow-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {items
            .filter((item) => !item.hidden)
            .map((item, index) => (
              <DropdownMenu.Item
                key={item.label}
                onSelect={item.onSelect}
                className={cn(
                  "flex h-11.5 cursor-pointer items-center px-4 text-body-lg outline-none data-highlighted:bg-muted",
                  index > 0 && "border-t border-border",
                  item.tone === "danger" ? "text-destructive" : "text-foreground",
                )}
              >
                {item.label}
              </DropdownMenu.Item>
            ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
