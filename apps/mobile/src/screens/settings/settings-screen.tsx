import { useQuery } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { meQueries } from "@/entities/session";
import { useLogout } from "@/features/auth";
import { getStoredAccount } from "@pabom/core/api/session";
import { AUTH_PROVIDER_LABEL } from "@pabom/core/domain/user";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";

const MENU: { href: Href; label: string }[] = [
  { href: "/settings/guidelines", label: "관리 가이드라인" },
  { href: "/terms", label: "이용약관" },
  { href: { pathname: "/terms", params: { tab: "privacy" } }, label: "개인정보 처리방침" },
];

/** SCR-S01 설정(계정 메뉴). Figma 그대로: 메뉴 3개, 로그아웃(확인 창 C4 → 첫 화면), 회원 탈퇴 */
export function SettingsScreen() {
  const { data: me } = useQuery(meQueries.detail());
  const logout = useLogout();
  const [confirmLogout, setConfirmLogout] = useState(false);
  // 내 정보 응답에는 소셜 종류가 없어서 로그인할 때 저장해 둔 값을 쓴다 (me가 온 뒤에만 그린다)
  const provider = me ? getStoredAccount()?.provider : undefined;

  return (
    <Screen>
      <TopBar leading="none" title="설정" />
      <ScreenBody>
        <View>
          {MENU.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="link"
              onPress={() => router.push(item.href)}
              style={styles.row}
            >
              <Text variant="body-xl">{item.label}</Text>
              <ChevronRightIcon size={16} color={semantic.subtleForeground} />
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setConfirmLogout(true)}
          disabled={logout.isPending}
          style={[styles.row, { marginTop: 16 }]}
        >
          <Text variant="body-xl">로그아웃</Text>
          {provider ? (
            <Text variant="body-lg" color={semantic.mutedForeground}>
              {AUTH_PROVIDER_LABEL[provider]} 계정
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/settings/withdraw")}
          style={styles.withdraw}
        >
          <Text variant="body-md" color={semantic.mutedForeground}>
            회원 탈퇴
          </Text>
        </Pressable>
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
  row: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  withdraw: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: 4 },
});
