import type { Href } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { goBack } from "@/shared/lib/navigation";
import { ChevronLeftIcon, XIcon } from "./icons";
import { Text } from "./text";
import { semantic, spacing } from "./theme";

type TopBarProps = {
  title?: ReactNode;
  /** back: ‹ 뒤로, close: × 닫기(왼쪽), none: 없음 */
  leading?: "back" | "close" | "none";
  onLeading?: () => void;
  /** 이전 화면이 없을 때(바로 들어온 경우) 갈 곳 */
  fallbackHref?: Href;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** 화면 위 제목 줄 (52px). 좌우 여백은 그리드 20에 맞추고, 아이콘 버튼은 44px 터치 타깃 */
export function TopBar({
  title,
  leading = "back",
  onLeading,
  fallbackHref = "/home",
  trailing,
  style,
}: TopBarProps) {
  const press = () => (onLeading ? onLeading() : goBack(fallbackHref));

  return (
    <View style={[styles.bar, leading === "none" && { paddingLeft: spacing.gutter }, style]}>
      {leading !== "none" ? (
        <IconButton accessibilityLabel={leading === "back" ? "뒤로" : "닫기"} onPress={press}>
          {leading === "back" ? <ChevronLeftIcon /> : <XIcon />}
        </IconButton>
      ) : null}
      {typeof title === "string" ? (
        <Text variant="title-xs" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      ) : (
        <View style={styles.title}>{title}</View>
      )}
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

/** 44px 동그란 아이콘 버튼 (제목 줄·메뉴 트리거) */
export function IconButton({
  children,
  size = 44,
  accessibilityLabel,
  onPress,
  disabled,
  style,
}: {
  children: ReactNode;
  size?: number;
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && { backgroundColor: semantic.muted },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** 위 제목 줄 오른쪽 글자 버튼 (예: 저장, 건너뛰기) */
export function TopBarAction({
  children,
  onPress,
  disabled,
}: {
  children: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
    >
      <Text
        variant="body-xl"
        weight="medium"
        color={disabled ? semantic.disabledForeground : semantic.primary}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    backgroundColor: semantic.background,
  },
  title: { flex: 1, minWidth: 0 },
  trailing: { flexDirection: "row", alignItems: "center", gap: 4, paddingRight: 8 },
  iconButton: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  action: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8, borderRadius: 8 },
});
