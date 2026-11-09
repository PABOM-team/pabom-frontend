import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { authProviderSchema } from "@pabom/core/domain/user";
import { completeLogin, FullScreenLoading } from "@/features/auth";
import { router } from "expo-router";

/**
 * SCR-A02 로그인 처리 중. 카카오·구글이 앱 스킴(pabom://auth/callback/{provider}?code&state)으로
 * 바로 돌려보냈을 때 들어오는 화면. 인증 브라우저가 결과를 돌려준 경우에는 LoginButtons 가 직접 처리한다
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    provider: string;
    code?: string;
    state?: string;
    error?: string;
    message?: string;
  }>();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const provider = authProviderSchema.safeParse(params.provider);
    if (!provider.success) {
      router.replace("/welcome");
      return;
    }
    void completeLogin(provider.data, {
      code: params.code,
      state: params.state,
      error: params.error,
      message: params.message,
    });
  }, [params]);

  return <FullScreenLoading />;
}
