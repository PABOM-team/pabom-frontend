import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { notificationTarget } from "@pabom/core/domain/notification";
import { getPushPermission, syncPushToken, type PushPermission } from "./push";

/**
 * 로그인한 화면 묶음에서 한 번 부른다. 권한이 있으면 토큰을 서버에 맞춰 두고,
 * 토큰이 바뀌면(앱 재설치·OS 갱신) 다시 등록한다
 */
export function usePushTokenSync() {
  useEffect(() => {
    void syncPushToken();
    const subscription = Notifications.addPushTokenListener(() => void syncPushToken());
    return () => subscription.remove();
  }, []);
}

/**
 * 알림을 누르면 서버가 data.url 에 넣은 화면을 연다.
 * 앱이 꺼져 있다가 알림으로 켜진 경우도 처리한다. 로그인이 필요한 화면이면 RequireAuth 가 첫 화면으로 보낸다
 */
export function useNotificationTapRedirect() {
  useEffect(() => {
    let active = true;

    const redirect = (response: Notifications.NotificationResponse) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const url = notificationTarget(response.notification.request.content.data);
      if (url) router.push(url as Parameters<typeof router.push>[0]);
      // 다시 그려질 때 같은 알림으로 또 이동하지 않게 지운다
      void Notifications.clearLastNotificationResponseAsync();
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (active && response) redirect(response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(redirect);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
}

/**
 * 기기 알림 권한. 설정 앱에서 바꾸고 돌아오면 다시 읽는다.
 * 허용으로 바뀌면 토큰도 바로 등록한다
 */
export function usePushPermission() {
  const [permission, setPermission] = useState<PushPermission | null>(null);

  useEffect(() => {
    let active = true;
    const read = () =>
      getPushPermission().then((next) => {
        if (!active) return;
        setPermission(next);
        if (next === "granted") void syncPushToken();
      });

    void read();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void read();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return { permission, setPermission };
}
