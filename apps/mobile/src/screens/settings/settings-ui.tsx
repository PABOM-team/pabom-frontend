import type { Href } from "expo-router";
import type { ReactNode } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { PawPrintIcon } from "@/shared/ui/icons";
import { Text } from "@/shared/ui/text";
import { ZoomPressable } from "@/shared/ui/zoom-link";
import { radius, semantic } from "@/shared/ui/theme";

/** 새 디자인(회색 바탕 + 흰 묶음) 화면의 좌우 여백 */
export const PAGE_PADDING = 16;

/** 회색 바탕 위 묶음 제목 (알림 · 정보 · 내 개체) */
export function SectionLabel({
  children,
  inGap = false,
}: {
  children: string;
  /** 부모가 gap 으로 줄 간격을 줄 때 (위아래 여백을 빼고 위에 2만) */
  inGap?: boolean;
}) {
  return (
    <Text
      variant="body-lg"
      weight="semibold"
      color={semantic.secondaryText}
      style={inGap ? styles.labelInGap : styles.label}
    >
      {children}
    </Text>
  );
}

/** 흰 묶음 카드 (Figma 묶음: radius 20, 위아래 4) */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

/** 묶음 안 한 줄. divider 면 위에 안쪽 구분선 (dividerInset 부터) */
export function GroupRow({
  children,
  onPress,
  href,
  divider = false,
  dividerInset = 16,
  disabled,
  accessibilityRole,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  /** 다른 화면으로 가는 줄. 이 줄에서 다음 화면이 커져 나온다 (iOS 줌 전환) */
  href?: Href;
  divider?: boolean;
  dividerInset?: number;
  disabled?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const line = divider ? <View style={[styles.divider, { left: dividerInset }]} /> : null;
  if (!onPress && !href) {
    return (
      <View style={[styles.row, style]}>
        {line}
        {children}
      </View>
    );
  }
  const rowStyle = ({ pressed }: { pressed: boolean }) => [
    styles.row,
    pressed && { backgroundColor: semantic.muted },
    style,
  ];
  if (href && !disabled) {
    return (
      <ZoomPressable
        href={href}
        accessibilityRole={accessibilityRole ?? "link"}
        accessibilityLabel={accessibilityLabel}
        style={rowStyle}
      >
        {line}
        {children}
      </ZoomPressable>
    );
  }
  return (
    <Pressable
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={rowStyle}
    >
      {line}
      {children}
    </Pressable>
  );
}

/** 줄 가운데 글 두 줄 (제목 + 보조 글) */
export function RowText({
  title,
  description,
  dim = false,
}: {
  title: string;
  description?: string | null;
  dim?: boolean;
}) {
  return (
    <View style={styles.rowText}>
      <Text
        variant="body-xl"
        weight="semibold"
        color={dim ? semantic.subtleForeground : semantic.foreground}
        numberOfLines={1}
      >
        {title}
      </Text>
      {description ? (
        <Text
          variant="body-md"
          color={dim ? semantic.subtleForeground : semantic.mutedForeground}
          numberOfLines={2}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}

/** 44px 동그란 사진. 사진이 없으면 발자국 (Figma 기본 프로필) */
export function RoundThumb({ src, dim = false }: { src?: string | null; dim?: boolean }) {
  return (
    <View style={[styles.thumb, dim && { opacity: 0.45 }]}>
      {src ? (
        <Image source={{ uri: src }} alt="" style={styles.fill} resizeMode="cover" />
      ) : (
        <PawPrintIcon size={26} color={semantic.subtleForeground} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 12, marginBottom: 12 },
  labelInGap: { marginTop: 2 },
  // 묶음 위아래 여백은 줄 안에 둔다. 묶음에 두면 맨 위·아래 줄을 누를 때 눌림 색이 가장자리까지 닿지 않는다
  group: {
    backgroundColor: semantic.card,
    borderRadius: radius["2xl"],
    overflow: "hidden",
  },
  row: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    position: "absolute",
    top: 0,
    right: 16,
    height: 1,
    backgroundColor: semantic.border,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.muted,
    flexShrink: 0,
  },
  fill: { width: "100%", height: "100%" },
});
