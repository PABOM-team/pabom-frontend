import type { ReactNode } from "react";
import {
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
import { radius, semantic } from "./theme";

/**
 * 칸 제목 + 내용 + 도움말/오류 (Figma Field: Label · text field · help message).
 * 제목은 body-xl medium / gray-700, 도움말은 body-md medium / gray-400 · 오류 red · 성공 green
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
    <View style={[{ gap: 8 }, style]}>
      {label ? (
        <Text variant="body-xl" weight="medium" color={semantic.secondaryText}>
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

/** 칸 아래 도움말 (Figma help message) */
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
        : semantic.subtleForeground;
  return (
    <Text variant="body-md" weight="medium" color={color} align={align} style={style}>
      {children}
    </Text>
  );
}

/**
 * 입력 칸 (Figma text field): 44px · 모서리 8 · gray-300 테두리 · body-lg medium.
 * focus primary · 오류 red · 성공 green · 비활성 gray-100 바탕 + gray-300 글자
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
  suffix?: ReactNode;
  invalid?: boolean;
  success?: boolean;
  /** underline: 밑줄만 있는 칸 (Figma text field/기본, 40px) */
  variant?: "box" | "underline";
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <FocusBox
      invalid={invalid}
      success={success}
      disabled={!editable}
      variant={variant}
      style={containerStyle}
    >
      {({ setFocused }) => (
        <>
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
              textStyles["body-lg"],
              weightStyle("medium"),
              {
                color: !editable
                  ? semantic.disabledForeground
                  : invalid
                    ? semantic.destructive
                    : semantic.foreground,
              },
              suffix ? { paddingRight: 48 } : null,
              style,
            ]}
          />
          {suffix ? (
            <View style={styles.suffix} pointerEvents="none">
              {typeof suffix === "string" ? (
                <Text variant="body-lg" color={semantic.subtleForeground}>
                  {suffix}
                </Text>
              ) : (
                suffix
              )}
            </View>
          ) : null}
        </>
      )}
    </FocusBox>
  );
}

import { useState } from "react";

function FocusBox({
  children,
  invalid,
  success,
  disabled,
  variant,
  style,
}: {
  children: (ctx: { setFocused: (on: boolean) => void }) => ReactNode;
  invalid?: boolean;
  success?: boolean;
  disabled?: boolean;
  variant: "box" | "underline";
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = invalid
    ? semantic.destructive
    : success
      ? semantic.success
      : focused
        ? semantic.primary
        : semantic.input;
  return (
    <View
      style={[
        styles.fieldBox,
        variant === "underline" && styles.underline,
        { borderColor },
        disabled && { backgroundColor: semantic.muted },
        style,
      ]}
    >
      {children({ setFocused })}
    </View>
  );
}

/** 여러 줄 입력 + 글자 수. 글자 수를 다 채우면 칸과 글자 수를 빨갛게 (C2-3) */
export function Textarea({
  value,
  maxLength,
  style,
  ...props
}: Omit<TextInputProps, "style" | "value" | "maxLength"> & {
  value: string;
  maxLength: number;
  style?: StyleProp<ViewStyle>;
}) {
  const length = value.length;
  const full = length >= maxLength;
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <View
        style={[
          styles.fieldBox,
          styles.textarea,
          {
            borderColor: full ? semantic.destructive : focused ? semantic.primary : semantic.input,
          },
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, styles.textareaInput, textStyles["body-lg"], weightStyle("medium")]}
        />
      </View>
      <HelpMessage tone={full ? "error" : "default"} align="right" style={{ marginTop: 4 }}>
        {length} / {maxLength}자
      </HelpMessage>
    </View>
  );
}

/** 칸처럼 생긴 버튼 (날짜 고르기·모프 고르기 등) */
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
        invalid && { borderColor: semantic.destructive },
        disabled && { backgroundColor: semantic.muted },
        pressed && !disabled && { borderColor: semantic.primary },
        style,
      ]}
    >
      <Text
        variant="body-lg"
        weight="medium"
        numberOfLines={1}
        color={
          disabled
            ? semantic.disabledForeground
            : children
              ? semantic.foreground
              : semantic.subtleForeground
        }
        style={{ flex: 1 }}
      >
        {children || placeholder}
      </Text>
      {icon ? <View style={{ flexShrink: 0 }}>{icon}</View> : null}
    </Pressable>
  );
}

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
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: checked === "indeterminate" ? "mixed" : checked, disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => onChange?.(checked !== true)}
      style={[
        styles.checkbox,
        on && {
          borderColor: disabled ? semantic.input : semantic.primary,
          backgroundColor: disabled ? semantic.input : semantic.primary,
        },
      ]}
    >
      {checked === "indeterminate" ? (
        <MinusIcon size={16} color="#ffffff" strokeWidth={3} />
      ) : checked ? (
        <CheckIcon size={16} color="#ffffff" strokeWidth={3} />
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
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!checked)}
      style={[
        styles.switch,
        { backgroundColor: checked ? semantic.primary : semantic.input },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={[styles.thumb, { transform: [{ translateX: checked ? 24 : 4 }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldBox: {
    position: "relative",
    width: "100%",
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: semantic.input,
    backgroundColor: semantic.background,
    paddingHorizontal: 12,
  },
  underline: { minHeight: 40, borderRadius: 0, borderWidth: 0, borderBottomWidth: 1 },
  input: { minHeight: 42, paddingVertical: 0 },
  suffix: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
  textarea: { minHeight: 68, paddingVertical: 10 },
  textareaInput: { minHeight: 48 },
  fieldButton: { height: 44, flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 24,
    height: 24,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: semantic.input,
    backgroundColor: semantic.background,
  },
  checkboxRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 },
  switch: {
    width: 48,
    height: 28,
    flexShrink: 0,
    justifyContent: "center",
    borderRadius: radius.full,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
});
