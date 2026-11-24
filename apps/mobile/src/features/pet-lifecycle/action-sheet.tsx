import { Pressable, StyleSheet } from "react-native";
import { BottomSheet } from "@/shared/ui/bottom-sheet";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";

export type ActionSheetItem = {
  label: string;
  description?: string;
  tone?: "default" | "danger";
  onSelect: () => void;
};

/**
 * 아래에서 올라오는 고르기 시트 (Figma P04 '⋯ 메뉴'): 손잡이 · 큰 줄(제목 + 설명) · 닫기.
 * 고른 항목은 바로 실행한다. 이 시트가 내려가는 동안 다음 창이 그 위로 뜬다
 */
export function ActionSheet({
  open,
  onOpenChange,
  items,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ActionSheetItem[];
  /** 읽기 프로그램용 이름 */
  label: string;
}) {
  const close = () => onOpenChange(false);

  return (
    <BottomSheet
      open={open}
      onRequestClose={close}
      accessibilityLabel={label}
      contentStyle={styles.content}
    >
      {items.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          onPress={() => {
            close();
            item.onSelect();
          }}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <Text
            variant="body-xl"
            weight="semibold"
            color={item.tone === "danger" ? semantic.destructive : semantic.foreground}
          >
            {item.label}
          </Text>
          {item.description ? (
            <Text variant="body-md" color={semantic.subtleForeground}>
              {item.description}
            </Text>
          ) : null}
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={close}
        style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
      >
        <Text variant="body-xl" weight="semibold" color={semantic.secondaryText}>
          닫기
        </Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  item: { minHeight: 72, justifyContent: "center", gap: 2, paddingVertical: 14 },
  pressed: { opacity: 0.6 },
  close: {
    height: 52,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: semantic.secondary,
  },
  closePressed: { backgroundColor: semantic.border },
});
