import type { ReactNode, RefObject } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardPadding, useScrollToFocusedInput } from "./keyboard";
import { SurfaceProvider } from "./surface";
import { semantic, spacing } from "./theme";

/**
 * 한 화면의 뼈대. 위 제목 줄과 아래 고정 영역 사이만 스크롤된다.
 * 바탕은 Figma 화면처럼 gray-100(semantic.screen)이고 그 위에 흰 카드를 올린다.
 * 흰 화면(로그인·약관 등)은 tone="white".
 * 좌우 여백은 디자인 시스템 Grid(375 기준 20px) 토큰 `gutter` 를 쓴다
 */
export function Screen({
  children,
  style,
  /** 탭 화면처럼 위 안전 영역을 바깥에서 처리하면 false */
  topInset = true,
  tone = "gray",
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  topInset?: boolean;
  tone?: "gray" | "white";
}) {
  const insets = useSafeAreaInsets();
  // 키보드가 올라오는 프레임에 맞춰 화면이 줄어든다. 아래 버튼은 키보드 위 12 에 붙는다 (ScreenFooter 가 안전 영역만큼 이미 띄움)
  const keyboardPadding = useKeyboardPadding(Math.max(insets.bottom - 12, 0));
  return (
    <SurfaceProvider value={tone}>
      <Animated.View
        style={[
          styles.screen,
          { backgroundColor: tone === "gray" ? semantic.screen : semantic.background },
          topInset && { paddingTop: insets.top },
          style,
          keyboardPadding,
        ]}
      >
        {children}
      </Animated.View>
    </SurfaceProvider>
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
  scrollRef,
  ...props
}: Omit<ScrollViewProps, "style" | "contentContainerStyle"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  flush?: boolean;
  gap?: number;
  /** 바깥에서 직접 스크롤할 때 (약관 목차 등) */
  scrollRef?: RefObject<ScrollViewInstance | null>;
}) {
  // 키보드가 뜨면 입력 중인 칸이 가려지지 않게 스크롤한다
  const { ref, scrollEventThrottle, onScroll, onLayout } = useScrollToFocusedInput();
  return (
    <ScrollView
      ref={(node) => {
        ref.current = node;
        if (scrollRef) scrollRef.current = node;
      }}
      scrollEventThrottle={scrollEventThrottle}
      onLayout={onLayout}
      style={[styles.body, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={[
        styles.bodyContent,
        !flush && { paddingHorizontal: spacing.gutter },
        gap !== undefined && { gap },
        contentStyle,
      ]}
      {...props}
      onScroll={(event) => {
        onScroll(event);
        props.onScroll?.(event);
      }}
    >
      {children}
    </ScrollView>
  );
}

/** 하단 고정 버튼 영역. 바탕은 화면 색을 그대로 비춘다 */
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
  screen: { flex: 1 },
  body: { flex: 1 },
  bodyContent: { paddingTop: 8, paddingBottom: 24 },
  footer: {
    flexShrink: 0,
    gap: 8,
    paddingHorizontal: spacing.gutter,
    paddingTop: 10,
  },
  center: { flex: 1, justifyContent: "center" },
});
