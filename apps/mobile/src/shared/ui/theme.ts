import { colors, radius, shadows, spacing, type ShadowToken } from "@pabom/core/design/tokens";
import type { ViewStyle } from "react-native";

/**
 * 의미 색. 웹 apps/web/src/app/globals.css 의 :root 와 같은 값을 쓴다.
 * 팔레트 값은 @pabom/core/design/tokens 에서만 가져온다
 */
export const semantic = {
  background: colors.white,
  foreground: colors.gray[900],
  secondaryText: colors.gray[700],
  mutedForeground: colors.gray[500],
  subtleForeground: colors.gray[400],
  disabledForeground: colors.gray[300],
  primary: colors.primary[500],
  primaryForeground: colors.white,
  primarySoft: colors.primary[50],
  brandFrom: colors.sub[500],
  brand: colors.primary[500],
  secondary: colors.gray[100],
  muted: colors.gray[100],
  destructive: colors.red[500],
  destructiveSoft: colors.red[50],
  success: colors.green[500],
  successSoft: colors.green[50],
  warning: colors.yellow[500],
  warningSoft: colors.yellow[50],
  info: colors.blue[500],
  infoSoft: colors.blue[50],
  border: colors.gray[200],
  input: colors.gray[300],
  ring: colors.primary[500],
  placeholder: colors.gray[100],
  inverse: colors.gray[900],
  inverseForeground: colors.white,
  kakao: colors.kakao.background,
  kakaoForeground: colors.kakao.foreground,
  shell: colors.gray[100],
  /** 시트·창 뒤 어두운 막 */
  overlay: "rgba(0, 0, 0, 0.4)",
} as const;

/** Pretendard 굵기별 폰트 이름 (app/_layout.tsx 에서 로드) */
export const fontFamily = {
  regular: "Pretendard-Regular",
  medium: "Pretendard-Medium",
  semibold: "Pretendard-SemiBold",
  bold: "Pretendard-Bold",
} as const;

/** 16% 색 (Figma Badge 바탕) */
export const alpha = (hex: string, opacity: number) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/** 디자인 토큰 그림자 → RN 스타일 (iOS shadow* · Android elevation) */
export const toNativeShadow = (shadow: ShadowToken): ViewStyle => ({
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: shadow.offsetY },
  shadowRadius: shadow.blur / 2,
  shadowOpacity: shadow.opacity,
  elevation: shadow.elevation,
});

export { colors, radius, shadows, spacing };
