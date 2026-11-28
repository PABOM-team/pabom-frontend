"use client";

import { addDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { useRef } from "react";
import type { Pet } from "@pabom/core/domain/pet";
import { fromYmd, toYmd } from "@pabom/core/lib/date";
import { cn } from "@/shared/lib/utils";
import { Avatar, Skeleton } from "@/shared/ui/display";
import { PlusIcon } from "@/shared/ui/icons";

/** 가로로 이만큼 끌면 주를 넘긴다 (px) */
const SWIPE_THRESHOLD = 48;

/**
 * 주간 달력 (Figma 주간 캘린더): 흰 카드에 7일, 고른 날은 파랑 그라데이션.
 * 오늘은 파란 점, 기록이 있는 날은 회색 점. 좌우로 밀면(손가락·마우스 끌기) 앞·뒤 주로
 */
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
  const start = useRef<{ x: number; y: number } | null>(null);
  /** 끌어서 주를 넘겼으면 그 뒤 따라오는 click(날 고르기)은 무시한다 */
  const swiped = useRef(false);

  return (
    <ol
      className="flex touch-pan-y rounded-2xl bg-card px-2 py-3 select-none"
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        swiped.current = false;
      }}
      onPointerUp={(e) => {
        const from = start.current;
        start.current = null;
        if (!from || !onSwipe) return;
        const dx = e.clientX - from.x;
        const dy = e.clientY - from.y;
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
        swiped.current = true;
        onSwipe(dx < 0 ? 1 : -1);
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
      onClickCapture={(e) => {
        if (!swiped.current) return;
        swiped.current = false;
        e.stopPropagation();
      }}
    >
      {days.map((ymd) => {
        const isToday = ymd === today;
        const isSelected = ymd === selected;
        const date = fromYmd(ymd);
        const dot = isSelected
          ? null
          : isToday
            ? "bg-primary"
            : marked.has(ymd)
              ? "bg-input"
              : null;
        return (
          <li key={ymd} className="flex min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onSelect(ymd)}
              aria-pressed={isSelected}
              aria-label={`${format(date, "M월 d일 EEEE", { locale: ko })}${isToday ? ", 오늘" : ""}`}
              className={cn(
                "relative flex w-full flex-col items-center gap-0.5 overflow-hidden rounded-lg py-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                isSelected ? "bg-gradient-primary" : "hover:bg-muted/60 active:bg-muted",
              )}
            >
              <span
                className={cn(
                  "text-body-md font-medium",
                  isSelected ? "text-white" : "text-muted-foreground",
                )}
              >
                {format(date, "EEEEE", { locale: ko })}
              </span>
              <span
                className={cn(
                  "text-body-xl font-medium",
                  isSelected ? "text-white" : "text-foreground",
                )}
              >
                {format(date, "d")}
              </span>
              {dot ? (
                <span aria-hidden className={cn("absolute bottom-0.75 size-1 rounded-full", dot)} />
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** 개체 고르기 줄 (Figma ③): 전체 · 개체 알약 · 추가. 남은 할 일이 있는 개체에 빨간 점 */
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
  // 불러오는 동안은 알약 자리만 (C1-1)
  if (loading) {
    return (
      <div className="flex gap-2" aria-label="불러오는 중">
        {[56, 84, 84].map((width, i) => (
          <Skeleton key={i} width={width} height={36} className="rounded-full" />
        ))}
      </div>
    );
  }

  const pill = (active: boolean) =>
    cn(
      "flex h-9 shrink-0 items-center rounded-full text-body-lg transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
      active
        ? "bg-inverse text-inverse-foreground"
        : "bg-card text-foreground hover:bg-gray-200 active:bg-gray-200",
    );

  return (
    // 좌우 여백을 밀어 가로 스크롤이 화면 끝까지 닿는다
    <div className="-mx-4 scrollbar-none flex shrink-0 items-center gap-2 overflow-x-auto px-4">
      {pets.length > 0 ? (
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={selected === null}
          className={cn(pill(selected === null), "px-4 font-semibold")}
        >
          전체
        </button>
      ) : null}
      {pets.map((pet) => {
        const active = selected === pet.id;
        return (
          <button
            key={pet.id}
            type="button"
            onClick={() => onSelect(pet.id)}
            aria-pressed={active}
            aria-label={`${pet.name}${pet.todayRemaining > 0 ? ", 남은 할 일 있음" : ""}`}
            className={cn(
              pill(active),
              "max-w-48 gap-2 pr-3.5 pl-1",
              active ? "font-semibold" : "font-medium",
            )}
          >
            <span className="relative shrink-0">
              <Avatar src={pet.photoUrl} size={28} className="bg-primary-soft" />
              {pet.todayRemaining > 0 ? (
                <span
                  aria-hidden
                  className="absolute -top-px left-5.25 size-2 rounded-full border border-card bg-destructive"
                />
              ) : null}
            </span>
            <span className="truncate">{pet.name}</span>
          </button>
        );
      })}
      <Link
        href="/pets/new"
        aria-label="개체 추가"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-foreground transition-colors outline-none hover:bg-gray-200 focus-visible:ring-3 focus-visible:ring-ring/40 active:bg-gray-200"
      >
        <PlusIcon className="size-4.5" strokeWidth={1.8} />
      </Link>
    </div>
  );
}
