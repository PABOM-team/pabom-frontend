"use client";

import { CalendarIcon } from "./icons";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/shared/lib/utils";
import { formatDateTime, timeOf, toYmd, withTime, ymdOf } from "@pabom/core/lib/date";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { FieldButton } from "./form";
import { Sheet } from "./sheet";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type Clock = { pm: boolean; hour: number; minute: number };

const toClock = (hhmm: string): Clock => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return { pm: h >= 12, hour: h % 12 === 0 ? 12 : h % 12, minute: m };
};

const fromClock = ({ pm, hour, minute }: Clock) =>
  `${String((hour % 12) + (pm ? 12 : 0)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

/** 시각 끝 숫자를 읽는 소리에 맞춘 조사: 8:30(삼십)으로, 8:02(이)로 */
const roParticle = (iso: string) => (/[036]$/.test(timeOf(iso)) ? "으로" : "로");

/** 고른 값 칸 높이 (Figma 시각 고르기: 흰 32px 칸 위아래로 앞뒤 값) */
const ROW = 32;

/**
 * 세로로 굴리는 값 고르기 한 칸 (오전·오후 / 시 / 분, 앱 date-time-field.tsx 의 Wheel).
 * 가운데 흰 칸이 고른 값이고, 위아래 흐린 값을 누르거나 굴려서 바꾼다. 위·아래 화살표 키로도 바뀐다
 */
function Wheel<T extends string | number>({
  label,
  options,
  value,
  onChange,
  render = String,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  render?: (value: T) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  /** 굴리거나 눌러서 바꾼 값이면 이미 그 자리에 있으니 다시 옮기지 않는다 */
  const fromWheel = useRef(false);
  const index = Math.max(0, options.indexOf(value));

  // 바깥에서 값이 바뀌면(시트를 다시 열 때 등) 그 자리로 옮긴다
  useEffect(() => {
    if (fromWheel.current) {
      fromWheel.current = false;
      return;
    }
    ref.current?.scrollTo({ top: index * ROW });
  }, [index]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const pick = (next: T | undefined) => {
    if (next === undefined || next === value) return;
    fromWheel.current = true;
    onChange(next);
  };

  const moveTo = (i: number) => {
    const next = options[i];
    if (next === undefined) return;
    ref.current?.scrollTo({ top: i * ROW, behavior: "smooth" });
    pick(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    moveTo(index + (event.key === "ArrowDown" ? 1 : -1));
  };

  return (
    <div
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuetext={render(value)}
      aria-valuenow={index}
      aria-valuemin={0}
      aria-valuemax={options.length - 1}
      onKeyDown={onKeyDown}
      className="relative h-24 min-w-0 flex-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <div className="pointer-events-none absolute inset-x-0 top-8 h-8 rounded-md bg-card" />
      <div
        ref={ref}
        className="relative scrollbar-none h-full snap-y snap-mandatory overflow-y-auto overscroll-contain py-8"
        onScroll={(event) => {
          const top = event.currentTarget.scrollTop;
          window.clearTimeout(settleTimer.current);
          // 굴림이 멈추면 가운데 값을 고른다
          settleTimer.current = window.setTimeout(
            () => pick(options[Math.min(options.length - 1, Math.max(0, Math.round(top / ROW)))]),
            120,
          );
        }}
      >
        {options.map((option, i) => {
          const selected = option === value;
          return (
            <button
              key={String(option)}
              type="button"
              tabIndex={-1}
              onClick={() => moveTo(i)}
              className={cn(
                "flex h-8 w-full snap-center items-center justify-center",
                selected
                  ? "text-body-xl font-semibold text-foreground"
                  : "text-body-lg text-subtle-foreground",
              )}
            >
              {render(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 기록한 시각 칸 (D3 날짜 + 시각).
 * 지금까지만 고를 수 있고, 버튼에 고른 값을 그대로 보여 준다 (예: 10월 7일 (수) 오후 8:02로 고르기)
 */
export function DateTimeField({
  value,
  onChange,
  title = "기록한 시각",
}: {
  value: string;
  onChange: (iso: string) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(ymdOf(value));
  const [clock, setClock] = useState<Clock>(toClock(timeOf(value)));
  const draft = withTime(day, fromClock(clock));
  const future = new Date(draft) > new Date();

  return (
    <>
      <FieldButton
        icon={<CalendarIcon />}
        onClick={() => {
          setDay(ymdOf(value));
          setClock(toClock(timeOf(value)));
          setOpen(true);
        }}
      >
        {formatDateTime(value)}
      </FieldButton>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        footer={
          <Button
            size="xl"
            disabled={future}
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            {`${formatDateTime(draft)}${roParticle(draft)} 고르기`}
          </Button>
        }
      >
        <Calendar value={day} onChange={setDay} max={toYmd(new Date())} />
        {/* Figma 시각 고르기: gray-100 · 모서리 12 · 세 칸 */}
        <div className="mt-3 flex gap-3 rounded-lg bg-secondary px-3 py-2">
          <Wheel
            label="오전·오후"
            options={["am", "pm"] as const}
            value={clock.pm ? "pm" : "am"}
            onChange={(v) => setClock({ ...clock, pm: v === "pm" })}
            render={(v) => (v === "am" ? "오전" : "오후")}
          />
          <Wheel
            label="시"
            options={HOURS}
            value={clock.hour}
            onChange={(hour) => setClock({ ...clock, hour })}
          />
          <Wheel
            label="분"
            options={MINUTES}
            value={clock.minute}
            onChange={(minute) => setClock({ ...clock, minute })}
            render={(m) => String(m).padStart(2, "0")}
          />
        </div>
        <p className="mt-2 text-body-md text-muted-foreground">
          지금보다 뒤 날짜·시각은 고를 수 없어요
        </p>
      </Sheet>
    </>
  );
}
