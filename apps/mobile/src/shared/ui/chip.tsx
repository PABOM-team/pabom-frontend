import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text, type TextVariant } from "./text";
import { colors, radius, semantic } from "./theme";

type Option<T extends string | number> = { value: T; label: string; disabled?: boolean };

export type ChipTone =
  "primary" | "info" | "success" | "warning" | "danger" | "contrast" | "hint" | "border";
export type ChipSize = "sm" | "md" | "lg";
export type ChipShape = "pill" | "square";

/** Figma Chip: 색을 꽉 채우고 흰 글자. border 는 흰 바탕 + gray-300 테두리 */
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

/** sm 20px/10 · md 24px/12 · lg 32px/14 */
const SIZE: Record<ChipSize, { height: number; paddingHorizontal: number; text: TextVariant }> = {
  sm: { height: 20, paddingHorizontal: 6, text: "body-sm" },
  md: { height: 24, paddingHorizontal: 8, text: "body-md" },
  lg: { height: 32, paddingHorizontal: 12, text: "body-lg" },
};

/**
 * 칩 (Figma Chip). tone 을 주면 그 색으로, 아니면 selected 에 따라 primary / border.
 * 터치 타깃은 44px 보다 작으니 목록 안에서 gap 을 충분히 둔다
 */
export function Chip({
  tone,
  selected,
  size = "lg",
  shape = "pill",
  disabled,
  onPress,
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
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const resolvedTone = tone ?? (selected ? "primary" : "border");
  const look = TONE[resolvedTone];
  const dims = SIZE[size];
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
          borderRadius: shape === "pill" ? radius.full : radius.md,
          backgroundColor: pressed && resolvedTone === "border" ? semantic.muted : look.background,
          borderColor: look.border,
          borderWidth: resolvedTone === "border" ? 1 : 0,
        },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text variant={dims.text} weight="medium" color={look.text} numberOfLines={1}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

/**
 * 하나만 고르는 칩 묶음 (고르면 primary 로 꽉 채움, 아니면 테두리).
 * allowDeselect면 같은 칩을 다시 눌러 선택을 비울 수 있다 (선택 입력용)
 */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  allowDeselect = false,
  columns,
  size = "lg",
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
  chip: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  group: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  /** 두 칸: gap 8 을 뺀 절반 */
  half: { flexBasis: "47%", flexGrow: 1 },
});
