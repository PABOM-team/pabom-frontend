"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  eachMonthOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  min as minDate,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type UIEvent } from "react";
import { petQueries } from "@/entities/pet";
import { recordQueries, RecordGroup, RecordRow } from "@/entities/record";
import { feedResultSetOf, speciesQueries } from "@/entities/species";
import { EditRecordSheet } from "@/features/record-editor";
import { careItemLabel, compareCareItems, MEMO_CODE } from "@pabom/core/domain/care";
import type { CareRecord } from "@pabom/core/domain/record";
import type { SpeciesId } from "@pabom/core/domain/species";
import { fromYmd, toYmd, ymdOf } from "@pabom/core/lib/date";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { LoadError, Spinner, StateMessage } from "@/shared/ui/display";
import { ChevronDownIcon } from "@/shared/ui/icons";
import { Screen } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { TopBar } from "@/shared/ui/top-bar";

/** 기록 조회 한 번의 최대 기간 (API-50: 366일) */
const RANGE_DAYS = 365;

const monthKey = (date: Date) => format(date, "yyyy-MM");
const monthLabel = (date: Date) => format(date, "M월");
const dayHeading = (ymd: string) => format(fromYmd(ymd), "M월 d일 EEEE", { locale: ko });

/** SCR-P07 전체 기록. 종류 칩으로 좁히고, 달별로 끊김 없이 이어 보며, 'N월 ▾'로 달을 바로 고른다 */
export function PetRecordsScreen() {
  const { petId } = useParams<{ petId: string }>();
  const { data: detail } = useQuery(petQueries.detail(petId));
  const [today] = useState(() => new Date());
  const [careItem, setCareItem] = useState<string | null>(null);
  /** 목록 맨 위 달. null 이면 이번 달(오늘)부터 */
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today));
  const [monthOpen, setMonthOpen] = useState(false);

  const pet = detail?.pet;
  const chips = [
    ...new Map(
      [...(detail?.routines ?? [])]
        .sort(compareCareItems)
        .map((r) => [r.careItem, careItemLabel(r.careItem, r.careItemName)] as const),
    ),
    [MEMO_CODE, careItemLabel(MEMO_CODE)] as const,
  ];
  const firstMonth = startOfMonth(
    pet?.firstRecordOn ? fromYmd(pet.firstRecordOn) : subDays(today, RANGE_DAYS),
  );
  const to = anchor ? minDate([endOfMonth(anchor), today]) : today;
  const listKey = `${careItem ?? "all"}:${toYmd(to)}`;

  const jumpTo = (month: Date) => {
    setAnchor(isSameMonth(month, today) ? null : month);
    setVisibleMonth(startOfMonth(month));
    setMonthOpen(false);
  };

  return (
    <Screen>
      <TopBar
        title={pet ? `${pet.name}의 전체 기록` : "전체 기록"}
        fallbackHref={`/pets/${petId}`}
      />
      <div className="flex shrink-0 flex-col gap-5 px-4 pt-2 pb-2.5">
        <div
          role="group"
          aria-label="기록 종류"
          className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4"
        >
          {[[null, "전체"] as const, ...chips].map(([code, label]) => {
            const selected = code === careItem;
            return (
              <button
                key={code ?? "all"}
                type="button"
                aria-pressed={selected}
                onClick={() => setCareItem(code)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-[7px] text-body-lg font-semibold transition-colors",
                  selected
                    ? "bg-inverse text-inverse-foreground"
                    : "bg-card text-secondary-text hover:bg-gray-200",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label={`${monthLabel(visibleMonth)}, 달 고르기`}
          aria-haspopup="dialog"
          onClick={() => setMonthOpen(true)}
          className="flex items-center gap-1 self-start text-title-xs text-foreground"
        >
          {monthLabel(visibleMonth)}
          <ChevronDownIcon className="size-5" />
        </button>
      </div>
      <RecordList
        key={listKey}
        petId={petId}
        speciesId={pet?.speciesId}
        careItem={careItem}
        from={toYmd(subDays(to, RANGE_DAYS))}
        to={toYmd(to)}
        onVisibleMonth={setVisibleMonth}
      />
      <MonthSheet
        open={monthOpen}
        onOpenChange={setMonthOpen}
        months={eachMonthOfInterval({ start: firstMonth, end: startOfMonth(today) })}
        current={visibleMonth}
        onPick={jumpTo}
      />
    </Screen>
  );
}

type DayGroup = { day: string; items: CareRecord[] };
type MonthGroup = { month: string; date: Date; days: DayGroup[] };

/** 기록을 달 → 날로 묶는다 (응답은 최근 순) */
const groupByMonth = (records: CareRecord[]): MonthGroup[] =>
  records.reduce<MonthGroup[]>((months, record) => {
    const day = ymdOf(record.occurredAt);
    const date = parseISO(record.occurredAt);
    const key = monthKey(date);
    const last = months[months.length - 1];
    if (!last || last.month !== key) {
      return [
        ...months,
        { month: key, date: startOfMonth(date), days: [{ day, items: [record] }] },
      ];
    }
    const lastDay = last.days[last.days.length - 1]!;
    const days =
      lastDay.day === day
        ? [...last.days.slice(0, -1), { day, items: [...lastDay.items, record] }]
        : [...last.days, { day, items: [record] }];
    return [...months.slice(0, -1), { ...last, days }];
  }, []);

function RecordList({
  petId,
  speciesId,
  careItem,
  from,
  to,
  onVisibleMonth,
}: {
  petId: string;
  speciesId: SpeciesId | undefined;
  careItem: string | null;
  from: string;
  to: string;
  onVisibleMonth: (month: Date) => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  /** 달 묶음 자리. 스크롤하면서 위 'N월 ▾'를 바꾸는 데만 쓴다 (화면 상태 아님) */
  const monthEls = useRef(new Map<string, { el: HTMLElement; date: Date }>());
  const shownMonth = useRef<string | null>(null);
  const query = useInfiniteQuery(
    recordQueries.infinite({ petId, careItem: careItem ?? undefined, from, to, limit: 30 }),
  );
  // 급여 기록의 먹은 정도 이름을 종의 먹이 묶음에 맞춘다
  const { data: careStandards } = useQuery({
    ...speciesQueries.careStandards(speciesId ?? "crested_gecko"),
    enabled: speciesId !== undefined,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  // 끝이 보이면 다음 쪽을 불러온다
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onScroll = (e: UIEvent<HTMLElement>) => {
    const scroller = e.currentTarget;
    const top = scroller.getBoundingClientRect().top + 8;
    // 달 묶음 머리가 위에 닿으면 위 제목을 그 달로 바꾼다
    let current: [string, Date] | null = null;
    for (const [key, { el, date }] of monthEls.current) {
      if (el.getBoundingClientRect().top <= top) current = [key, date];
    }
    if (current && current[0] !== shownMonth.current) {
      shownMonth.current = current[0];
      onVisibleMonth(current[1]);
    }
  };

  if (query.isPending) {
    return (
      <div className="flex flex-1 justify-center pt-10">
        <Spinner />
      </div>
    );
  }
  if (query.isError) return <LoadError onRetry={() => query.refetch()} />;

  const months = groupByMonth(query.data.pages.flatMap((p) => p.items));

  return (
    <main
      onScroll={onScroll}
      className="flex min-h-0 flex-1 animate-in flex-col gap-5 overflow-y-auto *:shrink-0 overscroll-contain px-4 pt-2.5 pb-10 duration-250 ease-out fade-in-0 slide-in-from-bottom-2"
    >
      {months.length === 0 ? (
        <StateMessage compact icon={null} title="기록이 없어요" className="pt-20" />
      ) : null}
      {months.map((month, index) => (
        <section
          key={month.month}
          ref={(el) => {
            if (el) monthEls.current.set(month.month, { el, date: month.date });
            else monthEls.current.delete(month.month);
          }}
          className="flex flex-col gap-5"
        >
          {index > 0 ? (
            <h2 className="mt-1 text-title-xs text-foreground">{monthLabel(month.date)}</h2>
          ) : null}
          {month.days.map(({ day, items }) => (
            <div key={day} className="flex flex-col gap-2.5">
              <h3 className="text-body-xl font-semibold text-secondary-text">{dayHeading(day)}</h3>
              <RecordGroup>
                {items.map((record, i) => (
                  <RecordRow
                    key={record.id}
                    record={record}
                    variant="list"
                    first={i === 0}
                    feedResultSet={feedResultSetOf(careStandards, record.careItem)}
                    onClick={() => setEditId(record.id)}
                  />
                ))}
              </RecordGroup>
            </div>
          ))}
        </section>
      ))}
      <div ref={sentinel} className="flex justify-center py-5">
        {isFetchingNextPage ? <Spinner /> : null}
      </div>
      <EditRecordSheet
        recordId={editId}
        speciesId={speciesId}
        onOpenChange={(open) => !open && setEditId(null)}
      />
    </main>
  );
}

/** 월 고르기 시트: 해마다 4×3 · 지금 보는 달은 검정 · 기록 없는 달은 흐리게 */
function MonthSheet({
  open,
  onOpenChange,
  months,
  current,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 고를 수 있는 달 (첫 기록 달 ~ 이번 달) */
  months: Date[];
  current: Date;
  onPick: (month: Date) => void;
}) {
  const enabled = new Set(months.map(monthKey));
  const years = [...new Set(months.map((m) => m.getFullYear()))].reverse();

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="어느 달로 갈까요?"
      description="기록이 있는 달만 고를 수 있어요"
      footer={
        <Button variant="secondary" size="xl" className="flex-1" onClick={() => onOpenChange(false)}>
          닫기
        </Button>
      }
    >
      {years.map((year) => (
        <div key={year} className="mb-3 flex flex-col gap-2.5">
          <p className="text-body-xl font-semibold text-secondary-text">{`${year}년`}</p>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)).map((month) => {
              const key = monthKey(month);
              const selected = key === monthKey(current);
              const disabled = !enabled.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => onPick(month)}
                  className={cn(
                    "flex h-12 items-center justify-center rounded-lg text-body-xl font-semibold transition-colors",
                    selected
                      ? "bg-inverse text-inverse-foreground"
                      : disabled
                        ? "bg-secondary text-disabled-foreground"
                        : "bg-secondary text-foreground hover:bg-gray-200",
                  )}
                >
                  {monthLabel(month)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Sheet>
  );
}
