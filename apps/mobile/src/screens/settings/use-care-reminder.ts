import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationSettingsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { queryKeys } from "@pabom/core/api/query-keys";
import {
  DEFAULT_REMINDER_TIME,
  type NotificationSettings,
  type NotificationSettingsInput,
} from "@pabom/core/domain/notification";
import { notificationSettingsQueries } from "@pabom/core/entities/notification";
import { requestPushPermission, usePushPermission } from "@/features/push";
import { toast } from "@/shared/ui/toast";

/** 이 기기의 시간대. 서버는 이 시간대 기준으로 알림 시각을 맞춘다 */
const deviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

/**
 * 케어(할 일) 알림 켜기·끄기와 받을 시각. 설정 탭과 설정 > 알림이 함께 쓴다.
 * 서버 설정(보낼지)과 기기 권한(받을 수 있는지)이 따로라서, 켤 때 기기 권한도 함께 묻는다
 */
export function useCareReminder() {
  const queryClient = useQueryClient();
  const query = useQuery(notificationSettingsQueries.detail());
  const settings = query.data;
  const { permission, setPermission } = usePushPermission();

  const update = useMutation({
    mutationFn: (input: NotificationSettingsInput) => {
      // 시간대가 바뀌었으면(해외 이동 등) 같이 맞춘다
      const timeZone = deviceTimeZone();
      return notificationSettingsApi.update(
        timeZone && timeZone !== settings?.timeZone ? { ...input, timeZone } : input,
      );
    },
    // 스위치가 바로 움직이게 먼저 바꿔 두고, 실패하면 되돌린다
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notificationSettings });
      const previous = queryClient.getQueryData<NotificationSettings>(
        queryKeys.notificationSettings,
      );
      if (previous) {
        queryClient.setQueryData(queryKeys.notificationSettings, { ...previous, ...input });
      }
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notificationSettings, context.previous);
      }
      toast(getErrorMessage(error, "알림 설정을 바꾸지 못했어요."));
    },
    onSuccess: (next) => queryClient.setQueryData(queryKeys.notificationSettings, next),
  });

  const toggleCare = async (on: boolean) => {
    if (on && permission !== "granted") {
      const next = await requestPushPermission();
      setPermission(next);
      if (next !== "granted") {
        toast("기기 설정에서 파봄 알림을 허용해 주세요.");
        return;
      }
    }
    update.mutate({ careReminderEnabled: on });
  };

  const setTime = (time: string) => update.mutate({ careReminderTime: time });

  const denied = permission === "denied";
  // 기기에서 막혀 있으면 서버 설정이 켜져 있어도 알림이 오지 않으니 꺼진 것으로 보여 준다
  const careOn = Boolean(settings?.careReminderEnabled) && permission === "granted";
  const time = settings?.careReminderTime ?? DEFAULT_REMINDER_TIME;

  return {
    query,
    permission,
    denied,
    careOn,
    time,
    /** 권한을 아직 모르거나 기기에서 막혀 있으면 스위치를 못 누른다 */
    switchDisabled: permission === null || denied,
    toggleCare,
    setTime,
  };
}
