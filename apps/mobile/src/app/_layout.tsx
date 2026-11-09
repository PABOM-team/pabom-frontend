import { QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getQueryClient } from "@pabom/core/api/query-client";
import { configureSessionStorage, onSessionExpired } from "@pabom/core/api/session";
import { meQueries } from "@pabom/core/entities/session";
import PretendardBold from "../../assets/fonts/Pretendard-Bold.otf";
import PretendardMedium from "../../assets/fonts/Pretendard-Medium.otf";
import PretendardRegular from "../../assets/fonts/Pretendard-Regular.otf";
import PretendardSemiBold from "../../assets/fonts/Pretendard-SemiBold.otf";
import { createSessionStorage } from "@/shared/lib/session-storage";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { OfflineBanner } from "@/shared/ui/offline-banner";
import { PabomAppIcon, PabomLogo } from "@/shared/ui/pabom-logo";
import { semantic, shadows, toNativeShadow } from "@/shared/ui/theme";
import { Toaster } from "@/shared/ui/toast";

// 네이티브 스플래시(로고)는 우리가 그리는 로고 화면이 뜬 뒤에 내린다. 그 사이 빈 화면이 보이지 않게
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: false });

// 가입 토큰·로그인 계정은 SecureStore 에 둔다 (웹의 sessionStorage 자리)
configureSessionStorage(createSessionStorage());

const FONTS = {
  "Pretendard-Regular": PretendardRegular,
  "Pretendard-Medium": PretendardMedium,
  "Pretendard-SemiBold": PretendardSemiBold,
  "Pretendard-Bold": PretendardBold,
};

/**
 * 앱 뿌리. 웹의 apps/web/src/app/providers 와 같은 역할.
 * QueryClient·API 클라이언트·zod 스키마는 @pabom/core 에서 웹과 같은 것을 쓴다
 */
export default function RootLayout() {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={styles.root}>
          <OfflineBanner />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: semantic.background },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="index" options={{ animation: "none" }} />
            <Stack.Screen name="welcome" options={{ animation: "fade" }} />
            <Stack.Screen name="(app)" options={{ animation: "fade" }} />
          </Stack>
          <Toaster />
          <SessionExpiredDialog />
          <SplashGate />
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

/**
 * 앱을 켤 때 보이는 로고 화면. 글꼴과 로그인 상태(내 정보)를 불러오는 동안만 보이고,
 * 다 되면 페이드로 사라지며 아래의 첫 화면(로그인 또는 홈)이 드러난다
 */
function SplashGate() {
  const [fontsLoaded, fontError] = useFonts(FONTS);
  // 로그인 여부를 알아야 첫 화면이 정해진다. 실패(로그인 안 됨)도 '정해진 것'이다
  const me = useQuery({ ...meQueries.detail(), retry: false });
  const ready = (fontsLoaded || Boolean(fontError)) && !me.isPending;
  const [opacity] = useState(() => new Animated.Value(1));
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!ready) return;
    // 아래 화면이 한 프레임 그려진 뒤에 걷어 낸다
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }).start(
        ({ finished }) => finished && setGone(true),
      );
    }, 80);
    return () => clearTimeout(timer);
  }, [ready, opacity]);

  if (gone) return null;

  return (
    <Animated.View
      pointerEvents={ready ? "none" : "auto"}
      style={[styles.splash, { opacity }]}
      onLayout={() => void SplashScreen.hideAsync()}
    >
      <PabomAppIcon size={72} style={toNativeShadow(shadows.md)} />
      <View style={{ height: 20 }} />
      <PabomLogo size="lg" />
    </Animated.View>
  );
}

/** 어느 화면에서든 로그인이 끊기면 뜨는 창 (C5-2). 다시 로그인하면 보던 화면으로 돌아온다 */
function SessionExpiredDialog() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => onSessionExpired(() => setOpen(true)), []);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="로그인이 만료됐어요"
      description="다시 로그인하면 보던 화면으로 돌아와요."
      confirmLabel="다시 로그인"
      cancelLabel={null}
      onConfirm={() => {
        setOpen(false);
        queryClient.clear();
        router.replace({ pathname: "/welcome", params: { next: pathname } });
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  splash: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.background,
  },
});
