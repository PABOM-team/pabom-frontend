import * as Linking from "expo-linking";
import { router } from "expo-router";
import { authApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { setAccessToken, setSignupSession, setStoredAccount } from "@pabom/core/api/session";
import type { AuthProvider } from "@pabom/core/domain/user";
import { toast } from "@/shared/ui/toast";

/** 로그인 뒤 돌아갈 곳. 앱 안 경로만 허용한다 */
export function safeNext(next: string | string[] | null | undefined) {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

/** 카카오·구글에 다녀오는 동안 로그인 뒤 돌아갈 곳. 앱은 메모리에만 둔다 (화면 새로고침이 없다) */
let loginNext: string | null = null;
export const rememberLoginNext = (next: string | null | undefined) => {
  loginNext = next ?? null;
};
export function takeLoginNext() {
  const next = loginNext;
  loginNext = null;
  return safeNext(next);
}

/** 카카오·구글이 돌려보낼 앱 주소 (pabom://auth/callback/{provider}) */
export const loginRedirectUrl = (provider: AuthProvider) =>
  Linking.createURL(`/auth/callback/${provider}`);

export type LoginCallbackParams = {
  code?: string | null;
  state?: string | null;
  error?: string | null;
  message?: string | null;
};

/** 돌아온 주소의 쿼리를 읽는다 */
export function parseLoginCallback(url: string): LoginCallbackParams {
  const { queryParams } = Linking.parse(url);
  const pick = (key: string) => {
    const v = queryParams?.[key];
    return typeof v === "string" ? v : null;
  };
  return {
    code: pick("code"),
    state: pick("state"),
    error: pick("error"),
    message: pick("message"),
  };
}

const FAILED = "로그인하지 못했어요. 다시 시도해 주세요.";

/**
 * SCR-A02 로그인 처리. 인가 코드로 백엔드 콜백 API(GET /auth/{provider}/callback?code&state)를 불러
 * 새 회원이면 가입 토큰, 기존 회원이면 access 토큰(refresh 는 쿠키)을 받는다.
 * state 쿠키는 로그인 주소를 받을 때 RN 네트워크 쿠키 저장소에 남아 있어 이 요청에 같이 실린다.
 * 취소하면 첫 화면으로 그냥 돌아가고, 실패하면 오류 토스트(C3-4)와 함께 첫 화면으로
 */
export async function completeLogin(provider: AuthProvider, params: LoginCallbackParams) {
  if (params.error || !params.code) {
    // 동의 화면에서 취소(access_denied)는 조용히, 백엔드 오류는 문구를 보여 주고 첫 화면으로
    if (params.error && params.error !== "access_denied") toast(params.message ?? FAILED);
    router.replace("/welcome");
    return;
  }
  if (!params.state) {
    // 인가 코드는 있는데 state가 없으면 백엔드가 CSRF 검사를 못 하니 부르지 않는다
    toast(FAILED);
    router.replace("/welcome");
    return;
  }
  try {
    const login = await authApi.callback(provider, { code: params.code, state: params.state });
    const next = takeLoginNext();
    setStoredAccount({ id: login.user.id, nickname: login.user.nickname, provider });
    if ("signupToken" in login) {
      setSignupSession(login.signupToken, login.expiresIn);
      router.replace(next ? { pathname: "/agreements", params: { next } } : "/agreements");
    } else {
      setAccessToken(login.accessToken);
      router.replace((next as "/home") ?? "/home");
    }
  } catch (error) {
    console.error("[auth] 로그인 콜백 실패", error);
    toast(getErrorMessage(error, FAILED));
    router.replace("/welcome");
  }
}
