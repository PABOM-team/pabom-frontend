"use client";

import { useState, type ComponentType } from "react";
import type { Task } from "@pabom/core/domain/today";
import { TaskIcon, taskSubline, taskTitle } from "@/entities/task";
import { cn } from "@/shared/lib/utils";
import {
  ClockIcon,
  InformationCircleIcon,
  PencilIcon,
  RefreshIcon,
  TrashIcon,
  type IconProps,
} from "@/shared/ui/icons";
import { SheetFrame } from "@/shared/ui/sheet";

export type TaskMenuIcon = "postpone" | "skip" | "edit" | "undo" | "delete";

export type TaskMenuItem = {
  label: string;
  icon: TaskMenuIcon;
  onSelect: () => void;
  /** 삭제처럼 한 번 더 묻는 행동. 구분선 아래 회색으로 떨어뜨린다 */
  tone?: "default" | "danger";
};

/** 이번만 건너뛰기 (Figma 할 일 시트 '↪' 아이콘, 22px 선 1.65) */
const SkipIcon = (props: IconProps) => (
  <svg viewBox="0 0 22 22" width={22} height={22} fill="none" aria-hidden {...props}>
    <path
      d="M3.66667 15.5833C5.04167 11 8.25 8.25 12.375 8.25H17.4167"
      strokeWidth={1.65}
      strokeLinecap="round"
      stroke="currentColor"
    />
    <path
      d="M14.2083 5.04167L17.4167 8.25L14.2083 11.4583"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </svg>
);

const ICONS: Record<TaskMenuIcon, ComponentType<IconProps>> = {
  postpone: ClockIcon,
  skip: SkipIcon,
  edit: PencilIcon,
  undo: RefreshIcon,
  delete: TrashIcon,
};

/**
 * 할 일 시트 (SCR-H02 할 일 메뉴). 할 일 줄을 누르면 올라온다.
 * 머리(아이콘·이름·주기)를 누르면 '왜 이 할 일이 있나요?'(H04)
 */
export function TaskSheet({
  task,
  items,
  onOpenChange,
  onOpenBasis,
}: {
  task: Task | null;
  items: TaskMenuItem[];
  onOpenChange: (open: boolean) => void;
  onOpenBasis: (task: Task) => void;
}) {
  // 닫히는 동안에도 내용이 남아 있게 마지막 할 일을 들고 있는다
  const [shown, setShown] = useState<{ task: Task; items: TaskMenuItem[] } | null>(null);
  if (task && (task !== shown?.task || items !== shown.items)) {
    setShown({ task, items });
  }
  const current = task ? { task, items } : shown;

  // 고른 행동은 바로 실행한다. 이 시트가 내려가는 동안 다음 시트가 그 위로 올라온다
  const choose = (run: () => void) => {
    onOpenChange(false);
    run();
  };

  const overdue =
    current && current.task.state === "todo" && !current.task.originalDueOn
      ? current.task.overdueDays
      : 0;
  const subline = current
    ? [current.task.petName, taskSubline(current.task), overdue > 0 ? `${overdue}일 지남` : null]
        .filter(Boolean)
        .join(" · ")
    : "";
  const title = current ? taskTitle(current.task) : "";
  const main = current?.items.filter((item) => item.tone !== "danger") ?? [];
  const danger = current?.items.filter((item) => item.tone === "danger") ?? [];

  return (
    <SheetFrame open={Boolean(task)} onOpenChange={onOpenChange} label={title || "할 일"}>
      {current ? (
        <>
          <button
            type="button"
            aria-label={`${title}, 이 할 일이 왜 있는지 보기`}
            onClick={() => choose(() => onOpenBasis(current.task))}
            className="flex w-full items-center gap-3 pb-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <TaskIcon careItem={current.task.careItem} kind={current.task.recordKind} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-title-xs text-foreground">{title}</span>
              <span className="truncate text-body-lg text-muted-foreground">{subline}</span>
            </span>
            <InformationCircleIcon className="size-5 text-subtle-foreground" strokeWidth={1.8} />
          </button>
          {main.map((item) => (
            <MenuRow key={item.label} item={item} onClick={() => choose(item.onSelect)} />
          ))}
          {danger.length ? <div className="h-px bg-border" /> : null}
          {danger.map((item) => (
            <MenuRow key={item.label} item={item} onClick={() => choose(item.onSelect)} />
          ))}
        </>
      ) : null}
    </SheetFrame>
  );
}

function MenuRow({ item, onClick }: { item: TaskMenuItem; onClick: () => void }) {
  const Icon = ICONS[item.icon];
  const danger = item.tone === "danger";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center gap-6.5 py-3.25 text-left text-body-xl font-medium transition-opacity outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:opacity-60",
        danger ? "text-subtle-foreground" : "text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-5.5 shrink-0",
          danger ? "text-subtle-foreground" : "text-muted-foreground",
        )}
        strokeWidth={1.65}
      />
      {item.label}
    </button>
  );
}
