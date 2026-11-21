import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Linking, Platform } from "react-native";
import { pushTokensApi } from "@pabom/core/api/endpoints";
import { expoPushTokenSchema, type AppVariant } from "@pabom/core/domain/notification";

/**
 * 앱 푸시 알림 (Expo Push Service).
 * 권한 → (안드로이드) 채널 → Expo 푸시 토큰 → 백엔드 등록(PUT /push-tokens) 순서로 간다.
 * 원격 푸시는 Expo Go(안드로이드)에서 안 되고 개발 빌드가 있어야 한다
 */

/** 케어 알림 채널. 서버가 보낼 때 channelId 로 같은 값을 쓴다 (backend#62) */
export const CARE_CHANNEL_ID = "care";

/** 마지막으로 서버에 등록한 이 기기 토큰. 로그아웃 때 이 값으로 지운다 */
const REGISTERED_TOKEN_KEY = "pabom.push-token";

/** 앱이 켜져 있을 때 온 알림도 위 배너로 보여 준다 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushPermission = "granted" | "denied" | "undetermined";

const toPermission = (settings: Notifications.NotificationPermissionsStatus): PushPermission => {
  // iOS 는 status 대신 ios.status 를 봐야 한다. 임시 허용(PROVISIONAL)도 받는 것으로 본다
  if (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return "granted";
  }
  return settings.canAskAgain ? "undetermined" : "denied";
};

/**
 * 안드로이드 8+ 알림 채널. 안드로이드 13+ 는 채널이 하나라도 있어야 권한 창이 뜨고 토큰이 나오므로
 * 권한을 묻기 전에 만든다. 채널은 처음 만든 뒤 이름·설명만 바꿀 수 있다
 */
async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CARE_CHANNEL_ID, {
    name: "케어 알림",
    description: "급여·분무 같은 오늘 할 관리를 알려 드려요.",
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function getPushPermission(): Promise<PushPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

/**
 * 권한 창을 띄운다. 이미 정해졌으면(허용·거부) 창 없이 그 값을 돌려준다.
 * 방금 허용했으면 토큰도 바로 서버에 등록한다
 */
export async function requestPushPermission(): Promise<PushPermission> {
  if (Platform.OS === "web") return "denied";
  await ensureChannel();
  const current = await getPushPermission();
  if (current !== "undetermined") return current;
  const next = toPermission(await Notifications.requestPermissionsAsync());
  if (next === "granted") void syncPushToken();
  return next;
}

/** 거부한 뒤에는 앱에서 다시 물을 수 없어 기기 설정의 이 앱 화면을 연다 */
export function openPushSettings() {
  return Linking.openSettings();
}

const appVariant = (): AppVariant =>
  Constants.expoConfig?.ios?.bundleIdentifier?.endsWith(".dev") ||
  Constants.expoConfig?.android?.package?.endsWith(".dev")
    ? "DEVELOPMENT"
    : "PRODUCTION";

async function getExpoPushToken() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("EAS projectId 가 없어 푸시 토큰을 받을 수 없어요.");
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return expoPushTokenSchema.parse(data);
}

/**
 * 권한이 있으면 이 기기 토큰을 서버에 등록한다. 권한 창은 띄우지 않는다.
 * 같은 토큰을 다시 보내도 되는 멱등 API라 앱을 켤 때·로그인할 때마다 부른다.
 * 오프라인·시뮬레이터 등으로 토큰을 못 받으면 조용히 넘어가고 다음 기회에 다시 한다
 */
export async function syncPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if ((await getPushPermission()) !== "granted") return null;
  try {
    await ensureChannel();
    const token = await getExpoPushToken();
    await pushTokensApi.register({
      token,
      platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
      appVariant: appVariant(),
    });
    await SecureStore.setItemAsync(REGISTERED_TOKEN_KEY, token);
    return token;
  } catch (error) {
    if (__DEV__) console.warn("[push] 토큰 등록 실패", error);
    return null;
  }
}

/**
 * 로그아웃 직전에 이 기기 토큰을 서버에서 지운다 (access 토큰이 살아 있을 때 불러야 한다).
 * 실패해도 로그아웃은 계속한다. 서버가 보낼 때 Expo 가 만료 토큰을 알려 주면 그때도 지워진다
 */
export async function unregisterPushToken() {
  const token = await SecureStore.getItemAsync(REGISTERED_TOKEN_KEY).catch(() => null);
  if (!token) return;
  await pushTokensApi.unregister(token).catch(() => undefined);
  await forgetPushToken();
}

/** 회원 탈퇴 뒤처럼 서버가 이미 지운 경우 기기에 남은 값만 지운다 */
export function forgetPushToken() {
  return SecureStore.deleteItemAsync(REGISTERED_TOKEN_KEY).catch(() => undefined);
}
