import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Text } from "@/shared/ui/text";
import { alpha, radius, semantic, shadows, toNativeShadow } from "@/shared/ui/theme";
import heroGecko from "../../../assets/images/welcome-hero-gecko.png";

const HERO = { width: 330, height: 280 } as const;
const CIRCLE = 330;
/** 캐릭터 자리 (Figma A01 히어로 · 숨1) */
const CHARACTER = { left: 46, top: 41.91, width: 250, height: 252.09 } as const;
/** 숨2에서 캐릭터가 7px 떠오르고 원이 0.82로 옅어진다 */
const BREATH_RISE = -7;
const BREATH_MS = 1600;

/**
 * A01 히어로: 원 배경 위 3D 게코.
 * - 등장: 원이 커지며 나타나고 캐릭터가 뒤따라 보인다 (상태=등장0 → 등장1 → 숨1)
 * - 숨: 1.6s ease-in-out 으로 숨1 ↔ 숨2 를 오간다
 * - 누르면 '반가워요!' 말풍선과 함께 통통 튀었다가(BOUNCY 0.6s) 1.1s 뒤 숨으로 돌아온다
 */
export function WelcomeHero() {
  const [enter] = useState(() => new Animated.Value(0));
  const [breath] = useState(() => new Animated.Value(0));
  const [react] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(enter, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(breath, {
            toValue: 1,
            duration: BREATH_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breath, {
            toValue: 0,
            duration: BREATH_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [enter, breath]);

  const greet = () =>
    Animated.sequence([
      Animated.spring(react, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      Animated.delay(1100),
      Animated.timing(react, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

  const circleOpacity = Animated.multiply(
    enter,
    breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }),
  );
  const characterOpacity = enter.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  return (
    <View style={styles.hero}>
      <Animated.View
        style={[
          styles.circle,
          {
            opacity: circleOpacity,
            transform: [
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[alpha(semantic.card, 0.55), alpha(semantic.card, 0)]}
          locations={[0, 0.85]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="파봄 게코"
        accessibilityHint="누르면 인사해요"
        onPress={greet}
        style={styles.character}
      >
        <Animated.View
          style={{
            flex: 1,
            opacity: characterOpacity,
            transform: [
              {
                translateY: breath.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, BREATH_RISE],
                }),
              },
              { translateY: react.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) },
              { scaleX: react.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
              { scaleY: react.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
            ],
          }}
        >
          <Image source={heroGecko} alt="" resizeMode="cover" style={styles.fill} />
        </Animated.View>
      </Pressable>
      {/* 캐릭터 아래쪽을 바탕색으로 흐리게 녹인다 */}
      <LinearGradient
        pointerEvents="none"
        colors={[alpha(semantic.brand, 0), semantic.brand]}
        style={styles.fade}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bubble,
          toNativeShadow(shadows.xs),
          {
            opacity: react,
            transform: [
              { scale: react.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            ],
          },
        ]}
      >
        <Text variant="body-lg" weight="bold" color={semantic.primary}>
          반가워요!
        </Text>
      </Animated.View>
    </View>
  );
}

/** A01 발자국 걷기의 발자국 세 개 (310.88×101.16 틀 기준, 기울기 포함) */
const FOOTPRINT_PATHS = [
  "M20.1931 56.7933C18.4808 54.8176 16.9294 55.239 15.8052 55.1414C14.7841 55.0527 14.1885 54.8579 9.27275 56.0835C4.35699 57.3092 4.42425 53.1731 5.07235 50.9519C7.62674 46.4704 12.2249 48.0243 14.2047 49.3614C17.3973 51.037 17.6399 49.0771 17.362 47.8877C16.882 45.8333 15.294 41.6064 12.7826 41.134C9.64336 40.5436 8.77344 36.9588 8.42147 36.3855C8.0513 35.7825 7.04657 31.9011 10.5932 30.6945C13.2721 29.783 15.14 35.1676 15.9485 38.6278C16.7974 42.2608 19.9408 43.5825 21.4064 43.7892C23.85 44.8277 23.2216 36.929 22.6019 32.8499C22.3488 25.7728 26.4677 26.4321 28.2251 28.0151C31.089 30.5948 29.411 36.3014 28.2203 37.6281C25.6803 40.4584 25.7081 43.2892 26.0396 44.3508C27.609 51.9236 31.56 48.3524 33.3393 45.6203C34.14 44.3908 34.7612 43.9834 35.445 43.6986C36.5188 43.1562 37.6722 44.5402 38.0572 45.4741C38.5494 46.7245 37.8162 49.0812 37.3881 50.1032C36.1715 52.6033 32.9422 52.127 31.4796 51.5764C29.6566 51.4814 28.8114 54.0725 28.6167 55.38C26.1015 62.598 21.953 59.3297 20.1931 56.7933Z",
  "M249.423 50.125C248.759 45.8971 246.24 45.1365 244.765 44.0259C243.424 43.0171 242.766 42.2301 234.88 39.6675C226.993 37.105 230.674 31.422 233.5 28.9009C240.933 24.8956 245.968 31.041 247.556 34.6144C250.535 39.7095 252.571 37.1994 253.217 35.3074C254.333 32.0392 255.795 24.7944 252.719 21.9604C248.873 18.4179 250.775 12.6872 250.784 11.5861C250.793 10.4279 252.765 4.16873 258.735 5.57007C263.244 6.62856 261.166 15.723 259.287 21.2274C257.314 27.0069 260.531 31.5681 262.386 33.1263C264.878 36.6873 270.856 25.178 273.534 18.9782C279.322 8.93493 284.467 13.4227 285.534 17.1445C287.272 23.2095 279.993 29.6754 277.189 30.4842C271.208 32.2097 268.791 36.1634 268.331 37.9245C263.941 49.7976 272.523 48.2675 277.362 46.0184C279.54 45.0062 280.756 44.9795 281.952 45.1773C283.913 45.3558 284.314 48.2775 284.038 49.9077C283.637 52.0703 280.575 54.7057 279.094 55.753C275.237 58.1681 271.167 54.706 269.615 52.673C267.166 50.9599 263.746 53.8236 262.341 55.4696C252.589 63.3074 249.665 55.1723 249.423 50.125Z",
  "M289.827 99.7935C289.298 97.7875 288.046 97.5455 287.279 97.0831C286.582 96.663 286.226 96.3161 282.296 95.4711C278.365 94.6262 279.859 91.7032 281.097 90.3473C284.483 88.0474 287.216 90.7615 288.159 92.406C289.848 94.7155 290.705 93.4041 290.923 92.4596C291.299 90.8283 291.645 87.262 290.021 86.0478C287.991 84.53 288.624 81.6721 288.574 81.1406C288.521 80.5817 289.162 77.4654 292.11 77.8454C294.337 78.1323 293.786 82.6211 293.152 85.3688C292.487 88.2537 294.265 90.2939 295.237 90.9534C296.615 92.5472 298.928 86.7005 299.912 83.578C302.205 78.4478 304.909 80.357 305.608 82.099C306.746 84.9377 303.556 88.4166 302.244 88.9456C299.446 90.0742 298.476 92.1006 298.341 92.9728C296.813 98.9161 300.875 97.7529 303.098 96.4284C304.098 95.8324 304.683 95.7592 305.27 95.7953C306.224 95.7842 306.562 97.1733 306.51 97.9732C306.424 99.036 305.078 100.459 304.415 101.037C302.675 102.393 300.541 100.925 299.691 100.022C298.426 99.3168 296.918 100.867 296.322 101.731C292.008 105.994 290.195 102.216 289.827 99.7935Z",
] as const;
const WALK = { width: 310.88, height: 101.16 } as const;
/** 걸음=0~4 의 발자국별 진하기 (Figma A01 발자국 걷기) */
const WALK_STEPS = [
  [0, 0, 0],
  [0.15, 0, 0],
  [0.06, 0.22, 0],
  [0, 0.088, 0.15],
  [0, 0, 0.06],
] as const;

/**
 * A01 발자국 걷기: 흰 발자국이 화면을 가로질러 찍혔다 사라진다.
 * 걸음=0 에서 0.6s, 그 뒤로는 0.25s 쉬고 0.45s ease-out 으로 다음 걸음 (AFTER_TIMEOUT · SMART_ANIMATE)
 */
export function FootprintWalk({ style }: { style?: object }) {
  const [values] = useState(() => FOOTPRINT_PATHS.map(() => new Animated.Value(0)));

  useEffect(() => {
    const moveTo = (step: readonly number[]) =>
      Animated.parallel(
        values.map((value, i) =>
          Animated.timing(value, {
            toValue: step[i]!,
            duration: 450,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ),
      );
    const [, ...rest] = WALK_STEPS;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        ...[...rest, WALK_STEPS[0]].flatMap((step, i) =>
          i === 0 ? [moveTo(step)] : [Animated.delay(250), moveTo(step)],
        ),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [values]);

  return (
    <View pointerEvents="none" style={[{ width: WALK.width, height: WALK.height }, style]}>
      {FOOTPRINT_PATHS.map((d, i) => (
        <Animated.View
          key={d.slice(0, 12)}
          style={[StyleSheet.absoluteFill, { opacity: values[i] }]}
        >
          <Svg width={WALK.width} height={WALK.height} viewBox={`0 0 ${WALK.width} ${WALK.height}`}>
            <Path d={d} fill={semantic.primaryForeground} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: HERO.width, height: HERO.height, overflow: "hidden" },
  circle: {
    position: "absolute",
    left: 0,
    top: 0,
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow: "hidden",
  },
  character: { position: "absolute", ...CHARACTER },
  fill: { width: "100%", height: "100%" },
  fade: { position: "absolute", left: 0, top: 239.68, width: 331, height: 41 },
  bubble: {
    position: "absolute",
    left: 200,
    top: 26,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.xl,
    backgroundColor: semantic.card,
  },
});
