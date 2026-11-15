import { Stack } from "expo-router";
import { RequireAuth } from "@/features/auth";
import { semantic } from "@/shared/ui/theme";

/** 로그인해야 들어오는 화면 묶음 */
export default function AppLayout() {
  return (
    <RequireAuth>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: semantic.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      </Stack>
    </RequireAuth>
  );
}
