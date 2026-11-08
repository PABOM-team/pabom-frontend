"use client";

import { useQueryClient } from "@tanstack/react-query";
import { petQueries } from "@/entities/pet";
import { speciesQueries } from "@/entities/species";
import { petsApi, recordsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import { WEIGHT_CODE } from "@pabom/core/domain/care";
import { lifeStageIdOf } from "@pabom/core/domain/pet";
import { PLATEAU_SAMPLE, weightStageSuggestion } from "@pabom/core/domain/weight-stage";
import { toast } from "@/shared/ui/toast";

/**
 * 체중을 저장한 뒤 체크 리스트 바꾸기를 토스트로 제안한다 (Figma v1.2 메모 C3 토스트 · 성공 + 행동).
 * - ③ 단계 확인 전: "체중으로 보면 {단계}예요. 체크 리스트를 맞춰 드릴까요?" [맞추기]
 * - ② 어린 개체가 성체 참고 체중 이상: "다 자란 것 같아요. 성체 기준 체크 리스트로 바꿀까요?" [바꾸기]
 * - ① 어린 개체의 최근 체중 3개가 정체: "체중이 더 늘지 않고 있어요. …" [바꾸기]
 * 토스트는 한 번에 하나라 '나중에'는 따로 없고, 그냥 두면 사라진다.
 * 제안할 게 있으면 true
 */
export function useWeightStageToast() {
  const queryClient = useQueryClient();

  const setStage = (petId: string, code: string) =>
    petsApi
      .update(petId, { lifeStageId: lifeStageIdOf(code), stageCertainty: "CONFIRMED" })
      .then(() => toast("체크 리스트를 바꿨어요"))
      .catch((error: unknown) => toast(getErrorMessage(error, "단계를 바꾸지 못했어요.")))
      .finally(() => invalidateCareData(queryClient));

  return async ({
    petId,
    weightG,
    recordId,
  }: {
    petId: string;
    weightG: number;
    /** 방금 저장한 기록. 목록에 이미 있으면 한 번만 세려고 뺀다 */
    recordId: string;
  }) => {
    try {
      const [pets, speciesList] = await Promise.all([
        queryClient.fetchQuery(petQueries.list("active")),
        queryClient.fetchQuery(speciesQueries.list()),
      ]);
      const pet = pets.find((p) => p.id === petId);
      const species = speciesList.find((s) => s.id === pet?.speciesId);
      if (!pet || !species || pet.lifeStageCode === "adult") return false;
      // 정체 판단에만 지난 체중이 필요하다. 방금 저장한 기록이 목록에 아직 없을 수 있어 앞에 따로 둔다
      const recent =
        pet.lifeStageCode === "juvenile"
          ? await recordsApi.list({ petId, careItem: WEIGHT_CODE, limit: PLATEAU_SAMPLE })
          : null;
      const earlier = (recent?.items ?? [])
        .filter((r) => r.id !== recordId)
        .map((r) => r.weightG)
        .filter((w): w is number => Boolean(w));
      const weights = [weightG, ...earlier];
      const suggestion = weightStageSuggestion({ pet, species, weights });
      if (!suggestion) return false;
      toast(suggestion.message, {
        action: {
          label: suggestion.actionLabel,
          onClick: () => setStage(petId, suggestion.stage.code),
        },
      });
      return true;
    } catch {
      // 제안은 덤이라 실패해도 저장 흐름을 막지 않는다
      return false;
    }
  };
}
