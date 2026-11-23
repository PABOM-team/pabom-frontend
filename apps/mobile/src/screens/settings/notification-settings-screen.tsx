import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { formatReminderTime, reminderTimeOptions } from "@pabom/core/domain/notification";
import { openPushSettings } from "@/features/push";
import { Button } from "@/shared/ui/button";
import { LoadError, Skeleton } from "@/shared/ui/display";
import { Switch } from "@/shared/ui/form";
import { CheckIcon, ChevronRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";
import { Group, GroupRow, PAGE_PADDING, RowText, SectionLabel } from "./settings-ui";
import { useCareReminder } from "./use-care-reminder";

const TIME_OPTIONS = reminderTimeOptions();

/**
 * 설정 > 알림. 할 일 알림 켜기·끄기와 받을 시각 (Figma 프레임 없음, S01 묶음 모양을 따른다).
 * 서버 설정(보낼지)과 기기 권한(받을 수 있는지)이 따로라서, 켤 때 기기 권한도 함께 묻는다
 */
export function NotificationSettingsScreen() {
  const reminder = useCareReminder();
  const { isPending, isError, refetch } = reminder.query;
  const [timeOpen, setTimeOpen] = useState(false);

  return (
    <Screen style={{ backgroundColor: semantic.screen }}>
      <TopBar title="알림" fallbackHref="/settings" style={{ backgroundColor: semantic.screen }} />
      <ScreenBody flush contentStyle={styles.content}>
        {reminder.denied ? (
          <View style={styles.notice}>
            <Text variant="body-lg" weight="semibold" color={semantic.primary}>
              기기 설정에서 파봄 알림이 꺼져 있어요
            </Text>
            <Text variant="body-lg" color={semantic.secondaryText} style={styles.relaxed}>
              알림을 받으려면 설정에서 허용해 주세요.
            </Text>
            <Button
              variant="outline"
              size="sm"
              style={{ alignSelf: "flex-start", marginTop: 8 }}
              onPress={() => void openPushSettings()}
            >
              설정 열기
            </Button>
          </View>
        ) : null}

        <SectionLabel>할 일 알림</SectionLabel>
        {isPending ? (
          <Skeleton height={124} style={{ borderRadius: radius["2xl"] }} />
        ) : isError ? (
          <Group style={styles.error}>
            <LoadError onRetry={() => void refetch()} />
          </Group>
        ) : (
          <Group>
            <GroupRow>
              <RowText title="할 일 알림" description="오늘 남은 할 일이 있으면 알려 드려요" />
              <Switch
                accessibilityLabel="할 일 알림"
                checked={reminder.careOn}
                disabled={reminder.switchDisabled}
                onChange={(on) => void reminder.toggleCare(on)}
              />
            </GroupRow>
            <GroupRow
              divider
              disabled={!reminder.careOn}
              onPress={() => setTimeOpen(true)}
              style={!reminder.careOn && { opacity: 0.5 }}
            >
              <Text variant="body-lg" style={styles.grow}>
                알림 시각
              </Text>
              <Text variant="body-lg" color={semantic.mutedForeground}>
                {formatReminderTime(reminder.time)}
              </Text>
              <ChevronRightIcon size={20} color={semantic.subtleForeground} />
            </GroupRow>
          </Group>
        )}
      </ScreenBody>

      <Sheet open={timeOpen} onOpenChange={setTimeOpen} title="알림 시각">
        {TIME_OPTIONS.map((option) => {
          const selected = option === reminder.time;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                setTimeOpen(false);
                if (!selected) reminder.setTime(option);
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
  content: { paddingHorizontal: PAGE_PADDING, paddingTop: 0 },
  notice: {
    marginTop: 8,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: semantic.primarySoft,
  },
  relaxed: { marginTop: 2, lineHeight: 20 },
  error: { paddingVertical: 24 },
  grow: { flex: 1, minWidth: 0 },
  timeOption: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
