import { useEffect, useState, useSyncExternalStore } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, semantic, shadows, spacing, toNativeShadow } from "./theme";
import { Text } from "./text";

/** 하단 탭 위로 띄운다. iOS 캡슐(아래 20 + 높이 58)보다, Android 막대(80dp)보다 조금 위 */
const TOAST_BOTTOM = Platform.OS === "android" ? 96 : 80;

type ToastAction = {
  label: string;
  onClick: () => void;
  /** 누를 수 없는 행동. 왜 못 하는지 메시지로 알릴 때 (QA T05-08) */
  disabled?: boolean;
};
type ToastItem = {
  id: number;
  message: string;
  action?: ToastAction;
  /** ms. 되돌리기 같은 행동이 있으면 5초 (FL-02) */
  duration: number;
};

type Listener = () => void;

let seq = 0;
let current: ToastItem | null = null;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** 화면 아래 검은 토스트 (Figma 토스트, C3). 한 번에 하나만 보인다 */
export const toast = (message: string, options?: { action?: ToastAction; duration?: number }) => {
  current = {
    id: ++seq,
    message,
    action: options?.action,
    duration: options?.duration ?? (options?.action ? 5000 : 3000),
  };
  emit();
};

const dismiss = () => {
  current = null;
  emit();
};

export function Toaster() {
  const item = useSyncExternalStore(subscribe, () => current);
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!item) return;
    opacity.setValue(0);
    // Figma 프로토타입: 아래에서 밀려 들어온다 (MOVE_IN 0.3s ease-out)
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.bezier(0, 0, 0.58, 1),
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(dismiss, item.duration);
    return () => clearTimeout(timer);
  }, [item, opacity]);

  if (!item) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: TOAST_BOTTOM + insets.bottom }]}
      accessibilityLiveRegion="polite"
    >
      <Animated.View
        key={item.id}
        style={[
          styles.toast,
          {
            opacity,
            transform: [
              { translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            ],
          },
        ]}
        accessibilityRole="alert"
      >
        <Text
          variant="body-md"
          weight="medium"
          color={semantic.inverseForeground}
          style={{ flex: 1 }}
        >
          {item.message}
        </Text>
        {item.action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: Boolean(item.action.disabled) }}
            disabled={item.action.disabled}
            style={item.action.disabled ? styles.actionDisabled : undefined}
            hitSlop={8}
            onPress={() => {
              item.action?.onClick();
              dismiss();
            }}
          >
            <Text variant="body-md" weight="semibold" color={colors.primary[300]}>
              {item.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: spacing.gutter,
    right: spacing.gutter,
    zIndex: 60,
    alignItems: "center",
  },
  /** Figma 토스트: gray-900 · 모서리 12 · 14/12 여백 · 글 body-md */
  toast: {
    width: "100%",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: semantic.inverse,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...toNativeShadow(shadows.md),
  },
  actionDisabled: { opacity: 0.4 },
});
