import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationBar } from "./navigation-bar";
import type { TabBarViewProps } from "./types";

export type { TabBarViewProps } from "./types";

/**
 * Android 하단 탭 (Material 3 Navigation bar). iOS 는 시스템 탭 바를 쓴다 — app/(app)/(tabs)/_layout.ios.tsx
 */
export const TabBar = (props: TabBarViewProps) => <NavigationBar {...props} />;

/**
 * 탭 화면 스크롤 내용 아래에 둘 여백.
 * iOS 시스템 탭 바(리퀴드 글래스)는 화면 위에 떠 있어 그만큼 비워 두고, Android 막대는 화면 아래에 따로 자리를 차지하므로 기본 여백만 둔다
 */
export const useTabBarInset = () => {
  const insets = useSafeAreaInsets();
  return Platform.OS === "android" ? 24 : 58 + Math.max(insets.bottom - 14, 20) + 24;
};
