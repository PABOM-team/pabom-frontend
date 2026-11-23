import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSurface, type Surface } from "./surface";
import { Text, type TextVariant } from "./text";
import { colors, radius, semantic } from "./theme";

type Option<T extends string | number> = { value: T; label: string; disabled?: boolean };

export type ChipTone =
  "primary" | "info" | "success" | "warning" | "danger" | "contrast" | "hint" | "border";
/** sm 20 · md 24 · lg 32 · xl 44(Figma 칩) */
export type ChipSize = "sm" | "md" | "lg" | "xl";
export type ChipShape = "pill" | "square";

/** tone 을 준 칩(꼬리표): 색을 꽉 채우고 흰 글자. border 는 흰 바탕 + gray-300 테두리 */
const TONE: Record<ChipTone, { background: string; text: string; border: string }> = {
  primary: {
    background: semantic.primary,
    text: semantic.primaryForeground,
    border: "transparent",
  },
  info: { background: semantic.info, text: colors.white, border: "transparent" },
  success: { background: semantic.success, text: colors.white, border: "transparent" },
  warning: { background: semantic.warning, text: colors.white, border: "transparent" },
  danger: { background: semantic.destructive, text: colors.white, border: "transparent" },
  contrast: {
    background: semantic.inverse,
    text: semantic.inverseForeground,
    border: "transparent",
  },
  hint: { background: semantic.muted, text: semantic.secondaryText, border: "transparent" },
  border: {
    background: semantic.background,
    text: semantic.subtleForeground,
    border: semantic.input,
  },
};

const SIZE: Record<
  ChipSize,
  { height: number; paddingHorizontal: number; gap: number; text: TextVariant }
> = {
  sm: { height: 20, paddingHorizontal: 6, gap: 4, text: "body-sm" },
  md: { height: 24, paddingHorizontal: 8, gap: 4, text: "body-md" },
  lg: { height: 32, paddingHorizontal: 12, gap: 4, text: "body-lg" },
  xl: { height: 44, paddingHorizontal: 20, gap: 6, text: "body-xl" },
};

const PRESS_GRADIENT: [string, string] = [colors.sub[700], colors.primary[700]];

/** 고르는 칩 (Figma 칩: 선택=예·아니오 × 상태=기본·눌림·비활성 × 바탕) */
const selectLook = (
  selected: boolean,
  pressed: boolean,
  disabled: boolean,
  surface: Surface,
): { background: string; text: string } => {
  if (selected) {
    if (disabled) return { background: colors.primary[100], text: semantic.primaryForeground };
    return {
      background: pressed ? "transparent" : semantic.inverse,
      text: semantic.inverseForeground,
    };
  }
  if (disabled) return { background: semantic.muted, text: semantic.disabledForeground };
  if (pressed) return { background: colors.gray[200], text: semantic.foreground };
  return {
    background: surface === "gray" ? semantic.card : semantic.secondary,
    text: semantic.foreground,
  };
};

/**
 * 칩. tone 을 주면 그 색 꼬리표로, 아니면 고르는 칩(Figma 칩 44px):
 * 안 고름은 회색 화면에서 흰색·흰 바탕에서 gray-100, 고름은 검정, 누르면 진한 그라데이션
 */
export function Chip({
  tone,
  selected = false,
  size = "xl",
  shape = "pill",
  disabled = false,
  onPress,
  icon,
  children,
  style,
  accessibilityLabel,
}: {
  tone?: ChipTone;
  selected?: boolean;
  size?: ChipSize;
  shape?: ChipShape;
  disabled?: boolean;
  onPress?: () => void;
  /** 글자 왼쪽 아이콘 (18px) */
  icon?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const surface = useSurface();
  const dims = SIZE[size];
  const borderRadius = shape === "pill" ? radius.full : radius.md;

  const lookOf = (pressed: boolean) =>
    tone
      ? {
          background: pressed && tone === "border" ? semantic.muted : TONE[tone].background,
          text: TONE[tone].text,
        }
      : selectLook(selected, pressed, disabled, surface);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          height: dims.height,
          paddingHorizontal: dims.paddingHorizontal,
          gap: dims.gap,
          borderRadius,
          backgroundColor: lookOf(pressed).background,
        },
        tone === "border" && { borderWidth: 1, borderColor: TONE.border.border },
        tone && disabled && styles.faded,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {!tone && selected && pressed && !disabled ? (
            <LinearGradient
              colors={PRESS_GRADIENT}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          {typeof children === "string" ? (
            <Text
              variant={dims.text}
              weight={!tone && selected ? "semibold" : "medium"}
              color={lookOf(pressed).text}
              numberOfLines={1}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </>
      )}
    </Pressable>
  );
}

/**
 * 하나만 고르는 칩 묶음.
 * allowDeselect면 같은 칩을 다시 눌러 선택을 비울 수 있다 (선택 입력용)
 */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  allowDeselect = false,
  columns,
  size = "xl",
  shape = "pill",
  style,
}: {
  options: readonly Option<T>[];
  value: T | null | undefined;
  onChange: (value: T | null) => void;
  label: string;
  allowDeselect?: boolean;
  /** 2면 칸을 반씩 나눠 꽉 채운다 (급여 결과 칩) */
  columns?: 2;
  size?: ChipSize;
  shape?: ChipShape;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.group, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Chip
            key={String(option.value)}
            selected={selected}
            disabled={option.disabled}
            size={size}
            shape={shape}
            style={columns === 2 ? styles.half : undefined}
            onPress={() => onChange(selected && allowDeselect ? null : option.value)}
          >
            {option.label}
          </Chip>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  icon: { flexShrink: 0 },
  faded: { opacity: 0.4 },
  group: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  /** 두 칸: gap 8 을 뺀 절반 */
  half: { flexBasis: "47%", flexGrow: 1 },
});
