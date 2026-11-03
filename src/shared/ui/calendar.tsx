"use client";

import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfYear,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  setMonth as setMonthOf,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { useState, type ReactNode } from "react";
import { formatFullDate, fromYmd, toYmd } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Button } from "./button";
import { FieldButton } from "./form";
import { Sheet } from "./sheet";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = Array.from({ length: 12 }, (_, i) => i);

const NAV_BUTTON =
  "flex size-10 items-center justify-center rounded-full text-muted-foreground disabled:opacity-30";

/** 연·월 고르기. 헤더를 누르면 날짜 격자 대신 보인다 */
function YearMonthPicker({
  month,
  min,
  max,
  onPick,
}: {
  month: Date;
  min?: string;
  max?: string;
  onPick: (month: Date) => void;
}) {
  const [year, setYear] = useState(() => startOfYear(month));
  const canPrevYear = !min || toYmd(endOfYear(subYears(year, 1))) >= min;
  const canNextYear = !max || toYmd(startOfYear(addYears(year, 1))) <= max;

  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          aria-label="이전 해"
          disabled={!canPrevYear}
          onClick={() => setYear((y) => subYears(y, 1))}
          className={NAV_BUTTON}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <p className="text-body-xl font-bold">{format(year, "yyyy년")}</p>
        <button
          type="button"
          aria-label="다음 해"
          disabled={!canNextYear}
          onClick={() => setYear((y) => addYears(y, 1))}
          className={NAV_BUTTON}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 py-1">
        {MONTHS.map((i) => {
          const candidate = setMonthOf(year, i);
          const disabled =
            (min && toYmd(endOfMonth(candidate)) < min) ||
            (max && toYmd(startOfMonth(candidate)) > max);
          const selected = isSameMonth(candidate, month);
          return (
            <button
              key={i}
              type="button"
              disabled={Boolean(disabled)}
              aria-pressed={selected}
              onClick={() => onPick(startOfMonth(candidate))}
              className={cn(
                "flex h-11 items-center justify-center rounded-lg text-body-lg",
                disabled ? "text-disabled-foreground" : "text-foreground hover:bg-muted",
                selected && "bg-primary font-bold text-white hover:bg-primary",
              )}
            >
              {i + 1}월
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 달력 한 달 (D3). min/max 밖의 날은 고를 수 없다 */
export function Calendar({
  value,
  onChange,
  min,
  max,
  today = toYmd(new Date()),
}: {
  value: string | null;
  onChange: (ymd: string) => void;
  min?: string;
  max?: string;
  today?: string;
}) {
  const [month, setMonth] = useState(() => startOfMonth(fromYmd(value ?? today)));
  const [picking, setPicking] = useState(false);
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const blanks = getDay(days[0]!);
  const canPrev = !min || toYmd(endOfMonth(subMonths(month, 1))) >= min;
  const canNext = !max || toYmd(startOfMonth(addMonths(month, 1))) <= max;

  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          aria-label="이전 달"
          disabled={!canPrev}
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className={cn(NAV_BUTTON, picking && "invisible")}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label="연·월 고르기"
          aria-expanded={picking}
          onClick={() => setPicking((p) => !p)}
          className="flex h-10 items-center gap-1 rounded-lg px-2 text-body-xl font-bold hover:bg-muted"
        >
          {format(month, "yyyy년 M월")}
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              picking && "rotate-180",
            )}
          />
        </button>
        <button
          type="button"
          aria-label="다음 달"
          disabled={!canNext}
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className={cn(NAV_BUTTON, picking && "invisible")}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      {picking ? (
        <YearMonthPicker
          month={month}
          min={min}
          max={max}
          onPick={(m) => {
            setMonth(m);
            setPicking(false);
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-7 text-center text-body-md text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1.5">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {Array.from({ length: blanks }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {days.map((day) => {
              const ymd = toYmd(day);
              const disabled = (min && ymd < min) || (max && ymd > max);
              const selected = value === ymd;
              const isToday = isSameDay(day, fromYmd(today));
              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={Boolean(disabled)}
                  aria-pressed={selected}
                  aria-label={formatFullDate(day)}
                  onClick={() => onChange(ymd)}
                  className={cn(
                    "mx-auto flex size-9 items-center justify-center rounded-full text-body-lg",
                    disabled ? "text-disabled-foreground" : "text-foreground hover:bg-muted",
                    isToday && !selected && "border-[1.5px] border-primary font-bold text-primary",
                    selected && "bg-primary font-bold text-white hover:bg-primary",
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** 달력을 시트로 띄워 날짜 하나를 고른다 */
export function DatePickerSheet({
  open,
  onOpenChange,
  title,
  value,
  onConfirm,
  min,
  max,
  hint,
  previewText,
  confirmLabel = "고르기",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string | null;
  onConfirm: (ymd: string) => void;
  min?: string;
  max?: string;
  hint?: ReactNode;
  previewText?: (ymd: string) => ReactNode;
  confirmLabel?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setDraft(value);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <Button
          size="xl"
          disabled={!draft}
          onClick={() => {
            if (!draft) return;
            onConfirm(draft);
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      }
    >
      <Calendar value={draft} onChange={setDraft} min={min} max={max} />
      {hint ? <p className="mt-3 text-body-md text-muted-foreground">{hint}</p> : null}
      {draft && previewText ? (
        <p className="mt-2 text-body-lg font-medium text-primary">{previewText(draft)}</p>
      ) : null}
    </Sheet>
  );
}

/** 날짜 칸. 누르면 달력 시트 */
export function DateField({
  id,
  value,
  onChange,
  title,
  placeholder = "날짜를 골라 주세요",
  min,
  max,
  hint,
  disabled,
  invalid,
  format = formatFullDate,
}: {
  id?: string;
  value: string | null;
  onChange: (ymd: string) => void;
  title: string;
  placeholder?: string;
  min?: string;
  max?: string;
  hint?: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
  /** 칸에 보이는 날짜 모양. 기본은 '2026년 3월 2일' */
  format?: (ymd: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FieldButton
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        icon={<CalendarIcon />}
        onClick={() => setOpen(true)}
      >
        {value ? format(value) : null}
      </FieldButton>
      <DatePickerSheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        value={value}
        onConfirm={onChange}
        min={min}
        max={max}
        hint={hint}
      />
    </>
  );
}
