"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useEffect, useState } from "react";
import { petQueries } from "@/entities/pet";
import { recordQueries } from "@/entities/record";
import { useFeedResultSet } from "@/entities/species";
import { intakeOptionsFor, WEIGHT_CODE, type Intake } from "@pabom/core/domain/care";
import { MEMO_MAX, type CompleteInput } from "@pabom/core/domain/record";
import type { Task } from "@pabom/core/domain/today";
import { nowIso } from "@pabom/core/lib/date";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/form";
import { PlusIcon } from "@/shared/ui/icons";
import { SheetFrame } from "@/shared/ui/sheet";
import { pressWeightKey, WeightKeypad, weightKeyOf, type WeightKey } from "./weight-keypad";

/**
 * 완료 체크 시트 (SCR-H02 기록 시트). 급여는 먹은 결과 카드, 체중은 큰 숫자 + 숫자 키패드.
 * 값을 고르기 전에는 저장할 수 없다 (C2-3). 체중은 지난 기록을 미리 채워 둔다
 */
export function CompleteSheet({
  task,
  onOpenChange,
  onSubmit,
  pending,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Task, input: CompleteInput) => void;
  pending: boolean;
}) {
  const [shown, setShown] = useState<Task | null>(task);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [weight, setWeight] = useState("");
  /** 미리 채운 체중을 아직 건드리지 않았다: 첫 숫자를 누르면 새로 쓴다 */
  const [weightFresh, setWeightFresh] = useState(false);
  const [memo, setMemo] = useState("");
  const [memoOpen, setMemoOpen] = useState(false);
  /** 체중 시트에서 지금 고치는 칸. 메모를 쓰는 동안은 숫자 키패드를 내린다 */
  const [editing, setEditing] = useState<"weight" | "memo">("weight");
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);

  // 새 할 일로 열릴 때마다 입력을 비운다
  if (task && task.routineId !== shown?.routineId) {
    setShown(task);
    setIntake(null);
    setWeight("");
    setWeightFresh(false);
    setMemo("");
    setMemoOpen(false);
    setEditing("weight");
    setPrefilledFor(null);
  }

  const current = task ?? shown;
  const kind = current?.recordKind ?? null;
  // 급여 카드는 그 개체 종의 먹이 묶음(인공 사료·곤충·통먹이)에 맞춘다 (D2)
  const { data: pets } = useQuery({ ...petQueries.list(), enabled: kind === "intake" });
  const feedResultSet = useFeedResultSet(
    pets?.find((p) => p.id === current?.petId)?.speciesId,
    kind === "intake" ? current?.careItem : null,
  );
  const { data: lastWeight } = useQuery({
    ...recordQueries.list({ petId: current?.petId, careItem: WEIGHT_CODE, limit: 1 }),
    enabled: kind === "weight" && Boolean(task),
  });
  const last = lastWeight?.items[0];
  const lastWeightG = last?.weightG;
  if (current && lastWeightG && prefilledFor !== current.routineId && weight === "") {
    setPrefilledFor(current.routineId);
    setWeight(lastWeightG.toFixed(1));
    setWeightFresh(true);
  }
  const weightValue = weight ? Number(weight) : null;
  const weightInvalid = weight !== "" && (!weightValue || weightValue <= 0 || weightValue > 5000);
  const missingValue =
    (kind === "intake" && !intake) || (kind === "weight" && (!weightValue || weightInvalid));

  const options = intakeOptionsFor(feedResultSet);
  const mainOptions = options.filter((o) => o.value !== "unobserved");
  const unobserved = options.find((o) => o.value === "unobserved");

  const title = !current
    ? ""
    : kind === "intake"
      ? `${current.petName}, 오늘 먹었나요?`
      : kind === "weight"
        ? `${current.petName}, 몸무게는 얼마인가요?`
        : `${current.petName} · ${current.title}`;

  const keypadOpen = Boolean(task) && kind === "weight" && editing === "weight";
  const pressKey = (key: WeightKey) => {
    setWeight((value) => pressWeightKey(weightFresh ? "" : value, key));
    setWeightFresh(false);
  };

  // 데스크톱 웹: 키패드가 떠 있는 동안 물리 키보드 숫자도 받는다
  useEffect(() => {
    if (!keypadOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = weightKeyOf(e.key);
      if (!key) return;
      e.preventDefault();
      setWeight((value) => pressWeightKey(weightFresh ? "" : value, key));
      setWeightFresh(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keypadOpen, weightFresh]);

  return (
    <SheetFrame
      open={Boolean(task)}
      onOpenChange={onOpenChange}
      label={title || "기록하기"}
      footer={
        <div className="flex w-full flex-col">
          <Button
            size="xl"
            disabled={missingValue}
            loading={pending}
            aria-label={pending ? "저장 중" : undefined}
            onClick={() =>
              current &&
              onSubmit(current, {
                occurredAt: nowIso(),
                intake,
                weightG: weightValue,
                memo: memo.trim() || null,
              })
            }
          >
            기록하기
          </Button>
          {keypadOpen ? <WeightKeypad onKey={pressKey} /> : null}
        </div>
      }
    >
      <h2 aria-hidden className="pb-5 text-title-xs text-foreground">
        {title}
      </h2>

      {kind === "intake" ? (
        <div role="radiogroup" aria-label="먹은 정도" className="pb-4">
          <div className="flex flex-wrap gap-2.5">
            {mainOptions.map((option) => {
              const selected = intake === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setIntake(selected ? null : option.value)}
                  className={cn(
                    "flex h-23.5 min-w-[45%] flex-1 basis-0 items-center justify-center rounded-xl border-[1.5px] px-2 text-center text-body-xl font-bold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    selected
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-transparent bg-muted text-foreground active:bg-gray-200",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {unobserved ? (
            <button
              type="button"
              role="radio"
              aria-checked={intake === unobserved.value}
              onClick={() => setIntake(intake === unobserved.value ? null : unobserved.value)}
              className={cn(
                "mt-2 flex h-12 w-full items-center justify-center rounded-lg border-[1.5px] text-body-lg font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                intake === unobserved.value
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-transparent bg-muted text-secondary-text active:bg-gray-200",
              )}
            >
              {unobserved.label}
            </button>
          ) : null}
        </div>
      ) : null}

      {kind === "weight" ? (
        <button
          type="button"
          aria-label={`몸무게, ${weight ? `${weight} g` : "비어 있음"}`}
          onClick={() => setEditing("weight")}
          className="flex w-full flex-col items-start gap-1.5 pb-4.5 text-left outline-none"
        >
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-title-xl",
                weightInvalid
                  ? "text-destructive"
                  : weight
                    ? "text-foreground"
                    : "text-disabled-foreground",
              )}
            >
              {weight || "0.0"}
            </span>
            {keypadOpen ? (
              <span aria-hidden className="h-8 w-0.5 animate-pulse bg-primary" />
            ) : null}
            <span className="text-title-sm font-semibold text-muted-foreground">g</span>
          </span>
          {lastWeightG && last ? (
            <span className="text-body-lg text-muted-foreground">
              지난번 {lastWeightG}g ·{" "}
              {formatDistanceToNowStrict(parseISO(last.occurredAt), { locale: ko })} 전
            </span>
          ) : null}
        </button>
      ) : null}

      <div className="h-px bg-border" />
      {memoOpen ? (
        <div className="flex flex-col gap-2 py-3.5" onFocus={() => setEditing("memo")}>
          <label htmlFor="complete-memo" className="text-body-lg font-medium text-secondary-text">
            메모
          </label>
          <Textarea
            id="complete-memo"
            placeholder="메모를 남겨 주세요"
            maxLength={MEMO_MAX}
            value={memo}
            autoFocus
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setMemoOpen(true);
            setEditing("memo");
          }}
          className="flex min-h-11 items-center gap-1.5 pt-1.5 pb-3 text-body-lg font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <PlusIcon className="size-4.5" strokeWidth={1.8} />
          메모 남기기
        </button>
      )}
    </SheetFrame>
  );
}
