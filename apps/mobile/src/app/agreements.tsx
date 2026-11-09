import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { meApi } from "@pabom/core/api/endpoints";
import { getApiError, getErrorMessage } from "@pabom/core/api/errors";
import { queryKeys } from "@pabom/core/api/query-keys";
import { clearSignupSession, getSignupSession, setAccessToken } from "@pabom/core/api/session";
import { AGREEMENTS, type AgreementType } from "@pabom/core/domain/user";
import { safeNext } from "@/features/auth";
import { Button } from "@/shared/ui/button";
import { Checkbox, CheckboxRow } from "@/shared/ui/form";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";

/** 가입 토큰이 없거나 10분이 지나 처음부터 다시 로그인해야 할 때 */
class SignupExpired extends Error {}

/**
 * SCR-A03 첫 로그인 약관 동의. Figma 그대로 머리줄 없이 제목·동의 목록·시작하기만.
 * 로그인 결과로 받은 가입 토큰으로 동의를 보내고, 가입이 끝나면 access 토큰을 받는다
 */
export default function AgreementsScreen() {
  const queryClient = useQueryClient();
  // 인계 카드 링크로 들어온 사람만 그 카드로 돌려보내고, 나머지는 가입 직후 개체 등록(A04 A안)으로
  const requested = safeNext(useLocalSearchParams<{ next?: string }>().next);
  const next = requested?.startsWith("/share/") ? requested : null;
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
      // 인계 카드로 들어온 사람은 시작 안내 없이 바로 등록 화면으로 (FL-10)
      if (next) router.replace(next as "/home");
      else router.replace({ pathname: "/pets/new", params: { onboarding: "1" } });
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
        contentStyle={{ paddingTop: 24 }}
        pointerEvents={agree.isPending ? "none" : "auto"}
        style={agree.isPending && { opacity: 0.5 }}
      >
        <Text variant="title-sm" style={{ lineHeight: 32 }}>
          파봄을 쓰려면{"\n"}동의가 필요해요
        </Text>
        <CheckboxRow
          checked={allChecked}
          onChange={(on) => setChecked(on ? new Set(AGREEMENTS.map((a) => a.type)) : new Set())}
          style={styles.allRow}
        >
          <Text variant="body-xl" weight="bold">
            전체 동의
          </Text>
        </CheckboxRow>
        {AGREEMENTS.map((agreement) => (
          <View key={agreement.type} style={styles.row}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: checked.has(agreement.type) }}
              onPress={() => toggle(agreement.type, !checked.has(agreement.type))}
              style={styles.rowLabel}
            >
              <Checkbox
                checked={checked.has(agreement.type)}
                onChange={(on) => toggle(agreement.type, on)}
              />
              <Text variant="body-lg" numberOfLines={1} style={{ flex: 1 }}>
                [{agreement.required ? "필수" : "선택"}] {agreement.label}
              </Text>
            </Pressable>
            {agreement.href ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${agreement.label} 보기`}
                hitSlop={8}
                onPress={() =>
                  router.push(
                    agreement.href.includes("privacy")
                      ? { pathname: "/terms", params: { tab: "privacy" } }
                      : "/terms",
                  )
                }
                style={styles.view}
              >
                <Text variant="body-lg" color={semantic.mutedForeground}>
                  보기
                </Text>
                <ChevronRightIcon size={14} color={semantic.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </ScreenBody>
      <ScreenFooter>
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

const styles = StyleSheet.create({
  allRow: {
    marginTop: 28,
    paddingBottom: 14,
    minHeight: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: semantic.foreground,
  },
  row: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  rowLabel: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  view: { flexDirection: "row", alignItems: "center", gap: 4 },
});
