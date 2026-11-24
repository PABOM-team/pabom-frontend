import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Spinner } from "./spinner";
import { Text, type TextVariant } from "./text";
import { alpha, colors, radius, semantic } from "./theme";

export type ButtonVariant =
  | "default"
  | "outline"
  | "secondary"
  | "white"
  | "ghost"
  | "danger"
  | "destructive"
  | "inverse"
  | "kakao"
  | "google"
  | "link";

/** xl 56(Figma 기본) · lg 44(Figma 작은) · md 38 · sm 28 · xs 24 */
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; gap: number; radius: number; text: TextVariant }
> = {
  xs: { height: 24, paddingHorizontal: 8, gap: 4, radius: radius.sm, text: "body-sm" },
  sm: { height: 28, paddingHorizontal: 10, gap: 4, radius: radius.md, text: "body-md" },
  md: { height: 38, paddingHorizontal: 16, gap: 8, radius: radius.lg, text: "body-lg" },
  lg: { height: 44, paddingHorizontal: 16, gap: 8, radius: radius.lg, text: "body-lg" },
  xl: { height: 56, paddingHorizontal: 16, gap: 8, radius: radius.lg, text: "body-xl" },
};

type Look = { background: string; border: string; text: string };

const NONE = "transparent";
/** 카카오·구글 버튼을 누르면 위에 덮는 8% 검정 (Figma 눌림) */
const PRESS_SHADE = alpha(colors.gray[950], 0.08);

const lookOf = (variant: ButtonVariant, pressed: boolean, disabled: boolean): Look => {
  if (disabled) {
    if (variant === "outline" || variant === "google")
      return {
        background: semantic.background,
        border: semantic.input,
        text: semantic.disabledForeground,
      };
    if (variant === "ghost" || variant === "link")
      return { background: NONE, border: NONE, text: semantic.disabledForeground };
    if (variant === "secondary" || variant === "white")
      return { background: semantic.muted, border: NONE, text: semantic.disabledForeground };
    return { background: colors.gray[300], border: NONE, text: semantic.primaryForeground };
  }
  switch (variant) {
    case "default":
      return { background: NONE, border: NONE, text: semantic.primaryForeground };
    case "outline":
      return pressed
        ? {
            background: semantic.primarySoft,
            border: colors.primary[700],
            text: colors.primary[700],
          }
        : { background: semantic.background, border: semantic.primary, text: semantic.primary };
    case "secondary":
      return {
        background: pressed ? colors.gray[200] : semantic.secondary,
        border: NONE,
        text: semantic.secondaryText,
      };
    case "white":
      return {
        background: pressed ? semantic.secondary : semantic.card,
        border: NONE,
        text: semantic.secondaryText,
      };
    case "ghost":
      return {
        background: pressed ? colors.gray[200] : NONE,
        border: NONE,
        text: semantic.foreground,
      };
    case "danger":
    case "inverse":
      return {
        background: pressed ? colors.gray[800] : semantic.inverse,
        border: NONE,
        text: semantic.inverseForeground,
      };
    case "destructive":
      return {
        background: pressed ? colors.red[100] : semantic.destructiveSoft,
        border: NONE,
        text: semantic.destructive,
      };
    case "kakao":
      return { background: semantic.kakao, border: NONE, text: semantic.kakaoForeground };
    case "google":
      return { background: semantic.background, border: semantic.input, text: semantic.foreground };
    case "link":
      return { background: NONE, border: NONE, text: semantic.primary };
  }
};

const GRADIENT: Record<"idle" | "pressed", [string, string]> = {
  idle: [colors.sub[500], colors.primary[500]],
  pressed: [colors.sub[700], colors.primary[700]],
};

const BORDER_WIDTH: Partial<Record<ButtonVariant, number>> = { outline: 1.4, google: 1 };

/** 진한 바탕이라 흰 스피너를 쓰는 종류 */
const DARK_FILL: readonly ButtonVariant[] = ["default", "danger", "inverse"];

export type ButtonProps = {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** 저장 중: 글자 대신 돌아가는 표시 */
  loading?: boolean;
  /** 왼쪽 아이콘 (20px 권장) */
  icon?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * 버튼 (Figma 버튼). 모서리 12 · 글자 semibold.
 * - default: sub→primary 그라데이션, 누르면 한 단계 진한 그라데이션, 비활성 gray-300
 * - outline: primary 1.4px 테두리, 누르면 primary-50 바탕 + 700
 * - secondary(보조): gray-100 · white(흰 보조): 흰 바탕. 글자 gray-700
 * - danger(위험)·inverse(검정): gray-900, 누르면 gray-800
 * - kakao·google: 소셜 로그인
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
  // 저장 중은 비활성 회색이 아니라 눌린 모양 그대로 스피너를 보여 준다 (Figma 상태=저장 중)
  const looksDisabled = disabled && !loading;
  const textWeight = size === "xs" ? "medium" : "semibold";
  const filledGradient = variant === "default" && !looksDisabled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => {
        const look = lookOf(variant, pressed || loading, looksDisabled);
        return [
          styles.base,
          {
            height: dims.height,
            paddingHorizontal: dims.paddingHorizontal,
            gap: dims.gap,
            borderRadius: dims.radius,
            backgroundColor: look.background,
            borderColor: look.border,
            borderWidth: BORDER_WIDTH[variant] ?? 0,
          },
          variant === "link" && styles.link,
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const look = lookOf(variant, pressed || loading, looksDisabled);
        const shaded = (variant === "kakao" || variant === "google") && pressed && !inactive;
        return (
          <>
            {filledGradient ? (
              <LinearGradient
                colors={GRADIENT[pressed || loading ? "pressed" : "idle"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            {shaded ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: PRESS_SHADE }]} />
            ) : null}
            {loading ? (
              <Spinner tone={DARK_FILL.includes(variant) ? "inverse" : "primary"} label="저장 중" />
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
    overflow: "hidden",
  },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  link: { height: undefined, paddingHorizontal: 0 },
});
