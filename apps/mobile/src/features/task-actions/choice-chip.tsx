import { Pressable, StyleSheet } from "react-native";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";

/**
 * 시트 안 고르기 칩 (Figma H03 '칩'): 44px 알약, 고르면 검정 바탕 흰 글자, 아니면 회색 바탕.
 * 공통 Chip 은 32px 상태 칩이라 미루기·건너뛰기 시트의 큰 칩을 여기서 그린다
 */
export function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
      ]}
    >
      <Text
        variant="body-xl"
        weight={selected ? "semibold" : "medium"}
        color={selected ? semantic.inverseForeground : semantic.foreground}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 44,
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: semantic.muted,
    paddingHorizontal: 20,
  },
  selected: { backgroundColor: semantic.inverse },
  pressed: { backgroundColor: semantic.border },
});
