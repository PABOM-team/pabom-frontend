import type { QueryClient } from "@tanstack/react-query";

/** 쿼리 키를 한곳에 모은다. 저장 뒤 다시 불러올 범위를 맞추기 쉽게 */
export const queryKeys = {
  me: ["me"] as const,
  notificationSettings: ["me", "notification-settings"] as const,
  species: ["species"] as const,
  morphs: (serverId: number) => ["species", serverId, "morphs"] as const,
  careStandards: (speciesId: string) => ["species", speciesId, "care-standards"] as const,
  pets: ["pets"] as const,
  petList: () => ["pets", "list"] as const,
  pet: (petId: string) => ["pets", "detail", petId] as const,
  routines: (petId: string) => ["routines", petId] as const,
  today: ["today"] as const,
  todayAt: (date: string, petId?: string) => ["today", date, petId ?? "all"] as const,
  records: ["records"] as const,
  recordList: (query: object) => ["records", "list", query] as const,
  record: (recordId: string) => ["records", "detail", recordId] as const,
};

/** 할 일·기록·일정이 바뀌면 오늘 할 일과 개체 요약(오늘 할 일 수·최근 기록)도 같이 바뀐다 */
export function invalidateCareData(queryClient: QueryClient) {
  return Promise.all(
    [queryKeys.today, queryKeys.records, queryKeys.pets, ["routines"]].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

/** 이 개체에만 딸린 쿼리인가: 개체 상세, 그 개체 할 일 목록, 그 개체 기록 목록, 그 개체 오늘 할 일 */
export function isPetScopedKey(queryKey: readonly unknown[], petId: string) {
  const [root, second, third] = queryKey;
  if (root === "pets") return second === "detail" && third === petId;
  if (root === "routines") return second === petId;
  if (root === "today") return third === petId;
  if (root === "records") {
    return second === "list" && (third as { petId?: string } | undefined)?.petId === petId;
  }
  return false;
}

/**
 * 개체를 지운 뒤. 지운 개체에 딸린 쿼리는 다시 부르면 404 라 오래된 것으로만 표시해 두고(떠나는 화면이 아직 붙어
 * 있어도 다시 부르지 않는다), 나머지 돌봄 데이터는 평소처럼 다시 부른다
 */
export function invalidateAfterPetDeleted(queryClient: QueryClient, petId: string) {
  const ofPet = ({ queryKey }: { queryKey: readonly unknown[] }) => isPetScopedKey(queryKey, petId);
  return Promise.all([
    queryClient.invalidateQueries({ predicate: ofPet, refetchType: "none" }),
    ...[queryKeys.today, queryKeys.records, queryKeys.pets, ["routines"]].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, predicate: (query) => !ofPet(query) }),
    ),
  ]);
}
