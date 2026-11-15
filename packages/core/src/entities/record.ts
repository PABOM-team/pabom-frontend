import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { recordsApi } from "../api/endpoints";
import { queryKeys } from "../api/query-keys";
import { intakeLabelFor } from "../domain/care";
import type { CareRecord, RecordQuery } from "../domain/record";
import type { FeedResultSet } from "../domain/species";

export const recordQueries = {
  list: (query: RecordQuery) =>
    queryOptions({
      queryKey: queryKeys.recordList(query),
      queryFn: () => recordsApi.list(query),
    }),
  infinite: (query: Omit<RecordQuery, "cursor">) =>
    infiniteQueryOptions({
      queryKey: [...queryKeys.recordList(query), "infinite"],
      queryFn: ({ pageParam }) => recordsApi.list({ ...query, cursor: pageParam ?? undefined }),
      initialPageParam: null as string | null,
      getNextPageParam: (last) => last.nextCursor,
    }),
  detail: (recordId: string) =>
    queryOptions({
      queryKey: queryKeys.record(recordId),
      queryFn: () => recordsApi.get(recordId),
    }),
};

/** 급여 · 일부 먹음 / 체중 · 45.0 g / 메모. 먹은 정도 이름은 먹이 묶음(인공 사료·곤충·통먹이)에 맞춘다 */
export function describeRecord(
  record: Pick<CareRecord, "careItemName" | "intake" | "weightG" | "photos" | "type">,
  feedResultSet: FeedResultSet | null = null,
) {
  const parts: string[] = [record.careItemName];
  if (record.type === "skipped") parts.push("건너뜀");
  if (record.intake) parts.push(intakeLabelFor(feedResultSet, record.intake));
  if (record.weightG) parts.push(`${record.weightG.toFixed(1)} g`);
  if (record.photos.length) parts.push(`사진 ${record.photos.length}`);
  return parts.join(" · ");
}

export function recordMethodLabel(record: Pick<CareRecord, "method">) {
  if (record.method === null) return null;
  return record.method === "routine" ? "할 일 체크" : "직접 기록";
}
