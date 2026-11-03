"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon } from "@/shared/ui/icons";
import Link from "next/link";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { routineQueries } from "@/entities/routine";
import { CARE_DISCLAIMER, formatInterval } from "@/shared/domain/care";
import type { Task } from "@/shared/domain/today";
import { cn } from "@/shared/lib/utils";
import { InfoBox } from "@/shared/ui/display";
import { Sheet } from "@/shared/ui/sheet";

/** 왜 이 할 일이 있나요? (SCR-H04) 할 일·적용 조건, 펼치면 기준 링크 */
export function BasisSheet({
  task,
  onOpenChange,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [shown, setShown] = useState<Task | null>(null);
  if (task && task.routineId !== shown?.routineId) {
    setShown(task);
    setExpanded(false);
  }
  const current = task ?? shown;
  const { data: routines } = useQuery({
    ...routineQueries.list(current?.petId ?? ""),
    enabled: Boolean(current),
  });
  const { data: detail } = useQuery({
    ...petQueries.detail(current?.petId ?? ""),
    enabled: Boolean(current),
  });
  const routine = routines?.find((r) => r.id === current?.routineId);

  return (
    <Sheet open={Boolean(task)} onOpenChange={onOpenChange} title="왜 이 할 일이 있나요?">
      <dl className="text-body-lg">
        <div className="flex border-b border-border py-2.5">
          <dt className="w-[104px] shrink-0 text-muted-foreground">할 일</dt>
          <dd>
            {current?.title.split(" · ")[0]}
            {current?.intervalDays != null ? ` · ${formatInterval(current.intervalDays)}` : ""}
          </dd>
        </div>
        <div className="flex border-b border-border py-2.5">
          <dt className="w-[104px] shrink-0 text-muted-foreground">적용 조건</dt>
          <dd>{routine?.basis.condition ?? "…"}</dd>
        </div>
      </dl>

      <div className={cn("mt-3 rounded-lg border", expanded ? "border-primary" : "border-input")}>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-3.5 py-3 text-body-lg"
        >
          자세히 보기
          {expanded ? (
            <ChevronUpIcon className="size-4 text-primary" />
          ) : (
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          )}
        </button>
        {/* 펼치면 종 가이드라인(S04-3)으로 가는 링크만 있다 (Figma H04 펼침) */}
        {expanded && detail ? (
          <div className="px-3.5 pb-3.5 text-body-lg">
            {detail ? (
              <Link
                href={`/settings/guidelines/${detail.pet.speciesId}`}
                className="inline-flex items-center gap-0.5 font-medium text-primary"
              >
                이러한 기준을 기반으로 제안을 드렸어요
                <ChevronRightIcon className="size-3.5" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <InfoBox className="mt-3">{CARE_DISCLAIMER}</InfoBox>
    </Sheet>
  );
}
