import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import type { Intake, IntakeOption } from "@pabom/core/domain/care";
import { CheckIcon, ChevronRightIcon, PlusIcon } from "@/shared/ui/icons";
import { Text } from "@/shared/ui/text";
import { alpha, radius, semantic } from "@/shared/ui/theme";

/** 단계를 넘길 때 (Figma SMART_ANIMATE 0.3s ease-out) */
const STEP_MS = 300;

/** 시트 안 단계 하나. 처음 그릴 때 옆에서 살짝 밀려 들어온다 */
export function StepView({ children }: { children: ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: STEP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** 구분선 */
export function SheetDivider() {
  return <View style={styles.divider} />;
}

/** 오른쪽에 값이 있는 줄 (언제 · 먹이). onPress 가 없으면 보기만 */
export function DetailRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={typeof value === "string" ? `${label}, ${value}` : label}
      disabled={!onPress}
      onPress={onPress}
      style={styles.detailRow}
    >
      <Text variant="body-xl" color={semantic.secondaryText} style={{ flex: 1 }}>
        {label}
      </Text>
      {typeof value === "string" ? (
        <Text variant="body-xl" weight="medium">
          {value}
        </Text>
      ) : (
        value
      )}
      {onPress ? <ChevronRightIcon size={18} color={semantic.subtleForeground} /> : null}
    </Pressable>
  );
}

/** '+ 사진·메모 남기기'. 누르면 사진·메모 칸이 열린다 */
export function AddExtraLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.extraLink} hitSlop={6}>
      <PlusIcon size={18} color={semantic.mutedForeground} />
      <Text variant="body-xl" weight="medium" color={semantic.mutedForeground}>
        사진·메모 남기기
      </Text>
    </Pressable>
  );
}

/** 먹은 정도 큰 카드 이름 (부제는 먹이 묶음의 이름) */
const INTAKE_TITLE: Record<Intake, string> = {
  all: "먹었어요",
  partial: "조금 먹었어요",
  none: "안 먹었어요",
  unobserved: "확인 못 했어요",
};

/**
 * 먹었는지 큰 카드 (Figma R03 3 급여 · R02): 자주 고르는 답은 큰 카드, '확인 못 했어요'는 아래 낮은 칸.
 * 고른 카드는 파란 테두리. 다시 누르면 고름이 풀린다
 */
export function IntakeChoice({
  options,
  value,
  onChange,
}: {
  options: readonly IntakeOption[];
  value: Intake | null;
  onChange: (value: Intake | null) => void;
}) {
  const main = options.filter((o) => o.value !== "unobserved");
  const unobserved = options.find((o) => o.value === "unobserved");
  const toggle = (next: Intake) => onChange(value === next ? null : next);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="먹은 정도" style={{ gap: 8 }}>
      <View style={styles.cards}>
        {main.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => toggle(option.value)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <Text
                variant="body-xl"
                weight="bold"
                align="center"
                color={selected ? semantic.primary : semantic.foreground}
              >
                {INTAKE_TITLE[option.value]}
              </Text>
              <Text
                variant="body-md"
                align="center"
                color={selected ? semantic.primary : semantic.subtleForeground}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {unobserved ? (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: value === "unobserved" }}
          onPress={() => toggle("unobserved")}
          style={[styles.low, value === "unobserved" && styles.cardSelected]}
        >
          <Text
            variant="body-xl"
            weight="medium"
            color={value === "unobserved" ? semantic.primary : semantic.secondaryText}
          >
            {INTAKE_TITLE.unobserved}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"] as const;

/** 숫자 키패드에서 한 글자를 넣은 결과. 소수점은 하나, 소수 한 자리, 정수 네 자리까지 */
export const pressKey = (current: string, key: (typeof KEYS)[number]) => {
  if (key === "⌫") return current.slice(0, -1);
  if (key === ".") return current.includes(".") ? current : `${current || "0"}.`;
  const [int = "", frac] = current.split(".");
  if (frac !== undefined) return frac.length >= 1 ? current : `${current}${key}`;
  if (int === "0") return key;
  return int.length >= 4 ? current : `${current}${key}`;
};

/** 몸무게 큰 숫자 + 커서 + g (Figma R03 2 체중) */
export function WeightDisplay({ value, hint }: { value: string; hint?: string | null }) {
  return (
    <View style={styles.weight} accessibilityLabel={`몸무게 ${value || "0"}g`}>
      <View style={styles.weightRow}>
        <Text variant="title-xl" color={value ? semantic.foreground : semantic.disabledForeground}>
          {value || "0.0"}
        </Text>
        <View style={styles.cursor} />
        <Text variant="title-sm" weight="semibold" color={semantic.subtleForeground}>
          g
        </Text>
      </View>
      {hint ? (
        <Text variant="body-lg" color={semantic.subtleForeground}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** 숫자 키패드 (시스템 키보드 대신) */
export function Keypad({ onKey }: { onKey: (key: (typeof KEYS)[number]) => void }) {
  return (
    <View style={styles.keypad}>
      {KEYS.map((key) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={key === "⌫" ? "지우기" : key === "." ? "소수점" : key}
          onPress={() => onKey(key)}
          style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
        >
          <Text variant="title-sm" weight="medium">
            {key}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** 둥근 체크 (Figma '체크': 회색 동그라미 · 고르면 파랑) */
export function CheckDot({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.dot, checked && { backgroundColor: semantic.primary }]}>
      <CheckIcon size={16} color={semantic.card} strokeWidth={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { height: 1, backgroundColor: semantic.border },
  detailRow: { minHeight: 49, flexDirection: "row", alignItems: "center", gap: 6 },
  extraLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingTop: 6,
    paddingBottom: 18,
  },
  cards: { flexDirection: "row", gap: 10 },
  card: {
    flex: 1,
    minHeight: 94,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: radius.xl,
    backgroundColor: semantic.secondary,
  },
  cardSelected: {
    borderColor: semantic.primary,
    backgroundColor: alpha(semantic.primary, 0.1),
  },
  low: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: radius.lg,
    backgroundColor: semantic.secondary,
  },
  weight: { gap: 6, paddingBottom: 18 },
  weightRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cursor: { width: 2, height: 36, backgroundColor: semantic.primary },
  keypad: { flexDirection: "row", flexWrap: "wrap", paddingTop: 8 },
  key: { width: "33.333%", alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  keyPressed: { backgroundColor: semantic.muted, borderRadius: radius.lg },
  dot: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: semantic.input,
  },
});
