"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { routineSummary } from "@/entities/routine";
import { routinesApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import { formatInterval, isFeedItem, RECORD_KIND_HINT } from "@pabom/core/domain/care";
import {
  FEED_INTERVAL_ASK,
  feedIntervalFromAnswer,
  feedIntervalSavedMessage,
  guidelineRange,
  ROUTINE_INTERVAL_MAX,
  ROUTINE_INTERVAL_MIN,
  type Routine,
  UNKNOWN_FEED_INTERVAL_DAYS,
} from "@pabom/core/domain/routine";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Badge, InfoBox } from "@/shared/ui/display";
import { Input, Switch } from "@/shared/ui/form";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";
import { toast } from "@/shared/ui/toast";

function useRoutineMutation() {
  const queryClient = useQueryClient();
  return {
    refresh: () => invalidateCareData(queryClient),
  };
}

/** 체크 리스트 한 줄 (SCR-P03): 항목·주기·기록 방식 · 수정 · 켜기/끄기 */
export function RoutineRow({
  routine,
  fallbackFoodName,
  onEdit,
}: {
  routine: Routine;
  /** 루틴 응답에 먹이 이름이 없을 때 보여 줄 가이드라인 기본 먹이 */
  fallbackFoodName?: string | null;
  onEdit: () => void;
}) {
  const { refresh } = useRoutineMutation();
  const label = routine.careItemName;
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => routinesApi.update(routine.id, { enabled }),
    // 켜고 끈 결과는 스위치로 보이니 토스트는 실패할 때만 (C3-4)
    onError: (error) => toast(getErrorMessage(error, "저장하지 못했어요.")),
    onSettled: refresh,
  });
  const enabled = toggle.isPending ? Boolean(toggle.variables) : routine.enabled;

  return (
    <li className="flex items-center gap-3 border-b border-border py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-body-xl font-bold">
          {label}
          {routine.customized ? <Badge tone="primary">내가 정한 주기</Badge> : null}
        </p>
        <p className="truncate text-body-md text-muted-foreground">
          {routineSummary(routine, fallbackFoodName)}
        </p>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 px-1 text-body-lg text-primary">
        수정
      </button>
      <Switch
        checked={enabled}
        aria-label={`${label} 켜기`}
        onCheckedChange={(on) => toggle.mutate(on)}
      />
    </li>
  );
}

