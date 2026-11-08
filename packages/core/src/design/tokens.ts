/**
 * 파봄 디자인 토큰 (Figma 'Design | 디자인 시스템 최종').
 * 팔레트·타이포·반경·그림자의 **값은 여기서만** 정한다.
 * - 웹: `pnpm --filter web tokens:build`가 이 파일로 `apps/web/src/app/tokens.css`(Tailwind @theme)를 만든다
 * - 앱: StyleSheet에서 `colors.primary[500]`, `typography.title.md` 처럼 바로 쓴다
 * 의미 색(primary·border·muted 등)과 다크 모드 매핑은 플랫폼마다 다르게 그려도 되므로 각 앱에 둔다.
 */

export const colors = {
  primary: {
    50: "#eaf5ff",
    100: "#bddfff",
    200: "#9dd0ff",
    300: "#70bbff",
    400: "#54adff",
    500: "#2999ff",
    600: "#258be8",
    700: "#1d6db5",
    800: "#17548c",
    900: "#11406b",
  },
  sub: {
    50: "#f0f5ff",
    100: "#d0e1ff",
    200: "#b9d2ff",
    300: "#98beff",
    400: "#85b1ff",
    500: "#669eff",
    600: "#5d90e8",
    700: "#4870b5",
    800: "#38578c",
    900: "#2b426b",
  },
  blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bedbff",
    300: "#8ec5ff",
    400: "#51a2ff",
    500: "#2b7fff",
    600: "#155dfc",
    700: "#1447e6",
    800: "#193cb8",
    900: "#1c398e",
    950: "#162456",
  },
  red: {
    50: "#fef2f2",
    100: "#ffe2e2",
    200: "#ffc9c9",
    300: "#ffa2a2",
    400: "#ff6467",
    500: "#fb2c36",
    600: "#e7000b",
    700: "#c10007",
    800: "#9f0712",
    900: "#82181a",
    950: "#460809",
  },
  green: {
    50: "#e6faee",
    100: "#dcfce7",
    200: "#b9f8cf",
    300: "#7bf1a8",
    400: "#05df72",
    500: "#00c950",
    600: "#00a63e",
    700: "#008236",
    800: "#016630",
    900: "#0d542b",
    950: "#032e15",
  },
  yellow: {
    50: "#fefce8",
    100: "#fef9c2",
    200: "#fff085",
    300: "#ffdf20",
    400: "#fdc700",
    500: "#f0b100",
    600: "#d08700",
    700: "#a65f00",
    800: "#894b00",
    900: "#733e0a",
    950: "#432004",
  },
  gray: {
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#9f9fa9",
    500: "#71717b",
    600: "#52525c",
    700: "#3f3f47",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
  /** 소셜 로그인 버튼 */
  kakao: { background: "#fee500", foreground: "#191919" },
  white: "#ffffff",
} as const;

export type ColorScale = keyof Omit<typeof colors, "kakao" | "white">;

/** 글자 크기(px)·행간(배수)·자간(em). title은 항상 bold(700), body는 굵기를 따로 고른다 */
export const typography = {
  title: {
    xl: { fontSize: 36, lineHeight: 1.2, letterSpacing: -0.03, fontWeight: 700 },
    lg: { fontSize: 32, lineHeight: 1.2, letterSpacing: -0.03, fontWeight: 700 },
    md: { fontSize: 28, lineHeight: 1.2, letterSpacing: -0.03, fontWeight: 700 },
    sm: { fontSize: 24, lineHeight: 1.2, letterSpacing: -0.03, fontWeight: 700 },
    xs: { fontSize: 20, lineHeight: 1.2, letterSpacing: -0.03, fontWeight: 700 },
  },
  body: {
    xl: { fontSize: 16, lineHeight: 1.3, letterSpacing: -0.03 },
    lg: { fontSize: 14, lineHeight: 1.35, letterSpacing: -0.03 },
    md: { fontSize: 12, lineHeight: 1.35, letterSpacing: -0.03 },
    sm: { fontSize: 10, lineHeight: 1.35, letterSpacing: -0.03 },
  },
} as const;

export type TextStyleToken = {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight?: number;
};

/** React Native TextStyle 로 바꾼다 (행간·자간을 px로). 웹은 tokens.css의 text-title-* 클래스를 쓴다 */
export function toNativeTextStyle(token: TextStyleToken) {
  return {
    fontSize: token.fontSize,
    lineHeight: Math.round(token.fontSize * token.lineHeight),
    letterSpacing: token.fontSize * token.letterSpacing,
    ...(token.fontWeight ? { fontWeight: String(token.fontWeight) as "700" } : {}),
  };
}

/** 반경(px): 0 · 4 · 6 · 8 · 12 · 16 · 20 · circle */
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  full: 9999,
} as const;

/** 그림자. 웹은 CSS box-shadow, 앱은 shadowOffset·shadowRadius·shadowOpacity(iOS)·elevation(Android) */
export const shadows = {
  xs: { offsetY: 2, blur: 5, spread: 0, opacity: 0.1, elevation: 1 },
  sm: { offsetY: 3, blur: 10, spread: 0, opacity: 0.12, elevation: 2 },
  md: { offsetY: 4, blur: 15, spread: 1, opacity: 0.15, elevation: 4 },
  lg: { offsetY: 20, blur: 100, spread: 2, opacity: 0.15, elevation: 8 },
} as const;

export type ShadowToken = (typeof shadows)[keyof typeof shadows];

export function toCssShadow(shadow: ShadowToken) {
  return `0 ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px rgb(0 0 0 / ${shadow.opacity})`;
}

/** 모바일 375 기준 화면 좌우 여백 */
export const spacing = {
  gutter: 20,
} as const;
