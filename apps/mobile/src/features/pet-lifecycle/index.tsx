import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef } from "react";
import { petsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { invalidateAfterPetDeleted, invalidateCareData } from "@pabom/core/api/query-keys";
import type { Pet } from "@pabom/core/domain/pet";
import { josa } from "@pabom/core/lib/josa";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { toast } from "@/shared/ui/toast";

export { useWeightStageToast } from "./use-weight-stage-toast";

/** 개체 삭제 확인 창 (C4 위험 확인) */
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
    router.navigate("/pets");
    // 떠나는 화면이 지운 개체의 상세·할 일·기록을 다시 불러 404 가 나지 않게, 그 쿼리들은 다시 부르지 않는다
    void invalidateAfterPetDeleted(queryClient, pet.id);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${josa(pet.name, "을/를")} 삭제할까요?`}
      description="기록·체크 리스트가 모두 지워지고 되돌릴 수 없어요."
      confirmLabel="삭제"
      tone="danger"
      pending={remove.isPending || remove.isSuccess}
      onConfirm={() => remove.mutate()}
      onClosed={afterClosed}
    />
  );
}
