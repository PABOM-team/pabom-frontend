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
 * 트리거 위치를 재서 그 아래 오른쩍 정렬로 띄운다. 화면 밖으로 나가면 안쪽으로 밀어 넣는다
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
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: EDGE });
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const visible = items.filter((item) => !item.hidden);

  const show = () => {
    anchor.current?.measureInWindow((x, y, width, height) => {
      const right = Math.max(EDGE, screenWidth - (x + width));
      const estimated = visible.length * 46 + 4;
      const top =
        y + height + 2 + estimated > screenHeight - EDGE ? y - estimated - 2 : y + height + 2;
      setPosition({ top, right });
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
      <AnimatedModal open={open} onRequestClose={() => setOpen(false)}>
        {(progress) => (
          <Animated.View
            style={[
              styles.menu,
              { top: position.top, right: position.right },
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
                  setOpen(false);
                  item.onSelect();
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
