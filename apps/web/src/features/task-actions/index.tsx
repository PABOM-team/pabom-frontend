"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useWeightStageToast } from "@/features/pet-lifecycle";
import { recordsApi, routinesApi } from "@pabom/core/api/endpoints";
import { getApiError, getErrorMessage } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import type { CompleteInput } from "@pabom/core/domain/record";
import type { Task } from "@pabom/core/domain/today";
import { formatShortDay } from "@pabom/core/lib/date";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import type { MenuItem } from "@/shared/ui/menu";
import { toast } from "@/shared/ui/toast";
import { BasisSheet } from "./basis-sheet";
import { CompleteSheet } from "./complete-sheet";
import { PostponeSheet, SkipSheet } from "./postpone-sheet";

/**
 * 오늘 할 일 카드의 행동 모음 (FL-02·FL-03).
 * 기록 정정·일정 수정은 다른 기능이라 화면에서 콜백으로 넘겨받는다.
 */
export function useTaskActions({
  onEditRecord,
  onEditRoutine,
}: {
  onEditRecord: (recordId: string) => void;
  onEditRoutine: (task: Task) => void;
}) {
  const queryClient = useQueryClient();
  const [completing, setCompleting] = useState<Task | null>(null);
  const [postponing, setPostponing] = useState<Task | null>(null);
  const [skipping, setSkipping] = useState<Task | null>(null);
  const [basis, setBasis] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [alreadyOpen, setAlreadyOpen] = useState(false);

  const refresh = () => invalidateCareData(queryClient);
  const suggestStage = useWeightStageToast();

  const undoRecord = (recordId: string) =>
    recordsApi
      .remove(recordId)
      .then(refresh)
      .catch((error) => toast(getErrorMessage(error, "되돌리지 못했어요.")));

  const complete = useMutation({
    mutationFn: ({ task, input }: { task: Task; input: CompleteInput }) =>
      routinesApi.complete(task.routineId, input),
    onMutate: ({ task }) => setCheckingId(task.routineId),
    onSuccess: ({ record }, { task }) => {
      setCompleting(null);
      toast(`'${task.careItemName}' 기록을 저장했어요`, {
        action: { label: "되돌리기", onClick: () => undoRecord(record.id) },
      });
      // 체중을 남기면 단계 확인 전·성체 참고 체중·체중 정체에 맞춰 체크 리스트 바꾸기를 제안한다 (C3)
      if (record.weightG) {
        void suggestStage({ petId: task.petId, weightG: record.weightG, recordId: record.id });
      }
    },
    onError: (error, variables) => {
      if (getApiError(error)?.code === "ALREADY_RECORDED") {
        setCompleting(null);
        setAlreadyOpen(true);
        return;
      }
      // 시트는 그대로 두고 다시 시도 (C3-4). 오프라인이면 연결 안내 (C5-1)
      toast(navigator.onLine ? "저장하지 못했어요" : "체크하지 못했어요. 연결을 확인해 주세요", {
        action: { label: "다시 시도", onClick: () => complete.mutate(variables) },
      });
    },
    onSettled: () => {
      setCheckingId(null);
      return refresh();
    },
  });

  /** 날짜가 null이면 미루기 취소 (백엔드: postponeTo에 null을 보낸다) */
  const postpone = useMutation({
    mutationFn: ({ task, date }: { task: Task; date: string | null }) =>
      routinesApi.postpone(task.routineId, date),
    onSuccess: (_, { date }) => {
      setPostponing(null);
      toast(date ? `${formatShortDay(date)}로 미뤘어요` : "미루기를 취소했어요");
    },
    onError: (error, { date }) =>
      toast(getErrorMessage(error, date ? "미루지 못했어요." : "미루기를 취소하지 못했어요.")),
    onSettled: refresh,
  });

  const skip = useMutation({
    mutationFn: ({ task, reason }: { task: Task; reason: string | null }) =>
      routinesApi.skip(task.routineId, reason),
    // 건너뛴 할 일은 '완료·건너뜀'으로 옮겨 가니 토스트는 두지 않는다 (Figma에 없음)
    onSuccess: () => setSkipping(null),
    onError: (error) => toast(getErrorMessage(error, "건너뛰지 못했어요.")),
    onSettled: refresh,
  });

  const disable = useMutation({
    mutationFn: (task: Task) => routinesApi.update(task.routineId, { enabled: false }),
    onSuccess: () => setDeleting(null),
    onError: (error) => toast(getErrorMessage(error, "삭제하지 못했어요.")),
    onSettled: refresh,
  });

  const cancelRecord = useMutation({
    mutationFn: (recordId: string) => recordsApi.remove(recordId),
    onError: (error) => toast(getErrorMessage(error, "되돌리지 못했어요.")),
    onSettled: refresh,
  });

  /** 체크 동그라미: 값이 필요 없는 O/X 항목(분무·청소·모르는 항목 등)은 시트 없이 바로 저장 */
  const check = (task: Task) => {
    if (task.recordKind === "check") complete.mutate({ task, input: {} });
    else setCompleting(task);
  };

  const menuFor = (task: Task): MenuItem[] => {
    if (task.state === "done") {
      return [
        { label: "수정하기", onSelect: () => task.record && onEditRecord(task.record.id) },
        { label: "완료 취소", onSelect: () => task.record && cancelRecord.mutate(task.record.id) },
      ];
    }
    if (task.state === "skipped") {
      return [
        {
          label: "건너뛰기 취소",
          onSelect: () => task.record && cancelRecord.mutate(task.record.id),
        },
        { label: "수정하기", onSelect: () => onEditRoutine(task) },
      ];
    }
    // 미룬 할 일(원래 예정일이 있음)은 미루기를 취소해 원래 날로 되돌릴 수 있다
    const cancelPostpone: MenuItem[] = task.originalDueOn
      ? [{ label: "미루기 취소", onSelect: () => postpone.mutate({ task, date: null }) }]
      : [];
    // 앞 날짜(U1)의 ⋯: 그날 할 일은 아직 체크·미루기를 못 하니 일정 자체를 고치거나 지운다
    if (task.state === "planned") {
      return [
        { label: "수정하기", onSelect: () => onEditRoutine(task) },
        ...cancelPostpone,
        { label: "삭제하기", tone: "danger", onSelect: () => setDeleting(task) },
      ];
    }
    return [
      { label: "수정하기", onSelect: () => onEditRoutine(task) },
      { label: "미루기", onSelect: () => setPostponing(task) },
      ...cancelPostpone,
      { label: "건너뛰기", onSelect: () => setSkipping(task) },
      { label: "삭제하기", tone: "danger", onSelect: () => setDeleting(task) },
    ];
  };

  const sheets = (
    <>
      <CompleteSheet
        task={completing}
        onOpenChange={(open) => !open && setCompleting(null)}
        pending={complete.isPending}
        onSubmit={(task, input) => complete.mutate({ task, input })}
      />
      <PostponeSheet
        task={postponing}
        onOpenChange={(open) => !open && setPostponing(null)}
        pending={postpone.isPending}
        onSubmit={(task, date) => postpone.mutate({ task, date })}
      />
      <SkipSheet
        task={skipping}
        onOpenChange={(open) => !open && setSkipping(null)}
        pending={skip.isPending}
        onSubmit={(task, reason) => skip.mutate({ task, reason })}
      />
      <BasisSheet task={basis} onOpenChange={(open) => !open && setBasis(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `'${deleting.careItemName}' 할 일을 삭제할까요?` : ""}
        description="앞으로 오늘 할 일에 뜨지 않아요. 체크 리스트에서 다시 켤 수 있어요."
        confirmLabel="삭제"
        tone="danger"
        pending={disable.isPending}
        onConfirm={() => deleting && disable.mutate(deleting)}
      />
      <ConfirmDialog
        open={alreadyOpen}
        onOpenChange={setAlreadyOpen}
        title="다른 기기에서 이미 기록했어요"
        description="목록을 새로 불러올게요."
        confirmLabel="확인"
        cancelLabel={null}
        onConfirm={() => {
          setAlreadyOpen(false);
          void refresh();
        }}
      />
    </>
  );

  return { check, menuFor, openBasis: setBasis, checkingId, sheets };
}
