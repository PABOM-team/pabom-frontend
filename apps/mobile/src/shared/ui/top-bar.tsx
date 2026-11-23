import type { Href } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { goBack } from "@/shared/lib/navigation";
import { ChevronLeftIcon, XIcon } from "./icons";
import { Text } from "./text";
import { colors, semantic, spacing } from "./theme";

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

/**
 * 화면 위 제목 줄 (Figma 앱바 52px). 왼쪽 ‹·× 24 아이콘 · 제목 body-xl semibold 왼쪽 정렬 · 오른쪽 글·아이콘.
 * 바탕은 화면 색을 그대로 비추고, 아이콘 버튼은 44px 터치 타깃을 아이콘 바깥으로 넓힌다
 */
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
    <View style={[styles.bar, style]}>
      {leading !== "none" ? (
        <IconButton
          accessibilityLabel={leading === "back" ? "뒤로" : "닫기"}
          onPress={press}
          style={styles.leading}
        >
          {leading === "back" ? <ChevronLeftIcon /> : <XIcon />}
        </IconButton>
      ) : null}
      {typeof title === "string" ? (
        <Text variant="body-xl" weight="semibold" numberOfLines={1} style={styles.title}>
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
        pressed && { backgroundColor: colors.gray[200] },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** 위 제목 줄 오른쪽 글자 버튼 (예: 저장, 건너뛰기). Figma: body-lg medium · info 파랑 */
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
        variant="body-lg"
        weight="medium"
        color={disabled ? semantic.disabledForeground : semantic.info}
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
    gap: 8,
    paddingHorizontal: spacing.gutter,
  },
  /** 44 터치 칸 안의 24 아이콘이 여백 선(gutter)에 붙도록 */
  leading: { marginLeft: -10, marginRight: -6 },
  title: { flex: 1, minWidth: 0 },
  trailing: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: -10 },
  iconButton: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  action: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10, borderRadius: 8 },
});
