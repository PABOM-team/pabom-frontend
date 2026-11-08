import { getQueryClient } from "@pabom/core/api/query-client";
import { colors } from "@pabom/core/design/tokens";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

/**
 * 앱 뿌리. 웹의 apps/web/src/app/providers 와 같은 역할.
 * QueryClient·API 클라이언트·zod 스키마는 @pabom/core 에서 웹과 같은 것을 쓴다.
 */
export default function RootLayout() {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.gray[900],
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.white },
        }}
      />
    </QueryClientProvider>
  );
}
