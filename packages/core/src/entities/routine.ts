import { queryOptions } from "@tanstack/react-query";
import { routinesApi } from "../api/endpoints";
import { queryKeys } from "../api/query-keys";
import { formatInterval, RECORD_KIND_LABEL } from "../domain/care";
import type { Routine } from "../domain/routine";

export const routineQueries = {
  list: (petId: string) =>
    queryOptions({
      queryKey: queryKeys.routines(petId),
      queryFn: () => routinesApi.list(petId),
    }),
};

/** 2일마다 · 먹은 정도 · 먹이: 인공 사료 */
export function routineSummary(routine: Routine, fallbackFoodName?: string | null) {
  return [
    formatInterval(routine.intervalDays),
    RECORD_KIND_LABEL[routine.recordKind],
    // 루틴 응답에 먹이 이름이 없으면 종 가이드라인의 기본 먹이로 채운다 (Figma P03 '먹이: 인공 사료')
    routine.foodName || fallbackFoodName ? `먹이: ${routine.foodName ?? fallbackFoodName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** 급여 2일 · 분무 매일 · 체중 14일 */
export function routinesShortLine(routines: Routine[]) {
  return routines
    .filter((r) => r.enabled)
    .map(
      (r) =>
        `${r.careItemName.replace(" 확인", "")} ${r.intervalDays === 1 ? "매일" : `${r.intervalDays}일`}`,
    )
    .join(" · ");
}
