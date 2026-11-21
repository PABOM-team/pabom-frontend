import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { petsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { invalidateCareData, queryKeys } from "@pabom/core/api/query-keys";
import { isPetStatusChangeSupported } from "@pabom/core/config/env";
import {
  END_REASON_LABEL,
  endReasonSchema,
  type EndReason,
  type Pet,
} from "@pabom/core/domain/pet";
import { formatDayLabel, todayYmd } from "@pabom/core/lib/date";
import { josa } from "@pabom/core/lib/josa";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { ChipGroup } from "@/shared/ui/chip";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";
import { toast } from "@/shared/ui/toast";

export { useWeightStageToast } from "./use-weight-stage-toast";

/** 개체를 함께했던 개체로 바꾸는 시트 (SCR-P06). 기록은 남고 오늘 할 일·체크 리스트에서 빠진다 */
export function ChangeStatusSheet({
  pet,
  open,
  onOpenChange,
}: {
  pet: Pet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<EndReason | null>("rehomed");
  const [date, setDate] = useState<string | null>(todayYmd());

  const change = useMutation({
    mutationFn: () => petsApi.changeStatus(pet.id, { type: "end", reason: reason!, date: date! }),
    // 바꾼 뒤에는 내 개체(P01)로. 결과 토스트는 Figma에 없다
    onSuccess: () => {
      onOpenChange(false);
      router.replace("/pets");
    },
    onError: (error) => toast(getErrorMessage(error, "바꾸지 못했어요.")),
    onSettled: () => invalidateCareData(queryClient),
  });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${josa(pet.name, "을/를")} 함께했던 개체로 바꾸기`}
      description="기록은 그대로 남고, 오늘 할 일과 체크 리스트에서 빠져요."
      footer={
        <Button
          size="xl"
          style={{ flex: 1 }}
          disabled={!reason || !date}
          loading={change.isPending}
          onPress={() => change.mutate()}
        >
          바꾸기
        </Button>
      }
    >
      <SheetLabel first>이유</SheetLabel>
      <ChipGroup
        label="이유"
        options={endReasonSchema.options.map((value) => ({
          value,
          label: END_REASON_LABEL[value],
        }))}
        value={reason}
        onChange={setReason}
      />
      <SheetLabel>날짜</SheetLabel>
      <DateField
        title="날짜"
        value={date}
        onChange={setDate}
        max={todayYmd()}
        format={formatDayLabel}
      />
    </Sheet>
  );
}

/** 함께했던 개체를 다시 키우는 중으로 */
export function useRevertPetStatus(pet: Pet | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => petsApi.changeStatus(pet!.id, { type: "revert" }),
    onSuccess: () => router.replace({ pathname: "/pets/[petId]", params: { petId: pet!.id } }),
    onError: (error) => toast(getErrorMessage(error)),
    onSettled: () => invalidateCareData(queryClient),
  });
}

/** 개체 삭제 확인 창 (C4 위험 확인). 잘못 만든 개체를 지울 때만, 떠나보낸 개체는 상태 변경을 안내 */
export function DeletePetDialog({
  pet,
  open,
  onOpenChange,
}: {
  pet: Pet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  /**
   * 지운 뒤 이동은 확인 창 Modal 이 다 내려간 뒤에 한다. 닫히는 중에 화면을 바꾸거나, 상세를 다시 불러 404
   * (없는 개체 화면)로 바뀌며 창이 통째로 빠지면 iOS 에서 보이지 않는 창이 남아 아무것도 눌리지 않는다
   */
  const deleted = useRef(false);
  const remove = useMutation({
    mutationFn: () => petsApi.remove(pet.id),
    onSuccess: () => {
      deleted.current = true;
      onOpenChange(false);
    },
    onError: (error) => {
      toast(getErrorMessage(error, "삭제하지 못했어요."));
      void invalidateCareData(queryClient);
    },
  });

  const afterClosed = () => {
    if (!deleted.current) return;
    deleted.current = false;
    // replace 는 맨 위 화면만 바꿔 아래에 깔린 지운 개체의 상세·수정·기록 화면이 남는다. 뒤로 오면 404 가 뜨니
    // 쌓인 화면을 탭 바로 위까지 모두 걷어 낸 뒤 목록으로 간다
    if (router.canDismiss()) router.dismissAll();
    router.navigate(pet.status === "ended" ? "/pets/archived" : "/pets");
    // 떠나는 상세 화면이 지운 개체를 다시 불러 404 화면을 띄우지 않게, 그 개체 상세는 다시 부르지 않고 버린다
    queryClient.removeQueries({ queryKey: queryKeys.pet(pet.id), exact: true });
    void invalidateCareData(queryClient);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${josa(pet.name, "을/를")} 삭제할까요?`}
      description={
        pet.status === "active" && isPetStatusChangeSupported
          ? "기록·체크 리스트가 모두 지워져요. 분양 보냈거나 무지개다리를 건넜다면 삭제 대신 '함께했던 개체로 바꾸기'를 써 주세요."
          : "기록·체크 리스트가 모두 지워지고 되돌릴 수 없어요."
      }
      confirmLabel="삭제"
      tone="danger"
      pending={remove.isPending || remove.isSuccess}
      onConfirm={() => remove.mutate()}
      onClosed={afterClosed}
    />
  );
}
