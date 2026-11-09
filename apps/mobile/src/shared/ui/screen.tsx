import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { semantic, spacing } from "./theme";

/**
 * 한 화면의 뼈대. 위 제목 줄과 아래 고정 영역 사이만 스크롤된다.
 * 좌우 여백은 디자인 시스템 Grid(375 기준 20px) 토큰 `gutter` 를 쓴다
 */
export function Screen({
  children,
  style,
  /** 탭 화면처럼 위 안전 영역을 바깥에서 처리하면 false */
  topInset = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  topInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, topInset && { paddingTop: insets.top }, style]}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

export function ScreenBody({
  children,
  style,
  contentStyle,
  /** 좌우 여백 없이 (날짜 머리가 좌우 꽉 차는 목록 등) */
  flush = false,
  /** 세로 간격(gap) */
  gap,
  ...props
}: Omit<ScrollViewProps, "style" | "contentContainerStyle"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  flush?: boolean;
  gap?: number;
}) {
  return (
    <ScrollView
      style={[styles.body, style]}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.bodyContent,
        !flush && { paddingHorizontal: spacing.gutter },
        gap !== undefined && { gap },
        contentStyle,
      ]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

/** 하단 고정 버튼 영역 */
export function ScreenFooter({
  children,
  style,
  minBottom = 16,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 안전 영역이 이보다 작아도 최소 이만큼 띈다 */
  minBottom?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(minBottom, insets.bottom) }, style]}>
      {children}
    </View>
  );
}

/** 스크롤 없이 세우는 본문 (가운데 정렬 상태 화면 등) */
export function ScreenCenter({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.center, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: semantic.background },
  body: { flex: 1 },
  bodyContent: { paddingTop: 8, paddingBottom: 24 },
  footer: {
    flexShrink: 0,
    gap: 8,
    backgroundColor: semantic.background,
    paddingHorizontal: spacing.gutter,
    paddingTop: 10,
  },
  center: { flex: 1, justifyContent: "center" },
});
