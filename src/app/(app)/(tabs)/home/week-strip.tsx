"use client";

import { addDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import { PlusIcon } from "@/shared/ui/icons";
import Link from "next/link";
import { useRef } from "react";
import type { Pet } from "@/shared/domain/pet";
import { fromYmd, toYmd } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Avatar, Skeleton } from "@/shared/ui/display";

/** 가로로 이만큼 끌면 주를 넘긴다 (px) */
const SWIPE_THRESHOLD = 48;

/** 주간 달력 (Figma 주간 캘린더). 기록·할 일이 있는 날에 점. 좌우로 밀면 앞·뒤 주로 */
export function WeekStrip({
  weekStart,
  selected,
  today,
  marked,
  onSelect,
  onSwipe,
}: {
  weekStart: string;
  selected: string;
  today: string;
  marked: Set<string>;
  onSelect: (ymd: string) => void;
  /** -1: 지난 주, 1: 다음 주 */
  onSwipe?: (direction: -1 | 1) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => toYmd(addDays(fromYmd(weekStart), i)));
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <ol
      className="grid touch-pan-y grid-cols-7"
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        const t = e.changedTouches[0];
        touchStart.current = null;
        if (!start || !t || !onSwipe) return;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
        onSwipe(dx < 0 ? 1 : -1);
      }}
    >
      {days.map((ymd) => {
        const isToday = ymd === today;
        const isSelected = ymd === selected;
        const date = fromYmd(ymd);
        return (
          <li key={ymd}>
            <button
              type="button"
              onClick={() => onSelect(ymd)}
              aria-pressed={isSelected}
              aria-label={format(date, "M월 d일 EEEE", { locale: ko })}
              className={cn(
                "mx-auto flex w-full max-w-[51px] flex-col items-center gap-0.5 rounded-md py-1",
                isToday && "bg-primary text-white",
                isSelected && !isToday && "bg-primary-soft text-primary",
              )}
            >
              <span
                className={cn(
                  "text-body-sm",
                  isToday ? "text-white" : isSelected ? "text-primary" : "text-muted-foreground",
                )}
              >
                {format(date, "EEEEE", { locale: ko })}
              </span>
              <span className="text-body-xl font-medium">{format(date, "d")}</span>
              <span
                aria-hidden
                className={cn(
                  "size-[5px] rounded-full",
                  marked.has(ymd)
                    ? isToday
                      ? "bg-white"
                      : "bg-subtle-foreground"
                    : "bg-transparent",
                )}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** 개체 고르기 줄 (전체 · 개체들 · 추가). 남은 할 일이 있는 개체에 빨간 점 */
export function PetFilterRow({
  pets,
  selected,
  onSelect,
  loading,
}: {
  pets: Pet[];
  selected: string | null;
  onSelect: (petId: string | null) => void;
  loading?: boolean;
}) {
  const item = "flex w-14 shrink-0 flex-col items-center gap-1.5";
  const label = (active: boolean) =>
    cn(
      "max-w-full truncate text-body-md",
      active ? "font-bold text-primary" : "text-muted-foreground",
    );

  // 불러오는 동안은 동그라미 자리만 (C1-1)
  if (loading) {
    return (
      <div className="-mx-4 flex gap-3 overflow-hidden px-4" aria-label="불러오는 중">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={item}>
            <Skeleton className="size-[52px] rounded-full" />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="-mx-4 scrollbar-none flex gap-3 overflow-x-auto px-4">
      {pets.length > 0 ? (
        <button
          type="button"
          className={item}
          onClick={() => onSelect(null)}
          aria-pressed={selected === null}
        >
          <span
            className={cn(
              "flex size-[52px] items-center justify-center rounded-full bg-muted text-body-md text-secondary-text",
              selected === null && "ring-[2.5px] ring-primary",
            )}
          >
            전체
          </span>
          <span className={label(selected === null)}>전체</span>
        </button>
      ) : null}
      {pets.map((pet) => (
        <button
          key={pet.id}
          type="button"
          className={item}
          onClick={() => onSelect(pet.id)}
          aria-pressed={selected === pet.id}
        >
          <span className="relative">
            <Avatar
              src={pet.photoUrl}
              size={52}
              className={cn(selected === pet.id && "border-0 ring-[2.5px] ring-primary")}
            />
            {pet.todayRemaining > 0 ? (
              <span
                aria-label="남은 할 일 있음"
                className="absolute top-0.5 right-0.5 size-2 rounded-full border border-white bg-destructive"
              />
            ) : null}
          </span>
          <span className={label(selected === pet.id)}>{pet.name}</span>
        </button>
      ))}
      <Link href="/pets/new" className={item}>
        <span className="flex size-[52px] items-center justify-center rounded-full border-[1.5px] border-dashed border-input text-muted-foreground">
          <PlusIcon className="size-5" />
        </span>
        <span className={label(false)}>추가</span>
      </Link>
    </div>
  );
}
