import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { CheckIcon, MinusIcon } from "./icons";
import { Text, textStyles, weightStyle } from "./text";
import { colors, radius, semantic } from "./theme";

/**
 * 칸 제목 + 내용 + 도움말/오류 (Figma 기록 폼의 칸: 라벨 body-lg medium gray-700 · 6 · 입력 칸).
 * 도움말은 body-md medium / gray-500 · 오류 red · 성공 green
 */
export function Field({
  label,
  hint,
  error,
  success,
  children,
  style,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  success?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text variant="body-lg" weight="medium" color={semantic.secondaryText}>
          {label}
        </Text>
      ) : null}
      {children}
      {error ? (
        <HelpMessage tone="error">{error}</HelpMessage>
      ) : success ? (
        <HelpMessage tone="success">{success}</HelpMessage>
      ) : hint ? (
        <HelpMessage>{hint}</HelpMessage>
      ) : null}
    </View>
  );
}

/** 칸 아래 도움말 */
export function HelpMessage({
  tone = "default",
  children,
  align,
  style,
}: {
  tone?: "default" | "error" | "success";
  children: ReactNode;
  align?: "left" | "right" | "center";
  style?: StyleProp<ViewStyle>;
}) {
  const color =
    tone === "error"
      ? semantic.destructive
      : tone === "success"
        ? semantic.success
        : semantic.mutedForeground;
  return (
    <Text variant="body-md" weight="medium" color={color} align={align} style={style}>
      {children}
    </Text>
  );
}

const borderOf = ({
  invalid,
  success,
  focused,
}: {
  invalid?: boolean;
  success?: boolean;
  focused?: boolean;
}) =>
  invalid
    ? semantic.destructive
    : success
      ? semantic.success
      : focused
        ? semantic.primary
        : semantic.input;

/**
 * 입력 칸 (Figma 입력 칸): 46px · 모서리 12 · gray-300 1.3px 테두리 · body-xl regular.
 * 입력 중 primary · 오류 red · 읽기 전용은 흐린 글자
 */
export function Input({
  suffix,
  invalid,
  success,
  variant = "box",
  style,
  containerStyle,
  editable = true,
  onFocus,
  onBlur,
  ...props
}: Omit<TextInputProps, "style"> & {
  /** 오른쪽 단위(g)나 아이콘 */
  suffix?: ReactNode;
  invalid?: boolean;
  success?: boolean;
  /** underline: 밑줄만 있는 칸 */
  variant?: "box" | "underline";
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        styles.fieldBox,
        variant === "underline" && styles.underline,
        { borderColor: borderOf({ invalid, success, focused: focused && editable }) },
        containerStyle,
      ]}
    >
      <TextInput
        {...props}
        editable={editable}
        placeholderTextColor={semantic.subtleForeground}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          textStyles["body-xl"],
          weightStyle("regular"),
          { color: editable ? semantic.foreground : semantic.subtleForeground },
          suffix ? { paddingRight: 40 } : null,
          style,
        ]}
      />
      {suffix ? (
        <View style={styles.suffix} pointerEvents="none">
          {typeof suffix === "string" ? (
            <Text variant="body-xl" color={semantic.mutedForeground}>
              {suffix}
            </Text>
          ) : (
            suffix
          )}
        </View>
      ) : null}
    </View>
  );
}

/**
 * 여러 줄 입력 + 글자 수 (Figma 여러 줄 입력 · 다 참).
 * 글자 수를 다 채우면 칸과 글자 수를 빨갛게 하고 왼쪽에 'N자까지 쓸 수 있어요'
 */
export function Textarea({
  value,
  maxLength,
  style,
  invalid,
  onFocus,
  onBlur,
  ...props
}: Omit<TextInputProps, "style" | "value" | "maxLength"> & {
  value: string;
  maxLength: number;
  style?: StyleProp<ViewStyle>;
  invalid?: boolean;
}) {
  const length = value.length;
  const full = length >= maxLength;
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <View
        style={[
          styles.fieldBox,
          styles.textarea,
          { borderColor: borderOf({ invalid: full || invalid, focused }) },
          style,
        ]}
      >
        <TextInput
          {...props}
          value={value}
          maxLength={maxLength}
          multiline
          textAlignVertical="top"
          placeholderTextColor={semantic.subtleForeground}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.textareaInput,
            textStyles["body-xl"],
            weightStyle("regular"),
            { color: semantic.foreground },
          ]}
        />
      </View>
      <View style={styles.counterRow}>
        <View style={{ flex: 1 }}>
          {full ? <HelpMessage tone="error">{maxLength}자까지 쓸 수 있어요</HelpMessage> : null}
        </View>
        <HelpMessage tone={full ? "error" : "default"} align="right">
          {length} / {maxLength}자
        </HelpMessage>
      </View>
    </View>
  );
}

