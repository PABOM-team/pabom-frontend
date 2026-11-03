"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { routineSummary } from "@/entities/routine";
import { routinesApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { invalidateCareData } from "@/shared/api/query-keys";
import { isRoutineFoodNameSupported } from "@/shared/config/env";
import { formatInterval, isFeedItem, RECORD_KIND_HINT } from "@/shared/domain/care";
import { ROUTINE_INTERVAL_MAX, ROUTINE_INTERVAL_MIN, type Routine } from "@/shared/domain/routine";
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
export function RoutineRow({ routine, onEdit }: { routine: Routine; onEdit: () => void }) {
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
          {routine.customized ? <Badge tone="primary">내가 바꿈</Badge> : null}
        </p>
        <p className="truncate text-body-md text-muted-foreground">{routineSummary(routine)}</p>
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
  const [intervalText, setIntervalText] = useState("");
  const [food, setFood] = useState("");
  if (routine && routine.id !== shown?.id) {
    setShown(routine);
    setIntervalText(String(routine.intervalDays));
    setFood(routine.foodName ?? "");
  }
  const current = routine ?? shown;
  const label = current?.careItemName ?? "";
  // 먹이 이름 칸은 백엔드 일정 API에 없어 목업일 때만 보여 준다
  const feed = current ? isFeedItem(current.recordKind) && isRoutineFoodNameSupported : false;
  const days = Number(intervalText);
  const invalid =
    !Number.isInteger(days) || days < ROUTINE_INTERVAL_MIN || days > ROUTINE_INTERVAL_MAX;

  const save = useMutation({
    mutationFn: () =>
      routinesApi.update(current!.id, {
        intervalDays: days,
        foodName: feed ? food.trim() || null : undefined,
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
      toast(`기준 주기(${formatInterval(next.intervalDays)})로 되돌렸어요`);
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
        <div className="flex gap-2">
          {current?.customized ? (
            <Button
              variant="outline"
              size="xl"
              className="shrink-0"
              disabled={pending}
              onClick={() => reset.mutate()}
            >
              기준으로 되돌리기
            </Button>
          ) : null}
          <Button
            size="xl"
            className="flex-1"
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
