import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { semantic } from "@/shared/ui/theme";

/** 게코 발자국 하나 (Figma 파봄 로딩 · 발자국, 18×16.6) */
const PAW_PATH =
  "M7.51181 14.5217C6.87286 13.2986 6.03001 13.3162 5.46735 13.1239C4.95625 12.9491 4.67523 12.7744 2.01759 12.7744C-0.640049 12.7744 -0.111953 10.6774 0.4843 9.62896C2.32425 7.67183 4.48784 9.04646 5.33964 9.97842C6.77065 11.2366 7.12851 10.2697 7.12857 9.62896C7.12857 8.52222 6.82191 6.16895 5.59528 5.60976C4.06198 4.91077 4.04549 2.97552 3.93413 2.63898C3.817 2.28503 3.76704 0.181709 5.72297 0.0176028C7.20036 -0.106354 7.51181 2.87173 7.51181 4.73575C7.51181 6.69291 8.95992 7.76469 9.68397 8.05594C10.8084 8.89472 11.4302 4.79412 11.6006 2.63898C12.3161 -0.995745 14.3417 -0.137372 15.0505 0.891515C16.2056 2.56821 14.6672 5.26017 13.9005 5.78441C12.265 6.90279 11.9413 8.34736 11.9839 8.92985C11.8817 12.984 14.3264 11.6675 15.5616 10.5026C16.1174 9.97833 16.4834 9.84977 16.8667 9.79157C17.4801 9.65177 17.9041 10.5027 17.9893 11.0269C18.0915 11.7259 17.4356 12.8325 17.0949 13.2985C16.1749 14.4167 14.582 13.7644 13.9005 13.2985C12.9806 13.0188 12.2395 14.2305 11.9839 14.8714C9.8373 18.2265 8.10809 16.0362 7.51181 14.5217Z";

const PAW = { width: 18, height: 16.64 } as const;
/** 로딩 틀 76×30 안의 발자국 세 개 가운데 자리 (왼쪽 아래 · 가운데 위 · 오른쪽 아래) */
const PRINTS = [
  { x: 13, y: 20.5 },
  { x: 38, y: 10 },
  { x: 63, y: 20.5 },
] as const;
/** 걸음 1~4의 발자국별 진하기 (Figma 파봄 로딩 변형). 디딘 발자국만 크다 */
const STEPS = [
  [1, 0.12, 0.12],
  [0.35, 1, 0.12],
  [0.15, 0.35, 1],
  [0.12, 0.15, 0.35],
] as const;
/** 걸음 사이 0.12s 쉬고 0.28s 동안 옮긴다 (AFTER_TIMEOUT 0.12 · SMART_ANIMATE 0.28 ease-out) */
const STEP_MS = 400;
const MOVE_MS = 280;
const SMALL = 14.76 / 18;

function PawPrint({ size }: { size: number }) {
  return (
    <Svg width={PAW.width * size} height={PAW.height * size} viewBox="0 0 18 16.64">
      <Defs>
        <LinearGradient id="paw" x1="9" y1="0" x2="9" y2="16.64" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={semantic.brandFrom} />
          <Stop offset="1" stopColor={semantic.brand} />
        </LinearGradient>
      </Defs>
      <Path d={PAW_PATH} fill="url(#paw)" />
    </Svg>
  );
}

/**
 * 파봄 로딩 (Figma 추가 부품 · 파봄 로딩, 색=파랑): 발자국 세 개가 차례로 디디며 걷는다.
 * scale 1.8 이 로그인 처리 중(A02)의 크기(136.8×54)
 */
export function PawLoader({ scale = 1.8 }: { scale?: number }) {
  const [step, setStep] = useState(0);
  const [anims] = useState(() =>
    STEPS[0].map((opacity) => ({
      opacity: new Animated.Value(opacity),
      size: new Animated.Value(opacity === 1 ? 1 : SMALL),
    })),
  );

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const target = STEPS[step]!;
    const animation = Animated.parallel(
      anims.flatMap(({ opacity, size }, i) => [
        Animated.timing(opacity, {
          toValue: target[i]!,
          duration: MOVE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(size, {
          toValue: target[i] === 1 ? 1 : SMALL,
          duration: MOVE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [step, anims]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="불러오는 중"
      style={{ width: 76 * scale, height: 30 * scale }}
    >
      {PRINTS.map((print, i) => (
        <Animated.View
          key={print.x}
          style={[
            styles.print,
            {
              left: (print.x - PAW.width / 2) * scale,
              top: (print.y - PAW.height / 2) * scale,
              opacity: anims[i]!.opacity,
              transform: [{ rotate: "-90deg" }, { scale: anims[i]!.size }],
            },
          ]}
        >
          <PawPrint size={scale} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  print: { position: "absolute" },
});
