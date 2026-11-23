import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { meApi } from "@pabom/core/api/endpoints";
import { getApiError, getErrorMessage } from "@pabom/core/api/errors";
import { queryKeys } from "@pabom/core/api/query-keys";
import { clearSignupSession, getSignupSession, setAccessToken } from "@pabom/core/api/session";
import { AGREEMENTS, type AgreementType } from "@pabom/core/domain/user";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/form";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";

/** 가입 토큰이 없거나 10분이 지나 처음부터 다시 로그인해야 할 때 */
class SignupExpired extends Error {}

/**
 * SCR-A03 첫 로그인 약관 동의. Figma 그대로 머리줄 없이 제목·흰 카드 동의 목록·시작하기만.
 * 로그인 결과로 받은 가입 토큰으로 동의를 보내고, 가입이 끝나면 access 토큰을 받는다
 */
export default function AgreementsScreen() {
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState<Set<AgreementType>>(new Set());

  const allChecked = AGREEMENTS.every((a) => checked.has(a.type));
  const requiredDone = AGREEMENTS.filter((a) => a.required).every((a) => checked.has(a.type));

  const toggle = (type: AgreementType, on: boolean) =>
    setChecked((prev) => {
      const nextSet = new Set(prev);
      if (on) nextSet.add(type);
      else nextSet.delete(type);
      return nextSet;
    });

  const agree = useMutation({
    mutationFn: () => {
      const signup = getSignupSession();
      if (!signup) throw new SignupExpired();
      return meApi.agree([...checked], signup.token);
    },
    onSuccess: ({ accessToken }) => {
      setAccessToken(accessToken);
      clearSignupSession();
      queryClient.removeQueries({ queryKey: queryKeys.me });
      // 가입 직후 개체 등록으로 (A04 A안)
      router.replace({ pathname: "/pets/new", params: { onboarding: "1" } });
    },
    onError: (error) => {
      if (error instanceof SignupExpired || getApiError(error)?.code === "INVALID_TOKEN") {
        clearSignupSession();
        toast("가입 시간이 지났어요. 다시 로그인해 주세요.");
        router.replace("/welcome");
        return;
      }
      toast(getErrorMessage(error));
    },
  });

  // 로그인을 거치지 않고 들어왔으면 첫 화면으로
  if (!getSignupSession()) return <Redirect href="/welcome" />;

  return (
    <Screen>
      {/* 저장 중에는 입력을 흐리게 잠근다 (C2-2) */}
      <ScreenBody
        gap={12}
        contentStyle={styles.body}
        pointerEvents={agree.isPending ? "none" : "auto"}
        style={agree.isPending && { opacity: 0.5 }}
      >
        <Text variant="title-xs">파봄을 쓰려면{"\n"}동의가 필요해요</Text>
        <View style={styles.card}>
          <AgreementRow
            label="전체 동의"
            checked={allChecked}
            onToggle={(on) => setChecked(on ? new Set(AGREEMENTS.map((a) => a.type)) : new Set())}
            divider
          />
          {AGREEMENTS.map((agreement, i) => (
            <AgreementRow
              key={agreement.type}
              label={`[${agreement.required ? "필수" : "선택"}] ${agreement.label}`}
              checked={checked.has(agreement.type)}
              onToggle={(on) => toggle(agreement.type, on)}
              divider={i < AGREEMENTS.length - 1}
              onView={
                agreement.href
                  ? () =>
                      router.push(
                        agreement.href.includes("privacy")
                          ? { pathname: "/terms", params: { tab: "privacy" } }
                          : "/terms",
                      )
                  : undefined
              }
            />
          ))}
        </View>
      </ScreenBody>
      <ScreenFooter minBottom={26}>
        <Button
          size="xl"
          disabled={!requiredDone}
          loading={agree.isPending}
          onPress={() => agree.mutate()}
        >
          시작하기
        </Button>
        {/* 필수 항목을 모두 체크하기 전에는 비활성 (Figma A03 · C2-1) */}
        {!requiredDone ? (
          <Text variant="body-md" color={semantic.subtleForeground} align="center">
            필수 항목에 모두 동의하면 시작할 수 있어요
          </Text>
        ) : null}
      </ScreenFooter>
    </Screen>
  );
}

/** 동의 목록 한 줄 (Figma 줄: 체크박스 22 · 글 · 보기 ›, 구분선은 글 아래부터) */
function AgreementRow({
  label,
  checked,
  onToggle,
  onView,
  divider = false,
}: {
  label: string;
  checked: boolean;
  onToggle: (on: boolean) => void;
  onView?: () => void;
  divider?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onToggle(!checked)}
        style={styles.rowLabel}
      >
        <Checkbox checked={checked} onChange={onToggle} />
        <Text variant="body-lg" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
      </Pressable>
      {onView ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${label} 보기`}
          hitSlop={8}
          onPress={onView}
          style={styles.view}
        >
          <Text variant="body-lg" color={semantic.mutedForeground}>
            보기
          </Text>
          <ChevronRightIcon size={20} color={semantic.subtleForeground} />
        </Pressable>
      ) : null}
      {divider ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: 24, paddingHorizontal: 16 },
  card: {
    overflow: "hidden",
    paddingVertical: 4,
    borderRadius: radius["2xl"],
    backgroundColor: semantic.card,
  },
  row: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  view: { flexDirection: "row", alignItems: "center", gap: 2 },
  divider: {
    position: "absolute",
    left: 50,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: semantic.border,
  },
});
