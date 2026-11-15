import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Text, type TextVariant } from "./text";
import { colors, radius, semantic } from "./theme";

export type ButtonVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "danger"
  | "destructive"
  | "inverse"
  | "kakao"
  | "link";

/** xl = large(56) · lg = medium(44) · md 36 · sm 28 · xs 24 */
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; gap: number; radius: number; text: TextVariant }
> = {
  xs: { height: 24, paddingHorizontal: 8, gap: 4, radius: radius.sm, text: "body-sm" },
  sm: { height: 28, paddingHorizontal: 10, gap: 4, radius: radius.md, text: "body-md" },
  md: { height: 36, paddingHorizontal: 12, gap: 4, radius: radius.md, text: "body-lg" },
  lg: { height: 44, paddingHorizontal: 20, gap: 8, radius: radius.lg, text: "title-xs" },
  xl: { height: 56, paddingHorizontal: 20, gap: 8, radius: radius.lg, text: "title-xs" },
};

type Look = { background: string; border: string; text: string };

function lookOf(variant: ButtonVariant, pressed: boolean, disabled: boolean): Look {
  if (disabled) {
    const border = variant === "outline" ? semantic.input : "transparent";
    const background = variant === "ghost" || variant === "link" ? "transparent" : semantic.muted;
    return { background, border, text: semantic.disabledForeground };
  }
  switch (variant) {
    case "default":
      return { background: "transparent", border: "transparent", text: semantic.primaryForeground };
    case "outline":
      return {
        background: semantic.background,
        border: pressed ? colors.primary[700] : semantic.primary,
        text: pressed ? colors.primary[700] : semantic.primary,
      };
    case "secondary":
      return {
        background: pressed ? colors.gray[300] : semantic.secondary,
        border: "transparent",
        text: semantic.foreground,
      };
    case "ghost":
      return {
        background: pressed ? colors.gray[200] : "transparent",
        border: "transparent",
        text: semantic.foreground,
      };
    case "danger":
      return {
        background: pressed ? colors.red[700] : semantic.destructive,
        border: "transparent",
        text: colors.white,
      };
    case "destructive":
      return {
        background: pressed ? colors.red[200] : semantic.destructiveSoft,
        border: "transparent",
        text: semantic.destructive,
      };
    case "inverse":
      return {
        background: pressed ? colors.gray[700] : semantic.inverse,
        border: "transparent",
        text: semantic.inverseForeground,
      };
    case "kakao":
      return { background: semantic.kakao, border: "transparent", text: semantic.kakaoForeground };
    case "link":
      return { background: "transparent", border: "transparent", text: semantic.primary };
  }
}

const GRADIENT: Record<"idle" | "pressed", [string, string]> = {
  idle: [colors.sub[500], colors.primary[500]],
  pressed: [colors.sub[700], colors.primary[700]],
};

export type ButtonProps = {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** 저장 중: 글자 대신 돌아가는 표시 */
  loading?: boolean;
  /** 왼쪽 아이콘 */
  icon?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * 버튼 (Figma Button).
 * - default(fill): sub→primary 그라데이션, 누르면 한 단계 진한 그라데이션
 * - outline: primary 2px 테두리, 누르면 700
 * - 비활성: gray-100 바탕 · gray-300 글자 (fill) / + gray-300 테두리 (outline)
 */
export function Button({
  children,
  variant = "default",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  onPress,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const dims = SIZE[size];
  const inactive = disabled || loading;
  const textWeight = size === "lg" || size === "xl" ? "bold" : size === "md" ? "bold" : "semibold";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => {
        const look = lookOf(variant, pressed, inactive);
        return [
          styles.base,
          {
            height: dims.height,
            paddingHorizontal: dims.paddingHorizontal,
            gap: dims.gap,
            borderRadius: dims.radius,
            backgroundColor: look.background,
            borderColor: look.border,
          },
          variant === "link" && styles.link,
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const look = lookOf(variant, pressed, inactive);
        return (
          <>
            {variant === "default" && !inactive ? (
              <LinearGradient
                colors={GRADIENT[pressed ? "pressed" : "idle"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[StyleSheet.absoluteFill, { borderRadius: dims.radius - 2 }]}
              />
            ) : null}
            {loading ? (
              <ActivityIndicator color={look.text} />
            ) : (
              <View style={[styles.content, { gap: dims.gap }]}>
                {icon}
                {typeof children === "string" ? (
                  <Text variant={dims.text} weight={textWeight} color={look.text} numberOfLines={1}>
                    {children}
                  </Text>
                ) : (
                  children
                )}
              </View>
            )}
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    overflow: "hidden",
  },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  link: { borderWidth: 0, height: undefined, paddingHorizontal: 0 },
});
