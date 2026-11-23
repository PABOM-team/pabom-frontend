import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { petQueries } from "@/entities/pet";
import { meQueries } from "@/entities/session";
import { socialLogout, useResetSession } from "@/features/auth";
import { forgetPushToken } from "@/features/push";
import { meApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { getStoredAccount } from "@pabom/core/api/session";
import { AUTH_PROVIDER_LABEL } from "@pabom/core/domain/user";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Checkbox } from "@/shared/ui/form";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";
import { Group, PAGE_PADDING } from "./settings-ui";
import { ZoomLink } from "@/shared/ui/zoom-link";

/** 개체 이름은 두 마리까지 보이고 나머지는 수로 (콩이 · 달이 2마리) */
const petSummary = (names: readonly string[]) =>
  names.length === 0
    ? "없음"
    : `${names.slice(0, 2).join(" · ")}${names.length > 2 ? " 외" : ""} ${names.length}마리`;

/**
 * SCR-S02 회원 탈퇴. 사라지는 것 · 탈퇴 대신 · 확인 체크.
 * 확인 체크 전에는 버튼이 꺼져 있고, 누르면 최종 위험 확인 창(C4) → 첫 화면 + 토스트
 */
export function WithdrawScreen() {
  const resetSession = useResetSession();
  const { data: me } = useQuery(meQueries.detail());
  const { data: pets } = useQuery(petQueries.list());
  const [checked, setChecked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const provider = getStoredAccount()?.provider;

  const withdraw = useMutation({
    mutationFn: meApi.withdraw,
    onSuccess: () => {
      // 기기에 남은 카카오·구글 로그인도 지워 다음에 다른 계정으로 가입할 수 있게 한다
      void socialLogout();
      // 푸시 토큰은 서버가 탈퇴와 함께 지운다. 기기에 남은 값만 정리한다
      void forgetPushToken();
      // 탈퇴한 계정의 토큰·회원 정보·돌아갈 곳을 모두 지워, 같은 계정으로 다시 가입하면 약관 동의부터
      resetSession();
      toast("탈퇴했어요. 그동안 고마웠어요.");
    },
    onError: (error) => toast(getErrorMessage(error, "탈퇴하지 못했어요.")),
  });

  // 사진 수·보낸 인계 카드는 받을 데이터가 없어 줄을 뺀다
  const lost: readonly { label: string; value: string }[] = [
    { label: "개체", value: petSummary((pets ?? []).map((p) => p.name)) },
    {
      label: "기록",
      value: `${(pets ?? []).reduce((sum, p) => sum + p.recordCount, 0)}개`,
    },
    ...(provider ? [{ label: "로그인 연결", value: AUTH_PROVIDER_LABEL[provider] }] : []),
  ];

  return (
    <Screen style={{ backgroundColor: semantic.screen }}>
      <TopBar
        title="회원 탈퇴"
        fallbackHref="/settings"
        style={{ backgroundColor: semantic.screen }}
      />
      <ScreenBody flush contentStyle={styles.content} gap={12}>
        <Text variant="title-sm" style={styles.heading}>
          {me?.nickname ? `${me.nickname}님, 탈퇴하면\n` : "탈퇴하면\n"}이 정보가 모두 사라져요
        </Text>
        <Text variant="body-xl" color={semantic.mutedForeground}>
          사라진 정보는 되돌릴 수 없어요
        </Text>

        <View style={[styles.lost, { marginTop: 4 }]}>
          {lost.map((row) => (
            <View key={row.label} style={styles.lostRow}>
              <Text variant="body-xl" color={semantic.mutedForeground}>
                {row.label}
              </Text>
              <Text variant="body-xl" weight="semibold" align="right" style={styles.grow}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.instead, { marginTop: 4 }]}>
          <Text variant="body-lg" weight="semibold" color={semantic.primary}>
            탈퇴 대신 이렇게 할 수도 있어요
          </Text>
          {/* '인계 카드 만들기'는 앱에 기능이 없어 뺀다 */}
          <ZoomLink href="/settings/notifications">
            <Pressable accessibilityRole="link" style={styles.insteadRow}>
              <Text
                variant="body-xl"
                weight="medium"
                color={semantic.secondaryText}
                style={styles.grow}
              >
                알림이 많다면 알림만 끄기
              </Text>
              <ChevronRightIcon size={18} color={semantic.secondaryText} />
            </Pressable>
          </ZoomLink>
        </View>

        <Group style={{ marginTop: 4 }}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            onPress={() => setChecked(!checked)}
            style={styles.checkRow}
          >
            <Checkbox checked={checked} onChange={setChecked} />
            <Text variant="body-lg" style={styles.grow}>
              위 내용을 확인했어요
            </Text>
          </Pressable>
        </Group>
      </ScreenBody>
      <ScreenFooter style={styles.footer}>
        <Button
          variant="inverse"
          size="xl"
          disabled={!checked || withdraw.isPending}
          onPress={() => setConfirmOpen(true)}
        >
          탈퇴하기
        </Button>
      </ScreenFooter>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="정말 탈퇴할까요?"
        description="개체·기록·사진이 모두 삭제되고 되돌릴 수 없어요."
        confirmLabel="탈퇴하기"
        tone="danger"
        pending={withdraw.isPending}
        onConfirm={() => withdraw.mutate()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: PAGE_PADDING, paddingTop: 12 },
  heading: { lineHeight: 34 },
  grow: { flex: 1, minWidth: 0 },
  lost: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.xl,
    backgroundColor: semantic.card,
  },
  lostRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  instead: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 4,
    borderRadius: radius.xl,
    backgroundColor: semantic.primarySoft,
  },
  insteadRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  checkRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footer: { backgroundColor: semantic.screen, paddingHorizontal: PAGE_PADDING },
});
