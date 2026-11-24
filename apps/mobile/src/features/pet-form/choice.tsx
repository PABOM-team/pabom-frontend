import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, useWindowDimensions } from "react-native";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";

/** 칸 이름 (Figma 라벨: body-lg medium · text/secondary) */
export function FieldLabel({ children }: { children: string }) {
  return (
    <Text variant="body-lg" weight="medium" color={semantic.secondaryText}>
      {children}
    </Text>
  );
}

/** 섹션 이름 (Figma 섹션 라벨: body-md semibold · text/secondary) */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="body-md" weight="semibold" color={semantic.secondaryText}>
      {children}
    </Text>
  );
}

/**
 * 단계를 옮길 때 내용이 옆에서 밀려 들어온다 (Figma PUSH 0.35s ease-in-out).
 * direction 1이면 오른쪽에서(다음), -1이면 왼쪽에서(이전)
 */
export function PushIn({
  stepKey,
  direction,
  children,
}: {
  stepKey: string | number;
  direction: 1 | -1;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(1));

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 350,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [stepKey, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
        transform: [
          {
            translateX: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [direction * width * 0.3, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
