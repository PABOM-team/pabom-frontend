import { queryOptions } from "@tanstack/react-query";
import { handoverApi } from "../api/endpoints";
import { queryKeys } from "../api/query-keys";

export const handoverQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.handoverCards,
      queryFn: handoverApi.list,
    }),
  preview: (code: string) =>
    queryOptions({
      queryKey: queryKeys.handoverPreview(code),
      queryFn: () => handoverApi.preview(code),
      retry: false,
    }),
};
