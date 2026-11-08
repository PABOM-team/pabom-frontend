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

/** ⋯ 메뉴 (Figma 할 일 카드·개체 상세의 떠 있는 메뉴) */
export function Menu({
  items,
  label = "더 보기",
  trigger,
  triggerClassName,
}: {
  items: MenuItem[];
  label?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
}) {
  const container = usePortalContainer();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={label}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted data-[state=open]:bg-muted",
          triggerClassName,
        )}
      >
        {trigger ?? <DotsHorizontalIcon className="size-6" />}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.Content
          align="end"
          sideOffset={2}
          collisionPadding={12}
          className="z-50 min-w-39 overflow-hidden rounded-lg border border-border bg-background py-0.5 shadow-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {items
            .filter((item) => !item.hidden)
            .map((item, index) => (
              <DropdownMenu.Item
                key={item.label}
                onSelect={item.onSelect}
                className={cn(
                  "cursor-pointer px-4 py-3 text-body-lg font-medium outline-none data-highlighted:bg-muted",
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
