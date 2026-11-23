import { useEffect, useState } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { alpha, colors, semantic } from "./theme";

const SIZE = { small: 22, large: 30 } as const;

/**
 * 로딩 스피너 (Figma 로딩 스피너 22 · 30). 연한 고리 위로 파란 호가 돈다.
 * tone="inverse" 는 그라데이션·검정 버튼 위의 흰 스피너
 */
export function Spinner({
  style,
  label = "불러오는 중",
  size = "small",
  tone = "primary",
}: {
  style?: StyleProp<ViewStyle>;
  label?: string;
  size?: keyof typeof SIZE | number;
  tone?: "primary" | "inverse";
}) {
  const px = typeof size === "number" ? size : SIZE[size];
  const stroke = Math.max(2, Math.round(px * 0.12 * 10) / 10);
  const r = (px - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const track = tone === "inverse" ? alpha(colors.white, 0.3) : colors.gray[200];
  const arc = tone === "inverse" ? colors.white : semantic.primary;

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[
        { width: px, height: px },
        {
          transform: [
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
          ],
        },
        style,
      ]}
    >
      <Svg width={px} height={px}>
        <Circle cx={px / 2} cy={px / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          stroke={arc}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.28} ${circumference}`}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}
