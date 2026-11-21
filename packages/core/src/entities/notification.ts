import { queryOptions } from "@tanstack/react-query";
import { notificationSettingsApi } from "../api/endpoints";
import { queryKeys } from "../api/query-keys";

export const notificationSettingsQueries = {
  detail: () =>
    queryOptions({
      queryKey: queryKeys.notificationSettings,
      queryFn: notificationSettingsApi.get,
      staleTime: 5 * 60 * 1000,
    }),
};
