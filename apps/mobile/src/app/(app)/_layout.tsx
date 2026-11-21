import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { RequireAuth } from "@/features/auth";
import { usePushTokenSync } from "@/features/push";
import { semantic } from "@/shared/ui/theme";

/** 로그인해야 들어오는 화면 묶음 */
export default function AppLayout() {
  return (
    <RequireAuth>
      <PushTokenSync>
        <AppStack />
      </PushTokenSync>
    </RequireAuth>
  );
}

/** 로그인이 확인된 뒤에만 이 기기 푸시 토큰을 서버에 맞춘다 (권한이 있을 때만, 권한 창은 띄우지 않는다) */
function PushTokenSync({ children }: { children: ReactNode }) {
  usePushTokenSync();
  return children;
}

function AppStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: semantic.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
    </Stack>
  );
}