/** 체크 리스트 항목 수정 창 (Figma P03 수정 창): 주기(1~365일) · 먹이 이름 · 기록 방식 안내 */
export function RoutineEditSheet({
  routine,
  onOpenChange,
}: {
  routine: Routine | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { refresh } = useRoutineMutation();
  const [shown, setShown] = useState<Routine | null>(null);
  // 지금 열려 있는 창이 값을 받아 온 항목. 닫히면 비워서, 같은 항목을 다시 열 때도
  // 저장·되돌리기 뒤의 최신 주기로 칸을 다시 채운다 (QA T03-04)
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [intervalText, setIntervalText] = useState("");
  const [food, setFood] = useState("");
  if (routine && routine.id !== openedId) {
    setOpenedId(routine.id);
    setShown(routine);
    setIntervalText(String(routine.intervalDays));
    setFood(routine.foodName ?? "");
  } else if (!routine && openedId !== null) {
    setOpenedId(null);
  }
  const current = routine ?? shown;
  const label = current?.careItemName ?? "";
  const feed = current ? isFeedItem(current.recordKind) : false;
  // 먹이 이름은 바꿨을 때만 보낸다. 백엔드가 foodName 을 받기 전(backend#64)에도 주기만 바꾸는 저장은 되게 한다
  const foodChanged = feed && food.trim() !== (current?.foodName ?? "");
  const days = Number(intervalText);
  const invalid =
    !Number.isInteger(days) || days < ROUTINE_INTERVAL_MIN || days > ROUTINE_INTERVAL_MAX;
  // 가이드라인 범위 안내 (v1.2 P03). 직접 바꾼 주기·한 값뿐인 범위는 숨긴다
  const range = current ? guidelineRange(current) : null;
  const outOfRange = range !== null && !invalid && (days < range.min || days > range.max);

  const save = useMutation({
    mutationFn: () =>
      routinesApi.update(current!.id, {
        intervalDays: days,
        foodName: foodChanged ? food.trim() || null : undefined,
      }),
    onSuccess: () => onOpenChange(false),
    onError: (error) => toast(getErrorMessage(error, "저장하지 못했어요.")),
    onSettled: refresh,
  });

  /** 직접 바꾼 주기를 가이드라인 기준값으로 되돌린다 (POST /routines/{id}/reset) */
  const reset = useMutation({
    mutationFn: () => routinesApi.reset(current!.id),
    onSuccess: (next) => {
      onOpenChange(false);
      toast(`가이드라인 주기(${formatInterval(next.intervalDays)})로 되돌렸어요`);
    },
    onError: (error) => toast(getErrorMessage(error, "되돌리지 못했어요.")),
    onSettled: refresh,
  });
  const pending = save.isPending || reset.isPending;

  return (
    <Sheet
      open={Boolean(routine)}
      onOpenChange={onOpenChange}
      title={`${label} 수정`}
      footer={
        // 되돌리기가 있으면 두 버튼을 위아래로 쌓는다. 한 줄이면 좁은 화면에서 저장이 밀려난다
        <div className={cn("flex w-full gap-2", current?.customized && "flex-col")}>
          {current?.customized ? (
            <Button variant="outline" size="xl" disabled={pending} onClick={() => reset.mutate()}>
              가이드라인 주기로 되돌리기
            </Button>
          ) : null}
          <Button
            size="xl"
            className={current?.customized ? undefined : "flex-1"}
            disabled={invalid || pending}
            onClick={() => save.mutate()}
          >
            저장
          </Button>
        </div>
      }
    >
      <SheetLabel className="mt-1">
        <label htmlFor="routine-interval">주기</label>
      </SheetLabel>
      <Input
        id="routine-interval"
        inputMode="numeric"
        wrapperClassName="w-[140px]"
        suffix="일마다"
        value={intervalText}
        aria-invalid={(intervalText !== "" && invalid) || undefined}
        onChange={(e) => setIntervalText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
      />
      {range ? (
        <p
          className={cn(
            "mt-1.5 text-body-md",
            outOfRange ? "text-primary" : "text-muted-foreground",
          )}
        >
          {outOfRange ? "가이드라인 범위 밖 · " : ""}가이드라인 범위: {range.min}~{range.max}일
        </p>
      ) : null}
      {feed ? (
        <>
          <SheetLabel>
            <label htmlFor="routine-food">먹이 이름</label>
          </SheetLabel>
          <Input
            id="routine-food"
            maxLength={20}
            placeholder="예: 인공 사료"
            value={food}
            onChange={(e) => setFood(e.target.value)}
          />
        </>
      ) : null}
      {current ? (
        <InfoBox className="mt-4">기록 방식 · {RECORD_KIND_HINT[current.recordKind]}</InfoBox>
      ) : null}
    </Sheet>
  );
}

/**
 * 단계 확인 전 개체의 급여 주기 질문 (P03).
 * 숫자를 넣으면 그 주기(내가 정한 주기), 비우고 저장하면 매일로 잡는다.
 */
export function FeedIntervalAsk({ routine }: { routine: Routine }) {
  const { refresh } = useRoutineMutation();
  const [text, setText] = useState(routine.customized ? String(routine.intervalDays) : "");
  const days = feedIntervalFromAnswer(text);

  const save = useMutation({
    mutationFn: async (next: number) => {
      let current = routine;
      // 모름(매일)이면 직접 정한 주기를 먼저 가이드라인으로 되돌려 '내가 정한 주기' 표시를 남기지 않는다
      if (next === UNKNOWN_FEED_INTERVAL_DAYS && current.customized) {
        current = await routinesApi.reset(current.id);
      }
      // 이미 그 주기면 다시 저장하지 않는다
      if (next !== current.intervalDays)
        await routinesApi.update(current.id, { intervalDays: next });
      return next;
    },
    onSuccess: (next) => toast(feedIntervalSavedMessage(routine.careItemName, next)),
    onError: (error) => toast(getErrorMessage(error, "저장하지 못했어요.")),
    onSettled: refresh,
  });

  return (
    <section className="mt-3.5 rounded-xl bg-primary-soft p-3.5">
      <label htmlFor="feed-interval-ask" className="text-body-xl font-bold">
        {FEED_INTERVAL_ASK.title}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <Input
          id="feed-interval-ask"
          inputMode="numeric"
          wrapperClassName="w-[140px]"
          suffix="일마다"
          placeholder="모름"
          value={text}
          aria-invalid={days === null || undefined}
          onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
        />
        <Button
          size="md"
          disabled={days === null || save.isPending}
          onClick={() => days !== null && save.mutate(days)}
        >
          저장
        </Button>
      </div>
      <p className="mt-1.5 text-body-md text-secondary-text">{FEED_INTERVAL_ASK.hint}</p>
    </section>
  );
}
