import { useQuery } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { meQueries } from "@/entities/session";
import { useLogout } from "@/features/auth";
import { useTabBarInset } from "@/features/tab-bar";
import { getStoredAccount } from "@pabom/core/api/session";
import { formatReminderTime } from "@pabom/core/domain/notification";
import { AUTH_PROVIDER_LABEL } from "@pabom/core/domain/user";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Switch } from "@/shared/ui/form";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { Group, GroupRow, PAGE_PADDING, RoundThumb, RowText, SectionLabel } from "./settings-ui";
import { useCareReminder } from "./use-care-reminder";
import { ZoomLink } from "@/shared/ui/zoom-link";

const MENU: readonly { href: Href; label: string }[] = [
  { href: "/settings/guidelines", label: "관리 가이드라인" },
  { href: "/terms", label: "이용약관" },
  { href: { pathname: "/terms", params: { tab: "privacy" } }, label: "개인정보 처리방침" },
];

/**
 * SCR-S01 설정(계정 메뉴). 계정 카드 · 알림(할 일 알림 스위치) · 정보 메뉴 · 로그아웃(확인 창 C4) · 회원 탈퇴.
 * 할 일 알림 글을 누르면 받을 시각을 고르는 설정 > 알림으로 간다
 */
export function SettingsScreen() {
  const { data: me } = useQuery(meQueries.detail());
  const logout = useLogout();
  const reminder = useCareReminder();
  const tabBarInset = useTabBarInset();
  const [confirmLogout, setConfirmLogout] = useState(false);
  // 내 정보 응답에는 소셜 종류가 없어서 로그인할 때 저장해 둔 값을 쓴다 (me가 온 뒤에만 그린다)
  const provider = me ? getStoredAccount()?.provider : undefined;
  const providerLabel = provider ? AUTH_PROVIDER_LABEL[provider] : null;

  return (
    <Screen style={{ backgroundColor: semantic.screen }}>
      <ScreenBody flush contentStyle={[styles.content, { paddingBottom: tabBarInset }]}>
        <Text variant="title-sm" accessibilityRole="header" style={styles.title}>
          설정
        </Text>

        <View style={styles.account}>
          {/* 내 정보 응답에 프로필 사진이 없어 기본 프로필(발자국)을 그린다 */}
          <RoundThumb />
          <RowText
            title={me?.nickname ?? "파봄 회원"}
            description={providerLabel ? `${providerLabel} 계정으로 로그인했어요` : null}
          />
        </View>

        <SectionLabel>알림</SectionLabel>
        <Group>
          <View style={styles.switchRow}>
            <ZoomLink href="/settings/notifications">
              <Pressable
                accessibilityRole="link"
                accessibilityHint="알림 시각을 바꿔요"
                style={styles.grow}
              >
                <RowText
                  title="할 일 알림"
                  description={
                    reminder.denied
                      ? "기기 설정에서 알림이 꺼져 있어요"
                      : `매일 ${formatReminderTime(reminder.time)} · 남은 할 일이 있을 때만`
                  }
                />
              </Pressable>
            </ZoomLink>
            <Switch
              accessibilityLabel="할 일 알림"
              checked={reminder.careOn}
              disabled={reminder.switchDisabled || reminder.query.isPending}
              onChange={(on) => void reminder.toggleCare(on)}
            />
          </View>
        </Group>

        <SectionLabel>정보</SectionLabel>
        <Group>
          {MENU.map((item, index) => (
            <GroupRow
              key={item.label}
              accessibilityRole="link"
              divider={index > 0}
              href={item.href}
            >
              <Text variant="body-lg" style={styles.grow}>
                {item.label}
              </Text>
              <ChevronRightIcon size={20} color={semantic.subtleForeground} />
            </GroupRow>
          ))}
        </Group>

        <Group style={styles.logout}>
          <GroupRow onPress={() => setConfirmLogout(true)} disabled={logout.isPending}>
            <Text variant="body-lg" style={styles.grow}>
              로그아웃
            </Text>
            {providerLabel ? (
              <Text variant="body-lg" color={semantic.mutedForeground}>
                {providerLabel} 계정
              </Text>
            ) : null}
          </GroupRow>
        </Group>

        <ZoomLink href="/settings/withdraw">
          <Pressable accessibilityRole="link" style={styles.withdraw}>
            <Text variant="body-md" weight="medium" color={semantic.subtleForeground}>
              회원 탈퇴
            </Text>
          </Pressable>
        </ZoomLink>
      </ScreenBody>
      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="로그아웃할까요?"
        description="다시 로그인하면 기록은 그대로 있어요."
        confirmLabel="로그아웃"
        tone="inverse"
        pending={logout.isPending}
        onConfirm={() => logout.mutate(undefined, { onSettled: () => setConfirmLogout(false) })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: PAGE_PADDING, paddingTop: 36 },
  title: { marginBottom: 12 },
  account: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: semantic.card,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  grow: { flex: 1, minWidth: 0 },
  logout: { marginTop: 12 },
  withdraw: { alignSelf: "center", minHeight: 44, justifyContent: "center", marginTop: 4 },
});
