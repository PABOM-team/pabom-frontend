import { login as kakaoLogin, logout as kakaoLogout } from "@react-native-seoul/kakao-login";
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { AppState, Platform } from "react-native";
import type { AuthProvider } from "@pabom/core/domain/user";

/** 앱 안에 들어가는 공개 값. 글자 그대로 적어야 번들에 들어간다 */
const KAKAO_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** 구글은 웹 클라이언트 ID(백엔드 검증 기준)가 있어야 하고, iOS 는 iOS 클라이언트 ID 도 있어야 한다 */
const googleReady = Boolean(
  GOOGLE_WEB_CLIENT_ID && (Platform.OS !== "ios" || GOOGLE_IOS_CLIENT_ID),
);

const SDK_READY: Record<AuthProvider, boolean> = {
  kakao: Boolean(KAKAO_APP_KEY),
  google: googleReady,
};

/**
 * 이 빌드에 그 SDK 키가 들어 있는지. 없으면 로그인 버튼이 브라우저 로그인(백엔드 app-callback)으로 간다.
 * 키는 eas.json 프로필·.env.local 의 EXPO_PUBLIC_* 로 넣는다
 */
export const isSdkReady = (provider: AuthProvider) => SDK_READY[provider];

if (googleReady) {
  // webClientId 를 넣어야 백엔드가 검증할 수 있는 ID 토큰(aud = 웹 클라이언트)이 나온다
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
}

/** 사용자가 로그인 창을 닫았다. 조용히 첫 화면에 머문다 */
export class LoginCancelled extends Error {
  constructor() {
    super("로그인을 취소했어요.");
    this.name = "LoginCancelled";
  }
}

/** 백엔드 토큰 로그인 API에 보낼 값 */
export type SocialToken = { accessToken: string } | { idToken: string };

/** 카카오 SDK는 취소를 문구로만 알려 준다 (iOS ClientFailed(Cancelled), Android Cancelled) */
const isKakaoCancel = (error: unknown) => error instanceof Error && /cancel/i.test(error.message);

/** 앱으로 돌아온 뒤 카카오 SDK 답을 기다리는 시간. 정상 로그인은 돌아온 뒤 토큰 요청 한 번이라 이 안에 끝난다 */
const KAKAO_RETURN_GRACE_MS = 3000;

/**
 * 카카오톡으로 넘어갔다가 동의하지 않고 파봄으로 그냥 돌아오면(상태 표시줄 ◀, 앱 전환)
 * 카카오 SDK가 아무 답도 주지 않아 로그인 버튼이 계속 로딩 상태로 멈춘다 (QA T01-04).
 * 앱이 밖에 나갔다 돌아온 뒤 KAKAO_RETURN_GRACE_MS 안에 답이 없으면 취소로 본다.
 * 반환한 함수로 감시를 멈춘다
 */
function rejectWhenReturnedWithoutAnswer(reject: (error: Error) => void) {
  let leftApp = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "background") leftApp = true;
    if (state === "active" && leftApp) {
      clearTimeout(timer);
      timer = setTimeout(() => reject(new LoginCancelled()), KAKAO_RETURN_GRACE_MS);
    }
  });
  return () => {
    clearTimeout(timer);
    subscription.remove();
  };
}

/**
 * 카카오톡이 있으면 카카오톡으로, 없거나 카카오톡에 계정이 없으면 카카오계정 화면으로 로그인해
 * 카카오 access 토큰을 받는다
 */
async function kakaoToken(): Promise<SocialToken> {
  let stopWatching = () => {};
  try {
    const { accessToken } = await Promise.race([
      kakaoLogin(),
      new Promise<never>((_, reject) => {
        stopWatching = rejectWhenReturnedWithoutAnswer(reject);
      }),
    ]);
    return { accessToken };
  } catch (error) {
    if (error instanceof LoginCancelled || isKakaoCancel(error)) throw new LoginCancelled();
    throw error;
  } finally {
    stopWatching();
  }
}

/** 구글 계정을 골라 ID 토큰을 받는다 */
async function googleToken(): Promise<SocialToken> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) throw new LoginCancelled();
    const { idToken } = response.data;
    if (!idToken) throw new Error("구글 ID 토큰을 받지 못했어요.");
    return { idToken };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new LoginCancelled();
    }
    throw error;
  }
}

/** 카카오·구글 SDK로 로그인해 백엔드에 보낼 토큰을 받는다. isSdkReady 일 때만 부른다 */
export const socialToken = (provider: AuthProvider) =>
  provider === "kakao" ? kakaoToken() : googleToken();

/**
 * 기기의 카카오·구글 로그인 상태를 지운다. 다음 로그인 때 다른 계정을 고를 수 있게.
 * 어느 SDK로 로그인했는지 몰라도 둘 다 지운다. 실패해도 파봄 로그아웃은 이어 간다
 */
export async function socialLogout() {
  await Promise.allSettled([
    SDK_READY.kakao ? kakaoLogout() : Promise.resolve(),
    SDK_READY.google ? GoogleSignin.signOut() : Promise.resolve(),
  ]);
}
