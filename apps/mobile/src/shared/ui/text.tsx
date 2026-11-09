import { toNativeTextStyle, typography } from "@pabom/core/design/tokens";
import {
  Text as RNText,
  StyleSheet,
  type TextProps as RNTextProps,
  type TextStyle,
} from "react-native";
import { fontFamily, semantic } from "./theme";

export type TextVariant =
  | "title-xl"
  | "title-lg"
  | "title-md"
  | "title-sm"
  | "title-xs"
  | "body-xl"
  | "body-lg"
  | "body-md"
  | "body-sm";

export type TextWeight = "regular" | "medium" | "semibold" | "bold";

const WEIGHT: Record<TextWeight, TextStyle> = {
  regular: { fontFamily: fontFamily.regular, fontWeight: "400" },
  medium: { fontFamily: fontFamily.medium, fontWeight: "500" },
  semibold: { fontFamily: fontFamily.semibold, fontWeight: "600" },
  bold: { fontFamily: fontFamily.bold, fontWeight: "700" },
};

const variantStyle = (variant: TextVariant): TextStyle => {
  const [group, size] = variant.split("-") as ["title" | "body", string];
  const token =
    group === "title"
      ? typography.title[size as keyof typeof typography.title]
      : typography.body[size as keyof typeof typography.body];
  const { fontWeight: _fontWeight, ...rest } = toNativeTextStyle(token);
  return rest;
};

/** 변형별 스타일을 한 번만 만든다 */
export const textStyles = StyleSheet.create(
  Object.fromEntries(
    (
      [
        "title-xl",
        "title-lg",
        "title-md",
        "title-sm",
        "title-xs",
        "body-xl",
        "body-lg",
        "body-md",
        "body-sm",
      ] as const
    ).map((v) => [v, variantStyle(v)]),
  ) as Record<TextVariant, TextStyle>,
);

export type TextProps = RNTextProps & {
  /** 타이포 토큰. 기본 body-lg. title-* 는 항상 bold */
  variant?: TextVariant;
  weight?: TextWeight;
  color?: string;
  align?: TextStyle["textAlign"];
};

/** 디자인 토큰 타이포가 적용된 글자. 색 기본값은 글자색(gray-900) */
export function Text({
  variant = "body-lg",
  weight,
  color = semantic.foreground,
  align,
  style,
  ...props
}: TextProps) {
  const resolvedWeight: TextWeight = weight ?? (variant.startsWith("title") ? "bold" : "regular");
  return (
    <RNText
      {...props}
      style={[
        textStyles[variant],
        WEIGHT[resolvedWeight],
        { color },
        align && { textAlign: align },
        style,
      ]}
    />
  );
}

export const weightStyle = (weight: TextWeight) => WEIGHT[weight];
