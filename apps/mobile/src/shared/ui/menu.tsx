import { useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type HostInstance,
} from "react-native";
import { DotsHorizontalIcon } from "./icons";
import { AnimatedModal } from "./sheet";
import { Text } from "./text";
import { radius, semantic, shadows, toNativeShadow } from "./theme";
import { IconButton } from "./top-bar";

export type MenuItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  hidden?: boolean;
};

const MENU_WIDTH = 156;
const EDGE = 12;

/**
 * ⋯ 메뉴 (Figma 할 일 카드·개체 상세의 떠 있는 메뉴).
 * 트리거 위치를 재서 그 아래에 띄운다. 트리거가 오른쪽에 있으면 오른쪽, 왼쪽에 있으면 왼쪽 끝을 맞추고,
 * 화면 밖으로 나가면 안쪽으로 밀어 넣는다
 */
export function Menu({
  items,
  label = "더 보기",
  trigger,
  triggerSize = 44,
}: {
  items: MenuItem[];
  label?: string;
  trigger?: ReactNode;
  triggerSize?: number;
}) {
  const anchor = useRef<HostInstance>(null);
  /**
   * 고른 항목은 메뉴 Modal 이 다 내려간 뒤 실행한다. 닫히는 중인 Modal 위에 시트 Modal 을 바로 띄우면
   * iOS 에서 메뉴가 내려갈 때 위의 시트까지 함께 내려가거나 보이지 않는 창이 남아 화면이 멈춘 것처럼 된다
   */
  const pending = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number }>({
    top: 0,
    right: EDGE,
  });
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const visible = items.filter((item) => !item.hidden);

  const show = () => {
    anchor.current?.measureInWindow((x, y, width, height) => {
      const estimated = visible.length * 46 + 4;
      const top =
        y + height + 2 + estimated > screenHeight - EDGE ? y - estimated - 2 : y + height + 2;
      // 트리거가 화면 왼쪽 절반이면 왼쪽 끝을 맞춘다. 오른쪽 정렬만 하면 왼쪽 가장자리의 트리거(사진 칸 +)에서
      // 메뉴가 화면 밖으로 밀려 잘린다 (T08-04)
      const horizontal =
        x + width / 2 < screenWidth / 2
          ? { left: Math.max(EDGE, Math.min(x, screenWidth - MENU_WIDTH - EDGE)) }
          : { right: Math.max(EDGE, screenWidth - (x + width)) };
      setPosition({ top, ...horizontal });
      setOpen(true);
    });
  };

  return (
    <>
      <View ref={anchor} collapsable={false}>
        <IconButton accessibilityLabel={label} size={triggerSize} onPress={show}>
          {trigger ?? <DotsHorizontalIcon color={semantic.mutedForeground} />}
        </IconButton>
      </View>
      <AnimatedModal
        open={open}
        onRequestClose={() => setOpen(false)}
        onClosed={() => {
          const action = pending.current;
          pending.current = null;
          action?.();
        }}
      >
        {(progress) => (
          <Animated.View
            style={[
              styles.menu,
              position,
              {
                opacity: progress,
                transform: [
                  { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                ],
              },
            ]}
          >
            {visible.map((item, index) => (
              <Pressable
                key={item.label}
                accessibilityRole="menuitem"
                onPress={() => {
                  pending.current = item.onSelect;
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.item,
                  index > 0 && styles.itemDivider,
                  pressed && { backgroundColor: semantic.muted },
                ]}
              >
                <Text
                  variant="body-lg"
                  weight="medium"
                  color={item.tone === "danger" ? semantic.destructive : semantic.foreground}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        )}
      </AnimatedModal>
    </>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    minWidth: MENU_WIDTH,
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: semantic.border,
    backgroundColor: semantic.background,
    paddingVertical: 2,
    ...toNativeShadow(shadows.md),
  },
  item: { paddingHorizontal: 16, paddingVertical: 12 },
  itemDivider: { borderTopWidth: 1, borderTopColor: semantic.border },
});