/** 칸처럼 생긴 버튼 (날짜 고르기·모프 고르기 등). 오른쪽 아이콘은 20px */
export function FieldButton({
  children,
  placeholder,
  icon,
  disabled,
  invalid,
  onPress,
  style,
}: {
  children?: string | null;
  placeholder?: string;
  icon?: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fieldBox,
        styles.fieldButton,
        { borderColor: borderOf({ invalid, focused: pressed && !disabled }) },
        style,
      ]}
    >
      <Text
        variant="body-xl"
        numberOfLines={1}
        color={
          disabled
            ? semantic.subtleForeground
            : children
              ? semantic.foreground
              : semantic.subtleForeground
        }
        style={{ flex: 1 }}
      >
        {children || placeholder}
      </Text>
      {icon ? <View style={[styles.fieldIcon, disabled && { opacity: 0.4 }]}>{icon}</View> : null}
    </Pressable>
  );
}

/**
 * 체크박스 (Figma 체크박스 22px · 모서리 6 · 1.6px 테두리).
 * 빈칸 gray-400 테두리 · 체크 primary · 잠김(disabled) gray-200 바탕 + gray-300 테두리
 */
export function Checkbox({
  checked,
  onChange,
  disabled,
  accessibilityLabel,
}: {
  checked: boolean | "indeterminate";
  onChange?: (on: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const on = checked === true || checked === "indeterminate";
  const look = disabled
    ? { background: colors.gray[200], border: semantic.input, mark: semantic.card }
    : on
      ? { background: semantic.primary, border: semantic.primary, mark: semantic.card }
      : { background: semantic.card, border: semantic.subtleForeground, mark: semantic.card };
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: checked === "indeterminate" ? "mixed" : checked, disabled }}
      disabled={disabled}
      hitSlop={11}
      onPress={() => onChange?.(checked !== true)}
      style={[styles.checkbox, { backgroundColor: look.background, borderColor: look.border }]}
    >
      {checked === "indeterminate" ? (
        <MinusIcon size={16} color={look.mark} strokeWidth={3} />
      ) : checked ? (
        <CheckIcon size={16} color={look.mark} strokeWidth={3} />
      ) : null}
    </Pressable>
  );
}

/** 체크박스 + 글 한 줄 (약관·확인 문구) */
export function CheckboxRow({
  checked,
  onChange,
  disabled,
  children,
  style,
  textColor = semantic.secondaryText,
  textWeight = "regular",
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
  textWeight?: "regular" | "medium" | "bold";
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.checkboxRow, style]}
    >
      <Checkbox checked={checked} disabled={disabled} onChange={onChange} />
      {typeof children === "string" ? (
        <Text variant="body-lg" weight={textWeight} color={textColor} style={{ flex: 1 }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

/**
 * 작은 체크 글 (Figma v1.2 모름 체크): ✓ + '몰라요'. 켜면 파랑 semibold, 끄면 gray-500
 */
export function CheckToggle({
  checked,
  onChange,
  label = "몰라요",
  disabled,
  style,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const color = checked ? semantic.primary : semantic.mutedForeground;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [
        styles.checkToggle,
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}
    >
      <CheckIcon size={16} color={checked ? semantic.primary : semantic.subtleForeground} />
      <Text variant="body-lg" weight={checked ? "semibold" : "medium"} color={color}>
        {label}
      </Text>
    </Pressable>
  );
}

const SWITCH = { width: 44, height: 26, thumb: 22, inset: 2 } as const;

/** 스위치 (Figma 스위치 44×26). 켬 primary · 끔 gray-300, 비활성은 primary-100 · gray-200 */
export function Switch({
  checked,
  onChange,
  disabled,
  accessibilityLabel,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const [x] = useState(() => new Animated.Value(checked ? 1 : 0));
  useEffect(() => {
    Animated.timing(x, { toValue: checked ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  }, [checked, x]);
  const track = disabled
    ? checked
      ? colors.primary[100]
      : colors.gray[200]
    : checked
      ? semantic.primary
      : semantic.input;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={9}
      onPress={() => onChange(!checked)}
      style={[styles.switch, { backgroundColor: track }]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            transform: [
              {
                translateX: x.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SWITCH.inset, SWITCH.width - SWITCH.thumb - SWITCH.inset],
                }),
              },
            ],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldBox: {
    position: "relative",
    width: "100%",
    minHeight: 46,
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1.3,
    borderColor: semantic.input,
    backgroundColor: semantic.card,
    paddingHorizontal: 12,
  },
  underline: {
    minHeight: 40,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1.3,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
  },
  input: { minHeight: 44, paddingVertical: 0, paddingRight: 0 },
  suffix: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
  textarea: { minHeight: 70, justifyContent: "flex-start", paddingVertical: 10 },
  textareaInput: { minHeight: 48, padding: 0 },
  counterRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  fieldButton: { height: 46, flexDirection: "row", alignItems: "center", gap: 8 },
  fieldIcon: { flexShrink: 0 },
  checkbox: {
    width: 22,
    height: 22,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1.6,
  },
  checkboxRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 },
  checkToggle: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4, paddingRight: 0 },
  switch: {
    width: SWITCH.width,
    height: SWITCH.height,
    flexShrink: 0,
    justifyContent: "center",
    borderRadius: radius.full,
  },
  thumb: {
    width: SWITCH.thumb,
    height: SWITCH.thumb,
    borderRadius: radius.full,
    backgroundColor: semantic.card,
    shadowColor: colors.gray[950],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
