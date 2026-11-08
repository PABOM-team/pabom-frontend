import { queryOptions } from "@tanstack/react-query";
import { petsApi } from "../api/endpoints";
import { queryKeys } from "../api/query-keys";
import type { PetStatus } from "../domain/pet";

// 응답은 api/endpoints에서 zod로 한 번 검증한다
export const petQueries = {
  all: () => queryKeys.pets,
  list: (status: PetStatus = "active") =>
    queryOptions({
      queryKey: queryKeys.petList(status),
      queryFn: () => petsApi.list(status),
    }),
  detail: (petId: string) =>
    queryOptions({
      queryKey: queryKeys.pet(petId),
      queryFn: () => petsApi.get(petId),
    }),
};
