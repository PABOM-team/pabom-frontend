import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { notificationSettingsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { queryKeys } from "@pabom/core/api/query-keys";
import {
  DEFAULT_REMINDER_TIME,
  formatReminderTime,
  reminderTimeOptions,
  type NotificationSettings,
  type NotificationSettingsInput,
} from "@pabom/core/domain/notification";
import { notificationSettingsQueries } from "@pabom/core/entities/notification";
import { openPushSettings, requestPushPermission, usePushPermission } from "@/features/push";
import { Button } from "@/shared/ui/button";
import { InfoBox, Skeleton } from "@/shared/ui/display";
import { Switch } from "@/shared/ui/form";
import { CheckIcon, ChevronRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";

const TIME_OPTIONS = reminderTimeOptions();

/** 이 기기의 시간대. 서버는 이 시간대 기준으로 알림 시각을 맞춘다 */
const deviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

/**
 * 설정 > 알림. 케어 알림 켜기·끄기와 받을 시각.
 * 서버 설정(보낼지)과 기기 권한(받을 수 있는지)이 따로라서, 켤 때 기기 권한도 함께 묻는다
 */
export function NotificationSettingsScreen() {
  const queryClient = useQueryClient();
  const {
    data: settings,
    isPending,
    isError,
    refetch,
  } = useQuery(notificationSettingsQueries.detail());
  const { permission, setPermission } = usePushPermission();
  const [timeOpen, setTimeOpen] = useState(false);

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

  const denied = permission === "denied";
  // 기기에서 막혀 있으면 서버 설정이 켜져 있어도 알림이 오지 않으니 꺼진 것으로 보여 준다
  const careOn = Boolean(settings?.careReminderEnabled) && permission === "granted";
  const time = settings?.careReminderTime ?? DEFAULT_REMINDER_TIME;

  return (
    <Screen>
      <TopBar title="알림" fallbackHref="/settings" />
      <ScreenBody>
        {denied ? (
          <InfoBox style={styles.notice}>
            <Text variant="body-md" color={semantic.secondaryText}>
              기기 설정에서 파봄 알림이 꺼져 있어요. 알림을 받으려면 설정에서 허용해 주세요.
            </Text>
            <Button
              variant="outline"
              size="sm"
              style={{ alignSelf: "flex-start", marginTop: 8 }}
              onPress={() => void openPushSettings()}
            >
              설정 열기
            </Button>
          </InfoBox>
        ) : null}

        {isPending ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={64} />
            <Skeleton height={50} />
          </View>
        ) : isError ? (
          <InfoBox style={styles.notice}>
            <Text variant="body-md" color={semantic.secondaryText}>
              알림 설정을 불러오지 못했어요.
            </Text>
            <Button
              variant="outline"
              size="sm"
              style={{ alignSelf: "flex-start", marginTop: 8 }}
              onPress={() => void refetch()}
            >
              다시 불러오기
            </Button>
          </InfoBox>
        ) : (
          <View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="body-xl">케어 알림</Text>
                <Text variant="body-md" color={semantic.mutedForeground}>
                  오늘 할 관리가 있으면 정한 시각에 알려 드려요.
                </Text>
              </View>
              <Switch
                accessibilityLabel="케어 알림"
                checked={careOn}
                disabled={permission === null || denied}
                onChange={(on) => void toggleCare(on)}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !careOn }}
              disabled={!careOn}
              onPress={() => setTimeOpen(true)}
              style={[styles.row, !careOn && { opacity: 0.5 }]}
            >
              <Text variant="body-xl">알림 시각</Text>
              <View style={styles.rowValue}>
                <Text variant="body-lg" color={semantic.mutedForeground}>
                  {formatReminderTime(time)}
                </Text>
                <ChevronRightIcon size={16} color={semantic.subtleForeground} />
              </View>
            </Pressable>
          </View>
        )}
      </ScreenBody>

      <Sheet open={timeOpen} onOpenChange={setTimeOpen} title="알림 시각">
        {TIME_OPTIONS.map((option) => {
          const selected = option === time;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                setTimeOpen(false);
                if (!selected) update.mutate({ careReminderTime: option });
              }}
              style={styles.timeOption}
            >
              <Text
                variant="body-xl"
                weight={selected ? "semibold" : "regular"}
                color={selected ? semantic.primary : semantic.foreground}
              >
                {formatReminderTime(option)}
              </Text>
              {selected ? <CheckIcon size={20} color={semantic.primary} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { marginBottom: 16 },
  switchRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  row: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  rowValue: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeOption: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
