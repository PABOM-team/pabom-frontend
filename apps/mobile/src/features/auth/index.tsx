import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { Redirect, router, usePathname } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { authApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { clearSession } from "@pabom/core/api/session";
import type { AuthProvider } from "@pabom/core/domain/user";
import { meQueries } from "@pabom/core/entities/session";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/display";
import { toast } from "@/shared/ui/toast";
import { completeLogin, loginRedirectUrl, parseLoginCallback, rememberLoginNext } from "./login";

export { completeLogin, parseLoginCallback, safeNext, takeLoginNext } from "./login";

// 다른 앱에서 돌아왔을 때 열려 있던 인증 창을 닫는다
WebBrowser.maybeCompleteAuthSession();

/**
 * 카카오·구글 로그인 버튼 (각 서비스 가이드 모양).
 * 백엔드에서 로그인 주소를 받아(state 쿠키도 함께) 앱 안 인증 브라우저로 띄운다.
 * 카카오·구글 → 백엔드 Redirect URI → 앱 스킴(pabom://auth/callback/{provider}?code&state)으로 돌아오면
 * 그 주소의 code·state 로 로그인을 마친다
 */
export function LoginButtons({
  next,
  labels = { kakao: "카카오로 시작하기", google: "Google 계정으로 시작하기" },
}: {
  next?: string | null;
  labels?: Record<AuthProvider, string>;
}) {
  const login = useMutation({
    mutationFn: async (provider: AuthProvider) => {
      const { authorizationUrl } = await authApi.loginUrl(provider);
      const result = await WebBrowser.openAuthSessionAsync(
        authorizationUrl,
        loginRedirectUrl(provider),
      );
      return { provider, result };
    },
    onSuccess: ({ provider, result }) => {
      // 브라우저를 닫거나 뒤로 가면 아무 일도 없던 것처럼 첫 화면에 머문다
      if (result.type !== "success") return;
      void completeLogin(provider, parseLoginCallback(result.url));
    },
    onError: (error) => toast(getErrorMessage(error, "로그인을 시작하지 못했어요.")),
  });

  const start = (provider: AuthProvider) => {
    rememberLoginNext(next);
    login.mutate(provider);
  };

  return (
    <View style={{ gap: 8 }}>
      <Button
        variant="kakao"
        size="xl"
        disabled={login.isPending}
        icon={<KakaoSymbol />}
        onPress={() => start("kakao")}
      >
        {labels.kakao}
      </Button>
      <Button
        variant="outline"
        size="xl"
        disabled={login.isPending}
        icon={<GoogleSymbol />}
        onPress={() => start("google")}
      >
        {labels.google}
      </Button>
    </View>
  );
}

function KakaoSymbol() {
  return (
    <Svg viewBox="0 0 18 18" width={18} height={18}>
      <Path
        fill="#191919"
        d="M9 1.5C4.58 1.5 1 4.32 1 7.8c0 2.24 1.5 4.2 3.74 5.32l-.95 3.48c-.08.3.26.54.52.37l4.15-2.74c.18.01.36.02.54.02 4.42 0 8-2.82 8-6.3S13.42 1.5 9 1.5Z"
      />
    </Svg>
  );
}

function GoogleSymbol() {
  return (
    <Svg viewBox="0 0 18 18" width={18} height={18}>
      <Path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <Path
        fill="#FBBC05"
        d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"
      />
      <Path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </Svg>
  );
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearSession();
      queryClient.clear();
      router.replace("/welcome");
    },
  });
}

export function FullScreenLoading() {
  return (
    <View style={styles.loading}>
      <Spinner />
    </View>
  );
}

/**
 * 로그인이 필요한 화면을 감싼다.
 * - 로그인 안 됨 → 첫 화면(보던 주소를 기억)
 * - 약관 동의 전 → 약관 동의 (동의 전에는 다른 화면으로 못 감)
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: me, isError } = useQuery(meQueries.detail());
  const [initialPath] = useState(pathname);

  if (isError) return <Redirect href={{ pathname: "/welcome", params: { next: initialPath } }} />;
  if (me?.status === "PENDING_TERMS") return <Redirect href="/agreements" />;
  if (!me) return <FullScreenLoading />;
  return children;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
