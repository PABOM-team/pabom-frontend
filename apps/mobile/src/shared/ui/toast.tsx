import { useEffect, useState, useSyncExternalStore } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, semantic, shadows, spacing, toNativeShadow } from "./theme";
import { Text } from "./text";

type ToastAction = { label: string; onClick: () => void };
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

/** 화면 아래 검은 토스트 (C3). 한 번에 하나만 보인다 */
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
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const timer = setTimeout(dismiss, item.duration);
    return () => clearTimeout(timer);
  }, [item, opacity]);

  if (!item) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: 80 + insets.bottom }]}
      accessibilityLiveRegion="polite"
    >
      <Animated.View key={item.id} style={[styles.toast, { opacity }]} accessibilityRole="alert">
        <Text
          variant="body-lg"
          weight="medium"
          color={semantic.inverseForeground}
          style={{ flex: 1 }}
        >
          {item.message}
        </Text>
        {item.action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              item.action?.onClick();
              dismiss();
            }}
          >
            <Text variant="body-lg" weight="semibold" color={colors.sub[300]}>
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
  toast: {
    width: "100%",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: semantic.inverse,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...toNativeShadow(shadows.md),
  },
});
