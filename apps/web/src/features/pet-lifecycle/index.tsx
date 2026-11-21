"use client";

export { useWeightStageToast } from "./use-weight-stage-toast";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { petsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { invalidateAfterPetDeleted, invalidateCareData } from "@pabom/core/api/query-keys";
import type { Pet } from "@pabom/core/domain/pet";
import { josa } from "@pabom/core/lib/josa";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { toast } from "@/shared/ui/toast";

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => petsApi.remove(pet.id),
    onSuccess: () => {
      onOpenChange(false);
      router.replace("/pets");
      // 떠나는 상세 화면이 지운 개체의 상세·할 일·기록을 다시 불러 404 가 나지 않게, 그 쿼리들은 다시 부르지 않는다
      void invalidateAfterPetDeleted(queryClient, pet.id);
    },
    onError: (error) => {
      toast(getErrorMessage(error, "삭제하지 못했어요."));
      void invalidateCareData(queryClient);
    },
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${josa(pet.name, "을/를")} 삭제할까요?`}
      description="기록·체크 리스트가 모두 지워지고 되돌릴 수 없어요."
      confirmLabel="삭제"
      tone="danger"
      pending={remove.isPending}
      onConfirm={() => remove.mutate()}
    />
  );
}
