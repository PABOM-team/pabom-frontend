"use client";

import { useEffect, useEffectEvent, type ReactNode } from "react";
import type { Intake, IntakeOption } from "@pabom/core/domain/care";
import { cn } from "@/shared/lib/utils";
import { CheckIcon, ChevronRightIcon, PlusIcon } from "@/shared/ui/icons";

/** 시트 안 단계 하나. 처음 그릴 때 옆에서 살짝 밀려 들어온다 (Figma SMART_ANIMATE 0.3s ease-out) */
export function StepView({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in duration-300 ease-out fade-in-0 slide-in-from-right-6">
      {children}
    </div>
  );
}

/** 구분선 */
export function SheetDivider() {
  return <div aria-hidden className="h-px bg-border" />;
}

/** 오른쪽에 값이 있는 줄 (언제 · 먹이). onClick 이 없으면 보기만 */
export function DetailRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: ReactNode;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="flex-1 text-left text-body-xl text-secondary-text">{label}</span>
      {typeof value === "string" ? (
        <span className="text-body-xl font-medium text-foreground">{value}</span>
      ) : (
        value
      )}
      {onClick ? <ChevronRightIcon className="size-4.5 shrink-0 text-subtle-foreground" /> : null}
    </>
  );
  const className = "flex min-h-[49px] w-full items-center gap-1.5";
  return onClick ? (
    <button
      type="button"
      aria-label={typeof value === "string" ? `${label}, ${value}` : label}
      onClick={onClick}
      className={cn(className, "transition-opacity active:opacity-60")}
    >
      {inner}
    </button>
  ) : (
    <div className={className}>{inner}</div>
  );
}

/** '+ 사진·메모 남기기'. 누르면 사진·메모 칸이 열린다 */
export function AddExtraLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 pt-1.5 pb-4.5 text-body-xl font-medium text-muted-foreground transition-opacity active:opacity-60"
    >
      <PlusIcon className="size-4.5" />
      사진·메모 남기기
    </button>
  );
}

/** 먹은 정도 큰 카드 이름 (부제는 먹이 묶음의 이름) */
const INTAKE_TITLE: Record<Intake, string> = {
  all: "먹었어요",
  partial: "조금 먹었어요",
  none: "안 먹었어요",
  unobserved: "확인 못 했어요",
  trace_found: "먹었어요",
  trace_not_found: "안 먹었어요",
};

/**
 * 먹었는지 큰 카드 (Figma R03 3 급여 · R02): 자주 고르는 답은 큰 카드, '확인 못 했어요'는 아래 낮은 칸.
 * 고른 카드는 파란 테두리. 다시 누르면 고름이 풀린다
 */
export function IntakeChoice({
  options,
  value,
  onChange,
}: {
  options: readonly IntakeOption[];
  value: Intake | null;
  onChange: (value: Intake | null) => void;
}) {
  const main = options.filter((o) => o.value !== "unobserved");
  const unobserved = options.find((o) => o.value === "unobserved");
  const toggle = (next: Intake) => onChange(value === next ? null : next);
  const box =
    "flex items-center justify-center border-[1.5px] bg-secondary transition-colors hover:bg-gray-200";
  const selectedBox = "border-primary bg-primary/10 hover:bg-primary/10";

  return (
    <div role="radiogroup" aria-label="먹은 정도" className="flex flex-col gap-2">
      <div className="flex gap-2.5">
        {main.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => toggle(option.value)}
              className={cn(
                box,
                "min-h-[94px] flex-1 flex-col gap-1 rounded-xl px-2 text-center",
                selected ? selectedBox : "border-transparent",
              )}
            >
              <span
                className={cn(
                  "text-body-xl font-bold",
                  selected ? "text-primary" : "text-foreground",
                )}
              >
                {INTAKE_TITLE[option.value]}
              </span>
              <span
                className={cn("text-body-md", selected ? "text-primary" : "text-subtle-foreground")}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      {unobserved ? (
        <button
          type="button"
          role="radio"
          aria-checked={value === "unobserved"}
          onClick={() => toggle("unobserved")}
          className={cn(
            box,
            "h-12 rounded-lg text-body-xl font-medium",
            value === "unobserved"
              ? cn(selectedBox, "text-primary")
              : "border-transparent text-secondary-text",
          )}
        >
          {INTAKE_TITLE.unobserved}
        </button>
      ) : null}
    </div>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"] as const;
type Key = (typeof KEYS)[number];

/** 숫자 키패드에서 한 글자를 넣은 결과. 소수점은 하나, 소수 한 자리, 정수 네 자리까지 */
export const pressKey = (current: string, key: Key) => {
  if (key === "⌫") return current.slice(0, -1);
  if (key === ".") return current.includes(".") ? current : `${current || "0"}.`;
  const [int = "", frac] = current.split(".");
  if (frac !== undefined) return frac.length >= 1 ? current : `${current}${key}`;
  if (int === "0") return key;
  return int.length >= 4 ? current : `${current}${key}`;
};

/** 몸무게 큰 숫자 + 커서 + g (Figma R03 2 체중) */
export function WeightDisplay({ value, hint }: { value: string; hint?: string | null }) {
  return (
    <div className="flex flex-col gap-1.5 pb-4.5">
      <div className="flex items-center gap-1.5" role="status" aria-label={`몸무게 ${value || "0"}g`}>
        <span
          className={cn("text-title-xl", value ? "text-foreground" : "text-disabled-foreground")}
        >
          {value || "0.0"}
        </span>
        <span aria-hidden className="h-9 w-0.5 animate-pulse bg-primary" />
        <span className="text-title-sm font-semibold text-subtle-foreground">g</span>
      </div>
      {hint ? <p className="text-body-lg text-subtle-foreground">{hint}</p> : null}
    </div>
  );
}

/** 숫자 키패드 (시스템 키보드 대신). 컴퓨터에서는 숫자·점·백스페이스 키로도 넣는다 */
export function Keypad({ onKey }: { onKey: (key: Key) => void }) {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, [contenteditable]")) return;
    const key = e.key === "Backspace" ? "⌫" : e.key;
    if ((KEYS as readonly string[]).includes(key)) {
      e.preventDefault();
      onKey(key as Key);
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="grid grid-cols-3 pt-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={key === "⌫" ? "지우기" : key === "." ? "소수점" : key}
          onClick={() => onKey(key)}
          className="flex items-center justify-center rounded-lg py-3 text-title-sm font-medium text-foreground transition-colors hover:bg-muted active:bg-muted"
        >
          {key}
        </button>
      ))}
    </div>
  );
}

/** 둥근 체크 (Figma '체크': 회색 동그라미 · 고르면 파랑) */
export function CheckDot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-card transition-colors",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <CheckIcon className="size-4" strokeWidth={3} />
    </span>
  );
}
